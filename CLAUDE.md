# Task Extractor

Chatworkのメッセージから課題・タスクを自動抽出するシステム

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4
- **DB**: Vercel Postgres
- **AI**: Google Gemini 1.5 Flash
- **連携**: Chatwork API / Webhook

## ディレクトリ構成

```
app/
├── page.tsx              # タスク一覧ダッシュボード
├── settings/page.tsx     # 設定ページ
├── layout.tsx            # 共通レイアウト
└── api/
    ├── init/             # DB初期化
    ├── tasks/            # タスクCRUD
    ├── rooms/            # ルーム管理
    ├── settings/         # 設定管理
    └── webhook/chatwork/ # Webhook受信

lib/
├── db.ts        # Vercel Postgres操作
├── gemini.ts    # Gemini AIでタスク判定
└── chatwork.ts  # Chatwork API連携
```

## 動作フロー

1. Chatworkからメッセージ受信（Webhook）
2. 署名検証 → アクティブルームか確認
3. Gemini AIでタスクかどうか判定
4. タスクの場合DBに保存（優先度: high/medium/low）
5. ダッシュボードで管理（ステータス変更・削除）

## 環境変数

```bash
POSTGRES_URL=         # Vercel Postgres接続URL
GEMINI_API_KEY=       # Google AI Studio APIキー
```

## 開発コマンド

```bash
npm run dev    # 開発サーバー起動
npm run build  # ビルド
npm run start  # 本番サーバー起動
npm run lint   # Lint実行
```

## デプロイ

Vercelにデプロイ後、以下を設定：
1. 環境変数（POSTGRES_URL, GEMINI_API_KEY）
2. Vercel Postgresをプロジェクトに接続
3. Chatwork Webhook URLを登録
