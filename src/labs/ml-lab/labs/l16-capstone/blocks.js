// Lesson order for Lab 16: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l16-frame': [
    { p: 0 }, { p: 1 },
    { figure: 'KnownAtPredictionTime', caption: 'Which candidate features exist at the moment the prediction is needed?' },
    { p: 2 },
    { figure: 'MaeVersusRmse', caption: 'The same errors summarized two ways.' },
    { predict: { prompt: 'Predictions [100, 90, 60] for actual durations [80, 90, 70]. What is the MAE in seconds?', answer: 10, explain: '(20 + 0 + 10)/3 = 10.' } },
    { p: 3 }, { p: 4 },
  ],
  'l16-features': [
    { p: 0 },
    { figure: 'PerMbBySharedRunner', caption: 'Cache-miss builds: duration against size, coloured by runner type.' },
    { p: 1 },
    { predict: { prompt: 'A job of 25 MB runs on a shared runner (shared = 1) with a cache hit (cache = 1). What is its value for size × shared?', answer: 25, explain: '25 × 1 = 25. Its size × (1 − cache) would be 0.' } },
    { p: 2 }, { p: 3 },
    { figure: 'FeatureToggleCV', caption: 'Cross-validated error as engineered features are added.' },
    { p: 4 },
  ],
  'l16-compare': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'ModelBoard', caption: 'Five models, one configuration each, on the same five folds.' },
    { p: 3 }, { p: 4 },
  ],
  'l16-errors': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'SegmentErrors', caption: 'Out-of-fold predictions for every development job, and their errors by segment.' },
    { predict: { prompt: 'A segment of 5 jobs has out-of-fold absolute errors 2, 4, 6, 8 and 30 s. What is its MAE?', answer: 10, explain: '(2 + 4 + 6 + 8 + 30)/5 = 10 — one bad case doubles the segment’s error.' } },
    { p: 3 }, { p: 4 },
  ],
  'l16-test': [
    { p: 0 }, { p: 1 },
    { figure: 'FinalTestOnce', caption: 'The locked test set. Open it once, for the model you already chose.' },
    { p: 2 }, { p: 3 }, { p: 4 },
  ],
  'l16-report': [
    { p: 0 }, { p: 1 },
    { figure: 'ReportChecklist', caption: 'What a reproducible report contains.' },
    { p: 2 }, { p: 3 }, { p: 4 },
  ],
}
