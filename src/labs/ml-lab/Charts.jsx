import React from 'react'
import { predict } from './engine.js'

export function DataPlot({ train, validation, model, reference }) {
  const points = [...train, ...validation]
  const xs = points.map(p => p.x), ys = points.map(p => p.y)
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys)
  const dx = Math.max(xmax - xmin, 1) * 0.12, dy = Math.max(ymax - ymin, 1) * 0.15
  const x0 = xmin-dx, x1=xmax+dx, y0=ymin-dy, y1=ymax+dy
  const X = x => 54 + (x-x0)/(x1-x0)*480, Y = y => 280-(y-y0)/(y1-y0)*250
  const line = (w,b) => `M ${X(x0)} ${Y(predict(x0,w,b))} L ${X(x1)} ${Y(predict(x1,w,b))}`
  return <svg viewBox="0 0 560 325" role="img" aria-label="Training circles, validation diamonds, current prediction line and dashed least-squares reference">
    <defs><clipPath id="ml-plot-clip"><rect x="54" y="30" width="480" height="250" /></clipPath></defs>
    {[0,1,2,3,4].map(i => { const y=y0+(y1-y0)*i/4, x=x0+(x1-x0)*i/4; return <g key={i}>
      <line x1="54" y1={Y(y)} x2="534" y2={Y(y)} stroke="var(--border)" />
      <text x="47" y={Y(y)+4} textAnchor="end">{y.toFixed(1)}</text>
      <text x={X(x)} y="299" textAnchor="middle">{x.toFixed(1)}</text>
    </g> })}
    <g clipPath="url(#ml-plot-clip)">
      {train.slice(0,100).map((p,i) => <line key={`e${i}`} x1={X(p.x)} x2={X(p.x)} y1={Y(p.y)} y2={Y(predict(p.x,model.w,model.b))} stroke="var(--chart-model)" opacity="0.2" />)}
      <path d={line(reference.w,reference.b)} fill="none" stroke="var(--muted)" strokeDasharray="6 5" strokeWidth="2" />
      <path d={line(model.w,model.b)} fill="none" stroke="var(--chart-model)" strokeWidth="3" />
      {train.map((p,i) => <circle key={i} cx={X(p.x)} cy={Y(p.y)} r="3.5" fill="var(--chart-train)"><title>{`Training: x=${p.x}, y=${p.y}`}</title></circle>)}
      {validation.map((p,i) => <path key={i} d={`M ${X(p.x)} ${Y(p.y)-4} l 4 4 l -4 4 l -4 -4 Z`} fill="var(--chart-val)"><title>{`Validation: x=${p.x}, y=${p.y}`}</title></path>)}
    </g>
    <text x="290" y="320" textAnchor="middle">input x</text><text x="16" y="155" transform="rotate(-90 16 155)" textAnchor="middle">observed / predicted y</text>
  </svg>
}
export function LossPlot({ history }) {
  const max = Math.max(1, ...history.flatMap(p => [p.train,p.validation]).map(v => Math.log10(1+v)))
  const X = s => 54 + s/Math.max(1,history.at(-1).step)*480, Y = v => 150-Math.log10(1+v)/max*120
  return <svg viewBox="0 0 560 190" role="img" aria-label="Training and validation mean squared error by iteration, logarithmic one-plus-loss scale">
    {[0,0.5,1].map(f => <g key={f}><line x1="54" x2="534" y1={150-f*120} y2={150-f*120} stroke="var(--border)" /><text x="47" y={154-f*120} textAnchor="end">{(10**(f*max)-1).toPrecision(2)}</text></g>)}
    {['train','validation'].map((key,i) => <polyline key={key} points={history.map(h => `${X(h.step)},${Y(h[key])}`).join(' ')} fill="none" stroke={i ? 'var(--chart-val)' : 'var(--chart-train)'} strokeWidth="2.5" strokeDasharray={i ? '6 3' : undefined} />)}
    <circle cx={X(history.at(-1).step)} cy={Y(history.at(-1).train)} r="3" fill="var(--chart-train)" />
    <text x="54" y="170">0</text><text x="534" y="170" textAnchor="end">{history.at(-1).step}</text><text x="290" y="186" textAnchor="middle">iteration · MSE axis uses log₁₀(1 + MSE)</text>
  </svg>
}
