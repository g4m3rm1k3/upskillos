// Reference solutions explained line by line for the probabilistic lessons (Specialist, probabilistic
// group). Format: explained.js. The same code is the lessons' test reference (specialist-solutions.js).
// Every answer is an exact fraction "p/q": Python's Fraction, and BigInt pairs in JavaScript.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

// The JavaScript fraction helpers every solution here starts with: [numerator, denominator] as BigInts.
const FRACTIONS = `  const gcd = (a, b) => { a = a < 0n ? -a : a; while (b) [a, b] = [b, a % b]; return a }
  const F = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d } const g = gcd(n, d) || 1n; return [n / g, d / g] }
  const add = (x, y) => F(x[0] * y[1] + y[0] * x[1], x[1] * y[1])
  const sub = (x, y) => F(x[0] * y[1] - y[0] * x[1], x[1] * y[1])
  const mul = (x, y) => F(x[0] * y[0], x[1] * y[1])
  const div = (x, y) => F(x[0] * y[1], x[1] * y[0])`

const CODE = {
  'probability-distribution': pair(`from fractions import Fraction

def solve(n, s, t):
    ways = [1]
    for _ in range(n):
        nxt = [0] * (len(ways) + s)
        for total, count in enumerate(ways):
            if count:
                for face in range(1, s + 1):
                    nxt[total + face] += count
        ways = nxt
    p = Fraction(ways[t] if t < len(ways) else 0, s ** n)
    return f"{p.numerator}/{p.denominator}"
`, `function solve(n, s, t) {
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a }
  let ways = [1n]
  for (let i = 0; i < n; i++) {
    const nxt = new Array(ways.length + s).fill(0n)
    ways.forEach((count, total) => {
      if (count) for (let face = 1; face <= s; face++) nxt[total + face] += count
    })
    ways = nxt
  }
  const top = t < ways.length ? ways[t] : 0n, bottom = BigInt(s) ** BigInt(n)
  const g = gcd(top, bottom)
  return \`\${top / g}/\${bottom / g}\`
}`),

  'poisson-binomial': pair(`from fractions import Fraction

def solve(p, k):
    dist = [1]
    for q in p:
        nxt = [0] * (len(dist) + 1)
        for j, mass in enumerate(dist):
            nxt[j] += mass * (100 - q)
            nxt[j + 1] += mass * q
        dist = nxt
    x = Fraction(dist[k] if k < len(dist) else 0, 100 ** len(p))
    return f"{x.numerator}/{x.denominator}"
`, `function solve(p, k) {
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a }
  let dist = [1n]
  for (const q of p) {
    const nxt = new Array(dist.length + 1).fill(0n)
    dist.forEach((mass, j) => {
      nxt[j] += mass * BigInt(100 - q)
      nxt[j + 1] += mass * BigInt(q)
    })
    dist = nxt
  }
  const top = k < dist.length ? dist[k] : 0n, bottom = 100n ** BigInt(p.length)
  const g = gcd(top, bottom)
  return \`\${top / g}/\${bottom / g}\`
}`),

  'expected-time': pair(`from fractions import Fraction

def solve(faces, n):
    E = [Fraction(0)] * (n + 1)
    for d in range(1, n + 1):
        E[d] = 1 + sum(E[max(0, d - f)] for f in faces) / len(faces)
    return f"{E[n].numerator}/{E[n].denominator}"
`, `function solve(faces, n) {
${FRACTIONS}
  const E = [F(0n)]
  for (let d = 1; d <= n; d++) {
    let total = F(0n)
    for (const f of faces) total = add(total, E[Math.max(0, d - f)])
    E.push(add(F(1n), div(total, F(BigInt(faces.length)))))
  }
  return \`\${E[n][0]}/\${E[n][1]}\`
}`),

  'self-loops': pair(`from fractions import Fraction

def solve(n, s):
    E = [Fraction(0)] * (n + 1)
    for d in range(1, n + 1):
        fits = min(s, d)
        E[d] = (s + sum(E[d - f] for f in range(1, fits + 1))) / Fraction(fits)
    return f"{E[n].numerator}/{E[n].denominator}"
`, `function solve(n, s) {
${FRACTIONS}
  const E = [F(0n)]
  for (let d = 1; d <= n; d++) {
    const fits = Math.min(s, d)
    let total = F(BigInt(s))
    for (let f = 1; f <= fits; f++) total = add(total, E[d - f])
    E.push(div(total, F(BigInt(fits))))
  }
  return \`\${E[n][0]}/\${E[n][1]}\`
}`),

  'cyclic-expectations': pair(`from fractions import Fraction

def solve(n, s, jumps):
    to = dict(jumps)
    A = [[Fraction(0)] * (n + 1) for _ in range(n)]
    for i in range(n):
        A[i][i] += 1
        if i in to:
            if to[i] < n:
                A[i][to[i]] -= 1
            continue
        A[i][n] = Fraction(1)
        for f in range(1, s + 1):
            j = i + f if i + f <= n else i
            if j < n:
                A[i][j] -= Fraction(1, s)
    for col in range(n):
        pivot = next(r for r in range(col, n) if A[r][col] != 0)
        A[col], A[pivot] = A[pivot], A[col]
        for r in range(n):
            if r != col and A[r][col] != 0:
                factor = A[r][col] / A[col][col]
                A[r] = [x - factor * y for x, y in zip(A[r], A[col])]
    e = A[0][n] / A[0][0]
    return f"{e.numerator}/{e.denominator}"
`, `function solve(n, s, jumps) {
${FRACTIONS}
  const to = new Map(jumps)
  const A = Array.from({ length: n }, () => Array.from({ length: n + 1 }, () => F(0n)))
  for (let i = 0; i < n; i++) {
    A[i][i] = add(A[i][i], F(1n))
    if (to.has(i)) {
      if (to.get(i) < n) A[i][to.get(i)] = sub(A[i][to.get(i)], F(1n))
      continue
    }
    A[i][n] = F(1n)
    for (let f = 1; f <= s; f++) {
      const j = i + f <= n ? i + f : i
      if (j < n) A[i][j] = sub(A[i][j], F(1n, BigInt(s)))
    }
  }
  for (let col = 0; col < n; col++) {
    let pivot = col
    while (A[pivot][col][0] === 0n) pivot++
    ;[A[col], A[pivot]] = [A[pivot], A[col]]
    for (let r = 0; r < n; r++) {
      if (r !== col && A[r][col][0] !== 0n) {
        const factor = div(A[r][col], A[col][col])
        A[r] = A[r].map((x, c) => sub(x, mul(factor, A[col][c])))
      }
    }
  }
  const e = div(A[0][n], A[0][0])
  return \`\${e[0]}/\${e[1]}\`
}`),

  'coupon-collector': pair(`from fractions import Fraction

def solve(w):
    n, W = len(w), sum(w)
    full = (1 << n) - 1
    E = [Fraction(0)] * (1 << n)
    for S in range(full - 1, -1, -1):
        have = sum(w[i] for i in range(n) if S >> i & 1)
        total = Fraction(W)
        for i in range(n):
            if not S >> i & 1:
                total += w[i] * E[S | 1 << i]
        E[S] = total / (W - have)
    return f"{E[0].numerator}/{E[0].denominator}"
`, `function solve(w) {
${FRACTIONS}
  const n = w.length, W = w.reduce((a, b) => a + b, 0), full = (1 << n) - 1
  const E = new Array(1 << n).fill(F(0n))
  for (let S = full - 1; S >= 0; S--) {
    let have = 0
    for (let i = 0; i < n; i++) if ((S >> i) & 1) have += w[i]
    let total = F(BigInt(W))
    for (let i = 0; i < n; i++) {
      if (!((S >> i) & 1)) total = add(total, mul(F(BigInt(w[i])), E[S | (1 << i)]))
    }
    E[S] = div(total, F(BigInt(W - have)))
  }
  return \`\${E[0][0]}/\${E[0][1]}\`
}`),

  'moments': pair(`from fractions import Fraction

def solve(faces, n):
    E = [Fraction(0)] * (n + 1)
    S = [Fraction(0)] * (n + 1)
    k = len(faces)
    for d in range(1, n + 1):
        nxt = [max(0, d - f) for f in faces]
        E[d] = 1 + sum(E[j] for j in nxt) / k
        S[d] = 1 + 2 * sum(E[j] for j in nxt) / k + sum(S[j] for j in nxt) / k
    v = S[n] - E[n] ** 2
    return f"{v.numerator}/{v.denominator}"
`, `function solve(faces, n) {
${FRACTIONS}
  const E = [F(0n)], S = [F(0n)], k = F(BigInt(faces.length))
  for (let d = 1; d <= n; d++) {
    let e = F(0n), s = F(0n)
    for (const f of faces) { e = add(e, E[Math.max(0, d - f)]); s = add(s, S[Math.max(0, d - f)]) }
    E.push(add(F(1n), div(e, k)))
    S.push(add(add(F(1n), div(mul(F(2n), e), k)), div(s, k)))
  }
  const v = sub(S[n], mul(E[n], E[n]))
  return \`\${v[0]}/\${v[1]}\`
}`),

  'conditional-dp': pair(`from fractions import Fraction

def solve(n, p):
    endT, endH = 1, 0
    headsT, headsH = 0, 0
    for _ in range(n):
        endT, endH, headsT, headsH = (
            (endT + endH) * (100 - p),
            endT * p,
            (headsT + headsH) * (100 - p),
            (headsT + endT) * p,
        )
    x = Fraction(headsT + headsH, endT + endH)
    return f"{x.numerator}/{x.denominator}"
`, `function solve(n, p) {
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a }
  const q = BigInt(100 - p), P = BigInt(p)
  let endT = 1n, endH = 0n, headsT = 0n, headsH = 0n
  for (let i = 0; i < n; i++) {
    ;[endT, endH, headsT, headsH] = [(endT + endH) * q, endT * P, (headsT + headsH) * q, (headsT + endT) * P]
  }
  const top = headsT + headsH, bottom = endT + endH, g = gcd(top, bottom)
  return \`\${top / g}/\${bottom / g}\`
}`),

  'stochastic-control': pair(`from fractions import Fraction

def solve(a, b, p):
    n = len(a)
    V = [Fraction(0)] * (n + 2)
    for i in range(n - 1, -1, -1):
        safe = a[i] + V[i + 1]
        risky = Fraction(100 * b[i], p[i]) + V[i + 2]
        V[i] = min(safe, risky)
    return f"{V[0].numerator}/{V[0].denominator}"
`, `function solve(a, b, p) {
${FRACTIONS}
  const n = a.length, V = new Array(n + 2).fill(F(0n))
  const less = (x, y) => x[0] * y[1] < y[0] * x[1]
  for (let i = n - 1; i >= 0; i--) {
    const safe = add(F(BigInt(a[i])), V[i + 1])
    const risky = add(F(BigInt(100 * b[i]), BigInt(p[i])), V[i + 2])
    V[i] = less(risky, safe) ? risky : safe
  }
  return \`\${V[0][0]}/\${V[0][1]}\`
}`),
}

const FRACTION_NOTE = ['from fractions import Fraction', 'const F = (n, d = 1n) =>', 'Exact fractions: Python has them built in; the JavaScript keeps [numerator, denominator] as BigInts, always in lowest terms.']

export const PROB_EXPLAINED = {
  'probability-distribution': {
    code: CODE['probability-distribution'],
    notes: [
      ['ways = [1]', 'let ways = [1n]', 'No dice yet: one outcome, the empty one, with sum 0. Counts, not chances, so everything stays a whole number.'],
      ['nxt = [0] * (len(ways) + s)', 'const nxt = new Array(ways.length + s).fill(0n)', 'One more die raises the largest possible sum by s.'],
      ['nxt[total + face] += count', 'nxt[total + face] += count', 'Every outcome reaching total, followed by this face, is an outcome reaching total + face: W(i, x) adds W(i − 1, x − f).'],
      ['p = Fraction(ways[t] if t < len(ways) else 0, s ** n)', 'bottom = BigInt(s) ** BigInt(n)', 'All sⁿ outcomes are equally likely, so the chance is a count over sⁿ. A sum past n · s has no outcomes.'],
      ['return f"{p.numerator}/{p.denominator}"', 'const g = gcd(top, bottom)', 'Lowest terms: Fraction reduces itself; in JavaScript both parts are divided by their greatest common divisor.'],
    ],
    math: [
      ['W(i − 1, x)', 'count', 'count', 'the outcomes of the dice before this one that add up to x (total in the code)'],
      ['sⁿ', 's ** n', 'BigInt(s) ** BigInt(n)', 'the number of equally likely outcomes'],
    ],
  },

  'poisson-binomial': {
    code: CODE['poisson-binomial'],
    notes: [
      ['dist = [1]', 'let dist = [1n]', 'No trials: 0 successes, for sure. The masses are kept as whole numbers of hundredths.'],
      ['for q in p:', 'for (const q of p) {', 'One trial at a time, each with its own chance q percent: that is what a binomial coefficient can’t handle.'],
      ['nxt[j] += mass * (100 - q)', 'nxt[j] += mass * BigInt(100 - q)', 'The trial fails, with chance (100 − q)/100: j successes stay j.'],
      ['nxt[j + 1] += mass * q', 'nxt[j + 1] += mass * BigInt(q)', 'It succeeds: one more. Two histories reaching the same count are disjoint events, so their chances add.'],
      ['x = Fraction(dist[k] if k < len(dist) else 0, 100 ** len(p))', 'bottom = 100n ** BigInt(p.length)', 'Each trial multiplied by a number of hundredths, so divide by 100ⁿ once, at the end.'],
    ],
    math: [
      ['P(i − 1, j) · 100ⁱ⁻¹', 'mass', 'mass', 'the chance of j successes in the trials so far, in whole hundredths'],
      ['q / 100', 'q', 'q', 'the chance that this trial succeeds'],
    ],
  },

  'expected-time': {
    code: CODE['expected-time'],
    notes: [
      FRACTION_NOTE,
      ['E = [Fraction(0)] * (n + 1)', 'const E = [F(0n)]', 'E(0) = 0: at the end, no more rolls.'],
      ['for d in range(1, n + 1):', 'for (let d = 1; d <= n; d++) {', 'Every roll moves at least one square, so E(d) only reads smaller distances: fill upwards.'],
      ['E[max(0, d - f)]', 'E[Math.max(0, d - f)]', 'Face f leaves d − f to go; passing the end is the same as reaching it, 0.'],
      ['/ len(faces)', 'div(total, F(BigInt(faces.length)))', 'Each face is equally likely, so the future is the plain average over the faces.'],
      ['1 + sum(', 'add(F(1n),', 'Plus the roll just made. Without it every E(d) would be 0.'],
    ],
    math: [
      ['E(n)', 'E[n]', 'E[n]', 'the answer: the expected rolls from the start'],
      ['k', 'len(faces)', 'faces.length', 'the number of faces, all equally likely'],
    ],
  },

  'self-loops': {
    code: CODE['self-loops'],
    notes: [
      FRACTION_NOTE,
      ['E = [Fraction(0)] * (n + 1)', 'const E = [F(0n)]', 'E(0) = 0: on the last square, no more rolls.'],
      ['fits = min(s, d)', 'const fits = Math.min(s, d)', 'The faces 1 … d land on or before the last square; the other s − d are wasted and leave the token where it is.'],
      ['E[d] = (s + sum(E[d - f] for f in range(1, fits + 1))) / Fraction(fits)', 'let total = F(BigInt(s))', 'E(d) = 1 + (Σ E(d − f) + (s − fits) · E(d)) / s. Multiply by s and move the E(d) terms left: fits · E(d) = s + Σ E(d − f). The s is the roll itself, times s.'],
      ['E[d - f]', 'E[d - f]', 'A face that fits leaves d − f, a smaller distance, already known.'],
      ['/ Fraction(fits)', 'E.push(div(total, F(BigInt(fits))))', 'Divide by the faces that fit, the chance of leaving times s. It is at least 1, so the division is safe.'],
    ],
    math: [
      ['faces that fit', 'fits', 'fits', 'the faces f ≤ d, which land on or before the last square'],
      ['E(n)', 'E[n]', 'E[n]', 'the answer: the expected rolls from the start'],
    ],
  },

  'cyclic-expectations': {
    code: CODE['cyclic-expectations'],
    notes: [
      FRACTION_NOTE,
      ['to = dict(jumps)', 'const to = new Map(jumps)', 'Where each jump square sends the token.'],
      ['A = [[Fraction(0)] * (n + 1) for _ in range(n)]', 'const A = Array.from({ length: n }', 'One equation per square 0 … n − 1 (E(n) = 0 needs none); the last column is the right-hand side.'],
      ['A[i][i] += 1', 'A[i][i] = add(A[i][i], F(1n))', 'Every equation starts “E(i) = …”, with everything moved to the left.'],
      ['A[i][to[i]] -= 1', 'sub(A[i][to.get(i)], F(1n))', 'A jump square: E(i) = E(to), no roll spent. A jump to the end leaves E(i) = 0.'],
      ['A[i][n] = Fraction(1)', 'A[i][n] = F(1n)', 'Otherwise one roll is spent: the right-hand side is 1…'],
      ['j = i + f if i + f <= n else i', 'const j = i + f <= n ? i + f : i', '…and each face moves to i + f, or wastes the roll and stays on i: the self-loop sits in the same equation.'],
      ['A[i][j] -= Fraction(1, s)', 'sub(A[i][j], F(1n, BigInt(s)))', 'So E(i) − Σ E(j) / s = 1. The end, j = n, has E = 0 and no column.'],
      ['pivot = next(r for r in range(col, n) if A[r][col] != 0)', 'while (A[pivot][col][0] === 0n) pivot++', 'Gauss–Jordan elimination: find a row with a non-zero entry in this column. The board’s guarantees make the system solvable, so one exists.'],
      ['factor = A[r][col] / A[col][col]', 'const factor = div(A[r][col], A[col][col])', 'Clear this column from every other row. Exact fractions, so no rounding builds up.'],
      ['e = A[0][n] / A[0][0]', 'const e = div(A[0][n], A[0][0])', 'Only the diagonal is left: E(0) is row 0’s right side over its diagonal entry.'],
    ],
    math: [
      ['(I − Q) E = 1', 'A', 'A', 'the system of equations; Q holds the chances of moving between squares'],
      ['E(0)', 'e', 'e', 'the expected turns from the start'],
    ],
  },

  'coupon-collector': {
    code: CODE['coupon-collector'],
    notes: [
      FRACTION_NOTE,
      ['E = [Fraction(0)] * (1 << n)', 'const E = new Array(1 << n).fill(F(0n))', 'One value per set of collected types, as a bitmask. E(full) = 0: everything collected.'],
      ['for S in range(full - 1, -1, -1):', 'for (let S = full - 1; S >= 0; S--) {', 'S ∪ {i} is a larger number than S, so counting down fills every set after the sets it reads.'],
      ['have = sum(w[i] for i in range(n) if S >> i & 1)', 'if ((S >> i) & 1) have += w[i]', 'w(S), the weight of the types already held. A draw among them changes nothing.'],
      ['total += w[i] * E[S | 1 << i]', 'E[S | (1 << i)]', 'A missing type i, drawn with chance w(i)/W, moves the state to S ∪ {i}.'],
      ['E[S] = total / (W - have)', 'E[S] = div(total, F(BigInt(W - have)))', 'The self-loop solved: E(S) = (W + Σ w(i) · E(S ∪ {i})) / (W − w(S)). S is not full, so W − w(S) > 0.'],
      ['return f"{E[0].numerator}/{E[0].denominator}"', '${E[0][0]}', 'The answer is E(∅), the empty mask: nothing collected yet.'],
    ],
    math: [
      ['E(S)', 'E[S]', 'E[S]', 'the expected draws still needed when the types in S are held'],
      ['W', 'W', 'W', 'the total weight; type i has chance w(i)/W'],
    ],
  },

  'moments': {
    code: CODE['moments'],
    notes: [
      FRACTION_NOTE,
      ['S = [Fraction(0)] * (n + 1)', 'S = [F(0n)]', 'A second table, S(d) = E[T²] with d to go. At the end T = 0, so S(0) = 0.'],
      ['nxt = [max(0, d - f) for f in faces]', 'E[Math.max(0, d - f)]', 'Where each face leaves the token, exactly as in the expected-time lesson.'],
      ['E[d] = 1 + sum(E[j] for j in nxt) / k', 'E.push(add(F(1n), div(e, k)))', 'The mean, as before: one roll plus the average future.'],
      ['S[d] = 1 + 2 * sum(E[j] for j in nxt) / k + sum(S[j] for j in nxt) / k', 'S.push(add(add(F(1n), div(mul(F(2n), e), k)), div(s, k)))', 'T = 1 + T′, so T² = 1 + 2T′ + T′². Averaging over the faces: 1 + 2 · avg E + avg S. The middle term is why the mean table is needed.'],
      ['v = S[n] - E[n] ** 2', 'const v = sub(S[n], mul(E[n], E[n]))', 'The variance E[T²] − E[T]², taken once, at the start. Variances themselves don’t average over the first roll.'],
    ],
    math: [
      ['E[T]', 'E[n]', 'E[n]', 'the mean number of rolls from the start'],
      ['E[T²]', 'S[n]', 'S[n]', 'the mean of its square'],
    ],
  },

  'conditional-dp': {
    code: CODE['conditional-dp'],
    notes: [
      ['endT, endH = 1, 0', 'let endT = 1n, endH = 0n', 'The chance, in hundredths, of the allowed sequences so far that end in a tail or a head. No flips: the empty sequence, which may be followed by a head, so it counts as a tail.'],
      ['headsT, headsH = 0, 0', 'headsT = 0n, headsH = 0n', 'The same sequences’ chance times their number of heads: the heads mass, not yet divided by anything.'],
      ['endT, endH, headsT, headsH = (', ';[endT, endH, headsT, headsH] = [', 'All four new values come from the old ones together. Updating endT first would feed its new value into the rest.'],
      ['(endT + endH) * (100 - p),', '(endT + endH) * q', 'A tail may follow anything.'],
      ['endT * p,', 'endT * P', 'A head only after a tail. Two heads in a row are never formed: that is the condition, applied as the sequences grow.'],
      ['(headsT + endT) * p,', '(headsT + endT) * P', 'The new head adds 1 to every path it extends, so it adds that path’s chance, endT, to the heads mass.'],
      ['x = Fraction(headsT + headsH, endT + endH)', 'top = headsT + headsH, bottom = endT + endH', 'Divide once, at the end: the heads mass over the chance of the event. The 100ⁿ in both cancels.'],
    ],
    math: [
      ['P(no two heads together)', 'endT + endH', 'endT + endH', 'the chance of the event, times 100ⁿ'],
      ['E[heads; event]', 'headsT + headsH', 'headsT + headsH', 'the heads mass over the event, times 100ⁿ'],
    ],
  },

  'stochastic-control': {
    code: CODE['stochastic-control'],
    notes: [
      FRACTION_NOTE,
      ['V = [Fraction(0)] * (n + 2)', 'V = new Array(n + 2).fill(F(0n))', 'V(n) = V(n + 1) = 0: finished. The spare cell is there because a risky success at the last stage lands on n + 1.'],
      ['for i in range(n - 1, -1, -1):', 'for (let i = n - 1; i >= 0; i--) {', 'Both ways move forward, so fill from the end.'],
      ['safe = a[i] + V[i + 1]', 'const safe = add(F(BigInt(a[i])), V[i + 1])', 'The safe way: pay a(i) and move on one stage.'],
      ['risky = Fraction(100 * b[i], p[i]) + V[i + 2]', 'add(F(BigInt(100 * b[i]), BigInt(p[i])), V[i + 2])', 'The risky way loops on itself: V = b + (p/100) · V(i + 2) + (1 − p/100) · V, so V = 100 · b/p + V(i + 2). On average a try is repeated 100/p times.'],
      ['V[i] = min(safe, risky)', 'V[i] = less(risky, safe) ? risky : safe', 'The cheaper choice. In JavaScript two fractions are compared by cross-multiplying.'],
    ],
    math: [
      ['V(i)', 'V[i]', 'V[i]', 'the least expected cost to finish from stage i'],
      ['b(i) · 100 / p(i)', '100 * b[i]', '100 * b[i]', 'the expected cost of the risky tries, b(i) per try over the chance p(i)/100'],
    ],
  },
}
