import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const backend = fs.readFileSync('supabase/functions/imagekit-url-generator/index.ts', 'utf8');
const frontend = fs.readFileSync('imagekit-url-generator.html', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

let handler;
let apiCalls = [];
let mockUpstream = async () => new Response('[]', { status: 200 });
const env = new Map([
  ['IMAGEKIT_PRIVATE_KEY', 'private_imagekit_test_key_only'],
  ['IMAGEKIT_URL_TOOL_TOKEN', 'test-access-token-abcdefghijklmnopqrstuvwxyz-1234'],
]);
const sandbox = {
  Deno: {
    env: { get: (key) => env.get(key) },
    serve: (fn) => { handler = fn; },
  },
  Response, URLSearchParams, TextEncoder, Uint8Array, AbortSignal,
  crypto: webcrypto,
  btoa: (value) => Buffer.from(value).toString('base64'),
  fetch: async (url, init) => {
    apiCalls.push({ url, init });
    return mockUpstream(url, init);
  },
  console: { error: () => {} },
};
vm.runInNewContext(backend, sandbox, { filename: 'imagekit-url-generator/index.ts' });
assert.equal(typeof handler, 'function', 'backend should register a request handler');

function request({ method = 'POST', origin = 'https://yedisupriadi.github.io', token = env.get('IMAGEKIT_URL_TOOL_TOKEN'), body = { action: 'files', path: '/261002/', skip: 0 } } = {}) {
  const headers = { origin };
  if (token !== null) headers['x-tool-token'] = token;
  if (method === 'POST') headers['content-type'] = 'application/json';
  return handler(new Request('https://test.supabase.co/functions/v1/imagekit-url-generator', {
    method, headers, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  }));
}

function makeItems(n, type = 'file') {
  return Array.from({ length: n }, (_, i) => ({
    type, fileId: 'file-' + i, name: 'Image_' + i + '.jpg',
    url: 'https://ik.imagekit.io/demo/261002/Image_' + i + '.jpg',
    filePath: '/261002/Image_' + i + '.jpg',
    width: 800, height: 600, size: 1024,
    isPrivateFile: false, createdAt: '2026-11-14T12:00:00Z',
  }));
}

// Reject unauthorized requests without reaching ImageKit.
apiCalls = [];
let r = await request({ token: 'wrong-token-1234567890123456789012345' });
assert.equal(r.status, 401);
assert.equal(apiCalls.length, 0);

r = await request({ origin: 'https://evil.example' });
assert.equal(r.status, 403);
assert.equal(apiCalls.length, 0);

r = await request({ method: 'DELETE' });
assert.equal(r.status, 405);
assert.equal(apiCalls.length, 0);

r = await request({ body: { action: 'delete', path: '/', skip: 0 } });
assert.equal(r.status, 400);
assert.equal(apiCalls.length, 0);

r = await request({ body: { action: 'files', path: '/../other', skip: 0 } });
assert.equal(r.status, 400);

r = await request({ body: { action: 'files', path: '/261002/', skip: -1 } });
assert.equal(r.status, 400);

r = await request({ method: 'OPTIONS' });
assert.equal(r.status, 204);
assert.equal(r.headers.get('access-control-allow-origin'), 'https://yedisupriadi.github.io');

// Pagination and response projection for image files.
mockUpstream = async () => Response.json(makeItems(250));
apiCalls = [];
r = await request();
assert.equal(r.status, 200);
let body = await r.json();
assert.equal(body.items.length, 250);
assert.equal(body.hasMore, true);
assert.equal(body.nextSkip, 250);
assert.equal(body.path, '/261002/');
assert.equal(body.items[0].url, 'https://ik.imagekit.io/demo/261002/Image_0.jpg');
assert.ok(!JSON.stringify(body).includes(env.get('IMAGEKIT_PRIVATE_KEY')));
assert.ok(!JSON.stringify(body).includes(env.get('IMAGEKIT_URL_TOOL_TOKEN')));
assert.ok(apiCalls[0].url.includes('path=%2F261002%2F'));
assert.ok(apiCalls[0].url.includes('fileType=image'));
assert.ok(apiCalls[0].url.includes('limit=250'));
assert.equal(apiCalls[0].init.method, 'GET');
assert.equal(apiCalls[0].init.headers.Authorization, 'Basic ' + Buffer.from(env.get('IMAGEKIT_PRIVATE_KEY') + ':').toString('base64'));

// Last page, folder browsing, and private-asset metadata.
mockUpstream = async () => Response.json([{
  ...makeItems(1)[0], isPrivateFile: true, url: 'http://bad.example/path',
}]);
r = await request({ body: { action: 'files', path: '/261002/', skip: 250 } });
body = await r.json();
assert.equal(body.items.length, 1);
assert.equal(body.items[0].url, '', 'insecure HTTP links should never be exposed');
assert.equal(body.items[0].isPrivateFile, true);
assert.equal(body.hasMore, false);

mockUpstream = async () => Response.json([{
  type:'folder', name:'261005', folderPath:'/261005',
}]);
r = await request({ body: { action: 'folders', path: '/', skip: 0 } });
body = await r.json();
assert.equal(body.items[0].type, 'folder');
assert.equal(body.items[0].name, '261005');

// API rate-limiting is surfaced without masking the status.
mockUpstream = async () => new Response('Too many', { status:429, headers:{ 'x-ratelimit-reset': '2500' } });
r = await request();
body = await r.json();
assert.equal(r.status, 429);
assert.equal(body.retryAfterMs, 2500);

// Server must fail closed if key/token configuration is missing.
env.delete('IMAGEKIT_PRIVATE_KEY');
r = await request();
assert.equal(r.status, 503);
env.set('IMAGEKIT_PRIVATE_KEY', 'private_imagekit_test_key_only');

// Client only speaks to a Supabase function and does not ask for raw ImageKit secrets.
assert.ok(index.includes("href: 'imagekit-url-generator.html'"));
assert.ok(frontend.includes('docs/imagekit-url-generator.md'));
assert.ok(frontend.includes("method:'POST'"));
assert.ok(frontend.includes("'x-tool-token':token"));
assert.ok(!frontend.includes('api.imagekit.io'));
assert.ok(!frontend.includes('IMAGEKIT_PRIVATE_KEY'));
assert.ok(frontend.includes('link.rel ='));
assert.ok(frontend.includes('textContent = file.url'));
assert.ok(frontend.includes("new Blob([csv]"));

console.log('✓ ImageKit Tool #8: authorization, origin, read-only actions, folder and file listings, 250-file pagination, safe URL projection, 429 handling and client security');
