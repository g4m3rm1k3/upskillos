// The algorithms part: how computer scientists count work (big-O, loops, recurrences, logarithms),
// how computers hold numbers (floating point, stability, pseudo-randomness), and the algorithms
// under ML (automatic differentiation, dynamic programming, graphs, hashing).
import { growth, boundedBy, attentionCost, mergeSort, binarySearch, machineEpsilon, logsumexp, onePassVariance, lcg, Value, editDistance, viterbi, walks, pagerank, polyHash, hashingTrick } from '../engine/maths.js'
import { f } from './util.js'

export const ALGO = {
  id: 'algorithms', title: 'Part [[#part:algorithms]] · Algorithms and computer-science maths', lessons: [
    {
      id: 'big-o', title: 'Big-O: how cost grows',
      goal: 'Define $f = O(g)$ with $\\exists c, n_0$, prove that constants and smaller terms drop out, read $\\Theta$ and $\\Omega$, and order the common growth rates.',
      builds: ['logic', 'inequalities', 'logarithms'],
      blocks: [
        { md: `How long does an algorithm take? Seconds depend on the computer, so computer scientists count **steps** as a function of the input size $n$, and ask only how that count **grows**. A method taking $3n^2 + 10n$ steps and one taking $n^2$ both quadruple when $n$ doubles; a method taking $100n$ steps eventually beats both, however small $n$'s constant favours them at first.

**Definition.** $f(n) = O(g(n))$ ("$f$ is big-O of $g$") means
$$\\exists\\, c > 0,\\; \\exists\\, n_0:\\;\\; \\forall n \\ge n_0,\\;\\; f(n) \\le c\\,g(n)$$
(lesson [[#logic]]'s quantifiers): beyond some point, $f$ is at most a constant multiple of $g$. It is an **upper bound** on growth.

**Constants and smaller terms drop out.** Claim: $3n^2 + 10n = O(n^2)$. Take $c = 4$ and $n_0 = 10$: for $n \\ge 10$, $10n \\le n \\cdot n = n^2$, so $3n^2 + 10n \\le 3n^2 + n^2 = 4n^2$. $\\blacksquare$ The same argument works for any polynomial: only the highest power matters, and its coefficient is absorbed into $c$.

**Relatives.** $f = \\Omega(g)$: at least a constant times $g$ eventually (a lower bound). $f = \\Theta(g)$: both, so $f$ grows **exactly** like $g$ up to constants. People often write $O$ when they mean $\\Theta$.

**The ladder of growth rates**, each eventually dwarfing the one before:
$$1 \\;<\\; \\log n \\;<\\; n \\;<\\; n\\log n \\;<\\; n^2 \\;<\\; n^3 \\;<\\; 2^n \\;<\\; n!$$
At $n = 20$: $\\log_2 n \\approx 4.3$, $n^2 = 400$, $2^n \\approx 10^6$. At $n = 100$, $2^n \\approx 10^{30}$: no computer will ever finish. (The base of a log doesn't matter inside $O$: $\\log_2 n = \\frac{\\ln n}{\\ln 2}$, a constant multiple.)

**The same symbol for small things.** In maths, $O(h^2)$ as $h \\to 0$ means "at most a constant times $h^2$ for small $h$": lesson [[#taylor]]'s error terms. Context tells you whether $n \\to \\infty$ or $h \\to 0$.

**In ML papers**: attention is $O(T^2d)$ in sequence length $T$; a linear layer is $O(d_{\\text{in}}d_{\\text{out}})$ per example; "linear attention" papers are trying to remove the $T^2$.` },
        { figure: 'GrowthFig', caption: 'The growth rates side by side. Slide $n$: on an ordinary scale the fast ones leave the screen almost at once; switch to a log scale to see them all.' },
        {
          code: {
            file: 'algorithms.py', fn: 'growth', notes: [
              ['def growth(n):', ['A size $n$.']],
              ['return math.log2(n), n, n * math.log2(n), n * n, 2.0 ** n', ['Five rungs of the ladder at that $n$.']],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'bounded_by', notes: [
              ['def bounded_by(f, g, c, n0, upto=10000):', ['A cost $f$, a comparison $g$, and claimed witnesses $c$ and $n_0$.']],
              ['for n in range(n0, upto + 1):', ['Every $n$ from $n_0$ on (up to a limit: evidence, not proof).']],
              ['if f(n) > c * g(n):', ['A counterexample to $f(n) \\le c\\,g(n)$…']],
              ['return False', ['…sinks these witnesses.']],
              ['return True', ['None found up to the limit.'], { tex: 'f = O(g) \\iff \\exists c, n_0\\;\\forall n \\ge n_0: f(n) \\le c\\,g(n)' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'Is $3n^2 + 10n \\le 4n^2$ for every $n$ from 10 to 10,000? (1 for yes, 0 for no)',
            answer: 1, compute: () => Number(boundedBy(n => 3 * n * n + 10 * n, n => n * n, 4, 10)),
            explain: 'Yes, as the proof says: $c = 4$, $n_0 = 10$ witness $3n^2 + 10n = O(n^2)$.',
          },
        },
        {
          predict: {
            prompt: 'At $n = 20$, how many times bigger is $2^n$ than $n^2$? (to the nearest whole number)',
            answer: Math.round(growth(20)[4] / growth(20)[3]), compute: () => Math.round(growth(20)[4] / growth(20)[3]),
            explain: '$1{,}048{,}576 / 400 \\approx 2621$. Exponential growth wins by a mile even at 20.',
          },
        },
        { note: '$f = O(g)$: $\\exists c, n_0$ with $f(n) \\le c\\,g(n)$ for all $n \\ge n_0$. Constants and lower-order terms drop out. $\\Omega$: lower bound; $\\Theta$: both. $1 < \\log n < n < n\\log n < n^2 < 2^n < n!$. As $h \\to 0$, $O(h^2)$ means "at most a constant times $h^2$".' },
      ],
    },

    {
      id: 'loop-costs', title: 'Counting loops: why a matmul is $O(n^3)$ and attention is $O(T^2)$',
      goal: 'Count the work of nested and consecutive loops, derive the cost of a matrix product and of attention, and estimate a model\'s training compute.',
      builds: ['big-o', 'matrix-multiplication'],
      blocks: [
        { md: `Most of an ML system's time goes into a few loops. Two rules count them:

- **Nested loops multiply.** A loop of $a$ steps, each running a loop of $b$ steps, does $ab$ steps of the inside.
- **Consecutive loops add.** Then only the biggest term survives in big-O.

**A matrix product.** $(AB)_{ij} = \\sum_k A_{ik}B_{kj}$ (lesson [[#matrix-multiplication]]). For $A$ of size $n \\times m$ and $B$ of size $m \\times p$: one loop over $i$ ($n$), one over $j$ ($p$), and inside, the sum over $k$ ($m$). So $nmp$ multiplications (and as many additions). Square $n \\times n$ matrices: $n^3$. Double the size, **eight** times the work. (Clever algorithms like Strassen's get below $n^3$ in theory; GPUs use the plain one, very fast.)

**A linear layer** on a batch of $B$ examples, $d_{\\text{in}} \\to d_{\\text{out}}$: a $B \\times d_{\\text{in}}$ times $d_{\\text{in}} \\times d_{\\text{out}}$ product, $B\\,d_{\\text{in}}d_{\\text{out}}$ multiply-adds.

**Attention**, the core of a Transformer (lesson [[#attention]] builds it later), gives each of $T$ tokens a query, a key and a value, each a vector of size $d$, stacked as $T \\times d$ matrices $Q$, $K$, $V$. It scores every query against every key, $QK^\\top$: a $(T \\times d)(d \\times T)$ product, $T^2d$. It then mixes the values with those weights, $(T \\times T)(T \\times d)$: another $T^2d$. Total $2T^2d$: **quadratic in sequence length**. Doubling the context quadruples attention's work, and storing the $T \\times T$ weight matrix costs $T^2$ memory too. That single fact drives the research on longer contexts (sparse, linear and flash attention).

**Training compute, roughly.** Each parameter takes part in about one multiply and one add per token in the forward pass: about $2N$ operations per token for $N$ parameters. The backward pass costs about twice the forward (it needs gradients with respect to both a layer's inputs and its weights: two products of the same size). So training costs about $6N$ operations per token: the "$6ND$" rule of thumb for a model with $N$ parameters trained on $D$ tokens. (A rule of thumb that ignores attention's $T^2$ term, which is small next to the weights for typical $T$.)` },
        { figure: 'LoopCostFig', caption: 'The three loops of a matrix product, as a block of cubes: each cube is one multiply-add. Change the sizes and the block\'s volume, $nmp$, is the cost. Below, attention\'s cost against sequence length: a parabola.' },
        {
          code: {
            file: 'algorithms.py', fn: 'matmul_cost', notes: [
              ['def matmul_cost(n, m, p):', ['The two shapes, $n \\times m$ and $m \\times p$.']],
              ['count = 0', ['Count instead of compute.']],
              ['for i in range(n):', ['Each row of the result…']],
              ['for j in range(p):', ['…each column…']],
              ['for k in range(m):', ['…and each term of the dot product.']],
              ['count += 1', ['One multiply-add.']],
              ['return count', ['$nmp$.'], { tex: 'n \\cdot m \\cdot p' }],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'attention_cost', notes: [
              ['def attention_cost(T, d):', ['Tokens and head size.']],
              ['return matmul_cost(T, d, T) + matmul_cost(T, T, d)', ['Scores $QK^\\top$ then weights times $V$: consecutive, so they add.'], { tex: '2T^2d' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'How many multiply-adds does one attention head do for $T = 6$ tokens with $d = 4$?',
            answer: 288, compute: () => attentionCost(6, 4),
            explain: '$2 \\times 36 \\times 4 = 288$.',
          },
        },
        {
          predict: {
            prompt: 'By what factor does attention\'s cost grow when the context goes from 2000 to 8000 tokens?',
            answer: 16, compute: () => attentionCost(8, 1) / attentionCost(2, 1),
            explain: '$(8000/2000)^2 = 16$: quadratic in $T$.',
          },
        },
        {
          predict: {
            prompt: 'By the $6ND$ rule, roughly how many operations does it take to train a 1-billion-parameter model on 20 billion tokens? (Give the power of 10, e.g. 20 for $10^{20}$, to one decimal.)',
            answer: Math.log10(6 * 1e9 * 2e10), tolerance: 0.06, compute: () => Math.log10(6 * 1e9 * 2e10),
            explain: '$6 \\times 10^9 \\times 2 \\times 10^{10} = 1.2 \\times 10^{20}$: about $10^{20.1}$.',
          },
        },
        { note: 'Nested loops multiply, consecutive add. A matrix product costs $nmp$; square $n^3$. Attention costs $2T^2d$: quadratic in context length. Training costs about $6N$ operations per token (forward $2N$, backward $4N$).' },
      ],
    },

    {
      id: 'recurrences', title: 'Recurrences and divide and conquer',
      goal: 'Write the cost of a recursive algorithm as a recurrence, solve merge sort\'s $T(n) = 2T(n/2) + n$ as $n\\log n$, and derive the master theorem\'s three cases from a geometric series.',
      builds: ['loop-costs', 'induction', 'logarithms'],
      blocks: [
        { md: `**Divide and conquer**: split a problem into smaller copies of itself, solve those (by the same method), and combine. Its cost is described by a **recurrence**, an equation for $T(n)$ in terms of $T$ at smaller sizes.

**Merge sort.** To sort $n$ items: sort each half (recursively), then **merge** the two sorted halves by repeatedly taking the smaller front item, at most $n - 1$ comparisons. So
$$T(n) = 2\\,T(n/2) + n$$
**Solve it by levels.** Picture the recursion as a tree. Level 0 is one problem of size $n$ doing $n$ work. Level 1: two problems of size $n/2$, each doing $n/2$ work, total $n$. Level $k$: $2^k$ problems of size $n/2^k$, total again $n$. The sizes reach 1 after $\\log_2 n$ halvings. So: $\\log_2 n$ levels of $n$ work each, $T(n) = \\Theta(n\\log n)$. For a million items that is about 20 million steps against a trillion for comparing every pair.

**The general pattern (the master theorem).** $T(n) = a\\,T(n/b) + n^c$: $a$ subproblems, each $b$ times smaller, plus $n^c$ work to split and combine. At level $k$ there are $a^k$ subproblems of size $n/b^k$, each doing $(n/b^k)^c$, so level $k$ costs
$$a^k\\left(\\frac{n}{b^k}\\right)^c = n^c\\left(\\frac{a}{b^c}\\right)^k$$
a geometric series in $k$ with ratio $r = a/b^c$, over $\\log_b n$ levels (lesson [[#induction]]'s formula). Three cases:
- $r < 1$: the series is dominated by its first term: $T = \\Theta(n^c)$. The top-level work wins.
- $r = 1$: every level costs the same, $n^c$: $T = \\Theta(n^c\\log n)$ (merge sort: $a = b = 2$, $c = 1$).
- $r > 1$: dominated by its last term, the $a^{\\log_b n} = n^{\\log_b a}$ tiny problems at the bottom: $T = \\Theta(n^{\\log_b a})$.

Examples: binary search, $T(n) = T(n/2) + 1$, has $r = 1$: $\\Theta(\\log n)$. Strassen's matrix product, $T(n) = 7T(n/2) + n^2$, has $r = 7/4 > 1$: $\\Theta(n^{\\log_2 7}) = \\Theta(n^{2.81})$, beating $n^3$. The **fast Fourier transform**, $\\Theta(n\\log n)$, behind fast convolution and audio models, is the same $r = 1$ case.` },
        { figure: 'RecursionTreeFig', caption: 'The recursion tree of merge sort: each level\'s boxes add up to $n$ work, and there are $\\log_2 n$ levels. Switch to the master theorem\'s other cases to see the work pile up at the top or the bottom.' },
        {
          code: {
            file: 'algorithms.py', fn: 'merge_sort', notes: [
              ['def merge_sort(xs):', ['A list to sort; we also count comparisons.']],
              ['if len(xs) <= 1:', ['The base case: nothing to sort…']],
              ['return list(xs), 0', ['…and no comparisons.']],
              ['mid = len(xs) // 2', ['Split point.']],
              ['left, c1 = merge_sort(xs[:mid])', ['Sort the left half (the recursion: $T(n/2)$).']],
              ['right, c2 = merge_sort(xs[mid:])', ['And the right half (another $T(n/2)$).']],
              ['merged = []', ['The combined result.']],
              ['i = j = 0', ['Front of each half.']],
              ['comparisons = c1 + c2', ['Carry the halves\' counts.']],
              ['while i < len(left) and j < len(right):', ['While both halves have items…']],
              ['comparisons += 1', ['…one comparison per step of the merge…']],
              ['if left[i] <= right[j]:', ['…takes the smaller front item:']],
              ['merged.append(left[i])', ['from the left…']],
              ['i += 1', ['…and advance there,']],
              ['merged.append(right[j])', ['or from the right…']],
              ['j += 1', ['…and advance there.']],
              ['merged += left[i:] + right[j:]', ['Whatever remains is already in order.']],
              ['return merged, comparisons', ['The $+n$ term: at most $n - 1$ comparisons to merge.'], { tex: 'T(n) = 2T(n/2) + n' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'How many comparisons does merge sort make on $8, 7, 6, 5, 4, 3, 2, 1$?',
            answer: mergeSort([8, 7, 6, 5, 4, 3, 2, 1])[1], compute: () => mergeSort([8, 7, 6, 5, 4, 3, 2, 1])[1],
            explain: `${mergeSort([8, 7, 6, 5, 4, 3, 2, 1])[1]}: each merge of two reversed halves stops as soon as one side runs out. Compare $n\\log_2 n = 24$, the bound.`,
          },
        },
        {
          predict: {
            prompt: 'Master theorem: $T(n) = 4T(n/2) + n$. What power of $n$ is $T$? (the exponent)',
            answer: 2, compute: () => Math.log2(4),
            explain: '$r = a/b^c = 4/2 = 2 > 1$: the bottom wins, $\\Theta(n^{\\log_2 4}) = \\Theta(n^2)$. Four half-size problems is no better than doing it directly.',
          },
        },
        { note: 'Divide and conquer gives recurrences $T(n) = aT(n/b) + n^c$. Level $k$ costs $n^c(a/b^c)^k$: a geometric series. $a/b^c < 1$: $\\Theta(n^c)$; $= 1$: $\\Theta(n^c\\log n)$ (merge sort, FFT); $> 1$: $\\Theta(n^{\\log_b a})$.' },
      ],
    },

    {
      id: 'logs-in-algorithms', title: 'Logarithms in algorithms: halving, trees and bits',
      goal: 'Explain why halving gives $\\log_2 n$ steps, bound binary search, relate tree depth and bit length to logs, and prove sorting by comparisons needs $\\log_2(n!) \\approx n\\log_2 n$ comparisons.',
      builds: ['recurrences', 'information', 'counting'],
      blocks: [
        { md: `Wherever an algorithm **halves** something each step, a $\\log_2$ appears: $\\log_2 n$ answers "how many times can you halve $n$ before reaching 1?" (lesson [[#logarithms]]: "what power?").

**Binary search.** To find a value in a sorted list of $n$, compare it with the middle item and discard the half where it can't be. After $s$ steps at most $n/2^s$ candidates remain; the search ends once that is below 1. So at most about $\\log_2 n + 1$ steps: 20 comparisons find any item among a million, 30 among a billion.

**Trees.** A balanced binary tree with $n$ leaves has depth $\\log_2 n$: each level doubles the number of nodes. Decision trees, the heap behind a priority queue, and the tree of tokens a beam search explores all live with this.

**Bits.** Writing a whole number $n$ in binary takes $\\lfloor\\log_2 n\\rfloor + 1$ bits. A vocabulary of 50,000 tokens needs 16 bits per token id ($2^{16} = 65{,}536$).

**A lower bound with logs: sorting.** Any sorting method that only **compares** items needs about $n\\log_2 n$ comparisons in the worst case, so merge sort is as good as possible. Proof: there are $n!$ possible orders of the input (lesson [[#counting]]), and the method must distinguish all of them, since each needs different rearranging. Each comparison has two outcomes, so after $k$ comparisons at most $2^k$ cases can be told apart (lesson [[#information]]: each yes/no answer is at most one bit). We need $2^k \\ge n!$, so $k \\ge \\log_2(n!)$. And $\\log_2(n!) \\ge \\log_2\\left((n/2)^{n/2}\\right) = \\frac n2\\log_2\\frac n2$ (the top half of the factors are each at least $n/2$), which is $\\Theta(n\\log n)$. $\\blacksquare$

The same counting argument is behind information-theoretic bounds everywhere: you can't learn more bits than your measurements carry.` },
        { figure: 'BinarySearchFig', caption: 'Binary search on a sorted list: each comparison throws away half. Pick a target and step: the live range shrinks $n \\to n/2 \\to n/4 \\to \\dots$, and the number of steps tracks $\\log_2 n$.' },
        {
          code: {
            file: 'algorithms.py', fn: 'binary_search', notes: [
              ['def binary_search(xs, target):', ['A sorted list and a value.']],
              ['lo, hi = 0, len(xs) - 1', ['The live range, both ends included.']],
              ['steps = 0', ['Count comparisons.']],
              ['while lo <= hi:', ['While anything is left…']],
              ['steps += 1', ['…one more step.']],
              ['mid = (lo + hi) // 2', ['The middle of the live range.']],
              ['if xs[mid] == target:', ['Found it…']],
              ['return mid, steps', ['…return where, and how many steps.']],
              ['if xs[mid] < target:', ['The target is in the right half…']],
              ['lo = mid + 1', ['…so drop the left half and the middle.']],
              ['hi = mid - 1', ['Otherwise drop the right half and the middle.']],
              ['return -1, steps', ['Not present.'], { tex: '\\text{steps} \\le \\lfloor\\log_2 n\\rfloor + 1' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'At most how many steps does binary search need to find any item in a sorted list of 1,000,000?',
            answer: 20, compute: () => Math.floor(Math.log2(1e6)) + 1,
            explain: '$\\lfloor\\log_2 10^6\\rfloor + 1 = 19 + 1 = 20$.',
          },
        },
        {
          predict: {
            prompt: 'How many bits are needed to give each of 50,000 tokens its own id?',
            answer: 16, compute: () => Math.floor(Math.log2(50000)) + 1,
            explain: '$\\log_2 50{,}000 \\approx 15.6$, so 16 bits ($2^{16} = 65{,}536 \\ge 50{,}000$).',
          },
        },
        {
          predict: {
            prompt: 'Binary search for 37 in the list 0, 1, …, 99: how many steps?',
            answer: binarySearch(Array.from({ length: 100 }, (_, i) => i), 37)[1], compute: () => binarySearch(Array.from({ length: 100 }, (_, i) => i), 37)[1],
            explain: `${binarySearch(Array.from({ length: 100 }, (_, i) => i), 37)[1]} steps, within the bound $\\lfloor\\log_2 100\\rfloor + 1 = 7$.`,
          },
        },
        { note: 'Halving gives $\\log_2 n$ steps: binary search needs at most $\\lfloor\\log_2 n\\rfloor + 1$. Balanced trees have depth $\\log_2 n$; $n$ takes $\\lfloor\\log_2 n\\rfloor + 1$ bits. Comparison sorting needs $\\log_2(n!) = \\Theta(n\\log n)$ comparisons: each comparison is one bit.' },
      ],
    },

    {
      id: 'floating-point', title: 'Floating-point numbers: how computers store reals',
      goal: 'Read a float as $\\pm 1.m \\times 2^e$, derive machine epsilon and the relative rounding error, explain why $0.1 + 0.2 \\ne 0.3$, and compare float32, float16 and bfloat16 for ML.',
      builds: ['big-o', 'powers'],
      blocks: [
        { md: `Lesson [[#sets]] said a \`float\` is a finite stand-in for $\\mathbb R$. Here is exactly how, and where it falls short.

**Scientific notation in binary.** A 64-bit float (IEEE 754 "double", Python's \`float\`) stores a number as
$$\\pm\\; 1.b_1b_2\\dots b_{52} \\times 2^{e}$$
1 sign bit, 11 bits for the exponent $e$ (roughly $-1022$ to $1023$), and 52 bits for the fraction after the leading 1 (the **mantissa**). It is like writing $6.022 \\times 10^{23}$ with a fixed number of significant digits, in base 2.

**Machine epsilon.** Between $1$ and $2$ (exponent 0), the representable numbers are spaced $2^{-52}$ apart: changing the last of the 52 bits. That gap, $\\varepsilon = 2^{-52} \\approx 2.2 \\times 10^{-16}$, is **machine epsilon**. Between $2^e$ and $2^{e+1}$ the spacing is $2^{e-52}$: always about $\\varepsilon$ **relative** to the number. Rounding to the nearest float therefore has relative error at most $\\varepsilon/2$: about 16 significant decimal digits, wherever the number is.

**Why $0.1 + 0.2 \\ne 0.3$.** In binary, $\\frac1{10} = 0.0001100110011\\ldots_2$ repeats forever, exactly as $\\frac13 = 0.333\\ldots$ does in decimal. So $0.1$ is stored rounded, so is $0.2$, and their sum rounds to a float just above the one nearest $0.3$: \`0.30000000000000004\`. **Never compare floats with \`==\`**; compare with a tolerance (this lab's tests use relative tolerances throughout).

**Limits.** The largest double is about $1.8 \\times 10^{308}$; beyond it, **overflow** to \`inf\` ($e^{710}$ does this). Below about $2.2 \\times 10^{-308}$ numbers lose precision and then **underflow** to 0 (lesson [[#logarithms]]'s product of many small probabilities).

**Formats in ML** trade digits for speed and memory:

| format | bits | mantissa bits | $\\varepsilon$ | largest |
|---|---|---|---|---|
| float64 | 64 | 52 | $2.2 \\times 10^{-16}$ | $1.8 \\times 10^{308}$ |
| float32 | 32 | 23 | $1.2 \\times 10^{-7}$ | $3.4 \\times 10^{38}$ |
| float16 | 16 | 10 | $9.8 \\times 10^{-4}$ | $65{,}504$ |
| bfloat16 | 16 | 7 | $7.8 \\times 10^{-3}$ | $3.4 \\times 10^{38}$ |

float16's tiny range overflows easily (a logit of 12 has $e^{12} > 65{,}504$!), so it needs "loss scaling" tricks. **bfloat16** keeps float32's 8 exponent bits (same range) and gives up precision, which neural networks tolerate well: that is why most large models train in it.` },
        { figure: 'FloatLineFig', caption: 'The representable numbers near a chosen value, for a toy format with only 3 mantissa bits: they are evenly spaced within each power of 2, and the spacing doubles at each power. Real formats are the same with far more bits.' },
        {
          code: {
            file: 'algorithms.py', fn: 'machine_epsilon', notes: [
              ['def machine_epsilon():', ['Find $\\varepsilon$ by experiment.']],
              ['e = 1.0', ['Start big.']],
              ['while 1.0 + e / 2 > 1.0:', ['While adding half of $e$ to 1 still changes it…']],
              ['e /= 2', ['…halve $e$.']],
              ['return e', ['The smallest power of 2 that still changes 1 when added: $2^{-52}$.'], { tex: '\\varepsilon = 2^{-52}' }],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'float_parts', notes: [
              ['def float_parts(x):', ['A float.']],
              ['m, e = math.frexp(x)', ['Python splits it as $m \\times 2^e$ with $\\frac12 \\le |m| < 1$ (the same idea as $1.b_1b_2\\dots \\times 2^{e-1}$).']],
              ['return m, e', ['Mantissa and exponent.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is machine epsilon for 64-bit floats? (scientific notation, like 2.2e-16)',
            answer: machineEpsilon(), tolerance: 1e-18, compute: () => machineEpsilon(),
            explain: '$2^{-52} \\approx 2.220 \\times 10^{-16}$.',
          },
        },
        {
          predict: {
            prompt: 'In float16 (10 mantissa bits), what is the gap between 1024 and the next representable number?',
            answer: 1, compute: () => 2 ** (10 - 10),
            explain: '$1024 = 2^{10}$, and the spacing there is $2^{10 - 10} = 1$: float16 can\'t even store 1024.5.',
          },
        },
        { note: 'A float is $\\pm1.m \\times 2^e$. Machine epsilon $2^{-52}$ (float64): relative spacing, so rounding error $\\le \\varepsilon/2$ anywhere. 0.1 has no exact binary form; compare with tolerances. float16 overflows past 65,504; bfloat16 keeps float32\'s range with less precision.' },
      ],
    },

    {
      id: 'stability', title: 'Numerical stability: cancellation and log-sum-exp',
      goal: 'Recognise catastrophic cancellation, derive the stable log-sum-exp and log-softmax, and know the standard safe forms ML code uses.',
      builds: ['floating-point', 'variance'],
      blocks: [
        { md: `A formula can be exactly right in algebra and badly wrong in floats. Two kinds of trouble cause almost all of it.

**1. Catastrophic cancellation.** Subtracting two nearly equal numbers keeps only their **difference**, but their rounding errors (each about $\\varepsilon$ relative to the big numbers) survive in full. Example: variance by the "shortcut" $\\mathbb E[x^2] - (\\mathbb E[x])^2$ (lesson [[#variance]]). For $10^9 + 1$, $10^9 + 2$, $10^9 + 3$: $\\mathbb E[x^2] \\approx 10^{18}$, and its rounding error alone is about $10^{18} \\times 10^{-16} = 100$, far bigger than the true variance $\\frac23$. The shortcut returns garbage (here, 0). The two-pass formula, subtracting the mean **first**, has no such cancellation. Rule: **subtract before you square.**

**2. Overflow and underflow in exponentials.** Softmax needs $\\sum_j e^{z_j}$; with a logit of 1000, $e^{1000}$ overflows to \`inf\` and the answer becomes \`nan\`. The fix is exact algebra. Pull out the largest score $m = \\max_j z_j$:

$$\\log\\sum_j e^{z_j} = \\log\\Big(e^{m}\\sum_j e^{z_j - m}\\Big) = m + \\log\\sum_j e^{z_j - m}$$

Now every exponent is $\\le 0$, so each term is at most 1 (no overflow), and the largest term is exactly 1 (so the sum is at least 1: no underflow to $\\log 0$). This is the **log-sum-exp** trick. The softmax, $p_k = e^{z_k}/\\sum_j e^{z_j}$, which turns scores into probabilities in every classifier (lesson [[#softmax]]), is computed the same way: subtract the largest score first.

**Log-softmax.** The loss needs $\\log p_c = z_c - \\log\\sum_j e^{z_j} = z_c - \\text{LSE}(\\mathbf z)$. Computing it this way never forms a tiny $p_c$ and then takes its log (which can give $\\log 0 = -\\infty$). That is why frameworks offer a fused "cross-entropy from logits" instead of softmax followed by log.

**Other standard safe forms.**
- $\\log(1 + x)$ for tiny $x$: \`log1p(x)\` (computing $1 + x$ first rounds away $x$'s digits).
- $e^x - 1$ for tiny $x$: \`expm1(x)\`.
- Sigmoid: $\\frac{1}{1 + e^{-z}}$ for $z \\ge 0$ but $\\frac{e^{z}}{1 + e^{z}}$ for $z < 0$, so the exponent is never large and positive.
- Summing millions of floats: add small ones first, or use compensated (Kahan) summation, which Python's \`sum\` does since 3.12 (one reason this lab compares Python and JavaScript to $10^{-12}$, not exactly).` },
        { figure: 'StabilityFig', caption: 'Push the scores up: the naive log-sum-exp overflows to infinity while the stable one is unbothered. Below, move the data far from zero: the one-pass variance collapses, the two-pass one doesn\'t.' },
        {
          code: {
            file: 'algorithms.py', fn: 'naive_logsumexp', notes: [
              ['def naive_logsumexp(zs):', ['The formula as written.']],
              ['try:', ['Python raises an error when `exp` overflows…']],
              ['return math.log(sum(math.exp(z) for z in zs))', ['…$\\log\\sum e^{z}$ directly.']],
              ['except OverflowError:', ['…so catch it…']],
              ['return math.inf', ['…and report infinity, as NumPy or PyTorch would.']],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'logsumexp', notes: [
              ['def logsumexp(zs):', ['Scores.']],
              ['m = max(zs)', ['The largest.']],
              ['return m + math.log(sum(math.exp(z - m) for z in zs))', ['Every exponent $\\le 0$; the sum lies in $[1, n]$.'], { tex: '\\log\\sum_j e^{z_j} = m + \\log\\sum_j e^{z_j - m}' }],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'one_pass_variance', notes: [
              ['def one_pass_variance(xs):', ['The shortcut formula.']],
              ['n = len(xs)', ['Count.']],
              ['s = sum(xs)', ['$\\sum x$.']],
              ['s2 = sum(x * x for x in xs)', ['$\\sum x^2$: huge when the values are big.']],
              ['return s2 / n - (s / n) ** 2', ['A difference of two nearly equal huge numbers: catastrophic cancellation.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is $\\log(e^{1000} + e^{1001})$, computed stably? (4 decimals)',
            answer: logsumexp([1000, 1001]), tolerance: 0.00006, compute: () => logsumexp([1000, 1001]),
            explain: '$1001 + \\log(e^{-1} + 1) = 1001.3133$, while the naive formula gives infinity.',
          },
        },
        {
          predict: {
            prompt: 'The one-pass variance of $10^9 + 1$, $10^9 + 2$, $10^9 + 3$: what does it return? (The true value is $\\frac23$.)',
            answer: onePassVariance([1e9 + 1, 1e9 + 2, 1e9 + 3]), tolerance: 1e-9, compute: () => onePassVariance([1e9 + 1, 1e9 + 2, 1e9 + 3]),
            explain: `${onePassVariance([1e9 + 1, 1e9 + 2, 1e9 + 3])}: every significant digit cancelled away.`,
          },
        },
        { note: 'Cancellation: subtracting near-equal numbers exposes their rounding error; subtract before squaring. Log-sum-exp: $m + \\log\\sum e^{z - m}$. Log-softmax $= z_c - \\text{LSE}$. Use log1p, expm1, the two-branch sigmoid, and fused cross-entropy from logits.' },
      ],
    },

    {
      id: 'random-numbers', title: 'Pseudo-random numbers and seeds',
      goal: 'Explain how deterministic generators imitate randomness, build a linear congruential generator, and use seeds for reproducible experiments.',
      builds: ['floating-point', 'common-distributions', 'piecewise'],
      blocks: [
        { md: `Monte Carlo, SGD's shuffles, dropout, weight initialisation and sampling from a language model all need random numbers. A computer is deterministic, so it fakes them: a **pseudo-random number generator** (PRNG) is a rule that produces a long sequence of numbers which **look** random (pass statistical tests) but are completely determined by a starting value, the **seed**.

**The simplest: a linear congruential generator.**
$$x_{k+1} = (a\\,x_k + c) \\bmod m, \\qquad u_k = x_k / m$$
(mod from lesson [[#piecewise]]). Each $u_k$ is in $[0, 1)$. With well-chosen $a$, $c$ and $m$ the sequence cycles through all $m$ possible states before repeating (its **period**), and the $u_k$ spread evenly. Weaknesses: the period is at most $m$, and consecutive values have hidden structure (plot pairs $(u_k, u_{k+1})$ and they fall on a few lines). Fine for games, bad for serious simulation.

**What Python uses.** The **Mersenne Twister**, with a period of $2^{19937} - 1$ and no structure visible in up to 623 dimensions. This whole lab reproduces Python's draws exactly in JavaScript by running the same algorithm with the same seeds. Every other distribution is then built from uniforms: lesson [[#common-distributions]]'s inverse transform, or special methods for the normal.

**Seeds and reproducibility.** Same seed, same sequence, same experiment: that is how a bug or a result can be reproduced exactly. Practical rules:
- Record the seed of every run, and report results over **several** seeds: a "better" model that only wins on one seed may just be lucky (lesson [[#hypothesis-tests]]).
- Give each worker or data-loader process its own seed, derived from the main one, or they will produce **identical** "random" batches.
- Don't use a PRNG like these for passwords or keys: their future is predictable from their past. Cryptography uses generators designed to resist that.
- GPU code can still be non-deterministic despite seeds (parallel sums add in varying orders, lesson [[#stability]]).` },
        { figure: 'PRNGFig', caption: 'A small linear congruential generator. Its outputs look random one at a time, but plot each against the next and they fall on a few straight lines. Python\'s Mersenne Twister shows no such pattern.' },
        {
          code: {
            file: 'algorithms.py', fn: 'lcg', notes: [
              ['def lcg(seed, n, a=1103515245, c=12345, m=2 ** 31):', ['The constants of a classic C-library generator.']],
              ['x = seed', ['The state starts at the seed.']],
              ['out = []', ['The numbers produced.']],
              ['for _ in range(n):', ['Each draw…']],
              ['x = (a * x + c) % m', ['…advance the state (Python\'s integers are exact however big $ax$ gets).'], { tex: 'x_{k+1} = (ax_k + c)\\bmod m' }],
              ['out.append(x / m)', ['…and scale it to $[0, 1)$.']],
              ['return out', ['A reproducible "random" sequence.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'With seed 1, what is the generator\'s first number? (4 decimals)',
            answer: lcg(1, 1)[0], tolerance: 0.00006, compute: () => lcg(1, 1)[0],
            explain: `$(1103515245 + 12345) \\bmod 2^{31} = ${Number((1103515245n + 12345n) % (2n ** 31n))}$, divided by $2^{31}$: ${f(lcg(1, 1)[0])}. Run it again tomorrow and you get the same.`,
          },
        },
        {
          predict: {
            prompt: 'Average the first 10,000 numbers from seed 7. (2 decimals; a uniform\'s mean is 0.5)',
            answer: lcg(7, 10000).reduce((s, v) => s + v, 0) / 10000, tolerance: 0.006, compute: () => lcg(7, 10000).reduce((s, v) => s + v, 0) / 10000,
            explain: 'Close to 0.5: one-number-at-a-time statistics look fine. The flaws only show in patterns between numbers.',
          },
        },
        { note: 'A PRNG is a deterministic rule whose outputs pass for random; the seed fixes the whole sequence. LCG: $x \\leftarrow (ax + c)\\bmod m$, simple but structured. Python uses the Mersenne Twister. Record seeds, report several, give workers distinct seeds.' },
      ],
    },

    {
      id: 'autodiff', title: 'Automatic differentiation: how backprop is computed',
      goal: 'Contrast symbolic, numerical and automatic differentiation, carry derivatives forward with dual numbers, send them backward through a recorded graph, and explain why reverse mode gives every gradient for about the price of one forward pass.',
      builds: ['multivariable-chain', 'floating-point', 'product-quotient'],
      blocks: [
        { md: `Training needs the gradient of the loss with respect to millions of parameters, at every step. There are three ways to get derivatives:

- **By hand (symbolic):** derive formulas, as this lab has done. Exact, but someone must redo it for every new model, and the formulas can blow up in size.
- **Numerically:** nudge each input and measure (lesson [[#derivative]]). Easy, but it needs one extra evaluation **per parameter**, a billion forward passes for a billion parameters, and dividing by a tiny $h$ magnifies rounding (lesson [[#floating-point]]).
- **Automatically:** let the program apply the chain rule to each elementary operation (add, multiply, exp, …) **as it computes**. Exact to rounding, and cheap. This is what PyTorch and JAX do.

**The computation graph.** Every value computed is a node; it remembers which values it came from and its **local derivative** with respect to each: for $c = a \\cdot b$, $\\frac{\\partial c}{\\partial a} = b$ and $\\frac{\\partial c}{\\partial b} = a$; for $c = a + b$, both are 1; for $c = e^a$, it is $e^a$.

**Forward mode: dual numbers.** Carry each value together with its derivative with respect to **one** chosen input: a pair $(v, \\dot v)$, written $v + \\dot v\\,\\varepsilon$ with the rule $\\varepsilon^2 = 0$. Then
$$(a + \\dot a\\varepsilon)(b + \\dot b\\varepsilon) = ab + (\\dot ab + a\\dot b)\\varepsilon + \\dot a\\dot b\\,\\varepsilon^2 = ab + (\\dot ab + a\\dot b)\\varepsilon$$
The product rule (lesson [[#product-quotient]]) falls out of ordinary multiplication. Start the chosen input with $\\dot x = 1$, the rest with 0, run the program, and the output carries its derivative. Cost: one run per input direction. Great for few inputs, hopeless for a million.

**Reverse mode: backpropagation.** Run the program forward, **recording** the graph. Then go backward from the output. Give the output gradient 1; for each node, in reverse order of computation, pass its gradient to each parent multiplied by the local derivative, and **add** into the parent's gradient (lesson [[#multivariable-chain]]: sum over paths, so a value used twice collects from both uses). One backward pass gives $\\frac{\\partial\\,\\text{output}}{\\partial x}$ for **every** input $x$ at once.

**Why reverse mode wins for training.** A loss is one number depending on many parameters. Reverse mode costs a small constant times the forward pass (each operation does a fixed amount of extra work backward) no matter how many parameters there are. Forward mode would need one pass per parameter. The price: every intermediate value must be **stored** for the backward pass, which is why activation memory, not weights, often limits batch size (and why "gradient checkpointing" recomputes some instead of storing them).` },
        { figure: 'AutodiffFig', caption: 'The graph of $y = x^2 + e^x$. Forward: values flow up. Backward: gradients flow down, each multiplied by a local derivative and added where paths meet. Step through either pass.' },
        {
          code: {
            file: 'algorithms.py', fn: 'Value.__init__', notes: [
              ['def __init__(self, data, parents=(), local_grads=()):', ['A number, the Values it was computed from, and the local derivative with respect to each.']],
              ['self.data = data', ['Its value.']],
              ['self.grad = 0.0', ['$\\frac{\\partial\\,\\text{output}}{\\partial\\,\\text{this}}$, filled in by `backward`.']],
              ['self.parents = parents', ['Where it came from: the graph\'s edges.']],
              ['self.local_grads = local_grads', ['How it changes with each parent.']],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'Value.__add__', notes: [
              ['def __add__(self, other):', ['`a + b` calls this.']],
              ['other = other if isinstance(other, Value) else Value(other)', ['Plain numbers become constant Values.']],
              ['return Value(self.data + other.data, (self, other), (1.0, 1.0))', ['The sum, remembering both parents; each has local derivative 1.']],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'Value.__mul__', notes: [
              ['def __mul__(self, other):', ['`a * b` calls this.']],
              ['other = other if isinstance(other, Value) else Value(other)', ['Wrap numbers.']],
              ['return Value(self.data * other.data, (self, other), (other.data, self.data))', ['$\\partial(ab)/\\partial a = b$ and $\\partial(ab)/\\partial b = a$.']],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'Value.exp', notes: [
              ['def exp(self):', ['$e^{x}$.']],
              ['e = math.exp(self.data)', ['Its value…']],
              ['return Value(e, (self,), (e,))', ['…and its local derivative, also $e^{x}$.']],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'Value.backward', notes: [
              ['def backward(self):', ['Call on the output: fills in every `.grad` it depends on.']],
              ['order, seen = [], set()', ['A list of nodes with every parent before its children, and a record of visited nodes.']],
              ['def visit(v):', ['Depth-first search through the graph…']],
              ['if id(v) not in seen:', ['…visiting each node once…']],
              ['seen.add(id(v))', ['…marking it…']],
              ['for p in v.parents:', ['…placing its parents first…']],
              ['visit(p)', ['…recursively…']],
              ['order.append(v)', ['…then the node itself (a "topological order").']],
              ['visit(self)', ['Build the order from the output.']],
              ['self.grad = 1.0', ['$\\partial\\,\\text{output}/\\partial\\,\\text{output} = 1$.']],
              ['for v in reversed(order):', ['Children before parents: every node\'s gradient is complete before it is passed on.']],
              ['for p, g in zip(v.parents, v.local_grads):', ['Each parent and its local derivative…']],
              ['p.grad += v.grad * g', ['…receives the chain-rule product, **added** to what other paths already sent.'], { tex: '\\bar p \\mathrel{+}= \\bar v\\,\\frac{\\partial v}{\\partial p}' }],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'Dual.__init__', notes: [
              ['def __init__(self, value, slope=0.0):', ['$v + \\dot v\\varepsilon$.']],
              ['self.value = value', ['$v$.']],
              ['self.slope = slope', ['$\\dot v$: the derivative carried along.']],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'Dual.__add__', notes: [
              ['def __add__(self, other):', ['Adding dual numbers.']],
              ['other = other if isinstance(other, Dual) else Dual(other)', ['A plain number has slope 0.']],
              ['return Dual(self.value + other.value, self.slope + other.slope)', ['Values add, slopes add (the sum rule).']],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'Dual.__mul__', notes: [
              ['def __mul__(self, other):', ['Multiplying dual numbers.']],
              ['other = other if isinstance(other, Dual) else Dual(other)', ['Wrap numbers.']],
              ['return Dual(self.value * other.value, self.slope * other.value + self.value * other.slope)', ['$\\varepsilon^2 = 0$ leaves exactly the product rule.'], { tex: '(a + \\dot a\\varepsilon)(b + \\dot b\\varepsilon) = ab + (\\dot ab + a\\dot b)\\varepsilon' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'Reverse mode on $y = x^2 + e^x$ at $x = 2$: what is $x$\'s gradient? (4 decimals)',
            answer: 4 + Math.exp(2), tolerance: 0.00006, compute: () => { const x = new Value(2); const y = x.mul(x).add(x.exp()); y.backward(); return x.grad },
            explain: `$2x + e^x = 4 + e^2 = ${f(4 + Math.exp(2))}$. Note $x$ is used three times; its gradient collects from every use.`,
          },
        },
        {
          predict: {
            prompt: 'A model has $10^6$ parameters. How many backward passes does reverse mode need for the full gradient of the loss?',
            answer: 1, compute: () => 1,
            explain: 'One. Forward mode would need $10^6$ passes, one per parameter; numerical differences about as many.',
          },
        },
        { note: 'Autodiff applies the chain rule to elementary operations as they run. Forward mode (dual numbers, $\\varepsilon^2 = 0$): one pass per input. Reverse mode (backprop): record the graph, send gradients backward, add over paths: every input\'s gradient in one pass, at the cost of storing intermediates.' },
      ],
    },

    {
      id: 'dynamic-programming', title: 'Dynamic programming: reuse the answers to subproblems',
      goal: 'Recognise overlapping subproblems and optimal substructure, solve edit distance with a table, decode a hidden Markov model with Viterbi, and connect it to Bellman\'s equation in reinforcement learning.',
      builds: ['recurrences', 'markov-chains', 'logarithms'],
      blocks: [
        { md: `Some problems break into subproblems that **overlap**: the same smaller question comes up again and again. Solving each subproblem **once** and storing its answer in a table turns exponential work into polynomial. That is **dynamic programming** (DP). It needs **optimal substructure**: the best answer is built from best answers to subproblems (**Bellman's principle of optimality**: a best path's remaining part is itself a best path from where it is).

**Edit distance.** How many single-character insertions, deletions and substitutions turn one word into another ("kitten" → "sitting": 3)? Let $D(i, j)$ be the distance between the first $i$ letters of $a$ and the first $j$ of $b$. The last step of the best edit is one of three moves, so
$$D(i, j) = \\min\\begin{cases} D(i-1, j) + 1 & \\text{delete } a_i \\\\ D(i, j-1) + 1 & \\text{insert } b_j \\\\ D(i-1, j-1) + \\mathbb 1[a_i \\ne b_j] & \\text{match or substitute}\\end{cases}$$
with $D(i, 0) = i$ and $D(0, j) = j$. Trying every edit sequence is exponential; filling the $(|a| + 1)\\times(|b| + 1)$ table row by row is $O(|a||b|)$. Used in spelling correction, DNA alignment, and evaluating speech recognisers (word error rate).

**Viterbi: the best hidden path.** A **hidden Markov model** has hidden states that follow a Markov chain (lesson [[#markov-chains]]), each emitting an observation with some probability. Given the observations, what hidden sequence was most likely? There are (states)$^T$ sequences. But the best path to state $s$ at time $t$ must extend the best path to **some** state at $t - 1$: let $V_t(s)$ = log-probability of the best path ending in $s$ at $t$; then
$$V_t(s) = \\max_r\\big[V_{t-1}(r) + \\log P(r \\to s)\\big] + \\log P(\\text{obs}_t \\mid s)$$
Fill it forward ($O(T \\cdot \\text{states}^2)$), remember which $r$ won, and trace back. Logs turn products of many small probabilities into sums (lesson [[#logarithms]]) so nothing underflows. Speech recognition, part-of-speech tagging and beam-search decoding descend from this.

**Bellman's equation in RL** is the same principle: the value of a state is the best immediate reward plus the (discounted) value of where you land, $V(s) = \\max_a\\big[r(s, a) + \\gamma\\,\\mathbb E\\,V(s')\\big]$. Value iteration (QMaze Lab) fills that table repeatedly until it stops changing.` },
        { figure: 'EditDistanceFig', caption: 'The edit-distance table being filled, cell by cell. Each cell takes the cheapest of three neighbours; the highlighted path traced back from the corner is the cheapest edit.' },
        {
          code: {
            file: 'algorithms.py', fn: 'edit_distance', notes: [
              ['def edit_distance(a, b):', ['Two strings.']],
              ['D = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]', ['The table: $D[i][j]$ for prefixes of length $i$ and $j$.']],
              ['for i in range(len(a) + 1):', ['First column:']],
              ['D[i][0] = i', ['turning $i$ letters into nothing takes $i$ deletions.']],
              ['for j in range(len(b) + 1):', ['First row:']],
              ['D[0][j] = j', ['$j$ insertions.']],
              ['for i in range(1, len(a) + 1):', ['Fill row by row…']],
              ['for j in range(1, len(b) + 1):', ['…each cell after its left, upper and upper-left neighbours.']],
              ['cost = 0 if a[i - 1] == b[j - 1] else 1', ['$\\mathbb 1[a_i \\ne b_j]$ (Python counts from 0).']],
              ['D[i][j] = min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + cost)', ['The cheapest last move, built on stored answers.'], { tex: 'D(i,j) = \\min\\{D(i{-}1,j){+}1,\; D(i,j{-}1){+}1,\; D(i{-}1,j{-}1){+}\\mathbb 1[a_i \\ne b_j]\\}' }],
              ['return D[len(a)][len(b)]', ['The whole words.']],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'viterbi', notes: [
              ['def viterbi(observations, start, trans, emit):', ['Observations, the start distribution, transition and emission probabilities.']],
              ['n = len(start)', ['Number of hidden states.']],
              ['best = [math.log(start[s]) + math.log(emit[s][observations[0]]) for s in range(n)]', ['$V_1(s)$: start in $s$ and emit the first observation, in logs.']],
              ['back = []', ['For each time, which previous state won.']],
              ['for o in observations[1:]:', ['Each later observation.']],
              ['step, choice = [], []', ['This time step\'s values and winners.']],
              ['for s in range(n):', ['For each state now…']],
              ['prev = max(range(n), key=lambda r: best[r] + math.log(trans[r][s]))', ['…the best state to have come from.']],
              ['step.append(best[prev] + math.log(trans[prev][s]) + math.log(emit[s][o]))', ['$V_t(s)$ by the recurrence.']],
              ['choice.append(prev)', ['Remember the winner.']],
              ['best, back = step, back + [choice]', ['Move on.']],
              ['state = max(range(n), key=lambda s: best[s])', ['The best final state…']],
              ['path = [state]', ['…starts the path.']],
              ['for choice in reversed(back):', ['Walk the winners backward…']],
              ['state = choice[state]', ['…to the previous state…']],
              ['path.append(state)', ['…recording each.']],
              ['return path[::-1]', ['Reversed: first to last.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is the edit distance from "flaw" to "lawn"?',
            answer: editDistance('flaw', 'lawn'), compute: () => editDistance('flaw', 'lawn'),
            explain: 'Delete the f, append an n: 2.',
          },
        },
        {
          predict: {
            prompt: 'An HMM with 2 states (start $(0.6, 0.4)$, staying probabilities 0.7 and 0.6, emission 0 likely from state 0 and 1 likely from state 1) sees observations $0, 1, 1, 0$. Viterbi\'s path, read as a binary number (e.g. path 0,1,1,0 → 6)?',
            answer: parseInt(viterbi([0, 1, 1, 0], [0.6, 0.4], [[0.7, 0.3], [0.4, 0.6]], [[0.9, 0.1], [0.2, 0.8]]).join(''), 2),
            compute: () => parseInt(viterbi([0, 1, 1, 0], [0.6, 0.4], [[0.7, 0.3], [0.4, 0.6]], [[0.9, 0.1], [0.2, 0.8]]).join(''), 2),
            explain: `The path is ${viterbi([0, 1, 1, 0], [0.6, 0.4], [[0.7, 0.3], [0.4, 0.6]], [[0.9, 0.1], [0.2, 0.8]]).join(', ')}: the hidden states follow the observations here, because the emissions are strong.`,
          },
        },
        { note: 'Dynamic programming: overlapping subproblems + optimal substructure (Bellman\'s principle); fill a table once. Edit distance: $O(|a||b|)$. Viterbi: $V_t(s) = \\max_r[V_{t-1}(r) + \\log P(r\\to s)] + \\log P(o_t\\mid s)$, then trace back. Bellman\'s equation in RL is the same idea.' },
      ],
    },

    {
      id: 'graphs', title: 'Graphs: adjacency matrices, walks, PageRank and GNNs',
      goal: 'Represent a graph by its adjacency matrix, prove $(A^k)_{ij}$ counts walks of length $k$, compute PageRank as a stationary distribution, and read a graph neural network layer as averaging over neighbours.',
      builds: ['markov-chains', 'matrix-multiplication', 'induction'],
      blocks: [
        { md: `A **graph** is a set of **nodes** joined by **edges**: users and friendships, atoms and bonds, web pages and links, tokens and attention. ML increasingly learns on graphs directly.

**The adjacency matrix.** Number the nodes; set $A_{ij} = 1$ if there is an edge from $i$ to $j$, else 0. For an undirected graph $A$ is symmetric (lesson [[#transpose]]). A node's **degree** is its row sum: how many neighbours it has.

**Walks are matrix powers.** Claim: $(A^k)_{ij}$ is the number of walks of exactly $k$ steps from $i$ to $j$. Induction (lesson [[#induction]]): for $k = 1$ it is the definition. If it holds for $k$, then every walk of $k + 1$ steps from $i$ to $j$ is a $k$-step walk from $i$ to some node $m$ followed by one edge $m \\to j$, so their number is $\\sum_m (A^k)_{im}A_{mj} = (A^{k+1})_{ij}$, exactly the matrix product (lesson [[#matrix-multiplication]]). $\\blacksquare$ Matrix algebra counts paths for you.

**PageRank.** Model a surfer who, at each step, follows a random outgoing link with probability $d$ (about 0.85) or jumps to a random page otherwise. That is a Markov chain (lesson [[#markov-chains]]): its transition matrix sends probability $d/\\text{outdegree}$ along each link plus $(1 - d)/n$ to every page. A page's **PageRank** is its share of the **stationary distribution**: how much of the time the surfer spends there. Pages linked from important pages become important. The random jump makes every page reachable, which guarantees a unique stationary distribution; power iteration (repeat $\\boldsymbol\\pi \\leftarrow \\boldsymbol\\pi P$) finds it.

**Graph neural networks** pass messages along edges. The simplest layer: every node averages its own features with its neighbours', then applies a learned weight matrix and an activation:
$$H' = \\sigma\\big(\\tilde D^{-1}\\tilde A\\,H\\,W\\big), \\qquad \\tilde A = A + I$$
($\\tilde D$ is the diagonal matrix of row sums of $\\tilde A$, so $\\tilde D^{-1}\\tilde A$ averages.) Stack $k$ layers and each node's features depend on its $k$-step neighbourhood: walks again. Attention is a graph network on the **complete** graph, with learned edge weights.` },
        { figure: 'GraphFig', caption: 'A small directed graph. Pick $k$: the matrix $A^k$ counts $k$-step walks between every pair. Run the random surfer: PageRank settles on the pages the links point to most.' },
        {
          code: {
            file: 'algorithms.py', fn: 'walks', notes: [
              ['def walks(A, k):', ['An adjacency matrix and a walk length.']],
              ['n = len(A)', ['Number of nodes.']],
              ['P = [[1 if i == j else 0 for j in range(n)] for i in range(n)]', ['$A^0 = I$: one walk of length 0 from each node to itself.']],
              ['for _ in range(k):', ['Multiply by $A$, $k$ times.']],
              ['P = [[sum(P[i][m] * A[m][j] for m in range(n)) for j in range(n)] for i in range(n)]', ['Extend every walk by one edge $m \\to j$.'], { tex: '(A^{k+1})_{ij} = \\sum_m (A^k)_{im}A_{mj}' }],
              ['return P', ['$A^k$: walk counts.']],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'pagerank', notes: [
              ['def pagerank(A, d=0.85, iters=100):', ['Links, the follow-a-link probability, and iterations.']],
              ['n = len(A)', ['Number of pages.']],
              ['out = [sum(row) for row in A]', ['Out-degrees.']],
              ['r = [1.0 / n] * n', ['Start uniform.']],
              ['for _ in range(iters):', ['Power iteration: $\\boldsymbol\\pi \\leftarrow \\boldsymbol\\pi P$.']],
              ['r = [(1 - d) / n + d * sum(r[i] * A[i][j] / out[i] for i in range(n) if out[i]) for j in range(n)]', ['Page $j$ gets a random-jump share plus a share of each linking page\'s rank.'], { tex: 'r_j = \\frac{1-d}{n} + d\\sum_{i\\to j}\\frac{r_i}{\\text{out}_i}' }],
              ['return r', ['The stationary distribution.']],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'gnn_layer', notes: [
              ['def gnn_layer(A, H):', ['Adjacency and one feature row per node (weights and activation left out).']],
              ['n = len(A)', ['Nodes.']],
              ['out = []', ['New features.']],
              ['for i in range(n):', ['Each node…']],
              ['group = [i] + [j for j in range(n) if A[i][j]]', ['…itself and its neighbours ($\\tilde A = A + I$)…']],
              ['out.append([sum(H[j][k] for j in group) / len(group) for k in range(len(H[0]))])', ['…averaged feature by feature ($\\tilde D^{-1}\\tilde AH$).']],
              ['return out', ['One round of message passing.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'Graph with edges 1→2, 1→3, 2→1, 3→1, 3→2. How many walks of exactly 3 steps go from node 1 back to node 1?',
            answer: walks([[0, 1, 1], [1, 0, 0], [1, 1, 0]], 3)[0][0], compute: () => walks([[0, 1, 1], [1, 0, 0], [1, 1, 0]], 3)[0][0],
            explain: `$(A^3)_{11} = ${walks([[0, 1, 1], [1, 0, 0], [1, 1, 0]], 3)[0][0]}$: for example 1→3→2→1.`,
          },
        },
        {
          predict: {
            prompt: 'For the same three pages, what is page 1\'s PageRank? (4 decimals)',
            answer: pagerank([[0, 1, 1], [1, 0, 0], [1, 1, 0]])[0], tolerance: 0.00006, compute: () => pagerank([[0, 1, 1], [1, 0, 0], [1, 1, 0]])[0],
            explain: `${f(pagerank([[0, 1, 1], [1, 0, 0], [1, 1, 0]])[0])}: both other pages link to it, so the surfer spends the most time there.`,
          },
        },
        { note: 'Adjacency matrix $A_{ij} = 1$ for an edge $i \\to j$; degree = row sum. $(A^k)_{ij}$ counts $k$-step walks (induction). PageRank: the stationary distribution of a random surfer with random jumps. GNN layer: average over self and neighbours, then weights and activation.' },
      ],
    },

    {
      id: 'hashing', title: 'Hashing and randomised algorithms',
      goal: 'Explain what a hash function does, compute a polynomial hash, analyse hash-table lookups (expected bucket size $n/m$) and collisions, and use the hashing trick to embed unbounded vocabularies.',
      builds: ['pigeonhole', 'piecewise', 'expectation'],
      blocks: [
        { md: `A **hash function** turns any input (a word, an image, a file) into a number in a fixed range $\\{0, \\dots, m - 1\\}$, quickly and deterministically, in a way that **looks** random: similar inputs land in unrelated places.

**A polynomial hash.** Treat a string's characters as digits in some base $B$ (31 is common) and reduce mod $m$ as you go (lesson [[#piecewise]]):
$$h(c_1c_2\\dots c_k) = (c_1B^{k-1} + c_2B^{k-2} + \\dots + c_k) \\bmod m$$
computed left to right as $h \\leftarrow (hB + c) \\bmod m$ (Horner's rule), so the numbers never get big.

**Hash tables: lookups in $O(1)$.** Store each item in bucket $h(\\text{key})$. To find a key, compute its hash and look only in that bucket. With $n$ items in $m$ buckets and a hash that spreads them like random, the expected number of **other** items sharing a given item's bucket is $\\frac{n-1}{m}$: each of the other $n - 1$ items lands there with probability $\\frac1m$, and expectations add (lesson [[#expectation]]'s linearity, with indicators). Keep $m$ proportional to $n$ and that is a constant: lookups take $O(1)$ on average, whatever the size. Python's \`dict\` and \`set\` work this way.

**Collisions are unavoidable** (lesson [[#pigeonhole]]), and arrive early: about $\\sqrt m$ items make one likely. Tables handle them by keeping short lists in each bucket.

**In ML.**
- **The hashing trick**: to turn words into a fixed-size feature vector without storing a vocabulary, add 1 at position $h(\\text{word})$. Collisions mix a few words together; with $m$ large it barely matters, and new words need no special handling.
- **Embedding look-ups** and hashed n-gram features in fast text models.
- **Locality-sensitive hashing** deliberately makes **similar** items collide, to find near neighbours and near-duplicate documents (MinHash, used to deduplicate training data) without comparing every pair.
- **Randomised algorithms** in general trade a small, controllable chance of error for speed: random projections, sketches that count frequent items in tiny memory, random feature maps for kernels.` },
        { figure: 'HashingFig', caption: 'Words dropped into $m$ buckets by the polynomial hash. Increase the number of words: the buckets fill evenly, about $n/m$ each, with occasional collisions. Shrink $m$ to see collisions pile up.' },
        {
          code: {
            file: 'algorithms.py', fn: 'poly_hash', notes: [
              ['def poly_hash(s, m, base=31):', ['A string, the number of buckets, and the base.']],
              ['h = 0', ['Start empty.']],
              ['for ch in s:', ['Each character, left to right…']],
              ['h = (h * base + ord(ch)) % m', ['…shift one digit in base $B$ and add the character\'s code, keeping it mod $m$ (Horner\'s rule).'], { tex: 'h \\leftarrow (hB + c) \\bmod m' }],
              ['return h', ['A bucket from 0 to $m - 1$.']],
            ],
          },
        },
        {
          code: {
            file: 'algorithms.py', fn: 'hashing_trick', notes: [
              ['def hashing_trick(words, m):', ['A bag of words and a vector length.']],
              ['v = [0] * m', ['The fixed-size feature vector.']],
              ['for w in words:', ['Each word…']],
              ['v[poly_hash(w, m)] += 1', ['…counts in its hashed slot; no vocabulary needed.']],
              ['return v', ['Counts, possibly with a few words sharing a slot.']],
            ],
          },
        },
        { python: { program: 'algorithms', label: 'Run the algorithms part in real Python' } },
        {
          code: {
            file: 'algorithms.py', fn: 'show_algorithms', notes: [
              ['def show_algorithms():', ['One line per idea.']],
              ['print("growth at n = 20 (log n, n, n log n, n², 2ⁿ):", growth(20))', ['Lesson [[#big-o]].']],
              ['print("multiplications in one attention head, T = 20 tokens, d = 8:", attention_cost(20, 8))', ['Lesson [[#loop-costs]]: $2 \\times 400 \\times 8$.']],
              ['print("merge sort comparisons for 8 items in reverse:", merge_sort([8, 7, 6, 5, 4, 3, 2, 1])[1])', ['Lesson [[#recurrences]].']],
              ['print("binary search for 700 in 0..999:", binary_search(list(range(1000)), 700))', ['Lesson [[#logs-in-algorithms]].']],
              ['print("machine epsilon:", machine_epsilon(), " 0.1 + 0.2 =", 0.1 + 0.2)', ['Lesson [[#floating-point]].']],
              ['print("log-sum-exp of (1000, 1001), naive and stable:", naive_logsumexp([1000.0, 1001.0]), logsumexp([1000.0, 1001.0]))', ['Lesson [[#stability]].']],
              ['x = Value(2.0)', ['Lesson [[#autodiff]]: an input…']],
              ['y = x * x + x.exp()', ['…a computation, recorded as a graph…']],
              ['y.backward()', ['…and one backward pass.']],
              ['print("d/dx (x² + eˣ) at 2 by reverse mode:", x.grad, " by forward mode:", (Dual(2.0, 1.0) * Dual(2.0, 1.0)).slope + math.exp(2.0))', ['Both modes agree: $4 + e^2$.']],
              ['print("edit distance kitten → sitting:", edit_distance("kitten", "sitting"))', ['Lesson [[#dynamic-programming]].']],
              ['print("PageRank of a 3-page web:", pagerank([[0, 1, 1], [1, 0, 0], [1, 1, 0]]))', ['Lesson [[#graphs]].']],
            ],
          },
        },
        {
          predict: {
            prompt: 'What bucket does "cat" land in with base 31 and $m = 97$?',
            answer: polyHash('cat', 97), compute: () => polyHash('cat', 97),
            explain: `$((99 \\times 31 + 97) \\times 31 + 116) \\bmod 97 = ${polyHash('cat', 97)}$, using the character codes c = 99, a = 97, t = 116.`,
          },
        },
        {
          predict: {
            prompt: 'A table holds 10,000 keys in 20,000 buckets. On average, how many **other** keys share a given key\'s bucket? (2 decimals)',
            answer: 9999 / 20000, tolerance: 0.006, compute: () => 9999 / 20000,
            explain: '$\\frac{n - 1}{m} = 0.5$: lookups stay fast however big the table grows, as long as $m$ grows with $n$.',
          },
        },
        { note: 'Hash: any input to $\\{0..m-1\\}$, deterministic but random-looking. Polynomial hash by Horner\'s rule. Hash tables: expected $\\frac{n-1}{m}$ others per bucket, so $O(1)$ lookups. Collisions are unavoidable. Hashing trick: fixed-size features without a vocabulary.' },
      ],
    },
  ],
}
