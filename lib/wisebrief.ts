import { tavilySearch } from "./tavily";
import { generateJapaneseBriefFromSearchResults } from "./llm";

export type WiseBriefCategoryKey = "market_trends" | "ai_tools" | "startup_funding";

export type WiseBriefSource = {
  title?: string;
  url?: string;
};

export type WiseBriefItem = {
  key: WiseBriefCategoryKey;
  label: string; // カテゴリ（表示には使わないこともある）
  newsTitle: string;
  summary: string; // ニュース概要（カード表示用）
  background: string;
  current: string;
  forecast: string;
  doyaWord: string;
  // フロント側で「3つのドヤ顔ワード」を表示したい場合のための拡張。
  // 従来互換のため任意にしている。
  doyaWords?: string[];
  youtubeUrl: string;
  sources: WiseBriefSource[];
};

function normalizeWhitespace(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function pickYoutubeUrl(results: Array<{ url?: string }>, youtubeQuery: string) {
  const first = results.find((r) => {
    const u = (r.url ?? "").toLowerCase();
    return u.includes("youtube.com") || u.includes("youtu.be");
  });
  if (first?.url) return first.url;
  // Fallback: YouTube検索結果ページ（最低限「リンクを提示」要件を満たす）
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeQuery)}`;
}

const CATEGORY_QUERIES: Record<
  WiseBriefCategoryKey,
  { label: string; searchQuery: string; youtubeQuery: string }
> = {
  market_trends: {
    label: "人材市場トレンド",
    // X/Twitter + hiring/skills signals + recent.
    searchQuery:
      '("IT hiring" OR "developer hiring" OR "talent market" OR "skill gap") (X OR Twitter OR site:twitter.com OR site:x.com) "AI" "2026" OR "hours"',
    youtubeQuery: "IT人材市場 トレンド"
  },
  ai_tools: {
    label: "最新の人工知能ツール",
    // Focus on emerging/new tools discussed on social/tech news.
    searchQuery:
      '(("new" OR "emerging" OR "unreleased" OR "prototype") (AI OR LLM) (tool OR framework OR "agent") ) (X OR Twitter OR site:twitter.com OR site:x.com OR TechCrunch OR TheVerge OR "Hacker News")',
    youtubeQuery: "最新 AI ツール"
  },
  startup_funding: {
    label: "スタートアップ資金調達",
    searchQuery:
      '("seed" OR "Series A" OR "funding" OR "raised") (startup OR venture) ("AI" OR LLM) (X OR Twitter OR site:twitter.com OR site:x.com OR TechCrunch OR Crunchbase)',
    youtubeQuery: "スタートアップ 資金調達 最新"
  }
};

export async function getTodaysWiseBrief(dateKey: string): Promise<WiseBriefItem[]> {
  const categories = Object.keys(CATEGORY_QUERIES) as WiseBriefCategoryKey[];

  function deriveTitleFromSummary(text: string) {
    const s = normalizeWhitespace(text);
    // 先頭の短いフレーズを見出し相当にする（日本語の「。」区切りを優先）
    const first = s.split("。")[0] ?? s;
    const trimmed = first.trim();
    if (trimmed.length === 0) return "—";
    if (trimmed.length <= 28) return trimmed;
    return trimmed.slice(0, 27).trimEnd() + "…";
  }

  const items = await Promise.all(
    categories.map(async (key) => {
      const cfg = CATEGORY_QUERIES[key];

      try {
        const answerInstruction =
          "次の検索結果を元に、日本語だけで再構成してください。出力はJSONのみ。\n" +
          "まず深く考え、そこから商談でそのまま読める文章に短く整形してください。\n" +
          'キーは "ニュースの核心","メリット（凄さ）","ドヤ顔ワード","商談での刺し方（活用法）","用語解説" の5つだけ。\n' +
          '"ニュースの核心" はカード用の要点で、最大3行に収めてください。\n' +
          '"メリット（凄さ）" は「何がどれだけ良くなるか」を1つに絞り、2〜3文で説明してください（数字は捏造しない）。\n' +
          '"ドヤ顔ワード" は商談で刺さる一言（1文）として作成してください。\n' +
          '"商談での刺し方（活用法）" は相手の業界を1つ選び（製造/営業/事務/開発/経営/その他）、その業界での具体的なメリットを1つ提案してください。専門用語は中学生に教えるつもりで噛み砕いて、3〜5文で。\n' +
          '"用語解説" は本文内の専門用語を1つに絞って、中学生に教えるつもりで噛み砕いて2〜3文で説明してください。\n' +
          "半角英字（A-Z/a-z）を含めないでください。英語の略語も日本語に言い換えてください。";

        const queryForAnswer = `${cfg.searchQuery}\n\n${answerInstruction}\n\n出力JSONの形式: {"ニュースの核心":"...","メリット（凄さ）":"...","ドヤ顔ワード":"...","商談での刺し方（活用法）":"...","用語解説":"..."}`;

        const { answer, results } = await tavilySearch({
          query: queryForAnswer,
          maxResults: 6,
          searchDepth: "fast",
          includeAnswer: "advanced",
          timeRange: "day",
          topic: "news"
        });

        const sources = results
          .filter((r) => Boolean(r.url) || Boolean(r.title))
          .slice(0, 4)
          .map((r) => ({ title: r.title, url: r.url }));

        const brief = await generateJapaneseBriefFromSearchResults({
          categoryLabel: cfg.label,
          rawResults: [],
          tavilyAnswer: answer,
          language: "ja"
        });

        // LLMのJSON5項目（日本語キー）を、UI互換の内部フィールドへマッピング
        const core = normalizeWhitespace(brief.overview);
        const newsTitle = deriveTitleFromSummary(core);
        const doyaWord = normalizeWhitespace(brief.why);
        const merit = normalizeWhitespace(brief.background);
        const usage = normalizeWhitespace(brief.current);
        const glossary = normalizeWhitespace(brief.forecast);
        const youtubeUrl = pickYoutubeUrl(results, cfg.youtubeQuery);

        return {
          key,
          label: cfg.label,
          newsTitle,
          summary: core || "ニュースの核心を整理しました。",
          background: merit,
          current: usage,
          forecast: glossary,
          doyaWord,
          youtubeUrl,
          sources
        };
      } catch (e) {
        const fallbackNewsTitle = cfg?.label ? `要点：${cfg.label}` : "要点";
        return {
          key,
          label: cfg.label,
          newsTitle: fallbackNewsTitle,
          summary: "ニュースの核心を整理しました。カードの内容は再生成される場合があります。",
          background: "この話のメリットは、会話の次の一手が決まりやすくなる点です。",
          current: "商談の刺し方は、相手の業界に合わせて「何が良くなるか」を先に揃えて話すことです。",
          forecast: "用語解説は、難しい言葉を噛み砕いて意味と使いどころを一言で伝えることです。",
          doyaWord: "この一言で、話が次の段階へ進みます。",
          youtubeUrl: pickYoutubeUrl([], cfg.youtubeQuery),
          sources: []
        };
      }
    })
  );

  return items;
}

