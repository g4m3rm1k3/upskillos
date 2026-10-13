import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import Blocks from '../python-steps/Blocks.jsx'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { LESSONS, PARTS, lessonById } from './lessons/index.js'
import { FIGURES } from './figures/index.js'
import { codeLines } from './source.js'
import Table from './Table.jsx'
import Workshop from './Workshop.jsx'
import { SUPPLIED } from './players.js'
import '../qmaze-lab/style.css'
import './style.css'

const PythonTab = lazy(() => import('./PythonTab.jsx'))

// Progress on this device (lessons done, checks solved, where the learner was) and the learner's own
// saved players. Lesson ids are the progress keys, so they never change.
const STORE = 'upskillos.tabletop-rl-lab.v2'
const PLAYERS = 'upskillos.tabletop-rl-lab.players.v2'
const LIMIT = 8
function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback } }
function validPlayer(p) { return p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.weights) && p.weights.length === (p.bonus ? 19 : 13) && p.weights.every(Number.isFinite) }

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

function Lesson({ lesson, progress, setProgress, onOpen, onPython }) {
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

export default function TabletopLab() {
  const [progress, setProgress] = useState(() => load(STORE, {}))
  const [saved, setSaved] = useState(() => { const list = load(PLAYERS, []); return Array.isArray(list) ? list.filter(validPlayer).slice(0, LIMIT) : [] })
  const [tab, setTab] = useState('lessons'), [python, setPython] = useState(null), [notice, setNotice] = useState('')
  const current = lessonById(progress.current) ?? LESSONS[0]
  const main = useRef(null)
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(progress)) } catch { /* private window: progress just isn't kept */ } }, [progress])
  const players = useMemo(() => [...SUPPLIED, ...saved.map(p => ({ ...p, custom: true }))], [saved])
  const store = next => { try { localStorage.setItem(PLAYERS, JSON.stringify(next)); setSaved(next); return null } catch { setSaved(next); return 'Saved for this session only: browser storage is full or unavailable.' } }
  const savePlayer = p => saved.length >= LIMIT ? `The library holds ${LIMIT} players. Remove one first.` : store([...saved, { ...p, id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }])
  const removePlayer = id => { const error = store(saved.filter(p => p.id !== id)); setNotice(error ?? 'Removed. A table already in progress keeps its players until New table.') }
  const open = id => { setProgress(p => ({ ...p, current: id })); setTab('lessons'); requestAnimationFrame(() => main.current?.scrollTo?.({ top: 0 })) }
  const openPython = spec => { setPython({ ...spec }); setTab('python') }
  return <div className="qm-lab tt-shell">
    <header className="qm-header">
      <div><h1>🎲 Tabletop RL Lab</h1><p>Reinforcement learning on Yahtzee, from basic Python: probability, exact planning, Q-learning, SARSA, afterstates and TD(0), graded against the right answer</p></div>
      <div className="qm-tabs" role="tablist">
        {[['lessons', '📖 Lessons'], ['table', '🎲 Table'], ['workshop', '🧪 Workshop'], ['python', '🐍 Real Python']].map(([id, label]) =>
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </div>
    </header>
    {notice && <p className="qm-feedback" role="status">{notice}</p>}
    <div className="qm-body">
      {tab === 'lessons' && <>
        <Sidebar current={current.id} progress={progress} onOpen={open} />
        <main className="qm-main" ref={main}><Lesson key={current.id} lesson={current} progress={progress} setProgress={setProgress} onOpen={open} onPython={openPython} /></main>
      </>}
      {/* The Table and the Workshop stay mounted, so a game or a training run survives any tab switch. */}
      <main className="qm-main qm-wide" hidden={tab === 'lessons'}>
        <div hidden={tab !== 'table'} className="tt-lab tt-embedded"><Table players={players} visible={tab === 'table'} /></div>
        <div hidden={tab !== 'workshop'} className="tt-lab tt-embedded"><Workshop players={players} onSave={savePlayer} onRemove={removePlayer} /></div>
        {tab === 'python' && <Suspense fallback={<p className="qm-hint">Loading…</p>}><PythonTab request={python} onLesson={open} /></Suspense>}
      </main>
    </div>
  </div>
}
