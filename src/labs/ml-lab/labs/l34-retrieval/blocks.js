// Lesson order for Lab 34: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l34-rag': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'The 12 runbooks have four sentences each. With 2 sentences per chunk, how many chunks does the index hold?', answer: 24, explain: '12 × 4 / 2 = 24 chunks (48 with one sentence each, 12 with four).' } },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l34-lexical': [
    { p: 0 },
    { predict: { prompt: 'In 12 runbooks the word “check” appears in 6. What is its idf, ln(N/df)? (Three decimals.)', answer: 0.693, tolerance: 0.001, explain: 'ln(12/6) = ln 2 ≈ 0.693, against ln 12 ≈ 2.485 for “lockfile”, which appears in one. Rare words decide the ranking.' } },
    { p: 1 }, { p: 2 },
    { cell: 0 },
    { p: 3 },
    { figure: 'RetrievalRace', caption: 'The top five runbooks for a question, by method; the one that answers it is highlighted.' },
    { p: 4 },
    { math: true },
  ],
  'l34-eval': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'Three questions have their first relevant result at rank 1, rank 3, and not retrieved at all. What is the MRR? (Three decimals.)', answer: 0.444, tolerance: 0.001, explain: '(1 + 1/3 + 0)/3 = 0.444. A miss counts 0, so MRR punishes it more than a low rank.', misconceptions: [{ answer: 0.667, feedback: 'Average over all three questions: the miss still counts, with 0.' }] } },
    { cell: 0 }, { cell: 1 },
    { figure: 'RecallTable', caption: 'Recall and MRR for each method on the 17 labelled questions. Change the chunk size.' },
    { p: 3 },
    { cell: 2 },
    { p: 4 },
    { math: true },
  ],
  'l34-ops': [
    { p: 0 },
    { cell: 0 }, { cell: 1 },
    { p: 1 }, { p: 2 }, { p: 3 },
    { predict: { prompt: 'A prompt holds k = 8 chunks of about 250 tokens plus a 60-token question. About how many tokens is that?', answer: 2060, explain: '8 × 250 + 60 = 2,060 tokens — nearly four times the 540 of k = 4 with 120-token chunks, and generation cost and latency grow with it.' } },
    { p: 4 },
    { math: true },
    { ladder: 'retrieval' },
  ],
}
