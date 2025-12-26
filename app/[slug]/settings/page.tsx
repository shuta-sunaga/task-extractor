'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'

type Room = {
  id: number
  room_id: string
  room_name: string
  is_active: boolean
  source: 'chatwork' | 'teams' | 'lark' | 'slack' | 'line'
  workspace_id?: string
}

type SlackWorkspace = {
  id: number
  workspace_id: string
  workspace_name: string
  bot_token: string
  signing_secret: string
  is_active: boolean
  channel_count: number
  active_channel_count: number
}

type Settings = {
  chatwork_api_token: string
  webhook_token: string
  teams_webhook_secret: string
  has_chatwork_token: boolean
  has_teams_secret: boolean
  lark_app_id: string
  lark_verification_token: string
  has_lark_settings: boolean
  line_channel_secret: string
  line_access_token: string
  has_line_settings: boolean
  notification_emails: string[]
  notify_on_create: boolean
  notify_on_complete: boolean
  notify_on_delete: boolean
  resend_api_key: string
  has_resend_key: boolean
}

type Tab = 'general' | 'chatwork' | 'teams' | 'lark' | 'slack' | 'line'

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [accessDenied, setAccessDenied] = useState(false)

  // 各タブのデータ読み込み状態
  const [loadedTabs, setLoadedTabs] = useState<Set<Tab>>(new Set(['general']))
  const [tabLoading, setTabLoading] = useState<Tab | null>(null)

  const [settings, setSettings] = useState<Settings>({
    chatwork_api_token: '',
    webhook_token: '',
    teams_webhook_secret: '',
    has_chatwork_token: false,
    has_teams_secret: false,
    lark_app_id: '',
    lark_verification_token: '',
    has_lark_settings: false,
    line_channel_secret: '',
    line_access_token: '',
    has_line_settings: false,
    notification_emails: [],
    notify_on_create: true,
    notify_on_complete: true,
    notify_on_delete: false,
    resend_api_key: '',
    has_resend_key: false,
  })
  const [chatworkRooms, setChatworkRooms] = useState<Room[]>([])
  const [teamsRooms, setTeamsRooms] = useState<Room[]>([])
  const [larkRooms, setLarkRooms] = useState<Room[]>([])
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

  // Lark用
  const [larkAppId, setLarkAppId] = useState('')
  const [larkAppSecret, setLarkAppSecret] = useState('')
  const [larkVerificationToken, setLarkVerificationToken] = useState('')
  const [larkEncryptKey, setLarkEncryptKey] = useState('')
  const [showLarkSecret, setShowLarkSecret] = useState(false)
  const [newLarkChatId, setNewLarkChatId] = useState('')
  const [newLarkChatName, setNewLarkChatName] = useState('')

  // LINE用
  const [lineChannelSecret, setLineChannelSecret] = useState('')
  const [lineAccessToken, setLineAccessToken] = useState('')
  const [showLineSecret, setShowLineSecret] = useState(false)
  const [lineGroups, setLineGroups] = useState<Room[]>([])

  // Slack用
  const [slackWorkspaces, setSlackWorkspaces] = useState<SlackWorkspace[]>([])
  const [newWorkspaceId, setNewWorkspaceId] = useState('')
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newBotToken, setNewBotToken] = useState('')
  const [newSigningSecret, setNewSigningSecret] = useState('')
  const [showSlackSecrets, setShowSlackSecrets] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null)
  const [slackChannels, setSlackChannels] = useState<Room[]>([])
  const [newSlackChannelId, setNewSlackChannelId] = useState('')
  const [newSlackChannelName, setNewSlackChannelName] = useState('')

  // 通知設定用
  const [newEmail, setNewEmail] = useState('')
  const [notificationEmails, setNotificationEmails] = useState<string[]>([])
  const [notifyOnCreate, setNotifyOnCreate] = useState(true)
  const [notifyOnComplete, setNotifyOnComplete] = useState(true)
  const [notifyOnDelete, setNotifyOnDelete] = useState(false)
  const [resendApiKey, setResendApiKey] = useState('')
  const [showResendKey, setShowResendKey] = useState(false)

  // 企業Webhook設定
  const [companyWebhookToken, setCompanyWebhookToken] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStatus === 'loading') return

    if (sessionStatus === 'unauthenticated') {
      router.push('/login')
      return
    }

    // システム管理者はこのページにアクセスできない
    if (session?.user?.userType === 'system_admin') {
      router.push('/system-admin')
      return
    }

    // 管理者のみアクセス可能
    if (session?.user?.userType !== 'admin') {
      router.push(`/${slug}`)
      return
    }

    // 自社のslugと一致するか確認
    if (session?.user?.companySlug !== slug) {
      setAccessDenied(true)
      setLoading(false)
      return
    }

    fetchInitialData()
  }, [session, sessionStatus, slug, router])

  // 初回読み込み: 設定 + 企業情報のみ
  async function fetchInitialData() {
    try {
      const [settingsRes, companyRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/companies/me'),
      ])

      if (companyRes.ok) {
        const companyData = await companyRes.json()
        setCompanyWebhookToken(companyData.webhook_token || null)
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data)
        setWebhookToken(data.webhook_token || '')
        setNotificationEmails(data.notification_emails || [])
        setNotifyOnCreate(data.notify_on_create ?? true)
        setNotifyOnComplete(data.notify_on_complete ?? true)
        setNotifyOnDelete(data.notify_on_delete ?? false)
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  // タブ別データ取得
  async function fetchTabData(tab: Tab) {
    if (loadedTabs.has(tab)) return

    setTabLoading(tab)
    try {
      switch (tab) {
        case 'chatwork': {
          const res = await fetch('/api/rooms?source=chatwork')
          if (res.ok) {
            const data = await res.json()
            setChatworkRooms(Array.isArray(data) ? data : [])
          }
          break
        }
        case 'teams': {
          const res = await fetch('/api/rooms?source=teams')
          if (res.ok) {
            const data = await res.json()
            setTeamsRooms(Array.isArray(data) ? data : [])
          }
          break
        }
        case 'lark': {
          const res = await fetch('/api/rooms?source=lark')
          if (res.ok) {
            const data = await res.json()
            setLarkRooms(Array.isArray(data) ? data : [])
          }
          break
        }
        case 'slack': {
          const res = await fetch('/api/slack/workspaces')
          if (res.ok) {
            const data = await res.json()
            setSlackWorkspaces(Array.isArray(data) ? data : [])
          }
          break
        }
        case 'line': {
          const res = await fetch('/api/rooms?source=line')
          if (res.ok) {
            const data = await res.json()
            setLineGroups(Array.isArray(data) ? data : [])
          }
          break
        }
      }
      setLoadedTabs(prev => new Set([...prev, tab]))
    } catch (error) {
      console.error(`Failed to fetch ${tab} data:`, error)
    } finally {
      setTabLoading(null)
    }
  }

  // タブ切り替え時にデータ取得
  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
    if (tab !== 'general') {
      fetchTabData(tab)
    }
  }

  // Slack functions
  async function addSlackWorkspace() {
    if (!newWorkspaceId || !newWorkspaceName || !newBotToken || !newSigningSecret) {
      setMessage('すべての項目を入力してください')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/slack/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: newWorkspaceId,
          workspaceName: newWorkspaceName,
          botToken: newBotToken,
          signingSecret: newSigningSecret,
        }),
      })

      if (res.ok) {
        setMessage('ワークスペースを追加しました')
        setNewWorkspaceId('')
        setNewWorkspaceName('')
        setNewBotToken('')
        setNewSigningSecret('')
        // Slack タブのデータを再取得
        setLoadedTabs(prev => {
          const next = new Set(prev)
          next.delete('slack')
          return next
        })
        fetchTabData('slack')
      } else {
        setMessage('ワークスペースの追加に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSlackWorkspace(workspaceId: string) {
    if (!confirm('このワークスペースを削除しますか？関連するチャンネルも削除されます。')) return

    try {
      const res = await fetch(`/api/slack/workspaces?workspaceId=${encodeURIComponent(workspaceId)}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMessage('ワークスペースを削除しました')
        setSlackWorkspaces(slackWorkspaces.filter(w => w.workspace_id !== workspaceId))
        if (selectedWorkspace === workspaceId) {
          setSelectedWorkspace(null)
          setSlackChannels([])
        }
      } else {
        setMessage('削除に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    }
  }

  async function toggleSlackWorkspace(workspaceId: string, isActive: boolean) {
    try {
      const res = await fetch('/api/slack/workspaces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, isActive }),
      })

      if (res.ok) {
        setSlackWorkspaces(slackWorkspaces.map(w =>
          w.workspace_id === workspaceId ? { ...w, is_active: isActive } : w
        ))
      }
    } catch (error) {
      console.error('Failed to toggle workspace:', error)
    }
  }

  async function fetchSlackChannels(workspaceId: string) {
    try {
      const res = await fetch(`/api/slack/channels?workspaceId=${encodeURIComponent(workspaceId)}`)
      if (res.ok) {
        const data = await res.json()
        setSlackChannels(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error)
    }
  }

  async function addSlackChannel() {
    if (!selectedWorkspace || !newSlackChannelId || !newSlackChannelName) {
      setMessage('チャンネルIDと名前を入力してください')
      return
    }

    try {
      const res = await fetch('/api/slack/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: newSlackChannelId,
          channelName: newSlackChannelName,
          workspaceId: selectedWorkspace,
        }),
      })

      if (res.ok) {
        setMessage('チャンネルを追加しました')
        setNewSlackChannelId('')
        setNewSlackChannelName('')
        fetchSlackChannels(selectedWorkspace)
        // ワークスペース一覧のチャンネル数を更新するため再取得
        setLoadedTabs(prev => {
          const next = new Set(prev)
          next.delete('slack')
          return next
        })
        fetchTabData('slack')
      } else {
        setMessage('チャンネルの追加に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    }
  }

  async function toggleSlackChannel(channelId: string, isActive: boolean) {
    try {
      const res = await fetch('/api/slack/channels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, isActive }),
      })

      if (res.ok) {
        setSlackChannels(slackChannels.map(c =>
          c.room_id === channelId ? { ...c, is_active: isActive } : c
        ))
      }
    } catch (error) {
      console.error('Failed to toggle channel:', error)
    }
  }

  async function deleteSlackChannel(channelId: string) {
    try {
      const res = await fetch(`/api/slack/channels?channelId=${encodeURIComponent(channelId)}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMessage('チャンネルを削除しました')
        setSlackChannels(slackChannels.filter(c => c.room_id !== channelId))
      } else {
        setMessage('削除に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
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
        // 設定を再取得
        fetchInitialData()
        // Chatworkタブのデータを再取得
        setLoadedTabs(prev => {
          const next = new Set(prev)
          next.delete('chatwork')
          return next
        })
        fetchTabData('chatwork')
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
        // 設定を再取得
        fetchInitialData()
      } else {
        setMessage('保存に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  async function toggleRoom(roomId: string, isActive: boolean, source: 'chatwork' | 'teams' | 'lark' | 'line') {
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
        } else if (source === 'teams') {
          setTeamsRooms(teamsRooms.map(room =>
            room.room_id === roomId ? { ...room, is_active: isActive } : room
          ))
        } else if (source === 'lark') {
          setLarkRooms(larkRooms.map(room =>
            room.room_id === roomId ? { ...room, is_active: isActive } : room
          ))
        } else if (source === 'line') {
          setLineGroups(lineGroups.map(room =>
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
        // Teamsタブのデータを再取得
        setLoadedTabs(prev => {
          const next = new Set(prev)
          next.delete('teams')
          return next
        })
        fetchTabData('teams')
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

  async function saveLarkSettings() {
    if (!larkAppId && !settings.has_lark_settings) {
      setMessage('App IDを入力してください')
      return
    }
    if (!larkVerificationToken && !settings.has_lark_settings) {
      setMessage('Verification Tokenを入力してください')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          larkAppId: larkAppId || undefined,
          larkAppSecret: larkAppSecret || undefined,
          larkVerificationToken: larkVerificationToken || undefined,
          larkEncryptKey: larkEncryptKey || undefined,
        }),
      })

      if (res.ok) {
        setMessage('Lark設定を保存しました')
        setLarkAppId('')
        setLarkAppSecret('')
        setLarkVerificationToken('')
        setLarkEncryptKey('')
        // 設定を再取得
        fetchInitialData()
      } else {
        setMessage('保存に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  async function addLarkChat() {
    if (!newLarkChatId || !newLarkChatName) {
      setMessage('チャットIDと名前を入力してください')
      return
    }

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: newLarkChatId,
          roomName: newLarkChatName,
          source: 'lark',
        }),
      })

      if (res.ok) {
        setMessage('チャットを追加しました')
        setNewLarkChatId('')
        setNewLarkChatName('')
        // Larkタブのデータを再取得
        setLoadedTabs(prev => {
          const next = new Set(prev)
          next.delete('lark')
          return next
        })
        fetchTabData('lark')
      } else {
        setMessage('チャットの追加に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    }
  }

  async function deleteLarkChat(roomId: string) {
    try {
      const res = await fetch(`/api/rooms?roomId=${encodeURIComponent(roomId)}&source=lark`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMessage('チャットを削除しました')
        setLarkRooms(larkRooms.filter(room => room.room_id !== roomId))
      } else {
        setMessage('削除に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    }
  }

  async function saveLineSettings() {
    if (!lineChannelSecret && !settings.has_line_settings) {
      setMessage('Channel Secretを入力してください')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineChannelSecret: lineChannelSecret || undefined,
          lineAccessToken: lineAccessToken || undefined,
        }),
      })

      if (res.ok) {
        setMessage('LINE設定を保存しました')
        setLineChannelSecret('')
        setLineAccessToken('')
        // 設定を再取得
        fetchInitialData()
      } else {
        setMessage('保存に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  async function deleteLineGroup(roomId: string) {
    try {
      const res = await fetch(`/api/rooms?roomId=${encodeURIComponent(roomId)}&source=line`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMessage('グループを削除しました')
        setLineGroups(lineGroups.filter(room => room.room_id !== roomId))
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
          resendApiKey: resendApiKey || undefined,
        }),
      })

      if (res.ok) {
        setMessage('通知設定を保存しました')
        setResendApiKey('')
        // 設定を再取得
        fetchInitialData()
      } else {
        setMessage('保存に失敗しました')
      }
    } catch (error) {
      setMessage('エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  // Webhook URLはトークンが取得できてから生成
  const chatworkWebhookUrl = typeof window !== 'undefined' && companyWebhookToken
    ? `${window.location.origin}/api/webhook/chatwork/${companyWebhookToken}`
    : ''

  const teamsWebhookUrl = typeof window !== 'undefined' && companyWebhookToken
    ? `${window.location.origin}/api/webhook/teams/${companyWebhookToken}`
    : ''

  const larkWebhookUrl = typeof window !== 'undefined' && companyWebhookToken
    ? `${window.location.origin}/api/webhook/lark/${companyWebhookToken}`
    : ''

  const lineWebhookUrl = typeof window !== 'undefined' && companyWebhookToken
    ? `${window.location.origin}/api/webhook/line/${companyWebhookToken}`
    : ''

  // Slackは既存の方式（ワークスペースIDで識別）のまま
  const slackWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/slack`
    : ''

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-6xl mb-4">403</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセス拒否</h1>
        <p className="text-gray-500">無効なURLです。このページにアクセスする権限がありません。</p>
      </div>
    )
  }

  if (loading || sessionStatus === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => handleTabChange('general')}
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
            onClick={() => handleTabChange('chatwork')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'chatwork'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              {tabLoading === 'chatwork' ? (
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
              )}
              Chatwork
            </span>
          </button>
          <button
            onClick={() => handleTabChange('teams')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'teams'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              {tabLoading === 'teams' ? (
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              )}
              Microsoft Teams
            </span>
          </button>
          <button
            onClick={() => handleTabChange('lark')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'lark'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              {tabLoading === 'lark' ? (
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              )}
              Lark
            </span>
          </button>
          <button
            onClick={() => handleTabChange('slack')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'slack'
                ? 'border-pink-600 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              {tabLoading === 'slack' ? (
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              )}
              Slack
            </span>
          </button>
          <button
            onClick={() => handleTabChange('line')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'line'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              {tabLoading === 'line' ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
              LINE
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

          {/* Resend API設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">メール送信サービス設定</h2>
            <p className="text-sm text-gray-600 mb-4">
              メール通知にはResendを使用しています。
              <a
                href="https://resend.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:underline ml-1"
              >
                Resend
              </a>
              で無料アカウントを作成し、APIキーを取得してください（無料枠: 3000通/月）。
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resend APIキー
                </label>
                {settings.has_resend_key && (
                  <p className="text-sm text-teal-600 mb-2">
                    現在のキー: {settings.resend_api_key}
                  </p>
                )}
                <div className="relative">
                  <input
                    type={showResendKey ? 'text' : 'password'}
                    value={resendApiKey}
                    onChange={e => setResendApiKey(e.target.value)}
                    placeholder={settings.has_resend_key ? '新しいキーを入力（変更する場合）' : 're_xxxxxxxxxx'}
                    className="w-full px-4 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowResendKey(true)}
                    onMouseUp={() => setShowResendKey(false)}
                    onMouseLeave={() => setShowResendKey(false)}
                    onTouchStart={() => setShowResendKey(true)}
                    onTouchEnd={() => setShowResendKey(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title="押している間表示"
                  >
                    {showResendKey ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Resendダッシュボード → API Keys から取得できます
                </p>
              </div>
            </div>
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

      {/* Lark タブ */}
      {activeTab === 'lark' && (
        <div className="space-y-6">
          {/* Lark API設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Lark API設定</h2>
            <p className="text-sm text-gray-600 mb-4">
              Lark Open Platformでアプリを作成し、Event Subscription設定でイベントを購読してください。
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App ID
                </label>
                {settings.has_lark_settings && settings.lark_app_id && (
                  <p className="text-sm text-blue-600 mb-2">
                    現在のApp ID: {settings.lark_app_id}
                  </p>
                )}
                <input
                  type="text"
                  value={larkAppId}
                  onChange={e => setLarkAppId(e.target.value)}
                  placeholder={settings.has_lark_settings ? '新しいApp IDを入力（変更する場合）' : 'cli_xxxxxxxxxx'}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App Secret
                </label>
                <div className="relative">
                  <input
                    type={showLarkSecret ? 'text' : 'password'}
                    value={larkAppSecret}
                    onChange={e => setLarkAppSecret(e.target.value)}
                    placeholder="App Secretを入力"
                    className="w-full px-4 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowLarkSecret(true)}
                    onMouseUp={() => setShowLarkSecret(false)}
                    onMouseLeave={() => setShowLarkSecret(false)}
                    onTouchStart={() => setShowLarkSecret(true)}
                    onTouchEnd={() => setShowLarkSecret(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title="押している間表示"
                  >
                    {showLarkSecret ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verification Token
                </label>
                {settings.has_lark_settings && settings.lark_verification_token && (
                  <p className="text-sm text-blue-600 mb-2">
                    現在のトークン: {settings.lark_verification_token}
                  </p>
                )}
                <input
                  type="password"
                  value={larkVerificationToken}
                  onChange={e => setLarkVerificationToken(e.target.value)}
                  placeholder={settings.has_lark_settings ? '新しいトークンを入力（変更する場合）' : 'Verification Tokenを入力'}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Lark Developer Console → Event Subscriptions で確認できます
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Encrypt Key（オプション）
                </label>
                <input
                  type="password"
                  value={larkEncryptKey}
                  onChange={e => setLarkEncryptKey(e.target.value)}
                  placeholder="暗号化を使用する場合のみ入力"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Event Subscriptionで暗号化を有効にした場合に必要です
                </p>
              </div>

              <button
                onClick={saveLarkSettings}
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
              このURLをLark Open Platformの Event Subscription → Request URL に設定してください。
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={larkWebhookUrl}
                readOnly
                className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(larkWebhookUrl)
                  setMessage('URLをコピーしました')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                コピー
              </button>
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 mb-2">設定手順</h3>
              <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                <li>Lark Developer Console でアプリを作成</li>
                <li>Event Subscriptions を有効化</li>
                <li>上記URLを Request URL に設定</li>
                <li>「im.message.receive_v1」イベントを購読</li>
                <li>アプリに必要な権限を追加してパブリッシュ</li>
              </ol>
            </div>
          </div>

          {/* チャット手動登録 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">チャットを登録</h2>
            <p className="text-sm text-gray-600 mb-4">
              監視したいLarkグループチャットのIDと名前を入力して登録してください。
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newLarkChatId}
                onChange={e => setNewLarkChatId(e.target.value)}
                placeholder="チャットID（oc_xxxxxxxxxx）"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="text"
                value={newLarkChatName}
                onChange={e => setNewLarkChatName(e.target.value)}
                placeholder="チャット名"
                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={addLarkChat}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                追加
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              チャットIDはWebhookの初回受信時にログで確認できます。
            </p>
          </div>

          {/* 監視チャット設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">監視するチャット</h2>

            {larkRooms.length === 0 ? (
              <p className="text-gray-500">
                チャットがありません。上のフォームからチャットを追加してください。
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {larkRooms.map(room => (
                  <div
                    key={room.room_id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={room.is_active}
                      onChange={e => toggleRoom(room.room_id, e.target.checked, 'lark')}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="flex-1 text-gray-900">{room.room_name}</span>
                    <span className="text-xs text-gray-400 truncate max-w-xs" title={room.room_id}>
                      {room.room_id.slice(0, 20)}...
                    </span>
                    <button
                      onClick={() => deleteLarkChat(room.room_id)}
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

      {/* Slack タブ */}
      {activeTab === 'slack' && (
        <div className="space-y-6">
          {/* Webhook URL */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Webhook URL</h2>
            <p className="text-sm text-gray-600 mb-4">
              このURLをSlackアプリのEvent Subscriptions → Request URLに設定してください。
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={slackWebhookUrl}
                readOnly
                className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(slackWebhookUrl)
                  setMessage('URLをコピーしました')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                コピー
              </button>
            </div>
            <div className="mt-4 p-4 bg-pink-50 rounded-lg">
              <h3 className="text-sm font-medium text-pink-800 mb-2">設定手順</h3>
              <ol className="text-sm text-pink-700 list-decimal list-inside space-y-1">
                <li>Slack APIでアプリを作成</li>
                <li>Event Subscriptionsを有効化し、上記URLを設定</li>
                <li>message.channels、message.groupsイベントを購読</li>
                <li>OAuth & Permissionsでchannels:history, groups:historyスコープを追加</li>
                <li>ワークスペースにアプリをインストール</li>
                <li>Bot TokenとSigning Secretを下記に入力</li>
              </ol>
            </div>
          </div>

          {/* ワークスペース追加 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">ワークスペースを追加</h2>
            <p className="text-sm text-gray-600 mb-4">
              Slack APIダッシュボードからBot TokenとSigning Secretを取得して入力してください。
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ワークスペースID
                </label>
                <input
                  type="text"
                  value={newWorkspaceId}
                  onChange={e => setNewWorkspaceId(e.target.value)}
                  placeholder="T01234ABCDE"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ワークスペース名
                </label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={e => setNewWorkspaceName(e.target.value)}
                  placeholder="My Company"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bot Token
                </label>
                <div className="relative">
                  <input
                    type={showSlackSecrets ? 'text' : 'password'}
                    value={newBotToken}
                    onChange={e => setNewBotToken(e.target.value)}
                    placeholder="xoxb-..."
                    className="w-full px-4 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signing Secret
                </label>
                <div className="relative">
                  <input
                    type={showSlackSecrets ? 'text' : 'password'}
                    value={newSigningSecret}
                    onChange={e => setNewSigningSecret(e.target.value)}
                    placeholder="xxxxxxxx..."
                    className="w-full px-4 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowSlackSecrets(true)}
                    onMouseUp={() => setShowSlackSecrets(false)}
                    onMouseLeave={() => setShowSlackSecrets(false)}
                    onTouchStart={() => setShowSlackSecrets(true)}
                    onTouchEnd={() => setShowSlackSecrets(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title="押している間表示"
                  >
                    {showSlackSecrets ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={addSlackWorkspace}
              disabled={saving}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
            >
              {saving ? '追加中...' : 'ワークスペースを追加'}
            </button>
          </div>

          {/* 登録済みワークスペース */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">登録済みワークスペース</h2>

            {slackWorkspaces.length === 0 ? (
              <p className="text-gray-500">
                ワークスペースがありません。上のフォームからワークスペースを追加してください。
              </p>
            ) : (
              <div className="space-y-4">
                {slackWorkspaces.map(workspace => (
                  <div
                    key={workspace.workspace_id}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={workspace.is_active}
                          onChange={e => toggleSlackWorkspace(workspace.workspace_id, e.target.checked)}
                          className="w-5 h-5 text-pink-600 rounded focus:ring-pink-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900">{workspace.workspace_name}</span>
                          <span className="text-xs text-gray-400 ml-2">({workspace.workspace_id})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {workspace.active_channel_count}/{workspace.channel_count} チャンネル
                        </span>
                        <button
                          onClick={() => {
                            if (selectedWorkspace === workspace.workspace_id) {
                              setSelectedWorkspace(null)
                              setSlackChannels([])
                            } else {
                              setSelectedWorkspace(workspace.workspace_id)
                              fetchSlackChannels(workspace.workspace_id)
                            }
                          }}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          {selectedWorkspace === workspace.workspace_id ? '閉じる' : 'チャンネル管理'}
                        </button>
                        <button
                          onClick={() => deleteSlackWorkspace(workspace.workspace_id)}
                          className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    {/* チャンネル管理パネル */}
                    {selectedWorkspace === workspace.workspace_id && (
                      <div className="mt-4 pt-4 border-t">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">チャンネルを追加</h3>
                        <div className="flex gap-2 mb-4">
                          <input
                            type="text"
                            value={newSlackChannelId}
                            onChange={e => setNewSlackChannelId(e.target.value)}
                            placeholder="チャンネルID（C01234ABCDE）"
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm"
                          />
                          <input
                            type="text"
                            value={newSlackChannelName}
                            onChange={e => setNewSlackChannelName(e.target.value)}
                            placeholder="チャンネル名"
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-sm"
                          />
                          <button
                            onClick={addSlackChannel}
                            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm"
                          >
                            追加
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">
                          チャンネルIDはSlackでチャンネル名を右クリック → 「リンクをコピー」で確認できます
                        </p>

                        {slackChannels.length === 0 ? (
                          <p className="text-sm text-gray-500">チャンネルがありません</p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {slackChannels.map(channel => (
                              <div
                                key={channel.room_id}
                                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={channel.is_active}
                                  onChange={e => toggleSlackChannel(channel.room_id, e.target.checked)}
                                  className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                                />
                                <span className="flex-1 text-sm text-gray-900">{channel.room_name}</span>
                                <span className="text-xs text-gray-400">{channel.room_id}</span>
                                <button
                                  onClick={() => deleteSlackChannel(channel.room_id)}
                                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                                >
                                  削除
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* LINE タブ */}
      {activeTab === 'line' && (
        <div className="space-y-6">
          {/* LINE API設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">LINE Messaging API設定</h2>
            <p className="text-sm text-gray-600 mb-4">
              LINE Developersコンソールでチャネルを作成し、Messaging APIを設定してください。
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Secret
                </label>
                {settings.has_line_settings && settings.line_channel_secret && (
                  <p className="text-sm text-emerald-600 mb-2">
                    現在のシークレット: {settings.line_channel_secret}
                  </p>
                )}
                <div className="relative">
                  <input
                    type={showLineSecret ? 'text' : 'password'}
                    value={lineChannelSecret}
                    onChange={e => setLineChannelSecret(e.target.value)}
                    placeholder={settings.has_line_settings ? '新しいシークレットを入力（変更する場合）' : 'Channel Secretを入力'}
                    className="w-full px-4 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowLineSecret(true)}
                    onMouseUp={() => setShowLineSecret(false)}
                    onMouseLeave={() => setShowLineSecret(false)}
                    onTouchStart={() => setShowLineSecret(true)}
                    onTouchEnd={() => setShowLineSecret(false)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    title="押している間表示"
                  >
                    {showLineSecret ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  LINE Developers → チャネル基本設定 → Channel secret
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Access Token
                </label>
                {settings.has_line_settings && settings.line_access_token && (
                  <p className="text-sm text-emerald-600 mb-2">
                    現在のトークン: {settings.line_access_token}
                  </p>
                )}
                <input
                  type="password"
                  value={lineAccessToken}
                  onChange={e => setLineAccessToken(e.target.value)}
                  placeholder={settings.has_line_settings ? '新しいトークンを入力（変更する場合）' : 'Channel Access Tokenを入力'}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  LINE Developers → Messaging API → Channel access token（長期）
                </p>
              </div>

              <button
                onClick={saveLineSettings}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '設定を保存'}
              </button>
            </div>
          </div>

          {/* Webhook URL */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Webhook URL</h2>
            <p className="text-sm text-gray-600 mb-4">
              このURLをLINE Developers → Messaging API → Webhook URL に設定してください。
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={lineWebhookUrl}
                readOnly
                className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lineWebhookUrl)
                  setMessage('URLをコピーしました')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                コピー
              </button>
            </div>
            <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
              <h3 className="text-sm font-medium text-emerald-800 mb-2">設定手順</h3>
              <ol className="text-sm text-emerald-700 list-decimal list-inside space-y-1">
                <li>LINE Developersで「Messaging API」チャネルを作成</li>
                <li>Messaging API設定ページで上記URLをWebhook URLに設定</li>
                <li>「Webhookの利用」をオンにする</li>
                <li>Channel SecretとChannel Access Tokenを取得して上に入力</li>
                <li>公式アカウントをグループに招待</li>
                <li>下の「監視するグループ」で承認してタスク抽出を開始</li>
              </ol>
            </div>
          </div>

          {/* 監視グループ設定 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">監視するグループ</h2>
            <p className="text-sm text-gray-600 mb-4">
              公式アカウントが参加しているグループが表示されます。
              チェックを入れたグループのメッセージからタスクを抽出します。
            </p>
            <div className="p-4 bg-amber-50 rounded-lg mb-4">
              <p className="text-sm text-amber-700">
                <strong>セキュリティ:</strong> 新しくグループに参加した場合、デフォルトでは監視がオフになっています。
                監視を開始するにはチェックを入れてください。
              </p>
            </div>

            {lineGroups.length === 0 ? (
              <p className="text-gray-500">
                グループがありません。公式アカウントをグループに招待すると、ここに表示されます。
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {lineGroups.map(group => (
                  <div
                    key={group.room_id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={group.is_active}
                      onChange={e => toggleRoom(group.room_id, e.target.checked, 'line')}
                      className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span className="flex-1 text-gray-900">{group.room_name}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      group.is_active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {group.is_active ? '監視中' : '未承認'}
                    </span>
                    <button
                      onClick={() => deleteLineGroup(group.room_id)}
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
