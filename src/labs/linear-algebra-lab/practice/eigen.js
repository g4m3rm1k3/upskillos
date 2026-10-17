// Practice for "Directions that don't turn" and "Tensors in the real world": PageRank, vibration
// modes, stress on a cut, principal stresses, Mohr's circle and the inertia tensor.
// Answers come from running each reference solution, so generators only need valid inputs.
import { mat, vec } from './helpers.js'

const lines = (...source) => source.join('\n')

function problem(id, title, difficulty, build) {
  return { id, title, difficulty, generate(rng) {
    const { prompt, setup, solution, outputs, hints } = build(rng)
    return {
      prompt, setup, solution, hints,
      outputs: outputs.map(([name, message, kind]) => ({ name, message, tolerance: 1e-6, ...(kind && { kind }) })),
      starter: lines('% Replace each placeholder using the supplied inputs.', ...outputs.map(([name]) => `${name} = -999999;`)),
    }
  } }
}

// A random web of n pages: every page links to at least one other page.
function linkMatrix(r, n) {
  const columns = Array.from({ length: n }, (_, j) => {
    const others = Array.from({ length: n }, (_, i) => i).filter(i => i !== j)
    let chosen = others.filter(() => r.int(0, 1) === 1)
    if (!chosen.length) chosen = [r.pick(others)]
    return Array.from({ length: n }, (_, i) => chosen.includes(i) ? `1/${chosen.length}` : '0')
  })
  return mat(Array.from({ length: n }, (_, i) => columns.map(column => column[i])))
}
// Symmetric 2 × 2 and 3 × 3 tensors with random entries.
const sym2 = (sx, sy, tau) => mat([[sx, tau], [tau, sy]])
const stress2 = r => sym2(r.int(-60, 120), r.int(-60, 120), r.nonzero(-50, 50))
const sym3 = (r, lo, hi, off) => { const a = r.int(-off, off), b = r.int(-off, off), c = r.int(-off, off); return mat([[r.int(lo, hi), a, b], [a, r.int(lo, hi), c], [b, c, r.int(lo, hi)]]) }
const ANGLES = [15, 20, 30, 40, 45, 60, 75, 110, 135, 150]
const PAGE_DAMPING = [0.75, 0.8, 0.85, 0.9]

export const eigenPractice = {
  'laml-pagerank': [
    problem('one-click', 'One click of the random reader', 'Warm-up', r => ({
      prompt: 'L is a link matrix and r lists the chance of being on each page. Store next = L*r, the chances after one click, and total = sum(next), which should still be 1.',
      setup: lines(`L = ${linkMatrix(r, 4)};`, `r = ${vec(randomDistribution(r, 4))};`),
      solution: lines('next = L*r;', 'total = sum(next);'),
      outputs: [['next', 'Multiply the link matrix by the chances.'], ['total', 'Add up the entries.']],
      hints: ['Each new chance collects what flows in along incoming links.', 'next = L*r;', 'total = sum(next);'],
    })),
    problem('google-matrix', 'Blend in random jumps', 'Warm-up', r => ({
      prompt: 'Store G = d*L + (1 - d)/n, the link matrix blended with random jumps, and colSums = sum(G), the sum of each column (each should be 1).',
      setup: lines(`L = ${linkMatrix(r, 3)};`, 'n = 3;', `d = ${r.pick(PAGE_DAMPING)};`),
      solution: lines('G = d*L + (1 - d)/n;', 'colSums = sum(G);'),
      outputs: [['G', 'Follow a link with chance d, jump anywhere otherwise.'], ['colSums', 'sum adds down each column.']],
      hints: ['(1 - d)/n is added to every entry.', 'G = d*L + (1 - d)/n;', 'colSums = sum(G);'],
    })),
    problem('rank-pages', 'Rank a small web', 'Apply', r => ({
      prompt: 'Store rank, the PageRank after 200 steps of rank = G*rank from equal scores, with G = d*L + (1 - d)/n, and [best, top] = max(rank).',
      setup: lines(`L = ${linkMatrix(r, 4)};`, 'n = 4;', `d = ${r.pick(PAGE_DAMPING)};`),
      solution: lines('G = d*L + (1 - d)/n;', 'rank = ones(n,1)/n;', 'for k = 1:200', '  rank = G*rank;', 'end', '[best, top] = max(rank);'),
      outputs: [['rank', 'Blend, then repeat the multiplication.'], ['best', 'The largest score.'], ['top', 'Which page has it.']],
      hints: ['Start from rank = ones(n,1)/n.', 'Put rank = G*rank; in a for loop.', '[best, top] = max(rank); gives the value and its position.'],
    })),
    problem('eigenvector-check', 'PageRank is an eigenvector', 'Apply', r => ({
      prompt: 'Compute rank by 200 steps of power iteration on G = d*L + (1 - d)/n, from equal scores. Store rank and residual = norm(G*rank - rank), which is near 0 for an eigenvector with eigenvalue 1.',
      setup: lines(`L = ${linkMatrix(r, 3)};`, 'n = 3;', `d = ${r.pick(PAGE_DAMPING)};`),
      solution: lines('G = d*L + (1 - d)/n;', 'rank = ones(n,1)/n;', 'for k = 1:200', '  rank = G*rank;', 'end', 'residual = norm(G*rank - rank);'),
      outputs: [['rank', 'Power iteration on G.'], ['residual', 'G leaves the PageRank unchanged.']],
      hints: ['Build G first.', 'Repeat rank = G*rank; 200 times.', 'residual = norm(G*rank - rank);'],
    })),
    problem('forgotten-page', 'A page nobody links to', 'Apply', r => {
      const n = 4, d = r.pick(PAGE_DAMPING)
      // Pages 1 to 3 link only among themselves; page 4 links out but receives no links.
      const L = linkMatrix(r, 3).slice(1, -1).split('; ').map(row => [...row.split(' '), '0'])
      L.push(['0', '0', '0', '0'])
      const out = r.int(1, 3)
      L[out - 1][3] = '1'
      return {
        prompt: 'Page 4 links out but no page links to it. Store rank, the PageRank after 200 steps, and lowest = (1 - d)/n, the smallest possible score. Compare rank(4) with lowest.',
        setup: lines(`L = ${mat(L)};`, `n = ${n};`, `d = ${d};`),
        solution: lines('G = d*L + (1 - d)/n;', 'rank = ones(n,1)/n;', 'for k = 1:200', '  rank = G*rank;', 'end', 'lowest = (1 - d)/n;'),
        outputs: [['rank', 'Power iteration on G.'], ['lowest', 'Only random jumps reach page 4.']],
        hints: ['Build G and iterate as usual.', 'A page with no incoming links gets only the random-jump share.', 'lowest = (1 - d)/n;'],
      }
    }),
    problem('sports-ranking', 'Rank teams by who they beat', 'Transfer', r => {
      const n = 4
      const W = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 0 : r.int(0, 3)))
      for (let j = 0; j < n; j++) if (W.every(row => row[j] === 0)) W[(j + 1) % n][j] = 1
      return {
        prompt: 'W(i,j) counts the times team i beat team j. Each loss passes credit to the winner: build L by dividing each column of W by its sum (a for loop over columns), then store score, 200 steps of score = G*score with G = 0.85*L + 0.15/n, and [best, champion] = max(score).',
        setup: lines(`W = ${mat(W)};`, `n = ${n};`),
        solution: lines('L = zeros(n, n);', 'for j = 1:n', '  L(:,j) = W(:,j) / sum(W(:,j));', 'end', 'G = 0.85*L + 0.15/n;', 'score = ones(n,1)/n;', 'for k = 1:200', '  score = G*score;', 'end', '[best, champion] = max(score);'),
        outputs: [['score', 'Normalise the columns, blend, iterate.'], ['best', 'The highest score.'], ['champion', 'Which team has it.']],
        hints: ['Column j lists who beat team j; divide it by its sum.', 'L(:,j) = W(:,j) / sum(W(:,j)); inside a for loop.', 'Then iterate exactly as for web pages.'],
      }
    }),
  ],
  'laml-vibrations': [
    problem('two-mass-frequencies', 'Two masses, three springs', 'Warm-up', r => ({
      prompt: 'Two unit masses sit between walls, joined by springs of stiffness k1 (wall–mass 1), k2 (between the masses) and k3 (mass 2–wall). Store K = [k1+k2 -k2; -k2 k2+k3] and omega = sqrt(eig(K)).',
      setup: lines(`k1 = ${r.int(1, 9)};`, `k2 = ${r.int(1, 9)};`, `k3 = ${r.int(1, 9)};`),
      solution: lines('K = [k1+k2 -k2; -k2 k2+k3];', 'omega = sqrt(eig(K));'),
      outputs: [['K', 'Each mass feels the springs attached to it.'], ['omega', 'Square roots of the eigenvalues.']],
      hints: ['The diagonal adds the stiffness of the springs touching each mass.', 'The off-diagonal entry is minus the shared spring.', 'omega = sqrt(eig(K));'],
    })),
    problem('in-step-mode', 'The in-step mode', 'Warm-up', r => ({
      prompt: 'For K = [a -b; -b a], check that v = [1; 1] is a mode. Store Kv = K*v, lambda = dot(v, Kv)/dot(v, v) and omega = sqrt(lambda).',
      setup: lines(`a = ${r.int(5, 12)};`, `b = ${r.int(1, 4)};`, 'K = [a -b; -b a];', 'v = [1; 1];'),
      solution: lines('Kv = K*v;', 'lambda = dot(v, Kv)/dot(v, v);', 'omega = sqrt(lambda);'),
      outputs: [['Kv', 'Multiply K by the shape.'], ['lambda', 'How much the shape is stretched.'], ['omega', 'The frequency is the square root.']],
      hints: ['A mode satisfies K v = λ v.', 'lambda = dot(v, Kv)/dot(v, v);', 'omega = sqrt(lambda);'],
    })),
    problem('unequal-masses', 'Heavier and lighter masses', 'Apply', r => ({
      prompt: 'With masses m(1) and m(2), the frequencies are square roots of the eigenvalues of S = Minv*K*Minv, where Minv = diag(1./sqrt(m)). Store S and omega = sqrt(eig(S)).',
      setup: lines(`m = ${vec([r.int(1, 5), r.int(1, 5)])};`, `K = ${sym2(r.int(4, 9), r.int(4, 9), -r.int(1, 3))};`),
      solution: lines('Minv = diag(1./sqrt(m));', 'S = Minv*K*Minv;', 'omega = sqrt(eig(S));'),
      outputs: [['S', 'Scale rows and columns by 1/√m.'], ['omega', 'Square roots of the eigenvalues of S.']],
      hints: ['diag of a vector builds a diagonal matrix.', 'S = Minv*K*Minv; is symmetric, so eig gives real values.', 'omega = sqrt(eig(S));'],
    })),
    problem('slowest-period', 'How long one slow swing takes', 'Apply', r => ({
      prompt: 'Three unit masses in a chain have K = s*[2 -1 0; -1 2 -1; 0 -1 2]. Store omega = sqrt(eig(K)) and period = 2*pi/omega(1), the time of one swing of the slowest mode.',
      setup: lines(`s = ${r.int(1, 20)};`),
      solution: lines('K = s*[2 -1 0; -1 2 -1; 0 -1 2];', 'omega = sqrt(eig(K));', 'period = 2*pi/omega(1);'),
      outputs: [['omega', 'Square roots of the eigenvalues.'], ['period', 'Time for one full swing of the lowest mode.']],
      hints: ['Build K first.', 'eig lists eigenvalues from smallest to largest.', 'period = 2*pi/omega(1);'],
    })),
    problem('resonance-check', 'Is the drive near resonance?', 'Apply', r => ({
      prompt: 'A machine shakes the system at frequency drive. Store omega = sqrt(eig(K)), nearest = min(abs(omega - drive)), the gap to the closest natural frequency, and risky = 1 if nearest < 0.2, otherwise 0.',
      setup: lines(`K = ${r.int(1, 6)}*[2 -1; -1 2];`, `drive = ${r.int(5, 40) / 10};`),
      solution: lines('omega = sqrt(eig(K));', 'nearest = min(abs(omega - drive));', 'risky = 0;', 'if nearest < 0.2', '  risky = 1;', 'end'),
      outputs: [['omega', 'The natural frequencies.'], ['nearest', 'The smallest gap.'], ['risky', 'Flag a drive close to a natural frequency.']],
      hints: ['Subtract drive from every frequency.', 'nearest = min(abs(omega - drive));', 'Use an if block for risky.'],
    })),
    problem('scaling-law', 'Stiffer or heavier', 'Transfer', r => ({
      prompt: 'Every spring is scaled by s and every mass is m. Store omega = sqrt(eig(s*K0/m)) and ratio = omega(2)/omega(1). Then explain why ratio does not depend on s or m.',
      setup: lines('K0 = [2 -1; -1 2];', `s = ${r.int(1, 12)};`, `m = ${r.int(1, 6)};`),
      solution: lines('omega = sqrt(eig(s*K0/m));', 'ratio = omega(2)/omega(1);'),
      outputs: [['omega', 'Frequencies of the scaled system.'], ['ratio', 'The higher frequency over the lower.']],
      hints: ['Unit masses become m: divide K by m.', 'omega = sqrt(eig(s*K0/m));', 'ratio = omega(2)/omega(1);'],
    })),
  ],
  'laml-stress-tensor': [
    problem('traction-on-cut', 'The force on a cut', 'Warm-up', r => ({
      prompt: 'For the stress tensor sigma and a cut whose normal is angleDeg degrees from x, store n = [cos; sin] of the angle, traction = sigma*n and normalStress = dot(n, traction).',
      setup: lines(`sigma = ${stress2(r)};`, `angleDeg = ${r.pick(ANGLES)};`),
      solution: lines('th = angleDeg*pi/180;', 'n = [cos(th); sin(th)];', 'traction = sigma*n;', 'normalStress = dot(n, traction);'),
      outputs: [['n', 'Convert to radians first.'], ['traction', 'The tensor times the normal.'], ['normalStress', 'The part of the traction along n.']],
      hints: ['th = angleDeg*pi/180;', 'n = [cos(th); sin(th)]; traction = sigma*n;', 'normalStress = dot(n, traction);'],
    })),
    problem('shear-on-cut', 'How much the cut slides', 'Warm-up', r => ({
      prompt: 'For the cut with unit normal n at angleDeg degrees, store normalStress = dot(n, sigma*n) and shearStress = norm(sigma*n - normalStress*n).',
      setup: lines(`sigma = ${stress2(r)};`, `angleDeg = ${r.pick(ANGLES)};`, 'th = angleDeg*pi/180;', 'n = [cos(th); sin(th)];'),
      solution: lines('t = sigma*n;', 'normalStress = dot(n, t);', 'shearStress = norm(t - normalStress*n);'),
      outputs: [['normalStress', 'Project the traction onto n.'], ['shearStress', 'The length of what is left.']],
      hints: ['Compute the traction t = sigma*n first.', 'normalStress = dot(n, t);', 'shearStress = norm(t - normalStress*n);'],
    })),
    problem('face-tractions', 'The faces of a tiny square', 'Apply', r => ({
      prompt: 'Store tx, the traction on the face whose normal is x (ex = [1; 0]), ty for the face whose normal is y (ey = [0; 1]), and shearMatch = tx(2) - ty(1), which is 0 because sigma is symmetric.',
      setup: lines(`sigma = ${stress2(r)};`, 'ex = [1; 0];', 'ey = [0; 1];'),
      solution: lines('tx = sigma*ex;', 'ty = sigma*ey;', 'shearMatch = tx(2) - ty(1);'),
      outputs: [['tx', 'The first column of sigma.'], ['ty', 'The second column of sigma.'], ['shearMatch', 'The two shear entries agree.']],
      hints: ['Multiply sigma by each unit normal.', 'tx = sigma*ex; ty = sigma*ey;', 'shearMatch = tx(2) - ty(1);'],
    })),
    problem('still-water', 'Pressure in still water', 'Apply', r => ({
      prompt: 'Still water at pressure p has sigma = -p*eye(2). For the cut at angleDeg, store normalStress and shearStress. Every cut feels the same push and no sliding.',
      setup: lines(`p = ${r.int(1, 50) / 10};`, `angleDeg = ${r.pick(ANGLES)};`),
      solution: lines('sigma = -p*eye(2);', 'th = angleDeg*pi/180;', 'n = [cos(th); sin(th)];', 't = sigma*n;', 'normalStress = dot(n, t);', 'shearStress = norm(t - normalStress*n);'),
      outputs: [['normalStress', 'Negative: the water pushes on the cut.'], ['shearStress', 'A still fluid has no shear.']],
      hints: ['Build sigma and n.', 't = sigma*n;', 'Split t into its normal and shear parts.'],
    })),
    problem('cut-in-3d', 'A slanted cut in 3D', 'Apply', r => ({
      prompt: 'In 3D, sigma is 3 × 3. For the cut whose normal points equally along x, y and z, n = [1; 1; 1]/sqrt(3), store traction = sigma*n and normalStress = dot(n, traction).',
      setup: lines(`sigma = ${sym3(r, -40, 100, 40)};`),
      solution: lines('n = [1; 1; 1]/sqrt(3);', 'traction = sigma*n;', 'normalStress = dot(n, traction);'),
      outputs: [['traction', 'The tensor times the unit normal.'], ['normalStress', 'The part of the traction along n.']],
      hints: ['The unit normal is [1; 1; 1] divided by its length.', 'traction = sigma*n;', 'normalStress = dot(n, traction);'],
    })),
    problem('pulled-bar', 'A bar pulled along its length', 'Transfer', r => ({
      prompt: 'A bar of cross-section area A mm² carries force F newtons along x, so s = F/A MPa and sigma = [s 0; 0 0]. Store s, and normalStress and shearStress on a cut at angleDeg. Which angle gives the most shear?',
      setup: lines(`F = ${r.int(5, 60) * 1000};`, `A = ${r.int(5, 40) * 10};`, `angleDeg = ${r.pick(ANGLES)};`),
      solution: lines('s = F/A;', 'sigma = [s 0; 0 0];', 'th = angleDeg*pi/180;', 'n = [cos(th); sin(th)];', 't = sigma*n;', 'normalStress = dot(n, t);', 'shearStress = norm(t - normalStress*n);'),
      outputs: [['s', 'Stress is force over area.'], ['normalStress', 'Equals s·cos² of the angle.'], ['shearStress', 'Equals s·|sin·cos| of the angle.']],
      hints: ['s = F/A;', 'Build sigma and the unit normal at the angle.', 'Split the traction as in the lesson.'],
    })),
  ],
  'laml-principal-stresses': [
    problem('principal-values', 'Principal stresses', 'Warm-up', r => ({
      prompt: 'Store principal = eig(sigma), the principal stresses (smallest first), and maxShear = (max(principal) - min(principal))/2.',
      setup: lines(`sigma = ${stress2(r)};`),
      solution: lines('principal = eig(sigma);', 'maxShear = (max(principal) - min(principal))/2;'),
      outputs: [['principal', 'The eigenvalues of sigma.'], ['maxShear', 'Half the difference.']],
      hints: ['Principal stresses are eigenvalues.', 'principal = eig(sigma);', 'maxShear = (max(principal) - min(principal))/2;'],
    })),
    problem('principal-direction', 'The direction of greatest pull', 'Apply', r => ({
      prompt: 'Use [V, D] = eig(sigma). Store greatest = D(2,2), direction = V(:,2) (either sign is accepted) and residual = norm(sigma*direction - greatest*direction), which is 0 on a principal cut.',
      setup: lines(`sigma = ${stress2(r)};`),
      solution: lines('[V, D] = eig(sigma);', 'greatest = D(2,2);', 'direction = V(:,2);', 'residual = norm(sigma*direction - greatest*direction);'),
      outputs: [['greatest', 'The larger eigenvalue.'], ['direction', 'Its unit eigenvector.', 'abs'], ['residual', 'No shear: the traction is along the normal.']],
      hints: ['eig sorts eigenvalues from smallest to largest.', 'The second column of V goes with D(2,2).', 'residual = norm(sigma*direction - greatest*direction);'],
    })),
    problem('principal-axes', 'Describe the stress in its own axes', 'Apply', r => ({
      prompt: 'Use [V, D] = eig(sigma) and store rotated = transpose(V)*sigma*V, the stress tensor in the principal axes, and offDiagonal = abs(rotated(1,2)), which is 0.',
      setup: lines(`sigma = ${stress2(r)};`),
      solution: lines('[V, D] = eig(sigma);', 'rotated = transpose(V)*sigma*V;', 'offDiagonal = abs(rotated(1,2));'),
      outputs: [['rotated', 'Rotate into the eigenvector axes.'], ['offDiagonal', 'No shear in the principal axes.']],
      hints: ['V holds the principal directions as columns.', 'rotated = transpose(V)*sigma*V;', 'offDiagonal = abs(rotated(1,2));'],
    })),
    problem('trace-and-det', 'Two numbers that do not change', 'Apply', r => ({
      prompt: 'Store principal = eig(sigma), total = sum(principal) and product = prod(principal). Compare total with sigma(1,1) + sigma(2,2) and product with det(sigma).',
      setup: lines(`sigma = ${stress2(r)};`),
      solution: lines('principal = eig(sigma);', 'total = sum(principal);', 'product = prod(principal);'),
      outputs: [['principal', 'The eigenvalues.'], ['total', 'Their sum: the trace.'], ['product', 'Their product: the determinant.']],
      hints: ['principal = eig(sigma);', 'total = sum(principal);', 'product = prod(principal);'],
    })),
    problem('principal-3d', 'Principal stresses in 3D', 'Apply', r => ({
      prompt: 'A 3D stress tensor has three principal stresses. Store principal = eig(sigma) and maxShear = (max(principal) - min(principal))/2.',
      setup: lines(`sigma = ${sym3(r, -40, 100, 40)};`),
      solution: lines('principal = eig(sigma);', 'maxShear = (max(principal) - min(principal))/2;'),
      outputs: [['principal', 'Three eigenvalues, smallest first.'], ['maxShear', 'Half the spread of the largest and smallest.']],
      hints: ['eig works the same for 3 × 3.', 'principal = eig(sigma);', 'maxShear = (max(principal) - min(principal))/2;'],
    })),
    problem('brittle-check', 'Will the glass crack?', 'Transfer', r => ({
      prompt: 'A brittle material cracks when the greatest principal stress reaches its strength. Store greatest = max(eig(sigma)) and safety = strength/greatest, the safety factor (above 1 is safe).',
      setup: lines(`sigma = ${sym2(r.int(40, 120), r.int(-20, 40), r.int(-40, 40))};`, `strength = ${r.int(60, 200)};`),
      solution: lines('greatest = max(eig(sigma));', 'safety = strength/greatest;'),
      outputs: [['greatest', 'The largest principal stress.'], ['safety', 'Strength divided by the largest pull.']],
      hints: ['The largest pull is the largest eigenvalue.', 'greatest = max(eig(sigma));', 'safety = strength/greatest;'],
    })),
  ],
  'laml-mohr-circle': [
    problem('centre-radius', 'Draw the circle', 'Warm-up', r => ({
      prompt: 'Store the centre c = (sx + sy)/2 and radius R = sqrt(((sx - sy)/2)^2 + tau^2) of Mohr\'s circle.',
      setup: lines(`sx = ${r.int(-50, 150)};`, `sy = ${r.int(-50, 150)};`, `tau = ${r.nonzero(-60, 60)};`),
      solution: lines('c = (sx + sy)/2;', 'R = sqrt(((sx - sy)/2)^2 + tau^2);'),
      outputs: [['c', 'The average pull.'], ['R', 'Pythagoras on half the difference and the shear.']],
      hints: ['The centre is an average.', 'The radius uses (sx - sy)/2 and tau.', 'R = sqrt(((sx - sy)/2)^2 + tau^2);'],
    })),
    problem('read-the-circle', 'Read off the extremes', 'Warm-up', r => ({
      prompt: 'Using the centre c and radius R, store principal = [c - R; c + R] and maxShear = R.',
      setup: lines(`sx = ${r.int(-50, 150)};`, `sy = ${r.int(-50, 150)};`, `tau = ${r.nonzero(-60, 60)};`, 'c = (sx + sy)/2;', 'R = sqrt(((sx - sy)/2)^2 + tau^2);'),
      solution: lines('principal = [c - R; c + R];', 'maxShear = R;'),
      outputs: [['principal', 'Where the circle crosses zero shear.'], ['maxShear', 'The top of the circle.']],
      hints: ['The circle crosses the axis at c ± R.', 'principal = [c - R; c + R];', 'maxShear = R;'],
    })),
    problem('circle-versus-eig', 'The circle agrees with eig', 'Apply', r => ({
      prompt: 'Store fromCircle = [c - R; c + R] using Mohr\'s circle, fromEig = eig([sx tau; tau sy]), and gap = norm(fromEig - fromCircle).',
      setup: lines(`sx = ${r.int(-50, 150)};`, `sy = ${r.int(-50, 150)};`, `tau = ${r.nonzero(-60, 60)};`),
      solution: lines('c = (sx + sy)/2;', 'R = sqrt(((sx - sy)/2)^2 + tau^2);', 'fromCircle = [c - R; c + R];', 'fromEig = eig([sx tau; tau sy]);', 'gap = norm(fromEig - fromCircle);'),
      outputs: [['fromCircle', 'Centre plus and minus radius.'], ['fromEig', 'Eigenvalues of the stress tensor.'], ['gap', 'The two routes agree.']],
      hints: ['Compute c and R first.', 'fromEig = eig([sx tau; tau sy]);', 'gap = norm(fromEig - fromCircle);'],
    })),
    problem('point-on-circle', 'One cut as one point', 'Apply', r => ({
      prompt: 'For the cut at angleDeg, store normalStress = c + a*cos(2*th) + tau*sin(2*th) and shear = -a*sin(2*th) + tau*cos(2*th), with a = (sx - sy)/2, and dist = sqrt((normalStress - c)^2 + shear^2), which equals R.',
      setup: lines(`sx = ${r.int(-50, 150)};`, `sy = ${r.int(-50, 150)};`, `tau = ${r.nonzero(-60, 60)};`, `angleDeg = ${r.pick(ANGLES)};`),
      solution: lines('th = angleDeg*pi/180;', 'c = (sx + sy)/2;', 'a = (sx - sy)/2;', 'normalStress = c + a*cos(2*th) + tau*sin(2*th);', 'shear = -a*sin(2*th) + tau*cos(2*th);', 'dist = sqrt((normalStress - c)^2 + shear^2);'),
      outputs: [['normalStress', 'Across: the normal stress on this cut.'], ['shear', 'Up: the shear on this cut.'], ['dist', 'Every cut lies on the circle.']],
      hints: ['Convert the angle to radians; the circle uses twice the angle.', 'Write c, a, then the two formulas.', 'dist = sqrt((normalStress - c)^2 + shear^2);'],
    })),
    problem('equal-pulls', 'When the circle shrinks', 'Apply', r => ({
      prompt: 'Store c and R for equal pulls sx = sy = s with shear tau, and principal = [c - R; c + R]. With tau = 0 the circle would be a single point.',
      setup: lines(`s = ${r.int(-40, 120)};`, 'sx = s;', 'sy = s;', `tau = ${r.nonzero(-40, 40)};`),
      solution: lines('c = (sx + sy)/2;', 'R = sqrt(((sx - sy)/2)^2 + tau^2);', 'principal = [c - R; c + R];'),
      outputs: [['c', 'The common pull.'], ['R', 'Only the shear is left.'], ['principal', 'Centre plus and minus radius.']],
      hints: ['The usual formulas still work.', 'With sx = sy, R is just |tau|.', 'principal = [c - R; c + R];'],
    })),
    problem('twisted-shaft', 'A shaft in torsion', 'Transfer', r => ({
      prompt: 'A solid shaft of diameter d mm carries torque T N·mm. The surface feels pure shear tau = 16*T/(pi*d^3) MPa. Store tau, the circle\'s R (with sx = sy = 0) and principal = [-R; R]. Chalk twisted apart breaks along a 45° spiral: the cut of greatest pull.',
      setup: lines(`T = ${r.int(10, 200) * 1000};`, `d = ${r.int(10, 40)};`),
      solution: lines('tau = 16*T/(pi*d^3);', 'R = sqrt(0^2 + tau^2);', 'principal = [-R; R];'),
      outputs: [['tau', 'The surface shear stress.'], ['R', 'With no pulls, the radius is the shear.'], ['principal', 'Equal pull and push.']],
      hints: ['tau = 16*T/(pi*d^3);', 'With sx = sy = 0, the centre is 0.', 'R = sqrt(0^2 + tau^2); principal = [-R; R];'],
    })),
  ],
  'laml-inertia-tensor': [
    problem('box-moments', 'A box\'s principal moments', 'Warm-up', r => ({
      prompt: 'A box of mass m and sides a, b, c (metres) has I = m/12*diag([b^2+c^2 a^2+c^2 a^2+b^2]). Store I and moments = eig(I).',
      setup: lines(`m = ${r.int(1, 20) / 2};`, `a = ${r.int(10, 60) / 100};`, `b = ${r.int(10, 60) / 100};`, `c = ${r.int(1, 10) / 100};`),
      solution: lines('I = m/12*diag([b^2+c^2 a^2+c^2 a^2+b^2]);', 'moments = eig(I);'),
      outputs: [['I', 'A diagonal tensor: the edges are along the axes.'], ['moments', 'Its eigenvalues, smallest first.']],
      hints: ['Write the diagonal exactly as given.', 'diag of a row builds a diagonal matrix.', 'moments = eig(I);'],
    })),
    problem('angular-momentum', 'Momentum leans away', 'Apply', r => ({
      prompt: 'Store L = I*w and tiltDeg, the angle between L and w in degrees: acos(dot(L, w)/(norm(L)*norm(w)))*180/pi.',
      setup: lines(`I = ${sym3(r, 5, 12, 2)};`, `w = ${vec([r.int(-3, 3), r.int(-3, 3), r.int(1, 3)])};`),
      solution: lines('L = I*w;', 'tiltDeg = acos(dot(L, w)/(norm(L)*norm(w)))*180/pi;'),
      outputs: [['L', 'The tensor times the spin.'], ['tiltDeg', 'Zero only on a principal axis.']],
      hints: ['L = I*w;', 'The cosine of the angle is the dot product over the lengths.', 'Convert radians to degrees with 180/pi.'],
    })),
    problem('steady-spin', 'Steady or wobbling?', 'Apply', r => ({
      prompt: 'Store L = I*w and offAxis = norm(L - (dot(L, w)/dot(w, w))*w), the part of L not along w. A steady spin has offAxis = 0.',
      setup: lines(`I = ${sym3(r, 5, 12, 2)};`, `w = ${vec([r.int(-3, 3), r.int(-3, 3), r.int(1, 3)])};`),
      solution: lines('L = I*w;', 'offAxis = norm(L - (dot(L, w)/dot(w, w))*w);'),
      outputs: [['L', 'The angular momentum.'], ['offAxis', 'Remove the part along w.']],
      hints: ['Project L onto w, as in the dot product module.', 'The projection is (dot(L, w)/dot(w, w))*w.', 'offAxis = norm(L - (dot(L, w)/dot(w, w))*w);'],
    })),
    problem('spin-energy', 'Energy of a spin', 'Apply', r => ({
      prompt: 'The kinetic energy of a spin is E = 0.5*transpose(w)*I*w. Store L = I*w and E.',
      setup: lines(`I = ${sym3(r, 5, 12, 2)};`, `w = ${vec([r.int(-3, 3), r.int(-3, 3), r.int(1, 3)])};`),
      solution: lines('L = I*w;', 'E = 0.5*transpose(w)*I*w;'),
      outputs: [['L', 'The tensor times the spin.'], ['E', 'Half of w · (I w).']],
      hints: ['L = I*w;', 'E is a single number.', 'E = 0.5*transpose(w)*I*w;'],
    })),
    problem('middle-axis', 'Find the unstable axis', 'Apply', r => ({
      prompt: 'Store moments = eig(I), middle = moments(2), the moment about the unstable axis, and spread = max(moments) - min(moments).',
      setup: lines(`I = ${sym3(r, 5, 12, 2)};`),
      solution: lines('moments = eig(I);', 'middle = moments(2);', 'spread = max(moments) - min(moments);'),
      outputs: [['moments', 'The principal moments.'], ['middle', 'The second of three, smallest first.'], ['spread', 'Largest minus smallest.']],
      hints: ['moments = eig(I);', 'eig sorts them, so the middle is the second.', 'spread = max(moments) - min(moments);'],
    })),
    problem('point-masses', 'Inertia from point masses', 'Transfer', r => ({
      prompt: 'Point masses m(k) sit at (x(k), y(k), 0). Store I = [Ixx Ixy 0; Ixy Iyy 0; 0 0 Izz] with Ixx = sum(m.*y.^2), Iyy = sum(m.*x.^2), Ixy = -sum(m.*x.*y), Izz = Ixx + Iyy, and moments = eig(I).',
      setup: lines(`m = ${vec([r.int(1, 5), r.int(1, 5), r.int(1, 5)])};`, `x = ${vec([r.int(-3, 3), r.int(-3, 3), r.nonzero(-3, 3)])};`, `y = ${vec([r.int(-3, 3), r.nonzero(-3, 3), r.int(-3, 3)])};`),
      solution: lines('Ixx = sum(m.*y.^2);', 'Iyy = sum(m.*x.^2);', 'Ixy = -sum(m.*x.*y);', 'Izz = Ixx + Iyy;', 'I = [Ixx Ixy 0; Ixy Iyy 0; 0 0 Izz];', 'moments = eig(I);'),
      outputs: [['I', 'Assemble the symmetric tensor.'], ['moments', 'Its eigenvalues.']],
      hints: ['.* and .^ work entry by entry.', 'Ixy carries a minus sign.', 'moments = eig(I);'],
    })),
  ],
}

function randomDistribution(r, n) {
  const weights = Array.from({ length: n }, () => r.int(1, 9))
  const total = weights.reduce((a, b) => a + b, 0)
  return weights.map(w => `${w}/${total}`)
}
