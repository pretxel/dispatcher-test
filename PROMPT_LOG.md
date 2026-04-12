# Prompt Log — Flovi Dispatcher

Chronological record of key decisions made during design and implementation.

---

## 2026-04-10 — Repository Structure
**Decision:** pnpm monorepo with `apps/web`, `apps/api`, `packages/types`  
**Rationale:** Shared TypeScript types from `@flovi/types` prevent drift between frontend and API. pnpm workspaces chosen over Turborepo (overkill for a two-app project) and flat structure (loses shared types benefit).

---

## 2026-04-10 — API Deployment on Vercel
**Decision:** Fastify wrapped in a single Vercel serverless function (`apps/api/api/index.ts`)  
**Rationale:** Fastify's built-in router handles all sub-routes; Vercel rewrites everything to the single entry point. Avoids creating N separate Vercel Functions per route, which would lose Fastify's plugin system (auth, Prisma).

---

## 2026-04-10 — Authentication
**Decision:** Supabase Google OAuth + JWT forwarded to Fastify, verified via `supabase.auth.getUser()`  
**Rationale:** Supabase manages the full OAuth flow; Fastify verifies JWTs using the Supabase client — no custom JWT parsing or secret management needed. The `authPlugin` runs as a global `preHandler` hook covering all routes.

---

## 2026-04-10 — UI Component Library
**Decision:** shadcn-vue (reka-ui/radix-vue based) + Tailwind CSS v3  
**Rationale:** shadcn-vue is the Vue port of shadcn/ui, directly matching the spec requirement. Tailwind v3 (not v4) required — shadcn-vue 2.x is incompatible with Tailwind v4's CSS-first config approach.

---

## 2026-04-10 — Form Validation
**Decision:** Zod `safeParse` per-component (no VeeValidate plugin overhead)  
**Rationale:** Keeps validation co-located with the form. Zod error issues map directly to field path keys for inline display. VeeValidate adds integration complexity without benefit at this scale.

---

## 2026-04-10 — Shared Status Constants
**Decision:** `TERMINAL_STATUSES` and `ALL_STATUSES` exported from `packages/types`, used by both API and frontend  
**Rationale:** API uses `TERMINAL_STATUSES` for the edit guard (400 response). Frontend uses it to disable the edit button. `ALL_STATUSES` used in the Zod enum validator and the Status `<Select>` dropdown. Single source of truth prevents hardcoding.

---

## 2026-04-10 — Date Picker (Past Date Prevention)
**Decision:** shadcn-vue `Calendar` with `:min-value` (CalendarDate from @internationalized/date) instead of a `:disabled` function  
**Rationale:** The shadcn-vue Calendar component (backed by reka-ui's `CalendarRoot`) uses `DateValue` from `@internationalized/date`, not JS `Date`. The `minValue` prop is the correct API for blocking past dates — cleaner than a custom `Matcher` function.

---

## 2026-04-10 — Prisma Setup
**Decision:** Prisma schema committed, `prisma generate` run with test credentials; migration deferred  
**Rationale:** Real Supabase credentials must be set by the deployer. The schema is complete and syntactically valid. Run `prisma migrate dev` once `DATABASE_URL` and `DIRECT_URL` are configured in `.env`.

---

## 2026-04-10 — Label Component
**Decision:** `Label` installed separately via `npx shadcn-vue@latest add label`  
**Rationale:** shadcn-vue 2.5.x init does not include Label in the default component set. Required by form fields; added explicitly.

---

## 2026-04-10 — Prisma 7 Upgrade
**Decision:** Migrated `apps/api` from Prisma 5 to Prisma 7 with driver adapter pattern  
**Rationale:** Prisma 7 is ESM-only and requires significant structural changes:
- `"type": "module"` added to `apps/api/package.json`; `tsconfig.json` switched to `"module": "ESNext"` + `"moduleResolution": "bundler"`
- Generator provider changed from `prisma-client-js` to `prisma-client` with explicit `output = "../src/generated/prisma"`
- Connection strings (`url`, `directUrl`) removed from `schema.prisma` — Prisma 7 no longer supports them there; moved to `prisma.config.ts` under the `migrate.adapter` factory using `@prisma/adapter-pg`
- Runtime `PrismaClient` instantiation in `src/plugins/prisma.ts` now passes a `PrismaPg` adapter constructed from `DATABASE_URL`
- Import path in plugin and tests updated to `../generated/prisma/client.js` (Prisma 7 generates `client.ts` instead of an `index` barrel)
- `pnpm-workspace.yaml` updated with `onlyBuiltDependencies` to allow `@prisma/engines` and `prisma` postinstall scripts
- All 8 tests continue to pass after the migration

---

## 2026-04-12 — Prisma 7 `prisma.config.ts` correction: datasource.url and adapter placement
**Decision:** Removed the invalid `migrate.adapter` key from `prisma.config.ts`; added `datasource.url`; kept adapter only in `PrismaClient` constructor  
**Rationale:** Running `prisma migrate dev` raised "Error: The datasource.url property is required in your Prisma config file". Investigation of `@prisma/config`'s `PrismaConfig` type revealed two errors in the initial `prisma.config.ts`:
1. `migrate.adapter` — the `PrismaConfig` type has no `migrate` key (only `migrations` for path configuration). Adapters are not accepted in the config file at all; they belong exclusively in `new PrismaClient({ adapter })` at runtime.
2. `earlyAccess: true` — not a valid `PrismaConfig` field; removed.  
The fix adds `datasource.url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? ''` at the top level of `defineConfig`. `DIRECT_URL` (non-pooled, port 5432) is used for migrations; the fallback to `DATABASE_URL` handles single-connection setups. `process.env` is used directly instead of the `env()` helper because `env()` throws eagerly — which breaks `prisma generate` in environments where the variable is not set (CI, local without .env).
