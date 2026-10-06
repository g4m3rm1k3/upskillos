import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Colour system (matches useColors() in viz components) ─────────────────
const C = {
  felt:      '#0d3d29',
  feltLight: '#115c3d',
  rail:      '#5c3d1a',
  railEdge:  '#8B5E2A',
  pocket:    '#060d0a',
  bg:        '#0a0f0d',
  surface:   '#111a14',
  border:    '#1e3328',
  text:      '#e2e8f0',
  muted:     '#94a3b8',
  hint:      '#64748b',
  blue:      '#38bdf8',
  amber:     '#fbbf24',
  green:     '#4ade80',
  red:       '#f87171',
  purple:    '#a78bfa',
  teal:      '#2dd4bf',
}

// ─── Physics constants (mutable via sliders) ────────────────────────────────
let FRICTION_MUT     = 0.982
let RESTITUTION_MUT  = 0.88
const SPIN_DECAY     = 0.97
const SLEEP_THRESH   = 0.04

// ─── Pool table geometry ─────────────────────────────────────────────────────
const BALL_R = 16
const TW = 900
const TH = 500
const RAIL = 48
// Kitchen line (cue ball must be placed here after scratch)
const KITCHEN_X = RAIL + (TW - RAIL * 2) * 0.25

// Pockets (6) in world coords
const POCKETS = [
  { x: RAIL,      y: RAIL      },  // TL
  { x: TW/2,      y: RAIL - 6  },  // TC
  { x: TW - RAIL, y: RAIL      },  // TR
  { x: RAIL,      y: TH - RAIL },  // BL
  { x: TW/2,      y: TH - RAIL + 6}, // BC
  { x: TW - RAIL, y: TH - RAIL },  // BR
]
const POCKET_R = 22
const MIN_HANDLE_DIST = 30
const MAX_HANDLE_DIST = 190

// Ring radius is always capped to MAX_HANDLE_DIST — ring may clip edge near rails, that's fine
function maxRadius() { return MAX_HANDLE_DIST }

// ─── Ball colours in numbered pool order ─────────────────────────────────────
const BALL_COLORS = [
  '#f5f5f5',  // 0 cue
  '#f5d000',  // 1 yellow
  '#1a47b8',  // 2 blue
  '#cc2020',  // 3 red
  '#8832b8',  // 4 purple
  '#cc5500',  // 5 orange
  '#1a9e2e',  // 6 green
  '#9e1a2e',  // 7 maroon
  '#1a1a1a',  // 8 black
]

// ─── Levels ──────────────────────────────────────────────────────────────────
const LEVELS = [
  // ── Physics tutorials ──────────────────────────────────────────────────────
  {
    name: 'Straight Shot',
    description: 'Aim the cue ball directly at the yellow ball. Watch how momentum transfers perfectly head-on — the cue stops and the target moves at the same speed.',
    balls: [
      { x:200, y:250, mass:1, colorIdx:0, isCue:true, ballNum:0 },
      { x:580, y:250, mass:1, colorIdx:1, ballNum:1 },
    ],
    aimAngle: Math.PI,
    goal: 'Pocket the yellow ball in any pocket.',
  },
  {
    name: 'Mass Difference',
    description: 'The blue ball is 3× heavier than the cue. After impact a lighter cue bounces back, a heavier target barely moves. Observe how KE distributes differently.',
    balls: [
      { x:200, y:250, mass:1,   colorIdx:0, isCue:true, ballNum:0 },
      { x:500, y:200, mass:1,   colorIdx:1, ballNum:1 },
      { x:580, y:310, mass:3,   colorIdx:2, ballNum:2 },
    ],
    aimAngle: Math.PI,
    goal: 'Pocket both colored balls.',
  },
  {
    name: 'English / Spin',
    description: 'Open the Hit panel and drag the contact point off-center. Left/right English rotates the cue after contact; top-spin (follow) makes it roll forward, backspin (draw) pulls it back.',
    balls: [
      { x:200, y:250, mass:1, colorIdx:0, isCue:true, ballNum:0 },
      { x:490, y:250, mass:1, colorIdx:7, ballNum:1 },
      { x:490, y:160, mass:1, colorIdx:1, ballNum:2 },
    ],
    aimAngle: Math.PI,
    goal: 'Pocket both colored balls using spin to control the cue ball path.',
  },
  {
    name: 'Chain Reaction',
    description: 'One perfect shot triggers a cascade. Each ball transfers momentum to the next. Use the collision-step browser (⟵ ⟶ buttons) to pause and analyse each impact.',
    balls: [
      { x:200, y:250, mass:1, colorIdx:0, isCue:true, ballNum:0 },
      { x:430, y:250, mass:1, colorIdx:1, ballNum:1 },
      { x:475, y:232, mass:1, colorIdx:3, ballNum:2 },
      { x:475, y:268, mass:1, colorIdx:2, ballNum:3 },
      { x:520, y:215, mass:1, colorIdx:4, ballNum:4 },
      { x:520, y:250, mass:1, colorIdx:8, ballNum:5 },
      { x:520, y:285, mass:1, colorIdx:5, ballNum:6 },
    ],
    aimAngle: Math.PI,
    goal: 'Pocket all balls from a single shot.',
  },

  // ── Classic pool shots ─────────────────────────────────────────────────────
  {
    name: 'The Break',
    description: 'Full 15-ball rack at the foot spot. Place the cue ball anywhere behind the head string and strike the head ball (tip of the triangle) full-force. Aim centre-ball or slightly high for maximum spread.',
    balls: [
      { x:220, y:250, mass:1, colorIdx:0, isCue:true, ballNum:0 },
      // Row 0
      { x:590, y:250, mass:1, colorIdx:1, ballNum:1 },
      // Row 1
      { x:624, y:233, mass:1, colorIdx:2, ballNum:2 },
      { x:624, y:267, mass:1, colorIdx:3, ballNum:3 },
      // Row 2 — 8-ball at centre
      { x:657, y:217, mass:1, colorIdx:4, ballNum:4 },
      { x:657, y:250, mass:1, colorIdx:8, ballNum:8 },
      { x:657, y:284, mass:1, colorIdx:5, ballNum:5 },
      // Row 3
      { x:691, y:200, mass:1, colorIdx:6, ballNum:6 },
      { x:691, y:233, mass:1, colorIdx:7, ballNum:7 },
      { x:691, y:267, mass:1, colorIdx:1, ballNum:9 },
      { x:691, y:300, mass:1, colorIdx:2, ballNum:10 },
      // Row 4
      { x:724, y:183, mass:1, colorIdx:3, ballNum:11 },
      { x:724, y:217, mass:1, colorIdx:4, ballNum:12 },
      { x:724, y:250, mass:1, colorIdx:5, ballNum:13 },
      { x:724, y:283, mass:1, colorIdx:6, ballNum:14 },
      { x:724, y:317, mass:1, colorIdx:7, ballNum:15 },
    ],
    aimAngle: Math.PI,
    goal: 'Pocket at least 2 balls on the break without scratching.',
  },
  {
    name: 'The Cut Shot',
    description: 'A cut pockets the ball by hitting it off-centre. Use the ghost-ball predictor (the faint circle on the aim line) — position your shot so the ghost ball aligns the target ball directly toward the pocket.',
    balls: [
      { x:200, y:250, mass:1, colorIdx:0, isCue:true, ballNum:0 },
      { x:720, y:155, mass:1, colorIdx:3, ballNum:1 },
    ],
    aimAngle: Math.PI - 0.18,
    goal: 'Cut the red ball into the top-right corner pocket.',
  },
  {
    name: 'Bank Shot',
    description: 'The direct path to any pocket is blocked by the black ball. Bank the purple ball off the bottom rail — angle in = angle out. Aim the purple ball ⅓ of the way toward the far end of the bottom rail.',
    balls: [
      { x:200, y:250, mass:1, colorIdx:0, isCue:true, ballNum:0 },
      { x:620, y:340, mass:1, colorIdx:4, ballNum:1 },
      { x:620, y:240, mass:1, colorIdx:8, ballNum:2 },
    ],
    aimAngle: Math.PI - 0.12,
    goal: 'Bank the purple ball off the bottom rail into a pocket.',
  },
  {
    name: '1-2 Combination',
    description: 'Three balls are perfectly collinear to the bottom-right corner pocket. Hit the blue ball (A) — it transfers momentum to the red ball (B) which pockets. The cue needs no direct contact with B.',
    balls: [
      { x:200, y:250, mass:1, colorIdx:0, isCue:true, ballNum:0 },
      { x:602, y:282, mass:1, colorIdx:2, ballNum:1 },
      { x:752, y:384, mass:1, colorIdx:3, ballNum:2 },
    ],
    aimAngle: Math.PI - 0.3,
    goal: 'Pocket the red ball via the blue ball without pocketing the blue.',
  },
  {
    name: 'The Stop Shot',
    description: 'Hit the cue ball dead centre (no spin) and it stops completely on contact — 100% of momentum goes to the yellow ball. Add backspin (draw) and the cue reverses. Add topspin (follow) and the cue rolls forward.',
    balls: [
      { x:200, y:250, mass:1, colorIdx:0, isCue:true, ballNum:0 },
      { x:530, y:250, mass:1, colorIdx:1, ballNum:1 },
      { x:770, y:380, mass:1, colorIdx:6, ballNum:2 },
    ],
    aimAngle: Math.PI,
    goal: 'Pocket the yellow ball, then the green — in two shots, using spin to control cue position.',
  },
  {
    name: 'Cluster Buster',
    description: 'Three balls are frozen together near the corner pocket. A direct hit on the lead ball sends energy through the cluster. Experiment with aim angle and spin to scatter them into the pockets.',
    balls: [
      { x:200, y:250, mass:1, colorIdx:0, isCue:true, ballNum:0 },
      { x:660, y:250, mass:1, colorIdx:2, ballNum:1 },
      { x:694, y:250, mass:1, colorIdx:3, ballNum:2 },
      { x:677, y:278, mass:1, colorIdx:4, ballNum:3 },
    ],
    aimAngle: Math.PI,
    goal: 'Pocket at least 2 of the 3 clustered balls.',
  },
  {
    name: 'The Masse Curve',
    description: 'The black ball blocks every straight path. Use extreme side-spin (English) to curve the cue ball around the obstacle. Open the Hit panel and drag the contact point near the edge of the circle.',
    balls: [
      { x:200, y:250, mass:1, colorIdx:0, isCue:true, ballNum:0 },
      { x:450, y:250, mass:2, colorIdx:8, ballNum:1 },
      { x:620, y:250, mass:1, colorIdx:1, ballNum:2 },
      { x:620, y:200, mass:1, colorIdx:3, ballNum:3 },
    ],
    aimAngle: Math.PI,
    goal: 'Pocket at least one coloured ball without directly hitting the black blocker.',
  },
  {
    name: 'Two-Rail Bank',
    description: 'The yellow ball must travel off two rails before reaching its pocket — a classic trick shot. Aim the cue ball at a steep angle toward the top-right; the ball should bounce off the right rail then the bottom rail.',
    balls: [
      { x:200, y:250, mass:1, colorIdx:0, isCue:true, ballNum:0 },
      { x:680, y:200, mass:1, colorIdx:1, ballNum:1 },
    ],
    aimAngle: Math.PI - 0.22,
    goal: 'Pocket the yellow ball using at least two rail bounces.',
  },
  {
    name: 'The Run-Out',
    description: 'Classic end-game scenario — 5 balls scattered around the table. You must pocket them all in order, controlling cue position after each shot so the next is always makeable.',
    balls: [
      { x:200, y:250, mass:1, colorIdx:0, isCue:true, ballNum:0 },
      { x:480, y:160, mass:1, colorIdx:1, ballNum:1 },
      { x:680, y:200, mass:1, colorIdx:2, ballNum:2 },
      { x:740, y:340, mass:1, colorIdx:3, ballNum:3 },
      { x:520, y:360, mass:1, colorIdx:4, ballNum:4 },
      { x:380, y:300, mass:1, colorIdx:5, ballNum:5 },
    ],
    aimAngle: Math.PI,
    goal: 'Clear all 5 balls using spin and position play.',
  },
]

// ─── Utility ─────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }
function hypot(dx, dy) { return Math.sqrt(dx * dx + dy * dy) }

function makeBall(def) {
  return {
    x: def.x, y: def.y,
    vx: 0, vy: 0,
    spin: 0,
    mass: def.mass,
    r: BALL_R,
    color: BALL_COLORS[def.colorIdx],
    colorIdx: def.colorIdx,
    isCue: !!def.isCue,
    pocketed: false,
    id: Math.random(),
    trail: [],
    ballNum: def.ballNum ?? null,
  }
}

// ─── Collision (elastic, mass-aware, with spin transfer) ─────────────────────
function resolveBallCollision(a, b, events, st) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = hypot(dx, dy)
  if (dist === 0 || dist > a.r + b.r) return

  const nx = dx / dist
  const ny = dy / dist

  const rvx = b.vx - a.vx
  const rvy = b.vy - a.vy
  const velN = rvx * nx + rvy * ny
  if (velN > 0) return   // already separating

  const impulse = (2 * velN) / (1 / a.mass + 1 / b.mass)

  a.vx += (impulse * nx) / a.mass
  a.vy += (impulse * ny) / a.mass
  b.vx -= (impulse * nx) / b.mass
  b.vy -= (impulse * ny) / b.mass

  // Spin transfer (English influence on collision)
  const tx = -ny, ty = nx  // tangent
  const relTan = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty
  const spinEffect = (a.spin - b.spin) * 0.3
  a.vx += spinEffect * tx * 0.25 / a.mass
  a.vy += spinEffect * ty * 0.25 / a.mass
  b.vx -= spinEffect * tx * 0.25 / b.mass
  b.vy -= spinEffect * ty * 0.25 / b.mass

  // Separate
  const overlap = a.r + b.r - dist + 0.5
  a.x -= overlap * nx * 0.5
  a.y -= overlap * ny * 0.5
  b.x += overlap * nx * 0.5
  b.y += overlap * ny * 0.5

  // Record collision event + flash geometry
  const impulseMag = Math.abs(impulse)
  if (impulseMag > 0.1) {
    const v1i = hypot(a.vx - impulse/a.mass*nx, a.vy - impulse/a.mass*ny)
    const v2i = hypot(b.vx + impulse/b.mass*nx, b.vy + impulse/b.mass*ny)
    const v1f = hypot(a.vx, a.vy)
    const v2f = hypot(b.vx, b.vy)
    const p1i = (a.mass * v1i).toFixed(2)
    const p2i = (b.mass * v2i).toFixed(2)
    const p1f = (a.mass * v1f).toFixed(2)
    const p2f = (b.mass * v2f).toFixed(2)
    const pTotal_i = (a.mass * v1i + b.mass * v2i).toFixed(2)
    const pTotal_f = (a.mass * v1f + b.mass * v2f).toFixed(2)
    const ke_i = (0.5 * a.mass * v1i**2 + 0.5 * b.mass * v2i**2)
    const ke_f = (0.5 * a.mass * v1f**2 + 0.5 * b.mass * v2f**2)
    const keTransferPct = ke_i > 0 ? Math.round((1 - (ke_f / ke_i)) * 100) : 0
    events.push({
      type: 'collision',
      time: Date.now(),
      ax: (a.x + b.x) / 2, ay: (a.y + b.y) / 2,
      nx, ny,
      a: { mass: a.mass, vBefore: v1i.toFixed(2), vAfter: v1f.toFixed(2), pBefore: p1i, pAfter: p1f },
      b: { mass: b.mass, vBefore: v2i.toFixed(2), vAfter: v2f.toFixed(2), pBefore: p2i, pAfter: p2f },
      pTotal_i, pTotal_f,
      angle: (Math.atan2(ny, nx) * 180 / Math.PI).toFixed(1),
      ke_i: parseFloat(ke_i).toFixed(3),
      ke_f: parseFloat(ke_f).toFixed(3),
      keTransferPct,
      impulse: impulseMag.toFixed(3),
    })
    // Store flash on stateRef so it survives across RAF frames
    if (st) {
      if (!st.flashes) st.flashes = []
      st.flashes.push({
        ax: (a.x + b.x) / 2, ay: (a.y + b.y) / 2, nx, ny, time: Date.now(),
        popupData: {
          impulse: impulseMag.toFixed(3),
          keTransferPct,
          angle: (Math.atan2(ny, nx) * 180 / Math.PI).toFixed(1),
        }
      })
    }
  }
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────
function drawArrow(ctx, x, y, dx, dy, color, lw = 2) {
  const len = hypot(dx, dy)
  if (len < 1) return
  const ex = x + dx, ey = y + dy
  const angle = Math.atan2(dy, dx)
  const hs = 9
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(ex, ey)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex - hs * Math.cos(angle - 0.45), ey - hs * Math.sin(angle - 0.45))
  ctx.lineTo(ex - hs * Math.cos(angle + 0.45), ey - hs * Math.sin(angle + 0.45))
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PhysicsPoolLab({ onClose }) {
  const canvasRef  = useRef(null)
  const animRef    = useRef(null)
  const stateRef   = useRef(null)  // mutable game state (avoids stale closures)

  // ── Reactive UI state ──────────────────────────────────────────────────────
  const [mode,      setMode]      = useState('freeplay')   // 'freeplay' | 'challenge'
  const [levelIdx,  setLevelIdx]  = useState(0)
  const [shots,     setShots]     = useState(0)
  const [overlays,  setOverlays]  = useState({
    vectors: true,
    momentum: true,
    spin: true,
    trail: false,
    forces: false,
    labels: false,
    aimVectors: false,
  })
  const [panel,     setPanel]     = useState('data')       // 'data' | 'hit' | 'help'
  const [events,    setEvents]    = useState([])
  const [hitOffset, setHitOffset] = useState({ dx: 0, dy: 0 })
  const [phase,     setPhase]     = useState('aim')        // 'aim'|'rolling'
  const [followed,  setFollowed]  = useState(null)
  const [tableData, setTableData] = useState([])
  const [expandedEvent, setExpandedEvent] = useState(null)  // index of expanded event row
  const [friction,  setFrictionUI]  = useState(0.982)
  const [restitution, setRestitutionUI] = useState(0.88)
  const [collisionStep, setCollisionStep] = useState(-1)
  const [selectedVector, setSelectedVector] = useState(null)

  // ── Collision browser refs ────────────────────────────────────────────────
  const simSnapshotsRef  = useRef([])
  const collisionStepRef = useRef(-1)
  const drawnVectorsRef  = useRef([])
  const frameCounterRef  = useRef(0)
  const [slowMo, setSlowMo] = useState(false)
  const slowMoRef = useRef(false)

  // ── Hit position picker ref (avoids closure stale) ────────────────────────
  const hitOffsetRef = useRef({ dx: 0, dy: 0 })

  // ── Initialise game state in a ref so RAF loop has stable access ──────────
  const initState = useCallback((lvlIdx, m) => {
    const level = LEVELS[lvlIdx % LEVELS.length]
    // ── Preserve scale so the table doesn't shrink on mode/level switch ──
    const existingScale = stateRef.current?.scale ?? 1
    let ballDefs

    if (m === 'freeplay') {
      // Full rack — proper pool triangle (5 rows = 15 balls)
      const rack = []
      const spacing = BALL_R * 2 + 1.5
      const startX = 590
      const startY = TH / 2
      let num = 1
      for (let row = 0; row < 5; row++) {
        const rowCount = row + 1
        const rowOffsetY = -(row * (BALL_R + 0.75))
        for (let col = 0; col < rowCount; col++) {
          rack.push({
            x: startX + row * spacing,
            y: startY + rowOffsetY + col * spacing,
            mass: 1,
            colorIdx: num % 9,
            isCue: false,
            ballNum: num,
          })
          num++
        }
      }
      ballDefs = [
        { x: 220, y: TH / 2, mass: 1, colorIdx: 0, isCue: true, ballNum: 0 },
        ...rack,
      ]
    } else {
      ballDefs = level.balls
    }

    const balls = ballDefs.map(makeBall)
    stateRef.current = {
      balls,
      events: [],
      mouse: { x: 0, y: 0 },
      shots: 0,
      phase: 'placing',
      scale: existingScale,   // ← key fix: carry forward the real scale
      offsetX: 0,
      offsetY: 0,
      pocketed: [],
      pendingPlace: false,
      aimHandle: { dragging: false, angle: level?.aimAngle ?? Math.PI, dist: 90 },
    }
    setShots(0)
    setPhase('placing')
    setEvents([])
  }, [])

  // ── Scale canvas to container ─────────────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return
    const pw = parent.clientWidth
    const ph = parent.clientHeight
    const scaleX = pw / TW
    const scaleY = ph / TH
    const scale = Math.min(scaleX, scaleY)
    const dw = Math.round(TW * scale)
    const dh = Math.round(TH * scale)
    canvas.style.width  = dw + 'px'
    canvas.style.height = dh + 'px'
    canvas.width  = dw
    canvas.height = dh
    if (stateRef.current) {
      stateRef.current.scale = scale
    }
  }, [])

  // ── Canvas world ↔ screen conversion ─────────────────────────────────────
  function toWorld(sx, sy) {
    const s = stateRef.current?.scale ?? 1
    return { x: sx / s, y: sy / s }
  }

  // ── Pointer events ────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e) => {
    if (!stateRef.current) return
    const st = stateRef.current
    if (st.phase !== 'aim' && st.phase !== 'placing') return
    const rect = canvasRef.current.getBoundingClientRect()
    const sx = (e.clientX || e.touches?.[0]?.clientX) - rect.left
    const sy = (e.clientY || e.touches?.[0]?.clientY) - rect.top
    const { x, y } = toWorld(sx, sy)
    const cue = st.balls.find(b => b.isCue && !b.pocketed)
    if (!cue) return
    // Placing phase: click to confirm position
    if (st.phase === 'placing') {
      cue.x = clamp(x, RAIL + BALL_R, KITCHEN_X - BALL_R)
      cue.y = clamp(y, RAIL + BALL_R, TH - RAIL - BALL_R)
      st.phase = 'aim'
      setPhase('aim')
      return
    }
    // Vector tip hit-test (collision step browser) — click near arrowhead to label
    if (collisionStepRef.current >= 0 && drawnVectorsRef.current.length > 0) {
      let hit = null
      for (const v of drawnVectorsRef.current) {
        if (hypot(x - v.ex, y - v.ey) < 22) { hit = v; break }
      }
      setSelectedVector(hit)
      if (hit) return
    }
    const ah = st.aimHandle
    const clickAngle = Math.atan2(y - cue.y, x - cue.x)
    const distFromBall = hypot(x - cue.x, y - cue.y)
    const capR = maxRadius()
    const curR = clamp(ah.dist, MIN_HANDLE_DIST, capR)
    // Grab if click is within 40px of the ring
    if (Math.abs(distFromBall - curR) <= 40) {
      ah.grabAngle = clickAngle      // where on the ring you grabbed
      ah.startAngle = ah.angle       // aim angle at grab time
      ah.dragging = true
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!stateRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const sx = (e.clientX || e.touches?.[0]?.clientX) - rect.left
    const sy = (e.clientY || e.touches?.[0]?.clientY) - rect.top
    const pos = toWorld(sx, sy)
    stateRef.current.mouse = pos
    const st = stateRef.current
    // Placing phase: cue ball tracks the cursor
    if (st.phase === 'placing') {
      const cue = st.balls.find(b => b.isCue && !b.pocketed)
      if (cue) {
        cue.x = clamp(pos.x, RAIL + BALL_R, KITCHEN_X - BALL_R)
        cue.y = clamp(pos.y, RAIL + BALL_R, TH - RAIL - BALL_R)
      }
      return
    }
    const ah = st.aimHandle
    if (!ah?.dragging) return
    const cue = st.balls.find(b => b.isCue && !b.pocketed)
    if (!cue) return
    const dx = pos.x - cue.x
    const dy = pos.y - cue.y
    const dist = hypot(dx, dy)
    const capR = maxRadius(cue.x, cue.y)
    // Steering wheel: rotate by delta from grab point
    const currentAngle = Math.atan2(dy, dx)
    let delta = currentAngle - ah.grabAngle
    // Normalize delta to [-π, π]
    while (delta > Math.PI) delta -= Math.PI * 2
    while (delta < -Math.PI) delta += Math.PI * 2
    ah.angle = ah.startAngle + delta
    // Radial drag resizes the ring
    ah.dist = clamp(dist, MIN_HANDLE_DIST, capR)
  }, [])

  const handleCancelDrag = useCallback(() => {
    if (!stateRef.current) return
    const ah = stateRef.current.aimHandle
    if (ah) ah.dragging = false
  }, [])

  const handleMouseUp = useCallback(() => {
    if (!stateRef.current) return
    if (stateRef.current.aimHandle) stateRef.current.aimHandle.dragging = false
  }, [])

  const handleShoot = useCallback(() => {
    if (!stateRef.current) return
    const st = stateRef.current
    if (st.phase !== 'aim') return
    const cue = st.balls.find(b => b.isCue && !b.pocketed)
    if (!cue) return
    const ah = st.aimHandle
    const nx = -Math.cos(ah.angle)
    const ny = -Math.sin(ah.angle)
    const capR = maxRadius()
    const safeDist = clamp(ah.dist, MIN_HANDLE_DIST, capR)
    const range = Math.max(capR - MIN_HANDLE_DIST, 1)
    const power = clamp(((safeDist - MIN_HANDLE_DIST) / range) * 22, 0.3, 22)
    cue.vx = nx * power
    cue.vy = ny * power
    const ho = hitOffsetRef.current
    cue.spin = (ho.dx * cue.vy - ho.dy * cue.vx) * 1.6
    ah.dragging = false
    ah.dist = 90   // reset to mid-range for next shot
    // keep simSnapshotsRef — user can still browse after shooting
    setCollisionStep(-1); collisionStepRef.current = -1
    setSelectedVector(null)
    st.shots++
    st.phase = 'rolling'
    setShots(st.shots)
    setPhase('rolling')
    st.events.push({
      type: 'shot', time: Date.now(),
      power: power.toFixed(1),
      angle: (((Math.atan2(-ny, nx) * 180 / Math.PI) + 360) % 360).toFixed(1),
      spin: cue.spin.toFixed(2),
      hitOffset: { ...ho },
    })
    setEvents([...st.events])
  }, [])

  const handleDoubleClick = useCallback(() => {
    if (!stateRef.current) return
    if (stateRef.current.phase !== 'aim') return
    handleShoot()
  }, [handleShoot])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    if (!stateRef.current) return
    const st = stateRef.current
    if (st.phase !== 'aim') return
    const ah = st.aimHandle
    // deltaY: positive = scroll down = rotate clockwise
    ah.angle += (e.deltaY / Math.abs(e.deltaY || 1)) * 0.02
  }, [])

  const loop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !stateRef.current) { animRef.current = requestAnimationFrame(loop); return }
    const st = stateRef.current
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const scale = st.scale ?? 1

    // Slow-mo: skip physics every 4 out of 5 frames
    frameCounterRef.current++
    const runPhysics = !slowMoRef.current || (frameCounterRef.current % 5 === 0)

    // Transform: world → canvas
    ctx.setTransform(scale, 0, 0, scale, 0, 0)

    // ── Physics update ────────────────────────────────────────────────────
    const eventsThisFrame = []
    if (runPhysics) for (const b of st.balls) {
      if (b.pocketed) continue
      b.x += b.vx
      b.y += b.vy
      b.vx *= FRICTION_MUT
      b.vy *= FRICTION_MUT
      b.spin *= SPIN_DECAY

      // Spin applies lateral drift (English effect)
      b.vx += b.spin * (-b.vy) * 0.0012
      b.vy += b.spin * (b.vx) * 0.0012

      // Wall bounce (uses mutable restitution)
      const left = RAIL + b.r, right = TW - RAIL - b.r
      const top  = RAIL + b.r, bot   = TH  - RAIL - b.r
      if (b.x < left)  { b.x = left;  b.vx = Math.abs(b.vx) * RESTITUTION_MUT; b.spin *= -0.5 }
      if (b.x > right) { b.x = right; b.vx = -Math.abs(b.vx) * RESTITUTION_MUT; b.spin *= -0.5 }
      if (b.y < top)   { b.y = top;   b.vy = Math.abs(b.vy) * RESTITUTION_MUT; b.spin *= -0.5 }
      if (b.y > bot)   { b.y = bot;   b.vy = -Math.abs(b.vy) * RESTITUTION_MUT; b.spin *= -0.5 }

      // Trail
      if (overlays.trail) {
        b.trail.push({ x: b.x, y: b.y })
        if (b.trail.length > 40) b.trail.shift()
      } else {
        b.trail = []
      }

      // Pocket check
      for (const p of POCKETS) {
        if (hypot(b.x - p.x, b.y - p.y) < POCKET_R + 2) {
          if (b.isCue) {
            // ── Scratch: ball-in-hand — let player place cue in kitchen
            b.x = KITCHEN_X - BALL_R * 2
            b.y = TH / 2
            b.vx = 0; b.vy = 0; b.spin = 0
            st.scratchCount = (st.scratchCount ?? 0) + 1
            st.events.push({ type: 'scratch', time: Date.now() })
            st.pendingPlace = true
            setEvents([...st.events])
          } else {
            b.pocketed = true
            b.vx = b.vy = 0
            st.pocketed.push(b)
          }
          break
        }
      }
    }

    // Ball–ball collisions — use mutable friction & restitution
    const active = st.balls.filter(b => !b.pocketed)
    if (runPhysics) {
      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          resolveBallCollision(active[i], active[j], eventsThisFrame, st)
        }
      }
    }

    if (eventsThisFrame.length > 0) {
      st.events = [...st.events, ...eventsThisFrame].slice(-20)
      setEvents([...st.events])
    }

    if (runPhysics) {
      // Sleep detection → back to aim (or placing if scratch pending)
      if (st.phase === 'rolling') {
        const maxV = Math.max(...active.map(b => hypot(b.vx, b.vy)))
        if (maxV < SLEEP_THRESH) {
          st.balls.forEach(b => { b.vx = 0; b.vy = 0; b.spin = 0 })
          if (st.pendingPlace) {
            st.phase = 'placing'
            st.pendingPlace = false
            setPhase('placing')
          } else {
            st.phase = 'aim'
            setPhase('aim')
          }
        }
      }

      // ── Live table data for UI ──────────────────────────────────────────────
      const td = st.balls.filter(b => !b.pocketed).map((b, i) => ({
        id: i,
        color: b.color,
        isCue: b.isCue,
        x: b.x.toFixed(0),
        y: b.y.toFixed(0),
        vx: b.vx.toFixed(2),
        vy: b.vy.toFixed(2),
        speed: hypot(b.vx, b.vy).toFixed(2),
        momentum: (b.mass * hypot(b.vx, b.vy)).toFixed(2),
        spin: b.spin.toFixed(2),
        mass: b.mass,
        KE: (0.5 * b.mass * (b.vx**2 + b.vy**2)).toFixed(3),
      }))
      setTableData(td)
    }

    // ── Render ──────────────────────────────────────────────────────────────

    // Felt
    ctx.fillStyle = C.felt
    ctx.fillRect(0, 0, TW, TH)

    // Rail
    ctx.fillStyle = C.rail
    ctx.beginPath()
    ctx.rect(0, 0, TW, TH)
    ctx.rect(RAIL, RAIL, TW - RAIL*2, TH - RAIL*2)
    ctx.fill('evenodd')

    // Rail edge highlight
    ctx.fillStyle = C.railEdge
    ctx.fillRect(RAIL - 4, RAIL - 4, TW - (RAIL-4)*2, 4)
    ctx.fillRect(RAIL - 4, TH - RAIL, TW - (RAIL-4)*2, 4)
    ctx.fillRect(RAIL - 4, RAIL, 4, TH - RAIL*2)
    ctx.fillRect(TW - RAIL, RAIL, 4, TH - RAIL*2)

    // Felt lines (centre spot + baulk line)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 8])
    ctx.beginPath(); ctx.moveTo(TW/2, RAIL); ctx.lineTo(TW/2, TH-RAIL); ctx.stroke()
    ctx.setLineDash([])

    // Centre spot
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.beginPath(); ctx.arc(TW/2, TH/2, 4, 0, Math.PI*2); ctx.fill()

    // Pockets
    for (const p of POCKETS) {
      // Shadow glow
      ctx.shadowBlur = 12
      ctx.shadowColor = '#000'
      ctx.fillStyle = C.pocket
      ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI*2); ctx.fill()
      ctx.shadowBlur = 0
      // Pocket rim
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI*2); ctx.stroke()
    }

    // Trails
    if (overlays.trail) {
      for (const b of st.balls) {
        if (b.trail.length < 2 || b.pocketed) continue
        ctx.beginPath()
        ctx.moveTo(b.trail[0].x, b.trail[0].y)
        for (let i = 1; i < b.trail.length; i++) {
          const alpha = i / b.trail.length
          ctx.strokeStyle = `${b.color}${Math.round(alpha * 120).toString(16).padStart(2,'0')}`
          ctx.lineWidth = 1.5
          ctx.lineTo(b.trail[i].x, b.trail[i].y)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(b.trail[i].x, b.trail[i].y)
        }
      }
    }

    // ── Aim handle: always visible in aim phase ──────────────────────────
    const ah = st.aimHandle
    if (st.phase === 'aim') {
      const cue = st.balls.find(b => b.isCue && !b.pocketed)
      if (cue) {
        const capR = maxRadius()
        const safeDist = clamp(ah.dist, MIN_HANDLE_DIST, capR)
        const range = Math.max(capR - MIN_HANDLE_DIST, 1)
        const hx = cue.x + safeDist * Math.cos(ah.angle)
        const hy = cue.y + safeDist * Math.sin(ah.angle)
        const shotNx = -Math.cos(ah.angle)
        const shotNy = -Math.sin(ah.angle)
        const power  = clamp(((safeDist - MIN_HANDLE_DIST) / range) * 22, 0, 22)
        const pct    = power / 22
        const aimNx  = shotNx, aimNy = shotNy

        // ── Ghost ball contact predictor ──────────────────────────────────
        const otherBalls = st.balls.filter(b => !b.pocketed && !b.isCue)
        let closestTarget = null, closestT = Infinity
        for (const ob of otherBalls) {
          const ex = ob.x - cue.x, ey = ob.y - cue.y
          const proj = ex * aimNx + ey * aimNy
          if (proj < 0) continue
          const perp2 = (ex * ex + ey * ey) - proj * proj
          const sumR = cue.r + ob.r
          if (perp2 > sumR * sumR) continue
          const t = proj - Math.sqrt(sumR * sumR - perp2)
          if (t > 0 && t < closestT) { closestT = t; closestTarget = ob }
        }

        // ── Ghost ball (where cue contacts nearest target) ────────────────
        if (closestTarget) {
          const gx = cue.x + aimNx * closestT
          const gy = cue.y + aimNy * closestT

          // Hide aim overlays while stepping through collision snapshots
          if (collisionStepRef.current < 0) {

          // Aim guideline to ghost pos
          ctx.strokeStyle = 'rgba(255,255,255,0.3)'
          ctx.lineWidth = 1
          ctx.setLineDash([6, 5])
          ctx.beginPath()
          ctx.moveTo(cue.x, cue.y)
          ctx.lineTo(gx, gy)
          ctx.stroke()
          ctx.setLineDash([])

          // Ghost ball outline
          ctx.globalAlpha = 0.35
          ctx.fillStyle = cue.color
          ctx.beginPath(); ctx.arc(gx, gy, cue.r, 0, Math.PI * 2); ctx.fill()
          ctx.globalAlpha = 1
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.arc(gx, gy, cue.r, 0, Math.PI * 2); ctx.stroke()

          // Line of impact
          const licDx = closestTarget.x - gx, licDy = closestTarget.y - gy
          const licMag = hypot(licDx, licDy) || 1
          const licNx = licDx / licMag, licNy = licDy / licMag
          ctx.strokeStyle = 'rgba(168,139,250,0.7)'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.moveTo(gx - licNx * 20, gy - licNy * 20)
          ctx.lineTo(closestTarget.x + licNx * 20, closestTarget.y + licNy * 20)
          ctx.stroke()
          ctx.setLineDash([])

          // Angle label
          const impactAngleDeg = (Math.acos(clamp(aimNx * licNx + aimNy * licNy, -1, 1)) * 180 / Math.PI).toFixed(1)
          ctx.fillStyle = 'rgba(167,139,250,0.9)'
          ctx.font = 'bold 9px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(`θ=${impactAngleDeg}°`, gx, gy + cue.r + 14)

          // ── Impact decomposition vectors (aimVectors overlay) ─────────────
          if (overlays.aimVectors) {
            // Physics: elastic collision, compute post-collision velocities
            const mA = cue.r * cue.r   // use r² as proxy for mass (matches sim)
            const mB = closestTarget.r * closestTarget.r
            // cue incoming velocity components along normal and tangent
            const vAn = aimNx * power * licNx + aimNy * power * licNy  // along impact normal
            const vAt_x = aimNx * power - vAn * licNx                   // tangent component x
            const vAt_y = aimNy * power - vAn * licNy                   // tangent component y
            // target ball has velocity 0, so elastic normal transfer:
            const vAn_after = vAn * (mA - mB) / (mA + mB)
            const vBn_after = vAn * (2 * mA)  / (mA + mB)
            // post-collision velocities
            const vA_after_x = vAn_after * licNx + vAt_x
            const vA_after_y = vAn_after * licNy + vAt_y
            const vB_after_x = vBn_after * licNx
            const vB_after_y = vBn_after * licNy

            const VSCALE = 5  // world-units per speed unit for arrow length

            // ── Cue ball post-collision velocity (cyan) ───────────────────
            drawArrow(ctx, gx, gy, vA_after_x * VSCALE, vA_after_y * VSCALE, '#22d3ee', 2)
            // ── Target ball velocity (green) ──────────────────────────────
            drawArrow(ctx, closestTarget.x, closestTarget.y, vB_after_x * VSCALE, vB_after_y * VSCALE, '#4ade80', 2.5)

            // ── Normal & tangent component lines at contact ───────────────
            // Normal component of cue (red — energy transferred)
            drawArrow(ctx, gx, gy, vAn * licNx * VSCALE, vAn * licNy * VSCALE, '#f87171', 1.5)
            // Tangent component of cue (amber — passes through)
            drawArrow(ctx, gx, gy, vAt_x * VSCALE, vAt_y * VSCALE, '#fbbf24', 1.5)

            // ── KE budget ─────────────────────────────────────────────────
            // Scale: 1 speed unit = 1 inch/frame @60fps -> real v = speed*(60in/s)
            // KE in arbitrary units; we set 1 world-unit = 1 inch, 1 frame = 1/60s
            // v_real (in/s) = speed * 60 ; m_real (lbs) ≈ 0.4 (pool ball ~5.75oz)
            const BALL_MASS_LB = 0.359   // 5.75 oz pool ball
            const INCH_PER_WU  = 0.5     // 1 world unit = 0.5 inch (reasonable for 900wu wide table ~37.5in)
            const s_to_real    = INCH_PER_WU * 60  // world-units/frame → inches/sec
            const ke_in_lbft   = (v) => 0.5 * BALL_MASS_LB * (v * s_to_real / 12) ** 2  // ft·lbf
            const ke_in_J      = (lbft) => lbft * 1.35582                                  // J
            const ke_cue_before = ke_in_lbft(power)
            const vA_after_spd  = hypot(vA_after_x, vA_after_y)
            const vB_after_spd  = hypot(vB_after_x, vB_after_y)
            const ke_cue_after  = ke_in_lbft(vA_after_spd)
            const ke_tgt_after  = ke_in_lbft(vB_after_spd)
            const ke_transferred_pct = ke_cue_before > 0
              ? Math.round((ke_tgt_after / ke_cue_before) * 100) : 0

            // Draw KE info box near contact point
            const bx = gx + 18, by = gy - 60
            ctx.fillStyle = 'rgba(0,0,0,0.65)'
            ctx.beginPath(); ctx.roundRect(bx, by, 130, 72, 5); ctx.fill()
            ctx.fillStyle = '#4ade80'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left'
            ctx.fillText('IMPACT ENERGY', bx + 6, by + 13)
            ctx.fillStyle = '#fbbf24'
            ctx.fillText(`KE in:  ${ke_cue_before.toFixed(4)} ft·lbf`, bx + 6, by + 27)
            ctx.fillText(`        ${ke_in_J(ke_cue_before).toFixed(4)} J`, bx + 6, by + 38)
            ctx.fillStyle = '#4ade80'
            ctx.fillText(`→ tgt:  ${ke_transferred_pct}%  ${ke_tgt_after.toFixed(4)} J`, bx + 6, by + 51)
            ctx.fillStyle = '#22d3ee'
            ctx.fillText(`→ cue:  ${(100 - ke_transferred_pct)}%  ${ke_in_J(ke_cue_after).toFixed(4)} J`, bx + 6, by + 62)
          }
          } // end: hide aim overlays during snapshot browse
        }

        // ── Forward simulation — run exact physics engine on cloned state ──
        {
          // Clone all active balls (shallow position/velocity copy only)
          const simBalls = st.balls
            .filter(b => !b.pocketed)
            .map(b => ({
              x: b.x, y: b.y, vx: b.vx, vy: b.vy, spin: b.spin,
              mass: b.mass, r: b.r, isCue: b.isCue,
              color: b.color, ballNum: b.ballNum, pocketed: false,
              _trail: [{ x: b.x, y: b.y }],
            }))

          const snapshots = []
          const simCue = simBalls.find(b => b.isCue)
          if (simCue) {
            simCue.vx = aimNx * power
            simCue.vy = aimNy * power
            simCue.spin = (hitOffsetRef.current.dx * simCue.vy - hitOffsetRef.current.dy * simCue.vx) * 1.6

            const left = RAIL + BALL_R, right = TW - RAIL - BALL_R
            const top  = RAIL + BALL_R, bot   = TH  - RAIL - BALL_R
            const RECORD_EVERY = 4
            const MAX_STEPS = 600
            const litPockets = new Set()  // pocket indices that will be sunk into

            for (let step = 0; step < MAX_STEPS; step++) {
              for (const b of simBalls) {
                if (b.pocketed) continue
                b.x += b.vx; b.y += b.vy
                b.vx *= FRICTION_MUT; b.vy *= FRICTION_MUT
                b.spin *= SPIN_DECAY
                b.vx += b.spin * (-b.vy) * 0.0012
                b.vy += b.spin * (b.vx)  * 0.0012
                if (b.x < left)  { b.x = left;  b.vx =  Math.abs(b.vx) * RESTITUTION_MUT; b.spin *= -0.5 }
                if (b.x > right) { b.x = right; b.vx = -Math.abs(b.vx) * RESTITUTION_MUT; b.spin *= -0.5 }
                if (b.y < top)   { b.y = top;   b.vy =  Math.abs(b.vy) * RESTITUTION_MUT; b.spin *= -0.5 }
                if (b.y > bot)   { b.y = bot;   b.vy = -Math.abs(b.vy) * RESTITUTION_MUT; b.spin *= -0.5 }
                for (let pi = 0; pi < POCKETS.length; pi++) {
                  const p = POCKETS[pi]
                  if (hypot(b.x - p.x, b.y - p.y) < POCKET_R + 2) {
                    // record final trail point at pocket centre
                    b._trail.push({ x: p.x, y: p.y })
                    b._pocketIdx = pi
                    b.pocketed = true
                    litPockets.add(pi)
                    break
                  }
                }
              }
              const active = simBalls.filter(b => !b.pocketed)
              for (let i = 0; i < active.length; i++) {
                for (let j = i + 1; j < active.length; j++) {
                  const a = active[i], b = active[j]
                  const dx = b.x - a.x, dy = b.y - a.y
                  const dist = hypot(dx, dy)
                  if (dist === 0 || dist > a.r + b.r) continue
                  const nx = dx / dist, ny = dy / dist
                  const rvx = b.vx - a.vx, rvy = b.vy - a.vy
                  const velN = rvx * nx + rvy * ny
                  if (velN > 0) continue
                  const aPreVx = a.vx, aPreVy = a.vy
                  const bPreVx = b.vx, bPreVy = b.vy
                  const imp = (2 * velN) / (1 / a.mass + 1 / b.mass)
                  a.vx += (imp * nx) / a.mass; a.vy += (imp * ny) / a.mass
                  b.vx -= (imp * nx) / b.mass; b.vy -= (imp * ny) / b.mass
                  // Spin transfer (match real physics)
                  const spinEffect = (a.spin - b.spin) * 0.3
                  const tx = -ny, ty = nx
                  a.vx += spinEffect * tx * 0.25 / a.mass; a.vy += spinEffect * ty * 0.25 / a.mass
                  b.vx -= spinEffect * tx * 0.25 / b.mass; b.vy -= spinEffect * ty * 0.25 / b.mass
                  const ov = a.r + b.r - dist + 0.5
                  a.x -= ov * nx * 0.5; a.y -= ov * ny * 0.5
                  b.x += ov * nx * 0.5; b.y += ov * ny * 0.5
                  if (snapshots.length < 80) {
                    const aIdx = simBalls.indexOf(a), bIdx = simBalls.indexOf(b)
                    // Skip if this exact pair collided last step (overlap correction jitter)
                    const last = snapshots[snapshots.length - 1]
                    if (!last || last.step < step - 2 || last.aIdx !== aIdx || last.bIdx !== bIdx) {
                      snapshots.push({
                        step, nx, ny, aIdx, bIdx,
                        allBalls: simBalls.map(bb => ({ x: bb.x, y: bb.y, vx: bb.vx, vy: bb.vy, r: bb.r, color: bb.color, isCue: bb.isCue, ballNum: bb.ballNum, mass: bb.mass, pocketed: bb.pocketed })),
                        aPre: { vx: aPreVx, vy: aPreVy }, aPost: { vx: a.vx, vy: a.vy },
                        bPre: { vx: bPreVx, vy: bPreVy }, bPost: { vx: b.vx, vy: b.vy },
                      })
                    }
                  }
                }
              }
              if (step % RECORD_EVERY === 0) {
                for (const b of simBalls) {
                  if (!b.pocketed) b._trail.push({ x: b.x, y: b.y })
                }
              }
              if (active.every(b => hypot(b.vx, b.vy) < SLEEP_THRESH)) break
            }

            // Pocket glow for balls that will be sunk
            for (const pi of litPockets) {
              const p = POCKETS[pi]
              const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, POCKET_R * 2.2)
              grad.addColorStop(0, 'rgba(74,222,128,0.7)')
              grad.addColorStop(0.5, 'rgba(74,222,128,0.25)')
              grad.addColorStop(1, 'rgba(74,222,128,0)')
              ctx.fillStyle = grad
              ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_R * 2.2, 0, Math.PI * 2); ctx.fill()
            }

            // Draw predicted paths + ghost balls (hidden during snapshot browse)
            if (collisionStepRef.current < 0) {
            const ballColors = [
              [251, 191, 36],  // cue — amber
              [45, 212, 191],  // others — teal
            ]
            for (const b of simBalls) {
              if (b._trail.length < 2) continue
              const [r, g, bl] = b.isCue ? ballColors[0] : ballColors[1]
              ctx.lineWidth = 1.5
              for (let i = 1; i < b._trail.length; i++) {
                const alpha = (i / b._trail.length) * 0.7
                ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha})`
                ctx.beginPath()
                ctx.moveTo(b._trail[i - 1].x, b._trail[i - 1].y)
                ctx.lineTo(b._trail[i].x, b._trail[i].y)
                ctx.stroke()
              }
              // Ghost ball or pocket-sink indicator
              const last = b._trail[b._trail.length - 1]
              if (!b.pocketed) {
                // ghost ball ring
                ctx.globalAlpha = 0.3
                ctx.strokeStyle = `rgb(${r},${g},${bl})`
                ctx.lineWidth = 1.5
                ctx.beginPath(); ctx.arc(last.x, last.y, b.r, 0, Math.PI * 2); ctx.stroke()
                ctx.globalAlpha = 1
                // ball number label
                if (b.ballNum != null || b.isCue) {
                  ctx.globalAlpha = 0.55
                  ctx.fillStyle = `rgb(${r},${g},${bl})`
                  ctx.font = 'bold 9px monospace'
                  ctx.textAlign = 'center'
                  ctx.textBaseline = 'middle'
                  ctx.fillText(b.isCue ? 'Q' : String(b.ballNum), last.x, last.y)
                  ctx.globalAlpha = 1
                }
              }
            }
            } // end: hide sim trails during snapshot browse
            simSnapshotsRef.current = snapshots
          }
        }

        // ── Collision snapshot overlay (when browsing steps) ─────────────────
        if (overlays.aimVectors && collisionStepRef.current >= 0 && simSnapshotsRef.current.length > 0) {
          const snapIdx = Math.min(collisionStepRef.current, simSnapshotsRef.current.length - 1)
          const snap = simSnapshotsRef.current[snapIdx]
          if (snap) {
            drawnVectorsRef.current = []
            const VSCALE = 12
            const BALL_MASS_LB = 0.359, INCH_PER_WU = 0.5, s_to_real = INCH_PER_WU * 60
            const ke_J    = v => 0.5 * BALL_MASS_LB * (v * s_to_real / 12) ** 2 * 1.35582
            const ke_ftlb = v => 0.5 * BALL_MASS_LB * (v * s_to_real / 12) ** 2
            // All balls at snapshot positions
            for (const b of snap.allBalls) {
              if (b.pocketed) continue
              ctx.globalAlpha = 0.55
              ctx.fillStyle = b.color
              ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill()
              ctx.globalAlpha = 1
              ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5
              ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke()
            }
            const bA = snap.allBalls[snap.aIdx], bB = snap.allBalls[snap.bIdx]
            // Highlight colliding pair
            ;[bA, bB].forEach(b => {
              ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5
              ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 5, 0, Math.PI * 2); ctx.stroke()
            })
            // Contact dashed line
            ctx.strokeStyle = 'rgba(251,191,36,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4])
            ctx.beginPath(); ctx.moveTo(bA.x, bA.y); ctx.lineTo(bB.x, bB.y); ctx.stroke()
            ctx.setLineDash([])
            // Draw vector + X/Y components + register for click
            const drawVec = (ox, oy, vx, vy, color, ballLabel, ph) => {
              const spd = hypot(vx, vy)
              if (spd < 0.001) return
              const ex = ox + vx * VSCALE, ey = oy + vy * VSCALE
              ctx.strokeStyle = 'rgba(96,165,250,0.5)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5])
              ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ex, oy); ctx.stroke()
              ctx.strokeStyle = 'rgba(167,139,250,0.5)'
              ctx.beginPath(); ctx.moveTo(ex, oy); ctx.lineTo(ex, ey); ctx.stroke()
              ctx.setLineDash([])
              drawArrow(ctx, ox, oy, vx * VSCALE, vy * VSCALE, color, 2.5)
              drawnVectorsRef.current.push({ ex, ey, ox, oy, color, data: {
                ball: ballLabel, phase: ph,
                vx: vx.toFixed(4), vy: vy.toFixed(4), spd: spd.toFixed(4),
                angle_deg: ((Math.atan2(vy, vx) * 180 / Math.PI + 360) % 360).toFixed(1),
                ke_J: ke_J(spd).toFixed(5), ke_ftlb: ke_ftlb(spd).toFixed(5),
                momentum: (BALL_MASS_LB * spd).toFixed(5),
              }})
            }
            const aLabel = bA.isCue ? 'Cue' : `Ball ${bA.ballNum}`
            const bLabel = bB.isCue ? 'Cue' : `Ball ${bB.ballNum}`
            drawVec(bA.x, bA.y, snap.aPre.vx, snap.aPre.vy, 'rgba(156,163,175,0.55)', aLabel, 'before')
            drawVec(bA.x, bA.y, snap.aPost.vx, snap.aPost.vy, '#22d3ee', aLabel, 'after')
            drawVec(bB.x, bB.y, snap.bPre.vx, snap.bPre.vy, 'rgba(156,163,175,0.55)', bLabel, 'before')
            drawVec(bB.x, bB.y, snap.bPost.vx, snap.bPost.vy, '#4ade80', bLabel, 'after')
            // KE budget badge
            const keIn  = ke_J(hypot(snap.aPre.vx, snap.aPre.vy)) + ke_J(hypot(snap.bPre.vx, snap.bPre.vy))
            const keOut = ke_J(hypot(snap.aPost.vx, snap.aPost.vy)) + ke_J(hypot(snap.bPost.vx, snap.bPost.vy))
            const keLostPct = keIn > 0 ? Math.round((1 - keOut / keIn) * 100) : 0
            const mx = (bA.x + bB.x) / 2, my = Math.min(bA.y, bB.y) - 28
            ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.beginPath(); ctx.roundRect(mx - 84, my - 12, 168, 24, 4); ctx.fill()
            ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'
            ctx.fillText(`Collision ${snapIdx + 1}/${simSnapshotsRef.current.length}  \u2502  \u0394KE ${keLostPct}% lost  \u2502  click arrow tip`, mx, my + 2)
            ctx.textAlign = 'left'
          }
        }

        // ── Aim ring: amber circle capped to always fit on screen ──────────
        // Ghost ring at max allowed radius
        ctx.strokeStyle = 'rgba(251,191,36,0.12)'
        ctx.lineWidth = 2; ctx.setLineDash([])
        ctx.beginPath(); ctx.arc(cue.x, cue.y, capR, 0, Math.PI * 2); ctx.stroke()
        // Main ring at current radius (brightness = power)
        ctx.strokeStyle = `rgba(251,191,36,${0.4 + pct * 0.55})`
        ctx.lineWidth = 5
        ctx.beginPath(); ctx.arc(cue.x, cue.y, safeDist, 0, Math.PI * 2); ctx.stroke()

        // ── Cue-stick line: handle → through ball → forward aim ──────────
        ctx.strokeStyle = 'rgba(200,180,120,0.22)'
        ctx.lineWidth = 1.5; ctx.setLineDash([10, 6])
        ctx.beginPath()
        ctx.moveTo(hx, hy)
        ctx.lineTo(cue.x + shotNx * 230, cue.y + shotNy * 230)
        ctx.stroke(); ctx.setLineDash([])

        // ── Force vector arrow (green→red with power) ─────────────────────
        const arrowLen = 14 + pct * 58
        drawArrow(ctx, cue.x, cue.y, shotNx * arrowLen, shotNy * arrowLen,
          `hsl(${Math.round(120 - pct * 120)},100%,60%)`, 2.5)

        // ── Power bar ─────────────────────────────────────────────────────
        const barW = 64, barH = 7
        const bxb = cue.x - barW / 2, byb = cue.y - cue.r - 24
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(bxb, byb, barW, barH)
        const barGrad = ctx.createLinearGradient(bxb, byb, bxb + barW, byb)
        barGrad.addColorStop(0, '#4ade80')
        barGrad.addColorStop(0.5, '#fbbf24')
        barGrad.addColorStop(1, '#f87171')
        ctx.fillStyle = barGrad
        ctx.fillRect(bxb, byb, barW * pct, barH)
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'
        ctx.lineWidth = 1; ctx.strokeRect(bxb, byb, barW, barH)

        // ── Angle + power label ────────────────────────────────────────────
        const shotDeg = ((Math.atan2(-shotNy, shotNx) * 180 / Math.PI) + 360) % 360
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'
        ctx.fillText(`${shotDeg.toFixed(1)}°   ${(pct * 100).toFixed(0)}%`, cue.x, byb - 4)

        // ── Handle knob: big solid circle on the ring ──────────────────────
        const handleR2 = 20
        ctx.shadowBlur = ah.dragging ? 22 : 12; ctx.shadowColor = '#fbbf24'
        ctx.fillStyle = ah.dragging ? '#fbbf24' : 'rgba(251,191,36,0.82)'
        ctx.beginPath(); ctx.arc(hx, hy, handleR2, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(hx, hy, handleR2, 0, Math.PI * 2); ctx.stroke()

        // Reset textBaseline for subsequent draws
        ctx.textBaseline = 'alphabetic'
      }
    }

    // Balls — hidden while browsing collision snapshots
    const hideBalls = st.phase === 'aim' && collisionStepRef.current >= 0
    for (const b of st.balls) {
      if (b.pocketed) continue
      if (hideBalls) continue
      const isFollowed = followed !== null && st.balls[followed] === b

      // Shadow
      ctx.shadowBlur = isFollowed ? 20 : 10
      ctx.shadowColor = b.isCue ? 'rgba(255,255,255,0.5)' : b.color
      ctx.fillStyle = b.color
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // Shine
      const shine = ctx.createRadialGradient(b.x - b.r*0.3, b.y - b.r*0.35, 0, b.x, b.y, b.r)
      shine.addColorStop(0, 'rgba(255,255,255,0.35)')
      shine.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = shine
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.fill()

      // Outline
      ctx.strokeStyle = isFollowed ? C.amber : 'rgba(0,0,0,0.4)'
      ctx.lineWidth = isFollowed ? 2.5 : 1.5
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
      ctx.stroke()

      // Label inside ball — number in free play, mass in challenges
      ctx.fillStyle = b.isCue ? '#333' : (b.colorIdx === 8 ? '#aaa' : '#fff')
      ctx.font = `bold ${b.ballNum !== null ? 10 : 9}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (!b.isCue) {
        const label = b.ballNum !== null ? String(b.ballNum) : b.mass.toFixed(1) + 'x'
        ctx.fillText(label, b.x, b.y + 1)
      }

      // Hit contact dot on cue ball (when at rest)
      if (b.isCue && st.phase === 'aim') {
        const ho = hitOffsetRef.current
        if (Math.abs(ho.dx) > 0.02 || Math.abs(ho.dy) > 0.02) {
          ctx.fillStyle = '#ef4444'
          ctx.beginPath()
          ctx.arc(b.x + ho.dx * b.r * 0.7, b.y + ho.dy * b.r * 0.7, 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      const speed = hypot(b.vx, b.vy)

      // Velocity vector
      if (overlays.vectors && speed > SLEEP_THRESH * 2) {
        const scale = 4.5
        drawArrow(ctx, b.x, b.y, b.vx * scale, b.vy * scale, C.blue, 2)
      }

      // Momentum vector (thicker, different colour)
      if (overlays.momentum && speed > SLEEP_THRESH * 2) {
        const scale = 3
        const px = b.vx * b.mass * scale
        const py = b.vy * b.mass * scale
        drawArrow(ctx, b.x, b.y, px, py, C.purple, 1.5)
      }

      // Spin indicator arc
      if (overlays.spin && Math.abs(b.spin) > 0.05) {
        const spinAmt = clamp(b.spin * 0.8, -b.r, b.r)
        ctx.strokeStyle = spinAmt > 0 ? C.teal : C.amber
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r + 4, -Math.PI/2, -Math.PI/2 + spinAmt)
        ctx.stroke()
      }

      // Force (friction) vector
      if (overlays.forces && speed > SLEEP_THRESH * 2) {
        const frix = -b.vx * (1 - FRICTION_MUT) * 25
        const friy = -b.vy * (1 - FRICTION_MUT) * 25
        drawArrow(ctx, b.x, b.y, frix, friy, '#f87171', 1.5)
      }
    }

    // ── Collision flashes (line of impact + tangent lines + impact pop-up) ──
    // Only shown in slow-mo so they don't clutter full-speed play
    const now = Date.now()
    if (!st.flashes) st.flashes = []
    st.flashes = st.flashes.filter(f => now - f.time < 2500)
    for (const f of slowMoRef.current ? st.flashes : []) {
      const age = (now - f.time) / 700
      const alpha = Math.max(0, 1 - age)
      const len = 55
      // Line of impact (along normal)
      ctx.strokeStyle = `rgba(168,139,250,${alpha * 0.9})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(f.ax - f.nx * len, f.ay - f.ny * len)
      ctx.lineTo(f.ax + f.nx * len, f.ay + f.ny * len)
      ctx.stroke()
      // Tangent line
      ctx.strokeStyle = `rgba(45,212,191,${alpha * 0.7})`
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(f.ax - f.ny * len, f.ay + f.nx * len)
      ctx.lineTo(f.ax + f.ny * len, f.ay - f.nx * len)
      ctx.stroke()
      ctx.setLineDash([])
      // Impact dot
      ctx.fillStyle = `rgba(251,191,36,${alpha})`
      ctx.beginPath()
      ctx.arc(f.ax, f.ay, 3, 0, Math.PI * 2)
      ctx.fill()

      // ── Impact pop-up card (visible for 2.5s, only in slow-mo) ─────────
      if (f.popupData && now - f.time < 2500 && overlays.labels) {
        const popAlpha = Math.max(0, 1 - (now - f.time) / 2500)
        const pd = f.popupData
        const bx = f.ax + 14, by = f.ay - 58
        const bw = 120, bh = 58
        // Card background
        ctx.fillStyle = `rgba(15,23,42,${popAlpha * 0.92})`
        ctx.strokeStyle = `rgba(168,139,250,${popAlpha * 0.6})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 5) : ctx.rect(bx, by, bw, bh)
        ctx.fill()
        ctx.stroke()

        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'

        // Title
        ctx.fillStyle = `rgba(168,139,250,${popAlpha})`
        ctx.font = 'bold 8px monospace'
        ctx.fillText('IMPACT', bx + 6, by + 5)

        // Impulse J = Δp
        ctx.fillStyle = `rgba(56,189,248,${popAlpha})`
        ctx.font = '8px monospace'
        ctx.fillText(`J = ${pd.impulse}  (Δp)`, bx + 6, by + 17)

        // KE transfer
        const keColor = pd.keTransferPct > 70 ? '#4ade80' : pd.keTransferPct > 40 ? '#fbbf24' : '#f87171'
        ctx.fillStyle = `rgba(${keColor === '#4ade80' ? '74,222,128' : keColor === '#fbbf24' ? '251,191,36' : '248,113,113'},${popAlpha})`
        ctx.font = '8px monospace'
        ctx.fillText(`KE xfer: ${pd.keTransferPct}%`, bx + 6, by + 29)

        // Angle
        ctx.fillStyle = `rgba(167,139,250,${popAlpha})`
        ctx.fillText(`θ = ${pd.angle}°`, bx + 6, by + 41)
      }
    }

    // "Following" label — now shows live velocity readout
    if (followed !== null && st.balls[followed] && !st.balls[followed].pocketed) {
      const b = st.balls[followed]
      const speed = hypot(b.vx, b.vy)
      ctx.fillStyle = C.amber
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(`v=${speed.toFixed(2)}  p=${(b.mass*speed).toFixed(2)}`, b.x, b.y + b.r + 4)
    }

    // ── Floating velocity labels on all moving balls ────────────────────────
    if (overlays.labels && slowMoRef.current) {
      for (const b of active) {
        const speed = hypot(b.vx, b.vy)
        if (speed < SLEEP_THRESH * 3) continue
        ctx.fillStyle = 'rgba(56,189,248,0.92)'
        ctx.font = '8px monospace'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(`v=${speed.toFixed(1)}`, b.x + b.r + 3, b.y - 5)
        ctx.fillStyle = 'rgba(167,139,250,0.85)'
        ctx.fillText(`p=${(b.mass * speed).toFixed(1)}`, b.x + b.r + 3, b.y + 5)
      }
    }

    // Kitchen line (cue ball placement zone)
    const isPlacing = st.phase === 'placing'
    if (isPlacing) {
      // shade invalid zone (right of kitchen line)
      ctx.fillStyle = 'rgba(239,68,68,0.07)'
      ctx.fillRect(KITCHEN_X, RAIL, TW - RAIL - KITCHEN_X, TH - RAIL * 2)
      // shade valid zone
      ctx.fillStyle = 'rgba(74,222,128,0.05)'
      ctx.fillRect(RAIL, RAIL, KITCHEN_X - RAIL, TH - RAIL * 2)
    }
    ctx.strokeStyle = isPlacing ? 'rgba(74,222,128,0.6)' : 'rgba(255,255,255,0.08)'
    ctx.lineWidth = isPlacing ? 2 : 1
    ctx.setLineDash([6, 8])
    ctx.beginPath()
    ctx.moveTo(KITCHEN_X, RAIL)
    ctx.lineTo(KITCHEN_X, TH - RAIL)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = isPlacing ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.06)'
    ctx.font = isPlacing ? 'bold 9px monospace' : '8px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('KITCHEN', KITCHEN_X, RAIL + 10)
    if (isPlacing) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.font = '10px monospace'
      ctx.fillText('Click to place the cue ball', KITCHEN_X / 2 + RAIL / 2, TH / 2 - 14)
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    animRef.current = requestAnimationFrame(loop)
  }, [overlays, followed])

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    resizeCanvas()
    const obs = new ResizeObserver(resizeCanvas)
    if (canvasRef.current?.parentElement) obs.observe(canvasRef.current.parentElement)
    return () => obs.disconnect()
  }, [resizeCanvas])

  useEffect(() => {
    initState(levelIdx, mode)
  }, [levelIdx, mode])

  useEffect(() => {
    animRef.current = requestAnimationFrame(loop)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [loop])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') handleCancelDrag()
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); handleShoot() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleCancelDrag, handleShoot])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e) => { e.preventDefault(); handleWheel(e) }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [handleWheel])

  // ── Hit position picker ───────────────────────────────────────────────────
  const hitPickerRef = useRef(null)
  const handleHitPick = useCallback((e) => {
    const el = hitPickerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.width / 2, cy = rect.height / 2
    let dx = (e.clientX - rect.left - cx) / (cx * 0.85)
    let dy = (e.clientY - rect.top - cy) / (cy * 0.85)
    const mag = hypot(dx, dy)
    if (mag > 1) { dx /= mag; dy /= mag }
    const v = { dx, dy }
    hitOffsetRef.current = v
    setHitOffset(v)
  }, [])

  const resetHit = useCallback(() => {
    const v = { dx: 0, dy: 0 }
    hitOffsetRef.current = v
    setHitOffset(v)
  }, [])

  // ── Spin label ────────────────────────────────────────────────────────────
  function spinLabel(dx, dy) {
    if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) return 'Center · No spin'
    if (dy < -0.45) return 'Top spin ↑'
    if (dy >  0.45) return 'Back spin ↓'
    if (dx < -0.35) return 'Left English ←'
    if (dx >  0.35) return 'Right English →'
    return 'Off-center'
  }

  // ── Overlay toggle ────────────────────────────────────────────────────────
  const toggleOverlay = useCallback((key) => {
    setOverlays(o => ({ ...o, [key]: !o[key] }))
  }, [])

  // ══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════
  const currentLevel = LEVELS[levelIdx % LEVELS.length]

  return (
    <div className="fixed inset-0 z-[1700] flex flex-col" style={{ background: C.bg, fontFamily: 'Inter, sans-serif' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 shrink-0" style={{ background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        {/* Title */}
        <div className="flex items-center gap-2 mr-auto">
          <span className="text-xl">🎱</span>
          <span className="font-bold text-sm" style={{ color: C.text }}>Physics Pool Lab</span>
          {phase === 'rolling' && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(74,222,128,0.15)', color: C.green, border: `1px solid ${C.green}` }}>
              ROLLING
            </span>
          )}
          {phase === 'aim' && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(56,189,248,0.15)', color: C.blue, border: `1px solid ${C.blue}` }}>
              AIM · Shots: {shots}
            </span>
          )}
          {phase === 'placing' && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(74,222,128,0.15)', color: C.green, border: `1px solid ${C.green}` }}>
              PLACE CUE BALL
            </span>
          )}
        </div>

        {/* Mode selector */}
        <div className="flex gap-1">
          {['freeplay', 'challenge'].map(m => (
            <button key={m} onClick={() => { setMode(m); setLevelIdx(0) }}
              className="px-3 py-1 text-xs font-medium rounded transition-all"
              style={{
                background: mode === m ? C.amber : 'transparent',
                color: mode === m ? '#000' : C.muted,
                border: `1px solid ${mode === m ? C.amber : C.border}`,
              }}>
              {m === 'freeplay' ? '🎮 Free Play' : '🧩 Challenges'}
            </button>
          ))}
        </div>

        {/* Challenge level nav */}
        {mode === 'challenge' && (
          <div className="flex items-center gap-1">
            <button onClick={() => setLevelIdx(i => Math.max(0, i - 1))}
              className="px-2 py-1 text-xs rounded" style={{ background: C.border, color: C.text }}>‹</button>
            <span className="text-xs px-2" style={{ color: C.muted }}>Level {levelIdx + 1}/{LEVELS.length}</span>
            <button onClick={() => setLevelIdx(i => Math.min(LEVELS.length - 1, i + 1))}
              className="px-2 py-1 text-xs rounded" style={{ background: C.border, color: C.text }}>›</button>
          </div>
        )}

        {/* Slow-mo */}
        <button onClick={() => { const v = !slowMo; setSlowMo(v); slowMoRef.current = v; if (v) setOverlays(o => ({ ...o, trail: true })) }}
          className="px-3 py-1 text-xs font-medium rounded"
          style={{ background: slowMo ? 'rgba(56,189,248,0.2)' : 'rgba(56,189,248,0.08)', color: slowMo ? '#38bdf8' : C.muted, border: `1px solid ${slowMo ? '#38bdf8' : C.border}` }}>
          🐢 {slowMo ? 'SLOW' : 'Speed'}
        </button>

        {/* Reset */}
        <button onClick={() => { initState(levelIdx, mode); simSnapshotsRef.current = []; setCollisionStep(-1); collisionStepRef.current = -1; setSelectedVector(null) }}
          className="px-3 py-1 text-xs font-medium rounded"
          style={{ background: 'rgba(248,113,113,0.15)', color: C.red, border: `1px solid ${C.red}` }}>
          ↺ Reset
        </button>

        {/* Close */}
        <button onClick={onClose}
          className="px-3 py-1 text-xs font-medium rounded"
          style={{ background: 'rgba(148,163,184,0.15)', color: C.muted, border: `1px solid ${C.border}` }}>
          ✕ Close
        </button>
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Canvas area ───────────────────────────────────────────────────── */}
        <div className="flex-1 relative flex items-center justify-center min-w-0" style={{ background: C.bg }}>

          {/* Aim hint */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
            style={{ color: 'rgba(148,163,184,0.55)', fontSize: 11, fontFamily: 'monospace', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {phase === 'aim' && 'Drag the ring to aim · in/out = power'}
          </div>

          {/* SHOOT button — always visible in aim phase */}
          {phase === 'aim' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
              <button
                onClick={handleShoot}
                className="px-5 py-2 rounded-lg font-bold text-sm transition-all active:scale-95"
                style={{ background: 'rgba(251,191,36,0.92)', color: '#000', boxShadow: '0 0 18px rgba(251,191,36,0.45)', border: '1px solid #fef3c7', letterSpacing: '0.05em' }}
              >
                🎱 SHOOT
              </button>
              <span style={{ color: 'rgba(148,163,184,0.6)', fontSize: 10, fontFamily: 'monospace' }}>Space · Enter · Double-click</span>
            </div>
          )}

          {/* Challenge goal banner */}
          {mode === 'challenge' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full text-xs font-medium text-center pointer-events-none"
              style={{ background: 'rgba(0,0,0,0.6)', color: C.amber, border: `1px solid rgba(251,191,36,0.3)`, backdropFilter: 'blur(4px)' }}>
              {currentLevel.name} · {currentLevel.goal}
            </div>
          )}

          {/* Collision step browser — show whenever snapshots exist */}
          {simSnapshotsRef.current.length > 0 && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(251,191,36,0.45)', fontFamily: 'monospace' }}>
              <span style={{ color: '#fbbf24', fontSize: 11 }}>
                {collisionStep < 0 ? '\ud83d\udd0d Collisions' : `${collisionStep + 1} / ${simSnapshotsRef.current.length}`}
              </span>
              {collisionStep >= 0 && (
                <button onClick={() => { const s = collisionStep - 1; setCollisionStep(s); collisionStepRef.current = s; setSelectedVector(null) }}
                  className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(251,191,36,0.18)', color: '#fbbf24', cursor: 'pointer' }}>\u2190</button>
              )}
              <button onClick={() => {
                const total = simSnapshotsRef.current.length
                if (total === 0) return
                if (collisionStep < 0) { setCollisionStep(0); collisionStepRef.current = 0 }
                else if (collisionStep < total - 1) { const s = collisionStep + 1; setCollisionStep(s); collisionStepRef.current = s }
                else { setCollisionStep(-1); collisionStepRef.current = -1; setSelectedVector(null) }
              }} className="px-2 py-0.5 rounded text-xs"
                style={{ background: 'rgba(251,191,36,0.18)', color: '#fbbf24', cursor: 'pointer' }}>
                {collisionStep < 0 ? '\u25b6' : collisionStep < simSnapshotsRef.current.length - 1 ? '\u2192' : '\u2715'}
              </button>
            </div>
          )}

          {/* Selected vector popup */}
          {selectedVector && (
            <div className="absolute right-4 top-20 z-30 p-3 rounded-lg"
              style={{ background: 'rgba(8,12,22,0.96)', border: `2px solid ${selectedVector.color}`, fontFamily: 'monospace', fontSize: 11, color: '#e2e8f0', minWidth: 190 }}>
              <div style={{ color: selectedVector.color, fontWeight: 'bold', marginBottom: 6, fontSize: 12 }}>
                {selectedVector.data.ball} \u2014 {selectedVector.data.phase}
              </div>
              <div style={{ color: '#94a3b8', lineHeight: 1.8 }}>
                <div>vx &nbsp;= <span style={{ color: '#60a5fa' }}>{selectedVector.data.vx}</span></div>
                <div>vy &nbsp;= <span style={{ color: '#a78bfa' }}>{selectedVector.data.vy}</span></div>
                <div>|v| = <span style={{ color: '#e2e8f0' }}>{selectedVector.data.spd}</span></div>
                <div>\u03b8 &nbsp;&nbsp;= <span style={{ color: '#fbbf24' }}>{selectedVector.data.angle_deg}\u00b0</span></div>
                <div style={{ marginTop: 6 }}>KE &nbsp;= <span style={{ color: '#4ade80' }}>{selectedVector.data.ke_J} J</span></div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= <span style={{ color: '#4ade80' }}>{selectedVector.data.ke_ftlb} ft\u00b7lbf</span></div>
                <div>p &nbsp;&nbsp;&nbsp;= <span style={{ color: '#c084fc' }}>{selectedVector.data.momentum} lb\u00b7wu/f</span></div>
              </div>
              <button onClick={() => setSelectedVector(null)}
                style={{ marginTop: 8, color: '#64748b', fontSize: 10, cursor: 'pointer', background: 'none', border: 'none' }}>\u2715 close</button>
            </div>
          )}

          {/* Vector legend */}
          <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
            {overlays.vectors   && <div className="flex items-center gap-1.5 text-xs" style={{ color: C.blue }}>   <span style={{ display:'inline-block',width:24,height:2,background:C.blue   }} /> velocity</div>}
            {overlays.momentum  && <div className="flex items-center gap-1.5 text-xs" style={{ color: C.purple }}> <span style={{ display:'inline-block',width:24,height:2,background:C.purple }} /> momentum (p=mv)</div>}
            {overlays.forces    && <div className="flex items-center gap-1.5 text-xs" style={{ color: C.red }}>    <span style={{ display:'inline-block',width:24,height:2,background:C.red    }} /> friction force</div>}
            {overlays.spin      && <div className="flex items-center gap-1.5 text-xs" style={{ color: C.teal }}>   <span style={{ display:'inline-block',width:24,height:2,background:C.teal   }} /> spin/English</div>}
          </div>

          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onTouchStart={e => handleMouseDown(e.touches[0])}
            onTouchMove={e => { e.preventDefault(); handleMouseMove(e.touches[0]) }}
            onTouchEnd={handleMouseUp}
            onContextMenu={e => { e.preventDefault(); handleCancelDrag() }}
            className="cursor-crosshair rounded-lg shadow-2xl"
            style={{ display: 'block', userSelect: 'none', touchAction: 'none' }}
          />
        </div>

        {/* ── Right Panel ───────────────────────────────────────────────────── */}
        <div className="flex flex-col shrink-0 overflow-hidden" style={{ width: 280, borderLeft: `1px solid ${C.border}`, background: C.surface }}>

          {/* Panel tabs */}
          <div className="flex shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
            {[
              { key: 'hit',  label: '🎯 Hit Pos' },
              { key: 'data', label: '📊 Physics' },
              { key: 'log',  label: '📋 Events' },
              { key: 'help', label: '❓ Legend' },
            ].map(t => (
              <button key={t.key} onClick={() => setPanel(t.key)}
                className="flex-1 py-2 text-xs font-medium transition-colors"
                style={{
                  background: panel === t.key ? 'rgba(56,189,248,0.1)' : 'transparent',
                  color: panel === t.key ? C.blue : C.hint,
                  borderBottom: panel === t.key ? `2px solid ${C.blue}` : '2px solid transparent',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Hit Position Panel ──────────────────────────────────── */}
          {panel === 'hit' && (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              <div className="text-xs font-medium" style={{ color: C.text }}>Cue Ball Contact Point</div>
              <div className="text-xs" style={{ color: C.muted }}>
                Click or drag inside the circle to set where the cue tip strikes. Off-center creates English (spin).
              </div>

              {/* Hit picker circle */}
              <div className="mx-auto relative select-none"
                style={{ width: 160, height: 160 }}
                ref={hitPickerRef}
                onMouseDown={handleHitPick}
                onMouseMove={e => { if (e.buttons === 1) handleHitPick(e) }}
                onClick={handleHitPick}>
                {/* Circle outline */}
                <svg width="160" height="160" viewBox="0 0 160 160" className="absolute inset-0">
                  {/* Outer ring */}
                  <circle cx="80" cy="80" r="75" fill={C.bg} stroke={C.border} strokeWidth="2" />
                  {/* Grid lines */}
                  <line x1="80" y1="5" x2="80" y2="155" stroke={C.border} strokeWidth="0.5" strokeDasharray="3 4" />
                  <line x1="5" y1="80" x2="155" y2="80" stroke={C.border} strokeWidth="0.5" strokeDasharray="3 4" />
                  {/* Zone rings */}
                  <circle cx="80" cy="80" r="35" fill="none" stroke={C.border} strokeWidth="0.5" />
                  <circle cx="80" cy="80" r="65" fill="none" stroke={C.border} strokeWidth="0.5" />
                  {/* Labels */}
                  <text x="80" y="14" textAnchor="middle" fill={C.hint} fontSize="8">TOP</text>
                  <text x="80" y="153" textAnchor="middle" fill={C.hint} fontSize="8">BOTTOM</text>
                  <text x="8" y="83" textAnchor="start" fill={C.hint} fontSize="8">L</text>
                  <text x="148" y="83" textAnchor="end" fill={C.hint} fontSize="8">R</text>
                </svg>
                {/* Hit dot */}
                <div className="absolute pointer-events-none rounded-full transition-all"
                  style={{
                    width: 14, height: 14,
                    background: C.red,
                    border: '2px solid #fff',
                    boxShadow: `0 0 10px ${C.red}`,
                    left: 80 + hitOffset.dx * 63 - 7,
                    top:  80 + hitOffset.dy * 63 - 7,
                  }} />
              </div>

              {/* Spin label */}
              <div className="text-center text-xs font-medium rounded py-1.5"
                style={{ background: 'rgba(45,212,191,0.1)', color: C.teal, border: `1px solid rgba(45,212,191,0.2)` }}>
                {spinLabel(hitOffset.dx, hitOffset.dy)}
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'X offset', value: hitOffset.dx.toFixed(2) },
                  { label: 'Y offset', value: hitOffset.dy.toFixed(2) },
                  { label: 'Spin mag', value: hypot(hitOffset.dx, hitOffset.dy).toFixed(2) },
                ].map(r => (
                  <div key={r.label} className="rounded p-2" style={{ background: C.bg }}>
                    <div style={{ color: C.hint, fontSize: 9, marginBottom: 2 }}>{r.label}</div>
                    <div style={{ color: C.text, fontFamily: 'monospace', fontWeight: 600, fontSize: 12 }}>{r.value}</div>
                  </div>
                ))}
              </div>

              <button onClick={resetHit} className="w-full py-1.5 text-xs font-medium rounded mt-1 transition-opacity hover:opacity-80"
                style={{ background: C.border, color: C.muted }}>
                Reset to Center
              </button>
            </div>
          )}

          {/* ── Physics Data Panel ──────────────────────────────────── */}
          {panel === 'data' && (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">

              {/* Overlays */}
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: C.text }}>Visible Overlays</div>
                <div className="flex flex-col gap-1.5">
                  {[
                    { key: 'vectors',    label: '⟶ Velocity Vectors',        color: C.blue   },
                    { key: 'momentum',   label: '⟹ Momentum (p=mv)',          color: C.purple  },
                    { key: 'forces',     label: '⬅ Friction Force',           color: C.red    },
                    { key: 'spin',       label: '↺ Spin / English',            color: C.teal   },
                    { key: 'trail',      label: '· Trail',                     color: C.amber  },
                    { key: 'labels',     label: '🏷 Live Labels (v, p)',       color: C.blue },
                    { key: 'aimVectors', label: '⊕ Aim Impact Vectors',       color: '#4ade80' },
                  ].map(o => (
                    <button key={o.key} onClick={() => toggleOverlay(o.key)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left"
                      style={{
                        background: overlays[o.key] ? `${o.color}18` : 'transparent',
                        border: `1px solid ${overlays[o.key] ? o.color : C.border}`,
                        color: overlays[o.key] ? o.color : C.hint,
                      }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: overlays[o.key] ? o.color : C.border, display: 'inline-block', flexShrink: 0 }} />
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Physics sliders */}
              <div>
                <div className="text-xs font-medium mb-2" style={{ color: C.text }}>Table Parameters</div>
                <div className="flex flex-col gap-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: C.muted }}>Friction</span>
                      <span style={{ color: C.text, fontFamily: 'monospace' }}>{friction.toFixed(3)}</span>
                    </div>
                    <input type="range" min="0.940" max="0.999" step="0.001" value={friction}
                      onChange={e => { const v = parseFloat(e.target.value); setFrictionUI(v); FRICTION_MUT = v }}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: C.teal }} />
                    <div className="flex justify-between text-xs mt-0.5" style={{ color: C.hint }}>
                      <span>sticky</span><span>slick</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: C.muted }}>Cushion Bounce</span>
                      <span style={{ color: C.text, fontFamily: 'monospace' }}>{restitution.toFixed(2)}</span>
                    </div>
                    <input type="range" min="0.40" max="1.00" step="0.01" value={restitution}
                      onChange={e => { const v = parseFloat(e.target.value); setRestitutionUI(v); RESTITUTION_MUT = v }}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: C.purple }} />
                    <div className="flex justify-between text-xs mt-0.5" style={{ color: C.hint }}>
                      <span>dead</span><span>superball</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium mb-2" style={{ color: C.text }}>Ball Physics</div>
                <div className="flex flex-col gap-1.5">
                  {tableData.map((b, i) => (
                    <button key={i} onClick={() => setFollowed(f => f === i ? null : i)}
                      className="w-full rounded p-2 text-left"
                      style={{ background: followed === i ? 'rgba(251,191,36,0.08)' : C.bg, border: `1px solid ${followed === i ? C.amber : C.border}` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: b.color, display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <span className="text-xs font-medium" style={{ color: C.text }}>{b.isCue ? 'Cue Ball' : `Ball m=${b.mass}`}</span>
                        {followed === i && <span className="ml-auto text-xs" style={{ color: C.amber }}>TRACKING</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          ['v', b.speed],
                          ['p', b.momentum],
                          ['KE', b.KE],
                          ['spin', b.spin],
                          ['vx', b.vx],
                          ['vy', b.vy],
                        ].map(([k, v]) => (
                          <div key={k} className="rounded px-1 py-0.5" style={{ background: C.surface }}>
                            <div style={{ color: C.hint, fontSize: 8 }}>{k}</div>
                            <div style={{ color: C.text, fontFamily: 'monospace', fontSize: 10, fontWeight: 600 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ── Events / Log Panel ──────────────────────────────────── */}
          {panel === 'log' && (
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium" style={{ color: C.text }}>Physics Events</div>
                <button onClick={() => setEvents([])} className="text-xs" style={{ color: C.hint }}>Clear</button>
              </div>
              {events.length === 0 && (
                <div className="text-xs text-center mt-8" style={{ color: C.hint }}>
                  Take a shot to see collision physics logged here.
                </div>
              )}
              {[...events].reverse().map((ev, i) => (
                <div key={i}
                  className="rounded p-2 text-xs"
                  style={{ background: C.bg, border: `1px solid ${ev.type === 'collision' && expandedEvent === i ? C.purple : C.border}`, cursor: ev.type === 'collision' ? 'pointer' : 'default' }}
                  onClick={() => ev.type === 'collision' && setExpandedEvent(x => x === i ? null : i)}>
                  {ev.type === 'scratch' && (
                    <div style={{ color: C.amber }}>⚠️ Scratch — cue returned to kitchen</div>
                  )}
                  {ev.type === 'shot' && (
                    <>
                      <div className="font-medium mb-1" style={{ color: C.blue }}>🎯 Shot #{events.filter(e=>e.type==='shot').length - i}</div>
                      <div style={{ color: C.muted }}>Power: <span style={{ color: C.text }}>{ev.power}</span></div>
                      <div style={{ color: C.muted }}>Angle: <span style={{ color: C.text }}>{ev.angle}°</span></div>
                      <div style={{ color: C.muted }}>Spin: <span style={{ color: C.teal }}>{ev.spin}</span></div>
                      <div style={{ color: C.muted }}>Hit: <span style={{ color: C.amber }}>({ev.hitOffset.dx.toFixed(2)}, {ev.hitOffset.dy.toFixed(2)})</span></div>
                    </>
                  )}
                  {ev.type === 'collision' && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="font-medium" style={{ color: C.purple }}>💥 Collision — {ev.angle}°</span>
                        <span style={{ color: C.hint, fontSize: 9 }}>{expandedEvent === i ? '▲ less' : '▼ equation'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        {[ev.a, ev.b].map((ball, j) => (
                          <div key={j} className="rounded p-1" style={{ background: C.surface }}>
                            <div style={{ color: C.hint, fontSize: 9 }}>Ball {j+1} m={ball.mass}</div>
                            <div style={{ color: C.muted, fontSize: 9 }}>v: {ball.vBefore}→<span style={{color:C.green}}>{ball.vAfter}</span></div>
                            <div style={{ color: C.muted, fontSize: 9 }}>p: {ball.pBefore}→<span style={{color:C.purple}}>{ball.pAfter}</span></div>
                          </div>
                        ))}
                      </div>
                      {expandedEvent === i && (
                        <div className="mt-2 p-2 rounded" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                          {/* Natural-language narrative */}
                          <div className="mb-2 leading-relaxed" style={{ color: C.hint, fontSize: 9 }}>
                            Ball A hit Ball B at <span style={{ color: C.purple }}>{ev.angle}°</span>.&nbsp;
                            <span style={{ color: C.green }}>{ev.keTransferPct ?? '—'}%</span> of kinetic energy was transferred.&nbsp;
                            {parseFloat(ev.ke_f) <= parseFloat(ev.ke_i)
                              ? <span style={{ color: C.green }}>The collision was nearly elastic — little energy was lost.</span>
                              : <span style={{ color: C.amber }}>Some energy was lost to deformation or spin.</span>}
                          </div>
                          {/* Impulse row */}
                          <div className="font-medium mb-1" style={{ color: C.blue, fontSize: 9 }}>
                            Impulse &amp; Momentum
                          </div>
                          <div style={{ color: C.hint, fontFamily: 'monospace', fontSize: 9, lineHeight: 2 }}>
                            <div>J = Δp = <span style={{ color: C.teal }}>{ev.impulse ?? '—'} kg·m/s</span></div>
                            <div>pᵢ = {ev.pTotal_i} &rarr; pf = <span style={{ color: C.purple }}>{ev.pTotal_f}</span></div>
                          </div>
                          {/* KE rows */}
                          <div className="font-medium mt-2 mb-1" style={{ color: C.blue, fontSize: 9 }}>
                            Kinetic Energy  (KE = ½mv²)
                          </div>
                          <div style={{ color: C.hint, fontFamily: 'monospace', fontSize: 9, lineHeight: 2 }}>
                            <div>KEᵢ = {ev.ke_i}</div>
                            <div>KEf = <span style={{ color: parseFloat(ev.ke_f) <= parseFloat(ev.ke_i) ? C.green : C.amber }}>{ev.ke_f}</span></div>
                            <div>Transfer: <span style={{ color: C.green }}>{ev.keTransferPct ?? '—'}%</span></div>
                          </div>
                          {/* Conservation of momentum equation */}
                          <div className="font-medium mt-2 mb-1" style={{ color: C.blue, fontSize: 9 }}>
                            Conservation of Momentum: m₁v₁ᵢ + m₂v₂ᵢ = m₁v₁f + m₂v₂f
                          </div>
                          <div style={{ color: C.hint, fontFamily: 'monospace', fontSize: 9, lineHeight: 1.9 }}>
                            <div>({ev.a.mass})({ev.a.vBefore}) + ({ev.b.mass})({ev.b.vBefore})</div>
                            <div style={{ color: C.green }}>= ({ev.a.mass})({ev.a.vAfter}) + ({ev.b.mass})({ev.b.vAfter})</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {panel === 'help' && (
            <div className="flex-1 overflow-y-auto p-3" style={{ color: C.text }}>
              <div className="text-xs font-semibold mb-3" style={{ color: C.blue }}>Symbol Reference</div>
              <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: C.hint, borderBottom: `1px solid ${C.border}` }}>
                    <th className="text-left pb-1 pr-2" style={{ width: 28 }}>Sym</th>
                    <th className="text-left pb-1 pr-2">Name</th>
                    <th className="text-left pb-1">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['v', 'Velocity', 'Speed + direction of a ball'],
                    ['p', 'Momentum', 'm × v — harder to stop = more p'],
                    ['KE', 'Kinetic Energy', '½mv² — energy of motion'],
                    ['J', 'Impulse', 'Δp = change in momentum during hit'],
                    ['ω', 'Spin / English', 'Angular velocity — topspin or backspin'],
                    ['θ', 'Angle', 'Direction of impact normal (0°=right)'],
                    ['e', 'Restitution', 'v_after / v_before — 1=perfectly elastic'],
                    ['μ', 'Friction', 'Slows balls; rolls → slides transition'],
                  ].map(([sym, name, meaning]) => (
                    <tr key={sym} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td className="py-1 pr-2 font-mono font-bold" style={{ color: C.purple }}>{sym}</td>
                      <td className="py-1 pr-2 font-medium" style={{ color: C.blue }}>{name}</td>
                      <td className="py-1" style={{ color: C.muted }}>{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 text-xs font-semibold mb-2" style={{ color: C.blue }}>Key Equations</div>
              <div className="flex flex-col gap-2">
                {[
                  ['p = mv', 'Momentum = mass × velocity'],
                  ['KE = ½mv²', 'Kinetic energy of a moving ball'],
                  ['J = Δp', 'Impulse equals change in momentum'],
                  ['m₁v₁ᵢ + m₂v₂ᵢ = m₁v₁f + m₂v₂f', 'Conservation of momentum'],
                  ['v_f = v_i + at', 'Velocity changes with friction deceleration'],
                ].map(([eq, desc]) => (
                  <div key={eq} className="rounded p-2" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                    <div className="font-mono font-bold mb-0.5" style={{ color: C.teal, fontSize: 10 }}>{eq}</div>
                    <div style={{ color: C.hint, fontSize: 9 }}>{desc}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-xs font-semibold mb-1" style={{ color: C.blue }}>Canvas Overlays</div>
              <div className="flex flex-col gap-1 text-xs" style={{ color: C.muted }}>
                <div><span style={{ color: C.purple }}>Purple line</span> — line of impact (collision normal)</div>
                <div><span style={{ color: C.teal }}>Teal dashes</span> — tangent line (perpendicular to impact)</div>
                <div><span style={{ color: C.teal }}>Teal arrow</span> — predicted target ball path</div>
                <div><span style={{ color: C.amber }}>Amber arrow</span> — predicted cue ball deflection</div>
                <div><span style={{ color: C.amber }}>Amber dot</span> — impact point</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
