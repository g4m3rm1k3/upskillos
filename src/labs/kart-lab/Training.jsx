import { useEffect, useRef, useState } from 'react'
import Plot from '../cartpole-lab/figures/Plot.jsx'
import { DEFAULTS, unpack, evaluate, evaluateLinear } from './engine/tabular.js'
import { SUNLIT, HARBOUR } from './engine/kart.js'
import Trace from './Trace.jsx'

export const ALGORITHMS = { q: 'Q-learning', sarsa: 'SARSA', double: 'Double Q-learning', linear: 'Linear Q-learning' }
export const VIEWS = { sector: 'sector observation', sensors: 'sensors' }
const testBoth = model => model.kind === 'linear'
  ? { sunlit: evaluateLinear(model.weights, SUNLIT), harbour: evaluateLinear(model.weights, HARBOUR) }
  : { sunlit: evaluate(model.tables, model.config, SUNLIT), harbour: evaluate(model.tables, model.config, HARBOUR) }
export function Evaluation({ result }) {
  if (!result) return null
  return <div className="kl-readouts"><span>Sunlit <b>{Math.round(result.sunlit[0] * 50)} / 50</b> finished, {result.sunlit[1].toFixed(2)} hits</span><span>Harbour (never practised) <b>{Math.round(result.harbour[0] * 50)} / 50</b>, {result.harbour[1].toFixed(2)} hits</span></div>
}
export default function Training({ drivers, onSave }) {
  const [config, setConfig] = useState(DEFAULTS), [status, setStatus] = useState('idle'), [history, setHistory] = useState([]), [result, setResult] = useState(null)
  const [name, setName] = useState('My circuit driver'), [message, setMessage] = useState(''), [compared, setCompared] = useState([]), [runConfig, setRunConfig] = useState(null)
  const worker = useRef(null)
  useEffect(() => () => worker.current?.terminate(), [])
  const set = (key, value) => setConfig(c => ({ ...c, [key]: value, ...(key === 'method' && value === 'linear' ? { view: 'sensors', alpha: 0.02 } : key === 'method' && c.method === 'linear' ? { alpha: DEFAULTS.alpha } : {}) }))
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
  const ranges = [['alpha', 'Learning rate α', 0.005, 1, 0.005], ['gamma', 'Discount γ', 0, 0.99, 0.01], ['epsilon', 'Starting exploration ε', 0, 1, 0.01], ['floor', 'Final exploration ε', 0, 0.5, 0.01], ['penalty', 'Collision penalty', 0, 20, 0.5]]
  return <div className="kl-training">
    <header><span className="qm-eyebrow">THE DRIVER WORKSHOP</span><h1>Make a prediction. Train a driver. Test it on both tracks.</h1><p>The same engine as the lessons and the Python programs. Every run starts from nothing; the frozen test runs 50 held-out laps on Sunlit Circuit and 50 on Harbour Loop, which practice never visits.</p></header>
    <div className="kl-training-grid"><section className="qm-fig"><h2>Training recipe</h2><fieldset disabled={busy}>
      <label>Method<select value={config.method} onChange={e => set('method', e.target.value)}>{Object.entries(ALGORITHMS).map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>
      <label>Observation<select value={config.view} disabled={config.method === 'linear'} onChange={e => set('view', e.target.value)}>{Object.entries(VIEWS).map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select></label>
      <label>Practice laps<select value={config.episodes} onChange={e => set('episodes', Number(e.target.value))}>{[500, 2500, 6000, 12000].map(n => <option key={n}>{n}</option>)}</select></label>
      {ranges.map(([key, title, min, max, step]) => <label key={key}>{title} <b>{config[key].toFixed(key === 'alpha' ? 3 : 2)}</b><input aria-label={title} type="range" min={min} max={max} step={step} value={config[key]} onChange={e => set(key, Number(e.target.value))} /></label>)}
      <label>Random seed<input aria-label="Random seed" type="number" min="0" max="999999" value={config.seed} onChange={e => set('seed', Math.max(0, Math.min(999999, Math.floor(Number(e.target.value) || 0))))} /></label>
      <label className="kl-checklabel"><input type="checkbox" checked={config.traffic} disabled={config.method === 'linear'} onChange={e => set('traffic', e.target.checked)} /> Include scripted traffic</label>
    </fieldset><div className="qm-buttons"><button className="qm-primary" disabled={busy} onClick={start}>Train new driver</button>{busy && <button onClick={stop}>Cancel training</button>}</div>
    <p className="qm-hint">Exploration falls from the starting value to the final value over the first 80% of laps (lesson 3.2). The linear method always uses sensors and traffic.</p></section>
    <section className="qm-fig"><h2>Learning, measured</h2><p role="status">{busy ? 'Training' : status === 'complete' ? 'Training complete' : status === 'cancelled' ? 'Cancelled' : 'Ready'} · {history.length.toLocaleString()} / {(runConfig?.episodes ?? config.episodes).toLocaleString()} laps</p><progress max={runConfig?.episodes ?? config.episodes} value={history.length} />
      <p className="qm-hint">{runConfig ? `${ALGORITHMS[runConfig.method]} · ${VIEWS[runConfig.view]} · seed ${runConfig.seed} · penalty ${runConfig.penalty}` : 'Choose a recipe, then train.'}</p>
      <Plot series={[{ label: 'practice reward', color: '#1f6f68', values: history }]} window={50} x="lap" label="Practice reward per lap" />
      {result && <><h3>Frozen test</h3><Evaluation result={result.evaluation} /><label>Driver name<input maxLength={40} value={name} onChange={e => setName(e.target.value)} /></label><button className="qm-primary" disabled={!name.trim() || result.saved} onClick={() => { const error = onSave({ name: name.trim(), checkpoint: result.checkpoint, evaluation: result.evaluation }); if (error) setMessage(error); else { setResult(r => ({ ...r, saved: true })); setMessage('Saved. Choose it in any race seat.') } }}>Save driver</button></>}
    </section></div>
    {message && <p className="qm-feedback" role="status">{message}</p>}
    {result?.trace?.length > 0 && <Trace trace={result.trace} config={runConfig} />}
    <section className="qm-fig kl-save"><h2>Compare every driver</h2><p>The same 50 held-out laps on each track for every driver: supplied and yours.</p><button onClick={() => setCompared(drivers.map(d => ({ name: d.name, ...testBoth(unpack(d.checkpoint)) })))}>Test all drivers</button>
      {compared.length > 0 && <div className="kl-table-scroll"><table className="qm-mathcode"><thead><tr><th>Driver</th><th>Sunlit finished</th><th>Sunlit hits</th><th>Harbour finished</th><th>Harbour hits</th></tr></thead><tbody>{compared.map((r, i) => <tr key={i}><td>{r.name}</td><td>{Math.round(r.sunlit[0] * 50)}/50</td><td>{r.sunlit[1].toFixed(2)}</td><td>{Math.round(r.harbour[0] * 50)}/50</td><td>{r.harbour[1].toFixed(2)}</td></tr>)}</tbody></table></div>}
    </section>
  </div>
}
