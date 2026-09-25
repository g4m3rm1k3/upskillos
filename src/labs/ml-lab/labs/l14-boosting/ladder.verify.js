// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const loop = (step, T = 'T') => `import numpy as np\n\ndef boost(x, y, t, nu, T):\n    F = np.full(len(y), y.mean())\n    left = x <= t\n    for _ in range(${T}):\n        r = y - F\n        F = F + ${step} * np.where(left, r[left].mean(), r[~left].mean())\n    return F\n`
export const verify = {
  boost: {
    pass: {
      agree: s => s.starter.replace('learning_rate = 1.0', 'learning_rate = 0.05'),
      fill: [s => s.starter.replace('___', 'np.sign(y - F)')],
      repair: [s => s.starter.replace(/    for i in range[\s\S]*return len\(errors\)/, '    return int(np.argmin(errors)) + 1'), s => s.starter.replace(/    for i in range[\s\S]*return len\(errors\)/, '    return list(errors).index(min(errors)) + 1')],
      implement: [() => loop('nu')],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /learning_rate = 0.05/ }],
      fill: [
        { code: s => s.starter.replace('___', 'y - F'), hint: /squared-loss residual/ },
        { code: s => s.starter.replace('___', 'np.sign(F - y)'), hint: /flipped/ },
      ],
      repair: [
        { code: s => s.starter, hint: /first stage where the error rises/ },
        { code: s => s.starter.replace(/    for i in range[\s\S]*return len\(errors\)/, '    return int(np.argmin(errors))'), hint: /numbered from 1/ },
      ],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => loop('1'), hint: /learning rate is missing/ },
        { code: () => loop('nu', '1'), hint: /Only one stage ran/ },
      ],
    },
  },
}
