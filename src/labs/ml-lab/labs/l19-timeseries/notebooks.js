// Lab 19 runnable cells, typeset formulas and math ↔ code tables, keyed by lesson id.
// The hourly usage series uses the playground's recipe (engine.js usage()) drawn with NumPy: the same
// trend, daily and weekly cycles, short-memory noise and spikes, with different random draws.

const USAGE = `import numpy as np

def usage(days=35, seed=2, noise=3.0):
    """Hourly CPU usage (%) with a trend, a daily cycle, quieter weekends, short-memory noise and spikes."""
    rng = np.random.default_rng(seed)
    n = days * 24
    y = np.empty(n); ar = 0.0
    for t in range(n):
        hour, dow = t % 24, (t // 24) % 7
        daily = 18 * max(0.0, np.sin(np.pi * (hour - 7) / 13))         # busy 07:00–20:00
        weekend = dow >= 5
        ar = 0.75 * ar + noise * rng.normal()                             # noise that remembers the last hour
        spike = 25 * rng.random() if rng.random() < 0.01 else 0.0
        y[t] = max(0.0, 30 + 0.02 * t + daily * (0.4 if weekend else 1) + (-12 if weekend else 0) + ar + spike)
    return y

y = usage()
EVAL = 21 * 24                                      # the last two weeks are the evaluation period
print(len(y), "hours;  first day's usage:", np.round(y[:24], 0))`

const FEATURES = `def features(y, t, h):
    """Features for forecasting y[t + h] from origin t: every index used is ≤ t."""
    target = t + h
    return np.array([y[t], y[t - 1], y[t - 2],
                     y[target - 24 * int(np.ceil(h / 24))],    # same hour, the latest day that is known
                     y[target - 168],                          # same hour last week
                     y[t - 23:t + 1].mean()])                  # mean of the last 24 hours
NAMES = ["y[t]", "y[t-1]", "y[t-2]", "same hour, last known day", "same hour last week", "mean of last 24 h"]`

const WALK = `from sklearn.linear_model import Ridge

def walk_forward(y, h, refit=24, start=EVAL, feats=features):
    """Forecast y[t + h] from every origin t in the evaluation period, refitting every \`refit\` origins
    on rows whose targets are already known (j + h ≤ t)."""
    preds, actual, model = [], [], None
    for i, t in enumerate(range(start, len(y) - h)):
        if i % refit == 0:
            rows = range(168, t - h + 1)                           # origins j with j + h ≤ t
            model = Ridge(alpha=1e-3).fit(np.array([feats(y, j, h) for j in rows]), np.array([y[j + h] for j in rows]))
        preds.append(model.predict(feats(y, t, h)[None])[0]); actual.append(y[t + h])
    return np.array(preds), np.array(actual)`

export const extras = {
  'l19-order': {
    formulaTex: '$$r_k = \\frac{\\sum_t (y_t - \\bar y)(y_{t-k} - \\bar y)}{\\sum_t (y_t - \\bar y)^2}$$',
    mathCode: {
      rows: [
        ['$y_t - \\bar y$', 'd = y - y.mean()', 'Deviations from the mean.'],
        ['$\\sum_t (y_t - \\bar y)(y_{t-k} - \\bar y)$', '(d[k:] * d[:-k]).sum()', 'Each value times the value k steps earlier, summed.'],
        ['$\\sum_t (y_t - \\bar y)^2$', '(d * d).sum()', 'The same with k = 0: the normalizer.'],
        ['$r_k$', 'acf[k]', 'The autocorrelation at lag k.'],
      ],
    },
    notebook: {
      title: 'Lab 19.1 · When order matters',
      intro: 'Build the usage series, compute the lesson’s small autocorrelation by hand, then the autocorrelation function of the whole series.',
      cells: [{
        title: 'The series',
        prose: 'Five weeks of hourly usage from the playground’s recipe. **Predict** roughly where the first day’s peak falls.',
        code: USAGE,
      }, {
        title: 'Autocorrelation by hand',
        prose: 'The lesson’s series [1, 2, 3, 2, 1]. **Predict** the numerator of r₁ before running.',
        code: `s = np.array([1.0, 2, 3, 2, 1])
d = s - s.mean()
num = (d[1:] * d[:-1]).sum()                  # Σ (y_t − ȳ)(y_{t−1} − ȳ) over t = 2…5
print("deviations", d, "  numerator", round(num, 3), "  r1 =", round(num / (d * d).sum(), 3))`,
      }, {
        title: 'The ACF of the usage series',
        prose: '**Predict** which lags beyond 1 hour are high.',
        code: `def acf(y, max_lag):
    d = y - y.mean(); c0 = (d * d).sum()
    return np.array([1.0] + [(d[k:] * d[:-k]).sum() / c0 for k in range(1, max_lag + 1)])
r = acf(y, 170)
for k in [1, 2, 6, 12, 24, 48, 168]:
    print(f"lag {k:3d} h: r = {r[k]:+.2f}")`,
        tryThis: 'Regenerate with noise=8. Which lags lose the most autocorrelation?',
      }],
    },
  },
  'l19-baselines': {
    formulaTex: '$$\\hat y^{\\text{pers}}_{t+h} = y_t$$ $$\\hat y^{\\text{seas}}_{t+h} = y_{t + h - 24\\lceil h/24\\rceil}$$ $$\\text{MASE} = \\frac{\\text{MAE}_{\\text{model}}}{\\text{MAE}_{\\text{seasonal naive}}}$$',
    mathCode: {
      rows: [
        ['$y_t$', 'y[t]', 'Persistence: the latest known value.'],
        ['$y_{t+h-24\\lceil h/24\\rceil}$', 'y[t + h - 24 * int(np.ceil(h / 24))]', 'Seasonal naive: the same hour on the latest day that is already known at t.'],
        ['MAE', 'np.mean(np.abs(pred - actual))', 'Mean absolute error, in CPU percentage points.'],
        ['MASE', 'mae_model / mae_seasonal', 'Below 1 means better than the seasonal-naive baseline.'],
      ],
    },
    notebook: {
      title: 'Lab 19.2 · Forecasting baselines',
      intro: 'Forecast with persistence and seasonal naive at several horizons, and see which baseline any model has to beat at each.',
      cells: [{
        title: 'The seasonal index, including h > 24',
        prose: 'Origin t = 100. **Predict** the index seasonal naive uses for h = 5 and for h = 30.',
        code: `import numpy as np
for t, h in [(100, 5), (100, 30), (100, 24)]:
    print(f"t = {t}, h = {h:2d}: target {t + h}, seasonal naive uses {t + h - 24 * int(np.ceil(h / 24))}")`,
      }, {
        title: 'Both baselines, horizon by horizon',
        prose: '**Predict** the smallest horizon at which seasonal naive beats persistence.',
        code: `${USAGE}
for h in [1, 2, 3, 4, 5, 6, 12, 24]:
    ts = np.arange(EVAL, len(y) - h)
    pers = np.mean(np.abs(y[ts] - y[ts + h]))
    seas = np.mean(np.abs(y[ts + h - 24 * int(np.ceil(h / 24))] - y[ts + h]))
    print(f"h = {h:2d}: persistence MAE {pers:5.2f}   seasonal naive MAE {seas:5.2f}   better: {'persistence' if pers < seas else 'seasonal naive' if seas < pers else 'tie'}")`,
      }],
    },
  },
  'l19-lags': {
    formulaTex: '$$x_t = f(y_1, \\dots, y_t)$$ $$(x_t,\\ y_{t+h}) \\text{ is one training row}$$',
    mathCode: {
      rows: [
        ['$x_t$', 'features(y, t, h)', 'The feature vector for origin t: y[t], y[t−1], y[t−2], the same hour on the latest known day, the same hour last week, and the last 24 hours’ mean.'],
        ['$y_{t-1}, y_{t-2}$', 'y[t - 1], y[t - 2]', 'Lag features: recent past values.'],
        ['$y_{t+h-168}$', 'y[t + h - 168]', 'The target’s hour, one week earlier.'],
        ['$\\bar y_{t-23..t}$', 'y[t - 23:t + 1].mean()', 'A trailing 24-hour mean: the current level.'],
        ['every index $\\le t$', 'max(indices) <= t', 'The check that no feature comes from after the origin.'],
      ],
    },
    notebook: {
      title: 'Lab 19.3 · Lag and rolling features',
      intro: 'Turn the series into a supervised table for one horizon, check that no feature reaches past the origin, and compare a lag regression with the baselines.',
      cells: [{
        title: 'One row, and the indices it uses',
        prose: 'Origin t = 500, horizon h = 6. **Predict** the largest index any feature uses.',
        code: `${USAGE}
${FEATURES}
t, h = 500, 6
indices = [t, t - 1, t - 2, t + h - 24 * int(np.ceil(h / 24)), t + h - 168] + list(range(t - 23, t + 1))
for name, value in zip(NAMES, features(y, t, h)):
    print(f"{name:26s} {value:6.2f}")
print("target y[t + h] =", round(y[t + h], 2), "  largest index used:", max(indices), "≤ t:", max(indices) <= t)`,
      }, {
        title: 'A lag regression against the baselines',
        prose: 'Walk-forward evaluation, refitting daily (the next lesson explains it). **Predict** at which horizons the regression gains most.',
        code: `${WALK}
for h in [1, 6, 24]:
    pred, actual = walk_forward(y, h)
    ts = np.arange(EVAL, len(y) - h)
    best_base = min(np.mean(np.abs(y[ts] - y[ts + h])), np.mean(np.abs(y[ts + h - 24 * int(np.ceil(h / 24))] - y[ts + h])))
    print(f"h = {h:2d}: lag regression MAE {np.mean(np.abs(pred - actual)):5.2f}   better baseline {best_base:5.2f}")`,
      }],
    },
  },
  'l19-walkforward': {
    formulaTex: '$$f_t = \\operatorname{fit}\\{(x_j, y_{j+h}) : j + h \\le t\\}$$ $$\\hat y_{t+h} = f_t(x_t)$$',
    mathCode: {
      rows: [
        ['$\\{j : j + h \\le t\\}$', 'range(168, t - h + 1)', 'Training rows whose targets are already known at t.'],
        ['$f_t$', 'Ridge().fit(...) at origin t', 'The model available at origin t; the forecast is f_t(x_t).'],
        ['refit schedule', 'if i % refit == 0: model = Ridge().fit(...)', 'Refit every `refit` origins, on an expanding window.'],
        ['forecast', 'model.predict(features(y, t, h)[None])', 'Uses only information up to t.'],
        ['data delay d', 'y[t - d]', 'If values arrive late, the latest known value is older than y[t].'],
      ],
    },
    notebook: {
      title: 'Lab 19.4 · Walk-forward evaluation',
      intro: 'Check the training-row rule, compare refit schedules, and see what a data delay does to an honest evaluation.',
      cells: [{
        title: 'Refit schedules',
        prose: '**Predict** whether refitting every hour beats refitting weekly on this series.',
        code: `${USAGE}
${FEATURES}
${WALK}
for refit in [1, 24, 168]:
    pred, actual = walk_forward(y, 6, refit=refit)
    print(f"refit every {refit:3d} origins: MAE {np.mean(np.abs(pred - actual)):.3f}   ({int(np.ceil((len(y) - 6 - EVAL) / refit))} fits)")`,
      }, {
        title: 'Which training rows are allowed?',
        prose: 'Origin t = 600, h = 24. **Predict** the last allowed training origin.',
        code: `for t, h in [(600, 24), (750, 6)]:
    rows = range(168, t - h + 1)
    print(f"t = {t}, h = {h}: training origins {rows.start}…{rows.stop - 1}; the last target is {rows.stop - 1 + h} ≤ {t}")`,
      }, {
        title: 'A data delay',
        prose: 'A 1-hour persistence forecast when the newest value arrives d hours late. **Predict** the MAE with a 3-hour delay compared with a 4-hour forecast without delay.',
        code: `ts = np.arange(EVAL, len(y) - 1)
for d in [0, 1, 3, 6]:
    print(f"delay {d}: MAE {np.mean(np.abs(y[ts - d] - y[ts + 1])):.3f}")
ts4 = np.arange(EVAL, len(y) - 4)
print(f"no delay, h = 4: MAE {np.mean(np.abs(y[ts4] - y[ts4 + 4])):.3f}")`,
      }],
    },
  },
  'l19-leakage': {
    formulaTex: '$$x_t = f(y_1, \\dots, y_t) \\quad \\text{only}$$',
    mathCode: {
      rows: [
        ['centred window', 'y[t - 2:t + 3].mean()', 'Uses y[t+1] and y[t+2]: values from after the origin.'],
        ['trailing window', 'y[t - 4:t + 1].mean()', 'Uses only values up to t.'],
        ['leak symptom', 'MAE barely grows with h', 'Honest forecasts get harder further ahead.'],
      ],
    },
    notebook: {
      title: 'Lab 19.5 · Temporal leakage',
      intro: 'Add a smoothed value around the target hour as a feature, and watch the errors collapse and stop growing with the horizon.',
      cells: [{
        title: 'A leaky feature',
        prose: 'The leaky version replaces the 24-hour mean with the average of y around the target hour — the kind of value a reporting job computes the next day. **Predict** both symptoms.',
        code: `${USAGE}
${FEATURES}
${WALK}
def leaky_features(y, t, h):
    f = features(y, t, h)
    f[5] = y[t + h - 1:t + h + 2].mean()                      # smoothed value AROUND THE TARGET: from the future
    return f
for h in [1, 6, 24]:
    honest, actual = walk_forward(y, h)
    leaky, _ = walk_forward(y, h, feats=leaky_features)
    print(f"h = {h:2d}: honest MAE {np.mean(np.abs(honest - actual)):5.2f}   leaky MAE {np.mean(np.abs(leaky - actual)):5.2f}")`,
        tryThis: 'Replace the leaky feature with a centred 5-hour mean around the origin, y[t − 2 : t + 3]. How many future values does it use, and how much does it flatter h = 1?',
      }],
    },
  },
}
