// Guttag — Lesson 37: Randomness and Stochastic Simulation
// Auto-converted from src/docs/tutorials/guttag-python/lesson-37.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-37-randomness-and-stochastic-simulation',
  slug: 'randomness-and-stochastic-simulation',
  chapter: 6,
  order: 1,
  title: 'Randomness and Stochastic Simulation',
  subtitle: 'Stochastic Thinking and Simulation',
  tags: ['pseudo-randomness', 'law-of-large-numbers', 'monte-carlo-simulation', 'standard-error', 'seed', 'mersenne-twister'],

  hook: {
    question: 'What is "Randomness and Stochastic Simulation", and why does it matter?',
    realWorldContext: '',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 7 core ideas: Pseudo-randomness and Seeds, The random module — full survey, Simulating coin flips — law of large numbers, The birthday paradox simulation, Monte Carlo estimation of π, Simulating a dice game — Craps, How many trials are enough? Standard error.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Pseudo-randomness:** A process that appears random but is driven by a deterministic algorithm starting from an initial state called a seed. It solves the problem of needing random-like sequences in software while maintaining the ability to debug and reproduce results.\n- **Law of Large Numbers:** A statistical theorem stating that as the number of identically distributed, randomly generated variables increases, their sample mean converges to their true theoretical probability. It guarantees that simulations become more accurate with more trials.\n- **Monte Carlo Simulation:** A computational algorithm that relies on repeated random sampling to obtain numerical results. It solves problems where analytical or exact combinatorial solutions are too complex or impossible to derive.\n- **Standard Error:** A measure of the statistical accuracy of an estimate. It provides a boundary on how far the empirical result might be from the true probability, dictating how many trials are necessary for a desired precision.\n- **Seed:** An initial value provided to a PRNG to dictate its starting state. It allows developers to lock the sequence of random numbers, ensuring that "random" experiments can be perfectly re-run.\n- **Mersenne Twister:** The specific deterministic algorithm used by Python\'s random module under the hood to generate its sequence of numbers. It provides a long period and good statistical properties for non-cryptographic use.\n- **Gaussian Distribution:** A continuous probability distribution (the "bell curve") characterized by a mean and standard deviation. It models many natural phenomena, such as human heights or measurement errors.\n- **Uniform Distribution:** A probability distribution where every value within a given continuous or discrete range is equally likely to be chosen.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **random:** The Python standard library module for generating pseudo-random numbers.\n- **random.seed:** A function to initialize the PRNG state.\n- **random.random:** A function that returns the next random floating point number in the range [0.0, 1.0).\n- **random.uniform:** A function that returns a random floating point number between two bounds.\n- **random.randint:** A function that returns a random integer between a lower and upper bound, inclusive.\n- **random.randrange:** A function that returns a randomly selected element from a range.\n- **random.choice:** A function that returns a random element from a non-empty sequence.\n- **random.choices:** A function that returns a list of elements chosen from a sequence with replacement.\n- **random.shuffle:** A function that shuffles a sequence in place.\n- **random.sample:** A function that returns a new list containing unique elements chosen from a population.\n- **random.gauss:** A function that returns a random float drawn from a Gaussian distribution.\n- **math:** The Python standard library module for mathematical functions and constants.\n- **math.pi:** The mathematical constant π.\n- **math.ceil:** A function that returns the ceiling of a number.\n- **abs:** A built-in Python function that returns the absolute value of a number.\n- **sum:** A built-in Python function that returns the sum of a \'iterable\' of numbers.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'A simulation starts with `random.seed()` to ensure the entire experiment is reproducible. Inside a loop bounded by the `needed_trials` calculation to guarantee precision, the code generates individual probabilistic events using `random.random()` or `random.randint()`. These events are combined to simulate a real-world process like dice rolling or point sampling. The successes are aggregated, and finally divided by the total trial count to yield an empirical probability that converges on the truth. Randomness and simulation form the foundation of Module 5; Lesson 38 builds on this by introducing random walks.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 37: Randomness and Stochastic Simulation',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Randomness and Stochastic Simulation',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Pseudo-randomness and Seeds',
              prose: [
                'We want our code to behave randomly to simulate real-world chance, but computers are inherently deterministic machines designed to follow exact instructions. How do we get unpredictable behavior from a machine that can only do what it is told? And furthermore, if our code is broken, how can we debug a "random" failure if it never happens exactly the same way twice? *Pause and think: Given what variables and state already do, how would you design a function that returns a different, seemingly random number every time it is called? What happens if you want a colleague to test your random game and get the exact same sequence of events you did?*',
                'Output: ``` 0.20524458514138672 ``` This proves that by providing a specific starting value, the pseudo-random number generator produces a predictable result. This starting value is called a **seed**.'
              ],
              typeIt: true,
              solution: 'import random\nrandom.seed(99)\nprint(random.random())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Pseudo-randomness and Seeds — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import random` — Imports the standard library module `random`, giving us access to Python\'s Mersenne Twister PRNG.\n- `random.random()` — An instance call on the `random` module that returns the next pseudo-random floating point number in the range [0.0, 1.0). When called without a seed, Python automatically seeds it with an unpredictable value from the operating system, meaning this will be different on every run.\n- `random.seed(42)` — A function call that resets the PRNG\'s internal state to a specific starting point determined by the integer `42`.\n- `random.random()` — Because the PRNG is now seeded, this call will always return `0.6394267984578837`, no matter how many times you run the script.\n- `random.random()` — The next call advances the internal state predictably, returning `0.025010755222666936` every time.\n- `random.seed(42)` — Resets the PRNG\'s state back to exactly where it was previously.\n- `random.random()` — Returns `0.6394267984578837` again, proving that the sequence of "random" numbers is entirely deterministic based on the seed.',
                '**Expected behavior.** ``` 0.8444218515250481 0.6394267984578837 0.025010755222666936 0.6394267984578837 ``` (Note: The first value will vary on your machine since it is unseeded).',
                '**CS lens.** This embodies the concept of a **Pseudo-Random Number Generator (PRNG)**. A PRNG is a deterministic algorithm that produces a sequence of numbers that approximates the properties of random numbers. Also recognized in: cryptography (though using different, cryptographically secure algorithms), procedural generation in video games, hash functions, and automated test data generation.',
                '**SE lens.** The design principle here is **Reproducibility**. By allowing the developer to set the seed, the language authors chose to expose the deterministic nature of the PRNG rather than hiding it. The alternative would be to force true unpredictability at all times, which would make reproducing and debugging edge cases in randomized systems nearly impossible. The tradeoff is that developers must remember to *not* use a fixed seed in production code unless reproducibility is explicitly desired.'
              ],
              typeIt: true,
              solution: 'import random\n\n# Without seed: different each run\nprint(random.random())\n\n# With seed: reproducible\nrandom.seed(42)\nprint(random.random())\nprint(random.random())\nrandom.seed(42)\nprint(random.random())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'The random module — full survey',
              prose: [
                'If `random.random()` only gives us floats between 0 and 1, how do we simulate rolling a 6-sided die, or picking a random card from a deck? We could manually multiply the 0-1 float and round it, but doing that correctly without introducing bias is error-prone. *Pause and think: If you had to pick a random integer between 1 and 10 using only a float between 0.0 and 1.0, what math would you write? What edge cases might occur if the float is exactly 0.0 or very close to 1.0?*',
                'Output: ``` 3 ``` This proves that the library provides built-in methods for discrete selections, avoiding manual math. This is called a **distribution generator**.'
              ],
              typeIt: true,
              solution: 'import random\nprint(random.randint(1, 10))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'The random module — full survey — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import random` — Imports the `random` module.\n- `random.seed(0)` — Sets the PRNG seed to `0` for perfect reproducibility across all following calls.\n- `random.random()` — Returns a random float in the range [0.0, 1.0).\n- `random.uniform(1, 10)` — Returns a random float uniformly distributed between `1` and `10`.\n- `random.randint(1, 6)` — Returns a random integer between `1` and `6` inclusive, perfectly simulating a 6-sided die.\n- `random.randrange(0, 10, 2)` — Returns a random integer from the sequence `0, 2, 4, 6, 8`.\n- `random.choice([\'a\',\'b\',\'c\'])` — Returns one randomly selected string element from the provided list.\n- `random.choices([\'H\',\'T\'], k=5)` — Returns a new list of `5` elements drawn from `[\'H\',\'T\']` with replacement (meaning \'H\' can be drawn multiple times).\n- `lst = [1, 2, 3, 4, 5]` — Initializes a standard Python list.\n- `random.shuffle(lst)` — Mutates `lst` in place, reordering its elements randomly.\n- `print(lst)` — Prints the shuffled list.\n- `random.sample(range(10), 3)` — Returns a new list of `3` unique elements drawn from `0` to `9` without replacement (no duplicates).\n- `random.gauss(0, 1)` — Returns a random float drawn from a Gaussian (normal) distribution with a mean of `0` and a standard deviation of `1`.',
                '**Expected behavior.** ``` 0.8444218515250481 7.579544029403025 4 6 c [\'H\', \'H\', \'H\', \'T\', \'H\'] [4, 3, 1, 2, 5] [6, 9, 0] -0.08272914101456952 ```',
                '**CS lens.** This embodies the concept of **Probability Distributions**. Different problems require different mathematical shapes of randomness — uniform for dice, Gaussian for natural traits, discrete choices for categories. Also recognized in: statistical modeling, machine learning weight initialization, load balancing algorithms, and randomized routing.',
                '**SE lens.** The design principle here is **API Breadth vs. Orthogonality**. The Python authors could have provided only `random.random()` and forced users to build everything else themselves. Instead, they chose to provide a wide, specialized API because writing unbiased scaling and sampling math is notoriously difficult to get right. The tradeoff is a larger module surface area, but it prevents thousands of subtle bugs in user code.'
              ],
              typeIt: true,
              solution: 'import random\nrandom.seed(0)\n\nprint(random.random())\nprint(random.uniform(1, 10))\nprint(random.randint(1, 6))\nprint(random.randrange(0, 10, 2))\nprint(random.choice([\'a\',\'b\',\'c\']))\nprint(random.choices([\'H\',\'T\'], k=5))\n\nlst = [1, 2, 3, 4, 5]\nrandom.shuffle(lst)\nprint(lst)\nprint(random.sample(range(10), 3))\nprint(random.gauss(0, 1))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Simulating coin flips — law of large numbers',
              prose: [
                'We know theoretically that a fair coin will land on heads 50% of the time. But if we flip a coin 10 times, we might get 4 heads, or 7. How do we prove computationally that the empirical result actually approaches the theoretical probability? *Pause and think: How would you write a loop to flip a coin `n` times and count the heads? If you run it for 10 flips versus 1,000 flips, what difference do you expect in the ratio of heads to total flips?*',
                'Output: ``` 4 ``` This proves that we can map a uniform 0.0-1.0 float to a boolean event by checking a threshold. This is called an **empirical trial**.'
              ],
              typeIt: true,
              solution: 'import random\nrandom.seed(42)\nheads = sum(1 for _ in range(10) if random.random() < 0.5)\nprint(heads)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Simulating coin flips — law of large numbers — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import random` — Imports the `random` module.\n- `def coin_flip_experiment(n_flips, seed=42):` — Defines a function taking the number of flips to perform and an optional seed.\n- `random.seed(seed)` — Ensures each experiment run with a specific `n` starts from the same deterministic state.\n- `random.random() < 0.5` — Generates a float [0.0, 1.0) and evaluates to `True` roughly 50% of the time, simulating a fair coin flip.\n- `1 for _ in range(n_flips) if ...` — A generator expression that produces a `1` for every time the coin flip condition evaluates to `True`.\n- `sum(...)` — The built-in Python function that aggregates the `1`s, giving the total count of heads.\n- `return heads / n_flips` — Calculates the empirical frequency (ratio) of heads.\n- `for n in [10, 100, 1000, 10000, 100000]:` — Loops over increasing orders of magnitude.\n- `ratio = coin_flip_experiment(n)` — Executes the simulation for `n` trials.\n- `abs(ratio-0.5)` — Calculates the absolute error between the empirical ratio and the true probability of 0.5.\n- `print(f\'...\')` — Prints the results using an f-string with formatting specifiers for alignment and precision.\nExecution trace for `n=10`:\n- `random.seed(42)` — resets the PRNG.\n- Generator yields a `1` on iterations where `random.random() < 0.5`. For seed 42, the first 10 random values result in exactly 4 values under 0.5.\n- `sum(...)` evaluates to 4.\n- `heads / n_flips` evaluates to `4 / 10 = 0.4`.\n- `abs(0.4 - 0.5)` evaluates to `0.1`.',
                '**Expected behavior.** ``` 10 flips: 0.4000 heads (error: 0.1000) 100 flips: 0.4900 heads (error: 0.0100) 1000 flips: 0.5040 heads (error: 0.0040) 10000 flips: 0.5014 heads (error: 0.0014) 100000 flips: 0.4999 heads (error: 0.0001) ```',
                '**CS lens.** This embodies the **Law of Large Numbers**. It states that as the number of trials increases, the empirical mean converges to the true expected value. The error decreases at a rate proportional to $O(1/\\sqrt{n})$ — to halve the error, you must quadruple the number of samples. Also recognized in: casino house edges, insurance risk modeling, polling margins of error, and particle physics experiments.',
                '**SE lens.** The design principle here is **Empirical Verification**. When analytical mathematical proof is difficult, we can substitute raw computational power to arrive at the same conclusion experimentally. The tradeoff is execution time: achieving extremely high precision requires exponentially more CPU cycles.'
              ],
              typeIt: true,
              solution: 'import random\n\ndef coin_flip_experiment(n_flips, seed=42):\n    random.seed(seed)\n    heads = sum(1 for _ in range(n_flips) if random.random() < 0.5)\n    return heads / n_flips\n\nfor n in [10, 100, 1000, 10000, 100000]:\n    ratio = coin_flip_experiment(n)\n    print(f\'{n:>8} flips: {ratio:.4f} heads  (error: {abs(ratio-0.5):.4f})\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'The birthday paradox simulation',
              prose: [
                'How many people need to be in a room for there to be a 50% chance that two of them share a birthday? The math to solve this involves calculating the probability that everyone has a *unique* birthday and subtracting it from 1. If we don\'t know that combinatorics formula, how can we still find the answer? *Pause and think: Before looking it up, guess how many people are needed. 182? 100? If you were to write a loop to test this, how would you generate the birthdays and check for a duplicate?*',
                'Output (from a theoretical run): ``` [15, 250, 15] True ``` This proves that comparing the length of a list to the length of a `set` created from it instantly identifies duplicates. This is called a **collision check**.'
              ],
              typeIt: true,
              solution: 'import random\nbirthdays = [random.randint(1, 365) for _ in range(3)]\nhas_duplicate = len(set(birthdays)) < 3\nprint(birthdays, has_duplicate)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'The birthday paradox simulation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import random` — Imports the `random` module.\n- `def birthday_same_room(n_people, n_trials=10000, seed=42):` — Defines the simulation function.\n- `random.seed(seed)` — Seeds the PRNG for reproducibility.\n- `count = 0` — Initializes the accumulator for rooms where a shared birthday occurred.\n- `for _ in range(n_trials):` — Loops to perform the experiment 10,000 times.\n- `birthdays = [random.randint(1, 365) for _ in range(n_people)]` — A list comprehension that generates `n_people` random integers between 1 and 365, representing their birthdays.\n- `len(set(birthdays)) < n_people` — A `set` automatically removes duplicates. If the length of the set is less than the original list\'s length (`n_people`), it means a duplicate existed.\n- `count += 1` — Increments the success count if a shared birthday was found.\n- `return count / n_trials` — Returns the empirical probability.\n- `for n in [10, 20, 23, 30, 40, 50]:` — Loops over various room sizes to observe the curve.\n- `prob = birthday_same_room(n)` — Runs the full 10,000 trial simulation for that room size.\n- `print(f\'...\')` — Prints the formatted probability.\nExecution trace for `n_people=3` (theoretical first trial):\n- `random.randint(1, 365)` produces `[42, 100, 42]`.\n- `set([42, 100, 42])` becomes `{42, 100}`.\n- `len({42, 100})` is 2, which is less than 3.\n- Condition matches, `count` becomes 1.',
                '**Expected behavior.** ``` 10 people: 0.118 probability of shared birthday 20 people: 0.413 probability of shared birthday 23 people: 0.505 probability of shared birthday 30 people: 0.701 probability of shared birthday 40 people: 0.893 probability of shared birthday 50 people: 0.970 probability of shared birthday ```',
                '**CS lens.** This embodies **Monte Carlo Simulation**. When calculating the exact combinatorial probability space is challenging, we simply model the random process itself, run it a large number of times, and count the outcomes. Also recognized in: stock market risk forecasting, structural engineering stress tests, computational fluid dynamics, and AI game tree evaluation (like AlphaGo).',
                '**SE lens.** The design principle here is **Simulation over Closed-Form Solutions**. The code to simulate the birthday paradox is trivial to write and verify. The mathematical proof requires careful factorials and complements. The tradeoff is CPU time versus human brain time: throwing 10,000 loops at the CPU is often cheaper than having an engineer derive and debug a complex mathematical formula.'
              ],
              typeIt: true,
              solution: 'import random\n\ndef birthday_same_room(n_people, n_trials=10000, seed=42):\n    random.seed(seed)\n    count = 0\n    for _ in range(n_trials):\n        birthdays = [random.randint(1, 365) for _ in range(n_people)]\n        if len(set(birthdays)) < n_people:  # at least one duplicate\n            count += 1\n    return count / n_trials\n\nfor n in [10, 20, 23, 30, 40, 50]:\n    prob = birthday_same_room(n)\n    print(f\'{n} people: {prob:.3f} probability of shared birthday\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Monte Carlo estimation of π',
              prose: [
                'We know $\\pi$ is roughly 3.14159. But if we didn\'t know that, how could we calculate it from scratch using only random numbers? *Pause and think: Imagine a square with a circle perfectly inscribed inside it. If you throw darts randomly and uniformly at the square, the ratio of darts that hit inside the circle to the total darts thrown should match the ratio of their areas. How can you express that area ratio mathematically to isolate $\\pi$?*',
                'Output (from a theoretical run): ``` 0.5 0.5 True ``` This proves we can randomly sample points in a 2D space and test their distance from the origin. This is called **spatial sampling**.'
              ],
              typeIt: true,
              solution: 'import random\nx = random.uniform(-1, 1)\ny = random.uniform(-1, 1)\nis_inside = x**2 + y**2 <= 1\nprint(x, y, is_inside)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Monte Carlo estimation of π — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import random` — Imports the `random` module.\n- `import math` — Imports the `math` standard library module to access the true value of `math.pi`.\n- `def estimate_pi(n_samples, seed=42):` — Defines the estimation function.\n- `random.seed(seed)` — Seeds the PRNG.\n- `inside = 0` — Initializes the counter for points that fall inside the circle.\n- `for _ in range(n_samples):` — Loops `n_samples` times.\n- `x = random.uniform(-1, 1)` — Draws a random float between -1 and 1 for the x-coordinate.\n- `y = random.uniform(-1, 1)` — Draws a random float between -1 and 1 for the y-coordinate.\n- `x**2 + y**2 <= 1` — The Pythagorean theorem. If the squared distance from the origin (0,0) is less than or equal to the circle\'s radius squared ($1^2 = 1$), the point is inside the unit circle.\n- `inside += 1` — Increments the counter.\n- `return 4 * inside / n_samples` — The area of the square is $2 \\times 2 = 4$. The area of the circle is $\\pi \\times 1^2 = \\pi$. Therefore, the ratio of circle area to square area is $\\pi / 4$. We multiply our empirical ratio (`inside / n_samples`) by 4 to solve for $\\pi$.\n- `for n in ...` — Loops over exponentially increasing sample sizes.\n- `estimate = estimate_pi(n)` — Runs the Monte Carlo estimation.\n- `error = abs(estimate - math.pi)` — Calculates the absolute deviation from the true `math.pi` constant.\n- `print(...)` — Prints the estimate and the error.',
                '**Expected behavior.** ``` n= 100: pi ≈ 3.12000 (error: 0.02159) n= 1000: pi ≈ 3.15600 (error: 0.01441) n= 10000: pi ≈ 3.14400 (error: 0.00241) n= 100000: pi ≈ 3.14200 (error: 0.00041) n= 1000000: pi ≈ 3.14185 (error: 0.00026) ```',
                '**CS lens.** This embodies **Monte Carlo Integration**. Monte Carlo methods can be used to numerically estimate the area or volume of complex geometric shapes by randomly sampling the bounding space. It converges slowly—at $O(1/\\sqrt{n})$—meaning we need 100x more samples to gain just one extra decimal digit of precision. Also recognized in: computer graphics ray tracing (to calculate light bounce), numerical evaluation of complex multidimensional integrals in physics, and financial option pricing.',
                '**SE lens.** The design principle here is **Tradeoff of Convergence Speed**. Monte Carlo is universal—it works on shapes where no closed-form integral formula exists at all. However, it is computationally inefficient for smooth, known curves like circles, where geometric formulas are instantaneous. The engineering choice is deciding whether the complexity of the domain justifies the brute-force cost.'
              ],
              typeIt: true,
              solution: 'import random\nimport math\n\ndef estimate_pi(n_samples, seed=42):\n    random.seed(seed)\n    inside = 0\n    for _ in range(n_samples):\n        x = random.uniform(-1, 1)\n        y = random.uniform(-1, 1)\n        if x**2 + y**2 <= 1:  # point is inside the unit circle\n            inside += 1\n    return 4 * inside / n_samples\n\nfor n in [100, 1000, 10000, 100000, 1000000]:\n    estimate = estimate_pi(n)\n    error = abs(estimate - math.pi)\n    print(f\'n={n:>8}: pi ≈ {estimate:.5f}  (error: {error:.5f})\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 11,
              cellTitle: 'Simulating a dice game — Craps',
              prose: [
                'The game of Craps involves rolling two 6-sided dice. If you roll 7 or 11 on the first roll, you win. If you roll 2, 3, or 12, you lose. If you roll anything else, that number becomes your "point". You must then keep rolling until you hit your point again (you win) or you roll a 7 (you lose). Trying to calculate the exact win probability using combinatorics is a branching nightmare of infinite series. How can we find the probability? *Pause and think: How do you translate "keep rolling until X or Y happens" into code? Which type of loop fits a process that runs an unknown number of times?*',
                'Output (from a theoretical run): ``` 8 ``` This proves we can simulate the sum of two independent dice by calling `randint` twice and adding them. This is called a **composite event**.'
              ],
              typeIt: true,
              solution: 'import random\nroll = random.randint(1, 6) + random.randint(1, 6)\nprint(roll)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 12,
              cellTitle: 'Simulating a dice game — Craps — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import random` — Imports the `random` module.\n- `def roll_dice():` — A helper function to simulate throwing two dice.\n- `return random.randint(1, 6) + random.randint(1, 6)` — Calls `randint` twice independently. This is mathematically correct; `randint(2, 12)` would be incorrect because a 7 is far more likely than a 2.\n- `def play_craps():` — The main game logic returning `True` for a win and `False` for a loss.\n- `first_roll = roll_dice()` — Captures the initial "come-out" roll.\n- `if first_roll in (7, 11):` — Evaluates if the roll is one of the instant win conditions.\n- `return True` — Returns true.\n- `if first_roll in (2, 3, 12):` — Evaluates if the roll is one of the instant loss conditions.\n- `return False` — Returns false.\n- `point = first_roll` — If neither occurred, the roll is saved as the target to hit.\n- `while True:` — An infinite loop, as there is no theoretical maximum number of rolls it might take to resolve the game.\n- `roll = roll_dice()` — Rolls the dice again for the current turn.\n- `if roll == point:` — Checks if the player hit their point before a 7.\n- `return True` — Breaks the loop and winning.\n- `if roll == 7:` — Checks if the player "sevens out".\n- `return False` — Breaks the loop and losing.\n- `random.seed(42)` — Seeds the PRNG.\n- `n = 100000` — Sets the trial count.\n- `wins = sum(1 for _ in range(n) if play_craps())` — Uses a generator comprehension to count every `True` returned by 100,000 independent games.\n- `print(...)` — Prints the win probability.\nExecution trace for one game (theoretical):\n- `play_craps()` is called.\n- `first_roll = roll_dice()` returns `8`.\n- Conditions for `7, 11` and `2, 3, 12` bypass.\n- `point = 8`.\n- Enter `while True` loop.\n- `roll = roll_dice()` returns `5`. Loop continues.\n- `roll = roll_dice()` returns `10`. Loop continues.\n- `roll = roll_dice()` returns `8`.\n- `roll == point` matches. Returns `True` (win).',
                '**Expected behavior.** ``` Win probability: 0.4929 ``` (The true analytical probability is 244/495 ≈ 0.4929. The casino has a tiny 1.41% house edge).',
                '**CS lens.** This embodies a **Markov Chain / State Machine Simulation**. The game has discrete states (come-out roll, point established) and transition probabilities between those states. Simulating the state machine directly bypasses the need to solve the infinite geometric series of the probability space. Also recognized in: network packet retry logic, stochastic models of weather patterns, and queueing theory for servers.',
                '**SE lens.** The design principle here is **Code as Documentation**. The `play_craps` function reads exactly like the English rules of the game. Translating rules directly into executable simulations prevents bugs that arise when trying to "be clever" and mathematically optimize the logic prematurely.'
              ],
              typeIt: true,
              solution: 'import random\n\ndef roll_dice():\n    return random.randint(1, 6) + random.randint(1, 6)\n\ndef play_craps():\n    first_roll = roll_dice()\n    if first_roll in (7, 11):\n        return True   # win immediately\n    if first_roll in (2, 3, 12):\n        return False  # lose immediately\n    point = first_roll\n    while True:\n        roll = roll_dice()\n        if roll == point:\n            return True   # hit point, win\n        if roll == 7:\n            return False  # seven out, lose\n\nrandom.seed(42)\nn = 100000\nwins = sum(1 for _ in range(n) if play_craps())\nprint(f\'Win probability: {wins/n:.4f}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 13,
              cellTitle: 'How many trials are enough? Standard error',
              prose: [
                'Running a Monte Carlo simulation for 10 trials is fast but wildly inaccurate. Running it for 10 billion trials is accurate but might take hours. How do we mathematically calculate the exact number of trials needed to guarantee our result is within a specific margin of error? *Pause and think: If halving the error requires quadrupling the samples, what mathematical operation connects error and sample size?*',
                'Output (from a theoretical run): ``` 0.098 ``` This proves we can calculate the expected statistical error for a given number of trials using the standard error formula. This is called **confidence interval calculation**.'
              ],
              typeIt: true,
              solution: 'import math\nerror = 1.96 * math.sqrt((0.5 * 0.5) / 100)\nprint(error)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 14,
              cellTitle: 'How many trials are enough? Standard error — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import math` — Imports the `math` module.\n- `def needed_trials(target_error, probability=0.5):` — Defines a function accepting a desired target error. `probability` defaults to 0.5 because a 50/50 chance produces the maximum possible variance, giving us a safe upper bound on required trials.\n- `return math.ceil(...)` — Uses `math.ceil` to round the resulting float up to the next whole integer, since we cannot run a fraction of a trial.\n- `(1.96**2 * probability * (1-probability)) / target_error**2` — The inverted standard error formula. 1.96 is the Z-score for a 95% confidence interval. Because `target_error` is squared in the denominator, dividing the target error by 10 increases the required `n` by 100.\n- `for error in [0.05, 0.01, 0.001]:` — Loops over increasingly strict error margins.\n- `n = needed_trials(error)` — Calculates the required trials.\n- `print(f\'... {n:,} ...\')` — Prints the required trials, using the `:,` format specifier to add thousands separators for readability.',
                '**Expected behavior.** ``` For error < 0.05: need 385 trials For error < 0.01: need 9,604 trials For error < 0.001: need 960,400 trials ```',
                '**CS lens.** This embodies the **Fundamental Limit of Monte Carlo**. The standard error of a proportion is $\\sqrt{p(1-p)/n}$. This square root relationship means that Monte Carlo simulation converges very slowly. If you want 10 times more precision, you must pay 100 times the computational cost. Also recognized in: benchmarking metrics, statistical polling (why political polls usually sample ~1,000 people to get a 3% margin of error), and A/B testing duration calculators.',
                '**SE lens.** The design principle here is **Resource Budgeting**. An engineer must know how to bound a simulation computationally. If a stakeholder asks for an error margin of 0.0001 on a complex simulation, calculating `n` reveals they are asking for billions of trials, which might take weeks to run on a single CPU. Knowing the math prevents committing to impossible computational timelines.'
              ],
              typeIt: true,
              solution: 'import math\n\ndef needed_trials(target_error, probability=0.5):\n    # For 95% confidence: error = 1.96 * sqrt(p(1-p)/n)\n    # Solve for n: n = (1.96)^2 * p(1-p) / error^2\n    return math.ceil((1.96**2 * probability * (1-probability)) / target_error**2)\n\nfor error in [0.05, 0.01, 0.001]:\n    n = needed_trials(error)\n    print(f\'For error < {error}: need {n:,} trials\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: { prose: [], callouts: [], visualizations: [] },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If a cell\'s behavior surprises you, isolate the one line that surprised you in its own cell and experiment with small variations.',
      'Read the reference code above the editor line by line and predict what it does before you type it in — that catches most mistakes before you even run anything.',
    ],
    futureLinks: [
      'Next lesson: Random Walks and Simulation.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Law of Large Numbers"?',
      options: [
        'A statistical theorem stating that as the number of identically distributed, randomly generated variables increases, their sample mean converges to their true theoretical probability. It guarantees that simulations become more accurate with more trials.',
        'A probability distribution where every value within a given continuous or discrete range is equally likely to be chosen.',
        'A process that appears random but is driven by a deterministic algorithm starting from an initial state called a seed. It solves the problem of needing random-like sequences in software while maintaining the ability to debug and reproduce results.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Mersenne Twister"?',
      options: [
        'An initial value provided to a PRNG to dictate its starting state. It allows developers to lock the sequence of random numbers, ensuring that "random" experiments can be perfectly re-run.',
        'The specific deterministic algorithm used by Python\'s random module under the hood to generate its sequence of numbers. It provides a long period and good statistical properties for non-cryptographic use.',
        'A statistical theorem stating that as the number of identically distributed, randomly generated variables increases, their sample mean converges to their true theoretical probability. It guarantees that simulations become more accurate with more trials.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Monte Carlo Simulation"?',
      options: [
        'The specific deterministic algorithm used by Python\'s random module under the hood to generate its sequence of numbers. It provides a long period and good statistical properties for non-cryptographic use.',
        'A computational algorithm that relies on repeated random sampling to obtain numerical results. It solves problems where analytical or exact combinatorial solutions are too complex or impossible to derive.',
        'A process that appears random but is driven by a deterministic algorithm starting from an initial state called a seed. It solves the problem of needing random-like sequences in software while maintaining the ability to debug and reproduce results.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Seed"?',
      options: [
        'A continuous probability distribution (the "bell curve") characterized by a mean and standard deviation. It models many natural phenomena, such as human heights or measurement errors.',
        'A computational algorithm that relies on repeated random sampling to obtain numerical results. It solves problems where analytical or exact combinatorial solutions are too complex or impossible to derive.',
        'An initial value provided to a PRNG to dictate its starting state. It allows developers to lock the sequence of random numbers, ensuring that "random" experiments can be perfectly re-run.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Pseudo-randomness** — A process that appears random but is driven by a deterministic algorithm starting from an initial state called a seed. It solves the problem of needing random-like sequences in software while maintaining the ability to debug and reproduce results.',
    '**Law of Large Numbers** — A statistical theorem stating that as the number of identically distributed, randomly generated variables increases, their sample mean converges to their true theoretical probability. It guarantees that simulations become more accurate with more trials.',
    '**Monte Carlo Simulation** — A computational algorithm that relies on repeated random sampling to obtain numerical results. It solves problems where analytical or exact combinatorial solutions are too complex or impossible to derive.',
    '**Standard Error** — A measure of the statistical accuracy of an estimate. It provides a boundary on how far the empirical result might be from the true probability, dictating how many trials are necessary for a desired precision.',
    '**Seed** — An initial value provided to a PRNG to dictate its starting state. It allows developers to lock the sequence of random numbers, ensuring that "random" experiments can be perfectly re-run.',
    '**Mersenne Twister** — The specific deterministic algorithm used by Python\'s random module under the hood to generate its sequence of numbers. It provides a long period and good statistical properties for non-cryptographic use.',
    '**Gaussian Distribution** — A continuous probability distribution (the "bell curve") characterized by a mean and standard deviation. It models many natural phenomena, such as human heights or measurement errors.',
    '**Uniform Distribution** — A probability distribution where every value within a given continuous or discrete range is equally likely to be chosen.',
  ],

  checkpoints: ['read-intuition'],
}
