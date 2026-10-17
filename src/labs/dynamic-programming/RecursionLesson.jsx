import React, { useState } from 'react'
import CodeViewer from './CodeViewer.jsx'

export function traceSum(n) {
  const events = [{ stack: [], message: `Start sumTo(${n}).`, result: null }]
  const stack = []
  function visit(k) {
    stack.push(k)
    events.push({
      stack: [...stack],
      message: `Call sumTo(${k}). ${k === 0 ? 'The base case returns 0 immediately.' : `Keep ${k} in this frame and pause to evaluate sumTo(${k - 1}).`}`,
      result: null,
    })
    const result = k === 0 ? 0 : k + visit(k - 1)
    stack.pop()
    events.push({
      stack: [...stack],
      message: `Return ${result} from sumTo(${k}). ${stack.length ? `Resume caller sumTo(${stack.at(-1)}) to compute ${stack.at(-1)} + ${result} = ${stack.at(-1) + result}.` : 'All frames unwound — the caller receives the final answer.'}`,
      result: stack.length ? null : result,
    })
    return result
  }
  visit(n)
  return events
}

const CODE_EXAMPLES = {
  Python: `def sum_to(n):
    # Base case: empty sum is 0
    if n == 0:
        return 0
    # Recursive step: save n in this frame, wait for sum_to(n - 1)
    return n + sum_to(n - 1)`,
  JavaScript: `function sumTo(n) {
  // Base case: empty sum is 0
  if (n === 0) return 0;
  // Recursive step: save n in this frame, wait for sumTo(n - 1)
  return n + sumTo(n - 1);
}`,
}

const HINTS = [
  'A frame is still alive while it waits for a smaller call.',
  'Does the call for zero need its own frame?',
  'Trace sumTo(1) on paper. Separate the returned value from the number of calls.',
]

export default function RecursionLesson({ practiceAvailable = false, onStartChallenge }) {
  const [language, setLanguage] = useState('Python')
  const [n, setN] = useState(3)
  const [step, setStep] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [hintCount, setHintCount] = useState(0)

  const events = traceSum(n)
  const event = events[step] || events[0]
  const maxStackDepth = n + 1

  return (
    <div className="dp-authored dp-recursion-lesson">
      <section className="dp-concept-card">
        <p className="dp-eyebrow">01 / CONCEPT WALKTHROUGH</p>
        <h3>A call is a promise to return an answer</h3>
        <p className="dp-lead-p">
          Prerequisites: variables, functions, addition, and conditional branching. By the end, you will
          distinguish a function call’s input, its saved stack frame, and its returned value.
        </p>

        <div className="dp-intuition-box">
          <p>
            Imagine calculating <code>1 + 2 + 3</code>. You keep <code>3</code> aside and ask for the sum from <code>1</code> to <code>2</code>.
            That helper keeps <code>2</code> aside and asks for <code>1</code>. The request for <code>1</code> asks for <code>0</code> (the empty sum), which immediately returns <code>0</code>.
            Nothing has been added back yet! Each helper remembers their own unfinished addition. A <strong>stack frame</strong> is the computer’s record of that unfinished work.
          </p>
        </div>

        <div className="dp-spec-grid">
          <div>
            <strong>State definition</strong>
            <p><code>sumTo(n)</code> = sum of all integers from 1 through n, for an integer n ≥ 0.</p>
          </div>
          <div>
            <strong>Recurrence relation</strong>
            <p><code>sumTo(0) = 0</code>; <code>sumTo(n) = n + sumTo(n − 1)</code> for n &gt; 0.</p>
          </div>
        </div>

        <fieldset className="dp-language">
          <legend>Read the example in</legend>
          {Object.keys(CODE_EXAMPLES).map(lang => (
            <label key={lang} className={language === lang ? 'is-active' : ''}>
              <input
                type="radio"
                name="recursion-language"
                checked={language === lang}
                onChange={() => setLanguage(lang)}
              />
              {lang}
            </label>
          ))}
        </fieldset>

        <CodeViewer
          code={CODE_EXAMPLES[language]}
          language={language}
          filename={language === 'Python' ? 'sum_to.py' : 'sumTo.js'}
          showLineNumbers={true}
        />

        <div className="dp-analysis-cards">
          <div className="dp-why-card">
            <strong>Why it works</strong>
            <p>
              The base case correctly returns 0 for the empty sum. If the smaller call <code>sumTo(n − 1)</code> is correct,
              adding <code>n</code> produces exactly the sum of 1 through n. Each step reduces n by 1, guaranteeing termination.
            </p>
          </div>
          <div className="dp-cost-card">
            <strong>Time and space complexity</strong>
            <p>
              <code>n + 1</code> calls each perform O(1) work. Time is <strong>O(n)</strong> and maximum call stack depth is <strong>O(n)</strong>.
              Calls descend sequentially; answers return in reverse order.
            </p>
          </div>
        </div>
      </section>

      <section className="dp-trace-section" aria-label="Worked call stack">
        <div className="dp-section-heading">
          <div>
            <p className="dp-eyebrow">02 / WORKED EXAMPLE · INTERACTIVE CALL STACK</p>
            <h3>Watch calls pause and resume</h3>
          </div>
          <span className="dp-step-counter">
            Step {step} of {events.length - 1}
          </span>
        </div>

        <div className="dp-trace-toolbar">
          <label className="dp-input-picker">
            <span>Example input</span>
            <select
              aria-label="Example input"
              value={n}
              onChange={e => {
                setN(Number(e.target.value))
                setStep(0)
              }}
            >
              {[0, 1, 2, 3, 4, 5].map(value => (
                <option key={value} value={value}>
                  n = {value}
                </option>
              ))}
            </select>
          </label>
          <div className="dp-trace-controls">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep(s => s - 1)}
            >
              Previous step
            </button>
            <button
              type="button"
              className="dp-btn-primary-sm"
              disabled={step === events.length - 1}
              onClick={() => setStep(s => s + 1)}
            >
              Next step
            </button>
            <button
              type="button"
              onClick={() => setStep(0)}
            >
              Restart trace
            </button>
          </div>
        </div>

        <div className="dp-callstack-display">
          <div className="dp-stack-header">
            <span>Call Stack (deepest / newest at bottom)</span>
            <span className="dp-stack-metric">
              {event.stack.length} live frame{event.stack.length === 1 ? '' : 's'} (max {maxStackDepth})
            </span>
          </div>

          <ol className="dp-stack" aria-label="Stack frames">
            {event.stack.map((k, i) => {
              const isActive = i === event.stack.length - 1
              const isBase = k === 0
              return (
                <li
                  key={`${k}-${i}`}
                  aria-current={isActive ? 'step' : undefined}
                  className={`dp-frame ${isActive ? 'is-active' : 'is-waiting'} ${isBase ? 'is-base' : ''}`}
                >
                  <div className="dp-frame-left">
                    <span className="dp-frame-depth">#{i + 1}</span>
                    <code>sumTo({k})</code>
                  </div>
                  <div className="dp-frame-right">
                    <span className="dp-frame-badge">
                      {isActive
                        ? isBase
                          ? 'Base case (returns 0)'
                          : 'Active call'
                        : `Paused: waiting to add ${k}`}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>

          {!event.stack.length && (
            <div className="dp-stack-empty">
              <p>No active frames.</p>
            </div>
          )}
        </div>

        <div className="dp-trace-event-box" role="status">
          <p className="dp-event-message">
            <strong>Action:</strong> {event.message}
          </p>
          {event.result !== null && (
            <div className="dp-result-banner">
              <strong>Result: {event.result}</strong>
              <span>✓ All frames resolved successfully</span>
            </div>
          )}
        </div>
      </section>

      <section className="dp-prediction-section">
        <p className="dp-eyebrow">03 / CHECK YOUR UNDERSTANDING</p>
        <h3>Predict before tracing</h3>
        <p>
          For <code>sumTo(4)</code>, what is the maximum number of frames alive at once? Count the initial call and the base-case call.
          This asks for maximum stack depth, not the final sum returned.
        </p>

        <form
          className="dp-prediction-form"
          onSubmit={e => {
            e.preventDefault()
            setFeedback(
              answer === '5'
                ? 'Correct. The live calls are 4, 3, 2, 1, and 0. Returning then removes one frame at a time.'
                : 'Not yet. Write down every input visited before the first return, including the base case.'
            )
          }}
        >
          <label className="dp-spin-label">
            <span>Maximum frames</span>
            <input
              type="number"
              min="1"
              max="20"
              required
              aria-label="Maximum frames"
              value={answer}
              onChange={e => {
                setAnswer(e.target.value)
                setFeedback('')
              }}
            />
          </label>
          <button type="submit" className="dp-btn-check">
            Check prediction
          </button>
        </form>

        {feedback && (
          <p
            role="status"
            className={`dp-prediction-feedback ${feedback.startsWith('Correct') ? 'is-correct' : 'is-error'}`}
          >
            {feedback}
          </p>
        )}

        <div className="dp-hint-toolbar">
          <button
            type="button"
            className="dp-hint-toggle"
            disabled={hintCount === HINTS.length}
            onClick={() => setHintCount(c => c + 1)}
          >
            {hintCount === HINTS.length ? 'All hints revealed' : 'Reveal next hint'}
          </button>
          {hintCount > 0 && (
            <ol className="dp-revealed-hints">
              {HINTS.slice(0, hintCount).map(hint => (
                <li key={hint}>{hint}</li>
              ))}
            </ol>
          )}
        </div>

        <div className="dp-section-footer">
          <p className="dp-muted">
            {practiceAvailable
              ? 'This prediction check verifies your mental model of the call stack. Continue to the Coding Challenge to write and run your own solution in Python or JavaScript.'
              : 'This prediction check runs locally. Editable Python and JavaScript coding exercises are available in the practice stage.'}
          </p>
          {onStartChallenge && (
            <button type="button" className="dp-primary" onClick={onStartChallenge}>
              Try the independent coding challenge →
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
