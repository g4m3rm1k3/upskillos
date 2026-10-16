import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { countSolved, upgradeProgress } from '../python-steps/progress.js'
import Blocks from './Blocks.jsx'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { LESSONS, PARTS, lessonById } from './lessons/index.js'
import '../qmaze-lab/style.css'
import './style.css'

const Playground = lazy(() => import('./Playground.jsx'))
const PythonTab = lazy(() => import('./PythonTab.jsx'))

// Progress on this device: which lessons are done, which checks each lesson has solved, and
// where the learner was. Lesson ids are the keys, so they never change.
const STORE = 'upskillos.cartpole-lab.v1'
function load() { try { return JSON.parse(localStorage.getItem(STORE)) ?? {} } catch { return {} } }
function save(state) { try { localStorage.setItem(STORE, JSON.stringify(state)) } catch { /* private window: progress just isn't kept */ } }

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
  const { checks, solved } = countSolved(lesson, saved)
  const finish = () => { setProgress(p => ({ ...p, done: { ...p.done, [lesson.id]: true } })); if (next) onOpen(next.id) }
  return <article className="qm-lesson">
    <header>
      <p className="qm-eyebrow">{lesson.part.title} · Lesson {lesson.number}</p>
      <h1>{lesson.title}</h1>
      <div className="qm-goal"><b>After this lesson you can:</b> <Markdown inline>{lesson.goal}</Markdown></div>
      {lesson.builds.length > 0 && <p className="qm-builds">Builds on {lesson.builds.map((id, i) => { const l = lessonById(id); return <span key={id}>{i ? ', ' : ''}<button className="qm-link" onClick={() => onOpen(id)}>{l.number} {l.title}</button></span> })}</p>}
    </header>
    <Blocks lesson={lesson} saved={saved} onSolved={onSolved} onPython={onPython} />
    <footer className="qm-lesson-end">
      {checks > 0 && <p className="qm-hint">{solved} of {checks} checks answered correctly in this lesson.</p>}
      <div className="qm-buttons">
        {prev && <button onClick={() => onOpen(prev.id)}>← {prev.number} {prev.title}</button>}
        <button className="qm-primary" onClick={finish}>{progress.done?.[lesson.id] ? '✓ Done' : 'Mark as done'}{next ? `, next: ${next.number} ${next.title} →` : ''}</button>
      </div>
    </footer>
  </article>
}

export default function CartPoleLab() {
  const [progress, setProgress] = useState(() => upgradeProgress(load(), lessonById))
  const [tab, setTab] = useState('lessons')
  const [python, setPython] = useState(null)
  const current = lessonById(progress.current) ?? LESSONS[0]
  const main = useRef(null)
  useEffect(() => save(progress), [progress])
  const open = id => { setProgress(p => ({ ...p, current: id })); setTab('lessons'); requestAnimationFrame(() => main.current?.scrollTo({ top: 0 })) }
  const openPython = spec => { setPython({ ...spec }); setTab('python') }
  return <div className="qm-lab cp-lab">
    <header className="qm-header">
      <div><h1>🛒 CartPole Lab</h1><p>Reinforcement learning on CartPole, from basic Python: physics, Q-learning, SARSA, REINFORCE, A2C and DQN</p></div>
      <div className="qm-tabs" role="tablist">
        {[['lessons', '📖 Lessons'], ['playground', '🧪 Playground'], ['python', '🐍 Real Python']].map(([id, label]) =>
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </div>
    </header>
    <div className="qm-body">
      {tab === 'lessons' && <>
        <Sidebar current={current.id} progress={progress} onOpen={open} />
        <main className="qm-main" ref={main}><Lesson key={current.id} lesson={current} progress={progress} setProgress={setProgress} onOpen={open} onPython={openPython} /></main>
      </>}
      {tab !== 'lessons' && <main className="qm-main qm-wide">
        <Suspense fallback={<p className="qm-hint">Loading…</p>}>
          {tab === 'playground' ? <Playground /> : <PythonTab request={python} onLesson={open} />}
        </Suspense>
      </main>}
    </div>
  </div>
}
