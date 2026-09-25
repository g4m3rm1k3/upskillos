// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const fitHead = 'import numpy as np\n\ndef fit(x, y, alpha):\n'
const loop = n => `    w, b = 0.0, 0.0\n    for _ in range(${n}):\n        e = w * x + b - y\n        w, b = w - alpha * 2 * np.mean(e * x), b - alpha * 2 * np.mean(e)\n    return np.array([w, b])\n`
export const verify = {
  update: {
    pass: {
      agree: s => s.starter.replace('alpha = 0.05', 'alpha = 0.5'),
      fill: [s => s.starter.replace('___', '2 * np.mean(e * x)'), s => s.starter.replace('___', '2 * (e * x).sum() / len(x)')],
      repair: [s => s.starter.replace("    w = w - alpha * 2 * np.mean((w * x + b - y) * x)\n    b = b - alpha * 2 * np.mean(w * x + b - y)", "    e = w * x + b - y\n    w, b = w - alpha * 2 * np.mean(e * x), b - alpha * 2 * np.mean(e)")],
      implement: [() => fitHead + loop(100)],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /set `alpha = 0.5`/ }],
      fill: [
        { code: s => s.starter, error: /NameError/ },
        { code: s => s.starter.replace('___', 'np.mean(e * x)'), hint: /Half the right size/ },
        { code: s => s.starter.replace('___', '2 * np.mean(e)'), hint: /∂J\/∂w equals ∂J\/∂b/ },
        { code: s => s.starter.replace('___', '-2 * np.mean(e * x)'), hint: /wrong sign/ },
      ],
      repair: [{ code: s => s.starter, hint: /computed after w had already changed/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => fitHead + loop(99), hint: /after 99 steps/ },
      ],
    },
  },
}
