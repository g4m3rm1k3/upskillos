import React from 'react'
import { ARROW, key, unkey } from './world.js'

// The map, drawn as an SVG grid. Everything on top of it is optional:
//   marks   {cell: 'focus' | 'read' | 'good' | 'bad' | 'path' | 'dim'}   outlines and fills
//   labels  {cell: text}                 small text in the cell (a value, a count)
//   heat    {cell: number}, heatRange [lo, hi]   a colour from low (warm) to high (cool)
//   arrows  {cell: action}               one arrow per cell (a plan)
//   flows   [{from, to, p, bump}]        outcome arrows, thickness = chance; a bump curls back
//   agent   cell                         the mouse
//   rc      true: row and column numbers on the edges
//   onCell  (cell) => …                 makes every cell a button
export default function MazeView({ maze, size = 46, marks = {}, labels = {}, heat, heatRange, arrows = {}, flows = [], agent, rc = false, onCell, path, title, compact = false }) {
  if (!maze) return null
  const pad = rc ? 22 : 4
  const W = maze.cols * size + pad + 4, H = maze.rows * size + pad + 4
  const xy = cell => { const [r, c] = unkey(cell); return [pad + c * size, pad + r * size] }
  const mid = cell => { const [x, y] = xy(cell); return [x + size / 2, y + size / 2] }
  const [lo, hi] = heatRange ?? (heat ? [Math.min(...Object.values(heat)), Math.max(...Object.values(heat))] : [0, 1])
  const tone = v => {
    const t = hi > lo ? Math.max(0, Math.min(1, (v - lo) / (hi - lo))) : 0.5
    return `hsl(${Math.round(15 + t * 175)} 70% ${Math.round(30 + t * 14)}%)`
  }
  const cells = []
  for (let r = 0; r < maze.rows; r++) for (let c = 0; c < maze.cols; c++) cells.push(key(r, c))
  const font = Math.max(10, Math.round(size * 0.26))
  return (
    <svg className={`mlf-maze${compact ? ' compact' : ''}`} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={title ?? 'The map'}>
      {rc && Array.from({ length: maze.cols }, (_, c) => <text key={`c${c}`} className="mlf-rc" x={pad + c * size + size / 2} y={14} textAnchor="middle">{c}</text>)}
      {rc && Array.from({ length: maze.rows }, (_, r) => <text key={`r${r}`} className="mlf-rc" x={10} y={pad + r * size + size / 2 + 4} textAnchor="middle">{r}</text>)}
      {cells.map(cell => {
        const ch = maze.cells[cell]
        const [x, y] = xy(cell)
        const wall = ch === '#'
        const mark = marks[cell]
        if (ch === undefined) return <rect key={cell} className="mlf-unset" x={xy(cell)[0] + 1} y={xy(cell)[1] + 1} width={size - 2} height={size - 2} rx={5} />
        const fill = wall ? 'var(--mlf-wall)' : heat && cell in heat ? tone(heat[cell]) : 'var(--mlf-floor)'
        const [r, c] = unkey(cell)
        const name = `row ${r}, column ${c}: ${wall ? 'wall' : ch === 'S' ? 'start' : ch === 'G' ? 'goal' : 'floor'}${labels[cell] !== undefined ? `, ${labels[cell]}` : ''}`
        return (
          <g key={cell} className={`mlf-cell${mark ? ` m-${mark}` : ''}${onCell ? ' clickable' : ''}`}
            onClick={onCell ? () => onCell(cell) : undefined}
            onKeyDown={onCell ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCell(cell) } } : undefined}
            tabIndex={onCell ? 0 : undefined} role={onCell ? 'button' : undefined} aria-label={onCell ? name : undefined}>
            <rect x={x + 1} y={y + 1} width={size - 2} height={size - 2} rx={5} fill={fill} />
            {mark && <rect className="mlf-mark" x={x + 2.5} y={y + 2.5} width={size - 5} height={size - 5} rx={4} />}
            {ch === 'G' && <text x={x + size / 2} y={y + size / 2 + size * 0.13} textAnchor="middle" fontSize={size * 0.42} aria-hidden="true">🧀</text>}
            {ch === 'S' && agent !== cell && <text className="mlf-start" x={x + 5} y={y + 13} fontSize={11}>S</text>}
            {arrows[cell] && <text className="mlf-arrow" x={x + size / 2} y={y + size / 2 + size * 0.14} textAnchor="middle" fontSize={size * 0.44}>{ARROW[arrows[cell]]}</text>}
            {labels[cell] !== undefined && <text className="mlf-label" x={x + size / 2} y={y + size - 6} textAnchor="middle" fontSize={font}>{labels[cell]}</text>}
            {mark === 'bad' && <text className="mlf-x" x={x + size - 11} y={y + 14} fontSize={12} aria-hidden="true">✗</text>}
            {mark === 'good' && <text className="mlf-tick" x={x + size - 12} y={y + 14} fontSize={12} aria-hidden="true">✓</text>}
          </g>
        )
      })}
      {path && path.length > 1 && <polyline className="mlf-path" points={path.map(mid).map(p => p.join(',')).join(' ')} />}
      <defs>
        <marker id="mlf-head" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mlf-flow)" /></marker>
        <marker id="mlf-head-bump" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--mlf-bad)" /></marker>
      </defs>
      {flows.map((f, i) => {
        const [x1, y1] = mid(f.from)
        const w = 1.5 + 9 * f.p
        if (f.bump || f.to === f.from) {
          const [dx, dy] = f.dir ?? [0, -1]
          const ex = x1 + dx * size * 0.34, ey = y1 + dy * size * 0.34
          const nx = -dy * size * 0.22, ny = dx * size * 0.22
          return <g key={i}><path className="mlf-flow bump" strokeWidth={w} d={`M${x1 + nx * 0.4},${y1 + ny * 0.4} Q${ex + nx},${ey + ny} ${ex},${ey} Q${ex - nx},${ey - ny} ${x1 - nx * 0.4},${y1 - ny * 0.4}`} markerEnd="url(#mlf-head-bump)" />
            {f.label && <text className="mlf-flow-label" x={x1 + dx * size * 0.62} y={y1 + dy * size * 0.62 + 4} textAnchor="middle">{f.label}</text>}</g>
        }
        const [x2, y2] = mid(f.to)
        const sx = x1 + (x2 - x1) * 0.22, sy = y1 + (y2 - y1) * 0.22, ex = x1 + (x2 - x1) * 0.78, ey = y1 + (y2 - y1) * 0.78
        return <g key={i}><line className="mlf-flow" strokeWidth={w} x1={sx} y1={sy} x2={ex} y2={ey} markerEnd="url(#mlf-head)" />
          {f.label && <text className="mlf-flow-label" x={(x1 + x2) / 2 + (y2 !== y1 ? 14 : 0)} y={(y1 + y2) / 2 + (y2 === y1 ? -8 : 4)} textAnchor="middle">{f.label}</text>}</g>
      })}
      {agent && (() => { const [x, y] = xy(agent); return <text className="mlf-agent" x={x + size / 2} y={y + size / 2 + size * 0.15} textAnchor="middle" fontSize={size * 0.5} aria-label="the mouse">🐭</text> })()}
    </svg>
  )
}
