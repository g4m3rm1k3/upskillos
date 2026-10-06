import { useEffect, useRef } from 'react'
import StemTetris from './StemTetris.jsx'

// Animated falling tetromino background
function TetrisBg() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const SHAPES = [
      [[0,0],[1,0],[0,1],[1,1]],          // O
      [[0,0],[1,0],[2,0],[3,0]],          // I
      [[0,0],[1,0],[2,0],[2,1]],          // L
      [[0,0],[1,0],[2,0],[0,1]],          // J
      [[1,0],[2,0],[0,1],[1,1]],          // S
      [[0,0],[1,0],[1,1],[2,1]],          // Z
      [[1,0],[0,1],[1,1],[2,1]],          // T
    ]
    const COLORS = [
      'rgba(192,38,211,0.18)',
      'rgba(99,102,241,0.18)',
      'rgba(6,182,212,0.18)',
      'rgba(245,158,11,0.18)',
      'rgba(16,185,129,0.18)',
      'rgba(239,68,68,0.18)',
      'rgba(139,92,246,0.18)',
    ]

    let W, H, pieces, raf

    function resize() {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }

    function makePiece() {
      const i = Math.floor(Math.random() * SHAPES.length)
      const cell = Math.floor(Math.random() * 18) + 14
      const startX = Math.random() * (W - cell * 4)
      return {
        cells: SHAPES[i],
        color: COLORS[i],
        x: startX,
        y: -cell * 4,
        cell,
        speed: 0.3 + Math.random() * 0.5,
        opacity: 0.4 + Math.random() * 0.5,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.005,
      }
    }

    function init() {
      resize()
      pieces = Array.from({ length: 22 }, () => {
        const p = makePiece()
        p.y = Math.random() * H
        return p
      })
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      for (const p of pieces) {
        p.y += p.speed
        p.rot += p.rotSpeed
        if (p.y > H + p.cell * 4) Object.assign(p, makePiece())

        ctx.save()
        const cx = p.x + p.cell * 2
        const cy = p.y + p.cell * 2
        ctx.translate(cx, cy)
        ctx.rotate(p.rot)
        ctx.globalAlpha = p.opacity
        ctx.strokeStyle = p.color.replace('0.18', '0.6')
        ctx.lineWidth = 1.5
        for (const [bx, by] of p.cells) {
          const dx = (bx - 1) * p.cell
          const dy = (by - 1) * p.cell
          ctx.fillStyle = p.color
          ctx.fillRect(dx, dy, p.cell - 2, p.cell - 2)
          ctx.strokeRect(dx, dy, p.cell - 2, p.cell - 2)
        }
        ctx.restore()
      }
      raf = requestAnimationFrame(draw)
    }

    init()
    draw()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}

export default function StemTetrisPage() {
  useEffect(() => {
    document.title = 'STEM Tetris — UpSkillOS'
    return () => { document.title = 'UpSkillOS' }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(ellipse at 20% 30%, #1a0533 0%, #05070f 55%, #0a0118 100%)',
      overflow: 'auto',
      zIndex: 1700,
    }}>
      <TetrisBg />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', padding: '16px 0' }}>
        <StemTetris />
      </div>
    </div>
  )
}
