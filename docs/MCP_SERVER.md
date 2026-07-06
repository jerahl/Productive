# Beacon MCP Server — Tool, Resource & Prompt Catalog

The MCP server is how Claude operates Beacon. It runs inside the main server process
(Streamable HTTP at `/mcp`) and calls the same service layer as the REST API, so
every change Claude makes appears live in the open web UI via SSE.

Design rules for the surface:

- **Intent-level tools, not raw CRUD.** Claude should say `triage_inbox_item`, not
  `DELETE /inbox` + `POST /tasks`. Tools mirror the actions a user takes in the UI.
- **Small, predictable results.** Every tool returns structured JSON (`structuredContent`)
  plus a one-line text summary. List tools support `limit` and return compact rows.
- **Honest annotations.** `readOnlyHint` on all `get_*`/`list_*`; `destructiveHint`
  only on `delete_*` and `dismiss_inbox_item`; `idempotentHint` where true.
- **Fuzzy buckets over dates.** `due` is `today | tomorrow | week | someday`,
  exactly as in the UI.
- **Schemas shared with the app.** Tool `inputSchema`s are generated from the zod
  schemas in `packages/core` — one definition for UI, REST, and MCP.

## Connecting

Beacon speaks MCP over two transports. **Claude Code** connects over Streamable
HTTP to the running web server; **Claude Desktop** only speaks stdio, so it
launches the standalone stdio bridge (`apps/server/src/mcp-stdio.ts`).

```bash
# Claude Code — server must be running (pnpm --filter @beacon/server dev)
claude mcp add --transport http beacon http://localhost:3000/mcp
```

### Claude Desktop (stdio)

The stdio bridge is a standalone process: it opens the same SQLite file the web
server uses (`~/.beacon/beacon.db` by default), runs migrations, and serves the
full tool/resource/prompt surface. It does **not** start the web server. Your
data is shared with the web app either way, but because stdio has no SSE channel,
changes Claude makes here won't push live into an open browser tab — reload to
see them (for the "watch it happen" demo, use the HTTP transport above).

**1. Install once, from the repo root** (builds the native SQLite binding):

```bash
pnpm install
```

**2. Open Claude Desktop's config file** — Settings → Developer → *Edit Config*,
or edit it directly:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**3. Add a `beacon` server** under `mcpServers`. Point `--dir` at your absolute
path to this repo (the `pnpm --filter` script must resolve from the repo root):

```jsonc
// macOS / Linux
{
  "mcpServers": {
    "beacon": {
      "command": "pnpm",
      "args": ["--dir", "/absolute/path/to/Productive", "--filter", "@beacon/server", "mcp:stdio"]
    }
  }
}
```

```jsonc
// Windows — wrap in cmd so the pnpm shim resolves
{
  "mcpServers": {
    "beacon": {
      "command": "cmd",
      "args": ["/c", "pnpm", "--dir", "C:\\absolute\\path\\to\\Productive", "--filter", "@beacon/server", "mcp:stdio"]
    }
  }
}
```

To point at a different database file, add an `env` block, e.g.
`"env": { "BEACON_DB": "/absolute/path/to/beacon.db" }`.

**4. Fully quit and reopen Claude Desktop.** Beacon's tools appear under the
🔌/tools menu. If they don't, check the logs: `~/Library/Logs/Claude/mcp-server-beacon.log`
(macOS) or `%APPDATA%\Claude\logs\` (Windows).

> **`pnpm` not found?** Claude Desktop launches with a minimal PATH and won't see
> a shell-managed pnpm. Use an absolute path to the binary as `command` (find it
> with `which pnpm` / `where pnpm`), or invoke it via a Node/Corepack path.

## Tools

### Capture & triage

| Tool | Input | Behavior |
|---|---|---|
| `capture_thought` | `text` | Add to inbox. The zero-friction entry point — use for anything the user blurts out. |
| `list_inbox` | — | Inbox items, oldest first. |
| `triage_inbox_item` | `inbox_id`, `due?`, `project?`, `priority?`, `est_minutes?` | Convert an inbox item into a task (default `due: today`) and remove it from the inbox. |
| `dismiss_inbox_item` | `inbox_id` | Delete without creating a task. *(destructive)* |

### Tasks

| Tool | Input | Behavior |
|---|---|---|
| `list_tasks` | `due?`, `project?`, `tag?`, `include_done?`, `limit?` | Grouped like the UI (Today / Upcoming / Someday) unless filtered. |
| `create_task` | `title`, `due?`, `priority?`, `est_minutes?`, `project?`, `goal?`, `tags?`, `note?`, `steps?` | Create a task, optionally pre-broken into steps. |
| `update_task` | `task_id` + any mutable field | Patch semantics; also moves between due buckets. |
| `complete_task` / `reopen_task` | `task_id` | Toggle done; completion updates streak. |
| `break_down_task` | `task_id`, `steps: string[]` | Append checkable steps — the signature ADHD move. Claude typically generates the steps itself, then calls this. |
| `toggle_step` | `task_id`, `step_id` | Check/uncheck one step. |
| `delete_task` | `task_id` | *(destructive)* |

### Focus & energy

| Tool | Input | Behavior |
|---|---|---|
| `start_focus_session` | `task_id?`, `minutes?` (default 25) | Starts the timer; the overlay opens in the web UI. |
| `finish_focus_session` | `session_id`, `completed`, `mark_task_done?` | Log the session; optionally complete the task. |
| `set_energy` | `level: low\|medium\|high` | Biases the "right now" suggestion (low → shortest task). |

### Planning & review

| Tool | Input | Behavior |
|---|---|---|
| `get_overview` | — | Everything on the Overview screen: right-now suggestion, today stats, energy, streak, next meeting, inbox count. The first call Claude should make in most conversations. |
| `plan_my_day` | `top_task_ids?` | Reorder today; returns the resulting plan. Used by the `daily-triage` prompt. |
| `weekly_review` | — | Read-only digest: completed this week, focus minutes, stale Someday items, inbox leftovers, goal/project deltas. |

### Projects, goals, routines, meetings

| Tool | Input | Behavior |
|---|---|---|
| `list_projects` / `create_project` / `update_project` / `delete_project` | usual fields | Percent is computed from linked tasks — not settable. `delete_project` keeps the project's tasks (link cleared); milestones cascade. *(delete is destructive)* |
| `list_goals` / `create_goal` / `update_goal` / `delete_goal` | `pct` is manual | Goals are directional, app doesn't compute them. |
| `list_routines` / `create_routine` / `check_routine_item` / `delete_routine` | `period: morning\|evening`, `text` | Check state is per-day; `create_routine` / `delete_routine` change the template. *(delete is destructive)* |
| `list_meetings` / `create_meeting` / `delete_meeting` | `title`, `starts_at`, `who` | Manual agenda; Claude can transcribe from whatever the user pastes. |

### Notes, docs, canvas, vision

| Tool | Input | Behavior |
|---|---|---|
| `list_notes` / `create_note` / `update_note` / `delete_note` | `text`, `color?` | Freeform sticky notes. |
| `list_docs` / `read_doc` / `create_doc` / `update_doc` | `title`, `tag?`, `body_md` | Long-form markdown. `read_doc` returns full body; `list_docs` returns metadata only. |
| `list_canvas` / `create_canvas_card` / `move_canvas_card` / `connect_canvas_cards` / `promote_canvas_card` | card fields; `promote` → `to: task\|note` | Claude can cluster related cards by moving/connecting them — spatial triage. |
| `list_vision` / `update_vision_tile` | `tag`, `caption` | Captions only; images are uploaded via the web UI. |

## Resources

Read-oriented context that clients can attach without a tool round-trip:

```
beacon://overview          Same payload as get_overview
beacon://tasks/today       Today's open tasks with steps
beacon://inbox             Current inbox
beacon://docs              Doc list (metadata)
beacon://docs/{id}         One doc, full markdown
beacon://review/weekly     The weekly_review digest
```

Resources emit `notifications/resources/updated` on change (backed by the same
event bus as the web UI's SSE).

## Prompts

| Prompt | What it does |
|---|---|
| `daily-triage` | Walks the inbox item-by-item: for each, propose triage/dismiss with a due bucket and estimate; then propose today's top 3 given energy level. Ends by calling `plan_my_day`. |
| `break-it-down` | Takes one task, asks clarifying questions if needed, generates 3–7 tiny concrete steps (each ≤ 15 min), calls `break_down_task`. |
| `weekly-review` | Runs `weekly_review`, celebrates wins first (principle: kind copy), flags stale Someday items for keep/dismiss, drafts next week's focus, offers to update goal percents. |
| `brain-dump` | Free-associate mode: everything the user says gets `capture_thought`-ed with zero judgment; triage explicitly deferred to the end (or to `daily-triage`). |

## Error & safety behavior

- Unknown ids → MCP tool error with the failing id and a hint to call the matching
  `list_*` tool; never a protocol error.
- `delete_*` and `dismiss_inbox_item` are the only destructive tools; everything
  else is reversible (tasks reopen, sessions can be discarded).
- The server is localhost-only by default; if `BEACON_TOKEN` is set, both REST and
  `/mcp` require it as a bearer token.
- Rate/size sanity: `capture_thought` text ≤ 2 000 chars; list tools default
  `limit: 50`.

## Implementation notes

- Built with `@modelcontextprotocol/sdk` (TypeScript), `McpServer` +
  `registerTool`/`registerResource`/`registerPrompt`.
- Tool handlers are one-liners delegating to `packages/core` services — no business
  logic in the MCP layer.
- Streamable HTTP transport mounted on the Hono app at `/mcp`; the stdio `beacon-mcp`
  bin wraps the same server for desktop clients.
- Integration tests drive tools through an in-memory MCP client against a temp
  SQLite DB; the same fixtures back the REST tests.
