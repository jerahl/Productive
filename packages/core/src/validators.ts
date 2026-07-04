import { z } from 'zod'
import {
  DUE_BUCKETS,
  ENERGY_LEVELS,
  PRIORITIES,
  PROMOTE_TARGETS,
  ROUTINE_PERIODS,
} from './enums.ts'

/**
 * The single source of truth for input validation. These zod schemas are reused
 * by REST input validation and by MCP tool `inputSchema`s (see docs/PLAN.md §5,
 * docs/MCP_SERVER.md) so the app, REST, and MCP never drift.
 */

export const dueSchema = z.enum(DUE_BUCKETS)
export const prioritySchema = z.enum(PRIORITIES)
export const routinePeriodSchema = z.enum(ROUTINE_PERIODS)
export const energySchema = z.enum(ENERGY_LEVELS)
export const promoteTargetSchema = z.enum(PROMOTE_TARGETS)

const title = z.string().trim().min(1).max(500)
const captureText = z.string().trim().min(1).max(2000) // see MCP_SERVER.md size cap

export const captureThoughtInput = z.object({
  text: captureText,
})

export const triageInboxInput = z.object({
  due: dueSchema.default('today'),
  projectId: z.string().optional(),
  priority: prioritySchema.optional(),
  estMinutes: z.number().int().nonnegative().optional(),
})

export const createTaskInput = z.object({
  title,
  due: dueSchema.default('today'),
  priority: prioritySchema.default('low'),
  estMinutes: z.number().int().nonnegative().optional(),
  projectId: z.string().optional(),
  goalId: z.string().optional(),
  note: z.string().max(2000).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  steps: z.array(z.string().trim().min(1)).optional(),
})

export const updateTaskInput = z
  .object({
    title,
    due: dueSchema,
    priority: prioritySchema,
    estMinutes: z.number().int().nonnegative().nullable(),
    projectId: z.string().nullable(),
    goalId: z.string().nullable(),
    note: z.string().max(2000),
    done: z.boolean(),
  })
  .partial()

export const addStepsInput = z.object({
  steps: z.array(z.string().trim().min(1)).min(1),
})

export const startFocusInput = z.object({
  taskId: z.string().optional(),
  minutes: z.number().int().min(1).max(180).default(25),
})

export const finishFocusInput = z.object({
  completed: z.boolean(),
  markTaskDone: z.boolean().optional(),
  actualSeconds: z.number().int().nonnegative().optional(),
})

export const setEnergyInput = z.object({
  level: energySchema,
})

export const createProjectInput = z.object({
  name: z.string().trim().min(1).max(200),
  color: z.string().trim().min(1),
  dueLabel: z.string().optional(),
})

export const createGoalInput = z.object({
  name: z.string().trim().min(1).max(200),
  detail: z.string().optional(),
  pct: z.number().int().min(0).max(100).default(0),
})

export const createNoteInput = z.object({
  text: z.string().trim().min(1),
  color: z.string().optional(),
})

export const createDocInput = z.object({
  title,
  tag: z.string().optional(),
  bodyMd: z.string().default(''),
})

export const createMeetingInput = z.object({
  title,
  startsAt: z.string(),
  who: z.string().optional(),
})

export const updateProjectInput = z
  .object({
    name: z.string().trim().min(1).max(200),
    color: z.string().trim().min(1),
    dueLabel: z.string(),
    archived: z.boolean(),
  })
  .partial()

export const updateGoalInput = z
  .object({
    name: z.string().trim().min(1).max(200),
    detail: z.string(),
    pct: z.number().int().min(0).max(100),
  })
  .partial()

export const updateNoteInput = z
  .object({ text: z.string().trim().min(1), color: z.string().nullable() })
  .partial()

export const updateDocInput = z.object({ title, tag: z.string(), bodyMd: z.string() }).partial()

export type CaptureThoughtInput = z.infer<typeof captureThoughtInput>
export type TriageInboxInput = z.infer<typeof triageInboxInput>
export type CreateTaskInput = z.infer<typeof createTaskInput>
export type UpdateTaskInput = z.infer<typeof updateTaskInput>
export type AddStepsInput = z.infer<typeof addStepsInput>
export type StartFocusInput = z.infer<typeof startFocusInput>
export type FinishFocusInput = z.infer<typeof finishFocusInput>
export type SetEnergyInput = z.infer<typeof setEnergyInput>
export type CreateProjectInput = z.infer<typeof createProjectInput>
export type CreateGoalInput = z.infer<typeof createGoalInput>
export type CreateNoteInput = z.infer<typeof createNoteInput>
export type CreateDocInput = z.infer<typeof createDocInput>
export type CreateMeetingInput = z.infer<typeof createMeetingInput>
export type UpdateProjectInput = z.infer<typeof updateProjectInput>
export type UpdateGoalInput = z.infer<typeof updateGoalInput>
export type UpdateNoteInput = z.infer<typeof updateNoteInput>
export type UpdateDocInput = z.infer<typeof updateDocInput>
