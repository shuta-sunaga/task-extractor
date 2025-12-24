'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function RootPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    // システム管理者はシステム管理画面へ
    if (session?.user?.userType === 'system_admin') {
      router.push('/system-admin')
      return
    }

    // 企業ユーザーは自社のダッシュボードへ
    if (session?.user?.companySlug) {
      router.push(`/${session.user.companySlug}`)
      return
    }

    // companySlugがない場合はログインへ
    router.push('/login')
  }, [session, status, router])

  return (
    <div className="flex justify-center items-center h-64">
      <div className="text-gray-500">リダイレクト中...</div>
    </div>
  )
}
