// Lesson order for Lab 53: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l53-ae': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 18, 21–23, 46 and 52", body: [
      "Lab 18: PCA compresses each point to a few numbers z and rebuilds it as x̄ + Σⱼ zⱼvⱼ: a linear encoder and decoder.",
      "Lab 46: cross-entropy −Σ p log q scores predicted probabilities; for one 0/1 pixel x with prediction x̂ it is −[x log x̂ + (1 − x) log(1 − x̂)]. Labs 21–23 and 52: networks, their training and regularisation."
    ] } }, { p: 1 },
    { figure: 'LatentMap', caption: 'The 2-number codes of the playground’s test digits, coloured by digit. Compare the plain autoencoder with the VAE.' },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'A 7 × 5 image squeezed into a 2-number code. By what factor is it compressed? (One decimal.)', answer: 17.5, tolerance: 0.05, explain: '35 / 2 = 17.5.' } },
    { p: 4 },
    { math: true },
  ],
  'l53-denoise': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { p: 2 },
    { predict: { prompt: 'An alarm threshold at the 99.9th percentile of clean errors, with 50,000 clean inputs a day. About how many false alarms per day?', answer: 50, explain: '0.1% of 50,000 = 50.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l53-vae': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'A latent dimension has mean 0 and variance 4. What is its KL term ½(σ² + μ² − 1 − ln σ²)? (Three decimals.)', answer: 0.807, tolerance: 0.001, explain: '½(4 + 0 − 1 − ln 4) = ½(3 − 1.386) = 0.807: too wide a code is penalized as well as a shifted one.' } },
    { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l53-generate': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'BetaGrid', caption: 'Digits decoded from a grid of codes for the playground’s VAE. Change β.' },
    { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l53-uses': [
    { p: 0 },
    { cell: 0 },
    { p: 1 }, { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'vae' },
  ],
}
