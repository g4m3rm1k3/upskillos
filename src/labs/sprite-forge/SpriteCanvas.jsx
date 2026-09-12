import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import {
  TRANSPARENT,
  drawEllipse,
  drawLine,
  drawRect,
  floodFill,
  mirrorPoints,
  paintBrush,
} from './pixelDoc.js'
import { frameToCanvas } from './render.js'

// The editing surface.
//
// Two things drive the design here. First, a stroke must not round-trip through
// React: at 8x zoom a fast drag fires pointermove faster than a reconciliation,
// so the stroke is accumulated in a working Uint8Array and painted imperatively,
// then handed to the parent exactly once on release. That gives one undo entry
// per stroke and a repaint cost that does not depend on React at all.
//
// Second, everything is nearest-neighbour. The frame is rasterized once at 1:1
// into an offscreen canvas and blown up with drawImage and smoothing disabled.
// Any interpolation would make a 32x32 sprite at 12x look like a blurry photo
// instead of pixels.

const MIN_SCALE = 1
const MAX_SCALE = 48

// Tools that need a rubber-band preview: nothing is written to the frame until
// the pointer comes up, so the shape can be re-derived from the untouched base
// on every move.
const SHAPE_TOOLS = new Set(['line', 'rect', 'rectFill', 'ellipse', 'ellipseFill'])

function stampPoint(px, w, h, x, y, value, size, symmetry) {
  for (const [mx, my] of mirrorPoints(w, h, x, y, symmetry)) paintBrush(px, w, h, mx, my, value, size)
}

// Mirrored shapes pair endpoints by index: mirrorPoints always returns its
// reflections in the same order, so a[i] and b[i] are the two ends of the same
// reflected copy of the shape.
function stampShape(tool, px, w, h, x0, y0, x1, y1, value, size, symmetry) {
  const a = mirrorPoints(w, h, x0, y0, symmetry)
  const b = mirrorPoints(w, h, x1, y1, symmetry)
  for (let i = 0; i < a.length; i++) {
    const [ax, ay] = a[i]
    const [bx, by] = b[i]
    if (tool === 'line') drawLine(px, w, h, ax, ay, bx, by, value, size)
    else if (tool === 'rect') drawRect(px, w, h, ax, ay, bx, by, value, { size })
    else if (tool === 'rectFill') drawRect(px, w, h, ax, ay, bx, by, value, { fill: true })
    else if (tool === 'ellipse') drawEllipse(px, w, h, ax, ay, bx, by, value)
    else if (tool === 'ellipseFill') drawEllipse(px, w, h, ax, ay, bx, by, value, { fill: true })
  }
}

function equalPixels(a, b) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

const SpriteCanvas = forwardRef(function SpriteCanvas(
  {
    doc,
    frameIndex,
    tool,
    value,
    brushSize,
    symmetry,
    showGrid,
    tileGuide,
    onionSkin,
    onStrokeCommit,
    onPickValue,
    onHoverChange,
    onViewChange,
  },
  ref,
) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)

  // Offscreen 1:1 rasters, reused across repaints so a drag does not allocate a
  // new canvas backing store sixty times a second.
  const frameCanvasRef = useRef(null)
  const prevCanvasRef = useRef(null)
  const nextCanvasRef = useRef(null)
  const checkerRef = useRef(null)

  const viewRef = useRef({ scale: 0, offX: 0, offY: 0 })
  const strokeRef = useRef(null)
  const hoverRef = useRef(null)
  const panRef = useRef(null)
  const spaceRef = useRef(false)

  // Latest props for the imperative paint path, which runs outside React's
  // render cycle and so cannot close over them.
  const liveRef = useRef({})
  liveRef.current = { doc, frameIndex, tool, value, brushSize, symmetry, showGrid, tileGuide, onionSkin }

  const frame = doc.frames[frameIndex]

  // --- view ---------------------------------------------------------------

  const clampScale = (s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s))

  const fit = useCallback(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const pad = 32
    const w = wrap.clientWidth - pad
    const h = wrap.clientHeight - pad
    if (w <= 0 || h <= 0) return
    // Integer scale only. A fractional zoom puts sprite pixels on fractional
    // device pixels, and the resulting uneven pixel widths are exactly the
    // artefact this editor exists to avoid.
    const scale = clampScale(Math.max(1, Math.floor(Math.min(w / doc.width, h / doc.height))))
    viewRef.current = {
      scale,
      offX: Math.round((wrap.clientWidth - doc.width * scale) / 2),
      offY: Math.round((wrap.clientHeight - doc.height * scale) / 2),
    }
    onViewChange?.(scale)
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.width, doc.height, onViewChange])

  // Zoom about a fixed point in wrapper space — the cursor for wheel zoom, the
  // viewport centre for the buttons — so the pixel under the pointer stays put.
  const zoomAt = useCallback(
    (nextScale, anchorX, anchorY) => {
      const v = viewRef.current
      const scale = clampScale(Math.round(nextScale))
      if (scale === v.scale) return
      const sx = (anchorX - v.offX) / v.scale
      const sy = (anchorY - v.offY) / v.scale
      viewRef.current = {
        scale,
        offX: Math.round(anchorX - sx * scale),
        offY: Math.round(anchorY - sy * scale),
      }
      onViewChange?.(scale)
      draw()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [onViewChange],
  )

  useImperativeHandle(ref, () => ({
    fit,
    zoomIn: () => {
      const wrap = wrapRef.current
      zoomAt(viewRef.current.scale + (viewRef.current.scale < 8 ? 1 : 2), (wrap?.clientWidth ?? 0) / 2, (wrap?.clientHeight ?? 0) / 2)
    },
    zoomOut: () => {
      const wrap = wrapRef.current
      zoomAt(viewRef.current.scale - (viewRef.current.scale <= 8 ? 1 : 2), (wrap?.clientWidth ?? 0) / 2, (wrap?.clientHeight ?? 0) / 2)
    },
    getScale: () => viewRef.current.scale,
  }))

  // --- painting -----------------------------------------------------------

  const checkerPattern = (ctx) => {
    if (!checkerRef.current) {
      const tile = document.createElement('canvas')
      tile.width = 16
      tile.height = 16
      const tctx = tile.getContext('2d')
      tctx.fillStyle = '#0f172a'
      tctx.fillRect(0, 0, 16, 16)
      tctx.fillStyle = '#1e293b'
      tctx.fillRect(0, 0, 8, 8)
      tctx.fillRect(8, 8, 8, 8)
      checkerRef.current = tile
    }
    return ctx.createPattern(checkerRef.current, 'repeat')
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const live = liveRef.current
    const d = live.doc
    const f = d.frames[live.frameIndex]
    if (!f) return

    const dpr = window.devicePixelRatio || 1
    const cssW = wrap.clientWidth
    const cssH = wrap.clientHeight
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
    }
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    ctx.imageSmoothingEnabled = false

    const { scale, offX, offY } = viewRef.current
    if (!scale) return
    const w = d.width * scale
    const h = d.height * scale

    // Transparency checkerboard, drawn in screen space so its squares stay a
    // constant size however far you zoom in — a checker that scales with the
    // art reads as part of the art.
    ctx.fillStyle = checkerPattern(ctx)
    ctx.fillRect(offX, offY, w, h)

    // Onion skin: the neighbouring frames, faint, under the live one. Drawing
    // them beneath means the frame being edited always wins visually.
    if (live.onionSkin) {
      const prev = d.frames[live.frameIndex - 1]
      const next = d.frames[live.frameIndex + 1]
      if (prev) {
        prevCanvasRef.current = frameToCanvas(prev.pixels, d.width, d.height, d.palette, prevCanvasRef.current)
        ctx.globalAlpha = 0.35
        ctx.drawImage(prevCanvasRef.current, offX, offY, w, h)
      }
      if (next) {
        nextCanvasRef.current = frameToCanvas(next.pixels, d.width, d.height, d.palette, nextCanvasRef.current)
        ctx.globalAlpha = 0.22
        ctx.drawImage(nextCanvasRef.current, offX, offY, w, h)
      }
      ctx.globalAlpha = 1
    }

    const pixels = strokeRef.current?.working ?? f.pixels
    frameCanvasRef.current = frameToCanvas(pixels, d.width, d.height, d.palette, frameCanvasRef.current)
    ctx.drawImage(frameCanvasRef.current, offX, offY, w, h)

    // Grid only once a cell is big enough that the lines sit between pixels
    // rather than on top of them.
    if (live.showGrid && scale >= 8) {
      ctx.strokeStyle = 'rgba(148,163,184,0.22)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 1; x < d.width; x++) {
        const px = offX + x * scale + 0.5
        ctx.moveTo(px, offY)
        ctx.lineTo(px, offY + h)
      }
      for (let y = 1; y < d.height; y++) {
        const py = offY + y * scale + 0.5
        ctx.moveTo(offX, py)
        ctx.lineTo(offX + w, py)
      }
      ctx.stroke()
    }

    // Tile guide: a heavier line every N pixels. Indispensable when the sprite
    // is a tile that has to line up with an 8 or 16 pixel game grid.
    if (live.tileGuide > 0) {
      ctx.strokeStyle = 'rgba(56,189,248,0.45)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = live.tileGuide; x < d.width; x += live.tileGuide) {
        const px = offX + x * scale + 0.5
        ctx.moveTo(px, offY)
        ctx.lineTo(px, offY + h)
      }
      for (let y = live.tileGuide; y < d.height; y += live.tileGuide) {
        const py = offY + y * scale + 0.5
        ctx.moveTo(offX, py)
        ctx.lineTo(offX + w, py)
      }
      ctx.stroke()
    }

    // Symmetry axes, so it is obvious where a mirrored stroke will land.
    if (live.symmetry?.mirrorX || live.symmetry?.mirrorY) {
      ctx.strokeStyle = 'rgba(244,114,182,0.7)'
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1
      ctx.beginPath()
      if (live.symmetry.mirrorX) {
        const px = offX + (d.width / 2) * scale + 0.5
        ctx.moveTo(px, offY)
        ctx.lineTo(px, offY + h)
      }
      if (live.symmetry.mirrorY) {
        const py = offY + (d.height / 2) * scale + 0.5
        ctx.moveTo(offX, py)
        ctx.lineTo(offX + w, py)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    ctx.strokeStyle = 'rgba(226,232,240,0.55)'
    ctx.lineWidth = 1
    ctx.strokeRect(offX - 0.5, offY - 0.5, w + 1, h + 1)

    // Brush footprint under the cursor, mirrored copies included: at 1px it is
    // the only way to know exactly which pixel you are about to hit.
    const hover = hoverRef.current
    if (hover && !strokeRef.current) {
      const s = Math.max(1, live.brushSize | 0)
      const start = -((s - 1) >> 1)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1
      for (const [mx, my] of mirrorPoints(d.width, d.height, hover.x, hover.y, live.symmetry)) {
        ctx.strokeRect(offX + (mx + start) * scale + 0.5, offY + (my + start) * scale + 0.5, s * scale - 1, s * scale - 1)
      }
    }
  }, [])

  // --- coordinate mapping -------------------------------------------------

  const toSprite = (e) => {
    const wrap = wrapRef.current
    const rect = wrap.getBoundingClientRect()
    const { scale, offX, offY } = viewRef.current
    return {
      x: Math.floor((e.clientX - rect.left - offX) / scale),
      y: Math.floor((e.clientY - rect.top - offY) / scale),
      wx: e.clientX - rect.left,
      wy: e.clientY - rect.top,
    }
  }

  // --- pointer handling ---------------------------------------------------

  const onPointerDown = (e) => {
    const wrap = wrapRef.current
    if (!wrap) return
    wrap.focus({ preventScroll: true })
    const pos = toSprite(e)
    const live = liveRef.current

    // Middle button or held space pans regardless of the active tool: reaching
    // for the toolbar to move the canvas breaks the rhythm of drawing.
    if (e.button === 1 || spaceRef.current || live.tool === 'pan') {
      panRef.current = { x: e.clientX, y: e.clientY, offX: viewRef.current.offX, offY: viewRef.current.offY }
      wrap.setPointerCapture(e.pointerId)
      return
    }
    if (e.button !== 0 && e.button !== 2) return

    if (live.tool === 'picker') {
      const v = live.doc.frames[live.frameIndex].pixels[pos.y * live.doc.width + pos.x]
      if (v !== undefined && pos.x >= 0 && pos.y >= 0 && pos.x < live.doc.width && pos.y < live.doc.height) {
        onPickValue?.(v)
      }
      return
    }

    // Right-drag erases. Every pixel editor since Deluxe Paint has done this,
    // and it saves a trip to the eraser for the one-pixel fixes that make up
    // most of the work.
    const drawValue = e.button === 2 ? TRANSPARENT : live.value
    const base = live.doc.frames[live.frameIndex].pixels
    const working = base.slice()

    strokeRef.current = {
      tool: live.tool,
      value: drawValue,
      base,
      working,
      startX: pos.x,
      startY: pos.y,
      lastX: pos.x,
      lastY: pos.y,
    }

    if (live.tool === 'fill') {
      for (const [mx, my] of mirrorPoints(live.doc.width, live.doc.height, pos.x, pos.y, live.symmetry)) {
        floodFill(working, live.doc.width, live.doc.height, mx, my, drawValue)
      }
    } else if (!SHAPE_TOOLS.has(live.tool)) {
      stampPoint(working, live.doc.width, live.doc.height, pos.x, pos.y, drawValue, live.brushSize, live.symmetry)
    }

    wrap.setPointerCapture(e.pointerId)
    draw()
  }

  const onPointerMove = (e) => {
    const live = liveRef.current
    const pos = toSprite(e)

    if (panRef.current) {
      viewRef.current = {
        ...viewRef.current,
        offX: panRef.current.offX + (e.clientX - panRef.current.x),
        offY: panRef.current.offY + (e.clientY - panRef.current.y),
      }
      draw()
      return
    }

    const prevHover = hoverRef.current
    hoverRef.current = { x: pos.x, y: pos.y }
    if (!prevHover || prevHover.x !== pos.x || prevHover.y !== pos.y) {
      onHoverChange?.({ x: pos.x, y: pos.y, inside: pos.x >= 0 && pos.y >= 0 && pos.x < doc.width && pos.y < doc.height })
    }

    const stroke = strokeRef.current
    if (!stroke) {
      draw()
      return
    }

    if (SHAPE_TOOLS.has(stroke.tool)) {
      // Rebuild from the pristine base every move, so dragging the far corner
      // around does not leave a trail of earlier previews behind.
      stroke.working.set(stroke.base)
      stampShape(
        stroke.tool,
        stroke.working,
        live.doc.width,
        live.doc.height,
        stroke.startX,
        stroke.startY,
        pos.x,
        pos.y,
        stroke.value,
        live.brushSize,
        live.symmetry,
      )
    } else if (stroke.tool === 'pencil' || stroke.tool === 'eraser') {
      // Interpolate from the previous sample: pointermove is sampled per frame,
      // not per pixel, so a quick flick would otherwise draw a dotted line.
      const a = mirrorPoints(live.doc.width, live.doc.height, stroke.lastX, stroke.lastY, live.symmetry)
      const b = mirrorPoints(live.doc.width, live.doc.height, pos.x, pos.y, live.symmetry)
      for (let i = 0; i < a.length; i++) {
        drawLine(
          stroke.working,
          live.doc.width,
          live.doc.height,
          a[i][0],
          a[i][1],
          b[i][0],
          b[i][1],
          stroke.value,
          live.brushSize,
        )
      }
    }

    stroke.lastX = pos.x
    stroke.lastY = pos.y
    draw()
  }

  const endStroke = (e) => {
    const wrap = wrapRef.current
    if (wrap?.hasPointerCapture?.(e.pointerId)) wrap.releasePointerCapture(e.pointerId)
    if (panRef.current) {
      panRef.current = null
      return
    }
    const stroke = strokeRef.current
    strokeRef.current = null
    if (!stroke) return
    // A click that changed nothing — filling a region with the color it already
    // was, or a cancelled drag — must not push an undo step.
    if (!equalPixels(stroke.base, stroke.working)) onStrokeCommit?.(stroke.working)
    else draw()
  }

  const onWheel = (e) => {
    e.preventDefault()
    const pos = toSprite(e)
    const step = viewRef.current.scale < 8 ? 1 : 2
    zoomAt(viewRef.current.scale + (e.deltaY < 0 ? step : -step), pos.wx, pos.wy)
  }

  // --- effects ------------------------------------------------------------

  // Space-to-pan is tracked on the window rather than the canvas so it keeps
  // working when focus has drifted to a toolbar control mid-edit.
  useEffect(() => {
    const down = (e) => {
      if (e.code === 'Space') spaceRef.current = true
    }
    const up = (e) => {
      if (e.code === 'Space') spaceRef.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return undefined
    const ro = new ResizeObserver(() => {
      if (!viewRef.current.scale) fit()
      else draw()
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [fit, draw])

  // Re-fit when the document's dimensions change, since the old scale and
  // centring no longer describe anything that exists.
  useEffect(() => {
    fit()
  }, [doc.width, doc.height, fit])

  useEffect(() => {
    draw()
  }, [doc, frameIndex, frame, showGrid, tileGuide, onionSkin, symmetry, brushSize, value, tool, draw])

  const cursor = tool === 'pan' ? 'grab' : tool === 'picker' ? 'crosshair' : 'crosshair'

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      className="relative h-full w-full overflow-hidden outline-none bg-slate-100 dark:bg-slate-900"
      style={{ cursor, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={() => {
        hoverRef.current = null
        onHoverChange?.(null)
        draw()
      }}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
})

export default SpriteCanvas
