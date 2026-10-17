// Spectral theory: diagonalization, complex eigenvalues (taught with real arithmetic), positive-definite
// matrices and the spectral theorem behind the SVD. These follow the applied spectral lessons.
// OpenMAT notes: a transpose quote and a string literal on the same line confuse the parser, so
// transposes sit on their own lines.
export const spectralTheory = [
  {
    id: 'laml-diagonalization', after: 'laml-vibrations', module: 'Directions that don\'t turn', title: 'Diagonalization: powers become easy', minutes: 35, level: 'Advanced',
    why: { title: 'A hundred steps in one', story: 'Rabbit populations, loan balances and Markov chains are all one matrix applied over and over. Multiplying a hundred times is slow and hides what is going on. Rewrite the matrix in its eigenvector directions and each direction just multiplies by its own number, so a hundred steps is a hundred powers of plain numbers, and the long-run winner is plain to see.' },
    objective: 'Factor a matrix as A = V·D·V⁻¹, use it to compute powers, and explain long-run growth from the largest eigenvalue.',
    prose: [
      'Rabbit pairs breed in the Fibonacci pattern: each month\'s count is the sum of the previous two. Starting 1, 1 gives 2, 3, 5, 8, 13. Store the last two counts in a vector. Then one month later is A times that vector, with A = [1 1; 1 0].',
      'Twelve months ahead is A¹² times the start. Multiplying by A twelve times works, but it hides why the counts grow by roughly 1.618 every month. The eigenvalues of A explain it. An earlier lesson showed that a matrix acts on an eigenvector by simply scaling it.',
      'Collect the eigenvectors of A as the columns of V, and the eigenvalues on the diagonal of D. Then A = V·D·V⁻¹. This is the change-of-basis picture: in eigenvector coordinates, A is just the diagonal matrix D. Writing A this way is called **diagonalization**.',
      'Powers become easy because the inner V⁻¹·V pairs cancel. A² = V·D·V⁻¹·V·D·V⁻¹ = V·D²·V⁻¹, and in general Aᵏ = V·Dᵏ·V⁻¹. Powering a diagonal matrix powers each diagonal entry. For Fibonacci, D has entries 1.618 and −0.618, and (−0.618)ᵏ dies away, so the ratio of consecutive counts approaches 1.618.',
      'Not every matrix can be diagonalized. The shear [1 1; 0 1] has only one eigenvector direction, so V would have dependent columns and no inverse. Symmetric matrices are always diagonalizable, which a later lesson proves. In OpenMAT, `[V, D] = eig(A)` returns both factors, with eigenvalues in increasing order.',
    ],
    procedure: ['Compute [V, D] = eig(A) and check that V is invertible (rank n).', 'Write A^k = V * D^k * inv(V); D^k powers each diagonal entry.', 'For large k, the eigenvalue of largest size dominates, so it sets the growth rate.'],
    prediction: { question: 'If the start vector were exactly an eigenvector of A, how would the Fibonacci-style sequence grow?', answer: 'By exactly the same factor every month, with no settling-in period: each step multiplies the vector by its eigenvalue.' },
    demo: {
      code: String.raw`A = [1 1; 1 0];
[V, D] = eig(A);
k = 10;
direct = A^k;
viaEigen = V*D^k*inv(V);
disp('Eigenvalues:'); disp(diag(D))
disp('A^10 directly:'); disp(direct)
disp('A^10 from the eigen-decomposition:'); disp(viaEigen)
f = zeros(1,15);
f(1) = 1;
f(2) = 1;
for n = 3:15
  f(n) = f(n-1) + f(n-2);
end
ratio = f(2:15)./f(1:14);
plot(2:15, ratio)
title('The growth ratio approaches the largest eigenvalue')
xlabel('Month n')
ylabel('f(n) / f(n-1)')`,
      explain: [{ code: '[V, D] = eig(A);', meaning: 'Columns of V are eigenvectors; D holds the matching eigenvalues on its diagonal.' }, { code: 'viaEigen = V*D^k*inv(V);', meaning: 'Power only the diagonal, then change basis back. It matches A^10.' }, { code: 'ratio = f(2:15)./f(1:14);', meaning: 'Divide each count by the one before it, entry by entry.' }],
    },
    challenge: {
      prompt: 'Diagonalize A with [V, D] = eig(A). Store lambda (the eigenvalues as a vector), P = V*D*inv(V) (which should rebuild A), and x5 = A^5*x0 computed through the decomposition.',
      setup: 'A = [2 1; 1 2];\nx0 = [1; 0];',
      starter: 'lambda = [0; 0];\nP = zeros(2);\nx5 = x0;',
      solution: '[V, D] = eig(A);\nlambda = diag(D);\nP = V*D*inv(V);\nx5 = V*D^5*inv(V)*x0;',
      checks: [{ name: 'lambda', expected: [1, 3], tolerance: 1e-6, message: 'Read the diagonal of D; eig returns eigenvalues in increasing order.' }, { name: 'P', expected: [[2, 1], [1, 2]], tolerance: 1e-6, message: 'V*D*inv(V) must rebuild A.' }, { name: 'x5', expected: [122, 121], tolerance: 1e-6, message: 'Power the diagonal: D^5 has entries 1 and 243.' }],
      cases: [{ setup: 'A = [2 1; 1 2];\nx0 = [0; 1];', checks: [{ name: 'x5', expected: [121, 122], tolerance: 1e-6, message: 'A new start vector, same decomposition.' }] }],
      hints: ['Two outputs from eig: [V, D] = eig(A).', 'diag(D) extracts the diagonal as a vector. A^5 = V*D^5*inv(V).', '[V, D] = eig(A); lambda = diag(D); P = V*D*inv(V); x5 = V*D^5*inv(V)*x0;'],
      transfer: 'Compute A^20*x0 both directly and through the decomposition, and compare their sizes with 3^20. Explain why the eigenvalue 1 stops mattering.',
    },
    notation: [
      { tex: String.raw`A = VDV^{-1}, \qquad D = \begin{bmatrix} \lambda_1 & \\ & \lambda_2 \end{bmatrix}`, say: 'Eigenvectors as columns of $V$, eigenvalues on the diagonal of $D$.' },
      { tex: String.raw`A^k = VD^kV^{-1}, \qquad D^k = \begin{bmatrix} \lambda_1^k & \\ & \lambda_2^k \end{bmatrix}`, say: 'Powers only touch the diagonal.' },
      { tex: String.raw`\frac{f_{n+1}}{f_n} \to \lambda_{\max} = \frac{1+\sqrt5}{2} \approx 1.618`, say: 'The largest eigenvalue sets the long-run growth rate.' },
    ],
    quiz: [
      { q: 'Which matrix cannot be diagonalized?', options: ['$\\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}$', '$\\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}$', '$\\begin{bmatrix} 3 & 0 \\\\ 0 & 5 \\end{bmatrix}$', '$\\begin{bmatrix} 1 & 1 \\\\ 1 & 0 \\end{bmatrix}$'], answer: 0, why: 'The shear has the repeated eigenvalue 1 but only one eigenvector direction, so $V$ would not be invertible.' },
      { q: '$A$ has eigenvalues 0.5 and 2. What happens to $A^k\\mathbf x$ for a typical $\\mathbf x$ as $k$ grows?', options: ['It grows like $2^k$ along the eigenvector for 2', 'It shrinks to zero', 'It stays the same size', 'It oscillates'], answer: 0, why: 'The $0.5^k$ part vanishes and the $2^k$ part dominates.' },
    ],
    proof: {
      claim: 'If $A = VDV^{-1}$, then $A^k = VD^kV^{-1}$ for every $k \\ge 1$.',
      steps: [
        { ask: 'Write out $A^2$.', options: ['$VDV^{-1}\\,VDV^{-1}$', '$V^2D^2V^{-2}$', '$VD^2V$'], answer: 0, why: '$A^2$ means $A$ times $A$; substitute the factorization for each.' },
        { ask: 'Simplify the middle of that product.', options: ['$V^{-1}V = I$, so $A^2 = VD^2V^{-1}$', 'All the $V$s cancel, so $A^2 = D^2$', '$V^{-1}V = V$'], answer: 0, why: 'Only the adjacent pair $V^{-1}V$ cancels; the outer $V$ and $V^{-1}$ remain.', hint: 'Which two factors sit next to each other?' },
        { ask: 'How does this extend to every $k$?', options: ['If $A^k = VD^kV^{-1}$, then $A^{k+1} = VD^kV^{-1}VDV^{-1} = VD^{k+1}V^{-1}$', 'It only works for even $k$', 'The eigenvectors must be recomputed for each $k$'], answer: 0, why: 'Each extra factor of $A$ creates one more cancelling pair: this is induction.' },
      ],
      conclusion: 'Powers of $A$ reduce to powers of the eigenvalues. The largest $|\\lambda|$ therefore controls long-run behaviour, which is why Fibonacci numbers grow like $1.618^k$.',
    },
  },
  {
    id: 'laml-complex-eigen', after: 'laml-diagonalization', module: 'Directions that don\'t turn', title: 'When no direction survives: rotation and spirals', minutes: 35, level: 'Advanced',
    why: { title: 'Things that go round', story: 'Predator and prey populations rise and fall in turn. A swinging door settles with a few shrinking swings. A camera\'s image stabiliser fights a wobble. In each, no direction is left unturned, so there are no real eigenvectors: the matrix turns everything. The trace and determinant still tell you how fast it turns and whether the swings grow or die away.' },
    objective: 'Detect complex eigenvalues from the trace and determinant, and read off the turning angle and growth factor of a spiral.',
    prose: [
      'Foxes and rabbits push each other\'s numbers up and down. Track their deviations from equilibrium as a vector. A simple model turns that vector by 20° each season and shrinks it by 5%. Plotted season by season, the points spiral into the centre.',
      'Look for an eigenvector: a direction that the model only stretches. There is none. Every direction gets turned by 20°. So this matrix has no real eigenvalues. Its eigenvalues are **complex numbers**, and we can understand them without complex arithmetic.',
      'For a 2 × 2 matrix, eigenvalues solve λ² − (trace)·λ + det = 0. Here the **trace** is the sum of the diagonal entries. The quadratic has real roots only when trace² − 4·det ≥ 0. A negative value of trace² − 4·det is the signal for turning.',
      'When the roots are complex, two numbers describe the motion. The size of each eigenvalue is √det, here 0.95: each step multiplies lengths by that factor on average. The turning angle θ satisfies cos θ = trace / (2·√det), here 20°.',
      'Size decides the long run. Below 1, the spiral winds inward and the system settles. Exactly 1, it circles forever. Above 1, it spirals outward and blows up. Engineers read stability from these two numbers without ever simulating the system.',
    ],
    procedure: ['Compute the trace, the determinant and the discriminant trace² − 4·det.', 'If the discriminant is negative, the eigenvalues are complex: size √det, angle acos(trace/(2√det)).', 'Size below 1 spirals in, equal to 1 circles, above 1 spirals out.'],
    prediction: { question: 'A matrix has trace 0 and determinant 4. Without simulating, describe what repeated multiplication does to a vector.', answer: 'The discriminant is −16, so it turns. The size is √4 = 2 and cos θ = 0, so each step turns 90° and doubles the length: an outward spiral.' },
    demo: {
      code: String.raw`r = 0.95;
theta = pi/9;
A = r*[cos(theta) -sin(theta); sin(theta) cos(theta)];
tr = trace(A);
dt = det(A);
disc = tr^2 - 4*dt;
modulus = sqrt(dt);
angleDeg = acos(tr/(2*modulus))*180/pi;
disp('Trace, determinant, discriminant:'); disp([tr dt disc])
disp('Size and turning angle in degrees:'); disp([modulus angleDeg])
X = zeros(2,40);
X(:,1) = [4; 0];
for k = 2:40
  X(:,k) = A*X(:,k-1);
end
plot(X(1,:), X(2,:))
title('Each season turns 20 degrees and shrinks by 5 percent')
xlabel('Rabbit deviation')
ylabel('Fox deviation')
axis equal`,
      explain: [{ code: 'disc = tr^2 - 4*dt;', meaning: 'Negative, so the characteristic quadratic has no real roots: no direction is kept.' }, { code: 'modulus = sqrt(dt);', meaning: 'The size of the complex eigenvalues: the average stretch per step.' }, { code: 'X(:,k) = A*X(:,k-1);', meaning: 'Apply one season to the previous column, filling the spiral one point at a time.' }],
    },
    challenge: {
      prompt: 'For A, store disc = trace(A)^2 - 4*det(A), modulus = sqrt(det(A)), and angleDeg, the turning angle in degrees. Compute them from the trace and determinant so the same code works for other matrices.',
      setup: 'A = [0.6 -0.8; 0.8 0.6];',
      starter: 'disc = 0;\nmodulus = 0;\nangleDeg = 0;',
      solution: 'tr = trace(A);\ndt = det(A);\ndisc = tr^2 - 4*dt;\nmodulus = sqrt(dt);\nangleDeg = acos(tr/(2*modulus))*180/pi;',
      checks: [{ name: 'disc', expected: -2.56, tolerance: 1e-6, message: 'trace is 1.2 and det is 1.' }, { name: 'modulus', expected: 1, tolerance: 1e-6, message: 'The size is the square root of the determinant.' }, { name: 'angleDeg', expected: Math.acos(0.6) * 180 / Math.PI, tolerance: 1e-5, message: 'cos θ = trace / (2·size); convert radians to degrees.' }],
      cases: [{ setup: 'A = [0 -2; 2 0];', checks: [{ name: 'disc', expected: -16, tolerance: 1e-6, message: 'trace 0, det 4.' }, { name: 'modulus', expected: 2, tolerance: 1e-6, message: 'This one doubles lengths.' }, { name: 'angleDeg', expected: 90, tolerance: 1e-5, message: 'A quarter turn each step.' }] }],
      hints: ['trace(A) adds the diagonal; det(A) is the determinant.', 'The size is sqrt(det(A)); cos of the angle is trace/(2*size).', 'tr = trace(A); dt = det(A); disc = tr^2 - 4*dt; modulus = sqrt(dt); angleDeg = acos(tr/(2*modulus))*180/pi;'],
      transfer: 'Find a matrix whose spiral turns 45° per step and grows by 10%. Check your matrix with the three formulas, then plot 20 steps of it.',
    },
    notation: [
      { tex: String.raw`\lambda^2 - (\operatorname{tr}A)\,\lambda + \det A = 0`, say: 'The eigenvalue equation of a $2\\times2$ matrix.' },
      { tex: String.raw`(\operatorname{tr}A)^2 < 4\det A \;\Longrightarrow\; \lambda = r e^{\pm i\theta}`, say: 'A negative discriminant means complex eigenvalues: a turn by $\\theta$ and a stretch by $r$.' },
      { tex: String.raw`r = \sqrt{\det A}, \qquad \cos\theta = \frac{\operatorname{tr}A}{2r}`, say: 'Both numbers come from the trace and determinant alone.' },
    ],
    quiz: [
      { q: 'A $2\\times2$ matrix has trace 2 and determinant 5. What does it do?', options: ['Turns and grows: complex eigenvalues of size $\\sqrt5$', 'Stretches two real directions', 'Turns and shrinks', 'Nothing: it is the identity'], answer: 0, why: '$2^2 - 20 < 0$, so the eigenvalues are complex with size $\\sqrt5 > 1$.' },
      { q: 'The complex eigenvalues have size exactly 1. What does repeated multiplication do?', options: ['Points keep circling at the same average distance', 'Points spiral to the origin', 'Points fly off to infinity', 'Points stop after one step'], answer: 0, why: 'Size 1 means lengths neither grow nor shrink in the long run.' },
    ],
    proof: {
      claim: 'A real $2\\times2$ matrix with $(\\operatorname{tr}A)^2 < 4\\det A$ has no real eigenvalue, so no direction is kept.',
      given: 'An eigenvalue $\\lambda$ satisfies $\\lambda^2 - (\\operatorname{tr}A)\\lambda + \\det A = 0$.',
      steps: [
        { ask: 'This is a quadratic $\\lambda^2 + b\\lambda + c = 0$. When does it have a real root?', options: ['When $b^2 - 4c \\ge 0$', 'Always', 'When $c > 0$'], answer: 0, why: 'The quadratic formula needs the square root of $b^2 - 4c$ to be real.' },
        { ask: 'Here $b = -\\operatorname{tr}A$ and $c = \\det A$. What is $b^2 - 4c$?', options: ['$(\\operatorname{tr}A)^2 - 4\\det A$', '$\\operatorname{tr}A - 4\\det A$', '$(\\det A)^2 - 4\\operatorname{tr}A$'], answer: 0, why: 'Squaring removes the minus sign on the trace.' },
        { ask: 'What does the given inequality say about it?', options: ['It is negative, so there is no real root', 'It is zero, so there is one root', 'It is positive, so there are two roots'], answer: 0, why: '$(\\operatorname{tr}A)^2 < 4\\det A$ rearranges to $(\\operatorname{tr}A)^2 - 4\\det A < 0$.' },
      ],
      conclusion: 'No real $\\lambda$ means no nonzero real $\\mathbf v$ with $A\\mathbf v = \\lambda\\mathbf v$: every direction is turned. The two complex roots multiply to $\\det A$, so each has size $\\sqrt{\\det A}$.',
    },
  },
  {
    id: 'laml-positive-definite', after: 'laml-symmetric-quadratic', module: 'Tensors in the real world', title: 'Positive definite: bowls, energy and Cholesky', minutes: 35, level: 'Advanced',
    why: { title: 'Will it stand up?', story: 'A structure is stable when every small displacement costs energy, and a fitted model has a single best answer when its error surface is a bowl. Both questions ask whether a symmetric matrix is positive definite. Engineers and statisticians test it thousands of times a day, usually by trying a Cholesky factorisation.' },
    objective: 'Test whether a symmetric matrix is positive definite using eigenvalues, energy and the Cholesky factorization.',
    prose: [
      'Two masses sit between three springs. Push them by amounts x₁ and x₂, and the stored energy is 2x₁² − 2x₁x₂ + 2x₂². Any push at all stores some energy. Only standing still stores none.',
      'That energy is xᵀKx with K = [2 −1; −1 2]. A symmetric matrix whose energy xᵀKx is positive for every nonzero x is called **positive definite**. Its energy surface is a bowl with a single lowest point at the origin, which is why such matrices appear in every minimisation problem.',
      'Three tests agree. First, every eigenvalue is positive: here they are 1 and 3. Second, along a unit direction the energy lies between the smallest and largest eigenvalue, so it can never reach zero. Third, elimination never meets a zero or negative pivot.',
      'The third test has a factorization. **Cholesky** writes K = RᵀR with R upper triangular and a positive diagonal. Then xᵀKx = ‖Rx‖², a squared length. `chol(K)` returns R, and it stops with an error exactly when K is not positive definite. That makes it the cheapest test in practice.',
      'Positive definite matters for data and learning. A covariance matrix is positive definite when no feature is a combination of the others. Least squares, ridge regression and Newton\'s method all solve with such matrices, and Cholesky solves them about twice as fast as general elimination.',
    ],
    procedure: ['Check symmetry: K equals its transpose.', 'Run R = chol(K). Success means positive definite; an error means it is not.', 'Confirm with eig(K) > 0, and use R\'*R = K to check the factor.'],
    prediction: { question: 'K = [1 2; 2 1]. Is it positive definite? Try x = [1; −1] before computing anything.', answer: 'No. With x = [1; −1] the energy is 1 − 4 + 1 = −2, which is negative. Its eigenvalues are 3 and −1, and chol(K) fails.' },
    demo: {
      code: String.raw`K = [2 -1; -1 2];
lambda = eig(K);
R = chol(K);
disp('Eigenvalues:'); disp(lambda)
disp('Cholesky factor R:'); disp(R)
check = R'*R - K;
disp(check)
t = linspace(0, 2*pi, 73);
energy = zeros(1,73);
for k = 1:73
  x = [cos(t(k)); sin(t(k))];
  energy(k) = x'*K*x;
end
plot(t, energy)
title('Energy on the unit circle stays between the eigenvalues')
xlabel('Direction angle in radians')
ylabel('Energy')`,
      explain: [{ code: 'R = chol(K);', meaning: 'Upper-triangular R with R\'*R = K. It exists only for positive definite K.' }, { code: "energy(k) = x'*K*x;", meaning: 'The energy of a unit push in direction t(k). It never drops below 1, the smallest eigenvalue.' }, { code: "check = R'*R - K;", meaning: 'A zero matrix confirms the factorization.' }],
    },
    challenge: {
      prompt: 'For the symmetric matrix K, store lambda = eig(K), the Cholesky factor R, and energy = x\'*K*x for the given x.',
      setup: 'K = [4 2; 2 3];\nx = [1; -1];',
      starter: 'lambda = [0; 0];\nR = eye(2);\nenergy = 0;',
      solution: "lambda = eig(K);\nR = chol(K);\nenergy = x'*K*x;",
      checks: [{ name: 'lambda', expected: [(7 - Math.sqrt(17)) / 2, (7 + Math.sqrt(17)) / 2], tolerance: 1e-6, message: 'Both eigenvalues are positive.' }, { name: 'R', expected: [[2, 1], [0, Math.SQRT2]], tolerance: 1e-6, message: 'chol returns the upper-triangular factor.' }, { name: 'energy', expected: 3, tolerance: 1e-9, message: '4 − 2 − 2 + 3 for this x.' }],
      cases: [{ setup: 'K = [4 2; 2 3];\nx = [2; 1];', checks: [{ name: 'energy', expected: 27, tolerance: 1e-9, message: 'A different push, same matrix.' }] }],
      hints: ['eig(K) gives the eigenvalues in increasing order.', 'chol(K) returns R with R\'*R = K.', "lambda = eig(K); R = chol(K); energy = x'*K*x;"],
      transfer: 'Change the off-diagonal entries of K from 2 to 4. Predict whether chol succeeds, check with eig, and find a vector x with negative energy.',
    },
    notation: [
      { tex: String.raw`K = K^T,\quad \mathbf x^TK\mathbf x > 0 \ \text{ for all } \mathbf x \neq \mathbf 0`, say: 'The definition of positive definite.' },
      { tex: String.raw`\lambda_{\min}\|\mathbf x\|^2 \le \mathbf x^TK\mathbf x \le \lambda_{\max}\|\mathbf x\|^2`, say: 'Energy is trapped between the smallest and largest eigenvalue.' },
      { tex: String.raw`K = R^TR \;\Longrightarrow\; \mathbf x^TK\mathbf x = \|R\mathbf x\|^2`, say: 'A Cholesky factor turns energy into a squared length.' },
    ],
    quiz: [
      { q: 'Which matrix is positive definite?', options: ['$\\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}$', '$\\begin{bmatrix} 1 & 2 \\\\ 2 & 1 \\end{bmatrix}$', '$\\begin{bmatrix} 1 & 0 \\\\ 0 & 0 \\end{bmatrix}$', '$\\begin{bmatrix} -1 & 0 \\\\ 0 & -1 \\end{bmatrix}$'], answer: 0, why: 'Its eigenvalues are 1 and 3. The second has $-1$, the third has 0, the fourth is negative.' },
      { q: 'What does an error from `chol(K)` tell you?', options: ['$K$ is not positive definite (or not symmetric)', '$K$ is singular for sure', '$K$ has complex eigenvalues', 'The engine needs more iterations'], answer: 0, why: 'Cholesky fails exactly when a pivot is not positive.' },
    ],
    proof: {
      claim: 'If $K = R^TR$ with $R$ invertible, then $\\mathbf x^TK\\mathbf x > 0$ for every $\\mathbf x \\neq \\mathbf 0$.',
      steps: [
        { ask: 'Substitute $K = R^TR$ into the energy.', options: ['$\\mathbf x^TR^TR\\mathbf x = (R\\mathbf x)^T(R\\mathbf x)$', '$\\mathbf x^TR^T\\mathbf x\\,R$', '$R^2\\,\\mathbf x^T\\mathbf x$'], answer: 0, why: '$\\mathbf x^TR^T$ is the transpose of $R\\mathbf x$.' },
        { ask: 'What is $(R\\mathbf x)^T(R\\mathbf x)$?', options: ['$\\|R\\mathbf x\\|^2$, which is never negative', '$\\|\\mathbf x\\|^2$', '$\\det R$'], answer: 0, why: 'A vector dotted with itself is its squared length.' },
        { ask: 'Why is it strictly positive when $\\mathbf x \\neq \\mathbf 0$?', options: ['$R$ is invertible, so $R\\mathbf x \\neq \\mathbf 0$', 'Squares are always positive', 'Because $K$ is symmetric'], answer: 0, why: 'A squared length is zero only for the zero vector, and an invertible $R$ sends only $\\mathbf 0$ to $\\mathbf 0$.' },
      ],
      conclusion: 'A Cholesky factor certifies positive definiteness. Software tests for a bowl by attempting `chol` and watching for a non-positive pivot.',
    },
  },
  {
    id: 'laml-spectral-svd-theorem', after: 'laml-covariance-pca', module: 'The SVD: the shape of any matrix', title: 'The spectral theorem, and why every matrix has an SVD', minutes: 40, level: 'Advanced',
    why: { title: 'Why does it always work?', story: 'The photo, the bridge sensors and the data cloud were all split into layers, and it never failed. That is not luck. Every matrix turns a circle into an ellipse, and the SVD is the axes of that ellipse. This lesson shows why the axes always exist, starting from symmetric matrices, whose stretch directions are always perpendicular.' },
    objective: 'Use the spectral theorem for symmetric matrices, and build the SVD of any matrix from the eigenvectors of AᵀA.',
    prose: [
      'A metal plate is stretched by a symmetric stress matrix S = [3 1; 1 3]. Two directions stretch without turning: [1; 1] by 4 and [1; −1] by 2. Those directions are perpendicular. That is no accident of this example.',
      'The **spectral theorem** says every symmetric matrix has perpendicular eigenvectors and real eigenvalues. Normalised and placed as columns of Q, they give S = Q·Λ·Qᵀ. Here Q is orthogonal and Λ is diagonal. A symmetric matrix is a stretch along perpendicular axes, nothing more.',
      'Most matrices are not symmetric, but AᵀA always is, for any A. Its eigenvalues are never negative, because xᵀAᵀAx = ‖Ax‖² ≥ 0. So AᵀA has perpendicular unit eigenvectors v₁, v₂ with eigenvalues σ₁² ≥ σ₂² ≥ 0. The numbers σ₁ and σ₂ are the **singular values** of A.',
      'Now look at where A sends the vᵢ. The lengths are ‖Avᵢ‖ = σᵢ, and the images are perpendicular too. Normalising them, uᵢ = Avᵢ/σᵢ, gives A·V = U·Σ, that is A = U·Σ·Vᵀ. This is the **singular value decomposition**, and the argument works for every matrix.',
      'Geometrically: A turns the unit circle into an ellipse. The vᵢ are the input directions that land on the ellipse\'s axes, the uᵢ are those axes, and the σᵢ are their half-lengths. In OpenMAT, `svd(A)` returns the singular values in decreasing order, while `eig` sorts in increasing order.',
    ],
    procedure: ['For a symmetric S: [Q, L] = eig(S) gives perpendicular eigenvectors, and S = Q*L*Q\'.', 'For any A: the eigenvalues of A\'*A are the squared singular values; sigma = sqrt(eig(A\'*A)).', 'With V from eig(A\'*A), set U = A*V*inv(diag(sigma)); then A = U*diag(sigma)*V\'.'],
    prediction: { question: 'A = [3 0; 0 −2]. What are its singular values, and how do they differ from its eigenvalues?', answer: 'The eigenvalues are 3 and −2. The singular values are 3 and 2: they measure stretch, which is never negative. The sign shows up as a flip in U.' },
    demo: {
      code: String.raw`A = [3 0; 4 5];
AtA = A'*A;
[V, D] = eig(AtA);
sigma = sqrt(diag(D));
U = A*V*inv(diag(sigma));
disp('Singular values from eig of AtA:'); disp(sigma)
disp('Singular values from svd:'); disp(svd(A))
UtU = U'*U;
disp(UtU)
t = linspace(0, 2*pi, 100);
C = zeros(2,100);
C(1,:) = cos(t);
C(2,:) = sin(t);
E = A*C;
plot(C(1,:), C(2,:))
hold on
plot(E(1,:), E(2,:))
title('A turns the unit circle into an ellipse with half-axes sigma_1 and sigma_2')
xlabel('x')
ylabel('y')
legend('Unit circle', 'Image under A')
axis equal`,
      explain: [{ code: "AtA = A'*A;", meaning: 'Always symmetric, with non-negative eigenvalues: the starting point of the SVD.' }, { code: 'sigma = sqrt(diag(D));', meaning: 'Singular values are square roots of the eigenvalues of A\'*A, here √5 and √45.' }, { code: 'U = A*V*inv(diag(sigma));', meaning: 'Divide each image A*v by its length to get the output directions.' }],
    },
    challenge: {
      prompt: 'S is symmetric. Store lambda = eig(S). With [Q, L] = eig(S), store ortho = Q\'*Q and rebuilt = Q*L*Q\'. Finally store sigma = svd(S).',
      setup: 'S = [5 2; 2 2];',
      starter: 'lambda = [0; 0];\northo = zeros(2);\nrebuilt = zeros(2);\nsigma = [0; 0];',
      solution: "lambda = eig(S);\n[Q, L] = eig(S);\northo = Q'*Q;\nrebuilt = Q*L*Q';\nsigma = svd(S);",
      checks: [{ name: 'lambda', expected: [1, 6], tolerance: 1e-6, message: 'trace 7 and det 6 give eigenvalues 1 and 6.' }, { name: 'ortho', expected: [[1, 0], [0, 1]], tolerance: 1e-6, message: 'The eigenvectors of a symmetric matrix are orthonormal.' }, { name: 'rebuilt', expected: [[5, 2], [2, 2]], tolerance: 1e-6, message: 'Q*L*Q\' rebuilds S.' }, { name: 'sigma', expected: [6, 1], tolerance: 1e-6, message: 'For positive definite S, singular values equal eigenvalues, in decreasing order.' }],
      cases: [{ setup: 'S = [2 0; 0 3];', checks: [{ name: 'lambda', expected: [2, 3], tolerance: 1e-6, message: 'A diagonal matrix shows its eigenvalues.' }, { name: 'sigma', expected: [3, 2], tolerance: 1e-6, message: 'Same numbers, decreasing order.' }] }],
      hints: ['One output of eig gives the eigenvalues; two outputs give vectors and a diagonal matrix.', 'For a symmetric matrix the inverse of Q is its transpose.', "lambda = eig(S); [Q, L] = eig(S); ortho = Q'*Q; rebuilt = Q*L*Q'; sigma = svd(S);"],
      transfer: 'Take S = [1 2; 2 1], which is symmetric but not positive definite. Compare eig(S) and svd(S), and explain where the negative eigenvalue went.',
    },
    notation: [
      { tex: String.raw`S = S^T \;\Longrightarrow\; S = Q\Lambda Q^T,\quad Q^TQ = I`, say: 'The spectral theorem: symmetric matrices stretch along perpendicular axes.' },
      { tex: String.raw`A^TA\,\mathbf v_i = \sigma_i^2\,\mathbf v_i, \qquad \mathbf u_i = \frac{A\mathbf v_i}{\sigma_i}`, say: 'Right singular vectors come from $A^TA$; left ones are their normalised images.' },
      { tex: String.raw`A = U\Sigma V^T`, say: 'Every matrix: turn, stretch along axes, turn.' },
    ],
    quiz: [
      { q: 'Why is $A^TA$ never allowed a negative eigenvalue?', options: ['$\\mathbf x^TA^TA\\mathbf x = \\|A\\mathbf x\\|^2 \\ge 0$', 'Because $A^TA$ is diagonal', 'Because $A$ is square', 'It can have negative eigenvalues'], answer: 0, why: 'For a unit eigenvector the energy equals the eigenvalue, and the energy is a squared length.' },
      { q: 'A symmetric matrix has eigenvalues 4 and $-1$. What are its singular values?', options: ['4 and 1', '4 and $-1$', '2 and 1', '16 and 1'], answer: 0, why: 'For symmetric matrices the singular values are the absolute values of the eigenvalues.' },
    ],
    proof: {
      claim: 'For symmetric $S$, eigenvectors with different eigenvalues are perpendicular.',
      given: '$S\\mathbf u = \\lambda\\mathbf u$, $S\\mathbf w = \\mu\\mathbf w$, $\\lambda \\neq \\mu$, and $S^T = S$.',
      steps: [
        { ask: 'Compute the number $\\mathbf w^TS\\mathbf u$ using $S\\mathbf u = \\lambda\\mathbf u$.', options: ['$\\lambda\\,\\mathbf w^T\\mathbf u$', '$\\mu\\,\\mathbf w^T\\mathbf u$', '$\\lambda\\mu$'], answer: 0, why: 'Replace $S\\mathbf u$ by $\\lambda\\mathbf u$ and bring the number outside.' },
        { ask: 'Compute the same number as $(S\\mathbf w)^T\\mathbf u$. Why is that allowed, and what is it?', options: ['$\\mathbf w^TS = (S^T\\mathbf w)^T = (S\\mathbf w)^T$ because $S$ is symmetric; it equals $\\mu\\,\\mathbf w^T\\mathbf u$', 'Matrix products commute, so it equals $\\lambda\\,\\mathbf w^T\\mathbf u$', 'Unit vectors make it equal to 1'], answer: 0, why: 'Symmetry lets $S$ act on $\\mathbf w$ instead of $\\mathbf u$.', hint: 'Use $(S\\mathbf w)^T = \\mathbf w^TS^T$.' },
        { ask: 'So $\\lambda\\,\\mathbf w^T\\mathbf u = \\mu\\,\\mathbf w^T\\mathbf u$. Conclude.', options: ['$(\\lambda - \\mu)\\,\\mathbf w^T\\mathbf u = 0$ and $\\lambda \\neq \\mu$, so $\\mathbf w^T\\mathbf u = 0$', '$\\lambda = \\mu$', '$\\mathbf u = \\mathbf w$'], answer: 0, why: 'A product is zero only if a factor is, and $\\lambda - \\mu$ is not zero.' },
      ],
      conclusion: 'Symmetric matrices have perpendicular eigen-directions, so $S = Q\\Lambda Q^T$. Applied to the symmetric matrix $A^TA$, this gives the right singular vectors of any $A$, which is why every matrix has an SVD.',
    },
  },
]
