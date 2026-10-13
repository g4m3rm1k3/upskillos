// Part 2 and 3 figures: the observation key, the hazard mask, aliasing, learned rows, the
// exploration schedule, one update, learning curves, training in the browser, maximisation bias and
// the spread over training seeds.
import { useMemo, useState } from 'react'
import Plot from '../../cartpole-lab/figures/Plot.jsx'
import { ACTIONS, SUNLIT, HARBOUR, reset, step, observe, hazardMask, decodeKey } from '../engine/kart.js'
import { DEFAULTS, train, evaluate, update, actionValues, argmax, unpack } from '../engine/tabular.js'
import M from '../engine/measured.json'
import baselines from '../baselines.json'
import { RoadView, Slider, ActionBars, pct, fmt } from './ui.jsx'

// 2.1: build a key from its parts, or decode one.
export function KeyFig() {
  const [sector, setSector] = useState(12), [lane, setLane] = useState(1), [speed, setSpeed] = useState(1), [mask, setMask] = useState(0)
  const key = ((sector * 3 + lane) * 3 + speed) * 8 + mask
  const [typed, setTyped] = useState('3609'), d = decodeKey(Math.max(0, Math.min(10367, Math.floor(Number(typed) || 0))))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="sector" value={sector} min={0} max={143} onChange={setSector} /><Slider label="lane" value={lane} min={0} max={2} onChange={setLane} /><Slider label="speed" value={speed} min={0} max={2} onChange={setSpeed} /><Slider label="mask" value={mask} min={0} max={7} onChange={setMask} /></div>
    <p className="mono">(({sector} × 3 + {lane}) × 3 + {speed}) × 8 + {mask} = <b>{key}</b></p>
    <label>Decode a key <input value={typed} onChange={e => setTyped(e.target.value)} inputMode="numeric" /></label>
    <p className="mono">sector {d.sector} · lane {d.lane} · speed {d.speed} · mask {d.mask} ({d.mask.toString(2).padStart(3, '0')})</p>
  </div>
}

// 2.2: a kart and a sweeper near ours; the bits they set.
export function MaskFig() {
  const [kartAhead, setKartAhead] = useState(2), [kartLane, setKartLane] = useState(0), [tick, setTick] = useState(10)
  const me = { ...reset(1, 1), p: 28, ticks: tick }, cars = [{ p: 28 + kartAhead, lane: kartLane, nextP: 29 + kartAhead, nextLane: kartLane }]
  const mask = hazardMask(me, cars, SUNLIT)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="kart ahead by" value={kartAhead} min={0} max={8} onChange={setKartAhead} /><Slider label="kart lane" value={kartLane} min={0} max={2} onChange={setKartLane} /><Slider label="tick (moves the sweeper at 32)" value={tick} min={0} max={47} onChange={setTick} /></div>
    <RoadView state={me} cars={cars} from={26} span={10} />
    <p>Bits (lane 2, 1, 0): <b className="mono">{mask.toString(2).padStart(3, '0')}</b> · mask = <b>{mask}</b></p>
  </div>
}

// 2.3: four situations, one key.
export function AliasFig() {
  const me = { ...reset(1, 0), p: 50, speed: 1, ticks: 200 }, track = { ...SUNLIT, sweepers: [] }
  return <div className="qm-fig">{[1, 2, 3, 4].map(d => { const cars = [{ p: 50 + d, lane: 0, nextP: 51 + d, nextLane: 0 }], n = step(me, 3, track, cars); return <div key={d} className="kl-alias">
    <RoadView track={track} state={me} cars={cars} from={48} span={9} width={300} /><span className="mono">key {observe(me, cars, track)} · Accelerate → {n.last.hit ? 'hit' : 'clear'} ({fmt(n.last.reward, 2)})</span></div> })}</div>
}

const model = id => unpack(baselines.find(d => d.id === id).checkpoint)
// 3.1: a learned driver's rows at a few places.
export function QRowFig() {
  const [id, setId] = useState('mint'), [p, setP] = useState(11), [lane, setLane] = useState(1), [speed, setSpeed] = useState(2)
  const m = useMemo(() => model(id), [id]), state = { ...reset(1, lane), p, speed, ticks: 100 }, cars = []
  const shown = actionValues(m.tables, observe(state, cars, SUNLIT))
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Driver <select value={id} onChange={e => setId(e.target.value)}>{baselines.filter(b => b.checkpoint.kind === 'table' && b.checkpoint.config.view === 'sector').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <Slider label="sector" value={p} min={0} max={140} onChange={setP} /><Slider label="lane" value={lane} min={0} max={2} onChange={setLane} /><Slider label="speed" value={speed} min={0} max={2} onChange={setSpeed} /></div>
    <RoadView state={state} from={Math.max(0, p - 2)} span={12} />
    <p>Key {observe(state, cars, SUNLIT)}: greedy action <b>{ACTIONS[argmax(shown)]}</b>{shown.every(v => v === 0) ? ' (never visited: all zeros, so Coast)' : ''}</p>
    <ActionBars values={shown} chosen={argmax(shown)} />
  </div>
}

// 3.2: the ε schedule.
export function EpsilonSchedule() {
  const [start, setStart] = useState(0.9), [floor, setFloor] = useState(0.04), E = 2500
  const values = Array.from({ length: 101 }, (_, i) => { const e = i * E / 100; return floor + (start - floor) * Math.max(0, 1 - e / Math.max(1, E * 0.8)) })
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="starting ε" value={start} min={0} max={1} step={0.05} onChange={setStart} show={v => v.toFixed(2)} /><Slider label="floor" value={floor} min={0} max={0.5} step={0.01} onChange={setFloor} show={v => v.toFixed(2)} /></div>
    <Plot series={[{ label: 'ε', color: '#1f6f68', values }]} window={1} x="% of 2,500 laps:" from={0} label="Exploration schedule" height={130} />
  </div>
}

// 3.3: one update with the real function.
export function UpdateFig() {
  const [method, setMethod] = useState('q'), [alpha, setAlpha] = useState(0.2), [gamma, setGamma] = useState(0.9), [done, setDone] = useState(false)
  const A = [1, 4, 2, 3, 0], B = [3, 1, 2, 2, 0]
  const result = useMemo(() => {
    const tables = method === 'double' ? [new Map([[0, [0, 2, 0, 0, 0]], [1, [...A]]]), new Map([[1, [...B]]])] : [new Map([[0, [0, 2, 0, 0, 0]], [1, [...A]]])]
    return update(tables, method, 0, 1, -1, 1, done, 0, alpha, gamma, { random: () => 0.25 })
  }, [method, alpha, gamma, done])
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Method <select value={method} onChange={e => setMethod(e.target.value)}><option value="q">Q-learning</option><option value="sarsa">SARSA</option><option value="double">Double Q-learning</option></select></label>
      <Slider label="α" value={alpha} min={0.1} max={1} step={0.1} onChange={setAlpha} show={v => v.toFixed(1)} /><Slider label="γ" value={gamma} min={0} max={1} step={0.1} onChange={setGamma} show={v => v.toFixed(1)} />
      <label><input type="checkbox" checked={done} onChange={e => setDone(e.target.checked)} /> the lap ended</label></div>
    <p>Old Q(s, Coast) = 2, reward −1. Next row{method === 'double' ? ' in table A' : ''}: {A.map((v, i) => `${ACTIONS[i]} ${v}`).join(', ')}{method === 'double' ? `; table B: ${B.join(', ')}` : ''}. {method === 'sarsa' ? 'The next action actually chosen is Left.' : ''}</p>
    <p className="mono">future = {done ? '0 (the lap ended)' : `${fmt(result.future, 2)} (${method === 'sarsa' ? 'Left, as chosen' : method === 'double' ? `A picks ${ACTIONS[result.chosen]}, B values it` : `the best: ${ACTIONS[result.chosen]}`})`}</p>
    <p className="mono">target = −1 + {gamma.toFixed(1)} × {fmt(result.future, 2)} = <b>{fmt(result.target, 3)}</b> · new Q = 2 + {alpha.toFixed(1)} × ({fmt(result.target, 3)} − 2) = <b>{fmt(result.after, 3)}</b></p>
  </div>
}

const CURVE_NAMES = { sector: 'Q-learning, sector', sensors: 'Q-learning, sensors', sarsa: 'SARSA, sector', double: 'Double Q, sector' }
const CURVE_COLORS = { sector: '#1f6f68', sensors: '#c26a12', sarsa: '#5b4bb5', double: '#b33f62' }
// 3.4, 3.5: recorded practice curves.
export function CurvesFig({ which = ['sector'] }) {
  return <div className="qm-fig"><Plot series={which.map(id => ({ label: CURVE_NAMES[id], color: CURVE_COLORS[id], values: M.curves[id] }))} window={1} x="× 100 laps" label="Average practice reward per lap" /></div>
}

// 3.4: train in the browser, then test frozen.
export function TrainerFig() {
  const [config, setConfig] = useState({ ...DEFAULTS, seed: 19, episodes: 1000 }), [result, setResult] = useState(null)
  const set = (k, v) => { setConfig(c => ({ ...c, [k]: v })); setResult(null) }
  const run = () => { const { tables, totals } = train(config); setResult({ totals, sunlit: evaluate(tables, config, SUNLIT), harbour: evaluate(tables, config, HARBOUR), keys: tables[0].size }) }
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>Method <select value={config.method} onChange={e => set('method', e.target.value)}><option value="q">Q-learning</option><option value="sarsa">SARSA</option><option value="double">Double Q</option></select></label>
      <label>Observation <select value={config.view} onChange={e => set('view', e.target.value)}><option value="sector">sector</option><option value="sensors">sensors</option></select></label>
      <label>Laps <select value={config.episodes} onChange={e => set('episodes', Number(e.target.value))}>{[300, 1000, 2500, 6000].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <label>Seed <input type="number" min="0" value={config.seed} onChange={e => set('seed', Math.max(0, Math.floor(Number(e.target.value) || 0)))} /></label>
      <button className="qm-primary" onClick={run}>Train and test</button>
    </div>
    {result ? <>
      <Plot series={[{ label: 'practice reward', color: '#1f6f68', values: result.totals }]} window={50} x="lap" label="Practice reward per lap" />
      <p>Test, 50 held-out laps: Sunlit <b>{pct(result.sunlit[0])}</b> finished ({fmt(result.sunlit[1], 2)} hits per lap) · Harbour <b>{pct(result.harbour[0])}</b> ({fmt(result.harbour[1], 2)}). Table rows filled: {result.keys.toLocaleString()}.</p>
    </> : <p className="qm-hint">Press Train and test: a few hundred milliseconds per thousand laps.</p>}
  </div>
}

// 3.6, 3.7: the fraction of runs going Left from A.
export function MaxBiasFig({ both = false }) {
  const series = [{ label: 'Q-learning', color: '#c26a12', values: M.maxbias.q }]
  if (both) series.push({ label: 'Double Q', color: '#1f6f68', values: M.maxbias.double })
  return <div className="qm-fig"><Plot series={series} refs={[{ value: 0.05, label: '5%' }]} window={1} x="episode" label="Fraction of 2,000 runs going Left" /></div>
}

// 3.9: every measured run, by recipe.
export function SeedsFig() {
  const ids = ['q-sector', 'sarsa-sector', 'double-sector', 'q-sector-penalty0', 'q-sector-penalty20', 'q-sector-500', 'q-sector-8000']
  const W = 460, X = v => 150 + v * (W - 170)
  return <div className="qm-fig"><svg viewBox={`0 0 ${W} ${ids.length * 24 + 24}`} className="qm-plot" role="img" aria-label="Finish rate per training seed">
    {ids.map((id, i) => <g key={id}><text x="4" y={i * 24 + 18} className="qm-tick">{id}</text>{M.tables[id].runs.map((r, k) => <circle key={k} cx={X(r.sunlit[0])} cy={i * 24 + 14} r="5" fill="#1f6f68" opacity="0.7"><title>seed {r.seed}: {pct(r.sunlit[0])}</title></circle>)}<line x1={X(M.tables[id].sunlit)} x2={X(M.tables[id].sunlit)} y1={i * 24 + 6} y2={i * 24 + 22} stroke="#c26a12" strokeWidth="2" /></g>)}
    {[0, 0.25, 0.5, 0.75, 1].map(t => <text key={t} x={X(t)} y={ids.length * 24 + 18} className="qm-tick" textAnchor="middle">{pct(t)}</text>)}
  </svg><p className="qm-hint">Dots: Sunlit test finish rate for each of the five training seeds. Orange: their mean.</p></div>
}

