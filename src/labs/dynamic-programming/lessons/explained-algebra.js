// Reference solutions explained line by line for the algebraic lessons (Expert, algebraic group).
// Format: explained.js.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const ALGEBRA_EXPLAINED = {
  'matrix-power': {
    code: pair(`def solve(k, edges, n):
    M = 1000000007
    A = [[0] * k for _ in range(k)]
    for u, v in edges:
        A[u][v] += 1
    def times(X, Y):
        return [[sum(X[i][t] * Y[t][j] for t in range(k)) % M for j in range(k)] for i in range(k)]
    R = [[int(i == j) for j in range(k)] for i in range(k)]
    while n > 0:
        if n % 2 == 1:
            R = times(R, A)
        A = times(A, A)
        n //= 2
    return R[0][k - 1]
`, `function solve(k, edges, n) {
  const M = 1000000007
  const mul = (a, b) => ((a * (b >>> 16)) % M * 65536 + a * (b & 65535)) % M
  let A = Array.from({ length: k }, () => new Array(k).fill(0))
  for (const [u, v] of edges) A[u][v] += 1
  const times = (X, Y) => X.map((_, i) => Y[0].map((_, j) => {
    let s = 0
    for (let t = 0; t < k; t++) s = (s + mul(X[i][t], Y[t][j])) % M
    return s
  }))
  let R = A.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)))
  while (n > 0) {
    if (n % 2 === 1) R = times(R, A)
    A = times(A, A)
    n = Math.floor(n / 2)
  }
  return R[0][k - 1]
}
`),
    notes: [
      ['M = 1000000007', 'M = 1000000007', 'Counts are kept modulo 10⁹ + 7. JavaScript multiplies exactly only below 2⁵³, so its mul splits the second factor into two 16-bit halves.'],
      ['A[u][v] += 1', 'for (const [u, v] of edges) A[u][v] += 1', 'A[u][v] counts the edges from u to v: the walks of length 1.'],
      ['def times(X, Y):', 'const times = (X, Y) =>', 'The matrix product: walks of length a from i, then length b to j, joined at every middle vertex t.'],
      ['R = [[int(i == j) for j in range(k)] for i in range(k)]', 'let R = A.map', 'The identity: walks of length 0 stay where they start.'],
      ['if n % 2 == 1:', 'if (n % 2 === 1) R = times(R, A)', 'Repeated squaring: A holds A¹, A², A⁴, A⁸, …; multiply in the ones n’s binary digits call for.'],
      ['A = times(A, A)', 'A = times(A, A)', 'Square: walks twice as long. About log₂ n squarings in all, each k³ steps.'],
      ['return R[0][k - 1]', 'return R[0][k - 1]', 'Aⁿ[0][k − 1] counts the walks of n edges from vertex 0 to vertex k − 1.'],
    ],
    math: [
      ['A²ʲ = Aʲ · Aʲ', 'times(A, A)', 'times(A, A)', 'squaring doubles the walk length'],
      ['Aⁿ(0, k − 1)', 'R[0][k - 1]', 'R[0][k - 1]', 'the walks counted'],
    ],
  },

  'linear-recurrence': {
    code: pair(`def solve(c, a, n):
    M = 998244353
    k = len(c)
    if n < k:
        return a[n] % M
    def times(p, q):
        r = [0] * (2 * k - 1)
        for i, x in enumerate(p):
            for j, y in enumerate(q):
                r[i + j] = (r[i + j] + x * y) % M
        for d in range(2 * k - 2, k - 1, -1):
            for i in range(k):
                r[d - 1 - i] = (r[d - 1 - i] + r[d] * c[i]) % M
        return r[:k]
    result = [1] + [0] * (k - 1)
    base = [0, 1] + [0] * (k - 2) if k > 1 else [c[0] % M]
    while n > 0:
        if n % 2 == 1:
            result = times(result, base)
        base = times(base, base)
        n //= 2
    return sum(result[i] * a[i] for i in range(k)) % M
`, `function solve(c, a, n) {
  const M = 998244353, k = c.length
  const mul = (x, y) => ((x * (y >>> 16)) % M * 65536 + x * (y & 65535)) % M
  if (n < k) return a[n] % M
  const times = (p, q) => {
    const r = new Array(2 * k - 1).fill(0)
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) r[i + j] = (r[i + j] + mul(p[i], q[j])) % M
    for (let d = 2 * k - 2; d >= k; d--) {
      for (let i = 0; i < k; i++) r[d - 1 - i] = (r[d - 1 - i] + mul(r[d], c[i])) % M
    }
    return r.slice(0, k)
  }
  let result = new Array(k).fill(0)
  result[0] = 1
  let base = k > 1 ? [0, 1, ...new Array(k - 2).fill(0)] : [c[0] % M]
  while (n > 0) {
    if (n % 2 === 1) result = times(result, base)
    base = times(base, base)
    n = Math.floor(n / 2)
  }
  let total = 0
  for (let i = 0; i < k; i++) total = (total + mul(result[i], a[i] % M)) % M
  return total
}
`),
    notes: [
      ['if n < k:', 'if (n < k) return a[n] % M', 'The first k terms are given.'],
      ['def times(p, q):', 'const times = (p, q) =>', 'Multiply two polynomials of degree below k …'],
      ['for d in range(2 * k - 2, k - 1, -1):', 'for (let d = 2 * k - 2; d >= k; d--)', '… then fold each power from the top down with x^d = c[0]·x^(d−1) + … + c[k−1]·x^(d−k): the recurrence itself.'],
      ['result = [1] + [0] * (k - 1)', 'result[0] = 1', 'result starts as x⁰ = 1 and base as x; repeated squaring builds xⁿ, reduced.'],
      ['return sum(result[i] * a[i] for i in range(k)) % M', 'for (let i = 0; i < k; i++) total =', 'If xⁿ reduces to r₀ + r₁x + … + r_(k−1)x^(k−1), then a(n) = r₀a(0) + … + r_(k−1)a(k−1): multiplying by x shifts the sequence by one.'],
    ],
    math: [
      ['xⁿ mod (xᵏ − c₁xᵏ⁻¹ − … − cₖ)', 'result', 'result', 'the reduced power, as k coefficients'],
      ['a(n) = Σ rᵢ·a(i)', 'result[i] * a[i]', 'mul(result[i], a[i] % M)', 'one term of the answer'],
    ],
  },

  'berlekamp-massey': {
    code: pair(`def solve(s):
    M = 998244353
    s = [x % M for x in s]
    C, B = [1], [1]
    L, m, b = 0, 1, 1
    for i in range(len(s)):
        d = s[i]
        for j in range(1, L + 1):
            d = (d + C[j] * s[i - j]) % M
        if d == 0:
            m += 1
            continue
        coef = d * pow(b, M - 2, M) % M
        T = C[:]
        C = C + [0] * max(0, len(B) + m - len(C))
        for j in range(len(B)):
            C[j + m] = (C[j + m] - coef * B[j]) % M
        if 2 * L <= i:
            L, B, b, m = i + 1 - L, T, d, 1
        else:
            m += 1
    return sum(-C[j] * s[len(s) - j] for j in range(1, L + 1)) % M
`, `function solve(s) {
  const M = 998244353
  const mul = (x, y) => ((x * (y >>> 16)) % M * 65536 + x * (y & 65535)) % M
  const pow = (x, e) => { let r = 1; for (; e > 0; e = Math.floor(e / 2)) { if (e % 2 === 1) r = mul(r, x); x = mul(x, x) } return r }
  s = s.map(x => ((x % M) + M) % M)
  let C = [1], B = [1], L = 0, m = 1, b = 1
  for (let i = 0; i < s.length; i++) {
    let d = s[i]
    for (let j = 1; j <= L; j++) d = (d + mul(C[j], s[i - j])) % M
    if (d === 0) { m++; continue }
    const coef = mul(d, pow(b, M - 2))
    const T = C.slice()
    while (C.length < B.length + m) C.push(0)
    for (let j = 0; j < B.length; j++) C[j + m] = (C[j + m] - mul(coef, B[j]) + M) % M
    if (2 * L <= i) { L = i + 1 - L; B = T; b = d; m = 1 } else m++
  }
  let next = 0
  for (let j = 1; j <= L; j++) next = (next - mul(C[j], s[s.length - j]) + M) % M
  return next
}
`),
    notes: [
      ['C, B = [1], [1]', 'let C = [1], B = [1]', 'C is the current recurrence, as its connection polynomial 1 + C₁x + …; B is the one kept from the last time the length grew.'],
      ['d = (d + C[j] * s[i - j]) % M', 'for (let j = 1; j <= L; j++) d =', 'The discrepancy: how far the current recurrence is from predicting s[i].'],
      ['if d == 0:', 'if (d === 0) { m++; continue }', 'It already predicts s[i]: keep it.'],
      ['coef = d * pow(b, M - 2, M) % M', 'const coef = mul(d, pow(b, M - 2))', 'Scale the old recurrence B so that, shifted by m, its own discrepancy cancels this one.'],
      ['if 2 * L <= i:', 'if (2 * L <= i)', 'If the fix needs a longer recurrence, the length becomes i + 1 − L, and the old C becomes the new B.'],
      ['return sum(-C[j] * s[len(s) - j] for j in range(1, L + 1)) % M', 'for (let j = 1; j <= L; j++) next =', 'The next term from the recurrence found: s(N) = −C₁s(N − 1) − … − C_L s(N − L).'],
    ],
    math: [
      ['s(i) + C₁s(i − 1) + … + C_L s(i − L) = 0', 'C[j] * s[i - j]', 'mul(C[j], s[i - j])', 'one term of the check'],
      ['L', 'L', 'L', 'the length of the shortest recurrence so far'],
    ],
  },

  'bostan-mori': {
    code: pair(`def solve(p, q, n):
    M = 998244353
    p = [x % M for x in p]
    q = [x % M for x in q]
    def times(u, v):
        r = [0] * (len(u) + len(v) - 1)
        for i, x in enumerate(u):
            for j, y in enumerate(v):
                r[i + j] = (r[i + j] + x * y) % M
        return r
    while n > 0:
        qm = [(-x if i % 2 else x) % M for i, x in enumerate(q)]
        u = times(p, qm)
        q = times(q, qm)[::2]
        p = u[n % 2::2]
        n //= 2
    return p[0] * pow(q[0], M - 2, M) % M if p else 0
`, `function solve(p, q, n) {
  const M = 998244353
  const mul = (x, y) => ((x * (y >>> 16)) % M * 65536 + x * (y & 65535)) % M
  const pow = (x, e) => { let r = 1; for (; e > 0; e = Math.floor(e / 2)) { if (e % 2 === 1) r = mul(r, x); x = mul(x, x) } return r }
  p = p.map(x => ((x % M) + M) % M)
  q = q.map(x => ((x % M) + M) % M)
  const times = (u, v) => {
    const r = new Array(u.length + v.length - 1).fill(0)
    for (let i = 0; i < u.length; i++) for (let j = 0; j < v.length; j++) r[i + j] = (r[i + j] + mul(u[i], v[j])) % M
    return r
  }
  while (n > 0) {
    const qm = q.map((x, i) => (i % 2 ? (M - x) % M : x))
    const u = times(p, qm)
    q = times(q, qm).filter((_, i) => i % 2 === 0)
    p = u.filter((_, i) => i % 2 === n % 2)
    n = Math.floor(n / 2)
  }
  return p.length ? mul(p[0], pow(q[0], M - 2)) : 0
}
`),
    notes: [
      ['qm = [(-x if i % 2 else x) % M for i, x in enumerate(q)]', 'const qm =', 'Q(−x): flip the sign of every odd coefficient.'],
      ['u = times(p, qm)', 'const u = times(p, qm)', 'P(x)Q(−x) over Q(x)Q(−x) is the same fraction …'],
      ['q = times(q, qm)[::2]', 'q = times(q, qm).filter', '… and Q(x)Q(−x) has only even powers, so it is V(x²): keep its even coefficients.'],
      ['p = u[n % 2::2]', 'p = u.filter', 'Over an even bottom, coefficient n only meets the top terms with n’s parity. Keep those, and n halves.'],
      ['return p[0] * pow(q[0], M - 2, M) % M if p else 0', 'return p.length ?', 'At n = 0 the coefficient is P(0)/Q(0).'],
    ],
    math: [
      ['[xⁿ] P(x)/Q(x)', 'p[0]', 'p[0]', 'the answer once n reaches 0'],
      ['Q(x)Q(−x) = V(x²)', 'times(q, qm)', 'times(q, qm)', 'the new bottom, even powers only'],
    ],
  },

  'generating-functions': {
    code: pair(`def solve(g, m, n):
    M = 998244353
    f = [1] + [0] * n
    inv = [0, 1] + [0] * n
    for k in range(2, n + 1):
        inv[k] = (M - (M // k) * inv[M % k] % M) % M
    for k in range(1, n + 1):
        t = 0
        for i in range(1, min(k, len(g) - 1) + 1):
            t += g[i] * f[k - i] * (m * i - (k - i))
        f[k] = t % M * inv[k] % M
    return f[n]
`, `function solve(g, m, n) {
  const M = 998244353
  const mul = (x, y) => ((x * (y >>> 16)) % M * 65536 + x * (y & 65535)) % M
  const f = new Array(n + 1).fill(0), inv = new Array(n + 2).fill(0)
  f[0] = 1
  inv[1] = 1
  for (let k = 2; k <= n; k++) inv[k] = (M - mul(Math.floor(M / k), inv[M % k])) % M
  for (let k = 1; k <= n; k++) {
    let t = 0
    for (let i = 1; i <= Math.min(k, g.length - 1); i++) {
      const weight = (((m * i - (k - i)) % M) + M) % M
      t = (t + mul(mul(g[i], f[k - i]), weight)) % M
    }
    f[k] = mul(t, inv[k])
  }
  return f[n]
}
`),
    notes: [
      ['inv[k] = (M - (M // k) * inv[M % k] % M) % M', 'inv[k] = (M - mul(Math.floor(M / k), inv[M % k])) % M', 'The inverses of 1 … n in one pass, from p = (p div k)·k + (p mod k).'],
      ['for i in range(1, min(k, len(g) - 1) + 1):', 'for (let i = 1; i <= Math.min(k, g.length - 1); i++)', 'Only g’s few terms matter: deg g steps per coefficient, not a whole multiplication.'],
      ['t += g[i] * f[k - i] * (m * i - (k - i))', 'const weight =', 'From g·f′ = m·g′·f, the coefficient of x^(k−1): k·f_k = Σ g_i·f_(k−i)·(m·i − (k − i)).'],
      ['f[k] = t % M * inv[k] % M', 'f[k] = mul(t, inv[k])', 'Divide by k (g₀ = 1).'],
      ['return f[n]', 'return f[n]', 'The coefficient of xⁿ in gᵐ.'],
    ],
    math: [
      ['f = gᵐ', 'f[k]', 'f[k]', 'the coefficient of x^k'],
      ['g·f′ = m·g′·f', 'm * i - (k - i)', 'm * i - (k - i)', 'the weight the two sides give g_i·f_(k−i)'],
    ],
  },

  'fft-ntt': {
    code: pair(`def solve(a, b):
    if not a or not b:
        return []
    M, G = 998244353, 3
    size = max(a) + max(b) + 1
    n = 1
    while n < size:
        n *= 2
    def ntt(f, invert):
        j = 0
        for i in range(1, n):
            bit = n >> 1
            while j & bit:
                j ^= bit
                bit >>= 1
            j |= bit
            if i < j:
                f[i], f[j] = f[j], f[i]
        length = 2
        while length <= n:
            w = pow(G, (M - 1) // length, M)
            if invert:
                w = pow(w, M - 2, M)
            half = length // 2
            for start in range(0, n, length):
                wk = 1
                for t in range(start, start + half):
                    u, v = f[t], f[t + half] * wk % M
                    f[t] = (u + v) % M
                    f[t + half] = (u - v) % M
                    wk = wk * w % M
            length *= 2
        if invert:
            inv_n = pow(n, M - 2, M)
            for i in range(n):
                f[i] = f[i] * inv_n % M
    A, B = [0] * n, [0] * n
    for x in a:
        A[x] += 1
    for y in b:
        B[y] += 1
    ntt(A, False)
    ntt(B, False)
    C = [A[i] * B[i] % M for i in range(n)]
    ntt(C, True)
    return C[:size]
`, `function solve(a, b) {
  if (!a.length || !b.length) return []
  const M = 998244353, G = 3
  const mul = (x, y) => ((x * (y >>> 16)) % M * 65536 + x * (y & 65535)) % M
  const pow = (x, e) => { let r = 1; for (; e > 0; e = Math.floor(e / 2)) { if (e % 2 === 1) r = mul(r, x); x = mul(x, x) } return r }
  const size = Math.max(...a) + Math.max(...b) + 1
  let n = 1
  while (n < size) n *= 2
  const ntt = (f, invert) => {
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1
      for (; j & bit; bit >>= 1) j ^= bit
      j |= bit
      if (i < j) [f[i], f[j]] = [f[j], f[i]]
    }
    for (let length = 2; length <= n; length *= 2) {
      let w = pow(G, (M - 1) / length)
      if (invert) w = pow(w, M - 2)
      const half = length / 2
      for (let start = 0; start < n; start += length) {
        let wk = 1
        for (let t = start; t < start + half; t++) {
          const u = f[t], v = mul(f[t + half], wk)
          f[t] = (u + v) % M
          f[t + half] = (u - v + M) % M
          wk = mul(wk, w)
        }
      }
    }
    if (invert) { const invN = pow(n, M - 2); for (let i = 0; i < n; i++) f[i] = mul(f[i], invN) }
  }
  const A = new Array(n).fill(0), B = new Array(n).fill(0)
  for (const x of a) A[x] += 1
  for (const y of b) B[y] += 1
  ntt(A, false)
  ntt(B, false)
  const C = A.map((x, i) => mul(x, B[i]))
  ntt(C, true)
  return C.slice(0, size)
}
`),
    notes: [
      ['if i < j:', 'if (i < j) [f[i], f[j]] = [f[j], f[i]]', 'Bit-reversed order, so the butterflies can work in place.'],
      ['w = pow(G, (M - 1) // length, M)', 'let w = pow(G, (M - 1) / length)', 'A root of unity of order length, modulo p: 998 244 353 − 1 is divisible by 2²³.'],
      ['u, v = f[t], f[t + half] * wk % M', 'const u = f[t], v = mul(f[t + half], wk)', 'The butterfly: two half-size transforms combine into one.'],
      ['A[x] += 1', 'for (const x of a) A[x] += 1', 'A is the polynomial with coefficient A[v] = how many values equal v.'],
      ['C = [A[i] * B[i] % M for i in range(n)]', 'const C = A.map', 'After the transform a product is pointwise: the convolution costs O(n log n).'],
      ['return C[:size]', 'return C.slice(0, size)', 'Every count is below p, so the residues are the exact counts.'],
    ],
    math: [
      ['c(s) = Σ A(i)·B(s − i)', 'A[i] * B[i]', 'mul(x, B[i])', 'pointwise, after the transform'],
      ['ω = g^((p − 1)/len)', 'pow(G, (M - 1) // length, M)', 'pow(G, (M - 1) / length)', 'the root of unity'],
    ],
  },

  'sos': {
    code: pair(`def solve(a):
    F = a[:]
    n = len(a).bit_length() - 1
    for i in range(n):
        bit = 1 << i
        for mask in range(len(F)):
            if mask & bit:
                F[mask] += F[mask ^ bit]
    return F
`, `function solve(a) {
  const F = a.slice(), n = Math.log2(a.length)
  for (let i = 0; i < n; i++) {
    const bit = 1 << i
    for (let mask = 0; mask < F.length; mask++) if (mask & bit) F[mask] += F[mask ^ bit]
  }
  return F
}
`),
    notes: [
      ['for i in range(n):', 'for (let i = 0; i < n; i++)', 'One bit at a time: after bit i, F[mask] sums the submasks that differ from mask only in bits 0 … i.'],
      ['if mask & bit:', 'if (mask & bit) F[mask] += F[mask ^ bit]', 'A mask with the bit takes in the mask without it: n · 2ⁿ steps instead of 3ⁿ.'],
      ['F[mask] += F[mask ^ bit]', 'F[mask] += F[mask ^ bit]', 'F[mask ^ bit] already covers the earlier bits, so after the add F[mask] does too.'],
      ['return F', 'return F', 'F[mask] is the sum of a over every submask of mask.'],
    ],
    math: [
      ['F(S) = Σ_(T ⊆ S) a(T)', 'F[mask]', 'F[mask]', 'the sum over submasks'],
      ['S ∖ {i}', 'mask ^ bit', 'mask ^ bit', 'the mask without bit i'],
    ],
  },

  'mobius': {
    code: pair(`def solve(F):
    a = F[:]
    n = len(F).bit_length() - 1
    for i in range(n):
        bit = 1 << i
        for mask in range(len(a)):
            if mask & bit:
                a[mask] -= a[mask ^ bit]
    return a
`, `function solve(F) {
  const a = F.slice(), n = Math.log2(F.length)
  for (let i = 0; i < n; i++) {
    const bit = 1 << i
    for (let mask = 0; mask < a.length; mask++) if (mask & bit) a[mask] -= a[mask ^ bit]
  }
  return a
}
`),
    notes: [
      ['a = F[:]', 'const a = F.slice()', 'Start from the subset sums.'],
      ['for i in range(n):', 'for (let i = 0; i < n; i++)', 'Undo the sums one bit at a time; the bits may go in any order.'],
      ['a[mask] -= a[mask ^ bit]', 'a[mask] -= a[mask ^ bit]', 'Take away what the bit brought in: inclusion–exclusion, one bit at a time, n · 2ⁿ steps.'],
      ['return a', 'return a', 'The original values: summing and then undoing gives back what was put in.'],
    ],
    math: [
      ['a(S) = Σ_(T ⊆ S) (−1)^|S ∖ T| F(T)', 'a[mask]', 'a[mask]', 'the value recovered'],
      ['F(S)', 'F', 'F', 'the subset sums, the input'],
    ],
  },

  'subset-convolution': {
    code: pair(`def solve(a, b):
    N = len(a)
    n = N.bit_length() - 1
    size = [bin(m).count('1') for m in range(N)]
    def sweep(f, sign):
        for i in range(n):
            bit = 1 << i
            for m in range(N):
                if m & bit:
                    f[m] += sign * f[m ^ bit]
    A = [[a[m] if size[m] == r else 0 for m in range(N)] for r in range(n + 1)]
    B = [[b[m] if size[m] == r else 0 for m in range(N)] for r in range(n + 1)]
    for r in range(n + 1):
        sweep(A[r], 1)
        sweep(B[r], 1)
    c = [0] * N
    for r in range(n + 1):
        H = [0] * N
        for i in range(r + 1):
            Ai, Bj = A[i], B[r - i]
            for m in range(N):
                H[m] += Ai[m] * Bj[m]
        sweep(H, -1)
        for m in range(N):
            if size[m] == r:
                c[m] = H[m]
    return c
`, `function solve(a, b) {
  const N = a.length, n = Math.log2(N)
  const size = a.map((_, m) => { let c = 0; for (let x = m; x; x &= x - 1) c++; return c })
  const sweep = (f, sign) => {
    for (let i = 0; i < n; i++) {
      const bit = 1 << i
      for (let m = 0; m < N; m++) if (m & bit) f[m] += sign * f[m ^ bit]
    }
  }
  const A = [], B = []
  for (let r = 0; r <= n; r++) {
    A.push(a.map((x, m) => (size[m] === r ? x : 0)))
    B.push(b.map((x, m) => (size[m] === r ? x : 0)))
    sweep(A[r], 1)
    sweep(B[r], 1)
  }
  const c = new Array(N).fill(0)
  for (let r = 0; r <= n; r++) {
    const H = new Array(N).fill(0)
    for (let i = 0; i <= r; i++) for (let m = 0; m < N; m++) H[m] += A[i][m] * B[r - i][m]
    sweep(H, -1)
    for (let m = 0; m < N; m++) if (size[m] === r) c[m] = H[m]
  }
  return c
}
`),
    notes: [
      ['size = [bin(m).count(\'1\') for m in range(N)]', 'const size =', 'The number of elements in each mask: two disjoint parts have sizes that add up to the whole.'],
      ['def sweep(f, sign):', 'const sweep = (f, sign) =>', 'The subset-sum transform (sign +1), or its inverse (sign −1), one bit at a time.'],
      ['A = [[a[m] if size[m] == r else 0 for m in range(N)] for r in range(n + 1)]', 'A.push(', 'Split a by size: layer r keeps only the masks with r elements.'],
      ['H[m] += Ai[m] * Bj[m]', 'H[m] += A[i][m] * B[r - i][m]', 'Multiply the layers whose sizes add up to r, pointwise after the transform.'],
      ['if size[m] == r:', 'if (size[m] === r) c[m] = H[m]', 'Keep only the masks of size r: in them, two overlapping parts would have sizes adding up to more than r, so only disjoint pairs are left.'],
    ],
    math: [
      ['c(S) = Σ_(T ⊆ S) a(T)·b(S ∖ T)', 'c[m] = H[m]', 'c[m] = H[m]', 'the answer for mask m'],
      ['|T| + |S ∖ T| = |S|', 'B[r - i]', 'B[r - i]', 'the layer whose size completes r'],
    ],
  },

  'walsh-hadamard': {
    code: pair(`def solve(a, b):
    N = len(a)
    def fwht(f):
        h = 1
        while h < N:
            for i in range(0, N, 2 * h):
                for j in range(i, i + h):
                    x, y = f[j], f[j + h]
                    f[j], f[j + h] = x + y, x - y
            h *= 2
    A, B = a[:], b[:]
    fwht(A)
    fwht(B)
    C = [x * y for x, y in zip(A, B)]
    fwht(C)
    return [x // N for x in C]
`, `function solve(a, b) {
  const N = a.length
  const fwht = f => {
    for (let h = 1; h < N; h *= 2) {
      for (let i = 0; i < N; i += 2 * h) {
        for (let j = i; j < i + h; j++) {
          const x = f[j], y = f[j + h]
          f[j] = x + y
          f[j + h] = x - y
        }
      }
    }
  }
  const A = a.slice(), B = b.slice()
  fwht(A)
  fwht(B)
  const C = A.map((x, i) => x * B[i])
  fwht(C)
  return C.map(x => x / N)
}
`),
    notes: [
      ['def fwht(f):', 'const fwht = f =>', 'The Walsh–Hadamard transform: under it, XOR convolution becomes pointwise multiplication.'],
      ['f[j], f[j + h] = x + y, x - y', 'f[j] = x + y', 'The butterfly: sum and difference of the two halves, once per bit.'],
      ['C = [x * y for x, y in zip(A, B)]', 'const C = A.map', 'Multiply the two transforms pointwise.'],
      ['fwht(C)', 'fwht(C)', 'The transform is its own inverse, up to a factor of N …'],
      ['return [x // N for x in C]', 'return C.map(x => x / N)', '… so divide by N. The results are exact integers.'],
    ],
    math: [
      ['c(k) = Σ_(i ⊕ j = k) a(i)·b(j)', 'x * y', 'x * B[i]', 'pointwise, after the transform'],
      ['H(H(f)) = N·f', 'x // N', 'x / N', 'the inverse'],
    ],
  },

  'semirings': {
    code: pair(`def solve(k, edges, n):
    INF = float('inf')
    A = [[INF] * k for _ in range(k)]
    for u, v, w in edges:
        A[u][v] = min(A[u][v], w)
    def times(X, Y):
        return [[min(X[i][t] + Y[t][j] for t in range(k)) for j in range(k)] for i in range(k)]
    R = [[0 if i == j else INF for j in range(k)] for i in range(k)]
    while n > 0:
        if n % 2 == 1:
            R = times(R, A)
        A = times(A, A)
        n //= 2
    return -1 if R[0][k - 1] == INF else R[0][k - 1]
`, `function solve(k, edges, n) {
  let A = Array.from({ length: k }, () => new Array(k).fill(Infinity))
  for (const [u, v, w] of edges) A[u][v] = Math.min(A[u][v], w)
  const times = (X, Y) => X.map((_, i) => Y[0].map((_, j) => {
    let best = Infinity
    for (let t = 0; t < k; t++) best = Math.min(best, X[i][t] + Y[t][j])
    return best
  }))
  let R = A.map((row, i) => row.map((_, j) => (i === j ? 0 : Infinity)))
  while (n > 0) {
    if (n % 2 === 1) R = times(R, A)
    A = times(A, A)
    n = Math.floor(n / 2)
  }
  return R[0][k - 1] === Infinity ? -1 : R[0][k - 1]
}
`),
    notes: [
      ['A[u][v] = min(A[u][v], w)', 'for (const [u, v, w] of edges) A[u][v] = Math.min(A[u][v], w)', 'The cheapest single edge from u to v; ∞ where there is none.'],
      ['return [[min(X[i][t] + Y[t][j] for t in range(k)) for j in range(k)] for i in range(k)]', 'for (let t = 0; t < k; t++) best = Math.min(best, X[i][t] + Y[t][j])', 'The product with + replaced by min and × by +: the cheapest join at a middle vertex.'],
      ['R = [[0 if i == j else INF for j in range(k)] for i in range(k)]', 'let R = A.map', 'The identity of this algebra: 0 on the diagonal (an empty walk costs nothing) and ∞ elsewhere.'],
      ['if n % 2 == 1:', 'if (n % 2 === 1) R = times(R, A)', 'Repeated squaring works because min-plus multiplication is associative: the same loop as counting walks.'],
      ['return -1 if R[0][k - 1] == INF else R[0][k - 1]', 'return R[0][k - 1] === Infinity', '∞ means no walk has exactly n edges.'],
    ],
    math: [
      ['(X ⊗ Y)(i, j) = min_t X(i, t) + Y(t, j)', 'X[i][t] + Y[t][j]', 'X[i][t] + Y[t][j]', 'one join at a middle vertex t'],
      ['⊕ = min, ⊗ = +', 'min(', 'Math.min(', 'the semiring’s two operations'],
    ],
  },

  'transfer-matrix': {
    code: pair(`def solve(w, n):
    M = 1000000007
    S = 1 << w
    T = [[0] * S for _ in range(S)]
    def fill(r, covered, nxt, start):
        if r == w:
            T[start][nxt] += 1
            return
        if covered >> r & 1:
            fill(r + 1, covered, nxt, start)
            return
        fill(r + 1, covered, nxt | 1 << r, start)
        if r + 1 < w and not covered >> (r + 1) & 1:
            fill(r + 2, covered, nxt, start)
    for s in range(S):
        fill(0, s, 0, s)
    def times(X, Y):
        return [[sum(X[i][t] * Y[t][j] for t in range(S)) % M for j in range(S)] for i in range(S)]
    R = [[int(i == j) for j in range(S)] for i in range(S)]
    while n > 0:
        if n % 2 == 1:
            R = times(R, T)
        T = times(T, T)
        n //= 2
    return R[0][0]
`, `function solve(w, n) {
  const M = 1000000007, S = 1 << w
  const mul = (x, y) => ((x * (y >>> 16)) % M * 65536 + x * (y & 65535)) % M
  let T = Array.from({ length: S }, () => new Array(S).fill(0))
  const fill = (r, covered, nxt, start) => {
    if (r === w) { T[start][nxt] += 1; return }
    if ((covered >> r) & 1) { fill(r + 1, covered, nxt, start); return }
    fill(r + 1, covered, nxt | (1 << r), start)
    if (r + 1 < w && !((covered >> (r + 1)) & 1)) fill(r + 2, covered, nxt, start)
  }
  for (let s = 0; s < S; s++) fill(0, s, 0, s)
  const times = (X, Y) => X.map((_, i) => Y[0].map((_, j) => {
    let sum = 0
    for (let t = 0; t < S; t++) sum = (sum + mul(X[i][t], Y[t][j])) % M
    return sum
  }))
  let R = T.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)))
  while (n > 0) {
    if (n % 2 === 1) R = times(R, T)
    T = times(T, T)
    n = Math.floor(n / 2)
  }
  return R[0][0]
}
`),
    notes: [
      ['def fill(r, covered, nxt, start):', 'const fill = (r, covered, nxt, start) =>', 'Fill one column, top to bottom. covered: its cells already filled from the left; nxt: the cells it fills in the next column.'],
      ['T[start][nxt] += 1', 'T[start][nxt] += 1', 'One way to go from profile start to profile nxt: T is the transfer matrix.'],
      ['fill(r + 1, covered, nxt | 1 << r, start)', 'fill(r + 1, covered, nxt | (1 << r), start)', 'A free cell starts a horizontal domino, which also covers the same cell of the next column …'],
      ['fill(r + 2, covered, nxt, start)', 'fill(r + 2, covered, nxt, start)', '… or a vertical one, with the free cell below it.'],
      ['return R[0][0]', 'return R[0][0]', 'Start with nothing covered, end with nothing sticking out: Tⁿ[0][0].'],
    ],
    math: [
      ['T(s, s′)', 'T[start][nxt]', 'T[start][nxt]', 'the ways from profile s to profile s′'],
      ['Tⁿ(0, 0)', 'R[0][0]', 'R[0][0]', 'the tilings of a w × n board'],
    ],
  },
}
