import { and, asc, eq, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { DUE_BUCKETS } from './enums.ts'
import type { Due, EnergyLevel, Priority, RoutinePeriod } from './enums.ts'
import { NotFoundError } from './errors.ts'
import type { BeaconTopic, Emit } from './events.ts'
import { newId } from './ids.ts'
import {
  appState,
  canvasCards,
  canvasEdges,
  docs,
  focusSessions,
  goals,
  inboxItems,
  meetings,
  notes,
  projects,
  routineChecks,
  routines,
  type schema,
  taskSteps,
  taskTags,
  tasks,
  visionTiles,
} from './schema.ts'
import type {
  CanvasCard,
  CanvasEdge,
  Doc,
  FocusSession,
  Goal,
  InboxItem,
  Meeting,
  Note,
  Project,
  TaskStep,
  TaskWithDetail,
  VisionTile,
} from './types.ts'
import type {
  ConnectCanvasInput,
  CreateCanvasCardInput,
  CreateDocInput,
  CreateGoalInput,
  CreateMeetingInput,
  CreateNoteInput,
  CreateProjectInput,
  CreateTaskInput,
  FinishFocusInput,
  PromoteCanvasInput,
  StartFocusInput,
  TriageInboxInput,
  UpdateCanvasCardInput,
  UpdateDocInput,
  UpdateGoalInput,
  UpdateNoteInput,
  UpdateProjectInput,
  UpdateTaskInput,
  UpdateVisionTileInput,
} from './validators.ts'

/** The Drizzle database handle the services operate on. */
export type BeaconDb = BetterSQLite3Database<typeof schema>

/** A group of tasks in the Tasks view (Today / Upcoming / Someday). */
export type TaskGroup = {
  key: 'today' | 'upcoming' | 'someday'
  label: string
  openCount: number
  tasks: TaskWithDetail[]
}

const iso = () => new Date().toISOString()

/** Local calendar date (YYYY-MM-DD) for a Date — the unit streaks count in. */
function localDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** N days before the given local date, as YYYY-MM-DD. */
function shiftDate(base: Date, deltaDays: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + deltaDays)
  return localDate(d)
}

/** Local time as "H:MM" (24-hour, no leading zero on hour) — matches the mock. */
function formatTime(iso8601: string): string {
  const d = new Date(iso8601)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Which group a due bucket falls into (upcoming = tomorrow + this week). */
function groupKeyForDue(due: Due): TaskGroup['key'] {
  if (due === 'today') return 'today'
  if (due === 'someday') return 'someday'
  return 'upcoming'
}

/** A project with its computed completion stats (never stored redundantly). */
export type ProjectWithStats = Project & { done: number; total: number; pct: number }

/** The canvas: freeform cards plus the edges connecting them. */
export type CanvasBoard = { cards: CanvasCard[]; edges: CanvasEdge[] }

/** The weekly-review digest (celebrate first, then loose ends). */
export type WeeklyReview = {
  completedThisWeek: { id: string; title: string }[]
  focusMinutes: number
  staleSomeday: { id: string; title: string }[]
  inboxCount: number
  goals: { name: string; pct: number }[]
  projects: { name: string; pct: number }[]
}

/** Doc metadata (no body) for the list view. */
export type DocMeta = Omit<Doc, 'bodyMd'>

/** One routine period with today's check-state resolved and progress computed. */
export type RoutineView = {
  period: RoutinePeriod
  done: number
  total: number
  items: { id: string; text: string; done: boolean }[]
}

/** The "right now" suggestion — one open Today task, project, and estimate. */
export type RightNow = {
  taskId: string
  title: string
  project: string | null
  estMinutes: number | null
}

/** Everything the Overview screen and the MCP `get_overview` tool return. */
export type Overview = {
  today: { open: number; done: number; total: number; pct: number }
  rightNow: RightNow | null
  nudge: string
  energy: EnergyLevel | null
  streak: number
  week: { date: string; active: boolean }[]
  nextMeeting: { time: string; title: string; who: string } | null
  inboxCount: number
}

/**
 * The Beacon service layer — all business logic lives here (docs/PLAN.md §5),
 * so the REST API and the MCP server stay thin and always agree. Every method
 * is synchronous: better-sqlite3 is synchronous, which keeps handlers simple.
 */
export function createService(db: BeaconDb, emit: Emit = () => {}) {
  /** Emit an invalidation event for the given topics (no-op if no emitter). */
  function fire(...topics: BeaconTopic[]): void {
    emit({ type: 'invalidate', topics })
  }

  /** Assemble a task with its ordered steps and tags. Throws if missing. */
  function taskDetail(id: string): TaskWithDetail {
    const task = db.select().from(tasks).where(eq(tasks.id, id)).get()
    if (!task) throw new NotFoundError('task', id)
    const steps = db
      .select()
      .from(taskSteps)
      .where(eq(taskSteps.taskId, id))
      .orderBy(asc(taskSteps.sortOrder))
      .all()
    const tagRows = db.select().from(taskTags).where(eq(taskTags.taskId, id)).all()
    return { ...task, steps, tags: tagRows.map((t) => t.tag) }
  }

  /** Smallest sort_order among a group's tasks, minus one (new tasks go on top). */
  function topOfGroup(key: TaskGroup['key']): number {
    const rows = db.select({ sortOrder: tasks.sortOrder, due: tasks.due }).from(tasks).all()
    const inGroup = rows.filter((r) => groupKeyForDue(r.due) === key)
    if (inGroup.length === 0) return 0
    return Math.min(...inGroup.map((r) => r.sortOrder)) - 1
  }

  return {
    // --- Capture & triage --------------------------------------------------
    capture(text: string): InboxItem {
      const row = { id: newId(), text, createdAt: iso() }
      db.insert(inboxItems).values(row).run()
      fire('inbox', 'overview')
      return row
    },

    listInbox(): InboxItem[] {
      return db.select().from(inboxItems).orderBy(asc(inboxItems.createdAt)).all()
    },

    triageInboxItem(inboxId: string, input: TriageInboxInput): TaskWithDetail {
      const item = db.select().from(inboxItems).where(eq(inboxItems.id, inboxId)).get()
      if (!item) throw new NotFoundError('inbox item', inboxId)
      const task = this.createTask({
        title: item.text,
        due: input.due,
        priority: input.priority ?? 'low',
        estMinutes: input.estMinutes,
        projectId: input.projectId,
      })
      db.delete(inboxItems).where(eq(inboxItems.id, inboxId)).run()
      fire('inbox', 'tasks', 'overview')
      return task
    },

    dismissInboxItem(inboxId: string): void {
      const res = db.delete(inboxItems).where(eq(inboxItems.id, inboxId)).run()
      if (res.changes === 0) throw new NotFoundError('inbox item', inboxId)
      fire('inbox', 'overview')
    },

    // --- Tasks -------------------------------------------------------------
    listTaskGroups(): TaskGroup[] {
      const all = db.select().from(tasks).orderBy(asc(tasks.sortOrder), asc(tasks.createdAt)).all()
      const stepsByTask = new Map<string, TaskStep[]>()
      for (const s of db.select().from(taskSteps).orderBy(asc(taskSteps.sortOrder)).all()) {
        const list = stepsByTask.get(s.taskId) ?? []
        list.push(s)
        stepsByTask.set(s.taskId, list)
      }
      const tagsByTask = new Map<string, string[]>()
      for (const t of db.select().from(taskTags).all()) {
        const list = tagsByTask.get(t.taskId) ?? []
        list.push(t.tag)
        tagsByTask.set(t.taskId, list)
      }
      const detailed: TaskWithDetail[] = all.map((t) => ({
        ...t,
        steps: stepsByTask.get(t.id) ?? [],
        tags: tagsByTask.get(t.id) ?? [],
      }))
      const groups: TaskGroup[] = [
        { key: 'today', label: 'Today', openCount: 0, tasks: [] },
        { key: 'upcoming', label: 'Upcoming', openCount: 0, tasks: [] },
        { key: 'someday', label: 'Someday', openCount: 0, tasks: [] },
      ]
      const byKey = new Map(groups.map((g) => [g.key, g]))
      for (const t of detailed) {
        const g = byKey.get(groupKeyForDue(t.due))
        if (!g) continue
        g.tasks.push(t)
        if (!t.done) g.openCount += 1
      }
      return groups
    },

    getTask(id: string): TaskWithDetail {
      return taskDetail(id)
    },

    createTask(input: CreateTaskInput): TaskWithDetail {
      const id = newId()
      const due: Due = input.due ?? 'today'
      const now = iso()
      db.insert(tasks)
        .values({
          id,
          title: input.title,
          due,
          priority: input.priority ?? 'low',
          estMinutes: input.estMinutes ?? null,
          projectId: input.projectId ?? null,
          goalId: input.goalId ?? null,
          note: input.note ?? '',
          sortOrder: topOfGroup(groupKeyForDue(due)),
          createdAt: now,
          updatedAt: now,
        })
        .run()
      if (input.tags?.length) {
        db.insert(taskTags)
          .values(input.tags.map((tag) => ({ taskId: id, tag })))
          .run()
      }
      if (input.steps?.length) {
        db.insert(taskSteps)
          .values(input.steps.map((text, i) => ({ id: newId(), taskId: id, text, sortOrder: i })))
          .run()
      }
      fire('tasks', 'overview')
      return taskDetail(id)
    },

    updateTask(id: string, patch: UpdateTaskInput): TaskWithDetail {
      const existing = db.select().from(tasks).where(eq(tasks.id, id)).get()
      if (!existing) throw new NotFoundError('task', id)
      const next: Partial<typeof tasks.$inferInsert> = { updatedAt: iso() }
      if (patch.title !== undefined) next.title = patch.title
      if (patch.due !== undefined) next.due = patch.due
      if (patch.priority !== undefined) next.priority = patch.priority
      if (patch.estMinutes !== undefined) next.estMinutes = patch.estMinutes
      if (patch.projectId !== undefined) next.projectId = patch.projectId
      if (patch.goalId !== undefined) next.goalId = patch.goalId
      if (patch.note !== undefined) next.note = patch.note
      if (patch.done !== undefined) {
        next.done = patch.done
        next.doneAt = patch.done ? iso() : null
      }
      db.update(tasks).set(next).where(eq(tasks.id, id)).run()
      fire('tasks', 'overview')
      return taskDetail(id)
    },

    toggleTask(id: string): TaskWithDetail {
      const existing = db.select().from(tasks).where(eq(tasks.id, id)).get()
      if (!existing) throw new NotFoundError('task', id)
      const done = !existing.done
      db.update(tasks)
        .set({ done, doneAt: done ? iso() : null, updatedAt: iso() })
        .where(eq(tasks.id, id))
        .run()
      fire('tasks', 'overview')
      return taskDetail(id)
    },

    cycleDue(id: string): TaskWithDetail {
      const existing = db.select().from(tasks).where(eq(tasks.id, id)).get()
      if (!existing) throw new NotFoundError('task', id)
      const idx = DUE_BUCKETS.indexOf(existing.due)
      const due = DUE_BUCKETS[(idx + 1) % DUE_BUCKETS.length]
      db.update(tasks).set({ due, updatedAt: iso() }).where(eq(tasks.id, id)).run()
      fire('tasks', 'overview')
      return taskDetail(id)
    },

    cyclePriority(id: string): TaskWithDetail {
      const existing = db.select().from(tasks).where(eq(tasks.id, id)).get()
      if (!existing) throw new NotFoundError('task', id)
      // low → med → high, matching the mock's cycle order.
      const order: Priority[] = ['low', 'med', 'high']
      const idx = order.indexOf(existing.priority)
      const priority = order[(idx + 1) % order.length] ?? 'low'
      db.update(tasks).set({ priority, updatedAt: iso() }).where(eq(tasks.id, id)).run()
      fire('tasks', 'overview')
      return taskDetail(id)
    },

    addSteps(id: string, steps: string[]): TaskWithDetail {
      const existing = db.select().from(tasks).where(eq(tasks.id, id)).get()
      if (!existing) throw new NotFoundError('task', id)
      const max = db
        .select({ v: sql<number | null>`max(${taskSteps.sortOrder})` })
        .from(taskSteps)
        .where(eq(taskSteps.taskId, id))
        .get()
      let order = (max?.v ?? -1) + 1
      db.insert(taskSteps)
        .values(steps.map((text) => ({ id: newId(), taskId: id, text, sortOrder: order++ })))
        .run()
      db.update(tasks).set({ updatedAt: iso() }).where(eq(tasks.id, id)).run()
      fire('tasks', 'overview')
      return taskDetail(id)
    },

    toggleStep(taskId: string, stepId: string): TaskWithDetail {
      const step = db
        .select()
        .from(taskSteps)
        .where(and(eq(taskSteps.id, stepId), eq(taskSteps.taskId, taskId)))
        .get()
      if (!step) throw new NotFoundError('step', stepId)
      db.update(taskSteps).set({ done: !step.done }).where(eq(taskSteps.id, stepId)).run()
      db.update(tasks).set({ updatedAt: iso() }).where(eq(tasks.id, taskId)).run()
      fire('tasks', 'overview')
      return taskDetail(taskId)
    },

    /**
     * Reorder one group. The client sends the group's task ids in their new
     * order; we reassign the same set of sort_order slots in that order, which
     * preserves interleaving with the other groups (matching the mock).
     */
    reorderGroup(key: TaskGroup['key'], orderedIds: string[]): void {
      const all = db.select().from(tasks).orderBy(asc(tasks.sortOrder)).all()
      const inGroup = all.filter((t) => groupKeyForDue(t.due) === key)
      const slots = inGroup.map((t) => t.sortOrder)
      const currentIds = new Set(inGroup.map((t) => t.id))
      const finalIds = orderedIds.filter((id) => currentIds.has(id))
      for (const t of inGroup) if (!finalIds.includes(t.id)) finalIds.push(t.id)
      const now = iso()
      db.transaction((tx) => {
        finalIds.forEach((id, i) => {
          tx.update(tasks)
            .set({ sortOrder: slots[i] ?? i, updatedAt: now })
            .where(eq(tasks.id, id))
            .run()
        })
      })
      fire('tasks', 'overview')
    },

    // --- App state (energy, rollover marker) -------------------------------
    getState(key: string): string | null {
      return db.select().from(appState).where(eq(appState.key, key)).get()?.value ?? null
    },

    setState(key: string, value: string | null): void {
      db.insert(appState)
        .values({ key, value })
        .onConflictDoUpdate({ target: appState.key, set: { value } })
        .run()
    },

    getEnergy(): EnergyLevel | null {
      const v = this.getState('energy')
      return v === 'low' || v === 'medium' || v === 'high' ? v : null
    },

    setEnergy(level: EnergyLevel): void {
      this.setState('energy', level)
      fire('overview')
    },

    // --- Focus sessions ----------------------------------------------------
    startFocus(input: StartFocusInput): FocusSession {
      let taskTitle = 'Deep work'
      if (input.taskId) {
        const task = db.select().from(tasks).where(eq(tasks.id, input.taskId)).get()
        if (!task) throw new NotFoundError('task', input.taskId)
        taskTitle = task.title
      }
      const row = {
        id: newId(),
        taskId: input.taskId ?? null,
        taskTitle,
        plannedMinutes: input.minutes ?? 25,
        actualSeconds: 0,
        startedAt: iso(),
        endedAt: null,
        completed: false,
      }
      db.insert(focusSessions).values(row).run()
      emit({ type: 'focus:start', session: row })
      return row
    },

    finishFocus(sessionId: string, input: FinishFocusInput): FocusSession {
      const session = db.select().from(focusSessions).where(eq(focusSessions.id, sessionId)).get()
      if (!session) throw new NotFoundError('focus session', sessionId)
      const endedAt = iso()
      const actualSeconds =
        input.actualSeconds ??
        Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(session.startedAt)) / 1000))
      db.update(focusSessions)
        .set({ completed: input.completed, endedAt, actualSeconds })
        .where(eq(focusSessions.id, sessionId))
        .run()
      if (input.markTaskDone && session.taskId) {
        db.update(tasks)
          .set({ done: true, doneAt: endedAt, updatedAt: endedAt })
          .where(eq(tasks.id, session.taskId))
          .run()
      }
      emit({ type: 'focus:finish', sessionId })
      fire('tasks', 'overview')
      return { ...session, completed: input.completed, endedAt, actualSeconds }
    },

    // --- Daily rollover ----------------------------------------------------
    /**
     * Runs once per local day on first read. Promotes 'tomorrow' tasks into
     * 'today' (the horizon has arrived). Routine check-state resets for free —
     * checks are keyed by date, so a new day simply has none. Streaks are
     * derived, so nothing to persist there. No overdue/red states (principle 7).
     */
    runDailyRollover(): { rolled: boolean } {
      const today = localDate(new Date())
      const last = this.getState('last_rollover_date')
      if (last === today) return { rolled: false }
      if (last !== null) {
        db.update(tasks)
          .set({ due: 'today', updatedAt: iso() })
          .where(eq(tasks.due, 'tomorrow'))
          .run()
        fire('tasks', 'overview')
      }
      this.setState('last_rollover_date', today)
      return { rolled: last !== null }
    },

    // --- Overview & streak -------------------------------------------------
    getOverview(): Overview {
      const now = new Date()
      const todayAll = db.select().from(tasks).where(eq(tasks.due, 'today')).all()
      const doneToday = todayAll.filter((t) => t.done).length
      const total = todayAll.length
      const open = total - doneToday
      const pct = total > 0 ? Math.round((doneToday / total) * 100) : 0

      const energy = this.getEnergy()
      const openToday = db
        .select()
        .from(tasks)
        .where(and(eq(tasks.due, 'today'), eq(tasks.done, false)))
        .orderBy(asc(tasks.sortOrder))
        .all()
      // Low energy → suggest the shortest-estimate task; otherwise the top task.
      let pick = openToday[0]
      if (energy === 'low' && openToday.length > 0) {
        pick = [...openToday].sort(
          (a, b) =>
            (a.estMinutes ?? Number.POSITIVE_INFINITY) - (b.estMinutes ?? Number.POSITIVE_INFINITY),
        )[0]
      }
      let rightNow: RightNow | null = null
      if (pick) {
        const project = pick.projectId
          ? (db.select().from(projects).where(eq(projects.id, pick.projectId)).get()?.name ?? null)
          : null
        rightNow = { taskId: pick.id, title: pick.title, project, estMinutes: pick.estMinutes }
      }

      const nudge = rightNow
        ? `You have ${open} ${open === 1 ? 'thing' : 'things'} left today. That's enough. Start with this one and ignore the rest for now.`
        : 'Everything for today is handled. Capture any loose thoughts up top, or take the win and step away.'

      // Streak: local dates with a completed task or a completed focus session.
      const active = new Set<string>()
      for (const t of db.select().from(tasks).where(eq(tasks.done, true)).all()) {
        if (t.doneAt) active.add(localDate(new Date(t.doneAt)))
      }
      for (const f of db
        .select()
        .from(focusSessions)
        .where(eq(focusSessions.completed, true))
        .all()) {
        active.add(localDate(new Date(f.endedAt ?? f.startedAt)))
      }
      // Routine completions also feed the streak (docs/PLAN.md §2.7); the date
      // column is already a local YYYY-MM-DD.
      for (const rc of db.select().from(routineChecks).where(eq(routineChecks.done, true)).all()) {
        active.add(rc.date)
      }
      const week = Array.from({ length: 7 }, (_, i) => {
        const date = shiftDate(now, i - 6)
        return { date, active: active.has(date) }
      })
      // Count consecutive active days ending today (or yesterday — be kind).
      let streak = 0
      let cursor = active.has(localDate(now)) ? 0 : active.has(shiftDate(now, -1)) ? -1 : null
      while (cursor !== null && active.has(shiftDate(now, cursor))) {
        streak += 1
        cursor -= 1
      }

      const nowIso = iso()
      const upcoming = db
        .select()
        .from(meetings)
        .orderBy(asc(meetings.startsAt))
        .all()
        .find((m) => m.startsAt >= nowIso)
      const nextMeeting = upcoming
        ? { time: formatTime(upcoming.startsAt), title: upcoming.title, who: upcoming.who }
        : null

      const inboxCount = db.select({ n: sql<number>`count(*)` }).from(inboxItems).get()?.n ?? 0

      return {
        today: { open, done: doneToday, total, pct },
        rightNow,
        nudge,
        energy,
        streak,
        week,
        nextMeeting,
        inboxCount,
      }
    },

    deleteTask(id: string): void {
      const res = db.delete(tasks).where(eq(tasks.id, id)).run()
      if (res.changes === 0) throw new NotFoundError('task', id)
      fire('tasks', 'overview')
    },

    // --- Projects ----------------------------------------------------------
    listProjects(): ProjectWithStats[] {
      const rows = db
        .select()
        .from(projects)
        .where(eq(projects.archived, false))
        .orderBy(asc(projects.createdAt))
        .all()
      const counts = db
        .select({
          projectId: tasks.projectId,
          total: sql<number>`count(*)`,
          done: sql<number>`sum(case when ${tasks.done} then 1 else 0 end)`,
        })
        .from(tasks)
        .groupBy(tasks.projectId)
        .all()
      const byId = new Map(counts.map((c) => [c.projectId, c]))
      return rows.map((p) => {
        const c = byId.get(p.id)
        const total = c?.total ?? 0
        const done = Number(c?.done ?? 0)
        return { ...p, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
      })
    },

    createProject(input: CreateProjectInput): Project {
      const row = {
        id: newId(),
        name: input.name,
        color: input.color,
        dueLabel: input.dueLabel ?? '',
        archived: false,
        createdAt: iso(),
      }
      db.insert(projects).values(row).run()
      fire('projects')
      return row
    },

    updateProject(id: string, patch: UpdateProjectInput): Project {
      const existing = db.select().from(projects).where(eq(projects.id, id)).get()
      if (!existing) throw new NotFoundError('project', id)
      db.update(projects).set(patch).where(eq(projects.id, id)).run()
      fire('projects', 'tasks')
      return { ...existing, ...patch }
    },

    // --- Goals -------------------------------------------------------------
    listGoals(): Goal[] {
      return db.select().from(goals).orderBy(asc(goals.createdAt)).all()
    },

    createGoal(input: CreateGoalInput): Goal {
      const row = {
        id: newId(),
        name: input.name,
        detail: input.detail ?? '',
        pct: input.pct ?? 0,
        createdAt: iso(),
      }
      db.insert(goals).values(row).run()
      fire('goals')
      return row
    },

    updateGoal(id: string, patch: UpdateGoalInput): Goal {
      const existing = db.select().from(goals).where(eq(goals.id, id)).get()
      if (!existing) throw new NotFoundError('goal', id)
      db.update(goals).set(patch).where(eq(goals.id, id)).run()
      fire('goals')
      return { ...existing, ...patch }
    },

    // --- Routines (check-state is per-day; template persists) --------------
    listRoutines(date = localDate(new Date())): RoutineView[] {
      const rows = db.select().from(routines).orderBy(asc(routines.sortOrder)).all()
      const checks = db.select().from(routineChecks).where(eq(routineChecks.date, date)).all()
      const doneSet = new Set(checks.filter((c) => c.done).map((c) => c.routineId))
      const periods: RoutinePeriod[] = ['morning', 'evening']
      return periods.map((period) => {
        const items = rows
          .filter((r) => r.period === period)
          .map((r) => ({ id: r.id, text: r.text, done: doneSet.has(r.id) }))
        return { period, done: items.filter((i) => i.done).length, total: items.length, items }
      })
    },

    toggleRoutineCheck(routineId: string, date = localDate(new Date())): RoutineView[] {
      const routine = db.select().from(routines).where(eq(routines.id, routineId)).get()
      if (!routine) throw new NotFoundError('routine', routineId)
      const existing = db
        .select()
        .from(routineChecks)
        .where(and(eq(routineChecks.routineId, routineId), eq(routineChecks.date, date)))
        .get()
      if (existing) {
        db.update(routineChecks)
          .set({ done: !existing.done })
          .where(and(eq(routineChecks.routineId, routineId), eq(routineChecks.date, date)))
          .run()
      } else {
        db.insert(routineChecks).values({ routineId, date, done: true }).run()
      }
      fire('routines', 'overview')
      return this.listRoutines(date)
    },

    // --- Meetings ----------------------------------------------------------
    listMeetings(): Meeting[] {
      return db.select().from(meetings).orderBy(asc(meetings.startsAt)).all()
    },

    createMeeting(input: CreateMeetingInput): Meeting {
      const row = {
        id: newId(),
        title: input.title,
        startsAt: input.startsAt,
        who: input.who ?? '',
        createdAt: iso(),
      }
      db.insert(meetings).values(row).run()
      fire('meetings', 'overview')
      return row
    },

    deleteMeeting(id: string): void {
      const res = db.delete(meetings).where(eq(meetings.id, id)).run()
      if (res.changes === 0) throw new NotFoundError('meeting', id)
      fire('meetings', 'overview')
    },

    // --- Docs (list = metadata; read = full body) --------------------------
    listDocs(): DocMeta[] {
      return db
        .select({
          id: docs.id,
          title: docs.title,
          tag: docs.tag,
          createdAt: docs.createdAt,
          updatedAt: docs.updatedAt,
        })
        .from(docs)
        .orderBy(sql`${docs.updatedAt} desc`)
        .all()
    },

    getDoc(id: string): Doc {
      const doc = db.select().from(docs).where(eq(docs.id, id)).get()
      if (!doc) throw new NotFoundError('doc', id)
      return doc
    },

    createDoc(input: CreateDocInput): Doc {
      const now = iso()
      const row = {
        id: newId(),
        title: input.title,
        tag: input.tag ?? '',
        bodyMd: input.bodyMd ?? '',
        createdAt: now,
        updatedAt: now,
      }
      db.insert(docs).values(row).run()
      fire('docs')
      return row
    },

    updateDoc(id: string, patch: UpdateDocInput): Doc {
      const existing = db.select().from(docs).where(eq(docs.id, id)).get()
      if (!existing) throw new NotFoundError('doc', id)
      const next = { ...patch, updatedAt: iso() }
      db.update(docs).set(next).where(eq(docs.id, id)).run()
      fire('docs')
      return { ...existing, ...next }
    },

    // --- Notes -------------------------------------------------------------
    listNotes(): Note[] {
      return db.select().from(notes).orderBy(sql`${notes.updatedAt} desc`).all()
    },

    createNote(input: CreateNoteInput): Note {
      const now = iso()
      const row = {
        id: newId(),
        text: input.text,
        color: input.color ?? null,
        createdAt: now,
        updatedAt: now,
      }
      db.insert(notes).values(row).run()
      fire('notes')
      return row
    },

    updateNote(id: string, patch: UpdateNoteInput): Note {
      const existing = db.select().from(notes).where(eq(notes.id, id)).get()
      if (!existing) throw new NotFoundError('note', id)
      const next = { ...patch, updatedAt: iso() }
      db.update(notes).set(next).where(eq(notes.id, id)).run()
      fire('notes')
      return { ...existing, ...next }
    },

    deleteNote(id: string): void {
      const res = db.delete(notes).where(eq(notes.id, id)).run()
      if (res.changes === 0) throw new NotFoundError('note', id)
      fire('notes')
    },

    // --- Canvas ------------------------------------------------------------
    listCanvas(): CanvasBoard {
      const cards = db.select().from(canvasCards).orderBy(asc(canvasCards.createdAt)).all()
      const edges = db.select().from(canvasEdges).all()
      return { cards, edges }
    },

    createCanvasCard(input: CreateCanvasCardInput): CanvasCard {
      const palette = ['#7c8cff', '#5ec98a', '#e0a05a', '#c98ad6', '#e07a8a']
      const n = db.select({ n: sql<number>`count(*)` }).from(canvasCards).get()?.n ?? 0
      const row = {
        id: newId(),
        x: input.x ?? 50 + (n % 4) * 70,
        y: input.y ?? 50 + (n % 3) * 60,
        text: input.text ?? '',
        color: input.color ?? (palette[n % palette.length] as string),
        createdAt: iso(),
      }
      db.insert(canvasCards).values(row).run()
      fire('canvas')
      return row
    },

    updateCanvasCard(id: string, patch: UpdateCanvasCardInput): CanvasCard {
      const existing = db.select().from(canvasCards).where(eq(canvasCards.id, id)).get()
      if (!existing) throw new NotFoundError('canvas card', id)
      db.update(canvasCards).set(patch).where(eq(canvasCards.id, id)).run()
      fire('canvas')
      return { ...existing, ...patch }
    },

    deleteCanvasCard(id: string): void {
      const res = db.delete(canvasCards).where(eq(canvasCards.id, id)).run()
      if (res.changes === 0) throw new NotFoundError('canvas card', id)
      fire('canvas') // edges cascade via the FK
    },

    connectCanvasCards(input: ConnectCanvasInput): CanvasEdge {
      const { fromCardId, toCardId } = input
      if (fromCardId === toCardId) throw new NotFoundError('canvas card', 'self-link')
      for (const id of [fromCardId, toCardId]) {
        if (!db.select().from(canvasCards).where(eq(canvasCards.id, id)).get())
          throw new NotFoundError('canvas card', id)
      }
      const existing = db
        .select()
        .from(canvasEdges)
        .all()
        .find(
          (e) =>
            (e.fromCardId === fromCardId && e.toCardId === toCardId) ||
            (e.fromCardId === toCardId && e.toCardId === fromCardId),
        )
      if (existing) return existing
      const row = { id: newId(), fromCardId, toCardId }
      db.insert(canvasEdges).values(row).run()
      fire('canvas')
      return row
    },

    deleteCanvasEdge(id: string): void {
      const res = db.delete(canvasEdges).where(eq(canvasEdges.id, id)).run()
      if (res.changes === 0) throw new NotFoundError('canvas edge', id)
      fire('canvas')
    },

    /** Promote a card into a task or a note (the card itself stays put). */
    promoteCanvasCard(
      id: string,
      input: PromoteCanvasInput,
    ): { to: 'task' | 'note'; task?: TaskWithDetail; note?: Note } {
      const card = db.select().from(canvasCards).where(eq(canvasCards.id, id)).get()
      if (!card) throw new NotFoundError('canvas card', id)
      const text = card.text.trim() || 'Untitled'
      if (input.to === 'task') {
        return { to: 'task', task: this.createTask({ title: text, due: 'today', priority: 'low' }) }
      }
      return { to: 'note', note: this.createNote({ text, color: card.color ?? undefined }) }
    },

    // --- Vision board ------------------------------------------------------
    listVision(): VisionTile[] {
      return db.select().from(visionTiles).orderBy(asc(visionTiles.sortOrder)).all()
    },

    updateVisionTile(id: string, patch: UpdateVisionTileInput): VisionTile {
      const existing = db.select().from(visionTiles).where(eq(visionTiles.id, id)).get()
      if (!existing) throw new NotFoundError('vision tile', id)
      db.update(visionTiles).set(patch).where(eq(visionTiles.id, id)).run()
      fire('vision')
      return { ...existing, ...patch }
    },

    setVisionImage(id: string, imagePath: string): VisionTile {
      const existing = db.select().from(visionTiles).where(eq(visionTiles.id, id)).get()
      if (!existing) throw new NotFoundError('vision tile', id)
      db.update(visionTiles).set({ imagePath }).where(eq(visionTiles.id, id)).run()
      fire('vision')
      return { ...existing, imagePath }
    },

    // --- Weekly review -----------------------------------------------------
    weeklyReview(): WeeklyReview {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString()
      const completedThisWeek = db
        .select()
        .from(tasks)
        .where(eq(tasks.done, true))
        .all()
        .filter((t) => t.doneAt && t.doneAt >= weekAgo)
        .map((t) => ({ id: t.id, title: t.title }))
      const focusSeconds = db
        .select()
        .from(focusSessions)
        .where(eq(focusSessions.completed, true))
        .all()
        .filter((f) => (f.endedAt ?? f.startedAt) >= weekAgo)
        .reduce((sum, f) => sum + f.actualSeconds, 0)
      const staleSomeday = db
        .select()
        .from(tasks)
        .where(and(eq(tasks.due, 'someday'), eq(tasks.done, false)))
        .all()
        .map((t) => ({ id: t.id, title: t.title }))
      const inboxCount = db.select({ n: sql<number>`count(*)` }).from(inboxItems).get()?.n ?? 0
      return {
        completedThisWeek,
        focusMinutes: Math.round(focusSeconds / 60),
        staleSomeday,
        inboxCount,
        goals: this.listGoals().map((g) => ({ name: g.name, pct: g.pct })),
        projects: this.listProjects().map((p) => ({ name: p.name, pct: p.pct })),
      }
    },
  }
}

export type BeaconService = ReturnType<typeof createService>
