// Stage 3: "The SVD: the shape of any matrix". The module opens with a photo, so the learner sees
// what the SVD is for before any formula. The order is: compress a photo, inside the SVD (layers,
// strengths, choosing k), PCA (core.js), then the spectral theorem (spectral.js, slotted with `after`).
// OpenMAT notes: bar(x, y) draws x, so charts use bar(y). A flat vector times a flat vector is a dot product, so outer products use reshape or
// the slice form U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k)), which also works for k = 1. find(x, 1) ignores its count, so "the first k with …" is
// written as sum(x < target) + 1.
const t = String.raw
const SVD = 'The SVD: the shape of any matrix'

export const svdLessons = [
  {
    id: 'laml-svd-photo', module: SVD, title: 'Compress a photo: what the SVD is for', minutes: 25, level: 'Intermediate',
    why: { title: 'Why should I care about the SVD?', story: 'A phone photo is millions of numbers, but most of them are not news: the sky is much like the sky next to it, and a wall is much like the rest of the wall. The singular value decomposition (SVD) finds the few patterns a picture is really made of and sorts them from most to least important. Keep the important ones and the picture survives at a fraction of the size. The same trick finds the main tastes in film ratings, the main shapes in a vibrating structure and the signal hidden in noisy measurements.' },
    objective: 'See a greyscale picture as a matrix, rebuild it from its k strongest SVD layers, and count the storage saved and the error made.',
    prose: [
      'A greyscale photo is a grid of brightness numbers: 0 is black, 1 is white, and 0.5 is mid-grey. A picture 1000 pixels tall and 1500 wide is a 1000 × 1500 matrix with 1.5 million entries. Everything in this lesson works on that matrix.',
      'Start with the simplest kind of picture. Choose a brightness for every row (a column of numbers u) and a brightness for every column (a row of numbers v), and make each pixel the product: row i, column j gets uᵢ × vⱼ. The result looks like a woven tartan of light and dark bands. We call it a **layer**. A 1000 × 1500 layer is described by only 1000 + 1500 numbers instead of 1.5 million.',
      'The **singular value decomposition** says that every matrix, so every picture, is a sum of such layers. Each layer comes with a strength σ (the Greek letter sigma), called a **singular value**, and the SVD lists them from strongest to weakest. The first layer gives the broad light and dark areas; later layers add edges and detail; the last ones are faint speckle.',
      'To compress, keep only the first k layers. Each kept layer costs one column, one row and one strength: k × (m + n + 1) numbers for an m × n picture. The error is easy to predict too. Square the strengths you threw away, add them up and take the square root: that is exactly the size of the difference between the original and the copy.',
      'In code, `[U, S, V] = svd(A)` returns the patterns and the strengths. The columns of U are the column patterns u, the columns of V are the row patterns v, and the diagonal of S holds the strengths. Keeping k layers is `U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k))`. The next lesson opens these three factors up. For now, they are the recipe for the layers.',
      'An honest note: JPEG does not use the SVD. It uses fixed wave patterns that are cheap to compute. The SVD finds the best possible layers for one particular matrix, which costs more work but tells you what the matrix is really made of. That is why it is used wherever the patterns are not known in advance: ratings, sensor records, simulations and data.',
    ],
    procedure: ['Treat the picture as a matrix A of brightness values, m rows by n columns.', 'Compute [U, S, V] = svd(A) and look at the strengths on the diagonal of S.', 'Keep k layers: Ak = U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k)).', 'Count the storage, k*(m + n + 1) against m*n, and the error, the square root of the sum of the squared discarded strengths.'],
    prediction: { question: 'A 1000 × 1000 picture is kept with 50 layers. Roughly what fraction of the original numbers do you store?', answer: 'About a tenth: 50 × (1000 + 1000 + 1) = 100,050 numbers instead of 1,000,000.' },
    demo: {
      code: t`m = 24;
n = 32;
A = zeros(m, n);
for i = 1:m
  for j = 1:n
    A(i,j) = 0.5 + 0.3*sin(i/4)*cos(j/5);
    if abs(i - 12) + abs(j - 16) < 8
      A(i,j) = 1;
    end
  end
end
[U, S, V] = svd(A);
sigma = diag(S);
disp('The five strongest layers:'); disp(sigma(1:5))
k = 3;
Ak = U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k));
storage = k*(m + n + 1)
original = m*n
E = A - Ak;
err = sqrt(sum(sum(E.^2)))
predicted = sqrt(sum(sigma(k+1:end).^2))`,
      draw: t`A1 = U(:,1:1)*S(1:1,1:1)*transpose(V(:,1:1));
plot(1:n, A(12,:))
hold on
plot(1:n, A1(12,:))
plot(1:n, Ak(12,:))
title('Row 12 of the picture: three layers already follow it closely')
xlabel('Column (pixel)'); ylabel('Brightness'); legend('Original', '1 layer', '3 layers'); grid on`,
      explain: [{ code: 'A(i,j) = 0.5 + 0.3*sin(i/4)*cos(j/5);', meaning: 'A made-up picture: a gentle wave pattern with a bright diamond in the middle.' }, { code: '[U, S, V] = svd(A);', meaning: 'Split the picture into layers. The strengths sit on the diagonal of S, strongest first.' }, { code: 'Ak = U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k));', meaning: 'Add up the first k layers only.' }, { code: 'predicted = sqrt(sum(sigma(k+1:end).^2))', meaning: 'The error predicted from the discarded strengths. It matches err.' }],
    },
    challenge: {
      prompt: 'A is a 3 × 3 picture of a plus sign. Keep its first k layers: store Ak, storage = k*(m + n + 1), err (the square root of the sum of the squared entries of A − Ak) and kept, the fraction of the squared strengths that you kept.',
      setup: 'A = [0 1 0; 1 1 1; 0 1 0];\nk = 1;',
      starter: 'Ak = A;   % replace with the first k layers\nstorage = 9;\nerr = 0;\nkept = 1;',
      solution: t`[m, n] = size(A);
[U, S, V] = svd(A);
Ak = U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k));
storage = k*(m + n + 1);
E = A - Ak;
err = sqrt(sum(sum(E.^2)));
sigma = diag(S);
kept = sum(sigma(1:k).^2)/sum(sigma.^2);`,
      checks: [{ name: 'Ak', expected: [[1 / 3, 2 / 3, 1 / 3], [2 / 3, 4 / 3, 2 / 3], [1 / 3, 2 / 3, 1 / 3]], tolerance: 1e-6, message: 'One layer: a soft blob that is brightest in the middle.' }, { name: 'storage', expected: 7, tolerance: 1e-9, message: 'One column of 3, one row of 3 and one strength.' }, { name: 'err', expected: 1, tolerance: 1e-6, message: 'The strengths are 2, 1 and 0, so the discarded ones give √(1² + 0²) = 1.' }, { name: 'kept', expected: 0.8, tolerance: 1e-6, message: 'Kept 2² out of 2² + 1² + 0².' }],
      cases: [{ setup: 'A = [0 1 0; 1 1 1; 0 1 0];\nk = 2;', checks: [{ name: 'Ak', expected: [[0, 1, 0], [1, 1, 1], [0, 1, 0]], tolerance: 1e-6, message: 'Two layers rebuild the plus sign exactly: the third strength is 0.' }, { name: 'storage', expected: 14, tolerance: 1e-9, message: 'Two layers cost 14 numbers, more than the 9 pixels.' }, { name: 'err', expected: 0, tolerance: 1e-6, message: 'Nothing is lost.' }, { name: 'kept', expected: 1, tolerance: 1e-6, message: 'All the strength is kept.' }] }],
      hints: ['[m, n] = size(A) gives the size; [U, S, V] = svd(A) gives the layers.', 'Ak = U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k)); the strengths are diag(S).', 'err = sqrt(sum(sum((A - Ak).^2))); kept = sum(sigma(1:k).^2)/sum(sigma.^2);'],
      transfer: 'With k = 2 the "compressed" plus sign costs 14 numbers instead of 9. For an m × m picture, how small must k be for the layers to be cheaper than the pixels? Work it out for m = 3 and m = 1000.',
    },
    notation: [
      { tex: t`A = \sigma_1\mathbf u_1\mathbf v_1^T + \sigma_2\mathbf u_2\mathbf v_2^T + \cdots`, say: 'A picture is a sum of layers: a column pattern times a row pattern, times a strength.' },
      { tex: t`\sigma_1 \ge \sigma_2 \ge \cdots \ge 0`, say: 'The strengths are sorted, strongest first, and never negative.' },
      { tex: t`\text{storage} = k(m + n + 1), \qquad \|A - A_k\| = \sqrt{\sigma_{k+1}^2 + \sigma_{k+2}^2 + \cdots}`, say: 'What $k$ layers cost, and how far the copy is from the original.' },
    ],
    quiz: [
      { q: 'A 200 × 300 picture is kept with 10 layers. How many numbers are stored?', options: ['5,010', '60,000', '500', '3,000'], answer: 0, why: '$10 \\times (200 + 300 + 1) = 5010$, against $60{,}000$ pixels.' },
      { q: 'The strengths are 9, 4, 2 and 1. You keep two layers. How big is the error?', options: ['$\\sqrt5$', '3', '$\\sqrt{97}$', '0'], answer: 0, why: 'Square the discarded strengths and add them: $4 + 1 = 5$.' },
      { q: 'Which picture compresses worst?', options: ['Random static', 'A plain grey square', 'Horizontal stripes', 'A tartan'], answer: 0, why: 'Static has no shared pattern, so every layer is about equally strong. The other three need one or two layers.' },
    ],
    proof: {
      claim: t`A layer $\mathbf u\mathbf v^T$ has rank one: every row is a multiple of the same row $\mathbf v^T$.`,
      steps: [
        { ask: t`What is row $i$ of $\mathbf u\mathbf v^T$?`, options: [t`$u_i\,\mathbf v^T$`, t`$\mathbf u\,v_i$`, t`$u_iv_i$`], answer: 0, why: t`Entry $(i, j)$ is $u_iv_j$, so row $i$ is the number $u_i$ times the whole row $\mathbf v^T$.` },
        { ask: 'So how many independent rows can a layer have?', options: ['At most one', 'As many as it has rows', 'Two'], answer: 0, why: t`Every row is a multiple of $\mathbf v^T$, so they all lie on one line.` },
        { ask: 'Why does a layer cost only m + n numbers?', options: [t`Knowing $\mathbf u$ and $\mathbf v$ gives every entry $u_iv_j$`, 'Most entries are zero', 'The SVD stores only the diagonal'], answer: 0, why: 'Every pixel is rebuilt by one multiplication.' },
      ],
      conclusion: t`So $k$ layers make a matrix of rank at most $k$, stored in $k(m + n + 1)$ numbers. The SVD picks the $k$ layers that lose the least, which the next lesson makes precise.`,
    },
  },
  {
    id: 'laml-svd-low-rank', module: SVD, title: 'Inside the SVD: patterns, strengths and choosing k', minutes: 30, level: 'Advanced',
    why: { title: 'How many patterns are really there?', story: 'A bridge carries forty strain gauges, logged every hour for a year. A shop records what every customer bought. A climate model saves a temperature map every day. Each table is huge, yet only a few patterns drive it: daily heating and traffic load, a handful of tastes, a few weather systems. The strengths in the SVD say how many patterns matter, and the rest is noise you can drop.' },
    objective: 'Read the three SVD factors as patterns and strengths, rebuild a matrix layer by layer, choose k from the energy kept, and use the fact that no other rank-k matrix is closer.',
    prose: [
      'Eight days of readings from six strain gauges on a bridge make an 8 × 6 table. Two things drive it: the daily temperature swing and the traffic. On top of that sits a little sensor noise. The SVD should find two strong layers and leave only weak ones over.',
      '`[U, S, V] = svd(A)` returns three factors with A = U·S·Vᵀ. The columns of V are **row patterns**: how the six gauges move together. The columns of U are **column patterns**: how strongly each day shows that pattern. The diagonal of S holds the strengths σ₁ ≥ σ₂ ≥ … ≥ 0. The columns of U are perpendicular unit vectors, and so are the columns of V, so no layer repeats what another already says.',
      'Layer i is σᵢ·uᵢ·vᵢᵀ. Adding all the layers gives A back exactly, and adding the first k gives A_k. The **energy** of a matrix is the sum of its squared entries, and it equals the sum of the squared strengths. So σ₁²/(σ₁² + σ₂² + …) is the share of the matrix carried by the first layer. Plotting the strengths usually shows an **elbow**: a few big ones, then a flat tail of small ones.',
      'Choosing k: keep layers until the kept energy passes a target such as 90% or 99%, or cut at the elbow. Rank is the number of nonzero strengths. With measured data nothing is exactly zero, so we count strengths above a small tolerance; this is the **numerical rank**.',
      'Why trust the SVD over any other way of making a rank-k copy? The **Eckart–Young theorem** (1936) says none is closer: among all matrices of rank k, A_k has the smallest error, and that error is the square root of the sum of the squared discarded strengths. Eckart and Young were psychologists looking for the few factors behind test scores. Their theorem is now used in signal processing, statistics and machine learning.',
      'A warning: a high kept energy says the copy is close in total, not that every detail survived. A rare event, such as one cracked gauge, can carry very little energy and vanish in the first layers. Look at what you threw away before trusting a compressed copy.',
    ],
    procedure: ['Compute [U, S, V] = svd(A) and sigma = diag(S); plot sigma and look for the elbow.', 'Energy kept by k layers: sum(sigma(1:k).^2)/sum(sigma.^2). The smallest k reaching a target is sum(energy < target) + 1.', 'Rebuild with Ak = U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k)).', 'Check the error against the discarded strengths, and look at A − Ak for anything important you lost.'],
    prediction: { question: 'The strengths of a table are 10, 1 and 0. What is its rank, and what does the first layer alone miss?', answer: 'Its rank is 2: two strengths are nonzero. The first layer keeps 100 out of 101 parts of the energy and misses a pattern of size 1.' },
    demo: {
      code: t`days = 8;
gauges = 6;
A = zeros(days, gauges);
for d = 1:days
  for g = 1:gauges
    heat = 3*sin(d/2)*(1 + g/6);
    traffic = 2*mod(d, 3)*(g == 3 || g == 4);
    noise = 0.1*sin(1.7*d*g + d);
    A(d,g) = heat + traffic + noise;
  end
end
[U, S, V] = svd(A);
sigma = diag(S);
disp('Strengths:'); disp(sigma)
energy = cumsum(sigma.^2)/sum(sigma.^2);
disp('Energy kept by 1, 2, 3 layers:'); disp(energy(1:3))
k = sum(energy < 0.99) + 1
Ak = U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k));
E = A - Ak;
err = sqrt(sum(sum(E.^2)))`,
      draw: t`bar(sigma)
title('Two strong patterns, then a tail of noise')
xlabel('Layer, strongest first'); ylabel('Strength sigma'); grid on`,
      explain: [{ code: 'A(d,g) = heat + traffic + noise;', meaning: 'Two real causes and a little noise, mixed together the way a sensor records them.' }, { code: 'energy = cumsum(sigma.^2)/sum(sigma.^2);', meaning: 'Running totals of the squared strengths, as a share of the whole.' }, { code: 'k = sum(energy < 0.99) + 1', meaning: 'Count the layer counts that fall short of 99%, plus one: the first k that reaches it. Here 2, one per real cause.' }, { code: 'err = sqrt(sum(sum(E.^2)))', meaning: 'What the two layers miss: about the size of the noise.' }],
    },
    challenge: {
      prompt: 'Store sigma, the strengths of A; layer1, the first layer σ₁u₁v₁ᵀ; k90, the fewest layers that keep at least 90% of the energy; and errK, the size of A − A_k for that k (the square root of the sum of its squared entries).',
      setup: 'A = [5 5 0; 5 5 0; 0 0 1];',
      starter: 'sigma = [0; 0; 0];\nlayer1 = A;\nk90 = 3;\nerrK = 0;',
      solution: t`[U, S, V] = svd(A);
sigma = diag(S);
layer1 = U(:,1:1)*S(1:1,1:1)*transpose(V(:,1:1));
energy = cumsum(sigma.^2)/sum(sigma.^2);
k90 = sum(energy < 0.9) + 1;
Ak = U(:,1:k90)*S(1:k90,1:k90)*transpose(V(:,1:k90));
E = A - Ak;
errK = sqrt(sum(sum(E.^2)));`,
      checks: [{ name: 'sigma', expected: [10, 1, 0], tolerance: 1e-6, message: 'The 5s form one block of strength 10; the lone 1 is a second pattern.' }, { name: 'layer1', expected: [[5, 5, 0], [5, 5, 0], [0, 0, 0]], tolerance: 1e-6, message: 'Go through the middle factor: U(:,1:1)*S(1:1,1:1)*transpose(V(:,1:1)) is a matrix, while U(:,1)*transpose(V(:,1)) would be a dot product.' }, { name: 'k90', expected: 1, tolerance: 1e-9, message: 'The first layer keeps 100 of 101 parts of the energy.' }, { name: 'errK', expected: 1, tolerance: 1e-6, message: 'The discarded strengths are 1 and 0.' }],
      cases: [{ setup: 'A = [2 0 0; 0 2 0; 0 0 1];', checks: [{ name: 'sigma', expected: [2, 2, 1], tolerance: 1e-6, message: 'A diagonal matrix shows its strengths.' }, { name: 'k90', expected: 3, tolerance: 1e-9, message: 'Two layers keep 8/9, just under 90%.' }, { name: 'errK', expected: 0, tolerance: 1e-6, message: 'All three layers rebuild A.' }] }],
      hints: ['sigma = diag(S) after [U, S, V] = svd(A).', 'layer1 = U(:,1:1)*S(1:1,1:1)*transpose(V(:,1:1)); energy = cumsum(sigma.^2)/sum(sigma.^2);', 'k90 = sum(energy < 0.9) + 1; then rebuild Ak with k90 layers and measure A − Ak.'],
      transfer: 'Add a small number, 0.01 times a matrix of ones, to the first A. Which strength changes from 0, and why does a numerical rank need a tolerance?',
    },
    notation: [
      { tex: t`A = U\Sigma V^T = \sum_i \sigma_i\,\mathbf u_i\mathbf v_i^T, \qquad U^TU = I,\ V^TV = I`, say: 'Perpendicular column patterns, perpendicular row patterns, and strengths.' },
      { tex: t`\sum_{i,j} a_{ij}^2 = \sigma_1^2 + \sigma_2^2 + \cdots`, say: 'The energy of a matrix is the sum of its squared strengths.' },
      { tex: t`\min_{\operatorname{rank} B \le k}\|A - B\| = \|A - A_k\| = \sqrt{\textstyle\sum_{i > k}\sigma_i^2}`, say: 'Eckart–Young: the first $k$ layers are the best rank-$k$ copy.' },
    ],
    quiz: [
      { q: 'Singular values 3 and 1. What fraction of the energy does one layer keep?', options: ['90%', '75%', '50%', '100%'], answer: 0, why: '$9/(9 + 1) = 0.9$.' },
      { q: 'Which layers does the best rank-$k$ copy keep?', options: ['The $k$ strongest', 'The $k$ weakest', 'Any $k$', 'All but the strongest'], answer: 0, why: 'Keeping the strongest loses the least energy (Eckart–Young).' },
      { q: 'A measured $50 \\times 20$ table has strengths 40, 31, 0.02, 0.01, … What is its sensible numerical rank?', options: ['2', '20', '50', '1'], answer: 0, why: 'Two strengths stand far above the noise level; the rest are noise.' },
    ],
    proof: {
      claim: t`The squared error of the rank-$k$ copy is the sum of the squared discarded strengths: $\|A - A_k\|^2 = \sum_{i > k}\sigma_i^2$.`,
      given: t`$A - A_k = \sum_{i > k}\sigma_i\mathbf u_i\mathbf v_i^T$, with perpendicular unit vectors $\mathbf u_i$ and perpendicular unit vectors $\mathbf v_i$.`,
      steps: [
        { ask: t`The energy of a matrix $M$ is the sum of its squared entries. How can it be written with a trace?`, options: [t`$\operatorname{tr}(M^TM)$`, t`$\operatorname{tr}(M)^2$`, t`$\det(M^TM)$`], answer: 0, why: t`The diagonal entries of $M^TM$ are the squared lengths of the columns of $M$.` },
        { ask: t`Expand $M^TM$ for $M = \sum_{i > k}\sigma_i\mathbf u_i\mathbf v_i^T$. What happens to the cross terms?`, options: [t`They vanish, because $\mathbf u_i^T\mathbf u_j = 0$ for $i \ne j$`, 'They double', t`They become $\sigma_i\sigma_j$`], answer: 0, why: t`$M^TM = \sum_{i,j}\sigma_i\sigma_j\mathbf v_i\mathbf u_i^T\mathbf u_j\mathbf v_j^T$, and only $i = j$ survives.` },
        { ask: t`What is $\operatorname{tr}(\sigma_i^2\mathbf v_i\mathbf v_i^T)$?`, options: [t`$\sigma_i^2$, because $\mathbf v_i$ has length 1`, t`$\sigma_i$`, '0'], answer: 0, why: t`$\operatorname{tr}(\mathbf v\mathbf v^T) = \mathbf v^T\mathbf v = 1$.` },
      ],
      conclusion: t`So the error of $A_k$ is $\sqrt{\sum_{i > k}\sigma_i^2}$. Eckart and Young went further and showed that no rank-$k$ matrix does better.`,
    },
  },
]
