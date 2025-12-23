'use client'

import { useEffect, useState } from 'react'

type Room = {
  id: number
  room_id: string
  room_name: string
  is_active: boolean
  source: 'chatwork' | 'teams'
}

type Settings = {
  chatwork_api_token: string
  webhook_token: string
  teams_webhook_secret: string
  has_chatwork_token: boolean
  has_teams_secret: boolean
  notification_emails: string[]
  notify_on_create: boolean
  notify_on_complete: boolean
  notify_on_delete: boolean
}

type Tab = 'general' | 'chatwork' | 'teams'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [settings, setSettings] = useState<Settings>({
    chatwork_api_token: '',
    webhook_token: '',
    teams_webhook_secret: '',
    has_chatwork_token: false,
    has_teams_secret: false,
    notification_emails: [],
    notify_on_create: true,
    notify_on_complete: true,
    notify_on_delete: false,
  })
  const [chatworkRooms, setChatworkRooms] = useState<Room[]>([])
  const [teamsRooms, setTeamsRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Chatwork用
  const [apiToken, setApiToken] = useState('')
  const [webhookToken, setWebhookToken] = useState('')

  // Teams用
  const [teamsSecret, setTeamsSecret] = useState('')
  const [newChannelId, setNewChannelId] = useState('')
  const [newChannelName, setNewChannelName] = useState('')

  // 通知設定用
  const [newEmail, setNewEmail] = useState('')
  const [notificationEmails, setNotificationEmails] = useState<string[]>([])
  const [notifyOnCreate, setNotifyOnCreate] = useState(true)
  const [notifyOnComplete, setNotifyOnComplete] = useState(true)
  const [notifyOnDelete, setNotifyOnDelete] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [settingsRes, chatworkRoomsRes, teamsRoomsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/rooms?source=chatwork'),
        fetch('/api/rooms?source=teams'),
      ])

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data)
        setWebhookToken(data.webhook_token || '')
        setNotificationEmails(data.notification_emails || [])
        setNotifyOnCreate(data.notify_on_create ?? true)
        setNotifyOnComplete(data.notify_on_complete ?? true)
        setNotifyOnDelete(data.notify_on_delete ?? false)
      }

      if (chatworkRoomsRes.ok) {
        const data = await chatworkRoomsRes.json()
        setChatworkRooms(Array.isArray(data) ? data : [])
      }

      if (teamsRoomsRes.ok) {
        const data = await teamsRoomsRes.json()
        setTeamsRooms(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveChatworkSettings() {
    if (!apiToken && !settings.has_chatwork_token) {
      setMessage('APIトークンを入力してください')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatworkApiToken: apiToken || undefined,
          webhookToken,
        }),
      })

      if (res.ok) {
        setMessage('Chatwork設定を保存しました')
        setApiToken('')
        fetchData()
      } else {
        setMessage('保存に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  async function saveTeamsSettings() {
    if (!teamsSecret && !settings.has_teams_secret) {
      setMessage('Webhookシークレットを入力してください')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamsWebhookSecret: teamsSecret || undefined,
        }),
      })

      if (res.ok) {
        setMessage('Teams設定を保存しました')
        setTeamsSecret('')
        fetchData()
      } else {
        setMessage('保存に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  async function toggleRoom(roomId: string, isActive: boolean, source: 'chatwork' | 'teams') {
    try {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, isActive, source }),
      })

      if (res.ok) {
        if (source === 'chatwork') {
          setChatworkRooms(chatworkRooms.map(room =>
            room.room_id === roomId ? { ...room, is_active: isActive } : room
          ))
        } else {
          setTeamsRooms(teamsRooms.map(room =>
            room.room_id === roomId ? { ...room, is_active: isActive } : room
          ))
        }
      }
    } catch (error) {
      console.error('Failed to update room:', error)
    }
  }

  async function addTeamsChannel() {
    if (!newChannelId || !newChannelName) {
      setMessage('チャネルIDと名前を入力してください')
      return
    }

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: newChannelId,
          roomName: newChannelName,
          source: 'teams',
        }),
      })

      if (res.ok) {
        setMessage('チャネルを追加しました')
        setNewChannelId('')
        setNewChannelName('')
        fetchData()
      } else {
        setMessage('チャネルの追加に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    }
  }

  async function deleteTeamsChannel(roomId: string) {
    try {
      const res = await fetch(`/api/rooms?roomId=${encodeURIComponent(roomId)}&source=teams`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMessage('チャネルを削除しました')
        setTeamsRooms(teamsRooms.filter(room => room.room_id !== roomId))
      } else {
        setMessage('削除に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    }
  }

  function addEmail() {
    const email = newEmail.trim()
    if (!email) return

    // 簡易的なメールアドレスバリデーション
    if (!email.includes('@')) {
      setMessage('有効なメールアドレスを入力してください')
      return
    }

    if (notificationEmails.includes(email)) {
      setMessage('このメールアドレスは既に追加されています')
      return
    }

    setNotificationEmails([...notificationEmails, email])
    setNewEmail('')
  }

  function removeEmail(email: string) {
    setNotificationEmails(notificationEmails.filter(e => e !== email))
  }

  async function saveNotificationSettings() {
    setSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationEmails,
          notifyOnCreate,
          notifyOnComplete,
          notifyOnDelete,
        }),
      })

      if (res.ok) {
        setMessage('通知設定を保存しました')
        fetchData()
      } else {
        setMessage('保存に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  async function initDatabase() {
    try {
      const res = await fetch('/api/init')
      if (res.ok) {
        setMessage('データベースを初期化しました')
      } else {
        setMessage('初期化に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    }
  }

  const chatworkWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/chatwork`
    : ''

  const teamsWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/teams`
    : ''

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <button
          onClick={initDatabase}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          DB初期化
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('失敗') || message.includes('エラー')
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              全般
            </span>
          </button>
          <button
            onClick={() => setActiveTab('chatwork')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'chatwork'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Chatwork
            </span>
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'teams'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              Microsoft Teams
            </span>
          </button>
        </nav>
      </div>

      {/* 全般タブ */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* メール通知設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">メール通知設定</h2>
            <p className="text-sm text-gray-600 mb-4">
              タスクの作成・完了・削除時にメールで通知を受け取ることができます。
            </p>

            <div className="space-y-6">
              {/* メールアドレス追加 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  通知先メールアドレス
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addEmail()}
                    placeholder="example@email.com"
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <button
                    onClick={addEmail}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                  >
                    追加
                  </button>
                </div>

                {/* 登録済みメールアドレス一覧 */}
                {notificationEmails.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    通知先メールアドレスが登録されていません
                  </p>
                ) : (
                  <div className="space-y-2">
                    {notificationEmails.map(email => (
                      <div
                        key={email}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-gray-900">{email}</span>
                        <button
                          onClick={() => removeEmail(email)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 通知タイミング設定 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  通知タイミング
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyOnCreate}
                      onChange={e => setNotifyOnCreate(e.target.checked)}
                      className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <div>
                      <span className="text-gray-900">タスク作成時</span>
                      <p className="text-sm text-gray-500">新しいタスクが登録されたときに通知</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyOnComplete}
                      onChange={e => setNotifyOnComplete(e.target.checked)}
                      className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <div>
                      <span className="text-gray-900">タスク完了時</span>
                      <p className="text-sm text-gray-500">タスクが完了になったときに通知</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifyOnDelete}
                      onChange={e => setNotifyOnDelete(e.target.checked)}
                      className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <div>
                      <span className="text-gray-900">タスク削除時</span>
                      <p className="text-sm text-gray-500">タスクが削除されたときに通知</p>
                    </div>
                  </label>
                </div>
              </div>

              <button
                onClick={saveNotificationSettings}
                disabled={saving}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '設定を保存'}
              </button>
            </div>
          </div>

          {/* Resend設定案内 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">メール送信サービス設定</h2>
            <p className="text-sm text-gray-600 mb-4">
              メール通知にはResendを使用しています。環境変数に以下を設定してください：
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <code className="text-sm text-gray-800">RESEND_API_KEY=re_xxxxxxxxxx</code>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              <a
                href="https://resend.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:underline"
              >
                Resend
              </a>
              で無料アカウントを作成し、APIキーを取得してください。
            </p>
          </div>
        </div>
      )}

      {/* Chatwork タブ */}
      {activeTab === 'chatwork' && (
        <div className="space-y-6">
          {/* Chatwork API設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Chatwork API設定</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  APIトークン
                </label>
                {settings.has_chatwork_token && (
                  <p className="text-sm text-green-600 mb-2">
                    現在のトークン: {settings.chatwork_api_token}
                  </p>
                )}
                <input
                  type="password"
                  value={apiToken}
                  onChange={e => setApiToken(e.target.value)}
                  placeholder={settings.has_chatwork_token ? '新しいトークンを入力（変更する場合）' : 'APIトークンを入力'}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Chatwork管理画面 → サービス連携 → APIトークン から取得できます
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhookトークン
                </label>
                <input
                  type="text"
                  value={webhookToken}
                  onChange={e => setWebhookToken(e.target.value)}
                  placeholder="Webhook設定画面のトークンを入力"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Chatwork Webhook編集画面で表示されるトークンを入力してください
                </p>
              </div>

              <button
                onClick={saveChatworkSettings}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '設定を保存'}
              </button>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Webhook URL</h2>
            <p className="text-sm text-gray-600 mb-4">
              このURLをChatworkのWebhook設定画面に登録してください。
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatworkWebhookUrl}
                readOnly
                className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(chatworkWebhookUrl)
                  setMessage('URLをコピーしました')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                コピー
              </button>
            </div>
          </div>

          {/* 監視ルーム設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">監視するルーム</h2>
            <p className="text-sm text-gray-600 mb-4">
              タスクを抽出したいルームにチェックを入れてください。
            </p>

            {chatworkRooms.length === 0 ? (
              <p className="text-gray-500">
                ルームがありません。APIトークンを設定して保存すると、ルーム一覧が表示されます。
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {chatworkRooms.map(room => (
                  <label
                    key={room.room_id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={room.is_active}
                      onChange={e => toggleRoom(room.room_id, e.target.checked, 'chatwork')}
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-gray-900">{room.room_name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teams タブ */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          {/* Teams Webhook設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Teams Webhook設定</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhookシークレット
                </label>
                {settings.has_teams_secret && (
                  <p className="text-sm text-purple-600 mb-2">
                    現在のシークレット: {settings.teams_webhook_secret}
                  </p>
                )}
                <input
                  type="password"
                  value={teamsSecret}
                  onChange={e => setTeamsSecret(e.target.value)}
                  placeholder={settings.has_teams_secret ? '新しいシークレットを入力（変更する場合）' : 'シークレットを入力'}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  TeamsでOutgoing Webhook作成時に表示されるセキュリティトークンを入力してください
                </p>
              </div>

              <button
                onClick={saveTeamsSettings}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '設定を保存'}
              </button>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Webhook URL</h2>
            <p className="text-sm text-gray-600 mb-4">
              このURLをTeamsのOutgoing Webhook設定に登録してください。
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={teamsWebhookUrl}
                readOnly
                className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(teamsWebhookUrl)
                  setMessage('URLをコピーしました')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                コピー
              </button>
            </div>
          </div>

          {/* チャネル手動登録 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">チャネルを登録</h2>
            <p className="text-sm text-gray-600 mb-4">
              監視したいTeamsチャネルのIDと名前を入力して登録してください。
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newChannelId}
                onChange={e => setNewChannelId(e.target.value)}
                placeholder="チャネルID（conversation.id）"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <input
                type="text"
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                placeholder="チャネル名"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <button
                onClick={addTeamsChannel}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                追加
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              チャネルIDはWebhookの初回受信時にログで確認できます。
            </p>
          </div>

          {/* 監視チャネル設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">監視するチャネル</h2>

            {teamsRooms.length === 0 ? (
              <p className="text-gray-500">
                チャネルがありません。上のフォームからチャネルを追加してください。
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {teamsRooms.map(room => (
                  <div
                    key={room.room_id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={room.is_active}
                      onChange={e => toggleRoom(room.room_id, e.target.checked, 'teams')}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="flex-1 text-gray-900">{room.room_name}</span>
                    <span className="text-xs text-gray-400 truncate max-w-xs" title={room.room_id}>
                      {room.room_id.slice(0, 20)}...
                    </span>
                    <button
                      onClick={() => deleteTeamsChannel(room.room_id)}
                      className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
