import { useEffect, useRef, useState } from 'react'
import { imageToFrames, loadImageFile } from './render.js'

// Bringing a PNG in, with the one decision that actually matters made explicit:
// is this image a single sprite, or a sheet that should be sliced back into
// frames? Guessing from the dimensions is tempting and wrong often enough to be
// worse than asking — a 64x16 image is equally plausibly one wide sprite or four
// 16x16 frames.
export default function ImportDialog({ doc, onApply, onClose }) {
  const [img, setImg] = useState(null)
  const [error, setError] = useState('')
  const [sliced, setSliced] = useState(true)
  const [cellW, setCellW] = useState(doc.width)
  const [cellH, setCellH] = useState(doc.height)
  const [extract, setExtract] = useState(false)
  const [mode, setMode] = useState('append')
  const previewRef = useRef(null)

  const pick = async (file) => {
    setError('')
    try {
      const loaded = await loadImageFile(file)
      setImg(loaded)
      // Default the cell size to the document's own frame size: the overwhelmingly
      // common case is re-importing a sheet this editor exported.
      setCellW(doc.width)
      setCellH(doc.height)
    } catch (e) {
      setError(e.message)
    }
  }

  const cols = img && sliced ? Math.max(1, Math.floor(img.naturalWidth / Math.max(1, cellW))) : 1
  const rows = img && sliced ? Math.max(1, Math.floor(img.naturalHeight / Math.max(1, cellH))) : 1
  const frameCount = cols * rows

  useEffect(() => {
    const host = previewRef.current
    if (!host || !img) return
    const canvas = document.createElement('canvas')
    const max = 220
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, 0, 0)
    if (sliced && cellW > 0 && cellH > 0) {
      // Draw the slice grid over the source image — the fastest way to see that
      // a cell size is off by a pixel is to watch the lines miss the seams.
      ctx.strokeStyle = 'rgba(244,114,182,0.9)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = cellW; x < canvas.width; x += cellW) {
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, canvas.height)
      }
      for (let y = cellH; y < canvas.height; y += cellH) {
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(canvas.width, y + 0.5)
      }
      ctx.stroke()
    }
    canvas.style.width = `${Math.round(canvas.width * s)}px`
    canvas.style.height = `${Math.round(canvas.height * s)}px`
    canvas.style.imageRendering = 'pixelated'
    host.replaceChildren(canvas)
  }, [img, sliced, cellW, cellH])

  const run = () => {
    if (!img) return
    try {
      const { frames, palette } = imageToFrames(img, {
        width: doc.width,
        height: doc.height,
        palette: doc.palette,
        cellW: sliced ? cellW : 0,
        cellH: sliced ? cellH : 0,
        extractPalette: extract,
      })
      onApply({ frames, palette: extract ? palette : null, mode })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <h2 className="text-sm font-semibold">Import image</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          <label className="cursor-pointer rounded border border-dashed border-slate-400 px-3 py-4 text-center text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800">
            {img ? `${img.naturalWidth}×${img.naturalHeight} loaded — click to choose another` : 'Choose a PNG, GIF or JPEG'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) pick(f)
                e.target.value = ''
              }}
            />
          </label>

          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

          {img && (
            <>
              <div ref={previewRef} className="flex justify-center rounded bg-slate-100 p-2 dark:bg-slate-800/60" />

              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={sliced} onChange={(e) => setSliced(e.target.checked)} className="h-3.5 w-3.5" />
                This is a sheet — slice it into frames
              </label>

              {sliced && (
                <div className="flex items-center gap-2 pl-6 text-[11px] text-slate-500 dark:text-slate-400">
                  cell
                  <input
                    type="number"
                    min={1}
                    value={cellW}
                    onChange={(e) => setCellW(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono dark:border-slate-600 dark:bg-slate-800"
                  />
                  ×
                  <input
                    type="number"
                    min={1}
                    value={cellH}
                    onChange={(e) => setCellH(Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono dark:border-slate-600 dark:bg-slate-800"
                  />
                  <span>
                    → {cols}×{rows} = {frameCount} frames
                  </span>
                </div>
              )}

              <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={extract}
                  onChange={(e) => setExtract(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5"
                />
                <span>
                  Take the palette from the image
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                    Off: every pixel snaps to the nearest color already in your palette. On: the image&apos;s own
                    colors replace it — which also recolors the frames you already have, since pixels store
                    palette slots, not colors.
                  </span>
                </span>
              </label>

              <div className="flex gap-3 text-xs text-slate-600 dark:text-slate-300">
                <label className="flex items-center gap-1">
                  <input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} className="h-3 w-3" />
                  Add after existing frames
                </label>
                <label className="flex items-center gap-1">
                  <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} className="h-3 w-3" />
                  Replace all frames
                </label>
              </div>

              {/* Any mismatch between the source cell and the document frame gets
                  resampled, and on pixel art that is destructive — say so before
                  it happens rather than after. */}
              {sliced && (cellW !== doc.width || cellH !== doc.height) && (
                <p className="rounded bg-amber-50 px-2 py-1.5 text-[10px] leading-relaxed text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  Cells are {cellW}×{cellH} but this sprite is {doc.width}×{doc.height}. Each frame will be
                  resampled to fit, which on pixel art loses or doubles rows. Match the canvas size first to
                  import losslessly.
                </p>
              )}

              <button
                type="button"
                onClick={run}
                className="rounded bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
              >
                Import {frameCount} frame{frameCount === 1 ? '' : 's'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
