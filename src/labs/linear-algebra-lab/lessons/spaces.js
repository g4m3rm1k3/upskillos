// Spaces and bases: vector spaces beyond arrows, subspaces in three dimensions, basis and dimension,
// change of basis and the four fundamental subspaces. Then Gram–Schmidt and orthogonal matrices,
// which join the least-squares module. Each lesson names the lesson it follows (`after`).
// OpenMAT notes: column vectors are stored flat. Side-by-side concatenation such as [u w] works, but
// the comma form [u, w] does not and the outer product u*u' returns a dot product, so both are avoided.
export const spaces = [
  {
    id: 'laml-subspaces-3d', after: 'laml-lu-pivoting', module: 'Spaces and bases', title: 'Lines and planes through the origin', minutes: 30, level: 'Intermediate',
    why: { title: 'Where can it reach?', story: 'A drone with two fixed thrusters, a robot arm whose joints push in only two directions, or a diet built from two foods: each can reach only a flat sheet of possibilities. Knowing that sheet, and testing in one step whether a goal lies on it, tells you whether the goal is possible before you try.' },
    objective: 'Describe the span of two vectors in three dimensions as a plane, find its normal vector, and test whether a point lies in it.',
    prose: [
      'A camera drone has two thrusters. One pushes along u = [1; 0; 1] and the other along w = [0; 1; 1]. Running them with strengths a and b moves the drone by a·u + b·w. With a = 2 and b = 3 it reaches [2; 3; 5]. Can it reach [0; 2; 1]?',
      'The points it can reach are all combinations a·u + b·w. This set is the **span** of u and w. Two independent vectors in three dimensions span a flat plane through the origin. A plane through the origin is a **subspace**: it contains zero, and sums and multiples of its points stay in it.',
      'One vector describes the whole plane: a **normal** n, perpendicular to both u and w. The cross product `cross(u,w)` builds such a vector. Here it is [−1; −1; 1]. Every point x of the plane satisfies n·x = 0, and every point off the plane does not.',
      'So the reachability question becomes one dot product. For [2; 3; 5], n·x = −2 − 3 + 5 = 0, so it is reachable. For [0; 2; 1], n·x = −1, so it is not. Dividing n·x by the length of n gives the signed distance from the plane.',
      'Rank gives the same answer without a cross product, in any dimension. Put u, w and the target as the columns of a matrix. The rank stays 2 when the target lies in the plane and rises to 3 when it adds a new direction. In OpenMAT, type such a matrix row by row.',
    ],
    procedure: ['Check that the spanning vectors are independent (rank 2), so they span a plane rather than a line.', 'Compute the normal n = cross(u,w).', 'A point x lies in the plane exactly when dot(n,x) = 0; its distance from the plane is |dot(n,x)|/norm(n).'],
    prediction: { question: 'If w is replaced by 2·w, does the plane change? What happens to the normal vector?', answer: 'The plane is unchanged: 2·w spans the same line as w. The normal doubles in length but keeps its direction, so the test n·x = 0 gives the same answers.' },
    demo: {
      code: String.raw`U = [1 0; 0 1; 1 1];
n = cross(U(:,1), U(:,2));
targets = [2 1 0 1; 3 1 2 -1; 5 2 1 1];
d = zeros(1,4);
for k = 1:4
  d(k) = dot(n, targets(:,k)) / norm(n);
end
disp('Normal vector:'); disp(n)
disp('Signed distances:'); disp(d)
disp('Rank with the first target added:'); disp(rank([U targets(:,1)]))
plot(1:4, abs(d))
title('Distance of each target from the reachable plane')
xlabel('Target number')
ylabel('Distance from the plane')`,
      explain: [{ code: 'n = cross(U(:,1), U(:,2));', meaning: 'Build a vector perpendicular to both thrust directions: the normal of the plane they span.' }, { code: 'd(k) = dot(n, targets(:,k)) / norm(n);', meaning: 'Signed distance of target k from the plane. Zero means reachable.' }, { code: 'rank([U targets(:,1)])', meaning: 'Rank 2 confirms the first target adds no new direction.' }],
    },
    challenge: {
      prompt: 'The columns of U span a plane. Store its normal n = cross of the first and second columns (in that order), the signed distance dist from the plane to x, and r, the rank of U with x attached as a third column.',
      setup: 'U = [1 2; 0 1; 2 0];\nx = [3; 1; 3];',
      starter: 'n = [0; 0; 0];\ndist = 0;\nr = 0;',
      solution: 'n = cross(U(:,1), U(:,2));\ndist = dot(n, x) / norm(n);\nr = rank([U x]);',
      checks: [{ name: 'n', expected: [-2, 4, 1], tolerance: 1e-9, message: 'Use cross(U(:,1), U(:,2)); swapping the order flips the sign.' }, { name: 'dist', expected: 1 / Math.sqrt(21), tolerance: 1e-6, message: 'Divide dot(n,x) by the length of n.' }, { name: 'r', expected: 3, tolerance: 1e-9, message: 'Attach x as a third column and compute the rank.' }],
      cases: [{ setup: 'U = [1 2; 0 1; 2 0];\nx = [3; 1; 2];', checks: [{ name: 'dist', expected: 0, tolerance: 1e-6, message: 'This x lies in the plane.' }, { name: 'r', expected: 2, tolerance: 1e-9, message: 'A point in the plane adds no direction.' }] }],
      hints: ['The normal is perpendicular to both columns of U.', 'cross(U(:,1), U(:,2)) gives [-2; 4; 1].', 'dist = dot(n,x)/norm(n); r = rank([U x]);'],
      transfer: 'Find two different pairs of vectors that span the same plane as U. Show that their normals are parallel, and explain why the plane cannot tell which pair produced it.',
    },
    notation: [
      { tex: String.raw`\operatorname{span}(\mathbf u, \mathbf w) = \{\, a\mathbf u + b\mathbf w : a, b \in \mathbb R \,\}`, say: 'The span is every combination of the two vectors.' },
      { tex: String.raw`\mathbf n = \mathbf u \times \mathbf w, \qquad \mathbf x \in \operatorname{span}(\mathbf u,\mathbf w) \iff \mathbf n\cdot\mathbf x = 0`, say: 'When $\\mathbf u$ and $\\mathbf w$ are independent, one dot product decides membership.' },
      { tex: String.raw`\operatorname{dist}(\mathbf x, \text{plane}) = \frac{|\mathbf n\cdot\mathbf x|}{\|\mathbf n\|}`, say: 'The distance to the plane is the size of the normal component of $\\mathbf x$.' },
    ],
    quiz: [
      { q: 'Which set is a subspace of $\\mathbb R^3$?', options: ['The plane $x + y - z = 0$', 'The plane $x + y - z = 1$', 'The unit sphere', 'The first octant (all coordinates $\\ge 0$)'], answer: 0, why: 'Only the plane through the origin contains zero and is closed under sums and multiples.' },
      { q: '$\\mathbf u$ and $\\mathbf w$ are parallel and nonzero. What is their span?', options: ['A line through the origin', 'A plane through the origin', 'All of $\\mathbb R^3$', 'Just the origin'], answer: 0, why: 'Every combination is a multiple of the same direction.' },
    ],
    proof: {
      claim: 'If $\\mathbf n$ is perpendicular to both $\\mathbf u$ and $\\mathbf w$, then every point of $\\operatorname{span}(\\mathbf u,\\mathbf w)$ is perpendicular to $\\mathbf n$.',
      steps: [
        { ask: 'Write down a general point of the span.', options: ['$\\mathbf x = a\\mathbf u + b\\mathbf w$ for some numbers $a, b$', '$\\mathbf x = \\mathbf u + \\mathbf w$', '$\\mathbf x = \\mathbf u \\times \\mathbf w$'], answer: 0, why: 'The span is every combination, so a general point needs general weights.' },
        { ask: 'Compute $\\mathbf n\\cdot\\mathbf x$.', options: ['$a(\\mathbf n\\cdot\\mathbf u) + b(\\mathbf n\\cdot\\mathbf w)$', '$ab\\,(\\mathbf n\\cdot\\mathbf u)(\\mathbf n\\cdot\\mathbf w)$', '$(a + b)\\,\\mathbf n\\cdot(\\mathbf u + \\mathbf w)$'], answer: 0, why: 'The dot product distributes over sums, and numbers come outside.' },
        { ask: 'Use what is given about $\\mathbf n$.', options: ['$a \\cdot 0 + b \\cdot 0 = 0$', '$a + b = 0$', '$\\mathbf n = \\mathbf 0$'], answer: 0, why: 'Perpendicular means $\\mathbf n\\cdot\\mathbf u = 0$ and $\\mathbf n\\cdot\\mathbf w = 0$.' },
      ],
      conclusion: 'Every combination is perpendicular to $\\mathbf n$, so the span lies in the plane $\\mathbf n\\cdot\\mathbf x = 0$. When $\\mathbf u$ and $\\mathbf w$ are independent, the two sets are equal.',
    },
  },
  {
    id: 'laml-basis-dimension', after: 'laml-subspaces-3d', module: 'Spaces and bases', title: 'Basis and dimension: just enough directions', minutes: 30, level: 'Intermediate',
    why: { title: 'Just enough building blocks', story: 'A printer mixes most colours from three inks, and a GPS position needs exactly three numbers. A basis is a set of building blocks with nothing wasted, and the dimension is how many blocks any such set must have. It tells a designer how many measurements, sensors or parameters a problem really needs: fewer cannot do the job, and more are redundant.' },
    objective: 'Choose a basis from a set of spanning vectors, find the dimension, and compute the unique coordinates of a vector in that basis.',
    prose: [
      'A paint mixer stocks four pigments, written as amounts of three base dyes: [1; 0; 0], [0; 1; 0], [1; 1; 0] and [0; 0; 1]. The third pigment is just the first two mixed. Any colour you can make with it, you can make without it.',
      'A **basis** of a space is a set of vectors that is independent and still spans the space. Dropping pigment 3 leaves a basis of all three-dye colours. Keeping all four spans the same colours but is not independent: the colour [2; 3; 1] can be mixed in more than one way.',
      'Every basis of the same space has the same number of vectors. That number is the **dimension**. For the columns of a matrix it equals the rank. Adding pigments one at a time, the rank goes 1, 2, 2, 3: a new pigment raises the dimension only when it brings a new direction.',
      'In a basis, every vector has exactly one list of weights, called its **coordinates**. With basis B = pigments 1, 2 and 4, the colour [2; 3; 1] has coordinates `B\\target` = [2; 3; 1]. With all four pigments, the weights [2; 3; 0; 1] and [0; 1; 2; 1] both give that colour, so "the" weights would be meaningless.',
      'To pick a basis from a matrix, reduce it with rref. The columns with leading 1s mark independent columns of the original matrix. Use the original columns as the basis, not the reduced ones: row reduction changes the columns themselves.',
    ],
    procedure: ['Compute rank(A): this is the dimension of the span of its columns.', 'Use rref(A) to find the pivot columns, and take those original columns as a basis B.', 'Solve B*c = target for the unique coordinates, and check the residual is zero.'],
    prediction: { question: 'A fifth pigment [2; 2; 5] is added. Does the dimension change?', answer: 'No. Three dyes already span all of three-dimensional colour space, so the rank stays 3. The new pigment is a combination of the basis.' },
    demo: {
      code: String.raw`A = [1 0 1 0; 0 1 1 0; 0 0 0 1];
ranks = zeros(1,4);
for k = 1:4
  ranks(k) = rank(A(:,1:k));
end
B = A(:,[1 2 4]);
target = [2; 3; 1];
c = B\target;
w1 = [2; 3; 0; 1];
w2 = [0; 1; 2; 1];
disp('Rank after each pigment:'); disp(ranks)
disp('Coordinates in the basis:'); disp(c)
disp('Two different weightings, same colour:'); disp(A*w1 - A*w2)
plot(1:4, ranks)
title('Rank grows only when a column adds a new direction')
xlabel('Number of pigment columns used')
ylabel('Rank (dimension reached)')`,
      explain: [{ code: 'ranks(k) = rank(A(:,1:k));', meaning: 'Measure the dimension spanned by the first k pigments.' }, { code: 'B = A(:,[1 2 4]);', meaning: 'Keep an independent set that still spans: a basis.' }, { code: 'disp(A*w1 - A*w2)', meaning: 'With the redundant pigment, two different weightings make the same colour, so the difference is zero.' }],
    },
    challenge: {
      prompt: 'Store the dimension of the column span of A in dimension. Columns 1 and 3 form a basis: store them as B, store the coordinates of target in that basis as coords, and store residual = B*coords - target.',
      setup: 'A = [1 2 0 1; 2 4 1 3; 0 0 1 1];\ntarget = [3; 7; 1];',
      starter: 'dimension = 4;\nB = A(:,[1 2]);\ncoords = [0; 0];\nresidual = B*coords - target;',
      solution: 'dimension = rank(A);\nB = A(:,[1 3]);\ncoords = B\\target;\nresidual = B*coords - target;',
      checks: [{ name: 'dimension', expected: 2, tolerance: 1e-9, message: 'Column 2 is twice column 1, and column 4 is column 1 plus column 3.' }, { name: 'B', expected: [[1, 0], [2, 1], [0, 1]], tolerance: 1e-9, message: 'Select the original columns 1 and 3.' }, { name: 'coords', expected: [3, 1], tolerance: 1e-6, message: 'Solve B*coords = target.' }, { name: 'residual', expected: [0, 0, 0], tolerance: 1e-6, message: 'The target lies in the span, so the residual is zero.' }],
      cases: [{ setup: 'A = [1 2 0 1; 2 4 1 3; 0 0 1 1];\ntarget = [1; 3; 1];', checks: [{ name: 'coords', expected: [1, 1], tolerance: 1e-6, message: 'New target, same basis.' }] }],
      hints: ['Look for columns that are combinations of others before computing anything.', 'rank(A) is 2, and rref(A) has its leading 1s in columns 1 and 3.', 'dimension = rank(A); B = A(:,[1 3]); coords = B\\target; residual = B*coords - target;'],
      transfer: 'Choose a different basis for the same column span, for example columns 2 and 4. Compute the coordinates of the same target, and explain why they differ while the target does not.',
    },
    notation: [
      { tex: String.raw`\{\mathbf b_1,\dots,\mathbf b_k\}\ \text{is a basis of } V \iff \text{independent and } \operatorname{span} = V`, say: 'A basis is a set with no redundancy that still reaches everything.' },
      { tex: String.raw`\dim V = k = \operatorname{rank}\begin{bmatrix}\mathbf b_1 & \cdots & \mathbf b_k\end{bmatrix}`, say: 'The dimension counts the vectors in any basis.' },
      { tex: String.raw`\mathbf x = c_1\mathbf b_1 + \dots + c_k\mathbf b_k \quad\text{with unique } (c_1,\dots,c_k)`, say: 'In a basis, coordinates exist and are unique.' },
    ],
    quiz: [
      { q: 'Four vectors in $\\mathbb R^3$ can be…', options: ['spanning, but never independent', 'independent, but never spanning', 'both independent and spanning', 'neither, always'], answer: 0, why: '$\\mathbb R^3$ has dimension 3, so any four vectors are dependent. They can still span.' },
      { q: 'A matrix has 5 columns and rank 3. How many vectors are in a basis of its column space?', options: ['3', '5', '2', '8'], answer: 0, why: 'The dimension of the column space equals the rank.' },
    ],
    proof: {
      claim: 'If the columns of $B$ are independent, coordinates are unique: $B\\mathbf c = B\\mathbf d$ implies $\\mathbf c = \\mathbf d$.',
      steps: [
        { ask: 'Start from $B\\mathbf c = B\\mathbf d$. What follows directly?', options: ['$B(\\mathbf c - \\mathbf d) = \\mathbf 0$', '$B = \\mathbf 0$', '$\\mathbf c\\cdot\\mathbf d = 0$'], answer: 0, why: 'Subtract, then factor: matrix multiplication distributes over subtraction.' },
        { ask: 'What does independence of the columns say about $B\\mathbf z = \\mathbf 0$?', options: ['Only $\\mathbf z = \\mathbf 0$ solves it', 'Every $\\mathbf z$ solves it', 'It has exactly two solutions'], answer: 0, why: 'Independent means no combination of the columns with nonzero weights gives zero.' },
        { ask: 'Apply this with $\\mathbf z = \\mathbf c - \\mathbf d$.', options: ['$\\mathbf c - \\mathbf d = \\mathbf 0$, so $\\mathbf c = \\mathbf d$', '$\\mathbf c = -\\mathbf d$', '$\\mathbf c$ and $\\mathbf d$ are parallel'], answer: 0, why: 'The only solution of $B\\mathbf z = \\mathbf 0$ is zero.' },
      ],
      conclusion: 'Independence makes coordinates unique, and spanning makes them exist. A basis gives both.',
    },
  },
  {
    id: 'laml-change-of-basis', after: 'laml-basis-dimension', module: 'Spaces and bases', title: 'Coordinates depend on the basis', minutes: 35, level: 'Intermediate',
    why: { title: 'The right point of view', story: 'A crystal is easiest to describe along its own axes, a satellite along its orbit, a robot hand in the frame of the hand. Engineers switch between such coordinate systems all day. A problem that is a tangle in one set of coordinates can fall apart into a few simple, separate pieces in another. That idea drives eigenvectors, the SVD and the Fourier transform.' },
    objective: 'Convert between standard coordinates and coordinates in another basis, and rewrite a matrix that is simple in that basis.',
    prose: [
      'A city has diagonal avenues. Walking one block along an avenue moves you b₁ = [2; 1] on the east–north map; one block along a cross street moves you b₂ = [−1; 1]. The café at map position [3; 3] is 2 avenue blocks and 1 street block from the origin: 2·[2; 1] + 1·[−1; 1] = [3; 3].',
      'The same point therefore has two descriptions: [3; 3] on the map, and [2; 1] in avenue coordinates. Put b₁ and b₂ as the columns of a matrix B. Then `B*c` converts avenue coordinates c to map coordinates, and `c = B\\x` converts back.',
      'Some maps are simple in the right basis. Suppose a zoning rule stretches everything 3 times along the avenues and leaves the street direction alone. In avenue coordinates it is the diagonal matrix D = [3 0; 0 1]. On the map it is A = B·D·B⁻¹: convert to avenue coordinates, stretch, convert back.',
      'Check it on b₁ itself. Its avenue coordinates are [1; 0]; D makes them [3; 0]; B turns that into 3·b₁. So A·b₁ = 3·b₁. The avenue direction is an eigenvector of A with eigenvalue 3, and b₂ is one with eigenvalue 1.',
      'The inverse B⁻¹ exists because b₁ and b₂ form a basis. If the two directions were parallel, there would be points with no avenue coordinates and the conversion would fail. Write `inv(B)` when you need the matrix itself, and `B\\x` when you only need to solve for coordinates.',
    ],
    procedure: ['Put the new basis vectors as the columns of B.', 'Convert coordinates: x = B*c on the way out, c = B\\x on the way in.', 'A map that is D in the new basis is A = B*D*inv(B) in standard coordinates.'],
    prediction: { question: 'The avenue basis is replaced by [4; 2] and [−1; 1]. Do the café\'s avenue coordinates change? Does the zoning matrix A change?', answer: 'The coordinates change: the first one halves, because each avenue step is now twice as long. A does not change, because it still stretches the same directions by the same factors.' },
    demo: {
      code: String.raw`B = [2 -1; 1 1];
x = [3; 3];
c = B\x;
D = [3 0; 0 1];
A = B*D*inv(B);
disp('Avenue coordinates of the cafe:'); disp(c)
disp('Back to the map:'); disp(B*c)
disp('A times the avenue direction:'); disp(A*B(:,1))
hold on
for a = -2:2
  P = B*[a a; -3 3];
  plot(P(1,:), P(2,:))
end
scatter(x(1), x(2))
title('Avenue coordinates: lines where the first coordinate is constant')
xlabel('East')
ylabel('North')
axis equal`,
      explain: [{ code: 'c = B\\x;', meaning: 'Solve B*c = x: how many avenue and street blocks reach x.' }, { code: 'A = B*D*inv(B);', meaning: 'Convert to avenue coordinates, stretch the first one by 3, convert back.' }, { code: 'P = B*[a a; -3 3];', meaning: 'Two points with first avenue coordinate a, mapped to the city: one grid line of the avenue system.' }],
    },
    challenge: {
      prompt: 'B has the new basis as columns. Store c, the coordinates of x in that basis. The map D is diagonal in the new basis: store its standard-coordinate matrix A, and store yc, the new-basis coordinates of A*x.',
      setup: 'B = [1 1; 0 2];\nx = [5; 4];\nD = [2 0; 0 -1];',
      starter: 'c = x;\nA = D;\nyc = c;',
      solution: 'c = B\\x;\nA = B*D*inv(B);\nyc = D*c;',
      checks: [{ name: 'c', expected: [3, 2], tolerance: 1e-6, message: 'Solve B*c = x rather than reading x directly.' }, { name: 'A', expected: [[2, -1.5], [0, -1]], tolerance: 1e-6, message: 'Use A = B*D*inv(B), in that order.' }, { name: 'yc', expected: [6, -2], tolerance: 1e-6, message: 'In the new basis the map is just D.' }],
      cases: [{ setup: 'B = [1 1; 0 2];\nx = [1; 2];\nD = [2 0; 0 -1];', checks: [{ name: 'c', expected: [0, 1], tolerance: 1e-6, message: 'This x is exactly the second basis vector.' }, { name: 'yc', expected: [0, -1], tolerance: 1e-6, message: 'D flips the second coordinate.' }] }],
      hints: ['Coordinates in the basis solve B*c = x.', 'A undoes B, applies D, and redoes B: right to left, inv(B) acts first.', 'c = B\\x; A = B*D*inv(B); yc = D*c;'],
      transfer: 'Compute B*yc and compare it with A*x. Then explain why computing D*c is cheaper than A*x when the same map is applied many times.',
    },
    notation: [
      { tex: String.raw`\mathbf x = B\mathbf c, \qquad \mathbf c = B^{-1}\mathbf x`, say: 'The basis matrix converts coordinates in both directions.' },
      { tex: String.raw`A = BDB^{-1} \quad\Longleftrightarrow\quad D = B^{-1}AB`, say: 'The same map, written in two coordinate systems. Such matrices are called similar.' },
      { tex: String.raw`A\mathbf b_i = d_i\,\mathbf b_i`, say: 'When $D$ is diagonal, the basis vectors are eigenvectors of $A$.' },
    ],
    quiz: [
      { q: 'With $B = [\\mathbf b_1\\ \\mathbf b_2]$, which computation gives the coordinates of $\\mathbf x$ in the basis?', options: ['$B^{-1}\\mathbf x$', '$B\\mathbf x$', '$B^T\\mathbf x$ for any basis', '$\\mathbf x$ itself'], answer: 0, why: 'Coordinates solve $B\\mathbf c = \\mathbf x$. $B^T$ works only when the basis is orthonormal.' },
      { q: '$A = BDB^{-1}$ with $D$ diagonal. What is $A$ applied to the second column of $B$?', options: ['$d_2$ times that column', 'The second column of $D$', '$d_2$ times $\\mathbf e_2$', 'Zero'], answer: 0, why: 'The columns of $B$ are eigenvectors of $A$ with eigenvalues the diagonal entries of $D$.' },
    ],
    proof: {
      claim: 'If $A = BDB^{-1}$ with $D$ diagonal, then $A$ multiplies the $i$-th column $\\mathbf b_i$ of $B$ by $d_i$.',
      steps: [
        { ask: '$A\\mathbf b_i = BDB^{-1}\\mathbf b_i$. What is $B^{-1}\\mathbf b_i$?', options: ['$\\mathbf e_i$, the $i$-th standard basis vector', '$\\mathbf b_i$', 'The number $d_i$'], answer: 0, why: '$B\\mathbf e_i$ picks out the $i$-th column $\\mathbf b_i$, so undoing $B$ gives back $\\mathbf e_i$.' },
        { ask: 'Now apply $D$.', options: ['$D\\mathbf e_i = d_i\\mathbf e_i$', '$D\\mathbf e_i = \\mathbf e_i$', '$D\\mathbf e_i = d_i$'], answer: 0, why: 'A diagonal matrix scales each standard direction by its diagonal entry.' },
        { ask: 'Finally apply $B$.', options: ['$B(d_i\\mathbf e_i) = d_i\\mathbf b_i$', '$B(d_i\\mathbf e_i) = \\mathbf b_i$', '$B(d_i\\mathbf e_i) = d_i\\mathbf e_i$'], answer: 0, why: 'Numbers come outside, and $B\\mathbf e_i = \\mathbf b_i$.' },
      ],
      conclusion: 'So $A\\mathbf b_i = d_i\\mathbf b_i$: the columns of $B$ are eigenvectors of $A$. Finding a basis that makes a matrix diagonal is the subject of diagonalization.',
    },
  },
  {
    id: 'laml-vector-spaces', after: 'laml-change-of-basis', module: 'Spaces and bases', title: 'Polynomials are vectors too', minutes: 30, level: 'Intermediate',
    why: { title: 'Curves, sounds and signals are vectors too', story: 'A sound clip is a long list of air pressures, a curve is a few coefficients, and a photo is a grid of brightness values. Everything learned about arrows (adding, scaling, spans and bases) works on all of them, because they add and scale in the same way. That is why the same linear algebra fits curves to data, mixes audio tracks and compresses images.' },
    objective: 'Represent polynomials as coefficient vectors, combine them with vector arithmetic, and test whether a collection is a vector space.',
    prose: [
      'A shop models demand with two curves: p(t) = 1 + 2t and q(t) = 3 − t + t², where t counts hours after opening. Adding them gives 4 + t + t². Doubling p gives 2 + 4t. These are the two moves we make with vectors: add, and scale.',
      'Write each polynomial by its coefficients, constant first. Then p becomes [1; 2; 0] and q becomes [3; −1; 1]. Adding these coefficient vectors gives [4; 1; 1], which is exactly the coefficient list of p + q. The arithmetic never needed to know these were curves.',
      'A **vector space** is any collection where adding two members, or scaling one by a number, keeps you inside the collection. The familiar rules must also hold: there is a zero member, and the order of addition does not matter. Polynomials of degree at most 2 form a vector space. Each member needs three numbers, so it behaves exactly like ordinary three-dimensional vectors.',
      'To evaluate a polynomial at several times at once, build a matrix V. Its columns are 1, t and t², sampled at those times. Then `V*c` lists the values of the polynomial with coefficients c. Because this is a matrix product, the values of a sum are the sum of the values.',
      'Not every collection qualifies. Polynomials whose constant term is exactly 1 fail: adding two of them gives constant term 2. A quick test has three parts. Is zero in the collection? Do sums stay inside? Do multiples stay inside?',
    ],
    procedure: ['Fix an order for the coefficients (constant, t, t², …) and write each object as a coefficient vector.', 'Add, scale and combine the coefficient vectors exactly as you would ordinary vectors.', 'Translate back, or evaluate at sample times with a matrix whose columns are the building blocks.'],
    prediction: { question: 'Do the polynomials with p(0) = 0 form a vector space? What about those with p(0) = 1?', answer: 'p(0) = 0 does: zero is in it, and sums and multiples still vanish at 0. p(0) = 1 does not: the sum of two such polynomials has value 2 at 0.' },
    demo: {
      code: String.raw`t = [0; 1; 2; 3; 4];
V = [ones(5,1) t t.^2];
p = [1; 2; 0];
q = [3; -1; 1];
s = p + q;
disp('Coefficients of p + q:'); disp(s)
disp('Values of the sum minus sum of values:'); disp(V*s - (V*p + V*q))
plot(t, V*p)
hold on
plot(t, V*q)
plot(t, V*s)
title('Adding coefficient vectors adds the curves')
xlabel('Hours after opening t')
ylabel('Demand')
legend('p(t) = 1 + 2t', 'q(t) = 3 - t + t^2', 'p + q')`,
      explain: [{ code: 'V = [ones(5,1) t t.^2];', meaning: 'Each column samples one building block (1, t and t²) at the five times.' }, { code: 's = p + q;', meaning: 'Add the polynomials by adding their coefficients. The result is [4; 1; 1].' }, { code: 'disp(V*s - (V*p + V*q))', meaning: 'Evaluating the sum equals summing the evaluations, so every entry is 0.' }],
    },
    challenge: {
      prompt: 'Represent f(t) = 2 − t + 3t² and g(t) = 1 + 4t as coefficient vectors f and g, constant first. Store h = 3f − 2g, and store values = V*h, the values of h at the times in t.',
      setup: 't = [0; 1; 2];\nV = [ones(3,1) t t.^2];',
      starter: 'f = [0; 0; 0];\ng = [0; 0; 0];\nh = 3*f - 2*g;\nvalues = V*h;',
      solution: 'f = [2; -1; 3];\ng = [1; 4; 0];\nh = 3*f - 2*g;\nvalues = V*h;',
      checks: [{ name: 'h', expected: [4, -11, 9], tolerance: 1e-9, message: 'Combine the coefficient vectors: 3 times f minus 2 times g.' }, { name: 'values', expected: [4, 2, 18], tolerance: 1e-9, message: 'Multiply V by the coefficients of h.' }],
      cases: [{ setup: 't = [1; 2; 3; 4];\nV = [ones(4,1) t t.^2];', checks: [{ name: 'values', expected: [2, 18, 52, 104], tolerance: 1e-9, message: 'The same h, evaluated at four new times.' }] }],
      hints: ['Write the constant term first, then the coefficient of t, then the coefficient of t².', 'g has no t² term, so its last entry is 0.', 'f = [2; -1; 3]; g = [1; 4; 0]; then h = 3*f - 2*g; values = V*h;'],
      transfer: 'Pick three polynomials of degree at most 2. Write their coefficients as the columns of a 3 × 3 matrix, typed row by row, and compute its rank. Explain what rank 3 says about building any quadratic from your three.',
    },
    notation: [
      { tex: String.raw`p(t) = c_0 + c_1 t + c_2 t^2 \;\longleftrightarrow\; \mathbf c = (c_0, c_1, c_2)`, say: 'A quadratic is described completely by its three coefficients.' },
      { tex: String.raw`p + q \;\leftrightarrow\; \mathbf c_p + \mathbf c_q, \qquad \alpha p \;\leftrightarrow\; \alpha\,\mathbf c_p`, say: 'Adding or scaling polynomials is adding or scaling their coefficient vectors.' },
      { tex: String.raw`V\mathbf c = \begin{bmatrix} p(t_1) \\ \vdots \\ p(t_n) \end{bmatrix}, \qquad V_{i\cdot} = \begin{bmatrix} 1 & t_i & t_i^2 \end{bmatrix}`, say: 'Evaluating at the sample times is one matrix product.' },
    ],
    quiz: [
      { q: 'Which collection is a vector space?', options: ['Polynomials of degree at most 2 with $p(0) = 0$', 'Polynomials of degree at most 2 with $p(0) = 1$', 'Polynomials of degree exactly 2', 'Polynomials with only positive coefficients'], answer: 0, why: 'Only the first contains zero and is closed under addition and scaling. Degree exactly 2 fails because $t^2 + (-t^2) = 0$.' },
      { q: 'With coefficients ordered (constant, $t$, $t^2$), which vector represents $5t - t^2$?', options: ['$(0, 5, -1)$', '$(5, -1, 0)$', '$(-1, 5, 0)$', '$(5, 0, -1)$'], answer: 0, why: 'There is no constant term, the $t$ coefficient is 5 and the $t^2$ coefficient is $-1$.' },
    ],
    proof: {
      claim: 'The polynomials of degree at most 2 with $p(0) = 0$ form a vector space.',
      given: 'They sit inside all polynomials of degree at most 2, where the arithmetic rules already hold. So three checks are enough: zero, sums and multiples.',
      steps: [
        { ask: 'Is the zero polynomial in the collection?', options: ['Yes: it takes the value 0 everywhere, including at $t = 0$', 'No: the zero polynomial has no degree', 'Only if we also allow degree 3'], answer: 0, why: 'The zero polynomial is $0 + 0t + 0t^2$, and its value at 0 is 0.' },
        { ask: 'Take $p$ and $q$ with $p(0) = q(0) = 0$. What is $(p + q)(0)$?', options: ['$p(0) + q(0) = 0$', '$p(0)\\,q(0) = 0$', 'It cannot be determined'], answer: 0, why: 'Polynomials add value by value, so the sum also vanishes at 0.', hint: 'How is the value of a sum of functions defined?' },
        { ask: 'For a number $\\alpha$, what is $(\\alpha p)(0)$?', options: ['$\\alpha\\,p(0) = 0$', '$\\alpha$', '$p(\\alpha)$'], answer: 0, why: 'Scaling multiplies every value by $\\alpha$, and $\\alpha \\cdot 0 = 0$.' },
      ],
      conclusion: 'Zero is inside, and sums and multiples stay inside, so the collection is a vector space. The same test fails for $p(0) = 1$ at the very first check.',
    },
  },
  {
    id: 'laml-four-subspaces', after: 'laml-vector-spaces', module: 'Spaces and bases', title: 'Four subspaces and rank–nullity', minutes: 35, level: 'Advanced',
    why: { title: 'What a machine keeps and what it loses', story: 'Every matrix is a machine that turns inputs into outputs. Some inputs vanish without a trace, some outputs can never be produced, and some combinations of the outputs are always zero, which is often a conservation law: what flows into a junction flows out. The four subspaces sort all of this out, and rank–nullity is the bookkeeping that says nothing goes missing.' },
    objective: 'Identify the column space, nullspace, row space and left nullspace of a matrix, compute their dimensions, and use rank–nullity.',
    prose: [
      'A recipe matrix A = [1 2 3; 2 4 6] turns amounts of three ingredients into two nutrient totals. Its second row is twice its first, so every output has its second total equal to twice its first. The outputs fill only a line in the plane, not the whole plane.',
      'That line is the **column space**: every output A·x, which means every combination of the columns. Its dimension is the rank, here 1. The **nullspace** is every input with A·x = 0: recipes whose nutrients cancel out. Here it is a plane in three dimensions, so its dimension is 2.',
      'Inputs live in ℝ³, and A has 3 columns. The rank counts the input directions that A keeps. The nullspace dimension counts the directions it destroys. Together they account for every input direction: rank + nullity = number of columns. Here 1 + 2 = 3. This is the **rank–nullity theorem**.',
      'Transposing gives two more spaces. The **row space** is every combination of the rows, and it sits among the inputs. The **left nullspace** is every y with Aᵀy = 0, and it sits among the outputs. Here it is spanned by [2; −1]: the combination "twice nutrient one minus nutrient two" is always zero.',
      'The four spaces pair up at right angles. The row space is perpendicular to the nullspace, because A·x = 0 says x is perpendicular to every row. Likewise the column space is perpendicular to the left nullspace. In OpenMAT, `null(A)` returns orthonormal columns spanning the nullspace.',
    ],
    procedure: ['Compute r = rank(A). The column space and the row space both have dimension r.', 'For an m × n matrix, the nullspace has dimension n − r and the left nullspace has dimension m − r.', 'Check with null(A) and null(A\'): their columns satisfy A*N = 0 and A\'*L = 0.'],
    prediction: { question: 'A 3 × 5 matrix has rank 3. What are the dimensions of its nullspace and left nullspace?', answer: 'The nullspace has dimension 5 − 3 = 2. The left nullspace has dimension 3 − 3 = 0: only the zero vector.' },
    demo: {
      code: String.raw`A = [1 2 3; 2 4 6];
r = rank(A);
N = null(A);
L = null(A');
disp('Rank:'); disp(r)
disp('Nullspace basis size:'); disp(size(N))
disp('A times nullspace basis:'); disp(A*N)
disp('Left nullspace direction:'); disp(L)
t = -2:0.5:2;
plot(t*A(1,1), t*A(2,1))
hold on
plot(t*L(1), t*L(2))
title('Column space and left nullspace are perpendicular')
xlabel('Nutrient one')
ylabel('Nutrient two')
legend('Column space', 'Left nullspace')
axis equal`,
      explain: [{ code: 'N = null(A);', meaning: 'Two orthonormal columns spanning the nullspace plane: 3 columns minus rank 1.' }, { code: "L = null(A');", meaning: 'The left nullspace: combinations of the outputs that are always zero.' }, { code: 'disp(A*N)', meaning: 'Both nullspace directions are sent to zero, up to roundoff.' }],
    },
    challenge: {
      prompt: 'For A, store r = rank(A), nullity (the number of columns of null(A)), and total = r + nullity. Its third row is the sum of the first two: find the left nullspace vector y with y(3) = -1, and store residualY = A\'*y.',
      setup: 'A = [1 0 2 1; 0 1 1 -1; 1 1 3 0];',
      starter: "r = 0;\nnullity = 0;\ntotal = r + nullity;\ny = [0; 0; -1];\nresidualY = A'*y;",
      solution: "r = rank(A);\nnullity = size(null(A), 2);\ntotal = r + nullity;\ny = [1; 1; -1];\nresidualY = A'*y;",
      checks: [{ name: 'r', expected: 2, tolerance: 1e-9, message: 'Row 3 is row 1 plus row 2, so only two rows are independent.' }, { name: 'nullity', expected: 2, tolerance: 1e-9, message: 'Count the columns of null(A).' }, { name: 'total', expected: 4, tolerance: 1e-9, message: 'Rank plus nullity equals the number of columns.' }, { name: 'y', expected: [1, 1, -1], tolerance: 1e-9, message: 'Row 1 plus row 2 minus row 3 is zero.' }, { name: 'residualY', expected: [0, 0, 0, 0], tolerance: 1e-9, message: 'A left nullspace vector satisfies A\'*y = 0.' }],
      hints: ['A left nullspace vector lists weights for the rows that cancel them out.', 'Row 3 = row 1 + row 2, so 1·row 1 + 1·row 2 − 1·row 3 = 0.', "r = rank(A); nullity = size(null(A), 2); total = r + nullity; y = [1; 1; -1]; residualY = A'*y;"],
      transfer: 'Change one entry of row 3 so that A has rank 3. Predict the new nullity and left nullspace dimension before computing them, then explain which constraint between the rows disappeared.',
    },
    notation: [
      { tex: String.raw`C(A) \subseteq \mathbb R^m,\quad N(A) \subseteq \mathbb R^n,\quad C(A^T) \subseteq \mathbb R^n,\quad N(A^T) \subseteq \mathbb R^m`, say: 'Column space, nullspace, row space and left nullspace of an $m \\times n$ matrix.' },
      { tex: String.raw`\operatorname{rank} A + \dim N(A) = n`, say: 'Kept directions plus destroyed directions account for every input direction.' },
      { tex: String.raw`N(A) \perp C(A^T), \qquad N(A^T) \perp C(A)`, say: 'The four spaces meet at right angles in pairs.' },
    ],
    quiz: [
      { q: 'A $4 \\times 6$ matrix has rank 4. What is the dimension of its nullspace?', options: ['2', '0', '4', '6'], answer: 0, why: 'Rank–nullity: $6 - 4 = 2$.' },
      { q: 'Where does the nullspace of an $m \\times n$ matrix live?', options: ['In $\\mathbb R^n$, among the inputs', 'In $\\mathbb R^m$, among the outputs', 'In both', 'In neither'], answer: 0, why: 'A nullspace vector $\\mathbf x$ is an input with $A\\mathbf x = \\mathbf 0$, so it has $n$ entries.' },
    ],
    proof: {
      claim: 'Every vector in the nullspace of $A$ is perpendicular to every vector in the row space of $A$.',
      steps: [
        { ask: 'What does $A\\mathbf x = \\mathbf 0$ say, one entry at a time?', options: ['Entry $i$ is (row $i$ of $A$)$\\cdot\\mathbf x = 0$', 'Each entry of $\\mathbf x$ is zero', 'The columns of $A$ add to zero'], answer: 0, why: 'Each entry of $A\\mathbf x$ is the dot product of one row with $\\mathbf x$.' },
        { ask: 'So $\\mathbf x$ is perpendicular to each row. What about a combination $c_1\\mathbf r_1 + c_2\\mathbf r_2$ of rows?', options: ['Its dot product with $\\mathbf x$ is $c_1 \\cdot 0 + c_2 \\cdot 0 = 0$', 'It may fail to be perpendicular', 'It equals $\\mathbf x$'], answer: 0, why: 'The dot product distributes over the combination.' },
        { ask: 'Which set do all combinations of the rows form?', options: ['The row space of $A$', 'The nullspace of $A$', 'The column space of $A$'], answer: 0, why: 'That is the definition of the row space.' },
      ],
      conclusion: 'So the nullspace is perpendicular to the whole row space. Their dimensions are $n - r$ and $r$, so together they fill all of $\\mathbb R^n$.',
    },
  },
  {
    id: 'laml-gram-schmidt', after: 'laml-orthogonal-qr', module: 'Least squares and data', title: 'Gram–Schmidt: build perpendicular directions by hand', minutes: 30, level: 'Advanced',
    objective: 'Turn independent vectors into an orthonormal set with Gram–Schmidt, and read off the factors of A = QR.',
    prose: [
      'Two survey questions measure overlapping things. Their answer vectors a₁ = [3; 1] and a₂ = [2; 2] point in similar directions, so their information overlaps. We want two perpendicular unit directions that span the same plane, so each new direction carries only new information.',
      'Step one: keep the direction of a₁ and give it length 1. Dividing by its length gives q₁ = a₁/‖a₁‖. Step two: remove from a₂ the part along q₁. That part is (q₁·a₂)·q₁, exactly the projection from an earlier lesson. What remains, v₂ = a₂ − (q₁·a₂)·q₁, is perpendicular to q₁.',
      'Step three: give v₂ length 1 to get q₂. Now q₁ and q₂ are **orthonormal**: perpendicular unit vectors. With more vectors, repeat: subtract the parts along every q found so far, then normalise. This is the **Gram–Schmidt** process.',
      'The numbers removed along the way record how to rebuild the originals. a₁ = ‖a₁‖·q₁, and a₂ = (q₁·a₂)·q₁ + ‖v₂‖·q₂. Collected in an upper-triangular matrix R, this says A = Q·R, where Q has columns q₁ and q₂. The `qr` function computes the same factors, possibly with some signs flipped.',
      'Gram–Schmidt needs independent inputs. If a₂ were a multiple of a₁, then v₂ would be zero and could not be normalised. With nearly dependent inputs, roundoff spoils the perpendicularity; library QR uses more careful steps for that reason.',
    ],
    procedure: ['Normalise the first vector: q₁ = a₁/norm(a₁).', 'For each next vector, subtract its projection onto every earlier q, then normalise what remains.', 'Record the removed coefficients and the lengths in an upper-triangular R, so that A = Q*R.'],
    prediction: { question: 'If a₂ were already perpendicular to a₁, what would Gram–Schmidt do to it?', answer: 'Nothing except normalise it: its projection onto q₁ is zero, so v₂ = a₂ and q₂ = a₂/‖a₂‖. The entry R(1,2) would be 0.' },
    demo: {
      code: String.raw`a1 = [3; 1];
a2 = [2; 2];
q1 = a1/norm(a1);
v2 = a2 - dot(q1,a2)*q1;
q2 = v2/norm(v2);
Q = zeros(2,2);
Q(:,1) = q1;
Q(:,2) = q2;
R = [norm(a1) dot(q1,a2); 0 norm(v2)];
disp('Q transpose Q:'); disp(Q'*Q)
disp('Q times R:'); disp(Q*R)
plot([0 a1(1)], [0 a1(2)])
hold on
plot([0 a2(1)], [0 a2(2)])
plot([0 q1(1)], [0 q1(2)])
plot([0 q2(1)], [0 q2(2)])
title('Gram-Schmidt: two directions become perpendicular unit vectors')
xlabel('x'); ylabel('y')
legend('a1', 'a2', 'q1', 'q2')
axis equal`,
      explain: [{ code: 'v2 = a2 - dot(q1,a2)*q1;', meaning: 'Remove the part of a2 along q1. What remains is perpendicular to q1.' }, { code: 'R = [norm(a1) dot(q1,a2); 0 norm(v2)];', meaning: 'The numbers used along the way, arranged so that Q*R rebuilds [a1 a2].' }, { code: "disp(Q'*Q)", meaning: 'The identity matrix confirms the columns are orthonormal.' }],
    },
    challenge: {
      prompt: 'Apply Gram–Schmidt to the two columns of A, in order. Store the orthonormal vectors q1 and q2, and the upper-triangular R with A = Q*R.',
      setup: 'A = [1 1; 1 0; 0 1];',
      starter: 'q1 = A(:,1);\nq2 = A(:,2);\nR = eye(2);',
      solution: 'q1 = A(:,1)/norm(A(:,1));\nv2 = A(:,2) - dot(q1,A(:,2))*q1;\nq2 = v2/norm(v2);\nR = [norm(A(:,1)) dot(q1,A(:,2)); 0 norm(v2)];',
      checks: [{ name: 'q1', expected: [Math.SQRT1_2, Math.SQRT1_2, 0], tolerance: 1e-6, message: 'Divide the first column by its length.' }, { name: 'q2', expected: [0.5 / Math.sqrt(1.5), -0.5 / Math.sqrt(1.5), 1 / Math.sqrt(1.5)], tolerance: 1e-6, message: 'Remove the part along q1 from the second column, then normalise.' }, { name: 'R', expected: [[Math.SQRT2, Math.SQRT1_2], [0, Math.sqrt(1.5)]], tolerance: 1e-6, message: 'R holds the length of a1, the coefficient dot(q1,a2), and the length of v2.' }],
      cases: [{ setup: 'A = [2 1; 0 1; 0 1];', checks: [{ name: 'q2', expected: [0, Math.SQRT1_2, Math.SQRT1_2], tolerance: 1e-6, message: 'New columns, same process.' }, { name: 'R', expected: [[2, 1], [0, Math.SQRT2]], tolerance: 1e-6, message: 'Check the lengths and the coefficient.' }] }],
      hints: ['q1 is the first column divided by norm(A(:,1)).', 'v2 = A(:,2) - dot(q1,A(:,2))*q1 is perpendicular to q1.', 'q2 = v2/norm(v2); R = [norm(A(:,1)) dot(q1,A(:,2)); 0 norm(v2)];'],
      transfer: 'Run [Q2,R2] = qr(A) and compare with your factors. Explain any sign differences, and show that both pairs satisfy Q*R = A.',
    },
    notation: [
      { tex: String.raw`\mathbf q_1 = \frac{\mathbf a_1}{\|\mathbf a_1\|}, \qquad \mathbf v_2 = \mathbf a_2 - (\mathbf q_1\cdot\mathbf a_2)\,\mathbf q_1, \qquad \mathbf q_2 = \frac{\mathbf v_2}{\|\mathbf v_2\|}`, say: 'Normalise, remove what is already explained, normalise again.' },
      { tex: String.raw`A = QR, \qquad Q^TQ = I, \qquad R = \begin{bmatrix} \|\mathbf a_1\| & \mathbf q_1\cdot\mathbf a_2 \\ 0 & \|\mathbf v_2\| \end{bmatrix}`, say: 'The removed coefficients form an upper-triangular $R$.' },
    ],
    quiz: [
      { q: 'In Gram–Schmidt, what is subtracted from $\\mathbf a_2$?', options: ['Its projection onto $\\mathbf q_1$', '$\\mathbf a_1$ itself', 'Its length', 'Its projection onto $\\mathbf a_2$'], answer: 0, why: 'Removing the part along $\\mathbf q_1$ leaves only the new, perpendicular information.' },
      { q: 'Why is $R$ upper triangular?', options: ['Each $\\mathbf a_k$ uses only $\\mathbf q_1,\\dots,\\mathbf q_k$', 'Because $Q$ is orthogonal', 'Because $A$ is square', 'It is a coincidence of this example'], answer: 0, why: '$\\mathbf a_k$ is built from the first $k$ orthonormal vectors only, so entries below the diagonal are zero.' },
    ],
    proof: {
      claim: 'The Gram–Schmidt vector $\\mathbf v_2 = \\mathbf a_2 - (\\mathbf q_1\\cdot\\mathbf a_2)\\,\\mathbf q_1$ is perpendicular to $\\mathbf q_1$.',
      given: '$\\mathbf q_1$ is a unit vector: $\\mathbf q_1\\cdot\\mathbf q_1 = 1$.',
      steps: [
        { ask: 'Compute $\\mathbf q_1\\cdot\\mathbf v_2$ by distributing.', options: ['$\\mathbf q_1\\cdot\\mathbf a_2 - (\\mathbf q_1\\cdot\\mathbf a_2)(\\mathbf q_1\\cdot\\mathbf q_1)$', '$(\\mathbf q_1\\cdot\\mathbf a_2)^2$', '$\\mathbf q_1\\cdot\\mathbf a_2 + \\mathbf q_1\\cdot\\mathbf q_1$'], answer: 0, why: 'The dot product distributes over subtraction, and the number $\\mathbf q_1\\cdot\\mathbf a_2$ comes outside.' },
        { ask: 'Use the given fact.', options: ['$\\mathbf q_1\\cdot\\mathbf a_2 - \\mathbf q_1\\cdot\\mathbf a_2 = 0$', '$\\mathbf q_1\\cdot\\mathbf a_2 = 1$', '$\\mathbf v_2 = \\mathbf 0$'], answer: 0, why: 'Replacing $\\mathbf q_1\\cdot\\mathbf q_1$ by 1 makes the two terms equal.' },
        { ask: 'Why can we divide $\\mathbf v_2$ by its length?', options: ['$\\mathbf a_2$ is not a multiple of $\\mathbf a_1$, so $\\mathbf v_2 \\neq \\mathbf 0$', '$\\mathbf v_2$ is already a unit vector', '$\\mathbf q_1 \\neq \\mathbf 0$'], answer: 0, why: 'If $\\mathbf v_2 = \\mathbf 0$, then $\\mathbf a_2$ would be a multiple of $\\mathbf q_1$, and so of $\\mathbf a_1$. Independence rules that out.' },
      ],
      conclusion: 'Each step removes the parts along earlier directions and keeps a nonzero, perpendicular remainder. The coefficients removed are the entries of $R$.',
    },
  },
  {
    id: 'laml-orthogonal-matrices', after: 'laml-gram-schmidt', module: 'Least squares and data', title: 'Orthogonal matrices keep lengths and angles', minutes: 30, level: 'Advanced',
    objective: 'Recognise an orthogonal matrix, use its transpose as its inverse, and verify that it preserves lengths, angles and area.',
    prose: [
      'A robot arm turns a part by 30 degrees. Every distance between two holes on the part is the same afterwards, and every angle between two edges is the same too. Only the position changed. The matrix that does this is Q = [cos θ  −sin θ; sin θ  cos θ] with θ = 30°.',
      'Its columns are perpendicular unit vectors: they are where the two axes land. A square matrix with orthonormal columns is called **orthogonal**. In symbols that is QᵀQ = I, because each entry of QᵀQ is a dot product between two columns.',
      'That one identity has three useful consequences. The inverse is the transpose, so undoing a rotation costs no solve: `Q\'*y` gives back x. Lengths are preserved: norm(Q*x) = norm(x). Dot products are preserved too, so angles are unchanged.',
      'Determinants of orthogonal matrices are +1 or −1. A rotation has +1. A reflection, such as swapping the two coordinates, has −1: it preserves lengths but flips orientation like a mirror. Both keep the area of every shape.',
      'Orthogonal matrices are the reason QR and the SVD are numerically safe. Multiplying by Q never magnifies errors, because it never magnifies anything. In practice, test QᵀQ against I with a tolerance: computed entries carry roundoff of about 1e-16.',
    ],
    procedure: ['Check orthogonality: Q\'*Q should equal eye(n) within a tolerance.', 'Undo Q with its transpose: x = Q\'*y.', 'Use det(Q) = ±1 to tell a rotation (+1) from a reflection (−1).'],
    prediction: { question: 'Q rotates by 30°. What does Q*Q*Q do, and is it orthogonal?', answer: 'It rotates by 90°. A product of orthogonal matrices is orthogonal: each factor keeps lengths, so the product does too.' },
    demo: {
      code: String.raw`theta = pi/6;
Q = [cos(theta) -sin(theta); sin(theta) cos(theta)];
x = [3; 1];
y = [1; 2];
disp('Q transpose Q:'); disp(Q'*Q)
disp('Lengths before and after:'); disp([norm(x) norm(Q*x)])
disp('Dot products before and after:'); disp([dot(x,y) dot(Q*x,Q*y)])
disp('Determinant:'); disp(det(Q))
S = [0 2 2 0 0; 0 0 1 1 0];
R = Q*S;
plot(S(1,:), S(2,:))
hold on
plot(R(1,:), R(2,:))
title('A rotation moves the shape but keeps every length and angle')
xlabel('x'); ylabel('y')
legend('Original', 'Rotated')
axis equal`,
      explain: [{ code: "disp(Q'*Q)", meaning: 'The identity matrix: the columns are perpendicular unit vectors.' }, { code: 'disp([norm(x) norm(Q*x)])', meaning: 'Both lengths are √10, so the rotation did not stretch x.' }, { code: 'R = Q*S;', meaning: 'Each column of S is a corner of the rectangle; Q moves all corners at once.' }],
    },
    challenge: {
      prompt: 'Build the rotation Q by angle theta. Store Q, y = Q*x, back = Q\'*y (which should recover x), and lengthChange = norm(y) - norm(x).',
      setup: 'theta = pi/3;\nx = [2; 0];',
      starter: 'Q = eye(2);\ny = Q*x;\nback = y;\nlengthChange = 1;',
      solution: "Q = [cos(theta) -sin(theta); sin(theta) cos(theta)];\ny = Q*x;\nback = Q'*y;\nlengthChange = norm(y) - norm(x);",
      checks: [{ name: 'Q', expected: [[0.5, -Math.sqrt(3) / 2], [Math.sqrt(3) / 2, 0.5]], tolerance: 1e-6, message: 'Columns are [cos; sin] and [-sin; cos].' }, { name: 'y', expected: [1, Math.sqrt(3)], tolerance: 1e-6, message: 'Rotating [2; 0] by 60 degrees.' }, { name: 'back', expected: [2, 0], tolerance: 1e-6, message: 'The transpose undoes the rotation.' }, { name: 'lengthChange', expected: 0, tolerance: 1e-9, message: 'Rotations keep lengths.' }],
      cases: [{ setup: 'theta = pi/3;\nx = [1; 1];', checks: [{ name: 'y', expected: [0.5 - Math.sqrt(3) / 2, 0.5 + Math.sqrt(3) / 2], tolerance: 1e-6, message: 'Rotate a new point.' }, { name: 'back', expected: [1, 1], tolerance: 1e-6, message: 'Recover the new point.' }] }],
      hints: ['The first column is where [1; 0] lands: [cos(theta); sin(theta)].', 'The inverse of an orthogonal matrix is its transpose, Q\'.', "Q = [cos(theta) -sin(theta); sin(theta) cos(theta)]; y = Q*x; back = Q'*y; lengthChange = norm(y) - norm(x);"],
      transfer: 'The reflection F = [0 1; 1 0] swaps coordinates. Verify F\'*F = I and det(F) = -1, and describe what it does to the rectangle in the demo.',
    },
    notation: [
      { tex: String.raw`Q^TQ = I \quad\Longrightarrow\quad Q^{-1} = Q^T`, say: 'Orthonormal columns make the transpose the inverse.' },
      { tex: String.raw`\|Q\mathbf x\| = \|\mathbf x\|, \qquad (Q\mathbf x)\cdot(Q\mathbf y) = \mathbf x\cdot\mathbf y`, say: 'Lengths and angles are unchanged.' },
      { tex: String.raw`\det Q = \pm 1`, say: '$+1$ for a rotation, $-1$ for a reflection.' },
    ],
    quiz: [
      { q: 'Which matrix is orthogonal?', options: ['$\\begin{bmatrix} 0 & -1 \\\\ 1 & 0 \\end{bmatrix}$', '$\\begin{bmatrix} 2 & 0 \\\\ 0 & 1 \\end{bmatrix}$', '$\\begin{bmatrix} 1 & 1 \\\\ 0 & 1 \\end{bmatrix}$', '$\\begin{bmatrix} 1 & 1 \\\\ 1 & 1 \\end{bmatrix}$'], answer: 0, why: 'Its columns are perpendicular unit vectors: a 90° rotation. The others stretch or shear.' },
      { q: '$Q$ is orthogonal. How do you solve $Q\\mathbf x = \\mathbf b$ most cheaply?', options: ['$\\mathbf x = Q^T\\mathbf b$', 'Elimination on $[Q\\ \\mathbf b]$', '$\\mathbf x = Q\\mathbf b$', '$\\mathbf x = \\mathbf b/\\det Q$'], answer: 0, why: 'The transpose is the inverse, so one matrix–vector product solves it.' },
    ],
    proof: {
      claim: 'If $Q^TQ = I$, then $\\|Q\\mathbf x\\| = \\|\\mathbf x\\|$ for every vector $\\mathbf x$.',
      steps: [
        { ask: 'Write the squared length of $Q\\mathbf x$ as a dot product.', options: ['$\\|Q\\mathbf x\\|^2 = (Q\\mathbf x)^T(Q\\mathbf x)$', '$\\|Q\\mathbf x\\|^2 = Q^2\\|\\mathbf x\\|^2$', '$\\|Q\\mathbf x\\| = \\|Q\\|\\,\\|\\mathbf x\\|$'], answer: 0, why: 'A squared length is a vector dotted with itself, written $\\mathbf v^T\\mathbf v$.' },
        { ask: 'Use $(Q\\mathbf x)^T = \\mathbf x^TQ^T$.', options: ['$\\mathbf x^TQ^TQ\\,\\mathbf x$', '$Q^T\\mathbf x^T\\mathbf x\\,Q$', '$\\mathbf x^T\\mathbf x\\,Q^TQ$ as a product of numbers'], answer: 0, why: 'Transposing a product reverses the order of its factors.' },
        { ask: 'Use the given identity.', options: ['$\\mathbf x^TI\\mathbf x = \\mathbf x^T\\mathbf x = \\|\\mathbf x\\|^2$', '$\\mathbf x^T\\mathbf x = 1$', '$Q = I$'], answer: 0, why: 'Replacing $Q^TQ$ by $I$ leaves the squared length of $\\mathbf x$.' },
      ],
      conclusion: 'Lengths are preserved. Because $\\mathbf x\\cdot\\mathbf y = \\tfrac14(\\|\\mathbf x+\\mathbf y\\|^2 - \\|\\mathbf x-\\mathbf y\\|^2)$, dot products and therefore angles are preserved too.',
    },
  },
]
