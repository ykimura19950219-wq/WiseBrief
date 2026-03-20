export type JapaneseBrief = {
  summary: string;
  why: string;
};

function stripAsciiEnglish(text: string) {
  // 画面要件：「英語は一文字も出さない」をできる限り満たすため、
  // ASCII英字（A-Z/a-z）を除去してからトリムします。
  return text.replace(/[A-Za-z]/g, "").replace(/[ \t]+/g, " ").trim();
}

function safeJsonParse(text: string): unknown | null {
  const cleaned = text
    .replace(/```[a-zA-Z]*\n/g, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // JSON抽出（モデルが前後に文字を付けたケース対策）
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch?.[0]) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function generateJapaneseBriefFromSearchResults(args: {
  categoryLabel: string;
  rawResults: Array<{ title?: string; url?: string; content?: string }>;
  tavilyAnswer?: string;
  language: "ja";
}): Promise<JapaneseBrief> {
  // OpenAIは使わず、Tavilyが持つLLM生成（answer）をJSONとしてパースする。
  const content = (args.tavilyAnswer ?? "").trim();
  if (!content) {
    throw new Error("Tavilyの要約（answer）が空でした。");
  }

  const parsed = safeJsonParse(content) as any;

  let summary = typeof parsed?.summary === "string" ? parsed.summary : "";
  let why = typeof parsed?.why === "string" ? parsed.why : "";

  // JSONとして解釈できない場合でも、summary/whyの値だけ抜き出す
  if (!summary || !why) {
    const summaryMatch = content.match(/"summary"\s*:\s*"([^"]*)"/);
    const whyMatch = content.match(/"why"\s*:\s*"([^"]*)"/);
    if (summaryMatch?.[1]) summary = summaryMatch[1];
    if (whyMatch?.[1]) why = whyMatch[1];
  }

  summary = typeof summary === "string" ? stripAsciiEnglish(summary) : "";
  why = typeof why === "string" ? stripAsciiEnglish(why) : "";

  if (!summary && !why) {
    throw new Error("Tavilyの要約（answer）から summary/why を抽出できませんでした。");
  }

  // 要件: 画面に英語を出さないため念のため再サニタイズ
  return {
    summary: summary || "要約を作成できませんでした。",
    why: why || "重要ポイントを作成できませんでした。"
  };
}

