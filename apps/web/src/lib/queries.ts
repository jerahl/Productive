import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api.ts'
import type { EnergyLevel, GroupKey } from './types.ts'

const TASKS = ['tasks'] as const
const INBOX = ['inbox'] as const
const PROJECTS = ['projects'] as const
const OVERVIEW = ['overview'] as const

export const useTasks = () => useQuery({ queryKey: TASKS, queryFn: api.getTasks })
export const useInbox = () => useQuery({ queryKey: INBOX, queryFn: api.getInbox })
export const useProjects = () => useQuery({ queryKey: PROJECTS, queryFn: api.getProjects })
export const useOverview = () => useQuery({ queryKey: OVERVIEW, queryFn: api.getOverview })
export const useGoals = () => useQuery({ queryKey: ['goals'], queryFn: api.getGoals })
export const useRoutines = () => useQuery({ queryKey: ['routines'], queryFn: api.getRoutines })
export const useMeetings = () => useQuery({ queryKey: ['meetings'], queryFn: api.getMeetings })
export const useDocs = () => useQuery({ queryKey: ['docs'], queryFn: api.getDocs })
export const useNotes = () => useQuery({ queryKey: ['notes'], queryFn: api.getNotes })
export const useDoc = (id: string) =>
  useQuery({ queryKey: ['doc', id], queryFn: () => api.getDoc(id) })
export const useCanvas = () => useQuery({ queryKey: ['canvas'], queryFn: api.getCanvas })
export const useVision = () => useQuery({ queryKey: ['vision'], queryFn: api.getVision })
export const useProjectDetail = (id: string) =>
  useQuery({ queryKey: ['project', id], queryFn: () => api.getProjectDetail(id) })
export const useGoalDetail = (id: string, enabled = true) =>
  useQuery({ queryKey: ['goal', id], queryFn: () => api.getGoalDetail(id), enabled })

/** Goal mutations refresh the goal list, any open goal detail, tasks, and overview. */
function useGoalMutation<A, R>(fn: (arg: A) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of ['goals', 'goal', 'tasks', 'overview']) {
        qc.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}

export const useCreateGoal = () =>
  useGoalMutation((data: { name: string; detail?: string; pct?: number }) => api.createGoal(data))
export const useUpdateGoal = () =>
  useGoalMutation((v: { id: string; name?: string; detail?: string; pct?: number }) =>
    api.updateGoal(v.id, { name: v.name, detail: v.detail, pct: v.pct }),
  )
export const useDeleteGoal = () => useGoalMutation((id: string) => api.deleteGoal(id))
export const useCreateGoalTask = () =>
  useGoalMutation((v: { title: string; goalId: string }) =>
    api.createTask({ title: v.title, goalId: v.goalId, due: 'today' }),
  )

/** Project-detail mutations refresh the detail, the project list, tasks, and overview. */
function useProjectMutation<A, R>(fn: (arg: A) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const key of ['project', 'projects', 'tasks', 'overview']) {
        qc.invalidateQueries({ queryKey: [key] })
      }
    },
  })
}

export const useCreateMilestone = () =>
  useProjectMutation((v: { projectId: string; title: string }) =>
    api.createMilestone(v.projectId, v.title),
  )
export const useUpdateMilestone = () =>
  useProjectMutation((v: { id: string; title?: string; done?: boolean }) =>
    api.updateMilestone(v.id, { title: v.title, done: v.done }),
  )
export const useDeleteMilestone = () => useProjectMutation((id: string) => api.deleteMilestone(id))
export const useCreateProjectTask = () =>
  useProjectMutation((v: { title: string; projectId: string; milestoneId?: string }) =>
    api.createTask({
      title: v.title,
      projectId: v.projectId,
      milestoneId: v.milestoneId,
      due: 'today',
    }),
  )
export const useUpdateTask = () =>
  useProjectMutation(
    (v: { id: string; milestoneId?: string | null; done?: boolean; due?: string }) =>
      api.updateTask(v.id, { milestoneId: v.milestoneId, done: v.done, due: v.due }),
  )

/** Mutation that refreshes a single query key on success. */
function useKeyMutation<A, R>(fn: (arg: A) => Promise<R>, key: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
  })
}

export const useCheckRoutine = () =>
  useKeyMutation((id: string) => api.checkRoutine(id), 'routines')
export const useCreateNote = () =>
  useKeyMutation((data: { text: string; color?: string | null }) => api.createNote(data), 'notes')
export const useUpdateNote = () =>
  useKeyMutation(
    (v: { id: string; text?: string; color?: string | null }) =>
      api.updateNote(v.id, { text: v.text, color: v.color }),
    'notes',
  )
export const useDeleteNote = () => useKeyMutation((id: string) => api.deleteNote(id), 'notes')
export const useCreateDoc = () =>
  useKeyMutation(
    (data: { title: string; tag?: string; bodyMd?: string }) => api.createDoc(data),
    'docs',
  )
export function useUpdateDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; title?: string; tag?: string; bodyMd?: string }) =>
      api.updateDoc(v.id, { title: v.title, tag: v.tag, bodyMd: v.bodyMd }),
    onSuccess: (doc) => {
      // Refresh both the list and this doc's own cache so the editor sees it as saved.
      qc.setQueryData(['doc', doc.id], doc)
      qc.invalidateQueries({ queryKey: ['docs'] })
    },
  })
}

/** Invalidate the caches a mutation can affect (tasks, inbox, and overview
 *  derive from the same data, so refresh all three together). */
function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: TASKS })
    qc.invalidateQueries({ queryKey: INBOX })
    qc.invalidateQueries({ queryKey: OVERVIEW })
  }
}

export function useSetEnergy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (level: EnergyLevel) => api.setEnergy(level),
    onSuccess: (overview) => {
      qc.setQueryData(OVERVIEW, overview)
    },
  })
}

export function useCapture() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (text: string) => api.capture(text), onSuccess: invalidate })
}

export function useTriage() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => api.triage(id), onSuccess: invalidate })
}

export function useDismiss() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => api.dismiss(id), onSuccess: invalidate })
}

export function useCreateTask() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (data: { title: string; due?: string }) => api.createTask(data),
    onSuccess: invalidate,
  })
}

export function useToggleTask() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => api.toggleTask(id), onSuccess: invalidate })
}

export function useCycleDue() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => api.cycleDue(id), onSuccess: invalidate })
}

export function useCyclePriority() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: string) => api.cyclePriority(id), onSuccess: invalidate })
}

export function useAddStep() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (v: { id: string; text: string }) => api.addStep(v.id, v.text),
    onSuccess: invalidate,
  })
}

export function useToggleStep() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (v: { id: string; sid: string }) => api.toggleStep(v.id, v.sid),
    onSuccess: invalidate,
  })
}

export function useReorder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (v: { group: GroupKey; orderedIds: string[] }) =>
      api.reorder(v.group, v.orderedIds),
    onSuccess: invalidate,
  })
}
