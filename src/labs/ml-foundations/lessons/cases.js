// Builders for check cases. Every expected answer is computed by the JavaScript engine (world.js),
// never typed by hand, and written in the form _ml_norm gives a Python answer: tuples as lists,
// tuple keys as "r,c", numbers rounded to 6 places. pieces.test.js proves the Python reference
// passes every case and each starter fails at least one.
import { unkey, makeRng, randomMaze, parseMap, openCells } from '../world.js'
import { norm } from '../runtime/checks.js'

export const pyText = text => `"""\n${text.trim()}\n"""`
export const cellList = k => unkey(k)
export const pyCellLit = k => `(${unkey(k).join(', ')})`

export const normMaze = maze => ({ rows: maze.rows, cols: maze.cols, cells: { ...maze.cells }, start: unkey(maze.start), goal: unkey(maze.goal) })
export const normMoves = moves => Object.fromEntries(Object.entries(moves).map(([a, n]) => [a, unkey(n)]))
export const normOutcomes = outs => outs.map(([p, n, r]) => norm([p, unkey(n), r]))

// Python's repr of an outcome tuple, to sort the same way sorted(outs, key=repr) does.
const pyFloat = x => (Number.isInteger(x) ? `${x}.0` : String(x))
export const reprOutcome = ([p, n, r]) => `(${pyFloat(p)}, (${unkey(n).join(', ')}), ${pyFloat(r)})`
export const normSortedTable = table => Object.fromEntries(Object.entries(table).map(([cell, moves]) => [cell,
  Object.fromEntries(Object.entries(moves).map(([a, outs]) => [a, normOutcomes([...outs].sort((x, y) => (reprOutcome(x) < reprOutcome(y) ? -1 : reprOutcome(x) > reprOutcome(y) ? 1 : 0)))]))]))

// A few random solvable maps, the same every time (a fixed seed), so hard-coding answers fails.
export function randomMaps(seed, count = 3) {
  const rng = makeRng(seed)
  return Array.from({ length: count }, (_, i) => randomMaze(rng, 4 + (i % 3), 5 + ((i + 1) % 3)))
}

// Open cells of a map, picked evenly by a seeded generator.
export function someOpenCells(text, seed, count = 2) {
  const cells = openCells(parseMap(text))
  const rng = makeRng(seed)
  return Array.from({ length: count }, () => cells[Math.floor(rng.random() * cells.length)])
}
