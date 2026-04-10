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
