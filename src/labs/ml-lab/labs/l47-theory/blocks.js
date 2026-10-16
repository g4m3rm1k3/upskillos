// Lesson order for Lab 47: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l47-hoeffding': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 04, 06 and 07", body: [
      "Lab 06: test error estimates how a model does on new data. Lab 07: a model can fit its training data well and still do badly on new data.",
      "Lab 04: an average of n independent draws varies less as n grows. This lab asks exactly how fast the chance of a large error falls."
    ] } }, { p: 1 }, { p: 2 }, { p: 3 },
    { predict: { prompt: 'Hoeffding with δ = 0.05 gives ε ≈ 0.136 for n = 100. What does it give for n = 400? (Three decimals.)', answer: 0.068, tolerance: 0.001, explain: 'ε ∝ 1/√n: four times the data halves it, 0.136/2 = 0.068.' } },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l47-finite': [
    { p: 0 }, { p: 1 }, { p: 2 }, { p: 3 },
    { figure: 'UnionGap', caption: 'The one-hypothesis bound, the union bound and the actual worst gap over the threshold class. Change the class size and the sample size.' },
    { p: 4 },
    { cell: 0 },
    { predict: { prompt: 'With n = 100 and δ = 0.05, the union bound for |H| = 50 is 0.195. By what factor does ε grow when |H| becomes 5,000? (Two decimals.)', answer: 1.27, tolerance: 0.005, explain: 'ε ∝ √(ln|H| + ln 40): √((8.52 + 3.69)/(3.91 + 3.69)) = √1.61 = 1.27. A hundred times more hypotheses cost only 27% more ε.' } },
    { math: true },
  ],
  'l47-vc': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'Half-planes (linear classifiers with a bias) in 5 dimensions. What is their VC dimension?', answer: 6, explain: 'd + 1 = 6: the weights and the bias.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l47-modern': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'DoubleDescentFig', caption: 'Median training and test error of random-features regression with n = 40 training points. Add a small ridge penalty.' },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l47-practice': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'Choosing among 100 configurations with 400 validation examples. What is √(ln k / m)? (Three decimals.)', answer: 0.107, tolerance: 0.001, explain: '√(4.605/400) = √0.0115 = 0.107: the winner’s validation score is optimistic on this order — keep an untouched test set.' } },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'theory' },
  ],
}
