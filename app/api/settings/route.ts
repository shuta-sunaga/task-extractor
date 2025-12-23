import { NextResponse } from 'next/server'
import { getSettings, saveSettings, saveTeamsSettings, getNotificationSettings, saveNotificationSettings } from '@/lib/db'

export async function GET() {
  try {
    const settings = await getSettings()
    const notificationSettings = await getNotificationSettings()

    if (!settings) {
      return NextResponse.json({
        chatwork_api_token: '',
        webhook_token: '',
        teams_webhook_secret: '',
        has_chatwork_token: false,
        has_teams_secret: false,
        notification_emails: notificationSettings.notification_emails,
        notify_on_create: notificationSettings.notify_on_create,
        notify_on_complete: notificationSettings.notify_on_complete,
        notify_on_delete: notificationSettings.notify_on_delete,
        resend_api_key: '',
        has_resend_key: false,
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
      notification_emails: notificationSettings.notification_emails,
      notify_on_create: notificationSettings.notify_on_create,
      notify_on_complete: notificationSettings.notify_on_complete,
      notify_on_delete: notificationSettings.notify_on_delete,
      resend_api_key: notificationSettings.resend_api_key
        ? '****' + notificationSettings.resend_api_key.slice(-4)
        : '',
      has_resend_key: Boolean(notificationSettings.resend_api_key),
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
    const {
      chatworkApiToken,
      webhookToken,
      teamsWebhookSecret,
      notificationEmails,
      notifyOnCreate,
      notifyOnComplete,
      notifyOnDelete,
      resendApiKey,
    } = body

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

    // 通知設定の保存
    if (notificationEmails !== undefined || resendApiKey !== undefined) {
      await saveNotificationSettings({
        notification_emails: notificationEmails ?? [],
        notify_on_create: notifyOnCreate ?? true,
        notify_on_complete: notifyOnComplete ?? true,
        notify_on_delete: notifyOnDelete ?? false,
        resend_api_key: resendApiKey,
      })
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
