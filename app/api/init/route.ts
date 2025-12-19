import { NextResponse } from 'next/server'
import { initDatabase } from '@/lib/db'

export async function GET() {
  try {
    await initDatabase()
    return NextResponse.json({ message: 'Database initialized successfully' })
  } catch (error) {
    console.error('Database init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    )
  }
}
