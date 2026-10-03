// What a learner does at each step of "Mathematics Through Computation" (ml-math), for the
// walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 2.1 ──────────────────────────────────────────────────────────────────
  '02-01-vectors#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '02-01-vectors#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '02-01-vectors#Adding and scaling': {
    wrong: [{ name: 'zip without strict silently truncates', edit: [['return [a + b for a, b in zip(u, v, strict=True)]', 'return [a + b for a, b in zip(u, v)]']], fails: [0] }],
  },
  '02-01-vectors#The dot product': {
    wrong: [
      { name: 'added instead of multiplying', edit: [['sum(a * b for a, b in zip(u, v, strict=True))', 'sum(a + b for a, b in zip(u, v, strict=True))']], fails: [0] },
      { name: 'zip without strict silently truncates', edit: [['sum(a * b for a, b in zip(u, v, strict=True))', 'sum(a * b for a, b in zip(u, v))']], fails: [0] },
    ],
  },
  '02-01-vectors#Length and distance': {
    wrong: [{ name: 'forgot the square root', edit: [['return math.sqrt(dot(v, v))', 'return dot(v, v)']], fails: [0] }],
  },
  '02-01-vectors#Direction: cosine and correlation': {
    wrong: [{ name: 'correlated without centring', edit: [['return cosine(centre(u), centre(v))', 'return cosine(u, v)']], fails: [0] }],
  },
  '02-01-vectors#Correlations in the houses': {
    wrong: [{ name: 'compared each feature with itself', edit: [['vectors.correlation(feature, price)', 'vectors.correlation(feature, feature)']], fails: [0, 1] }],
  },
  '02-01-vectors#Why NumPy': {
    run: ['.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'added numpy to requirements.txt but did not install it', fails: [0, 1] }],
  },

  // ── 2.2 ──────────────────────────────────────────────────────────────────
  '02-02-matrices#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '02-02-matrices#Shapes, rows and columns': {
    wrong: [{ name: 'shape gives columns then rows', edit: [['return len(m), len(m[0])', 'return len(m[0]), len(m)']], fails: [0] }],
  },
  '02-02-matrices#Every house at once': {
    wrong: [{ name: 'dotted the columns instead of the rows', edit: [['return [vectors.dot(row, v) for row in m]', 'return [vectors.dot(col, v) for col in transpose(m)]']], fails: [0] }],
  },
  '02-02-matrices#Matrix times matrix': {
    wrong: [
      { name: 'used the rows of b instead of its columns', edit: [['    columns = transpose(b)\n', '    columns = b\n']], fails: [0] },
      { name: 'no shape check', edit: [['    if shape(a)[1] != shape(b)[0]:\n        raise ValueError(f"cannot multiply {shape(a)} by {shape(b)}: inner sizes differ")\n', '']], fails: [0] },
    ],
  },
  '02-02-matrices#Pricing the whole dataset with NumPy': {
    wrong: [{ name: 'forgot the base price', edit: [['predictions = X @ w + b', 'predictions = X @ w']], fails: [1] }],
  },

  // ── 2.3 ──────────────────────────────────────────────────────────────────
  '02-03-derivatives#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '02-03-derivatives#Slope between two points': {
    wrong: [{ name: 'divided the wrong way round', edit: [['return (f(x2) - f(x1)) / (x2 - x1)', 'return (x2 - x1) / (f(x2) - f(x1))']], fails: [0] }],
  },
  '02-03-derivatives#The slope at one point': {
    wrong: [{ name: 'forgot to divide by h', edit: [['return (f(x + h) - f(x)) / h', 'return f(x + h) - f(x)']], fails: [0] }],
  },
  '02-03-derivatives#A better estimate: the central difference': {
    wrong: [{ name: 'divided by h instead of 2h', edit: [['return (f(x + h) - f(x - h)) / (2 * h)', 'return (f(x + h) - f(x - h)) / h']], fails: [0] }],
  },
  '02-03-derivatives#A loss with one weight': {
    wrong: [{ name: 'dropped the factor x from the chain rule', edit: [['sum(2 * (w * x - y) * x for x, y in zip(AREA, PRICE))', 'sum(2 * (w * x - y) for x, y in zip(AREA, PRICE))']], fails: [0] }],
  },
  '02-03-derivatives#One step downhill': {
    wrong: [{ name: 'stepped uphill', edit: [['return w - rate * loss_slope(w)', 'return w + rate * loss_slope(w)']], fails: [0] }],
  },

  // ── 2.4 ──────────────────────────────────────────────────────────────────
  '02-04-gradients#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '02-04-gradients#One direction at a time': {
    wrong: [{ name: "changed the caller's point", edit: [['        moved = list(point)\n', '        moved = point\n']], fails: [0] }],
  },
  '02-04-gradients#Roll downhill': {
    wrong: [{ name: 'climbed instead of descending', edit: [['point = [p - rate * g', 'point = [p + rate * g']], fails: [0] }],
  },
  '02-04-gradients#Watch the ball': {
    wrong: [{ name: 'drew y upside down', edit: [['col, row = cell(x - XS[0], 0.25), cell(YS[0] - y, 0.5)', 'col, row = cell(x - XS[0], 0.25), cell(y - YS[-1], 0.5)']], fails: [0] }],
  },
};
