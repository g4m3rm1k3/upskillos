// Pure discrete mathematics engine: logic, proofs, sets & relations, combinatorics, number theory &
// cryptography, sequences & recurrences, graph theory & trees, discrete probability & finite automata.
// Every lesson's `predict.compute()` and every figure & puzzle calls these functions so that tests
// verify all numbers and formulas end-to-end.

// ─── Part 1: Propositional & Predicate Logic ───────────────────────────────
export const implies = (p, q) => !p || Boolean(q)
export const iff = (p, q) => Boolean(p) === Boolean(q)
export const xor = (p, q) => Boolean(p) !== Boolean(q)

export function truthRows2(fn) {
  const out = []
  for (const p of [true, false]) for (const q of [true, false]) out.push({ p, q, value: Boolean(fn(p, q)) })
  return out
}

export function truthRows3(fn) {
  const out = []
  for (const p of [true, false]) for (const q of [true, false]) for (const r of [true, false]) {
    out.push({ p, q, r, value: Boolean(fn(p, q, r)) })
  }
  return out
}

export const countTrueRows2 = fn => truthRows2(fn).filter(r => r.value).length
export const countTrueRows3 = fn => truthRows3(fn).filter(r => r.value).length
export const isEquivalent2 = (f, g) => truthRows2((p, q) => f(p, q) === g(p, q)).every(r => r.value)
export const isEquivalent3 = (f, g) => truthRows3((p, q, r) => f(p, q, r) === g(p, q, r)).every(r => r.value)
export const forAll = (domain, pred) => domain.every(pred)
export const exists = (domain, pred) => domain.some(pred)
export const existsUnique = (domain, pred) => domain.filter(pred).length === 1

// ─── Part 2: Proofs, Counterexamples & Induction ───────────────────────────
export function smallestFactor(n) {
  if (n < 2) return n
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return d
  return n
}

export const isPrime = n => Number.isInteger(n) && n > 1 && smallestFactor(n) === n

export function firstCounterexample(claim, candidates) {
  for (const c of candidates) if (!claim(c)) return c
  return null
}

export function eulerPoly(n) {
  return n * n + n + 41
}

export function euclidConstruct(primes) {
  const q = primes.reduce((acc, p) => acc * p, 1) + 1
  return [q, smallestFactor(q)]
}

export const gaussSum = n => (n * (n + 1)) / 2
export const oddSum = n => n * n
export const sumOfSquares = n => (n * (n + 1) * (2 * n + 1)) / 6
export const sumOfCubes = n => ((n * (n + 1)) / 2) ** 2
export const geometricSum = (r, n) => (r === 1 ? n : (1 - r ** n) / (1 - r))

// Frobenius coin / postage stamp: can `amount` be made from stamps `a` and `b`?
export function canMakeStamp(amount, a = 4, b = 5) {
  for (let x = 0; x * a <= amount; x++) {
    if ((amount - x * a) % b === 0) return [x, (amount - x * a) / b]
  }
  return null
}

export const frobeniusNumber = (a, b) => a * b - a - b
export const trominoCount = n => ((2 ** n) ** 2 - 1) / 3

// ─── Part 3: Sets, Relations, Functions & Infinity ─────────────────────────
export const setUnion = (a, b) => [...new Set([...a, ...b])].sort((x, y) => x - y)
export const setIntersect = (a, b) => a.filter(x => b.includes(x)).sort((x, y) => x - y)
export const setDiff = (a, b) => a.filter(x => !b.includes(x)).sort((x, y) => x - y)
export const setSymDiff = (a, b) => setUnion(setDiff(a, b), setDiff(b, a))
export const isSubset = (a, b) => a.every(x => b.includes(x))
export const powerSetSize = n => 2 ** n
export const cartesianSize = (m, n) => m * n

export function powerSet(items) {
  const res = [[]]
  for (const item of items) {
    const len = res.length
    for (let i = 0; i < len; i++) res.push([...res[i], item])
  }
  return res
}

export const functionsCount = (mDomain, nCodomain) => nCodomain ** mDomain

export function injectionsCount(mDomain, nCodomain) {
  if (mDomain > nCodomain) return 0
  let p = 1
  for (let i = 0; i < mDomain; i++) p *= nCodomain - i
  return p
}

export function stirlingSecond(n, k) {
  if (n === 0 && k === 0) return 1
  if (n === 0 || k <= 0 || k > n) return 0
  if (k === 1 || k === n) return 1
  return k * stirlingSecond(n - 1, k) + stirlingSecond(n - 1, k - 1)
}

export function bellNumber(n) {
  let sum = 0
  for (let k = 0; k <= n; k++) sum += stirlingSecond(n, k)
  return sum
}

export const surjectionsCount = (mDomain, nCodomain) => factorial(nCodomain) * stirlingSecond(mDomain, nCodomain)

// Matrix `M` is n×n of 0/1 booleans representing relation R on {0..n-1}.
export function relationProps(M) {
  const n = M.length
  let reflexive = true, irreflexive = true, symmetric = true, antisymmetric = true, transitive = true
  for (let i = 0; i < n; i++) {
    if (!M[i][i]) reflexive = false
    if (M[i][i]) irreflexive = false
    for (let j = 0; j < n; j++) {
      if (Boolean(M[i][j]) !== Boolean(M[j][i])) symmetric = false
      if (i !== j && M[i][j] && M[j][i]) antisymmetric = false
      if (M[i][j]) {
        for (let k = 0; k < n; k++) if (M[j][k] && !M[i][k]) transitive = false
      }
    }
  }
  return {
    reflexive, irreflexive, symmetric, antisymmetric, transitive,
    equivalence: reflexive && symmetric && transitive,
    partialOrder: reflexive && antisymmetric && transitive,
  }
}

export function transitiveClosure(M) {
  const n = M.length, W = M.map(row => row.map(Boolean))
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) W[i][j] = W[i][j] || (W[i][k] && W[k][j])
    }
  }
  return W
}

// Cantor pairing function N × N → N
export const cantorPair = (x, y) => ((x + y) * (x + y + 1)) / 2 + y

// ─── Part 4: Combinatorics & Counting ──────────────────────────────────────
export function factorial(n) {
  if (n < 0) return 0
  let p = 1
  for (let k = 2; k <= n; k++) p *= k
  return p
}

export function perm(n, k) {
  if (k < 0 || k > n) return 0
  let p = 1
  for (let i = 0; i < k; i++) p *= n - i
  return p
}

export function choose(n, k) {
  if (k < 0 || k > n) return 0
  const m = Math.min(k, n - k)
  let r = 1
  for (let i = 1; i <= m; i++) r = (r * (n - m + i)) / i
  return Math.round(r)
}

export function pascalTriangle(rows) {
  return Array.from({ length: rows }, (_, n) => Array.from({ length: n + 1 }, (__, k) => choose(n, k)))
}

export function multinomial(counts) {
  const total = counts.reduce((s, c) => s + c, 0)
  return counts.reduce((acc, c) => acc / factorial(c), factorial(total))
}

export const starsAndBars = (nItems, kBins) => choose(nItems + kBins - 1, kBins - 1)
export const inclusionExclusion2 = (a, b, ab) => a + b - ab
export const inclusionExclusion3 = (a, b, c, ab, ac, bc, abc) => a + b + c - ab - ac - bc + abc

export function derangements(n) {
  if (n === 0) return 1
  if (n === 1) return 0
  let sum = 0
  for (let k = 0; k <= n; k++) sum += (k % 2 === 0 ? 1 : -1) * (factorial(n) / factorial(k))
  return Math.round(sum)
}

export const pigeonholeMin = (items, boxes) => Math.ceil(items / boxes)
export const catalan = n => choose(2 * n, n) / (n + 1)

export function latticePaths(width, height, blocked = []) {
  const isBlocked = (x, y) => blocked.some(([bx, by]) => bx === x && by === y)
  const dp = Array.from({ length: height + 1 }, () => Array(width + 1).fill(0))
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x <= width; x++) {
      if (isBlocked(x, y)) { dp[y][x] = 0; continue }
      if (x === 0 && y === 0) { dp[y][x] = 1; continue }
      dp[y][x] = (x > 0 ? dp[y][x - 1] : 0) + (y > 0 ? dp[y - 1][x] : 0)
    }
  }
  return dp
}

// ─── Part 5: Number Theory & Cryptography ──────────────────────────────────
export function divMod(a, d) {
  const r = ((a % d) + Math.abs(d)) % Math.abs(d)
  const q = (a - r) / d
  return [q, r]
}

export function primeFactors(n) {
  const out = []
  let m = Math.floor(Math.abs(n))
  for (let d = 2; d * d <= m; d++) {
    let exp = 0
    while (m % d === 0) { exp++; m /= d }
    if (exp > 0) out.push([d, exp])
  }
  if (m > 1) out.push([m, 1])
  return out
}

export const divisorCount = n => primeFactors(n).reduce((p, [, e]) => p * (e + 1), 1)
export const divisorSum = n => primeFactors(n).reduce((p, [prime, e]) => p * ((prime ** (e + 1) - 1) / (prime - 1)), 1)

export function gcd(a, b) {
  let x = Math.abs(a), y = Math.abs(b)
  while (y !== 0) [x, y] = [y, x % y]
  return x
}

export const lcm = (a, b) => (a === 0 || b === 0 ? 0 : Math.abs((a / gcd(a, b)) * b))

export function euclidSteps(a, b) {
  const steps = []
  let x = Math.abs(a), y = Math.abs(b)
  while (y > 0) {
    const q = Math.floor(x / y), r = x % y
    steps.push({ a: x, b: y, q, r })
    x = y; y = r
  }
  return steps
}

// Extended Euclidean algorithm: returns [g, x, y] with a*x + b*y = g = gcd(a, b)
export function extGcd(a, b) {
  if (b === 0) return [a, 1, 0]
  const [g, x1, y1] = extGcd(b, a % b)
  return [g, y1, x1 - Math.floor(a / b) * y1]
}

export const mod = (a, m) => ((a % m) + m) % m

export function modPow(base, exp, m) {
  if (m === 1) return 0
  let result = 1, b = mod(base, m), e = Math.floor(exp)
  while (e > 0) {
    if (e % 2 === 1) result = (result * b) % m
    b = (b * b) % m
    e = Math.floor(e / 2)
  }
  return result
}

export function modInverse(a, m) {
  const [g, x] = extGcd(mod(a, m), m)
  return g === 1 ? mod(x, m) : null
}

export function totient(n) {
  let result = n
  for (const [p] of primeFactors(n)) result = (result / p) * (p - 1)
  return Math.round(result)
}

export function crtSolve(remainders, moduli) {
  const M = moduli.reduce((p, m) => p * m, 1)
  let x = 0
  for (let i = 0; i < moduli.length; i++) {
    const Mi = M / moduli[i]
    const yi = modInverse(Mi, moduli[i])
    if (yi === null) return null
    x = (x + remainders[i] * Mi * yi) % M
  }
  return mod(x, M)
}

export function rsaDemo(p, q, e, msg) {
  const N = p * q, phi = (p - 1) * (q - 1)
  const d = modInverse(e, phi)
  const cipher = modPow(msg, e, N)
  const plain = d !== null ? modPow(cipher, d, N) : null
  return { N, phi, e, d, msg, cipher, plain }
}

// ─── Part 6: Sequences, Recurrences & Asymptotics ──────────────────────────
export const arithmeticSum = (a1, d, n) => (n * (2 * a1 + (n - 1) * d)) / 2
export const telescopingPartial = n => n / (n + 1)

export function fib(n) {
  let a = 0, b = 1
  for (let i = 0; i < n; i++) [a, b] = [b, a + b]
  return a
}

export const hanoiMoves = n => 2 ** n - 1

// Solves a_n = c1*a_{n-1} + c2*a_{n-2} by step-by-step iteration
export function recurrenceSeq(c1, c2, a0, a1, count) {
  const out = [a0, a1]
  for (let i = 2; i < count; i++) out.push(c1 * out[i - 1] + c2 * out[i - 2])
  return out.slice(0, count)
}

export function masterExponent(a, b) {
  return Math.log(a) / Math.log(b)
}

// ─── Part 7: Graph Theory, Trees & Networks ────────────────────────────────
export const handshakeEdges = degrees => degrees.reduce((s, d) => s + d, 0) / 2
export const completeEdges = n => (n * (n - 1)) / 2
export const bipartiteEdges = (m, n) => m * n
export const hypercubeVertices = d => 2 ** d
export const hypercubeEdges = d => d * 2 ** (d - 1)
export const treeEdges = n => Math.max(0, n - 1)
export const cayleyTrees = n => (n <= 1 ? 1 : n ** (n - 2))
export const planarFaces = (v, e) => 2 - v + e
export const planarMaxEdges = v => (v >= 3 ? 3 * v - 6 : completeEdges(v))
export const bipartitePlanarMaxEdges = v => (v >= 3 ? 2 * v - 4 : completeEdges(v))
export const cycleChromatic = n => (n % 2 === 0 ? 2 : 3)
export const wheelChromatic = nSpokes => (nSpokes % 2 === 0 ? 3 : 4)

export function matMul(A, B) {
  const n = A.length
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => A[i].reduce((s, v, k) => s + v * B[k][j], 0)),
  )
}

export function matPow(A, k) {
  const n = A.length
  let res = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 1 : 0)))
  let base = A
  for (let p = 0; p < k; p++) res = matMul(res, base)
  return res
}

export function eulerStatus(degrees) {
  const odd = degrees.filter(d => d % 2 === 1).length
  if (odd === 0) return 'circuit'
  if (odd === 2) return 'trail'
  return 'none'
}

// Kruskal's MST on edges [{ u, v, w }] over vertices 0..n-1
export function kruskalMst(n, edges) {
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = x => (parent[x] === x ? x : (parent[x] = find(parent[x])))
  const sorted = [...edges].sort((a, b) => a.w - b.w)
  const chosen = []
  let totalWeight = 0
  for (const e of sorted) {
    const ru = find(e.u), rv = find(e.v)
    if (ru !== rv) {
      parent[ru] = rv
      chosen.push(e)
      totalWeight += e.w
    }
  }
  return { chosen, totalWeight }
}

// ─── Part 8: Discrete Probability, Boolean Circuits & Automata ─────────────
export function binomialPmf(k, n, p) {
  return choose(n, k) * p ** k * (1 - p) ** (n - k)
}

export function bayesPosterior(prior, sensitivity, falsePositiveRate) {
  const pPos = prior * sensitivity + (1 - prior) * falsePositiveRate
  return (prior * sensitivity) / pPos
}

export function harmonicNumber(n) {
  let s = 0
  for (let k = 1; k <= n; k++) s += 1 / k
  return s
}

export const couponCollectorExpected = n => n * harmonicNumber(n)

export function birthdayCollisionProb(k, m = 365) {
  let noCollision = 1
  for (let i = 0; i < k; i++) noCollision *= (m - i) / m
  return 1 - noCollision
}

// DFA runner: transitions[state][symbol], startState, acceptStates (array), inputString
export function runDfa(transitions, startState, acceptStates, input) {
  let state = startState
  const trace = [state]
  for (const ch of input) {
    state = transitions[state]?.[ch]
    if (state === undefined) return { accepted: false, finalState: null, trace }
    trace.push(state)
  }
  return { accepted: acceptStates.includes(state), finalState: state, trace }
}
