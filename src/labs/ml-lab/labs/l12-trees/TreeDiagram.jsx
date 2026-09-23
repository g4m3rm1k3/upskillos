import React from 'react'

// Node-link diagram. Leaves are spaced evenly; parents sit above their children.
export default function TreeDiagram({ tree, names = ['x1', 'x2'], highlight = new Set(), maxDepth = 5, format = v => `${Math.round(v * 100)}%`, label = 'Decision tree diagram' }) {
  const nodes = [], edges = []
  let leafIndex = 0
  const place = (n, depth) => {
    const cut = depth >= maxDepth && n.split
    if (!n.split || cut) { const p = { n, x: leafIndex++, depth, cut }; nodes.push(p); return p }
    const l = place(n.left, depth + 1), r = place(n.right, depth + 1), p = { n, x: (l.x + r.x) / 2, depth }
    nodes.push(p); edges.push([p, l, '≤'], [p, r, '>']); return p
  }
  place(tree, 0)
  const width = 560, rowH = 62, depthMax = Math.max(...nodes.map(p => p.depth)), height = (depthMax + 1) * rowH + 20
  const X = x => 30 + (leafIndex <= 1 ? (width - 60) / 2 : x / (leafIndex - 1) * (width - 60)), Y = d => 22 + d * rowH
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
    {edges.map(([a, b, s], i) => <g key={i}>
      <line x1={X(a.x)} y1={Y(a.depth) + 12} x2={X(b.x)} y2={Y(b.depth) - 12} stroke={highlight.has(a.n.id) && highlight.has(b.n.id) ? 'var(--accent)' : 'var(--border)'} strokeWidth={highlight.has(a.n.id) && highlight.has(b.n.id) ? 3 : 1.5} />
      <text x={(X(a.x) + X(b.x)) / 2 + (s === '≤' ? -8 : 8)} y={(Y(a.depth) + Y(b.depth)) / 2 + 4} textAnchor="middle">{s}</text>
    </g>)}
    {nodes.map(p => {
      const leaf = !p.n.split || p.cut, on = highlight.has(p.n.id)
      return <g key={p.n.id}>
        <rect x={X(p.x) - (leaf ? 26 : 38)} y={Y(p.depth) - 12} width={leaf ? 52 : 76} height={24} rx={leaf ? 12 : 5}
          fill={leaf ? (p.n.value >= 0.5 ? 'var(--chart-val)' : 'var(--chart-train)') : 'var(--surface)'} opacity={leaf ? 0.25 + 0.6 * Math.abs(p.n.value - 0.5) * 2 : 1}
          stroke={on ? 'var(--accent)' : 'var(--border)'} strokeWidth={on ? 3 : 1} />
        <text x={X(p.x)} y={Y(p.depth) + 4} textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 10 }}>{p.cut ? '…' : leaf ? format(p.n.value) : `${names[p.n.split.feature]} ≤ ${p.n.split.threshold.toFixed(2)}`}</text>
        {leaf && !p.cut && <text x={X(p.x)} y={Y(p.depth) + 24} textAnchor="middle" style={{ fontSize: 9 }}>n={p.n.n}</text>}
      </g>
    })}
  </svg>
}
