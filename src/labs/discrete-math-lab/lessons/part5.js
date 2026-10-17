// Part 5: Number Theory & Cryptography — divisibility & primes, Euclid's GCD & Bézout, modular arithmetic,
// Chinese Remainder Theorem & Euler's totient, and full RSA cryptography.
import {
  divisorCount, divisorSum, gcd, lcm, extGcd, mod, modPow, modInverse, totient, crtSolve, rsaDemo,
} from '../engine/discrete.js'

export const PART5 = {
  id: 'number-theory',
  title: 'Part [[#part:number-theory]] · Number theory & cryptography',
  lessons: [
    {
      id: 'divisibility-primes',
      title: 'Divisibility (a | b), the Division Algorithm, and Prime Factorization',
      goal: 'Use the Division Algorithm $a = qd + r$ ($0 \\le r < d$), factor any integer into its unique prime factorization $p_1^{e_1}\\cdots p_k^{e_k}$, and count its positive divisors using $\\prod (e_i + 1)$.',
      builds: ['direct-proof', 'strong-induction', 'sum-product-rules'],
      blocks: [
        { h: 'The atoms of the integers: Why every number factors into primes in one way' },
        {
          md: `When you divide an integer $a$ by a positive divisor $d > 0$, the **Division Algorithm** guarantees there is a **unique quotient $q \\in \\mathbb{Z}$** and a **unique remainder $r \\in \\mathbb{Z}$** satisfying:

$$a = q \\cdot d + r \\qquad\\text{with } 0 \\le r < d$$

Notice the strict bounds on the remainder: **$r$ is always non-negative ($0 \\le r < d$)**, even when $a$ is negative!
For example, dividing $a = -17$ by $d = 5$: since $-17 = (-4) \\cdot 5 + 3$, the quotient is $q = -4 = \\lfloor -17/5 \\rfloor$ and the remainder is **$r = +3$** (never $-2$!).

In lesson [[#strong-induction]], we proved by strong induction that every integer $n \\ge 2$ is a product of primes. Adding uniqueness gives the **Fundamental Theorem of Arithmetic**:
> *Every integer $n \\ge 2$ can be written **uniquely** (up to the order of the factors) as a product of prime powers:*
> $$n = p_1^{e_1}\\,p_2^{e_2}\\cdots p_k^{e_k} \\qquad (p_1 < p_2 < \\dots < p_k \\text{ primes},\\; e_i \\ge 1)$$

Why isn't $1$ considered a prime number? Because if $1$ were prime, $6 = 2 \\cdot 3 = 1 \\cdot 2 \\cdot 3 = 1^2 \\cdot 2 \\cdot 3$ would have infinitely many different prime factorizations, destroying uniqueness!`,
        },
        { h: 'Counting divisors using the Product Rule on prime exponents' },
        {
          md: `Once you have the prime factorization $n = p_1^{e_1} p_2^{e_2} \\cdots p_k^{e_k}$, every positive divisor $d \\mid n$ has the exact form:
$$d = p_1^{a_1}\\,p_2^{a_2}\\cdots p_k^{a_k} \\qquad\\text{where } 0 \\le a_i \\le e_i \\text{ for each } i$$
How many choices does exponent $a_1$ have? It can be $0, 1, 2, \\dots, e_1$: that is **$e_1 + 1$ choices**!
By the Product Rule (lesson [[#sum-product-rules]]), the total number of positive divisors $\\tau(n)$ is simply:

$$\\tau(n) = (e_1 + 1)(e_2 + 1)\\cdots(e_k + 1)$$`,
        },
        {
          symbols: [
            ['a = qd + r,\\;0 \\le r < d', 'Division Algorithm', 'Quotient $q = a \\text{ div } d = \\lfloor a/d \\rfloor$, remainder $r = a \\bmod d \\in [0, d-1]$', '$-17 = (-4)\\cdot 5 + 3$: $q=-4, r=3$'],
            ['n = p_1^{e_1}p_2^{e_2}\\cdots p_k^{e_k}', 'canonical prime factorization', 'Unique decomposition of $n \\ge 2$ into prime powers', '$360 = 2^3 \\cdot 3^2 \\cdot 5^1$'],
            ['\\tau(n) = \\prod_{i=1}^k (e_i + 1)', 'number of positive divisors', 'Each prime exponent $a_i$ independently chooses from $\\{0, 1, \\dots, e_i\\}$', 'For $360 = 2^3 3^2 5^1$: $(3+1)(2+1)(1+1) = 24$ divisors'],
            ['\\sigma(n) = \\prod_{i=1}^k \\frac{p_i^{e_i+1}-1}{p_i-1}', 'sum of positive divisors', 'Product of geometric series $(1 + p_i + \\dots + p_i^{e_i})$ for each prime', 'For $12 = 2^2 \\cdot 3^1$: $(1+2+4)(1+3) = 28$'],
          ],
        },
        {
          figure: 'PrimeFactorSieveFig',
          caption: 'Factor any integer $n$ into prime powers $p_1^{e_1}\\cdots p_k^{e_k}$, see its complete lattice of $(e_1+1)\\cdots(e_k+1)$ divisors, and step through the Sieve of Eratosthenes.',
        },
        {
          worked: {
            title: 'Finding the number and sum of all positive divisors of $n = 72$',
            steps: [
              ['1. Prime factorize', '$72 = 8 \\times 9 = 2^3 \\cdot 3^2$', 'Exponents are $e_1 = 3$ and $e_2 = 2$'],
              ['2. Count divisors $\\tau(72)$', '$(3 + 1)(2 + 1) = 4 \\times 3 = 12$ divisors', 'Choices $a_1 \\in \\{0,1,2,3\\}$ and $a_2 \\in \\{0,1,2\\}$'],
              ['3. Sum divisors $\\sigma(72)$', '$(1 + 2 + 4 + 8)(1 + 3 + 9) = 15 \\times 13 = 195$', 'Expanding the product produces all 12 divisors added together!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'How many positive divisors does $n = 360 = 2^3 \\cdot 3^2 \\cdot 5^1$ have?',
            answer: divisorCount(360),
            compute: () => divisorCount(360),
            explain: 'Add $1$ to each prime exponent and multiply: $(3 + 1)(2 + 1)(1 + 1) = 4 \\times 3 \\times 2 = 24$ positive divisors.',
          },
        },
        {
          predict: {
            prompt: 'In the Division Algorithm $a = qd + r$ with $0 \\le r < d$, what is the non-negative remainder $r = (-23) \\bmod 6$ when $a = -23$ is divided by $d = 6$?',
            answer: mod(-23, 6),
            compute: () => mod(-23, 6),
            explain: 'The largest multiple of $6$ at or below $-23$ is $-24 = (-4) \\times 6$. So $-23 = (-4) \\times 6 + 1$, giving quotient $q = -4$ and remainder **$r = 1$**.',
            misconceptions: [
              { answer: -5, feedback: 'In number theory, the remainder $r$ must satisfy $0 \\le r < d$. Drop down one more multiple to $-24 = (-4)\\times 6$ so $r = -23 - (-24) = +1$!' },
              { answer: 5, feedback: '$-23 \\equiv +1 \\pmod 6$ because $-23 - (-24) = 1$ (whereas $+23 \\bmod 6 = 5$).' },
            ],
          },
        },
        {
          predict: {
            prompt: 'What is the **sum** of all positive divisors $\\sigma(28)$ of $n = 28 = 2^2 \\cdot 7^1$? (Notice that $\\sigma(28) - 28 = 28$, making $28$ a **perfect number**!)',
            answer: divisorSum(28),
            compute: () => divisorSum(28),
            explain: '$\\sigma(28) = (1 + 2 + 4)(1 + 7) = 7 \\times 8 = 56$ (and $1 + 2 + 4 + 7 + 14 + 28 = 56$).',
          },
        },
        {
          choice: {
            prompt: 'Which integers $n \\ge 1$ have an **odd** number of positive divisors $\\tau(n)$?',
            options: [
              { text: 'Exactly the **perfect squares** ($1, 4, 9, 16, 25, \\dots$), because $\\tau(n) = (e_1 + 1)\\cdots(e_k + 1)$ is odd if and only if every factor $(e_i + 1)$ is odd, meaning every prime exponent $e_i$ is **even**!', why: 'Yes! You can also see this by pairing each divisor $d$ with $n/d$: the pairs have size 2 unless $d = n/d$, which happens if and only if $d = \\sqrt{n}$ is an integer!' },
              { text: 'Prime numbers', why: 'Every prime $p = p^1$ has $(1 + 1) = 2$ divisors ($1$ and $p$), which is even!' },
              { text: 'Odd integers', why: 'An odd integer like $15 = 3^1 \\cdot 5^1$ has $(1+1)(1+1) = 4$ divisors (even).' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'How do prime exponents immediately give $\\gcd(a, b)$ and $\\operatorname{lcm}(a, b)$ for $a = \\prod p_i^{a_i}$ and $b = \\prod p_i^{b_i}$?',
            options: [
              { text: '$\\gcd(a, b) = \\prod p_i^{\\min(a_i, b_i)}$ and $\\operatorname{lcm}(a, b) = \\prod p_i^{\\max(a_i, b_i)}$, and since $\\min(x,y) + \\max(x,y) = x + y$, we always have $\\gcd(a, b) \\cdot \\operatorname{lcm}(a, b) = a \\cdot b$!', why: 'Yes! Taking $\\min$ of exponents is like set intersection ($\\cap$), and taking $\\max$ is like set union ($\\cup$).' },
              { text: '$\\gcd$ takes $\\max(a_i, b_i)$ because "greatest" means maximum', why: 'A common divisor must divide *both* $a$ and $b$, so its prime exponent cannot exceed $\\min(a_i, b_i)$!' },
              { text: 'You have to add the exponents $a_i + b_i$ for $\\operatorname{lcm}$', why: 'Adding exponents multiplies $a \\cdot b$; the least common multiple only needs $\\max(a_i, b_i)$ of each prime.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'Every integer $n \\ge 2$ has a unique prime factorization $n = \\prod p_i^{e_i}$, giving $\\tau(n) = \\prod (e_i + 1)$ divisors. Remember that $\\gcd(a, b) \\cdot \\operatorname{lcm}(a, b) = ab$.',
        },
      ],
    },

    {
      id: 'gcd-bezout',
      title: 'Greatest common divisor, Euclid’s algorithm, and Bézout’s identity',
      goal: 'Compute $\\gcd(a, b)$ in logarithmic time using the Euclidean algorithm $\\gcd(a, b) = \\gcd(b, a \\bmod b)$, find Bézout coefficients $ax + by = \\gcd(a, b)$, and tell when a linear Diophantine equation $ax + by = c$ has integer solutions.',
      builds: ['divisibility-primes'],
      blocks: [
        { h: 'Why factoring is too slow for 600-digit numbers—and Euclid’s shortcut' },
        {
          md: `Finding $\\gcd(a, b)$ by factoring $a$ and $b$ into primes works for small numbers, but for 600-digit numbers no supercomputer on Earth can factor them!
Around 300 BC, Euclid discovered that you can find $\\gcd(a, b)$ **without ever factoring**, using one simple remainder rule:

$$\\gcd(a, b) = \\gcd(b,\\; a \\bmod b)$$

**Why does replacing $(a, b)$ with $(b, r)$ where $a = qb + r$ preserve the exact same common divisors?**
- If $d$ divides both $a$ and $b$, then $d$ also divides $a - qb = r$. So $d$ is a common divisor of $b$ and $r$!
- Conversely, if $d$ divides both $b$ and $r$, then $d$ also divides $qb + r = a$. So $d$ is a common divisor of $a$ and $b$!
Since $(a, b)$ and $(b, r)$ have the **exact same set of common divisors**, they have the exact same *greatest* common divisor! Repeat until the remainder hits $0$: the last non-zero remainder is $\\gcd(a, b)$!`,
        },
        { h: 'Bézout’s Identity and the Extended Euclidean Algorithm' },
        {
          md: `Even better: if you run the Euclidean equations **backwards** from the bottom up, substituting each remainder $r = a - qb$, you express $\\gcd(a, b)$ as an integer linear combination of $a$ and $b$!

**Bézout's Theorem:** For any integers $a, b$ (not both zero), there exist integers $x, y \\in \\mathbb{Z}$ such that:
$$a\\,x + b\\,y = \\gcd(a, b)$$

And notice what more this tells us:
1. Every linear combination $ax + by$ is a multiple of $\\gcd(a, b)$, so the equation **$ax + by = c$ has integer solutions $(x, y) \\in \\mathbb{Z}^2$ if and only if $\\gcd(a, b) \\mid c$**!
2. Two integers $a, b$ are **coprime** (relatively prime, $\\gcd(a, b) = 1$) if and only if there exist integers $x, y$ with **$ax + by = 1$**! (This is the key that unlocks modular division and RSA in the next lessons.)`,
        },
        {
          symbols: [
            ['\\gcd(a, b) = \\gcd(b, a \\bmod b)', 'Euclidean Algorithm step', 'Replaces the larger number by its remainder; finishes in $O(\\log(\\min(a,b)))$ steps', '$\\gcd(252, 198) = \\gcd(198, 54) = \\gcd(54, 36) = \\gcd(36, 18) = 18$'],
            ['\\gcd(a, b) = 1', 'coprime / relatively prime', '$a$ and $b$ share no prime factors ($\\iff \\exists x,y \\in \\mathbb{Z},\\;ax + by = 1$)', '$\\gcd(15, 28) = 1$ even though neither is prime!'],
            ['ax + by = \\gcd(a, b)', 'Bézout\'s Identity', '$\\gcd(a, b)$ is the **smallest positive integer** expressible as $ax + by$ ($x, y \\in \\mathbb{Z}$)', 'For $(17, 5)$: $17(-2) + 5(7) = -34 + 35 = 1$'],
            ['\\operatorname{lcm}(a, b) = \\frac{ab}{\\gcd(a, b)}', 'least common multiple via GCD', 'Fast way to compute $\\operatorname{lcm}$ without prime factoring', '$\\operatorname{lcm}(12, 18) = \\frac{12 \\times 18}{6} = 36$'],
          ],
        },
        {
          figure: 'EuclidBezoutFig',
          caption: 'Pick any $a$ and $b$: watch Euclid’s algorithm tile the $a \\times b$ rectangle with squares down to $\\gcd(a, b)$, and trace the Extended Euclidean back-substitution to find Bézout coefficients $ax + by = \\gcd(a, b)$.',
        },
        {
          worked: {
            title: 'Extended Euclidean Algorithm for $\\gcd(43, 12) = 1$ and $43x + 12y = 1$',
            steps: [
              ['Step 1 (Forward)', '$43 = 3 \\cdot 12 + 7 \\quad\\implies\\quad 7 = 43 - 3 \\cdot 12$', 'Remainder $r_1 = 7$'],
              ['Step 2 (Forward)', '$12 = 1 \\cdot 7 + 5 \\quad\\implies\\quad 5 = 12 - 1 \\cdot 7$', 'Remainder $r_2 = 5$'],
              ['Step 3 (Forward)', '$7 = 1 \\cdot 5 + 2 \\quad\\implies\\quad 2 = 7 - 1 \\cdot 5$ (and $5 = 2\\cdot 2 + 1 \\implies \\gcd = 1$)', 'Remainders $r_3 = 2, r_4 = 1$'],
              ['Back-substitute', '$1 = 5 - 2(2) = 5 - 2(7 - 5) = 3(5) - 2(7) = 3(12 - 7) - 2(7) = 3(12) - 5(43 - 3\\cdot 12) = (-5)\\cdot 43 + 18\\cdot 12 = 1$!', 'Bézout coefficients: $x = -5, y = 18$ ($-215 + 216 = 1$)'],
            ],
          },
        },
        {
          predict: {
            prompt: 'Compute $\\gcd(252, 198)$ using the Euclidean algorithm.',
            answer: gcd(252, 198),
            compute: () => gcd(252, 198),
            explain: '$252 = 1\\cdot 198 + 54 \\to 198 = 3\\cdot 54 + 36 \\to 54 = 1\\cdot 36 + 18 \\to 36 = 2\\cdot 18 + 0$. The last non-zero remainder is **18**.',
          },
        },
        {
          predict: {
            prompt: 'Knowing $\\gcd(12, 18) = 6$, what is $\\operatorname{lcm}(12, 18) = \\frac{12 \\times 18}{\\gcd(12, 18)}$?',
            answer: lcm(12, 18),
            compute: () => lcm(12, 18),
            explain: '$\\frac{12 \\times 18}{6} = 2 \\times 18 = 36$.',
          },
        },
        {
          predict: {
            prompt: 'In the Bézout identity $17x + 5y = 1$, if $x = 3$ (so $17 \\times 3 = 51$), what integer $y$ satisfies $51 + 5y = 1$?',
            answer: (1 - 17 * 3) / 5,
            compute: () => (1 - 17 * 3) / 5,
            explain: '$5y = 1 - 51 = -50 \\implies y = -10$. Check: $17(3) + 5(-10) = 51 - 50 = 1$!',
          },
        },
        {
          choice: {
            prompt: 'A game awards $15$ gold coins for a quest and costs $21$ gold coins for a potion. Can you ever end up with a net gain of **exactly $4$ gold coins** ($15x - 21y = 4$ for integers $x, y$)?',
            options: [
              { text: 'No, never! Because $\\gcd(15, 21) = 3$, every integer combination $15x - 21y = 3(5x - 7y)$ is a multiple of $3$, and $3 \\nmid 4$!', why: 'Yes! By Bézout\'s theorem, $ax + by = c$ has integer solutions if and only if $\\gcd(a, b) \\mid c$. Here $3 \\nmid 4$, so $4$ is unreachable.' },
              { text: 'Yes, if you do enough quests', why: 'No matter how large $x$ and $y$ are, $15x - 21y$ is always divisible by $3$.' },
              { text: 'Only if $x$ and $y$ are negative', why: 'Even for negative integers, $3 \\mid (15x - 21y)$ is an invariant!' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'How did we prove **Euclid\'s Lemma** (*if a prime $p \\mid ab$ and $p \\nmid a$, then $p \\mid b$*) using Bézout\'s Identity?',
            options: [
              { text: 'Since $p$ is prime and $p \\nmid a$, we have $\\gcd(p, a) = 1$; by Bézout, $px + ay = 1$; multiply both sides by $b$ to get $p(bx) + (ab)y = b$, and since $p$ divides both terms on the left, $p \\mid b$!', why: 'Yes! That 3-line Bézout proof is the engine behind the uniqueness of prime factorizations!' },
              { text: 'By checking $a = 1, 2, 3$ as examples', why: 'Examples cannot prove a universal theorem.' },
              { text: 'Because $p$ divides $a$ and $b$ equally', why: 'We specifically assumed $p \\nmid a$!' },
            ],
            answer: 0,
          },
        },
        {
          note: 'The **Euclidean Algorithm** $\\gcd(a, b) = \\gcd(b, a \\bmod b)$ finds the GCD without factoring, and back-substituting gives **Bézout\'s Identity** $ax + by = \\gcd(a, b)$. A linear Diophantine equation $ax + by = c$ has integer solutions iff $\\gcd(a, b) \\mid c$.',
        },
      ],
    },

    {
      id: 'modular-arithmetic',
      title: 'Congruences a ≡ b (mod m), clock arithmetic, and modular inverses',
      goal: 'Compute with modular congruences $a \\equiv b \\pmod m$, reduce huge powers $a^k \\bmod m$ by repeated squaring, and find the multiplicative inverse $a^{-1} \\bmod m$ whenever $\\gcd(a, m) = 1$.',
      builds: ['gcd-bezout', 'equivalence-posets'],
      blocks: [
        { h: 'Clock arithmetic: When numbers wrap around every m steps' },
        {
          md: `On a 12-hour clock, $15$ o'clock is the same position as $3$ o'clock because their difference $15 - 3 = 12$ is a multiple of $12$.
Carl Friedrich Gauss introduced the notation of **congruence modulo $m$** (for a positive integer modulus $m \\ge 2$):

$$a \\equiv b \\pmod m \\quad\\iff\\quad m \\mid (a - b) \\quad\\iff\\quad (a \\bmod m) = (b \\bmod m)$$

In lesson [[#equivalence-posets]], we saw that $\\equiv \\pmod m$ is an **equivalence relation** that partitions $\\mathbb{Z}$ into $m$ equivalence classes $[0], [1], \\dots, [m-1]$, called the ring $\\mathbb{Z}_m$.

The miracle of modular arithmetic is that **you can reduce modulo $m$ BEFORE or AFTER adding, subtracting, and multiplying**!
If $a \\equiv a' \\pmod m$ and $b \\equiv b' \\pmod m$, then:
- $a + b \\equiv a' + b' \\pmod m$
- $a - b \\equiv a' - b' \\pmod m$
- $a \\cdot b \\equiv a' \\cdot b' \\pmod m$`,
        },
        { h: 'When can you divide modulo m? Multiplicative Inverses!' },
        {
          md: `Wait—can you always divide both sides of a congruence by $a$?
**NO!** Look at $\\bmod 6$: $2 \\times 1 = 2$ and $2 \\times 4 = 8 \\equiv 2 \\pmod 6$. Even though $2 \\cdot 1 \\equiv 2 \\cdot 4 \\pmod 6$, cancelling the $2$ gives $1 \\equiv 4 \\pmod 6$—**false**! Why did $2$ fail? Because $\\gcd(2, 6) = 2 \\ne 1$.

In $\\mathbb{Z}_m$, "dividing by $a$" means multiplying by the **modular inverse** $a^{-1} \\bmod m$—an integer $x \\in \\{1, \\dots, m-1\\}$ such that:
$$a \\cdot x \\equiv 1 \\pmod m$$

When does $a^{-1} \\bmod m$ exist?
By definition, $ax \\equiv 1 \\pmod m$ means $ax - 1 = (-y)m$, or:
$$a\\,x + m\\,y = 1$$
By **Bézout's Identity** (lesson [[#gcd-bezout]]), this equation has an integer solution $x$ **if and only if $\\gcd(a, m) = 1$**! And the Extended Euclidean coefficient $x \\bmod m$ *is* the modular inverse $a^{-1} \\bmod m$!`,
        },
        {
          symbols: [
            ['a \\equiv b \\pmod m', 'a is congruent to b mod m', '$m \\mid (a - b)$, i.e., $a$ and $b$ leave the same remainder when divided by $m$', '$29 \\equiv 5 \\pmod 8$ since $29 - 5 = 24 = 3\\cdot 8$'],
            ['a^{-1} \\bmod m', 'modular multiplicative inverse', 'The unique $x \\in \\{1, \\dots, m-1\\}$ with $ax \\equiv 1 \\pmod m$; exists **iff $\\gcd(a, m) = 1$**', '$3^{-1} \\bmod 10 = 7$ since $3 \\times 7 = 21 \\equiv 1 \\pmod{10}$'],
            ['a^{2k} = (a^k)^2 \\bmod m', 'modular exponentiation', 'Reduce mod $m$ after every squaring so numbers never exceed $m^2$', 'Computes $a^{10^{100}} \\bmod m$ in a fraction of a millisecond'],
          ],
        },
        {
          figure: 'ModClockInverseFig',
          caption: 'Spin the $m$-hour modular clock by steps of $a$: when $\\gcd(a, m) = 1$, stepping by $a$ visits every single hour on the clock (hitting $1$ at $x = a^{-1} \\bmod m$); when $\\gcd(a, m) > 1$, it gets trapped in a sub-cycle!',
        },
        {
          worked: {
            title: 'Solving the modular linear congruence $3x \\equiv 5 \\pmod{11}$ using $3^{-1} \\bmod 11$',
            steps: [
              ['1. Check $\\gcd(3, 11)$', '$\\gcd(3, 11) = 1$, so $3^{-1} \\bmod 11$ exists and is unique.', '11 is prime'],
              ['2. Find $3^{-1} \\bmod 11$', '$3 \\times 4 = 12 \\equiv 1 \\pmod{11}$, so $3^{-1} \\equiv 4 \\pmod{11}$.', 'Check $12 = 1\\cdot 11 + 1$'],
              ['3. Multiply both sides by $4$', '$4 \\cdot (3x) \\equiv 4 \\cdot 5 \\pmod{11} \\implies 12x \\equiv 20 \\pmod{11}$.', 'Use $4 \\cdot 3 \\equiv 1 \\pmod{11}$'],
              ['4. Reduce mod 11', '$x \\equiv 20 \\equiv 9 \\pmod{11}$. (Check: $3 \\times 9 = 27 = 2\\cdot 11 + 5 \\checkmark$)', 'Unique solution mod 11!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is the multiplicative inverse $5^{-1} \\bmod 12$ (the integer $x \\in \\{1, \\dots, 11\\}$ such that $5x \\equiv 1 \\pmod{12}$)?',
            answer: modInverse(5, 12),
            compute: () => modInverse(5, 12),
            explain: '$5 \\times 5 = 25 = 2 \\times 12 + 1 \\equiv 1 \\pmod{12}$! So $5$ is its own inverse modulo $12$: $5^{-1} \\bmod 12 = 5$.',
          },
        },
        {
          predict: {
            prompt: 'Compute $3^{100} \\bmod 7$ by noticing that $3^2 = 9 \\equiv 2$, $3^3 = 27 \\equiv 6 \\equiv -1$, and $3^6 \\equiv (-1)^2 = 1 \\pmod 7$.',
            answer: modPow(3, 100, 7),
            compute: () => modPow(3, 100, 7),
            explain: 'Since $3^6 \\equiv 1 \\pmod 7$ and $100 = 6 \\times 16 + 4$, we have $3^{100} = (3^6)^{16} \\cdot 3^4 \\equiv 1^{16} \\cdot 81 \\equiv 81 \\bmod 7 = 4$.',
          },
        },
        {
          predict: {
            prompt: 'What is the unique solution $x \\in \\{0, 1, \\dots, 9\\}$ to the congruence $7x \\equiv 3 \\pmod{10}$?',
            answer: mod(modInverse(7, 10) * 3, 10),
            compute: () => mod(modInverse(7, 10) * 3, 10),
            explain: 'First find $7^{-1} \\bmod 10$: since $7 \\times 3 = 21 \\equiv 1 \\pmod{10}$, $7^{-1} \\equiv 3$. Multiply both sides by $3$: $x \\equiv 3 \\times 3 = 9 \\pmod{10}$. (Check: $7 \\times 9 = 63 \\equiv 3 \\pmod{10}$!)',
          },
        },
        {
          choice: {
            prompt: 'Why does $4$ have **no** multiplicative inverse modulo $10$ ($4x \\equiv 1 \\pmod{10}$ has no integer solution)?',
            options: [
              { text: 'Because $\\gcd(4, 10) = 2 > 1$: every multiple $4x$ is even, and subtracting $10y$ stays even, so $4x - 10y$ can never equal the odd number $1$!', why: 'Yes! On a 10-hour clock, stepping by 4 only visits the even numbers $0, 4, 8, 2, 6, 0, \\dots$ and never lands on $1$.' },
              { text: 'Because $4$ is composite', why: '$4$ IS invertible modulo $9$ ($4 \\times 7 = 28 \\equiv 1 \\pmod 9$) because $\\gcd(4, 9) = 1$! Being coprime to $m$ is what matters, not whether $a$ is prime.' },
              { text: '$4^{-1} \\bmod 10$ actually exists and equals $2.5$', why: 'Modular arithmetic takes place in the integers $\\mathbb{Z}_m$; fractions like $2.5$ are not elements of $\\mathbb{Z}_{10}$.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'You want to compute the last digit of $7^{2026}$ (which is $7^{2026} \\bmod 10$). Notice $7^2 = 49 \\equiv -1 \\pmod{10}$. What is $7^{2026} \\bmod 10$?',
            options: [
              { text: '$9$, because $7^{2026} = (7^2)^{1013} \\equiv (-1)^{1013} = -1 \\equiv 9 \\pmod{10}$!', why: 'Yes! Replacing $49 \\equiv 9$ with $-1 \\pmod{10}$ lets you evaluate any power in your head!' },
              { text: '$1$, because $(-1)$ to any power is $1$', why: '$1013$ is odd, so $(-1)^{1013} = -1 \\equiv 9 \\pmod{10}$.' },
              { text: '$7$', why: 'The powers of $7 \\bmod 10$ cycle with period 4: $7, 9, 3, 1$; since $2026 \\equiv 2 \\pmod 4$, it lands on $9$.' },
            ],
            answer: 0,
          },
        },
        {
          puzzle: {
            id: 'modular',
            title: 'Modular Clock & Chinese Remainder Lockpicker',
            desc: 'Crack modular inverses and align simultaneous clock gears in the Puzzles tab.',
          },
        },
        {
          note: 'Reduce modulo $m$ at every intermediate addition and multiplication! And remember: you can divide by $a \\pmod m$ (multiply by $a^{-1} \\bmod m$) **if and only if $\\gcd(a, m) = 1$**, found via Extended Euclid $ax + my = 1$.',
        },
      ],
    },

    {
      id: 'crt-fermat',
      title: 'The Chinese Remainder Theorem, Fermat’s Little Theorem, and Euler’s φ(n)',
      goal: 'Solve simultaneous congruences with pairwise coprime moduli via the Chinese Remainder Theorem, compute Euler’s totient $\\varphi(n)$, and apply Fermat’s Little Theorem $a^{p-1} \\equiv 1 \\pmod p$ and Euler’s Theorem $a^{\\varphi(n)} \\equiv 1 \\pmod n$.',
      builds: ['modular-arithmetic'],
      blocks: [
        { h: 'The Chinese Remainder Theorem (CRT): One clock from many smaller clocks' },
        {
          md: `In the 3rd century AD, the Chinese mathematician Sunzi asked:
> *"There are certain things whose number is unknown. If we count them by threes, we have 2 left over; by fives, we have 3 left over; and by sevens, we have 2 left over. How many things are there?"*
In symbols:
$$x \\equiv 2 \\pmod 3, \\qquad x \\equiv 3 \\pmod 5, \\qquad x \\equiv 2 \\pmod 7$$

**The Chinese Remainder Theorem (CRT):**
If $m_1, m_2, \\dots, m_k$ are **pairwise coprime** ($\gcd(m_i, m_j) = 1$ for $i \\ne j$) and $M = m_1 m_2 \\cdots m_k$, then for **any** remainders $(r_1, \\dots, r_k)$, the system $x \\equiv r_i \\pmod{m_i}$ has a **unique solution modulo $M$**!

Why? And how do you construct $x$?
For each modulus $m_i$, let $M_i = M / m_i$ be the product of all the *other* moduli. Since $\\gcd(M_i, m_i) = 1$, $M_i$ has an inverse $y_i = M_i^{-1} \\bmod m_i$. Look at the term $e_i = M_i \\cdot y_i$:
- Modulo $m_i$, $e_i = M_i y_i \\equiv 1 \\pmod{m_i}$!
- Modulo every *other* $m_j$ ($j \\ne i$), $M_i$ contains $m_j$ as a factor, so $e_i \\equiv 0 \\pmod{m_j}$!
Therefore, the linear combination:
$$x = \\left(\\sum_{i=1}^k r_i\\,M_i\\,y_i\\right) \\bmod M$$
switches on $r_i$ modulo $m_i$ and vanishes modulo all the others!`,
        },
        { h: 'Fermat’s Little Theorem and Euler’s Totient Function φ(n)' },
        {
          md: `In lesson [[#modular-arithmetic]], we saw that an integer $a$ has a multiplicative inverse modulo $n$ if and only if $\\gcd(a, n) = 1$.
How many integers in $\\{1, 2, \\dots, n\\}$ are coprime to $n$? That count is **Euler's totient function $\\varphi(n)$**:
- If $p$ is **prime**, every number in $\\{1, 2, \\dots, p-1\\}$ is coprime to $p$, so **$\\varphi(p) = p - 1$**.
- If $n = p \\cdot q$ is a product of two distinct primes, Inclusion–Exclusion (or CRT!) gives **$\\varphi(pq) = (p - 1)(q - 1)$**.
- In general, for $n = p_1^{e_1}\\cdots p_k^{e_k}$, $\\varphi(n) = n\\prod_{i=1}^k \\left(1 - \\frac{1}{p_i}\\right)$.

When you multiply all $\\varphi(n)$ invertible elements of $\\mathbb{Z}_n^*$ by $a$ (with $\\gcd(a, n) = 1$), you simply permute those exact same $\\varphi(n)$ elements! Equating the product before and after multiplying by $a$ (and cancelling the invertible elements) gives **Euler's Theorem**:

$$a^{\\varphi(n)} \\equiv 1 \\pmod n \\qquad (\\text{whenever } \\gcd(a, n) = 1)$$

When $n = p$ is prime ($\\varphi(p) = p - 1$), this is **Fermat's Little Theorem**:
$$a^{p-1} \\equiv 1 \\pmod p \\qquad (\\text{for prime } p \\text{ and } p \\nmid a)$$`,
        },
        {
          symbols: [
            ['x \\equiv \\sum r_i M_i (M_i^{-1} \\bmod m_i) \\pmod M', 'Chinese Remainder Theorem', 'Unique solution in $\\mathbb{Z}_M$ ($M = m_1\\cdots m_k$) when $\\gcd(m_i, m_j) = 1$', 'Bijection $\\mathbb{Z}_{m_1 m_2} \\leftrightarrow \\mathbb{Z}_{m_1} \\times \\mathbb{Z}_{m_2}$'],
            ['\\varphi(n)', 'Euler\'s totient function', 'Count of integers in $\\{1, \\dots, n\\}$ coprime to $n$', '$\\varphi(p) = p-1$; $\\varphi(pq) = (p-1)(q-1)$'],
            ['a^{p-1} \\equiv 1 \\pmod p', 'Fermat\'s Little Theorem', 'Holds for every prime $p$ and any $a$ not divisible by $p$; implies $a^{-1} \\equiv a^{p-2} \\pmod p$', '$2^{10} = 1024 = 93\\cdot 11 + 1 \\equiv 1 \\pmod{11}$'],
            ['a^{\\varphi(n)} \\equiv 1 \\pmod n', 'Euler\'s Theorem', 'Generalizes Fermat to any modulus $n$ whenever $\\gcd(a, n) = 1$', 'Direct engine of RSA decryption!'],
          ],
        },
        {
          figure: 'ChineseRemainderFig',
          caption: 'Adjust the coprime moduli $m_1, m_2$ and target remainders $r_1, r_2$: see the 2D CRT grid pair every $x \\in \\{0, \\dots, m_1 m_2 - 1\\}$ with a unique $(x \\bmod m_1,\\; x \\bmod m_2)$ coordinate!',
        },
        {
          worked: {
            title: 'Solving Sunzi\'s original puzzle: $x \\equiv 2 \\pmod 3,\\; x \\equiv 3 \\pmod 5,\\; x \\equiv 2 \\pmod 7$',
            steps: [
              ['Product $M$', '$M = 3 \\times 5 \\times 7 = 105$, with $M_1 = 35, M_2 = 21, M_3 = 15$.', '3, 5, 7 are pairwise coprime'],
              ['Inverses $y_i = M_i^{-1} \\bmod m_i$', '$35 \\equiv 2 \\pmod 3 \\implies y_1 = 2$; $21 \\equiv 1 \\pmod 5 \\implies y_2 = 1$; $15 \\equiv 1 \\pmod 7 \\implies y_3 = 1$.', 'Check: $35(2)=70\\equiv 1\\pmod 3$'],
              ['Assemble sum', '$x = 2(35)(2) + 3(21)(1) + 2(15)(1) = 140 + 63 + 30 = 233$.', 'Matches all 3 congruences!'],
              ['Reduce mod $105$', '$233 \\bmod 105 = 23$. (Check: $23 = 7\\cdot 3 + 2 = 4\\cdot 5 + 3 = 3\\cdot 7 + 2 \\checkmark$)', 'Smallest non-negative solution is $23$!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'Find the smallest non-negative integer $x \\in \\{0, 1, \\dots, 14\\}$ such that $x \\equiv 1 \\pmod 3$ and $x \\equiv 4 \\pmod 5$.',
            answer: crtSolve([1, 4], [3, 5]),
            compute: () => crtSolve([1, 4], [3, 5]),
            explain: 'Numbers $\\equiv 4 \\pmod 5$ in $0..14$ are $4, 9, 14$. Checking mod 3: $4 \\equiv 1 \\pmod 3$ works right away! So $x = 4$.',
          },
        },
        {
          predict: {
            prompt: 'What is Euler\'s totient $\\varphi(35)$ for $35 = 5 \\times 7$ (how many integers in $\\{1, \\dots, 35\\}$ are coprime to $35$)?',
            answer: totient(35),
            compute: () => totient(35),
            explain: 'Since $5$ and $7$ are distinct primes, $\\varphi(35) = (5 - 1)(7 - 1) = 4 \\times 6 = 24$.',
          },
        },
        {
          predict: {
            prompt: 'Use **Fermat\'s Little Theorem** ($a^{12} \\equiv 1 \\pmod{13}$ for $13 \\nmid a$) to compute $5^{123} \\bmod 13$.',
            answer: modPow(5, 123, 13),
            compute: () => modPow(5, 123, 13),
            explain: 'Divide the exponent $123$ by $p - 1 = 12$: $123 = 12 \\times 10 + 3$. By Fermat, $5^{123} = (5^{12})^{10} \\cdot 5^3 \\equiv 1^{10} \\cdot 125 \\pmod{13}$. Since $125 = 9 \\times 13 + 8$, the answer is **8**!',
            misconceptions: [
              { answer: modPow(5, 123 % 13, 13), feedback: 'Careful: exponents reduce modulo $\\varphi(p) = p - 1 = 12$, NOT modulo $p = 13$!' },
            ],
          },
        },
        {
          choice: {
            prompt: 'Why do exponents in $a^k \\bmod p$ get reduced modulo **$p - 1$** (not modulo $p$) when applying Fermat\'s Little Theorem?',
            options: [
              { text: 'Because $0$ is not invertible, so the multiplicative group $\\mathbb{Z}_p^* = \\{1, 2, \\dots, p-1\\}$ has size $\\varphi(p) = p - 1$, meaning powers cycle every $p - 1$ steps ($a^{p-1} \\equiv 1 \\pmod p$)!', why: 'Yes! Bases live modulo $p$, while **exponents** live modulo $\\varphi(p) = p - 1$!' },
              { text: 'Because $p$ is odd', why: 'It holds because there are $p - 1$ non-zero residues modulo $p$.' },
              { text: 'Exponents can actually be reduced modulo $p$ as well', why: '$2^{13} \\bmod 13 = 2$, whereas $2^{13 \\bmod 13} = 2^0 = 1 \\ne 2$!' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Does the system $x \\equiv 1 \\pmod 4$ and $x \\equiv 2 \\pmod 6$ have an integer solution?',
            options: [
              { text: 'No! The moduli $4$ and $6$ are NOT coprime ($\\gcd(4, 6) = 2$): $x \\equiv 1 \\pmod 4$ forces $x$ to be **odd**, while $x \\equiv 2 \\pmod 6$ forces $x$ to be **even**!', why: 'Yes! When $\\gcd(m_1, m_2) = g > 1$, a solution exists if and only if $r_1 \\equiv r_2 \\pmod g$. Here $1 \\not\\equiv 2 \\pmod 2$, a parity contradiction.' },
              { text: 'Yes, by the Chinese Remainder Theorem there is a unique solution modulo $24$', why: 'CRT requires the moduli to be **pairwise coprime** ($\\gcd(m_1, m_2) = 1$).' },
              { text: 'Yes, $x = 14$', why: '$14 \\bmod 4 = 2 \\ne 1$.' },
            ],
            answer: 0,
          },
        },
        {
          note: '**CRT** guarantees a unique solution modulo $M = m_1\\cdots m_k$ whenever the moduli are pairwise coprime. And remember the golden rule of modular powers: **bases reduce mod $n$, but exponents reduce mod $\\varphi(n)$** (whenever $\\gcd(a, n) = 1$)!',
        },
      ],
    },

    {
      id: 'rsa-cryptography',
      title: 'Public-key cryptography: Diffie–Hellman and RSA from start to finish',
      goal: 'Build an RSA keypair $(N, e)$ and $d = e^{-1} \\bmod (p-1)(q-1)$ from two primes $p, q$, encrypt $c = m^e \\bmod N$, decrypt $m = c^d \\bmod N$, and explain why Euler’s theorem makes it work.',
      builds: ['crt-fermat'],
      blocks: [
        { h: 'How can two strangers share a secret when everyone is listening?' },
        {
          md: `For thousands of years, cryptography required both sender and receiver to meet in secret ahead of time to share the same key. If Alice and Bob have never met and every message between them is monitored on the open internet, how can Alice receive a secret message from Bob?

In 1977, Rivest, Shamir, and Adleman (**RSA**) built a **mathematical padlock** out of number theory:
- Anyone in the world can snap the padlock **shut** using Alice's **Public Key $(N, e)$**.
- Only someone who knows the prime factorization of $N = p \\cdot q$ can compute the **Private Key $d$** that opens the padlock!

Why is that asymmetry possible?
- **Forward direction (easy):** Multiplying two 300-digit primes $p$ and $q$ to get a 600-digit modulus $N = pq$ takes a laptop less than a millisecond.
- **Backward direction (trapdoor):** Given only the 600-digit number $N$, factoring $N$ back into $p$ and $q$ to find $\\varphi(N) = (p - 1)(q - 1)$ takes the fastest classical computers thousands of years!`,
        },
        { h: 'The Complete 5-Step RSA Protocol' },
        {
          md: `Every single step of RSA comes directly from lessons [[#divisibility-primes]] to [[#crt-fermat]]:
1. **Pick two distinct primes $p$ and $q$** (kept secret) and publish their product **$N = p \\cdot q$**.
2. **Compute Euler's totient** (kept secret):
   $$\\varphi(N) = (p - 1)(q - 1)$$
3. **Choose a public encryption exponent $e$** coprime to $\\varphi(N)$ ($\\gcd(e, \\varphi(N)) = 1$), and publish **Public Key $(N, e)$**.
4. **Compute the private decryption exponent $d$** using the Extended Euclidean Algorithm (lesson [[#modular-arithmetic]]):
   $$d = e^{-1} \\bmod \\varphi(N) \\qquad\\text{so } e \\cdot d = 1 + k\\,\\varphi(N)$$
5. **Encrypt and Decrypt:**
   - To **encrypt** message $m \\in \\{0, \\dots, N-1\\}$: Bob computes **$c = m^e \\bmod N$**.
   - To **decrypt** ciphertext $c$: Alice computes **$c^d \\bmod N$**.

**Why does $c^d \\bmod N$ recover the exact message $m$?**
Substitute $c = m^e$ and $ed = 1 + k\\varphi(N)$, then apply **Euler's Theorem** ($m^{\\varphi(N)} \\equiv 1 \\pmod N$):
$$c^d \\equiv (m^e)^d = m^{ed} = m^{1 + k\\varphi(N)} = m \\cdot \\big(m^{\\varphi(N)}\\big)^k \\equiv m \\cdot 1^k = m \\pmod N \\quad\\blacksquare$$`,
        },
        {
          symbols: [
            ['N = p \\cdot q', 'RSA modulus', 'Product of two secret primes; published openly', 'In toy example $p=5, q=11 \\implies N = 55$'],
            ['\\varphi(N) = (p-1)(q-1)', 'secret totient', 'Number of units mod $N$; requires knowing $p$ and $q$ to compute!', 'For $p=5, q=11$: $\\varphi(55) = 4 \\times 10 = 40$'],
            ['d = e^{-1} \\bmod \\varphi(N)', 'private key exponent', 'Multiplicative inverse of $e$ modulo **$\\varphi(N)$** (not modulo $N$!)', 'For $e = 3, \\varphi(55) = 40$: $d = 27$ since $3 \\times 27 = 81 \\equiv 1 \\pmod{40}$'],
            ['c = m^e \\bmod N,\\;m = c^d \\bmod N', 'RSA encryption & decryption', 'Public encryption raises to power $e$; private decryption raises to power $d$', '$m^{ed} = m^{1 + k\\varphi(N)} \\equiv m \\pmod N$'],
          ],
        },
        {
          figure: 'RsaWorkbenchFig',
          caption: 'Pick primes $p, q$, public exponent $e$, and plaintext message $m$: watch RSA compute $N = pq$, $\\varphi(N) = (p-1)(q-1)$, private key $d = e^{-1} \\bmod \\varphi(N)$, ciphertext $c = m^e \\bmod N$, and decrypted message $c^d \\bmod N$!',
        },
        {
          worked: {
            title: 'Full RSA walkthrough with $p = 5$, $q = 11$, $e = 3$, and plaintext $m = 7$',
            steps: [
              ['1. Modulus & Totient', '$N = 5 \\times 11 = 55$, and $\\varphi(55) = (5 - 1)(11 - 1) = 4 \\times 10 = 40$.', 'Check $\\gcd(e, 40) = \\gcd(3, 40) = 1 \\checkmark$'],
              ['2. Private key $d$', '$d = 3^{-1} \\bmod 40 = 27$, because $3 \\times 27 = 81 = 2 \\times 40 + 1 \\equiv 1 \\pmod{40}$.', 'Public key: $(55, 3)$; Private key: $d = 27$'],
              ['3. Encrypt $m = 7$', '$c = 7^3 \\bmod 55 = 343 \\bmod 55 = 13$ (since $343 = 6 \\times 55 + 13$).', 'Bob sends ciphertext $c = 13$'],
              ['4. Decrypt $c = 13$', '$13^{27} \\bmod 55 = 7 = m$! Original message recovered!', 'Because $13^{27} \\equiv (7^3)^{27} = 7^{81} = 7^1 \\cdot (7^{40})^2 \\equiv 7 \\pmod{55}$'],
            ],
          },
        },
        {
          predict: {
            prompt: 'Suppose Alice chooses primes $p = 3$ and $q = 11$ (so $N = 33$ and $\\varphi(33) = 2 \\times 10 = 20$) and public exponent $e = 3$. What is her private decryption key $d = 3^{-1} \\bmod 20$?',
            answer: rsaDemo(3, 11, 3, 4).d,
            compute: () => rsaDemo(3, 11, 3, 4).d,
            explain: 'We need $3d \\equiv 1 \\pmod{20}$. Since $3 \\times 7 = 21 = 20 + 1 \\equiv 1 \\pmod{20}$, the private key is **$d = 7$**.',
            misconceptions: [
              { answer: modInverse(3, 33), feedback: '$d$ is the inverse of $e$ modulo **$\\varphi(N) = 20$**, not modulo $N = 33$!' },
            ],
          },
        },
        {
          predict: {
            prompt: 'Using that same RSA public key $(N = 33, e = 3)$, what ciphertext $c = m^e \\bmod N$ does Bob get when he encrypts the message $m = 4$?',
            answer: rsaDemo(3, 11, 3, 4).cipher,
            compute: () => rsaDemo(3, 11, 3, 4).cipher,
            explain: '$c = 4^3 \\bmod 33 = 64 \\bmod 33 = 31$ (since $64 = 1 \\times 33 + 31$). And when Alice computes $31^7 \\bmod 33 = (-2)^7 \\bmod 33 = -128 \\bmod 33 = 4$, she gets $m = 4$ right back!',
          },
        },
        {
          choice: {
            prompt: 'Everyone in the world knows Alice\'s public key $(N, e)$, and everyone knows the Extended Euclidean Algorithm. Why can\'t an eavesdropper just run `modInverse(e, phi)` to find Alice\'s private key $d$?',
            options: [
              { text: 'Because to run `modInverse(e, phi)` you need the number $\\varphi(N) = (p-1)(q-1)$, and computing $\\varphi(N)$ from $N = pq$ is mathematically equivalent to **factoring $N$ into $p$ and $q$**!', why: 'Yes! Extended Euclid is super fast once you know $\\varphi(N)$, so the entire security of RSA rests on hiding $\\varphi(N)$ behind the difficulty of factoring $N = pq$.' },
              { text: 'Because the Extended Euclidean Algorithm is too slow for large numbers', why: 'Extended Euclid takes only microseconds even on 1000-digit numbers!' },
              { text: 'Because $e$ has infinitely many inverses modulo $\\varphi(N)$', why: 'The inverse $d = e^{-1} \\bmod \\varphi(N)$ is unique in $\\{1, \\dots, \\varphi(N)-1\\}$.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Why must the public exponent $e$ be chosen so that $\\gcd(e, \\varphi(N)) = 1$?',
            options: [
              { text: 'Because if $\\gcd(e, \\varphi(N)) > 1$, then $e$ has **no multiplicative inverse $d$ modulo $\\varphi(N)$**, and encryption $m \\mapsto m^e \\bmod N$ is not a bijection (multiple messages collide on the same ciphertext)!', why: 'Yes! $\\gcd(e, \\varphi(N)) = 1$ is both necessary and sufficient for $d = e^{-1} \\bmod \\varphi(N)$ to exist.' },
              { text: 'So that $e$ divides $N$ evenly', why: 'We never want $e$ to divide $N$ or $\\varphi(N)$!' },
              { text: 'Because $e$ must be larger than $N$', why: 'In practice $e$ is often chosen to be $65537 = 2^{16} + 1$, much smaller than $N$.' },
            ],
            answer: 0,
          },
        },
        {
          note: '**RSA in one line:** Publish $N = pq$ and $e$; keep $p, q,$ and $\\varphi(N) = (p-1)(q-1)$ secret to compute $d = e^{-1} \\bmod \\varphi(N)$. Then $(m^e)^d = m^{1 + k\\varphi(N)} \\equiv m \\pmod N$ by Euler\'s and Chinese Remainder theorems!',
        },
      ],
    },
  ],
}
