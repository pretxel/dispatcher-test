# Flovi Dispatcher — CLAUDE.md

## Project Overview
pnpm monorepo for a vehicle relocation dispatcher web app:
- `apps/web` — VueJS 3 frontend (Vite, shadcn-vue, Pinia, Vue Router 4)
- `apps/api` — Fastify REST API (TypeScript, Prisma, Supabase auth)
- `packages/types` — Shared TypeScript types (Relocation model, DTOs, status constants)

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Vite, Tailwind CSS v3, shadcn-vue 2.x, Pinia, Vue Router 4, Axios, Zod, vue-sonner |
| Backend | Fastify 4, Prisma 5, @supabase/supabase-js, Zod, TypeScript |
| Database | Supabase Postgres (Prisma ORM) |
| Auth | Supabase Google OAuth; JWT verified server-side via `supabase.auth.getUser()` |
| Hosting | Vercel (two projects: `apps/web` static SPA, `apps/api` Node.js function) |

## Environment Variables

### apps/api (.env)
```
DATABASE_URL=             # Supabase pooled connection (port 6543, pgbouncer=true)
DIRECT_URL=               # Supabase direct connection (port 5432, for migrations)
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

## Development Commands

```bash
# Install all workspace dependencies
pnpm install

# Start web dev server (port 5173)
pnpm dev:web

# Start API dev server (port 3001)
pnpm dev:api

# Run API tests (7 tests)
pnpm test:api

# Build web for production
pnpm build:web

# Build API for production
pnpm build:api

# Prisma: run migrations (requires .env with DATABASE_URL)
cd apps/api && npx prisma migrate dev

# Prisma: regenerate client after schema changes
cd apps/api && npx prisma generate
```

## Project Rules (MUST follow)

1. **Never edit COMPLETED or CANCELLED relocations** — enforced at API (400) and disabled in UI (disabled button + tooltip).
2. **Execution dates must be in the future** — validated at API (422) and Calendar `minValue` blocks past dates.
3. **All API routes require a valid Supabase JWT** — `authPlugin` runs as global `preHandler` on every route.
4. **Shared types live only in `packages/types`** — do not duplicate type definitions in `apps/web` or `apps/api`.
5. **API is a single Vercel Function** — `apps/api/api/index.ts` wraps the entire Fastify app; `vercel.json` rewrites all requests to it.
6. **Tailwind v3 only** — shadcn-vue 2.x is incompatible with Tailwind v4. Do not upgrade Tailwind.
7. **Status constants from `@flovi/types`** — always use `TERMINAL_STATUSES` and `ALL_STATUSES`; never hardcode status strings.

## API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /health | Health check | No |
| POST | /api/v1/relocations | Create relocation | Yes |
| GET | /api/v1/relocations | List relocations for user | Yes |
| PUT | /api/v1/relocations/:id | Update relocation | Yes |

## Key File Responsibilities

| File | Responsibility |
|------|----------------|
| `packages/types/src/index.ts` | Single source of truth for all types and status constants |
| `apps/api/src/app.ts` | Fastify builder — registers CORS, prismaPlugin, authPlugin, routes |
| `apps/api/src/plugins/auth.ts` | Supabase JWT verification as global `preHandler` |
| `apps/api/src/plugins/prisma.ts` | PrismaClient as Fastify plugin |
| `apps/api/src/routes/relocations.ts` | POST/GET/PUT route handlers with Zod validation |
| `apps/api/api/index.ts` | Vercel serverless entry point |
| `apps/web/src/lib/supabase.ts` | Supabase browser client singleton |
| `apps/web/src/lib/api.ts` | Axios instance with JWT request interceptor + 401 handler |
| `apps/web/src/stores/authStore.ts` | Pinia: session, sign-in, sign-out, init |
| `apps/web/src/stores/relocationsStore.ts` | Pinia: CRUD state + API calls |
| `apps/web/src/router/index.ts` | Routes + auth guards |
| `apps/web/src/components/RelocationSheet.vue` | Sheet wrapper — create vs edit mode |
| `apps/web/src/components/RelocationForm.vue` | Form fields + Zod validation + Calendar |
| `apps/web/src/components/RelocationTable.vue` | Data table + skeleton + empty state |
| `apps/web/src/components/StatusBadge.vue` | Color-coded status indicator |

## Deployment Checklist

### Supabase Setup
- [ ] Enable Google OAuth provider in Authentication → Providers
- [ ] Add redirect URLs: `http://localhost:5173` + production frontend URL
- [ ] Copy `DATABASE_URL` (Session mode, port 6543) from Settings → Database
- [ ] Copy `DIRECT_URL` (Direct connection, port 5432) from Settings → Database
- [ ] Run `cd apps/api && npx prisma migrate dev` with real credentials

### API (apps/api) on Vercel
- [ ] Create Vercel project, set root directory to `apps/api`
- [ ] Add all 5 env vars (DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_ANON_KEY, CORS_ORIGIN)
- [ ] Deploy — Vercel detects `api/index.ts` via `vercel.json`

### Web (apps/web) on Vercel
- [ ] Create Vercel project, set root directory to `apps/web`
- [ ] Add 3 env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL)
- [ ] Build command: `pnpm build` | Output dir: `dist`
- [ ] Deploy — `vercel.json` handles SPA routing (all paths → index.html)
