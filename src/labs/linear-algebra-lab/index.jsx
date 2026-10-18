import { useEffect, useId, useRef, useState } from 'react'
import { LESSONS, MODULES, STAGES, SYNTAX, TRACK_STAGE } from './curriculum.js'
import { ROLES } from './lessons/uses.js'
import { startRun } from './runner.js'
import { readProgress, saveProgress } from './storage.js'
import Explore from './Explore.jsx'
import { CodeEditor, CodeView } from './code.jsx'
import { AnglesCard, ProgressMap, Notation, Proof, QuickCheck, Review, UsesCard, WhyCard } from './Study.jsx'
import { dueItems, schedule } from './review.js'
import ProblemSet from './ProblemSet.jsx'
import { problemsFor } from './practice/index.js'
import Plot from './Plot.jsx'
import MarkdownProse from '../../components/math/MarkdownProse.jsx'
import { useThemeColors } from '../../hooks/useThemeColors.js'
import './lab.css'

// Each module has its own hue (light, dark), so the curriculum has landmarks instead of one colour.
const HUES = [['#b45309', '#fbbf24'], ['#be123c', '#fb7185'], ['#6d28d9', '#a78bfa'], ['#1d4ed8', '#60a5fa'], ['#0e7490', '#22d3ee'], ['#a21caf', '#e879f9'], ['#047857', '#34d399'], ['#c2410c', '#fb923c'], ['#4338ca', '#818cf8']]
const hue = module => { const [light, dark] = HUES[Math.max(0, MODULES.indexOf(module)) % HUES.length]; return { '--mod-l': light, '--mod-d': dark } }
const pad = n => String(n).padStart(2, '0')

function Prose({ children }) { return <div className="la-prose"><MarkdownProse text={children} /></div> }

function Figure({ json, colors }) {
  let figure
  try { figure = typeof json === 'string' ? JSON.parse(json) : json } catch { return null }
  if (!figure) return null
  if (figure.type === 'opencalc_subplots') return <div className="la-subplots">{figure.panels.map((panel, index) => panel && <Figure key={index} json={panel} colors={colors} />)}</div>
  return <Plot figure={figure} colors={colors} />
}

const num = value => typeof value === 'number' ? (Number.isInteger(value) ? String(value) : value.toPrecision(5).replace(/\.?0+$/, '')) : String(value)

// Show a workspace value the way it is written on paper: a bracketed grid, not a JSON string.
function Value({ entry }) {
  const { value } = entry
  if (typeof value === 'number') return <span className="la-scalar">{num(value)}</span>
  const rows = Array.isArray(value) ? (Array.isArray(value[0]) ? value : [value]) : null
  if (!rows || rows.length > 12 || rows[0].length > 60 || rows.some(row => !Array.isArray(row) || row.some(cell => typeof cell !== 'number'))) return <code className="la-preview">{entry.preview.length > 90 ? `${entry.preview.slice(0, 90)}…` : entry.preview}</code>
  return <div className="la-matrix" style={{ gridTemplateColumns: `repeat(${rows[0].length}, auto)` }}>{rows.flatMap((row, r) => row.map((cell, c) => <span key={`${r}-${c}`}>{num(cell)}</span>))}</div>
}

function Result({ value, colors }) {
  if (!value) return <div className="la-output-empty"><span aria-hidden="true">▶</span><p>Run the code to see printed values, variables and plots here.</p></div>
  if (value.error) return <div className="la-feedback la-error" role="alert"><strong>OpenMAT stopped.</strong> {value.error}</div>
  const allPass = value.checks.length > 0 && value.checks.every(check => check.pass)
  return <div className="la-result">
    {value.checks.length > 0 && <div className={`la-feedback ${allPass ? 'la-success' : ''}`} role="status"><h3>{allPass ? 'All checks passed' : 'Keep experimenting'}</h3><ul>{value.checks.map((check, i) => <li key={i} className={check.pass ? 'la-pass' : 'la-fail'}><span aria-hidden="true">{check.pass ? '✓' : '○'}</span><div><strong>{check.name}</strong> {check.pass ? 'Correct value and shape.' : check.message}</div></li>)}</ul></div>}
    <Figure json={value.result.figureJson} colors={colors} />
    {value.result.output && <pre className="la-console" aria-label="OpenMAT output">{value.result.output}</pre>}
    {!value.result.output && <pre className="la-console la-muted" aria-label="OpenMAT output">(nothing printed — use disp to show a value)</pre>}
    {value.result.compatibilityWarnings?.length > 0 && <p className="la-muted">{value.result.compatibilityWarnings.join(' ')}</p>}
    {value.result.workspace.length > 0 && <details className="la-details" open><summary>Workspace · {value.result.workspace.length} variables</summary><div className="la-workspace">{value.result.workspace.map(entry => <div key={entry.name} className="la-var"><div><strong>{entry.name}</strong><small>{entry.size.join(' × ')}</small></div><Value entry={entry} /></div>)}</div></details>}
  </div>
}

// The hero picture: a sheared grid, its basis columns and one transformed vector.
function HeroArt() {
  const A = [[1, 0.55], [0.3, 1]], S = 34, C = [170, 120], map = ([x, y]) => [C[0] + S * (A[0][0] * x + A[0][1] * y), C[1] - S * (A[1][0] * x + A[1][1] * y)]
  const seg = (a, b, key, cls) => { const [x1, y1] = map(a), [x2, y2] = map(b); return <line key={key} className={cls} x1={x1} y1={y1} x2={x2} y2={y2} /> }
  const ticks = Array.from({ length: 15 }, (_, i) => i - 7)
  return <svg className="la-hero-art" viewBox="0 0 340 240" aria-hidden="true">
    {ticks.map(k => <g key={k}>{seg([k, -7], [k, 7], 'v', k ? 'la-hero-grid' : 'la-hero-axis')}{seg([-7, k], [7, k], 'h', k ? 'la-hero-grid' : 'la-hero-axis')}</g>)}
    <polygon className="la-fill" style={{ '--tone': 'var(--c-dir)' }} points={[[0, 0], [1, 0], [1, 1], [0, 1]].map(p => map(p).join(',')).join(' ')} />
    {[[[1, 0], 'i'], [[0, 1], 'j'], [[2.2, 1.6], 'v']].map(([p, tone]) => { const [x, y] = map(p), angle = Math.atan2(y - C[1], x - C[0]), wing = o => `${x - 11 * Math.cos(angle + o)},${y - 11 * Math.sin(angle + o)}`
      return <g key={tone} style={{ '--tone': `var(--c-${tone})` }}><line x1={C[0]} y1={C[1]} x2={x - 5 * Math.cos(angle)} y2={y - 5 * Math.sin(angle)} className="la-hero-vec" /><polygon className="la-hero-tip" points={`${wing(0.45)} ${x},${y} ${wing(-0.45)}`} /></g> })}
  </svg>
}

function Hero() {
  return <section className="la-hero">
    <div className="la-hero-text">
      <div className="la-eyebrow">Start with basic algebra</div>
      <h1>Linear algebra, <em>seen</em>, <em>run</em> and <em>understood</em>.</h1>
      <p>No programming needed to begin. Every idea starts with why it matters and where it is used, then gives you a picture to drag, code to change and practice that checks your answers. Use it beside your course or textbook.</p>
      <ol className="la-stages">{STAGES.map(([stage, modules], i) => <li key={stage}><strong>{i + 1}. {stage}</strong><span>{modules.map(module => <i key={module} style={hue(module)}>{module}</i>)}</span></li>)}</ol>
    </div>
    <HeroArt />
  </section>
}

export default function LinearAlgebraLab() {
  const instance = useId()
  const tabButtons = useRef({})
  const colors = useThemeColors()
  const [store, setStore] = useState(readProgress)
  const [tab, setTab] = useState('learn')
  const [view, setView] = useState('lesson')
  const [menu, setMenu] = useState(false)
  const [reference, setReference] = useState(false)
  const [saved, setSaved] = useState(true)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const activeRun = useRef(null)
  const revision = useRef(0)
  const main = useRef(null)
  const lesson = LESSONS.find(item => item.id === store.current) || LESSONS[0]
  const index = LESSONS.indexOf(lesson)
  const done = store.done || {}
  const doneCount = LESSONS.filter(item => done[item.id]).length
  const independent = LESSONS.filter(item => done[item.id] && !done[item.id].assisted).length
  const demo = typeof store.demos?.[lesson.id] === 'string' ? store.demos[lesson.id] : lesson.demo.code
  const draft = typeof store.drafts?.[lesson.id] === 'string' ? store.drafts[lesson.id] : lesson.challenge.starter
  const [hints, setHints] = useState(0)
  const due = dueItems(LESSONS, store).length
  const TABS = [['learn', 'Learn & run'], ['explore', 'Visual playground'], ['practice', 'Practice & challenge'], ...(problemsFor(lesson).length ? [['problems', 'Problem set']] : []), ...(lesson.proof ? [['reason', 'Reason & prove']] : [])]

  useEffect(() => { setSaved(saveProgress(store)) }, [store])
  useEffect(() => () => { revision.current++; activeRun.current?.cancel() }, [])

  function stop() { revision.current++; activeRun.current?.cancel(); activeRun.current = null; setRunning(false) }
  function switchTab(value) { stop(); setTab(value); setResult(null) }
  function go(item) {
    stop(); setStore(previous => ({ ...previous, current: item.id })); setMenu(false)
    setResult(null); setHints(0); setTab('learn'); setView('lesson'); main.current?.scrollTo?.({ top: 0 })
  }
  function openView(next) { stop(); setView(next); setMenu(false); main.current?.scrollTo?.({ top: 0 }) }
  const answer = (key, correct) => setStore(previous => ({ ...previous, review: { ...previous.review, [key]: schedule(previous.review?.[key], correct) } }))
  function edit(field, code) {
    stop(); setResult(null)
    setStore(previous => ({ ...previous, [field]: { ...previous[field], [lesson.id]: code } }))
  }
  async function run(practice) {
    stop()
    const token = ++revision.current
    setRunning(true); setResult(null)
    try {
      const payload = practice ? { source: `${lesson.challenge.setup}\n${draft}`, code: draft, checks: lesson.challenge.checks, cases: lesson.challenge.cases } : { source: lesson.demo.draw ? `${demo}
${lesson.demo.draw}` : demo }
      const job = startRun(payload)
      activeRun.current = job
      const response = await job.promise
      if (token !== revision.current) return
      setResult(response)
      if (!practice && !response.error) setStore(previous => previous.ran?.[lesson.id] ? previous : ({ ...previous, ran: { ...previous.ran, [lesson.id]: new Date().toISOString() } }))
      if (practice && !response.error && response.checks.length && response.checks.every(check => check.pass)) {
        setStore(previous => ({ ...previous, done: { ...previous.done, [lesson.id]: { code: draft, assisted: Boolean(previous.viewed?.[lesson.id]), at: new Date().toISOString() } } }))
      }
    } catch (error) { if (token === revision.current) setResult({ error: error.message }) }
    finally { if (token === revision.current) { setRunning(false); activeRun.current = null } }
  }
  const viewSolution = event => {
    if (event.currentTarget.open) setStore(previous => ({ ...previous, viewed: { ...previous.viewed, [lesson.id]: true } }))
  }
  const runButtons = (practice, label, busy) => <div className="la-actions">
    <button type="button" className="la-primary" disabled={running} onClick={() => run(practice)}><span aria-hidden="true">▶</span> {running ? busy : label}</button>
    {running && <button type="button" onClick={stop}>Stop</button>}
    <button type="button" className="la-ghost" onClick={() => practice ? edit('drafts', lesson.challenge.starter) : edit('demos', lesson.demo.code)}>{practice ? 'Restore starter' : 'Restore example'}</button>
  </div>

  return <div className={`la-lab ${colors.dark ? 'la-dark' : ''}`} style={hue(lesson.module)}>
    <aside className={`la-sidebar ${menu ? 'la-open' : ''}`} aria-label="Series curriculum">
      <div className="la-brand"><span className="la-brand-icon" aria-hidden="true">A<i>x</i></span><div>Linear Algebra Lab<small>Powered by OpenMAT</small></div></div>
      <div className="la-progress"><div><strong>{doneCount} / {LESSONS.length}</strong><span>challenges checked</span></div><div className="la-bar-track"><i style={{ width: `${100 * doneCount / LESSONS.length}%` }} /></div><progress className="la-sr" aria-label="Challenges passed" max={LESSONS.length} value={doneCount} /><small>{independent} passed without opening a reference</small></div>
      <div className="la-views"><button type="button" aria-pressed={view === 'map'} onClick={() => openView('map')}><span aria-hidden="true">◫</span> Progress map</button><button type="button" aria-pressed={view === 'review'} onClick={() => openView('review')}><span aria-hidden="true">↻</span> Review{due ? <b>{due} due</b> : null}</button></div>
      <nav aria-label="Modules and lessons">{STAGES.map(([stage, stageModules], stageIndex) => <div key={stage} className="la-stage-group"><div className="la-stage-label">{TRACK_STAGE === stage ? `${stage} · any order` : `Stage ${stageIndex + 1} · ${stage}`}</div>{stageModules.map(module => {
        const moduleIndex = MODULES.indexOf(module)
        const items = LESSONS.filter(item => item.module === module), finished = items.filter(item => done[item.id]).length
        return <details key={module} open={lesson.module === module || undefined} className="la-module" style={hue(module)}><summary><span className="la-module-num">{pad(moduleIndex + 1)}</span><span className="la-module-name">{module}</span><span className="la-module-count">{finished}/{items.length}</span></summary><ol>{items.map(item => <li key={item.id}><button type="button" aria-current={item.id === lesson.id ? 'step' : undefined} onClick={() => go(item)}><span className={done[item.id] ? 'la-status la-complete' : 'la-status'}>{done[item.id] ? '✓' : pad(LESSONS.indexOf(item) + 1)}</span>{item.title}</button></li>)}</ol></details>
      })}</div>)}</nav>
      <div className="la-sidebar-note">Starts from basic algebra; no programming needed. Code runs in your browser.</div>
    </aside>
    <main className="la-main" ref={main}>
      <header className="la-topbar"><button type="button" className="la-menu-button" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? 'Close curriculum' : 'Curriculum'}</button><span className="la-crumb"><i />{lesson.module}<b>›</b>{lesson.title}</span><button type="button" onClick={() => setReference(!reference)} aria-expanded={reference}>{reference ? 'Close syntax guide' : 'Syntax guide'}</button></header>
      <div className="la-content">
        {view === 'map' && <ProgressMap lessons={LESSONS} modules={MODULES} store={store} onOpen={go} hue={hue} />}
        {view === 'review' && <Review lessons={LESSONS} store={store} onAnswer={answer} onOpen={go} />}
        {view === 'lesson' && <>
        {index === 0 && <Hero />}
        {!saved && <p role="status" className="la-feedback la-error">Browser storage is unavailable. Your work will last until this lab closes. Copy code you want to keep.</p>}
        {reference && <section className="la-card la-reference"><h2>OpenMAT from zero</h2><p>Code is a sequence of instructions. Run executes them from top to bottom in a fresh workspace. Challenge data runs first. Ctrl/Cmd + Enter runs the focused editor.</p><dl>{SYNTAX.map(([code, meaning]) => <div key={code}><dt><CodeView code={code} inline /></dt><dd>{meaning}</dd></div>)}</dl><p className="la-muted">OpenMAT uses a practical MATLAB-style subset. The examples here are tested in this engine. No installation or paid software is needed.</p></section>}
        <section className="la-lesson-header">
          <div className="la-meta"><span className="la-chip">{lesson.module}</span><span>Lesson {pad(index + 1)} of {LESSONS.length}</span><span>{lesson.level}</span>{lesson.track && <span className="la-chip">Optional track</span>}<span>about {lesson.minutes} min</span></div>
          <h1>{lesson.title}</h1><p>{lesson.objective}</p>
          {lesson.uses?.some(use => use.who !== 'general') && <div className="la-fields" aria-label="Fields where this is used">{lesson.uses.filter(use => use.who !== 'general').map(use => <span key={use.who}>{ROLES.find(([id]) => id === use.who)?.[1]}</span>)}</div>}
          {done[lesson.id] && <span className="la-earned">✓ {done[lesson.id].assisted ? 'Checked with reference support' : 'Challenge passed'}{done[lesson.id].code !== draft ? ' · draft has changed since that pass' : ''}</span>}
        </section>
        <div className="la-tabs" role="tablist" aria-label="Lesson activities">{TABS.map(([id, label], position) => <button key={id} ref={element => { tabButtons.current[id] = element }} id={`${instance}-tab-${id}`} type="button" role="tab" tabIndex={tab === id ? 0 : -1} aria-selected={tab === id} aria-controls={`${instance}-panel-${id}`} onClick={() => switchTab(id)} onKeyDown={event => {
          const ids = TABS.map(([key]) => key)
          const next = event.key === 'ArrowRight' ? ids[(position + 1) % ids.length] : event.key === 'ArrowLeft' ? ids[(position + ids.length - 1) % ids.length] : event.key === 'Home' ? ids[0] : event.key === 'End' ? ids.at(-1) : null
          if (next) { event.preventDefault(); switchTab(next); tabButtons.current[next]?.focus() }
        }}><span>{pad(position + 1)}</span>{label}</button>)}</div>
        <div role="tabpanel" id={`${instance}-panel-${tab}`} aria-labelledby={`${instance}-tab-${tab}`} key={`${lesson.id}-${tab}`}>
          {tab === 'learn' && <div className="la-learn">
            <WhyCard why={lesson.why} />
            <UsesCard uses={lesson.uses} roles={ROLES} role={store.role} onRole={role => setStore(previous => ({ ...previous, role }))} />
            <section className="la-card la-reading"><div className="la-eyebrow">Start with a concrete example</div>{lesson.prose.map((paragraph, i) => <Prose key={i}>{paragraph}</Prose>)}</section>
            <Notation items={lesson.notation} />
            <AnglesCard angles={lesson.angles} />
            <div className="la-pair">
              <section className="la-card la-procedure"><div className="la-eyebrow">A procedure to keep</div><ol>{lesson.procedure.map((step, i) => <li key={i}><Prose>{step}</Prose></li>)}</ol></section>
              <section className="la-card la-predict"><div className="la-eyebrow">Pause & predict</div><Prose>{lesson.prediction.question}</Prose><details className="la-details"><summary>Compare your reasoning</summary><Prose>{lesson.prediction.answer}</Prose></details></section>
            </div>
            <section className="la-card la-workbench-card"><div className="la-section-title"><div><div className="la-eyebrow">Worked example</div><h2>Read it. Change it. Run it.</h2></div><span className="la-engine-badge">OpenMAT</span></div>
              <p className="la-muted">The example is editable. Change one input, predict the result, then run. Every run starts fresh; variables do not carry between lessons.</p>
              <div className="la-workbench">
                <div><CodeEditor label="Worked example code" code={demo} onChange={code => edit('demos', code)} onRun={() => run(false)} disabled={running} dark={colors.dark} />{runButtons(false, 'Run example', 'Running…')}
                  {lesson.demo.draw && <details className="la-details la-draw-code"><summary>Drawing code: you don't need this yet</summary><CodeView code={lesson.demo.draw} label="Drawing code" /><p className="la-muted">This runs after your code to draw the picture. It uses your variable names, so keep them when you edit.</p></details>}</div>
                <div className="la-output"><Result value={result} colors={colors} /></div>
              </div>
              <h3>Read the code, line by line</h3>
              <dl className="la-explanations">{lesson.demo.explain.map((line, i) => <div key={i}><dt><CodeView code={line.code} inline /></dt><dd>{line.meaning}</dd></div>)}</dl>
            </section>
            <QuickCheck key={lesson.id} lesson={lesson} onAnswer={answer} />
            <div className="la-next-activity"><p>Explain one change in your own words before moving on.</p><button type="button" className="la-primary" onClick={() => switchTab('explore')}>Open visual playground →</button></div>
          </div>}
          {tab === 'explore' && <><Explore lesson={lesson} /><div className="la-next-activity"><p>Now apply the idea with different inputs.</p><button type="button" className="la-primary" onClick={() => switchTab('practice')}>Try the challenge →</button></div></>}
          {tab === 'practice' && <section className="la-card">
            <div className="la-eyebrow">Build it yourself</div><h2>Your challenge</h2><Prose>{lesson.challenge.prompt}</Prose>
            <div className="la-given"><span>Given data · runs before your code</span><CodeView code={lesson.challenge.setup} label="Given data" /></div>
            <div className="la-workbench">
              <div><CodeEditor label="Your challenge code" code={draft} onChange={code => edit('drafts', code)} onRun={() => run(true)} disabled={running} dark={colors.dark} />{runButtons(true, 'Run & check challenge', 'Checking…')}
                <p className="la-muted">Checks inspect the values and shapes you computed. {lesson.challenge.cases?.length ? 'Your same code also runs on transfer datasets.' : 'Use the given data to derive your result.'} Passing records your practice; the transfer question below takes the idea further.</p></div>
              <div className="la-output"><Result value={result} colors={colors} /></div>
            </div>
            <div className="la-support"><h3>Need a foothold?</h3>{lesson.challenge.hints.slice(0, hints).map((hint, i) => <p key={i} className="la-hint"><strong>Hint {i + 1}</strong> {hint}</p>)}<button type="button" disabled={hints >= lesson.challenge.hints.length} onClick={() => setHints(hints + 1)}>{hints ? 'Reveal next hint' : 'Reveal first hint'}</button></div>
            <details className="la-details la-reference-answer" onToggle={viewSolution}><summary>Reveal reference solution · counts as assisted practice</summary><CodeView code={lesson.challenge.solution} label="Reference solution" /><p className="la-muted">Compare each operation with your approach. Then attempt the transfer task without copying.</p></details>
            <div className="la-transfer"><div className="la-eyebrow">Transfer the idea</div><h3>Go beyond the check</h3><Prose>{lesson.challenge.transfer}</Prose><p className="la-muted">This extension is self assessed. Record a prediction, working code, a numerical check, and an explanation of a failure case.</p></div>
            {problemsFor(lesson).length > 0 && <div className="la-next-activity"><p>One challenge is not enough. Solve varied problems with fresh numbers.</p><button type="button" className="la-primary" onClick={() => switchTab('problems')}>Work the problem set →</button></div>}
            {!problemsFor(lesson).length && lesson.proof && <div className="la-next-activity"><p>You can compute it. Now show why it must be true.</p><button type="button" className="la-primary" onClick={() => switchTab('reason')}>Reason it out →</button></div>}
          </section>}
          {tab === 'problems' && <ProblemSet key={lesson.id} lesson={lesson} store={store} setStore={setStore} colors={colors} renderResult={value => <Result value={value} colors={colors} />} />}
          {tab === 'reason' && lesson.proof && <Proof key={lesson.id} lesson={lesson} proved={store.proved?.[lesson.id]} onComplete={record => setStore(previous => ({ ...previous, proved: { ...previous.proved, [lesson.id]: record } }))} />}
        </div>
        <footer className="la-footer">
          <button type="button" disabled={index === 0} onClick={() => go(LESSONS[index - 1])}>← Previous lesson</button>
          <span>{index + 1} of {LESSONS.length}</span>
          <button type="button" disabled={index === LESSONS.length - 1} onClick={() => go(LESSONS[index + 1])}>Next lesson →</button>
        </footer>
        </>}
      </div>
    </main>
  </div>
}
