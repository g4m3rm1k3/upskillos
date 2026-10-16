// Lesson order for Lab 49: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l49-trick': [
    { p: 0 },
    { added: true, bridge: { title: "what this lab uses from Labs 07, 42 and 48", body: [
      "Lab 07: polynomial features add columns x², x³, … so that a linear model can draw a curve.",
      "Lab 42: a kernel k(x, x′) says how similar two inputs are, and a Gaussian process's covariance is a kernel. Lab 48: the SVM's dual problem uses the data only through k(xᵢ, xⱼ)."
    ] } }, { p: 1 }, { p: 2 }, { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'x = 2 and z = 3. What is (1 + xz)²?', answer: 49, explain: '(1 + 6)² = 49 — equal to φ(2)·φ(3) = 1 + 2·6 + 36 = 49 with φ(x) = (1, √2x, x²).' } },
    { p: 4 },
    { math: true },
  ],
  'l49-valid': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'Is k(x, z) = (xᵀz)² · exp(−‖x − z‖²) a valid kernel? (1 = yes, 0 = no)', answer: 1, explain: 'Yes: a product of two valid kernels (a polynomial and an RBF) is valid.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l49-representer': [
    { p: 0 }, { p: 1 },
    { figure: 'KrrFit', caption: 'RBF kernel ridge regression on the playground’s 30 points, with 5-fold error. Change γ and λ.' },
    { p: 2 }, { p: 3 },
    { cell: 0 },
    { predict: { prompt: 'Kernel ridge on n = 5,000 examples: how many entries does the Gram matrix K have? (Millions.)', answer: 25, explain: '5,000² = 25 million entries — 200 MB in double precision, and O(n³) to solve.' } },
    { p: 4 },
    { math: true },
  ],
  'l49-kpca': [
    { p: 0 }, { p: 1 },
    { predict: { prompt: 'A 3 × 3 Gram matrix has row means (2, 1, 3) and overall mean 2. Centring changes entry K₁₂ = 1.5 to K₁₂ − rowmean₁ − rowmean₂ + mean. What is it?', answer: 0.5, tolerance: 0.001, explain: '1.5 − 2 − 1 + 2 = 0.5.' } },
    { p: 2 },
    { figure: 'RingsPca', caption: 'The two rings in the first two kernel-PCA components, coloured by ring. Change the kernel and γ.' },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l49-practice': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { predict: { prompt: 'The median squared distance between points is 2.5. What γ does the median heuristic give?', answer: 0.2, tolerance: 0.001, explain: '1/(2 × 2.5) = 0.2: a typical pair then has kernel value e^(−0.5) ≈ 0.61.' } },
    { cell: 0 },
    { p: 3 }, { p: 4 },
    { math: true },
    { ladder: 'kernels' },
  ],
}
