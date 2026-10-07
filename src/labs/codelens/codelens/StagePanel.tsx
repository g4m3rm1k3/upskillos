// The Stage tab: the program's world drawn with Phaser from its own variables at the
// current step (stageModel.ts), following the step like every other panel. What to draw is
// a stage spec: data that names the variables (the grid's size, what colours the cells,
// where the agent is). A library example can bring one; the learner can edit it or write
// their own. The Picture tab is separate and unchanged.
//
// Phaser keeps one object per thing drawn (as Game Studio's phaserRenderer does): cells are
// re-coloured, and the agent slides from its old cell to its new one. Phaser is imported only
// when a stage is shown, so nothing else pays for it.
import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type * as PhaserNS from 'phaser'
import { useCodeLensTheme } from './ThemeContext'
import { ScreenPopOut } from './ScreenPanel'
import type { HeapSnapshot, TraceEvent } from './types'
import { buildStage, heatColor, parseStageSpec, stageVariables, type Stage, type StageSpec } from './stageModel'

const CELL = 64
const PAD = 10

const STARTER: StageSpec = {
  grid: { rows: 1, cols: 5 },
  agent: { at: 'state', label: 'agent' },
  caption: [],
}

interface StagePanelProps {
  event: TraceEvent | null
  snapshot: HeapSnapshot | null
  /** The loaded example's stage, if it has one. */
  spec?: StageSpec | null
  /** Changes when a different example is loaded, which resets the spec being edited. */
  specId?: string | null
  onStepKey?: (e: KeyboardEvent) => void
}

export default function StagePanel({ event, snapshot, spec, specId, onStepKey }: StagePanelProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const initial = JSON.stringify(spec ?? STARTER, null, 2)
  const [text, setText] = useState(initial)
  const [editing, setEditing] = useState(!spec)
  const [poppedOut, setPoppedOut] = useState(false)
  const [blocked, setBlocked] = useState(false)
  useEffect(() => { setText(initial); setEditing(!spec) }, [specId]) // eslint-disable-line react-hooks/exhaustive-deps

  const parsed = useMemo(() => parseStageSpec(text), [text])
  const vars = useMemo(() => stageVariables(event, snapshot), [event, snapshot])
  const stage = useMemo(() => (parsed.spec ? buildStage(parsed.spec, vars) : null), [parsed.spec, vars])

  const view = (inWindow: boolean) => stage && stage.rows > 0 && (
    <>
      <StageCanvas stage={stage} background={ui.bg} maxHeight={inWindow ? 'calc(100vh - 70px)' : '340px'} />
      {stage.caption && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: ui.text, textAlign: 'center' }}>{stage.caption}</div>}
    </>
  )

  const button = { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 5, border: `1px solid ${ui.border}`, background: 'transparent', color: ui.text, cursor: 'pointer' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: ui.textMuted, flexWrap: 'wrap' }}>
        <span style={{ color: ui.text, fontWeight: 600 }}>Stage</span>
        <span>{spec ? 'drawn by this example\'s stage spec' : 'drawn by a stage spec you write'}</span>
        <button onClick={() => setEditing(e => !e)} style={{ ...button, marginLeft: 'auto' }}>{editing ? 'Hide spec' : 'Edit spec'}</button>
        <button onClick={() => { setBlocked(false); setPoppedOut(true) }} title="Open the stage in its own window, which follows the step you are on" style={button}>
          <ExternalLink size={12} /> Pop out
        </button>
      </div>
      {blocked && <div style={{ fontSize: 11, color: ui.amberSoft }}>The browser blocked the new window. Allow pop-ups for this site and try again.</div>}

      {poppedOut ? (
        <>
          <div style={{ fontSize: 11, color: ui.textMuted }}>The stage is showing in its own window.</div>
          <ScreenPopOut title="CodeLens stage" background={ui.bg} onKey={e => onStepKey?.(e)}
            onClosed={b => { setPoppedOut(false); setBlocked(b) }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, height: '100vh', boxSizing: 'border-box' }}>{view(true)}</div>
          </ScreenPopOut>
        </>
      ) : view(false)}

      {!event && <div style={{ fontSize: 11, color: ui.textMuted }}>Run the code: the stage draws the program's variables at each step.</div>}
      {stage?.problems.map(p => <div key={p} style={{ fontSize: 11, color: ui.textMuted }}>{p}</div>)}

      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} spellCheck={false} aria-label="Stage spec"
            style={{ minHeight: 180, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, background: ui.panelBg, color: ui.text, border: `1px solid ${parsed.error ? ui.redSoft : ui.border}`, borderRadius: 6, padding: 8, resize: 'vertical' }} />
          {parsed.error && <div style={{ fontSize: 11, color: ui.redSoft }}>{parsed.error}</div>}
          <div style={{ fontSize: 11, color: ui.textMuted, lineHeight: 1.6 }}>
            Every name is a variable in your program. <code>grid</code>: rows and cols (numbers or variables).{' '}
            <code>heat</code>: a variable with one number per cell (or a list per cell, reduced by max, min, sum or first), as a flat list or a list of rows.{' '}
            <code>walls</code>: a variable whose truthy cells are walls. <code>markers</code> and <code>agent</code>: <code>at</code> is a cell index, a [row, col] pair, or a variable holding one; the agent slides from cell to cell.{' '}
            <code>caption</code>: variables to show under the stage.
          </div>
        </div>
      )}
    </div>
  )
}

type Phaser = typeof PhaserNS

interface Live {
  scene: PhaserNS.Scene | null
  pending: Stage | null
  objects: Map<string, PhaserNS.GameObjects.GameObject>
  agentAt: string | null
}

function StageCanvas({ stage, background, maxHeight }: { stage: Stage; background: string; maxHeight: string }) {
  const host = useRef<HTMLDivElement>(null)
  const live = useRef<Live | null>(null)
  const phaser = useRef<Phaser | null>(null)
  const width = stage.cols * CELL + PAD * 2
  const height = stage.rows * CELL + PAD * 2

  // One Phaser game per grid size; a new size starts a new game.
  useEffect(() => {
    let cancelled = false
    let game: PhaserNS.Game | null = null
    const state: Live = { scene: null, pending: null, objects: new Map(), agentAt: null }
    live.current = state
    import('phaser').then(P => {
      if (cancelled || !host.current) return
      phaser.current = P
      game = new P.Game({
        type: P.AUTO, parent: host.current, width, height, transparent: true, banner: false,
        input: { keyboard: false, mouse: false, touch: false },
        scale: { mode: P.Scale.FIT, autoCenter: P.Scale.CENTER_BOTH },
        scene: {
          create(this: PhaserNS.Scene) {
            state.scene = this
            if (state.pending) draw(P, state, state.pending)
          },
        },
      })
    })
    return () => { cancelled = true; game?.destroy(true); live.current = null }
  }, [width, height])

  useEffect(() => {
    const state = live.current
    if (!state) return
    state.pending = stage
    if (state.scene && phaser.current) draw(phaser.current, state, stage)
  }, [stage])

  return (
    <div ref={host} style={{ width: '100%', maxHeight, aspectRatio: `${width} / ${height}`, margin: '0 auto', background, borderRadius: 6, overflow: 'hidden' }} />
  )
}

const center = (row: number, col: number) => ({ x: PAD + col * CELL + CELL / 2, y: PAD + row * CELL + CELL / 2 })

/** Brings the scene's objects in line with the stage: one object per cell, marker and agent. */
function draw(P: Phaser, state: Live, stage: Stage) {
  const scene = state.scene!
  const seen = new Set<string>()
  const get = <T extends PhaserNS.GameObjects.GameObject>(key: string, make: () => T): T => {
    seen.add(key)
    let obj = state.objects.get(key) as T | undefined
    if (!obj) { obj = make(); state.objects.set(key, obj) }
    return obj
  }

  for (const c of stage.cells) {
    const { x, y } = center(c.row, c.col)
    const rect = get(`cell-${c.row}-${c.col}`, () => scene.add.rectangle(x, y, CELL - 4, CELL - 4, 0x334155, 0.25).setStrokeStyle(1, 0x64748b, 0.6))
    if (c.wall) rect.setFillStyle(0x1e293b, 1)
    else if (c.heat != null && stage.range) { const h = heatColor(c.heat, stage.range); rect.setFillStyle(h.color, h.alpha) }
    else rect.setFillStyle(0x334155, 0.25)
    const label = get(`text-${c.row}-${c.col}`, () => scene.add.text(x, y + CELL / 2 - 11, '', { fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0' }).setOrigin(0.5))
    label.setText(c.text ?? '')
  }

  for (const m of stage.markers) {
    const { x, y } = center(m.row, m.col)
    const color = P.Display.Color.HexStringToColor(m.color).color
    const ring = get(m.key, () => scene.add.rectangle(x, y, CELL - 10, CELL - 10).setFillStyle(0, 0))
    ring.setPosition(x, y).setStrokeStyle(3, color, 1)
    const label = get(`${m.key}-label`, () => scene.add.text(x, y - CELL / 2 + 12, '', { fontFamily: 'sans-serif', fontSize: '11px', color: m.color }).setOrigin(0.5))
    label.setPosition(x, y - CELL / 2 + 12).setText(m.label ?? '')
  }

  if (stage.agent) {
    const a = stage.agent
    // Above the cell's centre, so the value written at the bottom of the cell stays readable.
    const { x, y: middle } = center(a.row, a.col)
    const y = middle - 6
    const color = P.Display.Color.HexStringToColor(a.color).color
    const dot = get('agent', () => scene.add.circle(x, y, CELL * 0.2, color).setStrokeStyle(2, 0xffffff, 0.9).setDepth(10))
    const label = get('agent-label', () => scene.add.text(x, y, '', { fontFamily: 'sans-serif', fontSize: '10px', color: '#0f172a' }).setOrigin(0.5).setDepth(11))
    // Only a short label fits inside the dot (a letter or two).
    label.setText(a.label && a.label.length <= 3 ? a.label : '')
    const where = `${a.row},${a.col}`
    if (state.agentAt !== where) {
      scene.tweens.killTweensOf([dot, label])
      scene.tweens.add({ targets: [dot, label], x, y, duration: state.agentAt == null ? 0 : 220, ease: 'Sine.easeInOut' })
      state.agentAt = where
    }
  }

  for (const [key, obj] of state.objects) {
    if (!seen.has(key)) { obj.destroy(); state.objects.delete(key); if (key === 'agent') state.agentAt = null }
  }
}
