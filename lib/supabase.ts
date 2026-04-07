import "server-only";

import dns from "node:dns";

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetch as undiciFetch } from "undici";

/** Render 等で IPv6 が先に選ばれて失敗するケースを避ける */
dns.setDefaultResultOrder("ipv4first");

function mask(value: string) {
  if (!value) return "(empty)";
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function safeHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return "(invalid-url)";
  }
}

export function getSupabaseDiagnostics() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const usingServiceRole = Boolean(serviceRole);
  const key = serviceRole || anon;
  return {
    hasUrl: Boolean(url),
    urlHost: safeHost(url),
    hasAnonKey: Boolean(anon),
    hasServiceRoleKey: usingServiceRole,
    usingServiceRole,
    keyPreview: mask(key)
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabaseKey = serviceRoleKey || supabaseAnonKey;

let cached: SupabaseClient | null = null;

export function assertSupabaseEnv() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase env is missing: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)"
    );
  }
}

export function getSupabaseClient() {
  if (cached) return cached;
  if (!supabaseUrl || !supabaseKey) {
    const d = getSupabaseDiagnostics();
    console.error("[supabase] env missing", d);
    assertSupabaseEnv();
  }

  cached = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
      // 内蔵 fetch 経路を避け、undici + IPv4 優先 DNS で接続
      fetch: async (url, init) =>
        (await undiciFetch(url as never, {
          ...(init ?? {}),
          cache: "no-store"
        } as never)) as unknown as Response,
      headers: { "X-Client-Info": "wisebrief-server" }
    }
  });
  return cached;
}

/** PostgREST upsert（SDKを経由しない直接通信） */
export type DailyBriefUpsertRow = {
  id: number;
  category: string;
  title: string;
  summary: string;
  details: string;
  doya_word: string;
  job_impact: string | null;
  url: string;
  created_at: string;
};

const MAX_ERROR_DEPTH = 8;

/** fetch 失敗時に cause / code 等をログ用に再帰展開（循環は深さで打ち切り） */
function serializeUnknownForLog(value: unknown, depth = 0): unknown {
  if (depth > MAX_ERROR_DEPTH) return { truncated: true };
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Error) {
    const e = value as Error &
      NodeJS.ErrnoException & { hostname?: string; address?: string; port?: number };
    const base: Record<string, unknown> = {
      type: "Error",
      name: e.name,
      message: e.message,
      stack: e.stack
    };
    if (e.code !== undefined) base.code = e.code;
    if (e.errno !== undefined) base.errno = e.errno;
    if (e.syscall !== undefined) base.syscall = e.syscall;
    if (e.hostname !== undefined) base.hostname = e.hostname;
    if (e.address !== undefined) base.address = e.address;
    if (e.port !== undefined) base.port = e.port;
    for (const key of Object.getOwnPropertyNames(e)) {
      if (["name", "message", "stack", "cause"].includes(key)) continue;
      try {
        const v = (e as unknown as Record<string, unknown>)[key];
        if (typeof v === "function") continue;
        base[key] =
          v !== null && typeof v === "object" ? serializeUnknownForLog(v, depth + 1) : v;
      } catch {
        base[key] = "(unreadable)";
      }
    }
    if (e.cause !== undefined) {
      base.cause = serializeUnknownForLog(e.cause, depth + 1);
    }
    return base;
  }
  if (typeof value === "object") {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return { type: "object", stringified: String(value) };
    }
  }
  return String(value);
}

export async function supabaseUpsert(rows: DailyBriefUpsertRow[]): Promise<void> {
  assertSupabaseEnv();
  const base = supabaseUrl.replace(/\/+$/, "");
  const endpoint = `${base}/rest/v1/daily_briefs?on_conflict=id`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Prefer: "resolution=merge-duplicates",
    Accept: "application/json"
  };

  const headersForLog = {
    ...headers,
    apikey: mask(supabaseKey),
    Authorization: `Bearer ${mask(supabaseKey)}`
  };

  console.log(
    "[supabaseUpsert] about to fetch",
    JSON.stringify(
      {
        url: endpoint,
        method: "POST",
        headers: headersForLog,
        bodyBytes: Buffer.byteLength(JSON.stringify(rows), "utf8"),
        rowCount: rows.length
      },
      null,
      2
    )
  );

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(rows),
      cache: "no-store"
    });
  } catch (e) {
    const serialized = serializeUnknownForLog(e);
    console.error(
      "[supabaseUpsert] fetch threw (full dump)",
      JSON.stringify({ error: serialized }, null, 2)
    );
    throw e;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase REST upsert failed: ${res.status} ${text}`.slice(0, 500));
  }
}
