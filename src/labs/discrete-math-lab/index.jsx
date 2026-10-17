import { useEffect, useRef, useState } from 'react'
import Blocks, { checkKey, isCheck } from './Blocks.jsx'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { LESSONS, PARTS, lessonById } from './lessons/index.js'
import { FIGURES } from './figures/index.js'
import Decoder from './Decoder.jsx'
import PuzzlesTab from './PuzzlesTab.jsx'
import '../qmaze-lab/style.css'
import './style.css'

const STORE = 'upskillos.discrete-math-lab.v1'

function load() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE))
    if (!value || typeof value !== 'object') return {}
    const lessons = {}
    for (const lesson of LESSONS) {
      const solved = value.lessons?.[lesson.id]?.solved
      const keys = new Set(lesson.blocks.filter(isCheck).map(checkKey))
      if (Array.isArray(solved)) lessons[lesson.id] = { solved: solved.filter(k => keys.has(k)) }
    }
    return {
      current: lessonById(value.current) ? value.current : LESSONS[0].id,
      lessons,
      done: Object.fromEntries(LESSONS.filter(l => value.done?.[l.id] === true).map(l => [l.id, true])),
      puzzles: Array.isArray(value.puzzles) ? value.puzzles : [],
    }
  } catch {
    return {}
  }
}

function Sidebar({ current, progress, onOpen }) {
  return <nav className="qm-sidebar" aria-label="Lessons">
    {PARTS.map(part => <section key={part.id}>
      <h3>{part.title}</h3>
      <ol>{part.lessons.map(l => <li key={l.id}>
        <button className={l.id === current ? 'active' : ''} aria-current={l.id === current ? 'page' : undefined} onClick={() => onOpen(l.id)}>
          <span className="qm-num">{l.number}</span>
          <span><Markdown inline>{l.title}</Markdown></span>
          {progress.done?.[l.id] && <span className="qm-done" aria-label="done">✓</span>}
        </button>
      </li>)}</ol>
    </section>)}
    <p className="math-sidebar-note">From propositional logic to mastery: every symbol, proof strategy, and theorem built from first principles.</p>
  </nav>
}

function Lesson({ lesson, progress, setProgress, onOpen, onPuzzle }) {
  const index = LESSONS.findIndex(l => l.id === lesson.id)
  const next = LESSONS[index + 1]
  const prev = LESSONS[index - 1]
  const saved = progress.lessons?.[lesson.id] ?? {}

  const onSolved = k => setProgress(p => {
    const s = p.lessons?.[lesson.id] ?? {}
    if (s.solved?.includes(k)) return p
    return { ...p, lessons: { ...p.lessons, [lesson.id]: { ...s, solved: [...(s.solved ?? []), k] } } }
  })

  const checkBlocks = lesson.blocks.filter(isCheck)
  const checks = checkBlocks.length
  const solvedCount = checkBlocks.filter(b => (saved.solved ?? []).includes(checkKey(b))).length

  const finish = () => {
    setProgress(p => ({ ...p, done: { ...p.done, [lesson.id]: true } }))
    if (next) onOpen(next.id)
  }

  return <article className="qm-lesson">
    <header>
      <p className="qm-eyebrow">{lesson.part.title} · Lesson {lesson.number}</p>
      <h1><Markdown inline>{lesson.title}</Markdown></h1>
      <div className="qm-goal"><b>After this lesson you can:</b> <Markdown inline>{lesson.goal}</Markdown></div>
      {lesson.builds.length > 0 && (
        <p className="qm-builds">
          Builds on {lesson.builds.map((id, i) => {
            const l = lessonById(id)
            return l ? (
              <span key={id}>
                {i ? ', ' : ''}
                <button className="qm-link" onClick={() => onOpen(id)}>{l.number} <Markdown inline>{l.title}</Markdown></button>
              </span>
            ) : null
          })}
        </p>
      )}
    </header>
    <Blocks lesson={lesson} saved={saved} onSolved={onSolved} onPuzzle={onPuzzle} FIGURES={FIGURES} />
    <footer className="qm-lesson-end">
      {checks > 0 && <p className="qm-hint">{solvedCount} of {checks} checks & proof builders completed in this lesson.</p>}
      <div className="qm-buttons">
        {prev && <button onClick={() => onOpen(prev.id)}>← {prev.number}</button>}
        <button className="qm-primary" onClick={finish}>
          {progress.done?.[lesson.id] ? '✓ Done' : 'Mark as done'}{next ? `, next: ${next.number} →` : ''}
        </button>
      </div>
    </footer>
  </article>
}

export default function DiscreteMathLab() {
  const [progress, setProgress] = useState(load)
  const [tab, setTab] = useState('lessons')
  const [activePuzzle, setActivePuzzle] = useState('knights')
  const current = lessonById(progress.current) ?? LESSONS[0]
  const main = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(progress)) } catch { /* works without storage */ }
  }, [progress])

  const open = id => {
    setProgress(p => ({ ...p, current: id }))
    setTab('lessons')
    requestAnimationFrame(() => main.current?.scrollTo?.({ top: 0 }))
  }

  const openPuzzle = puzzleId => {
    setActivePuzzle(puzzleId || 'knights')
    setTab('puzzles')
    requestAnimationFrame(() => main.current?.scrollTo?.({ top: 0 }))
  }

  const solvePuzzle = chId => {
    setProgress(p => {
      const list = p.puzzles ?? []
      if (list.includes(chId)) return p
      return { ...p, puzzles: [...list, chId] }
    })
  }

  return <div className="qm-lab discrete-math-lab">
    <header className="qm-header">
      <div>
        <h1>🧩 Discrete Math Lab</h1>
        <p>Logic, proofs, sets, combinatorics, number theory, recurrences, graphs, probability & automata — from first principles to mastery</p>
      </div>
      <div className="qm-tabs" role="tablist">
        {[
          ['lessons', '📖 Lessons'],
          ['puzzles', '🧩 Puzzles & Challenges'],
          ['decoder', '🔣 Symbol & Theorem Decoder'],
        ].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
    </header>
    <div className="qm-body">
      {tab === 'lessons' && <>
        <Sidebar current={current.id} progress={progress} onOpen={open} />
        <main className="qm-main" ref={main}>
          <Lesson key={current.id} lesson={current} progress={progress} setProgress={setProgress} onOpen={open} onPuzzle={openPuzzle} />
        </main>
      </>}
      {tab === 'puzzles' && (
        <main className="qm-main qm-wide" ref={main}>
          <PuzzlesTab
            activePuzzle={activePuzzle}
            onSelectPuzzle={setActivePuzzle}
            solvedPuzzles={progress.puzzles ?? []}
            onSolvePuzzle={solvePuzzle}
          />
        </main>
      )}
      {tab === 'decoder' && (
        <main className="qm-main qm-wide" ref={main}>
          <Decoder onLesson={open} />
        </main>
      )}
    </div>
  </div>
}
