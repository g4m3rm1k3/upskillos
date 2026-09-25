// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const head = 'import numpy as np\n\ndef coverage(intervals, mu):\n'
export const verify = {
  interval: {
    pass: {
      agree: s => s.starter.replace('n, mu = 5, 30.0', 'n, mu = 50, 30.0'),
      fill: [s => s.starter.replace('___', 'np.std(x, ddof=1) / np.sqrt(len(x))'), s => s.starter.replace('___', 'np.sqrt(((x - x.mean()) ** 2).sum() / (len(x) - 1) / len(x))')],
      repair: [s => s.starter.replace('np.std(x)', 'np.std(x, ddof=1)')],
      implement: [() => head + '    return np.mean((intervals[:, 0] <= mu) & (mu <= intervals[:, 1]))\n'],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /Set `n = 50`/ }],
      fill: [
        { code: s => s.starter.replace('___', 'np.std(x, ddof=1)'), hint: /Far too wide/ },
        { code: s => s.starter.replace('___', 'np.std(x, ddof=1) / np.sqrt(len(x)) / 1.96'), text: /disagree/ },
      ],
      repair: [{ code: s => s.starter, hint: /ddof=1/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => head + '    return np.mean((intervals[:, 0] < mu) & (mu < intervals[:, 1]))\n', hint: /use ≤, not </ },
        { code: () => head + '    return np.sum((intervals[:, 0] <= mu) & (mu <= intervals[:, 1]))\n', hint: /That is a count/ },
      ],
    },
  },
}
