import { useState } from 'react'
import { MONO } from '../lib/format.ts'
import { useCheckRoutine, useCreateRoutine, useDeleteRoutine, useRoutines } from '../lib/queries.ts'
import type { RoutineView } from '../lib/types.ts'
import { ViewHeader } from './ViewHeader.tsx'

function RoutineCard({
  routine,
  onToggle,
  onAdd,
  onDelete,
}: {
  routine: RoutineView
  onToggle: (id: string) => void
  onAdd: (period: 'morning' | 'evening', text: string) => void
  onDelete: (id: string) => void
}) {
  const [draft, setDraft] = useState('')
  const pct = routine.total > 0 ? Math.round((routine.done / routine.total) * 100) : 0
  const label = routine.period === 'morning' ? 'Morning' : 'Evening'
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
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600 }}>{label}</div>
        <span
          style={{
            font: `500 11px ${MONO}`,
            color: '#5ec98a',
            background: 'rgba(94,201,138,0.13)',
            padding: '2px 9px',
            borderRadius: 7,
          }}
        >
          {routine.done}/{routine.total}
        </span>
      </div>
      <div
        style={{
          height: 5,
          borderRadius: 4,
          background: 'rgba(255,255,255,0.07)',
          overflow: 'hidden',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: '#5ec98a',
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      {routine.items.map((item) => (
        <div
          key={item.id}
          onClick={() => onToggle(item.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 0',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            cursor: 'pointer',
          }}
        >
          {item.done ? (
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
                fontSize: 11,
                fontWeight: 700,
                background: '#7c8cff',
                color: '#0f1116',
                border: '1.5px solid #7c8cff',
              }}
            >
              ✓
            </div>
          ) : (
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 7,
                flex: 'none',
                border: '1.5px solid rgba(255,255,255,0.2)',
              }}
            />
          )}
          <span
            style={{
              flex: 1,
              fontSize: 14,
              ...(item.done
                ? { textDecoration: 'line-through', color: 'rgba(232,234,240,0.4)' }
                : { color: '#e8eaf0' }),
            }}
          >
            {item.text}
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation()
              onDelete(item.id)
            }}
            title="Delete routine step"
            style={{
              fontSize: 15,
              color: 'rgba(232,234,240,0.3)',
              cursor: 'pointer',
              flex: 'none',
              lineHeight: 1,
            }}
          >
            ×
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: 7,
            flex: 'none',
            border: '1.5px dashed rgba(255,255,255,0.2)',
          }}
        />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            const v = draft.trim()
            if (e.key === 'Enter' && v) {
              onAdd(routine.period, v)
              setDraft('')
            }
          }}
          placeholder={`Add a ${label.toLowerCase()} step, press Enter`}
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
  )
}

export function RoutinesView() {
  const { data: routines = [] } = useRoutines()
  const check = useCheckRoutine()
  const createRoutine = useCreateRoutine()
  const deleteRoutine = useDeleteRoutine()
  return (
    <div className="view">
      <ViewHeader
        title="Routines"
        subtitle="Anchors for the start and end of the day. Same steps, every time — less deciding."
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}
      >
        {routines.map((r) => (
          <RoutineCard
            key={r.period}
            routine={r}
            onToggle={(id) => check.mutate(id)}
            onAdd={(period, text) => createRoutine.mutate({ period, text })}
            onDelete={(id) => deleteRoutine.mutate(id)}
          />
        ))}
      </div>
    </div>
  )
}
