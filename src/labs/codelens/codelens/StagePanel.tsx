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
import { BookOpen, ExternalLink } from 'lucide-react'
import type * as PhaserNS from 'phaser'
import { useCodeLensTheme } from './ThemeContext'
import { ScreenPopOut } from './ScreenPanel'
import type { HeapSnapshot, TraceEvent } from './types'
import { buildStage, heatColor, parseStageSpec, stageVariables, type Stage, type StageSpec } from './stageModel'
import { STAGE_GUIDE } from './stageGuide'
import type { Lang } from './types'

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
  /** The editor's language: the guide shows its programs in Python for Python, JavaScript otherwise. */
  lang?: Lang
}

export default function StagePanel({ event, snapshot, spec, specId, onStepKey, lang }: StagePanelProps) {
  const { theme: { ui } } = useCodeLensTheme()
  const initial = JSON.stringify(spec ?? STARTER, null, 2)
  const [text, setText] = useState(initial)
  const [editing, setEditing] = useState(!spec)
  const [poppedOut, setPoppedOut] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [guideStep, setGuideStep] = useState<number | null>(null)
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
        <button onClick={() => setGuideStep(s => (s === null ? 0 : null))} title="Learn to write a stage spec for your own program, step by step" style={{ ...button, marginLeft: 'auto' }}>
          <BookOpen size={12} /> {guideStep === null ? 'Build a stage yourself' : 'Hide the guide'}
        </button>
        <button onClick={() => setEditing(e => !e)} style={button}>{editing ? 'Hide spec' : 'Edit spec'}</button>
        <button onClick={() => { setBlocked(false); setPoppedOut(true) }} title="Open the stage in its own window, which follows the step you are on" style={button}>
          <ExternalLink size={12} /> Pop out
        </button>
      </div>
      {guideStep !== null && (
        <StageGuide step={guideStep} onStep={setGuideStep} lang={lang}
          onUse={s => { setText(JSON.stringify(s, null, 2)); setEditing(true) }} />
      )}
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
            Every name is a variable in your program. <code>grid</code>: rows and cols (numbers, or variables; a list gives its length).{' '}
            <code>heat</code>: colours each cell from a variable with one value per cell, as a flat list or a list of rows (a list per cell is reduced by max, min, sum or first); <code>palette</code> gives exact values their own colour, <code>empty</code> lists values to leave blank.{' '}
            <code>text</code>: writes each cell's value. <code>walls</code>: cells whose value is true are walls.{' '}
            <code>markers</code> (goals and pointers like i, lo, hi) and <code>agent</code> (slides as you step): <code>at</code> is a cell index, a [row, col] pair of numbers or variable names, or a variable holding one.{' '}
            <code>caption</code>: variables to show under the stage. New to this? Press "Build a stage yourself".
          </div>
        </div>
      )}
    </div>
  )
}

function StageGuide({ step, onStep, onUse, lang }: { step: number; onStep: (n: number) => void; onUse: (spec: StageSpec) => void; lang?: Lang }) {
  const { theme: { ui } } = useCodeLensTheme()
  const g = STAGE_GUIDE[step]
  const python = lang === 'py'
  const pre = { margin: 0, padding: 8, borderRadius: 6, background: ui.panelBg, border: `1px solid ${ui.border}`, fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: ui.text, whiteSpace: 'pre-wrap' as const, overflowX: 'auto' as const }
  const button = { fontSize: 11, padding: '3px 10px', borderRadius: 5, border: `1px solid ${ui.border}`, background: 'transparent', color: ui.text, cursor: 'pointer' } as const
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 8, border: `1px solid ${ui.accent}55`, background: ui.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
        <strong style={{ color: ui.text }}>{g.title}</strong>
        <span style={{ color: ui.textMuted, fontSize: 11 }}>step {step + 1} of {STAGE_GUIDE.length}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button onClick={() => onStep(step - 1)} disabled={step === 0} style={button} aria-label="Previous guide step">‹</button>
          <button onClick={() => onStep(step + 1)} disabled={step === STAGE_GUIDE.length - 1} style={button} aria-label="Next guide step">›</button>
        </span>
      </div>
      <div style={{ fontSize: 12, color: ui.text, lineHeight: 1.6 }}>{g.explain}</div>
      <div style={{ fontSize: 11, color: ui.textMuted }}>Type this {python ? 'Python' : 'JavaScript'} into the editor (replacing what is there), then Run:</div>
      <pre style={pre}>{python ? g.py : g.js}</pre>
      <div style={{ fontSize: 11, color: ui.textMuted }}>Its stage spec. Read how each name matches a variable above, then use it and step through the program:</div>
      <pre style={pre}>{JSON.stringify(g.spec, null, 2)}</pre>
      <div><button onClick={() => onUse(g.spec)} style={{ ...button, borderColor: ui.accent, color: ui.accent }}>Use this spec</button></div>
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
    // Walls are solid light blocks: empty cells are dark, so a dark wall would hide among them.
    if (c.wall) rect.setFillStyle(0x94a3b8, 0.9)
    else if (c.color) rect.setFillStyle(P.Display.Color.HexStringToColor(c.color).color, 0.85)
    else if (c.heat != null && stage.range) { const h = heatColor(c.heat, stage.range); rect.setFillStyle(h.color, h.alpha) }
    else rect.setFillStyle(0x334155, 0.25)
    const label = get(`text-${c.row}-${c.col}`, () => scene.add.text(x, y + CELL / 2 - 13, '', { fontFamily: 'monospace', fontSize: '14px', color: '#e2e8f0', stroke: '#0f172a', strokeThickness: 3 }).setOrigin(0.5))
    label.setText(c.text ?? '')
  }

  // Markers can share a cell (lo and mid, i and j): each is a ring a little inside the last,
  // with its label at the top, side by side.
  for (const m of stage.markers) {
    const { x, y } = center(m.row, m.col)
    const color = P.Display.Color.HexStringToColor(m.color).color
    const size = CELL - 8 - 7 * (m.index % 4)
    const ring = get(m.key, () => scene.add.rectangle(x, y, size, size).setFillStyle(0, 0).setDepth(5))
    ring.setPosition(x, y).setSize(size, size).setStrokeStyle(3, color, 1)
    const lx = x - CELL / 2 + 7 + 17 * (m.index % 3)
    const label = get(`${m.key}-label`, () => scene.add.text(lx, y - CELL / 2 + 11, '', { fontFamily: 'sans-serif', fontSize: '11px', fontStyle: 'bold', color: m.color, stroke: '#0f172a', strokeThickness: 3 }).setOrigin(0, 0.5).setDepth(6))
    label.setPosition(lx, y - CELL / 2 + 11).setText(m.label ?? '')
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
