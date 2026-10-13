// Part 1 figures: a prediction line, function machines, indexes, Σ step by step, powers, compound
// growth toward e, exp and ln as mirror images, the sigmoid built in four steps, and argmin.
import { useState } from 'react'
import { predict, compound, sigmoid } from '../engine/maths.js'
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
