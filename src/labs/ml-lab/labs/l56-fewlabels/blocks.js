// Lesson order for Lab 56: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l56-scarce': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 06, 17, 25, 34 and 53", body: [
      "Lab 06: keep a labelled test set apart and never train on it. Lab 17: clustering groups points without any labels.",
      "Labs 25, 34 and 53: an embedding, or an autoencoder's code, turns each example into a vector in which similar examples lie close together."
    ] } }, { p: 1 }, { p: 2 }, { p: 3 },
    { predict: { prompt: 'On the balanced two moons, what test accuracy does a classifier get that always predicts the same class? (A decimal.)', answer: 0.5, tolerance: 1e-9, explain: 'Half the test points are in each class: 0.5. Any method with two labels must be compared with this floor and with the supervised baseline on the same two labels.' } },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l56-semi': [
    { p: 0 },
    { predict: { prompt: 'An unlabelled point has two neighbours with normalized edge weights 0.6 and 0.4. Their class-1 scores are 1 and 0. With α = 1, what is its class-1 score after one propagation step?', answer: 0.6, tolerance: 1e-9, explain: '0.6 × 1 + 0.4 × 0 = 0.6: each point takes a weighted average of its neighbours’ scores.' } },
    { figure: 'PropagationSteps', caption: 'Label propagation from one labelled point per class (the playground’s seed 1). Colour: the class-1 score.' },
    { p: 1 }, { p: 2 }, { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l56-active': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'The model gives four pool points the class-1 probabilities 0.9, 0.55, 0.2 and 0.35. Uncertainty sampling queries one of them. Type its probability.', answer: 0.55, tolerance: 1e-9, explain: '|0.55 − 0.5| = 0.05 is the smallest distance from 0.5.', misconceptions: [{ answer: 0.2, feedback: 'That is the point most confidently in class 0, not the least certain one.' }, { answer: 0.35, feedback: '|0.35 − 0.5| = 0.15, larger than |0.55 − 0.5| = 0.05.' }] } },
    { figure: 'ActiveCurves', caption: 'The playground’s learning curves: 4 random labels, then one label bought per step.' },
    { cell: 0 },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l56-contrastive': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'A batch holds 50 images, two augmented views each. Out of how many candidates must each view pick its partner?', answer: 99, explain: '2N − 1 = 99: every other view in the batch. Guessing at random costs log 99 ≈ 4.6 nats.' } },
    { figure: 'InfoNceTemp', caption: 'The InfoNCE loss for one view as its partner’s similarity changes, with 98 negatives fixed at similarity 0.2.' },
    { p: 3 },
    { cell: 0 },
    { p: 4 },
    { math: true },
  ],
  'l56-practice': [
    { p: 0 }, { p: 1 }, { p: 2 }, { p: 3 },
    { predict: { prompt: 'Two annotators agree on 90% of items; chance agreement is 50%. What is Cohen’s κ = (p_o − p_e)/(1 − p_e)?', answer: 0.8, tolerance: 1e-9, explain: '(0.9 − 0.5)/(1 − 0.5) = 0.8.' } },
    { cell: 0 },
    { p: 4 },
    { math: true },
    { ladder: 'fewlabels' },
  ],
}
