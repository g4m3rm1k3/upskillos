// Lesson order for Lab 61: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l61-adversarial': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 03, 08, 20 and 21", body: [
      "Lab 20: backpropagation gives the gradient of the loss with respect to anything in the computation, including the input x itself. Lab 21: the network classifier under attack.",
      "Lab 03: norms measure size. For v = (3, −4): ‖v‖₂ = √(9 + 16) = 5, ‖v‖∞ = max |vⱼ| = 4, ‖v‖₁ = Σ |vⱼ| = 7. Lab 08: a linear score w·x changes by at most ε‖w‖₁ when every input moves by at most ε."
    ] } }, { p: 1 }, { p: 2 }, { p: 3 },
    { predict: { prompt: 'A linear score over 35 pixels has ‖w‖₁ = 8. How much can an L∞ perturbation with ε = 0.1 change the score at most?', answer: 0.8, tolerance: 1e-9, explain: 'ε·‖w‖₁ = 0.1 × 8 = 0.8: move every pixel by 0.1 in the direction of its weight’s sign.' } },
    { figure: 'AttackCurve', caption: 'The playground’s standard digit classifier under random noise, FGSM and PGD as the budget grows.' },
    { p: 4 },
    { cell: 0 },
    { p: 5 },
    { math: true },
  ],
  'l61-advtrain': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'A linear classifier has margin 2 on a point and ‖w‖₁ = 16. What is the largest L∞ budget ε that cannot flip its prediction?', answer: 0.125, tolerance: 1e-9, explain: 'The worst perturbation lowers the margin by ε‖w‖₁, so ε < 2/16 = 0.125 is safe.' } },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l61-covariate': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'WeightFig', caption: 'A straight line fitted to a curve, with and without importance weights; grey: training data, orange: test inputs.' },
    { p: 3 },
    { predict: { prompt: 'A domain classifier gives c(x) = 0.8 for a training point; there are as many training as test inputs. What is its importance weight?', answer: 4, tolerance: 1e-9, explain: 'c/(1 − c) × n_train/n_test = 0.8/0.2 × 1 = 4: the test data are four times as dense there.' } },
    { p: 4 },
    { cell: 0 },
    { p: 5 },
    { math: true },
  ],
  'l61-label': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'A model trained with 50% of class 1 outputs p(1 | x) = 0.5 for some x. At deployment class 1 is 20%. What is the corrected probability?', answer: 0.2, tolerance: 1e-9, explain: '0.5 × 0.2/0.5 = 0.2 against 0.5 × 0.8/0.5 = 0.8; normalized, 0.2: with no evidence either way, the posterior is the new prior.' } },
    { p: 2 },
    { figure: 'LabelShiftFig', caption: 'The playground’s label-shift experiment: the estimated share of class 1 and the effect of correcting for it.' },
    { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l61-adapt': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'In one dimension the source has mean 1 and standard deviation 2, the target mean 4 and standard deviation 1. Where does CORAL map the source value x = 5?', answer: 6, tolerance: 1e-9, explain: 'Standardize: (5 − 1)/2 = 2. Re-colour: 4 + 2 × 1 = 6.' } },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { p: 4 }, { p: 5 },
    { math: true },
    { ladder: 'robust' },
  ],
}
