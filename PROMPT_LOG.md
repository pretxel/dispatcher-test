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

---

## 2026-04-12 — API server not loading `.env` after ESM migration
**Decision:** Added `import 'dotenv/config'` as the first import in `src/server.ts`  
**Rationale:** After the Prisma 7 migration added `"type": "module"` to `apps/api`, running `dev:api` raised `"supabaseUrl is required."` — `SUPABASE_URL` was `undefined` at runtime despite being present in `.env`. The root cause: `tsx` does not auto-load `.env` files, so `process.env` never received the variables before `authPlugin` called `createClient(process.env.SUPABASE_URL!, ...)`. Using `import 'dotenv/config'` as the first statement in `server.ts` is the ESM-safe side-effect import that loads `.env` before any other module initialises. `dotenv` was already a dev dependency (added for `prisma.config.ts`), so no new package was needed.

---

## 2026-04-12 — `@flovi/types` missing `"type": "module"` after Prisma 7 ESM migration
**Decision:** Added `"type": "module"` to `packages/types/package.json`  
**Rationale:** Adding `"type": "module"` to `apps/api` (required by Prisma 7) caused `dev:api` to fail with `SyntaxError: The requested module '@flovi/types' does not provide an export`. The types package `tsconfig.json` already compiled to ESM (`export const …`) but without `"type": "module"` in its `package.json`, Node.js treated the `.js` output as CommonJS. The ESM API tried to import it as ESM and found no named exports. Adding `"type": "module"` to `packages/types` aligns its runtime module format with the compiled output. No code changes required — the existing `dist/index.js` is already valid ESM. Web build and API tests continue to pass after the fix.

---

## 2026-04-12 — Happy-path validation via computer use: three config bugs found and fixed
**Decision:** Corrected `VITE_API_URL`, `CORS_ORIGIN`, and the `/health` auth bypass in a single validation session  
**Rationale:** Running computer-use against the live dev environment (`localhost:5173`) exposed three bugs that had not been caught by unit tests (which mock the API):

1. **`VITE_API_URL=http://localhost:5173/` (apps/web/.env)** — the web app was calling its own Vite dev server instead of the API on port 3001. Vite serves `index.html` for unknown routes; axios received an HTML string, `relocations.value` was set to that string, and `string.length` rendered as "410 orders total" in the dashboard header with an empty table (Vue iterated over HTML characters, each without the expected relocation properties). Fixed to `http://localhost:3001`.

2. **`CORS_ORIGIN=http://localhost:3001` (apps/api/.env)** — the API's CORS allowed only its own port. Requests from the web app on port 5173 were blocked by the browser, producing a generic "Failed to load relocations" error banner. Fixed to `http://localhost:5173`.

3. **`/health` returned 401** — `fastify-plugin` (`fp`) intentionally removes plugin encapsulation, causing `authPlugin`'s `preHandler` hook to leak into the parent scope and intercept all routes including `/health`. Two-part fix: (a) move `app.get('/health')` before `app.register(authPlugin)` as documentation of intent; (b) add `if (request.url === '/health') return` inside the hook as the actual runtime guard, since registration order alone cannot override `fp` scope.

All three fixes committed to `main`. A Playwright E2E plan was created at `docs/superpowers/plans/2026-04-12-e2e-and-devex-hardening.md` to automate happy-path regression testing so these classes of issues are caught before manual validation.

---

## 2026-04-12 — API migrated to Supabase Edge Function
**Decision:** Rewrote the API as a single Supabase Edge Function (`supabase/functions/api/index.ts`) replacing the Fastify + Vercel serverless deployment  
**Rationale:** The Vercel serverless API had deep compatibility issues — `@vercel/node` with `"type": "module"` cannot use `ncc` bundling, so `@vercel/nft` traces imports that lack `.js` extensions, skipping entire `src/` trees. Supabase Edge Functions (Deno runtime) eliminate the Node.js/ESM bundling problem entirely and co-locate the API with the database.  
Key design choices:
- **No Prisma**: replaced with `@supabase/supabase-js` PostgREST client — the `Relocation` table already exists from the Prisma migration, so querying it directly via supabase-js is simpler than running the Prisma driver adapter in Deno.
- **Service-role client for DB**: bypasses RLS and filters by `userId` manually (mirrors the existing Fastify implementation). Future improvement: enable RLS with `auth.uid()` policies and use the user's JWT for DB calls.
- **`verify_jwt: false`**: the function implements its own auth via `supabase.auth.getUser(token)`, which also allows `/health` to bypass auth.
- **`id` generation**: `crypto.randomUUID()` (Deno built-in) replaces Prisma's `cuid()` since supabase-js doesn't generate IDs client-side.
- **`createdAt`** omitted from inserts — Postgres `DEFAULT CURRENT_TIMESTAMP` handles it. `updatedAt` is set manually on every write.
- **CORS**: controlled via `CORS_ORIGIN` env var, falls back to `*`.
- **Route matching**: `pathname.endsWith('/v1/relocations')` handles both local (`/functions/v1/api/v1/relocations`) and direct invocation paths without hardcoding the Supabase prefix.  
Production `VITE_API_URL` = `https://vfmtrozkajbwaxdgdmys.supabase.co/functions/v1`. Local dev still uses Fastify on `http://localhost:3001`.

---

## 2026-04-12 — Vercel build failure: `@flovi/types` not found (TS2307)
**Decision:** Prepend `pnpm --filter @flovi/types build &&` to the `build` script in both `apps/web` and `apps/api`  
**Rationale:** Vercel clones a fresh repo — `packages/types/dist/` is gitignored and therefore absent. Both apps resolve `@flovi/types` via the pnpm workspace symlink, but `packages/types/package.json` points `main` and `types` at `./dist/index.js` / `./dist/index.d.ts`. TypeScript cannot find the declarations at build time, producing `TS2307: Cannot find module '@flovi/types'`. Prepending the filter build to each app's build script ensures the types package compiles first, creating `dist/` before `tsc` runs. No changes to `packages/types` itself were needed — its existing `"build": "tsc"` script is sufficient.

---

## 2026-04-12 — Full-stack validation: Prisma 7 stricter enum types in update input
**Decision:** Import `RelocationStatus` from the generated Prisma client and cast the `status` field explicitly in `relocation.update()`  
**Rationale:** Running `tsc` (API build) after the Prisma 7 migration surfaced a type error in `src/routes/relocations.ts`: Prisma 7 generates a stricter `RelocationUpdateInput` type where `status` must be `RelocationStatus | EnumRelocationStatusFieldUpdateOperationsInput | undefined` — a plain `string` is rejected. The fix destructures `status` from the validated payload and re-spreads it as `status as RelocationStatus`, which is safe because the Zod `updateSchema` already validates the value against `ALL_STATUSES`. The `prisma.config.ts` was also updated by the developer to load env vars via `dotenv` (`.env.local` → `.env` cascade) rather than the raw `process.env` fallback chain, aligning with Next.js/Vite local development conventions. After the fix: API TypeScript build clean, 8/8 tests pass, web production build clean (2 398 modules, no warnings).
