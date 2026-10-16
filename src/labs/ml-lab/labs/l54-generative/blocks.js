// Lesson order for Lab 54: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l54-gan': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 08, 46 and 53", body: [
      "Lab 53: a VAE's encoder gives a distribution over codes z and its decoder turns a code into data; new data comes from decoding a random z ~ N(0, I).",
      "Lab 08: a binary classifier outputs p = σ(z) and is trained on −[y log p + (1 − y) log(1 − p)]. Lab 46: KL divergence measures the gap between two distributions."
    ] } }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'At some x the data density is 0.1 and the generator’s density is 0.4. What does the optimal discriminator output there?', answer: 0.2, tolerance: 1e-9, explain: 'D* = 0.1 / (0.1 + 0.4) = 0.2: the generator overproduces here, so a point at x is probably fake.', misconceptions: [{ answer: 0.25, feedback: 'That is the ratio p_data / p_g. D* divides by the sum p_data + p_g.' }] } },
    { p: 3 },
    { figure: 'OptimalD', caption: 'A 1-D data density, a generator’s density and the optimal discriminator between them. Move the generator.' },
    { p: 4 },
    { cell: 0 },
    { math: true },
  ],
  'l54-gantrain': [
    { p: 0 },
    { predict: { prompt: 'The discriminator’s logit for a fake is ℓ = −4. How many times larger is the non-saturating gradient than the saturating one? (Nearest whole number.)', answer: 55, tolerance: 0.5, explain: '(1 − σ(−4)) / σ(−4) = e⁴ ≈ 54.6.' } },
    { p: 1 }, { p: 2 },
    { figure: 'CollapseFig', caption: 'Final samples of the playground’s GAN for each schedule and seed. Grey: the real ring.' },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l54-diffusion': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'ᾱ_t = 0.81. What is the noise standard deviation √(1 − ᾱ_t) in x_t? (Three decimals.)', answer: 0.436, tolerance: 0.001, explain: '√0.19 ≈ 0.436, while the signal factor is √0.81 = 0.9.', misconceptions: [{ answer: 0.19, feedback: '0.19 is the noise variance; take its square root.' }] } },
    { p: 2 },
    { figure: 'NoisingFig', caption: 'The ring of eight clusters noised in closed form to step t.' },
    { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l54-reverse': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'x_t = 0.5, the predicted noise is −1 and ᾱ = 0.36. What is the estimate of x₀ = (x_t − √(1 − ᾱ)·ε̂)/√ᾱ? (Three decimals.)', answer: 2.167, tolerance: 0.001, explain: '(0.5 + 0.8 × 1) / 0.6 = 2.167: a negative noise estimate means the clean point lies further out than x_t.' } },
    { p: 2 },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l54-compare': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'A generator’s 1,000 samples each copy one of 50 training points, plus a tiny jitter. It covers all 8 modes and every sample lands on a mode. How many genuinely different samples has it produced, at most?', answer: 50, explain: 'At most 50: coverage and precision are perfect, yet it has learned nothing beyond its training points. Only a nearest-training-distance check exposes it, as the cell shows.' } },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'gen' },
  ],
}
