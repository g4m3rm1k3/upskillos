import React from 'react'

// Shapes drawn on a grid of unit squares. Children use grid units: (0, 0) is the top-left corner
// and one unit is one square. Strokes keep their width whatever the scale.
export function Field({ w, h, unit = 28, x0 = 0, y0 = 0, label, children }) {
  const pad = 0.3
  return (
    <svg
      viewBox={`${x0 - pad} ${y0 - pad} ${w + 2 * pad} ${h + 2 * pad}`}
      className="w-full"
      style={{ maxWidth: (w + 2 * pad) * unit }}
      role="img"
      aria-label={label}
    >
      {Array.from({ length: w + 1 }, (_, i) => (
        <line key={`v${i}`} x1={x0 + i} y1={y0} x2={x0 + i} y2={y0 + h} stroke="#1e293b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      {Array.from({ length: h + 1 }, (_, i) => (
        <line key={`h${i}`} x1={x0} y1={y0 + i} x2={x0 + w} y2={y0 + i} stroke="#1e293b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      {children}
    </svg>
  )
}

export const pts = list => list.map(p => p.join(',')).join(' ')

// A filled polygon in grid units.
export function Shape({ points, fill, stroke, opacity = 0.45, dash, style }) {
  return (
    <polygon
      points={pts(points)}
      fill={fill}
      fillOpacity={opacity}
      stroke={stroke ?? fill}
      strokeWidth="2"
      strokeDasharray={dash}
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      style={style}
    />
  )
}

// A text label in grid units.
export function Label({ x, y, children, size = 0.7, fill = '#e2e8f0' }) {
  return (
    <text x={x} y={y} fontSize={size} fill={fill} textAnchor="middle" dominantBaseline="central" fontWeight="700">
      {children}
    </text>
  )
}
