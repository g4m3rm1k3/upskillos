import { useRef, useState, useCallback, useEffect } from 'react'
import { useThemeColors } from '../../../hooks/useThemeColors'
import { graphTicks, validGraphBounds } from './graphBounds'

const GRAPH_COLORS = ['#60a5fa','#34d399','#f472b6','#fb923c']

interface Props {
  fns?: ((x: number) => number)[]
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  width?: number
  height?: number
  highlightRoots?: number[]
}

interface Trace {
  px: number
  py: number
  x: number
  fnYs: (number | null)[]
  firstY: number | null
}

export default function CanvasGraph({ fns = [], xMin = -10, xMax = 10, yMin = -10, yMax = 10, width = 860, height = 320, highlightRoots = [] }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [trace, setTrace] = useState<Trace | null>(null)
  const C = useThemeColors()
  const valid = validGraphBounds(xMin, xMax) && validGraphBounds(yMin, yMax)

  const toCanvasY = useCallback((y: number) => height - ((y - yMin) / (yMax - yMin)) * height, [yMin, yMax, height])

  useEffect(() => {
    if (!valid) return
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const W = canvas.width, H = canvas.height
    const toX = (x: number) => ((x - xMin) / (xMax - xMin)) * W
    const toY = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H

    ctx.fillStyle = C.canvasSurface; ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = C.canvasBorder; ctx.lineWidth = 1
    const stepX = (xMax - xMin) / 10
    for (const x of graphTicks(xMin, xMax)) { ctx.beginPath(); ctx.moveTo(toX(x),0); ctx.lineTo(toX(x),H); ctx.stroke() }
    const stepY = (yMax - yMin) / 10
    for (const y of graphTicks(yMin, yMax)) { ctx.beginPath(); ctx.moveTo(0,toY(y)); ctx.lineTo(W,toY(y)); ctx.stroke() }

    ctx.strokeStyle = C.canvasMuted; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(toX(0),0); ctx.lineTo(toX(0),H); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0,toY(0)); ctx.lineTo(W,toY(0)); ctx.stroke()

    ctx.fillStyle = C.canvasMuted; ctx.font = '10px monospace'; ctx.textAlign = 'center'
    for (const x of graphTicks(xMin, xMax)) {
      if (Math.abs(x) > stepX*0.1) ctx.fillText(String(parseFloat(x.toPrecision(3))), toX(x), toY(0)+12)
    }
    ctx.textAlign = 'right'
    for (const y of graphTicks(yMin, yMax)) {
      if (Math.abs(y) > stepY*0.1) ctx.fillText(String(parseFloat(y.toPrecision(3))), toX(0)-4, toY(y)+4)
    }

    fns.forEach((fn, idx) => {
      ctx.strokeStyle = GRAPH_COLORS[idx % GRAPH_COLORS.length]; ctx.lineWidth = 2; ctx.beginPath()
      let started = false
      for (let px = 0; px < W; px++) {
        const x = xMin + (px / W) * (xMax - xMin)
        try {
          const y = fn(x)
          if (!isFinite(y) || Math.abs(y) > (yMax - yMin) * 20) { started = false; continue }
          if (!started) { ctx.moveTo(px, toY(y)); started = true } else { ctx.lineTo(px, toY(y)) }
        } catch { started = false }
      }
      ctx.stroke()
    })

    ctx.fillStyle = '#f87171'
    for (const r of highlightRoots) { ctx.beginPath(); ctx.arc(toX(r), toY(0), 5, 0, 2*Math.PI); ctx.fill() }

    if (trace) {
      ctx.strokeStyle = C.canvasHint; ctx.lineWidth = 1; ctx.setLineDash([4,4])
      ctx.beginPath(); ctx.moveTo(trace.px, 0); ctx.lineTo(trace.px, H); ctx.stroke()
      if (trace.py !== null) { ctx.beginPath(); ctx.moveTo(0, trace.py); ctx.lineTo(W, trace.py); ctx.stroke() }
      ctx.setLineDash([])
      trace.fnYs.forEach((py, i) => {
        if (py === null) return
        ctx.fillStyle = GRAPH_COLORS[i % GRAPH_COLORS.length]
        ctx.beginPath(); ctx.arc(trace.px, py, 4, 0, 2*Math.PI); ctx.fill()
      })
    }
  }, [fns, xMin, xMax, yMin, yMax, highlightRoots, trace, toCanvasY, width, height, C, valid])

  const handleMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    const px = (e.clientX - rect.left) * scaleX
    const py = (e.clientY - rect.top) * scaleY
    const x = xMin + (px / width) * (xMax - xMin)
    const fnYs = fns.map(fn => {
      try { const y = fn(x); return isFinite(y) && Math.abs(y) < (yMax-yMin)*20 ? toCanvasY(y) : null } catch { return null }
    })
    const firstY = fnYs.find(y => y !== null) ?? null
    setTrace({ px, py, x, fnYs, firstY })
  }, [fns, xMin, xMax, yMin, yMax, width, height, toCanvasY])

  const traceLabel = trace
    ? `x=${trace.x.toFixed(4)}  ${trace.fnYs.map((py,i) => py!==null ? `y${fns.length>1?i+1:''}=${(yMin + (1 - py/height) * (yMax-yMin)).toFixed(4)}` : '').filter(Boolean).join('  ')}`
    : ''

  if (!valid) return <p role="alert" className="p-4 text-sm text-amber-500">Graph bounds must be finite, with each minimum smaller than its maximum. Use reset bounds to recover.</p>

  return (
    <div className="relative select-none">
      <canvas ref={ref} width={width} height={height}
        className="rounded border border-slate-800 cursor-crosshair"
        style={{width:'100%', height:'auto'}}
        onMouseMove={handleMove}
        onMouseLeave={() => setTrace(null)} />
      <div className={`absolute top-1.5 right-2 font-mono text-xs text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded pointer-events-none transition-opacity ${trace ? 'opacity-100' : 'opacity-0'}`}>
        {traceLabel}
      </div>
    </div>
  )
}
