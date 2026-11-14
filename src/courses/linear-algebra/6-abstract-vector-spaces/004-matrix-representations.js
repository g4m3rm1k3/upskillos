import similarMatricesDiagramUrl from '../diagrams/la-similar-matrices-diagram.svg?url'

export default {
  id: 'la6-004',
  slug: 'matrix-representations',
  chapter: 'la6',
  order: 4,
  title: 'Matrix Representations',
  subtitle: 'Every linear map between finite-dimensional vector spaces can be encoded as a matrix — but the matrix depends on the choice of bases. Change the bases, change the matrix.',
  tags: ['matrix representation', 'coordinate vector', 'change of basis', 'basis matrix', 'similar matrices', 'diagonalization', 'canonical form'],
  aliases: 'matrix representation coordinate vector change of basis basis matrix similar matrices diagonalization canonical form',

  hook: {
    question: "If differentiation is a linear map and every linear map has a matrix, what does the 'differentiation matrix' look like — and why does it depend on which basis you use for polynomials?",
    realWorldContext: "The same linear transformation can look very different depending on your basis. A rotation in $\\mathbb{R}^2$ is represented by a rotation matrix in the standard basis, but by a diagonal matrix (just scaling by $e^{i\\theta}$ and $e^{-i\\theta}$) in the basis of complex eigenvectors. This is exactly diagonalization! In signal processing, the DFT changes basis to the Fourier modes, turning convolution (complicated) into pointwise multiplication (simple). In numerical methods, preconditioners change the basis to make the system better conditioned.",
  },

  intuition: {
    blocks: [
      { type: 'prose', paragraphs: [
      'Let $T: \\mathbb{R}^2 \\to \\mathbb{R}^2$ be rotation by $90°$ counterclockwise. Where do the standard basis vectors go? $T(\\mathbf{e}_1) = T(1,0) = (0,1)$ and $T(\\mathbf{e}_2) = T(0,1) = (-1,0)$. Write these as columns: the matrix is $\\begin{bmatrix}0&-1\\\\1&0\\end{bmatrix}$. To verify: $T(3,2) = \\begin{bmatrix}0&-1\\\\1&0\\end{bmatrix}\\begin{bmatrix}3\\\\2\\end{bmatrix} = \\begin{bmatrix}-2\\\\3\\end{bmatrix}$ ✓. That\'s the whole algorithm — apply $T$ to each basis vector, use the outputs as columns.',
      '**Coordinates.** For a vector $\\mathbf{v} \\in V$, write $\\mathbf{v} = x_1 \\mathbf{b}_1 + \\cdots + x_n \\mathbf{b}_n$. The coordinate vector is $[\\mathbf{v}]_{\\mathcal{B}} = (x_1, \\ldots, x_n)^\\top \\in \\mathbb{R}^n$. Then matrix multiplication gives: $[T(\\mathbf{v})]_{\\mathcal{C}} = [T]_{\\mathcal{B}}^{\\mathcal{C}} \\cdot [\\mathbf{v}]_{\\mathcal{B}}$. This is the fundamental formula: matrices multiply coordinate vectors.',
      '**Change of basis.** If $T: V \\to V$ (same space) and you switch from basis $\\mathcal{B}$ to basis $\\mathcal{B}\'$, the matrix changes by conjugation: $[T]_{\\mathcal{B}\'} = P^{-1}[T]_{\\mathcal{B}}P$, where $P$ is the **change-of-basis matrix** — its $j$-th column is $[\\mathbf{b}_j]_{\\mathcal{B}\'} =$ coordinates of the old basis vectors in the new basis. Two matrices $A$ and $B$ represent the same linear map in different bases iff $B = P^{-1}AP$ for some invertible $P$.',
      ] },
      { type: 'image', src: similarMatricesDiagramUrl,
        alt: 'A commutative square diagram: top arrow A maps [v]_B to [Tv]_B, bottom arrow B equals P inverse A P maps [v]_B prime to [Tv]_B prime, with vertical arrows labeled P connecting the top row to the bottom row on both sides',
        caption: 'Either path around the square gives the same answer — A and B = P⁻¹AP are the same map, just read in different bases.' },
      { type: 'prose', paragraphs: [
      '**The matrix is always constructed the same way.** To build $[T]_{\\mathcal{B}}^{\\mathcal{C}}$ step by step: (1) Apply $T$ to the first basis vector $\\mathbf{b}_1$ to get $T(\\mathbf{b}_1) \\in W$. (2) Express $T(\\mathbf{b}_1)$ as a linear combination of the $\\mathcal{C}$ basis vectors. (3) Write the coefficients as the first column of the matrix. Repeat for each basis vector $\\mathbf{b}_2, \\ldots, \\mathbf{b}_n$. The columns go left to right, one per input basis vector. This construction works for any two vector spaces and any two bases — including polynomial spaces, function spaces, and matrix spaces.',
      '**Similar matrices share invariants.** Since $B = P^{-1}AP$ represents the same linear map in a different basis, any property of the map that does not depend on the choice of basis is preserved. These are called **similarity invariants**: $\\det(A) = \\det(B)$ (determinant is basis-free), $\\text{tr}(A) = \\text{tr}(B)$ (trace is basis-free), and the characteristic polynomial $\\det(\\lambda I - A) = \\det(\\lambda I - B)$ (eigenvalues are basis-free). This is why eigenvalues are intrinsic to the linear map, not to its matrix representation.',
      '**The DFT is a change of basis.** The Discrete Fourier Transform (DFT) is a change of basis in $\\mathbb{C}^n$ — from the standard basis (sample values in time) to the Fourier basis (complex exponentials $e^{2\\pi i k/n}$). In the Fourier basis, convolution (which is a complicated sum in the time basis) becomes pointwise multiplication (trivial). The DFT matrix $F$ is the change-of-basis matrix: $F_{jk} = e^{2\\pi i jk/n}/\\sqrt{n}$. This is why FFT-based convolution is so much faster than direct convolution — the right basis makes the computation trivial.',
      '**Where this is heading.** Once you understand that every linear map is represented by a matrix, and that changing the basis changes the matrix by $P^{-1}AP$, diagonalization becomes simple to interpret: finding a basis in which $A$ is diagonal is exactly finding a basis in which the map just scales each direction independently. The next lesson (isomorphisms) formalizes when two spaces are "the same" — meaning there is a bijective linear map between them — which connects directly to when two matrix representations are interchangeable.',
      ] },
      { type: 'viz', id: 'OpenMatNotebook',
        title: 'Matrix Representations and Basis Change',
        mathBridge: 'Build matrix representations and verify change-of-basis formulas.',
        caption: 'Same map, different bases: the matrix changes by P^{-1}AP.',
        initialProps: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Matrix of differentiation in standard basis',
              prose: [
                'Build D: P3 -> P3 by T(p) = p prime using basis {1, x, x^2, x^3}.',
                'The matrix-building recipe: apply T to each basis vector, write the output as a coordinate column. `T(1)=0=[0;0;0;0]`, `T(x)=1=[1;0;0;0]`, `T(x^2)=2x=[0;2;0;0]`, `T(x^3)=3x^2=[0;0;3;0]`. Stack as columns: `D = [0 1 0 0; 0 0 2 0; 0 0 0 3; 0 0 0 0]`.',
                'Verify: `p = [2;-1;3;1]` encodes 2-x+3x^2+x^3. `D*p = [-1;6;3;0]` should encode -1+6x+3x^2 = D(2-x+3x^2+x^3) ✓. The matrix is nilpotent: `D^4 = zeros(4,4)` because differentiating a degree-3 polynomial 4 times always gives zero. This is a property of the map, not just this basis.',
              ],
              code: `% T(1) = 0  -> [0,0,0,0]
% T(x) = 1  -> [1,0,0,0]
% T(x^2) = 2x -> [0,2,0,0]
% T(x^3) = 3x^2 -> [0,0,3,0]
D_std = [0 1 0 0;
         0 0 2 0;
         0 0 0 3;
         0 0 0 0]
disp('Differentiation matrix D in standard basis {1,x,x^2,x^3}:')
D_std

% Apply to p(x) = 1 + 3x^2 = [1;0;3;0]
p = [1; 0; 3; 0]
dp = D_std * p
disp('D(1 + 3x^2) should be 6x = [0;6;0;0]:')
dp
`,
            },
            {
              id: 2,
              cellTitle: 'Change of basis: standard to eigenbasis',
              prose: [
                'A linear map T on R^2 with matrix A = [3 1; 0 2]. Find its matrix in the eigenbasis.',
                '`[P, D] = eig(A)` gives eigenvector matrix P and diagonal D. The matrix in the eigenbasis is `P_inv_A_P = inv(P)*A*P` which equals `D` exactly. The same map T looks diagonal when described in eigencoordinates — this is WHY diagonalization is useful. `norm(inv(P)*A*P - D)` should be near zero.',
                'Similarity invariants check: `det(A) == det(D)` (both equal 3×2=6), `trace(A) == trace(D)` (both equal 5), `eig(A) == diag(D)` (same eigenvalues). These are properties of the MAP T, not the coordinate system. Changing basis changes the matrix but preserves det, trace, and eigenvalues — these are the "intrinsic" features of a linear transformation.',
              ],
              code: `A = [3 1; 0 2]
[P, D] = eig(A)
disp('Eigenvalues (diagonal of D):')
diag(D)
disp('Eigenvectors (columns of P):')
P
disp('D = P^{-1} A P: same map, eigenbasis coordinates:')
D_check = inv(P) * A * P
disp('Verify A = P D P^{-1}:')
A_check = P * D * inv(P)
norm(A - A_check)
`,
            },
          ],
        },
      },
    ],
    callouts: [
      {
        type: 'procedure',
        title: 'How to Build the Matrix of a Linear Map (5 Steps)',
        body: '**Given:** $T: V \\to W$ and ordered bases $\\mathcal{B} = (\\mathbf{b}_1,\\ldots,\\mathbf{b}_n)$ for $V$ and $\\mathcal{C} = (\\mathbf{c}_1,\\ldots,\\mathbf{c}_m)$ for $W$.\n**Step 1.** Apply $T$ to the first basis vector: compute $T(\\mathbf{b}_1) \\in W$.\n**Step 2.** Express $T(\\mathbf{b}_1)$ in the output basis $\\mathcal{C}$: find scalars $a_1,\\ldots,a_m$ such that $T(\\mathbf{b}_1) = a_1\\mathbf{c}_1 + \\cdots + a_m\\mathbf{c}_m$.\n**Step 3.** Write $(a_1,\\ldots,a_m)^\\top$ as the first column of $[T]$.\n**Step 4.** Repeat steps 1–3 for each remaining basis vector $\\mathbf{b}_2,\\ldots,\\mathbf{b}_n$. Each gives one column.\n**Step 5.** Verify: $[T]\\,[\\mathbf{v}]_{\\mathcal{B}} = [T(\\mathbf{v})]_{\\mathcal{C}}$ for a test vector $\\mathbf{v}$.',
      },
      {
        type: 'sequencing',
        title: 'Lesson 4 of 6 — Abstract Vector Spaces',
        body: '**Previous:** Linear Transformations — maps between vector spaces that preserve linear structure.\n**This lesson:** Matrix Representations — how to encode any linear transformation as a matrix once you choose bases, and how the matrix changes when you change the bases.\n**Next:** Isomorphisms — when two vector spaces are "structurally identical" and the precise meaning of that statement.',
      },
      {
        type: 'insight',
        title: 'The Fundamental Formula',
        body: 'If $T: V \\to W$, $\\mathbf{v} \\in V$:\n$[T(\\mathbf{v})]_{\\mathcal{C}} = [T]_{\\mathcal{B}}^{\\mathcal{C}} \\cdot [\\mathbf{v}]_{\\mathcal{B}}$\n\nThis converts abstract linear algebra into concrete matrix multiplication.',
      },
      {
        type: 'insight',
        title: 'Why Diagonalization Is Basis Change',
        body: 'If $A$ is diagonalizable with $A = PDP^{-1}$, then $D = P^{-1}AP$. This says: the matrix $A$ represents some linear map $T$ in the standard basis. The same map $T$ in the eigenvector basis is the diagonal matrix $D$. Diagonalization = finding the right basis to make the map look simple.',
      },
      {
        type: 'warning',
        title: 'Order of Bases Matters',
        body: 'The matrix $[T]_{\\mathcal{B}}^{\\mathcal{C}}$ is not just "the matrix of $T$" — it depends on the ordered pair of bases $(\\mathcal{B}, \\mathcal{C})$. Reordering either basis permutes rows or columns. Swapping to a different basis entirely changes the matrix significantly. Always track which bases you\'re using.',
      },
      {
        type: 'insight',
        title: 'Prediction',
        body: 'Before reading the math section: if you apply differentiation $D$ to the polynomial basis $\\{1, x, x^2, x^3\\}$ and write each result as a coordinate vector, what shape will the resulting matrix be, and where will the non-zero entries appear? Write down your prediction, then check it in the lab.',
      },
    ],
  },

  math: {
    prose: [
      '**Uniqueness.** Given bases $\\mathcal{B}$ and $\\mathcal{C}$, the matrix $[T]_{\\mathcal{B}}^{\\mathcal{C}}$ is uniquely determined: it is forced by the values of $T$ on the basis vectors and the coordinate system. Conversely, any $m \\times n$ matrix determines a unique linear map $\\mathbb{R}^n \\to \\mathbb{R}^m$ (by matrix multiplication), and hence a unique linear map $V \\to W$ once bases are fixed.',
      '**Composition of maps.** If $T: V \\to W$ and $S: W \\to X$ with bases $\\mathcal{B}, \\mathcal{C}, \\mathcal{D}$, then $[S \\circ T]_{\\mathcal{B}}^{\\mathcal{D}} = [S]_{\\mathcal{C}}^{\\mathcal{D}} \\cdot [T]_{\\mathcal{B}}^{\\mathcal{C}}$. This is why composition of linear maps corresponds to matrix multiplication. Order matters because function composition is not commutative.',
    ],
    callouts: [
      {
        type: 'theorem',
        title: 'Matrix of Composition = Product of Matrices',
        body: '$[S \\circ T]_{\\mathcal{B}}^{\\mathcal{D}} = [S]_{\\mathcal{C}}^{\\mathcal{D}} \\cdot [T]_{\\mathcal{B}}^{\\mathcal{C}}$\n\nThis is the abstract explanation for why matrix multiplication is defined the way it is. Matrix multiplication was invented to represent composition of linear maps.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Code: Matrix Representations and Change of Basis',
        mathBridge: 'Build matrix representations of linear maps, change basis via P^{-1}AP, verify similarity invariants.',
        caption: 'The same linear map looks different in different bases — but its eigenvalues, determinant, and trace never change.',
        initialProps: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Build the matrix of differentiation D: P_3 → P_3',
              prose: [
                'To build $[D]$ for differentiation in the basis $\\{1, x, x^2, x^3\\}$: compute $D(\\mathbf{b}_j) = \\mathbf{b}_j\'$ for each basis vector, express the result as a coordinate vector, and use it as the $j$-th column. Apply the matrix to verify it correctly differentiates a polynomial.',
                '`D = np.diag([1,2,3], k=1)` is a one-liner — the differentiation matrix has the coefficients 1,2,3 on the superdiagonal because D(x^n) = n*x^(n-1). Apply: `p = np.array([2, -1, 3, 1])` (2-x+3x²+x³). `D @ p` gives `[-1, 6, 3, 0]` encoding -1+6x+3x² ✓.',
                'The nilpotency check: `np.linalg.matrix_power(D, 4)` should be the zero matrix (every 4th derivative of a cubic polynomial is zero). The eigenvalues of D are all zero — confirm with `np.linalg.eigvals(D)`. A nilpotent matrix always has all-zero eigenvalues, and this matrix IS a Jordan block — connecting back to the Jordan normal form lesson.',
              ],
              code: `import numpy as np

# Differentiation D: P_3 -> P_3, D(p) = p'
# Basis: {1, x, x^2, x^3} represented as coordinate vectors

# D(1) = 0       -> [0, 0, 0, 0]
# D(x) = 1       -> [1, 0, 0, 0]
# D(x^2) = 2x    -> [0, 2, 0, 0]
# D(x^3) = 3x^2  -> [0, 0, 3, 0]

D = np.array([[0., 1., 0., 0.],
              [0., 0., 2., 0.],
              [0., 0., 0., 3.],
              [0., 0., 0., 0.]])

print("Differentiation matrix D in basis {1, x, x^2, x^3}:")
print(D)
print()

# Apply to p(x) = 4 - x + 3x^3  (coordinates [4, -1, 0, 3])
p_coords = np.array([4., -1., 0., 3.])
dp_coords = D @ p_coords
print(f"p = 4 - x + 3x^3  in coordinates: {p_coords}")
print(f"D(p) in coordinates: {dp_coords}")
print(f"  = {dp_coords[0]:.0f} + {dp_coords[1]:.0f}x + {dp_coords[2]:.0f}x^2")
print("Expected: D(4 - x + 3x^3) = -1 + 9x^2")
print("Match:", np.allclose(dp_coords, [-1., 0., 9., 0.]))`,
            },
            {
              id: 2,
              cellTitle: 'Change of basis: P^{-1}AP — same map, different coordinates',
              prose: [
                'If $A$ represents map $T$ in the standard basis, then $P^{-1}AP$ represents the same map in the basis formed by the columns of $P$. When $P$ is the eigenvector matrix, $P^{-1}AP = D$ is diagonal — the simplest possible representation. Similarity invariants (det, trace, eigenvalues) are preserved.',
                '`vals, P = np.linalg.eig(A)`. The diagonal matrix: `D = np.diag(vals)`. Verify: `np.allclose(np.linalg.inv(P) @ A @ P, D)` should be True. This is the diagonalization identity. `np.linalg.det(A)` should equal `np.linalg.det(D)` (product of eigenvalues), and `np.trace(A)` should equal `np.trace(D)` (sum of eigenvalues).',
                'The power of similar matrices: if you need A^100, compute `P @ np.diag(vals**100) @ np.linalg.inv(P)` instead of multiplying A by itself 100 times. This is O(n²) after eigendecomposition vs O(n³ * 100) for repeated multiplication. Plot both computations for n=5 and several power values to see the speedup — this is why diagonalization matters in practice.',
              ],
              code: `import numpy as np

A = np.array([[3., 1.],
              [0., 2.]])

eigenvalues, P = np.linalg.eig(A)
D_diag = np.diag(eigenvalues)
A_in_eigenbasis = np.linalg.inv(P) @ A @ P

print("Original matrix A:")
print(A)
print(f"det(A) = {np.linalg.det(A):.4f}, tr(A) = {np.trace(A):.4f}")
print()
print("A in eigenbasis (P^-1 A P):")
print(A_in_eigenbasis.round(10))
print(f"det = {np.linalg.det(A_in_eigenbasis):.4f}, tr = {np.trace(A_in_eigenbasis):.4f}")
print()
print("Same map, different basis — det and tr preserved:",
      np.isclose(np.linalg.det(A), np.linalg.det(A_in_eigenbasis)))`,
            },
          ],
        },
      },
    ],
  },

  rigor: {
    prose: [
      '**Canonical forms.** Under change of basis, matrices can be brought to simpler "canonical forms." Jordan Normal Form is the canonical form for any square matrix over $\\mathbb{C}$ under similarity. Rational Normal Form (Frobenius form) is the canonical form over $\\mathbb{Q}$. Smith Normal Form applies to integer matrices. The theory of canonical forms classifies all linear endomorphisms of a finite-dimensional space.',
      '**Jordan Normal Form (JNF).** Every $A \\in M_n(\\mathbb{C})$ is similar to a Jordan matrix $J = \\text{diag}(J_{n_1}(\\lambda_1), \\ldots, J_{n_k}(\\lambda_k))$ where each Jordan block is $J_m(\\lambda) = \\lambda I_m + N_m$ with $N_m$ the $m\\times m$ nilpotent shift (ones on the superdiagonal). The JNF is unique up to reordering of blocks. JNF explains everything about matrix powers, matrix exponentials, and ODEs: since $J_m(\\lambda)^t = e^{\\lambda t}(I + tN_m + \\frac{t^2}{2}N_m^2 + \\cdots)$ terminates after $m$ terms (because $N_m^m = 0$), all solutions to $\\dot{x} = Ax$ are combinations of $e^{\\lambda t} \\cdot \\text{polynomial}(t)$.',
      '**Smith Normal Form.** For an integer matrix $A \\in M_{m\\times n}(\\mathbb{Z})$, Smith Normal Form is the canonical form under multiplication by invertible integer matrices on both sides: $S = PAQ$ where $S = \\text{diag}(d_1, \\ldots, d_r, 0, \\ldots)$ with $d_1 | d_2 | \\cdots | d_r$ (each divides the next). The $d_i$ are the **invariant factors** of $A$. Smith Normal Form classifies finitely generated abelian groups: $\\mathbb{Z}^n / A\\mathbb{Z}^n \\cong \\mathbb{Z}/d_1 \\oplus \\cdots \\oplus \\mathbb{Z}/d_r$. In linear algebra over fields (where every nonzero element is a unit), Smith form reduces to rank-revealing form. Over polynomial rings $\\mathbb{F}[x]$, Smith form gives the rational canonical form, classifying matrices up to similarity.',
      '**Minimal polynomial and the Cayley-Hamilton theorem.** The characteristic polynomial of $A$ is $p_A(\\lambda) = \\det(\\lambda I - A)$. Cayley-Hamilton: $p_A(A) = 0$ (the matrix satisfies its own characteristic equation). The minimal polynomial $m_A(\\lambda)$ is the monic polynomial of smallest degree with $m_A(A) = 0$. It divides $p_A$ and has the same roots (same eigenvalues, but possibly with smaller multiplicity). For diagonalizable matrices, $m_A$ has no repeated roots; for Jordan blocks $J_m(\\lambda)$, $m_A = (x-\\lambda)^m$. The minimal polynomial controls the function calculus: $f(A)$ is defined for any $f$ that extends to the eigenvalues and, for repeated eigenvalues, whose derivatives up to the Jordan block size exist.',
    ],
    callouts: [
      {
        type: 'insight',
        title: 'When Are Two Matrices "The Same Map"?',
        body: '$A$ and $B$ represent the same linear map in different bases iff $B = P^{-1}AP$ (similar matrices).\n\nInvariants preserved under similarity: determinant, trace, rank, characteristic polynomial, eigenvalues, minimal polynomial, Jordan structure.\n\nUse these invariants to tell similar matrices apart — or to verify they might be similar.',
      },
    ],
    visualizations: [],
  },

  examples: [
    {
      id: 'ex-la6-004-1',
      title: 'Matrix of the evaluation map $T(p) = (p(-1), p(0), p(1))$',
      problem: 'Let $T: P_2 \\to \\mathbb{R}^3$ be $T(p) = (p(-1), p(0), p(1))^\\top$. Find the matrix of $T$ using bases $\\{1, x, x^2\\}$ for $P_2$ and standard basis for $\\mathbb{R}^3$.',
      steps: [
        {
          expression: 'T(1) = (1(-1)^0, 1(0)^0, 1(1)^0)^\\top = (1, 1, 1)^\\top',
          annotation: 'Apply $T$ to the first basis vector $1$ (constant polynomial).',
          strategyTitle: 'Column 1: $T(1)$',
        },
        {
          expression: 'T(x) = ((-1), 0, 1)^\\top',
          annotation: 'Evaluate $x$ at $x = -1, 0, 1$.',
          strategyTitle: 'Column 2: $T(x)$',
        },
        {
          expression: 'T(x^2) = ((-1)^2, 0^2, 1^2)^\\top = (1, 0, 1)^\\top',
          annotation: 'Evaluate $x^2$ at $x = -1, 0, 1$.',
          strategyTitle: 'Column 3: $T(x^2)$',
        },
        {
          expression: '[T] = \\begin{bmatrix}1&-1&1\\\\1&0&0\\\\1&1&1\\end{bmatrix}',
          annotation: 'Columns are the output vectors (already in the standard basis of $\\mathbb{R}^3$). This is the Vandermonde matrix for nodes $-1, 0, 1$.',
          strategyTitle: 'Assemble matrix',
          hints: ['The Vandermonde matrix arises in polynomial interpolation: if $[T]\\mathbf{c} = \\mathbf{y}$, we are finding coefficients of the polynomial through points $(-1, y_1), (0, y_2), (1, y_3)$.'],
        },
      ],
    },
    {
      id: 'ex-la6-004-2',
      title: 'Differentiation map $D: P_2 \\to P_2$ — build matrix column by column',
      problem: 'Let $D: P_2 \\to P_2$ be the differentiation map $D(p) = p\'$. Use the basis $\\mathcal{B} = \\{1, x, x^2\\}$ for both domain and codomain. Find $[D]_{\\mathcal{B}}^{\\mathcal{B}}$.',
      steps: [
        {
          expression: 'D(1) = 0 = 0\\cdot 1 + 0\\cdot x + 0\\cdot x^2',
          annotation: 'The derivative of the constant $1$ is $0$. In the basis $\\{1,x,x^2\\}$, zero has coordinate vector $(0,0,0)^\\top$.',
          strategyTitle: 'Column 1: $D(1)$',
        },
        {
          expression: 'D(x) = 1 = 1\\cdot 1 + 0\\cdot x + 0\\cdot x^2',
          annotation: 'The derivative of $x$ is $1$. In the basis, $1$ has coordinates $(1,0,0)^\\top$.',
          strategyTitle: 'Column 2: $D(x)$',
        },
        {
          expression: 'D(x^2) = 2x = 0\\cdot 1 + 2\\cdot x + 0\\cdot x^2',
          annotation: 'The derivative of $x^2$ is $2x$. In the basis, $2x$ has coordinates $(0,2,0)^\\top$.',
          strategyTitle: 'Column 3: $D(x^2)$',
        },
        {
          expression: '[D]_{\\mathcal{B}}^{\\mathcal{B}} = \\begin{bmatrix}0&1&0\\\\0&0&2\\\\0&0&0\\end{bmatrix}',
          annotation: 'Assemble the three column vectors. The matrix is strictly upper triangular — differentiation lowers the degree by one, so it maps each basis vector to an earlier one.',
          strategyTitle: 'Assemble and interpret',
        },
        {
          expression: 'D(3 + 5x - 2x^2): \\quad [D]\\begin{bmatrix}3\\\\5\\\\-2\\end{bmatrix} = \\begin{bmatrix}0&1&0\\\\0&0&2\\\\0&0&0\\end{bmatrix}\\begin{bmatrix}3\\\\5\\\\-2\\end{bmatrix} = \\begin{bmatrix}5\\\\-4\\\\0\\end{bmatrix}',
          annotation: 'Verify: $\\frac{d}{dx}(3 + 5x - 2x^2) = 5 - 4x$. Coordinate vector $(5,-4,0)^\\top$ corresponds to $5 - 4x$ in the basis $\\{1,x,x^2\\}$ ✓.',
          strategyTitle: 'Verify on a concrete polynomial',
        },
      ],
    },
    {
      id: 'ex-la6-004-3',
      title: 'Same map, different basis: how the matrix changes',
      problem: 'Let $T: \\mathbb{R}^2 \\to \\mathbb{R}^2$ be the linear map with standard matrix $A = \\begin{bmatrix}3&1\\\\0&2\\end{bmatrix}$. Find the matrix of $T$ in the basis $\\mathcal{B} = \\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}, \\begin{bmatrix}1\\\\0\\end{bmatrix}\\right\\}$.',
      steps: [
        {
          expression: 'P = \\begin{bmatrix}1&1\\\\1&0\\end{bmatrix}',
          annotation: 'The change-of-basis matrix has the new basis vectors as its columns. $P$ converts $\\mathcal{B}$-coordinates to standard coordinates.',
          strategyTitle: 'Form $P$: columns = new basis vectors',
        },
        {
          expression: 'P^{-1} = \\frac{1}{\\det P}\\begin{bmatrix}0&-1\\\\-1&1\\end{bmatrix} = \\frac{1}{-1}\\begin{bmatrix}0&-1\\\\-1&1\\end{bmatrix} = \\begin{bmatrix}0&1\\\\1&-1\\end{bmatrix}',
          annotation: '$\\det(P) = 0 - 1 = -1$. For a $2\\times 2$ matrix: swap the diagonal, negate off-diagonal, divide by determinant.',
          strategyTitle: 'Compute $P^{-1}$',
        },
        {
          expression: 'AP = \\begin{bmatrix}3&1\\\\0&2\\end{bmatrix}\\begin{bmatrix}1&1\\\\1&0\\end{bmatrix} = \\begin{bmatrix}4&3\\\\2&2\\end{bmatrix}',
          annotation: 'First multiply $A$ and $P$.',
          strategyTitle: 'Compute $AP$',
        },
        {
          expression: '[T]_{\\mathcal{B}} = P^{-1}AP = \\begin{bmatrix}0&1\\\\1&-1\\end{bmatrix}\\begin{bmatrix}4&3\\\\2&2\\end{bmatrix} = \\begin{bmatrix}2&2\\\\2&1\\end{bmatrix}',
          annotation: 'The matrix of $T$ in the $\\mathcal{B}$ basis. Note: $\\det([T]_{\\mathcal{B}}) = 2\\cdot 1 - 2\\cdot 2 = -2 = \\det(A)$ — the determinant is a similarity invariant ✓.',
          strategyTitle: 'Final answer: $P^{-1}AP$',
        },
      ],
    },
  ],

  // ── Walkthroughs ───────────────────────────────────────────────────────────
  walkthroughs: [
    {
      id: 'wt-la6-004-matrix-of-derivative',
      title: 'Building the Matrix of Differentiation in $\\mathcal{P}_2$',
      prereqs: ['Basis', 'Coordinates', 'Linear transformations'],
      problem: 'Find the matrix $[D]_\\mathcal{B}$ representing differentiation $D(p) = p\'$ in the standard basis $\\mathcal{B} = \\{1, x, x^2\\}$ of $\\mathcal{P}_2$.',
      steps: [
        {
          label: 'Apply $D$ to each basis vector and write the result in coordinates',
          strategy: 'The $j$-th column of the matrix is the coordinate vector of $T(\\mathbf{b}_j)$ in the basis $\\mathcal{B}$.',
          explanation: '$D(1) = 0 = 0\\cdot1+0\\cdot x+0\\cdot x^2 \\to [0,0,0]^\\top$. $D(x) = 1 = 1\\cdot1+0\\cdot x+0\\cdot x^2 \\to [1,0,0]^\\top$. $D(x^2) = 2x = 0\\cdot1+2\\cdot x+0\\cdot x^2 \\to [0,2,0]^\\top$.',
          math: 'D(1)=0,\\quad D(x)=1,\\quad D(x^2)=2x',
        },
        {
          label: 'Assemble the columns into the matrix',
          strategy: 'Columns are the coordinate vectors from left to right.',
          explanation: '$[D]_\\mathcal{B} = \\begin{bmatrix}0&1&0\\\\0&0&2\\\\0&0&0\\end{bmatrix}$ — an upper-shift matrix.',
          math: '[D]_\\mathcal{B} = \\begin{bmatrix}0&1&0\\\\0&0&2\\\\0&0&0\\end{bmatrix}',
        },
        {
          label: 'Verify by applying to $p = 3+2x+x^2$',
          strategy: 'Convert $p$ to coordinates, multiply by the matrix, convert back.',
          explanation: '$[p]_\\mathcal{B} = [3,2,1]^\\top$. $[D]_\\mathcal{B}[p]_\\mathcal{B} = [2,2,0]^\\top \\to 2+2x = p\'(x)$ ✓.',
          math: '[D]_\\mathcal{B}\\begin{bmatrix}3\\\\2\\\\1\\end{bmatrix} = \\begin{bmatrix}2\\\\2\\\\0\\end{bmatrix} \\leftrightarrow 2+2x \\checkmark',
          gotcha: 'The matrix depends on the choice of basis. A different ordering of the basis vectors gives a different (but equivalent) matrix. The transformation $D$ is basis-independent; its matrix representation is not.',
        },
      ],
    },
    {
      id: 'wt-la6-004-matrix-composition',
      title: 'Composition of Transformations = Matrix Multiplication',
      prereqs: ['Matrix representations', 'Function composition'],
      problem: 'Using the matrix $[D]_\\mathcal{B}$ from the previous walkthrough, find the matrix of $D^2$ (differentiate twice) and verify.',
      steps: [
        {
          label: 'Compute $([D]_\\mathcal{B})^2$',
          strategy: '$D^2 = D \\circ D$, so $[D^2]_\\mathcal{B} = ([D]_\\mathcal{B})^2$. Composition of transformations = product of their matrices.',
          explanation: '$([D]_\\mathcal{B})^2 = \\begin{bmatrix}0&1&0\\\\0&0&2\\\\0&0&0\\end{bmatrix}^2 = \\begin{bmatrix}0&0&2\\\\0&0&0\\\\0&0&0\\end{bmatrix}$.',
          math: '[D^2]_\\mathcal{B} = \\begin{bmatrix}0&0&2\\\\0&0&0\\\\0&0&0\\end{bmatrix}',
        },
        {
          label: 'Verify: $D^2(3+2x+x^2) = 2$',
          strategy: 'Apply $[D^2]$ to the coordinate vector of $3+2x+x^2$ and interpret.',
          explanation: '$[D^2]_\\mathcal{B}[3,2,1]^\\top = [2,0,0]^\\top \\to 2 \\cdot 1 = 2$ ✓. And directly: $(3+2x+x^2)\'\' = 2$ ✓.',
          math: '[D^2][3,2,1]^\\top = [2,0,0]^\\top \\leftrightarrow 2 \\checkmark',
          gotcha: '$[D^3]_\\mathcal{B} = ([D]_\\mathcal{B})^3 = 0$ (zero matrix) — differentiating a degree-2 polynomial three times gives 0. Algebraically: $[D]_\\mathcal{B}$ is nilpotent.',
        },
      ],
    },
  ],

  challenges: [
    {
      id: 'ch-la6-004-1',
      title: 'Change of basis for a rotation',
      difficulty: 'medium',
      problem: 'Let $T: \\mathbb{R}^2 \\to \\mathbb{R}^2$ have standard matrix $A = \\begin{bmatrix}0&1\\\\-1&0\\end{bmatrix}$ ($90°$ counterclockwise rotation). Find the matrix of $T$ in $\\mathcal{B} = \\left\\{\\begin{bmatrix}1\\\\1\\end{bmatrix}, \\begin{bmatrix}1\\\\-1\\end{bmatrix}\\right\\}$.',
      hint: 'Form $P = [\\mathbf{b}_1 | \\mathbf{b}_2]$ (columns = new basis vectors) and compute $P^{-1}AP$.',
      walkthrough: [
        '**Change-of-basis matrix:** $P = \\begin{bmatrix}1&1\\\\1&-1\\end{bmatrix}$ (columns are the new basis vectors).',
        '**Inverse of $P$:** $\\det(P) = -1 - 1 = -2$. $P^{-1} = \\frac{1}{-2}\\begin{bmatrix}-1&-1\\\\-1&1\\end{bmatrix} = \\begin{bmatrix}1/2&1/2\\\\1/2&-1/2\\end{bmatrix}$.',
        '**Compute $AP$:** $A\\begin{bmatrix}1&1\\\\1&-1\\end{bmatrix} = \\begin{bmatrix}1&-1\\\\-1&-1\\end{bmatrix}$.',
        '**Compute $P^{-1}(AP)$:** $\\begin{bmatrix}1/2&1/2\\\\1/2&-1/2\\end{bmatrix}\\begin{bmatrix}1&-1\\\\-1&-1\\end{bmatrix} = \\begin{bmatrix}0&-1\\\\1&0\\end{bmatrix}$.',
        '**Result:** $P^{-1}AP = \\begin{bmatrix}0&-1\\\\1&0\\end{bmatrix}$ — the same $90°$ rotation matrix! This makes sense: a rotation looks the same in any orthonormal-like basis. The representation changed, but the geometric content did not.',
      ],
    },
    {
      id: 'ch-la6-004-2',
      title: 'Multiplication-by-x as a linear map',
      difficulty: 'easy',
      problem: 'Let $M_x: P_2 \\to P_3$ be $M_x(p) = x \\cdot p(x)$ (multiply by $x$). Using the standard bases $\\{1, x, x^2\\}$ for $P_2$ and $\\{1, x, x^2, x^3\\}$ for $P_3$, find the matrix $[M_x]$, state its size, and verify with $p(x) = 3 - 2x + x^2$.',
      hint: 'Apply $M_x$ to each basis vector of $P_2$ and express the result in the basis of $P_3$. The result is a 4×3 matrix.',
      walkthrough: [
        { expression: 'M_x(1) = x = 0\\cdot1 + 1\\cdot x + 0\\cdot x^2 + 0\\cdot x^3 \\implies \\text{column 1} = (0,1,0,0)^\\top', annotation: 'x in basis {1,x,x^2,x^3} has coordinates (0,1,0,0).' },
        { expression: 'M_x(x) = x^2 \\implies \\text{column 2} = (0,0,1,0)^\\top, \\quad M_x(x^2) = x^3 \\implies \\text{column 3} = (0,0,0,1)^\\top', annotation: 'Each basis polynomial gets shifted up one degree.' },
        { expression: '[M_x] = \\begin{bmatrix}0&0&0\\\\1&0&0\\\\0&1&0\\\\0&0&1\\end{bmatrix} \\quad (4 \\times 3)', annotation: 'A 4×3 "shift" matrix — it moves each coefficient one step up the polynomial degree.' },
        { expression: '[M_x]\\begin{bmatrix}3\\\\-2\\\\1\\end{bmatrix} = \\begin{bmatrix}0\\\\3\\\\-2\\\\1\\end{bmatrix}', annotation: 'Verify: $M_x(3-2x+x^2) = 3x-2x^2+x^3$. In the basis of $P_3$: coefficients $(0,3,-2,1)^\\top$ ✓.' },
      ],
      answer: '$[M_x] = \\begin{bmatrix}0&0&0\\\\1&0&0\\\\0&1&0\\\\0&0&1\\end{bmatrix}$ (4×3). Verified: $[M_x](3,-2,1)^\\top = (0,3,-2,1)^\\top$, corresponding to $3x - 2x^2 + x^3$ ✓.',
    },
    {
      id: 'ch-la6-004-3',
      title: 'Matrix powers via Jordan structure',
      difficulty: 'hard',
      problem: 'Let $A = \\begin{bmatrix}1&2\\\\0&1\\end{bmatrix}$. Write $A = I + 2N$ where $N = \\begin{bmatrix}0&1\\\\0&0\\end{bmatrix}$ and show that $A^n = I + 2nN$ for all $n \\geq 1$ by expanding $(I+2N)^n$ using the binomial theorem with $N^2 = 0$. Then verify $A^{10}$.',
      hint: 'Compute $N^2$ first. Since $N^2 = 0$, the binomial series truncates after the linear term: $(I+2N)^n = \\sum_{k=0}^{n} \\binom{n}{k} (2N)^k = I + n(2N)$ (all higher terms vanish).',
      walkthrough: [
        { expression: 'N^2 = \\begin{bmatrix}0&1\\\\0&0\\end{bmatrix}\\begin{bmatrix}0&1\\\\0&0\\end{bmatrix} = \\begin{bmatrix}0&0\\\\0&0\\end{bmatrix}', annotation: '$N$ is nilpotent of degree 2: $N^2 = 0$, so all higher powers $N^k = 0$ for $k \\geq 2$.' },
        { expression: 'A^n = (I+2N)^n = \\sum_{k=0}^{n}\\binom{n}{k}(2N)^k = \\binom{n}{0}I + \\binom{n}{1}(2N) + 0 + 0 + \\cdots = I + 2nN', annotation: 'Binomial expansion truncates at $k=1$ since $N^2 = 0$.' },
        { expression: 'A^n = \\begin{bmatrix}1&0\\\\0&1\\end{bmatrix} + 2n\\begin{bmatrix}0&1\\\\0&0\\end{bmatrix} = \\begin{bmatrix}1&2n\\\\0&1\\end{bmatrix}', annotation: 'The upper-triangular Jordan block structure is preserved; the off-diagonal entry grows linearly in $n$.' },
        { expression: 'A^{10} = \\begin{bmatrix}1&20\\\\0&1\\end{bmatrix}', annotation: 'Verify directly: $A^2 = \\begin{bmatrix}1&4\\\\0&1\\end{bmatrix}$, $A^3 = \\begin{bmatrix}1&6\\\\0&1\\end{bmatrix}$, ..., pattern confirmed.' },
      ],
      answer: '$A^n = \\begin{bmatrix}1&2n\\\\0&1\\end{bmatrix}$. Derived using $N^2=0$ and the binomial theorem. $A^{10} = \\begin{bmatrix}1&20\\\\0&1\\end{bmatrix}$.',
    },
  ],

  mentalModel: [
    'To build the matrix: apply $T$ to each basis vector, express in output basis, make them columns.',
    'Fundamental formula: $[T(\\mathbf{v})]_{\\mathcal{C}} = [T]_{\\mathcal{B}}^{\\mathcal{C}} \\cdot [\\mathbf{v}]_{\\mathcal{B}}$.',
    'Change of basis: $[T]_{\\mathcal{B}\'} = P^{-1}[T]_{\\mathcal{B}}P$ where $P$ columns are old basis in new coordinates.',
    'Composition of maps = product of matrices (in compatible bases).',
    'Diagonalization IS finding the basis where the matrix is simplest (diagonal).',
  ],

  checkpoints: [
    { id: 'cp-la6-004-1', label: 'Read intuition section', type: 'read' },
    { id: 'cp-la6-004-2', label: 'Read math section', type: 'read' },
    { id: 'cp-la6-004-3', label: 'Read rigor section', type: 'read' },
    { id: 'cp-la6-004-4', label: 'Run differentiation matrix lab', type: 'lab' },
    { id: 'cp-la6-004-5', label: 'Run change of basis to eigenbasis lab', type: 'lab' },
    { id: 'cp-la6-004-6', label: 'Work example 1: evaluation map Vandermonde', type: 'example' },
    { id: 'cp-la6-004-7', label: 'Work example 2: differentiation matrix column by column', type: 'example' },
    { id: 'cp-la6-004-8', label: 'Solve challenge: change of basis for rotation', type: 'challenge' },
  ],

  assessment: {
    questions: [
      {
        id: 'assess-la6-004-1',
        type: 'computation',
        text: 'Let $T: P_2 \\to P_2$ be defined by $T(a + bx + cx^2) = b + 2cx$. Find the matrix of $T$ in the standard basis $\\{1, x, x^2\\}$, identify the kernel and image, and verify rank-nullity.',
        answer: '$T(1)=0, T(x)=1, T(x^2)=2x$. Matrix: $\\begin{bmatrix}0&1&0\\\\0&0&2\\\\0&0&0\\end{bmatrix}$. Kernel: $T(a+bx+cx^2)=0$ iff $b=0,c=0$, so $\\ker T = \\{$constants$\\}$, $\\dim(\\ker T)=1$. Image: span of $T(x)=1$ and $T(x^2)=2x$, so $\\text{im}(T) = P_1$, $\\dim=2$. Rank-nullity: $1+2=3=\\dim P_2$ ✓.',
        hint: 'Apply $T$ to each of $1, x, x^2$ and express each result in the basis $\\{1,x,x^2\\}$.',
      },
    ],
  },

  quiz: [
    {
      id: 'q-la6-004-1',
      type: 'choice',
      text: 'The $j$-th column of the matrix $[T]_{\\mathcal{B}}^{\\mathcal{C}}$ contains:',
      options: ['The $j$-th input basis vector', 'Coordinates of $T(\\mathbf{b}_j)$ in the output basis $\\mathcal{C}$', 'Coordinates of $\\mathbf{b}_j$ in the input basis $\\mathcal{B}$', 'The $j$-th eigenvalue of $T$'],
      answer: 'Coordinates of $T(\\mathbf{b}_j)$ in the output basis $\\mathcal{C}$',
      hints: ['The fundamental construction: apply $T$ to each input basis vector, express the result in the output basis. The resulting coordinate vector becomes the $j$-th column.'],
      reviewSection: 'math',
    },
    {
      id: 'q-la6-004-2',
      type: 'choice',
      text: 'Matrices $A$ and $B$ represent the same linear transformation $T: V \\to V$ in different bases iff:',
      options: ['$AB = BA$', '$\\det A = \\det B$', '$B = P^{-1}AP$ for some invertible $P$', '$A + B = 0$'],
      answer: '$B = P^{-1}AP$ for some invertible $P$',
      hints: ['This is matrix similarity. The change-of-basis matrix $P$ converts coordinates between the old and new bases. Diagonalization is a special case: $P^{-1}AP = D$ where $P$ is the eigenvector matrix.'],
      reviewSection: 'math',
    },
    {
      id: 'q-la6-004-3',
      type: 'choice',
      text: 'If $T: U \\to V$ has matrix $[T]$ and $S: V \\to W$ has matrix $[S]$, the matrix of $S \\circ T: U \\to W$ is:',
      options: ['$[T][S]$', '$[S][T]$', '$[S]+[T]$', '$[T]^{-1}[S]$'],
      answer: '$[S][T]$',
      hints: ['Composition goes right-to-left: $(S \\circ T)(\\mathbf{v}) = S(T(\\mathbf{v}))$. In coordinates: $[S \\circ T] = [S][T]$. Note the order: $T$ acts first, so it is on the right. Matrix multiplication does NOT commute, and neither does composition.'],
      reviewSection: 'math',
    },
    {
      id: 'q-la6-004-4',
      type: 'choice',
      text: 'For $T: \\mathbb{R}^n \\to \\mathbb{R}^n$, which quantity is preserved under change of basis (i.e., same for all matrix representations of $T$)?',
      options: ['The individual matrix entries', 'The determinant', 'The characteristic polynomial and eigenvalues', 'Both B and C'],
      answer: 'Both B and C',
      hints: ['Similarity invariants: $\\det(P^{-1}AP) = \\det(P^{-1})\\det(A)\\det(P) = \\det(A)$. Also $\\det(P^{-1}AP - \\lambda I) = \\det(P^{-1}(A-\\lambda I)P) = \\det(A-\\lambda I)$. So both determinant and characteristic polynomial are invariants.'],
      reviewSection: 'rigor',
    },
    {
      id: 'q-la6-004-5',
      type: 'choice',
      text: 'The differentiation matrix $D$ for $P_3$ (using basis $\\{1, x, x^2, x^3\\}$) is $4\\times 4$. Which entry is in position $(1,2)$ (row 1, column 2)?',
      options: ['0', '1', '2', '3'],
      answer: '1',
      hints: ['Column 2 comes from $D(x) = 1$. In the basis $\\{1,x,x^2,x^3\\}$, the polynomial $1$ is the first basis vector, so its coordinates are $(1,0,0,0)^\\top$. Row 1, column 2 is the first entry of that column vector, which is $1$.'],
      reviewSection: 'intuition',
    },
    {
      id: 'q-la6-004-6',
      type: 'choice',
      text: 'The matrix of the $90°$ counterclockwise rotation $T: \\mathbb{R}^2 \\to \\mathbb{R}^2$ in the standard basis is:',
      options: ['$\\begin{bmatrix}0&1\\\\-1&0\\end{bmatrix}$', '$\\begin{bmatrix}0&-1\\\\1&0\\end{bmatrix}$', '$\\begin{bmatrix}1&0\\\\0&-1\\end{bmatrix}$', '$\\begin{bmatrix}-1&0\\\\0&1\\end{bmatrix}$'],
      answer: '$\\begin{bmatrix}0&-1\\\\1&0\\end{bmatrix}$',
      hints: ['Compute where $T$ sends the basis vectors: $T(1,0) = (0,1)$ (column 1) and $T(0,1) = (-1,0)$ (column 2). Assemble into a matrix.'],
      reviewSection: 'intuition',
    },
    {
      id: 'q-la6-004-7',
      type: 'choice',
      text: 'If $T: \\mathbb{R}^3 \\to \\mathbb{R}^2$ is linear and represented by a $2\\times 3$ matrix in standard bases, what is the size of $[T]_{\\mathcal{B}}^{\\mathcal{C}}$ for any bases $\\mathcal{B}$ of $\\mathbb{R}^3$ and $\\mathcal{C}$ of $\\mathbb{R}^2$?',
      options: ['$3 \\times 2$', '$2 \\times 3$', '$3 \\times 3$', 'Depends on the bases chosen'],
      answer: '$2 \\times 3$',
      hints: ['The shape of the matrix is $\\dim(W) \\times \\dim(V)$ for $T: V \\to W$. Here $\\dim(\\mathbb{R}^2) = 2$ (rows) and $\\dim(\\mathbb{R}^3) = 3$ (columns). Changing bases does not change the shape of the matrix — only its entries.'],
      reviewSection: 'math',
    },
    {
      id: 'q-la6-004-8',
      type: 'choice',
      text: 'In the differentiation matrix for $P_2$ (basis $\\{1, x, x^2\\}$), what is the rank?',
      options: ['1', '2', '3', '0'],
      answer: '2',
      hints: ['The differentiation matrix is $\\begin{bmatrix}0&1&0\\\\0&0&2\\\\0&0&0\\end{bmatrix}$. It has two nonzero rows in RREF, so rank $= 2$. Equivalently, $\\ker D = $ constants (dimension 1), so by rank-nullity, rank $= 3 - 1 = 2$.'],
      reviewSection: 'math',
    },
    {
      id: 'q-la6-004-9',
      type: 'choice',
      text: 'Diagonalization $A = PDP^{-1}$ is equivalent to saying:',
      options: ['$A$ and $D$ are similar matrices', '$A$ and $D$ have the same entries', '$A$ is an orthogonal matrix', '$P$ and $D$ commute'],
      answer: '$A$ and $D$ are similar matrices',
      hints: ['Rearranging $A = PDP^{-1}$ gives $D = P^{-1}AP$, which is exactly the definition of similar matrices. Diagonalization is a special case of similarity where the target matrix is diagonal.'],
      reviewSection: 'rigor',
    },
    {
      id: 'q-la6-004-10',
      type: 'choice',
      text: 'If $T: V \\to W$ has matrix $[T]_{\\mathcal{B}}^{\\mathcal{C}}$ and you change only the input basis to $\\mathcal{B}\'$ (keeping $\\mathcal{C}$ the same), how does the matrix change?',
      options: ['Multiply on the left by $P^{-1}$', 'Multiply on the right by $P$', 'Multiply on the right by $P^{-1}$', 'Multiply on the left by $P$'],
      answer: 'Multiply on the right by $P$',
      hints: ['The new matrix is $[T]_{\\mathcal{B}\'}^{\\mathcal{C}} = [T]_{\\mathcal{B}}^{\\mathcal{C}} \\cdot P_{\\mathcal{B}\' \\to \\mathcal{B}}$. Changing only the input basis multiplies on the right by the change-of-basis matrix. Changing the output basis multiplies on the left.'],
      reviewSection: 'math',
    },
  ],

  mastery: {
    targetLevel: 2,
    solveIndependently: 'Given any linear map $T: V \\to W$ and ordered bases for $V$ and $W$, build $[T]_{\\mathcal{B}}^{\\mathcal{C}}$ from scratch by applying $T$ to each basis vector and expressing outputs in the codomain basis.',
    explainVerbally: 'Explain why two matrices representing the same linear map must satisfy $B = P^{-1}AP$, and identify what $P$ represents geometrically.',
    detectIncorrectApplication: 'Spot when someone assembles the matrix with rows instead of columns, or uses the wrong basis for the output coordinates.',
    transferToUnfamiliar: 'Apply the column-by-column construction to a new vector space (e.g., symmetric matrices, trigonometric polynomials) without being told the procedure.',
  },

  misconceptions: [
    {
      falseBelief: 'The matrix of a linear map is a fixed, intrinsic object.',
      whyStudentsThinkIt: 'In early linear algebra, every matrix problem uses the standard basis implicitly, so students never see the basis dependence.',
      correctionExample: 'The $90°$ rotation $T$ has matrix $\\begin{bmatrix}0&-1\\\\1&0\\end{bmatrix}$ in the standard basis but a different matrix in the eigenvector basis over $\\mathbb{C}$.',
      contrastCase: 'The eigenvalues of $T$ ARE intrinsic — they do not change when you change bases.',
    },
    {
      falseBelief: 'To find the matrix column, just write $T(\\mathbf{b}_j)$ as a vector directly.',
      whyStudentsThinkIt: 'When the codomain has the standard basis, this accidentally works. Students overgeneralize.',
      correctionExample: 'For $T: P_2 \\to P_2$, $T(x^2) = 2x$. You cannot write $2x$ as a column of real numbers without first expressing it in the codomain basis: $(0, 2, 0)^\\top$ in $\\{1, x, x^2\\}$.',
      contrastCase: 'For $T: \\mathbb{R}^2 \\to \\mathbb{R}^2$ with the standard basis on both sides, writing the output vector directly as a column IS correct because the standard basis IS the coordinate system.',
    },
  ],

  transferPrompts: [
    {
      situation: 'You have a linear map on polynomials (like integration or multiplication by $x$) and need to work with it computationally.',
      competingTechniques: 'Could try to work with the polynomials abstractly, or guess the matrix pattern.',
      whyThisTechniqueWins: 'The column-by-column construction gives the exact matrix in $O(n)$ steps for $n$-dimensional spaces — no guessing needed. Once you have the matrix, all of numerical linear algebra applies.',
    },
    {
      situation: 'Two matrices $A$ and $B$ are given and you want to know if they represent the same linear map.',
      competingTechniques: 'Could compare all entries (fails — different bases give different entries) or compute $P^{-1}AP = B$ directly (hard to find $P$).',
      whyThisTechniqueWins: 'Compute similarity invariants: if $\\det(A) \\neq \\det(B)$ or $\\text{tr}(A) \\neq \\text{tr}(B)$ or characteristic polynomials differ, they are NOT similar. If all invariants agree, they might be similar.',
    },
  ],

  semantics: {
    core: [
      { symbol: '[T]_{\\mathcal{B}}^{\\mathcal{C}}', meaning: 'Matrix of T in bases B (domain) and C (codomain); shape dim(W) × dim(V); j-th column = C-coordinates of T(b_j)' },
      { symbol: '[T(\\mathbf{v})]_{\\mathcal{C}} = [T]_{\\mathcal{B}}^{\\mathcal{C}}[\\mathbf{v}]_{\\mathcal{B}}', meaning: 'The fundamental formula: abstract linear map = matrix multiplication in coordinates' },
      { symbol: 'P^{-1}AP = B', meaning: 'Matrix similarity: A and B represent the same linear map T in different bases; P columns are the new basis vectors in the old coordinates' },
      { symbol: '\\det(A), \\text{tr}(A)', meaning: 'Similarity invariants: preserved under change of basis; they are properties of the linear map, not its matrix representation' },
      { symbol: 'A = PDP^{-1}', meaning: 'Diagonalization: D is the matrix of T in the eigenvector basis; diagonal entries are eigenvalues; P columns are eigenvectors' },
    ],
    rulesOfThumb: [
      'Apply T to each basis vector → express in output basis → use as column. This is the one universal rule.',
      'The matrix shape is (dim codomain) × (dim domain) — rows = output dimension, columns = input dimension.',
      'Similarity invariants (det, tr, eigenvalues, characteristic polynomial) are basis-independent — they belong to the map, not the matrix.',
      'Diagonalization = finding the basis where the matrix is diagonal = finding the eigenvector basis.',
      'If N is nilpotent (N^k = 0 for some k), then f(I + cN) = f(I) + f\'(I)(cN) + ... truncates after k terms — use this for matrix powers and exponentials.',
    ],
  },

  spiral: {
    recoveryPoints: [
      { id: 'la6-003', label: 'Linear Transformations', reason: 'The matrix representation is the coordinate version of an abstract linear map; the abstract map comes first' },
      { id: 'la3-002', label: 'Eigenvalues and eigenvectors', reason: 'Diagonalization A = PDP^{-1} is exactly finding the basis where the matrix representation is diagonal' },
    ],
    futureLinks: [
      { id: 'la6-005', label: 'Isomorphisms', reason: 'A bijective linear map T has an invertible matrix [T]; the change-of-basis matrix P is itself an isomorphism' },
      { id: 'la6-006', label: 'Change of Basis', reason: 'The P^{-1}AP formula is the central object of la6-006; understanding it here provides the foundation' },
    ],
  },

  debugging: [
    {
      commonError: 'Assembling matrix rows instead of columns.',
      symptom: 'The matrix is the transpose of the correct answer; $[T(\\mathbf{v})]_{\\mathcal{C}} = [T]^\\top [\\mathbf{v}]_{\\mathcal{B}}$ appears to work for specific examples but is wrong in general.',
      whyItHappened: 'Students write $T(\\mathbf{b}_j)$ as a row vector instead of a column vector when assembling the matrix.',
      repairStrategy: 'Always write each $T(\\mathbf{b}_j)$ as a column, then stack the columns side by side. Verify with the fundamental formula: $[T]\\mathbf{v}$ should give $[T(\\mathbf{v})]_{\\mathcal{C}}$.',
    },
    {
      commonError: 'Using the wrong basis for the output coordinates.',
      symptom: 'The matrix entries are the coefficients of $T(\\mathbf{b}_j)$ in the wrong basis, giving a matrix that does not satisfy the fundamental formula.',
      whyItHappened: 'Forgetting that the column entries must be the coordinates in the OUTPUT basis $\\mathcal{C}$, not just the "natural" representation of $T(\\mathbf{b}_j)$.',
      repairStrategy: 'After computing $T(\\mathbf{b}_j)$, always ask: "How do I write this in the basis $\\mathcal{C}$?" Solve $T(\\mathbf{b}_j) = a_1 \\mathbf{c}_1 + \\cdots + a_m \\mathbf{c}_m$ for the $a_i$, then use $(a_1, \\ldots, a_m)^\\top$ as the column.',
    },
  ],
};
