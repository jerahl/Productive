import { useQueryClient } from '@tanstack/react-query'
import { type MouseEvent, useRef, useState } from 'react'
import { api } from '../lib/api.ts'
import { MONO } from '../lib/format.ts'
import { useCanvas } from '../lib/queries.ts'
import type { CanvasCard } from '../lib/types.ts'

const W = 212
const H = 124
const center = (x: number, y: number) => ({ x: x + W / 2, y: y + H / 2 })

export function CanvasView() {
  const { data: board } = useCanvas()
  const qc = useQueryClient()
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({})
  const [link, setLink] = useState<{ fromId: string; x: number; y: number } | null>(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ['canvas'] })
  const cards = board?.cards ?? []
  const edges = board?.edges ?? []
  const at = (c: CanvasCard) => pos[c.id] ?? { x: c.x, y: c.y }

  const localPoint = (e: { clientX: number; clientY: number }) => {
    const s = surfaceRef.current
    if (!s) return { x: 0, y: 0 }
    const r = s.getBoundingClientRect()
    return { x: e.clientX - r.left + s.scrollLeft, y: e.clientY - r.top + s.scrollTop }
  }

  const startDrag = (card: CanvasCard, e: MouseEvent) => {
    e.preventDefault()
    const sx = e.clientX
    const sy = e.clientY
    const { x: ox, y: oy } = at(card)
    document.body.style.userSelect = 'none'
    let last = { x: ox, y: oy }
    const move = (ev: globalThis.MouseEvent) => {
      last = { x: Math.max(0, ox + (ev.clientX - sx)), y: Math.max(0, oy + (ev.clientY - sy)) }
      setPos((p) => ({ ...p, [card.id]: last }))
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
      document.body.style.userSelect = ''
      api.updateCanvasCard(card.id, last).then(() => {
        setPos((p) => {
          const { [card.id]: _drop, ...rest } = p
          return rest
        })
        refresh()
      })
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const startLink = (fromId: string, e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setLink({ fromId, ...localPoint(e) })
    document.body.style.userSelect = 'none'
    const move = (ev: globalThis.MouseEvent) => {
      const p = localPoint(ev)
      setLink((l) => (l ? { ...l, x: p.x, y: p.y } : l))
    }
    const up = (ev: globalThis.MouseEvent) => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
      document.body.style.userSelect = ''
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const cardEl = el?.closest('[data-card-id]') as HTMLElement | null
      const toId = cardEl?.getAttribute('data-card-id')
      if (toId && toId !== fromId) api.connectCanvas(fromId, toId).then(refresh)
      setLink(null)
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const linking = link !== null

  return (
    <div className="view">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.015em' }}>Canvas</div>
          <div
            style={{ fontSize: 13, color: 'rgba(232,234,240,0.5)', marginTop: 3, maxWidth: 620 }}
          >
            A spatial brain-dump. Drag cards around, drag from a card's dot to another to connect
            related ones, and let the mess be useful.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 'none' }}>
          <span style={{ font: `500 12px ${MONO}`, color: 'rgba(232,234,240,0.4)' }}>
            {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          </span>
          <button
            type="button"
            onClick={() => api.createCanvasCard().then(refresh)}
            style={{
              background: '#7c8cff',
              color: '#0f1116',
              border: 'none',
              borderRadius: 9,
              padding: '9px 16px',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: "'Hanken Grotesk', sans-serif",
            }}
          >
            + New card
          </button>
        </div>
      </div>

      <div
        ref={surfaceRef}
        className="canvas-surface"
        style={{
          position: 'relative',
          minWidth: 980,
          minHeight: 620,
          width: '100%',
          height: '66vh',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.07)',
          background: '#13161d',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          overflow: 'auto',
        }}
      >
        <svg
          width={2400}
          height={1600}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
          aria-hidden="true"
        >
          <title>Canvas connections</title>
          {edges.map((edge) => {
            const a = cards.find((c) => c.id === edge.fromCardId)
            const b = cards.find((c) => c.id === edge.toCardId)
            if (!a || !b) return null
            const p1 = center(at(a).x, at(a).y)
            const p2 = center(at(b).x, at(b).y)
            const color = a.color ?? '#7c8cff'
            return (
              <g key={edge.id}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                  onClick={() => api.deleteCanvasEdge(edge.id).then(refresh)}
                />
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={color}
                  strokeWidth={2.5}
                  strokeOpacity={0.6}
                  strokeLinecap="round"
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            )
          })}
          {link &&
            (() => {
              const a = cards.find((c) => c.id === link.fromId)
              if (!a) return null
              const p1 = center(at(a).x, at(a).y)
              return (
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={link.x}
                  y2={link.y}
                  stroke={a.color ?? '#7c8cff'}
                  strokeWidth={2.5}
                  strokeDasharray="6 6"
                  strokeOpacity={0.85}
                  strokeLinecap="round"
                  style={{ pointerEvents: 'none' }}
                />
              )
            })()}
        </svg>

        {cards.map((card) => {
          const p = at(card)
          const color = card.color ?? '#7c8cff'
          return (
            <div
              key={card.id}
              data-card-id={card.id}
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: W,
                background: '#1a1e27',
                border: `1px solid ${linking ? `${color}66` : 'rgba(255,255,255,0.09)'}`,
                borderRadius: 12,
                boxShadow: '0 10px 26px rgba(0,0,0,0.32)',
                overflow: 'hidden',
              }}
            >
              <div
                onMouseDown={(e) => startDrag(card, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  cursor: 'grab',
                  background: `${color}22`,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    flex: 'none',
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    font: `10px ${MONO}`,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'rgba(232,234,240,0.4)',
                  }}
                >
                  drag
                </div>
                <div
                  onMouseDown={(e) => startLink(card.id, e)}
                  title="Drag to connect"
                  style={{
                    cursor: 'crosshair',
                    flex: 'none',
                    width: 15,
                    height: 15,
                    borderRadius: '50%',
                    border: `1.5px solid ${color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                </div>
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => api.deleteCanvasCard(card.id).then(refresh)}
                  title="Delete"
                  style={{
                    cursor: 'pointer',
                    color: 'rgba(232,234,240,0.4)',
                    fontSize: 16,
                    lineHeight: 1,
                    padding: '0 2px',
                  }}
                >
                  ×
                </div>
              </div>
              <textarea
                defaultValue={card.text}
                onBlur={(e) => {
                  if (e.target.value !== card.text)
                    api.updateCanvasCard(card.id, { text: e.target.value }).then(refresh)
                }}
                placeholder="Type a thought…"
                style={{
                  width: '100%',
                  minHeight: 74,
                  resize: 'vertical',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: '#e8eaf0',
                  fontFamily: "'Hanken Grotesk', sans-serif",
                  fontSize: 13,
                  lineHeight: 1.45,
                  padding: '10px 11px',
                  display: 'block',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '6px 11px 9px',
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <span
                  onClick={() =>
                    api.promoteCanvasCard(card.id, 'task').then(() => {
                      qc.invalidateQueries({ queryKey: ['tasks'] })
                      qc.invalidateQueries({ queryKey: ['overview'] })
                    })
                  }
                  style={{ font: `500 11px ${MONO}`, color: '#9fb0ff', cursor: 'pointer' }}
                >
                  → Task
                </span>
                <span
                  onClick={() =>
                    api
                      .promoteCanvasCard(card.id, 'note')
                      .then(() => qc.invalidateQueries({ queryKey: ['notes'] }))
                  }
                  style={{ font: `500 11px ${MONO}`, color: '#9fb0ff', cursor: 'pointer' }}
                >
                  → Note
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
