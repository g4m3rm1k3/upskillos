// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const head = 'import numpy as np\n\ndef best_threshold(y, scores, c_fp, c_fn):\n'
const search = cmp => head + `    ts = np.unique(scores)\n    best, best_cost = ts[0], None\n    for t in ts:\n        c = c_fp * np.sum((scores >= t) & (y == 0)) + c_fn * np.sum((scores < t) & (y == 1))\n        if best_cost is None or c ${cmp} best_cost:\n            best, best_cost = t, c\n    return best\n`
export const verify = {
  threshold: {
    pass: {
      agree: s => s.starter.replace('chosen = thresholds[np.argmax(accuracy)]', 'chosen = thresholds[np.argmin(costs)]'),
      fill: [s => s.starter.replace('___', 'tp / (tp + fp)')],
      repair: [s => s.starter.replace('fp = np.sum((alert == 0) & (y == 1))\n    fn = np.sum((alert == 1) & (y == 0))', 'fp = np.sum((alert == 1) & (y == 0))\n    fn = np.sum((alert == 0) & (y == 1))')],
      implement: [() => search('<')],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /lowest `costs`/ }],
      fill: [{ code: s => s.starter.replace('___', 'tp / (tp + fn)'), text: /disagree/ }],
      repair: [{ code: s => s.starter, hint: /FP and FN are swapped/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => search('<='), hint: /smaller threshold/ },
        { code: () => head + '    ts = np.unique(scores)\n    return ts[int(np.argmax([np.mean((scores >= t) == y) for t in ts]))]\n', hint: /maximizes accuracy/ },
      ],
    },
  },
}
