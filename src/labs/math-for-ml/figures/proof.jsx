// Proof-and-counting figures: forty examples that prove nothing, Euclid's new prime, the staircase
// behind 1 + … + n, a tree of choices and every ordering, Pascal's triangle, the binomial
// distribution, and the birthday curve.
import { useState } from 'react'
import { isPrime, smallestFactor, euclidStep, gauss, factorial, choose, pascal, binomialPmf, collisionChance } from '../engine/maths.js'
import { Graph, Slider, Working, C, fmt } from './ui.jsx'

export function ProofFig() {
  const [n, setN] = useState(38)
  const value = n * n + n + 41, prime = isPrime(value)
  const passed = Array.from({ length: n + 1 }, (_, k) => isPrime(k * k + k + 41)).filter(Boolean).length
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="n" value={n} min={0} max={45} step={1} onChange={setN} show={v => String(v)} /></div>
    <div className="mm-chips" aria-label="n from 0 to 45">{Array.from({ length: 46 }, (_, k) => <span key={k} className={`mm-chip${k <= n ? (isPrime(k * k + k + 41) ? ' mm-chosen' : ' mm-fail') : ''}`}>{k}</span>)}</div>
    <Working rows={[['n² + n + 41', `${n}² + ${n} + 41`, String(value)], ['prime?', prime ? 'no divisor up to √' + value : `${smallestFactor(value)} × ${value / smallestFactor(value)}`, prime ? 'yes' : 'NO: a counterexample'], ['checked so far', `n = 0 … ${n}`, `${passed} of ${n + 1} prime`]]} />
  </div>
}

const SMALL_PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23]
export function ContradictionFig() {
  const [chosen, setChosen] = useState([2, 3, 5, 7, 11, 13])
  const list = SMALL_PRIMES.filter(p => chosen.includes(p))
  const [q, d] = euclidStep(list)
  const toggle = p => setChosen(c => c.includes(p) ? c.filter(x => x !== p) : [...c, p])
  return <div className="qm-fig">
    <div className="qm-fig-controls qm-buttons">{SMALL_PRIMES.map(p => <button key={p} className={chosen.includes(p) ? 'qm-primary' : ''} aria-pressed={chosen.includes(p)} onClick={() => toggle(p)}>{p}</button>)}</div>
    <Working rows={[['"all the primes"', list.length ? list.join(', ') : '(none)', `${list.length} primes`], ['Q = product + 1', list.length ? `${list.join(' × ')} + 1` : '1 + 1', String(q)],
      ['Q ÷ each listed prime', 'remainder 1 every time', list.map(p => q % p).join(', ') || '—'], ['smallest factor of Q', d === q ? 'Q itself is prime' : `${q} = ${d} × ${q / d}`, `${d}: ${list.includes(d) ? 'on the list?!' : 'a prime not on the list'}`]]} />
  </div>
}

export function InductionFig() {
  const [n, setN] = useState(5)
  const cell = 22, w = (n + 1) * cell, h = n * cell
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="n" value={n} min={1} max={10} step={1} onChange={setN} show={v => String(v)} /></div>
    <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} className="mm-graph" style={{ maxWidth: Math.min(560, w * 2) }} role="img" aria-label={`two staircases of 1 to ${n} dots filling a ${n} by ${n + 1} rectangle`}>
      {Array.from({ length: n }, (_, r) => Array.from({ length: n + 1 }, (_, c) => <circle key={`${r}-${c}`} cx={c * cell + cell / 2} cy={r * cell + cell / 2} r={cell * 0.36} fill={c <= r ? C.teal : C.orange} opacity={r === n - 1 ? 1 : 0.75} />))}
    </svg>
    <p className="qm-hint">Teal: the staircase 1 + 2 + … + {n}, row by row. Orange: a second copy, turned round. Together: {n} rows of {n + 1}. The last row is the new term the induction step adds.</p>
    <Working rows={[['two staircases', `${n} × ${n + 1}`, String(n * (n + 1))], ['one staircase', `${n} × ${n + 1} ÷ 2`, String(gauss(n))], ['the step', `${gauss(n - 1)} + ${n}`, `${gauss(n)} = ${n}(${n} + 1)/2`]]} />
  </div>
}

const LETTERS = 'ABCDE'
const orders = items => items.length <= 1 ? [items] : items.flatMap((x, i) => orders([...items.slice(0, i), ...items.slice(i + 1)]).map(rest => [x, ...rest]))
export function CountingFig() {
  const [a, setA] = useState(3), [b, setB] = useState(2), [c, setC] = useState(2), [n, setN] = useState(3)
  const leaves = []
  for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) for (let k = 0; k < c; k++) leaves.push([i, j, k])
  const W = 520, H = 170, y = [12, 60, 110, 158], x = (idx, count) => (idx + 0.5) * W / count
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="first choice" value={a} min={1} max={4} step={1} onChange={setA} show={v => String(v)} /><Slider label="second" value={b} min={1} max={3} step={1} onChange={setB} show={v => String(v)} /><Slider label="third" value={c} min={1} max={3} step={1} onChange={setC} show={v => String(v)} /></div>
    <svg viewBox={`0 0 ${W} ${H + 8}`} className="mm-graph" role="img" aria-label={`a tree with ${leaves.length} leaves`}>
      {Array.from({ length: a }, (_, i) => <line key={`a${i}`} x1={W / 2} y1={y[0]} x2={x(i, a)} y2={y[1]} stroke={C.grey} />)}
      {Array.from({ length: a * b }, (_, i) => <line key={`b${i}`} x1={x(Math.floor(i / b), a)} y1={y[1]} x2={x(i, a * b)} y2={y[2]} stroke={C.grey} />)}
      {leaves.map((_, i) => <line key={`c${i}`} x1={x(Math.floor(i / c), a * b)} y1={y[2]} x2={x(i, a * b * c)} y2={y[3]} stroke={C.grey} />)}
      {leaves.map((_, i) => <circle key={`l${i}`} cx={x(i, leaves.length)} cy={y[3]} r={4} fill={C.teal} />)}
      <circle cx={W / 2} cy={y[0]} r={5} fill={C.orange} />
    </svg>
    <Working rows={[['outcomes', `${a} × ${b} × ${c}`, String(a * b * c)]]} />
    <div className="qm-fig-controls"><Slider label="letters n" value={n} min={1} max={5} step={1} onChange={setN} show={v => String(v)} /></div>
    <p className="mono mm-orders">{orders([...LETTERS.slice(0, n)]).map(o => o.join('')).join('  ')}</p>
    <Working rows={[['orders of ' + LETTERS.slice(0, n).split('').join(', '), Array.from({ length: n }, (_, i) => n - i).join(' × '), `${factorial(n)} = ${n}!`]]} />
  </div>
}

export function PascalFig() {
  const rows = pascal(11)
  const [pick, setPick] = useState([6, 2])
  const [n, k] = pick
  const parent = (r, j) => n > 0 && r === n - 1 && (j === k - 1 || j === k)
  return <div className="qm-fig">
    <div className="mm-pascal">{rows.map((row, r) => <div key={r} className="mm-pascal-row">{row.map((v, j) => <button key={j} className={`mm-pascal-cell${r === n && j === k ? ' mm-pick' : ''}${parent(r, j) ? ' mm-parent' : ''}`} aria-label={`${r} choose ${j} is ${v}`} onClick={() => setPick([r, j])}>{v}</button>)}</div>)}</div>
    <Working rows={[[`C(${n}, ${k})`, `${n}! / (${k}! × ${n - k}!)`, String(choose(n, k))],
      ...(k > 0 && k < n ? [['Pascal\'s rule', `C(${n - 1}, ${k - 1}) + C(${n - 1}, ${k})  (X in + X out)`, `${choose(n - 1, k - 1)} + ${choose(n - 1, k)} = ${choose(n, k)}`]] : [['an edge', k === 0 ? 'choose nothing: one way' : 'choose everything: one way', '1']]),
      [`row ${n} adds to`, `2^${n}`, String(rows[n].reduce((s, v) => s + v, 0))]]} />
  </div>
}

export function BinomialFig() {
  const [n, setN] = useState(10), [p, setP] = useState(0.3)
  const probs = Array.from({ length: n + 1 }, (_, k) => binomialPmf(k, n, p))
  const best = probs.indexOf(Math.max(...probs))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="tries n" value={n} min={1} max={40} step={1} onChange={setN} show={v => String(v)} /><Slider label="success chance p" value={p} min={0.05} max={0.95} step={0.05} onChange={setP} /></div>
    <Graph x={[-0.5, n + 0.5]} y={[0, Math.max(...probs) * 1.15]} height={230} rects={probs.map((q, k) => ({ x: k - 0.4, y: 0, w: 0.8, h: q, color: k === best ? C.orange : C.teal, opacity: 0.8 }))} xlabel="k successes" />
    <Working rows={[[`most likely k`, `C(${n}, ${best}) · ${fmt(p, 2)}^${best} · ${fmt(1 - p, 2)}^${n - best}`, fmt(probs[best], 4)], ['all bars together', '(p + (1 − p))ⁿ = 1ⁿ', fmt(probs.reduce((s, q) => s + q, 0), 6)]]} />
  </div>
}

// The chance at whole k, joined by straight lines so the curve doesn't look like a staircase.
const smooth = m => t => { const k = Math.floor(t), u = t - k; return (1 - u) * collisionChance(k, m) + u * collisionChance(k + 1, m) }
export function BirthdayFig() {
  const [m, setM] = useState(365), [k, setK] = useState(23)
  const kMax = Math.max(10, Math.round(4 * Math.sqrt(m)))
  const half = Array.from({ length: kMax + 1 }, (_, i) => i).find(i => collisionChance(i, m) >= 0.5)
  const kk = Math.min(k, kMax)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Slots m <select value={m} onChange={e => { setM(Number(e.target.value)); setK(23) }}>{[50, 365, 1000, 10000].map(v => <option key={v} value={v}>{v}</option>)}</select></label><Slider label="items k" value={kk} min={1} max={kMax} step={1} onChange={setK} show={v => String(v)} /></div>
    <Graph x={[0, kMax]} y={[0, 1]} height={220} fns={[{ f: smooth(m) }, { f: () => 0.5, dash: true, color: C.grey }]}
      points={[{ x: kk, y: collisionChance(kk, m), label: fmt(collisionChance(kk, m), 3) }, ...(half && half !== kk ? [{ x: half, y: 0.5, color: C.orange }] : [])]} xlabel="items k" ylabel="P(collision)" />
    <Working rows={[['P(no collision)', `(${m}/${m}) × (${m - 1}/${m}) × … × (${m - kk + 1}/${m})`, fmt(1 - collisionChance(kk, m), 4)], ['P(collision)', '1 − that', fmt(collisionChance(kk, m), 4)], ['50% point', `≈ 1.18 √${m} = ${fmt(1.18 * Math.sqrt(m), 1)}`, String(half ?? '—')]]} />
  </div>
}

