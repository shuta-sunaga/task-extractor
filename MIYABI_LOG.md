# Miyabi 作業ログ

このファイルはmiyabiとの作業履歴を記録します。新しいセッションで過去の文脈を引き継ぐために使用されます。

---

## 2025-12-22

### セッション 1

#### 指示
- 実装状況を確認

#### 実施内容
- プロジェクト全体の実装状況を調査
- **結果**: 95%完成
  - フロントエンド（ダッシュボード、設定ページ）: 完成
  - API全エンドポイント: 完成
  - DB操作、Chatwork連携: 完成
  - タスク抽出: ルールベースで実装済み
  - Gemini AI: 実装済みだが未使用

#### 備考
- 本番環境で利用可能な状態
- Gemini AIへの切り替えは検討可能

---

### セッション 2

#### 指示
- miyabiとのやり取りをログに残したい（自動更新）

#### 実施内容
- `MIYABI_LOG.md` を作成（作業履歴記録用）
- `CLAUDE.md` にログ更新ルールを追加
  - セッション終了時に自動でログ更新
  - 指示・実施内容・備考の形式で記録

#### 備考
- ログはMarkdown形式（miyabiが読み込みやすい）
- CLAUDE.mdと同様にプロジェクトコンテキストとして自動読み込み

---

### セッション 3

#### 指示
- Microsoft Teams対応を追加
- 設定画面をメッセンジャーごとにタブ分け

#### 実施内容
1. **DBスキーマ拡張** (`lib/db.ts`)
   - `settings`: `teams_webhook_secret` カラム追加
   - `rooms`, `tasks`: `source` カラム追加（'chatwork' | 'teams'）
   - 複合ユニーク制約 `(room_id, source)` 追加

2. **Teamsライブラリ作成** (`lib/teams.ts`) - 新規
   - HMAC-SHA256署名検証
   - @mention除去機能
   - ペイロード解析

3. **Teams Webhookエンドポイント** (`app/api/webhook/teams/route.ts`) - 新規
   - Outgoing Webhook対応
   - 5秒以内レスポンス

4. **設定API更新**
   - `app/api/settings/route.ts`: Teams設定対応
   - `app/api/rooms/route.ts`: ソース別取得、手動登録、削除API追加

5. **設定画面タブ化** (`app/settings/page.tsx`)
   - Chatwork / Teams タブ切り替え
   - Teams: Webhookシークレット設定、チャネル手動登録

6. **ダッシュボード更新** (`app/page.tsx`)
   - ソースバッジ表示（CW: 緑、Teams: 紫）

#### 備考
- Teamsチャネルは手動登録方式（APIで一覧取得不可のため）
- ビルド成功確認済み
- デプロイ後、DB初期化が必要（新カラム追加のため）

---

### セッション 4

#### 指示
- Teams連携の動作確認とバグ修正

#### 実施内容
1. **conversation ID正規化** - `;messageid=xxx`を除去してチャネル照合
2. **重複タスク防止** - `message_id`で重複チェック追加
3. **HTMLタグ除去** - `<p>`タグ等を除去、エンティティデコード
4. **Bot返信メッセージ設定** - 登録完了メッセージ + ダッシュボードリンク

#### 備考
- Teams Outgoing Webhookは返信必須（完全無効化不可）
- 個人アカウントではOutgoing Webhook使用不可（組織アカウント必要）
- 動作確認完了

---

### セッション 5

#### 指示
- 名称変更（Task Extractor → たすきゃっちゃー）
- ポップでなじみやすいデザインに変更
- ロゴ作成（最終的に不採用）

#### 実施内容
1. **名称変更**: 「たすきゃっちゃー」（ひらがな）に決定
2. **フォント変更**: Zen Maru Gothic（丸ゴシック）を採用
3. **ヘッダー**: teal/cyanグラデーションに変更
4. **ロゴ**: ブーメラン型SVGを作成したが、最終的にテキストのみに
5. **metadata更新**: title/description変更

#### 備考
- ユーザー選定プロセス: タスキャッチャー → ひらがな化 → ロゴなし
- Logo.tsxは削除済み
- デプロイ後すぐ反映される

---

## 2025-12-23

### セッション 6

#### 指示
- ヘッダーの上下余白を増やす
- 設定ページに「全般」タブを追加
- メール通知機能を実装（タスク作成/完了/削除時）

#### 実施内容
1. **ヘッダー余白調整**: `py-3` → `py-8`

2. **DBスキーマ拡張** (`lib/db.ts`)
   - `notification_emails`: 通知先メールアドレス（カンマ区切り）
   - `notify_on_create`, `notify_on_complete`, `notify_on_delete`: 通知ON/OFF

3. **メール送信ライブラリ** (`lib/email.ts`) - 新規
   - Resend使用（遅延初期化でビルドエラー回避）
   - HTMLメールテンプレート（たすきゃっちゃーブランド）
   - 通知設定に応じた送信制御

4. **設定API更新** (`app/api/settings/route.ts`)
   - 通知設定の取得/保存対応

5. **設定画面に「全般」タブ追加** (`app/settings/page.tsx`)
   - メールアドレス管理（追加/削除）
   - 通知タイミング設定（チェックボックス）
   - Resend設定案内

6. **タスク操作時にメール通知を統合**
   - `app/api/webhook/chatwork/route.ts`: 作成通知
   - `app/api/webhook/teams/route.ts`: 作成通知
   - `app/api/tasks/[id]/route.ts`: 完了/削除通知

#### 備考
- Resend APIキーは設定画面から入力（環境変数不要）
- Resend無料枠: 3000通/月
- APIキー/メール未設定でもエラーにならない（スキップ）
- Resend無料アカウントでは自分のメールアドレスにのみ送信可能（ドメイン認証で解除）

#### 追加修正
- APIキー入力欄に目のアイコン追加（押している間表示）
- 送信元: `onboarding@resend.dev`（Resendデフォルト）

---

## 2025-12-24

### セッション 7

#### 指示
- Slackのエラー解析（チャンネルが監視対象にならない問題）
- ボット追加時の自動チャンネル登録機能を実装
- 全メッセンジャーの設定手順をドキュメント化
- ダッシュボードのリアルタイム更新（SSE）→ Vercel制約により断念
- ダッシュボードに更新ボタンを追加

#### 実施内容
1. **Slack自動チャンネル登録機能**
   - `lib/slack.ts`: `member_joined_channel`イベント判定、`auth.test` API、`conversations.info` API追加
   - `app/api/slack/workspaces/route.ts`: ワークスペース登録時に`bot_user_id`を自動取得
   - `app/api/webhook/slack/route.ts`: ボット参加時にチャンネルを自動登録

2. **設定ドキュメント作成** (`MESSENGER_SETUP.md`) - 新規
   - Chatwork: APIトークン取得、Webhook設定
   - Teams: Outgoing Webhook作成、セキュリティトークン
   - Lark: アプリ作成、Event Subscriptions、権限設定
   - Slack: アプリ作成、OAuth設定、自動登録の説明
   - 共通設定（メール通知、環境変数）

3. **SSE実装 → 削除**
   - 実装したが、Vercelのサーバーレス環境ではインスタンス間でメモリ共有できないため断念
   - 代替としてポーリングを提案したが、ユーザー希望により更新ボタン方式に

4. **ダッシュボード更新ボタン** (`app/page.tsx`)
   - タイトル横に控えめな更新ボタンを追加
   - 読み込み中はアイコンが回転

#### 備考
- Slack自動登録には`member_joined_channel`イベントの購読が必要
- 既存ワークスペースは`bot_user_id`がないため、再登録が必要
- Vercelでリアルタイム更新が必要な場合はPusher/Ably等の外部サービスが必要

---

### セッション 8

#### 指示
- ダッシュボードにメッセンジャーごとのフィルター機能を追加
- フィルターUIの改善

#### 実施内容
1. **ソースフィルター追加** (`app/page.tsx`)
   - ステータスフィルターに加え、ツール（CW/Teams/Lark/Slack）でのフィルタリング機能
   - 両フィルターの組み合わせが可能

2. **フィルターUI改善**
   - フィルターを薄いグレー背景のカードにまとめ
   - ラベル（「ステータス」「ツール」）追加
   - ステータス: 連結ボタングループ
   - ツール: 各色のピル型ボタン
   - フィルター結果の件数表示
   - 縦線でグループを区切り

#### 備考
- このバージョンを安定版としてタグ付け（v1.0-stable）
- 次回、大きな機能追加を予定

---

### セッション 9

#### 指示
- 企業・ユーザー管理機能の追加
- ログイン認証機能の実装
- ロール機能（タスク閲覧制限）の実装
- システム管理者画面の実装

#### 実施内容
1. **認証基盤（NextAuth.js）**
   - `next-auth`, `bcrypt` パッケージ追加
   - `lib/auth.ts` - NextAuth設定（Credentials Provider）
   - `lib/password.ts` - bcryptハッシュ（ソルト12ラウンド）
   - `lib/crypto.ts` - AES-256-GCM暗号化
   - `lib/session.ts` - 認証ヘルパー関数
   - `middleware.ts` - 認証ミドルウェア
   - `types/next-auth.d.ts` - 型定義拡張

2. **DBスキーマ拡張** (`lib/db.ts`)
   - `companies` テーブル（企業管理）
   - `users` テーブル（user_type: system_admin/admin/user）
   - `roles` テーブル（ロール定義）
   - `role_permissions` テーブル（ルーム×ソースの権限）
   - `user_roles` テーブル（ユーザーロール紐付け）
   - 既存テーブルに `company_id` カラム追加

3. **認証UI**
   - `app/login/page.tsx` - ログインページ
   - `components/Header.tsx` - 認証対応ヘッダー
   - `app/providers.tsx` - SessionProvider

4. **ユーザー管理**
   - `app/api/users/route.ts` - ユーザーCRUD API
   - `app/api/users/[id]/route.ts` - ユーザー個別操作
   - `app/admin/users/page.tsx` - ユーザー管理UI

5. **ロール管理**
   - `app/api/roles/route.ts` - ロールCRUD API
   - `app/api/roles/[id]/route.ts` - ロール個別操作
   - `app/api/roles/[id]/permissions/route.ts` - 権限管理
   - `app/admin/roles/page.tsx` - ロール管理UI（権限マトリックス）

6. **企業管理（システム管理者用）**
   - `app/api/companies/route.ts` - 企業CRUD API
   - `app/api/companies/[id]/route.ts` - 企業個別操作
   - `app/system-admin/page.tsx` - システム管理トップ
   - `app/system-admin/companies/page.tsx` - 企業管理UI

7. **初期管理者作成**
   - `app/api/init/route.ts` 更新 - 環境変数から初期システム管理者を作成

#### 備考
- **ユーザー種別**:
  - `system_admin`: 全企業横断管理（開発者/運営者）
  - `admin`: 自社内の全機能 + ユーザー/ロール管理
  - `user`: ロールに基づくタスク閲覧・ステータス変更
- **ロール権限**: ルーム × ソースの組み合わせで細かく制御
- **セキュリティ**: bcryptハッシュ、AES-256-GCM暗号化対応
- **環境変数追加**:
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
  - `ENCRYPTION_KEY`
  - `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`
- **デプロイ手順**:
  1. 環境変数を設定
  2. `/api/init` を呼び出し（DBマイグレーション + 初期管理者作成）
  3. 初期管理者でログイン
- 既存APIへの認証追加は次回対応予定

---

<!--
使い方:
- 新しいセッションごとに「### セッション N」を追加
- 「#### 指示」にユーザーからの依頼を記録
- 「#### 実施内容」にmiyabiが行った作業を記録
- 「#### 備考」に重要な決定事項や注意点を記録
-->
