// "Check yourself" for the algebraic lessons (Expert, algebraic group). Format and checks: checks.js and
// checks.test.js; the numbers come from expert-oracles.js. Lessons whose answer is a list ask about
// one entry of it (part).

const k3 = [0, 1, 2].flatMap(u => [0, 1, 2].map(v => [u, v]))
const lineGraph = [[0, 1, 1], [1, 2, 1], [0, 2, 5], [1, 1, 1]]

export const ALGEBRA_CHECKS = {
  'matrix-power': [
    {
      know: 'Aⁿ(i, j) counts the walks of n edges from i to j, and repeated squaring reaches Aⁿ in about log₂ n products.',
      ask: 'Three vertices with every edge, loops included (9 edges). How many walks of 3 edges go from 0 to 2?',
      args: [3, k3, 3], answer: 9,
      misconceptions: [
        { answer: 27, feedback: '27 counts every walk of 3 edges from 0, wherever it ends. A third of them end at 2.' },
      ],
      explain: 'The first two steps go anywhere (3 · 3 ways); the last must go to 2: 9.',
    },
    {
      know: 'One matrix product of k × k matrices costs k³ multiplications.',
      ask: 'What does Aⁿ cost by repeated squaring, for n = 10¹⁵ and k = 6?',
      options: [
        { text: 'About 2 · log₂ n products, each 6³: around 20 000 multiplications', right: true, why: 'About 50 squarings and up to 50 more products for the binary digits, each 216 multiplications.' },
        { text: 'About n · k² multiplications', why: 'That is stepping through all n rows of the table, which squaring avoids.' },
        { text: 'About log₂ n multiplications', why: 'Each of the log₂ n steps is a whole matrix product, k³ multiplications.' },
      ],
    },
    {
      know: 'Repeated squaring needs only that the product is associative: (XY)Z = X(YZ).',
      ask: 'Why does the order of the squarings not matter?',
      options: [
        { text: 'Powers of the same matrix commute and the product is associative, so any grouping gives Aⁿ', right: true, why: 'Aⁱ · Aʲ = Aʲ · Aⁱ = Aⁱ⁺ʲ, however the factors are grouped.' },
        { text: 'Because matrix products always commute', why: 'They don’t in general; powers of one matrix do.' },
        { text: 'It does matter: the squares must be multiplied smallest first', why: 'Any order gives the same Aⁿ, because the factors are all powers of A.' },
      ],
    },
  ],

  'linear-recurrence': [
    {
      know: 'a(i) = c[0]·a(i − 1) + c[1]·a(i − 2): the first weight goes with the term just before.',
      ask: 'a(i) = a(i − 1) + 2·a(i − 2), with a(0) = a(1) = 1. What is a(5)?',
      args: [[1, 2], [1, 1], 5], answer: 21,
      misconceptions: [
        { answer: 41, feedback: '41 swaps the weights: 2·a(i − 1) + a(i − 2). The 2 goes with a(i − 2).' },
      ],
      explain: 'The terms run 1, 1, 3, 5, 11, 21.',
    },
    {
      know: 'Kitamasa works with polynomials of degree below k, reduced by the recurrence.',
      ask: 'Why is it cheaper than the k × k matrix power?',
      options: [
        { text: 'A reduced polynomial product costs about k², a matrix product k³', right: true, why: 'Both take about log₂ n products; the polynomial is k numbers, the matrix k².' },
        { text: 'It needs fewer steps than log₂ n', why: 'It needs the same number of squarings; each one is cheaper.' },
        { text: 'It avoids the modulus', why: 'Both work modulo p; the saving is in the size of each product.' },
      ],
    },
    {
      know: 'xⁿ reduced to r₀ + r₁x + … means a(n) = r₀a(0) + r₁a(1) + ….',
      ask: 'With a(i) = a(i − 1) + a(i − 2), x² reduces to x + 1. What does that say?',
      options: [
        { text: 'a(2) = a(1) + a(0)', right: true, why: 'x stands for a(1) and 1 for a(0).' },
        { text: 'a(2) = a(1) · a(0)', why: 'The reduced polynomial is a weighted sum of the first terms, not a product.' },
        { text: 'a(2) = 2', why: 'It depends on the first terms: 1 and x stand for a(0) and a(1).' },
      ],
    },
  ],

  'berlekamp-massey': [
    {
      know: 'Berlekamp–Massey finds the shortest recurrence that fits every given term.',
      ask: 'The terms are 2, 5, 11, 23. What comes next?',
      args: [[2, 5, 11, 23]], answer: 47,
      misconceptions: [
        { answer: 46, feedback: '46 only doubles. Each term is twice the one before, plus 1.' },
      ],
      explain: 'a(i) = 2·a(i − 1) + 1, a recurrence of length 2 (a(i) = 3a(i − 1) − 2a(i − 2)): 2 · 23 + 1 = 47.',
    },
    {
      know: 'A recurrence of length L is fixed by 2L terms; with fewer, several recurrences can fit.',
      ask: 'Is a recurrence found from a few terms proof that the sequence follows it?',
      options: [
        { text: 'No: it is the shortest that fits the terms given, and the sequence may change later', right: true, why: 'Only a proof about how the sequence is made can show it continues; the terms are evidence.' },
        { text: 'Yes: if it fits the terms, it is the rule', why: 'Infinitely many sequences share any finite beginning.' },
        { text: 'Yes, if at least 10 terms are given', why: 'No number of terms proves the rule; a longer recurrence may still be at work.' },
      ],
    },
    {
      know: 'The algorithm looks at each term once and corrects a recurrence of length at most L.',
      ask: 'What does Berlekamp–Massey cost for N terms?',
      options: [
        { text: 'O(N²)', right: true, why: 'Each of the N terms costs O(L) to check and correct, and L ≤ N.' },
        { text: 'O(N³)', why: 'That is solving a linear system from scratch, which the corrections avoid.' },
        { text: 'O(N log N)', why: 'Each term’s check and correction is a loop over the recurrence, O(L).' },
      ],
    },
  ],

  'bostan-mori': [
    {
      know: 'The coefficients of P/Q satisfy Q·f = P, so each one follows from the ones before.',
      ask: 'P = 1 + x and Q = 1 − x − 2x². What is the coefficient of x⁵ in P/Q?',
      args: [[1, 1], [1, -1, -2], 5], answer: 32,
      misconceptions: [
        { answer: 16, feedback: '16 is the coefficient of x⁴. The coefficients are 1, 2, 4, 8, 16, 32.' },
      ],
      explain: 'f(i) = f(i − 1) + 2·f(i − 2) + P(i): 1, 2, 4, 8, 16, 32.',
    },
    {
      know: 'Each Bostan–Mori round multiplies top and bottom by Q(−x), and Q(x)Q(−x) has only even powers.',
      ask: 'Why does Q(x)Q(−x) have only even powers?',
      options: [
        { text: 'Replacing x by −x leaves it unchanged, so its odd coefficients are 0', right: true, why: 'Q(−x)Q(x) is the same product, and a polynomial equal to its mirror has no odd terms.' },
        { text: 'Because Q has only even powers', why: 'Q can have any powers; it is the product with Q(−x) that is even.' },
        { text: 'Because Q(0) = 1', why: 'Q(0) = 1 only keeps the series defined; evenness comes from the mirror.' },
      ],
    },
    {
      know: 'Each round costs a few products of polynomials of degree d, and halves n.',
      ask: 'What does Bostan–Mori cost?',
      options: [
        { text: 'O(d² log n) with plain multiplication', right: true, why: 'About log₂ n rounds, each a product of degree-d polynomials.' },
        { text: 'O(n · d)', why: 'That is computing every coefficient up to n.' },
        { text: 'O(d³ log n)', why: 'That is the matrix power of a d × d matrix; the polynomials need only d² per round.' },
      ],
    },
  ],

  'generating-functions': [
    {
      know: 'Each coefficient of gᵐ comes from the few before it, through g·f′ = m·g′·f.',
      ask: 'What is the coefficient of x² in (1 + x + x²)²?',
      args: [[1, 1, 1], 2, 2], answer: 3,
      misconceptions: [
        { answer: 2, feedback: '2 counts 1·x² and x²·1 but misses x·x.' },
      ],
      explain: 'x² comes from 1·x², x·x and x²·1: 3.',
    },
    {
      know: 'In a generating function, multiplying by g corresponds to adding one more independent choice.',
      ask: 'What does the coefficient of xⁿ in (1 + x + x²)^m count?',
      options: [
        { text: 'The ways to give 0, 1 or 2 to each of m people so that n is given in all', right: true, why: 'Each factor is one person’s choice; the exponents add up to the total.' },
        { text: 'The ways to choose n of m people', why: 'That is (1 + x)^m; here each person can take up to 2.' },
        { text: 'The number of n-digit numbers in base m', why: 'The base is not involved; each factor is one choice of 0, 1 or 2.' },
      ],
    },
    {
      know: 'The recurrence gives k·f(k), so each f(k) is found by dividing by k modulo p.',
      ask: 'Why must the modulus be larger than n?',
      options: [
        { text: 'So that 1, 2, …, n all have inverses modulo p', right: true, why: 'Dividing by k needs k’s inverse, which exists only if p doesn’t divide k.' },
        { text: 'So that the counts don’t overflow', why: 'Working modulo p already keeps the numbers small; the issue is division.' },
        { text: 'It needn’t be', why: 'If p divided some k ≤ n, f(k) could not be divided by k.' },
      ],
    },
  ],

  'fft-ntt': [
    {
      know: 'c(s) = Σ A(i)·B(s − i), where A and B count the values in each list.',
      ask: 'a = [0, 1, 2], b = [0, 2]. How many pairs add up to 2?',
      args: [[0, 1, 2], [0, 2]], part: 2, answer: 2,
      misconceptions: [
        { answer: 1, feedback: '1 finds 2 + 0 but misses 0 + 2.' },
      ],
      explain: 'Two pairs: 2 + 0 and 0 + 2.',
    },
    {
      know: 'An NTT is an FFT modulo a prime p with p − 1 divisible by a large power of 2.',
      ask: 'Why use an NTT instead of a floating-point FFT?',
      options: [
        { text: 'Its arithmetic is exact, so large counts come out without rounding errors', right: true, why: 'Floating-point products round, and long sums can drift away from the exact integer.' },
        { text: 'It is always faster', why: 'Both are O(n log n); the NTT’s advantage is exactness.' },
        { text: 'An FFT can’t multiply polynomials', why: 'It can multiply them; it just rounds along the way.' },
      ],
    },
    {
      know: 'The transform has size n, a power of two, at least the length of the product.',
      ask: 'What happens if n is too small?',
      options: [
        { text: 'Coefficients past n wrap around and add onto the low ones', right: true, why: 'The transform multiplies modulo xⁿ − 1, so xⁿ becomes 1.' },
        { text: 'Nothing: the high coefficients are just dropped', why: 'They are not dropped; they land on top of the low ones.' },
        { text: 'The transform refuses to run', why: 'It runs and gives a wrapped-around answer.' },
      ],
    },
  ],

  'sos': [
    {
      know: 'F(mask) adds a over every submask, built one bit at a time.',
      ask: 'a = [1, 0, 2, 0, 3, 0, 4, 1] for masks 000 … 111. What is F(110)?',
      args: [[1, 0, 2, 0, 3, 0, 4, 1]], part: 6, answer: 10,
      misconceptions: [
        { answer: 11, feedback: '11 is F(111). 110’s submasks leave out bit 0: 000, 010, 100 and 110.' },
      ],
      explain: 'a(000) + a(010) + a(100) + a(110) = 1 + 2 + 3 + 4 = 10.',
    },
    {
      know: 'Listing every submask of every mask visits each (mask, submask) pair once.',
      ask: 'How many pairs is that, for n bits?',
      options: [
        { text: '3ⁿ: each bit is in neither, in the mask only, or in both', right: true, why: 'Three choices per bit, independently.' },
        { text: '4ⁿ', why: 'A submask can’t have a bit the mask lacks, so one of the four cases is impossible.' },
        { text: '2ⁿ', why: 'That is the number of masks; each has many submasks.' },
      ],
    },
    {
      know: 'The same sweep with the condition reversed adds the mask with the bit to the mask without it.',
      ask: 'What does that compute?',
      options: [
        { text: 'For each mask, the sum over its supersets', right: true, why: 'Each mask takes in the masks that contain it, bit by bit.' },
        { text: 'The same subset sums', why: 'It moves values downward, from bigger masks to smaller ones.' },
        { text: 'The original values', why: 'Undoing needs subtraction; this still adds.' },
      ],
    },
  ],

  'mobius': [
    {
      know: 'The inverse sweep subtracts, bit by bit, what the subset sum added.',
      ask: 'F = 1 for every mask of 3 bits. What is a(111)?',
      args: [[1, 1, 1, 1, 1, 1, 1, 1]], part: 7, answer: 0,
      misconceptions: [
        { answer: 1, feedback: 'If a(111) were 1, F(111) would be at least 2, counting a(000) too. Only a(000) = 1.' },
      ],
      explain: 'F is 1 everywhere exactly when a(000) = 1 and every other a is 0.',
    },
    {
      know: 'Inclusion–exclusion: a(S) = Σ over T ⊆ S of (−1)^|S ∖ T|·F(T).',
      ask: 'For S = 11, which signs do F(00), F(01), F(10), F(11) get?',
      options: [
        { text: '+, −, −, +', right: true, why: '|S ∖ T| is 2, 1, 1, 0: even, odd, odd, even.' },
        { text: '−, −, −, +', why: 'F(00) has |S ∖ T| = 2, even: it is added back.' },
        { text: '+, +, +, +', why: 'That is a sum over subsets again, not its inverse.' },
      ],
    },
    {
      know: 'The sum and its inverse are each n passes over 2ⁿ masks.',
      ask: 'What does applying the subset sum and then the inverse give?',
      options: [
        { text: 'The original values, unchanged', right: true, why: 'Each bit’s subtraction undoes exactly that bit’s addition.' },
        { text: 'Twice the values', why: 'The inverse undoes the sum; nothing is doubled.' },
        { text: 'The superset sums', why: 'Superset sums come from the reversed sweep, not from undoing.' },
      ],
    },
  ],

  'subset-convolution': [
    {
      know: 'c(S) adds a(T)·b(S ∖ T) over the submasks T of S: the two parts never overlap.',
      ask: 'a = [1, 1] and b = [2, 3] for masks 0 and 1. What is c(1)?',
      args: [[1, 1], [2, 3]], part: 1, answer: 5,
      misconceptions: [
        { answer: 8, feedback: '8 also counts a(1)·b(1), but those parts overlap: both contain element 0.' },
      ],
      explain: 'a(0)·b(1) + a(1)·b(0) = 3 + 2 = 5.',
    },
    {
      know: 'Multiplying subset sums pointwise counts pairs (T, U) whose union is inside S.',
      ask: 'Why isn’t that enough on its own?',
      options: [
        { text: 'It also counts overlapping pairs; keeping sizes that add up to |S| removes them', right: true, why: 'Overlapping parts have sizes adding up to more than their union.' },
        { text: 'It counts each pair twice', why: 'The problem is overlap, not double counting.' },
        { text: 'It is enough: that is the subset convolution', why: 'That gives the OR convolution, where T and U may overlap.' },
      ],
    },
    {
      know: 'The ranked method costs n² · 2ⁿ; listing every split costs 3ⁿ.',
      ask: 'At n = 20, roughly how do they compare?',
      options: [
        { text: 'About 4 × 10⁸ against 3.5 × 10⁹: the ranked method wins', right: true, why: '20² · 2²⁰ ≈ 4.2 × 10⁸ and 3²⁰ ≈ 3.5 × 10⁹.' },
        { text: 'About the same', why: '3ⁿ grows faster than n² · 2ⁿ; by n = 20 it is about 8 times larger.' },
        { text: 'Listing wins', why: 'Only for small n; by n = 20 the ranked method is far ahead.' },
      ],
    },
  ],

  'walsh-hadamard': [
    {
      know: 'c(k) adds a(i)·b(j) over the pairs with i XOR j = k.',
      ask: 'a = [1, 2, 0, 0] and b = [0, 1, 2, 0] for indices 00 … 11. What is c(11)?',
      args: [[1, 2, 0, 0], [0, 1, 2, 0]], part: 3, answer: 4,
      misconceptions: [
        { answer: 9, feedback: '9 adds every product a(i)·b(j), whatever their XOR.' },
      ],
      explain: '01 XOR 10 = 11: a(01)·b(10) = 2 · 2 = 4; the other pairs giving 11 are 0.',
    },
    {
      know: 'The transform is a sum, over each bit, of plus and minus signs.',
      ask: 'Why does the transform turn XOR into a pointwise product?',
      options: [
        { text: 'Each transformed value weighs index i by (−1)^(popcount(i AND u)), and those signs multiply under XOR', right: true, why: 'The sign for i XOR j is the product of the signs for i and j.' },
        { text: 'Because i XOR j is never larger than i + j', why: 'Sizes play no part; what matters is that the signs for i and j multiply to the sign for i XOR j.' },
        { text: 'It turns XOR into a sum, not a product', why: 'The transforms multiply pointwise; that is the point.' },
      ],
    },
    {
      know: 'Transforming twice multiplies every value by 2ⁿ.',
      ask: 'Why is dividing by 2ⁿ at the end exact for integer inputs?',
      options: [
        { text: 'The true result is an integer list, and the double transform is exactly 2ⁿ times it', right: true, why: 'So each value is a multiple of 2ⁿ before the division.' },
        { text: 'It isn’t: the result must be rounded', why: 'Every step is exact integer arithmetic; nothing needs rounding.' },
        { text: 'Because 2ⁿ divides every input', why: 'The inputs are arbitrary; it is the double transform that brings the factor.' },
      ],
    },
  ],

  'semirings': [
    {
      know: 'The (min, +) matrix power gives the cheapest walk of exactly n edges.',
      ask: 'Edges 0 → 1 (cost 1), 1 → 2 (1), 0 → 2 (5) and a loop 1 → 1 (1). The cheapest walk of exactly 1 edge from 0 to 2?',
      args: [3, lineGraph, 1], answer: 5,
      misconceptions: [
        { answer: 2, feedback: '2 is the walk 0 → 1 → 2, which has 2 edges, not 1.' },
      ],
      explain: 'Only the direct edge has exactly 1 edge: 5.',
    },
    {
      know: 'A semiring needs an associative “sum”, an associative “product”, and the product distributing over the sum.',
      ask: 'Which pair works for counting walks, and which for reachability?',
      options: [
        { text: '(+, ×) for counting; (OR, AND) for reachability', right: true, why: 'Counting adds walks and multiplies choices; reachability asks whether any walk exists.' },
        { text: '(×, +) for counting', why: 'Counting adds the walks and multiplies the choices along them, not the other way.' },
        { text: '(min, +) for both', why: 'That finds cheapest walks; it can’t count them.' },
      ],
    },
    {
      know: 'Repeated squaring needs the product to be associative.',
      ask: 'Would (max, +) work for the most expensive walk of exactly n edges?',
      options: [
        { text: 'Yes: (max, +) is also a semiring, with −∞ as its zero', right: true, why: '+ distributes over max just as it does over min.' },
        { text: 'No: only min works', why: 'max and min behave the same way here; both are semirings with +.' },
        { text: 'Only if every weight is positive', why: 'The signs don’t matter for exactly n edges; the algebra holds for any weights.' },
      ],
    },
  ],

  'transfer-matrix': [
    {
      know: 'Tⁿ(0, 0) counts the tilings, where T(s, s′) counts the ways to fill one column.',
      ask: 'How many ways are there to tile a 3 × 4 board with dominoes?',
      args: [3, 4], answer: 11,
      misconceptions: [
        { answer: 3, feedback: '3 is the 3 × 2 board. A 3 × 4 board has 11.' },
      ],
      explain: 'Of 3 × 4’s 11 tilings, 9 split into two 3 × 2 halves (3 · 3 ways), and 2 more lock across the middle.',
    },
    {
      know: 'A board w cells tall has 2ʷ column profiles.',
      ask: 'How large is T for w = 4?',
      options: [
        { text: '16 × 16', right: true, why: 'Each of the 4 cells is either sticking in or not: 2⁴ profiles.' },
        { text: '4 × 4', why: 'The profiles are subsets of the 4 cells, not the cells themselves.' },
        { text: '8 × 8', why: 'Each of 4 cells has 2 states: 2⁴ = 16 profiles.' },
      ],
    },
    {
      know: 'A 3 × n board has 3n cells, and each domino covers 2.',
      ask: 'How many tilings does a 3 × 3 board have?',
      options: [
        { text: '0: 9 cells can’t be covered by dominoes of 2', right: true, why: 'An odd number of cells can never be tiled.' },
        { text: '3', why: '3 × 3 has 9 cells, an odd number; no tiling exists.' },
        { text: '1', why: 'Dominoes cover cells two at a time, so 9 cells can’t be covered.' },
      ],
    },
  ],
}
