// A coding exercise inside a lesson: the task, an editor holding the learner's draft (kept on this
// device), and Run & check, which runs their code then the exercise's checks in Python (Pyodide, in
// a worker with a time limit). Hints come one at a time; the reference solution is there if wanted.
//
// spec: { prompt, starter, solution, checks, hints?: [], packages?: [] }
// checks: Python run after the learner's code, in the same namespace; a failing `assert … , "message"`
// shows its message.
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'

const Monaco = lazy(() => import('./ExerciseEditor.jsx'))
const TIME_LIMIT = 15000
const draftKey = id => `upskillos.exercise.${id}`
const load = id => { try { return localStorage.getItem(draftKey(id)) } catch { return null } }

// A draft is saved under the exercise's prompt; one saved before that, under its old position
// (legacyId), is picked up and moved.
export default function Exercise({ id, legacyId, spec, done, onDone }) {
  const [code, setCode] = useState(() => load(id) ?? (legacyId ? load(legacyId) : null) ?? spec.starter)
  useEffect(() => { if (legacyId && legacyId !== id) try { localStorage.removeItem(draftKey(legacyId)) } catch { /* nothing to move */ } }, [id, legacyId])
  const [result, setResult] = useState(done ? { passed: true, output: '' } : null), [running, setRunning] = useState(false)
  const [hints, setHints] = useState(0), [solution, setSolution] = useState(false)
  const worker = useRef(null), timer = useRef(null)
  useEffect(() => () => { worker.current?.terminate(); clearTimeout(timer.current) }, [])
  useEffect(() => { try { if (code === spec.starter) localStorage.removeItem(draftKey(id)); else localStorage.setItem(draftKey(id), code) } catch { /* drafts just aren't kept */ } }, [code, id, spec.starter])
  function run() {
    setRunning(true); setResult({ status: 'Starting Python…' })
    if (!worker.current) worker.current = new Worker(new URL('./exercise.worker.js', import.meta.url), { type: 'module' })
    const w = worker.current
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { w.terminate(); worker.current = null; setRunning(false); setResult({ passed: false, error: `Stopped after ${TIME_LIMIT / 1000} seconds. Is there a loop that never ends?`, output: '' }) }, TIME_LIMIT)
    w.onmessage = ({ data }) => {
      if (data.type === 'status') { setResult({ status: data.text }); return }
      clearTimeout(timer.current); setRunning(false)
      if (data.type === 'error') { setResult({ passed: false, error: `Python could not start: ${data.text}`, output: '' }); return }
      setResult(data)
      if (data.passed) onDone?.()
    }
    w.onerror = () => { clearTimeout(timer.current); setRunning(false); setResult({ passed: false, error: 'Python could not start in this browser.', output: '' }) }
    w.postMessage({ code, checks: spec.checks, packages: spec.packages ?? [] })
  }
  return <div className="qm-check ps-exercise">
    <span className="qm-eyebrow">Your turn: code it</span>
    <div className="qm-md"><Markdown>{spec.prompt}</Markdown></div>
    <Suspense fallback={<textarea className="ps-exercise-plain" aria-label="Your Python" value={code} onChange={e => setCode(e.target.value)} spellCheck={false} rows={Math.max(6, code.split('\n').length + 1)} />}>
      <Monaco code={code} onChange={setCode} />
    </Suspense>
    <div className="qm-buttons">
      <button className="qm-primary" disabled={running} onClick={run}>{running ? 'Running…' : '▶ Run & check'}</button>
      {spec.hints?.length > 0 && <button className="qm-quiet" disabled={hints >= spec.hints.length} onClick={() => setHints(h => h + 1)}>{hints ? 'Another hint' : 'Hint'}</button>}
      <button className="qm-quiet" onClick={() => { setCode(spec.starter); setResult(null) }}>Reset</button>
      <button className="qm-quiet" onClick={() => setSolution(s => !s)}>{solution ? 'Hide solution' : 'Show a solution'}</button>
    </div>
    {spec.hints?.slice(0, hints).map((h, i) => <p key={i} className="qm-hint">💡 <Markdown inline>{h}</Markdown></p>)}
    {result?.status && <p className="qm-hint" role="status">{result.status}</p>}
    {result && !result.status && <div className={`qm-feedback${result.passed ? ' good' : ''}`} role="status">
      <strong>{result.passed ? '✓ All checks passed.' : result.stage === 'code' ? 'Your code raised an error:' : result.error && result.stage === 'checks' ? 'Not yet:' : ''}</strong>
      {!result.passed && result.error && <pre className="ps-exercise-out">{result.error}</pre>}
      {result.output && <pre className="ps-exercise-out">{result.output}</pre>}
    </div>}
    {solution && <pre className="ps-exercise-out ps-exercise-solution">{spec.solution}</pre>}
  </div>
}
