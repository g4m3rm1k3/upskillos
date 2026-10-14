import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import * as P from '../engine/pretrained.js'
import * as H from '../engine/helpdesk.js'
import { useModel, LoadButton } from './part7.jsx'

const f = (x, d = 2) => (Number.isInteger(x) ? String(x) : x.toFixed(d))
const Slider = ({ label, value, min, max, step, onChange, format = v => v }) =>
  <label className="qm-slider">{label} <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /> <b className="mono">{format(value)}</b></label>

// Lessons 8.3 and 8.4 share one help desk: the FAQ you wrote, its threshold, and the test questions.
const store = { desk: { faq: H.FAQ, tests: H.TESTS, threshold: 0.4, wrongCost: 3 }, listeners: new Set() }
const setDesk = change => { store.desk = { ...store.desk, ...change }; store.listeners.forEach(l => l()) }
const useDesk = () => useSyncExternalStore(l => { store.listeners.add(l); return () => store.listeners.delete(l) }, () => store.desk)

// The FAQ's example questions, embedded with MiniLM whenever the FAQ changes (the latest request wins).
function useExamples(model, faq) {
  const entries = useMemo(() => H.parseFaq(faq), [faq])
  const ex = useMemo(() => H.examples(entries), [entries])
  const [made, setMade] = useState({ ex: null, vectors: null })
  const latest = useRef(0)
  useEffect(() => {
    if (!model) return
    const id = ++latest.current
    if (!ex.length) { setMade({ ex, vectors: [] }); return }
    P.embed(model, ex.map(([q]) => q)).then(vectors => { if (id === latest.current) setMade({ ex, vectors }) })
  }, [model, ex])
  // Vectors only for the examples they were made from: never a new FAQ with the old vectors.
  return { entries, ex, vectors: made.ex === ex ? made.vectors : null }
}

const outcomeOf = (best, score, right, threshold) => {
  const answered = H.route(best, score, threshold)
  return answered === -1 ? (right === -1 ? 'refused' : 'missed') : (answered === right ? 'right' : 'wrong')
}
const OUTCOME = { right: '✓ right', wrong: '✗ wrong answer', refused: '✓ refused', missed: '✗ missed' }

export function HelpDesk() {
  const [state, start] = useModel('embedder')
  const desk = useDesk()
  const { entries, ex, vectors } = useExamples(state.model, desk.faq)
  const [question, setQuestion] = useState('is my code uploaded anywhere?')
  const [found, setFound] = useState(null)
  useEffect(() => {
    if (!state.model || !vectors) return
    let live = true
    if (!question.trim() || !vectors.length) { setFound(null); return }
    P.embed(state.model, [question]).then(([q]) => {
      if (!live) return
      const scored = vectors.map((v, i) => [v.reduce((s, a, d) => s + a * q[d], 0), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1])
      setFound({ ex, best: H.bestEntry(q, vectors, ex.map(([, k]) => k)), top: scored.slice(0, 3) })
    })
    return () => { live = false }
  }, [state.model, vectors, question, ex])
  const match = found?.ex === ex ? found : null
  const answered = match ? H.route(match.best[0], match.best[1], desk.threshold) : -1
  return <div className="qm-fig">
    <LoadButton kind="embedder" state={state} start={start} />
    <label className="nlp-input"><span>Your FAQ: Q: lines, then the A: line that answers them</span><textarea rows={10} value={desk.faq} onChange={e => setDesk({ faq: e.target.value })} /></label>
    <p className="qm-small"><b>{entries.length}</b> entries, <b>{ex.length}</b> example questions{state.model && !vectors && ex.length ? ' · embedding them…' : ''}</p>
    <ol className="nlp-stages">{entries.map((e, k) => <li key={k}><span className="qm-dim">{e.questions.map(q => `“${q}”`).join(' · ')}</span><br />{e.answer}</li>)}</ol>
    <label className="nlp-input"><span>Ask the help desk</span><input value={question} onChange={e => setQuestion(e.target.value)} /></label>
    <Slider label="Similarity needed" value={desk.threshold} min={0} max={0.9} step={0.05} onChange={t => setDesk({ threshold: t })} />
    {!state.model ? <p className="qm-hint">Load MiniLM above: the help desk needs it to compare meanings.</p> : match && <div className="nlp-nb">
      <section className={answered === -1 ? 'unsure' : 'best'}>
        <h4>{answered === -1 ? 'I don’t know' : `Entry ${answered + 1}`}</h4>
        <p>{answered === -1 ? `The closest example scores ${f(match.best[1])}, below ${f(desk.threshold)}: “Sorry, I can’t help with that. Try rephrasing, or contact a person.”` : entries[answered]?.answer}</p>
      </section>
      <section><h4>Closest example questions</h4><ol>{match.top.map(([s, i]) => <li key={i}>“{ex[i][0]}” <span className="qm-dim">entry {ex[i][1] + 1} · {f(s)}</span></li>)}</ol></section>
    </div>}
  </div>
}

export function HelpDeskTest() {
  const [state, start] = useModel('embedder')
  const desk = useDesk()
  const { entries, ex, vectors } = useExamples(state.model, desk.faq)
  const tests = useMemo(() => H.parseTests(desk.tests), [desk.tests])
  const [ran, setRan] = useState(null)
  const [busy, setBusy] = useState(false)
  // Results only for the FAQ and tests they were run on.
  const results = ran && ran.tests === tests && ran.ex === ex ? ran.results : null
  const run = async () => {
    if (!state.model || !vectors || !tests.length) return
    setBusy(true)
    try {
      const qv = await P.embed(state.model, tests.map(([q]) => q))
      setRan({ tests, ex, results: tests.map(([, right], i) => { const [best, score] = H.bestEntry(qv[i], vectors, ex.map(([, k]) => k)); return [score, best, right] }) })
    } finally { setBusy(false) }
  }
  const counts = results && H.outcomes(results, desk.threshold)
  const curve = results && H.THRESHOLDS.map(t => { const c = H.outcomes(results, t); return { t, ...c, cost: desk.wrongCost * c.wrong + c.missed } })
  const cheapest = results && H.chooseThreshold(results, H.THRESHOLDS, desk.wrongCost)
  const download = () => {
    const json = JSON.stringify({ model: P.MODELS.embedder.id, pooling: 'mean', normalize: true, threshold: desk.threshold, entries, examples: ex.map(([q, k], i) => ({ question: q, entry: k, vector: vectors[i].map(x => Number(x.toFixed(5))) })) })
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a'); a.href = url; a.download = 'helpdesk.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const W = 420, Ht = 200, Pd = 32
  const maxCost = curve ? Math.max(1, ...curve.map(c => c.cost)) : 1
  const x = t => Pd + (W - Pd - 10) * t / 0.9, y = c => Ht - Pd - (Ht - Pd - 10) * c / maxCost
  return <div className="qm-fig">
    <LoadButton kind="embedder" state={state} start={start} />
    <p className="qm-small">Testing the help desk from lesson 8.3: <b>{entries.length}</b> entries. Edit the FAQ there, and the tests here, then run them again.</p>
    <label className="nlp-input"><span>Test questions, none of them in the FAQ: “question =&gt; entry number” or “=&gt; none”</span><textarea rows={8} value={desk.tests} onChange={e => setDesk({ tests: e.target.value })} /></label>
    <div className="qm-buttons">
      <button className="qm-primary" disabled={!state.model || !vectors || busy || !tests.length} onClick={run}>{busy ? 'Testing…' : `Run the ${tests.length} tests`}</button>
      {results && vectors?.length > 0 && <button onClick={download}>Download helpdesk.json</button>}
    </div>
    {results && <>
      <div className="qm-fig-controls">
        <Slider label="Similarity needed" value={desk.threshold} min={0} max={0.9} step={0.05} onChange={t => setDesk({ threshold: t })} />
        <Slider label="A wrong answer costs" value={desk.wrongCost} min={1} max={10} step={1} onChange={c => setDesk({ wrongCost: c })} format={c => `${c} × a missed one`} />
      </div>
      <p className="qm-small">At {f(desk.threshold)}: <b>{counts.right}</b> right · <b>{counts.refused}</b> rightly refused · <b>{counts.wrong}</b> wrong answers · <b>{counts.missed}</b> missed. Cost {desk.wrongCost} × {counts.wrong} + {counts.missed} = <b>{desk.wrongCost * counts.wrong + counts.missed}</b>. Cheapest threshold: <b>{f(cheapest[0])}</b> (cost {cheapest[1]}) <button className="qm-quiet" onClick={() => setDesk({ threshold: cheapest[0] })}>Use it</button></p>
      <div className="qm-fig-row">
        <div className="qm-scroll" style={{ maxHeight: 320 }}><table className="qm-log">
          <thead><tr><th>Question</th><th>Right</th><th>Closest</th><th>Score</th><th>Result</th></tr></thead>
          <tbody>{tests.map(([q, right], i) => { const [score, best] = results[i], o = outcomeOf(best, score, right, desk.threshold); return <tr key={i} className={o === 'right' || o === 'refused' ? 'pass' : 'fail'}><td style={{ textAlign: 'left' }}>{q}</td><td>{right === -1 ? 'none' : right + 1}</td><td>{best + 1 || '–'}</td><td>{f(score)}</td><td>{OUTCOME[o]}</td></tr> })}</tbody>
        </table></div>
        <svg className="qm-plot" viewBox={`0 0 ${W} ${Ht}`} role="img" aria-label="Cost of the test results at each threshold">
          <line className="qm-axis" x1={Pd} y1={Ht - Pd} x2={W - 5} y2={Ht - Pd} /><line className="qm-axis" x1={Pd} y1={10} x2={Pd} y2={Ht - Pd} />
          <text className="qm-tick" x={W / 2 - 30} y={Ht - 8}>threshold 0 → 0.9</text><text className="qm-tick" x={4} y={14}>cost</text>
          <polyline fill="none" stroke="#b0413e" strokeWidth="2" points={curve.map(c => `${x(c.t)},${y(c.cost)}`).join(' ')} />
          <polyline fill="none" stroke="#3f5bb5" strokeDasharray="4 3" points={curve.map(c => `${x(c.t)},${y(c.wrong * desk.wrongCost)}`).join(' ')} />
          <polyline fill="none" stroke="#1f6f68" strokeDasharray="1 3" strokeWidth="2" points={curve.map(c => `${x(c.t)},${y(c.missed)}`).join(' ')} />
          <line x1={x(desk.threshold)} y1={10} x2={x(desk.threshold)} y2={Ht - Pd} stroke="#7a3fb0" />
        </svg>
      </div>
      <p className="qm-hint">Red: the total cost. Blue dashes: the cost of wrong answers, which falls as the threshold rises. Green dots: missed answers, which rise. The purple line is the threshold you chose.</p>
    </>}
  </div>
}
