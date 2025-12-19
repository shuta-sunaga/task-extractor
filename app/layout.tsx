import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Task Extractor',
  description: 'Chatworkのメッセージから課題・タスクを自動抽出',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 min-h-screen">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <a href="/" className="text-xl font-bold text-gray-900">
                Task Extractor
              </a>
              <nav className="flex gap-4">
                <a href="/" className="text-gray-600 hover:text-gray-900">
                  ダッシュボード
                </a>
                <a href="/settings" className="text-gray-600 hover:text-gray-900">
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
