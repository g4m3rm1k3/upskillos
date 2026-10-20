// Stage 3: "Directions that don't turn" (eigenvectors, Markov chains, PageRank, vibrations) and
// "Tensors in the real world" (stress, principal stresses, Mohr's circle, symmetric energy, inertia).
// Rewritten lessons keep their ids; their notation, quick checks and proofs come from enrich.js.
// The spectral.js lessons (diagonalization, spirals, positive definite) slot in with `after`.
const t = String.raw
const EIGEN = 'Directions that don\'t turn'
const TENSORS = 'Tensors in the real world'

export const eigenLessons = [
  {
    id: 'laml-eigen-iteration', module: EIGEN, title: 'Directions that only stretch', minutes: 20, level: 'Intermediate',
    why: { title: 'A bridge that shakes itself apart', story: 'In 1940 the Tacoma Narrows bridge twisted itself to pieces in a steady wind: the wind kept feeding one of the bridge\'s own natural shapes of motion. Structures, populations, web pages and vibrating strings all have special directions that a process only stretches and never turns. Those are eigenvectors, and finding them is one of the most useful things linear algebra does.' },
    objective: 'Recognise an eigenvector and its eigenvalue, check a proposed pair, and find the dominant one by repeated multiplication.',
    prose: [
      'Most vectors change direction when a matrix acts on them. A few special ones do not: A·v points the same way as v, only longer or shorter. Then A·v = λ·v for some number λ (the Greek letter lambda). Such a v is an **eigenvector** of A, and λ is its **eigenvalue**.',
      'Example: A = [2 1; 1 2]. A·[1; 1] = [3; 3] = 3·[1; 1], so [1; 1] is an eigenvector with eigenvalue 3. A·[1; −1] = [1; −1], so [1; −1] is an eigenvector with eigenvalue 1. Every other direction gets turned.',
      'Apply A again and again to almost any start. The part along the eigenvalue-3 direction triples each time while the other part stays the same size, so the vector swings towards [1; 1]. Repeating and rescaling like this is called **power iteration**, and it finds the eigenvector with the largest eigenvalue.',
      'In code, `[V, D] = eig(A)` returns the eigenvectors as the columns of V and the eigenvalues on the diagonal of D. Check any pair by computing A·v − λ·v, which should be zero.',
    ],
    derive: {
      claim: t`Find the eigenvalues of $A = \begin{bmatrix} 2 & 1 \\ 1 & 2 \end{bmatrix}$ without guessing any eigenvector.`,
      given: t`An eigenvector is a nonzero $\mathbf v$ with $A\mathbf v = \lambda\mathbf v$.`,
      steps: [
        { ask: t`Bring everything to one side. Writing $\lambda\mathbf v$ as $\lambda I\mathbf v$, what do you get?`, options: [t`$(A - \lambda I)\mathbf v = \mathbf 0$`, t`$A - \lambda = 0$`, t`$(A + \lambda I)\mathbf v = \mathbf 0$`], answer: 0, why: t`$I\mathbf v = \mathbf v$, so $A\mathbf v - \lambda I\mathbf v = (A - \lambda I)\mathbf v$.` },
        { ask: t`$\mathbf v$ is not zero, yet $A - \lambda I$ sends it to zero. What does that say about $A - \lambda I$?`, options: ['It squashes a direction flat, so it has no inverse', 'It is the zero matrix', 'It is the identity'], answer: 0, why: t`An invertible matrix sends only $\mathbf 0$ to $\mathbf 0$. This one sends a nonzero $\mathbf v$ there.` },
        { ask: 'Which number detects a matrix with no inverse?', options: [t`Its determinant: $\det(A - \lambda I) = 0$`, 'Its largest entry', 'Its trace'], answer: 0, why: 'A matrix squashes area to zero exactly when its determinant is zero.' },
        { ask: t`For this $A$, $\det(A - \lambda I) = (2 - \lambda)^2 - 1$. Which values make it zero?`, options: [t`$\lambda = 3$ and $\lambda = 1$`, t`$\lambda = 2$ only`, t`$\lambda = 4$ and $\lambda = 0$`], answer: 0, why: t`$(2 - \lambda)^2 = 1$ means $2 - \lambda = \pm 1$.` },
      ],
      conclusion: t`The eigenvalues are 3 and 1, the stretches found in the reading. The equation $\det(A - \lambda I) = 0$ is called the characteristic equation, and it works for any square matrix.`,
    },
    procedure: ['Guess or compute a direction v.', 'Check A*v − λ*v ≈ 0 to confirm an eigenpair.', 'For the dominant one, repeat v = A*v; v = v/norm(v), and estimate λ = dot(v, A*v).'],
    prediction: { question: 'For A = [2 1; 1 2], what happens to power iteration if the start vector is exactly [1; −1]?', answer: 'It stays on [1; −1] for ever. It has no part along the dominant direction [1; 1], so repeated multiplication can never create one.' },
    demo: {
      code: t`A = [2 1; 1 2];
v = [1; 0];
for k = 1:20
  v = A*v;
  v = v / norm(v);
end
disp(v)
lambda = dot(v, A*v)`,
      draw: t`Av = A*v;
plot([0 v(1)], [0 v(2)])
hold on
plot([0 Av(1)], [0 Av(2)])
title('An eigenvector: A only stretches it')
xlabel('x'); ylabel('y'); legend('v', 'A*v: three times longer, same direction'); axis equal; grid on`,
      explain: [{ code: 'v = A*v;', meaning: 'Apply the matrix. The dominant direction grows fastest.' }, { code: 'v = v / norm(v);', meaning: 'Rescale to length 1 so the numbers stay manageable; only the direction matters.' }, { code: 'lambda = dot(v, A*v)', meaning: 'For a unit eigenvector, v · (A v) is its eigenvalue: 3.' }],
    },
    challenge: {
      prompt: 'Check whether v is an eigenvector of A. Store Av = A*v, lambda = dot(v, Av)/dot(v, v), and residual = norm(Av - lambda*v), which is 0 for an eigenvector.',
      setup: 'A = [4 1; 2 3];\nv = [1; 1];',
      starter: 'Av = v;   % replace with: A*v\nlambda = dot(v, Av)/dot(v, v);\nresidual = norm(Av - lambda*v);',
      solution: 'Av = A*v;\nlambda = dot(v, Av)/dot(v, v);\nresidual = norm(Av - lambda*v);',
      checks: [{ name: 'Av', expected: [5, 5], tolerance: 1e-9, message: 'Multiply the matrix by v.' }, { name: 'lambda', expected: 5, tolerance: 1e-9, message: 'How much v is stretched.' }, { name: 'residual', expected: 0, tolerance: 1e-9, message: 'An eigenvector leaves nothing over.' }],
      cases: [{ setup: 'A = [4 1; 2 3];\nv = [1; -2];', checks: [{ name: 'lambda', expected: 2, tolerance: 1e-9, message: 'The other eigenvector of the same matrix.' }, { name: 'residual', expected: 0, tolerance: 1e-9, message: 'It is also an eigenvector.' }] }],
      hints: ['First compute A*v.', 'If A*v = λ v, then λ = (v · Av)/(v · v).', 'Av = A*v; then lambda and residual as given.'],
      transfer: 'Try v = [1; 0]. What is the residual, and what does a nonzero residual tell you? Then run power iteration on A and find its dominant eigenvector.',
    },
  },
  {
    id: 'laml-markov-state-vectors', module: EIGEN, title: 'Markov chains: where does everyone end up?', minutes: 20, level: 'Intermediate',
    why: { title: 'The long run from one step', story: 'Every night some bikes are ridden from one bike-share station to another. Every year some people move between cities. A sunny day is followed by a sunny or a rainy one. Write one step as a matrix, multiply repeatedly, and the long-run split appears. It is an eigenvector with eigenvalue 1.' },
    objective: 'Move a probability distribution forward with a transition matrix and find its long-run steady state.',
    prose: [
      'A city has two bike stations. Each night 90% of the bikes at station 1 stay and 10% move to station 2; at station 2, 80% stay and 20% move to station 1. Put these chances in P with one **row per current station**: P = [0.9 0.1; 0.2 0.8]. Each row adds up to 1.',
      'If p lists the fraction of bikes at each station today, tomorrow\'s fractions are Pᵀp (Pᵀ is P transposed: rows become columns). Each new entry adds up what flows in from every station.',
      'Repeat for many nights and p settles at 2/3 of the bikes at station 1 and 1/3 at station 2, whatever the start. That steady split s satisfies Pᵀs = s. It is an **eigenvector of Pᵀ with eigenvalue 1**, scaled so that its entries add up to 1.',
      'Expected values run the other way. If v lists a payoff for being at each station tomorrow, P·v gives the expected payoff from each station today. Keep the two directions straight: distributions use Pᵀ, expectations use P.',
    ],
    derive: {
      claim: 'Find how fast the bikes settle: show that the gap to the steady split shrinks by the same factor every night, and find that factor.',
      given: t`$P^T = \begin{bmatrix} 0.9 & 0.2 \\ 0.1 & 0.8 \end{bmatrix}$ and the steady split $\mathbf s = [2/3;\,1/3]$ satisfies $P^T\mathbf s = \mathbf s$. Call today's gap $\mathbf e = \mathbf p - \mathbf s$.`,
      steps: [
        { ask: t`Tomorrow's gap is $P^T\mathbf p - \mathbf s$. Replace $\mathbf s$ by $P^T\mathbf s$. What is it?`, options: [t`$P^T(\mathbf p - \mathbf s) = P^T\mathbf e$`, t`$\mathbf e$, unchanged`, t`$P^T\mathbf p$`], answer: 0, why: t`$P^T\mathbf p - P^T\mathbf s = P^T(\mathbf p - \mathbf s)$. The gap moves by the same matrix as the bikes.` },
        { ask: t`The entries of $\mathbf p$ add up to 1, and so do those of $\mathbf s$. What does that say about $\mathbf e$?`, options: [t`Its entries add up to 0, so it is a multiple of $[1;\,-1]$`, t`Its entries add up to 1`, t`It is zero`], answer: 0, why: t`$1 - 1 = 0$. In two entries, "adds up to 0" means $[x;\,-x] = x\,[1;\,-1]$.` },
        { ask: t`Compute $P^T[1;\,-1]$.`, options: [t`$[0.7;\,-0.7] = 0.7\,[1;\,-1]$`, t`$[1;\,-1]$`, t`$[1.1;\,-0.7]$`], answer: 0, why: t`$0.9 - 0.2 = 0.7$ and $0.1 - 0.8 = -0.7$. So $[1;\,-1]$ is an eigenvector of $P^T$, with eigenvalue 0.7.` },
        { ask: t`So each night multiplies the gap by 0.7. What is the gap after $k$ nights?`, options: [t`$0.7^k\,\mathbf e_0$`, t`$0.7k\,\mathbf e_0$`, t`$\mathbf e_0 / k$`], answer: 0, why: 'Multiplying by 0.7 again and again gives a power, not a product with k.' },
      ],
      conclusion: t`The gap shrinks by 0.7 a night: after 10 nights it is $0.7^{10} \approx 0.03$ of the start, after 30 about $0.00002$. The steady state has eigenvalue 1, and 0.7 is the other eigenvalue. Power iteration always works like this: the error shrinks by the ratio $|\lambda_2/\lambda_1|$ each step, so two eigenvalues close together mean slow settling. In PageRank the random jumps keep that ratio at 0.85 or less, which is why a few dozen rounds are enough.`,
    },
    procedure: ['Put current states on the rows of P and check that each row adds to 1.', 'Move a distribution forward with transpose(P)*p.', 'Repeat until it stops changing: that is the steady state, an eigenvector with eigenvalue 1.'],
    prediction: { question: 'Every bike starts at station 2. After one night, what fraction is at station 1?', answer: '0.2: the 20% of station 2\'s bikes that move. It is the first entry of Pᵀ[0; 1].' },
    demo: {
      code: t`P = [0.9 0.1; 0.2 0.8];
p = [0; 1];
for night = 1:30
  p = transpose(P) * p;
end
disp(p)`,
      draw: t`q = [0; 1];
history = zeros(1, 31);
history(1) = q(1);
for night = 1:30
  q = transpose(P) * q;
  history(night + 1) = q(1);
end
plot(0:30, history)
title('Whatever the start, station 1 settles at two thirds of the bikes')
xlabel('Night'); ylabel('Fraction of bikes at station 1'); grid on`,
      explain: [{ code: 'P = [0.9 0.1; 0.2 0.8];', meaning: 'Row i holds the chances of moving from station i to each station.' }, { code: 'p = transpose(P) * p;', meaning: 'One night: each station\'s new share collects what flows in.' }, { code: 'disp(p)', meaning: 'After 30 nights: about [0.667; 0.333], the steady state.' }],
    },
    challenge: {
      prompt: 'Store tomorrow = transpose(P)*p0, and steady, the long-run split, by repeating the step 200 times from p0.',
      setup: 'P = [0.7 0.3; 0.4 0.6];\np0 = [1; 0];',
      starter: 'tomorrow = p0;   % replace with: transpose(P)*p0\nsteady = p0;   % repeat the step 200 times',
      solution: 'tomorrow = transpose(P)*p0;\nsteady = p0;\nfor k = 1:200\n  steady = transpose(P)*steady;\nend',
      checks: [{ name: 'tomorrow', expected: [0.7, 0.3], tolerance: 1e-9, message: 'One step with the transpose of P.' }, { name: 'steady', expected: [4 / 7, 3 / 7], tolerance: 1e-6, message: 'Repeat the step in a loop until it settles.' }],
      cases: [{ setup: 'P = [0.7 0.3; 0.4 0.6];\np0 = [0; 1];', checks: [{ name: 'tomorrow', expected: [0.4, 0.6], tolerance: 1e-9, message: 'A different start.' }, { name: 'steady', expected: [4 / 7, 3 / 7], tolerance: 1e-6, message: 'The same long run, whatever the start.' }] }],
      hints: ['Distributions move with the transpose of P.', 'Put the step in a for loop.', 'steady = p0; for k = 1:200, steady = transpose(P)*steady; end'],
      transfer: 'Use [V, D] = eig(transpose(P)) and find the column of V for eigenvalue 1. Divide it by its sum and compare with steady.',
    },
  },
  {
    id: 'laml-pagerank', module: EIGEN, title: 'How Google ranked the web', minutes: 20, level: 'Intermediate',
    why: { title: 'Which page matters most?', story: 'In 1998 Google\'s founders ranked web pages not by their words but by their links: a page is important if important pages link to it. That circular definition is an eigenvector equation. It is solved by the same repeat-and-settle trick as a Markov chain, on a matrix with billions of columns.' },
    objective: 'Build a link matrix, add random jumps, and find each page\'s rank by power iteration.',
    prose: [
      'Imagine a reader clicking links at random among four pages. Page 1 links to pages 2 and 3; page 2 links to 3; page 3 links to 1; page 4 links to 1 and 3. Build L with one **column per page**: column j shares 1 equally among the pages that j links to. So column 1 is [0; 0.5; 0.5; 0].',
      'If r lists how likely the reader is to be on each page, one click later the chances are L·r. Each page\'s new score collects the scores flowing in along its incoming links.',
      'Real readers sometimes type a new address instead of clicking. With probability 0.85 they click a link, and with 0.15 they jump to a random page: G = 0.85·L + 0.15/n, where n is the number of pages and 0.15/n is added to every entry. This also stops the reader getting stuck.',
      'Repeat r ← G·r until it settles. The final r is the **PageRank**, the eigenvector of G with eigenvalue 1. Here page 3 comes first, narrowly ahead of page 1: three pages link to it, and its one link passes all its weight to page 1.',
    ],
    procedure: ['Build L: column j has 1/(number of links on page j) in each row that page j links to.', 'Blend in random jumps: G = 0.85*L + 0.15/n.', 'Start with equal scores and repeat r = G*r until it stops changing.'],
    prediction: { question: 'Page 4 has no incoming links. Will its rank be zero?', answer: 'Not quite. Random jumps give every page at least 0.15/n, here 0.0375. That is the lowest possible score.' },
    demo: {
      code: t`L = [0 0 1 0.5; 0.5 0 0 0; 0.5 1 0 0.5; 0 0 0 0];
n = 4;
G = 0.85*L + 0.15/n;
r = ones(n,1)/n;
for k = 1:100
  r = G*r;
end
disp(r)`,
      draw: t`plot(1:n, r)
title('PageRank of the four pages')
xlabel('Page'); ylabel('Rank'); grid on`,
      explain: [{ code: 'L = [0 0 1 0.5; ...];', meaning: 'Column j shares page j\'s vote equally among the pages it links to.' }, { code: 'G = 0.85*L + 0.15/n;', meaning: 'Mostly follow links; sometimes jump anywhere.' }, { code: 'r = G*r;', meaning: 'One round of voting. After 100 rounds: about [0.380; 0.199; 0.384; 0.038].' }],
    },
    challenge: {
      prompt: 'A three-page web has link matrix L. Store G = 0.85*L + 0.15/n, rank after 100 steps of rank = G*rank from equal scores, and [best, top] = max(rank): the highest score and which page has it.',
      setup: 'L = [0 0.5 1; 0.5 0 0; 0.5 0.5 0];\nn = 3;',
      starter: 'G = L;   % replace with: 0.85*L + 0.15/n\nrank = ones(n,1)/n;\nfor k = 1:100\n  rank = G*rank;\nend\n[best, top] = max(rank);',
      solution: 'G = 0.85*L + 0.15/n;\nrank = ones(n,1)/n;\nfor k = 1:100\n  rank = G*rank;\nend\n[best, top] = max(rank);',
      checks: [{ name: 'rank', expected: [74 / 171, 40 / 171, 57 / 171], tolerance: 1e-6, message: 'Blend the links with random jumps before iterating.' }, { name: 'top', expected: 1, tolerance: 1e-9, message: 'The position of the largest rank.' }],
      cases: [{ setup: 'L = [0 0.5 0; 0.5 0 1; 0.5 0.5 0];\nn = 3;', checks: [{ name: 'top', expected: 2, tolerance: 1e-9, message: 'A different link structure.' }] }],
      hints: ['Only the first line needs changing.', 'Every entry of G gets 0.15/n added.', 'G = 0.85*L + 0.15/n;'],
      transfer: 'Add a fourth page that links only to itself. What happens to the ranks without random jumps (0.85 replaced by 1)? Why did Google add the jumps?',
    },
    notation: [
      { tex: t`L_{ij} = \begin{cases} 1/k_j & \text{if page } j \text{ links to } i \\ 0 & \text{otherwise} \end{cases}`, say: '$k_j$ is the number of links on page $j$.' },
      { tex: t`G = 0.85\,L + \tfrac{0.15}{n}\,\mathbf 1\mathbf 1^T, \qquad G\mathbf r = \mathbf r`, say: 'The PageRank vector is the eigenvector of $G$ with eigenvalue 1.' },
    ],
    quiz: [
      { q: 'What makes a page rank highly?', options: ['Being linked to by pages that themselves rank highly', 'Having many outgoing links', 'Having long text', 'Being new'], answer: 0, why: 'Rank flows in along incoming links, weighted by the linking page\'s rank.' },
      { q: 'Why does each column of L add up to 1?', options: ['A reader on page j moves somewhere with total probability 1', 'So the matrix is symmetric', 'To make it invertible', 'It does not need to'], answer: 0, why: 'Each column shares one page\'s probability among its links.' },
    ],
  },
  {
    id: 'laml-vibrations', module: EIGEN, title: 'Vibrations: natural frequencies are eigenvalues', minutes: 25, level: 'Advanced',
    why: { title: 'Why some speeds shake things', story: 'A washing machine shakes violently at one spin speed and runs smoothly at others. A guitar string rings at particular notes. Engineers design bridges, engines and aircraft so that their natural frequencies stay away from the forces they will meet. Those frequencies, and the shapes of motion that go with them, are eigenvalues and eigenvectors.' },
    objective: 'Find the vibration modes and natural frequencies of a spring–mass system from the eigenvalues and eigenvectors of its stiffness matrix.',
    prose: [
      'Two equal masses sit in a row between two walls, joined by three equal springs. Push mass 1 by x₁ and mass 2 by x₂. The springs push back with force −K·x, where K = [2 −1; −1 2] (taking each mass and spring stiffness as 1). Newton\'s law says acceleration equals force, so x″ = −K·x. Here x″, read "x double-dash", is the rate of change of the velocity: the slope of the slope.',
      'Look for motions in which both masses swing in step with one rhythm: x(t) = cos(ωt)·v, for a fixed shape v. Its acceleration is −ω²·cos(ωt)·v. Matching both sides gives K·v = ω²·v. So v is an **eigenvector** of K and ω² its eigenvalue. Each such v is a **mode**, and ω is its **natural frequency**.',
      'Here the modes are [1; 1] (both masses move together, ω = 1) and [1; −1] (they move in opposite directions, ω = √3 ≈ 1.73). Any motion is a combination of the two modes, each swinging at its own frequency.',
      'Push the system at one of its natural frequencies and that mode grows larger and larger: **resonance**. That is why engineers compute the eigenvalues of a design\'s stiffness matrix before anything is built.',
    ],
    procedure: ['Write the stiffness matrix K (with unit masses).', 'Compute [V, D] = eig(K); each column of V is a mode shape.', 'The natural frequencies are ω = sqrt of the eigenvalues.'],
    prediction: { question: 'If every spring becomes twice as stiff (K doubles), what happens to the natural frequencies?', answer: 'They grow by a factor of √2: the eigenvalues double, and frequencies are their square roots.' },
    demo: {
      code: t`K = [2 -1; -1 2];
[V, D] = eig(K);
omega = sqrt(diag(D))
modes = V`,
      draw: t`t = linspace(0, 20, 300);
x1 = 0.5*cos(omega(1)*t) + 0.5*cos(omega(2)*t);
x2 = 0.5*cos(omega(1)*t) - 0.5*cos(omega(2)*t);
plot(t, x1)
hold on
plot(t, x2)
title('Start mass 1 alone: the two modes beat against each other')
xlabel('Time'); ylabel('Displacement'); legend('Mass 1', 'Mass 2'); grid on`,
      explain: [{ code: '[V, D] = eig(K);', meaning: 'Eigenvectors are the mode shapes; eigenvalues are the squared frequencies.' }, { code: 'omega = sqrt(diag(D))', meaning: 'Natural frequencies: 1 and √3.' }, { code: 'x1 = 0.5*cos(omega(1)*t) + 0.5*cos(omega(2)*t);', meaning: 'In the drawing code: starting with only mass 1 pushed is half of each mode.' }],
    },
    challenge: {
      prompt: 'Three equal masses in a row between walls, joined by equal springs, have K = [2 -1 0; -1 2 -1; 0 -1 2]. Store omega = sqrt(eig(K)), the natural frequencies from lowest to highest, and lowest = omega(1).',
      setup: 'K = [2 -1 0; -1 2 -1; 0 -1 2];',
      starter: 'omega = [0; 0; 0];   % replace with: sqrt(eig(K))\nlowest = omega(1);',
      solution: 'omega = sqrt(eig(K));\nlowest = omega(1);',
      checks: [{ name: 'omega', expected: [Math.sqrt(2 - Math.SQRT2), Math.SQRT2, Math.sqrt(2 + Math.SQRT2)], tolerance: 1e-6, message: 'Square roots of the eigenvalues of K.' }, { name: 'lowest', expected: Math.sqrt(2 - Math.SQRT2), tolerance: 1e-6, message: 'eig lists eigenvalues from smallest to largest.' }],
      cases: [{ setup: 'K = 2*[2 -1 0; -1 2 -1; 0 -1 2];', checks: [{ name: 'lowest', expected: Math.sqrt(2 * (2 - Math.SQRT2)), tolerance: 1e-6, message: 'Twice as stiff: frequencies grow by √2.' }] }],
      hints: ['Frequencies come from the eigenvalues of K.', 'Take the square root of each eigenvalue.', 'omega = sqrt(eig(K));'],
      transfer: 'Use [V, D] = eig(K) and sketch the three mode shapes. Which one has all masses moving together, and which has neighbours moving in opposite directions?',
    },
    notation: [
      { tex: t`\mathbf x'' = -K\mathbf x`, say: 'Newton\'s law for the spring–mass chain, with unit masses.' },
      { tex: t`K\mathbf v = \omega^2\mathbf v \;\Rightarrow\; \mathbf x(t) = \cos(\omega t)\,\mathbf v`, say: 'Each eigenvector is a mode that swings at frequency $\\omega = \\sqrt{\\lambda}$.' },
    ],
    quiz: [
      { q: 'What is a vibration mode?', options: ['A shape in which every part moves in step at one frequency', 'The largest displacement', 'The average position', 'A kind of spring'], answer: 0, why: 'A mode is an eigenvector: the shape stays fixed and only its size swings.' },
      { q: 'How is a natural frequency found from an eigenvalue λ of K (unit masses)?', options: ['ω = √λ', 'ω = λ', 'ω = λ²', 'ω = 1/λ'], answer: 0, why: 'The eigenvalue equals ω².' },
    ],
  },
  {
    id: 'laml-stress-tensor', module: TENSORS, title: 'Stress: the matrix that turns a cut into a force', minutes: 25, level: 'Intermediate',
    why: { title: 'What is happening inside a loaded part?', story: 'A bolt, a bone or a bridge beam carries forces internally. Imagine slicing it with a cut: the material on one side pushes and pulls on the other. How hard, and in which direction, depends on the angle of the cut. One small table of numbers, the stress tensor, answers that for every cut at once: give it the direction of the cut and it returns the force on it.' },
    objective: 'Use a stress tensor to find the traction on a cut, and split it into normal and shear stress.',
    prose: [
      'A thin metal plate is pulled and sheared. At one point inside it, describe the loading with σ = [σx τ; τ σy] (σ is the Greek letter sigma). σx and σy are pulls along x and y, in megapascals (MPa, newtons per square millimetre), and τ (tau) is shear, a sideways drag. For example, σ = [80 30; 30 20].',
      'Cut the plate along a line whose unit normal, the direction pointing straight out of the cut, is n. The force per area on that cut, called the **traction**, is t = σ·n. That is what this tensor is: a matrix that turns a direction into a force.',
      'Split the traction with the dot product from Stage 1. The **normal stress** n·t pulls straight out of the cut and tends to open a crack. The **shear stress**, the rest of t, slides the two sides past each other.',
      'σ is symmetric, with the same τ appearing twice, because the material is not spinning: a tiny square at that point has no overall twisting force on it. Symmetry is what makes its special directions perpendicular, in the next lesson.',
    ],
    procedure: ['Write the stress tensor σ from the loads.', 'For a cut at angle θ, take n = [cos θ; sin θ] and compute t = σ*n.', 'Normal stress = dot(n, t); shear stress = the length of t − (n·t)n.'],
    prediction: { question: 'For a cut straight across the x-direction (n = [1; 0]), what is the traction?', answer: 'The first column of σ: [σx; τ] = [80; 30].' },
    demo: {
      code: t`sigma = [80 30; 30 20];
theta = 30*pi/180;
n = [cos(theta); sin(theta)];
t = sigma * n;
normalStress = dot(n, t)
shearStress = norm(t - normalStress*n)`,
      draw: t`angles = linspace(0, pi, 61);
normals = zeros(1, 61);
shears = zeros(1, 61);
for k = 1:61
  m = [cos(angles(k)); sin(angles(k))];
  tr = sigma * m;
  normals(k) = dot(m, tr);
  shears(k) = dot([-sin(angles(k)); cos(angles(k))], tr);
end
plot(angles*180/pi, normals)
hold on
plot(angles*180/pi, shears)
title('Normal and shear stress on cuts at every angle')
xlabel('Cut angle (degrees)'); ylabel('Stress (MPa)'); legend('Normal', 'Shear'); grid on`,
      explain: [{ code: 't = sigma * n;', meaning: 'The tensor turns the cut\'s direction into the force per area on it.' }, { code: 'normalStress = dot(n, t)', meaning: 'The part pulling straight out of the cut: about 91 MPa.' }, { code: 'shearStress = norm(t - normalStress*n)', meaning: 'What is left slides along the cut: about 11 MPa.' }],
    },
    challenge: {
      prompt: 'For the stress tensor sigma and a cut whose normal is angleDeg degrees from x, store n, traction = sigma*n and normalStress = dot(n, traction).',
      setup: 'sigma = [50 -20; -20 10];\nangleDeg = 45;',
      starter: 'n = [1; 0];   % replace with the unit normal at angleDeg\ntraction = sigma * n;\nnormalStress = dot(n, traction);',
      solution: 'th = angleDeg*pi/180;\nn = [cos(th); sin(th)];\ntraction = sigma * n;\nnormalStress = dot(n, traction);',
      checks: [{ name: 'n', expected: [Math.SQRT1_2, Math.SQRT1_2], tolerance: 1e-6, message: 'The unit normal is [cos; sin] of the angle in radians.' }, { name: 'traction', expected: [30 / Math.SQRT2, -10 / Math.SQRT2], tolerance: 1e-6, message: 'Multiply sigma by n.' }, { name: 'normalStress', expected: 10, tolerance: 1e-6, message: 'The part of the traction along n.' }],
      cases: [{ setup: 'sigma = [50 -20; -20 10];\nangleDeg = 0;', checks: [{ name: 'traction', expected: [50, -20], tolerance: 1e-6, message: 'A cut across x gives the first column.' }, { name: 'normalStress', expected: 50, tolerance: 1e-6, message: 'σx itself.' }] }],
      hints: ['Convert the angle to radians first.', 'n = [cos(th); sin(th)];', 'traction = sigma * n; normalStress = dot(n, traction);'],
      transfer: 'Find a cut angle where the normal stress is largest. Then check whether the shear stress on that cut is zero, and explain what that suggests about σ·n and n.',
    },
    notation: [
      { tex: t`\boldsymbol\sigma = \begin{bmatrix} \sigma_x & \tau \\ \tau & \sigma_y \end{bmatrix}, \qquad \mathbf t = \boldsymbol\sigma\,\mathbf n`, say: 'The stress tensor turns a cut\'s unit normal into the traction on it.' },
      { tex: t`\sigma_n = \mathbf n\cdot\mathbf t, \qquad \tau_n = \|\mathbf t - \sigma_n\mathbf n\|`, say: 'Normal stress (opening) and shear stress (sliding).' },
    ],
    quiz: [
      { q: 'What does the stress tensor do?', options: ['Turns the direction of a cut into the force per area on it', 'Measures the temperature', 'Stores the shape of the part', 'Gives the weight of the part'], answer: 0, why: 'That is its definition: the traction on a cut is $\\boldsymbol\\sigma\\mathbf n$.' },
      { q: 'Why is the stress tensor symmetric?', options: ['A tiny piece of material must not have an overall twist on it', 'By convention only', 'Because forces are always positive', 'It is not symmetric'], answer: 0, why: 'Balance of turning effects on a tiny square forces the two shear entries to be equal.' },
    ],
  },
  {
    id: 'laml-principal-stresses', module: TENSORS, title: 'Principal stresses: the cuts with no sliding', minutes: 20, level: 'Intermediate',
    why: { title: 'Where will it crack?', story: 'Brittle materials such as glass, concrete and cast iron crack across the direction of the largest pull. To predict failure, engineers need that direction and its stress, called the principal stress. These are the cuts where the force points straight out, with no shear at all, and finding them is an eigenvector problem.' },
    objective: 'Find the principal stresses and directions as the eigenvalues and eigenvectors of the stress tensor, and the largest shear stress.',
    prose: [
      'For most cuts the traction t = σn tilts away from n, so there is some shear. On a few special cuts, t points exactly along n: σn = λn. Those n are **eigenvectors** of σ, and the stresses λ are the **principal stresses**.',
      'For σ = [80 30; 30 20] the eigenvalues are about 92.4 and 7.6 MPa. The larger is the biggest pull on any cut through the point; the smaller is the least.',
      'Because σ is symmetric, its eigenvectors are perpendicular (the spectral theorem, proved later). The two principal directions form a right angle. In those rotated axes σ becomes diagonal: pure pulls, with no shear.',
      'The largest shear on any cut is half the difference of the principal stresses, (λ₁ − λ₂)/2, on cuts at 45° to the principal directions. Ductile metals such as steel tend to yield along those cuts.',
    ],
    procedure: ['Compute [V, D] = eig(sigma).', 'The principal stresses are the diagonal of D; the columns of V are the principal directions.', 'Maximum shear = (largest − smallest)/2, on cuts at 45° to the principal directions.'],
    prediction: { question: 'For σ = [70 0; 0 30], what are the principal stresses and their directions?', answer: '70 and 30 MPa, along x and y. With no shear, the axes are already principal.' },
    demo: {
      code: t`sigma = [80 30; 30 20];
[V, D] = eig(sigma);
principal = diag(D)
directions = V
maxShear = (max(principal) - min(principal))/2`,
      draw: t`plot([0 V(1,1)], [0 V(2,1)])
hold on
plot([0 V(1,2)], [0 V(2,2)])
title('The two principal directions are at right angles')
xlabel('x'); ylabel('y'); legend('Least pull', 'Greatest pull'); axis equal; grid on`,
      explain: [{ code: '[V, D] = eig(sigma);', meaning: 'Eigenvectors are the cut directions with no shear; eigenvalues are the stresses on them.' }, { code: 'principal = diag(D)', meaning: 'About [7.6; 92.4] MPa, smallest first.' }, { code: 'maxShear = (max(principal) - min(principal))/2', meaning: 'About 42.4 MPa, on cuts at 45° to the principal directions.' }],
    },
    challenge: {
      prompt: 'Store principal = eig(sigma) (smallest first), greatest = max(principal) and maxShear = (max(principal) - min(principal))/2.',
      setup: 'sigma = [60 40; 40 0];',
      starter: 'principal = [0; 0];   % replace with: eig(sigma)\ngreatest = max(principal);\nmaxShear = 0;',
      solution: 'principal = eig(sigma);\ngreatest = max(principal);\nmaxShear = (max(principal) - min(principal))/2;',
      checks: [{ name: 'principal', expected: [-20, 80], tolerance: 1e-6, message: 'The eigenvalues of the stress tensor.' }, { name: 'greatest', expected: 80, tolerance: 1e-6, message: 'The largest pull on any cut.' }, { name: 'maxShear', expected: 50, tolerance: 1e-6, message: 'Half the difference of the principal stresses.' }],
      cases: [{ setup: 'sigma = [30 0; 0 -10];', checks: [{ name: 'principal', expected: [-10, 30], tolerance: 1e-6, message: 'No shear: the diagonal entries are already principal.' }, { name: 'maxShear', expected: 20, tolerance: 1e-6, message: '(30 − (−10))/2.' }] }],
      hints: ['Principal stresses are eigenvalues.', 'eig(sigma) returns them, smallest first.', 'principal = eig(sigma); greatest = max(principal); maxShear = (max(principal) - min(principal))/2;'],
      transfer: 'Use [V, D] = eig(sigma) and check that V\'*sigma*V is diagonal. Explain in words what it means to describe the stress in the principal axes.',
    },
    notation: [
      { tex: t`\boldsymbol\sigma\,\mathbf n = \lambda\,\mathbf n`, say: 'A principal direction: the traction points straight out of the cut.' },
      { tex: t`\tau_{\max} = \tfrac12(\lambda_{\max} - \lambda_{\min})`, say: 'The largest shear, at 45° to the principal directions.' },
    ],
    quiz: [
      { q: 'On a cut along a principal direction, what is the shear stress?', options: ['Zero', 'The largest possible', 'Equal to the normal stress', 'Half the normal stress'], answer: 0, why: 'The traction is parallel to the normal, so nothing slides.' },
      { q: 'Why are the two principal directions perpendicular?', options: ['The stress tensor is symmetric', 'All matrices have perpendicular eigenvectors', 'By the definition of stress', 'They are not'], answer: 0, why: 'Symmetric matrices have perpendicular eigenvectors.' },
    ],
  },
  {
    id: 'laml-mohr-circle', module: TENSORS, title: 'Mohr\'s circle: every cut on one picture', minutes: 20, level: 'Intermediate',
    why: { title: 'A drawing engineers have used since 1882', story: 'Before computers, engineers found principal stresses with a compass and a ruler. Christian Otto Mohr noticed that as a cut turns, its normal and shear stress trace out a circle. The circle still appears in every mechanics course, because it shows at a glance every possible stress at a point.' },
    objective: 'Find the centre and radius of Mohr\'s circle and read off the principal stresses and the maximum shear.',
    prose: [
      'Plot each cut as one point: normal stress across, shear stress up. As the cut turns from 0° to 180°, the point goes once round a circle. It travels twice as fast as the cut turns, so a 90° turn of the cut is half-way round the circle.',
      'The centre of the circle is the average pull, c = (σx + σy)/2. Its radius is R = √( ((σx − σy)/2)² + τ² ): Pythagoras on half the difference and the shear.',
      'The circle crosses the horizontal axis, where the shear is zero, at c + R and c − R: these are the principal stresses. The top of the circle is the largest shear, R. One picture holds both eigenvalues and the maximum shear.',
      'For σ = [80 30; 30 20]: c = 50 and R = √(30² + 30²) ≈ 42.4, so the principal stresses are about 92.4 and 7.6 MPa, matching eig.',
    ],
    procedure: ['Centre c = (σx + σy)/2.', 'Radius R = sqrt(((σx − σy)/2)^2 + τ^2).', 'Principal stresses c ± R; maximum shear R.'],
    prediction: { question: 'What does a circle of radius 0 mean?', answer: 'Every cut feels the same pure pull and no shear. σ is a multiple of the identity, like the pressure in still water.' },
    demo: {
      code: t`sx = 80; sy = 20; tau = 30;
c = (sx + sy)/2
R = sqrt(((sx - sy)/2)^2 + tau^2)
principal = [c - R; c + R]`,
      draw: t`a = linspace(0, 2*pi, 100);
plot(c + R*cos(a), R*sin(a))
hold on
plot([sx sy], [tau -tau])
title('Mohr circle: normal stress across, shear stress up')
xlabel('Normal stress (MPa)'); ylabel('Shear stress (MPa)'); legend('Every cut', 'Cuts across x and across y'); axis equal; grid on`,
      explain: [{ code: 'c = (sx + sy)/2', meaning: 'The centre: the average of the two pulls, 50 MPa.' }, { code: 'R = sqrt(((sx - sy)/2)^2 + tau^2)', meaning: 'The radius: about 42.4 MPa, which is also the largest shear.' }, { code: 'principal = [c - R; c + R]', meaning: 'Where the circle crosses zero shear: the principal stresses.' }],
    },
    challenge: {
      prompt: 'For the stresses sx, sy and tau, store c, R, principal = [c - R; c + R] and maxShear = R.',
      setup: 'sx = 120;\nsy = 40;\ntau = 30;',
      starter: 'c = 0;   % replace with the centre\nR = 0;   % replace with the radius\nprincipal = [c - R; c + R];\nmaxShear = R;',
      solution: 'c = (sx + sy)/2;\nR = sqrt(((sx - sy)/2)^2 + tau^2);\nprincipal = [c - R; c + R];\nmaxShear = R;',
      checks: [{ name: 'c', expected: 80, tolerance: 1e-9, message: 'The average of sx and sy.' }, { name: 'R', expected: 50, tolerance: 1e-9, message: 'Pythagoras on (sx − sy)/2 and tau.' }, { name: 'principal', expected: [30, 130], tolerance: 1e-9, message: 'The centre plus and minus the radius.' }],
      cases: [{ setup: 'sx = 10;\nsy = 10;\ntau = 5;', checks: [{ name: 'principal', expected: [5, 15], tolerance: 1e-9, message: 'Equal pulls: the radius is just the shear.' }] }],
      hints: ['The centre is an average.', 'The radius uses half the difference of the pulls, and the shear.', 'c = (sx + sy)/2; R = sqrt(((sx - sy)/2)^2 + tau^2);'],
      transfer: 'Check your answer with eig([sx tau; tau sy]). Then explain why the circle\'s centre equals half the trace of σ, and its radius squared relates to its determinant.',
    },
    notation: [
      { tex: t`c = \tfrac{\sigma_x + \sigma_y}{2}, \qquad R = \sqrt{\left(\tfrac{\sigma_x - \sigma_y}{2}\right)^2 + \tau^2}`, say: 'Centre and radius of Mohr\'s circle.' },
      { tex: t`\lambda_{1,2} = c \pm R, \qquad \tau_{\max} = R`, say: 'The principal stresses and the largest shear.' },
    ],
    quiz: [
      { q: 'Where on Mohr\'s circle are the principal stresses?', options: ['Where the circle crosses zero shear', 'At the top and bottom', 'At the centre', 'Anywhere on it'], answer: 0, why: 'Principal cuts have zero shear.' },
      { q: 'σx = σy = 50 and τ = 0. What does Mohr\'s circle look like?', options: ['A single point at 50', 'A circle of radius 50', 'A circle of radius 25', 'A vertical line'], answer: 0, why: 'R = 0: every cut has 50 MPa of pure pull.' },
    ],
  },
  {
    id: 'laml-symmetric-quadratic', module: TENSORS, title: 'Symmetric matrices: energy and perpendicular axes', minutes: 20, level: 'Advanced',
    why: { title: 'Bowls, saddles and stored energy', story: 'Stretch a spring, bend a beam or deform a crystal and the stored energy is a quadratic expression in the displacements, xᵀKx, with a symmetric K. Whether that energy forms a bowl (stable) or a saddle (unstable) is decided by the signs of K\'s eigenvalues, read along perpendicular axes.' },
    objective: 'Diagonalise a symmetric matrix with perpendicular eigenvectors and compute a quadratic energy in the rotated axes.',
    prose: [
      'A **symmetric** matrix equals its transpose, H = Hᵀ: it is a mirror image across its diagonal. Stress tensors, stiffness matrices and covariance matrices are all symmetric.',
      'Symmetric matrices have two gifts: their eigenvalues are real numbers, and their eigenvectors can be chosen perpendicular. Put the unit eigenvectors in Q and the eigenvalues in D. Then H = Q·D·Qᵀ. In the rotated axes given by Q, H is just a stretch along each axis.',
      'The energy E(x) = xᵀHx becomes simple in those axes. With z = Qᵀx, the coordinates of x along the eigenvectors, E = d₁z₁² + d₂z₂²: each eigenvalue weighs one squared coordinate.',
      'If every eigenvalue is positive, every direction costs energy: a bowl. If one is negative, some direction releases energy: a saddle, which means an unstable structure. A zero eigenvalue is a flat direction that costs nothing: a mechanism.',
    ],
    procedure: ['Check that H is symmetric.', 'Compute [Q, D] = eig(H); check Q\'*Q = I and Q*D*Q\' = H.', 'Rotate with z = Q\'*x and add up d·z²; the signs of the d decide bowl or saddle.'],
    prediction: { question: 'If one diagonal entry of D is negative, can xᵀHx be positive for every nonzero x?', answer: 'No. Choose x along that eigenvector: the energy is that negative eigenvalue times a positive squared length.' },
    demo: {
      code: t`H = [3 1; 1 3];
[Q, D] = eig(H);
x = [2; -1];
energy = transpose(x)*H*x
z = transpose(Q)*x;
energyAlongAxes = D(1,1)*z(1)^2 + D(2,2)*z(2)^2`,
      draw: t`a = linspace(0, 2*pi, 100);
e1 = Q(:,1) / sqrt(D(1,1));
e2 = Q(:,2) / sqrt(D(2,2));
plot(cos(a)*e1(1) + sin(a)*e2(1), cos(a)*e1(2) + sin(a)*e2(2))
title('Energy 1 is an ellipse whose axes are the eigenvectors')
xlabel('x(1)'); ylabel('x(2)'); axis equal; grid on`,
      explain: [{ code: '[Q, D] = eig(H);', meaning: 'Perpendicular unit eigenvectors in Q, eigenvalues 2 and 4 in D.' }, { code: 'energy = transpose(x)*H*x', meaning: 'The energy computed directly: 11.' }, { code: 'energyAlongAxes = D(1,1)*z(1)^2 + D(2,2)*z(2)^2', meaning: 'The same 11, computed in the eigenvector axes.' }],
    },
    challenge: {
      prompt: 'Store energy = transpose(x)*H*x. Then use [Q, D] = eig(H), z = transpose(Q)*x and store check = D(1,1)*z(1)^2 + D(2,2)*z(2)^2, which should equal energy.',
      setup: 'H = [5 2; 2 2];\nx = [1; 1];',
      starter: 'energy = 0;\n[Q, D] = eig(H);\nz = transpose(Q)*x;\ncheck = 0;',
      solution: 'energy = transpose(x)*H*x;\n[Q, D] = eig(H);\nz = transpose(Q)*x;\ncheck = D(1,1)*z(1)^2 + D(2,2)*z(2)^2;',
      checks: [{ name: 'energy', expected: 11, tolerance: 1e-9, message: 'x transposed, times H, times x.' }, { name: 'check', expected: 11, tolerance: 1e-6, message: 'The weighted squares of the rotated coordinates.' }],
      cases: [{ setup: 'H = [5 2; 2 2];\nx = [1; -2];', checks: [{ name: 'energy', expected: 5, tolerance: 1e-9, message: 'A different displacement.' }, { name: 'check', expected: 5, tolerance: 1e-6, message: 'Both routes still agree.' }] }],
      hints: ['The energy is one number: transpose(x)*H*x.', 'In the eigenvector axes each eigenvalue multiplies one squared coordinate.', 'check = D(1,1)*z(1)^2 + D(2,2)*z(2)^2;'],
      transfer: 'Change H to [1 2; 2 1]. Find an x with negative energy using its eigenvectors, and describe the shape of the energy surface.',
    },
  },
  {
    id: 'laml-inertia-tensor', module: TENSORS, title: 'Why a spinning book wobbles', minutes: 25, level: 'Advanced',
    why: { title: 'Throw a book in the air', story: 'Toss a book spinning about its longest axis or its shortest axis and it spins steadily. Spin it about the middle axis and it tumbles, every time. Astronauts filmed the same thing with a wing nut in space. The explanation is a symmetric matrix, the inertia tensor, and its three eigenvectors.' },
    objective: 'Compute angular momentum with an inertia tensor, find the principal axes as its eigenvectors, and recognise when a spin is steady.',
    prose: [
      'How hard an object is to spin depends on the axis. The 3 × 3 **inertia tensor** I describes this. Spin with angular velocity ω (a vector along the spin axis whose length is the spin rate) and the angular momentum is L = I·ω.',
      'Usually L does not point along ω. Then the spin axis gets dragged around and the object wobbles. Steady spin needs I·ω = λ·ω: ω must be an **eigenvector** of I. These directions are the **principal axes**, and the eigenvalues are the **principal moments**.',
      'A box of sides a, b, c and mass m, with its edges along the axes, has I = (m/12)·diag(b² + c², a² + c², a² + b²). A book of 24 × 17 × 3 cm has three different principal moments, so it has three distinct principal axes.',
      'Spin about the axis with the largest or the smallest moment is stable. About the middle one, tiny errors grow and the book flips. Satellites and spacecraft are designed to spin about a stable axis.',
    ],
    procedure: ['Build or measure the inertia tensor I, which is symmetric.', 'Compute [V, D] = eig(I): the columns of V are the principal axes, and the diagonal of D holds the moments.', 'Steady spin needs ω along a principal axis, where L = I·ω is parallel to ω.'],
    prediction: { question: 'For a perfect cube, what are the principal axes?', answer: 'Every axis. All three moments are equal, so I is a multiple of the identity and every direction is an eigenvector.' },
    demo: {
      code: t`m = 0.5; a = 0.24; b = 0.17; c = 0.03;
I = m/12 * diag([b^2+c^2 a^2+c^2 a^2+b^2]);
omega = [1; 1; 0];
L = I * omega
angleDeg = acos(dot(L, omega)/(norm(L)*norm(omega)))*180/pi`,
      draw: t`plot([0 omega(1)], [0 omega(2)])
hold on
plot([0 L(1)/norm(L)*norm(omega)], [0 L(2)/norm(L)*norm(omega)])
title('The angular momentum does not point along the spin axis')
xlabel('x'); ylabel('y'); legend('Spin axis', 'Angular momentum (rescaled)'); axis equal; grid on`,
      explain: [{ code: 'I = m/12 * diag([b^2+c^2 a^2+c^2 a^2+b^2]);', meaning: 'The inertia tensor of a 0.5 kg book with its edges along the axes.' }, { code: 'L = I * omega', meaning: 'Spinning about a diagonal axis: L comes out tilted away from it.' }, { code: 'angleDeg = acos(...)*180/pi', meaning: 'About 18° between the spin axis and the angular momentum: the book will wobble.' }],
    },
    challenge: {
      prompt: 'A box tilted in its holder has inertia tensor Ir. Store moments = eig(Ir) (smallest first), L = Ir*w for the spin w, and offAxis = norm(L - (dot(L, w)/dot(w, w))*w), the part of L not along w (0 for a steady spin).',
      setup: 'Ir = [3 1 0; 1 3 0; 0 0 5];\nw = [1; 1; 0];',
      starter: 'moments = [0; 0; 0];   % replace with: eig(Ir)\nL = Ir * w;\noffAxis = 1;',
      solution: 'moments = eig(Ir);\nL = Ir * w;\noffAxis = norm(L - (dot(L, w)/dot(w, w))*w);',
      checks: [{ name: 'moments', expected: [2, 4, 5], tolerance: 1e-6, message: 'The eigenvalues of the inertia tensor.' }, { name: 'L', expected: [4, 4, 0], tolerance: 1e-9, message: 'Multiply the tensor by the spin.' }, { name: 'offAxis', expected: 0, tolerance: 1e-9, message: 'This spin is along a principal axis, so L is parallel to w.' }],
      cases: [{ setup: 'Ir = [3 1 0; 1 3 0; 0 0 5];\nw = [1; 0; 0];', checks: [{ name: 'L', expected: [3, 1, 0], tolerance: 1e-9, message: 'A spin along x.' }, { name: 'offAxis', expected: 1, tolerance: 1e-9, message: 'Not a principal axis: L tilts away, so the box wobbles.' }] }],
      hints: ['Principal moments are eigenvalues.', 'Remove the part of L along w and measure what is left.', 'moments = eig(Ir); L = Ir * w; offAxis = norm(L - (dot(L, w)/dot(w, w))*w);'],
      transfer: 'Use [V, D] = eig(Ir) to find all three principal axes. Which one is the unstable "middle" axis of this box?',
    },
    notation: [
      { tex: t`\mathbf L = I\,\boldsymbol\omega`, say: 'The inertia tensor turns a spin into angular momentum.' },
      { tex: t`I\mathbf v = \lambda\mathbf v`, say: 'Principal axes: spins along them keep $\\mathbf L$ parallel to $\\boldsymbol\\omega$.' },
    ],
    quiz: [
      { q: 'When is a spin steady (no wobble)?', options: ['When the spin axis is a principal axis (an eigenvector of I)', 'When the spin is fast', 'When the object is light', 'Always'], answer: 0, why: 'Then the angular momentum points along the spin axis.' },
      { q: 'A book spins about which axis unstably?', options: ['The middle principal axis', 'The longest axis', 'The shortest axis', 'None of them'], answer: 0, why: 'This is the tennis-racket (Dzhanibekov) effect.' },
    ],
  },
]
