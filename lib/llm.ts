export type JapaneseBrief = {
  overview: string;
  background: string;
  current: string;
  forecast: string;
  why: string;
};

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
    const fallback = stripAsciiEnglish(args.categoryLabel).slice(0, 40);
    return {
      overview: "ニュースの核心を整理しました。",
      background: fallback ? `この話の凄さは「${fallback}」の要点が短時間で決まるところです。` : "この話の凄さは、次の一手が決まりやすくなるところです。",
      current: "商談の刺し方は、相手の業界に合わせて「何が良くなるか」を先に揃えて話すことです。",
      forecast: "用語解説は、難しい言葉を噛み砕いて意味と使いどころを一言で伝えることです。",
      why: fallback ? `この一言で「${fallback}」の話が前に進みます。` : "この一言で、話が次の段階へ進みます。"
    };
  }

  const parsed = safeJsonParse(content) as any;

  // Tavily側のJSON5項目（日本語キー）を、UI互換の内部フィールドへマッピング
  let overview =
    typeof parsed?.["ニュースの核心"] === "string"
      ? parsed["ニュースの核心"]
      : typeof parsed?.overview === "string"
        ? parsed.overview
        : "";
  let background =
    typeof parsed?.["メリット（凄さ）"] === "string"
      ? parsed["メリット（凄さ）"]
      : typeof parsed?.background === "string"
        ? parsed.background
        : "";
  let current =
    typeof parsed?.["商談での刺し方（活用法）"] === "string"
      ? parsed["商談での刺し方（活用法）"]
      : typeof parsed?.current === "string"
        ? parsed.current
        : "";
  let forecast =
    typeof parsed?.["用語解説"] === "string"
      ? parsed["用語解説"]
      : typeof parsed?.forecast === "string"
        ? parsed.forecast
        : "";
  let why =
    typeof parsed?.["ドヤ顔ワード"] === "string"
      ? parsed["ドヤ顔ワード"]
      : typeof parsed?.why === "string"
        ? parsed.why
        : "";

  // JSONとして解釈できない場合でも、必要キーだけ抜き出す
  if (!overview || !background || !current || !forecast || !why) {
    const m = (keys: string[]) => {
      for (const key of keys) {
        const reg = new RegExp(
          `"${escapeRegExp(key)}"\\s*[:：]\\s*"([\\s\\S]*?)"\\s*(,|})`,
          "m"
        );
        const found = content.match(reg)?.[1];
        if (typeof found === "string" && found.trim()) return found;
      }
      return "";
    };

    overview = overview || m(["ニュースの核心", "overview"]);
    background = background || m(["メリット（凄さ）", "background"]);
    current = current || m(["商談での刺し方（活用法）", "current"]);
    forecast = forecast || m(["用語解説", "forecast"]);
    why = why || m(["ドヤ顔ワード", "why"]);
  }

  overview = typeof overview === "string" ? stripAsciiEnglish(overview) : "";
  background = typeof background === "string" ? stripAsciiEnglish(background) : "";
  current = typeof current === "string" ? stripAsciiEnglish(current) : "";
  forecast = typeof forecast === "string" ? stripAsciiEnglish(forecast) : "";
  why = typeof why === "string" ? stripAsciiEnglish(why) : "";

  // 値が全滅している場合は、contentから可能な範囲で“読み物”を作って表示を落とさない。
  if (!overview && !background && !current && !forecast && !why) {
    const normalized = stripAsciiEnglish(content.replace(/\s+/g, " ").trim());
    const fallbackText = normalized.slice(0, 420);
    return {
      overview: fallbackText ? `${fallbackText}。` : "ニュースの核心を整理しました。",
      background: fallbackText ? `メリット（凄さ）：${fallbackText}。` : "メリット（凄さ）を読み取り中です。",
      current: fallbackText ? `商談での刺し方（活用法）：${fallbackText}。` : "商談での刺し方（活用法）を整理中です。",
      forecast: fallbackText ? `用語解説：${fallbackText}。` : "用語解説を作成中です。",
      why: "この一言で、商談の主導権を取りやすくなります。"
    };
  }

  // 要件: 画面に英語を出さないため念のため再サニタイズ
  return {
    overview: overview || "ニュースの核心を整理しました。",
    background: background || "メリット（凄さ）を読み取り中です。",
    current: current || "商談での刺し方（活用法）を整理中です。",
    forecast: forecast || "用語解説を作成中です。",
    why: why || "この一言で、話が次の段階へ進みます。"
  };
}

