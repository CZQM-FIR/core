# AGENTS.md

## Cursor Cloud specific instructions

This is a pnpm + Turborepo monorepo (`with-svelte`). Standard scripts live in the root
`package.json` / `turbo.json` and each app's `package.json`; per-app setup is in each
app's README and `.env.example`. Only non-obvious, durable notes are captured here.

### Services / apps
- `apps/web` — public SvelteKit site, dev port **5100**.
- `apps/overseer` — admin SvelteKit app, dev port **5101**.
- `apps/vector` — training SvelteKit app, dev port **5102**.
- `apps/worker` — Express + node-cron background worker, dev port **3000**
  (health at `/cron-health`; with `NODE_ENV=dev` it exposes manual `/dev/*` trigger
  endpoints instead of running cron on a schedule).
- `apps/wiki` — Zensical (Python) static docs site, dev port **8000**. Independent of
  the JS stack; uses `uv` (installed at `~/.local/bin`) with a uv-managed Python `>=3.13`.

### Running (see each package.json / app README for the canonical commands)
- All JS apps at once: `pnpm dev` (turbo, persistent). Per app: `pnpm --filter <app> dev`.
- Wiki: `uv run zensical serve` from `apps/wiki`.
- Lint: `pnpm lint`. Build: `pnpm build`. Type-check: `pnpm check`.
  - Only `web`, `overseer`, `vector` define a `lint`/`check` task; `worker`, `@czqm/db`,
    `@czqm/common` have none. CI (`.github/workflows/lint.yml`) gates on `pnpm lint` only.
  - `pnpm check` currently reports PRE-EXISTING type errors (a few in `web`, several in
    `vector`) that exist in committed source and are unrelated to environment setup.
- There is no automated test suite (no `test` scripts / runner configured).

### Environment files and the local dev database (the non-obvious part)
The `.env` files and the local DB are NOT created by the update script — they are created
once during environment setup and persist in the VM snapshot. Recreate them only if
missing. `.env` files are git-ignored in practice via app conventions; do not commit them.

- Every TS app needs a Turso/libSQL database. For local dev, point them all at one shared
  libSQL file: `TURSO_URL="file:/workspace/local.db"` (matches the git-ignored `local.db*`).
- `web` and `vector` skip the token in dev; `overseer` and `worker` validate a strict
  arktype env schema at runtime and require ALL vars present (placeholder values are fine).
  Use `TURSO_TOKEN="dev-placeholder-token"` everywhere — a `file:` URL ignores the token,
  and the non-empty value is required for `pnpm build` (web's `src/lib/db.ts` throws when
  `!dev && !TURSO_TOKEN`).
- Copy `apps/overseer/.env.example` and `apps/vector/.env.example` as starting points.
  `web` also needs `PUBLIC_VECTOR_URL` set (it is imported from `$env/static/public`).
  `worker` needs the full set from `packages/common/src/types.ts` `Env` (URLs must be valid
  URLs, emails valid emails, integer fields numeric strings).

### Recreating the DB schema + seed (only if `/workspace/local.db` is lost)
- Push schema from `packages/db`: the `turso` drizzle dialect requires a non-empty token
  param even for `file:` URLs, so run:
  `TURSO_URL="file:/workspace/local.db" TURSO_TOKEN="dummy" pnpm exec drizzle-kit push --force`
- Seed reference data: `sqlite3 /workspace/local.db < apps/web/seed/seed.sql`.
  Note `seed.sql` is slightly stale for the `flags` table (schema now has a 3rd column
  `showInSelect`), so the `flags` INSERTs there fail; insert flags with a 3rd value (`1`).

### Testing authenticated flows without VATSIM OAuth
Login is VATSIM OAuth. To exercise authenticated pages locally, seed a `users` row and an
`auth_sessions` row, then set the browser `session` cookie to the raw token. The session id
stored in `auth_sessions.id` is the lowercase hex SHA-256 of the token string
(`printf '%s' "<token>" | sha256sum`), and `expires_at` is a Unix-seconds timestamp.
