import { extras } from './notebooks.js'

export const lessons = [
  {
    id: 'l36-predict-vs-cause',
    title: '36.1 · Predicting is not intervening',
    sections: ['Two different questions', 'Potential outcomes', 'Confounding', 'Why ML models mislead here', 'Put it into practice'],
    skill: 'Distinguish a predictive question from a causal one and identify confounders.',
    prerequisite: 'Core labs 01–33; regression (Lab 02), statistics (Lab 05), responsible decisions (Lab 31).',
    paragraphs: [
      '"Which learners will complete many lessons?" is a **prediction** question: any feature that correlates with the outcome helps. "Will sending reminders make learners complete more lessons?" is a **causal** question: it asks what happens if we **change** something.',
      'Each learner has two **potential outcomes**: lessons completed with reminders, Y(1), and without, Y(0). The individual effect is Y(1) − Y(0), but we only ever observe one of them. The **average treatment effect** (ATE) is the mean of Y(1) − Y(0) over the population.',
      'In observational data, learners chose whether to receive reminders. Motivated learners opt in more **and** complete more lessons anyway. Motivation is a **confounder**: it affects both treatment and outcome, so the naive difference between groups mixes the reminder\'s effect with the motivation gap.',
      'A predictive model trained on this data happily uses "receives reminders" as a feature — its coefficient absorbs part of motivation\'s effect. The model can predict well and still give a badly wrong answer to "what if we sent reminders to everyone?" Feature importance is not causal effect.',
      'Procedure: write the decision as an intervention ("send reminders to all new learners"); list what influences both the choice to receive treatment and the outcome; draw them as arrows (a causal diagram); and decide whether you can randomize before trying to adjust.',
    ],
    formula: 'ATE = E[Y(1) − Y(0)]     naive = E[Y | T=1] − E[Y | T=0] = ATE + selection bias',
    experiment: 'In "Observational data", set confounding to 0, then raise it to 3. How does the naive difference move while the true effect stays fixed?',
    question: 'Opted-in learners complete 8.1 lessons on average, others 5.0. The true effect of reminders is 1.0 lesson. How large is the selection bias in the naive difference?',
    answer: 2.1,
    explanation: 'Naive difference = 8.1 − 5.0 = 3.1 = 1.0 (effect) + 2.1 (bias from motivation).',
    reflection: 'Name a decision in your work that was justified by a correlation. What confounder could explain it?',
  },
  {
    id: 'l36-adjust',
    title: '36.2 · Adjusting for confounders',
    sections: ['Compare like with like', 'Stratification', 'Regression adjustment', 'Propensity scores and weighting', 'Untestable assumptions'],
    skill: 'Estimate effects from observational data by stratification, regression adjustment and inverse propensity weighting, and state their assumptions.',
    prerequisite: 'Lesson 36.1; least squares (Lab 02), logistic regression (Lab 08).',
    paragraphs: [
      'If we measured every confounder, we could compare treated and untreated learners **with the same confounder values**. This assumption — no unmeasured confounding — is what every adjustment method relies on.',
      '**Stratification**: split learners into groups by the confounder (here, quintiles of past activity), take the treated-minus-untreated difference within each group, and average the differences weighted by group size.',
      '**Regression adjustment**: fit y = a + τ·t + b·past. The coefficient τ estimates the effect, holding past activity fixed — correct if the model form is right.',
      '**Inverse propensity weighting** (IPW): model each learner\'s probability of treatment, the **propensity** e(x), with logistic regression (Lab 08). Weight treated learners by 1/e and untreated by 1/(1 − e), so each group resembles the whole population. Propensities near 0 or 1 mean some learners have no comparable counterparts (no **overlap**) and produce huge, unstable weights.',
      'All three methods adjust only for what was measured, and measured well. Past activity is a noisy proxy for motivation, so residual confounding remains — and no statistic computed from the data can reveal it. Report observational estimates with their assumptions and, where possible, check them against an experiment.',
    ],
    formula: 'τ̂_IPW = Σ tᵢyᵢ/eᵢ / Σ tᵢ/eᵢ − Σ (1−tᵢ)yᵢ/(1−eᵢ) / Σ (1−tᵢ)/(1−eᵢ)',
    experiment: 'With confounding at 1.5, move the proxy noise from 0 to 2. Then turn on "Adjust using true motivation". What does this tell you about adjusting in real data?',
    question: 'A treated learner has propensity 0.8 and an untreated learner has propensity 0.8. What IPW weight does the untreated learner get?',
    answer: 5,
    explanation: 'Untreated weight = 1/(1 − 0.8) = 5. The untreated learner "stands in" for the many similar learners who were treated; the treated learner gets 1/0.8 = 1.25.',
    reflection: 'List the confounders you could measure for a decision in your domain — and one you could not.',
  },
  {
    id: 'l36-experiments',
    title: '36.3 · Randomized experiments',
    sections: ['Randomization breaks confounding', 'Estimate and interval', 'Power and sample size', 'Randomize the right unit', 'Guardrails'],
    skill: 'Design and analyse an A/B test with a pre-computed sample size.',
    prerequisite: 'Lessons 36.1–36.2; confidence intervals and tests (Lab 05).',
    paragraphs: [
      'If a coin flip decides who receives reminders, motivation is balanced between groups on average — as is every other confounder, measured or not. The plain difference in means is then an unbiased estimate of the average effect.',
      'Report the difference with a 95% interval: difference ± 1.96 × √(s₁²/n₁ + s₀²/n₀) (Lab 05). The interval matters more than the p-value: it states which effect sizes the data are compatible with.',
      'Decide the sample size **before** starting. For a two-sided 5% test with 80% power: n per arm ≈ 2(1.96 + 0.84)² σ² / δ², where σ is the outcome\'s standard deviation and δ the smallest effect worth detecting. With σ = 2.5 lessons and δ = 0.3, that is about 1,091 learners per arm.',
      'Randomize the unit the decision applies to and where interference is limited: users, not page views, when a user sees the treatment many times; classrooms or regions when users influence each other. Analyse at the level you randomized.',
      'Add guardrail metrics — unsubscribe rate, complaints, latency — that must not get worse, and check the randomization itself (sample-ratio mismatch: a 50/50 split that arrives as 52/48 over thousands of users signals a bug).',
    ],
    formula: 'n per arm ≈ 2 (z₀.₉₇₅ + z₀.₈)² σ² / δ²     CI = diff ± 1.96 √(s₁²/n₁ + s₀²/n₀)',
    experiment: 'In "Randomized experiment", set the true effect to 0.3 and move users per arm from 50 to 2,500. When does the significant share reach about 80%?',
    question: 'Outcome standard deviation 2 lessons, smallest effect worth detecting 0.5 lessons. Using n ≈ 2 × 2.8² × σ² / δ², about how many users per arm? (Round up.)',
    answer: 251,
    explanation: '2 × 7.84 × 4 / 0.25 = 250.88 → 251 per arm.',
    reflection: 'For an experiment you could run, what is the smallest effect that would change your decision?',
  },
  {
    id: 'l36-pitfalls',
    title: '36.4 · Experiment pitfalls and honest claims',
    sections: ['Peeking', 'The winner\'s curse', 'Many metrics', 'Novelty and long-term effects', 'Demonstrate understanding'],
    skill: 'Avoid common experiment errors and state causal claims at the strength the evidence supports.',
    prerequisite: 'Lessons 36.1–36.3; multiple testing (Lab 05).',
    paragraphs: [
      '**Peeking**: checking the p-value repeatedly and stopping at the first p < 0.05 inflates false positives. In the playground, with no true effect and ten looks, about 20% of experiments "win" instead of 5%. Fix the sample size in advance, or use sequential methods designed for repeated looks.',
      '**Winner\'s curse**: when an underpowered experiment reaches significance, its estimate is inflated — only the lucky, large estimates cross the line. In the playground, 200 learners per arm with a true effect of 0.3 gives significant estimates averaging about 0.6. Expect effects to shrink when rolled out.',
      '**Many metrics**: test 20 outcomes at the 5% level and one will likely "move" by chance (Lab 05). Name one primary metric in advance; treat the rest as exploratory or correct for multiplicity.',
      'Short experiments measure short-term effects: novelty can make any change look good for a week, and some effects (reminders causing fatigue) appear only later. Hold out a small group long-term when the decision is lasting.',
      'You have completed this specialization when you can: separate predictive and causal questions; draw confounders; estimate effects from observational data by stratification, regression and IPW while stating their assumptions; design an experiment with a pre-computed sample size; and avoid peeking, the winner\'s curse and metric fishing. The Python challenge implements these estimators and the sample-size formula.',
    ],
    formula: 'P(false win) grows with every unplanned look; significant estimates from underpowered tests are biased upward',
    experiment: 'Set the true effect to 0, then turn on peeking. Compare the "significant" share with 5%. Then set 2,500 per arm — does more data fix peeking?',
    question: 'You test 20 independent metrics at the 5% level and none is truly affected. What is the expected number of "significant" metrics?',
    answer: 1,
    explanation: '20 × 0.05 = 1 false positive expected. The chance of at least one is 1 − 0.95²⁰ ≈ 64%.',
    reflection: 'Write the one primary metric, the sample size and the stopping rule for an experiment you would run.',
  },
]

export const sources = [
  { title: 'Hernán & Robins · Causal Inference: What If (free book)', url: 'https://miguelhernan.org/whatifbook' },
  { title: 'Kohavi, Tang & Xu · Trustworthy Online Controlled Experiments', url: 'https://experimentguide.com/' },
  { title: 'Rosenbaum & Rubin (1983) · The central role of the propensity score', url: 'https://doi.org/10.1093/biomet/70.1.41' },
  { title: 'Gelman & Carlin (2014) · Beyond power calculations: type S and type M errors', url: 'https://doi.org/10.1177/1745691614551642' },
]

// Runnable cells, typeset formulas and math ↔ code tables for each lesson live in notebooks.js.
for (const lesson of lessons) Object.assign(lesson, extras[lesson.id])
