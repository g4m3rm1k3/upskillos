// FigureRenderer.jsx
// Reads a JSON figure description from the Python opencalc library
// and renders it on a canvas using the same patterns as the hand-built vizzes.
// This is NOT a viz itself — it is a rendering engine used by PythonNotebook.

import { useEffect, useRef } from 'react'

function getNiceTickStep(min, max, targetCount = 8) {
  const range = Math.abs(max - min) || 1
  const raw = range / Math.max(targetCount, 2)
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  let step = magnitude
  if (normalized > 5) step = 10 * magnitude
  else if (normalized > 2) step = 5 * magnitude
  else if (normalized > 1) step = 2 * magnitude
  return step
}

// ── CSS variable resolution ────────────────────────────────────────────────────
// The canvas 2D API cannot resolve "rgb(var(--tw-custom-slate-800))" — it
// needs a concrete color. This helper reads the computed channel values and
// builds a proper rgb() string. Called at draw-time so the figure always
// reflects the active studio theme (not just dark/light mode).
function resolveCSSColor(expr, fallback) {
  if (!expr) return fallback
  if (expr.startsWith('#') || (expr.startsWith('rgb') && !expr.includes('var('))) return expr
  const m = expr.match(/var\((--[\w-]+)\)/)
  if (!m) return fallback ?? expr
  const channels = getComputedStyle(document.documentElement).getPropertyValue(m[1]).trim()
  return channels ? `rgb(${channels})` : (fallback ?? expr)
}

// ── Color token mapping ────────────────────────────────────────────────────────
// Takes the draw-time resolved color set `cc` (built in draw() below).
function resolveColor(name, cc) {
  const map = {
    blue:   cc.blue,
    amber:  cc.amber,
    green:  cc.green,
    red:    cc.red,
    purple: cc.purple,
    teal:   cc.teal,
    gray:   cc.hint,
    muted:  cc.muted,
    text:   cc.text,
    border: cc.border,
    hint:   cc.hint,
    white: '#ffffff', black: '#000000',
  }
  return map[name] || name
}

// ── FigureRenderer ────────────────────────────────────────────────────────────
export default function FigureRenderer({ figureJson, C }) {
  const canvasRef = useRef(null)
  const roRef = useRef(null)

  useEffect(() => {
    // Parse figure data
    let fig
    try {
      fig = typeof figureJson === 'string' ? JSON.parse(figureJson) : figureJson
    } catch (e) {
      return
    }
    if (!fig || fig.type !== 'opencalc_figure') return

    const draw = () => {
      const cv = canvasRef.current; if (!cv) return

      // Resolve CSS variable strings to concrete colors at draw-time.
      // This means the canvas updates whenever the studio theme changes its
      // CSS custom properties — not just on dark/light toggle.
      const cc = {
        surface: resolveCSSColor(C.surface, C.canvasSurface),
        text:    resolveCSSColor(C.text,    C.canvasText),
        muted:   resolveCSSColor(C.muted,   C.canvasMuted),
        hint:    resolveCSSColor(C.hint,    C.canvasHint),
        border:  resolveCSSColor(C.border,  C.canvasBorder),
        blue:    resolveCSSColor(C.blue,    C.canvasBlue),
        // Categorical colors are already concrete hex — pass through
        amber: C.amber, green: C.green, red: C.red, purple: C.purple, teal: C.teal,
      }

      // Canvas sizing
      const canvasW = cv.offsetWidth || 600
      const canvasH = fig.square
        ? canvasW
        : (fig.height || Math.min(canvasW * 0.65, 400))
      cv.width = canvasW
      cv.height = canvasH

      const ctx = cv.getContext('2d')
      ctx.clearRect(0, 0, canvasW, canvasH)

      // Background
      ctx.fillStyle = cc.surface
      ctx.fillRect(0, 0, canvasW, canvasH)

      // Layout padding
      const titleH = fig.title ? 28 : 0
      const pl = 52, pr = 16, pt = 16 + titleH, pb = 36
      const iw = canvasW - pl - pr
      const ih = canvasH - pt - pb

      // Data range
      let { xmin, xmax, ymin, ymax } = fig
      if (fig.axisMode === 'equal') {
        const xRange = xmax - xmin || 1
        const yRange = ymax - ymin || 1
        const xCenter = (xmin + xmax) / 2
        const yCenter = (ymin + ymax) / 2
        const plotAspect = iw / Math.max(ih, 1)
        const dataAspect = xRange / yRange
        if (dataAspect > plotAspect) {
          const nextYRange = xRange / plotAspect
          ymin = yCenter - nextYRange / 2
          ymax = yCenter + nextYRange / 2
        } else {
          const nextXRange = yRange * plotAspect
          xmin = xCenter - nextXRange / 2
          xmax = xCenter + nextXRange / 2
        }
      }

      // Coordinate transform functions
      const toX = dx => pl + ((dx - xmin) / (xmax - xmin)) * iw
      const toY = dy => pt + ih - ((dy - ymin) / (ymax - ymin)) * ih
      const scaleX = dx => (dx / (xmax - xmin)) * iw
      const scaleY = dy => (dy / (ymax - ymin)) * ih

      // Title
      if (fig.title) {
        ctx.fillStyle = cc.text
        ctx.font = '500 14px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(fig.title, canvasW / 2, 20)
      }

      // ── Draw clip region so elements don't overflow ──────────────────────
      ctx.save()
      ctx.beginPath()
      ctx.rect(pl - 2, pt - 2, iw + 4, ih + 4)
      ctx.clip()

      // ── Render each element ──────────────────────────────────────────────
      for (const el of fig.elements) {
        ctx.save()
        ctx.globalAlpha = el.alpha ?? 1.0

        switch (el.type) {

          case 'grid': {
            const step = el.step || 1
            ctx.strokeStyle = resolveColor(el.color || 'border', cc)
            ctx.lineWidth = 1
            // vertical lines
            for (let x = Math.ceil(xmin / step) * step; x <= xmax; x += step) {
              ctx.beginPath(); ctx.moveTo(toX(x), pt); ctx.lineTo(toX(x), pt + ih); ctx.stroke()
            }
            // horizontal lines
            for (let y = Math.ceil(ymin / step) * step; y <= ymax; y += step) {
              ctx.beginPath(); ctx.moveTo(pl, toY(y)); ctx.lineTo(pl + iw, toY(y)); ctx.stroke()
            }
            break
          }

          case 'axes': {
            ctx.strokeStyle = cc.hint; ctx.lineWidth = 1.5
            // x-axis
            ctx.beginPath(); ctx.moveTo(pl, toY(0)); ctx.lineTo(pl + iw, toY(0)); ctx.stroke()
            // y-axis
            ctx.beginPath(); ctx.moveTo(toX(0), pt); ctx.lineTo(toX(0), pt + ih); ctx.stroke()
            if (el.ticks !== false) {
              const xStep = getNiceTickStep(xmin, xmax, Math.max(4, Math.floor(iw / 90)))
              const yStep = getNiceTickStep(ymin, ymax, Math.max(4, Math.floor(ih / 44)))
              ctx.fillStyle = cc.hint; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
              for (let x = Math.ceil(xmin / xStep) * xStep; x <= xmax + xStep * 0.25; x += xStep) {
                if (Math.abs(x) < 1e-9) continue
                ctx.fillText(Number(x.toFixed(6)), toX(x), toY(0) + 14)
              }
              ctx.textAlign = 'right'
              for (let y = Math.ceil(ymin / yStep) * yStep; y <= ymax + yStep * 0.25; y += yStep) {
                if (Math.abs(y) < 1e-9) continue
                ctx.fillText(Number(y.toFixed(6)), toX(0) - 4, toY(y) + 4)
              }
            }
            break
          }

          case 'arrow': {
            const sx = toX(el.start[0]), sy = toY(el.start[1])
            const ex = toX(el.end[0]),   ey = toY(el.end[1])
            const color = resolveColor(el.color || 'blue', cc)
            const angle = Math.atan2(ey - sy, ex - sx)
            const hl = 10

            if (el.dashed) ctx.setLineDash([5, 4])
            ctx.strokeStyle = color; ctx.lineWidth = el.width || 2.5
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke()
            ctx.setLineDash([])

            ctx.fillStyle = color; ctx.beginPath()
            ctx.moveTo(ex, ey)
            ctx.lineTo(ex - hl * Math.cos(angle - 0.4), ey - hl * Math.sin(angle - 0.4))
            ctx.lineTo(ex - hl * Math.cos(angle + 0.4), ey - hl * Math.sin(angle + 0.4))
            ctx.fill()

            if (el.label) {
              ctx.fillStyle = color; ctx.font = '500 12px sans-serif'; ctx.textAlign = 'center'
              ctx.fillText(el.label,
                ex + 16 * Math.cos(angle + Math.PI / 4),
                ey + 16 * Math.sin(angle + Math.PI / 4))
            }
            break
          }

          case 'line': {
            const color = resolveColor(el.color || 'muted', cc)
            if (el.dashed) ctx.setLineDash([5, 4])
            ctx.strokeStyle = color; ctx.lineWidth = el.width || 1.5
            ctx.beginPath()
            ctx.moveTo(toX(el.start[0]), toY(el.start[1]))
            ctx.lineTo(toX(el.end[0]),   toY(el.end[1]))
            ctx.stroke()
            ctx.setLineDash([])
            break
          }

          case 'point': {
            const px = toX(el.pos[0]), py = toY(el.pos[1])
            const color = resolveColor(el.color || 'amber', cc)
            ctx.fillStyle = color
            ctx.beginPath(); ctx.arc(px, py, el.radius || 6, 0, Math.PI * 2); ctx.fill()
            if (el.label) {
              ctx.fillStyle = color; ctx.font = '500 12px sans-serif'; ctx.textAlign = 'center'
              ctx.fillText(el.label, px, py - 10)
            }
            break
          }

          case 'curve': {
            const color = resolveColor(el.color || 'blue', cc)
            const xs = el.xs, ys = el.ys
            // Filled region first (under the curve)
            if (el.fill) {
              ctx.beginPath()
              let started = false
              const fillAlpha = el.fill_alpha || 0.15
              for (let i = 0; i < xs.length; i++) {
                if (ys[i] == null || !isFinite(ys[i])) { started = false; continue }
                const px = toX(xs[i]), py = toY(ys[i])
                if (!started) { ctx.moveTo(px, toY(0)); ctx.lineTo(px, py); started = true }
                else ctx.lineTo(px, py)
              }
              ctx.lineTo(toX(xs[xs.length - 1]), toY(0))
              ctx.closePath()
              ctx.fillStyle = color; ctx.globalAlpha = fillAlpha; ctx.fill()
              ctx.globalAlpha = el.alpha ?? 1.0
            }
            // Curve line
            ctx.strokeStyle = color; ctx.lineWidth = el.width || 2.5
            if (el.dashed) ctx.setLineDash([8, 5])
            ctx.beginPath()
            let started = false
            for (let i = 0; i < xs.length; i++) {
              if (ys[i] == null || !isFinite(ys[i])) { started = false; continue }
              const px = toX(xs[i]), py = toY(ys[i])
              if (py < pt - 10 || py > pt + ih + 10) { started = false; continue }
              started ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
              started = true
            }
            ctx.stroke()
            if (el.dashed) ctx.setLineDash([])
            // Label at midpoint
            if (el.label) {
              const mid = Math.floor(xs.length / 2)
              if (ys[mid] != null && isFinite(ys[mid])) {
                ctx.fillStyle = color; ctx.font = '500 12px sans-serif'; ctx.textAlign = 'left'
                ctx.fillText(el.label, toX(xs[mid]) + 6, toY(ys[mid]) - 6)
              }
            }
            break
          }

          case 'scatter': {
            const color = resolveColor(el.color || 'blue', cc)
            ctx.fillStyle = color
            for (let i = 0; i < el.xs.length; i++) {
              const px = toX(el.xs[i]), py = toY(el.ys[i])
              ctx.beginPath(); ctx.arc(px, py, el.radius || 4, 0, Math.PI * 2); ctx.fill()
              if (el.labels && el.labels[i]) {
                ctx.fillStyle = color; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
                ctx.fillText(el.labels[i], px, py - 8)
              }
            }
            break
          }

          case 'region': {
            const color = resolveColor(el.color || 'blue', cc)
            ctx.beginPath()
            let started = false
            for (let i = 0; i < el.xs.length; i++) {
              if (el.tops[i] == null) { started = false; continue }
              const px = toX(el.xs[i]), py = toY(el.tops[i])
              started ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
              started = true
            }
            for (let i = el.xs.length - 1; i >= 0; i--) {
              if (el.bottoms[i] == null) continue
              ctx.lineTo(toX(el.xs[i]), toY(el.bottoms[i]))
            }
            ctx.closePath()
            ctx.fillStyle = color; ctx.globalAlpha = el.alpha || 0.2; ctx.fill()
            break
          }

          case 'text': {
            const color = resolveColor(el.color || 'text', cc)
            ctx.fillStyle = color
            ctx.font = `${el.bold ? '500 ' : ''}${el.size || 13}px sans-serif`
            ctx.textAlign = el.align || 'center'
            ctx.fillText(el.content, toX(el.pos[0]), toY(el.pos[1]))
            break
          }

          case 'polygon': {
            if (!el.points || el.points.length < 2) break
            const color = resolveColor(el.color || 'blue', cc)
            ctx.beginPath()
            ctx.moveTo(toX(el.points[0][0]), toY(el.points[0][1]))
            for (let i = 1; i < el.points.length; i++)
              ctx.lineTo(toX(el.points[i][0]), toY(el.points[i][1]))
            ctx.closePath()
            if (el.fill) {
              ctx.fillStyle = color; ctx.globalAlpha = el.alpha || 0.2; ctx.fill()
              ctx.globalAlpha = 1
            }
            if (el.stroke !== false) {
              ctx.strokeStyle = color; ctx.lineWidth = el.stroke_width || 1.5; ctx.stroke()
            }
            break
          }

          case 'transformed_grid': {
            const { a, b, c, d, range: r = 5, color_h, color_v, alpha: ga = 0.7 } = el
            ctx.globalAlpha = ga
            // matrix = [[a,b],[c,d]] applied as A @ [x,y]: columns [a,c] and [b,d] are the images of î and ĵ
            const T = (x, y) => [toX(a * x + b * y), toY(c * x + d * y)]
            for (let i = -r; i <= r; i++) {
              // vertical lines of original grid
              const [x0,y0] = T(i, -r), [x1,y1] = T(i, r)
              ctx.strokeStyle = i === 0 ? resolveColor(color_v || 'green', C) : resolveColor(color_v || 'green', cc) + '55'
              ctx.lineWidth = i === 0 ? 2 : 1
              ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke()
              // horizontal lines
              const [x2,y2] = T(-r, i), [x3,y3] = T(r, i)
              ctx.strokeStyle = i === 0 ? resolveColor(color_h || 'blue', C) : resolveColor(color_h || 'blue', cc) + '55'
              ctx.lineWidth = i === 0 ? 2 : 1
              ctx.beginPath(); ctx.moveTo(x2,y2); ctx.lineTo(x3,y3); ctx.stroke()
            }
            ctx.globalAlpha = 1
            break
          }

          case 'tangent': {
            const color = resolveColor(el.color || 'amber', cc)
            ctx.strokeStyle = color; ctx.lineWidth = el.width || 2
            ctx.beginPath()
            ctx.moveTo(toX(el.x1), toY(el.y0 + el.slope * (el.x1 - el.x0)))
            ctx.lineTo(toX(el.x2), toY(el.y0 + el.slope * (el.x2 - el.x0)))
            ctx.stroke()
            // dot at tangent point
            ctx.fillStyle = color
            ctx.beginPath(); ctx.arc(toX(el.x0), toY(el.y0), 5, 0, Math.PI * 2); ctx.fill()
            if (el.label) {
              ctx.fillStyle = color; ctx.font = '11px sans-serif'; ctx.textAlign = 'left'
              ctx.fillText(el.label, toX(el.x0) + 8, toY(el.y0) - 8)
            }
            break
          }

          case 'riemann': {
            const color = resolveColor(el.color || 'blue', cc)
            ctx.fillStyle = color; ctx.globalAlpha = el.alpha || 0.3
            for (const rect of el.rects) {
              const rx = toX(rect.x)
              const rw = scaleX(rect.w)
              const ry = rect.h >= 0 ? toY(rect.h) : toY(0)
              const rh = Math.abs(scaleY(rect.h))
              ctx.fillRect(rx, ry, rw, rh)
            }
            ctx.globalAlpha = 1
            ctx.strokeStyle = color; ctx.lineWidth = 0.5
            for (const rect of el.rects) {
              ctx.strokeRect(toX(rect.x), toY(Math.max(0, rect.h)), scaleX(rect.w), Math.abs(scaleY(rect.h)))
            }
            break
          }

          case 'bars': {
            // Bar chart — overrides coordinate system entirely
            ctx.restore(); ctx.save()
            const n = el.values.length
            const maxV = Math.max(...el.values.map(Math.abs))
            const barW = iw / (n * 1.4)
            const gap = iw / n
            const barColor = resolveColor(el.color || 'blue', cc)
            const baseY = pt + ih  // bottom of chart area

            el.values.forEach((v, i) => {
              const barH = (Math.abs(v) / maxV) * ih * 0.85
              const bx = pl + i * gap + (gap - barW) / 2
              const by = v >= 0 ? baseY - barH : baseY
              ctx.fillStyle = barColor
              ctx.globalAlpha = el.alpha || 0.8
              ctx.fillRect(bx, by, barW, barH)
              ctx.globalAlpha = 1
              ctx.strokeStyle = barColor; ctx.lineWidth = 1
              ctx.strokeRect(bx, by, barW, barH)
              // value label above bar
              ctx.fillStyle = barColor; ctx.font = '500 11px sans-serif'; ctx.textAlign = 'center'
              ctx.fillText(v.toFixed(1), bx + barW / 2, by - 4)
              // category label below
              ctx.fillStyle = cc.muted; ctx.font = '11px sans-serif'
              ctx.fillText(el.labels[i], bx + barW / 2, baseY + 14)
            })
            break
          }

          case 'histogram': {
            ctx.restore(); ctx.save()
            const edges = el.edges, counts = el.counts
            const dataMin = el.xmin, dataMax = el.xmax
            const dataRange = dataMax - dataMin || 1
            const maxCount = Math.max(...counts, 1)
            const histColor = resolveColor(el.color || 'blue', cc)
            const baseY = pt + ih
            for (let i = 0; i < counts.length; i++) {
              const bx = pl + ((edges[i] - dataMin) / dataRange) * iw
              const bw = Math.max(((edges[i + 1] - edges[i]) / dataRange) * iw - 1, 1)
              const bh = (counts[i] / maxCount) * ih * 0.92
              ctx.fillStyle = histColor
              ctx.globalAlpha = el.alpha || 0.7
              ctx.fillRect(bx, baseY - bh, bw, bh)
              ctx.globalAlpha = 1
              ctx.strokeStyle = cc.surface; ctx.lineWidth = 1
              ctx.strokeRect(bx, baseY - bh, bw, bh)
            }
            // x-axis tick labels
            ctx.fillStyle = cc.muted; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
            const tickStep = counts.length > 15 ? 2 : 1
            for (let i = 0; i <= counts.length; i += tickStep) {
              const bx = pl + ((edges[i] - dataMin) / dataRange) * iw
              ctx.fillText(Number(edges[i].toFixed(2)), bx, baseY + 14)
            }
            break
          }

          case 'boxplot': {
            ctx.restore(); ctx.save()
            const { q1, median, q3, lower_whisker: lw2, upper_whisker: uw2, outliers: bpOutliers = [],
                    color: bpColorRaw, x: bpX2 = 0.5, xmax: bpXMax = 1, width: bpW2 = 0.35,
                    label: bpLabel, ymin: bpYMin, ymax: bpYMax } = el
            const bpCol = resolveColor(bpColorRaw || 'blue', cc)
            const bpYRange = (bpYMax - bpYMin) || 1
            const toCanvasY2 = v => pt + ih - ((v - bpYMin) / bpYRange) * ih
            const cx3 = pl + (bpX2 / bpXMax) * iw
            const hw = (bpW2 / bpXMax) * iw * 0.5
            // IQR box
            const boxTop = toCanvasY2(q3), boxBot = toCanvasY2(q1)
            ctx.fillStyle = bpCol; ctx.globalAlpha = 0.2
            ctx.fillRect(cx3 - hw, boxTop, hw * 2, boxBot - boxTop)
            ctx.globalAlpha = 1
            ctx.strokeStyle = bpCol; ctx.lineWidth = 1.5
            ctx.strokeRect(cx3 - hw, boxTop, hw * 2, boxBot - boxTop)
            // Median line
            ctx.lineWidth = 2.5
            ctx.beginPath(); ctx.moveTo(cx3 - hw, toCanvasY2(median)); ctx.lineTo(cx3 + hw, toCanvasY2(median)); ctx.stroke()
            // Whiskers
            ctx.lineWidth = 1.5
            ctx.beginPath(); ctx.moveTo(cx3, toCanvasY2(q1)); ctx.lineTo(cx3, toCanvasY2(lw2)); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(cx3 - hw * 0.5, toCanvasY2(lw2)); ctx.lineTo(cx3 + hw * 0.5, toCanvasY2(lw2)); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(cx3, toCanvasY2(q3)); ctx.lineTo(cx3, toCanvasY2(uw2)); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(cx3 - hw * 0.5, toCanvasY2(uw2)); ctx.lineTo(cx3 + hw * 0.5, toCanvasY2(uw2)); ctx.stroke()
            // Outliers
            ctx.fillStyle = bpCol
            for (const o of bpOutliers) {
              ctx.beginPath(); ctx.arc(cx3, toCanvasY2(o), 3, 0, Math.PI * 2); ctx.fill()
            }
            if (bpLabel) {
              ctx.fillStyle = cc.muted; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
              ctx.fillText(bpLabel, cx3, pt + ih + 14)
            }
            break
          }

          case 'pie': {
            ctx.restore(); ctx.save()
            const pieTotalVal = el.values.reduce((a, b) => a + b, 0)
            const pieCx = pl + iw / 2, pieCy = pt + ih / 2
            const pieRadius = Math.min(iw, ih) * 0.42
            const palette = [cc.blue, C.amber, C.green, C.red, C.purple, C.teal]
            let pieAngle = -Math.PI / 2
            el.values.forEach((v, i) => {
              const slice = (v / pieTotalVal) * Math.PI * 2
              const pieColor = el.colors?.[i] ? resolveColor(el.colors[i], cc) : palette[i % palette.length]
              ctx.fillStyle = pieColor
              ctx.beginPath(); ctx.moveTo(pieCx, pieCy)
              ctx.arc(pieCx, pieCy, pieRadius, pieAngle, pieAngle + slice)
              ctx.closePath(); ctx.fill()
              ctx.strokeStyle = cc.surface; ctx.lineWidth = 2; ctx.stroke()
              if (slice > 0.15) {
                const midA = pieAngle + slice / 2
                const pct = ((v / pieTotalVal) * 100).toFixed(1)
                ctx.fillStyle = '#fff'; ctx.font = '500 11px sans-serif'; ctx.textAlign = 'center'
                ctx.fillText(
                  `${el.labels[i]} (${pct}%)`,
                  pieCx + Math.cos(midA) * pieRadius * 0.65,
                  pieCy + Math.sin(midA) * pieRadius * 0.65 + 4
                )
              }
              pieAngle += slice
            })
            break
          }

        }
        ctx.restore()
      }

      // Restore from clip
      ctx.restore()

      // Axis tick labels (drawn outside clip region)
      ctx.fillStyle = cc.muted; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
    }

    draw()

    if (!roRef.current) {
      roRef.current = new ResizeObserver(draw)
      if (canvasRef.current?.parentElement) roRef.current.observe(canvasRef.current.parentElement)
    }

    // Re-draw when the studio theme swaps CSS custom properties
    const themeEl = document.getElementById('oc-dynamic-theme-styles')
    const themeObs = new MutationObserver(draw)
    if (themeEl) themeObs.observe(themeEl, { characterData: true, childList: true, subtree: true })

    return () => {
      if (roRef.current) { roRef.current.disconnect(); roRef.current = null }
      themeObs.disconnect()
    }

  }, [figureJson, C])

  // Parse to get dimensions for the canvas style
  let fig = null
  try { fig = typeof figureJson === 'string' ? JSON.parse(figureJson) : figureJson } catch (e) {}

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        aspectRatio: fig?.square ? '1' : undefined,
        height: fig?.square ? undefined : (fig?.height || 340),
        display: 'block',
        borderRadius: 8,
      }}
    />
  )
}
