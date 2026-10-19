import React, { useState } from 'react'
import Prism from '../../utils/prism.js'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-javascript'
import { explainLines } from './explain.js'
import './explained.css'

// The lesson's reference solution, line by line with notes, and a table of every maths symbol beside
// the code that holds it. It opens only after the learner's own attempt (a Run & check, or a pass).
export default function Explained({ entry, language, attempted }) {
  const [open, setOpen] = useState(false)
  if (!attempted) {
    return <p className="dp-muted dp-ex-locked">After your first <strong>Run & check</strong>, the reference solution opens here, explained line by line.</p>
  }
  if (!open) {
    return <div className="dp-next-stage-cta">
      <button type="button" className="dp-di-secondary" onClick={() => setOpen(true)}>Compare with the reference solution, explained →</button>
    </div>
  }
  const { lines } = explainLines(entry, language)
  const langKey = language === 'Python' ? 'python' : 'javascript'
  const grammar = Prism.languages[langKey]
  return <section className="dp-ex" aria-label="Reference solution, explained">
    <p className="dp-eyebrow">REFERENCE SOLUTION · LINE BY LINE</p>
    <p className="dp-muted">One way to write it. Compare it with yours: the same states and choices may be written differently.</p>
    <div className="dp-ex-code">
      {lines.map(({ n, text, notes }) => (
        <div key={n} className={`dp-ex-row${notes.length ? ' is-noted' : ''}`}>
          <pre className="dp-ex-line"><span className="dp-ex-no" aria-hidden="true">{n}</span><code dangerouslySetInnerHTML={{ __html: grammar ? Prism.highlight(text || ' ', grammar, langKey) : text }} /></pre>
          {notes.length > 0 && <ul className="dp-ex-notes">{notes.map((note, i) => <li key={i}>{note}</li>)}</ul>}
        </div>
      ))}
    </div>
    <table className="dp-ex-math">
      <caption>The maths, and the code that holds it</caption>
      <thead><tr><th>Maths</th><th>Code</th><th>What it is</th></tr></thead>
      <tbody>{entry.math.map(([maths, py, js, meaning]) => (
        <tr key={maths}><td>{maths}</td><td><code>{language === 'Python' ? py : js}</code></td><td>{meaning}</td></tr>
      ))}</tbody>
    </table>
  </section>
}
