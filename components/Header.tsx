'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Header() {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  // ログインページではヘッダーを表示しない
  if (pathname === '/login') {
    return null
  }

  const isSystemAdmin = session?.user?.userType === 'system_admin'
  const isAdmin = session?.user?.userType === 'admin' || isSystemAdmin

  return (
    <header className="bg-gradient-to-r from-teal-500 to-cyan-500 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center">
          <Link
            href="/"
            className="text-2xl font-bold text-white drop-shadow hover:opacity-90 transition-opacity"
            style={{ fontFamily: '"Zen Maru Gothic", sans-serif' }}
          >
            たすきゃっちゃー
          </Link>
          <nav className="flex items-center gap-4">
            {status === 'authenticated' && (
              <>
                <Link
                  href="/"
                  className={`text-white/90 hover:text-white font-medium transition-colors ${pathname === '/' ? 'text-white underline underline-offset-4' : ''}`}
                >
                  ダッシュボード
                </Link>
                {isAdmin && (
                  <Link
                    href="/settings"
                    className={`text-white/90 hover:text-white font-medium transition-colors ${pathname === '/settings' ? 'text-white underline underline-offset-4' : ''}`}
                  >
                    設定
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`text-white/90 hover:text-white font-medium transition-colors ${pathname.startsWith('/admin') ? 'text-white underline underline-offset-4' : ''}`}
                  >
                    管理
                  </Link>
                )}
                {isSystemAdmin && (
                  <Link
                    href="/system-admin"
                    className={`text-white/90 hover:text-white font-medium transition-colors ${pathname.startsWith('/system-admin') ? 'text-white underline underline-offset-4' : ''}`}
                  >
                    企業管理
                  </Link>
                )}
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/30">
                  <span className="text-white/80 text-sm">
                    {session.user.name}
                    {isSystemAdmin && (
                      <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">SYS</span>
                    )}
                    {!isSystemAdmin && isAdmin && (
                      <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">管理者</span>
                    )}
                  </span>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-white/80 hover:text-white text-sm font-medium transition-colors"
                  >
                    ログアウト
                  </button>
                </div>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
