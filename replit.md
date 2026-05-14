# ClearBooks Accountant Portal

A full-stack backoffice application for an accountant practice to manage clients, tasks, financial info, tax references, and SA tax return statuses.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/accountant-portal run dev` — run the frontend (port from $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — re-seed the database from Excel files in `attached_assets/`
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, shadcn/ui, TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — Drizzle table definitions (clients, tasks, financial-info, tax-references, tax-returns)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for the API contract)
- `lib/api-spec/src/generated/` — Orval-generated React Query hooks and Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/accountant-portal/src/pages/` — React page components
- `scripts/src/seed.ts` — Seeds DB from Excel files in `attached_assets/`

## Architecture decisions

- Contract-first API: OpenAPI spec drives both the server Zod schemas and client React Query hooks via Orval codegen.
- All 5 data tables share the `clients` table as the FK parent; tasks/financial-info/tax-references/tax-returns all reference `client_id`.
- Tax references use client name as the join key from Excel (not code); the seed script resolves them at import time.
- Seed script deduplicates client codes before insert to handle Excel duplicates.
- Dashboard endpoints are separate from CRUD endpoints for clean separation of concerns.

## Product

- **Dashboard** — KPI cards (total clients, overdue tasks, VAT registered), recent overdue task list, SA returns status breakdown
- **Clients** — Searchable/filterable list of all 962 clients; detail page with tabs for financial info, tax references, tax returns, and tasks
- **Tasks** — Filterable list of all 134 tasks with overdue highlighting
- **Tax Returns** — Full list of 616 SA tax return records with status filters

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run codegen after changing `openapi.yaml`: `pnpm --filter @workspace/api-spec run codegen`
- Always run `pnpm --filter @workspace/db run push` after changing schema files
- Seed script truncates all tables before re-seeding — it is destructive
- Do NOT change the `info.title` in `openapi.yaml` — it controls generated filenames

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
