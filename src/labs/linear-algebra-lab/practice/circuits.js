// Practice for the "Circuits" track: node equations, the incidence matrix and G = AᵀCA. Answers come
// from running each reference solution, so generators only need valid inputs: every circuit has a
// path to ground from each node, so its grounded conductance matrix can always be solved.
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

const OHMS = [50, 100, 200, 250, 400, 500, 1000]
const ohms = (r, n) => Array.from({ length: n }, () => r.pick(OHMS))
const amps = r => r.nonzero(-9, 9) / 100
const volts = (r, n) => Array.from({ length: n }, () => r.int(-12, 12) / 2)
const TWO_NODE_G = 'G = [g(1)+g(2) -g(2); -g(2) g(2)+g(3)];'
const LADDER_G = 'G = [g(1)+g(2) -g(2) 0; -g(2) g(2)+g(3)+g(4) -g(4); 0 -g(4) g(4)+g(5)];'
// Ground is the last node of every branch list below.
const TOPOLOGIES = [
  'branches = [1 2; 2 3; 3 4; 1 4];',
  'branches = [1 2; 1 3; 2 3; 3 4];',
  'branches = [1 4; 1 2; 2 4; 2 3; 3 4];',
]
const INCIDENCE = (m, n) => [`A = zeros(${m}, ${n});`, `for b = 1:${m}`, '  n1 = branches(b,1);', '  n2 = branches(b,2);', '  A(b, n1) = 1;', '  A(b, n2) = -1;', 'end']
const CAPS = [0.001, 0.002, 0.005]
const STEPS = [0.001, 0.005, 0.01]
const caps = r => `Cm = ${mat([[r.pick(CAPS), 0], [0, r.pick(CAPS)]])};`
const twoNodeG = r => lines(`R = [${ohms(r, 3).join(' ')}];`, 'g = 1./R;', TWO_NODE_G)
// The capstone bridge: node 1 held at Vs, node 4 ground; R1, R2, R3, sensor, meter.
const BRIDGE = 'branches = [1 2; 2 4; 1 3; 3 4; 2 3];'
const bridgeR = r => `R = [${[r.pick([100, 200, 500]), r.pick([100, 200, 500]), r.pick([100, 200, 500]), r.pick([110, 150, 220, 470]), r.pick([200, 1000, 5000])].join(' ')}];`
const BRIDGE_G = [...INCIDENCE(5, 4), 'C = diag(1./R);', 'Gfull = transpose(A)*C*A;']
const BRIDGE_SOLVE = ['known = [1 4];', 'unknown = [2 3];', 'vk = [Vs; 0];', 'rhs = -Gfull(unknown, known)*vk;', 'vu = Gfull(unknown, unknown)\\rhs;']
const BRIDGE_V = [...BRIDGE_SOLVE, 'v = zeros(4, 1);', 'v(known) = vk;', 'v(unknown) = vu;']

export const circuitsPractice = {
  'laml-circ-nodal': [
    problem('ohm', 'Ohm\'s law with conductance', 'Warm-up', r => ({
      prompt: 'A resistor of R ohms has V volts across it. Store g, its conductance 1/R, and current, the current through it.',
      setup: lines(`R = ${r.pick(OHMS)};`, `V = ${r.int(1, 24) / 2};`),
      solution: lines('g = 1/R;', 'current = g*V;'),
      outputs: [['g', 'One over the resistance.'], ['current', 'Conductance times voltage.']],
      hints: ['Conductance is measured in siemens: g = 1/R.', 'g = 1/R;', 'current = g*V;'],
    })),
    problem('two-node-G', 'Write the conductance matrix', 'Warm-up', r => ({
      prompt: 'R(1) joins node 1 to ground, R(2) joins nodes 1 and 2, and R(3) joins node 2 to ground. Store g = 1./R and the 2 × 2 conductance matrix G.',
      setup: `R = [${ohms(r, 3).join(' ')}];`,
      solution: lines('g = 1./R;', TWO_NODE_G),
      outputs: [['g', 'One conductance per resistor.'], ['G', 'Diagonal: conductances touching each node. Off-diagonal: minus the one between them.']],
      hints: ['Node 1 touches R(1) and R(2).', 'The resistor between the nodes appears as −g(2) twice.', TWO_NODE_G],
    })),
    problem('two-node-solve', 'Node voltages', 'Apply', r => ({
      prompt: 'The two-node circuit has R(1) from node 1 to ground, R(2) between the nodes and R(3) from node 2 to ground. The currents pushed into the nodes are in I. Store G and the node voltages v = G\\I.',
      setup: lines(`R = [${ohms(r, 3).join(' ')}];`, `I = ${vec([amps(r), r.int(-9, 9) / 100])};`),
      solution: lines('g = 1./R;', TWO_NODE_G, 'v = G\\I;'),
      outputs: [['G', 'The conductance matrix.'], ['v', 'Solve G*v = I.']],
      hints: ['Build g = 1./R, then G as in the lesson.', 'I is already named, so solve directly.', 'v = G\\I;'],
    })),
    problem('resistor-currents', 'Current in every resistor', 'Apply', r => ({
      prompt: 'In the two-node circuit (R(1) from node 1 to ground, R(2) between the nodes, R(3) from node 2 to ground) the nodes sit at voltages v. Store current, a row with the current in each resistor (from node 1 to 2 for R(2)).',
      setup: lines(`R = [${ohms(r, 3).join(' ')}];`, `v = ${vec(volts(r, 2))};`),
      solution: 'current = [v(1)/R(1) (v(1)-v(2))/R(2) v(2)/R(3)];',
      outputs: [['current', 'Voltage across each resistor divided by its resistance.']],
      hints: ['R(1) has v(1) − 0 across it.', 'R(2) has v(1) − v(2) across it.', 'current = [v(1)/R(1) (v(1)-v(2))/R(2) v(2)/R(3)];'],
    })),
    problem('ladder', 'A three-node ladder', 'Apply', r => ({
      prompt: 'R(1) joins node 1 to ground, R(2) nodes 1 and 2, R(3) node 2 to ground, R(4) nodes 2 and 3, and R(5) node 3 to ground. The currents pushed in are in I. Store the 3 × 3 matrix G and the node voltages v = G\\I.',
      setup: lines(`R = [${ohms(r, 5).join(' ')}];`, `I = ${vec([amps(r), r.int(-9, 9) / 100, r.int(-9, 9) / 100])};`),
      solution: lines('g = 1./R;', LADDER_G, 'v = G\\I;'),
      outputs: [['G', 'Three diagonals: nodes 1 and 3 are not joined.'], ['v', 'Solve G*v = I.']],
      hints: ['Node 2 touches R(2), R(3) and R(4).', 'G(1,3) = 0 because no resistor joins nodes 1 and 3.', LADDER_G],
    })),
    problem('parallel', 'Two resistors side by side', 'Apply', r => ({
      prompt: 'Two resistors R1 and R2 both join node 1 to ground, and a current I is pushed into node 1. Store geff, their combined conductance, v, the node voltage, and power, the power the source delivers.',
      setup: lines(`R1 = ${r.pick(OHMS)};`, `R2 = ${r.pick(OHMS)};`, `I = ${amps(r)};`),
      solution: lines('geff = 1/R1 + 1/R2;', 'v = I/geff;', 'power = I*v;'),
      outputs: [['geff', 'Side by side, conductances add.'], ['v', 'Current over conductance.'], ['power', 'Current times voltage.']],
      hints: ['Both resistors carry current away from the same node.', 'geff = 1/R1 + 1/R2; v = I/geff;', 'power = I*v;'],
    })),
  ],
  'laml-circ-incidence': [
    problem('branch-row', 'One row of the incidence matrix', 'Warm-up', r => {
      const n = r.int(4, 6)
      const p = r.int(1, n)
      const q = r.pick(Array.from({ length: n }, (_, i) => i + 1).filter(x => x !== p))
      return {
        prompt: 'A circuit has n nodes. A branch starts at node p and ends at node q. Store row, its row of the incidence matrix.',
        setup: lines(`n = ${n};`, `p = ${p};`, `q = ${q};`),
        solution: lines('row = zeros(1, n);', 'row(p) = 1;', 'row(q) = -1;'),
        outputs: [['row', '+1 at the start node, −1 at the end node.']],
        hints: ['Start from row = zeros(1, n);', 'row(p) = 1;', 'row(q) = -1;'],
      }
    }),
    problem('drops', 'Voltage drops', 'Warm-up', r => ({
      prompt: 'A is the incidence matrix of a circuit and v holds its node voltages. Store e, the voltage drop along every branch.',
      setup: lines(`A = ${mat([[1, -1, 0, 0], [0, 1, -1, 0], [1, 0, -1, 0], [0, 0, 1, -1]])};`, `v = ${vec([...volts(r, 3), 0])};`),
      solution: 'e = A*v;',
      outputs: [['e', 'Start voltage minus end voltage, branch by branch.']],
      hints: ['Each row picks out two node voltages.', 'The drops come from one matrix product.', 'e = A*v;'],
    })),
    problem('build-A', 'Build A and the full G', 'Apply', r => {
      const top = r.pick(TOPOLOGIES)
      const m = top.split(';').length - 1
      return {
        prompt: 'The rows of branches list each resistor\'s start and end node, with resistances R; there are m branches and 4 nodes. Store the incidence matrix A and Gfull = transpose(A)*C*A with C = diag(1./R).',
        setup: lines(top, `m = ${m};`, `R = [${ohms(r, m).join(' ')}];`),
        solution: lines(...INCIDENCE('m', 4), 'C = diag(1./R);', 'Gfull = transpose(A)*C*A;'),
        outputs: [['A', 'One row per branch: +1 at the start, −1 at the end.'], ['Gfull', 'Two matrix products.']],
        hints: ['Start from A = zeros(m, 4); and loop over the branches.', 'A(b, n1) = 1; A(b, n2) = -1;', 'C = diag(1./R); Gfull = transpose(A)*C*A;'],
      }
    }),
    problem('rows-sum-zero', 'Why the full G is singular', 'Apply', r => ({
      prompt: 'For the four-node circuit in branches, with resistances R, build A and Gfull = transpose(A)*C*A, and store Gfull and rows = Gfull*ones(4, 1).',
      setup: lines(TOPOLOGIES[2], `R = [${ohms(r, 5).join(' ')}];`),
      solution: lines(...INCIDENCE(5, 4), 'C = diag(1./R);', 'Gfull = transpose(A)*C*A;', 'rows = Gfull*ones(4, 1);'),
      outputs: [['Gfull', 'The conductance matrix with ground included.'], ['rows', 'Raising every node together drives no current.']],
      hints: ['Build A with the loop from the lesson.', 'Gfull = transpose(A)*C*A;', 'rows = Gfull*ones(4, 1);'],
    })),
    problem('ground-solve', 'Ground a node and solve', 'Apply', r => ({
      prompt: 'Node 4 of the circuit in branches is ground; R holds the resistances and f the currents pushed into nodes 1 to 3. Build A and Gfull, then store G = Gfull(1:3, 1:3) and v = G\\f.',
      setup: lines(TOPOLOGIES[2], `R = [${ohms(r, 5).join(' ')}];`, `f = ${vec([amps(r), r.int(-9, 9) / 100, r.int(-9, 9) / 100])};`),
      solution: lines(...INCIDENCE(5, 4), 'C = diag(1./R);', 'Gfull = transpose(A)*C*A;', 'G = Gfull(1:3, 1:3);', 'v = G\\f;'),
      outputs: [['G', 'Ground\'s row and column removed.'], ['v', 'Solve on the other nodes.']],
      hints: ['Assemble Gfull first.', 'G = Gfull(1:3, 1:3);', 'v = G\\f;'],
    })),
    problem('branch-currents', 'Every branch current', 'Apply', r => ({
      prompt: 'A is the incidence matrix of a circuit, R its resistances, and vall the voltage at every node (ground last, at 0). Store C = diag(1./R) and y, the current in every branch.',
      setup: lines(`A = ${mat([[1, -1, 0, 0], [0, 1, -1, 0], [1, 0, -1, 0], [0, 0, 1, -1]])};`, `R = [${ohms(r, 4).join(' ')}];`, `vall = ${vec([...volts(r, 3), 0])};`),
      solution: lines('C = diag(1./R);', 'y = C*A*vall;'),
      outputs: [['C', 'The conductances on the diagonal.'], ['y', 'Ohm\'s law on every drop A*vall.']],
      hints: ['First the drops A*vall, then Ohm\'s law.', 'C = diag(1./R);', 'y = C*A*vall;'],
    })),
  ],
  'laml-circ-transient': [
    problem('cap-current', 'A capacitor\'s current and charge', 'Warm-up', r => ({
      prompt: 'A capacitor of c farads has its voltage rise from v0 to v1 in dt seconds. Store current, the average current into it, c*(v1 - v0)/dt, and charge, the charge it holds at the end, c*v1.',
      setup: lines(`c = ${r.pick(CAPS)};`, `v0 = ${r.int(0, 5)};`, `v1 = ${r.int(6, 12)};`, `dt = ${r.pick(STEPS)};`),
      solution: lines('current = c*(v1 - v0)/dt;', 'charge = c*v1;'),
      outputs: [['current', 'Capacitance times the rate of change of voltage.'], ['charge', 'Capacitance times voltage.']],
      hints: ['The rate of change is (v1 − v0)/dt.', 'current = c*(v1 - v0)/dt;', 'charge = c*v1;'],
    })),
    problem('one-node-step', 'One node, one step', 'Warm-up', r => ({
      prompt: 'One node has a resistor R to ground, a capacitor c to ground and a current I pushed in. It sits at v0. Store vnew, its voltage after one backward Euler step of length dt, and steady = I*R, where it ends up.',
      setup: lines(`R = ${r.pick(OHMS)};`, `c = ${r.pick(CAPS)};`, `I = ${amps(r)};`, `v0 = ${r.int(-5, 5)};`, `dt = ${r.pick(STEPS)};`),
      solution: lines('vnew = (c/dt*v0 + I)/(c/dt + 1/R);', 'steady = I*R;'),
      outputs: [['vnew', '(c/dt + 1/R)*vnew = (c/dt)*v0 + I.'], ['steady', 'Once nothing changes, the capacitor takes no current.']],
      hints: ['With one node, M and b are single numbers.', 'vnew = (c/dt*v0 + I)/(c/dt + 1/R);', 'steady = I*R;'],
    })),
    problem('step-matrix', 'The step matrix', 'Apply', r => ({
      prompt: 'G is the conductance matrix of a two-node circuit, Cm its capacitances and dt the time step. Store M, the matrix solved at every backward Euler step.',
      setup: lines(twoNodeG(r), caps(r), `dt = ${r.pick(STEPS)};`),
      solution: 'M = Cm/dt + G;',
      outputs: [['M', 'Cm/dt added to G.']],
      hints: ['The capacitors add Cm/dt.', 'Nothing in M depends on the voltages.', 'M = Cm/dt + G;'],
    })),
    problem('one-step', 'One step for two nodes', 'Apply', r => ({
      prompt: 'A two-node circuit has conductance matrix G, capacitances Cm, sources f and time step dt, and its voltages are now v. Store the right-hand side b = (Cm/dt)*v + f and vnew, the voltages one step later.',
      setup: lines(twoNodeG(r), caps(r), `f = ${vec([amps(r), r.int(-9, 9) / 100])};`, `dt = ${r.pick(STEPS)};`, `v = ${vec(volts(r, 2))};`),
      solution: lines('M = Cm/dt + G;', 'b = (Cm/dt)*v + f;', 'vnew = M\\b;'),
      outputs: [['b', 'The right-hand side carries the old voltages.'], ['vnew', 'Solve M*vnew = b.']],
      hints: ['M = Cm/dt + G;', 'b = (Cm/dt)*v + f;', 'vnew = M\\b;'],
    })),
    problem('march', 'March through time', 'Apply', r => ({
      prompt: 'A two-node circuit (G, Cm, f, dt) starts with both voltages at 0. Store v, the voltages after N backward Euler steps, and steady = G\\f, where they are heading.',
      setup: lines(twoNodeG(r), caps(r), `f = ${vec([amps(r), r.int(-9, 9) / 100])};`, `dt = ${r.pick(STEPS)};`, `N = ${r.int(5, 20)};`),
      solution: lines('M = Cm/dt + G;', 'v = [0; 0];', 'for k = 1:N', '  b = (Cm/dt)*v + f;', '  v = M\\b;', 'end', 'steady = G\\f;'),
      outputs: [['v', 'Repeat the step N times.'], ['steady', 'The answer without capacitors.']],
      hints: ['Form M once, before the loop.', 'Inside the loop: b = (Cm/dt)*v + f; v = M\\b;', 'steady = G\\f;'],
    })),
    problem('time-constant', 'How fast the gap closes', 'Apply', r => ({
      prompt: 'One node has a resistor R and a capacitor c to ground. Store tau = R*c, its time constant, and factor = 1/(1 + dt/tau), the number each backward Euler step multiplies the gap to the steady voltage by.',
      setup: lines(`R = ${r.pick(OHMS)};`, `c = ${r.pick(CAPS)};`, `dt = ${r.pick(STEPS)};`),
      solution: lines('tau = R*c;', 'factor = 1/(1 + dt/tau);'),
      outputs: [['tau', 'Resistance times capacitance, in seconds.'], ['factor', 'Below 1 for every step size.']],
      hints: ['tau = R*c;', 'The gap obeys (c/dt + 1/R)*gap_new = (c/dt)*gap_old.', 'factor = 1/(1 + dt/tau);'],
    })),
  ],
  'laml-circ-capstone': [
    problem('divider', 'A voltage divider', 'Warm-up', r => ({
      prompt: 'Resistors R1 (top) and R2 (bottom) hang in series from a supply Vs to ground. Store current, the current through them, and vmid, the voltage where they meet.',
      setup: lines(`Vs = ${r.int(3, 24)};`, `R1 = ${r.pick(OHMS)};`, `R2 = ${r.pick(OHMS)};`),
      solution: lines('current = Vs/(R1 + R2);', 'vmid = current*R2;'),
      outputs: [['current', 'In series, resistances add.'], ['vmid', 'The drop across R2.']],
      hints: ['current = Vs/(R1 + R2);', 'The middle sits R2 × current above ground.', 'vmid = current*R2;'],
    })),
    problem('known-rhs', 'Move the known voltages across', 'Apply', r => ({
      prompt: 'Gfull is the conductance matrix of a bridge whose node 1 is held at Vs and node 4 is ground. Store rhs = -Gfull(unknown, known)*vk with unknown = [2 3], known = [1 4] and vk = [Vs; 0], and vu, the voltages of nodes 2 and 3.',
      setup: lines(BRIDGE, bridgeR(r), `Vs = ${r.int(3, 24)};`, ...BRIDGE_G),
      solution: lines(...BRIDGE_SOLVE),
      outputs: [['rhs', 'The known voltages\' effect on the unknown rows.'], ['vu', 'Solve with the unknown block of Gfull.']],
      hints: ['known = [1 4]; unknown = [2 3]; vk = [Vs; 0];', 'rhs = -Gfull(unknown, known)*vk;', 'vu = Gfull(unknown, unknown)\\rhs;'],
    })),
    problem('bridge-out', 'Read the bridge', 'Apply', r => ({
      prompt: 'A bridge: node 1 is held at Vs, node 4 is ground, and branches lists R1, R2, R3, the sensor and the meter with resistances R. Build A and Gfull, solve for vu (nodes 2 and 3), and store vu and out = vu(1) - vu(2).',
      setup: lines(BRIDGE, bridgeR(r), `Vs = ${r.int(3, 24)};`),
      solution: lines(...BRIDGE_G, ...BRIDGE_SOLVE, 'out = vu(1) - vu(2);'),
      outputs: [['vu', 'The two middle nodes.'], ['out', 'What the meter reads.']],
      hints: ['Build A and Gfull = transpose(A)*C*A as in the incidence lesson.', 'rhs = -Gfull(unknown, known)*vk; vu = Gfull(unknown, unknown)\\rhs;', 'out = vu(1) - vu(2);'],
    })),
    problem('supply-current', 'What the supply delivers', 'Apply', r => ({
      prompt: 'Gfull is a bridge\'s conductance matrix and v holds all four node voltages (node 1 at Vs, node 4 at 0). Store supply, the current the supply delivers (row 1 of Gfull*v), and power = Vs*supply.',
      setup: lines(BRIDGE, bridgeR(r), `Vs = ${r.int(3, 24)};`, ...BRIDGE_G, ...BRIDGE_V),
      solution: lines('flow = Gfull*v;', 'supply = flow(1);', 'power = Vs*supply;'),
      outputs: [['supply', 'The unused first row gives the supply current.'], ['power', 'Voltage times current.']],
      hints: ['flow = Gfull*v;', 'supply = flow(1);', 'power = Vs*supply;'],
    })),
    problem('branch-power', 'Heat in every resistor', 'Apply', r => ({
      prompt: 'A is a bridge\'s incidence matrix, C = diag(1./R) and v its node voltages. Store e = A*v, the drops, p = (C*e).*e, the power in each resistor, and total = sum(p).',
      setup: lines(BRIDGE, bridgeR(r), `Vs = ${r.int(3, 24)};`, ...BRIDGE_G, ...BRIDGE_V),
      solution: lines('e = A*v;', 'p = (C*e).*e;', 'total = sum(p);'),
      outputs: [['e', 'Start voltage minus end voltage.'], ['p', 'Current times drop.'], ['total', 'Equals the power the supply delivers.']],
      hints: ['e = A*v;', 'C*e gives the currents; multiply entry by entry with the drops.', 'p = (C*e).*e; total = sum(p);'],
    })),
    problem('utilisation', 'Does it overheat?', 'Apply', r => ({
      prompt: 'A bridge (node 1 at Vs, node 4 ground, resistors in branches with resistances R) uses resistors rated at rating watts. Build A and Gfull, solve, and store p, the power in each resistor, and utilisation = max(p)/rating.',
      setup: lines(BRIDGE, bridgeR(r), `Vs = ${r.int(3, 24)};`, `rating = ${r.pick([0.0625, 0.125, 0.25, 0.5])};`),
      solution: lines(...BRIDGE_G, ...BRIDGE_V, 'e = A*v;', 'p = (C*e).*e;', 'utilisation = max(p)/rating;'),
      outputs: [['p', 'Current times drop for each resistor.'], ['utilisation', 'Above 1, a resistor overheats.']],
      hints: ['Solve the bridge as in the lesson and fill the full v.', 'e = A*v; p = (C*e).*e;', 'utilisation = max(p)/rating;'],
    })),
  ],
}
