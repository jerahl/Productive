import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api.ts'
import type { GroupKey } from './types.ts'

const TASKS = ['tasks'] as const
const INBOX = ['inbox'] as const
const PROJECTS = ['projects'] as const

export const useTasks = () => useQuery({ queryKey: TASKS, queryFn: api.getTasks })
export const useInbox = () => useQuery({ queryKey: INBOX, queryFn: api.getInbox })
export const useProjects = () => useQuery({ queryKey: PROJECTS, queryFn: api.getProjects })

/** Invalidate the caches a mutation can affect (tasks + inbox move together). */
function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: TASKS })
    qc.invalidateQueries({ queryKey: INBOX })
  }
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
