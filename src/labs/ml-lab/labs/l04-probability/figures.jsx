// Figures placed between the paragraphs of Lab 04 (04.1–04.6).
import React, { useMemo, useState } from 'react'
import { Controls, Slider, Choice, Check, Radio, Readout, Bars, MiniPlot, Path, Dots, VLine, HLine, Label, curve, Table, r } from '../../kit/fig.jsx'
import { posterior, simulateAlarms, naturalFrequencies, standardError, diceExact, rollDice, expectation, varianceOf } from './engine.js'
import { random } from '../../kit/math.js'

const erf = x => { const t = 1 / (1 + 0.3275911 * Math.abs(x)), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y }
const Phi = z => 0.5 * (1 + erf(z / Math.SQRT2))

// ---------- 04.1 ----------
export function DicePairs() {
  const [target, setTarget] = useState(7)
  const hits = []; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === target) hits.push([a, b])
  return <div>
    <Controls><Slider label="sum" value={target} min={2} max={12} step={1} onChange={setTarget} digits={0} /></Controls>
    <svg viewBox="0 0 260 250" role="img" aria-label={`${hits.length} of 36 pairs sum to ${target}`} style={{ maxWidth: 300 }}>
      {[1, 2, 3, 4, 5, 6].map(a => [1, 2, 3, 4, 5, 6].map(b => <g key={`${a}${b}`}><rect x={30 + (b - 1) * 36} y={30 + (a - 1) * 36} width={32} height={32} rx="4" fill={a + b === target ? 'var(--chart-model)' : 'var(--chart-train)'} opacity={a + b === target ? 0.85 : 0.15} /><text x={46 + (b - 1) * 36} y={51 + (a - 1) * 36} textAnchor="middle" style={{ fontSize: 10, fill: 'var(--text)' }}>{a},{b}</text></g>))}
      <text x={130} y={18} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text)' }}>second die →</text>
      <text x={12} y={140} transform="rotate(-90 12 140)" textAnchor="middle" style={{ fontSize: 11, fill: 'var(--text)' }}>first die →</text>
    </svg>
    <Readout>{hits.length} of the 36 equally likely pairs sum to {target}: P = {hits.length}/36 = <strong>{r(hits.length / 36, 4)}</strong>.</Readout>
  </div>
}

export function DiceSimulation() {
  const [logN, setLogN] = useState(3), [seed, setSeed] = useState(1), n = Math.round(10 ** logN)
  const sim = useMemo(() => rollDice(n, seed), [n, seed]), p7 = sim.counts[7] / n, se = standardError(1 / 6, n)
  return <div>
    <Controls><Slider label="rolls = 10^" value={logN} min={1} max={5} step={0.5} onChange={setLogN} digits={1} /><button onClick={() => setSeed(s => s + 1)}>New seed ({seed})</button></Controls>
    <MiniPlot x={[1.5, 12.5]} y={[0, 0.3]} xLabel="sum of two dice" yLabel="share of rolls" label={`Simulated distribution of ${n} rolls against the exact probabilities`}>{({ X, Y }) => <>
      {diceExact.map(d => <rect key={d.sum} x={X(d.sum - 0.35)} y={Y(sim.counts[d.sum] / n)} width={X(0.7) - X(0)} height={Y(0) - Y(sim.counts[d.sum] / n)} fill="var(--chart-train)" opacity="0.7" />)}
      <Dots X={X} Y={Y} points={diceExact.map(d => [d.sum, d.p])} color="var(--text)" rad={3.5} />
    </>}</MiniPlot>
    <Readout>{n.toLocaleString()} rolls: P̂(sum = 7) = <strong>{r(p7, 4)}</strong> vs exact 0.1667; typical error √(p(1−p)/n) = {r(se, 4)}. Bars are simulated shares; dots are exact.</Readout>
  </div>
}

export function StandardErrorLadder() {
  const [p, setP] = useState(1 / 6), ns = [100, 1e3, 1e4, 1e5, 1e6]
  return <div>
    <Controls><Slider label="true probability p" value={p} min={0.01} max={0.99} step={0.01} onChange={setP} /></Controls>
    <Table head={['trials n', 'standard error √(p(1−p)/n)', 'reliable decimals']} rows={ns.map(n => { const se = standardError(p, n); return [n.toLocaleString(), r(se, 5), Math.max(0, Math.floor(-Math.log10(se)))] })} label="Standard error by number of trials" />
    <Readout>Every 100× more trials divides the error by 10 — one more trustworthy decimal place.</Readout>
  </div>
}

// ---------- 04.2 ----------
export function PmfBars() {
  const [kind, setKind] = useState('two'), items = kind === 'two' ? diceExact.map(d => ({ label: String(d.sum), value: d.p, highlight: d.sum === 7 })) : [1, 2, 3, 4, 5, 6].map(v => ({ label: String(v), value: 1 / 6 }))
  return <div>
    <Controls><Radio name="pmfkind" value={kind} onChange={setKind} options={[['one', 'one die'], ['two', 'sum of two dice']]} /></Controls>
    <Bars items={items} max={kind === 'two' ? 0.2 : 0.2} digits={3} />
    <Readout>Each bar is P(X = value); together they add to {r(items.reduce((t, i) => t + i.value, 0), 3)}.</Readout>
  </div>
}

export function NormalArea() {
  const [a, setA] = useState(-1), [b, setB] = useState(1), mu = 0, sigma = 1, pdf = x => Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI))
  const lo = Math.min(a, b), hi = Math.max(a, b), area = Phi(hi) - Phi(lo)
  return <div>
    <Controls><Slider label="from a" value={a} min={-3.5} max={3.5} step={0.1} onChange={setA} digits={1} /><Slider label="to b" value={b} min={-3.5} max={3.5} step={0.1} onChange={setB} digits={1} /></Controls>
    <MiniPlot x={[-4, 4]} y={[0, 0.45]} xLabel="x (in units of σ from μ)" yLabel="density" label={`Area ${r(area, 4)} between ${lo} and ${hi}`}>{({ X, Y }) => <>
      <path d={`M ${X(lo)} ${Y(0)} ${curve(pdf, lo, hi, 80).map(([x, y]) => `L ${X(x)} ${Y(y)}`).join(' ')} L ${X(hi)} ${Y(0)} Z`} fill="var(--chart-train)" opacity="0.35" />
      <Path X={X} Y={Y} points={curve(pdf, -4, 4)} />
    </>}</MiniPlot>
    <Readout>P({r(lo, 1)} &lt; X ≤ {r(hi, 1)}) = shaded area = <strong>{r(area, 4)}</strong>. Try ±1 (0.683) and ±2 (0.954). The height of the curve is not a probability; only areas are.</Readout>
  </div>
}

export function DieCdf() {
  const [x, setX] = useState(2), F = v => Math.max(0, Math.min(6, Math.floor(v))) / 6
  return <div>
    <Controls><Slider label="x" value={x} min={0} max={7} step={0.1} onChange={setX} digits={1} /></Controls>
    <MiniPlot x={[0, 7]} y={[0, 1.05]} xLabel="x" yLabel="F(x) = P(X ≤ x)" label={`CDF of one die at ${x}: ${r(F(x), 3)}`}>{({ X, Y }) => <>
      {[0, 1, 2, 3, 4, 5, 6].map(k => <Path key={k} X={X} Y={Y} points={[[k, k / 6], [k + 1 > 7 ? 7 : k + 1, k / 6]]} width={2.5} />)}
      <VLine X={X} Y={Y} x={x} y0={0} y1={1.05} />
      <Dots X={X} Y={Y} points={[[x, F(x)]]} color="var(--chart-val)" rad={5} />
    </>}</MiniPlot>
    <Readout>F({r(x, 1)}) = <strong>{Math.max(0, Math.min(6, Math.floor(x)))}/6 = {r(F(x), 4)}</strong>. The steps jump by 1/6 at each face; P(2 &lt; X ≤ 5) = F(5) − F(2) = 3/6.</Readout>
  </div>
}

// ---------- 04.3 ----------
export function LoadedDie() {
  const [p6, setP6] = useState(1 / 6), probs = [1, 2, 3, 4, 5].map(() => (1 - p6) / 5).concat([p6]), vals = [1, 2, 3, 4, 5, 6]
  const m = expectation(vals, probs), v = varianceOf(vals, probs)
  return <div>
    <Controls><Slider label="P(6)" value={p6} min={0} max={1} step={0.01} onChange={setP6} /></Controls>
    <Bars items={vals.map((x, i) => ({ label: `x=${x}`, value: x * probs[i], highlight: x === 6 }))} digits={3} label="Contributions x·P(X = x)" />
    <Readout>E[X] = Σ x·P(X = x) = sum of the bars = <strong>{r(m, 3)}</strong>; Var = {r(v, 3)}, σ = {r(Math.sqrt(v), 3)}. A fair die (P(6) = 1/6) gives 3.5 and 2.917.</Readout>
  </div>
}

export function RunningMean() {
  const [seed, setSeed] = useState(1), sim = useMemo(() => rollDice(5000, seed), [seed])
  return <div>
    <Controls><button onClick={() => setSeed(s => s + 1)}>Roll 5,000 more (seed {seed})</button></Controls>
    <MiniPlot x={[1, 5000]} y={[5, 9]} xLabel="number of rolls" yLabel="running mean of the sum" label="Running mean approaching 7">{({ X, Y }) => <>
      <HLine X={X} Y={Y} y={7} x0={1} x1={5000} />
      <Path X={X} Y={Y} points={sim.running} />
    </>}</MiniPlot>
    <Readout>After 5,000 rolls the average sum is {r(sim.mean, 3)}. Early on it wanders; it settles toward E = 7, the dashed line.</Readout>
  </div>
}

export function SquaredDistances() {
  const vals = [1, 2, 3, 4, 5, 6], sq = vals.map(v => (v - 3.5) ** 2)
  return <div>
    <Table head={['face x', 'x − 3.5', '(x − 3.5)²']} rows={vals.map((v, i) => [v, r(v - 3.5, 1), r(sq[i], 2)])} label="Squared distances from the mean" />
    <Readout>Variance = average of the last column = {sq.reduce((a, b) => a + b, 0)}/6 = <strong>{r(sq.reduce((a, b) => a + b, 0) / 6, 3)}</strong>; σ = √2.917 = {r(Math.sqrt(17.5 / 6), 3)}.</Readout>
  </div>
}

export function AverageSpread() {
  const [n, setN] = useState(4), sigma = Math.sqrt(17.5 / 6)
  const avgs = useMemo(() => { const rng = random(3), out = []; for (let k = 0; k < 3000; k++) { let t = 0; for (let i = 0; i < n; i++) t += 1 + Math.floor(rng() * 6); out.push(t / n) } return out }, [n])
  const bins = Array.from({ length: 26 }, (_, i) => 1 + i * 0.2), hist = bins.map(b => avgs.filter(a => a >= b - 0.1 && a < b + 0.1).length / avgs.length)
  const sd = Math.sqrt(avgs.reduce((t, a) => t + (a - 3.5) ** 2, 0) / avgs.length)
  return <div>
    <Controls><Slider label="dice averaged, n" value={n} min={1} max={30} step={1} onChange={setN} digits={0} /></Controls>
    <MiniPlot x={[1, 6]} y={[0, Math.max(...hist) * 1.15]} xLabel="average of n dice" yLabel="share" label={`Distribution of the average of ${n} dice`}>{({ X, Y }) => hist.map((h, i) => <rect key={i} x={X(bins[i] - 0.09)} y={Y(h)} width={X(0.18) - X(0)} height={Y(0) - Y(h)} fill="var(--chart-train)" opacity="0.75" />)}</MiniPlot>
    <Readout>3,000 simulated averages of {n} dice: spread (sd) {r(sd, 3)}; theory σ/√n = 1.708/√{n} = <strong>{r(sigma / Math.sqrt(n), 3)}</strong>. The centre stays at 3.5.</Readout>
  </div>
}

// ---------- 04.4 ----------
export function ConditionGrid() {
  const [given, setGiven] = useState('alarm'), N = 1000, faulty = 20, tp = 18, fp = 49
  const cells = Array.from({ length: N }, (_, i) => { const fault = i < faulty, alarm = fault ? i < tp : i < faulty + fp; return { fault, alarm } })
  const inGroup = c => (given === 'alarm' ? c.alarm : given === 'fault' ? c.fault : true), group = cells.filter(inGroup), hits = group.filter(c => (given === 'alarm' ? c.fault : given === 'fault' ? c.alarm : c.fault)).length
  return <div>
    <Controls><Radio name="given" value={given} onChange={setGiven} options={[['none', 'all machines'], ['alarm', 'given an alarm'], ['fault', 'given a fault']]} /></Controls>
    <svg viewBox="0 0 500 210" role="img" aria-label={`${group.length} machines in the group, ${hits} of them counted`}>
      {cells.map((c, i) => <rect key={i} x={5 + (i % 50) * 9.8} y={5 + Math.floor(i / 50) * 10} width={8} height={8} rx="1.5" fill={c.fault ? '#ef4444' : 'var(--chart-train)'} opacity={inGroup(c) ? (c.alarm ? 1 : 0.55) : 0.08} stroke={c.alarm && inGroup(c) ? 'var(--text)' : 'none'} strokeWidth="1" />)}
    </svg>
    <Readout>Red = faulty, outlined = alarmed. {given === 'none' ? `P(fault) = 20/1000 = 0.02.` : given === 'alarm' ? <>Among the {group.length} alarms, {hits} are faults: P(fault | alarm) = {hits}/{group.length} = <strong>{r(hits / group.length, 3)}</strong>.</> : <>Among the {group.length} faulty machines, {hits} alarmed: P(alarm | fault) = {hits}/{group.length} = <strong>{r(hits / group.length, 3)}</strong>.</>}</Readout>
  </div>
}

export function IndependenceCheck() {
  const [which, setWhich] = useState('dice')
  const rows = which === 'dice' ? [['P(second = 6)', '6/36', r(1 / 6, 4)], ['P(second = 6 | first = 6)', '1/6', r(1 / 6, 4)]] : [['P(fault)', '20/1000', '0.02'], ['P(fault | alarm)', '18/67', r(18 / 67, 4)]]
  return <div>
    <Controls><Radio name="indep" value={which} onChange={setWhich} options={[['dice', 'two dice'], ['alarm', 'alarms and faults']]} /></Controls>
    <Table head={['probability', 'count', 'value']} rows={rows} label="Unconditional versus conditional probability" />
    <Readout>{which === 'dice' ? 'Knowing the first die changes nothing: independent.' : 'Knowing there was an alarm raises the fault probability 13-fold: dependent — which is why the alarm is useful.'}</Readout>
  </div>
}

// ---------- 04.5 ----------
export function BayesPopulation() {
  const [prior, setPrior] = useState(0.01), [sens, setSens] = useState(0.9), [fa, setFa] = useState(0.05)
  const f = naturalFrequencies(1000, prior, sens, fa), post = posterior(prior, sens, fa)
  return <div>
    <Controls><Slider label="prior P(fault)" value={prior} min={0.001} max={0.5} step={0.001} onChange={setPrior} digits={3} /><Slider label="sensitivity" value={sens} min={0.5} max={1} step={0.01} onChange={setSens} /><Slider label="false-alarm rate" value={fa} min={0} max={0.3} step={0.005} onChange={setFa} digits={3} /></Controls>
    <Bars items={[{ label: 'faulty', value: f.faulty, color: '#ef4444' }, { label: 'true alarms', value: f.tp, highlight: true }, { label: 'false alarms', value: f.fp, color: 'var(--chart-val)' }, { label: 'all alarms', value: f.tp + f.fp, color: 'var(--muted)' }]} digits={1} label="Expected counts among 1000 machines" />
    <Readout>Per 1,000 machines: {r(f.tp, 1)} true alarms and {r(f.fp, 1)} false alarms. P(fault | alarm) = {r(f.tp, 1)} / {r(f.tp + f.fp, 1)} = <strong>{r(post, 4)}</strong>.</Readout>
  </div>
}

export function InspectDecision() {
  const [post, setPost] = useState(0.154), [miss, setMiss] = useState(10000), [inspect, setInspect] = useState(200)
  const ignoreLoss = post * miss
  return <div>
    <Controls><Slider label="P(fault | alarm)" value={post} min={0} max={1} step={0.001} onChange={setPost} digits={3} /><Slider label="cost of a missed fault ($)" value={miss} min={500} max={20000} step={500} onChange={setMiss} digits={0} /><Slider label="cost of an inspection ($)" value={inspect} min={50} max={2000} step={50} onChange={setInspect} digits={0} /></Controls>
    <Bars items={[{ label: 'expected loss if ignored', value: ignoreLoss, color: '#ef4444' }, { label: 'cost of inspecting', value: inspect }]} digits={0} />
    <Readout>{r(post, 3)} × ${miss.toLocaleString()} = ${r(ignoreLoss, 0)} {ignoreLoss > inspect ? '> ' : '≤ '}${inspect}: <strong>{ignoreLoss > inspect ? 'inspect' : 'ignore'}</strong>. Break-even posterior = {inspect}/{miss} = {r(inspect / miss, 3)}.</Readout>
  </div>
}

// ---------- 04.6 ----------
export function SimVersusExact() {
  const [logN, setLogN] = useState(4), [seed, setSeed] = useState(1), n = Math.round(10 ** logN), prior = 0.02
  const sim = useMemo(() => simulateAlarms({ n, prior, seed }), [n, seed]), exact = posterior(prior, 0.9, 0.05)
  const alarms = sim.counts.tp + sim.counts.fp, est = alarms ? sim.counts.tp / alarms : NaN, se = alarms ? standardError(est, alarms) : NaN, z = (est - exact) / se
  return <div>
    <Controls><Slider label="machines = 10^" value={logN} min={2} max={5.5} step={0.5} onChange={setLogN} digits={1} /><button onClick={() => setSeed(s => s + 1)}>New seed ({seed})</button></Controls>
    <MiniPlot x={[0, n]} y={[0, 0.6]} xLabel="machines simulated" yLabel="P̂(fault | alarm)" label="Simulated estimate converging to the exact posterior">{({ X, Y }) => <>
      <HLine X={X} Y={Y} y={exact} x0={0} x1={n} />
      <Path X={X} Y={Y} points={sim.trace.filter(t => Number.isFinite(t.estimate)).map(t => [t.n, t.estimate])} />
    </>}</MiniPlot>
    <Readout>{n.toLocaleString()} machines produced {alarms} alarms (the relevant n). Estimate {r(est, 4)} ± {r(se, 4)}; exact {r(exact, 4)}; difference = <strong>{r(z, 2)} standard errors</strong> {Math.abs(z) < 3 ? '— consistent.' : '— suspect a bug.'}</Readout>
  </div>
}

export function PlantedBug() {
  const [bug, setBug] = useState('none'), prior = 0.02, n = 100000
  const sim = useMemo(() => simulateAlarms({ n, prior, seed: 4 }), []), exact = posterior(prior, 0.9, 0.05), c = sim.counts
  const est = bug === 'wrong-group' ? c.tp / (c.tp + c.fn) : bug === 'all-machines' ? c.tp / n : c.tp / (c.tp + c.fp)
  const denom = bug === 'wrong-group' ? c.tp + c.fn : bug === 'all-machines' ? n : c.tp + c.fp, se = standardError(est, denom), z = (est - exact) / se
  return <div>
    <Controls><Choice label="estimate computed as" value={bug} onChange={setBug} options={[['none', 'faults among alarms (correct)'], ['wrong-group', 'alarms among faults (conditioned on the wrong group)'], ['all-machines', 'true alarms among all machines']]} /></Controls>
    <Table head={['', 'value']} rows={[['exact P(fault | alarm)', r(exact, 4)], ['simulated estimate', r(est, 4)], ['standard error', r(se, 5)], ['difference in standard errors', r(z, 1)]]} label="Simulation against the exact formula" />
    <Readout>{Math.abs(z) < 3 ? 'Within 3 standard errors: the two routes agree.' : <strong>{r(Math.abs(z), 0)} standard errors apart — far beyond chance. The simulation or the formula has a bug.</strong>}</Readout>
  </div>
}
