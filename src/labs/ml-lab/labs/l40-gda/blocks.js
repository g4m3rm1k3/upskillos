// Lesson order for Lab 40: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l40-generative': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 04, 08, 11 and 39", body: [
      "Bayes' rule (Lab 04): P(class | x) = P(x | class) P(class) / P(x). Naive Bayes (Lab 11) modelled P(x | class) and then applied the rule.",
      "Logistic regression (Lab 08) models P(class | x) directly; Lab 39 showed it as a generalized linear model. This lab compares the two routes."
    ] } }, { p: 1 },
    { predict: { prompt: 'p(x | class 1) = 0.2, p(x | class 0) = 0.4, and the classes are equally common. What is p(class 1 | x)? (Three decimals.)', answer: 0.333, tolerance: 0.001, explain: '0.2 × 0.5 / (0.2 × 0.5 + 0.4 × 0.5) = 0.1/0.3 = 0.333: class 0 explains x twice as well.' } },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l40-fit': [
    { p: 0 }, { p: 1 }, { p: 2 }, { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'One feature. Class 0 has values 2 and 4; class 1 has values 7 and 9. What is the pooled within-class variance (divide by n = 4)?', answer: 1, explain: 'Class means 3 and 8; squared deviations 1, 1, 1, 1; their mean is 1. Measured from the overall mean 5.5 instead, the variance would be 6.25 — mostly the gap between the classes.', misconceptions: [{ answer: 6.25, feedback: 'That measures each value from the overall mean. Pool the deviations from each class’s own mean.' }] } },
    { p: 4 },
    { math: true },
  ],
  'l40-boundaries': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'GdaBoundary', caption: 'The fitted model’s predicted class over the plane, with the training points. Change the world, the model and the number of examples.' },
    { cell: 0 },
    { p: 3 },
    { predict: { prompt: 'LDA with d = 10 features and two classes: 2d means, d(d + 1)/2 shared covariance entries and 1 prior. How many parameters?', answer: 76, explain: '20 + 55 + 1 = 76. QDA would need 20 + 110 + 1 = 131; logistic regression 11.' } },
    { p: 4 },
    { math: true },
  ],
  'l40-tradeoff': [
    { p: 0 }, { p: 1 },
    { figure: 'LearningCurvesFig', caption: 'Test error against training-set size for naive Bayes, full LDA and logistic regression, with the Bayes error. Change the number of features.' },
    { p: 2 },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l40-nb': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { predict: { prompt: 'Naive Bayes with prior log-odds 0.5 and feature contributions −0.3, 1.2 and 0.4. The third feature is missing. What is the log-odds?', answer: 1.4, tolerance: 0.001, explain: '0.5 − 0.3 + 1.2 = 1.4: the missing feature’s term is simply left out.' } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'gda' },
  ],
}
