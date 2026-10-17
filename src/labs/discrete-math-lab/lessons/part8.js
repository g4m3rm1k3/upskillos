// Part 8: Discrete Probability, Boolean Circuits & Automata — conditional probability & Bayes' theorem,
// linearity of expectation & indicator variables, Boolean algebra & Karnaugh maps, and Finite Automata (DFAs).
import {
  bayesPosterior, couponCollectorExpected, birthdayCollisionProb, choose,
} from '../engine/discrete.js'

export const PART8 = {
  id: 'probability-automata',
  title: 'Part [[#part:probability-automata]] · Discrete probability, Boolean circuits & automata',
  lessons: [
    {
      id: 'discrete-probability',
      title: 'Sample spaces, conditional probability P(A | B), and Bayes’ theorem',
      goal: 'Compute probabilities on finite sample spaces $\\Omega$, restrict the sample space via $P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}$, test independence, and invert conditional probabilities with Bayes’ theorem.',
      builds: ['combinations', 'inclusion-exclusion'],
      blocks: [
        { h: 'Probability is set theory with weights that add to 1' },
        {
          md: `A discrete random experiment has a **sample space $\\Omega$** (the set of all possible elementary outcomes), where each outcome $\\omega \\in \\Omega$ has probability $P(\\omega) \\ge 0$ and $\\sum_{\\omega \\in \\Omega} P(\\omega) = 1$.
An **event** is simply any subset $A \\subseteq \\Omega$, with $P(A) = \\sum_{\\omega \\in A} P(\\omega)$. When all $|\Omega|$ outcomes are equally likely (**Laplace's uniform model**), probability is pure combinatorics from Part [[#part:combinatorics]]:
$$P(A) = \\frac{|A|}{|\\Omega|}$$

What happens when you learn partial information—namely, that event $B$ **has occurred**?
Every outcome outside $B$ is now impossible, so **$B$ becomes the new universe**, and the surviving part of $A$ is the overlap $A \\cap B$! Rescaling by $P(B)$ so the new universe sums to $1$ gives **Conditional Probability**:
$$P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)} \\qquad\\Longleftrightarrow\\qquad P(A \\cap B) = P(B)\\,P(A \\mid B)$$

Two events $A$ and $B$ are **independent** if learning $B$ changes nothing about $A$'s chance ($P(A \\mid B) = P(A)$), which is equivalent to the symmetric equation:
$$P(A \\cap B) = P(A) \\cdot P(B)$$
*(Warning: **Independent** ($P(A \\cap B) = P(A)P(B)$) is the exact opposite of **Disjoint / Mutually Exclusive** ($P(A \\cap B) = 0$)! If two non-empty events are disjoint, knowing $B$ happened tells you $A$ definitely did NOT happen, so they are maximally **dependent**!)*`,
        },
        { h: 'Bayes’ Theorem and the Base-Rate Paradox' },
        {
          md: `Because $A \\cap B = B \\cap A$, we can expand $P(A \\cap B)$ both ways: $P(A)\\,P(B \\mid A) = P(B)\\,P(A \\mid B)$. Dividing by $P(B)$ flips the condition around—**Bayes' Theorem**:

$$P(A \\mid B) = \\frac{P(A)\\,P(B \\mid A)}{P(B)} = \\frac{P(A)\\,P(B \\mid A)}{P(A)\\,P(B \\mid A) + P(A^c)\\,P(B \\mid A^c)}$$

Why is Bayes' Theorem famous? Because humans instinctively confuse $P(\\text{Positive} \\mid \\text{Sick})$ with $P(\\text{Sick} \\mid \\text{Positive})$!
Suppose a rare disease affects **$1$ in $1000$ people** ($P(D) = 0.001$), and a test has $99\\%$ sensitivity ($P(+ \\mid D) = 0.99$) and only a $1\\%$ false-positive rate ($P(+ \\mid D^c) = 0.01$).
Out of $1000$ people:
- **$1$ person is sick** and tests positive ($\approx 1$ true positive).
- **$999$ people are healthy**, and $1\\%$ of them test positive ($\approx 10$ false positives!).
Out of the $1 + 10 = 11$ people who got a positive result, only **$1 / 11 \\approx 9\\%$** actually have the disease!`,
        },
        {
          symbols: [
            ['P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}', 'conditional probability', 'Probability of $A$ given that $B$ occurred (restricts universe to $B$)', 'Roll a die: $P(\\text{roll } 6 \\mid \\text{even}) = \\frac{1/6}{3/6} = \\frac{1}{3}$'],
            ['P(A \\cap B) = P(A)P(B)', 'statistical independence', 'Knowing $B$ occurred does not change the probability of $A$', 'Two separate coin flips are independent; disjoint events are NOT!'],
            ['P(A \\mid B) = \\frac{P(A)P(B\\mid A)}{P(B)}', 'Bayes\' Theorem', 'Updates prior belief $P(A)$ to posterior $P(A\\mid B)$ after observing evidence $B$', 'Denominator $P(B) = P(A)P(B\\mid A) + P(A^c)P(B\\mid A^c)$'],
          ],
        },
        {
          figure: 'BayesTreeGridFig',
          caption: 'Adjust the base rate $P(D)$, sensitivity $P(+\\mid D)$, and false-positive rate $P(+\\mid D^c)$ on a grid of 1,000 people to see why rare events produce mostly false positives until a second test is run.',
        },
        {
          worked: {
            title: 'Calculating exact Bayes posterior for $P(D) = 0.01,\\; P(+\\mid D) = 0.99,\\; P(+\\mid D^c) = 0.01$',
            steps: [
              ['1. True positive path', '$P(D \\cap +) = P(D)\\,P(+ \\mid D) = 0.01 \\times 0.99 = 0.0099$', '1% sick $\\times$ 99% detected'],
              ['2. False positive path', '$P(D^c \\cap +) = P(D^c)\\,P(+ \\mid D^c) = 0.99 \\times 0.01 = 0.0099$', '99% healthy $\\times$ 1% false alarm'],
              ['3. Total $P(+)$ (Law of Total Prob.)', '$P(+) = 0.0099 + 0.0099 = 0.0198$', 'True positives and false positives tie!'],
              ['4. Posterior $P(D \\mid +)$', '$P(D \\mid +) = \\frac{0.0099}{0.0198} = 0.50 = 50\\%$!', 'Even a "99% accurate" test on a 1% disease is a 50-50 coin toss on one positive result!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'You roll two fair 6-sided dice ($36$ equally likely outcomes). Given that the **sum of the two dice is $8$** (event $B = \\{(2,6), (3,5), (4,4), (5,3), (6,2)\\}$, size $5$), what is the conditional probability $P(\\text{first die is } 3 \\mid \\text{sum is } 8)$? Enter your answer as a decimal.',
            answer: 1 / 5,
            compute: () => 1 / 5,
            explain: 'Out of the $5$ equally likely outcomes in $B$ where the sum is $8$, exactly $1$ outcome has the first die equal to $3$, namely $(3, 5)$. So $P(A \\mid B) = \\frac{1}{5} = 0.2$.',
          },
        },
        {
          predict: {
            prompt: 'A spam filter knows $20\\%$ of all incoming emails are spam ($P(S) = 0.20$). The word `"lottery"` appears in $50\\%$ of spam emails ($P(W \\mid S) = 0.50$) and in $5\\%$ of legitimate emails ($P(W \\mid S^c) = 0.05$). If an email contains `"lottery"`, what is the posterior probability $P(S \\mid W)$ that it is spam?',
            answer: bayesPosterior(0.20, 0.50, 0.05),
            compute: () => bayesPosterior(0.20, 0.50, 0.05),
            explain: '$P(S \\cap W) = 0.20 \\times 0.50 = 0.10$, and $P(S^c \\cap W) = 0.80 \\times 0.05 = 0.04$. Thus $P(W) = 0.10 + 0.04 = 0.14$, and $P(S \\mid W) = \\frac{0.10}{0.14} = \\frac{5}{7} \\approx 0.7143$.',
            tolerance: 1e-3,
          },
        },
        {
          choice: {
            prompt: 'Suppose $A$ and $B$ are two events with $P(A) = 0.4$ and $P(B) = 0.5$, and you are told that $A$ and $B$ are **mutually exclusive (disjoint)** ($A \\cap B = \\emptyset$). Are $A$ and $B$ independent?',
            options: [
              { text: 'No! Because they are disjoint, $P(A \\cap B) = 0$, whereas independence requires $P(A \\cap B) = P(A)P(B) = 0.4 \\times 0.5 = 0.20 \\ne 0$!', why: 'Yes! Disjoint means "cannot happen together" ($P(A\\cap B) = 0$); independent means "happen together at rate $P(A)P(B)$". Two events with positive probability can never be both disjoint and independent!' },
              { text: 'Yes, because disjoint sets have nothing to do with each other', why: 'In probability, if $A$ and $B$ are disjoint and $B$ happens, then $P(A \\mid B) = 0 \\ne P(A)$: knowing $B$ happened gives you 100% certainty that $A$ did NOT happen!' },
              { text: 'Only if $P(A) + P(B) = 1$', why: 'Even when $P(A) + P(B) = 1$ (like $B = A^c$), $P(A \\cap A^c) = 0 \\ne P(A)P(A^c)$.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'In the **Birthday Paradox**, how many people $k$ are needed in a room (with $m = 365$ equally likely birthdays) before the probability that **at least two people share a birthday** exceeds $50\\%$?',
            options: [
              { text: 'Just $k = 23$ people ($P(\\text{collision}) \\approx 50.7\\%$), because with $23$ people there are $\\binom{23}{2} = 253$ **pairs** of people, each having a chance to collide!', why: 'Yes! By complement counting, $P(\\text{all distinct}) = \\frac{365}{365}\\cdot\\frac{364}{365}\\cdots\\frac{343}{365} \\approx 0.4927$, so $P(\\text{at least one match}) = 1 - 0.4927 \\approx 50.73\\%$ at $k = 23$!' },
              { text: '$k = 183$ people ($365 / 2$)', why: '$183$ people would be needed for a $>50\\%$ chance that someone matches **your specific birthday**, whereas the Birthday Paradox asks whether **any pair** among the $k$ people matches!' },
              { text: '$k = 366$ people', why: '$k = 366$ is the number needed to **guarantee ($100\\%$)** a match by the Pigeonhole Principle; for a $50\\%$ probability, only $23$ are needed!' },
            ],
            answer: 0,
          },
        },
        {
          note: '**Conditional probability** $P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}$ restricts the sample space to $B$. **Bayes\' Theorem** flips $P(B \\mid A)$ into $P(A \\mid B)$ by weighting with the prior base rate $P(A)$. Never confuse **disjoint** ($P(A\\cap B) = 0$) with **independent** ($P(A\\cap B) = P(A)P(B)$)!',
        },
      ],
    },

    {
      id: 'expectation-linearity',
      title: 'Random variables, linearity of expectation, and the Coupon Collector',
      goal: 'Compute expected value $\\mathbb{E}[X] = \\sum x\\,P(X=x)$, decompose messy random counts into indicator random variables $X = X_1 + \\dots + X_n$, and solve the Hat-Check and Coupon Collector problems in two lines.',
      builds: ['discrete-probability'],
      blocks: [
        { h: 'The superpower of Linearity of Expectation: It doesn’t even need independence!' },
        {
          md: `A **random variable** $X: \\Omega \\to \\mathbb{R}$ is a function that assigns a numerical value (like "number of heads", "number of fixed points", or "number of steps") to each outcome $\\omega \\in \\Omega$.
Its **expected value** (or **mean**) $\\mathbb{E}[X]$ is the probability-weighted average of its values:
$$\\mathbb{E}[X] = \\sum_{\\omega \\in \\Omega} X(\\omega)\\,P(\\omega) = \\sum_x x\\,P(X = x)$$

Now comes the single most magical theorem in discrete probability—**Linearity of Expectation**:
For **any** random variables $X_1, X_2, \\dots, X_n$ on $\\Omega$—**whether they are independent or wildly dependent!**—
$$\\mathbb{E}[X_1 + X_2 + \\dots + X_n] = \\mathbb{E}[X_1] + \\mathbb{E}[X_2] + \\dots + \\mathbb{E}[X_n]$$

*Why doesn't it need independence?* Because in $\\sum_{\\omega \\in \\Omega} (X_1(\\omega) + X_2(\\omega)) P(\\omega)$, ordinary addition distributes over $\\Sigma$ outcome-by-outcome: $\\sum X_1(\\omega)P(\\omega) + \\sum X_2(\\omega)P(\\omega) = \\mathbb{E}[X_1] + \\mathbb{E}[X_2]$!

Combine Linearity with **Indicator Random Variables** $I_A \\in \\{0, 1\\}$ (where $I_A = 1$ if event $A$ happens and $0$ otherwise, so **$\\mathbb{E}[I_A] = 1\\cdot P(A) + 0\\cdot P(A^c) = P(A)$**), and hard counting problems collapse into 2 lines!`,
        },
        { h: 'Two Miracles of Indicator Variables: Hat-Check and Coupon Collector' },
        {
          md: `1. **The Hat-Check Problem in 2 Lines:**
   In lesson [[#inclusion-exclusion]], finding the distribution of fixed points took Inclusion–Exclusion and derangements $!n$. Now ask: *When $n$ hats are returned at random to $n$ people, what is the **expected number of people $X$** who get their own hat back?*
   - Let $X_i = 1$ if person $i$ gets their own hat, and $0$ otherwise, so $X = X_1 + X_2 + \\dots + X_n$.
   - What is $\\mathbb{E}[X_i] = P(\\text{person } i \\text{ gets their own hat})$? Just $\\frac{1}{n}$!
   - Even though $X_1, \\dots, X_n$ are **dependent** (if $n-1$ people get their own hat, the $n$-th person is forced to as well!), by Linearity of Expectation:
     $$\\mathbb{E}[X] = \\sum_{i=1}^n \\mathbb{E}[X_i] = \\underbrace{\\frac{1}{n} + \\frac{1}{n} + \\dots + \\frac{1}{n}}_{n \\text{ times}} = 1$$
   Whether there are $3$ people or $10{,}000{,}000$ people, on average **exactly $1$ person** gets their own hat!

2. **The Coupon Collector Problem ($n H_n$):**
   There are $n$ distinct collectible cards, and each cereal box contains a uniformly random card. How many boxes $T$ must you buy on average to collect **all $n$ cards**?
   - When you already hold $k$ distinct cards, the probability that the next box gives a **new** ($k+1$-st) card is $p_k = \\frac{n - k}{n}$, so waiting for that new card (a geometric random variable with mean $1/p_k$) takes $\\frac{n}{n - k}$ boxes on average!
   - Summing over $k = 0, 1, \\dots, n - 1$ by Linearity of Expectation:
     $$\\mathbb{E}[T] = \\frac{n}{n} + \\frac{n}{n-1} + \\dots + \\frac{n}{1} = n\\left(1 + \\frac{1}{2} + \\frac{1}{3} + \\dots + \\frac{1}{n}\\right) = n\\,H_n \\approx n \\ln n$$`,
        },
        {
          symbols: [
            ['\\mathbb{E}[X] = \\sum_x x\\,P(X = x)', 'expected value (mean)', 'Probability-weighted average of random variable $X$', 'Fair die ($1..6$): $\\mathbb{E}[X] = \\frac{1+2+3+4+5+6}{6} = 3.5$'],
            ['\\mathbb{E}[I_A] = P(A)', 'indicator bridge', 'For indicator $I_A \\in \\{0, 1\\}$, its expectation is simply the probability of event $A$', 'Turns counting into adding single-item probabilities!'],
            ['\\mathbb{E}[\\sum X_i] = \\sum \\mathbb{E}[X_i]', 'Linearity of Expectation', 'Holds **always**, even when $X_1, \\dots, X_n$ are dependent!', '$n$ coin flips ($p$): $\\mathbb{E}[X] = np$; Hat-check: $n \\cdot \\frac{1}{n} = 1$'],
            ['\\mathbb{E}[T] = n\\,H_n = n\\sum_{k=1}^n \\frac{1}{k}', 'Coupon Collector expectation', 'Expected draws to collect all $n$ types when each draw is uniform', 'For $n = 6$ die faces: $6(1 + \\frac{1}{2} + \\frac{1}{3} + \\frac{1}{4} + \\frac{1}{5} + \\frac{1}{6}) = 14.7$ rolls'],
          ],
        },
        {
          figure: 'LinearityExpectationFig',
          caption: 'Explore Linearity of Expectation on the Hat-Check fixed-point distribution (always mean $1$!) and the Coupon Collector waiting time $n H_n$.',
        },
        {
          worked: {
            title: 'Finding the Expected Number of Inversions in a Random Permutation of $\\{1, \\dots, n\\}$',
            steps: [
              ['1. Define indicators', 'For each of the $\\binom{n}{2}$ pairs $1 \\le i < j \\le n$, let $I_{ij} = 1$ if $\\pi(i) > \\pi(j)$ (out of order) and $0$ otherwise.', 'Total inversions $X = \\sum_{i < j} I_{ij}$'],
              ['2. Find $\\mathbb{E}[I_{ij}]$', 'In a random permutation, any pair is equally likely to appear in order or reversed: $P(\\pi(i) > \\pi(j)) = \\frac{1}{2}$.', 'By symmetry, $\\mathbb{E}[I_{ij}] = \\frac{1}{2}$'],
              ['3. Sum by Linearity', '$\\mathbb{E}[X] = \\sum_{1 \\le i < j \\le n} \\frac{1}{2} = \\frac{1}{2}\\binom{n}{2} = \\frac{n(n-1)}{4}$.', 'Even though pair comparisons are dependent ($a>b, b>c \\Rightarrow a>c$), Linearity still gives the exact answer!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'You roll a fair 6-sided die repeatedly until you have seen **all $6$ faces** ($1, 2, 3, 4, 5, 6$) at least once (the Coupon Collector problem with $n = 6$). What is the expected number of rolls $6 H_6 = 6\\left(1 + \\frac{1}{2} + \\frac{1}{3} + \\frac{1}{4} + \\frac{1}{5} + \\frac{1}{6}\\right)$? Enter as a decimal.',
            answer: couponCollectorExpected(6),
            compute: () => couponCollectorExpected(6),
            explain: '$6 \\times \\frac{1}{6} + 6 \\times \\frac{1}{5} + 6 \\times \\frac{1}{4} + 6 \\times \\frac{1}{3} + 6 \\times \\frac{1}{2} + 6 \\times 1 = 1 + 1.2 + 1.5 + 2 + 3 + 6 = 14.7$ rolls!',
            tolerance: 1e-4,
          },
        },
        {
          predict: {
            prompt: 'Using the worked derivation above ($\\mathbb{E}[\\text{inversions}] = \\frac{n(n-1)}{4}$), what is the expected number of inversions in a uniformly random permutation of $n = 8$ distinct numbers?',
            answer: (8 * 7) / 4,
            compute: () => (8 * 7) / 4,
            explain: 'There are $\\binom{8}{2} = 28$ pairs of indices $(i, j)$ with $i < j$, and each pair is inverted with probability $1/2$: $28 \\times \\frac{1}{2} = 14$ inversions on average.',
          },
        },
        {
          choice: {
            prompt: 'Does $\\mathbb{E}[X \\cdot Y] = \\mathbb{E}[X] \\cdot \\mathbb{E}[Y]$ also hold for *any* two random variables $X$ and $Y$ without assuming independence?',
            options: [
              { text: 'No! **Addition** $\\mathbb{E}[X + Y] = \\mathbb{E}[X] + \\mathbb{E}[Y]$ holds always, but **multiplication** $\\mathbb{E}[XY] = \\mathbb{E}[X]\\mathbb{E}[Y]$ requires $X$ and $Y$ to be uncorrelated / independent (in fact, $\\mathbb{E}[X^2] - (\\mathbb{E}[X])^2 = \\operatorname{Var}(X) > 0$)!', why: 'Yes! Never assume $\\mathbb{E}[XY] = \\mathbb{E}[X]\\mathbb{E}[Y]$ unless $X$ and $Y$ are independent!' },
              { text: 'Yes, expectation is multiplicative for all random variables', why: 'If $X = Y$ is a coin flip ($0$ or $1$ with prob $1/2$), $\\mathbb{E}[X \\cdot X] = \\mathbb{E}[X] = 1/2 \\ne (1/2)(1/2) = 1/4$!' },
              { text: 'Neither addition nor multiplication holds without independence', why: 'Linearity of addition $\\mathbb{E}[X + Y] = \\mathbb{E}[X] + \\mathbb{E}[Y]$ ALWAYS holds, even when $Y = X$!' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Why did the Binomial distribution $X \\sim \\operatorname{Binomial}(n, p)$ (number of successes in $n$ trials) have expected value $\\mathbb{E}[X] = np$ with zero messy summation of $k\\binom{n}{k}p^k(1-p)^{n-k}$?',
            options: [
              { text: 'Write $X = I_1 + I_2 + \\dots + I_n$, where $I_j \\in \\{0, 1\\}$ is the indicator of success on trial $j$; since $\\mathbb{E}[I_j] = p$, Linearity immediately gives $\\mathbb{E}[X] = p + p + \\dots + p = np$!', why: 'Yes! Indicator variables turn a 10-line binomial sum into a 1-line addition.' },
              { text: 'Because the maximum possible value of $X$ is $np$', why: 'The maximum value of $X$ is $n$; $np$ is its expected (average) value.' },
              { text: 'Only when $p = 0.5$', why: '$\\mathbb{E}[X] = np$ holds for every $p \\in [0, 1]$!' },
            ],
            answer: 0,
          },
        },
        {
          note: 'Whenever a problem asks for the **expected count** of things (matches, inversions, collisions, triangles in a random graph), immediately write $X = \\sum I_k$ as a sum of $0$–$1$ **indicator variables** and use **Linearity of Expectation** $\\mathbb{E}[X] = \\sum P(A_k)$!',
        },
      ],
    },

    {
      id: 'boolean-karnaugh',
      title: 'Boolean algebra, logic gates, minterms, and Karnaugh map minimization',
      goal: 'Translate any truth table into Sum-of-Products (DNF / minterm) form, recognize why $\\text{NAND}$ and $\\text{NOR}$ are functionally complete, and group adjacent $1$s on a Karnaugh map to minimize a logic circuit.',
      builds: ['equivalences'],
      blocks: [
        { h: 'How Propositional Logic becomes Silicon Hardware' },
        {
          md: `In 1937, Claude Shannon wrote arguably the most influential master's thesis in history: he showed that George Boole's 1854 algebra of logic (Part [[#part:logic-foundations]]) is the **exact mathematical blueprint for digital switching circuits**!
In Boolean algebra on $\\{0, 1\\}$:
- **NOT ($\\bar{x}$ or $x'$):** Inverter gate ($1 - x$).
- **AND ($x \\cdot y$ or $xy$):** Multiplication on $\\{0, 1\\}$ (outputs $1$ iff both inputs are $1$).
- **OR ($x + y$):** Inclusive OR (outputs $1$ iff at least one input is $1$).

How do you build a hardware circuit for **any** desired truth table $f(x, y, z)$?
Look at the rows where the output column is **$1$**:
1. For each row where $f = 1$, write an AND product (**minterm**) that equals $1$ on **that exact row and $0$ everywhere else** (put $v$ if variable $v=1$ in that row, and $\\bar{v}$ if $v=0$).
   *(For example, row $(x=1, y=0, z=1)$ has minterm $x\\,\\bar{y}\\,z$.)*
2. OR ($+$) all those minterms together! That is the canonical **Sum-of-Products (SOP)** (or **Disjunctive Normal Form, DNF**).`,
        },
        { h: 'Universal Gates (NAND / NOR) and Karnaugh Maps (K-Maps)' },
        {
          md: `Since every truth table can be written with $\\{\\text{AND}, \\text{OR}, \\text{NOT}\\}$, that trio is **functionally complete**. Even better: a single **NAND** gate ($\\overline{x \\cdot y}$) is **functionally complete all by itself**!
- $\\text{NOT}(x) = \\text{NAND}(x, x) = \\overline{x \\cdot x} = \\bar{x}$
- $\\text{AND}(x, y) = \\text{NOT}(\\text{NAND}(x, y))$
- $\\text{OR}(x, y) = \\text{NAND}(\\bar{x}, \\bar{y})$ (by De Morgan's Law $\\overline{\\bar{x} \\cdot \\bar{y}} = x + y$!)

To make a circuit fast and cheap, we want the **fewest gates and wires** possible. Notice that whenever two minterms differ in **just one variable** (like $x y z$ and $x y \\bar{z}$), that variable cancels out by the Distributive + Complement laws:
$$x y z + x y \\bar{z} = x y (z + \\bar{z}) = x y (1) = x y$$
A **Karnaugh Map (K-Map)** arranges the truth table into a 2D grid using **Gray code order** (` + '`00, 01, 11, 10`' + `—where adjacent cells, including wrap-around edges, differ in **exactly 1 bit**!). Grouping any power-of-2 rectangle of $2^k$ adjacent $1$s eliminates $k$ variables at a glance!`,
        },
        {
          symbols: [
            ['\\bar{x},\\;x \\cdot y,\\;x + y', 'Boolean NOT, AND, OR', 'Circuit notation for $\\neg x,\\; x \\wedge y,\\; x \\vee y$ on $\\{0, 1\\}$', 'Identity: $x + x\\cdot y = x$; $x + \\bar{x}y = x + y$'],
            ['\\text{SOP / DNF}', 'Sum-of-Products (minterm expansion)', 'OR-sum of the AND-minterms for every row where $f = 1$', 'Row $(1, 0, 1) \\mapsto$ minterm $m_5 = x\\bar{y}z$'],
            ['\\text{NAND}(x, y) = \\overline{x \\cdot y}', 'universal NAND gate', 'Functionally complete on its own (can build NOT, AND, OR, and any circuit!)', 'Flash memory and CMOS chips are built from NAND/NOR'],
            ['2^k \\text{ K-map group}', 'Karnaugh map implicant', 'A $1\\times 2, 2\\times 2, 1\\times 4,$ or $2\\times 4$ block of $1$s eliminates $k$ variables', 'In 3 variables: a group of $4$ ones leaves $3 - 2 = 1$ variable!'],
          ],
        },
        {
          figure: 'KarnaughGateFig',
          caption: 'Toggle $1$s and $0$s in the 3-variable Karnaugh Map (notice the Gray code column order `00, 01, 11, 10`!) and watch the minimal Sum-of-Products expression and gate count update live.',
        },
        {
          worked: {
            title: 'Minimizing the Majority Gate $M(x, y, z)$ (outputs $1$ when at least 2 inputs are $1$)',
            steps: [
              ['1. List the $1$-rows', '$(0,1,1),\\;(1,0,1),\\;(1,1,0),\\;(1,1,1)$ ($4$ rows where $\\ge 2$ bits are $1$).', 'Canonical SOP has 4 minterms of 3 literals each'],
              ['2. Pair $(0,1,1)$ with $(1,1,1)$', '$\\bar{x}yz + xyz = (\\bar{x} + x)yz = yz$.', '$x$ changes while $y=1, z=1$ stay fixed!'],
              ['3. Pair $(1,0,1)$ and $(1,1,0)$ with $(1,1,1)$', '$x\\bar{y}z + xyz = xz$, and $xy\\bar{z} + xyz = xy$. (Idempotence $xyz + xyz + xyz = xyz$ lets us reuse $(1,1,1)$!)', 'In a K-map, overlapping groups are encouraged!'],
              ['4. Minimal SOP', '$M(x, y, z) = xy + yz + xz$.', '3 two-input AND gates + 1 OR gate!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'How many distinct Boolean functions $f: \\{0, 1\\}^3 \\to \\{0, 1\\}$ of $n = 3$ variables exist in total?',
            answer: 2 ** (2 ** 3),
            compute: () => 2 ** (2 ** 3),
            explain: 'A truth table with $n = 3$ variables has $2^3 = 8$ rows, and the output column can choose $0$ or $1$ independently in each of the $8$ rows: $2^{2^3} = 2^8 = 256$ Boolean functions.',
            misconceptions: [
              { answer: 8, feedback: '$8 = 2^3$ is the number of rows in ONE truth table; the number of different output columns of length 8 is $2^8 = 256$!' },
            ],
          },
        },
        {
          predict: {
            prompt: 'In a $4$-variable Karnaugh map ($16$ cells), if you form a rectangular group of **$8$ adjacent $1$s** ($2^3$ cells), how many variables remain in the simplified product term for that group?',
            answer: 4 - 3,
            compute: () => 4 - 3,
            explain: 'A group of $2^k = 2^3 = 8$ adjacent cells flips $k = 3$ variables across the block, eliminating $3$ of the $4$ variables and leaving just $4 - 3 = 1$ literal!',
          },
        },
        {
          choice: {
            prompt: 'Why are the columns of a Karnaugh map ordered **`00, 01, 11, 10`** (Gray code) instead of ordinary binary counting order `00, 01, 10, 11`?',
            options: [
              { text: 'So that **every pair of physically adjacent cells** (including wrapping around from the right edge `10` to the left edge `00`) differs in **at most $1$ bit**, allowing visual rectangles to correspond to valid algebraic cancellations $A B + A \\bar{B} = A$!', why: 'Yes! In ordinary binary `01` to `10`, *two* bits flip at once ($0 \\to 1$ and $1 \\to 0$), so adjacent cells wouldn\'t factor! Gray code changes only 1 bit per step.' },
              { text: 'Because `11` is smaller than `10` in Boolean algebra', why: 'It is ordered by single-bit transitions (a Hamiltonian cycle on the hypercube $Q_2$!), not numerical magnitude.' },
              { text: 'The column order doesn\'t matter as long as all 4 combinations appear', why: 'If `01` and `10` were next to each other, grouping them would try to simplify $\\bar{y}z + y\\bar{z}$ (XOR), which does NOT simplify to a single product term!' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Why is the set of gates $\\{\\text{AND}, \\text{OR}\\}$ (without NOT) **NOT** functionally complete?',
            options: [
              { text: 'Because both AND and OR preserve $0$ ($0 \\cdot 0 = 0$ and $0 + 0 = 0$, and they are monotone): any circuit built only from AND and OR must output $0$ when all inputs are $0$, so it can **never** compute $\\text{NOT}(x)$!', why: 'Yes! That is an **invariant** proof (lesson [[#contrapositive-cases]]): every composition of AND and OR maps $(0, \\dots, 0) \\mapsto 0$, whereas $\\bar{0} = 1$!' },
              { text: 'Because you cannot build XOR even with NOT', why: 'With AND, OR, and NOT, you can build $x\\bar{y} + \\bar{x}y = x \\oplus y$ and every other Boolean function.' },
              { text: '$\\{\\text{AND}, \\text{OR}\\}$ actually is functionally complete', why: 'Without negation (or a constant $1$ plus XOR), you can never invert a signal.' },
            ],
            answer: 0,
          },
        },
        {
          note: 'Every truth table turns into hardware via **Sum-of-Products** (OR of the AND-minterms for the $1$-rows). On a **Karnaugh map**, Gray code order (`00, 01, 11, 10`) guarantees that every $2^k$-cell rectangle of $1$s eliminates $k$ variables!',
        },
      ],
    },

    {
      id: 'automata-languages',
      title: 'Finite automata (DFAs), regular languages, and the limits of finite memory',
      goal: 'Trace a Deterministic Finite Automaton $M = (Q, \\Sigma, \\delta, q_0, F)$ on input strings, design DFAs using modular remainder states, and explain via the Pigeonhole Principle why $\\{0^n 1^n : n \\ge 0\\}$ cannot be recognized by any DFA.',
      builds: ['boolean-karnaugh', 'inclusion-exclusion', 'modular-arithmetic'],
      blocks: [
        { h: 'A machine with a fixed, finite number of states' },
        {
          md: `Every topics in this lab—logic, proofs, sets, counting, modular arithmetic, and directed graphs—converges in the mathematical model of a simple computer with finite memory: a **Deterministic Finite Automaton (DFA)**.

Given a finite **alphabet** $\\Sigma$ (such as $\\Sigma = \\{0, 1\\}$), a **string** $w \\in \\Sigma^*$ is a finite sequence of symbols (with $\\varepsilon$ denoting the empty string of length $0$), and a **formal language** $L \\subseteq \\Sigma^*$ is any set of strings.

A **DFA** is a 5-tuple $M = (Q, \\Sigma, \\delta, q_0, F)$:
1. $Q$: a **finite set of states** (the machine's entire memory!).
2. $\\Sigma$: the finite **input alphabet**.
3. $\\delta: Q \\times \\Sigma \\to Q$: the **transition function**—from every state $q \\in Q$ and for every symbol $a \\in \\Sigma$, there is **exactly one** outgoing arrow to the next state $\\delta(q, a)$.
4. $q_0 \\in Q$: the **start state** (marked with an incoming arrow $\\to q_0$).
5. $F \\subseteq Q$: the set of **accept (final) states** (drawn with a **double circle**).

A string $w = a_1 a_2 \\cdots a_k$ is **accepted** by $M$ if starting at $q_0$ and following the arrows for $a_1, a_2, \\dots, a_k$ ends in an accept state $q \\in F$! The set of all strings accepted by $M$ is the **language of $M$**, $L(M)$, and a language is called **regular** if some DFA recognizes it (equivalently, by **Kleene's Theorem**, if it can be described by a **regular expression**!).`,
        },
        { h: 'Why DFAs CANNOT recognize {0ⁿ1ⁿ}: The Pigeonhole / Pumping Lemma Proof!' },
        {
          md: `Can a DFA recognize the language of balanced $0$s followed by an equal number of $1$s:
$$L = \\{0^n 1^n \\mid n \\ge 0\\} = \\{\\varepsilon,\\; 01,\\; 0011,\\; 000111,\\; \\dots\\}\\text{?}$$

**Theorem:** $L = \\{0^n 1^n \\mid n \\ge 0\\}$ is **NOT regular** (no DFA with any finite number of states $k$ can recognize it!).
*Proof by Contradiction + Pigeonhole Principle (lesson [[#inclusion-exclusion]]):*
1. Suppose a DFA $M$ with **$k$ states** recognizes $L$.
2. Feed $M$ the prefixes $0^0, 0^1, 0^2, \\dots, 0^k$ ($k + 1$ different prefixes of $0$s).
3. Since there are **$k + 1$ prefixes (pigeons)** and only **$k$ states in $Q$ (pigeonholes)**, by the Pigeonhole Principle two different prefixes $0^i$ and $0^j$ ($i \\ne j$) must land in the **exact same state $q \\in Q$**!
4. Now append $1^i$ to both! Since $0^i$ and $0^j$ are in the **exact same state $q$** after reading the $0$s, following the arrows for $1^i$ from state $q$ must take both strings $0^i 1^i$ and $0^j 1^i$ to the **exact same final state**!
5. Since $0^i 1^i \\in L$ is accepted, $M$ is forced to **accept $0^j 1^i$ too**—even though $j \\ne i$! **Contradiction!** $\\blacksquare$
*(Counting arbitrarily high requires unbounded stack memory—a Pushdown Automaton / Context-Free Grammar, not a finite state machine!)*`,
        },
        {
          symbols: [
            ['M = (Q, \\Sigma, \\delta, q_0, F)', 'Deterministic Finite Automaton', 'Finite states $Q$, alphabet $\\Sigma$, transition $\\delta: Q\\times\\Sigma \\to Q$, start $q_0$, accept $F \\subseteq Q$', 'Every state has $|\Sigma|$ outgoing arrows'],
            ['\\Sigma^*,\\;\\varepsilon', 'all finite strings, empty string', '$\\Sigma^*$ is the countably infinite set of all finite strings over $\\Sigma$; $|\\varepsilon| = 0$', 'Notice $\\varepsilon \\in \\{0^n 1^n\\}$ for $n=0$'],
            ['r_{\\text{new}} = (2r + b) \\bmod m', 'binary remainder transition', 'Appending bit $b \\in \\{0, 1\\}$ to a binary number doubles its value and adds $b$', 'Builds a $m$-state DFA for "binary numbers divisible by $m$"!'],
            ['\\{0^n 1^n : n \\ge 0\\}', 'canonical non-regular language', 'Requires remembering unbounded count $n$; impossible with finite states $|Q| = k$ by Pigeonhole!', 'Needs a stack (Context-Free Language)'],
          ],
        },
        {
          figure: 'AutomatonSimFig',
          caption: 'Select a DFA (Even 1s, Ends in `01`, Binary Multiple of 3) and type or click any binary string to watch the active state hop along the transition arrows step by step.',
        },
        {
          worked: {
            title: 'Designing the 3-state DFA that accepts binary numbers divisible by $3$',
            steps: [
              ['States = remainders mod 3', '$Q = \\{q_0, q_1, q_2\\}$ where $q_r$ means "the bits read so far equal $r \\pmod 3$".', 'Start & accept at $q_0$ ($0 \\equiv 0 \\pmod 3$)'],
              ['Rule when bit $b$ arrives', 'Appending bit $b$ turns value $n$ into $2n + b$, so remainder $r \\mapsto (2r + b) \\bmod 3$!', 'Modular arithmetic from lesson [[#modular-arithmetic]]!'],
              ['Transition table $\\delta$', 'From $q_0$: $0 \\to q_0, 1 \\to q_1$. From $q_1$: $0 \\to q_2, 1 \\to q_0$ (since $2(1)+1 = 3 \\equiv 0$). From $q_2$: $0 \\to q_1, 1 \\to q_2$.', 'Trace `110` ($6_{10}$): $q_0 \\xrightarrow{1} q_1 \\xrightarrow{1} q_0 \\xrightarrow{0} q_0 \\in F \\checkmark$!'],
            ],
          },
        },
        {
          predict: {
            prompt: 'Trace the "Binary Multiple of 3" DFA ($r \\mapsto (2r + b) \\bmod 3$, starting at $r = 0$) on the binary string `1011` ($11$ in decimal). Which remainder state $r \\in \\{0, 1, 2\\}$ does it end in?',
            answer: 11 % 3,
            compute: () => 11 % 3,
            explain: 'Step by step: start at $0 \\xrightarrow{1} 1 \\xrightarrow{0} 2 \\xrightarrow{1} (2\\cdot 2 + 1) \\bmod 3 = 2 \\xrightarrow{1} (2\\cdot 2 + 1) \\bmod 3 = 2$. And indeed $1011_2 = 8 + 0 + 2 + 1 = 11 \\equiv 2 \\pmod 3$!',
          },
        },
        {
          predict: {
            prompt: 'What is the **minimum number of states** $|Q|$ needed for a DFA over $\\Sigma = \\{0, 1\\}$ to recognize the language of binary strings whose length is divisible by $4$ ($|w| \\equiv 0 \\pmod 4$)?',
            answer: 4,
            compute: () => 4,
            explain: 'The machine must track $|w| \\bmod 4 \\in \\{0, 1, 2, 3\\}$ in a 4-cycle $q_0 \\to q_1 \\to q_2 \\to q_3 \\to q_0$, requiring **4** states.',
          },
        },
        {
          choice: {
            prompt: 'Why CAN a 2-state DFA easily check *"Does $w$ have an equal number of $0$s and $1$s **modulo 2**"* (even difference), whereas NO finite automaton can check *"Does $w$ have the **exact** same number of $0$s and $1$s"*?',
            options: [
              { text: 'Modulo $2$ has only $2$ possible remainders ($0$ or $1$), which fits in $2$ states; exact equality requires remembering an arbitrary integer difference $c = (\\text{count of } 0\\text{s}) - (\\text{count of } 1\\text{s}) \\in \\mathbb{Z}$, which has infinitely many possible values!', why: 'Yes! A DFA\'s states ARE its memory: a $k$-state DFA has only $\\log_2 k$ bits of memory, so it can track any bounded/modular property, but never an unbounded counter!' },
              { text: 'Because a DFA can only read strings of length at most $k$', why: 'A DFA can read strings of any length (even millions of bits) by looping through its states!' },
              { text: 'A DFA can actually check exact equality using self-loops', why: 'Self-loops forget how many times they were traversed, so they cannot compare two unbounded counts.' },
            ],
            answer: 0,
          },
        },
        {
          choice: {
            prompt: 'Given a DFA $M = (Q, \\Sigma, \\delta, q_0, F)$ that accepts language $L$, how do you construct a DFA $M^c$ that accepts the **complement language** $\\overline{L} = \\Sigma^* \\setminus L$ (every string that $M$ rejects)?',
            options: [
              { text: 'Keep $Q, \\Sigma, \\delta,$ and $q_0$ completely unchanged, and simply **swap the accept and non-accept states**: $F_{\\text{new}} = Q \\setminus F$!', why: 'Yes! Because a DFA is deterministic and halts on every string in a unique state $q$, flipping which states have double circles ($Q \\setminus F$) immediately complements the language!' },
              { text: 'Reverse the direction of every arrow in $\\delta$', why: 'Reversing arrows recognises the *reversed* strings $w^R$, not the complement language.' },
              { text: 'Swap $0$ and $1$ on every transition arrow', why: 'Swapping $0 \\leftrightarrow 1$ bitwise-inverts the strings, rather than accepting the strings that were rejected.' },
            ],
            answer: 0,
          },
        },
        {
          puzzle: {
            id: 'automata',
            title: 'Finite Automaton (DFA) Circuit Designer',
            desc: 'Wire the transition table δ(q, σ) and accept states F yourself to pass 16 automated test strings!',
          },
        },
        {
          note: 'A **DFA** $M = (Q, \\Sigma, \\delta, q_0, F)$ is a finite directed graph where each state remembers one equivalence class of past inputs. When a language requires remembering **finitely many** cases (like remainders $\\bmod m$ or a fixed suffix), a DFA can recognize it; when it requires an **unbounded counter** (like $\\{0^n 1^n\\}$), the Pigeonhole Principle proves no DFA exists!',
        },
      ],
    },
  ],
}
