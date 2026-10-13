import SharedPythonTab, { show } from '../python-steps/PythonTab.jsx'
import Plot from '../cartpole-lab/figures/Plot.jsx'
import { plain } from '../a-arcade-python/analysis.js'
import * as src from './source.js'
import * as notes from './lineNotes.js'
import { FUNCTIONS, VARS } from './functions.js'
import { PROGRAMS } from './programs.js'
import { lessonById } from './lessons/index.js'
import { SUNLIT } from './engine/kart.js'
import { FEATURE_NAMES } from './engine/tabular.js'
import { RoadView, Bars } from './figures/ui.jsx'

// The shared Python tab (python-steps/PythonTab.jsx) with this lab's programs and pictures: the
// paused program's kart on the road, its practice rewards, or its linear weights.
export { show }

function Picture({ program, view }) {
  const watched = k => plain(view?.watch?.[k]?.value)
  if (!view) return <p className="qm-hint">Press Load to start. The picture is drawn from the paused program's own values.</p>
  const kart = watched('kart')
  const road = kart && typeof kart === 'object' && Number.isFinite(kart.p) ? <RoadView track={SUNLIT} state={{ ...kart, ticks: kart.ticks ?? 0 }} /> : null
  if (program.picture === 'totals') {
    const totals = watched('totals')
    return <>{road}{Array.isArray(totals) && totals.length > 1 ? <><h4>Practice reward per lap</h4><Plot series={[{ values: totals, color: '#1f6f68' }]} window={20} x="lap" label="practice reward" height={130} /></> : <p className="qm-hint">The curve appears after the first laps.</p>}</>
  }
  if (program.picture === 'weights') {
    const weights = watched('weights')
    return <>{road}{Array.isArray(weights) && weights.length === 5 ? <><h4>Accelerate's weights</h4><Bars rows={weights[3].map((w, i) => ({ label: FEATURE_NAMES[i], value: w }))} /></> : null}</>
  }
  return road ?? <p className="qm-hint">This program prints or returns its result: see the output below.</p>
}

const LAB = {
  src, notes, FUNCTIONS, VARS, PROGRAMS, lessonById, Picture,
  fileOrder: ['kart.py', 'observe.py', 'drivers.py', 'tabular.py', 'maxbias.py', 'linear.py', 'race.py'],
  labReceiver: /^$/,
  intro: 'The lessons, the race arena and the training tab run the same arithmetic in the browser, with the same random numbers.',
}

export default function PythonTab(props) {
  return <SharedPythonTab lab={LAB} {...props} />
}
