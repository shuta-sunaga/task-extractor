import { NextResponse } from 'next/server'
import {
  getSlackWorkspaces,
  createSlackWorkspace,
  deleteSlackWorkspace,
  updateSlackWorkspace,
  getRoomsByWorkspace,
} from '@/lib/db'

export async function GET() {
  try {
    const workspaces = await getSlackWorkspaces()

    // 各ワークスペースのチャンネル数を取得
    const workspacesWithChannels = await Promise.all(
      workspaces.map(async (workspace) => {
        const rooms = await getRoomsByWorkspace(workspace.workspace_id)
        return {
          ...workspace,
          // トークンはマスク
          bot_token: workspace.bot_token ? '****' + workspace.bot_token.slice(-4) : '',
          signing_secret: workspace.signing_secret ? '****' + workspace.signing_secret.slice(-4) : '',
          channel_count: rooms.length,
          active_channel_count: rooms.filter(r => r.is_active).length,
        }
      })
    )

    return NextResponse.json(workspacesWithChannels)
  } catch (error) {
    console.error('Get Slack workspaces error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { workspaceId, workspaceName, botToken, signingSecret } = body

    if (!workspaceId || !workspaceName || !botToken || !signingSecret) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const workspace = await createSlackWorkspace({
      workspaceId,
      workspaceName,
      botToken,
      signingSecret,
    })

    return NextResponse.json({
      ...workspace,
      bot_token: '****' + workspace.bot_token.slice(-4),
      signing_secret: '****' + workspace.signing_secret.slice(-4),
    })
  } catch (error) {
    console.error('Create Slack workspace error:', error)
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { workspaceId, isActive } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspaceId' },
        { status: 400 }
      )
    }

    await updateSlackWorkspace(workspaceId, { isActive })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update Slack workspace error:', error)
    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspaceId' },
        { status: 400 }
      )
    }

    await deleteSlackWorkspace(workspaceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete Slack workspace error:', error)
    return NextResponse.json(
      { error: 'Failed to delete workspace' },
      { status: 500 }
    )
  }
}
