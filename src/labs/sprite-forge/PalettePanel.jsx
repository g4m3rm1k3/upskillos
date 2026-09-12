import { useState } from 'react'
import { PALETTES, luminance } from './palettes.js'
import { MAX_PALETTE, TRANSPARENT } from './pixelDoc.js'

// The palette is the sprite's whole color vocabulary, so this panel does more
// than pick a color: it is also where a recolor happens. Because pixels store
// palette *indices*, editing a swatch here restyles every frame at once — which
// is the feature, not a side effect.

export default function PalettePanel({
  doc,
  value,
  onSelectValue,
  onEditColor,
  onAddColor,
  onRemoveColor,
  onApplyPreset,
  colorUsage,
}) {
  const [editing, setEditing] = useState(null)

  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Palette
        </h3>
        <select
          value={doc.paletteId}
          onChange={(e) => {
            const preset = PALETTES.find((p) => p.id === e.target.value)
            if (preset) onApplyPreset(preset)
          }}
          className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          title="Swapping presets keeps every pixel index, so the art is recolored instantly"
        >
          {doc.paletteId === 'custom' && <option value="custom">Custom</option>}
          {PALETTES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-8 gap-1">
        {/* Transparent is pixel value 0 and always available — an eraser you can
            select as a "color", which is how you erase with the shape tools. */}
        <button
          type="button"
          title="Transparent (value 0)"
          onClick={() => onSelectValue(TRANSPARENT)}
          className={`relative h-7 w-full rounded border ${
            value === TRANSPARENT
              ? 'border-brand-500 ring-2 ring-brand-500/50'
              : 'border-slate-300 dark:border-slate-600'
          }`}
          style={{
            backgroundImage:
              'linear-gradient(45deg,#94a3b8 25%,transparent 25%,transparent 75%,#94a3b8 75%),linear-gradient(45deg,#94a3b8 25%,transparent 25%,transparent 75%,#94a3b8 75%)',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0,4px 4px',
            backgroundColor: '#e2e8f0',
          }}
        />
        {doc.palette.map((hex, i) => {
          const pixelValue = i + 1
          const selected = value === pixelValue
          const unused = colorUsage ? !colorUsage[pixelValue] : false
          return (
            <button
              key={`${i}-${hex}`}
              type="button"
              onClick={() => onSelectValue(pixelValue)}
              onDoubleClick={() => setEditing(i)}
              title={`${hex}${unused ? ' — unused in this frame' : ''}\nDouble-click to edit (recolors every frame)`}
              className={`relative h-7 w-full rounded border transition-transform ${
                selected
                  ? 'border-brand-500 ring-2 ring-brand-500/60'
                  : 'border-slate-300/60 hover:scale-105 dark:border-slate-600/60'
              }`}
              style={{ background: hex }}
            >
              {selected && (
                <span
                  className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
                  style={{ color: luminance(hex) > 0.5 ? '#0f172a' : '#ffffff' }}
                >
                  ●
                </span>
              )}
              {unused && (
                <span className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
              )}
            </button>
          )
        })}
        {doc.palette.length < MAX_PALETTE && (
          <button
            type="button"
            onClick={onAddColor}
            title="Add a swatch"
            className="h-7 w-full rounded border border-dashed border-slate-400 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            +
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="flex items-center gap-2 rounded bg-slate-100 p-2 dark:bg-slate-800">
          <input
            type="color"
            value={doc.palette[editing] ?? '#ffffff'}
            onChange={(e) => onEditColor(editing, e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          <input
            type="text"
            value={doc.palette[editing] ?? ''}
            onChange={(e) => {
              const v = e.target.value.trim()
              if (/^#[0-9a-fA-F]{6}$/.test(v)) onEditColor(editing, v.toLowerCase())
            }}
            className="w-24 rounded border border-slate-300 bg-white px-1.5 py-1 font-mono text-[11px] dark:border-slate-600 dark:bg-slate-900"
          />
          <button
            type="button"
            onClick={() => {
              onRemoveColor(editing)
              setEditing(null)
            }}
            className="rounded px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            title="Remove this swatch — pixels using it become transparent"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="ml-auto rounded px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
