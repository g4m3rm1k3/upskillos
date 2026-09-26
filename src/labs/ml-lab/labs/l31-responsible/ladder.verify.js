// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const w = body => `import numpy as np\n\ndef wilson(k, n, z=1.96):\n${body}\n`
export const verify = {
  audit: {
    pass: {
      agree: s => s.starter.replace('t_b = 0.5 ', 't_b = 0.12 '),
      fill: [s => s.starter.replace('___', 'np.sum((pred == 1) & (y == 1)) / np.sum(y == 1)'), s => s.starter.replace('___', 'pred[y == 1].mean()')],
      repair: [s => s.starter.replace('np.sum(scores - 0.5 <= width)', 'np.sum(np.abs(scores - 0.5) <= width)')],
      implement: [
        () => w('    p = k / n\n    centre = (p + z * z / (2 * n)) / (1 + z * z / n)\n    half = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)\n    return [centre - half, centre + half]'),
        () => w('    p, d = k / n, 1 + z**2 / n\n    c = (p + z**2 / (2 * n)) / d\n    h = z / d * (p * (1 - p) / n + z**2 / (4 * n**2)) ** 0.5\n    return np.array([c - h, c + h])'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /Lower `t_b`/ }, { code: s => s.starter.replace('t_b = 0.5 ', 't_b = 0.15 '), message: /at most 1 point/ }],
      fill: [
        { code: s => s.starter.replace('___', 'np.sum((pred == 1) & (y == 1)) / np.sum(pred == 1)'), hint: /That is precision/ },
        { code: s => s.starter.replace('___', 'np.mean(pred == y)'), hint: /accuracy/ },
      ],
      repair: [{ code: s => s.starter, hint: /\|s − 0\.5\|/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => w('    p = k / n\n    h = z * np.sqrt(p * (1 - p) / n)\n    return [p - h, p + h]'), hint: /Wilson formula/ },
      ],
    },
  },
}
