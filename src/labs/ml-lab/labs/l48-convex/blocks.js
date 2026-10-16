// Lesson order for Lab 48: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l48-convexity': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 03, 22 and 39", body: [
      "The gradient ∇f lists every partial slope; the Hessian ∇²f lists every second derivative and says how the slope itself changes (Labs 03 and 39).",
      "Lab 03: the least-squares loss is a bowl with a single bottom. Lab 22: gradient descent walks downhill on it."
    ] } }, { p: 1 }, { p: 2 }, { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'Is f(x) = |x| + x² convex? (1 = yes, 0 = no)', answer: 1, explain: 'Yes: a sum of convex functions (a norm and a square) is convex, kink and all.' } },
    { p: 4 },
    { math: true },
  ],
  'l48-kkt': [
    { p: 0 }, { p: 1 },
    { figure: 'KktFig', caption: 'Minimize the distance to a subject to x₁ + x₂ ≤ b. Move a and b.' },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'Minimize ‖x − a‖² subject to x₁ + x₂ ≤ b with a = (3, 1) and b = 2. What is λ = a₁ + a₂ − b?', answer: 2, explain: 'a is infeasible (3 + 1 > 2), so the constraint is active and λ = 4 − 2 = 2; relaxing b by 0.1 lowers f* by about 0.2.' } },
    { p: 4 },
    { math: true },
  ],
  'l48-duality': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'A solver reports primal objective 4.6120 and dual objective 4.6115. At most how far is its objective from optimal? (Four decimals.)', answer: 0.0005, tolerance: 0.00001, explain: '4.6120 − 4.6115 = 0.0005: the dual value is a lower bound, so the optimum lies between them.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l48-svm': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'An SVM’s dual gives α = (0, 0.5, 0, 0.5) for points x = (1, 0), (2, 1), (0, 3), (−1, 1) with labels (+1, +1, −1, −1). What is w₁ = Σ αᵢ yᵢ xᵢ₁?', answer: 1.5, tolerance: 0.001, explain: '0.5 × (+1) × 2 + 0.5 × (−1) × (−1) = 1 + 0.5 = 1.5. Points with α = 0 do not contribute.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l48-prox': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'Soft-threshold v = −0.3 with threshold tλ = 0.4.', answer: 0, explain: '|−0.3| ≤ 0.4, so the result is exactly 0 — the mechanism behind the lasso’s exact zeros.' } },
    { p: 2 },
    { figure: 'LassoRace', caption: 'The lasso objective’s gap to the optimum for ISTA, FISTA and subgradient descent on the playground’s problem. Change λ.' },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'convex' },
  ],
}
