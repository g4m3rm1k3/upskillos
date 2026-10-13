import SharedPythonTab, { show } from '../python-steps/PythonTab.jsx'
import Plot from '../cartpole-lab/figures/Plot.jsx'
import { plain } from '../a-arcade-python/analysis.js'
import * as src from './source.js'
import * as notes from './lineNotes.js'
import { FUNCTIONS, VARS } from './functions.js'
import { PROGRAMS } from './programs.js'
import { lessonById } from './lessons/index.js'
import { FEATURE_NAMES } from './engine/game.js'
import { DiceRow, Bars } from './figures/ui.jsx'

// The shared Python tab (python-steps/PythonTab.jsx) with this lab's programs and pictures: the
// paused program's hand as dice, its exact learning curve, its chase distribution or its weights.
export { show }

function Picture({ program, view }) {
  const watched = k => plain(view?.watch?.[k]?.value)
  if (!view) return <p className="qm-hint">Press Load to start. The picture is drawn from the paused program's own values.</p>
  const hand = watched('hand')
  const dice = Array.isArray(hand) && hand.length && hand.every(d => d >= 1 && d <= 6) ? <DiceRow dice={hand} /> : null
  if (program.picture === 'curve') {
    const curve = watched('curve')
    return <>{dice}{Array.isArray(curve) && curve.length > 0 ? <><h4>Exact expected score of the greedy policy</h4><Plot series={[{ values: curve, color: '#1f6f68' }]} window={1} x="grade" label="exact grade" height={130} /></> : <p className="qm-hint">The exact grade appears after the first {program.kwargs().every} turns.</p>}</>
  }
  if (program.picture === 'dist') {
    const dist = watched('dist')
    return Array.isArray(dist) ? <Bars max={0.6} digits={4} rows={[1, 2, 3, 4, 5].map(k => ({ label: `biggest group ${k}`, value: dist[k] ?? 0, mark: k === 5 }))} /> : null
  }
  if (program.picture === 'weights') {
    const weights = watched('weights')
    return Array.isArray(weights) ? <Bars digits={2} rows={weights.map((w, i) => ({ label: FEATURE_NAMES[i], value: w }))} /> : null
  }
  return dice ?? <p className="qm-hint">This program prints its result: see the output below.</p>
}

const LAB = {
  src, notes, FUNCTIONS, VARS, PROGRAMS, lessonById, Picture,
  fileOrder: ['dice.py', 'scoring.py', 'probability.py', 'simulate.py', 'turn.py', 'exact.py', 'learn.py', 'game.py', 'players.py', 'stats.py', 'afterstate.py'],
  labReceiver: /^(player|planner|self)$/,
  intro: 'The lessons, the Table and the Workshop run the same arithmetic in the browser, with the same dice.',
}

export default function PythonTab(props) {
  return <SharedPythonTab lab={LAB} {...props} />
}
