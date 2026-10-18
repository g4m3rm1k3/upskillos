// The Python is the truth: these tests run it on real Pyodide.
//  - every challenge's reference solution passes all its cases, and its starter fails at least one
//  - every step-through ends with the answer the real Python function gives, on the lesson maps
//    and on random ones, and every line a trace points at exists
//  - the finished program in lesson 0 runs and learns a route to the cheese
import { beforeAll, describe, expect, it } from 'vitest'
import { loadPyodide } from 'pyodide'
import { runPythonCases, runPythonScratch, norm } from './runtime/checks.js'
import { prelude, lensPrelude, PIECES, PIECE_ORDER, FINISH, FINISH_TAGS, CONSTANTS } from './python/pieces.js'
import { traceProgram } from './codelens.js'
import { LESSONS } from './lessons/index.js'
import { traceParseMap, traceLegalMoves, traceBuildTable, tracePlayEpisode, traceTrainEpisode } from './traces.js'
import { TINY, SMALL, SEVEN, parseMap, buildTable, openCells, makeRng, randomMaze, ACTIONS, unkey, legalMoves } from './world.js'
import { normMaze, normMoves, normOutcomes, pyText, pyCellLit } from './lessons/cases.js'
import { shortestPlan, diceRolls } from './lessons/episodes.jsx'

let py
beforeAll(async () => { py = await loadPyodide() }, 180000)

const challenges = Object.values(LESSONS).flatMap(l => l.challenges)
const allPieces = PIECE_ORDER

// What the Python reference returns for a call, normalized, as a JavaScript value.
// (The repr of a JSON string is that JSON in single quotes; the data here has no quotes or newlines.)
async function value(call, uses = allPieces) {
  const r = await runPythonScratch(py, { prelude: prelude(uses), code: 'import json', call: `json.dumps(_ml_norm(${call}), sort_keys=True)` })
  if (r.error) throw new Error(r.error)
  return JSON.parse(r.returned.slice(1, -1))
}

describe('challenges', () => {
  it('every challenge has cases, hints, a starter and a solution', () => {
    expect(challenges.length).toBeGreaterThanOrEqual(9)
    for (const c of challenges) {
      expect(c.cases.length, c.id).toBeGreaterThanOrEqual(3)
      expect(c.hints.length, c.id).toBeGreaterThanOrEqual(2)
      expect(c.starter.length, c.id).toBeGreaterThan(20)
      expect(c.solution.length, c.id).toBeGreaterThan(20)
      if (c.piece) expect(PIECES[c.piece], c.id).toBeTruthy()
      for (const u of c.uses) expect(PIECES[u], `${c.id} uses ${u}`).toBeTruthy()
    }
  })
  for (const c of challenges) {
    it(`${c.id}: the lab's solution passes every case`, async () => {
      const toolbox = c.uses.filter(p => p !== c.piece)
      const r = await runPythonCases(py, { prelude: prelude(toolbox), code: c.solution, cases: c.cases })
      expect(r.error, r.error).toBeUndefined()
      r.rows.forEach((row, i) => expect(row.passed, `${c.id} case ${i}: ${c.cases[i].call} → ${row.actual ?? row.error}`).toBe(true))
    }, 60000)
    it(`${c.id}: the starter fails at least one case`, async () => {
      const toolbox = c.uses.filter(p => p !== c.piece)
      const r = await runPythonCases(py, { prelude: prelude(toolbox), code: c.starter, cases: c.cases })
      expect(r.passed).toBe(false)
    }, 60000)
  }
  it('the reference pieces are what the challenges teach', () => {
    for (const c of challenges.filter(c => c.piece)) expect(c.solution).toBe(PIECES[c.piece].code)
  })
})

describe('the JavaScript twin adds like Python', () => {
  it('pySum equals Python sum() to the last bit', async () => {
    const { pySum } = await import('./world.js')
    const rng = makeRng(5)
    for (let k = 0; k < 20; k++) {
      const xs = Array.from({ length: 2 + (k % 7) }, () => (rng.random() - 0.5) * 10 ** Math.floor(rng.random() * 6 - 2))
      // A JavaScript number's toString() reads back as exactly the same float in Python.
      const r = await runPythonScratch(py, { prelude: '', code: '', call: `sum([${xs.join(', ')}]) == ${pySum(xs)}` })
      expect(r.returned, xs.join(', ')).toBe('True')
    }
  }, 60000)
})

describe('Open in CodeLens', () => {
  for (const c of challenges) {
    it(`${c.id}: the trimmed program runs every Run preset`, async () => {
      const toolbox = c.uses.filter(p => p !== c.piece)
      for (const call of c.runCalls ?? []) {
        const program = traceProgram(`${lensPrelude(toolbox, {}, `${c.solution}
${call}`)}

# ---- your code ----
${c.solution}`, call)
        const r = await runPythonScratch(py, { prelude: '', code: program, call: '' })
        if (call.includes('parse_map("S.#')) { expect(r.error).toMatch(/ValueError: row 1 has 2 squares/); continue }
        expect(r.error, `${c.id}: ${call}
${r.error}`).toBeUndefined()
        expect(r.output.length).toBeGreaterThan(0)
      }
    }, 60000)
  }
  it('leaves out helpers nobody uses', () => {
    const p = lensPrelude(['parse_map'], {}, 'legal_moves(parse_map(TINY), (0, 0))')
    expect(p).toContain('TINY = ')
    expect(p).not.toContain('class Dice')
    expect(p).not.toContain('SEVEN = ')
    expect(p).toContain('def parse_map')
  })
})

describe('Run (not graded)', () => {
  it('shows prints and the repr of the chosen call, with the toolbox loaded', async () => {
    const r = await runPythonScratch(py, { prelude: prelude(['parse_map']), code: 'print("hello")\nx = 2', call: 'parse_map(TINY)["start"], x' })
    expect(r.output).toBe('hello\n')
    expect(r.returned).toBe('((0, 0), 2)')
  })
  it('names the learner\'s line in an error', async () => {
    const r = await runPythonScratch(py, { prelude: prelude([]), code: 'def f(cell):\n    r, c = cell\n    return rows[r]', call: 'f((0, 0))' })
    expect(r.error).toMatch(/line 3/)
    expect(r.error).toMatch(/NameError/)
  })
  it('compares tuples with lists and rounds floats', async () => {
    const r = await runPythonCases(py, { prelude: '', code: '', cases: [{ call: '((0, 1), 0.1 + 0.2)', expected: [[0, 1], 0.3] }, { call: '{(1, 2): "x"}', expected: { '1,2': 'x' } }] })
    expect(r.passed).toBe(true)
  })
})

describe('traces end where the Python ends', () => {
  const maps = [TINY, SMALL, SEVEN, ...Array.from({ length: 4 }, (_, i) => randomMaze(makeRng(100 + i), 4 + (i % 2), 5 + (i % 3)))]
  it('parse_map', async () => {
    for (const text of maps) {
      const t = traceParseMap(text)
      expect(t.frames.every(f => f.line >= 1 && f.line <= PIECES.parse_map.code.split('\n').length)).toBe(true)
      expect(norm(normMaze({ ...t.result }))).toEqual(await value(`parse_map(${pyText(text)})`))
    }
  }, 60000)
  it('legal_moves, on every open square of every map', async () => {
    for (const text of maps.slice(0, 4)) {
      const maze = parseMap(text)
      for (const cell of openCells(maze)) {
        const t = traceLegalMoves(maze, cell)
        expect(normMoves(t.result)).toEqual(await value(`legal_moves(parse_map(${pyText(text)}), ${pyCellLit(cell)})`))
      }
    }
  }, 120000)
  it('build_table, for every square and move, at three slips', async () => {
    const text = SMALL, maze = parseMap(text)
    for (const slip of [0, 0.2, 0.4]) {
      const table = await value(`build_table(parse_map(SMALL), ${slip})`)
      for (const cell of openCells(maze).filter(c => c !== maze.goal)) for (const a of ACTIONS) {
        expect(normOutcomes(traceBuildTable(maze, cell, a, slip).result), `${cell} ${a} ${slip}`).toEqual(table[cell][a])
      }
    }
  }, 60000)
  it('play_episode, with the same dice', async () => {
    for (const [text, slip, seed] of [[SMALL, 0, 1], [SMALL, 0.2, 4], [SEVEN, 0.2, 9], [maps[3], 0.3, 2]]) {
      const maze = parseMap(text), plan = shortestPlan(maze), us = diceRolls(seed, 200)
      const t = tracePlayEpisode(maze, plan, us, slip, 30)
      const lit = `{${Object.entries(plan).map(([s, a]) => `${pyCellLit(s)}: "${a}"`).join(', ')}}`
      const want = await value(`play_episode(build_table(parse_map(${pyText(text)}), ${slip}), ${pyCellLit(maze.start)}, lambda s: ${lit}[s], Dice(${JSON.stringify(us)}), cap=30)`)
      expect(norm([t.result.path.map(unkey), t.result.total])).toEqual(want)
    }
  }, 60000)
  it('every ask in every trace has a sensible answer', () => {
    const maze = parseMap(SEVEN)
    const all = [
      ...traceParseMap(TINY).frames, ...traceLegalMoves(maze, '2,1').frames,
      ...traceBuildTable(parseMap('.#..\n.S..\n...G'), '1,1', 'up', 0.2).frames,
      ...tracePlayEpisode(parseMap(SMALL), shortestPlan(parseMap(SMALL)), diceRolls(4), 0.2).frames,
      ...traceTrainEpisode(maze, { warm: 25, seed: 3 }).frames,
    ]
    const asks = all.filter(f => f.ask).map(f => f.ask)
    expect(asks.length).toBeGreaterThanOrEqual(7)
    for (const a of asks) {
      expect(a.prompt.length).toBeGreaterThan(20)
      for (const m of a.misconceptions ?? []) expect(m.answer, a.prompt).not.toEqual(a.answer)
      if (a.kind === 'cell') expect(maze.cells[a.answer] ?? parseMap(SMALL).cells[a.answer] ?? 'x').not.toBe('#')
    }
  })
})

describe('Part 2 traces end where the Python ends', () => {
  it('option_values, steps_to_goal and sweep_values', async () => {
    const { traceOptionValues } = await import('./traces.js')
    const { traceStepsToGoal, traceSweepValues } = await import('./traces-part2.js')
    const { sealIslands, sweepValues } = await import('./world.js')
    const maps = [TINY, SMALL, ['.#..', '.S..', '...G'].join('\n'), sealIslands(SEVEN), ...Array.from({ length: 3 }, (_, i) => sealIslands(randomMaze(makeRng(300 + i), 5, 6)))]
    for (const text of maps) {
      const maze = parseMap(text)
      expect(norm(traceStepsToGoal(maze).result), text).toEqual(await value(`steps_to_goal(parse_map(${pyText(text)}))`))
      for (const slip of [0, 0.2]) {
        const table = buildTable(maze, slip)
        const [vals, sweeps] = traceSweepValues(table, 1, 1000).result
        expect(norm([vals, sweeps])).toEqual(await value(`sweep_values(build_table(parse_map(${pyText(text)}), ${slip}))`))
        const values = sweepValues(table, 1)[0]
        const lit = `{${Object.entries(values).map(([s, v]) => `${pyCellLit(s)}: ${v}`).join(', ')}}`
        const cell = openCells(maze).find(c => c !== maze.goal)
        expect(norm(traceOptionValues(table, cell, values, 1).result)).toEqual(await value(`option_values(build_table(parse_map(${pyText(text)}), ${slip}), ${pyCellLit(cell)}, ${lit})`))
      }
    }
  }, 120000)
})

describe('the finished program (lesson 0)', () => {
  it('every tag points at a real line of it', () => {
    for (const [has] of FINISH_TAGS) expect(FINISH.includes(has), has).toBe(true)
  })
  it('runs on Pyodide and learns a route on SEVEN', async () => {
    const program = `${CONSTANTS}\n\n${PIECE_ORDER.map(p => PIECES[p].code).join('\n\n')}\n\n${FINISH}\n`
    const r = await runPythonScratch(py, {
      prelude: '', code: program + `
SEVEN = """
${SEVEN}
"""
q = train(SEVEN, episodes=200, seed=1)
maze = parse_map(SEVEN)
table = build_table(maze)
state, steps = maze["start"], 0
while table[state] and steps < 60:
    action = max(q[state], key=q[state].get)
    state = legal_moves(maze, state).get(action, state)
    steps += 1
`, call: '(state == maze["goal"], steps)' })
    expect(r.error).toBeUndefined()
    const [reached, steps] = r.returned.slice(1, -1).split(', ')
    expect(reached).toBe('True')
    expect(Number(steps)).toBeLessThanOrEqual(16)
  }, 60000)
  it('the JavaScript learner agrees: the same states and moves in q', async () => {
    const maze = parseMap(SEVEN)
    const { q } = traceTrainEpisode(maze, { warm: 0 })
    expect(Object.keys(q).sort()).toEqual(openCells(maze).sort())
    for (const s of Object.keys(q)) expect(Object.keys(q[s])).toEqual(s === maze.goal ? [] : ACTIONS)
    void legalMoves
  })
})
