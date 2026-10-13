// Part 4 and 5 figures: every recipe on both tracks, the sensors at work, the linear driver trained
// live, a race tick by tick, and a tournament of any three drivers.
import { useMemo, useState } from 'react'
import { ACTIONS, SUNLIT, HARBOUR, TRACKS, reset, sensors, sensorKey, scriptedTraffic } from '../engine/kart.js'
import { trainLinear, evaluateLinear, FEATURE_NAMES, unpack, policyOf } from '../engine/tabular.js'
import { createRace, stepRace, rankRace, tournament, ORDERS } from '../engine/race.js'
import M from '../engine/measured.json'
import baselines from '../baselines.json'
import { RoadView, Slider, COLORS, pct, fmt } from './ui.jsx'

const ROW_NAMES = { 'q-sector': 'Q-learning, sector', 'sarsa-sector': 'SARSA, sector', 'double-sector': 'Double Q, sector', 'q-sensors': 'Q-learning, sensors', 'sarsa-sensors': 'SARSA, sensors', 'double-sensors': 'Double Q, sensors', 'linear-0.01': 'Linear, α 0.01', 'linear-0.02': 'Linear, α 0.02' }
const measured = id => id.startsWith('linear-') ? M.linear[id.slice(7)] : M.tables[id]
// 4.1, 4.4: recipes on the practice track and the unseen one.
export function TransferTable({ rows = ['q-sector', 'q-sensors'] }) {
  return <div className="qm-fig"><table className="qm-mathcode"><thead><tr><th>Recipe (5 seeds)</th><th>Sunlit: finished</th><th>Harbour (never seen)</th><th>Harbour, per seed</th></tr></thead>
    <tbody>{rows.map(id => { const m = measured(id); return <tr key={id}><td>{ROW_NAMES[id]}</td><td>{pct(m.sunlit)}</td><td><b>{pct(m.harbour)}</b></td><td className="mono">{m.runs.map(r => Math.round(100 * r.harbour[0])).join(' ')}</td></tr> })}</tbody></table></div>
}

// 4.2: the sensor readings at one moment, on either track.
export function SensorFig() {
  const [track, setTrack] = useState('sunlit'), [p, setP] = useState(11), [lane, setLane] = useState(1), [tick, setTick] = useState(0)
  const t = TRACKS[track], state = { ...reset(1, lane), p, speed: 2, ticks: tick }, cars = scriptedTraffic(tick, 7, t), near = sensors(state, cars, t)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>Track <select value={track} onChange={e => setTrack(e.target.value)}><option value="sunlit">Sunlit Circuit</option><option value="harbour">Harbour Loop</option></select></label>
      <Slider label="sector" value={p} min={0} max={140} onChange={setP} /><Slider label="lane" value={lane} min={0} max={2} onChange={setLane} /><Slider label="tick" value={tick} min={0} max={47} onChange={setTick} /></div>
    <RoadView track={t} state={state} cars={cars} from={p} span={10} />
    <p>Readings, lanes 0 to 2: <b className="mono">[{near.join(', ')}]</b> ({near.map(n => ['clear', 'within 6', 'within 3'][n]).join(' · ')}) · speed tier 2 · sensor key <b>{sensorKey(state, cars, t)}</b></p>
  </div>
}

// 4.3: train the linear driver in the browser and read its weights.
export function LinearFig() {
  const [alpha, setAlpha] = useState(0.02), [episodes, setEpisodes] = useState(1000), [seed, setSeed] = useState(19), [result, setResult] = useState(null)
  const run = () => { const w = trainLinear({ alpha, episodes, seed }); setResult({ w, sunlit: evaluateLinear(w, SUNLIT), harbour: evaluateLinear(w, HARBOUR) }) }
  const top = result ? Math.max(1e-9, ...result.w.flat().map(Math.abs)) : 1
  return <div className="qm-fig">
    <div className="qm-fig-controls"><label>α <select value={alpha} onChange={e => { setAlpha(Number(e.target.value)); setResult(null) }}>{[0.005, 0.01, 0.02, 0.05, 0.1].map(a => <option key={a} value={a}>{a}</option>)}</select></label>
      <label>Laps <select value={episodes} onChange={e => { setEpisodes(Number(e.target.value)); setResult(null) }}>{[300, 1000, 2500].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <label>Seed <input type="number" min="0" value={seed} onChange={e => { setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0))); setResult(null) }} /></label>
      <button className="qm-primary" onClick={run}>Train and test</button></div>
    {result ? <>
      <p>Test, 50 held-out laps: Sunlit <b>{pct(result.sunlit[0])}</b> · Harbour <b>{pct(result.harbour[0])}</b></p>
      <div className="kl-weights"><table><thead><tr><th>feature</th>{ACTIONS.map(a => <th key={a}>{a}</th>)}</tr></thead>
        <tbody>{FEATURE_NAMES.map((name, i) => <tr key={name}><td>{name}</td>{ACTIONS.map((a, k) => { const v = result.w[k][i]; return <td key={a} style={{ background: v >= 0 ? `rgba(31,111,104,${Math.abs(v) / top})` : `rgba(192,83,58,${Math.abs(v) / top})` }}>{fmt(v, 2)}</td> })}</tr>)}</tbody></table></div>
    </> : <p className="qm-hint">Press Train and test. Green weights raise an action's value when their feature is on; red ones lower it.</p>}
  </div>
}

const driverOf = id => policyOf(unpack(baselines.find(d => d.id === id).checkpoint))
// 5.1: a race recorded tick by tick.
export function RaceReplay() {
  const [ids, setIds] = useState(['mint', 'sky', 'ember']), [t, setT] = useState(0)
  const ticks = useMemo(() => {
    const pols = ids.map(driverOf), out = []
    let race = createRace()
    out.push(race)
    while (!race.cars.every(c => c.done)) { race = stepRace(race, pols); out.push(race) }
    return out
  }, [ids.join()])
  const k = Math.min(t, ticks.length - 1), race = ticks[k], lead = race.cars.reduce((m, c) => Math.max(m, c.p), 0)
  return <div className="qm-fig">
    <div className="qm-fig-controls">{ids.map((id, i) => <label key={i}>Lane {i} <select value={id} onChange={e => { setIds(x => x.map((y, j) => j === i ? e.target.value : y)); setT(0) }}>{baselines.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>)}
      <Slider label="tick" value={k} min={0} max={ticks.length - 1} onChange={setT} /></div>
    <RoadView state={null} karts={race.cars.filter(c => !c.done).map((c, i) => ({ p: c.p % 144, lane: c.lane, color: COLORS.race[race.cars.indexOf(c)], label: race.cars.indexOf(c) }))} from={Math.max(0, (lead % 144) - 8)} span={20} tick={race.tick} />
    <table className="qm-mathcode"><thead><tr><th>Lane</th><th>Driver</th><th>Last action</th><th>Lap progress</th><th>Bumps</th><th>Status</th></tr></thead>
      <tbody>{race.cars.map((c, i) => <tr key={i}><td style={{ color: COLORS.race[i] }}>■ {i}</td><td>{baselines.find(b => b.id === ids[i]).name}</td><td>{race.actions ? ACTIONS[race.actions[i]] : '—'}{c.last?.hit ? ` (hit a ${c.last.hit})` : ''}</td><td>{c.p} / 432</td><td>{c.crashes}</td><td>{c.finished ? `finished, tick ${c.ticks}` : c.done ? 'out' : 'racing'}</td></tr>)}</tbody></table>
    {k === ticks.length - 1 && <p>Result: {rankRace(race).map(i => baselines.find(b => b.id === ids[i]).name).join(' → ')}</p>}
  </div>
}

// 5.2: any three drivers, all six starting orders.
export function TournamentFig() {
  const [ids, setIds] = useState(['mint', 'coral', 'violet']), [result, setResult] = useState(null)
  const run = () => setResult(tournament(ids.map(driverOf)))
  return <div className="qm-fig">
    <div className="qm-fig-controls">{ids.map((id, i) => <label key={i}>Driver {i + 1} <select value={id} onChange={e => { setIds(x => x.map((y, j) => j === i ? e.target.value : y)); setResult(null) }}>{baselines.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>)}
      <button className="qm-primary" onClick={run}>Run six races</button></div>
    {result && <>
      <table className="qm-mathcode"><thead><tr><th>Race</th><th>Lane 0</th><th>Lane 1</th><th>Lane 2</th></tr></thead>
        <tbody>{result.races.map(({ order, race }, r) => <tr key={r}><td>{r + 1}</td>{race.cars.map((c, seat) => <td key={seat}>{baselines.find(b => b.id === ids[order[seat]]).name.split(' ')[0]}: {c.finished ? `${c.ticks} ticks` : `out (${c.crashes} bumps)`}</td>)}</tr>)}</tbody></table>
      <p>Points: {ids.map((id, i) => `${baselines.find(b => b.id === id).name} ${result.points[i]} (${result.finishes[i]} of ${ORDERS.length} finished)`).join(' · ')}</p>
    </>}
  </div>
}
