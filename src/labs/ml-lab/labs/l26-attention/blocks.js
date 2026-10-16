// Lesson order for Lab 26: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l26-lookup': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 01, 21 and 25", body: [
      "The dot product (Lab 01), Σ aⱼbⱼ, is large when two vectors point the same way.",
      "Softmax (Lab 21), pₖ = e^{zₖ} / Σⱼ e^{zⱼ}, turns scores into positive numbers that add up to 1: scores (1, 2, 3) become about (0.09, 0.24, 0.67).",
      "Lab 25: each token is looked up in an embedding table, so a sequence of T tokens becomes a (T, d) array."
    ] } }, { p: 1 }, { p: 2 }, { p: 3 },
    { cell: 0 },
    { figure: 'SoftLookup', caption: 'Six services with keys around a circle. Turn the query and change the sharpness.' },
    { predict: { prompt: 'Three keys all score the same against the query. The values are 10, 20 and 30. What is the attention output?', answer: 20, explain: 'Equal scores give equal weights, 1/3 each: the output is the plain average, (10 + 20 + 30)/3 = 20.' } },
    { p: 4 },
    { cell: 1 },
    { math: true },
  ],
  'l26-scaled': [
    { p: 0 },
    { cell: 0 },
    { p: 1 },
    { predict: { prompt: 'With d = 256, by what number does scaled attention divide the raw scores?', answer: 16, explain: '√256 = 16. Raw scores have a spread of about 16 at this width; dividing brings them back near 1.' } },
    { figure: 'ScaleEntropy', caption: 'Self-attention weights for six tokens. Widen d with and without dividing by √d.' },
    { cell: 1 },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l26-masks': [
    { p: 0 },
    { predict: { prompt: 'A causal mask over 6 tokens. How many of the 36 scores are set to −∞?', answer: 15, explain: 'The entries strictly above the diagonal: 5 + 4 + 3 + 2 + 1 = 15, which is T(T − 1)/2.', misconceptions: [{ answer: 21, feedback: 'That includes the diagonal. A token may attend to itself: only j > i is masked.' }] } },
    { cell: 0 },
    { figure: 'MaskAndPositions', caption: 'Self-attention over five tokens: turn on the causal mask, positional encodings, and a swap of the first two tokens.' },
    { p: 1 }, { p: 2 }, { p: 3 },
    { cell: 1 },
    { p: 4 },
    { math: true },
  ],
  'l26-heads': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { predict: { prompt: 'A model with width d = 768 uses 12 heads. How wide is each head?', answer: 64, explain: '768 / 12 = 64. The heads together cost about as much as one head of width 768.' } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { figure: 'BlockTable', caption: 'Shapes and parameters through one transformer block.' },
    { cell: 1 },
    { math: true },
  ],
  'l26-interpret': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { predict: { prompt: 'A head puts weight 0.9 on token A, whose value equals the weighted average of the other tokens’ values. By how much does the output change when A is removed?', answer: 0, explain: 'The output is a weighted average. Removing a value that equals the average of the rest leaves the average unchanged: 0, despite the 0.9 weight.' } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'attn' },
  ],
}
