/**
 * Tests for /api/tasks API routes
 *
 * These tests verify the task API endpoints including
 * authentication, authorization, and CRUD operations.
 */

import { describe, expect, test, jest, beforeEach } from '@jest/globals'

// Mock all dependencies before importing routes
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('@/lib/db', () => ({
  getTasks: jest.fn(),
  createTask: jest.fn(),
  getTaskById: jest.fn(),
  updateTaskStatus: jest.fn(),
  deleteTask: jest.fn(),
  getUserRolePermissions: jest.fn(),
}))

jest.mock('@/lib/email', () => ({
  sendTaskNotification: jest.fn().mockResolvedValue(undefined),
}))

// Create actual NextResponse-like mock
const createMockResponse = (data: unknown, status = 200) => ({
  status,
  json: async () => data,
})

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => createMockResponse(data, options?.status || 200)),
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
  name: 'Admin',
  companyId: 1,
  userType: 'admin' as const,
}

const mockUser = {
  id: '3',
  email: 'user@example.com',
  name: 'User',
  companyId: 1,
  userType: 'user' as const,
}

const mockTask = {
  id: 1,
  room_id: 'room-123',
  message_id: 'msg-1',
  content: 'Test task',
  original_message: 'Original message',
  sender_name: 'Sender',
  status: 'pending',
  priority: 'medium',
  source: 'chatwork' as const,
  company_id: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

describe('API: /api/tasks', () => {
  // Import after mocking
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GET, POST } = require('@/app/api/tasks/route')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getTasks, createTask, getUserRolePermissions } = require('@/lib/db')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getServerSession } = require('next-auth')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/tasks', () => {
    test('should return 401 when not authenticated', async () => {
      getServerSession.mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should return tasks for authenticated admin', async () => {
      getServerSession.mockResolvedValue({ user: mockAdmin })
      getTasks.mockResolvedValue([mockTask])
      getUserRolePermissions.mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe(1)
    })

    test('should filter tasks by company for company user', async () => {
      getServerSession.mockResolvedValue({ user: mockAdmin })
      getTasks.mockResolvedValue([mockTask])
      getUserRolePermissions.mockResolvedValue([])

      await GET()

      expect(getTasks).toHaveBeenCalledWith(1)
    })

    test('should get all tasks for system admin', async () => {
      getServerSession.mockResolvedValue({ user: mockSystemAdmin })
      getTasks.mockResolvedValue([mockTask])
      getUserRolePermissions.mockResolvedValue([])

      await GET()

      expect(getTasks).toHaveBeenCalledWith(undefined)
    })

    test('should filter tasks by role permissions for regular user', async () => {
      getServerSession.mockResolvedValue({ user: mockUser })
      getTasks.mockResolvedValue([mockTask])
      // No permissions = empty result
      getUserRolePermissions.mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(data).toHaveLength(0)
    })
  })

  describe('POST /api/tasks', () => {
    const createRequest = (body: object) => ({
      json: async () => body,
    })

    test('should return 401 when not authenticated', async () => {
      getServerSession.mockResolvedValue(null)

      const request = createRequest({ content: 'Test' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should return 403 for regular user', async () => {
      getServerSession.mockResolvedValue({ user: mockUser })

      const request = createRequest({ content: 'Test' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    test('should create task for admin', async () => {
      getServerSession.mockResolvedValue({ user: mockAdmin })
      createTask.mockResolvedValue(mockTask)

      const request = createRequest({
        roomId: 'room-123',
        messageId: 'msg-1',
        content: 'Test task',
        originalMessage: 'Original',
        senderName: 'Sender',
        priority: 'high',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe(1)
      expect(createTask).toHaveBeenCalledWith({
        roomId: 'room-123',
        messageId: 'msg-1',
        content: 'Test task',
        originalMessage: 'Original',
        senderName: 'Sender',
        priority: 'high',
        companyId: 1,
      })
    })

    test('should create task for system admin with undefined company', async () => {
      getServerSession.mockResolvedValue({ user: mockSystemAdmin })
      createTask.mockResolvedValue(mockTask)

      const request = createRequest({
        roomId: 'room-123',
        messageId: 'msg-1',
        content: 'Test task',
        originalMessage: 'Original',
        senderName: 'Sender',
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: undefined,
        })
      )
    })
  })
})

describe('API: /api/tasks/[id]', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PATCH, DELETE } = require('@/app/api/tasks/[id]/route')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getTaskById, updateTaskStatus, deleteTask, getUserRolePermissions } = require('@/lib/db')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getServerSession } = require('next-auth')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createRequest = (body?: object) => ({
    json: async () => body || {},
  })

  const createParams = (id: string) => ({
    params: Promise.resolve({ id }),
  })

  describe('PATCH /api/tasks/[id]', () => {
    test('should return 401 when not authenticated', async () => {
      getServerSession.mockResolvedValue(null)

      const request = createRequest({ status: 'completed' })
      const response = await PATCH(request, createParams('1'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should return 404 when task not found', async () => {
      getServerSession.mockResolvedValue({ user: mockAdmin })
      getTaskById.mockResolvedValue(null)

      const request = createRequest({ status: 'completed' })
      const response = await PATCH(request, createParams('999'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Task not found')
    })

    test('should return 403 when user has no edit permission', async () => {
      getServerSession.mockResolvedValue({ user: mockUser })
      getTaskById.mockResolvedValue(mockTask)
      // No permissions
      getUserRolePermissions.mockResolvedValue([])

      const request = createRequest({ status: 'completed' })
      const response = await PATCH(request, createParams('1'))
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('No edit permission')
    })

    test('should update task status with permission', async () => {
      getServerSession.mockResolvedValue({ user: mockAdmin })
      getTaskById.mockResolvedValue(mockTask)
      getUserRolePermissions.mockResolvedValue([])
      updateTaskStatus.mockResolvedValue(undefined)

      const request = createRequest({ status: 'in_progress' })
      const response = await PATCH(request, createParams('1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(updateTaskStatus).toHaveBeenCalledWith(1, 'in_progress')
    })

    test('should return 403 when accessing other company task', async () => {
      const otherCompanyTask = { ...mockTask, company_id: 2 }
      getServerSession.mockResolvedValue({ user: mockAdmin })
      getTaskById.mockResolvedValue(otherCompanyTask)

      const request = createRequest({ status: 'completed' })
      const response = await PATCH(request, createParams('1'))
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })

  describe('DELETE /api/tasks/[id]', () => {
    test('should return 401 when not authenticated', async () => {
      getServerSession.mockResolvedValue(null)

      const request = createRequest()
      const response = await DELETE(request, createParams('1'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    test('should return 404 when task not found', async () => {
      getServerSession.mockResolvedValue({ user: mockAdmin })
      getTaskById.mockResolvedValue(null)

      const request = createRequest()
      const response = await DELETE(request, createParams('999'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Task not found')
    })

    test('should return 403 when user has no delete permission', async () => {
      getServerSession.mockResolvedValue({ user: mockUser })
      getTaskById.mockResolvedValue(mockTask)
      getUserRolePermissions.mockResolvedValue([])

      const request = createRequest()
      const response = await DELETE(request, createParams('1'))
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('No delete permission')
    })

    test('should delete task with admin permission', async () => {
      getServerSession.mockResolvedValue({ user: mockAdmin })
      getTaskById.mockResolvedValue(mockTask)
      getUserRolePermissions.mockResolvedValue([])
      deleteTask.mockResolvedValue(undefined)

      const request = createRequest()
      const response = await DELETE(request, createParams('1'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(deleteTask).toHaveBeenCalledWith(1)
    })

    test('should return 403 when accessing other company task', async () => {
      const otherCompanyTask = { ...mockTask, company_id: 2 }
      getServerSession.mockResolvedValue({ user: mockAdmin })
      getTaskById.mockResolvedValue(otherCompanyTask)

      const request = createRequest()
      const response = await DELETE(request, createParams('1'))
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })
  })
})
