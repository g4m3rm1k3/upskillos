import { useState } from 'react'
import { ACTIONS } from './engine/kart.js'
import { Sensors } from './Arena.jsx'
// The last practice lap of a run, update by update: the values before the action, the reward, the
// target and the changed value, exactly as they were at that moment.
export default function Trace({ trace, config }) {
  const [index, setIndex] = useState(0)
  if (!trace?.length) return null
  const t = trace[Math.min(index, trace.length - 1)], model = { kind: 'table', view: config.view, tables: config.method === 'double' ? [0, 1] : [0] }
  return <section className="qm-fig kl-save"><span className="qm-eyebrow">EXPERIENCE → TARGET → UPDATE</span><h2>Inside the last practice lap</h2><p>Recorded while training. Scrubbing doesn't rerun or change anything.</p>
    <label>Decision {index + 1} of {trace.length}<input aria-label="Training decision" type="range" min="0" max={trace.length - 1} value={index} onChange={e => setIndex(Number(e.target.value))} /></label>
    <div className="qm-buttons"><button disabled={index === 0} onClick={() => setIndex(i => i - 1)}>Previous update</button><button disabled={index === trace.length - 1} onClick={() => setIndex(i => i + 1)}>Next update</button></div>
    <div className="kl-inspector"><div><h3>Before the action</h3><Sensors car={t.state} traffic={t.cars} qValues={t.qBefore} model={model} /><p>Chosen action: <b>{ACTIONS[t.action]}</b> · ε = {t.epsilon.toFixed(3)}.</p></div>
      <div><h3>The move and its update</h3><p>Key {t.key} → <b>{t.nextKey}</b> · {t.next.done ? (t.next.finished ? 'finished' : 'lap over') : 'continuing'}</p><p>Reward = <b>{t.next.last.reward.toFixed(2)}</b>{t.next.last.hit ? ` (hit a ${t.next.last.hit})` : ''}.</p>
        <dl className="kl-rewards">{Object.entries(t.next.last.parts).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v.toFixed(2)}</dd></div>)}</dl>
        <div className="kl-calculation"><p>Updating table <b>{t.learning.table}</b>, action <b>{ACTIONS[t.action]}</b>.</p><p>Target = {t.next.last.reward.toFixed(2)} + {config.gamma} × {t.learning.future.toFixed(3)} = <b>{t.learning.target.toFixed(3)}</b></p><p>New Q = {t.learning.before.toFixed(3)} + {config.alpha} × ({t.learning.target.toFixed(3)} − {t.learning.before.toFixed(3)}) = <b>{t.learning.after.toFixed(3)}</b></p></div>
        <p className="qm-hint">{t.next.done ? 'The lap ended: no future value.' : config.method === 'sarsa' ? `SARSA uses the next action chosen: ${ACTIONS[t.nextAction]}.` : config.method === 'double' ? `The updating table picks ${ACTIONS[t.learning.chosen]}; the other table values it.` : `Q-learning uses the best next action: ${ACTIONS[t.learning.chosen]}.`} Numbers are rounded for display.</p>
      </div></div>
  </section>
}
