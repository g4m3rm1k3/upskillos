// Interactive figures for Part 4: Combinatorics & Counting
import { useState } from 'react'
import { C, Slider, Bars, Working } from './ui.jsx'
import {
  factorial, perm, choose, pascalTriangle, starsAndBars,
  inclusionExclusion2, derangements, pigeonholeMin,
} from '../engine/discrete.js'

export function DecisionTreeCounterFig() {
  const [m, setM] = useState(4)
  const [n, setN] = useState(3)
  const [k, setK] = useState(2)
  const sumRule = m + n + k
  const prodRule = m * n * k

  return <div className="qm-fig-body">
    <Slider label="Choice A options (m)" value={m} min={1} max={8} step={1} onChange={setM} />
    <Slider label="Choice B options (n)" value={n} min={1} max={8} step={1} onChange={setN} />
    <Slider label="Choice C options (k)" value={k} min={1} max={6} step={1} onChange={setK} />
    <Bars digits={0} rows={[
      { label: 'Sum Rule (A OR B OR C, disjoint)', value: sumRule, color: C.teal },
      { label: 'Product Rule (A AND B AND C, sequential)', value: prodRule, color: C.orange, mark: true },
    ]} />
    <Working rows={[
      ['Sum Rule (pick 1 from A ⊔ B ⊔ C)', `${m} + ${n} + ${k}`, `${sumRule} ways`],
      ['Product Rule (1 from A, then B, then C)', `${m} × ${n} × ${k}`, `${prodRule} ways`],
      ['Divisor count analogy', `For 2^${m - 1} · 3^${n - 1} · 5^${k - 1}`, `τ(N) = (${m - 1}+1)(${n - 1}+1)(${k - 1}+1) = ${prodRule} divisors`],
    ]} />
  </div>
}

export function PermutationExplorerFig() {
  const [n, setN] = useState(6)
  const [k, setK] = useState(3)
  const kk = Math.min(k, n)
  const withRep = n ** kk
  const orderedNoRep = perm(n, kk)
  const circular = factorial(Math.max(0, n - 1))
  const unordered = choose(n, kk)

  return <div className="qm-fig-body">
    <Slider label="Pool size n" value={n} min={1} max={8} step={1} onChange={v => { setN(v); if (k > v) setK(v) }} />
    <Slider label="Selection size k" value={kk} min={0} max={n} step={1} onChange={setK} />
    <Working rows={[
      ['Ordered WITH repetition (n^k)', `${n}^${kk}`, String(withRep)],
      ['Ordered WITHOUT repetition P(n, k)', `${n}! / (${n}−${kk})! = ${Array.from({ length: kk }, (_, i) => n - i).join(' × ') || '1'}`, String(orderedNoRep)],
      ['Unordered subset C(n, k) = P(n,k)/k!', `${orderedNoRep} / ${kk}! = ${orderedNoRep} / ${factorial(kk)}`, String(unordered)],
      ['Circular permutations of all n items', `(${n} − 1)!`, String(circular)],
    ]} />
  </div>
}

export function PascalTriangleFig() {
  const [selN, setSelN] = useState(5)
  const [selK, setSelK] = useState(2)
  const rows = pascalTriangle(8)
  const kk = Math.min(selK, selN)
  const pLeft = selN > 0 && kk > 0 ? choose(selN - 1, kk - 1) : 0
  const pRight = selN > 0 && kk < selN ? choose(selN - 1, kk) : 0
  const curVal = choose(selN, kk)

  return <div className="qm-fig-body">
    <p className="dm-fig-lead">Click any entry C(n, k) in Pascal’s Triangle to highlight its two parents C(n−1, k−1) + C(n−1, k):</p>
    <div className="dm-pascal">
      {rows.map((row, r) => (
        <div key={r} className="dm-pascal-row">
          <span className="dm-pascal-n">n={r}</span>
          {row.map((val, c) => {
            const isTarget = r === selN && c === kk
            const isParent = r === selN - 1 && (c === kk - 1 || c === kk)
            return <button
              key={c}
              type="button"
              className={`dm-pascal-cell${isTarget ? ' target' : isParent ? ' parent' : ''}`}
              onClick={() => { setSelN(r); setSelK(c) }}
            >
              {val}
            </button>
          })}
          <span className="dm-pascal-sum">∑ = {2 ** r}</span>
        </div>
      ))}
    </div>
    <Working rows={[
      ['Selected entry', `C(${selN}, ${kk})`, String(curVal)],
      ['Pascal’s Rule C(n−1, k−1) + C(n−1, k)', selN > 0 ? `${pLeft} + ${pRight}` : 'Row 0 base case', String(curVal)],
      [`Row ${selN} sum ∑_{k=0}^${selN} C(${selN}, k)`, rows[selN].join(' + '), `2^${selN} = ${2 ** selN}`],
    ]} />
  </div>
}

export function StarsAndBarsFig() {
  const [nStars, setNStars] = useState(5)
  const [kBins, setKBins] = useState(3)
  const totalNonNeg = starsAndBars(nStars, kBins)
  const totalPositive = nStars >= kBins ? choose(nStars - 1, kBins - 1) : 0

  // Show an example configuration: distribute nStars across kBins
  const base = Math.floor(nStars / kBins)
  const rem = nStars % kBins
  const counts = Array.from({ length: kBins }, (_, i) => base + (i < rem ? 1 : 0))
  const visual = counts.map(c => '★'.repeat(c)).join(' | ')

  return <div className="qm-fig-body">
    <Slider label="Identical items (stars n)" value={nStars} min={0} max={10} step={1} onChange={setNStars} />
    <Slider label="Distinct bins (k)" value={kBins} min={1} max={6} step={1} onChange={setKBins} />
    <Working rows={[
      ['Sample string (n stars, k−1 bars)', `(${counts.join(', ')})  ↔  ${visual || '(empty)'}`, `${nStars} ★ and ${kBins - 1} |  (${nStars + kBins - 1} symbols)`],
      ['Unrestricted solutions (xᵢ ≥ 0)', `C(${nStars} + ${kBins} − 1, ${kBins} − 1) = C(${nStars + kBins - 1}, ${kBins - 1})`, `${totalNonNeg} ways`],
      ['Positive solutions (xᵢ ≥ 1)', nStars >= kBins ? `C(${nStars} − 1, ${kBins} − 1) = C(${nStars - 1}, ${kBins - 1})` : 'Need n ≥ k so every bin gets ≥ 1', `${totalPositive} ways`],
    ]} />
  </div>
}

export function InclusionExclusionPigeonFig() {
  const [a, setA] = useState(25)
  const [b, setB] = useState(20)
  const [ab, setAb] = useState(8)
  const [nDer, setNDer] = useState(4)
  const [pigeons, setPigeons] = useState(13)
  const [holes, setHoles] = useState(12)

  const cappedAb = Math.min(ab, a, b)
  const union2 = inclusionExclusion2(a, b, cappedAb)
  const dVal = derangements(nDer)
  const fVal = factorial(nDer)

  return <div className="qm-fig-body">
    <Slider label="|A|" value={a} min={5} max={50} step={1} onChange={setA} />
    <Slider label="|B|" value={b} min={5} max={50} step={1} onChange={setB} />
    <Slider label="|A ∩ B|" value={cappedAb} min={0} max={Math.min(a, b)} step={1} onChange={setAb} />
    <Slider label="Derangement size n (Dₙ)" value={nDer} min={1} max={7} step={1} onChange={setNDer} />
    <Slider label="Pigeons N (into k = 12 boxes)" value={pigeons} min={1} max={40} step={1} onChange={setPigeons} />
    <Working rows={[
      ['Inclusion-Exclusion |A ∪ B|', `${a} + ${b} − ${cappedAb}`, `${union2} (Only A: ${a - cappedAb}, Both: ${cappedAb}, Only B: ${b - cappedAb})`],
      [`Derangements D_${nDer} (zero fixed points)`, `n! ∑ (-1)^k / k! for n = ${nDer}`, `D_${nDer} = ${dVal} out of ${fVal} (${((100 * dVal) / fVal).toFixed(1)}% ≈ 1/e = 36.8%)`],
      ['Generalized Pigeonhole Principle', `${pigeons} items into ${holes} boxes`, `At least one box has ≥ ⌈${pigeons}/${holes}⌉ = ${pigeonholeMin(pigeons, holes)} items`],
    ]} />
  </div>
}
