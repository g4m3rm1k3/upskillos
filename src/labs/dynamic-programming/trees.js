// Recursion trees for the "break it down" view (CallTree.jsx). Each tree is the plain recursive
// definition of a lesson's recurrence: what a state asks (children), how it combines the answers
// (combine), and how a state is written (label). buildTree runs it depth-first, with or without a
// memo, and records every call and return so the view can replay them.
//
// trees.test.js checks every root value against the matching live table in tables.js, so the tree
// and the table can never disagree.

const sum = xs => xs.reduce((a, b) => a + b, 0)

export const TREES = {
  fibonacci: {
    params: [{ key: 'n', label: 'n', min: 2, max: 9, value: 5 }],
    question: 'F(n) asks for F(n − 1) and F(n − 2).',
    root: ({ n }) => n,
    label: n => `F(${n})`,
    children: n => (n < 2 ? [] : [n - 1, n - 2]),
    combine: (n, vs) => (n < 2 ? n : sum(vs)),
  },
  stairs: {
    params: [{ key: 'n', label: 'Height', min: 1, max: 8, value: 5 }],
    fixed: 'Step sizes {1, 2}.',
    question: 'To stand on stair h, the last step came from h − 1 or h − 2.',
    root: ({ n }) => n,
    label: h => `W(${h})`,
    children: h => [1, 2].filter(s => s <= h).map(s => h - s),
    combine: (h, vs) => (h === 0 ? 1 : sum(vs)),
  },
  'house-robber': {
    params: [{ key: 'n', label: 'Houses', min: 1, max: 7, value: 5 }],
    fixed: 'Values 3, 2, 6, 4, 5, 1, 7 (the first n of them).',
    question: 'The best from the first i houses: skip house i (ask B(i − 1)) or take it (ask B(i − 2)).',
    data: [3, 2, 6, 4, 5, 1, 7],
    root: ({ n }) => n,
    label: i => `B(${i})`,
    children: i => (i <= 0 ? [] : i === 1 ? [0] : [i - 1, i - 2]),
    combine(i, vs) { return i <= 0 ? 0 : i === 1 ? Math.max(vs[0], this.data[0]) : Math.max(vs[0], this.data[i - 1] + vs[1]) },
  },
  'grid-paths': {
    params: [{ key: 'rows', label: 'Rows', min: 1, max: 4, value: 3 }, { key: 'cols', label: 'Columns', min: 1, max: 5, value: 3 }],
    question: 'A path into (r, c) arrived from above, (r − 1, c), or from the left, (r, c − 1).',
    root: ({ rows, cols }) => [rows - 1, cols - 1],
    label: ([r, c]) => `P(${r},${c})`,
    children: ([r, c]) => [...(r ? [[r - 1, c]] : []), ...(c ? [[r, c - 1]] : [])],
    combine: ([r, c], vs) => (!r && !c ? 1 : sum(vs)),
  },
  binomial: {
    params: [{ key: 'n', label: 'n', min: 1, max: 7, value: 5 }, { key: 'k', label: 'k', min: 0, max: 7, value: 2 }],
    question: 'Choose k from n: item n is in (choose k − 1 from n − 1) or out (choose k from n − 1).',
    root: ({ n, k }) => [n, Math.min(k, n)],
    label: ([n, k]) => `C(${n},${k})`,
    children: ([n, k]) => (k === 0 || k === n ? [] : [[n - 1, k - 1], [n - 1, k]]),
    combine: ([n, k], vs) => (k === 0 || k === n ? 1 : sum(vs)),
  },
  'coin-min': {
    params: [{ key: 'amount', label: 'Amount', min: 1, max: 8, value: 6 }],
    fixed: 'Coins {1, 3, 4}.',
    question: 'The last coin was 1, 3 or 4: ask for the amount left before it.',
    coins: [1, 3, 4],
    root: ({ amount }) => amount,
    label: a => `D(${a})`,
    children(a) { return this.coins.filter(c => c <= a).map(c => a - c) },
    combine: (a, vs) => (a === 0 ? 0 : 1 + Math.min(...vs)),
  },
  'zero-one-knapsack': {
    params: [{ key: 'capacity', label: 'Capacity', min: 1, max: 8, value: 6 }],
    fixed: 'Items (w2, v3), (w3, v5), (w4, v6).',
    question: 'Item i is skipped (ask D(i − 1, c)) or, if it fits, taken (ask D(i − 1, c − wᵢ)).',
    w: [2, 3, 4], v: [3, 5, 6],
    root: ({ capacity }) => [3, capacity],
    label: ([i, c]) => `D(${i},${c})`,
    children([i, c]) { return i === 0 ? [] : [[i - 1, c], ...(this.w[i - 1] <= c ? [[i - 1, c - this.w[i - 1]]] : [])] },
    combine([i], vs) { return i === 0 ? 0 : vs.length === 1 ? vs[0] : Math.max(vs[0], this.v[i - 1] + vs[1]) },
  },
  'decode-ways': {
    params: [{ key: 'n', label: 'Digits used', min: 1, max: 7, value: 5 }],
    fixed: 'The digits “1212121” (the first n of them).',
    question: 'The last letter used one digit (ask D(i − 1)) or two (ask D(i − 2)), if those digits make a letter.',
    s: '1212121',
    root: ({ n }) => n,
    label: i => `D(${i})`,
    children(i) {
      if (i === 0) return []
      const out = this.s[i - 1] !== '0' ? [i - 1] : []
      const pair = Number(this.s.slice(i - 2, i))
      return i >= 2 && this.s[i - 2] !== '0' && pair >= 10 && pair <= 26 ? [...out, i - 2] : out
    },
    combine: (i, vs) => (i === 0 ? 1 : sum(vs)),
  },
  catalan: {
    params: [{ key: 'n', label: 'Pairs', min: 1, max: 5, value: 4 }],
    question: 'The first “(” closes around k pairs, and m − 1 − k pairs follow: ask C(k) and C(m − 1 − k) for every k.',
    root: ({ n }) => n,
    label: m => `C(${m})`,
    children: m => Array.from({ length: m }, (_, k) => [k, m - 1 - k]).flat(),
    combine: (m, vs) => (m === 0 ? 1 : sum(Array.from({ length: m }, (_, k) => vs[2 * k] * vs[2 * k + 1]))),
  },
  lcs: {
    params: [{ key: 'n', label: 'Letters of each', min: 1, max: 4, value: 3 }],
    fixed: 'Prefixes of “abcb” and “bacb”.',
    question: 'If the last letters match, ask D(i − 1, j − 1). If not, drop one last letter or the other: ask D(i − 1, j) and D(i, j − 1).',
    a: 'abcb', b: 'bacb',
    root: ({ n }) => [n, n],
    label: ([i, j]) => `D(${i},${j})`,
    children([i, j]) { return i === 0 || j === 0 ? [] : this.a[i - 1] === this.b[j - 1] ? [[i - 1, j - 1]] : [[i - 1, j], [i, j - 1]] },
    combine([i, j], vs) { return i === 0 || j === 0 ? 0 : vs.length === 1 ? 1 + vs[0] : Math.max(...vs) },
  },
  'edit-distance': {
    params: [{ key: 'n', label: 'Letters of each', min: 1, max: 3, value: 2 }],
    fixed: 'Prefixes of “cat” and “cut”.',
    question: 'The last edit was a delete E(i − 1, j), an insert E(i, j − 1), or a match/substitute E(i − 1, j − 1).',
    a: 'cat', b: 'cut',
    root: ({ n }) => [n, n],
    label: ([i, j]) => `E(${i},${j})`,
    children: ([i, j]) => (i === 0 || j === 0 ? [] : [[i - 1, j], [i, j - 1], [i - 1, j - 1]]),
    combine([i, j], vs) { return i === 0 ? j : j === 0 ? i : Math.min(vs[0] + 1, vs[1] + 1, vs[2] + (this.a[i - 1] === this.b[j - 1] ? 0 : 1)) },
  },
}

// Which tree each lesson shows. Lessons about recursion and memoization use Fibonacci.
export const TREE_FOR = {
  'recursive-trees': 'fibonacci', overlap: 'fibonacci', memoization: 'fibonacci', tabulation: 'fibonacci',
  fibonacci: 'fibonacci', stairs: 'stairs', 'house-robber': 'house-robber', 'grid-paths': 'grid-paths',
  binomial: 'binomial', 'coin-min': 'coin-min', 'zero-one-knapsack': 'zero-one-knapsack', 'decode-ways': 'decode-ways',
  catalan: 'catalan', lcs: 'lcs', 'edit-distance': 'edit-distance',
}

export const MAX_NODES = 160

// Runs the recursion depth-first. Returns the nodes (in call order), the events (call/return, in
// order) and the root value. With memo, a state already answered becomes a cached leaf.
// Stops counting at `limit` calls and reports `tooBig`.
export function buildTree(spec, input, { memo = false, limit = MAX_NODES } = {}) {
  const nodes = [], events = [], answered = new Map()
  let tooBig = false, calls = 0
  function visit(state, parent, depth) {
    const label = spec.label(state)
    const node = { id: nodes.length, label, state, parent, depth, children: [], value: null, cached: false }
    nodes.push(node); calls++
    if (parent !== null) nodes[parent].children.push(node.id)
    events.push({ type: 'call', node: node.id })
    if (memo && answered.has(label)) {
      node.cached = true; node.value = answered.get(label)
      events.push({ type: 'return', node: node.id }); return node.value
    }
    if (calls > limit) { tooBig = true; node.value = NaN; return NaN }
    const vs = spec.children(state).map(s => visit(s, node.id, depth + 1))
    node.value = spec.combine(state, vs)
    answered.set(label, node.value)
    events.push({ type: 'return', node: node.id })
    return node.value
  }
  const value = visit(spec.root(input), null, 0)
  return { nodes, events, value, tooBig }
}

// How many calls the plain recursion makes, counted without drawing anything (for big inputs).
export function countCalls(spec, input, cap = 1e6) {
  let calls = 0
  const go = s => { if (++calls > cap) return; spec.children(s).forEach(go) }
  go(spec.root(input))
  return calls
}

// x positions: leaves left to right in call order, a parent centred over its children.
export function layout(nodes) {
  let next = 0
  const x = new Array(nodes.length)
  const place = id => {
    const n = nodes[id]
    if (!n.children.length) { x[id] = next++; return x[id] }
    const xs = n.children.map(place)
    x[id] = (xs[0] + xs[xs.length - 1]) / 2
    return x[id]
  }
  if (nodes.length) place(0)
  return { x, width: next }
}
