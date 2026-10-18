// Step-throughs for Part 4 (from tables to formulas). Same frame format as traces.js.
import { lineFinder, pyList, pyNum } from './traces.js'
import { PIECES } from './python/pieces.js'
import { predict, slope, forward, gradients } from './world-part4.js'

const r4 = x => Number(x.toFixed(4))
const list = xs => pyList(xs.map(v => pyNum(r4(v))))

// ---- nudge: one correction of a formula (lesson 12) ----
export function traceNudge(w, f, target, alpha) {
  const L = lineFinder(`${PIECES.predict.code}\n\n${PIECES.nudge.code}`)
  const frames = []
  const parts = w.map((wi, i) => wi * f[i])
  const p = predict(w, f)
  frames.push({ line: L('return sum(wi * fi for wi, fi in zip(w, features))'), say: `predict multiplies each weight by its feature and adds them up: ${w.map((wi, i) => `${r4(wi)} × ${f[i]}`).join(' + ')} = ${r4(p)}.`, vars: [['w', list(w)], ['features', list(f)], ['prediction', pyNum(r4(p))]], pic: { w, f, parts } , ask: {
    kind: 'number',
    teach: '`zip(w, features)` pairs the first weight with the first feature, the second with the second, and so on. Multiply each pair, then add all the products. A feature of 0 makes its weight irrelevant.',
    prompt: `w = ${list(w)}, features = ${list(f)}. **What does predict return?**`,
    answer: r4(p), tolerance: 6e-4,
    misconceptions: [{ answer: r4(w.reduce((a, b) => a + b, 0)), tolerance: 6e-4, feedback: 'That adds the weights without multiplying by the features. Each weight counts only as much as its feature.' }],
    explain: `Each weight times its feature: ${w.map((wi, i) => `${r4(wi)} × ${f[i]}`).join(', ')}, which give ${parts.map(r4).join(' + ')} = ${r4(p)}. A weight counts only as much as its feature lets it.`,
  } })
  const error = target - p
  frames.push({ line: L('error = target - predict(w, features)'), say: `The target is ${target}, the prediction ${r4(p)}: error = ${r4(error)}. ${error > 0 ? 'Too low' : 'Too high'}: the weights should move to make the prediction ${error > 0 ? 'bigger' : 'smaller'}.`, vars: [['target', pyNum(target)], ['prediction', pyNum(r4(p))], ['error', pyNum(r4(error))]], pic: { w, f, parts } })
  const nw = w.map((wi, i) => wi + alpha * error * f[i])
  const k = f.findIndex(v => v !== 0)
  frames.push({ line: L('return [wi + alpha * error * fi'), say: `Each weight moves by alpha × error × its feature. A weight whose feature is 0 doesn't move: it had no part in the mistake. New weights: ${list(nw)}.`, vars: [['alpha', pyNum(alpha)], ['error', pyNum(r4(error))], ['new w', list(nw)]], pic: { w: nw, f, parts: nw.map((wi, i) => wi * f[i]), changed: true }, ask: k >= 0 ? {
    kind: 'number',
    teach: 'Each weight changes by **alpha × error × its own feature**: weights whose features were large get most of the blame, and weights whose features were 0 get none.',
    prompt: `alpha = ${alpha}, error = ${r4(error)}, the feature of weight ${k} is ${f[k]} and the weight is ${r4(w[k])}. **What does weight ${k} become?**`,
    answer: r4(w[k] + alpha * r4(error) * f[k]), tolerance: 6e-4,
    misconceptions: [{ answer: r4(w[k] + alpha * r4(error)), tolerance: 6e-4, feedback: `That forgets to multiply by the feature (${f[k]}).` }],
    explain: `${r4(w[k])} + ${alpha} × ${r4(error)} × ${f[k]} = ${r4(w[k] + alpha * error * f[k])}.`,
  } : undefined })
  return { frames, result: nw }
}

// ---- descend: walking downhill on f(x) = (x - 3)^2 (lesson 13) ----
export function traceDescend(fn, x0, lr, steps) {
  const L = lineFinder(`${PIECES.slope.code}\n\n${PIECES.descend.code}`)
  const frames = []
  const xs = [x0]
  let x = x0
  frames.push({ line: L('xs = [x]'), say: `Start at x = ${x0}, where f(x) = ${r4(fn(x0))}. The aim: walk downhill to the lowest point.`, vars: [['x', pyNum(r4(x))], ['lr', pyNum(lr)]], pic: { xs: [...xs] } })
  let asked = false
  for (let k = 0; k < steps; k++) {
    const s = slope(fn, x)
    frames.push({ line: L('return (f(x + h) - f(x - h)) / (2 * h)'), say: `The slope at x = ${r4(x)}: (f(x + h) − f(x − h)) / 2h ≈ ${r4(s)}. ${s > 0 ? 'Positive: downhill is to the left.' : s < 0 ? 'Negative: downhill is to the right.' : 'Zero: flat, the bottom.'}`, vars: [['x', pyNum(r4(x))], ['slope', pyNum(r4(s))]], pic: { xs: [...xs], tangent: { x, s } } })
    const nx = x - lr * s
    const ask = !asked && k === 1 ? {
      kind: 'number',
      teach: 'One step: **x − lr × slope**. Minus, because the slope points uphill and the step should go downhill.',
      prompt: `x = ${r4(x)}, slope = ${r4(s)}, lr = ${lr}. **What is the next x?**`,
      answer: r4(r4(x) - lr * r4(s)), tolerance: 2e-3,
      misconceptions: [{ answer: r4(r4(x) + lr * r4(s)), tolerance: 2e-3, feedback: 'Plus the slope walks uphill. Downhill is minus.' }],
      explain: `${r4(x)} − ${lr} × (${r4(s)}) = ${r4(nx)}. The slope is ${s < 0 ? 'negative, so subtracting it moves x to the right' : 'positive, so subtracting it moves x to the left'}: downhill, toward the bottom at 3.`,
    } : undefined
    if (ask) asked = true
    x = nx
    xs.push(x)
    frames.push({ line: L('x = x - lr * slope(f, x)'), say: `Step: x − ${lr} × ${r4(s)} = ${r4(x)}. f(x) is now ${r4(fn(x))}.`, vars: [['x', pyNum(r4(x))], ['xs', list(xs.slice(-6))]], pic: { xs: [...xs] }, ask })
  }
  frames.push({ line: L('return xs'), say: `After ${steps} steps x = ${r4(x)}, f(x) = ${r4(fn(x))}.`, vars: [['xs', list(xs.slice(-6))]], pic: { xs: [...xs] } })
  return { frames, result: xs }
}

// ---- forward and gradients: a network with two hidden units (lesson 14) ----
export function traceBackprop(params, x, target) {
  const L = lineFinder(`${PIECES.forward.code}\n\n${PIECES.gradients.code}`)
  const frames = []
  const [hidden, y] = forward(params, x)
  const g = gradients(params, x, target)
  const pre = params.w1.map((w, i) => w * x + params.b1[i])
  const base = { params, x, target }
  frames.push({ line: L('hidden = [math.tanh('), say: `Forward. Each hidden unit computes w·x + b and bends it with tanh: ${pre.map((z, i) => `tanh(${r4(params.w1[i])} × ${x} + ${r4(params.b1[i])}) = tanh(${r4(z)}) = ${r4(hidden[i])}`).join('; ')}.`, vars: [['x', pyNum(x)], ['hidden', list(hidden)]], pic: { ...base, hidden, stage: 'hidden' } })
  frames.push({ line: L('y = sum(v * h for v, h in zip(params["w2"], hidden)) + params["b2"]'), say: `The output adds the hidden values, weighted: ${hidden.map((h, i) => `${r4(params.w2[i])} × ${r4(h)}`).join(' + ')} + ${r4(params.b2)} = ${r4(y)}.`, vars: [['hidden', list(hidden)], ['y', pyNum(r4(y))]], pic: { ...base, hidden, y, stage: 'output' }, ask: {
    kind: 'number',
    teach: `The output is a weighted sum of the hidden values plus a bias: y = w2[0] × h[0] + w2[1] × h[1] + b2. Here h = ${list(hidden)}, w2 = ${list(params.w2)} and b2 = ${r4(params.b2)}.`,
    prompt: '**What is y?**',
    answer: r4(y), tolerance: 2e-3,
    explain: `${hidden.map((h, i) => `${r4(params.w2[i])} × ${r4(h)}`).join(' + ')} + ${r4(params.b2)} = ${r4(y)}.`,
  } })
  frames.push({ line: L('dy = 2 * (y - target)'), say: `Backward. The loss is (y − target)² = (${r4(y)} − ${target})² = ${r4((y - target) ** 2)}. Its slope with respect to y is 2 (y − target) = ${r4(g.b2)}: how much the loss changes per unit of y.`, vars: [['y', pyNum(r4(y))], ['target', pyNum(target)], ['dy', pyNum(r4(g.b2))]], pic: { ...base, hidden, y, stage: 'dy', g } })
  frames.push({ line: L('"w2": [dy * h for h in hidden], "b2": dy}'), say: `The output weights: y depends on w2[i] through w2[i] × h[i], so ∂loss/∂w2[i] = dy × h[i] = ${g.w2.map(r4).join(', ')}. The bias b2 adds 1 × itself, so its gradient is just dy.`, vars: [['grad w2', list(g.w2)], ['grad b2', pyNum(r4(g.b2))]], pic: { ...base, hidden, y, stage: 'w2', g }, ask: {
    kind: 'number',
    teach: '**The chain rule.** If y = w2 × h + ..., changing w2 by a little changes y by h times as much. The loss changes dy per unit of y. So ∂loss/∂w2 = dy × h.',
    prompt: `dy = ${r4(g.b2)} and h[0] = ${r4(hidden[0])}. **What is the gradient for w2[0]?**`,
    answer: r4(r4(g.b2) * r4(hidden[0])), tolerance: 2e-3,
    misconceptions: [{ answer: r4(g.b2), tolerance: 1e-3, feedback: 'That is the gradient for the bias b2. w2[0] is multiplied by h[0], so its gradient is dy × h[0].' }],
    explain: `${r4(g.b2)} × ${r4(hidden[0])} = ${r4(g.w2[0])}: how fast the loss changes at the output, times how much w2[0] moves the output.`,
  } })
  frames.push({ line: L('dz = [dy * v * (1 - h * h)'), say: `Into the hidden layer. The loss reaches hidden unit i through w2[i], so ∂loss/∂h[i] = dy × w2[i]. tanh bends things: its slope is 1 − tanh² = 1 − h². Multiply them: ${g.b1.map(r4).join(', ')}.`, vars: [['dz', list(g.b1)]], pic: { ...base, hidden, y, stage: 'dz', g } })
  frames.push({ line: L('return {"w1": [d * x for d in dz], "b1": dz,'), say: `Finally the first layer: z = w1·x + b1, so ∂loss/∂w1[i] = dz[i] × x = ${g.w1.map(r4).join(', ')} and ∂loss/∂b1[i] = dz[i]. Every weight now knows which way, and how hard, to move to make the loss smaller.`, vars: [['grad w1', list(g.w1)], ['grad b1', list(g.b1)]], pic: { ...base, hidden, y, stage: 'w1', g } })
  return { frames, result: g }
}

// ---- Replay: a memory of fixed size, sampled at random (lesson 15) ----
export function traceReplay(capacity, items, us) {
  const code = PIECES.Replay.code
  const L = lineFinder(code)
  const frames = []
  const mem = []
  let askedDrop = false, askedPick = false
  for (const it of items) {
    mem.push(it)
    frames.push({ line: L('self.items.append(item)'), say: `Add ${it}. The memory holds ${mem.length} item${mem.length === 1 ? '' : 's'} (capacity ${capacity}).`, vars: [['items', pyList(mem.map(String))]], pic: { mem: [...mem], capacity } })
    if (mem.length > capacity) {
      const ask = !askedDrop ? {
        kind: 'choice',
        teach: '`self.items.pop(0)` removes the item at position 0: the **oldest**, the one added first. New items always go on the end.',
        prompt: `The memory is ${pyList(mem.map(String))}, one over its capacity of ${capacity}. **Which item is removed?**`,
        options: mem.map(m => ({ text: String(m), why: m === mem[0] ? `${m} is at position 0, the oldest.` : `${m} is newer than ${mem[0]}; pop(0) removes the oldest.` })),
        answer: 0,
        explain: 'The memory always keeps the most recent experience: old experience is forgotten first.',
      } : undefined
      askedDrop = true
      const gone = mem.shift()
      frames.push({ line: L('self.items.pop(0)'), say: `Over capacity: drop the oldest, ${gone}.`, vars: [['items', pyList(mem.map(String))]], pic: { mem: [...mem], capacity, dropped: gone }, ask })
    }
  }
  const picks = []
  for (const u of us) {
    const k = Math.floor(u * mem.length)
    const ask = !askedPick ? {
      kind: 'choice',
      teach: `\`int(rng.random() * len(self.items))\` turns a random number u in [0, 1) into a position from 0 to ${mem.length - 1}: multiply by ${mem.length}, then drop the fraction.`,
      prompt: `u = ${u} and the memory is ${pyList(mem.map(String))}. **Which item is sampled?**`,
      options: mem.map((m, i) => ({ text: String(m), why: i === k ? `int(${u} × ${mem.length}) = ${k}, and position ${k} holds ${m}.` : `Position ${i} would need u between ${r4(i / mem.length)} and ${r4((i + 1) / mem.length)}.` })),
      answer: k,
      explain: 'Every item is equally likely to be picked, old or new, so a batch mixes experience from many different moments.',
    } : undefined
    askedPick = true
    picks.push(mem[k])
    frames.push({ line: L('return [self.items[int(rng.random() * len(self.items))]'), say: `u = ${u}: position int(${u} × ${mem.length}) = ${k}, item ${mem[k]}.`, vars: [['u', String(u)], ['batch so far', pyList(picks.map(String))]], pic: { mem: [...mem], capacity, picked: k }, ask })
  }
  return { frames, result: picks }
}
