import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ACTIONS, DT, LENGTH, OBSTACLES, observe } from './engine/game.js'
import { unpack, values } from './engine/learning.js'
const Scene = lazy(() => import('./Scene.jsx'))
const COLORS = ['#159a87', '#e86e55', '#9675d0']
import { createRace, stepRace, rankRace, tournament } from './engine/race.js'
const initial = createRace
export function Sensors({ car, traffic = [], model, qValues }) {
  const obs = observe(car, traffic), q = qValues ?? (model ? values(model, obs.key) : [0, 0, 0, 0, 0])
  const max = Math.max(1, ...q.map(Math.abs))
  return <div className="kl-sensors">
    <div className="kl-readouts"><span>Sector <b>{obs.sector}</b></span><span>Lane <b>{obs.lane + 1}</b></span><span>Speed tier <b>{obs.speed + 1}</b></span><span>Traffic mask <b>{obs.mask.toString(2).padStart(3, '0')}</b></span><span>State key <b>{obs.key}</b></span></div>
    <div className="kl-road" role="img" aria-label={`Three-lane sensor view. Driver in lane ${car.lane + 1}`}>
      {[0, 1, 2].map(lane => <div key={lane} className="kl-lane"><span>Lane {lane + 1}</span>
        {OBSTACLES.filter(o => o.lane === lane && ((o.p - obs.sector + LENGTH) % LENGTH) < 12).map(o => <b className="kl-barrier" key={o.p} style={{ bottom: `${22 + ((o.p - obs.sector + LENGTH) % LENGTH) * 5}%` }}>▰</b>)}
        {(obs.mask & (1 << lane)) !== 0 && <b className="kl-traffic">●</b>}
        {lane === car.lane && <b className="kl-you">▲</b>}
      </div>)}
    </div>
    <p className="qm-hint">▲ followed driver · orange barriers · ● traffic within three sectors. The policy knows its sector on this fixed circuit; it does not see pixels.</p>
    <div className="kl-values">{ACTIONS.map((a, i) => <div key={a}><span>{a}</span><div><i style={{ width: `${Math.abs(q[i]) / max * 100}%`, background: q[i] < 0 ? '#da8069' : '#3fa992' }} /></div><code>{q[i].toFixed(2)}</code></div>)}</div>
    <p className="qm-hint">{model?.b ? 'Displayed values are QA + QB.' : 'Expected discounted reward for each action.'} Unseen states start at zero.</p>
  </div>
}
export default function Arena({ drivers, compact = false, session }) {
  const [seats, setSeats] = useState(() => session?.current?.seats?.map(id => id === 'human' || drivers.some(d => d.id === id) ? id : drivers[0].id) ?? drivers.slice(0, 3).map(d => d.id))
  const [running, setRunning] = useState(false), [follow, setFollow] = useState(session?.current?.follow ?? 0), [cameraMode, setCameraMode] = useState('chase')
  const [snapshot, setSnapshot] = useState(() => session?.current?.snapshot ?? initial()), [history, setHistory] = useState(() => session?.current?.history ?? []), [replay, setReplay] = useState(null)
  const [slow, setSlow] = useState(false), [inspect, setInspect] = useState(!compact)
  const race = useRef(snapshot), view = useRef(race.current), keys = useRef(new Set()), recording = useRef(history.length ? history : [snapshot]), root = useRef(null)
  const [cup, setCup] = useState(null)
  const models = useMemo(() => seats.map(id => id === 'human' ? null : unpack(drivers.find(d => d.id === id)?.checkpoint ?? drivers[0].checkpoint)), [drivers, seats])
  const names = seats.map(id => id === 'human' ? 'You' : drivers.find(d => d.id === id)?.name ?? 'Driver')
  const tick = (override) => {
    const old = race.current
    if (old.cars.every(c => c.done)) { setRunning(false); return }
    const humanAction = keys.current.has('ArrowLeft') || keys.current.has('a') ? 0 : keys.current.has('ArrowRight') || keys.current.has('d') ? 2 : keys.current.has('ArrowDown') || keys.current.has('s') ? 4 : keys.current.has('ArrowUp') || keys.current.has('w') ? 3 : 1
    race.current = stepRace(old, models, typeof override === 'number' ? override : humanAction)
    view.current = race.current
    recording.current.push(race.current)
    setSnapshot(race.current)
    if (!running || race.current.cars.every(c => c.done)) setHistory([...recording.current])
    if (race.current.cars.every(c => c.done)) setRunning(false)
  }
  useEffect(() => {
    if (session) session.current = { seats, follow, snapshot, history: recording.current }
  }, [seats, follow, snapshot, session])
  const tickRef = useRef(tick); tickRef.current = tick
  useEffect(() => {
    if (!running) return
    let frame, previous = null, elapsed = 0
    const animate = now => {
      if (previous !== null) elapsed += Math.min(0.1, (now - previous) / 1000)
      previous = now
      if (elapsed >= DT * (slow ? 3 : 1)) { elapsed -= DT * (slow ? 3 : 1); tickRef.current() }
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    const blur = () => { keys.current.clear(); setRunning(false); setHistory([...recording.current]) }
    const hide = () => { if (document.hidden) blur() }
    window.addEventListener('blur', blur); document.addEventListener('visibilitychange', hide)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', hide) }
  }, [running, slow])
  const restart = () => { setRunning(false); race.current = initial(); view.current = race.current; setSnapshot(race.current); recording.current = [race.current]; setHistory([]); setReplay(null); keys.current.clear(); setCup(null) }
  const shown = replay === null ? snapshot : history[replay] ?? snapshot
  view.current = shown
  const car = shown.cars[follow], traffic = shown.cars.filter((c, i) => i !== follow && !c.done)
  const order = rankRace(shown)
  const finished = snapshot.cars.every(c => c.done)
  const driveKey = e => ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)
  return <section className="kl-arena" ref={root} tabIndex={0} aria-label="Race controls" onKeyDown={e => { if (e.target !== root.current || !driveKey(e)) return; e.preventDefault(); keys.current.add(e.key); if (!running && replay === null && seats.includes('human')) tick() }} onKeyUp={e => keys.current.delete(e.key)} onBlur={() => keys.current.clear()}>
    <div className="kl-arena-title"><div><span className="qm-eyebrow">SUNLIT CIRCUIT / THREE LAPS</span><h2>Little karts. Learned instincts.</h2></div><span className="kl-live">{replay !== null ? 'REPLAY' : running ? 'RACING' : finished ? 'FINISHED' : snapshot.tick ? 'PAUSED' : 'GRID READY'}</span></div>
    <div className="kl-grid-select">{seats.map((id, i) => <label key={i}><span style={{ color: COLORS[i] }}>● Seat {i + 1}</span><select aria-label={`Seat ${i + 1}`} value={id} disabled={running || snapshot.tick > 0} onChange={e => { const next = [...seats]; next[i] = e.target.value; setSeats(next); setCup(null); if (e.target.value === 'human') setFollow(i) }}>
      <option value="human" disabled={seats.some((s, j) => s === 'human' && j !== i)}>You · keyboard / touch</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
    </select></label>)}</div>
    <div className="kl-viewport" onPointerDown={() => root.current?.focus()}><Suspense fallback={<div className="kl-webgl">Preparing Sunlit Circuit…</div>}><Scene race={view} follow={follow} cameraMode={cameraMode} tick={shown.tick} /></Suspense>
      <div className="kl-hud"><span>FOLLOWING <b>{names[follow]}</b></span><span>LAP <b>{Math.min(3, Math.floor(car.p / LENGTH) + 1)} / 3</b></span><span>TIME <b>{(shown.tick * DT).toFixed(1)} s</b></span><span>HITS <b>{car.crashes}</b></span></div>
      <div className="kl-leaderboard">{order.map((c, i) => <button key={c.i} aria-label={`Follow ${names[c.i]}`} onClick={() => setFollow(c.i)} className={follow === c.i ? 'selected' : ''}><b>{i + 1}</b><i style={{ background: COLORS[c.i] }} /><span>{names[c.i]}</span><small>{c.finished ? `${(c.ticks * DT).toFixed(1)}s` : c.done ? 'DNF' : `${Math.round(c.p / (LENGTH * 3) * 100)}%`}</small></button>)}</div>
    </div>
    <div className="qm-buttons kl-toolbar">
      <button className="qm-primary" disabled={finished || replay !== null} onClick={() => { setRunning(!running); if (running) setHistory([...recording.current]); else root.current?.focus() }}>{running ? 'Pause race' : snapshot.tick ? 'Resume race' : 'Start race'}</button>
      <button disabled={running || finished || replay !== null} onClick={() => tick()}>One decision</button>
      <button onClick={restart}>Reset grid</button>
      <label><input type="checkbox" checked={slow} onChange={e => setSlow(e.target.checked)} /> Slow motion</label>
      <select aria-label="Camera" value={cameraMode} onChange={e => setCameraMode(e.target.value)}><option value="chase">Chase camera</option><option value="overview">Grandstand</option></select>
      <button aria-pressed={inspect} onClick={() => setInspect(!inspect)}>{inspect ? 'Hide' : 'Show'} agent inspector</button>
    </div>
    {finished && replay === null && <div className="kl-results" role="status"><span className="qm-eyebrow">CHEQUERED FLAG</span><h3>{order[0].finished ? `${names[order[0].i]} ${order.filter(c => c.finished && c.ticks === order[0].ticks).length > 1 ? 'shares first place' : 'wins'}` : 'No finishers this time'}</h3><p>Inspect a decision in the replay, or reset the grid for another race.</p></div>}
    <p className="qm-hint">All NPCs use frozen trained policies. Choose a “You” seat to join. Focus the arena, then use ← / → to change lane, ↑ to accelerate, ↓ to brake. Steering follows the track between lane changes. Reset to change the grid. Click the track to return keyboard focus; when paused, a driving key takes one decision.</p>
    {seats.includes('human') && <div className="kl-touch">{[['← Left', 'ArrowLeft'], ['Accelerate', 'ArrowUp'], ['Brake', 'ArrowDown'], ['Right →', 'ArrowRight']].map(([name, key]) => <button key={key} disabled={finished || replay !== null} onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); keys.current.add(key); if (!running && replay === null) tick(key === 'ArrowLeft' ? 0 : key === 'ArrowRight' ? 2 : key === 'ArrowUp' ? 3 : 4) }} onPointerUp={() => keys.current.delete(key)} onPointerCancel={() => keys.current.delete(key)} onLostPointerCapture={() => keys.current.delete(key)}>{name}</button>)}</div>}
    {!running && history.length > 0 && <div className="kl-replay"><label>Replay decision {replay ?? history.length - 1}<input aria-label="Replay decision" type="range" min="0" max={history.length - 1} value={replay ?? history.length - 1} onChange={e => setReplay(Number(e.target.value))} /></label><button onClick={() => setReplay(null)}>Return to live race</button></div>}
    {inspect && <div className="kl-inspector"><div><h3>{names[follow]} · observation → action</h3><Sensors car={car} traffic={traffic} model={models[follow]} /></div><div><h3>Last transition</h3>{car.last ? <><p>Action: <strong>{ACTIONS[car.last.action]}</strong></p><dl className="kl-rewards">{Object.entries(car.last.parts).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v.toFixed(2)}</dd></div>)}<div><dt>Total reward</dt><dd>{car.last.reward.toFixed(2)}</dd></div></dl></> : <p>Take one decision to inspect its reward.</p>}<p className="qm-hint">Values describe the current state; the reward describes the previous action. No Q-values change during a race. Race traffic comes from other drivers, unlike the scripted traffic used in training.</p></div></div>}
    <section className="qm-fig kl-save"><h3>Grid-swap tournament</h3><p>Run these three model seats through all six starting-lane permutations, without rendering. The same frozen policies and race engine are used. First / second / third earn 3 / 2 / 1 points; tied finishers share points and failures earn zero.</p><button disabled={running || seats.includes('human')} onClick={() => setCup({ result: tournament(models), names: [...names] })}>Run six-race tournament</button>{seats.includes('human') && <p className="qm-hint">Assign a model to every seat to run a tournament.</p>}
      {cup && <div className="kl-table-scroll"><table className="qm-mathcode"><caption>Six deterministic races · every starting position covered</caption><thead><tr><th>Entry</th><th>Points</th><th>Finishes</th><th>Mean hits</th><th>Mean finished time</th></tr></thead><tbody>{cup.result.totals.map(t => <tr key={t.i}><td>{cup.names[t.i]} (entry {t.i + 1})</td><td>{t.points.toFixed(1)}</td><td>{t.finishes}/6</td><td>{(t.crashes / 6).toFixed(2)}</td><td>{t.finishes ? `${(t.ticks / t.finishes * DT).toFixed(1)} s` : '—'}</td></tr>)}</tbody></table><p className="qm-hint">Repeating this deterministic tournament gives the same result. Test other opponents and independently trained checkpoints to broaden the evidence.</p></div>}
    </section>
  </section>
}
