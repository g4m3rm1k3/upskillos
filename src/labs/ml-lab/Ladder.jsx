import React, { useEffect, useState } from 'react'
import LessonText from './LessonText.jsx'
import { CellEditor, errorHint } from './notebook/LessonNotebook.jsx'
import * as runtime from './notebook/runtime.js'
import { buildCheck, buildProbe, parseCheck, grade, nextReview } from './kit/ladder.js'

// A coding ladder: trace → run both ways → fill in → repair → implement → fresh problems → return
// later. Checks run the learner's code in a throwaway Python namespace (never the notebook's
// variables) and compare with values computed independently in JS. Every step records whether it
// was done without the hint or the worked answer; the evidence is shown by kind, never as a score.
//
// spec: { title, version, intro, steps: [...], generate, workedSolution, templates, ... } — see
// labs/l03-matrices/ladder.js. Progress lives in the lesson's saved progress under ladders[name].

const CHECK_LIMIT_MS = 20000
const PLAIN_KEY = 'upskillos.ml-lab.plain-editor'
const readPlain = () => { try { return localStorage.getItem(PLAIN_KEY) === '1' } catch { return false } }
const writePlain = v => { try { localStorage.setItem(PLAIN_KEY, v ? '1' : '0') } catch { /* preference only */ } }

const emptyState = version => ({ version, steps: {}, code: {}, seeds: {}, transfer: [], review: { due: null, history: [] } })

function Status({ step }) {
  if (!step?.done) return <span className="ml-ladder-status">{step?.attempts ? 'In progress' : 'Not started'}</span>
  return <span className="ml-ladder-status ml-ladder-done">{step.unassisted ? '✓ Done without help' : '✓ Done with help'}</span>
}

function Evidence({ spec, state }) {
  const practice = spec.steps.filter(s => ['trace', 'probe', 'function'].includes(s.kind))
  const done = practice.filter(s => state.steps[s.id]?.done), alone = done.filter(s => state.steps[s.id]?.unassisted)
  const kinds = spec.templates.filter(t => state.transfer.some(a => a.template === t && a.correct && !a.assisted))
  const returns = state.review.history, delayed = returns.filter(h => h.correct && !h.early && !h.assisted)
  return <dl className="ml-ladder-evidence" aria-label="Your evidence so far">
    <div><dt>Practice steps</dt><dd>{done.length} of {practice.length} done{done.length ? `, ${alone.length} without hints` : ''}</dd></div>
    <div><dt>Fresh problems, unassisted</dt><dd>{kinds.length ? kinds.map(k => spec.templateNames[k]).join(', ') : 'none yet'} ({kinds.length} of {spec.templates.length} kinds)</dd></div>
    <div><dt>Returns after a gap</dt><dd>{delayed.length} correct{returns.length > delayed.length ? ` · ${returns.length - delayed.length} other (early, assisted or missed)` : ''}</dd></div>
    {state.review.due && <div><dt>Next return</dt><dd>{new Date(state.review.due).toLocaleDateString()}</dd></div>}
  </dl>
}

function TraceStep({ step, record, onRecord }) {
  const [values, setValues] = useState(() => step.fields.map(() => '')), [checked, setChecked] = useState(null), [shown, setShown] = useState(Boolean(record?.revealed))
  const check = e => {
    e.preventDefault()
    const marks = step.fields.map((f, i) => values[i].trim() !== '' && Math.abs(Number(values[i]) - f.answer) <= (f.tolerance ?? 1e-6))
    setChecked(marks)
    onRecord({ attempts: 1, ...(marks.every(Boolean) ? { done: true } : {}) })
  }
  return <form onSubmit={check} className="ml-ladder-trace">
    {step.fields.map((f, i) => <label key={i}><span><LessonText>{f.label}</LessonText></span>
      <input inputMode="decimal" value={values[i]} onChange={e => setValues(v => v.map((x, k) => k === i ? e.target.value : x))} aria-invalid={checked ? !checked[i] : undefined} />
      {checked && <span className="ml-caption">{checked[i] ? '✓' : 'not yet'}</span>}
    </label>)}
    <div className="ml-actions"><button className="ml-primary">Check</button><button type="button" onClick={() => { setShown(true); onRecord({ revealed: true }) }}>Show the working</button></div>
    {checked && !checked.every(Boolean) && <p className="ml-caption" role="status">{checked.filter(x => !x).length} of {checked.length} not yet right. Each contribution is one weight times its feature.</p>}
    {(shown || record?.done) && <p role="status"><LessonText>{step.explain}</LessonText></p>}
  </form>
}

function CodeStep({ step, name, code, setCode, record, onRecord, plain }) {
  const [rt, setRt] = useState(null), [running, setRunning] = useState(false), [result, setResult] = useState(null), [choice, setChoice] = useState(null)
  const [hint, setHint] = useState(Boolean(record?.hinted)), [solution, setSolution] = useState(Boolean(record?.revealed))
  useEffect(() => runtime.subscribe(setRt), [])
  const passedCode = record?.passed
  const check = async () => {
    if (running) return
    setRunning(true); setResult(null)
    const ns = `ladder:${name}:${step.id}`
    let stdout = '', stderr = ''
    const harness = step.kind === 'probe' ? buildProbe(code, step.probe) : buildCheck(code, step.check)
    const res = await runtime.run(ns, harness, { timeoutMs: CHECK_LIMIT_MS, importsFrom: code, onStream: (stream, text) => { if (stream === 'stdout') stdout += text + '\n'; else stderr += text + '\n' } })
    runtime.resetNamespace(ns)
    setRunning(false)
    if (res.stopped) { setResult({ summary: res.timedOut ? `Stopped after ${CHECK_LIMIT_MS / 1000} seconds. Look for a loop that never ends — for example a \`while\` whose condition never changes.` : 'Stopped. Your code is kept; press Check again when ready.' }); onRecord({ attempts: 1 }); return }
    if (res.runtimeError || !res.ok) { setResult({ summary: errorHint(res) ?? 'Python could not run the check.', error: res.traceback }); return }
    const { printed, report } = parseCheck(stdout)
    let graded
    if (step.kind === 'probe') {
      if (!report) graded = { passed: false, summary: 'The check did not finish.' }
      else if (!report.ok) graded = { passed: false, summary: 'Your code raised an error.', error: report.error }
      else { const r = step.evaluate(report.vars); graded = { passed: r.passed, summary: r.message } }
    } else graded = grade(report, step.check.cases, step.check)
    setResult({ ...graded, printed, stderr: stderr.trim() })
    onRecord({ attempts: 1, ...(graded.passed ? { passed: true, ...(step.explainChoice ? {} : { done: true }) } : { failed: 1 }) })
  }
  const failed = record?.failed ?? 0
  return <div className="ml-ladder-code">
    {plain
      ? <textarea className="ml-ladder-plain" aria-label={`${step.title}: your code`} value={code} spellCheck={false} rows={Math.max(6, code.split('\n').length + 1)} onChange={e => setCode(e.target.value)} />
      : <CellEditor code={code} onChange={setCode} onRun={check} label={`${step.title}: your code`} />}
    <div className="ml-actions">
      <button className="ml-primary" disabled={running} onClick={check}>{step.kind === 'probe' ? 'Run it' : 'Check'}</button>
      {running && <button onClick={() => runtime.stop()} title="Stops Python for every notebook on this page; your code is kept">Stop</button>}
      <button disabled={running || code === step.starter} onClick={() => { if (window.confirm?.('Replace your code with the starter code?') ?? true) setCode(step.starter) }}>Start again from the starter</button>
      {step.hint && !hint && <button onClick={() => { setHint(true); onRecord({ hinted: true }) }}>Hint</button>}
      {step.solution && !solution && failed >= 2 && <button onClick={() => { setSolution(true); onRecord({ revealed: true }) }}>Show a solution</button>}
    </div>
    {running && <p className="ml-caption" role="status">{rt?.state === 'loading' ? rt.text : 'Running your code in a fresh Python namespace — the notebook’s variables are not used or changed.'}</p>}
    {hint && step.hint && <p className="ml-nb-hint"><strong>Hint:</strong> <LessonText>{step.hint}</LessonText></p>}
    {solution && <div className="ml-ladder-solution"><span className="ml-eyebrow">One correct version</span><pre>{step.solution}</pre><p className="ml-caption">Type it in yourself rather than pasting, then press Check. This step will be recorded as done with help.</p></div>}
    {result && <div className="ml-nb-output" aria-live="polite">
      {result.printed && <><span className="ml-caption">Your code printed:</span><pre>{result.printed}</pre></>}
      {result.stderr && <pre className="ml-nb-error">{result.stderr}</pre>}
      <p className={result.passed ? 'ml-ladder-pass' : undefined}><strong>{result.passed ? '✓ ' : ''}</strong><LessonText>{result.summary}</LessonText></p>
      {result.error && <pre className="ml-nb-error">{result.error}</pre>}
      {result.lines?.length > 0 && <ul className="ml-ladder-cases">{result.lines.map((l, i) => <li key={i} className={l.ok ? 'ok' : 'bad'}><LessonText>{l.text}</LessonText>{l.error && <pre className="ml-nb-error">{l.error}</pre>}{l.hint && <p className="ml-nb-hint"><LessonText>{l.hint}</LessonText></p>}</li>)}</ul>}
      {result.passed && step.done && <p><LessonText>{step.done}</LessonText></p>}
    </div>}
    {step.explainChoice && passedCode && <fieldset className="ml-ladder-choice">
      <legend><LessonText>{step.explainChoice.prompt}</LessonText></legend>
      {step.explainChoice.options.map((o, i) => <label key={i}><input type="radio" name={`${name}-${step.id}-why`} checked={choice === i} onChange={() => { setChoice(i); if (o.correct) onRecord({ done: true }); else onRecord({ wrongWhy: 1 }) }} /> <LessonText>{o.text}</LessonText></label>)}
      {choice != null && <p role="status">{step.explainChoice.options[choice].correct ? <strong>Right. </strong> : null}<LessonText>{step.explainChoice.options[choice].correct ? (step.explainChoice.rightFeedback ?? '') : step.explainChoice.options[choice].feedback}</LessonText></p>}
    </fieldset>}
  </div>
}

// One generated problem, described by spec.view(problem):
//   { intro, table: { caption, head, rows }, questions: [
//       { id, type: 'number', label, answer, tolerance?, misconceptions?: [{ answer, feedback }], wrong? },
//       { id, type: 'choice', legend, options: [{ value, label }], answer, inline?, wrong } ] }
// Reports { correct, assisted } once: when every answer is right, or when the worked answer is opened.
// Wrong attempts before that are feedback, not a recorded failure.
export function Problem({ spec, problem, onResult }) {
  const view = spec.view(problem)
  const [answers, setAnswers] = useState({}), [state, setState] = useState(null), [shown, setShown] = useState(false)
  const set = (id, v) => setAnswers(a => ({ ...a, [id]: v }))
  const finish = (correct, assisted) => { if (!state?.final) onResult({ correct, assisted }); setState(s => ({ ...s, final: true, correct })) }
  const submit = e => {
    e.preventDefault()
    for (const q of view.questions) {
      const a = answers[q.id]
      if (q.type === 'number') {
        const n = Number(a)
        if (a == null || String(a).trim() === '' || !Number.isFinite(n)) { setState({ message: 'Enter a number for every question.' }); return }
        if (Math.abs(n - q.answer) > (q.tolerance ?? 1e-6)) {
          const miss = q.misconceptions?.find(x => Math.abs(n - x.answer) <= (q.tolerance ?? 1e-6))
          setState({ message: miss?.feedback ?? q.wrong ?? 'Not yet. Write out each term before adding.' }); return
        }
      } else {
        if (a == null) { setState({ message: 'Choose an answer for every question.' }); return }
        if (a !== q.answer) { setState({ message: q.wrong }); return }
      }
    }
    finish(true, false)
  }
  const disabled = Boolean(state?.final)
  return <div className="ml-ladder-problem">
    <p><LessonText>{view.intro}</LessonText></p>
    {view.table && <table className="ml-fig-table"><caption className="ml-caption">{view.table.caption}</caption>
      <thead><tr>{view.table.head.map((h, k) => <th key={k} scope="col">{h}</th>)}</tr></thead>
      <tbody>{view.table.rows.map((r, i) => <tr key={i}>{r.map((c, k) => k === 0 ? <th key={k} scope="row">{c}</th> : <td key={k}>{c}</td>)}</tr>)}</tbody></table>}
    <form onSubmit={submit}>
      {view.questions.map(q => q.type === 'number'
        ? <label key={q.id}><LessonText>{q.label}</LessonText> <input inputMode="decimal" value={answers[q.id] ?? ''} onChange={e => set(q.id, e.target.value)} disabled={disabled} /></label>
        : <fieldset key={q.id}><legend><LessonText>{q.legend}</LessonText></legend>{q.options.map(o => <label key={o.value} className={q.inline ? 'ml-ladder-inline' : undefined}><input type="radio" name={`${q.id}-${problem.template}-${problem.seed}`} checked={answers[q.id] === o.value} onChange={() => set(q.id, o.value)} disabled={disabled} /> {o.label}</label>)}</fieldset>)}
      {!disabled && <div className="ml-actions"><button className="ml-primary">Check</button><button type="button" onClick={() => { setShown(true); finish(false, true) }}>Show the worked answer</button></div>}
    </form>
    {state?.message && !disabled && <p className="ml-caption" role="status"><LessonText>{state.message}</LessonText></p>}
    {disabled && state.correct && <p className="ml-ladder-pass" role="status"><strong>✓ Right.</strong></p>}
    {shown && <p role="status"><LessonText>{spec.workedSolution(problem)}</LessonText></p>}
  </div>
}

function TransferStep({ spec, state, update }) {
  const [kind, setKind] = useState(spec.templates[0])
  const seed = state.seeds[kind] ?? 1
  const problem = spec.generate(kind, seed)
  const solved = t => state.transfer.some(a => a.template === t && a.correct && !a.assisted)
  return <div>
    <div className="ml-actions" role="group" aria-label="Kind of problem">{spec.templates.map(t => <button key={t} aria-pressed={kind === t} className={kind === t ? 'ml-primary' : undefined} onClick={() => setKind(t)}>{spec.templateNames[t]}{solved(t) ? ' ✓' : ''}</button>)}</div>
    <Problem key={`${kind}-${seed}`} spec={spec} problem={problem} onResult={r => update(s => ({ ...s, transfer: [...s.transfer, { template: kind, seed, ...r, at: Date.now(), version: spec.version }] }))} />
    <div className="ml-actions"><button onClick={() => update(s => ({ ...s, seeds: { ...s.seeds, [kind]: seed + 1 } }))}>New problem of this kind</button></div>
  </div>
}

function ReviewStep({ spec, state, update, ready }) {
  const [active, setActive] = useState(null)
  const { due, history } = state.review, now = Date.now(), isDue = due != null && due <= now
  // Each return gets a problem it has not shown before, rotating through the kinds.
  const start = () => { const n = history.length; setActive({ template: spec.templates[(n + 2) % spec.templates.length], seed: 1000 + n * 37, early: !isDue }) }
  const record = r => update(s => {
    const h = [...s.review.history, { template: active.template, seed: active.seed, ...r, early: active.early, at: Date.now(), version: spec.version }]
    return { ...s, review: { history: h, due: nextReview(h) } }
  })
  return <div>
    <p className="ml-caption">{!ready ? 'Finish step 6 first for the first return date — or try one now; it will be recorded as early.' : due == null ? '' : isDue ? 'A return is due now.' : `Next return suggested on ${new Date(due).toLocaleDateString()}.`}</p>
    {history.length > 0 && <ul className="ml-caption">{history.slice(-5).map((h, i) => <li key={i}>{new Date(h.at).toLocaleDateString()}: {spec.templateNames[h.template]} — {h.correct ? 'right' : h.assisted ? 'opened the worked answer' : 'missed'}{h.early ? ' (early)' : ''}</li>)}</ul>}
    {!active ? <div className="ml-actions"><button className={isDue ? 'ml-primary' : undefined} onClick={start}>{isDue ? 'Start the return problem' : 'Do it now'}</button></div>
      : <><Problem key={active.seed} spec={spec} problem={spec.generate(active.template, active.seed)} onResult={record} /><div className="ml-actions"><button onClick={() => setActive(null)}>Close this problem</button></div></>}
  </div>
}

export default function Ladder({ name, spec, saved, onUpdate, onReview }) {
  const stored = saved.ladders?.[name]
  const state = stored ?? emptyState(spec.version)
  const [plain, setPlain] = useState(readPlain)
  const [openStep, setOpenStep] = useState(() => spec.steps.find(s => !state.steps[s.id]?.done)?.id ?? spec.steps[0].id)
  // Functional updates against the latest saved progress: a check that finishes after the learner
  // kept typing must not overwrite the newer code with the code it started from.
  const update = fn => onUpdate(p => ({ ...p, ladders: { ...p.ladders, [name]: fn(p.ladders?.[name] ?? emptyState(spec.version)) } }))
  const recordStep = id => patch => update(s => {
    const prev = s.steps[id] ?? {}
    const next = { ...prev, ...patch, attempts: (prev.attempts ?? 0) + (patch.attempts ?? 0), failed: (prev.failed ?? 0) + (patch.failed ?? 0), version: spec.version }
    if (patch.done && !prev.done) { next.doneAt = Date.now(); next.unassisted = !next.hinted && !next.revealed }
    return { ...s, steps: { ...s.steps, [id]: next } }
  })
  const transferDone = spec.templates.every(t => state.transfer.some(a => a.template === t && a.correct && !a.assisted))
  // The first return is scheduled once step 6 is complete.
  useEffect(() => { if (transferDone && !state.review.due && !state.review.history.length) update(s => ({ ...s, review: { ...s.review, due: nextReview([]) } })) }, [transferDone])  // eslint-disable-line react-hooks/exhaustive-deps
  const stepDone = s => s.kind === 'transfer' ? transferDone : s.kind === 'review' ? state.review.history.some(h => h.correct && !h.early) : Boolean(state.steps[s.id]?.done)
  return <section className="ml-ladder" aria-label={`Practice ladder: ${spec.title}`}>
    <span className="ml-eyebrow">Practice ladder</span>
    <h3>{spec.title}</h3>
    <p><LessonText>{spec.intro}</LessonText></p>
    {spec.review && onReview && <p className="ml-ladder-review"><LessonText>{spec.review.text}</LessonText> <button onClick={() => onReview(spec.review.lab, spec.review.lesson)}>{spec.review.label}</button></p>}
    {stored && stored.version !== spec.version && <p className="ml-caption">This ladder has changed since you last worked on it. Your earlier results are kept and marked with the version they were made on.</p>}
    <Evidence spec={spec} state={state} />
    <label className="ml-caption ml-ladder-inline"><input type="checkbox" checked={plain} onChange={e => { setPlain(e.target.checked); writePlain(e.target.checked) }} /> Use a plain text box instead of the code editor</label>
    <ol className="ml-ladder-steps">{spec.steps.map((s, i) => {
      const open = openStep === s.id, record = state.steps[s.id]
      return <li key={s.id} className={stepDone(s) ? 'done' : undefined}>
        <button className="ml-ladder-head" aria-expanded={open} onClick={() => setOpenStep(open ? null : s.id)}>
          <span>{i + 1}. <LessonText>{s.title}</LessonText></span>{['trace', 'probe', 'function'].includes(s.kind) ? <Status step={record} /> : <span className={`ml-ladder-status${stepDone(s) ? ' ml-ladder-done' : ''}`}>{stepDone(s) ? '✓ Done' : 'Open'}</span>}
        </button>
        {open && <div className="ml-ladder-body">
          <p><LessonText>{s.prompt}</LessonText></p>
          {s.kind === 'trace' && <TraceStep step={s} record={record} onRecord={recordStep(s.id)} />}
          {(s.kind === 'probe' || s.kind === 'function') && <CodeStep step={s} name={name} plain={plain} code={state.code[s.id] ?? s.starter} setCode={c => update(st => ({ ...st, code: { ...st.code, [s.id]: c } }))} record={record} onRecord={recordStep(s.id)} />}
          {s.kind === 'transfer' && <TransferStep spec={spec} state={state} update={update} />}
          {s.kind === 'review' && <ReviewStep spec={spec} state={state} update={update} ready={transferDone} />}
          {i < spec.steps.length - 1 && <div className="ml-actions"><button onClick={() => setOpenStep(spec.steps[i + 1].id)}>Next step →</button></div>}
        </div>}
      </li>
    })}</ol>
  </section>
}
