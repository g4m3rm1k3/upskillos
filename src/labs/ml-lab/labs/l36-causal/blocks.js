// Lesson order for Lab 36: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l36-predict-vs-cause': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'In the simulated data the naive difference between opted-in and other learners is 3.08 lessons. A prediction model y ~ 1 + t is fitted to the same data. What is the coefficient of t? (Two decimals.)', answer: 3.08, tolerance: 0.005, explain: 'Exactly the naive difference, 3.08: with only a 0/1 feature, least squares fits the two group means. The model predicts well and answers the causal question wrongly (the effect is 1.00).', misconceptions: [{ answer: 1, feedback: '1.00 is the true effect; the model cannot know it — it sees only the groups as they chose themselves.' }] } },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l36-adjust': [
    { p: 0 }, { p: 1 }, { p: 2 }, { p: 3 },
    { predict: { prompt: 'A treated learner has propensity 0.25. What IPW weight, 1/e, does that learner get?', answer: 4, explain: '1/0.25 = 4: a treated learner who was unlikely to opt in stands in for four similar learners, most of whom did not.' } },
    { cell: 0 },
    { figure: 'ConfoundingDial', caption: 'Four estimates of an effect that is truly 1. Change how strong the confounding is and how well past activity measures motivation.' },
    { p: 4 },
    { math: true },
  ],
  'l36-experiments': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { p: 2 },
    { predict: { prompt: 'Outcome standard deviation 1.5 lessons, smallest effect worth detecting 0.25. Using n ≈ 2 × 2.8² × σ² / δ², how many users per arm? (Round up.)', answer: 565, explain: '2 × 7.84 × 2.25 / 0.0625 = 564.5 → 565 per arm.' } },
    { figure: 'PowerCurve', caption: 'Power of a two-sided 5% test against users per arm (σ = 2.5). Change the smallest effect worth detecting.' },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l36-pitfalls': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { figure: 'PeekingSim', caption: '300 simulated experiments. Turn peeking on and off, change the true effect and the sample size.' },
    { p: 2 },
    { predict: { prompt: 'You test 5 independent metrics at the 5% level and none is truly affected. What is the chance that at least one looks significant? (Two decimals.)', answer: 0.23, tolerance: 0.005, explain: '1 − 0.95⁵ = 0.226: nearly one experiment in four “moves” a metric by chance. With 20 metrics it is 64%.', misconceptions: [{ answer: 0.25, feedback: '5 × 0.05 = 0.25 is the expected number of false positives; the chance of at least one is 1 − 0.95⁵.' }] } },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'causal' },
  ],
}
