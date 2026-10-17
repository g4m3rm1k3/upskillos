// Part 2: The Craft of Mathematical Proof — counterexamples, direct proof, contrapositive, cases & invariants,
// contradiction, weak induction, and strong/structural induction.
import {
  isPrime, smallestFactor, firstCounterexample, eulerPoly, euclidConstruct,
  gaussSum, sumOfSquares, sumOfCubes, frobeniusNumber, trominoCount,
} from '../engine/discrete.js'

const range = n => Array.from({ length: n }, (_, i) => i)

export const PART2 = {
  id: 'proof-craft',
  title: 'Part [[#part:proof-craft]] · The craft of mathematical proof',
  lessons: [
    {
      id: 'direct-proof',
      title: 'What a proof is, counterexamples, and direct proof',
      goal: 'Disprove a universal claim $\\forall n\\,P(n)$ with a single counterexample, unpacked formal definitions of even/odd/divisible, and write a rigorous direct proof.',
      builds: ['quantifiers', 'inference'],
      blocks: [
        { h: 'Why forty passing examples do not make a theorem' },
        {
          md: `In 1772, Leonhard Euler pointed out the remarkable polynomial:

$$f(n) = n^2 + n + 41$$

Plug in $n = 0$: you get $41$ (prime). Plug in $n = 1$: $43$ (prime). Plug in $n = 2$: $47$ (prime). If you keep testing $n = 0, 1, 2, \\dots, 39$, **every single one of those 40 numbers is prime**!

If mathematics worked by polling examples, you might conclude $\\forall n \\in \\mathbb{N},\\;n^2 + n + 41 \\text{ is prime}$.
Then you test $n = 40$:

$$40^2 + 40 + 41 = 40(40 + 1) + 41 = 40 \\cdot 41 + 41 = 41 \\times 41 = 1681$$

Not prime! That single failure—a **counterexample**—completely disproves the universal claim $\\forall n, P(n)$ (because by lesson [[#quantifiers]], $\\neg(\\forall n\\,P(n)) \\equiv \\exists n\\,\\neg P(n)$).

- **To disprove $\\forall x, P(x)$:** Exhibit **one single counterexample** $x_0$ where $P(x_0)$ is False.
- **To prove $\\exists x, P(x)$:** Exhibit **one single witness** $x_0$ where $P(x_0)$ is True.
- **To prove $\\forall x, P(x)$:** Examples are never enough (unless the domain is finite and you check *every* element). Instead, you must reason about a **generic, arbitrary element** named by a letter, using only definitions and previously proven facts.`,
        },
        {
          symbols: [
            ['n \\text{ is even}', 'n is even', '$\\exists k \\in \\mathbb{Z}$ such that $n = 2k$', '$-4 = 2(-2)$, $0 = 2(0)$, $14 = 2(7)$'],
            ['n \\text{ is odd}', 'n is odd', '$\\exists k \\in \\mathbb{Z}$ such that $n = 2k + 1$', '$-3 = 2(-2)+1$, $7 = 2(3)+1$'],
            ['d \\mid n', 'd divides n', '$\\exists k \\in \\mathbb{Z}$ such that $n = d \\cdot k$ (when $d \\ne 0$)', '$3 \\mid 12$ because $12 = 3 \\cdot 4$; $4 \\nmid 10$'],
            ['\\blacksquare,\\;\\text{Q.E.D.}', 'end of proof / quod erat demonstrandum', '"Which was to be demonstrated" — marks the completion of a proof', 'Placed at the final line of a proof'],
          ],
        },
        {
          figure: 'CounterexamplePrimeFig',
          caption: 'Slide $n$ from $0$ to $45$ to watch Euler’s polynomial $n^2 + n + 41$ pass 40 times in a row before colliding with $41^2$ at $n = 40$.',
        },
        { h: 'The blueprint of a Direct Proof ($p \\Rightarrow q$)' },
        {
          md: `To prove $\\forall x \\in D,\\;P(x) \\Rightarrow Q(x)$ **directly**:
1. **Fix an arbitrary element and assume the hypothesis:** *"Let $x \\in D$ be arbitrary, and suppose $P(x)$ holds."*
2. **Unpack definitions:** Translate $P(x)$ into an algebraic equation using its definition (introducing fresh existential witness variables like $k, j \\in \\mathbb{Z}$).
3. **Bridge via algebra:** Manipulate the expression until it matches the shape required by the definition of $Q(x)$.
4. **Pack the definition of $Q(x)$ and conclude:** Show the witness is an integer, conclude $Q(x)$, and write $\\blacksquare$.

**Watch out for the #1 beginner mistake:** If $a$ and $b$ are both odd, write $a = 2j + 1$ and $b = 2k + 1$ with **different letters $j$ and $k$**! Writing $a = 2k + 1$ and $b = 2k + 1$ secretly assumes $a = b$, which only proves the claim when the two numbers are identical.`,
        },
        {
          worked: {
            title: 'Direct Proof: If $a \\mid b$ and $b \\mid c$, then $a \\mid c$ (Transitivity of Divisibility)',
            steps: [
              ['1. Assume hypothesis', 'Let $a, b, c \\in \\mathbb{Z}$ with $a \\mid b$ and $b \\mid c$.', 'Fix arbitrary integers satisfying $P$'],
              ['2. Unpack $a \\mid b$ and $b \\mid c$', '$b = a \\cdot j$ and $c = b \\cdot k$ for some $j, k \\in \\mathbb{Z}$.', 'Definition of divisibility (using two distinct letters $j, k$)'],
              ['3. Substitute', '$c = (a \\cdot j) \\cdot k = a \\cdot (jk)$.', 'Associativity of integer multiplication'],
              ['4. Conclude $a \\mid c$', 'Since $j, k \\in \\mathbb{Z}$, their product $m = jk \\in \\mathbb{Z}$, so $c = a \\cdot m$, meaning $a \\mid c$. $\\blacksquare$', 'Matches the definition of $a \\mid c$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'Check Euler\'s polynomial $f(n) = n^2 + n + 41$: what is the smallest non-negative integer $n$ for which $f(n)$ is **composite** (not prime)?',
            answer: firstCounterexample(n => isPrime(eulerPoly(n)), range(60)),
            compute: () => firstCounterexample(n => isPrime(eulerPoly(n)), range(60)),
            explain: 'For $n = 0, 1, \\dots, 39$, $n^2 + n + 41$ is prime. At $n = 40$, $40^2 + 40 + 41 = 1681 = 41^2$.',
          },
        },
        {
          predict: {
            prompt: 'At $n = 41$, $f(41) = 41^2 + 41 + 41 = 1763$ is also composite! What is the **smallest prime factor** of $1763$?',
            answer: smallestFactor(eulerPoly(41)),
            compute: () => smallestFactor(eulerPoly(41)),
            explain: 'Factor out $41$: $41^2 + 41 + 41 = 41(41 + 1 + 1) = 41 \\times 43$. Since $41 < 43$ are both prime, the smallest prime factor is **41**.',
          },
        },
        {
          choice: {
            prompt: 'A student tries to prove *"The product of any two odd integers is odd"* by writing: *"Let $a = 2k + 1$ and $b = 2k + 1$. Then $ab = (2k+1)^2 = 4k^2 + 4k + 1 = 2(2k^2 + 2k) + 1$, which is odd."* What is wrong with this proof?',
            options: [
              { text: 'Using the same integer $k$ for both $a$ and $b$ forces $a = b$, so it only proves that the **square** of an odd integer is odd, not the product of two different odd integers', why: 'Yes! Because $a$ and $b$ are independent odd integers, you must use distinct existential witnesses: $a = 2j + 1$ and $b = 2k + 1$, giving $ab = 2(2jk + j + k) + 1$.' },
              { text: 'The algebra $(2k+1)^2 = 4k^2 + 4k + 1$ is incorrect', why: 'The algebra is fine; the flaw is assuming $a$ and $b$ share the same $k$.' },
              { text: 'Nothing is wrong; $k$ is just a placeholder so it can stand for two different numbers at once', why: 'Within a single mathematical scope, a variable $k$ denotes one specific number.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'How do you prove vs. disprove an **existential** claim $\\exists n \\in \\mathbb{Z}^+,\\;P(n)$?',
            options: [
              { text: 'To prove $\\exists n, P(n)$, one single working example $n_0$ is a complete proof; to disprove it, you must prove $\\forall n, \\neg P(n)$ for every case', why: 'Yes! Existence only needs one witness, whereas disproving existence requires showing that **no** $n$ can ever work.' },
              { text: 'Both proving and disproving $\\exists n, P(n)$ can be done with a single example', why: 'Showing $P(5)$ is false does not disprove $\\exists n, P(n)$—maybe $P(6)$ is true!' },
              { text: 'Examples can never prove anything in mathematics, even $\\exists n, P(n)$', why: 'A concrete witness $n_0$ with $P(n_0) = T$ is the gold-standard constructive proof of $\\exists n, P(n)$.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'One counterexample disproves $\\forall x, P(x)$; one witness proves $\\exists x, P(x)$. In a direct proof of $\\forall x, P(x) \\Rightarrow Q(x)$, unpack $P(x)$ using definitions (with fresh variable letters for each existential claim) and algebraically assemble the definition of $Q(x)$.',
        },
      ],
    },

    {
      id: 'contrapositive-cases',
      title: 'Proof by contrapositive, proof by cases, and parity invariants',
      goal: 'Prove $p \\Rightarrow q$ by proving $\\neg q \\Rightarrow \\neg p$ when $p$ gives too little to work with, split a domain into exhaustive cases, and use parity invariants to prove impossibility.',
      builds: ['direct-proof'],
      blocks: [
        { h: 'When going forward gets stuck, turn around via the contrapositive' },
        {
          md: `Suppose you want to prove:
> **Claim:** *For every integer $n$, if $n^2$ is even, then $n$ is even.*

If you try a **direct proof**, you start with $n^2 = 2k$. To talk about $n$, you have to take a square root: $n = \\sqrt{2k}$. Now you are stuck—how do you see from $\\sqrt{2k}$ that $n$ is a multiple of 2?

Look at why we got stuck: squaring $n \\mapsto n^2$ is easy algebra, whereas taking a square root $n^2 \\mapsto n$ is messy.
By lesson [[#implication]], the statement $p \\Rightarrow q$ is **logically equivalent** to its **contrapositive** $\\neg q \\Rightarrow \\neg p$!
- **Original ($p \\Rightarrow q$):** If $n^2$ is even, then $n$ is even.
- **Contrapositive ($\\neg q \\Rightarrow \\neg p$):** If $n$ is **odd** (not even), then $n^2$ is **odd** (not even).

Now we start with $n = 2k + 1$ and **square** it:
$$n^2 = (2k + 1)^2 = 4k^2 + 4k + 1 = 2(2k^2 + 2k) + 1$$
which is immediately odd! Because $\\neg q \\Rightarrow \\neg p$ is proven, $p \\Rightarrow q$ is proven too. $\\blacksquare$`,
        },
        { h: 'Proof by cases and Parity Invariants' },
        {
          md: `Sometimes a single algebraic formula doesn't cover the whole domain at once, because integers behave differently depending on their **parity** (even vs. odd) or their remainder modulo 3 ($3k$, $3k+1$, or $3k+2$).

A **proof by cases** splits the hypothesis into $p_1 \\vee p_2 \\vee \\dots \\vee p_m$ (making sure the cases **exhaust** every possibility!) and proves $p_i \\Rightarrow q$ for each case separately:

$$((p_1 \\vee p_2) \\Rightarrow q) \\;\\equiv\\; (p_1 \\Rightarrow q) \\wedge (p_2 \\Rightarrow q)$$

Even better, parity gives us one of the sharpest weapons in discrete math: an **invariant** (a quantity that cannot change under allowed moves).
Consider the famous **Mutilated Chessboard Puzzle**: take an $8 \\times 8$ chessboard ($64$ squares) and remove two **diagonally opposite corners**, leaving $62$ squares. Can you tile those $62$ squares with $31$ dominoes, where each $1 \\times 2$ domino covers two adjacent squares?

- Try by hand and you always get stuck. Testing trillions of placements takes forever.
- **The 2-line invariant proof:** Every $1 \\times 2$ domino covers **1 black square and 1 white square**, no matter how you place it. So $31$ dominoes *must* cover **31 black and 31 white** squares.
- But two opposite corners of an $8 \\times 8$ board have the **same color**! Removing them leaves **32 squares of one color and 30 of the other**. Since $32 \\ne 31$, a tiling is **impossible**! $\\blacksquare$`,
        },
        {
          symbols: [
            ['\\neg q \\Rightarrow \\neg p', 'proof by contrapositive', 'Assume $\\neg q$ and derive $\\neg p$; proves $p \\Rightarrow q$', 'Use when $\\neg q$ gives a cleaner starting equation than $p$'],
            ['(p_1 \\vee p_2) \\Rightarrow q', 'proof by cases', 'Prove $p_1 \\Rightarrow q$ and $p_2 \\Rightarrow q$ for exhaustive cases $p_1, p_2$', 'Every integer $n$ is either $2k$ (even) or $2k+1$ (odd)'],
            ['(x + y) \\bmod 2', 'board color parity', 'On a grid, square $(x, y)$ is dark when $x+y$ is even and light when $x+y$ is odd', 'Any step of $\\pm 1$ in $x$ or $y$ flips parity!'],
          ],
        },
        {
          figure: 'ParityInvariantFig',
          caption: 'Remove any two squares from the chessboard and watch the black/white parity invariant decide whether a domino tiling is possible.',
        },
        {
          worked: {
            title: 'Proof by Cases: For every integer $n$, $n^2 + n$ is even',
            steps: [
              ['Split into 2 exhaustive cases', 'Every integer $n$ is either even ($n = 2k$) or odd ($n = 2k + 1$).', 'Division by 2 leaves remainder 0 or 1'],
              ['Case 1: $n = 2k$ (even)', '$n^2 + n = (2k)^2 + 2k = 4k^2 + 2k = 2(2k^2 + k)$, which is even.', '2 times an integer $2k^2 + k$'],
              ['Case 2: $n = 2k + 1$ (odd)', '$n^2 + n = (2k+1)^2 + (2k+1) = 4k^2 + 6k + 2 = 2(2k^2 + 3k + 1)$, also even.', '2 times an integer $2k^2 + 3k + 1$'],
              ['Conclude', 'In every possible case, $n^2 + n$ is even. $\\blacksquare$', '$(p_1 \\Rightarrow q) \\wedge (p_2 \\Rightarrow q) \\equiv (p_1 \\vee p_2) \\Rightarrow q$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'An $8 \\times 8$ chessboard has 32 black and 32 white squares. If you remove the two opposite white corners $(0,0)$ and $(7,7)$, how many **black** squares remain on the 62-square board?',
            answer: 32,
            compute: () => 32,
            explain: 'Both $(0,0)$ and $(7,7)$ have $x + y$ even ($0+0=0$ and $7+7=14$), so both removed corners are the same color (white). All **32** black squares remain (along with 30 white squares), making 31-domino tiling impossible!',
            misconceptions: [
              { answer: 31, feedback: 'Opposite corners of an even-sized chessboard have the **same** color, because $(0+0) = 0$ and $(7+7) = 14$ are both even!' },
            ],
          },
        },
        {
          predict: {
            prompt: 'To prove a property about $n^2 \\bmod 4$ by cases, you check $n = 2k$ (giving $(2k)^2 = 4k^2 \\equiv 0 \\pmod 4$) and $n = 2k+1$ (giving $(2k+1)^2 = 4(k^2+k) + 1 \\equiv 1 \\pmod 4$). How many distinct remainders can a perfect square $n^2$ ever leave when divided by $4$?',
            answer: new Set(range(20).map(n => (n * n) % 4)).size,
            compute: () => new Set(range(20).map(n => (n * n) % 4)).size,
            explain: 'Only **2** possible remainders: $0$ (when $n$ is even) or $1$ (when $n$ is odd). No perfect square can ever leave remainder $2$ or $3$ modulo $4$!',
          },
        },
        {
          choice: {
            prompt: 'You want to prove *"If $3n + 2$ is odd, then $n$ is odd"* by **contrapositive**. How must your proof begin and end?',
            options: [
              { text: 'Assume $n$ is even ($n = 2k$), and deduce that $3n + 2 = 6k + 2 = 2(3k + 1)$ is even', why: 'Yes! The contrapositive of ($3n+2$ odd $\\Rightarrow n$ odd) is ($n$ even $\\Rightarrow 3n+2$ even).' },
              { text: 'Assume $n$ is odd ($n = 2k + 1$), and deduce that $3n + 2$ is odd', why: 'That proves the **converse** ($q \\Rightarrow p$), which is not logically equivalent to $p \\Rightarrow q$!' },
              { text: 'Assume $3n + 2$ is odd and $n$ is odd, and simplify to $0 = 0$', why: 'Assuming the conclusion $q$ at the start is the circular fallacy of begging the question.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Wait—can a $7 \\times 7$ chessboard ever be completely tiled by $1 \\times 2$ dominoes (with **zero** squares removed)?',
            options: [
              { text: 'No: $7 \\times 7 = 49$ is odd, and every domino covers 2 squares, so $k$ dominoes cover $2k$ (an even number of) squares', why: 'Yes! Parity of the total square count ($49$ is odd, $2k$ is even) immediately rules it out.' },
              { text: 'Yes, using 24.5 dominoes', why: 'Dominoes cannot be cut in half.' },
              { text: 'Yes, if we rotate the dominoes along the diagonal', why: 'Dominoes must align with the grid squares.' },
            ],
            answer: 0,
          },
        },
        {
          puzzle: {
            id: 'tiling',
            title: 'L-Tromino Tiler & Board Parity Challenge',
            desc: 'Test parity invariants and recursive inductive tiling hands-on.',
          },
        },
        {
          note: 'When $p \\Rightarrow q$ has an awkward hypothesis $p$ (like "$n^2$ is even" or "$ab$ is irrational"), try the **contrapositive** $\\neg q \\Rightarrow \\neg p$. When proving impossibility of a process or tiling, look for an **invariant** (like parity or color difference) that every legal step preserves.',
        },
      ],
    },

    {
      id: 'contradiction',
      title: 'Proof by contradiction: √2 is irrational and the endless primes',
      goal: 'Prove a statement $P$ by assuming $\\neg P$ and deriving a logical contradiction $\\bot$, and walk through the classic proofs of the irrationality of $\\sqrt{2}$ and Euclid’s infinitude of primes.',
      builds: ['contrapositive-cases'],
      blocks: [
        { h: 'Assuming the opposite until logic breaks' },
        {
          md: `Some of the deepest theorems in mathematics state that something **does not exist** or **cannot happen**: *"There is no fraction equal to $\\sqrt{2}$"*, *"There is no largest prime"*, *"There is no algorithm that solves the Halting Problem."*

How do you prove a negative when there are infinitely many candidates? By **proof by contradiction** (*reductio ad absurdum*):
1. To prove $P$, assume temporarily that **$P$ is False** (i.e., assume $\\neg P$ is True).
2. Reason logically from $\\neg P$ until you deduce a **contradiction** $C \\wedge \\neg C$ (something impossible, like a fraction that both is and is not in lowest terms, or $1 = 0$).
3. Because valid reasoning from a True premise can never reach False ($\\neg P \\Rightarrow \\bot$ means $\\neg P$ must be False), conclude that **$P$ must be True**!

Notice how this also works for implications $p \\Rightarrow q$: since $\\neg(p \\Rightarrow q) \\equiv p \\wedge \\neg q$ (lesson [[#equivalences]]), a proof by contradiction of $p \\Rightarrow q$ assumes **both $p$ and $\\neg q$** and derives a contradiction.`,
        },
        { h: 'Classic Masterpiece 1: √2 is irrational (Pythagorases’ shock)' },
        {
          md: `A real number $x$ is **rational** ($x \\in \\mathbb{Q}$) if $x = \\frac{a}{b}$ for integers $a, b \\in \\mathbb{Z}$ with $b \\ne 0$. Every rational number can be reduced to **lowest terms** by dividing out any common factor, so that $a$ and $b$ are not both even ($\\gcd(a, b) = 1$).

**Theorem:** $\\sqrt{2}$ is irrational.
- **Assume the opposite ($\\neg P$):** Suppose $\\sqrt{2}$ *is* rational. Then $\\sqrt{2} = \\frac{a}{b}$ for integers $a, b$ in **lowest terms** (so $a$ and $b$ share no common factor $> 1$; in particular, **not both are even**).
- **Step 1:** Square both sides: $2 = \\frac{a^2}{b^2}$, so $a^2 = 2b^2$. Thus $a^2$ is **even**.
- **Step 2:** By our contrapositive theorem from lesson [[#contrapositive-cases]] (*if $a^2$ is even, then $a$ is even*), $a$ must be **even**! So $a = 2c$ for some integer $c$.
- **Step 3:** Substitute $a = 2c$ into $a^2 = 2b^2$: $(2c)^2 = 4c^2 = 2b^2$, and divide by 2 to get $b^2 = 2c^2$. Thus $b^2$ is even, so **$b$ is also even**!
- **Contradiction ($\\bot$):** Both $a$ and $b$ are even (divisible by 2), contradicting that $\\frac{a}{b}$ was in lowest terms! Therefore $\\sqrt{2}$ is irrational. $\\blacksquare$`,
        },
        { h: 'Classic Masterpiece 2: Euclid’s infinitude of primes' },
        {
          md: `**Theorem (Euclid, *Elements* Book IX, Prop. 20):** There are infinitely many prime numbers.
- **Assume the opposite ($\\neg P$):** Suppose there are only finitely many primes: $p_1, p_2, \\dots, p_k$ is the **complete list of all primes in the universe**.
- **Construct:** Multiply them all together and add $1$:
  $$Q = p_1 \\cdot p_2 \\cdots p_k + 1$$
- Since $Q > 1$, $Q$ has at least one prime factor $d$ (namely its smallest divisor $> 1$, from lesson [[#direct-proof]]).
- Because $p_1, \\dots, p_k$ was supposedly *every* prime, $d$ must be one of the primes $p_i$ on our list.
- But when you divide $Q = p_1 \\cdots p_k + 1$ by any $p_i$ on the list, the first part $p_1 \\cdots p_k$ is a multiple of $p_i$, leaving a **remainder of $1$**! Equivalently, if $d \\mid Q$ and $d \\mid p_1 \\cdots p_k$, then $d$ must divide their difference $Q - p_1 \\cdots p_k = 1$, which is impossible since $d \\ge 2$.
- **Contradiction ($\\bot$):** The prime factor $d$ of $Q$ cannot be on the list, so no finite list contains all primes! $\\blacksquare$`,
        },
        {
          symbols: [
            ['\\neg P \\Rightarrow \\bot', 'proof by contradiction', 'Assume $\\neg P$ and deduce an impossibility $\\bot$; concludes $P$', 'Also called *reductio ad absurdum*'],
            ['\\mathbb{Q} = \\{\\tfrac{a}{b} : a,b \\in \\mathbb{Z}, b \\ne 0\\}', 'set of rational numbers', 'Numbers expressible as a ratio of integers in lowest terms ($\\gcd(a,b)=1$)', '$\\sqrt{2} \\notin \\mathbb{Q}$, $\\pi \\notin \\mathbb{Q}$'],
            ['Q = p_1 p_2 \\cdots p_k + 1', 'Euclid\'s number', 'Leaves remainder $1$ when divided by each $p_i$, so every prime factor of $Q$ is new!', 'Note: $Q$ itself doesn\'t have to be prime—its prime factors are what matter!'],
          ],
        },
        {
          figure: 'EuclidPrimesFig',
          caption: 'Pick any finite set of primes $p_1, \\dots, p_k$: Euclid’s formula $Q = p_1 \\cdots p_k + 1$ always produces a prime factor $d$ missing from your list (including $2\\cdot 3\\cdot 5\\cdot 7\\cdot 11\\cdot 13 + 1 = 30031 = 59 \\times 509$).',
        },
        {
          worked: {
            title: 'Why Euclid\'s $Q = p_1 \\cdots p_k + 1$ does NOT claim $Q$ is always prime',
            steps: [
              ['List first 5 primes', '$\\{2, 3, 5, 7, 11\\}$', '$Q = 2\\cdot 3\\cdot 5\\cdot 7\\cdot 11 + 1 = 2311$, which happens to be prime'],
              ['List first 6 primes', '$\\{2, 3, 5, 7, 11, 13\\}$', '$Q = 2\\cdot 3\\cdot 5\\cdot 7\\cdot 11\\cdot 13 + 1 = 30031$'],
              ['Factor $30031$', '$30031 = 59 \\times 509$', '$Q$ is **composite**! Neither $59$ nor $509$ is in $\\{2,3,5,7,11,13\\}$'],
              ['Key insight', 'Every prime factor of $Q$ (here $59$) is a brand-new prime not in the list!', 'Whether $Q$ is prime or composite, a new prime is guaranteed'],
            ],
          },
        },
        {
          predict: {
            prompt: 'Apply Euclid\'s construction to the incomplete prime list $\\{2, 5, 11\\}$: compute $Q = 2 \\times 5 \\times 11 + 1$, and give the **smallest prime factor** of $Q$ (which is guaranteed not to be $2, 5,$ or $11$).',
            answer: euclidConstruct([2, 5, 11])[1],
            compute: () => euclidConstruct([2, 5, 11])[1],
            explain: '$Q = 2 \\times 5 \\times 11 + 1 = 111$. Since $1 + 1 + 1 = 3$, $111 = 3 \\times 37$, so its smallest prime factor is **3**—a prime missing from $\\{2, 5, 11\\}$!',
            misconceptions: [
              { answer: 111, feedback: '$Q = 111$ is the Euclid number, not its smallest prime factor: notice $111 = 3 \\times 37$!' },
            ],
          },
        },
        {
          predict: {
            prompt: 'For the first 6 primes $\\{2, 3, 5, 7, 11, 13\\}$, Euclid\'s $Q = 2 \\cdot 3 \\cdot 5 \\cdot 7 \\cdot 11 \\cdot 13 + 1 = 30031$ is composite ($30031 = 59 \\times 509$). What is its smallest prime factor?',
            answer: euclidConstruct([2, 3, 5, 7, 11, 13])[1],
            compute: () => euclidConstruct([2, 3, 5, 7, 11, 13])[1],
            explain: '$30031 = 59 \\times 509$, so the smallest prime factor is **59** (which is indeed not in $\\{2, 3, 5, 7, 11, 13\\}$).',
          },
        },
        {
          choice: {
            prompt: 'What happens if you try to adapt the $\\sqrt{2}$ contradiction proof to "prove" that $\\sqrt{4}$ is irrational?',
            options: [
              { text: 'The step "if $a^2 = 4b^2$, then $4 \\mid a^2$ so $4 \\mid a$" fails: $a = 2$ has $a^2 = 4$ divisible by $4$, yet $4 \\nmid 2$!', why: 'Yes! A prime $p \\mid a^2$ forces $p \\mid a$ (Euclid\'s Lemma), but a composite number like $4$ can divide $a^2$ without dividing $a$ ($4 \\mid 2^2$!).' },
              { text: 'The proof still goes through, showing $\\sqrt{4}$ is irrational', why: '$\\sqrt{4} = 2 = \\frac{2}{1}$ is definitely rational!' },
              { text: 'You cannot square both sides when the number under the root is 4', why: 'Squaring $\\sqrt{4} = a/b$ to get $4 = a^2/b^2$ is valid algebra; the breakdown is claiming $4 \\mid a^2 \\Rightarrow 4 \\mid a$.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Suppose you want to prove the conditional statement $p \\Rightarrow q$ by **contradiction**. What do you assume at the start of the proof?',
            options: [
              { text: 'Assume $p$ is True AND $q$ is False ($p \\wedge \\neg q$), then derive a contradiction', why: 'Yes! Because $\\neg(p \\Rightarrow q) \\equiv p \\wedge \\neg q$, assuming the implication is false means assuming $p$ holds while $q$ fails.' },
              { text: 'Assume $p$ is False and $q$ is True', why: 'When $p$ is False and $q$ is True, $p \\Rightarrow q$ is already True, not False.' },
              { text: 'Assume $\\neg p \\Rightarrow \\neg q$', why: 'The negation of an implication is a conjunction $p \\wedge \\neg q$, not an inverse implication.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'To prove $P$ by **contradiction**, assume $\\neg P$ and reason to an impossibility $\\bot$. To prove $p \\Rightarrow q$ by contradiction, assume $p \\wedge \\neg q$. And in Euclid\'s proof, $Q = p_1 \\cdots p_k + 1$ need not be prime itself—its *smallest prime factor* is what cannot be on the list.',
        },
      ],
    },

    {
      id: 'induction',
      title: 'Mathematical induction: the domino chain from P(1) to ∀n',
      goal: 'Prove a statement $\\forall n \\ge n_0,\\,P(n)$ using a base case and an inductive step $P(k) \\Rightarrow P(k+1)$, derive Gauss’s sum and sum of squares, and spot flawed induction proofs.',
      builds: ['contradiction'],
      blocks: [
        { h: 'How two steps knock down infinitely many dominoes' },
        {
          md: `How do you prove a formula $P(n)$ for **every** positive integer $n = 1, 2, 3, \\dots$ when each $n$ builds on the previous one?

Think of an infinite line of standing dominoes numbered $1, 2, 3, \\dots$:
1. **Base Case ($P(1)$):** You push over the **first domino** ($P(1)$ is True).
2. **Inductive Step ($\\forall k \\ge 1,\\;P(k) \\Rightarrow P(k+1)$):** You prove that **if** any domino $k$ falls (**the Inductive Hypothesis $P(k)$**), it is spaced close enough that it **must** knock over the very next domino $k + 1$ ($P(k+1)$).

Once both pieces are verified,Modus Ponens runs forever automatically:
- $P(1)$ is True (Base Case).
- Since $P(1)$ is True and $P(1) \\Rightarrow P(2)$, $P(2)$ is True!
- Since $P(2)$ is True and $P(2) \\Rightarrow P(3)$, $P(3)$ is True!
- …and so $\\forall n \\ge 1,\\;P(n)$ holds!

**Crucial clarity check:** In the inductive step, are we "assuming what we want to prove"? **No!** We want to prove the *implication* $P(k) \\Rightarrow P(k+1)$ for an arbitrary $k$. To prove an implication $A \\Rightarrow B$ directly, you assume $A$ ($P(k)$) and deduce $B$ ($P(k+1)$)!`,
        },
        {
          symbols: [
            ['P(n_0)', 'base case', 'Verify the claim directly at the starting integer $n = n_0$ (often $n_0 = 0$ or $1$)', 'For $1 + \\dots + n = \\frac{n(n+1)}{2}$ at $n=1$: $1 = \\frac{1(2)}{2} \\checkmark$'],
            ['P(k)', 'inductive hypothesis (IH)', 'The assumption that $P(k)$ holds for a fixed arbitrary $k \\ge n_0$', 'Used as a substitution inside the proof of $P(k+1)$'],
            ['P(k) \\Rightarrow P(k+1)', 'inductive step', 'Prove the next case $k+1$ by peeling off the $(k+1)$-st piece and applying the IH $P(k)$', '$\\underbrace{(1 + \\dots + k)}_{\\text{replace by IH}} + (k+1)$'],
            ['\\sum_{i=1}^n i = \\frac{n(n+1)}{2}', 'Gauss\'s triangular sum', 'The sum of the first $n$ positive integers; two $n$-step staircases form an $n \\times (n+1)$ rectangle', 'At $n = 100$: $\\frac{100 \\times 101}{2} = 5050$'],
          ],
        },
        {
          figure: 'InductionStaircaseFig',
          caption: 'Adjust $n$ to see two copies of the staircase $1 + 2 + \\dots + n$ interlock into an $n \\times (n+1)$ rectangle, with the highlighted $(n)$-th row showing the exact inductive step $P(n-1) \\to P(n)$.',
        },
        {
          worked: {
            title: 'Proof by Induction: $\\sum_{i=1}^n (2i - 1) = 1 + 3 + 5 + \\dots + (2n - 1) = n^2$ for all $n \\ge 1$',
            steps: [
              ['Base Case ($n = 1$)', 'LHS $= 2(1) - 1 = 1$; RHS $= 1^2 = 1$. Since $1 = 1$, $P(1)$ holds.', 'First domino falls'],
              ['Inductive Hypothesis', 'Fix $k \\ge 1$ and assume $P(k)$: $1 + 3 + \\dots + (2k - 1) = k^2$.', 'Assume domino $k$ falls'],
              ['Start LHS of $P(k+1)$', '$\\sum_{i=1}^{k+1} (2i - 1) = \\underbrace{[1 + 3 + \\dots + (2k - 1)]}_{\\text{first } k \\text{ terms}} + (2(k+1) - 1)$', 'Peel off the $(k+1)$-st term'],
              ['Substitute IH $P(k)$', '$= k^2 + (2k + 1) = (k + 1)^2$.', 'Matches RHS of $P(k+1)$! By induction, $\\forall n \\ge 1, P(n)$ holds. $\\blacksquare$'],
            ],
          },
        },
        {
          md: `**Three classic summation formulas proved by induction** (keep these in your toolkit—they appear everywhere in combinatorics and algorithm analysis):
1. **First powers (Gauss):** $\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$
2. **Squares (Pyramidal numbers):** $\\sum_{i=1}^n i^2 = \\frac{n(n+1)(2n+1)}{6}$
3. **Cubes (Nicomachus's theorem):** $\\sum_{i=1}^n i^3 = \\left(\\frac{n(n+1)}{2}\\right)^2 = \\left(\\sum_{i=1}^n i\\right)^2$`,
        },
        {
          predict: {
            prompt: 'Using the sum-of-squares formula $\\sum_{i=1}^n i^2 = \\frac{n(n+1)(2n+1)}{6}$, what is $1^2 + 2^2 + 3^2 + \\dots + 10^2$?',
            answer: sumOfSquares(10),
            compute: () => sumOfSquares(10),
            explain: '$\\frac{10 \\times 11 \\times 21}{6} = \\frac{2310}{6} = 385$.',
            misconceptions: [
              { answer: gaussSum(10) ** 2, feedback: 'That is $(1 + 2 + \\dots + 10)^2 = 55^2 = 3025$, which is the sum of **cubes** $\\sum i^3$, not squares!' },
            ],
          },
        },
        {
          predict: {
            prompt: 'By Nicomachus\'s theorem, $1^3 + 2^3 + \\dots + n^3 = \\left(\\frac{n(n+1)}{2}\\right)^2$. What is $1^3 + 2^3 + 3^3 + 4^3 + 5^3$?',
            answer: sumOfCubes(5),
            compute: () => sumOfCubes(5),
            explain: 'First compute $1 + 2 + 3 + 4 + 5 = \\frac{5 \\times 6}{2} = 15$, then square it: $15^2 = 225$.',
          },
        },
        {
          choice: {
            prompt: 'Consider the famous spoof proof that *"All horses are the same color"*: Base case $n = 1$ horse is trivially one color. For $k+1$ horses $\\{h_1, \\dots, h_{k+1}\\}$, by IH the first $k$ horses $\\{h_1, \\dots, h_k\\}$ share a color, and the last $k$ horses $\\{h_2, \\dots, h_{k+1}\\}$ share a color; since the middle horses $\\{h_2, \\dots, h_k\\}$ overlap, all $k+1$ share a color! Where does the domino chain break?',
            options: [
              { text: 'The inductive step $P(k) \\Rightarrow P(k+1)$ fails when $k = 1$ (going from $1$ horse to $2$ horses), because $\\{h_1\\}$ and $\\{h_2\\}$ have NO overlapping middle horses!', why: 'Yes! For $k + 1 = 2$, the middle overlap $\\{h_2, \\dots, h_k\\}$ is the empty set $\\emptyset$. Because $P(1) \\not\\Rightarrow P(2)$, domino 1 never knocks over domino 2, even though $P(1)$ holds and $P(k) \\Rightarrow P(k+1)$ holds for all $k \\ge 2$!' },
              { text: 'The base case $n = 1$ is false', why: 'In any set of 1 horse, all horses in that set do have the same color.' },
              { text: 'Induction cannot be applied to sets of physical objects', why: 'Induction works on any property indexed by $n \\in \\mathbb{N}$, including sizes of finite sets.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Suppose someone proves the inductive step $\\forall k \\ge 1,\\;P(k) \\Rightarrow P(k+1)$ for the claim $P(n): "1 + 2 + \\dots + n = \\frac{n(n+1)}{2} + 99"$, and stops without checking the base case. What is true about $P(n)$?',
            options: [
              { text: 'The inductive step $P(k) \\Rightarrow P(k+1)$ really is True (adding $k+1$ to $\\frac{k(k+1)}{2} + 99$ really gives $\\frac{(k+1)(k+2)}{2} + 99$), yet $P(n)$ is **False for every $n$** because $P(1)$ is False!', why: 'Yes! The dominoes are spaced properly, so *if* one fell the next would fall—but nobody ever pushed domino 1!' },
              { text: 'The algebra in the inductive step must be wrong if $P(n)$ is false', why: 'False $\\Rightarrow$ False is a True implication! Adding $k+1$ preserves the $+99$ offset.' },
              { text: '$P(n)$ becomes true for $n \\ge 99$', why: 'It stays off by $+99$ for every single $n$.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'Mathematical induction needs **both** a verified **Base Case $P(n_0)$** and a verified **Inductive Step $P(k) \\Rightarrow P(k+1)$ for every $k \\ge n_0$**. Always check that your inductive step argument actually works at the very first transition $k = n_0 \\to n_0 + 1$!',
        },
      ],
    },

    {
      id: 'strong-induction',
      title: 'Strong induction, well-ordering, and recursive L-tromino tiling',
      goal: 'Use Strong Induction ($P(n_0) \\wedge \\dots \\wedge P(k) \\Rightarrow P(k+1)$) when step $k+1$ reaches back further than $k$, solve the Frobenius postage-stamp problem, and prove recursive $2^n \\times 2^n$ L-tromino tiling.',
      builds: ['induction'],
      blocks: [
        { h: 'When domino k+1 needs help from dominoes earlier than k' },
        {
          md: `In ordinary ("weak") induction, proving $P(k+1)$ uses only the single immediately preceding case $P(k)$—for instance, $1 + \\dots + (k+1)$ peels off $(k+1)$ and lands on $k$.

What if proving $P(k+1)$ needs to reach **further back** than $k$?
- **Example 1 (Prime Factorization):** To prove every integer $n \\ge 2$ is a product of primes, if $k + 1$ is composite then $k + 1 = a \\cdot b$ with $2 \\le a, b \\le k$. Neither $a$ nor $b$ is $k$! They are *smaller* numbers somewhere in $\\{2, 3, \\dots, k\\}$.
- **Example 2 (Postage Stamps):** To make $k + 1$ cents using $4$¢ and $5$¢ stamps, peeling off one $4$¢ stamp drops you from $k + 1$ down to **$(k + 1) - 4 = k - 3$**, four steps back!

That is **Strong Induction**: in the inductive step, we assume $P(j)$ holds for **every** integer $j$ from the base $n_0$ all the way up to $k$:

$$\\big[P(n_0) \\wedge P(n_0 + 1) \\wedge \\dots \\wedge P(k)\\big] \\;\\Rightarrow\\; P(k + 1)$$

Is Strong Induction assuming more than ordinary induction? Logically they are **equivalent** (and both are equivalent to the **Well-Ordering Principle**: *every non-empty set of non-negative integers has a smallest element*), because if dominoes $n_0$ through $k$ have all fallen, they are all lying flat when you go to knock over $k + 1$!`,
        },
        {
          symbols: [
            ['\\big(\\forall j \\in [n_0, k],\\,P(j)\\big) \\Rightarrow P(k+1)', 'strong inductive step', 'Assume $P(j)$ holds for **all** $n_0 \\le j \\le k$, then deduce $P(k+1)$', 'Essential whenever $k+1$ decomposes into $a, b < k$ or $k+1-c$'],
            ['ab - a - b', 'Frobenius coin number', 'For coprime stamp denominations $a, b$, the **largest** amount that CANNOT be formed is $ab - a - b$', 'For $4$¢ and $5$¢: $4\\cdot 5 - 4 - 5 = 11$¢; every $n \\ge 12$ works!'],
            ['\\frac{4^n - 1}{3}', 'L-tromino count', 'Every $2^n \\times 2^n$ board with $1$ square missing has $4^n - 1$ squares, which is always divisible by $3$', 'At $n=3$ ($8\\times 8$ board): $(64 - 1)/3 = 21$ L-trominoes'],
          ],
        },
        {
          figure: 'PostageStampFig',
          caption: 'Explore Strong Induction on the $4$¢ and $5$¢ Postage Stamp problem: once the 4 base cases $12, 13, 14, 15$ are checked, every $n \\ge 16$ steps back to $n - 4$ and adds one $4$¢ stamp!',
        },
        {
          md: `**Watch why Strong Induction often needs MULTIPLE base cases:**
In the $4$¢ and $5$¢ stamp proof that every $n \\ge 12$ can be formed, our inductive step says: *"Take a valid combination for $n - 4$, and add one $4$¢ stamp."*
For $n - 4$ to be covered by the inductive hypothesis ($\\ge 12$), we need $n - 4 \\ge 12$, so the step only kicks in at **$n \\ge 16$**!
Therefore, we must verify **four base cases by hand**:
- $12 = 4 + 4 + 4$ ($3 \\times 4$¢)
- $13 = 4 + 4 + 5$ ($2 \\times 4$¢ $+ 1 \\times 5$¢)
- $14 = 4 + 5 + 5$ ($1 \\times 4$¢ $+ 2 \\times 5$¢)
- $15 = 5 + 5 + 5$ ($3 \\times 5$¢)
Once those four runway cases $12, 13, 14, 15$ are checked, $16 = 12 + 4$, $17 = 13 + 4$, $18 = 14 + 4$, and so on forever!

**Geometric Induction: Tiling any $2^n \\times 2^n$ defective board with L-trominoes**
Unlike the $8 \\times 8$ chessboard missing *two* opposite corners (which failed parity in lesson [[#contrapositive-cases]]), suppose a $2^n \\times 2^n$ board is missing **any single square**. Can it always be tiled by 3-square L-shaped trominoes?
- **Base case ($n = 1$):** A $2 \\times 2$ board missing 1 square has 3 squares left forming an L-tromino!
- **Inductive step ($k \\to k + 1$):** Split the $2^{k+1} \\times 2^{k+1}$ board into **four $2^k \\times 2^k$ quadrants**. The missing square lies in one quadrant. Place **one L-tromino at the very center** so its 3 squares cover the inner corners of the *other three* quadrants! Now all 4 quadrants are $2^k \\times 2^k$ boards missing 1 square, and by the inductive hypothesis $P(k)$, all 4 can be tiled! $\\blacksquare$`,
        },
        {
          worked: {
            title: 'Strong Induction: Every integer $n \\ge 2$ can be written as a product of primes',
            steps: [
              ['Base Case ($n = 2$)', '$2$ is itself prime (a product of one prime), so $P(2)$ holds.', 'Smallest integer $\\ge 2$'],
              ['Strong IH', 'Fix $k \\ge 2$ and assume every integer $j$ with $2 \\le j \\le k$ is a product of primes.', 'Assume $P(2) \\wedge P(3) \\wedge \\dots \\wedge P(k)$'],
              ['Case 1: $k + 1$ is prime', 'Then $k + 1$ is already a product of one prime. Done!', 'Direct'],
              ['Case 2: $k + 1$ is composite', 'Then $k + 1 = a \\cdot b$ with integers $2 \\le a \\le b \\le k$. By Strong IH on $a$ and $b$, both are products of primes, so $ab = k+1$ is too! $\\blacksquare$', 'Uses $P(a)$ and $P(b)$ where $a, b \\le k$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'Suppose a post office sells only $3$¢ and $7$¢ stamps. By the Frobenius formula $ab - a - b$, what is the **largest** postage amount (in cents) that **cannot** be formed?',
            answer: frobeniusNumber(3, 7),
            compute: () => frobeniusNumber(3, 7),
            explain: '$3 \\times 7 - 3 - 7 = 21 - 10 = 11$¢. Every integer amount $n \\ge 12$¢ can be made from $3$¢ and $7$¢ stamps ($12 = 3\\times 4$, $13 = 3\\times 2 + 7$, $14 = 7\\times 2$).',
          },
        },
        {
          predict: {
            prompt: 'How many 3-square L-trominoes are used to tile an $8 \\times 8$ ($2^3 \\times 2^3$) board with 1 missing square?',
            answer: trominoCount(3),
            compute: () => trominoCount(3),
            explain: 'An $8 \\times 8$ board has $64$ squares; removing $1$ leaves $63$ squares, and $63 \\div 3 = 21$ L-trominoes ($1$ at the center + $4 \\times 5 = 20$ across the four $4\\times 4$ quadrants).',
          },
        },
        {
          choice: {
            prompt: 'If you prove that every postage $n \\ge 12$ can be made from $3$¢ and $7$¢ stamps by stepping back $3$ cents ($n \\to n - 3$ plus one $3$¢ stamp), how many **base cases** must you check by hand before the inductive step takes over?',
            options: [
              { text: '3 base cases ($n = 12, 13, 14$), because $n - 3 \\ge 12$ requires $n \\ge 15$', why: 'Yes! Stepping back by $a = 3$ requires a runway of $a = 3$ consecutive base cases ($12, 13, 14$) so that every $n \\ge 15$ lands inside the proven range.' },
              { text: '1 base case ($n = 12$)', why: 'If you only check $n = 12$, then for $n = 13$ stepping back by 3 lands on $13 - 3 = 10$, which is not possible!' },
              { text: '7 base cases', why: 'Since we step back by $3$ (adding a $3$¢ stamp), a runway of length $3$ suffices.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'How does the **Well-Ordering Principle** prove the same theorems as Strong Induction?',
            options: [
              { text: 'If $\\forall n\\,P(n)$ failed, the set of counterexamples $S = \\{n \\ge n_0 : \\neg P(n)\\}$ would be non-empty, so by Well-Ordering it would have a **smallest** counterexample $m$—meaning $P(j)$ holds for all $j < m$, which contradicts the strong inductive step!', why: 'Yes! "Minimal criminal" / minimal counterexample proofs are Strong Induction phrased by contradiction via the Well-Ordering Principle.' },
              { text: 'Well-Ordering says every set of real numbers has a smallest element', why: 'Well-Ordering applies to non-negative **integers** $\\mathbb{N}$, not real numbers (for instance, $(0, 1)$ has no smallest positive real number!).' },
              { text: 'Well-Ordering only works on finite sets', why: 'It applies to *any* non-empty subset of $\\mathbb{N}$, finite or infinite.' },
            ],
            answer: 0,
          },
        },
        {
          puzzle: {
            id: 'tiling',
            title: 'Play the L-Tromino Inductive Tiler',
            desc: 'Place the center L-tromino yourself and tile a defective board quadrant by quadrant.',
          },
        },
        {
          note: 'Use **Strong Induction** whenever case $k + 1$ breaks into pieces smaller than $k$ (like factors $a, b$ of $k+1$, recurrence $F_{k+1} = F_k + F_{k-1}$, or stepping back $c$ units to $k + 1 - c$). When stepping back $c$ units, always check **$c$ consecutive base cases**!',
        },
      ],
    },
  ],
}
