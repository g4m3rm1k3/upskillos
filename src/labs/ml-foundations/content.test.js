// The owner's rule (2026-10-18): every question can be reasoned out from a "What you need to know"
// just before it, and every answer says WHY the right one is right. Checked for the Understand
// questions, the experiments, every step-through prediction, and (by reading the source) the
// questions inside each Try it.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { LESSONS } from './lessons/index.js'
import { EXPERIMENTS } from './lessons/finish.jsx'
import { traceParseMap, traceLegalMoves, traceBuildTable, tracePlayEpisode, traceTrainEpisode, traceOptionValues } from './traces.js'
import { worthsFor, ICY_TEXT } from './lessons/averages.jsx'
import { TINY, SMALL, SEVEN, parseMap } from './world.js'
import { shortestPlan, diceRolls } from './lessons/episodes.jsx'
import { tryQuestions } from './TrySequence.jsx'
import { traceEstimateOutcomes, traceRunningMeans, traceCorridor, traceChoose } from './traces-part3.js'
import { traceNudge, traceDescend, traceBackprop, traceReplay } from './traces-part4.js'
import { traceStepsToGoal, traceSweepValues, traceDiscountedTotal, traceEvaluatePlan } from './traces-part2.js'
import { buildTable } from './world.js'

const explained = (text, min = 40) => typeof text === 'string' && text.replace(/[`*$]/g, '').length >= min

describe('teach before asking, and say why', () => {
  const questions = [
    ...Object.values(LESSONS).flatMap(l => l.understand.flatMap(b => (b.predict ? [b.predict] : b.choice ? [b.choice] : []))),
    ...EXPERIMENTS.map(x => ({ id: x.id, ...x.choice })),
    ...Object.values(LESSONS).flatMap(l => tryQuestions(l.tryIt)),
  ]
  for (const q of questions) {
    it(`${q.id} teaches first and explains the answer`, () => {
      expect(explained(q.teach), `${q.id} has no "What you need to know"`).toBe(true)
      const why = q.options ? [q.options[q.answer].why, q.explain].filter(Boolean).join(' ') : q.explain
      expect(explained(why), `${q.id}: the right answer has no reason`).toBe(true)
      for (const o of q.options ?? []) expect(explained(o.why, 20), `${q.id}: option "${o.text}" has no reason`).toBe(true)
    })
  }
  it('every step-through prediction teaches first (or carries its rule in the prompt) and explains', () => {
    const maze = parseMap(SEVEN)
    const asks = [
      ...traceParseMap(TINY).frames, ...traceLegalMoves(maze, '2,1').frames,
      ...traceBuildTable(parseMap('.#..\n.S..\n...G'), '1,1', 'up', 0.2).frames,
      ...tracePlayEpisode(parseMap(SMALL), shortestPlan(parseMap(SMALL)), diceRolls(4), 0.2).frames,
      ...traceTrainEpisode(maze, { warm: 25, seed: 3 }).frames,
      ...(w => traceOptionValues(w.table, '1,1', w.values, 1).frames)(worthsFor(ICY_TEXT, 0.2)),
      ...traceStepsToGoal(parseMap(SMALL)).frames, ...traceSweepValues(buildTable(parseMap(ICY_TEXT), 0)).frames, ...traceDiscountedTotal([-0.04, -0.04, -0.04, 1], 0.9).frames, ...traceEvaluatePlan(buildTable(parseMap(SMALL), 0), Object.fromEntries(Object.keys(buildTable(parseMap(SMALL), 0)).filter(s => s !== '2,3').map(s => [s, 'right'])), 0.9).frames,
      ...traceEstimateOutcomes(buildTable(parseMap(ICY_TEXT), 0.2), '1,1', 'up', [0.1, 0.5, 0.9, 0.3, 0.95, 0.2]).frames, ...traceRunningMeans([2, 4, 3, 5], null).frames, ...traceRunningMeans([2, 4, 3, 5], 0.5).frames, ...traceCorridor(6, 3, 1, 0.9).frames, ...traceChoose({ left: -0.3, up: -0.75, right: 0.6, down: 0.6 }, 0.1, [0.5, 0.7]).frames,
      ...traceNudge([0.4, 0.3, -0.2], [0.5, 0.75, 1], 0.6, 0.5).frames, ...traceDescend(x => (x - 3) * (x - 3), 0, 0.1, 4).frames, ...traceBackprop({ w1: [1, -2], b1: [0, 0.5], w2: [0.8, 0.4], b2: 0.1 }, 0.5, 1).frames, ...traceReplay(4, ['A', 'B', 'C', 'D', 'E', 'F'], [0.1, 0.6]).frames,
    ].filter(f => f.ask).map(f => f.ask)
    for (const a of asks) {
      const formulaInPrompt = /=.*[×+]/.test(a.prompt)
      expect(explained(a.teach) || formulaInPrompt, a.prompt.slice(0, 60)).toBe(true)
      expect(explained(a.explain, 30), a.prompt.slice(0, 60)).toBe(true)
    }
  })
  it('every question inside a Try it has a teach box', () => {
    for (const f of ['finish', 'maps', 'moves', 'episodes']) {
      const src = readFileSync(new URL(`./lessons/${f}.jsx`, import.meta.url), 'utf8')
      const tryPart = src.slice(src.indexOf('Try it first'), src.indexOf('Watch it'))
      const ids = [...tryPart.matchAll(/id: '([\w-]+)'(, teach:)?/g)]
      for (const [, id, teach] of ids) expect(teach, `${f}: ${id}`).toBeTruthy()
    }
  })
})
