// Lab 04 runnable cells and math ↔ code tables, keyed by lesson id.
// Every exact formula is paired with a seeded simulation that checks it.
const DICE = `import numpy as np
rng = np.random.default_rng(1)`

const POSTERIOR = `def posterior(prior, sensitivity, false_alarm):
    true_alarms = sensitivity * prior
    false_alarms = false_alarm * (1 - prior)
    return true_alarms / (true_alarms + false_alarms)`

export const extras = {
  'l04-frequency': {
    mathCode: {
      rows: [
        ['$\\hat p = \\frac{\\#\\{A\\}}{n}$', 'np.mean(a + b == 7)', 'The fraction of trials where the event happened.'],
        ['$\\operatorname{SE} = \\sqrt{\\hat p(1-\\hat p)/n}$', 'np.sqrt(p_hat * (1 - p_hat) / n)', 'The typical size of the simulation error.'],
      ],
    },
    notebook: {
      title: 'Lab 04.1 · Probability as long-run frequency',
      intro: 'Estimate P(sum = 7) by simulation, attach an error bar, and see how the error shrinks with n.',
      cells: [{
        title: 'Simulate two dice',
        prose: '**Predict** the printed fraction to two decimals. **Then change** the seed.',
        code: DICE + `
n = 100_000
a = rng.integers(1, 7, size=n)       # upper bound 7 is excluded: values 1..6
b = rng.integers(1, 7, size=n)
p_hat = np.mean(a + b == 7)
print(p_hat, "exact:", 6 / 36)`,
      }, {
        title: 'Error shrinks like 1/√n',
        prose: '**Predict**: how many times more trials does it take to make the standard error 10 times smaller?',
        code: `for n in [100, 10_000, 1_000_000]:
    a = rng.integers(1, 7, size=n); b = rng.integers(1, 7, size=n)
    p_hat = np.mean(a + b == 7)
    se = np.sqrt(p_hat * (1 - p_hat) / n)
    print(f"n = {n:>9,}  estimate = {p_hat:.4f}  ± {se:.4f}")`,
      }, {
        title: 'Seeds show the chance variation',
        prose: 'Five seeds, 100 trials each. The spread you see is the error bar, measured directly.',
        code: `for seed in range(5):
    r = np.random.default_rng(seed)
    print(seed, np.mean(r.integers(1, 7, 100) + r.integers(1, 7, 100) == 7))`,
      }],
    },
  },
  'l04-distributions': {
    mathCode: {
      rows: [
        ['$P(S = s)$', 'np.mean(s == value)', 'Probability mass, estimated.'],
        ['$F(x) = P(X \\le x)$', 'np.mean(sample <= x)', 'The empirical cumulative distribution.'],
        ['$P(\\mu - \\sigma < X \\le \\mu + \\sigma)$', 'np.mean(np.abs(z - mu) <= sigma)', 'About 0.68 for a normal distribution.'],
      ],
    },
    notebook: {
      title: 'Lab 04.2 · Distributions: mass, density, CDF',
      intro: 'Tabulate the dice-sum distribution, check the normal 68–95 rule, and compute a CDF.',
      cells: [{
        title: 'The probability mass function of a dice sum',
        prose: '**Predict** the most likely sum and its probability.',
        code: DICE + `
s = rng.integers(1, 7, 100_000) + rng.integers(1, 7, 100_000)
for value in range(2, 13):
    exact = (6 - abs(value - 7)) / 36
    print(f"{value:>2}: simulated {np.mean(s == value):.4f}   exact {exact:.4f}")`,
      }, {
        title: 'The normal 68–95 rule',
        prose: '**Predict** both fractions.',
        code: `z = rng.normal(loc=10, scale=2, size=100_000)
print("within 1 sigma:", np.mean(np.abs(z - 10) <= 2))
print("within 2 sigma:", np.mean(np.abs(z - 10) <= 4))`,
      }, {
        title: 'A CDF, exact and empirical',
        prose: 'One die. **Predict** F(2) = P(X ≤ 2) and P(2 < X ≤ 5).',
        code: `die = rng.integers(1, 7, 100_000)
F = lambda x: np.mean(die <= x)
print("F(2) ≈", F(2), "  exact", 2 / 6)
print("P(2 < X <= 5) ≈", F(5) - F(2), "  exact", 3 / 6)`,
      }],
    },
  },
  'l04-expectation': {
    mathCode: {
      rows: [
        ['$E[X] = \\sum_x x\\,P(X = x)$', 'np.sum(values * probs)', 'Probability-weighted average.'],
        ['$\\operatorname{Var}[X] = E[(X - \\mu)^2]$', 'np.sum((values - mu) ** 2 * probs)', 'Expected squared distance from the mean.'],
        ['$\\operatorname{Var}[\\bar X_n] = \\sigma^2 / n$', 'means.var()  # across many repeats', 'Averages vary less.'],
      ],
    },
    notebook: {
      title: 'Lab 04.3 · Expectation and variance',
      intro: 'Compute E and Var of a die exactly, check linearity and additivity by simulation, and measure how much averages vary.',
      cells: [{
        title: 'One die, exactly',
        prose: '**Predict** E[X] and Var[X].',
        code: `import numpy as np
values = np.arange(1, 7)
probs = np.full(6, 1 / 6)
mu = np.sum(values * probs)
var = np.sum((values - mu) ** 2 * probs)
print("E[X] =", mu, "  Var[X] =", var, "  sd =", np.sqrt(var))`,
      }, {
        title: 'Two dice: means add, and (independent) variances add',
        prose: '**Predict** the mean and variance of the sum before running.',
        code: `rng = np.random.default_rng(0)
s = rng.integers(1, 7, 200_000) + rng.integers(1, 7, 200_000)
print("mean:", s.mean(), "  expected", 2 * mu)
print("var :", s.var(), "  expected", 2 * var)`,
      }, {
        title: 'Averages vary less: σ²/n',
        prose: 'Repeat “average 25 rolls” 10,000 times. **Predict** the variance of those averages. **Then change** 25 to 100.',
        code: `n = 25
means = rng.integers(1, 7, size=(10_000, n)).mean(axis=1)
print("variance of the averages:", means.var(), "  σ²/n =", var / n)`,
      }],
    },
  },
  'l04-conditional': {
    mathCode: {
      rows: [
        ['$P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}$', 'np.sum(fault & alarm) / np.sum(alarm)', 'Restrict to B, then count A.'],
        ['$P(B \\mid A)$', 'np.sum(fault & alarm) / np.sum(fault)', 'Same numerator, different group.'],
        ['independence', 'np.isclose(np.mean(a & b), np.mean(a) * np.mean(b))', 'P(A ∩ B) = P(A)·P(B).'],
      ],
    },
    notebook: {
      title: 'Lab 04.4 · Conditioning restricts the group',
      intro: 'Rebuild the 1,000-machine table, compute both conditionals, and see that they divide by different groups.',
      cells: [{
        title: 'The table from the lesson',
        prose: '**Predict** P(fault | alarm) and P(alarm | fault).',
        code: `import numpy as np
fault = np.array([True] * 20 + [False] * 980)
alarm = np.concatenate([[True] * 18 + [False] * 2,        # 18 of 20 faulty machines alarm
                        [True] * 49 + [False] * 931])      # 49 of 980 healthy machines alarm
print("P(fault | alarm) =", np.sum(fault & alarm) / np.sum(alarm))
print("P(alarm | fault) =", np.sum(fault & alarm) / np.sum(fault))`,
      }, {
        title: 'Change the base rate, not the detector',
        prose: '**Predict** which of the two numbers changes when faults become more common.',
        code: `rng = np.random.default_rng(0)
for base in [0.001, 0.02, 0.3]:
    f = rng.random(200_000) < base
    a = np.where(f, rng.random(f.size) < 0.9, rng.random(f.size) < 0.05)
    print(f"base {base:<5}: P(fault|alarm) = {np.sum(f & a) / np.sum(a):.3f}   P(alarm|fault) = {np.sum(f & a) / np.sum(f):.3f}")`,
      }, {
        title: 'Independent or not?',
        prose: 'Two separate dice are independent; fault and alarm are not. **Predict** which pair satisfies P(A ∩ B) ≈ P(A)·P(B).',
        code: `d1, d2 = rng.integers(1, 7, 100_000), rng.integers(1, 7, 100_000)
A, B = d1 == 6, d2 == 6
print("dice :", np.mean(A & B), "vs", np.mean(A) * np.mean(B))
print("alarm:", np.mean(fault & alarm), "vs", np.mean(fault) * np.mean(alarm))`,
      }],
    },
  },
  'l04-bayes': {
    mathCode: {
      rows: [
        ['$P(F)$', 'prior', 'Fault rate before any evidence.'],
        ['$P(A \\mid F)$', 'sensitivity', 'How expected the alarm is if there is a fault.'],
        ['$P(A \\mid \\neg F)$', 'false_alarm', 'How often healthy machines alarm.'],
        ['$P(F \\mid A) = \\frac{P(A\\mid F)P(F)}{P(A\\mid F)P(F) + P(A\\mid\\neg F)P(\\neg F)}$', 'posterior(prior, sensitivity, false_alarm)', 'The updated belief.'],
      ],
    },
    notebook: {
      title: 'Lab 04.5 · Bayes’ rule and the base rate',
      intro: 'Turn Bayes’ rule into a function, reproduce the lesson’s 0.154, and find what it takes to make most alarms real.',
      cells: [{
        title: 'Bayes’ rule as a function',
        prose: '**Predict** the posterior for prior 1%, sensitivity 90%, false alarms 5%.',
        code: POSTERIOR + `

print(posterior(0.01, 0.9, 0.05))`,
      }, {
        title: 'Counting people instead of probabilities',
        prose: 'The same answer from a population of 10,000 machines.',
        code: `n = 10_000
faulty = 0.01 * n
true_alarms = 0.9 * faulty
false_alarms = 0.05 * (n - faulty)
print(f"{true_alarms:.0f} true alarms, {false_alarms:.0f} false alarms → {true_alarms / (true_alarms + false_alarms):.3f}")`,
      }, {
        title: 'What makes most alarms real?',
        prose: '**Predict** the false-alarm rate needed for a posterior above 0.5. **Then change** the prior instead.',
        code: `for fa in [0.05, 0.02, 0.01, 0.009, 0.005]:
    print(f"false alarms {fa:<6} → posterior {posterior(0.01, 0.9, fa):.3f}")`,
      }],
    },
  },
  'l04-verify': {
    mathCode: {
      rows: [
        ['$n_{\\text{relevant}}$', 'n_alarms = np.sum(alarm)', 'For P(fault | alarm), only alarms count.'],
        ['$\\operatorname{SE}$', 'np.sqrt(p_hat * (1 - p_hat) / n_alarms)', 'Error bar for the simulated conditional.'],
        ['$|\\hat p - p| / \\operatorname{SE}$', 'abs(p_hat - p_exact) / se', 'Above about 3: suspect a bug.'],
      ],
    },
    notebook: {
      title: 'Lab 04.6 · Check the formula by simulation',
      intro: 'Simulate the alarm system, compare with the exact posterior in units of standard error, and catch a deliberately planted bug.',
      cells: [{
        title: 'Simulate, then compare in standard errors',
        prose: '**Predict** roughly how many alarms 100,000 machines produce at a 1% base rate.',
        code: `import numpy as np
` + POSTERIOR + `

def simulate(n, prior=0.01, sens=0.9, fa=0.05, seed=0):
    rng = np.random.default_rng(seed)
    fault = rng.random(n) < prior
    alarm = np.where(fault, rng.random(n) < sens, rng.random(n) < fa)
    return fault, alarm

fault, alarm = simulate(100_000)
p_hat = np.sum(fault & alarm) / np.sum(alarm)
se = np.sqrt(p_hat * (1 - p_hat) / np.sum(alarm))
exact = posterior(0.01, 0.9, 0.05)
print(f"alarms: {np.sum(alarm)}, simulated {p_hat:.4f} ± {se:.4f}, exact {exact:.4f}, off by {abs(p_hat - exact) / se:.1f} SE")`,
      }, {
        title: 'A planted bug',
        prose: 'This version divides by the number of **faults** instead of alarms. **Predict** how many standard errors off it is.',
        code: `buggy = np.sum(fault & alarm) / np.sum(fault)
print(f"buggy {buggy:.4f} vs exact {exact:.4f}: off by {abs(buggy - exact) / se:.0f} SE")`,
      }, {
        title: 'Too small to tell',
        prose: 'With 100 machines there may be only a handful of alarms. **Predict** the error bar. If the estimate comes out as exactly 0 or 1, the formula reports an error bar of 0 — false confidence, not precision: with four alarms, almost any value between 0 and 0.5 is plausible. **Then change** the seed a few times.',
        code: `fault, alarm = simulate(100, seed=3)
k = np.sum(alarm)
p_hat = np.sum(fault & alarm) / max(k, 1)
print(f"{k} alarms, estimate {p_hat:.3f} ± {np.sqrt(p_hat * (1 - p_hat) / max(k, 1)):.3f}")`,
      }],
    },
  },
}
