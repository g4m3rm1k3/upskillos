// python/gridworld.py in JavaScript, statement for statement, so the figures can replay what the
// Python program does with the same random numbers.
import { MAPS } from './maps.js'
import { PyRandom } from './mt.js'

export const LEFT = 0, UP = 1, RIGHT = 2, DOWN = 3
export const ACTION_NAMES = ['left', 'up', 'right', 'down']
export const ARROWS = ['←', '↑', '→', '↓']
export const MOVES = [[0, -1], [-1, 0], [0, 1], [1, 0]]

export class GridWorld {
  constructor(name, layout = MAPS[name]) {
    this.name = name
    this.rows = layout.rows
    this.nRows = this.rows.length
    this.nCols = this.rows[0].length
    this.nStates = this.nRows * this.nCols
    this.nActions = 4
    this.stepReward = layout.step
    this.bumpReward = layout.bump ?? layout.step
    this.revisitReward = layout.revisit ?? null
    this.intended = layout.intended ?? 1.0
    this.cells = layout.cells
    this.maxSteps = layout.max_steps ?? 100
    this.title = layout.title
    this.start = this.find('S')
    this.P = this.buildTransitions()
    this.rng = new PyRandom(0)
    this.state = this.start
  }

  toState(row, col) { return row * this.nCols + col }
  toCell(state) { return [Math.floor(state / this.nCols), state % this.nCols] }
  letter(state) { const [r, c] = this.toCell(state); return this.rows[r][c] }
  find(letter) {
    for (let r = 0; r < this.nRows; r++) for (let c = 0; c < this.nCols; c++) if (this.rows[r][c] === letter) return this.toState(r, c)
    return null
  }
  isEnd(state) { return this.cells[this.letter(state)]?.end ?? false }
  isWall(state) { return this.letter(state) === '#' }

  move(state, action) {
    const [row, col] = this.toCell(state), [dr, dc] = MOVES[action]
    const nr = row + dr, nc = col + dc
    const offGrid = !(nr >= 0 && nr < this.nRows && nc >= 0 && nc < this.nCols)
    if (offGrid || this.rows[nr][nc] === '#') return [state, this.bumpReward, false]
    const next = this.toState(nr, nc), rule = this.cells[this.letter(next)]
    if (!rule) return [next, this.stepReward, false]
    if (rule.to_start) return [this.start, rule.reward, false]
    return [next, rule.reward, rule.end ?? false]
  }

  buildTransitions() {
    const side = (1 - this.intended) / 2, P = []
    for (let s = 0; s < this.nStates; s++) {
      P[s] = []
      for (let a = 0; a < this.nActions; a++) {
        if (this.isEnd(s) || this.isWall(s)) P[s][a] = [[1.0, s, 0.0, true]]
        else if (this.intended === 1.0) P[s][a] = [[1.0, ...this.move(s, a)]]
        else P[s][a] = [[side, ...this.move(s, (a + 3) % 4)], [this.intended, ...this.move(s, a)], [side, ...this.move(s, (a + 1) % 4)]]
      }
    }
    return P
  }

  reset(seed = null) {
    if (seed !== null) this.rng.seed(seed)
    this.state = this.start
    this.steps = 0
    this.visited = new Set([this.start])
    return [this.state, {}]
  }

  step(action) {
    const outcomes = this.P[this.state][action]
    let u = this.rng.random(), pick = outcomes[outcomes.length - 1], k = outcomes.length - 1
    for (let i = 0; i < outcomes.length; i++) { u -= outcomes[i][0]; if (u < 0) { pick = outcomes[i]; k = i; break } }
    let [, next, reward, terminated] = pick
    if (this.revisitReward !== null && this.visited.has(next) && next !== this.state) reward = this.revisitReward
    this.visited.add(next)
    const from = this.state
    this.state = next
    this.steps += 1
    const truncated = this.steps >= this.maxSteps && !terminated
    this.last = { from, action, outcome: k, slipped: outcomes.length > 1 && k !== 1 }
    return [next, reward, terminated, truncated, {}]
  }
}
