// Lesson order for Lab 59: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l59-importance': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 05, 06, 13 and 14", body: [
      "Labs 13–14: a random forest averages many trees; gradient boosting adds trees one at a time, each fitted to the errors left so far.",
      "Lab 06: measure on held-out data. Lab 05: correlated features carry overlapping information, which makes \"which feature matters\" ambiguous."
    ] } }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'A model’s test MSE is 5.0. With hour of day shuffled it rises to 9.2. What is hour’s permutation importance?', answer: 4.2, tolerance: 1e-9, explain: '9.2 − 5.0 = 4.2: the rise in error when the model can no longer use the feature.' } },
    { p: 3 },
    { figure: 'ImportanceBars', caption: 'The playground model’s permutation importance on test and training builds, and its gain importance.' },
    { p: 4 }, { p: 5 },
    { cell: 0 },
    { p: 6 },
    { math: true },
  ],
  'l59-pdp': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'At v = 40 MB, four ICE curves give 12, 18, 21 and 25 minutes. What is the partial dependence at 40 MB?', answer: 19, tolerance: 1e-9, explain: '(12 + 18 + 21 + 25)/4 = 19: the partial dependence is the average of the ICE curves.' } },
    { p: 2 },
    { cell: 0 },
    { p: 3 }, { p: 4 }, { p: 5 },
    { math: true },
  ],
  'l59-shapley': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'With d = 6 features, what weight does a coalition S of size 2 get in feature j’s Shapley value, |S|!(d − |S| − 1)!/d!? (Four decimals.)', answer: 0.0167, tolerance: 0.00006, explain: '2! × 3! / 6! = 12/720 = 1/60 ≈ 0.0167.' } },
    { p: 3 },
    { figure: 'Waterfall', caption: 'Exact Shapley values for one test build, relative to 50 background builds.' },
    { cell: 0 },
    { p: 4 }, { p: 5 },
    { math: true },
  ],
  'l59-lime': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'Four samples have kernel weights 1, 1, 0.5 and 0.5. What is the effective sample size (Σw)²/Σw²?', answer: 3.6, tolerance: 1e-9, explain: '(1 + 1 + 0.5 + 0.5)² / (1 + 1 + 0.25 + 0.25) = 9/2.5 = 3.6.' } },
    { p: 3 },
    { figure: 'LimeStability', caption: 'LIME’s change-size coefficient for one build, five seeds per kernel width.' },
    { cell: 0 },
    { p: 4 }, { p: 5 },
    { math: true },
  ],
  'l59-counterfactual': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'A counterfactual shrinks change size by 18 MB (the training standard deviation is 24 MB) and turns the cache on. What is its distance under the playground’s measure?', answer: 1.75, tolerance: 1e-9, explain: '18/24 = 0.75 standard deviations, plus 1 for flipping a yes/no feature: 1.75.' } },
    { p: 2 },
    { cell: 0 },
    { p: 3 }, { p: 4 }, { p: 5 },
    { math: true },
    { ladder: 'interpret' },
  ],
}
