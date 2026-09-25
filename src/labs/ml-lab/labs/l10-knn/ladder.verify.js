// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const head = 'import numpy as np\n\ndef knn_share(X, y, q, k):\n'
export const verify = {
  knn: {
    pass: {
      agree: s => s.starter.replace("d = np.sqrt(((X - q) ** 2).sum(axis=1))", "m, sd = X.mean(axis=0), X.std(axis=0)\nd = np.sqrt(((((X - m) / sd) - (q - m) / sd) ** 2).sum(axis=1))"),
      fill: [s => s.starter.replace('___', 'np.sqrt(((X - q) ** 2).sum(axis=1))'), s => s.starter.replace('___', 'np.linalg.norm(X - q, axis=1)')],
      repair: [s => s.starter.replace('np.argsort(d)[-k:]', 'np.argsort(d)[:k]')],
      implement: [() => head + '    d = np.sqrt(((X - q) ** 2).sum(axis=1))\n    return y[np.argsort(d)[:k]].mean()\n'],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /Standardize both features/ }],
      fill: [{ code: s => s.starter.replace('___', '((X - q) ** 2).sum(axis=1)'), hint: /squared distances/ }, { code: s => s.starter.replace('___', 'np.abs(X - q).sum(axis=1)'), hint: /Manhattan/ }],
      repair: [{ code: s => s.starter, hint: /FARTHEST/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => head + '    d = np.sqrt(((X - q) ** 2).sum(axis=1))\n    return y[np.argsort(d)[:k]].sum()\n', hint: /number of class-1 neighbours/ },
      ],
    },
  },
}
