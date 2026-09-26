// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const clip = body => `import numpy as np\n\ndef clip_by_norm(g, c):\n${body}\n`
const bug = '    step = lr * m / (np.sqrt(v) + 1e-8)'
export const verify = {
  optim: {
    pass: {
      agree: s => s.starter.replace('seeds = [0]', 'seeds = range(8)'),
      fill: [s => s.starter.replace('___', 'beta * v + g')],
      repair: [
        s => s.starter.replace(bug, '    m_hat, v_hat = m / (1 - 0.9 ** t), v / (1 - 0.999 ** t)\n    step = lr * m_hat / (np.sqrt(v_hat) + 1e-8)'),
        s => s.starter.replace(bug, '    step = lr * (m / (1 - 0.9 ** t)) / (np.sqrt(v / (1 - 0.999 ** t)) + 1e-8)'),
      ],
      implement: [
        () => clip('    return g * min(1.0, c / np.linalg.norm(g))'),
        () => clip('    n = np.sqrt(np.sum(g ** 2))\n    return g if n <= c else g * (c / n)'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /seeds = range\(8\)/ }],
      fill: [
        { code: s => s.starter.replace('___', 'v + g'), hint: /multiplied by β/ },
      ],
      repair: [
        { code: s => s.starter, hint: /biased toward 0/ },
        { code: s => s.starter.replace(bug, '    step = lr * m / (np.sqrt(v / (1 - 0.999 ** t)) + 1e-8)'), hint: /v is corrected but m is not/ },
      ],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => clip('    return np.clip(g, -c, c)'), hint: /caps each component/ },
        { code: () => clip('    return g * c / np.linalg.norm(g)'), hint: /already shorter than c/ },
      ],
    },
  },
}
