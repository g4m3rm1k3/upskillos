// LiveMachine.jsx
// The lab: mission panel (left), the running ship with inspector and logs (centre), the code
// that runs it (right). Code goes live a moment after you stop typing; the old version keeps
// the ship running if the new one doesn't compile.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { LEVELS, LEVEL_PROBLEMS } from './levels.js'
import { WORLDS } from './worlds/index.js'
import { VIEWS } from './worlds/views.js'
import { compile } from './compile.js'
import { createRunner } from './runner.js'
import { allPassed, runCases, show } from './checks.js'
import { ago, exportSave, importSave, levelSave, readSave, withLevel, writeSave } from './save.js'
import './liveMachine.css'

const TICK_MS = 500
const LIVE_DELAY_MS = 550

// The seasons still to come, shown on the star map so the journey is visible from day one.
const SEASONS = [
  'Wake up', 'Systems online', 'Control panel', "Ship's records", 'Salvage', 'Navigation', 'Scarcity',
  'Orbits', 'Noise', 'The core', 'Crew language', 'Many hands', 'Comms', 'Autopilot',
]

// `code`, **bold** and *italic* in lesson text.
function Rich({ text }) {
  const parts = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('`') && p.endsWith('`') && p.length > 1) return <code key={i}>{p.slice(1, -1)}</code>
    if (p.startsWith('**') && p.endsWith('**') && p.length > 3) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>
    return <span key={i}>{p}</span>
  })
}

function Stat({ s }) {
  return (
    <div className={`lm-stat tone-${s.tone}`}>
      <span className="lm-stat-label">{s.label}</span>
      <span className="lm-stat-value">{s.value}{s.unit ?? ''}</span>
      {s.bar != null && <span className="lm-stat-bar"><i style={{ width: `${Math.max(0, Math.min(1, s.bar)) * 100}%` }} /></span>}
    </div>
  )
}

function CaseList({ results, reveal = true }) {
  return (
    <ul className="lm-cases">
      {results.map((r, i) => (
        <li key={i} className={r.passed ? 'pass' : 'fail'} style={{ animationDelay: `${i * 70}ms` }}>
          <span className="lm-case-mark">{r.passed ? '✓' : '✗'}</span>
          <span className="lm-case-label">{r.label}</span>
          {!r.passed && reveal && (
            <span className="lm-case-why">
              {r.ok ? <>got <code>{show(r.value)}</code>, needed <code>{show(r.expect)}</code></> : <>error: {r.error}</>}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function LiveMachine({ onBack }) {
  const [save, setSave] = useState(() => readSave())
  const [firstLook] = useState(() => ({ lastVisit: save.lastVisit }))
  const [modal, setModal] = useState(() => (firstLook.lastVisit ? 'log' : 'intro'))
  const level = LEVELS.find(l => l.id === save.current) ?? LEVELS[0]
  const ls = levelSave(save, level.id)
  const world = WORLDS[level.world]
  const view = VIEWS[level.world]

  const update = useCallback((patch) => setSave(s => withLevel(s, level.id, typeof patch === 'function' ? patch(levelSave(s, level.id)) : patch)), [level.id])
  useEffect(() => { writeSave({ ...save, lastVisit: new Date().toISOString() }) }, [save])

  // ---- live code ---------------------------------------------------------------------------
  const runnerRef = useRef(null)
  const [logs, setLogs] = useState([])
  const [live, setLive] = useState({ state: 'starting', version: 0, errors: [], message: '' })
  const liveOk = useRef(false)
  const hung = useRef(false)
  const editorRef = useRef(null)
  const monacoRef = useRef(null)
  const codeRef = useRef(ls.code ?? level.starter)
  const [editorKey, setEditorKey] = useState(0)

  useEffect(() => {
    const runner = createRunner({ onLogs: lines => setLogs(l => [...l, ...lines].slice(-200)) })
    runnerRef.current = runner
    return () => runner.dispose()
  }, [])

  const call = useCallback(argsList => runnerRef.current.call(argsList), [])

  const step = level.steps[Math.min(ls.step, level.steps.length - 1)]
  const [goal, setGoal] = useState([])
  const [check, setCheck] = useState(null)

  const evaluateGoal = useCallback(async (stepToCheck) => {
    if (!liveOk.current) return
    const res = await runCases(call, stepToCheck.goal.cases)
    setGoal(res)
    if (allPassed(res)) {
      update(cur => (cur.stepsDone.includes(stepToCheck.id) || cur.predictions[stepToCheck.id] == null && stepToCheck.predict
        ? cur
        : { ...cur, stepsDone: [...cur.stepsDone, stepToCheck.id] }))
    }
  }, [call, update])

  const markers = useCallback(errors => {
    const m = monacoRef.current
    const model = editorRef.current?.getModel()
    if (!m || !model) return
    m.editor.setModelMarkers(model, 'live-machine', errors.map(e => ({
      startLineNumber: e.line, startColumn: e.column, endLineNumber: e.line, endColumn: e.column + Math.max(1, e.length),
      message: e.message, severity: m.MarkerSeverity.Error,
    })))
  }, [])

  const goLive = useCallback(async (source) => {
    setLive(l => ({ ...l, state: 'compiling' }))
    const out = await compile(source, level.language)
    markers(out.errors)
    if (!out.ok) {
      setLive(l => ({ ...l, state: 'error', errors: out.errors, message: liveOk.current ? 'Not live: the ship is still running your last working version.' : '' }))
      return
    }
    const r = await runnerRef.current.load(out.code, level.entry)
    if (!r.ok) {
      setLive(l => ({ ...l, state: 'error', errors: [{ line: 0, message: r.error }], message: liveOk.current ? 'Not live: the ship is still running your last working version.' : '' }))
      return
    }
    liveOk.current = true
    hung.current = false
    setLive(l => ({ state: 'live', version: l.version + 1, errors: [], message: '' }))
  }, [level.entry, level.language, markers])

  // Go live when a level opens, and re-check the step goal after every live version.
  useEffect(() => { liveOk.current = false; setGoal([]); setCheck(null); void goLive(codeRef.current) }, [level.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (live.state === 'live') void evaluateGoal(step) }, [live.version, step.id, ls.predictions[step.id]]) // eslint-disable-line react-hooks/exhaustive-deps

  const timer = useRef(null)
  const onCode = value => {
    codeRef.current = value ?? ''
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { update({ code: codeRef.current }); void goLive(codeRef.current) }, LIVE_DELAY_MS)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  // ---- the running world --------------------------------------------------------------------
  const [w, setW] = useState(() => world.create())
  const wRef = useRef(w)
  const [running, setRunning] = useState(true)
  const busy = useRef(false)
  const [selected, setSelected] = useState(view.defaultSelection)
  const [lastInputs, setLastInputs] = useState([])

  useEffect(() => { const fresh = world.create(); wRef.current = fresh; setW(fresh) }, [world])

  const tick = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      const cur = wRef.current
      const inputs = world.inputs(cur)
      let results = null
      if (liveOk.current && !hung.current) {
        results = await call(inputs)
        if (results.some(r => r.timeout)) {
          hung.current = true
          setLive(l => ({ ...l, state: 'error', errors: [{ line: 0, message: results.find(r => r.timeout).error }], message: '' }))
        }
      }
      const next = world.advance(cur, results)
      wRef.current = next
      setW(next)
      setLastInputs(inputs)
    } finally {
      busy.current = false
    }
  }, [call, world])

  useEffect(() => {
    if (!running || modal) return undefined
    const id = setInterval(() => { void tick() }, TICK_MS)
    return () => clearInterval(id)
  }, [running, tick, modal])

  // ---- step flow ---------------------------------------------------------------------------
  const stepIndex = Math.min(ls.step, level.steps.length - 1)
  const predicted = ls.predictions[step.id]
  const stepDone = ls.stepsDone.includes(step.id)
  const allStepsDone = level.steps.every(s => ls.stepsDone.includes(s.id))
  const hintsShown = ls.hintsShown?.[step.id] ?? 0
  const [showPiece, setShowPiece] = useState(false)
  useEffect(() => { setShowPiece(false) }, [step.id])

  const choose = i => update(cur => ({ ...cur, predictions: { ...cur.predictions, [step.id]: i } }))
  const goStep = i => update({ step: i })
  const moreHint = () => update(cur => ({ ...cur, hintsShown: { ...cur.hintsShown, [step.id]: Math.min(step.hints.length, (cur.hintsShown?.[step.id] ?? 0) + 1) } }))

  const runCheck = async () => {
    if (!liveOk.current) return
    setCheck({ running: true, results: [] })
    const results = await runCases(call, level.check.cases)
    setCheck({ running: false, results })
    if (allPassed(results)) {
      update({ complete: true })
      setModal('complete')
    }
  }

  const resetCode = () => {
    if (!window.confirm('Put this level\'s starting code back? Your current code will be replaced.')) return
    codeRef.current = level.starter
    update({ code: level.starter })
    setEditorKey(k => k + 1)
    void goLive(level.starter)
  }

  const openLevel = id => {
    setSave(s => ({ ...s, current: id }))
    const target = LEVELS.find(l => l.id === id)
    codeRef.current = levelSave(save, id).code ?? target.starter
    setEditorKey(k => k + 1)
    setModal(null)
  }

  const levelIndex = LEVELS.indexOf(level)
  const nextLevel = LEVELS[levelIndex + 1]

  // ---- save file ---------------------------------------------------------------------------
  const fileInput = useRef(null)
  const doExport = () => {
    const url = URL.createObjectURL(exportSave(save))
    const a = document.createElement('a')
    a.href = url
    a.download = `live-machine-save-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const doImport = async e => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const loaded = importSave(await file.text())
      const target = LEVELS.find(l => l.id === loaded.current) ?? LEVELS[0]
      codeRef.current = levelSave(loaded, target.id).code ?? target.starter
      setSave(loaded)
      setEditorKey(k => k + 1)
    } catch (err) {
      window.alert(err.message)
    }
  }

  // ---- inspector ---------------------------------------------------------------------------
  const selIndex = view.indexOf(w, selected)
  const selInput = lastInputs[selIndex]
  const selRoom = w.rooms?.[selIndex]
  const [tab, setTab] = useState('inspect')
  const stats = useMemo(() => world.stats(w), [w, world])

  const liveBadge = {
    starting: ['Booting', 'idle'], compiling: ['Compiling…', 'busy'], live: [`Live · v${live.version}`, 'ok'], error: ['Not live', 'bad'],
  }[live.state]

  return (
    <div className="lm-root">
      <div className="lm-stars" aria-hidden="true" />

      {/* ---- top bar ---- */}
      <header className="lm-top">
        {onBack && <button className="lm-btn ghost" onClick={onBack} aria-label="Back">←</button>}
        <div className="lm-brand">
          <span className="lm-brand-mark">◈</span>
          <span className="lm-brand-name">LIVE MACHINE</span>
          <span className="lm-brand-ship">MERIDIAN</span>
        </div>
        <button className="lm-chip" onClick={() => setModal('map')} title="Star map: all levels">
          S{level.season} · {level.seasonTitle ?? SEASONS[level.season]} <b>›</b> {level.order}. {level.title}
        </button>
        <div className="lm-stats">{stats.map(s => <Stat key={s.id} s={s} />)}</div>
        <div className="lm-top-actions">
          <button className="lm-btn ghost" onClick={doExport} title="Download your save as a file">Export save</button>
          <button className="lm-btn ghost" onClick={() => fileInput.current?.click()} title="Load a save file">Import</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={doImport} />
        </div>
      </header>

      {LEVEL_PROBLEMS.length > 0 && (
        <div className="lm-problems">Some level files have problems and were skipped: {LEVEL_PROBLEMS.join(' · ')}</div>
      )}

      <div className="lm-main">
        {/* ---- mission ---- */}
        <aside className="lm-mission">
          <div className="lm-mission-head">
            <div className="lm-kicker">Mission</div>
            <h1>{level.title}</h1>
            <p className="lm-tagline">{level.tagline}</p>
          </div>

          <ol className="lm-steps">
            {level.steps.map((s, i) => {
              const done = ls.stepsDone.includes(s.id)
              return (
                <li key={s.id} className={`${i === stepIndex ? 'is-cur' : ''}${done ? ' is-done' : ''}`}>
                  <button onClick={() => goStep(i)} disabled={i > 0 && !ls.stepsDone.includes(level.steps[i - 1].id) && !done}>
                    <span className="lm-step-dot">{done ? '✓' : i + 1}</span>
                    <span>{s.title}</span>
                  </button>
                </li>
              )
            })}
            <li className={`lm-steps-check${ls.complete ? ' is-done' : ''}`}>
              <span className="lm-step-dot">{ls.complete ? '✓' : '◎'}</span><span>Ship check</span>
            </li>
          </ol>

          <section className="lm-card lm-step" key={step.id}>
            <div className="lm-kicker">Step {stepIndex + 1} of {level.steps.length}</div>
            <h2>{step.title}</h2>
            {step.text.map((t, i) => <p key={i}><Rich text={t} /></p>)}

            {step.predict && (
              <div className={`lm-predict${predicted != null ? ' is-answered' : ''}`}>
                <div className="lm-predict-q"><span className="lm-badge">Predict first</span><Rich text={step.predict.question} /></div>
                <div className="lm-options">
                  {step.predict.options.map((o, i) => {
                    const cls = predicted == null ? '' : i === step.predict.answer ? ' is-right' : i === predicted ? ' is-wrong' : ' is-dim'
                    return (
                      <button key={i} className={`lm-option${cls}`} disabled={predicted != null} onClick={() => choose(i)}>
                        <Rich text={o} />
                      </button>
                    )
                  })}
                </div>
                {predicted != null && (
                  <p className="lm-explain">
                    <b>{predicted === step.predict.answer ? 'Right. ' : 'Not quite. '}</b><Rich text={step.predict.explain} />
                  </p>
                )}
              </div>
            )}

            {(predicted != null || !step.predict) && (
              <>
                <div className={`lm-goal${stepDone ? ' is-done' : ''}`}>
                  <div className="lm-goal-head">
                    <span className="lm-badge">{stepDone ? 'Done' : 'Goal'}</span> {step.goal.text}
                    <span className="lm-goal-live">{stepDone ? '' : 'checks every time your code goes live'}</span>
                  </div>
                  {goal.length > 0 && <CaseList results={goal} />}
                </div>

                <div className="lm-help">
                  {step.hints.slice(0, hintsShown).map((h, i) => <p key={i} className="lm-hint"><span>Hint {i + 1}</span><Rich text={h} /></p>)}
                  <div className="lm-help-row">
                    {hintsShown < step.hints.length && <button className="lm-btn small" onClick={moreHint}>{hintsShown ? 'Another hint' : 'I\'m stuck: hint'}</button>}
                    {step.code && hintsShown >= step.hints.length && !showPiece && <button className="lm-btn small ghost" onClick={() => setShowPiece(true)}>Show the piece</button>}
                  </div>
                  {showPiece && <pre className="lm-piece"><code>{step.code}</code></pre>}
                </div>
              </>
            )}

            <div className="lm-step-nav">
              {stepIndex > 0 && <button className="lm-btn ghost" onClick={() => goStep(stepIndex - 1)}>← Back</button>}
              {stepDone && stepIndex < level.steps.length - 1 && <button className="lm-btn primary" onClick={() => goStep(stepIndex + 1)}>Next step →</button>}
            </div>
          </section>

          <section className={`lm-card lm-check${allStepsDone ? ' is-ready' : ''}`}>
            <div className="lm-kicker">Ship check</div>
            <p><Rich text={level.check.text} /></p>
            <button className="lm-btn primary wide" onClick={runCheck} disabled={!liveOk.current || check?.running}>
              {check?.running ? 'Running scenarios…' : ls.complete ? 'Run ship check again' : 'Run ship check'}
            </button>
            {check?.results?.length > 0 && <CaseList results={check.results} />}
          </section>

          <details className="lm-briefing">
            <summary>Mission briefing</summary>
            {level.briefing.map((t, i) => <p key={i}><Rich text={t} /></p>)}
          </details>
        </aside>

        {/* ---- ship ---- */}
        <section className="lm-center">
          <div className="lm-viewport">
            <view.View world={w} selected={selected} onSelect={setSelected} />
            <div className="lm-transport">
              <button className="lm-btn small" onClick={() => setRunning(r => !r)}>{running ? '❚❚ Pause' : '▶ Run'}</button>
              <button className="lm-btn small ghost" onClick={() => { setRunning(false); void tick() }} disabled={running}>Step ›</button>
              <button className="lm-btn small ghost" onClick={() => { const f = world.create(); wRef.current = f; setW(f) }}>Restart ship</button>
              <span className="lm-tick">tick {w.tick}</span>
            </div>
          </div>

          <div className="lm-dock">
            <div className="lm-tabs" role="tablist">
              {[['inspect', 'Inspector'], ['log', 'Ship log'], ['console', `Console${logs.length ? ` (${logs.length})` : ''}`]].map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>{label}</button>
              ))}
            </div>
            <div className="lm-dock-body">
              {tab === 'inspect' && (
                <div className="lm-inspect">
                  {selInput ? (
                    <>
                      <div className="lm-inspect-call">
                        <span className="lm-fn">{level.entry}</span>(<span className="lm-arg">{view.argName}</span>)
                        <span className="lm-arrow">→</span>
                        <span className={`lm-ret ${selRoom?.error ? 'err' : selRoom?.answer === true ? 't' : 'f'}`}>
                          {selRoom?.error ? `error: ${selRoom.error}` : selRoom?.answer === undefined ? 'not called' : show(selRoom.answer)}
                        </span>
                      </div>
                      <div className="lm-inspect-grid">
                        <div>
                          <div className="lm-kicker">{view.argName}: what your function was given</div>
                          <pre className="lm-obj">{'{\n' + Object.entries(selInput[0]).map(([k, v]) => `  ${k}: ${show(v)},`).join('\n') + '\n}'}</pre>
                        </div>
                        <div>
                          <div className="lm-kicker">the ship did</div>
                          <p className="lm-did">{view.did(w, selIndex)}</p>
                          <p className="lm-tip">{view.selectTip} Pause and use <b>Step</b> to watch one tick at a time.</p>
                        </div>
                      </div>
                    </>
                  ) : <p className="lm-tip">Waiting for the first tick…</p>}
                </div>
              )}
              {tab === 'log' && (
                <ul className="lm-shiplog">
                  {[...w.log].reverse().map((e, i) => <li key={`${e.tick}-${i}`} className={`tone-${e.tone}`}><span className="lm-log-t">t{e.tick}</span><b>{e.who}</b> {e.text}</li>)}
                  {w.log.length === 0 && <li className="lm-tip">Quiet so far.</li>}
                </ul>
              )}
              {tab === 'console' && (
                <div className="lm-console">
                  {logs.length === 0 ? <p className="lm-tip">Anything your code passes to <code>console.log(...)</code> appears here.</p>
                    : <pre>{logs.join('\n')}</pre>}
                  {logs.length > 0 && <button className="lm-btn small ghost" onClick={() => setLogs([])}>Clear</button>}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---- code ---- */}
        <section className="lm-code">
          <div className="lm-code-head">
            <span className="lm-file">{level.file ?? `ship/${level.world}`}.{level.language === 'typescript' ? 'ts' : 'js'}</span>
            <span className={`lm-live tone-${liveBadge[1]}`}><i />{liveBadge[0]}</span>
            <button className="lm-btn small ghost" onClick={resetCode} title="Put the starting code back">Reset</button>
          </div>
          <div className="lm-editor">
            <Editor
              key={`${level.id}-${editorKey}`}
              defaultLanguage={level.language}
              defaultValue={codeRef.current}
              theme="vs-dark"
              onChange={onCode}
              onMount={(editor, monaco) => { editorRef.current = editor; monacoRef.current = monaco }}
              options={{ fontSize: 15, minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbersMinChars: 3, padding: { top: 14 }, fontLigatures: true, renderLineHighlight: 'gutter', tabSize: 2 }}
            />
          </div>
          <div className={`lm-code-foot${live.state === 'error' ? ' is-err' : ''}`}>
            {live.state === 'error' ? (
              <>
                {live.errors.map((e, i) => <div key={i}>{e.line ? <b>Line {e.line}: </b> : null}{e.message}</div>)}
                {live.message && <div className="lm-dim">{live.message}</div>}
              </>
            ) : live.state === 'live'
              ? <span>Your code is running the ship. Edit it: changes go live when you pause typing.</span>
              : <span className="lm-dim">Loading the compiler…</span>}
          </div>
        </section>
      </div>

      {/* ---- overlays ---- */}
      {modal === 'intro' && (
        <div className="lm-modal">
          <div className="lm-modal-card lm-intro">
            <div className="lm-kicker">Season {level.season} · {level.seasonTitle}</div>
            <h2>You wake up on the Meridian.</h2>
            {level.briefing.map((t, i) => <p key={i}><Rich text={t} /></p>)}
            <div className="lm-how">
              <div><b>Left</b> your mission, one small step at a time.</div>
              <div><b>Middle</b> the ship, running live. Click anything to inspect it.</div>
              <div><b>Right</b> the code that runs it. Your changes go live as you type.</div>
            </div>
            <button className="lm-btn primary wide" onClick={() => setModal(null)}>Take the controls</button>
          </div>
        </div>
      )}

      {modal === 'log' && (
        <div className="lm-modal">
          <div className="lm-modal-card">
            <div className="lm-kicker">Captain's log</div>
            <h2>Welcome back aboard.</h2>
            <p>Last on board <b>{ago(firstLook.lastVisit)}</b>.</p>
            <p>You were on <b>{level.title}</b>{ls.complete ? ' (complete)' : <>, step {stepIndex + 1}: <b>{step.title}</b></>}.</p>
            <p className="lm-dim">Your code and progress are saved on this computer. Use <b>Export save</b> to keep a backup.</p>
            <button className="lm-btn primary wide" onClick={() => setModal(null)}>Resume</button>
          </div>
        </div>
      )}

      {modal === 'complete' && (
        <div className="lm-modal">
          <div className="lm-modal-card lm-complete">
            <div className="lm-burst" aria-hidden="true" />
            <div className="lm-kicker">System online</div>
            <h2>{level.title}: restored.</h2>
            <p>The ship passed every scenario. What you used:</p>
            <div className="lm-tags">{level.concepts.map(c => <span key={c}>{c}</span>)}</div>
            <p className="lm-dim">This system stays in the ship. Later levels will lean on it, and ask more of it.</p>
            <div className="lm-step-nav">
              <button className="lm-btn ghost" onClick={() => setModal(null)}>Stay here</button>
              {nextLevel
                ? <button className="lm-btn primary" onClick={() => openLevel(nextLevel.id)}>Next: {nextLevel.title} →</button>
                : <button className="lm-btn primary" onClick={() => setModal('map')}>Star map</button>}
            </div>
          </div>
        </div>
      )}

      {modal === 'map' && (
        <div className="lm-modal" onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div className="lm-modal-card lm-map">
            <div className="lm-kicker">Star map</div>
            <h2>The journey</h2>
            <div className="lm-seasons">
              {SEASONS.map((name, season) => {
                const here = LEVELS.filter(l => l.season === season)
                return (
                  <div key={name} className={`lm-season${here.length ? '' : ' is-locked'}`}>
                    <div className="lm-season-head"><span>S{season}</span> {name}</div>
                    {here.length ? here.map(l => {
                      const s = levelSave(save, l.id)
                      return (
                        <button key={l.id} className={`lm-level${l.id === level.id ? ' is-cur' : ''}${s.complete ? ' is-done' : ''}`} onClick={() => openLevel(l.id)}>
                          <span>{s.complete ? '✓' : l.order}</span>{l.title}
                        </button>
                      )
                    }) : <div className="lm-dim small">Uncharted</div>}
                  </div>
                )
              })}
            </div>
            <button className="lm-btn ghost" onClick={() => setModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
