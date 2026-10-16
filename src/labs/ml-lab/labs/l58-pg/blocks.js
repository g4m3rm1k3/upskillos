// Lesson order for Lab 58: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l58-policy': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 08, 20, 37 and 50", body: [
      "Lab 37: an agent in state s picks an action a, receives a reward r and moves on; its goal is a large return, G_t = R_{t+1} + γG_{t+1}.",
      "Lab 08: a logistic model gives p = σ(θᵀφ(s)), and the gradient of its log-likelihood is (y − p)φ(s). Here it becomes a policy: the probability of choosing \"right\". Labs 20 and 50: backpropagation, and learning one decision at a time."
    ] } }, { p: 1 },
    { predict: { prompt: 'In some state θᵀφ(s) = 2. What is the probability that the policy pushes right? (Three decimals.)', answer: 0.881, tolerance: 0.0006, explain: 'σ(2) = 1/(1 + e⁻²) ≈ 0.881: likely right, but it still pushes left about 12% of the time.' } },
    { figure: 'PolicyCurve', caption: 'The logistic policy’s probability of pushing right as the pole leans, for one weight on the pole angle.' },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l58-reinforce': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'At one step p = 0.25, the agent pushed left (a = 0), φ₃ = 2, and the return-to-go is 10. What is that step’s contribution to the gradient for θ₃?', answer: -5, tolerance: 1e-9, explain: '(a − p)·φ₃·G = (0 − 0.25) × 2 × 10 = −5: lower the weight, making the left push that preceded a good return more likely.' } },
    { p: 3 },
    { predict: { prompt: 'The rewards from step t on are 1, 1, 1 and then the episode ends; γ = 0.5. What is the return-to-go Gₜ?', answer: 1.75, tolerance: 1e-9, explain: '1 + 0.5 + 0.25 = 1.75.' } },
    { p: 4 },
    { figure: 'SeedCurves', caption: 'Learning curves of the playground’s REINFORCE for three seeds. Switch to the version with a baseline.' },
    { cell: 0 },
    { math: true },
  ],
  'l58-baseline': [
    { p: 0 }, { p: 1 },
    { figure: 'SpreadBars', caption: 'How much single-episode gradient estimates vary, with and without subtracting a baseline.' },
    { p: 2 },
    { predict: { prompt: 'A step’s return-to-go is 30 and the baseline predicts 42. What advantage does REINFORCE with a baseline use?', answer: -12, tolerance: 1e-9, explain: '30 − 42 = −12: the action did worse than expected, so its probability is lowered, even though the raw return was positive.' } },
    { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l58-ac': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'r = 1, γ = 0.9, V(s′) = 10 and V(s) = 8. What is the TD error δ?', answer: 2, tolerance: 1e-9, explain: '1 + 0.9 × 10 − 8 = 2: the step went better than the critic expected, so the actor makes that action more likely.' } },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l58-practice': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'The policy pushes right with probability 0.5. What is its entropy in nats? (Three decimals.)', answer: 0.693, tolerance: 0.0006, explain: '−2 × 0.5 ln 0.5 = ln 2 ≈ 0.693, the maximum for two actions. An entropy bonus rewards staying near it until the agent knows better.' } },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'pg' },
  ],
}
