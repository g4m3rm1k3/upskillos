import { useEffect, useRef } from 'react'
import RobotArmLab from './RobotArmLab.jsx'

function CircuitBg() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W, H, traces, raf

    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    function makeTrace() {
      const x = Math.random() * W, y = Math.random() * H
      const len1 = 30 + Math.random() * 120, len2 = 30 + Math.random() * 120
      const dirs = [[1,0],[-1,0],[0,1],[0,-1]]
      const d1 = dirs[Math.floor(Math.random() * 4)]
      const d2 = Math.random() < 0.5 ? [-d1[1], d1[0]] : [d1[1], -d1[0]]
      return { x, y, segments: [{ dx: d1[0]*len1, dy: d1[1]*len1 }, { dx: d2[0]*len2, dy: d2[1]*len2 }], progress: 0, speed: 0.003 + Math.random() * 0.006, opacity: 0.06 + Math.random() * 0.1, hue: Math.random() < 0.7 ? 200 : 160 }
    }
    function init() { resize(); traces = Array.from({ length: 40 }, () => { const t = makeTrace(); t.progress = Math.random() * 2; return t }) }
    function drawTrace(t) {
      const fade = t.progress < 1 ? t.progress : 2 - t.progress
      const alpha = t.opacity * fade
      if (alpha < 0.005) return
      const totalLen = Math.sqrt(t.segments[0].dx**2 + t.segments[0].dy**2) + Math.sqrt(t.segments[1].dx**2 + t.segments[1].dy**2)
      const drawn = t.progress < 1 ? t.progress * totalLen * 2 : totalLen * 2
      let cx = t.x, cy = t.y, remaining = drawn
      ctx.save(); ctx.strokeStyle = `hsla(${t.hue}, 80%, 60%, ${alpha})`; ctx.lineWidth = 1; ctx.lineCap = 'square'
      for (const seg of t.segments) {
        const segLen = Math.sqrt(seg.dx**2 + seg.dy**2)
        if (remaining <= 0) break
        const draw = Math.min(remaining, segLen)
        const nx = cx + (seg.dx / segLen) * draw, ny = cy + (seg.dy / segLen) * draw
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke()
        if (remaining >= segLen) { ctx.fillStyle = `hsla(${t.hue}, 80%, 70%, ${alpha * 1.5})`; ctx.beginPath(); ctx.arc(nx, ny, 2, 0, Math.PI*2); ctx.fill() }
        cx = nx; cy = ny; remaining -= segLen
      }
      ctx.restore()
    }
    function draw() {
      ctx.clearRect(0, 0, W, H)
      for (const t of traces) { t.progress += t.speed; if (t.progress > 2) Object.assign(t, makeTrace(), { progress: 0 }); drawTrace(t) }
      raf = requestAnimationFrame(draw)
    }
    init(); draw()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}

export const meta = {
  label: 'Robot Arm Simulator',
  emoji: '🦾',
  color: 'teal',
  desc: 'Learn robot programming from zero — trig, FK, IK, 4×4 transforms, obstacle avoidance, Fanuc TP. 19 missions, 2D + 6-DOF 3D arm, real Python & MATLAB.',
  tags: ['Robotics', 'Python', 'MATLAB'],
  cover: { grad: 'from-teal-700 via-cyan-800 to-blue-950', mark: '🦾', sub: 'FK · IK · Fanuc TP' },
}

export default function RobotArmSimEntry({ onBack }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 20% 10%, #091520 0%, #07090f 55%, #0a1008 100%)', overflow: 'hidden', zIndex: 1700, display: 'flex', justifyContent: 'center' }}>
      <CircuitBg />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1300px', height: '100%' }}>
        <RobotArmLab onBack={onBack} />
      </div>
    </div>
  )
}
