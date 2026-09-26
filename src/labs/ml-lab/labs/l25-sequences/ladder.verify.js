// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const mrnn = body => `import numpy as np\n\ndef masked_rnn(ids, E, W_x, W_h):\n${body}\n`
export const verify = {
  rnn: {
    pass: {
      agree: s => s.starter.replace('masked = False', 'masked = True'),
      fill: [s => s.starter.replace('___', '(E[ids] * mask[:, None]).sum(axis=0) / mask.sum()'), s => s.starter.replace('___', 'E[ids[ids != 0]].mean(axis=0)')],
      repair: [s => s.starter.replace('h = np.tanh(E[t] @ W_x)', 'h = np.tanh(E[t] @ W_x + h @ W_h)')],
      implement: [
        () => mrnn('    h = np.zeros(W_h.shape[0])\n    for t in ids.astype(int):\n        if t == 0:\n            continue\n        h = np.tanh(E[t] @ W_x + h @ W_h)\n    return h'),
        () => mrnn('    h = np.zeros(W_h.shape[0])\n    for t in ids[ids != 0].astype(int):\n        h = np.tanh(E[t] @ W_x + h @ W_h)\n    return h'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /masked = True/ }],
      fill: [{ code: s => s.starter.replace('___', 'E[ids].mean(axis=0)'), hint: /pads are in the denominator/ }],
      repair: [{ code: s => s.starter, hint: /no memory/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => mrnn('    h = np.zeros(W_h.shape[0])\n    for t in ids.astype(int):\n        h = np.tanh(E[t] @ W_x + h @ W_h)\n    return h'), hint: /pads were processed/ },
      ],
    },
  },
}
