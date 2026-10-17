// Interactive figures for Part 5: Number Theory & Cryptography
import { useState } from 'react'
import { C, Slider, Working } from './ui.jsx'
import {
  isPrime, primeFactors, divisorCount, divisorSum, divMod,
  euclidSteps, extGcd, lcm, mod, modInverse, modPow, totient, crtSolve, rsaDemo,
} from '../engine/discrete.js'

export function PrimeFactorSieveFig() {
  const [n, setN] = useState(36)
  const [d, setD] = useState(7)
  const factors = primeFactors(n)
  const factorStr = factors.map(([p, e]) => (e === 1 ? `${p}` : `${p}^${e}`)).join(' × ') || '1'
  const [q, r] = divMod(n, d)

  return <div className="qm-fig-body">
    <Slider label="Integer n" value={n} min={2} max={60} step={1} onChange={setN} />
    <Slider label="Divisor d (for Division Algorithm)" value={d} min={2} max={15} step={1} onChange={setD} />
    <div className="dm-sieve-grid">
      {Array.from({ length: 36 }, (_, i) => {
        const val = i + 2
        const prime = isPrime(val)
        const dividesN = n % val === 0
        return <button
          key={val}
          type="button"
          className={`dm-sieve-cell${prime ? ' prime' : ''}${dividesN ? ' divisor' : ''}${val === n ? ' active' : ''}`}
          onClick={() => setN(val)}
        >
          {val}
        </button>
      })}
    </div>
    <Working rows={[
      ['Division Algorithm n = d·q + r', `${n} = ${d} × ${q} + ${r}`, `Quotient q = ${q}, Remainder r = ${r} (0 ≤ ${r} < ${d})`],
      ['Prime factorization (FTA)', `n = ${n}`, `${factorStr}  (${isPrime(n) ? 'PRIME' : 'COMPOSITE'})`],
      ['Divisor count τ(n) & sum σ(n)', `τ(${n}) = ${factors.map(([, e]) => `(${e}+1)`).join('·') || '1'} = ${divisorCount(n)}`, `σ(${n}) = ${divisorSum(n)}`],
    ]} />
  </div>
}

export function EuclidBezoutFig() {
  const [a, setA] = useState(34)
  const [b, setB] = useState(13)
  const steps = euclidSteps(a, b)
  const [g, x, y] = extGcd(a, b)
  const l = lcm(a, b)

  return <div className="qm-fig-body">
    <Slider label="a" value={a} min={2} max={80} step={1} onChange={setA} />
    <Slider label="b" value={b} min={1} max={60} step={1} onChange={setB} />
    <table className="qm-mathcode dm-worked-table">
      <thead>
        <tr><th>Step</th><th>Division (a = b·q + r)</th><th>GCD Invariant</th></tr>
      </thead>
      <tbody>
        {steps.map((s, i) => (
          <tr key={i}>
            <td className="dm-step-badge">{i + 1}</td>
            <td className="mono">{s.a} = {s.b} × {s.q} + <b>{s.r}</b></td>
            <td className="mono">gcd({s.a}, {s.b}) = gcd({s.b}, {s.r})</td>
          </tr>
        ))}
      </tbody>
    </table>
    <Working rows={[
      ['Greatest Common Divisor gcd(a, b)', `gcd(${a}, ${b})`, `${g} (${g === 1 ? 'Coprime / Relatively prime ✓' : 'Share factor > 1'})`],
      ['Bézout’s Identity a·x + b·y = gcd(a,b)', `${a}·(${x}) + ${b}·(${y}) = ${a * x + b * y}`, `x = ${x}, y = ${y}`],
      ['Least Common Multiple lcm(a, b)', `(${a} × ${b}) / ${g}`, `${l}  (check: gcd × lcm = ${g * l} = ${a * b})`],
    ]} />
  </div>
}

export function ModClockInverseFig() {
  const [m, setM] = useState(12)
  const [a, setA] = useState(5)
  const inv = modInverse(a, m)
  const residues = Array.from({ length: m }, (_, x) => ({
    x,
    prod: mod(a * x, m),
  }))

  return <div className="qm-fig-body">
    <Slider label="Modulus m" value={m} min={3} max={17} step={1} onChange={setM} />
    <Slider label="Multiplier a" value={a} min={1} max={16} step={1} onChange={setA} />
    <div className="dm-clock-strip">
      {residues.map(({ x, prod }) => (
        <span key={x} className={`dm-clock-pill${prod === 1 ? ' unit' : prod === 0 && x !== 0 ? ' zero-div' : ''}`}>
          <small>{a}·{x} ≡</small> <b>{prod}</b>
        </span>
      ))}
    </div>
    <Working rows={[
      ['Residue a mod m', `${a} mod ${m}`, String(mod(a, m))],
      ['Multiplicative inverse a⁻¹ mod m', inv !== null ? `${a} × ${inv} = ${a * inv} ≡ 1 (mod ${m})` : `gcd(${a}, ${m}) > 1 — no inverse exists!`, inv !== null ? `a⁻¹ ≡ ${inv} (mod ${m})` : 'None (Zero divisor)'],
      ['Units count φ(m)', `Invertible residues in ℤ_${m}`, `φ(${m}) = ${totient(m)}`],
    ]} />
  </div>
}

export function ChineseRemainderFig() {
  const [r1, setR1] = useState(2)
  const [r2, setR2] = useState(3)
  const m1 = 3, m2 = 5
  const M = m1 * m2
  const sol = crtSolve([r1, r2], [m1, m2])
  const [p, setP] = useState(7)
  const [base, setBase] = useState(3)

  return <div className="qm-fig-body">
    <Slider label="x mod 3 = r₁" value={r1} min={0} max={2} step={1} onChange={setR1} />
    <Slider label="x mod 5 = r₂" value={r2} min={0} max={4} step={1} onChange={setR2} />
    <div className="dm-crt-grid">
      {Array.from({ length: M }, (_, x) => {
        const hit = x === sol
        return <span key={x} className={`dm-crt-cell${hit ? ' hit' : ''}`}>
          <b>x = {x}</b>
          <small>({x % m1}, {x % m2})</small>
        </span>
      })}
    </div>
    <div className="qm-buttons">
      {[5, 7, 11, 13].map(pr => (
        <button key={pr} className={p === pr ? 'qm-primary' : ''} onClick={() => setP(pr)}>Prime p = {pr}</button>
      ))}
      {[2, 3, 4, 5].map(b => (
        <button key={b} className={base === b ? 'qm-primary' : ''} onClick={() => setBase(b)}>Base a = {b}</button>
      ))}
    </div>
    <Working rows={[
      ['CRT System (mod 3, mod 5)', `x ≡ ${r1} (mod 3) and x ≡ ${r2} (mod 5)`, `Unique x ≡ ${sol} (mod 15)`],
      ['Fermat’s Little Theorem a^(p−1) mod p', `${base}^(${p}−1) = ${base}^${p - 1} mod ${p}`, `${modPow(base, p - 1, p)} (since gcd(${base}, ${p}) = 1)`],
    ]} />
  </div>
}

const RSA_KEYPAIRS = [
  { label: 'p=5, q=11, e=3 (N=55, φ=40, d=27)', p: 5, q: 11, e: 3 },
  { label: 'p=3, q=11, e=7 (N=33, φ=20, d=3)', p: 3, q: 11, e: 7 },
  { label: 'p=7, q=11, e=13 (N=77, φ=60, d=37)', p: 7, q: 11, e: 13 },
]

export function RsaWorkbenchFig() {
  const [kpIdx, setKpIdx] = useState(0)
  const [msg, setMsg] = useState(7)
  const kp = RSA_KEYPAIRS[kpIdx]
  const res = rsaDemo(kp.p, kp.q, kp.e, Math.min(msg, kp.p * kp.q - 1))

  return <div className="qm-fig-body">
    <div className="qm-buttons">
      {RSA_KEYPAIRS.map((k, i) => (
        <button key={i} className={kpIdx === i ? 'qm-primary' : ''} onClick={() => setKpIdx(i)}>{k.label}</button>
      ))}
    </div>
    <Slider label="Plaintext message M" value={res.msg} min={2} max={Math.min(32, res.N - 1)} step={1} onChange={setMsg} />
    <Working rows={[
      ['1. Key Generation', `N = ${kp.p}×${kp.q} = ${res.N}, φ(N) = (${kp.p}−1)(${kp.q}−1) = ${res.phi}`, `Public (e=${res.e}, N=${res.N}) | Private d = ${res.e}⁻¹ mod ${res.phi} = ${res.d}`],
      ['2. Encryption C = M^e mod N', `${res.msg}^${res.e} mod ${res.N}`, `Ciphertext C = ${res.cipher}`],
      ['3. Decryption M = C^d mod N', `${res.cipher}^${res.d} mod ${res.N}`, `Recovered M = ${res.plain} ✓`],
    ]} />
  </div>
}
