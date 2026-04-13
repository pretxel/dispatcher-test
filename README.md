# Flovi Dispatcher

A vehicle relocation dispatcher web app. Authenticated users can create, view, confirm, and manage relocation orders through a clean dashboard interface.

## Architecture

```
flovi-dispatcher/
├── apps/web/                  # Vue 3 SPA (Vite, shadcn-vue, Pinia)
├── packages/types/            # Shared TypeScript types and status constants
└── supabase/functions/api/    # Supabase Edge Function (Deno) — REST API
```

| Layer | Technology |
|---|---|
| Frontend | Vue 3, Vite, Tailwind CSS v3, shadcn-vue 2.x, Pinia, Vue Router 4, Axios, Zod |
| Backend | Supabase Edge Function (Deno runtime) |
| Database | Supabase Postgres |
| Auth | Supabase Google OAuth — JWT verified server-side |
| Hosting | Vercel (web) + Supabase Edge Functions (API) |

## API Endpoints

All endpoints require a valid Supabase JWT in the `Authorization: Bearer <token>` header except `/health`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check — no auth |
| `GET` | `/api/v1/relocations` | List relocations (all by default) |
| `GET` | `/api/v1/relocations?userId=<id>` | Filter by user |
| `GET` | `/api/v1/relocations?status=<status>` | Filter by status |
| `POST` | `/api/v1/relocations` | Create a relocation |
| `PUT` | `/api/v1/relocations/:id` | Update a relocation |
| `POST` | `/api/v1/relocations/:id/confirm` | Confirm — sets status to `IN_PROGRESS` |

**Valid statuses:** `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`

`COMPLETED` and `CANCELLED` relocations cannot be edited or confirmed.

## Local Development

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for Edge Function local serving)

### Setup

```bash
# Install dependencies (also builds @flovi/types)
pnpm install

# Copy and fill web env vars
cp apps/web/.env.example apps/web/.env.local
```

`apps/web/.env.local`:
```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:54321/functions/v1   # local Edge Function
SITE_URL=http://localhost:5173
```

### Running

```bash
# Web dev server (port 5173)
pnpm dev:web

# Edge Function locally (separate terminal, Deno required)
supabase functions serve api --env-file supabase/.env.local
```

`supabase/.env.local` (for local function serving):
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CORS_ORIGIN=http://localhost:5173
```

### Building

```bash
pnpm build:web
```

## Deployment

### 1. Supabase

```bash
# Deploy Edge Function
supabase functions deploy api --project-ref <project-ref>

# Set required secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key> --project-ref <project-ref>
supabase secrets set CORS_ORIGIN=https://your-vercel-domain.vercel.app --project-ref <project-ref>
```

In the Supabase dashboard:
- Enable **Google OAuth** provider under Authentication → Providers
- Add allowed redirect URLs: `http://localhost:5173` and your production URL

### 2. Vercel (web)

- Root directory: `apps/web`
- Build command: `pnpm build`
- Output directory: `dist`
- Environment variables:

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://[project-ref].supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_URL` | `https://[project-ref].supabase.co/functions/v1` |

## Business Rules

1. Execution dates must be in the future (enforced at API and UI).
2. `COMPLETED` and `CANCELLED` relocations cannot be edited or confirmed.
3. Confirming a relocation sets its status to `IN_PROGRESS` (409 if already confirmed).
4. All write operations (create, update, confirm) require authentication.

## Project Structure

```
apps/web/src/
├── components/
│   ├── ui/                  # shadcn-vue primitives
│   ├── RelocationForm.vue   # Create/edit form with Zod validation
│   ├── RelocationSheet.vue  # Sheet wrapper (create vs edit mode)
│   ├── RelocationTable.vue  # Data table with skeleton + empty state
│   ├── StatusBadge.vue      # Color-coded status pill
│   └── AppNavbar.vue        # Top navigation with user menu
├── stores/
│   ├── authStore.ts         # Pinia: session, sign-in, sign-out
│   └── relocationsStore.ts  # Pinia: CRUD state + API calls
├── lib/
│   ├── api.ts               # Axios instance with JWT interceptor
│   └── supabase.ts          # Supabase browser client singleton
└── router/index.ts          # Routes + auth guards

packages/types/src/index.ts  # Relocation type, DTOs, status constants

supabase/functions/api/
└── index.ts                 # Edge Function: auth, routing, all handlers
```
