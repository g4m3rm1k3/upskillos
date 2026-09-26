// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const rb = body => `def rollback_day(control, canary, tol, persist):\n${body}\n`
export const verify = {
  release: {
    pass: {
      agree: s => s.starter.replace('    "latency": True,\n', '    "latency": True,\n    "sanity": cand_mae >= 0.6 * noise_floor,\n'),
      fill: [s => s.starter.replace('___', '[major, minor + 1, 0]'), s => s.starter.replace('___', '(major, minor + 1, 0)')],
      repair: [s => s.starter.replace('np.mean(cand_slices) <= (1 + tol) * np.mean(prod_slices)', 'np.all(cand_slices <= (1 + tol) * prod_slices)')],
      implement: [
        () => rb('    run = 0\n    for d in range(len(control)):\n        run = run + 1 if canary[d] > (1 + tol) * control[d] else 0\n        if run == persist:\n            return d\n    return -1'),
        () => rb('    bad = [c > (1 + tol) * p for p, c in zip(control, canary)]\n    for d in range(persist - 1, len(bad)):\n        if all(bad[d - persist + 1:d + 1]):\n            return d\n    return -1'),
      ],
    },
    fail: {
      agree: [
        { code: s => s.starter, message: /Add a sanity gate/ },
        { code: s => s.starter.replace('    "latency": True,\n', '    "latency": True,\n    "sanity": True,\n'), message: /still promoted/ },
      ],
      fill: [
        { code: s => s.starter.replace('___', '[major, minor + 1, patch]'), hint: /resets the patch/ },
        { code: s => s.starter.replace('___', '[major + 1, 0, 0]'), hint: /minor change, not a major/ },
      ],
      repair: [{ code: s => s.starter, hint: /averages over slices/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => rb('    for d in range(len(control)):\n        if canary[d] > (1 + tol) * control[d]:\n            return d\n    return -1'), hint: /first bad day/ },
        { code: () => rb('    k = 0\n    for d in range(len(control)):\n        if canary[d] > (1 + tol) * control[d]:\n            k += 1\n        if k == persist:\n            return d\n    return -1'), hint: /restart after a good day/ },
      ],
    },
  },
}
