# CZQM Core - AI Coding Assistant Instructions

## Project Overview

CZQM Core is a virtual Air Traffic Control FIR (Flight Information Region) management system built as a **Turborepo monorepo** with four main applications:

- **Web** (`apps/web`) - Main website (https://czqm.ca) - SvelteKit + DaisyUI
- **Overseer** (`apps/overseer`) - Admin interface (https://overseer.czqm.ca) - SvelteKit + DaisyUI
- **Vector** (`apps/vector`) - Vector graphics and charting application - SvelteKit + DaisyUI
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
cd apps/web  # or apps/overseer or apps/vector
pnpm dev                 # Start dev server
pnpm preview            # Preview production build locally
pnpm deploy             # Deploy to Cloudflare Pages
pnpm cf-typegen         # Generate Cloudflare Worker types
pnpm check              # Type check the application
```

### Worker Deployment

```bash
cd apps/worker
pnpm deploy  # Deploys to Cloudflare Workers with cron triggers
```

### Checking Your Work

Before committing changes:
1. Run `pnpm lint` to check code style
2. Run `pnpm lint:fix` to automatically fix linting issues
3. Run `pnpm check` to type-check all applications
4. Build the affected apps to ensure no runtime errors

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

- Type checking: `pnpm check` (runs for all apps in the monorepo)
- No unit tests currently - validation through TypeScript + lint
- Test deployments use preview commands before production deploy

## Code Style & Formatting

### Prettier Configuration
- 2 spaces (no tabs)
- Single quotes for strings
- No trailing commas
- 100 character line width
- TailwindCSS class sorting enabled
- Svelte-specific formatting rules

### ESLint Rules
- TypeScript recommended rules enabled
- Svelte recommended rules enabled
- `@typescript-eslint/no-explicit-any`: off (use sparingly)
- `no-empty-pattern`: off

### Naming Conventions
- Files: Use kebab-case for route files (`+page.server.ts`), camelCase for utilities
- Variables: camelCase
- Types/Interfaces: PascalCase
- Database tables: camelCase (e.g., `authSessions`, `usersToFlags`)

## Security Best Practices

### Authentication & Authorization
- Never expose session tokens in logs or error messages
- Always validate user permissions in server-side load functions
- Use `locals.user` and `locals.session` for authentication checks
- Session tokens are hashed with SHA256 before storage
- Cross-site cookies use `.czqm.ca` domain with proper security flags

### Database Security
- Always use parameterized queries via DrizzleORM (never string concatenation)
- Validate and sanitize all user inputs before database operations
- Use DrizzleORM's type-safe query builders to prevent SQL injection
- Don't expose sensitive data in API responses (filter before returning)

### Environment Variables
- Never commit `.env` files or secrets to the repository
- Use `$env/dynamic/private` for server-side secrets
- Use `$env/dynamic/public` only for public configuration
- Document required environment variables in `.env.example` files

### Input Validation
- Validate all form inputs on the server side
- Sanitize user-generated content before display
- Use proper content-type headers
- Implement rate limiting for API endpoints where appropriate

## Error Handling Patterns

### Server-Side Errors
```typescript
import { error } from '@sveltejs/kit';

// Use SvelteKit's error helper for HTTP errors
throw error(404, 'Resource not found');
throw error(403, 'Unauthorized');
```

### Database Errors
```typescript
try {
  const result = await db.query.users.findFirst({ where: eq(users.cid, cid) });
  if (!result) {
    throw error(404, 'User not found');
  }
  return result;
} catch (e) {
  console.error('Database error:', e);
  throw error(500, 'Internal server error');
}
```

### Client-Side Error Handling
- Use Svelte's error boundaries for component errors
- Show user-friendly error messages
- Log errors appropriately without exposing sensitive information

## Common Patterns & Anti-Patterns

### ✅ DO
- Use DrizzleORM query builders and relations
- Type all function parameters and returns
- Use SvelteKit's form actions for mutations
- Leverage Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`)
- Keep components small and focused
- Reuse utility functions from `lib/utilities/`

### ❌ DON'T
- Don't use `any` type unless absolutely necessary
- Don't fetch data in components - use `+page.server.ts` or `+layout.server.ts`
- Don't store sensitive data in client-side state
- Don't bypass SvelteKit's routing system
- Don't perform authentication checks only on the client side

When working on this codebase:

1. Always import types from schema package for database models
2. Use the established auth patterns via `locals`
3. Follow SvelteKit file-based routing conventions
4. Run database migrations after schema changes
5. Prefer utility functions in `lib/utilities/` for reusable data fetching

## Development Workflow & Contribution Guidelines

### Before Starting Work
1. Pull latest changes from the main branch
2. Create a feature branch with a descriptive name
3. Ensure all dependencies are installed: `pnpm install`

### During Development
1. Make focused, incremental changes
2. Test your changes locally with `pnpm dev`
3. Run `pnpm lint` frequently to catch issues early
4. Use `pnpm check` to verify type safety
5. Commit with clear, descriptive messages

### Before Submitting
1. Run full lint: `pnpm lint:fix`
2. Run type check: `pnpm check`
3. Build affected apps: `pnpm build`
4. Test the application manually
5. Review your own changes for sensitive data or debug code

### Monorepo Considerations
- Changes to `packages/db` affect all apps - test thoroughly
- Turborepo caching speeds up builds - leverage it
- Use workspace dependencies: `@czqm/db`, `@czqm/common`
- Each app has its own deployment process
