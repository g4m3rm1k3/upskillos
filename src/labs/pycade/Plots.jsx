import { useState } from 'react'

export function NumericHistory({ frames, cursor }) {
  const [chosen, setChosen] = useState('')
  const names = [...new Set(frames.slice(0, cursor + 1).flatMap(frame => Object.entries(frame.changes).filter(([, node]) => typeof node.value === 'number' && Number.isFinite(node.value)).map(([key]) => key)))]
  const name = names.includes(chosen) ? chosen : names.includes('loss') ? 'loss' : names[0]
  const points = frames.slice(0, cursor + 1).flatMap((frame, index) => {
    const value = frame.changes[name]?.value
    return typeof value === 'number' && Number.isFinite(value) ? [{ value, index }] : []
  })
  if (!name) return null
  const lo = Math.min(...points.map(point => point.value)), hi = Math.max(...points.map(point => point.value)), span = hi - lo || 1
  const line = points.map((point, index) => `${24 + index * 300 / Math.max(1, points.length - 1)},${76 - (point.value - lo) * 55 / span}`).join(' ')
  return <details className="pc-history"><summary>Plot a numeric variable · {name}</summary><label>Value <select aria-label="Plotted variable" value={name} onChange={event => setChosen(event.target.value)}>{names.map(key => <option key={key}>{key}</option>)}</select></label>
    <svg viewBox="0 0 350 100" role="img" aria-label={`${name}: ${points.length} recorded changes; minimum ${lo}, maximum ${hi}`}><path d="M24 15V80H330" fill="none" stroke="#628981"/><polyline points={line} fill="none" stroke="#80e3ba" strokeWidth="2"/>{points.map((point, index) => <circle key={index} cx={24 + index * 300 / Math.max(1, points.length - 1)} cy={76 - (point.value - lo) * 55 / span} r="2.5" fill="#ffd194"><title>statement {point.index + 1}: {point.value}</title></circle>)}<text x="25" y="96" fill="#b2cbc4" fontSize="9">Recorded value changes, through the current statement</text></svg><p>Range {Number(lo.toPrecision(5))} to {Number(hi.toPrecision(5))}. A point marks a changed value, not necessarily an epoch. Function-local names may refer to different calls.</p>
  </details>
}

export function RegressionPlot({ memory, onSelect }) {
  const x = memory.x?.value, actual = memory.y?.value, predictions = memory.predictions?.value
  if (!Array.isArray(x) || !Array.isArray(actual) || !Array.isArray(predictions)) return null
  const values = [...actual, ...predictions], lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1
  const sx = value => 25 + (value - Math.min(...x)) / (Math.max(...x) - Math.min(...x) || 1) * 300
  const sy = value => 105 - (value - lo) / span * 80
  return <button className="pc-fit" onClick={() => onSelect('predictions')} aria-label="Inspect predictions on the fitted line"><svg viewBox="0 0 350 135" role="img" aria-label="Known outputs in gold, current predictions in green"><path d="M25 15V110H330" fill="none" stroke="#628981"/><polyline points={x.map((value, index) => `${sx(value)},${sy(predictions[index])}`).join(' ')} fill="none" stroke="#80e3ba" strokeWidth="2"/>{x.map((value, index) => <g key={index}><line x1={sx(value)} x2={sx(value)} y1={sy(actual[index])} y2={sy(predictions[index])} stroke="#81928b" strokeDasharray="2 3"/><circle cx={sx(value)} cy={sy(actual[index])} r="4" fill="#ffd194"/><circle cx={sx(value)} cy={sy(predictions[index])} r="3" fill="#80e3ba"/></g>)}<text x="25" y="129" fill="#b2cbc4" fontSize="10">Gold: correct y · green: predictions · gaps: errors</text></svg></button>
}
