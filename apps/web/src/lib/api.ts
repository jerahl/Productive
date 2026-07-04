import type {
  Doc,
  DocMeta,
  EnergyLevel,
  FocusSession,
  Goal,
  GroupKey,
  InboxItem,
  Meeting,
  Note,
  Overview,
  ProjectStats,
  RoutineView,
  Task,
  TaskGroup,
} from './types.ts'

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
  getProjects: () => req<ProjectStats[]>('/projects'),
  getOverview: () => req<Overview>('/overview'),
  getGoals: () => req<Goal[]>('/goals'),
  getRoutines: () => req<RoutineView[]>('/routines'),
  getMeetings: () => req<Meeting[]>('/meetings'),
  getDocs: () => req<DocMeta[]>('/docs'),
  getDoc: (id: string) => req<Doc>(`/docs/${id}`),
  getNotes: () => req<Note[]>('/notes'),

  checkRoutine: (id: string) => req<RoutineView[]>(`/routines/${id}/check`, { method: 'POST' }),
  createNote: (data: { text: string; color?: string | null }) => req<Note>('/notes', body(data)),
  updateNote: (id: string, data: { text?: string; color?: string | null }) =>
    req<Note>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteNote: (id: string) => req<void>(`/notes/${id}`, { method: 'DELETE' }),
  createDoc: (data: { title: string; tag?: string; bodyMd?: string }) =>
    req<Doc>('/docs', body(data)),
  updateDoc: (id: string, data: { title?: string; tag?: string; bodyMd?: string }) =>
    req<Doc>(`/docs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  setEnergy: (level: EnergyLevel) => req<Overview>('/energy', body({ level })),
  startFocus: (data: { taskId?: string; minutes?: number } = {}) =>
    req<FocusSession>('/focus/start', body(data)),
  finishFocus: (
    id: string,
    data: { completed: boolean; actualSeconds?: number; markTaskDone?: boolean },
  ) => req<FocusSession>(`/focus/${id}/finish`, body(data)),

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
