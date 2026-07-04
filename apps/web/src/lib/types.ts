// Client-side mirrors of the API response shapes. Declared here (rather than
// importing @beacon/core) so the web bundle stays free of server-only deps.

export type Due = 'today' | 'tomorrow' | 'week' | 'someday'
export type Priority = 'high' | 'med' | 'low'
export type GroupKey = 'today' | 'upcoming' | 'someday'

export type TaskStep = {
  id: string
  taskId: string
  text: string
  done: boolean
  sortOrder: number
}

export type Task = {
  id: string
  title: string
  done: boolean
  doneAt: string | null
  estMinutes: number | null
  projectId: string | null
  goalId: string | null
  due: Due
  priority: Priority
  note: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  steps: TaskStep[]
  tags: string[]
}

export type TaskGroup = {
  key: GroupKey
  label: string
  openCount: number
  tasks: Task[]
}

export type InboxItem = { id: string; text: string; createdAt: string }

export type Project = {
  id: string
  name: string
  color: string
  dueLabel: string
  archived: boolean
  createdAt: string
}

export type EnergyLevel = 'low' | 'medium' | 'high'

export type RightNow = {
  taskId: string
  title: string
  project: string | null
  estMinutes: number | null
}

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

export type FocusSession = {
  id: string
  taskId: string | null
  taskTitle: string
  plannedMinutes: number
  actualSeconds: number
  startedAt: string
  endedAt: string | null
  completed: boolean
}
