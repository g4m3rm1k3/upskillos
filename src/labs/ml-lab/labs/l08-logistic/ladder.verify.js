// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const head = 'import numpy as np\n\ndef log_loss(X, y, w, b):\n'
export const verify = {
  logistic: {
    pass: {
      agree: s => s.starter.replace('loss = -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))', 'loss = np.mean(np.logaddexp(0, z) - y * z)'),
      fill: [s => s.starter.replace('___', 'X.T @ (p - y) / len(y)')],
      repair: [s => s.starter.replace('p = X @ w + b', 'p = 1 / (1 + np.exp(-(X @ w + b)))')],
      implement: [() => head + '    z = X @ w + b\n    return np.mean(np.logaddexp(0, z) - y * z)\n'],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /logaddexp/ }],
      fill: [{ code: s => s.starter.replace('___', 'X.T @ (y - p) / len(y)'), text: /disagree/ }],
      repair: [{ code: s => s.starter, hint: /raw score z/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => head + '    p = 1 / (1 + np.exp(-(X @ w + b)))\n    return -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))\n', hint: /infinite or NaN/ },
        { code: () => head + '    z = X @ w + b\n    return np.sum(np.logaddexp(0, z) - y * z)\n', hint: /That is the total/ },
      ],
    },
  },
}
