// Part 6 figure (also used by the Symbol decoder): a famous equation, broken into pieces you can click.
import { useState } from 'react'
import Markdown from '../../qmaze-lab/Markdown.jsx'
import { EQUATIONS } from '../decoder.js'
import { lessonById } from '../lessons/index.js'

export function EquationAnatomy({ ids, onLesson }) {
  const list = ids ? EQUATIONS.filter(e => ids.includes(e.id)) : EQUATIONS
  const [id, setId] = useState(list[0].id), [part, setPart] = useState(0)
  const eq = list.find(e => e.id === id) ?? list[0], p = eq.parts[Math.min(part, eq.parts.length - 1)], lesson = lessonById(p[2])
  return <div className="qm-fig mm-anatomy">
    {list.length > 1 && <div className="qm-fig-controls"><label>Equation <select value={eq.id} onChange={e => { setId(e.target.value); setPart(0) }}>{list.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label></div>}
    <p className="qm-hint">{eq.source}</p>
    <div className="mm-equation"><Markdown>{`$$${eq.tex}$$`}</Markdown></div>
    <div className="mm-parts">{eq.parts.map(([tex], i) => <button key={i} className={i === part ? 'active' : ''} onClick={() => setPart(i)}><Markdown inline>{`$${tex}$`}</Markdown></button>)}</div>
    <div className="mm-part-explain"><Markdown inline>{`$${p[0]}$: ${p[1]}.`}</Markdown> {lesson && (onLesson ? <button className="qm-link" onClick={() => onLesson(lesson.id)}>Lesson {lesson.number}: {lesson.title}</button> : <span className="qm-hint">Lesson {lesson.number}: {lesson.title}</span>)}</div>
    <p><b>In one sentence:</b> <Markdown inline>{eq.whole}</Markdown></p>
  </div>
}
