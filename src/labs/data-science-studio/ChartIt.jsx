import { useEffect, useRef, useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { CodeBox } from './WriteIt.jsx'
import { HEIGHT, WIDTH, checkChart, runChart } from './engine/chartRun.js'

// "Draw it with D3": the learner writes the JavaScript that draws a chart with D3, into an SVG of
// 480 × 300. Their chart is drawn beside the lab's; the check compares the two charts' marks (see
// engine/chartRun.js). Modelled on Data Science on the Web's practice block, which runs code the
// same way and computes the answer key from the solution.
//
// spec: { prompt, starter, solution, data, runs, checks: [{ select, attrs }], keep, tolerance, hint, explain }

const SVG = 'http://www.w3.org/2000/svg'
let d3Promise = null
const loadD3 = () => (d3Promise ??= import('d3'))
const makeSvg = () => { const el = document.createElementNS(SVG, 'svg'); el.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`); return el }
const JS_OPENS = /[{([]\s*$/

// Draws code into a visible box: every data set in turn, as the check does.
function Drawing({ code, spec, label, version }) {
  const box = useRef(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    let live = true
    loadD3().then(d3 => {
      if (!live || !box.current) return
      box.current.innerHTML = ''
      const svgEl = makeSvg()
      svgEl.setAttribute('width', '100%')
      svgEl.setAttribute('role', 'img')
      svgEl.setAttribute('aria-label', label)
      box.current.appendChild(svgEl)
      for (const data of spec.runs ?? [spec.data]) {
        const r = runChart(code, { d3, svgEl, data })
        if (r.error) { setError(r.error.message); return }
      }
      setError(null)
    })
    return () => { live = false }
  }, [code, spec, label, version])
  return <figure className="ds-drawing">
    <figcaption>{label}</figcaption>
    <div ref={box} className="ds-drawing-box" />
    {error && <p className="qm-feedback" role="status">Your code stopped with an error: {error}</p>}
  </figure>
}

const preview = data => {
  const text = JSON.stringify(Array.isArray(data) ? data.slice(0, 3) : data)
  return Array.isArray(data) && data.length > 3 ? `${text.slice(0, -1)}, … ${data.length - 3} more]` : text
}

export default function ChartIt({ spec, done, code: savedCode, onCode, onDone }) {
  const [code, setCode] = useState(savedCode ?? spec.starter)
  const [drawn, setDrawn] = useState({ code: savedCode ?? spec.starter, version: 0 })
  const [result, setResult] = useState(done ? { passed: true } : null)
  const [shown, setShown] = useState(false), [hint, setHint] = useState(false)
  const change = value => { setCode(value); onCode?.(value) }

  const check = async () => {
    setDrawn(d => ({ code, version: d.version + 1 }))
    const d3 = await loadD3()
    const r = checkChart(code, spec, { d3, makeSvg })
    if (r.error) { setResult({ error: r.error.message }); return }
    setResult({ problems: r.problems, passed: r.problems.length === 0 })
    if (r.problems.length === 0) onDone()
  }

  const passed = result?.passed
  return <div className={`ds-write ds-chartit${passed ? ' passed' : ''}`}>
    <span className="qm-eyebrow">Draw it with D3{passed ? ' · ✓ passed' : ''}</span>
    <div className="qm-md"><Markdown>{spec.prompt}</Markdown></div>
    <p className="qm-hint">Your code is given <code>d3</code>, <code>svg</code> (a D3 selection of an empty SVG, {WIDTH} wide and {HEIGHT} high), <code>width</code>, <code>height</code> and <code>data</code>{spec.runs ? `, drawn ${spec.runs.length} times with different data` : ''}: <code className="ds-data-preview">{preview(spec.runs ? spec.runs[0] : spec.data)}</code></p>
    <CodeBox value={code} onChange={change} label="Your D3 code" indent="  " opens={JS_OPENS} />
    <div className="qm-buttons">
      <button className="qm-primary" onClick={check}>▶ Draw and check</button>
      <button className="qm-quiet" onClick={() => setDrawn(d => ({ code, version: d.version + 1 }))}>Just draw</button>
      {spec.hint && <button className="qm-quiet" onClick={() => setHint(true)}>Hint</button>}
      <button className="qm-quiet" onClick={() => setShown(s => !s)}>{shown ? 'Hide' : 'Show me'} the lab’s chart</button>
      <button className="qm-quiet" onClick={() => { if (window.confirm?.('Replace your code with the starter?') ?? true) change(spec.starter) }}>Start again</button>
    </div>
    {hint && <div className="qm-feedback"><Markdown>{spec.hint}</Markdown></div>}
    {result?.error && <p className="qm-feedback" role="status">Your code stopped with an error: {result.error}</p>}
    {result?.problems?.length > 0 && <div className="qm-feedback" role="status"><p>Not yet: your chart differs from the lab’s.</p><ul>{result.problems.map(p => <li key={p}>{p}</li>)}</ul></div>}
    {passed && <div className="qm-answer" role="status"><strong>Your chart matches the lab’s, mark for mark.</strong>{spec.explain && <div className="qm-md"><Markdown>{spec.explain}</Markdown></div>}</div>}
    <div className="ds-drawings">
      <Drawing code={drawn.code} spec={spec} label="Your chart" version={drawn.version} />
      {(shown || passed) && <Drawing code={spec.solution} spec={spec} label="The lab’s chart" version={0} />}
    </div>
    {(shown || passed) && <pre className="ds-show ds-js"><code>{spec.solution}</code></pre>}
  </div>
}
