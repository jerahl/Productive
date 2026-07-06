import { useState } from 'react'
import { MONO, dateLine, greeting } from '../lib/format.ts'
import { useCapture } from '../lib/queries.ts'

export function Header({ userName }: { userName?: string }) {
  const [text, setText] = useState('')
  const capture = useCapture()

  const submit = () => {
    const value = text.trim()
    if (!value) return
    capture.mutate(value)
    setText('')
  }

  return (
    <header
      className="topbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flex: 'none',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
          {greeting(userName)}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'rgba(232,234,240,0.42)',
            font: `12px ${MONO}`,
            marginTop: 2,
          }}
        >
          {dateLine()}
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div
        className="capture-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 12,
          padding: '8px 9px 8px 12px',
          width: 380,
          maxWidth: '46vw',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#7c8cff',
            flex: 'none',
            boxShadow: '0 0 7px #7c8cff',
          }}
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder="Brain dump — capture it, triage later"
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
          onClick={submit}
          style={{
            background: '#7c8cff',
            color: '#0f1116',
            border: 'none',
            borderRadius: 8,
            padding: '6px 13px',
            fontWeight: 600,
            fontSize: 12.5,
            cursor: 'pointer',
            fontFamily: "'Hanken Grotesk', sans-serif",
            flex: 'none',
          }}
        >
          Capture
        </button>
      </div>
    </header>
  )
}
