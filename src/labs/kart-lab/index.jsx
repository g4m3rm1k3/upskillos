import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import Blocks from '../python-steps/Blocks.jsx'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { LESSONS, PARTS, lessonById } from './lessons/index.js'
import { FIGURES } from './figures/index.js'
import { codeLines } from './source.js'
import Arena from './Arena.jsx'
import Training from './Training.jsx'
import Library from './Library.jsx'
import { unpack } from './engine/tabular.js'
import baselines from './baselines.json'
import '../qmaze-lab/style.css'
import './style.css'

const PythonTab = lazy(() => import('./PythonTab.jsx'))

// Progress (lessons done, checks solved, where the learner was) and saved drivers, on this device.
// Version 3 of the engine changed the rules drivers were trained for, so older drivers can't load;
// lesson progress from versions 1 and 2 carries over (the original lesson ids are unchanged).
const STORE = 'upskillos.kart-lab.v3'
function read() {
  try {
    const current = JSON.parse(localStorage.getItem(STORE))
    if (current) return { ...current, drivers: (Array.isArray(current.drivers) ? current.drivers : []).slice(0, 8).filter(d => { try { unpack(d.checkpoint); return typeof d.name === 'string' && typeof d.id === 'string' } catch { return false } }) }
    const old = JSON.parse(localStorage.getItem('upskillos.kart-lab.v2') ?? localStorage.getItem('upskillos.kart-lab.v1') ?? 'null')
    return old ? { done: old.done ?? {}, current: old.current, drivers: [], upgraded: true } : { drivers: [] }
  } catch { return { drivers: [] } }
}

function Sidebar({ current, progress, onOpen }) {
  return <nav className="qm-sidebar" aria-label="Lessons">
    {PARTS.map(part => <section key={part.id}>
      <h3>{part.title}</h3>
      <ol>{part.lessons.map(l => <li key={l.id}>
        <button className={l.id === current ? 'active' : ''} aria-current={l.id === current ? 'page' : undefined} onClick={() => onOpen(l.id)}>
          <span className="qm-num">{l.number}</span><span>{l.title}</span>{progress.done?.[l.id] && <span className="qm-done" aria-label="done">✓</span>}
        </button>
      </li>)}</ol>
    </section>)}
  </nav>
}

function Lesson({ lesson, progress, setProgress, onOpen, onPython, onRace }) {
  const index = LESSONS.findIndex(l => l.id === lesson.id), next = LESSONS[index + 1], prev = LESSONS[index - 1]
  const saved = progress.lessons?.[lesson.id] ?? {}
  const onSolved = k => setProgress(p => {
    const s = p.lessons?.[lesson.id] ?? {}
    if (s.solved?.includes(k)) return p
    return { ...p, lessons: { ...p.lessons, [lesson.id]: { ...s, solved: [...(s.solved ?? []), k] } } }
  })
  const checks = lesson.blocks.filter(b => b.predict || b.choice).length
  const solved = (saved.solved ?? []).length
  const finish = () => { setProgress(p => ({ ...p, done: { ...p.done, [lesson.id]: true } })); if (next) onOpen(next.id) }
  return <article className="qm-lesson">
    <header>
      <p className="qm-eyebrow">{lesson.part.title} · Lesson {lesson.number}</p>
      <h1>{lesson.title}</h1>
      <div className="qm-goal"><b>After this lesson you can:</b> <Markdown inline>{lesson.goal}</Markdown></div>
      {lesson.builds.length > 0 && <p className="qm-builds">Builds on {lesson.builds.map((id, i) => { const l = lessonById(id); return <span key={id}>{i ? ', ' : ''}<button className="qm-link" onClick={() => onOpen(id)}>{l.number} {l.title}</button></span> })}</p>}
    </header>
    {index === 0 && <div className="kl-intro"><span>WELCOME TO SUNLIT CIRCUIT</span><h2>Your next rival<br />is a model you trained.</h2><p>Learn the decisions. Tune the policy. Take the wheel.</p><button onClick={onRace}>Meet the drivers →</button></div>}
    <Blocks lesson={lesson} saved={saved} onSolved={onSolved} onPython={onPython} FIGURES={FIGURES} codeLines={codeLines} />
    <footer className="qm-lesson-end">
      {checks > 0 && <p className="qm-hint">{solved} of {checks} checks answered correctly in this lesson.</p>}
      <div className="qm-buttons">
        {prev && <button onClick={() => onOpen(prev.id)}>← {prev.number} {prev.title}</button>}
        <button className="qm-primary" onClick={finish}>{progress.done?.[lesson.id] ? '✓ Done' : 'Mark as done'}{next ? `, next: ${next.number} ${next.title} →` : ''}</button>
      </div>
    </footer>
  </article>
}

export default function KartLab() {
  const [progress, setProgress] = useState(read), [tab, setTab] = useState('lessons'), [python, setPython] = useState(null)
  const [notice, setNotice] = useState(() => read().upgraded ? 'KartLab has a new engine (sensors, a second track, linear drivers). Your lesson progress carried over; drivers saved for the old rules can\'t be loaded, so train new ones.' : '')
  const main = useRef(null), arenaSession = useRef(null)
  const current = lessonById(progress.current) ?? LESSONS[0]
  const drivers = useMemo(() => [...baselines, ...(progress.drivers ?? [])], [progress.drivers])
  useEffect(() => { try { const { upgraded, ...rest } = progress; localStorage.setItem(STORE, JSON.stringify(rest)) } catch { setNotice('Device storage is full or unavailable. Progress remains in this session; new drivers can\'t be saved until storage is available.') } }, [progress])
  const open = id => { setProgress(p => ({ ...p, current: id })); setTab('lessons'); requestAnimationFrame(() => main.current?.scrollTo?.({ top: 0 })) }
  const openPython = spec => { setPython({ ...spec }); setTab('python') }
  const saveDriver = driver => {
    if ((progress.drivers?.length ?? 0) >= 8) return 'Your library holds eight custom drivers. Remove one below before saving another.'
    const next = { ...progress, drivers: [...(progress.drivers ?? []), { ...driver, id: `driver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }] }
    try { localStorage.setItem(STORE, JSON.stringify(next)); setProgress(next); return null } catch { return 'Driver could not be saved: device storage is full or unavailable.' }
  }
  return <div className="qm-lab kl-lab">
    <header className="qm-header">
      <div><h1>🏎️ KartLab</h1><p>Reinforcement learning on a 3D kart racer, from basic Python: Q-learning, SARSA, Double Q, sensors that transfer to a new track, linear function approximation, and racing</p></div>
      <div className="qm-tabs" role="tablist" aria-label="KartLab sections">
        {[['lessons', '📖 Lessons'], ['race', '🏁 Race & watch'], ['training', '🧪 Train & compare'], ['python', '🐍 Real Python']].map(([id, label]) =>
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </div>
    </header>
    {notice && <p className="qm-feedback" role="status">{notice}</p>}
    <div className="qm-body">
      {tab === 'lessons' && <>
        <Sidebar current={current.id} progress={progress} onOpen={open} />
        <main className="qm-main" ref={main}><Lesson key={current.id} lesson={current} progress={progress} setProgress={setProgress} onOpen={open} onPython={openPython} onRace={() => setTab('race')} /></main>
      </>}
      {/* Training stays mounted so a run isn't lost on a tab switch; the arena keeps its race in a session ref. */}
      <main className="qm-main qm-wide" hidden={tab === 'lessons'}>
        <div hidden={tab !== 'training'}><Training drivers={drivers} onSave={saveDriver} /><Library drivers={progress.drivers ?? []} onSave={saveDriver} onRemove={id => setProgress(s => ({ ...s, drivers: s.drivers.filter(d => d.id !== id) }))} /></div>
        {tab === 'race' && <Arena drivers={drivers} session={arenaSession} />}
        {tab === 'python' && <Suspense fallback={<p className="qm-hint">Loading…</p>}><PythonTab request={python} onLesson={open} /></Suspense>}
      </main>
    </div>
  </div>
}
