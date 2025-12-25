# テスト計画書

## 1. 概要

Task Extractorプロジェクトのテスト計画。品質保証と継続的な開発を支援するため、
ユニットテスト、APIテスト、統合テストを実施する。

## 2. テスト環境

- **テストフレームワーク**: Jest
- **UIテスト**: React Testing Library
- **モック**: Jest Mock Functions
- **カバレッジ**: Jest Coverage Reporter

## 3. テスト対象

### 3.1 優先度: 高

| カテゴリ | 対象 | テスト内容 |
|---------|------|-----------|
| 認証 | `lib/session.ts` | セッション取得、権限チェック、ロール権限検証 |
| API | `/api/tasks` | CRUD操作、認可チェック |
| API | `/api/auth` | ログイン、ログアウト |
| ロール | 権限マトリクス | ロールベースのアクセス制御 |

### 3.2 優先度: 中

| カテゴリ | 対象 | テスト内容 |
|---------|------|-----------|
| API | `/api/users` | ユーザーCRUD、ロール割り当て |
| API | `/api/companies` | 企業CRUD |
| API | `/api/roles` | ロールCRUD |
| DB | `lib/db.ts` | データベース操作関数 |

### 3.3 優先度: 低

| カテゴリ | 対象 | テスト内容 |
|---------|------|-----------|
| Webhook | 各種連携 | Chatwork, Teams, Lark, Slack |
| AI | `lib/gemini.ts` | タスク判定ロジック |

## 4. テストケース詳細

### 4.1 認証・認可テスト (`lib/session.ts`)

```
describe('getSession')
  - 認証済みユーザーのセッション取得
  - 未認証時のnull返却

describe('requireAuth')
  - 認証済み: ユーザー情報返却
  - 未認証: 401エラー

describe('requireAdmin')
  - admin/system_admin: 成功
  - 一般ユーザー: 403エラー

describe('checkTaskPermission')
  - 管理者: 全権限
  - ロールあり: ロールに基づく権限
  - ロールなし: 権限なし

describe('filterTasksByPermission')
  - 管理者: 全タスク表示
  - 一般ユーザー: 許可されたルームのみ
```

### 4.2 タスクAPIテスト (`/api/tasks`)

```
describe('GET /api/tasks')
  - 認証必須チェック
  - ロールによるフィルタリング
  - ステータスフィルタ (pending/in_progress/completed)

describe('POST /api/tasks')
  - 管理者: タスク作成成功
  - 一般ユーザー: 403エラー
  - バリデーションエラー

describe('PATCH /api/tasks/[id]')
  - 権限あり: ステータス更新成功
  - 権限なし: 403エラー
  - 存在しないタスク: 404エラー

describe('DELETE /api/tasks/[id]')
  - 権限あり: 削除成功
  - 権限なし: 403エラー
```

### 4.3 ユーザーAPIテスト (`/api/users`)

```
describe('GET /api/users')
  - 管理者: ユーザー一覧取得
  - 一般ユーザー: 403エラー

describe('POST /api/users')
  - 有効なデータ: ユーザー作成
  - 重複メール: エラー
  - パスワードバリデーション

describe('PATCH /api/users/[id]')
  - ロール割り当て更新
  - 自分自身の無効化防止

describe('GET /api/users/[id]/roles')
  - ユーザーのロール取得
```

### 4.4 ロールAPIテスト (`/api/roles`)

```
describe('GET /api/roles')
  - 企業のロール一覧取得

describe('POST /api/roles')
  - ロール作成
  - 権限マトリクス設定

describe('PATCH /api/roles')
  - ユーザーへのロール割り当て
  - 複数ロールの一括更新
```

## 5. モック戦略

### 5.1 データベースモック
- `@vercel/postgres`をモック
- テストデータをメモリ上で管理

### 5.2 認証モック
- `next-auth`のgetServerSessionをモック
- テスト用セッションデータを注入

### 5.3 外部APIモック
- Gemini API: 固定レスポンス返却
- Webhook: リクエスト検証のみ

## 6. 実行計画

### Phase 1: 環境構築
- [ ] Jest + React Testing Library インストール
- [ ] Jest設定ファイル作成
- [ ] モックユーティリティ作成

### Phase 2: コアテスト実装
- [ ] `lib/session.ts` テスト
- [ ] `/api/tasks` テスト
- [ ] 権限チェックテスト

### Phase 3: 拡張テスト
- [ ] `/api/users` テスト
- [ ] `/api/roles` テスト
- [ ] `/api/companies` テスト

### Phase 4: CI統合
- [ ] GitHub Actions設定
- [ ] カバレッジレポート

## 7. 成功基準

- テストカバレッジ: 70%以上
- 全テストパス
- クリティカルパス（認証・認可）: 90%カバレッジ

## 8. ディレクトリ構成

```
__tests__/
├── lib/
│   ├── session.test.ts      # セッション・権限テスト
│   └── db.test.ts           # DBユーティリティテスト
├── api/
│   ├── tasks.test.ts        # タスクAPIテスト
│   ├── users.test.ts        # ユーザーAPIテスト
│   └── roles.test.ts        # ロールAPIテスト
├── mocks/
│   ├── db.ts                # DBモック
│   ├── session.ts           # セッションモック
│   └── handlers.ts          # APIモックハンドラ
└── setup.ts                 # テストセットアップ
```
