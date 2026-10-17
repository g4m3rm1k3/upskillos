// Eigen and tensor playgrounds: stress on a cut with a live Mohr's circle, the vibration modes of two
// masses on springs, and PageRank one step at a time on a web whose links you choose.
import { useEffect, useRef, useState } from 'react'
import { Arrow, eigen2, fmt, H, MatrixTile, Notes, Plane, Readout, Slider, Stat, toSvg, vec, W } from './parts.jsx'

// Stress on a cut at angle θ (degrees): traction, its normal and shear parts, and the Mohr point.
export function cutStress(sx, sy, tau, deg) {
  const th = deg * Math.PI / 180, n = [Math.cos(th), Math.sin(th)], s = [-n[1], n[0]]
  const t = [sx * n[0] + tau * n[1], tau * n[0] + sy * n[1]]
  return { n, s, t, normal: t[0] * n[0] + t[1] * n[1], shear: t[0] * s[0] + t[1] * s[1] }
}

export function StressMohr() {
  const [sx, setSx] = useState(80), [sy, setSy] = useState(20), [tau, setTau] = useState(30), [deg, setDeg] = useState(30)
  const { n, s, t, normal, shear } = cutStress(sx, sy, tau, deg)
  const c = (sx + sy) / 2, R = Math.hypot((sx - sy) / 2, tau)
  const principalDeg = 0.5 * Math.atan2(2 * tau, sx - sy) * 180 / Math.PI
  // Left: the cut. Arrows are scaled so the largest possible traction reaches 3.5 units.
  const k = 3.5 / Math.max(Math.abs(c) + R, 1)
  const far = 7, side = [[-far * s[0], -far * s[1]], [far * s[0], far * s[1]], [far * s[0] - far * n[0], far * s[1] - far * n[1]], [-far * s[0] - far * n[0], -far * s[1] - far * n[1]]]
  const pd = principalDeg * Math.PI / 180, p1 = [Math.cos(pd), Math.sin(pd)], p2 = [-p1[1], p1[0]]
  // Right: Mohr's circle, equal scale on both axes, always showing zero stress.
  const lo = Math.min(c - R, 0), hi = Math.max(c + R, 0), pad = Math.max(R, 10) * 0.25
  const scale = Math.min((W - 40) / (hi - lo + 2 * pad), (H - 40) / (2 * (R + pad)))
  const mx = v => W / 2 + (v - (lo + hi) / 2) * scale, my = v => H / 2 - v * scale
  const circle = Array.from({ length: 73 }, (_, i) => `${mx(c + R * Math.cos(i * Math.PI / 36))},${my(R * Math.sin(i * Math.PI / 36))}`).join(' ')
  const meaning = `Cut at ${deg}°: normal stress ${fmt(normal)} MPa, shear ${fmt(shear)} MPa. Principal stresses ${fmt(c + R)} and ${fmt(c - R)} MPa, on cuts at ${fmt(principalDeg)}° and ${fmt(principalDeg + 90)}°. Largest shear ${fmt(R)} MPa.`
  return <>
    <div className="la-twin">
      <Plane label={`A cut through a stressed plate. ${meaning}`}>
        <polygon className="la-material" points={side.map(q => toSvg(q).join(',')).join(' ')} />
        <line className="la-principal" x1={toSvg([-6 * p1[0], -6 * p1[1]])[0]} y1={toSvg([-6 * p1[0], -6 * p1[1]])[1]} x2={toSvg([6 * p1[0], 6 * p1[1]])[0]} y2={toSvg([6 * p1[0], 6 * p1[1]])[1]} />
        <line className="la-principal" x1={toSvg([-6 * p2[0], -6 * p2[1]])[0]} y1={toSvg([-6 * p2[0], -6 * p2[1]])[1]} x2={toSvg([6 * p2[0], 6 * p2[1]])[0]} y2={toSvg([6 * p2[0], 6 * p2[1]])[1]} />
        <line className="la-cut" x1={toSvg([-far * s[0], -far * s[1]])[0]} y1={toSvg([-far * s[0], -far * s[1]])[1]} x2={toSvg([far * s[0], far * s[1]])[0]} y2={toSvg([far * s[0], far * s[1]])[1]} />
        <Arrow to={[k * normal * n[0], k * normal * n[1]]} tone="i" dashed width={2} />
        <Arrow from={[k * normal * n[0], k * normal * n[1]]} to={[k * t[0], k * t[1]]} tone="j" dashed width={2} />
        <Arrow to={[1.2 * n[0], 1.2 * n[1]]} tone="dir" label="n" width={2.5} mid />
        <Arrow to={[k * t[0], k * t[1]]} tone="out" label="t = σn" />
      </Plane>
      <svg className="la-plane" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Mohr's circle: centre ${fmt(c)}, radius ${fmt(R)}. The current cut is the gold point.`}>
        <rect width={W} height={H} className="la-plane-bg" />
        <line className="la-axis" x1="0" y1={my(0)} x2={W} y2={my(0)} />
        <line className="la-axis" x1={mx(0)} y1="0" x2={mx(0)} y2={H} />
        <text className="la-plot-note" x={W - 8} y={my(0) - 6} textAnchor="end">normal stress →</text>
        <text className="la-plot-note" x={mx(0) + 6} y="16">shear ↑</text>
        <polyline className="la-mohr" points={circle} />
        <line className="la-mohr-diameter" x1={mx(sx)} y1={my(-tau)} x2={mx(sy)} y2={my(tau)} />
        <circle className="la-mohr-principal" cx={mx(c + R)} cy={my(0)} r="6" />
        <circle className="la-mohr-principal" cx={mx(c - R)} cy={my(0)} r="6" />
        <circle className="la-mohr-centre" cx={mx(c)} cy={my(0)} r="4" />
        <line className="la-mohr-radius" x1={mx(c)} y1={my(0)} x2={mx(normal)} y2={my(shear)} />
        <circle className="la-solution" cx={mx(normal)} cy={my(shear)} r="7" />
        <text className="la-plot-note" x={mx(c + R)} y={my(0) + 20} textAnchor="middle">{fmt(c + R)}</text>
        <text className="la-plot-note" x={mx(c - R)} y={my(0) + 20} textAnchor="middle">{fmt(c - R)}</text>
      </svg>
    </div>
    <div className="la-matrix-row">
      <MatrixTile label="σ" rows={[[sx, tau], [tau, sy]]} />
      <Stat label="Normal stress (red dashes)" value={fmt(normal)} tone="i" note={normal >= 0 ? 'pulling the cut open' : 'pushing the cut shut'} />
      <Stat label="Shear stress (green dashes)" value={fmt(shear)} tone="j" note={Math.abs(shear) < 0.05 ? 'none: a principal cut' : 'sliding along the cut'} />
    </div>
    <div className="la-controls">
      <Slider label="Pull along x, σx (MPa)" tone="i" value={sx} onChange={setSx} min={-100} max={150} step={5} />
      <Slider label="Pull along y, σy (MPa)" tone="j" value={sy} onChange={setSy} min={-100} max={150} step={5} />
      <Slider label="Shear τ (MPa)" tone="v" value={tau} onChange={setTau} min={-80} max={80} step={5} />
      <Slider label="Cut angle θ (degrees)" tone="dir" value={deg} onChange={setDeg} min={0} max={180} step={1} />
    </div>
    <Readout>{meaning}</Readout>
    <Notes try={`Turn the cut angle slowly from 0° to 180° and follow the gold point: it goes once round the circle. Stop where the shear is zero, at ${fmt(principalDeg < 0 ? principalDeg + 180 : principalDeg)}°: the traction then points straight along n.`} truth="The faint lines are the principal directions, the eigenvectors of σ. On those cuts the traction is parallel to the normal, and the circle crosses the axis at the eigenvalues c ± R." trap="Turning the cut by θ moves round the circle by 2θ. Cuts 90° apart sit at opposite ends of a diameter, not a quarter-turn apart."
      code={`sigma = [${sx} ${tau}; ${tau} ${sy}];\nth = ${deg}*pi/180;\nn = [cos(th); sin(th)];\nt = sigma*n;\nnormalStress = dot(n, t)\nprincipal = eig(sigma)`} />
  </>
}

// Two unit masses between walls on springs k1, k2, k3.
export function springModes(k1, k2, k3) {
  const K = [[k1 + k2, -k2], [-k2, k2 + k3]]
  const { values, vectors } = eigen2(K)
  const unit = v => { const len = Math.hypot(...v); const u = [v[0] / len, v[1] / len]; return u[0] < 0 || (u[0] === 0 && u[1] < 0) ? [-u[0], -u[1]] : u }
  // Slow mode first. A repeated eigenvalue (only with k2 = 0) cannot happen here: k2 ≥ 0.5.
  const slow = unit(vectors[1] ?? [1, 0]), fast = vectors[1] ? unit(vectors[0]) : [-slow[1], slow[0]]
  return { K, omega: [Math.sqrt(values[1]), Math.sqrt(values[0])], modes: [slow, fast] }
}

const STARTS = { slow: 'Slow mode only', fast: 'Fast mode only', one: 'Push mass 1 only' }

export function Vibrations() {
  const [k1, setK1] = useState(1), [k2, setK2] = useState(1), [k3, setK3] = useState(1)
  const [start, setStart] = useState('one'), [time, setTime] = useState(0), [playing, setPlaying] = useState(false)
  const { K, omega, modes } = springModes(k1, k2, k3)
  const x0 = start === 'slow' ? modes[0] : start === 'fast' ? modes[1] : [1, 0]
  const weights = modes.map(v => v[0] * x0[0] + v[1] * x0[1])
  const at = t => [0, 1].map(i => weights[0] * Math.cos(omega[0] * t) * modes[0][i] + weights[1] * Math.cos(omega[1] * t) * modes[1][i])
  const frame = useRef(0)
  useEffect(() => {
    if (!playing) return undefined
    let last = performance.now()
    const tick = now => { setTime(t => (t + (now - last) / 400) % 30); last = now; frame.current = requestAnimationFrame(tick) }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [playing])
  const x = at(time)
  const base = [W / 3, 2 * W / 3], y = 70, wall = 30
  const pos = base.map((b, i) => b + 45 * x[i])
  const spring = (a, b, key) => {
    const pts = Array.from({ length: 13 }, (_, i) => `${a + (b - a) * i / 12},${y + (i % 2 ? -9 : 9) * (i > 0 && i < 12)}`)
    return <polyline key={key} className="la-spring" points={pts.join(' ')} />
  }
  const traceH = 170, ty = v => 110 + traceH / 2 - v * traceH / 2.6, tx = t => 20 + t / 30 * (W - 40)
  const trace = i => Array.from({ length: 301 }, (_, s) => `${tx(s / 10)},${ty(at(s / 10)[i])}`).join(' ')
  const meaning = `Natural frequencies ${fmt(omega[0])} and ${fmt(omega[1])}. Slow mode ${vec(modes[0])}, fast mode ${vec(modes[1])}. At time ${fmt(time)} the masses are displaced ${vec(x)}.`
  return <>
    <div className="la-presets" role="group" aria-label="Choose how the motion starts">{Object.entries(STARTS).map(([key, name]) => <button key={key} type="button" aria-pressed={key === start} onClick={() => { setStart(key); setTime(0) }}>{name}</button>)}</div>
    <svg className="la-plane" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Two masses on three springs. ${meaning}`}>
      <rect width={W} height={H} className="la-plane-bg" />
      <rect className="la-wall" x="0" y={y - 35} width={wall} height="70" />
      <rect className="la-wall" x={W - wall} y={y - 35} width={wall} height="70" />
      {spring(wall, pos[0] - 18, 's1')}{spring(pos[0] + 18, pos[1] - 18, 's2')}{spring(pos[1] + 18, W - wall, 's3')}
      {pos.map((p, i) => <g key={i}><rect className={`la-mass la-mass-${i + 1}`} x={p - 18} y={y - 18} width="36" height="36" rx="6" /><text className="la-plot-note" x={p} y={y + 5} textAnchor="middle">{i + 1}</text></g>)}
      <line className="la-axis" x1={tx(0)} y1={ty(0)} x2={tx(30)} y2={ty(0)} />
      <polyline className="la-trace la-trace-1" points={trace(0)} />
      <polyline className="la-trace la-trace-2" points={trace(1)} />
      <line className="la-now" x1={tx(time)} y1={ty(1.3)} x2={tx(time)} y2={ty(-1.3)} />
      <text className="la-plot-note" x={tx(30)} y={ty(-1.3) + 14} textAnchor="end">time →  (red: mass 1, green: mass 2)</text>
    </svg>
    <div className="la-matrix-row">
      <MatrixTile label="K" rows={K} />
      <Stat label="Slow ω₁" value={fmt(omega[0])} tone="dir" note={`shape ${vec(modes[0])}`} />
      <Stat label="Fast ω₂" value={fmt(omega[1])} tone="out" note={`shape ${vec(modes[1])}`} />
      <button type="button" className="la-primary" onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'}</button>
    </div>
    <div className="la-controls">
      <Slider label="Time" tone="v" value={time} onChange={value => { setPlaying(false); setTime(value) }} min={0} max={30} step={0.1} />
      <Slider label="Left spring k₁" tone="i" value={k1} onChange={setK1} min={0.5} max={5} step={0.5} />
      <Slider label="Middle spring k₂" tone="v" value={k2} onChange={setK2} min={0.5} max={5} step={0.5} />
      <Slider label="Right spring k₃" tone="j" value={k3} onChange={setK3} min={0.5} max={5} step={0.5} />
    </div>
    <Readout>{meaning}</Readout>
    <Notes try="Choose Slow mode only and press Play: both masses swing together in one steady rhythm. Then choose Push mass 1 only and watch the motion pass back and forth between the masses." truth="A mode is an eigenvector of K: started in that shape, the masses keep it, and only its size swings, at ω = √λ. Any other start is a mix of modes, each at its own frequency." trap="With equal springs the modes are [1; 1] and [1; −1], but change one spring and the shapes change too. The modes belong to K, not to the masses alone."
      code={`K = [${k1 + k2} ${-k2}; ${-k2} ${k2 + k3}];\n[V, D] = eig(K);\nomega = sqrt(diag(D))\nmodes = V`} />
  </>
}

// PageRank on four pages. links[j] lists the pages that page j links to; a page with no links
// is treated as linking to every page, as real PageRank does.
const PAGES = [[-2.6, 2.2], [2.6, 2.2], [2.6, -2.2], [-2.6, -2.2]]
const START_LINKS = [[1, 2], [2], [0], [0, 2]]
export function linkMatrixOf(links, n = links.length) {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    const out = links[j].length ? links[j] : Array.from({ length: n }, (_, k) => k)
    return out.includes(i) ? 1 / out.length : 0
  }))
}
export function pageRankStep(L, r, d) {
  const n = r.length
  return L.map(row => d * row.reduce((sum, value, j) => sum + value * r[j], 0) + (1 - d) / n)
}

export function PageRank() {
  const [links, setLinks] = useState(START_LINKS), [d, setD] = useState(0.85)
  const [rank, setRank] = useState([0.25, 0.25, 0.25, 0.25]), [steps, setSteps] = useState(0)
  const L = linkMatrixOf(links)
  const next = pageRankStep(L, rank, d), change = Math.hypot(...next.map((v, i) => v - rank[i]))
  const toggle = (from, to) => setLinks(all => all.map((out, j) => j !== from ? out : out.includes(to) ? out.filter(p => p !== to) : [...out, to].sort()))
  const reset = () => { setRank([0.25, 0.25, 0.25, 0.25]); setSteps(0) }
  const run = count => { let r = rank; for (let k = 0; k < count; k++) r = pageRankStep(L, r, d); setRank(r); setSteps(s => s + count) }
  const best = rank.indexOf(Math.max(...rank))
  const meaning = `After ${steps} steps the ranks are ${vec(rank)}; page ${best + 1} leads. The next step would change them by ${change.toPrecision(2)}.`
  return <>
    <svg className="la-plane" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Four web pages and their links. ${meaning}`}>
      <rect width={W} height={H} className="la-plane-bg" />
      <defs><marker id="la-link-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" className="la-link-head" /></marker></defs>
      {links.flatMap((out, j) => out.map(i => {
        const [ax, ay] = toSvg(PAGES[j]), [bx, by] = toSvg(PAGES[i]), len = Math.hypot(bx - ax, by - ay)
        // Offset each link sideways so links in both directions stay visible, and stop at the circles.
        const ux = (bx - ax) / len, uy = (by - ay) / len, ox = -uy * 6, oy = ux * 6, r1 = 26 + 60 * rank[j], r2 = 30 + 60 * rank[i]
        return <line key={`${j}-${i}`} className="la-link" x1={ax + ux * r1 + ox} y1={ay + uy * r1 + oy} x2={bx - ux * r2 + ox} y2={by - uy * r2 + oy} markerEnd="url(#la-link-head)" />
      }))}
      {PAGES.map((p, i) => { const [cx, cy] = toSvg(p); return <g key={i}><circle className={i === best ? 'la-page la-page-best' : 'la-page'} cx={cx} cy={cy} r={24 + 60 * rank[i]} /><text className="la-plot-note" x={cx} y={cy + 5} textAnchor="middle">{i + 1}: {fmt(rank[i])}</text></g> })}
    </svg>
    <div className="la-link-grid" role="group" aria-label="Choose which pages link where">
      {links.map((out, j) => <div key={j}><span>Page {j + 1} links to</span>{[0, 1, 2, 3].filter(i => i !== j).map(i => <button key={i} type="button" aria-pressed={out.includes(i)} onClick={() => toggle(j, i)}>{i + 1}</button>)}</div>)}
    </div>
    <div className="la-matrix-row">
      <MatrixTile label="L" rows={L} />
      <button type="button" className="la-primary" onClick={() => run(1)}>One step: r = G r</button>
      <button type="button" className="la-ghost" onClick={() => run(20)}>20 steps</button>
      <button type="button" className="la-ghost" onClick={reset}>Equal scores</button>
    </div>
    <div className="la-controls"><Slider label="Chance of following a link, d" tone="dir" value={d} onChange={setD} min={0.5} max={1} step={0.01} /></div>
    <Readout>{meaning}</Readout>
    <Notes try="Press One step a few times and watch rank flow along the links until it stops changing. Then give page 4 a link from page 2, or remove page 3's only link, and step again." truth="The settled scores are the eigenvector of G = d·L + (1 − d)/n with eigenvalue 1. Each step is one matrix–vector multiplication: power iteration." trap="Set d to 1 and make pages 1 and 2 link only to each other: the rank drains into the loop. The random jumps are what keep every page reachable."
      code={`L = [${L.map(row => row.map(v => Math.abs(v - 1 / 3) < 1e-9 ? '1/3' : fmt(v)).join(' ')).join('; ')}];\nn = 4;\nG = ${fmt(d)}*L + ${fmt(1 - d)}/n;\nr = ones(n,1)/n;\nfor k = 1:100\n  r = G*r;\nend\ndisp(r)`} />
  </>
}
