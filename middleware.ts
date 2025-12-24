import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // システム管理者専用ページのチェック
    if (pathname.startsWith('/system-admin')) {
      if (token?.userType !== 'system_admin') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    // システム管理者は企業ページにアクセスできない
    // /login, /api, /system-admin 以外のパスはすべて企業ページと見なす
    const isCompanyPage = !pathname.startsWith('/login') &&
                          !pathname.startsWith('/api') &&
                          !pathname.startsWith('/system-admin') &&
                          pathname !== '/'

    if (isCompanyPage && token?.userType === 'system_admin') {
      return NextResponse.redirect(new URL('/system-admin', req.url))
    }

    // 企業ユーザーの場合、自社のslugと一致するかチェック
    // パスの最初のセグメントがslug
    if (isCompanyPage && token?.userType !== 'system_admin') {
      const pathSegments = pathname.split('/').filter(Boolean)
      const urlSlug = pathSegments[0]
      const userSlug = token?.companySlug

      // slugが一致しない場合は自社ページにリダイレクト
      if (urlSlug && userSlug && urlSlug !== userSlug) {
        return NextResponse.redirect(new URL(`/${userSlug}`, req.url))
      }

      // 管理者専用ページのチェック（/[slug]/admin, /[slug]/settings）
      if (pathSegments.length >= 2) {
        const subPath = pathSegments[1]
        if ((subPath === 'admin' || subPath === 'settings') && token?.userType !== 'admin') {
          return NextResponse.redirect(new URL(`/${userSlug}`, req.url))
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // 認証不要のパス
        const publicPaths = ['/login', '/api/auth', '/api/webhook', '/api/init']
        if (publicPaths.some(path => pathname.startsWith(path))) {
          return true
        }

        // その他は認証必須
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
