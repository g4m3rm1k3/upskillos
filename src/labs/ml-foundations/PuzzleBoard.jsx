import React, { useMemo, useState } from 'react'
import { PIECES, PIECE_ORDER, FINISH, FINISH_TAGS } from './python/pieces.js'
import { PARTS, ALL, TITLES } from './curriculum.js'
import { tokenizePython } from '../a-arcade-python/analysis.js'
import Markdown from '../qmaze-lab/Markdown.jsx'

// The puzzle board: every piece of the lab as a tile, grouped by part, showing which are yours,
// which piece builds on which (from the challenges' `uses`), and which ideas a piece lends to another
// even when no code calls it. Not every piece goes into the final learner: many exist to explain an
// idea that the learner, and the labs that build real models, rely on.

// Ideas that flow from one piece to another without a function call.
export const IDEA_LINKS = [
  ['expected_value', 'option_values', 'the worth of a move is a weighted average of its outcomes'],
  ['sweep_values', 'q_update', 'the target is lesson 5\'s Bellman equation, with one tried outcome in place of the average'],
  ['discounted_total', 'q_update', 'the g in the target is lesson 6\'s discount'],
  ['evaluate_plan', 'train', 'Q-learning evaluates and improves its plan at the same time, one move at a time'],
  ['greedy_plan', 'choose', 'choose\'s "repeat what looks best" is greedy_plan, for one square'],
  ['expected_value', 'estimate', 'an estimate is a weighted average learned from tries instead of from chances'],
  ['update_mean', 'q_update', 'the correction in q_update is update_mean, with the target as the sample'],
  ['q_update', 'nudge', 'with one-hot features, nudge is exactly q_update\'s correction'],
  ['descend', 'nudge', 'the nudge is a gradient step on the squared error'],
  ['gradients', 'train_formula', 'deep Q-learning puts lesson 14\'s network where predict is'],
  ['play_episode', 'train', 'train is play_episode, with a learner choosing and a guess updated after every move'],
]

const lessonOf = Object.fromEntries(ALL.map(l => [l.id, l]))
const signature = name => PIECES[name].code.split('\n')[0].replace(/:$/, '')

// Which pieces each piece's challenge builds on, and the reverse.
export function pieceGraph(lessons) {
  const uses = Object.fromEntries(PIECE_ORDER.map(p => [p, []]))
  for (const l of Object.values(lessons)) {
    for (const c of l.challenges) {
      if (!c.piece) continue
      // Only the pieces the solution really mentions, not everything in its toolbox.
      const direct = c.uses.filter(u => u !== c.piece && new RegExp(`\\b${u}\\b`).test(c.solution))
      uses[c.piece] = [...new Set([...uses[c.piece], ...direct])]
    }
  }
  const usedBy = Object.fromEntries(PIECE_ORDER.map(p => [p, []]))
  for (const [p, us] of Object.entries(uses)) for (const u of us) usedBy[u].push(p)
  return { uses, usedBy }
}

export default function PuzzleBoard({ lessons, mine, here, doneLessons = [], onOpen, compact = false }) {
  const { uses, usedBy } = useMemo(() => pieceGraph(lessons), [lessons])
  const herePieces = PIECE_ORDER.filter(p => PIECES[p].lesson === here)
  const [picked, setPicked] = useState(herePieces[0] ?? null)
  const mineCount = PIECE_ORDER.filter(p => mine[p]).length
  const state = p => (mine[p] ? 'mine' : PIECES[p].lesson === here ? 'here' : 'lab')
  const ideasFrom = p => IDEA_LINKS.filter(([a]) => a === p)
  const ideasTo = p => IDEA_LINKS.filter(([, b]) => b === p)
  const link = p => <button key={p} type="button" className={`mlf-tile-link ${state(p)}`} onClick={() => setPicked(p)}><code>{p}</code></button>
  return (
    <section className="mlf-board" aria-label="The puzzle board">
      <header className="mlf-board-head">
        <p className="mlf-eyebrow">The puzzle board</p>
        <p className="mlf-muted"><strong>{mineCount}</strong> of {PIECE_ORDER.length} pieces written by you. Green: yours · amber: this lesson · grey: the lab's version until you write it. Click a piece to see how it fits.</p>
      </header>
      <div className="mlf-board-parts">
        {PARTS.filter(part => part.lessons.some(l => PIECE_ORDER.some(p => PIECES[p].lesson === l.id))).map(part => (
          <div key={part.id} className="mlf-board-part">
            <p className="mlf-board-part-title">{part.title}</p>
            {part.lessons.filter(l => PIECE_ORDER.some(p => PIECES[p].lesson === l.id)).map(l => (
              <div key={l.id} className={`mlf-board-lesson${l.id === here ? ' here' : ''}`}>
                <button type="button" className="mlf-board-lesson-name" onClick={() => onOpen?.(l.id)} title={`Open ${TITLES[l.id]}`}>{typeof l.number === 'number' ? l.number : l.number} · {l.title}</button>
                <div className="mlf-tiles">
                  {PIECE_ORDER.filter(p => PIECES[p].lesson === l.id).map(p => (
                    <button key={p} type="button" className={`mlf-tile ${state(p)}${picked === p ? ' picked' : ''}`} aria-pressed={picked === p} onClick={() => setPicked(p)}>
                      <code>{p}</code>{mine[p] && <span aria-label="yours"> ✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {picked && (
        <div className="mlf-board-detail" aria-live="polite">
          <p><code className="mlf-sig">{signature(picked)}</code> <span className="mlf-muted">· lesson {lessonOf[PIECES[picked].lesson]?.number}: {lessonOf[PIECES[picked].lesson]?.title} · {mine[picked] ? '✓ your version' : 'the lab\'s version for now'}</span></p>
          <div className="mlf-board-links">
            <div><span className="mlf-eyebrow">built on</span> {uses[picked].length ? uses[picked].map(link) : <span className="mlf-muted">nothing: it stands on its own</span>}</div>
            <div><span className="mlf-eyebrow">used by</span> {usedBy[picked].length ? usedBy[picked].map(link) : <span className="mlf-muted">no later code calls it</span>}</div>
          </div>
          {(ideasFrom(picked).length > 0 || ideasTo(picked).length > 0) && (
            <ul className="mlf-board-ideas">
              {ideasFrom(picked).map(([, b, why]) => <li key={`f${b}`}>💡 lends an idea to {link(b)}: <Markdown inline>{why}</Markdown></li>)}
              {ideasTo(picked).map(([a, , why]) => <li key={`t${a}`}>💡 takes an idea from {link(a)}: <Markdown inline>{why}</Markdown></li>)}
            </ul>
          )}
          {!usedBy[picked].length && !ideasFrom(picked).length && <p className="mlf-muted">This piece is here to explain an idea. Nothing later calls it, but the understanding it builds is used everywhere.</p>}
        </div>
      )}
      {!compact && <LearnerProgram doneLessons={doneLessons} here={here} onOpen={onOpen} />}
    </section>
  )
}

// Lesson 0's program, with each tagged line lit once its lesson is done (amber for this lesson).
export function LearnerProgram({ doneLessons, here, onOpen }) {
  const lines = FINISH.split('\n')
  return (
    <figure className="mlf-board-program">
      <figcaption><span className="mlf-eyebrow">Where the ideas meet: the learner from lesson 0</span> <span className="mlf-muted">A line lights up when you have done the lesson that explains it.</span></figcaption>
      {lines.map((line, k) => {
        const tag = FINISH_TAGS.find(([has]) => line.includes(has))
        const cls = tag ? (tag[1] === here ? ' here' : doneLessons.includes(tag[1]) ? ' lit' : ' dark') : ''
        return (
          <div key={k} className={`mlf-board-line${cls}`}>
            <pre><code>{tokenizePython(line).map((t, i) => <span key={i} className={`tk-${t.kind}`}>{t.text}</span>)}{line === '' ? ' ' : ''}</code></pre>
            {tag && <button type="button" className="mlf-tag" onClick={() => onOpen?.(tag[1])}>{TITLES[tag[1]] ?? tag[1]}</button>}
          </div>
        )
      })}
    </figure>
  )
}

export { Markdown }
