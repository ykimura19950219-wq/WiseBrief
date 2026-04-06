import { NextResponse } from "next/server";

import { generateDailyBriefItems, persistDailyBrief } from "@/lib/dailyBrief";
import { pushLineToUser } from "@/lib/lineMessaging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const APP_URL = "https://wisebrief.onrender.com";

function authorize(req: Request): boolean {
  const secret = process.env.DAILY_BRIEF_SECRET ?? process.env.CRON_SECRET ?? "";
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const header = req.headers.get("x-cron-secret") ?? "";
  return bearer === secret || header === secret;
}

async function runPipeline() {
  const items = await generateDailyBriefItems();
  if (items.length !== 5) {
    throw new Error(`想定5件ですが ${items.length} 件しか生成できませんでした`);
  }
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
    const items = await runPipeline();
    return NextResponse.json({ ok: true, count: items.length, items }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const errorDetail =
      e instanceof Error
        ? {
            name: e.name,
            message: e.message,
            stack: e.stack,
            cause: e.cause
          }
        : e;

    console.error("[daily-brief] pipeline failed", {
      message,
      errorDetail
    });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
