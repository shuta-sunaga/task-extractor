'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SystemAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.userType !== 'system_admin') {
        router.push('/')
      }
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">システム管理</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 企業管理 */}
        <Link
          href="/system-admin/companies"
          className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">企業管理</h2>
              <p className="text-sm text-gray-500">企業の登録・編集・削除</p>
            </div>
          </div>
        </Link>

        {/* 全ユーザー管理 */}
        <Link
          href="/admin/users"
          className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-100 rounded-lg">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">全ユーザー管理</h2>
              <p className="text-sm text-gray-500">全企業のユーザー管理</p>
            </div>
          </div>
        </Link>
      </div>

      {/* 情報カード */}
      <div className="mt-8 p-6 bg-red-50 rounded-xl border border-red-200">
        <h3 className="font-semibold text-red-900 mb-2">システム管理者向け情報</h3>
        <ul className="text-sm text-red-700 space-y-1">
          <li>・企業を作成し、各企業に管理者ユーザーを割り当てることができます</li>
          <li>・システム管理者は全企業のデータを横断して管理できます</li>
          <li>・企業を削除する前に、所属するユーザーを全て削除する必要があります</li>
        </ul>
      </div>
    </div>
  )
}
