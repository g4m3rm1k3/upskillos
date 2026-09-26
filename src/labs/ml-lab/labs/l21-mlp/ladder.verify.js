// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const delta = body => `import numpy as np\n\ndef hidden_delta(delta, W, Z_prev):\n${body}\n`
export const verify = {
  mlp: {
    pass: {
      agree: s => s.starter.replace('scale = 0.0 ', 'scale = 1.0 '),
      fill: [s => s.starter.replace('___', 'e / e.sum()'), s => s.starter.replace('___', 'e / np.sum(e)')],
      repair: [s => s.starter.replace('return delta.T @ A_prev', 'return A_prev.T @ delta'), s => s.starter.replace('return delta.T @ A_prev', 'return (delta.T @ A_prev).T')],
      implement: [
        () => delta('    return (delta @ W.T) * (Z_prev > 0)'),
        () => delta('    back = delta @ W.T\n    back[Z_prev <= 0] = 0\n    return back'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /scale = 1\.0/ }],
      fill: [
        { code: s => s.starter.replace('e = np.exp(z - z.max())', 'e = np.exp(z)').replace('___', 'e / e.sum()'), hint: /overflowed/ },
        { code: s => s.starter.replace('___', 'e'), hint: /Divide them by their sum/ },
      ],
      repair: [{ code: s => s.starter, hint: /That is \(∂L\/∂W\)ᵀ/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => delta('    return delta @ W.T'), hint: /ReLU step is missing/ },
        { code: () => delta('    return (delta @ W.T) * np.maximum(0, Z_prev)'), hint: /slope is 1 where Z > 0/ },
      ],
    },
  },
}
