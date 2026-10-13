// The programs the Python tab can run: each an entry function in python/ with JSON arguments (see
// python-steps/PythonTab.jsx for what each field does).
import { SOURCES } from './source.js'

const lineOf = (file, text) => SOURCES[file].split('\n').findIndex(l => l.includes(text)) + 1
const KART = { kart: ['state'] }

export const PROGRAMS = {
  lap: {
    label: '1.1 One lap, careful driver', file: 'drivers.py', module: 'drivers', function: 'try_careful',
    about: 'The careful driver over 3 held-out laps: every step goes through kart.py\'s `step`.',
    kwargs: () => ({ laps: 3 }), watch: KART, picture: 'kart', actions: ['state = step(state, policy(state, cars, track), track, cars)'], actionLabel: 'Next move', actionTitle: 'Run until the kart has moved once',
    episodeEnd: () => [['drivers.py', lineOf('drivers.py', 'finished += 1 if state["finished"] else 0')]], endLabel: 'Next lap',
  },
  rules: {
    label: '1.6 Measure the careful driver', file: 'drivers.py', module: 'drivers', function: 'try_careful',
    about: '30 held-out laps with the careful rule: its finish rate and collisions per lap.',
    kwargs: () => ({ laps: 30 }), watch: KART, picture: 'kart', actions: [], episodeEnd: () => [['drivers.py', lineOf('drivers.py', 'finished += 1 if state["finished"] else 0')]], endLabel: 'Next lap',
  },
  train: {
    label: '3.4 Train Q-learning', file: 'tabular.py', module: 'tabular', function: 'train',
    about: 'Q-learning with the sector observation, 300 practice laps: each lap learns after every move.',
    kwargs: () => ({ config: { episodes: 300, seed: 19 } }), watch: { kart: ['state'], totals: ['totals'] }, picture: 'totals',
    actions: ['values[action] = before + alpha * (target - before)'], actionLabel: 'Next update', actionTitle: 'Run until the next value is updated',
    episodeEnd: () => [['tabular.py', lineOf('tabular.py', 'totals.append(state["total"])')]], endLabel: 'Next lap',
  },
  maxbias: {
    label: '3.6 Maximisation bias', file: 'maxbias.py', module: 'maxbias', function: 'left_rate',
    about: '200 runs of the two-state problem with Q-learning: how often each episode goes Left.',
    kwargs: () => ({ method: 'q', runs: 200, episodes: 100 }), choices: { method: ['q', 'double'] }, watch: {}, picture: null, actions: [], episodeEnd: () => [],
  },
  linear: {
    label: '4.3 Train the linear driver', file: 'linear.py', module: 'linear', function: 'train',
    about: 'Semi-gradient Q-learning on 15 sensor features: 300 practice laps.',
    kwargs: () => ({ episodes: 300, seed: 19 }), knobs: [['alpha', 'α']], watch: { kart: ['state'], weights: ['weights'] }, picture: 'weights',
    actions: ['weights[action][i] += alpha * error * x[i]'], actionLabel: 'Next weight', actionTitle: 'Run until the next weight changes',
    episodeEnd: () => [['linear.py', lineOf('linear.py', 'state, x = next_state, next_x')]], endLabel: 'Next move',
  },
  race: {
    label: '5.2 A tournament', file: 'race.py', module: 'race', function: 'lane_draw',
    about: 'Three identical careful drivers in all six starting orders: the race engine in plain Python, and what the lane draw alone does.',
    kwargs: () => ({}), watch: { race: ['race'] }, picture: null, actions: [], episodeEnd: () => [],
  },
}
