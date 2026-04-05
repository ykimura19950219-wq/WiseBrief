export type TavilyResult = {
  answer?: string;
  results: Array<{
    url?: string;
    title?: string;
    content?: string;
    published_date?: string;
  }>;
};

type IncludeAnswer = boolean | "basic" | "advanced";
type SearchDepth = "basic" | "fast" | "advanced" | "ultra-fast";
type TimeRange = "day" | "week" | "month" | "year" | "d" | "w" | "m" | "y";
type Topic = "general" | "news" | "finance";

const TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search";

export async function tavilySearch(params: {
  query: string;
  maxResults?: number;
  searchDepth?: SearchDepth;
  includeAnswer?: IncludeAnswer;
  timeRange?: TimeRange;
  topic?: Topic;
}): Promise<TavilyResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not set. Please set it in .env.local");
  }

  const res = await fetch(TAVILY_SEARCH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      api_key: apiKey,
      query: params.query,
      search_depth: params.searchDepth ?? "advanced",
      include_answer: params.includeAnswer ?? "advanced",
      max_results: params.maxResults ?? 8,
      time_range: params.timeRange ?? "day",
      topic: params.topic ?? "news"
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tavily request failed: ${res.status} ${text}`);
  }

  const data = (await res.json().catch(() => ({}))) as {
    answer?: string;
    results?: Array<{ url?: string; title?: string; content?: string }>;
  };

  return {
    answer: data.answer,
    results: data.results ?? []
  };
}

