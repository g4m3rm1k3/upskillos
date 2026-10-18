import React, { useMemo, useState } from 'react'
import './style.css'
import { PARTS, ALL, BUILT } from './curriculum.js'
import { LESSONS, PIECE_OF } from './lessons/index.js'
import LessonView, { stageProgress } from './LessonView.jsx'
import { readAll, writeLesson, clean, myPieces, lessonDone, readPlace, writePlace } from './progress.js'
import { PIECE_ORDER, PIECES } from './python/pieces.js'
import PuzzleBoard from './PuzzleBoard.jsx'
import { useAuth } from '../../context/AuthContext.jsx'

export default function MlFoundationsLab() {
  const [all, setAll] = useState(() => readAll())
  const [place, setPlace] = useState(() => {
    const [id, stage] = (readPlace() ?? '').split(':')
    return LESSONS[id] || id === 'board' ? { id, stage: stage || 'try' } : { id: 'finish', stage: 'try' }
  })
  const { user, pushNow } = useAuth() ?? {}
  const record = id => clean(all[id])
  const mine = useMemo(() => myPieces(all, PIECE_OF), [all])

  function update(id, change) {
    const before = clean(all[id])
    const after = clean(change(before))
    writeLesson(id, after)
    setAll(a => ({ ...a, [id]: after }))
    const newlyPassed = Object.entries(after.code).some(([c, e]) => e.passed && !before.code[c]?.passed)
    const newStage = Object.keys(after.stages).some(s => !before.stages[s])
    if (newlyPassed || newStage) pushNow?.()
  }

  function open(id, stage = 'try') {
    const next = { id, stage: LESSONS[id] && record(id).stages.try && stage === 'try' ? 'watch' : stage }
    setPlace(next)
    writePlace(`${next.id}:${next.stage}`)
    document.querySelector('.mlf-main')?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }
  const setStage = stage => { setPlace(p => ({ ...p, stage })); writePlace(`${place.id}:${stage}`); document.querySelector('.mlf-main')?.scrollTo?.({ top: 0 }) }

  const meta = ALL.find(l => l.id === place.id)
  const content = LESSONS[place.id]
  const next = ALL[ALL.findIndex(l => l.id === place.id) + 1]
  const doneCount = BUILT.filter(l => lessonDone(LESSONS[l.id], record(l.id))).length
  const piecesMine = PIECE_ORDER.filter(p => mine[p]).length
  const doneLessons = BUILT.filter(l => lessonDone(LESSONS[l.id], record(l.id))).map(l => l.id)
  const board = here => <PuzzleBoard lessons={LESSONS} mine={mine} here={here} doneLessons={doneLessons} onOpen={id => open(id)} />

  return (
    <div className="mlf-lab">
      <header className="mlf-header">
        <div className="mlf-mark" aria-hidden="true">🐭</div>
        <div>
          <p className="mlf-eyebrow">Machine learning · from first principles</p>
          <h1>ML Foundations</h1>
        </div>
        <div className="mlf-progress" role="group" aria-label="Your progress">
          <span><strong>{doneCount}</strong> of {BUILT.length} lessons done · <strong>{piecesMine}</strong> of {PIECE_ORDER.length} pieces written by you</span>
          <span className="mlf-progress-bar" aria-hidden="true"><span style={{ width: `${(doneCount / BUILT.length) * 100}%` }} /></span>
          <small>{user ? '☁ Saved to your account' : 'Saved on this device · sign in to keep it everywhere'}</small>
        </div>
      </header>
      <div className="mlf-body">
        <aside className="mlf-sidebar" aria-label="Lessons">
          {PARTS.map(part => {
            const built = part.lessons.filter(l => l.built)
            const done = built.filter(l => lessonDone(LESSONS[l.id], record(l.id))).length
            return (
              <section key={part.id} className="mlf-part">
                <h2>{part.title}{built.length > 0 && <span className="mlf-count">{done ? `✓ ${done}/${built.length}` : built.length}</span>}</h2>
                <p className="mlf-muted">{part.blurb}</p>
                <ol>
                  {part.lessons.map(l => {
                    const c = LESSONS[l.id]
                    const r = record(l.id)
                    const finished = c && lessonDone(c, r)
                    const [sd, st] = c ? stageProgress(c, r) : [0, 0]
                    return (
                      <li key={l.id}>
                        <button type="button" className={`mlf-nav${place.id === l.id ? ' on' : ''}${l.built ? '' : ' planned'}`} onClick={() => open(l.id)} aria-current={place.id === l.id ? 'page' : undefined}>
                          <span className="mlf-nav-n">{finished ? '✓' : l.number}</span>
                          <span className="mlf-nav-title">{l.title}{!l.built && <small> · planned</small>}</span>
                          {c && !finished && sd > 0 && <span className="mlf-dots" aria-label={`${sd} of ${st} stages done`}>{Array.from({ length: st }, (_, i) => <i key={i} className={i < sd ? 'on' : ''} />)}</span>}
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </section>
            )
          })}
          <section className="mlf-part">
            <h2>Your toolbox</h2>
            <p className="mlf-muted">Each piece you pass becomes the version later lessons run on.</p>
            <button type="button" className={`mlf-nav${place.id === 'board' ? ' on' : ''}`} onClick={() => open('board')} aria-current={place.id === 'board' ? 'page' : undefined}><span className="mlf-nav-n">🧩</span><span className="mlf-nav-title">The puzzle board: how every piece fits</span></button>
            <ul className="mlf-toolbox-list">
              {PIECE_ORDER.map(p => <li key={p} className={mine[p] ? 'mine' : ''}><code>{p}</code> <span>{mine[p] ? '✓ yours' : `lesson ${ALL.find(l => l.id === PIECES[p].lesson)?.number}`}</span></li>)}
            </ul>
          </section>
        </aside>
        <main className="mlf-main">
          {place.id === 'board'
            ? <article className="mlf-lesson"><header className="mlf-lesson-head"><p className="mlf-eyebrow">All parts</p><h2>The puzzle board</h2><div className="mlf-story"><span className="mlf-eyebrow">How to read it</span> Every piece of the lab, by lesson. Some pieces go into the learner; many are there to explain an idea that the learner, and the labs that build real models, depend on. Click a piece to see what it builds on, what builds on it, and which ideas it lends.</div></header>{board(null)}</article>
            : content
              ? <LessonView key={place.id} meta={meta} content={content} record={record(place.id)} update={change => update(place.id, change)} stage={place.stage} setStage={setStage} mine={mine} onOpen={id => open(id)} next={next} board={board(place.id)} />
              : <Planned meta={meta} onOpen={open} />}
        </main>
      </div>
    </div>
  )
}

function Planned({ meta, onOpen }) {
  return (
    <article className="mlf-lesson">
      <header className="mlf-lesson-head">
        <p className="mlf-eyebrow">{meta.partTitle} · {typeof meta.number === 'number' ? `Lesson ${meta.number}` : meta.number}</p>
        <h2>{meta.title}</h2>
      </header>
      <div className="mlf-card">
        <p className="mlf-eyebrow">Being built</p>
        <p>{meta.summary}</p>
        <p className="mlf-muted">Every lesson follows the same five stages: try it, watch it run, understand, write it, keep. Until this one is ready, Lesson 0 lets you play with the finished idea.</p>
        <button type="button" className="mlf-primary" onClick={() => onOpen('finish', 'watch')}>Play with the finished learner</button>
      </div>
    </article>
  )
}
