// Code that tools/verify-ladders.mjs runs through the real check harness with a local Python:
// accepted solutions must pass, and each plausible mistake must fail with the named diagnosis.
const header = 'import numpy as np\n\ndef predict(X, w):\n'
const gstep = 'import numpy as np\n\ndef gradient_step(X, y, w, alpha):\n'
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
  gradient: {
    pass: {
      agree: step => step.starter.replace('eps = 0.1', 'eps = 1e-4'),
      fill: [s => s.starter.replace('___', '2 / len(y) * X.T @ (X @ w - y)'), s => s.starter.replace('___', 'X.T @ (X @ w - y) * 2 / X.shape[0]'),
             s => s.starter.replace('___', 'np.array([2 * np.mean((X @ w - y) * X[:, j]) for j in range(X.shape[1])])')],
      repair: [s => s.starter.replace('e = y - X @ w', 'e = X @ w - y')],
      implement: [
        () => gstep + '    return w - alpha * (2 / len(y) * X.T @ (X @ w - y))\n',
        () => gstep + '    grad = 2 / len(y) * X.T @ (X @ w - y)\n    new = w.copy()\n    new -= alpha * grad\n    return new\n',
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /set `eps = 1e-4`/ }],
      fill: [
        { code: s => s.starter, error: /NameError/ },
        { code: s => s.starter.replace('___', '2 / len(y) * X.T @ (y - X @ w)'), hint: /wrong sign/ },
        { code: s => s.starter.replace('___', '1 / len(y) * X.T @ (X @ w - y)'), hint: /half the right size/ },
        { code: s => s.starter.replace('___', 'X.T @ (X @ w - y)'), hint: /not multiplied by 2\/n/ },
        { code: s => s.starter.replace('___', '2 / len(y) * X @ (X @ w - y)'), error: /ValueError|mismatch/ },
      ],
      repair: [{ code: s => s.starter, hint: /wrong sign/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => gstep + '    return w + alpha * (2 / len(y) * X.T @ (X @ w - y))\n', hint: /moved uphill/ },
        { code: () => gstep + '    return w - (2 / len(y) * X.T @ (X @ w - y))\n', hint: /multiply it by the learning rate/ },
        { code: () => gstep + '    w -= alpha * (2 / len(y) * X.T @ (X @ w - y))\n    return w\n', text: /changed one of its input arrays/ },
        { code: () => gstep + '    return w - alpha * (1 / len(y) * X.T @ (X @ w - y))\n', hint: /Working back .* half the right size/ },
      ],
    },
  },
}
