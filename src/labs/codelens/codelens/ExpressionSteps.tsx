// Inside a line: its sub-expressions in the order Python evaluated them, with their values
// (python/codelens_tracer.py _ExpressionRecorder). Choosing a step highlights that part of
// the line in the editor, so `total += price * qty - discount` reads as price → 4,
// qty → 3, price * qty → 12, ... instead of only its end result.
import { ListOrdered } from 'lucide-react'
import { useCodeLensTheme } from './ThemeContext'
import type { ExpressionSpan } from './types'

/** A value as Python shows it: None, True, 'text', or an object by its number. */
export function pythonValue(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (value === true) return 'True'
  if (value === false) return 'False'
  if (typeof value === 'string') {
    const text = value.length > 40 ? `${value.slice(0, 39)}…` : value
    return `'${text}'`
  }
  if (typeof value === 'object' && '$ref' in (value as object)) {
    const ref = value as { $ref: number; preview?: string }
    return ref.preview ? `${ref.preview} (#${ref.$ref})` : `object #${ref.$ref}`
  }
  return String(value)
}

interface ExpressionStepsProps {
  spans: ExpressionSpan[]
  steps: [number, unknown][]
  /** The step whose part of the line is highlighted, or null. */
  selected: number | null
  onSelect: (index: number | null) => void
}

export default function ExpressionSteps({ spans, steps, selected, onSelect }: ExpressionStepsProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const go = (index: number) => onSelect(Math.max(0, Math.min(steps.length - 1, index)))

  return (
    <div style={{ background: ui.panelBg, border: `1px solid ${ui.border}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: `1px solid ${ui.border}`, background: ui.headerBg }}>
        <ListOrdered size={13} color={ui.accent} />
        <span style={{ fontSize: 11, fontWeight: 600, color: ui.text }}>Inside this line</span>
        <span style={{ fontSize: 10, color: ui.textFaint }}>{steps.length} step{steps.length === 1 ? '' : 's'}, in the order Python worked them out</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button onClick={() => go(selected === null ? steps.length - 1 : selected - 1)} disabled={selected === 0} aria-label="Previous part" style={stepButton(ui)}>‹</button>
          <button onClick={() => go(selected === null ? 0 : selected + 1)} disabled={selected === steps.length - 1} aria-label="Next part" style={stepButton(ui)}>›</button>
        </span>
      </div>
      <ol style={{ margin: 0, padding: '6px 8px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 220, overflow: 'auto' }}>
        {steps.map(([id, value], index) => {
          const span = spans[id]
          if (!span) return null
          const active = index === selected
          return (
            <li key={index}>
              <button
                onClick={() => onSelect(active ? null : index)}
                aria-pressed={active}
                style={{
                  width: '100%', display: 'flex', alignItems: 'baseline', gap: 8, textAlign: 'left', cursor: 'pointer',
                  padding: '3px 6px', borderRadius: 5, border: 'none',
                  background: active ? ui.accentDeep + '55' : 'transparent',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5,
                }}
              >
                <span style={{ color: ui.textFaint, minWidth: 18 }}>{index + 1}.</span>
                <span style={{ color: ui.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0, maxWidth: '55%' }}>{span.code}</span>
                <span style={{ color: ui.textFaint }}>→</span>
                <span style={{ color: ui.green, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }} title={pythonValue(value)}>{pythonValue(value)}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function stepButton(ui: { border: string; textMuted: string }) {
  return { background: 'none', border: `1px solid ${ui.border}`, borderRadius: 4, color: ui.textMuted, cursor: 'pointer', width: 22, fontSize: 13, lineHeight: '16px' }
}
