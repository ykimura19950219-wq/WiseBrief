# WiseBrief

Next.js (App Router) + Tailwind で作る、ITニュース「朝3分ダッシュボード」です。

## 機能

- Tavily APIで以下を検索
  - `IT人材市場トレンド`
  - `最新AIツール`
  - `スタートアップ資金調達`
- 検索結果を Tavily の `include_answer` でAI要約
- 各ニュースに「今日のドヤ顔ワード（学生に刺さる一言）」を表示
- 関連するYouTubeリンク（検索結果から抽出 / 見つからない場合はYouTube検索リンク）を1つ提示

## 必要なもの

- Tavily API Key

## セットアップ

1. 依存関係をインストール
   - `npm install`
2. 環境変数を設定
   - `.env.local` に `TAVILY_API_KEY` を設定
3. 開発サーバー起動
   - `npm run dev`

## メモ
- `TAVILY_API_KEY` が未設定の場合、要約が生成できません。

