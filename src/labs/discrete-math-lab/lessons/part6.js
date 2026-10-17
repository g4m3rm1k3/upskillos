// Part 6: Sequences, Recurrences & Asymptotics — closed-form sums & telescoping series, linear recurrences &
// characteristic roots, divide-and-conquer & the Master Theorem, generating functions & Catalan numbers, and Big-O.
import {
  arithmeticSum, geometricSum, telescopingPartial, fib, hanoiMoves,
  recurrenceSeq, catalan, choose,
} from '../engine/discrete.js'

export const PART6 = {
  id: 'recurrences-asymptotics',
  title: 'Part [[#part:recurrences-asymptotics]] · Sequences, recurrences & asymptotics',
  lessons: [
    {
      id: 'sequences-sums',
      title: 'Sequences, closed forms, Σ manipulation, and telescoping sums',
      goal: 'Evaluate arithmetic and geometric progressions in closed form, re-index $\\Sigma$ sums, and collapse telescoping series like $\\sum_{k=1}^n \\frac{1}{k(k+1)}$.',
      builds: ['induction'],
      blocks: [
        { h: 'Turning an n-step loop into a 1-step closed form' },
        {
          md: `A **sequence** $a_0, a_1, a_2, \\dots$ is simply a function from $\\mathbb{N}$ (or $\\mathbb{Z}^+$) into the numbers. A **closed form** is a formula that jumps directly to $a_n$ (or to the sum $\\sum_{k=1}^n a_k$) in a fixed number of operations, without adding up all $n$ terms one by one.

Two foundational families appear everywhere:
1. **Arithmetic Progression (add a constant difference $d$ each step):**
   $$a_k = a_1 + (k - 1)d, \\qquad \\sum_{k=1}^n a_k = n \\cdot \\frac{a_1 + a_n}{2}$$
   (The sum is simply the number of terms $n$ times the average of the **first and last** terms, by Gauss's reverse-and-add trick from lesson [[#induction]]!)
2. **Geometric Progression (multiply by a constant ratio $r \\ne 1$ each step):**
   $$a_k = a_0 r^k, \\qquad S_n = \\sum_{k=0}^{n-1} r^k = 1 + r + r^2 + \\dots + r^{n-1} = \\frac{r^n - 1}{r - 1} = \\frac{1 - r^n}{1 - r}$$
   *Why?* Multiply $S_n$ by $r$: $r S_n = r + r^2 + \\dots + r^n$. Subtract: $S_n - r S_n = (1 - r)S_n = 1 - r^n$—every middle term cancels!`,
        },
        { h: 'Telescoping Sums: When every interior term cancels its neighbor' },
        {
          md: `That cancellation trick works for any sum whose $k$-th term can be written as a difference $b_k - b_{k+1}$ (**telescoping sum**):
$$\\sum_{k=1}^n (b_k - b_{k+1}) = (b_1 - \\cancel{b_2}) + (\\cancel{b_2} - \\cancel{b_3}) + \\dots + (\\cancel{b_n} - b_{n+1}) = b_1 - b_{n+1}$$
Like a collapsible pocket telescope, the entire middle folds in on itself, leaving only the **very first piece $b_1$** and the **very last piece $-b_{n+1}$**!

The classic example uses partial fractions $\\frac{1}{k(k+1)} = \\frac{1}{k} - \\frac{1}{k+1}$:
$$\\sum_{k=1}^n \\frac{1}{k(k+1)} = \\sum_{k=1}^n \\left(\\frac{1}{k} - \\frac{1}{k+1}\\right) = \\left(1 - \\frac{1}{2}\\right) + \\left(\\frac{1}{2} - \\frac{1}{3}\\right) + \\dots + \\left(\\frac{1}{n} - \\frac{1}{n+1}\\right) = 1 - \\frac{1}{n+1} = \\frac{n}{n+1}$$`,
        },
        {
          symbols: [
            ['\\sum_{k=1}^n a_k = n\\frac{a_1 + a_n}{2}', 'arithmetic series sum', '(number of terms) $\\times$ (average of first and last term)', '$3 + 7 + 11 + 15 + 19 = 5 \\times \\frac{3+19}{2} = 55$'],
            ['\\sum_{k=0}^{n-1} r^k = \\frac{r^n - 1}{r - 1}', 'geometric series sum', 'For $r = 2$: $1 + 2 + 4 + \\dots + 2^{n-1} = 2^n - 1$', 'When $|r| < 1$, $\\sum_{k=0}^\\infty r^k = \\frac{1}{1-r}$'],
            ['\\sum_{k=1}^n (b_k - b_{k+1}) = b_1 - b_{n+1}', 'telescoping sum', 'Adjacent terms cancel in pairs, leaving only the two boundary ends', '$\\sum_{k=1}^n \\frac{1}{k(k+1)} = 1 - \\frac{1}{n+1} = \\frac{n}{n+1}$'],
          ],
        },
        {
          figure: 'SigmaTelescopeFig',
          caption: 'Step through arithmetic, geometric ($1 + 2 + \\dots + 2^{n-1} = 2^n - 1$), and telescoping sums to see adjacent interior terms cancel each other out.',
        },
        {
          worked: {
            title: 'Why binary numbers work: $1 + 2 + 4 + 8 + \\dots + 2^{n-1} = 2^n - 1$',
            steps: [
              ['Geometric formula ($r = 2$)', '$\\sum_{k=0}^{n-1} 2^k = \\frac{2^n - 1}{2 - 1} = 2^n - 1$', 'Every power of 2 is 1 more than the sum of all smaller powers of 2!'],
              ['Telescoping view', 'Write $2^k = 2^{k+1} - 2^k$: $\\sum_{k=0}^{n-1} (2^{k+1} - 2^k) = 2^n - 2^0 = 2^n - 1$', 'In binary: $\\underbrace{11\\dots 1}_{n\\text{ ones}} + 1 = 1\\underbrace{00\\dots 0}_{n\\text{ zeros}}$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is the sum of the arithmetic progression $4 + 7 + 10 + 13 + \\dots + 31$ ($n = 10$ terms with $a_1 = 4, d = 3, a_{10} = 31$)?',
            answer: arithmeticSum(4, 3, 10),
            compute: () => arithmeticSum(4, 3, 10),
            explain: '$10 \\times \\frac{4 + 31}{2} = 5 \\times 35 = 175$.',
          },
        },
        {
          predict: {
            prompt: 'Compute the geometric sum $1 + 3 + 9 + 27 + 81 + 243 = \\sum_{k=0}^5 3^k$.',
            answer: geometricSum(3, 6),
            compute: () => geometricSum(3, 6),
            explain: 'Here $r = 3$ and $n = 6$ terms ($k = 0..5$): $\\frac{3^6 - 1}{3 - 1} = \\frac{729 - 1}{2} = 364$.',
            misconceptions: [
              { answer: geometricSum(3, 5), feedback: 'Watch the index $k = 0, 1, 2, 3, 4, 5$: there are **6** terms (up to $3^5$), so the numerator uses $3^6 - 1$, not $3^5 - 1$!' },
            ],
          },
        },
        {
          predict: {
            prompt: 'Using the telescoping sum $\\sum_{k=1}^n \\frac{1}{k(k+1)} = 1 - \\frac{1}{n+1} = \\frac{n}{n+1}$, what is $99 \\times \\sum_{k=1}^{98} \\frac{1}{k(k+1)}$?',
            answer: Math.round(99 * telescopingPartial(98)),
            compute: () => Math.round(99 * telescopingPartial(98)),
            explain: 'For $n = 98$, the sum telescopes to $1 - \\frac{1}{99} = \\frac{98}{99}$. Multiplying by $99$ gives **98**!',
          },
        },
        {
          choice: {
            prompt: 'How many terms are in the sum $\\sum_{k=a}^b f(k)$ for integers $a \\le b$?',
            options: [
              { text: '$b - a + 1$ terms (inclusive endpoints—the "+1 fencepost rule"!)', why: 'Yes! For example, from $k = 0$ to $k = n$ there are $n - 0 + 1 = n + 1$ terms, and from $k = 5$ to $k = 10$ there are $10 - 5 + 1 = 6$ terms.' },
              { text: '$b - a$ terms', why: 'Subtracting $b - a$ counts the *gaps* between fenceposts, missing the starting term $k = a$!' },
              { text: '$b$ terms', why: 'Only when $a = 1$ does $b - 1 + 1 = b$.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'What does $\\sum_{k=1}^n \\ln\\left(\\frac{k+1}{k}\\right)$ simplify to?',
            options: [
              { text: '$\\ln(n + 1)$, because $\\ln\\left(\\frac{k+1}{k}\\right) = \\ln(k+1) - \\ln(k)$, which telescopes to $\\ln(n+1) - \\ln(1) = \\ln(n+1)$!', why: 'Yes! Logs turn quotients into differences, turning the sum into a telescoping series (and turning the product $\\frac{2}{1}\\cdot\\frac{3}{2}\\cdots\\frac{n+1}{n} = n+1$ into a telescoping sum)!' },
              { text: '$\\frac{n+1}{n}$', why: 'The sum of logs is the log of the product: $\\ln(n+1)$.' },
              { text: '$0$', why: 'The last term $\\ln(n+1)$ does not cancel.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'Always check the **fencepost count** ($b - a + 1$ terms in $\\sum_{k=a}^b$). When a sum looks intimidating, check whether it is **geometric** ($\\frac{r^n-1}{r-1}$) or **telescoping** ($b_k - b_{k+1}$).',
        },
      ],
    },

    {
      id: 'recurrences',
      title: 'Recurrence relations: Tower of Hanoi, Fibonacci, and characteristic roots',
      goal: 'Model multi-step problems with recurrence relations, solve the Tower of Hanoi $H_n = 2H_{n-1} + 1 = 2^n - 1$, and solve second-order linear recurrences $a_n = c_1 a_{n-1} + c_2 a_{n-2}$ via the characteristic equation $r^2 - c_1 r - c_2 = 0$.',
      builds: ['sequences-sums', 'strong-induction'],
      blocks: [
        { h: 'Defining the n-th term from earlier terms' },
        {
          md: `Often it is hard to see a closed-form formula for $a_n$ directly, but it is **easy** to see how $a_n$ is built from $a_{n-1}$ and $a_{n-2}$! That rule is a **recurrence relation** (and together with its **initial conditions** $a_0, a_1$, it uniquely determines the entire sequence).

**Classic Example 1 — The Tower of Hanoi ($H_n = 2H_{n-1} + 1$):**
You have $n$ disks of increasing sizes stacked on Peg A, and must move the stack to Peg C using Peg B, moving 1 disk at a time and never placing a larger disk on a smaller one.
- To move the bottom (largest) disk $n$ from A to C, the top $n - 1$ disks **must** first move out of the way onto Peg B: **$H_{n-1}$ moves**.
- Move the largest disk from A to C: **$1$ move**.
- Move the $n - 1$ disks from Peg B on top of it on Peg C: **$H_{n-1}$ moves**.
Total: $H_n = 2H_{n-1} + 1$ with $H_1 = 1$. Unrolling (expanding) the recurrence gives:
$$H_n = 2(2H_{n-2} + 1) + 1 = 2^2 H_{n-2} + 2 + 1 = \\dots = 2^{n-1} + 2^{n-2} + \\dots + 2 + 1 = 2^n - 1$$`,
        },
        { h: 'Solving Linear Homogeneous Recurrences: The Characteristic Equation' },
        {
          md: `Consider a **linear homogeneous recurrence with constant coefficients**:
$$a_n = c_1\\,a_{n-1} + c_2\\,a_{n-2}$$
For example, the **Fibonacci sequence** $F_n = F_{n-1} + F_{n-2}$ ($F_0 = 0, F_1 = 1$: $0, 1, 1, 2, 3, 5, 8, 13, 21, \\dots$) counts the number of ways to climb $n$ stairs taking $1$-step or $2$-step strides (if your first stride is 1 step, $F_{n-1}$ ways remain; if 2 steps, $F_{n-2}$ ways remain!).

How do we find a closed form for $a_n = c_1 a_{n-1} + c_2 a_{n-2}$?
Guess a geometric power **$a_n = r^n$** ($r \\ne 0$) and divide through by $r^{n-2}$:

$$r^n = c_1 r^{n-1} + c_2 r^{n-2} \\quad\\iff\\quad r^2 - c_1 r - c_2 = 0$$

This quadratic is the **characteristic equation**!
- **Case 1 (Two distinct roots $r_1 \\ne r_2$):** The general solution is $a_n = \\alpha\\,r_1^n + \\beta\\,r_2^n$, where constants $\\alpha, \\beta$ are found from $a_0$ and $a_1$.
  *(For Fibonacci $r^2 - r - 1 = 0$, the roots are the golden ratio $\\varphi = \\frac{1+\\sqrt{5}}{2} \\approx 1.618$ and $\\hat{\\varphi} = \\frac{1-\\sqrt{5}}{2} \\approx -0.618$, giving **Binet's Formula** $F_n = \\frac{\\varphi^n - \\hat{\\varphi}^n}{\\sqrt{5}}$!)*
- **Case 2 (One repeated root $r_1 = r_2 = r_0$):** The general solution is $a_n = (\\alpha + \\beta\\,n)\\,r_0^n$.`,
        },
        {
          symbols: [
            ['H_n = 2H_{n-1} + 1 = 2^n - 1', 'Tower of Hanoi recurrence', 'Minimum moves to transfer $n$ disks between pegs', 'For $n = 64$ golden disks: $2^{64} - 1 \\approx 1.84 \\times 10^{19}$ moves'],
            ['F_n = F_{n-1} + F_{n-2}', 'Fibonacci recurrence', '$F_0 = 0, F_1 = 1$; counts $1\\times 2$ domino tilings of a $2\\times n$ board ($F_{n+1}$)', '$F_{10} = 55$, growth rate $\\varphi = \\frac{1+\\sqrt{5}}{2} \\approx 1.618$'],
            ['r^2 - c_1 r - c_2 = 0', 'characteristic equation', 'Turns recurrence $a_n = c_1 a_{n-1} + c_2 a_{n-2}$ into a quadratic equation', 'Distinct roots $r_1, r_2 \\implies a_n = \\alpha r_1^n + \\beta r_2^n$'],
          ],
        },
        {
          figure: 'RecurrenceTreeFig',
          caption: 'Explore the Fibonacci call tree, Tower of Hanoi unrolling, and the Characteristic Root solver for $a_n = c_1 a_{n-1} + c_2 a_{n-2}$.',
        },
        {
          worked: {
            title: 'Solving $a_n = a_{n-1} + 6a_{n-2}$ with initial conditions $a_0 = 2, a_1 = 1$',
            steps: [
              ['1. Characteristic equation', '$r^2 - r - 6 = 0 \\iff (r - 3)(r + 2) = 0$', 'Characteristic roots are $r_1 = 3$ and $r_2 = -2$'],
              ['2. General solution shape', '$a_n = \\alpha \\cdot 3^n + \\beta \\cdot (-2)^n$', 'Distinct roots $3 \\ne -2$'],
              ['3. Plug in $n = 0$ and $n = 1$', '$n=0:\\; \\alpha + \\beta = 2$; $\\quad n=1:\\; 3\\alpha - 2\\beta = 1$.', '2 linear equations in $\\alpha, \\beta$'],
              ['4. Solve for $\\alpha, \\beta$', 'Multiply first by 2 and add: $5\\alpha = 5 \\implies \\alpha = 1, \\beta = 1$. So $a_n = 3^n + (-2)^n$!', 'Check $n=2$: $3^2 + (-2)^2 = 9 + 4 = 13 = 1 + 6(2) \\checkmark$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is the minimum number of moves $H_6 = 2^6 - 1$ required to solve a $6$-disk Tower of Hanoi puzzle?',
            answer: hanoiMoves(6),
            compute: () => hanoiMoves(6),
            explain: '$H_6 = 2^6 - 1 = 64 - 1 = 63$ moves.',
          },
        },
        {
          predict: {
            prompt: 'Using the closed form $a_n = 3^n + (-2)^n$ from the worked derivation above for $a_n = a_{n-1} + 6a_{n-2}$ ($a_0 = 2, a_1 = 1$), what is $a_4$?',
            answer: recurrenceSeq(1, 6, 2, 1, 5)[4],
            compute: () => recurrenceSeq(1, 6, 2, 1, 5)[4],
            explain: 'By closed form: $a_4 = 3^4 + (-2)^4 = 81 + 16 = 97$. By recurrence: $a_0=2, a_1=1, a_2=13, a_3=19, a_4 = 19 + 6(13) = 97$!',
          },
        },
        {
          predict: {
            prompt: 'How many ways can you climb a staircase of $8$ steps if each stride is either $1$ step or $2$ steps? (Note: for $1$ step there is $1 = F_2$ way, for $2$ steps there are $2 = F_3$ ways, …, for $n$ steps there are $F_{n+1}$ ways.)',
            answer: fib(9),
            compute: () => fib(9),
            explain: '$W_1 = 1, W_2 = 2, W_3 = 3, W_4 = 5, W_5 = 8, W_6 = 13, W_7 = 21, W_8 = 34 = F_9$.',
          },
        },
        {
          choice: {
            prompt: 'The recurrence $a_n = 6a_{n-1} - 9a_{n-2}$ has characteristic equation $r^2 - 6r + 9 = (r - 3)^2 = 0$, with a **single repeated root** $r_0 = 3$. What is the general form of $a_n$?',
            options: [
              { text: '$a_n = (\\alpha + \\beta\\,n)\\,3^n$: multiplying the second independent solution by $n$ restores two degrees of freedom to match $a_0$ and $a_1$!', why: 'Yes! Whenever a characteristic root $r_0$ has multiplicity $2$, both $r_0^n$ and $n\\,r_0^n$ satisfy the recurrence.' },
              { text: '$a_n = \\alpha\\,3^n + \\beta\\,3^n = (\\alpha + \\beta)\\,3^n$', why: 'That only has 1 adjustable constant $(\\alpha + \\beta)$, which cannot match arbitrary initial conditions $a_0, a_1$!' },
              { text: '$a_n = \\alpha\\,3^n + \\beta\\,(-3)^n$', why: '$-3$ is not a root of $r^2 - 6r + 9 = 0$.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'How many binary strings of length $n$ contain **NO two consecutive `1`s** (no `11` substring)?',
            options: [
              { text: 'It follows the Fibonacci recurrence $a_n = a_{n-1} + a_{n-2}$ (with $a_1 = 2, a_2 = 3$, so $a_n = F_{n+2}$): strings ending in `0` can follow any valid $(n-1)$-string ($a_{n-1}$), while strings ending in `1` must end in `01` and follow any valid $(n-2)$-string ($a_{n-2}$)!', why: 'Yes! Conditioning on the last bit (or first bit) reveals the Fibonacci recurrence in 2 lines.' },
              { text: '$2^n - (n - 1)$', why: 'Subtracting $n - 1$ heavily over-subtracts strings with multiple `11`s.' },
              { text: '$2^{n-1}$', why: 'For $n = 3$, $2^2 = 4$, whereas there are $5 = F_5$ valid strings (`000, 001, 010, 100, 101`).' },
            ],
            answer: 0,
          },
        },
        {
          note: 'To set up a recurrence for objects of size $n$, **condition on the last step** (e.g., last stride is $1$ or $2$; last bit is `0` or `01`). To solve $a_n = c_1 a_{n-1} + c_2 a_{n-2}$, solve $r^2 - c_1 r - c_2 = 0$.',
        },
      ],
    },

    {
      id: 'divide-conquer-master',
      title: 'Divide-and-conquer recurrences and the Master Theorem',
      goal: 'Build the recursion tree for $T(n) = a\\,T(n/b) + f(n)$, compute the critical leaf exponent $\\log_b a$, and apply the three cases of the Master Theorem to Merge Sort, Binary Search, and Karatsuba multiplication.',
      builds: ['recurrences'],
      blocks: [
        { h: 'When an algorithm splits a problem of size n into a pieces of size n/b' },
        {
          md: `Many of the fastest algorithms in computer science work by **Divide and Conquer**:
- Split an input of size $n$ into **$a \\ge 1$ subproblems**, each of size **$n / b$** ($b > 1$).
- Spend **$f(n) = \\Theta(n^d)$** work splitting the problem and combining the answers.

This gives the **divide-and-conquer recurrence**:
$$T(n) = a\\,T(n/b) + \\Theta(n^d)$$

Draw the **recursion tree** down to depth $L = \\log_b n$ (where the subproblem size $n/b^L$ hits $1$):
- At level $0$ (the root): $1$ problem doing $c\\,n^d$ work.
- At level $k$: $a^k$ subproblems, each of size $n/b^k$, doing $a^k c(n/b^k)^d = c\\,n^d \\left(\\frac{a}{b^d}\\right)^k$ work!
- At the bottom level $L = \\log_b n$: there are **$a^{\\log_b n} = n^{\\log_b a}$ leaves**!

Notice the geometric ratio from level to level is **$r = \\frac{a}{b^d}$** (or equivalently, compare the root work exponent **$d$** against the leaf-count exponent **$\\log_b a$**)!`,
        },
        { h: 'The Three Regimes of the Master Theorem' },
        {
          md: `Comparing the non-recursive work exponent **$d$** against the critical leaf exponent **$c_{\\text{crit}} = \\log_b a$** gives three clean cases:

1. **Case 1 — Top-Heavy ($d > \\log_b a$, i.e. $a < b^d$):**
   Work shrinks geometrically going down the tree; the root dominates!
   $$T(n) = \\Theta(n^d)$$
2. **Case 2 — Balanced ($d = \\log_b a$, i.e. $a = b^d$):**
   Every one of the $\\log_b n$ levels of the tree does the **exact same work** $\\Theta(n^d)$!
   $$T(n) = \\Theta(n^d \\log n)$$
   *(Examples: **Merge Sort** $T(n) = 2T(n/2) + \\Theta(n)$ has $a=2, b=2, d=1 = \\log_2 2 \\implies \\Theta(n\\log n)$; **Binary Search** $T(n) = 1T(n/2) + \\Theta(1)$ has $a=1, b=2, d=0 = \\log_2 1 \\implies \\Theta(\\log n)$!)*
3. **Case 3 — Leaf-Heavy ($d < \\log_b a$, i.e. $a > b^d$):**
   Work grows geometrically down the tree; the **$n^{\\log_b a}$ leaves** at the bottom dominate!
   $$T(n) = \\Theta(n^{\\log_b a})$$
   *(Example: **Karatsuba fast multiplication** $T(n) = 3T(n/2) + \\Theta(n)$ has $a=3, b=2, d=1 < \\log_2 3 \\approx 1.585 \\implies \\Theta(n^{\\log_2 3}) \\approx \\Theta(n^{1.585})$, beating $O(n^2)$ school multiplication!)*`,
        },
        {
          symbols: [
            ['T(n) = a\\,T(n/b) + \\Theta(n^d)', 'divide-and-conquer recurrence', '$a$ subproblems of size $n/b$, plus $\\Theta(n^d)$ combine work', 'Merge sort: $a=2, b=2, d=1$'],
            ['n^{\\log_b a}', 'number of leaves in recursion tree', 'Since $a^{\\log_b n} = n^{\\log_b a}$, the bottom level has $n^{\\log_b a}$ base cases', 'When $a=3, b=2$: $n^{\\log_2 3} \\approx n^{1.585}$ leaves'],
            ['d \\text{ vs. } \\log_b a', 'Master Theorem tug-of-war', 'Winner between root work $n^d$ and leaf work $n^{\\log_b a}$ determines $T(n)$', 'Tie ($d = \\log_b a$) multiplies by $\\log n$!'],
          ],
        },
        {
          figure: 'MasterTheoremFig',
          caption: 'Adjust $a$ (subproblems), $b$ (shrink factor), and $d$ (combine exponent) to see the recursion tree’s per-level work bars shift between Top-Heavy, Balanced, and Leaf-Heavy regimes.',
        },
        {
          worked: {
            title: 'Why Merge Sort $T(n) = 2T(n/2) + n$ ($T(1) = 0$) equals $n \\log_2 n$ exactly when $n = 2^k$',
            steps: [
              ['Level 0 (Root)', '$1$ array of size $n \\implies$ merge cost $= n$', 'Total at level 0 is $n$'],
              ['Level 1', '$2$ subarrays of size $n/2 \\implies$ merge cost $= 2 \\cdot (n/2) = n$', 'Total at level 1 is also $n$!'],
              ['Level $j$', '$2^j$ subarrays of size $n/2^j \\implies$ merge cost $= 2^j \\cdot (n/2^j) = n$', 'Every single level costs $n$'],
              ['Sum over $\\log_2 n$ levels', '$\\underbrace{n + n + \\dots + n}_{\\log_2 n \\text{ levels}} = n \\log_2 n$.', 'Case 2 (Balanced) of the Master Theorem!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'For the recurrence $T(n) = 4T(n/2) + n$, what is the critical leaf exponent $\\log_b a = \\log_2 4$?',
            answer: 2,
            compute: () => Math.log2(4),
            explain: '$\\log_2 4 = 2$. Since $d = 1 < 2$, the leaves dominate (Leaf-Heavy Case 3) and $T(n) = \\Theta(n^2)$.',
          },
        },
        {
          predict: {
            prompt: 'Suppose $T(n) = 2T(n/2) + n$ with $T(1) = 0$ (exact Merge Sort recurrence). What is $T(16)$?',
            answer: 16 * Math.log2(16),
            compute: () => 16 * Math.log2(16),
            explain: 'There are $\\log_2 16 = 4$ levels, and each level does $16$ units of work: $16 \\times 4 = 64$. (Check: $T(2)=2, T(4)=8, T(8)=24, T(16)=2(24)+16=64$!)',
          },
        },
        {
          choice: {
            prompt: 'What is the asymptotic growth of $T(n) = 2T(n/2) + n^2$?',
            options: [
              { text: '$\\Theta(n^2)$ (Top-Heavy Case 1: here $\\log_2 2 = 1 < d = 2$, so the root\'s $n^2$ work dominates the rest of the tree: $n^2 + \\frac{1}{2}n^2 + \\frac{1}{4}n^2 + \\dots = 2n^2$!)', why: 'Yes! Because each level does half the work of the level above ($2 \\cdot (n/2)^2 = \\frac{1}{2}n^2$), the geometric series sums to $2n^2 = \\Theta(n^2)$ without even a $\\log n$ factor!' },
              { text: '$\\Theta(n^2 \\log n)$', why: 'The $\\log n$ factor only appears in the Balanced case when $d = \\log_b a$. Here $d = 2 > \\log_2 2 = 1$.' },
              { text: '$\\Theta(n \\log n)$', why: 'Even the root alone already does $n^2$ work!' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Strassen\'s matrix multiplication algorithm multiplies two $n \\times n$ matrices by splitting them into **$a = 7$** recursive multiplications of size **$n/2$** (instead of the naive $8$), plus $\\Theta(n^2)$ additions: $T(n) = 7T(n/2) + \\Theta(n^2)$. Which Master Theorem case applies?',
            options: [
              { text: 'Leaf-Heavy Case 3: $\\log_2 7 \\approx 2.807 > d = 2$, so $T(n) = \\Theta(n^{\\log_2 7}) \\approx \\Theta(n^{2.807})$, beating naive $\\Theta(n^3)$ matrix multiplication!', why: 'Yes! Eliminating just 1 recursive call at each level drops the critical exponent from $\\log_2 8 = 3$ down to $\\log_2 7 \\approx 2.807$!' },
              { text: 'Balanced Case 2: $\\Theta(n^2 \\log n)$', why: 'Since $7 > 2^2 = 4$, $\\log_2 7 > 2$, so we are in the leaf-heavy regime, not balanced.' },
              { text: 'Top-Heavy Case 1: $\\Theta(n^2)$', why: '7 subproblems of quarter-area $n^2/4$ do $\\frac{7}{4}n^2 > n^2$ work at the next level, so work grows down the tree.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'In $T(n) = aT(n/b) + \\Theta(n^d)$, always compare **$d$** (root work) against **$\\log_b a$** (leaf count exponent): whichever is strictly larger wins ($\\Theta(n^d)$ or $\\Theta(n^{\\log_b a})$), and when they tie ($d = \\log_b a$), multiply by $\\log n$ ($\\Theta(n^d \\log n)$)!',
        },
      ],
    },

    {
      id: 'generating-functions',
      title: 'Generating functions and Catalan numbers Cₙ = C(2n, n)/(n + 1)',
      goal: 'Encode an infinite sequence $(a_0, a_1, a_2, \\dots)$ as a formal power series $G(x) = \\sum_{n=0}^\\infty a_n x^n$, solve constrained coin-change problems by multiplying polynomials, and recognize Catalan structures $C_n = \\frac{1}{n+1}\\binom{2n}{n}$.',
      builds: ['binomial-stars-bars', 'sequences-sums'],
      blocks: [
        { h: 'A clothesline on which we hang a sequence of numbers' },
        {
          md: `Herbert Wilf described a **generating function** as *"a clothesline on which we hang up a sequence of numbers for display."*
Given any sequence $a_0, a_1, a_2, \\dots$, its **ordinary generating function (OGF)** is the formal power series:

$$G(x) = \\sum_{n=0}^\\infty a_n\\,x^n = a_0 + a_1 x + a_2 x^2 + a_3 x^3 + \\dots$$

Why turn a sequence into a power series in $x$?
1. **Multiplying polynomials adds exponents ($x^i \\cdot x^j = x^{i+j}$)!**
   So when you multiply two generating functions $A(x) \\cdot B(x)$, the coefficient of $x^n$ (written $[x^n]\\,A(x)B(x)$) automatically sums over **all ways** to pick $i$ from the first choice and $j$ from the second choice with $i + j = n$:
   $$[x^n]\\big(A(x)B(x)\\big) = \\sum_{k=0}^n a_k\\,b_{n-k}$$
2. **Infinite sequences collapse into compact rational fractions!**
   For the all-ones sequence $(1, 1, 1, \\dots)$, the geometric series gives:
   $$1 + x + x^2 + x^3 + \\dots = \\frac{1}{1 - x}$$
   And raising it to the $k$-th power by Stars and Bars (lesson [[#binomial-stars-bars]]) gives the **Extended Binomial Series**:
   $$\\frac{1}{(1 - x)^k} = (1 + x + x^2 + \\dots)^k = \\sum_{n=0}^\\infty \\binom{n + k - 1}{k - 1} x^n$$`,
        },
        { h: 'The Catalan Numbers: Balanced parentheses, Dyck paths, and binary trees' },
        {
          md: `One sequence in combinatorics rivals the Fibonacci numbers in fame: the **Catalan numbers** $C_n$:
$$C_0 = 1,\\quad C_1 = 1,\\quad C_2 = 2,\\quad C_3 = 5,\\quad C_4 = 14,\\quad C_5 = 42, \\dots$$

Every one of these classic structures of size $n$ is counted by the exact same Catalan number $C_n$:
- **Balanced parentheses** of $n$ pairs, like ` + '`(()())`' + ` ($n=3$ has $C_3 = 5$: ` + '`((())), (()()), (())(), ()(()), ()()()`' + `).
- **Dyck paths** on an $n \\times n$ grid from $(0,0)$ to $(n,n)$ that **never cross above the main diagonal $y = x$**.
- **Full binary trees** with $n$ internal nodes (or $n + 1$ leaves).
- **Triangulations** of a convex $(n + 2)$-gon into $n$ triangles!

Splitting at the first return to the diagonal (or the root of the binary tree, with $k$ nodes in the left subtree and $n - 1 - k$ in the right) gives the **Catalan convolution recurrence**:
$$C_n = \\sum_{k=0}^{n-1} C_k\\,C_{n-1-k} \\quad\\implies\\quad C_n = \\frac{1}{n + 1}\\binom{2n}{n} = \\binom{2n}{n} - \\binom{2n}{n+1}$$
*(Notice the second formula: all $\\binom{2n}{n}$ paths on the $n\\times n$ grid, minus the $\\binom{2n}{n+1}$ "bad" paths that touch the forbidden line $y = x + 1$, proved by André's reflection bijection!)*`,
        },
        {
          symbols: [
            ['[x^n]\\,G(x)', 'coefficient of xⁿ in G(x)', 'Extracts the $n$-th term $a_n$ from generating function $G(x) = \\sum a_n x^n$', '$[x^n]\\,\\frac{1}{1 - 3x} = 3^n$'],
            ['\\frac{1}{(1-x)^k} = \\sum_{n=0}^\\infty \\binom{n+k-1}{k-1}x^n', 'Stars-and-Bars generating function', 'Multiplying $k$ copies of $(1 + x + x^2 + \\dots)$ counts $x_1 + \\dots + x_k = n$', '$[x^n]\\,\\frac{1}{(1-x)^2} = n + 1$'],
            ['C_n = \\frac{1}{n+1}\\binom{2n}{n}', 'n-th Catalan number', 'Counts $n$-pair balanced parens, Dyck paths, $n$-node binary trees, $(n+2)$-gon triangulations', '$C_0=1, C_1=1, C_2=2, C_3=5, C_4=14, C_5=42$'],
          ],
        },
        {
          figure: 'CatalanExplorerFig',
          caption: 'Explore the Catalan numbers $C_n = \\frac{1}{n+1}\\binom{2n}{n}$ across balanced parentheses, non-crossing Dyck grid paths, and generating function polynomial products.',
        },
        {
          worked: {
            title: 'André\'s Reflection Proof that $C_n = \\binom{2n}{n} - \\binom{2n}{n+1} = \\frac{1}{n+1}\\binom{2n}{n}$',
            steps: [
              ['All paths $(0,0) \\to (n,n)$', '$\\binom{2n}{n}$ total paths of $n$ East ($+1$) and $n$ North ($-1$) steps.', 'Some cross into the forbidden zone $y > x$'],
              ['Reflect at first bad step', 'At the first point a bad path hits $y = x + 1$, swap all remaining $E \\leftrightarrow N$ steps!', 'Every bad path lands at $(n - 1,\\; n + 1)$!'],
              ['Count bad paths', 'Paths from $(0,0)$ to $(n-1, n+1)$ have $n-1$ East and $n+1$ North steps: $\\binom{2n}{n+1}$.', 'A 1-to-1 bijection between bad paths and paths to $(n-1, n+1)$'],
              ['Subtract bad from all', '$C_n = \\binom{2n}{n} - \\binom{2n}{n+1} = \\binom{2n}{n}\\left(1 - \\frac{n}{n+1}\\right) = \\frac{1}{n+1}\\binom{2n}{n}$. $\\blacksquare$', 'Only $\\frac{1}{n+1}$ of all paths stay valid!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'How many valid ways can you arrange $n = 4$ pairs of parentheses (the Catalan number $C_4 = \\frac{1}{5}\\binom{8}{4}$)?',
            answer: catalan(4),
            compute: () => catalan(4),
            explain: '$\\binom{8}{4} = \\frac{8 \\times 7 \\times 6 \\times 5}{4 \\times 3 \\times 2 \\times 1} = 70$, and dividing by $n + 1 = 5$ gives $C_4 = 70 / 5 = 14$.',
          },
        },
        {
          predict: {
            prompt: 'What is the coefficient $[x^5]$ of $x^5$ in the generating function $G(x) = \\frac{1}{(1 - x)^3} = (1 + x + x^2 + \\dots)^3$?',
            answer: choose(5 + 3 - 1, 3 - 1),
            compute: () => choose(5 + 3 - 1, 3 - 1),
            explain: 'By the Extended Binomial Series (Stars and Bars with $n = 5, k = 3$), $[x^5]\\,\\frac{1}{(1-x)^3} = \\binom{5 + 3 - 1}{3 - 1} = \\binom{7}{2} = 21$.',
          },
        },
        {
          choice: {
            prompt: 'You want to count the number of ways to make $n$ cents using pennies ($1\\text{¢}$), nickels ($5\\text{¢}$), and dimes ($10\\text{¢}$). Which generating function has that exact count as the coefficient of $x^n$?',
            options: [
              { text: '$G(x) = \\frac{1}{(1 - x)(1 - x^5)(1 - x^{10})} = (1 + x + x^2 + \\dots)(1 + x^5 + x^{10} + \\dots)(1 + x^{10} + x^{20} + \\dots)$', why: 'Yes! Picking $x^{a}$ from the first factor ($a$ pennies), $x^{5b}$ from the second ($b$ nickels), and $x^{10c}$ from the third ($c$ dimes) multiplies to $x^{a + 5b + 10c} = x^n$!' },
              { text: '$G(x) = \\frac{1}{(1 - x)^3}$', why: 'That would give all three coin types value $1\\text{¢}$ ($a + b + c = n$).' },
              { text: '$G(x) = (1 + x)(1 + x^5)(1 + x^{10})$', why: 'That only allows **at most 1** coin of each type!' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Suppose a generating function splits by partial fractions into $G(x) = \\frac{2}{1 - 3x} + \\frac{5}{1 + x}$. What is the closed form for its $n$-th coefficient $a_n = [x^n]\\,G(x)$?',
            options: [
              { text: '$a_n = 2 \\cdot 3^n + 5 \\cdot (-1)^n$, because $\\frac{1}{1 - rx} = \\sum_{n=0}^\\infty r^n x^n$!', why: 'Yes! Partial fractions turn any rational generating function directly into a closed-form sum of powers!' },
              { text: '$a_n = 2 \\cdot (-3)^n + 5 \\cdot 1^n$', why: 'Watch the signs in the denominator: $\\frac{1}{1 - rx}$ has $+r^n$, so $1 - 3x$ gives $(+3)^n$ and $1 + x = 1 - (-1)x$ gives $(-1)^n$.' },
              { text: '$a_n = (2 + 5) \\cdot 3^n$', why: 'The two fractions have different geometric ratios ($3$ and $-1$).' },
            ],
            answer: 0,
          },
        },
        {
          note: 'In a **generating function** $G(x) = \\sum a_n x^n$, exponents record *weights/sizes* and coefficients record *counts*, so multiplying polynomials automatically performs constrained counting! And remember the **Catalan numbers** $C_n = \\frac{1}{n+1}\\binom{2n}{n}$ whenever a problem involves balanced nesting or binary tree splitting.',
        },
      ],
    },

    {
      id: 'asymptotics',
      title: 'Asymptotic growth: Big-O, Big-Ω, Big-Θ, and the hierarchy of functions',
      goal: 'Prove $f(n) = \\mathcal{O}(g(n))$ using explicit witness constants $(C, n_0)$, distinguish $\\mathcal{O}$ (upper bound), $\\Omega$ (lower bound), and $\\Theta$ (tight bound), and rank functions along the asymptotic hierarchy.',
      builds: ['divide-conquer-master'],
      blocks: [
        { h: 'Why growth rate beats constant multipliers as n grows large' },
        {
          md: `Suppose Algorithm A takes $f(n) = 1000\\,n$ steps, while Algorithm B takes $g(n) = n^2$ steps.
For $n = 10$, Algorithm B is faster ($100$ vs. $10{,}000$).
For $n = 1{,}000{,}000$, Algorithm A takes $10^9$ operations (under 1 second), while Algorithm B takes $10^{12}$ operations (1000 times slower)!

To compare how functions behave for **large $n$** without getting bogged down in hardware-dependent constants or lower-order terms, mathematics and computer science use **asymptotic notation**:`,
        },
        {
          symbols: [
            ['f(n) = \\mathcal{O}(g(n))', 'Big-O of g(n) (upper bound)', '$\\exists C > 0,\\,\\exists n_0$ such that $\\forall n \\ge n_0,\\;|f(n)| \\le C\\,|g(n)|$ ($f$ grows **no faster** than $g$)', '$3n^2 + 10n = \\mathcal{O}(n^2)$ (and also $\\mathcal{O}(n^3)$!)'],
            ['f(n) = \\Omega(g(n))', 'Big-Omega of g(n) (lower bound)', '$\\exists c > 0,\\,\\exists n_0$ such that $\\forall n \\ge n_0,\\;f(n) \\ge c\\,g(n)$ ($f$ grows **at least as fast** as $g$)', '$3n^2 + 10n = \\Omega(n^2)$ (and $\\Omega(n)$)'],
            ['f(n) = \\Theta(g(n))', 'Big-Theta of g(n) (tight bound)', 'Both $f(n) = \\mathcal{O}(g(n))$ **and** $f(n) = \\Omega(g(n))$ ($f$ and $g$ grow at the **same** rate)', '$\\sum_{i=1}^n i = \\frac{n^2+n}{2} = \\Theta(n^2)$'],
            ['1 \\ll \\log n \\ll n \\ll n\\log n \\ll n^2 \\ll 2^n \\ll n!', 'the asymptotic hierarchy', 'Each class grows infinitely faster than the one to its left ($\\lim_{n\\to\\infty} f(n)/g(n) = 0$)', 'For any $d > 0$ and $b > 1$: $(\\log n)^d \\ll n^d \\ll b^n$'],
          ],
        },
        {
          md: `**How to prove $f(n) = \\mathcal{O}(g(n))$ with explicit witnesses $(C, n_0)$:**
Suppose you want to prove $f(n) = 3n^2 + 5n + 2 = \\mathcal{O}(n^2)$.
Instead of solving a complicated quadratic inequality, **replace every smaller power by $n^2$ for all $n \\ge 1$**:
- When $n \\ge 1$, we have $5n \\le 5n^2$ and $2 \\le 2n^2$.
- Add them up: for all $n \\ge 1$,
  $$3n^2 + 5n + 2 \\;\\le\\; 3n^2 + 5n^2 + 2n^2 = 10n^2$$
So choosing witnesses **$n_0 = 1$** and **$C = 10$** proves $3n^2 + 5n + 2 = \\mathcal{O}(n^2)$ in two lines! (Notice that witnesses are not unique—$n_0 = 5, C = 5$ works too!)`,
        },
        {
          figure: 'AsymptoticRaceFig',
          caption: 'Compare the growth of $\\log_2 n, n, n\\log_2 n, n^2, 2^n$ and test witness pairs $(C, n_0)$ to see where $C\\,g(n)$ overtakes $f(n)$ permanently.',
        },
        {
          worked: {
            title: 'Stirling\'s Law & Why Sorting Comparison Trees Need $\\Omega(n \\log n)$ Comparisons',
            steps: [
              ['Log of a factorial', '$\\log_2(n!) = \\log_2(1) + \\log_2(2) + \\dots + \\log_2(n)$', 'Product inside $\\log$ becomes a sum'],
              ['Upper bound ($\\mathcal{O}$)', 'Every term is $\\le \\log_2 n \\implies \\log_2(n!) \\le n \\log_2 n = \\mathcal{O}(n \\log n)$.', 'Witnesses $C = 1, n_0 = 1$'],
              ['Lower bound ($\\Omega$)', 'The top $n/2$ terms (from $k = \\lceil n/2 \\rceil$ to $n$) are each $\\ge \\log_2(n/2) = (\\log_2 n) - 1 \\implies \\log_2(n!) \\ge \\frac{n}{2}(\\log_2 n - 1) = \\Omega(n \\log n)$!', 'Keep only the larger half of the sum!'],
              ['Conclusion', '$\\log_2(n!) = \\Theta(n \\log n)$ (even without calculus or Stirling\'s approximation!).', 'Any comparison sort needs $\\ge \\log_2(n!) = \\Omega(n \\log n)$ steps!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'Using the standard $n_0 = 1$ bounding method on $f(n) = 4n^3 + 7n^2 + 2n + 5 \\le C\\,n^3$ (replacing $n^2, n, 1$ each by $n^3$ for $n \\ge 1$), what constant $C = 4 + 7 + 2 + 5$ works for all $n \\ge 1$?',
            answer: 4 + 7 + 2 + 5,
            compute: () => 4 + 7 + 2 + 5,
            explain: 'For all $n \\ge 1$, $4n^3 + 7n^2 + 2n + 5 \\le 4n^3 + 7n^3 + 2n^3 + 5n^3 = 18n^3$, giving witness $C = 18$ at $n_0 = 1$.',
          },
        },
        {
          predict: {
            prompt: 'Suppose instead you want to show $2n + 10 \\le 3n$ (so $C = 3$). What is the **smallest** integer cutoff $n_0$ such that $2n + 10 \\le 3n$ holds for all $n \\ge n_0$?',
            answer: 10,
            compute: () => 10,
            explain: 'Subtract $2n$ from both sides: $10 \\le n$. So $(C = 3, n_0 = 10)$ is a valid witness pair!',
          },
        },
        {
          choice: {
            prompt: 'Is $2^{n+1} = \\mathcal{O}(2^n)$? What about $2^{2n} = \\mathcal{O}(2^n)$?',
            options: [
              { text: '$2^{n+1} = 2 \\cdot 2^n = \\mathcal{O}(2^n)$ is **True** (with $C = 2$), whereas $2^{2n} = 4^n = 2^n \\cdot 2^n$ is **NOT** $\\mathcal{O}(2^n)$ because the ratio $4^n / 2^n = 2^n \\to \\infty$!', why: 'Yes! Adding $+1$ to an exponent only multiplies by a constant factor $2^1 = 2$, whereas doubling an exponent squares the base ($2^{2n} = 4^n \\gg 2^n$)!' },
              { text: 'Both are $\\mathcal{O}(2^n)$ because constant factors in exponents don\'t matter', why: 'Constant factors *in front of a function* don\'t change $\\Theta$, but a constant factor *in an exponent* changes the base ($2^{2n} = 4^n$)!' },
              { text: 'Neither is $\\mathcal{O}(2^n)$', why: '$2^{n+1} = 2 \\cdot 2^n$ is just a constant $C = 2$ times $2^n$.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Why is $\\log_2 n = \\Theta(\\log_{10} n)$ (meaning the base of a logarithm doesn\'t need to be written inside $\\mathcal{O}(\\log n)$)?',
            options: [
              { text: 'By the change-of-base formula $\\log_2 n = \\frac{\\ln n}{\\ln 2} = \\left(\\frac{\\log_{10} 10}{\\log_{10} 2}\\right) \\log_{10} n \\approx 3.322\\,\\log_{10} n$, two logs with different constant bases $> 1$ differ only by a constant multiplier!', why: 'Yes! Inside $\\mathcal{O}(\\log n)$, changing the base only multiplies by a constant $C = \\frac{1}{\\log_b a}$. (Be careful: if the log is in an *exponent*, like $2^{\\log_2 n} = n$, the base *does* matter!)' },
              { text: 'Because $\\log_2 n = \\log_{10} n$ for large $n$', why: '$\\log_2 n$ is always about $3.322$ times larger than $\\log_{10} n$; they are proportional, not equal.' },
              { text: 'Logs are bounded by a constant', why: '$\\log n \\to \\infty$ as $n \\to \\infty$, just very slowly.' },
            ],
            answer: 0,
          },
        },
        {
          note: '$\\mathcal{O}$ is like $\\le$ (upper bound), $\\Omega$ is like $\\ge$ (lower bound), and $\\Theta$ is like $=$ (tight bound, up to constant factors). Remember the hierarchy: $1 \\ll \\log n \\ll n \\ll n \\log n \\ll n^2 \\ll n^3 \\ll 2^n \\ll 3^n \\ll n!$.',
        },
      ],
    },
  ],
}
