# Beacon — ADHD Work OS

A productivity organizer web app built for ADHD-friendly workflows — capture
everything instantly, triage later, work on one thing at a time, and make progress
visible. Claude connects directly through a built-in MCP server and can triage the
inbox, break tasks into tiny steps, start focus sessions, and run reviews while the
UI updates live.

**Status: Phase 0 — scaffold.** The pnpm monorepo, shared `@beacon/core` domain
(Drizzle schema + zod validators + types), SQLite migrations, and a seed script
that reproduces the reference mock's demo data are in place. The web client, REST
API, and MCP server land in later phases (see the roadmap in `docs/PLAN.md §7`).

## Repository layout

```
apps/
  web/        React web client — scaffolded in Phase 1 (placeholder for now)
  server/     SQLite/Drizzle DB layer, migrations, seed (REST + MCP in later phases)
packages/
  core/       shared enums, zod schemas, Drizzle tables, inferred types
  mcp/        MCP tools/resources/prompts — implemented in Phase 3 (placeholder)
```

## Getting started

Requires Node ≥ 22 and pnpm ≥ 10.

```bash
pnpm install          # install workspace deps (builds better-sqlite3 natively)
pnpm db:generate      # regenerate Drizzle migration SQL from the schema
pnpm db:migrate       # apply migrations to the SQLite file
pnpm db:seed          # migrate (if needed) + load the demo data
pnpm db:reset         # drop the db file, re-migrate, and re-seed from scratch

pnpm typecheck        # tsc --noEmit across all packages
pnpm lint             # biome check
```

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
