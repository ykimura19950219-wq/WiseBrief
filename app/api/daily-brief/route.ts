import { NextResponse } from "next/server";

import { generateDailyBriefItems, persistDailyBrief } from "@/lib/dailyBrief";
import { pushLineToUser } from "@/lib/lineMessaging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const APP_URL = "https://wisebrief.onrender.com";

const MAX_CAUSE_DEPTH = 8;

function serializeCause(value: unknown, depth = 0): unknown {
  if (depth > MAX_CAUSE_DEPTH) return { truncated: true };
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Error) {
    const err = value as Error &
      NodeJS.ErrnoException & { address?: string; port?: number; hostname?: string };
    return {
      type: "Error",
      name: err.name,
      message: err.message,
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      hostname: err.hostname,
      address: err.address,
      port: err.port,
      stack: err.stack,
      cause: err.cause !== undefined ? serializeCause(err.cause, depth + 1) : undefined
    };
  }
  if (typeof value === "object") {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch {
      return { type: typeof value, value: String(value) };
    }
  }
  return String(value);
}

function authorize(req: Request): boolean {
  const secret = process.env.DAILY_BRIEF_SECRET ?? process.env.CRON_SECRET ?? "";
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const header = req.headers.get("x-cron-secret") ?? "";
  return bearer === secret || header === secret;
}

/** SDK を介さず PostgREST への極小通信（DNS / TLS / キー検証用） */
async function runSupabaseMinimalRestTest() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!base || !anon) {
    console.error(
      "[daily-brief] minimal REST test skipped: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing"
    );
    return;
  }

  const testUrl = `${base.replace(/\/+$/, "")}/rest/v1/daily_briefs?select=*`;
  try {
    const testRes = await fetch(testUrl, {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`
      },
      cache: "no-store"
    });
    console.log("TEST_STATUS:", testRes.status);
  } catch (err) {
    const cause = err instanceof Error ? err.cause : undefined;
    console.error(
      "[daily-brief] minimal REST test fetch failed",
      JSON.stringify(
        {
          cause: cause !== undefined ? serializeCause(cause) : undefined,
          error: err instanceof Error ? serializeCause(err) : String(err)
        },
        null,
        2
      )
    );
    throw err;
  }
}

async function runPipeline() {
  const items = await generateDailyBriefItems();
  if (items.length !== 5) {
    throw new Error(`想定5件ですが ${items.length} 件しか生成できませんでした`);
  }
  // Supabase 保存: SDK ではなく lib/supabase.ts の supabaseUpsert（PostgREST 直叩き）
  await persistDailyBrief(items);

  const lineBody =
    "今日の武器（5件）が届きました。リンクから確認してください\n\n" + APP_URL;
  await pushLineToUser(lineBody);

  return items;
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runSupabaseMinimalRestTest();
    const items = await runPipeline();
    return NextResponse.json({ ok: true, count: items.length, items }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const causeSerialized = e instanceof Error ? serializeCause(e.cause) : serializeCause(e);

    const errorDetail =
      e instanceof Error
        ? {
            name: e.name,
            message: e.message,
            stack: e.stack,
            cause: causeSerialized
          }
        : e;

    console.error("[daily-brief] pipeline failed", {
      message,
      errorDetail
    });

    return NextResponse.json(
      {
        ok: false,
        error: message,
        cause: causeSerialized
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
