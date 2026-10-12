import { useEffect, useRef, useState } from 'react'
import Plot from '../cartpole-lab/figures/Plot.jsx'
import { DEFAULTS, evaluate, unpack } from './engine/learning.js'
import { DT } from './engine/game.js'
import Trace from './Trace.jsx'
export const ALGORITHMS = { q: 'Q-learning', sarsa: 'SARSA', double: 'Double Q-learning' }
export function Evaluation({ result }) {
  if (!result) return null
  return <div className="kl-readouts"><span>Finished <b>{Math.round(result.finishRate * result.runs)} / {result.runs}</b></span><span>Mean hits <b>{result.crashes.toFixed(2)}</b></span><span>Mean duration* <b>{(result.ticks * DT).toFixed(1)} s</b></span></div>
}
export default function Training({ drivers, onSave }) {
  const [config, setConfig] = useState(DEFAULTS), [status, setStatus] = useState('idle'), [history, setHistory] = useState([]), [result, setResult] = useState(null)
  const [name, setName] = useState('My circuit driver'), [message, setMessage] = useState(''), [compared, setCompared] = useState([])
  const [runConfig, setRunConfig] = useState(null)
  const worker = useRef(null)
  useEffect(() => () => worker.current?.terminate(), [])
  const set = (key, value) => setConfig(c => ({ ...c, [key]: value }))
  const start = () => {
    worker.current?.terminate(); setResult(null); setHistory([]); setMessage(''); setStatus('running'); setRunConfig({ ...config })
    try {
      const w = new Worker(new URL('./engine/trainer.worker.js', import.meta.url), { type: 'module' }); worker.current = w
      w.onmessage = ({ data }) => {
        if (data.type === 'progress') setHistory(h => [...h, ...data.history])
        if (data.type === 'complete') { setHistory(data.history); setResult(data); setStatus('complete'); w.terminate(); worker.current = null }
        if (data.type === 'error') { setMessage(data.message); setStatus('error'); w.terminate(); worker.current = null }
      }
      w.onerror = () => { setMessage('Training could not start. Reload the lab and try again.'); setStatus('error'); w.terminate(); worker.current = null }
      w.postMessage(config)
    } catch (e) { setMessage(e.message); setStatus('error') }
  }
  const stop = () => { worker.current?.terminate(); worker.current = null; setStatus('cancelled'); setMessage('Run cancelled. Partial learning was discarded; saved drivers are unchanged.') }
  const busy = status === 'running'
  const ranges = [['alpha', 'Learning rate α', 0.01, 1, 0.01], ['gamma', 'Discount γ', 0, 0.99, 0.01], ['epsilon', 'Starting exploration ε', 0, 1, 0.01], ['floor', 'Final exploration ε', 0, 0.5, 0.01], ['penalty', 'Collision penalty', 0, 15, 0.5]]
  return <div className="kl-training">
    <header><span className="qm-eyebrow">THE DRIVER WORKSHOP</span><h1>Make a prediction. Train a driver. Test it.</h1><p>These controls train the policies used by the actual race. Every run starts with empty tables. Save separate runs to compare strategies on the grid.</p></header>
    <div className="kl-training-grid"><section className="qm-fig"><h2>Training recipe</h2><fieldset disabled={busy}>
      <label>Algorithm<select value={config.algorithm} onChange={e => set('algorithm', e.target.value)}>{Object.entries(ALGORITHMS).map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>
      <label>Training episodes<select value={config.episodes} onChange={e => set('episodes', Number(e.target.value))}>{[500, 2500, 6000, 12000].map(n => <option key={n}>{n}</option>)}</select></label>
      {ranges.map(([key, title, min, max, step]) => <label key={key}>{title} <b>{config[key].toFixed(2)}</b><input aria-label={title} type="range" min={min} max={max} step={step} value={config[key]} onChange={e => set(key, Number(e.target.value))} /></label>)}
      <label>Random seed<input aria-label="Random seed" type="number" min="0" max="999999" value={config.seed} onChange={e => set('seed', Math.max(0, Math.min(999999, Math.floor(Number(e.target.value) || 0))))} /></label>
      <label className="kl-checklabel"><input type="checkbox" checked={config.traffic} onChange={e => set('traffic', e.target.checked)} /> Include scripted traffic</label>
    </fieldset><div className="qm-buttons"><button className="qm-primary" disabled={busy} onClick={start}>Train new driver</button>{busy && <button onClick={stop}>Cancel training</button>}</div>
    <p className="qm-hint">Exploration interpolates from the starting value to the final value over the first 80% of episodes. Rendering is skipped during training.</p></section>
    <section className="qm-fig"><h2>Learning, measured</h2><p role="status">{busy ? 'Training' : status === 'complete' ? 'Training complete' : status === 'cancelled' ? 'Cancelled' : 'Ready'} · {history.length.toLocaleString()} / {(runConfig?.episodes ?? config.episodes).toLocaleString()} episodes</p><progress max={runConfig?.episodes ?? config.episodes} value={history.length} />
      <p className="qm-hint">{runConfig ? `${ALGORITHMS[runConfig.algorithm]} · seed ${runConfig.seed} · α ${runConfig.alpha} · γ ${runConfig.gamma} · ε ${runConfig.epsilon} → ${runConfig.floor} · penalty ${runConfig.penalty} · traffic ${runConfig.traffic ? 'on' : 'off'}` : 'Choose a recipe and train your first driver.'}</p><h3>Episode reward</h3><Plot series={[{ label: 'Reward', color: '#258f81', values: history.map(h => h.reward) }]} window={50} x="episode" label="Training episode reward, 50-episode moving average" />
      <h3>Collisions per episode</h3><Plot series={[{ label: 'Hits', color: '#d67855', values: history.map(h => h.crashes) }]} window={50} x="episode" label="Training collisions, 50-episode moving average" />
      <p className="qm-hint">Curves show a 50-episode moving average, with exploration active. High training reward alone does not establish race performance.</p>
    </section></div>
    {message && <p className="qm-feedback" role="status">{message}</p>}
    {result && <section className="qm-fig kl-save"><h2>Frozen evaluation · 30 held-out traffic seeds</h2><Evaluation result={result.evaluation} /><p className="qm-hint">Exploration is zero and learning is off. *Mean duration includes early failures, so compare finish rate before time. This is one lap against scripted traffic, not a head-to-head race.</p><div className="qm-buttons"><label>Driver name <input maxLength={40} value={name} onChange={e => setName(e.target.value)} /></label><button className="qm-primary" disabled={!name.trim() || result.saved} onClick={() => { const error = onSave({ name: name.trim(), checkpoint: result.checkpoint, evaluation: result.evaluation }); if (error) setMessage(error); else { setResult(r => ({ ...r, saved: true })); setMessage('Saved. Select this driver in any Race & watch seat.') } }}>Save checkpoint</button></div></section>}
    {result && <Trace key={`${result.checkpoint.config.seed}-${result.checkpoint.config.algorithm}-${result.checkpoint.episodes}`} trace={result.trace} config={result.checkpoint.config} />}
    <section className="qm-fig kl-save"><h2>Compare saved drivers</h2><p>Evaluate each driver on the same 30 seeds with traffic enabled and a common collision penalty of 6. This comparison does not modify the policies. Repeat training with other seeds before drawing a conclusion about an algorithm.</p><button onClick={() => setCompared(drivers.map(d => { const model = unpack(d.checkpoint); model.config = { ...model.config, traffic: true, penalty: 6 }; return { id: d.id, name: d.name, evaluation: evaluate(model) } }))}>Evaluate saved drivers</button>
      {compared.length > 0 && <div className="kl-table-scroll"><table className="qm-mathcode"><thead><tr><th>Driver</th><th>Finished</th><th>Mean hits</th><th>Mean duration*</th></tr></thead><tbody>{compared.map(d => <tr key={d.id}><td>{d.name}</td><td>{Math.round(d.evaluation.finishRate * 30)}/30</td><td>{d.evaluation.crashes.toFixed(2)}</td><td>{(d.evaluation.ticks * DT).toFixed(1)} s</td></tr>)}</tbody></table></div>}
    </section>
  </div>
}
