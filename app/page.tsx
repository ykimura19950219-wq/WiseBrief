'use client';

import React, { useState } from 'react';

// 【5件に増量】これでLINEと同じ満足感になります！
const mockNews = [
  {
    id: 1,
    category: 'HR Tech',
    title: 'AI面接官の導入企業が前年比300%増加。人間は「カルチャーフィット」の見極めに特化へ',
    summary: '一次面接の自動化が進む中、人事の役割は「自社の魅力を伝えるアトラクト」と「価値観のすり合わせ」にシフト。',
    details: 'ソフトバンクやサイバーエージェントなどの大手企業を筆頭に、AIによる初期選考の導入が加速しています。AIは客観的な評価を行える一方、最終決定権は人間に残されており、いかに自社のロマンを語り口説き落とすかという「アトラクト力」が採用担当者の必須スキルとなっています。',
    doyaWord: '「これからの採用は、AIがスキルを測り、人間がロマンを語る時代ですよね。」',
    url: 'https://example.com/news1',
    time: '1時間前',
    icon: '🤖'
  },
  {
    id: 2,
    category: 'IT Trend',
    title: '大手SaaS、LLMを活用した「ノーコード業務自動化」機能を標準搭載へ',
    summary: '現場の担当者が自然言語でシステムを構築できる時代が到来。IT部門はガバナンス管理へ役割転換。',
    details: 'SalesforceやServiceNowなどは、自然言語でワークフローを自動生成するCopilot機能を強化。これにより、非IT部門の社員が自ら業務改善を行えるようになる一方、IT部門にはそれらがセキュリティ基準を満たしているかを監視する「プロンプト・ガバナンス」の構築が求められています。',
    doyaWord: '「シャドーITを恐れるのではなく、プロンプト・ガバナンスを効かせるのが次世代の情シスですよ。」',
    url: 'https://example.com/news2',
    time: '3時間前',
    icon: '⚡'
  },
  {
    id: 3,
    category: 'Startup',
    title: '採用広報に「ショート動画」旋風。カジュアル面談の前に社員の熱量を可視化',
    summary: '文章よりも情報の解像度が高いショート動画が、若手層へのアプローチにおいて無視できない存在に。',
    details: 'TikTokやYouTubeショートでオフィスの空気感や社員の喋り方を配信する企業が急増。これにより、面接時のミスマッチが大幅に軽減され、承諾率の向上につながるデータが出ています。',
    doyaWord: '「求人票は読むものから、視聴するものへ。解像度の差が承諾率の差ですよ。」',
    url: 'https://example.com/news3',
    time: '5時間前',
    icon: '🎥'
  },
  {
    id: 4,
    category: 'Cyber Security',
    title: 'AI生成による巧妙なフィッシング詐欺が急増。企業守備網の再構築が急務',
    summary: '人間では見破れない完璧な日本語の詐欺メールが登場。AIにはAIで対抗する防御策が主流に。',
    details: 'LLMを利用して文脈や口調を模倣した詐欺メールは、従来のフィルターを突破します。これに対し、受信したメールの「違和感」をAIが検知する新しいセキュリティソリューションの導入が、エンタープライズ企業で進んでいます。',
    doyaWord: '「これからのセキュリティは、壁を作るのではなく、AIという免疫系を育てる発想が必要ですね。」',
    url: 'https://example.com/news4',
    time: '6時間前',
    icon: '🛡️'
  },
  {
    id: 5,
    category: 'SaaS',
    title: 'ハイブリッドワーク時代の「メタバースオフィス」に再注目。雑談の価値を再定義',
    summary: '単なるビデオ会議ではなく、空間を共有する感覚がチームの創造性を高める結果に。',
    details: 'GatherやMetaなどの空間共有ツールが、再度注目を集めています。偶然の会話から生まれるアイデアの価値が再認識され、リモートワークにおける「孤独」を解消しつつ、エンゲージメントを高めるためのインフラとして定着し始めています。',
    doyaWord: '「今のリモートに足りないのは業務連絡じゃなく、偶然の雑談という『余白』なんですよ。」',
    url: 'https://example.com/news5',
    time: '8時間前',
    icon: '🏢'
  }
];

export default function Home() {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, id: number) => {
    e.stopPropagation();
    if ('vibrate' in navigator) navigator.vibrate(50); 
    navigator.clipboard.writeText(text);
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
          <button className="w-9 h-9 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/[0.05] active:scale-90 transition">🔔</button>
          <div className="w-9 h-9 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 flex items-center justify-center font-bold text-sm border-2 border-white/10 shadow-lg shadow-blue-500/20">C</div>
        </div>
      </header>

      <main className="px-4 py-8 space-y-7 max-w-xl mx-auto">
        <div className="pl-2 mb-10 border-l-2 border-blue-600/70">
          <h2 className="text-xs font-semibold text-blue-400 tracking-widest uppercase mb-1.5">Today&apos;s Insight</h2>
          <p className="text-3xl font-extrabold tracking-tighter text-white leading-tight">明日の商談を、<br/>支配する。</p>
        </div>

        <div className="space-y-6 pb-20">
          {mockNews.map((news) => (
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
              <p className="text-sm text-gray-500 leading-relaxed mb-4 font-light line-clamp-2">
                {news.summary}
              </p>

              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedId === news.id ? 'max-h-[600px] opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
                <div className="pt-2 pb-4 text-sm text-gray-300 leading-relaxed border-t border-white/[0.03]">
                  {news.details}
                  <div className="mt-4">
                    <a href={news.url} target="_blank" onClick={(e) => e.stopPropagation()} className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1">
                      🔗 ニュース元を読む
                    </a>
                  </div>
                </div>
              </div>

              <div className="relative backdrop-blur-md bg-blue-950/20 border border-blue-500/10 p-5 rounded-2xl mb-6 shadow-inner">
                <p className="text-[10px] text-blue-400 font-black mb-2 flex items-center gap-1.5 tracking-[0.2em] uppercase">
                  <span className="animate-pulse">🔥</span> Today&apos;s Weapon
                </p>
                <p className="text-[15px] font-bold text-white tracking-wide leading-relaxed italic">
                  {news.doyaWord}
                </p>
              </div>

              <div className="flex justify-end pt-4 border-t border-white/[0.03]">
                <button 
                  onClick={(e) => handleCopy(e, news.doyaWord, news.id)}
                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-black transition-all duration-300 w-full justify-center shadow-lg active:scale-95 ${
                    copiedId === news.id ? 'bg-emerald-600 text-white shadow-emerald-500/30' : 'bg-gradient-to-b from-blue-600 to-blue-700 text-white border border-blue-500/30'
                  }`}
                >
                  {copiedId === news.id ? '✓ COPIED TO WEAPON!' : '📋 コピーして武器にする'}
                </button>
              </div>
              
              <div className="mt-3 text-center">
                <span className="text-[9px] text-gray-700 font-bold tracking-[0.3em] uppercase">
                  {expandedId === news.id ? '↑ Tap to collapse' : '↓ Tap to read more'}
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}