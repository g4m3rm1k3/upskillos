// Part 1 figures: a prediction line, function machines, indexes, Σ step by step, powers, compound
// growth toward e, exp and ln as mirror images, the sigmoid built in four steps, and argmin.
import { useState } from 'react'
import { predict, compound, sigmoid, members, implies, relu, clip } from '../engine/maths.js'
import { Graph, Slider, Working, C, fmt } from './ui.jsx'

export function PredictFig() {
  const [w, setW] = useState(3), [b, setB] = useState(1), [x, setX] = useState(4)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="w" value={w} min={-3} max={5} onChange={setW} /><Slider label="b" value={b} min={-5} max={10} step={0.5} onChange={setB} /><Slider label="x" value={x} min={0} max={8} step={0.5} onChange={setX} /></div>
    <Graph x={[0, 8]} y={[-10, 40]} fns={[{ f: t => predict(w, b, t), label: 'ŷ = wx + b' }]} points={[{ x, y: predict(w, b, x), label: `ŷ = ${fmt(predict(w, b, x))}` }]} segments={[{ x1: x, y1: 0, x2: x, y2: predict(w, b, x), dash: true, color: C.grey }]} xlabel="x" ylabel="ŷ" />
    <Working rows={[['ŷ = w x + b', `${fmt(w)} × ${fmt(x)} + ${fmt(b)}`, fmt(predict(w, b, x))]]} />
  </div>
}

const MACHINES = {
  linear: ['f(x) = 3x + 1', x => 3 * x + 1, [-10, 25]],
  square: ['f(x) = x²', x => x * x, [-2, 26]],
  wave: ['f(x) = x² − 2x', x => x * x - 2 * x, [-3, 20]],
  sigmoid: ['σ(x) = 1/(1 + e^(−x))', sigmoid, [-0.2, 1.2]],
}
export function FunctionMachine() {
  const [which, setWhich] = useState('linear'), [x, setX] = useState(2)
  const [name, f, yr] = MACHINES[which]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Machine <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(MACHINES).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label><Slider label="input x" value={x} min={-4} max={5} step={0.5} onChange={setX} /></div>
    <div className="mm-machine"><span className="mm-in">{fmt(x)}</span><span>→</span><span className="mm-box">{name}</span><span>→</span><span className="mm-out">{fmt(f(x))}</span></div>
    <Graph x={[-4, 5]} y={yr} fns={[{ f }]} points={[{ x, y: f(x), label: `(${fmt(x)}, ${fmt(f(x))})` }]} xlabel="input" ylabel="output" />
  </div>
}

const XS = [1, 2, 3, 4], YS = [52, 55, 61, 64]
export function IndexFig() {
  const [i, setI] = useState(3)
  return <div className="qm-fig">
    <table className="qm-mathcode"><thead><tr><th>i</th>{XS.map((_, k) => <th key={k}>{k + 1}</th>)}</tr></thead><tbody>
      <tr><td>xᵢ (hours)</td>{XS.map((v, k) => <td key={k} className={k + 1 === i ? 'mm-pick' : ''}><button className="qm-link" onClick={() => setI(k + 1)}>{v}</button></td>)}</tr>
      <tr><td>yᵢ (score)</td>{YS.map((v, k) => <td key={k} className={k + 1 === i ? 'mm-pick' : ''}><button className="qm-link" onClick={() => setI(k + 1)}>{v}</button></td>)}</tr></tbody></table>
    <Working rows={[['maths', `x_${i} = ${XS[i - 1]},  y_${i} = ${YS[i - 1]}`, `example ${i}`], ['Python', `xs[${i - 1}], ys[${i - 1}]`, 'counts from 0'], ['n', 'len(xs)', String(XS.length)]]} />
  </div>
}

const SIGMAS = {
  list: ['xᵢ for x = (2, 4, 9)', [2, 4, 9], (i, xs) => xs[i - 1]],
  squares: ['i²', [1, 2, 3, 4], i => i * i],
  odd: ['2i + 1', [1, 2, 3, 4], i => 2 * i + 1],
  errors: ['(ŷᵢ − yᵢ)² with ŷ = 4x + 48', [1, 2, 3, 4], i => (4 * XS[i - 1] + 48 - YS[i - 1]) ** 2],
}
export function SigmaFig() {
  const [which, setWhich] = useState('list'), [k, setK] = useState(0)
  const [name, items, term] = SIGMAS[which], n = items.length
  const terms = items.map((_, j) => term(j + 1, items))
  const running = terms.slice(0, k).reduce((a, b) => a + b, 0)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Add up <select value={which} onChange={e => { setWhich(e.target.value); setK(0) }}>{Object.entries(SIGMAS).map(([id, [nm]]) => <option key={id} value={id}>{nm}</option>)}</select></label>
      <div className="qm-buttons"><button disabled={k === 0} onClick={() => setK(k - 1)}>←</button><button disabled={k === n} onClick={() => setK(k + 1)}>Next term →</button><button onClick={() => setK(n)}>All</button></div></div>
    <p className="mono mm-big">Σ<sub>i=1</sub><sup>{n}</sup> {name} = {terms.map((t, j) => <span key={j} className={j < k ? 'mm-done' : 'mm-todo'}>{j ? ' + ' : ''}{fmt(t)}</span>)}</p>
    <Working rows={[['i so far', k ? `1 … ${k}` : 'none yet', `${k} of ${n}`], ['running total s', k ? terms.slice(0, k).map(t => fmt(t)).join(' + ') : '0', fmt(running)]]} />
  </div>
}

export function PowerFig() {
  const [base, setBase] = useState(2), [p, setP] = useState(3)
  const value = base ** p
  const expand = Number.isInteger(p) && p > 0 && p <= 8 ? Array(p).fill(fmt(base)).join(' × ') : p === 0 ? '1 (nothing multiplied)' : Number.isInteger(p) && p < 0 ? `1 / (${Array(-p).fill(fmt(base)).join(' × ')})` : p === 0.5 ? `√${fmt(base)}` : p === -0.5 ? `1 / √${fmt(base)}` : '—'
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="base x" value={base} min={0.5} max={4} step={0.5} onChange={setBase} /><Slider label="power a" value={p} min={-3} max={6} step={0.5} onChange={setP} /></div>
    <Working rows={[[`x^a`, expand, fmt(value, 4)], ['rule check: xᵃ · x¹', `x^(${fmt(p)} + 1)`, fmt(base ** (p + 1), 4)]]} />
    <Graph x={[-3, 6]} y={[0, Math.min(60, Math.max(4, base ** 6))]} fns={[{ f: t => base ** t, label: `${fmt(base)}^a` }]} points={[{ x: p, y: value }]} xlabel="a" />
  </div>
}

export function CompoundFig() {
  const [n, setN] = useState(2)
  const ns = [1, 2, 3, 4, 6, 12, 24, 52, 365, 1000, 10000]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Slices per year n <select value={n} onChange={e => setN(Number(e.target.value))}>{ns.map(k => <option key={k} value={k}>{k}</option>)}</select></label></div>
    <Working rows={[['(1 + 1/n)ⁿ', `(1 + 1/${n})^${n}`, fmt(compound(n), 6)], ['e', 'the limit', fmt(Math.E, 6)], ['gap to e', '', fmt(Math.E - compound(n), 6)]]} />
    <Graph x={[0, 13]} y={[1.8, 2.8]} fns={[{ f: () => Math.E, dash: true, color: C.grey, label: 'e' }]} points={ns.slice(0, 11).map((k, i) => ({ x: i + 1, y: compound(k), color: k === n ? C.orange : C.teal, r: k === n ? 6 : 4 }))} xlabel="n = 1, 2, 3, 4, 6, 12, 24, 52, 365, 1000, 10⁴" />
  </div>
}

export function LogFig() {
  const [x, setX] = useState(1)
  const y = Math.exp(x)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="x" value={x} min={-2} max={2} step={0.1} onChange={setX} /></div>
    <Graph x={[-3, 8]} y={[-3, 8]} equal fns={[{ f: Math.exp, label: 'eˣ', color: C.teal, labelAt: 1.9 }, { f: t => t > 0 ? Math.log(t) : NaN, color: C.orange, label: 'ln x', labelAt: 7.5 }, { f: t => t, dash: true, color: C.grey }]}
      points={[{ x, y, color: C.teal, label: `(${fmt(x, 2)}, ${fmt(y, 2)})` }, { x: y, y: x, color: C.orange, label: `(${fmt(y, 2)}, ${fmt(x, 2)})` }]} segments={[{ x1: x, y1: y, x2: y, y2: x, dash: true, color: C.grey }]} />
    <Working rows={[['e^x', `e^${fmt(x, 2)}`, fmt(y, 4)], ['ln of that', `ln ${fmt(y, 4)}`, fmt(Math.log(y), 4)]]} />
  </div>
}

export function SigmoidBuilder() {
  const [z, setZ] = useState(1)
  const steps = [['z', 'the score', z], ['−z', 'flip', -z], ['e^(−z)', 'exponentiate: always positive', Math.exp(-z)], ['1 + e^(−z)', 'add 1: always > 1', 1 + Math.exp(-z)], ['1 / (1 + e^(−z))', 'one over: between 0 and 1', sigmoid(z)]]
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="z" value={z} min={-6} max={6} step={0.25} onChange={setZ} /></div>
    <Working rows={steps.map(([a, b, v]) => [a, b, fmt(v, 4)])} />
    <Graph x={[-6, 6]} y={[-0.1, 1.1]} height={220} fns={[{ f: sigmoid, label: 'σ(z)' }, { f: () => 0.5, dash: true, color: C.grey }]} points={[{ x: z, y: sigmoid(z), label: fmt(sigmoid(z), 3) }]} xlabel="z" />
  </div>
}

export function ArgminFig() {
  const [shift, setShift] = useState(3), [lift, setLift] = useState(1)
  const L = x => (x - shift) ** 2 + lift
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="where the dip is" value={shift} min={-2} max={6} step={0.5} onChange={setShift} /><Slider label="how low" value={lift} min={-2} max={4} step={0.5} onChange={setLift} /></div>
    <Graph x={[-3, 8]} y={[-3, 12]} fns={[{ f: L, label: 'L(x)' }]} points={[{ x: shift, y: lift, label: 'lowest point' }]} segments={[{ x1: shift, y1: lift, x2: shift, y2: -3, dash: true, color: C.violet }, { x1: shift, y1: lift, x2: -3, y2: lift, dash: true, color: C.orange }]} />
    <Working rows={[['min L(x)', 'the height of the lowest point', fmt(lift)], ['argmin L(x)', 'where along the axis it is', fmt(shift)]]} />
  </div>
}

// Part 1's foundations: sets, logic, functions in pieces, inequalities.
const CONDITIONS = {
  even: ['x is even', x => x % 2 === 0], three: ['x is a multiple of 3', x => x % 3 === 0],
  prime: ['x is prime', x => x > 1 && [...Array(x).keys()].slice(2).every(d => x % d)], small: ['x < 10', x => x < 10], square: ['x is a perfect square', x => Number.isInteger(Math.sqrt(x))],
}
const SET_OPS = {
  union: ['A ∪ B', 'A or B', (a, b) => a || b], inter: ['A ∩ B', 'A and B', (a, b) => a && b], minus: ['A ∖ B', 'A and not B', (a, b) => a && !b],
  comp: ['Aᶜ', 'not A', a => !a], sym: ['(A ∖ B) ∪ (B ∖ A)', 'exactly one of A, B', (a, b) => a !== b],
}
const UNIVERSE = Array.from({ length: 30 }, (_, i) => i + 1)
export function SetsFig() {
  const [a, setA] = useState('even'), [b, setB] = useState('three'), [op, setOp] = useState('inter')
  const [ta, A] = CONDITIONS[a], [tb, B] = CONDITIONS[b], [sym, words, test] = SET_OPS[op]
  const result = members(UNIVERSE, x => test(A(x), B(x)))
  const pick = (value, set) => <select value={value} onChange={e => set(e.target.value)}>{Object.entries(CONDITIONS).map(([k, [t]]) => <option key={k} value={k}>{t}</option>)}</select>
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>A = {'{'}x | {pick(a, setA)}{'}'}</label><label>B = {'{'}x | {pick(b, setB)}{'}'}</label>
      <label>Show <select value={op} onChange={e => setOp(e.target.value)}>{Object.entries(SET_OPS).map(([k, [t]]) => <option key={k} value={k}>{t}</option>)}</select></label></div>
    <div className="mm-chips" aria-label="the numbers 1 to 30">{UNIVERSE.map(x => <span key={x} className={`mm-chip${A(x) ? ' mm-in-a' : ''}${B(x) ? ' mm-in-b' : ''}${result.includes(x) ? ' mm-chosen' : ''}`}>{x}</span>)}</div>
    <p className="qm-hint"><span className="mm-chip mm-in-a mm-key">A</span> left edge · <span className="mm-chip mm-in-b mm-key">B</span> bottom edge · <span className="mm-chip mm-chosen mm-key">✓</span> in the result</p>
    <Working rows={[['in symbols', `${sym} = {x ∈ {1, …, 30} | ${words.replace('A', ta).replace('B', tb)}}`, ''], ['the members', result.length ? `{${result.join(', ')}}` : '∅ (empty)', `|${sym}| = ${result.length}`]]} />
  </div>
}

const TF = b => b ? 'T' : 'F'
const COLUMNS = [['¬p', (p) => !p], ['p ∧ q', (p, q) => p && q], ['p ∨ q', (p, q) => p || q], ['p ⇒ q', implies], ['¬q ⇒ ¬p', (p, q) => implies(!q, !p)], ['q ⇒ p', (p, q) => implies(q, p)], ['p ⇔ q', (p, q) => p === q]]
export function LogicFig() {
  const [p, setP] = useState(true), [q, setQ] = useState(false)
  return <div className="qm-fig">
    <div className="qm-fig-controls qm-buttons"><button onClick={() => setP(!p)}>p is {p ? 'true' : 'false'}</button><button onClick={() => setQ(!q)}>q is {q ? 'true' : 'false'}</button></div>
    <table className="mm-dice mm-truth"><thead><tr><th>p</th><th>q</th>{COLUMNS.map(([name]) => <th key={name}>{name}</th>)}</tr></thead>
      <tbody>{[true, false].flatMap(pp => [true, false].map(qq => <tr key={`${pp}${qq}`} className={pp === p && qq === q ? 'mm-pick' : ''}><td>{TF(pp)}</td><td>{TF(qq)}</td>{COLUMNS.map(([name, fn]) => <td key={name} className={fn(pp, qq) ? '' : 'mm-false'}>{TF(fn(pp, qq))}</td>)}</tr>))}</tbody></table>
    <Working rows={[['p ⇒ q', `(not ${p}) or ${q}`, TF(implies(p, q))], ['contrapositive ¬q ⇒ ¬p', 'the same column as p ⇒ q', TF(implies(!q, !p))], ['converse q ⇒ p', 'a different column', TF(implies(q, p))]]} />
  </div>
}

const PIECES = {
  abs: ['|x|', [['x', 'x ≥ 0', x => x >= 0], ['−x', 'x < 0', x => x < 0]], Math.abs, [-1, 5]],
  relu: ['ReLU(x) = max(0, x)', [['x', 'x > 0', x => x > 0], ['0', 'x ≤ 0', x => x <= 0]], relu, [-1, 5]],
  clip: ['clip(x, −1, 2)', [['−1', 'x < −1', x => x < -1], ['2', 'x > 2', x => x > 2], ['x', '−1 ≤ x ≤ 2', x => x >= -1 && x <= 2]], x => clip(x, -1, 2), [-2, 3]],
  indicator: ['𝟙[x > 1]', [['1', 'x > 1', x => x > 1], ['0', 'otherwise', x => x <= 1]], x => (x > 1 ? 1 : 0), [-0.5, 1.5]],
  floor: ['⌊x⌋', [['the largest whole number ≤ x', 'always', () => true]], Math.floor, [-5, 5]],
  mod: ['x mod 3', [['the remainder after dividing by 3', 'always', () => true]], x => ((x % 3) + 3) % 3, [-0.5, 3.5]],
}
export function PiecewiseFig() {
  const [which, setWhich] = useState('relu'), [x, setX] = useState(-1.5)
  const [name, pieces, fn, yr] = PIECES[which]
  const steps = which === 'floor' || which === 'mod' || which === 'indicator'
  const plot = steps ? t => fn(t) : fn
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Function <select value={which} onChange={e => setWhich(e.target.value)}>{Object.entries(PIECES).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label><Slider label="x" value={x} min={-4} max={4} step={0.25} onChange={setX} /></div>
    <table className="qm-kv mm-cases"><tbody>{pieces.map(([rule, when, test]) => <tr key={when} className={test(x) ? 'mm-pick' : ''}><td className="mono">{rule}</td><td>if {when}</td></tr>)}</tbody></table>
    <Graph x={[-4, 4]} y={yr} height={220} fns={[{ f: plot, label: name, jumps: steps }]} points={[{ x, y: fn(x), label: `${fmt(fn(x), 2)}` }]} xlabel="x" />
  </div>
}

const OPERATIONS = {
  add: ['add c', (v, c) => v + c, () => 'kept: the gap b − a is unchanged'],
  times: ['multiply by c', (v, c) => v * c, c => c > 0 ? 'kept: c > 0 scales the gap' : c < 0 ? 'flipped: c < 0 turns the gap negative' : 'both become 0'],
  square: ['square', v => v * v, () => 'kept only if both are ≥ 0'],
  exp: ['eˣ', v => Math.exp(v), () => 'kept: eˣ always rises'],
  log: ['ln x', v => (v > 0 ? Math.log(v) : NaN), () => 'kept for positive numbers: ln rises'],
  inv: ['1/x', v => (v !== 0 ? 1 / v : NaN), () => 'flipped when both are positive: 1/x falls'],
}
export function InequalityFig() {
  const [a, setA] = useState(-1), [b, setB] = useState(2), [op, setOp] = useState('times'), [c, setC] = useState(-2)
  const lo = Math.min(a, b), hi = Math.max(a, b), [label, g, why] = OPERATIONS[op]
  const ga = g(lo, c), gb = g(hi, c), ok = Number.isFinite(ga) && Number.isFinite(gb)
  const verdict = !ok ? 'undefined for one of them' : ga < gb ? 'a′ < b′: order kept' : ga > gb ? 'a′ > b′: order flipped' : 'a′ = b′'
  const all = [lo, hi, ga, gb].filter(Number.isFinite), x0 = Math.min(-1, ...all) - 0.5, x1 = Math.max(1, ...all) + 0.5
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="a" value={a} min={-4} max={4} step={0.5} onChange={setA} /><Slider label="b" value={b} min={-4} max={4} step={0.5} onChange={setB} />
      <label>Operation <select value={op} onChange={e => setOp(e.target.value)}>{Object.entries(OPERATIONS).map(([k, [n]]) => <option key={k} value={k}>{n}</option>)}</select></label>
      {(op === 'add' || op === 'times') && <Slider label="c" value={c} min={-3} max={3} step={0.5} onChange={setC} />}</div>
    <Graph x={[x0, x1]} y={[-0.6, 1.6]} height={170} grid={false} yaxis={false} label="a and b before (top line) and after (bottom line)"
      segments={[{ x1: x0, y1: 1, x2: x1, y2: 1, color: C.grey }, { x1: x0, y1: 0, x2: x1, y2: 0, color: C.grey }, ...(ok ? [{ x1: lo, y1: 1, x2: ga, y2: 0, dash: true, color: C.teal }, { x1: hi, y1: 1, x2: gb, y2: 0, dash: true, color: C.orange }] : [])]}
      points={[{ x: lo, y: 1, color: C.teal, label: `a = ${fmt(lo, 2)}` }, { x: hi, y: 1, color: C.orange, label: `b = ${fmt(hi, 2)}` }, ...(ok ? [{ x: ga, y: 0, color: C.teal, label: `a′ = ${fmt(ga, 2)}` }, { x: gb, y: 0, color: C.orange, label: `b′ = ${fmt(gb, 2)}` }] : [])]} />
    <Working rows={[['before', `${fmt(lo, 2)} ${lo < hi ? '<' : '='} ${fmt(hi, 2)}`, 'a ≤ b'], ['after: ' + label + (op === 'add' || op === 'times' ? ` (c = ${fmt(c, 2)})` : ''), ok ? `${fmt(ga, 3)} vs ${fmt(gb, 3)}` : '—', verdict], ['the rule', why(c), '']]} />
  </div>
}
