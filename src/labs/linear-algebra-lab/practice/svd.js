// Practice for "The SVD: the shape of any matrix": compressing a picture with k layers, and reading
// the strengths (energy, numerical rank, the best rank-k copy, choosing k, removing noise).
// Answers come from running each reference solution, so generators only need valid inputs.
// Outer products use reshape, or the slice form U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k)), because flat vectors multiply as a dot product.
import { mat, vec } from './helpers.js'

const lines = (...source) => source.join('\n')

function problem(id, title, difficulty, build) {
  return { id, title, difficulty, generate(rng) {
    const { prompt, setup, solution, outputs, hints } = build(rng)
    return {
      prompt, setup, solution, hints,
      outputs: outputs.map(([name, message]) => ({ name, message, tolerance: 1e-6 })),
      starter: lines('% Replace each placeholder using the supplied inputs.', ...outputs.map(([name]) => `${name} = -999999;`)),
    }
  } }
}

// A small picture: brightness levels 0 to 9 (think of 9 as white).
const grid = (r, m, n, lo = 0, hi = 9) => Array.from({ length: m }, () => Array.from({ length: n }, () => r.int(lo, hi)))
const levels = (r, n) => Array.from({ length: n }, () => r.int(1, 9) / 10)
// Faint noise, a few hundredths either way.
const noise = (r, m, n) => Array.from({ length: m }, () => Array.from({ length: n }, () => r.int(-5, 5) / 100))
const keepK = 'Ak = U(:,1:k)*S(1:k,1:k)*transpose(V(:,1:k));'
const size2 = 'E = A - Ak;'
const frob = name => `${name} = sqrt(sum(sum(E.^2)));`

export const svdPractice = {
  'laml-svd-photo': [
    problem('storage-count', 'Count what k layers cost', 'Warm-up', r => ({
      prompt: 'An m × n picture is kept with k layers. Store stored = k*(m + n + 1), the numbers kept; original = m*n, the pixel count; and ratio = stored/original.',
      setup: lines(`m = ${r.int(2, 40) * 10};`, `n = ${r.int(2, 40) * 10};`, `k = ${r.int(1, 30)};`),
      solution: lines('stored = k*(m + n + 1);', 'original = m*n;', 'ratio = stored/original;'),
      outputs: [['stored', 'One column, one row and one strength per layer.'], ['original', 'One number per pixel.'], ['ratio', 'Below 1 means the layers are cheaper.']],
      hints: ['Each layer stores m + n + 1 numbers.', 'stored = k*(m + n + 1); original = m*n;', 'ratio = stored/original;'],
    })),
    problem('one-layer', 'Build one layer from a column and a row', 'Warm-up', r => {
      const u = levels(r, r.int(3, 4)), v = levels(r, r.int(4, 5))
      return {
        prompt: 'u gives a brightness for each row and v one for each column. Store layer = s*(u as a column)*(v as a row), using reshape(u, length(u), 1) and reshape(v, 1, length(v)), and brightest = max(max(layer)).',
        setup: lines(`u = ${vec(u)};`, `v = ${vec(v)};`, `s = ${r.int(2, 9)};`),
        solution: lines('layer = s*reshape(u, length(u), 1)*reshape(v, 1, length(v));', 'brightest = max(max(layer));'),
        outputs: [['layer', 'Entry (i, j) is s times u(i) times v(j).'], ['brightest', 'The largest entry of the layer.']],
        hints: ['A flat vector times a flat vector is a dot product, so reshape them first.', 'reshape(u, length(u), 1) is a column; reshape(v, 1, length(v)) is a row.', 'max(max(layer)) takes the largest entry of a matrix.'],
      }
    }),
    problem('keep-k-layers', 'Keep the first k layers of a picture', 'Apply', r => ({
      prompt: 'A is a 4 × 5 picture. Store Ak, the picture rebuilt from its first k SVD layers, and err, the square root of the sum of the squared entries of A − Ak.',
      setup: lines(`A = ${mat(grid(r, 4, 5))};`, `k = ${r.int(1, 3)};`),
      solution: lines('[U, S, V] = svd(A);', keepK, size2, frob('err')),
      outputs: [['Ak', 'Use the first k columns of U and V and the top-left k × k block of S.'], ['err', 'Square every entry of A − Ak, add them and take the square root.']],
      hints: ['[U, S, V] = svd(A);', keepK, 'E = A - Ak; err = sqrt(sum(sum(E.^2)));'],
    })),
    problem('error-two-ways', 'Predict the error from the strengths', 'Apply', r => ({
      prompt: 'Keep k layers of A. Store errDirect, the size of A − Ak (square root of the sum of squared entries), and errFromSigma, the square root of the sum of the squared discarded strengths sigma(k+1:end). They should agree.',
      setup: lines(`A = ${mat(grid(r, 5, 4))};`, `k = ${r.int(1, 3)};`),
      solution: lines('[U, S, V] = svd(A);', keepK, size2, frob('errDirect'), 'sigma = svd(A);', 'errFromSigma = sqrt(sum(sigma(k+1:end).^2));'),
      outputs: [['errDirect', 'Rebuild with k layers and measure the difference.'], ['errFromSigma', 'Only the strengths after the first k count.']],
      hints: ['Rebuild Ak as in the lesson, then measure A − Ak.', 'sigma = svd(A) lists the strengths, strongest first.', 'errFromSigma = sqrt(sum(sigma(k+1:end).^2));'],
    })),
    problem('layers-for-target', 'How many layers for a target quality?', 'Transfer', r => ({
      prompt: 'Store k, the fewest layers of A whose squared strengths reach at least the fraction target of the total, and kept, the fraction those k layers actually keep.',
      setup: lines(`A = ${mat(grid(r, 5, 5))};`, `target = ${r.pick([0.8, 0.9, 0.95, 0.99])};`),
      solution: lines('sigma = svd(A);', 'energy = cumsum(sigma.^2)/sum(sigma.^2);', 'k = sum(energy < target) + 1;', 'kept = energy(k);'),
      outputs: [['k', 'Count the running totals that fall short of the target, plus one.'], ['kept', 'The running total at that k.']],
      hints: ['energy = cumsum(sigma.^2)/sum(sigma.^2) gives the share kept by 1, 2, 3, … layers.', 'k = sum(energy < target) + 1;', 'kept = energy(k);'],
    })),
    problem('noisy-stripes', 'Stripes under static', 'Transfer', r => {
      const u = levels(r, 4), v = levels(r, 5)
      return {
        prompt: 'A is a striped picture (one layer) with faint static added. Store s1 and s2, its two largest strengths, and gap = s1/s2. A large gap says one layer holds the picture and the rest is static.',
        setup: lines(`u = ${vec(u)};`, `v = ${vec(v)};`, `N = ${mat(noise(r, 4, 5))};`, 'A = 9*reshape(u, 4, 1)*reshape(v, 1, 5) + N;'),
        solution: lines('sigma = svd(A);', 's1 = sigma(1);', 's2 = sigma(2);', 'gap = s1/s2;'),
        outputs: [['s1', 'The strongest layer: the stripes.'], ['s2', 'The next one: mostly static.'], ['gap', 'How many times stronger the first layer is.']],
        hints: ['sigma = svd(A) lists the strengths, strongest first.', 's1 = sigma(1); s2 = sigma(2);', 'gap = s1/s2;'],
      }
    }),
  ],
  'laml-svd-low-rank': [
    problem('energy-two-ways', 'Energy from entries and from strengths', 'Warm-up', r => ({
      prompt: 'Store sigma = svd(A), entryEnergy, the sum of the squared entries of A, and sigmaEnergy, the sum of the squared strengths. They should agree.',
      setup: `A = ${mat(grid(r, 3, 4, -5, 5))};`,
      solution: lines('sigma = svd(A);', 'entryEnergy = sum(sum(A.^2));', 'sigmaEnergy = sum(sigma.^2);'),
      outputs: [['sigma', 'The strengths, strongest first.'], ['entryEnergy', 'Square every entry and add them.'], ['sigmaEnergy', 'Square every strength and add them.']],
      hints: ['.^2 squares entry by entry.', 'sum(sum(...)) adds every entry of a matrix.', 'sigmaEnergy = sum(sigma.^2);'],
    })),
    problem('first-layer', 'The first layer and its share', 'Warm-up', r => ({
      prompt: 'Store layer1 = σ₁u₁v₁ᵀ, the first SVD layer of A, and share, the fraction of the energy it carries: S(1,1)^2 divided by the sum of the squared entries of A.',
      setup: `A = ${mat(grid(r, 3, 3, -5, 5))};`,
      solution: lines('[U, S, V] = svd(A);', 'layer1 = U(:,1:1)*S(1:1,1:1)*transpose(V(:,1:1));', 'share = S(1,1)^2/sum(sum(A.^2));'),
      outputs: [['layer1', 'Keep the middle factor S(1:1,1:1) in the product.'], ['share', 'The first squared strength over the total energy.']],
      hints: ['[U, S, V] = svd(A);', 'layer1 = U(:,1:1)*S(1:1,1:1)*transpose(V(:,1:1));', 'share = S(1,1)^2/sum(sum(A.^2));'],
    })),
    problem('numerical-rank', 'Count the patterns that are really there', 'Apply', r => {
      // Multiply the hidden patterns here: in OpenMAT a 4 × 1 matrix literal is stored as a flat vector.
      const rank = r.int(1, 3), B = grid(r, 4, rank, -4, 4), C = grid(r, rank, 4, -4, 4)
      const A = B.map(row => C[0].map((_, j) => row.reduce((total, b, l) => total + b * C[l][j], 0)))
      return {
        prompt: 'A is built from a few hidden patterns. Store sigma = svd(A), numericRank, the number of strengths larger than 1e-8 times sigma(1), and weakest, the smallest of those strengths.',
        setup: `A = ${mat(A)};`,
        solution: lines('sigma = svd(A);', 'numericRank = sum(sigma > 1e-8*sigma(1));', 'weakest = sigma(numericRank);'),
        outputs: [['sigma', 'The strengths, strongest first.'], ['numericRank', 'Count the strengths above the tolerance.'], ['weakest', 'The last strength that still counts.']],
        hints: ['Rounding leaves tiny strengths instead of exact zeros.', 'sigma > 1e-8*sigma(1) is 1 for each strength that counts; sum adds them.', 'weakest = sigma(numericRank);'],
      }
    }),
    problem('beats-naive', 'The SVD beats a simple rank-one copy', 'Apply', r => ({
      prompt: 'Two rank-one copies of A. Store errSvd, the size of A minus its first SVD layer, and errColumn, the size of A − B where B = reshape(c, 4, 1)*reshape(w, 1, 3) projects every column onto the first column c = A(:,1), with weights w = transpose(A)*c/dot(c, c). Size means the square root of the sum of squared entries.',
      setup: `A = ${mat(grid(r, 4, 3, 1, 9))};`,
      solution: lines('[U, S, V] = svd(A);', 'A1 = U(:,1:1)*S(1:1,1:1)*transpose(V(:,1:1));', 'E = A - A1;', frob('errSvd'), 'c = A(:,1);', 'w = transpose(A)*c/dot(c, c);', 'B = reshape(c, 4, 1)*reshape(w, 1, 3);', 'F = A - B;', 'errColumn = sqrt(sum(sum(F.^2)));'),
      outputs: [['errSvd', 'Keep the first SVD layer only.'], ['errColumn', 'Project every column onto the first column.']],
      hints: ['A1 = U(:,1:1)*S(1:1,1:1)*transpose(V(:,1:1));', 'B is also rank one: every column is a multiple of c.', 'Eckart–Young says errSvd is never larger than errColumn.'],
    })),
    problem('budget', 'Fit a copy into a storage budget', 'Transfer', r => ({
      prompt: 'A is 5 × 6 and you may store at most budget numbers. Store k, the most layers that fit (each costs m + n + 1 numbers), and err, the size of A − Ak for that k.',
      setup: lines(`A = ${mat(grid(r, 5, 6))};`, `budget = ${r.int(12, 47)};`),
      solution: lines('[m, n] = size(A);', 'k = floor(budget/(m + n + 1));', '[U, S, V] = svd(A);', keepK, size2, frob('err')),
      outputs: [['k', 'Whole layers only: round down.'], ['err', 'Rebuild with k layers and measure the difference.']],
      hints: ['Each layer costs m + n + 1 = 12 numbers here.', 'k = floor(budget/(m + n + 1));', 'Rebuild Ak and measure A − Ak as in the lesson.'],
    })),
    problem('denoise', 'Remove noise by keeping one layer', 'Transfer', r => {
      const u = levels(r, 4), v = levels(r, 4)
      return {
        prompt: 'P is a clean one-layer pattern and A = P + N is what a sensor records. Store before, the size of A − P, and after, the size of A1 − P where A1 is the first SVD layer of A. Size means the square root of the sum of squared entries.',
        setup: lines(`P = 9*reshape(${vec(u)}, 4, 1)*reshape(${vec(v)}, 1, 4);`, `N = ${mat(noise(r, 4, 4))};`, 'A = P + N;'),
        solution: lines('E = A - P;', frob('before'), '[U, S, V] = svd(A);', 'A1 = U(:,1:1)*S(1:1,1:1)*transpose(V(:,1:1));', 'F = A1 - P;', 'after = sqrt(sum(sum(F.^2)));'),
        outputs: [['before', 'The noise in the raw recording.'], ['after', 'What is left after keeping one layer.']],
        hints: ['before measures A − P directly.', 'A1 = U(:,1:1)*S(1:1,1:1)*transpose(V(:,1:1));', 'Measure A1 − P the same way; it is usually smaller than before.'],
      }
    }),
  ],
}
