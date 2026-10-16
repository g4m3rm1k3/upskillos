import React, { useState } from 'react'

export function traceSum(n) {
  const events = [{ stack: [], message: `Start sumTo(${n}).`, result: null }]
  const stack = []
  function visit(k) {
    stack.push(k)
    events.push({ stack: [...stack], message: `Call sumTo(${k}). ${k === 0 ? 'The base case returns 0.' : `Keep ${k} in this frame and ask for sumTo(${k - 1}).`}`, result: null })
    const result = k === 0 ? 0 : k + visit(k - 1)
    stack.pop()
    events.push({ stack: [...stack], message: `Return ${result} from sumTo(${k}). ${stack.length ? `Resume sumTo(${stack.at(-1)}).` : 'The caller receives the final answer.'}`, result: stack.length ? null : result })
    return result
  }
  visit(n)
  return events
}

const code = {
  Python: 'def sum_to(n):\n    if n == 0:\n        return 0\n    return n + sum_to(n - 1)',
  JavaScript: 'function sumTo(n) {\n  if (n === 0) return 0;\n  return n + sumTo(n - 1);\n}',
}
const hints = ['A frame is still alive while it waits for a smaller call.', 'Does the call for zero need its own frame?', 'Trace sumTo(1) on paper. Separate the returned value from the number of calls.']

export default function RecursionLesson() {
  const [language, setLanguage] = useState('Python')
  const [n, setN] = useState(3)
  const [step, setStep] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [hintCount, setHintCount] = useState(0)
  const events = traceSum(n)
  const event = events[step]
  return <div className="dp-authored">
    <section><p className="dp-eyebrow">01 / CONCEPT WALKTHROUGH</p><h3>A call is a promise to return an answer</h3>
      <p>Prerequisites: variables, functions, addition, and an if statement. By the end, you will distinguish a call’s input, its saved work, and its return value.</p>
      <p>Imagine adding the numbers from 1 to 3. You can keep 3 aside and ask someone else for the sum from 1 to 2. They keep 2 aside and ask for the sum from 1 to 1. Each person remembers their unfinished addition. A <strong>stack frame</strong> is the computer’s record of that unfinished call.</p>
      <p><strong>State:</strong> sumTo(n) means the sum of all integers from 1 through n, for a nonnegative integer n. The empty sum is 0. For n &gt; 0, the answer is n + sumTo(n − 1). Each call reduces n, so it eventually reaches zero.</p>
      <fieldset className="dp-language"><legend>Read the example in</legend>{Object.keys(code).map(lang => <label key={lang}><input type="radio" name="recursion-language" checked={language === lang} onChange={() => setLanguage(lang)} />{lang}</label>)}</fieldset>
      <pre>{code[language]}</pre>
      <p><strong>Why it works:</strong> the base case correctly sums no numbers. If the smaller call sums 1 through n − 1 correctly, adding n gives precisely 1 through n. Calls descend toward zero; answers return in the reverse order.</p>
      <p><strong>Cost:</strong> n + 1 calls each do constant work, so time and maximum stack space are O(n). Real runtimes limit stack depth; this example uses small inputs. This is recursion, but it does not yet benefit from memoization: no input is repeated. DP becomes useful when different branches ask for the same subproblem.</p>
    </section>
    <section aria-label="Worked call stack"><p className="dp-eyebrow">02 / WORKED EXAMPLE</p><h3>Watch calls pause and resume</h3>
      <label>Example input <select aria-label="Example input" value={n} onChange={e => { setN(Number(e.target.value)); setStep(0) }}>{[0, 1, 2, 3, 4, 5].map(value => <option key={value}>{value}</option>)}</select></label>
      <p>Stack shown oldest to newest. The last frame is active; earlier frames are waiting.</p>
      <ol className="dp-stack" aria-label="Stack frames">{event.stack.map((k, i) => <li key={k} aria-current={i === event.stack.length - 1 ? 'step' : undefined}><code>sumTo({k})</code><span>{i === event.stack.length - 1 ? 'Active' : `Waiting to add ${k}`}</span></li>)}</ol>
      {!event.stack.length && <p>No active frames.</p>}
      <p role="status">Step {step} of {events.length - 1}: {event.message}</p>
      {event.result !== null && <p><strong>Result: {event.result}</strong></p>}
      <div className="dp-trace-controls"><button disabled={step === 0} onClick={() => setStep(step - 1)}>Previous step</button><button disabled={step === events.length - 1} onClick={() => setStep(step + 1)}>Next step</button><button onClick={() => setStep(0)}>Restart trace</button></div>
    </section>
    <section><p className="dp-eyebrow">03 / CHECK YOUR UNDERSTANDING</p><h3>Predict before tracing</h3>
      <p>For sumTo(4), what is the maximum number of frames alive at once? Count the initial call and the base-case call. This asks for stack depth, not the sum returned.</p>
      <form onSubmit={e => { e.preventDefault(); setFeedback(answer === '5' ? 'Correct. The live calls are 4, 3, 2, 1, and 0. Returning then removes one frame at a time.' : 'Not yet. Write down every input visited before the first return, including the base case.') }}><label>Maximum frames <input type="number" min="1" max="20" required value={answer} onChange={e => { setAnswer(e.target.value); setFeedback('') }} /></label><button>Check prediction</button></form>
      <p role="status">{feedback}</p>
      <button disabled={hintCount === hints.length} onClick={() => setHintCount(hintCount + 1)}>Reveal next hint</button><ol>{hints.slice(0, hintCount).map(hint => <li key={hint}>{hint}</li>)}</ol>
      <p className="dp-muted">This prediction check runs locally. Editable Python and JavaScript coding exercises are still coming soon; no code is executed here.</p>
    </section>
  </div>
}
