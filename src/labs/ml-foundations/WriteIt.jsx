import React, { useEffect, useRef, useState } from 'react'
import CodeEditor from '../dynamic-programming/CodeEditor.jsx'
import { useDesktop } from '../../components/desktop/DesktopProvider.jsx'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { startAttempt } from './runtime/runner.js'
import { prelude, lensPrelude, PIECES } from './python/pieces.js'
import { handOffToCodeLens } from './codelens.js'

// One coding challenge: the learner writes (or fixes) a real Python function.
//  ▶ Run           runs it as written, shows every print, and the value of a call they choose. Not graded.
//  ✓ Run & check   the hidden cases; a failing one can be sent to the Run box.
//  🔍 CodeLens     their code plus the chosen call, stepped line by line.
// Underneath runs a prelude: the lab's constants and helpers, and the pieces this challenge uses,
// each one the learner's own passed code when they have it ("your toolbox").
export default function WriteIt({ challenge, entry, mine, onSave }) {
  const desktop = useDesktop()
  const [code, setCode] = useState(entry?.code ?? challenge.starter)
  const [hints, setHints] = useState(entry?.hints ?? 0)
  const [passed, setPassed] = useState(entry?.passed ?? false)
  const [call, setCall] = useState(challenge.runCalls?.[0] ?? challenge.cases[0].call)
  const [result, setResult] = useState(null)
  const [runResult, setRunResult] = useState(null)
  const [running, setRunning] = useState(null)
  const [status, setStatus] = useState('')
  const [showRef, setShowRef] = useState(false)
  const cancel = useRef(null)
  useEffect(() => () => { if (cancel.current) cancel.current() }, [])

  const toolbox = (challenge.uses ?? []).filter(p => p !== challenge.piece)
  const program = () => prelude(toolbox, mine)
  const persist = (next = {}) => onSave({ code, hints, passed, shown: entry?.shown === true, ...next })

  function edit(next) { setCode(next); setResult(null); setPassed(false); onSave({ code: next, hints, passed: false, shown: entry?.shown === true }) }

  function run() {
    cancel.current?.()
    setRunning('run'); setRunResult(null); setStatus('Starting Python…')
    persist()
    cancel.current = startAttempt({
      mode: 'run', prelude: program(), code, call,
      onStatus: setStatus,
      onDone: data => { cancel.current = null; setRunning(null); setStatus(''); setRunResult({ ...data, call }) },
    })
  }

  function check() {
    cancel.current?.()
    setRunning('check'); setResult(null); setStatus('Starting Python…')
    cancel.current = startAttempt({
      mode: 'check', prelude: program(), code, cases: challenge.cases,
      onStatus: setStatus,
      onDone: data => {
        cancel.current = null; setRunning(null); setStatus(''); setResult(data)
        const ok = data.passed === true
        setPassed(ok); persist({ passed: ok })
      },
    })
  }

  function stop() { cancel.current?.(); cancel.current = null; setRunning(null); setStatus('') }

  function codeLens() {
    persist()
    handOffToCodeLens(`${lensPrelude(toolbox, mine, `${code}\n${call}`)}\n\n# ---- your code ----\n${code}`, call)
    desktop?.minimizeWindow?.('ml-foundations')
    window.location.hash = '#/codelens'
  }

  const busy = running !== null
  return (
    <section className="mlf-write" aria-label={challenge.title}>
      <header className="mlf-write-head">
        <p className="mlf-eyebrow">{challenge.kind === 'fix' ? 'Fix the bug' : 'Write it yourself'}{passed ? ' · ✓ passed' : ''}</p>
        <h3>{challenge.title}</h3>
      </header>
      <div className="mlf-md"><Markdown>{challenge.prompt}</Markdown></div>
      {toolbox.length > 0 && (
        <p className="mlf-toolbox">
          <strong>Your toolbox:</strong>{' '}
          {toolbox.map(p => <span key={p} className={`mlf-tool${mine[p] ? ' mine' : ''}`} title={mine[p] ? 'Your own code, which passed its checks' : 'The lab’s version (write it in its lesson to use yours)'}><code>{p}</code> {mine[p] ? '✓ yours' : '· lab version'}</span>)}
          {' '}are already defined, with <code>ACTIONS</code>, <code>OFFSETS</code>, <code>STEP</code>, <code>BUMP</code>, <code>GOAL</code> and the maps <code>TINY</code>, <code>SMALL</code>, <code>SEVEN</code>.
        </p>
      )}
      {!toolbox.length && <p className="mlf-toolbox">Already defined for you: <code>ACTIONS</code>, <code>OFFSETS</code>, <code>STEP</code>, <code>BUMP</code>, <code>GOAL</code>, and the map texts <code>TINY</code>, <code>SMALL</code> and <code>SEVEN</code>.</p>}

      <CodeEditor code={code} onChange={edit} language="Python" disabled={busy} onRun={run} onCheck={check} onReset={() => edit(challenge.starter)} ariaLabel={`Your Python for ${challenge.title}`} />

      <div className="mlf-run-box">
        <label>
          <span>Run, then show the value of</span>
          <input value={call} onChange={e => setCall(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); run() } }} spellCheck={false} aria-label="Python expression to show after running" />
        </label>
        <div className="mlf-presets">
          {(challenge.runCalls ?? challenge.cases.slice(0, 3).map(c => c.call)).map(c => <button key={c} type="button" className="mlf-chip" onClick={() => setCall(c)}><code>{c.length > 46 ? `${c.slice(0, 44)}…` : c}</code></button>)}
        </div>
      </div>

      <div className="mlf-run-controls">
        <button type="button" className="mlf-primary" onClick={run} disabled={busy}>{running === 'run' ? 'Running…' : '▶ Run'}</button>
        <button type="button" className="mlf-checkbtn" onClick={check} disabled={busy}>{running === 'check' ? 'Checking…' : '✓ Run & check'}</button>
        {busy && <button type="button" className="mlf-stop" onClick={stop}>Stop</button>}
        <button type="button" className="mlf-secondary" onClick={codeLens} disabled={busy} title="Step through your code line by line, with every variable">🔍 Open in CodeLens</button>
        <button type="button" className="mlf-secondary" disabled={busy || hints >= challenge.hints.length} onClick={() => { setHints(hints + 1); persist({ hints: hints + 1 }) }}>
          {hints >= challenge.hints.length ? 'No more hints' : hints ? 'Next hint' : 'A hint, please'}
        </button>
      </div>
      <p className="mlf-muted">Ctrl+Enter runs · Ctrl+Shift+Enter checks · your code is saved as you type, and with your account when you are signed in.</p>

      {hints > 0 && <ol className="mlf-hints" aria-label="Hints">{challenge.hints.slice(0, hints).map((h, i) => <li key={i}><Markdown inline>{h}</Markdown></li>)}</ol>}
      {busy && <p className="mlf-status" role="status"><span className="mlf-spinner" aria-hidden="true" /> {status}</p>}

      {runResult && (
        <div className="mlf-output" role="region" aria-label="Run output">
          <p className="mlf-eyebrow">Output · not graded</p>
          <pre className="mlf-console">{runResult.output || '(nothing printed)'}</pre>
          {runResult.called && <p className="mlf-returned"><code>{runResult.call}</code> is <code>{runResult.returned}</code></p>}
          {runResult.error && <pre className="mlf-error">{runResult.error}</pre>}
        </div>
      )}

      {!result && passed && <p className="mlf-feedback good" role="status">✓ This code passed every check. It is now a piece in your toolbox.</p>}
      {result && (
        <div className={`mlf-result ${result.passed ? 'good' : 'bad'}`} role="status">
          <p><strong>{result.passed ? `✓ All ${challenge.cases.length} checks passed.` : 'Not yet.'}</strong>{result.rows?.length > 0 && !result.passed && ` ${result.rows.filter(r => r.passed).length} of ${challenge.cases.length} checks passed.`}
            {result.passed && challenge.piece && <> <code>{challenge.piece}</code> is now in your toolbox: later lessons run on your version.</>}</p>
          {result.error && <pre className="mlf-error">{result.error}</pre>}
          {result.rows?.length > 0 && (
            <ol className="mlf-cases">
              {result.rows.map((row, i) => (
                <li key={i} className={row.passed ? 'pass' : 'fail'}>
                  <span>{row.passed ? '✓' : '✗'} <code>{challenge.cases[i].call}</code>{challenge.cases[i].why ? <span className="mlf-muted"> · {challenge.cases[i].why}</span> : null}</span>
                  {!row.passed && (
                    <>
                      <pre className="mlf-diff">{`expected  ${challenge.cases[i].shown ?? JSON.stringify(challenge.cases[i].expected)}\n${row.error ? `error     ${row.error}` : `got       ${row.actual}`}`}</pre>
                      <button type="button" className="mlf-chip" onClick={() => setCall(challenge.cases[i].call)}>Put this call in the Run box</button>
                    </>
                  )}
                </li>
              ))}
            </ol>
          )}
          {result.output && <details><summary>What your code printed</summary><pre className="mlf-console">{result.output}</pre></details>}
        </div>
      )}
      {passed && challenge.solution && (
        <details className="mlf-ref" open={showRef} onToggle={e => setShowRef(e.currentTarget.open)}>
          <summary>Compare with the lab's version</summary>
          <pre className="mlf-console">{challenge.solution}</pre>
          {challenge.compare && <Markdown>{challenge.compare}</Markdown>}
        </details>
      )}
    </section>
  )
}

export { PIECES }
