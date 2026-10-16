import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import Blocks from '../python-steps/Blocks.jsx'
import { checkKey, countSolved, upgradeSaved } from '../python-steps/progress.js'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { LESSONS, PARTS, lessonById } from './lessons/index.js'
import { FIGURES } from './figures/index.js'
import { codeLines } from './source.js'
import Decoder from './Decoder.jsx'
import '../qmaze-lab/style.css'
import './style.css'

const PythonTab = lazy(() => import('./PythonTab.jsx'))

// Progress on this device: lessons marked done, checks solved per lesson, and where the learner was.
// The key and format are the opening chapter's, so its six lessons keep their progress.
const STORE = 'upskillos.math-for-ml.v1'
function load() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE))
    if (!value || typeof value !== 'object') return {}
    const lessons = {}
    for (const lesson of LESSONS) {
      const solved = value.lessons?.[lesson.id]?.solved
      const keys = new Set(lesson.blocks.filter(b => b.predict || b.choice || b.exercise).map(checkKey))
      if (Array.isArray(solved)) lessons[lesson.id] = { solved: upgradeSaved(lesson, { solved }).solved.filter(k => keys.has(k)) }
    }
    return { current: lessonById(value.current) ? value.current : LESSONS[0].id, lessons, done: Object.fromEntries(LESSONS.filter(l => value.done?.[l.id] === true).map(l => [l.id, true])) }
  } catch { return {} }
}

function Sidebar({ current, progress, onOpen }) {
  return <nav className="qm-sidebar" aria-label="Lessons">
    {PARTS.map(part => <section key={part.id}>
      <h3>{part.title}</h3>
      <ol>{part.lessons.map(l => <li key={l.id}>
        <button className={l.id === current ? 'active' : ''} aria-current={l.id === current ? 'page' : undefined} onClick={() => onOpen(l.id)}>
          <span className="qm-num">{l.number}</span><span><Markdown inline>{l.title}</Markdown></span>{progress.done?.[l.id] && <span className="qm-done" aria-label="done">✓</span>}
        </button>
      </li>)}</ol>
    </section>)}
    <p className="math-sidebar-note">Assumes only basic algebra. Every symbol is built before it is used.</p>
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
  const { checks, solved } = countSolved(lesson, saved, b => b.predict || b.choice || b.exercise)
  const finish = () => { setProgress(p => ({ ...p, done: { ...p.done, [lesson.id]: true } })); if (next) onOpen(next.id) }
  return <article className="qm-lesson">
    <header>
      <p className="qm-eyebrow">{lesson.part.title} · Lesson {lesson.number}</p>
      <h1><Markdown inline>{lesson.title}</Markdown></h1>
      <div className="qm-goal"><b>After this lesson you can:</b> <Markdown inline>{lesson.goal}</Markdown></div>
      {lesson.builds.length > 0 && <p className="qm-builds">Builds on {lesson.builds.map((id, i) => { const l = lessonById(id); return <span key={id}>{i ? ', ' : ''}<button className="qm-link" onClick={() => onOpen(id)}>{l.number} <Markdown inline>{l.title}</Markdown></button></span> })}</p>}
    </header>
    <Blocks lesson={lesson} saved={saved} onSolved={onSolved} onPython={onPython} FIGURES={FIGURES} codeLines={codeLines} />
    <footer className="qm-lesson-end">
      {checks > 0 && <p className="qm-hint">{solved} of {checks} checks done in this lesson, the coding exercise included.</p>}
      <div className="qm-buttons">
        {prev && <button onClick={() => onOpen(prev.id)}>← {prev.number}</button>}
        <button className="qm-primary" onClick={finish}>{progress.done?.[lesson.id] ? '✓ Done' : 'Mark as done'}{next ? `, next: ${next.number} →` : ''}</button>
      </div>
    </footer>
  </article>
}

export default function MathForMLLab() {
  const [progress, setProgress] = useState(load)
  const [tab, setTab] = useState('lessons'), [python, setPython] = useState(null)
  const current = lessonById(progress.current) ?? LESSONS[0]
  const main = useRef(null)
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(progress)) } catch { /* the session still works without storage */ } }, [progress])
  const open = id => { setProgress(p => ({ ...p, current: id })); setTab('lessons'); requestAnimationFrame(() => main.current?.scrollTo?.({ top: 0 })) }
  const openPython = spec => { setPython({ ...spec }); setTab('python') }
  return <div className="qm-lab math-ml-lab">
    <header className="qm-header">
      <div><h1>📐 Math for ML Lab</h1><p>The mathematics of machine learning from basic algebra: every symbol built, every big equation assembled</p></div>
      <div className="qm-tabs" role="tablist">
        {[['lessons', '📖 Lessons'], ['decoder', '🔣 Symbol decoder'], ['python', '🐍 Real Python']].map(([id, label]) =>
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </div>
    </header>
    <div className="qm-body">
      {tab === 'lessons' && <>
        <Sidebar current={current.id} progress={progress} onOpen={open} />
        <main className="qm-main" ref={main}><Lesson key={current.id} lesson={current} progress={progress} setProgress={setProgress} onOpen={open} onPython={openPython} /></main>
      </>}
      {tab !== 'lessons' && <main className="qm-main qm-wide">
        {tab === 'decoder' ? <Decoder onLesson={open} /> : <Suspense fallback={<p className="qm-hint">Loading…</p>}><PythonTab request={python} onLesson={open} /></Suspense>}
      </main>}
    </div>
  </div>
}
