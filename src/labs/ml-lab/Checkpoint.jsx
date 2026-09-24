import React, { useState } from 'react'
import LessonText from './LessonText.jsx'

// Wrong-answer feedback should name a likely misconception, not only say “Not quite”.
// A lesson can list its own (numeric: `misconceptions: [{ answer, tolerance?, feedback }]`;
// decisions: `choices: [{ text, why }]`, where `why` explains that option). When a numeric
// answer matches none of them, these generic slips are checked before the fallback.
const close = (a, b, tol) => Math.abs(a - b) <= Math.max(tol, 1e-9 * Math.abs(b))
export function diagnose(value, lesson) {
  const truth = lesson.answer, tol = lesson.tolerance ?? 1e-6
  for (const m of lesson.misconceptions ?? []) if (close(value, m.answer, m.tolerance ?? tol)) return m.feedback
  if (truth === 0) return null
  if (close(value, -truth, tol)) return 'Right size, wrong sign. Recheck which quantity is subtracted from which (for example prediction − target versus target − prediction).'
  if (close(value, truth * 100, tol * 100)) return 'That looks like a percentage. The question wants the value as a fraction (divide by 100) — or recheck the units asked for.'
  if (close(value, truth / 100, tol)) return 'That looks like a fraction. The question wants a percentage (multiply by 100) — or recheck the units asked for.'
  if (close(value, truth * 2, tol) || close(value, truth / 2, tol)) return 'You are off by exactly a factor of 2. Look for a factor you added or dropped: the 2 from differentiating a square, a mean versus a sum over two items, or counting a pair twice.'
  return null
}

function Choices({ lesson, onCorrect }) {
  const [picked, setPicked] = useState(null)
  const chosen = picked === null ? null : lesson.choices[picked]
  const good = picked === lesson.answer
  return <>
    <fieldset className="ml-choices" aria-label="Choose one answer">
      {lesson.choices.map((c, i) => <label key={i} className={picked === i ? (good ? 'right' : 'wrong') : ''}>
        <input type="radio" name={`choice-${lesson.id}`} checked={picked === i} onChange={() => { setPicked(i); if (i === lesson.answer) onCorrect() }} />
        <span><LessonText>{c.text}</LessonText></span>
      </label>)}
    </fieldset>
    <p role="status"><LessonText>{picked === null ? 'Decide before opening the explanation.' : good ? `Correct. ${chosen.why ?? ''} ${lesson.explanation}` : `Not this one. ${chosen.why ?? 'Reread the situation and try another option.'}`}</LessonText></p>
  </>
}

export default function Checkpoint({ lesson, saved, onSave }) {
  const [answer, setAnswer] = useState(''), [feedback, setFeedback] = useState('')
  const tolerance = lesson.tolerance ?? 1e-6
  const pass = () => onSave({ ...saved, passed: true })
  const check = e => {
    e.preventDefault()
    const value = Number(answer)
    if (answer.trim() === '' || !Number.isFinite(value)) { setFeedback('Enter a number (for example `0.25`, not `1/4` or `25%`).'); return }
    if (Math.abs(value - lesson.answer) <= tolerance) { setFeedback(`Correct. ${lesson.explanation}`); pass(); return }
    const why = diagnose(value, lesson)
    setFeedback(why ? `Not quite. ${why}` : `Not quite.${lesson.hint ? ` Hint: ${lesson.hint}` : ' Write down each intermediate quantity from the lesson, then try again.'}`)
  }
  return <section className="ml-checkpoint">
    <span className="ml-eyebrow">{lesson.choices ? 'Make the call' : 'Check your understanding'}</span><h3><LessonText>{lesson.question}</LessonText></h3>
    {lesson.choices
      ? <Choices key={lesson.id} lesson={lesson} onCorrect={pass} />
      : <><form onSubmit={check}>
          <input aria-label="Checkpoint answer" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your numeric answer" /><button>Check answer</button>
        </form>
        <p role="status"><LessonText>{feedback || (saved.passed ? 'Checkpoint passed previously. Try it again from memory.' : 'Try before opening the explanation.')}</LessonText></p></>}
    <details><summary>Worked explanation</summary><p><LessonText>{lesson.explanation}</LessonText></p></details>
    <label className="ml-reflection"><LessonText>{lesson.reflection}</LessonText><textarea value={saved.note || ''} onChange={e => onSave({ ...saved, note: e.target.value })} placeholder="Explain it in your own words. Saved on this device." /></label>
    <small>Checkpoints are checked automatically. Written explanations are for your own review; they are not AI-graded.</small>
  </section>
}
