# Flovi Dispatcher — Design Spec
_Date: 2026-04-10_

## Overview

A dispatcher web application for managing vehicle relocation requests. Dispatchers can create, view, and update relocation orders through a VueJS frontend backed by a Fastify REST API. Authentication is handled via Supabase Google OAuth. The project is structured as a pnpm monorepo with two deployable apps and a shared types package.

---

## 1. Repository Structure

```
flovi_dispatcher/
├── apps/
│   ├── web/                        # VueJS 3 + Vite + shadcn-vue + Pinia
│   │   └── src/
│   │       ├── views/
│   │       │   ├── LoginView.vue             # Google OAuth landing page
│   │       │   ├── DashboardView.vue         # Relocations data table
│   │       │   └── RelocationFormView.vue    # Create / Edit sheet panel
│   │       ├── components/ui/                # shadcn-vue primitives
│   │       ├── stores/
│   │       │   ├── authStore.ts              # Supabase session state
│   │       │   └── relocationsStore.ts       # CRUD state + API calls
│   │       ├── router/
│   │       │   └── index.ts                  # Routes + auth guards
│   │       └── lib/
│   │           ├── supabase.ts               # Supabase client
│   │           └── api.ts                    # Axios instance w/ JWT header
│   └── api/                        # Fastify + TypeScript + Prisma
│       └── src/
│           ├── routes/
│           │   └── relocations.ts            # POST / GET / PUT handlers
│           ├── plugins/
│           │   ├── prisma.ts                 # Prisma client plugin
│           │   └── auth.ts                   # JWT verification via Supabase
│           └── server.ts                     # Fastify app entry point
├── packages/
│   └── types/                      # Shared TypeScript types + enums
│       └── src/index.ts
├── pnpm-workspace.yaml
└── package.json                    # Workspace root scripts
```

**Deployment**: Two separate Vercel projects:
- `apps/web` → Vercel static SPA
- `apps/api` → Vercel Node.js serverless

---

## 2. Data Model

### Prisma Schema (Supabase Postgres)

```prisma
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
  userId      String           // Supabase auth.users uid
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
}
```

### Shared Types (`packages/types/src/index.ts`)

```ts
export type RelocationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export const TERMINAL_STATUSES: RelocationStatus[] = ['COMPLETED', 'CANCELLED']

export interface Relocation {
  id: string
  origin: string
  destination: string
  date: string        // ISO 8601
  notes?: string
  status: RelocationStatus
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreateRelocationDto {
  origin: string
  destination: string
  date: string        // ISO 8601, must be future date
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

---

## 3. API Design

Base URL: `https://api.flovi-dispatcher.vercel.app`

| Method | Endpoint                        | Description               | Auth |
|--------|---------------------------------|---------------------------|------|
| POST   | `/api/v1/relocations`           | Create a relocation order | JWT  |
| GET    | `/api/v1/relocations`           | List all relocations      | JWT  |
| PUT    | `/api/v1/relocations/:id`       | Update a relocation       | JWT  |

**Business rules enforced at API level:**
- `PUT` on a relocation with status `COMPLETED` or `CANCELLED` returns `400 Bad Request`
- All endpoints require `Authorization: Bearer <supabase_jwt>` — missing/invalid returns `401`
- `date` on `POST` must not be in the past — returns `422 Unprocessable Entity`

**Error response shape:**
```json
{ "statusCode": 400, "error": "Bad Request", "message": "Cannot edit a completed or cancelled relocation" }
```

---

## 4. Authentication Flow

1. User visits any route → Vue Router guard checks `authStore.session`
2. If no session → redirect to `/login`
3. `LoginView` renders "Sign in with Google" button
4. Button calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
5. Supabase handles OAuth redirect; on return, session stored in `localStorage`
6. `supabase.auth.onAuthStateChange` updates `authStore` → router allows entry
7. All Axios requests include `Authorization: Bearer <session.access_token>` via interceptor
8. Fastify `auth` plugin calls `supabase.auth.getUser(token)` to verify each request
9. On `401` from API → Axios interceptor clears session and redirects to `/login`

---

## 5. Frontend UI/UX

### Theme
- Light mode, zinc/slate neutral palette
- Professional, data-dense dispatcher aesthetic
- shadcn-vue component library throughout

### Login Page (`/login`)
- Full-height centered layout
- Card with app logo + name
- Single "Sign in with Google" button (shadcn-vue `Button` + Google SVG icon)

### Dashboard (`/`)
- Fixed top navbar: app name (left), user avatar + sign-out dropdown (right)
- "New Relocation" primary button (top-right of content area)
- shadcn-vue `Table` columns: ID (truncated cuid), Origin, Destination, Date, Status, Actions
- Status badges:
  - `PENDING` → yellow
  - `IN_PROGRESS` → blue
  - `COMPLETED` → green
  - `CANCELLED` → muted red/gray
- Row action: Edit icon button — disabled with tooltip for `COMPLETED`/`CANCELLED`
- Skeleton loaders while fetching
- Empty state with illustration when no data

### Relocation Form (Create / Edit)
- Opens as shadcn-vue `Sheet` (slide-over panel from the right)
- Fields:
  - **Origin**: `Input`, required
  - **Destination**: `Input`, required
  - **Execution Date**: `DatePicker`, past dates disabled, required
  - **Notes**: `Textarea`, optional, live counter `0/500 chars`
  - **Status**: `Select`, edit mode only; disabled when status is `COMPLETED` or `CANCELLED`
- Validation: VeeValidate + Zod schemas
- Submit button shows spinner during API call
- On success: sheet closes, table refreshes, `Sonner` toast ("Relocation created")
- On error: `Sonner` toast with error message from API

---

## 6. Error Handling

| Layer    | Mechanism                                                  |
|----------|------------------------------------------------------------|
| API      | Fastify `setErrorHandler` → structured JSON errors         |
| Frontend | Axios response interceptor → `Sonner` toasts               |
| Forms    | Zod schema + VeeValidate → inline field error messages     |
| Auth     | `401` interceptor clears session + redirects to `/login`   |

---

## 7. Key Dependencies

### `apps/web`
- `vue@3`, `vite`, `vue-router@4`, `pinia`
- `@supabase/supabase-js`
- `shadcn-vue`, `radix-vue`, `tailwindcss`
- `vee-validate`, `zod`
- `axios`
- `vue-sonner`

### `apps/api`
- `fastify`, `@fastify/cors`
- `@prisma/client`, `prisma`
- `@supabase/supabase-js`
- `typescript`, `tsx`
- `zod` (request body validation)

### `packages/types`
- `typescript` only — no runtime dependencies
