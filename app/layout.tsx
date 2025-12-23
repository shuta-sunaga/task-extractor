import type { Metadata } from 'next'
import './globals.css'
import Logo from './components/Logo'

export const metadata: Metadata = {
  title: 'たすきゃっちゃー',
  description: 'ChatworkやTeamsのメッセージからタスクを自動キャッチ！',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <header className="bg-gradient-to-r from-teal-500 to-cyan-500 shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <a href="/" className="flex items-center gap-3 group">
                <Logo className="w-10 h-10 drop-shadow group-hover:scale-105 transition-transform" />
                <span
                  className="text-2xl font-bold text-white drop-shadow"
                  style={{ fontFamily: '"Zen Maru Gothic", sans-serif' }}
                >
                  たすきゃっちゃー
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
