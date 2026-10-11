import { useEffect, useMemo, useRef, useState } from 'react'
import Cart, { fmt } from './Cart.jsx'
import Plot from './Plot.jsx'
import { Slider } from '../../qmaze-lab/figures/ui.jsx'
import { CartPole, ACTION_NAMES, ARROWS, NAMES, SYMBOLS, UNITS, MEANINGS, LEFT, RIGHT, stepWorking } from '../engine/cartpole.js'
import { RULES, averageLength, play, discountedReturn } from '../engine/policies.js'

const deg = r => r * 180 / Math.PI

// Set the 4 numbers by hand and see the cart they describe, and whether the game would be over.
export function StateExplorer() {
  const [s, setS] = useState([0.3, 0.0, 0.08, 0.0])
  const set = (i, v) => setS(old => old.map((x, k) => k === i ? v : x))
  const env = new CartPole()
  const off = Math.abs(s[0]) > env.xLimit, fell = Math.abs(s[2]) > env.angleLimit
  const ranges = [[-3, 3, 0.01], [-3, 3, 0.01], [-0.4, 0.4, 0.001], [-3, 3, 0.01]]
  return <div className="qm-fig">
    <Cart state={s} fallen={off || fell} ghost={[s[0] - s[1] * 0.3, 0, s[2] - s[3] * 0.3, 0]} />
    {NAMES.map((n, i) => <div key={n} className="cp-slider-row">
      <span className="mono">{n} ({SYMBOLS[i]})</span>
      <input type="range" min={ranges[i][0]} max={ranges[i][1]} step={ranges[i][2]} value={s[i]} onChange={e => set(i, Number(e.target.value))} aria-label={n} />
      <b className="mono">{fmt(s[i])}</b><span className="qm-hint">{UNITS[i]}{i === 2 ? ` (${fmt(deg(s[2]), 1)}°)` : ''}</span>
    </div>)}
    <p className="mono">state = ({s.map(v => fmt(v)).join(', ')})</p>
    <p>{off ? <b>The cart is past ±2.4 m: the game is over (terminated).</b> : fell ? <b>The pole leans more than 12° ({fmt(env.angleLimit, 4)} rad): the game is over (terminated).</b> : 'Inside both limits: the game goes on.'} <span className="qm-hint">The faint copy is where the cart and pole were a moment ago, given their speeds.</span></p>
  </div>
}

// One step written out: every intermediate number of accelerations() and the four Euler updates.
export function StepWorking({ seed = 0 }) {
  const env = useMemo(() => new CartPole(), [])
  const [state, setState] = useState(() => new CartPole().reset(seed)[0])
  const [last, setLast] = useState(null)
  const [count, setCount] = useState(0)
  const push = action => {
    const w = stepWorking(env, state, action)
    setLast(w); setState(w.after); setCount(c => c + 1)
  }
  const restart = () => { setState(new CartPole().reset(seed)[0]); setLast(null); setCount(0) }
  const w = last
  const fell = Math.abs(state[0]) > env.xLimit || Math.abs(state[2]) > env.angleLimit
  return <div className="qm-fig">
    <Cart state={state} ghost={w?.before} action={w?.action} fallen={fell} label={`after ${count} step${count === 1 ? '' : 's'} (${fmt(count * 0.02, 2)} s)`} />
    <div className="qm-buttons">
      <button onClick={() => push(LEFT)} disabled={fell}>← push left</button>
      <button onClick={() => push(RIGHT)} disabled={fell}>push right →</button>
      <button onClick={restart}>↺ start again (seed {seed})</button>
    </div>
    {w ? <div className="cp-work">{`push      = ${w.action === RIGHT ? '+' : '−'}force = ${fmt(w.push)} N
cos θ     = cos(${fmt(w.before[2], 5)}) = ${fmt(w.cosTheta, 6)}
sin θ     = sin(${fmt(w.before[2], 5)}) = ${fmt(w.sinTheta, 6)}
temp      = (push + m_p·l·θ̇²·sin θ) / M
          = (${fmt(w.push)} + 0.05 × ${fmt(w.before[3], 4)}² × ${fmt(w.sinTheta, 5)}) / 1.1 = `}<b>{fmt(w.temp, 5)}</b>{`
θ̈         = (g·sin θ − cos θ·temp) / (l·(4/3 − m_p·cos²θ / M))
          = (9.8 × ${fmt(w.sinTheta, 5)} − ${fmt(w.cosTheta, 5)} × ${fmt(w.temp, 4)}) / (0.5 × (4/3 − 0.1 × ${fmt(w.cosTheta ** 2, 5)} / 1.1)) = `}<b>{fmt(w.thetaAcc, 5)}</b>{` rad/s²
ẍ         = temp − m_p·l·θ̈·cos θ / M
          = ${fmt(w.temp, 4)} − 0.05 × ${fmt(w.thetaAcc, 4)} × ${fmt(w.cosTheta, 5)} / 1.1 = `}<b>{fmt(w.xAcc, 5)}</b>{` m/s²

x   ← x + τ·ẋ  = ${fmt(w.before[0], 5)} + 0.02 × ${fmt(w.before[1], 5)} = `}<b>{fmt(w.after[0], 5)}</b>{`
ẋ   ← ẋ + τ·ẍ  = ${fmt(w.before[1], 5)} + 0.02 × ${fmt(w.xAcc, 5)} = `}<b>{fmt(w.after[1], 5)}</b>{`
θ   ← θ + τ·θ̇  = ${fmt(w.before[2], 5)} + 0.02 × ${fmt(w.before[3], 5)} = `}<b>{fmt(w.after[2], 5)}</b>{`
θ̇   ← θ̇ + τ·θ̈  = ${fmt(w.before[3], 5)} + 0.02 × ${fmt(w.thetaAcc, 5)} = `}<b>{fmt(w.after[3], 5)}</b></div>
      : <p className="qm-hint">The start of game {seed}: ({state.map(v => fmt(v, 4)).join(', ')}). Push, and every number of the step is written out here.</p>}
    {fell && <p><b>Game over:</b> {Math.abs(state[2]) > env.angleLimit ? 'the pole passed 12°.' : 'the cart left the track.'}</p>}
  </div>
}

// Play CartPole yourself: one press is one step, or real time (50 steps a second).
export function DriveYourself() {
  const env = useRef(new CartPole())
  const [seed, setSeed] = useState(0)
  const [state, setState] = useState(() => env.current.reset(0)[0])
  const [steps, setSteps] = useState(0), [over, setOver] = useState(null), [best, setBest] = useState(0)
  const [realTime, setRealTime] = useState(false)
  const held = useRef(null), last = useRef(RIGHT)
  const restart = (s = seed + 1) => { setSeed(s); setState(env.current.reset(s)[0]); setSteps(0); setOver(null) }
  const push = action => {
    if (over) return
    last.current = action
    const [next, , terminated, truncated] = env.current.step(action)
    setState(next); setSteps(n => { const m = n + 1; if (terminated || truncated) { setBest(b => Math.max(b, m)); setOver(terminated ? 'fell' : 'won') } return m })
  }
  useEffect(() => {
    if (!realTime || over) return undefined
    const id = setInterval(() => push(held.current ?? last.current), 20)
    return () => clearInterval(id)
  }, [realTime, over])
  const onKey = e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const a = e.key === 'ArrowLeft' ? LEFT : RIGHT; if (realTime) held.current = a; else push(a) }
  }
  return <div className="qm-fig" tabIndex={0} onKeyDown={onKey} onKeyUp={() => { held.current = null }} aria-label="Play CartPole: arrow keys push">
    <Cart state={state} fallen={over === 'fell'} label={`step ${steps} · best ${best}`} />
    <div className="qm-buttons">
      <button onClick={() => push(LEFT)} disabled={!!over}>← push left</button>
      <button onClick={() => push(RIGHT)} disabled={!!over}>push right →</button>
      <label><input type="checkbox" checked={realTime} onChange={e => setRealTime(e.target.checked)} /> real time (50 steps a second; it keeps pushing the last way)</label>
      <button onClick={() => restart()}>↺ new game</button>
    </div>
    <p className="qm-hint">Click the figure, then use ← and →. {over === 'fell' ? `Game over after ${steps} steps. ` : over === 'won' ? 'You lasted all 500 steps! ' : ''}Step by step is easy; in real time you have 0.02 s per push, which is why a learned rule beats a person.</p>
  </div>
}

// A rule plays a game, animated; and its average over 100 games.
export function RulePlayer({ rules = Object.keys(RULES), initial = 'lean' }) {
  const [rule, setRule] = useState(initial), [seed, setSeed] = useState(0)
  const game = useMemo(() => play(RULES[rule].run, seed), [rule, seed])
  const [t, setT] = useState(0), [playing, setPlaying] = useState(false)
  useEffect(() => { setT(0); setPlaying(false) }, [game])
  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => setT(k => { if (k + 1 >= game.trail.length) { setPlaying(false); return k } return k + 1 }), 20)
    return () => clearInterval(id)
  }, [playing, game])
  const stats = useMemo(() => Object.fromEntries(rules.map(r => [r, averageLength(RULES[r].run, 100)])), [rules.join()])
  const max = Math.max(...Object.values(stats).map(s => s.mean))
  return <div className="qm-fig">
    <div className="qm-fig-controls">
      <label>Rule <select value={rule} onChange={e => setRule(e.target.value)}>{rules.map(r => <option key={r} value={r}>{RULES[r].label}</option>)}</select></label>
      <label>Seed <input type="number" value={seed} onChange={e => setSeed(Number(e.target.value) || 0)} style={{ width: 60 }} /></label>
      <button onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pause' : '▶ Play the game'}</button>
      <input type="range" min={0} max={game.trail.length - 1} value={t} onChange={e => setT(Number(e.target.value))} aria-label="step" />
    </div>
    <Cart state={game.trail[t]} action={game.actions[t]} fallen={t === game.trail.length - 1 && game.total < 500} label={`${RULES[rule].label}: step ${t} of ${game.total}`} />
    <p className="qm-hint">The rule: {RULES[rule].says}. This game lasted <b>{game.total}</b> steps.</p>
    <div className="cp-bars">{rules.map(r => [<span key={`a${r}`}>{RULES[r].label}</span>, <span key={`b${r}`}><span className="cp-bar" style={{ display: 'block', width: `${stats[r].mean / max * 100}%` }} /></span>, <b key={`c${r}`} className="mono">{fmt(stats[r].mean, 2)}</b>])}</div>
    <p className="qm-hint">Average game length over 100 games (seeds 0–99), the same games <span className="mono">average_length</span> plays in Python.</p>
  </div>
}

// The return of a game that lasts T steps, every reward 1: G = (1 − γ^T) / (1 − γ).
export function ReturnCurve() {
  const [gamma, setGamma] = useState(0.99)
  const lengths = Array.from({ length: 501 }, (_, T) => T)
  const values = lengths.map(T => discountedReturn(new Array(T).fill(1), gamma))
  const [T, setT] = useState(100)
  return <div className="qm-fig">
    <div className="qm-fig-controls"><Slider label="γ" value={gamma} min={0.5} max={1} step={0.005} onChange={setGamma} /><Slider label="game length T" value={T} min={1} max={500} step={1} onChange={setT} /></div>
    <Plot series={[{ values: values.slice(1), color: '#b5650d' }]} window={1} x="game length" refs={gamma < 1 ? [{ value: 1 / (1 - gamma), label: `1 / (1 − γ) = ${fmt(1 / (1 - gamma), 1)}` }] : []} label="return against game length" />
    <p>A game of <b>{T}</b> steps returns <span className="mono">G = 1 + γ + γ² + … + γ^{T - 1} = (1 − γ^T) / (1 − γ) = </span><b className="mono">{fmt(values[T], 3)}</b>. {gamma < 1 ? `However long the game, G never passes ${fmt(1 / (1 - gamma), 1)}: rewards more than about ${Math.round(1 / (1 - gamma))} steps away hardly count.` : 'With γ = 1 the return is just the length.'}</p>
  </div>
}
