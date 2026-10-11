import { useId } from 'react'
import { ARROWS, MOVES } from './engine/gridworld.js'
import { AGENT, CELL, isIce } from './engine/look.js'

// One map, drawn as SVG, with whatever the lesson wants on top of it:
//   values   V[s] per state: each floor cell tinted green (positive) or red (negative), number shown
//   q        Q[s][a]: four triangles per cell, one per action, tinted by value
//   policy   one action per state (an arrow), or probs: pi[s][a] (four arrows, length = probability)
//   agent    the state the agent is in; agents: several (A2C's copies); trail: earlier states, as a line
//   outcomes { state, action }: where that move can end up, with each probability
//   labels   'state' (the state number) or 'cell' ((row, col))
//   marks    { [state]: 'text' } small badges; highlight: [states] outlined
const fmt = x => Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2)
const rgb = (r, g, b) => `rgb(${r},${g},${b})`
export function tint(value, scale) {
  if (!Number.isFinite(value) || scale === 0) return rgb(244, 241, 232)
  const t = Math.max(-1, Math.min(1, value / scale))
  if (t >= 0) return rgb(Math.round(244 - 120 * t), Math.round(241 - 40 * t), Math.round(232 - 110 * t))
  return rgb(Math.round(244 - 14 * -t), Math.round(241 - 140 * -t), Math.round(232 - 130 * -t))
}
const scaleOf = values => Math.max(1e-9, ...values.filter(Number.isFinite).map(Math.abs))

export default function GridMap({ env, values, q, policy, probs, agent, agents, trail, outcomes, labels, marks, highlight, onCell, size = 56, caption, showNumbers = true }) {
  const uid = useId().replace(/:/g, '')
  // A table for another map (a different number of states) is never drawn.
  const fits = x => x && x.length === env.nStates ? x : undefined
  values = fits(values); q = fits(q); probs = fits(probs); policy = fits(policy)
  const W = env.nCols * size, H = env.nRows * size
  const ice = isIce(env)
  const reachable = s => !env.isWall(s) && !env.cells[env.letter(s)]?.to_start
  const vScale = values ? scaleOf(values.filter((_, s) => reachable(s) && !env.isEnd(s))) : 1
  const qScale = q ? scaleOf(q.flatMap((row, s) => reachable(s) && !env.isEnd(s) ? row : [])) : 1
  const center = s => { const [r, c] = env.toCell(s); return [c * size + size / 2, r * size + size / 2] }
  const cells = []
  for (let s = 0; s < env.nStates; s++) {
    const [r, c] = env.toCell(s), x = c * size, y = r * size, letter = env.letter(s), look = CELL[letter] ?? CELL['.']
    const end = env.isEnd(s), wall = letter === '#', cliff = letter === 'K', hole = letter === 'H'
    let fill = ice ? '#e4f2fa' : '#f4f1e8'
    if (wall) fill = '#33404a'
    else if (cliff) fill = `url(#cliff-${uid})`
    else if (hole) fill = '#24557a'
    else if (values && !end) fill = tint(values[s], vScale)
    cells.push(<g key={s} className={onCell && !wall ? 'qm-cell-click' : undefined} onClick={onCell && !wall ? () => onCell(s) : undefined}>
      <rect x={x} y={y} width={size} height={size} fill={fill} stroke={wall ? '#33404a' : '#c9c3b2'} strokeWidth={0.6} />
      {q && !wall && !end && !cliff && [0, 1, 2, 3].map(a => {
        const cx = x + size / 2, cy = y + size / 2, h = size / 2
        const corners = [[[x, y], [x, y + size]], [[x, y], [x + size, y]], [[x + size, y], [x + size, y + size]], [[x, y + size], [x + size, y + size]]][a]
        const tx = cx + MOVES[a][1] * h * 0.58, ty = cy + MOVES[a][0] * h * 0.58
        return <g key={a}>
          <polygon points={`${cx},${cy} ${corners[0].join(',')} ${corners[1].join(',')}`} fill={tint(q[s][a], qScale)} stroke="#fff" strokeWidth={0.8} />
          {showNumbers && size >= 48 && <text x={tx} y={ty} className="qm-qnum" fontSize={Math.max(8, size * 0.135)} textAnchor="middle" dominantBaseline="central">{fmt(q[s][a])}</text>}
        </g>
      })}
      {values && !wall && !end && !cliff && !q && showNumbers && <text x={x + size / 2} y={y + size - 7} className="qm-vnum" textAnchor="middle">{fmt(values[s])}</text>}
      {look.icon && <text x={x + size / 2} y={y + size / 2 + 1} fontSize={look.small ? size * 0.32 : size * 0.5} textAnchor="middle" dominantBaseline="central">{look.icon}</text>}
      {hole && <ellipse cx={x + size / 2} cy={y + size / 2} rx={size * 0.32} ry={size * 0.22} fill="#0f2c44" />}
      {letter === 'S' && !q && <text x={x + 4} y={y + 12} className="qm-start">start</text>}
      {labels === 'state' && !wall && <text x={x + size - 4} y={y + 11} className="qm-label" textAnchor="end">{s}</text>}
      {labels === 'cell' && !wall && <text x={x + size - 4} y={y + 11} className="qm-label" textAnchor="end">{r},{c}</text>}
      {marks?.[s] != null && <text x={x + 4} y={y + size - 5} className="qm-mark">{marks[s]}</text>}
    </g>)
  }
  const arrows = []
  for (let s = 0; s < env.nStates; s++) {
    if (env.isWall(s) || env.isEnd(s) || !reachable(s)) continue
    const [cx, cy] = center(s)
    if (probs) probs[s].forEach((p, a) => {
      if (p < 0.02) return
      const len = size * 0.42 * p
      arrows.push(<line key={`${s}-${a}`} x1={cx} y1={cy} x2={cx + MOVES[a][1] * len} y2={cy + MOVES[a][0] * len} className="qm-prob" markerEnd={`url(#tip-${uid})`} />)
    })
    else if (policy && policy[s] != null) {
      const a = policy[s], len = size * 0.3
      arrows.push(<line key={s} x1={cx - MOVES[a][1] * len} y1={cy - MOVES[a][0] * len} x2={cx + MOVES[a][1] * len} y2={cy + MOVES[a][0] * len} className="qm-policy" markerEnd={`url(#tip-${uid})`} />)
    }
  }
  const path = trail?.length > 1 ? trail.map(s => center(s).join(',')).join(' ') : null
  let outcomeView = null
  if (outcomes) {
    const [x0, y0] = center(outcomes.state)
    const list = env.P[outcomes.state][outcomes.action]
    // Outcomes that land in the same cell are drawn once, labelled with each probability.
    const merged = []
    list.forEach(([p, next, reward], i) => {
      const dir = list.length > 1 ? [(outcomes.action + 3) % 4, outcomes.action, (outcomes.action + 1) % 4][i] : outcomes.action
      const m = merged.find(x => x.next === next && x.reward === reward)
      if (m) m.ps.push(p); else merged.push({ next, reward, ps: [p], dir })
    })
    outcomeView = merged.map(({ next, reward, ps, dir }, i) => {
      const [x1, y1] = center(next), same = next === outcomes.state
      const lx = same ? x0 : (x0 + x1) / 2, ly = same ? y0 - size * 0.36 : (y0 + y1) / 2
      const label = ps.map(p => p === 1 ? '1' : p.toFixed(3)).join(' + ')
      return <g key={i}>
        {same ? <circle cx={x0} cy={y0} r={size * 0.36} className="qm-outcome" /> : <line x1={x0} y1={y0} x2={x1} y2={y1} className="qm-outcome" markerEnd={`url(#otip-${uid})`} />}
        <text x={lx} y={ly - 4} className="qm-outcome-label" textAnchor="middle">{same ? 'stay ' : ''}{label}{reward !== 0 ? ` · r ${reward}` : ''}</text>
      </g>
    })
  }
  return <figure className="qm-map">
    <svg viewBox={`-2 -2 ${W + 4} ${H + 4}`} style={{ maxWidth: Math.max(W, 220) }} role="img" aria-label={`${env.title} map`}>
      <defs>
        <pattern id={`cliff-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#c0503f" /><rect width="4" height="8" fill="#a33e30" /></pattern>
        <marker id={`tip-${uid}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#1d3b4a" /></marker>
        <marker id={`otip-${uid}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#7a3fb0" /></marker>
      </defs>
      {cells}
      {highlight?.map(s => { const [r, c] = env.toCell(s); return <rect key={`h${s}`} x={c * size + 2} y={r * size + 2} width={size - 4} height={size - 4} className="qm-highlight" /> })}
      {arrows}
      {path && <polyline points={path} className="qm-trail" />}
      {outcomeView}
      {agents?.map((s, i) => { const [x, y] = center(s); const k = agents.slice(0, i).filter(t => t === s).length; return <text key={`a${i}`} x={x - size * 0.22 + (k % 3) * size * 0.22} y={y - size * 0.18 + Math.floor(k / 3) * size * 0.22} fontSize={size * 0.3} textAnchor="middle" dominantBaseline="central" className="qm-agent">{AGENT[env.name] ?? '🐭'}</text> })}
      {agent != null && (() => { const [x, y] = center(agent); return <text x={x} y={y + 1} fontSize={size * 0.55} textAnchor="middle" dominantBaseline="central" className="qm-agent">{AGENT[env.name] ?? '🐭'}</text> })()}
    </svg>
    {caption && <figcaption>{caption}</figcaption>}
  </figure>
}
