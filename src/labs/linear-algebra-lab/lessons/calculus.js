// "Calculus meets matrices": slope, gradient, Jacobian and chain rule, introduced from scratch for
// someone with basic algebra, then gradient descent and its step-size limit (both rewritten, same ids).
// Derivatives are estimated by nudging inputs, so every formula is checked against a computation.
const t = String.raw
const MODULE = 'Calculus meets matrices'

export const calculus = [
  {
    id: 'laml-slope', module: MODULE, title: 'Slope: zoom in until it looks straight', minutes: 20, level: 'Intermediate',
    why: { title: 'How fast is it changing right now?', story: 'A speedometer shows how fast your position is changing at this instant. An engineer needs to know how quickly a beam bends as the load grows. A machine-learning model needs to know how much its error changes when one weight is nudged. All three are slopes of curves, and calculus is the tool for slopes. The surprise is that, up close, every smooth curve is a straight line, and that is where calculus meets linear algebra.' },
    objective: 'Estimate the slope (derivative) of a function by nudging its input, and use it to predict nearby values with a straight line.',
    prose: [
      'A ball\'s height after t seconds is h(t) = 20t − 5t² metres. Between t = 1 and t = 1.1 it rises from 15 m to 15.95 m: 0.95 m in 0.1 s, an average of 9.5 m/s. Between t = 1 and t = 1.01 the average is 9.95 m/s. Shrink the time step further and the answer settles on 10 m/s.',
      'That settling value is the **derivative** of h at t = 1, written h′(1). On the graph it is the **slope** of the curve at that point. Zoom in close enough and the curve looks like a straight line with that slope.',
      'So near a point a, a smooth curve is almost a line: f(a + Δ) ≈ f(a) + f′(a)·Δ, where Δ (delta) means "a small change". This straight-line stand-in is called the **linear approximation**. It is why linear algebra works on curved problems: zoom in until things are linear.',
      'A computer estimates a slope by nudging both ways: (f(a + h) − f(a − h)) / (2h), for a small h such as 0.0001. A calculus course gives exact rules too; for example, the slope of x² is 2x and the slope of x³ is 3x².',
    ],
    procedure: ['Pick the point a and a small nudge h.', 'Estimate the slope as (f(a + h) − f(a − h)) / (2h).', 'Predict nearby values with f(a) + slope × Δ, and check how good the prediction is.'],
    prediction: { question: 'For f(x) = x², is the slope at x = 3 bigger or smaller than the slope at x = 1?', answer: 'Bigger: 6 versus 2. The parabola gets steeper as x grows; its slope is 2x.' },
    demo: {
      code: t`h = @(t) 20*t - 5*t.^2;
step = 0.0001;
speed = (h(1 + step) - h(1 - step)) / (2*step)
guess = h(1) + speed * 0.2`,
      draw: t`t = linspace(0, 4, 100);
plot(t, h(t))
hold on
plot(t, h(1) + speed*(t - 1))
title('Up close, the curve and its tangent line agree')
xlabel('Time t (s)'); ylabel('Height (m)'); legend('Height h(t)', 'Tangent line at t = 1'); grid on`,
      explain: [{ code: 'h = @(t) 20*t - 5*t.^2;', meaning: 'A function written as a formula: @(t) names the input. The dot in .^ squares each entry, so it also works on lists of times.' }, { code: 'speed = (h(1 + step) - h(1 - step)) / (2*step)', meaning: 'Nudge the time both ways and divide the change in height by the change in time: 10 m/s.' }, { code: 'guess = h(1) + speed * 0.2', meaning: 'Straight-line prediction for t = 1.2: 17 m. The true height is 16.8 m, close because 0.2 s is a small step.' }],
    },
    challenge: {
      prompt: 'f is supplied as a function. Store slope, the centred estimate (f(a + h) - f(a - h)) / (2*h) of its slope at a, and approx = f(a) + slope*0.1, the straight-line prediction for f(a + 0.1).',
      setup: 'f = @(x) x.^3;\na = 2;\nh = 0.0001;',
      starter: 'slope = 0;   % replace 0 with: (f(a + h) - f(a - h)) / (2*h)\napprox = f(a) + slope*0.1;',
      solution: 'slope = (f(a + h) - f(a - h)) / (2*h);\napprox = f(a) + slope*0.1;',
      checks: [{ name: 'slope', expected: 12, tolerance: 1e-6, message: 'Nudge a both ways and divide by 2h. The exact slope of x³ at 2 is 3 × 2² = 12.' }, { name: 'approx', expected: 9.2, tolerance: 1e-6, message: 'f(2) = 8, plus slope × 0.1.' }],
      cases: [{ setup: 'f = @(x) x.^3;\na = 1;\nh = 0.0001;', checks: [{ name: 'slope', expected: 3, tolerance: 1e-6, message: 'A different point on the same curve.' }, { name: 'approx', expected: 1.3, tolerance: 1e-6, message: 'f(1) = 1, plus 3 × 0.1.' }] }],
      hints: ['A slope is a change in output divided by a change in input.', 'Nudge a by +h and by −h; the input changes by 2h in total.', 'slope = (f(a + h) - f(a - h)) / (2*h);'],
      transfer: 'Compare approx with the true f(a + 0.1). Then try a step of 1 instead of 0.1. Why does the straight-line prediction get worse for bigger steps?',
    },
    notation: [
      { tex: t`f'(a) = \lim_{h \to 0} \frac{f(a + h) - f(a)}{h}`, say: 'The derivative: the slope you get as the nudge shrinks towards zero.' },
      { tex: t`f(a + \Delta) \approx f(a) + f'(a)\,\Delta`, say: 'Up close, the function behaves like a straight line.' },
      { tex: t`\frac{d}{dx}\,x^n = n\,x^{n-1}`, say: 'The power rule: the slope of $x^2$ is $2x$, of $x^3$ is $3x^2$.' },
    ],
    quiz: [
      { q: 'What does the derivative $f\'(a)$ measure?', options: ['How fast f changes at a: the slope of its graph there', 'The value of f at a', 'The area under f', 'The average of f'], answer: 0, why: 'It is the rate of change, the slope of the tangent line.' },
      { q: 'f(2) = 5 and f\'(2) = 3. Roughly what is f(2.1)?', options: ['5.3', '5.03', '8', '6.5'], answer: 0, why: 'f(2) + 3 × 0.1 = 5.3.' },
    ],
  },
  {
    id: 'laml-gradient', module: MODULE, title: 'Many inputs: the gradient points uphill', minutes: 20, level: 'Intermediate',
    why: { title: 'Which way is uphill?', story: 'A hiker in fog wants the steepest way down. A heating engineer wants to know which way the temperature rises fastest across a metal plate. A neural network has millions of weights and needs to know which way to nudge all of them at once to reduce its error. With several inputs, the slope becomes a vector: the gradient.' },
    objective: 'Estimate partial derivatives by nudging one input at a time, assemble the gradient, and use it to find the steepest directions.',
    prose: [
      'A hill\'s height is f(x, y) = 10 − x² − 2y², with its summit at (0, 0). Stand at (1, 1). Step a little east (increase x) and the height changes at the rate −2x = −2. Step a little north and it changes at −4y = −4. These one-direction slopes are the **partial derivatives**, written ∂f/∂x and ∂f/∂y.',
      'Stack them into a vector: ∇f = [∂f/∂x; ∂f/∂y] = [−2; −4]. This is the **gradient** (∇ is read "del" or "grad"). It points in the direction of steepest climb, here back towards the summit. Its length says how steep that climb is.',
      'The dot product explains why. The rate of change along a unit direction u is ∇f · u. That is largest when u points the same way as ∇f, zero when u is at right angles to it (walking along a contour line, staying level) and most negative straight opposite: the steepest way down.',
      'To estimate a gradient in code, nudge one input at a time, exactly as for a single slope, and stack the results.',
    ],
    procedure: ['Nudge x alone to get ∂f/∂x; nudge y alone to get ∂f/∂y.', 'Stack them: ∇f = [∂f/∂x; ∂f/∂y] points uphill.', 'The rate along a unit direction u is ∇f · u; go against ∇f to descend fastest.'],
    prediction: { question: 'What is the gradient at the summit (0, 0)?', answer: '[0; 0]. No direction goes up, so the gradient vanishes. That is how a computer recognises a top, a bottom or a flat spot.' },
    demo: {
      code: t`f = @(x, y) 10 - x.^2 - 2*y.^2;
h = 0.0001;
grad = [(f(1 + h, 1) - f(1 - h, 1)) / (2*h); (f(1, 1 + h) - f(1, 1 - h)) / (2*h)]
steepness = norm(grad)`,
      draw: t`t = linspace(0, 2*pi, 100);
plot(3*cos(t), sqrt(9/2)*sin(t))
hold on
plot(sqrt(6)*cos(t), sqrt(3)*sin(t))
plot(sqrt(3)*cos(t), sqrt(3/2)*sin(t))
plot([1 1 + 0.25*grad(1)], [1 1 + 0.25*grad(2)])
title('Contour lines of the hill and the gradient pointing uphill')
xlabel('x'); ylabel('y'); legend('Height 1', 'Height 4', 'Height 7', 'Gradient at (1, 1)'); axis equal; grid on`,
      explain: [{ code: 'f = @(x, y) 10 - x.^2 - 2*y.^2;', meaning: 'A function of two inputs: the height at each map position.' }, { code: 'grad = [(f(1 + h, 1) - f(1 - h, 1)) / (2*h); ...]', meaning: 'Nudge x alone for the first entry, y alone for the second: [−2; −4].' }, { code: 'steepness = norm(grad)', meaning: 'The length of the gradient: how steep the steepest direction is, about 4.47.' }],
    },
    challenge: {
      prompt: 'For the hill f at the point (px, py), store grad (estimate each partial derivative by nudging that input by h) and downhill = -grad / norm(grad), the unit direction of steepest descent.',
      setup: 'f = @(x, y) 4 - x.^2 - y.^2 + x.*y;\npx = 1;\npy = -1;\nh = 0.0001;',
      starter: 'grad = [0; 0];   % estimate both partial derivatives\ndownhill = [1; 0];   % replace with: -grad / norm(grad)',
      solution: 'grad = [(f(px + h, py) - f(px - h, py)) / (2*h); (f(px, py + h) - f(px, py - h)) / (2*h)];\ndownhill = -grad / norm(grad);',
      checks: [{ name: 'grad', expected: [-3, 3], tolerance: 1e-6, message: 'Nudge x alone, then y alone, centred at (px, py).' }, { name: 'downhill', expected: [1 / Math.SQRT2, -1 / Math.SQRT2], tolerance: 1e-6, message: 'Point against the gradient and divide by its length.' }],
      cases: [{ setup: 'f = @(x, y) 4 - x.^2 - y.^2 + x.*y;\npx = 2;\npy = 1;\nh = 0.0001;', checks: [{ name: 'grad', expected: [-3, 0], tolerance: 1e-6, message: 'A different point on the same hill.' }, { name: 'downhill', expected: [1, 0], tolerance: 1e-6, message: 'Here the steepest way down is due east.' }] }],
      hints: ['Each entry of the gradient nudges only one input.', 'The first entry is (f(px + h, py) - f(px - h, py)) / (2*h).', 'Then downhill = -grad / norm(grad);'],
      transfer: 'Find a unit direction along which the height does not change at (px, py). Check that its dot product with grad is zero, and explain what it has to do with contour lines.',
    },
    notation: [
      { tex: t`\nabla f = \begin{bmatrix} \partial f/\partial x \\ \partial f/\partial y \end{bmatrix}`, say: 'The gradient: one slope per input, stacked into a vector.' },
      { tex: t`D_{\mathbf u} f = \nabla f \cdot \mathbf u = \|\nabla f\| \cos\theta`, say: 'The rate of change along a unit direction $\\mathbf u$: largest at $\\theta = 0$, zero at $90°$.' },
    ],
    quiz: [
      { q: 'In which direction does the gradient point?', options: ['Steepest increase', 'Steepest decrease', 'Along a contour line', 'Towards the origin always'], answer: 0, why: 'The gradient points uphill; its negative points downhill.' },
      { q: 'You walk along a contour line. What is the rate of change of height?', options: ['Zero: your direction is at right angles to the gradient', 'The length of the gradient', 'Negative', 'It cannot be known'], answer: 0, why: 'A contour line stays at one height; the dot product with the gradient is zero.' },
    ],
  },
  {
    id: 'laml-jacobian', module: MODULE, title: 'A curved map looks like a matrix up close', minutes: 25, level: 'Intermediate',
    why: { title: 'Linear algebra for curved problems', story: 'Real maps are rarely linear. A robot arm turns joint angles into a hand position through sines and cosines; a world map bends the globe; a deforming material stretches some parts more than others. Zoom in on any smooth map and it behaves like a matrix. That matrix, the Jacobian, lets every tool from Stage 2 work on curved problems, one small region at a time.' },
    objective: 'Build the Jacobian of a map with two inputs and two outputs by nudging each input, and use it for local predictions and area change.',
    prose: [
      'Take the map F(x, y) = [x²; x·y]. It is not a matrix: it squares and multiplies. Near the point (2, 1), nudge x by a small amount and the output moves by about [2x; y] = [4; 1] times that amount. Nudge y instead and the output moves by about [0; x] = [0; 2] times that amount.',
      'Those two "output change per input nudge" vectors are the columns of the **Jacobian** matrix, J = [4 0; 1 2]. Near (2, 1), F(p + Δ) ≈ F(p) + J·Δ: a small input step Δ becomes the output step J·Δ. It is the slope idea again, with a matrix instead of a number.',
      'Everything from Stage 2 now applies locally. Column j of J is where the j-th input direction lands. det J is how much a tiny area grows: here det J = 8. Where det J = 0, the map squashes small areas flat.',
      'In code, estimate each column by nudging one input: column 1 is (F(x + h, y) − F(x − h, y)) / (2h), and column 2 nudges y.',
    ],
    procedure: ['Nudge input 1 alone: the change in output divided by the nudge is column 1.', 'Repeat for each input to fill the other columns.', 'Use F(p) + J·Δ for nearby points, and det J for the local area change.'],
    prediction: { question: 'For a map that is already a matrix, F(x) = A x, what is its Jacobian?', answer: 'A itself, at every point. A linear map looks the same at every zoom level.' },
    demo: {
      code: t`F = @(x, y) [x.^2; x.*y];
h = 0.0001;
J = zeros(2,2);
J(:,1) = (F(2 + h, 1) - F(2 - h, 1)) / (2*h);
J(:,2) = (F(2, 1 + h) - F(2, 1 - h)) / (2*h);
disp(J)
areaGrowth = det(J)`,
      draw: t`s = 0.3;
sq = [0 s s 0 0; 0 0 s s 0];
img = zeros(2, 5);
for k = 1:5
  img(:,k) = F(2 + sq(1,k), 1 + sq(2,k));
end
lin = J * sq;
plot(img(1,:), img(2,:))
hold on
plot(4 + lin(1,:), 2 + lin(2,:))
title('Near (2, 1) the curved map and its Jacobian move a small square almost alike')
xlabel('Output 1'); ylabel('Output 2'); legend('True image of the square', 'Jacobian prediction'); grid on`,
      explain: [{ code: 'F = @(x, y) [x.^2; x.*y];', meaning: 'A map with two inputs and two outputs. It curves, so it is not a matrix.' }, { code: 'J(:,1) = (F(2 + h, 1) - F(2 - h, 1)) / (2*h);', meaning: 'Nudge x alone: how the output moves per unit of x. This fills column 1 with [4; 1].' }, { code: 'areaGrowth = det(J)', meaning: 'Small areas near (2, 1) grow about 8 times.' }],
    },
    challenge: {
      prompt: 'The polar map F(r, t) = [r*cos(t); r*sin(t)] turns a distance and an angle into a position. Estimate its Jacobian J at (r0, t0) by nudging each input, and store areaGrowth = det(J).',
      setup: 'F = @(r, t) [r*cos(t); r*sin(t)];\nr0 = 2;\nt0 = pi/6;\nh = 0.0001;',
      starter: 'J = zeros(2,2);\nJ(:,1) = (F(r0 + h, t0) - F(r0 - h, t0)) / (2*h);\nJ(:,2) = [0; 0];   % nudge t the same way\nareaGrowth = det(J);',
      solution: 'J = zeros(2,2);\nJ(:,1) = (F(r0 + h, t0) - F(r0 - h, t0)) / (2*h);\nJ(:,2) = (F(r0, t0 + h) - F(r0, t0 - h)) / (2*h);\nareaGrowth = det(J);',
      checks: [{ name: 'J', expected: [[Math.cos(Math.PI / 6), -2 * Math.sin(Math.PI / 6)], [Math.sin(Math.PI / 6), 2 * Math.cos(Math.PI / 6)]], tolerance: 1e-6, message: 'Column 2 nudges the angle t.' }, { name: 'areaGrowth', expected: 2, tolerance: 1e-6, message: 'For the polar map, det J equals the radius.' }],
      cases: [{ setup: 'F = @(r, t) [r*cos(t); r*sin(t)];\nr0 = 3;\nt0 = 0;\nh = 0.0001;', checks: [{ name: 'J', expected: [[1, 0], [0, 3]], tolerance: 1e-6, message: 'At angle 0, changing r moves east and changing t moves north.' }, { name: 'areaGrowth', expected: 3, tolerance: 1e-6, message: 'det J is again the radius.' }] }],
      hints: ['Only the second column is missing.', 'Nudge t by +h and −h, keeping r at r0.', 'J(:,2) = (F(r0, t0 + h) - F(r0, t0 - h)) / (2*h);'],
      transfer: 'Explain why det J = r for the polar map, using the picture of a small patch of a circle: a step dr outwards and a step dt round the circle.',
    },
    notation: [
      { tex: t`J = \begin{bmatrix} \partial F_1/\partial x & \partial F_1/\partial y \\ \partial F_2/\partial x & \partial F_2/\partial y \end{bmatrix}`, say: 'Column $j$: how the outputs change when input $j$ is nudged.' },
      { tex: t`F(\mathbf p + \boldsymbol\Delta) \approx F(\mathbf p) + J\,\boldsymbol\Delta`, say: 'Up close, the map behaves like the matrix $J$.' },
      { tex: t`\text{area near } \mathbf p \text{ grows by } |\det J|`, say: 'The determinant of the Jacobian is the local area factor.' },
    ],
    quiz: [
      { q: 'What does column 1 of a Jacobian describe?', options: ['How the outputs change when input 1 is nudged', 'The first output\'s value', 'The first input\'s value', 'The average change'], answer: 0, why: 'Each column records the effect of nudging one input.' },
      { q: 'At some point det J = 0. What happens to tiny areas there?', options: ['They are squashed flat', 'They double', 'They are unchanged', 'They are flipped'], answer: 0, why: 'A zero determinant means the local matrix flattens the plane.' },
    ],
  },
  {
    id: 'laml-chain-rule', module: MODULE, title: 'The chain rule: rates multiply', minutes: 20, level: 'Intermediate',
    why: { title: 'Changes passed along a chain', story: 'Turn a car\'s steering wheel and the front wheels turn, which turns the car. Heat a rod and it expands, which strains the beam it pushes on. A neural network passes numbers through layer after layer. How much does the end change when the start changes? Multiply the rates along the chain. With many inputs, multiply the Jacobians: it is "one move after another" from Stage 2 again.' },
    objective: 'Find the rate of a chain of functions by multiplying the rates of its links, and multiply Jacobians in the right order.',
    prose: [
      'A balloon\'s radius grows with time, r = 2t, and its volume depends on its radius, V = (4/3)πr³. How fast does the volume grow at t = 1? The volume changes at 4πr² = 16π per unit of radius (at r = 2), and the radius changes at 2 per second. Multiply: 16π × 2 = 32π ≈ 100.5 per second.',
      'This is the **chain rule**: the rate of a chain is the product of the rates of its links. Each link\'s rate is measured at the point where the chain actually is.',
      'With several inputs and outputs, each link\'s rates form a Jacobian, and the chain\'s Jacobian is their product: J_total = J_second · J_first. The first link goes on the right, exactly as when moves were combined in Stage 2.',
      'Backpropagation, the method that trains neural networks, is this rule applied through many layers, multiplying Jacobians from the output backwards.',
    ],
    procedure: ['Break the process into links, each with its own input and output.', 'Find each link\'s rate (or Jacobian) at the current point.', 'Multiply them, last link on the left, and check by nudging the whole chain.'],
    prediction: { question: 'One link of a chain has rate 0 at the current point. What is the rate of the whole chain?', answer: '0. A small change cannot get through that link. In neural networks this is called a vanishing gradient.' },
    demo: {
      code: t`r = @(t) 2*t;
V = @(rad) 4/3*pi*rad.^3;
chainRate = (4*pi*r(1)^2) * 2
h = 0.0001;
nudgeRate = (V(r(1 + h)) - V(r(1 - h))) / (2*h)`,
      draw: t`t = linspace(0, 1.5, 60);
plot(t, V(r(t)))
hold on
plot(t, V(r(1)) + chainRate*(t - 1))
title('The chain rule gives the slope of the combined curve')
xlabel('Time t'); ylabel('Volume'); legend('Volume over time', 'Slope from the chain rule'); grid on`,
      explain: [{ code: 'chainRate = (4*pi*r(1)^2) * 2', meaning: 'Volume per radius at r = 2, times radius per second: 32π ≈ 100.5.' }, { code: 'nudgeRate = (V(r(1 + h)) - V(r(1 - h))) / (2*h)', meaning: 'Nudge the time and push it through both links: the same answer, checking the chain rule.' }, { code: 'V = @(rad) 4/3*pi*rad.^3;', meaning: 'The second link: volume from radius.' }],
    },
    challenge: {
      prompt: 'A chain of two links: first u = A * x (a matrix), then H(u) = [u(1)^2; u(1)*u(2)], whose Jacobian at u0 is JH = [2*u0(1) 0; u0(2) u0(1)]. At x0, store u0, JH, and Jtotal, the Jacobian of the whole chain.',
      setup: 'A = [1 2; 0 1];\nx0 = [1; 1];',
      starter: 'u0 = A * x0;\nJH = [2*u0(1) 0; u0(2) u0(1)];\nJtotal = A * JH;   % check the order',
      solution: 'u0 = A * x0;\nJH = [2*u0(1) 0; u0(2) u0(1)];\nJtotal = JH * A;',
      checks: [{ name: 'u0', expected: [3, 1], tolerance: 1e-9, message: 'The first link applied to x0.' }, { name: 'JH', expected: [[6, 0], [1, 3]], tolerance: 1e-9, message: 'The second link\'s Jacobian, evaluated at u0.' }, { name: 'Jtotal', expected: [[6, 12], [1, 5]], tolerance: 1e-9, message: 'The first link (A) goes on the right: JH * A.' }],
      cases: [{ setup: 'A = [1 2; 0 1];\nx0 = [0; 2];', checks: [{ name: 'Jtotal', expected: [[8, 16], [2, 8]], tolerance: 1e-9, message: 'A different point: JH changes, A does not.' }] }],
      hints: ['The Jacobian of u = A * x is A itself.', 'Like combined moves, the link that acts first goes on the right.', 'Jtotal = JH * A;'],
      transfer: 'Check Jtotal by nudging: estimate how H(A*x) changes when x(1) is nudged, and compare with the first column of Jtotal.',
    },
    notation: [
      { tex: t`\frac{dV}{dt} = \frac{dV}{dr}\cdot\frac{dr}{dt}`, say: 'The chain rule: rates multiply along the chain.' },
      { tex: t`J_{H\circ G}(\mathbf x) = J_H\big(G(\mathbf x)\big)\; J_G(\mathbf x)`, say: 'For maps, Jacobians multiply, with the first link on the right.' },
    ],
    quiz: [
      { q: 'y changes 3 times as fast as u, and u changes 4 times as fast as x. How fast does y change with x?', options: ['12 times as fast', '7 times as fast', '0.75 times as fast', '1 times as fast'], answer: 0, why: 'Rates multiply: 3 × 4.' },
      { q: 'Which order gives the Jacobian of "first G, then H"?', options: ['$J_H J_G$', '$J_G J_H$', '$J_G + J_H$', 'Either order'], answer: 0, why: 'As with combined moves, the first map goes on the right.' },
    ],
  },
  {
    id: 'laml-vectorized-gradient', module: MODULE, title: 'Gradient descent: walk downhill', minutes: 20, level: 'Intermediate',
    why: { title: 'Finding the bottom without a map', story: 'Fitting a line to data, training a neural network, tuning a controller, finding the shape of a hanging cable that stores the least energy: each one is "find the lowest point of a function". Gradient descent does it the way a hiker in fog would: feel which way is downhill, take a small step, and repeat.' },
    objective: 'Minimise a function by repeatedly stepping against its gradient, and use it to fit a line to data with one line of matrix code.',
    prose: [
      'Start with one unknown. To find the lowest point of L(w) = (w − 3)², start at w = 0. The slope there is L′(w) = 2(w − 3) = −6; negative means downhill is to the right. Step against the slope: w ← w − η·L′(w). With step size η = 0.1, the new w is 0.6.',
      'Repeat, and w creeps towards 3, where the slope is 0 and the steps stop by themselves. The step size η (the Greek letter eta) is called the **learning rate**.',
      'With many unknowns, step against the gradient: w ← w − η∇L. To fit a line y ≈ w₁ + w₂x to m data points, the error is L(w) = ‖Xw − y‖² / (2m). Here X has a column of ones and a column of inputs. The gradient works out to ∇L = Xᵀ(Xw − y)/m: one line of matrix code.',
      'Each step moves every weight at once, in the direction that reduces the error fastest. The least-squares lesson solved this problem in one step; gradient descent reaches the same answer by walking, and walking also works for problems that have no one-step solution.',
    ],
    procedure: ['Write the error L(w) and its gradient.', 'Choose a starting w and a small learning rate η.', 'Repeat w ← w − η∇L, checking that the error goes down.'],
    prediction: { question: 'At the lowest point, how big is the step η∇L?', answer: 'Zero. The gradient is zero at the bottom, so the steps stop by themselves.' },
    demo: {
      code: t`X = [1 0; 1 1; 1 2; 1 3];
y = [1; 3; 5; 7];
w = [0; 0];
for k = 1:200
  w = w - 0.1 * transpose(X) * (X*w - y) / 4;
end
disp(w)`,
      draw: t`plot(X(:,2), y)
hold on
plot(X(:,2), X*w)
title('After 200 downhill steps the line fits the points')
xlabel('x'); ylabel('y'); legend('Data', 'Fitted line'); grid on`,
      explain: [{ code: 'w = [0; 0];', meaning: 'Start anywhere: intercept 0 and slope 0.' }, { code: 'w = w - 0.1 * transpose(X) * (X*w - y) / 4;', meaning: 'One downhill step: the gradient Xᵀ(Xw − y)/m with m = 4 points, times the learning rate 0.1.' }, { code: 'for k = 1:200', meaning: 'Repeat the step 200 times. w approaches [1; 2], the line y = 1 + 2x.' }],
    },
    challenge: {
      prompt: 'Take one gradient descent step for a line fit. Store grad = transpose(X)*(X*w - y)/m and updated = w - eta*grad.',
      setup: 'X = [1 0; 1 1; 1 2];\ny = [2; 4; 6];\nw = [0; 1];\neta = 0.1;\nm = 3;',
      starter: 'grad = [0; 0];   % replace with: transpose(X)*(X*w - y)/m\nupdated = w - eta*grad;',
      solution: 'grad = transpose(X)*(X*w - y)/m;\nupdated = w - eta*grad;',
      checks: [{ name: 'grad', expected: [-3, -11 / 3], tolerance: 1e-6, message: 'The residual is X*w - y; multiply by the transpose of X and divide by m.' }, { name: 'updated', expected: [0.3, 1 + 1.1 / 3], tolerance: 1e-6, message: 'Step against the gradient.' }],
      cases: [{ setup: 'X = [1 0; 1 1; 1 2];\ny = [2; 4; 6];\nw = [1; 1];\neta = 0.1;\nm = 3;', checks: [{ name: 'grad', expected: [-2, -8 / 3], tolerance: 1e-6, message: 'A different starting point.' }] }],
      hints: ['First find how far each prediction is off: X*w - y.', 'The gradient is transpose(X) times that, divided by m.', 'grad = transpose(X)*(X*w - y)/m; updated = w - eta*grad;'],
      transfer: 'Put the step inside a loop of 100 steps and compare the result with X \\ y from the least-squares lesson. Why do they agree?',
    },
  },
  {
    id: 'laml-descent-convergence', module: MODULE, title: 'Step size: when descent works and when it explodes', minutes: 20, level: 'Intermediate',
    why: { title: 'Too careful or too bold', story: 'Train a model with too small a learning rate and it takes forever; too large and the error explodes into nonsense. Engineers tuning a controller face the same trade-off. Linear algebra gives the exact safe range: it depends on the steepest curvature of the bowl, which is an eigenvalue.' },
    objective: 'Relate the learning rate to the curvature of a bowl, predict convergence, zig-zag or explosion, and find the safe range.',
    prose: [
      'Take the bowl L(w) = ½·c·w², whose curvature (steepness of its sides) is c. Its slope is c·w, so one step gives w ← w − η·c·w = (1 − ηc)·w. Every step multiplies w by the same factor, 1 − ηc.',
      'If that factor lies between −1 and 1, w shrinks towards 0: success. Otherwise w grows with every step: explosion. So we need |1 − ηc| < 1, which means 0 < η < 2/c. Steeper bowls need smaller steps.',
      'A factor between −1 and 0 still converges, but w changes sign every step: the zig-zag you can see in the playground. A step of exactly η = 1/c lands at the bottom in one step.',
      'A bowl in several directions, L(w) = ½ wᵀHw, has its own curvature λ along each special direction of H; these are its eigenvalues, met properly in a later module. The steepest one sets the limit: η < 2/λ_max.',
    ],
    procedure: ['Find the curvature c, or the largest eigenvalue of H.', 'Choose 0 < η < 2/c; η = 1/c is fastest for a single bowl.', 'Watch the error: a steady decrease is good, zig-zag means η is above 1/c, and growth means η is too big.'],
    prediction: { question: 'With curvatures 2 and 6 and η = 0.25, which direction zig-zags?', answer: 'The curvature-6 direction: its factor is 1 − 0.25×6 = −0.5, which alternates sign while shrinking. The curvature-2 direction has factor 0.5.' },
    demo: {
      code: t`c = 4;
rates = [0.1 0.4 0.6];
w = [1 1 1];
for k = 1:10
  w = w - rates .* c .* w;
end
disp(w)`,
      draw: t`history = zeros(3, 11);
history(:,1) = [1; 1; 1];
for k = 1:10
  history(:,k+1) = history(:,k) - transpose(rates) .* c .* history(:,k);
end
plot(0:10, history(1,:))
hold on
plot(0:10, history(2,:))
plot(0:10, history(3,:))
title('Small steps creep, medium steps zig-zag, big steps explode')
xlabel('Step'); ylabel('w'); legend('eta = 0.1', 'eta = 0.4', 'eta = 0.6'); grid on`,
      explain: [{ code: 'rates = [0.1 0.4 0.6];', meaning: 'Three learning rates tried side by side. The safe limit is 2/c = 0.5.' }, { code: 'w = w - rates .* c .* w;', meaning: 'One step for each rate at once: each w is multiplied by 1 − η·c.' }, { code: 'disp(w)', meaning: 'After 10 steps: two are near 0, and the one with η = 0.6 has grown to about 29.' }],
    },
    challenge: {
      prompt: 'H is a bowl with the curvatures listed in curvatures. Store limit = 2/max(curvatures), then run 5 steps of w = w - eta*(H*w) from w0 and store finalW.',
      setup: 'H = [2 0; 0 8];\ncurvatures = [2; 8];\nw0 = [1; 1];\neta = 0.2;',
      starter: 'limit = 0;   % replace with: 2/max(curvatures)\nfinalW = w0;   % replace with the result of 5 steps',
      solution: 'limit = 2/max(curvatures);\nw = w0;\nfor k = 1:5\n  w = w - eta*(H*w);\nend\nfinalW = w;',
      checks: [{ name: 'limit', expected: 0.25, tolerance: 1e-9, message: 'The steepest curvature sets the limit: 2/8.' }, { name: 'finalW', expected: [0.6 ** 5, (-0.6) ** 5], tolerance: 1e-9, message: 'Each step multiplies the entries by 1 − 0.2×2 = 0.6 and 1 − 0.2×8 = −0.6.' }],
      cases: [{ setup: 'H = [2 0; 0 8];\ncurvatures = [2; 8];\nw0 = [1; 1];\neta = 0.1;', checks: [{ name: 'finalW', expected: [0.8 ** 5, 0.2 ** 5], tolerance: 1e-9, message: 'A smaller learning rate: factors 0.8 and 0.2.' }] }],
      hints: ['Only the largest curvature matters for the limit.', 'Repeat the step in a for loop: w = w - eta*(H*w);', 'limit = 2/max(curvatures); then loop 5 times and store finalW = w;'],
      transfer: 'Find the learning rate that makes the slower direction (curvature 2) shrink as fast as possible without the other one exploding. Why does one learning rate have to compromise between them?',
    },
  },
]
