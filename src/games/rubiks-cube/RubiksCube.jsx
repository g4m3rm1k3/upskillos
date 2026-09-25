import { solvedState, applyMove, getMoveCycles, isSolved, getStickerIndex } from './cubeMath.js'
import './rubiks.css'
import FirstExperiments from './FirstExperiments.jsx'
import { useState, useRef, useCallback, useEffect } from 'react'

// ─── Color definitions ───────────────────────────────────────────────────────
const FACE_COLORS = {
  U: '#f0f0f0', // white
  R: '#0066cc', // blue
  F: '#cc2200', // red
  D: '#ffcc00', // yellow
  L: '#ff6600', // orange
  B: '#009933', // green
  X: '#1a1a2e', // hidden/inner
}

const CELL = 64
const GAP = 4

// Build list of cubies with their 3D positions and which faces are visible
function buildCubies() {
  const cubies = []
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        // Skip the hidden center cubie
        if (x === 0 && y === 0 && z === 0) continue
        // Skip non-surface cubies? No: all 26 are surface
        const faces = {}
        if (y === 1) faces.U = getStickerIndex(x, y, z, 'U')
        if (y === -1) faces.D = getStickerIndex(x, y, z, 'D')
        if (x === 1) faces.R = getStickerIndex(x, y, z, 'R')
        if (x === -1) faces.L = getStickerIndex(x, y, z, 'L')
        if (z === 1) faces.F = getStickerIndex(x, y, z, 'F')
        if (z === -1) faces.B = getStickerIndex(x, y, z, 'B')
        cubies.push({ x, y, z, faces })
      }
    }
  }
  return cubies
}

const CUBIES = buildCubies()
const TOTAL = CELL + GAP // 68px per unit
const HALF = TOTAL // offset to center: positions are -1,0,+1 so center at 0

// Face center cubies — used to render labels on the cube
const FACE_CENTERS = {
  U: { x: 0, y: 1, z: 0 },
  D: { x: 0, y: -1, z: 0 },
  R: { x: 1, y: 0, z: 0 },
  L: { x: -1, y: 0, z: 0 },
  F: { x: 0, y: 0, z: 1 },
  B: { x: 0, y: 0, z: -1 },
}

const FACE_LABEL_NAMES = { U: 'Up', D: 'Down', R: 'Right', L: 'Left', F: 'Front', B: 'Back' }

// Light faces need dark text, dark faces need light text
const LABEL_TEXT_COLOR = { U: 'rgba(0,0,0,0.62)', D: 'rgba(0,0,0,0.62)', L: 'rgba(0,0,0,0.65)', R: 'rgba(255,255,255,0.88)', F: 'rgba(255,255,255,0.88)', B: 'rgba(255,255,255,0.88)' }

// Which cubies belong to each face layer (for animation)
const FACE_LAYER = {
  U: c => c.y === 1,
  D: c => c.y === -1,
  R: c => c.x === 1,
  L: c => c.x === -1,
  F: c => c.z === 1,
  B: c => c.z === -1,
}

// CSS Y points down; these rotations match cubeMath's clockwise turns.
const FACE_ANIM = {
  U: { axis: 'Y', cw: -90 }, D: { axis: 'Y', cw: 90 },
  R: { axis: 'X', cw: 90 }, L: { axis: 'X', cw: -90 },
  F: { axis: 'Z', cw: 90 }, B: { axis: 'Z', cw: -90 },
}

const ANIM_MS = 300 // slow enough to see the rotation clearly

// ─── Cube net diagram ─────────────────────────────────────────────────────────
function CubeNet() {
  const cells = [
    { l: 'U', c: '#f0f0f0', n: 'Up',    col: 2, row: 1 },
    { l: 'L', c: '#ff6600', n: 'Left',  col: 1, row: 2 },
    { l: 'F', c: '#cc2200', n: 'Front', col: 2, row: 2 },
    { l: 'R', c: '#0066cc', n: 'Right', col: 3, row: 2 },
    { l: 'B', c: '#009933', n: 'Back',  col: 4, row: 2 },
    { l: 'D', c: '#ffcc00', n: 'Down',  col: 2, row: 3 },
  ]
  return (
    <div>
      <div style={{ color: '#667788', fontSize: 10, marginBottom: 6 }}>Unfolded cube — each square is one face:</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 48px)', gridTemplateRows: 'repeat(3, 48px)', gap: 3, width: 'fit-content' }}>
        {cells.map(({ l, c, n, col, row }) => (
          <div key={l} style={{ gridColumn: col, gridRow: row, background: c, borderRadius: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(0,0,0,0.18)' }}>
            <span style={{ fontWeight: 900, fontSize: 18, fontFamily: 'monospace', color: LABEL_TEXT_COLOR[l], lineHeight: 1 }}>{l}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: LABEL_TEXT_COLOR[l], opacity: 0.75 }}>{n}</span>
          </div>
        ))}
      </div>
      <div style={{ color: '#445566', fontSize: 10, marginTop: 8, lineHeight: 1.7 }}>
        <div><strong style={{ color: '#c0d0e0' }}>F</strong> = face toward you · <strong style={{ color: '#c0d0e0' }}>U</strong> = top · <strong style={{ color: '#c0d0e0' }}>R</strong> = your right</div>
        <div>Moves rotate that face CW (viewed from outside)</div>
      </div>
    </div>
  )
}

// ─── Live flat cube net ───────────────────────────────────────────────────────
// Shows all 54 stickers in the standard cross layout, updating live with state.
// Labels show the sticker's CURRENT POSITION address (e.g. "U1", "R3").
// Color shows the sticker's ORIGIN face — so after moves you can track permutations.
const NET_FACE_NAMES = ['U', 'R', 'F', 'D', 'L', 'B']

function CubeNetLive({ state }) {
  const S = 22 // sticker pixel size (larger to fit 2-char labels)

  // Build a 3×3 grid for one face
  const FaceGrid = ({ faceIdx, gridCol, gridRow }) => (
    <div style={{
      gridColumn: gridCol,
      gridRow: gridRow,
      display: 'grid',
      gridTemplateColumns: `repeat(3, ${S}px)`,
      gridTemplateRows: `repeat(3, ${S}px)`,
      gap: 1,
      border: '1.5px solid rgba(255,255,255,0.15)',
      borderRadius: 3,
      overflow: 'hidden',
    }}>
      {Array.from({ length: 9 }, (_, i) => {
        const posLabel = NET_FACE_NAMES[faceIdx] + (i + 1) // e.g. "U1", "R3"
        const sticker = state[faceIdx * 9 + i]             // which face this sticker came from
        const color = FACE_COLORS[sticker] || '#333'
        const textColor = ['U', 'D', 'L'].includes(sticker) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.75)'
        const isHome = sticker === NET_FACE_NAMES[faceIdx]  // sticker is in its home position
        return (
          <div key={i} style={{
            width: S, height: S,
            background: color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            outline: isHome ? 'none' : '1.5px solid rgba(255,255,255,0.35)',
            outlineOffset: '-1.5px',
          }}>
            <span style={{
              fontSize: 7,
              fontWeight: 700,
              color: textColor,
              fontFamily: 'monospace',
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}>
              {posLabel}
            </span>
          </div>
        )
      })}
    </div>
  )

  const faceColors = ['#f0f0f0', '#0066cc', '#cc2200', '#ffcc00', '#ff6600', '#009933']
  const netLayout = [
    { faceIdx: 0, col: 2, row: 1 }, // U
    { faceIdx: 4, col: 1, row: 2 }, // L
    { faceIdx: 2, col: 2, row: 2 }, // F
    { faceIdx: 1, col: 3, row: 2 }, // R
    { faceIdx: 5, col: 4, row: 2 }, // B
    { faceIdx: 3, col: 2, row: 3 }, // D
  ]

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(77,208,255,0.1)' }}>
      <div style={{ color: '#4dd0ff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
        Live Unfolded Net — Permutation Tracker
      </div>
      <div style={{ color: '#667788', fontSize: 10, marginBottom: 10, lineHeight: 1.5 }}>
        <strong style={{ color: '#8899bb' }}>Label</strong> = position address (where the cell <em>is</em>)
        {' · '}
        <strong style={{ color: '#8899bb' }}>Color</strong> = origin face (where the sticker <em>came from</em>)
        {' · '}
        White outline = sticker on a different-colored face
      </div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(4, ${S * 3 + 2}px)`,
          gridTemplateRows: `repeat(3, ${S * 3 + 2}px)`,
          gap: 4,
        }}>
          {netLayout.map(({ faceIdx, col, row }) => (
            <FaceGrid key={faceIdx} faceIdx={faceIdx} gridCol={col} gridRow={row} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NET_FACE_NAMES.map((name, i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, background: faceColors[i], borderRadius: 2, border: '1px solid rgba(0,0,0,0.2)', flexShrink: 0 }} />
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 11, color: faceColors[i] }}>{name}1–{name}9</span>
              <span style={{ fontSize: 10, color: '#667788' }}>{FACE_LABEL_NAMES[name]}</span>
            </div>
          ))}
          <div style={{ color: '#445577', fontSize: 10, marginTop: 6, lineHeight: 1.6, maxWidth: 160 }}>
            Each move is a permutation σ: the label stays, the color moves. Track how stickers cycle between positions.
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Cubie 3D renderer ───────────────────────────────────────────────────────
function Cubie({ cubie, state, faceLabel, hidden, showNumbers }) {
  const { x, y, z, faces } = cubie
  const tx = x * TOTAL
  const ty = -y * TOTAL // y=+1 is up visually
  const tz = z * TOTAL

  const faceDefs = [
    { face: 'F', transform: `translateZ(${CELL / 2}px)`, normal: [0, 0, 1] },
    { face: 'B', transform: `rotateY(180deg) translateZ(${CELL / 2}px)`, normal: [0, 0, -1] },
    { face: 'R', transform: `rotateY(90deg) translateZ(${CELL / 2}px)`, normal: [1, 0, 0] },
    { face: 'L', transform: `rotateY(-90deg) translateZ(${CELL / 2}px)`, normal: [-1, 0, 0] },
    { face: 'U', transform: `rotateX(90deg) translateZ(${CELL / 2}px)`, normal: [0, 1, 0] },
    { face: 'D', transform: `rotateX(-90deg) translateZ(${CELL / 2}px)`, normal: [0, -1, 0] },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        width: CELL,
        height: CELL,
        transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d',
        transform: `translate3d(${tx}px, ${ty}px, ${tz}px)`,
        left: HALF,
        top: HALF,
        marginLeft: -CELL / 2,
        marginTop: -CELL / 2,
        visibility: hidden ? 'hidden' : 'visible',
      }}
    >
      {faceDefs.map(({ face, transform }) => {
        const stickerIdx = faces[face]
        const hasSticker = stickerIdx !== undefined
        const color = hasSticker ? FACE_COLORS[state[stickerIdx]] : '#0d1117'

        return (
          <div
            key={face}
            style={{
              position: 'absolute',
              width: CELL,
              height: CELL,
              transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d',
              transform,
              backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
              background: hasSticker ? color : '#0d1117',
              border: hasSticker ? '2px solid rgba(0,0,0,0.3)' : '1px solid #111',
              borderRadius: 4,
              boxSizing: 'border-box',
            }}
          >
            {hasSticker && (
              <div style={{
                position: 'absolute',
                inset: 3,
                background: color,
                borderRadius: 2,
                boxShadow: 'inset 0 0 6px rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {faceLabel === face && !showNumbers && (
                  <span style={{
                    fontFamily: 'system-ui, sans-serif',
                    fontWeight: 900,
                    fontSize: Math.round(CELL * 0.30),
                    color: LABEL_TEXT_COLOR[face] || 'rgba(0,0,0,0.6)',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    lineHeight: 1,
                  }}>{face}</span>
                )}
                {showNumbers && stickerIdx !== undefined && (
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: Math.round(CELL * 0.20),
                    color: LABEL_TEXT_COLOR[state[stickerIdx]] || 'rgba(0,0,0,0.6)',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    lineHeight: 1,
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  }}>{NET_FACE_NAMES[Math.floor(stickerIdx / 9)]}{(stickerIdx % 9) + 1}</span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Move Panel ──────────────────────────────────────────────────────────────
const MOVE_BUTTONS = ['U', 'R', 'F', 'D', 'L', 'B'].flatMap(f => [f, f + "'", f + '2'])

function MoveButtons({ onMove, disabled }) {
  const faceColor = {
    U: '#f0f0f0', R: '#0066cc', F: '#cc2200', D: '#ffcc00', L: '#ff6600', B: '#009933'
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {MOVE_BUTTONS.map(m => {
        const face = m[0]
        const fc = faceColor[face] || '#aaa'
        return (
          <button
            key={m}
            onClick={() => onMove(m)}
            disabled={disabled}
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              fontWeight: 'bold',
              padding: '4px 8px',
              borderRadius: 4,
              border: `1px solid ${fc}55`,
              background: `${fc}18`,
              color: fc,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.15s',
              minWidth: 44, minHeight: 44,
            }}
          >
            {m}
          </button>
        )
      })}
    </div>
  )
}

// ─── Math Panel content helpers ──────────────────────────────────────────────
function CycleDisplay({ cycles, label }) {
  return (
    <div style={{ fontSize: 11, fontFamily: 'monospace', lineHeight: 1.6 }}>
      <div style={{ color: '#aaa', marginBottom: 2 }}>{label}</div>
      {cycles.map((c, i) => (
        <div key={i} style={{ color: '#4dd0ff' }}>
          [{c.join(' → ')}]
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RubiksCube({ onBack }) {
  const [phase, setPhase] = useState('intro') // 'intro' | 'learn' | 'play'
  const [state, setState] = useState(solvedState)
  const [history, setHistory] = useState([]) // array of move names
  const [lastMove, setLastMove] = useState(null)
  const [sessionMoves, setSessionMoves] = useState(0)
  const [scrambling, setScrambling] = useState(false)
  const [orderResult, setOrderResult] = useState(null) // { move, order }
  const [rxuResult, setRxuResult] = useState(null) // { ru: state, ur: state }
  const [showLabels, setShowLabels] = useState(true)
  const [showNumbers, setShowNumbers] = useState(false)
  const [showNet, setShowNet] = useState(true)

  // Animation state: { face, transform } | null
  const [animMove, setAnimMove] = useState(null)
  const animating = useRef(false)
  const animLayerRef = useRef(null)
  const animTimerRef = useRef(null)

  // Trigger the CSS transition after the animation wrapper mounts
  useEffect(() => {
    if (!animMove?.transform || !animLayerRef.current) return
    const el = animLayerRef.current
    el.style.transition = 'none'
    el.style.transform = 'none'
    el.getBoundingClientRect() // force reflow so transition starts from identity
    el.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
    el.style.transform = animMove.transform
  }, [animMove])

  // Cleanup timer on unmount
  useEffect(() => () => { if (animTimerRef.current) clearTimeout(animTimerRef.current) }, [])

  // Viewing angle
  const [rotX, setRotX] = useState(-25)
  const [rotY, setRotY] = useState(30)
  const dragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const cubeRef = useRef(null)

  const handleMouseDown = useCallback((e) => {
    dragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    setRotY(r => r + dx * 0.5)
    setRotX(r => Math.max(-80, Math.min(80, r - dy * 0.5)))
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseUp = useCallback(() => { dragging.current = false }, [])

  useEffect(() => {
    window.addEventListener('pointermove', handleMouseMove)
    window.addEventListener('pointerup', handleMouseUp)
    return () => {
      window.removeEventListener('pointermove', handleMouseMove)
      window.removeEventListener('pointerup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // One owned timer prevents overlapping turns and survives reset/unmount safely.
  const sequenceRef = useRef([])
  const stateRef = useRef(state)
  stateRef.current = state
  const cancelMoves = useCallback(() => {
    clearTimeout(animTimerRef.current)
    sequenceRef.current = []
    animating.current = false
    setAnimMove(null)
    setScrambling(false)
  }, [])

  const runMoves = useCallback((moves) => {
    if (animating.current) return
    animating.current = true
    setScrambling(true)
    sequenceRef.current = [...moves]
    const next = () => {
      const moveName = sequenceRef.current.shift()
      if (!moveName) {
        animating.current = false
        setScrambling(false)
        return
      }
      const fa = FACE_ANIM[moveName[0]]
      const deg = fa.cw * (moveName.endsWith('2') ? 2 : moveName.endsWith("'") ? -1 : 1)
      setAnimMove({ face: moveName[0], transform: `rotate${fa.axis}(${deg}deg)`, snapshot: stateRef.current })
      animTimerRef.current = setTimeout(() => {
        const updated = applyMove(stateRef.current, moveName)
        stateRef.current = updated
        setState(updated)
        setHistory(prev => [...prev, moveName])
        setLastMove(moveName)
        setSessionMoves(n => n + 1)
        setOrderResult(null)
        setAnimMove(null)
        animTimerRef.current = setTimeout(next, 40)
      }, ANIM_MS + 40)
    }
    next()
  }, [])
  const doMove = useCallback(move => runMoves([move]), [runMoves])

  const doScramble = useCallback(() => {
    const faces = ['U', 'D', 'R', 'L', 'F', 'B']
    const seq = []
    for (let i = 0; i < 20; i++) {
      const choices = faces.filter(f => f !== seq.at(-1)?.[0])
      seq.push(choices[Math.floor(Math.random() * choices.length)] + ['', "'", '2'][Math.floor(Math.random() * 3)])
    }
    runMoves(seq)
  }, [runMoves])

  const doReset = useCallback(() => {
    cancelMoves()
    stateRef.current = solvedState()
    setState(stateRef.current)
    setHistory([])
    setLastMove(null)
    setOrderResult(null)
    setRxuResult(null)
  }, [cancelMoves])

  const doUndo = useCallback(() => {
    if (animating.current || history.length === 0) return
    const last = history[history.length - 1]
    const inv = last.endsWith("'") ? last[0] : last.endsWith('2') ? last : last + "'"
    stateRef.current = applyMove(stateRef.current, inv)
    setState(stateRef.current)
    setHistory(prev => prev.slice(0, -1))
    setLastMove(inv)
    setOrderResult(null)
    setSessionMoves(n => n + 1)
  }, [history])

  const doShowOrder = useCallback(() => {
    if (!lastMove) return
    setOrderResult({ move: lastMove, order: lastMove.endsWith('2') ? 2 : 4 })
  }, [lastMove])

  const doCommutator = useCallback(() => runMoves(['R', 'U', "R'", "U'"]), [runMoves])

  const doRthenU = useCallback(() => {
    const s0 = solvedState()
    const s1 = applyMove(applyMove(s0, 'R'), 'U')
    setRxuResult(prev => ({ ...prev, ru: s1 }))
  }, [])

  const doUthenR = useCallback(() => {
    const s0 = solvedState()
    const s1 = applyMove(applyMove(s0, 'U'), 'R')
    setRxuResult(prev => ({ ...prev, ur: s1 }))
  }, [])

  // ─── Intro screen ────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        color: '#e0f0ff',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ maxWidth: 780, width: '100%' }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#4dd0ff', cursor: 'pointer', fontSize: 11, letterSpacing: '2px', fontFamily: 'monospace', padding: '0 0 16px 0', opacity: 0.7 }}>
              ← GAMES
            </button>
          )}
          {/* Step progress */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
            {['① Story', '② Learn', '③ Play'].map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: i === 0 ? 'rgba(77,208,255,0.2)' : 'rgba(255,255,255,0.05)',
                  border: i === 0 ? '1px solid rgba(77,208,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  color: i === 0 ? '#4dd0ff' : '#445566',
                }}>{label}</div>
                {i < 2 && <span style={{ color: '#334455' }}>→</span>}
              </div>
            ))}
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 64, marginBottom: 8 }}>🎲</div>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>
              Rubik's Cube
            </h1>
            <p style={{ color: '#4dd0ff', fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 16px' }}>
              Group Theory Through Play
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['What is a mathematical group?', 'Why order matters in math', 'God\'s Number = 20 moves', 'The "sexy move" commutator'].map(item => (
                <div key={item} style={{ fontSize: 12, color: '#4dd0ff', background: 'rgba(77,208,255,0.08)', border: '1px solid rgba(77,208,255,0.2)', borderRadius: 20, padding: '3px 12px' }}>
                  ✓ {item}
                </div>
              ))}
            </div>
          </div>

          {/* Fact cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 40 }}>
            {[
              {
                icon: '🏛️',
                title: 'Ernő Rubik, Budapest 1974',
                body: 'A Hungarian architecture professor invented the cube as a teaching tool for 3D spatial geometry. He didn\'t realise it was a puzzle — it took him over a month to solve his own invention.'
              },
              {
                icon: '∞',
                title: '43,252,003,274,489,856,000 States',
                body: 'About 43 quintillion possible configurations. If you turned one per second, it would take roughly 1.4 trillion years to visit every state.'
              },
              {
                icon: '20',
                title: "God's Number = 20",
                body: 'Any legal scrambled state can be solved in at most 20 face turns, counting a half-turn as one move. This was proved in 2010 using 35 CPU-years of computation distributed across Google\'s servers.'
              },
              {
                icon: '⊕',
                title: 'A Mathematical Group',
                body: 'All reachable cube transformations together form a group. Combining transformations means doing one and then the other. The cube is one of the most tangible models of abstract algebra.'
              },
            ].map(card => (
              <div key={card.title} style={{
                background: 'rgba(77,208,255,0.06)',
                border: '1px solid rgba(77,208,255,0.2)',
                borderRadius: 12,
                padding: '20px 20px',
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
                <div style={{ fontWeight: 700, color: '#4dd0ff', marginBottom: 6, fontSize: 14 }}>{card.title}</div>
                <div style={{ color: '#a0b8cc', fontSize: 13, lineHeight: 1.6 }}>{card.body}</div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPhase('learn')}
              style={{
                padding: '14px 32px',
                borderRadius: 8,
                border: '1px solid rgba(77,208,255,0.4)',
                background: 'rgba(77,208,255,0.1)',
                color: '#4dd0ff',
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Learn the Math
            </button>
            <button
              onClick={() => setPhase('play')}
              style={{
                padding: '14px 32px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #4dd0ff, #0088cc)',
                color: '#000',
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Play Now →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Learn screen ────────────────────────────────────────────────────────
  if (phase === 'learn') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        color: '#e0f0ff',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ maxWidth: 800, width: '100%' }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#4dd0ff', cursor: 'pointer', fontSize: 11, letterSpacing: '2px', fontFamily: 'monospace', padding: '0 0 16px 0', opacity: 0.7 }}>
              ← GAMES
            </button>
          )}
          {/* Step progress */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            {['① Story', '② Learn', '③ Play'].map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: i === 1 ? 'rgba(77,208,255,0.2)' : 'rgba(255,255,255,0.05)',
                  border: i === 1 ? '1px solid rgba(77,208,255,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  color: i === 1 ? '#4dd0ff' : i === 0 ? '#334455' : '#445566',
                }}>{label}</div>
                {i < 2 && <span style={{ color: '#334455' }}>→</span>}
              </div>
            ))}
          </div>
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 32 }}>
            The Math Behind the Cube
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 40 }}>
            {/* Panel 0 — Face Notation (NEW) */}
            <div style={{ background: 'rgba(255,200,50,0.06)', border: '1px solid rgba(255,200,50,0.2)', borderRadius: 12, padding: 24 }}>
              <div style={{ color: '#ffd700', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                Face Notation — Start Here
              </div>
              <p style={{ color: '#c0d8e8', fontSize: 13, lineHeight: 1.6, margin: '0 0 12px' }}>
                Every face of the cube has a single letter. A move rotates that face <strong style={{ color: '#fff' }}>90° clockwise</strong> (viewed from outside). A prime <strong style={{ color: '#ffd700' }}>'</strong> means counter-clockwise. A <strong style={{ color: '#ffd700' }}>2</strong> means 180°.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 10 }}>
                {[
                  { letter: 'U', name: 'Up face', color: '#f0f0f0' },
                  { letter: 'D', name: 'Down face', color: '#ffcc00' },
                  { letter: 'R', name: 'Right face', color: '#0066cc' },
                  { letter: 'L', name: 'Left face', color: '#ff6600' },
                  { letter: 'F', name: 'Front face', color: '#cc2200' },
                  { letter: 'B', name: 'Back face', color: '#009933' },
                ].map(({ letter, name, color }) => (
                  <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 16, height: 16, background: color, borderRadius: 3, border: '1px solid rgba(0,0,0,0.25)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'monospace', color, fontWeight: 800, fontSize: 14 }}>{letter}</span>
                    <span style={{ color: '#8899aa', fontSize: 12 }}>{name}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '1px solid rgba(255,200,50,0.15)', paddingTop: 10, fontFamily: 'monospace', fontSize: 12, color: '#8899aa', lineHeight: 1.8 }}>
                <span style={{ color: '#ffd700' }}>R</span> = Right CW · <span style={{ color: '#ffd700' }}>R'</span> = Right CCW · <span style={{ color: '#ffd700' }}>R2</span> = Right 180°
              </div>
            </div>

            {/* Panel 1 */}
            <div style={{ background: 'rgba(77,208,255,0.06)', border: '1px solid rgba(77,208,255,0.2)', borderRadius: 12, padding: 24 }}>
              <div style={{ color: '#4dd0ff', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                Group Theory
              </div>
              <p style={{ color: '#c0d8e8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                A <strong style={{ color: '#fff' }}>group</strong> is a set with a binary operation satisfying four axioms: closure, associativity, identity, and invertibility.
              </p>
              <br />
              <p style={{ color: '#c0d8e8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                Cube moves form a group of order <strong style={{ color: '#4dd0ff' }}>~43 quintillion</strong>. The identity element is "do nothing." Every move U has an inverse U′ so that U∘U′ = identity.
              </p>
              <br />
              <p style={{ color: '#c0d8e8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                The cube group is a <strong style={{ color: '#fff' }}>subgroup</strong> of S₅₄ (all permutations of 54 stickers), with additional orientation constraints.
              </p>
            </div>

            {/* Panel 2 */}
            <div style={{ background: 'rgba(255,120,60,0.06)', border: '1px solid rgba(255,120,60,0.2)', borderRadius: 12, padding: 24 }}>
              <div style={{ color: '#ff8844', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                Non-Commutativity
              </div>
              <p style={{ color: '#c0d8e8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                For most moves A and B: <strong style={{ color: '#ff8844' }}>A∘B ≠ B∘A</strong>
              </p>
              <br />
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ color: '#4dd0ff', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>R then U</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#aaa' }}>Right face CW<br/>then Top CW</div>
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ color: '#ff8844', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>U then R</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#aaa' }}>Top CW first<br/>then Right CW</div>
                </div>
              </div>
              <p style={{ color: '#c0d8e8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                The two operations produce different cube states. This mirrors how matrix multiplication is non-commutative: AB ≠ BA in general.
              </p>
            </div>

            {/* Panel 3 */}
            <div style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 12, padding: 24 }}>
              <div style={{ color: '#c084fc', fontWeight: 800, fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                Move Order & Cycles
              </div>
              <p style={{ color: '#c0d8e8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                The <strong style={{ color: '#fff' }}>order</strong> of a group element is how many times you must apply it to return to identity.
              </p>
              <br />
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#c084fc', lineHeight: 2 }}>
                <div>R × 4 = identity (order 4)</div>
                <div>U × 4 = identity (order 4)</div>
                <div>(R U) repeated 105 times = identity</div>
                <div>[R,U] × 6 = identity</div>
              </div>
              <br />
              <p style={{ color: '#c0d8e8', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                The commutator <strong style={{ color: '#c084fc' }}>[R,U] = RUR′U′</strong> — the "sexy move" — returns to solved in exactly 6 applications, but one repetition still changes several pieces; it is not a complete solving method.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setPhase('play')}
              style={{
                padding: '14px 40px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #4dd0ff, #0088cc)',
                color: '#000',
                fontWeight: 800,
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              Start Playing →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Play screen ─────────────────────────────────────────────────────────
  const cubeSize = 3 * TOTAL // 3 * 59 = 177
  const lastMoveCycles = lastMove ? getMoveCycles(lastMove) : []

  return (
    <div className="rubiks-play" style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      overflow: 'hidden',
      fontFamily: 'system-ui, sans-serif',
      color: '#e0f0ff',
      gap: 0,
    }}>
      {/* ── LEFT COLUMN (65%) ── */}
      <div className="rubiks-main" style={{ flex: '0 0 65%', display: 'flex', flexDirection: 'column', padding: '20px 20px 20px 24px', gap: 20, overflowY: 'auto', height: '100vh' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#4dd0ff', cursor: 'pointer', fontSize: 11, letterSpacing: '2px', fontFamily: 'monospace', opacity: 0.7 }}>
              ← GAMES
            </button>
          )}
          <button
            onClick={() => { cancelMoves(); setPhase('intro') }}
            style={{ background: 'none', border: '1px solid rgba(77,208,255,0.3)', color: '#4dd0ff', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
          >
            ← Back
          </button>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>Rubik's Cube</h2>
          {isSolved(state) && (
            <span style={{ background: 'rgba(0,200,100,0.2)', border: '1px solid rgba(0,200,100,0.4)', color: '#4ade80', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
              SOLVED ✓
            </span>
          )}
          <span style={{ color: '#334455', fontSize: 11, marginLeft: 'auto' }}>Drag cube to rotate view</span>
        </div>

        {/* Face color legend */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#445566', fontSize: 11, marginRight: 4 }}>Faces:</span>
          {[
            { letter: 'U', name: 'Up', color: '#f0f0f0' },
            { letter: 'R', name: 'Right', color: '#0066cc' },
            { letter: 'F', name: 'Front', color: '#cc2200' },
            { letter: 'D', name: 'Down', color: '#ffcc00' },
            { letter: 'L', name: 'Left', color: '#ff6600' },
            { letter: 'B', name: 'Back', color: '#009933' },
          ].map(({ letter, name, color }) => (
            <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: 4, background: `${color}15`, border: `1px solid ${color}44`, borderRadius: 5, padding: '2px 7px' }}>
              <div style={{ width: 9, height: 9, background: color, borderRadius: 2, border: '1px solid rgba(0,0,0,0.2)' }} />
              <span style={{ fontFamily: 'monospace', color, fontWeight: 800, fontSize: 11 }}>{letter}</span>
              <span style={{ color: '#667788', fontSize: 10 }}>{name}</span>
            </div>
          ))}
        </div>

        <FirstExperiments history={history} onReset={doReset} solved={isSolved(state)} />
        <button onClick={() => { setRotX(-25); setRotY(30) }}>Restore starting view</button>
        {/* First-timer hint */}
        {history.length === 0 && (
          <div style={{ background: 'rgba(77,208,255,0.06)', border: '1px solid rgba(77,208,255,0.2)', borderRadius: 8, padding: '10px 16px' }}>
            <div style={{ color: '#4dd0ff', fontWeight: 700, fontSize: 12, marginBottom: 6 }}>New here? Here's how to start:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 4, fontSize: 12, color: '#8899aa' }}>
              <div><span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>R</span> — rotate the Right face 90° clockwise</div>
              <div><span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>R'</span> — rotate it back (counter-clockwise)</div>
              <div><span style={{ color: '#ffd700', fontFamily: 'monospace', fontWeight: 700 }}>R U R' U'</span> — the "sexy move" (try it 6×)</div>
              <div>Try the three guided experiments before using <strong style={{ color: '#fff' }}>Scramble</strong>.</div>
            </div>
          </div>
        )}

        {/* 3D Cube */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <div style={{ color: '#6688aa', fontSize: 11 }}>Drag to rotate view</div>
            {[
              { key: 'labels', label: showLabels ? '🏷 Labels ON' : '🏷 Labels OFF', active: showLabels, toggle: () => setShowLabels(v => !v) },
              { key: 'nums', label: showNumbers ? '#  Numbers ON' : '#  Numbers OFF', active: showNumbers, toggle: () => setShowNumbers(v => !v) },
              { key: 'net', label: showNet ? '⊞ Net ON' : '⊞ Net OFF', active: showNet, toggle: () => setShowNet(v => !v) },
            ].map(({ key, label, active, toggle }) => (
              <button key={key} onClick={toggle} style={{
                marginLeft: key === 'labels' ? 'auto' : 0,
                padding: '3px 10px', borderRadius: 5,
                border: `1px solid rgba(77,208,255,${active ? '0.4' : '0.15'})`,
                background: active ? 'rgba(77,208,255,0.15)' : 'rgba(255,255,255,0.04)',
                color: active ? '#4dd0ff' : '#445566',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
          <div
            ref={cubeRef}
            onPointerDown={handleMouseDown}
            onPointerCancel={handleMouseUp}
            role="img" aria-label="Interactive cube. Drag to change the view; use move buttons to turn faces."
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              perspective: '900px',
              cursor: dragging.current ? 'grabbing' : 'grab',
              height: 420,
              userSelect: 'none', touchAction: 'none',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: cubeSize,
                height: cubeSize,
                transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d',
                transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
                transition: scrambling ? 'transform 0.08s ease' : 'none',
              }}
            >
              {(() => {
                const layerFn = animMove ? FACE_LAYER[animMove.face] : null
                const getFaceLabel = (cubie) => {
                  if (!showLabels || showNumbers) return null
                  const e = Object.entries(FACE_CENTERS).find(([, c]) => c.x === cubie.x && c.y === cubie.y && c.z === cubie.z)
                  return e ? e[0] : null
                }
                return (
                  <>
                    {CUBIES.map(cubie => (
                      <Cubie
                        key={`${cubie.x},${cubie.y},${cubie.z}`}
                        cubie={cubie}
                        state={state}
                        faceLabel={getFaceLabel(cubie)}
                        showNumbers={showNumbers}
                        hidden={layerFn ? layerFn(cubie) : false}
                      />
                    ))}
                    {animMove && (
                      <div ref={animLayerRef} style={{
                        position: 'absolute',
                        left: 0, top: 0, right: 0, bottom: 0,
                        transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d',
                        pointerEvents: 'none',
                        transformOrigin: `${HALF}px ${HALF}px 0px`,
                      }}>
                        {CUBIES.filter(c => FACE_LAYER[animMove.face](c)).map(cubie => (
                          <Cubie
                            key={`g-${cubie.x},${cubie.y},${cubie.z}`}
                            cubie={cubie}
                            state={animMove.snapshot || state}
                            faceLabel={getFaceLabel(cubie)}
                            showNumbers={showNumbers}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Move buttons */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
            <div style={{ color: '#4dd0ff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Moves</div>
            <div style={{ color: '#445566', fontSize: 11 }}>Letter = face · no suffix = clockwise · ' = CCW · 2 = 180°</div>
          </div>
          <MoveButtons onMove={doMove} disabled={scrambling || !!animMove} />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={doScramble}
            disabled={scrambling}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: '1px solid rgba(255,200,50,0.4)',
              background: 'rgba(255,200,50,0.1)',
              color: '#ffd700',
              fontWeight: 700,
              fontSize: 13,
              cursor: scrambling ? 'wait' : 'pointer',
              opacity: scrambling ? 0.6 : 1,
            }}
          >
            {scrambling ? 'Turning…' : 'Scramble (20 moves)'}
          </button>
          <button
            onClick={doReset}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: '1px solid rgba(100,200,255,0.3)',
              background: 'rgba(100,200,255,0.08)',
              color: '#a0c8e0',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Reset / Solved
          </button>
          <button
            onClick={doUndo}
            disabled={scrambling || history.length === 0}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: '1px solid rgba(200,150,255,0.3)',
              background: 'rgba(200,150,255,0.08)',
              color: '#c084fc',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              opacity: history.length === 0 ? 0.4 : 1,
            }}
          >
            ↩ Undo
          </button>
        </div>

        {/* Move history */}
        <div>
          <div style={{ color: '#4dd0ff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Move History (last {Math.min(history.length, 20)})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, minHeight: 28 }}>
            {history.slice(-20).map((m, i) => (
              <span key={i} style={{
                fontFamily: 'monospace',
                fontSize: 12,
                padding: '2px 6px',
                borderRadius: 4,
                background: i === history.slice(-20).length - 1 ? 'rgba(77,208,255,0.25)' : 'rgba(255,255,255,0.06)',
                color: i === history.slice(-20).length - 1 ? '#4dd0ff' : '#8899aa',
                border: i === history.slice(-20).length - 1 ? '1px solid rgba(77,208,255,0.4)' : '1px solid transparent',
              }}>
                {m}
              </span>
            ))}
            {history.length === 0 && (
              <span style={{ color: '#445566', fontSize: 12 }}>No moves yet</span>
            )}
          </div>
        </div>

        {/* Live unfolded net */}
        {showNet && <CubeNetLive state={state} />}
      </div>

      {/* ── RIGHT COLUMN — Math Panel (35%) ── */}
      <div className="rubiks-panel" style={{
        flex: '0 0 35%',
        background: '#060c18',
        borderLeft: '1px solid rgba(77,208,255,0.2)',
        padding: '20px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        overflowY: 'auto',
        height: '100vh',
      }}>
        <div style={{ color: '#4dd0ff', fontSize: 13, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', borderBottom: '1px solid rgba(77,208,255,0.15)', paddingBottom: 8 }}>
          Math Panel
        </div>

        {/* NOTATION GUIDE */}
        <div>
          <div style={{ color: '#ffd700', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Move Notation
          </div>
          <div style={{ background: 'rgba(255,200,50,0.04)', border: '1px solid rgba(255,200,50,0.15)', borderRadius: 8, padding: '10px 12px' }}>
            {[
              { mv: 'R / R\'', color: '#0066cc', desc: 'Right face — CW / CCW' },
              { mv: 'U / U\'', color: '#f0f0f0', desc: 'Up face — CW / CCW' },
              { mv: 'F / F\'', color: '#cc2200', desc: 'Front face — CW / CCW' },
              { mv: 'D / D\'', color: '#ffcc00', desc: 'Down face — CW / CCW' },
              { mv: 'L / L\'', color: '#ff6600', desc: 'Left face — CW / CCW' },
              { mv: 'B / B\'', color: '#009933', desc: 'Back face — CW / CCW' },
            ].map(({ mv, color, desc }) => (
              <div key={mv} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, background: color, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ fontFamily: 'monospace', color, fontWeight: 700, fontSize: 11, minWidth: 44 }}>{mv}</span>
                <span style={{ color: '#8899aa', fontSize: 11 }}>{desc}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 6, paddingTop: 6, color: '#556677', fontSize: 10 }}>
              Clockwise = as seen looking straight at that face from outside the cube
            </div>
          </div>
        </div>

        {/* CUBE NET DIAGRAM */}
        <div>
          <div style={{ color: '#4dd0ff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Face Map
          </div>
          <div style={{ background: 'rgba(77,208,255,0.04)', border: '1px solid rgba(77,208,255,0.12)', borderRadius: 8, padding: '12px 14px' }}>
            <CubeNet />
          </div>
        </div>

        {/* GUIDED EXPERIMENTS */}
        <div>
          <div style={{ color: '#c084fc', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Try These Experiments
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Order of R', steps: 'Press R exactly 4 times', insight: 'Back to solved! R has order 4 in the group.', color: '#0066cc' },
              { label: 'The Sexy Move', steps: 'Press R, U, R\', U\' — repeat 6 times', insight: '[R,U] is a commutator with order 6.', color: '#c084fc' },
              { label: 'Non-commutativity', steps: 'Try R then U. Reset. Try U then R.', insight: 'Different results — order matters, just like matrix multiplication.', color: '#ff8844' },
              { label: 'Identity element', steps: 'Press R then R\'', insight: 'You\'re back to start. R\' is the inverse of R.', color: '#4dd0ff' },
            ].map(({ label, steps, insight, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}33`, borderRadius: 6, padding: '7px 10px' }}>
                <div style={{ color, fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{label}</div>
                <div style={{ color: '#c0d8e8', fontSize: 11 }}>{steps}</div>
                <div style={{ color: '#556677', fontSize: 10, fontStyle: 'italic', marginTop: 2 }}>{insight}</div>
              </div>
            ))}
          </div>
        </div>

        {/* LAST MOVE */}
        <div>
          <div style={{ color: '#4dd0ff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Last Move
          </div>
          {lastMove ? (
            <div style={{ background: 'rgba(77,208,255,0.05)', border: '1px solid rgba(77,208,255,0.15)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 900, color: '#fff' }}>{lastMove}</div>
                <div style={{ color: '#6688aa', fontSize: 12 }}>
                  {lastMove.endsWith("'") ? 'counter-clockwise' : lastMove.endsWith('2') ? '180°' : 'clockwise'}
                  {' · '}{lastMove[0] === 'U' ? 'top' : lastMove[0] === 'D' ? 'bottom' : lastMove[0] === 'R' ? 'right' : lastMove[0] === 'L' ? 'left' : lastMove[0] === 'F' ? 'front' : 'back'} face
                </div>
              </div>
              <div style={{ color: '#6688aa', fontSize: 11, marginBottom: 4 }}>
                A cycle visits positions in order, then returns to its start. This move shifts {lastMoveCycles.reduce((n, c) => n + c.length, 0)} stickers in {lastMoveCycles.length} cycles:
              </div>
              {lastMoveCycles.map((c, i) => (
                <div key={i} style={{ fontFamily: 'monospace', fontSize: 11, color: '#4dd0ff', lineHeight: 1.7 }}>
                  ({[...c, c[0]].map(i => NET_FACE_NAMES[Math.floor(i / 9)] + (i % 9 + 1)).join(' → ')})
                </div>
              ))}
              <div style={{ color: '#445566', fontSize: 10, marginTop: 4 }}>Addresses match the live net: U1 is the top-left position on the Up face.</div>
            </div>
          ) : (
            <div style={{ color: '#445566', fontSize: 12 }}>Apply a move to see its permutation cycles in the group</div>
          )}
        </div>

        {/* MOVE ORDER */}
        <div>
          <div style={{ color: '#4dd0ff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Move Order
          </div>
          <div style={{ color: '#8899aa', fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>
            The <em>order</em> of a move is the number of repetitions needed to return to your starting state, even if it was scrambled.
          </div>
          <button
            onClick={doShowOrder}
            disabled={!lastMove || scrambling}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid rgba(77,208,255,0.3)',
              background: 'rgba(77,208,255,0.08)',
              color: '#4dd0ff',
              fontWeight: 700,
              fontSize: 12,
              cursor: lastMove ? 'pointer' : 'not-allowed',
              opacity: lastMove ? 1 : 0.4,
              marginBottom: 8,
            }}
          >
            Show order of last move
          </button>
          {orderResult && (
            <div style={{ background: 'rgba(77,208,255,0.08)', borderRadius: 8, padding: 10, fontFamily: 'monospace', fontSize: 13 }}>
              <span style={{ color: '#fff', fontWeight: 700 }}>{orderResult.move}</span>
              <span style={{ color: '#6688aa' }}> repeated </span>
              <span style={{ color: '#4dd0ff', fontWeight: 700 }}>{orderResult.order}×</span>
              <span style={{ color: '#6688aa' }}> = identity</span>
              <div style={{ color: '#a0b8cc', fontSize: 11, marginTop: 4 }}>Order = {orderResult.order}</div>
            </div>
          )}
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#556677', marginTop: 8, lineHeight: 1.8 }}>
            <div>ord(R) = 4</div>
            <div>ord(U) = 4</div>
            <div>ord(RU) = 105</div>
          </div>
        </div>

        {/* NON-COMMUTATIVITY */}
        <div>
          <div style={{ color: '#ff8844', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Non-Commutativity
          </div>
          <div style={{ color: '#8899aa', fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
            Try the same two moves in different order:
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button
              onClick={doRthenU}
              style={{
                flex: 1, padding: '7px 8px', borderRadius: 6,
                border: '1px solid rgba(77,208,255,0.3)',
                background: 'rgba(77,208,255,0.08)',
                color: '#4dd0ff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              R then U
            </button>
            <button
              onClick={doUthenR}
              style={{
                flex: 1, padding: '7px 8px', borderRadius: 6,
                border: '1px solid rgba(255,136,68,0.3)',
                background: 'rgba(255,136,68,0.08)',
                color: '#ff8844', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace',
              }}
            >
              U then R
            </button>
          </div>
          {rxuResult && (rxuResult.ru || rxuResult.ur) && (
            <div style={{ background: 'rgba(255,136,68,0.06)', border: '1px solid rgba(255,136,68,0.2)', borderRadius: 8, padding: 10 }}>
              {rxuResult.ru && rxuResult.ur && (
                <div>
                  <div style={{ color: '#ff8844', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                    R∘U ≠ U∘R ✓ Confirmed!
                  </div>
                  <div style={{ color: '#c0d8e8', fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
                    The two operations produce <strong style={{ color: '#fff' }}>different cube states</strong> — just like matrix multiplication where AB ≠ BA in general.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    <div style={{ background: 'rgba(77,208,255,0.08)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ color: '#4dd0ff', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>R then U</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#667788' }}>
                        U-face: {rxuResult.ru.slice(0,9).join(' ')}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,136,68,0.08)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
                      <div style={{ color: '#ff8844', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>U then R</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#667788' }}>
                        U-face: {rxuResult.ur.slice(0,9).join(' ')}
                      </div>
                    </div>
                  </div>
                  <div style={{ color: '#445566', fontSize: 10, marginTop: 6 }}>U-face stickers differ between the two — they are not equal</div>
                </div>
              )}
              {!(rxuResult.ru && rxuResult.ur) && (
                <div style={{ color: '#8899aa', fontSize: 11 }}>Try both buttons to compare results</div>
              )}
            </div>
          )}
        </div>

        {/* GROUP THEORY */}
        <div>
          <div style={{ color: '#4dd0ff', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Group Theory
          </div>
          <div style={{
            background: 'rgba(77,208,255,0.04)',
            border: '1px solid rgba(77,208,255,0.12)',
            borderRadius: 8,
            padding: 12,
            fontFamily: 'monospace',
            fontSize: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#6688aa' }}>Moves from solved:</span>
              <span style={{ color: '#fff', fontWeight: 700 }}>{history.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#6688aa' }}>Session total:</span>
              <span style={{ color: '#4dd0ff', fontWeight: 700 }}>{sessionMoves}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#6688aa' }}>State:</span>
              <span style={{ color: isSolved(state) ? '#4ade80' : '#ff8844', fontWeight: 700 }}>
                {isSolved(state) ? 'Solved' : 'Scrambled'}
              </span>
            </div>
            <div style={{ borderTop: '1px solid rgba(77,208,255,0.1)', marginTop: 8, paddingTop: 8 }}>
              <div style={{ color: '#446677', fontSize: 10, marginBottom: 4 }}>Group order:</div>
              <div style={{ color: '#4dd0ff', fontSize: 10 }}>|G| = 43,252,003,274,489,856,000</div>
            </div>
          </div>
        </div>

        {/* COMMUTATOR */}
        <div>
          <div style={{ color: '#c084fc', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Commutator
          </div>
          <div style={{ color: '#8899aa', fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
            The commutator <span style={{ fontFamily: 'monospace', color: '#c084fc' }}>[R,U] = R U R′ U′</span> is the "sexy move" — a key building block for solving. Repeated 6 times it returns to the starting state.
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6644aa', marginBottom: 10, lineHeight: 1.8 }}>
            <div>[R,U]¹ → affects corners and edges</div>
            <div>[R,U]⁶ → identity (solved)</div>
          </div>
          <button
            onClick={doCommutator}
            disabled={scrambling}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid rgba(192,132,252,0.3)',
              background: 'rgba(192,132,252,0.08)',
              color: '#c084fc',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            Execute [R, U] = R U R′ U′
          </button>
        </div>

        {/* God's Number */}
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(77,208,255,0.1)' }}>
          <div style={{ color: '#334455', fontSize: 10, lineHeight: 1.6, fontFamily: 'monospace' }}>
            <div style={{ color: '#4dd0ff', marginBottom: 4 }}>God's Number = 20</div>
            <div>Any legal position: ≤ 20 face turns (a half-turn counts as one).</div>
            <div>Proved 2010 (Rokicki et al.), 35 CPU-years.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
