// BasketballLab — first-person 3D basketball sim, raw Three.js
// You ARE the shooter. Click to lock pointer, aim with mouse, click to shoot.
import { useRef, useState, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import GameHelp from '../shared/GameHelp.jsx'

const SHOT_SPOTS = [
  { label: 'Free Throw',     dist: 4.6  },
  { label: '3-Point Line',   dist: 7.7  },
  { label: 'Half-Court Heave', dist: 12.8 },
]

function isTouchCapable() {
  // `'ontouchstart' in window` is unreliable — many desktop Chromium builds
  // define the property regardless of actual hardware. maxTouchPoints and a
  // coarse-pointer media query are the signals that actually reflect the
  // primary input device.
  if (typeof window === 'undefined') return false
  return navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches
}

// Tiny synthesized sound effects (no audio assets) — lazily created on first
// user gesture since browsers block AudioContext autoplay before interaction.
function playTone(ctx, { freq = 440, dur = 0.15, type = 'sine', gain = 0.22, slideTo = null } = {}) {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur)
  g.gain.setValueAtTime(gain, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
  osc.connect(g); g.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + dur)
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GRAVITY      = -22          // m/s² (pumped up for better game feel)
const BALL_RADIUS  = 0.12         // metres
const RIM_HEIGHT   = 3.05         // 10ft
const RIM_RADIUS   = 0.228        // inner radius (~18in / 2)
const RIM_TUBE     = 0.025        // rim pipe thickness
const BACKBOARD_W  = 1.83         // 6ft
const BACKBOARD_H  = 1.07         // 3.5ft
const BACKBOARD_Z  = +(RIM_RADIUS + 0.12)  // behind rim, away from player
const BB_Y_BOT     = RIM_HEIGHT - 0.28
const COURT_W      = 15
const COURT_L      = 28
const PLAYER_EYE   = 2.0          // camera eye height

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function simArc(ox, oy, oz, vx, vy, vz, steps, stepDt) {
  const pts = []
  let px = ox, py = oy, pz = oz
  let pvx = vx, pvy = vy, pvz = vz
  const bbwz = COURT_L / 2 - 1.2 + BACKBOARD_Z  // backboard world-Z
  for (let i = 0; i < steps; i++) {
    pts.push(new THREE.Vector3(px, py, pz))
    pvx *= 0.9992; pvz *= 0.9992
    pvy += GRAVITY * stepDt
    px += pvx * stepDt; py += pvy * stepDt; pz += pvz * stepDt
    // backboard bounce
    if (pvz > 0 && pz >= bbwz - BALL_RADIUS &&
        py > BB_Y_BOT - BALL_RADIUS && py < BB_Y_BOT + BACKBOARD_H + BALL_RADIUS) {
      pz = bbwz - BALL_RADIUS; pvz *= -0.82; pvx *= 0.93; pvy *= 0.9
    }
    // floor bounce
    if (py < BALL_RADIUS) { py = BALL_RADIUS; pvy *= -0.45; pvx *= 0.8; pvz *= 0.8 }
    if (py < -0.5) break
  }
  return pts
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BasketballLab({ onClose }) {
  const mountRef       = useRef(null)
  const rendererRef    = useRef(null)
  const sceneRef       = useRef(null)
  const cameraRef      = useRef(null)
  const ballMeshRef    = useRef(null)
  const arcLineRef     = useRef(null)
  const basketGroupRef = useRef(null)
  const rafRef         = useRef(null)
  const timerRef       = useRef(null)
  if (timerRef.current === null) timerRef.current = new THREE.Timer()
  const hudRef         = useRef(null)
  const sideCanvasRef  = useRef(null)
  const arrowRef       = useRef(null)
  const replayFrames   = useRef([])
  const savedReplay    = useRef([])
  const audioCtxRef    = useRef(null)
  const streakRef      = useRef(0)

  // Mutable game-state — inside ref to avoid causing re-renders per frame
  const gs = useRef({
    phase:    'aim',   // 'aim' | 'flight' | 'done'
    ballPos:  new THREE.Vector3(),
    ballVel:  new THREE.Vector3(),
    yaw:      Math.PI, // camera horizontal angle (π = facing +Z toward basket)
    pitch:    0.40,    // camera vertical angle (radians up from horizon)
    power:    0.58,    // 0-1
    rimHits:  0,
    backboardHit: false,
    makes:    0,
    attempts: 0,
    locked:   false,
    touchActive: false, // mobile equivalent of `locked` — no pointer lock on touch
    doneTimer:  0,
    doneMsg:   '',
    canReplay:   false,
    replayIdx:   0,
    replaySub:   0,
    launchAngle: 0.55,
    slowMo:      false,
    scoredTimer: 0,   // >0 means ball is falling through net after score
    streak:      0,
  })

  // React state (for UI only)
  const [makes,    setMakes]    = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [power,    setPower]    = useState(0.58)
  const [locked,   setLocked]   = useState(false)
  const [touchActive, setTouchActive] = useState(false)
  const [isTouch]      = useState(isTouchCapable)
  const [feedback,     setFeedback]     = useState('')
  const [showReplay,   setShowReplay]   = useState(false)
  const [launchAngle,  setLaunchAngle]  = useState(0.55)
  const [slowMo,       setSlowMo]       = useState(false)
  const [streak,       setStreak]       = useState(0)
  const active = locked || touchActive

  // ── Shoot ─────────────────────────────────────────────────────────────────
  const shoot = useCallback(() => {
    const g   = gs.current
    const cam = cameraRef.current
    if (g.phase !== 'aim' || !cam) return
    const speed = g.power * 10 + 7     // 7–17 m/s

    // Direction from yaw + independent launch angle scroll-dialled by player
    const cosA = Math.cos(g.launchAngle), sinA = Math.sin(g.launchAngle)
    const dir = new THREE.Vector3(-Math.sin(g.yaw) * cosA, sinA, -Math.cos(g.yaw) * cosA)

    g.ballPos.set(
      cam.position.x + dir.x * 0.3,
      PLAYER_EYE - 0.25,
      cam.position.z + dir.z * 0.3,
    )
    g.ballVel.set(dir.x * speed, dir.y * speed, dir.z * speed)

    g.rimHits = 0
    g.backboardHit = false
    g.phase = 'flight'
    g.canReplay = false
    replayFrames.current = []
    setShowReplay(false)
    g.attempts++
    setAttempts(g.attempts)
    setFeedback('')
    playTone(audioCtxRef.current, { freq: 320, dur: 0.12, type: 'triangle', gain: 0.12, slideTo: 260 })

    const ball = ballMeshRef.current
    if (ball) { ball.position.copy(g.ballPos); ball.visible = true }
  }, [])

  // ── Teleport to a preset shot spot (works for both desktop and touch) ──────
  const goToSpot = useCallback((dist) => {
    const g = gs.current
    const cam = cameraRef.current
    if (!cam || g.phase !== 'aim') return
    cam.position.x = 0
    cam.position.z = clamp(COURT_L / 2 - 1.2 - dist, -COURT_L / 2 + 0.5, COURT_L / 2 - 0.5)
  }, [])

  // ── Three.js setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const W = mount.clientWidth || 800
    const H = mount.clientHeight || 540

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.95
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ── Scene ───────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x060a14)
    scene.fog = new THREE.FogExp2(0x060a14, 0.038)
    sceneRef.current = scene

    // ── Camera ──────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(68, W / H, 0.01, 80)
    camera.position.set(0, PLAYER_EYE, COURT_L / 2 - 1.2 - 7.7) // just behind 3pt arc, facing basket
    camera.rotation.order = 'YXZ'
    cameraRef.current = camera

    // Quaternion helpers for gimbal-free FPS camera
    const _qCamY = new THREE.Quaternion()
    const _qCamX = new THREE.Quaternion()
    const _vUp    = new THREE.Vector3(0, 1, 0)
    const _vRight = new THREE.Vector3(1, 0, 0)

    // ── Lights ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xfff4e0, 0.6))

    // 8 overhead arena spots (6 along court + 2 focused on basket end)
    const spotCfg = [
      [-5, 11, -8], [5, 11, -8],
      [-5, 11, 0],  [5, 11, 0],
      [-5, 11, 8],  [5, 11, 8],
      [-2.5, 10, COURT_L / 2 - 3.5], [2.5, 10, COURT_L / 2 - 3.5],
    ]
    spotCfg.forEach(([x, y, z], i) => {
      const isBasket = i >= 6
      const s = new THREE.SpotLight(0xfff5e0, isBasket ? 5.5 : 2.6, 30, isBasket ? 0.45 : 0.6, 0.4, 1.4)
      s.position.set(x, y, z)
      s.castShadow = isBasket
      if (isBasket) s.shadow.mapSize.set(1024, 1024)
      scene.add(s); scene.add(s.target)
    })
    // Basket warm rim glow
    const bg = new THREE.PointLight(0xff7020, 4, 8)
    bg.position.set(0, RIM_HEIGHT + 1.4, COURT_L / 2 - 1)
    scene.add(bg)
    // Cool blue fill from behind shooter
    const fillL = new THREE.PointLight(0x1a3aff, 0.9, 16)
    fillL.position.set(0, 3.5, -COURT_L / 2 + 2)
    scene.add(fillL)

    // ── Court floor ─────────────────────────────────────────────────────────
    {
      const geo = new THREE.BoxGeometry(COURT_W, 0.06, COURT_L)
      const mat = new THREE.MeshStandardMaterial({ color: 0xc4843a, roughness: 0.75, metalness: 0 })
      const m = new THREE.Mesh(geo, mat); m.position.y = -0.03; m.receiveShadow = true
      scene.add(m)
    }
    // Court markings (white lines as thin planes)
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
    function addLine(w, d, x, z) {
      const geo = new THREE.BoxGeometry(w, 0.001, d)
      const m = new THREE.Mesh(geo, lineMat); m.position.set(x, 0.001, z)
      scene.add(m)
    }
    addLine(4.9, 0.05, 0, COURT_L / 2 - 5.8)   // FT line
    addLine(0.05, 5.8, -2.45, COURT_L / 2 - 2.9)  // left key
    addLine(0.05, 5.8,  2.45, COURT_L / 2 - 2.9)  // right key
    addLine(COURT_W, 0.05, 0, 0)                   // half-court line
    // 3-point arc
    {
      const pts = []
      const R = 7.24, bz = COURT_L / 2 - 1.2
      for (let a = -Math.PI * 0.62; a <= Math.PI * 0.62; a += 0.04)
        pts.push(new THREE.Vector3(Math.sin(a) * R, 0.002, bz - Math.cos(a) * R))
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xffffff })
      ))
    }

    // ── Walls / arena backdrop ───────────────────────────────────────────────
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 1 })
    const wallDefs = [
      [COURT_W + 2, 13, 0, 6.5,  COURT_L / 2 + 1, 0],
      [COURT_W + 2, 13, 0, 6.5, -COURT_L / 2 - 1, Math.PI],
      [COURT_L + 2, 13, COURT_W / 2 + 1, 6.5, 0, -Math.PI / 2],
      [COURT_L + 2, 13, -COURT_W / 2 - 1, 6.5, 0, Math.PI / 2],
    ]
    wallDefs.forEach(([w, h, x, y, z, ry]) => {
      const geo = new THREE.PlaneGeometry(w, h)
      const m = new THREE.Mesh(geo, wallMat)
      m.position.set(x, y, z); m.rotation.y = ry
      scene.add(m)
    })
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1a, roughness: 1 })
    { const geo = new THREE.PlaneGeometry(COURT_W + 2, COURT_L + 2)
      const m = new THREE.Mesh(geo, ceilMat); m.rotation.x = Math.PI / 2; m.position.y = 13
      scene.add(m) }

    // Arena scoreboard glow at far wall
    { const geo = new THREE.PlaneGeometry(3, 1.5)
      const mat = new THREE.MeshBasicMaterial({ color: 0x002244 })
      const m = new THREE.Mesh(geo, mat); m.position.set(0, 9, COURT_L / 2 + 0.9); m.rotation.y = Math.PI
      scene.add(m) }

    // ── Basket group (far end, positive Z) ──────────────────────────────────
    const basketGrp = new THREE.Group()
    basketGrp.position.set(0, 0, COURT_L / 2 - 1.2)
    basketGroupRef.current = basketGrp
    scene.add(basketGrp)

    // Pole
    { const geo = new THREE.CylinderGeometry(0.07, 0.07, RIM_HEIGHT + 0.3, 12)
      const mat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.5, roughness: 0.3 })
      const m = new THREE.Mesh(geo, mat); m.position.set(0, (RIM_HEIGHT + 0.3) / 2, BACKBOARD_Z + 0.12)
      m.castShadow = true; basketGrp.add(m) }

    // Support arm
    { const geo = new THREE.BoxGeometry(0.06, 0.06, 0.85)
      const mat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.5, roughness: 0.3 })
      const m = new THREE.Mesh(geo, mat); m.position.set(0, RIM_HEIGHT + 0.38, BACKBOARD_Z + 0.1)
      basketGrp.add(m) }

    // Backboard glass
    { const geo = new THREE.BoxGeometry(BACKBOARD_W, BACKBOARD_H, 0.04)
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x88ccff, transmission: 0.9, roughness: 0.06,
        transparent: true, opacity: 0.5, side: THREE.DoubleSide
      })
      const m = new THREE.Mesh(geo, mat)
      m.position.set(0, BB_Y_BOT + BACKBOARD_H / 2, BACKBOARD_Z)
      basketGrp.add(m)

      // Aim square border
      const bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
      const rw = 0.59, rh = 0.45, ry = BB_Y_BOT + 0.32
      const rz = BACKBOARD_Z - 0.025
      ;[[rw, 0.02, 0, ry + rh / 2 + 0.01, rz],
        [rw, 0.02, 0, ry - rh / 2 - 0.01, rz],
        [0.02, rh + 0.04, -rw / 2 - 0.01, ry, rz],
        [0.02, rh + 0.04,  rw / 2 + 0.01, ry, rz]
      ].forEach(([bw, bh, bx, by, bZ]) => {
        const bg = new THREE.BoxGeometry(bw, 0.02, bh)
        const bm = new THREE.Mesh(bg, bMat); bm.position.set(bx, by, bZ)
        basketGrp.add(bm)
      })
    }

    // Rim (torus)
    { const geo = new THREE.TorusGeometry(RIM_RADIUS, RIM_TUBE, 10, 48)
      const mat = new THREE.MeshStandardMaterial({ color: 0xe04800, roughness: 0.35, metalness: 0.25 })
      const m = new THREE.Mesh(geo, mat); m.rotation.x = Math.PI / 2
      m.position.set(0, RIM_HEIGHT, 0); m.castShadow = true
      basketGrp.add(m) }

    // Net (line segments)
    {
      const segs = 14, rings = 8
      const topR = RIM_RADIUS - RIM_TUBE * 0.6, botR = topR * 0.30, netH = 0.48
      const lMat = new THREE.LineBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.65 })
      const pts = []
      // verticals
      for (let s = 0; s < segs; s++) {
        const th = (s / segs) * Math.PI * 2
        for (let r = 0; r < rings; r++) {
          const t0 = r / rings, t1 = (r + 1) / rings
          const r0 = THREE.MathUtils.lerp(topR, botR, t0)
          const r1 = THREE.MathUtils.lerp(topR, botR, t1)
          pts.push(
            new THREE.Vector3(Math.cos(th) * r0, RIM_HEIGHT - t0 * netH, Math.sin(th) * r0),
            new THREE.Vector3(Math.cos(th) * r1, RIM_HEIGHT - t1 * netH, Math.sin(th) * r1),
          )
        }
      }
      // horizontal rings
      for (let r = 0; r <= rings; r++) {
        const t = r / rings
        const rx = THREE.MathUtils.lerp(topR, botR, t)
        const y = RIM_HEIGHT - t * netH
        for (let s = 0; s < segs; s++) {
          const th0 = (s / segs) * Math.PI * 2
          const th1 = ((s + 1) / segs) * Math.PI * 2
          pts.push(
            new THREE.Vector3(Math.cos(th0) * rx, y, Math.sin(th0) * rx),
            new THREE.Vector3(Math.cos(th1) * rx, y, Math.sin(th1) * rx),
          )
        }
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      basketGrp.add(new THREE.LineSegments(geo, lMat))
    }

    // ── Ball ────────────────────────────────────────────────────────────────
    {
      const geo = new THREE.SphereGeometry(BALL_RADIUS, 28, 20)
      const mat = new THREE.MeshStandardMaterial({ color: 0xd06010, roughness: 0.6, metalness: 0.05 })
      const m = new THREE.Mesh(geo, mat); m.visible = false; m.castShadow = true
      ballMeshRef.current = m; scene.add(m)

      // Seam lines on ball
      const seamMat = new THREE.LineBasicMaterial({ color: 0x1a0800 })
      const R = BALL_RADIUS + 0.0015
      const pts30 = Array.from({ length: 65 }, (_, i) => {
        const a = (i / 64) * Math.PI * 2
        return new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R * 0.28, Math.sin(a) * R * 0.96)
      })
      const pts31 = Array.from({ length: 65 }, (_, i) => {
        const a = (i / 64) * Math.PI * 2
        return new THREE.Vector3(Math.cos(a) * R * 0.28, Math.sin(a) * R, Math.cos(a) * R * 0.96)
      })
      m.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts30), seamMat))
      m.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts31), seamMat))
    }

    // ── Launch-angle arrow (yellow, updates each frame) ─────────────────────────
    {
      const arr = new THREE.ArrowHelper(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 1.5, 0),
        1.4, 0xfbbf24, 0.3, 0.12
      )
      arr.visible = false
      arrowRef.current = arr
      scene.add(arr)
    }

    // ── Arc preview line ─────────────────────────────────────────────────────
    {
      const pts = Array.from({ length: 80 }, () => new THREE.Vector3())
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.55 })
      const line = new THREE.Line(geo, mat); line.visible = false; line.frustumCulled = false
      arcLineRef.current = line; scene.add(line)
    }

    // ── Basket world position (relative to group) ────────────────────────────
    // absolute basket centre = basketGrp.position + (0, RIM_HEIGHT, 0)
    const BASKET_WORLD = new THREE.Vector3(0, RIM_HEIGHT, COURT_L / 2 - 1.2)

    // ── Pointer lock (desktop) ─────────────────────────────────────────────────
    const dom = renderer.domElement
    const touchCapable = isTouchCapable()

    function onLockChange() {
      const lk = document.pointerLockElement === dom
      gs.current.locked = lk; setLocked(lk)
    }
    document.addEventListener('pointerlockchange', onLockChange)

    function onDomClick() {
      if (touchCapable) return // touch devices shoot via tap, handled below
      if (!gs.current.locked) dom.requestPointerLock()
      else                    shoot()
    }
    dom.addEventListener('click', onDomClick)

    // ── Mouse move (desktop look) ───────────────────────────────────────────────
    const SENS = 0.0022
    function onMouseMove(e) {
      const g = gs.current; if (!g.locked) return
      g.yaw   -= e.movementX * SENS
      g.pitch  = clamp(g.pitch - e.movementY * SENS * 0.65, -0.2, 1.35)
    }
    document.addEventListener('mousemove', onMouseMove)

    // ── Scroll: launch angle | Shift+Scroll: power ────────────────────────────
    function onWheel(e) {
      const g = gs.current
      if (e.shiftKey) {
        g.power = clamp(g.power - e.deltaY * 0.0006, 0.05, 1)
        setPower(g.power)
      } else {
        g.launchAngle = clamp(g.launchAngle + e.deltaY * 0.0009, 0.05, 1.3)
        setLaunchAngle(g.launchAngle)
      }
    }
    dom.addEventListener('wheel', onWheel, { passive: true })

    // ── Touch (mobile) — drag to look, tap (no drag) to shoot ─────────────────
    // Pointer Lock doesn't exist on touch devices, so touch gets its own
    // "active" flag instead of `locked`, driving the same aim/HUD visuals.
    const TOUCH_SENS = SENS * 1.5
    let touchLastX = 0, touchLastY = 0, touchStartX = 0, touchStartY = 0, touchStartT = 0, touchMoved = false
    function onTouchStart(e) {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      touchLastX = touchStartX = t.clientX
      touchLastY = touchStartY = t.clientY
      touchStartT = performance.now()
      touchMoved = false
    }
    function onTouchMove(e) {
      const g = gs.current
      if (!g.touchActive || e.touches.length !== 1) return
      e.preventDefault()
      const t = e.touches[0]
      const dx = t.clientX - touchLastX, dy = t.clientY - touchLastY
      touchLastX = t.clientX; touchLastY = t.clientY
      if (Math.abs(t.clientX - touchStartX) > 10 || Math.abs(t.clientY - touchStartY) > 10) touchMoved = true
      g.yaw   -= dx * TOUCH_SENS
      g.pitch  = clamp(g.pitch - dy * TOUCH_SENS * 0.65, -0.2, 1.35)
    }
    function onTouchEnd() {
      const g = gs.current
      if (!g.touchActive) return
      if (!touchMoved && performance.now() - touchStartT < 280) shoot()
    }
    dom.addEventListener('touchstart', onTouchStart, { passive: true })
    dom.addEventListener('touchmove',  onTouchMove,  { passive: false })
    dom.addEventListener('touchend',   onTouchEnd,   { passive: true })

    // ── Keyboard: WASD move, R = reset, Q/E = power ───────────────────────────
    const keysDown = new Set()
    function onKeyDown(e) {
      keysDown.add(e.key)
      const g = gs.current
      if (e.key === 'r' || e.key === 'R') {
        g.phase = 'aim'; ballMeshRef.current.visible = false; setFeedback('')
      }
      if ((e.key === 'v' || e.key === 'V') && g.canReplay && (g.phase === 'aim' || g.phase === 'done')) {
        g.phase = 'replay'; g.replayIdx = 0; g.replaySub = 0; g.canReplay = false
        setShowReplay(false)
        if (ballMeshRef.current) ballMeshRef.current.visible = true
      }
      if (e.key === 'e' || e.key === 'E') { g.power = clamp(g.power + 0.05, 0, 1); setPower(g.power) }
      if (e.key === 'q' || e.key === 'Q') { g.power = clamp(g.power - 0.05, 0, 1); setPower(g.power) }
      if (e.key === 'p' || e.key === 'P') { g.slowMo = !g.slowMo; setSlowMo(g.slowMo) }
      if (e.key === 'Escape') document.exitPointerLock()
    }
    function onKeyUp(e) { keysDown.delete(e.key) }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)

    // ── Resize ────────────────────────────────────────────────────────────────
    // A plain `window.resize` listener misses layout-driven size changes (e.g.
    // maximizing this lab inside the desktop window manager is a CSS change,
    // not a browser resize event) — renderer.setSize() pins the canvas to an
    // inline pixel size, so it stayed stuck at whatever size it was at boot.
    // Golf had the exact same bug; ResizeObserver catches both cases.
    function onResize() {
      const w = mount.clientWidth, h = mount.clientHeight
      if (!w || !h) return
      camera.aspect = w / h; camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(mount)

    // ── Animation loop ────────────────────────────────────────────────────────
    const timer = timerRef.current
    timer.connect(document)
    timer.reset()

    function loop() {
      rafRef.current = requestAnimationFrame(loop)
      timer.update()
      const rawDt = clamp(timer.getDelta(), 0, 0.05)
      const g  = gs.current
      const effDt = rawDt * (g.slowMo ? 0.2 : 1)  // physics run at 0.2× in slo-mo

      // Apply yaw/pitch via quaternion — avoids Euler sign-flip when yaw=π
      _qCamY.setFromAxisAngle(_vUp, g.yaw)
      _qCamX.setFromAxisAngle(_vRight, g.pitch)
      camera.quaternion.copy(_qCamY).multiply(_qCamX)

      // ── WASD movement ────────────────────────────────────────────────────
      // Free movement any time the ball isn't actually in the air — including
      // during replay, so you can walk around and watch your last shot from a
      // different angle instead of being stuck at the original launch spot.
      if (g.locked && g.phase !== 'flight') {
        const spd = 5 * rawDt
        const fwx = -Math.sin(g.yaw), fwz = -Math.cos(g.yaw)
        const rgx =  Math.cos(g.yaw), rgz = -Math.sin(g.yaw)
        if (keysDown.has('w') || keysDown.has('W')) { camera.position.x += fwx * spd; camera.position.z += fwz * spd }
        if (keysDown.has('s') || keysDown.has('S')) { camera.position.x -= fwx * spd; camera.position.z -= fwz * spd }
        if (keysDown.has('a') || keysDown.has('A')) { camera.position.x -= rgx * spd; camera.position.z -= rgz * spd }
        if (keysDown.has('d') || keysDown.has('D')) { camera.position.x += rgx * spd; camera.position.z += rgz * spd }
        camera.position.x = clamp(camera.position.x, -COURT_W / 2 + 0.5, COURT_W / 2 - 0.5)
        camera.position.z = clamp(camera.position.z, -COURT_L / 2 + 0.5, COURT_L / 2 - 0.5)
      }

      // ── Launch angle arrow update ───────────────────────────────────────────
      const arrow = arrowRef.current
      if (arrow) {
        arrow.visible = (g.locked || g.touchActive) && g.phase === 'aim'
        if (arrow.visible) {
          const cosA = Math.cos(g.launchAngle), sinA = Math.sin(g.launchAngle)
          arrow.setDirection(new THREE.Vector3(-Math.sin(g.yaw) * cosA, sinA, -Math.cos(g.yaw) * cosA))
          arrow.position.set(
            camera.position.x - Math.sin(g.yaw) * 0.45,
            1.45,
            camera.position.z - Math.cos(g.yaw) * 0.45,
          )
        }
      }

      // ── Arc preview ──────────────────────────────────────────────────────
      const arcLine = arcLineRef.current
      if (arcLine) {
        if (g.phase === 'aim' && (g.locked || g.touchActive)) {
          arcLine.visible = true
          const speed = g.power * 10 + 7
          const cosA = Math.cos(g.launchAngle), sinA = Math.sin(g.launchAngle)
          const dir = new THREE.Vector3(-Math.sin(g.yaw) * cosA, sinA, -Math.cos(g.yaw) * cosA)
          const ox = camera.position.x + dir.x * 0.3
          const oy = PLAYER_EYE - 0.25
          const oz = camera.position.z + dir.z * 0.3
          const arcPts = simArc(ox, oy, oz, dir.x * speed, dir.y * speed, dir.z * speed, 80, 0.045)
          arcLine.geometry.setFromPoints(arcPts)
          arcLine.geometry.attributes.position.needsUpdate = true
        } else {
          arcLine.visible = false
        }
      }

      // ── Ball physics ──────────────────────────────────────────────────────
      const ball = ballMeshRef.current
      if (ball && g.phase === 'flight') {
        const STEPS = 4
        for (let s = 0; s < STEPS; s++) {
          const sdt = effDt / STEPS
          g.ballVel.y += GRAVITY * sdt
          g.ballVel.x *= (1 - 0.003 * sdt * 60)
          g.ballVel.z *= (1 - 0.003 * sdt * 60)
          g.ballPos.addScaledVector(g.ballVel, sdt)

          // Spin rotation
          const spinAx = new THREE.Vector3(g.ballVel.z, 0, -g.ballVel.x).normalize()
          if (spinAx.lengthSq() > 0.01) {
            ball.rotateOnWorldAxis(spinAx, g.ballVel.length() / BALL_RADIUS * sdt * 0.85)
          }

          const bw = BASKET_WORLD
          const dx = g.ballPos.x - bw.x
          const dz = g.ballPos.z - bw.z
          const distXZ = Math.sqrt(dx * dx + dz * dz)

          // ── Rim collision (8 sample points on rim ring) ─────────────────
          if (Math.abs(g.ballPos.y - RIM_HEIGHT) < BALL_RADIUS + RIM_TUBE + 0.08) {
            for (let i = 0; i < 16; i++) {  // 16 pts = smoother rim
              const th = (i / 16) * Math.PI * 2
              const rp = new THREE.Vector3(bw.x + Math.cos(th) * RIM_RADIUS, RIM_HEIGHT, bw.z + Math.sin(th) * RIM_RADIUS)
              const diff = g.ballPos.clone().sub(rp)
              const d = diff.length()
              if (d < BALL_RADIUS + RIM_TUBE + 0.002) {
                diff.normalize()
                g.ballPos.copy(rp).addScaledVector(diff, BALL_RADIUS + RIM_TUBE + 0.003)
                const vn = g.ballVel.dot(diff)
                if (vn < 0) {
                  g.ballVel.addScaledVector(diff, -(1 + 0.55) * vn)
                  g.ballVel.multiplyScalar(0.68)   // more energy loss = more rattling
                  g.rimHits++
                  playTone(audioCtxRef.current, { freq: 200, dur: 0.09, type: 'square', gain: 0.1, slideTo: 140 })
                }
              }
            }
          }

          // ── Backboard ────────────────────────────────────────────────────
          const bbWorldZ = bw.z + BACKBOARD_Z
          if (
            g.ballPos.z > bbWorldZ - BALL_RADIUS - 0.01 &&
            g.ballPos.z < bbWorldZ + 0.07 &&
            Math.abs(g.ballPos.x - bw.x) < BACKBOARD_W / 2 + BALL_RADIUS &&
            g.ballPos.y > BB_Y_BOT - BALL_RADIUS &&
            g.ballPos.y < BB_Y_BOT + BACKBOARD_H + BALL_RADIUS
          ) {
            if (g.ballVel.z > 0.1) {
              g.ballPos.z = bbWorldZ - BALL_RADIUS - 0.003
              g.ballVel.z *= -0.82
              g.ballVel.x *= 0.93
              g.ballVel.y *= 0.9
              g.backboardHit = true
            }
          }

          // ── Floor ─────────────────────────────────────────────────────────
          if (g.ballPos.y < BALL_RADIUS) {
            g.ballPos.y = BALL_RADIUS
            if (Math.abs(g.ballVel.y) > 0.4) {
              g.ballVel.y *= -0.45; g.ballVel.x *= 0.8; g.ballVel.z *= 0.8
            } else {
              g.ballVel.set(0, 0, 0)
              g.phase = 'done'
              g.doneMsg = 'Miss'
              savedReplay.current = [...replayFrames.current]
              setFeedback('Miss')
              playTone(audioCtxRef.current, { freq: 110, dur: 0.18, type: 'sine', gain: 0.15, slideTo: 70 })
              g.streak = 0; setStreak(0)
              // Replay should be available the instant the result is known, not
              // after an extra artificial wait — that's what made V feel like it
              // needed an R press first (canReplay was simply still false).
              g.canReplay = true; setShowReplay(true)
              setTimeout(() => {
                // Guard: don't yank phase back to 'aim' if the player already
                // started a replay (or shot again) during this window.
                const g2 = gs.current
                if (g2.phase === 'done') { g2.phase = 'aim'; ball.visible = false; setFeedback('') }
              }, 1800)
            }
          }

          // ── Out of play ────────────────────────────────────────────────────
          if (Math.abs(g.ballPos.x) > 20 || Math.abs(g.ballPos.z) > 20) {
            g.phase = 'done'; g.doneMsg = 'Miss'
            savedReplay.current = [...replayFrames.current]
            setFeedback('Miss')
            g.streak = 0; setStreak(0)
            g.canReplay = true; setShowReplay(true)
            setTimeout(() => {
              const g2 = gs.current
              if (g2.phase === 'done') { g2.phase = 'aim'; ball.visible = false; setFeedback('') }
            }, 1500)
          }

          // ── Score check: ball descends through rim ─────────────────────────
          if (
            g.ballVel.y < 0 &&
            Math.abs(g.ballPos.y - RIM_HEIGHT) < BALL_RADIUS * 1.05 &&
            distXZ < RIM_RADIUS - BALL_RADIUS * 0.75
          ) {
            g.makes++; g.phase = 'scoring'  // 'scoring' = fall through net, still visible
            g.scoredTimer = 0.9             // seconds to fall through net
            // bleed off XZ velocity so ball drops straight through
            g.ballVel.x *= 0.15
            g.ballVel.z *= 0.15
            g.ballVel.y  = -3.5             // pull it down quickly
            const isSwish = g.rimHits === 0
            const isBankSwish = g.backboardHit && g.rimHits === 0
            const msg = isBankSwish ? 'BANK SHOT! 💥' : isSwish ? 'SWISH! 🏀' : g.rimHits > 1 ? 'Rattle in! 🔥' : 'BUCKET! 💪'
            g.doneMsg = msg
            // Don't snapshot the replay yet — the ball hasn't actually fallen
            // through the net. Snapshotting here cut every made-shot replay
            // off right at the rim, so it never showed the shot landing.
            setMakes(g.makes); setFeedback(msg)
            g.streak++; setStreak(g.streak)
            const ctx = audioCtxRef.current
            if (isSwish) {
              playTone(ctx, { freq: 880, dur: 0.1, type: 'sine', gain: 0.18 })
              playTone(ctx, { freq: 1320, dur: 0.16, type: 'sine', gain: 0.14 })
            } else {
              playTone(ctx, { freq: 660, dur: 0.12, type: 'sine', gain: 0.18 })
            }
          }
        }

        ball.position.copy(g.ballPos)
        replayFrames.current.push({
          px: g.ballPos.x, py: g.ballPos.y, pz: g.ballPos.z,
          qx: ball.quaternion.x, qy: ball.quaternion.y,
          qz: ball.quaternion.z, qw: ball.quaternion.w,
        })
      }

      // ── Scoring: ball falls through net then transitions ───────────────────────
      if (g.phase === 'scoring') {
        const sball = ballMeshRef.current
        if (sball) {
          g.ballVel.y += GRAVITY * effDt * 0.5  // gentle gravity during drop
          g.ballPos.addScaledVector(g.ballVel, effDt)
          sball.position.copy(g.ballPos)
          sball.visible = true   // stays visible while falling through net
          // Keep recording through the net-fall so the replay actually shows
          // the ball going in, instead of stopping right at the rim.
          replayFrames.current.push({
            px: g.ballPos.x, py: g.ballPos.y, pz: g.ballPos.z,
            qx: sball.quaternion.x, qy: sball.quaternion.y,
            qz: sball.quaternion.z, qw: sball.quaternion.w,
          })
        }
        g.scoredTimer -= rawDt
        if (g.scoredTimer <= 0) {
          g.phase = 'done'
          if (sball) sball.visible = false
          g.canReplay = true
          savedReplay.current = [...replayFrames.current]
          setFeedback('')
          setShowReplay(true)
        }
      }

      // ── Replay playback ──────────────────────────────────────────────────────
      if (g.phase === 'replay') {
        const rball = ballMeshRef.current
        if (rball && savedReplay.current.length > 0) {
          g.replaySub += rawDt * (g.slowMo ? 0.055 : 0.22)
          while (g.replaySub >= 0.016 && g.replayIdx < savedReplay.current.length) {
            g.replaySub -= 0.016; g.replayIdx++
          }
          const idx = Math.min(g.replayIdx, savedReplay.current.length - 1)
          const rf = savedReplay.current[idx]
          rball.position.set(rf.px, rf.py, rf.pz)
          rball.quaternion.set(rf.qx, rf.qy, rf.qz, rf.qw)
          rball.visible = true
          if (g.replayIdx >= savedReplay.current.length) {
            g.phase = 'aim'; rball.visible = false
          }
        }
      }

      // ── HUD ────────────────────────────────────────────────────────────────────
      const hud = hudRef.current
      if (hud) drawHud(hud, g, mount.clientWidth, mount.clientHeight)
      const side = sideCanvasRef.current
      if (side) drawSidePanel(side, g, camera, ballMeshRef.current)

      renderer.render(scene, camera)
    }
    loop()

    return () => {
      cancelAnimationFrame(rafRef.current)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
      dom.removeEventListener('click', onDomClick)
      dom.removeEventListener('wheel', onWheel)
      dom.removeEventListener('touchstart', onTouchStart)
      dom.removeEventListener('touchmove', onTouchMove)
      dom.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('resize', onResize)
      resizeObserver.disconnect()
      timer.disconnect()
      if (document.pointerLockElement === dom) document.exitPointerLock()
      renderer.dispose()
      if (mount.contains(dom)) mount.removeChild(dom)
    }
  }, [shoot])

  const fgPct = attempts > 0 ? Math.round((makes / attempts) * 100) : 0

  return (
    <div className="fixed inset-0 z-[1700] flex flex-col" style={{ background: '#060a14' }}>

      <GameHelp
        title="Basketball Lab — First Person"
        sections={[
          { heading: 'What you’re learning', body: 'Every shot is a projectile-motion problem: launch angle and speed set the arc, gravity does the rest. Watch the side-view panel while aiming to see the predicted trajectory before you shoot, and how rim hits and backboard bounces lose energy.' },
          { heading: 'How to play', body: isTouch
              ? 'Drag anywhere on the court to aim. Tap (without dragging) to shoot. Use the Angle and Power sliders at the bottom to dial in your shot, and the spot buttons up top to change distance.'
              : 'Click to step onto the court (locks your mouse). Move with WASD, aim by looking around with the mouse, scroll to adjust launch angle (hold Shift to adjust power instead, or use Q/E). Click to shoot.' },
          { heading: 'Goal', body: 'Make as many shots as you can. Try each preset distance — Free Throw, 3-Point, and the Half-Court Heave — and watch your field-goal % and streak.' },
        ]}
      />

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 shrink-0 border-b border-slate-800 flex-wrap"
        style={{ background: '#0c1225' }}>
        <span className="text-lg leading-none">🏀</span>
        <span className="text-sm font-semibold text-slate-200">Basketball Lab — First Person</span>

        {/* Shot spot presets */}
        <div className="flex items-center gap-1 ml-2">
          {SHOT_SPOTS.map(spot => (
            <button key={spot.label} onClick={() => goToSpot(spot.dist)}
              className="px-2 py-1 text-[11px] font-mono rounded hover:opacity-80 transition-opacity"
              style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }}>
              {spot.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Score + streak */}
        <div className="flex items-center gap-1.5 font-mono text-sm">
          <span className="text-emerald-400">{makes}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{attempts}</span>
          <span className="text-slate-600 text-xs ml-1">{fgPct}% FG</span>
          {streak >= 2 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs font-bold rounded"
              style={{ background: '#7c2d12', color: '#fdba74' }}>🔥 {streak} streak</span>
          )}
        </div>

        {/* Launch angle + Power bar */}
        <div className="flex items-center gap-2 ml-3">
          <span className="text-xs text-slate-500 font-mono">Angle</span>
          <span className="text-sm font-bold font-mono" style={{ color: '#fbbf24', minWidth: 42 }}>
            {Math.round(launchAngle * 180 / Math.PI)}°
          </span>
          <span className="text-xs text-slate-500 font-mono ml-1">Power</span>
          <div className="relative w-20 h-2 rounded overflow-hidden" style={{ background: '#1e293b' }}>
            <div className="absolute inset-y-0 left-0 rounded transition-all duration-75"
              style={{ width: `${power * 100}%`, background: `hsl(${120 - power * 120},75%,52%)` }} />
          </div>
          <span className="text-xs font-mono text-amber-400 w-8 text-right">{Math.round(power * 100)}%</span>
        </div>
        {slowMo && (
          <div className="ml-2 px-2 py-0.5 text-xs font-bold rounded"
            style={{ background: '#7c3aed', color: '#e9d5ff' }}>SLO-MO</div>
        )}

        <button onClick={onClose}
          className="ml-3 px-2.5 py-1 text-xs rounded font-mono"
          style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }}>
          ✕ Close
        </button>
      </div>

      {/* ── 3D viewport ──────────────────────────────────────────────────── */}
      <div ref={mountRef} className="flex-1 relative overflow-hidden" style={{ cursor: locked ? 'none' : 'default', touchAction: 'none' }}>

        {/* HUD canvas (crosshair + power ring) */}
        <canvas ref={hudRef} className="absolute inset-0 pointer-events-none"
          style={{ width: '100%', height: '100%' }} />

        {/* Shot feedback */}
        {feedback && (
          <div className="absolute inset-x-0 pointer-events-none flex justify-center"
            style={{ top: '28%' }}>
            <span className="text-4xl font-black" style={{
              color: feedback.includes('SWISH') || feedback.includes('BANK') ? '#4ade80'
                   : feedback.includes('BUCKET') || feedback.includes('Rattle') ? '#fbbf24'
                   : '#f87171',
              textShadow: '0 0 40px currentColor, 0 2px 8px rgba(0,0,0,0.9)',
            }}>{feedback}</span>
          </div>
        )}

        {/* Click/tap-to-play overlay */}
        {!active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
            <div className="text-7xl mb-5 select-none">🏀</div>
            <div className="text-2xl font-bold text-white mb-1">Basketball Physics Lab</div>
            <div className="text-slate-400 text-sm mb-8">First-person shooting — you're at the line</div>
            <button
              style={{ background: '#ea5a0a', borderRadius: 12 }}
              className="px-7 py-3 text-white font-bold text-lg hover:opacity-90 transition-opacity"
              onClick={() => {
                if (!audioCtxRef.current) {
                  const AC = window.AudioContext || window.webkitAudioContext
                  if (AC) audioCtxRef.current = new AC()
                }
                if (isTouch) { gs.current.touchActive = true; setTouchActive(true) }
                else rendererRef.current?.domElement.requestPointerLock()
              }}>
              {isTouch ? 'Tap to Step on the Court' : 'Click to Step on the Court'}
            </button>
            {isTouch ? (
              <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-1 text-xs font-mono text-slate-500">
                <span>Drag</span><span className="text-slate-400">Aim</span>
                <span>Tap (no drag)</span><span className="text-slate-400">Shoot</span>
                <span>Sliders</span><span className="text-slate-400">Angle / power</span>
                <span>Spot buttons</span><span className="text-slate-400">Change distance</span>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-1 text-xs font-mono text-slate-500">
                <span>W A S D</span><span className="text-slate-400">Move</span>
                <span>Mouse</span><span className="text-slate-400">Look / horizontal aim</span>
                <span>Scroll</span><span className="text-slate-400">Launch angle</span>
                <span>Shift+Scroll / Q,E</span><span className="text-slate-400">Power</span>
                <span>P</span><span className="text-slate-400">Slow-mo (flight)</span>
                <span>Click</span><span className="text-slate-400">Shoot</span>
                <span>R</span><span className="text-slate-400">Reset ball</span>
                <span>V</span><span className="text-slate-400">Replay last shot</span>
                <span>Esc</span><span className="text-slate-400">Unlock mouse</span>
              </div>
            )}
          </div>
        )}

        {/* In-game controls hint (dims after first shot) */}
        {active && attempts === 0 && (
          <div className="absolute bottom-5 inset-x-0 flex justify-center pointer-events-none">
            <div className="flex gap-5 text-xs font-mono text-slate-500 bg-black/40 px-4 py-2 rounded-lg">
              {isTouch ? (
                <>
                  <span>Drag—aim</span>
                  <span>Tap—shoot</span>
                  <span>Sliders—angle/power</span>
                </>
              ) : (
                <>
                  <span>WASD—move</span>
                  <span>Scroll—angle</span>
                  <span>Q,E—power</span>
                  <span>P—slo-mo</span>
                  <span>Click—shoot</span>
                  <span>R—reset | V—replay</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* What-now prompt after a shot resolves — was easy to miss before,
            and "you can move during replay" wasn't communicated at all. */}
        {active && showReplay && !isTouch && (
          <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top: '40%' }}>
            <div className="flex items-center gap-3 text-sm font-mono bg-black/75 px-5 py-2.5 rounded-xl"
              style={{ border: '1px solid rgba(245,158,11,0.5)' }}>
              <span className="text-amber-400 font-bold">V</span><span className="text-slate-300">replay shot (move freely to watch from anywhere)</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400 font-bold">R</span><span className="text-slate-300">shoot again</span>
            </div>
          </div>
        )}

        {/* Side-view physics panel */}
        {active && (
          <div className="absolute pointer-events-none" style={{ bottom: 12, left: 12 }}>
            <canvas ref={sideCanvasRef} style={{ display: 'block', borderRadius: 8 }} />
          </div>
        )}

        {/* Touch-only angle/power controls — no scroll wheel on mobile */}
        {touchActive && (
          <div className="absolute bottom-3 right-3 flex flex-col gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(0,0,0,0.55)', width: 160 }}>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-amber-400">Angle {Math.round(launchAngle * 180 / Math.PI)}°</span>
              <input type="range" min={0.05} max={1.3} step={0.01} value={launchAngle}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  gs.current.launchAngle = v; setLaunchAngle(v)
                }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-emerald-400">Power {Math.round(power * 100)}%</span>
              <input type="range" min={0.05} max={1} step={0.01} value={power}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  gs.current.power = v; setPower(v)
                }} />
            </label>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── HUD draw (crosshair + power arc) ─────────────────────────────────────────
function drawHud(canvas, gs, w, h) {
  if (!canvas) return
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w, h)
  if (!gs.locked && !gs.touchActive) return

  const cx = w / 2, cy = h / 2

  // Outer power ring
  const ringR = 28
  ctx.strokeStyle = `hsl(${120 - gs.power * 120},75%,52%)`
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + gs.power * Math.PI * 2)
  ctx.stroke()

  // Crosshair lines
  ctx.strokeStyle = 'rgba(255,255,255,0.82)'
  ctx.lineWidth = 1.5
  ctx.lineCap = 'square'
  const CL = 11, GAP = 5
  ctx.beginPath()
  ctx.moveTo(cx - CL - GAP, cy); ctx.lineTo(cx - GAP, cy)
  ctx.moveTo(cx + GAP, cy);     ctx.lineTo(cx + CL + GAP, cy)
  ctx.moveTo(cx, cy - CL - GAP); ctx.lineTo(cx, cy - GAP)
  ctx.moveTo(cx, cy + GAP);     ctx.lineTo(cx, cy + CL + GAP)
  ctx.stroke()

  // Centre dot
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.beginPath(); ctx.arc(cx, cy, 1.8, 0, Math.PI * 2); ctx.fill()
}

// ─── Side-view physics panel ────────────────────────────────────────────────────────────
function drawSidePanel(canvas, gs, camera, ball) {
  const CW = 262, CH = 188
  if (!canvas) return
  if (canvas.width !== CW || canvas.height !== CH) { canvas.width = CW; canvas.height = CH }
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, CW, CH)

  // Background
  ctx.fillStyle = 'rgba(2,8,22,0.9)'
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(0, 0, CW, CH, 8); else ctx.rect(0, 0, CW, CH)
  ctx.fill()
  ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 1
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(0.5, 0.5, CW - 1, CH - 1, 8); else ctx.rect(0.5, 0.5, CW - 1, CH - 1)
  ctx.stroke()

  const BASKET_Z  = COURT_L / 2 - 1.2
  const playerZ   = camera?.position?.z ?? (BASKET_Z - 7.7)
  const distToRim = Math.max(0, BASKET_Z - playerZ).toFixed(1)

  // Plot area margins
  const ml = 20, mr = 12, mb = 30, mt = 20
  const plotW = CW - ml - mr, plotH = CH - mt - mb
  const wz0 = playerZ - 0.8, wz1 = BASKET_Z + 1.8
  const wy0 = -0.3, wy1 = 5.8
  const sx = z => ml + (z - wz0) / (wz1 - wz0) * plotW
  const sy = y => CH - mb - (y - wy0) / (wy1 - wy0) * plotH

  // Title
  ctx.font = 'bold 9px monospace'
  if (gs.phase === 'replay') {
    ctx.fillStyle = '#f59e0b'; ctx.fillText('● REPLAY', ml + 60, 13)
    ctx.fillStyle = '#475569'; ctx.fillText('SIDE VIEW', ml, 13)
  } else {
    ctx.fillStyle = '#334155'; ctx.fillText('SIDE VIEW', ml, 13)
  }

  // Floor line
  ctx.strokeStyle = '#7c3f1a'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(ml, sy(0)); ctx.lineTo(ml + plotW, sy(0)); ctx.stroke()

  // Rim height dashed reference
  ctx.strokeStyle = 'rgba(249,115,22,0.2)'; ctx.lineWidth = 1; ctx.setLineDash([2, 5])
  ctx.beginPath(); ctx.moveTo(ml, sy(RIM_HEIGHT)); ctx.lineTo(ml + plotW, sy(RIM_HEIGHT)); ctx.stroke()
  ctx.setLineDash([])
  ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(249,115,22,0.4)'
  ctx.fillText('3.05m', ml + 2, sy(RIM_HEIGHT) - 2)

  // Basket pole
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(sx(BASKET_Z), sy(0)); ctx.lineTo(sx(BASKET_Z), sy(RIM_HEIGHT + 0.6)); ctx.stroke()

  // Backboard
  ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 3
  const bbWZ = BASKET_Z + BACKBOARD_Z
  ctx.beginPath(); ctx.moveTo(sx(bbWZ), sy(BB_Y_BOT)); ctx.lineTo(sx(bbWZ), sy(BB_Y_BOT + BACKBOARD_H)); ctx.stroke()

  // Rim bar
  ctx.strokeStyle = '#f97316'; ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(sx(BASKET_Z - RIM_RADIUS), sy(RIM_HEIGHT))
  ctx.lineTo(sx(BASKET_Z + RIM_RADIUS), sy(RIM_HEIGHT))
  ctx.stroke()

  // Player dot — use actual launch origin height, not eye height
  const LAUNCH_H   = PLAYER_EYE - 0.25
  const plsx = sx(playerZ), plsy = sy(LAUNCH_H)
  ctx.fillStyle = '#3b82f6'
  ctx.beginPath(); ctx.arc(plsx, plsy, 4, 0, Math.PI * 2); ctx.fill()

  // Arc preview (aim phase only)
  if (gs.phase === 'aim') {
    const speed = gs.power * 10 + 7
    const pitch = gs.launchAngle  // launch angle, not camera pitch
    const dz = Math.cos(pitch), dy = Math.sin(pitch)
    let pz2 = playerZ + dz * 0.3, py2 = LAUNCH_H
    let vz2 = dz * speed, vy2 = dy * speed
    const dt2 = 0.045

    const bbwz2 = BASKET_Z + BACKBOARD_Z
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(sx(pz2), sy(py2))
    for (let i = 0; i < 80; i++) {
      vy2 += GRAVITY * dt2; pz2 += vz2 * dt2; py2 += vy2 * dt2
      if (vz2 > 0 && pz2 >= bbwz2 - BALL_RADIUS && py2 > BB_Y_BOT - BALL_RADIUS && py2 < BB_Y_BOT + BACKBOARD_H + BALL_RADIUS)
        { pz2 = bbwz2 - BALL_RADIUS; vz2 *= -0.82; vy2 *= 0.9 }
      if (py2 < BALL_RADIUS && vy2 < 0) { py2 = BALL_RADIUS; vy2 *= -0.45; vz2 *= 0.8 }
      if (py2 < -0.5 || pz2 > wz1 + 1) break
      ctx.lineTo(sx(pz2), sy(py2))
    }
    ctx.stroke(); ctx.setLineDash([])

    // Angle indicator line from actual launch origin
    const lineLen = 22
    ctx.strokeStyle = 'rgba(251,191,36,0.6)'; ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(plsx, plsy)
    ctx.lineTo(plsx + Math.cos(-pitch) * lineLen, plsy + Math.sin(-pitch) * lineLen)
    ctx.stroke()

    // Horizontal reference from launch origin
    ctx.strokeStyle = 'rgba(100,116,139,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([3, 4])
    ctx.beginPath(); ctx.moveTo(plsx, plsy); ctx.lineTo(plsx + lineLen + 6, plsy); ctx.stroke()
    ctx.setLineDash([])

    // Angle label
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#fbbf24'
    ctx.fillText((pitch * 180 / Math.PI).toFixed(1) + '°', plsx + lineLen + 7, plsy - 2)
  }

  // Ball tracking dot (flight / replay / done)
  if (ball?.visible) {
    const bsx = sx(ball.position.z), bsy = sy(ball.position.y)
    ctx.fillStyle = '#f97316'
    ctx.beginPath(); ctx.arc(bsx, bsy, 5, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5; ctx.stroke()
  }

  // Stats row
  const statSpeed = (gs.power * 10 + 7).toFixed(1)
  const statAngle = (gs.launchAngle * 180 / Math.PI).toFixed(1)
  ctx.font = '9px monospace'
  ctx.fillStyle = '#fbbf24'; ctx.fillText(statAngle + '°', ml, CH - mb + 15)
  ctx.fillStyle = '#4ade80'; ctx.fillText(statSpeed + 'm/s', ml + 46, CH - mb + 15)
  ctx.fillStyle = '#60a5fa'; ctx.fillText(distToRim + 'm dist', ml + 106, CH - mb + 15)

  // Spin indicator (backspin symbol, top-right)
  const spx = CW - 26, spy = 32
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(spx, spy, 12, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 2; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(spx, spy, 12, 0.45, Math.PI * 1.65); ctx.stroke()
  const tipA = Math.PI * 1.65
  const tx = spx + Math.cos(tipA) * 12, ty = spy + Math.sin(tipA) * 12
  const ta = tipA + Math.PI / 2
  ctx.beginPath()
  ctx.moveTo(tx - Math.cos(ta) * 4, ty - Math.sin(ta) * 4)
  ctx.lineTo(tx, ty)
  ctx.lineTo(tx - Math.cos(ta - 0.8) * 4, ty - Math.sin(ta - 0.8) * 4)
  ctx.stroke()
  ctx.lineCap = 'butt'
  ctx.font = '7px monospace'; ctx.fillStyle = '#7c3aed'
  ctx.fillText('spin', spx - 8, spy + 23)
}
