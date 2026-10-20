// "Check yourself": after a lesson, several short checks, one at a time. Each opens with what you need
// to know, then asks a choice (every option says why) or a number on a new input (wrong answers that a
// real mistake gives are named). Content: lessons/checks.js. Finishing is saved as `checks` in the
// lesson's synced record, with how many were right the first time; the checks then join spaced review
// (review.js), first due a day later.
import React, { useState } from 'react'
import { Decision, NumberCheck } from './DesignIt.jsx'
import { displayOrder } from './lessons/designs.js'
import { readProgress, saveProgress } from './progress.js'
import { enterReview } from './review.js'
import './hunt.css'

export default function Checks({ id, checks, revision, onProgress }) {
  const saved = readProgress(id, revision).checks
  const [at, setAt] = useState(saved?.done ? checks.length : 0)
  const [ready, setReady] = useState(false)
  const [firstTry, setFirstTry] = useState(saved?.done ? saved.firstTry : 0)
  const [round, setRound] = useState(0)
  const finished = at >= checks.length
  const check = checks[at]

  const solved = misses => { if (misses === 0) setFirstTry(n => n + 1); setReady(true) }
  function advance() {
    setReady(false)
    setAt(at + 1)
    if (at + 1 < checks.length) return
    const record = readProgress(id, revision)
    record.checks = { done: true, firstTry, total: checks.length }
    record.review = enterReview(record.review, checks.length)
    saveProgress(id, record)
    onProgress?.(id, record)
  }

  return (
    <section className="dp-di" aria-label="Check yourself">
      <div className="dp-section-heading">
        <div>
          <p className="dp-eyebrow">CHECK YOURSELF · {finished ? 'DONE' : `${at + 1} OF ${checks.length}`}</p>
          <h3>Use what the lesson taught</h3>
        </div>
        {saved?.done && <span className="dp-passed-tag">✓ Checked</span>}
      </div>

      {!finished && (
        <div key={`${round}:${at}`}>
          <aside className="dp-hunt-know dp-checks-know">
            <strong>What you need to know</strong>
            <p>{check.know}</p>
          </aside>
          {check.options
            ? <Decision step={check} order={displayOrder(id, at, check.options)} onRight={solved} />
            : <NumberCheck spec={{ ...check, prompt: check.ask }} label="Your answer" onSolved={solved} onShown={() => setReady(true)} />}
        </div>
      )}

      {ready && (
        <div className="dp-di-next">
          <button type="button" className="dp-primary" onClick={advance}>
            {at + 1 < checks.length ? 'Next check →' : 'Finish →'}
          </button>
        </div>
      )}

      {finished && (
        <div className="dp-tt-feedback is-good" role="status">
          <strong>✓ All {checks.length} checks done. </strong>
          {firstTry} of {checks.length} right the first time.
          <div className="dp-di-next">
            <button type="button" className="dp-di-quiet" onClick={() => { setAt(0); setFirstTry(0); setReady(false); setRound(r => r + 1) }}>Do them again</button>
          </div>
        </div>
      )}
    </section>
  )
}
