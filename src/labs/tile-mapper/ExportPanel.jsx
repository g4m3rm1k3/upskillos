import { useMemo, useState } from 'react'
import {
  buildPhaserSnippet,
  buildTiledMap,
  canvasToBlob,
  dataUrlToBlob,
  downloadBlob,
  downloadText,
  renderFlat,
  slug,
} from './render.js'
import { docToJSON, countUsedTiles, usedBounds } from './tilemapDoc.js'

// Two very different outputs live here, and the distinction is the thing to be
// clear about: a **background PNG** is one flat picture to draw behind a scene,
// while the **Tiled JSON** is live map data an engine streams, collides against
// and edits. Most people want one and are surprised by the other.

const SCALES = [1, 2, 3, 4]

export default function ExportPanel({ doc, image }) {
  const [scale, setScale] = useState(1)
  const [crop, setCrop] = useState(false)
  const [transparent, setTransparent] = useState(true)
  const [background, setBackground] = useState('#1e293b')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const base = slug(doc.name)
  const imageName = `${base}-tiles.png`
  const mapName = `${base}.tmj`

  const bounds = useMemo(() => usedBounds(doc), [doc])
  const used = useMemo(() => countUsedTiles(doc), [doc])
  const outCols = crop && bounds ? bounds.cols : doc.cols
  const outRows = crop && bounds ? bounds.rows : doc.rows

  const exportPng = async () => {
    setBusy(true)
    try {
      const canvas = renderFlat(doc, image, {
        scale,
        crop,
        background: transparent ? null : background,
      })
      downloadBlob(await canvasToBlob(canvas), `${base}-background.png`)
    } finally {
      setBusy(false)
    }
  }

  const exportTiled = () => {
    downloadText(JSON.stringify(buildTiledMap(doc, imageName), null, 2), mapName)
  }

  const exportTilesetPng = () => {
    if (!doc.tileset) return
    downloadBlob(dataUrlToBlob(doc.tileset.dataUrl), imageName)
  }

  const exportProject = () => {
    downloadText(JSON.stringify(docToJSON(doc)), `${base}.tilemap.json`)
  }

  const snippet = useMemo(() => buildPhaserSnippet(doc, mapName, imageName), [doc, mapName, imageName])

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard permission can be refused; the code is on screen to select.
    }
  }

  const btn =
    'rounded border border-slate-300 px-2 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'

  return (
    <div className="flex flex-col gap-3 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Background image
      </h3>

      <div className="flex flex-col gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
        <label className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-slate-500 dark:text-slate-400">Scale</span>
          <div className="flex gap-1">
            {SCALES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScale(s)}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                  scale === s
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </label>

        <label className="flex items-center gap-2" title="Trim the export down to the cells you actually painted">
          <input type="checkbox" checked={crop} onChange={(e) => setCrop(e.target.checked)} className="h-3 w-3" />
          Crop to painted area
          {crop && bounds && (
            <span className="font-mono text-[10px] text-slate-400">
              {bounds.cols}×{bounds.rows} of {doc.cols}×{doc.rows}
            </span>
          )}
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={transparent}
            onChange={(e) => setTransparent(e.target.checked)}
            className="h-3 w-3"
          />
          Transparent background
          {!transparent && (
            <input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              className="h-5 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          )}
        </label>
      </div>

      <p className="font-mono text-[10px] text-slate-400">
        {outCols * doc.tileW * scale}×{outRows * doc.tileH * scale}px · {used} tiles placed
      </p>

      <button
        type="button"
        onClick={exportPng}
        disabled={busy || !image}
        className="rounded bg-brand-500 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        ↓ Background PNG
      </button>
      <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
        One flattened picture — visible tile layers only, collision excluded. Good for a parallax plate or a
        static backdrop.
      </p>

      <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Map data
        </h3>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
          Tiled&apos;s <span className="font-mono">.tmj</span> — the format Phaser, Godot, LÖVE and Defold all
          read. Download both files side by side.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button type="button" onClick={exportTiled} className={btn}>
            ↓ {mapName}
          </button>
          <button type="button" onClick={exportTilesetPng} disabled={!doc.tileset} className={`${btn} disabled:opacity-50`}>
            ↓ {imageName}
          </button>
          <button type="button" onClick={exportProject} className={`${btn} col-span-2`} title="The editable document — layers, tileset and terrains">
            ↓ Save project (.tilemap.json)
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Phaser loader
          </h3>
          <button
            type="button"
            onClick={copySnippet}
            className="rounded px-1.5 py-0.5 text-[10px] text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
          >
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
        {/* The names in this snippet have to match the names inside the .tmj,
            which is the single most common thing to get wrong — so generate it
            from the actual document rather than leaving it to be retyped. */}
        <pre className="mt-1.5 max-h-44 overflow-auto rounded bg-slate-900 p-2 font-mono text-[9px] leading-relaxed text-slate-200">
          {snippet}
        </pre>
      </div>
    </div>
  )
}
