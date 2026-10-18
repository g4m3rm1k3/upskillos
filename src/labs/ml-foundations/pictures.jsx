import React from 'react'
import MazeView from './MazeView.jsx'
import { key, unkey } from './world.js'

// The text, one character per box, with the one being read lit up: the "before" of parse_map.
export function TextGrid({ lines, at, row }) {
  const [ar, ac] = at ? unkey(at) : [-1, -1]
  return (
    <div className="mlf-textgrid" aria-label="The map text">
      {lines.map((line, r) => (
        <div key={r} className={`mlf-textrow${row === r ? ' on' : ''}`}>
          <span className="mlf-rc">{r}</span>
          {[...line].map((ch, c) => <span key={c} className={`mlf-char${r === ar && c === ac ? ' on' : ''}`}>{ch}</span>)}
          <span className="mlf-nl" title="newline">\n</span>
        </div>
      ))}
    </div>
  )
}

export function ParsePicture({ frame }) {
  const { lines, cells, at, row } = frame.pic
  const cols = lines[0].length
  const partial = { rows: lines.length, cols, cells }
  return (
    <div className="mlf-two">
      <div><p className="mlf-eyebrow">text (a string)</p><TextGrid lines={lines} at={at} row={row} /></div>
      <div className="mlf-arrow-between" aria-hidden="true">→</div>
      <div><p className="mlf-eyebrow">cells (a dict)</p><MazeView maze={partial} size={38} rc marks={at ? { [at]: 'focus' } : {}} title="The map built so far" /></div>
    </div>
  )
}

export function MovesPicture({ maze, size = 44 }) {
  return function Picture({ frame, onCell }) {
    return <MazeView maze={maze} size={size} rc marks={frame.pic.marks} arrows={frame.pic.arrows} onCell={onCell} />
  }
}

export function TablePicture({ maze, size = 52 }) {
  return function Picture({ frame, onCell }) {
    return <MazeView maze={maze} size={size} rc marks={frame.pic.marks} flows={frame.pic.flows} onCell={onCell} />
  }
}

// Outcomes laid end to end, each as wide as its chance, with the dice's u marked. The legend gives
// each piece's range [start, end): the running totals sample_outcome walks along.
export function ChanceBar({ outcomes, u, picked }) {
  let running = 0
  const pieces = outcomes.map(([p, n, r]) => {
    const start = running
    running += p
    return { p, n, r, start, end: running, label: `(${unkey(n).join(', ')})` }
  })
  const fmt = x => Number(x.toFixed(4))
  return (
    <div className="mlf-bar" aria-label="Outcomes laid end to end by chance">
      <div className="mlf-bar-track">
        {pieces.map((q, i) => (
          <div key={i} className={`mlf-bar-piece${picked === q.n ? ' picked' : ''}`} style={{ left: `${q.start * 100}%`, width: `${q.p * 100}%` }} title={`${q.label}: chance ${fmt(q.p)}`}>
            <span>{q.p >= 0.12 ? q.label : ''}</span>
          </div>
        ))}
        {u !== undefined && <div className={`mlf-bar-u${u > 0.7 ? ' flip' : ''}`} style={{ left: `${u * 100}%` }}><span>u = {u}</span></div>}
      </div>
      <div className="mlf-bar-scale"><span>0</span><span>1</span></div>
      <ol className="mlf-bar-legend">
        {pieces.map((q, i) => (
          <li key={i} className={picked === q.n ? 'picked' : ''}>
            <code>{fmt(q.start)} ≤ u &lt; {fmt(q.end)}</code> → {q.label}{q.r === -0.75 ? ' (bump: stays)' : q.r === 1 ? ' (cheese)' : ''}, chance {fmt(q.p)}
          </li>
        ))}
      </ol>
    </div>
  )
}

export function EpisodePicture({ maze, size = 46 }) {
  return function Picture({ frame, upcoming, onCell }) {
    // While a prediction is asked, the bar of the step being predicted is shown, without its answer.
    const { agent, path } = frame.pic
    const bar = frame.pic.bar ?? upcoming?.pic.bar
    return (
      <div className="mlf-stack">
        <MazeView maze={maze} size={size} rc agent={agent} path={path} onCell={onCell} marks={bar?.picked && !onCell ? { [bar.picked]: 'read' } : {}} />
        {bar && <ChanceBar outcomes={bar.outcomes} u={bar.u} picked={onCell ? undefined : bar.picked} />}
      </div>
    )
  }
}

export function TrainPicture({ maze, size = 50 }) {
  return function Picture({ frame }) {
    const { agent, heat, labels, arrow, next, glow } = frame.pic
    const marks = {}
    if (next && next !== agent) marks[next] = 'read'
    if (glow) marks[glow] = 'focus'
    return <MazeView maze={maze} size={size} agent={agent} heat={heat} heatRange={[-0.5, 1]} labels={labels} arrows={arrow ? { [agent]: arrow } : {}} marks={marks} />
  }
}

export { key }

// A general picture for step-throughs over values: frame.pic may hold any MazeView overlay
// (marks, labels, heat, arrows, agent, path, flows). heatRange fixes the colour scale.
export function ValuePicture({ maze, size = 50, heatRange }) {
  return function Picture({ frame, onCell }) {
    const p = frame.pic ?? {}
    return (
      <div className="mlf-stack">
        <MazeView maze={maze} size={size} rc marks={p.marks} labels={p.labels} heat={p.heat} heatRange={p.heatRange ?? heatRange} arrows={p.arrows} agent={p.agent} path={p.path} flows={p.flows} onCell={onCell} />
        {p.note && <p className="mlf-muted">{p.note}</p>}
      </div>
    )
  }
}
