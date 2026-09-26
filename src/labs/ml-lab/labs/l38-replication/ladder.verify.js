// Code that tools/verify-ladders.mjs runs through the real check harness (see labs/l03-matrices).
const pl = body => `def plan(costs, reach, budget):\n${body}\n`
export const verify = {
  replicate: {
    pass: {
      agree: s => s.starter.replace('report = "best" ', 'report = "mean" '),
      fill: [s => s.starter.replace('half = ___', 'half = t * d.std(ddof=1) / np.sqrt(len(d))'), s => s.starter.replace('half = ___', 'half = t * np.sqrt(np.sum((d - d.mean()) ** 2) / (len(d) - 1) / len(d))')],
      repair: [s => s.starter.replace('    if low <= claimed <= high:\n        return 1\n    if low <= 0:\n        return 3\n', '    if low <= 0:\n        return 3\n    if low <= claimed <= high:\n        return 1\n')],
      implement: [
        () => pl('    order = sorted(range(len(costs)), key=lambda i: (-reach[i] / costs[i], costs[i], i))\n    bought, spent = [], 0\n    for i in order:\n        if spent + costs[i] <= budget:\n            bought.append(i); spent += costs[i]\n    return sorted(bought)'),
      ],
    },
    fail: {
      agree: [{ code: s => s.starter, message: /report = "mean"/ }],
      fill: [
        { code: s => s.starter.replace('half = ___', 'half = t * d.std() / np.sqrt(len(d))'), hint: /ddof=1/ },
        { code: s => s.starter.replace('half = ___', 'half = t * d.std(ddof=1)'), hint: /Divide by √n/ },
      ],
      repair: [{ code: s => s.starter, hint: /check low <= 0 first/ }],
      implement: [
        { code: s => s.starter, text: /returned None/ },
        { code: () => pl('    bought, spent = [], 0\n    for i in range(len(costs)):\n        if spent + costs[i] <= budget:\n            bought.append(i); spent += costs[i]\n    return bought'), hint: /list order/ },
      ],
    },
  },
}
