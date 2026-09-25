import { useState } from 'react'

const experiments = [
  { title: '1. A turn and its inverse', moves: ['R', "R'"], predict: 'After R, what could undo just that turn?', why: 'R′ turns the same layer back. An inverse undoes an action. The cube returns to the state it had before R.' },
  { title: '2. Four quarter-turns', moves: ['R', 'R', 'R', 'R'], predict: 'A full circle is 360°. How many 90° turns bring the right layer back?', why: 'Four × 90° = 360°. The smallest positive number of repetitions that restores the starting state is the move’s order: 4.' },
  { title: '3. Two half-turns', moves: ['R2', 'R2'], predict: 'R2 means 180°, not “turn two different faces”. How many half-turns make a full circle?', why: 'Two × 180° = 360°. R2 has order 2 and is its own inverse.' },
]

export default function FirstExperiments({ history, onReset, solved }) {
  const [active, setActive] = useState(null)
  const exp = experiments[active]
  const prefix = exp && history.every((move, i) => move === exp.moves[i])
  const complete = exp && prefix && history.length === exp.moves.length && solved
  return <section className="rubiks-guide" aria-label="Beginner experiments">
    <h3>Start with one layer, not a scramble</h3>
    <p>A face is one side of the cube. A turn moves its whole layer, including stickers on neighboring faces. Centers identify the faces; edges have two stickers and corners have three.</p>
    <p>Drag changes only your view. The labeled faces keep their names when you move the camera. Use the buttons to turn a layer. “Clockwise” means looking directly at that face from outside, like reading a clock on it.</p>
    <div>{experiments.map((e, i) => <button key={e.title} onClick={() => { onReset(); setActive(i) }} aria-pressed={active === i}>{e.title} (resets cube)</button>)}</div>
    {exp && <div role="status" aria-live="polite">
      <p><strong>Predict first:</strong> {exp.predict}</p>
      <p>Use the move buttons below, one at a time: <code>{exp.moves.join(' → ')}</code>. Watch the cube and the live unfolded net.</p>
      {complete ? <p><strong>Observed: back to solved.</strong> {exp.why} Explain in your own words why this worked before trying the next experiment.</p>
        : prefix ? <p>{history.length} of {exp.moves.length} turns completed. Next: <code>{exp.moves[history.length]}</code>.</p>
        : <p>You tried a different sequence. That is fine for exploring; select the experiment again to restart its comparison.</p>}
    </div>}
    <p>The math panel is optional next reading. These experiments teach moves and patterns; they are not yet a step-by-step method for solving any scramble.</p>
  </section>
}
