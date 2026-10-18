// Step-throughs for Part 2 (worth by computation). Same frame format as traces.js.
import { lineFinder, pyCell, pyDict, pyList, pyNum, pyStr } from './traces.js'
import { PIECES } from './python/pieces.js'
import { legalMoves, optionValues, bestOption, pySum } from './world.js'

const r4 = x => Number(x.toFixed(4))

// ---- steps_to_goal: breadth-first from the cheese (lesson 5) ----
export function traceStepsToGoal(maze) {
  const L = lineFinder(PIECES.steps_to_goal.code)
  const frames = []
  const dist = { [maze.goal]: 0 }, queue = [maze.goal]
  const labels = () => Object.fromEntries(Object.entries(dist).map(([s, d]) => [s, String(d)]))
  const vars = extra => [['queue', pyList(queue.map(pyCell))], ['dist', pyDict(Object.entries(dist).map(([s, d]) => [pyCell(s), String(d)]), 8)], ...extra]
  const marks = (cur, extra = {}) => ({ ...Object.fromEntries(queue.map(s => [s, 'path'])), ...(cur ? { [cur]: 'focus' } : {}), ...extra })
  frames.push({ line: L('dist = {maze["goal"]: 0}'), say: 'Start at the cheese: it is 0 moves from itself. Every other square is still unknown.', vars: vars([]), pic: { labels: labels(), marks: marks(null, { [maze.goal]: 'good' }) } })
  frames.push({ line: L('queue = [maze["goal"]]'), say: 'The queue holds squares whose distance is known but whose neighbours have not been looked at yet. A purple outline means "in the queue".', vars: vars([]), pic: { labels: labels(), marks: marks(null) } })
  let askedDist = false, askedNext = false
  while (queue.length) {
    const nextAsk = !askedNext && queue.length >= 2 ? {
      kind: 'cell',
      teach: '`queue.pop(0)` removes and returns the **front** of the list: the square that was added **earliest**. New squares are added at the back with `append`. So squares come out in the order they went in: first in, first out.',
      prompt: `The queue is ${pyList(queue.map(pyCell))}. **Which square does \`queue.pop(0)\` take next?** Click it.`,
      answer: queue[0],
      misconceptions: [{ answer: queue[queue.length - 1], feedback: 'That is the **back** of the queue, the one added last: `pop()` with no number would take it. `pop(0)` takes position 0, the front.' }],
      explain: `${pyCell(queue[0])} is at position 0: it went in first, so it comes out first. That is what makes the search breadth-first: every square at distance 1 is handled before any at distance 2, and so on.`,
    } : undefined
    if (nextAsk) askedNext = true
    const cell = queue.shift()
    frames.push({ line: L('cell = queue.pop(0)'), say: `Take the front of the queue: ${pyCell(cell)}, distance ${dist[cell]}. Now look at its neighbours.`, vars: vars([['cell', pyCell(cell)]]), pic: { labels: labels(), marks: marks(cell) }, ask: nextAsk })
    for (const nxt of Object.values(legalMoves(maze, cell))) {
      if (nxt in dist) {
        frames.push({ line: L('if nxt not in dist:'), say: `${pyCell(nxt)} already has a distance (${dist[nxt]}). The first time a square is reached is by a shortest route, so a later route can only be as long or longer: skip it.`, vars: vars([['cell', pyCell(cell)], ['nxt', pyCell(nxt)]]), pic: { labels: labels(), marks: marks(cell, { [nxt]: 'read' }) } })
        continue
      }
      const distAsk = !askedDist && dist[cell] >= 1 ? {
        kind: 'number',
        teach: 'A neighbour of `cell` is one move further from the cheese than `cell` is, along this route: one move to reach `cell`, then the moves from `cell`.',
        prompt: `\`cell\` is ${pyCell(cell)} with \`dist[cell]\` = ${dist[cell]}. Its neighbour ${pyCell(nxt)} has no distance yet. **What distance will it get?**`,
        answer: dist[cell] + 1,
        misconceptions: [{ answer: dist[cell], feedback: 'It is a neighbour, so it is one move further away than `cell`, not the same distance.' }],
        explain: `${dist[cell]} + 1 = ${dist[cell] + 1}: from ${pyCell(nxt)}, one move reaches ${pyCell(cell)}, and from there ${dist[cell]} more reach the cheese.`,
      } : undefined
      if (distAsk) askedDist = true
      dist[nxt] = dist[cell] + 1
      frames.push({ line: L('dist[nxt] = dist[cell] + 1'), say: `${pyCell(nxt)} is new: its distance is ${dist[cell]} + 1 = ${dist[nxt]}.`, vars: vars([['cell', pyCell(cell)], ['nxt', pyCell(nxt)]]), pic: { labels: labels(), marks: marks(cell, { [nxt]: 'good' }) }, ask: distAsk })
      queue.push(nxt)
      frames.push({ line: L('queue.append(nxt)'), say: `Add ${pyCell(nxt)} to the back of the queue: its own neighbours get looked at later.`, vars: vars([['cell', pyCell(cell)], ['nxt', pyCell(nxt)]]), pic: { labels: labels(), marks: marks(cell) } })
    }
  }
  const unreachable = Object.keys(maze.cells).filter(s => maze.cells[s] !== '#' && !(s in dist)).length
  frames.push({ line: L('return dist'), say: `The queue is empty: every square that can reach the cheese has its distance.${unreachable ? ' Squares without a number can never reach it.' : ''}`, vars: vars([]), pic: { labels: labels(), marks: {} } })
  return { frames, result: dist }
}

// ---- sweep_values: worth by sweeping (lesson 5) ----
export function traceSweepValues(table, g = 1, maxSweeps = 12) {
  const L = lineFinder(PIECES.sweep_values.code)
  const frames = []
  const values = Object.fromEntries(Object.keys(table).map(s => [s, 0]))
  const pic = (marks = {}) => ({ labels: Object.fromEntries(Object.entries(values).map(([s, v]) => [s, String(r4(v))])), heat: { ...values }, heatRange: [-0.5, 1], marks })
  frames.push({ line: L('values = {s: 0.0 for s in table}'), say: 'Every square starts with worth 0: a guess, and mostly a wrong one. The sweeps correct it, starting next to the cheese.', vars: [['g', pyNum(g)]], pic: pic() })
  let askedFirst = false, askedSecond = false
  for (let sweep = 1; sweep <= maxSweeps; sweep++) {
    let biggest = 0
    frames.push({ line: L('for sweep in range(1'), say: `Sweep ${sweep}: visit every square in order, row by row.`, vars: [['sweep', String(sweep)]], pic: pic() })
    for (const s of Object.keys(table)) {
      if (!Object.keys(table[s]).length) continue
      const row = optionValues(table, s, values, g)
      const [ba, nv] = bestOption(row)
      const old = values[s]
      const change = Math.abs(nv - old)
      const nextToCheese = Object.values(table[s]).some(outs => outs.some(([, n]) => Object.keys(table[n]).length === 0))
      let ask
      if (!askedFirst && sweep === 1 && nextToCheese) {
        askedFirst = true
        ask = {
          kind: 'number',
          teach: 'The new worth is the **best option**: over the four moves, the highest average of (payment + g × worth of where you land). Right now every worth is still 0, the cheese included (the game is over there). A move onto the cheese pays +1; any other move pays −0.04, or −0.75 for a bump.',
          prompt: `${pyCell(s)} is next to the cheese. **What will its new worth be?**`,
          answer: r4(nv), tolerance: 6e-4,
          misconceptions: [{ answer: 0, feedback: 'Its best move reaches the cheese, which pays +1, so its worth is no longer 0.' }],
          explain: `The best move is '${ba}', worth ${r4(nv)}: it reaches the cheese${table[s][ba].length > 1 ? ' most of the time' : ''} and is paid +1.`,
        }
      } else if (!askedSecond && sweep === 2 && old !== 0 && change > 1e-6) {
        askedSecond = true
        ask = {
          kind: 'choice',
          teach: 'A sweep uses the **latest** worth of every neighbour. If a neighbour has changed since this square was last updated, this square\'s best option changes too.',
          prompt: `${pyCell(s)} was set to ${r4(old)} in sweep 1. Its neighbours have changed since. **Will its worth change in sweep 2?**`,
          options: [{ text: 'Yes', why: `Its neighbours' worths have moved, so its best option is now ${r4(nv)}.` }, { text: 'No', why: `Its neighbours' worths have moved since sweep 1, so its best option moves too: it becomes ${r4(nv)}.` }],
          answer: 0,
          explain: `Worth spreads out from the cheese one neighbour at a time, and ${pyCell(s)} improves as the squares around it improve.`,
        }
      }
      values[s] = nv
      biggest = Math.max(biggest, change)
      frames.push({ line: L('new = best_option('), say: `${pyCell(s)}: its best move is '${ba}', worth ${r4(nv)}${change > 1e-12 ? ` (it was ${r4(old)})` : ' (no change)'}.`, vars: [['sweep', String(sweep)], ['s', pyCell(s)], ['new', pyNum(r4(nv))], ['biggest', pyNum(r4(biggest))]], pic: { ...pic({ [s]: 'focus' }), arrows: { [s]: ba } }, ask })
    }
    const done = biggest < 1e-9
    frames.push({ line: L('if biggest < tol:'), say: done ? `Nothing changed in sweep ${sweep}: the worths are settled. Every worth now equals its best option, computed from its neighbours' worths.` : `The biggest change in sweep ${sweep} was ${r4(biggest)}. Not settled yet: sweep again.`, vars: [['sweep', String(sweep)], ['biggest', pyNum(r4(biggest))]], pic: pic() })
    if (done) {
      frames.push({ line: L('return values, sweep'), say: `Done after ${sweep} sweeps.`, vars: [['sweep', String(sweep)]], pic: pic() })
      return { frames, result: [values, sweep] }
    }
  }
  return { frames, result: [values, maxSweeps] }
}

// ---- discounted_total (lesson 6). The picture is a bar per reward: its size, and what it counts for. ----
export function traceDiscountedTotal(rewards, g) {
  const L = lineFinder(PIECES.discounted_total.code)
  const frames = []
  let total = 0
  const shown = (upto) => ({ rewards, g, upto })
  frames.push({ line: L('total = 0.0'), say: `Nothing added yet. The rewards come one per move: ${rewards.join(', ')}.`, vars: [['g', pyNum(g)], ['total', pyNum(0)]], pic: shown(-1) })
  let asked = false
  rewards.forEach((r, t) => {
    frames.push({ line: L('for t, r in enumerate(rewards):'), say: `Reward number t = ${t} (counting from 0): r = ${r}.`, vars: [['g', pyNum(g)], ['t', String(t)], ['r', pyNum(r)], ['total', pyNum(r4(total))]], pic: shown(t - 1) })
    const w = g ** t
    const ask = !asked && t >= 2 ? {
      kind: 'number',
      teach: `\`g ** t\` is g multiplied by itself t times. With g = ${g}: g ** 0 = 1, g ** 1 = ${g}, g ** 2 = ${r4(g * g)}, and so on. The reward is multiplied by that weight before it is added.`,
      prompt: `t = ${t}, r = ${r}, g = ${g}. **How much does this line add to \`total\`?**`,
      answer: r4(w * r), tolerance: 6e-4,
      misconceptions: [{ answer: r, tolerance: 1e-6, feedback: `That adds the reward at full value. It is ${t} moves in the future, so it is weighted by g ** ${t} = ${r4(w)} first.` }, { answer: r4(g ** (t + 1) * r), tolerance: 6e-4, feedback: `That weights it by g ** ${t + 1}. The first reward (t = 0) has weight g ** 0 = 1: the exponent is t, not t + 1.` }],
      explain: `g ** ${t} × r = ${r4(w)} × ${r} = ${r4(w * r)}. The further in the future a reward is, the smaller its weight.`,
    } : undefined
    if (ask) asked = true
    total += w * r
    frames.push({ line: L('total += g ** t * r'), say: `Weight g ** ${t} = ${r4(w)}, so it adds ${r4(w)} × ${r} = ${r4(w * r)}. Total so far: ${r4(total)}.`, vars: [['g', pyNum(g)], ['t', String(t)], ['r', pyNum(r)], ['g ** t', pyNum(r4(w))], ['total', pyNum(r4(total))]], pic: shown(t), ask })
  })
  frames.push({ line: L('return total'), say: `The discounted total is ${r4(total)}. Undiscounted it would be ${r4(rewards.reduce((a, b) => a + b, 0))}.`, vars: [['g', pyNum(g)], ['total', pyNum(r4(total))]], pic: shown(rewards.length - 1) })
  return { frames, result: total }
}

// ---- evaluate_plan (lesson 7): line by line for two sweeps, then one frame per sweep ----
export function traceEvaluatePlan(table, plan, g = 0.9, detailed = 2) {
  const L = lineFinder(PIECES.evaluate_plan.code)
  const frames = []
  const values = Object.fromEntries(Object.keys(table).map(s => [s, 0]))
  const pic = (marks = {}) => ({ labels: Object.fromEntries(Object.entries(values).map(([s, v]) => [s, Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)])), heat: { ...values }, heatRange: [-1, 1], arrows: { ...plan }, marks })
  frames.push({ line: L('values = {s: 0.0 for s in table}'), say: 'The plan is fixed: the arrows. Every worth starts at 0. Each sweep sets a square\'s worth to the average outcome of **its plan\'s move**: no choosing, no max.', vars: [['g', pyNum(g)]], pic: pic() })
  let asked = false
  for (let sweep = 0; sweep < 10000; sweep++) {
    let biggest = 0
    const loud = sweep < detailed
    for (const [s, a] of Object.entries(plan)) {
      const nv = pySum(table[s][a].map(([p, n, r]) => p * (r + g * values[n])))
      const change = Math.abs(nv - values[s])
      let ask
      if (loud && !asked && sweep === 1 && table[s][a].every(([, n]) => n === s)) {
        asked = true
        ask = {
          kind: 'number',
          teach: `This square's plan walks into a wall: the mouse stays put and pays −0.75, every time, forever. Lesson 6: a payment c on every move, forever, is worth c / (1 − g).`,
          prompt: `When the sweeps have settled, what will this square be worth? (g = ${g})`,
          answer: r4(-0.75 / (1 - g)), tolerance: 6e-3,
          misconceptions: [{ answer: -0.75, tolerance: 1e-6, feedback: 'That is one bump. The plan bumps again on the next move, and the next, forever.' }],
          explain: `−0.75 / (1 − ${g}) = ${r4(-0.75 / (1 - g))}. A plan with a square that bumps forever drags down every square whose route passes through it.`,
        }
      }
      values[s] = nv
      biggest = Math.max(biggest, change)
      if (loud) frames.push({ line: L('new = sum(p * (r + g * values[n])'), say: `${pyCell(s)} follows its arrow '${a}': its worth becomes ${r4(nv)}.`, vars: [['sweep', String(sweep)], ['s', pyCell(s)], ['action', pyStr(a)], ['new', pyNum(r4(nv))], ['biggest', pyNum(r4(biggest))]], pic: pic({ [s]: 'focus' }), ask })
    }
    frames.push({ line: L('if biggest < tol:'), say: biggest < 1e-9 ? `Settled after ${sweep + 1} sweeps: these are the worths of following this plan.` : `Sweep ${sweep + 1}: biggest change ${r4(biggest)}.${sweep + 1 === detailed ? ' From here on, one step per sweep.' : ''}`, vars: [['sweep', String(sweep)], ['biggest', pyNum(r4(biggest))]], pic: pic() })
    if (biggest < 1e-9) break
  }
  frames.push({ line: L('return values'), say: 'The worth of every square **if the mouse follows this plan**. A better plan would make some of them bigger.', vars: [], pic: pic() })
  return { frames, result: values }
}

export { pyStr }
