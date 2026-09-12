import { useEffect, useState } from 'react'
import { deleteMap, listMaps } from './db.js'

const PRESETS = [
  { label: 'Screen', cols: 20, rows: 15, note: 'One 320×240 screen of 16px tiles' },
  { label: 'Room', cols: 40, rows: 25, note: 'A scrolling room' },
  { label: 'Level', cols: 100, rows: 30, note: 'A side-scrolling level' },
]

export default function MapLibrary({ currentId, onOpen, onNew, onClose }) {
  const [rows, setRows] = useState(null)
  const [name, setName] = useState('New map')
  const [cols, setCols] = useState(40)
  const [mapRows, setMapRows] = useState(25)
  const [tile, setTile] = useState(16)

  const refresh = () => {
    listMaps()
      .then(setRows)
      .catch(() => setRows([]))
  }
  useEffect(refresh, [])

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <h2 className="text-sm font-semibold">Maps</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
          <div className="flex flex-col gap-2 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              New map
            </h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="rounded border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
            <div className="flex flex-col gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setCols(p.cols)
                    setMapRows(p.rows)
                  }}
                  className={`rounded px-2 py-1 text-left text-[11px] ${
                    cols === p.cols && mapRows === p.rows
                      ? 'bg-brand-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="font-medium">{p.label}</span>{' '}
                  <span className="font-mono opacity-70">
                    {p.cols}×{p.rows}
                  </span>
                  <span className="block text-[10px] opacity-70">{p.note}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <input
                type="number"
                min={1}
                max={512}
                value={cols}
                onChange={(e) => setCols(Number(e.target.value) || 1)}
                className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono dark:border-slate-600 dark:bg-slate-800"
              />
              ×
              <input
                type="number"
                min={1}
                max={512}
                value={mapRows}
                onChange={(e) => setMapRows(Number(e.target.value) || 1)}
                className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono dark:border-slate-600 dark:bg-slate-800"
              />
              tiles
            </div>
            <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              tile size
              <input
                type="number"
                min={1}
                max={128}
                value={tile}
                onChange={(e) => setTile(Number(e.target.value) || 16)}
                className="w-16 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono dark:border-slate-600 dark:bg-slate-800"
              />
              px
            </label>
            <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              Match the tile size to the sprites you drew — a 16×16 sprite sheet wants 16px tiles.
            </p>
            <button
              type="button"
              onClick={() => onNew({ name, cols, rows: mapRows, tileW: tile, tileH: tile })}
              className="mt-1 rounded bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
            >
              Create
            </button>
          </div>

          <div className="flex min-h-0 flex-col p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Saved in this browser
            </h3>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
              {rows === null && <p className="text-xs text-slate-400">Loading…</p>}
              {rows?.length === 0 && <p className="text-xs text-slate-400">Nothing saved yet.</p>}
              <ul className="flex flex-col gap-1">
                {rows?.map((r) => (
                  <li
                    key={r.id}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 ${
                      r.id === currentId
                        ? 'bg-brand-50 dark:bg-brand-950/40'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <button type="button" onClick={() => onOpen(r.id)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-xs font-medium">{r.name}</span>
                      <span className="block font-mono text-[10px] text-slate-400">
                        {r.cols}×{r.rows} @ {r.tileW}px · {r.layerCount} layer{r.layerCount === 1 ? '' : 's'}
                        {r.id === currentId ? ' · open' : ''}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteMap(r.id)
                        refresh()
                      }}
                      disabled={r.id === currentId}
                      className="rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/40"
                      title={r.id === currentId ? 'Close this map before deleting it' : 'Delete'}
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
