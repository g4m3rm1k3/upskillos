import React, { useState } from 'react'
import Markdown from '../qmaze-lab/Markdown.jsx'
import { Choice, Predict } from './Blocks.jsx'

// Try it, as data: a lead paragraph, then steps shown one at a time. A step is
//   { md }                      text (shown with the next question)
//   { figure: Component, props } a picture or a toy to play with (shown with the next question)
//   { choice } / { predict }    a question with its `teach` ("What you need to know"); answering it
//                               (right, or "Show me the answer") unlocks the next step
//   { task: Component, props }  an interactive task that calls onDone when finished
// The whole sequence calls onDone when its last question or task is done.
export default function TrySequence({ spec, onDone, solved = [] }) {
  const groups = []
  let pending = []
  for (const step of spec.steps) {
    pending.push(step)
    if (step.choice || step.predict || step.task) { groups.push(pending); pending = [] }
  }
  if (pending.length) groups.push(pending)
  const [reached, setReached] = useState(0)
  const advance = k => {
    const next = Math.max(reached, k + 1)
    setReached(next)
    if (next >= groups.length) onDone()
  }
  return (
    <div className="mlf-try">
      {spec.lead && <div className="mlf-lead"><Markdown>{spec.lead}</Markdown></div>}
      {groups.slice(0, reached + 1).map((group, k) => (
        <div key={k} className="mlf-try-task">
          {group.map((step, i) => {
            if (step.md) return <div key={i} className="mlf-md"><Markdown>{step.md}</Markdown></div>
            if (step.figure) { const F = step.figure; return <F key={i} {...(step.props ?? {})} /> }
            if (step.choice) return <Choice key={i} spec={step.choice} done={solved.includes(step.choice.id)} onDone={() => advance(k)} />
            if (step.predict) return <Predict key={i} spec={step.predict} done={solved.includes(step.predict.id)} onDone={() => advance(k)} />
            if (step.task) { const T = step.task; return <T key={i} {...(step.props ?? {})} onDone={() => advance(k)} /> }
            return null
          })}
        </div>
      ))}
    </div>
  )
}

// Every question in a Try sequence (for the content tests).
export const tryQuestions = spec => (spec?.steps ?? []).flatMap(s => (s.choice ? [s.choice] : s.predict ? [s.predict] : []))
