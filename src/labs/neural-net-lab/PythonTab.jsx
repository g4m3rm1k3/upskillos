import SharedPythonTab, { show } from '../python-steps/PythonTab.jsx'
import Plot from '../cartpole-lab/figures/Plot.jsx'
import XYPlot from './figures/XYPlot.jsx'
import { plain } from '../a-arcade-python/analysis.js'
import * as src from './source.js'
import * as notes from './lineNotes.js'
import { FUNCTIONS, VARS } from './functions.js'
import { PROGRAMS } from './programs.js'
import { lessonById } from './lessons/index.js'
import { forward } from './engine/part1.js'
import { predictProb } from './engine/part2.js'
import PlanePlot from './figures/PlanePlot.jsx'

// The shared Python tab (python-steps/PythonTab.jsx) with this lab's programs and pictures: the
// points and the paused program's line or network drawn through them, and its error so far.
export { show }

function Picture({ program, view }) {
  const watched = k => plain(view?.watch?.[k]?.value)
  const xs = watched('xs'), ys = watched('ys'), history = watched('history')
  const points = Array.isArray(xs) && Array.isArray(ys) ? xs.map((x, i) => [x, ys[i]]) : []
  const curve = Array.isArray(history) && history.length > 1 && <><h4>Error after each step</h4><Plot series={[{ values: history.map(h => Math.min(h, 60)), color: '#1f6f68' }]} window={1} x="step" label="error" height={130} /></>
  if (!view) return <p className="qm-hint">Press Load to start. The picture is drawn from the paused program's own values.</p>
  if (program.picture === 'line') {
    const w = watched('w'), b = watched('b')
    return <><XYPlot points={points} x={[0, 5]} y={[-1, 13]} curves={typeof w === 'number' ? [{ f: x => w * x + b }] : []} misses={typeof w === 'number' ? points.map(([x, y]) => [x, y, w * x + b]) : null} />{curve}</>
  }
  if (program.picture === 'curve') {
    const net = watched('net')
    const ok = net && Array.isArray(net.w1)
    return <><XYPlot points={points} x={[-3, 3]} y={[-2, 2]} curves={ok ? [{ f: x => forward(net, x).yHat }] : []} />{curve}</>
  }
  if (program.picture === 'plane') {
    const w = watched('w'), b = watched('b'), pts = watched('points'), labels = watched('labels')
    const ok = Array.isArray(w) && typeof b === 'number'
    return <><PlanePlot points={Array.isArray(pts) ? pts : []} labels={Array.isArray(labels) ? labels : []} prob={ok && (w[0] || w[1] || b) ? pt => predictProb(w, b, pt) : null} x={[-3, 3]} y={[-3, 3]} size={300} />{curve}</>
  }
  return <>{curve || <p className="qm-hint">This program prints its result: see the output below.</p>}</>
}

const LAB = {
  src, notes, FUNCTIONS, VARS, PROGRAMS, lessonById, Picture, dataFiles: src.DATA_FILES,
  fileOrder: ['data.py', 'neuron.py', 'layer.py', 'tinynet.py', 'torch_net.py', 'cars.py', 'points2d.py', 'logistic.py', 'torch_classify.py', 'tumours.py', 'metrics.py', 'softmax.py', 'iris.py', 'torch_iris.py', 'digits.py', 'mnist.py', 'mnist_net.py', 'preprocess.py'],
  labReceiver: /^$/,
  intro: 'The lessons and the Model Studio run the same arithmetic in the browser.',
}

export default function PythonTab(props) {
  return <SharedPythonTab lab={LAB} {...props} />
}
