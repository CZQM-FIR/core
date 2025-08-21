# CZQM Core - AI Coding Assistant Instructions

## Project Overview

CZQM Core is a virtual Air Traffic Control FIR (Flight Information Region) management system built as a **Turborepo monorepo** with three main applications:

- **Web** (`apps/web`) - Main website (https://czqm.ca) - SvelteKit + DaisyUI
- **Overseer** (`apps/overseer`) - Admin interface (https://overseer.czqm.ca) - SvelteKit + DaisyUI
- **Worker** (`apps/worker`) - Cloudflare Worker for cron jobs (Discord sync, session recording, VATCAN data pulls)

## Architecture & Tech Stack

- **Frontend**: Svelte 5 + SvelteKit + TailwindCSS + DaisyUI
- **Database**: Turso (SQLite) via DrizzleORM with shared schema package (`@czqm/db`)
- **Auth**: Custom session-based auth with Oslo crypto (see `apps/web/src/lib/auth.ts`)
- **Deployment**: Cloudflare Pages + Workers
- **Package Manager**: pnpm with workspace support

### Technology References

- **Svelte + SvelteKit**: https://svelte.dev/llms.txt
- **DaisyUI**: https://daisyui.com/llms.txt

## Key Development Patterns

### Database Schema & Queries

- Centralized schema in `packages/db/src/schema/` - each table in separate file
- Use DrizzleORM relations extensively: `export const usersRelations = relations(users, ({ one, many }) => ({...}))`
- All apps import schema as: `import { users, type User } from '@czqm/db/schema'`
- Database client setup in each app's `src/lib/db.ts` using Turso client

### SvelteKit Conventions

- **Route handlers**: Always use `satisfies PageServerLoad` or `satisfies LayoutServerLoad`
- **Auth pattern**: Access user via `locals.user` and `locals.session` (set in `hooks.server.ts`)
- **Type safety**: Import generated types as `import type { PageData } from './$types'`
- **Props**: Use Svelte 5 runes syntax: `let { data }: { data: PageData } = $props()`

### Shared Database Package

- Run migrations: `pnpm db:migrate` (from any app directory)
- Generate schema: `pnpm db:generate`
- Database studio: `pnpm db:studio`
- Schema changes require regeneration in `packages/db` then apps pick up automatically

### Authentication Flow

1. Sessions stored in `authSessions` table with 30-day expiry + 15-day refresh window
2. Session tokens are base32-encoded, hashed with SHA256 for storage
3. Session validation in `hooks.server.ts` runs on every request
4. Cross-subdomain cookies with domain `.czqm.ca`

## Development Workflow

### Commands (from repo root)

- `pnpm dev` - Start all apps in development
- `pnpm build` - Build all apps
- `pnpm lint` / `pnpm lint:fix` - Lint with Prettier + ESLint

### Individual App Commands

```bash
cd apps/web  # or apps/overseer
pnpm dev                 # Start dev server
pnpm preview            # Preview production build locally
pnpm deploy             # Deploy to Cloudflare Pages
pnpm cf-typegen         # Generate Cloudflare Worker types
```

### Worker Deployment

```bash
cd apps/worker
pnpm deploy  # Deploys to Cloudflare Workers with cron triggers
```

## Important File Patterns

### Route Structure

- `+page.server.ts` - Server-side data loading
- `+layout.server.ts` - Layout-level data (user auth typically)
- `+page.svelte` - Page component
- Protected routes check `locals.user` in server load functions

### Database Utilities

- Helper functions in `apps/web/src/lib/utilities/` (e.g., `getUser.ts`, `getNews.ts`)
- Always use parameterized queries with DrizzleORM
- Index foreign keys and frequently queried columns

### Environment Variables

- `TURSO_URL` and `TURSO_TOKEN` required for database access
- Development uses `TURSO_URL` only (no auth token needed)
- Apps use `$env/dynamic/private` for runtime environment access

## Cloudflare Integration

- **R2 Storage**: Bound as `bucket` in `app.d.ts` Platform interface
- **Worker Cron**: Multiple schedules in `apps/worker/src/index.ts`
  - `*/2 * * * *` - Discord sync
  - `*/15 * * * *` - VATCAN data pull
  - `0 0 * * *` - Recurring events
- **Pages deployment**: Uses `.svelte-kit/cloudflare` build output

## Testing & Validation

- Type checking: `pnpm check-types`
- No unit tests currently - validation through TypeScript + lint
- Test deployments use preview commands before production deploy

When working on this codebase:

1. Always import types from schema package for database models
2. Use the established auth patterns via `locals`
3. Follow SvelteKit file-based routing conventions
4. Run database migrations after schema changes
5. Prefer utility functions in `lib/utilities/` for reusable data fetching
