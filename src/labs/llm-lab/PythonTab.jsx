import SharedPythonTab, { show } from '../python-steps/PythonTab.jsx'
import Plot from '../cartpole-lab/figures/Plot.jsx'
import { plain } from '../a-arcade-python/analysis.js'
import * as src from './source.js'
import * as notes from './lineNotes.js'
import { FUNCTIONS, VARS } from './functions.js'
import { PROGRAMS } from './programs.js'
import { lessonById } from './lessons/index.js'

// The shared Python tab (python-steps/PythonTab.jsx) with this lab's programs and pictures.
export { show }

function Picture({ program, view }) {
  if (!view) return <p className="qm-hint">Press Load to start. The picture is drawn from the paused program's own values.</p>
  const losses = plain(view?.watch?.losses?.value)
  if (program.picture === 'losses' && Array.isArray(losses) && losses.length > 1) return <><h4>Loss after each step</h4><Plot series={[{ values: losses, color: '#1f6f68' }]} window={20} x="step" label="loss" height={150} /></>
  return <p className="qm-hint">This program prints its result: see the output below.</p>
}

const LAB = {
  src, notes, FUNCTIONS, VARS, PROGRAMS, lessonById, Picture,
  fileOrder: ['gpt.py', 'arith.py', 'pretrain.py', 'generate.py'],
  labReceiver: /^$/,
  intro: 'The lessons and figures run the same code in the browser, number for number.',
}

export default function PythonTab(props) {
  return <SharedPythonTab lab={LAB} {...props} />
}
