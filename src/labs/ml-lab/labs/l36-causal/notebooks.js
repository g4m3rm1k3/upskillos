// Lab 36 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// Learners follow the playground's model: motivation drives both opting in to reminders and completing lessons; the true effect is 1 lesson.
// The simulation keeps both potential outcomes, so every estimate can be checked against the truth.

export const extras = {
  'l36-predict-vs-cause': {
    formulaTex: '$$\\begin{aligned} \\Delta &= \\mathrm{ATE} + B \\\\ B &= E[Y(0) \\mid T{=}1] - E[Y(0) \\mid T{=}0] \\end{aligned}$$',
    mathCode: {
      rows: [
        ['$Y(1), Y(0)$', 'd["y1"], d["y0"]', 'Both potential outcomes (only a simulation has both).'],
        ['$\\Delta$', 'y[t == 1].mean() - y[t == 0].mean()', 'The naive difference between the groups.'],
        ['ATE', 'np.mean(d["y1"] - d["y0"])', 'The average effect of reminders.'],
        ['$B$', 'd["y0"][t == 1].mean() - d["y0"][t == 0].mean()', 'Selection bias: how the groups differ even without reminders.'],
      ],
    },
    notebook: {
      title: 'Lab 36.1 · Predicting is not intervening',
      intro: 'The naive difference split into the effect and the selection bias — and a prediction model that reports the naive number.',
      cells: [
        {
          title: 'Effect and selection bias',
          prose: '**Predict** the coefficient of t in a prediction model y ~ 1 + t.',
          code: `import numpy as np
def population(n=2000, effect=1.0, confounding=1.5, proxy_noise=0.5, randomized=False, seed=36):
    """Learners (the playground's model): motivation drives both opting in to reminders and completing lessons.
    Both potential outcomes are kept — only possible in a simulation."""
    rng = np.random.default_rng(seed)
    motivation = rng.normal(size=n)
    past = motivation + proxy_noise * rng.normal(size=n)          # what we actually record: a noisy proxy
    p = np.full(n, 0.5) if randomized else 1 / (1 + np.exp(-confounding * motivation))
    t = (rng.random(n) < p).astype(int)
    y0 = 5 + 2 * motivation + 1.5 * rng.normal(size=n)           # lessons completed without reminders
    y1 = y0 + effect                                              # ... and with them
    y = np.where(t == 1, y1, y0)                                  # we observe only one
    return dict(motivation=motivation, past=past, t=t, y=y, y0=y0, y1=y1)

d = population()
ate = np.mean(d["y1"] - d["y0"])
naive = d["y"][d["t"] == 1].mean() - d["y"][d["t"] == 0].mean()
bias = d["y0"][d["t"] == 1].mean() - d["y0"][d["t"] == 0].mean()       # how different the groups were WITHOUT reminders
print(f"true average effect {ate:.2f}; naive difference {naive:.2f} = effect {ate:.2f} + selection bias {bias:.2f}")
print(f"motivation: opted in {d['motivation'][d['t'] == 1].mean():+.2f}, not {d['motivation'][d['t'] == 0].mean():+.2f}")

# A predictive model uses 'receives reminders' as a feature. Its coefficient is not the effect.
X = np.column_stack([np.ones(len(d["y"])), d["t"]])
coef = np.linalg.lstsq(X, d["y"], rcond=None)[0]
print(f"prediction model y ~ 1 + t: coefficient of t = {coef[1]:.2f} (the effect is {ate:.2f})")`,
        },
      ],
    },
  },
  'l36-adjust': {
    formulaTex: '$$\\hat\\tau_{\\mathrm{IPW}} = \\frac{\\sum_i t_i y_i / e_i}{\\sum_i t_i / e_i} - \\frac{\\sum_i (1 - t_i)\\,y_i / (1 - e_i)}{\\sum_i (1 - t_i) / (1 - e_i)}$$',
    mathCode: {
      rows: [
        ['strata', 'np.array_split(np.argsort(d[key]), 5)', 'Quintiles of past activity.'],
        ['$\\tau$ (regression)', 'lstsq([1, t, past], y)[0][1]', 'Effect holding past activity fixed.'],
        ['$e_i$', 'propensity(d)', 'Logistic model of P(treated | past), clipped to [0.01, 0.99].'],
        ['$\\hat\\tau_{\\mathrm{IPW}}$', 'np.sum(t*y/e)/np.sum(t/e) - ...', 'Weighted difference: each group made to resemble everyone.'],
      ],
    },
    notebook: {
      title: 'Lab 36.2 · Adjusting for confounders',
      intro: 'Three adjustments on a proxy that gets noisier, and what poor overlap does to the weights.',
      cells: [
        {
          title: 'Stratification, regression and IPW',
          prose: '**Predict** what happens to all three estimates as the proxy gets noisier.',
          code: `import numpy as np
def population(n=2000, effect=1.0, confounding=1.5, proxy_noise=0.5, randomized=False, seed=36):
    """Learners (the playground's model): motivation drives both opting in to reminders and completing lessons.
    Both potential outcomes are kept — only possible in a simulation."""
    rng = np.random.default_rng(seed)
    motivation = rng.normal(size=n)
    past = motivation + proxy_noise * rng.normal(size=n)          # what we actually record: a noisy proxy
    p = np.full(n, 0.5) if randomized else 1 / (1 + np.exp(-confounding * motivation))
    t = (rng.random(n) < p).astype(int)
    y0 = 5 + 2 * motivation + 1.5 * rng.normal(size=n)           # lessons completed without reminders
    y1 = y0 + effect                                              # ... and with them
    y = np.where(t == 1, y1, y0)                                  # we observe only one
    return dict(motivation=motivation, past=past, t=t, y=y, y0=y0, y1=y1)

def stratified(d, key="past", bins=5):
    order = np.argsort(d[key]); groups = np.array_split(order, bins); total = 0
    for g in groups:
        tg, yg = d["t"][g], d["y"][g]
        total += len(g) * (yg[tg == 1].mean() - yg[tg == 0].mean())
    return total / len(d["y"])

def regression(d, key="past"):
    X = np.column_stack([np.ones(len(d["y"])), d["t"], d[key]])
    return np.linalg.lstsq(X, d["y"], rcond=None)[0][1]

def propensity(d, key="past", steps=2000, lr=0.5):
    w = np.zeros(2); X = np.column_stack([np.ones(len(d["y"])), d[key]])
    for _ in range(steps):
        w -= lr * X.T @ (1 / (1 + np.exp(-X @ w)) - d["t"]) / len(d["y"])
    return np.clip(1 / (1 + np.exp(-X @ w)), 0.01, 0.99)

def ipw(d, key="past"):
    e, t, y = propensity(d, key), d["t"], d["y"]
    return np.sum(t * y / e) / np.sum(t / e) - np.sum((1 - t) * y / (1 - e)) / np.sum((1 - t) / (1 - e))

print("proxy noise   naive  stratified  regression   IPW    (true effect 1.00)")
for noise in [0.0, 0.5, 1.0, 2.0]:
    d = population(proxy_noise=noise)
    naive = d["y"][d["t"] == 1].mean() - d["y"][d["t"] == 0].mean()
    print(f"   {noise:.1f}       {naive:5.2f}    {stratified(d):5.2f}      {regression(d):5.2f}     {ipw(d):5.2f}")
e = propensity(population(confounding=3.0), key="motivation")
print(f"\\nstrong confounding (3.0): propensities below 0.05 or above 0.95 for {np.mean((e < 0.05) | (e > 0.95)):.0%} of learners; largest weight {max(1 / e.min(), 1 / (1 - e.max())):.0f}")`,
        },
      ],
    },
  },
  'l36-experiments': {
    formulaTex: '$$n \\approx \\frac{2\\,(z_{0.975} + z_{0.8})^2\\,\\sigma^2}{\\delta^2}$$',
    mathCode: {
      rows: [
        ['$\\sigma$', 'sd', 'Standard deviation of the outcome.'],
        ['$\\delta$', 'mde', 'Smallest effect worth detecting.'],
        ['$z$', 'z_a=1.959964, z_b=0.841621', 'Two-sided 5% test; 80% power.'],
        ['CI', 'diff ± 1.96 * np.sqrt(var1/n1 + var0/n0)', 'The interval of the randomized difference.'],
      ],
    },
    notebook: {
      title: 'Lab 36.3 · Randomized experiments',
      intro: 'A coin flip balances motivation; the sample size by formula and by simulation; a sample-ratio check.',
      cells: [
        {
          title: 'A randomized experiment',
          prose: '**Predict** whether the interval covers the true effect of 1.',
          code: `import numpy as np
def population(n=2000, effect=1.0, confounding=1.5, proxy_noise=0.5, randomized=False, seed=36):
    """Learners (the playground's model): motivation drives both opting in to reminders and completing lessons.
    Both potential outcomes are kept — only possible in a simulation."""
    rng = np.random.default_rng(seed)
    motivation = rng.normal(size=n)
    past = motivation + proxy_noise * rng.normal(size=n)          # what we actually record: a noisy proxy
    p = np.full(n, 0.5) if randomized else 1 / (1 + np.exp(-confounding * motivation))
    t = (rng.random(n) < p).astype(int)
    y0 = 5 + 2 * motivation + 1.5 * rng.normal(size=n)           # lessons completed without reminders
    y1 = y0 + effect                                              # ... and with them
    y = np.where(t == 1, y1, y0)                                  # we observe only one
    return dict(motivation=motivation, past=past, t=t, y=y, y0=y0, y1=y1)

d = population(randomized=True, seed=7)
a, b = d["y"][d["t"] == 1], d["y"][d["t"] == 0]
diff = a.mean() - b.mean(); se = np.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
print(f"randomized: {len(a)} vs {len(b)} learners; difference {diff:.2f}, 95% interval {diff - 1.96 * se:.2f} to {diff + 1.96 * se:.2f} (true effect 1.00)")
print(f"motivation balanced by the coin: {d['motivation'][d['t'] == 1].mean():+.3f} vs {d['motivation'][d['t'] == 0].mean():+.3f}")

def sample_size(sd, mde, z_a=1.959964, z_b=0.841621):
    return int(np.ceil(2 * (z_a + z_b) ** 2 * sd ** 2 / mde ** 2))
n = sample_size(2.5, 0.3)
print(f"\\nusers per arm for sd 2.5, smallest effect 0.3, 5% two-sided, 80% power: {n}")
rng = np.random.default_rng(3)
sig = [abs((rng.normal(0.3, 2.5, n).mean() - rng.normal(0, 2.5, n).mean()) / np.sqrt(2 * 2.5 ** 2 / n)) > 1.96 for _ in range(1000)]
print(f"simulated: {np.mean(sig):.0%} of 1,000 such experiments detect the effect")

# Sample-ratio mismatch: a 50/50 split that arrives as 5,200 / 4,800.
n1, n0 = 5200, 4800
z = (n1 - (n1 + n0) / 2) / np.sqrt((n1 + n0) * 0.25)
print(f"\\n{n1} vs {n0} under a 50/50 design: z = {z:.1f} — far beyond chance; find the bug before reading any result")`,
        },
      ],
    },
  },
  'l36-pitfalls': {
    formulaTex: '$$P(\\text{at least one false win in } m \\text{ tests}) = 1 - 0.95^m$$',
    mathCode: {
      rows: [
        ['peek', 'for m in looks: ... if abs(est / se) > 1.96: return', 'Stopping at the first significant look.'],
        ['winner’s curse', 'np.mean(significant)', 'The average estimate among significant experiments only.'],
        ['$m$', '20 metrics', 'Independent null metrics each tested at 5%.'],
      ],
    },
    notebook: {
      title: 'Lab 36.4 · Experiment pitfalls and honest claims',
      intro: 'Peeking, the winner’s curse and twenty metrics, simulated.',
      cells: [
        {
          title: 'Three ways to fool yourself',
          prose: '**Predict** the false-win rate with ten looks.',
          code: `import numpy as np
rng = np.random.default_rng(4)
def experiment(effect, per_arm, peek):
    a, b = rng.normal(5 + effect, 2.5, per_arm), rng.normal(5, 2.5, per_arm)
    looks = range(per_arm // 10, per_arm + 1, per_arm // 10) if peek else [per_arm]
    for m in looks:                                            # peek: test after every tenth, stop at the first p < 0.05
        est = a[:m].mean() - b[:m].mean(); se = np.sqrt(a[:m].var(ddof=1) / m + b[:m].var(ddof=1) / m)
        if abs(est / se) > 1.96:
            return est, True
    return est, False

for peek in (False, True):
    wins = np.mean([experiment(0.0, 200, peek)[1] for _ in range(2000)])
    print(f"no true effect, {'ten looks' if peek else 'one look '}: {wins:.1%} of experiments 'win'")

runs = [experiment(0.3, 200, False) for _ in range(2000)]
significant = [e for e, s in runs if s]
print(f"\\ntrue effect 0.3, 200 per arm: {len(significant) / len(runs):.0%} significant; their estimates average {np.mean(significant):.2f}")

metrics = rng.normal(size=(2000, 20))                          # 20 metrics, none truly affected (z-scores)
print(f"\\n20 null metrics: on average {np.mean(np.sum(np.abs(metrics) > 1.96, axis=1)):.2f} 'significant'; at least one in {np.mean(np.any(np.abs(metrics) > 1.96, axis=1)):.0%} of experiments")`,
        },
      ],
    },
  },
}
