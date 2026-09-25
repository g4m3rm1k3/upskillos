import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'b-08', slug: 'solving-linear-systems', track: 'B', order: 8,
  title: 'Solving Linear Systems', subtitle: '"Which input maps to this output?"',
  tags: ['linear-system', 'numpy', 'least-squares', 'geometry', 'inverse'],
  prereqs: ['b-07'], unlocks: ['b-09', 'c-02', 'd-02'],
  hook: {
    question: 'How do you find the input that produces a given output?',
    realWorldContext: 'Several unknown prices, several receipts: a small linear system. Fitting a line through many noisy points: a large one with no exact answer. Knowing when a system has one solution, none or infinitely many — and what the computer returns in each case — is what separates a trustworthy answer from a confident-looking wrong one.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Solve a two-equation system by hand and with NumPy, and check the answer by substituting it back. Recognise systems with no solution or infinitely many. Explain what `np.linalg.solve` and `np.linalg.lstsq` each answer, and when a nearly-singular system makes any answer fragile.',
        '**The smallest example.** Two equations, two unknowns:',
        '```text\n2x +  y = 8\n x + 3y = 7\n```',
        'By hand: the first equation gives y = 8 − 2x. Substitute into the second: x + 3(8 − 2x) = 7, so x + 24 − 6x = 7, so −5x = −17 and **x = 3.4**. Then y = 8 − 2(3.4) = **1.2**.',
        '**Always check by substituting back**: 2(3.4) + 1.2 = 8 ✓ and 3.4 + 3(1.2) = 7 ✓.',
        'In matrix form this is **A x = b**: each *row* of A holds one equation\'s coefficients, x = [x, y] holds the unknowns, and b the right-hand sides. It asks: which input x does the transformation A send to b (Lesson B.07)?',
        '```text\nA = [[2, 1],    x = [x, y]    b = [8, 7]\n     [1, 3]]\n```',
      ),
      check(
        'Someone claims the solution is x = 3, y = 2. Is it?',
        ['Yes', 'No — it satisfies the first equation but gives 3 + 6 = 9 in the second, not 7'],
        1,
        'A claimed solution must satisfy every equation. Substituting back is the quickest way to catch a wrong one.',
      ),
      notebook('Solving and checking', [
        demo(1, 'Stage 1 — solve, then check the residual', [
          'The **residual** A @ x − b measures how far the answer is from satisfying the equations. For an exact solution it is zero, up to rounding.',
        ], 'Run and compare with the hand solution. Then change b to [9, 7] and predict whether x or y changes more.', 'import numpy as np\nA = np.array([[2.0, 1.0], [1.0, 3.0]])\nb = np.array([8.0, 7.0])\nx = np.linalg.solve(A, b)\nprint("x =", x)\nprint("residual A @ x - b =", A @ x - b)', { expectOutput: ['x = [3.4 1.2]', 'residual A @ x - b = [0. 0.]'] }),
        demo(2, 'Stage 2 — Two lines, one crossing point', [
          'Each equation is a line in the (x, y) plane: every point on it satisfies that equation. The solution satisfies both, so it is where the lines cross.',
        ], 'Run. Then change the second equation to x + 3y = 10 and watch the crossing point move.', 'from opencalc import Figure\nimport numpy as np\nA = np.array([[2.0, 1.0], [1.0, 3.0]])\nb = np.array([8.0, 7.0])\nsol = np.linalg.solve(A, b)\nfig = Figure(xmin=-1, xmax=6, ymin=-1, ymax=9)\nfig.grid().axes()\nfig.plot(lambda x: b[0] - A[0, 0] * x, color="blue", label="2x + y = 8")\nfig.plot(lambda x: (b[1] - A[1, 0] * x) / A[1, 1], color="green", label="x + 3y = 7")\nfig.point(sol.tolist(), color="amber", label="(3.4, 1.2)")\nfig.show()'),
      ]),
      prose(
        '**One solution, none, or infinitely many.** Two lines in a plane can cross once, never (parallel), or everywhere (the same line).',
        '| System | Lines | Solutions | det(A) |\n|---|---|---|---|\n| 2x + y = 8, x + 3y = 7 | cross | exactly one | 5 |\n| x + 2y = 3, 2x + 4y = 7 | parallel | **none** | 0 |\n| x + 2y = 3, 2x + 4y = 6 | the same line | **infinitely many** | 0 |',
        'The second equation\'s left side is twice the first\'s in both singular cases, so det(A) = 0 either way: the determinant alone cannot tell "none" from "infinitely many". Comparing **ranks** can: the rank of A is how many independent equations its rows really give. If adding b as an extra column raises the rank, the equations contradict each other (none); if not, there are fewer independent equations than unknowns (infinitely many).',
      ),
      notebook('Singular systems', [
        demo(3, 'Stage 3 — Do not wait for an error; check the rank', [
          'When det(A) = 0 there is no unique answer for `solve` to return. What happens next depends on how NumPy was built: on most computers `solve` raises LinAlgError, but in this browser it quietly returns `[nan nan]`. Either way, the safe habit is to check first — the ranks tell you which singular case you have.',
        ], 'Run and read each line: what did solve do here? Then invent a third right-hand side and predict which case it is.', 'import numpy as np\nA = np.array([[1.0, 2.0], [2.0, 4.0]])\nprint("det(A) =", np.linalg.det(A))\nfor b in [np.array([3.0, 7.0]), np.array([3.0, 6.0])]:\n    try:\n        print("solve returned", np.linalg.solve(A, b))\n    except np.linalg.LinAlgError as e:\n        print("solve raised:", e)\n    rank_A = np.linalg.matrix_rank(A)\n    rank_Ab = np.linalg.matrix_rank(np.column_stack([A, b]))\n    print("b =", b, "rank(A) =", rank_A, "rank([A|b]) =", rank_Ab, "->", "none" if rank_Ab > rank_A else "infinitely many")', { expectOutput: ['det(A) = 0.0', 'rank(A) = 1 rank([A|b]) = 2 -> none', 'rank(A) = 1 rank([A|b]) = 1 -> infinitely many'] }),
      ]),
      prose(
        '**Nearly singular systems are fragile.** When two lines are *almost* parallel, their crossing point moves a long way if either line shifts slightly. Then a tiny change in b — a rounding error, a measurement error — produces a huge change in x. The **condition number** `np.linalg.cond(A)` measures this sensitivity: near 1 is robust; very large means small input errors can be hugely amplified.',
        '| b | solution x |\n|---|---|\n| [2, 2.0001] | [1, 1] |\n| [2, 2.0002] (changed by 0.0001) | [0, 2] |',
      ),
      check(
        'A system has condition number 10,000,000. What should you conclude?',
        ['The answer is exact', 'Small errors in the data can change the answer enormously, so treat it with caution', 'The system has no solution'],
        1,
        'A huge condition number means the equations are nearly dependent. The solver still returns numbers, but they are only as reliable as the data are precise.',
      ),
      notebook('Conditioning', [
        demo(4, 'Stage 4 — A tiny change, a big effect', [
          'Two almost-parallel lines. Changing the fourth decimal place of b moves the solution from [1, 1] to [0, 2].',
        ], 'Run. Compare the condition number with Stage 1\'s A (about 2.6).', 'import numpy as np\nA = np.array([[1.0, 1.0], [1.0, 1.0001]])\nfor b in [np.array([2.0, 2.0001]), np.array([2.0, 2.0002])]:\n    print(b, np.round(np.linalg.solve(A, b), 6))\nprint("condition number:", round(np.linalg.cond(A)))', { expectOutput: ['[2.     2.0001] [1. 1.]', '[2.     2.0002] [0. 2.]', 'condition number: 40002'] }),
      ]),
      prose(
        '**More equations than unknowns.** Measurements give many equations but only a few unknowns — for example, fitting a line (2 unknowns: intercept and slope) through 5 noisy points (5 equations). Usually no x satisfies them all. `np.linalg.lstsq(A, b)` answers a different question: which x makes **‖A x − b‖²**, the sum of squared residuals, as small as possible? That is exactly least squares (Lesson B.03).',
        '| | `np.linalg.solve(A, b)` | `np.linalg.lstsq(A, b)` |\n|---|---|---|\n| answers | the exact x with A x = b | the x minimising ‖A x − b‖² |\n| A must be | square and invertible | any shape |\n| A not square | raises LinAlgError | works |\n| A square but singular | raises LinAlgError or returns nan, depending on the build — check first | returns one of the best answers and reports rank < number of unknowns |\n| no exact answer exists | — | returns the best compromise; residuals are not zero |\n| also reports | — | the rank of A, so you can spot dependent columns |',
      ),
      notebook('Least squares', [
        demo(5, 'Stage 5 — Overdetermined: the best compromise', [
          'Three equations in two unknowns: find c and m with c + m·t ≈ y at t = 1, 2, 3. The residuals are small but not zero — no line passes through all three points.',
        ], 'Run. Then call np.linalg.solve(A, b) with this A and read the error.', 'import numpy as np\nA = np.array([[1.0, 1.0], [1.0, 2.0], [1.0, 3.0]])   # columns: 1, t\nb = np.array([2.1, 3.9, 6.2])\nx, ssr, rank, sv = np.linalg.lstsq(A, b, rcond=None)\nprint("c, m =", np.round(x, 4), " rank =", rank)\nprint("residuals =", np.round(b - A @ x, 4), " SSR =", np.round(ssr, 4))', { expectOutput: ['c, m = [-0.0333  2.05  ]  rank = 2', 'residuals = [ 0.0833 -0.1667  0.0833]'] }),
      ]),
      prose('**Practice.** Challenge 1 turns a word problem into a system. Challenge 2 classifies systems. Challenge 3 is a fresh problem about choosing between solve and lstsq.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Prices from two receipts', 'medium', {
          prompt: 'Receipt 1: 3 apples and 2 oranges cost 7.50. Receipt 2: 1 apple and 4 oranges cost 6.50. Set up A and b, solve for apple_price and orange_price, and store the residual A @ x - b in residual.',
          instructions: 'Each ROW of A is one receipt: [number of apples, number of oranges]. b holds the totals.',
          code: 'import numpy as np\nA = np.array([[3.0, 1.0], [2.0, 4.0]])\nb = np.array([7.50, 6.50])\nx = np.linalg.solve(A, b)\napple_price, orange_price = x\nresidual = None',
          testCode: `import numpy as np
assert not np.isclose(apple_price, 2.35), "Each ROW of A must be one receipt: [[3, 2], [1, 4]]. The starter put receipts in columns"
assert np.isclose(apple_price, 1.7) and np.isclose(orange_price, 1.2), f"Expected apples 1.70 and oranges 1.20, got {apple_price:.2f} and {orange_price:.2f}"
assert residual is not None and np.allclose(residual, 0), "Check the answer: residual = A @ x - b should be [0, 0]"
"SUCCESS: apples 1.70, oranges 1.20; 3(1.70) + 2(1.20) = 7.50 and 1.70 + 4(1.20) = 6.50."`,
          hint: 'A = np.array([[3.0, 2.0], [1.0, 4.0]]); residual = A @ x - b',
          solution: 'import numpy as np\nA = np.array([[3.0, 2.0], [1.0, 4.0]])\nb = np.array([7.50, 6.50])\nx = np.linalg.solve(A, b)\napple_price, orange_price = x\nresidual = A @ x - b',
          misconceptions: [{ code: 'import numpy as np\nA = np.array([[3.0, 1.0], [2.0, 4.0]])\nb = np.array([7.50, 6.50])\nx = np.linalg.solve(A, b)\napple_price, orange_price = x\nresidual = A @ x - b', feedback: 'Each ROW of A must be one receipt' }],
        }),
        exercise(12, 2, 'Challenge 2 — One, none or infinitely many', 'medium', {
          prompt: 'Write classify(A, b) returning "unique", "none" or "infinite" for a square system, using ranks.',
          instructions: 'Full rank (rank equals the number of unknowns) means unique. Otherwise compare rank(A) with rank of A with b added as a column.',
          code: 'import numpy as np\n\ndef classify(A, b):\n    if abs(np.linalg.det(A)) > 1e-12:\n        return "unique"\n    return "none"',
          testCode: `import numpy as np
A1 = np.array([[2.0, 1.0], [1.0, 3.0]]); S = np.array([[1.0, 2.0], [2.0, 4.0]])
assert classify(A1, np.array([8.0, 7.0])) == "unique", "An invertible A has exactly one solution"
assert classify(S, np.array([3.0, 7.0])) == "none", "Parallel lines: rank([A|b]) > rank(A) means the equations contradict"
assert classify(S, np.array([3.0, 6.0])) == "infinite", "det = 0 does not always mean no solution: when rank([A|b]) equals rank(A), the equations agree and there are infinitely many solutions"
"SUCCESS: det tells singular from not; ranks tell 'none' from 'infinitely many'."`,
          hint: 'r_A = np.linalg.matrix_rank(A); r_Ab = np.linalg.matrix_rank(np.column_stack([A, b])). unique if r_A == A.shape[1]; none if r_Ab > r_A; else infinite.',
          solution: 'import numpy as np\n\ndef classify(A, b):\n    r_A = np.linalg.matrix_rank(A)\n    r_Ab = np.linalg.matrix_rank(np.column_stack([A, b]))\n    if r_A == A.shape[1]:\n        return "unique"\n    return "none" if r_Ab > r_A else "infinite"',
          misconceptions: [{ code: 'import numpy as np\ndef classify(A, b):\n    return "unique" if abs(np.linalg.det(A)) > 1e-12 else "none"', feedback: 'det = 0 does not always mean no solution' }],
        }),
        exercise(13, 3, 'Challenge 3 — Calibrating a sensor', 'hard', {
          prompt: 'A sensor was read at four known temperatures. Find the calibration reading ≈ offset + gain × true as the least squares fit, storing offset and gain. Then record solve_works (whether np.linalg.solve can be used on this A) and max_abs_residual.',
          prose: ['Four equations (one per measurement), two unknowns (offset, gain). The design matrix A has a column of ones for the offset and a column of true temperatures for the gain.'],
          instructions: 'Build A with `np.column_stack([np.ones(4), true_temp])`. Try `np.linalg.solve(A, reading)` first and read the error; then use `np.linalg.lstsq`.',
          code: 'import numpy as np\ntrue_temp = np.array([0.0, 20.0, 50.0, 100.0])\nreading = np.array([1.2, 21.5, 52.1, 103.4])\noffset = None\ngain = None\nsolve_works = None\nmax_abs_residual = None',
          testCode: `import numpy as np
A = np.column_stack([np.ones(4), true_temp])
(c, m), *_ = np.linalg.lstsq(A, reading, rcond=None)
assert offset is not None and np.isclose(offset, c) and np.isclose(gain, m), f"offset and gain should be the least squares fit, about {c:.3f} and {m:.4f}"
assert solve_works is False, "np.linalg.solve needs a square, invertible A; this A is 4 x 2, so solve raises an error"
res = reading - (offset + gain * true_temp)
assert max_abs_residual is not None and np.isclose(max_abs_residual, np.abs(res).max()), f"max_abs_residual should be the largest |reading - fitted value|, about {np.abs(res).max():.3f}"
"SUCCESS: no line fits all four points exactly, so lstsq returns the best compromise; its residuals show how good that is."`,
          hint: 'A = np.column_stack([np.ones(4), true_temp]); (offset, gain), *_ = np.linalg.lstsq(A, reading, rcond=None)',
          solution: 'import numpy as np\ntrue_temp = np.array([0.0, 20.0, 50.0, 100.0])\nreading = np.array([1.2, 21.5, 52.1, 103.4])\nA = np.column_stack([np.ones(4), true_temp])\n(offset, gain), *_ = np.linalg.lstsq(A, reading, rcond=None)\ntry:\n    np.linalg.solve(A, reading)\n    solve_works = True\nexcept np.linalg.LinAlgError:\n    solve_works = False\nmax_abs_residual = np.abs(reading - (offset + gain * true_temp)).max()',
          misconceptions: [{ code: 'import numpy as np\ntrue_temp = np.array([0.0, 20.0, 50.0, 100.0])\nreading = np.array([1.2, 21.5, 52.1, 103.4])\nA = np.column_stack([np.ones(4), true_temp])\n(offset, gain), *_ = np.linalg.lstsq(A, reading, rcond=None)\nsolve_works = True\nmax_abs_residual = 0.0', feedback: 'this A is 4 x 2' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'A x = b: each row of A is one equation; the solution is the input x that A sends to b.',
    'Always check a solution with the residual A @ x − b.',
    'det(A) = 0 means no unique solution; compare rank(A) with rank([A | b]) to tell "none" from "infinitely many".',
    'A huge condition number means small data errors can change the answer enormously.',
    'solve finds the exact x for square invertible A; lstsq finds the x with the smallest sum of squared residuals for any shape.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'In 2D, when does a system of two equations have exactly one solution?',
      options: [
        'When both lines pass through the origin',
        'When the two lines cross at one point — they are not parallel, so det(A) ≠ 0',
        'When A is symmetric',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'You have 100 equations in 2 unknowns. What should you use?',
      options: [
        'np.linalg.solve(A, b)',
        'np.linalg.lstsq(A, b) — it finds the x minimising the sum of squared residuals, since no exact solution usually exists',
        'Delete 98 equations',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Why prefer np.linalg.solve(A, b) to np.linalg.inv(A) @ b?',
      options: [
        'inv does not exist in NumPy',
        'solve works directly on the equations and is generally faster and less affected by rounding than forming the inverse first',
        'They give different answers for well-conditioned A',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'det(A) = 0 for a 2×2 system. Which statement is right?',
      options: [
        'There is no solution',
        'There is either no solution or infinitely many; comparing ranks tells which',
        'There are infinitely many solutions',
      ],
      correct: 1,
    },
  ],
}
