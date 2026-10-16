// Lesson order for Lab 52: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l52-overfit': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 07, 20–23 and 47", body: [
      "Labs 20–23: a network trained by backpropagation and an optimiser such as Adam, written in PyTorch.",
      "Lab 07: overfitting shows as training loss falling while validation loss rises. Lab 47: very large models can generalise anyway (double descent)."
    ] } }, { p: 1 }, { p: 2 },
    { figure: 'RegCurves', caption: 'Training and validation loss per epoch for the playground’s network, with the epoch early stopping would keep. Change the regularization.' },
    { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'Validation losses at epochs 50, 100, 200 and 300 are 0.31, 0.27, 0.29 and 0.40. With early stopping, which epoch’s weights are kept?', answer: 100, explain: 'Epoch 100, the lowest validation loss (0.27); later epochs fit the noise.' } },
    { p: 4 },
    { math: true },
  ],
  'l52-dropout': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'Inverted dropout with p = 0.2: by what factor are the kept activations multiplied during training?', answer: 1.25, tolerance: 0.001, explain: '1/(1 − 0.2) = 1.25, so the expected activation stays the same and nothing needs rescaling at evaluation.' } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { cell: 0 },
    { math: true },
  ],
  'l52-augment': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'Which augmentation would change the label of a handwritten digit classifier? (1 = shift by 2 pixels, 2 = small rotation of 10°, 3 = horizontal flip)', answer: 3, explain: 'A horizontal flip turns some digits into non-digits or other digits (2, 5, 7 …); small shifts and rotations preserve the label.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l52-norm': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'One feature in a batch of three has values 2, 4 and 6. With γ = 1, β = 0 and ε ignored, what does batch norm output for the 6? (Three decimals.)', answer: 1.225, tolerance: 0.001, explain: 'Mean 4, variance (4 + 0 + 4)/3 = 8/3, sd 1.633: (6 − 4)/1.633 = 1.225.' } },
    { p: 2 },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l52-residual': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { figure: 'DepthTrain', caption: 'Training loss of five architectures over 100 steps on the playground’s noisy spirals. Change the depth.' },
    { cell: 0 },
    { predict: { prompt: 'A residual block y = x + f(x) receives upstream gradient 0.5 and has ∂f/∂x = −0.2 (scalars). What gradient reaches x?', answer: 0.4, tolerance: 0.001, explain: '0.5 × (1 + (−0.2)) = 0.4: even if f’s gradient were 0, the 1 from the identity path would pass 0.5 straight through.' } },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'dlreg' },
  ],
}
