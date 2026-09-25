// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const head = 'import numpy as np\n\ndef best_split(x, y):\n    g = lambda v: 2 * np.mean(v) * (1 - np.mean(v))\n    o = np.argsort(x); xs, ys = x[o], y[o]\n    best = None\n    for i in range(1, len(xs)):\n        if xs[i] == xs[i - 1]: continue\n'
const body = (w, cmp) => head + `        gain = g(ys) - ${w}\n        if best is None or gain ${cmp} best[1]: best = ((xs[i - 1] + xs[i]) / 2, gain)\n    return np.array(best)\n`
const weighted = '(i * g(ys[:i]) + (len(ys) - i) * g(ys[i:])) / len(ys)'
export const verify = {
  split: {
    pass: {
      agree: s => s.starter.replace('max_depth = None', 'max_depth = 3'),
      fill: [s => s.starter.replace('___', '2 * p * (1 - p)')],
      repair: [s => s.starter.replace('(g(left) + g(right)) / 2', '(len(left) * g(left) + len(right) * g(right)) / len(parent)')],
      implement: [() => body(weighted, '>')],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /max_depth = 3/ }],
      fill: [{ code: s => s.starter.replace('___', 'p * (1 - p)'), hint: /2p\(1 − p\)/ }],
      repair: [{ code: s => s.starter, hint: /averaged equally/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => body(weighted, '<'), hint: /LOWEST gain/ },
      ],
    },
  },
}
