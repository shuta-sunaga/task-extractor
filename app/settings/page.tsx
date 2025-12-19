'use client'

import { useEffect, useState } from 'react'

type Room = {
  id: number
  room_id: string
  room_name: string
  is_active: boolean
}

type Settings = {
  chatwork_api_token: string
  webhook_token: string
  has_token: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    chatwork_api_token: '',
    webhook_token: '',
    has_token: false,
  })
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apiToken, setApiToken] = useState('')
  const [webhookToken, setWebhookToken] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [settingsRes, roomsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/rooms'),
      ])

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data)
        setWebhookToken(data.webhook_token || '')
      }

      if (roomsRes.ok) {
        const data = await roomsRes.json()
        setRooms(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    if (!apiToken && !settings.has_token) {
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
        setMessage('設定を保存しました')
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

  async function toggleRoom(roomId: string, isActive: boolean) {
    try {
      const res = await fetch('/api/rooms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, isActive }),
      })

      if (res.ok) {
        setRooms(rooms.map(room =>
          room.room_id === roomId ? { ...room, is_active: isActive } : room
        ))
      }
    } catch (error) {
      console.error('Failed to update room:', error)
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

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/chatwork`
    : ''

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">設定</h1>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('失敗') || message.includes('エラー')
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      {/* DB初期化 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">データベース</h2>
        <p className="text-sm text-gray-600 mb-4">
          初回利用時や、テーブルが存在しない場合は初期化を実行してください。
        </p>
        <button
          onClick={initDatabase}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          データベースを初期化
        </button>
      </div>

      {/* Chatwork API設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Chatwork API設定</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              APIトークン
            </label>
            {settings.has_token && (
              <p className="text-sm text-green-600 mb-2">
                現在のトークン: {settings.chatwork_api_token}
              </p>
            )}
            <input
              type="password"
              value={apiToken}
              onChange={e => setApiToken(e.target.value)}
              placeholder={settings.has_token ? '新しいトークンを入力（変更する場合）' : 'APIトークンを入力'}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Chatwork Webhook編集画面で表示されるトークンを入力してください
            </p>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
            value={webhookUrl}
            readOnly
            className="flex-1 px-4 py-2 border rounded-lg bg-gray-50"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(webhookUrl)
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

        {rooms.length === 0 ? (
          <p className="text-gray-500">
            ルームがありません。APIトークンを設定して保存すると、ルーム一覧が表示されます。
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {rooms.map(room => (
              <label
                key={room.room_id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={room.is_active}
                  onChange={e => toggleRoom(room.room_id, e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-900">{room.room_name}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
