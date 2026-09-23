import React from 'react'
import { roadmap } from './roadmap.js'
import { lessons, sources } from './lessons.js'

export default function LearningPath({ progress, lessonIndex, onLesson, onCode }) {
  const completed = lessons.filter(l => progress[l.id]?.passed).length
  const next = lessons.findIndex(l => !progress[l.id]?.passed)
  const coreCount = roadmap.filter(p => !p.optional).flatMap(p => p.labs).length
  return <main className="ml-path">
    <span className="ml-eyebrow">The full learning plan / Python basics → ML engineering</span>
    <h2>Your machine learning mastery path</h2>
    <p>{coreCount} core labs in learning order, followed by 5 optional specializations. Begin with Python basics and algebra. Each lab introduces its prerequisites before using them, and ends with something you can build and explain.</p>
    <section className="ml-location" aria-label="Your current position">
      <span className="ml-pill">You are here · Lab 01</span>
      <h3>Foundations & your first learning algorithm</h3>
      <p><strong>Current lesson:</strong> {lessons[lessonIndex].title}</p>
      <p>{completed}/{lessons.length} numeric checkpoints passed. These are practice checks, not a certification of mastery.</p>
      <progress value={completed} max={lessons.length} aria-label="Lab 01 numeric checkpoint progress" />
      <div className="ml-actions"><button className="ml-primary" onClick={() => onLesson(lessonIndex)}>Continue current lesson</button><button onClick={() => next < 0 ? onCode() : onLesson(next)}>{next < 0 ? 'Next: implement and explain' : 'Next unchecked lesson'}</button></div>
    </section>
    <p><strong>How to follow the order:</strong> finish the preceding core lab before advancing; revisit earlier material whenever a prerequisite feels unclear. The plan is deliberately sequential. Optional branches can be chosen after the core based on your projects.</p>
    <p><strong>Availability:</strong> Lab 01 is built. The remaining labs below are planned, not hidden or locked content. There are no automatic completion claims for labs that do not exist yet.</p>
    {roadmap.map((phase, phaseIndex) => <section className="ml-path-phase" key={phase.title}>
      <span className="ml-eyebrow">{phase.optional ? 'Choose your specialization' : `Stage ${phaseIndex + 1}`}</span>
      <h3>{phase.title}</h3><p>{phase.goal}</p>
      <ol className="ml-ordered-labs" start={phase.labs[0].number}>
        {phase.labs.map(lab => <li key={lab.number} className={lab.available ? 'ml-current-lab' : ''}>
          <div className="ml-lab-row"><span className="ml-lab-number">{String(lab.number).padStart(2, '0')}</span><h4>{lab.title}</h4><span className="ml-pill">{lab.available ? 'Available now' : 'Planned'}</span></div>
          <p>{lab.topics}</p>
          <details open={lab.available}><summary>{lab.available ? 'Your lessons & completion evidence' : 'What you will build and demonstrate'}</summary>
            {lab.available && <ol className="ml-path-lessons">{lessons.map((lesson, i) => <li key={lesson.id}><button onClick={() => onLesson(i)} aria-current={i === lessonIndex ? 'step' : undefined}><span>{lesson.title}</span><small>{i === lessonIndex ? 'Current lesson' : progress[lesson.id]?.passed ? 'Checkpoint passed' : 'Not checked'}</small></button></li>)}</ol>}
            <p><strong>Build:</strong> {lab.build}</p><p><strong>Demonstrate:</strong> {lab.evidence}</p>
            {lab.available && <button onClick={onCode}>Open the Python implementation challenge</button>}
          </details>
        </li>)}
      </ol>
    </section>)}
    <section className="ml-path-phase"><h3>What mastery means here</h3><p>Explain the intuition, define every symbol, derive the essential mathematics, implement the core algorithm, predict its behavior, diagnose failures, and transfer it to a new problem. For engineering, also reproduce, test, deploy and maintain the system. Revisit projects after a break and solve variants without following the solution.</p><p>Each planned algorithm lab will follow: concrete example → prerequisites → derivation → small implementation → visualization → prediction and experiment → failure analysis → library comparison → independent challenge.</p><h3>Reference spine</h3>{sources.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></p>)}<p><a href="https://d2l.ai/" target="_blank" rel="noreferrer">Dive into Deep Learning · neural-network mathematics and implementations ↗</a></p></section>
  </main>
}
