// Interactive figures for Part 2: The Craft of Mathematical Proof
import { useState } from 'react'
import { C, Graph, Slider, Working } from './ui.jsx'
import {
  eulerPoly, isPrime, smallestFactor, euclidConstruct,
  gaussSum, oddSum, sumOfSquares, canMakeStamp, frobeniusNumber, trominoCount,
} from '../engine/discrete.js'

export function CounterexamplePrimeFig() {
  const [n, setN] = useState(40)
  const val = eulerPoly(n)
  const prime = isPrime(val)
  const factor = smallestFactor(val)
  const pts = Array.from({ length: 42 }, (_, k) => {
    const v = eulerPoly(k)
    const p = isPrime(v)
    return { x: k, y: v, color: p ? C.teal : C.red, r: k === n ? 6 : 3.5 }
  })
  return <div className="qm-fig-body">
    <Slider label="n" value={n} min={0} max={41} step={1} onChange={setN} />
    <Graph x={[0, 41]} y={[0, 1800]} height={210} points={pts} xlabel="n" ylabel="n² + n + 41" label="Euler prime-generating polynomial" />
    <Working rows={[
      ['Formula evaluation', `P(${n}) = ${n}² + ${n} + 41`, String(val)],
      ['Primality test', prime ? 'No divisor > 1 found' : `Smallest factor = ${factor} (${val} = ${factor} × ${val / factor})`, prime ? 'PRIME ✓' : 'COMPOSITE ✗ (Counterexample!)'],
      ['Pattern lesson', 'n = 0..39 are ALL prime (40 primes in a row!)', 'n = 40 gives 40² + 40 + 41 = 41 × 41 = 1681'],
    ]} />
  </div>
}

export function ParityInvariantFig() {
  const [mode, setMode] = useState('corners') // 'corners' | 'single' | 'adjacent'
  // 8x8 board = 32 black + 32 white squares
  const presets = {
    corners: {
      title: 'Opposite corners removed ((0,0) and (7,7))',
      removed: [[0, 0], [7, 7]],
      blackLeft: 30,
      whiteLeft: 32,
      canTile: false,
      why: 'Both (0,0) and (7,7) have even coordinate sum (black), leaving 30 black and 32 white squares. Every domino covers 1 black + 1 white, so 31 dominoes require 31 of each!',
    },
    adjacent: {
      title: 'Opposite-color corners removed ((0,0) and (0,7))',
      removed: [[0, 0], [0, 7]],
      blackLeft: 31,
      whiteLeft: 31,
      canTile: true,
      why: '(0,0) is black and (0,7) is white, leaving 31 black and 31 white squares — parity invariant is satisfied and a domino tiling exists!',
    },
    single: {
      title: 'Single square removed for L-tromino tiling',
      removed: [[2, 5]],
      blackLeft: 32,
      whiteLeft: 31,
      canTile: true,
      why: '64 − 1 = 63 = 3 × 21 squares: by induction on 2ⁿ × 2ⁿ grids, removing ANY single square allows a complete L-tromino tiling!',
    },
  }
  const cur = presets[mode]
  const isRemoved = (r, c) => cur.removed.some(([rr, cc]) => rr === r && cc === c)

  return <div className="qm-fig-body">
    <div className="qm-buttons">
      <button className={mode === 'corners' ? 'qm-primary' : ''} onClick={() => setMode('corners')}>Mutilated Board (Opposite Corners)</button>
      <button className={mode === 'adjacent' ? 'qm-primary' : ''} onClick={() => setMode('adjacent')}>Opposite-Color Corners</button>
      <button className={mode === 'single' ? 'qm-primary' : ''} onClick={() => setMode('single')}>L-Tromino (1 Square Removed)</button>
    </div>
    <div className="dm-board-wrap">
      <div className="dm-mini-board" role="img" aria-label={cur.title}>
        {Array.from({ length: 8 }, (_, r) =>
          Array.from({ length: 8 }, (__, c) => {
            const dark = (r + c) % 2 === 0
            const rem = isRemoved(r, c)
            return <span key={`${r}-${c}`} className={`dm-sq ${dark ? 'dark' : 'light'}${rem ? ' removed' : ''}`}>
              {rem ? '✕' : ''}
            </span>
          }),
        )}
      </div>
      <div className="dm-board-stats">
        <Working rows={[
          ['Configuration', cur.title, cur.canTile ? 'Tileable ✓' : 'Impossible ✗'],
          ['Square counts', `Dark: ${cur.blackLeft}, Light: ${cur.whiteLeft}`, `Difference = ${Math.abs(cur.blackLeft - cur.whiteLeft)}`],
          ['Invariant', mode === 'single' ? `Trominoes = (8² − 1)/3 = ${trominoCount(3)}` : '1 domino = 1 dark + 1 light', cur.why],
        ]} />
      </div>
    </div>
  </div>
}

const PRIME_SETS = [
  { label: '{2, 3}', primes: [2, 3] },
  { label: '{2, 3, 5}', primes: [2, 3, 5] },
  { label: '{2, 3, 5, 7}', primes: [2, 3, 5, 7] },
  { label: '{2, 3, 5, 7, 11, 13}', primes: [2, 3, 5, 7, 11, 13] },
  { label: '{2, 5, 11}', primes: [2, 5, 11] },
]

export function EuclidPrimesFig() {
  const [idx, setIdx] = useState(3)
  const { primes } = PRIME_SETS[idx]
  const [N, pFactor] = euclidConstruct(primes)
  const nIsPrime = N === pFactor
  return <div className="qm-fig-body">
    <div className="qm-buttons">
      {PRIME_SETS.map((s, i) => (
        <button key={i} className={idx === i ? 'qm-primary' : ''} onClick={() => setIdx(i)}>L = {s.label}</button>
      ))}
    </div>
    <Working rows={[
      ['Finite prime list L', primes.join(', '), `${primes.length} primes`],
      ['Euclid’s number N = (∏ L) + 1', `${primes.join(' × ')} + 1`, String(N)],
      ['Remainders N mod pᵢ', primes.map(p => `${N} mod ${p} = ${N % p}`).join(', '), 'Every remainder is 1 (none divide N!)'],
      ['New prime factor p | N', nIsPrime ? `N = ${N} is itself prime!` : `N = ${N} is composite (${pFactor} × ${N / pFactor})`, `New prime p = ${pFactor} ∉ L`],
    ]} />
  </div>
}

export function InductionStaircaseFig() {
  const [n, setN] = useState(6)
  const gSum = gaussSum(n)
  const oSum = oddSum(n)
  const sqSum = sumOfSquares(n)
  const rects = []
  for (let i = 1; i <= n; i++) {
    rects.push({ x: i - 1, y: 0, w: 0.92, h: i, color: i === n ? C.orange : C.teal, opacity: 0.82 })
    rects.push({ x: i - 1, y: i, w: 0.92, h: n + 1 - i, color: C.violet, opacity: 0.28 })
  }
  return <div className="qm-fig-body">
    <Slider label="n" value={n} min={1} max={12} step={1} onChange={setN} />
    <Graph x={[0, n]} y={[0, n + 1]} height={200} rects={rects} xlabel="Column k (1..n)" ylabel="Height (n + 1)" label="Gauss staircase rectangle n by n+1" />
    <Working rows={[
      ['Gauss sum ∑_{i=1}^n i', `Half of ${n} × ${n + 1} rectangle = ${n * (n + 1)} / 2`, String(gSum)],
      ['Inductive step k → k+1', `${gaussSum(n - 1)} + ${n} = ${gSum}`, `Matches ${n}(${n}+1)/2 = ${gSum}`],
      ['Sum of first n odds ∑(2i−1)', `1 + 3 + … + ${2 * n - 1} = ${n}²`, String(oSum)],
      ['Sum of squares ∑ i²', `${n}(${n}+1)(2·${n}+1)/6`, String(sqSum)],
    ]} />
  </div>
}

export function PostageStampFig() {
  const [a, setA] = useState(4)
  const [b, setB] = useState(5)
  const [target, setTarget] = useState(17)
  const frob = frobeniusNumber(a, b)
  const threshold = frob + 1
  const combo = canMakeStamp(target, a, b)
  const maxShow = Math.max(28, threshold + 8)

  return <div className="qm-fig-body">
    <div className="qm-buttons">
      <button className={a === 4 && b === 5 ? 'qm-primary' : ''} onClick={() => { setA(4); setB(5) }}>4¢ and 5¢ stamps</button>
      <button className={a === 3 && b === 5 ? 'qm-primary' : ''} onClick={() => { setA(3); setB(5) }}>3¢ and 5¢ stamps</button>
      <button className={a === 3 && b === 7 ? 'qm-primary' : ''} onClick={() => { setA(3); setB(7) }}>3¢ and 7¢ stamps</button>
    </div>
    <Slider label="Target postage n" value={target} min={1} max={maxShow} step={1} onChange={setTarget} />
    <div className="dm-stamp-grid">
      {Array.from({ length: maxShow }, (_, i) => {
        const val = i + 1
        const ok = Boolean(canMakeStamp(val, a, b))
        return <button key={val} type="button" className={`dm-stamp-cell${ok ? ' reachable' : ' gap'}${val === target ? ' selected' : ''}`} onClick={() => setTarget(val)}>
          <span>{val}¢</span>
          <small>{ok ? '✓' : '✗'}</small>
        </button>
      })}
    </div>
    <Working rows={[
      ['Frobenius number g(a, b) = ab − a − b', `${a}·${b} − ${a} − ${b} = ${frob}¢ (largest impossible value)`, `Conductor = ${threshold}¢ (all n ≥ ${threshold} reachable)`],
      ['Strong induction base cases', `${a} consecutive values: ${Array.from({ length: a }, (_, i) => threshold + i).join('¢, ')}¢`, `Step: P(k − ${a - 1}) + ${a}¢ ⇒ P(k + 1)`],
      [`Target n = ${target}¢`, combo ? `${target} = ${a}×(${combo[0]}) + ${b}×(${combo[1]})` : `No non-negative integer solution to ${a}x + ${b}y = ${target}`, combo ? `${combo[0]} × ${a}¢ + ${combo[1]} × ${b}¢` : 'Impossible'],
    ]} />
  </div>
}
