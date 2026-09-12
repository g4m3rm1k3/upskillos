// Layer list. Order is paint order, so the list is shown top-to-bottom in
// reverse — the layer drawn last (the one in front) sits at the top, matching
// every other editor and, more importantly, matching what you see on the map.

export default function LayersPanel({
  doc,
  layerIndex,
  onSelect,
  onUpdate,
  onAdd,
  onRemove,
  onDuplicate,
  onMove,
  onClear,
}) {
  const rows = doc.layers.map((layer, index) => ({ layer, index })).reverse()

  return (
    <div className="flex flex-col gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Layers
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onAdd('tiles')}
            className="rounded px-1.5 py-0.5 text-[10px] text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950/40"
          >
            + tiles
          </button>
          <button
            type="button"
            onClick={() => onAdd('collision')}
            className="rounded px-1.5 py-0.5 text-[10px] text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            title="A layer of solid/empty cells — no art, exported as collision geometry"
          >
            + collision
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-1">
        {rows.map(({ layer, index }) => {
          const active = index === layerIndex
          return (
            <li
              key={layer.id}
              className={`rounded border px-2 py-1.5 ${
                active
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30'
                  : 'border-transparent bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdate(index, { visible: !layer.visible })}
                  className="text-xs opacity-80 hover:opacity-100"
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? '👁' : '⊘'}
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(index, { locked: !layer.locked })}
                  className="text-xs opacity-80 hover:opacity-100"
                  title={layer.locked ? 'Unlock layer' : 'Lock layer against edits'}
                >
                  {layer.locked ? '🔒' : '🔓'}
                </button>
                <button type="button" onClick={() => onSelect(index)} className="min-w-0 flex-1 text-left">
                  <input
                    value={layer.name}
                    onChange={(e) => onUpdate(index, { name: e.target.value })}
                    onFocus={() => onSelect(index)}
                    className="w-full truncate border-0 bg-transparent p-0 text-xs font-medium focus:outline-none"
                  />
                </button>
                {layer.kind === 'collision' && (
                  <span className="rounded bg-rose-500/20 px-1 text-[9px] text-rose-600 dark:text-rose-300">
                    solid
                  </span>
                )}
              </div>

              {active && (
                <div className="mt-1 flex items-center gap-1">
                  {layer.kind !== 'collision' && (
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={layer.opacity}
                      onChange={(e) => onUpdate(index, { opacity: Number(e.target.value) })}
                      className="h-1 flex-1 accent-brand-500"
                      title={`Opacity ${Math.round(layer.opacity * 100)}%`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onMove(index, index + 1)}
                    disabled={index === doc.layers.length - 1}
                    className="rounded px-1 text-[10px] text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"
                    title="Bring forward"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(index, index - 1)}
                    disabled={index === 0}
                    className="rounded px-1 text-[10px] text-slate-400 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-700"
                    title="Send backward"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate(index)}
                    className="rounded px-1 text-[10px] text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    title="Duplicate layer"
                  >
                    ⧉
                  </button>
                  <button
                    type="button"
                    onClick={() => onClear(index)}
                    className="rounded px-1 text-[10px] text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    title="Clear layer"
                  >
                    ⌫
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    disabled={doc.layers.length <= 1}
                    className="rounded px-1 text-[10px] text-slate-400 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-30 dark:hover:bg-rose-950/40"
                    title="Delete layer"
                  >
                    ✕
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
