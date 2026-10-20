import React, { useEffect, useRef, useState } from 'react'
import { handOffToCodeLens } from './codelens.js'
import { useDesktop } from '../../components/desktop/DesktopProvider.jsx'
import { startAttempt } from './runtime/runner.js'
import { readProgress, saveProgress } from './progress.js'
import RecursionLesson from './RecursionLesson.jsx'
import CodeEditor from './CodeEditor.jsx'
import CodeViewer from './CodeViewer.jsx'
import TableTrace from './TableTrace.jsx'
import CallTree from './CallTree.jsx'
import DesignIt from './DesignIt.jsx'
import { DESIGNS } from './lessons/designs.js'
import './trace.css'
import { TRACES } from './tables.js'
import { TREE_FOR } from './trees.js'
import { argsText, parseArgs } from './runArgs.js'
import Hunt from './Hunt.jsx'
import { BUG_HUNTS } from './hunt.js'
import Explained from './Explained.jsx'
import { EXPLAINED } from './explain.js'
import Checks from './Checks.jsx'
import { CHECKS } from './lessons/checks.js'

const short = value => {
  const text = JSON.stringify(value)
  return text.length > 240 ? text.slice(0, 237) + '…' : text
}

export default function Lesson({
  lesson,
  concepts = [],
  onSelect,
  language = 'Python',
  setLanguage,
  onProgress,
}) {
  const isRecursion = lesson.id === 'recursion'
  const hasChallenge = Boolean(lesson.challenge)
  const hasQuiz = Boolean(lesson.quiz)

  const design = isRecursion ? null : DESIGNS[lesson.id]
  const hunt = !isRecursion && hasChallenge ? BUG_HUNTS[lesson.id] : null
  const stages = isRecursion
    ? [['walk', '01 · Walkthrough & stack'], ['solve', '02 · Coding challenge']]
    : [
        ...(design ? [['design', '00 · Design it yourself']] : []),
        ['understand', '01 · Understand'],
        ['walk', '02 · Walk through'],
        ['solve', hasChallenge ? '03 · Solve a problem' : '03 · Check understanding'],
        ...(hunt ? [['hunt', `04 · Bug hunt${readProgress(lesson.id, lesson.revision).hunt?.passed ? ' ✓' : ''}`]] : []),
      ]
  const checks = isRecursion ? null : CHECKS[lesson.id]
  if (checks) stages.push(['checks', `${String(stages.length - (design ? 1 : 0) + 1).padStart(2, '0')} · Check yourself${readProgress(lesson.id, lesson.revision).checks?.done ? ' ✓' : ''}`])

  // The stage is remembered for this tab, so returning from CodeLens reopens the challenge.
  const stageKey = `dp-lab.stage.${lesson.id}`
  const [savedStage, setStageState] = useState(() => { try { return sessionStorage.getItem(stageKey) } catch { return null } })
  const stage = stages.some(([sid]) => sid === savedStage) ? savedStage : stages[0][0]
  const setStage = sid => { setStageState(sid); try { sessionStorage.setItem(stageKey, sid) } catch { /* private window */ } }
  const [step, setStep] = useState(0)

  const steps = lesson.example?.steps || []
  const currentStep = steps[step] || steps[0] || ['Start', 'Initial state', 'Begin trace']

  const currentIndex = concepts.findIndex(c => c.id === lesson.id)
  // Past the Foundations, challenges are hard enough to want stepping through: offer CodeLens.
  const traceable = Boolean(concepts[currentIndex]?.levelId && concepts[currentIndex].levelId !== 'foundations')
  const prevConcept = currentIndex > 0 ? concepts[currentIndex - 1] : null
  const nextConcept = currentIndex >= 0 && currentIndex < concepts.length - 1 ? concepts[currentIndex + 1] : null

  return (
    <div className="dp-lesson">
      <div className="dp-lesson-top">
        <p className="dp-objective">
          <span className="dp-obj-tag">OBJECTIVE</span>
          <span>{lesson.objective}</span>
        </p>

        <div className="dp-prerequisites">
          <strong>Prerequisites:</strong>{' '}
          {lesson.prerequisites?.length ? (
            lesson.prerequisites.map(id => (
              <button
                type="button"
                key={id}
                className="dp-prereq-btn"
                onClick={() => onSelect(id)}
              >
                {concepts.find(c => c.id === id)?.title || id} ↗
              </button>
            ))
          ) : (
            <span className="dp-muted">
              Basic variables, functions, lists/arrays, and arithmetic in your chosen language.
            </span>
          )}
        </div>
      </div>

      <nav className="dp-stage-nav" aria-label="Lesson stages">
        {stages.map(([sid, name]) => (
          <button
            key={sid}
            type="button"
            className={`dp-stage-btn ${stage === sid ? 'is-active' : ''}`}
            aria-pressed={stage === sid}
            onClick={() => setStage(sid)}
          >
            {name}
          </button>
        ))}
      </nav>

      {/* RECURSION CUSTOM STAGES */}
      {isRecursion && stage === 'walk' && (
        <RecursionLesson
          practiceAvailable={true}
          onStartChallenge={() => setStage('solve')}
        />
      )}
      {isRecursion && stage === 'solve' && (
        <Practice
          key={`${lesson.id}:${language}`}
          lesson={lesson}
          language={language}
          setLanguage={setLanguage}
          onProgress={onProgress}
          traceable={traceable}
        />
      )}

      {/* DESIGN IT YOURSELF: before any explanation */}
      {stage === 'design' && (
        <DesignIt
          key={lesson.id}
          id={lesson.id}
          design={design}
          revision={lesson.revision}
          onProgress={onProgress}
          onFinish={sid => { setStage(sid); setStep(0) }}
        />
      )}

      {/* STANDARD STAGE: UNDERSTAND */}
      {!isRecursion && stage === 'understand' && (
        <section aria-label="Concept walkthrough" className="dp-reading">
          {lesson.sections?.map(([title, text]) => (
            <section key={title} className="dp-card">
              <h3>{title}</h3>
              <p>{text}</p>
            </section>
          ))}

          {lesson.procedure?.length > 0 && (
            <section className="dp-procedure dp-card">
              <h3>A systematic procedure you can reuse</h3>
              <ol>
                {lesson.procedure.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ol>
            </section>
          )}

          {lesson.proof && (
            <section className="dp-card dp-proof-card">
              <h3>Why it works (correctness & invariant)</h3>
              <p>{lesson.proof}</p>
            </section>
          )}

          {lesson.complexity && (
            <section className="dp-card dp-complexity-card">
              <h3>Time and space complexity</h3>
              <p>{lesson.complexity}</p>
            </section>
          )}

          {lesson.pitfall && (
            <aside className="dp-pitfall">
              <strong>⚠️ Common mistake to watch for:</strong>
              <p>{lesson.pitfall}</p>
            </aside>
          )}

          <div className="dp-next-stage-cta">
            <button
              type="button"
              className="dp-primary"
              onClick={() => {
                setStage('walk')
                setStep(0)
              }}
            >
              Walk through an example →
            </button>
          </div>
        </section>
      )}

      {/* STANDARD STAGE: WORKED EXAMPLE */}
      {!isRecursion && stage === 'walk' && (
        <section className="dp-worked" aria-label="Worked example">
          {TREE_FOR[lesson.id] && <CallTree id={TREE_FOR[lesson.id]} />}
          {TRACES[lesson.id] && <TableTrace id={lesson.id} />}
          <div className="dp-section-heading">
            <div>
              <p className="dp-eyebrow">{TRACES[lesson.id] || TREE_FOR[lesson.id] ? 'STEP-BY-STEP NOTES' : 'GUIDED TRACE · STEP BY STEP'}</p>
              <h3>{lesson.example?.title || 'Worked example'}</h3>
            </div>
            <span className="dp-step-counter">
              Step {step + 1} of {steps.length}
            </span>
          </div>

          <div className="dp-step-track">
            {steps.map(([title], i) => (
              <button
                key={i}
                type="button"
                className={`dp-step-pill ${step === i ? 'is-active' : ''}`}
                aria-label={`Step ${i + 1}: ${title}`}
                aria-pressed={step === i}
                onClick={() => setStep(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <article className="dp-step-card" aria-live="polite">
            <div className="dp-step-header">
              <span className="dp-step-badge">Step {step + 1} of {steps.length}</span>
              <h4>{currentStep[0]}</h4>
            </div>
            <div className="dp-step-display">
              <pre className="dp-step-pre">{currentStep[1]}</pre>
            </div>
            <p className="dp-step-explanation">{currentStep[2]}</p>
          </article>

          <div className="dp-step-controls">
            <button
              type="button"
              disabled={step === 0}
              aria-label="Previous step"
              onClick={() => setStep(s => s - 1)}
            >
              ← Previous step
            </button>
            <button
              type="button"
              className="dp-btn-primary-sm"
              disabled={step === steps.length - 1}
              aria-label="Next step"
              onClick={() => setStep(s => s + 1)}
            >
              Next step →
            </button>
          </div>

          <p className="dp-muted">
            Pause before advancing: what state changes next, and which previous cells or dependencies
            justify that change?
          </p>

          <div className="dp-next-stage-cta">
            <button
              type="button"
              className="dp-primary"
              onClick={() => setStage('solve')}
            >
              {hasChallenge ? 'Try the independent challenge →' : 'Check your understanding →'}
            </button>
          </div>
        </section>
      )}

      {/* STANDARD STAGE: PRACTICE OR QUIZ */}
      {!isRecursion && stage === 'solve' && (
        <>
          {hasChallenge ? (
            <Practice
              key={`${lesson.id}:${language}`}
              lesson={lesson}
              language={language}
              setLanguage={setLanguage}
              onProgress={onProgress}
              traceable={traceable}
            />
          ) : hasQuiz ? (
            <ConceptQuiz
              lesson={lesson}
              onProgress={onProgress}
            />
          ) : (
            <div className="dp-card">
              <p className="dp-muted">Practice challenge coming soon for this concept.</p>
            </div>
          )}
          {hunt && (
            <div className="dp-next-stage-cta">
              <button type="button" className="dp-primary" onClick={() => setStage('hunt')}>
                Hunt a bug in someone else’s solution →
              </button>
            </div>
          )}
        </>
      )}

      {/* BUG HUNT: a solution with one classic DP bug */}
      {stage === 'checks' && checks && (
        <Checks key={lesson.id} id={lesson.id} checks={checks} revision={lesson.revision} onProgress={onProgress} />
      )}
      {stage === 'hunt' && hunt && (
        <Hunt
          key={lesson.id}
          lesson={lesson}
          hunt={hunt}
          language={language}
          setLanguage={setLanguage}
          onProgress={onProgress}
        />
      )}

      {/* BOTTOM PAGING NAVIGATION */}
      <footer className="dp-lesson-paging">
        {prevConcept && (
          <button
            type="button"
            className="dp-paging-prev"
            onClick={() => onSelect(prevConcept.id)}
          >
            ← Previous: {prevConcept.title}
          </button>
        )}
        {nextConcept && (
          <button
            type="button"
            className="dp-paging-next dp-primary"
            onClick={() => onSelect(nextConcept.id)}
          >
            Next: {nextConcept.title} →
          </button>
        )}
      </footer>
    </div>
  )
}

export function ConceptQuiz({ lesson, onProgress }) {
  const quiz = lesson.quiz
  const saved = readProgress(lesson.id, lesson.revision)?.quiz
  const [answer, setAnswer] = useState(saved?.answer || '')
  const [feedback, setFeedback] = useState(saved?.passed ? 'Passed previously' : '')
  const [passed, setPassed] = useState(saved?.passed || false)
  const [hintCount, setHintCount] = useState(0)

  function checkAnswer(e) {
    e.preventDefault()
    const cleanUser = answer.trim().toLowerCase()
    const cleanExpected = quiz.answer.trim().toLowerCase()
    const isCorrect = cleanUser === cleanExpected || Number(cleanUser) === Number(cleanExpected)

    if (isCorrect) {
      setPassed(true)
      setFeedback('Correct! ' + (quiz.reasoning || 'Well reasoned.'))
      const record = readProgress(lesson.id, lesson.revision)
      record.quiz = { answer, passed: true }
      saveProgress(lesson.id, record)
      onProgress?.(lesson.id, record)
    } else {
      setPassed(false)
      setFeedback('Not quite. Review the question and reasoning, or check the hint below.')
    }
  }

  return (
    <section className="dp-concept-quiz dp-card" aria-label="Check understanding">
      <div className="dp-section-heading">
        <div>
          <p className="dp-eyebrow">03 / ACTIVE RECALL · CHECK YOUR UNDERSTANDING</p>
          <h3>Apply the concept</h3>
        </div>
        {passed && <span className="dp-passed-tag">✓ Solved</span>}
      </div>

      <p className="dp-quiz-question">{quiz.question}</p>

      <form className="dp-quiz-form" onSubmit={checkAnswer}>
        <label className="dp-quiz-label">
          <span>Your answer</span>
          <input
            type="text"
            className="dp-quiz-input"
            placeholder="Type your answer here…"
            value={answer}
            onChange={e => {
              setAnswer(e.target.value)
              setFeedback('')
            }}
          />
        </label>
        <button type="submit" className="dp-primary">
          Check answer
        </button>
      </form>

      {feedback && (
        <div
          role="status"
          className={`dp-quiz-feedback ${passed ? 'is-correct' : 'is-error'}`}
        >
          <strong>{passed ? '✓ Correct!' : '✗ Not yet'}</strong>
          <p>{feedback}</p>
        </div>
      )}

      {quiz.hint && (
        <div className="dp-quiz-hints">
          <button
            type="button"
            className="dp-hint-toggle"
            onClick={() => setHintCount(h => (h > 0 ? 0 : 1))}
          >
            {hintCount > 0 ? 'Hide hint' : 'Need a hint?'}
          </button>
          {hintCount > 0 && <p className="dp-hint-box">{quiz.hint}</p>}
        </div>
      )}
    </section>
  )
}

export { parseArgs } from './runArgs.js'

export function Practice({ lesson, language, setLanguage, onProgress, traceable = false }) {
  const spec = lesson.challenge
  const desktop = useDesktop()
  const saved = readProgress(lesson.id, lesson.revision)?.[language]
  const [code, setCode] = useState(saved?.code ?? spec.starters[language])
  const [hints, setHints] = useState(saved?.hints ?? 0)
  const [passed, setPassed] = useState(saved?.passed ?? false)
  const [storageOK, setStorageOK] = useState(true)
  const [result, setResult] = useState(null)
  const [runResult, setRunResult] = useState(null)
  const [runArgs, setRunArgs] = useState(() => argsText(spec.cases[0].args))
  const [running, setRunning] = useState(null)
  const [status, setStatus] = useState('')
  // The reference solution opens after the learner's own first Run & check (or a saved pass).
  const [attempted, setAttempted] = useState(saved?.passed ?? false)
  const cancel = useRef(null)

  useEffect(() => () => cancel.current?.(), [])

  function persist(nextCode, nextHints, nextPassed) {
    const record = readProgress(lesson.id, lesson.revision)
    record[language] = { code: nextCode, hints: nextHints, passed: nextPassed }
    const stored = saveProgress(lesson.id, record)
    setStorageOK(stored)
    onProgress?.(lesson.id, record)
  }

  function edit(nextCode) {
    setCode(nextCode)
    setResult(null)
    setPassed(false)
    persist(nextCode, hints, false)
  }

  function handleReset() {
    edit(spec.starters[language])
  }

  function stop() {
    const what = running
    cancel.current?.()
    cancel.current = null
    setRunning(null)
    setStatus('')
    if (what === 'run') setRunResult({ error: 'Stopped. Your draft is unchanged.' })
    else setResult({ passed: false, rows: [], error: 'Stopped. Your draft is unchanged.' })
  }

  // Just run it: the learner's prints, then solve(...) on the Run box's input. Nothing is graded.
  function runOnly() {
    const parsed = parseArgs(runArgs)
    if (parsed.error) { setRunResult({ error: parsed.error }); return }
    cancel.current?.()
    setRunning('run')
    setRunResult(null)
    setStatus('Starting code worker…')
    persist(code, hints, passed)
    cancel.current = startAttempt({
      language, code, mode: 'run', args: parsed.value,
      onStatus: setStatus,
      onDone: data => { setRunning(null); setStatus(''); setRunResult({ ...data, args: runArgs }) },
    })
  }

  function check() {
    cancel.current?.()
    setAttempted(true)
    setRunning('check')
    setPassed(false)
    setResult(null)
    setStatus('Starting code worker…')
    persist(code, hints, false)
    cancel.current = startAttempt({
      language,
      code,
      cases: spec.cases,
      onStatus: setStatus,
      onDone: data => {
        setRunning(null)
        setStatus('')
        setResult(data)
        setPassed(data.passed === true)
        persist(code, hints, data.passed === true)
      },
    })
  }

  function openCodeLens() {
    const parsed = parseArgs(runArgs)
    if (parsed.error) { setRunResult({ error: parsed.error }); return }
    persist(code, hints, passed)
    handOffToCodeLens(code, language, parsed.value)
    // CodeLens is a full-screen page; the lab's window would sit on top of it, so it steps aside
    // (minimized, keeping its state) until CodeLens's "Back to the DP lab" reopens it.
    desktop?.minimizeWindow?.('dynamic-programming')
    // The app uses HashRouter, so this is router navigation without needing the router's context here.
    window.location.hash = '#/codelens'

  }

  const busy = running !== null
  return (
    <section className="dp-live-practice" aria-label="Coding challenge">
      <div className="dp-challenge-header">
        <p className="dp-eyebrow">YOUR TURN · INDEPENDENT PRACTICE</p>
        <h3>Apply the idea in code</h3>
        <p className="dp-prompt">{spec.prompt}</p>
        <div className="dp-constraints-box">
          <strong>Inputs & contract:</strong> <span>{spec.constraints}</span>
        </div>
      </div>

      <p className="dp-muted">
        Implement <code>solve({spec.params})</code> and return the requested value. Use <strong>Run</strong> as often as you
        like: it runs your code, shows everything you {language === 'Python' ? <code>print</code> : <code>console.log</code>}, and
        what <code>solve</code> returns for the input you choose. <strong>Run & check</strong> tests it on the hidden cases.
      </p>

      <div className="dp-samples">
        {spec.cases.slice(0, 2).map((test, i) => (
          <div key={i} className="dp-sample-card">
            <strong>Example {i + 1}</strong>
            <pre>
              solve({test.args.map(short).join(', ')}){'\n'}→ {short(test.expected)}
            </pre>
          </div>
        ))}
      </div>

      <CodeEditor
        code={code}
        onChange={edit}
        language={language}
        setLanguage={setLanguage}
        disabled={busy}
        onRun={runOnly}
        onCheck={check}
        onReset={handleReset}
        ariaLabel={`Your ${language} solution`}
      />

      <p className="dp-editor-footer-hint">
        Tab indents; Shift+Tab moves focus out. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> runs; <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> checks.{' '}
        {storageOK
          ? 'Your draft and every pass are saved, and follow you to other devices when you are signed in.'
          : 'Local storage unavailable. Save a copy of your draft before leaving.'}
      </p>

      <div className="dp-run-box">
        <label>
          <span>Run <code>solve</code> with</span>
          <input
            value={runArgs}
            onChange={e => setRunArgs(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runOnly() } }}
            spellCheck={false}
            aria-label="Arguments for solve"
          />
        </label>
        <div className="dp-run-presets">
          {spec.cases.slice(0, 3).map((test, i) => (
            <button key={i} type="button" onClick={() => setRunArgs(argsText(test.args))}>Example {i + 1}</button>
          ))}
        </div>
      </div>

      <div className="dp-run-controls">
        <button type="button" className="dp-primary dp-btn-run" disabled={busy} onClick={runOnly}>
          {running === 'run' ? 'Running…' : '▶ Run'}
        </button>
        <button type="button" className="dp-btn-check" disabled={busy} onClick={check}>
          {running === 'check' ? 'Checking…' : '✓ Run & check'}
        </button>
        {busy && (
          <button type="button" className="dp-btn-stop" onClick={stop}>
            Stop execution
          </button>
        )}
        {traceable && (
          <button type="button" className="dp-btn-codelens" disabled={busy} onClick={openCodeLens} title="Step through your code line by line, with every variable and the call stack">
            🔍 Open in CodeLens
          </button>
        )}
        <button
          type="button"
          className="dp-btn-hint"
          disabled={busy || hints >= spec.hints.length}
          onClick={() => {
            const next = hints + 1
            setHints(next)
            persist(code, next, passed)
          }}
        >
          {hints ? (hints >= spec.hints.length ? 'All hints revealed' : 'Reveal next hint') : 'Ask for a hint'}
        </button>
      </div>

      {hints > 0 && (
        <aside className="dp-revealed-hints-box" aria-label="Revealed hints">
          <p className="dp-eyebrow">SMALL NUDGES · PROGRESSIVE HINTS</p>
          <ol>
            {spec.hints.slice(0, hints).map((hint, idx) => (
              <li key={idx}>
                <strong>Hint {idx + 1}:</strong> {hint}
              </li>
            ))}
          </ol>
        </aside>
      )}

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
            </p>
          )}
          {runResult.error && <pre className="dp-error-log">{runResult.error}</pre>}
        </div>
      )}

      {!result && passed && (
        <div className="dp-feedback dp-passed" role="status">
          ✓ This saved {language} draft previously passed all test checks.
        </div>
      )}

      {result && (
        <div
          className={`dp-feedback ${result.passed ? 'dp-passed' : 'dp-failed'}`}
          role="status"
        >
          <div className="dp-feedback-banner">
            <strong>{result.passed ? '🎉 All checks passed!' : 'Not yet — inspect the feedback below.'}</strong>
            {result.rows?.length > 0 && (
              <span>
                {result.rows.filter(r => r.passed).length} of {spec.cases.length} checks passed.
              </span>
            )}
          </div>

          {result.error && <pre className="dp-error-log">{result.error}</pre>}

          {result.rows?.length > 0 && (
            <ol className="dp-test-results">
              {result.rows.map((row, i) => (
                <li key={i} className={`dp-test-row ${row.passed ? 'is-pass' : 'is-fail'}`}>
                  <div className="dp-test-summary">
                    <span className="dp-test-icon">{row.passed ? '✓' : '✗'}</span>
                    <span>Case {i + 1}</span>
                    {!row.passed && (
                      <button type="button" className="dp-run-this" onClick={() => setRunArgs(argsText(spec.cases[i].args))}>
                        Put this input in the Run box
                      </button>
                    )}
                  </div>
                  {!row.passed && (
                    <pre className="dp-test-diff">
                      Input: {short(spec.cases[i].args)}{'\n'}
                      Expected: {short(spec.cases[i].expected)}{'\n'}
                      {row.error ? `Error: ${row.error}` : `Returned: ${row.actual}`}
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          )}

          {result.output && (
            <details className="dp-stdout-details">
              <summary>Console output</summary>
              <pre>{result.output}</pre>
            </details>
          )}
        </div>
      )}

      {EXPLAINED[lesson.id] && <Explained entry={EXPLAINED[lesson.id]} language={language} attempted={attempted} />}

      <p className="dp-muted">
        Solve the challenge in either language or practice both! Passing checks verifies the cases;
        use the lesson’s invariant and recurrence proof to explain why your solution generalizes.
      </p>
    </section>
  )
}
