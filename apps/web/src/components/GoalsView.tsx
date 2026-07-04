import { MONO } from '../lib/format.ts'
import { useGoals } from '../lib/queries.ts'
import { ViewHeader } from './ViewHeader.tsx'

export function GoalsView() {
  const { data: goals = [] } = useGoals()
  return (
    <div className="view">
      <ViewHeader
        title="Goals"
        subtitle="The bigger picture. Tasks feed these — keep them in view so daily work means something."
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}
      >
        {goals.map((g) => (
          <div
            key={g.id}
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
              <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3, flex: 1 }}>
                {g.name}
              </div>
              <div style={{ font: `500 22px ${MONO}`, color: '#7c8cff', flex: 'none' }}>
                {g.pct}%
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: 'rgba(232,234,240,0.5)', marginTop: 5 }}>
              {g.detail}
            </div>
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
                style={{
                  height: '100%',
                  width: `${g.pct}%`,
                  background: '#7c8cff',
                  borderRadius: 5,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
