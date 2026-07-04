import { useFocus } from '../focus/FocusContext.tsx'
import { MONO } from '../lib/format.ts'

export type ViewId =
  | 'overview'
  | 'tasks'
  | 'projects'
  | 'docs'
  | 'meetings'
  | 'goals'
  | 'routines'
  | 'notes'
  | 'canvas'
  | 'vision'

export const NAV: { id: ViewId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'projects', label: 'Projects' },
  { id: 'docs', label: 'Docs' },
  { id: 'meetings', label: 'Meetings' },
  { id: 'goals', label: 'Goals' },
  { id: 'routines', label: 'Routines' },
  { id: 'notes', label: 'Notes' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'vision', label: 'Vision Board' },
]

type Props = {
  active: ViewId
  onNavigate: (id: ViewId) => void
  tasksBadge: number
}

export function Sidebar({ active, onNavigate, tasksBadge }: Props) {
  const focus = useFocus()
  return (
    <aside
      className="sidebar"
      style={{
        width: 248,
        flex: 'none',
        height: '100vh',
        background: '#14171e',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 14px',
      }}
    >
      <div
        className="side-brand"
        style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '6px 8px 20px' }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            background: '#7c8cff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 0 4px rgba(124,140,255,0.15)',
          }}
        >
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#0f1116' }} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>Beacon</div>
      </div>

      <nav
        className="nav-list"
        style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, overflow: 'auto' }}
      >
        {NAV.map((item) => {
          const on = item.id === active
          const badge = item.id === 'tasks' && tasksBadge > 0 ? String(tasksBadge) : null
          return (
            <div
              key={item.id}
              className="nav-item"
              onClick={() => onNavigate(item.id)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 11px',
                borderRadius: 9,
                cursor: 'pointer',
                fontSize: 13.5,
                color: '#e8eaf0',
              }}
            >
              {on && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 9,
                    background: 'rgba(124,140,255,0.13)',
                  }}
                />
              )}
              <span
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  flex: 'none',
                  background: on ? '#7c8cff' : 'rgba(255,255,255,0.24)',
                }}
              />
              <span style={{ position: 'relative', zIndex: 1, color: 'rgba(232,234,240,0.85)' }}>
                {item.label}
              </span>
              {badge && (
                <span
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    marginLeft: 'auto',
                    font: `500 10px ${MONO}`,
                    color: '#9fb0ff',
                    background: 'rgba(124,140,255,0.16)',
                    padding: '1px 6px',
                    borderRadius: 6,
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
          )
        })}
      </nav>

      <div
        className="side-foot"
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
          paddingTop: 14,
        }}
      >
        <div
          onClick={() => focus.open()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 10,
            borderRadius: 11,
            background: 'rgba(124,140,255,0.13)',
            color: '#bcc6ff',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Start a focus session
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '9px 12px',
            borderRadius: 11,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#5ec98a',
              boxShadow: '0 0 8px #5ec98a',
              flex: 'none',
            }}
          />
          <span style={{ fontSize: 12.5, color: 'rgba(232,234,240,0.7)' }}>Day streak</span>
        </div>
      </div>
    </aside>
  )
}
