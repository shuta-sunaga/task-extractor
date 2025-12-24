import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRoomsByWorkspace, createSlackRoom, setRoomActive, deleteRoom, getSlackWorkspace, getRoomByIdAndSource } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const companyId = session?.user?.companyId

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspaceId' },
        { status: 400 }
      )
    }

    // ワークスペースが自社のものか確認
    const workspace = await getSlackWorkspace(workspaceId)
    if (!workspace || (companyId && workspace.company_id !== companyId)) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    const channels = await getRoomsByWorkspace(workspaceId)
    return NextResponse.json(channels)
  } catch (error) {
    console.error('Get Slack channels error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const companyId = session?.user?.companyId ?? undefined

    const body = await request.json()
    const { channelId, channelName, workspaceId } = body

    if (!channelId || !channelName || !workspaceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // ワークスペースが自社のものか確認
    const workspace = await getSlackWorkspace(workspaceId)
    if (!workspace || (companyId && workspace.company_id !== companyId)) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    const channel = await createSlackRoom(channelId, channelName, workspaceId, companyId)
    return NextResponse.json(channel)
  } catch (error) {
    console.error('Create Slack channel error:', error)
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const companyId = session?.user?.companyId ?? undefined

    const body = await request.json()
    const { channelId, isActive } = body

    if (!channelId) {
      return NextResponse.json(
        { error: 'Missing channelId' },
        { status: 400 }
      )
    }

    // チャンネルが自社のものか確認
    const room = await getRoomByIdAndSource(channelId, 'slack')
    if (!room || (companyId && room.company_id !== companyId)) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      )
    }

    await setRoomActive(channelId, isActive, 'slack')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update Slack channel error:', error)
    return NextResponse.json(
      { error: 'Failed to update channel' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const companyId = session?.user?.companyId ?? undefined

    const { searchParams } = new URL(request.url)
    const channelId = searchParams.get('channelId')

    if (!channelId) {
      return NextResponse.json(
        { error: 'Missing channelId' },
        { status: 400 }
      )
    }

    // チャンネルが自社のものか確認
    const room = await getRoomByIdAndSource(channelId, 'slack')
    if (!room || (companyId && room.company_id !== companyId)) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      )
    }

    await deleteRoom(channelId, 'slack')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete Slack channel error:', error)
    return NextResponse.json(
      { error: 'Failed to delete channel' },
      { status: 500 }
    )
  }
}
