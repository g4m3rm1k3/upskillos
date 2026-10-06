import { useEffect, useRef } from 'react'
import CardAcademy from './CardAcademy.jsx'

function CardsBg() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const SUITS = ['♠', '♥', '♦', '♣']
    const SUIT_COLORS = ['rgba(99,102,241,0.25)', 'rgba(239,68,68,0.25)', 'rgba(239,68,68,0.25)', 'rgba(99,102,241,0.25)']

    let W, H, cards, raf

    function resize() {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }

    function makeCard() {
      const i = Math.floor(Math.random() * 4)
      return {
        suit: SUITS[i],
        color: SUIT_COLORS[i],
        x: Math.random() * W,
        y: -80,
        size: 20 + Math.random() * 30,
        speed: 0.25 + Math.random() * 0.45,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.008,
        opacity: 0.3 + Math.random() * 0.45,
        drift: (Math.random() - 0.5) * 0.3,
      }
    }

    function init() {
      resize()
      cards = Array.from({ length: 28 }, () => {
        const c = makeCard()
        c.y = Math.random() * H
        return c
      })
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      for (const c of cards) {
        c.y += c.speed
        c.x += c.drift
        c.rot += c.rotSpeed
        if (c.y > H + 80) Object.assign(c, makeCard())

        ctx.save()
        ctx.translate(c.x, c.y)
        ctx.rotate(c.rot)
        ctx.globalAlpha = c.opacity

        // card body
        const cw = c.size * 1.5, ch = c.size * 2.1
        ctx.fillStyle = 'rgba(15,10,40,0.55)'
        ctx.strokeStyle = c.color.replace('0.25', '0.7')
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 4)
        ctx.fill()
        ctx.stroke()

        // suit symbol
        ctx.fillStyle = c.color.replace('0.25', '0.9')
        ctx.font = `${c.size}px serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(c.suit, 0, 0)

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

export default function CardAcademyPage() {
  useEffect(() => {
    document.title = 'STEM Card Academy — UpSkillOS'
    return () => { document.title = 'UpSkillOS' }
  }, [])

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(ellipse at 60% 25%, #130826 0%, #06040e 55%, #0d0520 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'auto',
      zIndex: 1700,
    }}>
      <CardsBg />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <CardAcademy />
      </div>
    </div>
  )
}
