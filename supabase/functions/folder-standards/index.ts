import { createClient } from "npm:@supabase/supabase-js@2.111.0";

type TableConfig = {
  label: string;
  select: string;
  columns: string[];
  defaultNameColumn: string;
  defaultGroupColumn: string;
};

const TABLES: Record<string, TableConfig> = {
  standard_folder_personal_l1: {
    label: "Personal Folder — Level 1",
    select: "id,folder_id,folder_description,example_content,is_active",
    columns: ["folder_id", "folder_description", "example_content"],
    defaultNameColumn: "folder_id",
    defaultGroupColumn: "",
  },
  standard_folder_personal_l2: {
    label: "Personal Folder — Level 2",
    select: "id,folder_id,relation_parent_folder_l1,folder_description,example_content,is_active",
    columns: ["parent_folder_l1", "folder_id", "folder_description", "example_content"],
    defaultNameColumn: "folder_id",
    defaultGroupColumn: "parent_folder_l1",
  },
  standard_folder_project_l1: {
    label: "Project Folder — Level 1",
    select: "id,folder_id,is_active",
    columns: ["folder_id"],
    defaultNameColumn: "folder_id",
    defaultGroupColumn: "",
  },
  standard_folder_project_l2: {
    label: "Project Folder — Level 2",
    select: "id,folder_id,function_name,function_description,parent_folder,relation_parent_folder,is_active",
    columns: ["parent_folder", "folder_id", "function_name", "function_description"],
    defaultNameColumn: "folder_id",
    defaultGroupColumn: "parent_folder",
  },
  standard_folder_project_l3: {
    label: "Project Folder — Level 3",
    select: "id,folder_id,parent_folder_l1,parent_folder_l2,file_content,relation_parent_folder_l2,is_active",
    columns: ["parent_folder_l1", "parent_folder_l2", "folder_id", "file_content"],
    defaultNameColumn: "folder_id",
    defaultGroupColumn: "parent_folder_l2",
  },
};

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true;
  if (/^https:\/\/yedisupriadi\.github\.io$/i.test(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)?trigammametri\.co\.id$/i.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : "https://yedisupriadi.github.io";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey",
    "Vary": "Origin",
  };
}

function jsonResponse(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function parseKeyDictionary(name: string): string[] {
  const raw = Deno.env.get(name);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return Object.values(parsed).filter((value): value is string => typeof value === "string" && value.length > 0);
  } catch {
    return [];
  }
}

function getAcceptedClientKeys(): string[] {
  const publishable = parseKeyDictionary("SUPABASE_PUBLISHABLE_KEYS");
  const legacyAnon = Deno.env.get("SUPABASE_ANON_KEY");
  return legacyAnon ? [...publishable, legacyAnon] : publishable;
}

function getSecretKey(): string {
  const secretKeys = parseKeyDictionary("SUPABASE_SECRET_KEYS");
  if (secretKeys.length) return secretKeys[0];
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  throw new Error("Supabase secret key is not available in the Edge Function environment.");
}

function scalarize(value: unknown): string | number | boolean | null {
  if (value == null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value as string | number | boolean | null;
  }
  if (Array.isArray(value)) return value.map((item) => String(item ?? "")).filter(Boolean).join(", ");
  return JSON.stringify(value);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) return jsonResponse({ error: "Origin not allowed." }, 403, null);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405, origin);

  const apiKey = (req.headers.get("apikey") ?? "").trim();
  if (!apiKey || !getAcceptedClientKeys().includes(apiKey)) {
    return jsonResponse({ error: "Unauthorized application key." }, 401, origin);
  }

  let body: { table?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400, origin);
  }

  const table = (body.table ?? "").trim();
  const config = TABLES[table];
  if (!config) return jsonResponse({ error: "Unsupported standard folder table." }, 400, origin);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) throw new Error("SUPABASE_URL is not configured.");

    const admin = createClient(supabaseUrl, getSecretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin
      .from(table)
      .select(config.select)
      .eq("is_active", true)
      .order("folder_id", { ascending: true });

    if (error) {
      console.error("Standard folder query failed", table, error.code);
      return jsonResponse({ error: "Standard folder data is temporarily unavailable." }, 500, origin);
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;

    if (table === "standard_folder_personal_l2") {
      const parentIds = [...new Set(rows
        .map((row) => typeof row.relation_parent_folder_l1 === "string" ? row.relation_parent_folder_l1 : "")
        .filter(Boolean))];

      const parentMap = new Map<string, string>();
      if (parentIds.length) {
        const { data: parents, error: parentError } = await admin
          .from("standard_folder_personal_l1")
          .select("id,folder_id")
          .in("id", parentIds);
        if (parentError) {
          console.error("Personal L1 parent lookup failed", parentError.code);
          return jsonResponse({ error: "Standard folder parent data is temporarily unavailable." }, 500, origin);
        }
        for (const parent of parents ?? []) parentMap.set(String(parent.id), String(parent.folder_id ?? ""));
      }
      for (const row of rows) {
        const parentId = typeof row.relation_parent_folder_l1 === "string" ? row.relation_parent_folder_l1 : "";
        row.parent_folder_l1 = parentMap.get(parentId) ?? "";
      }
    }

    const normalizedRows = rows.map((row) => Object.fromEntries(
      config.columns.map((column) => [column, scalarize(row[column])]),
    ));

    return jsonResponse({
      ok: true,
      table,
      label: config.label,
      columns: config.columns,
      default_name_column: config.defaultNameColumn,
      default_group_column: config.defaultGroupColumn,
      count: normalizedRows.length,
      rows: normalizedRows,
    }, 200, origin);
  } catch (error) {
    console.error("Folder standards endpoint error", error instanceof Error ? error.message : "unknown");
    return jsonResponse({ error: "Standard folder data is temporarily unavailable." }, 500, origin);
  }
});
