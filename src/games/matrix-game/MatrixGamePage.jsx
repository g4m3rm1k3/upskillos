import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import MatrixGame from './MatrixGame.jsx'

const SYMBOLS = ['λ', 'σ', '[', ']', '0', '1', '∑', 'T', '→', 'ε', 'δ', 'v', 'w', '·', 'A', 'I', 'det', 'ker', '⟨', '⟩']

function MathRainBg() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let W, H, columns, raf

    function resize() {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
      const colW = 28
      const count = Math.ceil(W / colW)
      if (!columns || columns.length !== count) {
        columns = Array.from({ length: count }, (_, i) => ({
          x: i * colW + colW / 2,
          y: Math.random() * H,
          speed: 0.4 + Math.random() * 0.7,
          symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          opacity: 0.08 + Math.random() * 0.14,
          switchTimer: Math.random() * 80,
        }))
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      for (const col of columns) {
        col.y += col.speed
        col.switchTimer--
        if (col.switchTimer <= 0) {
          col.symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
          col.switchTimer = 40 + Math.random() * 100
        }
        if (col.y > H + 20) {
          col.y = -20
          col.speed = 0.4 + Math.random() * 0.7
          col.opacity = 0.08 + Math.random() * 0.14
        }

        ctx.save()
        ctx.globalAlpha = col.opacity
        ctx.fillStyle = '#4ac8ff'
        ctx.font = `${11 + Math.random() * 3}px 'Courier New', monospace`
        ctx.textAlign = 'center'
        ctx.fillText(col.symbol, col.x, col.y)
        ctx.restore()
      }
      raf = requestAnimationFrame(draw)
    }

    resize()
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

export default function MatrixGamePage({ onBack, onClose }) {
  const navigate = useNavigate()
  // Opened as a route, "back" should leave the page; opened inside the desktop
  // window manager, it should just close that window instead of changing the URL.
  const handleBack = onBack || onClose || (() => navigate('/games'))

  useEffect(() => {
    document.title = 'Linear Algebra — UpSkillOS'
    return () => { document.title = 'UpSkillOS' }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(ellipse at 25% 15%, #051428 0%, #04080f 55%, #080420 100%)',
      overflow: 'auto',
      zIndex: 1700,
    }}>
      <MathRainBg />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
        <MatrixGame onBack={handleBack} />
      </div>
    </div>
  )
}
