// Step-throughs for Part 3 (learning from samples). Same frame format as traces.js.
import { lineFinder, pyCell, pyDict, pyList, pyNum, pyStr } from './traces.js'
import { PIECES } from './python/pieces.js'
import { ACTIONS, sampleOutcome, unkey } from './world.js'
import { updateMean, bestOf } from './world-part3.js'

const r4 = x => Number(x.toFixed(4))

// ---- estimate_outcomes: try one move n times in a hidden world (lesson 8) ----
export function traceEstimateOutcomes(table, state, action, us) {
  const code = PIECES.estimate_outcomes.code
  const L = lineFinder(code)
  const frames = []
  const n = us.length
  const counts = new Map()
  const DIR = { left: [-1, 0], up: [0, -1], right: [1, 0], down: [0, 1] }
  const flows = () => [...counts.values()].map(({ nxt, c }) => ({ from: state, to: nxt, p: c / n, bump: nxt === state, dir: DIR[action], label: `${c}` }))
  const countsRepr = () => pyDict([...counts.values()].map(({ nxt, reward, c }) => [`(${pyCell(nxt)}, ${pyNum(reward)})`, String(c)]))
  frames.push({ line: L('counts = {}'), say: `The mouse can't see the table. It can only press '${action}' at ${pyCell(state)} and see what happens. It will try ${n} times and count each result.`, vars: [['state', pyCell(state)], ['action', pyStr(action)], ['n', String(n)], ['counts', '{}']], pic: { marks: { [state]: 'focus' }, flows: [] } })
  let askedShare = false
  us.forEach((u, k) => {
    const [nxt, reward] = sampleOutcome(table[state][action], u)
    const key = `${nxt}|${reward}`
    counts.set(key, { nxt, reward, c: (counts.get(key)?.c ?? 0) + 1 })
    frames.push({ line: L('counts[result] = counts.get(result, 0) + 1'), say: `Try ${k + 1}: it ended at ${pyCell(nxt)}${nxt === state ? ' (a bump)' : ''}, paid ${reward}. That result has now been seen ${counts.get(key).c} time${counts.get(key).c === 1 ? '' : 's'}.`, vars: [['_', String(k)], ['result', `(${pyCell(nxt)}, ${pyNum(reward)})`], ['counts', countsRepr()]], pic: { marks: { [state]: 'focus', [nxt]: 'read' }, flows: flows() } })
  })
  const out = [...counts.values()].map(({ nxt, reward, c }) => [c / n, nxt, reward])
  const top = [...counts.values()].sort((a, b) => b.c - a.c)[0]
  const truth = table[state][action].find(o => o[1] === top.nxt)?.[0] ?? 0
  const ask = !askedShare ? {
    kind: 'number',
    teach: `Each result's estimated chance is **how often it happened ÷ how many tries**: \`c / n\`. The most common result was seen ${top.c} times in ${n} tries.`,
    prompt: `**What estimated chance will the list give it?**`,
    answer: r4(top.c / n), tolerance: 1e-4,
    misconceptions: [{ answer: top.c, tolerance: 1e-6, feedback: `${top.c} is the count. A chance is a share of the tries: divide by n = ${n}.` }, { answer: r4(truth), tolerance: 1e-4, feedback: `${r4(truth)} is the true chance, from the hidden table. The mouse never sees it: its estimate is only what it counted.` }],
    explain: `${top.c} / ${n} = ${r4(top.c / n)}. The true chance (hidden) is ${r4(truth)}: close, but an estimate from ${n} tries wobbles.`,
  } : undefined
  askedShare = true
  frames.push({ line: L('return [(c / n, nxt, reward)'), say: `Each count divided by ${n}: ${pyList(out.map(([p, nn, r]) => `(${pyNum(r4(p))}, ${pyCell(nn)}, ${pyNum(r)})`))}. The hidden truth: ${pyList(table[state][action].map(([p, nn, r]) => `(${pyNum(r4(p))}, ${pyCell(nn)}, ${pyNum(r)})`))}.`, vars: [['counts', countsRepr()], ['n', String(n)]], pic: { marks: { [state]: 'focus' }, flows: flows() }, ask })
  return { frames, result: out }
}

// ---- running_means (lesson 9). The picture is a chart of the samples and the guess. ----
export function traceRunningMeans(xs, alpha = null) {
  const L = lineFinder(`${PIECES.update_mean.code}\n\n${PIECES.running_means.code}`)
  const frames = []
  let guess = 0
  const out = []
  frames.push({ line: L('guess, out = 0.0, []'), say: `The guess starts at 0. The samples arrive one at a time and are never stored: only the guess is kept. Step size: ${alpha === null ? '1/n (the exact average so far)' : `alpha = ${alpha}, fixed`}.`, vars: [['alpha', alpha === null ? 'None' : pyNum(alpha)], ['guess', pyNum(0)]], pic: { xs, guesses: [], upto: -1 } })
  let asked = false
  xs.forEach((x, k) => {
    const n = k + 1
    const a = alpha === null ? 1 / n : alpha
    const before = guess
    const ask = !asked && n >= 3 ? {
      kind: 'number',
      teach: `\`update_mean(old, x, alpha)\` moves the guess **part of the way** toward the new sample: old + alpha × (x − old). Here alpha = ${alpha === null ? `1 / n = 1 / ${n}` : alpha}.`,
      prompt: `old guess = ${r4(before)}, new sample x = ${x}. **What is the new guess?**`,
      answer: r4(updateMean(r4(before), x, a)), tolerance: 6e-4,
      misconceptions: [{ answer: x, tolerance: 1e-6, feedback: 'That jumps all the way to the new sample, forgetting everything before it. The step size moves it only part of the way.' }, { answer: r4((r4(before) + x) / 2), tolerance: 6e-4, feedback: alpha === 0.5 ? 'Right number, but say how: with alpha = 0.5 the guess moves half way.' : 'That is half way. The step here is not a half.' }].filter(m => Math.abs(m.answer - r4(updateMean(r4(before), x, a))) > 6e-4),
      explain: `${r4(before)} + ${r4(a)} × (${x} − ${r4(before)}) = ${r4(updateMean(before, x, a))}. The bracket is the **surprise**: how far the sample is from the guess.`,
    } : undefined
    if (ask) asked = true
    guess = updateMean(guess, x, a)
    out.push(guess)
    frames.push({ line: L('guess = update_mean(guess, x'), say: `Sample ${n}: x = ${x}. Surprise x − guess = ${r4(x - before)}; step ${alpha === null ? `1/${n}` : alpha}; the guess moves to ${r4(guess)}.`, vars: [['n', String(n)], ['x', pyNum(x)], ['alpha', pyNum(r4(a))], ['guess', pyNum(r4(guess))]], pic: { xs, guesses: [...out], upto: k }, ask })
  })
  frames.push({ line: L('return out'), say: `After ${xs.length} samples the guess is ${r4(guess)}. The plain average is ${r4(xs.reduce((s, v) => s + v, 0) / xs.length)}${alpha === null ? ': the same, because 1/n gives every sample equal weight.' : ': different, because a fixed alpha weights recent samples more.'}`, vars: [['guess', pyNum(r4(guess))]], pic: { xs, guesses: [...out], upto: xs.length - 1 } })
  return { frames, result: out }
}

// ---- q_update on a corridor: good news travels back one square per game (lesson 10) ----
export function traceCorridor(length = 5, games = 3, alpha = 1, g = 0.9) {
  const L = lineFinder(`${PIECES.best.code}\n\n${PIECES.q_update.code}`)
  const frames = []
  const cells = Array.from({ length }, (_, c) => `0,${c}`)
  const goal = cells[length - 1]
  const q = Object.fromEntries(cells.map(c => [c, c === goal ? {} : { right: 0 }]))
  const labels = () => Object.fromEntries(cells.filter(c => c !== goal).map(c => [c, q[c].right.toFixed(2)]))
  frames.push({ line: L('def q_update('), say: `A corridor: the mouse always walks right, ${length - 1} moves to the cheese. Each square has one guess, q[square]["right"], all starting at 0. alpha = ${alpha}, g = ${g}.`, vars: [], pic: { labels: labels(), marks: {} } })
  let asked = false
  for (let game = 1; game <= games; game++) {
    for (let c = 0; c < length - 1; c++) {
      const state = cells[c], nxt = cells[c + 1]
      const reward = nxt === goal ? 1 : -0.04
      const bn = bestOf(q[nxt])
      const target = reward + g * bn
      const old = q[state].right
      const ask = !asked && game === 2 && c === length - 3 ? {
        kind: 'number',
        teach: `The target is **reward + g × best(q[nxt])**: what this move paid, plus g times the best guess at the square it led to. Last game, the square it leads to learned ${r4(bn)}. With alpha = 1 the guess jumps all the way to the target.`,
        prompt: `Game ${game}, square ${pyCell(state)}: reward = ${reward}, best(q[nxt]) = ${r4(bn)}, g = ${g}. **What will q[${pyCell(state)}]["right"] become?**`,
        answer: r4(old + alpha * (target - old)), tolerance: 6e-4,
        misconceptions: [{ answer: reward, tolerance: 1e-6, feedback: 'That uses only the payment. The target also adds g times the guess at the next square, which learned something last game.' }],
        explain: `${reward} + ${g} × ${r4(bn)} = ${r4(target)}. In game 1 this square could only see a 0 ahead of it; now the square ahead knows about the cheese, and passes it back.`,
      } : undefined
      if (ask) asked = true
      const surprise = target - old
      q[state].right = old + alpha * surprise
      frames.push({ line: L('q[state][action] += alpha * surprise'), say: `Game ${game}, at ${pyCell(state)}: target = ${reward} + ${g} × ${r4(bn)} = ${r4(target)}; surprise ${r4(surprise)}; the guess becomes ${r4(q[state].right)}.`, vars: [['game', String(game)], ['state', pyCell(state)], ['reward', pyNum(reward)], ['best(q[nxt])', pyNum(r4(bn))], ['target', pyNum(r4(target))], ['surprise', pyNum(r4(surprise))]], pic: { labels: labels(), marks: { [state]: 'focus', [nxt]: 'read' }, agent: state }, ask })
    }
    const learned = cells.filter(c => c !== goal && q[c].right !== 0 && q[c].right > -0.04 + 1e-9).length
    frames.push({ line: L('return surprise'), say: `End of game ${game}: ${learned} square${learned === 1 ? '' : 's'} next to the cheese now know${learned === 1 ? 's' : ''} it is coming. The news moved back one more square.`, vars: [['game', String(game)]], pic: { labels: labels(), marks: {} } })
  }
  return { frames, result: q }
}

// ---- choose: explore or repeat (lesson 11) ----
export function traceChoose(row, eps, us) {
  const L = lineFinder(PIECES.choose.code)
  const frames = []
  const ties = () => ACTIONS.filter(a => row[a] === bestOf(row))
  let k = 0
  const next = () => us[k++]
  const rowRepr = pyDict(ACTIONS.map(a => [pyStr(a), pyNum(r4(row[a]))]))
  const u1 = next()
  frames.push({ line: L('if rng.random() < eps:'), say: `rng.random() gives ${u1}. Is it below eps = ${eps}? ${u1 < eps ? 'Yes: explore, a random move.' : 'No: repeat what looks best.'}`, vars: [['row', rowRepr], ['eps', pyNum(eps)], ['u', String(u1)]], pic: { row } })
  let action
  if (u1 < eps) {
    const u2 = next()
    action = ACTIONS[Math.floor(u2 * 4)]
    frames.push({ line: L('return rng.choice(ACTIONS)'), say: `rng.choice picks from all four with the next number, ${u2}: position int(${u2} × 4) = ${Math.floor(u2 * 4)}, '${action}'. Exploring ignores the guesses completely.`, vars: [['u', String(u2)], ['action', pyStr(action)]], pic: { row, picked: action } })
  } else {
    const top = bestOf(row), list = ties()
    frames.push({ line: L('top = best(row)'), say: `The best guess is ${r4(top)}.`, vars: [['row', rowRepr], ['top', pyNum(r4(top))]], pic: { row, ties: list } })
    const u2 = next()
    action = list[Math.floor(u2 * list.length)]
    const ask = list.length > 1 ? {
      kind: 'choice',
      teach: `\`[a for a in ACTIONS if row[a] == top]\` lists every move tied for the best, in the order of ACTIONS: ${pyList(list.map(pyStr))}. \`rng.choice\` then picks position int(u × ${list.length}) with the next random number, u = ${u2}.`,
      prompt: `**Which move does choose return?**`,
      options: list.map(a => ({ text: `'${a}'`, why: a === action ? `int(${u2} × ${list.length}) = ${Math.floor(u2 * list.length)}, and position ${Math.floor(u2 * list.length)} of the tied list is '${a}'.` : `Position ${list.indexOf(a)} would need u between ${r4(list.indexOf(a) / list.length)} and ${r4((list.indexOf(a) + 1) / list.length)}; u is ${u2}.` })),
      answer: list.indexOf(action),
      explain: 'Ties are broken at random, so no move is favoured just because it comes first in ACTIONS.',
    } : undefined
    frames.push({ line: L('return rng.choice([a for a in ACTIONS if row[a] == top])'), say: `${list.length > 1 ? `${list.length} moves are tied (${list.join(', ')}). rng.choice picks one with u = ${u2}: '${action}'.` : `Only '${action}' has the best guess.`}`, vars: [['ties', pyList(list.map(pyStr))], ['u', String(u2)], ['action', pyStr(action)]], pic: { row, ties: list, picked: action }, ask })
  }
  return { frames, result: action }
}

export { unkey }
