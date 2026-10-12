import { useState } from 'react'
import game from './engine/game.js?raw'
import learning from './engine/learning.js?raw'
const NOTES = {
  observe: ['Encode the current observation', 'Sector identifies a location on this circuit. The lane and speed are zero-based. The mask summarizes nearby traffic; it does not reveal the other policies. Multiplying by each field’s range builds one unique table index for this tuple.'],
  step: ['Apply one driving action', 'This is the actual game transition used for training and racing. Lane and speed are bounded. Collisions reduce progress and reset speed. Reward components are kept separate so the inspector can explain them. A terminal transition is never updated again by the game.'],
  choose: ['Choose an action', 'Exploration chooses an action uniformly at random. Otherwise argmax chooses the largest learned value. In Double Q-learning, values() adds the two estimates. Races call this with epsilon zero.'],
  update: ['Learn from a transition', 'Q-learning maximizes the next row. SARSA uses nextAction, selected by the exploratory policy. Double Q selects with one table and evaluates with the other. Terminal transitions set bootstrap to zero. The last three lines form the target and move the old value toward it.'],
  trainEpisode: ['Collect experience and update', 'Each episode gets a sampled seed and an exploration rate. Observe and choose happen before step. The next action is chosen before learning, which is required by SARSA. The same transition then feeds update; the loop ends only when the game reports done.'],
}
export function snippet(name) {
  const source = name === 'observe' || name === 'step' ? game : learning
  const lines = source.split('\n'), start = lines.findIndex(l => l.startsWith(`export function ${name}(`))
  let end = start + 1
  if (!lines[start]?.endsWith(' }')) while (end < lines.length && lines[end] !== '}') end++
  else end = start
  return lines.slice(start, end + 1).map((text, i) => ({ text, n: start + i + 1 }))
}
export function SourceSnippet({ name }) {
  return <figure className="qm-code"><figcaption>{name === 'observe' || name === 'step' ? 'engine/game.js' : 'engine/learning.js'} · {name}()</figcaption><div className="qm-code-body">{snippet(name).map(l => <pre className="qm-code-line" key={l.n}><span className="qm-ln">{l.n}</span><code>{l.text}</code></pre>)}</div><div className="kl-source-note">{NOTES[name]?.[1]}</div></figure>
}
export default function Source() {
  const [name, setName] = useState('trainEpisode')
  return <article className="qm-lesson"><span className="qm-eyebrow">THE CODE THAT TRAINS YOUR DRIVER</span><h1>From game experience to a policy</h1><p>These are the JavaScript functions executed in this browser. The excerpts are read directly from the engine source, so the lesson and implementation stay together.</p><div className="qm-buttons">{Object.entries(NOTES).map(([id, [label]]) => <button key={id} className={id === name ? 'active' : ''} onClick={() => setName(id)}>{label}</button>)}</div><SourceSnippet name={name} /><p className="qm-hint">Training runs in a worker, without rendering the track. Race & watch loads the saved tables and uses the same observation, action selection and game transition. Source inspection is read-only in this version.</p></article>
}
