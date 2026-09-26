// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const drop = body => `import numpy as np\n\ndef dropout_forward(a, mask, p, training):\n${body}\n`
export const verify = {
  torch: {
    pass: {
      agree: s => s.starter.replace('save_optimizer = False', 'save_optimizer = True'),
      fill: [s => s.starter.replace('___', 'x @ weight.T + bias'), s => s.starter.replace('___', 'np.dot(x, weight.T) + bias')],
      repair: [s => s.starter.replace('        e = w * x + b - y', '        gw = gb = 0.0\n        e = w * x + b - y')],
      implement: [
        () => drop('    if training:\n        return a * mask / (1 - p)\n    return a'),
        () => drop('    return a * mask / (1 - p) if training else a.copy()'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /save_optimizer = True/ }],
      fill: [{ code: s => s.starter.replace('___', 'x @ weight.T'), hint: /bias is missing/ }],
      repair: [{ code: s => s.starter, hint: /running sum/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => drop('    return a * mask if training else a'), hint: /scaled by 1\/\(1 − p\)/ },
        { code: () => drop('    return a * mask / (1 - p)'), hint: /eval mode nothing is dropped/ },
      ],
    },
  },
}
