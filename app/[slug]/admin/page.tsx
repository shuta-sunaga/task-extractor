'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const [accessDenied, setAccessDenied] = useState(false)

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
      return
    }
  }, [session, status, slug, router])

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-6xl mb-4">403</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">アクセス拒否</h1>
        <p className="text-gray-500">無効なURLです。このページにアクセスする権限がありません。</p>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">管理</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ユーザー管理 */}
        <Link
          href={`/${slug}/admin/users`}
          className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-100 rounded-lg">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">ユーザー管理</h2>
              <p className="text-sm text-gray-500">ユーザーの追加・編集・削除</p>
            </div>
          </div>
        </Link>

        {/* ロール管理 */}
        <Link
          href={`/${slug}/admin/roles`}
          className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">ロール管理</h2>
              <p className="text-sm text-gray-500">閲覧権限の設定</p>
            </div>
          </div>
        </Link>
      </div>

      {/* 情報カード */}
      <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">管理者向け情報</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>・ユーザーは「管理者」または「一般ユーザー」として登録できます</li>
          <li>・ロールを作成して、一般ユーザーの閲覧権限を制限できます</li>
          <li>・ロールにはルーム（チャンネル）とソース（ツール）の組み合わせで権限を設定します</li>
        </ul>
      </div>
    </div>
  )
}
