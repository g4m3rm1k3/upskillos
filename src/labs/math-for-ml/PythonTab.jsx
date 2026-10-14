import SharedPythonTab, { show } from '../python-steps/PythonTab.jsx'
import Plot from '../cartpole-lab/figures/Plot.jsx'
import { plain } from '../a-arcade-python/analysis.js'
import * as src from './source.js'
import * as notes from './lineNotes.js'
import { FUNCTIONS, VARS } from './functions.js'
import { PROGRAMS } from './programs.js'
import { lessonById } from './lessons/index.js'

// The shared Python tab (python-steps/PythonTab.jsx) with this lab's programs: the maths of each
// lesson as plain Python, one line at a time.
export { show }

function Picture({ program, view }) {
  if (!view) return <p className="qm-hint">Press Load to start. Values come from the paused program itself.</p>
  const path = plain(view?.watch?.path?.value)
  if (program.picture === 'path' && Array.isArray(path) && path.length > 1 && typeof path[0] === 'number') return <><h4>Gradient descent so far</h4><Plot series={[{ values: path, color: '#1f6f68' }]} window={1} x="step" label="position" height={130} /></>
  return <p className="qm-hint">This program prints its results: see the output below.</p>
}

const LAB = {
  src, notes, FUNCTIONS, VARS, PROGRAMS, lessonById, Picture,
  fileOrder: ['symbols.py', 'proof.py', 'calculus.py', 'linalg.py', 'matrices.py', 'stats.py', 'chance.py', 'optimise.py', 'algorithms.py', 'learners.py', 'deep.py', 'theory.py', 'models.py'],
  labReceiver: /^$/,
  intro: 'Every figure in the lessons runs the same arithmetic in the browser.',
}

export default function PythonTab(props) {
  return <SharedPythonTab lab={LAB} {...props} />
}
