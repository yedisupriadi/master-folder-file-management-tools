// ============================================================================
// Cloudflare Worker — proxy READ-ONLY ke Notion API untuk File/Folder Tools
// ----------------------------------------------------------------------------
// Kenapa perlu Worker: Notion API tidak bisa dipanggil langsung dari browser
// (CORS) dan butuh token rahasia. Worker ini menyimpan token sebagai SECRET
// (tidak pernah ikut terkirim ke halaman HTML), menambah header CORS, dan
// hanya mengizinkan aksi baca (query & meta database).
//
// SECRETS (wajib) — set lewat dashboard Cloudflare atau `wrangler secret put`:
//   NOTION_TOKEN : Internal Integration Secret Notion (mis. ntn_xxx / secret_xxx)
//   APP_KEY      : kunci akses bersama; HTML mengirimnya di header "x-app-key"
//
// VARS (opsional) — plain text:
//   ALLOWED_DB   : daftar Database ID yang boleh dibaca, pisah koma.
//                  Kosong/absen = semua database yang di-share ke integration.
// ============================================================================

const NOTION_VERSION = '2022-06-28';
const MAX_PAGES = 20;   // batas aman: 20 x 100 = maksimal ~2000 baris per query

function cors(extra) {
  return Object.assign({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-app-key',
    'Access-Control-Max-Age': '86400',
  }, extra || {});
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, cors()),
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors() });
    if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);

    // gerbang lembut: cek shared key sebelum menyentuh Notion
    if (env.APP_KEY && request.headers.get('x-app-key') !== env.APP_KEY) {
      return json({ error: 'Unauthorized' }, 401);
    }
    if (!env.NOTION_TOKEN) return json({ error: 'Server missing NOTION_TOKEN' }, 500);

    let payload;
    try { payload = await request.json(); }
    catch (e) { return json({ error: 'Invalid JSON body' }, 400); }

    const action = (payload && payload.action) || 'query';
    const databaseId = payload && payload.databaseId;
    if (!databaseId) return json({ error: 'databaseId required' }, 400);

    // allowlist database (opsional) — bandingkan tanpa tanda hubung
    if (env.ALLOWED_DB) {
      const norm = (s) => String(s).replace(/-/g, '').toLowerCase();
      const allow = env.ALLOWED_DB.split(',').map((s) => norm(s.trim()));
      if (!allow.includes(norm(databaseId))) {
        return json({ error: 'Database not allowed' }, 403);
      }
    }

    const headers = {
      'Authorization': 'Bearer ' + env.NOTION_TOKEN,
      'Notion-Version': NOTION_VERSION,
      'content-type': 'application/json',
    };

    try {
      // --- meta: judul & skema properti database (untuk mapping kolom) ---
      if (action === 'meta') {
        const r = await fetch('https://api.notion.com/v1/databases/' + databaseId, { headers });
        const data = await r.json();
        return json(data, r.status);
      }

      // --- query: ambil semua baris (pagination + batas aman) ---
      const results = [];
      let cursor, pages = 0, truncated = false;
      do {
        const body = { page_size: 100 };
        if (cursor) body.start_cursor = cursor;
        if (payload.filter) body.filter = payload.filter;   // teruskan filter Notion apa adanya
        if (payload.sorts) body.sorts = payload.sorts;
        const r = await fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', {
          method: 'POST', headers, body: JSON.stringify(body),
        });
        const data = await r.json();
        if (!r.ok) return json(data, r.status);   // teruskan error asli Notion
        for (const row of (data.results || [])) results.push(row);
        cursor = data.has_more ? data.next_cursor : undefined;
        pages++;
        if (pages >= MAX_PAGES && cursor) { truncated = true; cursor = undefined; }
      } while (cursor);

      return json({ ok: true, count: results.length, truncated, results });
    } catch (err) {
      return json({ error: String((err && err.message) || err) }, 502);
    }
  },
};
