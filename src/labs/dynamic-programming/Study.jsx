// Spaced review and the mastery map, ported from the Linear Algebra lab (Study.jsx there). Review asks
// the "Check yourself" questions of finished lessons again at growing intervals (review.js); the map
// shows each lesson's five marks. Both read and write the synced progress record (progress.js).
import React, { useState } from 'react'
import { Decision, NumberCheck } from './DesignIt.jsx'
import { displayOrder } from './lessons/designs.js'
import { LESSONS } from './lessons/index.js'
import { CHECKS } from './lessons/checks.js'
import { CONCEPTS, LEVELS } from './curriculum.js'
import { readProgress, saveProgress } from './progress.js'
import { dueItems, marks, MARKS, schedule } from './review.js'
import './hunt.css'
import './trace.css'

const titleOf = id => CONCEPTS.find(c => c.id === id)?.title ?? id

export function Review({ progress, onProgress, onOpen, onFinish }) {
  // The session is fixed when it opens, so answering does not reshuffle the queue under the learner.
  const [queue] = useState(() => dueItems(progress).slice(0, 12))
  const [at, setAt] = useState(0)
  const [right, setRight] = useState(0)
  const [answered, setAnswered] = useState(false)
  const current = queue[at]

  function answer(misses) {
    if (answered) return
    const { id, k } = current
    const record = readProgress(id, LESSONS[id].revision)
    record.review = { ...record.review, [k]: schedule(record.review?.[k], misses === 0) }
    saveProgress(id, record)
    onProgress?.(id, record)
    if (misses === 0) setRight(r => r + 1)
    setAnswered(true)
  }
  function next() {
    setAnswered(false)
    setAt(at + 1)
    if (at + 1 >= queue.length) onFinish?.()
  }

  return (
    <section className="dp-di dp-review" aria-label="Spaced review">
      <div className="dp-section-heading">
        <div>
          <p className="dp-eyebrow">SPACED REVIEW{current ? ` · ${at + 1} OF ${queue.length}` : ''}</p>
          <h3>Review</h3>
        </div>
        {current && <button type="button" className="dp-di-quiet" onClick={() => onOpen(current.id)}>From: {titleOf(current.id)}</button>}
      </div>

      {!queue.length && (
        <p className="dp-muted">Nothing is due. A lesson’s checks join review when you finish its “Check yourself” stage, and come back after 1, 3, 7, 21 and 60 days as you keep answering them right the first time.</p>
      )}

      {current && (
        <div key={`${current.id}#${current.k}`}>
          <aside className="dp-hunt-know dp-checks-know">
            <strong>What you need to know</strong>
            <p>{current.check.know}</p>
          </aside>
          {current.check.options
            ? <Decision step={current.check} order={displayOrder(current.id, current.k, current.check.options)} onRight={answer} />
            : <NumberCheck spec={{ ...current.check, prompt: current.check.ask }} label="Your answer" onSolved={answer} onShown={() => answer(1)} />}
          {answered && (
            <div className="dp-di-next">
              <button type="button" className="dp-primary" onClick={next}>{at + 1 < queue.length ? 'Next question →' : 'Finish review'}</button>
            </div>
          )}
        </div>
      )}

      {queue.length > 0 && !current && (
        <div className="dp-tt-feedback is-good" role="status">
          <strong>Review finished. </strong>
          {right} of {queue.length} right the first time. Missed questions come back in ten minutes; the rest are scheduled further out.
        </div>
      )}
    </section>
  )
}

// The levels and families that have lessons with checks, in curriculum order.
const MAP_GROUPS = LEVELS.flatMap(level => level.groups.map(group => ({ level, group, ids: group.concepts.map(c => c.id).filter(id => CHECKS[id]) }))).filter(g => g.ids.length)

export function MasteryMap({ progress, onOpen }) {
  const ids = MAP_GROUPS.flatMap(g => g.ids)
  const all = ids.map(id => marks(id, progress[id]))
  const count = key => all.filter(m => m[key]).length
  const possible = key => all.filter(m => m[key] !== null).length
  return (
    <section className="dp-map" aria-label="Mastery map">
      <p className="dp-eyebrow">YOUR PROGRESS</p>
      <h3>Mastery map</h3>
      <p className="dp-muted">Each lesson has up to five marks. The last, retained, is earned only by answering its checks right in review on later days: every check must reach the third review box, about a week out.</p>
      <div className="dp-map-totals">
        {MARKS.map(([key, name], i) => <div key={key} className={`dp-mark-${i}`}><strong>{count(key)}<small>/{possible(key)}</small></strong><span>{name}</span></div>)}
      </div>
      {MAP_GROUPS.map(({ level, group, ids: groupIds }) => (
        <div key={group.id} className="dp-map-group" style={{ '--level-color': level.color }}>
          <h4>{level.title} · {group.title}</h4>
          <div className="dp-map-grid">
            {groupIds.map(id => {
              const m = marks(id, progress[id])
              const title = titleOf(id)
              return (
                <button key={id} type="button" className="dp-map-tile" onClick={() => onOpen(id)}
                  aria-label={`${title}: ${MARKS.filter(([k]) => m[k] !== null).map(([k, name]) => `${name} ${m[k] ? 'yes' : 'not yet'}`).join(', ')}`}>
                  <span className="dp-map-title">{title}</span>
                  <span className="dp-pips" aria-hidden="true">{MARKS.map(([key], i) => <i key={key} className={`dp-mark-${i}${m[key] ? ' on' : ''}${m[key] === null ? ' na' : ''}`} />)}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div className="dp-map-key">{MARKS.map(([key, name], i) => <span key={key}><i className={`dp-mark-${i} on`} />{name}</span>)}</div>
    </section>
  )
}
