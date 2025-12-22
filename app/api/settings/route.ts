import { NextResponse } from 'next/server'
import { getSettings, saveSettings, saveTeamsSettings } from '@/lib/db'

export async function GET() {
  try {
    const settings = await getSettings()
    if (!settings) {
      return NextResponse.json({
        chatwork_api_token: '',
        webhook_token: '',
        teams_webhook_secret: '',
        has_chatwork_token: false,
        has_teams_secret: false,
      })
    }

    // トークンはマスクして返す
    return NextResponse.json({
      chatwork_api_token: settings.chatwork_api_token
        ? '****' + settings.chatwork_api_token.slice(-4)
        : '',
      webhook_token: settings.webhook_token || '',
      teams_webhook_secret: settings.teams_webhook_secret
        ? '****' + settings.teams_webhook_secret.slice(-4)
        : '',
      has_chatwork_token: Boolean(settings.chatwork_api_token),
      has_teams_secret: Boolean(settings.teams_webhook_secret),
    })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { chatworkApiToken, webhookToken, teamsWebhookSecret } = body

    // Chatwork設定の保存
    if (chatworkApiToken !== undefined || webhookToken !== undefined) {
      await saveSettings(
        chatworkApiToken || '',
        webhookToken || '',
        teamsWebhookSecret
      )
    }

    // Teams設定のみの保存
    if (teamsWebhookSecret !== undefined && chatworkApiToken === undefined) {
      await saveTeamsSettings(teamsWebhookSecret)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save settings error:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
