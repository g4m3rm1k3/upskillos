import React, { useState } from 'react'
import LessonText from './LessonText.jsx'

// A checkpoint records what happened, not a claim of mastery. Each lesson's progress entry keeps
// `attempts`, `sawExplanation` and, once passed, `help`: 'none' (right on the first submission,
// explanation unopened), 'feedback' (right after at least one wrong submission) or 'explanation'.
// "Independently demonstrated" is reserved for a fresh variant of the task, which this does not offer.

// Accepts integers, decimals, scientific notation and simple fractions (a/b). Nothing is evaluated.
const NUM = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`
export function parseAnswer(raw, { percent = false } = {}) {
  const text = String(raw).trim().replace(/[−–]/g, '-').replace(/\s+/g, '')
  if (!text) return { error: 'Enter a number.' }
  if (text.includes(',')) return { error: 'Use a dot for decimals and no thousands separators — for example `1234.5`, not `1,234.5` or `1234,5`.' }
  let body = text, isPercent = false
  if (body.endsWith('%')) { body = body.slice(0, -1); isPercent = true }
  let value
  if (new RegExp(`^${NUM}$`, 'i').test(body)) value = Number(body)
  else {
    const m = body.match(new RegExp(`^(${NUM})/(${NUM})$`, 'i'))
    if (!m) return { error: 'Enter a number such as `0.25`, `1/4`, `-3` or `2e-5`.' }
    if (Number(m[2]) === 0) return { error: 'The denominator of a fraction cannot be 0.' }
    value = Number(m[1]) / Number(m[2])
  }
  if (!Number.isFinite(value)) return { error: 'That number is too large to check.' }
  if (isPercent && !percent) return { error: `This question asks for a plain number, not a percentage. If you meant ${body}%, enter ${Number((value / 100).toPrecision(12))}.` }
  return { value }
}

// Wrong-answer feedback names a likely misconception. A lesson's own list is authored for that
// question; the generic checks below only notice a numeric coincidence, so they are worded as
// possibilities rather than diagnoses.
const close = (a, b, tol) => Math.abs(a - b) <= Math.max(tol, 1e-9 * Math.abs(b))
export function diagnose(value, lesson) {
  const truth = lesson.answer, tol = lesson.tolerance ?? 1e-6
  for (const m of lesson.misconceptions ?? []) if (close(value, m.answer, m.tolerance ?? tol)) return m.feedback
  if (truth === 0) return null
  if (close(value, -truth, tol)) return 'Your answer has the right size but the opposite sign. If that is the slip, recheck which quantity is subtracted from which (for example prediction − target versus target − prediction).'
  if (lesson.percent) {
    if (close(value, truth / 100, tol / 100)) return 'This looks like the fraction rather than the percentage. If so, multiply by 100.'
  } else {
    if (close(value, truth * 100, tol * 100)) return 'This looks like a percentage, but the question asks for a plain number. If so, divide by 100.'
    if (close(value, truth / 100, tol)) return 'This is exactly 100 times too small. Check the units the question asks for.'
  }
  if (close(value, truth * 2, tol) || close(value, truth / 2, tol)) return 'Your answer is off by exactly a factor of 2. That can be a coincidence, but check for a factor you added or dropped: the 2 from differentiating a square, a mean versus a sum over two items, or a pair counted twice.'
  return null
}

const HELP_LABEL = {
  none: 'Answered without help: right on the first submission, before opening the explanation.',
  feedback: 'Answered after feedback on an earlier attempt.',
  explanation: 'Answered after opening the worked explanation.',
}
export function statusText(saved) {
  if (!saved?.passed) return saved?.attempts ? `${saved.attempts} ${saved.attempts === 1 ? 'attempt' : 'attempts'} so far.` : null
  const label = HELP_LABEL[saved.help] ?? 'Passed (recorded before help was tracked).'
  return `${label} Showing you can do it independently needs a fresh version of this task.`
}

function Choices({ lesson, submit }) {
  const [picked, setPicked] = useState(null), [submitted, setSubmitted] = useState(null)
  const good = submitted !== null && submitted === lesson.answer
  const chosen = submitted === null ? null : lesson.choices[submitted]
  return <form onSubmit={e => { e.preventDefault(); if (picked === null) return; setSubmitted(picked); submit(picked === lesson.answer) }}>
    <fieldset className="ml-choices" aria-label="Choose one answer">
      {lesson.choices.map((c, i) => <label key={i} className={submitted === i ? (good ? 'right' : 'wrong') : ''}>
        <input type="radio" name={`choice-${lesson.id}`} checked={picked === i} onChange={() => { setPicked(i); setSubmitted(null) }} />
        <span><LessonText>{c.text}</LessonText></span>
      </label>)}
    </fieldset>
    <div className="ml-actions"><button disabled={picked === null}>Check answer</button></div>
    <p role="status"><LessonText>{submitted === null ? (picked === null ? 'Choose an answer, then check it.' : 'Check your choice when you are ready.') : good ? `Correct. ${chosen.why ?? ''} ${lesson.explanation}` : `Not this one. ${chosen.why ?? 'Reread the situation and try another option.'}`}</LessonText></p>
  </form>
}

export default function Checkpoint({ lesson, saved, onSave }) {
  const [answer, setAnswer] = useState(''), [feedback, setFeedback] = useState('')
  const tolerance = lesson.tolerance ?? 1e-6
  // Every submission is recorded; the help level is fixed by the first correct one.
  const submit = correct => {
    const attempts = (saved.attempts ?? 0) + 1
    const wrongBefore = (saved.wrongAttempts ?? 0)
    const next = { ...saved, attempts, wrongAttempts: wrongBefore + (correct ? 0 : 1) }
    if (correct && !saved.passed) Object.assign(next, { passed: true, help: saved.sawExplanation ? 'explanation' : wrongBefore > 0 ? 'feedback' : 'none', passedAt: new Date().toISOString() })
    onSave(next)
  }
  const check = e => {
    e.preventDefault()
    const parsed = parseAnswer(answer, { percent: lesson.percent })
    if (parsed.error) { setFeedback(parsed.error); return }        // not an attempt
    const correct = Math.abs(parsed.value - lesson.answer) <= tolerance
    submit(correct)
    if (correct) { setFeedback(`Correct. ${lesson.explanation}`); return }
    const why = diagnose(parsed.value, lesson)
    setFeedback(why ? `Not quite. ${why}` : `Not quite.${lesson.hint ? ` Hint: ${lesson.hint}` : ' Write down each intermediate quantity from the lesson, then try again.'}`)
  }
  const status = statusText(saved)
  return <section className="ml-checkpoint">
    <span className="ml-eyebrow">{lesson.choices ? 'Make the call' : 'Check your understanding'}</span><h3><LessonText>{lesson.question}</LessonText></h3>
    {lesson.choices
      ? <Choices key={lesson.id} lesson={lesson} submit={submit} />
      : <><form onSubmit={check}>
          <input aria-label="Checkpoint answer" value={answer} onChange={e => setAnswer(e.target.value)} placeholder={lesson.percent ? 'Your answer, e.g. 80 or 80%' : 'Your answer, e.g. 0.25 or 1/4'} /><button>Check answer</button>
        </form>
        <p role="status"><LessonText>{feedback || 'Try before opening the explanation.'}</LessonText></p></>}
    {status && <p className="ml-caption ml-attempts">{status}</p>}
    <details onToggle={e => { if (e.currentTarget.open && !saved.sawExplanation) onSave({ ...saved, sawExplanation: true }) }}><summary>Worked explanation</summary><p><LessonText>{lesson.explanation}</LessonText></p></details>
    <label className="ml-reflection"><LessonText>{lesson.reflection}</LessonText><textarea value={saved.note || ''} onChange={e => onSave({ ...saved, note: e.target.value })} placeholder="Explain it in your own words. Saved on this device." /></label>
    <small>Answers are checked automatically. Written explanations are for your own review; they are not AI-graded.</small>
  </section>
}
