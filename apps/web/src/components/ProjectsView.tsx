import { useState } from 'react'
import { MONO } from '../lib/format.ts'
import { useCreateProject, useDeleteProject, useProjects } from '../lib/queries.ts'
import { useNav } from '../nav/NavContext.tsx'
import { ProjectDetailView } from './ProjectDetailView.tsx'
import { ViewHeader } from './ViewHeader.tsx'

// Cycle project accent colors so new projects don't all look alike.
const PALETTE = ['#7c8cff', '#5ec98a', '#e0a05a', '#e07a8a', '#5ec9c9', '#b78cff']

export function ProjectsView() {
  const { data: projects = [], isLoading } = useProjects()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()
  const nav = useNav()
  const [draft, setDraft] = useState('')

  if (nav.projectFocus) {
    return <ProjectDetailView id={nav.projectFocus} onBack={nav.clearProjectFocus} />
  }

  const addProject = () => {
    const name = draft.trim()
    if (!name) return
    createProject.mutate({ name, color: PALETTE[projects.length % PALETTE.length] as string })
    setDraft('')
  }

  return (
    <div className="view">
      <ViewHeader
        title="Projects"
        subtitle="A few active streams. Open one to see its milestones and tasks."
      />
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 18,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 12,
          padding: '8px 9px 8px 14px',
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addProject()
          }}
          placeholder="Name a project, press Enter"
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e8eaf0',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 13.5,
          }}
        />
      </div>
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
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteProject.mutate(p.id)
                  }}
                  title="Delete project (tasks are kept)"
                  style={{
                    fontSize: 15,
                    color: 'rgba(232,234,240,0.3)',
                    cursor: 'pointer',
                    lineHeight: 1,
                    flex: 'none',
                  }}
                >
                  ×
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
