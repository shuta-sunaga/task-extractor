import { NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/db'

export async function GET() {
  try {
    const settings = await getSettings()
    if (!settings) {
      return NextResponse.json({
        chatwork_api_token: '',
        webhook_token: '',
      })
    }

    // APIトークンはマスクして返す
    return NextResponse.json({
      chatwork_api_token: settings.chatwork_api_token
        ? '****' + settings.chatwork_api_token.slice(-4)
        : '',
      webhook_token: settings.webhook_token || '',
      has_token: Boolean(settings.chatwork_api_token),
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
    const { chatworkApiToken, webhookToken } = body

    await saveSettings(chatworkApiToken, webhookToken)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save settings error:', error)
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    )
  }
}
