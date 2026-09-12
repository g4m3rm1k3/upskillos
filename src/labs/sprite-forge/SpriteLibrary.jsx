import { useEffect, useState } from 'react'
import { PALETTES, DEFAULT_PALETTE_ID } from './palettes.js'
import { deleteSprite, listSprites } from './db.js'

const SIZES = [8, 16, 24, 32, 48, 64]

// Sprite picker and new-sprite form. Sprites are stored per browser, so this is
// also the only place the count of saved work is visible — worth showing plainly
// rather than hiding behind a menu, since nothing here syncs anywhere.
export default function SpriteLibrary({ currentId, onOpen, onNew, onClose }) {
  const [rows, setRows] = useState(null)
  const [size, setSize] = useState(32)
  const [width, setWidth] = useState(32)
  const [height, setHeight] = useState(32)
  const [paletteId, setPaletteId] = useState(DEFAULT_PALETTE_ID)
  const [name, setName] = useState('New sprite')
  const [square, setSquare] = useState(true)

  const refresh = () => {
    listSprites()
      .then(setRows)
      .catch(() => setRows([]))
  }
  useEffect(refresh, [])

  const chooseSize = (s) => {
    setSize(s)
    setWidth(s)
    if (square) setHeight(s)
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <h2 className="text-sm font-semibold">Sprites</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
          {/* New */}
          <div className="flex flex-col gap-2 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              New sprite
            </h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
              placeholder="Name"
            />
            <div className="flex flex-wrap gap-1">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => chooseSize(s)}
                  className={`rounded px-2 py-1 font-mono text-[11px] ${
                    size === s && width === s
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {s}²
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <input
                type="number"
                min={4}
                max={128}
                value={width}
                onChange={(e) => {
                  const v = Number(e.target.value) || 0
                  setWidth(v)
                  if (square) setHeight(v)
                }}
                className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono dark:border-slate-600 dark:bg-slate-800"
              />
              ×
              <input
                type="number"
                min={4}
                max={128}
                value={height}
                onChange={(e) => setHeight(Number(e.target.value) || 0)}
                disabled={square}
                className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"
              />
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={square} onChange={(e) => setSquare(e.target.checked)} className="h-3 w-3" />
                square
              </label>
            </div>

            <label className="text-[11px] text-slate-500 dark:text-slate-400">
              Palette
              <select
                value={paletteId}
                onChange={(e) => setPaletteId(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px] dark:border-slate-600 dark:bg-slate-800"
              >
                {PALETTES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {/* The note explains what the palette is *for* rather than just
                naming it — choosing a constrained palette is a craft decision,
                and the reason it helps is not obvious up front. */}
            <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              {PALETTES.find((p) => p.id === paletteId)?.note}
            </p>
            <div className="flex gap-1">
              {(PALETTES.find((p) => p.id === paletteId)?.colors ?? []).map((c) => (
                <span key={c} className="h-4 flex-1 rounded-sm" style={{ background: c }} />
              ))}
            </div>

            <button
              type="button"
              onClick={() => onNew({ width, height, paletteId, name })}
              className="mt-1 rounded bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
            >
              Create
            </button>
          </div>

          {/* Saved */}
          <div className="flex min-h-0 flex-col p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Saved in this browser
            </h3>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
              {rows === null && <p className="text-xs text-slate-400">Loading…</p>}
              {rows?.length === 0 && (
                <p className="text-xs text-slate-400">Nothing saved yet — the sprite you are editing appears here once it autosaves.</p>
              )}
              <ul className="flex flex-col gap-1">
                {rows?.map((r) => (
                  <li
                    key={r.id}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 ${
                      r.id === currentId ? 'bg-brand-50 dark:bg-brand-950/40' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <button type="button" onClick={() => onOpen(r.id)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-xs font-medium">{r.name}</span>
                      <span className="block font-mono text-[10px] text-slate-400">
                        {r.width}×{r.height} · {r.frameCount} frame{r.frameCount === 1 ? '' : 's'}
                        {r.id === currentId ? ' · open' : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteSprite(r.id)
                        refresh()
                      }}
                      disabled={r.id === currentId}
                      className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/40"
                      title={r.id === currentId ? 'Close this sprite before deleting it' : 'Delete'}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
