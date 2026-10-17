// Part 1: Propositional & Predicate Logic — the grammar of mathematical truth.
// Every numerical prediction is computed live by `engine/discrete.js`.
import { countTrueRows2, countTrueRows3 } from '../engine/discrete.js'

export const PART1 = {
  id: 'logic-foundations',
  title: 'Part [[#part:logic-foundations]] · Propositional & predicate logic',
  lessons: [
    {
      id: 'propositions',
      title: 'Statements that are definitely true or false: ¬, ∧, ∨, ⊕',
      goal: 'Distinguish a mathematical proposition from an open sentence or command, translate English connectives into $\\neg, \\wedge, \\vee, \\oplus$, and build a $2^n$-row truth table.',
      builds: [],
      blocks: [
        { h: 'Welcome to Discrete Mathematics' },
        {
          md: `Continuous mathematics—calculus and real analysis—studies things that slide smoothly: time, curves, and limits. **Discrete mathematics** studies things that come in **distinct, separate pieces**: true or false, whole numbers, sets of objects, choices, Prime factors, network connections, and steps of an algorithm.

This lab builds the entire subject from the ground up, **one symbol and one idea at a time**, across eight parts:

1. **Propositional & predicate logic** (Part [[#part:logic-foundations]]): how truth works, why $p \\Rightarrow q$ means what it does, De Morgan's laws, quantifiers $\\forall$ and $\\exists$, and valid rules of inference.
2. **The craft of mathematical proof** (Part [[#part:proof-craft]]): counterexamples, direct proofs, contrapositive, parity invariants, contradiction, and weak & strong mathematical induction.
3. **Sets, relations, functions & infinity** (Part [[#part:sets-relations]]): set operations, power sets, injections/surjections/bijections, equivalence relations, Hasse diagrams, and Cantor's diagonal argument.
4. **Combinatorics & the art of counting** (Part [[#part:combinatorics]]): sum & product rules, permutations, Pascal's triangle, Stars-and-Bars, Inclusion–Exclusion, derangements, and the Pigeonhole Principle.
5. **Number theory & cryptography** (Part [[#part:number-theory]]): primes, Euclid's GCD & Bézout's identity, modular clock arithmetic, the Chinese Remainder Theorem, and full RSA encryption.
6. **Sequences, recurrences & asymptotics** (Part [[#part:recurrences-asymptotics]]): telescoping sums, Fibonacci & characteristic roots, the Master Theorem, generating functions, Catalan numbers, and Big-$\\mathcal{O}$.
7. **Graph theory, trees & networks** (Part [[#part:graph-theory]]): the Handshaking Lemma, bipartite graphs, Eulerian trails, trees & Kruskal's MST, planar graphs ($V - E + F = 2$), and graph coloring.
8. **Discrete probability, Boolean circuits & automata** (Part [[#part:probability-automata]]): Bayes' theorem, linearity of expectation, Karnaugh maps, and Finite State Machines (DFAs).

At any moment you can open **🧩 Puzzles & Challenges** to test your intuition on interactive logic, tiling, graph, and modular puzzles, or open **🔣 Symbol & Theorem Decoder** to look up any symbol in plain words.`,
        },
        { h: 'What makes a sentence a proposition?' },
        {
          md: `Mathematics begins with sentences that have an unambiguous truth value. A **proposition** is a declarative statement that is either **True ($T$)** or **False ($F$)**—never both, and never neither.

- $"17 \\text{ is a prime number}"$ is a proposition (it is **True**).
- $"2 + 5 = 9"$ is a proposition (it is **False**).
- $"\\text{Close the door!}"$ and $"\\text{Is } n \\text{ even?}"$ are **not** propositions—commands and questions cannot be true or false.
- $"x + 3 = 10"$ is **not yet** a proposition because its truth depends on what $x$ is. We call it a **predicate** or open sentence (we will tame variables like $x$ in lesson [[#quantifiers]]).

Just as algebra uses letters $x, y, z$ for unknown numbers, logic uses **propositional variables** $p, q, r$ for statements whose truth value can be $T$ or $F$. Then we combine them using **logical connectives**:`,
        },
        {
          symbols: [
            ['\\neg p', 'not p (negation)', 'Flips the truth value: True when $p$ is False, False when $p$ is True', 'Also written $\\sim p$ or $\\bar{p}$'],
            ['p \\wedge q', 'p and q (conjunction)', 'True **only** when both $p$ and $q$ are True', 'Tip: $\\wedge$ looks like the **A** in AND'],
            ['p \\vee q', 'p or q (disjunction)', '**Inclusive OR**: True when $p$ is True, $q$ is True, **or both** are True', 'False only when both $p$ and $q$ are False'],
            ['p \\oplus q', 'p xor q (exclusive or)', 'True when **exactly one** of $p, q$ is True, False when both match', 'Soup OR salad (not both)'],
          ],
        },
        {
          md: `Why does mathematical "or" ($\\vee$) include "both"? Because if a job posting asks for someone who *"knows calculus **or** linear algebra"*, they certainly won't reject a candidate who knows **both**! When you genuinely mean *"one or the other, but not both"*, mathematics uses a separate symbol: **exclusive or**, written $p \\oplus q$.

Because each variable has $2$ possible truth values ($T$ or $F$), a compound formula with $n$ variables has $2 \\times 2 \\times \\dots \\times 2 = 2^n$ possible combinations of inputs. A **truth table** lists every combination systematically so no case is ever missed.`,
        },
        {
          figure: 'TruthTableFig',
          caption: 'Toggle $p$ and $q$, or switch between 2-variable and 3-variable compound formulas to inspect every row of the truth table.',
        },
        {
          worked: {
            title: 'Evaluating $\\neg p \\wedge (p \\vee q)$ for every possible $(p, q)$',
            steps: [
              ['Row 1 ($T, T$)', '$\\neg T \\wedge (T \\vee T) = F \\wedge T = F$', 'Since $p$ is $T$, $\\neg p$ is immediately $F$, killing the conjunction'],
              ['Row 2 ($T, F$)', '$\\neg T \\wedge (T \\vee F) = F \\wedge T = F$', 'Again $\\neg p = F$ makes the whole $\\wedge$ false'],
              ['Row 3 ($F, T$)', '$\\neg F \\wedge (F \\vee T) = T \\wedge T = T$', '$p$ is False (so $\\neg p = T$) AND $q$ is True (so $p \\vee q = T$)'],
              ['Row 4 ($F, F$)', '$\\neg F \\wedge (F \\vee F) = T \\wedge F = F$', '$\\neg p$ is $T$, but neither $p$ nor $q$ holds so $p \\vee q = F$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'A compound proposition is built from $n = 4$ propositional variables ($p, q, r, s$). How many rows does its complete truth table have?',
            answer: 16,
            compute: () => 2 ** 4,
            explain: 'Each of the 4 variables independently takes 2 values ($T$ or $F$), giving $2^4 = 16$ rows.',
            misconceptions: [
              { answer: 8, feedback: 'That is $2 \\times 4$ (or $2^3$). Each new variable doubles the table: $2^4 = 16$.' },
            ],
          },
        },
        {
          predict: {
            prompt: 'In the 4-row truth table for $(p \\vee q) \\wedge \\neg(p \\wedge q)$ (which defines $p \\oplus q$), how many rows evaluate to **True**?',
            answer: countTrueRows2((p, q) => (p || q) && !(p && q)),
            compute: () => countTrueRows2((p, q) => (p || q) && !(p && q)),
            explain: 'It is True when $(p, q)$ is $(T, F)$ or $(F, T)$, and False on $(T, T)$ and $(F, F)$: exactly **2** rows.',
          },
        },
        {
          predict: {
            prompt: 'In the 8-row truth table for $(p \\wedge q) \\vee (\\neg p \\wedge r)$ over $(p, q, r)$, how many of the 8 rows evaluate to **True**?',
            answer: countTrueRows3((p, q, r) => (p && q) || (!p && r)),
            compute: () => countTrueRows3((p, q, r) => (p && q) || (!p && r)),
            explain: 'When $p = T$, we need $q = T$ ($r$ can be $T$ or $F$: 2 rows). When $p = F$, we need $r = T$ ($q$ can be $T$ or $F$: 2 rows). Total: $2 + 2 = 4$ rows.',
          },
        },
        {
          choice: {
            prompt: 'Suppose $p$ is **False** and $q$ is **True**. Which of the following compound propositions is **False**?',
            options: [
              { text: '$p \\wedge \\neg q$', why: 'Since $p$ is False and $\\neg q$ is False, $F \\wedge F = F$.' },
              { text: '$p \\vee q$', why: 'Inclusive OR only needs at least one True input: $F \\vee T = T$.' },
              { text: '$\\neg p \\wedge q$', why: '$\\neg p$ is True and $q$ is True, so $T \\wedge T = T$.' },
              { text: '$p \\oplus q$', why: 'Exactly one of $p, q$ is True, so $F \\oplus T = T$.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Why is the sentence *"This statement is false"* (the Liar Paradox) **not** a valid mathematical proposition?',
            options: [
              { text: 'If it were True it would have to be False, and if it were False it would have to be True, so no consistent truth value can be assigned', why: 'Yes. A proposition must have one definite, non-contradictory truth value ($T$ or $F$).' },
              { text: 'Because propositions cannot talk about words, only about numbers', why: 'Propositions can be about anything (graphs, sets, sentences) as long as they have a definite truth value.' },
              { text: 'Because it contains a negation', why: 'Negation is a standard logical connective.' },
            ],
            answer: 0,
          },
        },
        {
          puzzle: {
            id: 'knights',
            title: 'Knights & Knaves Truth Detective',
            desc: 'Put truth tables to work interrogating islanders who always tell the truth (T) or always lie (F).',
          },
        },
        {
          note: 'A **proposition** has a single definite truth value ($T$ or $F$). With $n$ variables, a truth table has $2^n$ rows. Remember the difference between inclusive $\\vee$ (at least one True) and exclusive $\\oplus$ (exactly one True).',
        },
      ],
    },

    {
      id: 'implication',
      title: 'If p then q: why "false implies anything" is true',
      goal: 'Explain the truth table of $p \\Rightarrow q$ as a contract, distinguish the converse and inverse from the contrapositive $\\neg q \\Rightarrow \\neg p$, and read $p \\Leftrightarrow q$ as "necessary and sufficient".',
      builds: ['propositions'],
      blocks: [
        { h: 'Implication as a promise that can only be broken one way' },
        {
          md: `Almost every theorem in mathematics has the shape **"If $p$, then $q$"**, written $p \\Rightarrow q$ (or $p \\to q$). Here $p$ is the **hypothesis** (or antecedent) and $q$ is the **conclusion** (or consequent).

Beginners are always surprised by the bottom two rows of the truth table for $p \\Rightarrow q$: when $p$ is **False**, $p \\Rightarrow q$ is **True** regardless of $q$! Why?

Think of $p \\Rightarrow q$ as a **contract** or promise:
> *"If it rains today ($p$), then I will bring an umbrella ($q$)."*

When have I **lied** to you (broken my promise)?
- **Case 1 ($p = T, q = T$):** It rained, and I brought an umbrella. Promise kept ($T$).
- **Case 2 ($p = T, q = F$):** It rained, and I showed up with no umbrella. **Promise broken ($F$)!**
- **Case 3 ($p = F, q = T$):** It did **not** rain, and I brought an umbrella anyway (maybe for shade). Did I break my promise about rain? **No ($T$).**
- **Case 4 ($p = F, q = F$):** It did **not** rain, and I didn't bring an umbrella. Promise still unbroken ($T$).

A conditional statement $p \\Rightarrow q$ makes no claim about what happens when $p$ is false. When $p$ is false, we say $p \\Rightarrow q$ is **vacuously true**.`,
        },
        {
          symbols: [
            ['p \\Rightarrow q', 'if p then q / p implies q', 'False **only** when $p$ is True and $q$ is False; equivalent to $\\neg p \\vee q$', '"$p$ is sufficient for $q$"; "$q$ is necessary for $p$"'],
            ['q \\Rightarrow p', 'converse of p ⇒ q', 'Swaps hypothesis and conclusion; **not** equivalent to $p \\Rightarrow q$', '"If the ground is wet, it rained" (could be a sprinkler!)'],
            ['\\neg q \\Rightarrow \\neg p', 'contrapositive of p ⇒ q', 'Flips **and** negates both sides; **logically equivalent** to $p \\Rightarrow q$', '"If I have no umbrella, it is not raining"'],
            ['p \\Leftrightarrow q', 'p if and only if q (iff)', 'True when $p$ and $q$ have the **same** truth value: $(p \\Rightarrow q) \\wedge (q \\Rightarrow p)$', 'Written "iff"; "$p$ is necessary and sufficient for $q$"'],
          ],
        },
        {
          figure: 'ImplicationContractFig',
          caption: 'Explore all four cases of the contract $p \\Rightarrow q$, and compare its truth column side-by-side with its Converse ($q \\Rightarrow p$), Inverse ($\\neg p \\Rightarrow \\neg q$), and Contrapositive ($\\neg q \\Rightarrow \\neg p$).',
        },
        {
          md: `Look carefully at the four relatives of $p \\Rightarrow q$:

1. **Original ($p \\Rightarrow q$)** and **Contrapositive ($\\neg q \\Rightarrow \\neg p$)** have the **exact same truth table** (both fail only when $p = T, q = F$). Proving one automatically proves the other!
2. **Converse ($q \\Rightarrow p$)** and **Inverse ($\\neg p \\Rightarrow \\neg q$)** are contrapositives of *each other* (both fail only when $p = F, q = T$), so they match each other—but they do **not** match the original $p \\Rightarrow q$.

In mathematical English, pay close attention to **"only if"**:
- *"p **if** q"* means $q \\Rightarrow p$.
- *"p **only if** q"* means $p \\Rightarrow q$! Why? Saying *"You can pass the exam ($p$) **only if** you score at least 50 ($q$)"* means that if you didn't score 50 ($\\neg q$), you cannot pass ($\\neg p$)—which is $\\neg q \\Rightarrow \\neg p \\equiv p \\Rightarrow q$.
- Putting both together gives *"p **if and only if** q"* ($p \\Leftrightarrow q$).`,
        },
        {
          worked: {
            title: 'Why $p \\Rightarrow q$ is identical to $\\neg p \\vee q$',
            steps: [
              ['Break the promise', '$p \\wedge \\neg q$', 'The single scenario where $p \\Rightarrow q$ is False ($p$ holds, $q$ fails)'],
              ['Negate the failure', '$\\neg(p \\wedge \\neg q)$', '$p \\Rightarrow q$ is True whenever the promise is NOT broken'],
              ['Rewrite with $\\vee$', '$\\neg p \\vee q$', 'Either the condition $p$ never triggered ($\\neg p$), or the conclusion $q$ held'],
            ],
          },
        },
        {
          predict: {
            prompt: 'In the 4-row truth table for $(p \\Rightarrow q)$, how many rows evaluate to **True**?',
            answer: countTrueRows2((p, q) => !p || q),
            compute: () => countTrueRows2((p, q) => !p || q),
            explain: 'Every row except $(p = T, q = F)$ is True, so **3** of the 4 rows are True.',
            misconceptions: [
              { answer: 1, feedback: 'Only $(T, T)$ has both $p$ and $q$ true, but $(F, T)$ and $(F, F)$ are vacuously true for $p \\Rightarrow q$.' },
              { answer: 2, feedback: 'Don\'t forget $(F, T)$: if the hypothesis $p$ is False, the implication is still True.' },
            ],
          },
        },
        {
          predict: {
            prompt: 'How many rows of the 8-row truth table for $(p \\Rightarrow q) \\Rightarrow r$ evaluate to **False**?',
            answer: 8 - countTrueRows3((p, q, r) => !(!p || q) || r),
            compute: () => 8 - countTrueRows3((p, q, r) => !(!p || q) || r),
            explain: 'An implication $A \\Rightarrow r$ is False only when $A = (p \\Rightarrow q)$ is True (which happens in 3 of the 4 $(p,q)$ pairs) AND $r$ is False (1 choice). So $3 \\times 1 = 3$ rows are False! Notice that $(p \\Rightarrow q) \\Rightarrow r$ is NOT associative with $p \\Rightarrow (q \\Rightarrow r)$.',
          },
        },
        {
          choice: {
            prompt: 'Consider the theorem: *"If $n^2$ is odd, then $n$ is odd."* Which statement below is its **contrapositive** (and therefore logically equivalent to it)?',
            options: [
              { text: 'If $n$ is even, then $n^2$ is even.', why: 'Yes! Negating "$n$ is odd" gives "$n$ is even" ($\\neg q$), and negating "$n^2$ is odd" gives "$n^2$ is even" ($\\neg p$), so $\\neg q \\Rightarrow \\neg p$ is "If $n$ is even, then $n^2$ is even."' },
              { text: 'If $n$ is odd, then $n^2$ is odd.', why: 'That is the **converse** ($q \\Rightarrow p$), which swaps without negating.' },
              { text: 'If $n^2$ is even, then $n$ is even.', why: 'That is the **inverse** ($\\neg p \\Rightarrow \\neg q$), which negates without swapping.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'A security policy states: *"A user can access the server ($p$) **only if** they have a hardware key ($q$)."* Which symbolic formula captures this rule?',
            options: [
              { text: '$p \\Rightarrow q$', why: 'Yes. "Only if $q$" means $q$ is a **necessary** condition for $p$: if they don\'t have a hardware key ($\\neg q$), they cannot access the server ($\\neg p$), which is $\\neg q \\Rightarrow \\neg p \\equiv p \\Rightarrow q$.' },
              { text: '$q \\Rightarrow p$', why: 'That would mean anyone with a hardware key automatically gets access (even with a wrong password!). Having the key is necessary, not necessarily sufficient on its own.' },
              { text: '$p \\oplus q$', why: 'Exclusive OR would forbid having both server access and a hardware key!' },
            ],
            answer: 0,
          },
        },
        {
          note: '$p \\Rightarrow q$ fails **only** when $p$ is True and $q$ is False ($p \\Rightarrow q \\equiv \\neg p \\vee q$). Its **contrapositive** $\\neg q \\Rightarrow \\neg p$ means the exact same thing; its **converse** $q \\Rightarrow p$ and **inverse** $\\neg p \\Rightarrow \\neg q$ do not.',
        },
      ],
    },

    {
      id: 'equivalences',
      title: 'Logical equivalence (≡), De Morgan’s laws, and tautologies',
      goal: 'Recognize tautologies and contradictions, apply De Morgan’s laws $\\neg(p \\wedge q) \\equiv \\neg p \\vee \\neg q$ and distributive laws, and simplify compound formulas without writing a huge truth table.',
      builds: ['implication'],
      blocks: [
        { h: 'When two different formulas say the exact same thing' },
        {
          md: `In algebra, $(x + 1)^2$ and $x^2 + 2x + 1$ look different on paper, but they produce the exact same number for every $x$. Logic has the same idea: two compound propositions $A$ and $B$ are **logically equivalent**, written $A \\equiv B$, if they have the **exact same truth value in every row** of their truth table.

Every formula falls into one of three categories based on its truth column:
- A **tautology** ($\\top$) is **always True** in every row—for example, the Law of the Excluded Middle $p \\vee \\neg p$.
- A **contradiction** ($\\bot$) is **always False** in every row—for example, $p \\wedge \\neg p$.
- A **contingency** is True in some rows and False in others.

Notice the connection: $A \\equiv B$ holds if and only if the biconditional $A \\Leftrightarrow B$ is a **tautology**!`,
        },
        {
          symbols: [
            ['A \\equiv B', 'A is logically equivalent to B', '$A$ and $B$ have identical truth tables ($A \\Leftrightarrow B$ is a tautology)', '$p \\Rightarrow q \\equiv \\neg p \\vee q$'],
            ['\\top,\\;\\bot', 'top (tautology), bottom (contradiction)', 'Always True ($\\top$); always False ($\\bot$)', '$p \\vee \\neg p \\equiv \\top$, $p \\wedge \\neg p \\equiv \\bot$'],
            ['\\neg(p \\wedge q) \\equiv \\neg p \\vee \\neg q', 'De Morgan\'s First Law', 'Negating an AND flips it to an OR of the negations', 'Not (tall and rich) $\\equiv$ not tall OR not rich'],
            ['\\neg(p \\vee q) \\equiv \\neg p \\wedge \\neg q', 'De Morgan\'s Second Law', 'Negating an OR flips it to an AND of the negations', 'Neither rain nor snow $\\equiv$ no rain AND no snow'],
          ],
        },
        {
          md: `**De Morgan's Laws** are the most used identities in all of discrete math and programming. Why do you have to flip $\\wedge$ to $\\vee$ when you push $\\neg$ inside parentheses?

Suppose a roller coaster requires: **"You must be at least 140 cm tall ($p$) AND at least 10 years old ($q$)."**
Who gets turned away ($\\neg(p \\wedge q)$)? Anyone who is **under 140 cm ($\neg p$) OR under 10 years old ($\neg q$)**! You do not need to fail *both* requirements to be rejected—failing *either one* breaks the AND.`,
        },
        {
          figure: 'DeMorganFig',
          caption: 'Compare the truth tables of De Morgan’s laws, absorption, and distributive laws, and step through algebraic logic simplification.',
        },
        {
          worked: {
            title: 'Simplifying $\\neg(p \\Rightarrow q)$ using equivalence laws',
            steps: [
              ['Start', '$\\neg(p \\Rightarrow q)$', 'We want to know what it means for "If $p$ then $q$" to be **false**'],
              ['Implication Law', '$\\equiv \\neg(\\neg p \\vee q)$', 'Replace $p \\Rightarrow q$ with its equivalent $\\neg p \\vee q$'],
              ['De Morgan\'s Law', '$\\equiv \\neg(\\neg p) \\wedge \\neg q$', 'Push $\\neg$ inside: negate both terms and flip $\\vee$ to $\\wedge$'],
              ['Double Negation', '$\\equiv p \\wedge \\neg q$', '$\neg(\\neg p) \\equiv p$. An implication fails iff $p$ holds AND $q$ fails!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'Consider the formula $((p \\Rightarrow q) \\wedge p) \\Rightarrow q$ over $(p, q)$. How many of its 4 truth-table rows evaluate to **True**?',
            answer: countTrueRows2((p, q) => !((!p || q) && p) || q),
            compute: () => countTrueRows2((p, q) => !((!p || q) && p) || q),
            explain: 'All **4** rows! It is a **tautology** (in fact, it is the logical backbone of *Modus Ponens*).',
          },
        },
        {
          predict: {
            prompt: 'Using the Absorption Law, $p \\vee (p \\wedge q)$ simplifies to just $p$. In an 8-row truth table over $(p, q, r)$, how many rows make $p \\vee (p \\wedge q) \\vee (p \\wedge r)$ **True**?',
            answer: countTrueRows3((p, q, r) => p || (p && q) || (p && r)),
            compute: () => countTrueRows3((p, q, r) => p || (p && q) || (p && r)),
            explain: 'By absorption twice, $p \\vee (p \\wedge q) \\vee (p \\wedge r) \\equiv p$. Since $p$ is True in half of the 8 rows, the answer is **4**.',
          },
        },
        {
          choice: {
            prompt: 'What is the negation of the statement: *"x > 0 and (y = 1 or z = 2)"*?',
            options: [
              { text: '$x \\le 0 \\text{ or } (y \\ne 1 \\text{ and } z \\ne 2)$', why: 'Yes! Apply De Morgan twice: $\\neg(A \\wedge (B \\vee C)) \\equiv \\neg A \\vee \\neg(B \\vee C) \\equiv \\neg A \\vee (\\neg B \\wedge \\neg C)$.' },
              { text: '$x \\le 0 \\text{ and } (y \\ne 1 \\text{ and } z \\ne 2)$', why: 'That forgets to flip the outer "and" into an "or" when pushing the negation inside.' },
              { text: '$x \\le 0 \\text{ or } (y \\ne 1 \\text{ or } z \\ne 2)$', why: 'That flips the outer "and" to "or", but forgets to flip the inner "or" to "and".' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Which law justifies simplifying $(p \\wedge q) \\vee (p \\wedge \\neg q)$ directly to $p$?',
            options: [
              { text: 'Distributive law ($p \\wedge (q \\vee \\neg q)$), followed by negation ($q \\vee \\neg q \\equiv \\top$) and identity ($p \\wedge \\top \\equiv p$)', why: 'Yes: just like factoring $a\\cdot b + a\\cdot c = a(b+c)$ in ordinary algebra, $\\wedge$ distributes over $\\vee$ (and $\\vee$ distributes over $\\wedge$!).' },
              { text: 'De Morgan\'s Law alone', why: 'De Morgan\'s Law pushes a negation across $\\wedge$ or $\\vee$; here we are factoring out a common $p$.' },
              { text: 'Contrapositive Law', why: 'Contrapositive applies to $p \\Rightarrow q$, not a disjunction of conjunctions.' },
            ],
            answer: 0,
          },
        },
        {
          note: '**De Morgan\'s Laws** say $\\neg(p \\wedge q) \\equiv \\neg p \\vee \\neg q$ and $\\neg(p \\vee q) \\equiv \\neg p \\wedge \\neg q$. Crucially, $\\neg(p \\Rightarrow q) \\equiv p \\wedge \\neg q$: the negation of an "if…then" is **not** another "if…then"—it is "$p$ happened and $q$ failed".',
          kind: 'warn',
        },
      ],
    },

    {
      id: 'quantifiers',
      title: 'For all (∀) and there exists (∃): logic over whole domains',
      goal: 'Evaluate quantified statements $\\forall x\\,P(x)$ and $\\exists x\\,P(x)$ on a given domain, distinguish $\\forall x\\,\\exists y$ from $\\exists y\\,\\forall x$, and negate any quantified formula.',
      builds: ['equivalences'],
      blocks: [
        { h: 'Turning open predicates into propositions' },
        {
          md: `Earlier we saw that $P(x): "x^2 > x"$ is not a proposition until we say what $x$ is. A **predicate** $P(x)$ is a property that becomes True or False once you plug in a specific element $x$ from a **domain of discourse** $D$ (such as the integers $\\mathbb{Z}$ or the real numbers $\\mathbb{R}$).

There are two fundamental ways to bind the variable $x$ across a whole domain $D$:
- **Universal quantifier ($\\forall x \\in D, P(x)$):** *"For all $x$ in $D$, $P(x)$ holds."* On a finite domain $D = \\{x_1, x_2, \\dots, x_n\\}$, this is one giant **AND**:
  $$\\forall x \\in D, P(x) \\;\\equiv\\; P(x_1) \\wedge P(x_2) \\wedge \\dots \\wedge P(x_n)$$
- **Existential quantifier ($\\exists x \\in D, P(x)$):** *"There exists at least one $x$ in $D$ such that $P(x)$ holds."* On a finite domain, this is one giant **OR**:
  $$\\exists x \\in D, P(x) \\;\\equiv\\; P(x_1) \\vee P(x_2) \\vee \\dots \\vee P(x_n)$$`,
        },
        {
          symbols: [
            ['\\forall x \\in D,\\;P(x)', 'for all x in D, P of x', 'True if $P(x)$ holds for **every** member of $D$; one counterexample makes it False', 'Tip: $\\forall$ is an upside-down **A** for **All**'],
            ['\\exists x \\in D,\\;P(x)', 'there exists x in D such that P of x', 'True if $P(x)$ holds for **at least one** member of $D$ (one witness proves it)', 'Tip: $\\exists$ is a backwards **E** for **Exists**'],
            ['\\exists! x \\in D,\\;P(x)', 'there exists a unique x', 'True if $P(x)$ holds for **exactly one** member of $D$', '$\\exists! x \\in \\mathbb{N},\\;x \\text{ is an even prime}$ ($x=2$)'],
            ['\\neg(\\forall x\\,P(x)) \\equiv \\exists x\\,\\neg P(x)', 'De Morgan for quantifiers', 'Saying "not everyone passed" is the same as "someone failed"', 'Also $\\neg(\\exists x\\,P(x)) \\equiv \\forall x\\,\\neg P(x)$'],
          ],
        },
        {
          md: `Because $\\forall$ is a generalized $\\wedge$ and $\\exists$ is a generalized $\\vee$, **De Morgan's Laws work on quantifiers too**: when you push $\\neg$ past a quantifier, **$\\forall$ flips to $\\exists$** and **$\\exists$ flips to $\\forall$**!

What happens when we **nest** two different quantifiers? **Order matters enormously!**
Compare these two statements about a relation $L(x, y)$ ("person $x$ loves person $y$"):
1. $\\forall x\\,\\exists y\\,L(x, y)$: *"For every person $x$, there is someone $y$ whom $x$ loves."* Here $y$ is chosen **after** $x$, so each person $x$ can pick their **own** $y$.
2. $\\exists y\\,\\forall x\\,L(x, y)$: *"There is one single person $y$ whom **every** person $x$ loves."* Here $y$ must be chosen **first**, before knowing $x$, so one universal $y$ must work for everyone at once!`,
        },
        {
          figure: 'QuantifierGridFig',
          caption: 'Toggle cells $(x, y)$ in the relation grid to see when $\\forall x\\,\\exists y\\,R(x,y)$ (every row has a dot) holds versus $\\exists y\\,\\forall x\\,R(x,y)$ (one single column is completely full).',
        },
        {
          worked: {
            title: 'Negating the formal definition of a limit / bounded sequence',
            steps: [
              ['Original statement', '$\\forall \\varepsilon > 0,\\;\\exists N \\in \\mathbb{N},\\;\\forall n \\ge N,\\;|a_n - L| < \\varepsilon$', 'Every tolerance $\\varepsilon$ has a cutoff $N$ beyond which all terms stay within $\\varepsilon$ of $L$'],
              ['Push $\\neg$ past $\\forall \\varepsilon$', '$\\exists \\varepsilon > 0,\\;\\neg(\\exists N \\in \\mathbb{N},\\;\\forall n \\ge N,\\;|a_n - L| < \\varepsilon)$', 'Flip $\\forall \\varepsilon$ to $\\exists \\varepsilon$'],
              ['Push $\\neg$ past $\\exists N$', '$\\exists \\varepsilon > 0,\\;\\forall N \\in \\mathbb{N},\\;\\neg(\\forall n \\ge N,\\;|a_n - L| < \\varepsilon)$', 'Flip $\\exists N$ to $\\forall N$'],
              ['Push $\\neg$ past $\\forall n$', '$\\exists \\varepsilon > 0,\\;\\forall N \\in \\mathbb{N},\\;\\exists n \\ge N,\\;|a_n - L| \\ge \\varepsilon$', 'Flip $\\forall n$ to $\\exists n$, and negate $<$ to $\\ge$!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'On the finite domain $D = \\{-2, -1, 0, 1, 2, 3\\}$, how many elements $x \\in D$ satisfy the predicate $P(x): x^2 - x \\le 2$?',
            answer: [-2, -1, 0, 1, 2, 3].filter(x => x * x - x <= 2).length,
            compute: () => [-2, -1, 0, 1, 2, 3].filter(x => x * x - x <= 2).length,
            explain: 'Test each $x$: for $-1, 0, 1, 2$, we get $x^2 - x = 2, 0, 0, 2 \\le 2$. For $-2$ and $3$, we get $6 > 2$. So **4** elements satisfy $P(x)$ (meaning $\\exists x\\,P(x)$ is True, while $\\forall x\\,P(x)$ is False).',
          },
        },
        {
          predict: {
            prompt: 'Let $D = \\{1, 2, 3, 4\\}$. How many ordered pairs $(x, y) \\in D \\times D$ satisfy $x + y = 5$? (Notice this shows $\\forall x \\in D,\\,\\exists! y \\in D,\\,x + y = 5$.)',
            answer: [1, 2, 3, 4].flatMap(x => [1, 2, 3, 4].filter(y => x + y === 5)).length,
            compute: () => [1, 2, 3, 4].flatMap(x => [1, 2, 3, 4].filter(y => x + y === 5)).length,
            explain: 'The pairs are $(1,4), (2,3), (3,2), (4,1)$: exactly **4** pairs, one unique $y = 5 - x$ for each of the 4 choices of $x$.',
          },
        },
        {
          choice: {
            prompt: 'Over the domain of all integers $\\mathbb{Z}$, compare $S_1: \\forall x\\,\\exists y\\,(x + y = 0)$ and $S_2: \\exists y\\,\\forall x\\,(x + y = 0)$. Which is true?',
            options: [
              { text: '$S_1$ is True (each integer $x$ has its own additive inverse $y = -x$), while $S_2$ is False (no single $y$ adds to 0 with every integer $x$)', why: 'Yes! In $S_1$, $y$ can depend on $x$ ($y = -x$). In $S_2$, one fixed $y$ would have to satisfy $1 + y = 0$ and $2 + y = 0$ simultaneously, which is impossible.' },
              { text: 'Both $S_1$ and $S_2$ are True', why: '$S_2$ requires a single integer $y$ that works for all $x$ at the same time.' },
              { text: 'Both $S_1$ and $S_2$ are False', why: '$S_1$ is True because for any given $x$, we can pick $y = -x$.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'How do you correctly write *"Every prime number greater than 2 is odd"* using a domain of all positive integers $\\mathbb{Z}^+$?',
            options: [
              { text: '$\\forall n \\in \\mathbb{Z}^+,\\;(\\text{Prime}(n) \\wedge n > 2) \\Rightarrow \\text{Odd}(n)$', why: 'Yes! Universal quantifiers restrict their domain using **implication ($\\Rightarrow$)**, meaning "if $n$ is a prime above 2, then $n$ is odd."' },
              { text: '$\\forall n \\in \\mathbb{Z}^+,\\;\\text{Prime}(n) \\wedge n > 2 \\wedge \\text{Odd}(n)$', why: 'Using $\\wedge$ with $\\forall$ claims that **every** positive integer is a prime greater than 2 and is odd (which fails at $n=4$!).' },
              { text: '$\\exists n \\in \\mathbb{Z}^+,\\;(\\text{Prime}(n) \\wedge n > 2) \\Rightarrow \\text{Odd}(n)$', why: 'That only claims at least one integer satisfies the implication (which is trivially true for $n=4$).' },
            ],
            answer: 0,
          },
        },
        {
          note: 'Standard pattern to remember: **$\\forall x$ pairs with $\\Rightarrow$** ($\\forall x, P(x) \\Rightarrow Q(x)$: "every $P$ is a $Q$"), whereas **$\\exists x$ pairs with $\\wedge$** ($\\exists x, P(x) \\wedge Q(x)$: "there is something that is both $P$ and $Q$"). Never write $\\exists x, P(x) \\Rightarrow Q(x)$—that is true as soon as one non-$P$ exists!',
          kind: 'warn',
        },
      ],
    },

    {
      id: 'inference',
      title: 'Rules of inference: Modus Ponens, Modus Tollens, and fallacies',
      goal: 'Distinguish a valid argument ($P_1 \\wedge \\dots \\wedge P_k \\Rightarrow C$ is a tautology) from a fallacy, apply Modus Ponens, Modus Tollens, and Resolution, and spot Affirming the Consequent.',
      builds: ['quantifiers'],
      blocks: [
        { h: 'How valid deduction steps from premises to a conclusion' },
        {
          md: `A mathematical **argument** is a sequence of propositions: the first ones are the **premises** $P_1, P_2, \\dots, P_k$ (what we assume or have already established), and the final one is the **conclusion** $C$, written:

$$P_1, P_2, \\dots, P_k \\;\\vdash\\; C$$

When is an argument **valid**? Whenever it is **impossible for all the premises to be True while the conclusion is False**—that is, when the implication $(P_1 \\wedge P_2 \\wedge \\dots \\wedge P_k) \\Rightarrow C$ is a **tautology**!

In every critical Row of the truth table (the rows where all premises $P_1, \\dots, P_k$ are $T$), the conclusion $C$ must also be $T$. Small, reusable valid argument patterns are called **rules of inference**:`,
        },
        {
          symbols: [
            ['p,\\;p \\Rightarrow q \\;\\vdash\\; q', 'Modus Ponens (mode that affirms)', 'If $p$ is True and $p \\Rightarrow q$ is True, then $q$ must be True', 'It is raining; if it rains, the street is wet $\\therefore$ the street is wet'],
            ['\\neg q,\\;p \\Rightarrow q \\;\\vdash\\; \\neg p', 'Modus Tollens (mode that denies)', 'If $q$ is False and $p \\Rightarrow q$ is True, then $p$ must be False (contrapositive!)', 'The street is dry; if it rains, the street is wet $\\therefore$ it is not raining'],
            ['p \\Rightarrow q,\\;q \\Rightarrow r \\;\\vdash\\; p \\Rightarrow r', 'Hypothetical Syllogism', 'Chains two implications together (transitivity of $\\Rightarrow$)', 'If $n$ is divisible by 4, it\'s even; if even, $n^2$ is even $\\therefore 4\\mid n \\Rightarrow n^2$ even'],
            ['p \\vee q,\\;\\neg p \\vee r \\;\\vdash\\; q \\vee r', 'Resolution', 'The single rule automated SAT solvers use to prove theorems!', 'Special case ($r=F$): **Disjunctive Syllogism** $p \\vee q, \\neg p \\vdash q$'],
          ],
        },
        {
          md: `Just as important as knowing the valid rules is recognizing the **two classic logical fallacies** that masquerade as Modus Ponens and Modus Tollens:

1. **Affirming the Consequent (FALLACY):** Given $p \\Rightarrow q$ and $q$, concluding $p$.
   *Why it fails:* When $p = F$ and $q = T$, both premises $p \\Rightarrow q$ ($F \\Rightarrow T = T$) and $q$ ($T$) are **True**, yet the conclusion $p$ is **False**! ("If it rained, the grass is wet. The grass is wet. Therefore it rained" — false if the sprinkler was on!)
2. **Denying the Antecedent (FALLACY):** Given $p \\Rightarrow q$ and $\\neg p$, concluding $\\neg q$.
   *Why it fails:* Again, when $p = F$ and $q = T$, both premises $p \\Rightarrow q$ and $\\neg p$ are **True**, while $\\neg q$ is **False**!`,
        },
        {
          figure: 'InferenceChainFig',
          caption: 'Compare valid rules of inference against the two classic fallacies, and inspect the critical rows where every premise is True.',
        },
        {
          worked: {
            title: 'Chaining rules of inference to deduce $r$ from 4 premises',
            steps: [
              ['1. $\\neg p \\wedge q$', 'Premise', 'Given'],
              ['2. $\\neg p$', 'Simplification from (1)', 'From $A \\wedge B$ we may infer $A$'],
              ['3. $s \\Rightarrow p$', 'Premise', 'Given'],
              ['4. $\\neg s$', 'Modus Tollens on (2) and (3)', 'Since $s \\Rightarrow p$ and $\\neg p$, we deduce $\\neg s$'],
              ['5. $\\neg s \\vee t \\Rightarrow r$', 'Premise', 'Given'],
              ['6. $\\neg s \\vee t$', 'Addition from (4)', 'Since $\\neg s$ is True, $\\neg s \\vee t$ is automatically True'],
              ['7. $r$', 'Modus Ponens on (5) and (6)', 'Conclusion $r$ is proven! $\\blacksquare$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'Check the fallacy of **Affirming the Consequent**: $((p \\Rightarrow q) \\wedge q) \\Rightarrow p$. In its 4-row truth table over $(p, q)$, how many rows evaluate to **False**?',
            answer: 4 - countTrueRows2((p, q) => !((!p || q) && q) || p),
            compute: () => 4 - countTrueRows2((p, q) => !((!p || q) && q) || p),
            explain: 'Exactly **1** row evaluates to False: the row $(p = F, q = T)$, where $p \\Rightarrow q$ is True and $q$ is True, yet $p$ is False. One false row is all it takes to make an argument invalid!',
          },
        },
        {
          predict: {
            prompt: 'Verify the **Resolution** rule: $((p \\vee q) \\wedge (\\neg p \\vee r)) \\Rightarrow (q \\vee r)$ over $(p, q, r)$. How many of the 8 truth-table rows evaluate to **True**?',
            answer: countTrueRows3((p, q, r) => !((p || q) && (!p || r)) || (q || r)),
            compute: () => countTrueRows3((p, q, r) => !((p || q) && (!p || r)) || (q || r)),
            explain: 'All **8** rows evaluate to True! It is a tautology: if $p$ is True then $\\neg p \\vee r$ forces $r$, and if $p$ is False then $p \\vee q$ forces $q$. Either way, $q \\vee r$ holds.',
          },
        },
        {
          choice: {
            prompt: 'You know two facts: (1) *"If the program has a memory leak ($p$), then RAM usage climbs ($q$)"*, and (2) *"RAM usage is NOT climbing ($\\neg q$)."* You conclude *"The program does not have a memory leak ($\\neg p$)."* What rule did you use?',
            options: [
              { text: 'Modus Tollens (valid)', why: 'Yes! From $p \\Rightarrow q$ and $\\neg q$, concluding $\\neg p$ is Modus Tollens, which is 100% valid.' },
              { text: 'Denying the Antecedent (invalid fallacy)', why: 'Denying the antecedent assumes $\\neg p$ and concludes $\\neg q$. Here we observed $\\neg q$ and concluded $\\neg p$.' },
              { text: 'Modus Ponens (valid)', why: 'Modus Ponens starts from $p$ and concludes $q$.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Suppose an argument has premises $P_1, P_2, P_3$ that are **mutually contradictory** (there is no row where $P_1 \\wedge P_2 \\wedge P_3$ is True). Is the argument $P_1, P_2, P_3 \\vdash C$ logically **valid**?',
            options: [
              { text: 'Yes (vacuously valid), because $(P_1 \\wedge P_2 \\wedge P_3) \\Rightarrow C$ has a False hypothesis in every row, making it a tautology—this is the Principle of Explosion!', why: 'Yes! From a contradiction, anything follows logically ($\\bot \\Rightarrow C$ is always True). That is why a single inconsistent axiom destroys a formal system, and why we distinguish **valid** (form is tautological) from **sound** (valid AND premises are actually true).' },
              { text: 'No, because the premises can never be true', why: 'Validity only requires that *whenever* all premises are true, the conclusion is true. Having true premises in the real world is called **soundness**.' },
              { text: 'Only if $C$ is a tautology', why: 'Even if $C$ is False, $F \\Rightarrow F$ is still True.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'An argument $P_1, \\dots, P_k \\vdash C$ is **valid** when $(P_1 \\wedge \\dots \\wedge P_k) \\Rightarrow C$ is a tautology (and **sound** when it is valid and its premises are true). Never confuse **Modus Ponens** ($p, p \\Rightarrow q \\vdash q$) or **Modus Tollens** ($\\neg q, p \\Rightarrow q \\vdash \\neg p$) with **Affirming the Consequent** ($q, p \\Rightarrow q \\not\\vdash p$).',
        },
      ],
    },
  ],
}
