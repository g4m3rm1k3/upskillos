import { useMemo, useState } from 'react'
import * as T from '../engine/tables.js'
import * as C from '../engine/cleaning.js'
import * as S from '../engine/summary.js'
import * as P from '../engine/patterns.js'
import * as M from '../engine/samples.js'
import { ORDERS_CSV, CATALOGUE_CSV, DAYS_CSV, DELIVERIES_CSV, FAR_TOWNS, Rng } from '../engine/data.js'

const f = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const money = x => (Number.isFinite(x) ? `£${x.toFixed(2)}` : '–')
const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
const Toggle = ({ options, value, onChange }) => <div className="qm-fig-controls">{options.map(([id, label]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>)}</div>
const BLUE = '#3f5bb5', RED = '#b0413e', GREEN = '#1f6f68', GREY = '#9aa3b2'

let cleanCache = null
const clean = () => (cleanCache ??= C.cleanOrders(T.readCsv(ORDERS_CSV()), Object.fromEntries(T.readCsv(CATALOGUE_CSV()).map(r => [r.item, T.toPence(r.list_price)]))))
const priced = () => clean().filter(r => r.price !== null).map(r => ({ ...r, price: r.price / 100 }))
const prices = () => priced().map(r => r.price)
const lights = () => priced().filter(r => r.item === 'Lights, front and back').map(r => r.price)

// A histogram of values in `count` equal bins from lo to hi, drawn in a W × H box; `curve` (optional) is
// an expected count at x, drawn as a line over it.
function Histogram({ values, lo, hi, count = 30, curve, marks = [], H = 170, label }) {
  const W = 440, width = (hi - lo) / count
  const bins = Array(count).fill(0)
  for (const v of values) { const k = Math.floor((v - lo) / width); if (k >= 0 && k < count) bins[k]++ }
  const xs = Array.from({ length: 121 }, (_, k) => lo + ((hi - lo) * k) / 120)
  const top = Math.max(1, ...bins, ...(curve ? xs.map(curve) : [0]))
  const X = v => 10 + (W - 20) * (v - lo) / ((hi - lo) || 1), Y = c => H - 18 - (H - 30) * c / top
  return <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
    {bins.map((c, k) => <rect key={k} x={X(lo + k * width) + 0.5} width={Math.max(0.5, X(lo + width) - X(lo) - 1)} y={Y(c)} height={H - 18 - Y(c)} fill={BLUE} fillOpacity=".6" />)}
    {curve && <polyline fill="none" stroke={RED} strokeWidth="2" points={xs.map(x => `${X(x)},${Y(curve(x))}`).join(' ')} />}
    {marks.map(([v, colour], i) => Number.isFinite(v) && <line key={i} x1={X(v)} y1="6" x2={X(v)} y2={H - 18} stroke={colour} strokeWidth="2" strokeDasharray="5 3" />)}
    <text className="qm-tick" x="10" y={H - 4}>{f(lo, 1)}</text><text className="qm-tick" x={W - 50} y={H - 4}>{f(hi, 1)}</text>
  </svg>
}

// 6.1: a sample with or without replacement, its mean against the population's.
export function SampleDrawer() {
  const rows = useMemo(priced, []), mu = S.mean(rows.map(r => r.price))
  const [k, setK] = useState(20), [withR, setWithR] = useState('without'), [seed, setSeed] = useState(1)
  const sample = withR === 'with' ? M.sampleWith(rows, k, seed) : M.sampleWithout(rows, k, seed)
  const ids = sample.map(r => r.order_id), repeats = ids.length - new Set(ids).size
  return <div className="qm-fig">
    <Toggle value={withR} onChange={setWithR} options={[['without', 'Without replacement'], ['with', 'With replacement']]} />
    <Slider label="Sample size k" value={k} min={1} max={382} onChange={setK} />
    <div className="qm-fig-controls"><button onClick={() => setSeed(s => s + 1)}>Draw another sample (seed {seed})</button></div>
    <p className="qm-small">Sample mean (a statistic): <b>{money(S.mean(sample.map(r => r.price)))}</b> · population mean (the parameter): <b>{money(mu)}</b> · bikes in the sample: {sample.filter(r => r.item === 'Bike').length} · rows drawn twice or more: <b>{repeats}</b></p>
    <p className="qm-small mono">{ids.slice(0, 40).join(' ')}{ids.length > 40 ? ` … (${ids.length - 40} more)` : ''}</p>
  </div>
}

// 6.2: the binomial's chances against simulated samples.
export function BinomialExplorer() {
  const [n, setN] = useState(20), [p, setP] = useState(0.4675)
  const simulated = useMemo(() => {
    const rng = new Rng(3), counts = Array(n + 1).fill(0)
    for (let r = 0; r < 2000; r++) { let k = 0; for (let i = 0; i < n; i++) if (rng.random() < p) k++; counts[k]++ }
    return counts.map(c => c / 2000)
  }, [n, p])
  const theory = Array.from({ length: n + 1 }, (_, k) => M.binomialPmf(k, n, p))
  const W = 440, H = 170, top = Math.max(...theory, ...simulated, 1e-9), X = k => 20 + (W - 40) * (k + 0.5) / (n + 1), Y = v => H - 18 - (H - 30) * v / top
  return <div className="qm-fig">
    <Slider label="n tries" value={n} min={1} max={60} onChange={setN} />
    <Slider label="p, chance of success" value={p} min={0} max={1} step={0.0025} onChange={setP} format={v => v.toFixed(4)} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Binomial chances">
      {theory.map((v, k) => <rect key={k} x={X(k) - (W - 40) / (n + 1) / 2 + 1} width={Math.max(1, (W - 40) / (n + 1) - 2)} y={Y(v)} height={H - 18 - Y(v)} fill={BLUE} fillOpacity=".55" />)}
      {simulated.map((v, k) => <circle key={k} cx={X(k)} cy={Y(v)} r="3" fill={RED} />)}
    </svg>
    <p className="qm-small">mean np = <b>{f(n * p, 2)}</b> · sd √(np(1 − p)) = <b>{f(Math.sqrt(n * p * (1 - p)), 3)}</b> · most likely count: <b>{theory.indexOf(Math.max(...theory))}</b></p>
  </div>
}

// 6.4: a thousand sample means, their spread against σ/√n.
export function SamplingDistribution() {
  const pop = useMemo(prices, []), sigma = S.std(pop, false), mu = S.mean(pop)
  const [n, setN] = useState(30)
  const means = useMemo(() => M.sampleMeans(pop, n, 1000, 21), [pop, n])
  return <div className="qm-fig">
    <Slider label="n, the size of each sample" value={n} min={1} max={200} onChange={setN} />
    <Histogram values={means} lo={0} hi={Math.max(200, mu + 4 * sigma / Math.sqrt(n))} marks={[[mu, RED]]} label="Sample means" />
    <p className="qm-small">sd of the 1,000 means: <b>{money(S.std(means))}</b> · σ/√n = {money(sigma)} / √{n} = <b>{money(sigma / Math.sqrt(n))}</b> · the red line is the population mean {money(mu)}</p>
  </div>
}

// 6.5: the means of samples from four populations, with the normal curve the theorem predicts.
const POPULATIONS = { prices: 'All prices', lights: 'The lights', uniform: 'Uniform 0–1', heavy: 'Heavy-tailed 1/u' }
export function CltExplorer() {
  const [which, setWhich] = useState('prices'), [n, setN] = useState(30)
  const pop = useMemo(() => (which === 'prices' ? prices() : which === 'lights' ? lights() : which === 'uniform' ? Array.from({ length: 1000 }, (_, k) => (k + 0.5) / 1000) : M.heavyTailed(2000, 51)), [which])
  const means = useMemo(() => M.sampleMeans(pop, n, 1000, 21), [pop, n])
  const mu = S.mean(pop), se = S.std(pop, false) / Math.sqrt(n)
  const lo = which === 'heavy' ? 0 : Math.max(Math.min(...pop), mu - 4.5 * se), hi = which === 'heavy' ? Math.max(20, S.quantile(means, 0.98)) : mu + 4.5 * se, width = (hi - lo) / 30
  return <div className="qm-fig">
    <Toggle value={which} onChange={setWhich} options={Object.entries(POPULATIONS)} />
    <Slider label="n" value={n} min={1} max={200} onChange={setN} />
    <Histogram values={means} lo={lo} hi={hi} curve={x => 1000 * width * M.normalPdf(x, mu, se || 1e-9)} label="Sample means and the normal curve" />
    <p className="qm-small">skewness of the population <b>{f(M.skewness(pop), 2)}</b> · of the 1,000 means <b>{f(M.skewness(means), 2)}</b> · γ/√n = {f(M.skewness(pop) / Math.sqrt(n), 2)}</p>
    <p className="qm-hint">{which === 'heavy' ? 'These 2,000 values have a finite mean only because there are 2,000 of them; the population they come from has none. The curve fits badly at any n.' : which === 'uniform' ? 'A flat population: by n = 12 the means are already very close to the bell (the generator’s noise uses exactly that).' : 'The more skewed the population, the larger n must be before the bell fits.'}</p>
  </div>
}

// 6.5: running means of a heavy-tailed stream and of the prices.
export function HeavyTail() {
  const heavy = useMemo(() => S.runningMean(M.heavyTailed(100000, 51)), [])
  const shop = useMemo(() => S.runningMean(M.sampleWith(prices(), 100000, 52)), [])
  const [series, setSeries] = useState('both')
  const marks = Array.from({ length: 101 }, (_, k) => Math.round(10 ** (1 + 4 * k / 100)) - 1)
  const W = 440, H = 190, top = Math.max(...marks.map(k => heavy[k]), ...marks.map(k => shop[k]))
  const X = k => 30 + (W - 40) * (Math.log10(k + 1) - 1) / 4, Y = v => H - 20 - (H - 30) * v / top
  const line = run => marks.map(k => `${X(k)},${Y(run[k])}`).join(' ')
  return <div className="qm-fig">
    <Toggle value={series} onChange={setSeries} options={[['both', 'Both'], ['heavy', 'Heavy-tailed'], ['shop', 'The shop’s prices']]} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Running means">
      {series !== 'shop' && <polyline fill="none" stroke={RED} strokeWidth="2" points={line(heavy)} />}
      {series !== 'heavy' && <polyline fill="none" stroke={BLUE} strokeWidth="2" points={line(shop)} />}
      {[10, 100, 1000, 10000, 100000].map(k => <text key={k} className="qm-tick" x={X(k - 1)} y={H - 4} textAnchor={k === 100000 ? 'end' : 'middle'}>{k.toLocaleString('en-GB')}</text>)}
    </svg>
    <p className="qm-small">After 10, 100, 1,000, 10,000, 100,000 values · heavy-tailed: <b>{[10, 100, 1000, 10000, 100000].map(k => f(heavy[k - 1], 1)).join(', ')}</b> · prices: <b>{[10, 100, 1000, 10000, 100000].map(k => f(shop[k - 1], 1)).join(', ')}</b></p>
  </div>
}

// 6.6: a hundred intervals; the misses in red.
export function CoverageRuns() {
  const [which, setWhich] = useState('prices'), [n, setN] = useState(10), [seed, setSeed] = useState(31)
  const pop = useMemo(() => (which === 'prices' ? prices() : lights()), [which])
  const truth = S.mean(pop)
  const intervals = useMemo(() => { const rng = new Rng(seed); return Array.from({ length: 100 }, () => M.meanInterval(Array.from({ length: n }, () => pop[rng.below(pop.length)]))) }, [pop, n, seed])
  const lo = Math.min(...intervals.map(i => i[0]).filter(Number.isFinite), truth), hi = Math.max(...intervals.map(i => i[1]).filter(Number.isFinite), truth)
  const W = 440, H = 220, X = v => 10 + (W - 20) * (v - lo) / ((hi - lo) || 1)
  const hits = intervals.filter(([a, b]) => a <= truth && truth <= b).length
  return <div className="qm-fig">
    <Toggle value={which} onChange={setWhich} options={[['prices', 'All prices'], ['lights', 'The lights']]} />
    <Slider label="n" value={n} min={2} max={200} onChange={setN} />
    <div className="qm-fig-controls"><button onClick={() => setSeed(s => s + 1)}>A hundred new samples</button></div>
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A hundred intervals">
      {intervals.map(([a, b], k) => { const hit = a <= truth && truth <= b; return <line key={k} x1={X(a)} x2={X(b)} y1={8 + k * 2.05} y2={8 + k * 2.05} stroke={hit ? GREY : RED} strokeWidth="1.5" /> })}
      <line x1={X(truth)} x2={X(truth)} y1="4" y2={H - 4} stroke={BLUE} strokeWidth="2" />
    </svg>
    <p className="qm-small"><b>{hits}</b> of 100 intervals hold the true mean {money(truth)}.</p>
  </div>
}

// 6.7: bootstrap means or medians of the lights' prices.
export function BootstrapView() {
  const values = useMemo(lights, [])
  const [stat, setStat] = useState('median'), [repeats, setRepeats] = useState(2000)
  const stats = useMemo(() => M.bootstrap(values, stat, repeats, 41), [values, stat, repeats])
  const [a, b] = M.percentileInterval(stats), formula = M.meanInterval(values)
  return <div className="qm-fig">
    <Toggle value={stat} onChange={setStat} options={[['mean', 'Mean'], ['median', 'Median']]} />
    <Slider label="Resamples" value={repeats} min={50} max={4000} step={50} onChange={setRepeats} />
    <Histogram values={stats} lo={24} hi={26.5} count={50} marks={[[a, RED], [b, RED]]} label="Bootstrap statistics" />
    <p className="qm-small">The sample’s {stat}: <b>{money(S[stat](values))}</b> · bootstrap 95%: <b>{money(a)} to {money(b)}</b> · sd of the resampled {stat}s {f(S.std(stats), 4)}{stat === 'mean' ? <> · the formula’s interval: {money(formula[0])} to {money(formula[1])}</> : ''}</p>
  </div>
}

// 6.8: a stream of 20 into a reservoir of 5, step by step.
export function ReservoirRun() {
  const [step, setStep] = useState(20), [seed, setSeed] = useState(61)
  const stream = Array.from({ length: 20 }, (_, i) => i + 1)
  const kept = M.reservoir(stream.slice(0, step), 5, seed)
  const shares = useMemo(() => stream.map(i => M.reservoirShare(20, 5, i, 1000, 100 + i)), []) // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="qm-fig">
    <Slider label="Items arrived" value={step} min={1} max={20} onChange={setStep} />
    <div className="qm-fig-controls"><button onClick={() => setSeed(s => s + 1)}>Another run (seed {seed})</button></div>
    <p className="qm-small">Kept: <b className="mono">[{kept.join(', ')}]</b>{step > 5 ? <> · item {step} was kept on arrival with chance 5/{step} = {f(5 / step, 3)}</> : ''}</p>
    <svg className="qm-plot" viewBox="0 0 440 120" role="img" aria-label="Each item's share">
      {shares.map((s, i) => <g key={i}><rect x={14 + i * 21} y={100 - 300 * s} width="16" height={300 * s} fill={BLUE} fillOpacity=".7" /><text className="qm-tick" x={16 + i * 21} y="114">{i + 1}</text></g>)}
      <line x1="10" x2="436" y1={100 - 300 * 0.25} y2={100 - 300 * 0.25} stroke={RED} strokeDasharray="4 3" />
    </svg>
    <p className="qm-hint">The bars: how often each item was kept in 1,000 runs. The dashed line is 5/20 = 0.25.</p>
  </div>
}

// 6.9: simple against stratified samples, and a biased one.
export function StrataLab() {
  const rows = useMemo(priced, []), mu = S.mean(rows.map(r => r.price))
  const [k, setK] = useState(40), [mode, setMode] = useState('compare')
  const web = useMemo(() => rows.filter(r => r.channel === 'web'), [rows])
  const results = useMemo(() => {
    const rng = new Rng(71), simple = [], strata = [], biased = []
    for (let r = 0; r < 300; r++) {
      simple.push(S.mean(M.sampleWithout(rows.map(x => x.price), k, rng.below(2 ** 31))))
      strata.push(S.mean(M.stratifiedSample(rows, 'item', k, rng.below(2 ** 31)).map(x => x.price)))
      biased.push(S.mean(M.sampleWithout(web.map(x => x.price), Math.min(k, web.length), rng.below(2 ** 31))))
    }
    return { simple, strata, biased }
  }, [rows, web, k])
  const lo = 0, hi = 160
  return <div className="qm-fig">
    <Toggle value={mode} onChange={setMode} options={[['compare', 'Simple and stratified'], ['bias', 'Web customers only']]} />
    <Slider label="Sample size" value={k} min={10} max={200} step={10} onChange={setK} />
    {mode === 'compare' ? <>
      <Histogram values={results.simple} lo={lo} hi={hi} marks={[[mu, RED]]} H={120} label="Simple random samples" />
      <Histogram values={results.strata} lo={lo} hi={hi} marks={[[mu, RED]]} H={120} label="Stratified samples" />
      <p className="qm-small">Top: simple, sd of the means <b>{money(S.std(results.simple))}</b>. Bottom: stratified by item, <b>{money(S.std(results.strata))}</b>. Red: the true mean {money(mu)}.</p>
    </> : <>
      <Histogram values={results.biased} lo={lo} hi={hi} marks={[[mu, RED], [S.mean(web.map(r => r.price)), GREEN]]} H={140} label="Samples of web orders" />
      <p className="qm-small">Samples of web orders only: their means centre on <b>{money(S.mean(web.map(r => r.price)))}</b> (green), not {money(mu)} (red), however large the sample.</p>
    </>}
  </div>
}

// 6.10: numbers from earlier lessons with their bootstrap intervals.
export function ErrorBars() {
  const items = useMemo(() => {
    const l = lights(), days = P.numberDays(T.readCsv(DAYS_CSV())), quiet = days.filter(r => r.visits < 9000)
    const towns = Object.fromEntries(clean().map(r => [r.order_id, r.town]))
    const deliveries = T.readCsv(DELIVERIES_CSV()).map(r => ({ ...r, far: FAR_TOWNS.includes(towns[r.order_id]) }))
    const onTime = (c, far) => deliveries.filter(r => r.courier === c && r.far === far).map(r => (r.on_time === 'yes' ? 1 : 0))
    const leeds = clean().map(r => (r.town === 'Leeds' ? 1 : 0))
    const row = (label, value, stats, scale = 1, unit = '') => ({ label, value: value * scale, ci: M.percentileInterval(stats).map(v => v * scale), unit })
    return [
      row('Lights: mean price (2.2)', S.mean(l), M.bootstrap(l, 'mean', 2000, 41), 1, '£'),
      row('Lights: median price (2.2)', S.median(l), M.bootstrap(l, 'median', 2000, 41), 1, '£'),
      row('Share of orders from Leeds (3.1)', S.mean(leeds), M.bootstrap(leeds, 'mean', 2000, 85), 100, '%'),
      row('r, temperature and riders (5.2)', P.correlation(days.map(r => r.high_c), days.map(r => r.riders)), M.bootstrapPairs(days.map(r => r.high_c), days.map(r => r.riders), P.correlation, 2000, 83)),
      row('Visits per degree (5.6)', P.growthPerUnit(quiet.map(r => r.high_c), quiet.map(r => r.visits)), M.bootstrapPairs(quiet.map(r => r.high_c), quiet.map(r => r.visits), P.growthPerUnit, 2000, 84), 100, '%'),
      row('Northern − Swift, far towns (5.9)', S.mean(onTime('Northern', true)) - S.mean(onTime('Swift', true)), M.bootstrapDifference(onTime('Northern', true), onTime('Swift', true), 2000, 82), 100, ' pts'),
      row('Northern − Swift, near towns (5.9)', S.mean(onTime('Northern', false)) - S.mean(onTime('Swift', false)), M.bootstrapDifference(onTime('Northern', false), onTime('Swift', false), 2000, 81), 100, ' pts'),
    ]
  }, [])
  const [which, setWhich] = useState(0)
  // A difference is shown with 0 in view (could it be nothing?); anything else is framed round its interval.
  const it = items[which], diff = it.unit === ' pts', pad = (it.ci[1] - it.ci[0]) * 0.5
  const lo = diff ? Math.min(it.ci[0], 0) - pad : it.ci[0] - pad, hi = diff ? Math.max(it.ci[1], 0) + pad : it.ci[1] + pad
  const W = 440, X = v => 20 + (W - 40) * (v - lo) / ((hi - lo) || 1)
  const shown = (x, v) => (x.unit === '£' ? money(v) : x.unit === '' ? f(v, 3) : `${f(v, x.unit === '%' ? 2 : 1)}${x.unit}`)
  return <div className="qm-fig">
    <label className="ds-select">Number <select value={which} onChange={e => setWhich(Number(e.target.value))}>{items.map((x, i) => <option key={i} value={i}>{x.label}</option>)}</select></label>
    <svg className="qm-plot" viewBox={`0 0 ${W} 70`} role="img" aria-label="The number and its interval">
      <line x1={X(it.ci[0])} x2={X(it.ci[1])} y1="35" y2="35" stroke={BLUE} strokeWidth="3" />
      <line x1={X(it.ci[0])} x2={X(it.ci[0])} y1="27" y2="43" stroke={BLUE} strokeWidth="2" /><line x1={X(it.ci[1])} x2={X(it.ci[1])} y1="27" y2="43" stroke={BLUE} strokeWidth="2" />
      <circle cx={X(it.value)} cy="35" r="5" fill={RED} />
      <text className="qm-tick" x={X(it.ci[0])} y="60" textAnchor="middle">{shown(it, it.ci[0])}</text><text className="qm-tick" x={X(it.ci[1])} y="60" textAnchor="middle">{shown(it, it.ci[1])}</text>
      {diff && <><line x1={X(0)} x2={X(0)} y1="10" y2="50" stroke={GREY} strokeDasharray="3 3" /><text className="qm-tick" x={X(0) + 3} y="12">0</text></>}
    </svg>
    <table className="qm-log"><thead><tr><th>Number</th><th>Value</th><th>95% bootstrap interval</th></tr></thead><tbody>
      {items.map((x, i) => <tr key={i} className={i === which ? 'pass' : ''}><td>{x.label}</td><td className="mono">{shown(x, x.value)}</td><td className="mono">{shown(x, x.ci[0])} to {shown(x, x.ci[1])}</td></tr>)}
    </tbody></table>
  </div>
}
