// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const pool = body => `import numpy as np\n\ndef max_pool(m, s):\n${body}\n`
export const verify = {
  conv: {
    pass: {
      agree: s => s.starter.replace('use_conv = 0 ', 'use_conv = 1 '),
      fill: [s => s.starter.replace('___', '(n + 2 * p - k) // s + 1'), s => s.starter.replace('___', 'int((n + 2 * p - k) / s) + 1')],
      repair: [s => s.starter.replace('* K[::-1, ::-1])', '* K)')],
      implement: [
        () => pool('    h, w = m.shape\n    return m.reshape(h // s, s, w // s, s).max(axis=(1, 3))'),
        () => pool('    return np.array([[m[i:i + s, j:j + s].max() for j in range(0, m.shape[1], s)] for i in range(0, m.shape[0], s)])'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /use_conv = 1/ }],
      fill: [
        { code: s => s.starter.replace('___', '(n - k) // s + 1'), hint: /padding is missing/ },
        { code: s => s.starter.replace('___', '(n + 2 * p - k) // s'), hint: /Add 1/ },
      ],
      repair: [{ code: s => s.starter, hint: /kernel is flipped/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => pool('    h, w = m.shape\n    return m.reshape(h // s, s, w // s, s).mean(axis=(1, 3))'), hint: /average pooling/ },
      ],
    },
  },
}
