import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import {
  EMPTY,
  drawLine,
  drawRect,
  eraseTerrain,
  floodFill,
  paintTerrain,
  stamp,
  stampAligned,
} from './tilemapDoc.js'
import { drawCollision, drawLayer } from './render.js'

// The map painting surface.
//
// Same architecture as the sprite canvas: a stroke is accumulated in a working
// Int16Array and painted imperatively, then handed to the parent once on
// release. That keeps one undo entry per stroke and takes React out of the
// path of a drag across a few hundred cells.

const MIN_SCALE = 0.25
const MAX_SCALE = 8
const SHAPE_TOOLS = new Set(['rect', 'rectOutline'])

const MapCanvas = forwardRef(function MapCanvas(
  {
    doc,
    image,
    layerIndex,
    tool,
    brush,
    terrain,
    showGrid,
    showCollision,
    dimOtherLayers,
    onStrokeCommit,
    onPickTile,
    onHoverChange,
    onViewChange,
  },
  ref,
) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const viewRef = useRef({ scale: 0, offX: 0, offY: 0 })
  const strokeRef = useRef(null)
  const hoverRef = useRef(null)
  const panRef = useRef(null)
  const spaceRef = useRef(false)

  const liveRef = useRef({})
  liveRef.current = {
    doc,
    image,
    layerIndex,
    tool,
    brush,
    terrain,
    showGrid,
    showCollision,
    dimOtherLayers,
  }

  const clampScale = (s) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s))

  const fit = useCallback(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const pad = 32
    const w = wrap.clientWidth - pad
    const h = wrap.clientHeight - pad
    if (w <= 0 || h <= 0) return
    const raw = Math.min(w / (doc.cols * doc.tileW), h / (doc.rows * doc.tileH))
    // Snap to a whole number above 1:1 so tiles land on whole device pixels;
    // below 1:1 a fractional scale is unavoidable if the map is to fit at all.
    const scale = clampScale(raw >= 1 ? Math.floor(raw) : raw)
    viewRef.current = {
      scale,
      offX: Math.round((wrap.clientWidth - doc.cols * doc.tileW * scale) / 2),
      offY: Math.round((wrap.clientHeight - doc.rows * doc.tileH * scale) / 2),
    }
    onViewChange?.(scale)
    draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.cols, doc.rows, doc.tileW, doc.tileH, onViewChange])

  const zoomAt = useCallback(
    (nextScale, anchorX, anchorY) => {
      const v = viewRef.current
      const scale = clampScale(nextScale)
      if (Math.abs(scale - v.scale) < 0.001) return
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

  const zoomStep = (dir) => {
    const s = viewRef.current.scale
    const next = dir > 0 ? (s < 1 ? s * 2 : s + 1) : s <= 1 ? s / 2 : s - 1
    const wrap = wrapRef.current
    zoomAt(next, (wrap?.clientWidth ?? 0) / 2, (wrap?.clientHeight ?? 0) / 2)
  }

  useImperativeHandle(ref, () => ({
    fit,
    zoomIn: () => zoomStep(1),
    zoomOut: () => zoomStep(-1),
    getScale: () => viewRef.current.scale,
  }))

  // --- painting -----------------------------------------------------------

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const live = liveRef.current
    const d = live.doc

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
    const view = { scale, offX, offY, width: cssW, height: cssH }
    const mapW = d.cols * d.tileW * scale
    const mapH = d.rows * d.tileH * scale

    // The map bed, so the edges of the world are unambiguous even where the
    // ground layer has holes in it.
    ctx.fillStyle = 'rgba(15,23,42,0.55)'
    ctx.fillRect(offX, offY, mapW, mapH)

    for (let i = 0; i < d.layers.length; i++) {
      const layer = d.layers[i]
      if (!layer.visible) continue
      // The stroke in progress belongs to the active layer, so that layer
      // renders from the working buffer instead of the committed document.
      const cells = i === live.layerIndex && strokeRef.current ? strokeRef.current.working : layer.cells
      const rendered = { ...layer, cells }

      if (layer.kind === 'collision') {
        if (live.showCollision) drawCollision(ctx, d, rendered, view)
        continue
      }
      // Dimming the inactive layers is the only practical way to tell which
      // layer you are painting on once a map has any depth to it.
      ctx.globalAlpha = layer.opacity * (live.dimOtherLayers && i !== live.layerIndex ? 0.35 : 1)
      drawLayer(ctx, d, rendered, live.image, view)
      ctx.globalAlpha = 1
    }

    const tw = d.tileW * scale
    const th = d.tileH * scale

    if (live.showGrid && tw >= 6) {
      ctx.strokeStyle = 'rgba(148,163,184,0.22)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 1; x < d.cols; x++) {
        const px = offX + x * tw + 0.5
        ctx.moveTo(px, offY)
        ctx.lineTo(px, offY + mapH)
      }
      for (let y = 1; y < d.rows; y++) {
        const py = offY + y * th + 0.5
        ctx.moveTo(offX, py)
        ctx.lineTo(offX + mapW, py)
      }
      ctx.stroke()
    }

    ctx.strokeStyle = 'rgba(226,232,240,0.6)'
    ctx.lineWidth = 1
    ctx.strokeRect(offX - 0.5, offY - 0.5, mapW + 1, mapH + 1)

    // Brush footprint. For a shape tool mid-drag this outlines the whole
    // rectangle being dragged out, not just the cell under the cursor.
    const hover = hoverRef.current
    const stroke = strokeRef.current
    if (hover) {
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'
      ctx.lineWidth = 2
      if (stroke && SHAPE_TOOLS.has(stroke.tool)) {
        const left = Math.min(stroke.startX, hover.x)
        const top = Math.min(stroke.startY, hover.y)
        const w = Math.abs(hover.x - stroke.startX) + 1
        const h = Math.abs(hover.y - stroke.startY) + 1
        ctx.strokeRect(offX + left * tw, offY + top * th, w * tw, h * th)
      } else {
        const bw = live.tool === 'terrain' || live.tool === 'fill' ? 1 : live.brush.w
        const bh = live.tool === 'terrain' || live.tool === 'fill' ? 1 : live.brush.h
        ctx.strokeRect(offX + hover.x * tw, offY + hover.y * th, bw * tw, bh * th)
      }
    }
  }, [])

  // --- input --------------------------------------------------------------

  const toCell = (e) => {
    const rect = wrapRef.current.getBoundingClientRect()
    const { scale, offX, offY } = viewRef.current
    const wx = e.clientX - rect.left
    const wy = e.clientY - rect.top
    return {
      x: Math.floor((wx - offX) / (doc.tileW * scale)),
      y: Math.floor((wy - offY) / (doc.tileH * scale)),
      wx,
      wy,
    }
  }

  const applyAt = (stroke, x, y, erase) => {
    const live = liveRef.current
    const d = live.doc
    const cells = stroke.working
    const tsCols = d.tileset?.cols ?? 1

    if (live.tool === 'terrain' && live.terrain) {
      if (erase) eraseTerrain(cells, d.cols, d.rows, x, y, live.terrain, tsCols)
      else paintTerrain(cells, d.cols, d.rows, x, y, live.terrain, tsCols)
      return
    }
    if (erase) {
      // Erasing ignores the stamp shape and clears exactly the brush footprint,
      // which is what people expect from an eraser of a given size.
      for (let dy = 0; dy < live.brush.h; dy++) {
        for (let dx = 0; dx < live.brush.w; dx++) {
          const cx = x + dx
          const cy = y + dy
          if (cx >= 0 && cy >= 0 && cx < d.cols && cy < d.rows) cells[cy * d.cols + cx] = EMPTY
        }
      }
      return
    }
    stampAligned(cells, d.cols, d.rows, x, y, live.brush)
  }

  const onPointerDown = (e) => {
    const wrap = wrapRef.current
    if (!wrap) return
    wrap.focus({ preventScroll: true })
    const live = liveRef.current
    const pos = toCell(e)

    if (e.button === 1 || spaceRef.current || live.tool === 'pan') {
      panRef.current = { x: e.clientX, y: e.clientY, offX: viewRef.current.offX, offY: viewRef.current.offY }
      wrap.setPointerCapture(e.pointerId)
      return
    }
    if (e.button !== 0 && e.button !== 2) return

    const layer = live.doc.layers[live.layerIndex]
    if (!layer || layer.locked) return

    if (live.tool === 'picker') {
      const tile = layer.cells[pos.y * live.doc.cols + pos.x]
      if (tile !== undefined && tile !== EMPTY) onPickTile?.(tile)
      return
    }

    const erase = e.button === 2 || live.tool === 'eraser'
    const base = layer.cells
    const working = base.slice()
    const stroke = {
      tool: live.tool,
      erase,
      base,
      working,
      startX: pos.x,
      startY: pos.y,
      lastX: pos.x,
      lastY: pos.y,
    }
    strokeRef.current = stroke

    if (live.tool === 'fill') {
      if (erase) {
        floodFill(working, live.doc.cols, live.doc.rows, pos.x, pos.y, { w: 1, h: 1, tiles: [EMPTY] })
      } else {
        floodFill(working, live.doc.cols, live.doc.rows, pos.x, pos.y, live.brush)
      }
    } else if (!SHAPE_TOOLS.has(live.tool)) {
      // A collision layer holds no tile art, so any non-empty value will do —
      // 0 keeps the exported data honest and the overlay draws from presence.
      if (layer.kind === 'collision' && !erase) {
        working[pos.y * live.doc.cols + pos.x] = 0
      } else {
        applyAt(stroke, pos.x, pos.y, erase)
      }
    }

    wrap.setPointerCapture(e.pointerId)
    draw()
  }

  const onPointerMove = (e) => {
    const live = liveRef.current
    const pos = toCell(e)

    if (panRef.current) {
      viewRef.current = {
        ...viewRef.current,
        offX: panRef.current.offX + (e.clientX - panRef.current.x),
        offY: panRef.current.offY + (e.clientY - panRef.current.y),
      }
      draw()
      return
    }

    const prev = hoverRef.current
    hoverRef.current = { x: pos.x, y: pos.y }
    if (!prev || prev.x !== pos.x || prev.y !== pos.y) {
      const inside = pos.x >= 0 && pos.y >= 0 && pos.x < doc.cols && pos.y < doc.rows
      onHoverChange?.({ x: pos.x, y: pos.y, inside })
    }

    const stroke = strokeRef.current
    if (!stroke) {
      draw()
      return
    }
    if (stroke.lastX === pos.x && stroke.lastY === pos.y && !SHAPE_TOOLS.has(stroke.tool)) {
      return
    }

    const d = live.doc
    const layer = d.layers[live.layerIndex]

    if (SHAPE_TOOLS.has(stroke.tool)) {
      stroke.working.set(stroke.base)
      const fill = stroke.tool === 'rect'
      if (stroke.erase) {
        drawRect(stroke.working, d.cols, d.rows, stroke.startX, stroke.startY, pos.x, pos.y, { w: 1, h: 1, tiles: [EMPTY] }, { fill })
      } else if (layer.kind === 'collision') {
        drawRect(stroke.working, d.cols, d.rows, stroke.startX, stroke.startY, pos.x, pos.y, { w: 1, h: 1, tiles: [0] }, { fill })
      } else {
        drawRect(stroke.working, d.cols, d.rows, stroke.startX, stroke.startY, pos.x, pos.y, live.brush, { fill })
      }
    } else if (stroke.tool === 'terrain' && live.terrain) {
      // Terrain has to be walked cell by cell so every step refreshes its
      // neighbours; a straight line stamp would leave stale masks behind.
      const dx = Math.abs(pos.x - stroke.lastX)
      const dy = Math.abs(pos.y - stroke.lastY)
      const steps = Math.max(dx, dy)
      for (let i = 1; i <= steps; i++) {
        const ix = Math.round(stroke.lastX + ((pos.x - stroke.lastX) * i) / steps)
        const iy = Math.round(stroke.lastY + ((pos.y - stroke.lastY) * i) / steps)
        applyAt(stroke, ix, iy, stroke.erase)
      }
      if (steps === 0) applyAt(stroke, pos.x, pos.y, stroke.erase)
    } else if (stroke.tool !== 'fill') {
      if (layer.kind === 'collision' && !stroke.erase) {
        drawLine(stroke.working, d.cols, d.rows, stroke.lastX, stroke.lastY, pos.x, pos.y, { w: 1, h: 1, tiles: [0] })
      } else if (stroke.erase) {
        drawLine(stroke.working, d.cols, d.rows, stroke.lastX, stroke.lastY, pos.x, pos.y, { w: 1, h: 1, tiles: [EMPTY] })
      } else {
        drawLine(stroke.working, d.cols, d.rows, stroke.lastX, stroke.lastY, pos.x, pos.y, live.brush)
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
    let changed = false
    for (let i = 0; i < stroke.base.length; i++) {
      if (stroke.base[i] !== stroke.working[i]) {
        changed = true
        break
      }
    }
    if (changed) onStrokeCommit?.(stroke.working)
    else draw()
  }

  const onWheel = (e) => {
    e.preventDefault()
    const pos = toCell(e)
    const s = viewRef.current.scale
    const next = e.deltaY < 0 ? (s < 1 ? s * 2 : s + 1) : s <= 1 ? s / 2 : s - 1
    zoomAt(next, pos.wx, pos.wy)
  }

  // --- effects ------------------------------------------------------------

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

  useEffect(() => {
    fit()
  }, [doc.cols, doc.rows, doc.tileW, doc.tileH, fit])

  useEffect(() => {
    draw()
  }, [doc, image, layerIndex, tool, brush, terrain, showGrid, showCollision, dimOtherLayers, draw])

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      className="relative h-full w-full overflow-hidden outline-none bg-slate-200 dark:bg-slate-900"
      style={{ cursor: tool === 'pan' ? 'grab' : 'crosshair', touchAction: 'none' }}
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

export default MapCanvas
