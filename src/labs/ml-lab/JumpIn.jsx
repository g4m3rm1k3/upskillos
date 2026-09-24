import React, { useState } from 'react'
import LessonText from './LessonText.jsx'
import { labForLesson } from './labs/index.js'

// “Jumping in here from a course?” Three prerequisite checks per lab. Answers are submitted
// together; a wrong answer explains the likely misconception and links to the exact lesson that
// teaches it. The result is a recommendation, never a gate or a claim of readiness.
export function reviewTarget(id) {
  const lab = labForLesson(id)
  if (!lab) return null
  const index = lab.lessons.findIndex(l => l.id === id)
  return { number: lab.number, index, title: lab.lessons[index].title }
}

export default function JumpIn({ lab, jumpIn, onReview }) {
  const [picked, setPicked] = useState({}), [submitted, setSubmitted] = useState(null), [rounds, setRounds] = useState(0)
  if (!jumpIn) return null
  const all = jumpIn.checks.every((_, i) => picked[i] !== undefined)
  const missed = submitted ? jumpIn.checks.filter((c, i) => submitted[i] !== c.answer) : []
  const route = [...new Set(missed.flatMap(c => c.review))].map(reviewTarget).filter(Boolean)
    .sort((a, b) => a.number - b.number || a.index - b.index)
  const link = t => <button key={`${t.number}-${t.index}`} type="button" className="ml-review-link" onClick={() => onReview(t.number, t.index)}>Lab {String(t.number).padStart(2, '0')} · {t.title} →</button>
  return <details className="ml-jumpin">
    <summary>Jumping in here from a course? Three quick prerequisite checks</summary>
    <p className="ml-caption">If you worked through the earlier labs you can skip this. If you arrived from a university course or a later lecture, answer all three, then check them. Each miss names the exact lesson to revisit, and <strong>Back to Lab {String(lab.number).padStart(2, '0')}</strong> brings you straight back. Three questions are a quick screen, not a test: the result is a suggestion, and you can start the lab either way.</p>
    <form onSubmit={e => { e.preventDefault(); if (!all) return; setSubmitted({ ...picked }); setRounds(r => r + 1) }}>
      <ol className="ml-jumpin-checks">{jumpIn.checks.map((c, i) => {
        const s = submitted?.[i], good = s === c.answer
        return <li key={i}>
          <p><LessonText>{c.question}</LessonText></p>
          <fieldset className="ml-choices" aria-label={`Prerequisite check ${i + 1}`}>{c.choices.map((ch, j) => <label key={j} className={s === j ? (good ? 'right' : 'wrong') : ''}>
            <input type="radio" name={`jump-${lab.number}-${i}`} checked={picked[i] === j} onChange={() => { setPicked(p => ({ ...p, [i]: j })); setSubmitted(null) }} />
            <span><LessonText>{ch.text}</LessonText></span>
          </label>)}</fieldset>
          {s !== undefined && <div role="status" className={good ? 'ml-jump-good' : 'ml-jump-miss'}>
            <LessonText>{good ? `Correct. ${c.choices[s].why ?? ''}` : `${c.choices[s].why ?? 'Not quite.'}`}</LessonText>
            {!good && <p className="ml-actions">{c.review.map(reviewTarget).filter(Boolean).map(link)}</p>}
          </div>}
        </li>
      })}</ol>
      <div className="ml-actions"><button disabled={!all}>{submitted ? 'Check again' : 'Check my answers'}</button>{!all && <span className="ml-caption">Answer all three first.</span>}</div>
    </form>
    {submitted && <div className="ml-experiment" role="status">
      <span className="ml-eyebrow">Suggested route</span>
      {route.length === 0
        ? <p>{rounds === 1 ? 'All three correct on the first check. The prerequisites look in place — start the lab.' : 'All three correct now. Because it took more than one check, consider skimming the linked lessons as you meet their ideas in this lab.'}</p>
        : <><p>Revisit these lessons in this order, then come back. Read the lesson, run its experiment and try its checkpoint — skimming will not fill the gap. You can also start this lab now and return to them when you get stuck.</p><p className="ml-actions">{route.map(link)}</p></>}
    </div>}
  </details>
}
