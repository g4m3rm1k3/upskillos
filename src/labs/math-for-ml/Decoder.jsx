// The Symbol decoder: every symbol the lab teaches, searchable, with how to say it, what it means,
// how it looks in code and the lesson that builds it; and the gallery of famous equations.
import { useMemo, useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { SYMBOLS } from './decoder.js'
import { lessonById } from './lessons/index.js'
import { EquationAnatomy } from './figures/part6.jsx'

const GROUPS = [...new Set(SYMBOLS.map(s => s[5]))]
export default function Decoder({ onLesson }) {
  const [query, setQuery] = useState(''), [group, setGroup] = useState('all')
  const rows = useMemo(() => SYMBOLS.filter(([tex, say, means, code, , g]) => (group === 'all' || g === group) && (!query || `${tex} ${say} ${means} ${code}`.toLowerCase().includes(query.toLowerCase()))), [query, group])
  return <article className="qm-lesson mm-decoder">
    <header><p className="qm-eyebrow">Symbol decoder</p>
    <h1>Every symbol, in plain words</h1></header>
    <p>Met a symbol in a paper? Find it here: how to say it, what it means, what it looks like in Python, and the lesson that builds it from scratch.</p>
    <div className="qm-fig-controls"><label>Search <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. gradient, sigma, expectation" /></label>
      <label>Area <select value={group} onChange={e => setGroup(e.target.value)}><option value="all">everything</option>{GROUPS.map(g => <option key={g} value={g}>{g}</option>)}</select></label></div>
    <table className="qm-mathcode ps-symbols"><thead><tr><th>Symbol</th><th>Say it</th><th>What it means</th><th>In code</th><th>Learn it</th></tr></thead>
      <tbody>{rows.map(([tex, say, means, code, id]) => { const l = lessonById(id); return <tr key={tex}><td><Markdown inline>{`$${tex}$`}</Markdown></td><td><i>{say}</i></td><td><Markdown inline>{means}</Markdown></td><td className="mono">{code}</td><td>{l && <button className="qm-link" onClick={() => onLesson(id)}>{l.number} {l.title}</button>}</td></tr> })}</tbody></table>
    {rows.length === 0 && <p className="qm-hint">Nothing matches. Try a word for what the symbol does, like "average" or "slope".</p>}
    <h2 className="qm-h">Famous equations, taken apart</h2>
    <EquationAnatomy onLesson={onLesson} />
  </article>
}
