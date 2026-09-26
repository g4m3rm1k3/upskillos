// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const fs = body => `def forward_splits(n, k):\n${body}\n`
export const verify = {
  capstone: {
    pass: {
      agree: s => s.starter.replace('time_order = 0 ', 'time_order = 1 '),
      fill: [s => s.starter.replace('___', 'n - int(n * test_fraction)')],
      repair: [s => s.starter.replace('    if point > threshold:\n        return 1\n    return 3', '    if lo > threshold:\n        return 1\n    if point > threshold:\n        return 2\n    return 3')],
      implement: [
        () => fs('    sizes = [n // k + (1 if f < n % k else 0) for f in range(k)]\n    starts = [sum(sizes[:f]) for f in range(k)]\n    return [[starts[f], starts[f] + sizes[f]] for f in range(1, k)]'),
        () => fs('    import numpy as np\n    blocks = np.array_split(np.arange(n), k)\n    return [[int(b[0]), int(b[-1]) + 1] for b in blocks[1:]]'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /time_order = 1/ }],
      fill: [{ code: s => s.starter.replace('___', 'int(n * test_fraction)'), hint: /size of the test set/ }],
      repair: [{ code: s => s.starter, hint: /point estimate alone/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => fs('    import numpy as np\n    blocks = np.array_split(np.arange(n), k)\n    return [[int(b[0]), int(b[-1]) + 1] for b in blocks]'), hint: /Leave out the first block/ },
      ],
    },
  },
}
