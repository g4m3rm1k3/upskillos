// Practice for the "Physics" track: ray matrices, Lorentz boosts, the particle in a box and the double
// well. Answers come from running each reference solution, so generators only need valid inputs:
// lenses never sit exactly at a focus, speeds stay below 1, and boxes are kept small so eig is quick.
// Eigenvectors appear only squared, so their arbitrary signs never matter.
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

const FOCAL = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3]
const ray = r => `ray = [${r.int(-20, 20) / 1000}; ${r.int(-10, 10) / 100}];`
const speed = r => r.pick([-1, 1]) * r.pick([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9])
const event = r => `event = [${r.int(1, 9)}; ${r.int(-8, 8)}];`
const BOOST = ['gamma = 1/sqrt(1 - beta^2);', 'Lam = gamma*[1 -beta; -beta 1];']
const KINETIC = ['h = L/(N + 1);', 'T = zeros(N, N);', 'for k = 1:N', '  T(k,k) = 2;', '  if k > 1', '    T(k,k-1) = -1;', '  end', '  if k < N', '    T(k,k+1) = -1;', '  end', 'end', 'H = T/(2*h^2);']
const boxSetup = r => [`L = ${r.pick([0.5, 1, 1.5, 2])};`, `N = ${r.int(4, 9)};`]
// A symmetric double well: N even, barrier on the middle two or four points.
const wellSetup = r => {
  const N = r.pick([8, 10, 12])
  const w = r.pick([1, 2])
  return [`L = 1;`, `N = ${N};`, `barrier = ${N / 2 - w + 1}:${N / 2 + w};`, `V0 = ${r.pick([50, 100, 150, 200, 300])};`]
}
const WELL = ['V = zeros(1, N);', 'V(barrier) = V0;', 'H = H + diag(V);']

export const physicsPractice = {
  'laml-phys-optics': [
    problem('gap', 'A ray crosses a gap', 'Warm-up', r => ({
      prompt: 'A ray with height and angle in ray crosses a gap of length d. Store the gap matrix T and out = T*ray.',
      setup: lines(ray(r), `d = ${r.int(1, 30) / 100};`),
      solution: lines('T = [1 d; 0 1];', 'out = T*ray;'),
      outputs: [['T', 'The angle stays; the height grows by d times the angle.'], ['out', 'The ray after the gap.']],
      hints: ['T = [1 d; 0 1];', 'The ray is already named.', 'out = T*ray;'],
    })),
    problem('lens', 'A ray meets a lens', 'Warm-up', r => ({
      prompt: 'A ray (ray = [height; angle]) meets a thin lens of focal length f. Store the lens matrix Lm and out = Lm*ray.',
      setup: lines(ray(r), `f = ${r.pick(FOCAL)};`),
      solution: lines('Lm = [1 0; -1/f 1];', 'out = Lm*ray;'),
      outputs: [['Lm', 'The height stays; the angle changes by −height/f.'], ['out', 'The ray just after the lens.']],
      hints: ['Lm = [1 0; -1/f 1];', 'Rays above the axis are bent downwards.', 'out = Lm*ray;'],
    })),
    problem('system', 'Gap, then lens', 'Apply', r => ({
      prompt: 'A ray crosses a gap of length d and then a lens of focal length f. Store the system matrix S (light meets the gap first) and out = S*ray.',
      setup: lines(ray(r), `d = ${r.int(1, 30) / 100};`, `f = ${r.pick(FOCAL)};`),
      solution: lines('T = [1 d; 0 1];', 'Lm = [1 0; -1/f 1];', 'S = Lm*T;', 'out = S*ray;'),
      outputs: [['S', 'The first element sits on the right.'], ['out', 'The ray after both.']],
      hints: ['Build T and Lm.', 'The gap acts first, so it goes next to the ray: S = Lm*T;', 'out = S*ray;'],
    })),
    problem('image', 'Where is the image?', 'Apply', r => {
      const f = r.pick(FOCAL)
      return {
        prompt: 'An object sits a distance u in front of a lens of focal length f. Store v = 1/(1/f - 1/u), the image distance, the system matrix S from object to image, and mag = S(1,1).',
        setup: lines(`f = ${f};`, `u = ${Math.round(f * r.int(15, 40) * 100) / 1000};`),
        solution: lines('v = 1/(1/f - 1/u);', 'T1 = [1 u; 0 1];', 'Lm = [1 0; -1/f 1];', 'T2 = [1 v; 0 1];', 'S = T2*Lm*T1;', 'mag = S(1,1);'),
        outputs: [['v', 'From 1/u + 1/v = 1/f.'], ['S', 'S(1,2) comes out 0: an image.'], ['mag', 'Equal to −v/u.']],
        hints: ['v = 1/(1/f - 1/u);', 'S = T2*Lm*T1 with T1 = [1 u; 0 1] and T2 = [1 v; 0 1].', 'mag = S(1,1);'],
      }
    }),
    problem('two-lens', 'The focal length of two lenses', 'Apply', r => {
      const f1 = r.pick(FOCAL), f2 = r.pick(FOCAL)
      return {
        prompt: 'Two thin lenses, f1 then f2, are a distance d apart. Store the system matrix S (light meets f1 first) and feff = -1/S(2,1), the focal length of the pair.',
        setup: lines(`f1 = ${f1};`, `f2 = ${f2};`, `d = ${Math.round((f1 + f2) * r.pick([0.2, 0.4, 0.6]) * 1000) / 1000};`),
        solution: lines('L1 = [1 0; -1/f1 1];', 'T = [1 d; 0 1];', 'L2 = [1 0; -1/f2 1];', 'S = L2*T*L1;', 'feff = -1/S(2,1);'),
        outputs: [['S', 'Lens, gap, lens, right to left.'], ['feff', 'C = −1/f for the whole system.']],
        hints: ['S = L2*T*L1;', 'The bottom-left entry is −1/(focal length).', 'feff = -1/S(2,1);'],
      }
    }),
    problem('det-one', 'Determinant 1', 'Apply', r => ({
      prompt: 'Light crosses a gap d1, a lens of focal length f, and a gap d2. Store the system matrix S and detS = det(S).',
      setup: lines(`d1 = ${r.int(1, 30) / 100};`, `f = ${r.pick(FOCAL)};`, `d2 = ${r.int(1, 30) / 100};`),
      solution: lines('S = [1 d2; 0 1]*[1 0; -1/f 1]*[1 d1; 0 1];', 'detS = det(S);'),
      outputs: [['S', 'Three matrices, the first one on the right.'], ['detS', 'Every gap and lens has determinant 1.']],
      hints: ['Write each matrix and multiply, last element first.', 'S = [1 d2; 0 1]*[1 0; -1/f 1]*[1 d1; 0 1];', 'detS = det(S);'],
    })),
  ],
  'laml-phys-lorentz': [
    problem('gamma', 'Time dilation factor', 'Warm-up', r => ({
      prompt: 'A clock moves at speed beta (c = 1) and ticks tau seconds of its own time. Store gamma = 1/sqrt(1 - beta^2) and dilated = gamma*tau, the time we measure.',
      setup: lines(`beta = ${Math.abs(speed(r))};`, `tau = ${r.int(1, 9)};`),
      solution: lines('gamma = 1/sqrt(1 - beta^2);', 'dilated = gamma*tau;'),
      outputs: [['gamma', 'At least 1.'], ['dilated', 'Moving clocks run slow, so we measure more.']],
      hints: ['gamma = 1/sqrt(1 - beta^2);', 'Multiply the clock\'s own time by gamma.', 'dilated = gamma*tau;'],
    })),
    problem('boost', 'Boost an event', 'Warm-up', r => ({
      prompt: 'An observer moves at speed beta (c = 1). Store their boost matrix Lam = gamma*[1 -beta; -beta 1] and moved = Lam*event, the event in their coordinates.',
      setup: lines(`beta = ${speed(r)};`, event(r)),
      solution: lines(...BOOST, 'moved = Lam*event;'),
      outputs: [['Lam', 'γ times [1 −β; −β 1].'], ['moved', 'The same event, other coordinates.']],
      hints: ['gamma = 1/sqrt(1 - beta^2);', 'Lam = gamma*[1 -beta; -beta 1];', 'moved = Lam*event;'],
    })),
    problem('interval', 'The interval is unchanged', 'Apply', r => ({
      prompt: 'With eta = [1 0; 0 -1], store before = dot(event, eta*event), the interval of event, moved = Lam*event for the boost with speed beta, and after = dot(moved, eta*moved).',
      setup: lines(`beta = ${speed(r)};`, event(r)),
      solution: lines(...BOOST, 'eta = [1 0; 0 -1];', 'before = dot(event, eta*event);', 'moved = Lam*event;', 'after = dot(moved, eta*moved);'),
      outputs: [['before', 't² − x².'], ['moved', 'The boosted event.'], ['after', 'The same as before.']],
      hints: ['eta = [1 0; 0 -1];', 'before = dot(event, eta*event);', 'Boost, then compute the same thing for moved.'],
    })),
    problem('compose', 'Two boosts in a row', 'Apply', r => ({
      prompt: 'Store both = Lam2*Lam1, the boost with speed b1 followed by the boost with speed b2, combined = -both(1,2)/both(1,1), its speed, and formula = (b1 + b2)/(1 + b1*b2).',
      setup: lines(`b1 = ${speed(r)};`, `b2 = ${speed(r)};`),
      solution: lines('Lam1 = (1/sqrt(1 - b1^2))*[1 -b1; -b1 1];', 'Lam2 = (1/sqrt(1 - b2^2))*[1 -b2; -b2 1];', 'both = Lam2*Lam1;', 'combined = -both(1,2)/both(1,1);', 'formula = (b1 + b2)/(1 + b1*b2);'),
      outputs: [['both', 'Another boost.'], ['combined', 'Read the speed off the product.'], ['formula', 'The velocity-addition rule.']],
      hints: ['Build each boost with its own gamma.', 'both = Lam2*Lam1;', 'combined = -both(1,2)/both(1,1);'],
    })),
    problem('inverse', 'Undo a boost', 'Apply', r => ({
      prompt: 'Lam is the boost with speed beta. Store back, the boost with speed −beta, and check = back*Lam.',
      setup: lines(`beta = ${speed(r)};`, ...BOOST),
      solution: lines('back = gamma*[1 beta; beta 1];', 'check = back*Lam;'),
      outputs: [['back', 'The same gamma, the opposite speed.'], ['check', 'The identity: boosting back undoes the boost.']],
      hints: ['gamma is the same for β and −β.', 'back = gamma*[1 beta; beta 1];', 'check = back*Lam;'],
    })),
    problem('rapidity', 'Boosts as hyperbolic rotations', 'Apply', r => ({
      prompt: 'A boost has rapidity phi. Store Lam = [cosh(phi) -sinh(phi); -sinh(phi) cosh(phi)] and beta = tanh(phi), its speed.',
      setup: `phi = ${r.nonzero(-15, 15) / 10};`,
      solution: lines('Lam = [cosh(phi) -sinh(phi); -sinh(phi) cosh(phi)];', 'beta = tanh(phi);'),
      outputs: [['Lam', 'cosh φ = γ and sinh φ = γβ.'], ['beta', 'Always between −1 and 1.']],
      hints: ['Write the matrix with cosh and sinh.', 'Lam = [cosh(phi) -sinh(phi); -sinh(phi) cosh(phi)];', 'beta = tanh(phi);'],
    })),
  ],
  'laml-phys-box': [
    problem('grid', 'Points inside the box', 'Warm-up', r => ({
      prompt: 'A box of length L is sampled at N points inside it. Store the spacing h = L/(N + 1) and x, a row with the positions of the points.',
      setup: lines(...boxSetup(r)),
      solution: lines('h = L/(N + 1);', 'x = h*(1:N);'),
      outputs: [['h', 'N points inside make N + 1 gaps.'], ['x', 'h, 2h, …, Nh.']],
      hints: ['h = L/(N + 1);', 'The walls at 0 and L are not sampled.', 'x = h*(1:N);'],
    })),
    problem('hamiltonian', 'Build H', 'Apply', r => ({
      prompt: 'Store H, the particle-in-a-box matrix for a box of length L sampled at N inside points: 1/(2h^2) times 2 on the diagonal and −1 beside it.',
      setup: lines(...boxSetup(r)),
      solution: lines(...KINETIC),
      outputs: [['H', 'The second difference, scaled by 1/(2h²).']],
      hints: ['h = L/(N + 1);', 'Fill 2 on the diagonal and −1 beside it in a loop.', 'Divide by 2*h^2.'],
    })),
    problem('levels', 'The energy levels', 'Apply', r => ({
      prompt: 'Build H for a box of length L sampled at N inside points. Store E = eig(H), the energies from smallest up, and ground = E(1).',
      setup: lines(...boxSetup(r)),
      solution: lines(...KINETIC, 'E = eig(H);', 'ground = E(1);'),
      outputs: [['E', 'The eigenvalues of H.'], ['ground', 'The lowest energy.']],
      hints: ['Build H as in the lesson.', 'E = eig(H);', 'ground = E(1);'],
    })),
    problem('exact', 'Compare with the exact energies', 'Apply', r => ({
      prompt: 'Build H for a box of length L sampled at N inside points. Store exact = pi^2*(1:3).^2/(2*L^2), the three lowest exact energies, E = eig(H), and err = abs(E(1) - exact(1)).',
      setup: lines(...boxSetup(r)),
      solution: lines(...KINETIC, 'exact = pi^2*(1:3).^2/(2*L^2);', 'E = eig(H);', 'err = abs(E(1) - exact(1));'),
      outputs: [['exact', 'n²π²/(2L²) for n = 1, 2, 3.'], ['E', 'The matrix energies.'], ['err', 'Small for the ground state.']],
      hints: ['exact = pi^2*(1:3).^2/(2*L^2);', 'E = eig(H);', 'err = abs(E(1) - exact(1));'],
    })),
    problem('probability', 'Where is the particle?', 'Apply', r => ({
      prompt: 'Build H for a box of length L at N inside points and compute [Q, D] = eig(H). Store p = Q(:,1).^2, the probability at each point in the ground state, and peak = max(p).',
      setup: lines(...boxSetup(r)),
      solution: lines(...KINETIC, '[Q, D] = eig(H);', 'p = Q(:,1).^2;', 'peak = max(p);'),
      outputs: [['p', 'Squaring removes the arbitrary sign.'], ['peak', 'The most likely point, in the middle.']],
      hints: ['[Q, D] = eig(H);', 'The ground state is the first column.', 'p = Q(:,1).^2; peak = max(p);'],
    })),
    problem('wider', 'A wider box', 'Apply', r => {
      const L1 = r.pick([0.5, 1, 1.5]), L2 = L1 * r.pick([2, 3])
      return {
        prompt: 'Two boxes, of lengths L1 and L2, are each sampled at N inside points. Store Ea and Eb, their ground energies, and ratio = Ea/Eb.',
        setup: lines(`L1 = ${L1};`, `L2 = ${L2};`, `N = ${r.int(4, 9)};`),
        solution: lines('L = L1;', ...KINETIC, 'E = eig(H);', 'Ea = E(1);', 'L = L2;', ...KINETIC, 'E = eig(H);', 'Eb = E(1);', 'ratio = Ea/Eb;'),
        outputs: [['Ea', 'The ground energy of the first box.'], ['Eb', 'The ground energy of the second.'], ['ratio', 'Energies go like 1/L², so this is (L2/L1)².']],
        hints: ['Build H with L = L1, take the lowest eigenvalue, then repeat with L = L2.', 'Ea = E(1); and later Eb = E(1);', 'ratio = Ea/Eb;'],
      }
    }),
  ],
  'laml-phys-capstone': [
    problem('potential', 'Build the barrier', 'Warm-up', r => {
      const N = r.int(8, 14), a = r.int(2, N - 3), b = r.int(a, N - 1)
      return {
        prompt: 'A box is sampled at N points. A barrier of height V0 covers the points barrier. Store V, a row with the potential at every point.',
        setup: lines(`N = ${N};`, `barrier = ${a}:${b};`, `V0 = ${r.int(1, 30) * 10};`),
        solution: lines('V = zeros(1, N);', 'V(barrier) = V0;'),
        outputs: [['V', 'Zero outside the barrier, V0 inside.']],
        hints: ['Start from zeros.', 'V = zeros(1, N);', 'V(barrier) = V0;'],
      }
    }),
    problem('add-potential', 'Add the potential to H', 'Apply', r => ({
      prompt: 'Build the box matrix H for length L and N inside points, then add a barrier of height V0 on the points barrier. Store V and the new H.',
      setup: lines(...wellSetup(r)),
      solution: lines(...KINETIC, ...WELL),
      outputs: [['V', 'The potential at each point.'], ['H', 'The potential sits on the diagonal.']],
      hints: ['Build the kinetic H first.', 'V = zeros(1, N); V(barrier) = V0;', 'H = H + diag(V);'],
    })),
    problem('splitting', 'The split pair', 'Apply', r => ({
      prompt: 'For the double well (length L, N points, a barrier of height V0 on the points barrier), store E = eig(H) and splitting = E(2) - E(1).',
      setup: lines(...wellSetup(r)),
      solution: lines(...KINETIC, ...WELL, 'E = eig(H);', 'splitting = E(2) - E(1);'),
      outputs: [['E', 'The energies, smallest first.'], ['splitting', 'The gap between the lowest two.']],
      hints: ['Build H with the barrier on its diagonal.', 'E = eig(H);', 'splitting = E(2) - E(1);'],
    })),
    problem('period', 'Tunnelling time', 'Apply', r => ({
      prompt: 'The two lowest levels of a double well are E1 and E2. Store splitting = E2 - E1 and period = 2*pi/splitting, the time to tunnel across and back.',
      setup: lines(`E1 = ${r.int(100, 300) / 10};`, `E2 = ${r.int(310, 400) / 10};`),
      solution: lines('splitting = E2 - E1;', 'period = 2*pi/splitting;'),
      outputs: [['splitting', 'The energy gap.'], ['period', 'Smaller gaps mean slower tunnelling.']],
      hints: ['splitting = E2 - E1;', 'The period is 2π over the splitting.', 'period = 2*pi/splitting;'],
    })),
    problem('inside', 'Inside the wall', 'Apply', r => ({
      prompt: 'For the double well (length L, N points, height V0 on the points barrier), compute [Q, D] = eig(H) and store inside = sum(Q(barrier,1).^2), the ground state\'s probability inside the barrier, and E1 = D(1,1).',
      setup: lines(...wellSetup(r)),
      solution: lines(...KINETIC, ...WELL, '[Q, D] = eig(H);', 'inside = sum(Q(barrier,1).^2);', 'E1 = D(1,1);'),
      outputs: [['inside', 'Where classically the particle could never be.'], ['E1', 'The ground energy.']],
      hints: ['Add the barrier, then [Q, D] = eig(H);', 'Take the rows of the barrier in the first column.', 'inside = sum(Q(barrier,1).^2); E1 = D(1,1);'],
    })),
    problem('step', 'A lopsided well', 'Apply', r => {
      const N = r.pick([8, 10, 12])
      return {
        prompt: 'A box of length L at N points has a raised floor of height V0 on its left half (points 1 to N/2). Compute [Q, D] = eig(H) and store left = sum(Q(1:N/2,1).^2), the ground state\'s probability in the left half, and E1 = D(1,1).',
        setup: lines('L = 1;', `N = ${N};`, `V0 = ${r.pick([20, 50, 100, 200])};`),
        solution: lines(...KINETIC, 'V = zeros(1, N);', 'V(1:N/2) = V0;', 'H = H + diag(V);', '[Q, D] = eig(H);', 'left = sum(Q(1:N/2,1).^2);', 'E1 = D(1,1);'),
        outputs: [['left', 'Less than a half: the particle prefers the lower side.'], ['E1', 'The ground energy.']],
        hints: ['V = zeros(1, N); V(1:N/2) = V0;', 'H = H + diag(V); [Q, D] = eig(H);', 'left = sum(Q(1:N/2,1).^2); E1 = D(1,1);'],
      }
    }),
  ],
}
