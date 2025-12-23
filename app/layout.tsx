import type { Metadata } from 'next'
import './globals.css'
import Logo from './components/Logo'

export const metadata: Metadata = {
  title: 'タスキャッチャー',
  description: 'ChatworkやTeamsのメッセージからタスクを自動キャッチ！',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        <header className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <a href="/" className="flex items-center gap-3 group">
                <Logo className="w-10 h-10 drop-shadow-md group-hover:scale-110 transition-transform" />
                <span className="text-2xl font-bold text-white drop-shadow-md">
                  タスキャッチャー
                </span>
              </a>
              <nav className="flex gap-4">
                <a
                  href="/"
                  className="text-white/90 hover:text-white font-medium transition-colors"
                >
                  ダッシュボード
                </a>
                <a
                  href="/settings"
                  className="text-white/90 hover:text-white font-medium transition-colors"
                >
                  設定
                </a>
              </nav>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
