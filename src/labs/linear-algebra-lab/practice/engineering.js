// Practice for the "Engineering" track: springs between walls, assembling a stiffness matrix spring by
// spring, finite elements for a heated rod, and support forces with a design check. Answers come from
// running each reference solution, so generators only need valid inputs: every network is held by
// two walls, so its free stiffness matrix can always be solved.
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

const STIFF = [50, 100, 150, 200, 250, 300, 400]
const stiff = (r, n) => Array.from({ length: n }, () => r.pick(STIFF))
const loads = (r, n) => Array.from({ length: n }, () => r.int(-6, 6) * 5)
const ASSEMBLE = count => ['K = zeros(4, 4);', `for s = 1:${count}`, '  i = springs(s,1);', '  j = springs(s,2);', '  K(i,i) = K(i,i) + k(s);', '  K(j,j) = K(j,j) + k(s);', '  K(i,j) = K(i,j) - k(s);', '  K(j,i) = K(j,i) - k(s);', 'end']
const CHAIN = 'springs = [1 2; 2 3; 3 4];'
const BRANCHED = 'springs = [1 2; 1 3; 2 3; 2 4; 3 4];'
const ROD = ['h = L/N;', 'n = N - 1;', 'K = zeros(n, n);', 'for i = 1:n', '  K(i,i) = 2;', '  if i > 1', '    K(i,i-1) = -1;', '  end', '  if i < n', '    K(i,i+1) = -1;', '  end', 'end', 'K = (kappa/h)*K;']
const rodSetup = (r, Ns = [3, 4, 5, 6]) => [`L = ${r.int(1, 3)};`, `kappa = ${r.pick([1, 2, 4])};`, `q = ${r.int(2, 8)};`, `N = ${r.pick(Ns)};`]

export const engineeringPractice = {
  'laml-eng-springs': [
    problem('hooke', 'Hooke\'s law both ways', 'Warm-up', r => ({
      prompt: 'A spring has stiffness k (N/m). Store force, the pull when it is stretched by s metres, and stretch, how far the force F stretches it.',
      setup: lines(`k = ${r.pick(STIFF)};`, `s = ${r.int(1, 9) / 100};`, `F = ${r.int(1, 12) * 5};`),
      solution: lines('force = k*s;', 'stretch = F/k;'),
      outputs: [['force', 'Stiffness times stretch.'], ['stretch', 'Force divided by stiffness.']],
      hints: ['Hooke\'s law: force = k × stretch.', 'force = k*s;', 'stretch = F/k;'],
    })),
    problem('two-block-K', 'Write the stiffness matrix', 'Warm-up', r => {
      const [k1, k2, k3] = stiff(r, 3)
      return {
        prompt: 'Two blocks sit between walls: wall, k1, block 1, k2, block 2, k3, wall. Store the 2 × 2 stiffness matrix K.',
        setup: lines(`k1 = ${k1};`, `k2 = ${k2};`, `k3 = ${k3};`),
        solution: 'K = [k1+k2 -k2; -k2 k2+k3];',
        outputs: [['K', 'Diagonal: springs touching each block. Off-diagonal: minus the spring between them.']],
        hints: ['Block 1 touches k1 and k2.', 'The spring between the blocks appears as −k2 twice.', 'K = [k1+k2 -k2; -k2 k2+k3];'],
      }
    }),
    problem('two-block-solve', 'How far do the blocks move?', 'Apply', r => {
      const [k1, k2, k3] = stiff(r, 3)
      return {
        prompt: 'Two blocks between walls are joined by springs k1, k2, k3 and loaded by f (N). Store K and the movements u = K\\f.',
        setup: lines(`k1 = ${k1};`, `k2 = ${k2};`, `k3 = ${k3};`, `f = ${vec(loads(r, 2))};`),
        solution: lines('K = [k1+k2 -k2; -k2 k2+k3];', 'u = K\\f;'),
        outputs: [['K', 'The stiffness matrix of the chain.'], ['u', 'Solve K*u = f.']],
        hints: ['Build K as in the lesson.', 'f is already named, so solve directly.', 'u = K\\f;'],
      }
    }),
    problem('tensions', 'Forces in the springs', 'Apply', r => ({
      prompt: 'Two blocks have moved by u (m), with springs k1, k2, k3 from left to right. Store tension, a row with the force in each spring (positive when stretched).',
      setup: lines(`k1 = ${r.pick(STIFF)};`, `k2 = ${r.pick(STIFF)};`, `k3 = ${r.pick(STIFF)};`, `u = ${vec([r.int(-9, 9) / 100, r.int(-9, 9) / 100])};`),
      solution: 'tension = [k1*u(1) k2*(u(2)-u(1)) -k3*u(2)];',
      outputs: [['tension', 'Stiffness times stretch for each spring.']],
      hints: ['Spring 1 is stretched by u(1), spring 2 by u(2) − u(1).', 'Spring 3 is stretched by −u(2).', 'tension = [k1*u(1) k2*(u(2)-u(1)) -k3*u(2)];'],
    })),
    problem('three-block', 'Three blocks, four springs', 'Apply', r => ({
      prompt: 'Three blocks sit between walls, joined by four springs with stiffnesses k(1) to k(4). Store the 3 × 3 stiffness matrix K and the movements u = K\\f.',
      setup: lines(`k = [${stiff(r, 4).join(' ')}];`, `f = ${vec(loads(r, 3))};`),
      solution: lines('K = [k(1)+k(2) -k(2) 0; -k(2) k(2)+k(3) -k(3); 0 -k(3) k(3)+k(4)];', 'u = K\\f;'),
      outputs: [['K', 'Three diagonals: blocks 1 and 3 are not joined.'], ['u', 'Solve K*u = f.']],
      hints: ['Block 2 touches springs 2 and 3.', 'K(1,3) = 0 because no spring joins blocks 1 and 3.', 'K = [k(1)+k(2) -k(2) 0; -k(2) k(2)+k(3) -k(3); 0 -k(3) k(3)+k(4)]; u = K\\f;'],
    })),
    problem('one-block', 'One block between two springs', 'Apply', r => ({
      prompt: 'One block sits between two walls, held by a spring k1 on its left and k2 on its right, and is pushed by F. Store keff, the combined stiffness, and u, how far it moves.',
      setup: lines(`k1 = ${r.pick(STIFF)};`, `k2 = ${r.pick(STIFF)};`, `F = ${r.nonzero(-12, 12) * 5};`),
      solution: lines('keff = k1 + k2;', 'u = F/keff;'),
      outputs: [['keff', 'Both springs resist the same movement, so their stiffnesses add.'], ['u', 'Force over combined stiffness.']],
      hints: ['Moving the block stretches one spring and squashes the other.', 'keff = k1 + k2;', 'u = F/keff;'],
    })),
  ],
  'laml-eng-assembly': [
    problem('element', 'One spring\'s element matrix', 'Warm-up', r => ({
      prompt: 'A spring of stiffness k joins two joints that have moved by ui and uj. Store its element matrix Ke and ends = Ke*[ui; uj], the forces needed at its two ends.',
      setup: lines(`k = ${r.pick(STIFF)};`, `ui = ${r.int(-9, 9) / 100};`, `uj = ${r.int(-9, 9) / 100};`),
      solution: lines('Ke = k*[1 -1; -1 1];', 'd = [ui; uj];', 'ends = Ke*d;'),
      outputs: [['Ke', 'k times [1 −1; −1 1].'], ['ends', 'Equal and opposite forces at the two ends.']],
      hints: ['Ke = k*[1 -1; -1 1];', 'Name the movements first: d = [ui; uj];', 'ends = Ke*d;'],
    })),
    problem('add-spring', 'Add one spring into K', 'Warm-up', r => {
      const i = r.int(1, 3)
      const j = r.pick([1, 2, 3].filter(x => x !== i))
      return {
        prompt: 'K is a stiffness matrix being assembled. Add a spring of stiffness ks joining joints i and j, and store the updated K.',
        setup: lines(`K = ${mat([[100, -100, 0], [-100, 100, 0], [0, 0, 0]])};`, `i = ${i};`, `j = ${j};`, `ks = ${r.pick(STIFF)};`),
        solution: lines('K(i,i) = K(i,i) + ks;', 'K(j,j) = K(j,j) + ks;', 'K(i,j) = K(i,j) - ks;', 'K(j,i) = K(j,i) - ks;'),
        outputs: [['K', 'Add ks on the two diagonal entries, subtract it on the two off-diagonal ones.']],
        hints: ['Only four entries change.', 'K(i,i) and K(j,j) grow by ks.', 'K(i,j) and K(j,i) shrink by ks.'],
      }
    }),
    problem('assemble-chain', 'Assemble a chain', 'Apply', r => ({
      prompt: 'Four joints form a chain; each row of springs lists the joints of one spring, with stiffness k. Assemble and store the 4 × 4 stiffness matrix K.',
      setup: lines(CHAIN, `k = [${stiff(r, 3).join(' ')}];`),
      solution: lines(...ASSEMBLE(3)),
      outputs: [['K', 'Each spring adds its 2 × 2 pattern at its joints.']],
      hints: ['Start from K = zeros(4, 4);', 'In a loop, name the joints: i = springs(s,1); j = springs(s,2);', 'Add k(s) at (i,i) and (j,j); subtract it at (i,j) and (j,i).'],
    })),
    problem('rows-sum-zero', 'Why the full K is singular', 'Apply', r => ({
      prompt: 'Assemble the 4 × 4 stiffness matrix K of the chain in springs with stiffnesses k. Store K and slide = K*ones(4, 1), the forces needed to slide every joint by 1.',
      setup: lines(CHAIN, `k = [${stiff(r, 3).join(' ')}];`),
      solution: lines(...ASSEMBLE(3), 'slide = K*ones(4, 1);'),
      outputs: [['K', 'The assembled matrix.'], ['slide', 'Sliding everything stretches no spring.']],
      hints: ['Assemble as usual.', 'Every row of K adds to zero.', 'slide = K*ones(4, 1);'],
    })),
    problem('remove-walls', 'Remove the walls and solve', 'Apply', r => ({
      prompt: 'Joints 1 and 4 of the chain are walls. Assemble K, store Kf = K(free, free) for free = [2 3], and the movements uf = Kf\\f.',
      setup: lines(CHAIN, `k = [${stiff(r, 3).join(' ')}];`, `f = ${vec(loads(r, 2))};`),
      solution: lines(...ASSEMBLE(3), 'free = [2 3];', 'Kf = K(free, free);', 'uf = Kf\\f;'),
      outputs: [['Kf', 'Rows and columns of the free joints.'], ['uf', 'Solve with the walls removed.']],
      hints: ['Assemble the full 4 × 4 K first.', 'free = [2 3]; Kf = K(free, free);', 'uf = Kf\\f;'],
    })),
    problem('branched', 'A branched network', 'Apply', r => ({
      prompt: 'Joints 1 and 4 are walls. Five springs join the pairs of joints in springs, with stiffnesses k. Assemble K and store the movements uf of joints 2 and 3 under the loads f.',
      setup: lines(BRANCHED, `k = [${stiff(r, 5).join(' ')}];`, `f = ${vec(loads(r, 2))};`),
      solution: lines(...ASSEMBLE(5), 'free = [2 3];', 'uf = K(free, free)\\f;'),
      outputs: [['K', 'The same loop works for any network.'], ['uf', 'Solve on the free joints.']],
      hints: ['Use the same assembly loop, now over 5 springs.', 'free = [2 3];', 'uf = K(free, free)\\f;'],
    })),
  ],
  'laml-eng-fem': [
    problem('mesh', 'Cut the rod into elements', 'Warm-up', r => ({
      prompt: 'A rod of length L is cut into N equal elements. Store h, the length of one element, and x, a row with the positions of the inside joints.',
      setup: lines(`L = ${r.int(1, 6)};`, `N = ${r.int(3, 8)};`),
      solution: lines('h = L/N;', 'x = h*(1:N-1);'),
      outputs: [['h', 'Length divided by the number of elements.'], ['x', 'h, 2h, …, (N − 1)h.']],
      hints: ['h = L/N;', 'The inside joints are numbered 1 to N − 1.', 'x = h*(1:N-1);'],
    })),
    problem('rod-matrix', 'The rod\'s stiffness matrix', 'Apply', r => ({
      prompt: 'A rod of length L with conductivity kappa is cut into N elements. Store K, the stiffness matrix for the inside joints: kappa/h times 2 on the diagonal and −1 beside it.',
      setup: lines(...rodSetup(r)),
      solution: lines(...ROD),
      outputs: [['K', 'The springs-in-a-row pattern, scaled by kappa/h.']],
      hints: ['There are N − 1 inside joints.', 'Fill 2 on the diagonal and −1 next to it in a loop.', 'Then K = (kappa/h)*K;'],
    })),
    problem('rod-solve', 'Temperatures at the joints', 'Apply', r => ({
      prompt: 'A rod of length L with conductivity kappa generates heat q per metre, with both ends held at 0, and is cut into N elements. Store the joint temperatures T = K\\F, where every entry of F is q*h.',
      setup: lines(...rodSetup(r)),
      solution: lines(...ROD, 'F = q*h*ones(n, 1);', 'T = K\\F;'),
      outputs: [['T', 'Solve the assembled system.']],
      hints: ['Build K as in the lesson.', 'F = q*h*ones(n, 1);', 'T = K\\F;'],
    })),
    problem('exact-check', 'Compare with the exact curve', 'Apply', r => ({
      prompt: 'Solve the heated rod (length L, conductivity kappa, heat q, N elements). Store T, exact, the values of q*x*(L − x)/(2*kappa) at the same joints, and err = max(abs(T - exact)).',
      setup: lines(...rodSetup(r)),
      solution: lines(...ROD, 'F = q*h*ones(n, 1);', 'T = K\\F;', 'exact = zeros(n, 1);', 'for i = 1:n', '  x = i*h;', '  exact(i) = q*x*(L - x)/(2*kappa);', 'end', 'err = max(abs(T - exact));'),
      outputs: [['T', 'The finite element temperatures.'], ['exact', 'The exact curve at the joints.'], ['err', 'For this problem the joint values are exact.']],
      hints: ['Joint i sits at x = i*h.', 'Fill exact in a loop with the same length as T.', 'err = max(abs(T - exact));'],
    })),
    problem('hottest', 'The hottest point', 'Apply', r => ({
      prompt: 'Solve the heated rod with an even number of elements N, so one joint sits in the middle. Store hottest = max(T) and formula = q*L^2/(8*kappa), the exact peak.',
      setup: lines(...rodSetup(r, [2, 4, 6])),
      solution: lines(...ROD, 'F = q*h*ones(n, 1);', 'T = K\\F;', 'hottest = max(T);', 'formula = q*L^2/(8*kappa);'),
      outputs: [['hottest', 'The largest joint temperature.'], ['formula', 'The exact curve at x = L/2.']],
      hints: ['Solve for T as usual.', 'hottest = max(T);', 'Put x = L/2 into q*x*(L − x)/(2*kappa).'],
    })),
    problem('heater', 'A small heater in the middle', 'Apply', r => ({
      prompt: 'The rod (length L, conductivity kappa, N elements, N even) now has all its heat P put in at the middle joint m = N/2, and none elsewhere. Store T = K\\F and peak = max(T).',
      setup: lines(`L = ${r.int(1, 3)};`, `kappa = ${r.pick([1, 2, 4])};`, `P = ${r.int(2, 9)};`, `N = ${r.pick([4, 6, 8])};`),
      solution: lines(...ROD, 'F = zeros(n, 1);', 'm = N/2;', 'F(m) = P;', 'T = K\\F;', 'peak = max(T);'),
      outputs: [['T', 'A tent shape: straight lines down from the heater.'], ['peak', 'The temperature at the heater.']],
      hints: ['Build K as usual.', 'F = zeros(n, 1); then F(m) = P;', 'T = K\\F; peak = max(T);'],
    })),
  ],
  'laml-eng-capstone': [
    problem('full-u', 'Put the walls back', 'Warm-up', r => ({
      prompt: 'Joints 2 and 3 of a four-joint chain moved by uf; joints 1 and 4 are walls. Store u, the movement of all four joints.',
      setup: `uf = ${vec([r.int(-9, 9) / 100, r.int(-9, 9) / 100])};`,
      solution: lines('free = [2 3];', 'u = zeros(4, 1);', 'u(free) = uf;'),
      outputs: [['u', 'Zeros at the walls, uf in between.']],
      hints: ['Start from u = zeros(4, 1);', 'free = [2 3];', 'u(free) = uf;'],
    })),
    problem('reactions', 'What the walls supply', 'Apply', r => ({
      prompt: 'Joints 1 and 4 of the chain are walls. Assemble K, solve for the free movements under f, build the full u, and store reactions, the wall rows (joint 1, then joint 4) of K*u.',
      setup: lines(CHAIN, `k = [${stiff(r, 3).join(' ')}];`, `f = ${vec(loads(r, 2))};`),
      solution: lines(...ASSEMBLE(3), 'free = [2 3];', 'fixed = [1 4];', 'u = zeros(4, 1);', 'u(free) = K(free, free)\\f;', 'R = K*u;', 'reactions = R(fixed);'),
      outputs: [['reactions', 'The forces the walls supply.']],
      hints: ['Solve on the free joints first, then fill u.', 'R = K*u;', 'reactions = R(fixed);'],
    })),
    problem('balance', 'Check equilibrium', 'Apply', r => ({
      prompt: 'For the chain held by walls at joints 1 and 4, store reactions (joint 1, then joint 4), total = sum(f), the total load, and balance = sum(reactions) + total, which should be 0.',
      setup: lines(CHAIN, `k = [${stiff(r, 3).join(' ')}];`, `f = ${vec(loads(r, 2))};`),
      solution: lines(...ASSEMBLE(3), 'free = [2 3];', 'fixed = [1 4];', 'u = zeros(4, 1);', 'u(free) = K(free, free)\\f;', 'R = K*u;', 'reactions = R(fixed);', 'total = sum(f);', 'balance = sum(reactions) + total;'),
      outputs: [['reactions', 'The wall rows of K*u.'], ['total', 'All the loads added up.'], ['balance', 'Loads and reactions cancel.']],
      hints: ['Compute reactions as in the lesson.', 'total = sum(f);', 'balance = sum(reactions) + total;'],
    })),
    problem('spring-forces', 'Force in every spring', 'Apply', r => ({
      prompt: 'The chain\'s joints moved by u (walls at joints 1 and 4), and its springs have stiffnesses k. Store force, a row with each spring\'s force, k(s)*(u(j) - u(i)).',
      setup: lines(CHAIN, `k = [${stiff(r, 3).join(' ')}];`, `u = ${vec([0, r.int(-9, 9) / 100, r.int(-9, 9) / 100, 0])};`),
      solution: lines('force = zeros(1, 3);', 'for s = 1:3', '  i = springs(s,1);', '  j = springs(s,2);', '  force(s) = k(s)*(u(j) - u(i));', 'end'),
      outputs: [['force', 'Stiffness times stretch, spring by spring.']],
      hints: ['Loop over the springs.', 'Name the joints: i = springs(s,1); j = springs(s,2);', 'force(s) = k(s)*(u(j) - u(i));'],
    })),
    problem('utilisation', 'Does it pass?', 'Apply', r => ({
      prompt: 'The springs carry the forces in force, and each may carry at most allowed. Store biggest, the largest size of force, and utilisation = biggest/allowed (above 1 fails).',
      setup: lines(`force = [${Array.from({ length: 4 }, () => r.int(-30, 30)).join(' ')}];`, `allowed = ${r.int(10, 30)};`),
      solution: lines('biggest = max(abs(force));', 'utilisation = biggest/allowed;'),
      outputs: [['biggest', 'Compression counts as much as tension.'], ['utilisation', 'Largest force over the allowed force.']],
      hints: ['Use abs so a squashed spring counts too.', 'biggest = max(abs(force));', 'utilisation = biggest/allowed;'],
    })),
    problem('full-check', 'The whole design check', 'Apply', r => ({
      prompt: 'Joints 1 and 4 are walls of the five-spring network in springs, with stiffnesses k, loads f on joints 2 and 3, and allowed force allowed. Store the full movement vector u, each spring\'s force, and utilisation = max(abs(force))/allowed.',
      setup: lines(BRANCHED, `k = [${stiff(r, 5).join(' ')}];`, `f = ${vec(loads(r, 2))};`, `allowed = ${r.int(10, 40)};`),
      solution: lines(...ASSEMBLE(5), 'free = [2 3];', 'u = zeros(4, 1);', 'u(free) = K(free, free)\\f;', 'force = zeros(1, 5);', 'for s = 1:5', '  i = springs(s,1);', '  j = springs(s,2);', '  force(s) = k(s)*(u(j) - u(i));', 'end', 'utilisation = max(abs(force))/allowed;'),
      outputs: [['u', 'Zeros at the walls, the solved movements between.'], ['force', 'k times stretch for each spring.'], ['utilisation', 'The largest force over the allowed force.']],
      hints: ['Assemble K, then solve on the free joints.', 'Fill u, then loop over the springs for their forces.', 'utilisation = max(abs(force))/allowed;'],
    })),
  ],
}
