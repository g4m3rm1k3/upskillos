import React, { useState } from 'react'
import LessonText from './LessonText.jsx'

// A task done in one of the app's own math tools, beside the ML lesson that needs it: why the tool is
// worth opening, exact steps and settings, and one comparison table where the hand calculation, the
// lesson's Python and the tool must agree. The tool opens in a new tab, so this lesson stays exactly
// where the learner left it. `prepare()` (optional) sets the tool up first — for example it saves an
// OpenMAT document with the lesson's data — and returns a message; it never overwrites existing work.
export default function ToolTask({ spec }) {
  const [notice, setNotice] = useState('')
  const open = () => {
    if (spec.prepare) {
      const r = spec.prepare()
      setNotice(r.message)
      if (!r.ok) return
    }
    window.open(`#${spec.href}`, '_blank', 'noopener')
  }
  return <section className="ml-tooltask" aria-label={`Check it in ${spec.toolName}`}>
    <span className="ml-eyebrow">Check it in {spec.toolName}</span>
    <h3>{spec.title}</h3>
    <p><LessonText>{spec.why}</LessonText></p>
    <ol>{spec.steps.map((s, i) => <li key={i}><LessonText>{s}</LessonText></li>)}</ol>
    <div className="ml-actions"><button className="ml-primary" onClick={open}>{spec.buttonLabel ?? `Open ${spec.toolName} in a new tab`} ↗</button></div>
    {notice && <p className="ml-caption" role="status">{notice}</p>}
    <p className="ml-caption">It opens in a new tab: this lesson stays where you are. Come back to this tab when you have the numbers.</p>
    <table className="ml-tooltask-table">
      <caption>What should agree{spec.tolerance ? ` (${spec.tolerance})` : ''}</caption>
      <thead><tr><th scope="col">Quantity</th><th scope="col">By hand</th><th scope="col">Python (this lesson)</th><th scope="col">{spec.toolName}</th></tr></thead>
      <tbody>{spec.compare.map((r, i) => <tr key={i}><th scope="row"><LessonText>{r[0]}</LessonText></th>{r.slice(1).map((c, j) => <td key={j}><LessonText>{c}</LessonText></td>)}</tr>)}</tbody>
    </table>
    {spec.after && <p><LessonText>{spec.after}</LessonText></p>}
  </section>
}
