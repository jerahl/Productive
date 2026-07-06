import { useEffect, useState } from 'react'
import { MONO, relativeTime } from '../lib/format.ts'
import { renderMarkdown } from '../lib/markdown.ts'
import { useCreateDoc, useDoc, useDocs, useUpdateDoc } from '../lib/queries.ts'
import { ViewHeader } from './ViewHeader.tsx'

const btn = (primary: boolean) => ({
  background: primary ? '#7c8cff' : 'rgba(255,255,255,0.06)',
  color: primary ? '#0f1116' : '#e8eaf0',
  border: primary ? 'none' : '1px solid rgba(255,255,255,0.1)',
  borderRadius: 9,
  padding: '8px 15px',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: "'Hanken Grotesk', sans-serif",
})

const fieldStyle = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 8,
  color: '#e8eaf0',
  fontFamily: "'Hanken Grotesk', sans-serif",
  padding: '8px 12px',
  outline: 'none',
} as const

function DocEditor({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: doc } = useDoc(id)
  const update = useUpdateDoc()
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState('')
  const [body, setBody] = useState('')
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (doc && !loaded) {
      setTitle(doc.title)
      setTag(doc.tag)
      setBody(doc.bodyMd)
      setLoaded(true)
    }
  }, [doc, loaded])

  if (!doc) return <div style={{ color: 'rgba(232,234,240,0.5)', fontSize: 13 }}>Loading…</div>

  const dirty = title !== doc.title || tag !== doc.tag || body !== doc.bodyMd

  return (
    <div className="view">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button type="button" onClick={onBack} style={btn(false)}>
          ← Docs
        </button>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
          style={btn(false)}
        >
          {mode === 'edit' ? 'Preview' : 'Edit'}
        </button>
        <button
          type="button"
          disabled={!dirty || update.isPending}
          onClick={() => update.mutate({ id, title, tag, bodyMd: body })}
          style={{ ...btn(true), opacity: dirty ? 1 : 0.5, cursor: dirty ? 'pointer' : 'default' }}
        >
          {update.isPending ? 'Saving…' : dirty ? 'Save' : 'Saved'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          style={{ ...fieldStyle, flex: 1, fontSize: 18, fontWeight: 600 }}
        />
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="tag"
          style={{ ...fieldStyle, width: 140, font: `500 12px ${MONO}` }}
        />
      </div>
      {mode === 'edit' ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="# Start writing…"
          style={{
            ...fieldStyle,
            width: '100%',
            minHeight: 380,
            resize: 'vertical',
            font: `13.5px ${MONO}`,
            lineHeight: 1.6,
          }}
        />
      ) : (
        <div
          className="doc-preview"
          style={{
            background: '#1a1e27',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 12,
            padding: '18px 22px',
            minHeight: 380,
            fontSize: 14,
            lineHeight: 1.6,
            color: '#e8eaf0',
          }}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: local single-user content via our own escaping renderer
          dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
        />
      )}
    </div>
  )
}

export function DocsView() {
  const { data: docs = [] } = useDocs()
  const create = useCreateDoc()
  const [openId, setOpenId] = useState<string | null>(null)

  if (openId) return <DocEditor id={openId} onBack={() => setOpenId(null)} />

  return (
    <div className="view">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <ViewHeader
            title="Docs"
            subtitle="Long-form thinking and reference material, out of your head and on the page."
          />
        </div>
        <button
          type="button"
          onClick={() =>
            create.mutate({ title: 'Untitled', bodyMd: '' }, { onSuccess: (d) => setOpenId(d.id) })
          }
          style={btn(true)}
        >
          + New doc
        </button>
      </div>
      <div
        style={{
          background: '#1a1e27',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {docs.map((d) => (
          <div
            key={d.id}
            onClick={() => setOpenId(d.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '15px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'rgba(124,140,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              <div
                style={{ width: 13, height: 16, borderRadius: 2, border: '1.5px solid #9fb0ff' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{d.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(232,234,240,0.45)', marginTop: 1 }}>
                Edited {relativeTime(d.updatedAt)}
              </div>
            </div>
            {d.tag && (
              <span
                style={{
                  font: `500 11px ${MONO}`,
                  color: 'rgba(232,234,240,0.55)',
                  background: 'rgba(255,255,255,0.05)',
                  padding: '3px 9px',
                  borderRadius: 6,
                  flex: 'none',
                }}
              >
                {d.tag}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
