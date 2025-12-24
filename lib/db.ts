import { sql } from '@vercel/postgres'

export type Source = 'chatwork' | 'teams' | 'lark' | 'slack'

export type SlackWorkspace = {
  id: number
  workspace_id: string
  workspace_name: string
  bot_token: string
  signing_secret: string
  bot_user_id: string | null
  is_active: boolean
  created_at: string
}

// テーブル作成（初回のみ）+ マイグレーション
export async function initDatabase() {
  // Settings テーブル
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      chatwork_api_token TEXT,
      webhook_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Teams用カラム追加
  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS teams_webhook_secret TEXT
  `

  // メール通知設定カラム追加
  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS notification_emails TEXT
  `
  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS notify_on_create BOOLEAN DEFAULT true
  `
  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS notify_on_complete BOOLEAN DEFAULT true
  `
  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS notify_on_delete BOOLEAN DEFAULT false
  `
  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS resend_api_key TEXT
  `

  // Lark設定カラム追加
  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS lark_app_id TEXT
  `
  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS lark_app_secret TEXT
  `
  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS lark_verification_token TEXT
  `
  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS lark_encrypt_key TEXT
  `

  // Rooms テーブル
  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      room_id TEXT NOT NULL,
      room_name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  // source カラム追加
  await sql`
    ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'chatwork'
  `

  // 既存のUNIQUE制約を削除して新しい複合制約を追加
  // (room_id, source) でユニークにする
  try {
    await sql`
      ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_room_id_key
    `
  } catch {
    // 制約が存在しない場合は無視
  }

  try {
    await sql`
      ALTER TABLE rooms
      ADD CONSTRAINT rooms_room_id_source_unique UNIQUE (room_id, source)
    `
  } catch {
    // 既に制約がある場合は無視
  }

  // Tasks テーブル
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      room_id TEXT NOT NULL,
      message_id TEXT,
      content TEXT NOT NULL,
      original_message TEXT NOT NULL,
      sender_name TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  // source カラム追加
  await sql`
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'chatwork'
  `

  // workspace_id カラム追加（Slack用）
  await sql`
    ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS workspace_id TEXT
  `

  // Slack Workspaces テーブル
  await sql`
    CREATE TABLE IF NOT EXISTS slack_workspaces (
      id SERIAL PRIMARY KEY,
      workspace_id TEXT UNIQUE NOT NULL,
      workspace_name TEXT NOT NULL,
      bot_token TEXT NOT NULL,
      signing_secret TEXT NOT NULL,
      bot_user_id TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
}

// Settings
export async function getSettings() {
  const result = await sql`SELECT * FROM settings LIMIT 1`
  return result.rows[0] || null
}

export async function saveSettings(
  chatworkApiToken: string,
  webhookToken: string,
  teamsWebhookSecret?: string
) {
  const existing = await getSettings()
  if (existing) {
    if (teamsWebhookSecret !== undefined) {
      await sql`
        UPDATE settings
        SET chatwork_api_token = ${chatworkApiToken},
            webhook_token = ${webhookToken},
            teams_webhook_secret = ${teamsWebhookSecret}
        WHERE id = ${existing.id}
      `
    } else {
      await sql`
        UPDATE settings
        SET chatwork_api_token = ${chatworkApiToken},
            webhook_token = ${webhookToken}
        WHERE id = ${existing.id}
      `
    }
  } else {
    await sql`
      INSERT INTO settings (chatwork_api_token, webhook_token, teams_webhook_secret)
      VALUES (${chatworkApiToken}, ${webhookToken}, ${teamsWebhookSecret || null})
    `
  }
}

export async function saveTeamsSettings(teamsWebhookSecret: string) {
  const existing = await getSettings()
  if (existing) {
    await sql`
      UPDATE settings
      SET teams_webhook_secret = ${teamsWebhookSecret}
      WHERE id = ${existing.id}
    `
  } else {
    await sql`
      INSERT INTO settings (teams_webhook_secret)
      VALUES (${teamsWebhookSecret})
    `
  }
}

export async function saveLarkSettings(larkSettings: {
  appId?: string
  appSecret?: string
  verificationToken?: string
  encryptKey?: string
}) {
  const existing = await getSettings()
  if (existing) {
    await sql`
      UPDATE settings
      SET lark_app_id = COALESCE(${larkSettings.appId || null}, lark_app_id),
          lark_app_secret = COALESCE(${larkSettings.appSecret || null}, lark_app_secret),
          lark_verification_token = COALESCE(${larkSettings.verificationToken || null}, lark_verification_token),
          lark_encrypt_key = COALESCE(${larkSettings.encryptKey || null}, lark_encrypt_key)
      WHERE id = ${existing.id}
    `
  } else {
    await sql`
      INSERT INTO settings (lark_app_id, lark_app_secret, lark_verification_token, lark_encrypt_key)
      VALUES (${larkSettings.appId || null}, ${larkSettings.appSecret || null}, ${larkSettings.verificationToken || null}, ${larkSettings.encryptKey || null})
    `
  }
}

// 通知設定
export type NotificationSettings = {
  notification_emails: string[]
  notify_on_create: boolean
  notify_on_complete: boolean
  notify_on_delete: boolean
  resend_api_key: string
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const settings = await getSettings()
  if (!settings) {
    return {
      notification_emails: [],
      notify_on_create: true,
      notify_on_complete: true,
      notify_on_delete: false,
      resend_api_key: '',
    }
  }

  // notification_emails はカンマ区切りで保存
  const emailsStr = settings.notification_emails || ''
  const emails = emailsStr ? emailsStr.split(',').map((e: string) => e.trim()).filter(Boolean) : []

  return {
    notification_emails: emails,
    notify_on_create: settings.notify_on_create ?? true,
    notify_on_complete: settings.notify_on_complete ?? true,
    notify_on_delete: settings.notify_on_delete ?? false,
    resend_api_key: settings.resend_api_key || '',
  }
}

export async function saveNotificationSettings(notificationSettings: Omit<NotificationSettings, 'resend_api_key'> & { resend_api_key?: string }) {
  const existing = await getSettings()
  const emailsStr = notificationSettings.notification_emails.join(',')

  if (existing) {
    if (notificationSettings.resend_api_key !== undefined) {
      await sql`
        UPDATE settings
        SET notification_emails = ${emailsStr},
            notify_on_create = ${notificationSettings.notify_on_create},
            notify_on_complete = ${notificationSettings.notify_on_complete},
            notify_on_delete = ${notificationSettings.notify_on_delete},
            resend_api_key = ${notificationSettings.resend_api_key}
        WHERE id = ${existing.id}
      `
    } else {
      await sql`
        UPDATE settings
        SET notification_emails = ${emailsStr},
            notify_on_create = ${notificationSettings.notify_on_create},
            notify_on_complete = ${notificationSettings.notify_on_complete},
            notify_on_delete = ${notificationSettings.notify_on_delete}
        WHERE id = ${existing.id}
      `
    }
  } else {
    await sql`
      INSERT INTO settings (notification_emails, notify_on_create, notify_on_complete, notify_on_delete, resend_api_key)
      VALUES (${emailsStr}, ${notificationSettings.notify_on_create}, ${notificationSettings.notify_on_complete}, ${notificationSettings.notify_on_delete}, ${notificationSettings.resend_api_key || null})
    `
  }
}

// Rooms
export async function getRooms() {
  const result = await sql`SELECT * FROM rooms ORDER BY source, room_name`
  return result.rows
}

export async function getRoomsBySource(source: Source) {
  const result = await sql`
    SELECT * FROM rooms
    WHERE source = ${source}
    ORDER BY room_name
  `
  return result.rows
}

export async function getActiveRooms() {
  const result = await sql`SELECT * FROM rooms WHERE is_active = true`
  return result.rows
}

export async function getActiveRoomsBySource(source: Source) {
  const result = await sql`
    SELECT * FROM rooms
    WHERE is_active = true AND source = ${source}
  `
  return result.rows
}

export async function upsertRoom(roomId: string, roomName: string, source: Source = 'chatwork') {
  await sql`
    INSERT INTO rooms (room_id, room_name, source)
    VALUES (${roomId}, ${roomName}, ${source})
    ON CONFLICT (room_id, source) DO UPDATE SET room_name = ${roomName}
  `
}

export async function createRoom(roomId: string, roomName: string, source: Source) {
  const result = await sql`
    INSERT INTO rooms (room_id, room_name, source, is_active)
    VALUES (${roomId}, ${roomName}, ${source}, true)
    ON CONFLICT (room_id, source) DO UPDATE SET room_name = ${roomName}
    RETURNING *
  `
  return result.rows[0]
}

export async function setRoomActive(roomId: string, isActive: boolean, source?: Source) {
  if (source) {
    await sql`
      UPDATE rooms SET is_active = ${isActive}
      WHERE room_id = ${roomId} AND source = ${source}
    `
  } else {
    await sql`
      UPDATE rooms SET is_active = ${isActive} WHERE room_id = ${roomId}
    `
  }
}

export async function deleteRoom(roomId: string, source: Source) {
  await sql`
    DELETE FROM rooms WHERE room_id = ${roomId} AND source = ${source}
  `
}

// Tasks
export async function getTasks() {
  const result = await sql`
    SELECT * FROM tasks
    ORDER BY
      CASE status
        WHEN 'pending' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'completed' THEN 3
      END,
      CASE priority
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
      END,
      created_at DESC
  `
  return result.rows
}

export async function getTaskByMessageId(messageId: string, source: Source) {
  const result = await sql`
    SELECT * FROM tasks WHERE message_id = ${messageId} AND source = ${source} LIMIT 1
  `
  return result.rows[0] || null
}

export async function getTaskById(id: number) {
  const result = await sql`
    SELECT * FROM tasks WHERE id = ${id} LIMIT 1
  `
  return result.rows[0] || null
}

export async function createTask(task: {
  roomId: string
  messageId: string
  content: string
  originalMessage: string
  senderName: string
  priority: string
  source?: Source
}) {
  const source = task.source || 'chatwork'
  const result = await sql`
    INSERT INTO tasks (room_id, message_id, content, original_message, sender_name, priority, source)
    VALUES (${task.roomId}, ${task.messageId}, ${task.content}, ${task.originalMessage}, ${task.senderName}, ${task.priority}, ${source})
    RETURNING *
  `
  return result.rows[0]
}

export async function updateTaskStatus(id: number, status: string) {
  await sql`
    UPDATE tasks
    SET status = ${status}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
  `
}

export async function deleteTask(id: number) {
  await sql`DELETE FROM tasks WHERE id = ${id}`
}

// Slack Workspaces
export async function getSlackWorkspaces(): Promise<SlackWorkspace[]> {
  const result = await sql`
    SELECT * FROM slack_workspaces ORDER BY workspace_name
  `
  return result.rows as SlackWorkspace[]
}

export async function getSlackWorkspace(workspaceId: string): Promise<SlackWorkspace | null> {
  const result = await sql`
    SELECT * FROM slack_workspaces WHERE workspace_id = ${workspaceId} LIMIT 1
  `
  return (result.rows[0] as SlackWorkspace) || null
}

export async function getActiveSlackWorkspaces(): Promise<SlackWorkspace[]> {
  const result = await sql`
    SELECT * FROM slack_workspaces WHERE is_active = true ORDER BY workspace_name
  `
  return result.rows as SlackWorkspace[]
}

export async function createSlackWorkspace(workspace: {
  workspaceId: string
  workspaceName: string
  botToken: string
  signingSecret: string
  botUserId?: string
}): Promise<SlackWorkspace> {
  const result = await sql`
    INSERT INTO slack_workspaces (workspace_id, workspace_name, bot_token, signing_secret, bot_user_id)
    VALUES (${workspace.workspaceId}, ${workspace.workspaceName}, ${workspace.botToken}, ${workspace.signingSecret}, ${workspace.botUserId || null})
    ON CONFLICT (workspace_id) DO UPDATE SET
      workspace_name = ${workspace.workspaceName},
      bot_token = ${workspace.botToken},
      signing_secret = ${workspace.signingSecret},
      bot_user_id = COALESCE(${workspace.botUserId || null}, slack_workspaces.bot_user_id)
    RETURNING *
  `
  return result.rows[0] as SlackWorkspace
}

export async function updateSlackWorkspace(workspaceId: string, updates: {
  workspaceName?: string
  botToken?: string
  signingSecret?: string
  botUserId?: string
  isActive?: boolean
}) {
  await sql`
    UPDATE slack_workspaces
    SET workspace_name = COALESCE(${updates.workspaceName || null}, workspace_name),
        bot_token = COALESCE(${updates.botToken || null}, bot_token),
        signing_secret = COALESCE(${updates.signingSecret || null}, signing_secret),
        bot_user_id = COALESCE(${updates.botUserId || null}, bot_user_id),
        is_active = COALESCE(${updates.isActive ?? null}, is_active)
    WHERE workspace_id = ${workspaceId}
  `
}

export async function deleteSlackWorkspace(workspaceId: string) {
  // まず関連するroomsを削除
  await sql`
    DELETE FROM rooms WHERE source = 'slack' AND workspace_id = ${workspaceId}
  `
  // ワークスペースを削除
  await sql`
    DELETE FROM slack_workspaces WHERE workspace_id = ${workspaceId}
  `
}

// Slack用のルーム取得（ワークスペース指定）
export async function getRoomsByWorkspace(workspaceId: string): Promise<{ id: number; room_id: string; room_name: string; is_active: boolean; workspace_id: string }[]> {
  const result = await sql`
    SELECT * FROM rooms
    WHERE source = 'slack' AND workspace_id = ${workspaceId}
    ORDER BY room_name
  `
  return result.rows as { id: number; room_id: string; room_name: string; is_active: boolean; workspace_id: string }[]
}

export async function getActiveRoomsByWorkspace(workspaceId: string) {
  const result = await sql`
    SELECT * FROM rooms
    WHERE source = 'slack' AND workspace_id = ${workspaceId} AND is_active = true
  `
  return result.rows
}

export async function createSlackRoom(roomId: string, roomName: string, workspaceId: string) {
  const result = await sql`
    INSERT INTO rooms (room_id, room_name, source, workspace_id, is_active)
    VALUES (${roomId}, ${roomName}, 'slack', ${workspaceId}, true)
    ON CONFLICT (room_id, source) DO UPDATE SET room_name = ${roomName}, workspace_id = ${workspaceId}
    RETURNING *
  `
  return result.rows[0]
}
