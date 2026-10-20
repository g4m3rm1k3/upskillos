// Optional track: "Physics". Ray optics with 2 × 2 matrices, Lorentz boosts in special relativity,
// a quantum particle in a box as an eigenvalue problem, and a double well whose split levels explain
// tunnelling. All matrices are real, so nothing here needs complex numbers.
// eig lists the eigenvalues of a symmetric matrix from smallest to largest, as MATLAB does; the
// lessons rely on that order. Each lesson carries its own why, notation, quiz, uses and angles.
const t = String.raw
const PHYS = 'Physics'

const KINETIC = t`h = L/(N + 1);
T = zeros(N, N);
for k = 1:N
  T(k,k) = 2;
  if k > 1
    T(k,k-1) = -1;
  end
  if k < N
    T(k,k+1) = -1;
  end
end
H = T/(2*h^2);`

const boxLevel = (N, n) => 2 * (N + 1) ** 2 * Math.sin(n * Math.PI / (2 * (N + 1))) ** 2
const g995 = 1 / Math.sqrt(1 - 0.995 ** 2)

export const physicsLessons = [
  {
    id: 'laml-phys-optics', module: PHYS, title: 'Ray optics: lenses are 2 × 2 matrices', minutes: 25, level: 'Intermediate',
    why: { title: 'A whole camera lens in one matrix', story: 'A phone camera lens has six or seven pieces of glass, a microscope more, and a laser bounces between two mirrors millions of times. Tracing every ray through every surface by hand is hopeless. But near the axis, each gap and each lens does something linear to a ray: it changes its height and its angle by fixed amounts. So each piece is a 2 × 2 matrix, a whole instrument is their product, and four numbers tell you where it focuses. In 1966 Herwig Kogelnik and Tingye Li used these matrices to decide which laser mirror layouts keep the light trapped, and lens designers still start with them.' },
    objective: 'Describe a ray by its height and angle, write gaps and thin lenses as 2 × 2 matrices, multiply them in the right order, and find where an image forms.',
    prose: [
      'Follow a ray of light travelling left to right near a central axis. At any plane it has a height y above the axis and an angle a (in radians, small). Put them in a vector: ray = [y; a].',
      'A gap of length d leaves the angle alone and raises the height by d·a. As a matrix: T = [1 d; 0 1]. A thin lens of focal length f leaves the height alone and bends the angle by −y/f, so rays above the axis turn down: Lm = [1 0; −1/f 1].',
      'A ray that crosses a gap, then a lens, then another gap comes out as T2 * Lm * T1 * ray. The first element the light meets is on the right, next to the ray, because it acts first. Multiply the matrices once and you have the whole system: S = T2 * Lm * T1, four numbers often called A, B, C, D.',
      'Each entry has a meaning. B = S(1,2) is how much the final height depends on the starting angle. If B = 0, every ray leaving one point arrives at the same height, whatever its angle: an **image** forms. Then A = S(1,1) is the magnification. C = S(2,1) = −1/f for the system as a whole, so it gives the focal length of a lens made of many pieces.',
      'In air, every gap and lens matrix has determinant 1, so every product does too. That is a quick check on any calculation, and it says something physical: light squeezed to a smaller height must spread over more angles.',
    ],
    procedure: ['Write each gap as [1 d; 0 1] and each thin lens as [1 0; −1/f 1].', 'Multiply them with the first element the light meets on the right: S = (last) * … * (first).', 'Read S: B = 0 means an image, A is the magnification, C = −1/f for the whole system, and det(S) = 1.'],
    prediction: { question: 'An object sits 30 cm in front of a lens with focal length 10 cm. Where does the image form, and is it upright?', answer: 'At 15 cm behind the lens, since 1/30 + 1/15 = 1/10. It is upside down and half the size: the magnification is −15/30 = −0.5.' },
    demo: {
      code: t`f = 0.1;                 % focal length (m)
u = 0.3;                 % object to lens (m)
v = 0.15;                % lens to image (m)
T1 = [1 u; 0 1];
Lm = [1 0; -1/f 1];
T2 = [1 v; 0 1];
S = T2*Lm*T1             % the whole system
magnification = S(1,1)
check = det(S)`,
      draw: t`y0 = 0.02;               % a point 2 cm above the axis
for a = [-0.15 -0.05 0.05 0.12]
  ray = [y0; a];
  atLens = T1*ray;
  atImage = S*ray;
  plot([0 u u+v], [y0 atLens(1) atImage(1)])
  hold on
end
title('Rays from one point meet again at the image')
xlabel('Distance along the axis (m)'); ylabel('Height (m)'); grid on`,
      explain: [{ code: 'Lm = [1 0; -1/f 1];', meaning: 'A lens bends each ray by −height/f: higher rays bend more.' }, { code: 'S = T2*Lm*T1', meaning: '[−0.5 0; −10 −2]. B = 0: rays from one point meet again, so an image forms.' }, { code: 'magnification = S(1,1)', meaning: '−0.5: the image is upside down and half the size.' }, { code: 'check = det(S)', meaning: '1, as for every combination of gaps and lenses in air.' }],
    },
    derive: {
      claim: t`Find where the image of a lens forms: derive $\dfrac1u + \dfrac1v = \dfrac1f$ from the ray matrices.`,
      given: t`The object is a distance $u$ in front of a lens of focal length $f$, and we look a distance $v$ behind it. The system is $S = \begin{bmatrix} 1 & v \\ 0 & 1 \end{bmatrix}\begin{bmatrix} 1 & 0 \\ -1/f & 1 \end{bmatrix}\begin{bmatrix} 1 & u \\ 0 & 1 \end{bmatrix}$.`,
      steps: [
        { ask: t`First multiply the lens by the first gap. What is $\begin{bmatrix} 1 & 0 \\ -1/f & 1 \end{bmatrix}\begin{bmatrix} 1 & u \\ 0 & 1 \end{bmatrix}$?`, options: [t`$\begin{bmatrix} 1 & u \\ -1/f & 1 - u/f \end{bmatrix}$`, t`$\begin{bmatrix} 1 & u \\ -1/f & 1 \end{bmatrix}$`, t`$\begin{bmatrix} 1 - u/f & u \\ -1/f & 1 \end{bmatrix}$`], answer: 0, why: t`Row 2 times column 2: $(-1/f)\cdot u + 1\cdot 1 = 1 - u/f$.` },
        { ask: t`Now apply the second gap. What is the top-right entry $B$ of $S$?`, options: [t`$B = u + v\,(1 - u/f)$`, t`$B = u + v$`, t`$B = v\,(1 - u/f)$`], answer: 0, why: t`Row 1 of the gap is $[1 \;\; v]$; dot it with the column $[u;\; 1 - u/f]$.` },
        { ask: t`An image needs $B = 0$. Expand $u + v - uv/f = 0$ and divide by $uv$. What do you get?`, options: [t`$\dfrac1v + \dfrac1u - \dfrac1f = 0$`, t`$u + v = f$`, t`$\dfrac{1}{uv} = \dfrac1f$`], answer: 0, why: t`$u/(uv) = 1/v$, $v/(uv) = 1/u$ and $(uv/f)/(uv) = 1/f$.` },
      ],
      conclusion: t`This is the thin lens equation, found by asking one matrix entry to vanish. With the image in place, $A = 1 - v/f = -v/u$ is the magnification. The same recipe, a product of matrices and one condition on an entry, works for a lens of any number of pieces.`,
    },
    challenge: {
      prompt: 'A telescope has an objective lens of focal length f1, then a gap d, then an eyepiece of focal length f2. Light meets the objective first. Store the system matrix S and mag = S(2,2), the angular magnification.',
      setup: 'f1 = 0.2;\nf2 = 0.05;\nd = 0.25;',
      starter: 'L1 = [1 0; -1/f1 1];\nT = [1 d; 0 1];\nL2 = [1 0; -1/f2 1];\nS = L1*T*L2;   % check the order\nmag = S(2,2);',
      solution: 'L1 = [1 0; -1/f1 1];\nT = [1 d; 0 1];\nL2 = [1 0; -1/f2 1];\nS = L2*T*L1;\nmag = S(2,2);',
      checks: [{ name: 'S', expected: [[-0.25, 0.25], [0, -4]], tolerance: 1e-9, message: 'The first lens the light meets goes on the right: S = L2*T*L1.' }, { name: 'mag', expected: -4, tolerance: 1e-9, message: 'Angles come out 4 times larger (and the image is upside down): −f1/f2.' }],
      cases: [{ setup: 'f1 = 0.3;\nf2 = 0.1;\nd = 0.4;', checks: [{ name: 'S', expected: [[-1 / 3, 0.4], [0, -3]], tolerance: 1e-9, message: 'A different telescope, built the same way.' }, { name: 'mag', expected: -3, tolerance: 1e-9, message: '−f1/f2 = −3.' }] }],
      hints: ['The starter multiplies in the wrong order.', 'The light meets L1 first, so L1 goes on the right, next to the ray.', 'S = L2*T*L1;'],
      transfer: 'S(2,1) is 0 here, so the telescope has no focal length of its own: parallel rays come out parallel. Change d slightly and compute −1/S(2,1). What happens to the system\'s focal length as d approaches f1 + f2?',
    },
    notation: [
      { tex: t`\begin{bmatrix} y \\ a \end{bmatrix}, \qquad T = \begin{bmatrix} 1 & d \\ 0 & 1 \end{bmatrix}, \qquad L = \begin{bmatrix} 1 & 0 \\ -1/f & 1 \end{bmatrix}`, say: 'A ray, a gap and a thin lens.' },
      { tex: t`S = \begin{bmatrix} A & B \\ C & D \end{bmatrix}, \qquad B = 0 \text{ (image)}, \quad C = -\frac{1}{f_{\text{system}}}, \quad \det S = 1`, say: 'What the four numbers of a system say.' },
    ],
    quiz: [
      { q: 'Light passes gap T1, then lens L, then gap T2. Which product describes the system?', options: ['T2*L*T1', 'T1*L*T2', 'L*T1*T2', 'T1*T2*L'], answer: 0, why: 'The first element the light meets acts first, so it sits next to the ray, on the right.' },
      { q: 'A system matrix has B = S(1,2) = 0. What does that mean?', options: ['Rays from one point arrive at one point: an image forms', 'The system has no lenses', 'The rays come out parallel', 'Nothing gets through'], answer: 0, why: 'The final height no longer depends on the starting angle.' },
    ],
    uses: [
      { who: 'physics', title: 'Laser cavities', story: 'A laser\'s two mirrors are lenses with a gap between them. The light stays trapped only if the round-trip matrix has |(A + D)/2| < 1, the stability condition Kogelnik and Li published in 1966.' },
      { who: 'general', title: 'Glasses and cameras', story: 'An optician\'s prescription in dioptres is 1/f in metres. Stacking your lens and your eye is a matrix product, which is why powers in dioptres simply add for thin lenses close together.' },
      { who: 'ee', title: 'Fibre and beam optics', story: 'Engineers coupling a laser into an optical fibre chain together gap and lens matrices to match the beam\'s size and angle to what the fibre accepts.' },
      { who: 'cs', title: 'Ray tracers', story: 'Graphics and lens-design programs trace rays exactly through curved glass, but they start from the matrix version to place the lenses before refining.' },
      { who: 'mech', title: 'Particle accelerators', story: 'Magnets focus particle beams the way lenses focus light, and accelerator designers chain the same kind of 2 × 2 transfer matrices around the ring.' },
    ],
    angles: [
      { title: 'Why the order is right to left', body: 'The ray is a column on the right. The first element multiplies it first: $T_1\\mathbf r$. The next element multiplies that result: $L(T_1\\mathbf r)$. Writing out the brackets gives $L\\,T_1\\,\\mathbf r$, so each new element joins on the left. It is the same rule as composing moves earlier in the lab.' },
      { title: 'Determinant 1 as a conservation law', body: 'A bundle of rays covers some area in the (height, angle) plane. A matrix with determinant 1 keeps that area. Squeeze a beam to a smaller spot and its angles must spread: no lens can focus light to a point with no spread at all.' },
    ],
  },
  {
    id: 'laml-phys-lorentz', module: PHYS, title: 'Special relativity: a boost is a matrix', minutes: 30, level: 'Advanced',
    why: { title: 'Muons that should not reach the ground', story: 'Cosmic rays hitting the upper atmosphere make muons, particles that live about 2.2 millionths of a second. Even at nearly the speed of light, that is time to travel only about 660 metres, yet they are caught at sea level, 10 kilometres or more below. In 1941 Bruno Rossi and David Hall measured how many survive and confirmed Einstein\'s 1905 explanation: for the moving muon, time runs slow. In 1908 Hermann Minkowski showed that the change between two observers moving at a steady speed is a matrix acting on (time, position): a Lorentz boost. GPS satellites correct their clocks for the same effect every day.' },
    objective: 'Write an event as a vector, apply a Lorentz boost, show that the interval t² − x² is unchanged, and find the velocity-addition rule by multiplying two boosts.',
    prose: [
      'An **event** is something that happens at a time t and a place x. Measure time in years and distance in light-years, so that light travels 1 unit of distance per unit of time: the speed of light c is 1. An event is the vector [t; x].',
      'A second observer moves past at speed β (a fraction of c, so −1 < β < 1). Their coordinates for the same event are given by the **Lorentz boost** Lam = γ * [1 −β; −β 1], where γ = 1/√(1 − β²). At everyday speeds γ is almost 1; at β = 0.6 it is 1.25; it grows without limit as β approaches 1.',
      'Observers disagree about times and distances, but one quantity is the same for all of them: the **interval** s = t² − x². In matrix form s = xᵀ η x with η = diag(1, −1). A boost keeps it, just as a rotation keeps lengths: Lamᵀ η Lam = η. Rotations keep circles; boosts keep hyperbolas.',
      'Time dilation is one line of code. A clock at rest in the moving frame ticks at x\' = 0. If it reads τ, then in our frame the tick is at Lam⁻¹ * [τ; 0] = [γτ; γβτ]: later by the factor γ. The inverse of a boost is the boost with −β, because the other observer sees us moving the other way.',
      'Two boosts in a row are one boost. Multiply Lam(β1) by Lam(β2) and read off the combined speed: β = (β1 + β2)/(1 + β1β2). Add 0.6 and 0.6 and you get about 0.882, never more than 1. Velocities do not simply add, and the speed of light cannot be passed.',
    ],
    procedure: ['Use units with c = 1 and write events as [t; x].', 'Build gamma = 1/sqrt(1 − beta^2) and Lam = gamma*[1 −beta; −beta 1]; apply it to events.', 'Check the interval t² − x² before and after, and multiply boosts to combine speeds.'],
    prediction: { question: 'A rocket passes at 0.6 c, then fires a probe forward at 0.6 c relative to itself. How fast is the probe relative to you?', answer: 'About 0.882 c, not 1.2 c. Multiplying the two boost matrices gives (0.6 + 0.6)/(1 + 0.36) = 0.882. Combining speeds below c always gives a speed below c.' },
    demo: {
      code: t`beta = 0.6;
gamma = 1/sqrt(1 - beta^2)
Lam = gamma*[1 -beta; -beta 1]
event = [5; 3];              % 5 years from now, 3 light-years away
moved = Lam*event            % the same event for the moving observer
eta = [1 0; 0 -1];
before = dot(event, eta*event)
after = dot(moved, eta*moved)
both = Lam*Lam;              % two boosts of 0.6 in a row
combined = -both(1,2)/both(1,1)`,
      draw: t`x = linspace(-6, 6, 121);
plot(x, sqrt(16 + x.^2))
hold on
pt = zeros(1, 9);
px = zeros(1, 9);
speeds = -0.8:0.2:0.8;
for k = 1:9
  b = speeds(k);
  B = (1/sqrt(1 - b^2))*[1 -b; -b 1];
  p = B*[4; 0];
  pt(k) = p(1);
  px(k) = p(2);
end
plot(px, pt, 'o')
title('Boosts slide an event along the hyperbola t^2 - x^2 = 16')
xlabel('Position (light-years)'); ylabel('Time (years)'); legend('t^2 - x^2 = 16', 'Boosted events'); grid on`,
      explain: [{ code: 'Lam = gamma*[1 -beta; -beta 1]', meaning: 'γ = 1.25, so Lam = [1.25 −0.75; −0.75 1.25].' }, { code: 'moved = Lam*event', meaning: '[4; 0]: for the moving observer the event happens where they are, 4 years from now, not 5.' }, { code: 'after = dot(moved, eta*moved)', meaning: '16 before and 16 after: 25 − 9 = 16 − 0. The interval does not change.' }, { code: 'combined = -both(1,2)/both(1,1)', meaning: '0.882: two speeds of 0.6 c combine to less than c.' }],
    },
    derive: {
      claim: t`Multiply two boosts and find the velocity-addition rule $\beta = \dfrac{\beta_1 + \beta_2}{1 + \beta_1\beta_2}$.`,
      given: t`$\Lambda(\beta) = \gamma\begin{bmatrix} 1 & -\beta \\ -\beta & 1 \end{bmatrix}$ with $\gamma = 1/\sqrt{1 - \beta^2}$. Write $\gamma_1, \gamma_2$ for the factors of the two boosts.`,
      steps: [
        { ask: t`What is the top-left entry of $\Lambda(\beta_1)\Lambda(\beta_2)$?`, options: [t`$\gamma_1\gamma_2\,(1 + \beta_1\beta_2)$`, t`$\gamma_1\gamma_2$`, t`$\gamma_1 + \gamma_2$`], answer: 0, why: t`Row $[1 \;\; -\beta_1]$ times column $[1;\; -\beta_2]$ is $1 + \beta_1\beta_2$, times both $\gamma$s.` },
        { ask: 'And the top-right entry?', options: [t`$-\gamma_1\gamma_2\,(\beta_1 + \beta_2)$`, t`$-\gamma_1\gamma_2\,\beta_1\beta_2$`, t`$\gamma_1\gamma_2\,(\beta_1 - \beta_2)$`], answer: 0, why: t`Row $[1 \;\; -\beta_1]$ times column $[-\beta_2;\; 1]$ is $-\beta_2 - \beta_1$.` },
        { ask: t`The product has the boost shape $\gamma\begin{bmatrix} 1 & -\beta \\ -\beta & 1 \end{bmatrix}$. How do you read off $\beta$?`, options: [t`$\beta = -\dfrac{\text{top right}}{\text{top left}} = \dfrac{\beta_1 + \beta_2}{1 + \beta_1\beta_2}$`, t`$\beta = \text{top right} + \text{top left}$`, t`$\beta = \beta_1 + \beta_2$`], answer: 0, why: t`In a boost, top right over top left is $-\gamma\beta/\gamma = -\beta$, and the $\gamma_1\gamma_2$ cancels.` },
        { ask: t`Try $\beta_1 = \beta_2 = 0.6$. What is $\beta$?`, options: [t`$1.2/1.36 \approx 0.882$`, '1.2', '0.6'], answer: 0, why: t`$(0.6 + 0.6)/(1 + 0.36)$. Below 1, as it must be.` },
      ],
      conclusion: t`Composing boosts is matrix multiplication, and the speeds combine by this rule. At everyday speeds $\beta_1\beta_2$ is tiny and the rule is ordinary addition. If either speed is 1, the result is 1: light moves at the same speed for everyone, which is where Einstein started.`,
    },
    challenge: {
      prompt: 'A muon moves at speed beta (c = 1) and decays after tau microseconds of its own time. Store gamma, Lam, the boost into the muon\'s frame, labEvent, the decay event [time; position] in our frame (use the inverse boost on [tau; 0]), and distance = c*labEvent(2), how far it travels in metres, with c given in metres per microsecond.',
      setup: 'beta = 0.995;\ntau = 2.2;\nc = 300;',
      starter: 'gamma = 1/sqrt(1 - beta^2);\nLam = gamma*[1 -beta; -beta 1];\nrest = [tau; 0];\nlabEvent = Lam*rest;   % this boosts the wrong way\ndistance = c*labEvent(2);',
      solution: 'gamma = 1/sqrt(1 - beta^2);\nLam = gamma*[1 -beta; -beta 1];\nback = gamma*[1 beta; beta 1];\nrest = [tau; 0];\nlabEvent = back*rest;\ndistance = c*labEvent(2);',
      checks: [{ name: 'gamma', expected: g995, tolerance: 1e-9, message: 'About 10: the muon\'s clock runs ten times slow.' }, { name: 'Lam', expected: [[g995, -0.995 * g995], [-0.995 * g995, g995]], tolerance: 1e-9, message: 'gamma*[1 −beta; −beta 1].' }, { name: 'labEvent', expected: [g995 * 2.2, g995 * 0.995 * 2.2], tolerance: 1e-9, message: 'The inverse boost uses +beta: we see the muon moving forward.' }, { name: 'distance', expected: 300 * g995 * 0.995 * 2.2, tolerance: 1e-6, message: 'About 6.6 km instead of 660 m.' }],
      cases: [{ setup: 'beta = 0.6;\ntau = 2.2;\nc = 300;', checks: [{ name: 'labEvent', expected: [2.75, 1.65], tolerance: 1e-9, message: 'γ = 1.25 at 0.6 c.' }, { name: 'distance', expected: 495, tolerance: 1e-6, message: 'A slower muon gains less.' }] }],
      hints: ['The starter applies Lam, which takes our coordinates to the muon\'s. You need the reverse.', 'The inverse of a boost is the boost with −beta: back = gamma*[1 beta; beta 1].', 'labEvent = back*rest; distance = c*labEvent(2);'],
      transfer: 'Check that back*Lam is the identity. Then find the speed at which a muon would, on average, just reach the ground from 15 km up: try values of beta until distance is 15000.',
    },
    notation: [
      { tex: t`\Lambda(\beta) = \gamma\begin{bmatrix} 1 & -\beta \\ -\beta & 1 \end{bmatrix}, \qquad \gamma = \frac{1}{\sqrt{1 - \beta^2}}`, say: 'A Lorentz boost, with c = 1.' },
      { tex: t`s = \mathbf x^T\eta\,\mathbf x = t^2 - x^2, \qquad \Lambda^T\eta\,\Lambda = \eta, \qquad \eta = \begin{bmatrix} 1 & 0 \\ 0 & -1 \end{bmatrix}`, say: 'The interval every observer agrees on.' },
    ],
    quiz: [
      { q: 'What is the inverse of the boost with speed β?', options: ['The boost with speed −β', 'Its transpose', 'The boost with speed 1/β', 'It has no inverse'], answer: 0, why: 'If you see me moving at β, I see you moving at −β; undoing one boost is boosting back.' },
      { q: 'Which quantity is the same for every observer?', options: ['t² − x²', 't² + x²', 'The time t', 'The position x'], answer: 0, why: 'A boost keeps xᵀηx with η = diag(1, −1), the way a rotation keeps x² + y².' },
    ],
    uses: [
      { who: 'physics', title: 'Particle accelerators', story: 'Unstable particles at the LHC live tens of times longer in the lab than at rest, and detectors are placed using exactly this γ. Collision energies are computed with four-dimensional boost matrices.' },
      { who: 'general', title: 'GPS', story: 'GPS satellite clocks move fast enough to fall behind by about 7 microseconds a day from speed alone. Uncorrected, with gravity\'s larger effect, positions would drift by kilometres a day.' },
      { who: 'math', title: 'Hyperbolic geometry', story: 'Write β = tanh φ and the boost becomes [cosh φ, −sinh φ; −sinh φ, cosh φ], a rotation with hyperbolic functions. The "angle" φ, the rapidity, simply adds when boosts combine.' },
      { who: 'ee', title: 'Electric and magnetic fields', story: 'A moving observer sees part of an electric field as a magnetic field. The fields mix under the same boost, which is how relativity explains why a current-carrying wire attracts a moving charge.' },
    ],
    angles: [
      { title: 'A rotation with a minus sign', body: 'A rotation keeps $x^2 + y^2$ and has $\\cos$ and $\\sin$ in it. A boost keeps $t^2 - x^2$ and has $\\cosh\\varphi = \\gamma$ and $\\sinh\\varphi = \\gamma\\beta$ in it. The demo\'s boosted events slide along a hyperbola the way rotated points slide along a circle.' },
      { title: 'Why nothing passes c', body: 'As $\\beta \\to 1$, $\\gamma \\to \\infty$: the matrix blows up. Combining any two speeds below 1 gives $(\\beta_1 + \\beta_2)/(1 + \\beta_1\\beta_2) < 1$, because $(1 - \\beta_1)(1 - \\beta_2) > 0$. No chain of boosts below light speed ever reaches it.' },
    ],
  },
  {
    id: 'laml-phys-box', module: PHYS, title: 'A quantum particle in a box: energies are eigenvalues', minutes: 30, level: 'Advanced',
    why: { title: 'Why quantum dots glow in different colours', story: 'In 1926 Erwin Schrödinger wrote the equation that gives the allowed energies of an electron. Trapped in a small space, an electron can only have certain energies, like the notes of a guitar string, and the smaller the space, the higher and more widely spaced they are. Quantum dots, specks of semiconductor a few nanometres across, use this: the size of the dot sets the energy gap and so the colour of light it gives off. They light some television screens and won the 2023 Nobel Prize in Chemistry. On a computer, Schrödinger\'s equation becomes a symmetric matrix, and the allowed energies are its eigenvalues.' },
    objective: 'Turn the Schrödinger equation for a particle in a box into a symmetric matrix by finite differences, find its energies with eig, and compare with the exact n²π²/2.',
    prose: [
      'A particle is trapped in a box from x = 0 to x = L. Its state is a wave ψ(x) that must be zero at the walls. Quantum mechanics says the allowed states satisfy −½ ψ\'\'(x) = E·ψ(x), in units chosen so that Planck\'s constant and the mass are 1. Only special values of E allow a solution: those are the **energy levels**.',
      'Sample ψ at N points inside the box, spaced h = L/(N + 1) apart. The second derivative at a point is close to (ψ_left − 2ψ + ψ_right)/h², the same second difference as in the Engineering track\'s heated rod. So −½ψ\'\' becomes the matrix H = (1/(2h²)) times the matrix with 2 on the diagonal and −1 beside it.',
      'The equation is now H·ψ = E·ψ: an **eigenvalue problem**. The allowed energies are the eigenvalues of H and the states are its eigenvectors. H is symmetric, so its eigenvalues are real and its eigenvectors perpendicular, as the spectral theorem promised.',
      'The exact energies are E = n²π²/(2L²) for n = 1, 2, 3, …: they grow like 1, 4, 9. The matrix gets the lowest ones very accurately and the highest ones poorly, because a wave that wiggles from point to point is not sampled finely enough. The eigenvectors are sine waves: the n-th state crosses zero n − 1 times inside the box.',
      'The square ψ² of a normalised state gives the chance of finding the particle near each point. `eig` returns unit-length eigenvectors, so ψ.^2 adds up to 1. The sign of an eigenvector is arbitrary, but ψ² is not.',
    ],
    procedure: ['Choose N points inside the box, h = L/(N + 1), and build H = (1/(2h²))*(2 on the diagonal, −1 beside it).', 'Compute E = eig(H): the energies, smallest first. [Q, D] = eig(H) also gives the states as columns of Q.', 'Compare E(1:3) with n²π²/(2L²), and plot Q(:,1).^2 for where the particle is likely to be.'],
    prediction: { question: 'The box is made twice as wide. What happens to the lowest energy?', answer: 'It falls to a quarter. The energies go like 1/L², so a wider box has lower, more closely spaced levels. That is why larger quantum dots glow redder (lower energy) than small ones.' },
    demo: {
      code: t`L = 1;
N = 60;
${KINETIC}
[Q, D] = eig(H);
E = diag(D);
lowest = E(1:3)
exact = pi^2*(1:3).^2/(2*L^2)`,
      draw: t`x = h*(1:N);
plot(x, Q(:,1).^2)
hold on
plot(x, Q(:,2).^2)
plot(x, Q(:,3).^2)
title('Where the particle is likely to be: the three lowest states')
xlabel('Position in the box'); ylabel('Probability per point'); legend('n = 1', 'n = 2', 'n = 3'); grid on`,
      explain: [{ code: 'H = T/(2*h^2);', meaning: 'The second difference, scaled: the matrix form of −½ψ\'\'.' }, { code: '[Q, D] = eig(H);', meaning: 'Energies on the diagonal of D, smallest first; the states are the columns of Q.' }, { code: 'lowest = E(1:3)', meaning: '4.934, 19.72 and 44.32, against the exact 4.935, 19.74 and 44.41: close, and closest for the lowest.' }, { code: 'plot(x, Q(:,1).^2)', meaning: 'The lowest state is one hump; the next has a zero in the middle, the third has two.' }],
    },
    challenge: {
      prompt: 'A box of length L is sampled at N inside points. Store the matrix H = (1/(2h^2)) times the matrix with 2 on the diagonal and −1 beside it (h = L/(N + 1)), its energies E = eig(H), smallest first, and ratio = E(2)/E(1).',
      setup: 'L = 1;\nN = 4;',
      starter: t`h = L/(N + 1);
H = zeros(N, N);
for k = 1:N
  H(k,k) = 2;
  if k > 1
    H(k,k-1) = -1;
  end
  if k < N
    H(k,k+1) = -1;
  end
end
E = eig(H);
ratio = E(2)/E(1);`,
      solution: t`${KINETIC}
E = eig(H);
ratio = E(2)/E(1);`,
      checks: [{ name: 'H', expected: [[25, -12.5, 0, 0], [-12.5, 25, -12.5, 0], [0, -12.5, 25, -12.5], [0, 0, -12.5, 25]], tolerance: 1e-9, message: 'Scale the pattern by 1/(2h²) = 12.5.' }, { name: 'E', expected: [1, 2, 3, 4].map(n => boxLevel(4, n)), tolerance: 1e-6, message: 'The four energies of a box sampled at four points.' }, { name: 'ratio', expected: boxLevel(4, 2) / boxLevel(4, 1), tolerance: 1e-6, message: 'About 3.6 here; it approaches 4 as N grows.' }],
      cases: [{ setup: 'L = 1;\nN = 6;', checks: [{ name: 'E', expected: [1, 2, 3, 4, 5, 6].map(n => boxLevel(6, n)), tolerance: 1e-6, message: 'More points, more levels.' }, { name: 'ratio', expected: boxLevel(6, 2) / boxLevel(6, 1), tolerance: 1e-6, message: 'Closer to the exact 4.' }] }],
      hints: ['The starter builds the pattern but never scales it.', 'Divide by 2h²: H = T/(2*h^2) when the pattern is in T.', 'Then E = eig(H); ratio = E(2)/E(1);'],
      transfer: 'Increase N to 10, 20 and 50 and watch ratio. Why does it approach 4? Then double L and check that every energy falls to about a quarter.',
    },
    notation: [
      { tex: t`-\tfrac12\,\psi''(x) = E\,\psi(x), \quad \psi(0) = \psi(L) = 0 \quad\Rightarrow\quad E_n = \frac{n^2\pi^2}{2L^2}`, say: 'The particle in a box and its exact energies (Planck\'s constant and mass set to 1).' },
      { tex: t`H = \frac{1}{2h^2}\begin{bmatrix} 2 & -1 & & \\ -1 & 2 & -1 & \\ & \ddots & \ddots & \ddots \\ & & -1 & 2 \end{bmatrix}, \qquad H\boldsymbol\psi = E\,\boldsymbol\psi`, say: 'Finite differences turn the equation into an eigenvalue problem.' },
    ],
    quiz: [
      { q: 'Why are the computed energies guaranteed to be real numbers?', options: ['H is symmetric', 'H has positive entries', 'The box has walls', 'eig always returns real numbers'], answer: 0, why: 'A real symmetric matrix has real eigenvalues and perpendicular eigenvectors: the spectral theorem.' },
      { q: 'Which computed energies are least accurate?', options: ['The highest ones', 'The lowest one', 'All are equally accurate', 'The middle ones'], answer: 0, why: 'High states wiggle on the scale of the spacing h, so the second difference describes them poorly.' },
    ],
    uses: [
      { who: 'physics', title: 'Quantum chemistry', story: 'Programs that design drugs and materials solve much larger versions of Hψ = Eψ for the electrons of a molecule. The lowest eigenvalues give the energies that decide how molecules bond and react.' },
      { who: 'general', title: 'Quantum dot screens', story: 'Some television screens convert blue light to pure red and green with quantum dots. The colour is set by the dot\'s size, through exactly the 1/L² rule of this lesson.' },
      { who: 'ee', title: 'Lasers and LEDs', story: 'Layered semiconductors trap electrons in wells a few nanometres thick. Designers pick the well width to put the energy levels, and so the colour of light, where they want it.' },
      { who: 'math', title: 'Sturm–Liouville problems', story: 'Vibrating strings, drums and heat flow all lead to eigenvalue problems for a second derivative. Their eigenfunctions, like the sines here, are the building blocks of Fourier series.' },
      { who: 'cs', title: 'Large sparse eigenvalue solvers', story: 'Real Hamiltonians have millions of rows but only a few nonzeros per row. Methods such as Lanczos find the lowest eigenvalues using only matrix-vector products, never storing the whole matrix.' },
    ],
    angles: [
      { title: 'A guitar string', body: 'Change $-\\tfrac12\\psi\'\' = E\\psi$ to $-\\psi\'\' = (\\omega/c)^2\\psi$ and the same matrix gives the notes of a string fixed at both ends. The energy levels of a quantum box and the harmonics of a guitar string are the same eigenvalue problem; only the meaning of the eigenvalue changes.' },
      { title: 'Why the levels go like n²', body: 'The $n$-th state is a sine with $n$ half-waves in the box, so its wavelength is $2L/n$. The energy is the curvature, which grows like (1/wavelength)², so like $n^2/L^2$.' },
    ],
  },
  {
    id: 'laml-phys-capstone', module: PHYS, title: 'Capstone: a double well and quantum tunnelling', minutes: 35, level: 'Capstone',
    why: { title: 'The ammonia clock', story: 'In an ammonia molecule the nitrogen atom sits on one side of a triangle of hydrogens, and it can be on either side. Classically it would need energy to push through the triangle. Quantum mechanically it **tunnels**: its two lowest energy levels split by a tiny amount, and the nitrogen flips back and forth about 24 billion times a second. Claud Cleeton and Neil Williams measured that frequency in 1934. In 1949 it ran the first atomic clock, at the US National Bureau of Standards, and in 1954 Charles Townes built the first maser on it, the forerunner of the laser. One matrix, a box with a bump in the middle, shows all of it.' },
    objective: 'Add a barrier to the particle-in-a-box matrix, find the split pair of lowest levels, turn the splitting into a tunnelling time, and measure how much of the ground state sits inside the barrier.',
    prose: [
      'Put a wall of height V0 in the middle of the box. The Schrödinger equation gains a term: −½ψ\'\' + V(x)·ψ = E·ψ, where V is 0 in the two halves and V0 in the barrier. In matrix form, the potential simply adds to the diagonal: H = (kinetic matrix) + diag(V).',
      'If the barrier were infinitely high, each half would be its own box, and the two halves would have exactly the same lowest energy: two states, one in each well. A finite barrier lets the waves leak through and couple the wells. The two equal energies split into a pair: E(1) slightly lower, E(2) slightly higher.',
      'The eigenvectors explain the split. The ground state is the symmetric combination, the same sign in both wells; the next is the antisymmetric one, opposite signs, with a zero in the barrier. The splitting ΔE = E(2) − E(1) shrinks very quickly as the barrier grows: roughly exponentially in its height and width.',
      'A particle placed in the left well is the sum of these two states, and they turn at different rates set by their energies. It slips into the right well and back with period 2π/ΔE, in the units of this lesson. A smaller splitting means slower tunnelling. In ammonia the splitting corresponds to 24 GHz, which is the frequency the clock counts.',
      'How much of the ground state is inside the barrier? sum(Q(barrier,1).^2) gives the probability of finding the particle there, where classically it could never be. It is small, and it shrinks as V0 grows, along with the splitting.',
    ],
    procedure: ['Build the kinetic matrix H as in the box lesson.', 'Set V = zeros(1, N); V(barrier) = V0; and add it: H = H + diag(V).', 'Compute [Q, D] = eig(H); E = diag(D); then splitting = E(2) − E(1), period = 2*pi/splitting, and inside = sum(Q(barrier,1).^2).'],
    prediction: { question: 'The barrier is made twice as high. Does the splitting halve, or shrink by much more?', answer: 'Much more. In the demo, doubling V0 from 200 to 400 cuts the splitting from about 2.3 to about 0.8, and higher barriers cut it faster still. Tunnelling falls off roughly exponentially, which is why it matters only for light particles and thin barriers.' },
    demo: {
      code: t`L = 1;
N = 60;
${KINETIC}
barrier = 28:33;            % six points in the middle
V0 = 200;
V = zeros(1, N);
V(barrier) = V0;
H = H + diag(V);
[Q, D] = eig(H);
E = diag(D);
pair = E(1:2)
splitting = E(2) - E(1)
period = 2*pi/splitting
inside = sum(Q(barrier,1).^2)`,
      draw: t`x = h*(1:N);
plot(x, Q(:,1))
hold on
plot(x, Q(:,2))
plot(x, V/V0*0.25)
title('The split pair: same sign in both wells, and opposite signs')
xlabel('Position in the box'); ylabel('State (and barrier, scaled)'); legend('Ground state', 'Next state', 'Barrier'); grid on`,
      explain: [{ code: 'H = H + diag(V);', meaning: 'The potential adds to the diagonal; the kinetic part is unchanged.' }, { code: 'pair = E(1:2)', meaning: 'About 18.29 and 20.61: two close levels, where a box without the barrier has 4.93 and 19.72.' }, { code: 'period = 2*pi/splitting', meaning: 'About 2.7 time units to tunnel to the other side and back.' }, { code: 'inside = sum(Q(barrier,1).^2)', meaning: 'About 1.8%: the chance of finding the particle inside the wall.' }],
    },
    challenge: {
      prompt: 'A box of length L is sampled at N inside points, with a barrier of height V0 on the points listed in barrier. Store the energies E = eig(H) (smallest first), splitting = E(2) - E(1), period = 2*pi/splitting, and inside = sum(Q(barrier,1).^2), the ground state\'s probability inside the barrier, where [Q, D] = eig(H).',
      setup: 'L = 1;\nN = 20;\nbarrier = 9:12;\nV0 = 200;',
      starter: t`${KINETIC}
[Q, D] = eig(H);
E = diag(D);
splitting = E(2) - E(1);
period = 2*pi/splitting;
inside = sum(Q(barrier,1).^2);`,
      solution: t`${KINETIC}
V = zeros(1, N);
V(barrier) = V0;
H = H + diag(V);
[Q, D] = eig(H);
E = diag(D);
splitting = E(2) - E(1);
period = 2*pi/splitting;
inside = sum(Q(barrier,1).^2);`,
      checks: [{ name: 'E', expected: [22.73755889837787, 23.359320328961893, 87.40679394427377, 90.7477857402758, 181.35081160167948, 194.31150980468516, 277.48866294631034, 321.60873376350037, 376.32458078052497, 456.50956035577065, 503.90435282605654, 582.1103640381713, 637.9633982980189, 691.0182954566455, 756.1572995502365, 785.6703075399909, 843.0084471872276, 855.5581154469701, 903.1580939673022, 1029.6060075250348], tolerance: 1e-6, message: 'The levels come in close pairs at the bottom: one pair per level of a single well.' }, { name: 'splitting', expected: 0.6217614305840229, tolerance: 1e-6, message: 'The gap between the two lowest levels.' }, { name: 'period', expected: 10.105460065732553, tolerance: 1e-6, message: '2π over the splitting.' }, { name: 'inside', expected: 0.014978021568978577, tolerance: 1e-6, message: 'About 1.5% of the ground state is inside the wall.' }],
      cases: [{ setup: 'L = 1;\nN = 20;\nbarrier = 9:12;\nV0 = 400;', checks: [{ name: 'splitting', expected: 0.12843459050152717, tolerance: 1e-6, message: 'Twice the height, about a fifth of the splitting.' }, { name: 'period', expected: 48.921285789476435, tolerance: 1e-6, message: 'Tunnelling takes about five times longer.' }, { name: 'inside', expected: 0.004462864406032062, tolerance: 1e-6, message: 'Less of the state reaches into a higher wall.' }] }],
      hints: ['The starter forgets the barrier, so it solves an empty box.', 'V = zeros(1, N); V(barrier) = V0;', 'H = H + diag(V); before calling eig.'],
      transfer: 'Make the barrier one point wider (barrier = 9:13 breaks the symmetry, so try 8:13) and compare the splitting with a doubled height. Which matters more, width or height? Then put the barrier off-centre and look at the ground state: why does it no longer sit equally in both wells?',
    },
    notation: [
      { tex: t`\Bigl(-\tfrac12\,\frac{d^2}{dx^2} + V(x)\Bigr)\psi = E\,\psi \quad\Rightarrow\quad (H_{\text{kinetic}} + \operatorname{diag}(V))\,\boldsymbol\psi = E\,\boldsymbol\psi`, say: 'A potential adds to the diagonal.' },
      { tex: t`\Delta E = E_2 - E_1, \qquad \text{period} = \frac{2\pi}{\Delta E}`, say: 'The splitting sets how fast the particle tunnels back and forth.' },
    ],
    quiz: [
      { q: 'How does a potential V(x) enter the matrix H?', options: ['Its values are added to the diagonal', 'It multiplies every entry', 'It replaces the −1 entries', 'It is added to the first row'], answer: 0, why: 'V(x)ψ(x) involves only the point x itself, so it acts on the diagonal.' },
      { q: 'The barrier grows higher. What happens to the splitting E(2) − E(1)?', options: ['It shrinks very quickly, roughly exponentially', 'It grows', 'It stays the same', 'It shrinks in proportion'], answer: 0, why: 'Less of each state leaks through, so the two wells couple more weakly.' },
    ],
    uses: [
      { who: 'physics', title: 'Atomic clocks and masers', story: 'Ammonia\'s tunnelling splitting ran the first atomic clock in 1949 and the first maser in 1954. Modern clocks use other atoms, but the principle of counting a quantum energy gap is the same.' },
      { who: 'ee', title: 'Flash memory and tunnel diodes', story: 'A flash memory cell is written by pushing electrons through a thin insulating barrier by tunnelling. Engineers choose the barrier thickness from exactly the steep dependence seen here.' },
      { who: 'cs', title: 'Qubits', story: 'Some quantum computers store a bit as a particle in a double well. The two lowest, split states are the 0 and 1 of a qubit, and the splitting sets how fast it can be operated.' },
      { who: 'general', title: 'Why the Sun shines', story: 'Protons in the Sun\'s core lack the energy to overcome their mutual repulsion. They fuse only because they occasionally tunnel through it.' },
      { who: 'mech', title: 'Scanning tunnelling microscopes', story: 'A sharp tip held a nanometre above a surface passes a tunnelling current that changes tenfold for each tenth of a nanometre of gap. Holding the current fixed while scanning maps single atoms.' },
    ],
    angles: [
      { title: 'Two coupled pendulums', body: 'Two identical pendulums joined by a weak spring have two modes, swinging together and swinging opposite, with slightly different frequencies. Start one swinging and the motion passes slowly to the other and back. The double well is the quantum version: the coupling is the barrier, and the beat period is $2\\pi/\\Delta E$.' },
      { title: 'A 2 × 2 picture', body: 'Keep only the two lowest states of the separate wells, both with energy $E_0$, coupled by a small number $-t$: $\\begin{bmatrix} E_0 & -t \\\\ -t & E_0 \\end{bmatrix}$. Its eigenvalues are $E_0 \\mp t$ with eigenvectors $[1; 1]$ and $[1; -1]$: the symmetric and antisymmetric states, split by $2t$.' },
    ],
  },
]
