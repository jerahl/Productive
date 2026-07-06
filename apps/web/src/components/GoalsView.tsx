import { useEffect, useState } from 'react'
import { useFocus } from '../focus/FocusContext.tsx'
import { MONO } from '../lib/format.ts'
import {
  useAddStep,
  useCreateGoal,
  useCreateGoalTask,
  useCycleDue,
  useCyclePriority,
  useDeleteGoal,
  useGoalDetail,
  useGoals,
  useToggleStep,
  useToggleTask,
  useUpdateGoal,
} from '../lib/queries.ts'
import type { Goal } from '../lib/types.ts'
import { TaskRow } from './TaskRow.tsx'
import { ViewHeader } from './ViewHeader.tsx'

const ACCENT = '#7c8cff'

function GoalCard({ goal }: { goal: Goal }) {
  const [expanded, setExpanded] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingDetail, setEditingDetail] = useState(false)
  const [nameDraft, setNameDraft] = useState(goal.name)
  const [detailDraft, setDetailDraft] = useState(goal.detail)
  const [localPct, setLocalPct] = useState(goal.pct)
  const [taskDraft, setTaskDraft] = useState('')

  useEffect(() => setLocalPct(goal.pct), [goal.pct])

  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const createTask = useCreateGoalTask()
  const detail = useGoalDetail(goal.id, expanded)
  const focus = useFocus()
  const toggleTask = useToggleTask()
  const cycleDue = useCycleDue()
  const cyclePriority = useCyclePriority()
  const addStep = useAddStep()
  const toggleStep = useToggleStep()
  const [tExpanded, setTExpanded] = useState<Set<string>>(new Set())

  const commitPct = (pct: number) => {
    if (pct !== goal.pct) updateGoal.mutate({ id: goal.id, pct })
  }
  const syncFromTasks = () => {
    if (goal.taskTotal > 0) {
      const p = Math.round((goal.taskDone / goal.taskTotal) * 100)
      setLocalPct(p)
      commitPct(p)
    }
  }

  return (
    <div
      style={{
        background: '#1a1e27',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '18px 20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {editingName ? (
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              setEditingName(false)
              const v = nameDraft.trim()
              if (v && v !== goal.name) updateGoal.mutate({ id: goal.id, name: v })
              else setNameDraft(goal.name)
            }}
            // biome-ignore lint/a11y/noAutofocus: focus the field the user just opened
            autoFocus
            style={{
              flex: 1,
              fontSize: 16,
              fontWeight: 600,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              color: '#e8eaf0',
              padding: '4px 8px',
              outline: 'none',
              fontFamily: "'Hanken Grotesk', sans-serif",
            }}
          />
        ) : (
          <div
            onClick={() => setEditingName(true)}
            style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3, flex: 1, cursor: 'text' }}
          >
            {goal.name}
          </div>
        )}
        <div style={{ font: `500 22px ${MONO}`, color: ACCENT, flex: 'none' }}>{localPct}%</div>
      </div>

      {editingDetail ? (
        <input
          value={detailDraft}
          onChange={(e) => setDetailDraft(e.target.value)}
          onBlur={() => {
            setEditingDetail(false)
            if (detailDraft !== goal.detail) updateGoal.mutate({ id: goal.id, detail: detailDraft })
          }}
          // biome-ignore lint/a11y/noAutofocus: focus the field the user just opened
          autoFocus
          placeholder="Add a detail…"
          style={{
            marginTop: 6,
            width: '100%',
            fontSize: 12.5,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            color: '#e8eaf0',
            padding: '4px 8px',
            outline: 'none',
            fontFamily: "'Hanken Grotesk', sans-serif",
          }}
        />
      ) : (
        <div
          onClick={() => setEditingDetail(true)}
          style={{
            fontSize: 12.5,
            color: 'rgba(232,234,240,0.5)',
            marginTop: 5,
            cursor: 'text',
            minHeight: 16,
          }}
        >
          {goal.detail || 'Add a detail…'}
        </div>
      )}

      <div
        style={{
          height: 6,
          borderRadius: 5,
          background: 'rgba(255,255,255,0.07)',
          overflow: 'hidden',
          marginTop: 15,
        }}
      >
        <div
          style={{ height: '100%', width: `${localPct}%`, background: ACCENT, borderRadius: 5 }}
        />
      </div>

      {/* Manual progress slider (goals are directional — you set the %). */}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={localPct}
        onChange={(e) => setLocalPct(Number(e.target.value))}
        onPointerUp={() => commitPct(localPct)}
        onKeyUp={() => commitPct(localPct)}
        aria-label={`${goal.name} progress`}
        style={{ width: '100%', marginTop: 10, accentColor: ACCENT, cursor: 'pointer' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <span
          onClick={() => setExpanded((v) => !v)}
          style={{ font: `500 11px ${MONO}`, color: '#9fb0ff', cursor: 'pointer' }}
        >
          {expanded ? 'Hide tasks' : `Tasks ${goal.taskDone}/${goal.taskTotal}`}
        </span>
        {goal.taskTotal > 0 && (
          <span
            onClick={syncFromTasks}
            title="Set % to match linked task completion"
            style={{ font: `500 11px ${MONO}`, color: 'rgba(232,234,240,0.45)', cursor: 'pointer' }}
          >
            sync from tasks
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span
          onClick={() => deleteGoal.mutate(goal.id)}
          title="Delete goal"
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

      {expanded && (
        <div
          style={{
            marginTop: 10,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '3px 14px',
          }}
        >
          {(detail.data?.tasks ?? []).map((task) => (
            <TaskRow
              key={task.id}
              task={{ ...task, steps: task.steps ?? [], tags: task.tags ?? [] }}
              expanded={tExpanded.has(task.id)}
              onToggleExpand={() =>
                setTExpanded((prev) => {
                  const n = new Set(prev)
                  if (n.has(task.id)) n.delete(task.id)
                  else n.add(task.id)
                  return n
                })
              }
              onToggle={() => toggleTask.mutate(task.id)}
              onCycleDue={() => cycleDue.mutate(task.id)}
              onCyclePriority={() => cyclePriority.mutate(task.id)}
              onAddStep={(text) => addStep.mutate({ id: task.id, text })}
              onToggleStep={(sid) => toggleStep.mutate({ id: task.id, sid })}
              onStartReorder={() => {}}
              onStartFocus={() => focus.open({ taskId: task.id })}
            />
          ))}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 0',
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
              value={taskDraft}
              onChange={(e) => setTaskDraft(e.target.value)}
              onKeyDown={(e) => {
                const v = taskDraft.trim()
                if (e.key === 'Enter' && v) {
                  createTask.mutate({ title: v, goalId: goal.id })
                  setTaskDraft('')
                }
              }}
              placeholder="Add a task toward this goal, press Enter"
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
        </div>
      )}
    </div>
  )
}

export function GoalsView() {
  const { data: goals = [] } = useGoals()
  const createGoal = useCreateGoal()
  const [draft, setDraft] = useState('')

  return (
    <div className="view">
      <ViewHeader
        title="Goals"
        subtitle="The bigger picture. Set the progress, or link tasks and sync it from the work."
      />
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 18,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 12,
          padding: '8px 9px 8px 14px',
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            const v = draft.trim()
            if (e.key === 'Enter' && v) {
              createGoal.mutate({ name: v })
              setDraft('')
            }
          }}
          placeholder="Name a goal, press Enter"
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} />
        ))}
      </div>
    </div>
  )
}
