"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BrainCircuit, BookOpen, CalendarDays, Cpu, Copy, FileText } from "lucide-react";

type NewsKey = "salesforce_ai" | "notion_ai" | "nvidia_ai_agents";

type NewsCardSpec = {
  key: NewsKey;
  title: string;
  bullets: [string, string, string];
  negotiationTalk: string;
};

function CopyButton({
  onCopy,
  ariaLabel
}: {
  onCopy: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        onCopy();
      }}
      className={[
        "inline-flex items-center justify-center rounded-full",
        "h-10 w-10",
        "transition hover:opacity-90",
        "bg-[#0a0a0a] border-[0.5px] border-[#D4AF37] text-[#D4AF37]",
        "backdrop-blur-sm"
      ].join(" ")}
    >
      <Copy size={18} strokeWidth={1} />
    </button>
  );
}

function WalletIllustration() {
  // 画像の代替（SVGで“高級名刺入れ”の雰囲気を出す）
  return (
    <svg aria-hidden="true" viewBox="0 0 320 120" className="h-full w-full">
      <defs>
        <linearGradient id="w_bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b0b0b" stopOpacity="1" />
          <stop offset="1" stopColor="#1a1a1a" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="w_gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D4AF37" stopOpacity="0.1" />
          <stop offset="0.5" stopColor="#D4AF37" stopOpacity="0.35" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.18" />
        </linearGradient>
      </defs>
      <rect width="320" height="120" rx="16" fill="url(#w_bg)" />
      <rect x="0" y="0" width="320" height="120" rx="16" fill="url(#w_gold)" opacity="0.55" />
      <rect x="66" y="26" width="188" height="70" rx="14" fill="#0a0a0a" opacity="0.85" stroke="#D4AF37" strokeOpacity="0.35" />
      <path d="M98 44H226" stroke="#D4AF37" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      <path d="M98 62H196" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="2" strokeLinecap="round" />
      <circle cx="250" cy="56" r="8" fill="#D4AF37" fillOpacity="0.15" />
    </svg>
  );
}

function ToolIllustration() {
  // 画像の代替（SVGで“AI営業ツール”っぽく）
  return (
    <svg aria-hidden="true" viewBox="0 0 320 120" className="h-full w-full">
      <defs>
        <linearGradient id="t_bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0b0b0b" stopOpacity="1" />
          <stop offset="1" stopColor="#111" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="t_cyan" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <rect width="320" height="120" rx="16" fill="url(#t_bg)" />
      <rect width="320" height="120" rx="16" fill="url(#t_cyan)" opacity="0.32" />

      <rect x="34" y="30" width="96" height="60" rx="14" fill="#0a0a0a" opacity="0.85" stroke="#D4AF37" strokeOpacity="0.32" />
      <path d="M55 52H109" stroke="#22d3ee" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      <path d="M55 68H91" stroke="#D4AF37" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />

      <rect x="150" y="30" width="136" height="36" rx="12" fill="#0a0a0a" opacity="0.75" stroke="#D4AF37" strokeOpacity="0.30" />
      <path d="M170 52H266" stroke="#22d3ee" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round" />
      <rect x="150" y="76" width="136" height="20" rx="10" fill="#0a0a0a" opacity="0.7" />
      <circle cx="178" cy="86" r="6" fill="#D4AF37" fillOpacity="0.18" />
      <path d="M194 86H250" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BooksIllustration() {
  // 画像の代替（SVGで書籍3冊並べ）
  return (
    <svg aria-hidden="true" viewBox="0 0 320 120" className="h-full w-full">
      <defs>
        <linearGradient id="b_bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a0a0a" stopOpacity="1" />
          <stop offset="1" stopColor="#111" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="b_gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D4AF37" stopOpacity="0.2" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect width="320" height="120" rx="16" fill="url(#b_bg)" />
      <rect width="320" height="120" rx="16" fill="url(#b_gold)" opacity="0.55" />

      <g>
        <rect x="60" y="24" width="70" height="84" rx="10" fill="#0a0a0a" stroke="#D4AF37" strokeOpacity="0.28" />
        <rect x="68" y="36" width="54" height="20" rx="6" fill="#D4AF37" fillOpacity="0.12" />
        <rect x="68" y="60" width="54" height="10" rx="5" fill="#ffffff" fillOpacity="0.08" />

        <rect x="145" y="16" width="76" height="92" rx="10" fill="#0a0a0a" stroke="#D4AF37" strokeOpacity="0.28" />
        <rect x="155" y="28" width="56" height="22" rx="7" fill="#22d3ee" fillOpacity="0.10" />
        <rect x="155" y="54" width="56" height="12" rx="6" fill="#ffffff" fillOpacity="0.07" />

        <rect x="234" y="24" width="58" height="84" rx="10" fill="#0a0a0a" stroke="#D4AF37" strokeOpacity="0.28" />
        <rect x="242" y="40" width="42" height="18" rx="6" fill="#8b5cf6" fillOpacity="0.10" />
        <rect x="242" y="62" width="42" height="10" rx="5" fill="#ffffff" fillOpacity="0.06" />
      </g>
    </svg>
  );
}

function SeminarIllustration() {
  // 画像の代替（SVGでセミナー案内）
  return (
    <svg aria-hidden="true" viewBox="0 0 320 120" className="h-full w-full">
      <defs>
        <linearGradient id="s_bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0a0a0a" stopOpacity="1" />
          <stop offset="1" stopColor="#101010" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="s_gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#D4AF37" stopOpacity="0.25" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      <rect width="320" height="120" rx="16" fill="url(#s_bg)" />
      <rect width="320" height="120" rx="16" fill="url(#s_gold)" opacity="0.55" />
      <rect x="56" y="30" width="208" height="64" rx="14" fill="#0a0a0a" opacity="0.82" stroke="#D4AF37" strokeOpacity="0.30" />
      <path d="M106 50H214" stroke="#D4AF37" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      <path d="M106 66H180" stroke="#ffffff" strokeOpacity="0.10" strokeWidth="2" strokeLinecap="round" />
      <circle cx="82" cy="58" r="12" fill="#D4AF37" fillOpacity="0.16" />
      <path d="M78 58H86" stroke="#D4AF37" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function buildNegotiationTalk(title: string, bullets: string[]) {
  return [
    `【${title}】`,
    "商談トーク（そのまま読めます）",
    ...bullets.map((b, i) => `${i + 1}. ${b}`),
    "",
    "この一言で、相手の意思決定を前に進められます。",
  ].join("\n");
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-black/70 backdrop-blur-sm border border-[#D4AF37]/30 px-4 py-3 text-sm font-extrabold text-[#D4AF37] shadow-[0_20px_80px_rgba(0,0,0,0.7)]">
      {message}
    </div>
  );
}

export default function WiseBriefAppImage2({ dateKey: _dateKey }: { dateKey: string }) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const news: NewsCardSpec[] = useMemo(() => {
    const s_bullets: [string, string, string] = [
      "成約率を“88%”で提示して、感覚ではなく確率で意思決定させる。",
      "次アクションの優先度を予測モデルが即座に設計する。",
      "CRMの反応ログから学習し、打ち返しの精度が毎回上がる。",
    ];

    const n_bullets: [string, string, string] = [
      "議事録を要約し、次回までのToDo・担当・優先度を自動で切り出す。",
      "抜け漏れを潰して、商談の“次の一手”を会話で止めない。",
      "チームの実行ログで成果を追えるので、改善サイクルが回る。",
    ];

    const v_bullets: [string, string, string] = [
      "法人向けにエージェント構築を簡素化し、提案の“型”を素早く作る。",
      "数秒で営業戦略のたたき台を出せるので、商談の初動が速い。",
      "PoC設計までの導線を短縮し、実行フェーズへ進めやすい。",
    ];

    return [
      {
        key: "salesforce_ai",
        title: "Salesforce、成約率を88%予測する営業特化AIを日本先行公開",
        bullets: s_bullets,
        negotiationTalk: buildNegotiationTalk(
          "Salesforce、成約率を88%予測する営業特化AIを日本先行公開",
          s_bullets
        )
      },
      {
        key: "notion_ai",
        title: "Notion AI、議事録からネクストアクションを全自動生成する神アプデ",
        bullets: n_bullets,
        negotiationTalk: buildNegotiationTalk(
          "Notion AI、議事録からネクストアクションを全自動生成する神アプデ",
          n_bullets
        )
      },
      {
        key: "nvidia_ai_agents",
        title: "NVIDIA、法人向けAIエージェント構築ツールを発表。営業戦略を数秒で立案",
        bullets: v_bullets,
        negotiationTalk: buildNegotiationTalk(
          "NVIDIA、法人向けAIエージェント構築ツールを発表。営業戦略を数秒で立案",
          v_bullets
        )
      }
    ];
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto p-8 grid grid-cols-12 gap-6">
      {/* Left */}
      <aside className="col-span-3">
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="rounded-xl border border-[#D4AF37]/30 bg-black/40 backdrop-blur-md p-6 mb-6"
        >
          <div className="h-[92px]">
            <WalletIllustration />
          </div>
          <div className="mt-4 text-[#D4AF37] text-[16px] font-extrabold leading-tight">
            VIP限定: 高級名刺入れプレゼント
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="rounded-xl border border-[#D4AF37]/30 bg-black/40 backdrop-blur-md p-6 mb-6"
        >
          <div className="flex items-center gap-2 text-[#D4AF37] font-extrabold">
            <Cpu size={18} strokeWidth={2.25} />
            <div className="text-[14px]">AI営業ツール</div>
          </div>
          <div className="mt-3 h-[82px]">
            <ToolIllustration />
          </div>
          <div className="mt-4 text-[#D4AF37] text-[16px] font-extrabold leading-tight">AI営業ツール無料体験</div>
        </motion.div>
      </aside>

      {/* Center */}
      <main className="col-span-6">
        {news.map((n) => {
          const Icon = n.key === "salesforce_ai" ? FileText : n.key === "notion_ai" ? BrainCircuit : Cpu;
          return (
            <motion.article
              key={n.key}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative rounded-xl border border-[#D4AF37]/30 bg-black/40 backdrop-blur-md p-6 mb-6"
            >
              <div className="absolute top-6 left-6 text-[#D4AF37]">
                <Icon size={20} strokeWidth={2.25} />
              </div>

              <div className="pl-10 pr-12">
                <div className="text-[#D4AF37] text-[18px] font-extrabold leading-tight">{n.title}</div>
                <ul className="mt-4 list-disc pl-5 text-white/90 text-[13px] font-semibold space-y-1">
                  {n.bullets.map((b, i) => (
                    <li key={`${n.key}-bullet-${i}`}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className="absolute bottom-6 right-6">
                <CopyButton
                  ariaLabel="商談トークをコピー"
                  onCopy={async () => {
                    try {
                      await navigator.clipboard.writeText(n.negotiationTalk);
                      setToast("商談トークをクリップボードにコピーしました");
                    } catch {
                      setToast("コピーに失敗しました");
                    }
                  }}
                />
              </div>
            </motion.article>
          );
        })}
      </main>

      {/* Right */}
      <aside className="col-span-3">
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="rounded-xl border border-[#D4AF37]/30 bg-black/40 backdrop-blur-md p-6 mb-6"
        >
          <div className="flex items-center gap-2 text-[#D4AF37] font-extrabold">
            <BookOpen size={18} strokeWidth={2.25} />
            <div className="text-[14px]">書籍</div>
          </div>
          <div className="mt-2 text-[#D4AF37] text-[16px] font-extrabold leading-tight">営業スキル向上書籍 5選</div>
          <div className="mt-3 h-[82px]">
            <BooksIllustration />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -4 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="rounded-xl border border-[#D4AF37]/30 bg-black/40 backdrop-blur-md p-6 mb-6"
        >
          <div className="flex items-center gap-2 text-[#D4AF37] font-extrabold">
            <CalendarDays size={18} strokeWidth={2.25} />
            <div className="text-[14px]">最新AIセミナー</div>
          </div>
          <div className="mt-2 text-[#D4AF37] text-[16px] font-extrabold leading-tight">最新AIセミナーご案内</div>
          <div className="mt-3 h-[82px]">
            <SeminarIllustration />
          </div>
        </motion.div>
      </aside>

      {toast ? <Toast message={toast} /> : null}
    </div>
  );
}

