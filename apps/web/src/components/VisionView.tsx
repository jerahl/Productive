import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { api } from '../lib/api.ts'
import { MONO } from '../lib/format.ts'
import { useVision } from '../lib/queries.ts'
import type { VisionTile } from '../lib/types.ts'
import { ViewHeader } from './ViewHeader.tsx'

const STRIPES =
  'repeating-linear-gradient(45deg, #191d26, #191d26 11px, #1d2230 11px, #1d2230 22px)'

function Tile({ tile, onChanged }: { tile: VisionTile; onChanged: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [caption, setCaption] = useState(tile.caption)
  const [busy, setBusy] = useState(false)

  const upload = (file: File) => {
    setBusy(true)
    api.uploadVisionImage(tile.id, file).then(() => {
      setBusy(false)
      onChanged()
    })
  }

  const hasImage = Boolean(tile.imagePath)
  return (
    <div
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
        aspectRatio: '4 / 3',
        background: hasImage
          ? `linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.05)), url(/api/uploads/${tile.imagePath}) center/cover`
          : STRIPES,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 15,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            font: `500 10px ${MONO}`,
            letterSpacing: '0.08em',
            color: 'rgba(232,234,240,0.55)',
            textTransform: 'uppercase',
          }}
        >
          {tile.tag}
        </span>
        <span
          onClick={() => fileRef.current?.click()}
          style={{
            font: `500 9px ${MONO}`,
            color: 'rgba(232,234,240,0.5)',
            border: '1px solid rgba(255,255,255,0.18)',
            padding: '1px 6px',
            borderRadius: 5,
            cursor: 'pointer',
          }}
        >
          {busy ? 'uploading…' : hasImage ? 'replace' : 'add image'}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) upload(f)
          }}
        />
      </div>
      {editing ? (
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => {
            setEditing(false)
            const v = caption.trim()
            if (v && v !== tile.caption)
              api.updateVisionTile(tile.id, { caption: v }).then(onChanged)
            else setCaption(tile.caption)
          }}
          // biome-ignore lint/a11y/noAutofocus: focus the field the user just opened
          autoFocus
          style={{
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            color: '#fff',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            padding: '6px 8px',
            outline: 'none',
          }}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          style={{
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.3,
            cursor: 'text',
            textShadow: '0 1px 10px rgba(0,0,0,0.6)',
          }}
        >
          {tile.caption}
        </div>
      )}
    </div>
  )
}

export function VisionView() {
  const { data: tiles = [] } = useVision()
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['vision'] })
  return (
    <div className="view">
      <ViewHeader
        title="Vision Board"
        subtitle="Why all of this matters. Glance here when the day feels like noise."
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}
      >
        {tiles.map((tile) => (
          <Tile key={tile.id} tile={tile} onChanged={refresh} />
        ))}
      </div>
      <div style={{ marginTop: 16, font: `500 11px ${MONO}`, color: 'rgba(232,234,240,0.35)' }}>
        Drop your own images onto these tiles to make it yours.
      </div>
    </div>
  )
}
