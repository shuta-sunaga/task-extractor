import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getSlackWorkspaces,
  getSlackWorkspace,
  createSlackWorkspace,
  deleteSlackWorkspace,
  updateSlackWorkspace,
  getRoomsByWorkspace,
} from '@/lib/db'
import { getSlackBotInfo } from '@/lib/slack'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const companyId = session?.user?.companyId ?? undefined
    const workspaces = await getSlackWorkspaces(companyId)

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
    const session = await getServerSession(authOptions)
    const companyId = session?.user?.companyId ?? undefined

    const body = await request.json()
    const { workspaceId, workspaceName, botToken, signingSecret } = body

    if (!workspaceId || !workspaceName || !botToken || !signingSecret) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // auth.test APIでボット情報を取得
    const botInfo = await getSlackBotInfo(botToken)
    if (!botInfo.ok) {
      console.error('Failed to verify bot token:', botInfo.error)
      return NextResponse.json(
        { error: `Invalid bot token: ${botInfo.error}` },
        { status: 400 }
      )
    }

    console.log('[Slack] Bot info:', { userId: botInfo.userId, teamId: botInfo.teamId })

    const workspace = await createSlackWorkspace({
      workspaceId,
      workspaceName,
      botToken,
      signingSecret,
      botUserId: botInfo.userId,
      companyId,
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
    const session = await getServerSession(authOptions)
    const companyId = session?.user?.companyId

    const body = await request.json()
    const { workspaceId, isActive } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Missing workspaceId' },
        { status: 400 }
      )
    }

    // 企業IDが一致するか確認
    const workspace = await getSlackWorkspace(workspaceId)
    if (!workspace || (companyId && workspace.company_id !== companyId)) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
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

    // 企業IDが一致するか確認
    const workspace = await getSlackWorkspace(workspaceId)
    if (!workspace || (companyId && workspace.company_id !== companyId)) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
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
