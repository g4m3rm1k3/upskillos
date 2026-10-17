// Calculus practice: slopes, gradients, Jacobians and the chain rule, by nudging and by rules.
// Nudged (centred) estimates are exact for quadratics and within about h² otherwise, far inside tolerance.
import { vec } from './helpers.js'

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
const NUDGE = 'h = 0.0001;'
const partials = (f, x, y) => `[(${f}(${x} + h, ${y}) - ${f}(${x} - h, ${y})) / (2*h); (${f}(${x}, ${y} + h) - ${f}(${x}, ${y} - h)) / (2*h)]`

export const calculusPractice = {
  'laml-slope': [
    problem('power-slope', 'Slope of a power', 'Warm-up', r => ({
      prompt: 'f(x) = x^n. Store slope, the centred nudge estimate of the slope of f at a, and rule = n*a^(n-1), the power rule. They should agree.',
      setup: lines(`n = ${r.int(2, 5)};`, `a = ${r.nonzero(-3, 3)};`, 'f = @(x) x.^n;', NUDGE), solution: lines('slope = (f(a + h) - f(a - h)) / (2*h);', 'rule = n*a^(n-1);'),
      outputs: [['slope', 'Nudge a both ways, divide by 2h.'], ['rule', 'The power rule: n times a to the power n − 1.']],
      hints: ['A slope is change in output over change in input.', 'slope = (f(a + h) - f(a - h)) / (2*h);', 'rule = n*a^(n-1);'],
    })),
    problem('speed-from-height', 'Speed of a thrown ball', 'Warm-up', r => ({
      prompt: 'A ball thrown upwards at v0 m/s has height y(t) = v0*t - 4.9*t^2. Store speed, its vertical speed at time t1 (estimate by nudging), and rising = 1 if it is still going up, otherwise 0.',
      setup: lines(`v0 = ${r.int(5, 30)};`, `t1 = ${r.int(1, 30) / 10};`, 'y = @(t) v0*t - 4.9*t.^2;', NUDGE),
      solution: lines('speed = (y(t1 + h) - y(t1 - h)) / (2*h);', 'rising = 0;', 'if speed > 0', '  rising = 1;', 'end'),
      outputs: [['speed', 'The slope of height against time.'], ['rising', 'Positive speed means height is increasing.']],
      hints: ['Speed is the slope of the height curve.', 'Nudge t1 both ways.', 'speed = (y(t1 + h) - y(t1 - h)) / (2*h); then set rising with an if block.'],
    })),
    problem('linear-prediction', 'Predict with a straight line', 'Apply', r => ({
      prompt: 'For f(x) = sqrt(x), store slope at a (by nudging), approx = f(a) + slope*step, actual = f(a + step), and gap = actual - approx.',
      setup: lines(`a = ${r.int(1, 9) ** 2};`, `step = ${r.int(1, 20) / 10};`, 'f = @(x) sqrt(x);', NUDGE),
      solution: lines('slope = (f(a + h) - f(a - h)) / (2*h);', 'approx = f(a) + slope*step;', 'actual = f(a + step);', 'gap = actual - approx;'),
      outputs: [['slope', 'Nudge a both ways.'], ['approx', 'The tangent-line prediction.'], ['actual', 'The true value.'], ['gap', 'How far the line is off.']],
      hints: ['The prediction is f(a) plus slope times the step.', 'Compare with the true value f(a + step).', 'gap = actual - approx;'],
    })),
    problem('forward-versus-centred', 'Two ways to nudge', 'Apply', r => ({
      prompt: 'For f(x) = x^3 at a, store forward = (f(a + h) - f(a))/h, centred = (f(a + h) - f(a - h))/(2*h), and exact = 3*a^2. Which estimate is closer?',
      setup: lines(`a = ${r.nonzero(-4, 4)};`, 'f = @(x) x.^3;', 'h = 0.01;'),
      solution: lines('forward = (f(a + h) - f(a))/h;', 'centred = (f(a + h) - f(a - h))/(2*h);', 'exact = 3*a^2;'),
      outputs: [['forward', 'Nudge one way only.'], ['centred', 'Nudge both ways.'], ['exact', 'The power rule.']],
      hints: ['Write both estimates exactly as given.', 'The centred estimate is usually much closer.', 'forward = (f(a + h) - f(a))/h; centred = (f(a + h) - f(a - h))/(2*h); exact = 3*a^2;'],
    })),
    problem('tangent-line', 'Equation of the tangent line', 'Apply', r => ({
      prompt: 'f(x) = p*x^2 + q*x + c. Store slope = 2*p*a + q (the exact slope at a) and intercept, where the tangent line y = slope*x + intercept touches f at a.',
      setup: lines(`p = ${r.nonzero(-3, 3)};`, `q = ${r.int(-5, 5)};`, `c = ${r.int(-5, 5)};`, `a = ${r.int(-3, 3)};`, 'f = @(x) p*x.^2 + q*x + c;'),
      solution: lines('slope = 2*p*a + q;', 'intercept = f(a) - slope*a;'),
      outputs: [['slope', 'Differentiate p x² + q x + c.'], ['intercept', 'The line must pass through (a, f(a)).']],
      hints: ['The slope of p x² is 2 p x, and of q x is q.', 'Put x = a and y = f(a) into y = slope*x + intercept.', 'intercept = f(a) - slope*a;'],
    })),
    problem('marginal-cost', 'The cost of one more', 'Transfer', r => ({
      prompt: 'Making q items costs cost(q) = fixed + v*q + k*q^2. Store marginal, the slope of cost at q0 (by nudging), and nextItem = cost(q0 + 1) - cost(q0), the true extra cost of one more item.',
      setup: lines(`fixed = ${r.int(50, 500)};`, `v = ${r.int(2, 20)};`, `k = ${r.int(1, 9) / 100};`, `q0 = ${r.int(10, 200)};`, 'cost = @(q) fixed + v*q + k*q.^2;', NUDGE),
      solution: lines('marginal = (cost(q0 + h) - cost(q0 - h)) / (2*h);', 'nextItem = cost(q0 + 1) - cost(q0);'),
      outputs: [['marginal', 'The slope of the cost curve.'], ['nextItem', 'The exact cost of one more item.']],
      hints: ['Economists call the slope of cost the marginal cost.', 'marginal = (cost(q0 + h) - cost(q0 - h)) / (2*h);', 'nextItem = cost(q0 + 1) - cost(q0);'],
    })),
  ],
  'laml-gradient': [
    problem('partials', 'Two partial derivatives', 'Warm-up', r => ({
      prompt: 'f(x, y) = a*x^2 + b*y^2 + c*x*y. Store grad, the gradient at (px, py), estimated by nudging x and y separately.',
      setup: lines(`a = ${r.int(-3, 3)};`, `b = ${r.int(-3, 3)};`, `c = ${r.int(-3, 3)};`, `px = ${r.int(-3, 3)};`, `py = ${r.int(-3, 3)};`, 'f = @(x, y) a*x.^2 + b*y.^2 + c*x.*y;', NUDGE),
      solution: `grad = ${partials('f', 'px', 'py')};`,
      outputs: [['grad', 'Nudge x alone for the first entry and y alone for the second.']],
      hints: ['Keep y fixed while nudging x.', 'Then keep x fixed while nudging y.', `grad = ${partials('f', 'px', 'py')};`],
    })),
    problem('steepness', 'How steep, and which way', 'Warm-up', r => ({
      prompt: 'The gradient at a point is grad. Store steepness = norm(grad) and uphill = grad / steepness, the unit direction of steepest climb.',
      setup: `grad = ${vec([r.nonzero(-6, 6), r.nonzero(-6, 6)])};`, solution: lines('steepness = norm(grad);', 'uphill = grad / steepness;'),
      outputs: [['steepness', 'The length of the gradient.'], ['uphill', 'The gradient scaled to length 1.']],
      hints: ['The gradient\'s length is the steepest rate.', 'Divide by the length to get a unit vector.', 'steepness = norm(grad); uphill = grad / steepness;'],
    })),
    problem('directional', 'Rate in a chosen direction', 'Apply', r => ({
      prompt: 'A hiker faces angleDeg degrees anticlockwise from east. With gradient grad, store u = [cos(t); sin(t)] (t in radians) and rate = dot(grad, u), how fast the height changes as she walks.',
      setup: lines(`grad = ${vec([r.int(-5, 5), r.int(-5, 5)])};`, `angleDeg = ${r.int(0, 71) * 5};`), solution: lines('t = angleDeg*pi/180;', 'u = [cos(t); sin(t)];', 'rate = dot(grad, u);'),
      outputs: [['u', 'The unit direction of travel.'], ['rate', 'The gradient dotted with the direction.']],
      hints: ['Convert the angle to radians.', 'The rate along u is the dot product with the gradient.', 'u = [cos(t); sin(t)]; rate = dot(grad, u);'],
    })),
    problem('contour-direction', 'Walk along a contour', 'Apply', r => ({
      prompt: 'Store along = [-grad(2); grad(1)] / norm(grad), a unit direction along the contour line, and rateAlong = dot(grad, along), which should be 0.',
      setup: `grad = ${vec([r.nonzero(-6, 6), r.nonzero(-6, 6)])};`, solution: lines('along = [-grad(2); grad(1)] / norm(grad);', 'rateAlong = dot(grad, along);'),
      outputs: [['along', 'Turn the gradient a quarter turn and make it length 1.'], ['rateAlong', 'Along a contour, the height does not change.']],
      hints: ['A quarter turn of [a; b] is [-b; a].', 'Divide by the length to make a unit vector.', 'along = [-grad(2); grad(1)] / norm(grad); rateAlong = dot(grad, along);'],
    })),
    problem('descent-step', 'One step downhill', 'Apply', r => ({
      prompt: 'f(x, y) = (x - 1)^2 + 2*(y + 2)^2. From point p, store grad (by nudging), next = p - eta*grad, and drop = f(p(1), p(2)) - f(next(1), next(2)).',
      setup: lines(`p = ${vec([r.int(-4, 4), r.int(-4, 4)])};`, `eta = ${r.int(1, 4) / 10};`, 'f = @(x, y) (x - 1).^2 + 2*(y + 2).^2;', NUDGE),
      solution: lines(`grad = ${partials('f', 'p(1)', 'p(2)')};`, 'next = p - eta*grad;', 'drop = f(p(1), p(2)) - f(next(1), next(2));'),
      outputs: [['grad', 'Nudge each coordinate of p.'], ['next', 'Step against the gradient.'], ['drop', 'How much lower you are after the step.']],
      hints: ['Estimate the gradient at p first.', 'next = p - eta*grad;', 'drop = f(p(1), p(2)) - f(next(1), next(2));'],
    })),
    problem('heat-flux', 'Heat flow on a plate', 'Transfer', r => ({
      prompt: 'The temperature on a metal plate is T(x, y) = T0 + a*x + b*y + c*x*y. Heat flows down the temperature gradient: flux = -k * gradT. At (px, py), store gradT (by nudging) and flux.',
      setup: lines(`T0 = ${r.int(15, 40)};`, `a = ${r.int(-5, 5)};`, `b = ${r.int(-5, 5)};`, `c = ${r.int(-3, 3)};`, `k = ${r.int(10, 400)};`, `px = ${r.int(-3, 3)};`, `py = ${r.int(-3, 3)};`, 'T = @(x, y) T0 + a*x + b*y + c*x.*y;', NUDGE),
      solution: lines(`gradT = ${partials('T', 'px', 'py')};`, 'flux = -k * gradT;'),
      outputs: [['gradT', 'The temperature gradient.'], ['flux', 'Heat flows from hot to cold: against the gradient.']],
      hints: ['Estimate the gradient as usual.', 'The minus sign sends heat towards colder places.', 'flux = -k * gradT;'],
    })),
  ],
  'laml-jacobian': [
    problem('two-columns', 'Fill the Jacobian', 'Warm-up', r => ({
      prompt: 'F(x, y) = [x^2 + a*y; x*y]. Store J, the Jacobian at (px, py), by nudging x for column 1 and y for column 2.',
      setup: lines(`a = ${r.int(-4, 4)};`, `px = ${r.int(-3, 3)};`, `py = ${r.int(-3, 3)};`, 'F = @(x, y) [x.^2 + a*y; x.*y];', NUDGE),
      solution: lines('J = zeros(2,2);', 'J(:,1) = (F(px + h, py) - F(px - h, py)) / (2*h);', 'J(:,2) = (F(px, py + h) - F(px, py - h)) / (2*h);'),
      outputs: [['J', 'Column j records the effect of nudging input j.']],
      hints: ['Start from J = zeros(2,2).', 'J(:,1) = (F(px + h, py) - F(px - h, py)) / (2*h);', 'Fill J(:,2) the same way, nudging y.'],
    })),
    problem('linear-map', 'The Jacobian of a matrix map', 'Warm-up', r => {
      const A = [[r.int(-4, 4), r.int(-4, 4)], [r.int(-4, 4), r.int(-4, 4)]]
      return {
        prompt: 'F(x, y) = [a11*x + a12*y; a21*x + a22*y] is a matrix map. Store J at (px, py) by nudging. It should equal the matrix itself, wherever you are.',
        setup: lines(`a11 = ${A[0][0]}; a12 = ${A[0][1]}; a21 = ${A[1][0]}; a22 = ${A[1][1]};`, `px = ${r.int(-5, 5)};`, `py = ${r.int(-5, 5)};`, 'F = @(x, y) [a11*x + a12*y; a21*x + a22*y];', NUDGE),
        solution: lines('J = zeros(2,2);', 'J(:,1) = (F(px + h, py) - F(px - h, py)) / (2*h);', 'J(:,2) = (F(px, py + h) - F(px, py - h)) / (2*h);'),
        outputs: [['J', 'A linear map is its own Jacobian.']],
        hints: ['Nudge each input in turn.', 'The answer should not depend on px and py.', 'Fill J(:,1) and J(:,2) by nudging x and y.'],
      }
    }),
    problem('polar-area', 'Area growth of the polar map', 'Apply', r => ({
      prompt: 'F(r, t) = [r*cos(t); r*sin(t)]. Store J at (r0, t0) by nudging, and areaGrowth = det(J). Compare it with r0.',
      setup: lines(`r0 = ${r.int(1, 9)};`, `t0 = ${r.int(0, 23)}*pi/12;`, 'F = @(r, t) [r*cos(t); r*sin(t)];', NUDGE),
      solution: lines('J = zeros(2,2);', 'J(:,1) = (F(r0 + h, t0) - F(r0 - h, t0)) / (2*h);', 'J(:,2) = (F(r0, t0 + h) - F(r0, t0 - h)) / (2*h);', 'areaGrowth = det(J);'),
      outputs: [['J', 'Nudge r for column 1, t for column 2.'], ['areaGrowth', 'For polar coordinates this equals the radius.']],
      hints: ['Fill J one column at a time.', 'The determinant gives the local area factor.', 'areaGrowth = det(J);'],
    })),
    problem('linear-prediction', 'Predict with the Jacobian', 'Apply', r => ({
      prompt: 'F(x, y) = [x*y; x + y^2]. At p, store J (by nudging), predicted = F(p(1), p(2)) + J*delta, actual = F(p(1) + delta(1), p(2) + delta(2)), and error = norm(actual - predicted).',
      setup: lines(`p = ${vec([r.int(-3, 3), r.int(-3, 3)])};`, `delta = ${vec([r.int(-3, 3) / 10, r.int(-3, 3) / 10])};`, 'F = @(x, y) [x.*y; x + y.^2];', NUDGE),
      solution: lines('J = zeros(2,2);', 'J(:,1) = (F(p(1) + h, p(2)) - F(p(1) - h, p(2))) / (2*h);', 'J(:,2) = (F(p(1), p(2) + h) - F(p(1), p(2) - h)) / (2*h);', 'predicted = F(p(1), p(2)) + J*delta;', 'actual = F(p(1) + delta(1), p(2) + delta(2));', 'error = norm(actual - predicted);'),
      outputs: [['J', 'The local matrix at p.'], ['predicted', 'F at p plus J times the step.'], ['actual', 'The true value after the step.'], ['error', 'How far the matrix prediction is off.']],
      hints: ['Build J first.', 'The prediction is F(p) + J*delta.', 'error = norm(actual - predicted);'],
    })),
    problem('robot-arm', 'A robot arm\'s Jacobian', 'Transfer', r => ({
      prompt: 'A two-joint arm with lengths L1, L2 puts its hand at F(a, b) = [L1*cos(a) + L2*cos(a + b); L1*sin(a) + L2*sin(a + b)] for joint angles a, b (radians). Store J at (a0, b0) by nudging, and det(J) in reach.',
      setup: lines(`L1 = ${r.int(2, 6)};`, `L2 = ${r.int(1, 5)};`, `a0 = ${r.int(0, 11)}*pi/12;`, `b0 = ${r.int(1, 11)}*pi/12;`, 'F = @(a, b) [L1*cos(a) + L2*cos(a + b); L1*sin(a) + L2*sin(a + b)];', NUDGE),
      solution: lines('J = zeros(2,2);', 'J(:,1) = (F(a0 + h, b0) - F(a0 - h, b0)) / (2*h);', 'J(:,2) = (F(a0, b0 + h) - F(a0, b0 - h)) / (2*h);', 'reach = det(J);'),
      outputs: [['J', 'Column 1: how the hand moves when the shoulder turns. Column 2: the elbow.'], ['reach', 'det J = L1·L2·sin(b0): it vanishes when the arm is straight.']],
      hints: ['Nudge the shoulder angle, then the elbow angle.', 'Each column is a hand velocity per unit of joint turn.', 'reach = det(J);'],
    })),
    problem('straight-arm', 'A stuck pose', 'Transfer', r => ({
      prompt: 'The same arm, fully straight (b0 = 0). Store J at (a0, 0) by nudging, reach = det(J), and stuck = 1 if abs(reach) < 1e-6 (the hand cannot move in some direction), otherwise 0.',
      setup: lines(`L1 = ${r.int(2, 6)};`, `L2 = ${r.int(1, 5)};`, `a0 = ${r.int(0, 23)}*pi/12;`, 'b0 = 0;', 'F = @(a, b) [L1*cos(a) + L2*cos(a + b); L1*sin(a) + L2*sin(a + b)];', NUDGE),
      solution: lines('J = zeros(2,2);', 'J(:,1) = (F(a0 + h, b0) - F(a0 - h, b0)) / (2*h);', 'J(:,2) = (F(a0, b0 + h) - F(a0, b0 - h)) / (2*h);', 'reach = det(J);', 'stuck = 0;', 'if abs(reach) < 1e-6', '  stuck = 1;', 'end'),
      outputs: [['J', 'Both columns point the same way when the arm is straight.'], ['reach', 'A zero determinant: the matrix flattens.'], ['stuck', 'A straight arm cannot move its hand directly away from the shoulder.']],
      hints: ['Build J as usual.', 'Compare abs(det(J)) with a small tolerance.', 'reach = det(J); then an if block sets stuck.'],
    })),
  ],
  'laml-chain-rule': [
    problem('two-links', 'Two links in one dimension', 'Warm-up', r => ({
      prompt: 'g(x) = m*x + c and f(u) = u^2. Store chain = 2*g(x0)*m, the chain-rule rate of f(g(x)) at x0, and nudged, the same rate estimated by nudging x0.',
      setup: lines(`m = ${r.nonzero(-4, 4)};`, `c = ${r.int(-5, 5)};`, `x0 = ${r.int(-4, 4)};`, 'g = @(x) m*x + c;', 'f = @(u) u.^2;', NUDGE),
      solution: lines('chain = 2*g(x0)*m;', 'nudged = (f(g(x0 + h)) - f(g(x0 - h))) / (2*h);'),
      outputs: [['chain', 'Rate of f at g(x0), times the rate of g.'], ['nudged', 'Nudge the input of the whole chain.']],
      hints: ['f changes at 2u per unit of u; g changes at m per unit of x.', 'chain = 2*g(x0)*m;', 'nudged = (f(g(x0 + h)) - f(g(x0 - h))) / (2*h);'],
    })),
    problem('balloon', 'An inflating balloon', 'Warm-up', r => ({
      prompt: 'A balloon\'s radius grows as r(t) = k*t. Its volume is V = 4/3*pi*r^3. Store rate = 4*pi*r(t0)^2 * k, how fast the volume grows at t0.',
      setup: lines(`k = ${r.int(1, 5)};`, `t0 = ${r.int(1, 6)};`, 'r = @(t) k*t;'), solution: 'rate = 4*pi*r(t0)^2 * k;',
      outputs: [['rate', 'Volume per radius (4πr²) times radius per time (k).']],
      hints: ['The two links are time → radius and radius → volume.', 'dV/dr = 4πr² and dr/dt = k.', 'rate = 4*pi*r(t0)^2 * k;'],
    })),
    problem('jacobian-product', 'Multiply the Jacobians', 'Apply', r => {
      const A = [[r.int(-3, 3), r.int(-3, 3)], [r.int(-3, 3), r.int(-3, 3)]]
      return {
        prompt: 'First u = A*x, then H(u) = [u(1)^2; u(1)*u(2)] with Jacobian JH = [2*u(1) 0; u(2) u(1)]. At x0, store u0, JH (at u0) and Jtotal = JH * A.',
        setup: lines(`A = [${A[0].join(' ')}; ${A[1].join(' ')}];`, `x0 = ${vec([r.int(-3, 3), r.int(-3, 3)])};`),
        solution: lines('u0 = A * x0;', 'JH = [2*u0(1) 0; u0(2) u0(1)];', 'Jtotal = JH * A;'),
        outputs: [['u0', 'The first link at x0.'], ['JH', 'The second link\'s Jacobian, at u0.'], ['Jtotal', 'The first link goes on the right.']],
        hints: ['Evaluate the second Jacobian where the chain actually is: at u0.', 'The Jacobian of u = A x is A.', 'Jtotal = JH * A;'],
      }
    }),
    problem('three-links', 'Three links', 'Apply', r => {
      const [a, b, c] = [r.nonzero(-3, 3), r.nonzero(-3, 3), r.nonzero(-3, 3)]
      return {
        prompt: 'Three linear links: y = a*x, z = b*y, w = c*z. Store total = a*b*c, the rate of w with respect to x, and nudged, the same rate by nudging x0 through all three.',
        setup: lines(`a = ${a}; b = ${b}; c = ${c};`, `x0 = ${r.int(-5, 5)};`, 'chain = @(x) c*(b*(a*x));', NUDGE),
        solution: lines('total = a*b*c;', 'nudged = (chain(x0 + h) - chain(x0 - h)) / (2*h);'),
        outputs: [['total', 'Multiply the three rates.'], ['nudged', 'Nudge the input of the whole chain.']],
        hints: ['Each link scales its input by a constant rate.', 'total = a*b*c;', 'nudged = (chain(x0 + h) - chain(x0 - h)) / (2*h);'],
      }
    }),
    problem('gear-train', 'A gear train', 'Transfer', r => {
      const ratios = [r.int(2, 5), r.int(2, 5), r.int(2, 5)]
      return {
        prompt: 'Each pair of gears multiplies speed by its ratio, listed in ratios. The motor turns at motorRpm. Store total = prod(ratios) and outputRpm = motorRpm * total.',
        setup: lines(`ratios = ${vec(ratios)};`, `motorRpm = ${r.int(100, 3000)};`), solution: lines('total = prod(ratios);', 'outputRpm = motorRpm * total;'),
        outputs: [['total', 'Ratios multiply along the chain.'], ['outputRpm', 'The motor speed times the total ratio.']],
        hints: ['prod multiplies every entry of a vector.', 'total = prod(ratios);', 'outputRpm = motorRpm * total;'],
      }
    }),
    problem('thermal-stress', 'From temperature to stress', 'Transfer', r => ({
      prompt: 'A clamped steel rod: strain = alpha * deltaT, and stress = E * strain. Store strainRate = alpha (strain per degree), stressRate = E * alpha (stress per degree), and stress for the temperature rise deltaT.',
      setup: lines(`alpha = ${r.int(10, 14)}e-6;`, `E = ${r.int(190, 210)}e9;`, `deltaT = ${r.int(5, 60)};`), solution: lines('strainRate = alpha;', 'stressRate = E * alpha;', 'stress = stressRate * deltaT;'),
      outputs: [['strainRate', 'How fast strain grows with temperature.'], ['stressRate', 'Chain rule: stress per strain times strain per degree.'], ['stress', 'The rate times the temperature rise.']],
      hints: ['The two links are temperature → strain and strain → stress.', 'Multiply their rates.', 'stressRate = E * alpha; stress = stressRate * deltaT;'],
    })),
  ],
}
