// Lesson order for Lab 50: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l50-regret': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 36, 37, 41 and 47", body: [
      "Lab 41: a Beta(a, b) prior updated with s successes and f failures becomes Beta(a + s, b + f). From Beta(1, 1), 3 successes and 1 failure give Beta(4, 2), with mean 4/6 ≈ 0.67.",
      "Lab 37: an agent must sometimes try actions it believes are worse (explore) to find better ones (exploit). Lab 36: randomised experiments compare options fairly. Lab 47: bounds on how far an estimate can be from the truth."
    ] } }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'A learner’s regret after T rounds is 5√T. What is its regret per round at T = 10,000?', answer: 0.05, tolerance: 0.0005, explain: '5 × 100 / 10,000 = 0.05 — and it keeps shrinking: regret grows sublinearly.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l50-perceptron': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'Data with radius R = 2 and margin γ = 0.5. What is the perceptron’s mistake bound?', answer: 16, explain: '(2/0.5)² = 16 mistakes at most, on any stream of any length.' } },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l50-experts': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'HedgeVsLeader', caption: 'Regret of Hedge and follow-the-leader over 2,000 rounds, with Hedge’s guarantee. Change the sequence and η.' },
    { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'Hedge with N = 16 experts over T = 800 rounds. What is its regret guarantee √(T ln N / 2)? (Nearest whole number.)', answer: 33, tolerance: 0.5, explain: '√(800 × 2.773 / 2) = √1109 ≈ 33.' } },
    { p: 4 },
    { math: true },
  ],
  'l50-bandits': [
    { p: 0 }, { p: 1 }, { p: 2 }, { p: 3 },
    { figure: 'BanditRace', caption: 'Average regret of four policies on the playground’s arm sets over 12 runs. Change the arms and the horizon.' },
    { cell: 0 },
    { predict: { prompt: 'UCB1 at round t = 100: an arm with average 0.30 pulled 4 times. What is its upper confidence bound? (Three decimals.)', answer: 1.817, tolerance: 0.001, explain: '0.30 + √(2 ln 100 / 4) = 0.30 + √2.303 = 0.30 + 1.517 = 1.817 — far above 1: with rare pulls the bonus dominates.' } },
    { p: 4 },
    { math: true },
  ],
  'l50-thompson': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { predict: { prompt: 'An arm has 3 successes and 7 failures. What is the mean of its Thompson posterior Beta(1 + 3, 1 + 7)? (Three decimals.)', answer: 0.333, tolerance: 0.001, explain: '4/(4 + 8) = 0.333 — the Laplace-smoothed rate of Lab 41.' } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'online' },
  ],
}
