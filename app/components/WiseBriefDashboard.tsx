"use client";

import { Fragment, useState } from "react";
import type { WiseBriefCategoryKey, WiseBriefItem } from "@/lib/wisebrief";

function SourceIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-cyan-200"
    >
      <path
        d="M10.5 8.5H16.5C17.0523 8.5 17.5 8.94772 17.5 9.5V15.5C17.5 16.0523 17.0523 16.5 16.5 16.5H10.5C9.94772 16.5 9.5 16.0523 9.5 15.5V9.5C9.5 8.94772 9.94772 8.5 10.5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8 16L5 19"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8 12H4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8 8H4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeroArt() {
  return (
    <svg
      aria-hidden="true"
      width="1200"
      height="600"
      viewBox="0 0 1200 600"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="g0" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.65" />
          <stop offset="0.48" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0.55" />
        </linearGradient>
        <filter id="noise" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.1  0 0 0 0 0.6  0 0 0 0 0.9  0 0 0 .35 0" />
          <feBlend mode="screen" />
        </filter>
        <radialGradient id="glowA" cx="30%" cy="25%" r="60%">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.55" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glowB" cx="70%" cy="60%" r="55%">
          <stop offset="0" stopColor="#fbbf24" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1200" height="600" fill="#0d0d0d" />
      <rect width="1200" height="600" fill="url(#g0)" opacity="0.25" />
      <rect width="1200" height="600" filter="url(#noise)" opacity="0.18" />
      <circle cx="360" cy="170" r="240" fill="url(#glowA)" />
      <circle cx="900" cy="380" r="230" fill="url(#glowB)" />

      {/* futuristic lines */}
      <g opacity="0.7">
        {Array.from({ length: 14 }).map((_, i) => {
          const x = 120 + i * 70;
          const y = 60 + (i % 3) * 18;
          return (
            <path
              key={i}
              d={`M ${x} ${y} C ${x + 120} ${y + 40}, ${x + 220} ${y + 120}, ${x + 320} ${
                y + 220
              }`}
              stroke="#22d3ee"
              strokeOpacity={0.16 + i * 0.006}
              strokeWidth={2}
              fill="none"
            />
          );
        })}
      </g>
    </svg>
  );
}

function ThumbArt({ variant }: { variant: number }) {
  const hue = variant % 2 === 0 ? "#22d3ee" : "#fbbf24";
  return (
    <svg aria-hidden="true" viewBox="0 0 320 200" className="h-full w-full">
      <defs>
        <linearGradient id={`tg${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hue} stopOpacity="0.6" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0.25" />
        </linearGradient>
        <filter id={`tf${variant}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.6  0 0 0 0 0.9  0 0 0 .25 0" />
        </filter>
      </defs>
      <rect width="320" height="200" rx="18" fill="#111111" />
      <rect width="320" height="200" rx="18" fill={`url(#tg${variant})`} opacity="0.45" />
      <rect width="320" height="200" rx="18" filter={`url(#tf${variant})`} opacity="0.18" />
      <path d="M30 150 C 100 70, 170 190, 290 70" stroke={hue} strokeOpacity="0.35" strokeWidth="6" fill="none" />
      <circle cx="92" cy="78" r="16" fill={hue} fillOpacity="0.22" />
      <circle cx="220" cy="132" r="24" fill="#fbbf24" fillOpacity="0.12" />
    </svg>
  );
}

export default function WiseBriefDashboard({
  items,
  dateKey
}: {
  items: WiseBriefItem[];
  dateKey: string;
}) {
  const [activeSourceKey, setActiveSourceKey] = useState<WiseBriefCategoryKey | null>(null);

  const activeItem = activeSourceKey ? items.find((it) => it.key === activeSourceKey) : null;

  const date = new Date(`${dateKey}T00:00:00`).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  });

  function sanitizeForDisplay(text: string | undefined) {
    const t = (text ?? "").replace(/[A-Za-z]/g, "").replace(/[ \t]+/g, " ").trim();
    return t.length > 0 ? t : "出典リンク";
  }

  return (
    <div className="min-h-screen bg-black px-6 py-12 lg:px-12 lg:py-16">
      <header className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-8">
          <div>
            <div className="text-[22px] font-medium tracking-[-0.02em] text-white/95">WiseBrief</div>
            <div className="mt-2 text-sm font-semibold text-white/45">毎朝3分で、会話の勝ち筋を作る</div>
          </div>

          <div className="rounded-full bg-white/5 px-4 py-2 text-sm text-white/60">{date}</div>
        </div>

        <h1 className="mt-10 text-[48px] font-extrabold leading-[1.03] tracking-tight text-white">
          本日の必修ニュース
        </h1>
      </header>

      <main className="mx-auto mt-10 max-w-5xl space-y-8">
        {items.map((item, idx) => {
          const delay = idx * 180;

          const affiliateAfter = idx === 0; // 「ニュースの間」に1つだけ挿入

          return (
            <Fragment key={item.key}>
              <article
                key={item.key}
                style={{ animationDelay: `${delay}ms` }}
                onClick={() => setActiveSourceKey(item.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setActiveSourceKey(item.key);
                }}
                className={[
                  "wisebrief-rise relative overflow-hidden rounded-[24px] border-[0.5px] border-white/5 bg-[#111111] px-14 py-14",
                  "cursor-pointer transition-transform duration-300 hover:scale-[1.01] hover:shadow-[0_0_0_1px_rgba(34,211,238,0.12),0_24px_80px_rgba(0,0,0,0.6)]"
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-8">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white/50">ニュース概要</div>
                    <h2 className="mt-3 break-words text-[30px] font-extrabold leading-[1.08] tracking-tight text-white">
                      {item.newsTitle}
                    </h2>
                    <p
                      className="mt-5 text-[17px] leading-relaxed text-white/85"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}
                    >
                      {item.summary}
                    </p>

                    <div className="mt-8 rounded-[18px] border border-white/10 bg-black/20 px-7 py-6">
                      <div className="flex items-center gap-3">
                        <span className="text-[18px]">💡</span>
                        <div className="text-sm font-semibold text-white/60">
                          商談で使えるドヤ顔ワード
                        </div>
                      </div>
                      <div className="mt-3 border-l-4 border-[#22d3ee] pl-4 text-[18px] font-extrabold leading-relaxed text-white drop-shadow-[0_0_18px_rgba(34,211,238,0.22)]">
                        「{item.doyaWord}」
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveSourceKey(item.key)}
                    className="inline-flex items-center gap-2 rounded-[16px] border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
                  >
                    <span aria-hidden="true">🔗</span>
                    ソースを確認
                  </button>
                </div>
              </article>

              {affiliateAfter ? (
                <article
                  key={`affiliate-${item.key}`}
                  style={{ animationDelay: `${delay + 120}ms` }}
                  className={[
                    "wisebrief-rise relative overflow-hidden rounded-[24px] border-[0.5px] border-[#D4AF37]/35 bg-[#0d0d0d] px-14 py-14"
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold tracking-[0.14em] text-[#D4AF37]">
                    編集部のおすすめ
                  </div>
                  <h2 className="mt-3 text-[30px] font-extrabold leading-[1.1] tracking-tight text-white">
                    今週の厳選AIツール（商談を前に進めるやつだけ）
                  </h2>

                  <div className="mt-7 space-y-3">
                    {[
                      "議事録→要点→提案骨子を自動で整える",
                      "候補者への質問案を生成し、会話を前に進める",
                      "競合比較を短時間で“言語化”して共有できる"
                    ].map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-[16px] border border-[#D4AF37]/20 bg-white/5 px-5 py-4"
                      >
                        <div className="text-white/85 text-[16px] font-semibold">{t}</div>
                        <div className="text-[#D4AF37] font-extrabold">推し</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-[16px] bg-[#D4AF37] px-7 py-3 text-sm font-extrabold text-black transition hover:brightness-110"
                      onClick={() => {
                        // ダミー（アフィリ導線は後で差し替え）
                      }}
                    >
                      編集部のおすすめを開く（ダミー）
                    </button>
                  </div>
                </article>
              ) : null}
            </Fragment>
          );
        })}
      </main>

      <div className="mx-auto mt-10 max-w-5xl flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <a
          href="#"
          className="inline-flex items-center justify-center rounded-[16px] border border-white/10 bg-white/5 px-7 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
          onClick={(e) => e.preventDefault()}
        >
          もっと見る（ダミー）
        </a>
        <a
          href="/archive"
          className="inline-flex items-center justify-center rounded-[16px] border border-[#22d3ee]/25 bg-[#22d3ee]/10 px-7 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-[#22d3ee]/20"
        >
          過去のニュース
        </a>
      </div>

      {activeItem ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-6 py-10"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveSourceKey(null);
          }}
        >
          <div className="wisebrief-modal-in w-full max-w-3xl rounded-[24px] border-[0.5px] border-white/10 bg-[#0d0d0d] p-6 lg:p-10 shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-sm font-semibold text-white/55">詳細</div>
                <div className="mt-2 break-words text-[22px] font-extrabold leading-tight text-white">
                  {activeItem.newsTitle}
                </div>
              </div>
              <button
                type="button"
                className="rounded-[14px] border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
                onClick={() => setActiveSourceKey(null)}
              >
                閉じる
              </button>
            </div>

            <div className="mt-7 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[18px] border border-white/10 bg-black/20 p-5">
                <div className="text-sm font-semibold text-white/60">ニュース概要（短く要点だけ）</div>
                <div className="mt-3 text-[16px] leading-relaxed text-white/85 whitespace-pre-line">
                  {activeItem.summary}
                </div>
              </div>

              <div className="rounded-[18px] border border-white/10 bg-black/20 p-5">
                <div className="text-sm font-semibold text-white/60">💡 商談で使えるドヤ顔ワード</div>
                <div className="mt-3 border-l-4 border-[#22d3ee] pl-4 text-[18px] font-extrabold leading-relaxed text-white drop-shadow-[0_0_18px_rgba(34,211,238,0.22)]">
                  「{activeItem.doyaWord}」
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <div className="rounded-[18px] border border-white/10 bg-[#111111] p-5">
                <div className="text-sm font-semibold text-white/70">背景</div>
                <div className="mt-3 text-[16px] leading-relaxed text-white/85 whitespace-pre-line">
                  {activeItem.background}
                </div>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-[#111111] p-5">
                <div className="text-sm font-semibold text-white/70">現状</div>
                <div className="mt-3 text-[16px] leading-relaxed text-white/85 whitespace-pre-line">
                  {activeItem.current}
                </div>
              </div>
              <div className="rounded-[18px] border border-[#22d3ee]/20 bg-[#0f0f0f] p-5">
                <div className="text-sm font-semibold text-cyan-100">今後予測</div>
                <div className="mt-3 text-[16px] leading-relaxed text-white/85 whitespace-pre-line">
                  {activeItem.forecast}
                </div>
              </div>
            </div>

            <div className="mt-7 text-sm font-semibold text-white/60">出典（上位）</div>
            <div className="mt-4 space-y-3">
              {activeItem.sources.slice(0, 3).map((s, i) => {
                const label = sanitizeForDisplay(s.title);
                const href = s.url ?? "#";
                return (
                  <a
                    key={`${href}-${i}`}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-[16px] border border-white/10 bg-white/5 px-4 py-4 text-white/85 transition hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 truncate font-semibold">{label}</div>
                      <div className="text-white/60">開く</div>
                    </div>
                  </a>
                );
              })}

              <a
                href={activeItem.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="block rounded-[16px] border border-white/10 bg-white/5 px-4 py-4 text-white/85 transition hover:bg-white/10"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 truncate font-semibold">関連動画</div>
                  <div className="text-white/60">開く</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

