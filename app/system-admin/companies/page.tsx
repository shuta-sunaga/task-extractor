'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Company = {
  id: number
  name: string
  slug: string
  is_active: boolean
  created_at: string
  user_count: number
}

export default function CompaniesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [message, setMessage] = useState('')

  // フォーム状態
  const [formData, setFormData] = useState({ name: '', slug: '' })

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.userType !== 'system_admin') {
        router.push('/')
      } else {
        fetchCompanies()
      }
    }
  }, [session, status, router])

  async function fetchCompanies() {
    try {
      const res = await fetch('/api/companies')
      if (res.ok) {
        const data = await res.json()
        setCompanies(data)
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    try {
      const url = editingCompany ? `/api/companies/${editingCompany.id}` : '/api/companies'
      const method = editingCompany ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setShowModal(false)
        setEditingCompany(null)
        setFormData({ name: '', slug: '' })
        fetchCompanies()
      } else {
        const data = await res.json()
        setMessage(data.error || '保存に失敗しました')
      }
    } catch {
      setMessage('エラーが発生しました')
    }
  }

  async function handleDelete(company: Company) {
    if (!confirm(`企業「${company.name}」を削除しますか？`)) return

    try {
      const res = await fetch(`/api/companies/${company.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchCompanies()
      } else {
        const data = await res.json()
        alert(data.error || '削除に失敗しました')
      }
    } catch {
      alert('エラーが発生しました')
    }
  }

  async function toggleActive(company: Company) {
    try {
      const res = await fetch(`/api/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !company.is_active }),
      })
      if (res.ok) {
        fetchCompanies()
      }
    } catch {
      console.error('Failed to toggle company status')
    }
  }

  function openCreateModal() {
    setEditingCompany(null)
    setFormData({ name: '', slug: '' })
    setMessage('')
    setShowModal(true)
  }

  function openEditModal(company: Company) {
    setEditingCompany(company)
    setFormData({ name: company.name, slug: company.slug })
    setMessage('')
    setShowModal(true)
  }

  // slugを自動生成
  function handleNameChange(name: string) {
    setFormData({
      name,
      slug: editingCompany ? formData.slug : name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    })
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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/system-admin" className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">企業管理</h1>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          企業を追加
        </button>
      </div>

      {/* 企業一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">企業名</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Slug</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">ユーザー数</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">状態</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">作成日</th>
              <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {companies.map(company => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{company.name}</span>
                </td>
                <td className="px-6 py-4 text-gray-600 font-mono text-sm">{company.slug}</td>
                <td className="px-6 py-4 text-gray-600">{company.user_count}人</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleActive(company)}
                    className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${
                      company.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {company.is_active ? '有効' : '無効'}
                  </button>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">
                  {new Date(company.created_at).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openEditModal(company)}
                      className="text-gray-500 hover:text-teal-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(company)}
                      disabled={company.user_count > 0}
                      className="text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={company.user_count > 0 ? 'ユーザーが所属しています' : '削除'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  企業がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingCompany ? '企業を編集' : '企業を追加'}
            </h2>

            {message && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">企業名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => handleNameChange(e.target.value)}
                  required
                  placeholder="例: 株式会社サンプル"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug（URL識別子）</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  required
                  placeholder="例: sample-corp"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">英小文字、数字、ハイフンのみ使用可能</p>
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
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  {editingCompany ? '更新' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
