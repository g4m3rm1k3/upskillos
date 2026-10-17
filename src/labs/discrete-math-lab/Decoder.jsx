// The Symbol & Theorem Decoder: every symbol the Discrete Math Lab teaches, searchable, with how to say it,
// what it means, a concrete example, and the lesson that builds it from scratch; plus the interactive Theorem Anatomy gallery.
import { useMemo, useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { SYMBOLS } from './decoder.js'
import { lessonById, refs } from './lessons/index.js'
import { EquationAnatomy } from './figures/part8.jsx'

const GROUPS = [...new Set(SYMBOLS.map(s => s[5]))]

export default function Decoder({ onLesson }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const rows = useMemo(
    () =>
      SYMBOLS.filter(
        ([tex, say, means, example, , g]) =>
          (group === 'all' || g === group) &&
          (!query || `${tex} ${say} ${means} ${example}`.toLowerCase().includes(query.toLowerCase())),
      ),
    [query, group],
  )
  return <article className="qm-lesson mm-decoder">
    <header>
      <p className="qm-eyebrow">Symbol & Theorem Decoder</p>
      <h1>Every symbol and landmark theorem, in plain words</h1>
    </header>
    <p>Met an unfamiliar symbol in a proof, textbook, or algorithm analysis? Search it here: how to say it out loud, what it means, a concrete example, and the lesson that builds it from first principles.</p>
    <div className="qm-fig-controls">
      <label>Search <input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. forall, divides, choose, totient, chromatic" /></label>
      <label>Topic <select value={group} onChange={e => setGroup(e.target.value)}>
        <option value="all">All areas</option>
        {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
      </select></label>
    </div>
    <table className="qm-mathcode ps-symbols">
      <thead>
        <tr><th>Symbol</th><th>Say it</th><th>What it means</th><th>Concrete example</th><th>Learn it</th></tr>
      </thead>
      <tbody>
        {rows.map(([tex, say, means, example, id]) => {
          const l = lessonById(id)
          return <tr key={tex}>
            <td><Markdown inline>{`$${tex}$`}</Markdown></td>
            <td><i>{say}</i></td>
            <td><Markdown inline>{refs(means)}</Markdown></td>
            <td><Markdown inline>{example}</Markdown></td>
            <td>{l && <button className="qm-link" onClick={() => onLesson(id)}>{l.number} {l.title}</button>}</td>
          </tr>
        })}
      </tbody>
    </table>
    {rows.length === 0 && <p className="qm-hint">Nothing matches. Try a word for what the symbol does, like &ldquo;subset&rdquo;, &ldquo;prime&rdquo;, or &ldquo;sum&rdquo;.</p>}
    <h2 className="qm-h">Landmark theorems & identities, taken apart</h2>
    <EquationAnatomy onLesson={onLesson} />
  </article>
}
