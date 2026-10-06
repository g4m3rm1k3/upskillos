import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DroneLab from './DroneLab.jsx'

function SkyBg() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W, H, particles, raf
    
    // We want the particles to be slightly adaptive to theme if possible, but they're drawn in canvas.
    // Let's just make them somewhat neutral bright cyan/blue.
    
    function resize() {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }

    function makeParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.1 - Math.random() * 0.4,
        size: 0.5 + Math.random() * 1.5,
        opacity: 0.02 + Math.random() * 0.08,
        hue: Math.random() < 0.6 ? 200 : 160,
      }
    }

    function init() {
      resize()
      particles = Array.from({ length: 80 }, () => {
        const p = makeParticle()
        p.y = Math.random() * H
        return p
      })
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -4 || p.x < -4 || p.x > W + 4) Object.assign(p, makeParticle(), { y: H + 2 })
        // Check if dark mode is active. (Rough heuristic from body background or just use a fixed color that works in both)
        const isDark = document.documentElement.classList.contains('dark') || true;
        const colorBase = isDark ? `hsla(${p.hue}, 80%, 65%, ${p.opacity})` : `hsla(${p.hue}, 90%, 40%, ${p.opacity * 1.5})`;
        ctx.fillStyle = colorBase;
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
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
      className="fixed inset-0 z-0 pointer-events-none opacity-50 dark:opacity-100"
    />
  )
}

export default function DroneLabPage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Drone Lab — UpSkillOS'
    return () => { document.title = 'UpSkillOS' }
  }, [])

  return (
    <div className="fixed inset-0 z-[1700] flex justify-center bg-slate-50 dark:bg-[#07090f] overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_30%_0%,rgba(14,165,233,0.1)_0%,transparent_60%)] dark:bg-[radial-gradient(ellipse_at_30%_0%,#091825_0%,transparent_60%)] z-0" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.03] z-0"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,currentColor 39px,currentColor 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,currentColor 39px,currentColor 40px)' }} />
      <SkyBg />
      <div className="relative z-10 w-full max-w-[1600px] h-full shadow-2xl">
        <DroneLab onBack={() => navigate('/')} />
      </div>
    </div>
  )
}
