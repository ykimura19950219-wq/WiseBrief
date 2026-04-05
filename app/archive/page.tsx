import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "過去のニュース"
};

export default function ArchivePage() {
  return (
    <div className="min-h-screen bg-black px-6 py-12 lg:px-12 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="text-sm font-semibold tracking-[0.14em] text-white/55">
          過去のニュース
        </div>
        <h1 className="mt-4 text-[40px] font-extrabold leading-[1.08] tracking-tight text-white">
          一覧は近日公開
        </h1>
        <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-white/70">
          今は「本日の必修ニュース」だけ表示されます。過去分の表示は次のアップデートで追加します。
        </p>
        <div className="mt-10">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-[16px] border border-white/10 bg-white/5 px-7 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            トップへ戻る
          </a>
        </div>
      </div>
    </div>
  );
}

