// Interactive figures for Part 6: Recurrences, Generating Functions & Asymptotics
import { useState } from 'react'
import { C, Graph, Slider, Bars, Working, fmt } from './ui.jsx'
import {
  arithmeticSum, geometricSum, telescopingPartial,
  fib, hanoiMoves, recurrenceSeq, masterExponent, catalan, factorial,
} from '../engine/discrete.js'

export function SigmaTelescopeFig() {
  const [n, setN] = useState(5)
  const [r, setR] = useState(2)
  const arith = arithmeticSum(2, 3, n) // 2 + 5 + 8 + ...
  const geom = geometricSum(r, n)
  const tele = telescopingPartial(n)

  const terms = Array.from({ length: n }, (_, k) => {
    const i = k + 1
    return `(1/${i} − 1/${i + 1})`
  }).join(' + ')

  return <div className="qm-fig-body">
    <Slider label="Upper limit n" value={n} min={1} max={10} step={1} onChange={setN} />
    <Slider label="Geometric ratio r" value={r} min={2} max={4} step={1} onChange={setR} />
    <Working rows={[
      ['Arithmetic ∑_{k=0}^{n-1} (2 + 3k)', `n(a₁ + aₙ)/2 for n = ${n}`, String(arith)],
      ['Geometric ∑_{k=0}^{n-1} r^k', `(${r}^${n} − 1) / (${r} − 1)`, String(geom)],
      ['Telescoping ∑_{k=1}^n 1/(k(k+1))', terms, `1 − 1/${n + 1} = ${n}/${n + 1} ≈ ${fmt(tele, 4)}`],
    ]} />
  </div>
}

export function RecurrenceTreeFig() {
  const [preset, setPreset] = useState('fib')
  const [count, setCount] = useState(8)
  const configs = {
    fib: { label: 'Fibonacci: aₙ = aₙ₋₁ + aₙ₋₂ (a₀=0, a₁=1)', c1: 1, c2: 1, a0: 0, a1: 1, charEq: 'r² − r − 1 = 0', roots: 'φ ≈ 1.618, ψ ≈ −0.618' },
    pell: { label: 'Pell: aₙ = 2aₙ₋₁ + aₙ₋₂ (a₀=0, a₁=1)', c1: 2, c2: 1, a0: 0, a1: 1, charEq: 'r² − 2r − 1 = 0', roots: '1 ± √2' },
    char23: { label: 'aₙ = 5aₙ₋₁ − 6aₙ₋₂ (a₀=2, a₁=5)', c1: 5, c2: -6, a0: 2, a1: 5, charEq: 'r² − 5r + 6 = 0', roots: 'r₁ = 2, r₂ = 3 (aₙ = 2ⁿ + 3ⁿ)' },
    repeated: { label: 'Repeated root: aₙ = 4aₙ₋₁ − 4aₙ₋₂ (a₀=1, a₁=4)', c1: 4, c2: -4, a0: 1, a1: 4, charEq: '(r − 2)² = 0', roots: 'r = 2 double root (aₙ = (1+n)2ⁿ)' },
  }
  const cur = configs[preset]
  const seq = recurrenceSeq(cur.c1, cur.c2, cur.a0, cur.a1, count)
  const pts = seq.map((v, i) => ({ x: i, y: v, color: C.violet, r: 4.5 }))
  const maxY = Math.max(10, ...seq)

  return <div className="qm-fig-body">
    <div className="qm-buttons">
      {Object.entries(configs).map(([k, cfg]) => (
        <button key={k} className={preset === k ? 'qm-primary' : ''} onClick={() => setPreset(k)}>{cfg.label}</button>
      ))}
    </div>
    <Slider label="Terms shown" value={count} min={4} max={10} step={1} onChange={setCount} />
    <Graph x={[0, count - 1]} y={[0, maxY * 1.08]} height={190} points={pts} xlabel="n" ylabel="aₙ" label="Recurrence sequence values" />
    <Working rows={[
      ['Characteristic equation & roots', cur.charEq, cur.roots],
      [`First ${count} terms (a₀..a_${count - 1})`, seq.map((v, i) => `a_${i}=${v}`).join(', '), `a_${count - 1} = ${seq[count - 1]}`],
      ['Comparison: Tower of Hanoi Hₙ = 2ⁿ − 1', `H_${count - 1} = 2^${count - 1} − 1 = ${hanoiMoves(count - 1)}`, `F_${count - 1} = ${fib(count - 1)}`],
    ]} />
  </div>
}

export function MasterTheoremFig() {
  const [a, setA] = useState(2)
  const [b, setB] = useState(2)
  const [d, setD] = useState(1)
  const crit = masterExponent(a, b)
  const diff = d - crit
  const regime = Math.abs(diff) < 1e-6 ? 'Case 2 (Balanced: d = log_b a)' : diff < 0 ? 'Case 1 (Leaf-heavy: d < log_b a)' : 'Case 3 (Root-heavy: d > log_b a)'
  const asymp = Math.abs(diff) < 1e-6
    ? `Θ(n^${d} log n)`
    : diff < 0
      ? `Θ(n^(log_${b} ${a})) ≈ Θ(n^${fmt(crit, 2)})`
      : `Θ(n^${d})`

  // Work at depth ℓ = 0, 1, 2, 3 for n = b^3
  const L = 3
  const n0 = b ** L
  const levelRows = Array.from({ length: L + 1 }, (_, ell) => {
    const nodes = a ** ell
    const subSize = n0 / b ** ell
    const work = nodes * subSize ** d
    return { label: `Level ℓ=${ell} (${nodes} nodes × ${subSize}^${d})`, value: work, color: ell === 0 ? C.orange : ell === L ? C.teal : C.violet }
  })

  return <div className="qm-fig-body">
    <Slider label="Branching factor a (subproblems)" value={a} min={1} max={8} step={1} onChange={setA} />
    <Slider label="Shrink factor b (size n/b)" value={b} min={2} max={4} step={1} onChange={setB} />
    <Slider label="Combine work exponent d (Θ(n^d))" value={d} min={0} max={3} step={1} onChange={setD} />
    <Bars digits={0} rows={levelRows} />
    <Working rows={[
      ['Recurrence T(n) = a T(n/b) + Θ(n^d)', `T(n) = ${a} T(n/${b}) + Θ(n^${d})`, `Critical exponent log_${b}(${a}) = ${fmt(crit, 3)}`],
      ['Master Theorem Case', `Compare d = ${d} vs log_b(a) = ${fmt(crit, 3)}`, regime],
      ['Asymptotic solution', 'Total work across recursion tree', asymp],
    ]} />
  </div>
}

const CATALAN_EXAMPLES = {
  0: ['(empty)'],
  1: ['()'],
  2: ['(())', '()()'],
  3: ['((()))', '(()())', '(())()', '()(())', '()()()'],
  4: ['(((())))', '((()()))', '((())())', '((()))()', '(()(()))', '(()()())', '(()())()', '(())(())', '(())()()', '()((()))', '()(()())', '()(())()', '()()(())', '()()()()'],
}

export function CatalanExplorerFig() {
  const [n, setN] = useState(3)
  const cVal = catalan(n)
  const list = CATALAN_EXAMPLES[n] ?? []

  return <div className="qm-fig-body">
    <Slider label="n (pairs of parentheses / binary tree nodes)" value={n} min={0} max={6} step={1} onChange={setN} />
    {list.length > 0 && (
      <div className="dm-catalan-pills">
        {list.map((s, i) => <code key={i} className="dm-pill">{s}</code>)}
      </div>
    )}
    <Working rows={[
      ['Closed form Cₙ = C(2n, n) / (n + 1)', `C(${2 * n}, ${n}) / ${n + 1}`, `C_${n} = ${cVal}`],
      ['Segmented convolution ∑_{i=0}^{n-1} Cᵢ C_{n-1-i}', n > 0 ? Array.from({ length: n }, (_, i) => `C_${i}·C_${n - 1 - i} (${catalan(i)}×${catalan(n - 1 - i)})`).join(' + ') : 'Base case C₀ = 1', String(cVal)],
      ['First 7 Catalan numbers C₀..C₆', [0, 1, 2, 3, 4, 5, 6].map(k => catalan(k)).join(', '), 'Counts Dyck paths, binary trees, triangulations'],
    ]} />
  </div>
}

export function AsymptoticRaceFig() {
  const [n, setN] = useState(8)
  const rows = [
    { label: 'log₂ n', value: Math.log2(n), color: C.teal },
    { label: 'n', value: n, color: C.blue },
    { label: 'n log₂ n', value: n * Math.log2(n), color: C.violet },
    { label: 'n²', value: n * n, color: C.orange },
    { label: '2ⁿ', value: 2 ** n, color: C.red, mark: true },
  ]
  return <div className="qm-fig-body">
    <Slider label="Input size n" value={n} min={2} max={12} step={1} onChange={setN} />
    <Bars digits={1} rows={rows} />
    <Working rows={[
      ['Logarithmic vs Linear', `log₂(${n}) = ${fmt(Math.log2(n), 2)}`, `n = ${n}  |  n log₂ n = ${fmt(n * Math.log2(n), 1)}`],
      ['Polynomial vs Exponential vs Factorial', `n² = ${n * n}`, `2^${n} = ${2 ** n}  |  ${n}! = ${factorial(n)}`],
    ]} />
  </div>
}
