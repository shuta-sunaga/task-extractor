import type { SessionUser } from '@/lib/session'
import type { RolePermission } from '@/lib/db'

// テスト用ユーザー
export const mockSystemAdmin: SessionUser = {
  id: '1',
  email: 'system@example.com',
  name: 'System Admin',
  companyId: null,
  userType: 'system_admin',
}

export const mockAdmin: SessionUser = {
  id: '2',
  email: 'admin@example.com',
  name: 'Company Admin',
  companyId: 1,
  userType: 'admin',
}

export const mockUser: SessionUser = {
  id: '3',
  email: 'user@example.com',
  name: 'Regular User',
  companyId: 1,
  userType: 'user',
}

// テスト用ロール権限
export const mockPermissions: RolePermission[] = [
  {
    id: 1,
    role_id: 1,
    room_id: 'room-123',
    source: 'chatwork',
    can_view: true,
    can_edit_status: true,
    can_delete: false,
  },
  {
    id: 2,
    role_id: 1,
    room_id: null, // 全ルーム
    source: 'teams',
    can_view: true,
    can_edit_status: false,
    can_delete: false,
  },
]

// テスト用タスク
export const mockTasks = [
  {
    id: 1,
    room_id: 'room-123',
    source: 'chatwork' as const,
    title: 'Chatwork Task',
  },
  {
    id: 2,
    room_id: 'room-456',
    source: 'teams' as const,
    title: 'Teams Task',
  },
  {
    id: 3,
    room_id: 'room-789',
    source: 'lark' as const,
    title: 'Lark Task',
  },
]
