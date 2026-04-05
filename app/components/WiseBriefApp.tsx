"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Copy, ExternalLink, Info, Lightbulb, X } from "lucide-react";
import type { WiseBriefCategoryKey, WiseBriefItem } from "@/lib/wisebrief";
import WiseBriefAppImage2 from "./WiseBriefAppImage2";

type VipCardSpec = {
  id: string;
  badge: string;
  title: string;
  copyText: string;
  accent: string;
};

type ToolCardSpec = {
  name: string;
  desc: string;
  icon: "N" | "L" | "P";
};

function display(text: string) {
  // スクショ再現優先のため、英字は落とさない（表示最適化だけ）。
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function stripPrefixedLabel(text: string) {
  // LLM出力に含まれうる先頭の見出し（「○○：」）を削る
  return (text ?? "")
    .replace(/^(背景|現状|今後予測|今後|ニュース概要|メリット（凄さ）|商談での刺し方（活用法）|用語解説|ニュースの核心|ドヤ顔ワード)[:：]\s*/u, "")
    .trim();
}

function pickBullets(item: WiseBriefItem) {
  // 3つの弾丸は、あれば「ドヤ顔ワード」、なければ「メリット/刺し方/用語解説」側を短く表示
  const doyaWords = Array.isArray(item.doyaWords) && item.doyaWords.length ? item.doyaWords : null;
  const trunc = (s: string, max: number) => {
    const t = s.trim();
    if (!t) return "";
    if (t.length <= max) return t;
    return t.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
  };

  if (doyaWords) {
    return doyaWords
      .slice(0, 3)
      .map((w) => trunc(String(w ?? "").trim(), 28))
      .filter(Boolean);
  }

  // 後方互換：LLM由来の「背景・現状・今後予測」を弾丸に寄せる
  const b1 = stripPrefixedLabel(item.background);
  const b2 = stripPrefixedLabel(item.current);
  const b3 = stripPrefixedLabel(item.forecast);
  return [trunc(b1, 28), trunc(b2, 28), trunc(b3, 28)].filter(Boolean);
}

function getDoyaWords(item: WiseBriefItem) {
  if (Array.isArray(item.doyaWords) && item.doyaWords.length) return item.doyaWords.slice(0, 3);
  return item.doyaWord ? [item.doyaWord].filter(Boolean) : [];
}

function buildNegotiationTalk(item: WiseBriefItem) {
  const doya = getDoyaWords(item);
  const doyaText = doya.length ? doya[0] : item.doyaWord;
  return [
    "商談トーク",
    `ニュースの核心：${display(item.summary)}`,
    `メリット（凄さ）：${display(item.background)}`,
    `ドヤ顔ワード：${doyaText ? `「${display(doyaText)}」` : ""}`,
    `商談での刺し方（活用法）：${display(item.current)}`,
    `用語解説：${display(item.forecast)}`,
    "",
    "この情報で“次の一手”まで会話を前進させてください。",
  ].join("\n");
}

function ThumbPlaceholder({ seed, accent }: { seed: string; accent: string }) {
  const safeSeed = Array.from(seed).reduce((h, ch) => ((h * 31 + ch.charCodeAt(0)) >>> 0), 0).toString(16);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id={`lg-${safeSeed}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.60" />
          <stop offset="0.55" stopColor="#8b5cf6" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0.34" />
        </linearGradient>
        <filter id={`n-${safeSeed}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.15  0 0 0 0 0.15  0 0 0 0 0.2  0 0 0 .8 0"
          />
        </filter>
      </defs>
      <rect width="1600" height="900" fill="#0a0a0a" />
      <rect width="1600" height="900" fill={`url(#lg-${safeSeed})`} opacity="0.18" />
      <rect width="1600" height="900" filter={`url(#n-${safeSeed})`} opacity="0.08" />

      {/* ミニマルなグロー（派手な図解は避ける） */}
      <rect x="1100" y="120" width="380" height="140" rx="70" fill={accent} fillOpacity="0.14" />
      <rect x="260" y="520" width="520" height="190" rx="95" fill="#8b5cf6" fillOpacity="0.08" />
      <rect x="720" y="690" width="620" height="120" rx="60" fill="#fbbf24" fillOpacity="0.06" />
    </svg>
  );
}

function VipIllustrationPlaceholder({ accent }: { accent: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 140" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="vipg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#8b5cf6" stopOpacity="0.25" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* 高級感のある抽象イラスト（人物っぽいシルエット + ゴールドのUI） */}
      <rect width="320" height="140" rx="18" fill="#0d0d0d" />
      <rect width="320" height="140" rx="18" fill="url(#vipg)" opacity="0.40" />

      {/* 背景のグロー */}
      <circle cx="70" cy="55" r="58" fill={accent} fillOpacity="0.14" />
      <circle cx="230" cy="95" r="64" fill="#8b5cf6" fillOpacity="0.10" />
      <circle cx="260" cy="40" r="34" fill="#fbbf24" fillOpacity="0.12" />

      {/* ゴールドのUIリング */}
      <g opacity="0.85">
        <circle cx="265" cy="42" r="22" fill="none" stroke={accent} strokeOpacity="0.65" strokeWidth="3" />
        <rect x="255" y="36" width="20" height="12" rx="3" fill={accent} fillOpacity="0.16" />
        <path d="M259 44H271" stroke={accent} strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* 人物っぽいシルエット（シンプル） */}
      <g opacity="0.95">
        <circle cx="205" cy="52" r="14" fill="#e5e7eb" fillOpacity="0.12" />
        <path
          d="M185 88 C 190 74, 220 74, 225 88 L 232 114 L 178 114 Z"
          fill="#ffffff"
          fillOpacity="0.06"
        />
        {/* 手に持つタブレット */}
        <rect x="168" y="66" width="70" height="40" rx="10" fill={accent} fillOpacity="0.14" stroke={accent} strokeOpacity="0.45" strokeWidth="2" />
        <path d="M178 78H228" stroke={accent} strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        <path d="M178 88H212" stroke="#8b5cf6" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* 補助ライン（未来感） */}
      <path d="M35 95 C 85 65, 125 65, 170 90" stroke={accent} strokeWidth="3" fill="none" opacity="0.25" />
    </svg>
  );
}

function LoadingSkeletonLine({ w }: { w: string }) {
  return <div className="h-4 rounded bg-white/10 animate-pulse" style={{ width: w }} />;
}

function SkeletonCard({ kind }: { kind: "vip" | "news" | "tool" }) {
  const isVip = kind === "vip";
  const border = kind === "tool" ? "border-[0.5px] border-[#D4AF37]" : "border border-white/5";
  return (
    <div className={isVip ? "rounded-[22px] border border-white/5 bg-[#0d0d0d] overflow-hidden" : `rounded-[22px] ${border} bg-[#111111] overflow-hidden`}>
      {kind !== "tool" ? (
        <div className={isVip ? "h-[92px] bg-gradient-to-r from-[#D4AF37]/20 via-[#22d3ee]/10 to-[#8b5cf6]/15" : "aspect-[16/9] bg-[#0a0a0a]"} />
      ) : (
        <div className="h-[78px] bg-[#0a0a0a]" />
      )}
      <div className="p-4">
        <LoadingSkeletonLine w="70%" />
        <div className="mt-2 space-y-2">
          <LoadingSkeletonLine w="92%" />
          <LoadingSkeletonLine w="86%" />
        </div>
        <div className="mt-3 space-y-2">
          <LoadingSkeletonLine w="60%" />
          <LoadingSkeletonLine w="80%" />
          <LoadingSkeletonLine w="55%" />
        </div>
      </div>
      <div className="h-4" />
    </div>
  );
}

const feedVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } }
};

const feedContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 }
  }
};

function CopyButton({
  gold = true,
  onClick,
  ariaLabel
}: {
  gold?: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={[
        "inline-flex items-center justify-center rounded-full",
        "h-10 w-10",
        "transition hover:opacity-90",
        gold
          ? "bg-[#0a0a0a] border-[0.5px] border-[#D4AF37] text-[#D4AF37]"
          : "bg-white/5 border border-white/10 text-white/80"
      ].join(" ")}
    >
      <Copy size={18} strokeWidth={1} />
    </button>
  );
}

export default function WiseBriefApp({ dateKey: _dateKey }: { dateKey: string }) {
  // SSRと初回クライアント描画の差分でHydration Errorが出るため、
  // マウント後にのみ表示する。
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // API（Tavily）に依存しないダミー表示（スクショ寄せ＆「金が取れる画面」優先）
  const items: WiseBriefItem[] = useMemo(
    () => [
      {
        key: "market_trends",
        label: "人材市場トレンド",
        newsTitle: "Salesforce、成約率を88%予測する営業特化AIを日本先行公開",
        summary: "見込み客ごとの反応確率をリアルタイムに推定し、次の一手（提案文・連絡タイミング・打ち返し）まで営業プロセスを最適化します。",
        background: "従来の属人的な推定では、商談の初動で差がつきやすいのが課題でした。AIが成約確率を“数字”で示せることで、意思決定が早まります。",
        current: "成約率予測を軸に、相手の状況に合わせた提案の組み替えが可能になり、営業の手戻りを抑えられるようになりました。",
        forecast: "今後は予測だけでなく、打ち手の自動生成と改善ループが主流になり、営業チームは再現性で勝負する流れが強まります。",
        doyaWord: "この“88%”があるから、商談は感覚ではなく再現性で進められます。",
        doyaWords: [
          "成約率は数字で語るべきです。相手の意思決定を“確率”で固めます。",
          "この予測があるから、商談は手戻りゼロで設計できます。",
          "打ち手は感覚ではなく“88%”で説明します。"
        ],
        youtubeUrl: "https://www.youtube.com/results?search_query=Salesforce+AI+sales",
        sources: [{ title: "Salesforce（ダミー出典）", url: "https://www.salesforce.com/" }]
      },
      {
        key: "ai_tools",
        label: "最新の人工知能ツール",
        newsTitle: "Notion AI、議事録からネクストアクションを全自動生成する神アプデ",
        summary: "会議内容を整理するだけでなく、次回までのToDo・担当・優先度まで落とし込み、営業の“次の動き”を自動で生成します。",
        background: "議事録が増えるほど、次のアクションが曖昧になり、実行が遅れる問題が顕在化していました。",
        current: "議事録から次アクションを自動生成し、抜け漏れを減らせるようになりました。チーム全体で実行スピードが揃います。",
        forecast: "今後は“文章化”から“運用”へ進化し、商談の成果は会話ではなく実行ログで評価される方向が強まります。",
        doyaWord: "議事録で終わらせない。次の一手まで自動で出せるのが強いです。",
        doyaWords: [
          "議事録から次アクションまで一気通貫。会話を止めません。",
          "ToDoの粒度を自動で揃え、進捗を見える化します。",
          "次回アポの打ち手まで相手に提示できます。"
        ],
        youtubeUrl: "https://www.youtube.com/results?search_query=Notion+AI+next+actions",
        sources: [{ title: "Notion（ダミー出典）", url: "https://www.notion.so/" }]
      },
      {
        key: "startup_funding",
        label: "スタートアップ資金調達",
        newsTitle: "NVIDIA、法人向けAIエージェント構築ツールを発表。営業戦略を数秒で立案",
        summary: "法人向けにエージェント構築を簡素化し、提案の“型”を素早く生成。営業戦略立案を短時間で回せるようにします。",
        background: "AIはあるのに、現場で使える形に落とすまでに時間がかかるのがボトルネックでした。",
        current: "法人向けの構築支援が進み、営業戦略のたたき台を短時間で作れる流れが加速しています。",
        forecast: "今後はエージェントが“提案”だけでなく“実行”へ繋がり、商談のスピードが競争軸になります。",
        doyaWord: "初動の速さが勝因です。数秒で戦略を立てて、主導権を握ります。",
        doyaWords: [
          "営業戦略を“数秒”で立てる。初動の速さが勝因です。",
          "エージェント構築を前提に、提案の優先順位を即決します。",
          "PoC設計も同時に出せるので、商談が前進します。"
        ],
        youtubeUrl: "https://www.youtube.com/results?search_query=NVIDIA+AI+agent+enterprise",
        sources: [{ title: "NVIDIA（ダミー出典）", url: "https://www.nvidia.com/" }]
      }
    ],
    []
  );

  const loading = false;
  const [activeItemKey, setActiveItemKey] = useState<WiseBriefCategoryKey | null>(null);

  const vipLeft: VipCardSpec = {
    id: "vip-left",
    badge: "(VIP限定)",
    title: "AI商談アシスタントを今すぐ体験",
    copyText: "AI商談アシスタントを今すぐ体験（VIP限定）",
    accent: "#D4AF37"
  };

  const vipRight: VipCardSpec = {
    id: "vip-right",
    badge: "(VIP限定)",
    title: "AI商談アシスタントを今すぐ体験",
    copyText: "AI商談アシスタントを今すぐ体験（VIP限定）",
    accent: "#D4AF37"
  };

  const featureAffiliateUrl = "/";

  const tools: ToolCardSpec[] = [
    { name: "Notion AI", desc: "議事録作成を爆速にする最強の相棒", icon: "N" },
    { name: "Linear", desc: "エンジニアチームの進捗を可視化する", icon: "L" },
    { name: "Perplexity", desc: "AIが答える次世代の検索エンジン", icon: "P" }
  ];

  const newsItems = useMemo(() => items.slice(0, 3), [items]);
  const activeItem = activeItemKey ? items.find((it) => it.key === activeItemKey) ?? null : null;

  const footer = <div className="py-4 text-[12px] font-semibold text-white/30">WiseBrief © 2026</div>;

  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 失敗してもUIは崩さない
      return false;
    }
  }

  if (!mounted) return null;

  // image_2.png の完全再現用（既存実装は捨て、見た目は委譲する）
  return <WiseBriefAppImage2 dateKey={_dateKey} />;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 都市の夜景バックグラウンド（Unsplash） */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=2000&q=80')"
        }}
      />
      {/* 視認性確保 */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_1fr_250px] lg:gap-6 items-start">
          {/* Left Column: VIP/広告 */}
          <aside className="space-y-4">
            <motion.div variants={feedVariants} initial="hidden" animate="show">
              <section
                role="button"
                tabIndex={0}
                onClick={() => {
                  window.location.href = featureAffiliateUrl;
                }}
                className="relative overflow-hidden rounded-xl bg-black/40 backdrop-blur-md border border-[#D4AF37]/30"
              >
                <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(212,175,55,0.22),transparent_35%)]" />
                <div className="relative px-4 py-4">
                  <div className="text-[13px] font-extrabold text-white/90">{vipLeft.badge}</div>
                  <div className="mt-1 text-[15px] font-extrabold leading-tight text-[#D4AF37]">{vipLeft.title}</div>
                  <div className="mt-3 h-[110px]">
                    <VipIllustrationPlaceholder accent={vipLeft.accent} />
                  </div>
                </div>
              </section>
            </motion.div>

            <div className="text-[13px] font-semibold text-white/45">広告スペース</div>
            <div className="space-y-3">
              {tools.map((t) => (
                <div
                  key={t.name}
                  role="button"
                  tabIndex={0}
                  className="rounded-xl bg-black/40 backdrop-blur-md border border-[#D4AF37]/30 overflow-hidden"
                >
                  <div className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 border border-[#D4AF37]/30 text-[#D4AF37] text-[18px] font-extrabold">
                        {t.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-extrabold text-[#D4AF37]">{display(t.name)}</div>
                        <div className="text-[12px] font-semibold text-white/70 leading-relaxed">{display(t.desc)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Center Column: ニュースフィード */}
          <main className="flex-1 space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[14px] font-semibold text-white/45">ビジネスAIニュース</div>
                <div className="mt-1 text-[20px] font-extrabold leading-tight tracking-tight text-[#D4AF37]">
                  本日の必修ニュース
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {newsItems.map((n) => {
                const bullets = pickBullets(n);
                return (
                  <motion.article
                    key={n.key}
                    variants={feedVariants}
                    initial="hidden"
                    animate="show"
                    className="relative overflow-hidden rounded-xl bg-black/40 backdrop-blur-md border border-[#D4AF37]/30"
                    onClick={() => setActiveItemKey(n.key)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="h-[78px] overflow-hidden">
                      <ThumbPlaceholder
                        seed={n.key}
                        accent={n.key === "market_trends" ? "#22d3ee" : n.key === "ai_tools" ? "#8b5cf6" : "#fbbf24"}
                      />
                    </div>

                    <div className="p-4">
                      <div
                        className="text-[14px] font-extrabold leading-[1.25] text-[#D4AF37] overflow-hidden"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical"
                        }}
                      >
                        {display(n.newsTitle)}
                      </div>

                      <ul className="mt-2 space-y-1.5 text-[12px] font-semibold text-white/80">
                        {bullets.map((b) => (
                          <li key={b} className="flex gap-2">
                            <span className="text-[#D4AF37]">・</span>
                            <span className="min-w-0">{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="absolute bottom-3 right-3">
                      <CopyButton
                        ariaLabel="商談トークをコピー"
                        onClick={() => {
                          const talk = buildNegotiationTalk(n);
                          void copyText(talk).finally(() =>
                            showToast("商談トークをクリップボードにコピーしました")
                          );
                        }}
                      />
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </main>

          {/* Right Column: 関連書籍/セミナー案内 */}
          <aside className="space-y-4">
            <div className="text-[13px] font-semibold text-white/45">関連書籍/セミナー案内</div>

            <div className="space-y-3">
              <div className="rounded-xl bg-black/40 backdrop-blur-md border border-[#D4AF37]/30 overflow-hidden">
                <div className="px-4 py-4">
                  <div className="text-[#D4AF37] text-[14px] font-extrabold">AI商談の勝ち筋（ガイド）</div>
                  <div className="mt-2 text-white/75 text-[12.5px] font-semibold leading-relaxed">
                    3分で要点→ドヤ顔→次の一手まで。テンプレをそのまま商談に持ち込めます。
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-black/40 backdrop-blur-md border border-[#D4AF37]/30 overflow-hidden">
                <div className="px-4 py-4">
                  <div className="text-[#D4AF37] text-[14px] font-extrabold">“成約率88%”の設計会（ミニセミナー）</div>
                  <div className="mt-2 text-white/75 text-[12.5px] font-semibold leading-relaxed">
                    予測を話の軸にして、商談の手戻りを潰す考え方を学べます（ダミー）。
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-black/40 backdrop-blur-md border border-[#D4AF37]/30 px-4 py-4">
              <div className="text-[13px] font-extrabold text-[#D4AF37]">今日のおすすめ</div>
              <div className="mt-2 text-white/75 text-[12.5px] font-semibold leading-relaxed">
                相手の意思決定を「確率」で固める一言から始めましょう。
              </div>
              <button
                type="button"
                className="mt-3 w-full rounded-lg bg-[#D4AF37] px-4 py-3 text-sm font-extrabold text-black transition hover:brightness-110"
                onClick={() => {
                  // ダミー導線
                }}
              >
                セミナー枠を見る（ダミー）
              </button>
            </div>
          </aside>
        </div>

        {footer}
      </div>

      {/* トースト通知 */}
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-black/70 backdrop-blur-md border border-[#D4AF37]/30 px-4 py-3 text-sm font-extrabold text-[#D4AF37] shadow-[0_20px_80px_rgba(0,0,0,0.7)]">
          {toast}
        </div>
      ) : null}

      {/* フルスクリーン詳細モーダル */}
      {activeItem ? (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur px-4 py-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveItemKey(null);
          }}
        >
          <motion.div
            className="mx-auto h-full w-full max-w-5xl rounded-[28px] bg-[#0d0d0d] shadow-[0_60px_200px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="relative h-[220px] overflow-hidden">
              <div className="absolute inset-0">
                <ThumbPlaceholder
                  seed={`modal-${activeItem?.key ?? ""}`}
                  accent={
                    activeItem?.key === "market_trends"
                      ? "#22d3ee"
                      : activeItem?.key === "ai_tools"
                        ? "#8b5cf6"
                        : "#fbbf24"
                  }
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

              <div className="relative px-7 py-6">
                <div className="inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-black/35 px-4 py-2 text-xs font-semibold text-white/75">
                  <Info size={14} strokeWidth={1} />
                  詳細（要点）
                </div>
              </div>

              <div className="absolute right-5 top-5">
                <button
                  type="button"
                  aria-label="閉じる"
                  onClick={() => setActiveItemKey(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] bg-white/5 text-white/90 border border-white/10 transition hover:bg-white/10"
                >
                  <X size={18} strokeWidth={1} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-6">
              <div className="text-[22px] font-extrabold tracking-tight text-white leading-tight">
                {display(activeItem!.newsTitle)}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[22px] border border-white/10 bg-[#111111] p-5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-white/90">
                    <Info size={18} strokeWidth={1} />
                    ニュースの核心
                  </div>
                  <div className="mt-3 text-sm leading-relaxed text-white/85 whitespace-pre-line">
                    {display(activeItem!.summary)}
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-[#111111] p-5">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-[#D4AF37]">
                    <Lightbulb size={18} strokeWidth={1} />
                    ドヤ顔ワード
                  </div>
                  <div className="mt-3 space-y-2">
                    {(() => {
                      const doyaWords = activeItem!.doyaWords;
                      const safeWords = (doyaWords ?? []) as string[];
                      const doyaList: string[] = safeWords.length ? safeWords : [activeItem!.doyaWord];
                      return doyaList.slice(0, 3).map((w, i) => (
                        <div
                          key={`${activeItem!.key}-doya-${i}`}
                          className="text-[18px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-amber-200 to-[#D4AF37] drop-shadow-[0_0_18px_rgba(212,175,55,0.25)]"
                        >
                          「{display(w)}」
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-[22px] border border-white/10 bg-[#111111] p-5">
                  <div className="text-sm font-extrabold text-white/90">メリット（凄さ）</div>
                  <div className="mt-3 text-sm leading-relaxed text-white/85">{display(activeItem!.background)}</div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-[#111111] p-5">
                  <div className="text-sm font-extrabold text-white/90">商談での刺し方（活用法）</div>
                  <div className="mt-3 text-sm leading-relaxed text-white/85">{display(activeItem!.current)}</div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-[#111111] p-5">
                  <div className="text-sm font-extrabold text-white/90">用語解説</div>
                  <div className="mt-3 text-sm leading-relaxed text-white/85">{display(activeItem!.forecast)}</div>
                </div>
              </div>

              <div className="mt-6 rounded-[22px] border border-white/10 bg-[#111111] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-extrabold text-white/90">出典</div>
                  <a
                    href={activeItem!.sources[0]?.url ?? activeItem!.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-white/5 px-4 py-2 text-xs font-extrabold text-white/90 transition hover:bg-white/10"
                  >
                    <ExternalLink size={16} strokeWidth={1} />
                    開く
                  </a>
                </div>

                <div className="mt-4 space-y-2">
                  {activeItem!.sources.slice(0, 3).map((s, i) => (
                    <a
                      key={`${s.url ?? i}`}
                      href={s.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-[16px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/85 hover:bg-white/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 truncate font-semibold">{display(s.title ?? "出典")}</div>
                        <div className="text-white/55">開く</div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}

