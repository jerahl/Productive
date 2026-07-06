import { useState } from 'react'
import { MONO, relativeTime, tint } from '../lib/format.ts'
import { useCreateNote, useDeleteNote, useNotes, useUpdateNote } from '../lib/queries.ts'
import type { Note } from '../lib/types.ts'
import { ViewHeader } from './ViewHeader.tsx'

const PALETTE = ['#7c8cff', '#e0a05a', '#5ec98a', '#c98ad6', null]

function NoteCard({
  note,
  onSave,
  onDelete,
}: {
  note: Note
  onSave: (text: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.text)
  return (
    <div
      style={{
        breakInside: 'avoid',
        marginBottom: 16,
        background: tint(note.color, 0.08),
        border: `1px solid ${tint(note.color, 0.18)}`,
        borderRadius: 14,
        padding: '16px 18px',
      }}
    >
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false)
            const v = draft.trim()
            if (v && v !== note.text) onSave(v)
            else setDraft(note.text)
          }}
          // biome-ignore lint/a11y/noAutofocus: focus the field the user just opened
          autoFocus
          style={{
            width: '100%',
            minHeight: 64,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            color: '#e8eaf0',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: '#e8eaf0',
            cursor: 'text',
            whiteSpace: 'pre-wrap',
          }}
        >
          {note.text}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 13,
        }}
      >
        <div style={{ font: `500 11px ${MONO}`, color: 'rgba(232,234,240,0.4)' }}>
          {relativeTime(note.updatedAt)}
        </div>
        <span
          onClick={onDelete}
          title="Delete note"
          style={{
            fontSize: 15,
            color: 'rgba(232,234,240,0.35)',
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          ×
        </span>
      </div>
    </div>
  )
}

export function NotesView() {
  const { data: notes = [] } = useNotes()
  const create = useCreateNote()
  const update = useUpdateNote()
  const del = useDeleteNote()
  const [draft, setDraft] = useState('')

  const add = () => {
    const text = draft.trim()
    if (!text) return
    const color = PALETTE[notes.length % PALETTE.length]
    create.mutate({ text, color })
    setDraft('')
  }

  return (
    <div className="view">
      <ViewHeader
        title="Notes"
        subtitle="Loose thoughts, references, and reminders — no structure required."
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
            if (e.key === 'Enter') add()
          }}
          placeholder="Jot a note, press Enter"
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
        <button
          type="button"
          onClick={add}
          style={{
            background: '#7c8cff',
            color: '#0f1116',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            fontWeight: 600,
            fontSize: 12.5,
            cursor: 'pointer',
            flex: 'none',
            fontFamily: "'Hanken Grotesk', sans-serif",
          }}
        >
          Add note
        </button>
      </div>
      <div style={{ columns: '280px', columnGap: 16 }}>
        {notes.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            onSave={(text) => update.mutate({ id: n.id, text })}
            onDelete={() => del.mutate(n.id)}
          />
        ))}
      </div>
    </div>
  )
}
