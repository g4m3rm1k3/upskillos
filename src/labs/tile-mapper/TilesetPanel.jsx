import { useEffect, useRef, useState } from 'react'
import { AUTOTILE_SIZE, createTerrain } from './tilemapDoc.js'

// The tileset picker. Two things it has to do well: let you grab a rectangular
// block of tiles as one brush (drag-select), and let you mark a 4x4 block as an
// autotile terrain. Everything else is chrome.

export default function TilesetPanel({
  doc,
  image,
  brush,
  onBrush,
  terrains,
  activeTerrainId,
  onSelectTerrain,
  onAddTerrain,
  onRemoveTerrain,
  onEditTerrain,
  onOpenImport,
}) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const dragRef = useRef(null)
  const [zoom, setZoom] = useState(2)
  const [marking, setMarking] = useState(false)
  const [sel, setSel] = useState({ x: 0, y: 0, w: 1, h: 1 })

  const ts = doc.tileset

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !ts || !image) return
    const dpr = window.devicePixelRatio || 1
    const w = ts.imageWidth * zoom
    const h = ts.imageHeight * zoom
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(image, 0, 0, w, h)

    const tw = ts.tileW * zoom
    const th = ts.tileH * zoom
    const cellX = (c) => (ts.margin + c * (ts.tileW + ts.spacing)) * zoom
    const cellY = (r) => (ts.margin + r * (ts.tileH + ts.spacing)) * zoom

    // Tile grid, faint — enough to confirm the slice lines up with the art,
    // which is the single most common thing to get wrong on import.
    ctx.strokeStyle = 'rgba(148,163,184,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let c = 0; c <= ts.cols; c++) {
      ctx.moveTo(cellX(c) + 0.5, 0)
      ctx.lineTo(cellX(c) + 0.5, h)
    }
    for (let r = 0; r <= ts.rows; r++) {
      ctx.moveTo(0, cellY(r) + 0.5)
      ctx.lineTo(w, cellY(r) + 0.5)
    }
    ctx.stroke()

    // Terrain blocks, so a 4x4 autotile region is visible as a region rather
    // than something you have to remember.
    for (const t of terrains) {
      ctx.strokeStyle = t.id === activeTerrainId ? 'rgba(52,211,153,0.95)' : 'rgba(52,211,153,0.5)'
      ctx.lineWidth = 2
      ctx.strokeRect(cellX(t.col), cellY(t.row), tw * AUTOTILE_SIZE, th * AUTOTILE_SIZE)
    }

    ctx.strokeStyle = marking ? 'rgba(52,211,153,1)' : 'rgba(56,189,248,1)'
    ctx.lineWidth = 2
    ctx.strokeRect(
      cellX(sel.x),
      cellY(sel.y),
      tw * sel.w + (sel.w - 1) * ts.spacing * zoom,
      th * sel.h + (sel.h - 1) * ts.spacing * zoom,
    )
  }, [ts, image, zoom, sel, terrains, activeTerrainId, marking])

  const toTile = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / zoom
    const py = (e.clientY - rect.top) / zoom
    return {
      x: Math.max(0, Math.min(ts.cols - 1, Math.floor((px - ts.margin) / (ts.tileW + ts.spacing)))),
      y: Math.max(0, Math.min(ts.rows - 1, Math.floor((py - ts.margin) / (ts.tileH + ts.spacing)))),
    }
  }

  const commitSelection = (s) => {
    if (marking) return
    const tiles = []
    for (let dy = 0; dy < s.h; dy++) {
      for (let dx = 0; dx < s.w; dx++) tiles.push((s.y + dy) * ts.cols + (s.x + dx))
    }
    onBrush({ w: s.w, h: s.h, tiles })
  }

  const onDown = (e) => {
    if (!ts) return
    e.preventDefault()
    const t = toTile(e)
    dragRef.current = t
    const s = { x: t.x, y: t.y, w: 1, h: 1 }
    setSel(s)
    commitSelection(s)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onMove = (e) => {
    if (!dragRef.current || !ts) return
    const t = toTile(e)
    const a = dragRef.current
    const s = {
      x: Math.min(a.x, t.x),
      y: Math.min(a.y, t.y),
      w: Math.abs(t.x - a.x) + 1,
      h: Math.abs(t.y - a.y) + 1,
    }
    setSel(s)
    commitSelection(s)
  }

  const onUp = (e) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    if (!dragRef.current) return
    dragRef.current = null
    if (marking) {
      onAddTerrain(createTerrain(sel.x, sel.y, `Terrain ${terrains.length + 1}`))
      setMarking(false)
    }
  }

  if (!ts) {
    return (
      <div className="flex flex-col items-center gap-2 border-b border-slate-200 p-4 text-center dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No tileset yet. Load a sprite sheet you made in Sprite Forge, or any PNG.
        </p>
        <button
          type="button"
          onClick={onOpenImport}
          className="rounded bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
        >
          Choose a tileset
        </button>
      </div>
    )
  }

  const active = terrains.find((t) => t.id === activeTerrainId)

  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Tileset
        </h3>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                zoom === z
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {z}x
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenImport}
            className="ml-1 rounded px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
            title="Load a different tileset"
          >
            change
          </button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="max-h-56 overflow-auto rounded bg-slate-100 p-1 dark:bg-slate-800/60"
        style={{
          backgroundImage:
            'linear-gradient(45deg,rgba(100,116,139,0.25) 25%,transparent 25%,transparent 75%,rgba(100,116,139,0.25) 75%),linear-gradient(45deg,rgba(100,116,139,0.25) 25%,transparent 25%,transparent 75%,rgba(100,116,139,0.25) 75%)',
          backgroundSize: '12px 12px',
          backgroundPosition: '0 0,6px 6px',
        }}
      >
        <canvas
          ref={canvasRef}
          className="block touch-none"
          style={{ cursor: marking ? 'cell' : 'crosshair' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
        />
      </div>

      <p className="font-mono text-[10px] text-slate-400">
        {ts.cols}×{ts.rows} tiles · {ts.tileW}×{ts.tileH}px · brush {brush.w}×{brush.h}
      </p>

      {/* Autotile terrains ------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Autotile terrains</h4>
        <button
          type="button"
          onClick={() => setMarking((m) => !m)}
          className={`rounded px-1.5 py-0.5 text-[10px] ${
            marking
              ? 'bg-emerald-500 text-white'
              : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
          }`}
          title="Click the top-left tile of a 4x4 autotile block"
        >
          {marking ? 'click a 4×4 block…' : '+ mark 4×4'}
        </button>
      </div>

      {marking && (
        // Spelling the bitmask out here is deliberate: it is the contract the
        // artist has to satisfy in the tileset, and it is also the whole idea
        // behind autotiling, which is worth showing rather than hiding.
        <p className="rounded bg-emerald-50 px-2 py-1.5 text-[10px] leading-relaxed text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          Click the top-left tile of a 4×4 block. Its 16 tiles are read in bitmask order —
          <span className="font-mono"> N=1, E=2, S=4, W=8</span> — so tile 0 is an isolated stub, tile 15 is
          fully-surrounded interior, and the map picks the right one for every cell as you paint.
        </p>
      )}

      <div className="flex flex-wrap gap-1">
        {terrains.map((t) => (
          <span
            key={t.id}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] ${
              t.id === activeTerrainId
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <button type="button" onClick={() => onSelectTerrain(t.id)}>
              {t.name}
            </button>
            <button
              type="button"
              onClick={() => onRemoveTerrain(t.id)}
              className="opacity-60 hover:opacity-100"
              title="Remove terrain"
            >
              ✕
            </button>
          </span>
        ))}
        {!terrains.length && !marking && (
          <span className="text-[10px] text-slate-400">
            None yet — mark a 4×4 block to paint terrain that joins itself up.
          </span>
        )}
      </div>

      {active && (
        <label className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          <input
            type="checkbox"
            checked={active.edgeIsSolid}
            onChange={(e) => onEditTerrain(active.id, { edgeIsSolid: e.target.checked })}
            className="h-3 w-3"
          />
          Map edge counts as the same terrain
          <span className="text-slate-400" title="On, ground runs cleanly off the edge of the map. Off, it draws a coastline around the whole border.">
            ⓘ
          </span>
        </label>
      )}
    </div>
  )
}
