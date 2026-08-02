import assert from 'node:assert/strict';
import worker from '../notion-proxy/worker.js';

const DATABASE_ID = '0123456789abcdef0123456789abcdef';
const baseEnv = { APP_KEY: 'test-app-key', NOTION_TOKEN: 'test-notion-token' };
const originalFetch = globalThis.fetch;
let passed = 0;

async function invoke({ method = 'POST', body, headers = {}, env = baseEnv } = {}) {
  const requestHeaders = new Headers(headers);
  if (method === 'POST' && body !== undefined && !requestHeaders.has('content-type')) {
    requestHeaders.set('content-type', 'application/json');
  }
  const request = new Request('https://worker.example.test/', {
    method,
    headers: requestHeaders,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  });
  return worker.fetch(request, env);
}

async function expectJson(response, status, expected) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), expected);
}

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

try {
  await test('answers CORS preflight', async () => {
    const response = await invoke({ method: 'OPTIONS', env: {} });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
  });

  await test('rejects non-POST requests', async () => {
    await expectJson(await invoke({ method: 'GET' }), 405, { error: 'Use POST' });
  });

  await test('fails closed when APP_KEY is missing', async () => {
    await expectJson(
      await invoke({ body: '{}', env: { NOTION_TOKEN: 'token' } }),
      500,
      { error: 'Server missing APP_KEY' },
    );
  });

  await test('rejects an incorrect app key', async () => {
    await expectJson(
      await invoke({ body: '{}', headers: { 'x-app-key': 'wrong' } }),
      401,
      { error: 'Unauthorized' },
    );
  });

  await test('requires the Notion token', async () => {
    await expectJson(
      await invoke({ body: '{}', headers: { 'x-app-key': 'test-app-key' }, env: { APP_KEY: 'test-app-key' } }),
      500,
      { error: 'Server missing NOTION_TOKEN' },
    );
  });

  await test('rejects invalid JSON', async () => {
    await expectJson(
      await invoke({ body: '{', headers: { 'x-app-key': 'test-app-key' } }),
      400,
      { error: 'Invalid JSON body' },
    );
  });

  await test('requires a database ID', async () => {
    await expectJson(
      await invoke({ body: '{}', headers: { 'x-app-key': 'test-app-key' } }),
      400,
      { error: 'databaseId required' },
    );
  });

  await test('rejects unsupported actions', async () => {
    await expectJson(
      await invoke({
        body: JSON.stringify({ databaseId: DATABASE_ID, action: 'write' }),
        headers: { 'x-app-key': 'test-app-key' },
      }),
      400,
      { error: 'Unsupported action' },
    );
  });

  await test('validates database IDs', async () => {
    await expectJson(
      await invoke({
        body: JSON.stringify({ databaseId: '../users', action: 'meta' }),
        headers: { 'x-app-key': 'test-app-key' },
      }),
      400,
      { error: 'Invalid databaseId' },
    );
  });

  await test('enforces the optional database allowlist', async () => {
    await expectJson(
      await invoke({
        body: JSON.stringify({ databaseId: DATABASE_ID }),
        headers: { 'x-app-key': 'test-app-key' },
        env: { ...baseEnv, ALLOWED_DB: 'ffffffffffffffffffffffffffffffff' },
      }),
      403,
      { error: 'Database not allowed' },
    );
  });

  await test('retrieves database metadata with normalized ID and auth headers', async () => {
    let upstream;
    globalThis.fetch = async (url, options) => {
      upstream = { url, options };
      return Response.json({ object: 'database' });
    };
    const dashedId = '01234567-89ab-cdef-0123-456789abcdef';
    const response = await invoke({
      body: JSON.stringify({ databaseId: dashedId, action: 'meta' }),
      headers: { 'x-app-key': 'test-app-key' },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { object: 'database' });
    assert.equal(upstream.url, `https://api.notion.com/v1/databases/${DATABASE_ID}`);
    assert.equal(upstream.options.headers.Authorization, 'Bearer test-notion-token');
    assert.equal(upstream.options.headers['Notion-Version'], '2022-06-28');
  });

  await test('paginates queries and forwards filter and sorts', async () => {
    const calls = [];
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options, body: JSON.parse(options.body) });
      if (calls.length === 1) {
        return Response.json({ results: [{ id: 'page-1' }], has_more: true, next_cursor: 'next' });
      }
      return Response.json({ results: [{ id: 'page-2' }], has_more: false, next_cursor: null });
    };
    const filter = { property: 'Status', select: { equals: 'Active' } };
    const sorts = [{ property: 'Name', direction: 'ascending' }];
    const response = await invoke({
      body: JSON.stringify({ databaseId: DATABASE_ID, filter, sorts }),
      headers: { 'x-app-key': 'test-app-key' },
    });
    assert.deepEqual(await response.json(), {
      ok: true,
      count: 2,
      truncated: false,
      results: [{ id: 'page-1' }, { id: 'page-2' }],
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, `https://api.notion.com/v1/databases/${DATABASE_ID}/query`);
    assert.deepEqual(calls[0].body, { page_size: 100, filter, sorts });
    assert.deepEqual(calls[1].body, { page_size: 100, start_cursor: 'next', filter, sorts });
  });

  await test('stops pagination at the safety limit', async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount += 1;
      return Response.json({
        results: [{ id: `page-${callCount}` }],
        has_more: true,
        next_cursor: `cursor-${callCount}`,
      });
    };
    const response = await invoke({
      body: JSON.stringify({ databaseId: DATABASE_ID }),
      headers: { 'x-app-key': 'test-app-key' },
    });
    const data = await response.json();
    assert.equal(callCount, 20);
    assert.equal(data.count, 20);
    assert.equal(data.truncated, true);
  });
} finally {
  globalThis.fetch = originalFetch;
}

console.log(`\n${passed} Worker behavior tests passed.`);
