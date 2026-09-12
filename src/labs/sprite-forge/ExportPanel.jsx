import { useEffect, useMemo, useRef, useState } from 'react'
import {
  analyzeFrames,
  buildGridDescriptor,
  buildPhaserAtlas,
  canvasToBlob,
  downloadBlob,
  downloadText,
  layoutSheet,
  renderFrame,
  renderSheet,
  slug,
} from './render.js'
import { docToJSON } from './pixelDoc.js'

// Export is where a drawing becomes a game asset, so this panel is deliberately
// explicit about the numbers an engine will need: cell size, spacing, margin,
// column count. Those four values are the entire contract between a sheet and
// the code that slices it, and getting one wrong is the classic cause of a
// sprite that renders with a sliver of its neighbour attached.

const SCALES = [1, 2, 3, 4, 8]

function Row({ label, children, hint }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300" title={hint}>
      <span className="w-16 shrink-0 text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}

const numberInput =
  'w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[11px] dark:border-slate-600 dark:bg-slate-800'

export default function ExportPanel({ doc, onTagsChange }) {
  const [columns, setColumns] = useState(0) // 0 = single row
  const [scale, setScale] = useState(1)
  const [spacing, setSpacing] = useState(0)
  const [margin, setMargin] = useState(0)
  const [background, setBackground] = useState('')
  const [busy, setBusy] = useState(false)
  const previewRef = useRef(null)

  const options = useMemo(
    () => ({
      columns: columns || doc.frames.length,
      scale,
      spacing,
      margin,
      background: background || null,
    }),
    [columns, scale, spacing, margin, background, doc.frames.length],
  )

  const layout = useMemo(() => layoutSheet(doc, options), [doc, options])
  const analysis = useMemo(() => analyzeFrames(doc), [doc])
  const baseName = slug(doc.name)

  // The preview renders the real sheet through the real pipeline and then scales
  // the result down to fit the panel. Previewing a separately-built approximation
  // would defeat the point: what you check here is exactly what downloads.
  useEffect(() => {
    const host = previewRef.current
    if (!host) return
    const { canvas } = renderSheet(doc, options)
    const maxW = host.clientWidth || 240
    const shown = Math.min(1, maxW / canvas.width)
    canvas.style.width = `${Math.round(canvas.width * shown)}px`
    canvas.style.height = `${Math.round(canvas.height * shown)}px`
    canvas.style.imageRendering = 'pixelated'
    canvas.className = 'block'
    host.replaceChildren(canvas)
  }, [doc, options])

  const exportSheetPng = async () => {
    setBusy(true)
    try {
      const { canvas } = renderSheet(doc, options)
      downloadBlob(await canvasToBlob(canvas), `${baseName}-sheet.png`)
    } finally {
      setBusy(false)
    }
  }

  const exportFramePng = async (index) => {
    const canvas = renderFrame(doc, index, scale)
    downloadBlob(await canvasToBlob(canvas), `${baseName}-${index}.png`)
  }

  const exportAtlas = () => {
    const atlas = buildPhaserAtlas(doc, layout, `${baseName}-sheet.png`)
    downloadText(JSON.stringify(atlas, null, 2), `${baseName}-sheet.json`)
  }

  const exportGrid = () => {
    const grid = buildGridDescriptor(doc, layout, `${baseName}-sheet.png`)
    downloadText(JSON.stringify(grid, null, 2), `${baseName}-grid.json`)
  }

  const exportProject = () => {
    downloadText(JSON.stringify(docToJSON(doc)), `${baseName}.sprite.json`)
  }

  const addTag = () => {
    onTagsChange([...doc.tags, { name: `anim${doc.tags.length + 1}`, from: 0, to: Math.max(0, doc.frames.length - 1) }])
  }

  const updateTag = (i, patch) => {
    const tags = doc.tags.slice()
    tags[i] = { ...tags[i], ...patch }
    onTagsChange(tags)
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Sheet export
      </h3>

      <div className="flex flex-col gap-1.5">
        <Row label="Columns" hint="0 lays every frame out in a single row — the layout most engines assume">
          <input
            type="number"
            min={0}
            max={doc.frames.length}
            value={columns}
            onChange={(e) => setColumns(Math.max(0, Number(e.target.value) || 0))}
            className={numberInput}
          />
          <span className="text-slate-400">
            {layout.cols}x{layout.rows} grid
          </span>
        </Row>

        <Row label="Scale" hint="Upscale by a whole number so pixels stay square and crisp">
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
        </Row>

        <Row
          label="Spacing"
          hint="Padding between cells. A pixel or two prevents texture-filter bleed between neighbouring frames on some GPUs"
        >
          <input
            type="number"
            min={0}
            max={16}
            value={spacing}
            onChange={(e) => setSpacing(Math.max(0, Number(e.target.value) || 0))}
            className={numberInput}
          />
          <span className="w-10 shrink-0 text-slate-500 dark:text-slate-400">Margin</span>
          <input
            type="number"
            min={0}
            max={16}
            value={margin}
            onChange={(e) => setMargin(Math.max(0, Number(e.target.value) || 0))}
            className={numberInput}
          />
        </Row>

        <Row label="Background" hint="Leave empty for a transparent sheet, which is what a game almost always wants">
          <input
            type="color"
            value={background || '#000000'}
            onChange={(e) => setBackground(e.target.value)}
            className="h-6 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          <button
            type="button"
            onClick={() => setBackground('')}
            className={`rounded px-1.5 py-0.5 text-[10px] ${
              background
                ? 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
                : 'bg-brand-500 text-white'
            }`}
          >
            transparent
          </button>
        </Row>
      </div>

      <div className="rounded bg-slate-100 p-2 dark:bg-slate-800/60">
        <div ref={previewRef} className="overflow-hidden" />
        <p className="mt-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
          {layout.width}x{layout.height}px · cell {layout.cellW}x{layout.cellH} · {doc.frames.length} frames
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={exportSheetPng}
          disabled={busy}
          className="rounded bg-brand-500 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          ↓ Sheet PNG
        </button>
        <button
          type="button"
          onClick={() => exportFramePng(0)}
          className="rounded border border-slate-300 px-2 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          title="Export just the first frame as its own PNG"
        >
          ↓ Frame 0 PNG
        </button>
        <button
          type="button"
          onClick={exportAtlas}
          className="rounded border border-slate-300 px-2 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          title="TexturePacker-style JSON — feed straight to Phaser load.atlas or PixiJS"
        >
          ↓ Atlas JSON
        </button>
        <button
          type="button"
          onClick={exportGrid}
          className="rounded border border-slate-300 px-2 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          title="Cell size, spacing and animation ranges — for load.spritesheet, Godot or Unity"
        >
          ↓ Grid JSON
        </button>
        <button
          type="button"
          onClick={exportProject}
          className="col-span-2 rounded border border-slate-300 px-2 py-1.5 text-[11px] text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          title="The editable document — frames, palette and tags — so you can come back to it"
        >
          ↓ Save project (.sprite.json)
        </button>
      </div>

      {/* Animation tags -------------------------------------------------- */}
      <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Animations
          </h3>
          <button
            type="button"
            onClick={addTag}
            className="rounded px-1.5 py-0.5 text-[11px] text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
          >
            + tag
          </button>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
          Name a frame range — idle, run, hit — and both JSON exports carry it, so the engine defines
          animations by name instead of hard-coded indices.
        </p>
        <div className="mt-2 flex flex-col gap-1">
          {doc.tags.map((tag, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                value={tag.name}
                onChange={(e) => updateTag(i, { name: e.target.value })}
                className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] dark:border-slate-600 dark:bg-slate-800"
              />
              <input
                type="number"
                min={0}
                max={doc.frames.length - 1}
                value={tag.from}
                onChange={(e) => updateTag(i, { from: Math.max(0, Number(e.target.value) || 0) })}
                className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[11px] dark:border-slate-600 dark:bg-slate-800"
              />
              <span className="text-[10px] text-slate-400">→</span>
              <input
                type="number"
                min={0}
                max={doc.frames.length - 1}
                value={tag.to}
                onChange={(e) => updateTag(i, { to: Math.max(0, Number(e.target.value) || 0) })}
                className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 font-mono text-[11px] dark:border-slate-600 dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={() => onTagsChange(doc.tags.filter((_, j) => j !== i))}
                className="rounded px-1 text-[10px] text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pre-flight ------------------------------------------------------ */}
      <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Check
        </h3>
        <ul className="mt-1.5 flex flex-col gap-1 text-[10px] leading-relaxed">
          {analysis.emptyCount > 0 && (
            <li className="text-amber-600 dark:text-amber-400">
              {analysis.emptyCount} empty frame{analysis.emptyCount > 1 ? 's' : ''} — they still take a cell
              in the sheet.
            </li>
          )}
          {/* A bounding box that wanders is the usual explanation for an
              animation that looks like it is sliding rather than moving, and it
              is nearly impossible to spot frame by frame. */}
          {analysis.drift.bottom > 1 && (
            <li className="text-amber-600 dark:text-amber-400">
              Baseline moves {analysis.drift.bottom}px across frames — intentional for a jump, but it will
              read as a bobble on a walk cycle.
            </li>
          )}
          {analysis.drift.left > 2 && (
            <li className="text-amber-600 dark:text-amber-400">
              Left edge moves {analysis.drift.left}px across frames — the sprite will appear to slide.
            </li>
          )}
          {analysis.emptyCount === 0 && analysis.drift.bottom <= 1 && analysis.drift.left <= 2 && (
            <li className="text-emerald-600 dark:text-emerald-400">
              Frames are aligned and none are empty.
            </li>
          )}
          <li className="text-slate-500 dark:text-slate-400">
            Coverage: {Math.round(Math.max(...analysis.rows.map((r) => r.coverage)) * 100)}% of the cell at
            its fullest.
          </li>
        </ul>
      </div>
    </div>
  )
}
