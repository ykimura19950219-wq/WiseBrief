import "server-only";

import { getSupabaseClient, getSupabaseDiagnostics } from "@/lib/supabase";

export type LineNewsItem = {
  事実: string;
  一言要約: string;
  仕事への影響: string;
  記事URL: string;
};

export type DailyBriefItem = {
  id: number;
  category: string;
  title: string;
  summary: string;
  details: string;
  doyaWord: string;
  /** LLM「仕事への影響」（LINE互換・省略時は summary を流用） */
  jobImpact?: string;
  url: string;
  time: string;
  icon: string;
};

type DailyBriefRow = {
  id: number;
  category: string;
  title: string;
  summary: string;
  details: string;
  doya_word: string;
  job_impact: string | null;
  url: string;
  created_at: string;
};

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

type SerperOrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

const SERPER_ENDPOINT = "https://google.serper.dev/search";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL = "google/gemini-2.0-flash-001";

const TARGET = 5;

const DEFAULT_ALLOWED_DOMAINS = [
  "prtimes.jp",
  "itmedia.co.jp",
  "techpjin.jp",
  "go.jp",
  "tdb.co.jp",
  "yahoo.co.jp",
  "nikkei.com"
] as const;

function jstDateStrings() {
  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const now = new Date();
  const jst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const yday = new Date(jst);
  yday.setDate(yday.getDate() - 1);
  return { today: fmt(jst), yesterday: fmt(yday) };
}

function buildQueries(afterToday: string, afterYesterday: string) {
  const exclude = "-年収 -給与 -初任給 -ランキング";
  return {
    split: { work: 3, urgent: 2 },
    queries: {
      workToday: [
        `(エンジニア採用 OR DX推進 OR AI導入) after:${afterToday} ${exclude}`,
        `(IT企業 OR DX推進) (業務提携 OR 新サービス発表 OR 資金調達) after:${afterToday} site:prtimes.jp ${exclude}`
      ],
      urgentToday: [
        `(日経平均株価 OR 為替介入 OR 円安) after:${afterToday}`,
        `(デジタル庁 発表 OR IT導入補助金) after:${afterToday} (site:go.jp OR site:prtimes.jp)`,
        `(サイバー攻撃 OR 大手IT 提携) after:${afterToday}`
      ],
      filler: `(IT ニュース OR 経済速報 OR デジタル庁) after:${afterYesterday} ${exclude}`
    },
    workYesterday: [
      `(エンジニア採用 OR DX推進 OR AI導入) after:${afterYesterday} ${exclude}`,
      `(IT企業 OR DX推進) (業務提携 OR 新サービス発表 OR 資金調達) after:${afterYesterday} site:prtimes.jp ${exclude}`
    ],
    urgentYesterday: [
      `(日経平均株価 OR 為替介入 OR 円安) after:${afterYesterday}`,
      `(デジタル庁 発表 OR IT導入補助金) after:${afterYesterday} (site:go.jp OR site:prtimes.jp)`,
      `(サイバー攻撃 OR 大手IT 提携) after:${afterYesterday}`
    ]
  };
}

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
    return DEFAULT_ALLOWED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
};

const isDirectArticleUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const p = parsed.pathname.toLowerCase();
    if (host.includes("prtimes.jp")) return p.includes("/main/html/rd/p/");
    if (host.includes("itmedia.co.jp")) return p.includes("/articles/") || p.endsWith(".html");
    if (host.includes("techpjin.jp")) return p.split("/").filter(Boolean).length >= 1;
    if (host.includes("go.jp")) return p.split("/").filter(Boolean).length >= 2;
    if (host.includes("tdb.co.jp")) return p.split("/").filter(Boolean).length >= 1;
    if (host.includes("yahoo.co.jp")) return p.split("/").filter(Boolean).length >= 2;
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
  const managementKeywords = [
    "決算",
    "業務提携",
    "資金調達",
    "dx推進",
    "予算",
    "投資",
    "提携",
    "新サービス",
    "規制",
    "サイバー攻撃"
  ];
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
    const pathname = parsed.pathname.toLowerCase();
    if (host.includes("nikkei.com")) return true;
    if (pathname.includes("/nkd/")) return true;
    if (host.includes("nikkei") && pathname.includes("/article/")) return true;
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

function pickFiveItems(all: RawNews[], cfg: ReturnType<typeof buildQueries>): RawNews[] {
  const workPool = all.filter((x) => x.category === "it");
  const urgentPool = all.filter((x) => x.category === "general");
  const picked: RawNews[] = [];
  const seenUrls = new Set<string>();
  const seenCompanies = new Set<string>();

  const pushCompanyUnique = (item: RawNews) => {
    if (picked.length >= TARGET) return;
    if (seenUrls.has(item.url)) return;
    if (seenCompanies.has(item.companyKey)) return;
    seenUrls.add(item.url);
    seenCompanies.add(item.companyKey);
    picked.push(item);
  };

  for (const item of workPool) {
    if (picked.filter((x) => x.category === "it").length >= cfg.split.work) break;
    pushCompanyUnique(item);
  }
  for (const item of urgentPool) {
    if (picked.filter((x) => x.category === "general").length >= cfg.split.urgent) break;
    pushCompanyUnique(item);
  }

  for (const extra of all) {
    pushCompanyUnique(extra);
  }

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

  const hasSpice = picked.some((p) => isHotItTrend(p));
  if (!hasSpice) {
    const spiceCandidate = all.find((x) => isHotItTrend(x) && !picked.some((p) => p.url === x.url));
    if (spiceCandidate) {
      const replaceIdx = picked.findIndex((p) => p.source !== "ITmedia" && p.source !== "Yahoo!ニュース");
      if (replaceIdx >= 0) picked[replaceIdx] = spiceCandidate;
    }
  }
  return picked.slice(0, TARGET);
}

async function fetchMergedNews(cfg: ReturnType<typeof buildQueries>): Promise<RawNews[]> {
  const runQueries = async (queries: readonly string[], category: "it" | "general") => {
    const chunks = await Promise.all(queries.map((q) => fetchSerperResults(q, category)));
    return chunks.flat();
  };

  const [workToday, urgentToday] = await Promise.all([
    runQueries(cfg.queries.workToday, "it"),
    runQueries(cfg.queries.urgentToday, "general")
  ]);

  let work = workToday;
  let urgent = urgentToday;
  if (work.length < cfg.split.work) {
    const workYday = await runQueries(cfg.workYesterday, "it");
    work = [...workToday, ...workYday];
  }
  if (urgent.length < cfg.split.urgent) {
    const urgentYday = await runQueries(cfg.urgentYesterday, "general");
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

  if (merged.length < TARGET) {
    const filler = await fetchSerperResults(cfg.queries.filler, "general");
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

function iconForCategory(category: string, raw?: RawNews): string {
  const c = `${category} ${raw?.title ?? ""}`.toLowerCase();
  if (c.includes("hr") || c.includes("採用") || c.includes("人材")) return "🤖";
  if (c.includes("security") || c.includes("サイバー") || c.includes("攻撃")) return "🛡️";
  if (c.includes("saas") || c.includes("クラウド")) return "☁️";
  if (c.includes("startup") || c.includes("スタートアップ") || c.includes("資金")) return "🚀";
  if (c.includes("it") || c.includes("dx") || c.includes("ai")) return "⚡";
  return "📰";
}

function buildFallbackDailyBrief(raw: RawNews[]): DailyBriefItem[] {
  return raw.slice(0, TARGET).map((item, i) => ({
    id: i + 1,
    category: item.category === "it" ? "IT / 採用・DX" : "Biz / 時事",
    title: item.title,
    summary: normalize(item.snippet || `${item.source}の記事`, 160),
    details: normalize(`${item.title}\n\n${item.snippet}`, 480),
    doyaWord: "「一次情報に寄せて、次の打ち手まで会話を前に進めましょう。」",
    jobImpact:
      item.category === "it"
        ? "IT採用を強化したい企業へ、要件定義と提示条件の見直しを提案する。"
        : "経済・規制の変化が大きい業界へ、採用計画の優先順位調整を提案する。",
    url: item.url,
    time: "本日",
    icon: iconForCategory("", item)
  }));
}

type LlmRow = Record<string, unknown>;

function sanitizeDailyBrief(items: unknown, raw: RawNews[]): DailyBriefItem[] {
  const allowedUrls = new Set(raw.map((r) => r.url));
  if (!Array.isArray(items)) return buildFallbackDailyBrief(raw);

  const urlToRaw = new Map(raw.map((r) => [r.url, r]));
  const seen = new Set<string>();

  const validated = items
    .slice(0, TARGET)
    .map((row): DailyBriefItem | null => {
      const record = row as LlmRow;
      const url = String(record["記事URL"] ?? record.url ?? "").trim();
      if (!url || !allowedUrls.has(url)) return null;
      if (seen.has(url)) return null;
      seen.add(url);

      const r = urlToRaw.get(url);
      const title =
        normalize(String(record.title ?? record["タイトル"] ?? ""), 200) || (r?.title ?? "");
      const summary = normalize(String(record.summary ?? record["一言要約"] ?? ""), 220);
      const details = normalize(String(record.details ?? record["事実"] ?? ""), 520);
      const doyaWord = normalize(String(record.doyaWord ?? record["ドヤ顔ワード"] ?? ""), 200);
      const impact = normalize(String(record["仕事への影響"] ?? ""), 120);
      const category = normalize(String(record.category ?? record["カテゴリ"] ?? "ビジネス"), 40);

      if (!title || !summary || !details || !doyaWord) return null;

      return {
        id: 0,
        category: category || (r?.category === "it" ? "IT / 採用・DX" : "Biz / 時事"),
        title,
        summary,
        details,
        doyaWord,
        jobImpact: impact || undefined,
        url,
        time: "本日",
        icon: iconForCategory(category, r)
      };
    })
    .filter((item): item is DailyBriefItem => item !== null);

  if (validated.length >= TARGET) {
    return validated.slice(0, TARGET).map((v, i) => ({ ...v, id: i + 1 }));
  }

  const fallback = buildFallbackDailyBrief(raw);
  const merged: DailyBriefItem[] = [...validated];
  for (const f of fallback) {
    if (merged.length >= TARGET) break;
    if (merged.some((m) => m.url === f.url)) continue;
    merged.push(f);
  }
  return merged.slice(0, TARGET).map((v, i) => ({ ...v, id: i + 1 }));
}

async function llmToDailyBrief(raw: RawNews[]): Promise<DailyBriefItem[]> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is missing");

  const candidates = raw
    .map(
      (item, i) =>
        `${i + 1}. title: ${item.title}\nsource: ${item.source}\ncategory: ${item.category}\nsnippet: ${item.snippet}\nurl: ${item.url}`
    )
    .join("\n\n");

  const prompt =
    "IT人材エージェントのCEO向けに、以下の最新ビジネスニュースを整理してください。\n" +
    "Serperで取得した候補だけを使い、URLは1文字も変えずにコピーすること。URLの捏造・使い回し禁止。\n" +
    "必ず5件。内訳は仕事向け3件（エンジニア採用・DX・AI）+ 時事2件（経済/行政/IT事件など）。\n" +
    "各件について次のキーでJSONを返すこと（キー名は厳守）:\n" +
    '- "category": 短い英語または日本語ラベル（例: HR Tech, IT Trend, Cyber Security）\n' +
    '- "title": 記事の見出しとして自然な1行（日本語）\n' +
    '- "summary": カード用の短い要約（2〜3文、200文字以内）\n' +
    '- "details": 背景と要点の詳細（4〜7文、500文字以内。具体名を可能な範囲で）\n' +
    '- "doyaWord": 商談で刺さる一言。必ず「」で囲った1文。\n' +
    '- "仕事への影響": エージェント視点で、どの業界のどんな担当者にどう提案するか（2文以内、100文字以内）\n' +
    '- "記事URL": 候補urlをそのまま\n' +
    "年収・給与のランキング話題は避ける。日経有料記事URLは使わない。\n" +
    '形式: {"items":[{...}, ...]} （itemsは必ず5件）\n' +
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
      temperature: 0.2,
      max_tokens: 4500,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? "";
  const parsed = extractJsonObject(text);
  return sanitizeDailyBrief(parsed?.items, raw);
}

export function dailyBriefToLineItems(items: DailyBriefItem[]): LineNewsItem[] {
  return items.map((item) => ({
    事実: normalize(`${item.title}\n${item.details}`, 380),
    一言要約: normalize(item.summary, 120),
    仕事への影響: normalize(item.jobImpact ?? item.summary, 100),
    記事URL: item.url
  }));
}

export async function generateDailyBriefItems(): Promise<DailyBriefItem[]> {
  const { today, yesterday } = jstDateStrings();
  const cfg = buildQueries(today, yesterday);
  const merged = await fetchMergedNews(cfg);
  const picked = pickFiveItems(merged, cfg);
  if (picked.length < TARGET) {
    throw new Error(`Serper結果が${TARGET}件に満たませんでした（${picked.length}件）`);
  }
  return llmToDailyBrief(picked);
}

/** LINE返信など従来形式 */
export async function generateNewsItems(): Promise<LineNewsItem[]> {
  const brief = await generateDailyBriefItems();
  return dailyBriefToLineItems(brief);
}

function toDailyBriefRow(item: DailyBriefItem, createdAt: string): DailyBriefRow {
  return {
    id: item.id,
    category: item.category,
    title: item.title,
    summary: item.summary,
    details: item.details,
    doya_word: item.doyaWord,
    job_impact: item.jobImpact ?? null,
    url: item.url,
    created_at: createdAt
  };
}

export async function persistDailyBrief(items: DailyBriefItem[]): Promise<void> {
  if (items.length !== TARGET) {
    throw new Error(`保存対象は${TARGET}件固定です（現在 ${items.length} 件）`);
  }
  const createdAt = new Date().toISOString();
  const rows = items.slice(0, TARGET).map((item, idx) =>
    toDailyBriefRow({ ...item, id: idx + 1 }, createdAt)
  );

  const supabase = getSupabaseClient();
  try {
    const { error } = await supabase
      .from("daily_briefs")
      .upsert(rows as never, { onConflict: "id" });

    if (error) {
      const diag = getSupabaseDiagnostics();
      console.error("[dailyBrief] supabase upsert error", {
        message: error.message,
        hint: error.hint,
        details: error.details,
        diagnostics: diag
      });
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }
  } catch (e) {
    const diag = getSupabaseDiagnostics();
    const message = e instanceof Error ? e.message : String(e);
    console.error("[dailyBrief] supabase upsert exception", {
      message,
      diagnostics: diag
    });
    throw new Error(`Supabase upsert exception: ${message}`);
  }
}

export async function loadPersistedDailyBrief(): Promise<DailyBriefItem[] | null> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from("daily_briefs")
      .select("id, category, title, summary, details, doya_word, job_impact, url, created_at")
      .order("created_at", { ascending: false })
      .limit(TARGET);

    if (error) {
      const diag = getSupabaseDiagnostics();
      console.error("[dailyBrief] supabase select error", {
        message: error.message,
        hint: error.hint,
        details: error.details,
        diagnostics: diag
      });
      throw new Error(`Supabase select failed: ${error.message}`);
    }
    if (!data?.length) {
      return null;
    }

    return (data as DailyBriefRow[])
      .sort((a, b) => a.id - b.id)
      .map((row) => ({
        id: row.id,
        category: row.category,
        title: row.title,
        summary: row.summary,
        details: row.details,
        doyaWord: row.doya_word,
        jobImpact: row.job_impact ?? undefined,
        url: row.url,
        time: "本日",
        icon: iconForCategory(row.category)
      }));
  } catch (e) {
    const diag = getSupabaseDiagnostics();
    const message = e instanceof Error ? e.message : String(e);
    console.error("[dailyBrief] supabase select exception", {
      message,
      diagnostics: diag
    });
    throw new Error(`Supabase select exception: ${message}`);
  }
}
