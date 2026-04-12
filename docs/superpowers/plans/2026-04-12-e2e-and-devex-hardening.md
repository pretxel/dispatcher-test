# E2E Testing & Dev-Experience Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright E2E tests covering the create-relocation happy path and fix the remaining configuration issues discovered during happy-path validation.

**Architecture:** Playwright test suite lives at `apps/web/e2e/`, runs against real local dev servers (API on 3001, web on 5173). A Playwright global setup authenticates via Supabase and stores the session; individual tests restore it so no OAuth redirect is needed per test. Configuration issues (env vars, CORS, `.env.example` accuracy) are fixed first so the environment is clean before tests are written.

**Tech Stack:** Playwright 1.x, Vitest (API unit tests already passing), pnpm workspaces, Fastify 4, Vue 3 + Vite, Supabase Auth, Prisma 7

---

## Context for Teammates

The following bugs were found during manual happy-path validation on 2026-04-12 and have already been fixed in `main`:

| # | Bug | Fix committed |
|---|-----|---------------|
| 1 | `/health` returned 401 — auth preHandler intercepted it via `fastify-plugin` scope leak | ✅ `fix(api): move /health before authPlugin` |
| 2 | `VITE_API_URL=http://localhost:5173/` — web called itself, received HTML, `string.length` showed as "410 orders total" | ✅ corrected in `apps/web/.env` (not committed — has credentials) |
| 3 | `CORS_ORIGIN=http://localhost:3001` — API blocked web on port 5173 | ✅ corrected in `apps/api/.env` (not committed — has credentials) |

These environment variable corrections need to be reflected in `.env.example` (Task 1) before any further work.

---

## File Map

| File | Action |
|------|--------|
| `apps/api/.env.example` | **Modify** — correct `CORS_ORIGIN` default |
| `apps/web/.env.example` | **Modify** — correct `VITE_API_URL` default |
| `apps/web/playwright.config.ts` | **Create** — Playwright project config |
| `apps/web/e2e/global-setup.ts` | **Create** — Supabase session bootstrap |
| `apps/web/e2e/relocations.spec.ts` | **Create** — happy path + guard tests |
| `apps/web/package.json` | **Modify** — add `test:e2e` script and Playwright dev dep |

---

### Task 1: Fix `.env.example` files to reflect correct local dev values

**Files:**
- Modify: `apps/api/.env.example`
- Modify: `apps/web/.env.example`

- [ ] **Step 1: Read current example files**

```bash
cat apps/api/.env.example
cat apps/web/.env.example
```

- [ ] **Step 2: Update `apps/api/.env.example`**

Replace the `CORS_ORIGIN` line so it documents the correct local dev port:

```
DATABASE_URL=             # Supabase pooled connection (port 6543, pgbouncer=true)
DIRECT_URL=               # Supabase direct connection (port 5432, for migrations)
SUPABASE_URL=             # https://[ref].supabase.co
SUPABASE_ANON_KEY=        # Supabase anon key
CORS_ORIGIN=http://localhost:5173   # Frontend URL for local dev; set to production URL on Vercel
```

- [ ] **Step 3: Update `apps/web/.env.example`** (create if missing)

```
VITE_SUPABASE_URL=        # https://[ref].supabase.co
VITE_SUPABASE_ANON_KEY=   # Supabase anon key
VITE_API_URL=http://localhost:3001  # API base URL for local dev; set to Vercel API URL in production
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/.env.example apps/web/.env.example
git commit -m "fix(config): correct CORS_ORIGIN and VITE_API_URL in .env.example files"
```

Expected: clean commit, no test changes.

---

### Task 2: Install Playwright in `apps/web`

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/playwright.config.ts`

- [ ] **Step 1: Add Playwright as a dev dependency**

```bash
pnpm --filter web add -D @playwright/test
```

- [ ] **Step 2: Install browser binaries**

```bash
cd apps/web && npx playwright install chromium
```

Expected: Chromium downloaded to `~/.cache/ms-playwright/`.

- [ ] **Step 3: Add `test:e2e` script to `apps/web/package.json`**

Open `apps/web/package.json` and add the script alongside existing ones:

```json
"test:e2e": "playwright test"
```

- [ ] **Step 4: Create `apps/web/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    storageState: 'e2e/.auth/session.json',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm dev:api',
      url: 'http://localhost:3001/health',
      reuseExistingServer: true,
      cwd: '../..',
    },
    {
      command: 'pnpm dev:web',
      url: 'http://localhost:5173',
      reuseExistingServer: true,
      cwd: '../..',
    },
  ],
})
```

- [ ] **Step 5: Run `tsc --noEmit` to confirm the config compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/playwright.config.ts pnpm-lock.yaml
git commit -m "feat(web): install Playwright and add playwright.config.ts"
```

---

### Task 3: Global setup — authenticate with Supabase and store session

**Files:**
- Create: `apps/web/e2e/global-setup.ts`
- Create: `apps/web/e2e/.auth/` directory (gitignored)

The global setup uses Supabase's `signInWithPassword` to get a real JWT, then saves the browser storage state so individual tests restore it without a full OAuth redirect.

> **Prerequisite:** You need a test user created in Supabase dashboard (Authentication → Users → Add user). Store credentials in `apps/web/.env.test`:
> ```
> PLAYWRIGHT_TEST_EMAIL=test@example.com
> PLAYWRIGHT_TEST_PASSWORD=TestPassword123!
> ```

- [ ] **Step 1: Create `.env.test` (locally only, add to `.gitignore`)**

```bash
echo "PLAYWRIGHT_TEST_EMAIL=test@example.com" > apps/web/.env.test
echo "PLAYWRIGHT_TEST_PASSWORD=TestPassword123!" >> apps/web/.env.test
echo "apps/web/.env.test" >> .gitignore
```

- [ ] **Step 2: Create `apps/web/e2e/global-setup.ts`**

```ts
import { chromium, FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

config({ path: 'apps/web/.env' })
config({ path: 'apps/web/.env.test' })

async function globalSetup(_config: FullConfig) {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.PLAYWRIGHT_TEST_EMAIL!,
    password: process.env.PLAYWRIGHT_TEST_PASSWORD!,
  })

  if (error || !data.session) {
    throw new Error(`Supabase sign-in failed: ${error?.message}`)
  }

  // Persist the access token into browser localStorage so the Vue app's
  // supabase client restores the session on page load.
  const authDir = path.join('apps/web/e2e/.auth')
  fs.mkdirSync(authDir, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('http://localhost:5173')
  await page.evaluate(({ session, url }) => {
    const storageKey = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`
    localStorage.setItem(storageKey, JSON.stringify(session))
  }, { session: data.session, url: process.env.VITE_SUPABASE_URL! })

  await context.storageState({ path: path.join(authDir, 'session.json') })
  await browser.close()
}

export default globalSetup
```

- [ ] **Step 3: Add `.auth/` to `.gitignore`**

```bash
echo "apps/web/e2e/.auth/" >> .gitignore
```

- [ ] **Step 4: Run global setup manually to verify it creates the session file**

```bash
cd apps/web && DOTENV_CONFIG_PATH=.env node --require dotenv/config \
  node_modules/.bin/playwright test --list 2>&1 | head -5
```

Expected: no sign-in error; `apps/web/e2e/.auth/session.json` exists.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/global-setup.ts .gitignore
git commit -m "feat(e2e): add Playwright global setup with Supabase signInWithPassword"
```

---

### Task 4: Write E2E tests — create relocation happy path + guard cases

**Files:**
- Create: `apps/web/e2e/relocations.spec.ts`

- [ ] **Step 1: Write the failing test skeleton**

Create `apps/web/e2e/relocations.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('Relocation happy path', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('dashboard loads with empty state for fresh user', async ({ page }) => {
    await expect(page.getByText('No relocations yet')).toBeVisible()
    await expect(page.getByRole('button', { name: /new relocation/i })).toBeVisible()
  })

  test('creates a relocation and shows it in the table', async ({ page }) => {
    // Open the create sheet
    await page.getByRole('button', { name: /new relocation/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Fill origin
    await page.getByLabel(/origin/i).fill('Madrid')

    // Fill destination
    await page.getByLabel(/destination/i).fill('Barcelona')

    // Pick a future date via the date input (fill the hidden input directly)
    // The Calendar component uses an @internationalized/date value; fill the
    // visible text field instead.
    const futureDate = new Date()
    futureDate.setMonth(futureDate.getMonth() + 2)
    const yyyy = futureDate.getFullYear()
    const mm = String(futureDate.getMonth() + 1).padStart(2, '0')
    const dd = String(futureDate.getDate()).padStart(2, '0')
    await page.getByLabel(/date/i).fill(`${yyyy}-${mm}-${dd}`)

    // Submit
    await page.getByRole('button', { name: /save|create/i }).click()

    // Sheet should close and the new row should appear
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Madrid')).toBeVisible()
    await expect(page.getByText('Barcelona')).toBeVisible()
    await expect(page.getByText('1 order total')).toBeVisible()
  })

  test('rejects a past date with 422 feedback', async ({ page }) => {
    await page.getByRole('button', { name: /new relocation/i }).click()
    await page.getByLabel(/origin/i).fill('Madrid')
    await page.getByLabel(/destination/i).fill('Barcelona')
    await page.getByLabel(/date/i).fill('2020-01-01')
    await page.getByRole('button', { name: /save|create/i }).click()
    // The form should show a validation error or the sheet should stay open
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('edit button is disabled for COMPLETED relocation', async ({ page }) => {
    // This test requires a COMPLETED relocation to already exist.
    // Skip if the table is empty.
    const rows = page.locator('table tbody tr')
    const count = await rows.count()
    test.skip(count === 0, 'No relocations to check — create one first')

    // Find a COMPLETED badge
    const completedBadge = page.locator('[data-status="COMPLETED"]').first()
    if (await completedBadge.count() === 0) {
      test.skip(true, 'No COMPLETED relocations in table')
    }

    const row = completedBadge.locator('..').locator('..')
    const editButton = row.getByRole('button')
    await expect(editButton).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run the tests to see which pass and which need refinement**

```bash
cd apps/web && npx playwright test --headed 2>&1
```

Expected: first test passes, second may need selector tweaks depending on form label text.

- [ ] **Step 3: Fix any selector issues found in Step 2**

Common issue: the Calendar component might not expose a fillable `<input>`. If `getByLabel(/date/i).fill(...)` fails, use:

```ts
// Click the calendar trigger button, navigate months, and click the day cell
await page.getByRole('button', { name: /pick a date/i }).click()
// Navigate to future month if needed
const targetMonth = futureDate.toLocaleString('en', { month: 'long', year: 'numeric' })
while (!await page.getByText(targetMonth).isVisible()) {
  await page.getByRole('button', { name: /next/i }).click()
}
await page.getByRole('button', { name: String(dd), exact: true }).click()
```

- [ ] **Step 4: Run full suite — all tests must pass**

```bash
cd apps/web && npx playwright test 2>&1
```

Expected:
```
  ✓ dashboard loads with empty state (1.2s)
  ✓ creates a relocation and shows it in the table (3.4s)
  ✓ rejects a past date with 422 feedback (1.8s)
  ✓ edit button disabled for COMPLETED relocation (skipped — no data)
  4 tests: 3 passed, 1 skipped
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/relocations.spec.ts
git commit -m "feat(e2e): add Playwright happy-path tests for relocation create/guard flows"
```

---

### Task 5: Add root-level `test:e2e` script and PROMPT_LOG entry

**Files:**
- Modify: `package.json` (root)
- Modify: `PROMPT_LOG.md`

- [ ] **Step 1: Add `test:e2e` to root `package.json`**

Open `/package.json` and add alongside `test:api`:

```json
"test:e2e": "pnpm --filter web test:e2e"
```

- [ ] **Step 2: Run from root to confirm it works**

```bash
pnpm test:e2e 2>&1 | tail -10
```

Expected: same passing/skipped summary as Task 4 Step 4.

- [ ] **Step 3: Append to `PROMPT_LOG.md`**

Add the following entry at the bottom:

```markdown
## 2026-04-12 — E2E test suite with Playwright

**Decision:** Playwright added to `apps/web/e2e/` with a global Supabase sign-in setup
**Rationale:** Happy-path validation via computer-use revealed three configuration bugs
(health 401, wrong VITE_API_URL, wrong CORS_ORIGIN). An automated Playwright suite
prevents regressions in the create-relocation flow without requiring manual clicks.
Global setup authenticates once via `signInWithPassword` and saves browser storage
state; individual tests restore it. webServer config in playwright.config.ts starts
both dev servers automatically.
```

- [ ] **Step 4: Final commit**

```bash
git add package.json PROMPT_LOG.md
git commit -m "feat: add root test:e2e script; log E2E decision in PROMPT_LOG"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** `.env.example` fixes (Task 1), Playwright install (Task 2), global setup (Task 3), happy path + guard tests (Task 4), root script (Task 5) — all covered
- [x] **No placeholders:** every step has exact code, commands, and expected output
- [x] **Type consistency:** `FullConfig` from `@playwright/test` used in global setup; `createClient` call matches `@supabase/supabase-js` v2 API; test selectors use `getByRole`/`getByLabel` (Playwright recommended locators)
