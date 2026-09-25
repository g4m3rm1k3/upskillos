// Figures placed between the paragraphs of Lab 02 (02.1–02.6).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Choice, Check, Radio, Readout, Bars, MiniPlot, Path, Dots, VLine, Label, Table, r } from '../../kit/fig.jsx'
import { generateLog, runPipeline, defaultDecisions, fitLine, fingerprint, broadcastShape } from './engine.js'
import { random, shuffle, mean, median } from '../../kit/math.js'

// ---------- 02.1 ----------
export function MutationDemo() {
  const start = [10, 20, 30, 40]
  const [rows, setRows] = useState(start), [pureCalls, setPureCalls] = useState(0)
  const pureResult = start.slice(1)
  return <div>
    <Controls>
      <button onClick={() => setRows(r2 => r2.slice(1))} disabled={!rows.length}>Call drop_first(rows) — mutates</button>
      <button onClick={() => setPureCalls(c => c + 1)}>Call without_first(rows) — pure</button>
      <button onClick={() => { setRows(start); setPureCalls(0) }}>Reset</button>
    </Controls>
    <Table head={['', 'the caller’s rows after the calls', 'length']} rows={[['mutating: xs.pop(0)', `[${rows.join(', ')}]`, rows.length], [`pure: return xs[1:] (called ${pureCalls}×)`, `[${start.join(', ')}] — returned [${pureResult.join(', ')}]`, start.length]]} label="Mutating versus pure function" />
    <Readout>{rows.length < start.length ? `Each mutating call silently removed another row: ${start.length - rows.length} gone. Run a cell twice and your data changes.` : 'Press the mutating button twice and watch the caller’s list shrink.'} The pure call returns a new list and leaves the original untouched, however often it runs.</Readout>
  </div>
}

export function FillBeforeSplit() {
  const [order, setOrder] = useState('split-first')
  const train = [4, null, 6, 5, null], validation = [30, null, 28]
  const known = order === 'split-first' ? train.filter(v => v !== null) : [...train, ...validation].filter(v => v !== null), fill = mean(known)
  return <div>
    <Controls><Radio name="fillorder" value={order} onChange={setOrder} options={[['split-first', 'split, then learn the fill from training rows'], ['fill-first', 'learn the fill from all rows, then split']]} /></Controls>
    <Table head={['part', 'values (— = missing)', 'after filling']} rows={[['training', train.map(v => v ?? '—').join(', '), train.map(v => r(v ?? fill, 2)).join(', ')], ['validation', validation.map(v => v ?? '—').join(', '), validation.map(v => r(v ?? fill, 2)).join(', ')]]} label="Fill values under two stage orders" />
    <Readout>fill value = mean of [{known.join(', ')}] = <strong>{r(fill, 2)}</strong>. {order === 'split-first' ? 'Validation had no say in it: an honest test.' : 'The large validation values pulled the training fills up: validation leaked into preprocessing.'} Same pure functions, different order, different experiment.</Readout>
  </div>
}

export function SeedAsParameter() {
  const [seed, setSeed] = useState(42), [hidden, setHidden] = useState(false), [runs, setRuns] = useState(0)
  const rowsFor = s => shuffle([...Array(8).keys()], random(s)).slice(0, 2)
  const run1 = rowsFor(seed), run2 = rowsFor(hidden ? seed + 1 + runs : seed)
  return <div>
    <Controls>
      <Slider label="seed" value={seed} min={1} max={60} step={1} onChange={setSeed} digits={0} />
      <Check label="a hidden global seed that other code also uses" checked={hidden} onChange={setHidden} />
      <button onClick={() => setRuns(k => k + 1)}>Rerun</button>
    </Controls>
    <Table head={['run', 'validation rows chosen']} rows={[['first run', run1.join(', ')], ['rerun', run2.join(', ')]]} label="Validation rows chosen in two runs" />
    <Readout>{run1.join() === run2.join() ? 'Identical: the seed is an argument, so the choice is fully determined by it.' : 'Different: something else drew from the same hidden random state between the runs, so the split moved.'}</Readout>
  </div>
}

// ---------- 02.2 ----------
const EXPRS = [
  ['x[0]', [0]], ['x[-1]', [3]], ['x[1:3]', [1, 2]], ['x[[3, 0]]', [3, 0]], ['x[x > 5]', [1, 3]], ['x[(x > 3) & (x < 9)]', [0, 3]], ['x[~(x > 5)]', [0, 2]],
]
export function IndexExplorer() {
  const [k, setK] = useState('4'), x = [4, 9, 2, 7], [expr, picks] = EXPRS[Number(k)]
  const mask = expr.includes('>') || expr.includes('<')
  return <div>
    <Controls><Choice label="expression" value={k} onChange={setK} options={EXPRS.map(([e], i) => [String(i), e])} /></Controls>
    <Table head={['position', '0', '1', '2', '3']} rows={[['x', ...x.map((v, i) => picks.includes(i) ? <strong key={i}>{v} ✓</strong> : v)], ...(mask ? [['mask', ...x.map((_, i) => (picks.includes(i) ? 'True' : 'False'))]] : [])]} label="Selected positions" />
    <Readout>{expr} → <strong>[{picks.map(i => x[i]).join(', ')}]</strong>{expr.startsWith('x[[') ? ' — in the order the index array lists them.' : expr === 'x[1:3]' ? ' — start included, stop excluded.' : mask ? ' — the positions where the mask is True.' : '.'}</Readout>
  </div>
}

export function AxisReduce() {
  const [axis, setAxis] = useState('0'), X = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]
  const res = axis === '0' ? X[0].map((_, j) => mean(X.map(row => row[j]))) : X.map(row => mean(row))
  return <div>
    <Controls><Radio name="axis" value={axis} onChange={setAxis} options={[['0', 'X.mean(axis=0)'], ['1', 'X.mean(axis=1)']]} /></Controls>
    <Table head={['', 'col 0', 'col 1', 'col 2', 'col 3', axis === '1' ? 'row mean' : '']} rows={[...X.map((row, i) => [`row ${i}`, ...row, axis === '1' ? <strong key="m">{r(res[i])}</strong> : '']), ...(axis === '0' ? [['column mean', ...res.map((v, j) => <strong key={j}>{r(v)}</strong>), '']] : [])]} label="Reduction along an axis" />
    <Readout>X has shape (3, 4). axis={axis} disappears: the result has shape ({axis === '0' ? 4 : 3},) — one value per {axis === '0' ? 'column' : 'row'}.</Readout>
  </div>
}

export function BroadcastRule() {
  const shapes = ['(100, 3)', '(3,)', '(5, 1)', '(5,)', '(4, 1)', '(1, 3)', '(4,)']
  const [a, setA] = useState('(100, 3)'), [b, setB] = useState('(3,)')
  const parse = s => s.replace(/[()\s]/g, '').split(',').filter(Boolean).map(Number), A = parse(a), B = parse(b), out = broadcastShape(A, B)
  const n = Math.max(A.length, B.length), pad = s => [...Array(n - s.length).fill('·'), ...s]
  return <div>
    <Controls><Choice label="left" value={a} onChange={setA} options={shapes} /><Choice label="right" value={b} onChange={setB} options={shapes} /></Controls>
    <Table head={['aligned from the right', ...Array.from({ length: n }, (_, i) => `axis ${i}`)]} rows={[['left', ...pad(A)], ['right', ...pad(B)], ['result', ...(out ?? Array(n).fill('✗'))]]} label="Broadcast alignment" />
    <Readout>{out ? <>result shape <strong>({out.join(', ')}{out.length === 1 ? ',' : ''})</strong> — {out.reduce((t, v) => t * v, 1)} numbers.{a === '(5, 1)' && b === '(5,)' ? ' This is the silent bug: 25 differences instead of 5.' : ''}</> : <strong>error: sizes differ and neither is 1.</strong>}</Readout>
  </div>
}

// ---------- 02.3 ----------
export function DtypeTrap() {
  const [na, setNa] = useState(false), raw = ['41.2', '38.0', 'unknown', '52.5', '']
  const parsed = raw.map(v => (v === '' || (na && v === 'unknown') ? null : Number.isFinite(Number(v)) ? Number(v) : v))
  const numeric = parsed.every(v => v === null || typeof v === 'number'), vals = parsed.filter(v => typeof v === 'number')
  return <div>
    <Controls><Check label='read_csv(..., na_values=["unknown"])' checked={na} onChange={setNa} /></Controls>
    <Table head={['raw text', 'read as']} rows={raw.map((v, i) => [v === '' ? '(empty)' : v, parsed[i] === null ? 'NaN' : String(parsed[i])])} label="Parsed duration column" />
    <Readout>dtype: <strong>{numeric ? 'float64' : 'object (text)'}</strong>. {numeric ? `mean() skips NaN: ${r(mean(vals), 2)}.` : 'mean() fails: one word made the whole column text. The empty cell was already treated as missing; “unknown” was not.'}</Readout>
  </div>
}

export function GroupMeans() {
  const [dev3, setDev3] = useState(30), groups = { main: [40, 60], dev: [10, 20, dev3] }
  const gm = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, mean(v)])), all = [...groups.main, ...groups.dev]
  return <div>
    <Controls><Slider label="third dev build (s)" value={dev3} min={0} max={100} step={5} onChange={setDev3} digits={0} /></Controls>
    <Bars items={[{ label: 'main mean', value: gm.main }, { label: 'dev mean', value: gm.dev, color: 'var(--chart-val)' }, { label: 'overall mean', value: mean(all), highlight: true }, { label: 'mean of means', value: (gm.main + gm.dev) / 2, color: 'var(--muted)' }]} digits={2} />
    <Readout>main [40, 60] → {r(gm.main)}; dev [10, 20, {dev3}] → {r(gm.dev)}. Overall mean of all 5 rows = {r(mean(all))}, not the mean of the two group means ({r((gm.main + gm.dev) / 2)}): the groups have different sizes.</Readout>
  </div>
}

// ---------- 02.4 ----------
export function MeanVsMedian() {
  const [big, setBig] = useState(100), xs = [2, 4, 9, big], m = mean(xs), md = median(xs)
  return <div>
    <Controls><Slider label="largest size" value={big} min={10} max={200} step={5} onChange={setBig} digits={0} /></Controls>
    <MiniPlot x={[0, 210]} y={[0, 1]} height={120} yTicks={2} grid={false} xLabel="size (MB)" label={`Mean ${r(m)} and median ${r(md)}`}>{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={xs.map(v => [v, 0.3])} rad={5} />
      <VLine X={X} Y={Y} x={m} y0={0} y1={1} color="var(--chart-val)" dash="" /><Label X={X} Y={Y} x={m} y={0.85} anchor="middle" color="var(--chart-val)">mean</Label>
      <VLine X={X} Y={Y} x={md} y0={0} y1={1} color="var(--chart-model)" dash="" /><Label X={X} Y={Y} x={md} y={0.62} anchor="middle" color="var(--chart-model)">median</Label>
    </>}</MiniPlot>
    <Readout>[2, 4, 9, {big}]: mean = <strong>{r(m, 2)}</strong>, median = (4 + 9)/2 = <strong>{r(md, 2)}</strong>. Move the largest value: the mean follows it; the median does not move.</Readout>
  </div>
}

export function LearnedFill() {
  const [fitOn, setFitOn] = useState('train'), [strategy, setStrategy] = useState('median')
  const raw = useMemo(() => generateLog(), []), res = useMemo(() => runPipeline(raw, { ...defaultDecisions, fitOn, strategy }), [raw, fitOn, strategy])
  const step = res.log.find(l => l.step.startsWith('Impute')), filled = res.train.filter(rw => rw.was_missing).slice(0, 3)
  return <div>
    <Controls><Radio name="fiton" value={fitOn} onChange={setFitOn} options={[['train', 'learn from training rows'], ['all', 'learn from all rows']]} /><Radio name="strategy" value={strategy} onChange={setStrategy} options={[['median', 'median'], ['mean', 'mean']]} /></Controls>
    <Table head={['build id', 'size_mb (filled)', 'was_missing', 'duration_s']} rows={filled.map(rw => [rw.id, r(rw.size_mb, 2), rw.was_missing, rw.duration_s])} label="Filled training rows with indicator" />
    <Readout>{step?.detail} Validation MSE: {r(res.result.validationMSE, 2)}.</Readout>
  </div>
}

// ---------- 02.5 ----------
export function SentinelDescribe() {
  const [asMissing, setAsMissing] = useState(false), d = [30, -1, 50, -1, 40]
  const vals = asMissing ? d.filter(v => v !== -1) : d
  return <div>
    <Controls><Check label="treat −1 as missing" checked={asMissing} onChange={setAsMissing} /></Controls>
    <Table head={['count', 'mean', 'min', 'max']} rows={[[vals.length, r(mean(vals), 2), Math.min(...vals), Math.max(...vals)]]} label="describe() of durations" />
    <Readout>durations [{d.join(', ')}]. {asMissing ? `Three valid rows; mean ${r(mean(vals))}.` : 'min = −1: a negative duration is impossible — the clue that −1 is a code, not a time. The mean 23.6 is wrong.'}</Readout>
  </div>
}

export function UnitOutlier() {
  const [fix, setFix] = useState(false)
  const pts = [[10, 22], [25, 36], [40, 50], [60, 70], [80, 86], [fix ? 40 : 40960, 49]]
  const fitted = fitLine(pts.map(([x, y]) => ({ size_mb: x, duration_s: y }))), xmax = fix ? 100 : 43000
  return <div>
    <Controls><Check label="apply the rule: sizes above 1000 were logged in KB — divide by 1024" checked={fix} onChange={setFix} /></Controls>
    <MiniPlot x={[0, xmax]} y={[0, 110]} xLabel="size_mb" yLabel="duration (s)" label="Fitted line with and without the unit error">{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={pts.map(([x, y], i) => [x, y, 4.5, i === 5 ? '#ef4444' : undefined])} />
      <Path X={X} Y={Y} points={[[0, fitted.b], [xmax, fitted.b + fitted.w * xmax]]} />
    </>}</MiniPlot>
    <Readout>fitted slope w = <strong>{r(fitted.w, 4)}</strong> s/MB. {fix ? 'With the red build back in MB, it sits on the trend.' : 'The red build (40 MB logged as 40960) sits far right; it drags the slope toward zero and squeezes every real build against the axis.'}</Readout>
  </div>
}

export function DuplicateSplit() {
  const [seed, setSeed] = useState(3), rows = ['A', 'B', 'C', 'D', 'E', 'C′']
  const order = shuffle(rows, random(seed)), train = order.slice(0, 4), val = order.slice(4)
  const leaked = (train.includes('C') && val.includes('C′')) || (train.includes('C′') && val.includes('C'))
  return <div>
    <Controls><Slider label="split seed" value={seed} min={1} max={30} step={1} onChange={setSeed} digits={0} /></Controls>
    <Table head={['training', 'validation']} rows={[[train.join(', '), val.join(', ')]]} label="Split with a duplicated row" />
    <Readout>C′ is an exact copy of C. {leaked ? <strong>This split puts one copy on each side: the model is validated on a row it trained on.</strong> : 'This time both copies landed on the same side — try other seeds.'}</Readout>
  </div>
}

// ---------- 02.6 ----------
export function SeededShuffle() {
  const [seed, setSeed] = useState(42)
  const a = shuffle([...Array(10).keys()], random(seed)), b = shuffle([...Array(10).keys()], random(seed)), c = shuffle([...Array(10).keys()], random(seed + 1))
  return <div>
    <Controls><Slider label="seed" value={seed} min={1} max={100} step={1} onChange={setSeed} digits={0} /></Controls>
    <Table head={['generator', 'permutation of 0–9']} rows={[[`seed ${seed}`, a.join(' ')], [`seed ${seed} again`, b.join(' ')], [`seed ${seed + 1}`, c.join(' ')]]} label="Seeded permutations" />
    <Readout>The same seed gives the same shuffle every time; a different seed gives a different one. Fingerprint of the first: {fingerprint(a)}.</Readout>
  </div>
}

export function SplitInvariants() {
  const [n, setN] = useState(80), [frac, setFrac] = useState(0.25), [bug, setBug] = useState(false), seed = 7
  const order = shuffle([...Array(n).keys()], random(seed)), k = Math.floor(n * (1 - frac))
  const train = order.slice(0, k), val = bug ? order.slice(k - 1) : order.slice(k)
  const overlap = train.filter(i => val.includes(i)).length, all = new Set([...train, ...val]).size
  const again = shuffle([...Array(n).keys()], random(seed)).slice(0, k).join() === train.join()
  const checks = [['every row appears', all === n], ['no row in both parts', overlap === 0], [`sizes are ${k} + ${n - k}`, train.length === k && val.length === n - k], ['same seed → same split', again]]
  return <div>
    <Controls><Slider label="rows" value={n} min={10} max={200} step={10} onChange={setN} digits={0} /><Slider label="validation fraction" value={frac} min={0.1} max={0.5} step={0.05} onChange={setFrac} /><Check label="introduce an off-by-one bug" checked={bug} onChange={setBug} /></Controls>
    <Table head={['invariant', 'holds?']} rows={checks.map(([c, ok]) => [c, ok ? '✓' : '✗ fails'])} label="Split invariants" />
    <Readout>{train.length} training rows, {val.length} validation rows{overlap ? `, ${overlap} in both` : ''}. {checks.every(c => c[1]) ? 'All invariants hold.' : 'An invariant test would catch this bug even though the code runs without error.'}</Readout>
  </div>
}
