'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Header() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // ログインページではヘッダーを表示しない
  if (pathname === '/login') {
    return null
  }

  const isSystemAdmin = session?.user?.userType === 'system_admin'
  const isAdmin = session?.user?.userType === 'admin'
  const companySlug = session?.user?.companySlug

  // ホームリンク先を決定
  const homeHref = isSystemAdmin
    ? '/system-admin'
    : companySlug
      ? `/${companySlug}`
      : '/'

  const closeMenu = () => setIsMenuOpen(false)

  return (
    <header className="bg-gradient-to-r from-teal-500 to-cyan-500 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8">
        <div className="flex justify-between items-center">
          <Link
            href={homeHref}
            className="text-xl md:text-2xl font-bold text-white drop-shadow hover:opacity-90 transition-opacity"
            style={{ fontFamily: '"Zen Maru Gothic", sans-serif' }}
            onClick={closeMenu}
          >
            たすきゃっちゃー
          </Link>

          {status === 'authenticated' && (
            <>
              {/* ハンバーガーボタン（モバイル） */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="メニューを開く"
              >
                {isMenuOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>

              {/* デスクトップナビゲーション */}
              <nav className="hidden md:flex items-center gap-4">
                {/* システム管理者用メニュー */}
                {isSystemAdmin && (
                  <Link
                    href="/system-admin"
                    className={`text-white/90 hover:text-white font-medium transition-colors ${pathname.startsWith('/system-admin') ? 'text-white underline underline-offset-4' : ''}`}
                  >
                    企業管理
                  </Link>
                )}

                {/* 企業ユーザー用メニュー */}
                {!isSystemAdmin && companySlug && (
                  <>
                    <Link
                      href={`/${companySlug}`}
                      className={`text-white/90 hover:text-white font-medium transition-colors ${pathname === `/${companySlug}` ? 'text-white underline underline-offset-4' : ''}`}
                    >
                      ダッシュボード
                    </Link>
                    <Link
                      href={`/${companySlug}/usage`}
                      className={`text-white/90 hover:text-white font-medium transition-colors ${pathname === `/${companySlug}/usage` ? 'text-white underline underline-offset-4' : ''}`}
                    >
                      利用方法
                    </Link>
                    {isAdmin && (
                      <>
                        <Link
                          href={`/${companySlug}/settings`}
                          className={`text-white/90 hover:text-white font-medium transition-colors ${pathname === `/${companySlug}/settings` ? 'text-white underline underline-offset-4' : ''}`}
                        >
                          設定
                        </Link>
                        <Link
                          href={`/${companySlug}/admin`}
                          className={`text-white/90 hover:text-white font-medium transition-colors ${pathname.startsWith(`/${companySlug}/admin`) ? 'text-white underline underline-offset-4' : ''}`}
                        >
                          管理
                        </Link>
                      </>
                    )}
                  </>
                )}

                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/30">
                  <span className="text-white text-sm font-medium">
                    {session.user.name}さん
                    {isSystemAdmin && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs font-normal">SYS</span>
                    )}
                    {isAdmin && !isSystemAdmin && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs font-normal">管理者</span>
                    )}
                  </span>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-white/80 hover:text-white text-sm font-medium transition-colors"
                  >
                    ログアウト
                  </button>
                </div>
              </nav>
            </>
          )}
        </div>

        {/* モバイルメニュー */}
        {status === 'authenticated' && isMenuOpen && (
          <nav className="md:hidden mt-4 pt-4 border-t border-white/20">
            <div className="flex flex-col gap-3">
              {/* システム管理者用メニュー */}
              {isSystemAdmin && (
                <Link
                  href="/system-admin"
                  onClick={closeMenu}
                  className={`text-white/90 hover:text-white font-medium transition-colors py-2 ${pathname.startsWith('/system-admin') ? 'text-white underline underline-offset-4' : ''}`}
                >
                  企業管理
                </Link>
              )}

              {/* 企業ユーザー用メニュー */}
              {!isSystemAdmin && companySlug && (
                <>
                  <Link
                    href={`/${companySlug}`}
                    onClick={closeMenu}
                    className={`text-white/90 hover:text-white font-medium transition-colors py-2 ${pathname === `/${companySlug}` ? 'text-white underline underline-offset-4' : ''}`}
                  >
                    ダッシュボード
                  </Link>
                  <Link
                    href={`/${companySlug}/usage`}
                    onClick={closeMenu}
                    className={`text-white/90 hover:text-white font-medium transition-colors py-2 ${pathname === `/${companySlug}/usage` ? 'text-white underline underline-offset-4' : ''}`}
                  >
                    利用方法
                  </Link>
                  {isAdmin && (
                    <>
                      <Link
                        href={`/${companySlug}/settings`}
                        onClick={closeMenu}
                        className={`text-white/90 hover:text-white font-medium transition-colors py-2 ${pathname === `/${companySlug}/settings` ? 'text-white underline underline-offset-4' : ''}`}
                      >
                        設定
                      </Link>
                      <Link
                        href={`/${companySlug}/admin`}
                        onClick={closeMenu}
                        className={`text-white/90 hover:text-white font-medium transition-colors py-2 ${pathname.startsWith(`/${companySlug}/admin`) ? 'text-white underline underline-offset-4' : ''}`}
                      >
                        管理
                      </Link>
                    </>
                  )}
                </>
              )}

              <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-white/20">
                <span className="text-white text-sm font-medium">
                  {session.user.name}さん
                  {isSystemAdmin && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs font-normal">SYS</span>
                  )}
                  {isAdmin && !isSystemAdmin && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 rounded text-xs font-normal">管理者</span>
                  )}
                </span>
                <button
                  onClick={() => {
                    closeMenu()
                    signOut({ callbackUrl: '/login' })
                  }}
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors text-left py-2"
                >
                  ログアウト
                </button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
