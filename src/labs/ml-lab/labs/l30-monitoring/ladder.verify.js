// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const ead = body => `def error_alert_day(errors, threshold, persist, delay):\n${body}\n`
export const verify = {
  monitor: {
    pass: {
      agree: s => s.starter.replace('threshold = 0.1 ', 'threshold = float(np.percentile(quiet, 99)) '),
      fill: [s => s.starter.replace('___', 'np.sum((a - e) * np.log(a / e))'), s => s.starter.replace('___', 'float(((a - e) * (np.log(a) - np.log(e))).sum())')],
      repair: [s => s.starter.replace('if run >= persist:', 'if run == persist:')],
      implement: [
        () => ead('    run = 0\n    for d, v in enumerate(errors):\n        run = run + 1 if v > threshold else 0\n        if run == persist:\n            return d + delay\n    return -1'),
        () => ead('    for d in range(persist - 1, len(errors)):\n        if all(e > threshold for e in errors[d - persist + 1:d + 1]):\n            return d + delay\n    return -1'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /percentile\(quiet, 99\)/ }],
      fill: [
        { code: s => s.starter.replace('___', 'np.sum(a * np.log(a / e))'), hint: /not a · ln/ },
        { code: s => s.starter.replace('___', 'np.sum((a - e) * np.log(e / a))'), hint: /sign is flipped/ },
      ],
      repair: [{ code: s => s.starter, hint: /every day of an episode/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => ead('    run = 0\n    for d, v in enumerate(errors):\n        run = run + 1 if v > threshold else 0\n        if run == persist:\n            return d\n    return -1'), hint: /add the label delay/ },
        { code: () => ead('    for d, v in enumerate(errors):\n        if v > threshold:\n            return d + delay\n    return -1'), hint: /N consecutive/ },
      ],
    },
  },
}
