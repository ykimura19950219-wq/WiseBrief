import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { generateNewsItems } from "../../news/generate/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getHeader(req: Request, name: string) {
  return req.headers.get(name) ?? "";
}

function verifyLineSignature({
  channelSecret,
  body,
  signature
}: {
  channelSecret: string;
  body: Buffer;
  signature: string;
}) {
  const hmac = crypto.createHmac("sha256", channelSecret);
  hmac.update(body);
  const computed = hmac.digest("base64");
  return computed === signature;
}

async function replyToLine({
  accessToken,
  replyToken,
  text
}: {
  accessToken: string;
  replyToken: string;
  text: string;
}) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }]
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`line reply failed: ${res.status} ${t}`.slice(0, 300));
  }
}

async function pushToLineUser({
  accessToken,
  userId,
  text
}: {
  accessToken: string;
  userId: string;
  text: string;
}) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text }]
    })
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`line push failed: ${res.status} ${t}`.slice(0, 300));
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET ?? "";
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";

  if (!channelSecret || !accessToken) {
    console.error("[line webhook] missing LINE_CHANNEL_SECRET/ACCESS_TOKEN");
    return NextResponse.json(
      { ok: false, error: "LINE env variables are missing" },
      { status: 500 }
    );
  }

  // LINE Messaging API signature verification requires the raw request body bytes.
  const signature = getHeader(req, "x-line-signature");
  const bodyBuf = Buffer.from(await req.arrayBuffer());

  if (!verifyLineSignature({ channelSecret, body: bodyBuf, signature })) {
    console.warn("[line webhook] invalid signature");
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payload = JSON.parse(bodyBuf.toString("utf-8")) as any;
  const events = Array.isArray(payload?.events) ? payload.events : [];

  // 最小実装: 受信したテキストに対して返信（将来ここで /api/news/generate を呼んで武器化結果を返せる）
  const firstMessageEvent = events.find(
    (e: any) =>
      e?.type === "message" &&
      e?.message?.type === "text" &&
      typeof e?.message?.text === "string" &&
      typeof e?.replyToken === "string"
  );

  if (firstMessageEvent) {
    const replyToken = firstMessageEvent.replyToken as string;
    const userText = firstMessageEvent.message.text as string;
    const userId = firstMessageEvent?.source?.userId as string | undefined;

    const buildText = (list: any[]) => {
      const limit = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
      const compactImpact = (s: string) =>
        limit(
          s
            .replace(/[•●・\-]\s*/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
          100
        );
      const lines: string[] = ["今日の厳選ニュース（5件）"];

      const safeList = Array.isArray(list) ? list.slice(0, 5) : [];
      if (!safeList.length) return "本日のニュース候補は見つかりませんでした。";

      for (let i = 0; i < safeList.length; i++) {
        const it = safeList[i];
        if (!it) continue;

        const fact = typeof it?.["事実"] === "string" ? limit(it["事実"].trim(), 130) : "";
        const summary = typeof it?.["一言要約"] === "string" ? limit(it["一言要約"].trim(), 48) : "";
        const impact = typeof it?.["仕事への影響"] === "string" ? compactImpact(it["仕事への影響"]) : "";
        const source = typeof it?.["記事URL"] === "string" ? it["記事URL"].trim() : "";

        if (!fact && !summary && !impact && !source) continue;

        lines.push(`${i + 1}. 【事実】`);
        lines.push(fact || "—");
        lines.push(`【一言要約】${summary || "—"}`);
        lines.push(`【仕事への影響】${impact || "—"}`);
        lines.push(`【記事URL】${source || "—"}`);
        lines.push("");
      }
      let rawText = lines.join("\n");
      if (rawText.length <= 1500) return rawText;

      // 5件完走を優先して、各項目をさらに圧縮
      const squeezed = safeList.map((it: any, i: number) => {
        const fact = typeof it?.["事実"] === "string" ? limit(it["事実"].trim(), 70) : "—";
        const summary = typeof it?.["一言要約"] === "string" ? limit(it["一言要約"].trim(), 32) : "—";
        const impact = typeof it?.["仕事への影響"] === "string" ? compactImpact(limit(it["仕事への影響"].trim(), 72)) : "—";
        const source = typeof it?.["記事URL"] === "string" ? it["記事URL"].trim() : "—";
        return `${i + 1}. 【事実】${fact}\n【一言要約】${summary}\n【仕事への影響】${impact}\n【記事URL】${source}\n`;
      });
      rawText = `今日の厳選ニュース（5件）\n${squeezed.join("\n")}`;
      return rawText.length > 1500 ? rawText.slice(0, 1499) : rawText;
    };

    // 返信リクエストは即返し、生成〜返信はバックグラウンドで完了させる
    void (async () => {
      let finalText = "";
      const ceoUserId = process.env.LINE_CEO_USER_ID ?? "";
      try {
        const openrouterKey = process.env.OPENROUTER_API_KEY;
        if (!openrouterKey) console.warn("[line webhook] OPENROUTER_API_KEY missing");

        // 内部APIをHTTPで叩かず、同サーバ内関数を直呼び（SSL通信エラー回避）
        const items = await generateNewsItems();
        finalText = buildText(items);
        // 生成完了後に、1回だけまとめてpush（各宛先は各1回）
        if (userId) await pushToLineUser({ accessToken, userId, text: finalText });
        if (ceoUserId)
          await pushToLineUser({ accessToken, userId: ceoUserId, text: finalText });
      } catch (e) {
        // AI/生成失敗時はエラーメッセージをそのままLINEに返す
        finalText = e instanceof Error ? e.message : String(e);
        if (userId) await pushToLineUser({ accessToken, userId, text: finalText });
        if (ceoUserId)
          await pushToLineUser({ accessToken, userId: ceoUserId, text: finalText });
        console.error("[line webhook] generate failed (sent error message):", e);
      }
    })();

    void userText; // keep for debugging if needed
  }

  // LINE側は 200 を返せばOK
  return NextResponse.json({ ok: true }, { status: 200 });
}

