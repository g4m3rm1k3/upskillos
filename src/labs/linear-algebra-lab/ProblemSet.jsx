import { useEffect, useMemo, useRef, useState } from 'react'
import MarkdownProse from '../../components/math/MarkdownProse.jsx'
import { CodeEditor, CodeView } from './code.jsx'
import { startRun } from './runner.js'
import { attemptKey, familyKey, freshSeed, instantiate, practiceStatus, problemsFor, PROBLEM_VERSION } from './practice/index.js'

const Md = ({ children }) => <div className="la-prose"><MarkdownProse text={children} /></div>
const validSeed = seed => typeof seed === 'string' || typeof seed === 'number'

function Workspace({ lesson, exercise, store, setStore, colors, renderResult }) {
  const family = familyKey(lesson.id, exercise.id)
  const attempt = attemptKey(lesson.id, exercise.id, exercise.seed)
  const code = typeof store.problemDrafts?.[attempt] === 'string' ? store.problemDrafts[attempt] : exercise.starter
  const [result, setResult] = useState(null)
  const [hints, setHints] = useState(0)
  const [running, setRunning] = useState(false)
  const job = useRef(null), revision = useRef(0)
  const passed = store.problemPasses?.[lesson.id]?.[exercise.id]
  const currentPass = passed?.version === PROBLEM_VERSION && passed.seed === exercise.seed

  useEffect(() => () => { revision.current++; job.current?.cancel() }, [])
  const stop = () => { revision.current++; job.current?.cancel(); job.current = null; setRunning(false) }
  const edit = next => {
    stop(); setResult(null)
    setStore(previous => ({ ...previous, problemDrafts: { ...previous.problemDrafts, [attempt]: next } }))
  }
  async function run() {
    stop()
    const token = ++revision.current
    setRunning(true); setResult(null)
    try {
      job.current = startRun({ source: `${exercise.setup}\n${code}`, setup: exercise.setup, code, reference: exercise.solution, outputs: exercise.outputs, cases: exercise.cases })
      const response = await job.current.promise
      if (token !== revision.current) return
      setResult(response)
      if (!response.error && response.checks.length > 0 && response.checks.every(check => check.pass)) {
        setStore(previous => ({
          ...previous,
          problemPasses: { ...previous.problemPasses, [lesson.id]: {
            ...previous.problemPasses?.[lesson.id],
            [exercise.id]: { seed: exercise.seed, version: PROBLEM_VERSION, code, at: new Date().toISOString(), assisted: Boolean(previous.problemViewed?.[family]), hints },
          } },
        }))
      }
    } catch (error) { if (token === revision.current) setResult({ error: error.message }) }
    finally { if (token === revision.current) { setRunning(false); job.current = null } }
  }

  return <section className="la-card la-problem-workspace" aria-label={`Problem: ${exercise.title}`}>
    <div className="la-section-title"><div><div className="la-eyebrow">{exercise.difficulty}</div><h2>{exercise.title}</h2></div><span className="la-draw">Draw {exercise.seed}</span></div>
    {currentPass && <p className="la-earned">✓ This draw passed{passed.assisted ? ' with reference support' : ' without opening the reference'}{passed.code !== code ? ' · code has changed since that pass' : ''}.</p>}
    {!currentPass && passed?.version === PROBLEM_VERSION && <p className="la-muted">You passed this problem family on a previous draw. This draw has not been checked.</p>}
    <Md>{exercise.prompt}</Md>
    <div className="la-given"><span>Generated inputs · run before your code</span><CodeView code={exercise.setup} label="Problem inputs" /></div>
    <div className="la-workbench">
      <div><CodeEditor label="Your problem code" code={code} onChange={edit} onRun={run} disabled={running} dark={colors.dark} />
        <div className="la-actions"><button type="button" className="la-primary" disabled={running} onClick={run}>{running ? 'Checking problem…' : 'Run & check problem'}</button>
          {running && <button type="button" onClick={() => { stop(); setResult({ error: 'Run stopped. Your problem draft is saved.' }) }}>Stop problem run</button>}
          <button type="button" className="la-ghost" onClick={() => edit(exercise.starter)}>Restore problem starter</button>
        </div>
        <p className="la-muted">Your code must solve this draw and two unseen draws with the same instructions. Use the supplied variables so it works when the numbers change. Each run starts in a fresh workspace.</p>
      </div>
      <div className="la-output">{renderResult(result)}</div>
    </div>
    <div className="la-support"><h3>Build a route to the answer</h3>{exercise.hints.slice(0, hints).map((hint, index) => <p className="la-hint" key={index}><strong>Hint {index + 1}</strong> {hint}</p>)}
      <button type="button" disabled={hints >= exercise.hints.length} onClick={() => setHints(hints + 1)}>{hints ? 'Next problem hint' : 'First problem hint'}</button>
    </div>
    <details className="la-details la-reference-answer" onToggle={event => {
      if (event.currentTarget.open) setStore(previous => ({ ...previous, problemViewed: { ...previous.problemViewed, [family]: true } }))
    }}><summary>Reference for this problem family · records assisted practice</summary><CodeView code={exercise.solution} label="Problem reference solution" /><p className="la-muted">The program generalizes to fresh inputs. Reopening a different draw does not erase the reference-support record.</p></details>
    <label className="la-problem-reflection">Explain your result · saved, self assessed
      <textarea value={typeof store.problemReflections?.[attempt] === 'string' ? store.problemReflections[attempt] : ''} onChange={event => setStore(previous => ({ ...previous, problemReflections: { ...previous.problemReflections, [attempt]: event.target.value } }))} placeholder="Which technique did you choose, why does it fit, and what input would make it fail?" />
    </label>
  </section>
}

// A lesson without authored problems renders nothing (the lab hides its tab too).
export default function ProblemSet(props) {
  return problemsFor(props.lesson).length ? <Problems {...props} /> : null
}

function Problems({ lesson, store, setStore, colors, renderResult }) {
  const problems = problemsFor(lesson)
  const [initialSeeds] = useState(() => Object.fromEntries(problems.map(problem => [problem.id, freshSeed()])))
  const selected = problems.find(problem => problem.id === store.problemCurrent?.[lesson.id]) || problems[0]
  const family = familyKey(lesson.id, selected.id)
  const seed = validSeed(store.problemSeeds?.[family]) ? String(store.problemSeeds[family]) : initialSeeds[selected.id]
  const exercise = useMemo(() => instantiate(lesson.id, selected.id, seed), [lesson.id, selected.id, seed])
  const status = practiceStatus(lesson, store)
  useEffect(() => {
    setStore(previous => {
      const missing = problems.filter(problem => !validSeed(previous.problemSeeds?.[familyKey(lesson.id, problem.id)]))
      if (!missing.length) return previous
      return { ...previous, problemSeeds: { ...previous.problemSeeds, ...Object.fromEntries(missing.map(problem => [familyKey(lesson.id, problem.id), initialSeeds[problem.id]])) } }
    })
  }, [lesson.id, problems, initialSeeds, setStore])

  return <div className="la-problem-set">
    <section className="la-card la-problem-overview"><div className="la-eyebrow">Practice set · warm-up to transfer</div><h2>Different problems. Fresh inputs.</h2>
      <p>Work through each family: compute, diagnose, repair, and recognize a familiar idea in a different setting. Passing one problem does not complete the lesson’s practice set.</p>
      <div className="la-problem-progress"><progress aria-label="Problem families passed" max={status.total} value={status.passed} /><strong>{status.passed} of {status.total} families passed</strong></div>
      {status.complete && <p className="la-earned" role="status">✓ Practice set complete{status.independent ? ' without opening a reference' : ' · includes reference-supported practice'}. This records practice, not subject mastery.</p>}
      <nav aria-label="Practice problem families" className="la-problem-picker">{problems.map((problem, index) => {
        const complete = store.problemPasses?.[lesson.id]?.[problem.id]?.version === PROBLEM_VERSION
        return <button type="button" key={problem.id} aria-pressed={problem.id === selected.id} onClick={() => setStore(previous => ({ ...previous, problemCurrent: { ...previous.problemCurrent, [lesson.id]: problem.id } }))}><span aria-hidden="true">{complete ? '✓' : String(index + 1).padStart(2, '0')}</span><span><strong>{problem.title}</strong><small>{problem.difficulty}{complete ? ' · passed' : ''}</small></span></button>
      })}</nav>
      <div className="la-problem-redraw"><p className="la-muted">Inputs and drafts survive reopening. A new draw keeps your earlier drafts and recorded passes.</p><button type="button" onClick={() => setStore(previous => ({ ...previous, problemSeeds: { ...previous.problemSeeds, [family]: freshSeed() } }))}>New numbers for this problem</button></div>
    </section>
    <Workspace key={attemptKey(lesson.id, selected.id, seed)} lesson={lesson} exercise={exercise} store={store} setStore={setStore} colors={colors} renderResult={renderResult} />
  </div>
}
