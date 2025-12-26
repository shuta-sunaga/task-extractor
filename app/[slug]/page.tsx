'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'

type Task = {
  id: number
  room_id: string
  message_id: string
  content: string
  original_message: string
  sender_name: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'high' | 'medium' | 'low'
  source: 'chatwork' | 'teams' | 'lark' | 'slack'
  created_at: string
  memo: string | null
  service_url: string | null
}

// メッセージ元URLを生成
function generateMessageUrl(task: Task): string | null {
  const { source, room_id, message_id, service_url } = task

  switch (source) {
    case 'chatwork':
      // Chatwork: https://www.chatwork.com/#!rid{room_id}-{message_id}
      return `https://www.chatwork.com/#!rid${room_id}-${message_id}`

    case 'slack':
      // Slack: https://app.slack.com/archives/{channel}/p{timestamp}
      const slackTs = message_id.replace('.', '')
      return `https://app.slack.com/archives/${room_id}/p${slackTs}`

    case 'teams':
      // Teams: https://teams.microsoft.com/l/message/{channelId}/{messageId}
      return `https://teams.microsoft.com/l/message/${encodeURIComponent(room_id)}/${encodeURIComponent(message_id)}`

    case 'lark':
      // Lark: チャットレベルのリンクのみ
      return `https://applink.larksuite.com/client/chat/open?openChatId=${room_id}`

    default:
      return null
  }
}

const sourceColors = {
  chatwork: 'bg-green-100 text-green-700',
  teams: 'bg-purple-100 text-purple-700',
  lark: 'bg-blue-100 text-blue-700',
  slack: 'bg-pink-100 text-pink-700',
}

const sourceLabels = {
  chatwork: 'CW',
  teams: 'Teams',
  lark: 'Lark',
  slack: 'Slack',
}

const statusLabels = {
  pending: '未対応',
  in_progress: '対応中',
  completed: '完了',
}

const priorityLabels = {
  high: '高',
  medium: '中',
  low: '低',
}

const priorityColors = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-green-100 text-green-800',
}

const statusColors = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
}

export default function Dashboard() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [accessDenied, setAccessDenied] = useState(false)

  // 一括削除モーダル用
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // メモ編集用
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null)
  const [memoText, setMemoText] = useState('')
  const [savingMemo, setSavingMemo] = useState(false)
  const [expandedMemoIds, setExpandedMemoIds] = useState<Set<number>>(new Set())

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

    // 自社のslugと一致するか確認
    if (session?.user?.companySlug !== slug) {
      setAccessDenied(true)
      setLoading(false)
      return
    }

    fetchTasks()
  }, [session, sessionStatus, slug, router])

  async function fetchTasks() {
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: number, status: Task['status']) {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setTasks(tasks.map(task =>
          task.id === id ? { ...task, status } : task
        ))
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  async function deleteTask(id: number) {
    if (!confirm('このタスクを削除しますか？')) return
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTasks(tasks.filter(task => task.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  // 完了タスクの件数
  const completedCount = tasks.filter(task => task.status === 'completed').length

  // 完了タスク一括削除
  async function deleteCompletedTasks() {
    setDeleting(true)
    try {
      const res = await fetch('/api/tasks/completed', { method: 'DELETE' })
      if (res.ok) {
        const data = await res.json()
        setTasks(tasks.filter(task => task.status !== 'completed'))
        setShowDeleteModal(false)
        setDeleteConfirmText('')
        alert(`${data.deletedCount}件の完了タスクを削除しました`)
      } else {
        const error = await res.json()
        alert(error.error || '削除に失敗しました')
      }
    } catch (error) {
      console.error('Failed to delete completed tasks:', error)
      alert('削除中にエラーが発生しました')
    } finally {
      setDeleting(false)
    }
  }

  // メモ保存
  async function saveMemo(id: number) {
    setSavingMemo(true)
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: memoText }),
      })
      if (res.ok) {
        setTasks(tasks.map(task =>
          task.id === id ? { ...task, memo: memoText || null } : task
        ))
        setEditingMemoId(null)
        setMemoText('')
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error('Failed to save memo:', res.status, errorData)
        alert(`メモの保存に失敗しました: ${errorData.error || res.statusText}`)
      }
    } catch (error) {
      console.error('Failed to save memo:', error)
      alert('メモの保存中にエラーが発生しました')
    } finally {
      setSavingMemo(false)
    }
  }

  // メモ編集開始
  function startEditingMemo(task: Task) {
    setEditingMemoId(task.id)
    setMemoText(task.memo || '')
  }

  // メモ編集キャンセル
  function cancelEditingMemo() {
    setEditingMemoId(null)
    setMemoText('')
  }

  // メモ展開トグル
  function toggleMemoExpand(id: number) {
    setExpandedMemoIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const filteredTasks = tasks.filter(task => {
    const statusMatch = statusFilter === 'all' || task.status === statusFilter
    const sourceMatch = sourceFilter === 'all' || task.source === sourceFilter
    return statusMatch && sourceMatch
  })

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

  async function handleRefresh() {
    setLoading(true)
    await fetchTasks()
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">タスク一覧</h1>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            更新
          </button>
        </div>
        <div className="flex items-center gap-3">
          {/* 管理者のみ: 完了タスク一括削除ボタン */}
          {session?.user?.userType === 'admin' && completedCount > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors border border-red-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              完了タスクを一括削除 ({completedCount}件)
            </button>
          )}
          <span className="text-sm text-gray-500">
            {filteredTasks.length} 件
          </span>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* ステータスフィルター */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">ステータス</span>
            <div className="flex rounded-lg border overflow-hidden">
              {['pending', 'in_progress', 'completed', 'all'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors border-r last:border-r-0 ${
                    statusFilter === status
                      ? 'bg-gray-800 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {status === 'all' ? 'すべて' : statusLabels[status as keyof typeof statusLabels]}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-6 bg-gray-200" />

          {/* ソースフィルター */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">ツール</span>
            <div className="flex gap-1">
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  sourceFilter === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                すべて
              </button>
              <button
                onClick={() => setSourceFilter('chatwork')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  sourceFilter === 'chatwork'
                    ? 'bg-green-600 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                CW
              </button>
              <button
                onClick={() => setSourceFilter('teams')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  sourceFilter === 'teams'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Teams
              </button>
              <button
                onClick={() => setSourceFilter('lark')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  sourceFilter === 'lark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Lark
              </button>
              <button
                onClick={() => setSourceFilter('slack')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  sourceFilter === 'slack'
                    ? 'bg-pink-600 text-white'
                    : 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                }`}
              >
                Slack
              </button>
            </div>
          </div>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          {tasks.length === 0
            ? 'タスクがありません。Chatwork、Teams、Larkからメッセージを受信すると、ここに表示されます。'
            : '該当するタスクがありません。'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map(task => (
            <div key={task.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${sourceColors[task.source || 'chatwork']}`}>
                    {sourceLabels[task.source || 'chatwork']}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
                    優先度: {priorityLabels[task.priority]}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[task.status]}`}>
                    {statusLabels[task.status]}
                  </span>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  削除
                </button>
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {(() => {
                  const messageUrl = generateMessageUrl(task)
                  if (messageUrl) {
                    return (
                      <a
                        href={messageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-teal-600 hover:underline inline-flex items-center gap-1"
                        title={`${sourceLabels[task.source]}で開く`}
                      >
                        {task.content}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )
                  }
                  return task.content
                })()}
              </h3>

              <div className="text-sm text-gray-500 mb-4">
                <p>送信者: {task.sender_name}</p>
                <p>作成日: {new Date(task.created_at).toLocaleString('ja-JP')}</p>
              </div>

              <details className="mb-4">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  元のメッセージを表示
                </summary>
                <p className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 whitespace-pre-wrap">
                  {task.original_message}
                </p>
              </details>

              {/* メモセクション */}
              <div className="mb-4">
                {editingMemoId === task.id ? (
                  // メモ編集モード
                  <div className="border border-teal-200 rounded-lg p-3 bg-teal-50/30">
                    <div className="flex items-center gap-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="text-sm font-medium text-teal-700">メモを編集</span>
                    </div>
                    <textarea
                      value={memoText}
                      onChange={(e) => setMemoText(e.target.value)}
                      placeholder="タスクに関するメモを入力..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2 justify-end">
                      <button
                        onClick={cancelEditingMemo}
                        disabled={savingMemo}
                        className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => saveMemo(task.id)}
                        disabled={savingMemo}
                        className="px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors disabled:opacity-50"
                      >
                        {savingMemo ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </div>
                ) : task.memo ? (
                  // メモ表示モード（メモがある場合）
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-600">メモ</span>
                      </div>
                      <button
                        onClick={() => startEditingMemo(task)}
                        className="text-xs text-teal-600 hover:text-teal-700 hover:underline"
                      >
                        編集
                      </button>
                    </div>
                    {task.memo.length > 100 ? (
                      // 長いメモはアコーディオンで表示
                      <div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {expandedMemoIds.has(task.id)
                            ? task.memo
                            : task.memo.slice(0, 100) + '...'}
                        </p>
                        <button
                          onClick={() => toggleMemoExpand(task.id)}
                          className="mt-2 text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                        >
                          {expandedMemoIds.has(task.id) ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                              折りたたむ
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              すべて表示 ({task.memo.length}文字)
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      // 短いメモはそのまま表示
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.memo}</p>
                    )}
                  </div>
                ) : (
                  // メモがない場合 - 追加ボタン
                  <button
                    onClick={() => startEditingMemo(task)}
                    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-teal-600 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    メモを追加
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                {task.status !== 'pending' && (
                  <button
                    onClick={() => updateStatus(task.id, 'pending')}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    未対応に戻す
                  </button>
                )}
                {task.status !== 'in_progress' && (
                  <button
                    onClick={() => updateStatus(task.id, 'in_progress')}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    対応中にする
                  </button>
                )}
                {task.status !== 'completed' && (
                  <button
                    onClick={() => updateStatus(task.id, 'completed')}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                  >
                    完了にする
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 完了タスク一括削除確認モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">完了タスクの一括削除</h3>
                <p className="text-sm text-gray-500">この操作は取り消せません</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                <span className="font-bold text-red-600">{completedCount}件</span>の完了タスクを削除しようとしています。
                削除を実行するには、下のテキストボックスに「<span className="font-bold">削除します</span>」と入力してください。
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="削除します"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmText('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={deleting}
              >
                キャンセル
              </button>
              <button
                onClick={deleteCompletedTasks}
                disabled={deleteConfirmText !== '削除します' || deleting}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? '削除中...' : '削除を実行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
