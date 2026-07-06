import { useState } from 'react'
import { MONO, dateLong, meetingTime } from '../lib/format.ts'
import { useCreateMeeting, useDeleteMeeting, useMeetings } from '../lib/queries.ts'
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

const inputStyle = {
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#e8eaf0',
  fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 13.5,
} as const

export function MeetingsView() {
  const { data: meetings = [] } = useMeetings()
  const createMeeting = useCreateMeeting()
  const deleteMeeting = useDeleteMeeting()
  const status = statuses(meetings)
  const [title, setTitle] = useState('')
  const [who, setWho] = useState('')
  const [when, setWhen] = useState('')

  const addMeeting = () => {
    const t = title.trim()
    if (!t || !when) return
    // <input type="datetime-local"> gives local wall-clock; store as ISO.
    createMeeting.mutate({ title: t, startsAt: new Date(when).toISOString(), who: who.trim() })
    setTitle('')
    setWho('')
    setWhen('')
  }

  return (
    <div className="view">
      <ViewHeader title="Meetings" subtitle={`${dateLong()} · ${meetings.length} meetings`} />
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          marginBottom: 16,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 12,
          padding: '8px 10px 8px 14px',
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addMeeting()
          }}
          placeholder="Meeting title"
          style={{ ...inputStyle, flex: '2 1 160px', minWidth: 0 }}
        />
        <input
          value={who}
          onChange={(e) => setWho(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addMeeting()
          }}
          placeholder="Who"
          style={{ ...inputStyle, flex: '1 1 100px', minWidth: 0 }}
        />
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addMeeting()
          }}
          aria-label="Meeting time"
          style={{ ...inputStyle, flex: 'none', colorScheme: 'dark' }}
        />
        <button
          type="button"
          onClick={addMeeting}
          disabled={!title.trim() || !when}
          style={{
            flex: 'none',
            font: `500 12px ${MONO}`,
            color: '#0f1116',
            background: '#7c8cff',
            border: 'none',
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            opacity: !title.trim() || !when ? 0.5 : 1,
          }}
        >
          Add
        </button>
      </div>
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
              <span
                onClick={() => deleteMeeting.mutate(m.id)}
                title="Delete meeting"
                style={{
                  fontSize: 16,
                  color: 'rgba(232,234,240,0.3)',
                  cursor: 'pointer',
                  flex: 'none',
                  lineHeight: 1,
                }}
              >
                ×
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
