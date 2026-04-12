# Flovi Dispatcher — CLAUDE.md

## Project Overview
pnpm monorepo for a vehicle relocation dispatcher web app:
- `apps/web` — VueJS 3 frontend (Vite, shadcn-vue, Pinia, Vue Router 4)
- `packages/types` — Shared TypeScript types (Relocation model, DTOs, status constants)
- `supabase/functions/api/` — Supabase Edge Function (Deno) — the backend API

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Vite, Tailwind CSS v3, shadcn-vue 2.x, Pinia, Vue Router 4, Axios, Zod, vue-sonner |
| Backend | Supabase Edge Function (Deno runtime), @supabase/supabase-js |
| Database | Supabase Postgres (queried via supabase-js PostgREST, migrated with Prisma) |
| Auth | Supabase Google OAuth; JWT verified server-side via `supabase.auth.getUser()` |
| Hosting | Vercel (`apps/web` static SPA) + Supabase Edge Functions (API) |

## Environment Variables

### Supabase Edge Function secrets
```
SUPABASE_URL=             # auto-injected by Supabase runtime
SUPABASE_ANON_KEY=        # auto-injected by Supabase runtime
SUPABASE_SERVICE_ROLE_KEY= # set via Supabase dashboard or CLI
CORS_ORIGIN=              # Frontend URL (e.g. https://flovi-dispatcher.vercel.app)
```

### apps/web (.env.local)
```
VITE_SUPABASE_URL=        # https://[ref].supabase.co
VITE_SUPABASE_ANON_KEY=   # Supabase anon key
VITE_API_URL=             # https://[project-ref].supabase.co/functions/v1  (production)
                          # http://localhost:3001 for local dev (Fastify, if running locally)
```

## Development Commands

```bash
# Install all workspace dependencies
pnpm install

# Start web dev server (port 5173)
pnpm dev:web

# Build web for production
pnpm build:web

# Deploy Edge Function to Supabase
supabase functions deploy api --project-ref <project-ref>

# Serve Edge Function locally (Deno required)
supabase functions serve api
```

## Project Rules (MUST follow)

1. **Never edit COMPLETED or CANCELLED relocations** — enforced at API (400) and disabled in UI (disabled button + tooltip).
2. **Execution dates must be in the future** — validated at API (422) and Calendar `minValue` blocks past dates.
3. **All API routes require a valid Supabase JWT** — `authenticate()` helper runs on every route except `/health`.
4. **Shared types live only in `packages/types`** — do not duplicate type definitions in `apps/web` or the Edge Function.
5. **API is a Supabase Edge Function** — `supabase/functions/api/index.ts` handles all routes via a Deno router.
6. **Tailwind v3 only** — shadcn-vue 2.x is incompatible with Tailwind v4. Do not upgrade Tailwind.
7. **Status constants from `@flovi/types`** — always use `TERMINAL_STATUSES` and `ALL_STATUSES`; never hardcode status strings in the web app. (The Edge Function duplicates these constants since it cannot import Node packages.)

## API Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | /health | Health check | No |
| POST | /api/v1/relocations | Create relocation | Yes |
| GET | /api/v1/relocations | List relocations for user | Yes |
| PUT | /api/v1/relocations/:id | Update relocation | Yes |

Requests go to `https://[project-ref].supabase.co/functions/v1/api/...`

## Key File Responsibilities

| File | Responsibility |
|------|----------------|
| `packages/types/src/index.ts` | Single source of truth for all types and status constants |
| `supabase/functions/api/index.ts` | Edge Function — auth, route dispatch, all CRUD handlers |
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
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` and `CORS_ORIGIN` secrets on the Edge Function
- [ ] Deploy Edge Function: `supabase functions deploy api --project-ref <ref>`

### Web (apps/web) on Vercel
- [ ] Create Vercel project, set root directory to `apps/web`
- [ ] Add 3 env vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL)
- [ ] Build command: `pnpm build` | Output dir: `dist`
- [ ] Deploy — `vercel.json` handles SPA routing (all paths → index.html)
