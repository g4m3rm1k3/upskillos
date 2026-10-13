import { useEffect, useRef, useState } from 'react'
import Blocks from '../python-steps/Blocks.jsx'
import { LESSONS } from './lessons.js'
import Motion from './Motion.jsx'
import '../qmaze-lab/style.css'
import './style.css'

const STORE = 'upskillos.math-for-ml.v1'
const FIGURES = { Motion }
function loadProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE))
    if (!value || typeof value !== 'object') return {}
    const lessons = {}
    for (const lesson of LESSONS) {
      const solved = value.lessons?.[lesson.id]?.solved
      if (Array.isArray(solved)) lessons[lesson.id] = { solved: solved.filter(k => Number.isInteger(k) && (lesson.blocks[k]?.predict || lesson.blocks[k]?.choice)) }
    }
    return { current: LESSONS.some(l => l.id === value.current) ? value.current : LESSONS[0].id, lessons,
      done: Object.fromEntries(LESSONS.filter(l => value.done?.[l.id] === true).map(l => [l.id, true])) }
  } catch { return {} }
}
const JOURNEY = [
  ['Available · Observation and measurement', 'A falling ball, quantities and units, paired observations, graphs, functions, signed change, average velocity.'],
  ['Planned · Change at an instant', 'Closer observations, limits, derivatives, local approximations, and the assumptions behind them.'],
  ['Planned · Accumulation', 'Add small changes, build integrals, connect velocity to position and acceleration to the falling-ball model.'],
  ['Planned · Scaling and algebra', 'Multiplication as scaling, offsets, equations, and prediction rules built one operation at a time.'],
  ['Planned · Linear algebra: from arrows to transformations', 'Coordinates and vectors; addition and scaling; length and direction; dot products as projection and weighted combination; matrices as transformations; systems of equations, span, independence, and least squares. Later: eigenvectors and principal components. Every operation has a 2D picture and a numerical walkthrough.'],
  ['Planned · Statistics: from measurements to evidence', 'Repeated measurements; tables and distributions; mean, median, spread, variance and standard deviation; samples versus populations; probability, conditional probability and Bayes’ rule; expectation; sampling variability, estimation, confidence intervals and hypothesis tests. Then covariance, correlation, regression, residuals, and prediction uncertainty.'],
  ['Planned · Learning from error', 'Squared error, partial derivatives, gradients, and why a parameter adjustment changes a prediction.'],
  ['Planned · Connected models', 'Nonlinear functions, the chain rule, and backpropagation with each intermediate quantity exposed.'],
]

export default function MathForMLLab() {
  const [progress, setProgress] = useState(loadProgress)
  const [tab, setTab] = useState('lessons')
  const main = useRef(null)
  const lesson = LESSONS.find(l => l.id === progress.current) ?? LESSONS[0]
  const index = LESSONS.indexOf(lesson)
  const saved = progress.lessons?.[lesson.id] ?? {}
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(progress)) } catch { /* Session remains usable without storage. */ } }, [progress])
  function open(id) { setProgress(p => ({ ...p, current: id })); setTab('lessons'); if (main.current) main.current.scrollTop = 0 }
  function solved(k) {
    setProgress(p => {
      const s = p.lessons?.[lesson.id]?.solved ?? []
      return { ...p, lessons: { ...p.lessons, [lesson.id]: { solved: s.includes(k) ? s : [...s, k] } } }
    })
  }
  const checks = lesson.blocks.filter(b => b.predict || b.choice).length
  return <div className="qm-lab math-ml-lab">
    <header className="qm-header"><div><h1>📐 Math for ML Lab</h1><p>From observation to learning · every symbol has a meaning</p></div>
      <div className="qm-tabs" aria-label="Lab views">{[['lessons', 'Lessons'], ['journey', 'The journey']].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
    </header>
    <div className="qm-body">
      <nav className="qm-sidebar" aria-label="Lessons"><h3>1 · Observe and measure</h3><ol>{LESSONS.map((l, i) => <li key={l.id}><button className={tab === 'lessons' && lesson.id === l.id ? 'active' : ''} aria-current={tab === 'lessons' && lesson.id === l.id ? 'page' : undefined} onClick={() => open(l.id)}><span className="qm-num">1.{i + 1}</span><span>{l.title}</span>{progress.done?.[l.id] && <span className="qm-done" aria-label="Marked read">✓</span>}</button></li>)}</ol><p className="math-sidebar-note">No previous mathematics or programming assumed. Move at your own pace; every lesson stays available.</p></nav>
      <main className="qm-main" ref={main}>
        {tab === 'lessons' ? <article className="qm-lesson" key={lesson.id}>
          <header><p className="qm-eyebrow">Part 1 · Observation and measurement · Lesson 1.{index + 1}</p><h1>{lesson.title}</h1><div className="qm-goal"><b>After this lesson you can:</b> {lesson.goal}</div></header>
          <Blocks lesson={lesson} saved={saved} onSolved={solved} FIGURES={FIGURES} />
          <footer className="qm-lesson-end"><p className="qm-hint">{saved.solved?.length ?? 0} of {checks} checks answered correctly. Marking a lesson read records your place, not mastery.</p><div className="qm-buttons">
            {index > 0 && <button onClick={() => open(LESSONS[index - 1].id)}>← Previous lesson</button>}
            <button onClick={() => setProgress(p => ({ ...p, done: { ...p.done, [lesson.id]: true } }))}>{progress.done?.[lesson.id] ? '✓ Marked read' : 'Mark as read'}</button>
            {index < LESSONS.length - 1 ? <button className="qm-primary" onClick={() => open(LESSONS[index + 1].id)}>Next: {LESSONS[index + 1].title} →</button> : <button className="qm-primary" onClick={() => setTab('journey')}>See the planned journey →</button>}
          </div></footer>
        </article> : <article className="qm-lesson"><p className="qm-eyebrow">The curriculum</p><h1>From observation to learning</h1><p>Mathematics for machine learning from first principles. Start with things you can observe; develop precise definitions and worked reasoning before using them in a model.</p><p><b>Calculus, linear algebra, and statistics are three core strands.</b> Each gets a full progression from its prerequisites. They meet in model fitting: linear algebra describes the model, calculus tells us how it changes, and statistics helps us judge what the data supports. The outline below groups topics; smaller lessons will interleave them as their prerequisites become available.</p><aside className="qm-note key">The opening chapter is available now. The stages below describe future curriculum, not completed lessons.</aside>{JOURNEY.map(([title, body]) => <section key={title}><h2 className="qm-h">{title}</h2><p>{body}</p></section>)}<button onClick={() => open(lesson.id)}>Return to your lesson</button></article>}
      </main>
    </div>
  </div>
}
