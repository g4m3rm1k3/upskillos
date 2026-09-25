// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const head = 'import numpy as np\n\ndef ridge(X, y, lam):\n'
export const verify = {
  shrink: {
    pass: {
      agree: s => s.starter.replace('chosen = lambdas[np.argmin(train_mse)]', 'chosen = lambdas[np.argmin(val_mse)]'),
      fill: [s => s.starter.replace('___', 'np.sum(x * y) / (np.sum(x * x) + len(x) * lam)')],
      repair: [s => s.starter.replace('np.sign(z) * (np.abs(z) - t)', 'np.sign(z) * np.maximum(np.abs(z) - t, 0)')],
      implement: [() => head + '    n, p = X.shape\n    return np.linalg.solve(X.T @ X / n + lam * np.eye(p), X.T @ y / n)\n'],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /use `val_mse`/ }],
      fill: [{ code: s => s.starter.replace('___', 'np.sum(x * y) / np.sum(x * x)'), hint: /least squares/ }, { code: s => s.starter.replace('___', 'np.sum(x * y) / (np.sum(x * x) + lam)'), hint: /nλ, not λ/ }],
      repair: [{ code: s => s.starter, hint: /clipped at 0/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => head + '    p = X.shape[1]\n    return np.linalg.solve(X.T @ X + lam * np.eye(p), X.T @ y)\n', hint: /averages over rows/ },
      ],
    },
  },
}
