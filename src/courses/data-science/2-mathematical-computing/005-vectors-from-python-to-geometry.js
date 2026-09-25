import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'b-05', slug: 'vectors-from-python-to-geometry', track: 'B', order: 5,
  title: 'Vectors: From Python to Geometry', subtitle: 'Arrays as Arrows',
  tags: ['vector', 'numpy', 'magnitude', 'unit-vector', 'geometry'],
  prereqs: ['b-01', 'b-04'], unlocks: ['b-06', 'b-07'],
  hook: {
    question: 'What is a vector, really — and when does the arrow picture stop making sense?',
    realWorldContext: 'A list of numbers can describe a movement on a map, or a customer (age, visits, spending). The same arithmetic — adding, scaling, measuring length — applies to both. But lengths and directions only mean something physical when all the numbers share a unit, which is why data scientists rescale features before measuring distances.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Move between a vector\'s numbers and its arrow. Add, scale and measure vectors, and turn a vector into a direction of length 1 — safely, even for the zero vector. Explain why distances between *feature* vectors depend on the units you chose.',
        '**One example throughout.** You walk 3 blocks east and 4 blocks north. That movement is the vector **v = [3, 4]**. Its numbers are its **components**; drawn from the origin, it is an arrow to the point (3, 4).',
        '| View | v |\n|---|---|\n| arrow | from (0, 0) to (3, 4) |\n| components | 3 east, 4 north |\n| NumPy | `np.array([3.0, 4.0])` |',
        'The arrow\'s length is the **magnitude** (or norm), written ‖v‖. By Pythagoras, ‖v‖ = √(3² + 4²) = √25 = **5 blocks** in a straight line. In NumPy: `np.linalg.norm(v)`. The same formula works in any number of dimensions: square every component, add, take the square root.',
      ),
      check(
        'What is the magnitude of [6, 8]?',
        ['14', '10', '48'],
        1,
        '√(6² + 8²) = √(36 + 64) = √100 = 10. It is [3, 4] scaled by 2, so its length doubles too.',
      ),
      notebook('A vector as numbers and as an arrow', [
        demo(1, 'Stage 1 — The walk', [
          'The same vector printed as numbers and drawn as an arrow.',
        ], 'Run. Then change v to [6, 8] and check the magnitude against the question above.', 'import numpy as np\nfrom opencalc import Figure\nv = np.array([3.0, 4.0])\nprint("components:", v, " magnitude:", np.linalg.norm(v))\n\nfig = Figure(square=True, xmin=-1, xmax=7, ymin=-1, ymax=7)\nfig.grid().axes()\nfig.xlabel("east (blocks)").ylabel("north (blocks)")\nfig.vector(v.tolist(), color="blue", label="v = [3, 4]")\nfig.show()', { expectOutput: ['components: [3. 4.]  magnitude: 5.0'] }),
      ]),
      prose(
        '**Adding and scaling.** Two walks one after the other: first v = [3, 4], then w = [2, −1]. Geometrically, put w\'s tail at v\'s tip (tip to tail); the total trip goes from the start to the final tip. Algebraically, add component by component: v + w = [5, 3]. Both views give the same answer.',
        '**Scalar multiplication** multiplies every component by one number: 2v = [6, 8] is the same direction, twice as long; −1·v = [−3, −4] points the opposite way; 0.5v is half as long.',
        '**Displacement.** The vector from point A to point B is B − A: "where you end, minus where you start". From A = (1, 2) to B = (4, 6) it is [3, 4] — our walk again.',
      ),
      notebook('Adding and scaling', [
        demo(2, 'Stage 2 — Tip to tail', [
          'The amber arrow is w drawn starting at v\'s tip; the green arrow is the total, v + w.',
        ], 'Run. Then add a third walk u = [-4, 0] and draw v + w + u.', 'import numpy as np\nfrom opencalc import Figure\nv = np.array([3.0, 4.0])\nw = np.array([2.0, -1.0])\nprint("v + w =", v + w)\n\nfig = Figure(square=True, xmin=-1, xmax=7, ymin=-1, ymax=6)\nfig.grid().axes()\nfig.vector(v.tolist(), color="blue", label="v")\nfig.arrow(v.tolist(), (v + w).tolist(), color="amber", label="w")\nfig.vector((v + w).tolist(), color="green", label="v + w")\nfig.show()', { expectOutput: ['v + w = [5. 3.]'] }),
        demo(3, 'Stage 3 — Scaling and displacement', [
          'Scaling by 2, by −1 and by 0.5, then the displacement from A to B.',
        ], 'Predict each result before running.', 'import numpy as np\nv = np.array([3.0, 4.0])\nfor s in [2, -1, 0.5]:\n    print(s, s * v, np.linalg.norm(s * v))\nA, B = np.array([1.0, 2.0]), np.array([4.0, 6.0])\nprint("B - A =", B - A)', { expectOutput: ['2 [6. 8.] 10.0', '-1 [-3. -4.] 5.0', '0.5 [1.5 2. ] 2.5', 'B - A = [3. 4.]'] }),
      ]),
      prose(
        '**Direction only: unit vectors.** Dividing a vector by its own magnitude gives a **unit vector** — same direction, length exactly 1: v / ‖v‖ = [3, 4] / 5 = [0.6, 0.8]. Unit vectors let you compare directions while ignoring length, which later lessons use for similarity.',
        '**The zero vector has no direction.** [0, 0] has magnitude 0, so v / ‖v‖ divides 0 by 0 and NumPy produces [nan, nan] (with a warning). Any code that normalises vectors must decide what to do with a zero vector — usually return it unchanged, or report that it cannot be normalised.',
      ),
      check(
        'What does `v / np.linalg.norm(v)` give for v = [0, 0]?',
        ['[0, 0]', '[nan, nan] — 0 divided by 0 is undefined', '[1, 1]'],
        1,
        'A zero-length vector points nowhere, so it has no unit vector. Guard against it explicitly.',
      ),
      notebook('Unit vectors', [
        demo(4, 'Stage 4 — Normalising, and the zero vector', [
          'The unit vector of the walk, then what happens to the zero vector with and without a guard.',
        ], 'Run. Then write a function unit(v) with the guard built in.', 'import numpy as np, warnings\nv = np.array([3.0, 4.0])\nu = v / np.linalg.norm(v)\nprint(u, np.linalg.norm(u))\n\nzero = np.array([0.0, 0.0])\nwith warnings.catch_warnings():\n    warnings.simplefilter("ignore")\n    print("unguarded:", zero / np.linalg.norm(zero))\nn = np.linalg.norm(zero)\nprint("guarded:", zero if n == 0 else zero / n)', { expectOutput: ['[0.6 0.8] 1.0', 'unguarded: [nan nan]', 'guarded: [0. 0.]'] }),
      ]),
      prose(
        '**When coordinates are features.** In data science a vector often describes a *thing*, not a movement: a customer might be [age in years, visits per month, annual spend in pounds]. The arithmetic still works, and "distance between two customers" is a useful idea — but the geometry is now an analogy, and it depends on units. Spend differences of hundreds of pounds swamp age differences of a few years, only because pounds happen to produce bigger numbers. Measure spend in thousands of pounds and a different customer becomes "nearest".',
        '| | Walk vector [east, north] | Customer vector [age, visits, spend] |\n|---|---|---|\n| components share a unit? | yes — blocks | no — years, visits, pounds |\n| magnitude means | real straight-line distance | nothing physical |\n| distance between two vectors | real distance | depends on how each feature is scaled |',
        'The usual fix is to put features on comparable scales first, for example by dividing each feature by its standard deviation (Lesson C.04).',
      ),
      notebook('Feature vectors', [
        demo(5, 'Stage 5 — Units change which customer is nearest', [
          'Customer A is compared with B and C, first with spend in pounds, then with spend in thousands of pounds. Nothing about the customers changed — only a unit.',
        ], 'Predict which customer is nearest to A in each case, then run.', 'import numpy as np\nA = np.array([30, 4, 1200.0])   # age, visits/month, spend (pounds)\nB = np.array([31, 4, 2500.0])\nC = np.array([55, 12, 1250.0])\nprint("pounds:   A-B", round(np.linalg.norm(A - B), 1), " A-C", round(np.linalg.norm(A - C), 1))\nk = np.array([1, 1, 1 / 1000])  # spend in thousands\nprint("thousands: A-B", round(np.linalg.norm((A - B) * k), 2), " A-C", round(np.linalg.norm((A - C) * k), 2))', { expectOutput: ['pounds:   A-B 1300.0  A-C 56.5', 'thousands: A-B 1.64  A-C 26.25'] }),
      ]),
      prose('**Practice.** Challenge 1 is a displacement and a direction. Challenge 2 makes normalisation safe. Challenge 3 is a fresh problem about feature vectors and scaling.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Direction from A to B', 'medium', {
          prompt: 'Find displacement, the vector from A = (1, 2) to B = (4, 6), and direction, the unit vector pointing from A towards B.',
          instructions: '"Where you end minus where you start." Then divide by the magnitude.',
          code: 'import numpy as np\nA = np.array([1.0, 2.0])\nB = np.array([4.0, 6.0])\ndisplacement = None\ndirection = None',
          testCode: `import numpy as np
assert displacement is not None and not np.allclose(displacement, [-3, -4]), "A - B points from B back to A. The displacement from A to B is B - A"
assert np.allclose(displacement, [3, 4]), f"displacement should be [3, 4], got {displacement}"
assert np.allclose(direction, [0.6, 0.8]), f"direction should be displacement / its magnitude = [0.6, 0.8], got {direction}"
"SUCCESS: B - A = [3, 4], length 5, direction [0.6, 0.8]."`,
          hint: 'displacement = B - A; direction = displacement / np.linalg.norm(displacement)',
          solution: 'import numpy as np\nA = np.array([1.0, 2.0])\nB = np.array([4.0, 6.0])\ndisplacement = B - A\ndirection = displacement / np.linalg.norm(displacement)',
          misconceptions: [{ code: 'import numpy as np\ndisplacement = np.array([1.0, 2.0]) - np.array([4.0, 6.0])\ndirection = displacement / 5', feedback: 'The displacement from A to B is B - A' }],
        }),
        exercise(12, 2, 'Challenge 2 — Safe normalisation', 'medium', {
          prompt: 'Write unit(v) returning v divided by its magnitude, but returning v unchanged (all zeros) when v is the zero vector.',
          instructions: 'Compute the magnitude once, check it, then divide.',
          code: 'import numpy as np\ndef unit(v):\n    return v / np.linalg.norm(v)',
          testCode: `import numpy as np, warnings
assert np.allclose(unit(np.array([3.0, 4.0])), [0.6, 0.8]), "unit([3, 4]) should be [0.6, 0.8]"
assert np.isclose(np.linalg.norm(unit(np.array([1.0, 2.0, 2.0]))), 1), "The result should have length 1 in any dimension"
with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    z = unit(np.array([0.0, 0.0]))
assert not np.isnan(z).any(), "The zero vector gives nan (0 / 0). Return it unchanged when its magnitude is 0"
assert np.array_equal(z, [0.0, 0.0]), f"unit of the zero vector should be [0, 0], got {z}"
"SUCCESS: unit vectors have length 1, and the zero vector is handled explicitly."`,
          hint: 'n = np.linalg.norm(v)\nif n == 0:\n    return v\nreturn v / n',
          solution: 'import numpy as np\ndef unit(v):\n    n = np.linalg.norm(v)\n    if n == 0:\n        return v\n    return v / n',
          misconceptions: [{ code: 'import numpy as np\ndef unit(v):\n    return v / np.linalg.norm(v)', feedback: 'Return it unchanged when its magnitude is 0' }],
        }),
        exercise(13, 3, 'Challenge 3 — Nearest customer, raw and scaled', 'hard', {
          prompt: 'Find which of B or C is nearest to customer A, first using raw feature values (nearest_raw) and then after dividing each feature by its typical spread in scales (nearest_scaled). Then set units_matter to True if the two answers differ.',
          prose: ['Features: [age (years), visits per month, annual spend (pounds)]. The typical spreads of each feature in the customer base are in scales.'],
          instructions: 'Distance = `np.linalg.norm(first - second)`. For the scaled version, divide the difference by scales before taking the norm.',
          code: 'import numpy as np\nA = np.array([30, 4, 1200.0])\nB = np.array([31, 4, 2500.0])\nC = np.array([55, 12, 1250.0])\nscales = np.array([10, 3, 600.0])\nnearest_raw = None\nnearest_scaled = None\nunits_matter = None',
          testCode: `assert nearest_raw == "C", "With raw values the 1300-pound spend gap makes B look far away, so C is nearest"
assert nearest_scaled != "C", "After dividing by scales, check again: C differs by 2.5 spreads in age and 2.7 in visits"
assert nearest_scaled == "B", "Scaled, B differs only in spend (about 2.2 spreads), so B is nearest"
assert units_matter is True, "The nearest customer changed when only the units changed, so units matter"
"SUCCESS: C is nearest in raw units, B once features are comparable — distances between feature vectors depend on scaling."`,
          hint: 'd_raw_B = np.linalg.norm(A - B); d_scaled_B = np.linalg.norm((A - B) / scales); compare, then set the names.',
          solution: 'import numpy as np\nA = np.array([30, 4, 1200.0])\nB = np.array([31, 4, 2500.0])\nC = np.array([55, 12, 1250.0])\nscales = np.array([10, 3, 600.0])\nnearest_raw = "B" if np.linalg.norm(A - B) < np.linalg.norm(A - C) else "C"\nnearest_scaled = "B" if np.linalg.norm((A - B) / scales) < np.linalg.norm((A - C) / scales) else "C"\nunits_matter = nearest_raw != nearest_scaled',
          misconceptions: [{ code: 'nearest_raw = "C"\nnearest_scaled = "C"\nunits_matter = False', feedback: 'check again' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'A vector is a list of components and an arrow — two views of one object.',
    'Magnitude ‖v‖ = √(sum of squared components); B − A is the displacement from A to B.',
    'Adding vectors is component-wise (tip to tail); scaling multiplies every component.',
    'A unit vector v/‖v‖ keeps only direction; the zero vector has none — guard against 0/0.',
    'For feature vectors, lengths and distances depend on units — rescale features before comparing.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'v = np.array([3, 4]). What is np.linalg.norm(v)?',
      options: ['7', '5 — √(3² + 4²)', '3.5'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'What is the unit vector of [0, 5]?',
      options: ['[0, 5]', '[0, 1]', '[1, 1]'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Customer vectors are [age in years, income in pounds]. Why is the raw distance between two customers misleading?',
      options: [
        'Distances cannot be computed for customers',
        'Income differences are thousands of times larger numbers than age differences, so income alone decides the distance; the features need comparable scales first',
        'Age should be measured in months',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'np.array([1, 2, 3]) + np.array([4, 5, 6]) gives what?',
      options: ['[5, 7, 9] — component-wise, like placing arrows tip to tail', '[4, 10, 18]', '[1, 2, 3, 4, 5, 6]'],
      correct: 0,
    },
  ],
}
