import { useEffect, useRef, useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { tokenizePython } from '../a-arcade-python/analysis.js'
import { checkScript, readResults, forbiddenIn } from './checks.js'
import { functionSource, assignSource } from './source.js'

// "Write it yourself": you type a function, it runs in real Python in the page (Pyodide, in a
// worker that can be stopped), and every call in the block's cases is checked against the
// engine's answer. "Show me" reveals the lab's own version, from python/<file>.
//
// spec: { file, fn, prompt, starter, cases: [{ args, expected }], given: [fn names already
//         written, put before your code], forbid: [[text, why]], hint }

const INDENT = '    '

// A plain code box that types like an editor: Tab indents, Enter keeps the indentation and adds
// a level after a line ending in ':'.
export function CodeBox({ value, onChange, label, rows }) {
  const ref = useRef(null)
  const edit = (text, start, end, insert) => {
    const next = text.slice(0, start) + insert + text.slice(end)
    onChange(next)
    requestAnimationFrame(() => { const el = ref.current; if (el) el.selectionStart = el.selectionEnd = start + insert.length })
  }
  const onKeyDown = e => {
    const el = e.currentTarget, { selectionStart: s, selectionEnd: t, value: text } = el
    if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); edit(text, s, t, INDENT) }
    if (e.key === 'Enter') {
      e.preventDefault()
      const line = text.slice(text.lastIndexOf('\n', s - 1) + 1, s)
      const indent = /^\s*/.exec(line)[0] + (/:\s*$/.test(line) ? INDENT : '')
      edit(text, s, t, '\n' + indent)
    }
  }
  return <textarea ref={ref} className="nlp-codebox" aria-label={label} spellCheck={false} autoCapitalize="off" autoComplete="off"
    rows={rows ?? Math.max(6, value.split('\n').length + 1)} value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown} />
}

function Highlighted({ source }) {
  return <pre className="nlp-show"><code>{source.split('\n').map((line, i) => <div key={i}>{tokenizePython(line).map((t, j) => <span key={j} className={`tk-${t.kind}`}>{t.text}</span>)}{line === '' ? ' ' : ''}</div>)}</code></pre>
}

const show = v => typeof v === 'string' ? v : JSON.stringify(v)

// What runs before the learner's code: imports and constants (prelude, or `constants` taken from
// the file by name) and the functions already written.
// `also`: [file, function] pairs from other files (Part 4's exercises use Part 3's cosine).
export const programBefore = spec => [spec.prelude, ...(spec.constants ?? []).map(name => assignSource(spec.file, name)), ...(spec.also ?? []).map(([file, fn]) => functionSource(file, fn)), ...(spec.given ?? []).map(fn => functionSource(spec.file, fn))].filter(Boolean).join('\n\n')
const givenNames = spec => [...(spec.also ?? []).map(([, g]) => `${g}()`), ...(spec.given ?? []).map(g => `${g}()`),...(spec.constants ?? []), ...(spec.prelude && !spec.prelude.startsWith('import') ? [spec.prelude.split('=')[0].trim()] : [])]

export default function WriteIt({ spec, done, code: savedCode, onCode, onDone }) {
  const [code, setCode] = useState(savedCode ?? spec.starter)
  const [state, setState] = useState(done ? 'passed' : 'idle')
  const [status, setStatus] = useState('')
  const [results, setResults] = useState([])
  const [output, setOutput] = useState('')
  const [shown, setShown] = useState(false), [hint, setHint] = useState(false)
  const worker = useRef(null), timer = useRef(null)
  useEffect(() => () => { worker.current?.terminate(); clearTimeout(timer.current) }, [])
  const change = value => { setCode(value); onCode?.(value) }
  const stop = message => { worker.current?.terminate(); worker.current = null; clearTimeout(timer.current); setState('idle'); if (message) setStatus(message) }

  const run = () => {
    const banned = forbiddenIn(code, spec.forbid)
    if (banned.length) { setResults([]); setStatus(''); setOutput(''); setState({ banned }); return }
    const given = programBefore(spec)
    setState('running'); setResults([]); setOutput(''); setStatus('Starting Python…')
    let printed = ''
    try {
      const w = new Worker(new URL('../ml-lab/python.worker.js', import.meta.url), { type: 'module' })
      worker.current = w
      w.onmessage = ({ data }) => {
        if (data.type === 'status') setStatus(data.text)
        if (data.type === 'output') { printed += data.text + '\n'; setResults(readResults(printed)); setOutput(printed.split('\n').filter(l => !/^(PASS|FAIL)\|/.test(l)).join('\n').trim()) }
        if (data.type === 'done') { stop(); setState('passed'); setStatus(''); onDone() }
        if (data.type === 'error') {
          stop()
          const r = readResults(printed)
          setStatus(r.length ? `${r.filter(x => !x.pass).length} of ${r.length} checks failed. Read what each call returned, fix the code, and run it again.` : 'Your code stopped with an error before the checks could run:')
          if (!r.length) setOutput(o => (o ? o + '\n' : '') + data.text.split('\n').slice(-6).join('\n'))
        }
      }
      w.onerror = e => stop(e.message || 'Python could not start. Reload the lab and try again.')
      timer.current = setTimeout(() => stop('Stopped after 60 seconds. A loop that never ends? Check that every loop moves on.'), 60000)
      w.postMessage({ code: `${given}\n\n${code}`, checks: checkScript(spec), packages: [] })
    } catch (error) { stop(`Python could not start here: ${error.message}`) }
  }

  const passed = state === 'passed'
  return <div className={`nlp-write${passed ? ' passed' : ''}`}>
    <span className="qm-eyebrow">Write it yourself{passed ? ' · ✓ passed' : ''}</span>
    <div className="qm-md"><Markdown>{spec.prompt}</Markdown></div>
    {givenNames(spec).length > 0 && <p className="qm-hint">Already written for you, from earlier lessons: {givenNames(spec).map((g, i) => <span key={g}>{i ? ', ' : ''}<code>{g}</code></span>)}.</p>}
    <CodeBox value={code} onChange={change} label={`Your ${spec.fn} function`} />
    <div className="qm-buttons">
      {state === 'running'
        ? <button onClick={() => stop('Stopped.')}>Stop</button>
        : <button className="qm-primary" onClick={run}>▶ Run the checks</button>}
      {spec.hint && <button className="qm-quiet" onClick={() => setHint(true)}>Hint</button>}
      <button className="qm-quiet" onClick={() => setShown(s => !s)}>{shown ? 'Hide' : 'Show me'} the lab’s version</button>
      <button className="qm-quiet" onClick={() => { if (window.confirm?.('Replace your code with the starter?') ?? true) change(spec.starter) }}>Start again</button>
    </div>
    {hint && <div className="qm-feedback"><Markdown>{spec.hint}</Markdown></div>}
    {state?.banned && <div className="qm-feedback" role="status">{state.banned.map(([text, why]) => <p key={text}>Your code uses <code>{text}</code>. {why}</p>)}</div>}
    {status && <p className="qm-hint" role="status">{status}</p>}
    {results.length > 0 && <table className="qm-log nlp-results"><thead><tr><th></th><th>Call</th><th>Yours</th><th>Expected</th></tr></thead>
      <tbody>{results.map((r, i) => <tr key={i} className={r.pass ? 'pass' : 'fail'}>
        <td>{r.pass ? '✓' : '✗'}</td><td className="mono">{r.call}</td>
        <td className="mono">{r.error ? <span className="qm-yes">{r.error}</span> : show(r.got)}</td>
        <td className="mono">{r.pass ? '' : show(r.expected)}</td>
      </tr>)}</tbody></table>}
    {output && <pre className="qm-py-log">{output}</pre>}
    {passed && <p className="qm-answer" role="status"><strong>All checks pass.</strong> Compare yours with the lab’s version below: different code can be equally right.</p>}
    {(shown || passed) && <Highlighted source={functionSource(spec.file, spec.fn)} />}
  </div>
}
