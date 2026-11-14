// Tool #8 — ImageKit URL Generator.
// Deploy separately as a Supabase Edge Function. Never expose IMAGEKIT_PRIVATE_KEY in the browser.
// The client provides a separate, owner-controlled access token in memory only.

const ALLOWED_ORIGIN = "https://yedisupriadi.github.io";
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
const PAGE_LIMIT = 250;

function isAllowedOrigin(origin) {
  return !origin || origin === ALLOWED_ORIGIN || LOCAL_ORIGIN.test(origin);
}

function responseHeaders(origin) {
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
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

async function secureEqual(a, b) {
  if (!a || !b) return false;
  const encoder = new TextEncoder();
  const hashA = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(a)));
  const hashB = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(b)));
  let difference = 0;
  for (let index = 0; index < hashA.length; index++) difference |= hashA[index] ^ hashB[index];
  return difference === 0;
}

function normalizeFolder(input) {
  if (typeof input !== "string" || input.length > 500) return null;
  const trimmed = input.trim().replace(/\/+/g, "/");
  if (!trimmed || trimmed.includes("\\") || trimmed.includes("?") || trimmed.includes("#") ||
      trimmed.includes("\0") || trimmed.split("/").some((part) => part === "..")) return null;
  return "/" + trimmed.replace(/^\/+|\/+$/g, "") + (trimmed.replace(/^\/+|\/+$/g, "") ? "/" : "");
}

function slimAsset(item) {
  if (!item || typeof item !== "object") return null;
  return {
    type: String(item.type || ""),
    fileId: typeof item.fileId === "string" ? item.fileId : "",
    name: String(item.name || ""),
    url: typeof item.url === "string" && /^https:\/\//i.test(item.url) ? item.url : "",
    filePath: String(item.filePath || item.folderPath || ""),
    folderPath: String(item.folderPath || ""),
    size: Number.isFinite(item.size) ? item.size : null,
    width: Number.isFinite(item.width) ? item.width : null,
    height: Number.isFinite(item.height) ? item.height : null,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
    thumbnailUrl: typeof item.thumbnailUrl === "string" && /^https:\/\//i.test(item.thumbnailUrl) ? item.thumbnailUrl : "",
    isPrivateFile: item.isPrivateFile === true,
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) return send({ error: "Origin not allowed." }, 403, null);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders(origin) });
  if (req.method !== "POST") return send({ error: "Method not allowed." }, 405, origin);

  const privateKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY") || "";
  const ownerToken = Deno.env.get("IMAGEKIT_URL_TOOL_TOKEN") || "";
  if (!privateKey || ownerToken.length < 32) return send({ error: "Server is not configured." }, 503, origin);
  if (!(await secureEqual(req.headers.get("x-tool-token") || "", ownerToken))) {
    return send({ error: "Access token is invalid." }, 401, origin);
  }

  let input;
  try {
    const raw = await req.text();
    if (raw.length > 4096) return send({ error: "Request is too large." }, 413, origin);
    input = JSON.parse(raw);
  } catch {
    return send({ error: "Request must contain valid JSON." }, 400, origin);
  }

  const action = input && input.action;
  const path = normalizeFolder(input && input.path);
  const skip = input && input.skip === undefined ? 0 : input && input.skip;
  if (!["files", "folders"].includes(action) || !path ||
      !Number.isSafeInteger(skip) || skip < 0 || skip > 10000000) {
    return send({ error: "Invalid action, folder path, or pagination." }, 400, origin);
  }

  const params = new URLSearchParams({
    path,
    type: action === "folders" ? "folder" : "file",
    limit: String(PAGE_LIMIT),
    skip: String(skip),
    sort: "ASC_NAME",
  });
  if (action === "files") params.set("fileType", "image");

  try {
    const upstream = await fetch("https://api.imagekit.io/v1/files?" + params.toString(), {
      method: "GET",
      headers: { Authorization: "Basic " + btoa(privateKey + ":") },
      signal: AbortSignal.timeout(15000),
    });
    if (!upstream.ok) {
      if (upstream.status === 401 || upstream.status === 403) {
        return send({ error: "ImageKit credentials or permissions are invalid." }, 502, origin);
      }
      if (upstream.status === 429) {
        const reset = Number(upstream.headers.get("x-ratelimit-reset"));
        return send({ error: "ImageKit rate limit exceeded.", retryAfterMs: Number.isFinite(reset) ? Math.min(Math.max(reset, 1000), 30000) : 3000 }, 429, origin);
      }
      console.error("ImageKit list request failed", upstream.status);
      return send({ error: "ImageKit request failed." }, 502, origin);
    }

    const data = await upstream.json();
    if (!Array.isArray(data)) return send({ error: "Unexpected ImageKit response." }, 502, origin);
    const items = data
      .filter((item) => action === "folders" ? item && item.type === "folder" : item && item.type === "file")
      .map(slimAsset).filter(Boolean);
    return send({
      ok: true,
      action,
      path,
      skip,
      count: items.length,
      hasMore: data.length === PAGE_LIMIT,
      nextSkip: skip + data.length,
      items,
    }, 200, origin);
  } catch (error) {
    console.error("ImageKit network error", error instanceof Error ? error.name : "unknown");
    return send({ error: "ImageKit service is unavailable. Please retry." }, 502, origin);
  }
});
