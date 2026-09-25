// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const oob = body => `import numpy as np\n\ndef oob_predict(preds, inbag):\n${body}\n`
export const verify = {
  bag: {
    pass: {
      agree: s => s.starter.replace('n_trees = 1', 'n_trees = 50'),
      fill: [s => s.starter.replace('___', '~np.isin(np.arange(n), idx)'), s => s.starter.replace('___', 'np.bincount(np.asarray(idx, dtype=np.int32), minlength=n) == 0')],
      repair: [s => s.starter.replace('sigma2 / T', 'rho * sigma2 + (1 - rho) * sigma2 / T')],
      implement: [
        () => oob('    out = 1 - inbag\n    return (preds * out).sum(axis=0) / out.sum(axis=0)'),
        () => oob('    return np.array([preds[inbag[:, i] == 0, i].mean() for i in range(preds.shape[1])])'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /n_trees = 50/ }],
      fill: [{ code: s => s.starter.replace('___', 'np.isin(np.arange(n), idx)'), hint: /WERE drawn/ }],
      repair: [{ code: s => s.starter, hint: /independent trees/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => oob('    return preds.mean(axis=0)'), hint: /averages every tree/ },
      ],
    },
  },
}
