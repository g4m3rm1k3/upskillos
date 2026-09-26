// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const below = body => `import numpy as np\n\ndef below_share(x, train, q):\n${body}\n`
export const verify = {
  contract: {
    pass: {
      agree: s => s.starter.replace('use_quantile = False', 'use_quantile = True'),
      fill: [s => s.starter.replace('___', 'len(np.unique(rows)) / n'), s => s.starter.replace('___', 'len(set(rows.tolist())) / n')],
      repair: [s => s.starter.replace('(sd / len(x))', '(sd / np.sqrt(len(x)))')],
      implement: [
        () => below('    return np.mean(x < np.quantile(train, q))'),
        () => below('    t = np.quantile(train, q)\n    return sum(1 for v in x if v < t) / len(x)'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /use_quantile = True/ }],
      fill: [{ code: s => s.starter.replace('___', 'len(rows) / n'), hint: /counted twice/ }],
      repair: [{ code: s => s.starter, hint: /σ\/n/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => below('    return np.mean(x < np.quantile(x, q))'), hint: /from the training data/ },
      ],
    },
  },
}
