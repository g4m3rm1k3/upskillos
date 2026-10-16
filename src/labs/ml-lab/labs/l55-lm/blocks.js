// Lesson order for Lab 55: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l55-chain': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 25, 26, 34 and 46", body: [
      "Lab 46: cross-entropy −Σ p log q, and perplexity = 2^(cross-entropy in bits). A model with perplexity 4 is as unsure as a fair choice among 4 options.",
      "Labs 25–26: tokens become embeddings, and attention lets each position draw on earlier ones. Lab 34: retrieval finds relevant text to give a model."
    ] } }, { p: 1 },
    { figure: 'NextChar', caption: 'The next-character distribution of the playground’s interpolated n-gram after a few contexts.' },
    { p: 2 }, { p: 3 },
    { predict: { prompt: 'A model averages 3 bits per character on held-out text. What is its perplexity?', answer: 8, explain: '2³ = 8: as uncertain as a uniform choice among 8 characters.', misconceptions: [{ answer: 9, feedback: 'Perplexity is 2 to the power of the bits, not bits squared.' }] } },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l55-tokens': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'Words: “lower” ×4, “lowest” ×3, “newest” ×2. How many times does the adjacent pair (w, e) occur?', answer: 9, explain: '4 (lower) + 3 (lowest) + 2 (newest, in “ew·e”) = 9.' } },
    { p: 2 },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l55-ngram': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'A context occurred 10 times and was never followed by “z”. Vocabulary 28, k = 0.5. What is the add-k probability of “z”? (Three decimals.)', answer: 0.021, tolerance: 0.0006, explain: '0.5 / (10 + 0.5 × 28) = 0.5 / 24 ≈ 0.021.' } },
    { figure: 'SmoothingCurves', caption: 'Training and held-out bits per character for orders 1 to 6.' },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l55-neural': [
    { p: 0 }, { p: 1 },
    { cell: 1 },
    { p: 2 }, { p: 3 },
    { predict: { prompt: 'Two characters have probabilities 0.9 and 0.1. At temperature 0.5, what is the first one’s probability? (Three decimals.)', answer: 0.988, tolerance: 0.0006, explain: '0.81 / (0.81 + 0.01) ≈ 0.988: squaring the probabilities sharpens them.' } },
    { figure: 'TemperatureBars', caption: 'The interpolated 4-gram’s next-character distribution after “the␣”, reshaped by temperature and top-k.' },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l55-assistants': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'LoRA with rank 4 on a 1024 × 1024 weight matrix. How many trainable parameters?', answer: 8192, explain: '2 × 4 × 1024 = 8,192, against 1,048,576 for the full matrix (0.8%).' } },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
    { ladder: 'lm' },
  ],
}
