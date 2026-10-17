// Interactive figures for Part 3: Sets, Functions & Relations
import { useState } from 'react'
import { C, Slider, Working } from './ui.jsx'
import {
  setUnion, setIntersect, setDiff, setSymDiff, powerSet,
  functionsCount, injectionsCount, surjectionsCount, factorial,
  relationProps, transitiveClosure, stirlingSecond, bellNumber, cantorPair,
} from '../engine/discrete.js'

const fmtSet = arr => (arr.length === 0 ? '∅' : `{${arr.join(', ')}}`)

export function SetBuilderFig() {
  const U = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  const [predA, setPredA] = useState('even')
  const [predB, setPredB] = useState('div3')
  const rules = {
    even: { label: '{x ∈ U : 2 | x}', fn: x => x % 2 === 0 },
    odd: { label: '{x ∈ U : x is odd}', fn: x => x % 2 === 1 },
    div3: { label: '{x ∈ U : 3 | x}', fn: x => x % 3 === 0 },
    prime: { label: '{x ∈ U : x is prime}', fn: x => [2, 3, 5, 7, 11].includes(x) },
    small: { label: '{x ∈ U : x ≤ 5}', fn: x => x <= 5 },
  }
  const A = U.filter(rules[predA].fn)
  const B = U.filter(rules[predB].fn)
  const isSub = A.every(x => B.includes(x))

  return <div className="qm-fig-body">
    <div className="qm-buttons">
      <span>Set A:</span>
      {Object.entries(rules).map(([k, r]) => (
        <button key={k} className={predA === k ? 'qm-primary' : ''} onClick={() => setPredA(k)}>{r.label}</button>
      ))}
    </div>
    <div className="qm-buttons">
      <span>Set B:</span>
      {Object.entries(rules).map(([k, r]) => (
        <button key={k} className={predB === k ? 'qm-primary' : ''} onClick={() => setPredB(k)}>{r.label}</button>
      ))}
    </div>
    <Working rows={[
      ['Set A (extensional roster)', rules[predA].label, `${fmtSet(A)}  (|A| = ${A.length})`],
      ['Set B (extensional roster)', rules[predB].label, `${fmtSet(B)}  (|B| = ${B.length})`],
      ['Subset & Cartesian sizes', `A ⊆ B: ${isSub ? 'Yes ✓' : 'No ✗'}`, `|A × B| = ${A.length} × ${B.length} = ${A.length * B.length}, |P(A)| = 2^${A.length} = ${2 ** A.length}`],
    ]} />
  </div>
}

export function VennPowerSetFig() {
  const U = [1, 2, 3, 4, 5, 6]
  const [A, setA] = useState([1, 2, 3, 4])
  const [B, setB] = useState([3, 4, 5])
  const toggle = (set, setter, x) => setter(set.includes(x) ? set.filter(v => v !== x) : [...set, x].sort((a, b) => a - b))

  const union = setUnion(A, B)
  const inter = setIntersect(A, B)
  const diffAB = setDiff(A, B)
  const sym = setSymDiff(A, B)
  const compUnion = setDiff(U, union)
  const pSetA = powerSet(A.slice(0, 4))

  return <div className="qm-fig-body">
    <div className="qm-buttons">
      <span>Toggle A ⊆ {fmtSet(U)}:</span>
      {U.map(x => (
        <button key={x} className={A.includes(x) ? 'qm-primary' : ''} onClick={() => toggle(A, setA, x)}>{x}</button>
      ))}
    </div>
    <div className="qm-buttons">
      <span>Toggle B ⊆ {fmtSet(U)}:</span>
      {U.map(x => (
        <button key={x} className={B.includes(x) ? 'qm-primary' : ''} onClick={() => toggle(B, setB, x)}>{x}</button>
      ))}
    </div>
    <Working rows={[
      ['Union A ∪ B & Intersection A ∩ B', `A ∪ B = ${fmtSet(union)} (|A∪B| = ${union.length})`, `A ∩ B = ${fmtSet(inter)} (|A∩B| = ${inter.length})`],
      ['Difference A \\ B & Symmetric Diff A △ B', `A \\ B = ${fmtSet(diffAB)}`, `A △ B = ${fmtSet(sym)}`],
      ['De Morgan check: (A ∪ B)ᶜ = Aᶜ ∩ Bᶜ', fmtSet(compUnion), `|P(A)| = 2^${A.length} = ${2 ** A.length} (${A.length <= 4 ? pSetA.map(fmtSet).slice(0, 6).join(', ') + (pSetA.length > 6 ? ', …' : '') : '…'})`],
    ]} />
  </div>
}

export function BijectionMapperFig() {
  const [m, setM] = useState(3)
  const [n, setN] = useState(3)
  const [targets, setTargets] = useState([1, 2, 0, 1])

  const domain = Array.from({ length: m }, (_, i) => i)
  const codomain = Array.from({ length: n }, (_, j) => j)
  const mapped = domain.map(i => targets[i] % n)
  const imageSet = new Set(mapped)
  const injective = imageSet.size === m
  const surjective = imageSet.size === n
  const bijective = injective && surjective

  const cycleTarget = i => setTargets(t => t.map((v, k) => (k === i ? (v + 1) % n : v)))

  return <div className="qm-fig-body">
    <Slider label="|A| (Domain size m)" value={m} min={1} max={4} step={1} onChange={setM} />
    <Slider label="|B| (Codomain size n)" value={n} min={1} max={4} step={1} onChange={setN} />
    <div className="qm-buttons">
      {domain.map(i => (
        <button key={i} className="qm-primary" onClick={() => cycleTarget(i)}>
          f(a{i + 1}) = b{mapped[i] + 1} (click to redirect)
        </button>
      ))}
    </div>
    <Working rows={[
      ['Current mapping f : A → B', domain.map(i => `a${i + 1} ↦ b${mapped[i] + 1}`).join(', '), bijective ? 'Bijection (1-to-1 & Onto) ✓' : injective ? 'Injective only (1-to-1)' : surjective ? 'Surjective only (Onto)' : 'Neither injective nor surjective'],
      ['Total functions B^A vs Injections P(n, m)', `n^m = ${n}^${m} = ${functionsCount(m, n)}`, `Injections = ${injectionsCount(m, n)}`],
      ['Surjections n! S(m, n) vs Bijections', `Surjections = ${surjectionsCount(m, n)}`, `Bijections = ${m === n ? factorial(n) : 0}`],
    ]} />
  </div>
}

export function RelationMatrixFig() {
  const [M, setM] = useState([
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 1],
  ])
  const toggle = (r, c) => setM(m => m.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? (v ? 0 : 1) : v))))
  const setPreset = kind => {
    if (kind === 'equiv') setM([[1, 1, 0], [1, 1, 0], [0, 0, 1]])
    if (kind === 'poset') setM([[1, 1, 1], [0, 1, 1], [0, 0, 1]])
    if (kind === 'chain') setM([[1, 1, 0], [0, 1, 1], [0, 0, 1]])
  }
  const props = relationProps(M)
  const closure = transitiveClosure(M)

  return <div className="qm-fig-body">
    <div className="qm-buttons">
      <button onClick={() => setPreset('equiv')}>Preset: Equivalence Relation</button>
      <button onClick={() => setPreset('poset')}>Preset: Partial Order (Poset)</button>
      <button onClick={() => setPreset('chain')}>Preset: Missing Transitive Shortcut</button>
    </div>
    <table className="qm-mathcode dm-matrix-table">
      <thead>
        <tr><th>R on {'{1,2,3}'}</th><th>1</th><th>2</th><th>3</th><th>Transitive Closure R⁺</th></tr>
      </thead>
      <tbody>
        {M.map((row, r) => (
          <tr key={r}>
            <td><b>{r + 1}</b></td>
            {row.map((val, c) => (
              <td key={c}>
                <button type="button" className={`dm-cell-btn${val ? ' on' : ''}`} onClick={() => toggle(r, c)}>
                  {val}
                </button>
              </td>
            ))}
            <td className="mono">[{closure[r].map(v => (v ? 1 : 0)).join(', ')}]</td>
          </tr>
        ))}
      </tbody>
    </table>
    <Working rows={[
      ['Reflexive & Irreflexive', `Reflexive: ${props.reflexive ? '✓ Yes' : '✗ No'}`, `Irreflexive: ${props.irreflexive ? '✓ Yes' : '✗ No'}`],
      ['Symmetric & Antisymmetric', `Symmetric: ${props.symmetric ? '✓ Yes' : '✗ No'}`, `Antisymmetric: ${props.antisymmetric ? '✓ Yes' : '✗ No'}`],
      ['Transitive & Classification', `Transitive: ${props.transitive ? '✓ Yes' : '✗ No'}`, props.equivalence ? 'Equivalence Relation ✓' : props.partialOrder ? 'Partial Order (Poset) ✓' : 'General binary relation'],
    ]} />
  </div>
}

export function HassePosetFig() {
  const [n, setN] = useState(4)
  // Divisibility poset on D_12 = {1, 2, 3, 4, 6, 12}
  const divs = [1, 2, 3, 4, 6, 12]
  const covers = [
    [1, 2], [1, 3], [2, 4], [2, 6], [3, 6], [4, 12], [6, 12],
  ]
  const stirlingRow = Array.from({ length: n }, (_, k) => `S(${n},${k + 1})=${stirlingSecond(n, k + 1)}`).join(', ')

  return <div className="qm-fig-body">
    <Slider label="Set size n (for partition count Bₙ)" value={n} min={1} max={6} step={1} onChange={setN} />
    <Working rows={[
      ['Divisibility poset (D₁₂, |)', `Elements: {${divs.join(', ')}}`, `Min = 1, Max = 12, Anticans: {2,3}, {4,6}`],
      ['Hasse covering edges (x ≺ y)', covers.map(([x, y]) => `${x} → ${y}`).join(', '), 'Transitive & self-edges omitted'],
      [`Stirling numbers S(${n}, k)`, stirlingRow, `Bell number B_${n} = ${bellNumber(n)} total equivalence relations`],
    ]} />
  </div>
}

export function CantorDiagonalFig() {
  const [rows, setRows] = useState([
    [0, 1, 0, 1],
    [1, 1, 0, 0],
    [0, 0, 1, 1],
    [1, 0, 1, 0],
  ])
  const [px, setPx] = useState(2)
  const [py, setPy] = useState(1)
  const flipCell = (r, c) => setRows(rs => rs.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? 1 - v : v))))
  const diag = rows.map((r, i) => r[i])
  const antiDiag = diag.map(b => 1 - b)

  return <div className="qm-fig-body">
    <p className="dm-fig-lead">Click bits in the table $s_i[j]$. The highlighted diagonal $s_i[i]$ is flipped to build $d[i] = 1 - s_i[i]$, which differs from every row $s_i$ at column $i$:</p>
    <table className="qm-mathcode dm-matrix-table">
      <thead>
        <tr><th>Row</th><th>Bit 0</th><th>Bit 1</th><th>Bit 2</th><th>Bit 3</th><th>Why d ≠ sᵢ</th></tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r}>
            <td><b>s{r}</b></td>
            {row.map((val, c) => (
              <td key={c}>
                <button type="button" className={`dm-cell-btn${r === c ? ' on' : ''}`} onClick={() => flipCell(r, c)}>
                  {val}{r === c ? '*' : ''}
                </button>
              </td>
            ))}
            <td>d[{r}] = <b>{antiDiag[r]}</b> ≠ s{r}[{r}] ({row[r]})</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="qm-buttons">
      <Slider label="Cantor pair x" value={px} min={0} max={6} step={1} onChange={setPx} />
      <Slider label="Cantor pair y" value={py} min={0} max={6} step={1} onChange={setPy} />
    </div>
    <Working rows={[
      ['Diagonal bit sequence', `diag = (${diag.join(', ')})`, `Flipped d = (${antiDiag.join(', ')}) ∉ {s₀, s₁, s₂, s₃}`],
      ['Cantor Pairing π(x, y) : ℕ × ℕ → ℕ', `π(${px}, ${py}) = ½(${px}+${py})(${px}+${py}+1) + ${py}`, `Unique index = ${cantorPair(px, py)} (proving |ℕ × ℕ| = |ℕ| = ℵ₀)`],
    ]} />
  </div>
}
