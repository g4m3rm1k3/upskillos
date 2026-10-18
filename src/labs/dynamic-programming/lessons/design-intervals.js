// "Design it yourself" for the interval and partition lessons (Structured, intervals group). Format: designs.js.
// Their numbers are checked against structured-oracles.js, which tries every split, order, tree or cut set.

const byLength = { text: 'By interval length, shortest first', right: true, why: 'Each interval reads only shorter intervals inside it, so those are ready.' }
const leftFirst = why => ({ text: 'Left end from 0 upward', why })

export const INTERVAL_DESIGNS = {
  'matrix-chain': {
    problem: 'Multiply a chain of matrices, where matrix i is d_i × d_{i+1}. Multiplying a p × q matrix by a q × r one costs p · q · r. Choose the order of multiplications that costs least.',
    tryFirst: {
      prompt: 'Matrices of sizes 10 × 30, 30 × 5 and 5 × 60. What is the cheapest cost of multiplying all three?',
      args: [[10, 30, 5, 60]], answer: 4500,
      misconceptions: [
        { answer: 27000, feedback: 'That is A · (B · C): 30 · 5 · 60 + 10 · 30 · 60. Doing A · B first is far cheaper.' },
      ],
      explain: '(A · B) · C: 10 · 30 · 5 + 10 · 5 · 60 = 1500 + 3000. The product is the same either way; only the work differs, and it depends on where the last multiplication splits the chain.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(i) = the cheapest cost for the first i matrices', why: 'The last multiplication can join any left part to any right part; a prefix does not describe the right part.' },
        { text: 'D(l, r) = the cheapest cost of multiplying matrices l to r', right: true, why: 'Any piece of the chain is the same question, smaller.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for the chain l … r?', options: [
        { text: 'Where the last multiplication splits it: (l … k) · (k + 1 … r)', right: true, why: 'The two sides are then multiplied independently, each the best way.' },
        { text: 'Which pair to multiply first', why: 'After the first multiplication the rest is not two independent pieces, so it does not shrink the problem cleanly.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(l, r)?', options: [
        { text: 'The smallest D(l, k) + D(k + 1, r) + d_l · d_{k+1} · d_{r+1} over k', right: true, why: 'The left product is d_l × d_{k+1} and the right d_{k+1} × d_{r+1}; multiplying them costs that product.' },
        { text: 'The smallest D(l, k) + D(k + 1, r) + d_l · d_k · d_r', why: 'Off by one in the sizes: the left result is d_l × d_{k+1}, not d_l × d_k.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(i, i) = 0: one matrix needs no multiplication', right: true, why: 'A single matrix is already the product.' },
        { text: 'D(i, i + 1) = 0', why: 'Two matrices take one multiplication, which costs d_i · d_{i+1} · d_{i+2}.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [
        leftFirst('D(l, r) reads D(k + 1, r), which starts later and would not be filled.'),
        byLength,
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(0, n − 1)', right: true, why: 'D(l, r) is the cheapest for matrices l to r; the whole chain is 0 to n − 1.' },
        { text: 'The cheapest D(l, l + 1)', why: 'That multiplies one pair, not the whole chain.' },
      ] },
    ],
    apply: { cell: [0, 2], misconceptions: [
      { answer: 90, feedback: 'That splits after matrix 0: A · (B · C) = 0 + 60 + 2·3·5. Splitting after matrix 1 is cheaper.' },
      { answer: 24, feedback: 'That is D(0,1), the cost of A · B alone. Joining its result to C costs 2·4·5 more.' },
    ] },
  },

  'burst-balloons': {
    problem: 'Balloons in a row hold numbers. Bursting one earns its number times its two current neighbours’ numbers (a missing neighbour counts as 1), and the neighbours then become adjacent. Find the most you can earn.',
    tryFirst: {
      prompt: 'Balloons [3, 1, 5]. What is the most you can earn by bursting them all?',
      args: [[3, 1, 5]], answer: 35,
      misconceptions: [
        { answer: 13, feedback: 'That bursts them left to right. Burst the 1 first: 3 · 1 · 5 = 15, and the 3 and 5 become neighbours.' },
      ],
      explain: 'Burst 1 (15), then 3 (1 · 3 · 5 = 15), then 5 (5): 35. Thinking about which balloon goes LAST in a range is what makes the two sides independent.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(l, r) mean, with 1s padded at both ends?', options: [
        { text: 'The most earned by bursting every balloon strictly between l and r, while l and r are still there', right: true, why: 'With l and r standing, the inside’s neighbours are known throughout.' },
        { text: 'The most earned from balloons l to r, ignoring what is outside', why: 'A balloon’s reward depends on its neighbours, which may be outside the range; the walls must be fixed.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for the balloons between l and r?', options: [
        { text: 'Which balloon is burst first', why: 'After it, its two neighbours touch, so the left and right sides are no longer independent.' },
        { text: 'Which balloon k is burst last', right: true, why: 'Until then, k separates the two sides; when it goes, its neighbours are exactly l and r.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(l, r)?', options: [
        { text: 'The largest D(l, k) + D(k, r) + a_l · a_k · a_r over k between them', right: true, why: 'Clear both sides with k standing, then burst k between l and r.' },
        { text: 'The largest D(l, k) + D(k, r) + a_{k−1} · a_k · a_{k+1}', why: 'By the time k is burst last, its original neighbours are gone; its neighbours are l and r.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(l, l + 1) = 0: nothing between neighbours', right: true, why: 'Neighbouring walls have no balloon between them, so nothing is earned.' },
        { text: 'D(l, l) = a_l', why: 'D(l, r) counts balloons strictly between l and r; there are none.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [byLength, leftFirst('D(l, r) reads D(k, r), which starts later.')] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(0, n + 1) on the padded list', right: true, why: 'Everything between the two padding 1s: every real balloon.' },
        { text: 'D(1, n)', why: 'That leaves out the first and last real balloons, which are the walls of that range.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 8, feedback: 'That bursts balloon 2 (the 1) last. Burst balloon 1 (the 3) last instead: once the 1 is gone it earns 1·3·5.' },
      { answer: 18, feedback: 'That pays balloon 1 its original neighbours, 1·3·1. Burst last between walls 0 and 3, its neighbours are those walls: 1 and 5.' },
    ] },
  },

  'cut-stick': {
    problem: 'A stick of length n must be cut at given positions. Each cut costs the length of the piece being cut. Choose the order of cuts that costs least.',
    tryFirst: {
      prompt: 'A stick of length 10 must be cut at 2, 4 and 7. What is the cheapest total?',
      args: [10, [2, 4, 7]], answer: 20,
      misconceptions: [
        { answer: 24, feedback: 'That cuts left to right: 10, then 8, then 6. Cutting at 4 first costs 10, 4 and 6.' },
      ],
      explain: 'Cut at 4 (10), then 2 in the left piece (4), then 7 in the right piece (6): 20. The first cut splits the stick into pieces that are cut independently.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(l, r) mean?', options: [
        { text: 'With the cut points sorted and 0 and n added: the cheapest cost of making every cut between points l and r', right: true, why: 'Any piece between two cut points is the same question, smaller.' },
        { text: 'The cheapest cost of the first i cuts, left to right', why: 'The cuts need not be made left to right; that order is often expensive.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for the piece from l to r?', options: [
        { text: 'Which cut is made first in this piece', right: true, why: 'It costs the whole piece’s length and splits it into two independent pieces.' },
        { text: 'Which cut is made last', why: 'The last cut’s price depends on the pieces earlier cuts left; the first cut’s price is just this piece’s length.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(l, r)?', options: [
        { text: '(p_r − p_l) + the smallest D(l, k) + D(k, r) over cut points k inside', right: true, why: 'Pay the piece’s length once, then cut both sides the best way.' },
        { text: 'The smallest D(l, k) + D(k, r)', why: 'It forgets the cost of the first cut itself.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'A piece with no cut point inside costs 0', right: true, why: 'A piece with no requested cut inside is never cut, so it costs nothing.' },
        { text: 'A piece with no cut point inside costs its length', why: 'It is never cut, so nothing is paid.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [byLength, leftFirst('D(l, r) reads D(k, r), which starts later.')] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(first point, last point): from 0 to n', right: true, why: 'The whole stick, with every cut inside it.' },
        { text: 'The sum of D over neighbouring cut points', why: 'Those pieces have no cut inside; they cost 0.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 4, feedback: 'That forgets the first cut itself: whichever cut goes first, it costs the length of the piece, 7.' },
      { answer: 12, feedback: 'That cuts at 2 first (7 + 5). Cutting at 4 first leaves cheaper pieces: 7 + 4.' },
    ] },
  },

  'merge-stones': {
    problem: 'Piles of stones stand in a row. Merging two neighbouring piles costs the size of the new pile. Merge them all into one pile as cheaply as possible.',
    tryFirst: {
      prompt: 'Piles [4, 3, 1, 4]. What is the cheapest total cost to merge them into one?',
      args: [[4, 3, 1, 4]], answer: 24,
      misconceptions: [
        { answer: 12, feedback: '12 is only the last merge. Every merge pays its new pile’s size, and stones merged early are paid again later.' },
        { answer: 27, feedback: 'Merging left to right costs 7 + 8 + 12. Merging the 3 and 1 first leaves three piles of 4.' },
      ],
      explain: '3 + 1 = 4, then 4 + 4 = 8, then 8 + 4 = 12: 4 + 8 + 12 = 24. The last merge joins the left part’s pile with the right part’s pile.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(l, r) mean?', options: [
        { text: 'The cheapest cost of merging piles l to r into one pile', right: true, why: 'Any stretch of neighbouring piles is the same question.' },
        { text: 'D(i) = the cheapest cost of merging the first i piles', why: 'The last merge can join any left stretch to any right stretch.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for piles l to r?', options: [
        { text: 'Where the last merge splits them: (l … k) and (k + 1 … r)', right: true, why: 'Each side is merged into one pile on its own; then those two piles merge.' },
        { text: 'Which two neighbours merge first', why: 'After that the row changes; the last merge splits the problem more cleanly.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(l, r)?', options: [
        { text: 'The smallest D(l, k) + D(k + 1, r) over k', why: 'It forgets the last merge, which costs every stone in l … r.' },
        { text: 'sum(l … r) + the smallest D(l, k) + D(k + 1, r) over k', right: true, why: 'Both sides, plus the final merge of all their stones.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'A single pile costs 0', right: true, why: 'A single pile is already one pile; no merge is needed, so nothing is paid.' },
        { text: 'A single pile costs its size', why: 'Nothing is merged, so nothing is paid.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [leftFirst('D(l, r) reads D(k + 1, r), which starts later.'), byLength] },
      { kind: 'answer', ask: 'Where is the answer, and what would change if every merge had to take exactly K piles?', options: [
        { text: 'D(0, n − 1); with K piles per merge, some stretches cannot become one pile, so the state needs a pile count', right: true, why: 'With two at a time any stretch works; with K, feasibility must be tracked.' },
        { text: 'D(0, n − 1), with the same table for any K', why: 'With K = 3, a stretch of 2 piles can never become one pile; the table has no way to say so.' },
      ] },
    ],
    apply: { cell: [0, 2], misconceptions: [
      { answer: 4, feedback: 'That forgets the last merge, which costs every stone in piles 0 to 2: 4 + 3 + 1 = 8.' },
      { answer: 15, feedback: 'That merges piles 0 and 1 first (8 + 7). Merging the 3 and the 1 first is cheaper: 8 + 4.' },
    ] },
  },

  'polygon-triangulation': {
    problem: 'A convex polygon’s vertices have weights. Split it into triangles with non-crossing diagonals; a triangle costs the product of its three weights. Find the cheapest triangulation.',
    tryFirst: {
      prompt: 'A quadrilateral with vertex weights 1, 2, 3, 4 in order. What is the cheapest triangulation?',
      args: [[1, 2, 3, 4]], answer: 18,
      misconceptions: [
        { answer: 32, feedback: 'That uses the diagonal from 2 to 4: 1 · 2 · 4 + 2 · 3 · 4. The other diagonal is cheaper.' },
      ],
      explain: 'Diagonal 1–3: 1 · 2 · 3 + 1 · 3 · 4 = 6 + 12. Every triangulation has exactly one triangle on the edge from the first vertex to the last.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(l, r) mean?', options: [
        { text: 'The cheapest triangulation of the polygon made by vertices l … r and the edge r–l', right: true, why: 'Cutting along a diagonal leaves two smaller polygons of this kind.' },
        { text: 'The cheapest triangle that uses vertex l', why: 'One triangle does not triangulate the polygon.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for the polygon l … r?', options: [
        { text: 'The third vertex k of the triangle on the edge l–r', right: true, why: 'That triangle is in every triangulation, and it splits the rest into l … k and k … r.' },
        { text: 'Which diagonal to draw first', why: 'Diagonals can be drawn in any order; the triangle on l–r fixes the split.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(l, r)?', options: [
        { text: 'The smallest D(l, k) + D(k, r) + w_l · w_k · w_r over k between l and r', right: true, why: 'The two smaller polygons plus the triangle that joins them.' },
        { text: 'The smallest w_l · w_k · w_r', why: 'That prices one triangle and ignores the rest.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'Fewer than three vertices (r − l < 2) cost 0', right: true, why: 'Two vertices make an edge, not a polygon: nothing to triangulate.' },
        { text: 'Three vertices cost 0', why: 'Three vertices are one triangle, which costs its product.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [byLength, leftFirst('D(l, r) reads D(k, r), which starts later.')] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(0, n − 1)', right: true, why: 'The whole polygon, closed by the edge from the last vertex to the first.' },
        { text: 'The cheapest D(l, l + 2)', why: 'Three neighbouring vertices make one triangle, not the whole polygon.' },
      ] },
    ],
    apply: { cell: [0, 3], misconceptions: [
      { answer: 32, feedback: 'That uses triangle 0-1-3. Triangle 0-2-3 is cheaper: 6 + 0 + 12.' },
      { answer: 12, feedback: 'That prices only triangle 0-2-3 and forgets the polygon 0 … 2 left beside it, which costs 6.' },
    ] },
  },

  'optimal-bst': {
    problem: 'Keys in sorted order are searched with given frequencies. In a binary search tree, finding a key costs its depth (the root is depth 1). Build the tree with the lowest total cost: frequency × depth, summed.',
    tryFirst: {
      prompt: 'Three keys searched 3, 1 and 2 times. What is the lowest total cost?',
      args: [[3, 1, 2]], answer: 10,
      misconceptions: [
        { answer: 11, feedback: 'That is the balanced tree with the middle key at the root. The first key is searched most; it belongs higher.' },
      ],
      explain: 'Root the first key (3 · 1), then the third (2 · 2), then the middle one (1 · 3): 10. The root splits the keys into a left and a right range, each its own tree.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(l, r) mean?', options: [
        { text: 'The lowest cost of a tree on keys l … r, counting depth from its own root', right: true, why: 'A subtree holds a range of sorted keys, and is the same question.' },
        { text: 'The lowest cost of a tree on the first i keys', why: 'A right subtree holds keys after the root, not a prefix.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for keys l … r?', options: [
        { text: 'The most frequent key is the root', why: 'Greedy: it can push many moderately frequent keys deep.' },
        { text: 'Which key k is the root', right: true, why: 'Then l … k − 1 is its left subtree and k + 1 … r its right.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(l, r)?', options: [
        { text: 'The smallest f_k + D(l, k − 1) + D(k + 1, r) over k', why: 'Hanging the subtrees under a root pushes every key in them one level deeper; their frequencies must be added again.' },
        { text: 'sum(f_l … f_r) + the smallest D(l, k − 1) + D(k + 1, r) over k', right: true, why: 'Every key in the range is one level deeper than in its subtree, so each frequency is added once more.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'An empty range costs 0', right: true, why: 'A range with no keys is never searched, so it costs nothing.' },
        { text: 'An empty range costs ∞', why: 'An empty subtree is allowed: a root with no left child.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill the table?', options: [byLength, leftFirst('D(l, r) reads D(k + 1, r), which starts later.')] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(first key, last key)', right: true, why: 'The tree has to hold every key, from the first to the last.' },
        { text: 'The sum of the frequencies', why: 'That is the cost if every key were the root, which is impossible.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design: two keys searched 1 and 4 times. What is the lowest total cost?',
      args: [[1, 4]], answer: 6,
      misconceptions: [{ answer: 9, feedback: 'That roots the first key. Root the one searched 4 times.' }],
      explain: 'Root the second key: 4 · 1 + 1 · 2 = 6.',
    },
  },

  'boolean-parenthesization': {
    problem: 'An expression of true and false values joined by and, or, xor. Count the ways to parenthesize it so that it comes out true.',
    tryFirst: {
      prompt: 'How many ways can “T or F and F” be parenthesized to come out true?',
      args: [[true, false, false], ['or', 'and']], answer: 1,
      misconceptions: [
        { answer: 2, feedback: '(T or F) and F is false. Only T or (F and F) is true.' },
      ],
      explain: 'Only T or (F and F). The last operator applied splits the expression; to count true results you also need the false counts of each side.',
    },
    steps: [
      { kind: 'state', ask: 'What should be stored for each stretch l … r?', options: [
        { text: 'Two counts: T(l, r) ways to make it true and F(l, r) ways to make it false', right: true, why: 'Or and xor can make true from false parts, so false counts are needed.' },
        { text: 'Only T(l, r)', why: 'True from “or” can come from a false left side; without false counts that is lost.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for l … r?', options: [
        { text: 'Which operator, at k, is applied last', right: true, why: 'Its two sides are parenthesized independently.' },
        { text: 'Which operator is applied first', why: 'The last operator splits the expression into two independent sides.' },
      ] },
      { kind: 'recurrence', ask: 'For an “or” at k, how many ways are true?', options: [
        { text: 'All the ways (total left · total right) minus F_left · F_right', right: true, why: '“or” is false only when both sides are false.' },
        { text: 'T_left · T_right', why: 'That is “and”. “or” is also true with just one side true.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'A single value: (1, 0) if it is true, (0, 1) if false', right: true, why: 'One way to read a single value.' },
        { text: 'A single value: (1, 1)', why: 'A single value is either true or false, not both.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [byLength, leftFirst('A stretch reads stretches that start after its left end.')] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'T(0, n − 1)', right: true, why: 'The whole expression, true.' },
        { text: 'T(0, n − 1) + F(0, n − 1)', why: 'That counts every parenthesization.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design: how many ways can “T and F or T” come out true?',
      args: [[true, false, true], ['and', 'or']], answer: 2,
      misconceptions: [{ answer: 1, feedback: 'Both work: (T and F) or T, and T and (F or T).' }],
      explain: '(T and F) or T = true; T and (F or T) = true: 2.',
    },
  },

  'expression-extrema': {
    problem: 'Numbers joined by +, − and ×. Parenthesize the expression to make its value as large as possible.',
    tryFirst: {
      prompt: 'What is the largest value of 3 − 4 × −2 over all parenthesizations?',
      args: [[3, 4, -2], ['-', '*']], answer: 11,
      misconceptions: [
        { answer: 2, feedback: 'That is (3 − 4) × −2. 3 − (4 × −2) = 3 + 8.' },
      ],
      explain: '3 − (4 × −2) = 11: subtracting the smallest possible right side. A maximum can need the other side’s minimum, so both are kept.',
    },
    steps: [
      { kind: 'state', ask: 'What should be stored for each stretch?', options: [
        { text: 'Only its largest value', why: 'Subtracting, or multiplying two negatives, needs the smallest value of a side.' },
        { text: 'Its smallest and largest values', right: true, why: 'Every operator’s extreme comes from the sides’ extremes.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for l … r?', options: [
        { text: 'Which operator, at k, is applied last', right: true, why: 'The sides are parenthesized independently.' },
        { text: 'Which number is the largest', why: 'The result depends on how operators combine, not on one number.' },
      ] },
      { kind: 'recurrence', ask: 'For a “−” at k, what is the largest value?', options: [
        { text: 'max_left − max_right', why: 'To make a difference large, subtract as little as possible: the right side’s minimum.' },
        { text: 'max_left − min_right', right: true, why: 'Largest minus smallest. For ×, try all four products of extremes.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'A single number is both its own minimum and maximum', right: true, why: 'A single number can only be read one way, so both extremes are that number.' },
        { text: 'A single number’s minimum is −∞', why: 'A single number has exactly one value; nothing can make it smaller.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [leftFirst('A stretch reads stretches that start after its left end.'), byLength] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'The maximum of the whole stretch, 0 … n − 1', right: true, why: 'The stretch from 0 to n − 1 is the whole expression, and its maximum is the question.' },
        { text: 'The maximum minus the minimum', why: 'That is a spread, not a value of the expression.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design: the largest value of 2 − 3 − 4?',
      args: [[2, 3, 4], ['-', '-']], answer: 3,
      misconceptions: [{ answer: -5, feedback: 'That is (2 − 3) − 4. 2 − (3 − 4) = 2 + 1.' }],
      explain: '2 − (3 − 4): the right side’s minimum is −1, so 2 − (−1) = 3.',
    },
  },

  'strange-printer': {
    problem: 'A printer prints one letter over any stretch of positions per turn, covering what was there. Find the fewest turns to print a string.',
    tryFirst: {
      prompt: 'How many turns does it take to print “aba”?',
      args: ['aba'], answer: 2,
      misconceptions: [
        { answer: 3, feedback: 'Print “aaa” in one turn, then a “b” over the middle.' },
      ],
      explain: 'Print a over everything, then b in the middle: 2. The turn that prints the first letter can also cover later copies of it; what is between is printed on top.',
    },
    steps: [
      { kind: 'state', ask: 'What should D(l, r) mean?', options: [
        { text: 'The fewest turns to print s[l..r]', right: true, why: 'A stretch is the same question, smaller.' },
        { text: 'The number of runs of equal letters', why: '“aba” has 3 runs but needs 2 turns.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for s[l..r]?', options: [
        { text: 'Which later position k with s_k = s_l shares the turn that prints s_l (or none)', right: true, why: 'One stroke covers l … k; the part between is printed on top separately.' },
        { text: 'Which letter to print first', why: 'The first letter’s turn is what can be shared; the letter is fixed by s_l.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(l, r)?', options: [
        { text: 'min(1 + D(l + 1, r), the smallest D(l + 1, k − 1) + D(k, r) over k with s_k = s_l)', right: true, why: 'Print s_l alone, or let it ride along with the turn that prints s_k.' },
        { text: '1 + D(l + 1, r)', why: 'That never shares a turn, so “aaa” would take 3.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'A single letter takes 1 turn; an empty stretch takes 0', right: true, why: 'One stroke prints a single letter; an empty stretch needs no stroke.' },
        { text: 'A single letter takes 0 turns', why: 'Something has to print it.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [byLength, leftFirst('D(l, r) reads D(l + 1, …), which starts later.')] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(0, n − 1)', right: true, why: 'D(l, r) covers the stretch from l to r; the whole string is 0 to n − 1.' },
        { text: 'The number of different letters', why: '“aba” has 2 letters and needs 2 turns, but “abab” has 2 and needs 3.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design: how many turns to print “abcabc”?',
      args: ['abcabc'], answer: 5,
      misconceptions: [{ answer: 6, feedback: 'The first a can be printed over positions 1 to 4 in one turn, sharing with the second a.' }],
      explain: 'One a over “abca”, then b and c on top, then the final b and c: 5.',
    },
  },

  'remove-boxes': {
    problem: 'Coloured boxes in a row. Removing a run of k neighbouring boxes of one colour earns k² points, and the boxes on either side close up. Find the most points.',
    tryFirst: {
      prompt: 'Boxes [1, 2, 1] (colours). What is the most you can earn?',
      args: [[1, 2, 1]], answer: 5,
      misconceptions: [
        { answer: 3, feedback: 'Removing them one at a time earns 1 each. Remove the 2 first: the two 1s close up and earn 2² = 4.' },
      ],
      explain: '2 first (1), then the two 1s together (4): 5. A box’s value depends on how many equal boxes it ends up next to, which can be outside its stretch.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(l, r) = the most points from boxes l … r', why: 'The best for a stretch depends on how many equal boxes will join its end later, from outside it.' },
        { text: 'D(l, r, k) = the most points from l … r, with k more boxes of box r’s colour attached to its right', right: true, why: 'The carried k is the outside context that changes the value.' },
      ] },
      { kind: 'split', ask: 'What happens to box r and its k friends?', options: [
        { text: 'Removed now, or saved for an earlier box m of the same colour once the boxes between are cleared', right: true, why: 'Those are the only two fates for the group at the right end.' },
        { text: 'Always removed now', why: 'Waiting can merge them with more boxes, and k² grows fast.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(l, r, k)?', options: [
        { text: 'max((k + 1)² + D(l, r − 1, 0), the largest D(m + 1, r − 1, 0) + D(l, m, k + 1) over m with box m = box r)', right: true, why: 'Take the group now, or clear the middle and carry k + 1 boxes to m.' },
        { text: '(k + 1)² + D(l, r − 1, 0)', why: 'That never saves boxes for a bigger group later.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'An empty stretch earns 0', right: true, why: 'A stretch with no boxes has nothing to remove, so it earns nothing.' },
        { text: 'An empty stretch earns k²', why: 'The k carried boxes belong to box r, which this stretch no longer has; they are counted where they are removed.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [leftFirst('A stretch reads stretches that start after its left end.'), { ...byLength, why: 'Every value reads shorter stretches, whatever k is.' }] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(0, n − 1, 0)', right: true, why: 'Every box, nothing carried from outside.' },
        { text: 'The largest D(0, n − 1, k)', why: 'There are no extra boxes outside the row.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design on [2, 1, 2, 1, 2]. What is the most you can earn?',
      args: [[2, 1, 2, 1, 2]], answer: 11,
      misconceptions: [{ answer: 5, feedback: 'One at a time earns 5. Clearing the two 1s first lets the three 2s close up: 3² = 9.' }],
      explain: 'Each 1 alone (1 + 1), then the three 2s together (9): 11.',
    },
  },

  'k-partitions': {
    problem: 'Cut a list into exactly k nonempty consecutive segments. A segment costs the square of its total. Make the total cost as small as possible.',
    tryFirst: {
      prompt: 'Cut [1, 2, 3, 4] into exactly 2 segments. What is the smallest total of squared segment sums?',
      args: [[1, 2, 3, 4], 2], answer: 52,
      misconceptions: [
        { answer: 58, feedback: 'Cutting it in half by count, [1, 2] [3, 4], costs 9 + 49. Balancing the sums does better: [1, 2, 3] [4].' },
      ],
      explain: '[1, 2, 3] and [4]: 36 + 16 = 52. Every cutting has a last segment, and before it the earlier items are cut into k − 1 segments.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(i) = the cheapest cutting of the first i items into any number of segments', why: 'The question asks for exactly k; the count has to be an index.' },
        { text: 'D(g, i) = the cheapest way to cut the first i items into exactly g segments', right: true, why: 'Both how far and how many segments so far.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for D(g, i)?', options: [
        { text: 'Where the last segment starts, j', right: true, why: 'Before it, the first j items are cut into g − 1 segments.' },
        { text: 'The longest segment', why: 'It can be anywhere; the last segment connects to a smaller cell.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(g, i)?', options: [
        { text: 'The smallest D(g − 1, j) + (sum of items j … i − 1)² over j', right: true, why: 'Cut the first j into g − 1, and the rest is the last segment.' },
        { text: 'The smallest D(g, j) + (sum j … i − 1)²', why: 'That adds a segment without counting it, so the number of segments drifts.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0, 0) = 0; every other D(0, i) = ∞', right: true, why: 'Zero segments can only cover zero items; ∞ rules out empty segments elsewhere too.' },
        { text: 'D(0, i) = 0 for every i', why: 'Then items could be left out of every segment.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'g increasing; within g, i increasing', right: true, why: 'Row g reads only row g − 1.' },
        { text: 'i increasing, all g at once, reading row g', why: 'Row g reads row g − 1, which must be finished; reading row g itself is the wrong rule.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(k, n)', right: true, why: 'All n items, exactly k segments.' },
        { text: 'The smallest D(g, n) over g ≤ k', why: 'The question asks for exactly k segments.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design: cut [2, 2] into exactly 2 segments. What is the cost?',
      args: [[2, 2], 2], answer: 8,
      misconceptions: [{ answer: 16, feedback: '16 is one segment, (2 + 2)². Two segments cost 2² + 2².' }],
      explain: '[2] and [2]: 4 + 4 = 8.',
    },
  },

  'partition-max': {
    problem: 'Cut a list into exactly k nonempty consecutive segments so that the largest segment total is as small as possible.',
    tryFirst: {
      prompt: 'Cut [7, 2, 5, 10, 8] into 2 segments. What is the smallest possible largest segment total?',
      args: [[7, 2, 5, 10, 8], 2], answer: 18,
      misconceptions: [
        { answer: 16, feedback: 'The total is 32, so 16 each would be perfect, but no cut splits it evenly.' },
        { answer: 23, feedback: 'That cuts after 2, leaving 5 + 10 + 8. Cutting after 5 gives 14 and 18.' },
      ],
      explain: '[7, 2, 5] and [10, 8]: 14 and 18. The objective is a maximum, so the rule combines with max, not with +.',
    },
    steps: [
      { kind: 'state', ask: 'What should a cell hold?', options: [
        { text: 'D(g, i) = the smallest possible largest segment total, cutting the first i items into g segments', right: true, why: 'The same question on a prefix with fewer segments.' },
        { text: 'D(g, i) = the smallest total of all segments', why: 'The total of all segments is always the sum of the items; the question is about the largest one.' },
      ] },
      { kind: 'split', ask: 'What is the one choice for D(g, i)?', options: [
        { text: 'Where the last segment starts, j', right: true, why: 'Before it, g − 1 segments cover the first j items.' },
        { text: 'Which segment is the largest', why: 'That is what you are minimising, not a choice you can make directly.' },
      ] },
      { kind: 'recurrence', ask: 'Which rule fills D(g, i)?', options: [
        { text: 'The smallest D(g − 1, j) + sum(j … i − 1)', why: 'That adds segments together; the objective is the largest one.' },
        { text: 'The smallest max(D(g − 1, j), sum(j … i − 1)) over j', right: true, why: 'The largest segment is either among the earlier ones or the last.' },
      ] },
      { kind: 'base', ask: 'What starts the table?', options: [
        { text: 'D(0, 0) = 0; every other D(0, i) = ∞', right: true, why: 'Zero segments cover zero items.' },
        { text: 'D(1, i) = the largest single item', why: 'One segment holds all i items, so its total is their sum.' },
      ] },
      { kind: 'order', ask: 'In what order do you fill it?', options: [
        { text: 'g increasing, then i', right: true, why: 'Row g reads only row g − 1, so the rows go in order of g.' },
        { text: 'i decreasing', why: 'D(g, i) reads smaller prefixes.' },
      ] },
      { kind: 'answer', ask: 'Where is the answer?', options: [
        { text: 'D(k, n)', right: true, why: 'All items, exactly k segments.' },
        { text: 'The total divided by k', why: 'That is a lower bound, reached only if a perfect split exists.' },
      ] },
    ],
    apply: {
      prompt: 'Use your design: cut [1, 2, 3] into 2 segments. What is the smallest largest total?',
      args: [[1, 2, 3], 2], answer: 3,
      misconceptions: [{ answer: 5, feedback: 'That cuts after 1. Cutting after 2 gives 3 and 3.' }],
      explain: '[1, 2] and [3]: both 3.',
    },
  },
}
