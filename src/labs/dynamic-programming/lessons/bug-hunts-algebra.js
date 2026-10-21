// Bug hunts for the algebraic lessons (Expert, algebraic group). Format: bug-hunts.js. Each symptom
// was found by a search of small inputs where the buggy code and expert-oracles.js disagree; for
// matrix-power and semirings a clearer input than the smallest one was chosen.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const ALGEBRA_HUNTS = {
  'matrix-power': {
    know: 'Repeated squaring computes Aⁿ as a product of the squares A, A², A⁴, … that n’s binary digits pick. The running result must start as the identity, A⁰, so that multiplying it by those squares gives exactly Aⁿ.',
    swap: pair(['    R = [[int(i == j) for j in range(k)] for i in range(k)]', '    R = [row[:] for row in A]'], ['  let R = A.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)))', '  let R = A.map(row => row.slice())']),
    symptom: { args: [2, [[0, 1], [1, 0]], 1], expected: 1, buggy: 0 },
    bug: 'Started from A, not the identity',
    why: 'R starts as A, so every answer is Aⁿ⁺¹: walks one edge too long. With edges 0 → 1 and 1 → 0, one edge reaches 1, but two edges come back to 0: {call} returned {got} instead of {want}.',
    fix: 'Start R as the identity: R = [[int(i == j) for j in range(k)] for i in range(k)].',
    clues: ['How many walks of 1 edge go from 0 to 1?', 'What power of A does the loop compute if R starts as A?', 'What should R be before any multiplication?'],
    decoys: [[['A[u][v] += 1', 'for (const [u, v] of edges) A[u][v] += 1'], 'Walks of one edge. Right.'], [['A = times(A, A)', 'A = times(A, A)'], 'Squaring doubles the walk length. Right.'], [['return R[0][k - 1]', 'return R[0][k - 1]'], 'From vertex 0 to vertex k − 1. Right.']],
  },

  'linear-recurrence': {
    know: 'A product of two reduced polynomials has degree up to 2k − 2. Each power x^d with d ≥ k is folded into lower ones with x^d = c[0]x^(d−1) + … + c[k−1]x^(d−k). Folding from the top down lets a fold that lands on a power ≥ k be folded again.',
    swap: pair(['        for d in range(2 * k - 2, k - 1, -1):', '        for d in range(k, 2 * k - 1):'], ['    for (let d = 2 * k - 2; d >= k; d--) {', '    for (let d = k; d <= 2 * k - 2; d++) {']),
    symptom: { args: [[1, 3, 0], [2, 2, 1], 8], expected: 337, buggy: 27 },
    bug: 'High powers folded from the bottom up',
    why: 'Folding x^k first and x^(2k−2) last, a high power drops part of its value onto powers ≥ k that were already folded. That part is never folded again and is cut off: {call} returned {got} instead of {want}.',
    fix: 'Fold from the highest power down: for d in range(2 * k - 2, k - 1, -1).',
    clues: ['Which powers does folding x^d add to?', 'If x^k is folded before x^(k+1), where does part of x^(k+1) land?', 'In which order must the powers be folded?'],
    decoys: [[['if n < k:', 'if (n < k) return a[n] % M'], 'The first k terms are given. Right.'], [['result = [1] + [0] * (k - 1)', 'result[0] = 1'], 'x⁰ = 1 to start. Right.'], [['base = times(base, base)', 'base = times(base, base)'], 'Squaring the power of x. Right.']],
  },

  'berlekamp-massey': {
    know: 'When the current recurrence C fails at term i, it is fixed by adding a scaled, shifted copy of the old one. The new length must be max(L, i + 1 − L): it grows exactly when 2L ≤ i, and then C’s old value becomes the new B.',
    swap: pair(['        if 2 * L <= i:', '        if 2 * L < i:'], ['    if (2 * L <= i) { L = i + 1 - L; B = T; b = d; m = 1 } else m++', '    if (2 * L < i) { L = i + 1 - L; B = T; b = d; m = 1 } else m++']),
    symptom: { args: [[3, 6]], expected: 12, buggy: 36 },
    bug: 'The length grows one step too late',
    why: 'At the first nonzero term, i = 0 and L = 0, so 2L ≤ i holds and the length must become 1. With 2L < i it stays 0, and the recurrence found never describes the sequence: {call} returned {got} instead of {want}.',
    fix: 'Grow the length when 2 * L <= i, so the first nonzero term starts a recurrence of length 1.',
    clues: ['What recurrence fits 3, 6?', 'At i = 0, what are L and 2L?', 'Does the length grow then?'],
    decoys: [[['if d == 0:', 'if (d === 0) { m++; continue }'], 'No error: keep the recurrence. Right.'], [['coef = d * pow(b, M - 2, M) % M', 'const coef = mul(d, pow(b, M - 2))'], 'Scale the old fix to cancel this error. Right.'], [['C, B = [1], [1]', 'let C = [1], B = [1]'], 'Start with the empty recurrence. Right.']],
  },

  'bostan-mori': {
    know: 'After multiplying by Q(−x), the bottom has only even powers, V(x²). Coefficient n of U(x)/V(x²) comes only from the top terms with the same parity as n: the even ones for even n, the odd ones for odd n.',
    swap: pair(['        p = u[n % 2::2]', '        p = u[::2]'], ['    p = u.filter((_, i) => i % 2 === n % 2)', '    p = u.filter((_, i) => i % 2 === 0)']),
    symptom: { args: [[1], [1], 5], expected: 0, buggy: 1 },
    bug: 'Always the even half kept',
    why: 'The even coefficients of the top are kept even when n is odd, so an odd n reads the wrong half. 1/1 = 1 has no x⁵ term, yet the even half holds the 1: {call} returned {got} instead of {want}.',
    fix: 'Keep the half with n’s parity: p = u[n % 2::2].',
    clues: ['What is the coefficient of x⁵ in 1/1?', 'Which coefficients of the top can reach an odd power?', 'Which half does the code keep when n is odd?'],
    decoys: [[['qm = [(-x if i % 2 else x) % M for i, x in enumerate(q)]', 'const qm ='], 'Q(−x): flip the odd signs. Right.'], [['q = times(q, qm)[::2]', 'q = times(q, qm).filter'], 'The bottom has only even powers. Right.'], [['n //= 2', 'n = Math.floor(n / 2)'], 'n halves each round. Right.']],
  },

  'generating-functions': {
    know: 'Differentiating f = gᵐ gives g·f′ = m·g′·f. Comparing the coefficients of x^(k−1): k·f_k + Σ g_i·(k − i)·f_(k−i) = m·Σ i·g_i·f_(k−i), so k·f_k = Σ g_i·f_(k−i)·(m·i − (k − i)).',
    swap: pair(['            t += g[i] * f[k - i] * (m * i - (k - i))', '            t += g[i] * f[k - i] * (m * i + (k - i))'], ['      const weight = (((m * i - (k - i)) % M) + M) % M', '      const weight = (((m * i + (k - i)) % M) + M) % M']),
    symptom: { args: [[1, 3], 1, 3], expected: 0, buggy: 27 },
    bug: 'A sign flipped when moving a term across',
    why: 'The term (k − i) comes from g·f′ on the left side, so moving it to the right subtracts it. Added instead, the coefficients never stop growing: (1 + 3x)¹ has no x³ term, but {call} returned {got} instead of {want}.',
    fix: 'Subtract the term that came from the left side: (m * i - (k - i)).',
    clues: ['What is (1 + 3x)¹?', 'Which side of g·f′ = m·g′·f does the (k − i) term come from?', 'What happens to its sign when it moves across?'],
    decoys: [[['inv[k] = (M - (M // k) * inv[M % k] % M) % M', 'inv[k] = (M - mul(Math.floor(M / k), inv[M % k])) % M'], 'The inverses of 1 … n. Right.'], [['f[k] = t % M * inv[k] % M', 'f[k] = mul(t, inv[k])'], 'Divide by k. Right.'], [['return f[n]', 'return f[n]'], 'The coefficient of xⁿ. Right.']],
  },

  'fft-ntt': {
    know: 'The inverse transform uses the inverse root of unity, ω⁻¹, and then divides by n. With the forward root it computes the transform again, which lands each coefficient at the mirrored index −s mod n.',
    swap: pair(['                w = pow(w, M - 2, M)', '                pass'], ['      if (invert) w = pow(w, M - 2)', '      if (invert) w = w']),
    symptom: { args: [[0], [5]], expected: [0, 0, 0, 0, 0, 1], buggy: [0, 0, 0, 1, 0, 0] },
    bug: 'The inverse used the forward root',
    why: 'The inverse transform keeps ω instead of ω⁻¹, so it transforms forward a second time and each count lands at −s mod n. With n = 8, the pair summing to 5 is counted at 3: {call} returned {got} instead of {want}.',
    fix: 'Invert the root for the inverse transform: w = pow(w, M - 2, M).',
    clues: ['0 + 5 = 5: where should the 1 be?', 'Applying the forward transform twice: where does index s go?', 'Which root does the inverse transform use?'],
    decoys: [[['A[x] += 1', 'for (const x of a) A[x] += 1'], 'Count the values. Right.'], [['C = [A[i] * B[i] % M for i in range(n)]', 'const C = A.map'], 'Pointwise product. Right.'], [['inv_n = pow(n, M - 2, M)', 'const invN = pow(n, M - 2)'], 'Divide by n at the end. Right.']],
  },

  'sos': {
    know: 'For each bit, a mask that has the bit takes in the mask without it, which is its submask. The other way round, a mask without the bit taking in the mask with it, sums over supersets instead.',
    swap: pair(['            if mask & bit:', '            if not mask & bit:'], ['    for (let mask = 0; mask < F.length; mask++) if (mask & bit) F[mask] += F[mask ^ bit]', '    for (let mask = 0; mask < F.length; mask++) if (!(mask & bit)) F[mask] += F[mask ^ bit]']),
    symptom: { args: [[2, 0]], expected: [2, 2], buggy: [2, 0] },
    bug: 'Supersets summed instead of submasks',
    why: 'The masks without the bit take in the masks with it, so each F sums its supersets. Mask 1 has submasks 0 and 1, worth 2 + 0, but gets only itself: {call} returned {got} instead of {want}.',
    fix: 'Add only to masks that have the bit: if mask & bit.',
    clues: ['What are the submasks of mask 1?', 'Which masks receive an addition for bit 0?', 'Is mask ^ bit a submask or a supermask of mask there?'],
    decoys: [[['for i in range(n):', 'for (let i = 0; i < n; i++)'], 'One pass per bit. Right.'], [['F = a[:]', 'const F = a.slice()'], 'Start from the values. Right.'], [['return F', 'return F'], 'The subset sums. Right.']],
  },

  'mobius': {
    know: 'Undoing the subset sum takes one pass per bit, like the sum itself: after the pass for bit i, that bit’s contributions are gone. Every one of the n bits needs its pass.',
    swap: pair(['    for i in range(n):', '    for i in range(n - 1):'], ['  for (let i = 0; i < n; i++) {', '  for (let i = 0; i < n - 1; i++) {']),
    symptom: { args: [[2, 4]], expected: [2, 2], buggy: [2, 4] },
    bug: 'The last bit never undone',
    why: 'The passes run over bits 0 … n − 2 only, so the top bit’s contributions stay in. With one bit there is no pass at all, and F comes back unchanged: {call} returned {got} instead of {want}.',
    fix: 'Run a pass for every bit: for i in range(n).',
    clues: ['With masks 0 and 1, F = [2, 4]: what was a[1]?', 'How many passes run when n = 1?', 'Which bits does the loop cover?'],
    decoys: [[['a = F[:]', 'const a = F.slice()'], 'Start from the subset sums. Right.'], [['a[mask] -= a[mask ^ bit]', 'a[mask] -= a[mask ^ bit]'], 'Take away what the bit brought in. Right.'], [['return a', 'return a'], 'The values recovered. Right.']],
  },

  'subset-convolution': {
    know: 'Layer r holds the products of parts whose sizes add up to r. For a mask of size r, only disjoint parts can have sizes adding up to r, so its answer is read from layer r and from no other.',
    swap: pair(['            if size[m] == r:', '            if size[m] <= r:'], ['    for (let m = 0; m < N; m++) if (size[m] === r) c[m] = H[m]', '    for (let m = 0; m < N; m++) if (size[m] <= r) c[m] = H[m]']),
    symptom: { args: [[2, 0], [2, 0]], expected: [4, 0], buggy: [0, 0] },
    bug: 'Answers read from the wrong layer',
    why: 'Every mask of size up to r is overwritten by layer r, so each mask ends with the last layer’s value instead of its own. The empty mask, worth 2 · 2 in layer 0, is overwritten by layer 1: {call} returned {got} instead of {want}.',
    fix: 'Read each mask from its own layer: if size[m] == r.',
    clues: ['What is c for the empty mask, with a = b = [2, 0]?', 'Which layers write to the empty mask?', 'Which layer’s value does it end with?'],
    decoys: [[["size = [bin(m).count('1') for m in range(N)]", 'const size ='], 'The size of each mask. Right.'], [['H[m] += Ai[m] * Bj[m]', 'H[m] += A[i][m] * B[r - i][m]'], 'Layers whose sizes add up to r. Right.'], [['sweep(H, -1)', 'sweep(H, -1)'], 'Undo the transform. Right.']],
  },

  'walsh-hadamard': {
    know: 'Applying the Walsh–Hadamard transform twice multiplies every value by N = 2ⁿ. So after transforming, multiplying and transforming again, each value must be divided by N.',
    swap: pair(['    return [x // N for x in C]', '    return C'], ['  return C.map(x => x / N)', '  return C']),
    symptom: { args: [[1, 0], [0, 2]], expected: [0, 2], buggy: [0, 4] },
    bug: 'Not divided by N',
    why: 'The second transform returns N times the XOR convolution, and the code returns that as it is. With N = 2, every count comes back doubled: {call} returned {got} instead of {want}.',
    fix: 'Divide by N at the end: return [x // N for x in C].',
    clues: ['1 · 2 at XOR 0 ^ 1 = 1: what should c be?', 'What does the transform applied twice do to a list?', 'Is the result scaled back?'],
    decoys: [[['def fwht(f):', 'const fwht = f =>'], 'The transform, in place. Right.'], [['f[j], f[j + h] = x + y, x - y', 'f[j] = x + y'], 'The butterfly. Right.'], [['C = [x * y for x, y in zip(A, B)]', 'const C = A.map'], 'Pointwise product. Right.']],
  },

  'semirings': {
    know: 'In the (min, +) semiring, “adding” is min and “multiplying” is +. Its zero is ∞ (min with ∞ changes nothing) and its one is 0. The identity matrix has the one, 0, on the diagonal and the zero, ∞, everywhere else.',
    swap: pair(['    R = [[0 if i == j else INF for j in range(k)] for i in range(k)]', '    R = [[0] * k for _ in range(k)]'], ['  let R = A.map((row, i) => row.map((_, j) => (i === j ? 0 : Infinity)))', '  let R = A.map(row => row.map(() => 0))']),
    symptom: { args: [2, [[0, 1, 5], [1, 1, 1]], 1], expected: 5, buggy: 1 },
    bug: 'The identity has 0 off the diagonal',
    why: 'R starts with 0 everywhere, as if the walk could jump to any vertex for free before its first edge. Here it “starts” at vertex 1 and takes the loop there: {call} returned {got} instead of {want}.',
    fix: 'Use the identity of (min, +): R = [[0 if i == j else INF for j in range(k)] for i in range(k)].',
    clues: ['Which single edge goes from 0 to 1?', 'What does R[0][1] = 0 mean, before any edge is taken?', 'What is “zero” when adding means min?'],
    decoys: [[['A[u][v] = min(A[u][v], w)', 'for (const [u, v, w] of edges) A[u][v] = Math.min(A[u][v], w)'], 'The cheapest single edge. Right.'], [['A = times(A, A)', 'A = times(A, A)'], 'Squaring doubles the walk length. Right.'], [['return -1 if R[0][k - 1] == INF else R[0][k - 1]', 'return R[0][k - 1] === Infinity'], 'No walk: −1. Right.']],
  },

  'transfer-matrix': {
    know: 'A vertical domino covers a free cell and the cell below it, in the same column. That second cell must be free too: if a horizontal domino from the left already covers it, a vertical domino can’t go there.',
    swap: pair(['        if r + 1 < w and not covered >> (r + 1) & 1:', '        if r + 1 < w:'], ['    if (r + 1 < w && !((covered >> (r + 1)) & 1)) fill(r + 2, covered, nxt, start)', '    if (r + 1 < w) fill(r + 2, covered, nxt, start)']),
    symptom: { args: [4, 3], expected: 11, buggy: 12 },
    bug: 'A vertical domino on a covered cell',
    why: 'The vertical domino is placed without checking the cell below, so it can overlap a horizontal domino coming in from the left, and some “tilings” cover a cell twice: {call} returned {got} instead of {want}.',
    fix: 'Check that the cell below is free: if r + 1 < w and not covered >> (r + 1) & 1.',
    clues: ['How many tilings does a 4 × 3 board have?', 'Which cells does a vertical domino at row r cover?', 'Is the second one checked?'],
    decoys: [[['T[start][nxt] += 1', 'T[start][nxt] += 1'], 'One way from profile to profile. Right.'], [['fill(r + 1, covered, nxt | 1 << r, start)', 'fill(r + 1, covered, nxt | (1 << r), start)'], 'A horizontal domino sticks into the next column. Right.'], [['return R[0][0]', 'return R[0][0]'], 'Nothing covered at either end. Right.']],
  },
}
