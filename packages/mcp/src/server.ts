import {
  type BeaconService,
  DUE_BUCKETS,
  ENERGY_LEVELS,
  PRIORITIES,
  PROMOTE_TARGETS,
  ROUTINE_PERIODS,
  type TaskWithDetail,
} from '@beacon/core'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export const MCP_SERVER_NAME = 'beacon'
const VERSION = '0.1.0'

type ToolResult = {
  content: { type: 'text'; text: string }[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

const ok = (text: string, data?: Record<string, unknown>): ToolResult => ({
  content: [{ type: 'text', text }],
  ...(data ? { structuredContent: data } : {}),
})

/** Compact row for list results — small, predictable payloads (MCP_SERVER.md). */
function compact(t: TaskWithDetail) {
  return {
    id: t.id,
    title: t.title,
    done: t.done,
    due: t.due,
    priority: t.priority,
    estMinutes: t.estMinutes,
    steps: `${t.steps.filter((s) => s.done).length}/${t.steps.length}`,
    tags: t.tags,
    note: t.note || undefined,
  }
}

const dueEnum = z.enum(DUE_BUCKETS)
const priorityEnum = z.enum(PRIORITIES)
const energyEnum = z.enum(ENERGY_LEVELS)

/**
 * The Beacon MCP surface (docs/MCP_SERVER.md). Every tool is a one-liner over
 * the shared @beacon/core service, so MCP and REST never diverge and — because
 * the service emits events — Claude's changes appear live in the open browser.
 */
export function createBeaconMcpServer(svc: BeaconService): McpServer {
  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: VERSION },
    {
      instructions:
        'Beacon is an ADHD-friendly work OS. Capture freely, triage into fuzzy due ' +
        'buckets (today/tomorrow/week/someday), work one thing at a time, and break big ' +
        'tasks into tiny steps. Call get_overview first in most conversations.',
    },
  )

  // --- Capture & triage ----------------------------------------------------
  server.registerTool(
    'capture_thought',
    {
      title: 'Capture a thought',
      description: 'Add a thought to the inbox. The zero-friction entry point.',
      inputSchema: { text: z.string().trim().min(1).max(2000) },
    },
    async ({ text }) => {
      const item = svc.capture(text)
      return ok(`Captured: "${item.text}"`, { item })
    },
  )

  server.registerTool(
    'list_inbox',
    {
      title: 'List inbox',
      description: 'Un-triaged captured thoughts, oldest first.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      const items = svc.listInbox()
      return ok(`${items.length} inbox item(s).`, { items })
    },
  )

  server.registerTool(
    'triage_inbox_item',
    {
      title: 'Triage inbox item',
      description:
        'Turn an inbox item into a task (default due: today) and remove it from the inbox.',
      inputSchema: {
        inboxId: z.string(),
        due: dueEnum.optional(),
        priority: priorityEnum.optional(),
        estMinutes: z.number().int().nonnegative().optional(),
        projectId: z.string().optional(),
      },
    },
    async ({ inboxId, due, priority, estMinutes, projectId }) => {
      const task = svc.triageInboxItem(inboxId, {
        due: due ?? 'today',
        priority,
        estMinutes,
        projectId,
      })
      return ok(`Triaged "${task.title}" → ${task.due}.`, { task: compact(task) })
    },
  )

  server.registerTool(
    'dismiss_inbox_item',
    {
      title: 'Dismiss inbox item',
      description: 'Delete an inbox item without creating a task.',
      inputSchema: { inboxId: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ inboxId }) => {
      svc.dismissInboxItem(inboxId)
      return ok('Dismissed.')
    },
  )

  // --- Tasks ---------------------------------------------------------------
  server.registerTool(
    'list_tasks',
    {
      title: 'List tasks',
      description: 'Tasks grouped like the UI (Today / Upcoming / Someday).',
      inputSchema: {
        includeDone: z.boolean().optional(),
        limit: z.number().int().positive().optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ includeDone, limit }) => {
      const groups = svc.listTaskGroups().map((g) => {
        let rows = includeDone ? g.tasks : g.tasks.filter((t) => !t.done)
        if (limit) rows = rows.slice(0, limit)
        return { key: g.key, label: g.label, openCount: g.openCount, tasks: rows.map(compact) }
      })
      const total = groups.reduce((n, g) => n + g.tasks.length, 0)
      return ok(`${total} task(s) across ${groups.length} groups.`, { groups })
    },
  )

  server.registerTool(
    'create_task',
    {
      title: 'Create a task',
      description: 'Create a task, optionally pre-broken into steps.',
      inputSchema: {
        title: z.string().trim().min(1),
        due: dueEnum.optional(),
        priority: priorityEnum.optional(),
        estMinutes: z.number().int().nonnegative().optional(),
        projectId: z.string().optional(),
        milestoneId: z.string().optional(),
        goalId: z.string().optional(),
        note: z.string().optional(),
        tags: z.array(z.string()).optional(),
        steps: z.array(z.string()).optional(),
      },
    },
    async (input) => {
      const task = svc.createTask({
        ...input,
        due: input.due ?? 'today',
        priority: input.priority ?? 'low',
      })
      return ok(`Created "${task.title}" (${task.due}).`, { task: compact(task) })
    },
  )

  server.registerTool(
    'update_task',
    {
      title: 'Update a task',
      description: 'Patch any mutable field; also moves the task between due buckets.',
      inputSchema: {
        taskId: z.string(),
        title: z.string().trim().min(1).optional(),
        due: dueEnum.optional(),
        priority: priorityEnum.optional(),
        estMinutes: z.number().int().nonnegative().nullable().optional(),
        projectId: z.string().nullable().optional(),
        milestoneId: z.string().nullable().optional(),
        goalId: z.string().nullable().optional(),
        note: z.string().optional(),
        done: z.boolean().optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ taskId, ...patch }) => {
      const task = svc.updateTask(taskId, patch)
      return ok(`Updated "${task.title}".`, { task: compact(task) })
    },
  )

  server.registerTool(
    'complete_task',
    {
      title: 'Complete a task',
      description: 'Mark a task done (updates the streak).',
      inputSchema: { taskId: z.string() },
      annotations: { idempotentHint: true },
    },
    async ({ taskId }) => {
      const task = svc.updateTask(taskId, { done: true })
      return ok(`Completed "${task.title}". Nice.`, { task: compact(task) })
    },
  )

  server.registerTool(
    'reopen_task',
    {
      title: 'Reopen a task',
      description: 'Mark a completed task open again.',
      inputSchema: { taskId: z.string() },
      annotations: { idempotentHint: true },
    },
    async ({ taskId }) => {
      const task = svc.updateTask(taskId, { done: false })
      return ok(`Reopened "${task.title}".`, { task: compact(task) })
    },
  )

  server.registerTool(
    'break_down_task',
    {
      title: 'Break down a task',
      description:
        'Append checkable steps — the signature ADHD move. Generate 3–7 tiny concrete steps.',
      inputSchema: { taskId: z.string(), steps: z.array(z.string().trim().min(1)).min(1) },
    },
    async ({ taskId, steps }) => {
      const task = svc.addSteps(taskId, steps)
      return ok(`Broke "${task.title}" into ${task.steps.length} step(s).`, { task: compact(task) })
    },
  )

  server.registerTool(
    'toggle_step',
    {
      title: 'Toggle a step',
      description: 'Check or uncheck one step of a task.',
      inputSchema: { taskId: z.string(), stepId: z.string() },
    },
    async ({ taskId, stepId }) => {
      const task = svc.toggleStep(taskId, stepId)
      return ok(`Steps now ${task.steps.filter((s) => s.done).length}/${task.steps.length}.`, {
        task: compact(task),
      })
    },
  )

  server.registerTool(
    'delete_task',
    {
      title: 'Delete a task',
      description: 'Permanently delete a task.',
      inputSchema: { taskId: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ taskId }) => {
      svc.deleteTask(taskId)
      return ok('Deleted.')
    },
  )

  // --- Focus & energy ------------------------------------------------------
  server.registerTool(
    'start_focus_session',
    {
      title: 'Start a focus session',
      description: 'Start the timer; the overlay opens in the web UI. Default 25 minutes.',
      inputSchema: {
        taskId: z.string().optional(),
        minutes: z.number().int().min(1).max(180).optional(),
      },
    },
    async ({ taskId, minutes }) => {
      const session = svc.startFocus({ taskId, minutes: minutes ?? 25 })
      return ok(`Focusing on "${session.taskTitle}" for ${session.plannedMinutes}m.`, { session })
    },
  )

  server.registerTool(
    'finish_focus_session',
    {
      title: 'Finish a focus session',
      description: 'Log the session; optionally mark the task done.',
      inputSchema: {
        sessionId: z.string(),
        completed: z.boolean(),
        markTaskDone: z.boolean().optional(),
      },
    },
    async ({ sessionId, completed, markTaskDone }) => {
      const session = svc.finishFocus(sessionId, { completed, markTaskDone })
      return ok(`Logged ${Math.round(session.actualSeconds / 60)}m of focus.`, { session })
    },
  )

  server.registerTool(
    'set_energy',
    {
      title: 'Set energy level',
      description: 'Bias the right-now suggestion (low → shortest task).',
      inputSchema: { level: energyEnum },
      annotations: { idempotentHint: true },
    },
    async ({ level }) => {
      svc.setEnergy(level)
      return ok(`Energy set to ${level}.`, { energy: level })
    },
  )

  // --- Planning ------------------------------------------------------------
  server.registerTool(
    'get_overview',
    {
      title: 'Get overview',
      description:
        'Everything on the Overview: right-now suggestion, today stats, energy, streak, next ' +
        'meeting, inbox count. The first call to make in most conversations.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      const overview = svc.getOverview()
      const rn = overview.rightNow?.title ?? 'nothing queued'
      return ok(`${overview.today.done}/${overview.today.total} done today · right now: ${rn}.`, {
        overview,
      })
    },
  )

  server.registerTool(
    'plan_my_day',
    {
      title: 'Plan my day',
      description: "Reorder today's tasks (pass the ids top-first); returns the resulting plan.",
      inputSchema: { topTaskIds: z.array(z.string()).optional() },
    },
    async ({ topTaskIds }) => {
      if (topTaskIds?.length) svc.reorderGroup('today', topTaskIds)
      const today = svc.listTaskGroups().find((g) => g.key === 'today')
      const open = (today?.tasks ?? []).filter((t) => !t.done).map(compact)
      return ok(`Today's plan: ${open.length} open task(s).`, { tasks: open })
    },
  )

  registerSurround(server, svc)
  registerResources(server, svc)
  registerPrompts(server)
  return server
}

/** Projects, goals, routines, meetings, notes, docs, canvas, vision, review. */
function registerSurround(server: McpServer, svc: BeaconService): void {
  // Projects
  server.registerTool(
    'list_projects',
    {
      title: 'List projects',
      description: 'Projects with computed completion %.',
      annotations: { readOnlyHint: true },
    },
    async () => ok('projects', { projects: svc.listProjects() }),
  )
  server.registerTool(
    'create_project',
    {
      title: 'Create project',
      description: 'Create a lightweight project bucket.',
      inputSchema: {
        name: z.string().trim().min(1),
        color: z.string().optional(),
        dueLabel: z.string().optional(),
      },
    },
    async ({ name, color, dueLabel }) =>
      ok(`Created project "${name}".`, {
        project: svc.createProject({ name, color: color ?? '#7c8cff', dueLabel }),
      }),
  )
  server.registerTool(
    'update_project',
    {
      title: 'Update project',
      description: 'Rename, recolor, relabel, or archive a project.',
      inputSchema: {
        projectId: z.string(),
        name: z.string().optional(),
        color: z.string().optional(),
        dueLabel: z.string().optional(),
        archived: z.boolean().optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ projectId, ...patch }) =>
      ok('Updated project.', { project: svc.updateProject(projectId, patch) }),
  )
  server.registerTool(
    'get_project',
    {
      title: 'Get project detail',
      description: 'A project with its milestones (task counts) and its linked tasks.',
      inputSchema: { projectId: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ projectId }) => {
      const d = svc.getProjectDetail(projectId)
      return ok(
        `${d.project.name}: ${d.project.done}/${d.project.total} tasks · ${d.milestones.length} milestone(s).`,
        d as unknown as Record<string, unknown>,
      )
    },
  )
  server.registerTool(
    'delete_project',
    {
      title: 'Delete project',
      description: 'Delete a project; its milestones go too, but its tasks stay (link cleared).',
      inputSchema: { projectId: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ projectId }) => {
      svc.deleteProject(projectId)
      return ok('Deleted project.')
    },
  )

  // Milestones
  server.registerTool(
    'create_milestone',
    {
      title: 'Create milestone',
      description: 'Add a milestone (checkpoint) to a project.',
      inputSchema: { projectId: z.string(), title: z.string().trim().min(1) },
    },
    async ({ projectId, title }) =>
      ok(`Added milestone "${title}".`, { milestone: svc.createMilestone({ projectId, title }) }),
  )
  server.registerTool(
    'update_milestone',
    {
      title: 'Update milestone',
      description: 'Rename a milestone or mark it done/undone.',
      inputSchema: {
        milestoneId: z.string(),
        title: z.string().optional(),
        done: z.boolean().optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ milestoneId, ...patch }) =>
      ok('Updated milestone.', { milestone: svc.updateMilestone(milestoneId, patch) }),
  )
  server.registerTool(
    'delete_milestone',
    {
      title: 'Delete milestone',
      description: 'Delete a milestone; its tasks stay in the project.',
      inputSchema: { milestoneId: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ milestoneId }) => {
      svc.deleteMilestone(milestoneId)
      return ok('Deleted milestone.')
    },
  )

  // Goals
  server.registerTool(
    'list_goals',
    {
      title: 'List goals',
      description: 'Directional goals with manual progress.',
      annotations: { readOnlyHint: true },
    },
    async () => ok('goals', { goals: svc.listGoals() }),
  )
  server.registerTool(
    'create_goal',
    {
      title: 'Create goal',
      description: 'Create a directional goal.',
      inputSchema: {
        name: z.string().trim().min(1),
        detail: z.string().optional(),
        pct: z.number().int().min(0).max(100).optional(),
      },
    },
    async ({ name, detail, pct }) =>
      ok(`Created goal "${name}".`, { goal: svc.createGoal({ name, detail, pct: pct ?? 0 }) }),
  )
  server.registerTool(
    'update_goal',
    {
      title: 'Update goal',
      description: 'Update a goal (pct is manual — the app does not compute it).',
      inputSchema: {
        goalId: z.string(),
        name: z.string().optional(),
        detail: z.string().optional(),
        pct: z.number().int().min(0).max(100).optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ goalId, ...patch }) => ok('Updated goal.', { goal: svc.updateGoal(goalId, patch) }),
  )
  server.registerTool(
    'get_goal',
    {
      title: 'Get goal detail',
      description: 'A goal with its linked-task counts and the tasks feeding it.',
      inputSchema: { goalId: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ goalId }) => {
      const d = svc.getGoalDetail(goalId)
      return ok(
        `${d.goal.name}: ${d.goal.pct}% · ${d.goal.taskDone}/${d.goal.taskTotal} linked tasks done.`,
        d as unknown as Record<string, unknown>,
      )
    },
  )
  server.registerTool(
    'delete_goal',
    {
      title: 'Delete goal',
      description: 'Delete a goal; linked tasks stay but lose the link.',
      inputSchema: { goalId: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ goalId }) => {
      svc.deleteGoal(goalId)
      return ok('Deleted goal.')
    },
  )

  // Routines
  server.registerTool(
    'list_routines',
    {
      title: 'List routines',
      description: "Morning/evening routines with today's check-state.",
      annotations: { readOnlyHint: true },
    },
    async () => ok('routines', { routines: svc.listRoutines() }),
  )
  server.registerTool(
    'create_routine',
    {
      title: 'Create routine step',
      description: 'Add a step to the morning or evening routine template.',
      inputSchema: {
        period: z.enum(ROUTINE_PERIODS),
        text: z.string().trim().min(1).max(200),
      },
    },
    async ({ period, text }) =>
      ok(`Added ${period} routine step.`, { routines: svc.createRoutine({ period, text }) }),
  )
  server.registerTool(
    'check_routine_item',
    {
      title: 'Check routine item',
      description: "Toggle a routine item's done-state for today.",
      inputSchema: { routineId: z.string() },
    },
    async ({ routineId }) =>
      ok('Toggled routine item.', { routines: svc.toggleRoutineCheck(routineId) }),
  )
  server.registerTool(
    'delete_routine',
    {
      title: 'Delete routine step',
      description: 'Remove a routine step from its period; its check history goes too.',
      inputSchema: { routineId: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ routineId }) =>
      ok('Deleted routine step.', { routines: svc.deleteRoutine(routineId) }),
  )

  // Meetings
  server.registerTool(
    'list_meetings',
    {
      title: 'List meetings',
      description: 'The agenda, earliest first.',
      annotations: { readOnlyHint: true },
    },
    async () => ok('meetings', { meetings: svc.listMeetings() }),
  )
  server.registerTool(
    'create_meeting',
    {
      title: 'Create meeting',
      description: 'Add a meeting. startsAt is an ISO-8601 timestamp.',
      inputSchema: {
        title: z.string().trim().min(1),
        startsAt: z.string(),
        who: z.string().optional(),
      },
    },
    async ({ title, startsAt, who }) =>
      ok(`Added "${title}".`, { meeting: svc.createMeeting({ title, startsAt, who }) }),
  )
  server.registerTool(
    'delete_meeting',
    {
      title: 'Delete meeting',
      description: 'Remove a meeting.',
      inputSchema: { meetingId: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ meetingId }) => {
      svc.deleteMeeting(meetingId)
      return ok('Deleted meeting.')
    },
  )

  // Notes
  server.registerTool(
    'list_notes',
    {
      title: 'List notes',
      description: 'Freeform sticky notes.',
      annotations: { readOnlyHint: true },
    },
    async () => ok('notes', { notes: svc.listNotes() }),
  )
  server.registerTool(
    'create_note',
    {
      title: 'Create note',
      description: 'Add a freeform note.',
      inputSchema: { text: z.string().trim().min(1), color: z.string().optional() },
    },
    async ({ text, color }) => ok('Added note.', { note: svc.createNote({ text, color }) }),
  )
  server.registerTool(
    'update_note',
    {
      title: 'Update note',
      description: 'Edit a note.',
      inputSchema: {
        noteId: z.string(),
        text: z.string().optional(),
        color: z.string().nullable().optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ noteId, text, color }) =>
      ok('Updated note.', { note: svc.updateNote(noteId, { text, color }) }),
  )
  server.registerTool(
    'delete_note',
    {
      title: 'Delete note',
      description: 'Delete a note.',
      inputSchema: { noteId: z.string() },
      annotations: { destructiveHint: true },
    },
    async ({ noteId }) => {
      svc.deleteNote(noteId)
      return ok('Deleted note.')
    },
  )

  // Docs
  server.registerTool(
    'list_docs',
    {
      title: 'List docs',
      description: 'Doc metadata (no bodies).',
      annotations: { readOnlyHint: true },
    },
    async () => ok('docs', { docs: svc.listDocs() }),
  )
  server.registerTool(
    'read_doc',
    {
      title: 'Read doc',
      description: 'Full markdown body of a doc.',
      inputSchema: { docId: z.string() },
      annotations: { readOnlyHint: true },
    },
    async ({ docId }) => {
      const doc = svc.getDoc(docId)
      return ok(`Doc "${doc.title}".`, { doc })
    },
  )
  server.registerTool(
    'create_doc',
    {
      title: 'Create doc',
      description: 'Create a markdown doc.',
      inputSchema: {
        title: z.string().trim().min(1),
        tag: z.string().optional(),
        bodyMd: z.string().optional(),
      },
    },
    async ({ title, tag, bodyMd }) =>
      ok(`Created doc "${title}".`, { doc: svc.createDoc({ title, tag, bodyMd: bodyMd ?? '' }) }),
  )
  server.registerTool(
    'update_doc',
    {
      title: 'Update doc',
      description: 'Edit a doc.',
      inputSchema: {
        docId: z.string(),
        title: z.string().optional(),
        tag: z.string().optional(),
        bodyMd: z.string().optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ docId, ...patch }) => ok('Updated doc.', { doc: svc.updateDoc(docId, patch) }),
  )

  // Canvas
  server.registerTool(
    'list_canvas',
    {
      title: 'List canvas',
      description: 'Canvas cards and the edges connecting them.',
      annotations: { readOnlyHint: true },
    },
    async () => ok('canvas', svc.listCanvas() as unknown as Record<string, unknown>),
  )
  server.registerTool(
    'create_canvas_card',
    {
      title: 'Create canvas card',
      description: 'Add a card to the spatial canvas.',
      inputSchema: {
        text: z.string().optional(),
        color: z.string().optional(),
        x: z.number().optional(),
        y: z.number().optional(),
      },
    },
    async (input) => ok('Added card.', { card: svc.createCanvasCard(input) }),
  )
  server.registerTool(
    'move_canvas_card',
    {
      title: 'Move canvas card',
      description: 'Reposition a card (also edits text/color).',
      inputSchema: {
        cardId: z.string(),
        x: z.number().optional(),
        y: z.number().optional(),
        text: z.string().optional(),
        color: z.string().optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ cardId, ...patch }) =>
      ok('Moved card.', { card: svc.updateCanvasCard(cardId, patch) }),
  )
  server.registerTool(
    'connect_canvas_cards',
    {
      title: 'Connect canvas cards',
      description: 'Draw an edge between two cards.',
      inputSchema: { fromCardId: z.string(), toCardId: z.string() },
    },
    async ({ fromCardId, toCardId }) =>
      ok('Connected cards.', { edge: svc.connectCanvasCards({ fromCardId, toCardId }) }),
  )
  server.registerTool(
    'promote_canvas_card',
    {
      title: 'Promote canvas card',
      description: 'Turn a card into a task or a note.',
      inputSchema: { cardId: z.string(), to: z.enum(PROMOTE_TARGETS) },
    },
    async ({ cardId, to }) => {
      const res = svc.promoteCanvasCard(cardId, { to })
      return ok(`Promoted card to ${to}.`, res as unknown as Record<string, unknown>)
    },
  )

  // Vision
  server.registerTool(
    'list_vision',
    {
      title: 'List vision tiles',
      description: 'The vision board.',
      annotations: { readOnlyHint: true },
    },
    async () => ok('vision', { tiles: svc.listVision() }),
  )
  server.registerTool(
    'update_vision_tile',
    {
      title: 'Update vision tile',
      description: 'Edit a tile’s tag or caption (images upload via the web UI).',
      inputSchema: {
        tileId: z.string(),
        tag: z.string().optional(),
        caption: z.string().optional(),
      },
      annotations: { idempotentHint: true },
    },
    async ({ tileId, tag, caption }) =>
      ok('Updated tile.', { tile: svc.updateVisionTile(tileId, { tag, caption }) }),
  )

  // Review
  server.registerTool(
    'weekly_review',
    {
      title: 'Weekly review',
      description:
        'A read-only digest: wins this week, focus minutes, stale someday items, inbox leftovers, goal/project state.',
      annotations: { readOnlyHint: true },
    },
    async () => {
      const r = svc.weeklyReview()
      return ok(
        `${r.completedThisWeek.length} done this week · ${r.focusMinutes}m focus.`,
        r as unknown as Record<string, unknown>,
      )
    },
  )
}

function registerResources(server: McpServer, svc: BeaconService): void {
  const json = (uri: URL, data: unknown) => ({
    contents: [
      { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(data, null, 2) },
    ],
  })

  server.registerResource(
    'overview',
    'beacon://overview',
    {
      title: 'Overview',
      description: 'The Overview screen payload.',
      mimeType: 'application/json',
    },
    async (uri) => json(uri, svc.getOverview()),
  )
  server.registerResource(
    'inbox',
    'beacon://inbox',
    { title: 'Inbox', description: 'Current un-triaged inbox.', mimeType: 'application/json' },
    async (uri) => json(uri, svc.listInbox()),
  )
  server.registerResource(
    'today',
    'beacon://tasks/today',
    {
      title: "Today's tasks",
      description: "Today's tasks with steps.",
      mimeType: 'application/json',
    },
    async (uri) => json(uri, svc.listTaskGroups().find((g) => g.key === 'today')?.tasks ?? []),
  )
}

function registerPrompts(server: McpServer): void {
  const userText = (text: string) => ({
    messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }],
  })

  server.registerPrompt(
    'daily-triage',
    {
      title: 'Daily triage',
      description: 'Walk the inbox item by item, then propose today’s top 3.',
    },
    () =>
      userText(
        'Help me triage. Call list_inbox, then for each item propose triage (with a due bucket ' +
          'and a rough estimate) or dismiss — one at a time, waiting for my yes/no. When the inbox ' +
          'is clear, call get_overview and propose my top 3 for today given my energy, then ' +
          'plan_my_day with that order. Keep it kind and low-pressure.',
      ),
  )

  server.registerPrompt(
    'break-it-down',
    {
      title: 'Break it down',
      description: 'Turn one task into 3–7 tiny concrete steps.',
      argsSchema: { taskId: z.string().optional() },
    },
    ({ taskId }) =>
      userText(
        `Break a task into 3–7 tiny, concrete steps (each ≤ 15 minutes). ${
          taskId ? `The task id is ${taskId}. ` : 'Ask me which task if unclear. '
        }Ask a clarifying question only if you truly need to, then call break_down_task.`,
      ),
  )

  server.registerPrompt(
    'brain-dump',
    { title: 'Brain dump', description: 'Free-associate; capture everything, triage later.' },
    () =>
      userText(
        'I’m going to brain-dump. Capture everything I say with capture_thought, one call per ' +
          'distinct thought, with zero judgment and no triage. When I’m done, offer to run daily-triage.',
      ),
  )

  server.registerPrompt(
    'weekly-review',
    { title: 'Weekly review', description: 'Celebrate wins, clear stale items, set next week.' },
    () =>
      userText(
        'Run weekly_review. Celebrate the wins first (be genuinely kind). Then walk the stale ' +
          'Someday items and any inbox leftovers, proposing keep/dismiss for each. Offer to update ' +
          'goal percents, and draft a short focus for next week.',
      ),
  )
}
