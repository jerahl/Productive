import { useEffect } from 'react'
import { useFocus } from '../focus/FocusContext.tsx'
import { MONO } from '../lib/format.ts'

function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function FocusOverlay() {
  const { active, togglePause, addFive, finish } = useFocus()

  // Escape logs the session as a partial (not completed) and closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [finish])

  if (!active) return null
  const pct =
    active.totalSeconds > 0
      ? Math.round(((active.totalSeconds - active.secondsLeft) / active.totalSeconds) * 100)
      : 0

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(10,12,16,0.86)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#16191f',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 22,
          padding: '38px 40px',
          width: 'min(420px, 92vw)',
          textAlign: 'center',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            font: `500 11px ${MONO}`,
            letterSpacing: '0.11em',
            textTransform: 'uppercase',
            color: '#9fb0ff',
          }}
        >
          Focus session
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginTop: 10,
            color: 'rgba(232,234,240,0.85)',
            lineHeight: 1.3,
          }}
        >
          {active.title}
        </div>
        <div
          style={{
            font: `500 64px ${MONO}`,
            margin: '22px 0 8px',
            letterSpacing: '-0.02em',
            color: '#e8eaf0',
          }}
        >
          {mmss(active.secondsLeft)}
        </div>
        <div
          style={{
            height: 5,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
            marginBottom: 26,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: '#7c8cff',
              borderRadius: 4,
              transition: 'width 1s linear',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={togglePause}
            style={{
              background: '#7c8cff',
              color: '#0f1116',
              border: 'none',
              borderRadius: 11,
              padding: '12px 28px',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: "'Hanken Grotesk', sans-serif",
            }}
          >
            {active.running ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={addFive}
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#e8eaf0',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 11,
              padding: '12px 18px',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: "'Hanken Grotesk', sans-serif",
            }}
          >
            +5 min
          </button>
          <button
            type="button"
            onClick={() => finish(true)}
            style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#e8eaf0',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 11,
              padding: '12px 18px',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: "'Hanken Grotesk', sans-serif",
            }}
          >
            Done
          </button>
        </div>
        <div style={{ marginTop: 18, fontSize: 12, color: 'rgba(232,234,240,0.45)' }}>
          One task. One timer. Everything else can wait.
        </div>
      </div>
    </div>
  )
}
