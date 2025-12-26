'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect } from 'react'

type Tab = 'chatwork' | 'teams' | 'lark' | 'slack' | 'line'

const tabColors = {
  chatwork: {
    active: 'border-red-600 text-red-600',
    dot: 'bg-red-500',
  },
  teams: {
    active: 'border-purple-600 text-purple-600',
    dot: 'bg-purple-500',
  },
  lark: {
    active: 'border-blue-600 text-blue-600',
    dot: 'bg-blue-500',
  },
  slack: {
    active: 'border-pink-600 text-pink-600',
    dot: 'bg-pink-500',
  },
  line: {
    active: 'border-emerald-600 text-emerald-600',
    dot: 'bg-emerald-500',
  },
}

const tabLabels = {
  chatwork: 'Chatwork',
  teams: 'Microsoft Teams',
  lark: 'Lark',
  slack: 'Slack',
  line: 'LINE',
}

export default function UsagePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [activeTab, setActiveTab] = useState<Tab>('chatwork')

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    // 自社のslugと一致するか確認
    if (session?.user?.companySlug !== slug) {
      router.push('/login')
      return
    }
  }, [session, status, slug, router])

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">利用方法</h1>
        <p className="text-gray-600 mt-1">
          メッセージにキーワードを含めると、自動でタスクとして登録されます
        </p>
      </div>

      {/* 共通ルール */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">基本ルール（全メッセンジャー共通）</h2>
        <p className="text-gray-600 mb-4">
          以下のキーワードをメッセージの先頭に付けて送信すると、タスクとして自動登録されます。
        </p>

        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-red-50 rounded-lg">
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded font-bold text-sm whitespace-nowrap">
              高優先度
            </span>
            <div>
              <code className="text-lg font-mono bg-white px-2 py-1 rounded border">【緊急】</code>
              <p className="text-gray-600 mt-2">
                緊急対応が必要なタスクに使用します
              </p>
              <p className="text-sm text-gray-500 mt-1">
                例: <code className="bg-gray-100 px-1 rounded">【緊急】サーバーがダウンしています</code>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-yellow-50 rounded-lg">
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded font-bold text-sm whitespace-nowrap">
              中優先度
            </span>
            <div>
              <code className="text-lg font-mono bg-white px-2 py-1 rounded border">【依頼】</code>
              <p className="text-gray-600 mt-2">
                通常の依頼・タスクに使用します
              </p>
              <p className="text-sm text-gray-500 mt-1">
                例: <code className="bg-gray-100 px-1 rounded">【依頼】見積書の作成をお願いします</code>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded font-bold text-sm whitespace-nowrap">
              低優先度
            </span>
            <div>
              <code className="text-lg font-mono bg-white px-2 py-1 rounded border">【確認】</code>
              <p className="text-gray-600 mt-2">
                確認事項や低優先度のタスクに使用します
              </p>
              <p className="text-sm text-gray-500 mt-1">
                例: <code className="bg-gray-100 px-1 rounded">【確認】来週の会議の日程を教えてください</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* メッセンジャー別タブ */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6 pt-4">
            {(Object.keys(tabLabels) as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? tabColors[tab].active
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${tabColors[tab].dot}`}></span>
                  {tabLabels[tab]}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'chatwork' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Chatworkでの使い方</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium mb-2">送信方法</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>監視対象に設定されたグループチャットを開く</li>
                  <li>メッセージ入力欄にキーワード付きでメッセージを入力</li>
                  <li>送信ボタンをクリック</li>
                </ol>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-medium text-red-800 mb-2">入力例</p>
                <div className="bg-white rounded p-3 font-mono text-sm">
                  【依頼】来週の定例会議の資料を準備してください
                </div>
              </div>
              <div className="text-sm text-gray-500">
                ※ タスクはダッシュボードに自動で表示されます
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Microsoft Teamsでの使い方</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium mb-2">送信方法</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>監視対象に設定されたチャネルを開く</li>
                  <li>メッセージ入力欄にキーワード付きでメッセージを入力</li>
                  <li>Enterキーまたは送信ボタンで送信</li>
                </ol>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="font-medium text-purple-800 mb-2">入力例</p>
                <div className="bg-white rounded p-3 font-mono text-sm">
                  【緊急】クライアントからの問い合わせに至急対応が必要です
                </div>
              </div>
              <div className="text-sm text-gray-500">
                ※ Outgoing Webhookが設定されているチャネルでのみ動作します
              </div>
            </div>
          )}

          {activeTab === 'lark' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Larkでの使い方</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium mb-2">送信方法</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>監視対象に設定されたグループチャットを開く</li>
                  <li>メッセージ入力欄にキーワード付きでメッセージを入力</li>
                  <li>送信ボタンをクリック</li>
                </ol>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-medium text-blue-800 mb-2">入力例</p>
                <div className="bg-white rounded p-3 font-mono text-sm">
                  【確認】プロジェクトの進捗状況を共有してください
                </div>
              </div>
              <div className="text-sm text-gray-500">
                ※ ボットがグループに追加されている必要があります
              </div>
            </div>
          )}

          {activeTab === 'slack' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Slackでの使い方</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium mb-2">送信方法</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>監視対象に設定されたチャンネルを開く</li>
                  <li>メッセージ入力欄にキーワード付きでメッセージを入力</li>
                  <li>Enterキーで送信</li>
                </ol>
              </div>
              <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                <p className="font-medium text-pink-800 mb-2">入力例</p>
                <div className="bg-white rounded p-3 font-mono text-sm">
                  【依頼】新機能のデザインレビューをお願いします
                </div>
              </div>
              <div className="text-sm text-gray-500">
                ※ アプリがチャンネルに追加されている必要があります
              </div>
            </div>
          )}

          {activeTab === 'line' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">LINEでの使い方</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium mb-2">送信方法</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-600">
                  <li>公式アカウントが参加しているグループを開く</li>
                  <li>メッセージ入力欄にキーワード付きでメッセージを入力</li>
                  <li>送信ボタンをタップ</li>
                </ol>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="font-medium text-emerald-800 mb-2">入力例</p>
                <div className="bg-white rounded p-3 font-mono text-sm">
                  【緊急】明日の打ち合わせの資料を今日中に送ってください
                </div>
              </div>
              <div className="text-sm text-gray-500">
                ※ 公式アカウントがグループに招待され、管理者に承認されている必要があります
              </div>
            </div>
          )}
        </div>
      </div>

      {/* よくある質問 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">よくある質問</h2>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900">Q. キーワードは大文字・小文字を区別しますか？</p>
            <p className="text-gray-600 mt-1">
              A. いいえ。【緊急】【依頼】【確認】は全角の墨付き括弧を使用してください。
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Q. キーワードはメッセージの途中に書いても認識されますか？</p>
            <p className="text-gray-600 mt-1">
              A. はい、メッセージ内のどこに書いても認識されます。ただし、わかりやすさのため先頭に書くことをお勧めします。
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Q. タスクが登録されたかどうかはどこで確認できますか？</p>
            <p className="text-gray-600 mt-1">
              A. ダッシュボードで確認できます。ヘッダーの「ダッシュボード」をクリックしてください。
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Q. どのグループ/チャンネルが監視対象ですか？</p>
            <p className="text-gray-600 mt-1">
              A. 管理者が設定したグループ/チャンネルのみが監視対象です。詳しくは管理者にお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
