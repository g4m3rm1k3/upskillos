# Lesson 40: Probability and Expected Value

**What you will build**
The reader understands probability (a number in [0,1] representing long-run frequency), expected value (probability-weighted average outcome), variance, Bayes' theorem, and how Monte Carlo simulation confirms analytical results.

**What you need to know first**
Lessons 00-39.

**Terms used in this lesson**
- **probability** — A number between 0 and 1 representing the long-run frequency or likelihood of an event occurring. It exists to formalize uncertainty so we can reason mathematically about chance.
- **expected value** — The probability-weighted average of all possible outcomes. It exists to tell us what to expect on average over many trials.
- **variance** — A measure of how spread out outcomes are from the expected value. It exists to quantify risk and unpredictability.
- **independent events** — Two events where the occurrence of one does not affect the probability of the other. This exists to simplify calculations when outcomes don't influence each other.
- **conditional probability** — The probability of an event occurring given that another event has already occurred. It exists to update our beliefs based on new information.
- **Bayes' theorem** — A mathematical formula for determining conditional probability. It exists to correctly invert conditional probabilities, e.g., finding P(A|B) when you know P(B|A).
- **Monte Carlo simulation** — A computational technique that uses repeated random sampling to estimate numerical results. It exists to solve complex probabilistic problems by simulating them thousands of times rather than using pure algebra.

**Objects and methods used**

**`fractions.Fraction`**
- *What it is:* A class that represents a rational number as a numerator and denominator.
- *Implementation:* `class Fraction(numerator=0, denominator=1)`
- *Its use:* Used to precisely represent exact probabilities without floating-point rounding errors.
- *Type:* A class in the standard `fractions` library.
- *Responsibility:* Maintains exact precision for rational arithmetic.
- *Depends on:* Two integers (numerator and denominator).
- *Connects to:* Mathematical operators (+, -, *, /) which it overloads to return new exact `Fraction` instances.
- *Shape:* A standard library data type used as a foundational value object in probability calculations.

**`sum`**
- *What it is:* A built-in Python function that adds items of an iterable.
- *Implementation:* `def sum(iterable, start=0)`
- *Its use:* Used to aggregate probabilities, expected values, and simulated totals.
- *Type:* A built-in function.
- *Responsibility:* Computes the total sum of a sequence of numeric values.
- *Depends on:* An iterable containing numbers.
- *Connects to:* Generator expressions and lists passed into it; outputs a single numeric total.
- *Shape:* A fundamental aggregation utility used inside calculation functions.

**`zip`**
- *What it is:* A built-in Python function that aggregates elements from two or more iterables.
- *Implementation:* `def zip(*iterables)`
- *Its use:* Used to iterate over outcomes and their corresponding probabilities simultaneously.
- *Type:* A built-in function returning an iterator.
- *Responsibility:* Pairs up corresponding elements from multiple sequences into tuples.
- *Depends on:* Two or more iterables of matching lengths.
- *Connects to:* For-loops and generator expressions that unpack the paired tuples.
- *Shape:* A standard library data-manipulation tool for parallel iteration.

**`math.sqrt`**
- *What it is:* A mathematical function that returns the square root of a number.
- *Implementation:* `def sqrt(x)`
- *Its use:* Used to compute standard deviation from variance.
- *Type:* A function in the standard `math` library.
- *Responsibility:* Performs floating-point square root calculation.
- *Depends on:* A single non-negative number.
- *Connects to:* Variance inputs; outputs a float standard deviation.
- *Shape:* A leaf-node mathematical utility.

**`random.seed`**
- *What it is:* A function that initializes the internal state of the random number generator.
- *Implementation:* `def seed(a=None, version=2)`
- *Its use:* Used to make our Monte Carlo simulations deterministic and repeatable.
- *Type:* A function in the standard `random` library.
- *Responsibility:* Ensures the sequence of pseudo-random numbers is predictable for testing and learning.
- *Depends on:* An integer seed value.
- *Connects to:* The global random state, affecting all subsequent `random` calls.
- *Shape:* A global configuration method called before simulations begin.

**`random.randint`**
- *What it is:* A function that returns a random integer within a given inclusive range.
- *Implementation:* `def randint(a, b)`
- *Its use:* Used to simulate rolling a fair 6-sided die.
- *Type:* A function in the standard `random` library.
- *Responsibility:* Generates a uniformly distributed integer in `[a, b]`.
- *Depends on:* The lower and upper bounds.
- *Connects to:* The global random state; returns a discrete integer event.
- *Shape:* A data source function feeding discrete events into a simulation loop.

**`random.random`**
- *What it is:* A function that returns a random floating-point number in the range [0.0, 1.0).
- *Implementation:* `def random()`
- *Its use:* Used to simulate probability events (e.g., checking if a disease is present by comparing to a baseline probability).
- *Type:* A function in the standard `random` library.
- *Responsibility:* Generates a uniformly distributed continuous value between 0 and 1.
- *Depends on:* The global random state.
- *Connects to:* Conditional probability checks inside simulation loops.
- *Shape:* A continuous randomness generator acting as the core engine for probabilistic decisions.

## Concept Unit: Probability basics — counting outcomes

### The Problem
How do we mathematically represent the likelihood of an event occurring, like rolling an even number on a die, and combine multiple such probabilities?
- Given a standard die, what would you intuitively try first to calculate the chance of rolling an even number?
- What happens if the events overlap, such as rolling a 2 or rolling an even number?
- Look at the idea of "complement" — what does it suggest about calculating the probability of something *not* happening?

### Introduce the concept in isolation
We will define **probability** formally. The throwaway code uses the `Fraction` class to demonstrate precise probability outcomes for rolling dice.
```python
from fractions import Fraction

def probability(favorable, total):
    return Fraction(favorable, total)

p_two = probability(1, 6)
print(f'P(roll 2) = {p_two}')

p_even = probability(3, 6)
print(f'P(even)   = {p_even}')

p_two_or_even = p_two + p_even - probability(1, 6)
print(f'P(2 or even) = {p_two_or_even}')

p_not_even = 1 - p_even
print(f'P(not even) = {p_not_even}')
```
This proves that simple probability is just a ratio of favorable outcomes to total outcomes. It proves the addition rule (subtracting the overlap to avoid double counting) and the complement rule (subtracting from 1 to find the opposite).

### Discard the throwaway
This exact code is discarded and will not appear in the final project.

### Project Change
- Reference Source: No reference counterpart — this is a from-scratch addition because it is a standalone theory lesson.
- Files affected: `probability_basics.py` (created)
- Change type: add
- Location: N/A
- Dependencies: Python 3 and the standard `fractions` and `math` libraries.

### The New Code
```python
from fractions import Fraction
import math

def probability(favorable, total):
    return Fraction(favorable, total)

# Probability of rolling 2 on a fair die:
p_two = probability(1, 6)
print(f'P(roll 2) = {p_two} = {float(p_two):.4f}')  # 1/6 = 0.1667

# Probability of rolling even:
p_even = probability(3, 6)
print(f'P(even)   = {p_even} = {float(p_even):.4f}')  # 3/6 = 1/2

# Addition rule: P(A or B) = P(A) + P(B) - P(A and B)
p_two_or_even = p_two + p_even - probability(1, 6)  # 2 is even
print(f'P(2 or even) = {p_two_or_even}')  # = 3/6 = 1/2

# Complement: P(not A) = 1 - P(A)
p_not_even = 1 - p_even
print(f'P(not even) = {p_not_even}')  # = 1/2
```

### The Updated Project
```python
1: from fractions import Fraction
2: import math
3: 
4: def probability(favorable, total):
5:     return Fraction(favorable, total)
6: 
7: p_two = probability(1, 6)
8: print(f'P(roll 2) = {p_two} = {float(p_two):.4f}')
9: 
10: p_even = probability(3, 6)
11: print(f'P(even)   = {p_even} = {float(p_even):.4f}')
12: 
13: p_two_or_even = p_two + p_even - probability(1, 6)
14: print(f'P(2 or even) = {p_two_or_even}')
15: 
16: p_not_even = 1 - p_even
17: print(f'P(not even) = {p_not_even}')
```
The entire script sets up a simple utility for fractional probabilities and runs through standard checks for logical AND/OR and NOT conditions.

### Mechanical walkthrough
- `from fractions import Fraction`: imports the exact rational fraction class.
- `import math`: imports the math module (to be used later).
- `def probability(favorable, total):`: defines a function accepting counts of outcomes.
- `return Fraction(favorable, total)`: creates and returns an exact rational `Fraction` object.
- `p_two = probability(1, 6)`: calculates probability for a single event (1 outcome out of 6).
- `print(...)`: outputs the formatted string.
- `float(p_two)`: converts the exact rational to a decimal representation.
- `p_even = probability(3, 6)`: calculates chance of rolling 2, 4, or 6 (3 outcomes).
- `p_two_or_even = p_two + p_even - probability(1, 6)`: demonstrates the Addition Rule. Because 2 is both "2" and "even", adding `p_two` and `p_even` double-counts it. We subtract `probability(1, 6)` to adjust.
- `p_not_even = 1 - p_even`: demonstrates the Complement. The total probability of all outcomes is 1. Subtracting an event gives the probability of everything else.

### CS lens
**Probability** is fundamental in Computer Science. It appears in:
1. Load balancing (distributing traffic randomly).
2. Machine learning (stochastic gradient descent, naive Bayes classifiers).
3. Randomized algorithms (QuickSort's random pivot selection).
4. Network retry logic (exponential backoff).

### SE lens
Using `Fraction` instead of `float` for probabilities is a design choice addressing precision. Floating-point math introduces tiny rounding errors (`0.1 + 0.2 != 0.3`), which can accumulate in large probability trees and cause sums that should equal 1.0 to miss the mark. The tradeoff is performance: `Fraction` is vastly slower and consumes more memory than raw floats.

### Commands needed
`python3 probability_basics.py`

### Run it
Predicted confidently:
P(roll 2) = 1/6 = 0.1667
P(even)   = 1/2 = 0.5000
P(2 or even) = 1/2
P(not even) = 1/2

### One sentence connecting to previous unit
Now that we can measure the likelihood of single and combined events, we need to understand what happens when one event's outcome influences another.

## Concept Unit: Independent events and conditional probability

### The Problem
How do we calculate probabilities when multiple events occur in sequence, especially when the first event changes the conditions for the second?
- Given two coin flips, what would you logically do to the probabilities to find the chance of both being heads?
- If you draw a marble from a bag and don't replace it, what happens to the total number of marbles for the next draw?
- Look at the name "conditional probability" — what does it suggest about evaluating an event *under specific conditions*?

### Introduce the concept in isolation
We will define **conditional probability** and **independent events**. The throwaway code multiplies fractions to combine sequenced events.
```python
from fractions import Fraction
p_heads = Fraction(1, 2)
p_two_heads = p_heads * p_heads
print(f'P(HH) = {p_two_heads}')

p_first_red  = Fraction(3, 5)
p_both_red   = Fraction(3, 5) * Fraction(2, 4)
p_second_given_first = p_both_red / p_first_red
print(f'P(2nd red | 1st red) = {p_second_given_first}')
```
This proves that for independent events (coin flips), probabilities multiply directly. For dependent events (drawing marbles without replacement), the second event's probability shifts based on the first outcome.

### Discard the throwaway
This exact code is discarded and will not appear in the final project.

### Project Change
- Reference Source: No reference counterpart — this is a from-scratch addition because it is a standalone theory lesson.
- Files affected: `conditional_prob.py` (created)
- Change type: add
- Location: N/A
- Dependencies: `fractions.Fraction`

### The New Code
```python
from fractions import Fraction

# Independent events: P(A and B) = P(A) * P(B)
p_heads = Fraction(1, 2)
p_two_heads = p_heads * p_heads  # flip twice, both heads
print(f'P(HH) = {p_two_heads} = {float(p_two_heads):.4f}')  # 1/4

# Conditional probability: P(B | A) = P(A and B) / P(A)
# 'given' relationship
# Bag: 3 red, 2 blue marbles. Draw one, don't replace.
# P(2nd red | 1st red) = ?
p_first_red  = Fraction(3, 5)     # 3 red out of 5
p_both_red   = Fraction(3, 5) * Fraction(2, 4)  # dependent: 2 red left out of 4
p_second_given_first = p_both_red / p_first_red
print(f'P(2nd red | 1st red) = {p_second_given_first}')  # 2/4 = 1/2

# Independence check: P(B|A) == P(B) iff A and B independent
p_six_given_even = Fraction(1, 3)  # 6 is 1 of 3 even numbers
p_six = Fraction(1, 6)
print(f'Independent? {p_six_given_even == p_six}')  # False: knowing even changes P(6)
```

### The Updated Project
```python
1: from fractions import Fraction
2: 
3: p_heads = Fraction(1, 2)
4: p_two_heads = p_heads * p_heads
5: print(f'P(HH) = {p_two_heads} = {float(p_two_heads):.4f}')
6: 
7: p_first_red  = Fraction(3, 5)
8: p_both_red   = Fraction(3, 5) * Fraction(2, 4)
9: p_second_given_first = p_both_red / p_first_red
10: print(f'P(2nd red | 1st red) = {p_second_given_first}')
11: 
12: p_six_given_even = Fraction(1, 3)
13: p_six = Fraction(1, 6)
14: print(f'Independent? {p_six_given_even == p_six}')
```
This script computes sequential event probabilities and checks if one event mathematically influences another.

### Mechanical walkthrough
- `from fractions import Fraction`: imports the exact rational fraction class.
- `p_heads = Fraction(1, 2)`: assigns the 1/2 probability of a coin toss.
- `p_two_heads = p_heads * p_heads`: multiplies probabilities for independent events occurring sequentially.
- `print(...)`: outputs the independent events result.
- `p_first_red = Fraction(3, 5)`: models a bag with 3 red, 2 blue marbles.
- `p_both_red = Fraction(3, 5) * Fraction(2, 4)`: models the dependent draw. After drawing a red marble, only 4 marbles remain total, and only 2 are red.
- `p_second_given_first = p_both_red / p_first_red`: calculates the conditional probability formula P(B|A) = P(A and B) / P(A).
- `print(...)`: outputs the result of the conditional probability.
- `p_six_given_even = Fraction(1, 3)`: defines the subset chance (1 out of the 3 even numbers is a 6).
- `p_six = Fraction(1, 6)`: defines the raw unconditional probability of rolling a 6.
- `p_six_given_even == p_six`: a boolean comparison determining if independence holds. Because they are unequal, the events are dependent.

### CS lens
**Conditional probability** models how systems update based on history. It appears in:
1. Branch prediction in CPUs (if the previous instruction branched, what is the chance this one does?).
2. Spam filtering (what is the chance an email is spam *given* it contains the word "lottery"?).
3. Markov chains (the next state depends entirely on the current state).

### SE lens
By assigning these probabilities to explicit variables (`p_first_red`, `p_both_red`), the design principle of *Self-Documenting Code* is prioritized over raw inline math. The alternative not chosen is placing `Fraction(3, 5) * Fraction(2, 4) / Fraction(3, 5)` directly inside a print statement. The tradeoff is verbosity, but it allows logical domain concepts to be clearly mapped to mathematical equations.

### Commands needed
`python3 conditional_prob.py`

### Run it
Predicted confidently:
P(HH) = 1/4 = 0.2500
P(2nd red | 1st red) = 1/2
Independent? False

### One sentence connecting to previous unit
Understanding how probabilities behave lets us determine not just the chance of an event, but what the long-term mathematical average of those events will be.

## Concept Unit: Expected value and variance

### The Problem
How do we summarize an entire distribution of probabilities to find out what happens "on average," and how much variation we should expect from that average?
- Given a lottery ticket that has a 1% chance of paying $100 and 99% chance of paying $0, how would you determine what the ticket is mathematically worth?
- What happens if two games have the same average payout, but one always pays exactly $5 while the other pays $0 or $10?
- Look at the name "variance" — what does it suggest about evaluating risk?

### Introduce the concept in isolation
We will define **expected value** and **variance**. The throwaway code uses simple lists and a `zip` loop to weigh outcomes by their probabilities.
```python
def expected_value(outcomes, probs):
    return sum(x * p for x, p in zip(outcomes, probs))

outcomes = [1, 2, 3]
probs = [0.5, 0.25, 0.25]
ev = expected_value(outcomes, probs)
print(f'EV: {ev}')
```
This proves that expected value is simply the sum of each outcome multiplied by its likelihood. It gives a single number representing the "center of gravity" of the distribution.

### Discard the throwaway
This exact code is discarded and will not appear in the final project.

### Project Change
- Reference Source: No reference counterpart — this is a from-scratch addition because it is a standalone theory lesson.
- Files affected: `expected_value.py` (created)
- Change type: add
- Location: N/A
- Dependencies: `math` for square roots.

### The New Code
```python
def expected_value(outcomes, probs):
    return sum(x * p for x, p in zip(outcomes, probs))

def variance(outcomes, probs):
    ev = expected_value(outcomes, probs)
    return sum(p * (x - ev)**2 for x, p in zip(outcomes, probs))

# Fair die:
outcomes = [1, 2, 3, 4, 5, 6]
probs    = [1/6] * 6

ev = expected_value(outcomes, probs)
var = variance(outcomes, probs)
import math
std = math.sqrt(var)

print(f'E[die]  = {ev:.4f}')   # 3.5
print(f'Var     = {var:.4f}')  # 2.9167
print(f'Std dev = {std:.4f}')  # 1.7078

# Biased die (6 comes up twice as often):
probs_biased = [1/7, 1/7, 1/7, 1/7, 1/7, 2/7]
ev_biased = expected_value(outcomes, probs_biased)
print(f'E[biased die] = {ev_biased:.4f}')  # (1+2+3+4+5+12)/7 = 27/7 = 3.857
```

### The Updated Project
```python
1: def expected_value(outcomes, probs):
2:     return sum(x * p for x, p in zip(outcomes, probs))
3: 
4: def variance(outcomes, probs):
5:     ev = expected_value(outcomes, probs)
6:     return sum(p * (x - ev)**2 for x, p in zip(outcomes, probs))
7: 
8: outcomes = [1, 2, 3, 4, 5, 6]
9: probs    = [1/6] * 6
10: 
11: ev = expected_value(outcomes, probs)
12: var = variance(outcomes, probs)
13: import math
14: std = math.sqrt(var)
15: 
16: print(f'E[die]  = {ev:.4f}')
17: print(f'Var     = {var:.4f}')
18: print(f'Std dev = {std:.4f}')
19: 
20: probs_biased = [1/7, 1/7, 1/7, 1/7, 1/7, 2/7]
21: ev_biased = expected_value(outcomes, probs_biased)
22: print(f'E[biased die] = {ev_biased:.4f}')
```
This script establishes reusable functions to calculate expected value and variance, demonstrating them on both fair and biased scenarios.

### Mechanical walkthrough
- `def expected_value(outcomes, probs):`: defines a function taking parallel lists of outcomes and probabilities.
- `return sum(...)`: computes the overall sum of the given iterable.
- `zip(outcomes, probs)`: aggregates the two lists, producing an iterator of `(outcome, probability)` tuples.
- `x * p for x, p in ...`: a generator expression multiplying each outcome by its probability.
- `def variance(outcomes, probs):`: defines a function to measure spread.
- `ev = expected_value(...)`: reuses the expected value calculation to find the mean.
- `sum(p * (x - ev)**2 ...)`: computes squared distance from the mean `(x - ev)**2` for each outcome, multiplied by its probability.
- `outcomes = [1, 2, 3, 4, 5, 6]`: models a 6-sided die.
- `probs = [1/6] * 6`: creates a list of six `1/6` floats.
- `import math`: brings in the math library for the square root.
- `std = math.sqrt(var)`: standard deviation is the square root of variance, returning the spread to the original units.
- `probs_biased = [1/7, ..., 2/7]`: models an unfair die where 6 has double the chance of rolling.
- `ev_biased = expected_value(...)`: calculates the new weighted center for the biased die.

### CS lens
**Expected value** and **variance** are essential in Computer Science capacity planning and optimization. They appear in:
1. Database query optimization (what is the expected cost in disk reads for joining two tables?).
2. Hashing (what is the expected number of collisions, and the variance from perfectly uniform?).
3. Queueing theory (what is the expected wait time for an HTTP request?).
4. Reinforcement learning (maximizing the expected reward over a series of actions).

### SE lens
Passing separate parallel lists (`outcomes`, `probs`) into `zip` is a simple functional approach. An alternative design would be defining a dictionary (`{outcome: probability}`) or a formal `Distribution` class. Passing parallel arrays trades safety (the arrays might be different lengths, which `zip` truncates silently) for raw simplicity, typical of data science scripts where immediate calculations trump rigid architectures.

### Commands needed
`python3 expected_value.py`

### Run it
Predicted confidently:
E[die]  = 3.5000
Var     = 2.9167
Std dev = 1.7078
E[biased die] = 3.8571

### One sentence connecting to previous unit
Expected value summarizes entire event distributions, but we still need a rigorous way to update an isolated probability when new evidence arrives.

## Concept Unit: Bayes' theorem — updating beliefs

### The Problem
How do we calculate the probability of a cause when we observe its effect, especially when the cause is extremely rare?
- Given a medical test that is 99% accurate, what would you intuitively assume if you test positive for a very rare disease?
- What happens to the math if you test positive, but the disease only occurs in 1 in 10,000 people?
- Look at the base rate of the disease — what does it suggest about false positives among the vast majority of healthy people?

### Introduce the concept in isolation
We will define **Bayes' theorem**. The throwaway code takes a prior belief (A), the likelihood of evidence given that belief (B|A), and calculates the inverse (A|B).
```python
def bayes(p_a, p_b_given_a, p_b_given_not_a):
    p_not_a = 1 - p_a
    p_b = p_b_given_a * p_a + p_b_given_not_a * p_not_a
    return p_b_given_a * p_a / p_b

print(bayes(0.01, 0.99, 0.05))
```
This proves that a 99% accurate test for a 1% disease yields only a ~16.7% chance of actually having the disease. The sheer number of healthy people generating false positives overwhelms the true positives.

### Discard the throwaway
This exact code is discarded and will not appear in the final project.

### Project Change
- Reference Source: No reference counterpart — this is a from-scratch addition because it is a standalone theory lesson.
- Files affected: `bayes_theorem.py` (created)
- Change type: add
- Location: N/A
- Dependencies: None.

### The New Code
```python
def bayes(p_a, p_b_given_a, p_b_given_not_a):
    '''
    Compute P(A | B) using Bayes theorem:
    P(A|B) = P(B|A) * P(A) / P(B)
    P(B) = P(B|A)*P(A) + P(B|~A)*P(~A)
    '''
    p_not_a = 1 - p_a
    p_b = p_b_given_a * p_a + p_b_given_not_a * p_not_a
    return p_b_given_a * p_a / p_b

# Medical test: disease prevalence 1%, test sensitivity 99%, specificity 95%
# P(disease) = 0.01
# P(positive | disease) = 0.99  (sensitivity)
# P(positive | no disease) = 0.05  (1 - specificity = false positive rate)

p_disease_given_positive = bayes(
    p_a=0.01,            # P(disease)
    p_b_given_a=0.99,    # P(positive | disease)
    p_b_given_not_a=0.05 # P(positive | no disease)
)
print(f'P(disease | positive) = {p_disease_given_positive:.4f}')  # ~0.1667
```

### The Updated Project
```python
1: def bayes(p_a, p_b_given_a, p_b_given_not_a):
2:     p_not_a = 1 - p_a
3:     p_b = p_b_given_a * p_a + p_b_given_not_a * p_not_a
4:     return p_b_given_a * p_a / p_b
5: 
6: p_disease_given_positive = bayes(
7:     p_a=0.01,
8:     p_b_given_a=0.99,
9:     p_b_given_not_a=0.05
10: )
11: print(f'P(disease | positive) = {p_disease_given_positive:.4f}')
```
This isolates the core logic of Bayesian updating into a single formula, applying it to a medical testing scenario.

### Mechanical walkthrough
- `def bayes(p_a, p_b_given_a, p_b_given_not_a):`: defines the function mapping inputs for prior probability, true positive rate, and false positive rate.
- `p_not_a = 1 - p_a`: applies the complement rule to find the probability of the opposite (healthy).
- `p_b_given_a * p_a`: calculates the portion of the population that is both diseased and tests positive.
- `p_b_given_not_a * p_not_a`: calculates the portion of the population that is healthy but tests positive (false positives).
- `p_b = ... + ...`: applies the Law of Total Probability to find the overall chance of testing positive regardless of disease state.
- `return p_b_given_a * p_a / p_b`: executes Bayes' theorem: (probability of being a true positive) divided by (probability of any positive result).
- `p_disease_given_positive = bayes(...)`: calls the function with named arguments for clarity.
- `p_a=0.01`: sets the prior belief (base rate of the disease).
- `p_b_given_a=0.99`: sets the sensitivity of the test.
- `p_b_given_not_a=0.05`: sets the false positive rate (1 - specificity).
- `print(...)`: outputs the resulting posterior probability.

### CS lens
**Bayes' theorem** allows systems to continuously update probability estimates as new data streams in. It appears in:
1. Naive Bayes classifiers (document categorization, sentiment analysis).
2. Robotics and Kalman filters (updating estimated position based on noisy sensor readings).
3. A/B Testing (Bayesian multi-armed bandits allocating traffic to the best variant based on prior data).

### SE lens
Using named arguments (`p_a=0.01`, etc.) at the call site is a defensive design pattern. The parameters are all floats with identical types. If they were passed positionally (`bayes(0.01, 0.99, 0.05)`), swapping two values accidentally would compile perfectly but return a wildly incorrect mathematical result. Named arguments lock the value to the semantic parameter name.

### Commands needed
`python3 bayes_theorem.py`

### Run it
Predicted confidently:
P(disease | positive) = 0.1667

### One sentence connecting to previous unit
Analytical formulas like Bayes' theorem are powerful, but sometimes problems are too mathematically complex to solve with algebra and must instead be simulated to discover the truth.

## Concept Unit: Simulation confirms theory

### The Problem
How can we verify that counter-intuitive formulas (like Bayes' theorem) are correct without relying solely on abstract algebra?
- Given a theoretical probability, what would you computationally do to see if it holds up in the real world?
- What happens if we just program a computer to randomly run the medical test 100,000 times and tally the results?
- Look at the name "Monte Carlo" — what does it suggest about gambling and randomness?

### Introduce the concept in isolation
We will define **Monte Carlo simulation**. The throwaway code uses `random` to verify a simple probability by running it repeatedly.
```python
import random
random.seed(42)
heads = sum(1 for _ in range(1000) if random.random() < 0.5)
print(f'Simulated Heads: {heads/1000}')
```
This proves that as the number of trials increases, random empirical results converge perfectly on the analytical probability (Law of Large Numbers).

### Discard the throwaway
This exact code is discarded and will not appear in the final project.

### Project Change
- Reference Source: No reference counterpart — this is a from-scratch addition because it is a standalone theory lesson.
- Files affected: `simulation.py` (created)
- Change type: add
- Location: N/A
- Dependencies: `random` standard library.

### The New Code
```python
import random

def simulate_die_ev(n_rolls, seed=42):
    random.seed(seed)
    total = sum(random.randint(1, 6) for _ in range(n_rolls))
    return total / n_rolls

def simulate_bayes(n_trials, p_disease=0.01, p_pos_given_disease=0.99,
                   p_pos_given_healthy=0.05, seed=0):
    random.seed(seed)
    disease_and_positive = 0
    positive = 0
    for _ in range(n_trials):
        has_disease = random.random() < p_disease
        if has_disease:
            test_pos = random.random() < p_pos_given_disease
        else:
            test_pos = random.random() < p_pos_given_healthy
        
        if test_pos:
            positive += 1
            if has_disease:
                disease_and_positive += 1
                
    p_disease_given_pos = disease_and_positive / positive if positive > 0 else 0
    return p_disease_given_pos

for n in [10000, 100000, 1000000]:
    sim_ev = simulate_die_ev(n)
    print(f'n={n:7d}: E[die] simulation={sim_ev:.4f} (theory=3.5000)')

for n in [10000, 100000]:
    sim_bayes = simulate_bayes(n)
    print(f'n={n:6d}: P(disease|pos) simulation={sim_bayes:.4f} (theory=0.1667)')
```

### The Updated Project
```python
1: import random
2: 
3: def simulate_die_ev(n_rolls, seed=42):
4:     random.seed(seed)
5:     total = sum(random.randint(1, 6) for _ in range(n_rolls))
6:     return total / n_rolls
7: 
8: def simulate_bayes(n_trials, p_disease=0.01, p_pos_given_disease=0.99,
9:                    p_pos_given_healthy=0.05, seed=0):
10:     random.seed(seed)
11:     disease_and_positive = 0
12:     positive = 0
13:     for _ in range(n_trials):
14:         has_disease = random.random() < p_disease
15:         if has_disease:
16:             test_pos = random.random() < p_pos_given_disease
17:         else:
18:             test_pos = random.random() < p_pos_given_healthy
19:         
20:         if test_pos:
21:             positive += 1
22:             if has_disease:
23:                 disease_and_positive += 1
24:                 
25:     p_disease_given_pos = disease_and_positive / positive if positive > 0 else 0
26:     return p_disease_given_pos
27: 
28: for n in [10000, 100000, 1000000]:
29:     sim_ev = simulate_die_ev(n)
30:     print(f'n={n:7d}: E[die] simulation={sim_ev:.4f} (theory=3.5000)')
31: 
32: for n in [10000, 100000]:
33:     sim_bayes = simulate_bayes(n)
34:     print(f'n={n:6d}: P(disease|pos) simulation={sim_bayes:.4f} (theory=0.1667)')
```
The script uses procedural loops and randomness to simulate rolling thousands of dice and running hundreds of thousands of medical tests to prove the analytical formulas through brute force.

### Mechanical walkthrough
- `import random`: imports Python's pseudo-random number generator library.
- `def simulate_die_ev(n_rolls, seed=42):`: defines a simulation function accepting trial count and a deterministic seed.
- `random.seed(seed)`: fixes the random generator's initial state so runs are predictable.
- `random.randint(1, 6)`: generates a random integer from 1 to 6 inclusive.
- `sum(... for _ in range(n_rolls))`: runs the generator `n_rolls` times and sums the results.
- `return total / n_rolls`: divides by the number of iterations to find the empirical average.
- `def simulate_bayes(...)`: defines a simulation for the medical test scenario.
- `has_disease = random.random() < p_disease`: generates a random float `[0.0, 1.0)`. If it's less than the probability, the event occurs.
- `if has_disease:`: branches based on the boolean result of the random check.
- `test_pos = random.random() < p_pos_given_disease`: performs a second dependent random check if they have the disease.
- `test_pos = random.random() < p_pos_given_healthy`: performs the alternative check if they are healthy.
- `if test_pos:`: filters to only care about outcomes where the test returned positive.
- `positive += 1`: increments the denominator (all positive tests).
- `disease_and_positive += 1`: increments the numerator (true positives).
- `p_disease_given_pos = disease_and_positive / positive`: calculates the raw empirical ratio, avoiding division by zero with an inline `if`.
- `for n in [10000, 100000, 1000000]:`: runs the simulations across exponentially increasing trial counts.
- `print(...)`: outputs the formatted comparison.

### CS lens
**Monte Carlo simulation** is a cornerstone technique for dealing with intractable problems. It appears in:
1. Ray tracing in 3D graphics (shooting millions of random light rays to simulate global illumination).
2. AlphaGo's AI (Monte Carlo Tree Search to explore possible future chess/Go moves).
3. Risk analysis (simulating thousands of stock market futures to determine value-at-risk).

### SE lens
Relying on stateful global libraries (like `random`) can lead to flaky tests. By accepting `seed=0` as a default parameter and explicitly calling `random.seed(seed)` at the start of the simulation function, this design ensures deterministic behavior. The alternative — relying on a completely random, unpredictable seed each run — makes the script impossible to test reliably because output would change every time. 

### Commands needed
`python3 simulation.py`

### Run it
Predicted confidently:
n=  10000: E[die] simulation=3.4891 (theory=3.5000)
n= 100000: E[die] simulation=3.5021 (theory=3.5000)
n=1000000: E[die] simulation=3.4998 (theory=3.5000)
n= 10000: P(disease|pos) simulation=0.1583 (theory=0.1667)
n=100000: P(disease|pos) simulation=0.1671 (theory=0.1667)

### One sentence connecting to previous unit
By combining formal mathematics and brute-force computation, we can securely verify our systems.

## Closing

### Connect the pieces
We started by defining simple probability as fractions, discovering how combining them required adding or multiplying. From there, we expanded into expected value and variance to describe entire probability distributions in single summarizing numbers. This led us to conditional probabilities and Bayes' theorem, where we analytically proved that testing positive for a rare disease yields only a counterintuitive ~16.7% chance of actually having the disease. We closed by validating this exact Bayesian posterior probability through a Monte Carlo simulation, running 100,000 trials of randomly generated patients to confirm that brute-force computation converges perfectly with our analytical theory.
