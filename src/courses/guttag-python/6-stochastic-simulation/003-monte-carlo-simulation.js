// Guttag — Lesson 39: Monte Carlo Simulation
// Auto-converted from src/docs/tutorials/guttag-python/lesson-39.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-39-monte-carlo-simulation',
  slug: 'monte-carlo-simulation',
  chapter: 6,
  order: 3,
  title: 'Monte Carlo Simulation',
  subtitle: 'Sampling the Unknown',
  tags: ['monte-carlo-simulation', 'law-of-large-numbers', 'confidence-interval', 'random-walk', 'random-seed'],

  hook: {
    question: 'What is "Monte Carlo Simulation", and why does it matter?',
    realWorldContext: 'The reader understands Monte Carlo simulation: using random sampling to estimate quantities that are hard or impossible to compute analytically. They implement pi estimation, the gambler\'s ruin, and a simple random walk. The transferable insight: Monte Carlo works because of the law of large numbers. With enough samples, the sample mean converges to the true expected value. The error decreases as O(1/sqrt(n)): 100x more samples means 10x more precision.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Monte Carlo pi estimation, Law of large numbers and confidence intervals, Gambler\'s ruin simulation, Random walks, Setting a random seed for reproducibility.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Monte Carlo simulation:** A computational technique that uses repeated random sampling to estimate numerical results, typically used when deterministic algorithms are too complex or impossible to run. It solves the problem of finding answers to intractable problems by approximating them through probability.\n- **Law of large numbers:** A theorem in probability stating that the average of the results obtained from a large number of trials should be close to the expected value and will tend to become closer to the expected value as more trials are performed. It provides the mathematical justification for why Monte Carlo simulations work.\n- **Confidence interval:** A range of values, derived from sample statistics, that is likely to contain the value of an unknown population parameter. It gives a measure of reliability or certainty to an estimate, quantifying the error instead of just providing a single point estimate.\n- **Random walk:** A mathematical object that describes a path that consists of a succession of random steps on some mathematical space such as the integers. It models unpredictable movements like stock prices or molecular diffusion.\n- **Random seed:** An initial value used to initialize a pseudorandom number generator (PRNG). Using the same seed guarantees the exact same sequence of random numbers is produced, solving the problem of reproducing bugs or experimental results in simulations.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **random.uniform:** A standard library function that returns a random floating-point number between two specified bounds.\n- **random.random:** A standard library function that returns a random floating-point number in the range [0.0, 1.0).\n- **random.choice:** A standard library function that returns a randomly selected element from a non-empty sequence.\n- **random.seed:** A standard library function that initializes the internal state of the pseudorandom number generator.\n- **math.sqrt:** A standard library function that returns the square root of a number.\n- **math.pi:** A mathematical constant representing the ratio of a circle\'s circumference to its diameter.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Trace estimating pi using Monte Carlo through all concept units: We started with generating a single random coordinate and geometrically bounding it (Monte Carlo pi estimation). We wrapped it in a framework that measured average error and variance, proving the reliability of the method via the Law of large numbers and confidence intervals. We took this sequential probabilistic logic and applied it to state changes, discovering the gambler\'s ruin and observing Brownian diffusion via the random walk. Throughout it all, the engine driving our experiments was the pseudo-random generator, mathematically tethered to consistency by a random seed, ensuring that as our sample size $n$ scaled up by $100x$, our error shrank reliably by $10x$. You now understand how to sample the unknown.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 39: Monte Carlo Simulation',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Monte Carlo Simulation',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Monte Carlo pi estimation',
              prose: [
                'How can we calculate a numerical value like pi using only randomness and geometry? If we throw darts randomly at a square board, how can we use the hits within an inscribed circle to approximate pi?',
                'Output: ``` Point (0.28, -0.95) Inside unit circle: True ``` This isolates the core logic: generating a random coordinate and mathematically testing if it falls within a unit circle. This logic forms the basis of a **Monte Carlo simulation**.'
              ],
              typeIt: true,
              solution: 'import random\nrandom.seed(42)\nx = random.uniform(-1, 1)\ny = random.uniform(-1, 1)\nprint(f"Point ({x:.2f}, {y:.2f})")\nprint(f"Inside unit circle: {x**2 + y**2 <= 1}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Monte Carlo pi estimation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import random` pulls in the Python standard library module for random number generation.\n- `import math` pulls in the standard library module for mathematical functions and constants.\n- `def estimate_pi(num_samples):` defines a function taking a parameter for the total iterations to run.\n- `inside = 0` initializes an accumulator variable to count points inside the circle.\n- `for _ in range(num_samples):` loops the specified number of times, using `_` to discard the index.\n- `x = random.uniform(-1, 1)` gets a random float between `-1` and `1` for the x-coordinate.\n- `y = random.uniform(-1, 1)` gets a random float between `-1` and `1` for the y-coordinate.\n- `if x**2 + y**2 <= 1:` uses the Pythagorean theorem to check if the point\'s distance from origin is less than or equal to 1.\n- `inside += 1` increments the accumulator if the condition is met.\n- `return 4 * inside / num_samples` returns the ratio of inside hits to total throws, multiplied by 4 (the area of the bounding square).\n- `random.seed(42)` initializes the random state so everyone gets the same sequence.\n- `for n in [100, 1000, 10000, 100000, 1000000]:` loops through a list of exponentially increasing sample sizes.\n- `estimate = estimate_pi(n)` calls our function for a given size and stores the returned float.\n- `error = abs(estimate - math.pi)` calculates the absolute difference between our estimate and the true constant.\n- `print(...)` displays formatted strings with the sample size, estimate, and error.',
                '**Expected behavior.** ``` n= 100: pi~3.08000, error=0.06159 n= 1000: pi~3.18400, error=0.04241 n= 10000: pi~3.14280, error=0.00121 n= 100000: pi~3.14144, error=0.00015 n= 1000000: pi~3.14159, error=0.00003 ``` (Error decreases ~10x for every 100x more samples).',
                '**CS lens.** This is Monte Carlo Integration. It appears in computer graphics for path tracing (simulating light rays), in computational chemistry for modeling molecular structures, and in financial risk management for pricing options under uncertainty.',
                '**SE lens.** This code demonstrates an approximation design principle. We trade off absolute exactness for a computable estimate. The alternative chosen was simple sequential looping; an alternative NOT chosen was using array vectorization (like NumPy), which would be much faster but less conceptually clear for learning the base logic.'
              ],
              typeIt: true,
              solution: 'import random\nimport math\n\ndef estimate_pi(num_samples):\n    inside = 0\n    for _ in range(num_samples):\n        x = random.uniform(-1, 1)\n        y = random.uniform(-1, 1)\n        if x**2 + y**2 <= 1:  # inside unit circle\n            inside += 1\n    return 4 * inside / num_samples\n\nrandom.seed(42)  # reproducible results\nfor n in [100, 1000, 10000, 100000, 1000000]:\n    estimate = estimate_pi(n)\n    error = abs(estimate - math.pi)\n    print(f\'n={n:8d}: pi~{estimate:.5f}, error={error:.5f}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Law of large numbers and confidence intervals',
              prose: [
                'If we run a simulation once, we get an answer. How do we know if it\'s a typical answer or a fluke? Without knowing the true answer ahead of time, how can we mathematically bound where the true value lies?',
                'Output: ``` Mean: 3.0, StdDev: 0.82 ``` This isolates calculating standard deviation to measure spread. This allows us to construct a **Confidence interval** to bound our simulation uncertainty using the **Law of large numbers**.'
              ],
              typeIt: true,
              solution: 'import random\nimport math\ntrials = [2.0, 3.0, 4.0]\nmean = sum(trials) / len(trials)\nvariance = sum((r - mean)**2 for r in trials) / len(trials)\nstd = math.sqrt(variance)\nprint(f"Mean: {mean}, StdDev: {std:.2f}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Law of large numbers and confidence intervals — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def simulate_mean_and_std(func, num_trials, samples_per_trial):` defines a higher-order function that takes another function (`func`) as an argument.\n- `results = [func(samples_per_trial) for _ in range(num_trials)]` uses a list comprehension to execute `func` `num_trials` times, collecting the outputs into a list.\n- `mean = sum(results) / len(results)` computes the average estimate.\n- `variance = sum((r - mean)**2 for r in results) / len(results)` calculates the average of the squared differences from the mean (variance).\n- `std = math.sqrt(variance)` takes the square root of the variance to get standard deviation, using `math.sqrt`.\n- `return mean, std` returns a tuple of the calculated statistics.\n- `random.seed(0)` resets the PRNG state.\n- `mean, std = simulate_mean_and_std(...)` unpacks the returned tuple into variables.\n- `print(...)` formats the confidence interval, notably subtracting and adding `2*std` to approximate a 95% bounds around the mean.',
                '**Expected behavior.** ``` Mean estimate: 3.1418 Std deviation: 0.0165 95% CI: (3.1088, 3.1748) True pi: 3.1416 ```',
                '**CS lens.** This highlights higher-order functions and functional composition. Passing a simulation function into a statistical analyzer decouples the *what we are simulating* from *how we measure its reliability*. It shows up in statistical profiling tools, performance benchmarking harnesses, and hyperparameter tuning in machine learning.',
                '**SE lens.** This applies the Separation of Concerns design principle. We could have written standard deviation logic directly into `estimate_pi`, but separating them allows `simulate_mean_and_std` to evaluate any arbitrary function later. The tradeoff is passing a function reference, which is slightly more abstract than hardcoded loops but vastly more reusable.'
              ],
              typeIt: true,
              solution: 'def simulate_mean_and_std(func, num_trials, samples_per_trial):\n    \'\'\'Run func num_trials times, each with samples_per_trial samples.\n       Returns mean and std of the trial results.\'\'\'\n    results = [func(samples_per_trial) for _ in range(num_trials)]\n    mean = sum(results) / len(results)\n    variance = sum((r - mean)**2 for r in results) / len(results)\n    std = math.sqrt(variance)\n    return mean, std\n\nrandom.seed(0)\nmean, std = simulate_mean_and_std(estimate_pi, num_trials=100, samples_per_trial=1000)\nprint(f\'Mean estimate: {mean:.4f}\')\nprint(f\'Std deviation: {std:.4f}\')\nprint(f\'95% CI: ({mean - 2*std:.4f}, {mean + 2*std:.4f})\')\nprint(f\'True pi: {math.pi:.4f}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Gambler\'s ruin simulation',
              prose: [
                'How can we model an ongoing sequence of random events where each step depends on the outcome of the previous one? Can we predict the probability of long-term survival when facing a system stacked against us?',
                'Output: ``` Outcome: lose, New balance: 9 ``` This isolates probabilistic branching based on a float comparison. Doing this continuously until a terminal condition is met demonstrates a **Random walk** applied to gambling.'
              ],
              typeIt: true,
              solution: 'import random\nrandom.seed(1)\nmoney = 10\noutcome = "win" if random.random() < 0.5 else "lose"\nmoney += 1 if outcome == "win" else -1\nprint(f"Outcome: {outcome}, New balance: {money}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Gambler\'s ruin simulation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def gamblers_ruin(start_money, goal, win_prob=0.5, max_steps=10000):` defines a function with default arguments for the probability and maximum loop length.\n- `money = start_money` copies the starting parameter into a mutable state variable.\n- `for step in range(max_steps):` bounds our loop to avoid infinite execution (a safety limit).\n- `if money == 0 or money == goal:` tests for the termination condition at the boundaries.\n- `return money == goal, step` returns a boolean tuple element indicating success, and the duration.\n- `if random.random() < win_prob:` calls `random.random()` (returns `[0.0, 1.0)`) and compares to the win threshold.\n- `money += 1` increments state on a win.\n- `money -= 1` decrements state on a loss.\n- `return False, max_steps` handles the safety fallback if we exhaust steps.\n- `wins = sum(1 for _ in range(num_trials) if gamblers_ruin(start, goal, prob)[0])` uses a generator expression inside `sum` to elegantly count True returns from index `[0]` of the tuple.\n- `theory = start / goal if prob == 0.5 else None` applies inline conditional logic for the known theoretical equation.\n- `print(..., end=\'\')` overrides the default print newline.\n- `run_gamblers_experiment(...)` executes three variations of the setup to prove edge behaviors.',
                '**Expected behavior.** ``` Start=$50, Goal=$100, p=0.5: win rate=0.504 (theory=0.500) Start=$10, Goal=$100, p=0.5: win rate=0.103 (theory=0.100) Start=$50, Goal=$100, p=0.49: win rate=0.117 ```',
                '**CS lens.** This models a Markov Chain with absorbing states. The concept appears in garbage collection algorithms (tracing object reachability), queueing theory for server load forecasting, and packet loss recovery protocols in networking.',
                '**SE lens.** This demonstrates bounded execution limits (the `max_steps` variable). Instead of a purely infinite `while` loop, bounding the iterations prevents catastrophic hanging if parameters cause a non-terminating path. The tradeoff is potentially cutting off an extraordinarily long but valid run, in exchange for guaranteed system stability.'
              ],
              typeIt: true,
              solution: 'def gamblers_ruin(start_money, goal, win_prob=0.5, max_steps=10000):\n    \'\'\'Simulate gambler with \'start_money\'. Bets $1 each step.\n       Win with probability win_prob. Goal is \'goal\' dollars.\n       Returns (reached_goal: bool, steps_taken: int).\'\'\'\n    money = start_money\n    for step in range(max_steps):\n        if money == 0 or money == goal:\n            return money == goal, step\n        if random.random() < win_prob:\n            money += 1   # win\n        else:\n            money -= 1   # lose\n    return False, max_steps  # didn\'t finish\n\ndef run_gamblers_experiment(start, goal, prob, num_trials=10000):\n    wins = sum(1 for _ in range(num_trials)\n               if gamblers_ruin(start, goal, prob)[0])\n    theory = start / goal if prob == 0.5 else None\n    print(f\'Start=${start}, Goal=${goal}, p={prob}: win rate={wins/num_trials:.3f}\', end=\'\')\n    if theory: print(f\' (theory={theory:.3f})\')\n    else: print()\n\nrandom.seed(42)\nrun_gamblers_experiment(50, 100, 0.5)   # fair game: win rate ~0.5\nrun_gamblers_experiment(10, 100, 0.5)   # start small: win rate ~0.1\nrun_gamblers_experiment(50, 100, 0.49)  # slight house edge: disaster',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Random walks',
              prose: [
                'How can we simulate pure diffusion, like a molecule bouncing randomly in a fluid? If an object steps randomly left or right, does it tend to stay put or drift endlessly?',
                'Output: ``` Steps: [1, 1, -1, -1, -1], Final position: -1 ``` This demonstrates `random.choice` to pick discrete directions uniformly, producing a 1-dimensional **Random walk**.'
              ],
              typeIt: true,
              solution: 'import random\nrandom.seed(42)\nsteps = [random.choice([-1, 1]) for _ in range(5)]\nprint(f"Steps: {steps}, Final position: {sum(steps)}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Random walks — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def random_walk_1d(steps):` defines a function to take a number of steps.\n- `position = 0` sets the origin.\n- `for _ in range(steps):` loops for the given duration.\n- `position += random.choice([-1, 1])` uses `random.choice` to pick uniformly from a list and adds it to the state.\n- `return position` provides the final coordinate.\n- `def simulate_walk_stats(...)` sets up a statistical aggregator similar to our previous confidence interval tool.\n- `final_positions = [...]` collects array of endpoint coordinates for thousands of trials.\n- `mean_pos = sum(final_positions) / len(final_positions)` gets the literal average position (which should cancel out to near 0).\n- `mean_abs = sum(abs(p) for p in final_positions) / len(...)` gets the mean absolute distance traveled from origin.\n- `theory = math.sqrt(num_steps)` calculates the square root representing expected magnitude.\n- `print(...)` outputs the results to prove the $\\sqrt{n}$ growth rate.\n- `for n in [100, 400, 900, 1600]:` scales the step lengths by perfect squares to neatly compare to their integer roots.',
                '**Expected behavior.** ``` steps= 100: mean_pos=0.03, mean_dist=7.92, sqrt(n)=10.00 steps= 400: mean_pos=-0.11, mean_dist=15.93, sqrt(n)=20.00 steps= 900: mean_pos=0.15, mean_dist=24.08, sqrt(n)=30.00 steps= 1600: mean_pos=-0.38, mean_dist=31.81, sqrt(n)=40.00 ``` Mean distance grows proportional to `sqrt(steps)`, confirming diffusion theory.',
                '**CS lens.** This is Brownian Motion. Random walk geometry appears in distributed peer-to-peer network routing (gossip protocols), PageRank algorithms determining website authority by random web surfing, and probabilistic roadmap planning in robotics.',
                '**SE lens.** This demonstrates data isolation vs aggregation. By returning only the final `position`, we throw away the full path taken. The alternative NOT chosen is appending every step to a list and returning the whole path. Returning just the integer saves massive amounts of memory, trading off deep inspectability for high-volume aggregate simulation scalability.'
              ],
              typeIt: true,
              solution: 'def random_walk_1d(steps):\n    position = 0\n    for _ in range(steps):\n        position += random.choice([-1, 1])  # step left or right\n    return position\n\ndef simulate_walk_stats(num_steps, num_trials):\n    final_positions = [random_walk_1d(num_steps) for _ in range(num_trials)]\n    mean_pos = sum(final_positions) / len(final_positions)\n    mean_abs = sum(abs(p) for p in final_positions) / len(final_positions)\n    # Theory: E[|position|] ~ sqrt(num_steps)\n    theory = math.sqrt(num_steps)\n    print(f\'steps={num_steps:5d}: mean_pos={mean_pos:.2f}, mean_dist={mean_abs:.2f}, sqrt(n)={theory:.2f}\')\n\nrandom.seed(1)\nfor n in [100, 400, 900, 1600]:\n    simulate_walk_stats(n, 10000)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Setting a random seed for reproducibility',
              prose: [
                'If a Monte Carlo simulation uses random numbers, running it twice produces different outputs. How do we scientifically replicate a finding, write a deterministic test, or debug a specific failure if the data changes under us?',
                'Output: ``` [1, 5, 6, 1, 5] [1, 5, 6, 1, 5] ``` By providing a **Random seed**, the exact sequence of "randomness" is mathematically locked in and identical every time.'
              ],
              typeIt: true,
              solution: 'import random\nrandom.seed(42)\nprint([random.randint(1, 6) for _ in range(5)])\nrandom.seed(42)\nprint([random.randint(1, 6) for _ in range(5)])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Setting a random seed for reproducibility — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `random.seed(42)` injects a specific integer into the PRNG algorithm\'s internal mathematical state matrix.\n- Any subsequent calls to `random.random()`, `random.uniform()`, or `random.choice()` will deterministically transform this state into the exact same sequence of values.\n- `random.seed(0)` or `random.seed(1)` behaves exactly the same way, just establishing a different starting state (and thus a different deterministic sequence).\n- By default, if `seed` is not called (or called as `random.seed(None)`), Python seeds the PRNG using the current system time or OS entropy, rendering it non-reproducible.',
                '**Expected behavior.** Predicted confidently: The output of our simulations will be exactly identical no matter how many times you run `python3 simulation.py`.',
                '**CS lens.** This reveals that computers don\'t do true randomness well. They do Pseudorandom Number Generation (PRNG). The PRNG is a deterministic mathematical equation (like the Mersenne Twister). Given the same starting state (seed), the equation produces the same sequence of outputs forever. True randomness requires hardware entropy sources, like thermal noise or radioactive decay.',
                '**SE lens.** This is the principle of reproducible builds and test determinism. Flaky tests — tests that fail sometimes due to random data — are a massive drag on engineering velocity. The alternative chosen was explicitly seeding our simulations. The alternative NOT chosen is letting it run on OS entropy. We trade off genuine unpredictability in exchange for scientific reproducibility and debuggability. In a real application like a game or crypto, you want unpredictability. In tests and simulations, you demand determinism.'
              ],
              typeIt: true,
              solution: '# No new code block; this explains the `random.seed(42)`\n# already present at the start of all earlier units.',
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
      'Next lesson: Probability and Expected Value.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Random walk"?',
      options: [
        'An initial value used to initialize a pseudorandom number generator (PRNG). Using the same seed guarantees the exact same sequence of random numbers is produced, solving the problem of reproducing bugs or experimental results in simulations.',
        'A mathematical object that describes a path that consists of a succession of random steps on some mathematical space such as the integers. It models unpredictable movements like stock prices or molecular diffusion.',
        'A computational technique that uses repeated random sampling to estimate numerical results, typically used when deterministic algorithms are too complex or impossible to run. It solves the problem of finding answers to intractable problems by approximating them through probability.'
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Monte Carlo simulation"?',
      options: [
        'A range of values, derived from sample statistics, that is likely to contain the value of an unknown population parameter. It gives a measure of reliability or certainty to an estimate, quantifying the error instead of just providing a single point estimate.',
        'A theorem in probability stating that the average of the results obtained from a large number of trials should be close to the expected value and will tend to become closer to the expected value as more trials are performed. It provides the mathematical justification for why Monte Carlo simulations work.',
        'A computational technique that uses repeated random sampling to estimate numerical results, typically used when deterministic algorithms are too complex or impossible to run. It solves the problem of finding answers to intractable problems by approximating them through probability.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Confidence interval"?',
      options: [
        'An initial value used to initialize a pseudorandom number generator (PRNG). Using the same seed guarantees the exact same sequence of random numbers is produced, solving the problem of reproducing bugs or experimental results in simulations.',
        'A range of values, derived from sample statistics, that is likely to contain the value of an unknown population parameter. It gives a measure of reliability or certainty to an estimate, quantifying the error instead of just providing a single point estimate.',
        'A computational technique that uses repeated random sampling to estimate numerical results, typically used when deterministic algorithms are too complex or impossible to run. It solves the problem of finding answers to intractable problems by approximating them through probability.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Random seed"?',
      options: [
        'A mathematical object that describes a path that consists of a succession of random steps on some mathematical space such as the integers. It models unpredictable movements like stock prices or molecular diffusion.',
        'An initial value used to initialize a pseudorandom number generator (PRNG). Using the same seed guarantees the exact same sequence of random numbers is produced, solving the problem of reproducing bugs or experimental results in simulations.',
        'A range of values, derived from sample statistics, that is likely to contain the value of an unknown population parameter. It gives a measure of reliability or certainty to an estimate, quantifying the error instead of just providing a single point estimate.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Monte Carlo simulation** — A computational technique that uses repeated random sampling to estimate numerical results, typically used when deterministic algorithms are too complex or impossible to run. It solves the problem of finding answers to intractable problems by approximating them through probability.',
    '**Law of large numbers** — A theorem in probability stating that the average of the results obtained from a large number of trials should be close to the expected value and will tend to become closer to the expected value as more trials are performed. It provides the mathematical justification for why Monte Carlo simulations work.',
    '**Confidence interval** — A range of values, derived from sample statistics, that is likely to contain the value of an unknown population parameter. It gives a measure of reliability or certainty to an estimate, quantifying the error instead of just providing a single point estimate.',
    '**Random walk** — A mathematical object that describes a path that consists of a succession of random steps on some mathematical space such as the integers. It models unpredictable movements like stock prices or molecular diffusion.',
    '**Random seed** — An initial value used to initialize a pseudorandom number generator (PRNG). Using the same seed guarantees the exact same sequence of random numbers is produced, solving the problem of reproducing bugs or experimental results in simulations.',
  ],

  checkpoints: ['read-intuition'],
}
