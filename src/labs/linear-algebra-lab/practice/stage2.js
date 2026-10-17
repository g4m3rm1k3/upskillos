// Stage 2 practice: matrix × vector, angles, word problems, a bridge truss and a resistor circuit.
// Every answer comes from running the reference solution on freshly generated inputs.
import { mat, vec } from './helpers.js'

const lines = (...source) => source.join('\n')
const row = (r, n, min, max) => Array.from({ length: n }, () => r.int(min, max))
const grid = (r, m, n, min, max) => Array.from({ length: m }, () => row(r, n, min, max))
const det2 = ([[a, b], [c, d]]) => a * d - b * c
// A random integer matrix that is safely invertible.
function invertible(r, n) {
  for (;;) {
    const A = grid(r, n, n, -4, 6)
    if (n === 2 ? Math.abs(det2(A)) >= 2 : Math.abs(det3(A)) >= 2) return A
  }
}
const det3 = A => A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])
const times = (A, x) => A.map(rowA => rowA.reduce((sum, a, i) => sum + a * x[i], 0))

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

// Truss geometry as OpenMAT code: apex (cx, h) over a span L, load P at the apex.
const trussSetup = (L, cx, h, P) => lines(`L = ${L}; cx = ${cx}; h = ${h}; P = ${P};`,
  'lac = sqrt(cx^2 + h^2); lbc = sqrt((cx - L)^2 + h^2);',
  'ax = cx/lac; ay = h/lac; bx = (cx - L)/lbc; by = h/lbc;',
  'M = [1 ax 0 1 0 0; 0 ay 0 0 1 0; -1 0 bx 0 0 0; 0 0 by 0 0 1; 0 -ax -bx 0 0 0; 0 -ay -by 0 0 0];',
  'b = [0; 0; 0; 0; 0; P];')
const TRUSS_ORDER = 'The unknowns are, in order, [F_AB; F_AC; F_BC; Ax; Ay; By], with tension positive.'

export const stage2Practice = {
  'laml-matrix-vector': [
    problem('shop-bills', 'Bills at every shop', 'Warm-up', r => ({
      prompt: 'P has one row of prices per shop and one column per item. q lists how many of each item you buy. Store bills = P * q.',
      setup: lines(`P = ${mat(grid(r, 3, 4, 1, 9))};`, `q = ${vec(row(r, 4, 0, 4))};`), solution: 'bills = P * q;',
      outputs: [['bills', 'Each bill is one row of P dotted with q.']],
      hints: ['One answer per shop.', 'The matrix goes first.', 'bills = P * q;'],
    })),
    problem('one-row', 'Check one row by hand', 'Warm-up', r => ({
      prompt: 'Store result = A * x, and first = dot(A(1,:), x), the first entry computed on its own. They should agree.',
      setup: lines(`A = ${mat(grid(r, 3, 3, -5, 5))};`, `x = ${vec(row(r, 3, -4, 4))};`), solution: lines('result = A * x;', 'first = dot(A(1,:), x);'),
      outputs: [['result', 'Multiply the matrix by the vector.'], ['first', 'Row 1 of A dotted with x.']],
      hints: ['A(1,:) is the first row.', 'Each entry of A * x is a row dotted with x.', 'result = A * x; first = dot(A(1,:), x);'],
    })),
    problem('column-view', 'The column view', 'Apply', r => ({
      prompt: 'Store direct = A * x and viaColumns = x(1)*A(:,1) + x(2)*A(:,2) + x(3)*A(:,3). Both views give the same vector.',
      setup: lines(`A = ${mat(grid(r, 2, 3, -5, 5))};`, `x = ${vec(row(r, 3, -3, 3))};`), solution: lines('direct = A * x;', 'viaColumns = x(1)*A(:,1) + x(2)*A(:,2) + x(3)*A(:,3);'),
      outputs: [['direct', 'Matrix times vector.'], ['viaColumns', 'Each column weighted by the matching entry of x.']],
      hints: ['A(:,j) is column j.', 'Weight column j by x(j) and add.', 'viaColumns = x(1)*A(:,1) + x(2)*A(:,2) + x(3)*A(:,3);'],
    })),
    problem('nutrition', 'Daily nutrients', 'Apply', r => ({
      prompt: 'N has one row per nutrient (protein, fat, sugar) and one column per food, in grams per serving. s lists servings eaten. Store totals = N * s and protein = totals(1).',
      setup: lines(`N = ${mat(grid(r, 3, 4, 0, 20))};`, `s = ${vec(row(r, 4, 0, 3))};`), solution: lines('totals = N * s;', 'protein = totals(1);'),
      outputs: [['totals', 'One total per nutrient.'], ['protein', 'Protein is the first row.']],
      hints: ['Rows are nutrients, so the answer has one entry per nutrient.', 'totals = N * s;', 'protein = totals(1);'],
    })),
    problem('shape-rule', 'Predict the shape', 'Apply', r => {
      const m = r.int(2, 4), n = r.int(2, 4)
      return {
        prompt: 'A is a matrix and x has one entry per column of A. Store rows = size(A, 1), cols = size(A, 2), and y = A * x. How many entries does y have?',
        setup: lines(`A = ${mat(grid(r, m, n, -4, 4))};`, `x = ${vec(row(r, n, -3, 3))};`), solution: lines('rows = size(A, 1);', 'cols = size(A, 2);', 'y = A * x;'),
        outputs: [['rows', 'size(A, 1) counts rows.'], ['cols', 'size(A, 2) counts columns.'], ['y', 'One entry per row of A.']],
        hints: ['Rows come first in size.', 'x needs one entry per column.', 'rows = size(A, 1); cols = size(A, 2); y = A * x;'],
      }
    }),
    problem('cheapest-shop', 'Find the cheapest shop', 'Transfer', r => ({
      prompt: 'Store bills = P * q, then [lowest, cheapest] = min(bills): the smallest bill and which shop offers it.',
      setup: lines(`P = ${mat(grid(r, 4, 3, 1, 9))};`, `q = ${vec(row(r, 3, 1, 4))};`), solution: lines('bills = P * q;', '[lowest, cheapest] = min(bills);'),
      outputs: [['bills', 'One bill per shop.'], ['lowest', 'The smallest bill.'], ['cheapest', 'The position of the smallest bill.']],
      hints: ['First compute every bill.', 'min with two outputs gives the value and its position.', 'bills = P * q; [lowest, cheapest] = min(bills);'],
    })),
  ],
  'laml-sin-cos': [
    problem('unit-point', 'A point on the unit circle', 'Warm-up', r => ({
      prompt: 'Store t, the angle angleDeg in radians, and point = [cos(t); sin(t)].',
      setup: `angleDeg = ${r.int(1, 71) * 5};`, solution: lines('t = angleDeg*pi/180;', 'point = [cos(t); sin(t)];'),
      outputs: [['t', 'Multiply degrees by pi/180.'], ['point', 'cos gives the first entry, sin the second.']],
      hints: ['cos and sin need radians.', 't = angleDeg*pi/180;', 'point = [cos(t); sin(t)];'],
    })),
    problem('arm-tip', 'Where is the arm\'s tip?', 'Warm-up', r => ({
      prompt: 'An arm of length armLength points angleDeg degrees above the horizontal. Store tip = [armLength*cos(t); armLength*sin(t)] with t in radians.',
      setup: lines(`armLength = ${r.int(1, 9)};`, `angleDeg = ${r.int(1, 35) * 5};`), solution: lines('t = angleDeg*pi/180;', 'tip = [armLength*cos(t); armLength*sin(t)];'),
      outputs: [['tip', 'Scale the unit point by the length.']],
      hints: ['Convert to radians first.', 'The tip is length times [cos; sin].', 't = angleDeg*pi/180; tip = [armLength*cos(t); armLength*sin(t)];'],
    })),
    problem('identity', 'cos² + sin² = 1', 'Apply', r => ({
      prompt: 'Store c = cos(t), s = sin(t) and check = c^2 + s^2 for the angle angleDeg (convert to radians t first).',
      setup: `angleDeg = ${r.int(1, 71) * 5};`, solution: lines('t = angleDeg*pi/180;', 'c = cos(t);', 's = sin(t);', 'check = c^2 + s^2;'),
      outputs: [['c', 'The cosine of the angle in radians.'], ['s', 'The sine of the angle in radians.'], ['check', 'Pythagoras on the unit circle.']],
      hints: ['The point (c, s) is on a circle of radius 1.', 'So c² + s² is its squared distance from the centre.', 't = angleDeg*pi/180; c = cos(t); s = sin(t); check = c^2 + s^2;'],
    })),
    problem('recover-angle', 'From a point back to an angle', 'Apply', r => {
      const x = r.nonzero(-9, 9), y = r.nonzero(-9, 9)
      return {
        prompt: 'A point is at p. Store radius = norm(p) and angleDeg = atan2(p(2), p(1))*180/pi, its direction in degrees (between -180 and 180).',
        setup: `p = [${x}; ${y}];`, solution: lines('radius = norm(p);', 'angleDeg = atan2(p(2), p(1))*180/pi;'),
        outputs: [['radius', 'The distance from the origin.'], ['angleDeg', 'atan2 takes the y entry first, then the x entry.']],
        hints: ['The radius is the length of p.', 'atan2(y, x) gives the angle in radians, in the correct quarter.', 'radius = norm(p); angleDeg = atan2(p(2), p(1))*180/pi;'],
      }
    }),
    problem('launch', 'Launch a ball', 'Transfer', r => ({
      prompt: 'A ball is launched at speed metres per second, angleDeg degrees above the ground. Store velocity = [speed*cos(t); speed*sin(t)] and flightTime = 2*velocity(2)/9.8 (time to land on flat ground).',
      setup: lines(`speed = ${r.int(5, 30)};`, `angleDeg = ${r.int(2, 16) * 5};`), solution: lines('t = angleDeg*pi/180;', 'velocity = [speed*cos(t); speed*sin(t)];', 'flightTime = 2*velocity(2)/9.8;'),
      outputs: [['velocity', 'Split the speed into across and up.'], ['flightTime', 'Up and back down takes twice the up-speed divided by g.']],
      hints: ['Across is speed*cos(t); up is speed*sin(t).', 'Only the upward part decides the flight time.', 'velocity = [speed*cos(t); speed*sin(t)]; flightTime = 2*velocity(2)/9.8;'],
    })),
    problem('two-arm-robot', 'A two-joint robot arm', 'Transfer', r => ({
      prompt: 'A robot arm has a first segment of length L1 at shoulder angle a1 degrees, and a second of length L2 at a further a2 degrees (so it points at a1 + a2). Store elbow and tip.',
      setup: lines(`L1 = ${r.int(2, 6)};`, `L2 = ${r.int(1, 5)};`, `a1 = ${r.int(0, 18) * 5};`, `a2 = ${r.int(-12, 12) * 5};`),
      solution: lines('t1 = a1*pi/180;', 't2 = (a1 + a2)*pi/180;', 'elbow = [L1*cos(t1); L1*sin(t1)];', 'tip = elbow + [L2*cos(t2); L2*sin(t2)];'),
      outputs: [['elbow', 'The first segment from the shoulder.'], ['tip', 'The second segment starts at the elbow and points at a1 + a2.']],
      hints: ['Each segment is length times [cos; sin] of its own direction.', 'The second segment\'s direction is a1 + a2.', 'tip = elbow + [L2*cos(t2); L2*sin(t2)];'],
    })),
  ],
  'laml-why-equations': [
    problem('alloy', 'Mix two alloys', 'Warm-up', r => {
      const pa = r.int(6, 9) / 10, pb = r.int(1, 4) / 10, x = r.int(5, 40), y = r.int(5, 40)
      return {
        prompt: 'Alloy X is a fraction pa gold and alloy Y is a fraction pb gold. You need total grams containing gold grams of gold. Store amounts = [grams of X; grams of Y] by solving A * amounts = b.',
        setup: lines(`pa = ${pa};`, `pb = ${pb};`, `total = ${x + y};`, `gold = ${Number((pa * x + pb * y).toFixed(4))};`),
        solution: lines('A = [1 1; pa pb];', 'b = [total; gold];', 'amounts = A \\ b;'),
        outputs: [['amounts', 'One equation for the weight, one for the gold.']],
        hints: ['Weights add up: x + y = total.', 'Gold adds up: pa*x + pb*y = gold.', 'A = [1 1; pa pb]; b = [total; gold]; amounts = A \\ b;'],
      }
    }),
    problem('tickets', 'Count the tickets', 'Warm-up', r => {
      const pc = r.int(3, 8), pa = pc + r.int(2, 8), c = r.int(1, 12), a = r.int(1, 12)
      return {
        prompt: 'Child tickets cost pc and adult tickets cost pa. A group of people paid money. Store tickets = [children; adults].',
        setup: lines(`pc = ${pc};`, `pa = ${pa};`, `people = ${c + a};`, `money = ${pc * c + pa * a};`),
        solution: lines('A = [1 1; pc pa];', 'b = [people; money];', 'tickets = A \\ b;'),
        outputs: [['tickets', 'Count people in one equation and money in the other.']],
        hints: ['children + adults = people.', 'pc*children + pa*adults = money.', 'A = [1 1; pc pa]; b = [people; money]; tickets = A \\ b;'],
      }
    }),
    problem('sum-difference', 'Two numbers from their sum and difference', 'Warm-up', r => {
      const x = r.int(-20, 20), y = r.int(-20, 20)
      return {
        prompt: 'Two numbers add to s and the first minus the second is d. Store numbers = [first; second] by solving a 2 × 2 system.',
        setup: lines(`s = ${x + y};`, `d = ${x - y};`), solution: lines('A = [1 1; 1 -1];', 'b = [s; d];', 'numbers = A \\ b;'),
        outputs: [['numbers', 'One equation for the sum, one for the difference.']],
        hints: ['first + second = s; first - second = d.', 'A = [1 1; 1 -1].', 'b = [s; d]; numbers = A \\ b;'],
      }
    }),
    problem('check-guess', 'Check a proposed answer', 'Apply', r => {
      const A = invertible(r, 2), x = row(r, 2, -5, 5), guess = r.pick([x, [x[0] + 1, x[1]], [x[0], x[1] - 2]])
      return {
        prompt: 'Someone claims guess solves A * x = b. Store residual = A * guess - b and correct = 1 if every entry of residual is 0, otherwise 0.',
        setup: lines(`A = ${mat(A)};`, `b = ${vec(times(A, x))};`, `guess = ${vec(guess)};`),
        solution: lines('residual = A * guess - b;', 'correct = 0;', 'if norm(residual) < 1e-9', '  correct = 1;', 'end'),
        outputs: [['residual', 'Put the guess back into the equations.'], ['correct', 'A correct answer leaves nothing over.']],
        hints: ['A correct answer makes A * guess equal b.', 'norm(residual) is zero only if every entry is zero.', 'residual = A * guess - b; then an if block sets correct.'],
      }
    }),
    problem('three-unknowns', 'Three conditions, three unknowns', 'Apply', r => {
      const A = invertible(r, 3), x = row(r, 3, -5, 5)
      return {
        prompt: 'Solve the three equations A * x = b. Store x and check = A * x - b.',
        setup: lines(`A = ${mat(A)};`, `b = ${vec(times(A, x))};`), solution: lines('x = A \\ b;', 'check = A * x - b;'),
        outputs: [['x', 'Solve with a backslash.'], ['check', 'Every equation should be satisfied.']],
        hints: ['Bigger systems are solved the same way.', 'x = A \\ b;', 'check = A * x - b;'],
      }
    }),
    problem('coffee-blend', 'Blend coffee to a price', 'Transfer', r => {
      const ca = r.int(12, 20), cb = r.int(4, 10), x = r.int(1, 10), y = r.int(1, 10)
      return {
        prompt: 'Beans A cost ca per kilogram and beans B cost cb. A roaster wants total kilograms of a blend that costs cost in all. Store kilos = [kilograms of A; kilograms of B] and pricePerKilo = cost/total.',
        setup: lines(`ca = ${ca};`, `cb = ${cb};`, `total = ${x + y};`, `cost = ${ca * x + cb * y};`),
        solution: lines('A = [1 1; ca cb];', 'b = [total; cost];', 'kilos = A \\ b;', 'pricePerKilo = cost/total;'),
        outputs: [['kilos', 'The same structure as the alloy problem.'], ['pricePerKilo', 'The blend\'s price per kilogram.']],
        hints: ['Weights add to total; costs add to cost.', 'A = [1 1; ca cb]; b = [total; cost];', 'kilos = A \\ b; pricePerKilo = cost/total;'],
      }
    }),
  ],
  'laml-truss': [
    problem('heavier-load', 'Forces under a new load', 'Warm-up', r => ({
      prompt: `A triangle truss with apex C = (cx, h) over span L carries load P at C. M and b are supplied. ${TRUSS_ORDER} Store forces = M \\ b.`,
      setup: trussSetup(4, 2, 2, r.int(2, 40)), solution: 'forces = M \\ b;',
      outputs: [['forces', 'Solve all six balance equations at once.']],
      hints: ['M and b are already built.', 'One backslash solves the system.', 'forces = M \\ b;'],
    })),
    problem('support-reactions', 'Support reactions', 'Warm-up', r => ({
      prompt: `${TRUSS_ORDER} Solve, then store Ay = forces(5), By = forces(6) and total = Ay + By. The supports must hold up the whole load.`,
      setup: trussSetup(4, r.int(1, 3), r.int(1, 3), r.int(2, 40)), solution: lines('forces = M \\ b;', 'Ay = forces(5);', 'By = forces(6);', 'total = Ay + By;'),
      outputs: [['Ay', 'The upward push at A.'], ['By', 'The upward push at B.'], ['total', 'Should equal the load P.']],
      hints: ['Ay and By are the 5th and 6th unknowns.', 'forces = M \\ b;', 'Ay = forces(5); By = forces(6); total = Ay + By;'],
    })),
    problem('off-centre', 'An off-centre apex', 'Apply', r => {
      const cx = r.pick([0.5, 1, 1.5, 2.5, 3, 3.5])
      return {
        prompt: `The apex is not in the middle. ${TRUSS_ORDER} Store forces = M \\ b, and steeper = 1 if the bar AC carries more force (in size) than BC, otherwise 0.`,
        setup: trussSetup(4, cx, r.int(1, 3), r.int(5, 30)),
        solution: lines('forces = M \\ b;', 'steeper = 0;', 'if abs(forces(2)) > abs(forces(3))', '  steeper = 1;', 'end'),
        outputs: [['forces', 'Solve the system.'], ['steeper', 'Compare the sizes of the AC and BC forces.']],
        hints: ['Use abs to compare sizes regardless of sign.', 'AC is forces(2) and BC is forces(3).', 'forces = M \\ b; then an if block sets steeper.'],
      }
    }),
    problem('taller-truss', 'Height versus force', 'Apply', r => ({
      prompt: `${TRUSS_ORDER} Solve, then store tensionAB = forces(1) and squeezeAC = -forces(2). Compare with a taller truss in the transfer task.`,
      setup: trussSetup(4, 2, r.int(1, 6) / 2, r.int(5, 30)), solution: lines('forces = M \\ b;', 'tensionAB = forces(1);', 'squeezeAC = -forces(2);'),
      outputs: [['tensionAB', 'The bottom bar is in tension.'], ['squeezeAC', 'The size of the compression in AC.']],
      hints: ['Solve first.', 'AB is the first unknown, AC the second.', 'tensionAB = forces(1); squeezeAC = -forces(2);'],
    })),
    problem('lever-rule', 'Which support works harder?', 'Transfer', r => {
      const cx = r.pick([0.5, 1, 1.5, 2.5, 3, 3.5]), P = r.int(4, 40)
      return {
        prompt: `${TRUSS_ORDER} Solve, store By = forces(6), and predicted = P*cx/L, the lever rule. They should agree.`,
        setup: trussSetup(4, cx, r.int(1, 3), P), solution: lines('forces = M \\ b;', 'By = forces(6);', 'predicted = P*cx/L;'),
        outputs: [['By', 'The upward push at B.'], ['predicted', 'The load times its distance from A, divided by the span.']],
        hints: ['The closer the load is to B, the more B carries.', 'By is the 6th unknown.', 'By = forces(6); predicted = P*cx/L;'],
      }
    }),
    problem('bar-sizing', 'Size a bar', 'Transfer', r => ({
      prompt: `${TRUSS_ORDER} A bar can safely carry strength kN per square centimetre. Solve, then store needAC = abs(forces(2))/strength, the cross-section area AC needs.`,
      setup: lines(trussSetup(4, r.int(1, 3), r.int(1, 3), r.int(10, 60)), `strength = ${r.int(2, 9)};`), solution: lines('forces = M \\ b;', 'needAC = abs(forces(2))/strength;'),
      outputs: [['needAC', 'Bigger forces need thicker bars.']],
      hints: ['Size depends on the size of the force, not its sign.', 'abs(forces(2)) is the force in AC.', 'forces = M \\ b; needAC = abs(forces(2))/strength;'],
    })),
  ],
  'laml-circuit': [
    problem('scale-battery', 'A different battery', 'Warm-up', r => ({
      prompt: 'The circuit from the lesson (all resistors 1 Ω) has G = [3 -1; -1 2]. The battery is Vs volts. Store I = [Vs; 0] and V = G \\ I.',
      setup: `Vs = ${r.int(1, 48)};`, solution: lines('G = [3 -1; -1 2];', 'I = [Vs; 0];', 'V = G \\ I;'),
      outputs: [['V', 'Solve the two node equations.']],
      hints: ['Only node a is connected to the battery.', 'I = [Vs; 0];', 'V = G \\ I;'],
    })),
    problem('kcl-check', 'Check the currents balance', 'Warm-up', r => ({
      prompt: 'With all resistors 1 Ω and battery Vs, solve V = G \\ I with G = [3 -1; -1 2]. Store iIn = Vs - V(1) (from the battery), iDown = V(1) (to ground), iAcross = V(1) - V(2) (to node b), and balance = iIn - iDown - iAcross.',
      setup: `Vs = ${r.int(1, 48)};`, solution: lines('G = [3 -1; -1 2];', 'I = [Vs; 0];', 'V = G \\ I;', 'iIn = Vs - V(1);', 'iDown = V(1);', 'iAcross = V(1) - V(2);', 'balance = iIn - iDown - iAcross;'),
      outputs: [['iIn', 'Ohm\'s law across the battery resistor.'], ['iDown', 'Current from a to ground.'], ['iAcross', 'Current from a to b.'], ['balance', 'Kirchhoff: current in equals current out.']],
      hints: ['Current = voltage difference / resistance, and every resistor is 1 Ω.', 'Solve for V first.', 'balance = iIn - iDown - iAcross;'],
    })),
    problem('voltage-divider', 'A one-node circuit', 'Warm-up', r => {
      const R1 = r.int(1, 9), R2 = r.int(1, 9)
      return {
        prompt: 'A battery Vs feeds node a through R1; node a connects to ground through R2. Node a\'s equation is (1/R1 + 1/R2)*Va = Vs/R1. Store Va, and formula = Vs*R2/(R1 + R2), the textbook voltage-divider result.',
        setup: lines(`Vs = ${r.int(1, 24)};`, `R1 = ${R1};`, `R2 = ${R2};`), solution: lines('Va = (Vs/R1) / (1/R1 + 1/R2);', 'formula = Vs*R2/(R1 + R2);'),
        outputs: [['Va', 'Solve the single equation by dividing.'], ['formula', 'The voltage-divider formula.']],
        hints: ['A 1 × 1 system is just a division.', 'Va = (Vs/R1) / (1/R1 + 1/R2);', 'formula = Vs*R2/(R1 + R2);'],
      }
    }),
    problem('different-resistors', 'Different resistors', 'Apply', r => ({
      prompt: 'The lesson\'s circuit with resistors R1 (battery to a), R2 (a to ground), R3 (a to b) and R4 (b to ground). Build G = [1/R1+1/R2+1/R3, -1/R3; -1/R3, 1/R3+1/R4] and I = [Vs/R1; 0], and store V = G \\ I.',
      setup: lines(`Vs = ${r.int(5, 30)};`, `R1 = ${r.int(1, 9)};`, `R2 = ${r.int(1, 9)};`, `R3 = ${r.int(1, 9)};`, `R4 = ${r.int(1, 9)};`),
      solution: lines('G = [1/R1+1/R2+1/R3 -1/R3; -1/R3 1/R3+1/R4];', 'I = [Vs/R1; 0];', 'V = G \\ I;'),
      outputs: [['V', 'Build G from the conductances 1/R, then solve.']],
      hints: ['Each resistor touching a node adds 1/R on that node\'s diagonal.', 'A resistor between a and b also appears as -1/R off the diagonal.', 'G = [1/R1+1/R2+1/R3 -1/R3; -1/R3 1/R3+1/R4]; I = [Vs/R1; 0]; V = G \\ I;'],
    })),
    problem('power', 'Power in a resistor', 'Apply', r => ({
      prompt: 'With all resistors 1 Ω and battery Vs, solve V = G \\ I with G = [3 -1; -1 2]. Store powerB = V(2)^2/1, the power turned to heat in the resistor from b to ground, in watts.',
      setup: `Vs = ${r.int(1, 48)};`, solution: lines('G = [3 -1; -1 2];', 'I = [Vs; 0];', 'V = G \\ I;', 'powerB = V(2)^2/1;'),
      outputs: [['powerB', 'Power = voltage² / resistance.']],
      hints: ['Find V first.', 'The resistor from b to ground has V(2) across it.', 'powerB = V(2)^2/1;'],
    })),
    problem('three-nodes', 'A longer ladder', 'Transfer', r => ({
      prompt: 'A ladder of three nodes: the battery Vs feeds node 1 through 1 Ω; each node connects to ground through 1 Ω; nodes 1–2 and 2–3 are joined by 1 Ω. Store G = [3 -1 0; -1 3 -1; 0 -1 2], I = [Vs; 0; 0] and V = G \\ I.',
      setup: `Vs = ${r.int(1, 60)};`, solution: lines('G = [3 -1 0; -1 3 -1; 0 -1 2];', 'I = [Vs; 0; 0];', 'V = G \\ I;'),
      outputs: [['G', 'Each row is one node\'s balance.'], ['V', 'Three voltages, falling along the ladder.']],
      hints: ['Node 2 touches three resistors, so its diagonal entry is 3.', 'Only node 1 is fed by the battery.', 'G = [3 -1 0; -1 3 -1; 0 -1 2]; I = [Vs; 0; 0]; V = G \\ I;'],
    })),
  ],
}
