// Notation, quick-check questions and proofs for lessons written before these features existed.
// Keyed by lesson id; curriculum.js merges each entry into its lesson.
//   notation: [{ tex, say }]                  the lesson's key statements in symbols, each read in words
//   quiz:     [{ q, options, answer, why }]    recall questions that also feed spaced review
//   proof:    { claim, given?, steps: [{ ask, options, answer, why, hint? }], conclusion }
// Options are shuffled when shown, so the correct option is always written first (answer: 0).
// String.raw keeps LaTeX readable: one backslash per command.
const t = String.raw

export const ENRICH = {
  'laml-indexing': {
    notation: [
      { tex: t`A_{ij} = \text{entry in row } i,\ \text{column } j`, say: 'Rows first, then columns, counting from 1.' },
      { tex: t`A \in \mathbb R^{m\times n}`, say: '$m$ rows (observations) and $n$ columns (features).' },
    ],
    quiz: [
      { q: 'For a data table with one row per home, what does `homes(3, 2)` select?', options: ['Feature 2 of home 3', 'Feature 3 of home 2', 'Homes 2 and 3', 'The third column'], answer: 0, why: 'The first index is the row, the second the column.' },
      { q: 'What does `A(:, 2)` mean?', options: ['Every row of column 2', 'Every column of row 2', 'The entry at (2, 2)', 'The last two columns'], answer: 0, why: 'A colon in the row position means "all rows".' },
    ],
  },
  'laml-two-multiplications': {
    notation: [
      { tex: t`(A \circ B)_{ij} = A_{ij}B_{ij}`, say: 'Entrywise product: multiply matching entries (`.*` in OpenMAT).' },
      { tex: t`(AB)_{ij} = \sum_k A_{ik}B_{kj}`, say: 'Matrix product: row $i$ of $A$ dotted with column $j$ of $B$.' },
    ],
    quiz: [
      { q: t`For $X = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}$, what is the top-left entry of $X^2$ (matrix square)?`, options: ['7', '1', '4', '5'], answer: 0, why: t`$1\cdot1 + 2\cdot3 = 7$. The entrywise square would give 1.` },
      { q: 'When is the matrix product $AB$ defined?', options: ['When the number of columns of $A$ equals the number of rows of $B$', 'When $A$ and $B$ have the same size', 'Always', 'Only for square matrices'], answer: 0, why: 'Each row of $A$ must pair with each column of $B$ entry by entry.' },
    ],
  },
  'laml-matrix-maps': {
    notation: [
      { tex: t`A\mathbf e_1 = \text{column 1}, \qquad A\mathbf e_2 = \text{column 2}`, say: 'The columns of $A$ are where the coordinate directions land.' },
      { tex: t`A\mathbf x = x_1\,\mathbf a_1 + x_2\,\mathbf a_2`, say: 'Any input lands on the same combination of the columns.' },
    ],
    quiz: [
      { q: t`Where does $A = \begin{bmatrix} 2 & 1 \\ 0 & 1 \end{bmatrix}$ send $[0;1]$?`, options: [t`$[1;1]$`, t`$[2;0]$`, t`$[0;1]$`, t`$[1;0]$`], answer: 0, why: 'It lands on the second column.' },
      { q: 'A matrix sends $\\mathbf e_1 \\mapsto [3;1]$ and $\\mathbf e_2 \\mapsto [0;2]$. What is the matrix?', options: [t`$\begin{bmatrix} 3 & 0 \\ 1 & 2 \end{bmatrix}$`, t`$\begin{bmatrix} 3 & 1 \\ 0 & 2 \end{bmatrix}$`, t`$\begin{bmatrix} 0 & 3 \\ 2 & 1 \end{bmatrix}$`, t`$\begin{bmatrix} 3 & 1 \\ 2 & 0 \end{bmatrix}$`], answer: 0, why: 'The images become the columns, in order.' },
    ],
    proof: {
      claim: t`For any $\mathbf x = [x_1; x_2]$, $A\mathbf x = x_1\,(\text{column 1}) + x_2\,(\text{column 2})$.`,
      given: t`$A$ is linear: $A(\mathbf u + \mathbf v) = A\mathbf u + A\mathbf v$ and $A(c\mathbf u) = cA\mathbf u$.`,
      steps: [
        { ask: t`Write $\mathbf x$ using the coordinate directions.`, options: [t`$\mathbf x = x_1\mathbf e_1 + x_2\mathbf e_2$`, t`$\mathbf x = \mathbf e_1 + \mathbf e_2$`, t`$\mathbf x = x_1x_2\,\mathbf e_1$`], answer: 0, why: t`$x_1[1;0] + x_2[0;1] = [x_1; x_2]$.` },
        { ask: 'Apply $A$ and use linearity.', options: [t`$A\mathbf x = x_1A\mathbf e_1 + x_2A\mathbf e_2$`, t`$A\mathbf x = A x_1 \cdot A x_2$`, t`$A\mathbf x = (x_1 + x_2)A$`], answer: 0, why: 'Linearity splits sums and pulls out numbers.' },
        { ask: t`What are $A\mathbf e_1$ and $A\mathbf e_2$?`, options: ['The first and second columns of $A$', 'The first and second rows of $A$', 'The diagonal entries of $A$'], answer: 0, why: t`Multiplying by $\mathbf e_j$ picks out column $j$.` },
      ],
      conclusion: 'So knowing the columns is knowing the map. Every other input is a combination, and it lands on the same combination of the columns.',
    },
  },
  'laml-composition': {
    notation: [
      { tex: t`(RS)\mathbf x = R(S\mathbf x)`, say: '"First $S$, then $R$" is the product $RS$: the right-most factor acts first.' },
      { tex: t`RS \neq SR \ \text{in general}`, say: 'Matrix multiplication is not commutative.' },
    ],
    quiz: [
      { q: 'A pipeline applies $S$ first and then $R$. Which product represents it?', options: ['$RS$', '$SR$', '$R + S$', '$S^{-1}R$'], answer: 0, why: 'The factor nearest the input acts first.' },
      { q: 'A 90° rotation and a horizontal stretch: does the order matter?', options: ['Yes, the results differ', 'No, they commute', 'Only for unit vectors', 'Only if the stretch factor is negative'], answer: 0, why: 'Stretch-then-rotate and rotate-then-stretch send $\\mathbf e_1$ to different places.' },
    ],
    proof: {
      claim: t`Matrix multiplication is not commutative: there are $R, S$ with $RS \neq SR$.`,
      given: t`$R = \begin{bmatrix} 0 & -1 \\ 1 & 0 \end{bmatrix}$ (rotate 90°) and $S = \begin{bmatrix} 2 & 0 \\ 0 & 1 \end{bmatrix}$ (stretch horizontally).`,
      steps: [
        { ask: t`One counterexample is enough. Track $\mathbf e_1 = [1;0]$ through $RS$: first $S$, then $R$.`, options: [t`$S\mathbf e_1 = [2;0]$, then $R[2;0] = [0;2]$`, t`$S\mathbf e_1 = [1;0]$, then $R[1;0] = [0;1]$`, t`$S\mathbf e_1 = [0;2]$, then $R[0;2] = [-2;0]$`], answer: 0, why: 'Stretching doubles the first coordinate; rotating turns $[2;0]$ to $[0;2]$.' },
        { ask: t`Now track $\mathbf e_1$ through $SR$: first $R$, then $S$.`, options: [t`$R\mathbf e_1 = [0;1]$, then $S[0;1] = [0;1]$`, t`$R\mathbf e_1 = [0;2]$, then $S[0;2] = [0;2]$`, t`$R\mathbf e_1 = [1;0]$, then $S[1;0] = [2;0]$`], answer: 0, why: 'Rotating first moves $\\mathbf e_1$ to the vertical axis, where the stretch does nothing.' },
        { ask: 'What do the two results show?', options: [t`$RS\mathbf e_1 = [0;2] \neq [0;1] = SR\mathbf e_1$, so $RS \neq SR$`, 'They are equal, so the matrices commute', 'Nothing: we must check every vector'], answer: 0, why: 'Matrices that differ on one vector are different matrices.' },
      ],
      conclusion: 'One vector where the outputs differ proves the products differ. Always read a product right to left as a sequence of actions.',
    },
  },
  'laml-invertibility': {
    notation: [
      { tex: t`A\mathbf x = \mathbf b \;\Rightarrow\; \mathbf x = A^{-1}\mathbf b`, say: 'An invertible map can be undone. In code, solve with `A\\b`.' },
      { tex: t`A\mathbf z = \mathbf 0 \text{ for some } \mathbf z \neq \mathbf 0 \;\Rightarrow\; A \text{ is not invertible}`, say: 'If some direction is erased, information is lost for good.' },
    ],
    quiz: [
      { q: t`Can $C = \begin{bmatrix} 1 & 0 \\ 0 & 0 \end{bmatrix}$ tell $[2;1]$ and $[2;9]$ apart?`, options: ['No: both become $[2;0]$', 'Yes: the outputs differ', 'Only after inverting $C$', 'Only if we use `C\\b`'], answer: 0, why: 'The second coordinate is erased.' },
      { q: 'Why prefer `x = A\\b` to `x = inv(A)*b`?', options: ['It solves directly: faster and more accurate', 'inv does not exist in OpenMAT', 'They give different answers in exact arithmetic', 'Backslash also works for singular matrices'], answer: 0, why: 'Forming the inverse does extra work and amplifies rounding error.' },
    ],
    proof: {
      claim: t`If $A\mathbf z = \mathbf 0$ for some $\mathbf z \neq \mathbf 0$, then $A$ has no inverse.`,
      steps: [
        { ask: 'Suppose, for contradiction, that $A^{-1}$ exists. Apply it to both sides of $A\\mathbf z = \\mathbf 0$.', options: [t`$A^{-1}A\mathbf z = A^{-1}\mathbf 0$, so $\mathbf z = \mathbf 0$`, t`$A^{-1}A\mathbf z = \mathbf 0$, so $A = \mathbf 0$`, t`$\mathbf z = A^{-1}$`], answer: 0, why: 'An inverse undoes $A$, and any matrix sends $\\mathbf 0$ to $\\mathbf 0$.' },
        { ask: 'What does that contradict?', options: [t`The assumption $\mathbf z \neq \mathbf 0$`, 'Nothing: the proof is finished', t`The fact that $A\mathbf 0 = \mathbf 0$`], answer: 0, why: 'We derived $\\mathbf z = \\mathbf 0$ from assuming an inverse exists.' },
        { ask: 'In plain words, why can no inverse exist?', options: [t`$\mathbf 0$ and $\mathbf z$ both map to $\mathbf 0$, so no map can know which one to return`, 'Because $A$ is not square', t`Because $\det A > 0$`], answer: 0, why: 'An inverse must send each output back to one input.' },
      ],
      conclusion: 'A map that erases a direction loses information. Invertible maps are exactly those whose only erased vector is $\\mathbf 0$.',
    },
  },
  'laml-determinant-area': {
    notation: [
      { tex: t`\det\begin{bmatrix} a & b \\ c & d \end{bmatrix} = ad - bc`, say: 'The signed area of the parallelogram spanned by the columns.' },
      { tex: t`\operatorname{area}(A\,\text{shape}) = |\det A|\cdot\operatorname{area}(\text{shape})`, say: 'Every area scales by the same factor.' },
    ],
    quiz: [
      { q: t`What does $\det\begin{bmatrix} -2 & 0 \\ 0 & 3 \end{bmatrix} = -6$ say?`, options: ['Areas scale by 6 and orientation flips', 'Areas shrink by 6', 'The map is not invertible', 'Areas scale by $-6$, which is impossible'], answer: 0, why: 'The size is the area factor; the sign records a mirror flip.' },
      { q: 'A determinant of 0 means…', options: ['the plane is squashed onto a line or a point', 'the map is a rotation', 'areas double', 'the matrix is the identity'], answer: 0, why: 'Zero area means the columns are dependent.' },
    ],
    proof: {
      claim: t`For $A = \begin{bmatrix} a & b \\ c & d \end{bmatrix}$, $\det A = 0$ exactly when one column is a multiple of the other (or zero).`,
      steps: [
        { ask: t`Suppose column 2 is $k$ times column 1: $b = ka$ and $d = kc$. Compute $ad - bc$.`, options: [t`$a(kc) - (ka)c = 0$`, t`$ka^2 - kc^2$`, t`$k(ad - bc)$, which need not be 0`], answer: 0, why: 'Substitute and the two terms cancel.' },
        { ask: t`Conversely, suppose $ad - bc = 0$ and $a \neq 0$. Try $k = b/a$. What is $kc$?`, options: [t`$bc/a = ad/a = d$`, t`$bc$`, t`$0$`], answer: 0, why: t`$ad = bc$ lets us replace $bc$ by $ad$.` },
        { ask: 'What do $ka = b$ and $kc = d$ say?', options: ['Column 2 is $k$ times column 1', 'Column 1 is zero', 'The rows are equal'], answer: 0, why: t`Both entries of column 2 are $k$ times those of column 1. (If $a = 0$, run the same argument with $c$.)` },
      ],
      conclusion: 'Zero determinant means the two columns lie on one line, so the unit square collapses to zero area.',
    },
  },
  'laml-elimination': {
    notation: [
      { tex: t`A\mathbf x = \mathbf b \;\longleftrightarrow\; [\,A \mid \mathbf b\,]`, say: 'The augmented matrix holds the whole system.' },
      { tex: t`R_i \leftarrow R_i - k R_j`, say: 'Subtract a multiple of one equation from another. This never changes the solutions.' },
    ],
    quiz: [
      { q: 'A reduced row reads $[0\\ 0 \\mid 1]$. What does it mean?', options: ['$0 = 1$: the system has no solution', 'The second unknown is 1', 'There are infinitely many solutions', 'The first unknown is 0'], answer: 0, why: 'No values of the unknowns make $0 = 1$ true.' },
      { q: 'Which is NOT a valid row operation?', options: ['Multiply a row by 0', 'Swap two rows', 'Divide a row by 3', 'Add twice row 1 to row 2'], answer: 0, why: 'Multiplying by 0 throws away an equation, which can create false solutions.' },
    ],
    proof: {
      claim: t`Replacing equation 2 by (equation 2) $- k\cdot$(equation 1) keeps exactly the same solutions.`,
      given: t`Write the equations as $E_1 = b_1$ and $E_2 = b_2$, where $E_1, E_2$ are expressions in the unknowns.`,
      steps: [
        { ask: t`If $\mathbf x$ solves the original system, does it solve the new equation $E_2 - kE_1 = b_2 - kb_1$?`, options: [t`Yes: substitute $E_1 = b_1$ and $E_2 = b_2$`, 'Only if $k = 0$', 'Only if $k = 1$'], answer: 0, why: 'Equal things minus equal things are equal.' },
        { ask: t`Conversely, if $\mathbf x$ solves $E_1 = b_1$ and $E_2 - kE_1 = b_2 - kb_1$, recover the old equation 2.`, options: [t`Add $k$ times the first equation: $E_2 = b_2$`, t`Subtract the first equation: $E_2 = b_2 - b_1$`, 'It cannot be recovered'], answer: 0, why: 'The operation is undone by adding $k$ times row 1 back.' },
        { ask: 'What do the two directions together show?', options: ['Both systems have exactly the same solution set', 'The new system has more solutions', 'The new system has fewer solutions'], answer: 0, why: 'Every old solution is new, and every new solution is old.' },
      ],
      conclusion: 'Each row operation can be undone, so no solution is gained or lost. That is why elimination may freely simplify a system.',
    },
  },
  'laml-span-rank': {
    notation: [
      { tex: t`\operatorname{span}(\mathbf a_1,\dots,\mathbf a_n) = \{\, c_1\mathbf a_1 + \dots + c_n\mathbf a_n \,\}`, say: 'Every weighted sum of the vectors.' },
      { tex: t`\operatorname{rank}A = \text{number of independent columns}`, say: 'Rank counts directions, not columns.' },
    ],
    quiz: [
      { q: 'A fourth feature is twice the third. Does the rank go up?', options: ['No: it adds no new direction', 'Yes, by 1', 'Yes, by 2', 'The rank goes down'], answer: 0, why: 'A multiple of an existing column stays in the same span.' },
      { q: 'Three columns have rank 2. Which statement is true?', options: ['One column is a combination of the other two', 'All three columns are equal', 'One column is zero', 'The matrix has two rows'], answer: 0, why: 'Rank 2 means only two independent directions among three columns.' },
    ],
    proof: {
      claim: t`If $\mathbf a_3 = \mathbf a_1 + \mathbf a_2$, then $\operatorname{span}(\mathbf a_1,\mathbf a_2,\mathbf a_3) = \operatorname{span}(\mathbf a_1,\mathbf a_2)$.`,
      steps: [
        { ask: 'Take any point of the larger span. Write it out.', options: [t`$c_1\mathbf a_1 + c_2\mathbf a_2 + c_3\mathbf a_3$`, t`$c_1\mathbf a_1 + c_2\mathbf a_2$`, t`$\mathbf a_1 + \mathbf a_2 + \mathbf a_3$`], answer: 0, why: 'A general point of the span of three vectors uses three weights.' },
        { ask: t`Replace $\mathbf a_3$.`, options: [t`$(c_1 + c_3)\mathbf a_1 + (c_2 + c_3)\mathbf a_2$`, t`$c_1c_3\mathbf a_1 + c_2c_3\mathbf a_2$`, t`$c_3(\mathbf a_1 + \mathbf a_2)$ only`], answer: 0, why: 'Distribute $c_3$ and collect the terms for each vector.' },
        { ask: 'What does this show about the two spans?', options: ['Every point of the larger span is in the smaller one, and the smaller one is clearly inside the larger, so they are equal', 'The larger span is bigger', 'They only share the origin'], answer: 0, why: 'Containment both ways means equality.' },
      ],
      conclusion: 'A dependent column adds no reachable points. Rank, which counts independent columns, is the true size of the span.',
    },
  },
  'laml-nullspace': {
    notation: [
      { tex: t`N(A) = \{\, \mathbf z : A\mathbf z = \mathbf 0 \,\}`, say: 'The nullspace: every input that $A$ sends to zero.' },
      { tex: t`\mathbf x = \mathbf x_p + t\,\mathbf n`, say: 'Every solution is one particular solution plus a nullspace vector.' },
    ],
    quiz: [
      { q: 'You add $100\\mathbf n$ to a valid solution, where $A\\mathbf n = \\mathbf 0$. What happens to $A\\mathbf x$?', options: ['Nothing: it is still $\\mathbf b$', 'It grows by 100', 'It becomes zero', 'It changes sign'], answer: 0, why: '$A(\\mathbf x_p + 100\\mathbf n) = \\mathbf b + \\mathbf 0$.' },
      { q: 'Which vector is always in every nullspace?', options: ['The zero vector', 'The first column', 'A vector of ones', 'None'], answer: 0, why: '$A\\mathbf 0 = \\mathbf 0$ for every matrix.' },
    ],
    proof: {
      claim: t`If $A\mathbf x_p = \mathbf b$, then every solution of $A\mathbf x = \mathbf b$ has the form $\mathbf x_p + \mathbf z$ with $A\mathbf z = \mathbf 0$.`,
      steps: [
        { ask: t`Take any solution $\mathbf x$. Consider $\mathbf z = \mathbf x - \mathbf x_p$. What is $A\mathbf z$?`, options: [t`$A\mathbf x - A\mathbf x_p = \mathbf b - \mathbf b = \mathbf 0$`, t`$\mathbf b$`, t`$2\mathbf b$`], answer: 0, why: 'Distribute $A$ over the difference.' },
        { ask: t`So $\mathbf z$ is in the nullspace. How do we write $\mathbf x$?`, options: [t`$\mathbf x = \mathbf x_p + \mathbf z$`, t`$\mathbf x = \mathbf z - \mathbf x_p$`, t`$\mathbf x = \mathbf x_p\mathbf z$`], answer: 0, why: 'Rearrange $\\mathbf z = \\mathbf x - \\mathbf x_p$.' },
        { ask: t`Conversely, is $\mathbf x_p + \mathbf z$ a solution for every nullspace vector $\mathbf z$?`, options: [t`Yes: $A\mathbf x_p + A\mathbf z = \mathbf b + \mathbf 0$`, 'Only for unit vectors $\\mathbf z$', 'No'], answer: 0, why: 'Adding something $A$ ignores cannot change the output.' },
      ],
      conclusion: 'The solution set is the nullspace shifted by one particular solution. Find one answer, then add every direction $A$ cannot see.',
    },
  },
  'laml-lu-pivoting': {
    why: { title: 'Do the hard work once', story: 'An engineer checks one bridge under a hundred different loads. A simulation solves the same equations at every time step. Elimination is the expensive part, and it depends only on the matrix, so do it once, record it, and reuse it for every new right-hand side.' },
    notation: [
      { tex: t`PA = LU`, say: 'Reorder the rows with $P$, then factor into lower and upper triangular matrices.' },
      { tex: t`L\mathbf y = P\mathbf b, \qquad U\mathbf x = \mathbf y`, say: 'Two triangular solves replace one elimination.' },
    ],
    quiz: [
      { q: 'After `[L,U,P] = lu(A)`, which right-hand side goes into $L\\mathbf y = \\cdot$?', options: ['$P\\mathbf b$', '$\\mathbf b$', '$U\\mathbf b$', '$L^{-1}\\mathbf b$'], answer: 0, why: '$L$ and $U$ describe the reordered equations $PA$, so the totals must be reordered too.' },
      { q: 'Why factor once and reuse $L$ and $U$?', options: ['Each new $\\mathbf b$ then costs only two cheap triangular solves', 'It changes the answer', 'It avoids pivoting', 'It makes $A$ symmetric'], answer: 0, why: 'The expensive elimination happens once.' },
    ],
  },
  'laml-orthogonal-qr': {
    notation: [
      { tex: t`A = QR,\qquad Q^TQ = I,\qquad R \text{ upper triangular}`, say: 'Orthonormal columns times a triangular matrix.' },
      { tex: t`R = Q^TA`, say: 'Because $Q^TQ = I$, the triangular factor is recovered by one product.' },
    ],
    quiz: [
      { q: 'What happens to Gram–Schmidt if the second column is twice the first?', options: ['Its remainder is zero and cannot be normalised', 'It produces a second orthonormal vector anyway', 'The first vector becomes zero', 'R becomes the identity'], answer: 0, why: 'There is no new direction left after removing the projection.' },
      { q: 'Each entry of $Q^TQ$ is…', options: ['a dot product of two columns of $Q$', 'a length of a row of $Q$', 'an entry of $R$', 'a determinant'], answer: 0, why: 'Row $i$ of $Q^T$ is column $i$ of $Q$.' },
    ],
  },
  'laml-least-squares': {
    notation: [
      { tex: t`\hat{\boldsymbol\beta} = \arg\min_{\boldsymbol\beta}\ \|\mathbf y - X\boldsymbol\beta\|^2`, say: 'Choose coefficients that make the squared residual as small as possible.' },
      { tex: t`X^T(\mathbf y - X\hat{\boldsymbol\beta}) = \mathbf 0 \;\Longleftrightarrow\; X^TX\hat{\boldsymbol\beta} = X^T\mathbf y`, say: 'The normal equations: the residual is perpendicular to every column.' },
    ],
    quiz: [
      { q: 'Does least squares make every residual zero?', options: ['No: it minimises their squared total', 'Yes, always', 'Only with an intercept', 'Only for two data points or fewer'], answer: 0, why: 'For inconsistent data some residual must remain; least squares makes it perpendicular to the columns.' },
      { q: 'At the least-squares solution, $X^T\\mathbf r$ equals…', options: ['$\\mathbf 0$', '$\\mathbf y$', '$\\boldsymbol\\beta$', '$\\|\\mathbf r\\|^2$'], answer: 0, why: 'The residual is perpendicular to every column of $X$.' },
    ],
    proof: {
      claim: t`If $X^T\mathbf r = \mathbf 0$ for $\mathbf r = \mathbf y - X\hat{\boldsymbol\beta}$, then no other $\boldsymbol\beta$ gives a smaller squared residual.`,
      steps: [
        { ask: t`Write another candidate as $\boldsymbol\beta = \hat{\boldsymbol\beta} + \boldsymbol\delta$. What is its residual?`, options: [t`$\mathbf y - X\hat{\boldsymbol\beta} - X\boldsymbol\delta = \mathbf r - X\boldsymbol\delta$`, t`$\mathbf r + \boldsymbol\delta$`, t`$\mathbf r\,X\boldsymbol\delta$`], answer: 0, why: 'Distribute $X$ over the sum.' },
        { ask: t`Expand $\|\mathbf r - X\boldsymbol\delta\|^2$.`, options: [t`$\|\mathbf r\|^2 - 2\,(X\boldsymbol\delta)^T\mathbf r + \|X\boldsymbol\delta\|^2$`, t`$\|\mathbf r\|^2 - \|X\boldsymbol\delta\|^2$`, t`$\|\mathbf r\|^2\,\|X\boldsymbol\delta\|^2$`], answer: 0, why: 'Like $(a - b)^2 = a^2 - 2ab + b^2$, with dot products.' },
        { ask: t`Use $X^T\mathbf r = \mathbf 0$ on the middle term.`, options: [t`$(X\boldsymbol\delta)^T\mathbf r = \boldsymbol\delta^TX^T\mathbf r = 0$, leaving $\|\mathbf r\|^2 + \|X\boldsymbol\delta\|^2 \ge \|\mathbf r\|^2$`, t`The middle term doubles`, t`The last term vanishes`], answer: 0, why: 'Transpose of a product reverses order; then the given fact kills the cross term.' },
      ],
      conclusion: 'Moving away from $\\hat{\\boldsymbol\\beta}$ can only add $\\|X\\boldsymbol\\delta\\|^2 \\ge 0$. The perpendicular residual is the smallest possible one.',
    },
  },
  'laml-regression-validation': {
    notation: [
      { tex: t`X = \begin{bmatrix} 1 & x_1 \\ \vdots & \vdots \\ 1 & x_n \end{bmatrix}, \qquad \hat y = \beta_0 + \beta_1 x`, say: 'A column of ones lets the line have an intercept.' },
      { tex: t`\text{MSE}_{\text{test}} = \frac{1}{m}\sum_{i \in \text{test}} (y_i - \hat y_i)^2`, say: 'Evaluate on observations that played no part in fitting.' },
    ],
    quiz: [
      { q: 'You fit using test data too, then measure error on that test data. What is wrong?', options: ['It is no longer a held-out estimate', 'Nothing', 'The intercept disappears', 'The MSE becomes negative'], answer: 0, why: 'Those observations influenced the coefficients, so the error is optimistic.' },
      { q: 'What does the column of ones in $X$ provide?', options: ['An intercept term', 'A second slope', 'Regularisation', 'Feature scaling'], answer: 0, why: 'Its coefficient adds the same amount to every prediction.' },
    ],
  },
  'laml-ridge-scaling': {
    notation: [
      { tex: t`\min_{\boldsymbol\beta}\ \|\mathbf y - X\boldsymbol\beta\|^2 + \lambda\|\boldsymbol\beta\|^2`, say: 'Ridge adds a penalty on coefficient size.' },
      { tex: t`(X^TX + \lambda I)\,\boldsymbol\beta = X^T\mathbf y`, say: 'The penalty adds $\\lambda$ to the diagonal, which always makes the system solvable for $\\lambda > 0$.' },
    ],
    quiz: [
      { q: 'Why scale features before ridge?', options: ['So the penalty treats features fairly regardless of their units', 'To make the data symmetric', 'Ridge requires integers', 'It removes the need for an intercept'], answer: 0, why: 'A raw penalty depends on whether a feature is in millimetres or metres.' },
      { q: 'Increasing $\\lambda$ generally makes the coefficients…', options: ['smaller', 'larger', 'unchanged', 'negative'], answer: 0, why: 'A bigger penalty trades fit for smaller coefficients.' },
    ],
  },
  'laml-eigen-iteration': {
    notation: [
      { tex: t`A\mathbf v = \lambda\mathbf v`, say: 'An eigenvector is only stretched, by its eigenvalue $\\lambda$.' },
      { tex: t`\mathbf v_{k+1} = \frac{A\mathbf v_k}{\|A\mathbf v_k\|}, \qquad \lambda \approx \mathbf v_k^TA\mathbf v_k`, say: 'Power iteration: multiply, normalise, repeat.' },
    ],
    quiz: [
      { q: 'Power iteration on $\\begin{bmatrix} 2 & 1 \\\\ 1 & 2 \\end{bmatrix}$ starts at exactly $[1;-1]$. What happens?', options: ['It stays on $[1;-1]$ and never finds the dominant direction', 'It converges to $[1;1]$', 'It diverges', 'It reaches zero'], answer: 0, why: 'The start has no component along $[1;1]$, so repeated multiplication cannot create one.' },
      { q: 'Why normalise after each multiplication?', options: ['To stop the numbers from overflowing or vanishing', 'It changes the direction found', 'It is required for symmetric matrices only', 'To make the eigenvalue 1'], answer: 0, why: 'Only the direction matters; normalising keeps the size manageable.' },
    ],
    proof: {
      claim: t`If $\mathbf x = c_1\mathbf v_1 + c_2\mathbf v_2$ with $A\mathbf v_i = \lambda_i\mathbf v_i$, $|\lambda_1| > |\lambda_2|$ and $c_1 \neq 0$, then the direction of $A^k\mathbf x$ approaches $\mathbf v_1$.`,
      steps: [
        { ask: t`Compute $A^k\mathbf x$.`, options: [t`$c_1\lambda_1^k\mathbf v_1 + c_2\lambda_2^k\mathbf v_2$`, t`$(c_1 + c_2)\lambda_1^k\mathbf v_1$`, t`$c_1\lambda_1\mathbf v_1 + c_2\lambda_2\mathbf v_2$`], answer: 0, why: 'Each application of $A$ multiplies each eigen-part by its eigenvalue.' },
        { ask: t`Factor out $\lambda_1^k$.`, options: [t`$\lambda_1^k\big(c_1\mathbf v_1 + c_2(\lambda_2/\lambda_1)^k\mathbf v_2\big)$`, t`$\lambda_1^k(c_1 + c_2)\mathbf v_1$`, t`$\lambda_1^k c_2\mathbf v_2$`], answer: 0, why: 'Divide the second term by $\\lambda_1^k$ and multiply outside.' },
        { ask: t`What happens to $(\lambda_2/\lambda_1)^k$ as $k$ grows?`, options: [t`It goes to 0, since $|\lambda_2/\lambda_1| < 1$`, 'It grows', 'It stays 1'], answer: 0, why: 'A number of size below 1 raised to higher powers shrinks to 0.' },
      ],
      conclusion: 'The bracket approaches $c_1\\mathbf v_1$, so after normalising, the iterates line up with the dominant eigenvector. The ratio $|\\lambda_2/\\lambda_1|$ sets the speed.',
    },
  },
  'laml-symmetric-quadratic': {
    notation: [
      { tex: t`H = Q D Q^T, \qquad \mathbf z = Q^T\mathbf x`, say: 'Rotate into eigenvector coordinates.' },
      { tex: t`\mathbf x^TH\mathbf x = \sum_i d_i z_i^2`, say: 'In those coordinates the energy is a weighted sum of squares.' },
    ],
    quiz: [
      { q: 'One eigenvalue of symmetric $H$ is negative. Can $\\mathbf x^TH\\mathbf x$ be positive for every nonzero $\\mathbf x$?', options: ['No: along that eigenvector the energy is negative', 'Yes, if the other eigenvalue is larger', 'Yes, always', 'Only in two dimensions'], answer: 0, why: 'Pick $\\mathbf x$ as that eigenvector: the energy is $d\\,\\|\\mathbf x\\|^2 < 0$.' },
      { q: 'What does $Q^T\\mathbf x$ compute when $Q$ has orthonormal eigenvector columns?', options: ['The coordinates of $\\mathbf x$ along each eigenvector', 'The eigenvalues', 'A rotated copy of $H$', 'The length of $\\mathbf x$'], answer: 0, why: 'Each entry is a dot product with one unit eigenvector.' },
    ],
    proof: {
      claim: t`If $H = QDQ^T$ and $\mathbf z = Q^T\mathbf x$, then $\mathbf x^TH\mathbf x = \sum_i d_i z_i^2$.`,
      steps: [
        { ask: t`Substitute the factorization.`, options: [t`$\mathbf x^TQDQ^T\mathbf x$`, t`$\mathbf x^TD\mathbf x$`, t`$Q\mathbf x^TD\mathbf xQ^T$`], answer: 0, why: 'Replace $H$ by $QDQ^T$.' },
        { ask: t`Group the factors using $\mathbf z = Q^T\mathbf x$.`, options: [t`$(Q^T\mathbf x)^TD(Q^T\mathbf x) = \mathbf z^TD\mathbf z$`, t`$\mathbf z^T\mathbf z$`, t`$\mathbf z D$`], answer: 0, why: t`$\mathbf x^TQ$ is the transpose of $Q^T\mathbf x$.` },
        { ask: t`Expand $\mathbf z^TD\mathbf z$ for diagonal $D$.`, options: [t`$\sum_i d_i z_i^2$`, t`$\sum_i d_i z_i$`, t`$(\sum_i d_i)(\sum_i z_i^2)$`], answer: 0, why: 'Off-diagonal zeros remove every cross term.' },
      ],
      conclusion: 'The sign of the energy is decided by the signs of the eigenvalues. All positive means a bowl; mixed signs mean a saddle.',
    },
  },
  'laml-covariance-pca': {
    notation: [
      { tex: t`C = \frac{1}{n-1}X_c^TX_c`, say: 'Sample covariance from centred data $X_c$.' },
      { tex: t`\operatorname{Var}(X_c\mathbf d) = \mathbf d^TC\mathbf d, \quad \|\mathbf d\| = 1`, say: 'The variance along a unit direction is a quadratic form.' },
      { tex: t`\mathbf d^\star = \text{top eigenvector of } C`, say: 'PCA picks the direction of greatest variance.' },
    ],
    quiz: [
      { q: 'The leading eigenvector comes back with the opposite sign. Does the PCA reconstruction change?', options: ['No: scores flip too and the product is unchanged', 'Yes, it is mirrored', 'Yes, by a factor of $-1$', 'Only the mean changes'], answer: 0, why: 'The projector $\\mathbf d\\mathbf d^T$ is the same for $\\pm\\mathbf d$.' },
      { q: 'Why centre the data before computing covariance?', options: ['Covariance measures spread around the mean', 'To make the matrix square', 'To remove outliers', 'It is optional'], answer: 0, why: 'Without centring, the largest "direction" can be the mean itself.' },
    ],
    proof: {
      claim: t`For centred data $X_c$ and a unit direction $\mathbf d$, the sample variance of the scores $X_c\mathbf d$ equals $\mathbf d^TC\mathbf d$.`,
      given: t`The scores $s = X_c\mathbf d$ have mean zero, so their sample variance is $\frac{1}{n-1}\|s\|^2$.`,
      steps: [
        { ask: t`Write $\|s\|^2$ with transposes.`, options: [t`$(X_c\mathbf d)^T(X_c\mathbf d) = \mathbf d^TX_c^TX_c\mathbf d$`, t`$\mathbf d^T\mathbf d$`, t`$X_c^TX_c$`], answer: 0, why: 'A squared length is $\\mathbf v^T\\mathbf v$, and transposing reverses the order.' },
        { ask: t`Divide by $n - 1$.`, options: [t`$\mathbf d^T\Big(\frac{1}{n-1}X_c^TX_c\Big)\mathbf d = \mathbf d^TC\mathbf d$`, t`$\frac{1}{n-1}\mathbf d^T\mathbf d$`, t`$C$`], answer: 0, why: 'The number moves inside the quadratic form.' },
        { ask: t`Which unit $\mathbf d$ makes $\mathbf d^TC\mathbf d$ largest?`, options: ['The eigenvector of $C$ with the largest eigenvalue', 'Any vector of ones', 'The mean of the data', 'The last column of $X_c$'], answer: 0, why: 'Writing $\\mathbf d$ in eigenvector coordinates, the energy is a weighted average of eigenvalues, largest when all weight is on the top one.' },
      ],
      conclusion: 'PCA is an eigenvalue problem: the first principal direction is the top eigenvector of the covariance matrix, and its eigenvalue is the variance it captures.',
    },
  },
  'laml-vectorized-gradient': {
    notation: [
      { tex: t`L(\mathbf w) = \frac{1}{2m}\|X\mathbf w - \mathbf y\|^2`, say: 'Mean squared error, halved for a cleaner gradient.' },
      { tex: t`\nabla L = \frac{1}{m}X^T(X\mathbf w - \mathbf y)`, say: 'One matrix product gives every partial derivative at once.' },
      { tex: t`\mathbf w \leftarrow \mathbf w - \eta\,\nabla L`, say: 'A gradient step moves against the slope.' },
    ],
    quiz: [
      { q: 'All predictions are too small. What signs do the gradient components tend to have?', options: ['Negative, so the step increases the weights', 'Positive', 'Zero', 'Random'], answer: 0, why: 'Residuals $X\\mathbf w - \\mathbf y$ are negative, and the step subtracts the gradient.' },
      { q: 'Why multiply by $X^T$ in the gradient?', options: ['To collect each feature\'s contribution across all examples', 'To make the matrix square', 'To normalise the weights', 'To invert $X$'], answer: 0, why: 'Entry $j$ of $X^T\\mathbf r$ is feature $j$ dotted with the residuals.' },
    ],
  },
  'laml-descent-convergence': {
    notation: [
      { tex: t`\mathbf w_{k+1} = (I - \eta H)\,\mathbf w_k`, say: 'On a quadratic bowl, each step multiplies by $I - \\eta H$.' },
      { tex: t`0 < \eta < \frac{2}{\lambda_{\max}(H)}`, say: 'The step size that guarantees convergence.' },
    ],
    quiz: [
      { q: 'Curvatures 2 and 6, step $\\eta = 0.25$. Which direction oscillates?', options: ['The curvature-6 direction (multiplier $-0.5$)', 'The curvature-2 direction', 'Both', 'Neither'], answer: 0, why: '$1 - 0.25\\cdot6 = -0.5$ alternates sign; $1 - 0.25\\cdot2 = 0.5$ does not.' },
      { q: 'The largest curvature is 10. Which step size diverges?', options: ['$0.25$', '$0.1$', '$0.15$', '$0.05$'], answer: 0, why: 'The bound is $2/10 = 0.2$; $0.25$ exceeds it.' },
    ],
    proof: {
      claim: t`Along an eigenvector of $H$ with curvature $\lambda > 0$, gradient descent converges exactly when $0 < \eta < 2/\lambda$.`,
      given: t`The loss is $\tfrac12\mathbf w^TH\mathbf w$, so the gradient is $H\mathbf w$.`,
      steps: [
        { ask: t`Let $\mathbf w_k = c_k\mathbf v$ with $H\mathbf v = \lambda\mathbf v$. What is one step?`, options: [t`$c_{k+1} = (1 - \eta\lambda)\,c_k$`, t`$c_{k+1} = c_k - \eta$`, t`$c_{k+1} = \eta\lambda c_k$`], answer: 0, why: t`$\mathbf w - \eta H\mathbf w = c_k\mathbf v - \eta\lambda c_k\mathbf v$.` },
        { ask: t`So $c_k = (1 - \eta\lambda)^k c_0$. When does it shrink to 0?`, options: [t`When $|1 - \eta\lambda| < 1$`, t`When $1 - \eta\lambda > 1$`, t`Always`], answer: 0, why: 'Powers of a number shrink exactly when its size is below 1.' },
        { ask: t`Solve $|1 - \eta\lambda| < 1$ for $\eta$.`, options: [t`$-1 < 1 - \eta\lambda < 1$, so $0 < \eta < 2/\lambda$`, t`$\eta < 1/\lambda$`, t`$\eta > 2/\lambda$`], answer: 0, why: 'Split the absolute value into two inequalities and divide by $\\lambda > 0$.' },
      ],
      conclusion: 'Every eigen-direction must satisfy its own bound, so the steepest curvature $\\lambda_{\\max}$ limits the step size for the whole problem.',
    },
  },
  'laml-stable-logistic': {
    notation: [
      { tex: t`\sigma(z) = \frac{1}{1 + e^{-z}}`, say: 'The sigmoid turns a score into a probability.' },
      { tex: t`\ell(z, y) = \max(z, 0) - yz + \log\!\big(1 + e^{-|z|}\big)`, say: 'A stable form of the logistic loss that never exponentiates a large positive number.' },
    ],
    quiz: [
      { q: 'Score 1000, target 0. Is the stable loss near 0 or near 1000?', options: ['Near 1000: confidently wrong', 'Near 0', 'Exactly 1', 'Undefined'], answer: 0, why: 'The stable formula keeps the large penalty instead of overflowing.' },
      { q: 'Why rewrite the loss with $e^{-|z|}$?', options: ['So the exponential never overflows', 'To make it symmetric', 'To speed up convergence', 'To remove the bias term'], answer: 0, why: '$e^{-|z|} \\le 1$ for every $z$.' },
    ],
  },
  'laml-backpropagation': {
    notation: [
      { tex: t`\mathbf h = \tanh(W\mathbf x), \qquad \hat y = \mathbf v^T\mathbf h`, say: 'A small network: a hidden layer, then a weighted sum.' },
      { tex: t`\frac{\partial L}{\partial W} = \big(\delta\,\mathbf v \odot (1 - \mathbf h^2)\big)\,\mathbf x^T`, say: 'Backpropagation: the chain rule, one layer at a time.' },
    ],
    quiz: [
      { q: 'Which hidden unit learns more slowly: score 3 or score 0?', options: ['Score 3: its tanh derivative is near 0', 'Score 0', 'They learn equally', 'Neither learns'], answer: 0, why: '$1 - \\tanh(3)^2 \\approx 0.01$, while $1 - \\tanh(0)^2 = 1$.' },
      { q: 'How do you check a backpropagated gradient?', options: ['Nudge one weight both ways and compare the loss change', 'Set all weights to zero', 'Train for longer', 'Compare it with the prediction'], answer: 0, why: 'A central difference approximates the derivative independently.' },
    ],
  },
  'laml-markov-state-vectors': {
    notation: [
      { tex: t`P_{ij} = \Pr(\text{next} = j \mid \text{now} = i), \qquad \textstyle\sum_j P_{ij} = 1`, say: 'Rows are current states; each row is a probability distribution.' },
      { tex: t`\mathbf p_{\text{next}} = P^T\mathbf p, \qquad \mathbf v_{\text{expected}} = P\mathbf v`, say: 'Distributions move with $P^T$; expected next values use $P$.' },
    ],
    quiz: [
      { q: 'With rows as current states, how does a distribution $\\mathbf p$ move one step?', options: ['$P^T\\mathbf p$', '$P\\mathbf p$', '$\\mathbf p^TP^T$', '$P^2\\mathbf p$'], answer: 0, why: 'Each next-state probability sums over current states, which is a column of $P$.' },
      { q: 'What must each row of a row-stochastic matrix satisfy?', options: ['Non-negative entries that sum to 1', 'Entries that sum to 0', 'A unit length', 'Exactly one nonzero entry'], answer: 0, why: 'Each row is the distribution of the next state.' },
    ],
    proof: {
      claim: t`If each row of $P$ sums to 1 and the entries of $\mathbf p$ sum to 1, then the entries of $P^T\mathbf p$ also sum to 1.`,
      given: t`Write $\mathbf 1$ for the vector of ones, so "entries of $\mathbf p$ sum to 1" is $\mathbf 1^T\mathbf p = 1$ and "rows sum to 1" is $P\mathbf 1 = \mathbf 1$.`,
      steps: [
        { ask: t`The sum of the entries of $P^T\mathbf p$ is $\mathbf 1^TP^T\mathbf p$. Regroup it.`, options: [t`$(P\mathbf 1)^T\mathbf p$`, t`$\mathbf 1^T\mathbf p\,P$`, t`$P^T(\mathbf 1^T\mathbf p)$`], answer: 0, why: t`$\mathbf 1^TP^T$ is the transpose of $P\mathbf 1$.` },
        { ask: 'Use the row sums.', options: [t`$(P\mathbf 1)^T\mathbf p = \mathbf 1^T\mathbf p$`, t`$(P\mathbf 1)^T\mathbf p = 0$`, t`$(P\mathbf 1)^T\mathbf p = P$`], answer: 0, why: t`$P\mathbf 1 = \mathbf 1$.` },
        { ask: 'Finish.', options: [t`$\mathbf 1^T\mathbf p = 1$`, t`$\mathbf 1^T\mathbf p = n$`, 'It depends on $P$'], answer: 0, why: 'The starting distribution sums to 1.' },
      ],
      conclusion: 'Probability is conserved at every step, provided the transition convention matches: rows as current states, and $P^T$ to move distributions.',
    },
  },
  'laml-policy-evaluation': {
    notation: [
      { tex: t`\mathbf v = \mathbf r + \gamma P\mathbf v`, say: 'The Bellman equation for a fixed policy: reward now plus discounted value later.' },
      { tex: t`(I - \gamma P)\,\mathbf v = \mathbf r`, say: 'The same equation as a linear system, solvable for $0 \\le \\gamma < 1$.' },
    ],
    quiz: [
      { q: 'An absorbing state earns 2 forever with $\\gamma = 0.8$. What is its value?', options: ['10', '2', '0', '1.6'], answer: 0, why: '$2/(1 - 0.8) = 10$.' },
      { q: 'Why does $\\gamma < 1$ matter?', options: ['It makes $I - \\gamma P$ invertible and the iteration converge', 'It makes rewards positive', 'It removes absorbing states', 'It is only a convention'], answer: 0, why: 'Discounting shrinks the future enough for a unique value.' },
    ],
  },
  'laml-backward-induction': {
    notation: [
      { tex: t`V_T = \text{terminal payoff}, \qquad V_t = \max_a\big(r_a + P_aV_{t+1}\big)`, say: 'Work backwards from the end, one decision at a time.' },
    ],
    quiz: [
      { q: 'Why can the best action change with time?', options: ['The remaining horizon changes what future rewards are reachable', 'Rewards change randomly', 'The transition matrix changes', 'It cannot change'], answer: 0, why: 'With one step left, waiting has no future benefit.' },
      { q: 'Where does backward induction start?', options: ['At the terminal payoff', 'At the first decision', 'At the largest reward', 'At a random state'], answer: 0, why: 'The last step\'s value is known; earlier values build on it.' },
    ],
  },
  'laml-value-iteration': {
    notation: [
      { tex: t`V(s) \leftarrow \max_a \big(r(s,a) + \gamma \textstyle\sum_{s'} P(s' \mid s,a)\,V(s')\big)`, say: 'Bellman optimality update.' },
      { tex: t`\|V - V^\star\|_\infty \le \frac{\|TV - V\|_\infty}{1 - \gamma}`, say: 'A small Bellman residual certifies a small value error.' },
    ],
    quiz: [
      { q: 'Why recompute action values after the final update?', options: ['So the policy and residual match the returned values', 'To speed up convergence', 'To change $\\gamma$', 'It is not needed'], answer: 0, why: 'Otherwise the certificate describes the previous value vector.' },
      { q: 'Bellman residual 0.1 with $\\gamma = 0.9$. What error bound follows?', options: ['1', '0.1', '0.09', '0.9'], answer: 0, why: '$0.1/(1 - 0.9) = 1$.' },
    ],
  },
  'laml-recommendation-studio': {
    notation: [
      { tex: t`R \approx \sigma_1\,\mathbf u_1\mathbf v_1^T`, say: 'A rank-one model: one taste factor for users, one for items.' },
      { tex: t`\text{RMSE} = \sqrt{\tfrac1n\textstyle\sum (r - \hat r)^2}`, say: 'Root mean squared error, measured only where ratings are known.' },
    ],
    quiz: [
      { q: 'Does a smaller reconstruction error on the filled table guarantee better held-out predictions?', options: ['No: the fill values were invented', 'Yes, always', 'Only for rank one', 'Only with more users'], answer: 0, why: 'Predictive evidence must come from ratings that did not influence fitting.' },
      { q: 'Where should the training RMSE be measured?', options: ['Only on observed training cells', 'On every cell of the filled table', 'On the held-out rating', 'On the singular values'], answer: 0, why: 'Filled cells are not data.' },
    ],
  },
  'laml-pca-ridge-capstone': {
    notation: [
      { tex: t`z = (\mathbf x - \boldsymbol\mu_{\text{train}})^T\mathbf d, \qquad \hat y = \bar y_{\text{train}} + \beta z`, say: 'Project with training quantities, then predict with one ridge coefficient.' },
    ],
    quiz: [
      { q: 'The principal direction flips sign. Do predictions change?', options: ['No: scores and the fitted coefficient both flip', 'Yes, they flip', 'Only the intercept changes', 'The model must be refitted'], answer: 0, why: 'The product $\\beta z$ is unchanged.' },
      { q: 'Which means are used to centre test rows?', options: ['The training means', 'The test means', 'The overall means', 'None'], answer: 0, why: 'Using test means leaks test information into the pipeline.' },
    ],
  },
  'laml-policy-iteration-capstone': {
    notation: [
      { tex: t`(I - \gamma P_\pi)\mathbf v_\pi = \mathbf r_\pi`, say: 'Evaluate the current policy exactly.' },
      { tex: t`\pi'(s) = \arg\max_a \big(r(s,a) + \gamma P_a\mathbf v_\pi\big)(s)`, say: 'Improve it greedily, then repeat until it stops changing.' },
    ],
    quiz: [
      { q: 'Does a zero policy residual prove the policy is optimal?', options: ['No: it only proves the values match that policy', 'Yes', 'Only for two states', 'Only with $\\gamma < 0.5$'], answer: 0, why: 'Optimality also requires that no other action does better.' },
      { q: 'When does policy iteration stop?', options: ['When the improved policy equals the current one', 'After exactly 10 steps', 'When values reach zero', 'When $\\gamma$ reaches 1'], answer: 0, why: 'An unchanged greedy policy satisfies the Bellman optimality equation.' },
    ],
  },
  'laml-independent-audit': {
    notation: [
      { tex: t`\text{test MSE},\quad \|T\mathbf v - \mathbf v\|_\infty,\quad \frac{\text{residual}}{1-\gamma},\quad \min \text{action gap}`, say: 'Four independent pieces of evidence for one decision.' },
    ],
    quiz: [
      { q: 'Both numerical residuals are zero. Can the policy still be poor in reality?', options: ['Yes: the reward model itself may be wrong', 'No', 'Only if $\\gamma > 0.9$', 'Only if the test set is large'], answer: 0, why: 'Solving a wrong model exactly still gives a wrong answer.' },
      { q: 'Why compare the value-error bound with the smallest action gap?', options: ['If the bound is smaller, the chosen actions are certain', 'To compute the learning rate', 'To pick $\\lambda$', 'It has no use'], answer: 0, why: 'A value error smaller than the gap cannot flip the best action.' },
    ],
  },
}
