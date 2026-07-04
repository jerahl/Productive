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
