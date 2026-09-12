// Left-hand tool rail. Shortcut letters follow the conventions pixel artists
// already have in their fingers from Aseprite and Photoshop (B pencil, E
// eraser, G fill, I picker), so the muscle memory transfers.

export const TOOLS = [
  { id: 'pencil', label: 'Pencil', key: 'B', icon: '✏' },
  { id: 'eraser', label: 'Eraser', key: 'E', icon: '⌫' },
  { id: 'fill', label: 'Fill', key: 'G', icon: '▨' },
  { id: 'line', label: 'Line', key: 'L', icon: '╱' },
  { id: 'rect', label: 'Rectangle', key: 'R', icon: '▭' },
  { id: 'rectFill', label: 'Filled rectangle', key: '⇧R', icon: '▬' },
  { id: 'ellipse', label: 'Ellipse', key: 'O', icon: '◯' },
  { id: 'ellipseFill', label: 'Filled ellipse', key: '⇧O', icon: '●' },
  { id: 'picker', label: 'Pick color', key: 'I', icon: '⛏' },
  { id: 'pan', label: 'Pan view', key: 'H', icon: '✋' },
]

const BRUSH_SIZES = [1, 2, 3, 4, 6, 8]

function RailButton({ active, title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`h-9 w-9 shrink-0 rounded-md text-base leading-none transition-colors ${
        active
          ? 'bg-brand-500 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

export default function ToolRail({
  tool,
  onSelectTool,
  brushSize,
  onBrushSize,
  symmetry,
  onSymmetry,
  showGrid,
  onShowGrid,
  onionSkin,
  onOnionSkin,
  tileGuide,
  onTileGuide,
}) {
  const shapeToolActive = tool !== 'fill' && tool !== 'picker' && tool !== 'pan'

  return (
    <div className="flex w-12 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-slate-200 bg-slate-50 py-2 dark:border-slate-800 dark:bg-slate-900">
      {TOOLS.map((t) => (
        <RailButton
          key={t.id}
          active={tool === t.id}
          title={`${t.label} (${t.key})`}
          onClick={() => onSelectTool(t.id)}
        >
          {t.icon}
        </RailButton>
      ))}

      <div className="my-1 h-px w-7 bg-slate-200 dark:bg-slate-700" />

      {/* Brush size only affects the tools that stamp, so it is hidden rather
          than disabled for fill/picker/pan — a control that cannot do anything
          is just noise in a rail this narrow. */}
      {shapeToolActive && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[9px] uppercase tracking-wide text-slate-400">px</span>
          {BRUSH_SIZES.map((s) => (
            <button
              key={s}
              type="button"
              title={`Brush ${s}px ([ and ] to change)`}
              onClick={() => onBrushSize(s)}
              className={`h-6 w-7 rounded text-[11px] font-mono transition-colors ${
                brushSize === s
                  ? 'bg-brand-500 text-white'
                  : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
          <div className="my-1 h-px w-7 bg-slate-200 dark:bg-slate-700" />
        </div>
      )}

      <RailButton
        active={symmetry.mirrorX}
        title="Mirror horizontally while drawing (Shift+X)"
        onClick={() => onSymmetry({ ...symmetry, mirrorX: !symmetry.mirrorX })}
      >
        ⇔
      </RailButton>
      <RailButton
        active={symmetry.mirrorY}
        title="Mirror vertically while drawing (Shift+Y)"
        onClick={() => onSymmetry({ ...symmetry, mirrorY: !symmetry.mirrorY })}
      >
        ⇕
      </RailButton>
      <RailButton active={showGrid} title="Pixel grid (')" onClick={() => onShowGrid(!showGrid)}>
        ⊞
      </RailButton>
      <RailButton
        active={onionSkin}
        title="Onion skin — ghost the neighbouring frames (;)"
        onClick={() => onOnionSkin(!onionSkin)}
      >
        ◍
      </RailButton>
      <RailButton
        active={tileGuide > 0}
        title={tileGuide > 0 ? `Tile guide: every ${tileGuide}px — click to cycle` : 'Tile guide: off'}
        onClick={() => onTileGuide(tileGuide === 0 ? 8 : tileGuide === 8 ? 16 : 0)}
      >
        ▦
      </RailButton>
    </div>
  )
}
