import { NextResponse } from "next/server";

import { getTodaysWiseBrief } from "@/lib/wisebrief";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const dateKey = url.searchParams.get("dateKey") ?? new Date().toISOString().slice(0, 10);

  try {
    const items = await getTodaysWiseBrief(dateKey);
    return NextResponse.json(
      { items, dateKey },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "不明なエラー";
    return NextResponse.json(
      { items: [], dateKey, error: message },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0"
        }
      }
    );
  }
}

