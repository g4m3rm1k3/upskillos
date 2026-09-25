// Lesson order for Lab 11: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l11-bow': [
    { p: 0 }, { p: 1 },
    { figure: 'Tokenizer', caption: 'Type any message and see its tokens.' },
    { p: 2 }, { p: 3 },
    { figure: 'BagOfWords', caption: 'A message as counts over the training vocabulary.' },
    { predict: { prompt: 'Over the vocabulary [disk, error, timeout], what is the “timeout” count for the message “timeout on disk timeout again”?', answer: 2, explain: 'timeout appears twice; “on” and “again” are not in this vocabulary and are ignored.' } },
    { p: 4 },
  ],
  'l11-bayes': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'WordLikelihoods', caption: 'What the model stores: a prior per class and a probability per word per class.' },
    { predict: { prompt: '45 routine and 15 incident training messages. What is the prior P(incident)?', answer: 0.25, tolerance: 0.001, explain: '15/60 = 0.25.' } },
    { p: 3 }, { p: 4 },
  ],
  'l11-smoothing': [
    { p: 0 },
    { predict: { prompt: '“timeout” appears 6 times among 150 incident tokens. What is its unsmoothed P(timeout | incident)?', answer: 0.04, tolerance: 0.0001, explain: '6/150 = 0.04.' } },
    { p: 1 }, { p: 2 },
    { figure: 'SmoothingBars', caption: 'P(word | incident) as α changes. Highlighted words never occur in incident training messages.' },
    { p: 3 }, { p: 4 },
  ],
  'l11-logs': [
    { p: 0 },
    { figure: 'Underflow', caption: 'Multiplying many small probabilities, versus adding their logs.' },
    { p: 1 }, { p: 2 },
    { figure: 'LogOddsBars', caption: 'Type a message: the prior plus one log-likelihood ratio per word gives its log-odds.' },
    { p: 3 },
    { predict: { prompt: 'Prior log-odds −0.5; three words contribute +1.0, −0.4 and +2.0. What is P(incident) = σ(total)? (Three decimals.)', answer: 0.891, tolerance: 0.001, explain: 'Total = 2.1, and σ(2.1) = 1/(1 + e^(−2.1)) ≈ 0.891.' } },
    { p: 4 },
  ],
  'l11-limits': [
    { p: 0 },
    { figure: 'RepeatedEvidence', caption: 'The same word repeated: the model adds its weight every time.' },
    { p: 1 }, { p: 2 }, { p: 3 }, { p: 4 },
  ],
  'l11-evaluate': [
    { p: 0 }, { p: 1 }, { p: 2 }, { p: 3 },
    { figure: 'HonestEvaluation', caption: 'Vocabulary and counts from training messages only; errors listed for reading.' },
    { p: 4 },
  ],
}
