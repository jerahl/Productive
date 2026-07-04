import { useMemo, useState } from 'react'
import { useFocus } from '../focus/FocusContext.tsx'
import { MONO } from '../lib/format.ts'
import {
  useAddStep,
  useCycleDue,
  useCyclePriority,
  useInbox,
  useOverview,
  useProjects,
  useSetEnergy,
  useTasks,
  useToggleStep,
  useToggleTask,
  useTriage,
} from '../lib/queries.ts'
import type { EnergyLevel } from '../lib/types.ts'
import { useNav } from '../nav/NavContext.tsx'
import { TaskRow } from './TaskRow.tsx'

const ENERGY: { label: string; level: EnergyLevel; color: string }[] = [
  { label: 'Low', level: 'low', color: '#e07a8a' },
  { label: 'Medium', level: 'medium', color: '#e0a05a' },
  { label: 'High', level: 'high', color: '#5ec98a' },
]

const ENERGY_HINT: Record<EnergyLevel, string> = {
  low: 'Low energy is fine. Pick one 5-minute task and stop there.',
  medium: 'Steady. Knock out a couple of medium tasks before the next dip.',
  high: 'Protect this. Start the hardest thing while it lasts.',
}

const card = {
  background: '#1a1e27',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 16,
} as const

const cardLabel = {
  font: `500 11px ${MONO}`,
  letterSpacing: '0.07em',
  textTransform: 'uppercase' as const,
  color: 'rgba(232,234,240,0.4)',
}

export function OverviewView() {
  const overviewQ = useOverview()
  const tasksQ = useTasks()
  const inboxQ = useInbox()
  const focus = useFocus()
  const nav = useNav()
  const setEnergy = useSetEnergy()
  const { data: projects = [] } = useProjects()
  const projectName = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])

  const toggleTask = useToggleTask()
  const cycleDue = useCycleDue()
  const cyclePriority = useCyclePriority()
  const addStep = useAddStep()
  const toggleStep = useToggleStep()
  const triage = useTriage()

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)

  if (overviewQ.isLoading || !overviewQ.data) {
    return <div style={{ color: 'rgba(232,234,240,0.5)', fontSize: 13 }}>Loading…</div>
  }
  const o = overviewQ.data
  const inbox = inboxQ.data ?? []
  const todayTasks = tasksQ.data?.groups.find((g) => g.key === 'today')?.tasks ?? []
  const openToday = todayTasks.filter((t) => !t.done)
  const visible = showAll ? openToday : openToday.slice(0, 3)

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="view">
      {/* Right now — just one thing */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(124,140,255,0.16), rgba(124,140,255,0.03))',
          border: '1px solid rgba(124,140,255,0.22)',
          borderRadius: 18,
          padding: '22px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <div
            style={{
              font: `500 11px ${MONO}`,
              letterSpacing: '0.11em',
              textTransform: 'uppercase',
              color: '#9fb0ff',
            }}
          >
            Right now — just one thing
          </div>
          <div
            style={{
              fontSize: 23,
              fontWeight: 700,
              marginTop: 9,
              letterSpacing: '-0.015em',
              lineHeight: 1.25,
            }}
          >
            {o.rightNow ? o.rightNow.title : "You're clear for now — nice work."}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 13, flexWrap: 'wrap' }}>
            {o.rightNow?.estMinutes != null && o.rightNow.estMinutes > 0 && (
              <span
                style={{
                  font: `500 11px ${MONO}`,
                  color: '#bcc6ff',
                  background: 'rgba(124,140,255,0.16)',
                  padding: '3px 9px',
                  borderRadius: 7,
                }}
              >
                {o.rightNow.estMinutes}m
              </span>
            )}
            {o.rightNow?.project && (
              <span
                style={{
                  fontSize: 12,
                  color: 'rgba(232,234,240,0.6)',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '3px 9px',
                  borderRadius: 7,
                }}
              >
                {o.rightNow.project}
              </span>
            )}
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 13,
              lineHeight: 1.5,
              color: 'rgba(232,234,240,0.6)',
              maxWidth: 540,
            }}
          >
            {o.nudge}
          </div>
        </div>
        <button
          type="button"
          onClick={() => focus.open(o.rightNow ? { taskId: o.rightNow.taskId } : {})}
          style={{
            background: '#7c8cff',
            color: '#0f1116',
            border: 'none',
            borderRadius: 13,
            padding: '15px 24px',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            flex: 'none',
            fontFamily: "'Hanken Grotesk', sans-serif",
          }}
        >
          Start focus
        </button>
      </div>

      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 18 }}>
        {/* Today */}
        <div
          style={{
            ...card,
            flex: '2 1 380px',
            minWidth: 0,
            padding: '18px 20px',
            alignSelf: 'flex-start',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600 }}>Today</div>
            <div style={{ font: `500 12px ${MONO}`, color: 'rgba(232,234,240,0.5)' }}>
              {o.today.done} of {o.today.total} done
            </div>
          </div>
          <div
            style={{
              height: 5,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.07)',
              overflow: 'hidden',
              marginBottom: 6,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${o.today.pct}%`,
                background: '#5ec98a',
                borderRadius: 4,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div className="task-list" data-group="today">
            {visible.map((task) => (
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
                onStartReorder={() => {}}
                onStartFocus={() => focus.open({ taskId: task.id })}
                projectName={task.projectId ? projectName.get(task.projectId) : null}
                onOpenProject={
                  task.projectId ? () => nav.openProject(task.projectId as string) : undefined
                }
              />
            ))}
          </div>
          {openToday.length === 0 && (
            <div style={{ padding: '20px 4px', fontSize: 13, color: 'rgba(232,234,240,0.5)' }}>
              Nothing left for today. That counts as a win — go rest.
            </div>
          )}
          {openToday.length > 3 && (
            <div
              onClick={() => setShowAll((s) => !s)}
              style={{
                marginTop: 13,
                fontSize: 12.5,
                color: '#9fb0ff',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {showAll ? 'Show less' : `+${openToday.length - 3} more today`}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Energy */}
          <div style={{ ...card, padding: '16px 18px' }}>
            <div style={{ ...cardLabel, marginBottom: 11 }}>Energy right now</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {ENERGY.map((opt) => {
                const on = o.energy === opt.level
                return (
                  <div
                    key={opt.level}
                    onClick={() => setEnergy.mutate(opt.level)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      padding: '9px 4px',
                      borderRadius: 10,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      background: on ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                      color: on ? '#e8eaf0' : 'rgba(232,234,240,0.6)',
                      border: `1px solid ${on ? opt.color : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        flex: 'none',
                        background: opt.color,
                      }}
                    />
                    {opt.label}
                  </div>
                )
              })}
            </div>
            <div
              style={{
                marginTop: 11,
                fontSize: 12.5,
                lineHeight: 1.45,
                color: 'rgba(232,234,240,0.5)',
              }}
            >
              {o.energy ? ENERGY_HINT[o.energy] : 'Match your hardest task to your highest energy.'}
            </div>
          </div>

          {/* Momentum */}
          <div style={{ ...card, padding: '16px 18px' }}>
            <div style={{ ...cardLabel, marginBottom: 13 }}>Momentum</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
              <div style={{ flex: 'none' }}>
                <div style={{ font: `500 32px ${MONO}`, color: '#5ec98a', lineHeight: 1 }}>
                  {o.streak}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(232,234,240,0.5)', marginTop: 3 }}>
                  day streak
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 26 }}>
                  {o.week.map((d) => (
                    <div
                      key={d.date}
                      style={{
                        flex: 1,
                        height: d.active ? 22 : 13,
                        alignSelf: 'flex-end',
                        borderRadius: 4,
                        background: d.active ? 'rgba(94,201,138,0.6)' : 'rgba(255,255,255,0.07)',
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(232,234,240,0.5)', marginTop: 9 }}>
                  {o.today.done} of {o.today.total} done today
                </div>
              </div>
            </div>
          </div>

          {/* Next up */}
          <div style={{ ...card, padding: '16px 18px' }}>
            <div style={{ ...cardLabel, marginBottom: 12 }}>Next up</div>
            {o.nextMeeting ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                <div style={{ font: `500 14px ${MONO}`, color: '#e0a05a', flex: 'none' }}>
                  {o.nextMeeting.time}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{o.nextMeeting.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(232,234,240,0.5)', marginTop: 1 }}>
                    {o.nextMeeting.who}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'rgba(232,234,240,0.5)' }}>
                Nothing else on the calendar today.
              </div>
            )}
          </div>

          {/* Brain dump */}
          <div style={{ ...card, padding: '16px 18px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <div style={cardLabel}>Brain dump</div>
              <div
                style={{
                  font: `500 11px ${MONO}`,
                  color: '#9fb0ff',
                  background: 'rgba(124,140,255,0.16)',
                  padding: '1px 7px',
                  borderRadius: 6,
                }}
              >
                {inbox.length}
              </div>
            </div>
            {inbox.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.3)',
                    flex: 'none',
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 13,
                    color: 'rgba(232,234,240,0.82)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.text}
                </span>
                <span
                  onClick={() => triage.mutate(item.id)}
                  style={{
                    font: `500 11px ${MONO}`,
                    color: '#9fb0ff',
                    cursor: 'pointer',
                    flex: 'none',
                  }}
                >
                  → today
                </span>
              </div>
            ))}
            {inbox.length === 0 && (
              <div style={{ padding: '8px 0', fontSize: 12.5, color: 'rgba(232,234,240,0.45)' }}>
                Inbox zero. Capture a thought up top anytime.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
