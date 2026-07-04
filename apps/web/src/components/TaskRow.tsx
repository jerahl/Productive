import { type MouseEvent, useState } from 'react'
import { DUE_META, MONO, PRIORITY_COLOR, PRIORITY_TITLE } from '../lib/format.ts'
import type { Task } from '../lib/types.ts'

type Props = {
  task: Task
  expanded: boolean
  onToggleExpand: () => void
  onToggle: () => void
  onCycleDue: () => void
  onCyclePriority: () => void
  onAddStep: (text: string) => void
  onToggleStep: (stepId: string) => void
  onStartReorder: (e: MouseEvent) => void
  onStartFocus: () => void
}

export function TaskRow({
  task,
  expanded,
  onToggleExpand,
  onToggle,
  onCycleDue,
  onCyclePriority,
  onAddStep,
  onToggleStep,
  onStartReorder,
  onStartFocus,
}: Props) {
  const [stepDraft, setStepDraft] = useState('')
  const due = DUE_META[task.due]
  const doneSteps = task.steps.filter((s) => s.done).length
  const showEst = task.estMinutes != null && task.estMinutes > 0

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 2px' }}>
        {/* drag handle */}
        <div
          onMouseDown={onStartReorder}
          title="Drag to reorder"
          style={{
            flex: 'none',
            cursor: 'grab',
            color: 'rgba(232,234,240,0.25)',
            fontSize: 15,
            lineHeight: '22px',
            letterSpacing: '-3px',
          }}
        >
          ⠿
        </div>

        {/* priority square */}
        <div
          onClick={onCyclePriority}
          title={PRIORITY_TITLE[task.priority]}
          style={{
            flex: 'none',
            width: 9,
            height: 9,
            borderRadius: 2,
            marginTop: 7,
            cursor: 'pointer',
            background: PRIORITY_COLOR[task.priority],
          }}
        />

        {/* checkbox */}
        {task.done ? (
          <div
            onClick={onToggle}
            style={{
              marginTop: 1,
              width: 20,
              height: 20,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flex: 'none',
              fontSize: 11,
              fontWeight: 700,
              background: '#5ec98a',
              color: '#0f1116',
              border: '1.5px solid #5ec98a',
            }}
          >
            ✓
          </div>
        ) : (
          <div
            onClick={onToggle}
            style={{
              marginTop: 1,
              width: 20,
              height: 20,
              borderRadius: '50%',
              cursor: 'pointer',
              flex: 'none',
              border: '1.5px solid rgba(255,255,255,0.22)',
            }}
          />
        )}

        {/* title + note + tags */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              letterSpacing: '-0.005em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              ...(task.done
                ? { textDecoration: 'line-through', color: 'rgba(232,234,240,0.38)' }
                : { color: '#e8eaf0' }),
            }}
          >
            {task.title}
          </div>
          {task.note.trim() && (
            <div
              style={{
                fontSize: 12,
                color: 'rgba(232,234,240,0.45)',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {task.note}
            </div>
          )}
          {task.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    font: `500 10px ${MONO}`,
                    letterSpacing: '0.02em',
                    color: '#9fb0ff',
                    background: 'rgba(124,140,255,0.12)',
                    padding: '2px 7px',
                    borderRadius: 5,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* right side: estimate, due pill, play, steps */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none', marginTop: 1 }}>
          {showEst && (
            <span
              style={{
                font: `500 11px ${MONO}`,
                color: 'rgba(232,234,240,0.5)',
                background: 'rgba(255,255,255,0.04)',
                padding: '2px 7px',
                borderRadius: 5,
                whiteSpace: 'nowrap',
              }}
            >
              {task.estMinutes}m
            </span>
          )}
          <span
            onClick={onCycleDue}
            title="Click to change due"
            style={{
              cursor: 'pointer',
              font: `500 11px ${MONO}`,
              padding: '2px 8px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              color: due.color,
              background: due.bg,
            }}
          >
            {due.label}
          </span>
          {!task.done && (
            <div
              onClick={(e) => {
                e.stopPropagation()
                onStartFocus()
              }}
              title="Start a focus session"
              style={{
                flex: 'none',
                width: 24,
                height: 24,
                borderRadius: 7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(124,140,255,0.13)',
                color: '#9fb0ff',
                fontSize: 9,
                paddingLeft: 2,
                cursor: 'pointer',
              }}
            >
              ▶
            </div>
          )}
          {/* Always expandable: any task can be broken into steps, even its
              first one (the mock only showed this once steps existed). */}
          <div
            onClick={onToggleExpand}
            title="Break into steps"
            style={{
              font: `500 11px ${MONO}`,
              color: task.steps.length > 0 ? '#9fb0ff' : 'rgba(159,176,255,0.55)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {task.steps.length > 0 ? `steps ${doneSteps}/${task.steps.length}` : '+ steps'}
          </div>
        </div>
      </div>

      {expanded && (
        <div
          style={{
            padding: '2px 2px 15px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              font: `500 10px ${MONO}`,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'rgba(232,234,240,0.35)',
            }}
          >
            Break it into tiny steps
          </div>
          {task.steps.map((step) => (
            <div
              key={step.id}
              onClick={() => onToggleStep(step.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            >
              {step.done ? (
                <div
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: 5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 'none',
                    fontSize: 9,
                    fontWeight: 700,
                    background: '#7c8cff',
                    color: '#0f1116',
                    border: '1.5px solid #7c8cff',
                  }}
                >
                  ✓
                </div>
              ) : (
                <div
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: 5,
                    flex: 'none',
                    border: '1.5px solid rgba(255,255,255,0.2)',
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 13,
                  ...(step.done
                    ? { textDecoration: 'line-through', color: 'rgba(232,234,240,0.38)' }
                    : { color: 'rgba(232,234,240,0.82)' }),
                }}
              >
                {step.text}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 17,
                height: 17,
                borderRadius: 5,
                flex: 'none',
                border: '1.5px dashed rgba(255,255,255,0.2)',
              }}
            />
            <input
              value={stepDraft}
              onChange={(e) => setStepDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && stepDraft.trim()) {
                  onAddStep(stepDraft.trim())
                  setStepDraft('')
                }
              }}
              placeholder="Add a step, press Enter"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e8eaf0',
                fontFamily: "'Hanken Grotesk', sans-serif",
                fontSize: 13,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
