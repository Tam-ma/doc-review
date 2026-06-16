# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@tamma/doc-review` — a collaborative documentation review platform. Teams comment on, discuss, and suggest edits to Markdown docs that live in a **Git repository** (not in this app's database). It runs SSR on **Cloudflare Pages** using **React Router v7** (framework mode), with **D1** (SQLite) + **Drizzle ORM** for review metadata, a **Durable Object** for realtime, **KV** for caching, and **R2** for attachments. Package manager is **pnpm**; Node >= 22.

## Commands

```bash
pnpm dev                 # local dev (react-router/vite) on port 6700 (override with PORT)
pnpm build               # production build -> build/client + build/server
pnpm preview             # serve the built app via wrangler pages dev (E2E targets port 6701)
pnpm typecheck           # tsc --noEmit — BLOCKS CI, run before committing
pnpm lint                # eslint . --ext .ts,.tsx  (CI runs this continue-on-error)
pnpm format              # prettier --write

# Tests (Vitest, node environment)
pnpm test                # watch mode
pnpm test:run            # single run of all unit/integration tests — what CI runs
pnpm test:coverage       # run with v8 coverage (thresholds enforced, see below)
pnpm exec vitest run app/lib/auth/permissions.test.ts   # run ONE test file
pnpm exec vitest run -t "creates a comment"             # run tests matching a name

# E2E (Playwright) — needs a running server (pnpm preview) + seeded local D1
pnpm test:e2e            # all browsers; :chromium / :firefox / :webkit for one
pnpm playwright:install  # install browsers (first time)

# Database (local D1 lives in .wrangler/)
pnpm db:generate         # generate a Drizzle migration from app/lib/db/schema.ts
pnpm db:migrate:local    # apply migrations to local D1
pnpm db:seed             # seed local D1
pnpm db:reset            # migrate:local + seed (do this before running the app locally)
pnpm db:studio           # Drizzle Studio
```

> Note: the `test:unit` / `test:integration` scripts pass `--grep`, which is not a Vitest CLI flag (Vitest filters by test name with `-t` / `--testNamePattern`), so they don't filter the way their names suggest — use the `vitest run -t` form above instead.

## Architecture

### Request lifecycle & the env/binding idiom (most important)
Cloudflare bindings are not globals — they arrive per-request on the loader/action `context`. Every server handler starts by extracting them:

```ts
const env = context.env ?? context.cloudflare?.env ?? {};
```

`env` carries `DB`, `CACHE`, `STORAGE`, `EVENT_BROADCASTER`, and all `vars`/secrets. Always derive `env` this way; never reach for `process.env` for bindings. DB access is `getDb(env)` (returns a Drizzle D1 instance); guard with `hasDatabase(env)` and degrade gracefully when the binding is absent (routes return a "Database not configured" response rather than throwing).

### Server-only code & imports
- Files ending in `.server.ts` / `.server.tsx` are server-only (stripped from the client bundle). Keep DB, auth, secrets, and Node APIs there.
- Import alias `~` → `app/` (configured in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts` — update all three if changed).

### Routing — explicit config, not file-based
Routes are declared in `app/routes.ts` via the `@react-router/dev/routes` API (`index()` / `route()`). **Creating a file under `app/routes/` does nothing until you register it in `app/routes.ts`.** Many route files currently exist but are NOT registered (e.g. `admin.*`, `webhooks.github`/`webhooks.gitlab`, `api.events`, `api.search*`, `health`, `unsubscribe.*`, and several `api.*.$id` detail routes). If a route "isn't working," check registration first.

### Auth & RBAC
OAuth via the Git provider (GitHub/GitLab) → signed session cookie (`app/lib/auth/session.server.ts`). Roles are **viewer / reviewer / admin** (`role` column defaults to `viewer`). Protect handlers with helpers from `app/lib/auth/middleware.ts`:
- `requireAuthWithRole(request, context)` — throws a redirect/Response if unauthenticated; returns the user with DB-resolved role.
- `requireRole(role)`, `requirePermission(permission)`, `protectedLoader`/`protectedAction`, `requireResourceOwnership`, `requireDeletePermission`.
- Permissions/role logic and `Permission`/`Role` enums live in `app/lib/auth/permissions.ts`.
On first write, `syncUserRecord(env, user)` upserts the session user into the `users` table.

### Git provider abstraction
`getGitProvider(env)` (`app/lib/git/provider.server.ts`) returns a `GitProvider` by `GIT_PROVIDER` (`github` → `GitHubProvider`, default `stub`). This is how docs are fetched and how suggestions are meant to become branches/PRs. Document *content* is loaded by `app/lib/docs/loader.server.ts`, which has two paths: local filesystem via `REPO_PATH` (Node/dev) and the Git API (production), with KV caching.

### Realtime (Durable Object + SSE)
`EventBroadcaster` (`app/lib/events/event-broadcaster.ts`) is a Durable Object that holds SSE connections in memory and fans out events (`/sse`, `/publish`, `/recent`). It's exported from the worker entry (`app/worker.ts`) and bound as `EVENT_BROADCASTER`. Server code publishes via helpers in `app/lib/events/publisher.server.ts` (e.g. `publishCommentEvent(context, ...)`); the client subscribes with the `useRealtimeEvents` hook.

### Data model (Drizzle, `app/lib/db/schema.ts`)
Core tables: `users`, `reviewSessions`, `comments`, `suggestions`, `discussions`, `discussionMessages`, `documentMetadata`, `activityLog`, plus email (`emailQueue`, `emailLog`), `notificationPreferences`, `documentWatches`. Conventions:
- **IDs** are text (`crypto.randomUUID()` / nanoid). **Timestamps** are integer epoch-millis (`Date.now()`, `mode: 'number'`), not SQL dates.
- **Soft deletes** via `deletedAt`; list queries filter `isNull(...deletedAt)` unless `includeDeleted` is requested.
- Documents are referenced by `docPath` (a path in the Git repo), not a DB foreign key.

### Migrations
`db/migrations/` holds both Drizzle-generated migrations (tracked in `meta/_journal.json`) and **hand-written** SQL (e.g. the `0002_*` FTS5 / email / webhook files, and `db/schema.sql`). Because of the hand-written files the `0002_` prefix is duplicated — keep this in mind when adding migrations; generating via `db:generate` only manages the journal-tracked subset.

### Email
Outbound mail is queue-based: write to `emailQueue`, then a processor sends via **Resend**. Templates are React Email components in `app/lib/email/templates/`.

### Worker entry points
- `app/worker.ts` — the active Pages handler (`createPagesFunctionHandler`) and the export point for the `EventBroadcaster` DO. Used by `wrangler.jsonc` (`pages_build_output_dir`).
- `workers/index.ts` — an alternate plain-Worker handler (`@ts-nocheck`); not the Pages path.

## Testing notes
- **Two Vitest configs exist and conflict**: `vitest.config.ts` (environment `node`, the one that applies to `pnpm test`) vs. the `test` block in `vite.config.ts` (`happy-dom`). Edit `vitest.config.ts` for test behavior.
- Tests are `app/**/*.test.ts(x)`; setup in `app/test/setup.ts`; shared fixtures/helpers in `app/test/helpers/` (`db-helpers`, `auth-helpers`, `fixtures`, `request-helpers`).
- Coverage thresholds (enforced by `test:coverage`): lines 80 / functions 75 / branches 75 / statements 80, scoped to `app/routes/api.*` and `app/lib/**`.

## CI / deploy
`.github/workflows/deploy.yml` runs on push to `main`: **test** (`typecheck` → `lint` [non-blocking] → `test:run`) → **e2e** (build, local D1 migrate+seed, `pnpm preview`, Playwright on `:6701`/`/health`) → **build** → **deploy** (`wrangler pages deploy` to project `tamma-doc-review`, applying remote D1 migrations if pending) → **smoke-test**. `typecheck` and `test:run` block merges; `lint` does not. Secrets are set with `wrangler pages secret put ...`; bindings/IDs live in `wrangler.jsonc` / `wrangler.production.jsonc` (see `.env.example` for the full config surface).

## Reference docs
`docs/history/` contains design/implementation write-ups. Treat them as **historical** — some predate the current code (e.g. they mention `wrangler.toml` and Cloudflare Access, whereas the app now uses `wrangler.jsonc` and OAuth). Trust the source over these.
