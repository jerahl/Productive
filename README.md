# Beacon — ADHD Work OS

A productivity organizer web app built for ADHD-friendly workflows — capture
everything instantly, triage later, work on one thing at a time, and make progress
visible. Claude connects directly through a built-in MCP server and can triage the
inbox, break tasks into tiny steps, start focus sessions, and run reviews while the
UI updates live.

**Status: Phase 1 — core loop.** The pnpm monorepo, shared `@beacon/core` domain
(Drizzle schema + zod validators + service layer), SQLite migrations, and a demo
seed are in place, plus the full core loop: a Hono REST API and a React web
client with the persistent shell (sidebar, header, brain-dump capture bar) and a
Tasks view pixel-matched to the mock — inbox triage, Today/Upcoming/Someday
groups, steps, due/priority cycling, and drag-to-reorder. The MCP server and the
remaining views land in later phases (see the roadmap in `docs/PLAN.md §7`).

## Repository layout

```
apps/
  web/        React 19 + Vite + Tailwind v4 + TanStack Query — shell + Tasks view
  server/     Node + Hono REST API over the core service layer; SQLite/Drizzle, seed
packages/
  core/       enums, zod schemas, Drizzle tables, inferred types, service layer
  mcp/        MCP tools/resources/prompts — implemented in Phase 3 (placeholder)
```

## Getting started

Requires Node ≥ 22 and pnpm ≥ 10.

```bash
pnpm install          # install workspace deps (builds better-sqlite3 natively)
pnpm db:reset         # drop the db file, re-migrate, and re-seed the demo data

# run the app (two terminals, or background the server):
pnpm --filter @beacon/server dev   # REST API on http://localhost:3000 (seeds if empty)
pnpm --filter @beacon/web dev      # web client on http://localhost:5173 (proxies /api)

pnpm typecheck        # tsc --noEmit across all packages
pnpm lint             # biome check
```

Other DB tasks: `pnpm db:generate` (regenerate migration SQL from the schema),
`pnpm db:migrate` (apply migrations), `pnpm db:seed` (migrate + load demo data).

The database lives at `~/.beacon/beacon.db` by default; set `BEACON_DB` to
override (e.g. `BEACON_DB=./dev.db pnpm db:reset`).

## Documents

- [`docs/PLAN.md`](docs/PLAN.md) — product principles, feature spec for all ten
  views, data model, architecture, REST API sketch, and phased roadmap.
- [`docs/MCP_SERVER.md`](docs/MCP_SERVER.md) — the MCP surface: ~30 tools,
  resources, prompts, and safety behavior.
- [`docs/design-reference/`](docs/design-reference/) — the source design mock
  (interactive HTML + screenshots) that fixes the visual and interaction design.

## The app at a glance

| View | Purpose |
|---|---|
| Overview | "Right now — just one thing", today progress, energy, streak, next meeting |
| Tasks | Inbox triage + Today / Upcoming / Someday, steps, priorities, estimates |
| Projects | Lightweight buckets with progress bars |
| Docs | Long-form markdown |
| Meetings | Manual agenda with "next up" |
| Goals | Directional goals with manual progress |
| Routines | Morning/evening checklists that reset daily |
| Notes | Freeform sticky notes |
| Canvas | Spatial brain-dump with draggable, connectable cards |
| Vision Board | Image tiles for "why all of this matters" |

Plus a full-screen **focus session** overlay: one task, one timer, +5 min, done.

## Planned stack

pnpm monorepo · React 19 + Vite + Tailwind (web) · Node 22 + Hono + Drizzle/SQLite
(server, hosting both the REST API and the MCP endpoint at `/mcp`) · shared
zod-typed core package · `@modelcontextprotocol/sdk`.
