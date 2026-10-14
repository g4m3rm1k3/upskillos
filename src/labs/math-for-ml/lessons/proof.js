// The proof-and-counting part: what makes an argument a proof, proof by contradiction, induction,
// counting arrangements and choices, Pascal's triangle, the binomial theorem, and the pigeonhole
// principle with its collisions. Later parts lean on all of it (the e^x series, the power rule,
// Adam's bias correction, the binomial distribution, hashing).
import { firstCounterexample, isPrime, smallestFactor, euclidStep, gauss, geometric, factorial, arrangements, choose, pascal, binomialPmf, collisionChance } from '../engine/maths.js'
import { f } from './util.js'

const upTo = n => Array.from({ length: n }, (_, i) => i)

export const PROOF = {
  id: 'proof-counting', title: 'Part [[#part:proof-counting]] · Proof and counting', lessons: [
    {
      id: 'proof', title: 'What a proof is, and why examples are not enough',
      goal: 'Tell evidence from proof, disprove a "for all" with one counterexample, and write a short direct proof using letters for an arbitrary case.',
      builds: ['logic'],
      blocks: [
        { md: `Papers state **theorems** ("this algorithm converges", "this estimator is unbiased") and back them with **proofs**. Reading a proof is a skill, and it starts with knowing what a proof has to do.

Try a claim: **"$n^2 + n + 41$ is prime for every whole number $n \\ge 0$."** (A **prime** is a whole number above 1 whose only divisors are 1 and itself: 2, 3, 5, 7, 11, …) Check it: $n = 0$ gives 41, prime. $n = 1$: 43, prime. $n = 2$: 47, prime. A computer can check $n = 0, 1, \\dots, 39$ and every single one is prime. Forty successes in a row.

Then $n = 40$: $40^2 + 40 + 41 = 40 \\cdot 40 + 40 + 41 = 40 \\cdot 41 + 41 = 41 \\cdot 41$. Not prime. The claim is **false**.

That is the whole lesson in one example. A claim about **every** case ("$\\forall n$", lesson [[#logic]]) is false if **one** case fails, so a single **counterexample** disproves it, and a computer search is a fine way to find one. But no number of passing cases proves it, because there are infinitely many cases you didn't check. In ML this matters constantly: "it worked on my 5 test runs" is evidence, not a guarantee.

A **proof** is a chain of steps, each following from definitions or from results already proved, that covers **every case at once**. The trick that makes "every case at once" possible: work with a **letter** that stands for an arbitrary case. Anything you show about "any odd number $a$" without assuming more about $a$ holds for all of them.` },
        { figure: 'ProofFig', caption: 'Every $n$ from 0 up to where the slider starts gives a prime. Slide on to $n = 40$: forty passing examples, and the claim is still false.' },
        { md: `**A direct proof.** Claim: *the sum of two odd numbers is even.*

1. **Definitions first.** A number is **even** if it equals $2k$ for some whole number $k$, and **odd** if it equals $2k + 1$.
2. **Name arbitrary cases.** Let $a$ and $b$ be any odd numbers. By the definition, $a = 2j + 1$ and $b = 2k + 1$ for some whole numbers $j$ and $k$. (Different letters: they need not be the same.)
3. **Compute.** $a + b = 2j + 2k + 2 = 2(j + k + 1)$.
4. **Conclude from the definition.** $j + k + 1$ is a whole number, so $a + b$ is 2 times a whole number: even. $\\blacksquare$

The square $\\blacksquare$ (or "QED", or "∎") marks the end of a proof. Notice that no particular numbers were used; the letters did the work for every case.

**A second one, using lesson [[#logic]]'s contrapositive.** Claim: *if $n^2$ is even, then $n$ is even.* Going directly is awkward. But $p \\Rightarrow q$ is the same statement as $\\neg q \\Rightarrow \\neg p$, so prove: *if $n$ is odd, then $n^2$ is odd.* Let $n = 2k + 1$. Then $n^2 = 4k^2 + 4k + 1 = 2(2k^2 + 2k) + 1$: odd. $\\blacksquare$ The next lesson needs this result.

**Reading a proof in a paper.** Before the steps, find the claim's shape: what is assumed (the "if" part, the hypotheses) and what must be shown, and whether it is about all cases or about one. Then check each line: does it follow from a definition, an earlier result, or algebra? A step you can't justify is either a gap in your knowledge (look it up) or a gap in the proof.` },
        {
          code: {
            file: 'proof.py', fn: 'first_counterexample', notes: [
              ['def first_counterexample(claim, candidates):', ['`claim` is a test returning `True` or `False`; `candidates` are the cases to try.']],
              ['for c in candidates:', ['Try the cases in order.']],
              ['if not claim(c):', ['One failure…']],
              ['return c', ['…disproves the "for all". Return it as the counterexample.']],
              ['return None', ['None found **among the candidates**. That is evidence, never proof: there may be infinitely many cases left.']],
            ],
          },
        },
        {
          code: {
            file: 'proof.py', fn: 'smallest_factor', notes: [
              ['def smallest_factor(n):', ['A whole number $n \\ge 2$.']],
              ['d = 2', ['Try divisors from 2 upward.']],
              ['while d * d <= n:', ['Only up to $\\sqrt n$: if $n = d \\times e$ with both above $\\sqrt n$, then $d \\times e > n$. So a number with a divisor has one at most $\\sqrt n$.']],
              ['if n % d == 0:', ['$d$ divides $n$ exactly: no remainder (lesson [[#piecewise]]\'s mod).']],
              ['return d', ['The first divisor found is the smallest.']],
              ['d += 1', ['Next candidate.']],
              ['return n', ['Nothing up to $\\sqrt n$ divides it, so $n$ is prime and its smallest factor is itself.']],
            ],
          },
        },
        {
          code: {
            file: 'proof.py', fn: 'is_prime', notes: [
              ['def is_prime(n):', ['A whole number.']],
              ['return n > 1 and smallest_factor(n) == n', ['Above 1, with no smaller divisor than itself.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'Search $n = 0, 1, 2, \\dots$: what is the first $n$ for which $n^2 + n + 41$ is **not** prime?',
            answer: 40, compute: () => firstCounterexample(n => isPrime(n * n + n + 41), upTo(100)),
            explain: '$n = 40$ gives $1681 = 41^2$. Every $n$ from 0 to 39 gives a prime.',
          },
        },
        {
          predict: {
            prompt: 'What is the smallest factor of $40^2 + 40 + 41 = 1681$?',
            answer: 41, compute: () => smallestFactor(1681),
            explain: '$1681 = 41 \\times 41$, exactly as the algebra $40 \\cdot 41 + 41 = 41 \\cdot 41$ said.',
          },
        },
        {
          choice: {
            prompt: 'Which of these proves "$n^2 - n$ is even for every whole number $n$"?',
            options: [
              { text: '$n^2 - n = n(n - 1)$, a product of two consecutive whole numbers; one of any two consecutive numbers is even, and an even number times anything is even', why: 'Yes: it covers every $n$ at once. (Even times anything: $2k \\cdot m = 2(km)$.)' },
              { text: 'A program checked every $n$ up to a million and found no exception', why: 'Strong evidence, not a proof. The claim is about infinitely many $n$.' },
              { text: '$n = 3$ gives 6, which is even', why: 'One example shows the claim can be true, not that it always is.' },
            ],
            answer: 0,
          },
        },
        { note: 'One counterexample disproves a "for all"; no number of examples proves one. A proof covers every case at once, usually by naming an arbitrary case with letters and reasoning from definitions. To prove $p \\Rightarrow q$ you may prove the contrapositive $\\neg q \\Rightarrow \\neg p$.' },
      ],
    },

    {
      id: 'contradiction', title: 'Proof by contradiction: √2 and the endless primes',
      goal: 'Prove a statement by assuming its opposite and reaching something impossible, and follow the classic proofs that $\\sqrt 2$ is not a fraction and that there are infinitely many primes.',
      builds: ['proof'],
      blocks: [
        { md: `Some claims are easiest to prove **backwards**. To prove $P$: assume $P$ is false, and reason until you reach something **impossible** (a contradiction, like a number that is both even and odd). Since correct reasoning from a true assumption can't produce something impossible, the assumption was false: $P$ is true.

In lesson [[#logic]]'s terms: you have shown "$\\neg P \\Rightarrow \\text{false}$". An implication that ends in "false" can only be true if its start is false too (the one row where $p \\Rightarrow q$ fails is true $\\Rightarrow$ false). So $\\neg P$ is false.

**$\\sqrt 2$ is not a fraction.** Suppose it were: $\\sqrt 2 = \\frac ab$ with whole numbers $a, b$, and the fraction in **lowest terms** (any fraction can be reduced until top and bottom share no factor, so this costs nothing).

1. Square both sides: $2 = \\frac{a^2}{b^2}$, so $a^2 = 2b^2$. So $a^2$ is even.
2. By the last lesson's result, $a$ is even: $a = 2c$ for a whole number $c$.
3. Substitute: $4c^2 = 2b^2$, so $b^2 = 2c^2$. So $b^2$ is even, and so $b$ is even.
4. Now $a$ and $b$ are both even: they share the factor 2. But we chose lowest terms. **Contradiction.** $\\blacksquare$

So $\\sqrt 2 = 1.41421356\\ldots$ goes on forever without repeating, and no float holds it exactly (later, this is one reason computers round).

**There are infinitely many primes** (Euclid, about 300 BC). Suppose not: then the primes are a finite list $p_1, p_2, \\dots, p_k$. Build

$$Q = p_1 \\times p_2 \\times \\dots \\times p_k + 1$$

$Q$ is bigger than 1, so it has a smallest factor $d$ above 1, and $d$ is prime (if $d$ had a smaller factor above 1, that would divide $Q$ too, and $d$ wouldn't be the smallest). Is $d$ on the list? Dividing $Q$ by any $p_i$ leaves remainder 1, by construction, so no $p_i$ divides $Q$. So $d$ is a prime **not on the list**, contradicting "the list has all the primes". $\\blacksquare$

Careful with one tempting mistake: $Q$ itself need not be prime. With $2, 3, 5, 7, 11, 13$ you get $Q = 30031 = 59 \\times 509$. The proof only needs **some** prime factor off the list.

In ML papers, contradiction shows up in uniqueness proofs ("suppose two different minimisers both…") and impossibility results ("no algorithm can…").` },
        { figure: 'ContradictionFig', caption: 'Pick a list of primes. Euclid\'s $Q$ is their product plus one; its smallest factor is always a prime missing from your list.' },
        {
          code: {
            file: 'proof.py', fn: 'euclid_step', notes: [
              ['def euclid_step(primes):', ['A list of primes, claimed to be all of them.']],
              ['q = 1', ['Start a running product (lesson [[#sigma]]\'s Π).']],
              ['for p in primes:', ['Each prime in the list…']],
              ['q *= p', ['…multiplied in.']],
              ['q += 1', ['Plus one: now every $p$ leaves remainder 1.']],
              ['return q, smallest_factor(q)', ['$Q$ and a prime factor of it, which can\'t be on the list.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'For the list $2, 3, 5, 7, 11, 13$, $Q = 30031$. What is its smallest prime factor?',
            answer: 59, compute: () => euclidStep([2, 3, 5, 7, 11, 13])[1],
            explain: '$30031 = 59 \\times 509$: $Q$ is not prime itself, but 59 is a prime missing from the list, which is all the proof needs.',
          },
        },
        {
          choice: {
            prompt: 'In the proof that $\\sqrt 2$ is not a fraction, what exactly is the contradiction?',
            options: [
              { text: 'The fraction was in lowest terms, yet top and bottom both turned out even', why: 'Yes. Everything else followed by correct steps, so the starting assumption, that $\\sqrt 2 = a/b$, must be false.' },
              { text: '$a^2 = 2b^2$ is impossible', why: 'It is only impossible for whole numbers in lowest terms, and that is what the proof shows; it isn\'t the contradiction itself.' },
              { text: '$\\sqrt 2$ is a decimal', why: 'Many fractions are decimals (0.5). The proof is about fractions of whole numbers.' },
            ],
            answer: 0,
          },
        },
        { note: 'Contradiction: assume the opposite, reason correctly to something impossible, conclude the opposite was false. √2 = a/b in lowest terms forces both even; a finite list of primes always misses a factor of their product plus one.' },
      ],
    },

    {
      id: 'induction', title: 'Induction: proving infinitely many cases with two steps',
      goal: 'Prove a statement for every $n$ by a base case and a step, prove $1 + 2 + \\dots + n = \\frac{n(n+1)}{2}$ and the geometric series formula, and spot a broken step.',
      builds: ['contradiction', 'sigma'],
      blocks: [
        { md: `Many claims are about every whole number $n$: a formula for a sum of $n$ terms, the behaviour of an algorithm after $n$ steps. **Induction** proves them all with two checks:

1. **Base case:** the claim holds for $n = 1$ (or wherever the claim starts).
2. **Step:** for an **arbitrary** $n$, *if* the claim holds for $n$, *then* it holds for $n + 1$.

Picture dominoes: the first one falls, and each one knocks over the next, so all of them fall.

**Why that is a proof**, using the last lesson's method. Suppose the claim failed for some $n$. Then there would be a **smallest** failing $n$. It isn't 1 (the base case holds), so $n - 1$ is a whole number $\\ge 1$ where the claim holds (it is smaller than the smallest failure). The step, applied to $n - 1$, says the claim holds at $n$. Contradiction: so there is no failing $n$. $\\blacksquare$

**Example 1: $1 + 2 + \\dots + n = \\frac{n(n+1)}{2}$.**

- *Base:* $n = 1$: the left side is 1, the right is $\\frac{1 \\cdot 2}{2} = 1$. ✓
- *Step:* assume $1 + \\dots + n = \\frac{n(n+1)}{2}$ for some $n$. Add the next term:
$$1 + \\dots + n + (n + 1) = \\frac{n(n+1)}{2} + (n + 1) = (n + 1)\\left(\\frac n2 + 1\\right) = \\frac{(n+1)(n+2)}{2}$$
which is the formula with $n + 1$ in place of $n$. ✓ $\\blacksquare$

The figure shows **why** the formula is true, not just that it is: two copies of the staircase $1 + 2 + \\dots + n$ fit together into an $n \\times (n + 1)$ rectangle.

**Example 2: the geometric series.** For any $r \\ne 1$,
$$S_n = 1 + r + r^2 + \\dots + r^{n-1} = \\frac{1 - r^n}{1 - r}$$
- *Base:* $n = 1$: $S_1 = 1$ and $\\frac{1 - r}{1 - r} = 1$. ✓
- *Step:* $S_{n+1} = S_n + r^n = \\frac{1 - r^n}{1 - r} + \\frac{r^n(1 - r)}{1 - r} = \\frac{1 - r^n + r^n - r^{n+1}}{1 - r} = \\frac{1 - r^{n+1}}{1 - r}$. ✓ $\\blacksquare$

This formula is everywhere in ML. Adam's bias correction divides by exactly $1 - \\beta^t$ because of it ([[#optimisers]]). And when $|r| < 1$, $r^n \\to 0$, so the infinite sum is $\\frac{1}{1 - r}$: a reinforcement-learning agent that discounts future rewards by $\\gamma = 0.99$ per step weighs the future as if it were $\\frac{1}{1 - 0.99} = 100$ steps long.` },
        { figure: 'InductionFig', caption: 'Two staircases of $1 + 2 + \\dots + n$ dots make an $n \\times (n + 1)$ rectangle, so one staircase is half of it. Then watch the step: adding row $n + 1$ keeps the formula true.' },
        {
          code: {
            file: 'proof.py', fn: 'sum_to', notes: [
              ['def sum_to(n):', ['The sum the slow way.']],
              ['s = 0', ['Running total.']],
              ['for i in range(1, n + 1):', ['$i = 1, 2, \\dots, n$.']],
              ['s += i', ['Add the next term.']],
              ['return s', ['$1 + 2 + \\dots + n$.']],
            ],
          },
        },
        {
          code: {
            file: 'proof.py', fn: 'gauss', notes: [
              ['def gauss(n):', ['The proved formula.']],
              ['return n * (n + 1) // 2', ['$\\frac{n(n+1)}{2}$. `//` is whole-number division; $n(n + 1)$ is always even (one of two consecutive numbers is), so nothing is lost.'], { tex: '\\sum_{i=1}^n i = \\frac{n(n+1)}{2}' }],
            ],
          },
        },
        {
          code: {
            file: 'proof.py', fn: 'geometric', notes: [
              ['def geometric(r, n):', ['A ratio $r$ and a number of terms $n$.']],
              ['s = 0.0', ['Running total.']],
              ['term = 1.0', ['The first term, $r^0 = 1$.']],
              ['for _ in range(n):', ['$n$ terms.']],
              ['s += term', ['Add $r^k$.']],
              ['term *= r', ['The next power: multiply by $r$ once more.']],
              ['return s, (1 - r ** n) / (1 - r)', ['The slow sum beside the formula. They agree, up to float rounding.'], { tex: '\\sum_{k=0}^{n-1} r^k = \\frac{1 - r^n}{1 - r}' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is $1 + 2 + \\dots + 100$?',
            answer: 5050, compute: () => gauss(100),
            explain: '$\\frac{100 \\times 101}{2} = 5050$. (The story goes that Gauss, aged about nine, paired $1 + 100$, $2 + 99$, …: 50 pairs of 101.)',
          },
        },
        {
          predict: {
            prompt: 'A reward stream discounted by $\\gamma = 0.99$: what is $1 + 0.99 + 0.99^2 + \\dots$ (2000 terms is plenty)? (2 decimals)',
            answer: 100, tolerance: 0.006, compute: () => geometric(0.99, 2000)[0],
            explain: '$\\frac{1}{1 - 0.99} = 100$. The leftover $0.99^{2000}$ is about $2 \\times 10^{-9}$.',
          },
        },
        {
          choice: {
            prompt: '"All horses are the same colour." *Base:* one horse is the same colour as itself. *Step:* in any group of $n + 1$ horses, the first $n$ share a colour and so do the last $n$; the groups overlap, so all $n + 1$ do. Where does it break?',
            options: [
              { text: 'The step fails going from 1 horse to 2: the first 1 and the last 1 don\'t overlap at all', why: 'Yes. The step must work for **every** $n$, including $n = 1$, and there it doesn\'t. One broken domino stops the chain.' },
              { text: 'The base case is wrong', why: 'One horse really is the same colour as itself.' },
              { text: 'Induction only works for numbers, not horses', why: 'Induction works for any claim indexed by $n$. The flaw is in the step.' },
            ],
            answer: 0,
          },
        },
        { note: 'Induction: prove the base case, and prove that case $n$ implies case $n + 1$ for an arbitrary $n$; then every case holds (a smallest failure would contradict the step). $\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$. $\\sum_{k=0}^{n-1} r^k = \\frac{1 - r^n}{1 - r}$, and $\\frac{1}{1 - r}$ forever when $|r| < 1$.' },
      ],
    },

    {
      id: 'counting', title: 'Counting: the product rule, n! and arrangements',
      goal: 'Count outcomes of several choices with the product rule, count orders with $n!$, count ordered selections with $\\frac{n!}{(n-k)!}$, and see how fast they grow.',
      builds: ['induction'],
      blocks: [
        { md: `Probability by counting (Part [[#part:part4]]) needs one skill: count the outcomes without listing them.

**The product rule.** If a process is a sequence of choices, with $n_1$ options for the first, $n_2$ for the second (whatever the first was), and so on, the number of outcomes is $n_1 \\times n_2 \\times \\cdots$. Each option of the first choice starts a branch, and each branch splits $n_2$ ways: a tree with $n_1 n_2 \\cdots$ leaves.

- A **grid search** over 4 learning rates, 3 batch sizes and 5 depths trains $4 \\times 3 \\times 5 = 60$ models.
- A string of $k$ symbols from an alphabet of $n$: $n^k$. Bytes: $2^8 = 256$ values.
- The **subsets** of a set of $n$ things: each thing is either in or out, 2 options, $n$ times: $2^n$. Choosing which of 30 features to use: $2^{30} \\approx 10^9$ possibilities. That is why "try every subset" fails.

**Arranging $n$ different things in order.** $n$ choices for the first position, then $n - 1$ for the second (one is used), down to 1 for the last:

$$n! = n \\times (n - 1) \\times \\cdots \\times 2 \\times 1$$

read "$n$ factorial". $3! = 6$: ABC, ACB, BAC, BCA, CAB, CBA. Define $0! = 1$: there is exactly one way to arrange nothing (do nothing), and it makes every formula below work at the edges.

**Ordered selections**: pick $k$ of the $n$ in order (gold, silver, bronze from 10 runners). The same reasoning, stopped after $k$ choices:

$$n \\times (n - 1) \\times \\cdots \\times (n - k + 1) = \\frac{n!}{(n - k)!}$$

(the division cancels the unused tail $(n - k) \\times \\dots \\times 1$).

**How fast it grows.** $10! = 3{,}628{,}800$; $20! \\approx 2.4 \\times 10^{18}$; $60!$ is more than the number of atoms in a galaxy. Any method that tries every ordering, like checking every route through 60 cities, can never finish. Recognising this growth is the first step of algorithm analysis, later in the lab.` },
        { figure: 'CountingFig', caption: 'Set how many options each choice has: the tree\'s leaves are the outcomes, $n_1 \\times n_2 \\times n_3$. Below, every ordering of $n$ letters, $n!$ of them.' },
        {
          code: {
            file: 'proof.py', fn: 'factorial', notes: [
              ['def factorial(n):', ['A whole number $n \\ge 0$.']],
              ['p = 1', ['Start at 1, which is also the answer for $0!$ and $1!$ (the loop below then does nothing).']],
              ['for k in range(2, n + 1):', ['$k = 2, 3, \\dots, n$.']],
              ['p *= k', ['Multiply in each number.']],
              ['return p', ['$n!$.'], { tex: 'n! = \\prod_{k=1}^n k' }],
            ],
          },
        },
        {
          code: {
            file: 'proof.py', fn: 'arrangements', notes: [
              ['def arrangements(n, k):', ['Choose $k$ of $n$, in order.']],
              ['p = 1', ['Running product.']],
              ['for j in range(k):', ['One factor per position filled.']],
              ['p *= n - j', ['$n$ options, then $n - 1$, …: each position has one fewer.']],
              ['return p', ['$\\frac{n!}{(n-k)!}$, without ever computing the huge factorials.'], { tex: '\\frac{n!}{(n-k)!}' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'A grid search tries 4 learning rates, 3 batch sizes and 5 depths. How many models does it train?',
            answer: 60, compute: () => [4, 3, 5].reduce((a, b) => a * b, 1),
            explain: '$4 \\times 3 \\times 5 = 60$: the product rule.',
            misconceptions: [{ answer: 12, feedback: 'That adds the options. Every learning rate is tried with every batch size and every depth: multiply.' }],
          },
        },
        {
          predict: {
            prompt: 'In how many orders can 10 runners finish 1st, 2nd and 3rd?',
            answer: 720, compute: () => arrangements(10, 3),
            explain: '$10 \\times 9 \\times 8 = 720 = \\frac{10!}{7!}$.',
          },
        },
        {
          predict: {
            prompt: 'How many ways are there to arrange 8 different books on a shelf?',
            answer: 40320, compute: () => factorial(8),
            explain: '$8! = 40{,}320$.',
          },
        },
        { note: 'Product rule: a sequence of choices gives $n_1 n_2 \\cdots$ outcomes. Subsets of $n$ things: $2^n$. Orders of $n$ things: $n!$, with $0! = 1$. Ordered choices of $k$ from $n$: $\\frac{n!}{(n-k)!}$. Factorials outgrow every power.' },
      ],
    },

    {
      id: 'combinations', title: 'Combinations and Pascal\'s triangle',
      goal: 'Count unordered choices with $\\binom nk = \\frac{n!}{k!(n-k)!}$, prove Pascal\'s rule $\\binom nk = \\binom{n-1}{k-1} + \\binom{n-1}k$ by a counting argument, and read $\\binom nk$ in formulas.',
      builds: ['counting'],
      blocks: [
        { md: `Often order doesn't matter: a team, a hand of cards, a set of features. How many ways to **choose** $k$ things from $n$, as a set?

Count the ordered selections, $\\frac{n!}{(n-k)!}$, and notice that each unordered choice appears in that count **once for every order** of its $k$ members: $k!$ times. Divide it out:

$$\\binom nk = \\frac{n!}{k!\\,(n - k)!}$$

read "$n$ choose $k$" (also written $C(n, k)$ or $\\;{}^nC_k$). Choosing 2 of {A, B, C}: AB, AC, BC, so $\\binom32 = 3$, and indeed $\\frac{3!}{2!\\,1!} = 3$.

Two facts, each with a one-line counting proof:

- **Symmetry:** $\\binom nk = \\binom n{n-k}$. Choosing who is **in** is the same as choosing who is **out**.
- **Each row adds to $2^n$:** $\\binom n0 + \\binom n1 + \\dots + \\binom nn = 2^n$. The left side counts all subsets of $n$ things, sorted by size; the right side counts them all at once (last lesson).

**Pascal's rule.** $\\binom nk = \\binom{n-1}{k-1} + \\binom{n-1}{k}$ for $0 < k < n$. Proof by counting the same thing two ways: fix one particular item, call it X. Every choice of $k$ from $n$ either **includes** X (and then the other $k - 1$ come from the remaining $n - 1$: $\\binom{n-1}{k-1}$ ways) or **excludes** X (all $k$ come from the remaining $n - 1$: $\\binom{n-1}k$ ways). No choice is in both groups and none is missed, so the counts add. $\\blacksquare$

Write the numbers in rows, $n = 0, 1, 2, \\dots$, with a 1 at each end: each entry is the sum of the two above it. That is **Pascal's triangle**, and it is a table of $\\binom nk$.

In ML you meet $\\binom nk$ counting pairs of features ($\\binom d2$ interactions), in the binomial distribution (next lesson), and in arguments about how many hypotheses a model could represent.` },
        { figure: 'PascalFig', caption: 'Click any entry: it is $\\binom nk$, and the two entries above it, which add up to it, are the "X in" and "X out" counts of Pascal\'s rule.' },
        {
          code: {
            file: 'proof.py', fn: 'choose', notes: [
              ['def choose(n, k):', ['Choose $k$ from $n$, ignoring order.']],
              ['if k < 0 or k > n:', ['Impossible requests…']],
              ['return 0', ['…have no ways. (This makes Pascal\'s rule work at the edges too.)']],
              ['return arrangements(n, k) // factorial(k)', ['Ordered choices, divided by the $k!$ orders each set appears in. Exact whole-number division.'], { tex: '\\binom nk = \\frac{n!}{k!\\,(n-k)!}' }],
            ],
          },
        },
        {
          code: {
            file: 'proof.py', fn: 'pascal', notes: [
              ['def pascal(rows):', ['How many rows to build.']],
              ['triangle = [[1]]', ['Row 0: $\\binom00 = 1$.']],
              ['for n in range(1, rows):', ['Build row $n$ from row $n - 1$.']],
              ['above = triangle[-1]', ['The row above.']],
              ['row = [1]', ['$\\binom n0 = 1$: one way to choose nothing.']],
              ['for k in range(1, n):', ['The inside entries.']],
              ['row.append(above[k - 1] + above[k])', ['Pascal\'s rule: "X in" plus "X out".'], { tex: '\\binom nk = \\binom{n-1}{k-1} + \\binom{n-1}{k}' }],
              ['row.append(1)', ['$\\binom nn = 1$: one way to choose everything.']],
              ['triangle.append(row)', ['Row done.']],
              ['return triangle', ['The whole triangle, a list of rows.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'How many different 5-card hands can be dealt from a 52-card deck?',
            answer: 2598960, compute: () => choose(52, 5),
            explain: '$\\binom{52}5 = \\frac{52 \\cdot 51 \\cdot 50 \\cdot 49 \\cdot 48}{5!} = 2{,}598{,}960$.',
            misconceptions: [{ answer: 311875200, feedback: 'That counts **ordered** deals. A hand is the same whatever order the cards came in: divide by $5! = 120$.' }],
          },
        },
        {
          predict: {
            prompt: 'With 20 input features, how many different **pairs** of features are there (for pairwise interaction terms)?',
            answer: 190, compute: () => choose(20, 2),
            explain: '$\\binom{20}2 = \\frac{20 \\times 19}{2} = 190$.',
          },
        },
        {
          predict: {
            prompt: 'What do the entries of row $n = 10$ of Pascal\'s triangle add up to?',
            answer: 1024, compute: () => pascal(11)[10].reduce((a, b) => a + b, 0),
            explain: '$2^{10} = 1024$: every subset of 10 things, counted by size.',
          },
        },
        { note: '$\\binom nk = \\frac{n!}{k!(n-k)!}$: ordered choices divided by the $k!$ orders. $\\binom nk = \\binom n{n-k}$; each row of Pascal\'s triangle adds to $2^n$; $\\binom nk = \\binom{n-1}{k-1} + \\binom{n-1}k$ by splitting on whether one item is chosen.' },
      ],
    },

    {
      id: 'binomial', title: 'The binomial theorem, and the binomial distribution',
      goal: 'Expand $(a + b)^n$ with $\\binom nk$ by the bracket-picking argument, and derive the probability of $k$ successes in $n$ independent tries.',
      builds: ['combinations'],
      blocks: [
        { md: `Lessons [[#number-e]] and [[#derivative-rules]] multiplied out $n$ brackets by "pick one term from each bracket, in every possible way". Now we can finish the count.

$(a + b)^n$ is $n$ brackets $(a + b)$ multiplied together. A term of the expansion comes from picking $a$ from some brackets and $b$ from the rest. Picking $a$ from exactly $k$ brackets gives $a^k b^{n-k}$, and the number of ways to choose **which** $k$ brackets is $\\binom nk$. Add up over $k$:

$$(a + b)^n = \\sum_{k=0}^{n} \\binom nk\\, a^k\\, b^{n-k}$$

the **binomial theorem**. The coefficients are a row of Pascal's triangle: $(a + b)^4 = a^4 + 4a^3b + 6a^2b^2 + 4ab^3 + b^4$. (Lesson [[#number-e]] used $\\binom nk$ in the form $\\frac{n(n-1)\\cdots(n-k+1)}{k!}$, which is the same number.)

**The same counting gives a probability.** Flip a coin that lands heads with probability $p$, $n$ times, independently. What is the chance of exactly $k$ heads?

1. **One particular sequence** with $k$ heads, say H H T T T for $k = 2, n = 5$: independent "and"s multiply, so its probability is $p \\cdot p \\cdot (1-p)(1-p)(1-p) = p^k(1 - p)^{n-k}$. Every sequence with $k$ heads has this same probability, whatever the order.
2. **How many such sequences?** Choose which $k$ of the $n$ flips are heads: $\\binom nk$.
3. The sequences are different outcomes (they can't happen together), so their probabilities **add**:

$$P(k \\text{ heads}) = \\binom nk\\, p^k\\, (1 - p)^{n-k}$$

This is the **binomial distribution**: the number of correct answers out of $n$ test examples if each is right with probability $p$, the number of clicks out of $n$ impressions, the number of heads. And the binomial theorem shows the probabilities add to 1, as they must: with $a = p$ and $b = 1 - p$, $\\sum_k \\binom nk p^k(1-p)^{n-k} = (p + 1 - p)^n = 1^n = 1$.` },
        { figure: 'BinomialFig', caption: 'Set the number of tries $n$ and the success chance $p$. Each bar is $\\binom nk p^k (1-p)^{n-k}$. The bars always add to 1, and as $n$ grows they take on a familiar bell shape.' },
        {
          code: {
            file: 'proof.py', fn: 'binomial_pmf', notes: [
              ['def binomial_pmf(k, n, p):', ['$k$ successes, $n$ tries, success chance $p$. ("pmf": probability mass function, the list of probabilities of each value.)']],
              ['return choose(n, k) * p ** k * (1 - p) ** (n - k)', ['Number of sequences × probability of each.'], { tex: '\\binom nk p^k (1-p)^{n-k}' }],
            ],
          },
        },
        {
          predict: {
            prompt: 'What is the chance of exactly 3 heads in 5 fair coin flips? (4 decimals)',
            answer: binomialPmf(3, 5, 0.5), tolerance: 0.00006, compute: () => binomialPmf(3, 5, 0.5),
            explain: '$\\binom53 \\cdot 0.5^3 \\cdot 0.5^2 = 10 / 32 = 0.3125$.',
          },
        },
        {
          predict: {
            prompt: 'In the expansion of $(1 + x)^6$, what is the coefficient of $x^2$?',
            answer: 15, compute: () => choose(6, 2),
            explain: '$\\binom62 = 15$, with $a = x$ chosen from 2 of the 6 brackets and $b = 1$ from the rest.',
          },
        },
        {
          predict: {
            prompt: 'A classifier is right on each test example with probability 0.9, independently. Out of 10 examples, what is the chance it gets all 10 right? (4 decimals)',
            answer: 0.9 ** 10, tolerance: 0.00006, compute: () => binomialPmf(10, 10, 0.9),
            explain: `$\\binom{10}{10}\\,0.9^{10} = ${f(0.9 ** 10)}$: only about a third of the time, even for a 90% model.`,
          },
        },
        { note: '$(a + b)^n = \\sum_k \\binom nk a^k b^{n-k}$: choose which $k$ brackets give $a$. $P(k \\text{ successes in } n) = \\binom nk p^k(1-p)^{n-k}$: how many sequences, times the chance of each; the theorem shows they add to 1.' },
      ],
    },

    {
      id: 'pigeonhole', title: 'Pigeonholes, collisions and the birthday problem',
      goal: 'Use the pigeonhole principle, explain why every hash function has collisions and no compressor shrinks every file, and compute the chance of a collision among $k$ random items.',
      builds: ['counting', 'piecewise'],
      blocks: [
        { md: `**The pigeonhole principle:** put $n + 1$ pigeons into $n$ holes, and some hole gets at least two. Proof by contradiction: if every hole had at most one, there would be at most $n$ pigeons. $\\blacksquare$ More generally, $N$ items in $m$ boxes put at least $\\lceil N/m \\rceil$ in some box (lesson [[#piecewise]]'s ceiling): if every box had fewer, the total would be below $N$.

It sounds too obvious to matter. It settles questions that would otherwise need cleverness:

- **Every hash function has collisions.** A hash maps any string, of any length, to one of, say, $2^{64}$ values. There are far more than $2^{64}$ strings, so two different strings must share a value. Hash tables, deduplication and the "hashing trick" for features all have to live with collisions; the only question is how often.
- **No lossless compressor shrinks every file.** There are $2^n$ files of exactly $n$ bits, but only $2^0 + 2^1 + \\dots + 2^{n-1} = 2^n - 1$ files that are shorter (lesson [[#induction]]'s geometric series with $r = 2$). Mapping $2^n$ files into $2^n - 1$ shorter ones must send two to the same output, and then you can't tell them apart when decompressing.

**How soon do collisions come?** Drop $k$ items into $m$ slots uniformly at random. Count the chance that all are **different** with the product rule: the first can go anywhere, the second must avoid one slot ($\\frac{m-1}{m}$), the third two slots ($\\frac{m-2}{m}$), and so on, and these multiply (each placement is independent):

$$P(\\text{no collision}) = \\frac{m}{m}\\cdot\\frac{m-1}{m}\\cdots\\frac{m-k+1}{m} = \\prod_{i=0}^{k-1}\\left(1 - \\frac im\\right), \\qquad P(\\text{collision}) = 1 - \\text{that}$$

(the complement rule). With $m = 365$ birthdays, just $k = 23$ people give a better-than-even chance that two share one: the **birthday problem**. It is surprising because the number of **pairs** grows like $\\binom k2 \\approx k^2/2$, much faster than $k$; collisions become likely once $k$ is around $\\sqrt m$ (about $1.18\\sqrt m$ for 50%). A hash table with a million slots expects its first collision after only about 1,200 keys.` },
        { figure: 'BirthdayFig', caption: 'The chance of at least one collision as items are added, for $m$ slots. Move $m$: the 50% point sits near $1.18\\sqrt m$, far fewer items than slots.' },
        {
          code: {
            file: 'proof.py', fn: 'collision_chance', notes: [
              ['def collision_chance(k, m):', ['$k$ items, $m$ equally likely slots.']],
              ['all_different = 1.0', ['A running product: the chance that no collision has happened yet.']],
              ['for i in range(k):', ['Item $i + 1$ arrives, with $i$ slots already taken.']],
              ['all_different *= (m - i) / m', ['It must land in one of the $m - i$ free slots.'], { tex: '\\prod_{i=0}^{k-1}\\frac{m - i}{m}' }],
              ['return 1 - all_different', ['Complement: the chance of at least one collision.']],
            ],
          },
        },
        {
          predict: {
            prompt: 'With 23 people and 365 equally likely birthdays, what is the chance that at least two share a birthday? (3 decimals)',
            answer: collisionChance(23, 365), tolerance: 0.0006, compute: () => collisionChance(23, 365),
            explain: `${f(collisionChance(23, 365))}: just over a half.`,
            misconceptions: [{ answer: 23 / 365, tolerance: 0.001, feedback: 'That is the chance one particular person matches one particular date. There are $\\binom{23}2 = 253$ pairs, and any pair can match.' }],
          },
        },
        {
          predict: {
            prompt: 'A hash table has 1000 slots and holds 40 keys placed at random. What is the chance of at least one collision? (2 decimals)',
            answer: collisionChance(40, 1000), tolerance: 0.006, compute: () => collisionChance(40, 1000),
            explain: `${f(collisionChance(40, 1000))}: more likely than not, with the table only 4% full.`,
          },
        },
        {
          choice: {
            prompt: 'A team says its compression method makes **every** 1 KB file smaller. What do you conclude?',
            options: [
              { text: 'It can\'t be lossless: there are fewer shorter files than 1 KB files, so two inputs must share an output', why: 'Yes: the pigeonhole principle. Real compressors shrink typical files and slightly enlarge some others.' },
              { text: 'It depends on the algorithm', why: 'No algorithm can beat the count: $2^n$ inputs, $2^n - 1$ shorter outputs.' },
              { text: 'It must be using a very large dictionary', why: 'The dictionary doesn\'t change the number of possible outputs.' },
            ],
            answer: 0,
          },
        },
        { python: { program: 'proof', label: 'Run every idea of this part in real Python' } },
        {
          code: {
            file: 'proof.py', fn: 'show_proof', notes: [
              ['def show_proof():', ['One line of output per lesson of this part.']],
              ['print("n² + n + 41 prime for every n? first failure:", first_counterexample(lambda n: is_prime(n * n + n + 41), range(100)))', ['Lesson [[#proof]]: the search finds 40.']],
              ['print("Euclid with 2, 3, 5, 7, 11, 13:", euclid_step([2, 3, 5, 7, 11, 13]))', ['Lesson [[#contradiction]]: $Q = 30031$ and its factor 59.']],
              ['print("1 + … + 100 by adding:", sum_to(100), " by the formula:", gauss(100))', ['Lesson [[#induction]]: both 5050.']],
              ['print("1 + 0.9 + … + 0.9^9, and the formula:", geometric(0.9, 10))', ['The geometric series, two ways.']],
              ['print("10! =", factorial(10), "  arrangements of 3 from 10:", arrangements(10, 3), "  C(10, 3) =", choose(10, 3))', ['Lessons [[#counting]] and [[#combinations]]: $720 / 3! = 120$.']],
              ['print("Pascal\'s row 6:", pascal(7)[6])', ['Row 6: 1, 6, 15, 20, 15, 6, 1.']],
              ['print("P(3 heads in 5 fair flips) =", binomial_pmf(3, 5, 0.5))', ['Lesson [[#binomial]]: 0.3125.']],
              ['print("23 people, 365 days: chance of a shared birthday =", collision_chance(23, 365))', ['This lesson: about 0.507.']],
            ],
          },
        },
        { note: 'Pigeonhole: $N$ items in $m$ boxes put at least $\\lceil N/m\\rceil$ in one. So hashes collide and no compressor shrinks everything. $P(\\text{no collision}) = \\prod_{i<k}(1 - i/m)$; collisions become likely around $k \\approx \\sqrt m$.' },
      ],
    },
  ],
}

