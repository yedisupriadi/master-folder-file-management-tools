# Notion Proxy (Cloudflare Worker)

Jembatan agar **Folder Manager** (file HTML) bisa membaca database Notion secara
_live_ tanpa menaruh token rahasia di dalam file yang dibagikan ke tim.

```
Folder Manager (HTML)  ──POST──▶  Cloudflare Worker  ──▶  Notion API
        │                          (simpan token)          (baca database)
        └── kirim x-app-key ────────┘
```

- **Token Notion** hanya ada di Worker (sebagai *secret*) — tidak pernah masuk ke HTML.
- **Read-only**: Worker hanya mengizinkan `query` (isi baris) & `meta` (skema kolom).
- **Multi-database**: satu Worker melayani semua database yang di-share ke integration.

---

## 1. Buat Integration di Notion
1. Buka <https://www.notion.so/my-integrations> → **New integration**.
2. Tipe **Internal**, pilih workspace, simpan.
3. Salin **Internal Integration Secret** (diawali `ntn_` atau `secret_`). Ini `NOTION_TOKEN`.

## 2. Share tiap database ke integration
Untuk **setiap** database yang mau dibaca:
- Buka database di Notion → menu **•••** (kanan atas) → **Connections** / **Add connections** → pilih integration tadi.
- Tanpa langkah ini, Worker akan dapat error `object_not_found`.

## 3. Ambil Database ID
Buka database sebagai halaman penuh. Dari URL:
```
https://www.notion.so/<workspace>/<DATABASE_ID>?v=<viewId>
```
`DATABASE_ID` = 32 karakter heksadesimal (boleh dengan atau tanpa tanda hubung).

## 4. Deploy Worker

**Cara A — Dashboard (tanpa install apa pun)**
1. <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Create Worker**.
2. Beri nama (mis. `notion-proxy`) → **Deploy** → **Edit code**.
3. Hapus kode contoh, tempel isi [`worker.js`](worker.js), **Deploy**.
4. Catat URL-nya, mis. `https://notion-proxy.<akun>.workers.dev`.

**Cara B — Wrangler CLI**
```bash
npx wrangler@latest login
```

## 5. Set Secrets
**Dashboard:** Worker → **Settings** → **Variables and Secrets** → tambah:
- `NOTION_TOKEN` — tipe **Secret** — token dari langkah 1.
- `APP_KEY` — tipe **Secret** — bebas, mis. string acak panjang. Ini yang dikirim HTML.
- `ALLOWED_DB` *(opsional)* — tipe **Text** — daftar Database ID (pisah koma) yang boleh dibaca.

**Wrangler:**
```bash
npx wrangler@latest secret put NOTION_TOKEN
npx wrangler@latest secret put APP_KEY
npx wrangler@latest deploy
```

## 6. Uji cepat
```bash
curl -X POST https://notion-proxy.<akun>.workers.dev \
  -H "x-app-key: <APP_KEY>" \
  -H "content-type: application/json" \
  -d "{\"databaseId\":\"<DATABASE_ID>\"}"
```
Balasan sukses: `{"ok":true,"count":<n>,"truncated":false,"results":[...]}`.

---

## Catatan keamanan (penting untuk tim)
- **`NOTION_TOKEN` aman** — tidak pernah keluar dari Worker.
- **`APP_KEY` akan terlihat** di file HTML yang dibagikan ke tim. Fungsinya hanya
  *gerbang lembut* supaya bukan sembarang orang di internet bisa memanggil Worker —
  **bukan** keamanan kuat. Jika file bocor keluar tim, siapa pun bisa membaca
  database yang di-share (read-only, dan bisa dibatasi lewat `ALLOWED_DB`).
- Butuh keamanan kuat? Pasang **Cloudflare Access (Zero Trust)** di depan Worker,
  atau batasi ketat daftar database lewat `ALLOWED_DB`.

## Kontrak API (dipakai oleh HTML)
`POST` JSON, header `x-app-key: <APP_KEY>`:
```jsonc
{ "databaseId": "…", "action": "query" }   // default: ambil semua baris
{ "databaseId": "…", "action": "meta"  }   // skema properti / judul database
// opsional untuk query: "filter" & "sorts" (format Notion apa adanya)
```

`databaseId` harus berupa ID Notion 32 karakter heksadesimal, dengan atau tanpa
tanda hubung. Action selain `query` dan `meta` ditolak. Query mengambil maksimal
2.000 baris (20 halaman x 100); bila batas tercapai, respons berisi
`"truncated": true`.

## Kompatibilitas Notion API

Worker sengaja menggunakan `Notion-Version: 2022-06-28` karena antarmuka saat ini
menerima **Database ID** dan endpoint database lama. Gunakan database dengan satu
data source. Database multi-source yang diperkenalkan Notion pada 2025 dapat
menghasilkan `validation_error`; dukungan penuh memerlukan migrasi konfigurasi ke
Data Source ID dan endpoint `/v1/data_sources`.
