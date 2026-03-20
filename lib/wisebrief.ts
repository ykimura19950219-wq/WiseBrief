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
  summary: string;
  doyaWord: string;
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

  function deriveTitleFromSummary(summary: string) {
    const s = normalizeWhitespace(summary);
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
          "次の検索結果を日本語だけで要約してください。出力はJSONのみでキーはsummaryとwhyです。summaryは3行以内、whyは商談でそのまま喋れる一文です。半角英字（A-Z/a-z）を含めないでください。";

        const queryForAnswer = `${cfg.searchQuery}\n\n${answerInstruction}`;

        const { answer, results } = await tavilySearch({
          query: queryForAnswer,
          maxResults: 8,
          searchDepth: "advanced",
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

        const summary = normalizeWhitespace(brief.summary);
        const newsTitle = deriveTitleFromSummary(summary);
        const doyaWord = normalizeWhitespace(brief.why);
        const youtubeUrl = pickYoutubeUrl(results, cfg.youtubeQuery);

        return {
          key,
          label: cfg.label,
          newsTitle,
          summary: summary || "要約を作成できませんでした。",
          doyaWord,
          youtubeUrl,
          sources
        };
      } catch (e) {
        return {
          key,
          label: cfg.label,
          newsTitle: "要約を準備中",
          summary: "要約を生成できませんでした。少し時間をおいて再読み込みしてください。",
          doyaWord: "このポイントは『ここが勝ち筋です』と一言でまとめましょう。",
          youtubeUrl: pickYoutubeUrl([], cfg.youtubeQuery),
          sources: []
        };
      }
    })
  );

  return items;
}

