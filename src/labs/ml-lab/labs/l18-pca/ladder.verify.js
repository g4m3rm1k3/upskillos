// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const share = body => `import numpy as np\n\ndef explained_share(X):\n${body}\n`
export const verify = {
  pca: {
    pass: {
      agree: s => s.starter.replace('center = 0', 'center = 1'),
      fill: [s => s.starter.replace('___', 'Xc.T @ Xc / len(X)'), s => s.starter.replace('___', 'np.cov(X, rowvar=False, bias=True)')],
      repair: [s => s.starter.replace('return (Xc @ Vk.T) @ Vk', 'return mean + (Xc @ Vk.T) @ Vk')],
      implement: [
        () => share('    Xc = X - X.mean(axis=0)\n    S = np.linalg.svd(Xc, compute_uv=False)\n    return S ** 2 / np.sum(S ** 2)'),
        () => share('    lam = np.sort(np.linalg.eigvalsh(np.cov(X, rowvar=False)))[::-1]\n    return lam / lam.sum()'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /center = 1/ }],
      fill: [
        { code: s => s.starter.replace('___', 'np.cov(X, rowvar=False)'), hint: /n − 1/ },
        { code: s => s.starter.replace('___', 'X.T @ X / len(X)'), hint: /not centred/ },
      ],
      repair: [{ code: s => s.starter, hint: /Add the mean back/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => share('    lam = np.linalg.eigvalsh(np.cov(X, rowvar=False))\n    return lam / lam.sum()'), hint: /Largest first/ },
        { code: () => share('    return np.sort(np.linalg.eigvalsh(np.cov(X, rowvar=False, bias=True)))[::-1]'), hint: /Divide each by their total/ },
      ],
    },
  },
}
