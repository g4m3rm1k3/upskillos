import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import CardQuest from './CardQuest.jsx'

function DiceParticles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅', '♠', '♥', '♦', '♣']

    let W, H, particles, raf

    function resize() {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }

    function makeParticle() {
      return {
        symbol: FACES[Math.floor(Math.random() * FACES.length)],
        x: Math.random() * W,
        y: -40,
        size: 14 + Math.random() * 18,
        speed: 0.3 + Math.random() * 0.5,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.01,
        opacity: 0.15 + Math.random() * 0.3,
        drift: (Math.random() - 0.5) * 0.25,
      }
    }

    function init() {
      resize()
      particles = Array.from({ length: 30 }, () => {
        const p = makeParticle()
        p.y = Math.random() * H
        return p
      })
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      for (const p of particles) {
        p.y += p.speed
        p.x += p.drift
        p.rot += p.rotSpeed
        if (p.y > H + 40) Object.assign(p, makeParticle())
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = p.opacity
        ctx.font = `${p.size}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#a5b4fc'
        ctx.fillText(p.symbol, 0, 0)
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

export default function CardQuestPage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Card Quest — UpSkillOS'
    return () => { document.title = 'UpSkillOS' }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(ellipse at 50% 20%, #0f1729 0%, #080c18 60%, #0a0f1e 100%)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      overflow: 'auto',
      zIndex: 1700,
    }}>
      <DiceParticles />
      {/* Back to Games button — always visible, top-left corner */}
      <button
        onClick={() => navigate('/games')}
        style={{
          position: 'fixed',
          top: 14,
          left: 14,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 8,
          background: 'rgba(15,23,42,0.75)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(99,102,241,0.4)',
          color: '#a5b4fc',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        ← Games
      </button>
      <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
        <CardQuest />
      </div>
    </div>
  )
}
