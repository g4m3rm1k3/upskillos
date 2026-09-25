// Code that tools/verify-ladders.mjs runs through the real check harness with a local Python:
// accepted solutions must pass, and each plausible mistake must fail with the named diagnosis.
const header = 'import numpy as np\n\ndef predict(X, w):\n'
export const verify = {
  prediction: {
    pass: {
      agree: step => step.starter.replace('w = np.array([1., 2., 2.])', 'w = np.array([0.5, -1., 3.])'),
      fill: [s => s.starter.replace('___', 'X[i] @ w'), s => s.starter.replace('___', 'np.dot(X[i], w)'), s => s.starter.replace('___', 'sum(X[i, j] * w[j] for j in range(len(w)))')],
      repair: [s => s.starter.replace('range(1, X.shape[1])', 'range(X.shape[1])'), s => s.starter.replace('range(1, X.shape[1])', 'range(0, X.shape[1])')],
      implement: [
        () => header + '    return X @ w\n',
        () => header + '    return np.array([row @ w for row in X])\n',
        () => header + '    return (X * w).sum(axis=1)\n',
        () => header + '    out = []\n    for i in range(len(X)):\n        s = 0.0\n        for j in range(len(w)):\n            s += X[i][j] * w[j]\n        out.append(s)\n    return out\n',
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /Now change `w`/ }],
      fill: [{ code: s => s.starter, error: /NameError/ }, { code: s => s.starter.replace('___', 'X[i, 1:] @ w[1:]'), hint: /intercept never got in/ }],
      repair: [{ code: s => s.starter, hint: /intercept never got in/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => header + '    return X * w\n', hint: /never added up/ },
        { code: () => header + '    return (X * w).sum()\n', hint: /one number for the whole table/ },
        { code: () => header + '    return (X * w).sum(axis=0)\n', hint: /per column/ },
        { code: () => header + '    return (X @ w).reshape(-1, 1)\n', hint: /\(n, 1\)/ },
        { code: () => header + '    return X @ w + w[0]\n', hint: /too large/ },
        { code: () => header + '    return X[:, 1:] @ w[1:]\n', hint: /intercept never got in/ },
        { code: () => header + '    return X[:4, :3] @ w[:3]\n', text: /Case 3 .*expected \[4\], got \[9\]/ },
        { code: () => header + '    p = X @ w\n    X[:, 0] = 0\n    return p\n', text: /changed one of its input arrays/ },
      ],
    },
  },
}
