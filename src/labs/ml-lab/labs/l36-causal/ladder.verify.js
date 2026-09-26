// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const dm = body => `import numpy as np\n\ndef diff_in_means(y, t):\n${body}\n`
export const verify = {
  causal: {
    pass: {
      agree: s => s.starter.replace('randomized = 0 ', 'randomized = 1 '),
      fill: [s => s.starter.replace('___', 'np.sum(t * y / e) / np.sum(t / e) - np.sum((1 - t) * y / (1 - e)) / np.sum((1 - t) / (1 - e))'), s => s.starter.replace('___', 'np.average(y[t == 1], weights=1 / e[t == 1]) - np.average(y[t == 0], weights=1 / (1 - e[t == 0]))')],
      repair: [s => 'import math\n' + s.starter.replace('return int(2 * (z_a + z_b) ** 2 * sd ** 2 / mde ** 2)', 'return math.ceil(2 * (z_a + z_b) ** 2 * sd ** 2 / mde ** 2)')],
      implement: [
        () => dm('    a, b = y[t == 1], y[t == 0]\n    est = a.mean() - b.mean()\n    se = np.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))\n    return [est, est - 1.96 * se, est + 1.96 * se]'),
        () => dm('    a, b = y[t == 1], y[t == 0]\n    d = np.mean(a) - np.mean(b)\n    h = 1.96 * (np.var(a, ddof=1) / a.size + np.var(b, ddof=1) / b.size) ** 0.5\n    return np.array([d, d - h, d + h])'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /randomized = 1/ }],
      fill: [
        { code: s => s.starter.replace('___', 'y[t == 1].mean() - y[t == 0].mean()'), hint: /unweighted difference/ },
        { code: s => s.starter.replace('___', 'np.sum(t * y / e) / np.sum(t / e) - np.sum((1 - t) * y / e) / np.sum((1 - t) / e)'), hint: /1\/\(1 − e\)/ },
      ],
      repair: [{ code: s => s.starter, hint: /Round up/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => dm('    a, b = y[t == 1], y[t == 0]\n    est = b.mean() - a.mean()\n    se = np.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))\n    return [est, est - 1.96 * se, est + 1.96 * se]'), hint: /sign is flipped/ },
        { code: () => dm('    a, b = y[t == 1], y[t == 0]\n    est = a.mean() - b.mean()\n    se = np.sqrt(a.var() / len(a) + b.var() / len(b))\n    return [est, est - 1.96 * se, est + 1.96 * se]'), hint: /ddof=1/ },
      ],
    },
  },
}
