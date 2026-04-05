"use client";

import React, { useCallback, useEffect, useState } from "react";

type BriefItem = {
  id: number;
  category: string;
  title: string;
  summary: string;
  details: string;
  doyaWord: string;
  url: string;
  time: string;
  icon: string;
};

export default function Home() {
  const [items, setItems] = useState<BriefItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadBrief = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/brief", { cache: "no-store" });
      const data = (await res.json()) as { items?: BriefItem[]; error?: string };
      if (!res.ok) {
        setFetchError(data.error ?? "読み込みに失敗しました");
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setFetchError("ネットワークエラーが発生しました");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBrief();
  }, [loadBrief]);

  const handleCopy = (e: React.MouseEvent, text: string, id: number) => {
    e.stopPropagation();
    if ("vibrate" in navigator) navigator.vibrate(50);
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#020307] bg-gradient-to-br from-[#050610] via-[#020307] to-[#0a0c1f] text-gray-100 font-sans overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#050509]/60 border-b border-white/[0.03] px-5 py-4 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-emerald-400 flex items-center justify-center font-bold text-lg border border-white/10 shadow-xl shadow-blue-500/30">
            <span className="text-white drop-shadow-md">W</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tighter text-white">
            WiseBrief <span className="font-light text-sm text-blue-400 font-mono italic">Pro</span>
          </h1>
        </div>
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => void loadBrief()}
            className="w-9 h-9 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/[0.05] active:scale-90 transition text-xs font-bold text-blue-300"
            aria-label="更新"
          >
            ↻
          </button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 flex items-center justify-center font-bold text-sm border-2 border-white/10 shadow-lg shadow-blue-500/20">
            C
          </div>
        </div>
      </header>

      <main className="px-4 py-8 space-y-7 max-w-xl mx-auto">
        <div className="pl-2 mb-10 border-l-2 border-blue-600/70">
          <h2 className="text-xs font-semibold text-blue-400 tracking-widest uppercase mb-1.5">Today&apos;s Insight</h2>
          <p className="text-3xl font-extrabold tracking-tighter text-white leading-tight">
            明日の商談を、
            <br />
            支配する。
          </p>
        </div>

        {loading ? (
          <p className="text-center text-sm text-gray-500 py-16">本日のブリーフを読み込み中…</p>
        ) : fetchError ? (
          <p className="text-center text-sm text-red-400 py-16">{fetchError}</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-gray-400 leading-relaxed">
            まだ本日のブリーフがありません。
            <br />
            スケジューラーから <code className="text-blue-300">/api/daily-brief</code> を実行すると、ここに5件表示されます。
          </div>
        ) : null}

        <div className="space-y-6 pb-20">
          {items.map((news) => (
            <article
              key={news.id}
              onClick={() => setExpandedId(expandedId === news.id ? null : news.id)}
              className="group relative backdrop-blur-sm bg-white/[0.02] border border-white/[0.04] rounded-3xl p-6 shadow-2xl transition-all cursor-pointer hover:bg-white/[0.04]"
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{news.icon}</span>
                  <span className="px-3.5 py-1.5 rounded-full bg-blue-600/10 text-blue-300 text-[10px] font-black tracking-widest uppercase border border-blue-600/20">
                    {news.category}
                  </span>
                </div>
                <span className="text-[10px] text-gray-600 font-bold tracking-widest uppercase">{news.time}</span>
              </div>

              <h3 className="text-lg font-bold leading-snug mb-3 text-white group-hover:text-blue-200 transition-colors">
                {news.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4 font-light line-clamp-2">{news.summary}</p>

              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedId === news.id ? "max-h-[600px] opacity-100 mb-6" : "max-h-0 opacity-0"}`}
              >
                <div className="pt-2 pb-4 text-sm text-gray-300 leading-relaxed border-t border-white/[0.03]">
                  {news.details}
                  <div className="mt-4">
                    <a
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1"
                    >
                      🔗 ニュース元を読む
                    </a>
                  </div>
                </div>
              </div>

              <div className="relative backdrop-blur-md bg-blue-950/20 border border-blue-500/10 p-5 rounded-2xl mb-6 shadow-inner">
                <p className="text-[10px] text-blue-400 font-black mb-2 flex items-center gap-1.5 tracking-[0.2em] uppercase">
                  <span className="animate-pulse">🔥</span> Today&apos;s Weapon
                </p>
                <p className="text-[15px] font-bold text-white tracking-wide leading-relaxed italic">{news.doyaWord}</p>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/[0.03]">
                <button
                  type="button"
                  onClick={(e) => handleCopy(e, news.doyaWord, news.id)}
                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-black transition-all duration-300 w-full justify-center shadow-lg active:scale-95 ${
                    copiedId === news.id
                      ? "bg-emerald-600 text-white shadow-emerald-500/30"
                      : "bg-gradient-to-b from-blue-600 to-blue-700 text-white border border-blue-500/30"
                  }`}
                >
                  {copiedId === news.id ? "✓ COPIED TO WEAPON!" : "📋 コピーして武器にする"}
                </button>
              </div>

              <div className="mt-3 text-center">
                <span className="text-[9px] text-gray-700 font-bold tracking-[0.3em] uppercase">
                  {expandedId === news.id ? "↑ Tap to collapse" : "↓ Tap to read more"}
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
