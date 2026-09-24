import React, { useState } from 'react'
import LessonText from './LessonText.jsx'
import { labForLesson } from './labs/index.js'

// “Jumping in here from a course?” Three prerequisite checks per lab. A wrong answer explains
// the likely misconception and links to the exact lesson that teaches the missing idea; the
// summary turns every miss into a recovery route in curriculum order.
export function reviewTarget(id) {
  const lab = labForLesson(id)
  if (!lab) return null
  const index = lab.lessons.findIndex(l => l.id === id)
  return { number: lab.number, index, title: lab.lessons[index].title }
}

export default function JumpIn({ lab, jumpIn, onReview }) {
  const [picked, setPicked] = useState({})
  if (!jumpIn) return null
  const answered = jumpIn.checks.filter((_, i) => picked[i] !== undefined).length
  const missed = jumpIn.checks.filter((c, i) => picked[i] !== undefined && picked[i] !== c.answer)
  const route = [...new Set(missed.flatMap(c => c.review))].map(reviewTarget).filter(Boolean)
    .sort((a, b) => a.number - b.number || a.index - b.index)
  const link = t => <button key={`${t.number}-${t.index}`} className="ml-review-link" onClick={() => onReview(t.number, t.index)}>Lab {String(t.number).padStart(2, '0')} · {t.title} →</button>
  return <details className="ml-jumpin">
    <summary>Jumping in here from a course? Three quick prerequisite checks</summary>
    <p className="ml-caption">If you worked through the earlier labs you can skip this. If you arrived from a university course or a later lecture, spend two minutes here: each check names the exact lesson to revisit when it exposes a gap, and <strong>Back to Lab {String(lab.number).padStart(2, '0')}</strong> brings you straight back.</p>
    <ol className="ml-jumpin-checks">{jumpIn.checks.map((c, i) => {
      const p = picked[i], good = p === c.answer
      return <li key={i}>
        <p><LessonText>{c.question}</LessonText></p>
        <fieldset className="ml-choices" aria-label={`Prerequisite check ${i + 1}`}>{c.choices.map((ch, j) => <label key={j} className={p === j ? (good ? 'right' : 'wrong') : ''}>
          <input type="radio" name={`jump-${lab.number}-${i}`} checked={p === j} onChange={() => setPicked(s => ({ ...s, [i]: j }))} />
          <span><LessonText>{ch.text}</LessonText></span>
        </label>)}</fieldset>
        {p !== undefined && <div role="status" className={good ? 'ml-jump-good' : 'ml-jump-miss'}>
          <LessonText>{good ? `Solid. ${c.choices[p].why ?? ''}` : `${c.choices[p].why ?? 'Not quite.'}`}</LessonText>
          {!good && <p className="ml-actions">{c.review.map(reviewTarget).filter(Boolean).map(link)}</p>}
        </div>}
      </li>
    })}</ol>
    {answered === jumpIn.checks.length && <div className="ml-experiment" role="status">
      <span className="ml-eyebrow">Your route</span>
      {route.length === 0
        ? <p>All three are solid — start this lab now. {jumpIn.ready ? <LessonText>{jumpIn.ready}</LessonText> : null}</p>
        : <><p>Revisit these lessons in this order, then come back. Read the lesson, run its experiment, and pass its checkpoint — skimming will not fill the gap.</p><p className="ml-actions">{route.map(link)}</p></>}
    </div>}
  </details>
}
