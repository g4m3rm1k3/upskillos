// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const head = 'import numpy as np\n\ndef alarm_counts(n, prior, sens, fa):\n'
export const verify = {
  bayes: {
    pass: {
      agree: s => s.starter.replace('n = 1000', 'n = 100_000'),
      fill: [s => s.starter.replace('___', 'prior * sens / (prior * sens + (1 - prior) * fa)')],
      repair: [s => s.starter.replace('return sens / (sens + fa)', 'return prior * sens / (prior * sens + (1 - prior) * fa)')],
      implement: [() => head + '    faulty, healthy = n * prior, n * (1 - prior)\n    return np.array([faulty * sens, healthy * fa, faulty * (1 - sens), healthy * (1 - fa)])\n'],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /Set `n = 100_000`/ }],
      fill: [
        { code: s => s.starter.replace('___', 'prior * sens'), hint: /P\(fault and alarm\)/ },
        { code: s => s.starter.replace('___', 'sens'), hint: /reverse conditional/ },
      ],
      repair: [{ code: s => s.starter, hint: /prior is missing/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => head + '    faulty, healthy = n * prior, n * (1 - prior)\n    return np.array([faulty * sens, faulty * (1 - sens), healthy * fa, healthy * (1 - fa)])\n', hint: /swapped/ },
      ],
    },
  },
}
