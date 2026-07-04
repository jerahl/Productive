import { MONO } from '../lib/format.ts'

const PHASE: Record<string, string> = {
  overview: 'Phase 2',
  projects: 'Phase 4',
  docs: 'Phase 4',
  meetings: 'Phase 4',
  goals: 'Phase 4',
  routines: 'Phase 4',
  notes: 'Phase 4',
  canvas: 'Phase 5',
  vision: 'Phase 5',
}

export function Placeholder({ view, label }: { view: string; label: string }) {
  return (
    <div className="view">
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.015em' }}>{label}</div>
      </div>
      <div
        style={{
          background: '#1a1e27',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '48px 24px',
          textAlign: 'center',
          color: 'rgba(232,234,240,0.5)',
        }}
      >
        <div style={{ fontSize: 14, marginBottom: 8 }}>This view is on the way.</div>
        <div style={{ font: `500 11px ${MONO}`, letterSpacing: '0.06em', color: '#9fb0ff' }}>
          {label.toUpperCase()} · {PHASE[view] ?? 'later'}
        </div>
      </div>
    </div>
  )
}
