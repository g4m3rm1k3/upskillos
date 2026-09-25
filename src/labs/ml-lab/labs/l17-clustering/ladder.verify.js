// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const sil = (aLine, sLine = '        s[i] = (b - a) / max(a, b)') => `import numpy as np\n\ndef silhouette(X, labels):\n    D = np.sqrt(((X[:, None, :] - X[None, :, :]) ** 2).sum(axis=2))\n    s = np.zeros(len(X))\n    for i in range(len(X)):\n        own = labels == labels[i]\n${aLine}\n        b = min(D[i, labels == j].mean() for j in np.unique(labels) if j != labels[i])\n${sLine}\n    return s\n`
const honestA = '        own[i] = False\n        a = D[i, own].mean()'
export const verify = {
  kmeans: {
    pass: {
      agree: s => s.starter.replace('scale = 0', 'scale = 1'),
      fill: [s => s.starter.replace('___', 'np.argmin(d2, axis=1)'), s => s.starter.replace('___', 'd2.argmin(axis=1)')],
      repair: [s => s.starter.replace('.mean()', '.mean(axis=0)')],
      implement: [
        () => sil(honestA),
        () => sil('        a = D[i, own].sum() / (own.sum() - 1)'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /scale = 1/ }],
      fill: [
        { code: s => s.starter.replace('___', 'np.argmax(d2, axis=1)'), hint: /FARTHEST/ },
        { code: s => s.starter.replace('___', 'np.argmin(d2, axis=0)'), hint: /one label per point/ },
      ],
      repair: [{ code: s => s.starter, hint: /one number repeated/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => sil('        a = D[i, own].mean()'), hint: /zero distance to itself/ },
        { code: () => sil(honestA, '        s[i] = (a - b) / max(a, b)'), hint: /sign is reversed/ },
      ],
    },
  },
}
