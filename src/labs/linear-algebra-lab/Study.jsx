// Notation, quick checks, proofs, the progress map and spaced review.
import { useMemo, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import MarkdownProse from '../../components/math/MarkdownProse.jsx'
import { starsAsTimes } from './stars.js'
import { dueItems, itemKey, stages } from './review.js'

export function Md({ children, className = 'la-prose' }) { return <div className={className}><MarkdownProse text={starsAsTimes(children)} /></div> }

export function Tex({ children, display = false }) {
  const html = useMemo(() => { try { return katex.renderToString(children, { displayMode: display, throwOnError: false, strict: false }) } catch { return null } }, [children, display])
  return html ? <span className={display ? 'la-tex la-tex-display' : 'la-tex'} dangerouslySetInnerHTML={{ __html: html }} /> : <code>{children}</code>
}

export function Notation({ items }) {
  if (!items?.length) return null
  return <section className="la-card la-notation"><div className="la-eyebrow">In symbols</div>
    <dl>{items.map((item, i) => <div key={i}><dt><Tex display>{item.tex}</Tex></dt><dd><Md>{item.say}</Md></dd></div>)}</dl>
  </section>
}

// A stable shuffle, so options do not always appear in authored order but never jump between renders.
function order(n, seed) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]] }
  return idx
}

function Choice({ item, seed, onAnswer, label }) {
  const [picked, setPicked] = useState(null)
  const shown = useMemo(() => order(item.options.length, seed), [item, seed])
  const settled = picked !== null
  return <div className="la-choice">
    <Md>{item.q}</Md>
    <div className="la-options" role="group" aria-label={label}>{shown.map(i => {
      const state = !settled ? '' : i === item.answer ? 'la-right' : i === picked ? 'la-wrong' : 'la-dim'
      return <button key={i} type="button" className={`la-option ${state}`} disabled={settled} onClick={() => { setPicked(i); onAnswer?.(i === item.answer) }}><Md>{item.options[i]}</Md></button>
    })}</div>
    {settled && <div className={`la-verdict ${picked === item.answer ? 'la-ok' : 'la-no'}`} role="status"><strong>{picked === item.answer ? 'Correct.' : 'Not quite.'}</strong> <Md>{item.why}</Md></div>}
  </div>
}

export function QuickCheck({ lesson, onAnswer }) {
  if (!lesson.quiz?.length) return null
  return <section className="la-card la-quick"><div className="la-eyebrow">Quick check</div><h2>Can you recall it?</h2>
    <p className="la-muted">Answer from memory. These questions come back in review at growing intervals.</p>
    {lesson.quiz.map((item, i) => <Choice key={i} item={item} seed={itemKey(lesson, i)} label={`Quick check question ${i + 1}`} onAnswer={correct => onAnswer(itemKey(lesson, i), correct)} />)}
  </section>
}

// A proof is a sequence of reasoning steps. Each step offers candidate next moves; a wrong pick explains
// itself and stays on the step, so the learner builds the argument rather than reading it.
// The same stepper runs a proof (Reason & prove tab) or a derivation (Derive it, in the Learn tab).
const WORDING = {
  proof: { eyebrow: 'Reason it out', title: 'Why is this true?', claim: 'Claim', done: '∎ Proof complete', again: 'Rebuild the proof', group: 'Proof step' },
  derive: { eyebrow: 'Derive it', title: 'Find the result yourself', claim: 'Goal', done: '∎ Derived', again: 'Derive it again', group: 'Derivation step' },
}
export function Proof({ lesson, proved, onComplete = () => {}, part = 'proof' }) {
  const proof = lesson[part], words = WORDING[part]
  const [step, setStep] = useState(proved ? proof.steps.length : 0)
  const [miss, setMiss] = useState({})
  const [mistakes, setMistakes] = useState(proved?.mistakes ?? 0)
  const current = proof.steps[step]
  const shown = useMemo(() => current ? order(current.options.length, part === 'proof' ? `${lesson.id}:${step}` : `${lesson.id}:${part}:${step}`) : [], [current, lesson.id, part, step])
  const choose = i => {
    if (i === current.answer) {
      setMiss({})
      const next = step + 1
      setStep(next)
      if (next === proof.steps.length) onComplete({ mistakes, at: new Date().toISOString() })
    } else { setMiss(previous => ({ ...previous, [i]: true })); setMistakes(m => m + 1) }
  }
  return <section className={`la-card la-proof la-${part}`}>
    <div className="la-eyebrow">{words.eyebrow}</div><h2>{words.title}</h2>
    <div className="la-claim"><span>{words.claim}</span><Md>{proof.claim}</Md></div>
    {proof.given && <div className="la-given-proof"><span>Given</span><Md>{proof.given}</Md></div>}
    <ol className="la-steps">
      {proof.steps.slice(0, step).map((s, i) => <li key={i} className="la-step-done"><Md>{s.options[s.answer]}</Md><Md className="la-prose la-step-why">{s.why}</Md></li>)}
      {current && <li className="la-step-now">
        <Md>{current.ask}</Md>
        <div className="la-options" role="group" aria-label={`${words.group} ${step + 1}`}>{shown.map(i => <button key={i} type="button" className={`la-option ${miss[i] ? 'la-wrong' : ''}`} disabled={miss[i]} onClick={() => choose(i)}><Md>{current.options[i]}</Md></button>)}</div>
        {Object.keys(miss).length > 0 && <p className="la-verdict la-no" role="status"><strong>Not that one.</strong> {current.hint || 'Ask which move uses only what is already established.'}</p>}
      </li>}
    </ol>
    {!current && <div className="la-qed" role="status"><Md>{proof.conclusion}</Md><span>{words.done}{mistakes === 0 ? ' · no wrong turns' : ` · ${mistakes} wrong turn${mistakes === 1 ? '' : 's'} on the way`}</span></div>}
    <p className="la-muted">{proof.steps.length} steps. Pick the move that follows from what is already on the page.</p>
    {!current && <button type="button" className="la-ghost" onClick={() => { setStep(0); setMiss({}); setMistakes(0) }}>{words.again}</button>}
  </section>
}

const STAGE_NAMES = [['explored', 'Ran the example'], ['practiced', 'Passed the challenge'], ['proved', 'Built the proof'], ['retained', 'Retained in review']]

export function ProgressMap({ lessons, modules, store, onOpen, hue }) {
  const all = lessons.map(lesson => stages(lesson, store))
  const count = key => all.filter(s => s[key]).length, possible = key => all.filter(s => s[key] !== null).length
  return <section className="la-map">
    <div className="la-eyebrow">Your progress</div><h1>Progress map</h1>
    <p className="la-muted">Each lesson has up to four marks. A lesson is done when all of them are on, and the retention mark is only earned by answering review questions correctly on later days.</p>
    <div className="la-map-totals">{STAGE_NAMES.map(([key, name], i) => <div key={key} className={`la-stage-${i}`}><strong>{count(key)}<small>/{possible(key)}</small></strong><span>{name}</span></div>)}</div>
    {modules.map(module => <div key={module} className="la-map-module" style={hue(module)}>
      <h2>{module}</h2>
      <div className="la-map-grid">{lessons.filter(l => l.module === module).map(lesson => {
        const s = stages(lesson, store)
        return <button key={lesson.id} type="button" className="la-map-tile" onClick={() => onOpen(lesson)} aria-label={`${lesson.title}: ${STAGE_NAMES.filter(([k]) => s[k] !== null).map(([k, name]) => `${name} ${s[k] ? 'yes' : 'not yet'}`).join(', ')}`}>
          <span className="la-map-title">{lesson.title}</span>
          <span className="la-pips">{STAGE_NAMES.map(([key], i) => <i key={key} className={`la-stage-${i} ${s[key] ? 'on' : ''} ${s[key] === null ? 'na' : ''}`} />)}</span>
        </button>
      })}</div>
    </div>)}
    <div className="la-map-key">{STAGE_NAMES.map(([key, name], i) => <span key={key}><i className={`la-stage-${i} on`} />{name}</span>)}</div>
  </section>
}

export function Review({ lessons, store, onAnswer, onOpen }) {
  // The session is fixed when it opens, so answering does not reshuffle the queue under the learner.
  const [queue] = useState(() => dueItems(lessons, store).slice(0, 12))
  const [at, setAt] = useState(0)
  const [right, setRight] = useState(0)
  const [answered, setAnswered] = useState(false)
  const current = queue[at]
  return <section className="la-review">
    <div className="la-eyebrow">Spaced review</div><h1>Review</h1>
    {!queue.length && <div className="la-card"><p>Nothing is due. Questions join review when you work on a lesson, and return after 1, 3, 7, 21 and 60 days as you keep answering them correctly.</p></div>}
    {current && <div className="la-card" key={current.key}>
      <div className="la-review-head"><span>Question {at + 1} of {queue.length}</span><button type="button" className="la-ghost" onClick={() => onOpen(current.lesson)}>From: {current.lesson.title}</button></div>
      <Choice item={current.item} seed={current.key} label="Review question" onAnswer={correct => { onAnswer(current.key, correct); setAnswered(true); if (correct) setRight(r => r + 1) }} />
      <div className="la-actions"><button type="button" className="la-primary" disabled={!answered} onClick={() => { setAt(at + 1); setAnswered(false) }}>{at + 1 < queue.length ? 'Next question →' : 'Finish review'}</button></div>
    </div>}
    {queue.length > 0 && !current && <div className="la-card la-success-card"><h2>Review finished</h2><p>{right} of {queue.length} correct. Missed questions come back in ten minutes; the rest are scheduled further out.</p></div>}
  </section>
}

// "Why you'd care": the motivating story that comes before any detail.
export function WhyCard({ why }) {
  if (!why) return null
  return <section className="la-card la-why"><div className="la-eyebrow">Why you'd care</div><h2>{why.title}</h2><Md>{why.story}</Md></section>
}

// "Where you'll use it": case studies by background. The chosen background is saved and shown first.
export function UsesCard({ uses, role, onRole, roles }) {
  if (!uses?.length) return null
  const available = roles.filter(([id]) => uses.some(use => use.who === id))
  const chosen = uses.find(use => use.who === role) || uses.find(use => use.who === 'general') || uses[0]
  const others = uses.filter(use => use !== chosen)
  const label = id => roles.find(([key]) => key === id)?.[1] ?? id
  return <section className="la-card la-uses">
    <div className="la-eyebrow">Where you'll use it</div>
    <div className="la-roles" role="group" aria-label="Your background">{available.map(([id, name]) => <button key={id} type="button" aria-pressed={chosen.who === id} onClick={() => onRole(id)}>{name}</button>)}</div>
    <article className="la-use la-use-main"><span>{label(chosen.who)}</span><h3>{chosen.title}</h3><Md>{chosen.story}</Md></article>
    {others.length > 0 && <details className="la-details"><summary>Also used by {others.map(use => label(use.who)).join(', ')}</summary>
      <div className="la-use-grid">{others.map(use => <article key={use.who} className="la-use"><span>{label(use.who)}</span><h3>{use.title}</h3><Md>{use.story}</Md></article>)}</div>
    </details>}
  </section>
}

// "Another way to see it": extra viewpoints for topics that need more than one explanation.
export function AnglesCard({ angles }) {
  if (!angles?.length) return null
  return <section className="la-card la-angles"><div className="la-eyebrow">Another way to see it</div>
    <div className="la-angle-grid">{angles.map(angle => <article key={angle.title} className="la-angle"><h3>{angle.title}</h3><Md>{angle.body}</Md></article>)}</div>
  </section>
}
