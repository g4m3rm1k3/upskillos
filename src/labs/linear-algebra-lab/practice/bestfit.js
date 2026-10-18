// Practice for "Best fit": the GPS opener (more readings than unknowns, noisy, find the position
// that disagrees least). Least squares, QR, Gram–Schmidt and orthogonal matrices keep their families
// in core.js and theory.js. Answers come from running each reference solution.
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

// Unit directions with tidy entries. No two are parallel, so any two give an exact position.
const DIRECTIONS = [[1, 0], [0, 1], [0.6, 0.8], [0.8, 0.6], [-0.6, 0.8], [0.8, -0.6]]
const round1 = x => Math.round(x * 10) / 10
function satellites(r, n) {
  const pool = [...DIRECTIONS]
  const chosen = Array.from({ length: n }, () => pool.splice(r.int(0, pool.length - 1), 1)[0])
  const truth = [r.int(-40, 40), r.int(-40, 40)]
  const readings = chosen.map(([a, b]) => round1(a * truth[0] + b * truth[1]) + r.int(-3, 3))
  return { D: chosen, truth, readings }
}

export const bestFitPractice = {
  'laml-best-fit-gps': [
    problem('fit-readings', 'Find the best-fit position', 'Warm-up', r => {
      const { D, readings } = satellites(r, 4)
      return {
        prompt: 'Each row of D is the direction of one satellite and r holds its reading. Store p, the position with the smallest total squared misfit.',
        setup: lines(`D = ${mat(D)};`, `r = ${vec(readings)};`),
        solution: 'p = D\\r;',
        outputs: [['p', 'Four equations, two unknowns: backslash gives the least-squares position.']],
        hints: ['There are more equations than unknowns, so no exact answer exists.', 'Backslash with a tall matrix returns the best fit.', 'p = D\\r;'],
      }
    }),
    problem('misfit-total', 'Score a proposed position', 'Warm-up', r => {
      const { D, truth, readings } = satellites(r, 4)
      return {
        prompt: 'A friend proposes the position guess. Store misfit = D*guess − r, the error of each satellite\'s reading at that guess, and total, the sum of the squared misfits.',
        setup: lines(`D = ${mat(D)};`, `r = ${vec(readings)};`, `guess = ${vec(truth.map(x => x + r.int(-2, 2)))};`),
        solution: lines('misfit = D*guess - r;', 'total = sum(misfit.^2);'),
        outputs: [['misfit', 'Predicted readings at the guess minus the recorded readings.'], ['total', 'Square each misfit, then add.']],
        hints: ['D*guess lists what each satellite would read at the guess.', 'misfit = D*guess - r;', 'total = sum(misfit.^2);'],
      }
    }),
    problem('two-versus-all', 'Two satellites or all of them?', 'Apply', r => {
      const { D, readings } = satellites(r, 5)
      return {
        prompt: 'Store pTwo, the exact position from the first two satellites only, and totalTwo, its total squared misfit over all five. Then store pAll = D\\r and its total totalAll. totalAll is never larger.',
        setup: lines(`D = ${mat(D)};`, `r = ${vec(readings)};`),
        solution: lines('pTwo = D(1:2,:)\\r(1:2);', 'totalTwo = sum((D*pTwo - r).^2);', 'pAll = D\\r;', 'totalAll = sum((D*pAll - r).^2);'),
        outputs: [['pTwo', 'Solve with rows 1 and 2 of D and entries 1 and 2 of r.'], ['totalTwo', 'Score it against all five readings.'], ['pAll', 'Use every row.'], ['totalAll', 'The smallest total any position can reach.']],
        hints: ['D(1:2,:) is the first two rows; r(1:2) the first two readings.', 'pTwo = D(1:2,:)\\r(1:2); pAll = D\\r;', 'totalTwo = sum((D*pTwo - r).^2); likewise totalAll.'],
      }
    }),
    problem('normal-equations', 'Solve through the normal equations', 'Apply', r => {
      const { D, readings } = satellites(r, 4)
      return {
        prompt: 'Store `DtD = D\'*D`, `Dtr = D\'*r`, and `p`, the solution of `DtD*p = Dtr`. It is the same best fit as `D\\r`.',
        setup: lines(`D = ${mat(D)};`, `r = ${vec(readings)};`),
        solution: lines("DtD = D'*D;", "Dtr = D'*r;", 'p = DtD\\Dtr;'),
        outputs: [['DtD', 'A 2 × 2 matrix: each entry is a column of D dotted with a column of D.'], ['Dtr', 'Each column of D dotted with the readings.'], ['p', 'Solve the square 2 × 2 system.']],
        hints: ["D' is the transpose of D.", "DtD = D'*D; Dtr = D'*r;", 'p = DtD\\Dtr;'],
      }
    }),
    problem('average-is-fit', 'One unknown: the fit is the average', 'Apply', r => {
      const base = r.int(20, 80), m = Array.from({ length: r.int(4, 6) }, () => round1(base + r.int(-15, 15) / 10))
      return {
        prompt: 'The same length was measured several times, giving m. Each measurement is one equation 1·x = m(i). Store p, the least-squares x from ones(n,1)\\m with n = length(m), and avg = mean(m).',
        setup: `m = ${vec(m)};`,
        solution: lines('n = length(m);', 'A = ones(n,1);', 'p = A\\m;', 'avg = mean(m);'),
        outputs: [['p', 'A tall column of ones against the measurements.'], ['avg', 'The ordinary average: the same number.']],
        hints: ['ones(n,1) is a column of n ones: one equation per measurement.', 'A = ones(n,1); p = A\\m;', 'avg = mean(m);'],
      }
    }),
    problem('error-from-truth', 'How far off is the fit?', 'Transfer', r => {
      const { D, truth, readings } = satellites(r, r.int(5, 6))
      return {
        prompt: 'In this test the true position truth is known. Store p = D\\r and err, the distance from p to truth.',
        setup: lines(`D = ${mat(D)};`, `r = ${vec(readings)};`, `truth = ${vec(truth)};`),
        solution: lines('p = D\\r;', 'err = norm(p - truth);'),
        outputs: [['p', 'The best fit from every satellite.'], ['err', 'The length of the difference p − truth.']],
        hints: ['Fit first, then compare.', 'norm(v) is the length of v.', 'p = D\\r; err = norm(p - truth);'],
      }
    }),
  ],
}
