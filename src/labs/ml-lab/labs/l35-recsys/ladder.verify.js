// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const nd = body => `import numpy as np\n\ndef ndcg_at_k(recs, held_out, k):\n${body}\n`
export const verify = {
  recsys: {
    pass: {
      agree: s => s.starter.replace('time_aware = 0 ', 'time_aware = 1 '),
      fill: [s => s.starter.replace('___', 'a @ b / (np.linalg.norm(a) * np.linalg.norm(b))'), s => s.starter.replace('___', 'np.sum(a * b) / np.sqrt(np.sum(a * a) * np.sum(b * b))')],
      repair: [s => s.starter.replace('return [int(i) for i in order][:k]', 'return [int(i) for i in order if not seen[i]][:k]')],
      implement: [
        () => nd('    top = list(recs[:k])\n    if held_out not in top:\n        return 0.0\n    return 1 / np.log2(top.index(held_out) + 2)'),
        () => nd('    hits = np.where(np.asarray(recs[:k]) == held_out)[0]\n    return float(1 / np.log2(hits[0] + 2)) if len(hits) else 0.0'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /time_aware = 1/ }],
      fill: [
        { code: s => s.starter.replace('___', 'a @ b / (a.sum() * b.sum())'), hint: /product of the vector lengths/ },
        { code: s => s.starter.replace('___', 'a @ b'), hint: /raw co-occurrence/ },
      ],
      repair: [{ code: s => s.starter, hint: /already opened/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => nd('    top = list(recs[:k])\n    if held_out not in top:\n        return 0.0\n    p = top.index(held_out)\n    return 1.0 if p == 0 else 1 / np.log2(p + 1)'), hint: /Positions count from 1/ },
        { code: () => nd('    top = list(recs)\n    if held_out not in top:\n        return 0.0\n    return 1 / np.log2(top.index(held_out) + 2)'), hint: /Only the top k count/ },
      ],
    },
  },
}
