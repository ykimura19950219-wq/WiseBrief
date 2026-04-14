import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

export type GroundedNewsItem = {
  category: string;
  title: string;
  summary: string;
  details: string;
  doyaWord: string;
  jobImpact?: string;
  url: string;
};

type GroundedNewsPayload = {
  items?: Array<Partial<GroundedNewsItem>>;
};

function normalize(text: string, max = 300): string {
  const t = String(text ?? "").trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function parsePayload(text: string): GroundedNewsPayload | null {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  try {
    return JSON.parse(cleaned.slice(first, last + 1)) as GroundedNewsPayload;
  } catch {
    return null;
  }
}

function mockItems(): GroundedNewsItem[] {
  return [
    {
      category: "HR Tech",
      title: "生成AI面接評価の導入が拡大、採用担当は魅力訴求へシフト",
      summary: "一次評価の自動化が進み、人事はカルチャーフィットと口説き込みに集中する流れ。",
      details:
        "大手企業を中心に、初期スクリーニングで生成AIを使う運用が拡大。評価軸の標準化で選考速度が上がる一方、最終面談での魅力訴求力が採用成果を左右する。",
      doyaWord: "「評価の自動化が進むほど、採用で勝つのは“魅力を言語化できる会社”です。」",
      jobImpact: "採用難の業界へ、評価自動化とアトラクト設計をセット提案する。",
      url: "https://www.itmedia.co.jp/news/"
    },
    {
      category: "IT Trend",
      title: "業務自動化SaaSが自然言語フロー作成を標準搭載",
      summary: "現場主導の自動化が進み、情シスは開発より統制設計の比重が高まる。",
      details:
        "主要SaaSで自然言語から業務フローを生成する機能が一般化。部門ごとの導入は進むが、権限管理と監査ログの設計が不足すると運用負荷が急増する。",
      doyaWord: "「次の情シスは“作る人”より“統制を設計する人”が価値になります。」",
      jobImpact: "情報システム部門の採用で、ガバナンス設計経験を要件に加える提案が刺さる。",
      url: "https://news.yahoo.co.jp/"
    },
    {
      category: "Cyber Security",
      title: "AI生成フィッシングの巧妙化で防御体制の見直しが急務",
      summary: "文面の自然さが増し、従来の注意喚起だけでは防げない事例が増加。",
      details:
        "生成AIで作成された詐欺メールは文脈再現性が高く、人的判断に依存した防御は限界。検知AI導入と運用手順の標準化を同時に進める企業が増えている。",
      doyaWord: "「セキュリティは“壁”より“免疫”の設計思想が勝ちます。」",
      jobImpact: "セキュリティ人材採用では、運用設計と教育設計の両輪経験を訴求軸にする。",
      url: "https://www.go.jp/"
    },
    {
      category: "Startup",
      title: "資金調達局面でAI人材の採用競争が再加速",
      summary: "資金調達直後の開発組織拡張で、PMとAIエンジニアの同時採用が増える。",
      details:
        "事業拡張フェーズの企業で、プロダクト責任者と実装責任者を同時に採る動きが顕著。採用要件の曖昧さが長期化要因になり、先に職務定義を固める企業が有利。",
      doyaWord: "「調達後の採用はスピード戦、勝敗は要件定義の速さで決まります。」",
      jobImpact: "シリーズA/B企業へ、職務要件の先行設計を含む採用支援提案が有効。",
      url: "https://prtimes.jp/"
    },
    {
      category: "Policy",
      title: "DX関連施策の更新で自治体・民間の調達要件が変化",
      summary: "政策更新に合わせ、開発委託・内製化比率を見直す企業が増加。",
      details:
        "行政発表の更新により、プロジェクト要件でセキュリティと運用継続性の比重が上昇。ベンダー選定の視点が変わり、採用市場にも影響が出始めている。",
      doyaWord: "「政策の変化は採用要件を先に変える。ここを読めると提案が速いです。」",
      jobImpact: "公共案件を持つ企業へ、要件変化を踏まえた人員計画の再設計を提案する。",
      url: "https://www.digital.go.jp/"
    }
  ];
}

export async function generateGroundedNewsItems(profile?: {
  industry?: string;
  role?: string;
  occupation?: string;
  notes?: string;
}): Promise<GroundedNewsItem[]> {
  if (process.env.NODE_ENV === "development") {
    return mockItems();
  }

  const apiKey = process.env.GOOGLE_API_KEY ?? "";
  const configuredModel = (process.env.GOOGLE_MODEL ?? "").trim();
  const modelCandidates = Array.from(
    new Set(
      [configuredModel, "gemini-1.5-flash", "gemini-1.5-pro"].filter(
        (m): m is string => Boolean(m)
      )
    )
  );
  if (!apiKey) throw new Error("GOOGLE_API_KEY is missing");
  console.log("Using Key:", apiKey ? `${apiKey.slice(0, 5)}...` : "(missing)");

  const p = {
    industry: profile?.industry ?? "IT・採用支援",
    role: profile?.role ?? "経営者",
    occupation: profile?.occupation ?? "人材エージェント",
    notes: profile?.notes ?? "採用、DX、AI導入、セキュリティ、経営変化を重視"
  };

  const prompt =
    "あなたは日本のビジネスニュース編集者です。Google Search Groundingで最新Web情報を参照し、" +
    "ユーザープロファイルに最適化したニュースを5件返してください。\n" +
    `業界: ${p.industry}\n役割: ${p.role}\n職種: ${p.occupation}\n特記事項: ${p.notes}\n\n` +
    "要件:\n" +
    "- 今読む価値が高い順に5件\n" +
    "- 各件は category, title, summary, details, doyaWord, jobImpact, url を含める\n" +
    "- summary は2〜3文、detailsは4〜6文\n" +
    "- doyaWord は商談で使える1文（「」で囲う）\n" +
    "- url は実在URLを必ず入れる\n" +
    "- 出力はJSONのみ: {\"items\":[...]}";

  const genAI = new GoogleGenerativeAI(apiKey);
  let result:
    | Awaited<ReturnType<ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]>>
    | null = null;
  let lastError: unknown = null;

  for (const modelName of modelCandidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        // 最新仕様寄せ: googleSearch ツールを使用
        tools: [{ googleSearch: {} } as any]
      });
      result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: "application/json"
        }
      });
      console.log("[gemini-grounding] model_selected:", modelName);
      break;
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[gemini-grounding] model_failed: ${modelName}`, msg);
    }
  }

  if (!result) {
    const msg = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Gemini model resolution failed: ${msg}`);
  }

  const response = result.response;
  const payload = parsePayload(response.text());
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const normalized = items
    .slice(0, 5)
    .map((item): GroundedNewsItem | null => {
      const category = normalize(String(item.category ?? ""), 40);
      const title = normalize(String(item.title ?? ""), 180);
      const summary = normalize(String(item.summary ?? ""), 220);
      const details = normalize(String(item.details ?? ""), 520);
      const doyaWord = normalize(String(item.doyaWord ?? ""), 220);
      const jobImpact = normalize(String(item.jobImpact ?? ""), 140);
      const url = String(item.url ?? "").trim();
      if (!title || !summary || !details || !doyaWord || !url) return null;
      return { category, title, summary, details, doyaWord, jobImpact, url };
    })
    .filter((x): x is GroundedNewsItem => x !== null);

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sourceUrls = groundingChunks
    .map((chunk) => chunk.web?.uri)
    .filter((u): u is string => Boolean(u));
  console.log("[gemini-grounding] source_urls:", sourceUrls);
  console.log("[gemini-grounding] generated_count:", normalized.length);

  if (normalized.length < 5) {
    throw new Error(`Gemini grounding result is insufficient: ${normalized.length}/5`);
  }
  return normalized;
}
