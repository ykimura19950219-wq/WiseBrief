import { NextResponse } from "next/server";

import { loadPersistedDailyBrief } from "@/lib/dailyBrief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await loadPersistedDailyBrief();
    if (!items?.length) {
      return NextResponse.json(
        { items: [], message: "まだ本日のブリーフがありません。/api/daily-brief を実行してください。" },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json({ items }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ items: [], error: message }, { status: 500 });
  }
}
