/**
 * Tests for lib/session.ts
 *
 * These tests verify the session and permission checking functions
 * without actually connecting to the database or authentication system.
 */

import { describe, expect, test, jest, beforeEach } from '@jest/globals'
import type { RolePermission, Source } from '@/lib/db'

// Mock next-auth before importing session
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/db', () => ({
  getUserRolePermissions: jest.fn(),
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      json: async () => data,
    })),
  },
}))

// Test data
const mockSystemAdmin = {
  id: '1',
  email: 'system@example.com',
  name: 'System Admin',
  companyId: null,
  userType: 'system_admin' as const,
}

const mockAdmin = {
  id: '2',
  email: 'admin@example.com',
  name: 'Company Admin',
  companyId: 1,
  userType: 'admin' as const,
}

const mockUser = {
  id: '3',
  email: 'user@example.com',
  name: 'Regular User',
  companyId: 1,
  userType: 'user' as const,
}

const mockPermissions: RolePermission[] = [
  {
    id: 1,
    role_id: 1,
    room_id: 'room-123',
    source: 'chatwork' as Source,
    can_view: true,
    can_edit_status: true,
    can_delete: false,
  },
  {
    id: 2,
    role_id: 1,
    room_id: null,
    source: 'teams' as Source,
    can_view: true,
    can_edit_status: false,
    can_delete: false,
  },
]

const mockTasks = [
  { id: 1, room_id: 'room-123', source: 'chatwork' as Source, title: 'Chatwork Task' },
  { id: 2, room_id: 'room-456', source: 'teams' as Source, title: 'Teams Task' },
  { id: 3, room_id: 'room-789', source: 'lark' as Source, title: 'Lark Task' },
]

describe('lib/session', () => {
  // Import after mocking
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { isSystemAdmin, isAdmin, checkTaskPermission, filterTasksByPermission } = require('@/lib/session')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getUserRolePermissions } = require('@/lib/db')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isSystemAdmin', () => {
    test('should return true for system_admin user', () => {
      expect(isSystemAdmin(mockSystemAdmin)).toBe(true)
    })

    test('should return false for admin user', () => {
      expect(isSystemAdmin(mockAdmin)).toBe(false)
    })

    test('should return false for regular user', () => {
      expect(isSystemAdmin(mockUser)).toBe(false)
    })
  })

  describe('isAdmin', () => {
    test('should return true for system_admin user', () => {
      expect(isAdmin(mockSystemAdmin)).toBe(true)
    })

    test('should return true for admin user', () => {
      expect(isAdmin(mockAdmin)).toBe(true)
    })

    test('should return false for regular user', () => {
      expect(isAdmin(mockUser)).toBe(false)
    })
  })

  describe('checkTaskPermission', () => {
    test('should return all permissions for system_admin', async () => {
      const result = await checkTaskPermission(mockSystemAdmin, 'room-123', 'chatwork')

      expect(result).toEqual({
        canView: true,
        canEditStatus: true,
        canDelete: true,
      })
    })

    test('should return all permissions for admin', async () => {
      const result = await checkTaskPermission(mockAdmin, 'room-123', 'chatwork')

      expect(result).toEqual({
        canView: true,
        canEditStatus: true,
        canDelete: true,
      })
    })

    test('should return permissions based on role for regular user with matching room and source', async () => {
      getUserRolePermissions.mockResolvedValue(mockPermissions)

      const result = await checkTaskPermission(mockUser, 'room-123', 'chatwork')

      expect(result).toEqual({
        canView: true,
        canEditStatus: true,
        canDelete: false,
      })
    })

    test('should return permissions for wildcard room match', async () => {
      getUserRolePermissions.mockResolvedValue(mockPermissions)

      const result = await checkTaskPermission(mockUser, 'any-room', 'teams')

      expect(result).toEqual({
        canView: true,
        canEditStatus: false,
        canDelete: false,
      })
    })

    test('should return no permissions when no role matches', async () => {
      getUserRolePermissions.mockResolvedValue(mockPermissions)

      const result = await checkTaskPermission(mockUser, 'room-999', 'lark')

      expect(result).toEqual({
        canView: false,
        canEditStatus: false,
        canDelete: false,
      })
    })

    test('should return no permissions when user has no roles', async () => {
      getUserRolePermissions.mockResolvedValue([])

      const result = await checkTaskPermission(mockUser, 'room-123', 'chatwork')

      expect(result).toEqual({
        canView: false,
        canEditStatus: false,
        canDelete: false,
      })
    })

    test('should prefer exact match over wildcard', async () => {
      const permissions = [
        {
          id: 1,
          role_id: 1,
          room_id: null,
          source: 'chatwork' as Source,
          can_view: true,
          can_edit_status: false,
          can_delete: false,
        },
        {
          id: 2,
          role_id: 1,
          room_id: 'room-123',
          source: 'chatwork' as Source,
          can_view: true,
          can_edit_status: true,
          can_delete: true,
        },
      ]
      getUserRolePermissions.mockResolvedValue(permissions)

      const result = await checkTaskPermission(mockUser, 'room-123', 'chatwork')

      expect(result.canEditStatus).toBe(true)
      expect(result.canDelete).toBe(true)
    })
  })

  describe('filterTasksByPermission', () => {
    test('should return all tasks for system_admin', async () => {
      const result = await filterTasksByPermission(mockSystemAdmin, mockTasks)

      expect(result).toHaveLength(3)
      expect(result).toEqual(mockTasks)
    })

    test('should return all tasks for admin', async () => {
      const result = await filterTasksByPermission(mockAdmin, mockTasks)

      expect(result).toHaveLength(3)
      expect(result).toEqual(mockTasks)
    })

    test('should filter tasks based on role permissions for regular user', async () => {
      getUserRolePermissions.mockResolvedValue(mockPermissions)

      const result = await filterTasksByPermission(mockUser, mockTasks)

      expect(result).toHaveLength(2)
      expect(result.map((t: { id: number }) => t.id)).toEqual([1, 2])
    })

    test('should return empty array when user has no roles', async () => {
      getUserRolePermissions.mockResolvedValue([])

      const result = await filterTasksByPermission(mockUser, mockTasks)

      expect(result).toHaveLength(0)
    })

    test('should handle empty task list', async () => {
      getUserRolePermissions.mockResolvedValue(mockPermissions)

      const result = await filterTasksByPermission(mockUser, [])

      expect(result).toHaveLength(0)
    })
  })
})
