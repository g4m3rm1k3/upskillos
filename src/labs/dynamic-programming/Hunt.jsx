import React, { useEffect, useRef, useState } from 'react'
import { startAttempt } from './runtime/runner.js'
import { readProgress, saveProgress, cleanHunt } from './progress.js'
import CodeEditor from './CodeEditor.jsx'
import { argsText, parseArgs } from './runArgs.js'
import { buggyCode, bugLines, decoyNote, fill, show } from './hunt.js'
import './hunt.css'

// The fixed lines without their shared indentation; a nested line stays indented under its loop.
const dedent = text => {
  const lines = text.split('\n')
  const cut = Math.min(...lines.filter(l => l.trim()).map(l => l.length - l.trimStart().length))
  return lines.map(l => l.slice(cut)).join('\n')
}

// A bug hunt: run a solution that has one classic DP bug, find the line, fix it, pass the checks.
// The steps follow the lab standard: what you need to know, then try (Run, click a line), then a
// reason for every answer (a note on a correct line, then why the bug breaks the method).
export default function Hunt({ lesson, hunt, language, setLanguage, onProgress }) {
  const id = lesson.id
  const [state, setState] = useState(() => readProgress(id, lesson.revision).hunt ?? cleanHunt({}))
  const code = state[language] ?? buggyCode(hunt, language)
  const lines = buggyCode(hunt, language).split('\n')
  const bug = bugLines(hunt, language)
  // The symptom is checked too, so a learner's fix can't pass while the bug's own input still fails.
  const symptomCase = { args: hunt.symptom.args, expected: hunt.symptom.expected }
  const cases = lesson.challenge.cases.some(c => JSON.stringify(c.args) === JSON.stringify(hunt.symptom.args))
    ? lesson.challenge.cases
    : [...lesson.challenge.cases, symptomCase]
  const known = [symptomCase, ...lesson.challenge.cases.slice(0, 2)]

  const [picked, setPicked] = useState(null)
  const [runArgs, setRunArgs] = useState(() => argsText(hunt.symptom.args))
  const [runResult, setRunResult] = useState(null)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(null)
  const [status, setStatus] = useState('')
  const cancel = useRef(null)
  useEffect(() => () => cancel.current?.(), [])

  function save(next) {
    setState(next)
    const record = readProgress(id, lesson.revision)
    record.hunt = next
    saveProgress(id, record)
    onProgress?.(id, record)
  }

  function pick(n) {
    if (state.found) return
    setPicked(n)
    if (bug.includes(n)) save({ ...state, found: true })
    else save({ ...state, misses: state.misses + 1 })
  }

  function run() {
    const parsed = parseArgs(runArgs)
    if (parsed.error) { setRunResult({ error: parsed.error }); return }
    cancel.current?.()
    setRunning('run')
    setRunResult(null)
    setStatus('Starting code worker…')
    cancel.current = startAttempt({
      language, code, mode: 'run', args: parsed.value,
      onStatus: setStatus,
      onDone: data => {
        setRunning(null)
        setStatus('')
        const match = known.find(c => JSON.stringify(c.args) === JSON.stringify(parsed.value))
        setRunResult({ ...data, args: runArgs, expected: match ? match.expected : undefined })
      },
    })
  }

  function check() {
    cancel.current?.()
    setRunning('check')
    setResult(null)
    setStatus('Starting code worker…')
    cancel.current = startAttempt({
      language, code, cases,
      onStatus: setStatus,
      onDone: data => {
        setRunning(null)
        setStatus('')
        setResult(data)
        if (data.passed === true) save({ ...state, passed: true })
      },
    })
  }

  function stop() {
    cancel.current?.()
    cancel.current = null
    setRunning(null)
    setStatus('')
  }

  const edit = next => { setResult(null); save({ ...state, [language]: next }) }
  const busy = running !== null
  const wrongPick = picked !== null && !bug.includes(picked)
  const decoy = wrongPick ? decoyNote(hunt, language, lines[picked - 1]) : null
  const [right] = hunt.swap[language]

  return (
    <section className="dp-hunt" aria-label="Bug hunt">
      <div className="dp-section-heading">
        <div>
          <p className="dp-eyebrow">04 · BUG HUNT · ONE LINE IS WRONG</p>
          <h3>Find the bug, fix it, see why</h3>
        </div>
        {state.passed && <span className="dp-passed-tag">🐞 Fixed</span>}
      </div>

      <p>
        Someone solved this lesson’s challenge, and their code passes most of its checks. One classic DP mistake is
        hiding in it. Run it, find the line, and fix it.
      </p>

      <aside className="dp-hunt-know">
        <strong>What you need to know</strong>
        <p>{hunt.know}</p>
      </aside>

      <h4 className="dp-hunt-step">1 · Run it</h4>
      <p className="dp-muted">
        On the input below the right answer is <code>{show(hunt.symptom.expected, language)}</code>. Run the code and compare.
        Add {language === 'Python' ? <code>print</code> : <code>console.log</code>} lines once you are fixing it, to watch the table.
      </p>
      <div className="dp-run-box">
        <label>
          <span>Run <code>solve</code> with</span>
          <input
            value={runArgs}
            onChange={e => setRunArgs(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); run() } }}
            spellCheck={false}
            aria-label="Arguments for solve"
          />
        </label>
        <div className="dp-run-presets">
          <button type="button" onClick={() => setRunArgs(argsText(hunt.symptom.args))}>The input that shows it</button>
          {lesson.challenge.cases.slice(0, 2).map((test, i) => (
            <button key={i} type="button" onClick={() => setRunArgs(argsText(test.args))}>Example {i + 1}</button>
          ))}
        </div>
      </div>
      <div className="dp-run-controls">
        <button type="button" className="dp-primary dp-btn-run" disabled={busy} onClick={run}>
          {running === 'run' ? 'Running…' : '▶ Run'}
        </button>
        {busy && <button type="button" className="dp-btn-stop" onClick={stop}>Stop execution</button>}
      </div>
      {busy && (
        <p role="status" className="dp-feedback dp-feedback-running">
          <span className="dp-spinner" aria-hidden="true" /> {status}
        </p>
      )}
      {runResult && (
        <div className="dp-run-output" role="region" aria-label="Run output">
          <p className="dp-eyebrow">OUTPUT · NOT GRADED</p>
          <pre className="dp-console">{runResult.output || <span className="dp-console-empty">(nothing printed)</span>}</pre>
          {runResult.called && (
            <p className="dp-run-returned">
              <code>solve({runResult.args})</code> returned <code>{runResult.returned}</code>
              {runResult.expected !== undefined && (
                <> · the right answer is <code>{show(runResult.expected, language)}</code></>
              )}
            </p>
          )}
          {runResult.error && <pre className="dp-error-log">{runResult.error}</pre>}
        </div>
      )}

      <h4 className="dp-hunt-step">2 · Which line is wrong?</h4>
      {!state.found ? (
        <>
          <p className="dp-muted">Click the line you think is wrong. Each line that is right tells you why it is.</p>
          <ol className="dp-hunt-lines" aria-label="The buggy solution, one button per line">
            {lines.map((text, i) => text.trim() ? (
              <li key={i}>
                <button
                  type="button"
                  className={picked === i + 1 ? 'is-picked' : ''}
                  aria-label={`Line ${i + 1}: ${text.trim()}`}
                  onClick={() => pick(i + 1)}
                >
                  <span className="dp-hunt-no" aria-hidden="true">{i + 1}</span>
                  <code>{text}</code>
                </button>
              </li>
            ) : <li key={i} aria-hidden="true" className="dp-hunt-blank"><span className="dp-hunt-no">{i + 1}</span></li>)}
          </ol>
          {wrongPick && (
            <p role="status" className="dp-quiz-feedback is-error">
              <strong>Line {picked} is right.</strong>{' '}
              {decoy ?? 'It does what the method says. Compare what the code returned with the right answer: which part of the method could make that number?'}
            </p>
          )}
          <div className="dp-run-controls">
            <button
              type="button"
              className="dp-btn-hint"
              disabled={state.clues >= hunt.clues.length}
              onClick={() => save({ ...state, clues: state.clues + 1 })}
            >
              {state.clues ? (state.clues >= hunt.clues.length ? 'All clues shown' : 'Next clue') : 'Ask for a clue'}
            </button>
            {state.clues >= hunt.clues.length && (
              <button type="button" className="dp-di-secondary" onClick={() => save({ ...state, found: true, shown: true })}>
                Show me the line
              </button>
            )}
          </div>
          {state.clues > 0 && (
            <ol className="dp-revealed-hints-box" aria-label="Clues">
              {hunt.clues.slice(0, state.clues).map((clue, i) => <li key={i}>{fill(hunt, clue, language)}</li>)}
            </ol>
          )}
        </>
      ) : (
        <>
          <div className="dp-quiz-feedback is-correct" role="status">
            <strong>{state.shown ? 'The bug' : '✓ Found it'}: {hunt.bug}{bug.length > 1 ? ` (lines ${bug[0]}–${bug.at(-1)})` : ` (line ${bug[0]})`}</strong>
            <p>{fill(hunt, hunt.why, language)}</p>
          </div>

          <h4 className="dp-hunt-step">3 · Fix it</h4>
          <p className="dp-muted">
            Change the code below until <strong>Run & check</strong> passes. It runs the challenge’s hidden cases and the input that showed the bug.
          </p>
          <CodeEditor
            code={code}
            onChange={edit}
            language={language}
            setLanguage={setLanguage}
            disabled={busy}
            onRun={run}
            onCheck={check}
            onReset={() => edit(buggyCode(hunt, language))}
            ariaLabel={`The buggy ${language} solution, to fix`}
          />
          <div className="dp-run-controls">
            <button type="button" className="dp-primary dp-btn-run" disabled={busy} onClick={run}>
              {running === 'run' ? 'Running…' : '▶ Run'}
            </button>
            <button type="button" className="dp-btn-check" disabled={busy} onClick={check}>
              {running === 'check' ? 'Checking…' : '✓ Run & check'}
            </button>
            {!state.passed && (
              <button type="button" className="dp-di-secondary" disabled={busy} onClick={() => save({ ...state, shown: true })}>
                Show the fix
              </button>
            )}
          </div>

          {result && (
            <div className={`dp-feedback ${result.passed ? 'dp-passed' : 'dp-failed'}`} role="status">
              <strong>
                {result.passed ? '🐞 Fixed: every check passes.' : `Not yet: ${result.rows?.filter(r => r.passed).length ?? 0} of ${cases.length} checks pass.`}
              </strong>
              {result.error && <pre className="dp-error-log">{result.error}</pre>}
              {!result.passed && result.rows?.map((row, i) => !row.passed && (
                <pre key={i} className="dp-test-diff">
                  solve({argsText(cases[i].args)}){'\n'}Expected: {show(cases[i].expected, language)}{'\n'}
                  {row.error ? `Error: ${row.error}` : `Returned: ${row.actual}`}
                </pre>
              ))}
            </div>
          )}

          {(state.passed || state.shown) && (
            <aside className="dp-hunt-know">
              <strong>The fix{state.passed && !state.shown ? '' : ' (shown)'}</strong>
              <p>{fill(hunt, hunt.fix, language)}</p>
              <pre className="dp-console">{dedent(right)}</pre>
            </aside>
          )}
        </>
      )}
    </section>
  )
}
