import { useMemo, useState } from 'react'
import * as T from '../engine/tables.js'
import * as P from '../engine/patterns.js'
import * as F from '../engine/models.js'
import * as L from '../engine/mlData.js'
import { DAYS_CSV, dateOf } from '../engine/data.js'
import { MESSAGES } from '../../nlp-studio/engine/data.js'

const f = (x, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(d))
const pct = x => `${(100 * x).toFixed(1)}%`
const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>
const Toggle = ({ options, value, onChange }) => <div className="qm-fig-controls">{options.map(([id, label]) => <button key={id} className={value === id ? 'active' : ''} onClick={() => onChange(id)}>{label}</button>)}</div>
const BLUE = '#3f5bb5', RED = '#b0413e', GREEN = '#1f6f68', GREY = '#9aa3b2', GOLD = '#b7791f'

let daysCache = null
const days = () => (daysCache ??= P.numberDays(T.readCsv(DAYS_CSV())))
const accuracy = (ps, ys) => ys.filter((y, i) => (ps[i] > 0.5 ? 1 : 0) === y).length / ys.length

// 11.1: the days of the year on a line and on a circle; two days chosen, and their distance each way.
export function DateCircle() {
  const [a, setA] = useState(364), [b, setB] = useState(0)
  const ca = L.cyclical(a, 365), cb = L.cyclical(b, 365)
  const R = 80, cx = 110, cy = 100, X = d => 240 + 190 * d / 364
  const riders = useMemo(() => days().map(r => r.riders), [])
  return <div className="qm-fig">
    <Slider label="Day A" value={a} min={0} max={364} onChange={setA} format={v => dateOf(v)} />
    <Slider label="Day B" value={b} min={0} max={364} onChange={setB} format={v => dateOf(v)} />
    <svg className="qm-plot" viewBox="0 0 440 200" role="img" aria-label="Days of the year on a circle and on a line">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={GREY} />
      {riders.map((v, d) => { const [s, c] = L.cyclical(d, 365); return <circle key={d} cx={cx + R * s} cy={cy - R * c} r={1 + v / 600} fill={BLUE} fillOpacity=".25" /> })}
      <line x1={cx + R * ca[0]} y1={cy - R * ca[1]} x2={cx + R * cb[0]} y2={cy - R * cb[1]} stroke={RED} strokeWidth="2" />
      <circle cx={cx + R * ca[0]} cy={cy - R * ca[1]} r="5" fill={RED} /><circle cx={cx + R * cb[0]} cy={cy - R * cb[1]} r="5" fill={GOLD} />
      <text className="qm-tick" x={cx} y={cy - R - 6} textAnchor="middle">1 Jan</text><text className="qm-tick" x={cx} y={cy + R + 14} textAnchor="middle">2 Jul</text>
      <line x1={X(0)} x2={X(364)} y1={100} y2={100} stroke={GREY} />
      <line x1={X(a)} x2={X(b)} y1={100} y2={100} stroke={RED} strokeWidth="3" />
      <circle cx={X(a)} cy={100} r="5" fill={RED} /><circle cx={X(b)} cy={100} r="5" fill={GOLD} />
      <text className="qm-tick" x={X(0)} y={120}>day 0</text><text className="qm-tick" x={X(364)} y={120} textAnchor="end">364</text>
    </svg>
    <p className="qm-small">On the line: <b>{Math.abs(a - b)}</b> days apart. On the circle: <b>{f(Math.hypot(ca[0] - cb[0], ca[1] - cb[1]), 4)}</b> (the most is 2, for days half a year apart). Dot size: the riders; summer at the bottom.</p>
  </div>
}

// 11.2: the order date, target-encoded on all rows or out of fold, as a feature for late parcels.
export function EncodingLeak() {
  const rows = useMemo(L.deliveryTable, [])
  const [mode, setMode] = useState('leaky'), [m, setM] = useState(1)
  const keys = rows.map(r => r.date), ys = rows.map(r => r.onTime)
  const encoded = useMemo(() => (mode === 'leaky' ? (() => { const [means] = L.targetMeans(keys, ys, m); return keys.map(k => means[k]) })() : L.outOfFoldEncode(keys, ys, F.kFolds(rows.length, 5, 3), m)), [mode, m]) // eslint-disable-line react-hooks/exhaustive-deps
  const acc = accuracy(encoded, ys)
  const W = 440, H = 120, X = v => 20 + (W - 40) * v
  return <div className="qm-fig">
    <Toggle options={[['leaky', 'Encoded on all rows'], ['fold', 'Out of fold']]} value={mode} onChange={setMode} />
    <Slider label="Smoothing m" value={m} min={0} max={20} onChange={setM} />
    <svg className="qm-plot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Each delivery's encoded date, coloured by whether it was on time">
      {encoded.map((v, i) => <circle key={i} cx={X(v)} cy={ys[i] ? 40 + (i % 9) * 3 : 80 + (i % 9) * 3} r="3" fill={ys[i] ? GREEN : RED} fillOpacity=".6" />)}
      <line x1={X(0.5)} x2={X(0.5)} y1={20} y2={110} stroke={GREY} strokeDasharray="3 3" />
      <text className="qm-tick" x={20} y={14}>encoded value 0</text><text className="qm-tick" x={W - 20} y={14} textAnchor="end">1</text>
      <text className="qm-tick" x={W - 20} y={50} textAnchor="end">on time</text><text className="qm-tick" x={W - 20} y={92} textAnchor="end">late</text>
    </svg>
    <p className="qm-small">{rows.length} deliveries on {new Set(keys).size} dates. “Encoded value above 0.5 means on time” is right for <b>{pct(acc)}</b> of them ({mode === 'leaky' ? 'each row’s own answer is inside its encoding: most dates have one delivery, so the encoding is the answer' : 'each row encoded from the other folds only: what is left is how much the date really says, which is nothing'}). Always guessing on time: {pct(ys.filter(y => y).length / ys.length)}.</p>
  </div>
}

// 11.4: the messages' words hashed into k buckets: how many words share a bucket.
export function HashBuckets() {
  const vocab = useMemo(() => [...new Set(MESSAGES.flatMap(([text]) => L.tokens(text)))].sort(), [])
  const [k, setK] = useState(128)
  const kk = Math.max(2, Math.min(2048, k))
  const buckets = new Map()
  for (const w of vocab) { const b = L.fnv1a(w) % kk; if (!buckets.has(b)) buckets.set(b, []); buckets.get(b).push(w) }
  const shared = [...buckets.values()].filter(v => v.length > 1), sharing = shared.reduce((s, v) => s + v.length, 0)
  const expected = 1 - (1 - 1 / kk) ** (vocab.length - 1)
  return <div className="qm-fig">
    <Slider label="Buckets k" value={kk} min={2} max={2048} onChange={setK} />
    <p className="qm-small">{vocab.length} different words in {kk} buckets: <b>{buckets.size}</b> buckets used, <b>{sharing}</b> words share a bucket with another ({pct(sharing / vocab.length)}; the formula expects {pct(expected)}).</p>
    <p className="qm-small mono">{shared.slice(0, 6).map(v => `{${v.slice(0, 4).join(', ')}${v.length > 4 ? ', …' : ''}}`).join('  ')}</p>
  </div>
}

// 11.5: k nearest neighbours for riders, with the features raw or in standard units.
export function KnnScaling() {
  const [scaled, setScaled] = useState('raw'), [k, setK] = useState(10), [withDay, setWithDay] = useState('day')
  const { X, ys, train, test } = useMemo(() => {
    const d = days(), X = d.map(r => { const [, , doy, we] = L.dateFeatures(r.date); return withDay === 'day' ? [r.high_c, r.rain_mm, we, doy] : [r.high_c, r.rain_mm, we] })
    return { X, ys: d.map(r => r.riders), train: d.map((_, i) => i).filter(i => i % 4 !== 0), test: d.map((_, i) => i).filter(i => i % 4 === 0) }
  }, [withDay])
  const kk = Math.max(1, Math.min(50, k))
  const Xs = scaled === 'raw' ? X : L.scale(X, L.fitScaler(train.map(i => X[i])))
  const preds = test.map(j => L.knnPredict(train.map(i => Xs[i]), train.map(i => ys[i]), Xs[j], kk))
  const err = F.rmse(test.map(j => ys[j]), preds)
  const sds = X[0].map((_, j) => Math.sqrt(train.reduce((s, i) => s + (X[i][j] - train.reduce((t, q) => t + X[q][j], 0) / train.length) ** 2, 0) / (train.length - 1)))
  const names = ['temperature', 'rain', 'weekend', 'day of year']
  return <div className="qm-fig">
    <Toggle options={[['raw', 'Raw units'], ['scaled', 'Standard units']]} value={scaled} onChange={setScaled} />
    <Toggle options={[['day', 'With the day of the year'], ['noday', 'Without it']]} value={withDay} onChange={setWithDay} />
    <Slider label="Neighbours k" value={kk} min={1} max={50} onChange={setK} />
    <p className="qm-small">Every 4th day held out; RMSE on them <b>{f(err, 1)}</b> riders. Spread of each feature on the training days: {sds.map((s, j) => <span key={j}>{names[j]} <b>{f(scaled === 'raw' ? s : 1, 2)}</b>{j < sds.length - 1 ? ' · ' : ''}</span>)}. {scaled === 'raw' ? 'In raw units the feature with the biggest spread decides who is “near”.' : 'In standard units every feature has spread 1 and counts equally.'}</p>
  </div>
}

// 11.6: the late-parcel model's threshold: the confusion matrix, precision and recall.
export function ThresholdTradeoff() {
  const rows = useMemo(L.deliveryTable, [])
  const probs = useMemo(() => { const X = rows.map(r => [1, r.north, r.far, r.north * r.far]), w = F.logisticFit(X, rows.map(r => r.late), 1, 5000); return F.predict(X, w).map(F.sigmoid) }, [rows])
  const [t, setT] = useState(0.5)
  const ys = rows.map(r => r.late), m = L.confusion(ys, probs.map(p => (p > t ? 1 : 0))), [pr, re, f1] = L.precisionRecallF1(m)
  const acc = (m[0][0] + m[1][1]) / ys.length
  return <div className="qm-fig">
    <Slider label="Call it late above" value={t} min={0} max={1} step={0.01} onChange={setT} format={v => v.toFixed(2)} />
    <table className="qm-log mono"><thead><tr><th></th><th>called late</th><th>called on time</th></tr></thead>
      <tbody><tr><td>late</td><td style={{ color: GREEN }}>{m[0][0]} caught</td><td style={{ color: RED }}>{m[0][1]} missed</td></tr>
        <tr><td>on time</td><td style={{ color: RED }}>{m[1][0]} false alarms</td><td style={{ color: GREEN }}>{m[1][1]}</td></tr></tbody></table>
    <p className="qm-small">Accuracy <b>{pct(acc)}</b> · precision <b>{f(pr, 2)}</b> · recall <b>{f(re, 2)}</b> · F1 <b>{f(f1, 2)}</b>. The model gives only four probabilities ({[...new Set(probs.map(p => p.toFixed(3)))].sort().join(', ')}), one per courier and distance, so the threshold moves in four steps.</p>
  </div>
}

// 11.7: ten folds of the 400 orders, random or stratified: how many returned orders each holds.
export function FoldBalance() {
  const flags = useMemo(L.returnedFlags, [])
  const [kind, setKind] = useState('random'), [seed, setSeed] = useState(5)
  const folds = kind === 'random' ? F.kFolds(flags.length, 10, seed) : L.stratifiedFolds(flags, 10, seed)
  const counts = L.positivesPerFold(flags, folds)
  return <div className="qm-fig">
    <Toggle options={[['random', 'Random folds'], ['strat', 'Stratified folds']]} value={kind} onChange={setKind} />
    <div className="qm-fig-controls"><button onClick={() => setSeed(s => s + 1)}>Another split</button></div>
    <svg className="qm-plot" viewBox="0 0 440 120" role="img" aria-label="Returned orders in each fold">
      {counts.map((c, i) => <g key={i}><rect x={20 + i * 42} width="32" y={100 - c * 18} height={c * 18} fill={c === 0 ? RED : BLUE} /><text className="qm-tick" x={36 + i * 42} y={114} textAnchor="middle">{c}</text></g>)}
    </svg>
    <p className="qm-small">{flags.filter(x => x).length} returned orders of {flags.length}. Folds with none: <b>{counts.filter(c => c === 0).length}</b>{counts.includes(0) ? ': a model tested on such a fold can’t be scored on the returns at all.' : '.'}</p>
  </div>
}
