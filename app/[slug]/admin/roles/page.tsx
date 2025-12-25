'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Source = 'chatwork' | 'teams' | 'lark' | 'slack'

type Permission = {
  id: number
  role_id: number
  room_id: string | null
  source: Source | null
  can_view: boolean
  can_edit_status: boolean
  can_delete: boolean
}

type Role = {
  id: number
  company_id: number
  name: string
  description: string | null
  created_at: string
  permissions: Permission[]
}

type Room = {
  id: number
  room_id: string
  room_name: string
  source: Source
  is_active: boolean
}

const sourceLabels: Record<Source, string> = {
  chatwork: 'Chatwork',
  teams: 'Teams',
  lark: 'Lark',
  slack: 'Slack',
}

const sourceColors: Record<Source, string> = {
  chatwork: 'bg-green-100 text-green-700',
  teams: 'bg-purple-100 text-purple-700',
  lark: 'bg-blue-100 text-blue-700',
  slack: 'bg-pink-100 text-pink-700',
}

export default function RolesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [roles, setRoles] = useState<Role[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [editingPermissionRole, setEditingPermissionRole] = useState<Role | null>(null)
  const [message, setMessage] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)

  // フォーム状態
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [submitting, setSubmitting] = useState(false)
  const [permissionForm, setPermissionForm] = useState<{
    roomId: string
    source: string
    canView: boolean
    canEditStatus: boolean
    canDelete: boolean
  }>({
    roomId: '',
    source: '',
    canView: true,
    canEditStatus: true,
    canDelete: false,
  })

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
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

    fetchData()
  }, [session, status, slug, router])

  async function fetchData() {
    try {
      const [rolesRes, roomsRes] = await Promise.all([
        fetch('/api/roles'),
        fetch('/api/rooms'),
      ])

      if (rolesRes.ok) {
        setRoles(await rolesRes.json())
      }
      if (roomsRes.ok) {
        setRooms(await roomsRes.json())
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return // 二重送信防止

    setMessage('')
    setSubmitting(true)

    try {
      const url = editingRole ? `/api/roles/${editingRole.id}` : '/api/roles'
      const method = editingRole ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingRole(null)
        setFormData({ name: '', description: '' })
        fetchData()
      } else {
        const data = await res.json()
        setMessage(data.error || '保存に失敗しました')
      }
    } catch {
      setMessage('エラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(role: Role) {
    if (!confirm(`ロール「${role.name}」を削除しますか？`)) return

    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchData()
      } else {
        const data = await res.json()
        alert(data.error || '削除に失敗しました')
      }
    } catch {
      alert('エラーが発生しました')
    }
  }

  async function handleAddPermission(e: React.FormEvent) {
    e.preventDefault()
    if (!editingPermissionRole) return

    try {
      const res = await fetch(`/api/roles/${editingPermissionRole.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: permissionForm.roomId || null,
          source: permissionForm.source || null,
          canView: permissionForm.canView,
          canEditStatus: permissionForm.canEditStatus,
          canDelete: permissionForm.canDelete,
        }),
      })

      if (res.ok) {
        setPermissionForm({
          roomId: '',
          source: '',
          canView: true,
          canEditStatus: true,
          canDelete: false,
        })
        fetchData()
        // 更新されたロールを取得
        const updatedRole = roles.find(r => r.id === editingPermissionRole.id)
        if (updatedRole) {
          const roleRes = await fetch(`/api/roles/${editingPermissionRole.id}`)
          if (roleRes.ok) {
            const roleData = await roleRes.json()
            setEditingPermissionRole(roleData)
          }
        }
      }
    } catch (error) {
      console.error('Failed to add permission:', error)
    }
  }

  async function handleDeletePermission(permissionId: number) {
    if (!editingPermissionRole) return

    try {
      const res = await fetch(
        `/api/roles/${editingPermissionRole.id}/permissions?permissionId=${permissionId}`,
        { method: 'DELETE' }
      )

      if (res.ok) {
        // ロールを再取得
        const roleRes = await fetch(`/api/roles/${editingPermissionRole.id}`)
        if (roleRes.ok) {
          const roleData = await roleRes.json()
          setEditingPermissionRole(roleData)
        }
        fetchData()
      }
    } catch (error) {
      console.error('Failed to delete permission:', error)
    }
  }

  function openCreateModal() {
    setEditingRole(null)
    setFormData({ name: '', description: '' })
    setMessage('')
    setShowModal(true)
  }

  function openEditModal(role: Role) {
    setEditingRole(role)
    setFormData({ name: role.name, description: role.description || '' })
    setMessage('')
    setShowModal(true)
  }

  function openPermissionModal(role: Role) {
    setEditingPermissionRole(role)
    setPermissionForm({
      roomId: '',
      source: '',
      canView: true,
      canEditStatus: true,
      canDelete: false,
    })
    setShowPermissionModal(true)
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-6xl mb-4">403</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセス拒否</h1>
        <p className="text-gray-500">無効なURLです。このページにアクセスする権限がありません。</p>
      </div>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Link href={`/${slug}/admin`} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">ロール管理</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          ロールを追加
        </button>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <Link
          href={`/${slug}/admin/users`}
          className="px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-t-lg"
        >
          ユーザー
        </Link>
        <div className="px-4 py-2 text-teal-600 border-b-2 border-teal-600 font-medium">
          ロール
        </div>
      </div>

      {/* 説明 */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          ロールを作成して一般ユーザーに割り当てることで、閲覧できるタスクを制限できます。
          権限は「ルーム」と「ソース（ツール）」の組み合わせで設定します。
        </p>
      </div>

      {/* ロール一覧 */}
      <div className="space-y-4">
        {roles.map(role => (
          <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                {role.description && (
                  <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openPermissionModal(role)}
                  className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="権限を設定"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </button>
                <button
                  onClick={() => openEditModal(role)}
                  className="p-2 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                  title="編集"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(role)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="削除"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 権限一覧 */}
            {role.permissions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {role.permissions.map(perm => (
                  <div
                    key={perm.id}
                    className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm flex items-center gap-2"
                  >
                    {perm.source && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${sourceColors[perm.source]}`}>
                        {sourceLabels[perm.source]}
                      </span>
                    )}
                    {perm.room_id ? (
                      <span className="text-gray-700">
                        {rooms.find(r => r.room_id === perm.room_id)?.room_name || perm.room_id}
                      </span>
                    ) : (
                      <span className="text-gray-500">全ルーム</span>
                    )}
                    <span className="text-gray-400">|</span>
                    <span className="text-xs text-gray-500">
                      {perm.can_view ? '閲覧' : ''}
                      {perm.can_edit_status ? ' 編集' : ''}
                      {perm.can_delete ? ' 削除' : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">権限が設定されていません</p>
            )}
          </div>
        ))}

        {roles.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            ロールがありません
          </div>
        )}
      </div>

      {/* ロール作成/編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingRole ? 'ロールを編集' : 'ロールを追加'}
            </h2>

            {message && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ロール名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="例: 営業チーム"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">説明（任意）</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="例: 営業部門のタスクのみ閲覧可能"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {editingRole ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 権限設定モーダル */}
      {showPermissionModal && editingPermissionRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              権限設定: {editingPermissionRole.name}
            </h2>

            {/* 現在の権限 */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">現在の権限</h3>
              {editingPermissionRole.permissions.length > 0 ? (
                <div className="space-y-2">
                  {editingPermissionRole.permissions.map(perm => (
                    <div
                      key={perm.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {perm.source ? (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${sourceColors[perm.source]}`}>
                            {sourceLabels[perm.source]}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-600">
                            全ソース
                          </span>
                        )}
                        <span className="text-gray-700">
                          {perm.room_id
                            ? rooms.find(r => r.room_id === perm.room_id)?.room_name || perm.room_id
                            : '全ルーム'}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({perm.can_view ? '閲覧' : ''}{perm.can_edit_status ? ' 編集' : ''}{perm.can_delete ? ' 削除' : ''})
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeletePermission(perm.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 p-3 bg-gray-50 rounded-lg">
                  権限が設定されていません（このロールのユーザーは何も閲覧できません）
                </p>
              )}
            </div>

            {/* 権限追加フォーム */}
            <form onSubmit={handleAddPermission} className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">権限を追加</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ソース（空欄=全て）</label>
                  <select
                    value={permissionForm.source}
                    onChange={e => setPermissionForm({ ...permissionForm, source: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">全ソース</option>
                    <option value="chatwork">Chatwork</option>
                    <option value="teams">Teams</option>
                    <option value="lark">Lark</option>
                    <option value="slack">Slack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">ルーム（空欄=全て）</label>
                  <select
                    value={permissionForm.roomId}
                    onChange={e => setPermissionForm({ ...permissionForm, roomId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">全ルーム</option>
                    {rooms
                      .filter(r => !permissionForm.source || r.source === permissionForm.source)
                      .map(room => (
                        <option key={room.room_id} value={room.room_id}>
                          {room.room_name} ({sourceLabels[room.source]})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissionForm.canView}
                    onChange={e => setPermissionForm({ ...permissionForm, canView: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">閲覧</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissionForm.canEditStatus}
                    onChange={e => setPermissionForm({ ...permissionForm, canEditStatus: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">ステータス編集</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={permissionForm.canDelete}
                    onChange={e => setPermissionForm({ ...permissionForm, canDelete: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">削除</span>
                </label>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPermissionModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  閉じる
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  権限を追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
