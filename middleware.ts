import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // システム管理者専用ページのチェック
    if (pathname.startsWith('/system-admin')) {
      if (token?.userType !== 'system_admin') {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    // 管理者専用ページのチェック（企業の管理者のみ）
    if (pathname.startsWith('/admin')) {
      if (token?.userType !== 'admin') {
        return NextResponse.redirect(new URL('/', req.url))
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
