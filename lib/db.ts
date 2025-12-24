import { sql } from '@vercel/postgres'

export type Source = 'chatwork' | 'teams' | 'lark' | 'slack'
export type UserType = 'system_admin' | 'admin' | 'user'

export type SlackWorkspace = {
  id: number
  workspace_id: string
  workspace_name: string
  bot_token: string
  signing_secret: string
  bot_user_id: string | null
  is_active: boolean
  created_at: string
  company_id: number | null
}

export type Company = {
  id: number
  name: string
  slug: string
  is_active: boolean
  created_at: string
}

export type User = {
  id: number
  company_id: number | null
  email: string
  password_hash: string
  name: string
  user_type: UserType
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export type Role = {
  id: number
  company_id: number
  name: string
  description: string | null
  created_at: string
}

export type RolePermission = {
  id: number
  role_id: number
  room_id: string | null
  source: Source | null
  can_view: boolean
  can_edit_status: boolean
  can_delete: boolean
}

export type UserRole = {
  user_id: number
  role_id: number
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

  // ========== マルチテナント・認証関連テーブル ==========

  // Companies テーブル（企業）
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Users テーブル
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      user_type TEXT NOT NULL CHECK (user_type IN ('system_admin', 'admin', 'user')),
      is_active BOOLEAN DEFAULT true,
      last_login_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Roles テーブル
  await sql`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Role Permissions テーブル
  await sql`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id SERIAL PRIMARY KEY,
      role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
      room_id TEXT,
      source TEXT,
      can_view BOOLEAN DEFAULT true,
      can_edit_status BOOLEAN DEFAULT true,
      can_delete BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  // User Roles テーブル
  await sql`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, role_id)
    )
  `

  // ========== 既存テーブルへの company_id 追加 ==========

  // settings に company_id 追加
  await sql`
    ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
  `

  // rooms に company_id 追加
  await sql`
    ALTER TABLE rooms
    ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
  `

  // tasks に company_id 追加
  await sql`
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
  `

  // slack_workspaces に company_id 追加
  await sql`
    ALTER TABLE slack_workspaces
    ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE
  `

  // インデックス作成
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_roles_company ON roles(company_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_settings_company ON settings(company_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_rooms_company ON rooms(company_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_slack_workspaces_company ON slack_workspaces(company_id)`
  } catch {
    // インデックスが既に存在する場合は無視
  }
}

// Settings
export async function getSettings(companyId?: number) {
  if (companyId) {
    const result = await sql`SELECT * FROM settings WHERE company_id = ${companyId} LIMIT 1`
    return result.rows[0] || null
  }
  const result = await sql`SELECT * FROM settings LIMIT 1`
  return result.rows[0] || null
}

export async function saveSettings(
  chatworkApiToken: string,
  webhookToken: string,
  teamsWebhookSecret?: string,
  companyId?: number
) {
  const existing = await getSettings(companyId)
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
      INSERT INTO settings (chatwork_api_token, webhook_token, teams_webhook_secret, company_id)
      VALUES (${chatworkApiToken}, ${webhookToken}, ${teamsWebhookSecret || null}, ${companyId || null})
    `
  }
}

export async function saveTeamsSettings(teamsWebhookSecret: string, companyId?: number) {
  const existing = await getSettings(companyId)
  if (existing) {
    await sql`
      UPDATE settings
      SET teams_webhook_secret = ${teamsWebhookSecret}
      WHERE id = ${existing.id}
    `
  } else {
    await sql`
      INSERT INTO settings (teams_webhook_secret, company_id)
      VALUES (${teamsWebhookSecret}, ${companyId || null})
    `
  }
}

export async function saveLarkSettings(larkSettings: {
  appId?: string
  appSecret?: string
  verificationToken?: string
  encryptKey?: string
}, companyId?: number) {
  const existing = await getSettings(companyId)
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
      INSERT INTO settings (lark_app_id, lark_app_secret, lark_verification_token, lark_encrypt_key, company_id)
      VALUES (${larkSettings.appId || null}, ${larkSettings.appSecret || null}, ${larkSettings.verificationToken || null}, ${larkSettings.encryptKey || null}, ${companyId || null})
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

export async function getNotificationSettings(companyId?: number): Promise<NotificationSettings> {
  const settings = await getSettings(companyId)
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

export async function saveNotificationSettings(notificationSettings: Omit<NotificationSettings, 'resend_api_key'> & { resend_api_key?: string }, companyId?: number) {
  const existing = await getSettings(companyId)
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
      INSERT INTO settings (notification_emails, notify_on_create, notify_on_complete, notify_on_delete, resend_api_key, company_id)
      VALUES (${emailsStr}, ${notificationSettings.notify_on_create}, ${notificationSettings.notify_on_complete}, ${notificationSettings.notify_on_delete}, ${notificationSettings.resend_api_key || null}, ${companyId || null})
    `
  }
}

// Rooms
export async function getRooms(companyId?: number) {
  if (companyId) {
    const result = await sql`SELECT * FROM rooms WHERE company_id = ${companyId} ORDER BY source, room_name`
    return result.rows
  }
  const result = await sql`SELECT * FROM rooms ORDER BY source, room_name`
  return result.rows
}

export async function getRoomsBySource(source: Source, companyId?: number) {
  if (companyId) {
    const result = await sql`
      SELECT * FROM rooms
      WHERE source = ${source} AND company_id = ${companyId}
      ORDER BY room_name
    `
    return result.rows
  }
  const result = await sql`
    SELECT * FROM rooms
    WHERE source = ${source}
    ORDER BY room_name
  `
  return result.rows
}

export async function getActiveRooms(companyId?: number) {
  if (companyId) {
    const result = await sql`SELECT * FROM rooms WHERE is_active = true AND company_id = ${companyId}`
    return result.rows
  }
  const result = await sql`SELECT * FROM rooms WHERE is_active = true`
  return result.rows
}

export async function getActiveRoomsBySource(source: Source, companyId?: number) {
  if (companyId) {
    const result = await sql`
      SELECT * FROM rooms
      WHERE is_active = true AND source = ${source} AND company_id = ${companyId}
    `
    return result.rows
  }
  const result = await sql`
    SELECT * FROM rooms
    WHERE is_active = true AND source = ${source}
  `
  return result.rows
}

export async function upsertRoom(roomId: string, roomName: string, source: Source = 'chatwork', companyId?: number) {
  if (companyId) {
    await sql`
      INSERT INTO rooms (room_id, room_name, source, company_id)
      VALUES (${roomId}, ${roomName}, ${source}, ${companyId})
      ON CONFLICT (room_id, source) DO UPDATE SET room_name = ${roomName}, company_id = ${companyId}
    `
  } else {
    await sql`
      INSERT INTO rooms (room_id, room_name, source)
      VALUES (${roomId}, ${roomName}, ${source})
      ON CONFLICT (room_id, source) DO UPDATE SET room_name = ${roomName}
    `
  }
}

export async function createRoom(roomId: string, roomName: string, source: Source, companyId?: number) {
  if (companyId) {
    const result = await sql`
      INSERT INTO rooms (room_id, room_name, source, is_active, company_id)
      VALUES (${roomId}, ${roomName}, ${source}, true, ${companyId})
      ON CONFLICT (room_id, source) DO UPDATE SET room_name = ${roomName}, company_id = ${companyId}
      RETURNING *
    `
    return result.rows[0]
  }
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

export async function getRoomByIdAndSource(roomId: string, source: Source): Promise<{ id: number; room_id: string; room_name: string; is_active: boolean; workspace_id?: string; company_id?: number } | null> {
  const result = await sql`
    SELECT * FROM rooms WHERE room_id = ${roomId} AND source = ${source} LIMIT 1
  `
  return result.rows[0] as { id: number; room_id: string; room_name: string; is_active: boolean; workspace_id?: string; company_id?: number } | null
}

// Tasks
export async function getTasks(companyId?: number) {
  if (companyId) {
    const result = await sql`
      SELECT * FROM tasks
      WHERE company_id = ${companyId}
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
  companyId?: number
}) {
  const source = task.source || 'chatwork'
  if (task.companyId) {
    const result = await sql`
      INSERT INTO tasks (room_id, message_id, content, original_message, sender_name, priority, source, company_id)
      VALUES (${task.roomId}, ${task.messageId}, ${task.content}, ${task.originalMessage}, ${task.senderName}, ${task.priority}, ${source}, ${task.companyId})
      RETURNING *
    `
    return result.rows[0]
  }
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
export async function getSlackWorkspaces(companyId?: number): Promise<SlackWorkspace[]> {
  if (companyId !== undefined) {
    const result = await sql`
      SELECT * FROM slack_workspaces WHERE company_id = ${companyId} ORDER BY workspace_name
    `
    return result.rows as SlackWorkspace[]
  }
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
  companyId?: number
}): Promise<SlackWorkspace> {
  const result = await sql`
    INSERT INTO slack_workspaces (workspace_id, workspace_name, bot_token, signing_secret, bot_user_id, company_id)
    VALUES (${workspace.workspaceId}, ${workspace.workspaceName}, ${workspace.botToken}, ${workspace.signingSecret}, ${workspace.botUserId || null}, ${workspace.companyId ?? null})
    ON CONFLICT (workspace_id) DO UPDATE SET
      workspace_name = ${workspace.workspaceName},
      bot_token = ${workspace.botToken},
      signing_secret = ${workspace.signingSecret},
      bot_user_id = COALESCE(${workspace.botUserId || null}, slack_workspaces.bot_user_id),
      company_id = COALESCE(${workspace.companyId ?? null}, slack_workspaces.company_id)
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

export async function createSlackRoom(roomId: string, roomName: string, workspaceId: string, companyId?: number) {
  const result = await sql`
    INSERT INTO rooms (room_id, room_name, source, workspace_id, is_active, company_id)
    VALUES (${roomId}, ${roomName}, 'slack', ${workspaceId}, true, ${companyId ?? null})
    ON CONFLICT (room_id, source) DO UPDATE SET room_name = ${roomName}, workspace_id = ${workspaceId}, company_id = COALESCE(${companyId ?? null}, rooms.company_id)
    RETURNING *
  `
  return result.rows[0]
}

// ========== Companies ==========

export async function getCompanies(): Promise<Company[]> {
  const result = await sql`
    SELECT * FROM companies ORDER BY name
  `
  return result.rows as Company[]
}

export async function getCompanyById(id: number): Promise<Company | null> {
  const result = await sql`
    SELECT * FROM companies WHERE id = ${id} LIMIT 1
  `
  return (result.rows[0] as Company) || null
}

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const result = await sql`
    SELECT * FROM companies WHERE slug = ${slug} LIMIT 1
  `
  return (result.rows[0] as Company) || null
}

export async function createCompany(name: string, slug: string): Promise<Company> {
  const result = await sql`
    INSERT INTO companies (name, slug)
    VALUES (${name}, ${slug})
    RETURNING *
  `
  return result.rows[0] as Company
}

export async function updateCompany(id: number, updates: { name?: string; slug?: string; is_active?: boolean }): Promise<Company | null> {
  const result = await sql`
    UPDATE companies
    SET name = COALESCE(${updates.name || null}, name),
        slug = COALESCE(${updates.slug || null}, slug),
        is_active = COALESCE(${updates.is_active ?? null}, is_active)
    WHERE id = ${id}
    RETURNING *
  `
  return (result.rows[0] as Company) || null
}

export async function deleteCompany(id: number): Promise<void> {
  await sql`DELETE FROM companies WHERE id = ${id}`
}

// ========== Users ==========

export async function getUsers(companyId?: number): Promise<User[]> {
  if (companyId) {
    const result = await sql`
      SELECT * FROM users WHERE company_id = ${companyId} ORDER BY name
    `
    return result.rows as User[]
  }
  const result = await sql`SELECT * FROM users ORDER BY name`
  return result.rows as User[]
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await sql`
    SELECT * FROM users WHERE id = ${id} LIMIT 1
  `
  return (result.rows[0] as User) || null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await sql`
    SELECT * FROM users WHERE email = ${email} LIMIT 1
  `
  return (result.rows[0] as User) || null
}

export async function createUser(user: {
  companyId: number | null
  email: string
  passwordHash: string
  name: string
  userType: UserType
}): Promise<User> {
  const result = await sql`
    INSERT INTO users (company_id, email, password_hash, name, user_type)
    VALUES (${user.companyId}, ${user.email}, ${user.passwordHash}, ${user.name}, ${user.userType})
    RETURNING *
  `
  return result.rows[0] as User
}

export async function updateUser(id: number, updates: {
  email?: string
  passwordHash?: string
  name?: string
  userType?: UserType
  isActive?: boolean
  companyId?: number | null
}): Promise<User | null> {
  // companyIdが明示的に指定された場合は更新する
  if (updates.companyId !== undefined) {
    const result = await sql`
      UPDATE users
      SET email = COALESCE(${updates.email || null}, email),
          password_hash = COALESCE(${updates.passwordHash || null}, password_hash),
          name = COALESCE(${updates.name || null}, name),
          user_type = COALESCE(${updates.userType || null}, user_type),
          is_active = COALESCE(${updates.isActive ?? null}, is_active),
          company_id = ${updates.companyId}
      WHERE id = ${id}
      RETURNING *
    `
    return (result.rows[0] as User) || null
  }
  const result = await sql`
    UPDATE users
    SET email = COALESCE(${updates.email || null}, email),
        password_hash = COALESCE(${updates.passwordHash || null}, password_hash),
        name = COALESCE(${updates.name || null}, name),
        user_type = COALESCE(${updates.userType || null}, user_type),
        is_active = COALESCE(${updates.isActive ?? null}, is_active)
    WHERE id = ${id}
    RETURNING *
  `
  return (result.rows[0] as User) || null
}

export async function updateLastLogin(id: number): Promise<void> {
  await sql`
    UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ${id}
  `
}

export async function deleteUser(id: number): Promise<void> {
  await sql`DELETE FROM users WHERE id = ${id}`
}

// ========== Roles ==========

export async function getRoles(companyId: number): Promise<Role[]> {
  const result = await sql`
    SELECT * FROM roles WHERE company_id = ${companyId} ORDER BY name
  `
  return result.rows as Role[]
}

export async function getRoleById(id: number): Promise<Role | null> {
  const result = await sql`
    SELECT * FROM roles WHERE id = ${id} LIMIT 1
  `
  return (result.rows[0] as Role) || null
}

export async function createRole(companyId: number, name: string, description?: string): Promise<Role> {
  const result = await sql`
    INSERT INTO roles (company_id, name, description)
    VALUES (${companyId}, ${name}, ${description || null})
    RETURNING *
  `
  return result.rows[0] as Role
}

export async function updateRole(id: number, updates: { name?: string; description?: string }): Promise<Role | null> {
  const result = await sql`
    UPDATE roles
    SET name = COALESCE(${updates.name || null}, name),
        description = COALESCE(${updates.description || null}, description)
    WHERE id = ${id}
    RETURNING *
  `
  return (result.rows[0] as Role) || null
}

export async function deleteRole(id: number): Promise<void> {
  await sql`DELETE FROM roles WHERE id = ${id}`
}

// ========== Role Permissions ==========

export async function getRolePermissions(roleId: number): Promise<RolePermission[]> {
  const result = await sql`
    SELECT * FROM role_permissions WHERE role_id = ${roleId}
  `
  return result.rows as RolePermission[]
}

export async function addRolePermission(permission: {
  roleId: number
  roomId?: string | null
  source?: Source | null
  canView?: boolean
  canEditStatus?: boolean
  canDelete?: boolean
}): Promise<RolePermission> {
  const result = await sql`
    INSERT INTO role_permissions (role_id, room_id, source, can_view, can_edit_status, can_delete)
    VALUES (${permission.roleId}, ${permission.roomId || null}, ${permission.source || null}, ${permission.canView ?? true}, ${permission.canEditStatus ?? true}, ${permission.canDelete ?? false})
    RETURNING *
  `
  return result.rows[0] as RolePermission
}

export async function deleteRolePermission(id: number): Promise<void> {
  await sql`DELETE FROM role_permissions WHERE id = ${id}`
}

export async function deleteRolePermissionsByRole(roleId: number): Promise<void> {
  await sql`DELETE FROM role_permissions WHERE role_id = ${roleId}`
}

// ========== User Roles ==========

export async function getUserRoles(userId: number): Promise<Role[]> {
  const result = await sql`
    SELECT r.* FROM roles r
    INNER JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ${userId}
  `
  return result.rows as Role[]
}

export async function addUserRole(userId: number, roleId: number): Promise<void> {
  await sql`
    INSERT INTO user_roles (user_id, role_id)
    VALUES (${userId}, ${roleId})
    ON CONFLICT (user_id, role_id) DO NOTHING
  `
}

export async function removeUserRole(userId: number, roleId: number): Promise<void> {
  await sql`DELETE FROM user_roles WHERE user_id = ${userId} AND role_id = ${roleId}`
}

export async function getUserRolePermissions(userId: number): Promise<RolePermission[]> {
  const result = await sql`
    SELECT rp.* FROM role_permissions rp
    INNER JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = ${userId}
  `
  return result.rows as RolePermission[]
}

// ========== 初期データ投入 ==========

export async function createInitialSystemAdmin(email: string, passwordHash: string, name: string): Promise<User> {
  // 既存のシステム管理者がいない場合のみ作成
  const existing = await sql`
    SELECT * FROM users WHERE user_type = 'system_admin' LIMIT 1
  `
  if (existing.rows.length > 0) {
    return existing.rows[0] as User
  }

  const result = await sql`
    INSERT INTO users (company_id, email, password_hash, name, user_type)
    VALUES (NULL, ${email}, ${passwordHash}, ${name}, 'system_admin')
    RETURNING *
  `
  return result.rows[0] as User
}
