import type { GroupKey, InboxItem, Project, Task, TaskGroup } from './types.ts'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}${detail ? `: ${detail}` : ''}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const body = (data: unknown) => ({ method: 'POST', body: JSON.stringify(data) })

export const api = {
  getTasks: () => req<{ groups: TaskGroup[] }>('/tasks'),
  getInbox: () => req<InboxItem[]>('/inbox'),
  getProjects: () => req<Project[]>('/projects'),

  capture: (text: string) => req<InboxItem>('/capture', body({ text })),
  triage: (id: string, data: { due?: string; projectId?: string } = {}) =>
    req<Task>(`/inbox/${id}/triage`, body(data)),
  dismiss: (id: string) => req<void>(`/inbox/${id}/dismiss`, { method: 'POST' }),

  createTask: (data: { title: string; due?: string }) => req<Task>('/tasks', body(data)),
  toggleTask: (id: string) => req<Task>(`/tasks/${id}/toggle`, { method: 'POST' }),
  cycleDue: (id: string) => req<Task>(`/tasks/${id}/cycle-due`, { method: 'POST' }),
  cyclePriority: (id: string) => req<Task>(`/tasks/${id}/cycle-priority`, { method: 'POST' }),
  addStep: (id: string, text: string) => req<Task>(`/tasks/${id}/steps`, body({ text })),
  toggleStep: (id: string, sid: string) =>
    req<Task>(`/tasks/${id}/steps/${sid}/toggle`, { method: 'POST' }),
  reorder: (group: GroupKey, orderedIds: string[]) =>
    req<{ groups: TaskGroup[] }>('/tasks/reorder', body({ group, orderedIds })),
}
