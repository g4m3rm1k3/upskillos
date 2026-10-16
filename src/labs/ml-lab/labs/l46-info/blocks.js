// Lesson order for Lab 46: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l46-entropy': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses: probability and logarithms", body: [
      "A probability distribution gives each outcome a chance between 0 and 1, and the chances add up to 1 (Lab 04).",
      "log₂ x asks \"what power of 2 is x?\": log₂ 8 = 3, log₂ ½ = −1. Logs turn products into sums: log(ab) = log a + log b."
    ] } }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'A source has outcomes with probabilities ½, ½ and 0. What is its entropy in bits?', answer: 1, explain: 'The impossible outcome contributes nothing (0 · log 0 = 0), so it is a fair coin: 1 bit.' } },
    { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l46-coding': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'CodeLengths', caption: 'Ideal code lengths −log₂p against Huffman’s for four CI outcomes. Change the weights.' },
    { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'An outcome has probability 1/16. What is its ideal code length in bits?', answer: 4, explain: '−log₂(1/16) = 4 bits.' } },
    { p: 4 },
    { math: true },
  ],
  'l46-kl': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'p = (½, ½) and q = (¾, ¼). What is KL(p ‖ q) in bits? (Three decimals.)', answer: 0.208, tolerance: 0.001, explain: '½ log₂(0.5/0.75) + ½ log₂(0.5/0.25) = ½(−0.585) + ½(1) = 0.208 bits.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l46-mi': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'MiBias', caption: 'Binned mutual information, a shuffled baseline and the correlation for the playground’s four relationships. Change the number of bins.' },
    { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'X and Y are independent. H(Y) = 1.2 bits. What is H(Y | X)?', answer: 1.2, tolerance: 0.001, explain: 'Independence means X tells nothing about Y: H(Y | X) = H(Y) = 1.2, and I(X; Y) = 0.' } },
    { p: 4 },
    { math: true },
  ],
  'l46-ml': [
    { p: 0 },
    { cell: 0 },
    { predict: { prompt: 'A character model has cross-entropy 3 bits per character. What is its perplexity?', answer: 8, explain: '2³ = 8: like choosing among 8 equally likely characters at every step.' } },
    { p: 1 }, { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'info' },
  ],
}
