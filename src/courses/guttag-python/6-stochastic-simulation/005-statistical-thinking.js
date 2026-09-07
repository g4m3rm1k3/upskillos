// Guttag — Lesson 41: Statistical Thinking
// Auto-converted from src/docs/tutorials/guttag-python/lesson-41.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-41-statistical-thinking',
  slug: 'statistical-thinking',
  chapter: 6,
  order: 5,
  title: 'Statistical Thinking',
  subtitle: 'Distributions, CLT, and Hypothesis Testing',
  tags: ['mean', 'variance', 'standard-deviation', 'normal-distribution', 'central-limit-theorem-clt', 'confidence-interval'],

  hook: {
    question: 'What is "Statistical Thinking", and why does it matter?',
    realWorldContext: 'The reader understands descriptive statistics (mean, variance, std), the normal distribution, the Central Limit Theorem (CLT), and basic hypothesis testing (p-value, null hypothesis). ALL implemented from scratch in Python with no statistics library. The transferable insight: the CLT says that the MEAN of many independent samples from ANY distribution converges to a normal distribution. This is why normal distributions appear everywhere in nature and data science.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Mean, variance, and standard deviation from scratch, Normal distribution and the empirical rule, Central Limit Theorem in action, Confidence intervals, Hypothesis testing — is this coin fair?.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Mean:** The arithmetic average of a dataset, representing the central value. Exists to summarize data with a single typical value.\n- **Variance:** A measure of dispersion showing how far data points spread from the mean. Exists to quantify variability.\n- **Standard Deviation:** The square root of variance, bringing the measure of dispersion back to the original units of the data. Exists to make variability interpretable.\n- **Normal Distribution:** A continuous probability distribution forming a symmetric bell curve. Exists because natural variations often cluster symmetrically around a mean.\n- **Central Limit Theorem (CLT):** The mathematical property that the distribution of sample means approximates a normal distribution as sample size gets larger, regardless of the population\'s distribution. Exists to allow statistical inference even on unknown distributions.\n- **Confidence Interval:** A range of values derived from sample statistics that is likely to contain the true population parameter. Exists to quantify the uncertainty of an estimate.\n- **Hypothesis Testing:** A formal procedure for evaluating evidence against a default claim (the null hypothesis). Exists to provide a rigorous framework for decision making under uncertainty.\n- **p-value:** The probability of obtaining test results at least as extreme as the observed results, assuming the null hypothesis is true. Exists to measure the strength of evidence against the default claim.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **sum:** A built-in Python function that adds items in an iterable.\n- **len:** A built-in Python function that returns the number of items.\n- **math.sqrt:** A mathematical function to compute the square root.\n- **random.random:** A random number generator returning a float in [0.0, 1.0).\n- **random.randint:** A random integer generator returning an int in [a, b].\n- **random.seed:** A function to initialize the random number generator state.\n- **list.extend:** A list method that appends items from an iterable.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'If a coin shows 530 heads in 1000 flips, how do we reason about it using everything we\'ve built? We calculate the **mean** proportion (0.53) and its **variance** and **standard deviation**. Thanks to the **Central Limit Theorem**, we know the distribution of possible sample means forms a **Normal Distribution**, which lets us construct a 95% **Confidence Interval** (roughly 0.499 to 0.561). Because 0.50 (fair) is precariously close to the edge of that interval, we perform a formal **Hypothesis Test** (z-test). The resulting **p-value** (about 0.057) is slightly above 0.05, meaning we do *not* have enough statistical evidence to confidently reject the **null hypothesis** that the coin is fair. Every piece of statistical thinking connects back to the predictable behavior of the normal distribution!',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 41: Statistical Thinking',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Statistical Thinking',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Mean, variance, and standard deviation from scratch',
              prose: [
                'How do we summarize a collection of numbers into meaningful metrics? If we have a list of test scores or sensor readings, looking at raw data is overwhelming. How would you describe the "center" of the data? How would you describe how "spread out" the data is?',
                'Predicted confidently: ``` Mean: 5.0000 Variance: 4.0000 Std dev: 2.0000 ``` This proves that we can manually compute the **Mean**, **Variance**, and **Standard Deviation** without any external statistical libraries.'
              ],
              typeIt: true,
              solution: 'import math\n\ndef mean(data):\n    return sum(data) / len(data)\n\ndef variance(data):\n    m = mean(data)\n    return sum((x - m)**2 for x in data) / len(data)  # population variance\n\ndef std_dev(data):\n    return math.sqrt(variance(data))\n\ndata = [2, 4, 4, 4, 5, 5, 7, 9]\nprint(f\'Mean:     {mean(data):.4f}\')     \nprint(f\'Variance: {variance(data):.4f}\') \nprint(f\'Std dev:  {std_dev(data):.4f}\')  ',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Mean, variance, and standard deviation from scratch — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import math`: Brings in the `math` module for the square root function.\n- `def mean(data):`: Defines a function taking a sequence of numbers.\n- `return sum(data) / len(data)`: Computes the arithmetic average by summing elements and dividing by the count.\n- `def variance(data):`: Defines a function for dispersion.\n- `m = mean(data)`: Calculates the mean first.\n- `(x - m)**2 for x in data`: A generator expression iterating through `data`, subtracting the mean from each element, and squaring the result.\n- `sum(...)`: Adds up all the squared differences.\n- `/ len(data)`: Divides by the total count to find the average squared difference (population variance).\n- `def std_dev(data):`: Defines a function for standard deviation.\n- `return math.sqrt(variance(data))`: Takes the square root of the variance to return to the original units.',
                '**Expected behavior.** Predicted confidently: X (no output, just definitions).',
                '**CS lens.** **Descriptive Statistics**. Summarizing large datasets into key metrics is foundational in data processing. This pattern appears in database query aggregation (e.g., SQL `AVG()`), monitoring dashboards reducing time-series metrics into summaries, and machine learning normalization steps.',
                '**SE lens.** **Composability**. Each function relies on the previous one (`std_dev` calls `variance` which calls `mean`). The alternative is duplicating the mean calculation logic inside `variance` and `std_dev`. The chosen trade-off makes the code DRY (Don\'t Repeat Yourself) at the cost of a slight performance hit from iterating multiple times.'
              ],
              typeIt: true,
              solution: 'import math\n\ndef mean(data):\n    return sum(data) / len(data)\n\ndef variance(data):\n    m = mean(data)\n    return sum((x - m)**2 for x in data) / len(data)\n\ndef std_dev(data):\n    return math.sqrt(variance(data))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Normal distribution and the empirical rule',
              prose: [
                'How do we generate normally distributed (bell curve) random numbers if we only have a uniform random number generator? What mathematical property defines the spread of a normal distribution?',
                'Predicted confidently: Output showing roughly 0.683, 0.954, and 0.997 of samples falling within 1, 2, and 3 standard deviations. This proves that the **Normal Distribution** adheres strictly to the 68-95-99.7 empirical rule, even when synthesized from uniform random values.'
              ],
              typeIt: true,
              solution: 'import random\nimport math\n\ndef sample_normal(mu, sigma, n, seed=None):\n    if seed is not None:\n        random.seed(seed)\n    samples = []\n    for _ in range(n // 2 + 1):\n        u1 = random.random()\n        u2 = random.random()\n        z0 = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)\n        z1 = math.sqrt(-2 * math.log(u1)) * math.sin(2 * math.pi * u2)\n        samples.extend([mu + sigma*z0, mu + sigma*z1])\n    return samples[:n]\n\ndef empirical_rule_check(samples, mu, sigma):\n    n = len(samples)\n    within_1 = sum(1 for x in samples if mu-sigma <= x <= mu+sigma) / n\n    within_2 = sum(1 for x in samples if mu-2*sigma <= x <= mu+2*sigma) / n\n    within_3 = sum(1 for x in samples if mu-3*sigma <= x <= mu+3*sigma) / n\n    print(f\'Within 1 std: {within_1:.3f} (theory: 0.683)\')\n    print(f\'Within 2 std: {within_2:.3f} (theory: 0.954)\')\n    print(f\'Within 3 std: {within_3:.3f} (theory: 0.997)\')\n\nsamples = sample_normal(mu=0, sigma=1, n=10000, seed=42)\nempirical_rule_check(samples, 0, 1)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Normal distribution and the empirical rule — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import random`: Brings in the random module for uniform number generation.\n- `def sample_normal(mu, sigma, n, seed=None):`: Defines a function with parameters for mean `mu`, standard deviation `sigma`, size `n`, and an optional seed.\n- `if seed is not None: random.seed(seed)`: Conditionally initializes the RNG state for reproducibility.\n- `samples = []`: Initializes an empty list.\n- `for _ in range(n // 2 + 1):`: Loops to generate enough pairs (since Box-Muller yields two values at once).\n- `u1 = random.random(); u2 = random.random()`: Draws two independent uniform random floats in `[0.0, 1.0)`.\n- `z0 = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)`: Applies the Box-Muller formula to get the first standard normal variable.\n- `z1 = math.sqrt(-2 * math.log(u1)) * math.sin(2 * math.pi * u2)`: Applies the Box-Muller formula for the second standard normal variable.\n- `samples.extend([mu + sigma*z0, mu + sigma*z1])`: Scales the variables by `sigma`, shifts them by `mu`, and appends them to the list.\n- `return samples[:n]`: Slices the list to return exactly `n` elements.',
                '**Expected behavior.** Predicted confidently: X (no output, just definitions).',
                '**CS lens.** **Transformation of Random Variables**. Converting uniformly distributed bytes or floats into other distributions is a core technique in computer simulation, physics modeling (Monte Carlo simulations), and cryptography (generating specific noise distributions).',
                '**SE lens.** **Deterministic Randomness**. By accepting a `seed` argument, this function supports deterministic testability. The alternative is relying entirely on global RNG state, which leads to flaky, non-reproducible test failures. The tradeoff is explicitly threading seed arguments through APIs.'
              ],
              typeIt: true,
              solution: 'import random\n\ndef sample_normal(mu, sigma, n, seed=None):\n    if seed is not None:\n        random.seed(seed)\n    samples = []\n    for _ in range(n // 2 + 1):\n        u1 = random.random()\n        u2 = random.random()\n        z0 = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)\n        z1 = math.sqrt(-2 * math.log(u1)) * math.sin(2 * math.pi * u2)\n        samples.extend([mu + sigma*z0, mu + sigma*z1])\n    return samples[:n]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Central Limit Theorem in action',
              prose: [
                'If we roll a fair die, the results are uniformly distributed (1 through 6 are equally likely). What happens to the *average* of those rolls if we roll the die many times? Does the average stay uniform?',
                'Predicted confidently: As `n` increases, the standard deviation shrinks proportionally to `1/sqrt(n)`. This proves the **Central Limit Theorem (CLT)**: the distribution of sample means becomes normal, and its variance decreases as sample size increases, regardless of the underlying uniform die distribution.'
              ],
              typeIt: true,
              solution: 'import random\nimport math\n\ndef sample_means(population_sampler, n_per_sample, n_samples, seed=None):\n    if seed is not None:\n        random.seed(seed)\n    return [sum(population_sampler() for _ in range(n_per_sample)) / n_per_sample\n            for _ in range(n_samples)]\n\ndef die():\n    return random.randint(1, 6)\n\nfor n in [1, 5, 30, 100]:\n    means = sample_means(die, n, 10000, seed=0)\n    m = sum(means)/len(means)\n    s = math.sqrt(sum((x-m)**2 for x in means)/len(means))\n    print(f\'n={n:3d}: mean={m:.3f}, std={s:.4f}, 1/sqrt(n)={1/math.sqrt(n):.4f}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Central Limit Theorem in action — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def sample_means(population_sampler, n_per_sample, n_samples, seed=None):`: Defines a higher-order function that takes a callback `population_sampler`.\n- `if seed is not None: random.seed(seed)`: Sets the random seed for reproducibility.\n- `return [...]`: Returns a list comprehension building the sample means.\n- `for _ in range(n_samples)`: The outer loop generating `n_samples` separate means.\n- `sum(population_sampler() for _ in range(n_per_sample))`: The inner generator expression calling the callback `n_per_sample` times and summing the results.\n- `/ n_per_sample`: Divides the sum to calculate the mean for this specific sample.',
                '**Expected behavior.** Predicted confidently: X (no output).',
                '**CS lens.** **Higher-Order Functions**. Passing a function (`population_sampler`) as an argument is a functional programming paradigm. This decoupling is used in callback architectures, event listeners, and mapping operations (like Hadoop MapReduce).',
                '**SE lens.** **Dependency Injection**. By passing the sampling function into `sample_means`, the function doesn\'t need to know whether it\'s rolling dice, flipping coins, or reading network latency. The alternative is hardcoding the sampler, which makes the function rigid.'
              ],
              typeIt: true,
              solution: 'def sample_means(population_sampler, n_per_sample, n_samples, seed=None):\n    if seed is not None:\n        random.seed(seed)\n    return [sum(population_sampler() for _ in range(n_per_sample)) / n_per_sample\n            for _ in range(n_samples)]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Confidence intervals',
              prose: [
                'When we flip a coin 1000 times and get 497 heads, our best guess for the probability of heads is 49.7%. But how much "wiggle room" is there? How confident can we be that the true probability is somewhere near 49.7%?',
                'Predicted confidently: ``` P(heads) estimate: 0.4970 95% CI: (0.4660, 0.5280) True value 0.5 in CI: True ``` This proves that we can construct a **Confidence Interval** around our sample mean that accurately captures the true population parameter.'
              ],
              typeIt: true,
              solution: 'import math\nimport random\n\ndef confidence_interval_95(samples):\n    n = len(samples)\n    m = sum(samples) / n\n    s = math.sqrt(sum((x-m)**2 for x in samples) / (n-1))\n    margin = 1.96 * s / math.sqrt(n)\n    return m, m - margin, m + margin\n\nrandom.seed(42)\nflips = [random.randint(0, 1) for _ in range(1000)]\nm, lo, hi = confidence_interval_95(flips)\nprint(f\'P(heads) estimate: {m:.4f}\')\nprint(f\'95% CI: ({lo:.4f}, {hi:.4f})\')\nprint(f\'True value 0.5 in CI: {lo <= 0.5 <= hi}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Confidence intervals — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def confidence_interval_95(samples):`: Defines the function taking raw sample data.\n- `n = len(samples)`: Finds sample size.\n- `m = sum(samples) / n`: Calculates the sample mean.\n- `s = math.sqrt(sum((x-m)**2 for x in samples) / (n-1))`: Calculates the *sample* standard deviation, dividing by `n-1` (Bessel\'s correction) instead of `n` to provide an unbiased estimator.\n- `margin = 1.96 * s / math.sqrt(n)`: Computes the margin of error. 1.96 is the critical value for 95% confidence in a normal distribution (derived from the empirical rule).\n- `return m, m - margin, m + margin`: Returns a tuple of the mean, lower bound, and upper bound.',
                '**Expected behavior.** Predicted confidently: X (no output).',
                '**CS lens.** **Estimation of Bounds**. Calculating bounds instead of just point estimates is critical in systems engineering, such as establishing Service Level Agreements (SLAs: "95% of requests return in < 200ms"), capacity planning, and load balancer health checks.',
                '**SE lens.** **Tuple Return Types**. Returning `(m, lo, hi)` as a tuple allows the caller to unpack the results directly. The alternative is returning a dictionary or a custom class. The tuple is lighter and more idiomatic in Python for tightly coupled mathematical outputs, but risks position confusion if the caller unpacks in the wrong order.'
              ],
              typeIt: true,
              solution: 'def confidence_interval_95(samples):\n    n = len(samples)\n    m = sum(samples) / n\n    s = math.sqrt(sum((x-m)**2 for x in samples) / (n-1))  # sample std\n    margin = 1.96 * s / math.sqrt(n)\n    return m, m - margin, m + margin',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Hypothesis testing — is this coin fair?',
              prose: [
                'If a friend gives you a coin and you flip it 1000 times, getting 600 heads, is the coin rigged? Or were you just incredibly "lucky"? How do we mathematically prove that a coin is biased?',
                'Predicted confidently: Output showing a large z-score (around 6) and a p-value near 0, rejecting the null hypothesis. This proves **Hypothesis Testing**: we can statistically reject the null assumption (fair coin, `p0=0.5`) because the probability of seeing 600 heads on a fair coin (**p-value**) is vanishingly small.'
              ],
              typeIt: true,
              solution: 'import math\nimport random\n\ndef z_test_proportion(successes, n, p0=0.5):\n    p_hat = successes / n\n    se = math.sqrt(p0 * (1 - p0) / n)\n    z = (p_hat - p0) / se\n    t = 1 / (1 + 0.2316419 * abs(z))\n    poly = t*(0.319381530 + t*(-0.356563782 + t*(1.781477937 + t*(-1.821255978 + t*1.330274429))))\n    p_one_tail = math.exp(-z*z/2) / math.sqrt(2*math.pi) * poly\n    p_value = 2 * p_one_tail\n    return z, p_value\n\nrandom.seed(42)\nflips_biased = sum(1 if random.random() < 0.6 else 0 for _ in range(1000))\nz, p = z_test_proportion(flips_biased, 1000, p0=0.5)\nprint(f\'Biased coin: z={z:.3f}, p={p:.4f}, reject H0: {p < 0.05}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Hypothesis testing — is this coin fair? — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def z_test_proportion(successes, n, p0=0.5):`: Defines the function taking observed successes, total trials, and the assumed null proportion (`p0`).\n- `p_hat = successes / n`: Calculates the observed proportion.\n- `se = math.sqrt(p0 * (1 - p0) / n)`: Calculates the standard error expected under the null hypothesis (a property of the Bernoulli distribution).\n- `z = (p_hat - p0) / se`: Calculates the z-score (number of standard deviations away from the null mean).\n- `t = 1 / (1 + 0.2316419 * abs(z))`: Prepares an intermediate variable for the Abramowitz and Stegun numerical approximation of the normal cumulative distribution function (CDF).\n- `poly = ...`: Calculates the polynomial part of the approximation.\n- `p_one_tail = math.exp(-z*z/2) / math.sqrt(2*math.pi) * poly`: Combines the probability density with the polynomial to find the area in the tail of the normal curve.\n- `return z, 2 * p_one_tail`: Returns the z-statistic and the two-tailed p-value (multiplying by 2 to account for both extremes).',
                '**Expected behavior.** Predicted confidently: X (no output).',
                '**CS lens.** **Numerical Approximations**. The normal CDF has no closed-form analytical solution (you can\'t just write a simple `a + b` formula for it). Computing it requires numerical methods (like Abramowitz and Stegun). This pattern is everywhere in graphics programming, physics engines, and machine learning, where fast approximations are preferred over slow integrations.',
                '**SE lens.** **Default Arguments**. Setting `p0=0.5` makes the function ergonomic for the most common use case (checking if something is 50/50 fair) without locking out other tests. The alternative is forcing the user to pass `0.5` every time, which increases friction.'
              ],
              typeIt: true,
              solution: 'def z_test_proportion(successes, n, p0=0.5):\n    p_hat = successes / n\n    se = math.sqrt(p0 * (1 - p0) / n)\n    z = (p_hat - p0) / se\n    t = 1 / (1 + 0.2316419 * abs(z))\n    poly = t*(0.319381530 + t*(-0.356563782 + t*(1.781477937 + t*(-1.821255978 + t*1.330274429))))\n    p_one_tail = math.exp(-z*z/2) / math.sqrt(2*math.pi) * poly\n    return z, 2 * p_one_tail',
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
      'Next lesson: Curve Fitting.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Standard Deviation"?',
      options: [
        'A measure of dispersion showing how far data points spread from the mean. Exists to quantify variability.',
        'The arithmetic average of a dataset, representing the central value. Exists to summarize data with a single typical value.',
        'The square root of variance, bringing the measure of dispersion back to the original units of the data. Exists to make variability interpretable.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Mean"?',
      options: [
        'A formal procedure for evaluating evidence against a default claim (the null hypothesis). Exists to provide a rigorous framework for decision making under uncertainty.',
        'The arithmetic average of a dataset, representing the central value. Exists to summarize data with a single typical value.',
        'The mathematical property that the distribution of sample means approximates a normal distribution as sample size gets larger, regardless of the population\'s distribution. Exists to allow statistical inference even on unknown distributions.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Central Limit Theorem (CLT)"?',
      options: [
        'The mathematical property that the distribution of sample means approximates a normal distribution as sample size gets larger, regardless of the population\'s distribution. Exists to allow statistical inference even on unknown distributions.',
        'A measure of dispersion showing how far data points spread from the mean. Exists to quantify variability.',
        'The probability of obtaining test results at least as extreme as the observed results, assuming the null hypothesis is true. Exists to measure the strength of evidence against the default claim.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Confidence Interval"?',
      options: [
        'The arithmetic average of a dataset, representing the central value. Exists to summarize data with a single typical value.',
        'A range of values derived from sample statistics that is likely to contain the true population parameter. Exists to quantify the uncertainty of an estimate.',
        'A measure of dispersion showing how far data points spread from the mean. Exists to quantify variability.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Mean** — The arithmetic average of a dataset, representing the central value. Exists to summarize data with a single typical value.',
    '**Variance** — A measure of dispersion showing how far data points spread from the mean. Exists to quantify variability.',
    '**Standard Deviation** — The square root of variance, bringing the measure of dispersion back to the original units of the data. Exists to make variability interpretable.',
    '**Normal Distribution** — A continuous probability distribution forming a symmetric bell curve. Exists because natural variations often cluster symmetrically around a mean.',
    '**Central Limit Theorem (CLT)** — The mathematical property that the distribution of sample means approximates a normal distribution as sample size gets larger, regardless of the population\'s distribution. Exists to allow statistical inference even on unknown distributions.',
    '**Confidence Interval** — A range of values derived from sample statistics that is likely to contain the true population parameter. Exists to quantify the uncertainty of an estimate.',
    '**Hypothesis Testing** — A formal procedure for evaluating evidence against a default claim (the null hypothesis). Exists to provide a rigorous framework for decision making under uncertainty.',
    '**p-value** — The probability of obtaining test results at least as extreme as the observed results, assuming the null hypothesis is true. Exists to measure the strength of evidence against the default claim.',
  ],

  checkpoints: ['read-intuition'],
}
