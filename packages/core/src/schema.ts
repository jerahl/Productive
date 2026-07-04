import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import type { Due, EnergyLevel, Priority, RoutinePeriod } from './enums.ts'

/**
 * Beacon data model (see docs/PLAN.md §4). Single-user, local-first SQLite.
 * All ids are ULIDs; all timestamps are ISO-8601 UTC strings. Nothing derived
 * (project percent, streak, today progress) is stored redundantly.
 */

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    done: integer('done', { mode: 'boolean' }).notNull().default(false),
    doneAt: text('done_at'),
    estMinutes: integer('est_minutes'),
    projectId: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
    goalId: text('goal_id').references(() => goals.id, { onDelete: 'set null' }),
    due: text('due').$type<Due>().notNull().default('today'),
    priority: text('priority').$type<Priority>().notNull().default('low'),
    note: text('note').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => [
    index('tasks_due_idx').on(t.due),
    index('tasks_project_idx').on(t.projectId),
    index('tasks_sort_idx').on(t.sortOrder),
  ],
)

export const taskTags = sqliteTable(
  'task_tags',
  {
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.tag] })],
)

export const taskSteps = sqliteTable(
  'task_steps',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    done: integer('done', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('task_steps_task_idx').on(t.taskId)],
)

export const inboxItems = sqliteTable('inbox_items', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull().default(now),
})

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  dueLabel: text('due_label').notNull().default(''),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().default(now),
})

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  detail: text('detail').notNull().default(''),
  pct: integer('pct').notNull().default(0),
  createdAt: text('created_at').notNull().default(now),
})

export const routines = sqliteTable(
  'routines',
  {
    id: text('id').primaryKey(),
    period: text('period').$type<RoutinePeriod>().notNull(),
    text: text('text').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('routines_period_idx').on(t.period)],
)

export const routineChecks = sqliteTable(
  'routine_checks',
  {
    routineId: text('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // local YYYY-MM-DD
    done: integer('done', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.routineId, t.date] })],
)

export const meetings = sqliteTable('meetings', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  startsAt: text('starts_at').notNull(),
  who: text('who').notNull().default(''),
  createdAt: text('created_at').notNull().default(now),
})

export const docs = sqliteTable('docs', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  tag: text('tag').notNull().default(''),
  bodyMd: text('body_md').notNull().default(''),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now),
})

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  color: text('color'),
  createdAt: text('created_at').notNull().default(now),
  updatedAt: text('updated_at').notNull().default(now),
})

export const canvasCards = sqliteTable('canvas_cards', {
  id: text('id').primaryKey(),
  x: real('x').notNull().default(0),
  y: real('y').notNull().default(0),
  text: text('text').notNull().default(''),
  color: text('color'),
  createdAt: text('created_at').notNull().default(now),
})

export const canvasEdges = sqliteTable(
  'canvas_edges',
  {
    id: text('id').primaryKey(),
    fromCardId: text('from_card_id')
      .notNull()
      .references(() => canvasCards.id, { onDelete: 'cascade' }),
    toCardId: text('to_card_id')
      .notNull()
      .references(() => canvasCards.id, { onDelete: 'cascade' }),
  },
  (t) => [uniqueIndex('canvas_edges_pair_idx').on(t.fromCardId, t.toCardId)],
)

export const visionTiles = sqliteTable('vision_tiles', {
  id: text('id').primaryKey(),
  tag: text('tag').notNull().default(''),
  caption: text('caption').notNull().default(''),
  imagePath: text('image_path'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const focusSessions = sqliteTable(
  'focus_sessions',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    taskTitle: text('task_title').notNull(),
    plannedMinutes: integer('planned_minutes').notNull(),
    actualSeconds: integer('actual_seconds').notNull().default(0),
    startedAt: text('started_at').notNull().default(now),
    endedAt: text('ended_at'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('focus_sessions_started_idx').on(t.startedAt)],
)

export const appState = sqliteTable('app_state', {
  key: text('key').primaryKey(),
  value: text('value'),
})

/** Convenience: the energy level persisted in app_state is one of these. */
export type StoredEnergy = EnergyLevel | null

export const schema = {
  tasks,
  taskTags,
  taskSteps,
  inboxItems,
  projects,
  goals,
  routines,
  routineChecks,
  meetings,
  docs,
  notes,
  canvasCards,
  canvasEdges,
  visionTiles,
  focusSessions,
  appState,
}
