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
  milestoneId: string | null
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

export type ProjectStats = Project & { done: number; total: number; pct: number }

export type Milestone = {
  id: string
  projectId: string
  title: string
  done: boolean
  sortOrder: number
  createdAt: string
}
export type MilestoneWithStats = Milestone & { taskDone: number; taskTotal: number }
export type ProjectDetail = {
  project: ProjectStats
  milestones: MilestoneWithStats[]
  tasks: Task[]
}

export type Goal = {
  id: string
  name: string
  detail: string
  pct: number
  createdAt: string
  taskDone: number
  taskTotal: number
}
export type GoalDetail = { goal: Goal; tasks: Task[] }

export type RoutinePeriod = 'morning' | 'evening'
export type RoutineView = {
  period: RoutinePeriod
  done: number
  total: number
  items: { id: string; text: string; done: boolean }[]
}

export type Meeting = {
  id: string
  title: string
  startsAt: string
  who: string
  createdAt: string
}

export type DocMeta = {
  id: string
  title: string
  tag: string
  createdAt: string
  updatedAt: string
}
export type Doc = DocMeta & { bodyMd: string }

export type Note = {
  id: string
  text: string
  color: string | null
  createdAt: string
  updatedAt: string
}

export type CanvasCard = {
  id: string
  x: number
  y: number
  text: string
  color: string | null
  createdAt: string
}
export type CanvasEdge = { id: string; fromCardId: string; toCardId: string }
export type CanvasBoard = { cards: CanvasCard[]; edges: CanvasEdge[] }

export type VisionTile = {
  id: string
  tag: string
  caption: string
  imagePath: string | null
  sortOrder: number
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

export type BeaconTopic = 'tasks' | 'inbox' | 'overview' | 'projects' | 'meetings'

/** SSE payloads from /api/events (mirrors @beacon/core's BeaconEvent). */
export type BeaconEvent =
  | { type: 'invalidate'; topics: BeaconTopic[] }
  | { type: 'focus:start'; session: FocusSession }
  | { type: 'focus:finish'; sessionId: string }
