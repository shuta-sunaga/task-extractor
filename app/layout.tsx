import type { Metadata } from 'next'
import './globals.css'

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
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="flex justify-between items-center">
              <a
                href="/"
                className="text-2xl font-bold text-white drop-shadow hover:opacity-90 transition-opacity"
                style={{ fontFamily: '"Zen Maru Gothic", sans-serif' }}
              >
                たすきゃっちゃー
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
