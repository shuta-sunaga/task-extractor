import { sql } from '@vercel/postgres'

// テーブル作成（初回のみ）
export async function initDatabase() {
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      id SERIAL PRIMARY KEY,
      chatwork_api_token TEXT,
      webhook_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY,
      room_id TEXT UNIQUE NOT NULL,
      room_name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

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
}

// Settings
export async function getSettings() {
  const result = await sql`SELECT * FROM settings LIMIT 1`
  return result.rows[0] || null
}

export async function saveSettings(chatworkApiToken: string, webhookToken: string) {
  const existing = await getSettings()
  if (existing) {
    await sql`
      UPDATE settings
      SET chatwork_api_token = ${chatworkApiToken}, webhook_token = ${webhookToken}
      WHERE id = ${existing.id}
    `
  } else {
    await sql`
      INSERT INTO settings (chatwork_api_token, webhook_token)
      VALUES (${chatworkApiToken}, ${webhookToken})
    `
  }
}

// Rooms
export async function getRooms() {
  const result = await sql`SELECT * FROM rooms ORDER BY room_name`
  return result.rows
}

export async function getActiveRooms() {
  const result = await sql`SELECT * FROM rooms WHERE is_active = true`
  return result.rows
}

export async function upsertRoom(roomId: string, roomName: string) {
  await sql`
    INSERT INTO rooms (room_id, room_name)
    VALUES (${roomId}, ${roomName})
    ON CONFLICT (room_id) DO UPDATE SET room_name = ${roomName}
  `
}

export async function setRoomActive(roomId: string, isActive: boolean) {
  await sql`
    UPDATE rooms SET is_active = ${isActive} WHERE room_id = ${roomId}
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
}) {
  const result = await sql`
    INSERT INTO tasks (room_id, message_id, content, original_message, sender_name, priority)
    VALUES (${task.roomId}, ${task.messageId}, ${task.content}, ${task.originalMessage}, ${task.senderName}, ${task.priority})
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
