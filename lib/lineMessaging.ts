import "server-only";

const PUSH_URL = "https://api.line.me/v2/bot/message/push";

export async function pushLineToUser(text: string): Promise<void> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "";
  const userId = process.env.LINE_USER_ID ?? process.env.LINE_CEO_USER_ID ?? "";

  if (!accessToken) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is missing");
  if (!userId) throw new Error("LINE_USER_ID or LINE_CEO_USER_ID is missing");

  const res = await fetch(PUSH_URL, {
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
    throw new Error(`LINE push failed: ${res.status} ${t}`.slice(0, 320));
  }
}
