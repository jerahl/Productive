import type {
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
  taskSteps,
  taskTags,
  tasks,
  visionTiles,
} from './schema.ts'

/** Row types inferred straight from the Drizzle tables (select shape). */
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type TaskTag = typeof taskTags.$inferSelect
export type TaskStep = typeof taskSteps.$inferSelect
export type InboxItem = typeof inboxItems.$inferSelect
export type Project = typeof projects.$inferSelect
export type Goal = typeof goals.$inferSelect
export type Routine = typeof routines.$inferSelect
export type RoutineCheck = typeof routineChecks.$inferSelect
export type Meeting = typeof meetings.$inferSelect
export type Doc = typeof docs.$inferSelect
export type Note = typeof notes.$inferSelect
export type CanvasCard = typeof canvasCards.$inferSelect
export type CanvasEdge = typeof canvasEdges.$inferSelect
export type VisionTile = typeof visionTiles.$inferSelect
export type FocusSession = typeof focusSessions.$inferSelect
export type AppStateRow = typeof appState.$inferSelect

/** A task with its steps and tags joined in — the shape most views want. */
export type TaskWithDetail = Task & {
  steps: TaskStep[]
  tags: string[]
}
