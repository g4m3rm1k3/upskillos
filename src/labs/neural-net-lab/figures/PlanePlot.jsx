// A plane of two inputs: points coloured by their label (0 teal, 1 orange), the background shaded
// by a model's probability of 1 at every spot, the 50% boundary, and optional straight lines
// (a neuron's w·x + b = 0). onClick(x, y) gives the clicked spot, for drawing your own points.
export const COLORS = ['#1f6f68', '#c26a12']

export default function PlanePlot({ points = [], labels = [], prob, lines = [], x: [x0, x1], y: [y0, y1], size = 340, onClick, xLabel = 'x₁', yLabel = 'x₂', highlight = null }) {
  const pad = 26, S = size
  const X = v => pad + (v - x0) / (x1 - x0) * S, Y = v => pad + (y1 - v) / (y1 - y0) * S
  const N = 36, cells = []
  if (prob) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const px = x0 + (x1 - x0) * (i + 0.5) / N, py = y1 - (y1 - y0) * (j + 0.5) / N
    const p = prob([px, py])
    cells.push(<rect key={`${i}-${j}`} x={pad + i * S / N} y={pad + j * S / N} width={S / N + 0.4} height={S / N + 0.4} fill={p >= 0.5 ? COLORS[1] : COLORS[0]} opacity={Number.isFinite(p) ? 0.08 + 0.5 * Math.abs(p - 0.5) : 0} />)
  }
  // The 50% boundary, traced along the grid: mark cells where neighbours disagree.
  const edges = []
  if (prob) {
    const M = 70
    const side = (i, j) => prob([x0 + (x1 - x0) * i / M, y1 - (y1 - y0) * j / M]) >= 0.5
    for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) {
      const s = side(i, j)
      if (s !== side(i + 1, j) || s !== side(i, j + 1)) edges.push(<rect key={`e${i}-${j}`} x={pad + (i + 0.5) * S / M - 0.8} y={pad + (j + 0.5) * S / M - 0.8} width="1.6" height="1.6" fill="#2c241b" />)
    }
  }
  const click = e => {
    if (!onClick) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width * (S + 2 * pad), py = (e.clientY - r.top) / r.height * (S + 2 * pad)
    if (px < pad || px > pad + S || py < pad || py > pad + S) return
    onClick(x0 + (px - pad) / S * (x1 - x0), y1 - (py - pad) / S * (y1 - y0))
  }
  return <svg viewBox={`0 0 ${S + 2 * pad} ${S + 2 * pad}`} className="qm-plot nn-plane" role="img" aria-label="points on a plane, shaded by the model's probability" onClick={click} style={onClick ? { cursor: 'crosshair' } : undefined}>
    <defs><clipPath id="nn-plane-clip"><rect x={pad} y={pad} width={S} height={S} /></clipPath></defs>
    <rect x={pad} y={pad} width={S} height={S} fill="#fffdf8" stroke="#d9ceb9" />
    {cells}{edges}
    <g clipPath="url(#nn-plane-clip)">
      {lines.map(([a, b, c, color], i) => {
        // a·x + b·y + c = 0, drawn across the box
        const P = Math.abs(b) > 1e-9 ? [[x0, -(a * x0 + c) / b], [x1, -(a * x1 + c) / b]] : [[-c / a, y0], [-c / a, y1]]
        return <line key={i} x1={X(P[0][0])} y1={Y(P[0][1])} x2={X(P[1][0])} y2={Y(P[1][1])} stroke={color ?? '#7a3fb0'} strokeWidth="1.3" strokeDasharray="5 4" />
      })}
      {points.map(([px, py], i) => <circle key={i} cx={X(px)} cy={Y(py)} r={i === highlight ? 6.5 : 4} fill={COLORS[labels[i]] ?? '#999'} stroke={i === highlight ? '#2c241b' : '#fff'} strokeWidth={i === highlight ? 2 : 1} />)}
    </g>
    <text x={pad + S} y={S + 2 * pad - 6} textAnchor="end" className="qm-tick" fontStyle="italic">{xLabel} →</text>
    <text x={pad} y={pad - 8} className="qm-tick" fontStyle="italic">↑ {yLabel}</text>
  </svg>
}
