// Linear-algebra additions, continued: positive definiteness, the SVD, norms and the trace, low-rank
// approximation, matrix calculus, and tensors.
import { quadraticForm, cholesky, svd, lowRank, trace, frobenius, matmul, quadraticGradient, shape, addBias } from '../engine/maths.js'
import { f } from './util.js'

const M2 = [[3, 0], [4, 5]]

export const LINALG3 = [
  {
    id: 'positive-definite', title: 'Positive definite matrices and quadratic forms',
    goal: 'Read $\\mathbf v^\\top S\\mathbf v$ as a bowl or a saddle, prove "positive definite ⇔ all eigenvalues positive", show $X^\\top X$ is never negative, and test definiteness with Cholesky.',
    builds: ['spectral'],
    blocks: [
      { md: `A symmetric matrix $S$ turns each vector into a number, the **quadratic form** $\\mathbf v^\\top S\\mathbf v = \\sum_{i,j} S_{ij}v_iv_j$. In two dimensions, $\\begin{pmatrix}a&b\\\\b&c\\end{pmatrix}$ gives $av_1^2 + 2bv_1v_2 + cv_2^2$: a bowl, a cap or a saddle over the plane, exactly the shapes of lesson [[#second-derivative]]'s bends in many directions.

$S$ is **positive definite** if $\\mathbf v^\\top S\\mathbf v > 0$ for every $\\mathbf v \\ne \\mathbf 0$ (a bowl: up in every direction), and **positive semidefinite** if $\\ge 0$.

**Positive definite ⇔ every eigenvalue is positive.** By the spectral theorem, write $\\mathbf v = \\sum_i c_i\\mathbf q_i$ in the orthonormal eigenvector basis. Then $S\\mathbf v = \\sum_i c_i\\lambda_i\\mathbf q_i$, and dotting with $\\mathbf v$ (cross terms vanish):

$$\\mathbf v^\\top S\\mathbf v = \\lambda_1c_1^2 + \\lambda_2c_2^2 + \\dots + \\lambda_nc_n^2$$

If every $\\lambda_i > 0$ this is positive whenever some $c_i \\ne 0$, i.e. whenever $\\mathbf v \\ne \\mathbf 0$. If some $\\lambda_i \\le 0$, take $\\mathbf v = \\mathbf q_i$ and get $\\lambda_i \\le 0$. $\\blacksquare$ Semidefinite: every $\\lambda_i \\ge 0$.

**$X^\\top X$ is always positive semidefinite**: $\\mathbf v^\\top X^\\top X\\mathbf v = (X\\mathbf v)^\\top(X\\mathbf v) = \\|X\\mathbf v\\|^2 \\ge 0$. Definite exactly when $X\\mathbf v = \\mathbf 0$ only for $\\mathbf v = \\mathbf 0$, i.e. $X$ has independent columns (lesson [[#rank]]). So least squares is a bowl (lesson [[#hessian]] will use this), and so is every covariance matrix (variance along a direction is never negative).

**Testing it: Cholesky.** A positive definite $S$ factors as $S = LL^\\top$ with $L$ lower-triangular and a positive diagonal; the algorithm builds $L$ entry by entry and would have to take the square root of a non-positive number exactly when $S$ is not positive definite. The easy direction: if $S = LL^\\top$ with $L$ invertible, then $\\mathbf v^\\top S\\mathbf v = \\|L^\\top\\mathbf v\\|^2 > 0$. (That the algorithm always succeeds on a positive definite $S$ is **taken on trust**.) It is also the standard way to **sample** a multivariate Gaussian with covariance $S$: draw independent standard normals $\\mathbf z$ and output $\\boldsymbol\\mu + L\\mathbf z$.` },
      { figure: 'QuadraticFormFig', caption: 'The value of $\\mathbf v^\\top S\\mathbf v$ as the unit vector $\\mathbf v$ turns round the circle. Its highest and lowest values are the two eigenvalues, reached at the eigenvectors. If the curve dips below zero, $S$ is not positive definite.' },
      {
        code: {
          file: 'matrices.py', fn: 'quadratic_form', notes: [
            ['def quadratic_form(S, v):', ['A symmetric matrix and a direction.']],
            ['return dot(v, matvec(S, v))', ['$\\mathbf v^\\top(S\\mathbf v)$.'], { tex: '\\mathbf v^\\top S\\mathbf v = \\sum_{i,j}S_{ij}v_iv_j' }],
          ],
        },
      },
      {
        code: {
          file: 'matrices.py', fn: 'cholesky', notes: [
            ['def cholesky(S):', ['A symmetric matrix.']],
            ['n = len(S)', ['Its size.']],
            ['L = [[0.0] * n for _ in range(n)]', ['$L$ starts as zeros; only its lower triangle gets filled.']],
            ['for i in range(n):', ['Row by row…']],
            ['for j in range(i + 1):', ['…up to the diagonal.']],
            ['s = S[i][j] - sum(L[i][k] * L[j][k] for k in range(j))', ['$S_{ij}$ must equal row $i$ of $L$ dotted with row $j$; subtract the part already accounted for.']],
            ['if i == j:', ['On the diagonal…']],
            ['if s <= 0:', ['…what is left must be positive…']],
            ['return None', ['…or $S$ is not positive definite.']],
            ['L[i][i] = math.sqrt(s)', ['$L_{ii} = \\sqrt{\\text{leftover}}$.']],
            ['else:', ['Below the diagonal:']],
            ['L[i][j] = s / L[j][j]', ['Divide by the diagonal entry already found.']],
            ['return L', ['$S = LL^\\top$.'], { tex: 'S = LL^\\top' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Cholesky of $\\begin{pmatrix}4&2\\\\2&3\\end{pmatrix}$: what is $L_{22}$, the bottom-right entry? (4 decimals)',
          answer: Math.SQRT2, tolerance: 0.00006, compute: () => cholesky([[4, 2], [2, 3]])[1][1],
          explain: '$L_{11} = 2$, $L_{21} = 2/2 = 1$, $L_{22} = \\sqrt{3 - 1^2} = \\sqrt2$. Check: $\\begin{pmatrix}2&0\\\\1&\\sqrt2\\end{pmatrix}\\begin{pmatrix}2&1\\\\0&\\sqrt2\\end{pmatrix} = \\begin{pmatrix}4&2\\\\2&3\\end{pmatrix}$.',
        },
      },
      {
        predict: {
          prompt: 'For $S = \\begin{pmatrix}1&2\\\\2&1\\end{pmatrix}$, what is $\\mathbf v^\\top S\\mathbf v$ at $\\mathbf v = (1, -1)$?',
          answer: -2, tolerance: 1e-9, compute: () => quadraticForm([[1, 2], [2, 1]], [1, -1]),
          explain: '$1 - 4 + 1 = -2 < 0$: not positive definite (its eigenvalues are 3 and $-1$), and Cholesky returns None.',
        },
      },
      { note: '$\\mathbf v^\\top S\\mathbf v = \\sum\\lambda_ic_i^2$ in the eigenbasis, so positive definite ⇔ all $\\lambda_i > 0$. $X^\\top X$ and covariance matrices are positive semidefinite. Cholesky $S = LL^\\top$ succeeds exactly for positive definite $S$; $\\boldsymbol\\mu + L\\mathbf z$ samples a Gaussian.' },
    ],
  },

  {
    id: 'svd', title: 'The singular value decomposition',
    goal: 'Derive $A = U\\Sigma V^\\top$ for any matrix from the spectral theorem applied to $A^\\top A$, and read it as rotate, stretch, rotate.',
    builds: ['positive-definite', 'orthogonal-matrices'],
    blocks: [
      { md: `The spectral theorem is for symmetric matrices. **Every** matrix, of any shape, has a decomposition almost as good:

$$A = U\\Sigma V^\\top = \\sum_i \\sigma_i\\,\\mathbf u_i\\mathbf v_i^\\top$$

with orthonormal $\\mathbf v_i$ (inputs), orthonormal $\\mathbf u_i$ (outputs) and **singular values** $\\sigma_1 \\ge \\sigma_2 \\ge \\dots > 0$. Read it right to left: $V^\\top$ rotates (and maybe reflects) the input, $\\Sigma$ stretches along the axes by the $\\sigma_i$, and $U$ rotates into place. **Every linear map is rotate, stretch, rotate.** The unit circle becomes an ellipse with semi-axes $\\sigma_i\\mathbf u_i$.

**Derivation, from things you have.**

1. $A^\\top A$ is symmetric and positive semidefinite (last lesson). The spectral theorem gives it orthonormal eigenvectors $\\mathbf v_i$ with eigenvalues $\\lambda_i \\ge 0$.
2. Define $\\sigma_i = \\sqrt{\\lambda_i}$ and, for each $\\sigma_i > 0$, $\\mathbf u_i = A\\mathbf v_i/\\sigma_i$.
3. **The $\\mathbf u_i$ are orthonormal:** $\\mathbf u_i\\cdot\\mathbf u_j = \\frac{(A\\mathbf v_i)^\\top(A\\mathbf v_j)}{\\sigma_i\\sigma_j} = \\frac{\\mathbf v_i^\\top A^\\top A\\mathbf v_j}{\\sigma_i\\sigma_j} = \\frac{\\lambda_j\\,\\mathbf v_i\\cdot\\mathbf v_j}{\\sigma_i\\sigma_j}$, which is $\\frac{\\lambda_i}{\\sigma_i^2} = 1$ if $i = j$ and 0 otherwise.
4. **They rebuild $A$.** By step 2, $A\\mathbf v_i = \\sigma_i\\mathbf u_i$ (and $A\\mathbf v_i = \\mathbf 0$ when $\\sigma_i = 0$, since $\\|A\\mathbf v_i\\|^2 = \\lambda_i$). For an orthonormal basis, $\\sum_i\\mathbf v_i\\mathbf v_i^\\top = I$ (lesson [[#orthogonality]]: it projects onto the whole space). So $A = A\\sum_i\\mathbf v_i\\mathbf v_i^\\top = \\sum_i (A\\mathbf v_i)\\mathbf v_i^\\top = \\sum_i\\sigma_i\\mathbf u_i\\mathbf v_i^\\top$. $\\blacksquare$

**What it tells you.**
- **Rank** = the number of nonzero singular values.
- **The biggest stretch**: $\\max_{\\|\\mathbf x\\| = 1}\\|A\\mathbf x\\| = \\sigma_1$, at $\\mathbf x = \\mathbf v_1$. (Write $\\mathbf x = \\sum c_i\\mathbf v_i$ with $\\sum c_i^2 = 1$: then $\\|A\\mathbf x\\|^2 = \\mathbf x^\\top A^\\top A\\mathbf x = \\sum\\lambda_ic_i^2 \\le \\lambda_1$, as in the last lesson.)
- **Condition number** $\\sigma_1/\\sigma_n$: how much a system can magnify errors; huge means nearly singular.
- **PCA** is the SVD of the centred data matrix: the $\\mathbf v_i$ are the principal directions, and $\\sigma_i^2/n$ the variances.` },
      { figure: 'SVDFig', caption: 'Any 2 × 2 matrix, as three steps: rotate by $V^\\top$, stretch by $\\Sigma$, rotate by $U$. Watch the unit circle become the ellipse with semi-axes $\\sigma_1\\mathbf u_1$ and $\\sigma_2\\mathbf u_2$.' },
      {
        code: {
          file: 'matrices.py', fn: 'svd', notes: [
            ['def svd(A):', ['Any matrix.']],
            ['values, vectors = symmetric_eigen(matmul(transpose(A), A))', ['Step 1: the eigenvalues and orthonormal eigenvectors of $A^\\top A$.']],
            ['us, sigmas, vs = [], [], []', ['The three ingredients.']],
            ['for lam, v in zip(values, vectors):', ['Largest eigenvalue first.']],
            ['sigma = math.sqrt(max(lam, 0.0))', ['Step 2: $\\sigma = \\sqrt\\lambda$ (rounding can make a zero eigenvalue a hair negative, hence the max).']],
            ['if sigma > 1e-10:', ['Keep only the nonzero ones: their count is the rank.']],
            ['sigmas.append(sigma)', ['$\\sigma_i$.']],
            ['vs.append(v)', ['$\\mathbf v_i$.']],
            ['us.append([a / sigma for a in matvec(A, v)])', ['$\\mathbf u_i = A\\mathbf v_i/\\sigma_i$, orthonormal by step 3.']],
            ['return us, sigmas, vs', ['$A = \\sum_i\\sigma_i\\mathbf u_i\\mathbf v_i^\\top$.'], { tex: 'A = U\\Sigma V^\\top' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'What is the largest singular value of $\\begin{pmatrix}3&0\\\\4&5\\end{pmatrix}$? (4 decimals)',
          answer: Math.sqrt(45), tolerance: 0.00006, compute: () => svd(M2)[1][0],
          explain: `$A^\\top A = \\begin{pmatrix}25&20\\\\20&25\\end{pmatrix}$ has eigenvalues 45 and 5, so $\\sigma = \\sqrt{45} = ${f(Math.sqrt(45))}$ and $\\sqrt5$. Their product, 15, is $|\\det A|$.`,
        },
      },
      {
        choice: {
          prompt: 'A $1000 \\times 50$ data matrix has singular values that drop to almost zero after the 6th. What does that say?',
          options: [
            { text: 'The data is close to a 6-dimensional subspace: about 6 directions carry nearly all the variation', why: 'Yes. Its rank is nearly 6, and the next lesson shows how little you lose by keeping only those six.' },
            { text: 'Only 6 of the 1000 rows matter', why: 'Singular values describe directions in the space of the columns (features), not individual rows.' },
            { text: 'The matrix has 6 columns', why: 'It has 50 columns; only about 6 independent directions among them.' },
          ],
          answer: 0,
        },
      },
      { note: 'Any $A = U\\Sigma V^\\top = \\sum\\sigma_i\\mathbf u_i\\mathbf v_i^\\top$: rotate, stretch, rotate. $\\mathbf v_i$, $\\sigma_i^2$: eigenvectors and eigenvalues of $A^\\top A$; $\\mathbf u_i = A\\mathbf v_i/\\sigma_i$. Rank = number of nonzero $\\sigma$; biggest stretch $\\sigma_1$; PCA is the SVD of centred data.' },
    ],
  },

  {
    id: 'matrix-norms-trace', title: 'The trace, the trace trick, and matrix norms',
    goal: 'Prove $\\text{tr}(AB) = \\text{tr}(BA)$, use the trace trick $\\mathbf x^\\top A\\mathbf x = \\text{tr}(A\\mathbf x\\mathbf x^\\top)$, and relate the Frobenius norm to the singular values.',
    builds: ['svd'],
    blocks: [
      { md: `**The trace** of a square matrix is the sum of its diagonal: $\\text{tr}\\,A = \\sum_i A_{ii}$. It looks too simple to matter, but it has one superpower:

$$\\text{tr}(AB) = \\text{tr}(BA)$$

even though $AB \\ne BA$. Proof: $\\text{tr}(AB) = \\sum_i (AB)_{ii} = \\sum_i\\sum_k A_{ik}B_{ki}$, and $\\text{tr}(BA) = \\sum_k\\sum_i B_{ki}A_{ik}$: the same products, added in a different order. $\\blacksquare$ (It works for non-square $A$ and $B$ too, as long as both products are square.)

**The trace trick.** A number is a $1 \\times 1$ matrix, its own trace. So $\\mathbf x^\\top A\\mathbf x = \\text{tr}(\\mathbf x^\\top A\\mathbf x) = \\text{tr}(A\\mathbf x\\mathbf x^\\top)$, moving $\\mathbf x^\\top$ round to the back. Why bother? Because it moves $\\mathbf x$ into one place, $\\mathbf x\\mathbf x^\\top$, where an average can act on it alone: for a random $\\mathbf x$ with mean $\\mathbf 0$ and covariance $\\Sigma = \\mathbb E[\\mathbf x\\mathbf x^\\top]$,

$$\\mathbb E[\\mathbf x^\\top A\\mathbf x] = \\text{tr}(A\\,\\mathbb E[\\mathbf x\\mathbf x^\\top]) = \\text{tr}(A\\Sigma)$$

(linearity: the trace and the matrix product are sums, and expectation passes through sums). Derivations of Gaussian likelihoods and of many ML losses use exactly this step.

**Trace = sum of eigenvalues** (symmetric case): $\\text{tr}\\,S = \\text{tr}(Q\\Lambda Q^\\top) = \\text{tr}(\\Lambda Q^\\top Q) = \\text{tr}\\,\\Lambda = \\sum\\lambda_i$. That is why lesson [[#spectral]]'s eigenvalues summed to the diagonal's sum.

**Matrix norms.** How big is a matrix?
- **Frobenius norm**: treat all entries as one long vector, $\\|A\\|_F = \\sqrt{\\sum_{i,j}A_{ij}^2}$. Since entry $(j, j)$ of $A^\\top A$ is column $j$'s squared length, $\\|A\\|_F^2 = \\text{tr}(A^\\top A) = \\sum\\lambda_i(A^\\top A) = \\sum_i\\sigma_i^2$.
- **Spectral norm** $\\|A\\|_2 = \\sigma_1$: the biggest stretch (last lesson). Bounds on how fast a network's output can change, and the "spectral normalisation" of GAN discriminators, use it.
- Both are unchanged by orthogonal matrices, $\\|QA\\|_F = \\|A\\|_F$, since $\\text{tr}(A^\\top Q^\\top QA) = \\text{tr}(A^\\top A)$.

Weight decay penalises $\\|W\\|_F^2$, the sum of squares of all weights.` },
      { figure: 'TraceFig', caption: 'Two random matrices (re-roll them). $AB$ and $BA$ differ, their traces don\'t. The trace trick and $\\|A\\|_F^2 = \\sum\\sigma_i^2$ check out every time.' },
      {
        code: {
          file: 'matrices.py', fn: 'trace', notes: [
            ['def trace(A):', ['A square matrix.']],
            ['return sum(A[i][i] for i in range(len(A)))', ['Add the diagonal.'], { tex: '\\text{tr}\\,A = \\sum_i A_{ii}' }],
          ],
        },
      },
      {
        code: {
          file: 'matrices.py', fn: 'frobenius', notes: [
            ['def frobenius(A):', ['Any matrix.']],
            ['return math.sqrt(sum(a * a for row in A for a in row))', ['Square every entry, add, square root: the length of $A$ as one long vector.'], { tex: '\\|A\\|_F = \\sqrt{\\textstyle\\sum_{ij}A_{ij}^2}' }],
          ],
        },
      },
      {
        predict: {
          prompt: '$A = \\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}$, $B = \\begin{pmatrix}0&1\\\\5&-2\\end{pmatrix}$. What is $\\text{tr}(BA)$?',
          answer: trace(matmul([[0, 1], [5, -2]], [[1, 2], [3, 4]])), compute: () => trace(matmul([[1, 2], [3, 4]], [[0, 1], [5, -2]])),
          explain: `$\\text{tr}(AB) = \\text{tr}(BA) = ${trace(matmul([[1, 2], [3, 4]], [[0, 1], [5, -2]]))}$, though $AB$ and $BA$ are different matrices.`,
        },
      },
      {
        predict: {
          prompt: 'What is $\\|A\\|_F$ for $A = \\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}$? (4 decimals)',
          answer: Math.sqrt(30), tolerance: 0.00006, compute: () => frobenius([[1, 2], [3, 4]]),
          explain: `$\\sqrt{1 + 4 + 9 + 16} = \\sqrt{30} = ${f(Math.sqrt(30))}$, and its two singular values squared add to 30 too.`,
        },
      },
      { note: '$\\text{tr}(AB) = \\text{tr}(BA)$: the same products in another order. Trace trick: $\\mathbf x^\\top A\\mathbf x = \\text{tr}(A\\mathbf x\\mathbf x^\\top)$, so $\\mathbb E[\\mathbf x^\\top A\\mathbf x] = \\text{tr}(A\\Sigma)$. $\\text{tr} = \\sum\\lambda$. $\\|A\\|_F^2 = \\text{tr}(A^\\top A) = \\sum\\sigma_i^2$; $\\|A\\|_2 = \\sigma_1$.' },
    ],
  },

  {
    id: 'low-rank', title: 'Low-rank approximation: keeping what matters',
    goal: 'Approximate a matrix by its top $k$ singular values, compute the error $\\sqrt{\\sum_{i>k}\\sigma_i^2}$, count the storage saved, and connect it to compression and LoRA.',
    builds: ['matrix-norms-trace', 'rank'],
    blocks: [
      { md: `The SVD writes $A$ as a sum of rank-one pieces, largest first: $A = \\sigma_1\\mathbf u_1\\mathbf v_1^\\top + \\sigma_2\\mathbf u_2\\mathbf v_2^\\top + \\dots$. Stop after $k$ of them:

$$A_k = \\sum_{i=1}^{k}\\sigma_i\\,\\mathbf u_i\\mathbf v_i^\\top$$

$A_k$ has rank $k$ (its columns are combinations of $\\mathbf u_1, \\dots, \\mathbf u_k$).

**The error is exactly the dropped singular values.** $A - A_k = \\sum_{i > k}\\sigma_i\\mathbf u_i\\mathbf v_i^\\top$, which is already in SVD form, so its singular values are $\\sigma_{k+1}, \\sigma_{k+2}, \\dots$. By the last lesson:

$$\\|A - A_k\\|_F = \\sqrt{\\sigma_{k+1}^2 + \\sigma_{k+2}^2 + \\dots}$$

If the singular values fall off fast, a small $k$ loses almost nothing.

**No rank-$k$ matrix does better** (the *Eckart–Young theorem*). **Taken on trust**: the proof is a page of careful inequalities. The exercise tests it against thousands of random rank-$k$ matrices; none wins.

**Storage.** An $m \\times n$ matrix has $mn$ numbers. $A_k$ needs only $\\mathbf u_1, \\dots, \\mathbf u_k$ ($km$), $\\mathbf v_1, \\dots, \\mathbf v_k$ ($kn$) and the $k$ singular values: $k(m + n + 1)$. A $1000 \\times 1000$ image at rank 20 needs 40,020 numbers instead of 1,000,000.

**In ML.**
- **Compression** of images, embedding tables and weight matrices.
- **LoRA** bets that the *change* a fine-tuning needs is nearly low-rank, so it trains only $B$ and $A$ with $\\Delta W = BA$ (lesson [[#rank]]).
- **Recommender systems**: a users × items ratings table is modelled as low-rank ("a few tastes explain most choices"); the missing ratings are filled in from the low-rank fit.
- **Noise removal**: the small singular values often carry mostly noise.` },
      { figure: 'LowRankFig', caption: 'A 32 × 32 picture rebuilt from its top $k$ singular values. Each extra rank-one layer adds detail; the bar chart shows how fast the singular values fall, and the error is the square root of the sum of the squares of the dropped ones.' },
      {
        code: {
          file: 'matrices.py', fn: 'low_rank', notes: [
            ['def low_rank(A, k):', ['A matrix and how many singular values to keep.']],
            ['us, sigmas, vs = svd(A)', ['Its SVD, largest first.']],
            ['B = [[0.0] * len(A[0]) for _ in A]', ['Start from the zero matrix of the same shape.']],
            ['for u, s, v in list(zip(us, sigmas, vs))[:k]:', ['The $k$ biggest pieces…']],
            ['for i in range(len(A)):', ['…each a rank-one matrix $\\sigma\\mathbf u\\mathbf v^\\top$…']],
            ['for j in range(len(A[0])):', ['…filled entry by entry…']],
            ['B[i][j] += s * u[i] * v[j]', ['…added in: entry $(i, j)$ of $\\sigma\\mathbf u\\mathbf v^\\top$ is $\\sigma u_iv_j$.']],
            ['return B', ['$A_k$.'], { tex: 'A_k = \\sum_{i\\le k}\\sigma_i\\mathbf u_i\\mathbf v_i^\\top' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'The best rank-1 approximation of $\\begin{pmatrix}3&0\\\\4&5\\end{pmatrix}$ (singular values $\\sqrt{45}$, $\\sqrt5$). What is its Frobenius error $\\|A - A_1\\|_F$? (4 decimals)',
          answer: Math.sqrt(5), tolerance: 0.00006, compute: () => { const B = lowRank(M2, 1); return frobenius(M2.map((r, i) => r.map((a, j) => a - B[i][j]))) },
          explain: `$\\sigma_2 = \\sqrt5 = ${f(Math.sqrt(5))}$: exactly the dropped singular value.`,
        },
      },
      {
        predict: {
          prompt: 'How many numbers does a rank-10 approximation of a $1000 \\times 1000$ matrix store?',
          answer: 20010, compute: () => 10 * (1000 + 1000 + 1),
          explain: '$10 \\times 2001 = 20{,}010$, about 2% of the million entries.',
        },
      },
      { note: '$A_k = \\sum_{i\\le k}\\sigma_i\\mathbf u_i\\mathbf v_i^\\top$, rank $k$, error $\\|A - A_k\\|_F = \\sqrt{\\sum_{i>k}\\sigma_i^2}$, and no rank-$k$ matrix does better (Eckart–Young). Storage $k(m + n + 1)$ instead of $mn$.' },
    ],
  },

  {
    id: 'matrix-calculus', title: 'Matrix calculus: gradients with respect to vectors and matrices',
    goal: 'Derive $\\nabla_{\\mathbf x}(\\mathbf x^\\top A\\mathbf x) = (A + A^\\top)\\mathbf x$ and $\\nabla_W(\\mathbf a^\\top W\\mathbf b) = \\mathbf a\\mathbf b^\\top$ entry by entry, and use the shape rule to check any gradient.',
    builds: ['matrix-gradients', 'transpose'],
    blocks: [
      { md: `Papers write gradients of vector and matrix expressions in one line. Every one of them comes from the same method as lesson [[#matrix-gradients]]: **write the expression as sums of entries, take one partial derivative, and recognise the pattern.**

**1. A quadratic form.** $f(\\mathbf x) = \\mathbf x^\\top A\\mathbf x = \\sum_i\\sum_j x_iA_{ij}x_j$. Differentiate with respect to one entry $x_k$. Each term containing $x_k$ contributes: terms with $i = k$ give $\\sum_j A_{kj}x_j = (A\\mathbf x)_k$, and terms with $j = k$ give $\\sum_i x_iA_{ik} = (A^\\top\\mathbf x)_k$ (the term $i = j = k$ is $A_{kk}x_k^2$, whose slope $2A_{kk}x_k$ is split between the two, one $A_{kk}x_k$ each). So

$$\\nabla_{\\mathbf x}(\\mathbf x^\\top A\\mathbf x) = (A + A^\\top)\\mathbf x, \\qquad = 2A\\mathbf x \\text{ if } A \\text{ is symmetric}$$

With $A = I$: $\\nabla\\|\\mathbf x\\|^2 = 2\\mathbf x$, the vector version of $\\frac{d}{dx}x^2 = 2x$.

**2. Gradient with respect to a matrix.** A loss that depends on a weight matrix $W$ has one partial derivative per entry; arrange them in $W$'s shape. Take $f(W) = \\mathbf a^\\top W\\mathbf b = \\sum_i\\sum_j a_iW_{ij}b_j$. Only one term contains $W_{ij}$, with coefficient $a_ib_j$. So

$$\\nabla_W(\\mathbf a^\\top W\\mathbf b) = \\mathbf a\\,\\mathbf b^\\top$$

an **outer product** (lesson [[#transpose]]). This is the weight gradient of every linear layer: for $\\mathbf z = W\\mathbf h$ and a loss whose gradient with respect to $\\mathbf z$ is $\\boldsymbol\\delta$, the loss changes by about $\\boldsymbol\\delta^\\top\\Delta W\\mathbf h$ when $W$ changes, so $\\nabla_W\\mathcal L = \\boldsymbol\\delta\\,\\mathbf h^\\top$. Lesson [[#backpropagation]]'s "error times input".

**3. A least-squares loss in $W$.** $\\|W\\mathbf x - \\mathbf y\\|^2$: let $\\mathbf r = W\\mathbf x - \\mathbf y$. Changing $W_{ij}$ changes only $r_i$, at rate $x_j$, and $\\frac{\\partial}{\\partial r_i}\\|\\mathbf r\\|^2 = 2r_i$. Chain rule: $\\frac{\\partial}{\\partial W_{ij}} = 2r_ix_j$, so $\\nabla_W = 2(W\\mathbf x - \\mathbf y)\\mathbf x^\\top$.

**The shape rule.** The gradient with respect to something has **that thing's shape**: $\\nabla_{\\mathbf x}$ is a vector like $\\mathbf x$, $\\nabla_W$ a matrix like $W$. If a candidate answer has the wrong shape, it is wrong. $\\boldsymbol\\delta\\mathbf h^\\top$ is (outputs × inputs), like $W$; $\\mathbf h\\boldsymbol\\delta^\\top$ would be the transpose, which is a common slip.

**A warning about conventions.** Some papers write the derivative of a vector with respect to a vector as the Jacobian ($m \\times n$, "numerator layout"), others as its transpose ("denominator layout"). When a formula seems to have its transposes backwards, check the shapes and which layout the paper uses.` },
      { figure: 'MatrixGradientFig', caption: 'The gradient of $\\mathbf a^\\top W\\mathbf b$ with respect to $W$ is the outer product $\\mathbf a\\mathbf b^\\top$: change $\\mathbf a$ and $\\mathbf b$, and nudge any entry of $W$ to see the loss change by that entry\'s gradient.' },
      {
        code: {
          file: 'matrices.py', fn: 'quadratic_gradient', notes: [
            ['def quadratic_gradient(A, x):', ['A square matrix and a point.']],
            ['return [a + b for a, b in zip(matvec(A, x), matvec(transpose(A), x))]', ['$A\\mathbf x + A^\\top\\mathbf x$, entry by entry: the two ways $x_k$ appears in $\\sum_{ij}x_iA_{ij}x_j$.'], { tex: '\\nabla_{\\mathbf x}\\,\\mathbf x^\\top A\\mathbf x = (A + A^\\top)\\mathbf x' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'For $A = \\begin{pmatrix}1&2\\\\0&3\\end{pmatrix}$ and $\\mathbf x = (1, -1)$, what is the second entry of $\\nabla(\\mathbf x^\\top A\\mathbf x)$?',
          answer: -4, tolerance: 1e-9, compute: () => quadraticGradient([[1, 2], [0, 3]], [1, -1])[1],
          explain: '$A + A^\\top = \\begin{pmatrix}2&2\\\\2&6\\end{pmatrix}$, times $(1, -1)$: $(0, -4)$. Using $2A\\mathbf x = (-2, -6)$ would be wrong: $A$ isn\'t symmetric.',
          misconceptions: [{ answer: -6, feedback: 'That is $2A\\mathbf x$, valid only for symmetric $A$. Use $(A + A^\\top)\\mathbf x$.' }],
        },
      },
      {
        predict: {
          prompt: '$\\mathbf a = (1, 2)$, $\\mathbf b = (3, 4)$. What is $\\frac{\\partial}{\\partial W_{12}}(\\mathbf a^\\top W\\mathbf b)$?',
          answer: 4, compute: () => [1, 2][0] * [3, 4][1],
          explain: '$a_1b_2 = 1 \\times 4 = 4$: entry $(1, 2)$ of the outer product $\\mathbf a\\mathbf b^\\top$.',
        },
      },
      { note: 'Write it as sums, take one partial, spot the pattern. $\\nabla(\\mathbf x^\\top A\\mathbf x) = (A + A^\\top)\\mathbf x$; $\\nabla_W(\\mathbf a^\\top W\\mathbf b) = \\mathbf a\\mathbf b^\\top$; $\\nabla_W\\|W\\mathbf x - \\mathbf y\\|^2 = 2(W\\mathbf x - \\mathbf y)\\mathbf x^\\top$. A gradient has the shape of what it differentiates by.' },
    ],
  },

  {
    id: 'tensors', title: 'Tensors, shapes, broadcasting and einsum',
    goal: 'Read a tensor\'s shape like $(B, T, d)$, predict what broadcasting does, follow a batched matrix product, and read Einstein summation such as $C_{ik} = A_{ij}B_{jk}$.',
    builds: ['matrix-calculus', 'matrix-multiplication'],
    blocks: [
      { md: `In code, ML data is a **tensor**: an array with any number of axes. A number has 0 axes, a vector 1, a matrix 2; a batch of colour images has 4, with **shape** $(B, C, H, W)$: batch, channels, height, width. A batch of token embeddings in a Transformer has shape $(B, T, d)$: $B$ sequences, $T$ tokens each, $d$ numbers per token. One entry is $x_{b,t,i}$. Papers usually describe one example and leave the batch axis implicit, writing $X \\in \\mathbb R^{T \\times d}$; the code adds it.

**Reading shapes is half of reading a model.** For each line of a paper, write each tensor's shape underneath (lesson [[#reading-papers]]'s step 4). Most bugs in ML code are shape bugs.

**Elementwise operations** (add, multiply, apply $\\sigma$) need matching shapes, or shapes that **broadcast**: line the shapes up **from the right**; each pair of sizes must be equal, or one of them must be 1 (or missing), in which case that axis is repeated to match.
- $(B, T, d) + (d,)$: the bias is added to every token of every sequence. ✓
- $(B, T, d) + (T, 1)$: one number per position, repeated across the $d$ entries and the batch. ✓
- $(B, T, d) + (T,)$: lined up from the right, $T$ meets $d$: an error (unless $T = d$, which silently does the wrong thing, the worst kind of bug).

**Batched matrix products** multiply matching pairs along the leading axes: $(B, m, n)\\,@\\,(B, n, p) \\to (B, m, p)$. Attention's scores for a whole batch are $QK^\\top$ with shapes $(B, T, d)$ and $(B, d, T)$, giving $(B, T, T)$: one score for every pair of tokens in every sequence.

**Einstein summation.** Write the product rule $C_{ik} = \\sum_j A_{ij}B_{jk}$ without the Σ: **an index that appears twice on the right is summed over.** So $C_{ik} = A_{ij}B_{jk}$ is matrix multiplication, $s = u_iv_i$ is the dot product, $M_{ij} = u_iv_j$ the outer product (nothing repeated, nothing summed), and $\\text{tr}\\,A = A_{ii}$. Code spells it as \`einsum("ij,jk->ik", A, B)\`; attention scores are \`einsum("btd,bsd->bts", Q, K)\`: for each batch $b$, each pair of positions $t, s$, sum over the shared $d$.` },
      { figure: 'TensorFig', caption: 'Pick two shapes. They are lined up from the right; each column must match or contain a 1. The result\'s shape appears, or the axis that clashes is marked.' },
      {
        code: {
          file: 'matrices.py', fn: 'shape', notes: [
            ['def shape(t):', ['A nested list: a tensor in plain Python.']],
            ['dims = []', ['The sizes found so far.']],
            ['while isinstance(t, list):', ['As long as we are still inside lists…']],
            ['dims.append(len(t))', ['…record this level\'s length…']],
            ['t = t[0]', ['…and step into the first element.']],
            ['return tuple(dims)', ['The shape, outermost axis first.']],
          ],
        },
      },
      {
        code: {
          file: 'matrices.py', fn: 'add_bias', notes: [
            ['def add_bias(rows, b):', ['A matrix of shape $(n, d)$ and a vector of shape $(d,)$.']],
            ['return [[x + bi for x, bi in zip(row, b)] for row in rows]', ['Broadcasting by hand: the same $\\mathbf b$ added to every row. `X + b` does this in NumPy and PyTorch.']],
          ],
        },
      },
      {
        code: {
          file: 'matrices.py', fn: 'batch_matmul', notes: [
            ['def batch_matmul(As, Bs):', ['Two batches of matrices.']],
            ['return [matmul(A, B) for A, B in zip(As, Bs)]', ['One product per pair: $(B, m, n)\\,@\\,(B, n, p) \\to (B, m, p)$.']],
          ],
        },
      },
      { python: { program: 'matrices', label: 'Run the linear-algebra additions in real Python' } },
      {
        code: {
          file: 'matrices.py', fn: 'show_matrices', notes: [
            ['def show_matrices():', ['One example of each tool.']],
            ['A = [[2.0, 1.0, -1.0], [-3.0, -1.0, 2.0], [-2.0, 1.0, 2.0]]', ['The system of lesson [[#gaussian-elimination]].']],
            ['print("solve A x = (8, -11, -3):", solve(A, [8.0, -11.0, -3.0]))', ['$(2, 3, -1)$, give or take rounding in the last digit.']],
            ['print("rank of a matrix with a repeated row:", rank([[1.0, 2.0], [2.0, 4.0]]), " det A:", determinant(A))', ['Lessons [[#rank]] and [[#determinant-n]].']],
            ['print("Gram–Schmidt on (1, 1, 0), (1, 0, 1):", gram_schmidt([[1.0, 1.0, 0.0], [1.0, 0.0, 1.0]]))', ['Lesson [[#orthogonality]].']],
            ['S = [[4.0, 1.0, 0.0], [1.0, 3.0, 1.0], [0.0, 1.0, 2.0]]', ['A symmetric matrix.']],
            ['print("eigenvalues of S:", symmetric_eigen(S)[0], " Cholesky works:", cholesky(S) is not None)', ['Lessons [[#spectral]] and [[#positive-definite]].']],
            ['print("singular values of [[3, 0], [4, 5]]:", svd([[3.0, 0.0], [4.0, 5.0]])[1])', ['Lesson [[#svd]]: $\\sqrt{45}$ and $\\sqrt5$.']],
            ['print("trace and Frobenius norm of S:", trace(S), frobenius(S))', ['Lesson [[#matrix-norms-trace]].']],
          ],
        },
      },
      {
        predict: {
          prompt: 'How many numbers are in a batch of 32 colour images of $224 \\times 224$ pixels, shape $(32, 3, 224, 224)$?',
          answer: 32 * 3 * 224 * 224, compute: () => shape(Array(32).fill(Array(3).fill(Array(224).fill(Array(224).fill(0))))).reduce((a, b) => a * b, 1),
          explain: '$32 \\times 3 \\times 224 \\times 224 = 4{,}816{,}896$.',
        },
      },
      {
        predict: {
          prompt: 'Adding the bias $(10, 20)$ to the rows $(1, 2)$ and $(3, 4)$: what is the bottom-right entry?',
          answer: 24, compute: () => addBias([[1, 2], [3, 4]], [10, 20])[1][1],
          explain: '$4 + 20 = 24$: the bias is broadcast to every row.',
        },
      },
      {
        choice: {
          prompt: '$Q$ has shape $(8, 128, 64)$ and $K$ has shape $(8, 128, 64)$. What does `einsum("btd,bsd->bts", Q, K)` produce?',
          options: [
            { text: 'Shape $(8, 128, 128)$: for each of 8 sequences, a score for every pair of the 128 positions, summing over the 64 shared entries', why: 'Yes: $d$ appears in both inputs and not in the output, so it is summed; $b$, $t$, $s$ remain.' },
            { text: 'Shape $(8, 128, 64)$', why: 'The $d$ axis is summed away: it is missing from the output indices.' },
            { text: 'An error: you can\'t multiply two tensors of the same shape', why: 'Einsum says exactly which axes pair up; here $d$ with $d$, which is $QK^\\top$ per batch.' },
          ],
          answer: 0,
        },
      },
      { note: 'A tensor\'s shape lists its axes: $(B, T, d)$. Broadcasting lines shapes up from the right; sizes must match or be 1. Batched matmul: $(B, m, n)@(B, n, p) \\to (B, m, p)$. Einstein notation sums over repeated indices: $C_{ik} = A_{ij}B_{jk}$; einsum spells it out.' },
    ],
  },
]
