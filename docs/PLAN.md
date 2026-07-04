# Beacon — Product Design & Implementation Plan

Beacon is a productivity organizer web app designed around ADHD-friendly workflows:
capture everything instantly, triage later, work on exactly one thing at a time, and
make progress visible enough to be its own reward. A built-in MCP server lets Claude
read and operate the whole system — capturing thoughts, triaging the inbox, breaking
tasks into steps, and running reviews on the user's behalf.

The visual and interaction design is fixed by the reference mock in
[`docs/design-reference/`](./design-reference/) ("Beacon — ADHD Work OS"). This
document translates that mock into a buildable product: feature spec, data model,
architecture, API, MCP surface, and a phased roadmap. The MCP tool catalog lives in
[`docs/MCP_SERVER.md`](./MCP_SERVER.md).

---

## 1. Product principles (from the design)

The mock encodes a specific philosophy; every implementation decision should preserve it:

1. **Capture is frictionless, triage is deferred.** A "Brain dump — capture it, triage
   later" bar is always visible in the header. Captured thoughts land in an Inbox, not
   in the task list. Triage is a separate, one-tap act ("→ Today" or dismiss).
2. **One thing at a time.** The Overview leads with "Right now — just one thing" and a
   single Start Focus button. The focus session is a full-screen overlay: "One task.
   One timer. Everything else can wait."
3. **Big things become tiny pieces.** Any task can expand into checkable steps
   ("Tap 'steps' to break anything big into tiny pieces"). Step progress shows as
   `steps 1/5` on the row.
4. **Progress is the dopamine.** Progress bars everywhere: today's completion, project
   bars, goal bars, routine bars, the focus timer bar, and a day streak in the sidebar.
5. **Time horizons, not calendars.** Tasks live in fuzzy buckets — Today / Tomorrow /
   This week / Someday — cycled by tapping the due pill. No date pickers in the core loop.
6. **Structure is optional.** Notes have "no structure required"; Canvas is "a spatial
   brain-dump… let the mess be useful"; the Vision board answers "why all of this
   matters" when the day feels like noise.
7. **Kind, low-shame copy.** Empty states celebrate ("Nothing left for today. That
   counts as a win — go rest.", "Inbox zero."). The app nudges, never scolds.

## 2. Feature spec by view

The sidebar navigation defines ten views. All views share the persistent shell:
sidebar (logo, nav with badge counts, "Start a focus session" button, streak pill)
and header (greeting + date, brain-dump capture bar).

### 2.1 Overview (home)
- **Right now — just one thing**: the top open Today task with its project and time
  estimate, plus a Start Focus button. Falls back to "Deep work" if today is empty.
- **Today** card: open/done count, progress bar, celebratory empty state.
- **Energy right now**: a low/medium/high selector; the selection biases the
  "right now" suggestion (low energy → suggest the shortest-estimate task).
- **Momentum**: current day streak (a day counts when ≥1 task is completed).
- **Next up**: the next meeting (time, title, attendees).
- **Brain dump** shortcut mirroring the header capture bar.

### 2.2 Tasks
- Groups: **Inbox to triage** (capture items with "→ Today" / dismiss), then
  **Today / Upcoming / Someday** groups with open counts.
- Task row (see `TaskRow.dc.html`): drag handle (manual reorder), priority square
  (click cycles high → med → low; colors `#e07a8a` / `#e0a05a` / muted), checkbox with
  strike-through on done, title, tag chips, note line, estimate pill (`45m`), due pill
  (click cycles today → tomorrow → week → someday), play button (starts a focus
  session on that task), and a `steps n/m` expander.
- Expanded row: checkable steps + an "add a step" input (Enter to add).
- New-task composer at the top of the Today group.

### 2.3 Projects
Card grid: color dot, name, percent (computed from linked tasks done/total), progress
bar, "n of m tasks", due label. Projects are lightweight buckets, not hierarchies.

### 2.4 Docs
Long-form markdown documents with a tag and "edited X ago" metadata. List view +
a simple editor. (The mock shows the list; the editor is our minimal extension.)

### 2.5 Meetings
A simple agenda list for today/this week: time, title, attendees, a "next" highlight.
Manually entered in v1; calendar sync is explicitly out of scope (see §8).

### 2.6 Goals
Card grid: name, detail line ("7 of 12 finished"), manually-set percent, progress bar.
Goals give daily work meaning; tasks and projects can reference a goal (optional link).

### 2.7 Routines
Morning and Evening checklists with progress bars ("Same steps, every time — less
deciding"). Items are templates; check-state **resets daily** while the template
persists. Routine completion feeds the streak.

### 2.8 Notes
Masonry list of freeform notes with color tints and relative timestamps. Create,
edit, delete; no folders, no required structure.

### 2.9 Canvas
Spatial brain-dump: draggable sticky cards (position, text, color), created via
"+ New card". Cards can be **connected** by dragging from a card's dot to another
(edges render as lines — see the thumbnail in `Beacon.dc.html`). A card can be
promoted to a task or note.

### 2.10 Vision Board
Grid of image tiles with a tag and caption ("Run a half marathon by spring."). Users
drop their own images onto tiles.

### 2.11 Focus session (overlay)
Full-screen overlay: task title, `MM:SS` countdown (default 25 min), progress bar,
pause/resume, **+5 min**, and **Done**. Completing a session is logged (task, planned
vs. actual minutes) and can mark the task or a step done. Ticks continue only while
running; closing without finishing discards nothing but logs the partial session.

## 3. Visual language

From the mock (dark theme only in v1):

| Token | Value |
|---|---|
| Background / surface | `#0f1116` / `#1a1e27` |
| Text / muted | `#e8eaf0` / `rgba(232,234,240,.5)` |
| Accent (brand, links, bars) | `#7c8cff` |
| Success / warning / danger / purple | `#5ec98a` / `#e0a05a` / `#e07a8a` / `#c98ad6` |
| Hairlines | `rgba(255,255,255,.07)` |
| Type | Hanken Grotesk (UI), JetBrains Mono (numbers, pills, timers) |
| Radii | 16px cards, 7–10px pills |

Responsive: below ~860px the sidebar becomes a horizontal scrolling bar (already
specced in the mock's CSS). Subtle `fadeup` animation on view entry.

## 4. Data model

Single-user, local-first. SQLite schema (Drizzle ORM); all ids are ULIDs, all
timestamps ISO-8601 UTC.

```
tasks         id, title, done, done_at, est_minutes, project_id?, goal_id?,
              due ('today'|'tomorrow'|'week'|'someday'), priority ('high'|'med'|'low'),
              note, sort_order, created_at, updated_at
task_tags     task_id, tag                       -- freeform labels ("Deep work", "Email")
task_steps    id, task_id, text, done, sort_order
inbox_items   id, text, created_at               -- captured, un-triaged thoughts
projects      id, name, color, due_label, archived, created_at
goals         id, name, detail, pct (0–100), created_at
routines      id, period ('morning'|'evening'), text, sort_order
routine_checks routine_id, date, done            -- per-day check state; template persists
meetings      id, title, starts_at, who, created_at
docs          id, title, tag, body_md, created_at, updated_at
notes         id, text, color, created_at, updated_at
canvas_cards  id, x, y, text, color, created_at
canvas_edges  id, from_card_id, to_card_id
vision_tiles  id, tag, caption, image_path, sort_order
focus_sessions id, task_id?, task_title, planned_minutes, actual_seconds,
              started_at, ended_at, completed (bool)
app_state     key, value  -- energy level, streak cache, user name, preferences
```

Derived (never stored redundantly): project percent = done/total of linked tasks;
today progress; streak = consecutive days with ≥1 completed task or focus session;
"right now" suggestion = top open Today task, filtered by energy (low → min estimate).

**Daily rollover** (on first request of a new local day): reset `routine_checks`,
recompute streak, and optionally surface overdue "today" tasks back to top rather than
punishing (no red overdue states — principle 7).

## 5. Architecture

```
apps/
  web/        React 19 + TypeScript + Vite + Tailwind v4, TanStack Query
  server/     Node 22 + Hono, Drizzle + SQLite (single file DB)
              ├─ /api/*   REST for the web client
              └─ /mcp     MCP Streamable HTTP endpoint (same process)
packages/
  core/       shared domain types, zod schemas, service layer (all business logic)
  mcp/        MCP tool/resource/prompt definitions built on packages/core
```

Key decisions:

- **One process, one source of truth.** The Hono server hosts both the REST API and
  the MCP endpoint. Both call the same service layer in `packages/core`, so Claude and
  the browser always see identical state. No sync problems, no second daemon.
- **MCP transport:** Streamable HTTP at `/mcp` (works with Claude Code via
  `claude mcp add --transport http beacon http://localhost:3000/mcp`, and with Claude
  Desktop via `mcp-remote`). A thin `beacon-mcp` stdio bin is also shipped for clients
  that only speak stdio; it starts (or connects to) the server.
- **Live updates:** the server emits SSE on `/api/events`; the web client invalidates
  TanStack Query caches on events. So when Claude triages the inbox over MCP, the
  open browser updates within a second — this is the demo-defining moment.
- **Validation:** zod schemas in `packages/core` are the single definition used by
  REST input validation, MCP tool `inputSchema`s, and the DB layer.
- **Storage:** SQLite file at `~/.beacon/beacon.db` (override with `BEACON_DB`);
  vision-board images stored under `~/.beacon/uploads/`.
- **Auth:** none in v1 — binds to localhost, single user. A bearer token env var
  gates the day it's exposed beyond localhost.

### REST API sketch

`GET/POST/PATCH/DELETE` per entity, plus intent-level actions the UI actually uses:

```
POST /api/capture                  { text }             → inbox item
POST /api/inbox/:id/triage         { due?, project_id? }→ task (removes inbox item)
POST /api/inbox/:id/dismiss
POST /api/tasks/:id/toggle         (and /steps/:sid/toggle)
POST /api/tasks/:id/cycle-due      /cycle-priority
POST /api/tasks/:id/steps          { text }
POST /api/focus/start              { task_id?, minutes? }
POST /api/focus/:id/finish         { completed }
GET  /api/overview                 → greeting, right-now, today stats, energy,
                                     streak, next meeting, nudge
GET  /api/events                   (SSE)
```

## 6. MCP server (summary)

Full catalog in [`MCP_SERVER.md`](./MCP_SERVER.md). Shape of the surface:

- **~20 tools** grouped by intent: capture & triage (`capture_thought`,
  `list_inbox`, `triage_inbox_item`), tasks (`list_tasks`, `create_task`,
  `update_task`, `complete_task`, `break_down_task`), focus (`start_focus_session`,
  `finish_focus_session`), planning (`get_overview`, `plan_my_day`,
  `weekly_review`), plus CRUD for notes, docs, projects, goals, routines, canvas.
- **Resources** for read-heavy context: `beacon://overview`, `beacon://tasks/today`,
  `beacon://docs/{id}`, etc.
- **Prompts** encoding the rituals the design hints at: `daily-triage`,
  `break-it-down`, `weekly-review` (the mock's inbox seed literally contains
  "Idea: build a weekly review template" — we ship it).
- Tools return concise structured JSON plus a one-line human summary; destructive
  tools (`delete_*`) are annotated `destructiveHint: true` and everything else
  `idempotentHint`/`readOnlyHint` appropriately.

## 7. Roadmap

**Phase 0 — Scaffold (this branch).** Monorepo setup (pnpm workspaces, TS config,
lint), Drizzle schema + migrations, seed script reproducing the mock's demo data.

**Phase 1 — Core loop.** Tasks + Inbox + capture + triage + steps + due/priority
cycling + reorder; REST API; web shell (sidebar, header, Tasks view) pixel-matched to
the mock. *Exit test: capture → triage → break down → complete, entirely in the UI.*

**Phase 2 — Focus & Overview.** Focus overlay with timer/+5/done, focus session
logging, Overview view (right now, today bar, energy, streak, next up), daily
rollover + streak computation.

**Phase 3 — MCP server.** `packages/mcp` with the Phase-1/2 tool set, `/mcp`
endpoint, SSE-driven live UI updates, stdio bin, docs for connecting Claude Code and
Claude Desktop. *Exit test: Claude triages the inbox while the browser watches it
happen.*

**Phase 4 — Surround views.** Projects, Goals, Routines (with daily reset), Notes,
Meetings, Docs (list + markdown editor).

**Phase 5 — Canvas & Vision.** Draggable canvas cards, card connections, promote
card → task/note; vision board with image upload. Remaining MCP tools.

**Phase 6 — Polish.** Empty states and copy pass, keyboard shortcuts (`c` capture,
`f` focus, `1–9` nav), reduced-motion support, responsive sidebar, packaging
(`npx beacon` starts server + opens browser).

## 8. Non-goals (v1)

- Multi-user, accounts, cloud sync — local-first single user.
- Calendar/email integration — meetings are manual entries (Claude can create them
  over MCP from whatever context the user gives it).
- Notifications/reminders — the app is a place you go, not a thing that pings you.
- Light theme — the design is dark; add later behind a token layer.
- Mobile apps — responsive web only.

## 9. Open questions

1. Should completing the last step auto-complete the task, or just nudge? (Lean: nudge.)
2. Streak definition — any completed task vs. "planned top-3 done"? (Lean: any, be kind.)
3. Do canvas edges carry labels? Mock shows plain lines. (Lean: plain in v1.)
