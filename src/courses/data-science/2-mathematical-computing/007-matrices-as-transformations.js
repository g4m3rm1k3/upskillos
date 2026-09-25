import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'b-07', slug: 'matrices-as-transformations', track: 'B', order: 7,
  title: 'Matrices as Transformations', subtitle: 'What Matrix Multiplication Actually Does',
  tags: ['matrix', 'transformation', 'determinant', 'composition', 'numpy', 'linear-algebra'],
  prereqs: ['b-05', 'b-06'], unlocks: ['b-08', 'd-02'],
  hook: {
    question: 'Why is multiplying by a matrix the same as transforming space?',
    realWorldContext: 'A matrix can rotate, stretch, shear or flatten every vector at once. Reading a matrix as "where the basis vectors go" makes matrix–vector products, composition and the determinant easy to predict — and those ideas return in regression, PCA and neural-network layers.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Read a 2×2 matrix as a transformation by finding where the basis vectors land. Compute a matrix–vector product two ways and check they agree. Predict when the order of two transformations matters, and read what the determinant\'s size and sign say.',
        '**The smallest example.** The **basis vectors** are î = [1, 0] (one step along x) and ĵ = [0, 1] (one step along y). Every vector is a combination of them: [5, 6] = 5·î + 6·ĵ. A matrix is a list of where î and ĵ go, written as its **columns**:',
        '```text\nA = [[1, 2],      column 0 = [1, 3]  → where î lands\n     [3, 4]]      column 1 = [2, 4]  → where ĵ lands\n```',
        'In NumPy, `A = np.array([[1, 2], [3, 4]])` is written row by row, but the geometry lives in the columns: `A[:, 0]` is [1, 3] and `A[:, 1]` is [2, 4]. For a general `[[a, b], [c, d]]`, î lands on [a, c] and ĵ on [b, d] — not on the rows.',
      ),
      check(
        'For A = [[2, 0], [1, 3]], where does ĵ = [0, 1] land?',
        ['[2, 0]', '[0, 3]', '[1, 3]', '[2, 1]'],
        1,
        'ĵ lands on the second column: [0, 3]. The second row, [1, 3], is not a basis image.',
      ),
      prose(
        '**Two ways to compute A @ v.** Because v = [5, 6] means 5·î + 6·ĵ, and A sends î and ĵ to its columns, A @ v must be 5·(column 0) + 6·(column 1). That is the **column view**. Working it out entry by entry gives the **row view**: each output entry is a row of A dotted with v.',
        '| View | Working for A = [[1, 2], [3, 4]], v = [5, 6] | Result |\n|---|---|---|\n| column view | 5·[1, 3] + 6·[2, 4] = [5, 15] + [12, 24] | [17, 39] |\n| row view | [row 0 · v, row 1 · v] = [1·5 + 2·6, 3·5 + 4·6] | [17, 39] |',
        'The column view explains the geometry; the row view is usually quicker by hand. They always agree.',
      ),
      notebook('Matrix–vector products', [
        demo(1, 'Stage 1 — Two views, one answer', [
          'Computed with `@`, with the row view and with the column view. The last lines show that A sends î and ĵ to its columns.',
        ], 'Predict A @ v with the row view before running. Then change A and v and confirm the three results still agree.', 'import numpy as np\nA = np.array([[1.0, 2.0], [3.0, 4.0]])\nv = np.array([5.0, 6.0])\nprint("A @ v       =", A @ v)\nprint("row view    =", np.array([A[0] @ v, A[1] @ v]))\nprint("column view =", v[0] * A[:, 0] + v[1] * A[:, 1])\nprint("i-hat lands on", A @ np.array([1.0, 0.0]), "= column 0", A[:, 0])\nprint("j-hat lands on", A @ np.array([0.0, 1.0]), "= column 1", A[:, 1])', { expectOutput: ['A @ v       = [17. 39.]', 'row view    = [17. 39.]', 'column view = [17. 39.]', 'i-hat lands on [1. 3.] = column 0 [1. 3.]'] }),
        demo(2, 'Stage 2 — Seeing the whole grid move', [
          'The coloured grid is the original grid after applying A. The red and green arrows are the columns of A — the images of î and ĵ — and every grid line follows them.',
        ], 'Run. Then try the rotation [[0, -1], [1, 0]]: where do î and ĵ go? Then try the shear [[1, 1], [0, 1]].', 'from opencalc import Figure\nimport numpy as np\nA = np.array([[1.5, 0.5], [0.0, 1.5]])\nfig = Figure(square=True, xmin=-5, xmax=5, ymin=-5, ymax=5)\nfig.grid()\nfig.transformed_grid(A.tolist())\nfig.vector(A[:, 0].tolist(), color="red", label="image of i-hat")\nfig.vector(A[:, 1].tolist(), color="green", label="image of j-hat")\nfig.show()'),
      ]),
      prose(
        '**Doing one transformation after another.** Applying B and then A to v is A @ (B @ v), which equals (A @ B) @ v. So the product A @ B means "**B first, then A**" — read right to left.',
        'The order usually matters. Rotate by 90° with R = [[0, −1], [1, 0]] and stretch x by 2 with S = [[2, 0], [0, 1]], and follow v = [1, 0]:',
        '| Order | Step 1 | Step 2 | Result |\n|---|---|---|---|\n| rotate, then stretch: S @ R | R sends [1, 0] to [0, 1] | stretching x does nothing to [0, 1] | [0, 1] |\n| stretch, then rotate: R @ S | S sends [1, 0] to [2, 0] | R sends [2, 0] to [0, 2] | [0, 2] |',
        'Some pairs do give the same result in either order — for example scaling *every* direction by the same factor with any rotation — but that is a special case, not the rule. Never assume A @ B equals B @ A.',
      ),
      check(
        'Which product means "apply B first, then A"?',
        ['B @ A', 'A @ B'],
        1,
        '(A @ B) @ v = A @ (B @ v): B acts on v first, then A acts on the result.',
      ),
      notebook('Composition', [
        demo(3, 'Stage 3 — Order changes the result', [
          'The table above, computed. The last line compares the two products directly.',
        ], 'Predict both results for v = [1, 0], then run. Then replace stretch_x with the uniform scale [[2, 0], [0, 2]] and check that the order no longer matters.', 'import numpy as np\nrotate = np.array([[0, -1], [1, 0]])      # 90 degrees anticlockwise\nstretch_x = np.array([[2, 0], [0, 1]])    # double x only\nv = np.array([1, 0])\nprint("rotate then stretch:", (stretch_x @ rotate) @ v)\nprint("stretch then rotate:", (rotate @ stretch_x) @ v)\nprint("same matrix?", np.array_equal(stretch_x @ rotate, rotate @ stretch_x))', { expectOutput: ['rotate then stretch: [0 1]', 'stretch then rotate: [0 2]', 'same matrix? False'] }),
      ]),
      prose(
        '**The determinant: area and orientation.** A transformation takes the unit square (sides î and ĵ) to a parallelogram (sides = the two columns). For [[a, b], [c, d]] the **determinant** is ad − bc.',
        '| det(A) | Meaning |\n|---|---|\n| \\|det\\| | the factor by which every area is multiplied |\n| positive | orientation kept: going from î to ĵ is still anticlockwise |\n| negative | orientation flipped, like a mirror |\n| 0 | the plane is squashed onto a line or a point; the transformation cannot be undone |',
        'For example [[2, 1], [0, 3]] has det 2×3 − 1×0 = 6: areas grow six-fold. The swap [[0, 1], [1, 0]] has det −1: areas are unchanged but the plane is mirrored. [[1, 2], [2, 4]] has det 0, because its second column is twice its first — both basis vectors land on the same line.',
      ),
      check(
        'A matrix has determinant −2. What does it do to areas?',
        ['Halves them', 'Doubles them and mirrors the plane', 'Makes them negative'],
        1,
        'The size |−2| = 2 is the area factor; the negative sign means the orientation is flipped. Areas themselves are never negative.',
      ),
      notebook('Determinant', [
        demo(4, 'Stage 4 — Size and sign', [
          'Three determinants from the text. Floating-point arithmetic may show a tiny number such as 1e-16 instead of exactly 0 for a squashing matrix.',
        ], 'Predict each determinant with ad − bc before running. Then build a reflection of your own, such as [[-1, 0], [0, 1]], and check its sign.', 'import numpy as np\nfor name, M in [("stretch", [[2.0, 1], [0, 3]]), ("mirror", [[0.0, 1], [1, 0]]), ("squash", [[1.0, 2], [2, 4]])]:\n    print(name, round(np.linalg.det(np.array(M)), 4))', { expectOutput: ['stretch 6.0', 'mirror -1.0', 'squash 0.0'] }),
      ]),
      prose('**Practice.** Challenge 1 implements both views and checks them against NumPy. Challenge 2 builds a matrix from where the basis vectors should go. Challenge 3 is a fresh problem about order and determinants.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Both views agree', 'medium', {
          prompt: 'Write matvec_rows(A, v), which builds the result entry by entry from rows of A, and matvec_cols(A, v), which adds up the columns of A scaled by the entries of v. Both must equal A @ v for any 2×2 A.',
          instructions: 'Rows: `A[i]` is row i. Columns: `A[:, j]` is column j. Use a loop over the entries of v for the column view.',
          code: 'import numpy as np\n\ndef matvec_rows(A, v):\n    return np.array([A[0] @ v, A[1] @ v])\n\ndef matvec_cols(A, v):\n    result = np.zeros(2)\n    # TODO: add v[j] times column j, for each j\n    return result',
          testCode: `import numpy as np
A = np.array([[2.0, -1.0], [1.0, 3.0]])
v = np.array([4.0, 2.0])
assert np.allclose(matvec_rows(A, v), A @ v), "matvec_rows should dot each ROW of A with v"
got = matvec_cols(A, v)
assert not np.allclose(got, v[0] * A[0] + v[1] * A[1]), "That combines the ROWS of A. The column view combines columns: v[0] * A[:, 0] + v[1] * A[:, 1]"
assert np.allclose(got, A @ v), f"matvec_cols should equal A @ v = {A @ v}, got {got}"
B = np.array([[0.0, 1.0], [5.0, -2.0]])
assert np.allclose(matvec_cols(B, np.array([1.0, 1.0])), B @ np.array([1.0, 1.0])), "Check matvec_cols on another matrix"
"SUCCESS: row view and column view both reproduce A @ v."`,
          hint: 'for j in range(2):\n    result = result + v[j] * A[:, j]',
          solution: 'import numpy as np\n\ndef matvec_rows(A, v):\n    return np.array([A[0] @ v, A[1] @ v])\n\ndef matvec_cols(A, v):\n    result = np.zeros(2)\n    for j in range(2):\n        result = result + v[j] * A[:, j]\n    return result',
          misconceptions: [{ code: 'import numpy as np\ndef matvec_rows(A, v):\n    return np.array([A[0] @ v, A[1] @ v])\ndef matvec_cols(A, v):\n    return v[0] * A[0] + v[1] * A[1]', feedback: 'That combines the ROWS of A' }],
        }),
        exercise(12, 2, 'Challenge 2 — Build a transformation', 'medium', {
          prompt: 'Build the matrix A that sends î to [2, 1] and ĵ to [-1, 3]. Then store A @ [4, 2] in image.',
          instructions: 'The images of î and ĵ are the COLUMNS. `np.column_stack([col0, col1])` builds a matrix from columns.',
          code: 'import numpy as np\nA = np.array([[2, 1], [-1, 3]])\nimage = A @ np.array([4, 2])',
          testCode: `import numpy as np
assert not np.array_equal(A, [[2, 1], [-1, 3]]), "Those are the images written as ROWS. They must be the columns: A = [[2, -1], [1, 3]]"
assert np.allclose(A @ [1, 0], [2, 1]) and np.allclose(A @ [0, 1], [-1, 3]), "A @ [1, 0] should be [2, 1] and A @ [0, 1] should be [-1, 3]"
assert np.allclose(image, [6, 10]), f"image should be 4*[2, 1] + 2*[-1, 3] = [6, 10], got {image}"
"SUCCESS: columns are basis images, so A @ [4, 2] = 4·[2, 1] + 2·[-1, 3] = [6, 10]."`,
          hint: 'A = np.column_stack([[2, 1], [-1, 3]])',
          solution: 'import numpy as np\nA = np.column_stack([[2, 1], [-1, 3]])\nimage = A @ np.array([4, 2])',
          misconceptions: [{ code: 'import numpy as np\nA = np.array([[2, 1], [-1, 3]])\nimage = A @ np.array([4, 2])', feedback: 'They must be the columns' }],
        }),
        exercise(13, 3, 'Challenge 3 — Shear and stretch', 'hard', {
          prompt: 'H = [[1, 1], [0, 1]] is a shear and S = [[2, 0], [0, 1]] stretches x. Store shear_then_stretch (the matrix for H first, then S), stretch_then_shear, and same_order (whether they are equal). Then store det_H, det_HS (the determinant of shear_then_stretch) and predict det_mirror for [[0, 1], [1, 0]].',
          instructions: 'Remember that "first X, then Y" is Y @ X. For the determinant of a product, compare det_HS with det(S) × det(H).',
          code: 'import numpy as np\nH = np.array([[1, 1], [0, 1]])\nS = np.array([[2, 0], [0, 1]])\nshear_then_stretch = None\nstretch_then_shear = None\nsame_order = None\ndet_H = None\ndet_HS = None\ndet_mirror = None',
          testCode: `import numpy as np
H = np.array([[1, 1], [0, 1]]); S = np.array([[2, 0], [0, 1]])
assert shear_then_stretch is not None and not np.array_equal(shear_then_stretch, H @ S), "H @ S applies S first. 'Shear first, then stretch' is S @ H"
assert np.array_equal(shear_then_stretch, S @ H), f"shear_then_stretch should be S @ H = {(S @ H).tolist()}"
assert np.array_equal(stretch_then_shear, H @ S), f"stretch_then_shear should be H @ S = {(H @ S).tolist()}"
assert same_order is False, "S @ H and H @ S differ, so the order matters"
assert round(float(det_H), 6) == 1.0, "A shear keeps areas: det(H) = 1*1 - 1*0 = 1"
assert round(float(det_HS), 6) == 2.0, "det(S @ H) = det(S) * det(H) = 2 * 1 = 2: the stretch doubles areas and the shear keeps them"
assert round(float(det_mirror), 6) == -1.0, "Swapping x and y mirrors the plane: det = 0*0 - 1*1 = -1"
"SUCCESS: the two orders give different matrices, but both double areas; the mirror keeps areas and flips orientation."`,
          hint: 'shear_then_stretch = S @ H; stretch_then_shear = H @ S; det_HS = np.linalg.det(S @ H)',
          solution: 'import numpy as np\nH = np.array([[1, 1], [0, 1]])\nS = np.array([[2, 0], [0, 1]])\nshear_then_stretch = S @ H\nstretch_then_shear = H @ S\nsame_order = bool(np.array_equal(shear_then_stretch, stretch_then_shear))\ndet_H = np.linalg.det(H)\ndet_HS = np.linalg.det(shear_then_stretch)\ndet_mirror = -1',
          misconceptions: [{ code: 'import numpy as np\nH = np.array([[1, 1], [0, 1]])\nS = np.array([[2, 0], [0, 1]])\nshear_then_stretch = H @ S\nstretch_then_shear = S @ H\nsame_order = False\ndet_H, det_HS, det_mirror = 1, 2, -1', feedback: "'Shear first, then stretch' is S @ H" }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'The columns of a matrix are where î and ĵ land: for [[a, b], [c, d]], î → [a, c] and ĵ → [b, d].',
    'A @ v = v[0]·column 0 + v[1]·column 1 (column view) = each row dotted with v (row view).',
    'A @ B means "B first, then A"; order usually matters, and commuting pairs are special cases.',
    '|det| is the area factor; a negative det flips orientation; det = 0 squashes the plane and cannot be undone.',
    'det(A @ B) = det(A) × det(B).',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'A = [[2, 0], [0, 3]] applied to [1, 1] gives what?',
      options: ['[3, 3]', '[2, 3] — x scaled by 2, y by 3', '[1, 1]'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'Why does det(A) = 0 mean A cannot be undone?',
      options: [
        'The inverse formula has a typo',
        'The plane is squashed onto a line or point, so different inputs land on the same output and the original cannot be recovered',
        'All entries of A are zero',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Why is A @ B usually different from B @ A?',
      options: [
        'NumPy computes them differently by accident',
        'A @ B applies B first, B @ A applies A first, and doing transformations in a different order usually gives a different result',
        'Matrix multiplication always commutes',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'For M = [[a, b], [c, d]], which vector is the image of î?',
      options: ['[a, b] — the first row', '[a, c] — the first column', '[a, d] — the diagonal'],
      correct: 1,
    },
  ],
}
