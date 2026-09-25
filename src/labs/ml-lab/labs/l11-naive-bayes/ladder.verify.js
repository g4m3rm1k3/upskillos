// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const head = 'import numpy as np\n\ndef log_odds(x, c1, c0, prior1, alpha):\n'
const body = (x, prior) => head + `    V = len(c1)\n    p1 = (c1 + alpha) / (c1.sum() + alpha * V)\n    p0 = (c0 + alpha) / (c0.sum() + alpha * V)\n    return ${prior} + np.sum(${x} * (np.log(p1) - np.log(p0)))\n`
export const verify = {
  nb: {
    pass: {
      agree: s => s.starter.replace('score = np.prod(p)', 'score = np.log(p).sum()'),
      fill: [s => s.starter.replace('___', '(counts + alpha) / (counts.sum() + alpha * len(counts))')],
      repair: [s => s.starter.replace('(counts + alpha) / counts.sum()', '(counts + alpha) / (counts.sum() + alpha * len(counts))')],
      implement: [() => body('x', 'np.log(prior1 / (1 - prior1))')],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /sum of logs|np.log\(p\).sum\(\)/ }],
      fill: [{ code: s => s.starter.replace('___', 'counts / counts.sum()'), text: /disagree/ }],
      repair: [{ code: s => s.starter, hint: /sum to 1|Division by zero/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => body('x', '0'), hint: /prior term/ },
        { code: () => body('(x > 0)', 'np.log(prior1 / (1 - prior1))'), hint: /once per occurrence/ },
      ],
    },
  },
}
