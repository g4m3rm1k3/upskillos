// Lesson order for Lab 51: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l51-beyond': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 18, 46 and 49", body: [
      "Lab 18: PCA finds the directions along which the data varies most (the eigenvectors of its covariance matrix) and projects onto the first few.",
      "Lab 49: kernel PCA does the same after a non-linear feature map. Lab 46: KL(p ‖ q) = Σ p log(p/q) measures how different two distributions are."
    ] } }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'A colour photo of 64 × 64 pixels with 3 colour channels has how many dimensions?', answer: 12288, explain: '64 × 64 × 3 = 12,288 — yet the photos of one face vary along only a handful of factors.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l51-ica': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'A signal’s excess kurtosis is −1.5. Is it more or less spiky than a Gaussian? (1 = more, 0 = less)', answer: 0, explain: 'Negative excess kurtosis means flatter than Gaussian (like a sine wave, −1.5); positive means spiky (like speech).' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l51-isomap': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'IsomapK', caption: 'The playground’s swiss roll embedded by PCA and by Isomap, coloured by position along the roll. Change k.' },
    { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'Classical MDS on the plain Euclidean distances of centred data gives the same coordinates as which method? (1 = PCA, 2 = t-SNE, 3 = ICA)', answer: 1, explain: 'PCA: double-centring −½D² gives the Gram matrix XXᵀ, whose top eigenvectors are PCA’s scores.' } },
    { p: 4 },
    { math: true },
  ],
  'l51-tsne': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'A point’s neighbour distribution has entropy 3 bits. What is its perplexity?', answer: 8, explain: '2³ = 8: about eight effective neighbours.' } },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l51-honest': [
    { p: 0 }, { p: 1 },
    { figure: 'MapRatios', caption: 'Three clusters with known spreads and distances, mapped by PCA and by t-SNE. Change the method and perplexity.' },
    { p: 2 },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'manifold' },
  ],
}
