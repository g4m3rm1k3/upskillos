// Figures placed between the paragraphs of Lab 06 (06.1–06.6).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Check, Radio, Readout, Bars, MiniPlot, Path, Dots, HLine, curve, Table, r } from '../../kit/fig.jsx'
import { kfold, forwardChain, selectionExperiment, groupExperiment, timeExperiment, winnersCurse, mean, std } from './engine.js'
import { random, normal, range } from '../../kit/math.js'

const ROLE_COLOR = { train: 'var(--chart-train)', val: 'var(--chart-val)', test: '#10b981', unused: 'var(--border)' }
function RoleStrip({ roles, label }) {
  const n = roles.length, w = Math.min(22, 460 / n)
  return <svg viewBox={`0 0 ${n * w + 4} 28`} role="img" aria-label={label} style={{ maxWidth: n * w + 4 }}>{roles.map((ro, i) => <rect key={i} x={2 + i * w} y={4} width={w - 2} height={20} rx="2" fill={ROLE_COLOR[ro]} opacity="0.85" />)}</svg>
}

// ---------- 06.1 ----------
export function ThreeRoles() {
  const [val, setVal] = useState(0.2), [test, setTest] = useState(0.2), n = 1000, nt = Math.round(n * test), nv = Math.round(n * val), ntr = n - nt - nv
  return <div>
    <Controls><Slider label="validation fraction" value={val} min={0.05} max={0.4} step={0.05} onChange={setVal} /><Slider label="test fraction" value={test} min={0.05} max={0.4} step={0.05} onChange={setTest} /></Controls>
    <RoleStrip roles={range(50).map(i => (i < Math.round(50 * test) ? 'test' : i < Math.round(50 * (test + val)) ? 'val' : 'train'))} label="Roles of the rows" />
    <Table head={['role', 'rows of 1,000', 'used for']} rows={[['test (set aside first)', nt, 'one final report'], ['validation', nv, 'comparing choices'], ['training', ntr, 'fitting parameters']]} label="Split sizes" />
    <Readout>Green is split off first and not touched until the end; orange guides choices; blue fits.</Readout>
  </div>
}

export function TestNoise() {
  const [n, setN] = useState(100), [acc, setAcc] = useState(0.8), se = Math.sqrt(acc * (1 - acc) / n)
  return <div>
    <Controls><Slider label="test rows" value={n} min={20} max={5000} step={20} onChange={setN} digits={0} /><Slider label="true accuracy" value={acc} min={0.5} max={0.99} step={0.01} onChange={setAcc} /></Controls>
    <MiniPlot x={[0.4, 1]} y={[0, 1]} height={110} yTicks={2} grid={false} xLabel="accuracy" label={`95% range ${r(acc - 1.96 * se, 3)} to ${r(acc + 1.96 * se, 3)}`}>{({ X, Y }) => <>
      <rect x={X(Math.max(0.4, acc - 1.96 * se))} y={Y(0.7)} width={X(Math.min(1, acc + 1.96 * se)) - X(Math.max(0.4, acc - 1.96 * se))} height={Y(0.3) - Y(0.7)} fill="var(--chart-train)" opacity="0.4" />
      <line x1={X(acc)} x2={X(acc)} y1={Y(0.8)} y2={Y(0.2)} stroke="var(--text)" strokeWidth="2" />
    </>}</MiniPlot>
    <Readout>standard error √(a(1−a)/n) = <strong>{r(se * 100, 2)} points</strong>; a measured score could plausibly land anywhere from {r(100 * (acc - 1.96 * se), 1)}% to {r(100 * (acc + 1.96 * se), 1)}%.</Readout>
  </div>
}

// ---------- 06.2 ----------
export function FoldMap() {
  const [k, setK] = useState(5), n = 20, folds = kfold(n, k, 1)
  return <div>
    <Controls><Slider label="k folds" value={k} min={2} max={10} step={1} onChange={setK} digits={0} /></Controls>
    {folds.map((f, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="ml-caption" style={{ width: 56 }}>fold {i + 1}</span><RoleStrip roles={range(n).map(row => (f.val.includes(row) ? 'val' : 'train'))} label={`Fold ${i + 1}: ${f.val.length} validation rows`} /></div>)}
    <Readout>20 rows, {k} folds: each row is orange (validation) exactly once; each model trains on about {r(n * (k - 1) / k, 0)} rows ({r((k - 1) / k * 100, 0)}%).</Readout>
  </div>
}

const LINE_DATA = (() => { const rng = random(9); return range(30).map(() => { const x = 6 * rng() - 3; return { x, y: 1.7 * x + 0.8 + 1.4 * normal(rng) } }) })()
function foldScores(k, seed) {
  return kfold(LINE_DATA.length, k, seed).map(f => {
    const tr = f.train.map(i => LINE_DATA[i]), mx = mean(tr.map(p => p.x)), my = mean(tr.map(p => p.y)), w = tr.reduce((t, p) => t + (p.x - mx) * (p.y - my), 0) / tr.reduce((t, p) => t + (p.x - mx) ** 2, 0)
    const v = f.val.map(i => LINE_DATA[i])
    return { line: mean(v.map(p => (w * p.x + my - w * mx - p.y) ** 2)), base: mean(v.map(p => (my - p.y) ** 2)) }
  })
}
export function FoldScores() {
  const [k, setK] = useState(5), [seed, setSeed] = useState(1), s = foldScores(k, seed), line = s.map(f => f.line), base = s.map(f => f.base)
  return <div>
    <Controls><Slider label="k" value={k} min={2} max={10} step={1} onChange={setK} digits={0} /><button onClick={() => setSeed(v => v + 1)}>Reshuffle the folds</button></Controls>
    <Bars items={s.map((f, i) => ({ label: `fold ${i + 1}`, value: f.line }))} digits={2} label="Validation MSE of the line in each fold" />
    <Readout>line: mean MSE {r(mean(line), 2)} ± {r(std(line, 1), 2)} across folds; mean baseline {r(mean(base), 2)}. Same folds for both models, so the difference ({r(mean(base) - mean(line), 2)}) is a fairer comparison than either number alone.</Readout>
  </div>
}

// ---------- 06.3 ----------
export function MajorityTrap() {
  const [prev, setPrev] = useState(0.06), [recall, setRecall] = useState(0.5)
  const base = 1 - prev, modelAcc = (1 - prev) * 0.97 + prev * recall
  return <div>
    <Controls><Slider label="fraud rate" value={prev} min={0.005} max={0.5} step={0.005} onChange={setPrev} digits={3} /><Slider label="model catches this share of fraud" value={recall} min={0} max={1} step={0.05} onChange={setRecall} /></Controls>
    <Bars items={[{ label: 'always “legitimate”', value: base, color: 'var(--muted)' }, { label: 'model (3% false alarms)', value: modelAcc, highlight: true }]} min={0} max={1} digits={3} />
    <Readout>The do-nothing baseline scores {r(base * 100, 1)}% accuracy and catches no fraud. The model scores {r(modelAcc * 100, 1)}% {modelAcc < base ? '— lower accuracy, yet it is the only one doing the job' : ''}. Accuracy alone cannot tell them apart; Lab 09’s metrics can.</Readout>
  </div>
}

export function SkillMeter() {
  const [model, setModel] = useState(6), [base, setBase] = useState(10), skill = 1 - model / base
  return <div>
    <Controls><Slider label="model MSE" value={model} min={0} max={15} step={0.5} onChange={setModel} digits={1} /><Slider label="baseline MSE" value={base} min={1} max={15} step={0.5} onChange={setBase} digits={1} /></Controls>
    <Bars items={[{ label: 'skill', value: skill, highlight: skill > 0, color: skill < 0 ? '#ef4444' : undefined }]} min={-1} max={1} digits={3} />
    <Readout>skill = 1 − {r(model, 1)}/{r(base, 1)} = <strong>{r(skill, 3)}</strong>. {skill > 0 ? `The model removes ${r(skill * 100, 0)}% of the baseline’s error.` : skill === 0 ? 'No better than the baseline.' : 'Worse than the baseline.'}</Readout>
  </div>
}

// ---------- 06.4 ----------
export function LeakySelection() {
  const [k, setK] = useState(10), [seed, setSeed] = useState(1), res = useMemo(() => selectionExperiment({ k, seed }), [k, seed])
  return <div>
    <Controls><Slider label="features selected" value={k} min={1} max={40} step={1} onChange={setK} digits={0} /><button onClick={() => setSeed(s => s + 1)}>New noise data</button></Controls>
    <Bars items={[...res.leaky.map((a, i) => ({ label: `leaky ${i + 1}`, value: a, color: '#ef4444' })), ...res.honest.map((a, i) => ({ label: `honest ${i + 1}`, value: a }))]} min={0} max={1} digits={2} label="Fold accuracy, leaky versus honest selection" />
    <Readout>Labels are coin flips, so the truth is 50%. Selecting features on all rows first: mean <strong>{r(mean(res.leaky) * 100, 0)}%</strong>. Selecting inside each training fold: <strong>{r(mean(res.honest) * 100, 0)}%</strong>.</Readout>
  </div>
}

// ---------- 06.5 ----------
const GROUPS = groupExperiment()
export function GroupedMachines() {
  const [split, setSplit] = useState('row'), res = split === 'row' ? GROUPS.rowSplit : GROUPS.groupSplit
  return <div>
    <Controls><Radio name="gsplit" value={split} onChange={setSplit} options={[['row', 'random row split'], ['group', 'split by machine']]} /></Controls>
    <MiniPlot x={[10, 90]} y={[40, 110]} xLabel="load" yLabel="reading" label="Readings from 12 machines">{({ X, Y }) => <Dots X={X} Y={Y} points={GROUPS.rows.map(p => [p.x, p.y, 3, `hsl(${p.group * 30}, 65%, 50%)`])} />}</MiniPlot>
    <Bars items={[{ label: '1-nearest-neighbour', value: res.nn, color: 'var(--chart-val)' }, { label: 'straight line', value: res.line }]} digits={1} label="Validation MSE" />
    <Readout>Each colour is one machine. {split === 'row' ? 'With rows shuffled, the memorizing nearest neighbour looks as good as the line — its nearest neighbour is usually another reading from the same machine.' : 'Holding out whole machines, recognition is impossible: the nearest neighbour’s error more than doubles, and the simple line wins.'}</Readout>
  </div>
}

export function ForwardChainTimeline() {
  const [folds, setFolds] = useState(5), [minTrain, setMinTrain] = useState(50), [gap, setGap] = useState(0), n = 100
  const splits = forwardChain(n, folds, minTrain)
  return <div>
    <Controls><Slider label="folds" value={folds} min={2} max={8} step={1} onChange={setFolds} digits={0} /><Slider label="first training size" value={minTrain} min={20} max={80} step={10} onChange={setMinTrain} digits={0} /><Slider label="gap" value={gap} min={0} max={5} step={1} onChange={setGap} digits={0} /></Controls>
    {splits.map((s, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="ml-caption" style={{ width: 56 }}>fold {i + 1}</span><RoleStrip roles={range(n).map(t => (s.val.includes(t) ? 'val' : t < s.train.length - gap ? 'train' : 'unused'))} label={`Fold ${i + 1}: train ${s.train.length - gap}, validate ${s.val.length}`} /></div>)}
    <Readout>Time runs left to right. Each fold trains on the past (blue) and validates on the next block (orange); {gap ? `${gap} grey rows before each block are skipped so the target delay is respected.` : 'add a gap if outcomes arrive late.'} {splits.length} folds of {splits[0]?.val.length ?? 0} rows.</Readout>
  </div>
}

const TIME = timeExperiment()
export function TimeSplitError() {
  return <div>
    <MiniPlot x={[0, 120]} y={[10, 60]} xLabel="time" yLabel="value" label="Drifting series">{({ X, Y }) => <Path X={X} Y={Y} points={TIME.series.map(p => [p.t, p.y])} />}</MiniPlot>
    <Bars items={[{ label: 'random 5-fold', value: TIME.random, color: '#ef4444' }, { label: 'forward chaining', value: TIME.forwardMSE }]} digits={1} label="Nearest-neighbour validation MSE" />
    <Readout>Random folds let the model copy a neighbouring moment on either side: MSE {r(TIME.random, 1)}. Forward chaining must predict the unseen future: MSE {r(TIME.forwardMSE, 1)} — the number deployment will actually see.</Readout>
  </div>
}

// ---------- 06.6 ----------
export function WinnersCurse() {
  const [models, setModels] = useState(20), [seed, setSeed] = useState(4), res = winnersCurse({ models, seed })
  return <div>
    <Controls><Slider label="models compared" value={models} min={1} max={100} step={1} onChange={setModels} digits={0} /><button onClick={() => setSeed(s => s + 1)}>New test set</button></Controls>
    <MiniPlot x={[0.55, 0.85]} y={[0, 1]} height={140} yTicks={2} grid={false} xLabel="test accuracy (every model is truly 70%)" label="Test scores of equally good models">{({ X, Y }) => <>
      <Dots X={X} Y={Y} points={res.test.map((a, i) => [a, 0.3 + 0.4 * ((i * 7) % 10) / 10, i === res.best ? 6 : 3.5, i === res.best ? '#ef4444' : undefined])} />
      <line x1={X(0.7)} x2={X(0.7)} y1={Y(0)} y2={Y(1)} stroke="var(--text)" strokeDasharray="4 3" />
    </>}</MiniPlot>
    <Readout>Best of {models}: <strong>{r(res.test[res.best] * 100, 0)}%</strong> (red). Re-tested on fresh data: {r(res.fresh * 100, 0)}%. The more models compared, the luckier the winner looks.</Readout>
  </div>
}

export function SpuriousPasses() {
  const [m, setM] = useState(20), [alpha, setAlpha] = useState(0.05), p = 1 - (1 - alpha) ** m
  return <div>
    <Controls><Slider label="comparisons m" value={m} min={1} max={100} step={1} onChange={setM} digits={0} /><Slider label="chance each useless model passes" value={alpha} min={0.01} max={0.2} step={0.01} onChange={setAlpha} /></Controls>
    <MiniPlot x={[1, 100]} y={[0, 1]} xLabel="comparisons" yLabel="P(at least one false win)" label={`${r(p, 3)} at m = ${m}`}>{({ X, Y }) => <><Path X={X} Y={Y} points={curve(k => 1 - (1 - alpha) ** k, 1, 100)} /><Dots X={X} Y={Y} points={[[m, p]]} color="var(--chart-val)" rad={5} /></>}</MiniPlot>
    <Readout>1 − (1 − {r(alpha, 2)})^{m} = <strong>{r(p, 4)}</strong>.</Readout>
  </div>
}
