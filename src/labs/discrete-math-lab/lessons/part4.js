// Part 4: Combinatorics & The Art of Counting — sum & product rules, permutations, combinations & Pascal,
// Binomial theorem & Stars-and-Bars, Inclusion-Exclusion, Derangements & Pigeonhole Principle.
import {
  factorial, perm, choose, multinomial, starsAndBars,
  inclusionExclusion2, inclusionExclusion3, derangements, pigeonholeMin,
} from '../engine/discrete.js'

export const PART4 = {
  id: 'combinatorics',
  title: 'Part [[#part:combinatorics]] · Combinatorics & the art of counting',
  lessons: [
    {
      id: 'sum-product-rules',
      title: 'The sum rule, the product rule, and counting by complement',
      goal: 'Know immediately when to add ($|A \\cup B| = |A| + |B|$ for disjoint cases) versus when to multiply ($|A \\times B| = |A|\\cdot|B|$ for sequential stages), and count "at least one" using the complement.',
      builds: ['set-operations'],
      blocks: [
        { h: 'Why counting is the art of turning OR into + and AND-THEN into ×' },
        {
          md: `Every advanced counting formula in mathematics is built from two foundational rules:

1. **The Sum Rule (Disjoint Cases — OR):**
   If a choice can be made from set $A$ **OR** from a completely disjoint set $B$ ($A \\cap B = \\emptyset$), you **add** the number of options:
   $$|A \\cup B| = |A| + |B|$$
2. **The Product Rule (Sequential Stages — AND THEN):**
   If a procedure consists of Stage 1 ($m$ ways) **AND THEN** Stage 2 ($n$ ways for *each* outcome of Stage 1), you **multiply** the number of options:
   $$\\text{Total outcomes} = m \\times n$$

Look at the subtle superpower of the Product Rule: the *actual list* of choices in Stage 2 is allowed to change depending on what you picked in Stage 1, as long as the **number** of choices $n$ stays the same! For example, when picking 2 different letters from $\{A, B, C, D\}$:
- Stage 1: **4** choices ($A, B, C,$ or $D$).
- Stage 2: the remaining **3** letters differed depending on Stage 1, but there are always **3** of them! So $4 \\times 3 = 12$ pairs.`,
        },
        { h: 'Counting by Complement: When "at least one" is painful, subtract "none"!' },
        {
          md: `Suppose you want to count 4-character passwords from $26$ letters and $10$ digits ($36$ characters total) that contain **at least one digit**.
- Going directly is a mess: you could have 1 digit (in 4 positions), or 2 digits, or 3 digits, or 4 digits.
- **Complement Rule ($|A| = |U| - |A^c|$):** By De Morgan's quantifier law (lesson [[#quantifiers]]), the opposite of *"at least one digit"* ($\\exists$) is *"NO digits at all"* ($\\forall$: all 4 characters are letters!).
  - Total 4-character strings: $36^4$.
  - Strings with **zero** digits (letters only): $26^4$.
  - Strings with **at least one** digit: $36^4 - 26^4$! Done in one subtraction.`,
        },
        {
          symbols: [
            ['|A \\cup B| = |A| + |B|', 'Sum Rule (disjoint union)', 'Add when splitting into mutually exclusive cases ($A \\cap B = \\emptyset$)', '3 shirts OR 4 sweaters $= 3 + 4 = 7$ tops'],
            ['m_1 \\times m_2 \\times \\dots \\times m_k', 'Product Rule (sequential stages)', 'Multiply when making a sequence of $k$ choices one after another', '3 tops AND 4 pants $= 3 \\times 4 = 12$ outfits'],
            ['|U| - |A^c|', 'Complement Counting', 'Total outcomes minus the forbidden/opposite outcomes', '"At least one 1" $= \\text{All} - \\text{"no 1s"}$'],
            ['2^n', 'bit strings of length n', '$n$ sequential binary stages ($0$ or $1$), giving $2 \\times 2 \\times \\dots \\times 2 = 2^n$', '8-bit byte has $2^8 = 256$ values'],
          ],
        },
        {
          figure: 'DecisionTreeCounterFig',
          caption: 'Adjust the branching factor at each stage of the decision tree to see how sequential choices multiply ($a \\times b \\times c$) and how complement counting prunes forbidden branches.',
        },
        {
          worked: {
            title: 'Counting 8-bit strings that start with `10` OR end with `111` (Careful: do they overlap?)',
            steps: [
              ['Set $A$: starts with `10`', 'First 2 bits fixed; remaining 6 bits have $2^6 = 64$ ways.', '$|A| = 64$'],
              ['Set $B$: ends with `111`', 'Last 3 bits fixed; first 5 bits have $2^5 = 32$ ways.', '$|B| = 32$'],
              ['Overlap $A \\cap B$: both!', 'Starts with `10` AND ends with `111`: middle 3 bits have $2^3 = 8$ ways.', 'Wait: $A$ and $B$ are NOT disjoint! $|A \\cap B| = 8$'],
              ['Subtract the double-counted overlap', '$|A \\cup B| = |A| + |B| - |A \\cap B| = 64 + 32 - 8 = 88$.', 'Preview of Inclusion–Exclusion (lesson [[#inclusion-exclusion]])!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'A license plate consists of **2 uppercase letters** (from 26) followed by **3 digits** (from 10), with repetition allowed. How many plates are possible?',
            answer: 26 * 26 * 10 * 10 * 10,
            compute: () => 26 * 26 * 10 * 10 * 10,
            explain: 'By the Product Rule across the 5 positions: $26 \\times 26 \\times 10 \\times 10 \\times 10 = 676 \\times 1000 = 676000$.',
          },
        },
        {
          predict: {
            prompt: 'How many 6-bit binary strings (out of $2^6 = 64$) contain **at least one `1`**?',
            answer: 2 ** 6 - 1,
            compute: () => 2 ** 6 - 1,
            explain: 'By complement counting: all $2^6 = 64$ strings minus the **1** string with zero `1`s (`000000`) gives $64 - 1 = 63$.',
          },
        },
        {
          predict: {
            prompt: 'How many **palindromic** 5-bit binary strings exist (strings like `10101` that read the same forwards and backwards)?',
            answer: 2 ** 3,
            compute: () => 2 ** 3,
            explain: 'Once you choose the first 3 bits ($b_1, b_2, b_3$, in $2 \\times 2 \\times 2 = 8$ ways), the last 2 bits are forced to match $b_2$ and $b_1$ ($1 \\times 1$ way)! So $2^3 = 8$.',
          },
        },
        {
          choice: {
            prompt: 'A student wants to count 3-letter words from $\\{A, B, C, D, E\\}$ containing **at least one $A$**. They reason: *"Pick which of the 3 slots gets an $A$ (3 ways), then fill the other 2 slots with any of the 5 letters ($5 \\times 5 = 25$ ways), giving $3 \\times 25 = 75$."* Why is $75$ **wrong**?',
            options: [
              { text: 'It **overcounts** words with multiple $A$s! For instance, $AAA$ is counted 3 times (once when slot 1 is the "chosen $A$", once for slot 2, once for slot 3). The right count by complement is $5^3 - 4^3 = 125 - 64 = 61$!', why: 'Yes! Whenever you say "pick one slot to be $A$ and let the other slots be anything (including $A$)", outcomes with two or three $A$s get produced along multiple branches of your tree!' },
              { text: 'They should have added $3 + 25 = 28$ instead of multiplying', why: 'The mistake is not addition vs. multiplication; it is that the 3 branches overlap on words with two or three $A$s.' },
              { text: '$75$ is actually the right answer', why: 'Notice $5^3 = 125$ total words and $4^3 = 64$ words without $A$, so $125 - 64 = 61 \\ne 75$.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'You can pick a project topic from **3 lists** containing $5, 7,$ and $4$ distinct topics respectively (no topic appears on more than one list). You must choose **1 topic** in total. How many choices do you have?',
            options: [
              { text: '$5 + 7 + 4 = 16$, by the Sum Rule (picking from List 1 OR List 2 OR List 3)', why: 'Yes! Because you are choosing **one** topic in total from three disjoint lists, the cases are mutually exclusive, so you add.' },
              { text: '$5 \\times 7 \\times 4 = 140$, by the Product Rule', why: '$140$ would be the number of ways to pick **three** topics—one from *each* list!' },
              { text: '$3^{16}$', why: 'You are making 1 choice out of $5+7+4=16$ topics.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'Ask yourself one question: **"Am I doing Stage 1 AND THEN Stage 2 (multiply), or Case 1 OR Case 2 (add)?"** And whenever you see the phrase **"at least one"**, immediately try **Total minus None**!',
        },
      ],
    },

    {
      id: 'permutations',
      title: 'Permutations (n! and P(n, k)) and arrangements with repeats',
      goal: 'Count ordered arrangements $n!$ and $P(n, k) = \\frac{n!}{(n-k)!}$, circular seatings $(n-1)!$, and anagram permutations with repeated letters using multinomial coefficients.',
      builds: ['sum-product-rules'],
      blocks: [
        { h: 'Ordering distinct items without replacement' },
        {
          md: `A **permutation** is an **ordered arrangement** of objects.
Suppose you have $n$ distinct books and want to line up $k$ of them on a shelf ($1 \\le k \\le n$):
- **Slot 1:** $n$ choices.
- **Slot 2:** $n - 1$ choices left.
- …
- **Slot $k$:** $n - k + 1$ choices left.

By the Product Rule, the number of **$k$-permutations of $n$ distinct objects** is:

$$P(n, k) = \\underbrace{n(n - 1)(n - 2)\\cdots(n - k + 1)}_{k \\text{ factors}} = \\frac{n!}{(n - k)!}$$

When $k = n$ (lining up **all $n$** objects), there are $n! = n(n-1)\\cdots 1$ permutations. And why do we define **$0! = 1$**?
1. Combina-torially: there is **1** way to arrange zero objects (the empty arrangement $\\emptyset$).
2. Algebraically: setting $k = n$ in $\\frac{n!}{(n-k)!}$ gives $P(n, n) = \\frac{n!}{0!}$, which equals $n!$ only if $0! = 1$!`,
        },
        { h: 'Dividing out symmetry: Circular permutations and repeated letters' },
        {
          md: `What happens when some arrangements that look different in a line are actually **identical**? **Divide by the size of each symmetry group (the Shepherd's / Division Rule)!**
*(Old math joke: To count a flock of sheep, count their legs and divide by 4.)*

1. **Circular Permutations ($(n-1)!$):**
   How many ways can $n$ people sit around a round table, where rotating everyone by $1, 2, \\dots, n$ seats gives the **exact same seating**?
   Every circular seating corresponds to **$n$ different linear permutations** (one for each of the $n$ rotation angles), so:
   $$\\text{Circular arrangements} = \\frac{n!}{n} = (n - 1)!$$
2. **Permutations with Indistinguishable Repeats (Anagrams):**
   How many distinct words can you form by rearranging the 5 letters of $\\text{LEVEL}$ ($2$ $L$s, $2$ $E$s, $1$ $V$)?
   If you painted tiny subscripts $L_1 E_1 V E_2 L_2$, there would be $5! = 120$ arrangements. But erasing the subscripts collapses the $2!$ ways to swap the two $L$s and the $2!$ ways to swap the two $E$s:
   $$\\text{Distinct arrangements} = \\frac{5!}{2!\\,2!\\,1!} = \\frac{120}{4} = 30$$`,
        },
        {
          symbols: [
            ['n!', 'n factorial', 'Number of ways to order all $n$ distinct items; $0! = 1$', '$5! = 5\\times 4\\times 3\\times 2\\times 1 = 120$'],
            ['P(n, k) = \\frac{n!}{(n-k)!}', 'k-permutations of n', 'Ways to pick and **order** $k$ distinct items out of $n$', '$P(10, 3) = 10 \\times 9 \\times 8 = 720$'],
            ['(n - 1)!', 'circular permutations', 'Ways to arrange $n$ items in a circle (up to rotation)', '6 people at a round table: $5! = 120$'],
            ['\\frac{n!}{n_1!\\,n_2!\\cdots n_r!}', 'multinomial coefficient', 'Distinct arrangements of $n$ items when type $i$ is repeated $n_i$ times', 'For $\\text{PEPPER}$ ($3P, 2E, 1R$): $\\frac{6!}{3!2!1!} = 60$'],
          ],
        },
        {
          figure: 'PermutationExplorerFig',
          caption: 'Explore linear permutations $P(n, k)$, circular seatings $(n-1)!$, and anagram divisions $\\frac{n!}{n_1!\\cdots n_r!}$ on words with repeated letters.',
        },
        {
          worked: {
            title: 'Counting every distinct rearrangement of the 11-letter word MISSISSIPPI',
            steps: [
              ['Count each letter', '$M: 1,\\; I: 4,\\; S: 4,\\; P: 2$ (Total $n = 1 + 4 + 4 + 2 = 11$ letters).', 'Identify the repeat multiplicities'],
              ['If all were distinct', '$11! = 39{,}916{,}800$ linear permutations.', 'Put temporary subscripts on identical letters'],
              ['Divide by repeat symmetries', '$\\frac{11!}{1!\\,4!\\,4!\\,2!} = \\frac{39{,}916{,}800}{1 \\times 24 \\times 24 \\times 2} = 34{,}650$.', 'Swapping the $4$ $I$s ($4!$), $4$ $S$s ($4!$), and $2$ $P$s ($2!$) changes nothing!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'A race has $8$ runners. How many ways can the Gold (1st), Silver (2nd), and Bronze (3rd) medals be awarded ($P(8, 3)$)?',
            answer: perm(8, 3),
            compute: () => perm(8, 3),
            explain: '$P(8, 3) = 8 \\times 7 \\times 6 = 336$.',
          },
        },
        {
          predict: {
            prompt: 'How many distinct 6-letter strings can be formed by rearranging all the letters of the word **BANANA** ($1\\text{ B}, 3\\text{ A}, 2\\text{ N}$)?',
            answer: multinomial([1, 3, 2]),
            compute: () => multinomial([1, 3, 2]),
            explain: '$\\frac{6!}{1!\\,3!\\,2!} = \\frac{720}{1 \\times 6 \\times 2} = \\frac{720}{12} = 60$.',
            misconceptions: [
              { answer: 720, feedback: '$720 = 6!$ treats the three $A$s and two $N$s as distinguishable; divide by $3!\\,2! = 12$!' },
            ],
          },
        },
        {
          predict: {
            prompt: 'In how many ways can $6$ friends sit around a **circular** campfire if rotations of the same circle count as the same seating?',
            answer: factorial(5),
            compute: () => factorial(5),
            explain: 'Fix the first person\'s seat as the reference point to eliminate the 6 rotations; the remaining 5 people can sit in $(6 - 1)! = 5! = 120$ ways.',
          },
        },
        {
          choice: {
            prompt: 'How many permutations of the 6 letters $\\{A, B, C, D, E, F\\}$ have the letters $A, B, C$ appearing **together as a contiguous block** (in any internal order, like `CAB` or `ABC`)?',
            options: [
              { text: '$4! \\times 3! = 24 \\times 6 = 144$: glue $\\{A, B, C\\}$ into 1 super-tile (giving $4$ items to arrange in $4!$ ways), then arrange $A, B, C$ inside the block in $3!$ ways', why: 'Yes! Treating a contiguous group as a single "super-object" and then multiplying by its internal permutations is the standard trick for adjacency constraints.' },
              { text: '$4! = 24$', why: '$4!$ only counts arrangements where the block is frozen in the single order `ABC`; the problem allows any internal order ($3! = 6$ ways) inside the block.' },
              { text: '$6! - 3! = 714$', why: 'Subtracting $3!$ does not count contiguous blocks.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Remember in lesson [[#functions-bijections]] we counted **injective** functions $f: A \\to B$ when $|A| = k$ and $|B| = n$. Which combinatorics formula is that?',
            options: [
              { text: '$P(n, k) = \\frac{n!}{(n-k)!}$: an injection from a $k$-element domain into an $n$-element codomain is literally a $k$-permutation of $B$!', why: 'Yes! Picking distinct outputs in $B$ for the $1$st, $2$nd, …, $k$-th elements of $A$ is $n(n-1)\\cdots(n-k+1) = P(n, k)$.' },
              { text: '$n^k$', why: '$n^k$ counts *all* functions $A \\to B$ (allowing collisions / repetition).' },
              { text: '$k!$', why: '$k!$ only counts bijections when $n = k$.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'When **order matters**, use permutations $P(n, k) = \\frac{n!}{(n-k)!}$. When identical objects or rotational symmetries make $d$ linear arrangements indistinguishable, **divide by $d$**.',
        },
      ],
    },

    {
      id: 'combinations',
      title: 'Combinations C(n, k), Pascal’s triangle, and combinatorial proofs',
      goal: 'Derive $\\binom{n}{k} = \\frac{n!}{k!(n-k)!}$ by dividing out order, explain Pascal’s identity $\\binom{n}{k} = \\binom{n-1}{k-1} + \\binom{n-1}{k}$ and Vandermonde’s identity by double counting, and read Pascal’s triangle.',
      builds: ['permutations'],
      blocks: [
        { h: 'When order stops mattering, divide P(n, k) by k!' },
        {
          md: `Suppose you have $n$ players and want to choose a **team** (a subset!) of $k$ players.
Picking $\{Alice, Bob, Carol\}$ is the **exact same team** as picking $\{Carol, Alice, Bob\}$.

How does this relate to $P(n, k)$ from lesson [[#permutations]]?
Every unordered team of $k$ people can be lined up in **$k!$** different ordered permutations. So $P(n, k)$ counts every team **$k!$ times**! Dividing by $k!$ gives the number of **$k$-combinations** (subsets of size $k$), written $\\binom{n}{k}$ or $C(n, k)$ and read **"$n$ choose $k$"**:

$$\\binom{n}{k} = \\frac{P(n, k)}{k!} = \\frac{n!}{k!\\,(n - k)!}$$`,
        },
        { h: 'Combinatorial Proofs: Proving identities by telling a counting story' },
        {
          md: `You can prove binomial identities with messy factorial algebra—or you can prove them in **two sentences** by showing that both sides of the equation count the **exact same set of objects** in two different ways!

1. **Symmetry Identity:** $\\binom{n}{k} = \\binom{n}{n - k}$
   *Story:* Choosing which $k$ items to **take** into your backpack is the exact same decision as choosing which $n - k$ items to **leave behind**!
2. **Pascal's Identity:** $\\binom{n}{k} = \\binom{n - 1}{k - 1} + \\binom{n - 1}{k}$
   *Story:* Fix one special person, say **Alice**, among the $n$ candidates. Every $k$-person team either:
   - **Includes Alice:** then we must choose the remaining $k - 1$ teammates from the other $n - 1$ people: $\\binom{n-1}{k-1}$ ways; **OR**
   - **Excludes Alice:** then we must choose all $k$ teammates from the other $n - 1$ people: $\\binom{n-1}{k}$ ways.
   By the Sum Rule, $\\binom{n}{k} = \\binom{n-1}{k-1} + \\binom{n-1}{k}$! That is why every entry in **Pascal's Triangle** is the sum of the two entries directly above it.
3. **Sum of Row $n$ of Pascal's Triangle:** $\\sum_{k=0}^n \\binom{n}{k} = 2^n$
   *Story:* LHS counts subsets of size $0$, plus size $1$, …, plus size $n$. Together, that is **all subsets** of an $n$-element set, which we know from lesson [[#set-operations]] is $|\\mathcal{P}(A)| = 2^n$!`,
        },
        {
          symbols: [
            ['\\binom{n}{k} = \\frac{n!}{k!(n-k)!}', 'n choose k (binomial coefficient)', 'Number of **unordered** $k$-element subsets of an $n$-element set', '$\\binom{5}{2} = \\frac{5 \\times 4}{2 \\times 1} = 10$'],
            ['\\binom{n}{k} = \\binom{n}{n-k}', 'symmetry of combinations', 'Picking $k$ winners equals picking $n - k$ non-winners', '$\\binom{100}{98} = \\binom{100}{2} = \\frac{100 \\times 99}{2} = 4950$'],
            ['\\binom{n}{k} = \\binom{n-1}{k-1} + \\binom{n-1}{k}', 'Pascal\'s Identity', 'Every $k$-subset either includes element $x$ ($\\binom{n-1}{k-1}$) or excludes $x$ ($\\binom{n-1}{k}$)', 'Generates Pascal\'s Triangle row by row'],
            ['\\sum_{j=0}^k \\binom{m}{j}\\binom{n}{k-j} = \\binom{m+n}{k}', 'Vandermonde\'s Identity', 'Choosing $k$ people from $m$ juniors and $n$ seniors by splitting on how many juniors $j$ are chosen', 'When $m=n=k$: $\\sum_{j=0}^n \\binom{n}{j}^2 = \\binom{2n}{n}$'],
          ],
        },
        {
          figure: 'PascalTriangleFig',
          caption: 'Click any cell $\\binom{n}{k}$ in Pascal’s Triangle to highlight its two parent cells $\\binom{n-1}{k-1} + \\binom{n-1}{k}$, check the row sum $2^n$, and verify symmetry $\\binom{n}{k} = \\binom{n}{n-k}$.',
        },
        {
          worked: {
            title: 'Committee with a Leader: Proving $k\\binom{n}{k} = n\\binom{n-1}{k-1}$ combinatorially',
            steps: [
              ['What we are counting', 'Ways to choose a $k$-person committee from $n$ people, with **1 person designated as chair**.', 'Count this single set of outcomes in two orders'],
              ['Method 1 (LHS)', 'First choose the $k$-person committee ($\\binom{n}{k}$ ways), then pick 1 of those $k$ members as chair ($k$ ways).', 'Product Rule gives $k\\binom{n}{k}$'],
              ['Method 2 (RHS)', 'First pick the chair from all $n$ people ($n$ ways), then choose the other $k-1$ regular members from the remaining $n-1$ people ($\\binom{n-1}{k-1}$ ways).', 'Product Rule gives $n\\binom{n-1}{k-1}$. Therefore $k\\binom{n}{k} = n\\binom{n-1}{k-1}$! $\\blacksquare$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'A pizza shop offers $10$ toppings. How many different 3-topping pizzas can you order ($\\binom{10}{3}$)?',
            answer: choose(10, 3),
            compute: () => choose(10, 3),
            explain: 'Order of toppings on a pizza doesn\'t matter, so $\\binom{10}{3} = \\frac{10 \\times 9 \\times 8}{3 \\times 2 \\times 1} = 120$.',
          },
        },
        {
          predict: {
            prompt: 'You walk on a rectangular street grid from $(0, 0)$ to $(5, 3)$, moving only **East ($E$)** or **North ($N$)** one block at a time. Every path is a string of $5$ $E$s and $3$ $N$s ($8$ steps total). How many shortest paths are there?',
            answer: choose(8, 3),
            compute: () => choose(8, 3),
            explain: 'Out of $5 + 3 = 8$ total steps, you simply choose which $3$ steps are North (the other $5$ must be East): $\\binom{8}{3} = \\frac{8 \\times 7 \\times 6}{3 \\times 2 \\times 1} = 56$.',
          },
        },
        {
          predict: {
            prompt: 'Using **Vandermonde\'s special case** $\\sum_{k=0}^n \\binom{n}{k}^2 = \\binom{2n}{n}$, what is $\\binom{4}{0}^2 + \\binom{4}{1}^2 + \\binom{4}{2}^2 + \\binom{4}{3}^2 + \\binom{4}{4}^2$?',
            answer: choose(8, 4),
            compute: () => choose(8, 4),
            explain: '$1^2 + 4^2 + 6^2 + 4^2 + 1^2 = 1 + 16 + 36 + 16 + 1 = 70 = \\binom{8}{4}$!',
          },
        },
        {
          choice: {
            prompt: 'A club has $6$ men and $5$ women. How many 4-person committees contain **at least $1$ woman**?',
            options: [
              { text: '$\\binom{11}{4} - \\binom{6}{4} = 330 - 15 = 315$ (all 4-person committees from 11 people, minus committees with **zero** women)', why: 'Yes! Complement counting avoids splitting into 1, 2, 3, or 4 women—and avoids the overcounting trap!' },
              { text: '$\\binom{5}{1} \\times \\binom{10}{3} = 5 \\times 120 = 600$', why: 'Classic overcounting trap! Picking "1 woman first and then 3 of the remaining 10 people" counts a committee with 2 women twice!' },
              { text: '$\\binom{6}{2} \\times \\binom{5}{2} = 150$', why: 'That only counts committees with *exactly* 2 men and 2 women.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Why is the sum of the **even-indexed** entries in row $n$ of Pascal\'s triangle ($\\binom{n}{0} + \\binom{n}{2} + \\binom{n}{4} + \\dots$) always equal to the sum of the **odd-indexed** entries ($\\binom{n}{1} + \\binom{n}{3} + \\dots = 2^{n-1}$) for every $n \\ge 1$?',
            options: [
              { text: 'Toggling whether element $1$ is in or out of a subset flips the subset\'s size between even and odd, creating a bijection between even-sized subsets and odd-sized subsets!', why: 'Yes! And algebraically, setting $x = 1, y = -1$ in the Binomial Theorem $(1 - 1)^n = \\sum_{k=0}^n \\binom{n}{k}(-1)^k = 0$ immediately shows Even Sum $-$ Odd Sum $= 0$!' },
              { text: 'Only when $n$ is odd, by symmetry $\\binom{n}{k} = \\binom{n}{n-k}$', why: 'Even when $n$ is even (like row 4: $1, 4, 6, 4, 1$), the even positions $1 + 6 + 1 = 8$ still equal the odd positions $4 + 4 = 8 = 2^3$!' },
              { text: 'Because every entry in Pascal\'s triangle is even', why: 'Many entries in Pascal\'s triangle are odd (for instance, the edges are all $1$).' },
            ],
            answer: 0,
          },
        },
        {
          note: '**Permutations $P(n, k)$** care about order; **combinations $\\binom{n}{k} = \\frac{P(n,k)}{k!}$** care only about which subset of $k$ items was chosen. Whenever you see a binomial identity, ask: *"What single counting problem do both sides solve?"*',
        },
      ],
    },

    {
      id: 'binomial-stars-bars',
      title: 'The Binomial Theorem and Stars-and-Bars (multisets)',
      goal: 'Expand $(x + y)^n$ using the Binomial Theorem, find any specific coefficient rapidly, and use Stars-and-Bars $\\binom{n + k - 1}{k - 1}$ to count distributions of $n$ identical items into $k$ distinct bins.',
      builds: ['combinations'],
      blocks: [
        { h: 'Why (x + y)ⁿ has Pascal’s Triangle as its coefficients' },
        {
          md: `When you expand $(x + y)^3 = (x + y)(x + y)(x + y)$ without simplifying, you get $2^3 = 8$ terms—one for each way of picking either $x$ or $y$ from each of the $3$ brackets:
$$xxx + xxy + xyx + yxx + xyy + yxy + yyx + yyy$$
How many of those terms simplify to $x^2 y$? Any term that picked **$y$ from exactly $1$ of the $3$ brackets** (and $x$ from the other $2$): there are $\\binom{3}{1} = 3$ such terms!

In general, when expanding $(x + y)^n = (x + y)(x + y)\\cdots(x + y)$, a term becomes $x^{n-k} y^k$ whenever we choose $y$ from **exactly $k$ of the $n$ brackets**. There are $\\binom{n}{k}$ ways to choose those $k$ brackets, giving the **Binomial Theorem**:

$$(x + y)^n = \\sum_{k=0}^n \\binom{n}{k} x^{n-k} y^k$$`,
        },
        { h: 'Stars and Bars: Choosing with Repetition / Distributing Identical Items' },
        {
          md: `What if order does **not** matter, AND **repetition IS allowed**?
Suppose a bakery sells **$k = 3$ flavors** of donuts (Glazed, Chocolate, Maple) and you want to buy a box of **$n = 5$ donuts**.
Since the donuts of a given flavor are identical, your order is completely described by how many of each flavor you pick:
$$x_1 + x_2 + x_3 = 5 \\qquad (x_i \\ge 0 \\text{ integers})$$

Represent the $n = 5$ donuts as **$5$ stars ($\\star$)**, and separate the $k = 3$ flavor bins using **$k - 1 = 2$ vertical divider bars ($|$)**:
- $\\star\\star \\mid \\star\\star \\mid \\star$ means $(2\\text{ Glazed}, 2\\text{ Choc}, 1\\text{ Maple})$.
- $\\star\\star\\star\\star\\star \\mid \\mid$ means $(5\\text{ Glazed}, 0\\text{ Choc}, 0\\text{ Maple})$.

Every valid order is a string of **$n$ stars and $k - 1$ bars** ($n + k - 1$ symbols in total)! How many such strings exist? Just choose which $k - 1$ positions hold the bars (or which $n$ positions hold the stars):

$$\\left(\\!\\binom{k}{n}\\!\\right) = \\binom{n + k - 1}{k - 1} = \\binom{n + k - 1}{n}$$`,
        },
        {
          symbols: [
            ['(x+y)^n = \\sum_{k=0}^n \\binom{n}{k}x^{n-k}y^k', 'Binomial Theorem', 'Coefficient of $x^{n-k}y^k$ is $\\binom{n}{k}$', 'Setting $x=y=1$ gives $\\sum \\binom{n}{k} = 2^n$'],
            ['\\binom{n + k - 1}{k - 1} = \\binom{n + k - 1}{n}', 'Stars and Bars (multisets)', 'Ways to place $n$ identical stars into $k$ distinct bins ($x_1 + \\dots + x_k = n, x_i \\ge 0$)', '5 donuts from 3 flavors: $\\binom{5+3-1}{3-1} = \\binom{7}{2} = 21$'],
            ['\\binom{n - 1}{k - 1}', 'positive integer solutions ($x_i \\ge 1$)', 'First put 1 star in each of the $k$ bins, then distribute the remaining $n - k$ stars', '$x_1 + x_2 + x_3 = 10$ with $x_i \\ge 1$: $\\binom{10-1}{3-1} = \\binom{9}{2} = 36$'],
          ],
        },
        {
          figure: 'StarsAndBarsFig',
          caption: 'Adjust the number of identical stars $n$ and bins $k$, and click through the Stars-and-Bars arrangements to see how $n$ stars and $k - 1$ divider bars encode every non-negative integer solution to $x_1 + \\dots + x_k = n$.',
        },
        {
          worked: {
            title: 'The Fourfold Way of Choosing $k$ items from $n$ types',
            steps: [
              ['Order matters, NO repeats', '$P(n, k) = \\frac{n!}{(n-k)!}$', '3-person podium from 10 runners'],
              ['Order matters, repeats OK', '$n^k$', '3-digit PIN from 10 digits'],
              ['Order DOES NOT matter, NO repeats', '$\\binom{n}{k} = \\frac{n!}{k!(n-k)!}$', '3-person committee from 10 people'],
              ['Order DOES NOT matter, repeats OK', '$\\binom{k + n - 1}{k} = \\binom{k + n - 1}{n - 1}$', 'Buying $k$ donuts from $n$ flavors (Stars = $k$, Bins = $n$)!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'In the expansion of $(2x - 3)^4$, what is the coefficient of $x^2$? (Remember to raise both the number $2$ and the number $-3$ to their powers!)',
            answer: choose(4, 2) * (2 ** 2) * ((-3) ** 2),
            compute: () => choose(4, 2) * (2 ** 2) * ((-3) ** 2),
            explain: 'The $x^2$ term has $k = 2$: $\\binom{4}{2}(2x)^2(-3)^2 = 6 \\times 4x^2 \\times 9 = 216x^2$.',
            misconceptions: [
              { answer: choose(4, 2), feedback: '$\\binom{4}{2} = 6$ is only the binomial coefficient; don\'t forget the factors $2^2 = 4$ and $(-3)^2 = 9$ from $(2x)^2(-3)^2$!' },
              { answer: -216, feedback: 'Since $(-3)$ is squared, $(-3)^2 = +9$ is positive!' },
            ],
          },
        },
        {
          predict: {
            prompt: 'How many non-negative integer solutions $(x_1, x_2, x_3, x_4)$ with $x_i \\ge 0$ satisfy $x_1 + x_2 + x_3 + x_4 = 6$?',
            answer: starsAndBars(6, 4),
            compute: () => starsAndBars(6, 4),
            explain: 'Here we have $n = 6$ stars and $k = 4$ bins ($k - 1 = 3$ bars), giving $\\binom{6 + 4 - 1}{4 - 1} = \\binom{9}{3} = \\frac{9 \\times 8 \\times 7}{3 \\times 2 \\times 1} = 84$.',
          },
        },
        {
          predict: {
            prompt: 'What if every variable must be **strictly positive** ($x_i \\ge 1$): how many positive integer solutions satisfy $x_1 + x_2 + x_3 + x_4 = 10$?',
            answer: starsAndBars(10 - 4, 4),
            compute: () => starsAndBars(10 - 4, 4),
            explain: 'Give 1 star to each of the 4 variables up front (using 4 stars). Now distribute the remaining $n\' = 10 - 4 = 6$ stars into $k = 4$ bins: $\\binom{6 + 4 - 1}{4 - 1} = \\binom{9}{3} = 84$ (which matches $\\binom{n-1}{k-1} = \\binom{9}{3}$).',
          },
        },
        {
          choice: {
            prompt: 'In Stars and Bars with $n$ items and $k$ bins, why is the formula $\\binom{n + k - 1}{k - 1}$ instead of $\\binom{n + k}{k}$?',
            options: [
              { text: 'Because separating $k$ bins in a row requires only **$k - 1$ interior divider bars** (just as cutting a log into $k$ pieces takes $k - 1$ saw cuts)!', why: 'Yes! Two bars split a line into three regions; $k - 1$ bars split a line into $k$ regions, so there are $n + (k - 1)$ total symbols.' },
              { text: 'Because one item is always discarded', why: 'All $n$ stars are kept; the $-1$ comes from needing $k - 1$ bars for $k$ bins.' },
              { text: 'Because the first bin cannot be empty', why: 'In standard Stars and Bars ($x_i \\ge 0$), any bin can be empty (two bars side-by-side $\\mid\\mid$ represent an empty bin).' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'What does the Binomial Theorem give when you plug in $x = 2$ and $y = 1$ into $(x + y)^n = \\sum_{k=0}^n \\binom{n}{k} x^{n-k} y^k$?',
            options: [
              { text: '$\\sum_{k=0}^n \\binom{n}{k} 2^{n-k} = (2 + 1)^n = 3^n$', why: 'Yes! And combinatorially, $3^n$ counts assigning each of $n$ items to one of 3 states: Left, Middle, or Right!' },
              { text: '$2^n$', why: '$2^n$ comes from $(1 + 1)^n$. With $x = 2, y = 1$, we get $(2 + 1)^n = 3^n$.' },
              { text: '$0$', why: '$0$ comes from $(1 + (-1))^n$.' },
            ],
            answer: 0,
          },
        },
        {
          puzzle: {
            id: 'counting',
            title: 'Grid Walk & Stars-and-Bars Vault',
            desc: 'Practice lattice walks with blocked intersections and Stars-and-Bars challenges in the Puzzles tab.',
          },
        },
        {
          note: 'In **Stars and Bars**, always identify what the **identical stars ($n$)** are and what the **distinct bins ($k$)** are: then $n$ stars and $k - 1$ bars give $\\binom{n + k - 1}{k - 1}$ ways. If each bin needs at least $c_i$ items, pre-place $c_i$ stars in bin $i$ first!',
        },
      ],
    },

    {
      id: 'inclusion-exclusion',
      title: 'Inclusion–Exclusion, derangements (!n), and the Pigeonhole Principle',
      goal: 'Apply the Principle of Inclusion–Exclusion for 2, 3, or $m$ overlapping sets, count derangements $!n \\approx n!/e$, and use the Generalized Pigeonhole Principle $\\lceil N/k \\rceil$ to guarantee collisions.',
      builds: ['binomial-stars-bars'],
      blocks: [
        { h: 'Counting overlapping sets without double-counting' },
        {
          md: `When two sets $A$ and $B$ overlap, adding $|A| + |B|$ counts every element in the intersection $A \\cap B$ **twice**. Subtracting $|A \\cap B|$ once fixes the count:
$$|A \\cup B| = |A| + |B| - |A \\cap B|$$

What about **three** sets $A, B, C$?
1. **Include single sets:** $+ |A| + |B| + |C|$. Now an element in all three sets ($A \\cap B \\cap C$) has been counted **$3$ times**.
2. **Exclude pairwise intersections:** $- |A \\cap B| - |A \\cap C| - |B \\cap C|$. That fixes elements in *two* sets ($2 - 1 = 1$), but an element in **all three** sets just got subtracted $3$ times: $3 - 3 = 0$ (now it isn't counted at all!).
3. **Include the triple intersection back:** $+ |A \\cap B \\cap C|$. Now $3 - 3 + 1 = 1$!

$$|A \\cup B \\cup C| = |A| + |B| + |C| - |A \\cap B| - |A \\cap C| - |B \\cap C| + |A \\cap B \\cap C|$$

For $m$ sets, the **Principle of Inclusion–Exclusion (PIE)** alternates signs by intersection size: $+(\\text{singles}) - (\\text{pairs}) + (\\text{triples}) - (\\text{quads}) + \\dots$!`,
        },
        { h: 'Derangements (!n): The Hat-Check Problem' },
        {
          md: `Suppose $n$ guests check their hats at a restaurant, and a clumsy attendant hands the $n$ hats back completely at random. How many permutations of $\\{1, 2, \\dots, n\\}$ leave **not a single person with their own hat** ($\pi(i) \\ne i$ for all $i$)?
Such a fixed-point-free permutation is called a **derangement**, denoted $!n$ or $D_n$.

Using Inclusion–Exclusion on the "bad" events $A_i = \\{\\text{person } i \\text{ gets their own hat}\\}$:
- Total permutations: $n!$.
- Subtract $\\binom{n}{1}$ ways 1 person gets their hat and the other $n-1$ permute: $-\\binom{n}{1}(n-1)! = -\\frac{n!}{1!}$.
- Add back $\\binom{n}{2}(n-2)! = +\\frac{n!}{2!}$, subtract $\\frac{n!}{3!}$, …:

$$!n = n!\\left(1 - \\frac{1}{1!} + \\frac{1}{2!} - \\frac{1}{3!} + \\dots + \\frac{(-1)^n}{n!}\\right) \\;\\approx\\; \\frac{n!}{e}$$

Notice the brackets are the Taylor series for $e^{-1} = \\frac{1}{e} \\approx 0.3679$! Whether there are $5$ guests or $5{,}000{,}000$ guests, the probability that **nobody** gets their own hat is $\\approx \\frac{1}{e} \\approx 36.8\\%$!`,
        },
        { h: 'The Pigeonhole Principle: When N > k, a collision is guaranteed' },
        {
          md: `**Dirichlet's Pigeonhole Principle:**
- **Simple form:** If $N > k$ items (pigeons) are placed into $k$ boxes (pigeonholes), at least one box must contain **at least $2$ items**.
- **Generalized form:** If $N$ items are placed into $k$ boxes, at least one box must contain at least:
  $$\\left\\lceil \\frac{N}{k} \\right\\rceil \\text{ items!}$$
  *Proof by contradiction:* If every one of the $k$ boxes held at most $\\lceil N/k \\rceil - 1 < N/k$ items, the total number of items across all $k$ boxes would be strictly less than $k \\cdot (N/k) = N$—contradiction! $\\blacksquare$`,
        },
        {
          symbols: [
            ['|A \\cup B| = |A| + |B| - |A \\cap B|', '2-set Inclusion–Exclusion', 'Add the sizes, subtract the overlap once', 'For 3 sets: $+(\\text{1s}) - (\\text{2s}) + (\\text{3s})$'],
            ['!n = n!\\sum_{k=0}^n \\frac{(-1)^k}{k!}', 'derangements of n items', 'Permutations with **zero** fixed points ($\\pi(i) \\ne i$ for all $i$)', '$!1=0,\\;!2=1,\\;!3=2,\\;!4=9,\\;!5=44$'],
            ['\\lceil N / k \\rceil', 'Generalized Pigeonhole bound', '$N$ pigeons in $k$ holes guarantees some hole has $\\ge \\lceil N/k \\rceil$ pigeons', '100 people, 12 birth months $\\implies \\lceil 100/12 \\rceil = 9$ share a month'],
          ],
        },
        {
          figure: 'InclusionExclusionPigeonFig',
          caption: 'Explore the 3-set Inclusion–Exclusion Venn sieve, watch derangements $!n / n!$ converge rapidly to $1/e \\approx 0.3679$, and test the Generalized Pigeonhole Principle.',
        },
        {
          worked: {
            title: 'Counting integers in $\\{1, 2, \\dots, 100\\}$ divisible by $2$, $3$, or $5$ via PIE',
            steps: [
              ['Singles ($|A_2|, |A_3|, |A_5|$)', '$\\lfloor 100/2 \\rfloor + \\lfloor 100/3 \\rfloor + \\lfloor 100/5 \\rfloor = 50 + 33 + 20 = 103$', 'Multiples of 2, of 3, and of 5'],
              ['Pairs ($6, 10, 15$)', '$-(\\lfloor 100/6 \\rfloor + \\lfloor 100/10 \\rfloor + \\lfloor 100/15 \\rfloor) = -(16 + 10 + 6) = -32$', 'Subtract pairwise overlaps'],
              ['Triple ($\\operatorname{lcm}(2,3,5) = 30$)', '$+\\lfloor 100/30 \\rfloor = +3$', 'Add back multiples of $30$ ($30, 60, 90$)'],
              ['Total in union', '$103 - 32 + 3 = 74$ (and $100 - 74 = 26$ are coprime to $30$!)', 'Exact count without testing all 100 numbers'],
            ],
          },
        },
        {
          predict: {
            prompt: 'In a group of $100$ developers, $65$ use Python, $50$ use Rust, and $25$ use **both**. How many developers in the group use **at least one** of the two languages?',
            answer: inclusionExclusion2(65, 50, 25),
            compute: () => inclusionExclusion2(65, 50, 25),
            explain: 'By 2-set Inclusion–Exclusion: $|P \\cup R| = 65 + 50 - 25 = 90$ (meaning $100 - 90 = 10$ use neither).',
          },
        },
        {
          predict: {
            prompt: 'How many **derangements** $!4$ of $\\{1, 2, 3, 4\\}$ exist (permutations of 4 items where no item stays in its original spot)?',
            answer: derangements(4),
            compute: () => derangements(4),
            explain: '$!4 = 4!\\left(1 - 1 + \\frac{1}{2} - \\frac{1}{6} + \\frac{1}{24}\\right) = 24 - 24 + 12 - 4 + 1 = 9$. (They are the six 4-cycles and the three pairs of disjoint 2-cycles!)',
          },
        },
        {
          predict: {
            prompt: 'A lecture hall has $85$ students. By the Generalized Pigeonhole Principle, at least how many students must have been born on the **exact same day of the week** ($k = 7$ days)?',
            answer: pigeonholeMin(85, 7),
            compute: () => pigeonholeMin(85, 7),
            explain: '$\\lceil 85 / 7 \\rceil = \\lceil 12.14\\dots \\rceil = 13$. (Even if the first 84 students split evenly as $12$ per day, the $85$th student forces one day to reach $13$!)',
          },
        },
        {
          choice: {
            prompt: 'A drawer in a dark room contains $10$ black socks, $12$ navy socks, and $8$ grey socks ($3$ colors). What is the **minimum** number of socks you must pull out blindfolded to **guarantee** you have at least one matching pair of the same color?',
            options: [
              { text: '$4$ socks: the colors are the $k = 3$ pigeonholes, so $N = k + 1 = 4$ socks (pigeons) guarantees at least $\\lceil 4/3 \\rceil = 2$ socks in the same color box!', why: 'Yes! Always identify what has to match—that is the **pigeonhole**! Here the 3 colors are the 3 holes, so 4 socks guarantees a pair.' },
              { text: '$11$ socks, in case the first 10 are all black', why: 'If the first 2 socks are both black, you already have a matching pair of black socks after just 2 draws!' },
              { text: '$3$ socks', why: 'With 3 socks you could draw 1 black, 1 navy, and 1 grey (no pair).' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Why must you **add** $+|A \\cap B \\cap C|$ at the end of the 3-set Inclusion–Exclusion formula $|A \\cup B \\cup C|$?',
            options: [
              { text: 'Because an element in $A \\cap B \\cap C$ is added $\\binom{3}{1} = 3$ times in $|A|+|B|+|C|$, and then subtracted $\\binom{3}{2} = 3$ times in $-|A\\cap B|-|A\\cap C|-|B\\cap C|$ ($3 - 3 = 0$), so we must add it back once!', why: 'Yes! In general, an element belonging to $r$ of the sets is counted $\\binom{r}{1} - \\binom{r}{2} + \\binom{r}{3} - \\dots = 1 - (1 - 1)^r = 1$ time!' },
              { text: 'Because triple intersections are three times larger than pairwise intersections', why: 'Triple intersections are subsets of pairwise intersections ($A \\cap B \\cap C \\subseteq A \\cap B$), so they are smaller or equal.' },
              { text: 'You actually subtract $|A \\cap B \\cap C|$', why: 'The signs alternate: $+$ singles, $-$ pairs, $+$ triples, $-$ quadruples.' },
            ],
            answer: 0,
          },
        },
        {
          note: '**Inclusion–Exclusion** alternates signs $+(\\text{1s}) - (\\text{2s}) + (\\text{3s}) - \\dots$ so every element in the union ends up counted once. In **Pigeonhole** problems, always ask first: *"What are the $k$ boxes (the categories that would constitute a match)?"*',
        },
      ],
    },
  ],
}
