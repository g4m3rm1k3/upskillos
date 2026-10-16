// Lesson order for Lab 39: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l39-expfam': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 01, 05 and 08", body: [
      "Likelihood (Lab 05): how probable the observed data is under a parameter; maximising log L gives the estimate. For k heads in n flips, log L(p) = k log p + (n − k) log(1 − p), largest at p̂ = k/n.",
      "Logistic regression (Lab 08): p = σ(w·x + b), with loss gradient (p − y)x. This lab shows it is one member of a whole family of models. Derivatives: the slope of log z is 1/z and the slope of eᶻ is eᶻ (Lab 08), combined by the chain rule (Lab 01, lesson 00b)."
    ] } }, { p: 1 }, { p: 2 }, { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'For a Bernoulli variable at η = 0 (φ = 0.5), what is the variance a″(0) = φ(1 − φ)?', answer: 0.25, tolerance: 0.001, explain: 'σ(0) = 0.5, so a″(0) = 0.5 × 0.5 = 0.25 — the largest variance a Bernoulli can have.' } },
    { p: 4 },
    { math: true },
  ],
  'l39-glm': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'A Poisson regression has slope 0.241. By what factor does the expected count multiply when x increases by 2? (Three decimals.)', answer: 1.619, tolerance: 0.002, explain: 'e^(2 × 0.241) = e^0.482 ≈ 1.619 — two steps of the per-unit factor 1.272 (1.272² ≈ 1.618).' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l39-softmax': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'Probabilities are (0.665, 0.245, 0.090) and the true class is the second. What is the gradient of the cross-entropy with respect to the second score?', answer: -0.755, tolerance: 0.001, explain: 'p₂ − 1 = 0.245 − 1 = −0.755: raise that score. The other two scores get +0.665 and +0.090.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l39-newton': [
    { p: 0 }, { p: 1 },
    { figure: 'NewtonRace', caption: 'The loss gap after each step of Newton’s method and of gradient descent (with a line search). Change the model and the scaling of x.' },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'A model has d = 1,000 features. Forming the Hessian takes about n·d² operations; solving with it about d³. How many operations is the solve? (Enter the exponent of 10.)', answer: 9, explain: '1,000³ = 10⁹ per step — why L-BFGS approximates H⁻¹ instead of forming it when d is large.' } },
    { p: 4 },
    { math: true },
  ],
  'l39-lwr': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'With τ = 0.5, what weight does a point 1 unit from the query get? (Three decimals.)', answer: 0.135, tolerance: 0.001, explain: 'Distance 1 = 2τ, so exp(−1/(2 × 0.25)) = e^(−2) ≈ 0.135.' } },
    { p: 2 },
    { figure: 'BandwidthLOO', caption: 'The playground’s wave data and the locally weighted fit. Move the bandwidth.' },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'glm' },
  ],
}
