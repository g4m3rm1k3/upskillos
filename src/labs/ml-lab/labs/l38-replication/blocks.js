// Lesson order for Lab 38: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l38-read': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'Checking seed variation costs 20 runs and can change two of the paper’s four claims; the ablation costs 40 runs and can change one. Which gives more claims per run? (1 = seeds, 2 = ablation)', answer: 1, explain: 'Seeds: 2 claims / 20 runs = 0.1 per run, against 1/40 = 0.025 for the ablation. Buy the cheap, decisive experiments first.' } },
    { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l38-seeds': [
    { p: 0 },
    { cell: 0 },
    { figure: 'SeedSpread', caption: 'The playground’s gain of the method over the baseline on each of the first twenty seeds.' },
    { p: 1 }, { p: 2 },
    { cell: 1 },
    { predict: { prompt: 'Ten paired differences have mean 2.0 points and standard deviation 1.5. What is the half-width of the 95% interval, 2.262 × sd/√10? (Two decimals.)', answer: 1.07, tolerance: 0.005, explain: '2.262 × 1.5 / 3.162 = 1.07: the interval is about [0.9, 3.1] points.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l38-ablation': [
    { p: 0 }, { p: 1 },
    { figure: 'AblationBars', caption: 'The playground’s ablation over ten paired seeds, and the method against a fairly tuned baseline.' },
    { p: 2 }, { p: 3 },
    { cell: 0 }, { cell: 1 },
    { predict: { prompt: 'In the harness, removing JitterMix changes accuracy by −0.1 points with interval [−0.3, +0.2]. Does the ablation support the claim that the gain comes from JitterMix? (1 = yes, 0 = no)', answer: 0, explain: 'No: the interval includes 0, so removing the claimed contribution makes no detectable difference. The cubic features (+2.1 [+1.3, +2.9]) carry the gain.' } },
    { p: 4 },
    { math: true },
  ],
  'l38-report': [
    { p: 0 }, { p: 1 },
    { cell: 0 }, { cell: 1 },
    { predict: { prompt: 'A claimed gain of 8.6 points; your paired interval on 10 fresh seeds is [0.8, 2.8]. Using the verdict rule, what is it? (1 = replicated, 2 = partially replicated, 3 = not supported)', answer: 2, explain: 'The interval is above 0, so the gain is real, but it excludes 8.6: partially replicated — much smaller than claimed.' } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'replicate' },
  ],
}
