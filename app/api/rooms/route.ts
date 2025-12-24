import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRooms, getRoomsBySource, upsertRoom, setRoomActive, getSettings, createRoom, deleteRoom, type Source } from '@/lib/db'
import { createChatworkClient } from '@/lib/chatwork'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const companyId = session?.user?.companyId ?? undefined

    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') as Source | null

    // ソース指定がある場合はそのソースのルームのみ取得
    if (source === 'teams') {
      const rooms = await getRoomsBySource('teams', companyId)
      return NextResponse.json(rooms)
    }

    if (source === 'chatwork') {
      // Chatwork APIトークンがあれば、最新のルーム一覧を取得してDBを更新
      const settings = await getSettings(companyId)
      if (settings?.chatwork_api_token) {
        try {
          const client = createChatworkClient(settings.chatwork_api_token)
          const chatworkRooms = await client.getRooms()

          // DBを更新
          for (const room of chatworkRooms) {
            await upsertRoom(String(room.room_id), room.name, 'chatwork', companyId)
          }
        } catch (apiError) {
          console.error('Chatwork API error:', apiError)
        }
      }

      const rooms = await getRoomsBySource('chatwork', companyId)
      return NextResponse.json(rooms)
    }

    // ソース指定なしの場合は全ルーム取得（後方互換性）
    const dbRooms = await getRooms(companyId)

    // Chatwork APIトークンがあれば、最新のルーム一覧を取得してDBを更新
    const settings = await getSettings(companyId)
    if (settings?.chatwork_api_token) {
      try {
        const client = createChatworkClient(settings.chatwork_api_token)
        const chatworkRooms = await client.getRooms()

        // DBを更新
        for (const room of chatworkRooms) {
          await upsertRoom(String(room.room_id), room.name, 'chatwork', companyId)
        }

        // 更新後のルーム一覧を返す
        const updatedRooms = await getRooms(companyId)
        return NextResponse.json(updatedRooms)
      } catch (apiError) {
        console.error('Chatwork API error:', apiError)
      }
    }

    return NextResponse.json(dbRooms)
  } catch (error) {
    console.error('Get rooms error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    )
  }
}

// 手動でルームを作成（主にTeams用）
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const companyId = session?.user?.companyId ?? undefined

    const body = await request.json()
    const { roomId, roomName, source } = body

    if (!roomId || !roomName || !source) {
      return NextResponse.json(
        { error: 'roomId, roomName, and source are required' },
        { status: 400 }
      )
    }

    const room = await createRoom(roomId, roomName, source, companyId)
    return NextResponse.json(room, { status: 201 })
  } catch (error) {
    console.error('Create room error:', error)
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { roomId, isActive, source } = body

    await setRoomActive(roomId, isActive, source)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update room error:', error)
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const source = searchParams.get('source') as Source

    if (!roomId || !source) {
      return NextResponse.json(
        { error: 'roomId and source are required' },
        { status: 400 }
      )
    }

    await deleteRoom(roomId, source)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete room error:', error)
    return NextResponse.json(
      { error: 'Failed to delete room' },
      { status: 500 }
    )
  }
}
