// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const rows = body => `import numpy as np\n\ndef lag_rows(y, lags, h):\n${body}\n`
export const verify = {
  forecast: {
    pass: {
      agree: s => s.starter.replace('centered = 1', 'centered = 0'),
      fill: [s => s.starter.replace('___', 'np.sum(d[k:] * d[:-k])')],
      repair: [
        s => s.starter.replace('return y[t + h - s]', 'return y[t + h - s * int(np.ceil(h / s))]'),
        s => s.starter.replace('return y[t + h - s]', 'i = t + h - s\n    while i > t:\n        i -= s\n    return y[i]'),
      ],
      implement: [
        () => rows('    return np.array([[y[t - l] for l in lags] + [y[t + h]] for t in range(max(lags), len(y) - h)])'),
        () => rows('    ts = np.arange(lags.max(), len(y) - h)\n    return np.column_stack([y[ts - l] for l in lags] + [y[ts + h]])'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /centered = 0/ }],
      fill: [
        { code: s => s.starter.replace('___ / np.sum(d ** 2)', 'np.sum(d[k:] * d[:-k])'), hint: /numerator alone/ },
        { code: s => s.starter.replace('d = y - y.mean()', 'd = y').replace('___', 'np.sum(d[k:] * d[:-k])'), hint: /Subtract the mean/ },
      ],
      repair: [{ code: s => s.starter, hint: /not known yet/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => rows('    return np.array([[y[t + l] for l in lags] + [y[t + h]] for t in range(max(lags), len(y) - h)])'), hint: /FORWARD/ },
      ],
    },
  },
}
