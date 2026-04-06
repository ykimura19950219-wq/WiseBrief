import "server-only";

import { createClient } from "@supabase/supabase-js";

let cached: ReturnType<typeof createClient> | null = null;

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
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
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

export function getSupabaseClient() {
  if (cached) return cached;

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const supabaseKey = serviceRoleKey || supabaseAnonKey;
  if (!supabaseUrl || !supabaseKey) {
    const d = getSupabaseDiagnostics();
    console.error("[supabase] env missing", d);
    throw new Error(
      "Supabase env is missing: SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  cached = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (...args) => fetch(...args),
      headers: { "X-Client-Info": "wisebrief-server" }
    }
  });
  return cached;
}
