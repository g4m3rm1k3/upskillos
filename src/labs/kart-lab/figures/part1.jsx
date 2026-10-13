// Part 1 figures: a lap step by step, both tracks with moving sweepers, where an action leads, swept
// contact between two moving boxes, and the reward of each action at a barrier.
import { useMemo, useState } from 'react'
import { ACTIONS, SUNLIT, HARBOUR, TRACKS, SIZE, reset, step, intent, contact, careful, randomDriver, flatOut, scriptedTraffic, sweeperLane } from '../engine/kart.js'
import { RoadView, Slider, fmt } from './ui.jsx'

const DRIVERS = { careful: ['Careful rule', () => careful], random: ['Random', () => randomDriver(3)], flat: ['Flat out', () => flatOut] }

// 1.1: one lap, recorded, then stepped through.
export function LapPlayer() {
  const [who, setWho] = useState('careful'), [seed, setSeed] = useState(800001), [track, setTrack] = useState('sunlit'), [i, setI] = useState(0)
  const steps = useMemo(() => {
    const policy = DRIVERS[who][1](), t = TRACKS[track], out = []
    let state = reset(seed)
    while (!state.done) { const cars = scriptedTraffic(state.ticks, seed, t), action = policy(state, cars, t), next = step(state, action, t, cars); out.push({ state, cars, action, next }); state = next }
    return out
  }, [who, seed, track])
  const k = Math.min(i, steps.length - 1), s = steps[k]
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>Driver <select value={who} onChange={e => { setWho(e.target.value); setI(0) }}>{Object.entries(DRIVERS).map(([id, [name]]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label>Track <select value={track} onChange={e => { setTrack(e.target.value); setI(0) }}><option value="sunlit">Sunlit Circuit</option><option value="harbour">Harbour Loop</option></select></label>
      <label>Lap seed <input type="number" min="0" value={seed} onChange={e => { setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0))); setI(0) }} /></label>
      <Slider label="step" value={k + 1} min={1} max={steps.length} onChange={v => setI(v - 1)} />
      <div className="qm-buttons"><button disabled={k === 0} onClick={() => setI(k - 1)}>←</button><button disabled={k === steps.length - 1} onClick={() => setI(k + 1)}>→</button></div>
    </div>
    <RoadView track={TRACKS[track]} state={s.state} cars={s.cars} planned={intent(s.state, s.action)} />
    <table className="qm-kv"><tbody>
      <tr><td>state</td><td className="mono">p {s.state.p} · lane {s.state.lane} · speed {s.state.speed} · tick {s.state.ticks} · crashes {s.state.crashes}</td></tr>
      <tr><td>action</td><td><b>{ACTIONS[s.action]}</b></td></tr>
      <tr><td>reward</td><td className="mono">{Object.entries(s.next.last.parts).map(([k, v]) => `${k} ${fmt(v, 2)}`).join(' · ')} = <b>{fmt(s.next.last.reward, 2)}</b>{s.next.last.hit ? ` (hit a ${s.next.last.hit})` : ''}</td></tr>
    </tbody></table>
    <p className="qm-hint">This lap: {steps.length} decisions, {steps.at(-1).next.crashes} collisions, {steps.at(-1).next.finished ? 'finished' : 'did not finish'}, total reward {fmt(steps.at(-1).next.total, 2)}.</p>
  </div>
}

// 1.2: both tracks unrolled, sweepers moving with time.
export function TrackMap() {
  const [tick, setTick] = useState(0)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="tick" value={tick} min={0} max={47} onChange={setTick} /></div>
    {[SUNLIT, HARBOUR].map(t => <div key={t.id} className="kl-trackmap"><h4>{t.name}</h4>
      {[0, 48, 96].map(from => <RoadView key={from} track={t} tick={tick} from={from} span={48} label={`${t.name}, sectors ${from} to ${from + 47}`} />)}
      <p className="qm-hint">Sweepers at tick {tick}: {t.sweepers.map(([p, o]) => `sector ${p}, lane ${fmt(sweeperLane(tick, o), 2)}`).join('; ')}.</p></div>)}
  </div>
}

// 1.3: an action's planned move.
export function IntentFig() {
  const [lane, setLane] = useState(1), [speed, setSpeed] = useState(1), [action, setAction] = useState(3)
  const state = { ...reset(1, lane), p: 40, speed, ticks: 200 }, plan = intent(state, action)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="lane" value={lane} min={0} max={2} onChange={setLane} /><Slider label="speed tier" value={speed} min={0} max={2} onChange={setSpeed} />
      <label>Action <select value={action} onChange={e => setAction(Number(e.target.value))}>{ACTIONS.map((a, i) => <option key={a} value={i}>{a}</option>)}</select></label></div>
    <RoadView track={{ ...SUNLIT, barriers: [], sweepers: [] }} state={state} planned={plan} from={38} span={10} />
    <p className="mono">intent → lane {plan.lane} → {plan.nextLane}, speed {speed} → {plan.speed}, p {plan.p} → {plan.nextP} ({plan.speed + 1} sectors)</p>
  </div>
}

// 1.4: two moving boxes over one tick, and the intervals where each direction overlaps.
export function ContactFig() {
  const [gap, setGap] = useState(3), [u, setU] = useState(-3), [laneGap, setLaneGap] = useState(0), [laneU, setLaneU] = useState(0)
  const a = { p: 0, lane: 0, nextP: 0, nextLane: 0 }, b = { p: gap, lane: laneGap, nextP: gap + u, nextLane: laneGap + laneU }
  const interval = (d, v) => Math.abs(v) < 1e-9 ? (Math.abs(d) < SIZE ? [0, 1] : null) : [Math.max(0, Math.min((-SIZE - d) / v, (SIZE - d) / v)), Math.min(1, Math.max((-SIZE - d) / v, (SIZE - d) / v))]
  const along = interval(gap, u), across = interval(laneGap, laneU)
  const touch = contact(a, b, 144), W = 440, X = t => 20 + t * (W - 40)
  const band = (iv, y, color, label) => <g>{iv && iv[0] < iv[1] && <rect x={X(iv[0])} width={X(iv[1]) - X(iv[0])} y={y} height="14" fill={color} opacity="0.6" />}<text x="4" y={y + 11} className="qm-tick">{label}</text></g>
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="gap along" value={gap} min={-4} max={4} step={0.5} onChange={setGap} /><Slider label="change along" value={u} min={-4} max={4} step={0.5} onChange={setU} /><Slider label="gap across" value={laneGap} min={-2} max={2} step={0.25} onChange={setLaneGap} /><Slider label="change across" value={laneU} min={-1} max={1} step={0.25} onChange={setLaneU} /></div>
    <svg viewBox={`0 0 ${W} 70`} className="qm-plot" role="img" aria-label="Overlap intervals during one tick">
      {band(along, 6, '#1f6f68', 'along')}{band(across, 26, '#5b4bb5', 'across')}
      <line x1={X(0)} x2={X(1)} y1="54" y2="54" stroke="#999" /><text x={X(0)} y="66" className="qm-tick">τ = 0</text><text x={X(1)} y="66" className="qm-tick" textAnchor="end">τ = 1</text>
    </svg>
    <p>Along: {along ? `${fmt(along[0], 3)} to ${fmt(along[1], 3)}` : 'never'} · across: {across ? `${fmt(across[0], 3)} to ${fmt(across[1], 3)}` : 'never'} → <b>{touch ? 'contact' : 'no contact'}</b></p>
  </div>
}

// 1.5: every action from sector 12, middle lane, with the barrier at 15.
export function RewardFig() {
  const state = { ...reset(1, 1), p: 12, speed: 1, ticks: 200 }
  const track = { ...SUNLIT, sweepers: [] }
  return <div className="qm-fig">
    <RoadView track={track} state={state} from={10} span={10} />
    <table className="qm-mathcode"><thead><tr><th>Action</th><th>Move</th><th>progress</th><th>time</th><th>collision</th><th>reward</th></tr></thead>
      <tbody>{ACTIONS.map((a, i) => { const n = step(state, i, track); return <tr key={a}><td>{a}</td><td className="mono">{n.last.hit ? `hit the ${n.last.hit}` : `→ ${n.p}, lane ${n.lane}`}</td><td>{fmt(n.last.parts.progress, 2)}</td><td>−0.20</td><td>{n.last.parts.collision}</td><td><b>{fmt(n.last.reward, 2)}</b></td></tr> })}</tbody></table>
  </div>
}
