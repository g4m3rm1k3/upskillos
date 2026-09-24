import React from 'react'
import { roadmap } from './roadmap.js'
import { labs, isAvailable, labByNumber } from './labs/index.js'

export default function LearningPath({ progress, currentLab, lessonIndex, onOpen }) {
  const passed = lab => lab.lessons.filter(l => progress[l.id]?.passed).length
  const coreCount = roadmap.filter(p => !p.optional && !p.advanced).flatMap(p => p.labs).length
  const optionalCount = roadmap.filter(p => p.optional).flatMap(p => p.labs).length
  const advancedCount = roadmap.filter(p => p.advanced).flatMap(p => p.labs).length
  const totalChecks = labs.reduce((t, lab) => t + lab.lessons.length, 0)
  const totalPassed = labs.reduce((t, lab) => t + passed(lab), 0)
  const next = currentLab.lessons.findIndex(l => !progress[l.id]?.passed)
  const planned = roadmap.flatMap(p => p.labs).filter(l => !isAvailable(l.number)).length
  const currentPlan = roadmap.flatMap(p => p.labs).find(l => l.number === currentLab.number)
  const n2 = n => String(n).padStart(2, '0')
  return <main className="ml-path">
    <span className="ml-eyebrow">The full learning plan / Python basics → ML engineering</span>
    <h2>Your machine learning mastery path</h2>
    <p>{coreCount} core labs in learning order, {optionalCount} optional specializations, then {advancedCount} advanced labs covering the probability, theory and modern models taught in university courses. Begin with Python basics and algebra. Each lab introduces its prerequisites before using them, and ends with something you can build and explain.</p>
    <section className="ml-location" aria-label="Your current position">
      <span className="ml-pill">You are here · Lab {n2(currentLab.number)}</span>
      <h3>{currentPlan.title}</h3>
      <p><strong>Current lesson:</strong> {currentLab.lessons[lessonIndex]?.title}</p>
      <p>{passed(currentLab)}/{currentLab.lessons.length} numeric checkpoints passed in this lab · {totalPassed}/{totalChecks} across all labs. These are practice checks, not a certification of mastery.</p>
      <progress value={passed(currentLab)} max={currentLab.lessons.length} aria-label={`Lab ${n2(currentLab.number)} numeric checkpoint progress`} />
      <div className="ml-actions"><button className="ml-primary" onClick={() => onOpen(currentLab.number, lessonIndex)}>Continue current lesson</button><button onClick={() => next < 0 ? onOpen(currentLab.number, 0, 'code') : onOpen(currentLab.number, next)}>{next < 0 ? 'Next: implement and explain' : 'Next unchecked lesson'}</button></div>
    </section>
    <p><strong>How to follow the order:</strong> finish the preceding core lab before advancing; revisit earlier material whenever a prerequisite feels unclear. The plan is deliberately sequential. Optional branches can be chosen after the core based on your projects.</p>
    <p><strong>Availability:</strong> {planned === 0 ? 'Every lab below is built: lessons with numeric checkpoints, a live experiment, and a Python implementation challenge with independent checks.' : `${labs.length} labs are built; ${planned} are still planned. There are no automatic completion claims for labs that do not exist yet.`}</p>
    {roadmap.map((phase, phaseIndex) => <section className="ml-path-phase" key={phase.title}>
      <span className="ml-eyebrow">{phase.optional ? 'Choose your specialization' : phase.advanced ? 'Advanced track · after the core' : `Stage ${phaseIndex + 1}`}</span>
      <h3>{phase.title}</h3><p>{phase.goal}</p>
      <ol className="ml-ordered-labs" start={phase.labs[0].number}>
        {phase.labs.map(plan => {
          const available = isAvailable(plan.number), lab = available ? labByNumber(plan.number) : null, current = plan.number === currentLab.number
          return <li key={plan.number} className={current ? 'ml-current-lab' : ''}>
            <div className="ml-lab-row"><span className="ml-lab-number">{n2(plan.number)}</span><h4>{plan.title}</h4><span className="ml-pill">{!available ? 'Planned' : current ? 'Current lab' : `${passed(lab)}/${lab.lessons.length} checks`}</span></div>
            <p>{plan.topics}</p>
            <details open={current}><summary>{available ? 'Lessons & completion evidence' : 'What you will build and demonstrate'}</summary>
              {available && <ol className="ml-path-lessons">{lab.lessons.map((lesson, i) => <li key={lesson.id}><button onClick={() => onOpen(plan.number, i)} aria-current={current && i === lessonIndex ? 'step' : undefined}><span>{lesson.title}</span><small>{current && i === lessonIndex ? 'Current lesson' : progress[lesson.id]?.passed ? 'Checkpoint passed' : 'Not checked'}</small></button></li>)}</ol>}
              <p><strong>Build:</strong> {plan.build}</p><p><strong>Demonstrate:</strong> {plan.evidence}</p>
              {available && <div className="ml-actions"><button className="ml-primary" onClick={() => onOpen(plan.number, 0)}>Open Lab {n2(plan.number)}</button><button onClick={() => onOpen(plan.number, 0, 'code')}>Open the Python implementation challenge</button></div>}
            </details>
          </li>
        })}
      </ol>
    </section>)}
    <section className="ml-path-phase"><h3>What mastery means here</h3><p>Explain the intuition, define every symbol, derive the essential mathematics, implement the core algorithm, predict its behavior, diagnose failures, and transfer it to a new problem. For engineering, also reproduce, test, deploy and maintain the system. Revisit projects after a break and solve variants without following the solution.</p><p>Every lab follows: concrete example → prerequisites → derivation → small implementation → visualization → prediction and experiment → failure analysis → independent challenge.</p><h3>Reference spine</h3>{labByNumber(1).sources.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></p>)}<p><a href="https://d2l.ai/" target="_blank" rel="noreferrer">Dive into Deep Learning · neural-network mathematics and implementations ↗</a></p></section>
  </main>
}
