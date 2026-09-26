// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const rr = body => `def reciprocal_rank(ranking, relevant):\n${body}\n`
export const verify = {
  retrieval: {
    pass: {
      agree: s => s.starter.replace('filter_first = 0 ', 'filter_first = 1 '),
      fill: [s => s.starter.replace('___', 'np.log(N / df)'), s => s.starter.replace('___', 'np.log(N) - np.log(df)')],
      repair: [s => s.starter.replace('return found / k', 'return found / len(relevant)')],
      implement: [
        () => rr('    for i, doc in enumerate(ranking):\n        if doc in relevant:\n            return 1 / (i + 1)\n    return 0.0'),
        () => rr('    hits = [i for i, d in enumerate(ranking) if d in set(relevant.tolist())]\n    return 1 / (hits[0] + 1) if hits else 0'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /filter_first = 1/ }],
      fill: [
        { code: s => s.starter.replace('___', 'np.log(df / N)'), hint: /upside down/ },
        { code: s => s.starter.replace('___', 'N / df'), hint: /natural logarithm/ },
      ],
      repair: [{ code: s => s.starter, hint: /precision@k/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => rr('    for i, doc in enumerate(ranking):\n        if doc in relevant:\n            return 1 / i if i else 1.0\n    return 0.0'), hint: /Ranks start at 1/ },
      ],
    },
  },
}
