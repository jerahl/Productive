import { useState } from 'react'
import { Header } from './components/Header.tsx'
import { Placeholder } from './components/Placeholder.tsx'
import { NAV, Sidebar, type ViewId } from './components/Sidebar.tsx'
import { TasksView } from './components/TasksView.tsx'
import { useTasks } from './lib/queries.ts'

export function App() {
  const [active, setActive] = useState<ViewId>('tasks')
  const tasksQ = useTasks()

  const todayOpen = tasksQ.data?.groups.find((g) => g.key === 'today')?.openCount ?? 0
  const label = NAV.find((n) => n.id === active)?.label ?? active

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
          {active === 'tasks' ? <TasksView /> : <Placeholder view={active} label={label} />}
        </div>
      </main>
    </div>
  )
}
