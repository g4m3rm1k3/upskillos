// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const rbf = body => `import numpy as np\n\ndef rbf_kernel(A, B, gamma):\n${body}\n`
const bugLine = '    return lam * w - (y[:, None] * X).mean(axis=0)'
export const verify = {
  hinge: {
    pass: {
      agree: s => s.starter.replace('gamma = 100', 'gamma = 1'),
      fill: [s => s.starter.replace('___', 'np.maximum(0, 1 - y * (X @ w + b))')],
      repair: [
        s => s.starter.replace(bugLine, '    active = y * (X @ w + b) < 1\n    return lam * w - (y[active, None] * X[active]).sum(axis=0) / len(y)'),
        s => s.starter.replace(bugLine, '    m = y * (X @ w + b)\n    return lam * w - ((m < 1) * y) @ X / len(y)'),
      ],
      implement: [
        () => rbf('    d2 = ((A[:, None, :] - B[None, :, :]) ** 2).sum(axis=2)\n    return np.exp(-gamma * d2)'),
        () => rbf('    return np.array([[np.exp(-gamma * np.sum((a - c) ** 2)) for c in B] for a in A])'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /gamma = 1`/ }],
      fill: [
        { code: s => s.starter.replace('___', '1 - y * (X @ w + b)'), hint: /clip at 0/ },
        { code: s => s.starter.replace('___', 'np.maximum(0, 1 - (X @ w + b))'), hint: /multiply by the label/ },
      ],
      repair: [
        { code: s => s.starter, hint: /Every point was counted/ },
        { code: s => s.starter.replace(bugLine, '    return lam * w'), hint: /Only the penalty/ },
      ],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => rbf('    return np.exp(-gamma * np.sqrt(((A[:, None, :] - B[None, :, :]) ** 2).sum(axis=2)))'), hint: /squared distance/ },
        { code: () => rbf('    return np.exp(gamma * ((A[:, None, :] - B[None, :, :]) ** 2).sum(axis=2))'), hint: /must be negative/ },
      ],
    },
  },
}
