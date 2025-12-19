import { NextResponse } from 'next/server'
import { getRooms, upsertRoom, setRoomActive, getSettings } from '@/lib/db'
import { createChatworkClient } from '@/lib/chatwork'

export async function GET() {
  try {
    // DBからルーム一覧を取得
    const dbRooms = await getRooms()

    // Chatwork APIトークンがあれば、最新のルーム一覧を取得してDBを更新
    const settings = await getSettings()
    if (settings?.chatwork_api_token) {
      try {
        const client = createChatworkClient(settings.chatwork_api_token)
        const chatworkRooms = await client.getRooms()

        // DBを更新
        for (const room of chatworkRooms) {
          await upsertRoom(String(room.room_id), room.name)
        }

        // 更新後のルーム一覧を返す
        const updatedRooms = await getRooms()
        return NextResponse.json(updatedRooms)
      } catch (apiError) {
        console.error('Chatwork API error:', apiError)
        // API エラーの場合は DB のデータを返す
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

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { roomId, isActive } = body

    await setRoomActive(roomId, isActive)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update room error:', error)
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    )
  }
}
