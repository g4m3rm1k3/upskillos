import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'b-06', slug: 'dot-product-and-similarity', track: 'B', order: 6,
  title: 'Dot Product and Similarity', subtitle: 'Measuring Alignment Between Vectors',
  tags: ['dot-product', 'cosine-similarity', 'projection', 'perpendicular', 'angle'],
  prereqs: ['b-05'], unlocks: ['b-07', 'd-03'],
  hook: {
    question: 'How do you turn two lists of numbers into one meaningful number?',
    realWorldContext: 'A shopping bill, a model\'s prediction and a search engine\'s relevance score are all the same operation: multiply matching entries and add them up. That operation, the dot product, is also how we measure whether two vectors point in similar directions.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Compute a dot product by hand and in NumPy, and say which vector holds the inputs, which the weights, and what the single number that comes out means. Use the dot product to measure angles and similarity, handling the zero vector safely.',
        '**The smallest example.** You buy 2 apples at £0.50, 1 loaf at £1.20 and 3 milks at £0.90. The bill matches each quantity with its price, multiplies, and adds:',
        '| item | quantity | price | quantity × price |\n|---|---|---|---|\n| apple | 2 | 0.50 | 1.00 |\n| bread | 1 | 1.20 | 1.20 |\n| milk | 3 | 0.90 | 2.70 |\n| **total** | | | **4.90** |',
        'With quantities q = [2, 1, 3] and prices p = [0.5, 1.2, 0.9], that is the **dot product** q · p = 2×0.5 + 1×1.2 + 3×0.9 = 4.9. Two vectors of the same length go in; **one number** (a *scalar*) comes out.',
        '**Inputs, weights, output.** The same shape of calculation makes a prediction. A house has inputs x = [size in m², bedrooms, age in years]; a model has weights w = [3000, 10000, −500]. The prediction w · x adds up each input times its weight. Each weight is in *output units per input unit* — £3000 per m², £10000 per bedroom, −£500 per year of age — and the result is one number in pounds.',
      ),
      check(
        'What is [1, 2, 3] · [4, 5, 6]?',
        ['[4, 10, 18]', '32', '21'],
        1,
        '1×4 + 2×5 + 3×6 = 4 + 10 + 18 = 32. The element-wise products [4, 10, 18] are only the first step; the dot product adds them.',
      ),
      notebook('Match, multiply, add', [
        demo(1, 'Stage 1 — Three ways to compute it', [
          'A loop that matches, multiplies and adds; then NumPy\'s `np.dot`; then the `@` operator. All three agree.',
        ], 'Run. Then add a fourth item to both vectors and predict the new total.', 'import numpy as np\nq = np.array([2, 1, 3])\np = np.array([0.5, 1.2, 0.9])\ntotal = 0.0\nfor qi, pi in zip(q, p):\n    total += qi * pi\nprint(round(total, 2), round(np.dot(q, p), 2), round(q @ p, 2))\nprint("element-wise products:", q * p)', { expectOutput: ['4.9 4.9 4.9', 'element-wise products: [1.  1.2 2.7]'] }),
        demo(2, 'Stage 2 — A prediction is a dot product', [
          'Inputs describe one house; weights come from a model. Printing each term shows how much each input contributes to the prediction.',
        ], 'Run and read each contribution. Which input lowers the price? Then add a fourth input without adding a fourth weight, and read the error.', 'import numpy as np\nx = np.array([80, 3, 20])            # size m2, bedrooms, age years\nw = np.array([3000, 10000, -500])    # pounds per unit of each input\nfor name, xi, wi in zip(["size", "bedrooms", "age"], x, w):\n    print(f"{name:9} {xi:4} x {wi:6} = {xi * wi:8}")\nprint("prediction:", x @ w, "pounds")', { expectOutput: ['size        80 x   3000 =   240000', 'age         20 x   -500 =   -10000', 'prediction: 260000 pounds'] }),
        demo(3, 'Stage 3 — Lengths must match', [
          'A dot product pairs entries by position, so both vectors must have the same length.',
        ], 'Run and read the error. It names both shapes.', 'import numpy as np\nnp.array([80, 3, 20, 1]) @ np.array([3000, 10000, -500])', { expectError: 'ValueError' }),
      ]),
      prose(
        '**What the dot product says geometrically.** For two arrows a and b with an angle θ between them, a · b = ‖a‖ × ‖b‖ × cos θ. The lengths scale the result; cos θ decides its sign:',
        '| angle between a and b | cos θ | a · b |\n|---|---|---|\n| 0° (same direction) | 1 | largest: ‖a‖‖b‖ |\n| under 90° | positive | positive |\n| 90° (perpendicular) | 0 | **0** |\n| over 90° | negative | negative |\n| 180° (opposite) | −1 | most negative |',
        'So a dot product of 0 means the vectors are **perpendicular** (also called *orthogonal*): neither has any component along the other.',
      ),
      notebook('Angles', [
        demo(4, 'Stage 4 — Recover the angle', [
          'Rearranging gives cos θ = a · b / (‖a‖‖b‖). `np.clip` keeps rounding errors from pushing it slightly outside [−1, 1] before `arccos`.',
        ], 'Predict the angle for each pair, then run. Then find a vector perpendicular to [2, 5].', 'import numpy as np\ndef angle(a, b):\n    c = a @ b / (np.linalg.norm(a) * np.linalg.norm(b))\n    return np.degrees(np.arccos(np.clip(c, -1, 1)))\nfor a, b in [([3, 0], [0, 4]), ([1, 1], [2, 2]), ([1, 0], [-1, 0]), ([1, 2], [-2, 1])]:\n    a, b = np.array(a, float), np.array(b, float)\n    print(a, b, "dot", a @ b, "angle", round(angle(a, b), 1))', { expectOutput: ['dot 0.0 angle 90.0', 'dot 4.0 angle 0.0', 'dot -1.0 angle 180.0'] }),
      ]),
      prose(
        '**Similarity ignores length.** Dividing the dot product by both lengths leaves only cos θ, the **cosine similarity**: 1 for the same direction, 0 for perpendicular, −1 for opposite. For word-count vectors of documents, a short and a long document about the same topic point in similar directions even though their lengths differ a lot — so cosine similarity compares topics, not document lengths.',
        '**Guard against the zero vector.** A zero vector (an empty document) has length 0, so the division is 0/0 and gives nan — and `np.argmax` then happily picks the nan. Decide explicitly what similarity to give it, usually 0.',
        '**Projection: how much of a lies along b.** The *scalar projection* a · b / ‖b‖ is the length of a\'s shadow on b\'s direction. With b = [1, 0] (the x-direction) it is just a\'s x component.',
      ),
      check(
        'What is the cosine similarity of [1, 1] and [3, 3]?',
        ['3', '1', '0.33'],
        1,
        'They point in exactly the same direction, so cos θ = 1. Cosine similarity ignores that one is three times longer.',
      ),
      notebook('Similarity and projection', [
        demo(5, 'Stage 5 — Cosine similarity of word counts', [
          'Each document is a vector of counts for the words [data, model, oven, flour]. `long_doc` is `short_doc` repeated three times: same topic, three times the length.',
        ], 'Predict each similarity, then run. Then compute the plain dot product for the same pairs: why is it misleading here?', 'import numpy as np\ndef cos_sim(a, b):\n    na, nb = np.linalg.norm(a), np.linalg.norm(b)\n    if na == 0 or nb == 0:\n        return 0.0\n    return float(a @ b / (na * nb))\nshort_doc = np.array([2, 1, 0, 0])\nlong_doc = np.array([6, 3, 0, 0])\nbaking = np.array([0, 0, 3, 2])\nempty = np.array([0, 0, 0, 0])\nprint(round(cos_sim(short_doc, long_doc), 6), cos_sim(short_doc, baking), cos_sim(short_doc, empty))', { expectOutput: ['1.0 0.0 0.0'] }),
        demo(6, 'Stage 6 — Projection', [
          'The scalar projection of a onto three directions.',
        ], 'Predict each value, then run. Why is the projection onto [0, 1] equal to a\'s second component?', 'import numpy as np\na = np.array([3.0, 4.0])\nfor b in [np.array([1.0, 0.0]), np.array([0.0, 1.0]), np.array([1.0, 1.0])]:\n    print(b, round(a @ b / np.linalg.norm(b), 4))', { expectOutput: ['[1. 0.] 3.0', '[0. 1.] 4.0', '[1. 1.] 4.9497'] }),
      ]),
      prose('**Practice.** Challenge 1 is a weighted total. Challenge 2 finds the most similar item, safely. Challenge 3 is a fresh problem that keeps inputs, weights and outputs apart.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — A weighted grade', 'easy', {
          prompt: 'A course grade weights coursework 0.3, midterm 0.2 and final exam 0.5. A student scored 80, 65 and 72. Store the final grade (one number) in grade using a dot product.',
          instructions: 'Put scores and weights in two arrays of the same length, then use `@` or `np.dot`.',
          code: 'import numpy as np\nscores = np.array([80, 65, 72])\nweights = np.array([0.3, 0.2, 0.5])\ngrade = scores * weights',
          testCode: `import numpy as np
assert np.ndim(grade) == 0, "grade is an array of products. A dot product is ONE number: multiply matching entries AND add them up (scores @ weights)"
assert abs(grade - 73.0) < 1e-9, f"grade should be 0.3*80 + 0.2*65 + 0.5*72 = 73.0, got {grade}"
"SUCCESS: 24 + 13 + 36 = 73.0."`,
          hint: 'grade = scores @ weights',
          solution: 'import numpy as np\nscores = np.array([80, 65, 72])\nweights = np.array([0.3, 0.2, 0.5])\ngrade = scores @ weights',
          misconceptions: [{ code: 'import numpy as np\ngrade = np.array([80, 65, 72]) * np.array([0.3, 0.2, 0.5])', feedback: 'A dot product is ONE number' }],
        }),
        exercise(12, 2, 'Challenge 2 — Most similar, safely', 'medium', {
          prompt: 'Find the index of the candidate most similar (highest cosine similarity) to the query. One candidate is an empty zero vector: give it similarity 0 rather than nan. Store the index in most_similar.',
          instructions: 'Write a cos_sim function with a zero-length guard, compute all similarities, then take the index of the largest.',
          code: 'import numpy as np\nquery = np.array([1.0, 0.5, 0.0, 1.0])\ncandidates = [np.array([0.0, 0.0, 0.0, 0.0]),\n              np.array([1.0, 0.6, 0.1, 0.9]),\n              np.array([0.0, 0.0, 1.0, 0.0]),\n              np.array([0.5, 0.2, 0.0, 0.6])]\nsims = [query @ c / (np.linalg.norm(query) * np.linalg.norm(c)) for c in candidates]\nmost_similar = int(np.argmax(sims))',
          testCode: `import numpy as np
assert not any(np.isnan(s) for s in sims), "The zero candidate gives 0/0 = nan, and argmax picks the nan. Guard: similarity 0 when a length is 0"
assert most_similar != 0, "Index 0 is the empty zero vector; it cannot be the most similar"
assert most_similar == 1, f"Candidate 1 has the highest cosine similarity (about 0.9934, just ahead of candidate 3 at 0.9923); got {most_similar}"
"SUCCESS: the zero vector gets similarity 0, and candidate 1 is the best match."`,
          hint: 'def cos_sim(a, b):\n    na, nb = np.linalg.norm(a), np.linalg.norm(b)\n    return 0.0 if na == 0 or nb == 0 else a @ b / (na * nb)',
          solution: 'import numpy as np\nquery = np.array([1.0, 0.5, 0.0, 1.0])\ncandidates = [np.array([0.0, 0.0, 0.0, 0.0]), np.array([1.0, 0.6, 0.1, 0.9]), np.array([0.0, 0.0, 1.0, 0.0]), np.array([0.5, 0.2, 0.0, 0.6])]\ndef cos_sim(a, b):\n    na, nb = np.linalg.norm(a), np.linalg.norm(b)\n    return 0.0 if na == 0 or nb == 0 else float(a @ b / (na * nb))\nsims = [cos_sim(query, c) for c in candidates]\nmost_similar = int(np.argmax(sims))',
          misconceptions: [{ code: 'import numpy as np, warnings\nwarnings.simplefilter("ignore")\nquery = np.array([1.0, 0.5, 0.0, 1.0])\ncandidates = [np.zeros(4), np.array([1.0, 0.6, 0.1, 0.9])]\nsims = [query @ c / (np.linalg.norm(query) * np.linalg.norm(c)) for c in candidates]\nmost_similar = int(np.argmax(sims))', feedback: 'argmax picks the nan' }],
        }),
        exercise(13, 3, 'Challenge 3 — Inputs, weights and predictions', 'medium', {
          prompt: 'X holds three houses (rows) described by [size m2, bedrooms, age years]; w holds the model\'s weights and b its base price. Compute predictions (one price per house), extra_bedroom_effect (how much one more bedroom changes a prediction) and n_outputs (how many numbers the model outputs per house).',
          prose: ['Each row of X is one house\'s inputs. A prediction for one house is that row dotted with w, plus b. `X @ w` does this for every row at once.'],
          instructions: 'Check the shapes before you multiply: X is (3, 3), w is (3,). What shape should predictions have?',
          code: 'import numpy as np\nX = np.array([[80, 3, 20],\n              [55, 2, 5],\n              [120, 4, 40]])\nw = np.array([3000, 10000, -500])\nb = 20000\npredictions = None\nextra_bedroom_effect = None\nn_outputs = None',
          testCode: `import numpy as np
assert predictions is not None and np.shape(predictions) == (3,), "predictions should hold one number per house: shape (3,)"
assert not np.allclose(predictions, w @ X + b), "w @ X dots w with each COLUMN of X (one feature across houses). Use X @ w: each ROW (one house) dotted with w"
assert np.allclose(predictions, [280000, 202500, 400000]), f"Expected [280000, 202500, 400000], got {predictions}"
assert extra_bedroom_effect == 10000, "One more bedroom changes the prediction by that input's weight: w[1] = 10000"
assert n_outputs == 1, "Inputs are three numbers per house, but the dot product produces ONE number per house"
"SUCCESS: 3 inputs per house go in, 1 predicted price per house comes out, and each weight is the effect of one extra unit of its input."`,
          hint: 'predictions = X @ w + b; extra_bedroom_effect = w[1]; n_outputs = 1',
          solution: 'import numpy as np\nX = np.array([[80, 3, 20], [55, 2, 5], [120, 4, 40]])\nw = np.array([3000, 10000, -500])\nb = 20000\npredictions = X @ w + b\nextra_bedroom_effect = w[1]\nn_outputs = 1',
          misconceptions: [{ code: 'import numpy as np\nX = np.array([[80, 3, 20], [55, 2, 5], [120, 4, 40]])\nw = np.array([3000, 10000, -500])\nb = 20000\npredictions = w @ X + b\nextra_bedroom_effect = 10000\nn_outputs = 1', feedback: 'Use X @ w' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Dot product: match entries, multiply, add — two same-length vectors in, one number out.',
    'In a prediction w · x, x holds inputs, w holds weights (output units per input unit), and the result is one output.',
    'a · b = ‖a‖‖b‖cos θ: positive for similar directions, 0 for perpendicular, negative for opposite.',
    'Cosine similarity = a · b / (‖a‖‖b‖) ignores length; guard against zero-length vectors.',
    'Scalar projection a · b / ‖b‖ = how much of a lies along b.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'np.dot([1, 2, 3], [4, 5, 6]) = ?',
      options: ['[4, 10, 18]', '32 — 4 + 10 + 18', '15'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'In price = w · x, which statement is right?',
      options: [
        'w and x are both inputs',
        'x holds the inputs for one item, w holds weights in price per input unit, and the result is one price',
        'The result is a vector of prices',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Why compare documents with cosine similarity rather than the plain dot product?',
      options: [
        'The dot product cannot be computed for text',
        'The dot product grows with document length; cosine similarity divides by both lengths, so it compares direction (topic) only',
        'Cosine similarity is always larger',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'Two non-zero vectors have dot product 0. What does that mean?',
      options: ['They are identical', 'They are perpendicular: neither has any component along the other', 'One of them is empty'],
      correct: 1,
    },
  ],
}
