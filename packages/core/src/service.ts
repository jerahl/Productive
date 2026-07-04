import { and, asc, eq, sql } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { DUE_BUCKETS } from './enums.ts'
import type { Due, Priority } from './enums.ts'
import { NotFoundError } from './errors.ts'
import { newId } from './ids.ts'
import { inboxItems, projects, type schema, taskSteps, taskTags, tasks } from './schema.ts'
import type { InboxItem, Project, TaskStep, TaskWithDetail } from './types.ts'
import type { CreateTaskInput, TriageInboxInput, UpdateTaskInput } from './validators.ts'

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

/** Which group a due bucket falls into (upcoming = tomorrow + this week). */
function groupKeyForDue(due: Due): TaskGroup['key'] {
  if (due === 'today') return 'today'
  if (due === 'someday') return 'someday'
  return 'upcoming'
}

/**
 * The Beacon service layer — all business logic lives here (docs/PLAN.md §5),
 * so the REST API and the MCP server stay thin and always agree. Every method
 * is synchronous: better-sqlite3 is synchronous, which keeps handlers simple.
 */
export function createService(db: BeaconDb) {
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
      return task
    },

    dismissInboxItem(inboxId: string): void {
      const res = db.delete(inboxItems).where(eq(inboxItems.id, inboxId)).run()
      if (res.changes === 0) throw new NotFoundError('inbox item', inboxId)
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
      return taskDetail(id)
    },

    cycleDue(id: string): TaskWithDetail {
      const existing = db.select().from(tasks).where(eq(tasks.id, id)).get()
      if (!existing) throw new NotFoundError('task', id)
      const idx = DUE_BUCKETS.indexOf(existing.due)
      const due = DUE_BUCKETS[(idx + 1) % DUE_BUCKETS.length]
      db.update(tasks).set({ due, updatedAt: iso() }).where(eq(tasks.id, id)).run()
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
    },

    // --- Projects (read; full CRUD in Phase 4) -----------------------------
    listProjects(): Project[] {
      return db
        .select()
        .from(projects)
        .where(eq(projects.archived, false))
        .orderBy(asc(projects.createdAt))
        .all()
    },
  }
}

export type BeaconService = ReturnType<typeof createService>
