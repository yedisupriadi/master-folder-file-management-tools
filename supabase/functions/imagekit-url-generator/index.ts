// Tool #8: multi-account ImageKit URL Manager (read-only).
// Never put ImageKit private keys in GitHub Pages. Configure each as a Supabase Edge Function secret.
// IMAGEKIT_ACCOUNTS is a JSON registry of {id,label,secretName}, with no key values in that registry.
// Legacy single-account IMAGEKIT_PRIVATE_KEY remains supported if IMAGEKIT_ACCOUNTS is unset.

const ALLOWED_ORIGIN = "https://yedisupriadi.github.io";
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const PAGE_LIMIT = 250;
const MAX_ACCOUNTS = 30;
const MAX_SKIP = 10000000;

function isAllowedOrigin(origin) {
  return !origin || origin === ALLOWED_ORIGIN || LOCAL_ORIGIN.test(origin);
}

function headers(origin) {
  return {
    "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin) ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-tool-token",
    "Access-Control-Max-Age": "600",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Vary": "Origin",
  };
}

function send(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: headers(origin) });
}

async function secureEqual(a, b) {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const first = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(a)));
  const second = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(b)));
  let difference = 0;
  for (let index = 0; index < first.length; index++) difference |= first[index] ^ second[index];
  return difference === 0;
}

function configuredAccounts() {
  const raw = Deno.env.get("IMAGEKIT_ACCOUNTS");
  if (!raw) {
    const singleKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY");
    if (!singleKey) throw new Error("No ImageKit accounts are configured.");
    return [{ id: "default", label: "Default ImageKit", secretName: "IMAGEKIT_PRIVATE_KEY", privateKey: singleKey }];
  }

  let registry;
  try { registry = JSON.parse(raw); }
  catch { throw new Error("Invalid IMAGEKIT_ACCOUNTS JSON."); }
  if (!Array.isArray(registry) || !registry.length || registry.length > MAX_ACCOUNTS) {
    throw new Error("Invalid ImageKit account registry length.");
  }

  const ids = new Set();
  const names = new Set();
  return registry.map((entry) => {
    if (!entry || typeof entry !== "object" ||
        typeof entry.id !== "string" || !/^[a-z][a-z0-9_-]{1,39}$/.test(entry.id) ||
        typeof entry.label !== "string" || !entry.label.trim() || entry.label.trim().length > 80 ||
        typeof entry.secretName !== "string" || !/^IMAGEKIT_PRIVATE_KEY_[A-Z0-9_]+$/.test(entry.secretName) ||
        ids.has(entry.id) || names.has(entry.secretName)) {
      throw new Error("Invalid or duplicate ImageKit account registry item.");
    }
    ids.add(entry.id);
    names.add(entry.secretName);
    const privateKey = Deno.env.get(entry.secretName);
    if (!privateKey) throw new Error("Missing ImageKit account secret.");
    return { id: entry.id, label: entry.label.trim(), secretName: entry.secretName, privateKey };
  });
}

function secureImageURL(value) {
  if (typeof value !== "string" || !/^https:\/\//i.test(value)) return "";
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password || parsed.protocol !== "https:") return "";
    return value;
  } catch { return ""; }
}

function slimAsset(item, account) {
  const filePath = typeof item.filePath === "string" ? item.filePath : "";
  const fallbackFolder = filePath.includes("/") ? (filePath.slice(0, filePath.lastIndexOf("/") + 1) || "/") : "/";
  const folderPath = typeof item.folderPath === "string" && item.folderPath
    ? item.folderPath : fallbackFolder;
  const size = typeof item.size === "number" && Number.isFinite(item.size) ? item.size : null;
  return {
    accountId: account.id,
    accountName: account.label,
    fileId: typeof item.fileId === "string" ? item.fileId : "",
    name: typeof item.name === "string" ? item.name : "",
    url: secureImageURL(item.url),
    filePath,
    folderPath,
    size,
    width: typeof item.width === "number" && Number.isFinite(item.width) ? item.width : null,
    height: typeof item.height === "number" && Number.isFinite(item.height) ? item.height : null,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
    thumbnailUrl: secureImageURL(item.thumbnailUrl || item.thumbnail),
    isPrivateFile: item.isPrivateFile === true,
  };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (!isAllowedOrigin(origin)) return send({ error: "Origin not allowed." }, 403, null);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== "POST") return send({ error: "Method not allowed." }, 405, origin);

  const ownerToken = Deno.env.get("IMAGEKIT_URL_TOOL_TOKEN") || "";
  if (ownerToken.length < 32) return send({ error: "Server access token is not configured." }, 503, origin);
  if (!(await secureEqual(request.headers.get("x-tool-token") || "", ownerToken))) {
    return send({ error: "Access token is invalid." }, 401, origin);
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return send({ error: "Request is too large." }, 413, origin);
    body = JSON.parse(raw);
  } catch { return send({ error: "Invalid JSON body." }, 400, origin); }

  if (!body || !["accounts", "files"].includes(body.action)) {
    return send({ error: "Unsupported action." }, 400, origin);
  }

  let accounts;
  try { accounts = configuredAccounts(); }
  catch (error) {
    console.error("ImageKit account registry invalid", error instanceof Error ? error.message : "unknown");
    return send({ error: "ImageKit account registry is not configured correctly." }, 503, origin);
  }

  if (body.action === "accounts") {
    return send({
      ok: true, action: "accounts",
      accounts: accounts.map(({ id, label }) => ({ id, label })),
    }, 200, origin);
  }

  const accountId = body.accountId;
  const skip = body.skip === undefined ? 0 : body.skip;
  if (typeof accountId !== "string" || !Number.isSafeInteger(skip) || skip < 0 || skip > MAX_SKIP) {
    return send({ error: "Invalid account ID or pagination." }, 400, origin);
  }

  const account = accounts.find(({ id }) => id === accountId);
  if (!account) return send({ error: "Unknown ImageKit account." }, 404, origin);

  // No path parameter: ImageKit lists images across the account's entire Media Library,
  // including nested folders. Folder metadata comes from the file response.
  const params = new URLSearchParams({
    type: "file",
    fileType: "image",
    limit: String(PAGE_LIMIT),
    skip: String(skip),
    sort: "ASC_NAME",
  });

  try {
    const upstream = await fetch("https://api.imagekit.io/v1/files?" + params.toString(), {
      method: "GET",
      headers: { Authorization: "Basic " + btoa(account.privateKey + ":") },
      signal: AbortSignal.timeout(15000),
    });

    if (!upstream.ok) {
      if (upstream.status === 401 || upstream.status === 403) {
        return send({ error: "ImageKit credentials or Media Read permission invalid." }, 502, origin);
      }
      if (upstream.status === 429) {
        const retryRaw = Number(upstream.headers.get("retry-after"));
        return send({
          error: "ImageKit rate limit exceeded.",
          retryAfterMs: Number.isFinite(retryRaw) && retryRaw > 0
            ? Math.min(Math.round(retryRaw * 1000), 30000) : 3000,
        }, 429, origin);
      }
      console.error("ImageKit listing failed", account.id, upstream.status);
      return send({ error: "ImageKit request failed.", upstreamStatus: upstream.status }, 502, origin);
    }

    const data = await upstream.json();
    if (!Array.isArray(data)) return send({ error: "Unexpected ImageKit response." }, 502, origin);
    const items = data.filter((item) => item && item.type === "file")
      .map((item) => slimAsset(item, account));
    return send({
      ok: true, action: "files", accountId,
      skip, nextSkip: skip + data.length,
      hasMore: data.length === PAGE_LIMIT,
      count: items.length, items,
    }, 200, origin);
  } catch (error) {
    console.error("ImageKit fetch failed", account.id, error instanceof Error ? error.name : "unknown");
    return send({ error: "ImageKit service is unavailable. Please retry." }, 502, origin);
  }
});
