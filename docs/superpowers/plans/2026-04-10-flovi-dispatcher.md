# Flovi Dispatcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack dispatcher web app for vehicle relocation management — VueJS frontend + Fastify API — in a pnpm monorepo deployed to Vercel.

**Architecture:** pnpm workspaces monorepo with `apps/web` (Vue 3 + shadcn-vue), `apps/api` (Fastify + Prisma), and `packages/types` (shared TS types). Supabase handles Google OAuth and Postgres. The API wraps Fastify in a single Vercel serverless function entry point.

**Tech Stack:** Vue 3, Vite, Pinia, Vue Router, shadcn-vue, Tailwind CSS, VeeValidate, Zod, Axios, Fastify, Prisma, Supabase, TypeScript, pnpm workspaces, Vercel.

---

## File Map

```
flovi_dispatcher/
├── apps/
│   ├── api/
│   │   ├── api/
│   │   │   └── index.ts              # Vercel serverless entry (wraps Fastify)
│   │   ├── prisma/
│   │   │   └── schema.prisma         # Relocation model + RelocationStatus enum
│   │   ├── src/
│   │   │   ├── app.ts                # Fastify app builder (registers plugins + routes)
│   │   │   ├── plugins/
│   │   │   │   ├── prisma.ts         # Prisma client as Fastify plugin
│   │   │   │   └── auth.ts           # JWT verification via Supabase (preHandler hook)
│   │   │   └── routes/
│   │   │       └── relocations.ts    # POST / GET / PUT /api/v1/relocations
│   │   ├── test/
│   │   │   └── relocations.test.ts   # Route integration tests (vitest + supertest)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vercel.json               # Rewrite all → /api/index
│   └── web/
│       ├── src/
│       │   ├── main.ts
│       │   ├── App.vue
│       │   ├── lib/
│       │   │   ├── supabase.ts       # Supabase browser client
│       │   │   └── api.ts            # Axios instance with JWT interceptor
│       │   ├── stores/
│       │   │   ├── authStore.ts      # Pinia: session, user, signIn, signOut
│       │   │   └── relocationsStore.ts # Pinia: relocations list + CRUD actions
│       │   ├── router/
│       │   │   └── index.ts          # Routes: /login (public), / (auth-guarded)
│       │   ├── components/
│       │   │   ├── AppNavbar.vue     # Fixed top bar: logo + user avatar + sign-out
│       │   │   ├── StatusBadge.vue   # Color-coded badge for RelocationStatus
│       │   │   ├── RelocationTable.vue  # shadcn-vue Table + skeleton + empty state
│       │   │   ├── RelocationSheet.vue  # Sheet wrapper (create vs edit mode)
│       │   │   └── RelocationForm.vue   # VeeValidate + Zod form inside the Sheet
│       │   └── views/
│       │       ├── LoginView.vue     # Google OAuth landing
│       │       └── DashboardView.vue # Table + New Relocation button
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── components.json           # shadcn-vue CLI config
│       ├── tsconfig.json
│       └── package.json
└── packages/
    └── types/
        ├── src/
        │   └── index.ts              # Relocation, CreateRelocationDto, UpdateRelocationDto, RelocationStatus
        ├── tsconfig.json
        └── package.json
```

---

## Task 1: Monorepo Root Setup

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.gitignore`
- Create: `.npmrc`

- [ ] **Step 1: Create pnpm workspace config**

Create `pnpm-workspace.yaml` at repo root:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "flovi-dispatcher",
  "private": true,
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api dev",
    "build:web": "pnpm --filter web build",
    "build:api": "pnpm --filter api build",
    "test:api": "pnpm --filter api test"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  }
}
```

- [ ] **Step 3: Create .npmrc**

```ini
shamefully-hoist=true
strict-peer-dependencies=false
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
.vercel/
*.tsbuildinfo
```

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml .npmrc .gitignore
git commit -m "chore: init pnpm monorepo workspace"
```

---

## Task 2: Shared Types Package

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@flovi/types",
  "version": "0.0.1",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create src/index.ts**

```ts
export type RelocationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export const TERMINAL_STATUSES: RelocationStatus[] = ['COMPLETED', 'CANCELLED']

export const ALL_STATUSES: RelocationStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]

export interface Relocation {
  id: string
  origin: string
  destination: string
  date: string // ISO 8601
  notes?: string | null
  status: RelocationStatus
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreateRelocationDto {
  origin: string
  destination: string
  date: string // ISO 8601, must be future date
  notes?: string
}

export interface UpdateRelocationDto {
  origin?: string
  destination?: string
  date?: string
  notes?: string
  status?: RelocationStatus
}
```

- [ ] **Step 4: Build the package**

```bash
cd packages/types && pnpm build
```

Expected: `dist/` folder created with `index.js` and `index.d.ts`.

- [ ] **Step 5: Commit**

```bash
git add packages/types
git commit -m "feat: add shared types package"
```

---

## Task 3: API — Fastify Skeleton + TypeScript

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/api/index.ts`

- [ ] **Step 1: Create apps/api/package.json**

```json
{
  "name": "api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@fastify/cors": "^9.0.1",
    "@flovi/types": "workspace:*",
    "@prisma/client": "^5.14.0",
    "@supabase/supabase-js": "^2.43.4",
    "fastify": "^4.28.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/node": "^20.14.9",
    "prisma": "^5.14.0",
    "supertest": "^7.0.0",
    "tsx": "^4.16.0",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create apps/api/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src", "api"]
}
```

- [ ] **Step 3: Create apps/api/src/app.ts**

```ts
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

  app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT'],
  })

  // Health check
  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
```

- [ ] **Step 4: Create apps/api/src/server.ts** (local dev only)

```ts
import { buildApp } from './app'

const app = buildApp()

app.listen({ port: 3001, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
})
```

- [ ] **Step 5: Create apps/api/api/index.ts** (Vercel entry point)

```ts
import { buildApp } from '../src/app'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const app = buildApp()
const ready = app.ready()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ready
  app.server.emit('request', req, res)
}
```

- [ ] **Step 6: Install dependencies**

```bash
cd apps/api && pnpm install
```

- [ ] **Step 7: Verify server starts**

```bash
cd apps/api && pnpm dev
```

Expected: Fastify listening on port 3001. Hit `http://localhost:3001/health` → `{"status":"ok"}`. Stop with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): scaffold Fastify app with Vercel entry point"
```

---

## Task 4: API — Prisma Schema + Database Setup

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/.env.example`

- [ ] **Step 1: Create apps/api/.env.example**

```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
CORS_ORIGIN="http://localhost:5173"
```

Copy to `.env` and fill in values from your Supabase project's Settings → Database.

- [ ] **Step 2: Create apps/api/prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum RelocationStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model Relocation {
  id          String           @id @default(cuid())
  origin      String
  destination String
  date        DateTime
  notes       String?          @db.VarChar(500)
  status      RelocationStatus @default(PENDING)
  userId      String
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}
```

- [ ] **Step 3: Run initial migration**

```bash
cd apps/api && npx prisma migrate dev --name init
```

Expected output: Migration created at `prisma/migrations/[timestamp]_init/migration.sql` and applied to the database.

- [ ] **Step 4: Generate Prisma client**

```bash
cd apps/api && npx prisma generate
```

Expected: `node_modules/@prisma/client` updated.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma apps/api/.env.example
git commit -m "feat(api): add Prisma schema with Relocation model"
```

---

## Task 5: API — Prisma Plugin + Auth Plugin

**Files:**
- Create: `apps/api/src/plugins/prisma.ts`
- Create: `apps/api/src/plugins/auth.ts`

- [ ] **Step 1: Create apps/api/src/plugins/prisma.ts**

```ts
import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'
import { FastifyPluginAsync } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

const prismaPlugin: FastifyPluginAsync = fp(async (app) => {
  const prisma = new PrismaClient()
  await prisma.$connect()

  app.decorate('prisma', prisma)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })
})

export default prismaPlugin
```

Note: Install `fastify-plugin`: add `"fastify-plugin": "^4.5.1"` to `apps/api/package.json` dependencies and run `pnpm install` in `apps/api`.

- [ ] **Step 2: Create apps/api/src/plugins/auth.ts**

```ts
import fp from 'fastify-plugin'
import { createClient } from '@supabase/supabase-js'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
  }
}

const authPlugin: FastifyPluginAsync = fp(async (app) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )

  app.decorateRequest('userId', '')

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Missing token' })
    }

    const token = authHeader.slice(7)
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      return reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid token' })
    }

    request.userId = data.user.id
  })
})

export default authPlugin
```

- [ ] **Step 3: Register plugins in src/app.ts**

Replace `apps/api/src/app.ts` with:

```ts
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import prismaPlugin from './plugins/prisma'
import authPlugin from './plugins/auth'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

  app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT'],
  })

  app.register(prismaPlugin)
  app.register(authPlugin)

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/plugins apps/api/src/app.ts apps/api/package.json
git commit -m "feat(api): add Prisma and Supabase auth plugins"
```

---

## Task 6: API — Relocations Routes (POST, GET, PUT)

**Files:**
- Create: `apps/api/src/routes/relocations.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/test/relocations.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/test/relocations.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildApp } from '../src/app'

// Mock Prisma and Supabase before importing app
vi.mock('@prisma/client', () => {
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
    const { PrismaClient } = await import('@prisma/client')
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
    const { PrismaClient } = await import('@prisma/client')
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
    const { PrismaClient } = await import('@prisma/client')
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
    const { PrismaClient } = await import('@prisma/client')
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

  it('returns 404 when relocation not found', async () => {
    const app = buildApp()
    const { PrismaClient } = await import('@prisma/client')
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/api && pnpm test
```

Expected: All tests fail with "Cannot find route" or similar.

- [ ] **Step 3: Create apps/api/src/routes/relocations.ts**

```ts
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { TERMINAL_STATUSES } from '@flovi/types'

const createSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  date: z.string().datetime(),
  notes: z.string().max(500).optional(),
})

const updateSchema = z.object({
  origin: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
})

export async function relocationRoutes(app: FastifyInstance) {
  // POST /api/v1/relocations
  app.post('/api/v1/relocations', async (request, reply) => {
    const parsed = createSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues[0].message,
      })
    }

    const { origin, destination, date, notes } = parsed.data
    if (new Date(date) <= new Date()) {
      return reply.code(422).send({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'Execution date must be in the future',
      })
    }

    const relocation = await app.prisma.relocation.create({
      data: {
        origin,
        destination,
        date: new Date(date),
        notes,
        userId: request.userId,
      },
    })

    return reply.code(201).send(relocation)
  })

  // GET /api/v1/relocations
  app.get('/api/v1/relocations', async (request, reply) => {
    const relocations = await app.prisma.relocation.findMany({
      where: { userId: request.userId },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(relocations)
  })

  // PUT /api/v1/relocations/:id
  app.put('/api/v1/relocations/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const parsed = updateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: parsed.error.issues[0].message,
      })
    }

    const existing = await app.prisma.relocation.findUnique({ where: { id } })
    if (!existing) {
      return reply.code(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Relocation not found',
      })
    }

    if (TERMINAL_STATUSES.includes(existing.status as any)) {
      return reply.code(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Cannot edit a completed or cancelled relocation',
      })
    }

    const { date, ...rest } = parsed.data
    const updated = await app.prisma.relocation.update({
      where: { id },
      data: {
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
      },
    })

    return reply.send(updated)
  })
}
```

- [ ] **Step 4: Register routes in src/app.ts**

Add to `apps/api/src/app.ts` (after plugin registrations):

```ts
import { relocationRoutes } from './routes/relocations'

// Inside buildApp(), after plugin registrations:
app.register(relocationRoutes)
```

Full updated `src/app.ts`:

```ts
import Fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import prismaPlugin from './plugins/prisma'
import authPlugin from './plugins/auth'
import { relocationRoutes } from './routes/relocations'

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

  app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT'],
  })

  app.register(prismaPlugin)
  app.register(authPlugin)
  app.register(relocationRoutes)

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = error.statusCode ?? 500
    reply.code(statusCode).send({
      statusCode,
      error: error.name,
      message: error.message,
    })
  })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd apps/api && pnpm test
```

Expected: All 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes apps/api/src/app.ts apps/api/test
git commit -m "feat(api): implement relocations routes with TDD"
```

---

## Task 7: API — Vercel Deployment Config

**Files:**
- Create: `apps/api/vercel.json`
- Modify: `apps/api/package.json` (add `@vercel/node`)

- [ ] **Step 1: Add @vercel/node types**

Add to `apps/api/package.json` devDependencies:
```json
"@vercel/node": "^3.2.16"
```

Then run:
```bash
cd apps/api && pnpm install
```

- [ ] **Step 2: Create apps/api/vercel.json**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "/api/index" }
  ],
  "env": {
    "DATABASE_URL": "@database-url",
    "DIRECT_URL": "@direct-url",
    "SUPABASE_URL": "@supabase-url",
    "SUPABASE_ANON_KEY": "@supabase-anon-key",
    "CORS_ORIGIN": "@cors-origin"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/vercel.json apps/api/package.json
git commit -m "feat(api): add Vercel deployment config"
```

---

## Task 8: Frontend — Vue 3 + Vite + Tailwind + shadcn-vue Setup

**Files:**
- Create: entire `apps/web/` scaffold

- [ ] **Step 1: Scaffold Vue 3 app with Vite**

```bash
cd apps && pnpm create vite@latest web -- --template vue-ts
```

- [ ] **Step 2: Install core dependencies**

```bash
cd apps/web && pnpm install
pnpm add vue-router@4 pinia @supabase/supabase-js axios zod vee-validate @vee-validate/zod vue-sonner
pnpm add -D tailwindcss postcss autoprefixer @types/node
```

- [ ] **Step 3: Init Tailwind CSS**

```bash
cd apps/web && npx tailwindcss init -p
```

Replace `tailwind.config.ts` with:

```ts
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 4: Init shadcn-vue**

```bash
cd apps/web && npx shadcn-vue@latest init
```

When prompted:
- TypeScript: Yes
- Framework: Vite
- Style: Default
- Color: Zinc
- CSS file: `src/assets/index.css`
- CSS variables: Yes
- tailwind.config path: `tailwind.config.ts`
- Components alias: `@/components`
- Utils alias: `@/lib/utils`

- [ ] **Step 5: Install shadcn-vue components**

```bash
cd apps/web && npx shadcn-vue@latest add button input textarea select table sheet badge card avatar dropdown-menu skeleton tooltip calendar popover
```

- [ ] **Step 6: Update vite.config.ts**

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 7: Update apps/web/package.json**

Add to `package.json`:
```json
{
  "name": "web",
  "version": "0.0.1",
  "private": true
}
```

Ensure `name` is `"web"` (used by pnpm filter).

- [ ] **Step 8: Verify dev server starts**

```bash
cd apps/web && pnpm dev
```

Expected: Vite dev server running at `http://localhost:5173`. Stop with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Vue 3 + Vite + Tailwind + shadcn-vue"
```

---

## Task 9: Frontend — Supabase Client + Auth Store

**Files:**
- Create: `apps/web/src/lib/supabase.ts`
- Create: `apps/web/src/stores/authStore.ts`
- Create: `apps/web/.env.example`

- [ ] **Step 1: Create apps/web/.env.example**

```env
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

Copy to `.env.local` and fill in Supabase values from project Settings → API.

- [ ] **Step 2: Create apps/web/src/lib/supabase.ts**

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

- [ ] **Step 3: Create apps/web/src/stores/authStore.ts**

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = computed<User | null>(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => !!session.value)

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
    })
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    session.value = null
  }

  return { session, user, isAuthenticated, init, signInWithGoogle, signOut }
})
```

- [ ] **Step 4: Initialize Pinia and auth store in main.ts**

Replace `apps/web/src/main.ts` with:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/authStore'
import './assets/index.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const authStore = useAuthStore()
authStore.init().then(() => {
  app.mount('#app')
})
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/supabase.ts apps/web/src/stores/authStore.ts apps/web/src/main.ts apps/web/.env.example
git commit -m "feat(web): add Supabase client and auth Pinia store"
```

---

## Task 10: Frontend — Vue Router + Auth Guards

**Files:**
- Create: `apps/web/src/router/index.ts`
- Modify: `apps/web/src/App.vue`

- [ ] **Step 1: Create apps/web/src/router/index.ts**

```ts
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }
})
```

- [ ] **Step 2: Update App.vue**

Replace `apps/web/src/App.vue`:

```vue
<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/router apps/web/src/App.vue
git commit -m "feat(web): add Vue Router with auth guards"
```

---

## Task 11: Frontend — Login View

**Files:**
- Create: `apps/web/src/views/LoginView.vue`

- [ ] **Step 1: Create apps/web/src/views/LoginView.vue**

```vue
<template>
  <div class="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo / Brand -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h1 class="text-2xl font-semibold text-zinc-900">Flovi Dispatcher</h1>
        <p class="text-sm text-zinc-500 mt-1">Vehicle relocation management</p>
      </div>

      <!-- Card -->
      <Card>
        <CardContent class="pt-6">
          <div class="space-y-4">
            <div class="text-center">
              <h2 class="text-lg font-medium text-zinc-800">Sign in to continue</h2>
              <p class="text-sm text-zinc-400 mt-1">Use your Google account to access the dispatcher</p>
            </div>
            <Button
              class="w-full gap-2"
              variant="outline"
              :disabled="loading"
              @click="handleSignIn"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{{ loading ? 'Redirecting...' : 'Sign in with Google' }}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <p class="text-center text-xs text-zinc-400 mt-6">
        Access is restricted to authorized dispatchers only.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const authStore = useAuthStore()
const loading = ref(false)

async function handleSignIn() {
  loading.value = true
  await authStore.signInWithGoogle()
}
</script>
```

- [ ] **Step 2: Verify login page renders**

```bash
cd apps/web && pnpm dev
```

Navigate to `http://localhost:5173/login`. Verify the card with "Sign in with Google" renders correctly.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/views/LoginView.vue
git commit -m "feat(web): implement Google OAuth login view"
```

---

## Task 12: Frontend — API Client + Relocations Store

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/stores/relocationsStore.ts`

- [ ] **Step 1: Create apps/web/src/lib/api.ts**

```ts
import axios from 'axios'
import { supabase } from './supabase'
import { router } from '@/router'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
})

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`
  }
  return config
})

// On 401 → sign out and redirect to login
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut()
      router.push({ name: 'login' })
    }
    return Promise.reject(error)
  }
)
```

- [ ] **Step 2: Create apps/web/src/stores/relocationsStore.ts**

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/lib/api'
import type { Relocation, CreateRelocationDto, UpdateRelocationDto } from '@flovi/types'

export const useRelocationsStore = defineStore('relocations', () => {
  const relocations = ref<Relocation[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.get<Relocation[]>('/api/v1/relocations')
      relocations.value = data
    } catch (e: any) {
      error.value = e.response?.data?.message ?? 'Failed to load relocations'
    } finally {
      loading.value = false
    }
  }

  async function create(dto: CreateRelocationDto): Promise<Relocation> {
    const { data } = await api.post<Relocation>('/api/v1/relocations', dto)
    relocations.value.unshift(data)
    return data
  }

  async function update(id: string, dto: UpdateRelocationDto): Promise<Relocation> {
    const { data } = await api.put<Relocation>(`/api/v1/relocations/${id}`, dto)
    const idx = relocations.value.findIndex((r) => r.id === id)
    if (idx !== -1) relocations.value[idx] = data
    return data
  }

  return { relocations, loading, error, fetchAll, create, update }
})
```

- [ ] **Step 3: Add @flovi/types dependency to web**

In `apps/web/package.json`, add to `dependencies`:
```json
"@flovi/types": "workspace:*"
```

Then run:
```bash
cd apps/web && pnpm install
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/stores/relocationsStore.ts apps/web/package.json
git commit -m "feat(web): add API client with JWT interceptor and relocations store"
```

---

## Task 13: Frontend — AppNavbar Component

**Files:**
- Create: `apps/web/src/components/AppNavbar.vue`

- [ ] **Step 1: Create apps/web/src/components/AppNavbar.vue**

```vue
<template>
  <header class="fixed top-0 inset-x-0 z-50 h-14 border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
    <div class="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
      <!-- Brand -->
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <span class="font-semibold text-zinc-900">Flovi Dispatcher</span>
      </div>

      <!-- User menu -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button class="flex items-center gap-2 rounded-full outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1">
            <Avatar class="h-8 w-8">
              <AvatarImage :src="user?.user_metadata?.avatar_url" />
              <AvatarFallback class="bg-zinc-200 text-zinc-700 text-xs font-medium">
                {{ initials }}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-48">
          <DropdownMenuLabel class="font-normal">
            <div class="flex flex-col space-y-1">
              <p class="text-sm font-medium leading-none">{{ user?.user_metadata?.full_name }}</p>
              <p class="text-xs leading-none text-muted-foreground">{{ user?.email }}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="text-red-600 cursor-pointer" @click="handleSignOut">
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const initials = computed(() => {
  const name = user.value?.user_metadata?.full_name as string | undefined
  if (!name) return '?'
  return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
})

async function handleSignOut() {
  await authStore.signOut()
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/AppNavbar.vue
git commit -m "feat(web): add AppNavbar with user dropdown"
```

---

## Task 14: Frontend — StatusBadge + RelocationTable

**Files:**
- Create: `apps/web/src/components/StatusBadge.vue`
- Create: `apps/web/src/components/RelocationTable.vue`

- [ ] **Step 1: Create apps/web/src/components/StatusBadge.vue**

```vue
<template>
  <span :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', colorClass]">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RelocationStatus } from '@flovi/types'

const props = defineProps<{ status: RelocationStatus }>()

const config: Record<RelocationStatus, { label: string; class: string }> = {
  PENDING:     { label: 'Pending',     class: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' },
  IN_PROGRESS: { label: 'In Progress', class: 'bg-blue-50 text-blue-800 ring-blue-600/20' },
  COMPLETED:   { label: 'Completed',   class: 'bg-green-50 text-green-800 ring-green-600/20' },
  CANCELLED:   { label: 'Cancelled',   class: 'bg-zinc-100 text-zinc-500 ring-zinc-500/20' },
}

const colorClass = computed(() => config[props.status]?.class ?? '')
const label = computed(() => config[props.status]?.label ?? props.status)
</script>
```

- [ ] **Step 2: Create apps/web/src/components/RelocationTable.vue**

```vue
<template>
  <div>
    <!-- Skeleton -->
    <div v-if="loading" class="space-y-3">
      <Skeleton v-for="i in 5" :key="i" class="h-12 w-full rounded-md" />
    </div>

    <!-- Empty state -->
    <div v-else-if="relocations.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p class="text-sm font-medium text-zinc-700">No relocations yet</p>
      <p class="text-sm text-zinc-400 mt-1">Create your first relocation order to get started.</p>
    </div>

    <!-- Table -->
    <div v-else class="rounded-lg border border-zinc-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-zinc-50 hover:bg-zinc-50">
            <TableHead class="w-28 text-xs font-medium text-zinc-500 uppercase tracking-wide">ID</TableHead>
            <TableHead class="text-xs font-medium text-zinc-500 uppercase tracking-wide">Origin</TableHead>
            <TableHead class="text-xs font-medium text-zinc-500 uppercase tracking-wide">Destination</TableHead>
            <TableHead class="text-xs font-medium text-zinc-500 uppercase tracking-wide">Date</TableHead>
            <TableHead class="text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</TableHead>
            <TableHead class="w-16 text-xs font-medium text-zinc-500 uppercase tracking-wide">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="relocation in relocations"
            :key="relocation.id"
            class="hover:bg-zinc-50/50 transition-colors"
          >
            <TableCell class="font-mono text-xs text-zinc-400">
              {{ relocation.id.slice(0, 8) }}…
            </TableCell>
            <TableCell class="font-medium text-zinc-800">{{ relocation.origin }}</TableCell>
            <TableCell class="text-zinc-600">{{ relocation.destination }}</TableCell>
            <TableCell class="text-zinc-600">{{ formatDate(relocation.date) }}</TableCell>
            <TableCell>
              <StatusBadge :status="relocation.status" />
            </TableCell>
            <TableCell>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <span>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8"
                        :disabled="isTerminal(relocation.status)"
                        @click="$emit('edit', relocation)"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent v-if="isTerminal(relocation.status)">
                    <p>Cannot edit {{ relocation.status.toLowerCase() }} relocations</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Relocation, RelocationStatus } from '@flovi/types'
import { TERMINAL_STATUSES } from '@flovi/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import StatusBadge from './StatusBadge.vue'

defineProps<{
  relocations: Relocation[]
  loading: boolean
}>()

defineEmits<{
  edit: [relocation: Relocation]
}>()

function isTerminal(status: RelocationStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}
</script>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/StatusBadge.vue apps/web/src/components/RelocationTable.vue
git commit -m "feat(web): add StatusBadge and RelocationTable components"
```

---

## Task 15: Frontend — Relocation Form Sheet (Create + Edit)

**Files:**
- Create: `apps/web/src/components/RelocationForm.vue`
- Create: `apps/web/src/components/RelocationSheet.vue`

- [ ] **Step 1: Create apps/web/src/components/RelocationForm.vue**

```vue
<template>
  <form class="space-y-5" @submit.prevent="onSubmit">
    <!-- Origin -->
    <div class="space-y-1.5">
      <Label for="origin">Origin <span class="text-red-500">*</span></Label>
      <Input
        id="origin"
        v-model="origin"
        placeholder="e.g. Madrid"
        :class="{ 'border-red-400': errors.origin }"
      />
      <p v-if="errors.origin" class="text-xs text-red-500">{{ errors.origin }}</p>
    </div>

    <!-- Destination -->
    <div class="space-y-1.5">
      <Label for="destination">Destination <span class="text-red-500">*</span></Label>
      <Input
        id="destination"
        v-model="destination"
        placeholder="e.g. Barcelona"
        :class="{ 'border-red-400': errors.destination }"
      />
      <p v-if="errors.destination" class="text-xs text-red-500">{{ errors.destination }}</p>
    </div>

    <!-- Execution Date -->
    <div class="space-y-1.5">
      <Label>Execution Date <span class="text-red-500">*</span></Label>
      <Popover>
        <PopoverTrigger as-child>
          <Button
            variant="outline"
            :class="['w-full justify-start text-left font-normal', !dateValue && 'text-muted-foreground', errors.date && 'border-red-400']"
          >
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ dateValue ? formatDate(dateValue) : 'Pick a date' }}
          </Button>
        </PopoverTrigger>
        <PopoverContent class="w-auto p-0" align="start">
          <Calendar
            v-model="dateValue"
            :disabled-dates="isPastDate"
            initial-focus
          />
        </PopoverContent>
      </Popover>
      <p v-if="errors.date" class="text-xs text-red-500">{{ errors.date }}</p>
    </div>

    <!-- Notes -->
    <div class="space-y-1.5">
      <Label for="notes">Notes <span class="text-zinc-400 text-xs font-normal">(optional)</span></Label>
      <Textarea
        id="notes"
        v-model="notes"
        placeholder="Additional instructions..."
        rows="3"
        maxlength="500"
        :class="{ 'border-red-400': errors.notes }"
      />
      <div class="flex justify-between items-center">
        <p v-if="errors.notes" class="text-xs text-red-500">{{ errors.notes }}</p>
        <p class="text-xs text-zinc-400 ml-auto">{{ notes?.length ?? 0 }}/500</p>
      </div>
    </div>

    <!-- Status (edit mode only) -->
    <div v-if="mode === 'edit'" class="space-y-1.5">
      <Label for="status">Status</Label>
      <Select v-model="status" :disabled="isTerminalStatus">
        <SelectTrigger :class="{ 'opacity-50 cursor-not-allowed': isTerminalStatus }">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="s in ALL_STATUSES" :key="s" :value="s">
            {{ statusLabel(s) }}
          </SelectItem>
        </SelectContent>
      </Select>
      <p v-if="isTerminalStatus" class="text-xs text-zinc-400">Status cannot be changed for completed or cancelled relocations.</p>
    </div>

    <!-- Actions -->
    <div class="flex gap-3 pt-2">
      <Button type="submit" class="flex-1" :disabled="submitting">
        <svg v-if="submitting" class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {{ submitting ? 'Saving...' : mode === 'create' ? 'Create Relocation' : 'Save Changes' }}
      </Button>
      <Button type="button" variant="outline" @click="$emit('cancel')">Cancel</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { z } from 'zod'
import type { Relocation, RelocationStatus } from '@flovi/types'
import { TERMINAL_STATUSES, ALL_STATUSES } from '@flovi/types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

const props = defineProps<{
  mode: 'create' | 'edit'
  initial?: Relocation
  submitting: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { origin: string; destination: string; date: string; notes?: string; status?: RelocationStatus }]
  cancel: []
}>()

const origin = ref(props.initial?.origin ?? '')
const destination = ref(props.initial?.destination ?? '')
const dateValue = ref<Date | undefined>(props.initial?.date ? new Date(props.initial.date) : undefined)
const notes = ref(props.initial?.notes ?? '')
const status = ref<RelocationStatus>(props.initial?.status ?? 'PENDING')

const errors = ref<Record<string, string>>({})

const isTerminalStatus = computed(() =>
  props.mode === 'edit' && TERMINAL_STATUSES.includes(props.initial?.status ?? 'PENDING')
)

const formSchema = z.object({
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  date: z.date({ required_error: 'Execution date is required' }).refine(
    (d) => d > new Date(),
    'Date must be in the future'
  ),
  notes: z.string().max(500, 'Maximum 500 characters').optional(),
})

function isPastDate(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function statusLabel(s: RelocationStatus): string {
  const labels: Record<RelocationStatus, string> = {
    PENDING: 'Pending', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  }
  return labels[s]
}

function onSubmit() {
  errors.value = {}
  const result = formSchema.safeParse({
    origin: origin.value,
    destination: destination.value,
    date: dateValue.value,
    notes: notes.value || undefined,
  })

  if (!result.success) {
    result.error.issues.forEach((issue) => {
      errors.value[issue.path[0] as string] = issue.message
    })
    return
  }

  emit('submit', {
    origin: result.data.origin,
    destination: result.data.destination,
    date: result.data.date.toISOString(),
    notes: result.data.notes,
    ...(props.mode === 'edit' ? { status: status.value } : {}),
  })
}
</script>
```

- [ ] **Step 2: Create apps/web/src/components/RelocationSheet.vue**

```vue
<template>
  <Sheet :open="open" @update:open="$emit('update:open', $event)">
    <SheetContent class="sm:max-w-md overflow-y-auto">
      <SheetHeader class="mb-6">
        <SheetTitle>{{ mode === 'create' ? 'New Relocation' : 'Edit Relocation' }}</SheetTitle>
        <SheetDescription>
          {{ mode === 'create'
            ? 'Create a new vehicle relocation order.'
            : 'Update the details of this relocation request.' }}
        </SheetDescription>
      </SheetHeader>
      <RelocationForm
        :mode="mode"
        :initial="relocation"
        :submitting="submitting"
        @submit="handleSubmit"
        @cancel="$emit('update:open', false)"
      />
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import type { Relocation, CreateRelocationDto, UpdateRelocationDto } from '@flovi/types'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useRelocationsStore } from '@/stores/relocationsStore'
import RelocationForm from './RelocationForm.vue'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  relocation?: Relocation
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const store = useRelocationsStore()
const submitting = ref(false)

async function handleSubmit(payload: CreateRelocationDto | UpdateRelocationDto) {
  submitting.value = true
  try {
    if (props.mode === 'create') {
      await store.create(payload as CreateRelocationDto)
      toast.success('Relocation created successfully')
    } else if (props.relocation) {
      await store.update(props.relocation.id, payload as UpdateRelocationDto)
      toast.success('Relocation updated successfully')
    }
    emit('update:open', false)
    emit('saved')
  } catch (e: any) {
    toast.error(e.response?.data?.message ?? 'Something went wrong')
  } finally {
    submitting.value = false
  }
}
</script>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/RelocationForm.vue apps/web/src/components/RelocationSheet.vue
git commit -m "feat(web): add RelocationForm and RelocationSheet components"
```

---

## Task 16: Frontend — Dashboard View + Sonner Setup

**Files:**
- Create: `apps/web/src/views/DashboardView.vue`
- Modify: `apps/web/src/App.vue`

- [ ] **Step 1: Create apps/web/src/views/DashboardView.vue**

```vue
<template>
  <div class="min-h-screen bg-zinc-50">
    <AppNavbar />

    <main class="pt-14">
      <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Page header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-xl font-semibold text-zinc-900">Relocations</h1>
            <p class="text-sm text-zinc-500 mt-0.5">
              {{ store.relocations.length }} order{{ store.relocations.length !== 1 ? 's' : '' }} total
            </p>
          </div>
          <Button @click="openCreateSheet">
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Relocation
          </Button>
        </div>

        <!-- Error banner -->
        <div v-if="store.error" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {{ store.error }}
        </div>

        <!-- Table -->
        <RelocationTable
          :relocations="store.relocations"
          :loading="store.loading"
          @edit="openEditSheet"
        />
      </div>
    </main>

    <!-- Create Sheet -->
    <RelocationSheet
      v-model:open="createSheetOpen"
      mode="create"
      @saved="store.fetchAll"
    />

    <!-- Edit Sheet -->
    <RelocationSheet
      v-if="selectedRelocation"
      v-model:open="editSheetOpen"
      mode="edit"
      :relocation="selectedRelocation"
      @saved="store.fetchAll"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Relocation } from '@flovi/types'
import { useRelocationsStore } from '@/stores/relocationsStore'
import { Button } from '@/components/ui/button'
import AppNavbar from '@/components/AppNavbar.vue'
import RelocationTable from '@/components/RelocationTable.vue'
import RelocationSheet from '@/components/RelocationSheet.vue'

const store = useRelocationsStore()

const createSheetOpen = ref(false)
const editSheetOpen = ref(false)
const selectedRelocation = ref<Relocation | undefined>()

onMounted(() => store.fetchAll())

function openCreateSheet() {
  createSheetOpen.value = true
}

function openEditSheet(relocation: Relocation) {
  selectedRelocation.value = relocation
  editSheetOpen.value = true
}
</script>
```

- [ ] **Step 2: Add Sonner (Toaster) to App.vue**

Replace `apps/web/src/App.vue`:

```vue
<template>
  <RouterView />
  <Toaster rich-colors position="top-right" />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { Toaster } from 'vue-sonner'
</script>
```

- [ ] **Step 3: Verify the full flow**

```bash
cd apps/web && pnpm dev
```

- Navigate to `http://localhost:5173` → should redirect to `/login`
- The login page should show the Google button
- (Can't complete auth without real Supabase creds — visual check only at this step)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/views/DashboardView.vue apps/web/src/App.vue
git commit -m "feat(web): implement Dashboard view with full relocation CRUD UI"
```

---

## Task 17: Frontend — Vercel Deployment Config

**Files:**
- Create: `apps/web/vercel.json`

- [ ] **Step 1: Create apps/web/vercel.json**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "env": {
    "VITE_SUPABASE_URL": "@vite-supabase-url",
    "VITE_SUPABASE_ANON_KEY": "@vite-supabase-anon-key",
    "VITE_API_URL": "@vite-api-url"
  }
}
```

The rewrite rule ensures Vue Router's `createWebHistory` works on Vercel (all paths served `index.html`).

- [ ] **Step 2: Verify build succeeds**

```bash
cd apps/web && pnpm build
```

Expected: `dist/` folder created with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/vercel.json
git commit -m "feat(web): add Vercel deployment config with SPA rewrite"
```

---

## Task 18: PROMPT_LOG.md + CLAUDE.md

**Files:**
- Create: `PROMPT_LOG.md`
- Create: `CLAUDE.md`

- [ ] **Step 1: Create PROMPT_LOG.md documenting all key decisions**

Document each architectural decision made during the brainstorming and planning sessions (see design spec for context). File structure:

```markdown
# Prompt Log — Flovi Dispatcher

Chronological record of key decisions made during design and implementation.

---

## 2026-04-10 — Repository Structure
**Decision:** pnpm monorepo with `apps/web`, `apps/api`, `packages/types`
**Rationale:** Shared TypeScript types prevent drift between frontend and API. pnpm workspaces chosen over Turborepo to avoid over-engineering a two-app project.

## 2026-04-10 — Authentication
**Decision:** Supabase Google OAuth + JWT forwarded to Fastify
**Rationale:** Supabase manages the full OAuth flow; Fastify verifies JWTs via `supabase.auth.getUser()` — no custom JWT parsing needed.

## 2026-04-10 — API Deployment
**Decision:** Fastify wrapped in a single Vercel serverless function (`api/index.ts`)
**Rationale:** Fastify's router handles all sub-routes; Vercel rewrites everything to the single entry point. Avoids N separate Vercel Functions for N routes.

## 2026-04-10 — UI Library
**Decision:** shadcn-vue (radix-vue based) + Tailwind CSS
**Rationale:** shadcn-vue provides accessible, unstyled-by-default components matching the spec requirement for shadcn design system.

## 2026-04-10 — Form Handling
**Decision:** Zod schemas + custom `safeParse` validation (no VeeValidate plugin overhead)
**Rationale:** Keeps form validation self-contained per-component. Zod errors map directly to field keys for inline display.

## 2026-04-10 — Edit Restriction
**Decision:** Enforced at both API (400) and UI (disabled button + tooltip)
**Rationale:** Defense-in-depth — UI prevents accidental clicks; API prevents direct API abuse.

## 2026-04-10 — Date Picker
**Decision:** shadcn-vue Calendar inside a Popover (not a native `<input type="date">`)
**Rationale:** Allows disabling past dates visually and consistently across browsers.
```

- [ ] **Step 2: Create CLAUDE.md**

```markdown
# Flovi Dispatcher — CLAUDE.md

## Project Overview
pnpm monorepo containing:
- `apps/web` — VueJS 3 dispatcher frontend (Vite, shadcn-vue, Pinia, Vue Router)
- `apps/api` — Fastify REST API (TypeScript, Prisma, Supabase auth)
- `packages/types` — Shared TypeScript types (Relocation model, DTOs)

## Tech Stack
- **Frontend:** Vue 3, Vite, Tailwind CSS, shadcn-vue, Pinia, Vue Router 4, Axios, Zod, vue-sonner
- **Backend:** Fastify 4, Prisma 5, @supabase/supabase-js, Zod, TypeScript
- **Database:** Supabase Postgres (via Prisma)
- **Auth:** Supabase Google OAuth — JWT verified server-side via `supabase.auth.getUser()`
- **Hosting:** Vercel (two separate projects: web + api)

## Environment Variables

### apps/api (.env)
```
DATABASE_URL=             # Supabase pooled connection (pgbouncer=true)
DIRECT_URL=               # Supabase direct connection (for migrations)
SUPABASE_URL=             # https://[ref].supabase.co
SUPABASE_ANON_KEY=        # Supabase anon key
CORS_ORIGIN=              # Frontend URL (e.g. https://flovi-dispatcher.vercel.app)
```

### apps/web (.env.local)
```
VITE_SUPABASE_URL=        # https://[ref].supabase.co
VITE_SUPABASE_ANON_KEY=   # Supabase anon key
VITE_API_URL=             # API base URL (e.g. https://flovi-api.vercel.app)
```

## Development

```bash
# Install all dependencies
pnpm install

# Run web dev server
pnpm dev:web              # http://localhost:5173

# Run API dev server
pnpm dev:api              # http://localhost:3001

# Run API tests
pnpm test:api

# Run Prisma migrations
cd apps/api && npx prisma migrate dev

# Generate Prisma client
cd apps/api && npx prisma generate
```

## Key Architectural Rules

1. **Never edit COMPLETED or CANCELLED relocations** — enforced at API (400) and disabled in UI.
2. **Execution dates must be in the future** — validated at API (422) and calendar disables past dates.
3. **All API routes require a valid Supabase JWT** — the `authPlugin` runs as a `preHandler` on every route.
4. **Shared types live only in `packages/types`** — do not duplicate type definitions in `apps/web` or `apps/api`.
5. **API is a single Vercel Function** — `apps/api/api/index.ts` wraps the entire Fastify app.

## API Endpoints

| Method | Path                        | Description                    |
|--------|-----------------------------|--------------------------------|
| GET    | /health                     | Health check (no auth)         |
| POST   | /api/v1/relocations         | Create a new relocation        |
| GET    | /api/v1/relocations         | List all relocations for user  |
| PUT    | /api/v1/relocations/:id     | Update a relocation            |

## File Responsibilities

| File | Responsibility |
|------|----------------|
| `apps/api/src/app.ts` | Fastify app builder — registers plugins and routes |
| `apps/api/src/plugins/prisma.ts` | Prisma client as Fastify plugin |
| `apps/api/src/plugins/auth.ts` | JWT verification preHandler |
| `apps/api/src/routes/relocations.ts` | All relocation route handlers |
| `apps/web/src/lib/supabase.ts` | Supabase browser client singleton |
| `apps/web/src/lib/api.ts` | Axios instance with JWT interceptor + 401 handler |
| `apps/web/src/stores/authStore.ts` | Pinia: session, sign-in, sign-out |
| `apps/web/src/stores/relocationsStore.ts` | Pinia: CRUD state + API calls |
| `apps/web/src/router/index.ts` | Routes + auth guards |
| `apps/web/src/components/RelocationSheet.vue` | Sheet wrapper — handles create vs edit mode |
| `apps/web/src/components/RelocationForm.vue` | Form fields + Zod validation |
| `apps/web/src/components/RelocationTable.vue` | Data table + skeleton + empty state |
| `apps/web/src/components/StatusBadge.vue` | Color-coded status indicator |

## Deployment

### API (apps/api)
1. Create Vercel project pointing to `apps/api/`
2. Add environment variables from `.env.example`
3. Vercel detects `api/index.ts` via `vercel.json`

### Web (apps/web)
1. Create Vercel project pointing to `apps/web/`
2. Add environment variables (VITE_* prefix)
3. Build command: `pnpm build` | Output dir: `dist`
4. SPA rewrite in `vercel.json` handles Vue Router history mode

## Supabase Setup Checklist
- [ ] Enable Google provider in Authentication → Providers
- [ ] Add `http://localhost:5173` and production URL to Redirect URLs
- [ ] Copy `DATABASE_URL` (Session mode, port 6543) and `DIRECT_URL` (port 5432) from Settings → Database
```

- [ ] **Step 3: Commit**

```bash
git add PROMPT_LOG.md CLAUDE.md
git commit -m "docs: add PROMPT_LOG and CLAUDE.md"
```

---

## Self-Review Checklist

| Spec Requirement | Covered In |
|-----------------|-----------|
| Google Sign-in button on landing | Task 11 (LoginView) |
| Origin/Destination string inputs | Task 15 (RelocationForm) |
| Date picker, no past dates | Task 15 (RelocationForm + Calendar) |
| Notes textarea, 500 char max | Task 15 (RelocationForm) |
| POST /api/v1/relocations | Task 6 (relocationRoutes) |
| Dashboard table: ID, Origin, Destination, Date, Status | Task 14 (RelocationTable) |
| Status badges: PENDING, IN_PROGRESS, COMPLETED, CANCELLED | Task 14 (StatusBadge) |
| GET /api/v1/relocations | Task 6 (relocationRoutes) |
| Edit existing relocations | Task 15 (RelocationSheet edit mode) |
| Block edit on COMPLETED/CANCELLED | Task 6 (API 400) + Task 14 (disabled button) |
| PUT /api/v1/relocations/:id | Task 6 (relocationRoutes) |
| VueJS | Tasks 8-17 |
| Supabase auth | Tasks 9, 5 |
| Prisma | Task 4, 5 |
| Vercel hosting | Tasks 7, 17 |
| shadcn-vue components | Tasks 8, 13-16 |
| Fastify + TypeScript API | Tasks 3-7 |
| PROMPT_LOG.md | Task 18 |
| CLAUDE.md | Task 18 |
| polished/modern UI | Tasks 11, 13, 14, 15, 16 (full shadcn-vue + Tailwind implementation) |
