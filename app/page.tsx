"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  BrainCircuit,
  Cpu,
  Copy,
  FileText,
  Search,
  Bell,
  Play
} from "lucide-react";

type ToastKind = "success" | "error";

function CopyButton({
  payload,
  label,
  onCopied,
  onError
}: {
  payload: string;
  label: string;
  onCopied: () => void;
  onError: () => void;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      disabled={pending}
      onClick={async (e) => {
        e.stopPropagation();
        setPending(true);
        try {
          await navigator.clipboard.writeText(payload);
          onCopied();
        } catch {
          onError();
        } finally {
          setPending(false);
        }
      }}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#F8F9FA] text-[#D4AF37] font-bold text-sm border border-gray-200 hover:bg-[#D4AF37] hover:text-white transition-all"
    >
      <Copy size={16} strokeWidth={1.5} />
    </button>
  );
}

export default function WiseBrief() {
  const [toast, setToast] = useState<{ kind: ToastKind; msg: string } | null>(null);

  const showToast = (kind: ToastKind, msg: string) => {
    setToast({ kind, msg });
    window.setTimeout(() => setToast(null), 2200);
  };

  const news = useMemo(() => {
    const sBullets = [
      "成約率は数字で語るべきです。相手の意思決定を“確率”で固めます。",
      "この予測があるから、商談は手戻りゼロで設計できます。",
      "打ち手は感覚ではなく“88%”で説明します。"
    ];
    const nBullets = [
      "議事録から次アクションまで一気通貫。会話を止めません。",
      "ToDoの粒度を自動で揃え、進捗を見える化します。",
      "次回アポの打ち手まで相手に軽手に提示できます。"
    ];
    const vBullets = [
      "営業戦略を“数秒”で立てる。初動の速さが武器です。",
      "エージェント構築を前提に、提案の優先順位を即決します。",
      "PoC設計も同時に出せるので、商談が前進します。"
    ];

    const buildPayload = (title: string, bullets: string[]) =>
      `【${title}】\n\n商談で使えるトーク\n${bullets.map((b) => `- ${b}`).join("\n")}`;

    return [
      {
        id: "salesforce",
        icon: BrainCircuit,
        companyIcon: BrainCircuit,
        title: "Salesforce",
        headline: "成約率を88%予測する営業特化AIを日本先行公開",
        bullets: sBullets,
        payload: buildPayload("Salesforce AI", sBullets)
      },
      {
        id: "notion",
        icon: FileText,
        companyIcon: FileText,
        title: "Notion AI",
        headline: "議事録からネクストアクションを全自動生成する神アプデ",
        bullets: nBullets,
        payload: buildPayload("Notion AI", nBullets)
      },
      {
        id: "nvidia",
        icon: Cpu,
        companyIcon: Cpu,
        title: "NVIDIA",
        headline: "法人向けAIエージェント構築ツールを発表。営業戦略を数秒で立案",
        bullets: vBullets,
        payload: buildPayload("NVIDIA", vBullets)
      }
    ] as const;
  }, []);

  // CEO素材（ユーザー提供）
  const vipImg = "/ceo_vip.png";
  const toolImg = "/ceo_tool.png";
  const videoImg = "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400";
  const books = [
    {
      title: "『チャレンジャー・セールス・モデル』",
      img: "https://m.media-amazon.com/images/I/71uK-x4zUoL._AC_UF1000,1000_QL80_.jpg"
    },
    {
      title: "『隠れたキーマンを探せ！』",
      img: "https://m.media-amazon.com/images/I/81BwA2y3NCL._AC_UF1000,1000_QL80_.jpg"
    }
  ];

  return (
    <div className="min-h-screen w-full font-sans bg-[#F8F9FA] text-[#1A1C1E] overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 w-full py-4 px-8 bg-white/80 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="text-[#D4AF37] text-2xl font-black leading-none">WiseBrief</div>
          <div className="flex items-center gap-5">
            <Search className="w-5 h-5 text-gray-500 cursor-pointer hover:text-[#1A1C1E] transition-colors" />
            <Bell className="w-5 h-5 text-gray-500 cursor-pointer hover:text-[#1A1C1E] transition-colors" />
            <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-white font-extrabold text-xs shadow-sm">
              CEO
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto pt-28 pb-10 px-6 grid grid-cols-12 gap-8 items-start relative z-10">
        {/* Left: VIP */}
        <aside className="col-span-3">
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 mb-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-[#D4AF37] font-extrabold mb-4">
              <Award size={18} />
              <span className="text-sm">VIP Selection</span>
            </div>

            <div className="aspect-[4/3] w-full rounded-xl overflow-hidden mb-4 border border-gray-100 bg-zinc-50">
              <img src={vipImg} alt="高級名刺入れ" className="w-full h-full object-cover" />
            </div>

            <div className="mt-4 text-[#D4AF37] text-lg font-extrabold">高級名刺入れプレゼント</div>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 mb-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-[#D4AF37] font-extrabold mb-2">
              <Cpu size={18} />
              <span className="text-sm">AI営業ツール無料体験</span>
            </div>

            <div className="aspect-[16/9] w-full rounded-xl overflow-hidden mb-4 border border-gray-100 bg-zinc-50">
              <img src={toolImg} alt="AI営業ツール" className="w-full h-full object-cover" />
            </div>

            <div className="text-[#1A1C1E] font-extrabold">商談の“勝ち筋”をテンプレ化して即実行。</div>
          </motion.div>
        </aside>

        {/* Center: News */}
        <section className="col-span-6">
          {news.map((n) => {
            const Icon = n.companyIcon;
            return (
              <motion.article
                key={n.id}
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="rounded-2xl border border-gray-200 bg-white p-8 mb-6 shadow-sm"
              >
                {/* company icon + headline separated to avoid overlap */}
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-[#F8F9FA] h-10 w-10 flex-shrink-0">
                    <Icon size={18} strokeWidth={2.25} color="#D4AF37" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[#D4AF37] text-xs font-extrabold uppercase tracking-[0.2em]">
                      {n.title}
                    </div>
                    <div className="text-[#D4AF37] text-2xl font-extrabold leading-tight mt-1">
                      {n.headline}
                    </div>
                  </div>
                </div>

                <ul className="mt-4 list-disc pl-5 text-[14px] text-[#1A1C1E] space-y-2">
                  {n.bullets.map((b, i) => (
                    <li key={`${n.id}-b-${i}`}>{b}</li>
                  ))}
                </ul>

                <div className="mt-6 flex justify-end">
                  <CopyButton
                    payload={n.payload}
                    label="商談トークをコピー"
                    onCopied={() => showToast("success", "商談トークをクリップボードにコピーしました")}
                    onError={() => showToast("error", "コピーに失敗しました")}
                  />
                </div>
              </motion.article>
            );
          })}
        </section>

        {/* Right: Books + Video */}
        <aside className="col-span-3">
          <motion.div
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 mb-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-[#D4AF37] font-extrabold mb-4">
              <BookOpen size={18} />
              <span className="text-sm">必読の営業スキル本</span>
            </div>

            <ul className="mt-3 space-y-5">
              {books.map((book) => (
                <li
                  key={book.title}
                  className="flex items-start gap-4 cursor-pointer group"
                  onClick={() => {
                    // placeholder (開かない)
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <img
                    src={book.img}
                    alt={book.title}
                    className="w-24 aspect-[3/4] object-cover rounded shadow-md border border-gray-200"
                  />
                  <div className="min-w-0">
                    <div className="text-[#1A1C1E] font-extrabold leading-snug">{book.title}</div>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-[#D4AF37] font-extrabold mb-3">
              <Play size={18} />
              <span className="text-sm">おすすめ動画（YouTube）</span>
            </div>

            <div className="aspect-[16/9] w-full bg-zinc-50 rounded-xl relative overflow-hidden border border-gray-200">
              <img src={videoImg} alt="動画サムネイル" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/5" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-14 w-14 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center transition-transform duration-200 hover:scale-110">
                  <Play size={24} color="#D4AF37" />
                </div>
              </div>
            </div>

            <div className="mt-4 text-[#D4AF37] font-extrabold">トップセールスが語る『AI使いこなし術』</div>
          </motion.div>
        </aside>
      </main>
    </div>
  );
}

