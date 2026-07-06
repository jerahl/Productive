import { MONO, dateLong, meetingTime } from '../lib/format.ts'
import { useMeetings } from '../lib/queries.ts'
import type { Meeting } from '../lib/types.ts'
import { ViewHeader } from './ViewHeader.tsx'

type Status = 'done' | 'next' | 'upcoming'
const META: Record<Status, { color: string; label: string; bg: string }> = {
  done: { color: '#5ec98a', label: 'Done', bg: 'rgba(94,201,138,0.14)' },
  next: { color: '#7c8cff', label: 'Up next', bg: 'rgba(124,140,255,0.16)' },
  upcoming: { color: 'rgba(232,234,240,0.5)', label: 'Later', bg: 'rgba(255,255,255,0.05)' },
}

/** Derive done / next / upcoming from wall-clock time (first future = next). */
function statuses(meetings: Meeting[]): Status[] {
  const now = Date.now()
  let nextTaken = false
  return meetings.map((m) => {
    if (Date.parse(m.startsAt) < now) return 'done'
    if (!nextTaken) {
      nextTaken = true
      return 'next'
    }
    return 'upcoming'
  })
}

export function MeetingsView() {
  const { data: meetings = [] } = useMeetings()
  const status = statuses(meetings)
  return (
    <div className="view">
      <ViewHeader title="Meetings" subtitle={`${dateLong()} · ${meetings.length} meetings`} />
      <div
        style={{
          background: '#1a1e27',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '6px 20px',
        }}
      >
        {meetings.map((m, i) => {
          const s = status[i] ?? 'upcoming'
          const meta = META[s]
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 15,
                padding: '15px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                style={{
                  font: `500 14px ${MONO}`,
                  width: 54,
                  flex: 'none',
                  color: s === 'next' ? '#e0a05a' : 'rgba(232,234,240,0.6)',
                }}
              >
                {meetingTime(m.startsAt)}
              </div>
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  flex: 'none',
                  background: meta.color,
                  boxShadow: s === 'next' ? `0 0 8px ${meta.color}` : undefined,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: s === 'done' ? 'rgba(232,234,240,0.55)' : '#e8eaf0',
                  }}
                >
                  {m.title}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(232,234,240,0.5)', marginTop: 1 }}>
                  {m.who}
                </div>
              </div>
              <span
                style={{
                  font: `500 11px ${MONO}`,
                  flex: 'none',
                  padding: '3px 10px',
                  borderRadius: 7,
                  color: meta.color,
                  background: meta.bg,
                }}
              >
                {meta.label}
              </span>
            </div>
          )
        })}
        {meetings.length === 0 && (
          <div style={{ padding: '15px 0', fontSize: 13, color: 'rgba(232,234,240,0.5)' }}>
            Nothing on the agenda. Ask Claude to add a meeting, or enjoy the quiet.
          </div>
        )}
      </div>
    </div>
  )
}
