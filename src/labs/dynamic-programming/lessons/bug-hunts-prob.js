// Bug hunts for the probabilistic lessons (Specialist, probabilistic group). Format: bug-hunts.js.
// Each symptom is a small input where the buggy code and specialist-oracles.js disagree, found by a search
// of buggy code against the oracle; every bug also fails its lesson's challenge.
const pair = (Python, JavaScript) => ({ Python, JavaScript })

export const PROB_HUNTS = {
  'probability-distribution': {
    know: 'The code counts outcomes: ways[x] is how many of the equally likely rolls of the dice add up to x. A chance is that count over the number of all outcomes, and n dice with s faces each have s · s · … · s = sⁿ outcomes.',
    swap: pair(['    p = Fraction(ways[t] if t < len(ways) else 0, s ** n)', '    p = Fraction(ways[t] if t < len(ways) else 0, s * n)'], ['  const top = t < ways.length ? ways[t] : 0n, bottom = BigInt(s) ** BigInt(n)', '  const top = t < ways.length ? ways[t] : 0n, bottom = BigInt(s) * BigInt(n)']),
    symptom: { args: [2, 6, 7], expected: '1/6', buggy: '1/2' },
    bug: 'The outcomes counted as n · s, not sⁿ',
    why: 'Two dice have 6 · 6 = 36 outcomes, of which 6 add up to 7. Dividing by 2 · 6 = 12 instead makes the chance three times too big: {call} returned {got} instead of {want}. The two agree only by luck, for one die or for two 2-sided dice.',
    fix: 'Divide by the number of outcomes, s ** n.',
    clues: ['How many outcomes do two 6-sided dice have?', 'How many of them add up to 7?', 'What does the code divide the count by?'],
    decoys: [[['ways = [1]', 'let ways = [1n]'], 'No dice: one outcome, sum 0. Right.'], [['nxt[total + face] += count', 'nxt[total + face] += count'], 'Each outcome so far, followed by each face. Right.'], [['nxt = [0] * (len(ways) + s)', 'const nxt = new Array(ways.length + s).fill(0n)'], 'One more die raises the largest sum by s. Right.']],
  },

  'poisson-binomial': {
    know: 'Each trial splits the mass of every count j in two: it fails with chance (100 − q)/100 and keeps j, or succeeds with chance q/100 and moves to j + 1. The two parts must add up to the whole.',
    swap: pair(['            nxt[j] += mass * (100 - q)', '            nxt[j] += mass * q'], ['      nxt[j] += mass * BigInt(100 - q)', '      nxt[j] += mass * BigInt(q)']),
    symptom: { args: [[20], 0], expected: '4/5', buggy: '1/5' },
    bug: 'A failure is weighted by the success chance',
    why: 'Both branches multiply by q, so a trial that succeeds with chance 20% also fails with chance 20%, and the masses no longer add up to 1. With one trial of 20%, the chance of no success is 80%, but {call} returned {got} instead of {want}. At q = 50 the two chances are equal, which hides the bug.',
    fix: 'Weight the failure by 100 − q: nxt[j] += mass * (100 - q).',
    clues: ['One trial with chance 20%. What is the chance of 0 successes?', 'Which line sends mass to the same count j, and by what factor?', 'Add the two factors of one trial. What should they add up to?'],
    decoys: [[['dist = [1]', 'let dist = [1n]'], 'No trials: 0 successes, for sure. Right.'], [['nxt[j + 1] += mass * q', 'nxt[j + 1] += mass * BigInt(q)'], 'A success moves to j + 1 with weight q. Right.'], [['x = Fraction(dist[k] if k < len(dist) else 0, 100 ** len(p))', 'bottom = 100n ** BigInt(p.length)'], 'Each trial multiplied by hundredths, so divide by 100ⁿ. Right.']],
  },

  'expected-time': {
    know: 'E(d) = 1 + the average of E(d − f) over the faces. The 1 is the roll just made, which happens whatever the face; only the futures are averaged.',
    swap: pair(['        E[d] = 1 + sum(E[max(0, d - f)] for f in faces) / len(faces)', '        E[d] = (1 + sum(E[max(0, d - f)] for f in faces)) / len(faces)'], ['    E.push(add(F(1n), div(total, F(BigInt(faces.length)))))', '    E.push(div(add(F(1n), total), F(BigInt(faces.length))))']),
    symptom: { args: [[1, 2], 1], expected: '1/1', buggy: '1/2' },
    bug: 'The roll itself is averaged over the faces',
    why: 'The 1 for the roll is inside the average, so it is divided by the number of faces, as if each face cost 1/k of a roll. From 1 square to go, any face finishes, in exactly one roll, but {call} returned {got} instead of {want}. With a single face the division does nothing, which hides the bug.',
    fix: 'Add the roll after averaging: E[d] = 1 + sum(…) / len(faces).',
    clues: ['One square to go, faces 1 and 2. How many rolls does it take?', 'Write E(1) by the recurrence: what is averaged, and what is not?', 'Where do the brackets put the 1?'],
    decoys: [[['E = [Fraction(0)] * (n + 1)', 'const E = [F(0n)]'], 'E(0) = 0: nothing left to roll. Right.'], [['for d in range(1, n + 1):', 'for (let d = 1; d <= n; d++) {'], 'Every roll moves forward, so smaller distances come first. Right.'], [['return f"{E[n].numerator}/{E[n].denominator}"', '${E[n][0]}'], 'The answer is E(n), from the start. Right.']],
  },

  'self-loops': {
    know: 'A wasted roll leaves the token where it is, so E(d) = 1 + (Σ E(d − f) + (s − fits) · E(d)) / s. Solving for E(d) divides by fits, the faces that don’t waste the roll.',
    swap: pair(['        E[d] = (s + sum(E[d - f] for f in range(1, fits + 1))) / Fraction(fits)', '        E[d] = (s + sum(E[d - f] for f in range(1, fits + 1))) / Fraction(s)'], ['    E.push(div(total, F(BigInt(fits))))', '    E.push(div(total, F(BigInt(s))))']),
    symptom: { args: [1, 2], expected: '2/1', buggy: '1/1' },
    bug: 'A wasted roll is counted as the end',
    why: 'Dividing by s gives E(d) = 1 + Σ E(d − f) / s: the faces that overshoot add nothing more, as if they finished the game. One square from the end with a 2-sided die, the 2 is wasted half the time, so it takes 2 rolls on average, but {call} returned {got} instead of {want}. While every face fits (d ≥ s), fits = s and the bug is hidden.',
    fix: 'Divide by the faces that fit: / Fraction(fits).',
    clues: ['One square to go with a 2-sided die. How often does a roll land exactly?', 'A roll that lands with chance 1/2: how many rolls on average?', 'Solve E = 1 + E/2 for E. What did you divide by?'],
    decoys: [[['fits = min(s, d)', 'const fits = Math.min(s, d)'], 'Faces 1 … d fit; larger ones are wasted. Right.'], [['E = [Fraction(0)] * (n + 1)', 'const E = [F(0n)]'], 'E(0) = 0: on the last square. Right.'], [['for d in range(1, n + 1):', 'for (let d = 1; d <= n; d++) {'], 'A move only goes to a smaller distance, so fill upwards. Right.']],
  },

  'cyclic-expectations': {
    know: 'A jump square has no roll of its own: E(i) = E(to). Moved to one side, that is E(i) − E(to) = 0, so row i has +1 in column i and −1 in column to.',
    swap: pair(['                A[i][to[i]] -= 1', '                A[i][to[i]] += 1'], ['      if (to.get(i) < n) A[i][to.get(i)] = sub(A[i][to.get(i)], F(1n))', '      if (to.get(i) < n) A[i][to.get(i)] = add(A[i][to.get(i)], F(1n))']),
    symptom: { args: [2, 2, [[1, 0]]], expected: '2/1', buggy: '2/3' },
    bug: 'A jump’s equation has the wrong sign',
    why: 'Adding 1 in column to writes E(i) + E(to) = 0, which says E(i) = −E(to). On a 2-square board where square 1 is a snake back to 0, every roll from 0 either lands on 1 and slides back or wastes itself, until a 2 lands on the end: 2 rolls on average. The solved system gives {got} instead of {want} for {call}.',
    fix: 'Move E(to) to the left with a minus: A[i][to[i]] -= 1.',
    clues: ['With the snake, which square is the token ever on after a roll?', 'Write the equation E(1) = E(0) with everything on the left.', 'Compare it with the row the code builds for square 1.'],
    decoys: [[['A[i][i] += 1', 'A[i][i] = add(A[i][i], F(1n))'], 'Every row starts with E(i). Right.'], [['j = i + f if i + f <= n else i', 'const j = i + f <= n ? i + f : i'], 'A roll past n is wasted: the token stays on i. Right.'], [['A[i][j] -= Fraction(1, s)', 'sub(A[i][j], F(1n, BigInt(s)))'], 'Each face’s square moves to the left with weight 1/s. Right.']],
  },

  'coupon-collector': {
    know: 'From S, E(S) = 1 + Σ (w(i)/W) · E(S ∪ {i}) + (w(S)/W) · E(S). Multiplying by W and collecting the E(S) terms gives (W − w(S)) · E(S) = W + Σ w(i) · E(S ∪ {i}): the 1 for the draw becomes W.',
    swap: pair(['        total = Fraction(W)', '        total = Fraction(1)'], ['    let total = F(BigInt(W))', '    let total = F(1n)']),
    symptom: { args: [[1, 1]], expected: '3/1', buggy: '3/2' },
    bug: 'The draw is counted as 1, not W',
    why: 'The equation was multiplied through by W, but the 1 for the draw was left as 1, so each draw costs only 1/W. With two equally likely types, the second one takes 2 draws on average after the first: 3 in all. {call} returned {got} instead of {want}. With a total weight W = 1 nothing changes.',
    fix: 'Start the total at W: total = Fraction(W).',
    clues: ['Two equally likely types: how many draws does the first take, and the second?', 'Write E(S) = 1 + … and multiply both sides by W.', 'What does that do to the 1?'],
    decoys: [[['for S in range(full - 1, -1, -1):', 'for (let S = full - 1; S >= 0; S--) {'], 'Bigger sets first, so E(S ∪ {i}) is ready. Right.'], [['total += w[i] * E[S | 1 << i]', 'E[S | (1 << i)]'], 'A missing type i moves to S ∪ {i} with weight w(i). Right.'], [['E[S] = total / (W - have)', 'E[S] = div(total, F(BigInt(W - have)))'], 'The self-loop solved: divide by W − w(S). Right.']],
  },

  'moments': {
    know: 'T = 1 + T′, where T′ is the rolls after the first. So T² = (1 + T′)² = 1 + 2T′ + T′², and averaging gives S(d) = 1 + 2 · avg E(next) + avg S(next).',
    swap: pair(['        S[d] = 1 + 2 * sum(E[j] for j in nxt) / k + sum(S[j] for j in nxt) / k', '        S[d] = 1 + sum(E[j] for j in nxt) / k + sum(S[j] for j in nxt) / k'], ['    S.push(add(add(F(1n), div(mul(F(2n), e), k)), div(s, k)))', '    S.push(add(add(F(1n), div(e, k)), div(s, k)))']),
    symptom: { args: [[1], 2], expected: '0/1', buggy: '-1/1' },
    bug: 'The cross term lost its 2',
    why: 'Without the 2, S(d) is the mean of 1 + T′ + T′², which is not (1 + T′)². With one face, 1, and 2 squares to go, it always takes 2 rolls, so the variance is 0; but S(2) comes out 3 instead of 4, and {call} returned {got} instead of {want}. A variance can never be negative.',
    fix: 'Keep the cross term doubled: 1 + 2 · avg E + avg S.',
    clues: ['With one face, 1, and 2 to go: what is T, and T²?', 'Expand (1 + T′)².', 'Compare it with the line that fills S.'],
    decoys: [[['E[d] = 1 + sum(E[j] for j in nxt) / k', 'E.push(add(F(1n), div(e, k)))'], 'The mean, as in expected time. Right.'], [['nxt = [max(0, d - f) for f in faces]', 'E[Math.max(0, d - f)]'], 'Where each face leaves the token. Right.'], [['v = S[n] - E[n] ** 2', 'const v = sub(S[n], mul(E[n], E[n]))'], 'The variance E[T²] − E[T]². Right.']],
  },

  'conditional-dp': {
    know: 'headsT and headsH hold each path’s chance times its number of heads. A head added to a path raises its count by 1, so the path’s heads mass goes up by its chance: (heads + chance) · p.',
    swap: pair(['            (headsT + endT) * p,', '            headsT * p,'], ['    ;[endT, endH, headsT, headsH] = [(endT + endH) * q, endT * P, (headsT + headsH) * q, (headsT + endT) * P]', '    ;[endT, endH, headsT, headsH] = [(endT + endH) * q, endT * P, (headsT + headsH) * q, headsT * P]']),
    symptom: { args: [1, 50], expected: '1/2', buggy: '0/1' },
    bug: 'The new head is never counted',
    why: 'A path ending in a head carries over the heads of the path it extended, but not the head just flipped, so every head is missed. One flip at 50% has no two heads together either way, and half the time it is a head: the mean is 1/2. {call} returned {got} instead of {want}.',
    fix: 'Add the path’s chance when a head is added: (headsT + endT) * p.',
    clues: ['One flip at 50%: what is the expected number of heads?', 'After that flip, what should headsH hold?', 'Which term adds 1 for each path that ends in the new head?'],
    decoys: [[['endT, endH = 1, 0', 'let endT = 1n, endH = 0n'], 'No flips: the empty sequence, which a head may follow. Right.'], [['for _ in range(n):', 'for (let i = 0; i < n; i++) {'], 'One step per flip. Right.'], [['x = Fraction(headsT + headsH, endT + endH)', 'top = headsT + headsH, bottom = endT + endH'], 'Divide once, at the end. Right.']],
  },

  'stochastic-control': {
    know: 'A risky try costs b and succeeds with chance p/100; a failure leaves you where you were. V = b + (p/100) · V(i + 2) + (1 − p/100) · V solves to V = 100 · b / p + V(i + 2): about 100/p tries.',
    swap: pair(['        risky = Fraction(100 * b[i], p[i]) + V[i + 2]', '        risky = Fraction(b[i] * p[i], 100) + V[i + 2]'], ['    const risky = add(F(BigInt(100 * b[i]), BigInt(p[i])), V[i + 2])', '    const risky = add(F(BigInt(b[i] * p[i]), 100n), V[i + 2])']),
    symptom: { args: [[2], [1], [25]], expected: '2/1', buggy: '1/4' },
    bug: 'The cost is multiplied by the chance instead of divided',
    why: 'b · p/100 is the cost of a try weighted by its chance of success, as if a failure cost nothing and ended the matter. A try that works one time in four takes 4 tries on average, cost 4, so the safe way (2) is better; the buggy cost of 1/4 makes risky look cheap: {call} returned {got} instead of {want}. At p = 100 the two agree.',
    fix: 'Divide by the chance: Fraction(100 * b[i], p[i]).',
    clues: ['A try that succeeds with chance 25%: how many tries on average?', 'Write V = b + (p/100) · V(i + 2) + (1 − p/100) · V and solve for V.', 'Does the code multiply or divide by p?'],
    decoys: [[['safe = a[i] + V[i + 1]', 'const safe = add(F(BigInt(a[i])), V[i + 1])'], 'The safe way: pay a(i), on to the next stage. Right.'], [['V[i] = min(safe, risky)', 'V[i] = less(risky, safe) ? risky : safe'], 'The cheaper of the two. Right.'], [['V = [Fraction(0)] * (n + 2)', 'V = new Array(n + 2).fill(F(0n))'], 'V(n) = V(n + 1) = 0. Right.']],
  },
}
