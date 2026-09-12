import { useEffect, useRef, useState } from 'react'
import { buildTileset, fileToDataUrl, guessTileSize, listSprites, loadImage, sliceInfo, tilesetFromSprite } from './tileset.js'

// Choosing a tileset. Two routes in: a sprite you already made next door, or
// any PNG. The sprite route needs no configuration at all — the frame size is
// the tile size, by construction — which is the point of having both labs.

export default function ImportTilesetDialog({ doc, onApply, onClose }) {
  const [tab, setTab] = useState('sprite')
  const [sprites, setSprites] = useState(null)
  const [img, setImg] = useState(null)
  const [dataUrl, setDataUrl] = useState('')
  const [tileW, setTileW] = useState(doc.tileW)
  const [tileH, setTileH] = useState(doc.tileH)
  const [margin, setMargin] = useState(0)
  const [spacing, setSpacing] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const previewRef = useRef(null)

  useEffect(() => {
    listSprites()
      .then(setSprites)
      .catch(() => setSprites([]))
  }, [])

  const pickFile = async (file) => {
    setError('')
    try {
      const url = await fileToDataUrl(file)
      const loaded = await loadImage(url)
      setDataUrl(url)
      setImg(loaded)
      const guess = guessTileSize(loaded.naturalWidth, loaded.naturalHeight)
      setTileW(guess)
      setTileH(guess)
    } catch (e) {
      setError(e.message)
    }
  }

  const info = img
    ? sliceInfo({
        imageWidth: img.naturalWidth,
        imageHeight: img.naturalHeight,
        tileW,
        tileH,
        margin,
        spacing,
      })
    : null

  // Overlays the slice grid on the source image. Getting tile size, margin and
  // spacing right is the entire job of this dialog, and the only reliable way
  // to confirm it is to see the lines land on the seams.
  useEffect(() => {
    const host = previewRef.current
    if (!host || !img || !info) return
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, 0, 0)
    ctx.strokeStyle = 'rgba(244,114,182,0.9)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let c = 0; c <= info.cols; c++) {
      const x = margin + c * (tileW + spacing)
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, canvas.height)
    }
    for (let r = 0; r <= info.rows; r++) {
      const y = margin + r * (tileH + spacing)
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(canvas.width, y + 0.5)
    }
    ctx.stroke()
    const s = Math.min(1, 260 / Math.max(canvas.width, canvas.height))
    canvas.style.width = `${Math.round(canvas.width * s)}px`
    canvas.style.height = `${Math.round(canvas.height * s)}px`
    canvas.style.imageRendering = 'pixelated'
    host.replaceChildren(canvas)
  }, [img, tileW, tileH, margin, spacing, info])

  const applySprite = async (id) => {
    setBusy(true)
    setError('')
    try {
      onApply(await tilesetFromSprite(id))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const applyFile = () => {
    if (!img || !info?.count) return
    onApply(
      buildTileset({
        dataUrl,
        imageWidth: img.naturalWidth,
        imageHeight: img.naturalHeight,
        tileW,
        tileH,
        margin,
        spacing,
        name: 'Imported tileset',
      }),
    )
  }

  const num = 'w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] dark:border-slate-600 dark:bg-slate-800'

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <h2 className="text-sm font-semibold">Choose a tileset</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-200 px-4 pt-2 dark:border-slate-800">
          {[
            ['sprite', 'From Sprite Forge'],
            ['file', 'From a PNG'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-t px-3 py-1.5 text-xs ${
                tab === id
                  ? 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

          {tab === 'sprite' && (
            <>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Every frame becomes one tile, packed into a square-ish sheet. The frame size is the tile size,
                so there is nothing to configure.
              </p>
              {sprites === null && <p className="text-xs text-slate-400">Loading…</p>}
              {sprites?.length === 0 && (
                <p className="text-xs text-slate-400">
                  No sprites saved yet. Draw some tiles in Sprite Forge first — a 4×4 block of 16 makes an
                  autotile terrain.
                </p>
              )}
              <ul className="flex flex-col gap-1">
                {sprites?.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => applySprite(s.id)}
                      className="w-full rounded px-2 py-1.5 text-left hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
                    >
                      <span className="block truncate text-xs font-medium">{s.name}</span>
                      <span className="block font-mono text-[10px] text-slate-400">
                        {s.width}×{s.height} · {s.frameCount} frame{s.frameCount === 1 ? '' : 's'} →{' '}
                        {s.frameCount} tile{s.frameCount === 1 ? '' : 's'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {tab === 'file' && (
            <>
              <label className="cursor-pointer rounded border border-dashed border-slate-400 px-3 py-4 text-center text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800">
                {img ? `${img.naturalWidth}×${img.naturalHeight} loaded — click to choose another` : 'Choose a PNG'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) pickFile(f)
                    e.target.value = ''
                  }}
                />
              </label>

              {img && (
                <>
                  <div ref={previewRef} className="flex justify-center rounded bg-slate-100 p-2 dark:bg-slate-800/60" />
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>tile</span>
                    <input type="number" min={1} value={tileW} onChange={(e) => setTileW(Math.max(1, Number(e.target.value) || 1))} className={num} />
                    <span>×</span>
                    <input type="number" min={1} value={tileH} onChange={(e) => setTileH(Math.max(1, Number(e.target.value) || 1))} className={num} />
                    <span>margin</span>
                    <input type="number" min={0} value={margin} onChange={(e) => setMargin(Math.max(0, Number(e.target.value) || 0))} className={num} />
                    <span>spacing</span>
                    <input type="number" min={0} value={spacing} onChange={(e) => setSpacing(Math.max(0, Number(e.target.value) || 0))} className={num} />
                  </div>
                  <p className="font-mono text-[10px] text-slate-400">
                    {info?.cols}×{info?.rows} = {info?.count} tiles
                  </p>
                  {/* A remainder means the grid does not divide the image evenly,
                      which is nearly always a wrong tile size rather than a
                      deliberately ragged sheet. */}
                  {info && (img.naturalWidth - margin * 2 + spacing) % (tileW + spacing) !== 0 && (
                    <p className="rounded bg-amber-50 px-2 py-1.5 text-[10px] leading-relaxed text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      {tileW}px tiles leave a remainder across this image, so the last column is cut off. Check
                      the tile size, or set a margin if the sheet has a border.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={applyFile}
                    disabled={!info?.count}
                    className="rounded bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    Use these {info?.count ?? 0} tiles
                  </button>
                </>
              )}
            </>
          )}

          {/* Changing tile size after a map exists would leave every placed tile
              pointing at the wrong art, so say so rather than silently remap. */}
          {doc.tileset && (
            <p className="border-t border-slate-200 pt-3 text-[10px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Replacing the tileset keeps every tile <em>index</em> you have already placed. A new sheet with
              the same layout recolors the map instantly; a differently-arranged one will scramble it.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
