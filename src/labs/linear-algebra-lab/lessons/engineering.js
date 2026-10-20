// Optional track: "Engineering". Springs in a row give a stiffness matrix; assembling it spring by
// spring is the direct stiffness method; the same assembly on a heated wire is the finite element
// method; the capstone turns displacements into support forces and a design check.
// Each lesson carries its own why, notation, quiz, uses and angles.
// Loops name each spring's joints first (i = springs(s,1); j = springs(s,2)) because it reads
// more clearly; u(springs(s,2)) also works.
const t = String.raw
const ENG = 'Engineering'

const ASSEMBLE = (count) => t`for s = 1:${count}
  i = springs(s,1);
  j = springs(s,2);
  K(i,i) = K(i,i) + k(s);
  K(j,j) = K(j,j) + k(s);
  K(i,j) = K(i,j) - k(s);
  K(j,i) = K(j,i) - k(s);
end`

export const engineeringLessons = [
  {
    id: 'laml-eng-springs', module: ENG, title: 'Springs in a row: the stiffness matrix', minutes: 25, level: 'Intermediate',
    why: { title: 'Every structure is a network of springs', story: 'Push on a bridge deck and it sags a little; push twice as hard and it sags twice as much. Steel, concrete and timber all behave like stiff springs for the loads they are designed for. So engineers model a bridge, a building frame or a car body as a network of springs, write one balance-of-forces equation per joint, and solve K u = f: a stiffness matrix times the unknown movements equals the loads. Real models have millions of unknowns. This lesson builds the smallest one by hand.' },
    objective: 'Write the force balance at each joint of a chain of springs, collect it into a stiffness matrix K, and solve K*u = f for the movements and the spring forces.',
    prose: [
      'A spring with stiffness k, stretched by a distance s, pulls back with force k·s (Hooke\'s law). Stiffness is measured in newtons per metre: a 100 N/m spring needs 100 N to stretch it by 1 m.',
      'Fix two walls and put two small blocks between them, joined by three springs: wall, k1, block 1, k2, block 2, k3, wall. Push block 1 with force f1 and block 2 with f2, to the right. The blocks move right by u1 and u2. Spring 1 is stretched by u1, spring 2 by u2 − u1, and spring 3 by −u2 (it is squashed when u2 > 0).',
      'Balance the forces on block 1: the load f1 is held by spring 1 pulling it back (−k1·u1) and spring 2 pulling it on (+k2·(u2 − u1)). Setting the total to zero gives (k1 + k2)·u1 − k2·u2 = f1. Block 2 gives −k2·u1 + (k2 + k3)·u2 = f2. Together: K * u = f with K = [k1+k2, −k2; −k2, k2+k3].',
      'Read the pattern. Each diagonal entry adds up the stiffnesses of the springs touching that block. Each off-diagonal entry is minus the stiffness of the spring joining two blocks. So K is symmetric, and blocks that are not joined have a 0. A chain of n blocks gives a matrix with only three diagonals filled.',
      'Once u = K \\ f is solved, each spring\'s force is its stiffness times its stretch. A positive force is tension (pulled), a negative one compression (squashed). Engineers check these forces against what each member can carry; the capstone of this track does that check.',
    ],
    procedure: ['Number the blocks, and write each spring\'s stretch in terms of their movements.', 'Balance the forces on each block to get one row of K*u = f.', 'Solve u = K\\f, then compute each spring\'s force as stiffness times stretch.'],
    prediction: { question: 'Block 2 is pushed right and block 1 is not pushed at all. Does block 1 move?', answer: 'Yes, a little to the right. Spring 2 is stretched and pulls block 1 along, until spring 1 holds it back. Off-diagonal entries of K pass the load from one block to the next.' },
    demo: {
      code: t`k1 = 100;
k2 = 50;
k3 = 100;                 % stiffnesses (N/m)
K = [k1+k2 -k2; -k2 k2+k3];
f = [10; 20];             % loads on the blocks (N)
u = K\f                   % movements (m)
tension = [k1*u(1) k2*(u(2)-u(1)) -k3*u(2)]`,
      draw: t`bar(1:3, tension)
title('Spring forces: positive pulls, negative squashes')
xlabel('Spring'); ylabel('Force (N)'); grid on`,
      explain: [{ code: 'K = [k1+k2 -k2; -k2 k2+k3];', meaning: 'Diagonal: springs touching each block. Off-diagonal: minus the spring between them.' }, { code: 'u = K\\f', meaning: 'Block 1 moves 0.125 m and block 2 moves 0.175 m.' }, { code: 'tension = [k1*u(1) k2*(u(2)-u(1)) -k3*u(2)]', meaning: 'Spring 1 pulls with 12.5 N, spring 2 with 2.5 N, and spring 3 is squashed by 17.5 N. The walls carry 12.5 + 17.5 = 30 N, the total load.' }],
    },
    challenge: {
      prompt: 'Three blocks sit between two walls, joined by four springs with stiffnesses k(1) to k(4) from left to right. Store the 3 × 3 stiffness matrix K, the movements u = K\\f, and tension, a row with the force in each of the four springs.',
      setup: 'k = [200 100 100 200];\nf = [0; 30; 0];',
      starter: 'K = [k(1) 0 0; 0 k(2) 0; 0 0 k(3)];   % the springs between blocks are missing\nu = K\\f;\ntension = [k(1)*u(1) k(2)*(u(2)-u(1)) k(3)*(u(3)-u(2)) -k(4)*u(3)];',
      solution: t`K = [k(1)+k(2) -k(2) 0; -k(2) k(2)+k(3) -k(3); 0 -k(3) k(3)+k(4)];
u = K\f;
tension = [k(1)*u(1) k(2)*(u(2)-u(1)) k(3)*(u(3)-u(2)) -k(4)*u(3)];`,
      checks: [{ name: 'K', expected: [[300, -100, 0], [-100, 200, -100], [0, -100, 300]], tolerance: 1e-9, message: 'Each diagonal entry adds the two springs touching that block.' }, { name: 'u', expected: [0.075, 0.225, 0.075], tolerance: 1e-9, message: 'The middle block moves most; the others are pulled along.' }, { name: 'tension', expected: [[15, 15, -15, -15]], tolerance: 1e-9, message: 'Stiffness times stretch, spring by spring.' }],
      cases: [{ setup: 'k = [200 100 100 200];\nf = [30; 0; 0];', checks: [{ name: 'u', expected: [0.125, 0.075, 0.025], tolerance: 1e-9, message: 'Now the left block carries the load.' }] }],
      hints: ['Block 2 touches springs 2 and 3, so K(2,2) = k(2) + k(3).', 'Blocks 1 and 3 are not joined directly, so K(1,3) = 0.', 'K = [k(1)+k(2) -k(2) 0; -k(2) k(2)+k(3) -k(3); 0 -k(3) k(3)+k(4)];'],
      transfer: 'Double every stiffness. What happens to u and to the spring forces? Explain why the forces do not change although the movements do.',
    },
    notation: [
      { tex: t`K\mathbf u = \mathbf f, \qquad K = \begin{bmatrix} k_1 + k_2 & -k_2 \\ -k_2 & k_2 + k_3 \end{bmatrix}`, say: 'Stiffness times movements equals loads.' },
      { tex: t`\text{force in a spring} = k\,(u_{\text{right end}} - u_{\text{left end}})`, say: 'Positive is tension, negative is compression.' },
    ],
    quiz: [
      { q: 'What is the diagonal entry of K for a block touching springs of stiffness 30 and 70?', options: ['100', '−100', '30', '2100'], answer: 0, why: 'Both springs resist that block\'s movement, so their stiffnesses add.' },
      { q: 'Why is K symmetric?', options: ['The spring between blocks i and j affects both equally', 'Because every load is the same', 'Because u is a column', 'It is not always symmetric'], answer: 0, why: 'The spring pulls block i toward j exactly as hard as it pulls j toward i, so K(i,j) = K(j,i) = −k.' },
    ],
    uses: [
      { who: 'mech', title: 'Frames and trusses', story: 'Structural analysis programs model every beam and column as a stiff spring (with bending and twisting added), assemble K and solve K u = f for the deflections of the whole building.' },
      { who: 'general', title: 'Car suspensions', story: 'A car body on four springs and tyres is a small spring network. Its stiffness matrix tells how the body sinks and tilts when passengers get in.' },
      { who: 'ee', title: 'Circuits are the same equations', story: 'A ladder of resistors between two supply rails gives a matrix of exactly this pattern: conductances add on the diagonal, and minus the conductance links two nodes.' },
      { who: 'physics', title: 'Atoms in a crystal', story: 'Atoms held by bonds behave like masses on springs. The stiffness matrix of a crystal gives its elastic constants and, with masses, the speed of sound in it.' },
      { who: 'cs', title: 'Mesh smoothing and graph layout', story: 'Drawing a network by pretending its links are springs, and solving for the resting positions, uses a matrix with this pattern: the graph Laplacian.' },
    ],
    angles: [
      { title: 'Stiffness as a matrix of "how hard to push"', body: 'Column $j$ of $K$ lists the forces needed on every block to move block $j$ by 1 m while holding the others still. Moving block 1 alone stretches spring 1 and squashes spring 2: you push block 1 with $k_1 + k_2$ and must hold block 2 back with $-k_2$.' },
      { title: 'Energy in the springs', body: 'The stored energy is $\\tfrac12 \\sum k\\,(\\text{stretch})^2 = \\tfrac12\\,\\mathbf u^TK\\mathbf u$. With both walls fixed, any movement stretches some spring, so the energy is positive: $K$ is positive definite, and $K\\mathbf u = \\mathbf f$ always has exactly one solution.' },
    ],
  },
  {
    id: 'laml-eng-assembly', module: ENG, title: 'Assembling a stiffness matrix, spring by spring', minutes: 30, level: 'Advanced',
    why: { title: 'How Boeing let the computer write the equations', story: 'Writing a balance-of-forces equation by hand for every joint works for three blocks, not for an aircraft wing. In 1956 Jon Turner, Ray Clough, Harold Martin and LeRoy Topp, working on Boeing wings, published a recipe a computer could follow: give every piece its own small stiffness matrix and add each one into the big matrix at the rows and columns of the joints it connects. Fixed supports are then removed. This "direct stiffness method" is how every structural analysis program builds its equations today.' },
    objective: 'Build each spring\'s 2 × 2 element matrix, add it into a global stiffness matrix at its two joints, remove fixed supports, and solve for the free movements.',
    prose: [
      'Look at one spring on its own, joining joint i to joint j. Its force is k·(uj − ui). To hold it there, joint j must be pushed with +k·(uj − ui) and joint i with −k·(uj − ui). As a matrix: [Fi; Fj] = k * [1 −1; −1 1] * [ui; uj]. This is the spring\'s **element stiffness matrix**.',
      'Every spring has the same small pattern, only placed at different joints. So start with an all-zero K, one row and column per joint, walls included. For each spring, add k to K(i,i) and K(j,j), and subtract k from K(i,j) and K(j,i). That is the whole assembly. A branched network needs nothing new: a joint touched by three springs simply collects three contributions.',
      'The full K cannot be solved yet. Each row adds up to zero, so sliding every joint by the same amount gives K * u = 0: the whole structure can drift away, and K is singular. The walls stop that. Their movement is known (zero), so keep only the rows and columns of the free joints: Kf = K(free, free), and solve Kf * uf = f.',
      'Check with the chain of the previous lesson. Joints 1 and 4 are walls; springs join 1–2, 2–3 and 3–4. Assembling and keeping joints 2 and 3 gives [k1+k2, −k2; −k2, k2+k3] again. The recipe found the same equations without anyone writing a force balance.',
      'In code, name each spring\'s joints before using them: i = springs(s,1); j = springs(s,2). Writing u(springs(s,2)) in one go also works, but the names make the loop easier to read and to check.',
    ],
    procedure: ['List the springs as pairs of joints, walls included, with their stiffnesses.', 'Start from K = zeros(n,n); for each spring add k at (i,i) and (j,j) and subtract it at (i,j) and (j,i).', 'Keep the free rows and columns, Kf = K(free, free), and solve Kf*uf = f.'],
    prediction: { question: 'What is K*ones(n,1) for an assembled K, before any wall is removed?', answer: 'The zero vector. Moving every joint by the same amount stretches no spring, so no force is needed. That is why the full K is singular and the supports must be removed before solving.' },
    demo: {
      code: t`springs = [1 2; 2 3; 3 4];   % joints of each spring
k = [100 50 100];
K = zeros(4, 4);
${ASSEMBLE(3)}
disp(K)
slide = K*ones(4, 1)         % zero: the whole chain could drift
free = [2 3];                % joints 1 and 4 are walls
Kf = K(free, free)
f = [10; 20];
uf = Kf\f`,
      draw: t`x0 = [0 1 2 3];
x = x0;
x(free) = x0(free) + 2*uf;    % movements drawn twice as large
plot(x0, [0 0 0 0], 'o-')
hold on
plot(x, [-0.5 -0.5 -0.5 -0.5], 'o-')
title('Joints before and after loading (movement drawn 2×)')
xlabel('Position along the chain (m)'); legend('Unloaded', 'Loaded'); grid on`,
      explain: [{ code: 'K(i,j) = K(i,j) - k(s);', meaning: 'Each spring adds its 2 × 2 pattern at the rows and columns of its two joints.' }, { code: 'slide = K*ones(4, 1)', meaning: 'Every row adds to zero: sliding the whole chain needs no force.' }, { code: 'Kf = K(free, free)', meaning: 'Keep the free joints. This is the matrix of the previous lesson.' }, { code: 'uf = Kf\\f', meaning: 'The same movements as before: 0.125 m and 0.175 m.' }],
    },
    derive: {
      claim: t`Show that a spring of stiffness $k$ joining joints $i$ and $j$ has element matrix $k\begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix}$.`,
      given: t`The spring's tension is $T = k\,(u_j - u_i)$, with joint $j$ to the right of joint $i$. $F_i$ and $F_j$ are the forces you must apply at the joints to hold it.`,
      steps: [
        { ask: t`A stretched spring pulls joint $j$ to the left with force $T$. What must you apply at joint $j$ to hold it?`, options: [t`$F_j = T = k\,(u_j - u_i)$`, t`$F_j = -T$`, t`$F_j = 0$`], answer: 0, why: 'Your push must cancel the spring\'s pull.' },
        { ask: t`It pulls joint $i$ to the right with the same $T$. What must you apply at joint $i$?`, options: [t`$F_i = -T = k\,(u_i - u_j)$`, t`$F_i = T$`, t`$F_i = 2T$`], answer: 0, why: 'Equal and opposite: the spring pulls its two ends toward each other.' },
        { ask: t`Write $F_i = k u_i - k u_j$ and $F_j = -k u_i + k u_j$ as a matrix times $[u_i; u_j]$.`, options: [t`$k\begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix}$`, t`$k\begin{bmatrix} 1 & 1 \\ 1 & 1 \end{bmatrix}$`, t`$k\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}$`], answer: 0, why: 'Read the coefficients of $u_i$ and $u_j$ off each equation.' },
      ],
      conclusion: t`Every spring contributes this pattern at the rows and columns of its joints. Its rows add to zero, so moving both ends together, $u_i = u_j$, needs no force: a free spring can drift, which is why supports must be removed before solving.`,
    },
    challenge: {
      prompt: 'Joints 1 and 4 are walls; joints 2 and 3 are free. Five springs join the pairs of joints in the rows of springs, with stiffnesses k. Assemble the 4 × 4 matrix K, keep the free joints in Kf, and store their movements uf = Kf\\f.',
      setup: 'springs = [1 2; 1 3; 2 3; 2 4; 3 4];\nk = [100 100 50 100 100];\nf = [0; 60];',
      starter: t`K = zeros(4, 4);
for s = 1:5
  i = springs(s,1);
  j = springs(s,2);
  K(i,i) = K(i,i) + k(s);
  K(j,j) = K(j,j) + k(s);
end
free = [2 3];
Kf = K(free, free);
uf = Kf\f;`,
      solution: t`K = zeros(4, 4);
${ASSEMBLE(5)}
free = [2 3];
Kf = K(free, free);
uf = Kf\f;`,
      checks: [{ name: 'K', expected: [[200, -100, -100, 0], [-100, 250, -50, -100], [-100, -50, 250, -100], [0, -100, -100, 200]], tolerance: 1e-9, message: 'Each spring adds k on its two diagonal entries and subtracts k on its two off-diagonal ones.' }, { name: 'Kf', expected: [[250, -50], [-50, 250]], tolerance: 1e-9, message: 'Rows and columns 2 and 3.' }, { name: 'uf', expected: [0.05, 0.25], tolerance: 1e-9, message: 'Joint 3 carries the load and moves most.' }],
      cases: [{ setup: 'springs = [1 2; 1 3; 2 3; 2 4; 3 4];\nk = [100 100 50 100 100];\nf = [30; 30];', checks: [{ name: 'uf', expected: [0.15, 0.15], tolerance: 1e-9, message: 'Equal loads on a symmetric network: equal movements.' }] }],
      hints: ['The starter forgets the off-diagonal entries.', 'Subtract k(s) at K(i,j) and at K(j,i).', 'Then Kf = K(free, free); uf = Kf\\f;'],
      transfer: 'Remove the spring between joints 2 and 3 and solve again. Which joint moves more, and why does the other joint not move at all?',
    },
    notation: [
      { tex: t`K_e = k\begin{bmatrix} 1 & -1 \\ -1 & 1 \end{bmatrix}`, say: 'One spring\'s element stiffness matrix.' },
      { tex: t`K = \sum_{\text{springs}} (\text{each } K_e \text{ placed at its joints}), \qquad K_{ff}\,\mathbf u_f = \mathbf f`, say: 'Assemble, then keep the free joints and solve.' },
    ],
    quiz: [
      { q: 'Why is the assembled K singular before the walls are removed?', options: ['Sliding every joint together stretches nothing', 'Because K is symmetric', 'Because some stiffnesses are equal', 'It is never singular'], answer: 0, why: 'K times a vector of ones is zero, so K has no inverse.' },
      { q: 'A joint is touched by three springs of stiffness 10, 20 and 30. Its diagonal entry is…', options: ['60', '30', '−60', '6000'], answer: 0, why: 'Each spring adds its k to the diagonal entries of both its joints.' },
    ],
    uses: [
      { who: 'mech', title: 'Every structural program', story: 'Frame, truss and finite-element programs loop over their elements exactly like this: compute a small element matrix, add it into the global K at the element\'s joints.' },
      { who: 'cs', title: 'Sparse matrices', story: 'A joint only connects to its neighbours, so almost every entry of K is zero. Sparse-matrix formats and solvers exist largely because of matrices assembled this way.' },
      { who: 'ee', title: 'Nodal analysis', story: 'Circuit simulators such as SPICE "stamp" each resistor\'s conductance pattern [g −g; −g g] into a matrix at its two nodes, and ground one node, exactly as walls are removed here.' },
      { who: 'general', title: 'Bridges and towers', story: 'A pylon or a crane is a few hundred steel bars. Assembling one 2 × 2 (or, in 3D, 6 × 6) pattern per bar gives the equations for the whole structure in a fraction of a second.' },
    ],
    angles: [
      { title: 'Why the wall rows are dropped', body: 'Write the full system with the wall movements known to be zero. Their columns multiply zeros, so they drop out of every equation. Their rows are not needed to find $\\mathbf u_f$; they come back in the capstone to give the forces the walls supply.' },
      { title: 'One loop, any shape', body: 'Nothing in the loop knows that the chain is a chain. Change the list of springs to a triangle, a grid or a bridge, and the same lines build the right $K$. That is why the method won: the computer does the bookkeeping.' },
    ],
  },
  {
    id: 'laml-eng-fem', module: ENG, title: 'Finite elements: heat in a wire', minutes: 30, level: 'Advanced',
    why: { title: 'From springs to smooth things', story: 'A wire carrying current warms up along its whole length, while its ends, clamped to big metal terminals, stay cool. How hot does the middle get? There are no joints and springs here, just a smooth temperature curve. In 1943 Richard Courant suggested cutting such a problem into small pieces with a straight line on each, and in 1960 Ray Clough named the idea the finite element method. Each piece behaves like a spring for heat, and the assembly is the one from the previous lesson.' },
    objective: 'Cut a heated rod into N elements, assemble the same three-diagonal matrix as a chain of springs, solve for the temperatures at the joints, and compare with the exact curve.',
    prose: [
      'A rod of length L generates heat q (watts per metre) all along it, and both ends are held at 0 (room temperature, say). Heat flows from hot to cold at a rate proportional to the temperature difference, with conductivity kappa. The steady temperature is the curve T(x) = q·x·(L − x)/(2·kappa): a hump, hottest in the middle.',
      'Cut the rod into N equal elements of length h = L/N, with joints at x = h, 2h, …, (N − 1)h. Inside each element, assume the temperature is a straight line between its two joint values. Then the heat flowing through an element is (kappa/h)·(difference of its end temperatures), exactly like a spring with stiffness kappa/h.',
      'Each element generates q·h of heat, and half of it is assigned to each end joint, so every free joint receives q·h. Assembling the elements as springs gives (kappa/h) times the matrix with 2 on the diagonal and −1 beside it, and K * T = F with every entry of F equal to q·h. The two end joints are held at 0, like walls, and are removed.',
      'Solve with a backslash. For this problem something lucky happens: the joint temperatures match the exact curve exactly, for any N. Between the joints, the straight lines only approximate the hump, and more elements make them follow it more closely. For harder shapes and loads, the joint values are approximate too, and engineers refine the mesh until the answer stops changing.',
      'The same matrix appears for a bar stretched by its own weight, a cable sagging under load and the voltage along a leaky cable. Two- and three-dimensional problems use triangles or bricks instead of segments, but the recipe is the same: element matrices, assembly, remove the fixed values, solve.',
    ],
    procedure: ['Choose N elements of length h = L/N; the unknowns are the N − 1 inside joints.', 'Build K = (kappa/h) times the matrix with 2 on the diagonal and −1 beside it, and F = q*h for every joint.', 'Solve T = K\\F and compare with the exact curve q*x.*(L − x)/(2*kappa).'],
    prediction: { question: 'With the rod cut into 4 elements, is the middle joint\'s temperature from the elements below, equal to or above the exact value?', answer: 'Equal. For a uniform load on a rod, straight-line elements give exactly the right values at the joints. The error is only between joints, where a straight line cannot follow the hump.' },
    demo: {
      code: t`L = 1;          % length (m)
kappa = 1;      % conductivity
q = 8;          % heat generated per metre
N = 4;          % elements
h = L/N;
n = N - 1;      % inside joints
K = zeros(n, n);
for i = 1:n
  K(i,i) = 2;
  if i > 1
    K(i,i-1) = -1;
  end
  if i < n
    K(i,i+1) = -1;
  end
end
K = (kappa/h)*K;
F = q*h*ones(n, 1);
T = K\F
exact = q*(h:h:L-h).*(L-(h:h:L-h))/(2*kappa)`,
      draw: t`x = linspace(0, L, 101);
plot(x, q*x.*(L-x)/(2*kappa))
hold on
nodes = 0:h:L;
Tall = zeros(1, N + 1);
Tall(2:N) = T;
plot(nodes, Tall, 'o-')
title('Exact temperature and 4 finite elements')
xlabel('Position (m)'); ylabel('Temperature rise'); legend('Exact', 'Finite elements'); grid on`,
      explain: [{ code: 'K = (kappa/h)*K;', meaning: 'Each element is a spring for heat with stiffness kappa/h.' }, { code: 'F = q*h*ones(n, 1);', meaning: 'Each joint receives half the heat of the element on either side: q·h in all.' }, { code: 'T = K\\F', meaning: 'Temperatures 0.75, 1 and 0.75 at the three joints.' }, { code: 'exact = q*(h:h:L-h).*(L-(h:h:L-h))/(2*kappa)', meaning: 'The exact curve at the same points: identical.' }],
    },
    challenge: {
      prompt: 'A rod of length L with conductivity kappa generates heat q per metre, and both ends are held at 0. Cut it into N elements. Store the stiffness matrix K for the inside joints and their temperatures T = K\\F, where every entry of F is q*h.',
      setup: 'L = 2;\nkappa = 4;\nq = 3;\nN = 5;',
      starter: t`h = L/N;
n = N - 1;
K = zeros(n, n);
for i = 1:n
  K(i,i) = 2;
  if i > 1
    K(i,i-1) = -1;
  end
  if i < n
    K(i,i+1) = -1;
  end
end
F = q*h*ones(n, 1);
T = K\F;`,
      solution: t`h = L/N;
n = N - 1;
K = zeros(n, n);
for i = 1:n
  K(i,i) = 2;
  if i > 1
    K(i,i-1) = -1;
  end
  if i < n
    K(i,i+1) = -1;
  end
end
K = (kappa/h)*K;
F = q*h*ones(n, 1);
T = K\F;`,
      checks: [{ name: 'K', expected: [[20, -10, 0, 0], [-10, 20, -10, 0], [0, -10, 20, -10], [0, 0, -10, 20]], tolerance: 1e-9, message: 'Scale the pattern by kappa/h = 10.' }, { name: 'T', expected: [0.24, 0.36, 0.36, 0.24], tolerance: 1e-9, message: 'These match q*x*(L − x)/(2*kappa) at the joints.' }],
      cases: [{ setup: 'L = 2;\nkappa = 4;\nq = 6;\nN = 5;', checks: [{ name: 'T', expected: [0.48, 0.72, 0.72, 0.48], tolerance: 1e-9, message: 'Twice the heat, twice the temperature rise.' }] }],
      hints: ['The starter builds the pattern but forgets the element stiffness.', 'Each element conducts like a spring of stiffness kappa/h.', 'Add K = (kappa/h)*K; before solving.'],
      transfer: 'Put all the heat in the middle joint instead (a small heater), with F zero elsewhere. Sketch the temperature curve you expect, then solve and compare. Is it still a smooth hump?',
    },
    notation: [
      { tex: t`-\kappa\,T''(x) = q, \quad T(0) = T(L) = 0 \quad\Rightarrow\quad T(x) = \frac{q\,x\,(L - x)}{2\kappa}`, say: 'The heated rod and its exact temperature.' },
      { tex: t`\frac{\kappa}{h}\begin{bmatrix} 2 & -1 & & \\ -1 & 2 & -1 & \\ & \ddots & \ddots & \ddots \\ & & -1 & 2 \end{bmatrix}\mathbf T = q\,h\,\mathbf 1`, say: 'The assembled finite element equations for the inside joints.' },
    ],
    quiz: [
      { q: 'Each element of length h behaves like a spring of stiffness…', options: ['kappa/h', 'kappa·h', 'h/kappa', 'kappa'], answer: 0, why: 'Heat flow is kappa times the temperature difference divided by the length it crosses.' },
      { q: 'Doubling the number of elements…', options: ['makes the straight pieces follow the curve more closely between joints', 'changes the exact answer', 'makes K smaller', 'doubles every temperature'], answer: 0, why: 'More, shorter pieces approximate the curve better; the physics is unchanged.' },
    ],
    uses: [
      { who: 'mech', title: 'Stress and heat in parts', story: 'Engine blocks, turbine blades and brake discs are checked with finite elements: millions of small bricks, each with its own element matrix, assembled into one huge sparse system.' },
      { who: 'ee', title: 'Electric fields and heating', story: 'Motor and transformer designers use finite elements to find magnetic fields, and cable engineers to find how hot a buried cable runs at full current.' },
      { who: 'physics', title: 'Fields of every kind', story: 'Gravity, electrostatics, groundwater flow and diffusion all obey equations like $-\\kappa T\'\' = q$. One finite element program can solve all of them.' },
      { who: 'math', title: 'Weak form and Galerkin', story: 'The method can be derived by asking the error to be perpendicular to every allowed straight-line shape: a projection, the same idea as least squares, in a space of functions.' },
    ],
    angles: [
      { title: 'A second difference is a second derivative', body: 'Row $i$ of the matrix reads $(-T_{i-1} + 2T_i - T_{i+1})/h^2$, which is minus the second difference of $T$. For small $h$ it approaches $-T\'\'(x_i)$. So $\\tfrac{\\kappa}{h}(\\ldots) = q h$ is $-\\kappa T\'\' = q$ with derivatives replaced by differences.' },
      { title: 'Why more elements help', body: 'Between joints the straight line misses the hump by at most about $q h^2/(8\\kappa)$. Halving $h$ cuts that error by four. Engineers watch the answer as the mesh is refined and stop when it no longer changes.' },
    ],
  },
  {
    id: 'laml-eng-capstone', module: ENG, title: 'Capstone: support forces and a design check', minutes: 35, level: 'Capstone',
    why: { title: 'The questions an engineer signs off', story: 'In 1981 two walkways in the Hyatt Regency hotel in Kansas City fell during a dance, killing 114 people. A late change to how the walkways hung from their rods had doubled the load on one connection, and nobody rechecked it. An engineer signing off a design answers three questions: how far does it move, how hard does it push on its supports, and is any member carrying more than it can? With the assembled stiffness matrix all three answers are a few lines of code away.' },
    objective: 'Solve an assembled spring network, put the free movements back into the full vector, compute the forces the walls supply, check equilibrium, and compare every member force with its allowed limit.',
    prose: [
      'After solving Kf * uf = f, build the full movement vector u, one entry per joint, with zeros at the walls and uf at the free joints: u = zeros(n, 1); u(free) = uf.',
      'Now use the rows that were dropped. R = K * u gives, at each joint, the total force the springs need there. At a free joint it equals the load. At a wall it is the force the wall must supply: the **reaction**. Reactions are what the supports, bolts and foundations must be designed for.',
      'Check the result with physics. The structure as a whole is at rest, so the loads and the reactions must cancel: sum(reactions) + sum(f) = 0. If they do not, something was assembled wrongly. Engineers make this check every time.',
      'Each spring\'s force is its stiffness times its stretch: k(s) * (u(j) − u(i)) for the spring from joint i to joint j. Divide the largest size of force by the allowed force to get the **utilisation**. Below 1 the design passes; above 1 a member is overloaded and must be made stronger, or the load must be shared differently.',
      'A design check uses an allowed force well below the force that breaks the member: the ratio between them is the safety factor. It covers the uncertainty in loads, materials and construction, which is exactly what failed in Kansas City.',
    ],
    procedure: ['Assemble K, keep the free joints and solve Kf*uf = f.', 'Fill the full u with zeros at the walls, then reactions = the wall entries of K*u; check sum(reactions) + sum(f) ≈ 0.', 'Compute each spring force k*(u(j) − u(i)) and the utilisation max(abs(force))/allowed.'],
    prediction: { question: 'A network carries a total load of 60 N to the right. What must its two wall reactions add up to?', answer: '−60 N: together the walls push back by exactly the total load, or the structure would accelerate. How the 60 N is shared between them depends on the stiffnesses.' },
    demo: {
      code: t`springs = [1 2; 2 3; 3 4];
k = [100 50 100];
K = zeros(4, 4);
${ASSEMBLE(3)}
free = [2 3];
fixed = [1 4];
f = [10; 20];
uf = K(free, free)\f;
u = zeros(4, 1);
u(free) = uf;
R = K*u;
reactions = R(fixed)
balance = sum(reactions) + sum(f)
force = zeros(1, 3);
for s = 1:3
  i = springs(s,1);
  j = springs(s,2);
  force(s) = k(s)*(u(j) - u(i));
end
allowed = 15;
utilisation = max(abs(force))/allowed`,
      draw: t`bar(1:3, abs(force)/allowed)
hold on
plot([0.5 3.5], [1 1])
title('Utilisation of each spring: above 1 is overloaded')
xlabel('Spring'); ylabel('|force| / allowed'); legend('Spring', 'Limit'); grid on`,
      explain: [{ code: 'u(free) = uf;', meaning: 'Free movements go back into the full vector; the walls stay at 0.' }, { code: 'reactions = R(fixed)', meaning: 'The walls supply −12.5 N and −17.5 N.' }, { code: 'balance = sum(reactions) + sum(f)', meaning: 'Zero: the loads and reactions cancel, so the assembly is consistent.' }, { code: 'utilisation = max(abs(force))/allowed', meaning: '17.5/15 ≈ 1.17: spring 3 is overloaded. Stiffen it, or share the load differently.' }],
    },
    challenge: {
      prompt: 'Use the five-spring network from the assembly lesson: joints 1 and 4 are walls, the rows of springs list each spring\'s joints, k their stiffnesses and f the loads on joints 2 and 3. Store the full movement vector u (zeros at the walls), the wall reactions (joint 1, then joint 4), a row force with each spring\'s force, and utilisation = max(abs(force))/allowed.',
      setup: 'springs = [1 2; 1 3; 2 3; 2 4; 3 4];\nk = [100 100 50 100 100];\nf = [0; 60];\nallowed = 20;',
      starter: t`K = zeros(4, 4);
${ASSEMBLE(5)}
free = [2 3];
uf = K(free, free)\f;
u = zeros(4, 1);
u(free) = uf;
reactions = [0; 0];
force = zeros(1, 5);
utilisation = 0;`,
      solution: t`K = zeros(4, 4);
${ASSEMBLE(5)}
free = [2 3];
fixed = [1 4];
uf = K(free, free)\f;
u = zeros(4, 1);
u(free) = uf;
R = K*u;
reactions = R(fixed);
force = zeros(1, 5);
for s = 1:5
  i = springs(s,1);
  j = springs(s,2);
  force(s) = k(s)*(u(j) - u(i));
end
utilisation = max(abs(force))/allowed;`,
      checks: [{ name: 'u', expected: [0, 0.05, 0.25, 0], tolerance: 1e-9, message: 'Zeros at the walls, the solved movements in between.' }, { name: 'reactions', expected: [-30, -30], tolerance: 1e-9, message: 'The wall rows of K*u. Together they cancel the 60 N load.' }, { name: 'force', expected: [5, 25, 10, -5, -25], tolerance: 1e-9, message: 'k times (movement of the second joint − movement of the first).' }, { name: 'utilisation', expected: 1.25, tolerance: 1e-9, message: 'The largest force is 25 N against an allowed 20 N.' }],
      cases: [{ setup: 'springs = [1 2; 1 3; 2 3; 2 4; 3 4];\nk = [100 100 50 100 100];\nf = [30; 30];\nallowed = 50;', checks: [{ name: 'reactions', expected: [-30, -30], tolerance: 1e-9, message: 'The same total load, shared the same way.' }, { name: 'force', expected: [15, 15, 0, -15, -15], tolerance: 1e-9, message: 'With equal movements the middle spring is not stretched.' }, { name: 'utilisation', expected: 0.3, tolerance: 1e-9, message: 'This design passes comfortably.' }] }],
      hints: ['Reactions are the wall rows of K*u: R = K*u; reactions = R(fixed);', 'Name the joints in the loop: i = springs(s,1); j = springs(s,2);', 'force(s) = k(s)*(u(j) - u(i)); then utilisation = max(abs(force))/allowed;'],
      transfer: 'The design fails with utilisation 1.25. Change one stiffness so that the largest force drops below 20 N while the total load stays the same. Which spring did you change, and why does stiffening a spring increase its share of the load?',
    },
    notation: [
      { tex: t`\mathbf R = K\mathbf u, \qquad \textstyle\sum \text{reactions} + \sum \text{loads} = 0`, say: 'Reactions from the dropped rows, and the equilibrium check.' },
      { tex: t`\text{utilisation} = \dfrac{\max_s |F_s|}{F_{\text{allowed}}} \le 1`, say: 'The design check: no member above its allowed force.' },
    ],
    quiz: [
      { q: 'At a free joint, what does the entry of K*u equal?', options: ['The load applied there', 'Zero', 'The reaction', 'The movement'], answer: 0, why: 'That row is the equation Kf*uf = f that was solved.' },
      { q: 'sum(reactions) + sum(loads) comes out as 40 N. What does that tell you?', options: ['Something was assembled or indexed wrongly', 'The structure is safe', 'The walls are too stiff', 'Nothing: it is never zero'], answer: 0, why: 'A structure at rest has zero total force on it; a mismatch is an error in the model.' },
    ],
    uses: [
      { who: 'mech', title: 'Foundation and bolt design', story: 'Reactions from the structural model set the size of foundations, base plates and anchor bolts. They are the first numbers passed from the structural engineer to the next designer.' },
      { who: 'general', title: 'Load ratings', story: 'The maximum load printed on a shelf bracket, a ladder or a crane is the load at which the most stressed member reaches its allowed force, with a safety factor already applied.' },
      { who: 'ee', title: 'Current in each branch', story: 'In a resistor network, the same steps give the current in every resistor and the current drawn from each supply; each resistor\'s power is then checked against its rating.' },
      { who: 'cs', title: 'Checking a solver', story: 'Equilibrium checks like sum(reactions) + sum(loads) = 0 are the test cases of structural software: a cheap independent check that catches indexing and assembly bugs.' },
    ],
    angles: [
      { title: 'Stiffer springs attract load', body: 'Springs side by side share a load in proportion to their stiffness. Making one stiffer does not protect it: it takes a larger share. Designers sometimes soften a member deliberately so that a stronger one nearby carries more.' },
      { title: 'Two uses of one matrix', body: 'The free rows of $K$ give the equations for the unknown movements. The fixed rows, unused in the solve, give the reactions once the movements are known. Nothing new needs to be computed.' },
    ],
  },
]
