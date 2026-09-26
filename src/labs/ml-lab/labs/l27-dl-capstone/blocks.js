// Lesson order for Lab 27: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l27-question': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { predict: { prompt: 'The real-digit baseline scores 0.057 on test images moved 2 pixels. What accuracy would guessing among the 10 digits at random give?', answer: 0.1, tolerance: 0.001, explain: '1/10 = 0.1. The baseline does worse than guessing: it has learned where ink sits, and moved digits put the ink where other digits’ ink used to be.' } },
    { p: 2 },
    { figure: 'PipelineBoard', caption: 'The playground’s five pipelines on its synthetic digits, three seeds each.' },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l27-transfer': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { predict: { prompt: 'A linear probe maps 16 fixed features to 10 classes. How many trainable parameters does it have?', answer: 170, explain: '16 × 10 weights + 10 biases = 170, against 650 for the same classifier on the 64 raw pixels.', misconceptions: [{ answer: 160, feedback: 'Add one bias per class.' }] } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l27-ablation': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { cell: 1 },
    { predict: { prompt: 'Over three seeds, removing a component lowers accuracy by 0.03, 0.01 and 0.05. What is the mean paired change?', answer: 0.03, tolerance: 0.0005, explain: '(0.03 + 0.01 + 0.05)/3 = 0.03, and all three are losses — a consistent effect even with three seeds.' } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l27-compute': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { predict: { prompt: 'A dense layer from 64 inputs to 32 units. How many multiply-adds does it do per example?', answer: 2048, explain: '64 × 32 = 2,048 — one per weight. It also has 32 biases, which are additions, not multiplications.' } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l27-errors': [
    { p: 0 },
    { figure: 'ConfusionView', caption: 'One run of a chosen pipeline on the synthetic digits: its confusion matrix.' },
    { cell: 0 },
    { predict: { prompt: 'Digit 8 appears 50 times in the test set and is read correctly 45 times. What is its recall?', answer: 0.9, tolerance: 0.001, explain: '45/50 = 0.9: the diagonal entry divided by its row’s total.' } },
    { p: 1 }, { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'invest' },
  ],
}
