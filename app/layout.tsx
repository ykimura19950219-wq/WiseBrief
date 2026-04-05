import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "WiseBrief",
  description: "3分で把握する情報要約",
  manifest: "/manifest.json"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="min-h-screen bg-[#F8F9FA] text-[#1A1C1E]">
        {children}
      </body>
    </html>
  );
}

