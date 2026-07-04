import { type ComponentType, useState } from 'react'
import { DocsView } from './components/DocsView.tsx'
import { GoalsView } from './components/GoalsView.tsx'
import { Header } from './components/Header.tsx'
import { MeetingsView } from './components/MeetingsView.tsx'
import { NotesView } from './components/NotesView.tsx'
import { OverviewView } from './components/OverviewView.tsx'
import { Placeholder } from './components/Placeholder.tsx'
import { ProjectsView } from './components/ProjectsView.tsx'
import { RoutinesView } from './components/RoutinesView.tsx'
import { NAV, Sidebar, type ViewId } from './components/Sidebar.tsx'
import { TasksView } from './components/TasksView.tsx'
import { FocusProvider } from './focus/FocusContext.tsx'
import { useTasks } from './lib/queries.ts'

const VIEWS: Partial<Record<ViewId, ComponentType>> = {
  overview: OverviewView,
  tasks: TasksView,
  projects: ProjectsView,
  docs: DocsView,
  meetings: MeetingsView,
  goals: GoalsView,
  routines: RoutinesView,
  notes: NotesView,
}

function Main() {
  const [active, setActive] = useState<ViewId>('overview')
  const tasksQ = useTasks()

  const todayOpen = tasksQ.data?.groups.find((g) => g.key === 'today')?.openCount ?? 0
  const label = NAV.find((n) => n.id === active)?.label ?? active
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
          {ActiveView ? <ActiveView /> : <Placeholder view={active} label={label} />}
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
