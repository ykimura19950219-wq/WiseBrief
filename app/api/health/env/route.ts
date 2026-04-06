import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function envInfo(name: string) {
  const value = process.env[name] ?? "";
  return {
    exists: value.length > 0,
    length: value.length
  };
}

export async function GET() {
  const payload = {
    ok: true,
    checkedAt: new Date().toISOString(),
    env: {
      NEXT_PUBLIC_SUPABASE_URL: envInfo("NEXT_PUBLIC_SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: envInfo("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    }
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
