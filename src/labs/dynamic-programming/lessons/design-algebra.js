// "Design it yourself" for the algebraic lessons (Expert, algebraic group). Format: designs.js.
// Lessons with a live table ask for one of its cells; berlekamp-massey (no table) asks a second
// hand-solved case. Every number was printed by expert-oracles.js before it was typed. The lessons
// whose answer is a list ask their try-first about its last entry (PICK in designs.test.js).

export const ALGEBRA_DESIGNS = {
  'matrix-power': {
    problem: 'Count the walks of exactly n edges from vertex 0 to vertex k − 1 of a small graph, for n up to 10¹⁵, far too many steps to take one at a time.',
    tryFirst: {
      prompt: 'Edges 0 → 0, 0 → 1 and 1 → 0. How many walks of exactly 3 edges go from 0 to 1?',
      args: [2, [[0, 0], [0, 1], [1, 0]], 3], answer: 2,
      misconceptions: [
        { answer: 5, feedback: '5 counts every walk of 3 edges from 0, wherever it ends. Only those ending at 1 count.' },
      ],
      explain: '0 → 0 → 0 → 1 and 0 → 1 → 0 → 1.',
    },
    steps: [
      { kind: 'state', ask: 'What does a row of the table hold?', options: [
        { text: 'W(s, v) for every v: the walks of s edges from 0 that end at v', right: true, why: 'A walk’s next edge depends only on where it ends now.' },
        { text: 'W(s): the walks of s edges from 0, wherever they end', why: 'The next edge depends on where a walk ends, so the end vertex must be kept.' },
      ] },
      { kind: 'split', ask: 'What is the last choice of a walk of s edges ending at v?', options: [
        { text: 'Its last edge, u → v', right: true, why: 'Every such walk is a walk of s − 1 edges to u, then one edge.' },
        { text: 'Its first edge, 0 → u', why: 'Then the rest starts at u, not 0: the table would need every start.' },
      ] },
      { kind: 'recurrence', ask: 'How is row s made from row s − 1?', options: [
        { text: 'W(s, v) = Σ over edges u → v of W(s − 1, u): the row times the adjacency matrix A', right: true, why: 'The same linear map every step, so row n = row 0 · Aⁿ.' },
        { text: 'W(s, v) = Σ over edges v → u of W(s − 1, u)', why: 'That follows the edges backwards: walks into v come along edges that end at v.' },
      ] },
      { kind: 'base', ask: 'What is row 0?', options: [
        { text: '1 at vertex 0, 0 elsewhere: the empty walk', right: true, why: 'A walk of no edges stays at its start.' },
        { text: '1 at every vertex', why: 'That counts walks from every start, not only from 0.' },
      ] },
      { kind: 'order', ask: 'How is row n reached for n = 10¹⁵?', options: [
        { text: 'Compute Aⁿ by repeated squaring: A, A², A⁴, …, multiplying in the powers n’s binary digits call for', right: true, why: 'About log₂ n ≈ 50 squarings of a k × k matrix.' },
        { text: 'Square A n times', why: 'Squaring n times gives A to the power 2ⁿ, not Aⁿ.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'Aⁿ(0, k − 1)', right: true, why: 'Walks of n edges from 0 that end at k − 1.' },
        { text: 'The sum of row 0 of Aⁿ', why: 'That counts walks ending anywhere, not at k − 1.' },
      ] },
    ],
    apply: { cell: [3, 2], misconceptions: [
      { answer: 1, feedback: '1 leaves out the loop 2 → 2, which brings W(2,2) = 2.' },
      { answer: 2, feedback: '2 leaves out the edge 0 → 2, which brings W(2,0) = 1.' },
    ] },
  },

  'linear-recurrence': {
    problem: 'A sequence follows a(i) = c₁a(i − 1) + … + cₖa(i − k). Find a(n) for n up to 10¹⁵, when stepping through every term is far too slow.',
    tryFirst: {
      prompt: 'a(0) = 3 and a(i) = 2·a(i − 1). What is a(4)?',
      args: [[2], [3], 4], answer: 48,
      misconceptions: [
        { answer: 24, feedback: '24 is a(3): one doubling short. 3 → 6 → 12 → 24 → 48.' },
      ],
      explain: 'Each step doubles: 3, 6, 12, 24, 48, so 3 · 2⁴ = 48.',
    },
    steps: [
      { kind: 'state', ask: 'What represents “n steps forward”?', options: [
        { text: 'xⁿ reduced with the rule xᵏ = c₁xᵏ⁻¹ + … + cₖ: a polynomial of degree below k', right: true, why: 'Multiplying by x is one step; the rule is the recurrence, so the reduced polynomial says how a(n) mixes the first k terms.' },
        { text: 'The single term a(n − 1)', why: 'One term can’t give the next: the recurrence needs the k terms before it.' },
      ] },
      { kind: 'split', ask: 'How is xⁿ built?', options: [
        { text: 'By repeated squaring: x, x², x⁴, …, multiplying in what n’s binary digits need', right: true, why: 'About log₂ n multiplications of reduced polynomials.' },
        { text: 'By multiplying x by n', why: 'n·x is not xⁿ: steps combine by multiplying powers, not by scaling.' },
      ] },
      { kind: 'recurrence', ask: 'A product of two reduced polynomials has degree up to 2k − 2. How is it reduced?', options: [
        { text: 'Fold each power d ≥ k into d − 1 … d − k with the c’s, from the highest power down', right: true, why: 'A fold may land on a power still ≥ k, which is then folded in its turn.' },
        { text: 'Drop the powers of k and more', why: 'Those powers are real parts of the answer; the rule xᵏ = … rewrites them instead.' },
      ] },
      { kind: 'base', ask: 'What do the first values stand for?', options: [
        { text: 'x⁰ = 1 is a(0) itself, and a(0) … a(k − 1) are given', right: true, why: 'xⁱ for i < k is a(i); every other power reduces to these.' },
        { text: 'x⁰ = 0', why: 'x⁰ is zero steps forward: a(0) itself, with coefficient 1.' },
      ] },
      { kind: 'order', ask: 'What does the whole method cost?', options: [
        { text: 'O(k² log n)', right: true, why: 'log n polynomial products, each k² to multiply and k² to reduce.' },
        { text: 'O(k n)', why: 'That is computing every term, which the method avoids.' },
      ] },
      { kind: 'answer', ask: 'If xⁿ reduces to r₀ + r₁x + … + r_(k−1)x^(k−1), what is a(n)?', options: [
        { text: 'r₀a(0) + r₁a(1) + … + r_(k−1)a(k − 1)', right: true, why: 'Each xⁱ stands for a(i), and the map is linear.' },
        { text: 'r₀ + r₁ + … + r_(k−1)', why: 'The coefficients weigh the first terms; they are not the answer on their own.' },
      ] },
    ],
    apply: { cell: [0, 4], input: { c: [2, 1], a: [1, 1], n: 6 }, misconceptions: [
      { answer: 13, feedback: '13 swaps the weights: 1·a(3) + 2·a(2). The 2 goes with the term just before: 2·7 + 1·3.' },
      { answer: 7, feedback: '7 is a(3) alone. a(4) = 2·a(3) + a(2).' },
    ] },
  },

  'berlekamp-massey': {
    problem: 'Given enough terms of a sequence that follows some unknown linear recurrence, find that recurrence and continue the sequence.',
    tryFirst: {
      prompt: 'The terms are 1, 3, 9, 27. What comes next?',
      args: [[1, 3, 9, 27]], answer: 81,
      misconceptions: [
        { answer: 36, feedback: '36 adds the last two terms. Each term is 3 times the one before.' },
      ],
      explain: 'a(i) = 3·a(i − 1), so 3 · 27 = 81.',
    },
    steps: [
      { kind: 'state', ask: 'What is kept while scanning the terms?', options: [
        { text: 'The shortest recurrence C that fits every term so far, and its length L', right: true, why: 'Each new term either fits C or forces it to change.' },
        { text: 'Every recurrence that fits so far', why: 'There can be very many; the shortest one is enough, and it is unique once 2L terms are seen.' },
      ] },
      { kind: 'split', ask: 'What happens at each new term s(i)?', options: [
        { text: 'Compute the discrepancy: how far C’s prediction is from s(i)', right: true, why: 'Zero means C still fits; anything else must be corrected.' },
        { text: 'Restart from the empty recurrence', why: 'That forgets every earlier term; the new recurrence would fit only the latest ones.' },
      ] },
      { kind: 'recurrence', ask: 'How is C corrected when the discrepancy d is not 0?', options: [
        { text: 'Subtract (d / b)·xᵐ·B, the recurrence from the last failure, scaled and shifted to cancel this error', right: true, why: 'B’s own error b at that time, shifted m terms on, cancels exactly d, and fixes nothing that was right.' },
        { text: 'Change C’s last coefficient until it predicts s(i)', why: 'That breaks its predictions for the earlier terms.' },
      ] },
      { kind: 'base', ask: 'What are C and L at the start?', options: [
        { text: 'C = 1 (the empty recurrence) and L = 0', right: true, why: 'The empty recurrence predicts 0, which fits until the first nonzero term.' },
        { text: 'C = 1 + x and L = 1', why: 'That assumes every term equals the one before; nothing is known yet.' },
      ] },
      { kind: 'order', ask: 'When does the length grow?', options: [
        { text: 'When 2L ≤ i: then it becomes i + 1 − L, and the old C becomes the new B', right: true, why: 'Then no recurrence of the current length can fit all the terms seen.' },
        { text: 'At every nonzero discrepancy', why: 'Many corrections keep the same length; growing every time gives a longer recurrence than needed.' },
      ] },
      { kind: 'answer', ask: 'How is the next term found?', options: [
        { text: 'From the final recurrence: s(N) = −C₁s(N − 1) − … − C_L s(N − L)', right: true, why: 'The shortest recurrence is unique once at least 2L terms are given.' },
        { text: 'As the last discrepancy', why: 'The discrepancy is an error measure, not a term.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design. The terms are 1, 2, 4, 7, 12, 20. What comes next?',
      args: [[1, 2, 4, 7, 12, 20]], answer: 33,
      misconceptions: [
        { answer: 32, feedback: '32 adds the last two terms. Each term is the two before it plus 1: 20 + 12 + 1.' },
      ],
      explain: 'a(i) = a(i − 1) + a(i − 2) + 1, a recurrence of length 3: 20 + 12 + 1 = 33.',
    },
  },

  'bostan-mori': {
    problem: 'Find the coefficient of xⁿ in a power series P(x)/Q(x), for n up to 10¹⁵, without computing the coefficients in between.',
    tryFirst: {
      prompt: '1/(1 − 2x) = 1 + 2x + 4x² + … What is the coefficient of x⁴?',
      args: [[1], [1, -2], 4], answer: 16,
      misconceptions: [
        { answer: 8, feedback: '8 is the coefficient of x³. Each step doubles: 1, 2, 4, 8, 16.' },
      ],
      explain: 'The coefficient of xⁱ is 2ⁱ, so 2⁴ = 16.',
    },
    steps: [
      { kind: 'state', ask: 'What is kept from round to round?', options: [
        { text: 'A fraction P/Q and an index n, with the wanted coefficient unchanged', right: true, why: 'Each round rewrites the fraction so that the same coefficient sits at about half the index.' },
        { text: 'The bottom Q alone, and n', why: 'The top P decides the coefficients too; dropping it loses the answer.' },
      ] },
      { kind: 'split', ask: 'What does each round multiply top and bottom by?', options: [
        { text: 'Q(−x)', right: true, why: 'Q(x)Q(−x) is even, a polynomial in x², so the bottom halves its index.' },
        { text: 'Q(x)', why: 'Q(x)² has odd powers too, so nothing halves.' },
      ] },
      { kind: 'recurrence', ask: 'With bottom V(x²), which part of the top U(x) does coefficient n need?', options: [
        { text: 'The terms with n’s parity: U_even for even n, U_odd for odd n; then n becomes n div 2', right: true, why: 'Over an even bottom, the even and odd parts of the top give the even and odd coefficients separately.' },
        { text: 'Always the even terms', why: 'An odd n gets nothing from even terms; it needs the odd ones.' },
      ] },
      { kind: 'base', ask: 'When does it stop?', options: [
        { text: 'At n = 0: the coefficient is P(0)/Q(0)', right: true, why: 'The constant term of a fraction is the ratio of the constant terms.' },
        { text: 'When Q becomes 1', why: 'Q keeps its degree each round; it is n that shrinks to 0.' },
      ] },
      { kind: 'order', ask: 'How many rounds does it take?', options: [
        { text: 'About log₂ n, each a few small polynomial products', right: true, why: 'n halves every round, so the rounds stop after about log₂ n.' },
        { text: 'About n', why: 'n halves every round, so only about log₂ n rounds.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'P(0)/Q(0) when n reaches 0', right: true, why: 'The coefficient wanted has been carried to index 0.' },
        { text: 'P(n) of the original top', why: 'The original top has small degree; the series’ coefficients come from dividing by Q.' },
      ] },
    ],
    apply: { cell: [0, 3], input: { p: [1, 1], r: [1, 2], n: 6 }, misconceptions: [
      { answer: 10, feedback: '10 swaps the weights: 2·f(2) + 1·f(1). Q = 1 − x − 2x² puts the 2 on f(i − 2): 1·4 + 2·2.' },
      { answer: 4, feedback: '4 is f(2) alone. f(3) = f(2) + 2·f(1).' },
    ] },
  },

  'generating-functions': {
    problem: 'Find the coefficient of xⁿ in g(x)^m for a short polynomial g and m up to 100 000, when multiplying g in m times is too slow.',
    tryFirst: {
      prompt: 'What is the coefficient of x² in (1 + x)⁴?',
      args: [[1, 1], 4, 2], answer: 6,
      misconceptions: [
        { answer: 4, feedback: '4 is the coefficient of x. x² picks x from 2 of the 4 factors: C(4, 2) = 6.' },
      ],
      explain: 'Choose which 2 of the 4 factors give an x: C(4, 2) = 6.',
    },
    steps: [
      { kind: 'state', ask: 'What is computed?', options: [
        { text: 'The coefficients f(0), f(1), …, f(n) of f = gᵐ, in order', right: true, why: 'Each comes from the few before it.' },
        { text: 'Only f(n), from a formula in n and m', why: 'A general g has no such formula; the coefficients come from each other.' },
      ] },
      { kind: 'split', ask: 'What identity ties f to g?', options: [
        { text: 'g·f′ = m·g′·f, from differentiating f = gᵐ', right: true, why: 'f′ = m·gᵐ⁻¹·g′; multiplying by g gives the identity, with no power left in it.' },
        { text: 'f′ = m·f', why: 'That ignores g′; it would make f an exponential.' },
      ] },
      { kind: 'recurrence', ask: 'Comparing the coefficients of x^(k−1), what is f(k)?', options: [
        { text: 'f(k) = (1/k)·Σ over i ≥ 1 of g(i)·f(k − i)·(m·i − (k − i))', right: true, why: 'The g(0)·k·f(k) term is alone on the left; everything else moves across with its sign.' },
        { text: 'f(k) = (1/k)·Σ over i ≥ 1 of g(i)·f(k − i)·(m·i + (k − i))', why: 'The (k − i) term comes from the left side, so it changes sign when it moves across.' },
      ] },
      { kind: 'base', ask: 'What is f(0)?', options: [
        { text: '1, since g(0) = 1', right: true, why: 'The constant term of gᵐ is g(0)ᵐ = 1.' },
        { text: 'm', why: 'The constant term is g(0)ᵐ = 1ᵐ = 1.' },
      ] },
      { kind: 'order', ask: 'What does it cost?', options: [
        { text: 'O(n · deg g), plus the inverses of 1 … n', right: true, why: 'Each f(k) uses only deg g earlier coefficients.' },
        { text: 'O(n · m)', why: 'That is multiplying g in m times, which the identity avoids.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'f(n)', right: true, why: 'The coefficient of xⁿ in gᵐ.' },
        { text: 'f(m)', why: 'm is the power; n is the coefficient wanted.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 21, feedback: '21 is the sum before dividing by k = 3.' },
      { answer: 17, feedback: '17 adds (k − i) instead of subtracting it: (1·6·5 + 1·3·7) / 3.' },
    ] },
  },

  'fft-ntt': {
    problem: 'For two lists of values up to 16 383, count for every total s the pairs (one value from each list) that add up to s, when checking every pair is too slow.',
    tryFirst: {
      prompt: 'a = [1, 2, 2, 3] and b = [0, 1, 1]. How many pairs, one value from each, add up to 4?',
      args: [[1, 2, 2, 3], [0, 1, 1]], answer: 2,
      misconceptions: [
        { answer: 1, feedback: '1 counts 3 + 1 once, but b holds two 1s, by position.' },
      ],
      explain: '3 with either 1 in b: 2 pairs.',
    },
    steps: [
      { kind: 'state', ask: 'How are the lists represented?', options: [
        { text: 'As count polynomials: A(x) = Σ (how many a equal v)·xᵛ, the same for B', right: true, why: 'Then the pairs adding up to s are the coefficient of xˢ in A(x)·B(x).' },
        { text: 'As the sum of each list', why: 'A sum forgets which values there were, and pairs need every value.' },
      ] },
      { kind: 'split', ask: 'What is c(s) in terms of A and B?', options: [
        { text: 'Σ over i of A(i)·B(s − i): a convolution', right: true, why: 'Every pair adding up to s has some value i from a and s − i from b.' },
        { text: 'A(s)·B(s)', why: 'That pairs equal values, not values that add up to s.' },
      ] },
      { kind: 'recurrence', ask: 'How does the NTT compute the whole convolution?', options: [
        { text: 'Transform A and B, multiply pointwise, transform back', right: true, why: 'Evaluated at the roots of unity, a product of polynomials is a product of values.' },
        { text: 'Transform A and B, add pointwise, transform back', why: 'Adding transforms gives A + B, not their product.' },
      ] },
      { kind: 'base', ask: 'What size must the transform have?', options: [
        { text: 'A power of two at least max(a) + max(b) + 1', right: true, why: 'The product has that many coefficients; a smaller size wraps them around onto each other.' },
        { text: 'max(a) + 1', why: 'The product has degree max(a) + max(b); it would wrap around.' },
      ] },
      { kind: 'order', ask: 'How does the inverse transform differ?', options: [
        { text: 'It uses the inverse root of unity and divides by the size', right: true, why: 'Transforming forward twice gives size × the reversed list; the inverse root and the division undo the transform exactly.' },
        { text: 'It is the forward transform run again', why: 'That gives each coefficient at the mirrored index, times the size.' },
      ] },
      { kind: 'answer', ask: 'Why are the results exact counts?', options: [
        { text: 'Every count is below the modulus, 998 244 353, so the residue is the count', right: true, why: 'Counts are at most 16 384², about 2.7 × 10⁸.' },
        { text: 'Because the NTT rounds to the nearest integer', why: 'An NTT works in exact modular arithmetic; nothing is rounded.' },
      ] },
    ],
    apply: { cell: [2, 2], misconceptions: [
      { answer: 1, feedback: '1 counts 2 + 0 once, but a holds two 2s: A(2) = 2.' },
    ] },
  },

  'sos': {
    problem: 'For every mask of n bits, add up a over all of its submasks, for n up to 16, when listing every submask of every mask (3ⁿ steps) is too slow.',
    tryFirst: {
      prompt: 'a = [3, 1, 4, 1] for masks 00, 01, 10, 11. What is the sum over the submasks of 11?',
      args: [[3, 1, 4, 1]], answer: 9,
      misconceptions: [
        { answer: 1, feedback: '1 is a(11) alone. Its submasks are 00, 01, 10 and 11.' },
      ],
      explain: 'Every mask is a submask of 11: 3 + 1 + 4 + 1 = 9.',
    },
    steps: [
      { kind: 'state', ask: 'What does F hold after handling bits 0 … i?', options: [
        { text: 'For each mask, the sum over its submasks that differ from it only in bits 0 … i', right: true, why: 'After the last bit, that is every submask.' },
        { text: 'For each mask, the sum over its first i submasks', why: 'Submasks have no useful order; the bits do.' },
      ] },
      { kind: 'split', ask: 'For bit i, which masks change?', options: [
        { text: 'Those that have bit i: they add in the mask without it', right: true, why: 'The mask without the bit already covers its own submasks, all of them submasks here too.' },
        { text: 'Those without bit i: they add in the mask with it', why: 'That sums over supersets instead.' },
      ] },
      { kind: 'recurrence', ask: 'What is the update?', options: [
        { text: 'F(mask) += F(mask without bit i)', right: true, why: 'The submasks without bit i join those with it.' },
        { text: 'F(mask) = F(mask without bit i)', why: 'That replaces the submasks with bit i instead of adding to them.' },
      ] },
      { kind: 'base', ask: 'What does F start as?', options: [
        { text: 'a itself', right: true, why: 'With no bits handled, each mask covers only itself.' },
        { text: 'All zeros', why: 'Nothing would ever be added; every F stays 0.' },
      ] },
      { kind: 'order', ask: 'In what order are the bits handled?', options: [
        { text: 'One bit at a time, any order, every mask per bit', right: true, why: 'Each bit is a separate step; their order doesn’t change the result.' },
        { text: 'One mask at a time, all its bits together', why: 'A mask then adds in masks whose earlier bits aren’t handled yet, and submasks are missed or doubled.' },
      ] },
      { kind: 'answer', ask: 'What does it cost?', options: [
        { text: 'n · 2ⁿ additions', right: true, why: 'n bits, each touching every mask once.' },
        { text: '3ⁿ additions', why: 'That is listing every submask of every mask, which the bit-by-bit sweep avoids.' },
      ] },
    ],
    apply: { cell: [3, 7], misconceptions: [
      { answer: 6, feedback: '6 is F2(111), before bit 2. 111 has bit 2, so it adds in F2(011) = 10.' },
      { answer: 10, feedback: '10 is F2(011) alone. Add F2(111) = 6 to it.' },
    ] },
  },

  'mobius': {
    problem: 'Given, for every mask, the sum of a over its submasks, recover a itself, for n up to 16 bits.',
    tryFirst: {
      prompt: 'Subset sums F = [2, 5, 3, 9] for masks 00, 01, 10, 11. What is a(11)?',
      args: [[2, 5, 3, 9]], answer: 3,
      misconceptions: [
        { answer: 1, feedback: '1 takes F(01) and F(10) away from F(11) but forgets that both include a(00): add F(00) back.' },
      ],
      explain: 'a(11) = F(11) − F(01) − F(10) + F(00) = 9 − 5 − 3 + 2 = 3.',
    },
    steps: [
      { kind: 'state', ask: 'What does the array hold after undoing bits 0 … i?', options: [
        { text: 'For each mask, the sum over its submasks that agree with it on bits 0 … i', right: true, why: 'After the last bit, only the mask itself is left: a.' },
        { text: 'a for the first i masks, F for the rest', why: 'Each pass is over a bit, touching every mask, not over masks.' },
      ] },
      { kind: 'split', ask: 'For bit i, which masks change?', options: [
        { text: 'Those that have bit i: they take away the mask without it', right: true, why: 'That removes the submasks lacking bit i, which the bit had brought in.' },
        { text: 'Those without bit i', why: 'They never received anything from bit i.' },
      ] },
      { kind: 'recurrence', ask: 'What is the update?', options: [
        { text: 'a(mask) −= a(mask without bit i)', right: true, why: 'Exactly what the subset-sum pass for bit i added.' },
        { text: 'a(mask) += a(mask without bit i)', why: 'That is the subset sum again, not its inverse.' },
      ] },
      { kind: 'base', ask: 'What does the array start as?', options: [
        { text: 'F, the subset sums', right: true, why: 'Undoing starts from what is given.' },
        { text: 'All zeros', why: 'The subset sums are the input; starting from zeros loses them.' },
      ] },
      { kind: 'order', ask: 'How many passes are needed?', options: [
        { text: 'One per bit, n in all', right: true, why: 'Each pass undoes one bit; every bit must be undone.' },
        { text: 'One pass, over the masks in increasing order', why: 'One pass undoes one bit at most; the others stay mixed in.' },
      ] },
      { kind: 'answer', ask: 'What formula does the result match?', options: [
        { text: 'a(S) = Σ over T ⊆ S of (−1)^|S ∖ T|·F(T): inclusion–exclusion', right: true, why: 'Each bit pass applies the alternating sign for that bit.' },
        { text: 'a(S) = F(S) − Σ over T ⊂ S of F(T)', why: 'That takes away too much: sums over smaller masks overlap and must be added back.' },
      ] },
    ],
    apply: { cell: [3, 7], misconceptions: [
      { answer: 11, feedback: '11 adds a2(011) instead of subtracting it.' },
      { answer: 7, feedback: '7 copies a2(111). 111 has bit 2, so a2(011) = 4 is taken away.' },
    ] },
  },

  'subset-convolution': {
    problem: 'For every mask S, add a(T)·b(S without T) over every submask T of S, for n bits, faster than listing every split (3ⁿ).',
    tryFirst: {
      prompt: 'a = [1, 1, 1, 1] and b = [1, 2, 3, 4] for masks 00 … 11. What is c(11)?',
      args: [[1, 1, 1, 1], [1, 2, 3, 4]], answer: 10,
      misconceptions: [
        { answer: 1, feedback: '1 takes only T = 11, with b(00). Every split of 11 counts: T = 00, 01, 10 and 11.' },
      ],
      explain: 'a(00)b(11) + a(01)b(10) + a(10)b(01) + a(11)b(00) = 4 + 3 + 2 + 1 = 10.',
    },
    steps: [
      { kind: 'state', ask: 'What is a split of a mask into layers?', options: [
        { text: 'Layer r keeps a only on masks with r elements, 0 elsewhere', right: true, why: 'Sizes are what tells disjoint pairs from overlapping ones.' },
        { text: 'Layer r keeps a on masks containing element r', why: 'Element-based layers don’t separate disjoint pairs from overlapping ones.' },
      ] },
      { kind: 'split', ask: 'When are T and U with T ∪ U = S disjoint?', options: [
        { text: 'Exactly when |T| + |U| = |S|', right: true, why: 'Any overlap makes the sizes add up to more than |S|.' },
        { text: 'Exactly when T and U are both submasks of S', why: 'Two submasks can overlap; their sizes then add up to more than |S|.' },
      ] },
      { kind: 'recurrence', ask: 'How is layer r of the answer made?', options: [
        { text: 'Σ over i of zeta(A_i)·zeta(B_(r−i)), pointwise; then undo the zeta transform', right: true, why: 'Pointwise products of subset sums count pairs whose union is under S; the sizes keep only disjoint ones at size r.' },
        { text: 'zeta(A_r)·zeta(B_r), pointwise', why: 'The two parts’ sizes must add up to r, not both be r.' },
      ] },
      { kind: 'base', ask: 'Which entry of layer r is the answer?', options: [
        { text: 'Only masks of size r', right: true, why: 'For |S| = r, overlapping pairs have sizes adding up to more than r, so layer r holds only the disjoint ones.' },
        { text: 'Every mask of size up to r', why: 'A smaller mask in layer r counts pairs that overlap.' },
      ] },
      { kind: 'order', ask: 'What does it cost?', options: [
        { text: 'O(n² · 2ⁿ)', right: true, why: 'n + 1 layers, n² pairs of layers, each step over 2ⁿ masks, with n-bit transforms.' },
        { text: 'O(n · 2ⁿ)', why: 'There are n + 1 layers of each, and pairs of layers to multiply: the extra factor n.' },
      ] },
      { kind: 'answer', ask: 'Where is c(S)?', options: [
        { text: 'In layer |S| of the result, at S', right: true, why: 'That layer’s entry at S counts exactly the disjoint splits.' },
        { text: 'In the last layer, at S', why: 'The last layer counts pairs of total size n, which overlap for smaller S.' },
      ] },
    ],
    apply: { cell: [2, 3], misconceptions: [
      { answer: 9, feedback: '9 also counts a(11)·b(11) = 2, whose parts overlap.' },
    ] },
  },

  'walsh-hadamard': {
    problem: 'For every k, add a(i)·b(j) over every pair with i XOR j = k, for n-bit indices, faster than checking all 4ⁿ pairs.',
    tryFirst: {
      prompt: 'a = [1, 2] and b = [3, 4]. What is c(1), the sum of a(i)·b(j) with i XOR j = 1?',
      args: [[1, 2], [3, 4]], answer: 10,
      misconceptions: [
        { answer: 11, feedback: '11 is c(0): equal indices. XOR 1 pairs 0 with 1: 1·4 + 2·3.' },
      ],
      explain: 'a(0)b(1) + a(1)b(0) = 4 + 6 = 10.',
    },
    steps: [
      { kind: 'state', ask: 'What is computed instead of every pair?', options: [
        { text: 'The Walsh–Hadamard transforms of a and b', right: true, why: 'Under the transform, XOR convolution becomes a pointwise product.' },
        { text: 'The ordinary convolution of a and b', why: 'That pairs i + j, not i XOR j.' },
      ] },
      { kind: 'split', ask: 'What does one butterfly do, for one bit?', options: [
        { text: 'Replaces x and y, at two indices differing in that bit, by x + y and x − y', right: true, why: 'Bit by bit, that builds the ±1 sums of the transform.' },
        { text: 'Replaces them by x + y and x + y', why: 'Then the two can never be told apart again: the transform has to be invertible.' },
      ] },
      { kind: 'recurrence', ask: 'How is c found from the transforms?', options: [
        { text: 'Multiply them pointwise, then transform back', right: true, why: 'Each transformed value of a ⊛ b is the product of a’s and b’s.' },
        { text: 'Add them pointwise, then transform back', why: 'That gives a + b, not their XOR convolution.' },
      ] },
      { kind: 'base', ask: 'How is the transform undone?', options: [
        { text: 'Apply it again and divide by 2ⁿ', right: true, why: 'Applying it twice multiplies every value by 2ⁿ.' },
        { text: 'Apply it again', why: 'Twice multiplies every value by 2ⁿ; the factor must be divided out.' },
      ] },
      { kind: 'order', ask: 'What does it cost?', options: [
        { text: 'O(n · 2ⁿ), three transforms and a pointwise product', right: true, why: 'Each transform touches every index once per bit.' },
        { text: 'O(4ⁿ)', why: 'That is checking every pair, which the transform avoids.' },
      ] },
      { kind: 'answer', ask: 'Which operations does the same idea handle?', options: [
        { text: 'XOR with this transform; AND and OR with the subset-sum transforms', right: true, why: 'Each operation needs the transform that makes it pointwise.' },
        { text: 'Only XOR', why: 'AND and OR convolutions become pointwise under superset- and subset-sum transforms.' },
      ] },
    ],
    apply: { cell: [2, 1], misconceptions: [
      { answer: 3, feedback: '3 pairs indices that add up to 1, 00 with 01. XOR 1 also pairs 10 with 11: 2·1.' },
    ] },
  },

  'semirings': {
    problem: 'Find the cheapest walk of exactly n edges from vertex 0 to vertex k − 1, for n up to 10⁹, by reusing matrix powers with different operations.',
    tryFirst: {
      prompt: 'Edges 0 → 1 (cost 1), 1 → 2 (1), 0 → 2 (5) and a loop 1 → 1 (1). What is the cheapest walk of exactly 3 edges from 0 to 2?',
      args: [3, [[0, 1, 1], [1, 2, 1], [0, 2, 5], [1, 1, 1]], 3], answer: 3,
      misconceptions: [
        { answer: 5, feedback: '5 is the direct edge, a walk of 1 edge. Exactly 3 are required.' },
      ],
      explain: '0 → 1 → 1 → 2: 1 + 1 + 1 = 3.',
    },
    steps: [
      { kind: 'state', ask: 'What does a row of the table hold?', options: [
        { text: 'C(s, v): the cheapest walk of s edges from 0 to v, ∞ if none', right: true, why: 'The next edge only needs where the walk ends and what it cost.' },
        { text: 'C(v): the cheapest walk from 0 to v of any length', why: 'The length must be exactly n, so it is part of the state.' },
      ] },
      { kind: 'split', ask: 'What is the last choice?', options: [
        { text: 'The last edge u → v', right: true, why: 'Every walk of s edges to v is one of s − 1 edges to u plus that edge.' },
        { text: 'The cheapest edge into v', why: 'The cheapest edge may start where walks of s − 1 edges are expensive.' },
      ] },
      { kind: 'recurrence', ask: 'How is row s made from row s − 1?', options: [
        { text: 'C(s, v) = min over edges u → v of C(s − 1, u) + w: a matrix product with min for + and + for ×', right: true, why: 'Counting walks adds and multiplies; cheapest walks take minima and add costs.' },
        { text: 'C(s, v) = Σ over edges u → v of C(s − 1, u) + w', why: 'Adding the walks’ costs mixes different walks; only the cheapest one counts.' },
      ] },
      { kind: 'base', ask: 'What is the identity matrix in (min, +)?', options: [
        { text: '0 on the diagonal, ∞ elsewhere', right: true, why: '0 is the “one” of + and ∞ the “zero” of min: an empty walk stays put for free.' },
        { text: '0 everywhere', why: 'That lets a walk jump to any vertex for free before its first edge.' },
      ] },
      { kind: 'order', ask: 'Why does repeated squaring still work?', options: [
        { text: 'The (min, +) product is associative, so Aⁿ can be built from squares', right: true, why: 'Associativity is all that repeated squaring needs.' },
        { text: 'Because min is commutative', why: 'Squaring needs associativity of the product, not commutativity of min.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'Aⁿ(0, k − 1), or −1 if it is ∞', right: true, why: '∞ means no walk has exactly n edges.' },
        { text: 'The smallest entry of row 0 of Aⁿ', why: 'The walk must end at k − 1.' },
      ] },
    ],
    apply: { cell: [2, 2], misconceptions: [
      { answer: 8, feedback: '8 takes the direct edge, then the loop at 2: C(1,2) + 1. The walk 0 → 1 → 2 costs 4.' },
      { answer: 12, feedback: '12 adds the two choices, 4 + 8. Only the cheapest counts: min.' },
    ] },
  },

  'transfer-matrix': {
    problem: 'Count the tilings of a w × n board with dominoes, for w ≤ 4 and n up to 10¹⁵, by encoding one column as a reusable transition.',
    tryFirst: {
      prompt: 'How many ways are there to tile a 2 × 4 board with 1 × 2 dominoes?',
      args: [2, 4], answer: 5,
      misconceptions: [
        { answer: 4, feedback: 'Count again: all upright; two flat pairs (in 3 places); and both pairs flat: 1 + 3 + 1.' },
      ],
      explain: 'All four upright; one pair of flat dominoes in any of 3 places; or two pairs: 1 + 3 + 1 = 5.',
    },
    steps: [
      { kind: 'state', ask: 'What does the state between two columns remember?', options: [
        { text: 'Which cells of the next column are already covered by dominoes sticking out: one of 2ʷ profiles', right: true, why: 'The rest of the board only needs to know which of its cells are taken.' },
        { text: 'How many dominoes have been placed', why: 'Two fillings with the same count can leave different cells sticking out.' },
      ] },
      { kind: 'split', ask: 'What is chosen for one column?', options: [
        { text: 'For each free cell: a flat domino into the next column, or an upright one with the free cell below', right: true, why: 'Every cell is covered exactly once by one of the two.' },
        { text: 'Which dominoes the previous column placed', why: 'That is already fixed by the incoming profile.' },
      ] },
      { kind: 'recurrence', ask: 'How is the next column’s count made?', options: [
        { text: 'W(c + 1, s′) = Σ over s of W(c, s)·T(s, s′), with T counting ways to fill a column', right: true, why: 'The same T every column, so W(n) = W(0)·Tⁿ.' },
        { text: 'W(c + 1, s′) = W(c, s′)·T(s′, s′)', why: 'The profile can change from column to column; every incoming one counts.' },
      ] },
      { kind: 'base', ask: 'What is the start?', options: [
        { text: 'Profile 0 (nothing sticking in) with 1 way', right: true, why: 'Nothing can stick into the first column from outside the board.' },
        { text: 'Every profile with 1 way', why: 'Before the first column no domino can stick in.' },
      ] },
      { kind: 'order', ask: 'How is n = 10¹⁵ reached?', options: [
        { text: 'Tⁿ by repeated squaring, a 2ʷ × 2ʷ matrix', right: true, why: 'About log₂ n products of a 16 × 16 matrix at most.' },
        { text: 'Multiply T by n, then apply it once', why: 'n·T counts nothing useful: columns combine by multiplying matrices, not by scaling.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'Tⁿ(0, 0): start and end with nothing sticking out', right: true, why: 'A domino can’t stick out past the last column.' },
        { text: 'The sum of row 0 of Tⁿ', why: 'Profiles other than 0 have dominoes sticking out past the board.' },
      ] },
    ],
    apply: { cell: [4, 0], misconceptions: [
      { answer: 3, feedback: '3 counts only T(00,00)·W(3,00). Profile 11 also leads to 00: + W(3,11) = 2.' },
    ] },
  },
}
