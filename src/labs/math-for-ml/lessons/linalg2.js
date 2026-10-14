// Linear-algebra additions, placed inside the linear-algebra part by lessons/index.js: span and basis,
// Gaussian elimination, rank, determinants in n dimensions, orthogonality and Gram–Schmidt,
// orthogonal matrices, and the spectral theorem.
import { coordinates, solve, eliminationCost, rank, determinant, project, gramSchmidt, reflection, matvec, norm, symmetricEigen, dot } from '../engine/maths.js'
import { f } from './util.js'

const A3 = [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], S3 = [[4, 1, 0], [1, 3, 1], [0, 1, 2]]

export const LINALG2 = [
  {
    id: 'span-basis', title: 'Span, independence, basis and dimension',
    goal: 'Say what vectors can reach by combining (their span), test independence, and see why a basis gives every vector exactly one set of coordinates.',
    builds: ['systems', 'vector-arithmetic'],
    blocks: [
      { md: `Lesson [[#vector-arithmetic]] built **linear combinations** $c_1\\mathbf v_1 + c_2\\mathbf v_2 + \\dots$. Ask the reverse question: given some vectors, which points can you reach by combining them?

**The span** of $\\mathbf v_1, \\dots, \\mathbf v_k$ is the set of all their linear combinations (lesson [[#sets]]'s set-builder: $\\{c_1\\mathbf v_1 + \\dots + c_k\\mathbf v_k \\mid c_i \\in \\mathbb R\\}$). In the plane, one nonzero vector spans a line through the origin. Two vectors **not** on the same line span the whole plane: to reach any target, solve two equations for the two coefficients (lesson [[#systems]]). Two vectors on the same line span only that line; the second adds nothing new.

**Independence** names exactly that. Vectors are **linearly independent** if none of them is a combination of the others; equivalently, the only way to combine them into $\\mathbf 0$ is with every coefficient 0:

$$c_1\\mathbf v_1 + \\dots + c_k\\mathbf v_k = \\mathbf 0 \\;\\Rightarrow\\; c_1 = \\dots = c_k = 0$$

(If some $c_j \\ne 0$ worked, you could divide by it and write $\\mathbf v_j$ as a combination of the others.) $(1, 2, 3)$ and $(2, 4, 6)$ are **dependent**: $2\\mathbf v_1 - \\mathbf v_2 = \\mathbf 0$.

**A basis** of a space is a set of vectors that is independent **and** spans it. The payoff: **every vector has exactly one set of coordinates** in a basis. Existence is "spans". Uniqueness: if $\\mathbf v = \\sum c_i\\mathbf b_i = \\sum d_i\\mathbf b_i$, subtract to get $\\sum (c_i - d_i)\\mathbf b_i = \\mathbf 0$, and independence forces every $c_i - d_i = 0$. $\\blacksquare$ Finding them is solving a system whose columns are the basis vectors.

**Dimension** is the number of vectors in a basis. The standard basis of $\\mathbb R^n$ (the axes $\\mathbf e_1, \\dots, \\mathbf e_n$) has $n$, and every basis of $\\mathbb R^n$ has exactly $n$: more than $n$ vectors in $\\mathbb R^n$ are always dependent, fewer can't span. (**Taken on trust**: the proof, the "exchange" argument, is careful bookkeeping; the elimination lessons that follow make it believable, since $n$ equations can pin down at most $n$ unknowns.)

**In ML**: a layer $W\\mathbf x$ with $W$ of size $m \\times n$ can only produce outputs in the span of $W$'s columns; if they are dependent, the layer's outputs live in a smaller space than its width suggests. An embedding of size $d$ lives in a space of dimension $d$, and "directions" in it (gender, tense, sentiment) are vectors you can combine.` },
      { figure: 'SpanFig', caption: 'Two vectors and the grid of their combinations. Turn one onto the other\'s line and the grid collapses to a line: the span shrinks, and the pair becomes dependent. The target\'s coordinates are read off the grid.' },
      {
        code: {
          file: 'matrices.py', fn: 'coordinates', notes: [
            ['def coordinates(basis, v):', ['A list of basis vectors and a target.']],
            ['return solve(transpose(basis), v)', ['$c_1\\mathbf b_1 + \\dots + c_n\\mathbf b_n = \\mathbf v$ is the system $B\\mathbf c = \\mathbf v$ whose **columns** are the basis vectors, so transpose the list of rows into columns, then solve (next lesson).'], { tex: 'B\\mathbf c = \\mathbf v' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'In the basis $\\mathbf b_1 = (1, 1)$, $\\mathbf b_2 = (1, -1)$, what is the first coordinate of $\\mathbf v = (5, 1)$?',
          answer: 3, tolerance: 1e-9, compute: () => coordinates([[1, 1], [1, -1]], [5, 1])[0],
          explain: '$3(1, 1) + 2(1, -1) = (5, 1)$: coordinates $(3, 2)$. Adding the two equations $c_1 + c_2 = 5$, $c_1 - c_2 = 1$ gives $2c_1 = 6$.',
        },
      },
      {
        choice: {
          prompt: 'Are $(1, 0, 1)$, $(0, 1, 1)$ and $(1, 1, 2)$ a basis of $\\mathbb R^3$?',
          options: [
            { text: 'No: the third is the sum of the first two, so they are dependent and span only a plane', why: 'Yes. $\\mathbf v_1 + \\mathbf v_2 - \\mathbf v_3 = \\mathbf 0$ with nonzero coefficients. Three vectors in $\\mathbb R^3$ form a basis only if they are independent.' },
            { text: 'Yes: three vectors in three dimensions always form a basis', why: 'Only if they are independent. These aren\'t.' },
            { text: 'Yes, because none of them is zero', why: 'Nonzero isn\'t enough; one can still be a combination of the others.' },
          ],
          answer: 0,
        },
      },
      { note: 'Span: everything reachable by combining. Independent: only the all-zero combination gives $\\mathbf 0$. Basis: independent and spanning, so coordinates exist and are unique. Dimension: the size of any basis; $\\mathbb R^n$ has dimension $n$.' },
    ],
  },

  {
    id: 'gaussian-elimination', title: 'Gaussian elimination: how systems are really solved',
    goal: 'Solve $A\\mathbf x = \\mathbf b$ by elimination and back-substitution, say why the row operations don\'t change the answer, why we pivot, and count the work: $\\frac{n^3 - n}{3}$ steps.',
    builds: ['span-basis', 'induction'],
    blocks: [
      { md: `Lesson [[#systems]] solved $2 \\times 2$ systems with the inverse formula. Bigger systems are solved by **elimination**, the method you may know from school, made systematic.

Write the system as an **augmented matrix** $[A \\mid \\mathbf b]$: each row is one equation. Three operations never change the set of solutions:

1. **Swap** two rows (list the equations in another order).
2. **Scale** a row by a nonzero number (multiply both sides of an equation).
3. **Add a multiple** of one row to another.

Why the third is safe: if $\\mathbf x$ satisfies equations $r_1$ and $r_2$, it satisfies $r_2 + k r_1$ (add the two true equations). And the step can be undone (subtract $k r_1$ again), so nothing new sneaks in either. Same solutions before and after.

**Elimination.** Use row 1 to clear the first column below it: from each row $i$ below, subtract $\\frac{a_{i1}}{a_{11}}$ times row 1. Then use row 2 to clear the second column below it, and so on. The result is **upper-triangular**: zeros below the diagonal. The last equation has one unknown; solve it, substitute into the one above, and climb (**back-substitution**).

**Pivoting.** The number you divide by, $a_{cc}$, is the **pivot**. If it is 0 you can't divide, and if it is tiny you divide by nearly nothing, magnifying rounding errors into garbage. So before clearing column $c$, swap up the row with the **largest** entry in that column (**partial pivoting**). Every serious solver does this.

**Counting the work.** Clearing column $c$ (counting from 0) touches the $n - c - 1$ rows below, updating $n - c$ entries in each. The total is $\\sum_{k=1}^{n}(k - 1)k = \\sum k^2 - \\sum k = \\frac{n(n+1)(2n+1)}{6} - \\frac{n(n+1)}{2} = \\frac{n^3 - n}{3}$, using the two sums proved by induction (lesson [[#induction]] and its exercise). The $n^3$ is what matters: **double the size, eight times the work**. A $10{,}000 \\times 10{,}000$ system needs about $3 \\times 10^{11}$ steps. And never compute an inverse just to solve: $A^{-1}$ costs about three times as much as one solve and is less accurate.` },
      { figure: 'EliminationFig', caption: 'Step through elimination on a 3 × 3 system. Each step names its row operation; the pivot is highlighted. Then back-substitution reads off the answer from the bottom up.' },
      {
        code: {
          file: 'matrices.py', fn: 'row_reduce', notes: [
            ['def row_reduce(A, tol=1e-12):', ['Any shape of matrix; `tol` decides when a would-be pivot counts as zero.']],
            ['M = [list(row) for row in A]', ['Work on a copy.']],
            ['rows, cols = len(M), len(M[0])', ['Its shape.']],
            ['pivots = []', ['The columns where a pivot was found.']],
            ['r = 0', ['The row the next pivot will sit in.']],
            ['for c in range(cols):', ['Column by column, left to right.']],
            ['if r == rows:', ['Every row already has a pivot…']],
            ['break', ['…so stop.']],
            ['best = max(range(r, rows), key=lambda i: abs(M[i][c]))', ['Partial pivoting: among the rows not yet used, the one with the biggest entry in this column.']],
            ['if abs(M[best][c]) < tol:', ['The whole column below is (numerically) zero…']],
            ['continue', ['…so this column has no pivot; move right.']],
            ['M[r], M[best] = M[best], M[r]', ['Row operation 1: swap the pivot row into place.']],
            ['for i in range(r + 1, rows):', ['Each row below the pivot.']],
            ['factor = M[i][c] / M[r][c]', ['How many pivot rows to subtract to zero out this entry.']],
            ['M[i] = [a - factor * p for a, p in zip(M[i], M[r])]', ['Row operation 3: row $i$ minus factor × pivot row.'], { tex: 'r_i \\leftarrow r_i - \\frac{a_{ic}}{a_{rc}}\\,r_r' }],
            ['pivots.append(c)', ['Record the pivot column.']],
            ['r += 1', ['The next pivot goes one row down.']],
            ['return M, pivots', ['Echelon form, and where the pivots are.']],
          ],
        },
      },
      {
        code: {
          file: 'matrices.py', fn: 'solve', notes: [
            ['def solve(A, b):', ['A square, invertible system.']],
            ['M, _ = row_reduce([list(row) + [bi] for row, bi in zip(A, b)])', ['Eliminate on the augmented matrix $[A \\mid \\mathbf b]$.']],
            ['n = len(A)', ['Number of unknowns.']],
            ['x = [0.0] * n', ['The answer, filled from the bottom.']],
            ['for i in range(n - 1, -1, -1):', ['Back-substitution: last row first.']],
            ['s = M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))', ['Right-hand side minus the unknowns already found.']],
            ['x[i] = s / M[i][i]', ['Divide by the pivot: one equation, one unknown.']],
            ['return x', ['$\\mathbf x$.']],
          ],
        },
      },
      {
        code: {
          file: 'matrices.py', fn: 'elimination_cost', notes: [
            ['def elimination_cost(n):', ['Count the multiply-and-subtract steps for an $n \\times n$ matrix.']],
            ['count = 0', ['Running total.']],
            ['for c in range(n):', ['Each pivot column.']],
            ['count += (n - c - 1) * (n - c)', ['Rows below × entries updated in each.']],
            ['return count', ['$\\frac{n^3 - n}{3}$, as the induction sums say.'], { tex: '\\sum_{k=1}^n (k-1)k = \\frac{n^3 - n}{3}' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Solve $2x_1 + x_2 - x_3 = 8$, $-3x_1 - x_2 + 2x_3 = -11$, $-2x_1 + x_2 + 2x_3 = -3$. What is $x_1$?',
          answer: 2, tolerance: 1e-9, compute: () => solve(A3, [8, -11, -3])[0],
          explain: 'The solution is $(2, 3, -1)$. Check the first equation: $4 + 3 + 1 = 8$.',
        },
      },
      {
        predict: {
          prompt: 'How many multiply-and-subtract steps does elimination take on a $10 \\times 10$ matrix?',
          answer: 330, compute: () => eliminationCost(10),
          explain: '$\\frac{1000 - 10}{3} = 330$. At $n = 20$: 2660, about 8 times as many.',
        },
      },
      { note: 'Swaps, scalings and adding multiples of rows keep the solutions. Eliminate to upper-triangular, back-substitute. Pivot on the largest entry to keep rounding under control. Cost $\\frac{n^3 - n}{3}$: double $n$, eight times the work.' },
    ],
  },

  {
    id: 'rank', title: 'Rank and the null space',
    goal: 'Read the rank as the number of pivots (independent rows and columns), find the null space\'s dimension $n - \\text{rank}$, and connect low rank to redundant features and LoRA.',
    builds: ['gaussian-elimination'],
    blocks: [
      { md: `Run elimination on any matrix, square or not, and count the pivots. That count is the **rank**: the number of independent rows. A row that becomes all zeros was a combination of the rows above it; it carried no new information.

**Row rank equals column rank.** The pivot **columns** of the original matrix are independent and every other column is a combination of them, so the rank is also the number of independent columns: the dimension of the span of the columns, which is the set of all outputs $A\\mathbf x$ (the **column space**, or range). The proof needs a careful look at what elimination does to columns; **taken on trust** here, and the checks below confirm $\\text{rank}(A) = \\text{rank}(A^\\top)$ on every example.

**The null space** is the set of inputs the matrix sends to zero: $\\{\\mathbf x \\mid A\\mathbf x = \\mathbf 0\\}$. After elimination, each column **without** a pivot is a "free" unknown: set it to anything, and the pivot equations fix the rest. Each free unknown gives an independent direction of solutions, so

$$\\dim(\\text{null space}) = n - \\text{rank} \\qquad (n = \\text{number of columns})$$

(the *rank–nullity* rule). A square matrix is invertible exactly when its rank is full ($n$): then no nonzero input is squashed to zero, and lesson [[#inverse]]'s "squashing loses information" doesn't happen.

**Rank in ML.**
- **Redundant features.** If one feature is a combination of others (price in pounds and price in pence), the columns of $X$ are dependent, $X^\\top X$ loses rank, and lesson [[#least-squares]]'s normal equations have infinitely many solutions. Regularisation (Part [[#part:part5]]) restores a unique one.
- **Low-rank updates (LoRA).** Fine-tuning a big model changes a weight matrix $W$ ($d \\times d$) by $\\Delta W = BA$ with $B$ of size $d \\times r$ and $A$ of size $r \\times d$, for a small $r$. Every column of $BA$ is a combination of the $r$ columns of $B$, so $\\text{rank}(\\Delta W) \\le r$, and it costs $2dr$ numbers instead of $d^2$.` },
      { figure: 'RankFig', caption: 'Pick a matrix. Elimination shows its pivots (highlighted); rows that vanish were combinations of others. Rank = pivots; the null space has one direction per pivot-less column.' },
      {
        code: {
          file: 'matrices.py', fn: 'rank', notes: [
            ['def rank(A):', ['Any matrix.']],
            ['return len(row_reduce(A)[1])', ['The number of pivot columns elimination finds.'], { tex: '\\text{rank}(A) = \\#\\text{pivots}' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'What is the rank of $\\begin{pmatrix}1&2&3\\\\4&5&6\\\\7&8&9\\end{pmatrix}$?',
          answer: 2, compute: () => rank([[1, 2, 3], [4, 5, 6], [7, 8, 9]]),
          explain: 'Row 3 = 2 × row 2 − row 1, so only two rows are independent. Its null space has dimension $3 - 2 = 1$: the direction $(1, -2, 1)$.',
          misconceptions: [{ answer: 3, feedback: 'Three rows, but not three independent ones. Elimination turns the third row into zeros.' }],
        },
      },
      {
        predict: {
          prompt: 'LoRA with $d = 1000$ and $r = 8$: how many numbers does $\\Delta W = BA$ store?',
          answer: 16000, compute: () => 2 * 1000 * 8,
          explain: '$B$ is $1000 \\times 8$ and $A$ is $8 \\times 1000$: 16,000 numbers instead of 1,000,000, and $\\text{rank}(\\Delta W) \\le 8$.',
        },
      },
      { note: 'Rank = number of pivots = independent rows = independent columns = dimension of the outputs. Null space: inputs sent to $\\mathbf 0$, of dimension $n - \\text{rank}$. Full rank (square): invertible. $\\text{rank}(BA) \\le r$ when $B$ has $r$ columns: LoRA.' },
    ],
  },

  {
    id: 'determinant-n', title: 'Determinants in any dimension',
    goal: 'Define the determinant by how volume behaves under row operations, compute it as the product of the pivots, and know $\\det(AB) = \\det A\\,\\det B$ and $\\det A = 0 \\Leftrightarrow$ singular.',
    builds: ['gaussian-elimination', 'inverse'],
    blocks: [
      { md: `Lesson [[#inverse]] found the $2 \\times 2$ determinant $ad - bc$ as the factor by which a matrix scales area. In $n$ dimensions the determinant is the factor by which it scales **volume**, with a sign that records whether it flips space over. Instead of a formula, start from what volume must do, and let elimination compute it.

The rows of $A$ span a slanted box (a parallelepiped). Its signed volume $\\det A$ must satisfy:

1. **The unit cube has volume 1:** $\\det I = 1$.
2. **Swapping two rows flips the sign**: a mirror image.
3. **Scaling one row by $k$ scales the volume by $k$**: stretch one edge.
4. **Adding a multiple of one row to another leaves the volume unchanged.** This is a **shear**: sliding the top of a box sideways along its base keeps its base and its height, so its volume. (In 2D: a parallelogram's area is base × height, and sliding the top edge doesn't change the height.)

Those rules pin down $\\det$ completely, and they are exactly elimination's moves. Eliminate to upper-triangular, flipping the sign once per swap (rule 2); the adds don't change it (rule 4). For a triangular matrix with nonzero diagonal, more adds (now upward) clear everything off the diagonal without changing the volume, leaving a **diagonal** matrix, which stretches each axis by its diagonal entry: volume = their product (rule 3 applied to rule 1). So

$$\\det A = (-1)^{\\text{swaps}} \\times (\\text{product of the pivots})$$

and if any pivot is 0, $\\det A = 0$: the box is flat, the matrix is **singular** (rank less than $n$, no inverse). For $2\\times2$: pivots $a$ and $d - \\frac{c}{a}b$ give $a\\left(d - \\frac{cb}{a}\\right) = ad - bc$. ✓

**Two more facts.** $\\det(AB) = \\det A\\,\\det B$: doing $B$ scales volumes by $\\det B$, then $A$ by $\\det A$. And $\\det A^\\top = \\det A$ (so the same rules work for columns; **taken on trust**). Hence $\\det(A^{-1}) = 1/\\det A$.

**Why not a formula?** There is one, the cofactor expansion, with $n!$ terms. For $n = 20$ that is $2.4 \\times 10^{18}$ terms (lesson [[#counting]]), against elimination's 2660 steps. In ML, determinants appear in the multivariate Gaussian's normalising constant and in normalising flows, and are always computed through a factorisation like this one.` },
      { figure: 'DeterminantFig', caption: 'The two columns of a 2 × 2 matrix and the parallelogram they span. Shear it, scale a side, or swap: watch the signed area follow rules 2–4, and the determinant follow the area.' },
      {
        code: {
          file: 'matrices.py', fn: 'determinant', notes: [
            ['def determinant(A):', ['A square matrix.']],
            ['M = [list(row) for row in A]', ['Copy.']],
            ['n = len(M)', ['Its size.']],
            ['d = 1.0', ['The running determinant: the unit cube\'s volume, rule 1.']],
            ['for c in range(n):', ['Each column\'s pivot.']],
            ['best = max(range(c, n), key=lambda i: abs(M[i][c]))', ['Partial pivoting, as in elimination.']],
            ['if M[best][c] == 0:', ['No pivot in this column…']],
            ['return 0.0', ['…the box is flat: determinant 0.']],
            ['if best != c:', ['A swap is needed…']],
            ['M[c], M[best] = M[best], M[c]', ['…do it…']],
            ['d = -d', ['…and flip the sign (rule 2).']],
            ['d *= M[c][c]', ['Multiply in the pivot (rule 3, once the matrix is diagonal).']],
            ['for i in range(c + 1, n):', ['Clear the column below the pivot…']],
            ['factor = M[i][c] / M[c][c]', ['…with the usual factor…']],
            ['M[i] = [a - factor * p for a, p in zip(M[i], M[c])]', ['…by adding a multiple of the pivot row: volume unchanged (rule 4).']],
            ['return d', ['$(-1)^{\\text{swaps}}\\prod \\text{pivots}$.'], { tex: '\\det A = (-1)^{s}\\prod_i u_{ii}' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'What is the determinant of $\\begin{pmatrix}2&1&-1\\\\-3&-1&2\\\\-2&1&2\\end{pmatrix}$?',
          answer: -1, tolerance: 1e-9, compute: () => determinant(A3),
          explain: 'Elimination gives pivots whose product, with the sign from one swap, is $-1$. Nonzero, so the system of the last lesson has exactly one solution.',
        },
      },
      {
        predict: {
          prompt: '$\\det A = 3$ and $\\det B = -2$ for two $4\\times4$ matrices. What is $\\det(AB)$?',
          answer: -6, compute: () => determinant([[3, 0], [0, 1]]) * determinant([[-2, 0], [0, 1]]),
          explain: '$\\det(AB) = \\det A\\,\\det B = -6$: volumes scale by 2 and flip ($B$), then scale by 3 ($A$).',
        },
      },
      { note: '$\\det A$: the signed volume scaling. Swaps flip its sign, scaling a row scales it, adding multiples leaves it. So $\\det A = \\pm\\prod$ pivots; 0 exactly when singular. $\\det(AB) = \\det A\\det B$. Computed by elimination, never by the $n!$-term formula.' },
    ],
  },

  {
    id: 'orthogonality', title: 'Orthogonality, projections and Gram–Schmidt',
    goal: 'Project a vector onto a line and a subspace, use orthonormal bases where coordinates are just dot products, and turn any basis into an orthonormal one with Gram–Schmidt.',
    builds: ['dot-product', 'span-basis'],
    blocks: [
      { md: `Two vectors are **orthogonal** (perpendicular) when their dot product is 0 (lesson [[#dot-product]]). A set of vectors that are all orthogonal to each other and all of length 1 is **orthonormal**. Orthonormal bases make everything easy.

**Coordinates are just dot products.** If $\\mathbf q_1, \\dots, \\mathbf q_n$ is an orthonormal basis and $\\mathbf v = \\sum_j c_j\\mathbf q_j$, dot both sides with $\\mathbf q_i$: every term $\\mathbf q_j\\cdot\\mathbf q_i$ is 0 except $j = i$, where it is 1. So

$$c_i = \\mathbf q_i\\cdot\\mathbf v$$

No system to solve: compare the cost with the last lessons' $n^3/3$.

**Projection onto a line.** The **shadow** of $\\mathbf v$ on the line through $\\mathbf u$ is the point $k\\mathbf u$ closest to $\\mathbf v$. Lesson [[#least-squares]] showed the closest point is where the leftover is perpendicular: $(\\mathbf v - k\\mathbf u)\\cdot\\mathbf u = 0$, so $\\mathbf v\\cdot\\mathbf u - k\\,\\mathbf u\\cdot\\mathbf u = 0$ and

$$\\text{proj}_{\\mathbf u}\\mathbf v = \\frac{\\mathbf v\\cdot\\mathbf u}{\\mathbf u\\cdot\\mathbf u}\\,\\mathbf u$$

Then $\\mathbf v$ splits into two perpendicular pieces, shadow plus leftover, and Pythagoras says $\\|\\mathbf v\\|^2 = \\|\\text{shadow}\\|^2 + \\|\\text{leftover}\\|^2$.

**Projection onto a subspace** with an orthonormal basis $\\mathbf q_1, \\dots, \\mathbf q_k$: add the shadows, $\\sum_i(\\mathbf q_i\\cdot\\mathbf v)\\,\\mathbf q_i$. With the $\\mathbf q_i$ as the columns of $Q$, that is $QQ^\\top\\mathbf v$ (the $Q^\\top\\mathbf v$ computes all the dot products; $Q$ recombines).

**Gram–Schmidt** builds an orthonormal basis from any independent vectors. Take them in turn. From each, subtract its shadows on the vectors already accepted; what is left is perpendicular to all of them. Scale it to length 1 and accept it. The accepted vectors span the same space at every stage (each new one is the old vector minus a combination of earlier ones). Independence guarantees the leftover is never zero.

In ML: orthogonal initialisation of weight matrices, decorrelating features, and the QR factorisation behind numerically careful least squares.` },
      { figure: 'ProjectionFig', caption: 'Move $\\mathbf v$ and $\\mathbf u$. The shadow sits on $\\mathbf u$\'s line; the leftover meets it at a right angle; the lengths obey Pythagoras.' },
      {
        code: {
          file: 'matrices.py', fn: 'project', notes: [
            ['def project(v, u):', ['The vector to project, and the direction.']],
            ['k = dot(v, u) / dot(u, u)', ['How many $\\mathbf u$\'s long the shadow is.']],
            ['return [k * a for a in u]', ['The shadow $k\\mathbf u$.'], { tex: '\\text{proj}_{\\mathbf u}\\mathbf v = \\frac{\\mathbf v\\cdot\\mathbf u}{\\mathbf u\\cdot\\mathbf u}\\mathbf u' }],
          ],
        },
      },
      {
        code: {
          file: 'matrices.py', fn: 'gram_schmidt', notes: [
            ['def gram_schmidt(vectors):', ['Independent vectors.']],
            ['basis = []', ['The orthonormal vectors accepted so far.']],
            ['for v in vectors:', ['Each new vector in turn.']],
            ['w = list(v)', ['A working copy.']],
            ['for q in basis:', ['For each vector already accepted…']],
            ['shadow = project(w, q)', ['…the part of $\\mathbf w$ along it…']],
            ['w = [a - b for a, b in zip(w, shadow)]', ['…is removed. ($\\mathbf w$ is updated as we go, which is kinder to rounding than subtracting all shadows of the original.)']],
            ['length = norm(w)', ['What is left is perpendicular to all accepted vectors; measure it.']],
            ['basis.append([a / length for a in w])', ['Scale to length 1 and accept.']],
            ['return basis', ['An orthonormal basis of the same span.']],
          ],
        },
      },
      {
        predict: {
          prompt: 'Project $\\mathbf v = (2, 3)$ onto the line through $\\mathbf u = (1, 1)$. What is the shadow\'s first entry?',
          answer: 2.5, tolerance: 1e-9, compute: () => project([2, 3], [1, 1])[0],
          explain: '$\\frac{\\mathbf v\\cdot\\mathbf u}{\\mathbf u\\cdot\\mathbf u} = \\frac52$, so the shadow is $(2.5, 2.5)$; the leftover $(-0.5, 0.5)$ is perpendicular to $\\mathbf u$.',
        },
      },
      {
        predict: {
          prompt: 'Gram–Schmidt on $(1, 1, 0)$ and $(1, 0, 1)$: what is the dot product of the two vectors it returns?',
          answer: 0, tolerance: 1e-12, compute: () => { const [a, b] = gramSchmidt([[1, 1, 0], [1, 0, 1]]); return dot(a, b) },
          explain: `Zero: perpendicular by construction. The second is $(1, -1, 2)/\\sqrt6 = (${f(gramSchmidt([[1, 1, 0], [1, 0, 1]])[1][0])}, …)$.`,
        },
      },
      { note: 'Orthonormal: perpendicular unit vectors; coordinates are dot products $c_i = \\mathbf q_i\\cdot\\mathbf v$. $\\text{proj}_{\\mathbf u}\\mathbf v = \\frac{\\mathbf v\\cdot\\mathbf u}{\\mathbf u\\cdot\\mathbf u}\\mathbf u$; onto a subspace, $QQ^\\top\\mathbf v$. Gram–Schmidt: subtract shadows on the earlier vectors, normalise.' },
    ],
  },

  {
    id: 'orthogonal-matrices', title: 'Orthogonal matrices: rotations and reflections',
    goal: 'Show that a matrix with orthonormal columns has $Q^\\top Q = I$, so $Q^{-1} = Q^\\top$, keeps every length and angle, and has determinant $\\pm1$; build the reflection $I - 2\\mathbf u\\mathbf u^\\top$.',
    builds: ['orthogonality', 'transpose', 'determinant-n'],
    blocks: [
      { md: `A square matrix $Q$ whose columns are orthonormal is called **orthogonal** (the name is traditional; "orthonormal matrix" would be more accurate).

**$Q^\\top Q = I$.** Entry $(i, j)$ of $Q^\\top Q$ is row $i$ of $Q^\\top$ (column $i$ of $Q$) dotted with column $j$ of $Q$: $\\mathbf q_i\\cdot\\mathbf q_j$, which is 1 if $i = j$ and 0 otherwise. So the inverse is free: $Q^{-1} = Q^\\top$.

**It keeps lengths and angles.** $\\|Q\\mathbf x\\|^2 = (Q\\mathbf x)^\\top(Q\\mathbf x) = \\mathbf x^\\top Q^\\top Q\\,\\mathbf x = \\mathbf x^\\top\\mathbf x = \\|\\mathbf x\\|^2$, using lesson [[#transpose]]'s $(AB)^\\top = B^\\top A^\\top$. The same steps give $(Q\\mathbf x)\\cdot(Q\\mathbf y) = \\mathbf x\\cdot\\mathbf y$: dot products, hence angles, survive. An orthogonal matrix moves space **rigidly**.

**Its determinant is $\\pm1$.** $\\det(Q^\\top Q) = \\det I = 1$, and $\\det(Q^\\top Q) = \\det Q^\\top\\det Q = (\\det Q)^2$ (last lesson). So $\\det Q = 1$ (a **rotation**) or $-1$ (a **reflection**, possibly with a rotation).

**Building a reflection.** To mirror across the plane perpendicular to a unit vector $\\mathbf u$: the part of $\\mathbf v$ along $\\mathbf u$ is $(\\mathbf u\\cdot\\mathbf v)\\mathbf u$ (last lesson, with $\\mathbf u\\cdot\\mathbf u = 1$); a mirror flips that part and keeps the rest, so $\\mathbf v \\mapsto \\mathbf v - 2(\\mathbf u\\cdot\\mathbf v)\\mathbf u$. Since $(\\mathbf u\\cdot\\mathbf v)\\mathbf u = \\mathbf u(\\mathbf u^\\top\\mathbf v) = (\\mathbf u\\mathbf u^\\top)\\mathbf v$, the matrix is

$$H = I - 2\\mathbf u\\mathbf u^\\top$$

(a *Householder reflection*, the building block of the QR factorisation).

**In ML.** Initialising a deep network's weights as orthogonal matrices keeps signals from growing or shrinking as they pass through many layers (lengths are preserved). **Rotary position embeddings** (RoPE), used in most large language models, rotate pairs of entries of each query and key by an angle depending on the token's position. Since rotations preserve dot products, $\\mathbf q\\cdot\\mathbf k$ then depends only on the **difference** of the two positions: relative position, for free.` },
      { figure: 'OrthogonalFig', caption: 'A rotation or a reflection applied to a shape. Lengths, angles and area are unchanged; the determinant is +1 for rotations and −1 for reflections (the shape\'s letters read backwards).' },
      {
        code: {
          file: 'matrices.py', fn: 'is_orthogonal', notes: [
            ['def is_orthogonal(Q, tol=1e-9):', ['A square matrix.']],
            ['QtQ = matmul(transpose(Q), Q)', ['Every pair of columns dotted together.']],
            ['n = len(QtQ)', ['Its size.']],
            ['return all(abs(QtQ[i][j] - (1.0 if i == j else 0.0)) < tol for i in range(n) for j in range(n))', ['Is it the identity, entry by entry?'], { tex: 'Q^\\top Q = I' }],
          ],
        },
      },
      {
        code: {
          file: 'matrices.py', fn: 'reflection', notes: [
            ['def reflection(u):', ['A unit vector: the mirror\'s normal.']],
            ['n = len(u)', ['The dimension.']],
            ['return [[(1.0 if i == j else 0.0) - 2 * u[i] * u[j] for j in range(n)] for i in range(n)]', ['$I - 2\\mathbf u\\mathbf u^\\top$, entry by entry.'], { tex: 'H = I - 2\\mathbf u\\mathbf u^\\top' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'Reflect $(1, 0)$ with $\\mathbf u = (0.6, 0.8)$. What is the first entry of the result?',
          answer: 0.28, tolerance: 1e-9, compute: () => matvec(reflection([0.6, 0.8]), [1, 0])[0],
          explain: '$(1, 0) - 2(0.6)(0.6, 0.8) = (1 - 0.72, -0.96) = (0.28, -0.96)$, still of length 1.',
        },
      },
      {
        predict: {
          prompt: 'What is the length of $H\\mathbf v$ for $\\mathbf v = (3, 4)$ and the same reflection?',
          answer: 5, tolerance: 1e-9, compute: () => norm(matvec(reflection([0.6, 0.8]), [3, 4])),
          explain: 'Lengths are preserved: 5. ($\\mathbf v$ lies along $\\mathbf u$, so it is simply flipped to $(-3, -4)$.)',
        },
      },
      { note: 'Orthonormal columns: $Q^\\top Q = I$, so $Q^{-1} = Q^\\top$. Lengths, dot products and angles are preserved; $\\det Q = \\pm1$. Reflection: $I - 2\\mathbf u\\mathbf u^\\top$. Used for stable initialisation and rotary position embeddings.' },
    ],
  },

  {
    id: 'spectral', title: 'The spectral theorem: symmetric matrices stretch along perpendicular axes',
    goal: 'Prove that eigenvectors of a symmetric matrix with different eigenvalues are perpendicular, read $S = Q\\Lambda Q^\\top$, and compute it with Jacobi rotations.',
    builds: ['eigenvectors', 'orthogonal-matrices'],
    blocks: [
      { md: `Covariance matrices, Hessians and $X^\\top X$ are all **symmetric** ($S^\\top = S$). Lesson [[#eigenvectors]] leaned on a fact about them, and later lessons (PCA, the Hessian) will too; here it is.

**The spectral theorem.** A real symmetric $n \\times n$ matrix has $n$ real eigenvalues and an orthonormal basis of eigenvectors. Put the eigenvectors as the columns of $Q$ and the eigenvalues on the diagonal of $\\Lambda$ (capital lambda):

$$S = Q\\Lambda Q^\\top$$

Read it right to left, using the last two lessons: $Q^\\top\\mathbf x$ gives $\\mathbf x$'s coordinates in the eigenvector basis (dot products); $\\Lambda$ stretches coordinate $i$ by $\\lambda_i$; $Q$ puts the result back. **A symmetric matrix stretches space along perpendicular axes.** (A general matrix can shear, and its eigenvectors can lean toward each other or not exist at all.)

**The perpendicular part, proved.** Let $S\\mathbf v = \\lambda\\mathbf v$ and $S\\mathbf w = \\mu\\mathbf w$ with $\\lambda \\ne \\mu$. Compute $\\mathbf v^\\top S\\mathbf w$ two ways. Directly: $\\mathbf v^\\top(\\mu\\mathbf w) = \\mu\\,\\mathbf v\\cdot\\mathbf w$. Or by moving $S$ across: $\\mathbf v^\\top S\\mathbf w = (S^\\top\\mathbf v)^\\top\\mathbf w = (S\\mathbf v)^\\top\\mathbf w = \\lambda\\,\\mathbf v\\cdot\\mathbf w$, using $S^\\top = S$. So $(\\lambda - \\mu)\\,\\mathbf v\\cdot\\mathbf w = 0$, and since $\\lambda \\ne \\mu$, $\\mathbf v\\cdot\\mathbf w = 0$. $\\blacksquare$

**Taken on trust**: that the eigenvalues are always real and that there are always enough eigenvectors for a full basis (even with repeated eigenvalues). The algorithm below is the evidence: it always succeeds on symmetric matrices.

**Computing it: Jacobi rotations.** Pick the off-diagonal pair $S_{pq} = S_{qp}$. A rotation $J$ in the $(p, q)$ plane, by the right angle, makes $J^\\top SJ$ zero at $(p, q)$; it is still symmetric with the same eigenvalues ($J^\\top SJ\\mathbf x = \\lambda\\mathbf x$ exactly when $S(J\\mathbf x) = \\lambda(J\\mathbf x)$). Later rotations disturb that zero a little, but each one removes $2S_{pq}^2$ from the sum of squares of the off-diagonal entries (**taken on trust**), so sweeping over all pairs again and again drives the matrix to diagonal: $\\Lambda$. Multiplying the rotations together gives $Q$. It's slower than modern methods but every step is a rotation you can picture.

This settles the step lesson [[#eigenvectors]] took on trust for tilted bowls (the $2/\\lambda$ learning-rate limit), and it is the fact lesson [[#pca]] will use.` },
      { figure: 'SpectralFig', caption: 'A symmetric $2 \\times 2$ matrix turns the unit circle into an ellipse. Its axes are the eigenvectors, at right angles, with half-lengths $|\\lambda_1|$ and $|\\lambda_2|$. Make it non-symmetric and the axes stop lining up with the eigenvectors.' },
      {
        code: {
          file: 'matrices.py', fn: 'symmetric_eigen', notes: [
            ['def symmetric_eigen(S, sweeps=30):', ['A symmetric matrix; `sweeps` passes over every off-diagonal pair is plenty for small matrices.']],
            ['n = len(S)', ['Its size.']],
            ['A = [list(row) for row in S]', ['A copy that will be rotated into diagonal form.']],
            ['V = [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]', ['The product of all rotations so far: starts as $I$, ends as $Q$.']],
            ['for _ in range(sweeps):', ['Repeat…']],
            ['for p in range(n):', ['…over every pair $p < q$.']],
            ['for q in range(p + 1, n):', ['The partner index.']],
            ['if abs(A[p][q]) < 1e-15:', ['Already zero:']],
            ['continue', ['nothing to do.']],
            ['theta = (A[q][q] - A[p][p]) / (2 * A[p][q])', ['A number that fixes the right rotation angle (from setting the new $(p, q)$ entry to zero).']],
            ['t = (1.0 if theta >= 0 else -1.0) / (abs(theta) + math.sqrt(theta * theta + 1))', ['The tangent of the angle, chosen as the smaller of the two solutions, which keeps rotations small and stable.']],
            ['c = 1 / math.sqrt(t * t + 1)', ['Its cosine…']],
            ['s = t * c', ['…and sine.']],
            ['for k in range(n):', ['Rotate columns $p$ and $q$ ($SJ$)…']],
            ['akp, akq = A[k][p], A[k][q]', ['Both old values, before overwriting.']],
            ['A[k][p] = c * akp - s * akq', ['New column $p$.']],
            ['A[k][q] = s * akp + c * akq', ['New column $q$.']],
            ['for k in range(n):', ['Then rotate rows $p$ and $q$ ($J^\\top SJ$)…']],
            ['apk, aqk = A[p][k], A[q][k]', ['Both old values.']],
            ['A[p][k] = c * apk - s * aqk', ['New row $p$.']],
            ['A[q][k] = s * apk + c * aqk', ['New row $q$. Now $A_{pq} = A_{qp} = 0$.']],
            ['for k in range(n):', ['Finally accumulate the rotation into $V$…']],
            ['vkp, vkq = V[k][p], V[k][q]', ['…old values…']],
            ['V[k][p] = c * vkp - s * vkq', ['…column $p$…']],
            ['V[k][q] = s * vkp + c * vkq', ['…and column $q$.']],
            ['pairs = sorted(zip([A[i][i] for i in range(n)], transpose(V)), key=lambda pair: -pair[0])', ['The diagonal holds the eigenvalues; the columns of $V$ are the eigenvectors. Pair them up and sort, largest eigenvalue first.']],
            ['return [lam for lam, _ in pairs], [vec for _, vec in pairs]', ['$\\Lambda$\'s entries and $Q$\'s columns.'], { tex: 'S = Q\\Lambda Q^\\top' }],
          ],
        },
      },
      {
        predict: {
          prompt: 'What is the largest eigenvalue of $\\begin{pmatrix}4&1&0\\\\1&3&1\\\\0&1&2\\end{pmatrix}$? (4 decimals)',
          answer: 3 + Math.sqrt(3), tolerance: 0.00006, compute: () => symmetricEigen(S3)[0][0],
          explain: `$3 + \\sqrt3 = ${f(3 + Math.sqrt(3))}$; the others are 3 and $3 - \\sqrt 3$. Their sum, 9, equals the sum of the diagonal (a fact the trace lesson explains).`,
        },
      },
      {
        predict: {
          prompt: 'What is the dot product of the first and third eigenvectors that come back?',
          answer: 0, tolerance: 1e-12, compute: () => { const [, V] = symmetricEigen(S3); return dot(V[0], V[2]) },
          explain: 'Zero, as the proof says: different eigenvalues, perpendicular eigenvectors.',
        },
      },
      { note: 'Symmetric $S = Q\\Lambda Q^\\top$: real eigenvalues, orthonormal eigenvectors; it stretches along perpendicular axes. Proved: eigenvectors for different eigenvalues are perpendicular ($S^\\top = S$ lets $S$ move across the dot product). Jacobi rotations zero one off-diagonal pair at a time.' },
    ],
  },
]
