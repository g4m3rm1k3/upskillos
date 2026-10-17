// Part 3: Sets, Relations, Functions & Infinity — discrete structures from membership ∈ to Cantor's diagonal.
import {
  setUnion, setIntersect, setDiff, setSymDiff, powerSetSize, cartesianSize,
  functionsCount, injectionsCount, surjectionsCount, bellNumber, cantorPair,
} from '../engine/discrete.js'

export const PART3 = {
  id: 'sets-relations',
  title: 'Part [[#part:sets-relations]] · Sets, relations, functions & infinity',
  lessons: [
    {
      id: 'sets',
      title: 'Sets, subsets (⊆), and set-builder notation {x ∈ U | P(x)}',
      goal: 'Read and write set-builder notation, distinguish membership ($\\in$) from subset inclusion ($\\subseteq$), and avoid the classic $\\emptyset$ vs. $\\{\\emptyset\\}$ trap.',
      builds: ['quantifiers'],
      blocks: [
        { h: 'A bag of distinct objects where order and duplicates vanish' },
        {
          md: `A **set** is an unordered collection of distinct objects, called its **elements** or **members**.
Two rules govern every set:
1. **Order does not matter:** $\\{1, 2, 3\\} = \\{3, 1, 2\\}$.
2. **Duplicates do not count twice:** $\\{1, 2, 2, 3\\} = \\{1, 2, 3\\}$. Either an element is in the set ($x \\in A$) or it isn't ($x \\notin A$).

When a set is too large or infinite to list by hand (**roster notation**), we define it using a predicate $P(x)$ from lesson [[#quantifiers]]: **set-builder notation**:

$$A = \\{x \\in U \\mid P(x)\\}$$

Read the vertical bar $\\mid$ (or colon $:$) as **"such that"**: *"the set of all $x$ in $U$ such that $P(x)$ is True."*

Throughout mathematics, five number sets have their own blackboard-bold letters:
- $\\mathbb{N} = \\{0, 1, 2, 3, \\dots\\}$: **natural numbers** (and $\\mathbb{Z}^+ = \\{1, 2, 3, \\dots\\}$ for positive integers)
- $\\mathbb{Z} = \\{\\dots, -2, -1, 0, 1, 2, \\dots\\}$: **integers** (from German *Zahlen*)
- $\\mathbb{Q} = \\{\\tfrac{a}{b} \\mid a, b \\in \\mathbb{Z},\\;b \\ne 0\\}$: **rational numbers** (quotients)
- $\\mathbb{R}$: **real numbers** (every point on the continuous number line)`,
        },
        {
          symbols: [
            ['x \\in A,\\;x \\notin A', 'x is in A / not in A', '$x$ is an element (member) of set $A$', '$3 \\in \\{1,3,5\\}$, $4 \\notin \\{1,3,5\\}$'],
            ['\\{x \\in U \\mid P(x)\\}', 'the x in U such that P(x)', 'Set-builder notation: filters universe $U$ by predicate $P(x)$', '$\\{n \\in \\mathbb{Z}^+ \\mid n \\mid 6\\} = \\{1, 2, 3, 6\\}$'],
            ['\\emptyset \\text{ or } \\{\\}', 'the empty set', 'The unique set with $0$ elements; $\\emptyset \\subseteq A$ for **every** set $A$', 'Warning: $\\{\\emptyset\\}$ is NOT empty—it has 1 element!'],
            ['A \\subseteq B,\\;A \\subset B', 'A is a subset / proper subset of B', '$A \\subseteq B \\iff \\forall x\\,(x \\in A \\Rightarrow x \\in B)$; $A \\subset B$ adds $A \\ne B$', '$\\{1,2\\} \\subseteq \\{1,2,3\\}$, $\\{1,2\\} \\subseteq \\{1,2\\}$'],
            ['|A|', 'cardinality of A', 'The number of distinct elements in finite set $A$', '$|\\{2, 4, 4, 6\\}| = 3$, $|\\emptyset| = 0$, $|\\{\\emptyset\\}| = 1$'],
          ],
        },
        {
          md: `**Two distinctions that trip everyone up once:**
1. **$\\in$ (element of) vs. $\\subseteq$ (subset of):**
   - $2 \\in \\{1, 2, 3\\}$ is **True** ($2$ is an item inside the bag).
   - $\\{2\\} \\subseteq \\{1, 2, 3\\}$ is **True** (every item inside $\\{2\\}$ is also in $\\{1, 2, 3\\}$).
   - $2 \\subseteq \\{1, 2, 3\\}$ is **False** ($2$ is a number, not a sub-bag!).
   - Wait: can $\\{2\\} \\in A$ ever be true? Only if $A$ is a *set of sets* that literally has the box $\\{2\\}$ sitting inside it as one of its elements, like $A = \\{1, \\{2\\}, 3\\}$!
2. **$\\emptyset$ vs. $\\{\\emptyset\\}$:**
   Think of a set as a **paper bag**.
   - $\\emptyset = \\{\\}$ is an **empty bag**: $|\\emptyset| = 0$.
   - $\\{\\emptyset\\}$ is a **bag containing an empty bag inside it**: $|\\{\\emptyset\\}| = 1$!
   And why is $\\emptyset \\subseteq A$ true for *every* set $A$? Because $\\emptyset \\subseteq A$ means $\\forall x\\,(x \\in \\emptyset \\Rightarrow x \\in A)$. Since $x \\in \\emptyset$ is always **False**, the implication is **vacuously true** (lesson [[#implication]])!`,
        },
        {
          figure: 'SetBuilderFig',
          caption: 'Filter the universe $U = \\{1, 2, \\dots, 12\\}$ with different predicates $P(x)$ to see how set-builder notation $\\{x \\in U \\mid P(x)\\}$ constructs sets and checks $A \\subseteq B$.',
        },
        {
          worked: {
            title: 'How to prove two sets are equal ($A = B$): Mutual Subset Inclusion',
            steps: [
              ['Logical definition', '$A = B \\;\\iff\\; \\forall x\\,(x \\in A \\Leftrightarrow x \\in B)$', 'Two sets are equal iff they have the exact same members'],
              ['Split $\\Leftrightarrow$ into two $\\Rightarrow$', '$\\iff (\\forall x, x \\in A \\Rightarrow x \\in B) \\wedge (\\forall x, x \\in B \\Rightarrow x \\in A)$', 'Biconditional law from lesson [[#implication]]'],
              ['Subset notation', '$\\iff (A \\subseteq B) \\;\\wedge\\; (B \\subseteq A)$', 'Direction 1: take $x \\in A$ and show $x \\in B$. Direction 2: take $x \\in B$ and show $x \\in A$!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is the cardinality $|S|$ of the set $S = \\{x^2 \\bmod 5 \\mid x \\in \\{0, 1, 2, 3, 4, 5, 6\\}\\}$? (Remember: duplicates in a set collapse!)',
            answer: new Set([0, 1, 2, 3, 4, 5, 6].map(x => (x * x) % 5)).size,
            compute: () => new Set([0, 1, 2, 3, 4, 5, 6].map(x => (x * x) % 5)).size,
            explain: 'Computing $x^2 \\bmod 5$ for $x = 0..6$ gives $0, 1, 4, 4, 1, 0, 1$. The distinct elements are $\\{0, 1, 4\\}$, so $|S| = 3$.',
            misconceptions: [
              { answer: 7, feedback: 'There are 7 inputs for $x$, but a set only keeps **distinct** outputs: $\\{0, 1, 4\\}$ has cardinality 3.' },
            ],
          },
        },
        {
          predict: {
            prompt: 'Let $A = \\{\\emptyset, \\{\\emptyset\\}, \\{1, 2\\}\\}$. What is the cardinality $|A|$?',
            answer: 3,
            compute: () => 3,
            explain: 'Look only at the **top-level commas** inside the outer braces: the three elements of $A$ are (1) $\\emptyset$, (2) $\\{\\emptyset\\}$, and (3) $\\{1, 2\\}$. So $|A| = 3$!',
            misconceptions: [
              { answer: 2, feedback: '$\\emptyset$ inside $A$ is an element of $A$ (an empty box inside the outer box), so it counts as 1 element!' },
              { answer: 4, feedback: '$\\{1, 2\\}$ is a single element of $A$ (one inner box containing 1 and 2), not two separate top-level elements of $A$.' },
            ],
          },
        },
        {
          choice: {
            prompt: 'Let $A = \\{1, \\{2, 3\\}\\}$. Which of the following statements is **True**?',
            options: [
              { text: '$\\{2, 3\\} \\in A$ and $\\{1\\} \\subseteq A$', why: 'Yes! The set $\\{2, 3\\}$ is one of the two elements sitting directly inside $A$ (so $\\{2, 3\\} \\in A$), and $1$ is the other element (so $\\{1\\} \\subseteq A$).' },
              { text: '$2 \\in A$ and $\\{2, 3\\} \\subseteq A$', why: '$2$ is inside the inner box $\\{2, 3\\}$, not directly an element of $A$! So $2 \\notin A$, which also means $\\{2, 3\\} \\not\\subseteq A$.' },
              { text: '$|A| = 3$', why: '$A$ has only 2 top-level elements: the number $1$ and the set $\\{2, 3\\}$.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Which statement about the empty set $\\emptyset$ is **True**?',
            options: [
              { text: 'Both $\\emptyset \\in \\{\\emptyset\\}$ and $\\emptyset \\subseteq \\{\\emptyset\\}$ are True', why: 'Yes! $\\emptyset \\in \\{\\emptyset\\}$ is True because $\\emptyset$ is the sole element listed inside $\\{\\emptyset\\}$, and $\\emptyset \\subseteq \\{\\emptyset\\}$ is True because $\\emptyset$ is a subset of *every* set!' },
              { text: '$\\emptyset = \\{\\emptyset\\}$', why: '$|\\emptyset| = 0$ while $|\\{\\emptyset\\}| = 1$, so they cannot be equal.' },
              { text: '$\\emptyset \\in \\emptyset$', why: 'The empty set has no elements at all, so nothing is $\\in \\emptyset$.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'Order and duplicates never change a set. Always distinguish $x \\in A$ ($x$ is an item inside $A$) from $S \\subseteq A$ (every item of $S$ is an item of $A$). To prove $A = B$, prove $A \\subseteq B$ and $B \\subseteq A$.',
        },
      ],
    },

    {
      id: 'set-operations',
      title: 'Union (∪), intersection (∩), difference (∖), Cartesian products, and power sets P(A)',
      goal: 'Compute $A \\cup B, A \\cap B, A \\setminus B, A \\Delta B$, Cartesian products $A \\times B$, and power sets $\\mathcal{P}(A)$, and explain why $|\\mathcal{P}(A)| = 2^{|A|}$.',
      builds: ['sets'],
      blocks: [
        { h: 'Set operations are propositional logic in disguise' },
        {
          md: `Every operation that combines sets is built directly from a logical connective in lesson [[#propositions]]:

- **Union ($A \\cup B$):** in $A$ **or** in $B$ (inclusive $\\vee$): $\\{x \\mid x \\in A \\vee x \\in B\\}$
- **Intersection ($A \\cap B$):** in $A$ **and** in $B$ ($\\wedge$): $\\{x \\mid x \\in A \\wedge x \\in B\\}$ (if $A \\cap B = \\emptyset$, we call $A$ and $B$ **disjoint**)
- **Difference ($A \\setminus B$ or $A - B$):** in $A$ **and not** in $B$: $\\{x \\mid x \\in A \\wedge x \\notin B\\}$
- **Complement ($A^c$ or $\\overline{A}$):** not in $A$ ($\\neg$): $\\{x \\in U \\mid x \\notin A\\}$
- **Symmetric difference ($A \\Delta B$):** in **exactly one** of $A, B$ (exclusive $\\oplus$): $(A \\setminus B) \\cup (B \\setminus A) = (A \\cup B) \\setminus (A \\cap B)$

Because $\\cup, \\cap, {}^c$ mirror $\\vee, \\wedge, \\neg$, every logical equivalence from lesson [[#equivalences]] becomes a **set identity**! In particular, **De Morgan's Laws for Sets**:
$$(A \\cup B)^c = A^c \\cap B^c \\qquad\\text{and}\\qquad (A \\cap B)^c = A^c \\cup B^c$$`,
        },
        { h: 'Ordered pairs (A × B) and Power Sets P(A)' },
        {
          md: `While a set $\\{a, b\\}$ is unordered, an **ordered pair** $(a, b)$ cares about order: $(a, b) = (c, d) \\iff a = c \\wedge b = d$.
- The **Cartesian product** $A \\times B = \\{(a, b) \\mid a \\in A \\wedge b \\in B\\}$ is the set of all ordered pairs taking the first coordinate from $A$ and the second from $B$. Since there are $|A|$ choices for $a$ and $|B|$ independent choices for $b$, $|A \\times B| = |A| \\cdot |B|$.
- The **Power Set** $\\mathcal{P}(A)$ (or $2^A$) is the **set of all subsets** of $A$ (including $\\emptyset$ and $A$ itself).

Why does a set $A$ with $n$ elements always have **$|\\mathcal{P}(A)| = 2^n$ subsets**?
To build a subset $S \\subseteq A$, you go down the list of the $n$ elements of $A$ one by one and answer a binary yes/no question for each element: **"In ($1$) or Out ($0$)?"**
2 choices for element 1 $\\times$ 2 choices for element 2 $\\times \\dots \\times$ 2 choices for element $n = 2^n$ subsets!`,
        },
        {
          symbols: [
            ['A \\cup B,\\;A \\cap B', 'A union B, A intersect B', 'Elements in either ($\\vee$); elements in both ($\\wedge$)', '$\\{1,2\\} \\cup \\{2,3\\} = \\{1,2,3\\}$, $\\cap = \\{2\\}$'],
            ['A \\setminus B,\\;A \\Delta B', 'A minus B, symmetric difference', 'In $A$ but not $B$; in exactly one of $A, B$ ($\\oplus$)', '$\\{1,2\\} \\Delta \\{2,3\\} = \\{1,3\\}$'],
            ['A \\times B', 'A cross B (Cartesian product)', 'Set of all ordered pairs $(a, b)$ with $a \\in A, b \\in B$; $|A \\times B| = |A||B|$', 'Note: $A \\times \\emptyset = \\emptyset$!'],
            ['\\mathcal{P}(A)', 'power set of A', 'Set of all subsets of $A$: $\\{S \\mid S \\subseteq A\\}$; $|\\mathcal{P}(A)| = 2^{|A|}$', '$\\mathcal{P}(\\{1,2\\}) = \\{\\emptyset, \\{1\\}, \\{2\\}, \\{1,2\\}\\}$'],
          ],
        },
        {
          figure: 'VennPowerSetFig',
          caption: 'Explore Venn regions for $A \\cup B, A \\cap B, A \\setminus B, A \\Delta B$, and inspect how every subset in $\\mathcal{P}(A)$ corresponds to an $n$-bit binary string.',
        },
        {
          worked: {
            title: 'Binary bit-string bijection for $\\mathcal{P}(\\{a, b, c\\})$ ($2^3 = 8$ subsets)',
            steps: [
              ['Bitmask $000 \\to \\emptyset$', 'Choose $a$: No, $b$: No, $c$: No', 'Size 0 (the empty set)'],
              ['Bitmasks $001, 010, 100$', '$\\{c\\}, \\{b\\}, \\{a\\}$', '3 singleton subsets of size 1'],
              ['Bitmasks $011, 101, 110$', '$\\{b,c\\}, \\{a,c\\}, \\{a,b\\}$', '3 pair subsets of size 2'],
              ['Bitmask $111 \\to \\{a, b, c\\}$', 'Choose $a$: Yes, $b$: Yes, $c$: Yes', 'Size 3 (the full set $A$ itself); total $= 2^3 = 8$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'Let $A = \\{1, 2, 3, 4, 5\\}$ and $B = \\{4, 5, 6, 7\\}$. How many elements are in the **symmetric difference** $A \\Delta B = (A \\setminus B) \\cup (B \\setminus A)$?',
            answer: setSymDiff([1, 2, 3, 4, 5], [4, 5, 6, 7]).length,
            compute: () => setSymDiff([1, 2, 3, 4, 5], [4, 5, 6, 7]).length,
            explain: '$A \\setminus B = \\{1, 2, 3\\}$ and $B \\setminus A = \\{6, 7\\}$ (removing the shared intersection $\\{4, 5\\}$). So $A \\Delta B = \\{1, 2, 3, 6, 7\\}$, which has **5** elements.',
          },
        },
        {
          predict: {
            prompt: 'If $|A| = 5$, how many **proper** subsets does $A$ have? (Every subset $S \\subseteq A$ except $A$ itself is a proper subset $S \\subset A$.)',
            answer: powerSetSize(5) - 1,
            compute: () => powerSetSize(5) - 1,
            explain: '$|\\mathcal{P}(A)| = 2^5 = 32$ subsets in total. Subtracting the 1 improper subset ($A$ itself) leaves $32 - 1 = 31$ proper subsets.',
            misconceptions: [
              { answer: 32, feedback: '$32 = 2^5$ is the total number of subsets; *proper* subsets ($S \\subset A$) exclude $A$ itself, so $32 - 1 = 31$.' },
              { answer: 30, feedback: 'The empty set $\\emptyset$ IS a proper subset of $A$ (since $\\emptyset \\subseteq A$ and $\\emptyset \\ne A$); only $A$ itself is excluded!' },
            ],
          },
        },
        {
          predict: {
            prompt: 'What is the cardinality of $\\mathcal{P}(\\mathcal{P}(\\{1, 2\\}))$—the power set of the power set of a 2-element set?',
            answer: powerSetSize(powerSetSize(2)),
            compute: () => powerSetSize(powerSetSize(2)),
            explain: 'First, $|\\mathcal{P}(\\{1, 2\\})| = 2^2 = 4$. Then taking the power set of that 4-element set gives $2^4 = 16$!',
          },
        },
        {
          choice: {
            prompt: 'If $A = \\{1, 2, 3\\}$ and $B = \\emptyset$, what is the Cartesian product $A \\times B$?',
            options: [
              { text: '$\\emptyset$ (the empty set), because there is no element $b \\in \\emptyset$ to form any ordered pair $(a, b)$', why: 'Yes! $|A \\times B| = |A| \\cdot |B| = 3 \\times 0 = 0$, so $A \\times \\emptyset = \\emptyset$.' },
              { text: '$A = \\{1, 2, 3\\}$', why: 'Elements of $A \\times B$ must be ordered pairs $(a, b)$ with $b \\in B$, and $B$ has no elements.' },
              { text: '$\\{(1, \\emptyset), (2, \\emptyset), (3, \\emptyset)\\}$', why: 'That would be $A \\times \\{\\emptyset\\}$, where the second set has 1 element ($\\emptyset$).' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'For any two sets $A$ and $B$, what does $A \\setminus (A \\setminus B)$ simplify to?',
            options: [
              { text: '$A \\cap B$', why: 'Yes! $A \\setminus B$ is the part of $A$ outside $B$; removing that part from $A$ leaves the part of $A$ that is **inside** $B$, which is $A \\cap B$. Algebraically: $A \\cap (A \\cap B^c)^c = A \\cap (A^c \\cup B) = A \\cap B$.' },
              { text: '$B$', why: 'Elements of $B$ that were never in $A$ to begin with cannot appear when you take a subset of $A$!' },
              { text: '$\\emptyset$', why: 'Set difference is not associative: $(A \\setminus A) \\setminus B = \\emptyset$, but $A \\setminus (A \\setminus B) = A \\cap B$.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'Set operations translate directly to logic: $x \\in A \\cup B \\iff x \\in A \\vee x \\in B$, $x \\in A \\cap B \\iff x \\in A \\wedge x \\in B$, $x \\in A \\setminus B \\iff x \\in A \\wedge x \\notin B$. Every $n$-element set has $|\\mathcal{P}(A)| = 2^n$ subsets because each element has 2 choices (in or out).',
        },
      ],
    },

    {
      id: 'functions-bijections',
      title: 'Injections, surjections, bijections, and floor/ceiling functions',
      goal: 'Determine whether $f: A \\to B$ is injective (one-to-one), surjective (onto), or bijective (invertible), count functions and injections between finite sets, and work with $\\lfloor x \\rfloor$ and $\\lceil x \\rceil$.',
      builds: ['set-operations'],
      blocks: [
        { h: 'What makes a relation a function, and when can it be reversed?' },
        {
          md: `A **function** $f: A \\to B$ from a **domain** $A$ to a **codomain** $B$ assigns to **every** element $a \\in A$ **exactly one** output $f(a) \\in B$.
(Notice the quantifier structure from lesson [[#quantifiers]]: $\\forall a \\in A,\\;\\exists! b \\in B,\\;f(a) = b$.)
The set of outputs that actually get hit is the **range** (or **image**) $f(A) = \\{f(a) \\mid a \\in A\\} \\subseteq B$.

When can a function $f: A \\to B$ be cleanly reversed by an inverse function $f^{-1}: B \\to A$? Only when two arrow properties hold simultaneously:

1. **Injective (One-to-One):** *No two different inputs collide on the same output.*
   $$\\forall x_1, x_2 \\in A,\\quad f(x_1) = f(x_2) \\;\\Rightarrow\\; x_1 = x_2$$
   (Contrapositive: $x_1 \\ne x_2 \\Rightarrow f(x_1) \\ne f(x_2)$. Every element of $B$ receives **at most 1** arrow.)
2. **Surjective (Onto):** *Every element in the codomain $B$ gets hit at least once* ($f(A) = B$).
   $$\\forall b \\in B,\\quad \\exists a \\in A \\text{ such that } f(a) = b$$
   (Every element of $B$ receives **at least 1** arrow.)
3. **Bijective (One-to-One Correspondence):** Both injective **and** surjective! Every element of $B$ receives **exactly 1** arrow, so $f$ pairs up $A$ and $B$ one-for-one, and the inverse $f^{-1}: B \\to A$ exists!`,
        },
        {
          symbols: [
            ['f: A \\to B', 'f maps A to B', '$A$ is the **domain** (inputs), $B$ is the **codomain** (allowed outputs)', 'There are $|B|^{|A|}$ total functions $A \\to B$'],
            ['f(x_1) = f(x_2) \\Rightarrow x_1 = x_2', 'injective (one-to-one)', 'No collisions: each $b \\in B$ has **at most 1** arrow into it', 'Requires $|A| \\le |B|$ for finite sets'],
            ['\\forall b \\in B,\\,\\exists a \\in A,\\,f(a)=b', 'surjective (onto)', 'No missed targets: each $b \\in B$ has **at least 1** arrow into it', 'Requires $|A| \\ge |B|$ for finite sets'],
            ['\\lfloor x \\rfloor,\\;\\lceil x \\rceil', 'floor of x, ceiling of x', '$\\lfloor x \\rfloor =$ greatest integer $\\le x$; $\\lceil x \\rceil =$ least integer $\\ge x$', '$\\lfloor -2.3 \\rfloor = -3$ (down!), $\\lceil -2.3 \\rceil = -2$'],
          ],
        },
        {
          figure: 'BijectionMapperFig',
          caption: 'Rewire the arrows from domain $A$ to codomain $B$ and watch the live analyzer test whether your mapping is Injective, Surjective, and Bijective.',
        },
        {
          md: `**Counting functions between finite sets** ($|A| = m$, $|B| = n$):
- **All functions $f: A \\to B$:** Each of the $m$ elements in $A$ independently picks any of the $n$ targets in $B$: **$n^m$** functions.
- **Injections $f: A \\to B$:** First element of $A$ has $n$ choices, second has $n - 1$ (no collision!), …, $m$-th has $n - m + 1$: **$n(n-1)\\cdots(n-m+1)$** injections (and $0$ if $m > n$!).
- **Bijections $f: A \\to B$:** Only possible when $m = n$, giving **$n!$** bijections!

And in discrete math, **floor** $\\lfloor x \\rfloor$ and **ceiling** $\\lceil x \\rceil$ map continuous reals $\\mathbb{R}$ onto discrete integers $\\mathbb{Z}$. Watch negative numbers: $\\lfloor -1.2 \\rfloor = -2$ (because $-2 \\le -1.2 < -1$: floor always goes **left/down** on the number line, not toward zero!).`,
        },
        {
          worked: {
            title: 'Standard template to prove $f(x) = 3x - 5$ from $\\mathbb{R} \\to \\mathbb{R}$ is a bijection',
            steps: [
              ['1. Prove Injective', 'Suppose $f(x_1) = f(x_2)$ for $x_1, x_2 \\in \\mathbb{R}$. Then $3x_1 - 5 = 3x_2 - 5$.', 'Start from $f(x_1) = f(x_2)$'],
              ['2. Deduce $x_1 = x_2$', 'Add 5 to both sides: $3x_1 = 3x_2$, then divide by 3: $x_1 = x_2$. $\\checkmark$', 'Injective proven'],
              ['3. Prove Surjective', 'Let $y \\in \\mathbb{R}$ be any target in the codomain. Solve $3x - 5 = y$ on scratch paper: $x = \\frac{y+5}{3} \\in \\mathbb{R}$.', 'Find pre-image $x$ in the domain'],
              ['4. Verify $f(x) = y$', '$f\\left(\\frac{y+5}{3}\\right) = 3\\left(\\frac{y+5}{3}\\right) - 5 = (y + 5) - 5 = y$. $\\checkmark$', 'Both injective and surjective $\\Rightarrow$ bijective! $\\blacksquare$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'If $|A| = 3$ and $|B| = 4$, how many **total functions** $f: A \\to B$ exist?',
            answer: functionsCount(3, 4),
            compute: () => functionsCount(3, 4),
            explain: 'Each of the 3 domain elements in $A$ has 4 choices in $B$: $4 \\times 4 \\times 4 = 4^3 = 64$.',
            misconceptions: [
              { answer: 3 ** 4, feedback: 'Careful which exponent is which: each of the $|A|=3$ inputs chooses among $|B|=4$ outputs, so it is $|B|^{|A|} = 4^3 = 64$, not $3^4 = 81$.' },
            ],
          },
        },
        {
          predict: {
            prompt: 'For the same sets $|A| = 3$ and $|B| = 4$, how many of those 64 functions are **injective** (one-to-one)?',
            answer: injectionsCount(3, 4),
            compute: () => injectionsCount(3, 4),
            explain: 'The 1st element of $A$ has 4 choices, the 2nd has 3 remaining choices, and the 3rd has 2 remaining choices: $4 \\times 3 \\times 2 = 24$.',
          },
        },
        {
          predict: {
            prompt: 'Evaluate $\\lfloor -3.7 \\rfloor + \\lceil 2.1 \\rceil$.',
            answer: Math.floor(-3.7) + Math.ceil(2.1),
            compute: () => Math.floor(-3.7) + Math.ceil(2.1),
            explain: '$\\lfloor -3.7 \\rfloor = -4$ (the greatest integer $\\le -3.7$) and $\\lceil 2.1 \\rceil = 3$ (the least integer $\\ge 2.1$), so $-4 + 3 = -1$.',
            misconceptions: [
              { answer: 0, feedback: 'Watch the negative number: $\\lfloor -3.7 \\rfloor = -4$ (rounds down to $-4$), not $-3$!' },
            ],
          },
        },
        {
          choice: {
            prompt: 'Consider $f: \\mathbb{Z} \\to \\mathbb{Z}$ defined by $f(n) = 2n$. Which classification is right?',
            options: [
              { text: 'Injective (since $2n_1 = 2n_2 \\Rightarrow n_1 = n_2$), but NOT surjective onto $\\mathbb{Z}$ (no odd integer in the codomain $\\mathbb{Z}$ is ever hit!)', why: 'Yes! The domain and codomain are part of the definition of a function: $f(n) = 2n$ is not surjective from $\\mathbb{Z} \\to \\mathbb{Z}$ because $f(n) = 3$ has no integer solution $n \\in \\mathbb{Z}$.' },
              { text: 'Bijective, because every integer has a double', why: 'Surjectivity requires every integer in the *codomain* $\\mathbb{Z}$ to be an output $2n$, which fails for odd numbers.' },
              { text: 'Surjective, but not injective', why: '$2n_1 = 2n_2 \\Rightarrow n_1 = n_2$, so it is definitely injective.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Suppose $A$ and $B$ are finite sets of the **exact same size** ($|A| = |B| = n$), and $f: A \\to B$. What can you conclude if you prove $f$ is **injective**?',
            options: [
              { text: '$f$ is automatically **surjective** (and therefore a bijection), because $n$ distinct inputs landing on $n$ distinct outputs must fill all $n$ spots of $B$!', why: 'Yes! By the Pigeonhole Principle, for finite sets of equal size $|A| = |B|$, injective $\\iff$ surjective $\\iff$ bijective. (This shortcut holds ONLY for finite sets!)' },
              { text: 'Nothing about surjectivity; you could still miss an element of $B$', why: 'With $n$ arrows landing in $n$ different boxes, all $n$ boxes must receive 1 arrow.' },
              { text: 'The same holds even for infinite sets like $\\mathbb{Z}$', why: 'On infinite sets, $f(n) = 2n$ from $\\mathbb{Z} \\to \\mathbb{Z}$ is injective without being surjective!' },
            ],
            answer: 0,
          },
        },
        {
          note: 'A function $f: A \\to B$ is **injective** if each $b \\in B$ gets $\\le 1$ arrow ($f(x_1)=f(x_2) \\Rightarrow x_1=x_2$), **surjective** if each $b \\in B$ gets $\\ge 1$ arrow, and **bijective** (invertible) if each $b \\in B$ gets **exactly $1$** arrow.',
        },
      ],
    },

    {
      id: 'relations',
      title: 'Binary relations, relation matrices, and closures',
      goal: 'Represent a relation $R \\subseteq A \\times A$ as a matrix and directed graph, test whether $R$ is reflexive, symmetric, antisymmetric, and transitive, and compute its transitive closure.',
      builds: ['functions-bijections'],
      blocks: [
        { h: 'Generalizing functions: any subset of A × A is a relation' },
        {
          md: `A function $f: A \\to A$ forces every element $a \\in A$ to send out *exactly one* arrow. What if an element can send out zero arrows, or five arrows, like "$x$ divides $y$" ($x \\mid y$), "$x < y$", or "$x$ is friends with $y$"?

That is a **binary relation**: any subset $R \\subseteq A \\times A$! We write $a\\,R\\,b$ as shorthand for $(a, b) \\in R$.
A relation on an $n$-element set $A = \\{a_1, \\dots, a_n\\}$ can be drawn in two equivalent ways:
1. A **directed graph (digraph)**: vertices are elements of $A$, and we draw an arrow $a \\to b$ whenever $(a, b) \\in R$ (with a **self-loop** at $a$ when $(a, a) \\in R$).
2. An $n \\times n$ **0–1 relation matrix** $M_R$, where entry $(i, j)$ is $1$ if $(a_i, a_j) \\in R$ and $0$ otherwise.

Four structural properties classify relations across all of mathematics:`,
        },
        {
          symbols: [
            ['\\forall a,\\;(a, a) \\in R', 'reflexive', 'Every element relates to itself (every vertex has a self-loop; main diagonal of $M_R$ is all $1$s)', '$\\le$, $=$, and $\\mid$ are reflexive; $<$ is **irreflexive**'],
            ['(a, b) \\in R \\Rightarrow (b, a) \\in R', 'symmetric', 'Every arrow is a two-way street ($M_R = M_R^\\top$ is symmetric across the diagonal)', '"is a sibling of", $\\equiv \\pmod m$'],
            ['(a, b) \\in R \\wedge (b, a) \\in R \\Rightarrow a = b', 'antisymmetric', 'No two-way arrows between *distinct* elements ($i \\ne j \\Rightarrow$ not both $M_{ij}=1$ and $M_{ji}=1$)', '$\\le$, $\\subseteq$, and $\\mid$ on $\\mathbb{Z}^+$'],
            ['(a, b) \\in R \\wedge (b, c) \\in R \\Rightarrow (a, c) \\in R', 'transitive', 'Any two-step path $a \\to b \\to c$ has its direct shortcut arrow $a \\to c$ present in $R$', '$<, \\le, =, \\subseteq, \\mid$'],
          ],
        },
        {
          md: `**Beware the #1 trap in relation theory:**
**"Symmetric" and "Antisymmetric" are NOT opposites!**
- A relation can be **both** symmetric and antisymmetric! How? If it has *no arrows between distinct elements at all*—for example, the equality relation $R = \\{(1,1), (2,2), (3,3)\\}$ (the identity matrix $I_n$). There are no off-diagonal arrows to violate either rule!
- A relation can also be **neither** symmetric nor antisymmetric (if it has a two-way arrow $1 \\leftrightarrow 2$ AND a one-way arrow $2 \\to 3$).

And what if a relation $R$ lacks a property (say, transitivity), and you want the **smallest** transitive relation containing $R$? You add every missing shortcut arrow $a \\to c$ reachable by a directed walk $a \\to \\dots \\to c$—that is the **transitive closure** $R^+$!`,
        },
        {
          figure: 'RelationMatrixFig',
          caption: 'Click cells in the $4 \\times 4$ relation matrix $M_R$ to toggle arrows $(a, b) \\in R$, inspect the live directed graph and property badges, or apply Reflexive / Symmetric / Transitive Closure in one click.',
        },
        {
          worked: {
            title: 'Counting how many relations on an $n$-element set are Reflexive or Symmetric',
            steps: [
              ['All relations on $A$', '$|A \\times A| = n^2$ pairs $\\implies 2^{n^2}$ possible relations', 'Each of the $n^2$ matrix entries is $0$ or $1$'],
              ['Reflexive relations', 'Diagonal has $n$ entries forced to $1$; $n^2 - n$ off-diagonal entries are free $\\implies 2^{n(n-1)}$', 'For $n=3$: $2^{9-3} = 2^6 = 64$'],
              ['Symmetric relations', '$n$ diagonal entries free + $\\frac{n(n-1)}{2}$ upper-triangle pairs (lower triangle mirrors it) $\\implies 2^{n(n+1)/2}$', 'For $n=3$: $2^{3(4)/2} = 2^6 = 64$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'On a set $A$ with $n = 3$ elements, there are $2^{3^2} = 2^9 = 512$ binary relations in total. How many of those 512 relations are **reflexive**?',
            answer: 2 ** (3 * (3 - 1)),
            compute: () => 2 ** (3 * (3 - 1)),
            explain: 'A reflexive relation must have $1$s on all $3$ diagonal entries $(1,1), (2,2), (3,3)$. The remaining $9 - 3 = 6$ off-diagonal entries can each be $0$ or $1$ freely, giving $2^6 = 64$ reflexive relations.',
          },
        },
        {
          predict: {
            prompt: 'Let $R = \\{(1, 2), (2, 3), (3, 4)\\}$ on $A = \\{1, 2, 3, 4\\}$ (a 3-edge chain $1 \\to 2 \\to 3 \\to 4$). How many ordered pairs are in its **transitive closure** $R^+$?',
            answer: 6,
            compute: () => 6,
            explain: 'In $1 \\to 2 \\to 3 \\to 4$, we must have $(i, j) \\in R^+$ for every $1 \\le i < j \\le 4$: the 3 original edges $(1,2), (2,3), (3,4)$, plus $(1,3)$ and $(2,4)$ of length 2, plus $(1,4)$ of length 3—a total of $\\binom{4}{2} = 6$ pairs.',
            misconceptions: [
              { answer: 5, feedback: 'Adding $(1,3)$ and $(2,4)$ connects 2-step paths, but don\'t forget the 3-step path $1 \\to 2 \\to 3 \\to 4$, which requires $(1,4)$ too!' },
            ],
          },
        },
        {
          choice: {
            prompt: 'Let $R = \\{(1, 1), (2, 2)\\}$ on the set $A = \\{1, 2, 3\\}$. Which properties does $R$ satisfy?',
            options: [
              { text: 'Symmetric, antisymmetric, and transitive—but NOT reflexive (because $(3, 3)$ is missing!)', why: 'Yes! Reflexivity requires $(a, a) \\in R$ for **every** $a \\in A$, and $(3, 3) \\notin R$. Meanwhile, because there are no pairs $(a, b)$ with $a \\ne b$, symmetry, antisymmetry, and transitivity all hold vacuously!' },
              { text: 'Reflexive, symmetric, and transitive', why: 'Since $3 \\in A$ and $(3, 3) \\notin R$, $R$ is not reflexive on $A = \\{1, 2, 3\\}$.' },
              { text: 'Symmetric, so it cannot be antisymmetric', why: 'A relation with only diagonal elements $(a, a)$ has no off-diagonal pairs $(a, b)$ with $a \\ne b$, so it is BOTH symmetric and antisymmetric!' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Why is the empty relation $R = \\emptyset$ on $A = \\{1, 2, 3\\}$ **symmetric, antisymmetric, and transitive**?',
            options: [
              { text: 'Because symmetric, antisymmetric, and transitive are all conditional statements $(a, b) \\in R \\Rightarrow \\dots$, whose hypothesis is always False when $R = \\emptyset$!', why: 'Yes! Vacuous truth strikes again: you can only break transitivity if you have $(a, b) \\in R$ and $(b, c) \\in R$ without $(a, c) \\in R$. Only reflexivity ($\\forall a \\in A, (a,a) \\in R$) fails on non-empty $A$.' },
              { text: 'It is not transitive; you need at least 3 elements to be transitive', why: 'Transitivity is an "if…then" rule: if no two-step path exists, transitivity cannot be violated.' },
              { text: 'It is also reflexive', why: 'Since $1 \\in A$ and $(1,1) \\notin \\emptyset$, it is not reflexive.' },
            ],
            answer: 0,
          },
        },
        {
          puzzle: {
            id: 'relations',
            title: 'Set & Relation Matrix Architect',
            desc: 'Build relations with target combinations of properties in the Puzzles & Challenges tab.',
          },
        },
        {
          note: 'In an $n \\times n$ relation matrix $M_R$: **reflexive** = all $1$s on the diagonal; **symmetric** = mirror image across the diagonal ($M_R = M_R^\\top$); **antisymmetric** = never both $M_{ij}=1$ and $M_{ji}=1$ for $i \\ne j$; **transitive** = every 2-step path has a direct 1-step edge.',
        },
      ],
    },

    {
      id: 'equivalence-posets',
      title: 'Equivalence relations, partitions, and partial orders (Hasse diagrams)',
      goal: 'Show that equivalence relations (reflexive + symmetric + transitive) partition a set into disjoint equivalence classes $[a]_R$, and read Hasse diagrams of partial orders (reflexive + antisymmetric + transitive).',
      builds: ['relations'],
      blocks: [
        { h: 'Two grand combinations of relation properties' },
        {
          md: `Among all combinations of the four relation properties from lesson [[#relations]], two combinations rule discrete mathematics—and they differ in **just one property** (symmetric vs. antisymmetric):

1. **Equivalence Relation (Reflexive + Symmetric + Transitive):** Generalized *"sameness"* ($\\sim$).
   Examples: $a = b$, $a \\equiv b \\pmod m$ (same remainder when divided by $m$), "strings of the same length", "vertices in the same connected component of a graph".
2. **Partial Order / Poset (Reflexive + Antisymmetric + Transitive):** Generalized *"hierarchy / prerequisite"* ($\\preceq$).
   Examples: $( \\mathbb{R}, \\le )$, $( \\mathcal{P}(S), \\subseteq )$, $( \\mathbb{Z}^+, \\mid )$, and course prerequisite graphs!`,
        },
        { h: 'Equivalence relations and Partitions are two sides of one coin' },
        {
          md: `Given an equivalence relation $\\sim$ on $A$, the **equivalence class** of $a \\in A$ is the club of all elements equivalent to $a$:
$$[a] = \\{x \\in A \\mid x \\sim a\\}$$

Here is the **Fundamental Theorem of Equivalence Relations**:
- Every element $a \\in A$ belongs to its own equivalence class ($a \\in [a]$, by reflexivity).
- For any two elements $a, b \\in A$, their equivalence classes are either **identical** ($[a] = [b]$, when $a \\sim b$) or **completely disjoint** ($[a] \\cap [b] = \\emptyset$, when $a \\not\\sim b$)!
- Therefore, the equivalence classes slice $A$ into non-empty, pairwise disjoint blocks whose union is all of $A$—a **partition** of $A$! Conversely, any partition of $A$ defines an equivalence relation ("lies in the same block as").`,
        },
        { h: 'Partial Orders and Hasse Diagrams' },
        {
          md: `In a partially ordered set (**poset**) $(S, \\preceq)$, drawing every single arrow of $\\preceq$ is cluttered because reflexivity puts a loop on every vertex and transitivity adds every shortcut arrow.
A **Hasse diagram** strips away everything redundant so the hierarchy is crystal clear:
1. **Orient upward:** If $a \\prec b$ ($a \\preceq b$ and $a \\ne b$), place $b$ **higher** than $a$ on the page (so no arrowheads are needed!).
2. **Drop self-loops:** Reflexivity $(a \\preceq a)$ is understood automatically.
3. **Drop transitive shortcuts:** Only draw an edge between $a$ and $b$ if $b$ **covers** $a$ (meaning $a \\prec b$ and there is no intermediate element $c$ with $a \\prec c \\prec b$).

Because two elements in a poset might not be comparable at all (like $2$ and $3$ under divisibility $\\mid$), a poset can have **multiple minimal elements** (nothing below them) and **multiple maximal elements** (nothing above them). A **total (linear) order** is a poset where every pair is comparable ($a \\preceq b$ or $b \\preceq a$).`,
        },
        {
          symbols: [
            ['[a]_R = \\{x \\in A \\mid a\\,R\\,x\\}', 'equivalence class of a', 'All elements equivalent to $a$; either $[a] = [b]$ or $[a] \\cap [b] = \\emptyset$', 'Mod $3$ on $\\mathbb{Z}$ gives 3 classes: $[0], [1], [2]$'],
            ['A / R', 'quotient set of A by R', 'The set of all distinct equivalence classes (a partition of $A$)', '$|\\mathbb{Z} / {\\equiv_m}| = m$'],
            ['(S, \\preceq)', 'partially ordered set (poset)', 'Reflexive, **antisymmetric**, and transitive relation $\\preceq$ on $S$', '$(\\mathbb{Z}^+, \\mid)$ and $(\\mathcal{P}(A), \\subseteq)$'],
            ['B_n', 'n-th Bell number', 'The number of Equivalence Relations (or Partitions) of an $n$-element set', '$B_1 = 1, B_2 = 2, B_3 = 5, B_4 = 15$'],
          ],
        },
        {
          figure: 'HassePosetFig',
          caption: 'Switch between the Divisibility Poset $(D_{12}, \\mid)$, the Power Set Poset $(\\mathcal{P}(\\{1,2,3\\}), \\subseteq)$, and Modular Equivalence Classes $[r]_m$ to explore Hasse diagrams, minimal/maximal elements, and partitions.',
        },
        {
          worked: {
            title: 'Why $[a] \\cap [b] \\ne \\emptyset \\implies [a] = [b]$ for any equivalence relation $\\sim$',
            steps: [
              ['Suppose overlap exists', 'Let $z \\in [a] \\cap [b]$, so $z \\sim a$ and $z \\sim b$.', 'Assume classes share at least one element $z$'],
              ['Use symmetry & transitivity', 'Since $a \\sim z$ (symmetry) and $z \\sim b$, transitivity gives $a \\sim b$.', 'The representatives $a$ and $b$ are equivalent!'],
              ['Show $[a] \\subseteq [b]$', 'For any $x \\in [a]$, we have $x \\sim a$ and $a \\sim b \\implies x \\sim b \\implies x \\in [b]$.', 'And identically $[b] \\subseteq [a]$, so $[a] = [b]$! $\\blacksquare$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'On the set of integers $A = \\{1, 2, 3, \\dots, 20\\}$, define $a \\sim b \\iff a \\equiv b \\pmod 6$ (same remainder when divided by 6). How many elements are in the equivalence class $[2]$?',
            answer: Array.from({ length: 20 }, (_, i) => i + 1).filter(x => x % 6 === 2).length,
            compute: () => Array.from({ length: 20 }, (_, i) => i + 1).filter(x => x % 6 === 2).length,
            explain: 'The elements in $\\{1, \\dots, 20\\}$ leaving remainder $2$ modulo $6$ are $\\{2, 8, 14, 20\\}$: exactly **4** elements.',
          },
        },
        {
          predict: {
            prompt: 'How many distinct equivalence relations (equivalently, how many **partitions**, the Bell number $B_3$) exist on a 3-element set $A = \\{1, 2, 3\\}$?',
            answer: bellNumber(3),
            compute: () => bellNumber(3),
            explain: 'Count the ways to partition $\\{1, 2, 3\\}$ into blocks: 1 block $\\{\\{1,2,3\\}\\}$ (1 way); 2 blocks of sizes $2+1$ ($\\{\\{1,2\\},\\{3\\}\\}, \\{\\{1,3\\},\\{2\\}\\}, \\{\\{2,3\\},\\{1\\}\\}$: 3 ways); 3 singleton blocks $\\{\\{1\\},\\{2\\},\\{3\\}\\}$ (1 way). Total: $1 + 3 + 1 = 5$!',
          },
        },
        {
          choice: {
            prompt: 'In the divisibility poset $(\\{2, 3, 4, 6, 8, 12\\}, \\mid)$ (notice $1$ is NOT in the set!), what are the **minimal** elements?',
            options: [
              { text: '$2$ and $3$, because no other element in the set divides $2$ or $3$', why: 'Yes! Because $2$ and $3$ are incomparable ($2 \\nmid 3$ and $3 \\nmid 2$) and nothing smaller in the set divides either of them, **both $2$ and $3$** are minimal elements (and there is NO single "minimum" / least element!).' },
              { text: 'Only $2$, because $2 < 3$', why: 'The order relation here is **divisibility** ($\\mid$), not $\\le$! Since $2 \\nmid 3$, $2$ is not below $3$ in the Hasse diagram.' },
              { text: 'There are no minimal elements because $1$ is missing', why: 'Every finite non-empty poset has at least one minimal element ($2$ and $3$ sit at the bottom of the Hasse diagram).' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'In the Hasse diagram of $(\\{1, 2, 3, 6, 12\\}, \\mid)$, $1$ certainly divides $6$ ($1 \\mid 6$). Why is there **no direct line segment** drawn from $1$ to $6$?',
            options: [
              { text: 'Because $1 \\mid 2 \\mid 6$ (and $1 \\mid 3 \\mid 6$), so $6$ does not **cover** $1$—the relation $1 \\mid 6$ is implied by transitivity along the upward path $1 \\to 2 \\to 6$!', why: 'Yes! A Hasse diagram only draws *covering* edges ($a \\prec b$ with no $c$ strictly between $a$ and $b$).' },
              { text: 'Because $1$ and $6$ are incomparable', why: '$1$ divides every integer, so $1 \\preceq 6$ is definitely true.' },
              { text: 'Because Hasse diagrams only connect prime numbers', why: '$2 \\to 6$ and $6 \\to 12$ are drawn in the Hasse diagram.' },
            ],
            answer: 0,
          },
        },
        {
          note: '**Equivalence relations** (reflexive + symmetric + transitive) partition a set into disjoint **equivalence classes**. **Partial orders** (reflexive + antisymmetric + transitive) organize a set into a **Hasse diagram** hierarchy.',
        },
      ],
    },

    {
      id: 'cardinality-infinity',
      title: 'Countable vs. uncountable infinity: Hilbert’s Hotel and Cantor’s diagonal',
      goal: 'Use bijections to compare infinite sets, show that $\\mathbb{Z}$ and $\\mathbb{Q}$ are countably infinite ($\\aleph_0$), and prove via Cantor’s diagonalization that $\\mathbb{R}$ and $\\mathcal{P}(\\mathbb{N})$ are uncountable.',
      builds: ['functions-bijections', 'contradiction'],
      blocks: [
        { h: 'When do two infinite sets have the exact same size?' },
        {
          md: `For finite sets, you check whether $|A| = |B|$ by counting both sets. How do you compare two **infinite** sets when counting never finishes?

Georg Cantor gave the breathtakingly simple answer: two sets $A$ and $B$—finite or infinite—have the **same cardinality** ($|A| = |B|$) if and only if there exists a **bijection** $f: A \\to B$ pairing their elements up one-for-one!

A set is called **countably infinite** (cardinality $\\aleph_0$, pronounced *"aleph-null"*) if it has a bijection with the natural numbers $\\mathbb{N} = \\{0, 1, 2, 3, \\dots\\}$—meaning its elements can be arranged in a single infinite list $a_0, a_1, a_2, \\dots$ where every element appears at some finite step.

This immediately leads to **Hilbert's Grand Hotel** (an infinite hotel with rooms $0, 1, 2, 3, \\dots$, all currently full):
- **1 new guest arrives:** Ask every guest in room $n$ to move to room $n + 1$ ($f(n) = n + 1$). Room $0$ is now free!
- **Infinitely many new guests arrive:** Ask every guest in room $n$ to move to room $2n$ ($f(n) = 2n$). Now all odd-numbered rooms $1, 3, 5, \\dots$ are free!
- **All integers $\\mathbb{Z}$ are countable ($|\\mathbb{Z}| = |\\mathbb{N}|$):** List $\\mathbb{Z}$ by alternating signs: $0, 1, -1, 2, -2, 3, -3, \\dots$!
- **Even all fractions $\\mathbb{Q}$ are countable ($|\\mathbb{Q}| = |\\mathbb{N}|$):** Arrange positive fractions $p/q$ in a 2D grid and snake along the diagonals $p + q = 2, 3, 4, \\dots$, skipping duplicates!`,
        },
        { h: 'Cantor’s Diagonalization: Not all infinities are equal!' },
        {
          md: `After seeing that $\\mathbb{N}, \\mathbb{Z},$ and $\\mathbb{Q}$ all have the exact same size $\\aleph_0$, you might guess that *every* infinite set is countable. In 1891, Cantor proved by contradiction that the real numbers $\\mathbb{R}$ (and the set of infinite binary sequences $\\{0, 1\\}^\\mathbb{N}$, or $\\mathcal{P}(\\mathbb{N})$) are **uncountably infinite** ($|\\mathbb{R}| > \\aleph_0$): **no list can ever contain them all!**

**Cantor's Diagonal Proof:**
1. **Assume the opposite:** Suppose someone claims to have a complete list $s_0, s_1, s_2, \\dots$ of all infinite binary sequences (or real decimals in $(0, 1)$).
2. **Look down the main diagonal:** Look at the $n$-th bit of the $n$-th sequence, $s_n[n]$, and **flip every diagonal bit** ($0 \\leftrightarrow 1$) to build a brand-new sequence $d$:
   $$d[n] = 1 - s_n[n]$$
3. **Why $d$ cannot be anywhere on the list:** Could $d$ be sequence $s_0$? No, they differ in bit $0$ ($d[0] \\ne s_0[0]$)! Could $d$ be sequence $s_k$ for *any* $k$? **No, because by construction $d[k] \\ne s_k[k]$!**
4. **Contradiction ($\\bot$):** The sequence $d$ is missing from the list, so no list of all infinite binary sequences (or real numbers) can ever exist! $\\blacksquare$`,
        },
        {
          symbols: [
            ['|A| = |B|', 'equinumerous / same cardinality', 'There exists a bijection $f: A \\to B$', '$|\\mathbb{N}| = |\\mathbb{Z}| = |\\mathbb{Q}| = \\aleph_0$'],
            ['\\aleph_0', 'aleph-null (countably infinite)', 'The cardinality of $\\mathbb{N}$; elements can be listed as $a_0, a_1, a_2, \\dots$', 'Any subset of a countable set is countable'],
            ['d[k] = 1 - s_k[k]', 'Cantor\'s anti-diagonal sequence', 'Flips the $k$-th entry of the $k$-th row so $d \\ne s_k$ for every $k$', 'Proves $|\\{0,1\\}^\\mathbb{N}| = |\\mathcal{P}(\\mathbb{N})| = |\\mathbb{R}| > \\aleph_0$'],
            ['|A| < |\\mathcal{P}(A)|', 'Cantor\'s Theorem', 'For **every** set $A$ (even infinite ones!), its power set is strictly larger', 'Gives an endless ladder of larger infinities: $\\aleph_0 < 2^{\\aleph_0} < 2^{2^{\\aleph_0}} < \\dots$'],
          ],
        },
        {
          figure: 'CantorDiagonalFig',
          caption: 'Edit any bit in the table of binary sequences $s_0, s_1, \\dots$: Cantor’s anti-diagonal $d$ automatically flips every diagonal bit $s_k[k]$ so that $d$ differs from every row $s_k$ at position $k$!',
        },
        {
          worked: {
            title: 'Explicit bijection $f: \\mathbb{N} \\to \\mathbb{Z}$ proving $|\\mathbb{Z}| = |\\mathbb{N}| = \\aleph_0$',
            steps: [
              ['Sequence of $\\mathbb{Z}$', '$n = 0, 1, 2, 3, 4, 5, 6, \\dots \\;\\mapsto\\; 0, 1, -1, 2, -2, 3, -3, \\dots$', 'Odd $n$ go to positive integers; even $n > 0$ go to negative integers'],
              ['Formula for $f(n)$', '$f(n) = \\begin{cases} (n+1)/2 & \\text{if } n \\text{ is odd} \\\\ -n/2 & \\text{if } n \\text{ is even} \\end{cases}$', 'Check: $f(0)=0, f(1)=1, f(2)=-1, f(3)=2, f(4)=-2$'],
              ['Inverse $f^{-1}(z)$', 'If $z > 0$, $n = 2z - 1$ (odd); if $z \\le 0$, $n = -2z$ (even).', 'Every integer $z \\in \\mathbb{Z}$ appears at a unique index $n \\in \\mathbb{N}$! $\\blacksquare$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'Using the bijection $f: \\mathbb{N} \\to \\mathbb{Z}$ from the worked table above ($0 \\mapsto 0, 1 \\mapsto 1, 2 \\mapsto -1, 3 \\mapsto 2, 4 \\mapsto -2, \\dots$), at what natural-number index $n \\in \\mathbb{N}$ does the integer $z = -25$ appear?',
            answer: 50,
            compute: () => -2 * -25,
            explain: 'Negative integers $z \\le 0$ appear at even indices $n = -2z$. For $z = -25$, $n = -2(-25) = 50$ (since $f(50) = -50/2 = -25$).',
          },
        },
        {
          predict: {
            prompt: 'The **Cantor pairing function** $\\pi(x, y) = \\frac{(x+y)(x+y+1)}{2} + y$ is a bijection $\\mathbb{N} \\times \\mathbb{N} \\to \\mathbb{N}$ that walks along diagonals $x + y = 0, 1, 2, \\dots$. What single natural number does $\\pi(2, 3)$ map to?',
            answer: cantorPair(2, 3),
            compute: () => cantorPair(2, 3),
            explain: 'Here $x + y = 5$, so $\\pi(2, 3) = \\frac{5 \\times 6}{2} + 3 = 15 + 3 = 18$.',
          },
        },
        {
          choice: {
            prompt: 'Why doesn\'t Cantor\'s diagonal argument prove that the rational numbers $\\mathbb{Q}$ (or the set of *finite* binary strings $\\{0, 1\\}^*$) are uncountable?',
            options: [
              { text: 'Because flipping an infinite diagonal produces an **infinite** non-repeating decimal/bit-string, which is an irrational real number (not in $\\mathbb{Q}$) and has infinite length (not in $\\{0,1\\}^*$)!', why: 'Yes! The anti-diagonal object $d$ has infinitely many independent digits, so it lives in $\\mathbb{R}$ (and $\\{0,1\\}^\\mathbb{N}$), not in $\\mathbb{Q}$ or $\\{0,1\\}^*$.' },
              { text: 'Because rational numbers don\'t have decimal expansions', why: 'Every rational number has a terminating or eventually repeating decimal expansion.' },
              { text: 'Cantor\'s diagonal argument actually does show $\\mathbb{Q}$ is uncountable', why: '$\\mathbb{Q}$ is countably infinite ($|\\mathbb{Q}| = \\aleph_0$).' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'How does Cantor\'s diagonalization explain why the **Halting Problem** is unsolvable in computer science?',
            options: [
              { text: 'Every computer program is a finite text string (so there are only countably many programs, $\\aleph_0$), whereas there are uncountably many functions/languages $f: \\mathbb{N} \\to \\{0, 1\\}$ ($2^{\\aleph_0} > \\aleph_0$)—and Turing\'s halting paradox is literally Cantor\'s diagonal applied to programs!', why: 'Yes! Alan Turing constructed his 1936 undecidable Halting Problem by feeding program $P_k$ its own number $k$ and doing the opposite—exact diagonalization!' },
              { text: 'Because there are uncountably many computer programs', why: 'Every program is a finite string over a finite keyboard alphabet, so the set of all programs is countably infinite ($\\aleph_0$).' },
              { text: 'Because computers only have finite RAM', why: 'Even a Turing machine with unbounded infinite tape cannot solve the Halting Problem.' },
            ],
            answer: 0,
          },
        },
        {
          note: '$\\mathbb{N}, \\mathbb{Z}, \\mathbb{Q},$ and the set of all finite strings/programs are **countably infinite** ($\\aleph_0$). By **Cantor\'s Diagonalization**, $\\mathbb{R}$ and $\\mathcal{P}(\\mathbb{N})$ are **uncountable** ($2^{\\aleph_0} > \\aleph_0$), proving that most functions $f: \\mathbb{N} \\to \\{0,1\\}$ have no computer program that computes them!',
        },
      ],
    },
  ],
}
