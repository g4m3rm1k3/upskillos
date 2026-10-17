import { useMemo, useState } from 'react'
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as S from '../engine/summary.js'
import * as Q from '../engine/significance.js'
import { ORDERS_CSV, CATALOGUE_CSV, TRIAL_CSV, Rng } from '../engine/data.js'

const f = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
const Toggle = ({ options, value, onChange }) => <div className="qm-fig-controls">{options.map(([id, label]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>)}</div>
const BLUE = '#3f5bb5', RED = '#b0413e', GREEN = '#1f6f68', GREY = '#9aa3b2'

let cleanCache = null
const clean = () => (cleanCache ??= C.cleanOrders(T.readCsv(ORDERS_CSV()), Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))))
const lights = channel => clean().filter(r => r.price !== null && r.item === 'Lights, front and back' && r.channel === channel).map(r => r.price / 100)

// Counts of values in equal bins from lo to hi, drawn as bars; marks: vertical lines [x, colour].
function Bars({ values, lo, hi, count = 40, marks = [], H = 170, label, colour = () => BLUE }) {
  const W = 440, width = (hi - lo) / count, bins = Array(count).fill(0)
  for (const v of values) { const k = Math.floor((v - lo) / width); if (k >= 0 && k < count) bins[k]++ }
  const top = Math.max(1, ...bins), X = v => 10 + (W - 20) * (v - lo) / (hi - lo), Y = c => H - 18 - (H - 30) * c / top
  return <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
    {bins.map((c, k) => <rect key={k} x={X(lo + k * width) + 0.5} width={Math.max(0.5, X(lo + width) - X(lo) - 1)} y={Y(c)} height={H - 18 - Y(c)} fill={colour(lo + (k + 0.5) * width)} fillOpacity=".65" />)}
    {marks.map(([v, c], i) => <line key={i} x1={X(v)} x2={X(v)} y1="6" y2={H - 18} stroke={c} strokeWidth="2" />)}
    <text className="qm-tick" x="10" y={H - 4}>{f(lo, 2)}</text><text className="qm-tick" x={W - 10} y={H - 4} textAnchor="end">{f(hi, 2)}</text>
  </svg>
}

// 7.1: shuffle the labels, one shuffle or hundreds at a time; the null distribution builds up.
export function ShuffleTest() {
  const web = useMemo(() => lights('web'), []), shop = useMemo(() => lights('shop'), [])
  const observed = S.mean(web) - S.mean(shop)
  const all = useMemo(() => Q.permutationDiffs(web, shop, 2000, 3), [web, shop])
  const [n, setN] = useState(100)
  const diffs = all.slice(0, n)
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <button onClick={() => setN(k => Math.min(2000, k + 1))}>One more shuffle</button>
      <button onClick={() => setN(k => Math.min(2000, k + 100))}>100 more</button>
      <button onClick={() => setN(2000)}>All 2,000</button>
      <button onClick={() => setN(1)}>Start again</button>
    </div>
    <Bars values={diffs} lo={-1} hi={1} marks={[[observed, RED], [-observed, RED]]} label="Differences after shuffling" colour={x => (Math.abs(x) >= Math.abs(observed) ? RED : BLUE)} />
    <p className="qm-small">Shuffles: <b>{n}</b> · the last one: web minus shop = <b>£{f(diffs[n - 1], 3)}</b> · real difference: <b style={{ color: RED }}>£{f(observed, 3)}</b> · as far or further: {diffs.filter(d => Math.abs(d) >= Math.abs(observed) - 1e-12).length} · p = <b>{f(Q.permutationP(diffs, observed), 3)}</b></p>
  </div>
}

// 7.3: p-values of simulated tests, with and without a real difference.
export function PValueRain() {
  const [lift, setLift] = useState(0), [n, setN] = useState(500)
  const ps = useMemo(() => Q.simulatedPvalues(n, 0.2, 0.2 + lift, 2000, 5), [n, lift])
  const below = ps.filter(p => p < 0.05).length / ps.length
  return <div className="qm-fig">
    <Slider label="Real difference (B’s rate − A’s, from 20%)" value={lift} min={0} max={0.08} step={0.005} onChange={setLift} format={v => `${(100 * v).toFixed(1)} points`} />
    <Slider label="Visitors per page" value={n} min={50} max={2000} step={50} onChange={setN} />
    <Bars values={ps} lo={0} hi={1} count={20} marks={[[0.05, RED]]} label="p-values" colour={x => (x < 0.05 ? RED : BLUE)} />
    <p className="qm-small">Share below 0.05: <b>{(100 * below).toFixed(1)}%</b> · {lift === 0 ? 'every one of them a false positive: about 5%, as promised' : 'the test’s power at this size'}</p>
  </div>
}

// 7.5: the t curve against the normal, and the 95% critical values.
export function TvsNormal() {
  const [df, setDf] = useState(4)
  const W = 440, H = 190, xs = Array.from({ length: 161 }, (_, k) => -5 + k / 16)
  const X = v => 10 + (W - 20) * (v + 5) / 10, Y = v => H - 20 - (H - 30) * v / 0.42
  const normal = v => Math.exp(-v * v / 2) / Math.sqrt(2 * Math.PI)
  const tc = useMemo(() => Q.tCritical(df), [df])
  const line = g => xs.map(x => `${X(x)},${Y(g(x))}`).join(' ')
  return <div className="qm-fig">
    <Slider label="Degrees of freedom ν" value={df} min={1} max={60} onChange={setDf} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="The t curve and the normal">
      <polyline fill="none" stroke={GREY} strokeWidth="2" points={line(normal)} />
      <polyline fill="none" stroke={RED} strokeWidth="2" points={line(x => Q.tDensity(x, df))} />
      {[-tc, tc].map((v, i) => <line key={i} x1={X(v)} x2={X(v)} y1="10" y2={H - 20} stroke={RED} strokeDasharray="4 3" />)}
      {[-1.96, 1.96].map((v, i) => <line key={`n${i}`} x1={X(v)} x2={X(v)} y1="10" y2={H - 20} stroke={GREY} strokeDasharray="2 3" />)}
      {[-4, -2, 0, 2, 4].map(v => <text key={v} className="qm-tick" x={X(v)} y={H - 6} textAnchor="middle">{v}</text>)}
    </svg>
    <p className="qm-small"><span style={{ color: RED }}>t, ν = {df}</span>: 5% beyond ±<b>{f(tc, 3)}</b> · <span style={{ color: GREY }}>normal</span>: beyond ±1.960 · beyond ±1.96 the t curve has <b>{(100 * Q.tTwoSided(1.96, df)).toFixed(1)}%</b></p>
  </div>
}

// 7.6: power against the group size, by formula and by simulation.
export function PowerCurve() {
  const [pair, setPair] = useState('couriers')
  const [a, b, maxN] = pair === 'couriers' ? [0.85, 0.97, 200] : [0.2, 0.22, 12000]
  const [n, setN] = useState(14)
  const size = Math.min(n, maxN)
  const zb = (n2) => Math.abs(b - a) / Math.sqrt((a * (1 - a) + b * (1 - b)) / n2) - 1.96
  const formula = n2 => Q.normalCdf(zb(n2))
  const sims = useMemo(() => Array.from({ length: 9 }, (_, k) => { const m = Math.round(maxN * (k + 1) / 10); return [m, Q.simulatedPower(m, a, b, 200, 40 + k)] }), [a, b, maxN])
  const W = 440, H = 180, X = v => 30 + (W - 40) * v / maxN, Y = v => H - 20 - (H - 30) * v
  const xs = Array.from({ length: 101 }, (_, k) => Math.max(2, (maxN * k) / 100))
  return <div className="qm-fig">
    <Toggle value={pair} onChange={p => { setPair(p); setN(p === 'couriers' ? 14 : 6507) }} options={[['couriers', 'Near-town couriers: 85% against 97%'], ['trial', 'Home page: 20% against 22%']]} />
    <Slider label="Per group" value={size} min={2} max={maxN} onChange={setN} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Power against the group size">
      <line x1="30" x2={W - 10} y1={Y(0.8)} y2={Y(0.8)} stroke={GREY} strokeDasharray="4 3" />
      <polyline fill="none" stroke={BLUE} strokeWidth="2" points={xs.map(v => `${X(v)},${Y(formula(v))}`).join(' ')} />
      {sims.map(([m, p]) => <circle key={m} cx={X(m)} cy={Y(p)} r="3.5" fill={RED} />)}
      <line x1={X(size)} x2={X(size)} y1="10" y2={H - 20} stroke="currentColor" strokeDasharray="2 3" />
      <text className="qm-tick" x="4" y={Y(0.8) + 4}>80%</text>
    </svg>
    <p className="qm-small">At {size.toLocaleString('en-GB')} per group: power about <b>{(100 * formula(size)).toFixed(0)}%</b> by the formula · for 80% it needs <b>{Math.ceil(Q.sampleSize(a, b)).toLocaleString('en-GB')}</b> per group · the dots are 200 simulated tests each</p>
  </div>
}

// 7.8: a hundred tests, ten real: what each method calls a discovery.
export function ManyTests() {
  const [method, setMethod] = useState('raw'), [effect, setEffect] = useState(0.8)
  const ps = useMemo(() => Q.manyTests(100, 10, 30, effect, 11), [effect])
  const flags = method === 'raw' ? ps.map(p => p < 0.05) : method === 'bonferroni' ? Q.bonferroni(ps) : Q.benjaminiHochberg(ps)
  const found = flags.filter((x, i) => x && i < 10).length, wrong = flags.filter((x, i) => x && i >= 10).length
  return <div className="qm-fig">
    <Toggle value={method} onChange={setMethod} options={[['raw', 'Every p < 0.05'], ['bonferroni', 'Bonferroni'], ['bh', 'Benjamini–Hochberg']]} />
    <Slider label="Size of the real effects (sd)" value={effect} min={0} max={1.5} step={0.1} onChange={setEffect} format={v => v.toFixed(1)} />
    <div className="ds-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 2 }}>
      {ps.map((p, i) => <span key={i} title={`test ${i + 1}: p = ${p.toFixed(4)}${i < 10 ? ' (real)' : ''}`} style={{ height: 16, borderRadius: 3, background: flags[i] ? (i < 10 ? GREEN : RED) : 'transparent', border: `2px solid ${i < 10 ? GREEN : GREY}` }} />)}
    </div>
    <p className="qm-small">Outlined green: the ten real effects. Filled: reported. <b style={{ color: GREEN }}>{found}</b> real found, <b style={{ color: RED }}>{wrong}</b> false · share of reports that are false: <b>{found + wrong ? `${(100 * wrong / (found + wrong)).toFixed(0)}%` : '–'}</b></p>
  </div>
}

// 7.9: the trial's running z, and A/A tests that wander across the line.
export function Peeking() {
  const [view, setView] = useState('trial')
  const trial = useMemo(() => { const rows = T.readCsv(TRIAL_CSV()); return Q.runningZ(Array.from({ length: 28 }, (_, k) => [rows[2 * k], rows[2 * k + 1]].flatMap(r => [Number(r.visitors), Number(r.clicks)]))) }, [])
  const runs = useMemo(() => {
    const rng = new Rng(9), out = []
    for (let r = 0; r < 60; r++) {
      const c = [0, 0, 0, 0], zs = []
      for (let d = 0; d < 28; d++) { for (let v = 0; v < 100; v++) { const g = rng.below(2); c[2 * g]++; if (rng.random() < 0.2) c[2 * g + 1]++ } zs.push(Q.twoProportionZ(c[1], c[0], c[3], c[2])) }
      out.push(zs)
    }
    return out
  }, [])
  const W = 440, H = 200, X = d => 30 + (W - 40) * d / 27, Y = z => H / 2 - (H / 2 - 12) * z / 4
  const path = zs => zs.map((z, d) => `${X(d)},${Y(Math.max(-4, Math.min(4, z)))}`).join(' ')
  const crossed = runs.filter(zs => zs.some(z => Math.abs(z) > 1.96)).length
  return <div className="qm-fig">
    <Toggle value={view} onChange={setView} options={[['trial', 'The trial (a real difference)'], ['aa', '60 A/A tests (none)']]} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Running z by day">
      {[1.96, -1.96].map(z => <line key={z} x1="30" x2={W - 10} y1={Y(z)} y2={Y(z)} stroke={RED} strokeDasharray="4 3" />)}
      <line x1="30" x2={W - 10} y1={Y(0)} y2={Y(0)} stroke={GREY} />
      {view === 'trial'
        ? <polyline fill="none" stroke={BLUE} strokeWidth="2.5" points={path(trial)} />
        : runs.map((zs, i) => <polyline key={i} fill="none" stroke={zs.some(z => Math.abs(z) > 1.96) ? RED : GREY} strokeOpacity=".55" strokeWidth="1.2" points={path(zs)} />)}
      {[1, 7, 14, 21, 28].map(d => <text key={d} className="qm-tick" x={X(d - 1)} y={H - 2} textAnchor={d === 28 ? 'end' : 'middle'}>day {d}</text>)}
    </svg>
    <p className="qm-small">{view === 'trial'
      ? <>The trial’s z after each day: first beyond 1.96 on day <b>{trial.findIndex(z => Math.abs(z) > 1.96) + 1}</b>, {f(trial[27], 2)} at the end.</>
      : <><b style={{ color: RED }}>{crossed}</b> of 60 A/A tests crossed ±1.96 on some day; {runs.filter(zs => Math.abs(zs[27]) > 1.96).length} were beyond it on day 28.</>}</p>
  </div>
}
