// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const abl = body => `import numpy as np\n\ndef ablation_summary(full, ablated):\n${body}\n`
export const verify = {
  invest: {
    pass: {
      agree: s => s.starter.replace('test_shift = 0', 'test_shift = 2'),
      fill: [s => s.starter.replace('___', 'k * k * c_in * c_out * h * w')],
      repair: [s => s.starter.replace('cm.sum(axis=0)', 'cm.sum(axis=1)')],
      implement: [
        () => abl('    d = full - ablated\n    return np.array([d.mean(), d.min(), d.max()])'),
        () => abl('    d = [f - a for f, a in zip(full, ablated)]\n    return np.array([sum(d) / len(d), min(d), max(d)])'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /test_shift = 2/ }],
      fill: [
        { code: s => s.starter.replace('___', 'k * k * c_in * c_out'), hint: /number of weights/ },
      ],
      repair: [{ code: s => s.starter, hint: /that is precision/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => abl('    d = ablated - full\n    return np.array([d.mean(), d.min(), d.max()])'), hint: /sign is reversed/ },
      ],
    },
  },
}
