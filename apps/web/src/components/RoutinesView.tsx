import { MONO } from '../lib/format.ts'
import { useCheckRoutine, useRoutines } from '../lib/queries.ts'
import type { RoutineView } from '../lib/types.ts'
import { ViewHeader } from './ViewHeader.tsx'

function RoutineCard({
  routine,
  onToggle,
}: { routine: RoutineView; onToggle: (id: string) => void }) {
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
              fontSize: 14,
              ...(item.done
                ? { textDecoration: 'line-through', color: 'rgba(232,234,240,0.4)' }
                : { color: '#e8eaf0' }),
            }}
          >
            {item.text}
          </span>
        </div>
      ))}
    </div>
  )
}

export function RoutinesView() {
  const { data: routines = [] } = useRoutines()
  const check = useCheckRoutine()
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
          <RoutineCard key={r.period} routine={r} onToggle={(id) => check.mutate(id)} />
        ))}
      </div>
    </div>
  )
}
