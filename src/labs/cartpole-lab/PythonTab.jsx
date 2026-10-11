import SharedPythonTab, { show } from '../python-steps/PythonTab.jsx'
import Plot from './figures/Plot.jsx'
import { plain } from '../a-arcade-python/analysis.js'
import * as src from './source.js'
import * as notes from './lineNotes.js'
import { FUNCTIONS, VARS } from './functions.js'
import { PROGRAMS } from './programs.js'
import { lessonById } from './lessons/index.js'
import Cart from './figures/Cart.jsx'
import { LineView, NetView, QTableGrid, ReturnsView, WeightsView } from './figures/pictures.jsx'

// The shared Python tab (python-steps/PythonTab.jsx) with CartPole's programs and pictures: the cart
// drawn from the paused program's state, the Q-table, a policy's weights or a network.
export { show }

function Picture({ program, view, start }) {
  const watched = k => view?.watch?.[k]?.value
  const cartOf = v => { const p = plain(v); return Array.isArray(p) && p.length === 4 && p.every(x => typeof x === 'number') ? p : null }
  const cart = cartOf(watched('cart'))
  const lengths = plain(watched('lengths'))
  const curve = Array.isArray(lengths) && lengths.length > 1 && <><h4>Game lengths so far</h4><Plot series={[{ values: lengths, color: '#b5650d' }]} label="game lengths" /></>
  if (!view) return <Cart state={null} label="Press Load to start" />
  switch (program.picture) {
    case 'cart': return <Cart state={cart} label="the world, from the paused program" />
    case 'returns': return <>{cart && <Cart state={cart} compact />}<ReturnsView returns={plain(watched('returns'))} /></>
    case 'carts': {
      const states = plain(watched('states'))
      return <>{Array.isArray(states) && <div className="cp-carts">{states.map((s, i) => <Cart key={i} state={Array.isArray(s) && s.length === 4 ? s : null} height={130} label={`world ${i}`} compact />)}</div>}
        <NetView net={watched('net')} start={start?.watch?.net?.value} />{curve}</>
    }
    case 'qtable': {
      const Q = plain(watched('Q')), top = view.stack.at(-1)
      const here = top?.locals?.state?.t === 'int' ? top.locals.state.v : null
      return <>{cart && <Cart state={cart} height={150} />}<QTableGrid Q={Q} here={here} />{curve}</>
    }
    case 'weights': return <>{cart && <Cart state={cart} height={150} />}<WeightsView weights={plain(watched('weights'))} />{curve}</>
    case 'network': return <>{cart && <Cart state={cart} height={150} />}<NetView net={watched('net')} start={start?.watch?.net?.value} />{curve}</>
    case 'line': return <LineView w={plain(watched('w'))} b={plain(watched('b'))} />
    default: return <p className="qm-hint">This program prints its result: see the output below.</p>
  }
}

const LAB = {
  src, notes, FUNCTIONS, VARS, PROGRAMS, lessonById, Picture,
  fileOrder: ['experiments.py', 'policies.py', 'cartpole.py', 'returns.py', 'gym_compare.py', 'bins.py', 'qlearning.py', 'sarsa.py', 'choosing.py', 'evaluate.py',
    'neuron.py', 'linear_policy.py', 'torch_neuron.py', 'reinforce.py', 'a2c.py', 'a2c_check.py', 'dqn.py'],
  // The names the programs give their own objects (see callsOn in the shared tab).
  labReceiver: /(^|\.)(env|envs\[i\]|world|ours|self|buffer)$/,
  intro: 'Lessons and the Playground run the same algorithms in the browser, with Python\'s own random numbers.',
}

export default function PythonTab(props) {
  return <SharedPythonTab lab={LAB} {...props} />
}
