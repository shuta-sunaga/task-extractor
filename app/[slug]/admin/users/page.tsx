'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type User = {
  id: number
  company_id: number | null
  email: string
  name: string
  user_type: 'admin' | 'user'
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

type Role = {
  id: number
  company_id: number
  name: string
  description: string | null
}

type UserRole = {
  id: number
  name: string
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [userRolesMap, setUserRolesMap] = useState<Record<number, UserRole[]>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [roleTargetUser, setRoleTargetUser] = useState<User | null>(null)
  const [roleUpdating, setRoleUpdating] = useState(false)
  const [message, setMessage] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)

  // フォーム状態
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    userType: 'user' as 'admin' | 'user',
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
      const [usersRes, rolesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
      ])

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData)

        // 各ユーザーのロールを取得
        const rolesMap: Record<number, UserRole[]> = {}
        await Promise.all(
          usersData.map(async (user: User) => {
            try {
              const res = await fetch(`/api/users/${user.id}/roles`)
              if (res.ok) {
                const data = await res.json()
                rolesMap[user.id] = data.roles || []
              }
            } catch {
              rolesMap[user.id] = []
            }
          })
        )
        setUserRolesMap(rolesMap)
      }

      if (rolesRes.ok) {
        setRoles(await rolesRes.json())
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchUserRoles(userId: number) {
    try {
      const res = await fetch(`/api/users/${userId}/roles`)
      if (res.ok) {
        const data = await res.json()
        setUserRolesMap(prev => ({ ...prev, [userId]: data.roles || [] }))
      }
    } catch {
      console.error('Failed to fetch user roles')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PATCH' : 'POST'

      const body: Record<string, unknown> = {
        email: formData.email,
        name: formData.name,
        userType: formData.userType,
      }
      if (formData.password) {
        body.password = formData.password
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingUser(null)
        setFormData({ email: '', password: '', name: '', userType: 'user' })
        fetchData()
      } else {
        const data = await res.json()
        setMessage(data.error || '保存に失敗しました')
      }
    } catch {
      setMessage('エラーが発生しました')
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`${user.name} を削除しますか？`)) return

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
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

  async function toggleActive(user: User) {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.is_active }),
      })
      if (res.ok) {
        fetchData()
      }
    } catch {
      console.error('Failed to toggle user status')
    }
  }

  function openRoleModal(user: User) {
    setRoleTargetUser(user)
    setShowRoleModal(true)
  }

  async function toggleUserRole(roleId: number, hasRole: boolean) {
    if (!roleTargetUser || roleUpdating) return

    setRoleUpdating(true)
    try {
      const res = await fetch('/api/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: roleTargetUser.id,
          roleId,
          action: hasRole ? 'remove' : 'add',
        }),
      })

      if (res.ok) {
        await fetchUserRoles(roleTargetUser.id)
      }
    } catch {
      console.error('Failed to toggle user role')
    } finally {
      setRoleUpdating(false)
    }
  }

  function openCreateModal() {
    setEditingUser(null)
    setFormData({ email: '', password: '', name: '', userType: 'user' })
    setMessage('')
    setShowModal(true)
  }

  function openEditModal(user: User) {
    setEditingUser(user)
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      userType: user.user_type,
    })
    setMessage('')
    setShowModal(true)
  }

  const userTypeLabel = (type: string) => {
    switch (type) {
      case 'admin': return '管理者'
      case 'user': return '一般ユーザー'
      default: return type
    }
  }

  const userTypeBadge = (type: string) => {
    switch (type) {
      case 'admin': return 'bg-purple-100 text-purple-700'
      case 'user': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
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
          <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          ユーザーを追加
        </button>
      </div>

      {/* ユーザー一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">名前</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">メール</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">種別</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">ロール</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">状態</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">最終ログイン</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500 whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-gray-900">{user.name}</span>
                </td>
                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${userTypeBadge(user.user_type)}`}>
                    {userTypeLabel(user.user_type)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.user_type === 'user' ? (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {(userRolesMap[user.id] || []).length > 0 ? (
                          userRolesMap[user.id].map(role => (
                            <span
                              key={role.id}
                              className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs"
                            >
                              {role.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">未設定</span>
                        )}
                      </div>
                      <button
                        onClick={() => openRoleModal(user)}
                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        title="ロールを設定"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleActive(user)}
                    className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${
                      user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {user.is_active ? '有効' : '無効'}
                  </button>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString('ja-JP')
                    : '未ログイン'}
                </td>
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-gray-500 hover:text-teal-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={user.id === parseInt(session?.user?.id || '0')}
                      className="text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  ユーザーがいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ロール管理への導線 */}
      <div className="mt-4 text-sm text-gray-500">
        ロールの作成・編集は
        <Link href={`/${slug}/admin/roles`} className="text-teal-600 hover:underline mx-1">
          ロール管理ページ
        </Link>
        から行えます
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingUser ? 'ユーザーを編集' : 'ユーザーを追加'}
            </h2>

            {message && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード{editingUser && '（変更する場合のみ）'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  placeholder={editingUser ? '変更しない場合は空欄' : ''}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                <p className="text-xs text-gray-500 mt-1">8文字以上、英字と数字を含む</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ユーザー種別</label>
                <select
                  value={formData.userType}
                  onChange={e => setFormData({ ...formData, userType: e.target.value as 'admin' | 'user' })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="user">一般ユーザー</option>
                  <option value="admin">管理者</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  {editingUser ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ロール付与モーダル */}
      {showRoleModal && roleTargetUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              ロールを設定
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {roleTargetUser.name} に付与するロールを選択してください
            </p>

            {roles.length > 0 ? (
              <div className="space-y-2 mb-6">
                {roles.map(role => {
                  const userRoles = userRolesMap[roleTargetUser.id] || []
                  const hasRole = userRoles.some(r => r.id === role.id)
                  return (
                    <label
                      key={role.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        hasRole
                          ? 'bg-indigo-50 border-indigo-300'
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      } ${roleUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={hasRole}
                        onChange={() => toggleUserRole(role.id, hasRole)}
                        disabled={roleUpdating}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{role.name}</div>
                        {role.description && (
                          <div className="text-xs text-gray-500">{role.description}</div>
                        )}
                      </div>
                      {roleUpdating && hasRole && (
                        <svg className="animate-spin h-4 w-4 text-indigo-600" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                    </label>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">ロールがありません</p>
                <Link
                  href={`/${slug}/admin/roles`}
                  className="text-indigo-600 hover:underline text-sm"
                >
                  ロールを作成する →
                </Link>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
