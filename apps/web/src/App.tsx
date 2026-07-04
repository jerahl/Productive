import { type ComponentType, useState } from 'react'
import { CanvasView } from './components/CanvasView.tsx'
import { DocsView } from './components/DocsView.tsx'
import { GoalsView } from './components/GoalsView.tsx'
import { Header } from './components/Header.tsx'
import { MeetingsView } from './components/MeetingsView.tsx'
import { NotesView } from './components/NotesView.tsx'
import { OverviewView } from './components/OverviewView.tsx'
import { ProjectsView } from './components/ProjectsView.tsx'
import { RoutinesView } from './components/RoutinesView.tsx'
import { NAV, Sidebar, type ViewId } from './components/Sidebar.tsx'
import { TasksView } from './components/TasksView.tsx'
import { VisionView } from './components/VisionView.tsx'
import { FocusProvider } from './focus/FocusContext.tsx'
import { useTasks } from './lib/queries.ts'

const VIEWS: Record<ViewId, ComponentType> = {
  overview: OverviewView,
  tasks: TasksView,
  projects: ProjectsView,
  docs: DocsView,
  meetings: MeetingsView,
  goals: GoalsView,
  routines: RoutinesView,
  notes: NotesView,
  canvas: CanvasView,
  vision: VisionView,
}

function Main() {
  const [active, setActive] = useState<ViewId>('overview')
  const tasksQ = useTasks()

  const todayOpen = tasksQ.data?.groups.find((g) => g.key === 'today')?.openCount ?? 0
  const ActiveView = VIEWS[active]

  return (
    <div
      className="shell"
      style={{ display: 'flex', height: '100vh', width: '100%', background: '#0f1116' }}
    >
      <Sidebar active={active} onNavigate={setActive} tasksBadge={todayOpen} />
      <main
        style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh' }}
      >
        <Header />
        <div className="main-pad" style={{ flex: 1, overflowY: 'auto', padding: '26px 28px 64px' }}>
          <ActiveView />
        </div>
      </main>
    </div>
  )
}

export function App() {
  return (
    <FocusProvider>
      <Main />
    </FocusProvider>
  )
}
