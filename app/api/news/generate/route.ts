import { NextResponse } from "next/server";

// 2026-03-26確定版：ITエージェントCEO専用ニュース取得エンジン
// 最優先ルール: URL重複排除（同一URLの使い回し禁止）を常に先に満たす。
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300;

type RawNews = {
  title: string;
  snippet: string;
  url: string;
  source: string;
  category: "it" | "general";
  companyKey: string;
  bucket: "prtimes" | "tech" | "public" | "economy";
  topic: "newgrad" | "management";
};

type LineNewsItem = {
  "事実": string;
  "一言要約": string;
  "仕事への影響": string;
  "記事URL": string;
};

type SerperOrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

const SERPER_ENDPOINT = "https://google.serper.dev/search";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL = "google/gemini-2.0-flash-001";
const DEFAULT_CONFIG = {
  targetItems: 5,
  split: {
    work: 3,
    urgent: 2
  },
  excludeTerms: "-年収 -給与 -初任給 -ランキング",
  queries: {
    workToday: [
      "(エンジニア採用 OR DX推進 OR AI導入) after:2026-03-26 -年収 -給与 -初任給 -ランキング",
      "(IT企業 OR DX推進) (業務提携 OR 新サービス発表 OR 資金調達) after:2026-03-26 site:prtimes.jp -年収 -給与 -初任給 -ランキング"
    ],
    urgentToday: [
      "(日経平均株価 OR 為替介入 OR 円安) after:2026-03-26",
      "(デジタル庁 発表 OR IT導入補助金 2026) after:2026-03-26 (site:go.jp OR site:prtimes.jp)",
      "(サイバー攻撃 OR 大手IT 提携) after:2026-03-26"
    ],
    filler: "(IT ニュース OR 経済速報 OR デジタル庁) after:2026-03-25 -年収 -給与 -初任給 -ランキング"
  },
  allowedDomains: ["prtimes.jp", "itmedia.co.jp", "techpjin.jp", "go.jp", "tdb.co.jp", "yahoo.co.jp", "nikkei.com"] as const
} as const;

const WORK_QUERIES_0325 = DEFAULT_CONFIG.queries.workToday.map((q) => q.replace(/after:2026-03-26/g, "after:2026-03-25"));
const URGENT_QUERIES_0325 = DEFAULT_CONFIG.queries.urgentToday.map((q) => q.replace(/after:2026-03-26/g, "after:2026-03-25"));

const normalize = (text: string, max = 240): string => {
  const cleaned = text.trim().replace(/\s+/g, " ");
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
};

const detectSourceName = (url: string): string => {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes("prtimes")) return "PR TIMES";
  if (host.includes("itmedia")) return "ITmedia";
  if (host.includes("techpjin")) return "techpjin";
  if (host.endsWith(".go.jp") || host.includes("go.jp")) return "go.jp";
  if (host.includes("tdb.co.jp")) return "帝国データバンク";
  if (host.includes("yahoo.co.jp")) return "Yahoo!ニュース";
  if (host.includes("nikkei.com")) return "日本経済新聞";
  return host;
};

const extractCompanyKey = (title: string, snippet: string, url: string): string => {
  const text = `${title} ${snippet}`;
  const m = text.match(/([A-Za-z0-9&.\-]+(?:株式会社|ホールディングス|HD|Inc\.|Group)?)/);
  if (m?.[1]) return m[1].toLowerCase();
  return `${new URL(url).hostname.toLowerCase()}_${title.slice(0, 24).toLowerCase()}`;
};

const isAllowedDomain = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return DEFAULT_CONFIG.allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
};

const isDirectArticleUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (host.includes("prtimes.jp")) return path.includes("/main/html/rd/p/");
    if (host.includes("itmedia.co.jp")) return path.includes("/articles/") || path.endsWith(".html");
    if (host.includes("techpjin.jp")) return path.split("/").filter(Boolean).length >= 1;
    if (host.includes("go.jp")) return path.split("/").filter(Boolean).length >= 2;
    if (host.includes("tdb.co.jp")) return path.split("/").filter(Boolean).length >= 1;
    if (host.includes("yahoo.co.jp")) return path.split("/").filter(Boolean).length >= 2;
    return false;
  } catch {
    return false;
  }
};

const detectBucket = (url: string): RawNews["bucket"] | null => {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes("prtimes.jp")) return "prtimes";
  if (host.includes("itmedia.co.jp") || host.includes("techpjin.jp")) return "tech";
  if (host.includes("go.jp") || host.includes("tdb.co.jp")) return "public";
  if (host.includes("yahoo.co.jp")) return "economy";
  return null;
};

const detectTopic = (title: string, snippet: string): RawNews["topic"] => {
  const t = `${title} ${snippet}`.toLowerCase();
  const managementKeywords = ["決算", "業務提携", "資金調達", "dx推進", "予算", "投資", "提携", "新サービス", "規制", "サイバー攻撃"];
  return managementKeywords.some((k) => t.includes(k)) ? "management" : "newgrad";
};

const isHotItTrend = (item: RawNews): boolean => {
  if (!(item.source === "ITmedia" || item.source === "Yahoo!ニュース")) return false;
  const t = `${item.title} ${item.snippet}`.toLowerCase();
  const trendKeywords = ["事件", "事故", "障害", "サイバー", "漏えい", "規制", "ai", "生成ai", "トレンド", "炎上"];
  return trendKeywords.some((k) => t.includes(k));
};

const isLikelyPaidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (host.includes("nikkei.com")) return true;
    if (path.includes("/nkd/")) return true;
    // Nikkei paywall patterns are rejected globally; keep ITmedia /articles valid.
    if (host.includes("nikkei") && path.includes("/article/")) return true;
    return false;
  } catch {
    return true;
  }
};

async function fetchSerperResults(query: string, forcedCategory: "it" | "general"): Promise<RawNews[]> {
  const apiKey = process.env.SERPER_API_KEY ?? "";
  if (!apiKey) throw new Error("SERPER_API_KEY is missing");

  const response = await fetch(SERPER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey
    },
    body: JSON.stringify({
      q: query,
      gl: "jp",
      hl: "ja",
      google_domain: "google.co.jp",
      num: 20
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Serper request failed: ${response.status} ${text}`.slice(0, 300));
  }

  const data = (await response.json()) as { organic?: SerperOrganicResult[] };
  const seen = new Set<string>();

  return (data.organic ?? [])
    .map((item): RawNews | null => {
      const title = normalize(String(item.title ?? ""), 180);
      const snippet = normalize(String(item.snippet ?? ""), 260);
      const url = String(item.link ?? "").trim();
      if (!title || !url) return null;
      if (!isAllowedDomain(url)) return null;
      if (isLikelyPaidUrl(url)) return null;
      if (!isDirectArticleUrl(url)) return null;
      const bucket = detectBucket(url);
      if (!bucket) return null;
      if (seen.has(url)) return null;
      seen.add(url);
      return {
        title,
        snippet,
        url,
        source: detectSourceName(url),
        category: forcedCategory,
        companyKey: extractCompanyKey(title, snippet, url),
        bucket,
        topic: detectTopic(title, snippet)
      };
    })
    .filter((item): item is RawNews => item !== null);
}

function pickFiveItems(all: RawNews[]): RawNews[] {
  const workPool = all.filter((x) => x.category === "it");
  const urgentPool = all.filter((x) => x.category === "general");
  const picked: RawNews[] = [];
  const seenUrls = new Set<string>();
  const seenCompanies = new Set<string>();

  const pushCompanyUnique = (item: RawNews) => {
    if (picked.length >= DEFAULT_CONFIG.targetItems) return;
    if (seenUrls.has(item.url)) return;
    if (seenCompanies.has(item.companyKey)) return;
    seenUrls.add(item.url);
    seenCompanies.add(item.companyKey);
    picked.push(item);
  };

  for (const item of workPool) {
    if (picked.filter((x) => x.category === "it").length >= DEFAULT_CONFIG.split.work) break;
    pushCompanyUnique(item);
  }
  for (const item of urgentPool) {
    if (picked.filter((x) => x.category === "general").length >= DEFAULT_CONFIG.split.urgent) break;
    pushCompanyUnique(item);
  }

  for (const extra of all) {
    pushCompanyUnique(extra);
  }

  // 5件中最低2件は新卒採用以外の経済・経営トピックを強制
  const managementCount = picked.filter((x) => x.topic === "management").length;
  if (managementCount < 2) {
    const managementPool = all.filter((x) => x.topic === "management");
    for (const m of managementPool) {
      if (picked.some((p) => p.url === m.url)) continue;
      const replaceIdx = picked.findIndex((p) => p.topic !== "management");
      if (replaceIdx < 0) break;
      picked[replaceIdx] = m;
      if (picked.filter((x) => x.topic === "management").length >= 2) break;
    }
  }

  // 5件中1件はITmedia or Yahoo!ニュースのIT事件/トレンドを必ず混ぜる
  const hasSpice = picked.some((p) => isHotItTrend(p));
  if (!hasSpice) {
    const spiceCandidate = all.find((x) => isHotItTrend(x) && !picked.some((p) => p.url === x.url));
    if (spiceCandidate) {
      const replaceIdx = picked.findIndex((p) => p.source !== "ITmedia" && p.source !== "Yahoo!ニュース");
      if (replaceIdx >= 0) picked[replaceIdx] = spiceCandidate;
    }
  }
  return picked.slice(0, DEFAULT_CONFIG.targetItems);
}

async function fetchMergedNews(): Promise<RawNews[]> {
  const runQueries = async (queries: readonly string[], category: "it" | "general") => {
    const chunks = await Promise.all(queries.map((q) => fetchSerperResults(q, category)));
    return chunks.flat();
  };

  // 今日(3/26)優先。足りない場合のみ昨日(3/25)を追加。
  const [workToday, urgentToday] = await Promise.all([
    runQueries(DEFAULT_CONFIG.queries.workToday, "it"),
    runQueries(DEFAULT_CONFIG.queries.urgentToday, "general")
  ]);

  let work = workToday;
  let urgent = urgentToday;
  if (work.length < DEFAULT_CONFIG.split.work) {
    const workYday = await runQueries(WORK_QUERIES_0325, "it");
    work = [...workToday, ...workYday];
  }
  if (urgent.length < DEFAULT_CONFIG.split.urgent) {
    const urgentYday = await runQueries(URGENT_QUERIES_0325, "general");
    urgent = [...urgentToday, ...urgentYday];
  }

  const seen = new Set<string>();
  const merged: RawNews[] = [];
  const pushUnique = (items: RawNews[]) => {
    for (const item of items) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      merged.push(item);
    }
  };

  pushUnique(work);
  pushUnique(urgent);

  if (merged.length < DEFAULT_CONFIG.targetItems) {
    const filler = await fetchSerperResults(DEFAULT_CONFIG.queries.filler, "general");
    pushUnique(filler);
  }
  return merged;
}

function extractJsonObject(text: string): { items?: unknown } | null {
  const normalized = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const first = normalized.indexOf("{");
  const last = normalized.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  try {
    return JSON.parse(normalized.slice(first, last + 1));
  } catch {
    return null;
  }
}

function buildFallbackItems(raw: RawNews[]): LineNewsItem[] {
  return raw.slice(0, DEFAULT_CONFIG.targetItems).map((item) => ({
    "事実": `${item.title}\n${item.snippet}`,
    "一言要約": normalize(item.snippet || `${item.source}で報じられたニュースです。`, 90),
    "仕事への影響":
      item.category === "it"
        ? "IT採用を強化したい企業へ、採用要件と提示年収の見直しを提案する。"
        : "経済変化の影響が大きい業界クライアントへ採用計画の優先順位調整を提案する。",
    "記事URL": item.url
  }));
}

function sanitizeItems(items: unknown, raw: RawNews[]): LineNewsItem[] {
  const allowedUrls = new Set(raw.map((r) => r.url));
  if (!Array.isArray(items)) return buildFallbackItems(raw);
  const seen = new Set<string>();

  const validated = items
    .slice(0, DEFAULT_CONFIG.targetItems)
    .map((item): LineNewsItem | null => {
      const record = item as Record<string, unknown>;
      const fact = normalize(String(record["事実"] ?? ""), 280);
      const summary = normalize(String(record["一言要約"] ?? ""), 120);
      const impact = normalize(
        String(record["仕事への影響"] ?? "")
          .replace(/[•●・\-]\s*/g, " ")
          .replace(/\n{3,}/g, "\n"),
        100
      );
      const url = String(record["記事URL"] ?? "").trim();
      if (!fact || !summary || !impact || !url) return null;
      if (!allowedUrls.has(url)) return null;
      if (seen.has(url)) return null;
      seen.add(url);
      return { "事実": fact, "一言要約": summary, "仕事への影響": impact, "記事URL": url };
    })
    .filter((item): item is LineNewsItem => item !== null);

  return validated.length > 0 ? validated : buildFallbackItems(raw);
}

async function toLineFormat(raw: RawNews[]): Promise<LineNewsItem[]> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing");

  const candidates = raw
    .map(
      (item, i) =>
        `${i + 1}. title: ${item.title}\nsource: ${item.source}\ncategory: ${item.category}\nsnippet: ${item.snippet}\nurl: ${item.url}`
    )
    .join("\n\n");

  const prompt =
    "IT人材エージェントのCEO向けに、以下の最新ニュースを要約してください。仕事への影響はエージェント視点で具体的に書いてください。\n" +
    "以下はSerper APIで実際に取得したGoogle検索結果です。必ずこの情報だけを使ってJSONで5件返してください。\n" +
    "URLは候補urlを1文字も変えずにそのまま使い、絶対に新しいURLを捏造しないこと。\n" +
    "年収や給与の数字を並べるのは禁止。必ず何が起きたか（イベント）を報告すること。\n" +
    "日経新聞の有料URLではなく、誰でも読めるプレスリリースやIT専門ニュースサイトを優先すること。\n" +
    "5件のニュースは必ず独立した別々のURLから作成すること。URLの使い回しを発見した場合はエラーとする。\n" +
    "必ず合計5件返すこと。内訳は仕事向け3件（エンジニア採用・DX・AI導入）+ 知らないとヤバイ時事2件（経済/行政/IT事件）。\n" +
    "Serperの取得候補は10件以上ある前提で、重複のない上位5件を選ぶこと。\n" +
    "5件中3件は新卒エンジニア採用市場の動き、最低2件は新卒採用以外の経済・経営トピック（IT企業 決算、業務提携、資金調達、DX推進予算）を入れること。\n" +
    "5件中1件はITmediaまたはYahoo!ニュース（ITカテゴリ）の事件・事故・トレンドを入れること。\n" +
    "新卒採用に苦戦している業界・企業はどこか、その不足分を補うためにどんな中途採用ニーズが発生するかを必ず書くこと。\n" +
    "「DX推進」だけの抽象表現は禁止。事実の冒頭には、生成AI点検、運用自動化SaaSなど具体的なソリューション名・技術名を明記すること。\n" +
    "「仕事への影響」は箇条書きを使わず、最大2行・100文字以内で、どの企業のどの職種担当者にどんな切り口で提案すべきかを1つ具体的に書くこと。\n" +
    "特定1社への偏りを避け、5件は異なる企業の話題で構成すること。\n" +
    '出力キーは「事実」「一言要約」「仕事への影響」「記事URL」のみ。itemsは必ず5件。\n' +
    '形式: {"items":[{"事実":"...","一言要約":"...","仕事への影響":"...","記事URL":"https://..."}]}\n' +
    `\n候補:\n${candidates}`;

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 1200,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? "";
  const parsed = extractJsonObject(text);
  return sanitizeItems(parsed?.items, raw);
}

export async function generateNewsItems(): Promise<LineNewsItem[]> {
  const raw = await fetchMergedNews();
  const picked = pickFiveItems(raw);
  return toLineFormat(picked);
}

export async function POST() {
  try {
    const items = await generateNewsItems();
    const note = items.length < DEFAULT_CONFIG.targetItems ? `最新は${items.length}件です` : undefined;
    return NextResponse.json({ items, note }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}

