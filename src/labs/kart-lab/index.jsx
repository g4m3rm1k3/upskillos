import { useEffect, useMemo, useRef, useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import Arena from './Arena.jsx'
import Training from './Training.jsx'
import Library from './Library.jsx'
import Source, { SourceSnippet } from './Source.jsx'
import { DecisionFigure, UpdateFigure } from './Figures.jsx'
import { LESSONS } from './lessons.js'
import { unpack } from './engine/learning.js'
import baselines from './baselines.json'
import '../qmaze-lab/style.css'
import './style.css'
const STORE = 'upskillos.kart-lab.v1'
function read() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE)) ?? {}
    return { ...data, drivers: (Array.isArray(data.drivers) ? data.drivers : []).slice(0, 8).filter(d => { try { unpack(d.checkpoint); return typeof d.name === 'string' && typeof d.id === 'string' } catch { return false } }) }
  } catch { return {} }
}
function Check({ block, solved, onSolve }) {
  const [picked, setPicked] = useState(null), [feedback, setFeedback] = useState(false)
  return <div className="qm-check"><span className="qm-eyebrow">Predict, then check</span><p>{block.question}</p><div className="qm-options">{block.options.map((text, i) => <label key={text} className="qm-option"><input type="radio" name={block.question} checked={(solved ? block.answer : picked) === i} disabled={solved} onChange={() => { setPicked(i); setFeedback(false) }} />{text}</label>)}</div>{!solved && <button disabled={picked === null} onClick={() => { setFeedback(true); if (picked === block.answer) onSolve() }}>Check answer</button>}{(feedback || solved) && <p role="status" className="qm-feedback">{solved ? 'Correct. ' : 'Try again. '}{block.why}</p>}</div>
}
export default function KartLab() {
  const [saved, setSaved] = useState(read), [tab, setTab] = useState('lessons'), [notice, setNotice] = useState('')
  const main = useRef(null), arenaSession = useRef(null)
  const lesson = LESSONS.find(l => l.id === saved.current) ?? LESSONS[0]
  const drivers = useMemo(() => [...baselines, ...(saved.drivers ?? [])], [saved.drivers])
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(saved)) } catch { setNotice('Device storage is full or unavailable. Progress remains in this session; new checkpoints cannot be saved until storage is available.') } }, [saved])
  const open = id => { setSaved(s => ({ ...s, current: id })); main.current?.scrollTo?.({ top: 0 }) }
  const saveDriver = driver => {
    if ((saved.drivers?.length ?? 0) >= 8) return 'Your library holds eight custom drivers. Remove a checkpoint below before saving another.'
    const next = { ...saved, drivers: [...(saved.drivers ?? []), { ...driver, id: `driver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }] }
    try { localStorage.setItem(STORE, JSON.stringify(next)); setSaved(next); return null } catch { return 'Checkpoint could not be saved: device storage is full or unavailable.' }
  }
  const parts = [...new Set(LESSONS.map(l => l.part))]
  return <div className="qm-lab kl-lab"><header className="qm-header"><div><h1>🏎️ KartLab</h1><p>A real game. Your trained drivers. Every decision explained.</p></div><div className="qm-tabs" role="tablist" aria-label="KartLab sections">{[['lessons', 'Lessons'], ['training', 'Train & compare'], ['race', 'Race & watch'], ['source', 'Code & maths']].map(([id, text]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{text}</button>)}</div></header>
    {notice && <p className="qm-feedback" role="status">{notice}</p>}
    <div className="qm-body">{tab === 'lessons' && <nav className="qm-sidebar" aria-label="Lessons">{parts.map(part => <section key={part}><h3>{part}</h3><ol>{LESSONS.filter(l => l.part === part).map(l => <li key={l.id}><button className={lesson.id === l.id ? 'active' : ''} aria-current={lesson.id === l.id ? 'page' : undefined} onClick={() => open(l.id)}><span className="qm-num">{String(LESSONS.indexOf(l) + 1).padStart(2, '0')}</span><span>{l.title}</span>{saved.done?.[l.id] && <span className="qm-done">✓</span>}</button></li>)}</ol></section>)}</nav>}
    <main className={`qm-main ${tab !== 'lessons' ? 'qm-wide' : ''}`} ref={main}>
      {tab === 'lessons' && <article className="qm-lesson" key={lesson.id}><header><span className="qm-eyebrow">{lesson.part}</span><h1>{lesson.title}</h1><p className="qm-goal"><b>After this lesson you can:</b> {lesson.goal}</p></header>
        {lesson.id === LESSONS[0].id && <div className="kl-intro"><span>WELCOME TO SUNLIT CIRCUIT</span><h2>Your next rival<br />is a model you trained.</h2><p>Learn the decisions. Tune the policy. Take the wheel.</p><button onClick={() => setTab('race')}>Meet the drivers →</button></div>}
        {lesson.blocks.map((b, i) => b.md ? <div className="qm-md" key={i}><Markdown>{b.md}</Markdown></div> : b.figure ? <figure className="qm-figure" key={i}>{b.figure === 'decision' ? <DecisionFigure /> : <UpdateFigure />}</figure> : b.code ? <SourceSnippet key={i} name={b.code} /> : b.question ? <Check key={i} block={b} solved={!!saved.checks?.[lesson.id]} onSolve={() => setSaved(s => ({ ...s, checks: { ...s.checks, [lesson.id]: true } }))} /> : <aside className="qm-note try" key={i}><span className="qm-eyebrow">Your experiment</span><p>{b.task}</p><div className="qm-buttons"><button onClick={() => setTab('training')}>Open training</button><button onClick={() => setTab('race')}>Open race arena</button></div></aside>)}
        <footer className="qm-lesson-end"><button className="qm-primary" onClick={() => { const next = LESSONS[LESSONS.indexOf(lesson) + 1]; setSaved(s => ({ ...s, done: { ...s.done, [lesson.id]: true }, current: next?.id ?? lesson.id })); main.current?.scrollTo?.({ top: 0 }) }}>Mark done{LESSONS.indexOf(lesson) < LESSONS.length - 1 ? ' & next lesson →' : ''}</button></footer>
      </article>}
      {/* Keep training mounted across tabs so a run is not accidentally discarded when opening a lesson. */}
      <div hidden={tab !== 'training'}><Training drivers={drivers} onSave={saveDriver} /><Library drivers={saved.drivers ?? []} onSave={saveDriver} onRemove={id => setSaved(s => ({ ...s, drivers: s.drivers.filter(d => d.id !== id) }))} /></div>
      {tab === 'race' && <Arena drivers={drivers} session={arenaSession} />}
      {tab === 'source' && <Source />}
    </main></div>
  </div>
}
