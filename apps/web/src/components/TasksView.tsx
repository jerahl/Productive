import { type MouseEvent, useMemo, useState } from 'react'
import { useFocus } from '../focus/FocusContext.tsx'
import { MONO } from '../lib/format.ts'
import { useProjects } from '../lib/queries.ts'
import {
  useAddStep,
  useCreateTask,
  useCycleDue,
  useCyclePriority,
  useDeleteTask,
  useDismiss,
  useInbox,
  useReorder,
  useTasks,
  useToggleStep,
  useToggleTask,
  useTriage,
} from '../lib/queries.ts'
import type { GroupKey, Task, TaskGroup } from '../lib/types.ts'
import { useNav } from '../nav/NavContext.tsx'
import { TaskRow } from './TaskRow.tsx'

export function TasksView() {
  const tasksQ = useTasks()
  const inboxQ = useInbox()

  const toggleTask = useToggleTask()
  const cycleDue = useCycleDue()
  const cyclePriority = useCyclePriority()
  const addStep = useAddStep()
  const toggleStep = useToggleStep()
  const createTask = useCreateTask()
  const deleteTask = useDeleteTask()
  const triage = useTriage()
  const dismiss = useDismiss()
  const reorder = useReorder()
  const focus = useFocus()
  const nav = useNav()
  const { data: projects = [] } = useProjects()
  const projectName = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [override, setOverride] = useState<{ group: GroupKey; ids: string[] } | null>(null)
  const [composer, setComposer] = useState('')

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  /** Apply an in-progress drag override to a group's task order. */
  const orderedTasks = (group: TaskGroup): Task[] => {
    if (!override || override.group !== group.key) return group.tasks
    const byId = new Map(group.tasks.map((t) => [t.id, t]))
    const out = override.ids.map((id) => byId.get(id)).filter((t): t is Task => Boolean(t))
    for (const t of group.tasks) if (!override.ids.includes(t.id)) out.push(t)
    return out
  }

  /** Mouse-driven reorder within a group, mirroring the mock's drag handler. */
  const startReorder = (group: TaskGroup, taskId: string, e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const handle = e.currentTarget as HTMLElement
    const container = handle.closest('.task-list') as HTMLElement | null
    if (!container) return
    let ids = orderedTasks(group).map((t) => t.id)
    document.body.style.userSelect = 'none'

    const move = (ev: globalThis.MouseEvent) => {
      const rows = [...container.children] as HTMLElement[]
      let target = rows.length - 1
      for (let k = 0; k < rows.length; k++) {
        const row = rows[k]
        if (!row) continue
        const r = row.getBoundingClientRect()
        if (ev.clientY < r.top + r.height / 2) {
          target = k
          break
        }
      }
      const from = ids.indexOf(taskId)
      if (from === -1) return
      const clamped = Math.max(0, Math.min(target, ids.length - 1))
      if (from === clamped) return
      const next = ids.slice()
      next.splice(from, 1)
      next.splice(clamped, 0, taskId)
      ids = next
      setOverride({ group: group.key, ids: next })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
      document.body.style.userSelect = ''
      reorder.mutate({ group: group.key, orderedIds: ids })
      setOverride(null)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const submitComposer = () => {
    const title = composer.trim()
    if (!title) return
    createTask.mutate({ title, due: 'today' })
    setComposer('')
  }

  if (tasksQ.isLoading) {
    return <div style={{ color: 'rgba(232,234,240,0.5)', fontSize: 13 }}>Loading tasks…</div>
  }
  if (tasksQ.isError) {
    return <div style={{ color: '#e07a8a', fontSize: 13 }}>Couldn't load tasks.</div>
  }

  const groups = tasksQ.data?.groups ?? []
  const inbox = inboxQ.data ?? []

  const renderRow = (group: TaskGroup, task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      expanded={expanded.has(task.id)}
      onToggleExpand={() => toggleExpand(task.id)}
      onToggle={() => toggleTask.mutate(task.id)}
      onCycleDue={() => cycleDue.mutate(task.id)}
      onCyclePriority={() => cyclePriority.mutate(task.id)}
      onAddStep={(text) => addStep.mutate({ id: task.id, text })}
      onToggleStep={(sid) => toggleStep.mutate({ id: task.id, sid })}
      onStartReorder={(e) => startReorder(group, task.id, e)}
      onStartFocus={() => focus.open({ taskId: task.id })}
      onDelete={() => deleteTask.mutate(task.id)}
      projectName={task.projectId ? projectName.get(task.projectId) : null}
      onOpenProject={task.projectId ? () => nav.openProject(task.projectId as string) : undefined}
    />
  )

  return (
    <div className="view">
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.015em' }}>Tasks</div>
        <div style={{ fontSize: 13, color: 'rgba(232,234,240,0.5)', marginTop: 3 }}>
          Triage your inbox, then work top-down. Tap "steps" to break anything big into tiny pieces.
        </div>
      </div>

      {inbox.length > 0 && (
        <div
          style={{
            background: 'rgba(124,140,255,0.07)',
            border: '1px solid rgba(124,140,255,0.18)',
            borderRadius: 14,
            padding: '13px 18px',
            marginBottom: 22,
          }}
        >
          <div
            style={{
              font: `500 11px ${MONO}`,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: '#9fb0ff',
              marginBottom: 6,
            }}
          >
            Inbox to triage · {inbox.length}
          </div>
          {inbox.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: '#e8eaf0' }}>
                {item.text}
              </span>
              <span
                onClick={() => triage.mutate(item.id)}
                style={{
                  font: `500 11px ${MONO}`,
                  color: '#0f1116',
                  background: '#7c8cff',
                  padding: '4px 10px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  flex: 'none',
                }}
              >
                → Today
              </span>
              <span
                onClick={() => dismiss.mutate(item.id)}
                title="Dismiss"
                style={{
                  fontSize: 17,
                  color: 'rgba(232,234,240,0.4)',
                  cursor: 'pointer',
                  flex: 'none',
                  lineHeight: 1,
                }}
              >
                ×
              </span>
            </div>
          ))}
        </div>
      )}

      {groups.map((group) => {
        const isToday = group.key === 'today'
        if (!isToday && group.tasks.length === 0) return null
        const rows = orderedTasks(group)
        return (
          <div key={group.key} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
              <span
                style={{
                  font: `600 12px ${MONO}`,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'rgba(232,234,240,0.55)',
                }}
              >
                {group.label}
              </span>
              <span style={{ font: `500 12px ${MONO}`, color: 'rgba(232,234,240,0.35)' }}>
                {group.openCount} open
              </span>
            </div>
            <div
              style={{
                background: '#1a1e27',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                padding: '3px 18px',
              }}
            >
              {isToday && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 2px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span
                    style={{
                      flex: 'none',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: '1.5px dashed rgba(255,255,255,0.2)',
                    }}
                  />
                  <input
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitComposer()
                    }}
                    placeholder="Add a task for today, press Enter"
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#e8eaf0',
                      fontFamily: "'Hanken Grotesk', sans-serif",
                      fontSize: 14,
                    }}
                  />
                </div>
              )}
              <div className="task-list" data-group={group.key}>
                {rows.map((task) => renderRow(group, task))}
              </div>
              {isToday && rows.length === 0 && (
                <div style={{ padding: '14px 2px', fontSize: 13, color: 'rgba(232,234,240,0.45)' }}>
                  Nothing here yet. Capture a thought up top, or add one above.
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
