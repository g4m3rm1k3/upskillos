// Lesson order for Lab 35: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l35-feedback': [
    { p: 0 }, { p: 1 }, { p: 2 }, { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'In the cell, popularity recommends five tutorials to a user who likes Statistics most. How many of the five does that user probably like (true click chance above 0.5)?', answer: 0, explain: 'None: the list is the crowd’s favourites (four intro tutorials and Python practice), with true click chances between 0.16 and 0.28. Popularity is a strong average and a poor fit for anyone unlike the average.' } },
    { p: 4 },
    { math: true },
  ],
  'l35-cf': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'Item A was opened by 9 users, item B by 16, and 3 users opened both. What is their cosine similarity? (Two decimals.)', answer: 0.25, tolerance: 0.005, explain: '3 / √(9 × 16) = 3/12 = 0.25.', misconceptions: [{ answer: 0.12, feedback: 'Divide by √(count_A · count_B) = 12, not by count_A + count_B = 25.' }] } },
    { p: 2 }, { p: 3 },
    { cell: 0 }, { cell: 1 },
    { p: 4 },
    { math: true },
  ],
  'l35-offline': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'The held-out item appears at rank 2. What is its NDCG contribution, 1/log₂(rank + 1)? (Three decimals.)', answer: 0.631, tolerance: 0.001, explain: '1/log₂3 = 0.631: second place keeps 63% of first place’s credit; third keeps 50%.' } },
    { cell: 0 }, { cell: 1 },
    { figure: 'HoldoutLeak', caption: 'Hit rate for each method with a time-aware and a random hold-out. Change the list length.' },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l35-loops': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'In its first round, the playground’s popularity recommender shows about 21% of the 24 tutorials. About how many tutorials is that?', answer: 5, explain: '0.21 × 24 ≈ 5: everyone sees the same handful, and the other 19 can gain no clicks at all.' } },
    { p: 2 },
    { cell: 0 }, { cell: 1 },
    { figure: 'LoopExplore', caption: 'Twelve rounds of recommend, click, retrain. Change the method and the exploration rate.' },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'recsys' },
  ],
}
