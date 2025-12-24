# メッセンジャー連携設定ガイド

Task Extractorで各メッセンジャーを連携するための設定手順をまとめたドキュメントです。

## 目次

- [Chatwork](#chatwork)
- [Microsoft Teams](#microsoft-teams)
- [Lark (Feishu)](#lark-feishu)
- [Slack](#slack)

---

## Chatwork

### 概要

Chatworkの指定したルームのメッセージを監視し、タスクを自動抽出します。

### 必要な情報

| 項目 | 説明 | 取得場所 |
|------|------|----------|
| APIトークン | Chatwork APIを呼び出すためのトークン | Chatwork管理画面 |
| Webhookトークン | Webhook署名検証用トークン | Webhook編集画面 |

### 設定手順

#### 1. APIトークンの取得

1. [Chatwork](https://www.chatwork.com/) にログイン
2. 右上のプロフィールアイコン → **サービス連携** をクリック
3. **APIトークン** タブを選択
4. 「APIトークンを表示」をクリックしてトークンをコピー
5. Task Extractorの設定画面（Chatworkタブ）に貼り付け

#### 2. Webhookの設定

1. Chatwork管理画面 → **サービス連携** → **Webhook**
2. **新規Webhook作成** をクリック
3. 以下を設定：
   - **Webhook名**: 任意（例: Task Extractor）
   - **Webhook URL**: Task Extractorの設定画面に表示されているURL
     ```
     https://あなたのドメイン/api/webhook/chatwork
     ```
   - **イベント**: `メッセージ作成` にチェック
   - **ルーム**: 監視したいルームを選択
4. 作成後、編集画面で表示される **Webhookトークン** をコピー
5. Task Extractorの設定画面に貼り付け

#### 3. 監視ルームの設定

1. Task Extractorの設定画面でAPIトークンを保存
2. ルーム一覧が自動的に表示される
3. 監視したいルームにチェックを入れる

### 動作確認

監視対象ルームで以下のようなメッセージを送信：
```
タスク: テスト投稿です
```

ダッシュボードにタスクが表示されれば成功です。

---

## Microsoft Teams

### 概要

TeamsのOutgoing Webhookを使用して、メンション付きメッセージからタスクを抽出します。

### 必要な情報

| 項目 | 説明 | 取得場所 |
|------|------|----------|
| セキュリティトークン | HMAC署名検証用シークレット | Webhook作成時に表示 |
| チャネルID | 監視対象チャネルの識別子 | 初回Webhook受信時のログ |

### 設定手順

#### 1. Outgoing Webhookの作成

1. Teamsを開く
2. 監視したいチーム → チャネルを右クリック → **コネクタ** または **アプリを管理**
3. **Outgoing Webhook** を選択
4. 以下を設定：
   - **名前**: 任意（例: TaskBot）
   - **コールバックURL**: Task Extractorの設定画面に表示されているURL
     ```
     https://あなたのドメイン/api/webhook/teams
     ```
   - **説明**: 任意
   - **プロフィール画像**: 任意
5. 作成をクリック
6. 表示される **セキュリティトークン** を必ずコピー（この画面を閉じると再表示不可）

#### 2. Task Extractorでの設定

1. 設定画面（Teamsタブ）を開く
2. **Webhookシークレット** にセキュリティトークンを貼り付け
3. 保存

#### 3. チャネルの登録

1. Teamsで作成したWebhook（ボット）にメンション付きでメッセージを送信
   ```
   @TaskBot テスト
   ```
2. サーバーログでチャネルIDを確認
   ```
   [Teams Webhook] Conversation: 19:xxxxx@thread.tacv2
   ```
3. Task Extractorの設定画面でチャネルを追加
   - **チャネルID**: ログで確認したID
   - **チャネル名**: 任意の名前

### 使い方

Webhookにメンションしてメッセージを送信：
```
@TaskBot タスク: 明日までにレポート提出
```

### 注意事項

- Outgoing Webhookは**メンション必須**です
- 5秒以内に応答する必要があるため、処理は高速に行われます
- チャネルごとにWebhookを作成する必要があります

---

## Lark (Feishu)

### 概要

Larkのボットアプリを作成し、グループチャットのメッセージからタスクを抽出します。

### 必要な情報

| 項目 | 説明 | 取得場所 |
|------|------|----------|
| App ID | アプリケーション識別子 | Developer Console |
| App Secret | APIアクセス用シークレット | Developer Console |
| Verification Token | イベント検証用トークン | Event Subscriptions |
| Encrypt Key | ペイロード暗号化キー（オプション） | Event Subscriptions |

### 設定手順

#### 1. Larkアプリの作成

1. [Lark Open Platform](https://open.larksuite.com/) にアクセス
2. **Developer Console** に移動
3. **Create Custom App** をクリック
4. アプリ情報を入力：
   - **App Name**: 任意（例: Task Extractor）
   - **App Description**: 任意
   - **App Icon**: 任意
5. 作成後、**Credentials** で以下をコピー：
   - **App ID** (cli_xxxxxxxxxx)
   - **App Secret**

#### 2. Event Subscriptionsの設定

1. アプリ設定 → **Event Subscriptions**
2. **Request URL** にTask ExtractorのURLを入力：
   ```
   https://あなたのドメイン/api/webhook/lark
   ```
3. **Verification Token** をコピー
4. （オプション）**Encrypt Key** を設定した場合はそれもコピー
5. 以下のイベントを購読：
   - `im.message.receive_v1` (メッセージ受信)

#### 3. 権限の設定

1. **Permissions & Scopes** を開く
2. 以下のスコープを追加：
   - `im:message` または `im:message:readonly`
   - `im:chat:readonly`（チャット情報取得用）
3. **Request to go live** でアプリを公開申請

#### 4. Task Extractorでの設定

1. 設定画面（Larkタブ）を開く
2. 以下を入力：
   - **App ID**
   - **App Secret**
   - **Verification Token**
   - **Encrypt Key**（設定した場合のみ）
3. 保存

#### 5. グループチャットの登録

1. Larkでボットをグループチャットに追加
2. グループでメッセージを送信
3. サーバーログでチャットIDを確認
   ```
   [Lark Webhook] Chat: oc_xxxxxxxxxx
   ```
4. Task Extractorの設定画面でチャットを追加

### 動作確認

監視対象グループで以下のようなメッセージを送信：
```
タスク: テスト投稿です
```

---

## Slack

### 概要

Slackアプリを作成し、チャンネルのメッセージからタスクを抽出します。ボットをチャンネルに招待すると自動的に監視対象として登録されます。

### 必要な情報

| 項目 | 説明 | 取得場所 |
|------|------|----------|
| Workspace ID | ワークスペースの識別子 | Slack設定 or auth.test |
| Bot Token | Bot User OAuth Token | OAuth & Permissions |
| Signing Secret | リクエスト署名検証用 | Basic Information |

### 設定手順

#### 1. Slackアプリの作成

1. [Slack API](https://api.slack.com/apps) にアクセス
2. **Create New App** → **From scratch** を選択
3. 以下を入力：
   - **App Name**: 任意（例: Task Extractor）
   - **Workspace**: インストール先ワークスペース
4. 作成をクリック

#### 2. Basic Informationの確認

1. 作成したアプリのページで **Basic Information** を開く
2. **App Credentials** セクションで **Signing Secret** をコピー

#### 3. OAuth & Permissionsの設定

1. サイドバーから **OAuth & Permissions** を開く
2. **Scopes** → **Bot Token Scopes** で以下を追加：
   - `channels:history` - パブリックチャンネルのメッセージ読み取り
   - `groups:history` - プライベートチャンネルのメッセージ読み取り
   - `channels:read` - チャンネル情報の読み取り（自動登録用）
   - `groups:read` - プライベートチャンネル情報の読み取り
3. ページ上部の **Install to Workspace** をクリック
4. 権限を許可
5. 表示される **Bot User OAuth Token** (xoxb-...) をコピー

#### 4. Event Subscriptionsの設定

1. サイドバーから **Event Subscriptions** を開く
2. **Enable Events** をONに
3. **Request URL** にTask ExtractorのURLを入力：
   ```
   https://あなたのドメイン/api/webhook/slack
   ```
   ※ 入力後、自動的にURL検証が行われます
4. **Subscribe to bot events** で以下を追加：
   - `message.channels` - パブリックチャンネルのメッセージ
   - `message.groups` - プライベートチャンネルのメッセージ
   - `member_joined_channel` - チャンネル参加イベント（自動登録用）
5. 変更を保存

#### 5. Workspace IDの確認

Workspace IDは以下のいずれかの方法で確認できます：

**方法1: Slackの設定から**
1. Slackワークスペースを開く
2. ワークスペース名をクリック → **設定と管理** → **ワークスペースの設定**
3. URLの `team=Txxxxxxxx` 部分がWorkspace ID

**方法2: auth.test APIから**
```bash
curl -X POST https://slack.com/api/auth.test \
  -H "Authorization: Bearer xoxb-your-bot-token"
```
レスポンスの `team_id` がWorkspace IDです。

#### 6. Task Extractorでの設定

1. 設定画面（Slackタブ）を開く
2. **ワークスペースを追加** で以下を入力：
   - **Workspace ID**: Txxxxxxxx形式のID
   - **ワークスペース名**: 任意（表示用）
   - **Bot Token**: xoxb-... 形式のトークン
   - **Signing Secret**: Basic Informationからコピーしたもの
3. 追加をクリック

#### 7. チャンネルの監視を開始

**自動登録（推奨）**:
1. Slackでボットをチャンネルに招待
   ```
   /invite @Task Extractor
   ```
2. 自動的に監視対象として登録される

**手動登録**:
1. Task Extractorの設定画面で「チャンネル管理」を開く
2. チャンネルIDと名前を入力して追加
   - チャンネルIDはSlackでチャンネル名を右クリック → 「リンクをコピー」で確認可能

### 動作確認

監視対象チャンネルで以下のようなメッセージを送信：
```
タスク: テスト投稿です
```

### トラブルシューティング

| 症状 | 原因 | 対処法 |
|------|------|--------|
| URL検証が失敗する | サーバーが起動していない | デプロイを確認 |
| メッセージが検出されない | チャンネルが未登録 | ボットを招待 or 手動登録 |
| Invalid signature | Signing Secretが間違っている | 正しい値を再入力 |
| Workspace not registered | ワークスペースが未登録 | 設定画面で追加 |

---

## 共通設定

### メール通知

タスクの作成・完了・削除時にメール通知を受け取ることができます。

1. [Resend](https://resend.com/) で無料アカウントを作成
2. APIキーを取得
3. Task Extractorの設定画面（全般タブ）でAPIキーを設定
4. 通知先メールアドレスを追加
5. 通知タイミングを選択

### 環境変数

本番環境では以下の環境変数を設定してください：

```bash
POSTGRES_URL=postgresql://...    # Vercel Postgres接続URL
GEMINI_API_KEY=...               # Google AI Studio APIキー（AI分析用）
```

---

## FAQ

### Q: 複数のメッセンジャーを同時に使えますか？
A: はい、Chatwork・Teams・Lark・Slackすべてを同時に使用できます。

### Q: どのようなメッセージがタスクとして認識されますか？
A: 「タスク:」「TODO:」「課題:」などのプレフィックスがついたメッセージ、または依頼・指示の文脈を含むメッセージがタスクとして認識されます。

### Q: タスクの優先度はどう決まりますか？
A: メッセージ内の「緊急」「至急」「急ぎ」などのキーワードや、期限の指定によって自動判定されます。
