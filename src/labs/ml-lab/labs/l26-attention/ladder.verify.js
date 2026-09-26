// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const att = body => `import numpy as np\n\ndef attention(Q, K, V):\n${body}\n`
const good = '    S = Q @ K.T / np.sqrt(Q.shape[1])\n    W = np.exp(S - S.max(axis=1, keepdims=True))\n    W /= W.sum(axis=1, keepdims=True)\n    return W @ V'
export const verify = {
  attn: {
    pass: {
      agree: s => s.starter.replace('scaled = False', 'scaled = True'),
      fill: [s => s.starter.replace('___', 'Q @ K.T / np.sqrt(d)'), s => s.starter.replace('___', 'np.dot(Q, K.T) / d ** 0.5')],
      repair: [s => s.starter.replace('S[np.tril(np.ones((T, T), bool), k=-1)] = -np.inf', 'S[np.triu(np.ones((T, T), bool), k=1)] = -np.inf')],
      implement: [
        () => att(good),
        () => att('    S = Q @ K.T / np.sqrt(Q.shape[1])\n    E = np.exp(S - S.max(axis=1)[:, None])\n    return (E / E.sum(axis=1)[:, None]) @ V'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /scaled = True/ }],
      fill: [
        { code: s => s.starter.replace('___', 'Q @ K.T'), hint: /Unscaled/ },
        { code: s => s.starter.replace('___', 'Q @ K.T / d'), hint: /divides by d/ },
      ],
      repair: [
        { code: s => s.starter, hint: /hides the earlier tokens/ },
        { code: s => s.starter.replace('    S[np.tril(np.ones((T, T), bool), k=-1)] = -np.inf\n', ''), hint: /Nothing is masked/ },
      ],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => att('    S = Q @ K.T\n    W = np.exp(S - S.max(axis=1, keepdims=True))\n    W /= W.sum(axis=1, keepdims=True)\n    return W @ V'), hint: /Divide the scores by √d/ },
        { code: () => att('    S = Q @ K.T / np.sqrt(Q.shape[1])\n    W = np.exp(S - S.max(axis=0, keepdims=True))\n    W /= W.sum(axis=0, keepdims=True)\n    return W @ V'), hint: /down each column/ },
      ],
    },
  },
}
