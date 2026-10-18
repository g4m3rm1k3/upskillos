import React from 'react'
import Blocks, { checkIds } from './Blocks.jsx'
import WriteIt from './WriteIt.jsx'
import TrySequence from './TrySequence.jsx'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { TaggedProgram } from './lessons/finish.jsx'
import { TITLES } from './curriculum.js'
import { PIECE_ORDER } from './python/pieces.js'

export const STAGES = [
  ['try', 'Try it', 'Attempt it before any explanation'],
  ['watch', 'Watch it run', 'Step through the real code, on your own input'],
  ['understand', 'Understand', 'Why each line works, the maths named, and checks'],
  ['write', 'Write it', 'Write the pieces yourself: Run, print, check'],
  ['keep', 'Keep', 'The piece card, what to remember, the ML names'],
]

export function stagesOf(content) {
  return STAGES.filter(([id]) => id !== 'write' || content.challenges.length)
}

// How far a lesson's stages are done, as [done, total].
export function stageProgress(content, record) {
  const stages = stagesOf(content)
  return [stages.filter(([id]) => stageDone(id, content, record)).length, stages.length]
}

export function stageDone(id, content, record) {
  if (id === 'understand') return record.stages.understand === true || (checkIds(content.understand).length > 0 && checkIds(content.understand).every(c => record.checks.includes(c)))
  if (id === 'write') return content.challenges.every(c => record.code[c.id]?.passed)
  return record.stages[id] === true
}

export default function LessonView({ meta, content, record, update, stage, setStage, mine, onOpen, next }) {
  const stages = stagesOf(content)
  const current = stages.some(([id]) => id === stage) ? stage : 'try'
  const markStage = id => update(r => ({ ...r, stages: { ...r.stages, [id]: true } }))
  const solve = id => update(r => (r.checks.includes(id) ? r : { ...r, checks: [...r.checks, id] }))
  const locked = current !== 'try' && current !== 'keep' && !record.stages.try
  const { Try } = content

  return (
    <article className="mlf-lesson" aria-labelledby="mlf-lesson-title">
      <header className="mlf-lesson-head">
        <p className="mlf-eyebrow">{meta.partTitle} · {typeof meta.number === 'number' ? `Lesson ${meta.number}` : meta.number}</p>
        <h2 id="mlf-lesson-title">{meta.title}</h2>
        <div className="mlf-story"><span className="mlf-eyebrow">The story so far</span> {content.story}</div>
      </header>

      <nav className="mlf-stages" aria-label="Lesson stages">
        {stages.map(([id, label, hint], i) => {
          const done = stageDone(id, content, record)
          return (
            <button key={id} type="button" className={`mlf-stage${id === current ? ' on' : ''}${done ? ' done' : ''}`} aria-current={id === current ? 'step' : undefined} onClick={() => setStage(id)} title={hint}>
              <span className="mlf-stage-n">{done ? '✓' : i + 1}</span> {label}
            </button>
          )
        })}
      </nav>

      {locked && (
        <div className="mlf-locked" role="note">
          <p><strong>Try it first.</strong> A question you have had a go at sticks far better than one you were told the answer to. It takes a few minutes.</p>
          <button type="button" className="mlf-primary" onClick={() => setStage('try')}>Go to Try it</button>
          <button type="button" className="mlf-quiet" onClick={() => markStage('try')}>Skip: I've done this before</button>
        </div>
      )}

      {current === 'try' && (
        <section className="mlf-stage-body">
          {Try ? <Try onDone={() => markStage('try')} /> : <TrySequence spec={content.tryIt} onDone={() => markStage('try')} />}
          {record.stages.try && <div className="mlf-next-stage"><p className="mlf-feedback good">✓ Done. Now watch the code do what you just did.</p><button type="button" className="mlf-primary" onClick={() => setStage('watch')}>Watch it run →</button></div>}
        </section>
      )}

      {current === 'watch' && !locked && (
        <section className="mlf-stage-body">
          {content.watch.map((W, i) => <W key={i} solved={record.checks} onSolved={solve} />)}
          <div className="mlf-next-stage">
            {!record.stages.watch && <button type="button" className="mlf-secondary" onClick={() => markStage('watch')}>✓ I've stepped through it</button>}
            <button type="button" className="mlf-primary" onClick={() => { markStage('watch'); setStage('understand') }}>Understand →</button>
          </div>
        </section>
      )}

      {current === 'understand' && !locked && (
        <section className="mlf-stage-body">
          <Blocks blocks={content.understand} solved={record.checks} onSolved={solve}
            custom={kind => kind === 'tagged-program' && <TaggedProgram onOpen={onOpen} titles={TITLES} pieces={['parse_map', 'build_table', 'sample_outcome']} />} />
          <div className="mlf-next-stage">
            {checkIds(content.understand).length > 0 && <p className="mlf-muted">{checkIds(content.understand).filter(c => record.checks.includes(c)).length} of {checkIds(content.understand).length} checks done.</p>}
            {!checkIds(content.understand).length && !record.stages.understand && <button type="button" className="mlf-secondary" onClick={() => markStage('understand')}>✓ Got it</button>}
            <button type="button" className="mlf-primary" onClick={() => setStage(content.challenges.length ? 'write' : 'keep')}>{content.challenges.length ? 'Write it →' : 'Keep →'}</button>
          </div>
        </section>
      )}

      {current === 'write' && !locked && (
        <section className="mlf-stage-body">
          <p className="mlf-lead">{content.challenges.length} challenges. Use ▶ Run as much as you like: print anything, look at any value. When it works, ✓ Run & check grades it on cases you can't see, including random maps.</p>
          {content.challenges.map(ch => (
            <WriteIt key={ch.id} challenge={ch} entry={record.code[ch.id]} mine={mine}
              onSave={entry => update(r => ({ ...r, code: { ...r.code, [ch.id]: entry } }))} />
          ))}
          <div className="mlf-next-stage"><button type="button" className="mlf-primary" onClick={() => setStage('keep')}>Keep →</button></div>
        </section>
      )}

      {current === 'keep' && (
        <section className="mlf-stage-body mlf-keep">
          <div className="mlf-card">
            <p className="mlf-eyebrow">Piece card{content.keep.pieces.length > 1 ? 's' : ''}</p>
            <Markdown>{content.keep.card}</Markdown>
            {content.keep.pieces.length > 0 && <p className="mlf-muted">In your toolbox: {content.keep.pieces.map(p => <span key={p} className={`mlf-tool${mine[p] ? ' mine' : ''}`}><code>{p}</code> {mine[p] ? '✓ yours' : '· lab version until you pass it'}</span>)}</p>}
          </div>
          <h3>Remember</h3>
          <ul className="mlf-remember">{content.keep.remember.map((r, i) => <li key={i}><Markdown inline>{r}</Markdown></li>)}</ul>
          <h3>The names in machine learning</h3>
          <table className="mlf-table"><thead><tr><th>Here</th><th>In ML</th><th>Why</th></tr></thead>
            <tbody>{content.keep.ml.map(([here, ml, why], i) => <tr key={i}><td><Markdown inline>{here}</Markdown></td><td><strong><Markdown inline>{ml}</Markdown></strong></td><td><Markdown inline>{why}</Markdown></td></tr>)}</tbody></table>
          <div className="mlf-next-stage">
            <p><Markdown inline>{content.keep.next}</Markdown></p>
            {!record.stages.keep && <button type="button" className="mlf-secondary" onClick={() => markStage('keep')}>✓ Finish this lesson</button>}
            {next && <button type="button" className="mlf-primary" onClick={() => { markStage('keep'); onOpen(next.id) }}>{next.built ? `Next: ${next.title} →` : `Next up: ${next.title} (being built)`}</button>}
          </div>
        </section>
      )}
    </article>
  )
}

export { PIECE_ORDER }
