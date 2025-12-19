import { NextResponse } from 'next/server'
import { getTasks, createTask } from '@/lib/db'

export async function GET() {
  try {
    const tasks = await getTasks()
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const task = await createTask({
      roomId: body.roomId,
      messageId: body.messageId,
      content: body.content,
      originalMessage: body.originalMessage,
      senderName: body.senderName,
      priority: body.priority || 'medium',
    })
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
