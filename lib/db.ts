import { sql } from '@vercel/postgres'

export type Source = 'chatwork' | 'teams'

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
