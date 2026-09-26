// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const mb = body => `def min_batch(rate, overhead_ms, per_item_ms, max_b):\n${body}\n`
export const verify = {
  serve: {
    pass: {
      agree: s => s.starter.replace('use_saved_stats = 0', 'use_saved_stats = 1'),
      fill: [s => s.starter.replace('___', '1000 * B / (overhead_ms + per_item_ms * B)')],
      repair: [s => s.starter.replace('np.mean(np.abs(served - offline))', 'np.max(np.abs(served - offline))')],
      implement: [
        () => mb('    for B in range(1, max_b + 1):\n        if 1000 * B / (overhead_ms + per_item_ms * B) >= 1.25 * rate:\n            return B\n    return 0'),
        () => mb('    ok = [B for B in range(1, max_b + 1) if 1000 * B / (overhead_ms + per_item_ms * B) >= 1.25 * rate]\n    return ok[0] if ok else 0'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /use_saved_stats = 1/ }],
      fill: [
        { code: s => s.starter.replace('___', '1000 / (overhead_ms + per_item_ms * B)'), hint: /batches per second/ },
        { code: s => s.starter.replace('___', '1000 * B / (overhead_ms + per_item_ms)'), hint: /o \+ p·B/ },
      ],
      repair: [{ code: s => s.starter, hint: /mean difference/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => mb('    for B in range(1, max_b + 1):\n        if 1000 * B / (overhead_ms + per_item_ms * B) >= rate:\n            return B\n    return 0'), hint: /headroom/ },
      ],
    },
  },
}
