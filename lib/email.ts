import { Resend } from 'resend'
import { getNotificationSettings } from './db'

// APIキーごとにクライアントをキャッシュ
const resendClients = new Map<string, Resend>()

function getResendClient(apiKey: string): Resend {
  let client = resendClients.get(apiKey)
  if (!client) {
    client = new Resend(apiKey)
    resendClients.set(apiKey, client)
  }
  return client
}

export type TaskInfo = {
  id: number
  content: string
  sender_name: string
  source: 'chatwork' | 'teams' | 'lark' | 'slack' | 'line'
  priority: string
  status?: string
}

type NotificationType = 'create' | 'complete' | 'delete'

const NOTIFICATION_SUBJECTS: Record<NotificationType, string> = {
  create: '新しいタスクが登録されました',
  complete: 'タスクが完了しました',
  delete: 'タスクが削除されました',
}

const SOURCE_LABELS: Record<string, string> = {
  chatwork: 'Chatwork',
  teams: 'Teams',
  lark: 'Lark',
  slack: 'Slack',
  line: 'LINE',
}

const PRIORITY_LABELS: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

function generateEmailHtml(task: TaskInfo, type: NotificationType, dashboardUrl: string): string {
  const sourceLabel = SOURCE_LABELS[task.source] || task.source
  const priorityLabel = PRIORITY_LABELS[task.priority] || task.priority

  const typeMessages: Record<NotificationType, string> = {
    create: `<span style="color: #059669; font-weight: bold;">新規登録</span>`,
    complete: `<span style="color: #2563eb; font-weight: bold;">完了</span>`,
    delete: `<span style="color: #dc2626; font-weight: bold;">削除</span>`,
  }

  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background: linear-gradient(to right, #14b8a6, #06b6d4); padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">たすきゃっちゃー</h1>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
          ${typeMessages[type]}
        </p>

        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 80px;">タスク:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 500;">${task.content}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">送信元:</td>
              <td style="padding: 8px 0; color: #111827;">${sourceLabel}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">送信者:</td>
              <td style="padding: 8px 0; color: #111827;">${task.sender_name || '不明'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">優先度:</td>
              <td style="padding: 8px 0; color: #111827;">${priorityLabel}</td>
            </tr>
          </table>
        </div>

        <a href="${dashboardUrl}" style="display: inline-block; background: #14b8a6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          ダッシュボードを開く
        </a>
      </div>
      <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
        このメールは「たすきゃっちゃー」から自動送信されています。
      </p>
    </body>
    </html>
  `
}

export async function sendTaskNotification(
  task: TaskInfo,
  type: NotificationType,
  dashboardUrl: string = 'https://task-extractor-ten.vercel.app/'
): Promise<{ success: boolean; error?: string }> {
  try {
    // 通知設定を取得
    const settings = await getNotificationSettings()

    // APIキーがない場合はスキップ
    if (!settings.resend_api_key) {
      console.log('[Email] Resend API key not configured, skipping notification')
      return { success: true }
    }

    // 通知が無効の場合はスキップ
    if (type === 'create' && !settings.notify_on_create) {
      console.log('[Email] Create notification disabled')
      return { success: true }
    }
    if (type === 'complete' && !settings.notify_on_complete) {
      console.log('[Email] Complete notification disabled')
      return { success: true }
    }
    if (type === 'delete' && !settings.notify_on_delete) {
      console.log('[Email] Delete notification disabled')
      return { success: true }
    }

    // 送信先がない場合はスキップ
    if (settings.notification_emails.length === 0) {
      console.log('[Email] No notification emails configured')
      return { success: true }
    }

    // Resendクライアントを取得
    const client = getResendClient(settings.resend_api_key)

    const subject = `[たすきゃっちゃー] ${NOTIFICATION_SUBJECTS[type]}`
    const html = generateEmailHtml(task, type, dashboardUrl)

    console.log('[Email] Sending notification to:', settings.notification_emails)

    const { error } = await client.emails.send({
      from: 'たすきゃっちゃー <onboarding@resend.dev>',
      to: settings.notification_emails,
      subject,
      html,
    })

    if (error) {
      console.error('[Email] Failed to send:', error)
      return { success: false, error: error.message }
    }

    console.log('[Email] Notification sent successfully')
    return { success: true }
  } catch (error) {
    console.error('[Email] Error sending notification:', error)
    return { success: false, error: String(error) }
  }
}
