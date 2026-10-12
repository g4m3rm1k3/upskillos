import { useState } from 'react'
import { ACTIONS, observe, reset, step } from './engine/game.js'
import { createModel, update } from './engine/learning.js'
import { Sensors } from './Arena.jsx'
export function DecisionFigure() {
  const [car, setCar] = useState(() => reset(1, { p: 12, lane: 1, speed: 1 }))
  return <div className="qm-fig"><h3>One real game transition</h3><Sensors car={car} />
    <div className="qm-buttons">{ACTIONS.map((name, a) => <button key={name} onClick={() => setCar(c => step(c, a))}>{name}</button>)}<button onClick={() => setCar(reset(1, { p: 12, lane: 1, speed: 1 }))}>Reset experiment</button></div>
    {car.last && <p role="status">Sector {observe(car).sector}, lane {car.lane + 1}, speed tier {car.speed + 1}. Reward = {car.last.parts.progress.toFixed(2)} progress − 0.20 time {car.last.hit ? '− 6.00 collision' : '+ 0.00 collision'} = <strong>{car.last.reward.toFixed(2)}</strong>.</p>}
    <p className="qm-hint">Start at sector 12 in the middle lane. A barrier waits at sector 15. Accelerating travels three sectors and hits it; changing lanes first avoids it. This calls the same step function as the race.</p>
  </div>
}
export function UpdateFigure() {
  const [algorithm, setAlgorithm] = useState('q'), [alpha, setAlpha] = useState(0.2), [gamma, setGamma] = useState(0.9), [terminal, setTerminal] = useState(false), [result, setResult] = useState(null)
  const run = () => {
    const m = createModel({ algorithm, alpha, gamma })
    m.q[1] = 2; m.q.set([1, 4, 2, 3, 0], 5)
    if (m.b) m.b.set([3, 1, 2, 2, 0], 5)
    setResult(update(m, { key: 0, action: 1, reward: -1, nextKey: 1, nextAction: 0, done: terminal }, () => 0))
  }
  return <div className="qm-fig"><h3>Follow one update, with real numbers</h3><div className="qm-fig-controls">
    <label>Method <select value={algorithm} onChange={e => { setAlgorithm(e.target.value); setResult(null) }}><option value="q">Q-learning</option><option value="sarsa">SARSA</option><option value="double">Double Q-learning</option></select></label>
    <label>α = {alpha.toFixed(1)} <input aria-label="Update learning rate" type="range" min="0.1" max="1" step="0.1" value={alpha} onChange={e => { setAlpha(+e.target.value); setResult(null) }} /></label>
    <label>γ = {gamma.toFixed(1)} <input aria-label="Update discount" type="range" min="0" max="1" step="0.1" value={gamma} onChange={e => { setGamma(+e.target.value); setResult(null) }} /></label>
    <label><input type="checkbox" checked={terminal} onChange={e => { setTerminal(e.target.checked); setResult(null) }} /> Episode ended</label>
  </div><p>Old Q = 2; reward = −1. Next-state Q values, in action order:</p><div className="kl-readouts">{ACTIONS.map((a, i) => <span key={a}>{a}<b>{[1, 4, 2, 3, 0][i]}</b></span>)}</div>
    <p>{algorithm === 'sarsa' ? 'The exploratory next action is Left (value 1). SARSA uses that actual action.' : algorithm === 'double' ? 'This update selects Coast using table A, then evaluates Coast in table B (value 1). B = [3, 1, 2, 2, 0].' : 'Q-learning uses the highest next-state value: Coast (4).'} {terminal && 'Because the episode ended, the future value is zero.'}</p>
    <button onClick={run}>Compute one update</button>{result && <div className="kl-calculation" role="status"><p>Target = −1 + {gamma.toFixed(1)} × {result.bootstrap.toFixed(1)} = <b>{result.target.toFixed(2)}</b></p><p>New Q = 2 + {alpha.toFixed(1)} × ({result.target.toFixed(2)} − 2) = <b>{result.after.toFixed(2)}</b></p></div>}
    <p className="qm-hint">This figure executes the same update function used by the trainer. Each click starts from the displayed example tables.</p>
  </div>
}
