import { useState } from 'react'
import { useFocus } from '../focus/FocusContext.tsx'
import { MONO } from '../lib/format.ts'
import {
  useAddStep,
  useCreateMilestone,
  useCreateProjectTask,
  useCycleDue,
  useCyclePriority,
  useDeleteMilestone,
  useProjectDetail,
  useToggleStep,
  useToggleTask,
  useUpdateMilestone,
  useUpdateTask,
} from '../lib/queries.ts'
import type { MilestoneWithStats, Task } from '../lib/types.ts'
import { TaskRow } from './TaskRow.tsx'

const UNASSIGNED = '__none__'

export function ProjectDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading } = useProjectDetail(id)
  const focus = useFocus()
  const toggleTask = useToggleTask()
  const cycleDue = useCycleDue()
  const cyclePriority = useCyclePriority()
  const addStep = useAddStep()
  const toggleStep = useToggleStep()
  const createTask = useCreateProjectTask()
  const updateTask = useUpdateTask()
  const createMilestone = useCreateMilestone()
  const updateMilestone = useUpdateMilestone()
  const deleteMilestone = useDeleteMilestone()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [milestoneDraft, setMilestoneDraft] = useState('')
  const [taskDraft, setTaskDraft] = useState<Record<string, string>>({})

  const toggleExpand = (tid: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(tid)) next.delete(tid)
      else next.add(tid)
      return next
    })

  if (isLoading || !data) {
    return (
      <div className="view">
        <div style={{ color: 'rgba(232,234,240,0.5)', fontSize: 13 }}>Loading…</div>
      </div>
    )
  }

  const { project, milestones, tasks } = data
  const groupTasks = (milestoneId: string | null) =>
    tasks.filter((t) => (t.milestoneId ?? UNASSIGNED) === (milestoneId ?? UNASSIGNED))

  const renderTask = (task: Task) => (
    <TaskRow
      key={task.id}
      task={{ ...task, steps: task.steps ?? [], tags: task.tags ?? [] }}
      expanded={expanded.has(task.id)}
      onToggleExpand={() => toggleExpand(task.id)}
      onToggle={() => toggleTask.mutate(task.id)}
      onCycleDue={() => cycleDue.mutate(task.id)}
      onCyclePriority={() => cyclePriority.mutate(task.id)}
      onAddStep={(text) => addStep.mutate({ id: task.id, text })}
      onToggleStep={(sid) => toggleStep.mutate({ id: task.id, sid })}
      onStartReorder={() => {}}
      onStartFocus={() => focus.open({ taskId: task.id })}
    />
  )

  const taskComposer = (milestoneId: string | null) => {
    const key = milestoneId ?? UNASSIGNED
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 2px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '1.5px dashed rgba(255,255,255,0.2)',
            flex: 'none',
          }}
        />
        <input
          value={taskDraft[key] ?? ''}
          onChange={(e) => setTaskDraft((d) => ({ ...d, [key]: e.target.value }))}
          onKeyDown={(e) => {
            const v = (taskDraft[key] ?? '').trim()
            if (e.key === 'Enter' && v) {
              createTask.mutate({ title: v, projectId: id, milestoneId: milestoneId ?? undefined })
              setTaskDraft((d) => ({ ...d, [key]: '' }))
            }
          }}
          placeholder="Add a task to this project, press Enter"
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
    )
  }

  const milestoneCard = (m: MilestoneWithStats) => {
    const pct = m.taskTotal > 0 ? Math.round((m.taskDone / m.taskTotal) * 100) : m.done ? 100 : 0
    const rows = groupTasks(m.id)
    return (
      <div key={m.id} style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div
            onClick={() => updateMilestone.mutate({ id: m.id, done: !m.done })}
            title={m.done ? 'Mark not done' : 'Mark done'}
            style={{
              width: 18,
              height: 18,
              borderRadius: 6,
              flex: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              ...(m.done
                ? { background: '#5ec98a', color: '#0f1116', border: '1.5px solid #5ec98a' }
                : { border: '1.5px solid rgba(255,255,255,0.25)' }),
            }}
          >
            {m.done ? '✓' : ''}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              ...(m.done ? { color: 'rgba(232,234,240,0.5)' } : {}),
            }}
          >
            {m.title}
          </div>
          <span style={{ font: `500 12px ${MONO}`, color: 'rgba(232,234,240,0.4)' }}>
            {m.taskDone}/{m.taskTotal}
          </span>
          <div style={{ flex: 1 }} />
          <span
            onClick={() => deleteMilestone.mutate(m.id)}
            title="Delete milestone"
            style={{
              fontSize: 15,
              color: 'rgba(232,234,240,0.35)',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ×
          </span>
        </div>
        <div
          style={{
            height: 5,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.07)',
            overflow: 'hidden',
            marginBottom: 8,
          }}
        >
          <div
            style={{ height: '100%', width: `${pct}%`, background: project.color, borderRadius: 4 }}
          />
        </div>
        <div
          style={{
            background: '#1a1e27',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14,
            padding: '3px 18px',
          }}
        >
          {rows.map(renderTask)}
          {taskComposer(m.id)}
        </div>
      </div>
    )
  }

  const unassigned = groupTasks(null)

  return (
    <div className="view">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: '#e8eaf0',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 9,
            padding: '8px 15px',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: "'Hanken Grotesk', sans-serif",
          }}
        >
          ← Projects
        </button>
      </div>

      <div
        style={{
          background: '#1a1e27',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '18px 20px',
          marginBottom: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              flex: 'none',
              background: project.color,
            }}
          />
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.015em', flex: 1 }}>
            {project.name}
          </div>
          <span style={{ font: `500 16px ${MONO}`, color: 'rgba(232,234,240,0.7)' }}>
            {project.pct}%
          </span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 5,
            background: 'rgba(255,255,255,0.07)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${project.pct}%`,
              background: project.color,
              borderRadius: 5,
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 12,
            fontSize: 12.5,
            color: 'rgba(232,234,240,0.5)',
          }}
        >
          <span>
            {project.done} of {project.total} tasks · {milestones.length} milestone
            {milestones.length === 1 ? '' : 's'}
          </span>
          {project.dueLabel && (
            <span style={{ font: `500 11px ${MONO}`, color: 'rgba(232,234,240,0.45)' }}>
              {project.dueLabel}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          font: `600 12px ${MONO}`,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'rgba(232,234,240,0.55)',
          marginBottom: 12,
        }}
      >
        Milestones
      </div>
      {milestones.map(milestoneCard)}

      {/* Add-milestone composer */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 26,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 12,
          padding: '8px 9px 8px 14px',
        }}
      >
        <input
          value={milestoneDraft}
          onChange={(e) => setMilestoneDraft(e.target.value)}
          onKeyDown={(e) => {
            const v = milestoneDraft.trim()
            if (e.key === 'Enter' && v) {
              createMilestone.mutate({ projectId: id, title: v })
              setMilestoneDraft('')
            }
          }}
          placeholder="Add a milestone, press Enter"
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e8eaf0',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13.5,
          }}
        />
      </div>

      {/* Unassigned tasks (belong to the project but no milestone) */}
      <div
        style={{
          font: `600 12px ${MONO}`,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'rgba(232,234,240,0.55)',
          marginBottom: 8,
        }}
      >
        Other tasks
      </div>
      <div
        style={{
          background: '#1a1e27',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14,
          padding: '3px 18px',
        }}
      >
        {unassigned.map(renderTask)}
        {taskComposer(null)}
      </div>
    </div>
  )
}
