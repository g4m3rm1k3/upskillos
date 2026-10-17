// Data for the Symbol & Theorem Decoder tab and the EquationAnatomy figure:
//   SYMBOLS: [tex, say, means, example, lessonId, group]
//   EQUATIONS: famous discrete math theorems and identities broken into clickable pieces

export const SYMBOLS = [
  // Logic
  ['\\neg p', 'not p', 'Negation: flips the truth value of proposition $p$', '$\\neg \\text{T} = \\text{F}$', 'propositions', 'Logic'],
  ['p \\land q', 'p and q', 'Conjunction: true only when both $p$ and $q$ are true', '$\\text{T} \\land \\text{F} = \\text{F}$', 'propositions', 'Logic'],
  ['p \\lor q', 'p or q', 'Inclusive disjunction: true when at least one of $p, q$ is true', '$\\text{T} \\lor \\text{F} = \\text{T}$', 'propositions', 'Logic'],
  ['p \\oplus q', 'p xor q', 'Exclusive OR: true when $p$ and $q$ have different truth values', '$\\text{T} \\oplus \\text{T} = \\text{F}$', 'propositions', 'Logic'],
  ['p \\to q', 'if p then q', 'Material implication: false only when $p = \\text{T}$ and $q = \\text{F}$ ($\\equiv \\neg p \\lor q$)', '$\\text{F} \\to \\text{F} = \\text{T}$', 'implication', 'Logic'],
  ['p \\leftrightarrow q', 'p if and only if q', 'Biconditional: true when $p$ and $q$ have the same truth value', '$(p \\to q) \\land (q \\to p)$', 'implication', 'Logic'],
  ['P \\equiv Q', 'P is logically equivalent to Q', '$P$ and $Q$ have identical truth values on every row of their truth table', '$\\neg(p \\land q) \\equiv \\neg p \\lor \\neg q$', 'equivalences', 'Logic'],
  ['\\top,\\; \\bot', 'top (tautology), bottom (contradiction)', 'Always-true formula ($\\top$) and always-false formula ($\\bot$)', '$p \\lor \\neg p \\equiv \\top,\\; p \\land \\neg p \\equiv \\bot$', 'equivalences', 'Logic'],
  ['\\forall x \\in D', 'for all x in D', 'Universal quantifier: predicate holds for every element of domain $D$', '$\\forall n \\in \\mathbb{N},\\; n^2 \\ge 0$', 'quantifiers', 'Logic'],
  ['\\exists x \\in D', 'there exists x in D', 'Existential quantifier: predicate holds for at least one element of $D$', '$\\exists p \\in \\mathbb{Z},\\; p\\text{ is even prime}$', 'quantifiers', 'Logic'],
  ['\\exists! x \\in D', 'there exists a unique x in D', 'Uniqueness quantifier: predicate holds for exactly one element of $D$', '$\\exists! x \\in \\mathbb{R},\\; x + 3 = 5$', 'quantifiers', 'Logic'],
  ['\\therefore', 'therefore', 'Marks the conclusion of a deductive argument', '$p,\\; p \\to q \\;\\therefore\\; q$', 'inference', 'Logic'],

  // Proof & Numbers
  ['\\mathbb{N},\\; \\mathbb{Z},\\; \\mathbb{Q},\\; \\mathbb{R}', 'naturals, integers, rationals, reals', 'Standard number systems ($\\mathbb{N} = \\{0, 1, 2, \\dots\\}$, $\\mathbb{Z} = \\{\\dots, -1, 0, 1, \\dots\\}$)', '$\\sqrt{2} \\in \\mathbb{R} \\setminus \\mathbb{Q}$', 'direct-proof', 'Proofs'],
  ['a \\mid b', 'a divides b', 'Divisibility: there exists $k \\in \\mathbb{Z}$ such that $b = ak$', '$7 \\mid 42$ since $42 = 7 \\cdot 6$', 'direct-proof', 'Proofs'],
  ['a \\nmid b', 'a does not divide b', 'No integer $k$ satisfies $b = ak$', '$4 \\nmid 10$', 'contrapositive-cases', 'Proofs'],
  ['P(k) \\implies P(k+1)', 'P of k implies P of k plus 1', 'The inductive step in mathematical induction', 'Domino $k$ knocks over domino $k+1$', 'induction', 'Proofs'],
  ['\\blacksquare\\text{ or }\\square', 'Q.E.D. / Halmos tombstone', 'Marks the end of a completed mathematical proof', 'Quod erat demonstrandum', 'contradiction', 'Proofs'],

  // Sets, Functions & Relations
  ['x \\in A,\\; x \\notin A', 'x is in A, x is not in A', 'Element membership in set $A$', '$3 \\in \\{1, 3, 5\\},\\; 2 \\notin \\{1, 3, 5\\}$', 'sets', 'Sets & Relations'],
  ['\\emptyset', 'the empty set', 'The unique set with $0$ elements ($\\emptyset = \\{\\}$)', '$|\\emptyset| = 0,\\; \\emptyset \\subseteq A$', 'sets', 'Sets & Relations'],
  ['A \\subseteq B,\\; A \\subsetneq B', 'A is a subset / proper subset of B', 'Every element of $A$ is in $B$ ($\\forall x,\\; x \\in A \\to x \\in B$)', '$\\{1, 2\\} \\subseteq \\{1, 2, 3\\}$', 'sets', 'Sets & Relations'],
  ['\\mathcal{P}(A)', 'power set of A', 'Set of all subsets of $A$, with $|\\mathcal{P}(A)| = 2^{|A|}$', '$\\mathcal{P}(\\{1\\}) = \\{\\emptyset, \\{1\\}\\}$', 'sets', 'Sets & Relations'],
  ['A \\times B', 'A cross B', 'Cartesian product: set of ordered pairs $\\{(a, b) : a \\in A \\land b \\in B\\}$', '$|A \\times B| = |A| \\cdot |B|$', 'sets', 'Sets & Relations'],
  ['A \\cup B,\\; A \\cap B', 'A union B, A intersect B', 'Elements in either set ($\\cup$) vs. elements in both sets ($\\cap$)', '$\\{1,2\\} \\cup \\{2,3\\} = \\{1,2,3\\}$', 'set-operations', 'Sets & Relations'],
  ['A \\setminus B,\\; A \\triangle B', 'A minus B, symmetric difference', 'Elements in $A$ not in $B$ ($\\setminus$) vs. elements in exactly one of $A, B$ ($\\triangle$)', '$\\{1,2\\} \\triangle \\{2,3\\} = \\{1,3\\}$', 'set-operations', 'Sets & Relations'],
  ['\\overline{A}\\text{ or }A^c', 'complement of A', 'Elements of the universe $U$ outside $A$: $U \\setminus A$', '$\\overline{A \\cup B} = \\overline{A} \\cap \\overline{B}$', 'set-operations', 'Sets & Relations'],
  ['f : A \\to B', 'f maps A to B', 'Function assigning each $a \\in A$ a unique output $f(a) \\in B$', 'Total functions: $|B|^{|A|}$', 'functions-bijections', 'Sets & Relations'],
  ['g \\circ f', 'g composed with f', 'Function composition: $(g \\circ f)(x) = g(f(x))$', '$f^{-1} \\circ f = \\text{id}_A$', 'functions-bijections', 'Sets & Relations'],
  ['\\lfloor x \\rfloor,\\; \\lceil x \\rceil', 'floor of x, ceiling of x', 'Greatest integer $\\le x$ and least integer $\\ge x$', '$\\lfloor 3.7 \\rfloor = 3,\\; \\lceil 3.1 \\rceil = 4$', 'functions-bijections', 'Sets & Relations'],
  ['a \\,R\\, b', 'a is R-related to b', 'Ordered pair $(a, b)$ belongs to binary relation $R \\subseteq A \\times A$', '$R^+ = \\bigcup_{k \\ge 1} R^k$', 'relations', 'Sets & Relations'],
  ['[a]_\\sim,\\; A/{\\sim}', 'equivalence class of a, quotient set', '$[a] = \\{x \\in A : x \\sim a\\}$ and the partition $A/{\\sim}$ of all classes', '$\\mathbb{Z}/n\\mathbb{Z}$ has $n$ classes', 'equivalence-posets', 'Sets & Relations'],
  ['S(n, k),\\; B_n', 'Stirling number of 2nd kind, Bell number', '$S(n, k)$ partitions an $n$-set into $k$ non-empty blocks; $B_n = \\sum_{k=0}^n S(n, k)$', '$S(4, 2) = 7,\\; B_4 = 15$', 'equivalence-posets', 'Sets & Relations'],
  ['\\aleph_0,\\; \\mathfrak{c}', 'aleph-null, continuum', 'Cardinality of countably infinite sets ($|\\mathbb{N}| = \\aleph_0$) and of $\\mathbb{R}$ ($\\mathfrak{c} = 2^{\\aleph_0}$)', '$|\\mathbb{Q}| = \\aleph_0 < 2^{\\aleph_0} = |\\mathbb{R}|$', 'cardinality-infinity', 'Sets & Relations'],

  // Combinatorics
  ['n!', 'n factorial', 'Product of the first $n$ positive integers ($0! = 1$)', '$5! = 120$', 'permutations', 'Combinatorics'],
  ['P(n, k)', 'n permute k', 'Ordered $k$-tuples of distinct items from $n$: $n! / (n - k)!$', '$P(5, 2) = 5 \\cdot 4 = 20$', 'permutations', 'Combinatorics'],
  ['\\binom{n}{k}', 'n choose k', 'Unordered $k$-element subsets of an $n$-set: $\\frac{n!}{k!(n - k)!}$', '$\\binom{6}{2} = 15$', 'combinations', 'Combinatorics'],
  ['\\binom{n + k - 1}{k - 1}', 'stars and bars', 'Ways to distribute $n$ identical items into $k$ labeled bins ($x_1 + \\dots + x_k = n$)', '$n=5, k=3 \\implies \\binom{7}{2} = 21$', 'binomial-stars-bars', 'Combinatorics'],
  ['\\binom{n}{n_1, n_2, \\dots, n_r}', 'multinomial coefficient', 'Arrangements of $n$ items with $n_i$ indistinguishable of type $i$: $\\frac{n!}{n_1!\\cdots n_r!}$', '$\\frac{11!}{1!4!4!2!} = 34650$', 'binomial-stars-bars', 'Combinatorics'],
  ['D_n', 'n-th derangement number', 'Permutations of $n$ items with zero fixed points: $n! \\sum_{k=0}^n \\frac{(-1)^k}{k!} \\approx \\frac{n!}{e}$', '$D_4 = 9,\\; D_5 = 44$', 'inclusion-exclusion', 'Combinatorics'],

  // Number Theory & Cryptography
  ['a \\bmod d', 'a mod d', 'Unique remainder $r \\in \\{0, 1, \\dots, d - 1\\}$ when $a = dq + r$', '$-17 \\bmod 5 = 3$', 'divisibility-primes', 'Number Theory'],
  ['\\tau(n),\\; \\sigma(n)', 'divisor count, divisor sum', 'Number of positive divisors ($\\tau$) and sum of positive divisors ($\\sigma$) of $n$', '$\\tau(12) = 6,\\; \\sigma(12) = 28$', 'divisibility-primes', 'Number Theory'],
  ['\\gcd(a, b),\\; \\operatorname{lcm}(a, b)', 'greatest common divisor, least common multiple', 'Largest shared divisor and smallest shared positive multiple ($\\gcd \\cdot \\operatorname{lcm} = ab$)', '$\\gcd(12, 18) = 6,\\; \\operatorname{lcm} = 36$', 'gcd-bezout', 'Number Theory'],
  ['a \\equiv b \\pmod m', 'a is congruent to b modulo m', '$m$ divides $a - b$ (same remainder when divided by $m$)', '$17 \\equiv 2 \\pmod 5$', 'modular-arithmetic', 'Number Theory'],
  ['a^{-1} \\bmod m', 'modular inverse of a mod m', 'Unique residue $x \\in \\mathbb{Z}_m$ with $ax \\equiv 1 \\pmod m$ (exists $\\iff \\gcd(a, m) = 1$)', '$3^{-1} \\bmod 10 = 7$', 'modular-arithmetic', 'Number Theory'],
  ['\\varphi(n)', 'Euler’s totient of n', 'Count of integers in $\\{1, \\dots, n\\}$ coprime to $n$: $n \\prod_{p \\mid n}(1 - 1/p)$', '$\\varphi(15) = (3-1)(5-1) = 8$', 'crt-fermat', 'Number Theory'],

  // Recurrences, Generating Functions & Asymptotics
  ['\\sum_{i=m}^n a_i,\\; \\prod_{i=m}^n a_i', 'sum / product from i = m to n', 'Indexed summation and indexed multiplication over $i = m, \\dots, n$', '$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$', 'sequences-sums', 'Recurrences & Asymptotics'],
  ['F_n,\\; \\varphi', 'n-th Fibonacci number, golden ratio', '$F_0 = 0, F_1 = 1, F_n = F_{n-1} + F_{n-2}$ and $\\varphi = \\frac{1 + \\sqrt{5}}{2} \\approx 1.618$', '$F_n = \\frac{\\varphi^n - \\psi^n}{\\sqrt{5}}$', 'recurrences', 'Recurrences & Asymptotics'],
  ['[x^n] G(x)', 'coefficient of x^n in G(x)', 'Extracts the sequence term $a_n$ from generating function $G(x) = \\sum_{n \\ge 0} a_n x^n$', '$[x^n]\\frac{1}{1-2x} = 2^n$', 'generating-functions', 'Recurrences & Asymptotics'],
  ['C_n', 'n-th Catalan number', '$C_n = \\frac{1}{n+1}\\binom{2n}{n}$, counting balanced parens, binary trees, and Dyck paths', '$1, 1, 2, 5, 14, 42, 132$', 'generating-functions', 'Recurrences & Asymptotics'],
  ['O(g(n)),\\; \\Omega(g(n)),\\; \\Theta(g(n))', 'Big-O, Big-Omega, Big-Theta', 'Asymptotic upper bound ($O$), lower bound ($\\Omega$), and tight sandwich bound ($\\Theta$)', '$3n^2 + 5n = \\Theta(n^2)$', 'asymptotics', 'Recurrences & Asymptotics'],

  // Graph Theory
  ['G = (V, E)', 'graph G with vertices V and edges E', 'Network of nodes $V$ connected by pairs $E$', '$|V| = n,\\; |E| = m$', 'graphs-handshaking', 'Graph Theory'],
  ['\\deg(v)', 'degree of vertex v', 'Number of edges incident to $v$ ($\\sum_{v \\in V} \\deg(v) = 2|E|$)', 'In $K_n$, $\\deg(v) = n - 1$', 'graphs-handshaking', 'Graph Theory'],
  ['K_n,\\; K_{m,n},\\; C_n,\\; Q_d', 'complete, complete bipartite, cycle, hypercube', 'Canonical graph families used as structural benchmarks', '$|E(K_n)| = \\binom{n}{2},\\; |E(K_{m,n})| = mn$', 'graphs-handshaking', 'Graph Theory'],
  ['G \\cong H', 'G is isomorphic to H', 'There exists an edge-preserving vertex bijection $\\varphi : V(G) \\to V(H)$', 'Same invariants ($|V|, |E|$, degree seq)', 'representations-isomorphism', 'Graph Theory'],
  ['v - e + f = 2', 'Euler’s planar formula', 'In any connected plane graph drawing, vertices minus edges plus faces equals $2$', 'Cube $Q_3$: $8 - 12 + 6 = 2$', 'planar-coloring', 'Graph Theory'],
  ['\\chi(G)', 'chromatic number of G', 'Minimum number of colors needed so adjacent vertices get different colors', '$\\chi(C_5) = 3,\\; \\chi(\\text{planar}) \\le 4$', 'planar-coloring', 'Graph Theory'],

  // Discrete Probability, Boolean Algebra & Automata
  ['P(A \\mid B)', 'probability of A given B', 'Conditional probability of $A$ restricted to event $B$: $P(A \\cap B)/P(B)$', '$P(A \\mid B) = \\frac{P(B \\mid A)P(A)}{P(B)}$', 'discrete-probability', 'Probability & Automata'],
  ['E[X],\\; \\operatorname{Var}(X)', 'expectation and variance of X', 'Probability-weighted average $E[X] = \\sum x P(X=x)$ and spread $E[X^2] - (E[X])^2$', '$E[X + Y] = E[X] + E[Y]$ always', 'expectation-linearity', 'Probability & Automata'],
  ['H_n', 'n-th harmonic number', '$H_n = 1 + \\frac{1}{2} + \\frac{1}{3} + \\dots + \\frac{1}{n} \\approx \\ln n + \\gamma$', 'Coupon collector: $E[T] = n H_n$', 'expectation-linearity', 'Probability & Automata'],
  ['x \\uparrow y,\\; x \\downarrow y', 'x NAND y, x NOR y', 'Functionally complete universal logic gates: $\\overline{xy}$ and $\\overline{x + y}$', '$x \\uparrow x = \\bar{x}$', 'boolean-karnaugh', 'Probability & Automata'],
  ['M = (Q, \\Sigma, \\delta, q_0, F)', 'DFA 5-tuple', 'Deterministic Finite Automaton: states $Q$, alphabet $\\Sigma$, transition $\\delta$, start $q_0$, accept $F$', '$L(M) = \\{w \\in \\Sigma^* : \\delta^*(q_0, w) \\in F\\}$', 'automata-languages', 'Probability & Automata'],
]

export const EQUATIONS = [
  {
    id: 'demorgan-quantifier',
    name: 'Quantifier De Morgan & Conditional Negation',
    source: 'Predicate Logic (Part [[#part:logic-foundations]]) — how to refute a universal claim with a single witness',
    tex: '\\neg \\forall x \\in D,\\;(P(x) \\to Q(x)) \\;\\equiv\\; \\exists x \\in D,\\;(P(x) \\land \\neg Q(x))',
    parts: [
      ['\\neg \\forall x \\in D', 'Denying that a rule holds for every $x$ in the domain $D$', 'quantifiers'],
      ['P(x) \\to Q(x)', 'The universal conditional claim: whenever hypothesis $P(x)$ holds, conclusion $Q(x)$ must follow', 'implication'],
      ['\\exists x \\in D', 'Flips $\\forall$ to $\\exists$: you only need ONE counterexample $x \\in D$ to refute a universal claim', 'quantifiers'],
      ['P(x) \\land \\neg Q(x)', 'The counterexample must satisfy the hypothesis $P(x)$ while falsifying the conclusion $Q(x)$', 'direct-proof'],
    ],
    whole: 'To disprove “for all $x$, if $P(x)$ then $Q(x)$,” exhibit a single element $x \\in D$ for which $P(x)$ is true and $Q(x)$ is false.',
  },
  {
    id: 'binomial-theorem',
    name: 'The Binomial Theorem',
    source: 'Combinatorics (Part [[#part:combinatorics]]) — expanding $(x + y)^n$ by counting which brackets contribute $x$',
    tex: '(x + y)^n \\;=\\; \\sum_{k=0}^{n} \\binom{n}{k} x^k y^{n-k}',
    parts: [
      ['(x + y)^n', 'The product of $n$ identical binomial factors $(x + y)(x + y)\\cdots(x + y)$', 'binomial-stars-bars'],
      ['\\sum_{k=0}^{n}', 'Sum over every possible number $k \\in \\{0, 1, \\dots, n\\}$ of brackets from which we pick $x$', 'sequences-sums'],
      ['\\binom{n}{k}', 'The number of ways to choose which $k$ of the $n$ brackets contribute $x$ (the other $n - k$ contribute $y$)', 'combinations'],
      ['x^k y^{n-k}', 'The resulting monomial when $k$ brackets contribute $x$ and $n - k$ brackets contribute $y$', 'binomial-stars-bars'],
    ],
    whole: 'Every term in $(x + y)^n$ comes from choosing $k$ of the $n$ factors to supply $x$ and the remaining $n - k$ factors to supply $y$, in $\\binom{n}{k}$ ways.',
  },
  {
    id: 'inclusion-exclusion',
    name: 'Principle of Inclusion–Exclusion & Derangements',
    source: 'Combinatorics (Part [[#part:combinatorics]]) — alternating intersection sums that correct overcounting',
    tex: 'D_n \\;=\\; n! \\sum_{k=0}^{n} \\frac{(-1)^k}{k!} \\;\\approx\\; \\frac{n!}{e}',
    parts: [
      ['D_n', 'The number of derangements of $n$ elements — permutations $\\pi$ with zero fixed points ($\\pi(i) \\neq i$ for all $i$)', 'inclusion-exclusion'],
      ['n!', 'Total number of unrestricted permutations of $\\{1, 2, \\dots, n\\}$', 'permutations'],
      ['\\sum_{k=0}^{n} \\frac{(-1)^k}{k!}', 'Alternating Inclusion–Exclusion sum subtracting single fixed points, adding back pairs, subtracting triples, etc.', 'inclusion-exclusion'],
      ['\\frac{n!}{e}', 'Because $\\sum_{k=0}^\\infty (-1)^k / k! = e^{-1}$, the fraction of permutations with no fixed points rapidly converges to $1/e \\approx 36.79\\%$', 'inclusion-exclusion'],
    ],
    whole: 'Alternatingly including and excluding permutations that fix $k$ elements reveals that roughly $1/e \\approx 36.8\\%$ of all permutations fix nothing.',
  },
  {
    id: 'bezout-euler',
    name: 'Bézout’s Identity & Euler’s Totient Theorem',
    source: 'Number Theory & Cryptography (Part [[#part:number-theory]]) — the engine of modular inverses and RSA',
    tex: 'a x + m y = \\gcd(a, m) = 1 \\;\\implies\\; a^{\\varphi(m)} \\equiv 1 \\pmod{m}',
    parts: [
      ['a x + m y = \\gcd(a, m)', 'Bézout’s Identity: the Extended Euclidean Algorithm finds integers $x, y$ whose linear combination equals $\\gcd(a, m)$', 'gcd-bezout'],
      ['\\gcd(a, m) = 1', 'Coprimality condition: $a$ and $m$ share no prime factors, making $x \\bmod m$ the multiplicative inverse $a^{-1} \\bmod m$', 'modular-arithmetic'],
      ['\\varphi(m)', 'Euler’s totient function: counts how many residues in $\\{1, \\dots, m\\}$ are coprime to $m$', 'crt-fermat'],
      ['a^{\\varphi(m)} \\equiv 1 \\pmod{m}', 'Euler’s Theorem: raising any coprime residue $a$ to the $\\varphi(m)$-th power wraps back to $1 \\pmod m$', 'rsa-cryptography'],
    ],
    whole: 'Whenever $a$ is coprime to $m$, Extended Euclid finds its modular inverse $x \\equiv a^{-1} \\pmod m$, and multiplying all $\\varphi(m)$ units proves $a^{\\varphi(m)} \\equiv 1 \\pmod m$.',
  },
  {
    id: 'master-theorem',
    name: 'The Master Theorem for Divide-and-Conquer Recurrences',
    source: 'Recurrences & Asymptotics (Part [[#part:recurrences-asymptotics]]) — work across a recursion tree of depth $\\log_b n$',
    tex: 'T(n) = a\\,T(n/b) + \\Theta(n^d) \\;\\implies\\; \\text{compare } d \\text{ vs. } \\log_b a',
    parts: [
      ['a\\,T(n/b)', 'Each call spawns $a \\ge 1$ recursive subproblems, each on an input shrunk by factor $b > 1$', 'divide-conquer-master'],
      ['\\Theta(n^d)', 'The non-recursive cost of splitting the input and combining subproblem results at the current node', 'asymptotics'],
      ['\\log_b a', 'The critical watershed exponent: a tree of height $\\log_b n$ has $a^{\\log_b n} = n^{\\log_b a}$ leaves', 'divide-conquer-master'],
      ['\\text{compare } d \\text{ vs. } \\log_b a', 'If $d < \\log_b a$, leaves dominate ($\\Theta(n^{\\log_b a})$); if $d = \\log_b a$, all levels tie ($\\Theta(n^d \\log n)$); if $d > \\log_b a$, the root dominates ($\\Theta(n^d)$)', 'divide-conquer-master'],
    ],
    whole: 'A divide-and-conquer algorithm’s runtime is governed by a tug-of-war between subproblem proliferation $n^{\\log_b a}$ at the leaves and work $n^d$ at the root.',
  },
  {
    id: 'handshaking-planar',
    name: 'Handshaking Lemma & Euler’s Planar Formula',
    source: 'Graph Theory (Part [[#part:graph-theory]]) — topological invariants of networks and planar drawings',
    tex: '\\sum_{v \\in V} \\deg(v) = 2|E| \\quad\\text{and}\\quad |V| - |E| + |F| = 2',
    parts: [
      ['\\sum_{v \\in V} \\deg(v) = 2|E|', 'Handshaking Lemma: every edge has $2$ endpoints, so summing vertex degrees counts every edge twice', 'graphs-handshaking'],
      ['|V| - |E| + |F| = 2', 'Euler’s Planar Formula: for any connected plane drawing, vertices minus edges plus faces is always $2$', 'planar-coloring'],
      ['|E| \\le 3|V| - 6', 'Consequence of $3|F| \\le 2|E|$: any simple planar graph on $|V| \\ge 3$ vertices is sparse, with at most $3|V| - 6$ edges', 'planar-coloring'],
    ],
    whole: 'Double counting incidences between vertices, edges, and faces locks every graph’s degree sum to $2|E|$ and every planar graph’s alternating sum $|V| - |E| + |F|$ to $2$.',
  },
  {
    id: 'bayes-linearity',
    name: 'Bayes’ Theorem & Linearity of Expectation',
    source: 'Discrete Probability (Part [[#part:probability-automata]]) — updating beliefs from evidence and averaging sums of indicators',
    tex: 'P(A \\mid B) = \\frac{P(B \\mid A)P(A)}{P(B)} \\quad\\text{and}\\quad E\\!\\left[\\sum_{i=1}^n X_i\\right] = \\sum_{i=1}^n E[X_i]',
    parts: [
      ['P(A \\mid B)', 'Posterior probability of hypothesis $A$ after observing evidence $B$', 'discrete-probability'],
      ['\\frac{P(B \\mid A)P(A)}{P(B)}', 'Likelihood $P(B \\mid A)$ times prior $P(A)$, normalized by total probability $P(B) = P(B \\mid A)P(A) + P(B \\mid \\overline{A})P(\\overline{A})$', 'discrete-probability'],
      ['E\\!\\left[\\sum_{i=1}^n X_i\\right] = \\sum_{i=1}^n E[X_i]', 'Linearity of Expectation: the expected value of a sum ALWAYS equals the sum of the expected values, even when $X_i$ are dependent!', 'expectation-linearity'],
    ],
    whole: 'Bayes’ rule reweights prior beliefs by likelihood over total evidence, while Linearity of Expectation lets us average complex random counts by summing simple $0/1$ indicator probabilities.',
  },
]
