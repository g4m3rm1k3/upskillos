import { useState } from 'react'
import { ACTIONS } from './engine/game.js'
import { Sensors } from './Arena.jsx'
export default function Trace({ trace, config }) {
  const [index, setIndex] = useState(0)
  if (!trace?.length) return null
  const t = trace[Math.min(index, trace.length - 1)]
  return <section className="qm-fig kl-save"><span className="qm-eyebrow">EXPERIENCE → TARGET → UPDATE</span><h2>Inside the final training lap</h2><p>This is recorded experience from the run above, including the values used at that moment. Scrubbing does not rerun or change the model.</p>
    <label>Training decision {index + 1} of {trace.length}<input aria-label="Training decision" type="range" min="0" max={trace.length - 1} value={index} onChange={e => setIndex(Number(e.target.value))} /></label>
    <div className="qm-buttons"><button disabled={index === 0} onClick={() => setIndex(i => i - 1)}>Previous update</button><button disabled={index === trace.length - 1} onClick={() => setIndex(i => i + 1)}>Next update</button></div>
    <div className="kl-inspector"><div><h3>Before the action</h3><Sensors car={t.state} traffic={t.traffic} qValues={t.qBefore} model={config.algorithm === 'double' ? { b: true } : undefined} /><p>Chosen action: <b>{ACTIONS[t.action]}</b> · exploration ε = {t.epsilon.toFixed(3)}.</p></div>
      <div><h3>The transition and its update</h3><p>State {t.key} → <b>{t.nextKey}</b> · {t.next.done ? (t.next.finished ? 'finished' : 'failed; episode ended') : 'continuing'}</p><p>Reward = <b>{t.next.last.reward.toFixed(2)}</b>{t.next.last.hit ? ' (collision)' : ''}.</p>
        <dl className="kl-rewards">{Object.entries(t.next.last.parts).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value.toFixed(2)}</dd></div>)}</dl>
        <div className="kl-calculation"><p>Updating table <b>{t.learning.table}</b>, action <b>{ACTIONS[t.action]}</b>.</p><p>Target = {t.next.last.reward.toFixed(2)} + {config.gamma} × {t.learning.bootstrap.toFixed(3)} = <b>{t.learning.target.toFixed(3)}</b></p><p>New Q = {t.learning.before.toFixed(3)} + {config.alpha} × ({t.learning.target.toFixed(3)} − {t.learning.before.toFixed(3)}) = <b>{t.learning.after.toFixed(3)}</b></p></div>
        <p className="qm-hint">{t.next.done ? 'The terminal transition has zero future value.' : config.algorithm === 'sarsa' ? `SARSA uses the next selected action: ${ACTIONS[t.nextAction]}.` : config.algorithm === 'double' ? `The updating table selects ${ACTIONS[t.learning.selected]}; the other table supplies its value.` : `Q-learning bootstraps from its best next action: ${ACTIONS[t.learning.selected]}.`} Displayed numbers are rounded; training uses full precision.</p>
      </div></div>
  </section>
}
