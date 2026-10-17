// Interactive multi-step Proof & Derivation Builders — one per lesson.
// Each entry in PROOFS is attached to its lesson by `lessons/index.js` right before the closing `note`.

export const PROOFS = {
  // ── Part 1: Propositional & Predicate Logic ─────────────────────────────
  propositions: {
    title: 'Prove absorption: $p \\lor (p \\land q) \\equiv p$',
    claim: 'For any propositions $p$ and $q$, the compound formula $p \\lor (p \\land q)$ is logically equivalent to $p$.',
    strategy: 'Algebraic equivalence chain using Identity and Distributivity.',
    givens: 'Let $p, q$ be propositions with truth values in $\\{\\text{T}, \\text{F}\\}$.',
    steps: [
      {
        prompt: 'Rewrite the first $p$ in $p \\lor (p \\land q)$ so both terms share a common conjunctive structure:',
        options: [
          { text: '$(p \\land \\text{T}) \\lor (p \\land q)$ by the Identity Law ($p \\land \\text{T} \\equiv p$).', why: 'Conjoining $\\text{T}$ preserves the truth value of $p$ while giving both disjuncts the form $p \\land (\\dots)$.' },
          { text: '$(p \\lor \\text{F}) \\land (p \\land q)$ by the Identity Law.', why: 'Changing the outer $\\lor$ to $\\land$ alters the formula rather than rewriting $p$.' },
          { text: '$(p \\land \\text{F}) \\lor (p \\land q)$ by Domination.', why: '$p \\land \\text{F} \\equiv \\text{F}$, which loses the truth value of $p$ when $p = \\text{T}$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Factor $p \\land$ out of $(p \\land \\text{T}) \\lor (p \\land q)$ using Distributivity:',
        options: [
          { text: '$p \\lor (\\text{T} \\land q)$', why: 'That swaps $\\land$ and $\\lor$; the shared operator inside both parentheses is $\\land$.' },
          { text: '$p \\land (\\text{T} \\lor q)$', why: 'By Distributivity of $\\land$ over $\\lor$, $(p \\land A) \\lor (p \\land B) \\equiv p \\land (A \\lor B)$.' },
          { text: '$(p \\land p) \\lor (\\text{T} \\land q)$', why: 'Boolean distributivity factors out the common $p$, rather than pairing first and second components.' },
        ],
        answer: 1,
      },
      {
        prompt: 'Simplify $p \\land (\\text{T} \\lor q)$ to conclude the equivalence:',
        options: [
          { text: 'Since $\\text{T} \\lor q \\equiv \\text{T}$ (Domination) and $p \\land \\text{T} \\equiv p$ (Identity), the expression equals $p$.', why: 'Domination collapses $\\text{T} \\lor q$ to $\\text{T}$, and Identity reduces $p \\land \\text{T}$ to $p$.' },
          { text: 'Since $\\text{T} \\lor q \\equiv q$, the expression reduces to $p \\land q$.', why: '$\\text{T} \\lor q$ is always $\\text{T}$ (Domination), not $q$.' },
          { text: 'Since $p \\land \\text{T} \\equiv \\text{T}$, the expression is a tautology.', why: '$p \\land \\text{T} \\equiv p$, which depends on $p$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Therefore $p \\lor (p \\land q) \\equiv p$ for all truth assignments.',
  },

  implication: {
    title: 'Prove Contraposition: $(p \\to q) \\equiv (\\neg q \\to \\neg p)$',
    claim: 'An implication $p \\to q$ has the exact same truth table as its contrapositive $\\neg q \\to \\neg p$.',
    strategy: 'Expand via the Material Implication law, commute, and apply Double Negation.',
    givens: 'Recall the Material Implication equivalence $A \\to B \\equiv \\neg A \\lor B$.',
    steps: [
      {
        prompt: 'Apply the Material Implication identity to the contrapositive $\\neg q \\to \\neg p$:',
        options: [
          { text: '$\\neg(\\neg q) \\lor \\neg p$', why: 'Replacing $A = \\neg q$ and $B = \\neg p$ in $\\neg A \\lor B$ yields $\\neg(\\neg q) \\lor \\neg p$.' },
          { text: '$\\neg q \\land p$', why: '$\\neg q \\land p$ is the negation of $p \\to q$, not its contrapositive.' },
          { text: '$q \\to p$', why: '$q \\to p$ is the converse, which is not logically equivalent to $p \\to q$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Simplify $\\neg(\\neg q) \\lor \\neg p$ using Double Negation and Commutativity of $\\lor$:',
        options: [
          { text: '$\\neg q \\lor p$', why: 'Double negation turns $\\neg(\\neg q)$ into $q$, not $\\neg q$.' },
          { text: '$q \\lor \\neg p \\equiv \\neg p \\lor q$', why: '$\\neg(\\neg q) \\equiv q$ by Double Negation, and $q \\lor \\neg p \\equiv \\neg p \\lor q$ by Commutativity.' },
          { text: '$\\neg(q \\land p)$', why: 'De Morgan would require both terms to remain negated.' },
        ],
        answer: 1,
      },
      {
        prompt: 'Fold $\\neg p \\lor q$ back into an implication:',
        options: [
          { text: 'By Material Implication ($\\neg p \\lor q \\equiv p \\to q$), we obtain $p \\to q$.', why: 'This completes the bidirectional chain $(\\neg q \\to \\neg p) \\equiv (p \\to q)$.' },
          { text: 'By De Morgan, $\\neg p \\lor q \\equiv \\neg(p \\to q)$.', why: '$\\neg p \\lor q$ is $p \\to q$ itself, not its negation.' },
          { text: 'By Modus Ponens, $p$ must be true.', why: 'Equivalence transformations hold regardless of whether $p$ is true or false.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Hence $(p \\to q) \\equiv (\\neg q \\to \\neg p)$.',
  },

  equivalences: {
    title: 'Prove Exportation: $((p \\land q) \\to r) \\equiv (p \\to (q \\to r))$',
    claim: 'Requiring both $p$ and $q$ to guarantee $r$ is equivalent to: if $p$ holds, then $q$ guarantees $r$.',
    strategy: 'Unfold implications into disjunctions and apply De Morgan and Associativity.',
    givens: 'Use $A \\to B \\equiv \\neg A \\lor B$ and De Morgan’s law $\\neg(p \\land q) \\equiv \\neg p \\lor \\neg q$.',
    steps: [
      {
        prompt: 'Eliminate $\\to$ on the left-hand side $(p \\land q) \\to r$:',
        options: [
          { text: '$\\neg(p \\land q) \\lor r$', why: 'Material Implication rewrites $A \\to r$ with $A = (p \\land q)$ as $\\neg(p \\land q) \\lor r$.' },
          { text: '$(p \\land q) \\lor \\neg r$', why: 'Material Implication negates the hypothesis $(p \\land q)$, not the conclusion $r$.' },
          { text: '$\\neg p \\land \\neg q \\lor r$', why: 'Negating a conjunction flips $\\land$ to $\\lor$ by De Morgan.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Apply De Morgan’s law and Associativity of $\\lor$ to $\\neg(p \\land q) \\lor r$:',
        options: [
          { text: '$(\\neg p \\lor \\neg q) \\lor r \\equiv \\neg p \\lor (\\neg q \\lor r)$', why: 'De Morgan gives $(\\neg p \\lor \\neg q) \\lor r$, and Associativity regroups the disjunction as $\\neg p \\lor (\\neg q \\lor r)$.' },
          { text: '$(\\neg p \\land \\neg q) \\lor r$', why: 'Negating $p \\land q$ produces $\\neg p \\lor \\neg q$, not $\\neg p \\land \\neg q$.' },
          { text: '$\\neg p \\land (\\neg q \\lor r)$', why: 'Both outer connectives are $\\lor$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Fold $\\neg p \\lor (\\neg q \\lor r)$ back using Material Implication twice:',
        options: [
          { text: 'First $\\neg q \\lor r \\equiv (q \\to r)$, then $\\neg p \\lor (q \\to r) \\equiv p \\to (q \\to r)$.', why: 'Applying Material Implication inside the parentheses and then outside yields $p \\to (q \\to r)$.' },
          { text: 'It folds into $(p \\to q) \\to r$.', why: 'Implication is not associative: $\\neg p \\lor (\\neg q \\lor r)$ groups $q$ with $r$, not $p$ with $q$.' },
          { text: 'It folds into $(p \\lor q) \\to r$.', why: '$(p \\lor q) \\to r \\equiv (\\neg p \\land \\neg q) \\lor r$, which is stronger.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Thus $((p \\land q) \\to r) \\equiv (p \\to (q \\to r))$.',
  },

  quantifiers: {
    title: 'Negate a universal conditional: $\\neg \\forall x\\,(P(x) \\to Q(x))$',
    claim: '$\\neg \\forall x\\,(P(x) \\to Q(x)) \\equiv \\exists x\\,(P(x) \\land \\neg Q(x))$.',
    strategy: 'Push $\\neg$ across $\\forall$ by Quantifier De Morgan, then negate the conditional.',
    givens: 'Domain $D$ is non-empty; $P(x)$ and $Q(x)$ are predicates on $D$.',
    steps: [
      {
        prompt: 'Move the outer negation $\\neg$ inside the universal quantifier $\\forall x$:',
        options: [
          { text: '$\\exists x\\,\\neg(P(x) \\to Q(x))$', why: 'Denying that a statement holds for all $x$ is equivalent to asserting there exists an $x$ for which it fails.' },
          { text: '$\\forall x\\,\\neg(P(x) \\to Q(x))$', why: 'Keeping $\\forall x$ would assert that the implication fails for every $x$, which is much stronger than denying $\\forall x$.' },
          { text: '$\\exists x\\,(\\neg P(x) \\to \\neg Q(x))$', why: 'Negating an implication does not negate its parts inside $\\to$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Replace $P(x) \\to Q(x)$ inside $\\neg(P(x) \\to Q(x))$ using Material Implication:',
        options: [
          { text: '$\\exists x\\,\\neg(\\neg P(x) \\lor Q(x))$', why: 'Since $P(x) \\to Q(x) \\equiv \\neg P(x) \\lor Q(x)$, its negation is $\\neg(\\neg P(x) \\lor Q(x))$.' },
          { text: '$\\exists x\\,\\neg(P(x) \\land Q(x))$', why: '$P(x) \\to Q(x)$ is a disjunction $\\neg P(x) \\lor Q(x)$, not a conjunction.' },
          { text: '$\\exists x\\,(P(x) \\lor \\neg Q(x))$', why: 'An implication fails only when both $P(x)$ is true and $Q(x)$ is false ($\\land$, not $\\lor$).' },
        ],
        answer: 0,
      },
      {
        prompt: 'Apply De Morgan and Double Negation to $\\neg(\\neg P(x) \\lor Q(x))$:',
        options: [
          { text: '$\\exists x\\,(P(x) \\land \\neg Q(x))$', why: '$\\neg(\\neg P(x) \\lor Q(x)) \\equiv \\neg(\\neg P(x)) \\land \\neg Q(x) \\equiv P(x) \\land \\neg Q(x)$: a single witness where $P(x)$ holds and $Q(x)$ fails.' },
          { text: '$\\exists x\\,(\\neg P(x) \\land Q(x))$', why: 'Double negation eliminates $\\neg(\\neg P(x))$ to give $P(x)$.' },
          { text: '$\\forall x\\,(P(x) \\land \\neg Q(x))$', why: 'The quantifier already flipped to $\\exists x$ in Step 1.' },
        ],
        answer: 0,
      },
    ],
    qed: 'A single counterexample $x$ with $P(x)$ true and $Q(x)$ false refutes $\\forall x\\,(P(x) \\to Q(x))$.',
  },

  inference: {
    title: 'Derive $s$ from premises using formal rules of inference',
    claim: 'From (1) $\\neg p \\lor q$, (2) $\\neg q \\lor r$, (3) $r \\to s$, and (4) $p$, deduce $s$.',
    strategy: 'Chain Disjunctive Syllogism and Modus Ponens step by step.',
    givens: 'Premises: (1) $\\neg p \\lor q$, (2) $\\neg q \\lor r$, (3) $r \\to s$, (4) $p$.',
    steps: [
      {
        prompt: 'Combine premise (1) $\\neg p \\lor q$ with premise (4) $p$:',
        options: [
          { text: 'Since $p \\equiv \\neg(\\neg p)$, Disjunctive Syllogism on $\\neg p \\lor q$ and $p$ yields $q$.', why: 'In $\\neg p \\lor q$, knowing $p$ is true rules out the left disjunct $\\neg p$, forcing $q$.' },
          { text: 'Conclude $\\neg q$ by Affirming the Consequent.', why: 'Affirming the Consequent is a fallacy, and $p$ rules out $\\neg p$, not $q$.' },
          { text: 'Conclude $r$ directly from (1) and (4).', why: 'Premise (1) does not mention $r$ yet.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Combine the newly derived $q$ with premise (2) $\\neg q \\lor r$:',
        options: [
          { text: 'By Disjunctive Syllogism (or Resolution) on $\\neg q \\lor r$ and $q$, conclude $r$.', why: 'Since $q$ holds, $\\neg q$ is false, so the disjunction $\\neg q \\lor r$ forces $r$ to hold.' },
          { text: 'Conclude $\\neg r$ by Modus Tollens.', why: 'Modus Tollens requires $\\neg r$ to deduce $\\neg q$, whereas here we have $q$ and deduce $r$.' },
          { text: 'Conclude $p \\land q \\land r$ without using premise (2).', why: 'Every new atom must be justified by a premise or prior step.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Combine $r$ with premise (3) $r \\to s$:',
        options: [
          { text: 'By Modus Ponens on $r$ and $r \\to s$, conclude $s$.', why: 'From $r$ and $r \\to s$, Modus Ponens immediately yields $s$.' },
          { text: 'By Hypothetical Syllogism, conclude $s \\to r$.', why: 'Modus Ponens detaches the consequent $s$ directly.' },
          { text: 'By Addition, conclude $r \\lor s$.', why: 'We need the stronger conclusion $s$, which Modus Ponens provides.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Every step follows from a truth-preserving inference rule, so $s$ is guaranteed whenever (1)–(4) hold.',
  },

  // ── Part 2: The Craft of Mathematical Proof ─────────────────────────────
  'direct-proof': {
    title: 'Direct proof: if $a \\mid b$ and $b \\mid c$, then $a \\mid (2b + 3c)$',
    claim: 'For all integers $a, b, c$ with $a \\neq 0$, if $a \\mid b$ and $b \\mid c$, then $a \\mid (2b + 3c)$.',
    strategy: 'Unpack the definition of divisibility into integer witnesses and factor out $a$.',
    givens: 'Assume $a \\mid b$ and $b \\mid c$ for integers $a, b, c$ ($a \\neq 0$).',
    steps: [
      {
        prompt: 'Unpack the definitions of $a \\mid b$ and $b \\mid c$ using distinct integer witnesses:',
        options: [
          { text: 'There exist integers $k, m \\in \\mathbb{Z}$ such that $b = ak$ and $c = bm$.', why: 'By definition, $x \\mid y \\iff \\exists t \\in \\mathbb{Z}\\,(y = xt)$, using distinct witness names $k$ and $m$.' },
          { text: 'There exists an integer $k \\in \\mathbb{Z}$ such that $b = ak$ and $c = bk$.', why: 'Reusing the same $k$ illegally assumes $b/a = c/b$.' },
          { text: 'Write $a = bk$ and $b = cm$ for $k, m \\in \\mathbb{Z}$.', why: '$a \\mid b$ means $b$ is a multiple of $a$ ($b = ak$), not the reverse.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Substitute $b = ak$ into $c = bm$ and then into $2b + 3c$:',
        options: [
          { text: '$c = (ak)m = a(km)$, so $2b + 3c = 2(ak) + 3a(km) = a(2k + 3km)$.', why: 'Substituting $b = ak$ expresses both $b$ and $c$ as multiples of $a$, allowing $a$ to be factored out.' },
          { text: '$2b + 3c = (2a + 3b)(k + m)$.', why: 'Expanding $(2a + 3b)(k + m)$ introduces cross terms that do not equal $2b + 3c$.' },
          { text: 'Divide both sides by $a$ to get $(2b+3c)/a = 2k + 3m$.', why: '$c/a = km$, not $m$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Verify closure and state the divisibility conclusion:',
        options: [
          { text: 'Since $k, m \\in \\mathbb{Z}$, $n = 2k + 3km \\in \\mathbb{Z}$ by closure of $\\mathbb{Z}$, so $2b + 3c = an$, meaning $a \\mid (2b + 3c)$.', why: 'Exhibiting the integer witness $n = 2k + 3km$ satisfies the definition of $a \\mid (2b + 3c)$.' },
          { text: 'Since $2k + 3km$ is a real number, $a \\mid (2b + 3c)$.', why: 'Divisibility in $\\mathbb{Z}$ specifically requires an integer witness.' },
          { text: 'Since $a$ is prime, $a$ divides $2b + 3c$.', why: 'The claim holds for any non-zero integer $a$, prime or composite.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Therefore $a \\mid (2b + 3c)$ for all integers $a, b, c$ with $a \\mid b$ and $b \\mid c$.',
  },

  'contrapositive-cases': {
    title: 'Prove by cases that $n^2 + n$ is even for every integer $n$',
    claim: 'For all $n \\in \\mathbb{Z}$, the integer $n^2 + n$ is even.',
    strategy: 'Exhaustive case analysis on the parity of $n$ ($n = 2k$ even vs. $n = 2k + 1$ odd).',
    givens: 'By the Division Algorithm with divisor $2$, every $n \\in \\mathbb{Z}$ is either $2k$ or $2k + 1$ for some $k \\in \\mathbb{Z}$.',
    steps: [
      {
        prompt: 'Analyze Case 1, where $n$ is even ($n = 2k$ for $k \\in \\mathbb{Z}$):',
        options: [
          { text: '$n^2 + n = (2k)^2 + 2k = 4k^2 + 2k = 2(2k^2 + k)$, which is $2m$ with $m = 2k^2 + k \\in \\mathbb{Z}$ (even).', why: 'Factoring out $2$ directly exhibits the integer half $2k^2 + k$.' },
          { text: '$n^2 + n = 2k^2 + 2k = 2(k^2 + k)$.', why: 'Squaring $2k$ gives $4k^2$, not $2k^2$.' },
          { text: 'Check $n = 2$: $2^2 + 2 = 6$, which is even.', why: 'Checking a single even number does not cover all even integers.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Analyze Case 2, where $n$ is odd ($n = 2k + 1$ for $k \\in \\mathbb{Z}$):',
        options: [
          { text: '$n^2 + n = (2k+1)^2 + (2k+1) = 4k^2 + 6k + 2 = 2(2k^2 + 3k + 1)$, which is even.', why: 'Expanding $(4k^2 + 4k + 1) + (2k + 1) = 4k^2 + 6k + 2$ and factoring $2$ gives an integer witness $2k^2 + 3k + 1$.' },
          { text: '$n^2 + n = (2k+1)^2 + (2k+1) = 4k^2 + 1 + 2k + 1 = 4k^2 + 2k + 2$.', why: '$(2k+1)^2 = 4k^2 + 4k + 1$ (don’t drop the middle $4k$ term).' },
          { text: 'Since $n$ is odd, $n^2 + n$ must be odd.', why: 'An odd square plus an odd number is odd + odd = even!' },
        ],
        answer: 0,
      },
      {
        prompt: 'Conclude the proof across all $n \\in \\mathbb{Z}$:',
        options: [
          { text: 'Since every $n \\in \\mathbb{Z}$ falls into Case 1 or Case 2 and $n^2 + n$ is even in both cases, $n^2 + n$ is always even.', why: 'Because the two parity cases partition $\\mathbb{Z}$, the universal claim follows.' },
          { text: 'By mathematical induction, $n^2 + n$ is even.', why: 'This proof used exhaustive parity cases, not induction.' },
          { text: 'By contradiction, no odd $n^2 + n$ exists.', why: 'We proved both cases directly without assuming a contradiction.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Hence $n^2 + n = n(n+1)$ is even for every integer $n \\in \\mathbb{Z}$.',
  },

  contradiction: {
    title: 'Proof by contradiction: $\\sqrt{2}$ is irrational',
    claim: 'There do not exist integers $a, b \\in \\mathbb{Z}$ with $b \\neq 0$ such that $(a/b)^2 = 2$.',
    strategy: 'Assume $\\sqrt{2} = a/b$ in lowest terms ($\\gcd(a,b) = 1$) and show $2$ divides both $a$ and $b$.',
    givens: 'Recall that if $p$ is prime and $p \\mid x^2$, then $p \\mid x$.',
    steps: [
      {
        prompt: 'State the negation of the claim in canonical lowest-terms form:',
        options: [
          { text: 'Suppose for contradiction that $\\sqrt{2} = a/b$ with $a, b \\in \\mathbb{Z}^+$ and $\\gcd(a, b) = 1$, so $a^2 = 2b^2$.', why: 'Every rational number can be reduced to lowest terms where $a$ and $b$ share no common factor $> 1$.' },
          { text: 'Suppose $\\sqrt{2} = a/b$ where $a$ and $b$ are both even.', why: 'Assuming $a$ and $b$ are already even begs the question; we must start with $\\gcd(a,b) = 1$.' },
          { text: 'Suppose $\\sqrt{2} \\approx 1.414$.', why: 'A finite decimal approximation cannot prove irrationality.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Deduce the parity of $a$ from $a^2 = 2b^2$ and substitute back:',
        options: [
          { text: 'Since $a^2 = 2b^2$ is even, $a$ is even, so $a = 2k$ for some $k \\in \\mathbb{Z}$; substituting gives $(2k)^2 = 4k^2 = 2b^2$, so $b^2 = 2k^2$.', why: 'An odd $a$ would have an odd square; writing $a = 2k$ and dividing $4k^2 = 2b^2$ by $2$ transfers the factor of $2$ to $b^2$.' },
          { text: 'Since $a^2 = 2b^2$, $b$ must be even immediately.', why: '$a^2 = 2b^2$ tells us $a^2$ is a multiple of $2$, which constrains $a$ first, not $b$.' },
          { text: 'Take the square root to get $a = 2b$.', why: '$\\sqrt{2b^2} = \\sqrt{2}b$, not $2b$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Identify the exact contradiction from $b^2 = 2k^2$:',
        options: [
          { text: 'Since $b^2 = 2k^2$ is even, $b$ is also even; thus $2 \\mid a$ and $2 \\mid b$, contradicting $\\gcd(a, b) = 1$.', why: 'Having $2$ as a common divisor of $a$ and $b$ directly contradicts that $a/b$ was in lowest terms.' },
          { text: 'Since $b^2 = 2k^2$, $b = 0$, contradicting $b \\neq 0$.', why: '$b^2 = 2k^2$ implies $2 \\mid b$, not $b = 0$.' },
          { text: 'Therefore $k$ is not an integer.', why: '$k = a/2$ is an integer because $a$ is even; the contradiction is $\\gcd(a,b) \\ge 2$ vs. $\\gcd(a,b) = 1$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'The assumption that $\\sqrt{2} \\in \\mathbb{Q}$ leads to $\\gcd(a,b) \\ge 2 \\land \\gcd(a,b) = 1$ ($\\text{F}$), so $\\sqrt{2}$ is irrational.',
  },

  induction: {
    title: 'Prove by induction: $\\sum_{i=1}^n (2i - 1) = n^2$',
    claim: 'For all integers $n \\ge 1$, the sum of the first $n$ odd positive integers is $1 + 3 + 5 + \\dots + (2n - 1) = n^2$.',
    strategy: 'Weak mathematical induction on $n \\ge 1$.',
    givens: 'Let $P(n)$ be the predicate $\\sum_{i=1}^n (2i - 1) = n^2$.',
    steps: [
      {
        prompt: 'Verify the Base Case $P(1)$:',
        options: [
          { text: 'For $n = 1$, the left side is $2(1) - 1 = 1$ and the right side is $1^2 = 1$, so $P(1)$ holds.', why: 'Checking both sides independently at $n = 1$ establishes the base domino.' },
          { text: 'Assume $P(1)$ holds by the inductive hypothesis.', why: 'The base case must be verified directly, never assumed.' },
          { text: 'For $n = 1$, $1 + 3 = 4 = 2^2$.', why: 'That checks $n = 2$, leaving $n = 1$ unverified.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Assume the Inductive Hypothesis $P(k)$ for an arbitrary $k \\ge 1$, and split the $(k+1)$-sum:',
        options: [
          { text: '$\\sum_{i=1}^{k+1} (2i - 1) = \\left(\\sum_{i=1}^k (2i - 1)\\right) + (2(k+1) - 1) = \\left(\\sum_{i=1}^k (2i - 1)\\right) + (2k + 1)$.', why: 'Peeling off the $(k+1)$-st odd number $2(k+1)-1 = 2k+1$ exposes the prefix sum from $P(k)$.' },
          { text: '$\\sum_{i=1}^{k+1} (2i - 1) = \\left(\\sum_{i=1}^k (2i - 1)\\right) + (2k - 1)$.', why: 'When $i = k + 1$, the term $2i - 1$ evaluates to $2(k+1) - 1 = 2k + 1$, not $2k - 1$.' },
          { text: 'Set $\\sum_{i=1}^{k+1} (2i - 1) = (k+1)^2$ at the start and simplify both sides.', why: 'Starting with the equation $P(k+1)$ you are trying to prove is circular reasoning.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Substitute the Inductive Hypothesis $\\sum_{i=1}^k (2i - 1) = k^2$ and complete the square:',
        options: [
          { text: 'By the IH, the sum equals $k^2 + (2k + 1) = (k + 1)^2$, which is exactly $P(k+1)$.', why: 'Adding the $(k+1)$-st odd border $2k + 1$ to a $k \\times k$ square forms a $(k+1) \\times (k+1)$ square.' },
          { text: 'By the IH, the sum equals $k^2 + 2k = k(k+2)$.', why: 'Don’t forget the $+1$ from $2k + 1$.' },
          { text: 'Since $k^2 + 2k + 1 > 0$, $P(k+1)$ holds.', why: 'We must match the exact target formula $(k+1)^2$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'By the Principle of Mathematical Induction, $\\sum_{i=1}^n (2i - 1) = n^2$ for all $n \\ge 1$.',
  },

  'strong-induction': {
    title: 'Strong induction: every integer $n \\ge 12$ is $4a + 5b$ for $a, b \\in \\mathbb{N}$',
    claim: 'Every postage amount $n \\ge 12$ cents can be formed using $4$-cent and $5$-cent stamps.',
    strategy: 'Strong induction with 4 base cases ($n = 12, 13, 14, 15$) and step $k + 1 = (k - 3) + 4$.',
    givens: 'Since the inductive step steps back by $4$ cents, we need $4$ consecutive base cases.',
    steps: [
      {
        prompt: 'Verify the four consecutive base cases $n = 12, 13, 14, 15$:',
        options: [
          { text: '$12 = 4(3) + 5(0)$, $13 = 4(2) + 5(1)$, $14 = 4(1) + 5(2)$, and $15 = 4(0) + 5(3)$.', why: 'All four consecutive values in $[12, 15]$ are explicitly written as non-negative integer combinations of $4$ and $5$.' },
          { text: 'Verify $n = 12 = 4(3)$ only; the rest follow automatically.', why: 'From $n = 12$ alone, adding a $4$-cent stamp only reaches $16, 20, \\dots$, missing $13, 14, 15$.' },
          { text: '$13 = 4(-3) + 5(5)$.', why: 'Stamp counts $a, b$ must be non-negative integers ($a, b \\in \\mathbb{N}$).' },
        ],
        answer: 0,
      },
      {
        prompt: 'For $k \\ge 15$, assume $P(12), P(13), \\dots, P(k)$ all hold. How do we reach $k + 1 \\ge 16$?',
        options: [
          { text: 'Consider $m = (k + 1) - 4 = k - 3$; since $k \\ge 15$, we have $12 \\le k - 3 \\le k$, so $P(k - 3)$ holds by the Strong IH.', why: 'Because $k \\ge 15$, subtracting $4$ from $k + 1$ lands safely inside the verified range $[12, k]$.' },
          { text: 'Apply $P(k)$ and add $1$ cent.', why: 'There is no $1$-cent stamp; we can only add a $4$-cent or $5$-cent stamp.' },
          { text: 'Apply $P(k - 5)$ for $k = 15$.', why: 'For $k = 15$, $(k+1) - 5 = 11$, which is impossible to form with $4$- and $5$-cent stamps!' },
        ],
        answer: 0,
      },
      {
        prompt: 'Complete $P(k + 1)$ using the representation of $k - 3$:',
        options: [
          { text: 'By $P(k - 3)$, $k - 3 = 4a + 5b$ with $a, b \\in \\mathbb{N}$; adding one $4$-cent stamp gives $k + 1 = 4(a + 1) + 5b$.', why: 'Since $a + 1 \\in \\mathbb{N}$ and $b \\in \\mathbb{N}$, $P(k + 1)$ holds.' },
          { text: 'Multiply $k - 3 = 4a + 5b$ by $4$ to get $k + 1$.', why: 'We add $4$ to $(k - 3)$ to get $k + 1$, not multiply by $4$.' },
          { text: 'Subtract one $4$-cent stamp from $P(k)$.', why: 'Subtracting a stamp could make $a - 1$ negative.' },
        ],
        answer: 0,
      },
    ],
    qed: 'By Strong Induction, every integer $n \\ge 12$ can be written as $4a + 5b$ with $a, b \\in \\mathbb{N}$.',
  },

  // ── Part 3: Sets, Functions & Relations ─────────────────────────────────
  sets: {
    title: 'Prove by Induction/Bijection that $|\\mathcal{P}(A)| = 2^{|A|}$',
    claim: 'For every finite set $A$ with $|A| = n$ elements, its power set $\\mathcal{P}(A)$ has $2^n$ subsets.',
    strategy: 'Induction on $n = |A|$ by splitting subsets of $A \\cup \\{x\\}$ into those without $x$ and those with $x$.',
    givens: 'Let $P(n)$ be the statement: every set of size $n$ has $2^n$ subsets.',
    steps: [
      {
        prompt: 'Verify the base case $n = 0$ ($A = \\emptyset$):',
        options: [
          { text: '$\\mathcal{P}(\\emptyset) = \\{\\emptyset\\}$, which has $|\\mathcal{P}(\\emptyset)| = 1 = 2^0$ element.', why: 'The empty set has exactly one subset — itself — matching $2^0 = 1$.' },
          { text: '$\\mathcal{P}(\\emptyset) = \\emptyset$, which has $0$ elements.', why: '$\\mathcal{P}(\\emptyset) = \\{\\emptyset\\}$ is a set containing one element ($\\emptyset$), so its cardinality is $1 = 2^0$.' },
          { text: 'Start at $n = 1$ because $\\emptyset$ has no subsets.', why: '$\\emptyset \\subseteq \\emptyset$ is always true vacuously.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Assume $P(k)$. Let $|A| = k + 1$, pick one element $x \\in A$, and let $A\' = A \\setminus \\{x\\}$ ($|A\'| = k$). How do the subsets of $A$ partition?',
        options: [
          { text: 'Every subset $S \\subseteq A$ either (1) does not contain $x$ ($S \\subseteq A\'$) or (2) contains $x$ ($S = T \\cup \\{x\\}$ for a unique $T \\subseteq A\'$).', why: 'Presence or absence of $x$ partitions $\\mathcal{P}(A)$ into two disjoint families of equal size $|\\mathcal{P}(A\')|$.' },
          { text: 'Every subset of $A$ is a subset of $A\'$ plus one extra subset $\\{x\\}$.', why: 'Adding $x$ to ANY of the $2^k$ subsets of $A\'$ creates a new subset of $A$, not just $\\{x\\}$ alone.' },
          { text: 'Subsets of $A$ have size at most $k$.', why: '$A$ itself is a subset of size $k + 1$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Count both families using the Inductive Hypothesis $|\\mathcal{P}(A\')| = 2^k$:',
        options: [
          { text: 'There are $2^k$ subsets without $x$ and $2^k$ subsets with $x$, giving $|\\mathcal{P}(A)| = 2^k + 2^k = 2 \\cdot 2^k = 2^{k+1}$.', why: 'Doubling $2^k$ gives $2^{k+1}$, completing the inductive step.' },
          { text: '$|\\mathcal{P}(A)| = 2^k \\cdot 2^k = 2^{2k}$.', why: 'The two families are disjoint alternatives (Sum Rule: $2^k + 2^k$), not independent choices.' },
          { text: '$|\\mathcal{P}(A)| = 2^k + 1$.', why: 'Every one of the $2^k$ subsets of $A\'$ spawns a partner containing $x$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'By mathematical induction, $|\\mathcal{P}(A)| = 2^{|A|}$ for every finite set $A$.',
  },

  'set-operations': {
    title: 'Element-chasing proof of De Morgan’s Set Law: $\\overline{A \\cup B} = \\overline{A} \\cap \\overline{B}$',
    claim: 'For any subsets $A, B \\subseteq U$, the complement of their union equals the intersection of their complements.',
    strategy: 'Show mutual containment ($x \\in \\overline{A \\cup B} \\iff x \\in \\overline{A} \\cap \\overline{B}$) by translating set operations to logic.',
    givens: 'Let $x \\in U$ be an arbitrary element of the universal set.',
    steps: [
      {
        prompt: 'Translate $x \\in \\overline{A \\cup B}$ into a propositional statement about $x \\in A$ and $x \\in B$:',
        options: [
          { text: '$x \\in \\overline{A \\cup B} \\iff \\neg(x \\in A \\cup B) \\iff \\neg(x \\in A \\lor x \\in B)$.', why: 'Membership in a complement is $\\neg$, and membership in a union is $\\lor$.' },
          { text: '$x \\in \\overline{A \\cup B} \\iff \\neg(x \\in A \\land x \\in B)$.', why: 'Union $A \\cup B$ corresponds to disjunction $\\lor$, not conjunction $\\land$.' },
          { text: '$x \\in \\overline{A \\cup B} \\iff x \\in A \\to x \\notin B$.', why: 'In $\\overline{A \\cup B}$, $x$ cannot belong to $A$ at all.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Apply propositional De Morgan’s Law to $\\neg(x \\in A \\lor x \\in B)$:',
        options: [
          { text: '$\\neg(x \\in A) \\land \\neg(x \\in B)$, which means $(x \\in \\overline{A}) \\land (x \\in \\overline{B})$.', why: 'Negating a disjunction $\\neg(p \\lor q)$ yields the conjunction $\\neg p \\land \\neg q$.' },
          { text: '$\\neg(x \\in A) \\lor \\neg(x \\in B)$.', why: 'De Morgan flips $\\lor$ to $\\land$.' },
          { text: '$x \\in A \\land x \\in B$.', why: 'Both membership claims remain negated.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Translate $(x \\in \\overline{A}) \\land (x \\in \\overline{B})$ back into set notation:',
        options: [
          { text: 'By definition of intersection ($\\land \\leftrightarrow \\cap$), $x \\in \\overline{A} \\cap \\overline{B}$; since every step is an $\\iff$, $\\overline{A \\cup B} = \\overline{A} \\cap \\overline{B}$.', why: 'Bidirectional logical equivalence of membership proves set equality by Extensionality.' },
          { text: 'By definition of union, $x \\in \\overline{A} \\cup \\overline{B}$.', why: 'Conjunction $\\land$ translates to intersection $\\cap$, not union $\\cup$.' },
          { text: 'Hence $\\overline{A \\cup B} \\subset \\overline{A} \\cap \\overline{B}$ strictly.', why: 'Every step was an $\\iff$, proving equality in both directions.' },
        ],
        answer: 0,
      },
    ],
    qed: 'By Extensionality, $\\overline{A \\cup B} = \\overline{A} \\cap \\overline{B}$.',
  },

  'functions-bijections': {
    title: 'Prove that the composition of two injections $g \\circ f$ is injective',
    claim: 'If $f : A \\to B$ and $g : B \\to C$ are both injective (one-to-one), then $g \\circ f : A \\to C$ is injective.',
    strategy: 'Assume $(g \\circ f)(x_1) = (g \\circ f)(x_2)$ and peel off $g$ then $f$ using their injectivity.',
    givens: 'Injectivity of $h$ means: $\\forall u, v,\\; h(u) = h(v) \\implies u = v$.',
    steps: [
      {
        prompt: 'Set up the injectivity test for $g \\circ f$ on arbitrary $x_1, x_2 \\in A$:',
        options: [
          { text: 'Assume $(g \\circ f)(x_1) = (g \\circ f)(x_2)$, which by definition of composition means $g(f(x_1)) = g(f(x_2))$.', why: 'To prove a function is injective, we assume equal outputs and must deduce equal inputs $x_1 = x_2$.' },
          { text: 'Assume $x_1 = x_2$ and show $g(f(x_1)) = g(f(x_2))$.', why: '$x_1 = x_2 \\implies h(x_1) = h(x_2)$ just says $h$ is a well-defined function; injectivity goes the other way!' },
          { text: 'Pick $c \\in C$ and find $x \\in A$ with $g(f(x)) = c$.', why: 'That is the test for surjectivity (onto), not injectivity.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Use the injectivity of $g : B \\to C$ on the equation $g(f(x_1)) = g(f(x_2))$:',
        options: [
          { text: 'Since $g$ is injective and receives inputs $f(x_1), f(x_2) \\in B$ with equal outputs, we deduce $f(x_1) = f(x_2)$.', why: 'Injectivity of $g$ cancels the outer function $g$ from $g(f(x_1)) = g(f(x_2))$.' },
          { text: 'Since $g$ is injective, $x_1 = x_2$ immediately without using $f$.', why: '$g$ only sees its inputs $f(x_1)$ and $f(x_2)$ in $B$; we still need $f$ to reach $x_1 = x_2$ in $A$.' },
          { text: 'Divide both sides by $g$.', why: '$g$ is an arbitrary set function, not a number we can divide by.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Use the injectivity of $f : A \\to B$ on $f(x_1) = f(x_2)$:',
        options: [
          { text: 'Since $f$ is injective, $f(x_1) = f(x_2) \\implies x_1 = x_2$; therefore $g \\circ f$ is injective.', why: 'Applying injectivity of $f$ completes the chain $(g \\circ f)(x_1) = (g \\circ f)(x_2) \\implies x_1 = x_2$.' },
          { text: 'Since $f$ is surjective, $x_1 = x_2$.', why: 'It is injectivity (one-to-one), not surjectivity, that guarantees unique preimages.' },
          { text: 'Therefore $f$ and $g$ are bijections.', why: 'Neither $f$ nor $g$ needs to be surjective for $g \\circ f$ to be injective.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Thus $(g \\circ f)(x_1) = (g \\circ f)(x_2) \\implies x_1 = x_2$, so $g \\circ f$ is injective.',
  },

  relations: {
    title: 'Prove that $R$ is transitive $\\iff R^2 \\subseteq R$',
    claim: 'A binary relation $R$ on a set $A$ is transitive if and only if its relational composition $R^2 = R \\circ R$ is a subset of $R$.',
    strategy: 'Unpack the definition of composition $(a, c) \\in R^2$ and compare with the definition of transitivity.',
    givens: 'By definition, $(a, c) \\in R \\circ R \\iff \\exists b \\in A\\,((a, b) \\in R \\land (b, c) \\in R)$.',
    steps: [
      {
        prompt: 'Prove $(\\implies)$: assume $R$ is transitive, and let $(a, c) \\in R^2$ be arbitrary:',
        options: [
          { text: 'By definition of $R^2$, there exists $b \\in A$ with $(a, b) \\in R$ and $(b, c) \\in R$; by transitivity of $R$, $(a, c) \\in R$, so $R^2 \\subseteq R$.', why: 'Every two-hop witness $a \\to b \\to c$ in $R^2$ must have a direct shortcut $a \\to c$ in $R$.' },
          { text: 'Since $(a, c) \\in R^2$, we must have $a = c$ by reflexivity.', why: 'Two-step paths do not have to start and end at the same element.' },
          { text: 'Since $R$ is transitive, $R = R^2$.', why: 'Transitivity gives $R^2 \\subseteq R$, not necessarily $R \\subseteq R^2$ (unless $R$ is also reflexive).' },
        ],
        answer: 0,
      },
      {
        prompt: 'Begin $(\\Longleftarrow)$: assume $R^2 \\subseteq R$, and suppose $(a, b) \\in R$ and $(b, c) \\in R$:',
        options: [
          { text: 'Since $b$ is a middle witness with $(a, b) \\in R$ and $(b, c) \\in R$, the pair $(a, c)$ belongs to $R \\circ R = R^2$ by definition of composition.', why: 'Any two-step chain $a \\to b \\to c$ produces $(a, c) \\in R^2$.' },
          { text: 'Then $(b, a) \\in R$ by symmetry.', why: 'A transitive relation need not be symmetric.' },
          { text: 'Then $(a, c) \\notin R^2$.', why: '$b$ explicitly witnesses $(a, c) \\in R^2$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Use the hypothesis $R^2 \\subseteq R$ to finish $(\\Longleftarrow)$:',
        options: [
          { text: 'Since $(a, c) \\in R^2$ and $R^2 \\subseteq R$, we have $(a, c) \\in R$; hence $R$ is transitive.', why: 'Subset containment $R^2 \\subseteq R$ guarantees that every two-step pair $(a, c) \\in R^2$ is already in $R$.' },
          { text: 'Hence $R$ is an equivalence relation.', why: 'Transitivity alone does not imply reflexivity or symmetry.' },
          { text: 'Hence $R^2$ is empty.', why: '$R^2$ can be non-empty as long as its pairs lie inside $R$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Therefore $R$ is transitive if and only if $R^2 \\subseteq R$.',
  },

  'equivalence-posets': {
    title: 'Prove that equivalence classes $[a]$ and $[b]$ are either equal or disjoint',
    claim: 'For any equivalence relation $\\sim$ on $A$ and any $a, b \\in A$, if $[a] \\cap [b] \\neq \\emptyset$, then $[a] = [b]$.',
    strategy: 'Pick a shared element $c \\in [a] \\cap [b]$ and use symmetry and transitivity of $\\sim$ to show $[a] \\subseteq [b]$ and $[b] \\subseteq [a]$.',
    givens: 'Recall $[x] = \\{y \\in A : y \\sim x\\}$, and $\\sim$ is reflexive, symmetric, and transitive.',
    steps: [
      {
        prompt: 'Assume $[a] \\cap [b] \\neq \\emptyset$ and unpack a witness $c \\in [a] \\cap [b]$:',
        options: [
          { text: 'There exists $c \\in A$ with $c \\in [a]$ and $c \\in [b]$, so $c \\sim a$ and $c \\sim b$; by symmetry ($a \\sim c$) and transitivity, $a \\sim b$.', why: 'A single common member $c$ bridges $a$ and $b$ via $a \\sim c$ and $c \\sim b \\implies a \\sim b$.' },
          { text: 'Since $[a] \\cap [b] \\neq \\emptyset$, we must have $a = b$.', why: 'Distinct elements (like $2$ and $5$ mod $3$) can share the same equivalence class without being literally equal.' },
          { text: 'Only $c$ belongs to both $[a]$ and $[b]$.', why: 'We will show that EVERY element of $[a]$ also belongs to $[b]$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Show $[a] \\subseteq [b]$ by letting $x \\in [a]$ be arbitrary:',
        options: [
          { text: 'Since $x \\in [a]$, $x \\sim a$; combining $x \\sim a$ with $a \\sim b$ by transitivity yields $x \\sim b$, so $x \\in [b]$.', why: 'Transitivity transfers membership from $[a]$ to $[b]$ for every $x \\in [a]$.' },
          { text: 'Since $x \\in [a]$, $x = a$, so $x \\in [b]$.', why: '$[a]$ can contain many elements related to $a$, not just $a$ itself.' },
          { text: 'By reflexivity, $x \\sim x$, so $x \\in [b]$.', why: 'To put $x$ in $[b]$, we need $x \\sim b$, not $x \\sim x$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Conclude $[a] = [b]$:',
        options: [
          { text: 'By symmetry of $a \\sim b$ ($b \\sim a$), the exact same argument gives $[b] \\subseteq [a]$; by mutual containment, $[a] = [b]$.', why: 'Therefore two equivalence classes that overlap in even one element must be identical.' },
          { text: 'Since $|[a]| = |[b]|$, the sets are equal.', why: 'Wait — classes can be infinite! Mutual subset inclusion $[a] \\subseteq [b]$ and $[b] \\subseteq [a]$ works for all sets, finite or infinite.' },
          { text: 'Hence $[a] \\cup [b] = A$.', why: 'There may be other equivalence classes in $A$ besides $[a]$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Thus any two equivalence classes are either completely disjoint ($[a] \\cap [b] = \\emptyset$) or identical ($[a] = [b]$).',
  },

  'cardinality-infinity': {
    title: 'Cantor’s Theorem: no function $f : A \\to \\mathcal{P}(A)$ is surjective',
    claim: 'For every set $A$, there is no surjection from $A$ onto its power set $\\mathcal{P}(A)$; hence $|A| < |\\mathcal{P}(A)|$.',
    strategy: 'Diagonalization: construct the diagonal subset $D = \\{x \\in A : x \\notin f(x)\\}$ and show $D$ is not in the range of $f$.',
    givens: 'Let $f : A \\to \\mathcal{P}(A)$ be any function mapping elements of $A$ to subsets of $A$.',
    steps: [
      {
        prompt: 'Define the diagonal subset $D \\subseteq A$ and suppose for contradiction that $f$ is surjective:',
        options: [
          { text: 'Let $D = \\{x \\in A : x \\notin f(x)\\} \\in \\mathcal{P}(A)$; if $f$ were surjective, there would exist $a \\in A$ with $f(a) = D$.', why: '$D$ collects every element of $A$ that does not belong to its own assigned subset $f(x)$.' },
          { text: 'Let $D = \\{x \\in A : x \\in f(x)\\}$.', why: 'Without the negation $x \\notin f(x)$, testing $a \\in D$ just gives $a \\in D \\iff a \\in D$, which is not a contradiction.' },
          { text: 'Let $D = \\emptyset$, which can never be in the range of $f$.', why: 'A function $f : A \\to \\mathcal{P}(A)$ can easily map some element to $\\emptyset$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Test whether the supposed preimage $a$ belongs to $D$:',
        options: [
          { text: 'By definition of $D$, $a \\in D \\iff a \\notin f(a)$.', why: 'Substituting $x = a$ into the membership condition $x \\in D \\iff x \\notin f(x)$ gives $a \\in D \\iff a \\notin f(a)$.' },
          { text: 'Since $f(a) = D$, $a$ must belong to $D$.', why: 'Whether $a \\in D$ depends on the membership rule of $D$.' },
          { text: '$a$ is not an element of $A$.', why: '$a$ was chosen in the domain $A$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Substitute $f(a) = D$ into $a \\in D \\iff a \\notin f(a)$:',
        options: [
          { text: 'Replacing $f(a)$ with $D$ yields $a \\in D \\iff a \\notin D$, a logical contradiction ($p \\leftrightarrow \\neg p$ is a contradiction).', why: 'No truth value for $a \\in D$ can satisfy $p \\leftrightarrow \\neg p$; hence no such $a \\in A$ exists and $f$ is not surjective.' },
          { text: 'Replacing $f(a)$ with $D$ proves $D = \\emptyset$.', why: 'Even if $D = \\emptyset$, $a \\in \\emptyset \\iff a \\notin \\emptyset$ is still $\\text{F} \\leftrightarrow \\text{T}$, a contradiction.' },
          { text: 'This shows $A$ must be infinite.', why: 'Cantor’s diagonal argument works for EVERY set $A$, finite or infinite!' },
        ],
        answer: 0,
      },
    ],
    qed: 'No surjection $f : A \\to \\mathcal{P}(A)$ can exist, so $|A| < |\\mathcal{P}(A)|$ for every set $A$.',
  },

  // ── Part 4: Combinatorics & Counting ────────────────────────────────────
  'sum-product-rules': {
    title: 'Count the positive divisors of $N = p_1^{a_1} p_2^{a_2} \\cdots p_k^{a_k}$',
    claim: 'The number of positive divisors of $N = \\prod_{i=1}^k p_i^{a_i}$ is $\\tau(N) = (a_1 + 1)(a_2 + 1)\\cdots(a_k + 1)$.',
    strategy: 'Construct a bijection between divisors $d \\mid N$ and exponent tuples $(e_1, \\dots, e_k)$, then apply the Product Rule.',
    givens: 'Let $p_1 < p_2 < \\dots < p_k$ be distinct primes and $a_i \\ge 1$.',
    steps: [
      {
        prompt: 'Characterize every positive divisor $d \\mid N$ by the Fundamental Theorem of Arithmetic:',
        options: [
          { text: '$d$ divides $N$ if and only if $d = p_1^{e_1} p_2^{e_2} \\cdots p_k^{e_k}$ with $0 \\le e_i \\le a_i$ for each $i = 1, \\dots, k$.', why: 'Unique prime factorization means $d \\mid N$ iff $d$ uses the same primes with exponents bounded by $0 \\le e_i \\le a_i$.' },
          { text: '$d$ divides $N$ iff $d = p_1^{e_1} \\cdots p_k^{e_k}$ with $1 \\le e_i \\le a_i$.', why: 'Setting $1 \\le e_i$ forgets $e_i = 0$ (when $p_i$ does not divide $d$).' },
          { text: '$d$ must be one of the primes $p_1, \\dots, p_k$.', why: 'Composite divisors combine powers of multiple primes.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Count the number of valid choices for a single exponent $e_i \\in \\{0, 1, 2, \\dots, a_i\\}$:',
        options: [
          { text: 'There are $a_i + 1$ choices for $e_i$ (because $0$ is included alongside $1, 2, \\dots, a_i$).', why: 'The integer interval $[0, a_i]$ contains $a_i - 0 + 1 = a_i + 1$ integers.' },
          { text: 'There are $a_i$ choices for $e_i$.', why: 'Omitting $e_i = 0$ undercounts by $1$ on every prime factor.' },
          { text: 'There are $2^{a_i}$ choices for $e_i$.', why: 'We pick a single integer exponent in $\\{0, \\dots, a_i\\}$, not a subset of exponents.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Combine the independent choices across $i = 1, \\dots, k$:',
        options: [
          { text: 'By the Product Rule, the number of exponent tuples $(e_1, \\dots, e_k)$ — and hence divisors $d$ — is $\\prod_{i=1}^k (a_i + 1)$.', why: 'Each prime exponent $e_i$ is chosen independently in $a_i + 1$ ways, and unique factorization makes distinct tuples give distinct divisors.' },
          { text: 'By the Sum Rule, there are $\\sum_{i=1}^k (a_i + 1)$ divisors.', why: 'Forming a divisor requires choosing ALL $k$ exponents simultaneously (Product Rule), not just one.' },
          { text: 'Divide by $k!$ because prime order doesn’t matter.', why: 'The primes $p_1 < \\dots < p_k$ are already fixed in distinct slots.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Thus $\\tau(N) = (a_1 + 1)(a_2 + 1)\\cdots(a_k + 1)$.',
  },

  permutations: {
    title: 'Derive the $k$-permutation formula $P(n, k) = \\frac{n!}{(n - k)!}$',
    claim: 'The number of ordered sequences of $k$ distinct elements chosen from an $n$-element set ($0 \\le k \\le n$) is $\\frac{n!}{(n - k)!}$.',
    strategy: 'Count sequential slot choices by the Product Rule, then complete the factorial tail.',
    givens: 'Let $S$ be a set with $|S| = n$ distinct elements.',
    steps: [
      {
        prompt: 'Apply the Product Rule across the $k$ ordered slots $1, 2, \\dots, k$:',
        options: [
          { text: 'Slot $1$ has $n$ choices, slot $2$ has $n - 1$, $\\dots$, and slot $k$ has $n - (k - 1) = n - k + 1$ choices, giving $P(n,k) = n(n-1)\\cdots(n-k+1)$.', why: 'Each chosen element removes $1$ available option for the remaining slots; before filling slot $k$, exactly $k - 1$ elements have been used.' },
          { text: 'Slot $k$ has $n - k$ choices, giving $n(n-1)\\cdots(n-k)$.', why: '$n, n-1, \\dots, n-k$ would be $k + 1$ factors instead of $k$ factors!' },
          { text: 'Each of the $k$ slots has $n$ choices, giving $n^k$.', why: '$n^k$ allows repetition, whereas permutations require distinct elements.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Multiply and divide $n(n-1)\\cdots(n-k+1)$ by the missing factorial tail $(n - k)!$:',
        options: [
          { text: '$P(n,k) = n(n-1)\\cdots(n-k+1) \\cdot \\frac{(n-k)(n-k-1)\\cdots 1}{(n-k)(n-k-1)\\cdots 1}$.', why: 'Multiplying by $(n-k)!/(n-k)! = 1$ completes the product in the numerator all the way down to $1$.' },
          { text: 'Multiply and divide by $k!$.', why: 'Multiplying $n(n-1)\\cdots(n-k+1)$ by $k!$ does not form $n!$ unless $k = n - k$.' },
          { text: 'Subtract $(n-k)!$ from $n!$.', why: 'Canceling trailing factors in a product uses division, not subtraction.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Collapse the numerator into $n!$:',
        options: [
          { text: 'The numerator is $n(n-1)\\cdots 1 = n!$ and the denominator is $(n - k)!$, so $P(n, k) = \\frac{n!}{(n - k)!}$.', why: 'This gives the compact factorial formula for $P(n, k)$.' },
          { text: 'The result simplifies to $\\frac{n!}{k!}$.', why: 'The canceled tail is $(n-k)!$, not $k!$.' },
          { text: 'The result simplifies to $\\binom{n}{k}$.', why: '$\\binom{n}{k} = \\frac{n!}{k!(n-k)!}$ also divides by $k!$ to forget order.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Therefore $P(n, k) = n(n-1)\\cdots(n-k+1) = \\frac{n!}{(n-k)!}$.',
  },

  combinations: {
    title: 'Combinatorial proof of Pascal’s Identity: $\\binom{n}{k} = \\binom{n-1}{k-1} + \\binom{n-1}{k}$',
    claim: 'For all integers $1 \\le k \\le n - 1$, $\\binom{n}{k} = \\binom{n-1}{k-1} + \\binom{n-1}{k}$.',
    strategy: 'Double counting: count $k$-element subsets of $\\{1, 2, \\dots, n\\}$ directly and by conditioning on whether element $n$ is included.',
    givens: 'Let $S = \\{1, 2, \\dots, n\\}$ be a set of $n$ elements, with distinguished element $n \\in S$.',
    steps: [
      {
        prompt: 'Count the total number of $k$-element subsets of $S$ on the left-hand side:',
        options: [
          { text: 'By definition of binomial coefficients, $S$ has exactly $\\binom{n}{k}$ subsets of size $k$.', why: '$\\binom{n}{k}$ is defined as the number of $k$-element subsets of an $n$-element set.' },
          { text: '$S$ has $P(n, k)$ subsets of size $k$.', why: 'Subsets are unordered, so they are counted by $\\binom{n}{k}$, not $P(n, k)$.' },
          { text: '$S$ has $2^n$ subsets of size $k$.', why: '$2^n$ counts subsets of ALL sizes $0 \\le k \\le n$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Partition the $k$-element subsets $T \\subseteq S$ into two disjoint cases based on the special element $n$:',
        options: [
          { text: 'Case 1 ($n \\in T$): choose the remaining $k - 1$ elements from $\\{1, \\dots, n - 1\\}$ in $\\binom{n-1}{k-1}$ ways. Case 2 ($n \\notin T$): choose all $k$ elements from $\\{1, \\dots, n - 1\\}$ in $\\binom{n-1}{k}$ ways.', why: 'Every $k$-subset either includes $n$ (leaving $k-1$ spots from $n-1$ items) or excludes $n$ (requiring all $k$ spots from $n-1$ items).' },
          { text: 'Case 1 has $\\binom{n}{k-1}$ subsets and Case 2 has $\\binom{n}{k}$ subsets.', why: 'Once $n$’s status is decided, we choose only from the remaining $n - 1$ elements!' },
          { text: 'Multiply $\\binom{n-1}{k-1} \\cdot \\binom{n-1}{k}$.', why: 'A single subset $T$ cannot both contain $n$ and exclude $n$; these are disjoint cases.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Equate the two counts by the Sum Rule:',
        options: [
          { text: 'Since Case 1 and Case 2 partition all $k$-subsets of $S$, the Sum Rule gives $\\binom{n}{k} = \\binom{n-1}{k-1} + \\binom{n-1}{k}$.', why: 'Counting the same collection of subsets in two valid ways forces the two expressions to be equal without a single factorial manipulation.' },
          { text: 'Take the logarithm of both sides to get Pascal’s Identity.', why: 'The Sum Rule directly adds the sizes of the two disjoint families.' },
          { text: 'By Inclusion-Exclusion, subtract the overlap $\\binom{n-2}{k-1}$.', why: 'The cases $n \\in T$ and $n \\notin T$ are mutually exclusive (overlap is $0$).' },
        ],
        answer: 0,
      },
    ],
    qed: 'By double counting, $\\binom{n}{k} = \\binom{n-1}{k-1} + \\binom{n-1}{k}$.',
  },

  'binomial-stars-bars': {
    title: 'Prove Stars and Bars: $x_1 + x_2 + \\dots + x_k = n$ has $\\binom{n + k - 1}{k - 1}$ non-negative integer solutions',
    claim: 'The number of tuples $(x_1, \\dots, x_k) \\in \\mathbb{N}^k$ satisfying $x_1 + \\dots + x_k = n$ is $\\binom{n + k - 1}{k - 1}$.',
    strategy: 'Bijection between solutions $(x_1, \\dots, x_k)$ and binary strings of $n$ stars ($\\star$) and $k - 1$ bars ($\\mid$).',
    givens: '$n \\ge 0$ identical items (stars) distributed into $k \\ge 1$ labeled bins.',
    steps: [
      {
        prompt: 'Represent any solution $(x_1, x_2, \\dots, x_k)$ with $\\sum x_i = n$ as a string of stars and bars:',
        options: [
          { text: 'Write $x_1$ stars, then a bar $\\mid$, then $x_2$ stars, $\\dots$, using $k - 1$ bars to separate the $k$ bins, for a total of $n + k - 1$ symbols.', why: 'Just as $k - 1$ fenceposts divide a line into $k$ segments, $k - 1$ bars divide $n$ stars into $k$ bin counts $(x_1, \\dots, x_k)$.' },
          { text: 'Use $k$ bars and $n$ stars, for $n + k$ symbols.', why: '$k$ bars create $k + 1$ compartments, which is one bin too many.' },
          { text: 'Require at least one star between any two bars.', why: 'That is the restricted case $x_i \\ge 1$; for $x_i \\ge 0$, adjacent bars $\\mid\\mid$ represent an empty bin ($x_i = 0$).' },
        ],
        answer: 0,
      },
      {
        prompt: 'Verify that this encoding is a bijection:',
        options: [
          { text: 'Every tuple $(x_1, \\dots, x_k)$ with $\\sum x_i = n$ produces a unique string of $n$ stars and $k - 1$ bars, and every such string decodes to a unique tuple by counting stars between bars.', why: 'Because the map is both injective and surjective, counting the strings counts the solutions.' },
          { text: 'Different permutations of the $n$ stars give different solutions.', why: 'The $n$ stars are identical ($\\star$), so swapping two stars does not change the string or the bin counts.' },
          { text: 'Swapping a star and a bar leaves the tuple unchanged.', why: 'Moving a bar shifts $1$ unit from one bin to an adjacent bin, changing the tuple.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Count the strings of length $n + k - 1$ containing $k - 1$ bars and $n$ stars:',
        options: [
          { text: 'Choose which $k - 1$ of the $n + k - 1$ positions hold bars (or which $n$ hold stars): $\\binom{n + k - 1}{k - 1} = \\binom{n + k - 1}{n}$.', why: 'Once the $k - 1$ bar positions are chosen, the remaining $n$ positions must be stars.' },
          { text: 'There are $(n + k - 1)!$ such strings.', why: 'Stars are indistinguishable from each other, and bars are indistinguishable from each other.' },
          { text: 'There are $\\binom{n}{k - 1}$ such strings.', why: 'The total number of symbol positions is $n + k - 1$, not $n$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Hence there are $\\binom{n + k - 1}{k - 1} = \\binom{n + k - 1}{n}$ solutions in $\\mathbb{N}^k$.',
  },

  'inclusion-exclusion': {
    title: 'Prove Two-Set Inclusion-Exclusion: $|A \\cup B| = |A| + |B| - |A \\cap B|$',
    claim: 'For any finite sets $A$ and $B$, $|A \\cup B| = |A| + |B| - |A \\cap B|$.',
    strategy: 'Partition $A \\cup B$, $A$, and $B$ into disjoint Venn regions and apply the Sum Rule.',
    givens: 'Recall that the Sum Rule applies whenever sets are pairwise disjoint.',
    steps: [
      {
        prompt: 'Decompose $A \\cup B$ into three pairwise disjoint regions:',
        options: [
          { text: '$A \\cup B = (A \\setminus B) \\sqcup (A \\cap B) \\sqcup (B \\setminus A)$, so $|A \\cup B| = |A \\setminus B| + |A \\cap B| + |B \\setminus A|$.', why: 'Every element of $A \\cup B$ is in $A$ only, both $A$ and $B$, or $B$ only — three mutually exclusive regions.' },
          { text: '$A \\cup B = A \\sqcup B$, so $|A \\cup B| = |A| + |B|$.', why: '$A$ and $B$ are not disjoint unless $A \\cap B = \\emptyset$.' },
          { text: '$|A \\cup B| = |A| \\cdot |B|$.', why: '$|A| \\cdot |B|$ is the size of the Cartesian product $A \\times B$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Express $|A|$ and $|B|$ in terms of the same disjoint regions:',
        options: [
          { text: '$A = (A \\setminus B) \\sqcup (A \\cap B) \\implies |A \\setminus B| = |A| - |A \\cap B|$, and similarly $|B \\setminus A| = |B| - |A \\cap B|$.', why: 'Splitting $A$ into its exclusive part $A \\setminus B$ and shared part $A \\cap B$ lets us solve for $|A \\setminus B|$ and $|B \\setminus A|$.' },
          { text: '$|A \\setminus B| = |A| - |B|$.', why: 'Elements of $B$ outside $A$ cannot be subtracted from $A$; only the overlap $A \\cap B$ is removed.' },
          { text: '$|A \\cap B| = |A| + |B|$.', why: 'The intersection is a subset of both $A$ and $B$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Substitute $|A \\setminus B|$ and $|B \\setminus A|$ into the sum for $|A \\cup B|$:',
        options: [
          { text: '$|A \\cup B| = (|A| - |A \\cap B|) + |A \\cap B| + (|B| - |A \\cap B|) = |A| + |B| - |A \\cap B|$.', why: 'Two copies of $-|A \\cap B|$ plus one copy of $+|A \\cap B|$ simplify to $-|A \\cap B|$.' },
          { text: '$|A \\cup B| = |A| + |B| - 2|A \\cap B|$.', why: 'Subtracting $2|A \\cap B|$ counts $|A \\triangle B|$ (the symmetric difference), leaving the overlap uncounted!' },
          { text: '$|A \\cup B| = |A| + |B| + |A \\cap B|$.', why: 'Adding $|A \\cap B|$ would triple-count the overlap.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Therefore $|A \\cup B| = |A| + |B| - |A \\cap B|$.',
  },

  // ── Part 5: Number Theory & Cryptography ────────────────────────────────
  'divisibility-primes': {
    title: 'Prove the Division Algorithm Uniqueness: $a = bq + r$ with $0 \\le r < b$',
    claim: 'If $a = bq_1 + r_1 = bq_2 + r_2$ with $0 \\le r_1, r_2 < b$, then $q_1 = q_2$ and $r_1 = r_2$.',
    strategy: 'Subtract the two representations to get $b(q_1 - q_2) = r_2 - r_1$ and bound $|r_2 - r_1| < b$.',
    givens: 'Let $a, b \\in \\mathbb{Z}$ with $b > 0$, and suppose $bq_1 + r_1 = bq_2 + r_2$ with $0 \\le r_1, r_2 < b$.',
    steps: [
      {
        prompt: 'Rearrange $bq_1 + r_1 = bq_2 + r_2$ to isolate multiples of $b$ on one side and remainders on the other:',
        options: [
          { text: '$b(q_1 - q_2) = r_2 - r_1$, which shows that $b$ divides $|r_2 - r_1|$.', why: 'Since $q_1 - q_2 \\in \\mathbb{Z}$, the difference of the remainders $r_2 - r_1$ must be an integer multiple of $b$.' },
          { text: '$b(r_1 - r_2) = q_2 - q_1$.', why: '$b$ multiplies the quotients $q_1, q_2$, not the remainders $r_1, r_2$.' },
          { text: '$q_1 / q_2 = r_2 / r_1$.', why: 'Subtracting terms does not turn them into a ratio.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Bound the distance $|r_2 - r_1|$ using $0 \\le r_1, r_2 < b$:',
        options: [
          { text: 'Since both $r_1$ and $r_2$ lie in $[0, b - 1]$, their absolute difference satisfies $0 \\le |r_2 - r_1| < b$.', why: 'Two numbers in $[0, b)$ are strictly less than $b$ units apart.' },
          { text: '$|r_2 - r_1| \\ge b$.', why: 'Both remainders are strictly less than $b$ and non-negative, so their difference cannot reach $b$.' },
          { text: '$r_1 + r_2 < b$.', why: 'Their sum can exceed $b$, but their difference $|r_2 - r_1|$ is strictly less than $b$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Combine $b \\mid |r_2 - r_1|$ with $0 \\le |r_2 - r_1| < b$:',
        options: [
          { text: 'The only non-negative multiple of $b$ strictly less than $b$ is $0$; thus $|r_2 - r_1| = 0 \\implies r_1 = r_2$, and $b(q_1 - q_2) = 0$ with $b > 0$ gives $q_1 = q_2$.', why: 'Zero is the unique multiple of $b$ in $[0, b)$, forcing both remainders and quotients to match.' },
          { text: 'Therefore $|r_2 - r_1| = b$, so $q_1 - q_2 = 1$.', why: '$|r_2 - r_1| < b$ strictly rules out $|r_2 - r_1| = b$.' },
          { text: 'Therefore $b = 1$.', why: '$b$ can be any positive integer.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Hence the quotient $q$ and remainder $r \\in [0, b)$ in the Division Algorithm are unique.',
  },

  'gcd-bezout': {
    title: 'Prove Euclid’s GCD Invariant: $\\gcd(a, b) = \\gcd(b, a \\bmod b)$',
    claim: 'For any integers $a, b$ with $b > 0$ and $a = bq + r$, the sets of common divisors of $(a, b)$ and $(b, r)$ are identical.',
    strategy: 'Show that $d \\mid a \\land d \\mid b \\iff d \\mid b \\land d \\mid r$ using linear combinations.',
    givens: 'Let $r = a \\bmod b = a - bq$.',
    steps: [
      {
        prompt: 'Prove $(\\implies)$: suppose $d \\mid a$ and $d \\mid b$. Why must $d \\mid r$?',
        options: [
          { text: 'Since $r = a - bq$ is an integer linear combination of $a$ and $b$, any common divisor $d$ of $a$ and $b$ also divides $a - bq = r$.', why: 'If $a = dk$ and $b = dm$, then $r = d(k - mq)$, so $d \\mid r$.' },
          { text: 'Because $r < b$, $d$ automatically divides $r$.', why: 'Being smaller than $b$ does not make a number divisible by $d$; $r = a - bq$ is what guarantees $d \\mid r$.' },
          { text: 'Because $d \\mid q$.', why: '$d$ does not need to divide the quotient $q$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Prove $(\\Longleftarrow)$: suppose $d \\mid b$ and $d \\mid r$. Why must $d \\mid a$?',
        options: [
          { text: 'Since $a = bq + r$ is an integer linear combination of $b$ and $r$, any common divisor $d$ of $b$ and $r$ also divides $bq + r = a$.', why: 'If $b = dm$ and $r = dn$, then $a = d(mq + n)$, so $d \\mid a$.' },
          { text: 'Because $a > b$.', why: 'Size alone never implies divisibility.' },
          { text: 'Because $r = 0$ at every step.', why: '$r = 0$ only at the final step of Euclid’s algorithm.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Conclude that $\\gcd(a, b) = \\gcd(b, r)$:',
        options: [
          { text: 'Since $(a, b)$ and $(b, r)$ have the exact same set of common divisors, they have the exact same greatest common divisor: $\\gcd(a, b) = \\gcd(b, r)$.', why: 'Two identical finite sets of integers must have the same maximum element.' },
          { text: 'Therefore $a = b$.', why: 'Sharing common divisors with $(b, r)$ does not mean $a = b$.' },
          { text: 'Therefore $\\gcd(a, b) = r$.', why: '$\\gcd(a, b)$ equals the LAST non-zero remainder, not necessarily the first remainder $r$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Thus $\\gcd(a, b) = \\gcd(b, a \\bmod b)$, justifying every step of the Euclidean Algorithm.',
  },

  'modular-arithmetic': {
    title: 'Prove that $a \\bmod m$ has a multiplicative inverse $\\iff \\gcd(a, m) = 1$',
    claim: 'There exists $x \\in \\mathbb{Z}$ with $ax \\equiv 1 \\pmod m$ if and only if $\\gcd(a, m) = 1$.',
    strategy: 'Translate $ax \\equiv 1 \\pmod m$ into the linear equation $ax + my = 1$ and apply Bézout’s Identity.',
    givens: 'Let $a, m \\in \\mathbb{Z}$ with $m \\ge 2$.',
    steps: [
      {
        prompt: 'Rewrite the congruence $ax \\equiv 1 \\pmod m$ as an integer divisibility and linear equation:',
        options: [
          { text: '$ax \\equiv 1 \\pmod m \\iff m \\mid (ax - 1) \\iff \\exists y \\in \\mathbb{Z}\\text{ such that } ax - 1 = -my$, i.e., $ax + my = 1$.', why: 'Congruence mod $m$ means the difference $ax - 1$ is a multiple of $m$.' },
          { text: '$ax \\equiv 1 \\pmod m \\iff x = 1/a \\in \\mathbb{Z}$.', why: 'Modular inverses are integers satisfying $ax - 1 = km$, not fractions $1/a$.' },
          { text: '$ax \\equiv 1 \\pmod m \\iff a + m = 1$.', why: 'The coefficients $x$ and $y$ can be any integers.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Prove $(\\implies)$: if $ax + my = 1$ for some $x, y \\in \\mathbb{Z}$, why must $\\gcd(a, m) = 1$?',
        options: [
          { text: 'Let $d = \\gcd(a, m) \\ge 1$; since $d \\mid a$ and $d \\mid m$, $d$ divides $ax + my = 1$, forcing $d = 1$.', why: 'Any common divisor of $a$ and $m$ divides every linear combination $ax + my$, and the only positive divisor of $1$ is $1$.' },
          { text: 'Because $a$ and $m$ must both be prime.', why: 'Composite numbers like $8$ and $15$ can still be coprime ($\\gcd(8, 15) = 1$).' },
          { text: 'Because $x = 1$ and $y = 0$.', why: '$x$ and $y$ are Bézout coefficients found by Extended Euclid.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Prove $(\\Longleftarrow)$: if $\\gcd(a, m) = 1$, how do we construct the inverse $x$?',
        options: [
          { text: 'By Bézout’s Identity, $\\gcd(a, m) = 1$ guarantees integers $x, y$ with $ax + my = 1$; reducing modulo $m$ gives $ax \\equiv 1 \\pmod m$.', why: 'Since $my \\equiv 0 \\pmod m$, the Bézout coefficient $x$ is the modular inverse $a^{-1} \\bmod m$.' },
          { text: 'Set $x = m - a$.', why: '$a(m - a) \\equiv -a^2 \\pmod m$, which is not $1$ in general.' },
          { text: 'Set $x = a^{m}$ by Fermat’s Little Theorem.', why: '$m$ might be composite, and even for prime $p$ the inverse is $a^{p-2} \\bmod p$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Hence $a^{-1} \\bmod m$ exists if and only if $\\gcd(a, m) = 1$.',
  },

  'crt-fermat': {
    title: 'Cancellation proof of Fermat’s Little Theorem: $a^{p-1} \\equiv 1 \\pmod p$',
    claim: 'If $p$ is prime and $p \\nmid a$, then $a^{p-1} \\equiv 1 \\pmod p$.',
    strategy: 'Multiply the non-zero residues $\\{1, 2, \\dots, p - 1\\}$ by $a \\bmod p$, equate products, and cancel $(p - 1)!$.',
    givens: 'Let $p$ be prime and $\\gcd(a, p) = 1$.',
    steps: [
      {
        prompt: 'Show that the multiples $a \\cdot 1, a \\cdot 2, \\dots, a \\cdot (p - 1) \\bmod p$ are a permutation of $1, 2, \\dots, p - 1$:',
        options: [
          { text: 'Since $\\gcd(a, p) = 1$, $a$ is invertible mod $p$: $ai \\equiv 0 \\implies i \\equiv 0$, and $ai \\equiv aj \\implies i \\equiv j \\pmod p$, so the $p - 1$ residues are distinct and non-zero.', why: 'Multiplying by an invertible residue $a \\bmod p$ is a bijection on $\\{1, 2, \\dots, p - 1\\}$.' },
          { text: 'Multiplying by $a$ leaves every residue fixed ($ai \\equiv i \\pmod p$).', why: 'Multiplying by $a$ scrambles the order of the residues unless $a \\equiv 1 \\pmod p$.' },
          { text: 'One of the multiples $ai \\bmod p$ equals $0$.', why: 'Since $p$ is prime and $p \\nmid a$, Euclid’s Lemma prevents $p \\mid ai$ for $1 \\le i \\le p - 1$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Equate the product of the permuted residues to the product of $\\{1, 2, \\dots, p - 1\\}$ modulo $p$:',
        options: [
          { text: '$(a \\cdot 1)(a \\cdot 2)\\cdots(a \\cdot (p - 1)) \\equiv 1 \\cdot 2 \\cdots (p - 1) \\pmod p$, so $a^{p-1}(p - 1)! \\equiv (p - 1)! \\pmod p$.', why: 'Factoring $a$ out of each of the $p - 1$ terms produces $a^{p-1}(p - 1)!$.' },
          { text: '$a(p - 1)! \\equiv (p - 1)! \\pmod p$.', why: 'There are $p - 1$ factors of $a$, one in each term, so their product is $a^{p-1}$, not $a$.' },
          { text: 'Sum the residues to get $a^{p-1}$.', why: 'Summing factors $a$, not $a^{p-1}$; we need the product.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Cancel $(p - 1)!$ from both sides of $a^{p-1}(p - 1)! \\equiv (p - 1)! \\pmod p$:',
        options: [
          { text: 'Since $p$ is prime, $\\gcd((p - 1)!, p) = 1$, so $(p - 1)!$ is invertible mod $p$; canceling it gives $a^{p-1} \\equiv 1 \\pmod p$.', why: 'None of $1, 2, \\dots, p - 1$ is divisible by prime $p$, so their product $(p - 1)!$ is coprime to $p$ and can be validly canceled.' },
          { text: 'By Wilson’s Theorem, $(p - 1)! = 0 \\bmod p$, so $a^{p-1} \\equiv 1$.', why: 'If $(p-1)!$ were $0 \\pmod p$ we could NOT cancel it! (In fact $(p-1)! \\equiv -1 \\pmod p$, which is coprime to $p$.)' },
          { text: 'Divide by $p$ to get $a^{p-1} = 1$.', why: 'The congruence holds modulo $p$, not as an integer equality.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Therefore $a^{p-1} \\equiv 1 \\pmod p$ whenever $p$ is prime and $p \\nmid a$.',
  },

  'rsa-cryptography': {
    title: 'Prove RSA Decryption Correctness: $(M^e)^d \\equiv M \\pmod{pq}$',
    claim: 'If $n = pq$ for distinct primes $p, q$ and $ed \\equiv 1 \\pmod{(p-1)(q-1)}$, then $M^{ed} \\equiv M \\pmod n$ for any message $M$ with $\\gcd(M, n) = 1$.',
    strategy: 'Write $ed = 1 + k\\varphi(n)$ and apply Euler’s Theorem $M^{\\varphi(n)} \\equiv 1 \\pmod n$.',
    givens: 'Recall $\\varphi(pq) = (p - 1)(q - 1)$ and Euler’s Theorem: $\\gcd(M, n) = 1 \\implies M^{\\varphi(n)} \\equiv 1 \\pmod n$.',
    steps: [
      {
        prompt: 'Unpack the key relation $ed \\equiv 1 \\pmod{\\varphi(n)}$ into an integer equation for $ed$:',
        options: [
          { text: 'There exists an integer $k \\ge 1$ such that $ed = 1 + k\\varphi(n) = 1 + k(p - 1)(q - 1)$.', why: 'By definition of congruence modulo $\\varphi(n)$, $ed - 1$ is an integer multiple $k\\varphi(n)$.' },
          { text: '$ed = 1 + k n$.', why: 'The private key $d$ is inverted modulo $\\varphi(n) = (p-1)(q-1)$, not modulo $n = pq$.' },
          { text: '$e + d = \\varphi(n)$.', why: '$e$ and $d$ are multiplicative inverses mod $\\varphi(n)$, not additive complements.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Substitute $ed = 1 + k\\varphi(n)$ into the decrypted value $C^d = (M^e)^d = M^{ed}$:',
        options: [
          { text: '$M^{ed} = M^{1 + k\\varphi(n)} = M \\cdot \\left(M^{\\varphi(n)}\\right)^k$.', why: 'Using exponent laws $x^{1 + ab} = x^1 \\cdot (x^a)^b$ isolates $M^{\\varphi(n)}$.' },
          { text: '$M^{ed} = M^1 + M^{k\\varphi(n)}$.', why: 'Added exponents multiply the base powers ($M^1 \\cdot M^{k\\varphi(n)}$), not add them.' },
          { text: '$M^{ed} = (ed)M$.', why: 'Exponentiation is not multiplication.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Reduce $M \\cdot \\left(M^{\\varphi(n)}\\right)^k$ modulo $n$ using Euler’s Theorem:',
        options: [
          { text: 'Since $\\gcd(M, n) = 1$, Euler’s Theorem gives $M^{\\varphi(n)} \\equiv 1 \\pmod n$, so $M \\cdot (M^{\\varphi(n)})^k \\equiv M \\cdot 1^k \\equiv M \\pmod n$.', why: 'The factor $(M^{\\varphi(n)})^k \\equiv 1^k = 1 \\pmod n$ vanishes, recovering the original message $M$!' },
          { text: 'By Fermat’s Little Theorem, $M^n \\equiv 1 \\pmod n$.', why: '$n = pq$ is composite, so Euler’s totient $\\varphi(n) = (p-1)(q-1)$ is the required exponent period.' },
          { text: 'Cancel $e$ and $d$ by dividing the exponent by $n$.', why: 'Exponents reduce modulo $\\varphi(n)$, never modulo $n$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Thus $(M^e)^d \\equiv M \\pmod n$, proving that RSA decryption recovers $M$.',
  },

  // ── Part 6: Recurrences, Generating Functions & Asymptotics ─────────────
  'sequences-sums': {
    title: 'Derive the Finite Geometric Series Formula: $\\sum_{i=0}^{n-1} r^i = \\frac{r^n - 1}{r - 1}$',
    claim: 'For any $r \\neq 1$ and integer $n \\ge 1$, $S = 1 + r + r^2 + \\dots + r^{n-1} = \\frac{r^n - 1}{r - 1}$.',
    strategy: 'Multiply $S$ by $r$ and subtract $rS - S$ so all interior powers telescope.',
    givens: 'Let $S = \\sum_{i=0}^{n-1} r^i$ with $r \\neq 1$.',
    steps: [
      {
        prompt: 'Multiply the sum $S = 1 + r + r^2 + \\dots + r^{n-1}$ by $r$:',
        options: [
          { text: '$rS = r + r^2 + r^3 + \\dots + r^{n-1} + r^n$.', why: 'Multiplying each term $r^i$ by $r$ shifts every exponent up by $1$, from $[0, n-1]$ to $[1, n]$.' },
          { text: '$rS = 1 + r^2 + r^3 + \\dots + r^n$.', why: 'The first term $1$ becomes $r$ when multiplied by $r$.' },
          { text: '$rS = r^n$.', why: 'Distributing $r$ across the sum shifts every term; cancellation only happens after we subtract $S$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Subtract $S$ from $rS$ to telescope the interior terms:',
        options: [
          { text: '$rS - S = (r + r^2 + \\dots + r^n) - (1 + r + \\dots + r^{n-1}) = r^n - 1$, so $(r - 1)S = r^n - 1$.', why: 'Every interior power $r, r^2, \\dots, r^{n-1}$ appears once positively in $rS$ and once negatively in $-S$, leaving only $r^n - 1$.' },
          { text: '$(r - 1)S = r^{n-1} - 1$.', why: 'The highest power in $rS$ is $r \\cdot r^{n-1} = r^n$, which survives uncancelled.' },
          { text: '$(r - 1)S = r^n + 1$.', why: 'The constant $1$ in $S$ is subtracted, giving $-1$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Solve $(r - 1)S = r^n - 1$ for $S$:',
        options: [
          { text: 'Since $r \\neq 1$, $r - 1 \\neq 0$, so we can divide by $r - 1$ to obtain $S = \\frac{r^n - 1}{r - 1}$.', why: 'The hypothesis $r \\neq 1$ ensures we are not dividing by zero.' },
          { text: 'The formula also holds by plugging $r = 1$ directly into $\\frac{r^n - 1}{r - 1}$.', why: 'At $r = 1$, $\\frac{r^n - 1}{r - 1}$ is $0/0$; for $r = 1$ the sum is simply $n$.' },
          { text: '$S = r^{n-1}$.', why: 'Only the ratio $\\frac{r^n - 1}{r - 1}$ equals $1 + r + \\dots + r^{n-1}$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Hence $\\sum_{i=0}^{n-1} r^i = \\frac{r^n - 1}{r - 1}$ for all $r \\neq 1$.',
  },

  recurrences: {
    title: 'Prove Superposition for Linear Homogeneous Recurrences',
    claim: 'If $u_n = r_1^n$ and $v_n = r_2^n$ both satisfy $a_n = c_1 a_{n-1} + c_2 a_{n-2}$, then $a_n = \\alpha r_1^n + \\beta r_2^n$ also satisfies it for any constants $\\alpha, \\beta$.',
    strategy: 'Substitute $a_n = \\alpha u_n + \\beta v_n$ into $c_1 a_{n-1} + c_2 a_{n-2}$ and regroup by linearity.',
    givens: 'Assume $u_n = c_1 u_{n-1} + c_2 u_{n-2}$ and $v_n = c_1 v_{n-1} + c_2 v_{n-2}$ for all $n \\ge 2$.',
    steps: [
      {
        prompt: 'Expand the right-hand side $c_1 a_{n-1} + c_2 a_{n-2}$ for $a_n = \\alpha u_n + \\beta v_n$:',
        options: [
          { text: '$c_1(\\alpha u_{n-1} + \\beta v_{n-1}) + c_2(\\alpha u_{n-2} + \\beta v_{n-2})$.', why: 'Substituting the linear combination at indices $n - 1$ and $n - 2$ sets up the algebraic regrouping.' },
          { text: '$\\alpha c_1 u_{n-1} + \\beta c_2 v_{n-2}$.', why: 'Both $a_{n-1}$ and $a_{n-2}$ contain both $\\alpha u$ and $\\beta v$ terms.' },
          { text: '$(\\alpha + \\beta)(c_1 u_{n-1} + c_2 v_{n-2})$.', why: '$u$ and $v$ have separate coefficients $\\alpha$ and $\\beta$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Regroup the expanded sum by collecting $\\alpha$-terms and $\\beta$-terms:',
        options: [
          { text: '$\\alpha(c_1 u_{n-1} + c_2 u_{n-2}) + \\beta(c_1 v_{n-1} + c_2 v_{n-2})$.', why: 'Distributivity and commutativity of addition separate the $u$-recurrence from the $v$-recurrence.' },
          { text: '$(\\alpha c_1 + \\beta c_2)(u_{n-1} + v_{n-2})$.', why: 'That product introduces cross terms like $\\alpha c_1 v_{n-2}$ that are not present.' },
          { text: '$\\alpha \\beta (u_n + v_n)$.', why: 'Linear combinations add $\\alpha$ and $\\beta$ terms rather than multiplying $\\alpha \\beta$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Use the fact that $u_n$ and $v_n$ each satisfy the recurrence:',
        options: [
          { text: 'Since $c_1 u_{n-1} + c_2 u_{n-2} = u_n$ and $c_1 v_{n-1} + c_2 v_{n-2} = v_n$, the expression equals $\\alpha u_n + \\beta v_n = a_n$.', why: 'Therefore $c_1 a_{n-1} + c_2 a_{n-2} = a_n$, proving that any linear combination of solutions is a solution.' },
          { text: 'Set $\\alpha = \\beta = 0$ to satisfy the equation.', why: 'The identity holds for ALL $\\alpha, \\beta$, allowing us to match any initial conditions $a_0, a_1$.' },
          { text: 'Conclude $r_1 = r_2$.', why: 'Superposition holds for any two solutions $u_n, v_n$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Hence the solution space of a linear homogeneous recurrence is closed under linear combinations.',
  },

  'divide-conquer-master': {
    title: 'Prove the Balanced Case of the Master Theorem ($a = b^d$)',
    claim: 'If $T(n) = a T(n/b) + c n^d$ with $a = b^d$ and $n = b^L$, then $T(n) = \\Theta(n^d \\log_b n)$.',
    strategy: 'Sum the total work across levels $\\ell = 0, 1, \\dots, L$ of the recursion tree.',
    givens: 'At level $\\ell$, there are $a^\\ell$ nodes, each of problem size $n / b^\\ell$.',
    steps: [
      {
        prompt: 'Compute the total non-recursive work performed across all $a^\\ell$ nodes at level $\\ell$:',
        options: [
          { text: '$W_\\ell = a^\\ell \\cdot c\\left(\\frac{n}{b^\\ell}\\right)^d = c n^d \\left(\\frac{a}{b^d}\\right)^\\ell$.', why: 'Multiplying $a^\\ell$ nodes by $c(n/b^\\ell)^d$ work per node factors out $cn^d$ times the branching-to-shrinkage ratio $(a/b^d)^\\ell$.' },
          { text: '$W_\\ell = c(n/b^\\ell)^d$ (just one node’s work).', why: 'Level $\\ell$ has $a^\\ell$ subproblems running at size $n/b^\\ell$, so we must multiply by $a^\\ell$.' },
          { text: '$W_\\ell = a^\\ell c n^d$.', why: 'Each subproblem at depth $\\ell$ has shrunk to input size $n / b^\\ell$, not $n$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Apply the balanced hypothesis $a = b^d$ to simplify $W_\\ell$:',
        options: [
          { text: 'Since $a / b^d = 1$, every level does the exact same total work: $W_\\ell = c n^d \\cdot 1^\\ell = c n^d$.', why: 'The $a$-fold increase in subproblem count exactly cancels the $b^d$-fold decrease in work per subproblem.' },
          { text: 'Since $a = b^d$, $W_\\ell = 0$ for $\\ell \\ge 1$.', why: '$1^\\ell = 1$, not $0$.' },
          { text: '$W_\\ell$ grows geometrically with $\\ell$.', why: 'When the ratio $a/b^d = 1$, the series is constant across levels, not geometric.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Sum $W_\\ell = c n^d$ over all $L + 1$ levels where $L = \\log_b n$:',
        options: [
          { text: '$T(n) = \\sum_{\\ell=0}^L c n^d = c n^d (L + 1) = c n^d (\\log_b n + 1) = \\Theta(n^d \\log n)$.', why: 'Adding $L + 1 = \\log_b n + 1$ identical copies of $cn^d$ produces the $\\log n$ factor.' },
          { text: '$T(n) = \\Theta(n^d)$ because there are finitely many levels.', why: 'The number of levels $L = \\log_b n$ grows with $n$, contributing an extra $\\log n$ factor.' },
          { text: '$T(n) = \\Theta(n^{d+1})$.', why: 'The tree height is $\\log_b n$, not $n$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Therefore $T(n) = \\Theta(n^d \\log n)$ in the balanced case $a = b^d$.',
  },

  'generating-functions': {
    title: 'Derive the Generating Function of $a_n = 2a_{n-1} + 1$ ($a_0 = 1$) and extract $a_n$',
    claim: 'The sequence $a_0 = 1$, $a_n = 2a_{n-1} + 1$ (Tower of Hanoi moves for $n + 1$ disks) has closed form $a_n = 2^{n+1} - 1$.',
    strategy: 'Form $A(x) = \\sum_{n \\ge 0} a_n x^n$, solve algebraically for $A(x)$, and expand via partial fractions.',
    givens: 'Recall $\\frac{1}{1 - rx} = \\sum_{n=0}^\\infty r^n x^n$.',
    steps: [
      {
        prompt: 'Multiply $a_n = 2a_{n-1} + 1$ by $x^n$, sum over $n \\ge 1$, and express in terms of $A(x) = \\sum_{n \\ge 0} a_n x^n$:',
        options: [
          { text: '$A(x) - a_0 = 2x A(x) + \\frac{x}{1 - x}$, so with $a_0 = 1$ we get $(1 - 2x)A(x) = 1 + \\frac{x}{1 - x} = \\frac{1}{1 - x}$.', why: '$\\sum_{n \\ge 1} a_{n-1} x^n = x A(x)$ and $\\sum_{n \\ge 1} x^n = \\frac{x}{1 - x}$, so $1 + \\frac{x}{1-x} = \\frac{1}{1-x}$.' },
          { text: '$A(x) = 2 A(x) + \\frac{1}{1 - x}$.', why: 'Shifting index $a_{n-1}$ to $a_n$ requires multiplying by $x$, giving $2x A(x)$.' },
          { text: '$(1 - 2x)A(x) = 1$.', why: 'Don’t forget the $+1$ constant in $a_n = 2a_{n-1} + 1$, which sums to $\\frac{x}{1-x}$ for $n \\ge 1$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Decompose $A(x) = \\frac{1}{(1 - 2x)(1 - x)}$ into partial fractions:',
        options: [
          { text: '$A(x) = \\frac{2}{1 - 2x} - \\frac{1}{1 - x}$ (since $2(1 - x) - 1(1 - 2x) = 2 - 2x - 1 + 2x = 1$).', why: 'Combining $\\frac{2}{1 - 2x} - \\frac{1}{1 - x}$ over the common denominator $(1 - 2x)(1 - x)$ gives numerator $1$.' },
          { text: '$A(x) = \\frac{1}{1 - 2x} + \\frac{1}{1 - x}$.', why: 'Adding those fractions gives numerator $(1 - x) + (1 - 2x) = 2 - 3x \\neq 1$.' },
          { text: '$A(x) = \\frac{1}{1 - 3x}$.', why: '$(1 - 2x)(1 - x) = 1 - 3x + 2x^2$, which is quadratic in the denominator.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Extract the coefficient $[x^n]A(x)$ from $\\frac{2}{1 - 2x} - \\frac{1}{1 - x}$:',
        options: [
          { text: '$a_n = [x^n]\\left(2\\sum_{n=0}^\\infty 2^n x^n - \\sum_{n=0}^\\infty x^n\\right) = 2 \\cdot 2^n - 1 = 2^{n+1} - 1$.', why: 'Reading off the coefficient of $x^n$ from the two geometric series immediately yields $a_n = 2^{n+1} - 1$.' },
          { text: '$a_n = 2^n - 1$.', why: 'The numerator on $\\frac{2}{1 - 2x}$ is $2$, so $[x^n]\\frac{2}{1 - 2x} = 2 \\cdot 2^n = 2^{n+1}$.' },
          { text: '$a_n = 2n - 1$.', why: '$\\frac{1}{1 - 2x}$ expands into powers $2^n$, not linear multiples $2n$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Thus $a_n = 2^{n+1} - 1$ for all $n \\ge 0$.',
  },

  asymptotics: {
    title: 'Prove that $3n^2 + 5n + 2 = \\Theta(n^2)$ from the formal $(c_1, c_2, n_0)$ definition',
    claim: 'There exist constants $c_1, c_2 > 0$ and $n_0 \\ge 1$ such that $c_1 n^2 \\le 3n^2 + 5n + 2 \\le c_2 n^2$ for all $n \\ge n_0$.',
    strategy: 'Bound lower-order terms from below by $0$ and from above by replacing $n \\le n^2$ and $1 \\le n^2$ for $n \\ge 1$.',
    givens: 'Let $f(n) = 3n^2 + 5n + 2$ for $n \\ge 1$.',
    steps: [
      {
        prompt: 'Establish the $\\Omega(n^2)$ lower bound for all $n \\ge 1$:',
        options: [
          { text: 'For all $n \\ge 1$, $5n + 2 > 0$, so $3n^2 + 5n + 2 \\ge 3n^2$; thus $c_1 = 3$ and $n_0 = 1$ witness $f(n) = \\Omega(n^2)$.', why: 'Dropping positive lower-order terms only makes the sum smaller, immediately giving $f(n) \\ge 3n^2$.' },
          { text: 'Choose $c_1 = 3 + 5/n + 2/n^2$.', why: 'The constant $c_1$ in $\\Theta$-notation must be a fixed positive number independent of $n$.' },
          { text: 'Choose $c_1 = 10$ for $n \\ge 1$.', why: 'At $n = 2$, $3(4) + 5(2) + 2 = 24 < 10(4) = 40$, so $c_1 = 10$ fails as a lower bound.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Establish the $O(n^2)$ upper bound for all $n \\ge 1$ by bounding each lower-order term by $n^2$:',
        options: [
          { text: 'For all $n \\ge 1$, $n \\le n^2$ and $1 \\le n^2$, so $3n^2 + 5n + 2 \\le 3n^2 + 5n^2 + 2n^2 = 10n^2$; thus $c_2 = 10$ and $n_0 = 1$ witness $f(n) = O(n^2)$.', why: 'Promoting each lower power of $n$ to $n^2$ (valid for $n \\ge 1$) lets us add the coefficients $3 + 5 + 2 = 10$.' },
          { text: 'For all $n \\ge 1$, $3n^2 + 5n + 2 \\le 3n^2$.', why: 'Since $5n + 2 > 0$, $3n^2 + 5n + 2$ is strictly larger than $3n^2$.' },
          { text: 'Check $n = 1$: $3(1) + 5(1) + 2 = 10 \\le 10(1)^2$, which alone proves $O(n^2)$.', why: 'The inequality must hold for ALL $n \\ge n_0$, not just at a single value $n = 1$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Combine the two bounds to conclude $3n^2 + 5n + 2 = \\Theta(n^2)$:',
        options: [
          { text: 'For all $n \\ge n_0 = 1$, $3n^2 \\le 3n^2 + 5n + 2 \\le 10n^2$; with witnesses $(c_1, c_2, n_0) = (3, 10, 1)$, $f(n) = \\Theta(n^2)$.', why: 'Matching both $O(n^2)$ and $\\Omega(n^2)$ establishes the tight asymptotic bound $\\Theta(n^2)$.' },
          { text: 'Therefore $f(n) = o(n^2)$.', why: '$\\lim_{n \\to \\infty} f(n)/n^2 = 3 \\neq 0$, so $f(n)$ is $\\Theta(n^2)$, not $o(n^2)$.' },
          { text: 'Therefore $c_1$ must equal $c_2$.', why: '$\\Theta$-notation allows any positive sandwich constants $0 < c_1 \\le c_2$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'With $(c_1, c_2, n_0) = (3, 10, 1)$, $3n^2 \\le 3n^2 + 5n + 2 \\le 10n^2$ for all $n \\ge 1$, so $3n^2 + 5n + 2 = \\Theta(n^2)$.',
  },

  // ── Part 7: Graph Theory & Networks ─────────────────────────────────────
  'graphs-handshaking': {
    title: 'Prove that every graph has an even number of odd-degree vertices',
    claim: 'In any undirected graph $G = (V, E)$, the subset $V_{\\text{odd}} = \\{v \\in V : \\deg(v)\\text{ is odd}\\}$ has even cardinality $|V_{\\text{odd}}|$.',
    strategy: 'Split the Handshaking Lemma sum $\\sum_{v \\in V} \\deg(v) = 2|E|$ into $V_{\\text{even}}$ and $V_{\\text{odd}}$ and analyze parity.',
    givens: 'By the Handshaking Lemma, $\\sum_{v \\in V} \\deg(v) = 2|E|$.',
    steps: [
      {
        prompt: 'Partition the vertex set $V$ into $V_{\\text{even}}$ and $V_{\\text{odd}}$ in the Handshaking Lemma:',
        options: [
          { text: '$\\sum_{v \\in V_{\\text{even}}} \\deg(v) + \\sum_{v \\in V_{\\text{odd}}} \\deg(v) = 2|E|$.', why: 'Every vertex has either an even degree or an odd degree, splitting the sum into two disjoint parts.' },
          { text: '$\\sum_{v \\in V_{\\text{odd}}} \\deg(v) = |E|$.', why: 'The odd-degree vertices do not necessarily account for half the degree sum.' },
          { text: 'Assume every vertex in $G$ has even degree.', why: 'Graphs can have odd-degree vertices; we are proving there are an even NUMBER of them.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Isolate the odd-degree sum and determine its parity:',
        options: [
          { text: '$\\sum_{v \\in V_{\\text{odd}}} \\deg(v) = 2|E| - \\sum_{v \\in V_{\\text{even}}} \\deg(v)$, which is an even number minus a sum of even numbers, hence even.', why: '$2|E|$ is even, and every term in $\\sum_{v \\in V_{\\text{even}}} \\deg(v)$ is even, so their difference is even.' },
          { text: 'The sum $\\sum_{v \\in V_{\\text{odd}}} \\deg(v)$ is odd because each term is odd.', why: 'A sum of odd numbers is odd ONLY if there are an odd number of terms!' },
          { text: '$\\sum_{v \\in V_{\\text{even}}} \\deg(v) = 0$.', why: 'Even degrees like $2, 4, 6$ can be positive.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Deduce the parity of $|V_{\\text{odd}}|$ from the fact that $\\sum_{v \\in V_{\\text{odd}}} \\deg(v)$ is even:',
        options: [
          { text: 'Each term $\\deg(v)$ for $v \\in V_{\\text{odd}}$ is odd ($2k_v + 1$), and a sum of $|V_{\\text{odd}}|$ odd integers is even if and only if $|V_{\\text{odd}}|$ is even.', why: 'Modulo $2$, $\\sum_{v \\in V_{\\text{odd}}} 1 \\equiv |V_{\\text{odd}}| \\equiv 0 \\pmod 2$, so $|V_{\\text{odd}}|$ is even.' },
          { text: 'Therefore $|V_{\\text{odd}}| = 0$.', why: '$|V_{\\text{odd}}|$ can be $0, 2, 4, 6, \\dots$ — any even integer.' },
          { text: 'Therefore $|E|$ is even.', why: '$2|E|$ is always even regardless of whether $|E|$ itself is even or odd.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Hence $|V_{\\text{odd}}|$ is always even in every undirected graph.',
  },

  'representations-isomorphism': {
    title: 'Prove by Induction that $(A^k)_{ij}$ counts walks of length $k$ from $i$ to $j$',
    claim: 'For a graph $G$ with adjacency matrix $A$, the $(i, j)$ entry of $A^k$ equals the number of walks of length $k$ from vertex $i$ to vertex $j$ for all $k \\ge 1$.',
    strategy: 'Mathematical induction on walk length $k \\ge 1$, decomposing a length-$(k+1)$ walk into a length-$k$ walk to an intermediate vertex $r$ followed by edge $(r, j)$.',
    givens: 'By definition, $A_{ij} = 1$ if $\\{i, j\\} \\in E$ and $0$ otherwise.',
    steps: [
      {
        prompt: 'Verify the Base Case $k = 1$:',
        options: [
          { text: 'A walk of length $1$ from $i$ to $j$ is a single edge $(i, j)$, and by definition $(A^1)_{ij} = A_{ij}$ is $1$ if that edge exists and $0$ otherwise.', why: 'Length-$1$ walks are just direct edges, which is the exact definition of the adjacency matrix $A$.' },
          { text: 'For $k = 1$, $A_{ij} = \\deg(i)$.', why: '$\\deg(i)$ is the row sum $\\sum_j A_{ij}$, whereas $A_{ij} \\in \\{0, 1\\}$ counts edges between $i$ and $j$.' },
          { text: 'Assume the claim holds for $k = 1$.', why: 'The base case must be checked from the definition of $A$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Assume the IH for length $k$. How does every walk of length $k + 1$ from $i$ to $j$ decompose?',
        options: [
          { text: 'Every walk of length $k + 1$ from $i$ to $j$ consists of a walk of length $k$ from $i$ to some penultimate vertex $r \\in V$, followed by a single step $(r, j)$.', why: 'Conditioning on the second-to-last vertex $r$ partitions all length-$(k+1)$ walks from $i$ to $j$ into disjoint classes indexed by $r$.' },
          { text: 'It consists of two walks of length $k$ added together.', why: 'Concatenating two walks of length $k$ gives length $2k$, not $k + 1$.' },
          { text: 'The penultimate vertex $r$ must be $i$.', why: '$r$ can be any vertex in $V$ that is adjacent to $j$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Count the walks of length $k + 1$ through each $r \\in V$ and compare with matrix multiplication $A^{k+1} = A^k A$:',
        options: [
          { text: 'By the IH and Product Rule, there are $(A^k)_{ir} A_{rj}$ walks via $r$; summing over all $r \\in V$ gives $\\sum_{r=1}^n (A^k)_{ir} A_{rj} = (A^k A)_{ij} = (A^{k+1})_{ij}$.', why: 'The combinatorial Sum-of-Products rule over intermediate vertices $r$ is the exact formula for matrix multiplication $(A^k A)_{ij}$!' },
          { text: 'The total is $(A^k)_{ij} + A_{ij}$.', why: 'Matrix addition counts walks of length $k$ OR length $1$, not walks of length $k + 1$.' },
          { text: 'Divide by $k!$ because vertex order doesn’t matter.', why: 'Walks are ordered sequences of edges, so order matters.' },
        ],
        answer: 0,
      },
    ],
    qed: 'By induction on $k$, $(A^k)_{ij}$ equals the number of walks of length $k$ from $i$ to $j$ for all $k \\ge 1$.',
  },

  'paths-euler-hamilton': {
    title: 'Prove Necessity in Euler’s Theorem: an Eulerian circuit requires every degree to be even',
    claim: 'If a connected graph $G$ has an Eulerian circuit $C$ (a closed walk traversing every edge of $G$ exactly once), then $\\deg(v)$ is even for every vertex $v \\in V$.',
    strategy: 'Pair every entry edge into vertex $v$ along the closed walk $C$ with the immediately following exit edge.',
    givens: 'Let $C = (v_0, e_1, v_1, e_2, \\dots, e_m, v_m)$ with $v_m = v_0$ be an Eulerian circuit containing every edge of $G$ once.',
    steps: [
      {
        prompt: 'Consider any internal visit to a vertex $v$ along the walk $C$:',
        options: [
          { text: 'Each time the walk enters $v$ along an unused edge, it must immediately leave $v$ along a different unused edge, contributing $+2$ to the count of incident edges at $v$.', why: 'Because $C$ never reuses an edge, every arrival-departure pair at $v$ consumes $2$ distinct edges incident to $v$ (or $1$ self-loop, which also contributes $2$ to $\\deg(v)$).' },
          { text: 'The walk can visit $v$ at most once.', why: 'An Eulerian circuit can visit a vertex many times; only EDGES cannot be repeated.' },
          { text: 'Entering and leaving $v$ uses the same edge twice.', why: 'Eulerian circuits are forbidden from repeating edges.' },
        ],
        answer: 0,
      },
      {
        prompt: 'What about the starting and ending vertex $v_0 = v_m$ of the circuit?',
        options: [
          { text: 'The very first edge $e_1$ leaves $v_0$ and the very last edge $e_m$ returns to $v_0$, pairing up to contribute $+2$ incident edges at $v_0$ as well (plus $+2$ for any intermediate visits).', why: 'Because the walk is closed ($v_m = v_0$), the initial departure and final arrival at $v_0$ form one more matched pair of edges.' },
          { text: 'The start vertex $v_0$ has odd degree because it starts the walk.', why: 'An odd degree at $v_0$ happens only in an open Eulerian TRAIL ($v_0 \\neq v_m$), not a closed circuit ($v_0 = v_m$).' },
          { text: '$v_0$ has degree $2$.', why: '$v_0$ can also be visited additional times in the middle of the circuit, giving degree $2, 4, 6, \\dots$' },
        ],
        answer: 0,
      },
      {
        prompt: 'Use the fact that $C$ contains EVERY edge of $G$ exactly once:',
        options: [
          { text: 'If $v$ is visited $k$ times along $C$, then all edges incident to $v$ appear in those $k$ enter-exit pairs, so $\\deg(v) = 2k$ is even for every $v \\in V$.', why: 'Since no edge of $G$ is left out of $C$ and no edge is used twice, $\\deg(v)$ is the sum of $2$s from each visit.' },
          { text: 'Therefore $G$ is a cycle $C_n$.', why: 'Vertices can have degree $4, 6, \\dots$, not just $2$.' },
          { text: 'Therefore $G$ is Hamiltonian.', why: 'Eulerian circuits traverse every edge once; Hamiltonian cycles visit every vertex once.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Every vertex in a graph with an Eulerian circuit has even degree.',
  },

  'trees-spanning': {
    title: 'Prove by Induction that every tree on $n \\ge 1$ vertices has $n - 1$ edges',
    claim: 'For every integer $n \\ge 1$, any tree $T = (V, E)$ with $|V| = n$ has $|E| = n - 1$.',
    strategy: 'Induction on $n \\ge 1$ using the Leaf Lemma (every tree with $n \\ge 2$ vertices has a leaf of degree $1$).',
    givens: 'A tree is a connected acyclic graph; a leaf is a vertex of degree $1$ (found at the end of any maximal simple path).',
    steps: [
      {
        prompt: 'Verify the Base Case $n = 1$:',
        options: [
          { text: 'A tree on $n = 1$ vertex cannot have any self-loops (which are cycles of length $1$), so $|E| = 0 = 1 - 1$.', why: 'A single vertex is already connected and acyclic with $0 = n - 1$ edges.' },
          { text: 'A $1$-vertex tree has $1$ edge.', why: 'An edge on $1$ vertex would be a loop, violating acyclicity.' },
          { text: 'Start at $n = 2$ because $n = 1$ is not a tree.', why: 'A single vertex with $0$ edges is connected and acyclic, hence a tree.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Assume every tree on $k$ vertices has $k - 1$ edges. Given a tree $T$ on $k + 1 \\ge 2$ vertices, pick a leaf $v$ ($\deg(v) = 1$) and form $T\' = T - v$:',
        options: [
          { text: 'Removing leaf $v$ and its single incident edge leaves $T\'$ connected (no path between other vertices could pass through a degree-$1$ dead end) and acyclic, so $T\'$ is a tree on $k$ vertices.', why: 'Deleting a degree-$1$ vertex removes $1$ vertex and $1$ edge without disconnecting the rest of the graph or creating cycles.' },
          { text: 'Removing any arbitrary vertex $v$ from $T$ leaves a single connected tree $T\'$.', why: 'Removing an internal vertex of degree $\\ge 2$ splits $T$ into multiple disconnected components; we must remove a LEAF ($\deg(v) = 1$).' },
          { text: 'Removing $v$ removes $2$ edges.', why: 'By definition, a leaf has degree $1$, so it is incident to only $1$ edge.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Apply the Inductive Hypothesis to $T\'$ to count the edges of $T$:',
        options: [
          { text: 'By the IH, $T\'$ has $k - 1$ edges; adding back the single edge incident to leaf $v$ gives $|E(T)| = (k - 1) + 1 = k = (k + 1) - 1$.', why: 'Restoring the leaf’s edge brings the total to $(k + 1) - 1$, completing the inductive step.' },
          { text: '$|E(T)| = 2(k - 1)$.', why: 'Reattaching one leaf adds $+1$ edge, not a factor of $2$.' },
          { text: 'Therefore $T$ is a path graph $P_{k+1}$.', why: 'The leaf removal argument works for EVERY tree topology (stars, binary trees, caterpillars, etc.).' },
        ],
        answer: 0,
      },
    ],
    qed: 'By mathematical induction, every tree on $n \\ge 1$ vertices has $n - 1$ edges.',
  },

  'planar-coloring': {
    title: 'Prove the Planar Edge Bound $|E| \\le 3|V| - 6$ and conclude $K_5$ is non-planar',
    claim: 'Every connected simple planar graph with $v = |V| \\ge 3$ vertices and $e = |E|$ edges satisfies $e \\le 3v - 6$; hence $K_5$ is not planar.',
    strategy: 'Double-count face-boundary edge incidences ($3f \\le 2e$) and substitute into Euler’s Formula $v - e + f = 2$.',
    givens: 'Euler’s Planar Formula: $v - e + f = 2$ for any connected plane drawing with $f$ faces.',
    steps: [
      {
        prompt: 'Relate the number of faces $f$ to the number of edges $e$ in a simple planar graph (assuming $e \\ge 3$):',
        options: [
          { text: 'Every face is bounded by at least $3$ edges, and every edge borders at most $2$ faces; summing boundary lengths gives $3f \\le 2e$, so $f \\le \\frac{2}{3}e$.', why: 'In a simple graph (no loops or parallel edges), the shortest cycle has length $3$, and each edge is counted at most twice (once per side).' },
          { text: 'Every face has $4$ edges, so $4f \\le 2e$.', why: '$4f \\le 2e$ only holds when the graph is triangle-free (such as $K_{3,3}$); $K_5$ contains triangles!' },
          { text: '$f = e$.', why: 'Each face requires at least $3$ edges around its boundary.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Substitute $f \\le \\frac{2}{3}e$ into Euler’s Formula $2 = v - e + f$:',
        options: [
          { text: '$2 = v - e + f \\le v - e + \\frac{2}{3}e = v - \\frac{1}{3}e$, so $\\frac{1}{3}e \\le v - 2$, which multiplies by $3$ to give $e \\le 3v - 6$.', why: 'Replacing $f$ by its upper bound $\\frac{2}{3}e$ eliminates $f$ and leaves a direct inequality between $e$ and $v$.' },
          { text: '$2 \\le v + e$, so $e \\ge 2 - v$.', why: 'In Euler’s formula, $e$ has a minus sign: $v - e + f = 2$.' },
          { text: '$e = 3v - 6$ for all planar graphs.', why: 'Equality $e = 3v - 6$ holds only for maximal planar graphs (triangulations); in general $e \\le 3v - 6$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Test $K_5$ ($v = 5$ vertices, $e = \\binom{5}{2} = 10$ edges) against $e \\le 3v - 6$:',
        options: [
          { text: 'For $v = 5$, the planar bound requires $e \\le 3(5) - 6 = 9$, but $K_5$ has $e = 10 > 9$ edges; by contraposition, $K_5$ is not planar.', why: 'Since $10 \\not\\le 9$, $K_5$ violates a necessary condition for planarity.' },
          { text: 'For $v = 5$, $3(5) - 6 = 9$, so removing $2$ edges makes $K_5$ non-planar.', why: 'Removing even $1$ edge drops $e$ to $9$, which actually CAN be drawn planarly ($K_5 - e$ is planar!).' },
          { text: '$K_5$ is non-planar because it has odd degree $4$.', why: '$4$ is even, and vertex degrees do not determine planarity.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Every simple planar graph with $v \\ge 3$ satisfies $e \\le 3v - 6$; since $K_5$ has $10 > 9$ edges, $K_5$ cannot be drawn in the plane without crossings.',
  },

  // ── Part 8: Discrete Probability, Boolean Algebra & Automata ────────────
  'discrete-probability': {
    title: 'Derive Bayes’ Theorem from Conditional Probability and the Law of Total Probability',
    claim: 'For events $A, B$ with $0 < P(A) < 1$ and $P(B) > 0$, $P(A \\mid B) = \\frac{P(B \\mid A)P(A)}{P(B \\mid A)P(A) + P(B \\mid \\overline{A})P(\\overline{A})}$.',
    strategy: 'Express $P(A \\cap B)$ in two ways using the Chain Rule, and expand $P(B)$ by partitioning on $A$ vs. $\\overline{A}$.',
    givens: 'By definition, $P(X \\mid Y) = \\frac{P(X \\cap Y)}{P(Y)}$ whenever $P(Y) > 0$.',
    steps: [
      {
        prompt: 'Write $P(A \\cap B)$ in two ways using the definition of conditional probability:',
        options: [
          { text: '$P(A \\cap B) = P(A \\mid B)P(B)$ and $P(B \\cap A) = P(B \\mid A)P(A)$; since $A \\cap B = B \\cap A$, $P(A \\mid B) = \\frac{P(B \\mid A)P(A)}{P(B)}$.', why: 'Intersection is commutative ($A \\cap B = B \\cap A$), equating the two product rules.' },
          { text: '$P(A \\cap B) = P(A)P(B)$ always.', why: '$P(A \\cap B) = P(A)P(B)$ holds ONLY when $A$ and $B$ are independent!' },
          { text: '$P(A \\mid B) = P(B \\mid A)$.', why: 'Conditioning on $B$ divides by $P(B)$, whereas conditioning on $A$ divides by $P(A)$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Partition the event $B$ into disjoint parts using $A$ and $\\overline{A}$:',
        options: [
          { text: '$B = (B \\cap A) \\sqcup (B \\cap \\overline{A})$, so by countable additivity $P(B) = P(B \\cap A) + P(B \\cap \\overline{A})$.', why: 'Every outcome in $B$ either belongs to $A$ or to $\\overline{A}$, partitioning $B$ into two mutually exclusive events.' },
          { text: '$P(B) = P(A) + P(\\overline{A}) = 1$.', why: '$P(A) + P(\\overline{A}) = 1$ is the probability of the whole sample space $\\Omega$, not the event $B$.' },
          { text: '$P(B) = P(B \\mid A) + P(B \\mid \\overline{A})$.', why: 'The conditional probabilities must be weighted by the priors $P(A)$ and $P(\\overline{A})$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Rewrite $P(B \\cap A)$ and $P(B \\cap \\overline{A})$ via the Chain Rule and substitute into the denominator:',
        options: [
          { text: '$P(B) = P(B \\mid A)P(A) + P(B \\mid \\overline{A})P(\\overline{A})$, giving $P(A \\mid B) = \\frac{P(B \\mid A)P(A)}{P(B \\mid A)P(A) + P(B \\mid \\overline{A})P(\\overline{A})}$.', why: 'This is the Law of Total Probability in the denominator of Bayes’ Theorem.' },
          { text: 'Cancel $P(B \\mid A)P(A)$ from numerator and denominator to get $1 / P(B \\mid \\overline{A})P(\\overline{A})$.', why: 'You cannot cancel a term across a sum in the denominator!' },
          { text: 'Set $P(\\overline{A}) = P(A)$.', why: '$P(\\overline{A}) = 1 - P(A)$, which equals $P(A)$ only when $P(A) = 0.5$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Thus $P(A \\mid B) = \\frac{P(B \\mid A)P(A)}{P(B \\mid A)P(A) + P(B \\mid \\overline{A})P(\\overline{A})}$.',
  },

  'expectation-linearity': {
    title: 'Prove using Indicator Variables that the expected number of fixed points of a random permutation is $1$',
    claim: 'For a uniformly random permutation $\\pi$ of $\\{1, 2, \\dots, n\\}$, the expected number of elements with $\\pi(i) = i$ is $E[X] = 1$ for every $n \\ge 1$.',
    strategy: 'Decompose $X = X_1 + X_2 + \\dots + X_n$ into indicators $X_i = I(\\pi(i) = i)$ and apply Linearity of Expectation.',
    givens: 'Notice that $X_i$ and $X_j$ are NOT independent (if $n = 2$, $\\pi(1) = 1 \\iff \\pi(2) = 2$), yet Linearity still applies!',
    steps: [
      {
        prompt: 'Define the indicator random variable $X_i$ for each position $i \\in \\{1, \\dots, n\\}$:',
        options: [
          { text: 'Let $X_i = 1$ if $\\pi(i) = i$ and $0$ otherwise; then the total number of fixed points is $X = \\sum_{i=1}^n X_i$.', why: 'Summing $1$ for each fixed point and $0$ for each moved point counts the total fixed points $X$ on every permutation $\\pi$.' },
          { text: 'Let $X_i = i$ if $\\pi(i) = i$.', why: 'An indicator takes values in $\\{0, 1\\}$ so its sum counts how many events occur.' },
          { text: 'Multiply $X = X_1 X_2 \\cdots X_n$.', why: 'The product is $1$ only for the identity permutation; the sum counts how many fixed points occur.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Compute $E[X_i] = P(\\pi(i) = i)$ for a single index $i$:',
        options: [
          { text: 'By symmetry, item $i$ is equally likely to land in any of the $n$ positions (or $(n-1)!/n! = 1/n$), so $E[X_i] = P(\\pi(i) = i) = \\frac{1}{n}$.', why: 'Fixing $\\pi(i) = i$ leaves $(n - 1)!$ permutations of the remaining $n - 1$ elements out of $n!$ total, giving probability $1/n$.' },
          { text: '$E[X_i] = \\frac{1}{n!}$.', why: '$1/n!$ is the probability of a single complete permutation of all $n$ elements, not just $\\pi(i) = i$.' },
          { text: '$E[X_i] = 1 - \\frac{1}{e}$.', why: '$1/e$ is the limiting probability of having ZERO fixed points across the whole permutation (derangements).' },
        ],
        answer: 0,
      },
      {
        prompt: 'Apply Linearity of Expectation to $X = \\sum_{i=1}^n X_i$:',
        options: [
          { text: '$E[X] = \\sum_{i=1}^n E[X_i] = \\sum_{i=1}^n \\frac{1}{n} = n \\cdot \\frac{1}{n} = 1$, regardless of $n$ and without needing independence.', why: 'Linearity of Expectation holds even though $X_1, \\dots, X_n$ are dependent, giving $E[X] = 1$ in three lines!' },
          { text: 'Because $X_i$ are dependent, we cannot sum $E[X_i]$.', why: 'Linearity of Expectation $E[\\sum X_i] = \\sum E[X_i]$ ALWAYS holds, whether the variables are independent or dependent!' },
          { text: '$E[X] = (1/n)^n$.', why: 'Expectation of a sum is the sum of expectations, not the product.' },
        ],
        answer: 0,
      },
    ],
    qed: 'By the Indicator Method and Linearity of Expectation, a random permutation of $n$ items has $E[X] = 1$ fixed point on average for every $n \\ge 1$.',
  },

  'boolean-karnaugh': {
    title: 'Prove the Boolean Consensus Theorem: $xy + \\bar{x}z + yz = xy + \\bar{x}z$',
    claim: 'In any Boolean algebra, the consensus term $yz$ is redundant in $xy + \\bar{x}z + yz$.',
    strategy: 'Multiply $yz$ by $1 = x + \\bar{x}$, distribute, and absorb each piece into $xy$ and $\\bar{x}z$.',
    givens: 'Use Complementarity ($x + \\bar{x} = 1$), Identity ($A \\cdot 1 = A$), and Absorption ($A + AB = A$).',
    steps: [
      {
        prompt: 'Expand the third term $yz$ using the Boolean complement law $x + \\bar{x} = 1$:',
        options: [
          { text: '$yz = 1 \\cdot yz = (x + \\bar{x})yz = xyz + \\bar{x}yz$.', why: 'And-ing $yz$ with $x + \\bar{x} = 1$ splits the consensus term into the two minterms where $x = 1$ and $x = 0$.' },
          { text: '$yz = (x \\cdot \\bar{x})yz = 0$.', why: '$x \\cdot \\bar{x} = 0$, so multiplying by $x\\bar{x}$ would change the value of $yz$.' },
          { text: '$yz = xy + \\bar{x}z$ for all $x, y, z$.', why: '$yz$ alone is not equal to $xy + \\bar{x}z$ (try $x=1, y=1, z=0$: $yz = 0 \\neq 1 = xy + \\bar{x}z$).' },
        ],
        answer: 0,
      },
      {
        prompt: 'Substitute $yz = xyz + \\bar{x}yz$ into $xy + \\bar{x}z + yz$ and regroup by Commutativity/Associativity:',
        options: [
          { text: '$xy + \\bar{x}z + xyz + \\bar{x}yz = (xy + xyz) + (\\bar{x}z + \\bar{x}yz) = xy(1 + z) + \\bar{x}z(1 + y)$.', why: 'Pairing $xyz$ with $xy$ and $\\bar{x}yz$ with $\\bar{x}z$ lets us factor out $xy$ and $\\bar{x}z$.' },
          { text: 'Factor $xyz$ out of all terms.', why: '$xy$ does not contain $z$, and $\\bar{x}z$ does not contain $y$.' },
          { text: 'Cancel $x$ and $\\bar{x}$ to get $2yz$.', why: 'Boolean OR is idempotent ($A + A = A$), and $x$ vs. $\\bar{x}$ are multiplied by different variables ($y$ vs. $z$).' },
        ],
        answer: 0,
      },
      {
        prompt: 'Apply Domination ($1 + A = 1$) and Identity ($B \\cdot 1 = B$):',
        options: [
          { text: 'Since $1 + z = 1$ and $1 + y = 1$, $xy(1 + z) + \\bar{x}z(1 + y) = xy \\cdot 1 + \\bar{x}z \\cdot 1 = xy + \\bar{x}z$.', why: 'On a Karnaugh map, the two $1$-cells of $yz$ are already covered by the $xy$ group and the $\\bar{x}z$ group!' },
          { text: 'Since $1 + z = z$, the expression equals $xyz + \\bar{x}yz = yz$.', why: 'In Boolean algebra, $1 + z = 1$ (Domination of OR), not $z$.' },
          { text: 'The expression simplifies to $1$.', why: 'If $y = 0$ and $z = 0$, $xy + \\bar{x}z = 0 \\neq 1$.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Therefore $xy + \\bar{x}z + yz = xy + \\bar{x}z$: the consensus term $yz$ is completely absorbed.',
  },

  'automata-languages': {
    title: 'Prove by the Pumping Lemma that $L = \\{0^n 1^n : n \\ge 0\\}$ is not regular',
    claim: 'No Deterministic Finite Automaton (DFA) can recognize the language $L = \\{0^n 1^n : n \\ge 0\\}$.',
    strategy: 'Proof by contradiction using the Pumping Lemma (which itself follows from the Pigeonhole Principle on DFA states).',
    givens: 'If $L$ were regular with $p$-state DFA, then every string $w \\in L$ with $|w| \\ge p$ would split as $w = xyz$ with $|xy| \\le p$, $|y| \\ge 1$, and $xy^k z \\in L$ for all $k \\ge 0$.',
    steps: [
      {
        prompt: 'Suppose for contradiction that $L$ is regular with pumping length $p \\ge 1$, and choose the test string $w = 0^p 1^p \\in L$:',
        options: [
          { text: 'Since $|w| = 2p \\ge p$, the first $p + 1$ prefixes while reading $0^p$ must revisit some state by the Pigeonhole Principle, giving a non-empty loop $y$ inside the first $p$ characters ($|xy| \\le p, |y| \\ge 1$).', why: 'A $p$-state DFA reading $p$ zeros goes through $p + 1$ state visits ($q_0, q_1, \\dots, q_p$), forcing a repeated state and hence a loop $y$.' },
          { text: 'Choose $w = 01$, which has length $2$.', why: 'The test string $w$ must have length $|w| \\ge p$ for arbitrary $p$, so $w = 0^p 1^p$ is required.' },
          { text: 'Assume $y$ consists of equal numbers of $0$s and $1$s.', why: 'Because $|xy| \\le p$ and the first $p$ symbols of $w = 0^p 1^p$ are ALL $0$s, $y$ cannot contain any $1$s!' },
        ],
        answer: 0,
      },
      {
        prompt: 'Use the constraint $|xy| \\le p$ and $|y| \\ge 1$ on $w = 0^p 1^p$ to determine the exact shape of $y$:',
        options: [
          { text: 'Since the first $p$ symbols of $w = 0^p 1^p$ are all $0$s and $|xy| \\le p$, the loop $y$ consists purely of $0$s: $y = 0^m$ for some $m \\ge 1$.', why: '$xy$ lies entirely within the $0^p$ prefix, so $y$ adds only $0$s and zero $1$s.' },
          { text: '$y = 1^m$ for some $m \\ge 1$.', why: 'The $1$s begin at position $p + 1$, outside the prefix $xy$ of length $\\le p$.' },
          { text: '$y = \\varepsilon$ (the empty string).', why: 'A cycle between distinct step indices has length $|y| \\ge 1$.' },
        ],
        answer: 0,
      },
      {
        prompt: 'Pump $y = 0^m$ to $k = 2$ copies ($xy^2 z$) to obtain the contradiction:',
        options: [
          { text: 'Pumping to $k = 2$ gives $xy^2 z = 0^{p+m} 1^p$; since $m \\ge 1$, $p + m \\neq p$, so $xy^2 z \\notin L$, contradicting that $xy^k z \\in L$ for all $k \\ge 0$.', why: 'Repeating the loop $y$ adds $m \\ge 1$ extra $0$s without adding any $1$s, breaking the balance $0^n 1^n$.' },
          { text: 'Pump to $k = 1$ to get $xyz = 0^p 1^p \\notin L$.', why: 'At $k = 1$, $xyz = w = 0^p 1^p$ IS in $L$; we must pump to $k \\neq 1$ (such as $k = 2$ or $k = 0$) to break the balance.' },
          { text: 'Therefore $L$ is uncountable.', why: '$L = \\{0^n 1^n : n \\ge 0\\}$ is countably infinite (indexed by $n \\in \\mathbb{N}$), just not regular.' },
        ],
        answer: 0,
      },
    ],
    qed: 'Every $p$-state DFA fails on $w = 0^p 1^p$, so $L = \\{0^n 1^n : n \\ge 0\\}$ is not regular.',
  },
}
