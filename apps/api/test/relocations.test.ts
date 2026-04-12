import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '../src/app'

// Mock Prisma and Supabase before importing app
vi.mock('../src/generated/prisma/client.js', () => {
  const mockPrisma = {
    relocation: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  }
  return { PrismaClient: vi.fn(() => mockPrisma) }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
  })),
}))

vi.mock('@prisma/adapter-pg', () => ({
  PrismaPg: vi.fn(() => ({})),
}))

const MOCK_RELOCATION = {
  id: 'clx1234',
  origin: 'Madrid',
  destination: 'Barcelona',
  date: new Date('2027-01-15').toISOString(),
  notes: null,
  status: 'PENDING',
  userId: 'user-123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const AUTH_HEADER = { authorization: 'Bearer valid-token' }

describe('POST /api/v1/relocations', () => {
  it('creates a relocation and returns 201', async () => {
    const app = buildApp()
    const { PrismaClient } = await import('../src/generated/prisma/client.js')
    const prisma = new (PrismaClient as any)()
    prisma.relocation.create.mockResolvedValue(MOCK_RELOCATION)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/relocations',
      headers: AUTH_HEADER,
      payload: {
        origin: 'Madrid',
        destination: 'Barcelona',
        date: '2027-01-15T00:00:00.000Z',
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.origin).toBe('Madrid')
  })

  it('returns 422 when date is in the past', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/relocations',
      headers: AUTH_HEADER,
      payload: {
        origin: 'Madrid',
        destination: 'Barcelona',
        date: '2020-01-01T00:00:00.000Z',
      },
    })
    expect(res.statusCode).toBe(422)
  })

  it('returns 401 when no auth header', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/relocations',
      payload: { origin: 'A', destination: 'B', date: '2027-01-15T00:00:00.000Z' },
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('GET /api/v1/relocations', () => {
  it('returns list of relocations', async () => {
    const app = buildApp()
    const { PrismaClient } = await import('../src/generated/prisma/client.js')
    const prisma = new (PrismaClient as any)()
    prisma.relocation.findMany.mockResolvedValue([MOCK_RELOCATION])

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/relocations',
      headers: AUTH_HEADER,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toHaveLength(1)
  })
})

describe('PUT /api/v1/relocations/:id', () => {
  it('updates a relocation and returns 200', async () => {
    const app = buildApp()
    const { PrismaClient } = await import('../src/generated/prisma/client.js')
    const prisma = new (PrismaClient as any)()
    prisma.relocation.findUnique.mockResolvedValue(MOCK_RELOCATION)
    prisma.relocation.update.mockResolvedValue({ ...MOCK_RELOCATION, origin: 'Seville' })

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/relocations/clx1234',
      headers: AUTH_HEADER,
      payload: { origin: 'Seville' },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().origin).toBe('Seville')
  })

  it('returns 400 when relocation is COMPLETED', async () => {
    const app = buildApp()
    const { PrismaClient } = await import('../src/generated/prisma/client.js')
    const prisma = new (PrismaClient as any)()
    prisma.relocation.findUnique.mockResolvedValue({ ...MOCK_RELOCATION, status: 'COMPLETED' })

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/relocations/clx1234',
      headers: AUTH_HEADER,
      payload: { origin: 'Seville' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when relocation is CANCELLED', async () => {
    const app = buildApp()
    const { PrismaClient } = await import('../src/generated/prisma/client.js')
    const prisma = new (PrismaClient as any)()
    prisma.relocation.findUnique.mockResolvedValue({ ...MOCK_RELOCATION, status: 'CANCELLED' })

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/relocations/clx1234',
      headers: AUTH_HEADER,
      payload: { origin: 'Seville' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when relocation not found', async () => {
    const app = buildApp()
    const { PrismaClient } = await import('../src/generated/prisma/client.js')
    const prisma = new (PrismaClient as any)()
    prisma.relocation.findUnique.mockResolvedValue(null)

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/relocations/not-exist',
      headers: AUTH_HEADER,
      payload: { origin: 'Seville' },
    })

    expect(res.statusCode).toBe(404)
  })
})
