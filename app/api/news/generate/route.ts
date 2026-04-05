import { NextResponse } from "next/server";

import { generateNewsItems } from "@/lib/dailyBrief";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300;

export async function POST() {
  try {
    const items = await generateNewsItems();
    const note = items.length < 5 ? `最新は${items.length}件です` : undefined;
    return NextResponse.json({ items, note }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
