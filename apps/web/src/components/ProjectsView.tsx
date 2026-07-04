import { MONO } from '../lib/format.ts'
import { useProjects } from '../lib/queries.ts'
import { useNav } from '../nav/NavContext.tsx'
import { ProjectDetailView } from './ProjectDetailView.tsx'
import { ViewHeader } from './ViewHeader.tsx'

export function ProjectsView() {
  const { data: projects = [], isLoading } = useProjects()
  const nav = useNav()

  if (nav.projectFocus) {
    return <ProjectDetailView id={nav.projectFocus} onBack={nav.clearProjectFocus} />
  }

  return (
    <div className="view">
      <ViewHeader
        title="Projects"
        subtitle="A few active streams. Open one to see its milestones and tasks."
      />
      {isLoading ? (
        <div style={{ color: 'rgba(232,234,240,0.5)', fontSize: 13 }}>Loading…</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => nav.openProject(p.id)}
              style={{
                background: '#1a1e27',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                padding: '18px 20px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    flex: 'none',
                    background: p.color,
                  }}
                />
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name}
                </div>
                <span style={{ font: `500 13px ${MONO}`, color: 'rgba(232,234,240,0.6)' }}>
                  {p.pct}%
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 5,
                  background: 'rgba(255,255,255,0.07)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${p.pct}%`,
                    background: p.color,
                    borderRadius: 5,
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 13,
                }}
              >
                <span style={{ fontSize: 12.5, color: 'rgba(232,234,240,0.5)' }}>
                  {p.done} of {p.total} tasks
                </span>
                {p.dueLabel && (
                  <span style={{ font: `500 11px ${MONO}`, color: 'rgba(232,234,240,0.45)' }}>
                    {p.dueLabel}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
