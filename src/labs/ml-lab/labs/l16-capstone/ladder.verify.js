// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const seg = body => `import numpy as np\n\ndef segment_mae(y, pred, seg, S):\n${body}\n`
export const verify = {
  oof: {
    pass: {
      agree: s => s.starter.replace('use_failed_tests = 1', 'use_failed_tests = 0'),
      fill: [s => s.starter.replace('___', 'np.sqrt(np.mean((y - pred) ** 2))')],
      repair: [s => s.starter.replace('np.polyfit(x, y, 1)', 'np.polyfit(x[~test], y[~test], 1)')],
      implement: [
        () => seg('    err = np.abs(y - pred)\n    return np.array([err[seg == s].mean() for s in range(S)])'),
        () => seg('    out = np.zeros(S)\n    for s in range(S):\n        out[s] = np.mean(np.abs(y[seg == s] - pred[seg == s]))\n    return out'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /use_failed_tests = 0/ }],
      fill: [
        { code: s => s.starter.replace('___', 'np.mean(np.abs(y - pred))'), hint: /That is the MAE/ },
        { code: s => s.starter.replace('___', 'np.mean((y - pred) ** 2)'), hint: /mean squared error/ },
      ],
      repair: [{ code: s => s.starter, hint: /ALL the rows/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => seg('    return np.array([np.sqrt(np.mean((y[seg == s] - pred[seg == s]) ** 2)) for s in range(S)])'), hint: /RMSE per segment/ },
        { code: () => seg('    return np.array([np.mean(pred[seg == s] - y[seg == s]) for s in range(S)])'), hint: /cancelled/ },
      ],
    },
  },
}
