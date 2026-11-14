// FILE: src/content/discrete-math/00-logic-puzzles.js
import pigeonholeBasicUrl from '../diagrams/dm-pigeonhole-basic.svg?url'

export default {
  id: 'discrete-1-00',
  slug: 'pigeonhole-principle',
  chapter: 'discrete-1',
  order: 0,
  title: 'The Pigeonhole Principle',
  subtitle: 'Why counting alone can guarantee mathematical certainty — the foundation of discrete reasoning',
  tags: ['logic', 'discrete', 'pigeonhole', 'proofs', 'counting', 'contradiction', 'combinatorics'],
  aliases: 'pigeonhole principle counting discrete math socks birthday hairs hash collision',

  semantics: {
    core: [
      { symbol: 'k', meaning: 'The number of items (pigeons) to distribute' },
      { symbol: 'n', meaning: 'The number of containers (pigeonholes) to distribute into' },
      { symbol: 'k > n', meaning: 'The key condition: more items than containers forces a collision' },
      { symbol: '⌈k/n⌉', meaning: 'Ceiling division — round up to nearest integer; gives the guaranteed minimum count in at least one container' },
      { symbol: '∃', meaning: 'There exists — a container that holds more than one item is guaranteed to exist' },
    ],
    rulesOfThumb: [
      'The Pigeonhole Principle guarantees existence — it tells you something MUST exist without constructing it.',
      'To apply it: identify what the "pigeons" (items) are and what the "holes" (categories) are. If pigeons > holes, a collision is unavoidable.',
      'The Generalized Principle: if k items go into n containers, at least one container holds at least ⌈k/n⌉ items.',
      'Lossless compression cannot compress every possible file — pigeonhole applied to bit strings is the mathematical proof.',
      'Hash tables always have a collision risk when more keys than buckets exist. No hash function can avoid this.',
      'Finding the right "holes" is the creative art of the principle — sometimes the categories are not obvious.',
    ],
  },

  hook: {
    question: "You are blindfolded next to a drawer holding 10 black socks and 10 white socks, completely mixed. How many socks must you pull out to guarantee a matching pair — not probably, not likely — but with 100% mathematical certainty?",
    realWorldContext: "Almost everyone guesses 11. The actual answer is 3 — and the reasoning behind it is not a trick. It is one of the most powerful ideas in mathematics: the Pigeonhole Principle. This principle proves, without examining a single person, that at least two people in New York City share the same birthday. It proves that no zip file algorithm can compress every possible file. It proves that any hash table with more records than buckets must have a collision. These are not probabilistic claims — they are absolute mathematical guarantees derived from pure counting. Welcome to Discrete Mathematics, where certainty is built not from measurement, but from the unavoidable logic of numbers.",
  },

  intuition: {
    prose: [
      "**Where you are in the story.** Discrete Mathematics is the mathematics of things that cannot be divided: integers, graphs, logic gates, and computer programs. Unlike calculus, which deals with smooth continuous change, discrete math deals with exact counts, precise structures, and airtight guarantees. The Pigeonhole Principle is your very first tool in this toolkit — and it is perhaps the most surprising: sometimes you can prove something must exist without ever finding it.",

      "Let's think carefully about the socks. You reach into the drawer and pull out one sock. It is black. You pull out a second. It is white. At this moment, you have one black sock and one white sock in your hand. Now you pull out a third. It must be either black or white — there are no other colors. Whichever it is, it matches one you are already holding. You have your pair in at most 3 draws. No matter how unlucky you are, no matter how the socks are arranged, the third draw finishes the job. Math says so.",

      "Why? Because there are only **2 categories** of sock (black and white), and as soon as you have **3 socks**, you cannot avoid having 2 in the same category. The categories are the 'pigeonholes.' The socks are the 'pigeons.' If there are more pigeons than holes, at least one hole must contain more than one pigeon. That is the entire idea. It takes one sentence to state and a lifetime to apply.",

      "The name comes from a vivid image: imagine a row of pigeonhole boxes in an old English post office, each labeled for one recipient. If 11 letters arrive for 10 boxes, the postmaster cannot distribute them one per box — at least one box must receive two letters. The postmaster does not need to read any letters or look at any names. Pure counting makes the guarantee.",

      `![5 pigeons distributed into 4 holes, with one hole forced to hold 2](${pigeonholeBasicUrl})`,

      "Look at the diagram above: 5 pigeons, 4 holes. It doesn't matter which pigeon goes where — try every arrangement you like — some hole always ends up with at least 2. This is not a claim about *this particular* arrangement; it's a claim about *every possible* arrangement simultaneously, which is exactly why it counts as a proof rather than an observation.",

      "**The creative leap.** The power of the Pigeonhole Principle in practice is not in recognizing the statement — it is in recognizing *what to use as the holes*. In the sock problem, the holes are colors. In the birthday problem, the holes are dates. In the hair-count problem, the holes are possible hair counts (0 through about 300,000). The items are always the people or things you are distributing. Once you identify the right holes, the conclusion follows automatically from pure arithmetic.",

      "Here is the key difference between Discrete Mathematics and Probability. If you have 23 people in a room, there is about a 50% *chance* that two share a birthday — that is probability. But if you have 367 people in a room, there is a 100% *guarantee* that two share a birthday — that is discrete math. We are not computing likelihoods. We are proving impossibilities. It is impossible for 367 people to all have different birthdays because there are only 366 possible birthdays. 367 pigeons into 366 holes: a collision is forced.",

      "**Where this is heading.** The Pigeonhole Principle is our warmup for the entire course. Every discrete math proof you write will identify a structure — categories, sets, graphs, logical cases — and reason about what must be true given that structure. The Pigeonhole Principle does this with the simplest possible structure: a count. As the course progresses, the structures will become more complex (propositions, sets, graphs, functions), but the logical style — rule out the impossible and conclude the necessary — will remain exactly the same.",
    ],
    checks: [
      {
        afterParagraph: 2,
        question: 'In the sock problem, what are the "pigeonholes"?',
        options: ['The individual socks', 'The two colors (black and white)', 'The number 3', 'The drawer itself'],
        answer: 'The two colors (black and white)',
        explanation: 'The holes are always the categories you\'re sorting into — here, the two possible colors. The socks themselves are the "pigeons" being distributed.',
      },
      {
        question: 'If 13 people are in a room, how many must share a birth month (12 months in a year)?',
        options: ['At least 2', 'Exactly 2', 'At least 13', 'It depends on luck'],
        answer: 'At least 2',
        explanation: '13 people (pigeons) into 12 months (holes): 13 > 12, so at least one month must contain 2 or more people — guaranteed, not just likely.',
      },
    ],
    callouts: [
      {
        type: 'sequencing',
        title: 'Lesson 0 of the Course — Existence Without Construction',
        body: '**Starting here:** You learn that you can prove something exists without explicitly finding it — just by counting.\n**This lesson:** The Pigeonhole Principle (basic and generalized), proof by contradiction applied to counting arguments, and finding the right "holes" for real problems.\n**Next lesson (01):** Propositions and Proof Techniques — we formalize the logical language used to write rigorous proofs.',
      },
      {
        type: 'real-world',
        title: 'Where This Principle Lives in Computer Science',
        body: '**Hash tables:** Any hash function mapping k keys to n buckets with k > n must produce at least one collision. Every collision-handling strategy in DSA (chaining, open addressing) exists because of this principle.\n**Data compression:** The Pigeonhole Principle proves that no lossless compression algorithm can compress every possible input file. Some files must get bigger.\n**Network routing:** If n packets must travel through m < n channels simultaneously, at least one channel must carry multiple packets — a consequence used in queuing theory.',
      },
      {
        type: 'insight',
        title: 'The Difference Between "Probably" and "Guaranteed"',
        body: 'Probability says: with 23 people, there is a ~50% chance two share a birthday.\nDiscrete Math says: with 367 people, it is a 100% mathematical certainty.\n\nThe Pigeonhole Principle operates in the domain of certainty, not probability. It is a proof, not a sample.',
      },
      {
        type: 'definition',
        title: 'Pigeons and Holes — The Formal Setup',
        body: '**Pigeons:** the items being distributed (people, keys, socks, letters).\n**Holes:** the categories being distributed into (hair counts, birthdays, colors, buckets).\n**The guarantee:** if the number of pigeons exceeds the number of holes, at least one hole contains at least 2 pigeons.',
      },
      {
        type: 'misconception',
        title: 'Common Error: Confusing "Must" with "Will"',
        body: 'The principle tells you that a collision MUST exist — not where it is, not which hole holds two items, not how many such holes exist. It is a pure existence guarantee. You cannot use it to find the collision, only to prove one is unavoidable.',
      },
    ],
    visualizations: [
      {
        id: 'PigeonholeViz',
        title: 'The Inevitability Engine',
        mathBridge: 'Set the number of holes to 3 and try to place 4 items without putting 2 in the same hole. You cannot. Now set holes to 10 and items to 10 — it is possible to avoid a collision. Add one more item (11 into 10 holes) and try again. The visualization will block you from distributing 11 items into 10 holes with no collision. This physical impossibility is exactly what the proof captures in algebra: if k > n, a collision is not just likely, it is structurally impossible to avoid.',
        caption: 'Drag items into holes. Try to avoid a collision when items exceed holes. The math will stop you every time.',
      },
      {
        id: 'PigeonHoleDemo',
        title: 'Real-World Presets — Socks, Birthdays, Hairs',
        mathBridge: 'Switch to the "Socks" preset: 20 socks, 2 color categories. Watch how any draw sequence of 3+ socks forces a match. Switch to "Birthdays": 366 date categories, drop to 367 people. The calendar runs out of unique days. Switch to "Hairs": ~300,000 possible counts, add 9 million people — watch the guaranteed minimum occupancy per hole climb to 30. These are not simulations of probability — they are visualizations of mathematical certainty.',
        caption: 'Presets for real-world pigeonhole applications. Watch the guaranteed minimum per hole grow as items exceed holes.',
      },
    ],
  },

  math: {
    prose: [
      "The informal idea — more pigeons than holes means a collision — becomes a tool you can deploy precisely as soon as you state it with mathematical exactness.",

      "**The Basic Pigeonhole Principle:** If k items are distributed among n containers, and k > n, then at least one container contains at least 2 items. This is all you need for most applications: more items than categories forces a repeat.",

      "But often we want to know not just whether a collision exists, but *how crowded* the most crowded hole must be. The **Generalized Pigeonhole Principle** answers this: if k items are distributed among n containers, at least one container contains at least ⌈k/n⌉ items, where ⌈x⌉ is the ceiling function — the smallest integer greater than or equal to x.",

      "The ceiling matters because items are indivisible. If you distribute 10 items into 3 containers, the average is 10/3 ≈ 3.33 items per container. But you cannot have 3.33 items in a container. You can have 3 or 4 — and the ceiling says the most crowded container has at least ⌈10/3⌉ = 4. That is the guaranteed minimum maximum occupancy.",

      "To apply the generalized principle to London's hair counts: 9,000,000 people and 300,001 possible hair counts (0 through 300,000). At least one hair count must be shared by at least ⌈9,000,000 / 300,001⌉ = ⌈29.99...⌉ = 30 people. Not 2 — at least 30. The principle is surprisingly powerful when the ratio is large.",

      "**Identifying the structure.** The skill in using the principle is mapping your problem to the pigeon-and-hole framework. Ask: what are the possible categories (holes)? What are the individual items (pigeons)? What is the total number of each? Once you have those three numbers, arithmetic does the rest. The creative challenge is always identifying the right holes — and sometimes, as in the 'Inevitable Friendship' problem, the holes involve a subtle case analysis before you can even count them.",
    ],
    checks: [
      {
        afterParagraph: 4,
        question: 'Applying the Generalized Pigeonhole Principle to 9,000,000 people and 300,001 possible hair counts, what is the minimum guaranteed number of people sharing some hair count?',
        options: ['2', '9', '30', '300,001'],
        answer: '30',
        explanation: '⌈9,000,000 / 300,001⌉ = ⌈29.99...⌉ = 30. The large ratio between items and holes makes the guarantee much stronger than the basic "at least 2" case.',
      },
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'The Basic Pigeonhole Principle',
        body: 'If k items are distributed into n containers, and k > n, then at least one container contains at least 2 items.',
      },
      {
        type: 'theorem',
        title: 'The Generalized (Strong) Pigeonhole Principle',
        body: 'If k items are distributed into n containers, then at least one container contains at least ⌈k/n⌉ items. The ceiling ⌈x⌉ is the smallest integer ≥ x.',
      },
      {
        type: 'insight',
        title: 'The Ceiling Function — Why Rounding Up',
        body: 'If 10 items go into 3 containers, the average is 10/3 = 3.33... But items are indivisible. If every container had only 3, the total would be 9 — one item short. So at least one container must have 4. Ceiling(10/3) = 4 captures this exactly. The ceiling is "the most you can guarantee" in the worst-case distribution.',
      },
      {
        type: 'definition',
        title: 'The Ceiling Function',
        body: '⌈x⌉ = the smallest integer greater than or equal to x. For example: ⌈3.1⌉ = 4, ⌈3⌉ = 3, ⌈9/3⌉ = 3, ⌈10/3⌉ = 4.',
      },
    ],
    visualizations: [
      {
        id: 'CeilingFunctionViz',
        title: 'The Ceiling Function on the Number Line',
        mathBridge: 'Drag the slider to values like 3.1, 3.99, 4.0, 10/3, 7/2, and observe how the ceiling function jumps. Notice: the ceiling of an integer is itself. The ceiling only rounds up when the value is not already an integer. Now set k=10 and n=3 in the Pigeonhole calculator below the slider: it computes ⌈10/3⌉ = 4 and marks which distributions are possible vs. guaranteed. Verify that no distribution of 10 items into 3 containers has all containers with ≤ 3 items.',
        caption: 'The ceiling function rounds non-integers up to the next integer. In Pigeonhole calculations, it gives you the worst-case minimum occupancy of the most crowded hole.',
      },
    ],
  },

  rigor: {
    prose: [
      "**The Proof — Why 'Must' Is Mathematically Certain.** The Pigeonhole Principle, despite feeling obvious, requires a formal proof. The proof technique is Proof by Contradiction — we will use it here before formally studying it in Lesson 01. The idea: assume the principle is FALSE and show that leads to an impossibility.",

      "**Why Proof by Contradiction?** The principle says 'at least one container must have at least 2 items.' The negation of this is 'every container has at most 1 item.' If we can show that 'every container has at most 1 item' is impossible when k > n, then we have proved the principle. Contradiction arguments are powerful exactly here: when it is hard to point to which container has 2 items (we do not know!), it is easy to show that assuming none has 2 leads to a count that contradicts what we started with.",

      "**The Generalized Proof.** The strong form (⌈k/n⌉) uses the same contradiction structure: suppose every container holds at most ⌈k/n⌉ - 1 items. Then the total cannot reach k. Since the total is exactly k, this is impossible. Therefore at least one container holds at least ⌈k/n⌉ items.",

      "**Historical Note.** The Pigeonhole Principle was first stated explicitly by Peter Gustav Lejeune Dirichlet in 1834 (hence its German name: Schubfachprinzip, 'drawer principle'). Dirichlet used it to prove a theorem about rational approximation of real numbers — specifically, that for any irrational number α and any positive integer N, there exist integers p and q with 1 ≤ q ≤ N such that |α - p/q| < 1/(qN). This application, called Dirichlet's Approximation Theorem, shows the principle operating at the frontier of number theory. The 'pigeons' are the fractional parts of multiples of α; the 'holes' are N equal intervals of the unit interval [0, 1). Despite its simplicity, this technique is cited in hundreds of advanced mathematical proofs.",

      "**For the Computer Scientist.** The formal proof below is exactly the argument for why hash table collision is unavoidable: if you have k keys and n < k buckets, and assume every bucket has at most 1 key, you can account for at most n keys — but there are k > n. Contradiction. The math does not depend on the hash function, the data, or the order of insertion. It is a property of the numbers alone. This is why all hash table implementations must include collision handling — it is not optional engineering, it is a mathematical obligation.",
    ],
    checks: [
      {
        afterParagraph: 3,
        question: 'Why does proof by contradiction fit the Pigeonhole Principle so naturally?',
        options: [
          'Because you can directly point to which container has 2 items',
          'Because it\'s hard to identify WHICH container is overcrowded, but easy to show "every container has ≤1 item" leads to an impossible total count',
          'Because contradiction is the only proof technique that exists',
          'It doesn\'t fit naturally — direct proof is actually easier',
        ],
        answer: 'Because it\'s hard to identify WHICH container is overcrowded, but easy to show "every container has ≤1 item" leads to an impossible total count',
        explanation: 'The principle guarantees existence without telling you which container — exactly the kind of claim contradiction handles well: assume no collision, count the maximum possible total, and show it falls short of k.',
      },
    ],

    // Flat {expression, annotation} steps — DynamicProof (the component that
    // renders rigor.proofSteps) reads exactly this shape per step. Three
    // proofs back to back: basic principle, generalized principle, then a
    // worked application — each opens with a bold header step.
    proofSteps: [
      { expression: '\\textbf{Proof 1: Basic Pigeonhole Principle, by Contradiction}', annotation: 'We prove: if k items are placed into n containers and k > n, then at least one container holds ≥ 2 items.' },
      { expression: 'k > n \\;\\text{items in}\\; n \\;\\text{containers} \\implies \\exists \\text{ container with} \\geq 2 \\text{ items}', annotation: '**State the goal.** We want to prove that at least one container has ≥ 2 items, given k items in n containers with k > n.' },
      { expression: '\\text{Assume: every container holds} \\leq 1 \\text{ item.}', annotation: '**Assume the negation.** Suppose for contradiction that our conclusion is false: every container holds at most 1 item.' },
      { expression: '\\text{Total items} \\leq n \\times 1 = n', annotation: '**Count the maximum.** If every container holds at most 1 item, and there are n containers, the maximum total number of items across all containers is n × 1 = n.' },
      { expression: 'k \\leq n \\quad \\text{AND} \\quad k > n \\quad \\Rightarrow \\quad \\bot \\text{ contradiction}', annotation: '**Reach the contradiction.** We placed k items in total, and k > n by hypothesis. So k ≤ n and k > n simultaneously.' },
      { expression: '\\therefore \\text{ at least one container holds} \\geq 2 \\text{ items.} \\quad \\blacksquare', annotation: '**Conclude.** Our assumption was false. Therefore at least one container must hold ≥ 2 items.' },

      { expression: '\\textbf{Proof 2: Generalized Pigeonhole Principle, by Contradiction}', annotation: 'We prove: if k items go into n containers, at least one holds ≥ ⌈k/n⌉ items — the same technique, generalized beyond "≥ 2."' },
      { expression: 'm = \\left\\lceil \\frac{k}{n} \\right\\rceil', annotation: '**State the goal.** Let m = ⌈k/n⌉. We want to show that at least one container holds ≥ m items.' },
      { expression: '\\text{Assume: every container holds} \\leq m - 1 = \\left\\lceil \\frac{k}{n} \\right\\rceil - 1 \\text{ items.}', annotation: '**Assume the negation.** Suppose for contradiction that every container holds ≤ m − 1 items.' },
      { expression: '\\text{Total items} \\leq n \\cdot (m - 1) = n\\left(\\left\\lceil \\frac{k}{n} \\right\\rceil - 1\\right)', annotation: '**Count the maximum.** With n containers, each holding at most m − 1 items, the total is at most n(m − 1).' },
      { expression: 'n\\left(\\left\\lceil \\frac{k}{n} \\right\\rceil - 1\\right) < n \\cdot \\frac{k}{n} = k', annotation: '**Apply the ceiling property.** By definition of ceiling, ⌈k/n⌉ < k/n + 1, so ⌈k/n⌉ − 1 < k/n. Therefore n(⌈k/n⌉ − 1) < n·(k/n) = k.' },
      { expression: '\\text{Total} < k \\quad \\text{AND} \\quad \\text{Total} = k \\quad \\Rightarrow \\quad \\bot', annotation: '**Reach the contradiction.** The total is strictly less than k — but we placed exactly k items.' },
      { expression: '\\therefore \\text{ at least one container holds} \\geq \\left\\lceil \\frac{k}{n} \\right\\rceil \\text{ items.} \\quad \\blacksquare', annotation: '**Conclude.** The assumption is false. At least one container holds ≥ ⌈k/n⌉ items.' },

      { expression: '\\textbf{Application: Two Londoners Share the Same Hair Count}', annotation: 'A complete worked application using the generalized principle just proved.' },
      { expression: 'k = 9{,}000{,}000', annotation: '**Define the items (pigeons).** The items are the people in London. Population: approximately 9,000,000.' },
      { expression: 'n = 300{,}001 \\text{ (hair counts: } 0 \\text{ to } 300{,}000\\text{)}', annotation: '**Define the categories (holes).** The categories are possible hair counts: 0, 1, 2, ..., up to the biological maximum of about 300,000 — so 300,001 possible counts.' },
      { expression: 'k = 9{,}000{,}000 > 300{,}001 = n \\quad \\checkmark', annotation: '**Check the condition.** Is k > n? Yes: 9,000,000 ≫ 300,001.' },
      { expression: '\\left\\lceil \\frac{9{,}000{,}000}{300{,}001} \\right\\rceil = \\lceil 29.999... \\rceil = 30', annotation: '**Apply the generalized principle.** At least one hair count must be shared by at least ⌈k/n⌉ = 30 people.' },
      { expression: '\\therefore \\text{ at least 30 Londoners share the same hair count.} \\quad \\blacksquare', annotation: '**Conclude.** At least 30 people in London share the exact same hair count — provably, without measuring a single head.' },
    ],

    callouts: [
      {
        type: 'proof-map',
        title: 'The Proof Template for Any Pigeonhole Application',
        body: 'Every Pigeonhole proof follows this skeleton:\n1. **Define k:** what are the items (pigeons)? Count them.\n2. **Define n:** what are the categories (holes)? Count them — carefully! Sometimes a case analysis is needed (see the Friendship problem).\n3. **Check k > n** (or compute ⌈k/n⌉ for the generalized form).\n4. **Conclude:** by the Pigeonhole Principle, at least one category must contain at least 2 items (or ⌈k/n⌉ items).',
      },
      {
        type: 'history',
        title: 'Dirichlet\'s Approximation — The Principle at the Frontier of Number Theory',
        body: 'Dirichlet used the Pigeonhole Principle in 1834 to prove: for any real number α and integer N ≥ 1, there exist integers p and q with 1 ≤ q ≤ N such that |α − p/q| < 1/(qN). The "holes" are N equal subintervals of [0,1). The "pigeons" are the N+1 fractional parts {0·α}, {1·α}, ..., {N·α}. Since N+1 pigeons go into N holes, two fractional parts land in the same interval — and their difference gives the rational approximation. A principle about socks is proving theorems about irrational numbers.',
      },
      {
        type: 'real-world',
        title: 'Lossless Compression Cannot Compress Everything',
        body: 'Suppose you have a compression algorithm that takes any n-bit string and produces an output of at most n−1 bits. The number of n-bit strings is 2ⁿ (the pigeons). The number of strings of length ≤ n−1 bits is 2ⁿ⁻¹ + 2ⁿ⁻² + ... + 1 = 2ⁿ − 1 (the holes). Since 2ⁿ > 2ⁿ − 1, by Pigeonhole, at least two n-bit strings must compress to the same shorter string. But then decompression is ambiguous — you cannot recover the original. Therefore no lossless compression algorithm can compress every input. `zip` and `gzip` make some files larger by design.',
      },
      {
        type: 'insight',
        title: 'Why This Is "Discrete" Mathematics',
        body: 'The Pigeonhole Principle only works because items and categories are discrete — they cannot be split. You cannot have 3.33 socks in a hole. Continuous mathematics does not have this property: a continuous function can distribute values smoothly across a range with no forced collision. Discreteness is what makes the counting argument watertight, and it is the defining feature of every result in this course.',
      },
    ],
    visualizations: [
      {
        id: 'ContradictionBudgetLab',
        title: 'How Contradiction Proofs Work — The Impossibility Engine',
        caption: 'The proof visualized: the items bar always exceeds the no-collision budget when k > n. The visual mismatch is the contradiction.',
      },
    ],
  },

  examples: [
    {
      id: 'discrete-1-00-ex1',
      title: 'The Sock Drawer — Why 3, Not 11',
      problem: '\\text{A drawer holds 10 black socks and 10 white socks, all mixed. How many must you draw (blindfolded) to guarantee a matching pair?}',
      steps: [
        {
          expression: '\\text{Identify the holes: only 2 color categories exist (Black, White).}',
          annotation: 'The "categories" (holes) are the possible sock colors. Count them.',
          strategyTitle: 'Identify the Holes',
          checkpoint: 'Why are the holes the colors and not the individual socks?',
          hints: [
            'Holes are the categories you are distributing INTO. Colors are the categories here — "black" and "white" are the two pigeonholes.',
            'The individual socks are the pigeons (items). You are placing each sock into a color-hole as you draw it.',
            'There are only 2 colors regardless of how many socks there are. The total number of socks (20) is irrelevant to counting the holes.',
          ],
        },
        {
          expression: 'n = 2 \\text{ (holes: Black, White)}',
          annotation: 'We have exactly 2 holes.',
        },
        {
          expression: '\\text{We need: pigeons } k > n = 2 \\implies k \\geq 3.',
          annotation: 'The moment we draw a 3rd sock, we have 3 pigeons in 2 holes — a collision is guaranteed.',
          strategyTitle: 'Apply the Condition k > n',
          checkpoint: 'Can we have 2 socks without a match? Is 2 > 2 true?',
          hints: [
            'With 2 socks, we could have 1 black and 1 white — no match. k = 2 = n is NOT strictly greater than n, so the principle does not guarantee a collision yet.',
            'With 3 socks (k=3 > n=2), a collision is unavoidable. One color hole must hold at least 2 socks.',
          ],
        },
        {
          expression: '\\text{Minimum draws to guarantee a pair} = n + 1 = 2 + 1 = 3.',
          annotation: 'The formula for the minimum guarantee is always: number of holes + 1.',
          strategyTitle: 'The n+1 Formula',
        },
      ],
      conclusion: 'You only need 3 draws. The total number of socks (20) is a red herring — it only matters that there are 2 color categories. Many students guess 11 by thinking "half of 20 plus one," but the total count of socks is irrelevant. Only the number of categories determines the guarantee.',
    },
    {
      id: 'discrete-1-00-ex2',
      title: 'The Birthday Guarantee',
      problem: '\\text{How many people must be in a room to GUARANTEE that two share the same birthday?}',
      steps: [
        {
          expression: '\\text{Holes: possible birthdays} = 366 \\text{ (including Feb 29)}.',
          annotation: 'The categories are the 366 possible calendar dates. Every person falls into exactly one.',
          strategyTitle: 'Count the Holes',
          checkpoint: 'Should we use 365 or 366?',
          hints: [
            'February 29 is a real birthday. Using 365 would give a guarantee that is wrong for people born on Feb 29. Use 366 for the absolute guarantee.',
            'The Pigeonhole Principle works for any value of n. Using 366 makes the guarantee valid for every possible birthday in the Gregorian calendar.',
          ],
        },
        {
          expression: 'n = 366, \\quad \\text{need } k > 366 \\implies k \\geq 367.',
          annotation: '367 people cannot all have different birthdays — there are only 366 options.',
          strategyTitle: 'Apply k > n',
        },
        {
          expression: '\\text{367 people, 366 birthday holes} \\implies \\text{at least one birthday is shared.}',
          annotation: 'By the Basic Pigeonhole Principle.',
        },
        {
          expression: '\\text{Guaranteed minimum by generalized form: } \\left\\lceil \\frac{367}{366} \\right\\rceil = \\lceil 1.002... \\rceil = 2.',
          annotation: 'The generalized principle confirms at least one birthday is shared by at least 2 people.',
          strategyTitle: 'Generalized Check',
          checkpoint: 'What does "at least 2" tell us here — and what does it NOT tell us?',
          hints: [
            'It guarantees that at least one birthday is shared by at least 2 people. It does NOT tell us which birthday, or how many pairs exist.',
            'The guarantee is an existence proof — we know a shared birthday must exist, without identifying it.',
          ],
        },
      ],
      conclusion: 'You need 367 people. Contrast this with the Birthday Paradox from probability: with just 23 people there is a ~50% chance of a shared birthday, but no guarantee. Pigeonhole gives you 100% certainty at 367. This is the dividing line between probability and discrete combinatorics.',
    },
    {
      id: 'discrete-1-00-ex3',
      title: 'Hairs in London — The Generalized Principle',
      problem: '\\text{Prove at least 30 people in London share the exact same number of hairs on their head.}',
      steps: [
        {
          expression: '\\text{Max human hair count} \\approx 300{,}000 \\implies n = 300{,}001 \\text{ holes (counts 0 through 300,000)}.',
          annotation: 'Count 0 (bald) through 300,000. That is 300,001 distinct possible hair counts.',
          strategyTitle: 'Count the Holes Carefully',
          checkpoint: 'Why is it 300,001 and not 300,000?',
          hints: [
            'The count starts at 0 (completely bald). Counting 0, 1, 2, ..., 300,000 gives 300,001 values. Off-by-one errors here change the final answer.',
          ],
        },
        {
          expression: 'k = 9{,}000{,}000 \\text{ (population of London)}.',
          annotation: 'Each person is one pigeon.',
        },
        {
          expression: '\\left\\lceil \\frac{9{,}000{,}000}{300{,}001} \\right\\rceil = \\lceil 29.999... \\rceil = 30.',
          annotation: 'Apply the Generalized Pigeonhole Principle to find the guaranteed minimum occupancy of the most crowded hole.',
          strategyTitle: 'Generalized Principle',
          checkpoint: 'Why does ⌈29.999...⌉ = 30 and not ⌈29.999...⌉ = 29?',
          hints: [
            'The ceiling function rounds UP, not down. 29.999... is not an integer, so it rounds up to 30.',
            'If 29.999 rounded to 29, we would need to check whether 29 × 300,001 ≥ 9,000,000. It does not: 29 × 300,001 = 8,700,029 < 9,000,000. The ceiling of 30 is correct.',
          ],
        },
        {
          expression: '\\therefore \\text{ at least one hair count is shared by} \\geq 30 \\text{ Londoners.}',
          annotation: 'A conclusion about 9 million people, derived without measuring a single head.',
        },
      ],
      conclusion: 'The Generalized Principle extracts much more information than the basic version. We do not just know a collision exists — we know the most crowded category has at least 30 people. As the ratio k/n grows, the guaranteed collision becomes more and more concentrated.',
    },
    {
      id: 'discrete-1-00-ex4',
      title: 'The Inevitable Friendship — Finding the Hidden Holes',
      problem: '\\text{Prove: at any party with 2 or more people, there are always two people with the exact same number of friends at the party.}',
      steps: [
        {
          expression: '\\text{Let } P = \\text{number of people. Friend counts range from } 0 \\text{ to } P-1.',
          annotation: 'A person can know nobody (0 friends) or everybody else (P−1 friends). That gives P possible values.',
          strategyTitle: 'List the Apparent Holes',
          checkpoint: 'Can one person have 0 friends while another has P−1 friends at the same party?',
          hints: [
            'If someone has P−1 friends, they are friends with EVERYONE at the party — including the person with supposedly 0 friends. But then the "0 friends" person has at least 1 friend. Contradiction.',
            '0 friends and P−1 friends cannot coexist at the same party. The two extreme values are mutually exclusive.',
          ],
        },
        {
          expression: '\\text{The values 0 and } P-1 \\text{ cannot both be occupied} \\implies \\text{only } P-1 \\text{ distinct friend counts are possible.}',
          annotation: 'The hidden insight: the number of USABLE holes is only P−1, not P.',
          strategyTitle: 'Collapse the Hole Count',
          checkpoint: 'Which two values are mutually exclusive? How does eliminating one change the count?',
          hints: [
            'Either 0 is occupied (someone has no friends) and then P−1 is impossible, OR P−1 is occupied (someone knows everyone) and then 0 is impossible.',
            'Either way, at most P−1 distinct friend counts can appear. So n = P−1.',
          ],
        },
        {
          expression: 'k = P \\text{ people (pigeons)}, \\quad n = P-1 \\text{ friend counts (holes)}.',
          annotation: 'Now k > n: P people and only P−1 usable friend-count categories.',
        },
        {
          expression: 'P > P - 1 \\implies \\text{by Pigeonhole, at least two people share the same friend count.}',
          annotation: 'The condition k > n is satisfied. A collision is guaranteed.',
          strategyTitle: 'Apply the Principle',
        },
      ],
      conclusion: 'The creative work in this problem was not arithmetic — it was the insight that 0 and P−1 cannot coexist, which collapsed the number of holes from P to P−1. This pattern — reducing the effective number of categories through a logical observation — is the advanced application of the Pigeonhole Principle that appears in graduate-level combinatorics and graph theory.',
    },
  ],

  challenges: [
    {
      id: 'discrete-1-00-ch1',
      difficulty: 'easy',
      problem: 'A drawer holds 13 types of socks (pairs of each type), all mixed. How many socks do you need to draw to guarantee at least one matching pair?',
      hint: 'How many holes are there? What is the formula for minimum guarantee in terms of holes?',
      walkthrough: [
        { expression: 'n = 13 \\text{ (13 distinct sock types = 13 color holes)}', annotation: 'Count the categories, not the socks.' },
        { expression: '\\text{Minimum guarantee} = n + 1 = 13 + 1 = 14', annotation: 'One more pigeon than holes guarantees a collision.' },
        { expression: '\\text{At 13 draws, you might have exactly one of each type — no match yet.}', annotation: 'The worst case: 13 draws with no collision possible. The 14th forces it.' },
      ],
      answer: '14 socks.',
    },
    {
      id: 'discrete-1-00-ch2',
      difficulty: 'medium',
      problem: 'Show that in any group of 6 integers, at least two have the same remainder when divided by 5.',
      hint: 'What are the possible remainders when dividing by 5? Those are your holes.',
      walkthrough: [
        { expression: '\\text{Remainders mod 5} \\in \\{0, 1, 2, 3, 4\\} \\implies n = 5', annotation: 'Five possible remainder classes.' },
        { expression: 'k = 6 > n = 5 \\implies \\text{Pigeonhole applies.}', annotation: '6 integers (pigeons) into 5 remainder classes (holes).' },
        { expression: '\\therefore \\text{ at least two integers share the same remainder mod 5.}', annotation: 'Guaranteed by the Basic Pigeonhole Principle.' },
      ],
      answer: 'Guaranteed: 6 pigeons into 5 remainder holes forces a collision.',
    },
    {
      id: 'discrete-1-00-ch3',
      difficulty: 'hard',
      problem: 'In any group of 9 people, prove at least 5 were born in the same half of the year (Jan–Jun or Jul–Dec).',
      hint: 'Use the Generalized Principle with 2 holes (the two halves).',
      walkthrough: [
        { expression: 'n = 2 \\text{ halves: (Jan–Jun) and (Jul–Dec)}', annotation: 'The two halves of the year are the holes.' },
        { expression: 'k = 9 \\text{ people (pigeons)}', annotation: 'Each person lands in exactly one half-year.' },
        { expression: '\\left\\lceil \\frac{9}{2} \\right\\rceil = \\lceil 4.5 \\rceil = 5', annotation: 'By the Generalized Principle, the most crowded half holds at least 5 people.' },
        { expression: '\\therefore \\text{ at least one half-year contains} \\geq 5 \\text{ birthdays.}', annotation: 'Proven without knowing who was born when.' },
      ],
      answer: 'At least 5, by the Generalized Pigeonhole Principle with 9 pigeons and 2 holes.',
    },
    {
      id: 'discrete-1-00-ch4',
      difficulty: 'hard',
      problem: 'You hash 1,001 keys into a table of 1,000 buckets. Prove that at least one bucket must hold at least 2 keys, regardless of the hash function.',
      hint: 'Model the keys as pigeons and the buckets as holes. What does the Principle say about ANY distribution?',
      walkthrough: [
        { expression: 'k = 1{,}001 \\text{ (keys = pigeons)}, \\quad n = 1{,}000 \\text{ (buckets = holes)}', annotation: 'Identify the pigeon-and-hole structure.' },
        { expression: 'k > n \\implies \\text{Basic Pigeonhole applies.}', annotation: '1,001 > 1,000.' },
        { expression: '\\text{Therefore at least one bucket holds} \\geq 2 \\text{ keys.}', annotation: 'This holds for ANY hash function — the result is independent of the algorithm.' },
        { expression: '\\text{Consequence: hash table collision handling is a mathematical requirement, not an engineering choice.}', annotation: 'You cannot engineer your way out of a Pigeonhole guarantee.' },
      ],
      answer: 'At least one collision is provably guaranteed, for any hash function whatsoever.',
    },
  ],

  crossRefs: [
    { lessonSlug: 'propositions-and-proof-techniques', label: 'Propositions and Proof Techniques', context: 'The proof by contradiction used here is formalized in Lesson 01. You will learn the exact logical structure of what "assuming the negation and deriving an impossibility" means.' },
    { lessonSlug: 'counting-and-combinatorics', label: 'Counting and Combinatorics', context: 'The Pigeonhole Principle is a special case of combinatorial counting. The ceiling function and exact collision counts are generalized in the permutations and combinations lesson.' },
    { lessonSlug: 'discrete-probability', label: 'Discrete Probability', context: 'Probability gives you likelihood (23 people → 50% chance). Pigeonhole gives you certainty (367 people → 100% guarantee). Both describe the birthday problem — from different mathematical perspectives.' },
  ],

  spiral: {
    recoveryPoints: [],
    futureLinks: [
      {
        lessonId: 'discrete-1-01',
        label: 'Propositions and Proof Techniques (Next)',
        note: 'The proof by contradiction used in this lesson is formalized in Lesson 01. You already used it — now you will understand its precise logical structure and be able to apply it to any statement.',
      },
      {
        lessonId: 'discrete-1-04',
        label: 'Counting and Combinatorics (Later)',
        note: 'The Pigeonhole Principle is a tool from combinatorics. When you study permutations, combinations, and the inclusion-exclusion principle, you will see how counting arguments grow in sophistication beyond the simple k > n case.',
      },
    ],
  },

  assessment: {
    questions: [
      {
        id: 'ph-assess-1',
        type: 'choice',
        text: 'What is the minimum number of socks you must draw from a drawer with 5 colors of socks to guarantee a matching pair?',
        options: ['5', '6', '10', '3'],
        answer: '6',
        hint: 'The guarantee is n + 1 where n is the number of color categories.',
      },
      {
        id: 'ph-assess-2',
        type: 'input',
        text: 'If 50 items are distributed into 8 containers, what is the guaranteed minimum number of items in at least one container? (Use the generalized principle.)',
        answer: '7',
        hint: 'Compute ⌈50/8⌉.',
      },
      {
        id: 'ph-assess-3',
        type: 'choice',
        text: 'The Pigeonhole Principle is an example of which proof technique?',
        options: ['Direct Proof', 'Proof by Induction', 'Proof by Contradiction', 'Proof by Construction'],
        answer: 'Proof by Contradiction',
        hint: 'We assume no collision exists and show the total item count would be less than k — contradicting k > n.',
      },
    ],
  },

  mentalModel: [
    'More pigeons than holes → at least one collision is unavoidable.',
    'Holes = categories. Pigeons = items. Match every problem to these two roles.',
    'Basic: k > n → at least one hole has ≥ 2 items.',
    'Generalized: k items, n holes → at least one hole has ≥ ⌈k/n⌉ items.',
    'Proof structure: assume no collision → total ≤ n < k → contradiction.',
    'Creative challenge: identifying the right holes (they are not always obvious).',
    '0 and P−1 friend counts cannot coexist → effective holes reduce from P to P−1.',
  ],

  quiz: [
    {
      id: 'ph-q1',
      type: 'choice',
      text: 'You draw socks from a drawer with 6 colors. What is the minimum number of socks to guarantee a matching pair?',
      options: ['6', '7', '12', '3'],
      answer: '7',
      hints: ['The guarantee is always: (number of color categories) + 1.'],
      reviewSection: 'Intuition — the sock drawer example',
    },
    {
      id: 'ph-q2',
      type: 'choice',
      text: 'The Pigeonhole Principle proves that a collision MUST exist. What does it NOT tell you?',
      options: [
        'Whether any collision exists',
        'Which specific hole contains 2 or more items',
        'Whether items exceed holes',
        'The guaranteed minimum collision count',
      ],
      answer: 'Which specific hole contains 2 or more items',
      hints: ['The principle is an existence proof — it guarantees a collision exists, but does not locate it.'],
      reviewSection: 'Intuition — misconception callout',
    },
    {
      id: 'ph-q3',
      type: 'input',
      text: 'Compute ⌈17/4⌉.',
      answer: '5',
      hints: ['17 ÷ 4 = 4.25. The ceiling rounds up: ⌈4.25⌉ = 5.'],
      reviewSection: 'Math — the ceiling function',
    },
    {
      id: 'ph-q4',
      type: 'choice',
      text: '15 items are distributed into 4 containers. What is the minimum number of items guaranteed in at least one container?',
      options: ['3', '4', '5', '6'],
      answer: '4',
      hints: ['Compute ⌈15/4⌉ = ⌈3.75⌉ = 4.'],
      reviewSection: 'Math — generalized pigeonhole theorem',
    },
    {
      id: 'ph-q5',
      type: 'choice',
      text: 'In the Friendship problem, why are there only P−1 usable friend-count holes instead of P?',
      options: [
        'Because one person is always excluded from the party',
        'Because 0 friends and P−1 friends cannot coexist in the same party',
        'Because friend counts start at 1, not 0',
        'Because the party needs at least one host with special status',
      ],
      answer: 'Because 0 friends and P−1 friends cannot coexist in the same party',
      hints: ['If someone knows everyone (P−1), then no one can know zero people. The extreme values are mutually exclusive.'],
      reviewSection: 'Examples — the Inevitable Friendship',
    },
    {
      id: 'ph-q6',
      type: 'choice',
      text: 'Why can no lossless compression algorithm compress every possible input file?',
      options: [
        'Because compression requires more memory than the file',
        'Because there are more n-bit strings than shorter strings, so two inputs must map to the same output',
        'Because some files are encrypted',
        'Because the algorithm runs out of time',
      ],
      answer: 'Because there are more n-bit strings than shorter strings, so two inputs must map to the same output',
      hints: ['This is a direct application of Pigeonhole: 2ⁿ inputs cannot all map to distinct outputs of length ≤ n−1, since there are only 2ⁿ−1 such shorter strings.'],
      reviewSection: 'Rigor — lossless compression callout',
    },
    {
      id: 'ph-q7',
      type: 'choice',
      text: 'What is the logical structure of the Pigeonhole proof?',
      options: [
        'Assume k > n, derive the collision directly',
        'Assume no collision exists, count the maximum items possible, contradict k > n',
        'Use induction on the number of containers',
        'Construct an explicit assignment that produces a collision',
      ],
      answer: 'Assume no collision exists, count the maximum items possible, contradict k > n',
      hints: ['The proof is by contradiction: assume the conclusion is false (no collision), show the total items must be ≤ n, contradict k > n.'],
      reviewSection: 'Rigor — proof by contradiction',
    },
  ],

  checkpoints: [
    'read-intuition',
    'read-math',
    'read-rigor',
    'completed-example-1',
    'completed-example-2',
    'completed-example-3',
    'completed-example-4',
    'attempted-challenge-easy',
    'attempted-challenge-medium',
    'attempted-challenge-hard',
  ],
};
