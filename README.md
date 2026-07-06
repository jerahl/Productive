# Beacon — ADHD Work OS

A productivity organizer web app built for ADHD-friendly workflows — capture
everything instantly, triage later, work on one thing at a time, and make progress
visible. Claude connects directly through a built-in MCP server and can triage the
inbox, break tasks into tiny steps, start focus sessions, and run reviews while the
UI updates live.

**Status: Phase 5 — feature-complete.** All ten views from the design are built,
the focus overlay works, and a built-in MCP server (44 tools, 6 resources, 4
prompts) lets Claude operate the whole app with changes streaming live to the
browser over SSE:

- **Tasks** — inbox triage, Today/Upcoming/Someday groups, steps, due/priority
  cycling, drag-to-reorder.
- **Overview** — "right now — just one thing" (low energy → suggests the shortest
  task), today progress, momentum/streak, next meeting, brain-dump inbox.
- **Focus session** — full-screen overlay with a countdown, pause/resume, +5 min,
  and Done; sessions are logged (planned vs. actual); a daily rollover promotes
  `tomorrow` → `today` and streaks recompute from completions.
- **Projects** — a card grid; open one for its detail: **milestones** (checkable,
  with per-milestone progress) and the project's **tasks** grouped under them.
  Those are real tasks — they show in the Tasks tab too, where each carries a
  project pill that jumps back to the project.
- **Goals** — create, edit name/detail inline, drag a progress slider (or "sync
  from tasks"), and link real tasks that feed the goal.
- **Meetings · Routines · Notes · Docs** — an agenda with done/next/later,
  daily-resetting routine checks, a sticky-note masonry, and a docs list with a
  markdown editor.
- **Canvas** — a spatial board with draggable, connectable cards; delete a card
  or edge; promote a card into a task or note.
- **Vision board** — image tiles with drag-to-upload and editable captions.
- **MCP server** at `/mcp` (Streamable HTTP, same process): 44 tools, resources,
  and prompts, all delegating to the shared service layer. Changes stream to the
  browser over SSE (`/api/events`), so when Claude triages the inbox — or moves a
  canvas card — the open UI updates within a second.

## Connecting Claude

With the server running (`pnpm --filter @beacon/server dev`):

```bash
# Claude Code — Streamable HTTP (recommended; drives live UI updates)
claude mcp add --transport http beacon http://localhost:3000/mcp
```

For a stdio client (e.g. Claude Desktop), run `pnpm --filter @beacon/server mcp:stdio`,
or point the client at that command. The stdio bridge shares the same SQLite
database; use the HTTP transport when you want changes to appear live in an open
browser. Step-by-step Claude Desktop setup (config file location, JSON block,
troubleshooting) and the full tool/resource/prompt catalog are in
[`docs/MCP_SERVER.md`](docs/MCP_SERVER.md).

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

## Running as a Windows service

On Windows, Beacon can run as background services that start on boot and
restart on crash, wrapped with
[`node-windows`](https://github.com/coreybutler/node-windows). There are two:
the **backend** (REST + SSE + MCP) and the **web** client. Run either or both.

First install dependencies with `pnpm install` (everything the services need
at runtime is a regular dependency, so a production install — `--prod` or with
`NODE_ENV=production` — works too). All commands below run from an **elevated
(Administrator)** prompt.

### Backend service (`Beacon`)

Wraps the server entrypoint (`src/index.ts`) — no build step required.

```bat
rem Point the database at a stable, writable location — a service runs as
rem LocalSystem, whose home directory is under C:\Windows.
set BEACON_DB=C:\ProgramData\Beacon\beacon.db
set PORT=3000

pnpm --filter @beacon/server run service:install
```

This registers a service named **Beacon** and starts it. `PORT`, `BEACON_DB`,
and `NODE_ENV` (default `production`) are captured from the install-time
environment.

### Web service (`Beacon Web`)

Serves the built web client with Vite's preview server, proxying `/api` to the
backend. **Build first** so `dist/` exists:

```bat
pnpm --filter @beacon/web build

set PORT=5173
set BEACON_API=http://localhost:3000

pnpm --filter @beacon/web run service:install
```

This registers a service named **Beacon Web** and starts it. `PORT` is the port
it listens on; `BEACON_API` is the backend it proxies `/api` to.

### Managing the services

Manage them from `services.msc` or with `net start` / `net stop` (quote the
name that contains a space); wrapper logs are written next to each service
definition. To reconfigure, uninstall and reinstall:

```bat
net stop "Beacon Web"  &  net stop Beacon
pnpm --filter @beacon/web run service:uninstall
pnpm --filter @beacon/server run service:uninstall
```

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
