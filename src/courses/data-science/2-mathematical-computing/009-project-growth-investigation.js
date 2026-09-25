// Track B — Chapter project
// A numeric and visual investigation: is this growth linear or exponential?
import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const VISITORS = 'weeks = np.arange(10)\nvisitors = np.array([1200, 1410, 1680, 1950, 2330, 2740, 3230, 3800, 4500, 5290])'

export default {
  id: 'b-09', slug: 'project-growth-investigation', track: 'B', order: 9,
  title: 'Project: Is It Growing Exponentially?', subtitle: 'A numeric and visual investigation',
  tags: ['project', 'exponential', 'logarithm', 'least-squares', 'plotting', 'forecasting'],
  prereqs: ['b-02', 'b-03', 'b-04', 'b-08'], unlocks: ['c-01'],
  hook: {
    question: 'Weekly visitors went from 1200 to 5290 in nine weeks. Is that steady growth, or accelerating — and what would you forecast?',
    realWorldContext: 'Deciding whether growth is linear or exponential changes every forecast built on it. This project combines Track B: arrays, plots, slopes, logarithms and least squares, in one investigation you finish with a claim, the evidence for it, and its limits.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will produce.** A short investigation of a time series: a question, two numeric tests, a plot, a fitted model, a forecast, and a statement of what the evidence does *not* show. You will see it done once (worked), complete a similar one with the structure given (scaffolded), and then write a general function that is checked on series you have not seen (independent).',
        '**The two signatures.** For equally spaced times:',
        '| If growth is… | then consecutive **differences** | and consecutive **ratios** | and a straight line fits |\n|---|---|---|---|\n| linear (add a fixed amount) | are roughly constant | shrink toward 1 | y against t |\n| exponential (multiply by a fixed factor) | keep growing | are roughly constant | **ln(y)** against t (Lesson B.04) |',
        'Real data are noisy, so neither pattern is exact. Compare them, fit both models, and see which leaves smaller, patternless residuals — evidence, not proof.',
      ),
      check(
        'Consecutive ratios of a series are 1.18, 1.19, 1.16, 1.20, 1.18. Which model does that suggest?',
        ['Linear', 'Exponential with a growth factor of about 1.18 per step'],
        1,
        'Roughly constant ratios mean each step multiplies by about the same factor.',
      ),
      prose('**Part 1 — Worked investigation.** Question: *is weekly visitor growth closer to linear or exponential, and what does the better model forecast for week 12?*'),
      notebook('Part 1 — Worked: website visitors', [
        demo(1, '1 · Differences and ratios', [
          'If growth were linear, the differences would hover around one value. They climb steadily instead, while the ratios stay close to 1.18.',
        ], 'Run and describe each row in words. Which column is closer to constant?', `import numpy as np
${VISITORS}
diffs = np.diff(visitors)
ratios = visitors[1:] / visitors[:-1]
print("differences:", diffs)
print("ratios:     ", np.round(ratios, 3))
print("spread of differences relative to their mean:", round(diffs.std() / diffs.mean(), 3))
print("spread of ratios relative to their mean:     ", round(ratios.std() / ratios.mean(), 3))`, { expectOutput: ['differences: [210 270 270 380 410 490 570 700 790]', 'spread of ratios relative to their mean:      0.008'] }),
        demo(2, '2 · Fit both models and compare residuals', [
          'The linear model fits a line to visitors. The exponential model fits a line to ln(visitors) and converts back: visitors ≈ start × factor^week. Both are then judged in the same units — visitors — so their residuals are comparable.',
        ], 'Run. Look at the pattern of the linear residuals, not just their size: what shape do they make?', `import numpy as np
${VISITORS}
m, c = np.polyfit(weeks, visitors, 1)
lin_pred = m * weeks + c
k, log_start = np.polyfit(weeks, np.log(visitors), 1)
start, factor = np.exp(log_start), np.exp(k)
exp_pred = start * factor ** weeks
print("linear residuals:     ", np.round(visitors - lin_pred).astype(int))
print("exponential residuals:", np.round(visitors - exp_pred).astype(int))
print("SSR linear:", round(((visitors - lin_pred) ** 2).sum()), " SSR exponential:", round(((visitors - exp_pred) ** 2).sum()))
print(f"growth factor {factor:.3f} per week, doubling time {np.log(2) / np.log(factor):.2f} weeks")`, { expectOutput: ['growth factor 1.179 per week, doubling time 4.20 weeks'] }),
        demo(3, '3 · See it: the semilog view', [
          'On a plot of ln(visitors) against week, exponential growth is a straight line. The points sit close to the fitted line.',
        ], 'Run. Then replace np.log(visitors) with visitors and the fitted line with the linear fit, and compare.', `from opencalc import Figure
import numpy as np
${VISITORS}
k, log_start = np.polyfit(weeks, np.log(visitors), 1)
fig = Figure(xmin=-0.5, xmax=9.5, ymin=6.9, ymax=8.8, title="ln(visitors) by week")
fig.grid(step=0.5).axes()
fig.xlabel("week").ylabel("ln(visitors)")
fig.scatter(weeks.tolist(), np.log(visitors).tolist(), color="blue")
fig.plot(lambda w: k * w + log_start, color="amber")
fig.show()`),
        demo(4, '4 · Forecast, with its limits stated', [
          'The two models agree reasonably inside the data but diverge quickly outside it. A forecast is an extrapolation: it assumes the pattern continues.',
        ], 'Run. How different are the two forecasts for week 12? Would you trust either for week 52?', `import numpy as np
${VISITORS}
m, c = np.polyfit(weeks, visitors, 1)
k, log_start = np.polyfit(weeks, np.log(visitors), 1)
for w in [12, 52]:
    print(f"week {w}: linear {m * w + c:,.0f}   exponential {np.exp(log_start + k * w):,.0f}")`, { expectOutput: ['week 12: linear'] }),
      ]),
      callout('example', 'Worked conclusion', '**Claim:** over weeks 0–9, visitor growth is much closer to exponential (about 18% a week, doubling every 4.2 weeks) than linear.\n\n**Evidence:** the ratios are nearly constant (relative spread 0.008, against 0.417 for the differences); the exponential fit has a far smaller SSR; the linear residuals form a curve (positive, then negative, then positive), a sign that a straight line is the wrong shape.\n\n**Limits:** ten points from one period. The forecast for week 12 assumes the growth rate holds; nothing here says it will. Week 52 is far outside the data and should not be reported.'),
      prose('**Part 2 — Scaffolded.** Counts from a bacteria culture, measured hourly. The functions are named and described; fill them in. The checker tests each function on the given data and on an exactly exponential series.'),
      notebook('Part 2 — Scaffolded: a bacteria culture', [
        exercise(11, 1, 'Growth toolkit', 'medium', {
          prompt: 'Complete growth_ratios(counts), fit_exponential(t, counts) returning (start, factor), and doubling_time(factor).',
          instructions: '1. growth_ratios: each value divided by the one before it.\n2. fit_exponential: fit a line to ln(counts) against t with np.polyfit; the slope is ln(factor) and the intercept is ln(start).\n3. doubling_time: the time for the factor to multiply the count by 2, i.e. ln 2 / ln(factor).',
          code: 'import numpy as np\nhours = np.arange(8)\ncounts = np.array([50, 72, 101, 146, 205, 290, 410, 585])\n\ndef growth_ratios(counts):\n    pass  # TODO\n\ndef fit_exponential(t, counts):\n    pass  # TODO: return (start, factor)\n\ndef doubling_time(factor):\n    pass  # TODO\n\nprint(growth_ratios(counts))',
          testCode: `import numpy as np
r = growth_ratios(counts)
assert r is not None and len(r) == 7, "growth_ratios should return one ratio per consecutive pair: 7 values for 8 counts"
assert np.allclose(r, counts[1:] / counts[:-1]), "Each ratio is a value divided by the one BEFORE it"
t_exact = np.arange(6); y_exact = 10 * 2.0 ** t_exact
fit = fit_exponential(t_exact, y_exact)
assert fit is not None, "fit_exponential returns None: return (start, factor)"
start, factor = fit
assert not np.isclose(factor, np.log(2)), "That is the slope of ln(counts), which is ln(factor). Convert back with np.exp"
assert np.isclose(start, 10) and np.isclose(factor, 2), f"On y = 10 * 2^t the fit should give start 10 and factor 2, got {start}, {factor}"
assert np.isclose(doubling_time(2.0), 1.0) and np.isclose(doubling_time(1.5), np.log(2) / np.log(1.5)), "doubling_time(factor) = ln(2) / ln(factor); a factor of 2 doubles in exactly 1 step"
s, f = fit_exponential(hours, counts)
assert 1.40 < f < 1.44, f"The culture's factor should be about 1.42 per hour, got {f}"
"SUCCESS: the culture grows by about 42% an hour, doubling roughly every 2 hours."`,
          hint: 'growth_ratios: counts[1:] / counts[:-1]. fit_exponential: k, b = np.polyfit(t, np.log(counts), 1); return np.exp(b), np.exp(k).',
          solution: 'import numpy as np\nhours = np.arange(8)\ncounts = np.array([50, 72, 101, 146, 205, 290, 410, 585])\n\ndef growth_ratios(counts):\n    return counts[1:] / counts[:-1]\n\ndef fit_exponential(t, counts):\n    k, b = np.polyfit(t, np.log(counts), 1)\n    return np.exp(b), np.exp(k)\n\ndef doubling_time(factor):\n    return np.log(2) / np.log(factor)',
          misconceptions: [{ code: 'import numpy as np\nhours = np.arange(8)\ncounts = np.array([50, 72, 101, 146, 205, 290, 410, 585])\ndef growth_ratios(c):\n    return c[1:] / c[:-1]\ndef fit_exponential(t, c):\n    k, b = np.polyfit(t, np.log(c), 1)\n    return np.exp(b), k\ndef doubling_time(f):\n    return np.log(2) / np.log(f)', feedback: 'Convert back with np.exp' }],
        }),
      ]),
      prose(
        '**Part 3 — Independent.** Write `classify_growth(t, y)` returning `"linear"` or `"exponential"`, and `forecast(t, y, t_new)` returning the chosen model\'s prediction at `t_new`.',
        '**Specification.** Fit both models (as in Part 1) and choose the one with the smaller sum of squared residuals *in the original units of y*. The exponential model needs logs, so if any value of y is zero or negative, the exponential model is impossible: choose `"linear"` without crashing. The checker uses series you have not seen, including one containing a zero.',
      ),
      notebook('Part 3 — Independent: classify and forecast', [
        exercise(12, 2, 'Linear or exponential?', 'hard', {
          prompt: 'Write classify_growth(t, y) and forecast(t, y, t_new) to the specification above.',
          instructions: 'Plan with the Part 1 steps. Test your functions on the two example series before running the checker.',
          code: 'import numpy as np\nt = np.arange(8)\nseries_a = np.array([100, 131, 158, 192, 221, 248, 283, 309])\nseries_b = np.array([40, 52, 69, 90, 116, 152, 197, 257])\n\ndef classify_growth(t, y):\n    pass  # your code\n\ndef forecast(t, y, t_new):\n    pass  # your code\n\nprint(classify_growth(t, series_a), classify_growth(t, series_b))',
          testCode: `import numpy as np
assert classify_growth(t, series_a) == "linear", "series_a has nearly constant differences (about 30 per step): its linear fit has the smaller SSR"
assert classify_growth(t, series_b) == "exponential", "series_b has nearly constant ratios (about 1.3): its exponential fit has the smaller SSR"
u = np.arange(6)
assert classify_growth(u, 5.0 * 3.0 ** u) == "exponential", "An exactly exponential unseen series should be classified exponential"
assert classify_growth(u, 7.0 + 4.0 * u) == "linear", "An exactly linear unseen series should be classified linear"
try:
    got = classify_growth(u, np.array([0.0, 3, 6, 9, 12, 15]))
except Exception as e:
    raise AssertionError(f"A series containing 0 made your function crash ({type(e).__name__}). log(0) is impossible, so choose 'linear' when any y <= 0")
assert got == "linear", "With a 0 in y the exponential model is impossible: return 'linear'"
assert np.isclose(forecast(u, 7.0 + 4.0 * u, 10), 47.0), "forecast on an exactly linear series should continue the line: 7 + 4 * 10 = 47"
assert np.isclose(forecast(u, 5.0 * 3.0 ** u, 7), 5.0 * 3 ** 7), "forecast on an exactly exponential series should continue it: 5 * 3^7"
"SUCCESS: the model choice follows the evidence, handles impossible logs, and forecasts from the chosen model."`,
          hint: 'Linear SSR: fit np.polyfit(t, y, 1). Exponential: if (y <= 0).any(): return "linear"; else fit np.polyfit(t, np.log(y), 1) and compare SSR of y - np.exp(fitted log values).',
          solution: 'import numpy as np\nt = np.arange(8)\nseries_a = np.array([100, 131, 158, 192, 221, 248, 283, 309])\nseries_b = np.array([40, 52, 69, 90, 116, 152, 197, 257])\n\ndef _fits(t, y):\n    m, c = np.polyfit(t, y, 1)\n    lin = lambda s: m * s + c\n    if (np.asarray(y) <= 0).any():\n        return lin, None\n    k, b = np.polyfit(t, np.log(y), 1)\n    return lin, (lambda s: np.exp(b + k * s))\n\ndef classify_growth(t, y):\n    lin, exp_ = _fits(t, y)\n    if exp_ is None:\n        return "linear"\n    ssr_lin = ((y - lin(t)) ** 2).sum()\n    ssr_exp = ((y - exp_(t)) ** 2).sum()\n    return "exponential" if ssr_exp < ssr_lin else "linear"\n\ndef forecast(t, y, t_new):\n    lin, exp_ = _fits(t, y)\n    return exp_(t_new) if classify_growth(t, y) == "exponential" else lin(t_new)',
          misconceptions: [{ code: 'import numpy as np\nt = np.arange(8)\nseries_a = np.array([100, 131, 158, 192, 221, 248, 283, 309])\nseries_b = np.array([40, 52, 69, 90, 116, 152, 197, 257])\ndef classify_growth(t, y):\n    m, c = np.polyfit(t, y, 1)\n    k, b = np.polyfit(t, np.log(y), 1)\n    return "exponential" if ((y - np.exp(b + k * t)) ** 2).sum() < ((y - (m * t + c)) ** 2).sum() else "linear"\ndef forecast(t, y, t_new):\n    return 0', feedback: 'should continue the line' }],
        }),
      ]),
      prose('**Write it up.** For series_b, write three sentences in the style of the worked conclusion: your claim, the evidence (a number from the ratios and one from the SSR comparison), and one limit of the forecast.'),
    ],
  },
  mentalModel: [
    'Linear growth: constant differences. Exponential growth: constant ratios.',
    'Fit exponential growth as a straight line in ln(y), then convert back: factor = e^slope.',
    'Compare models in the same units, and look at the pattern of residuals, not only their size.',
    'Logs need positive data — a zero rules out the exponential fit.',
    'A forecast is an extrapolation: state the assumption that the pattern continues.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'A series has differences 20, 21, 19, 20, 22. Which model fits best?',
      options: ['Linear — the differences are roughly constant', 'Exponential', 'Neither'],
      correct: 0,
    },
    {
      id: 'q2', type: 'choice',
      text: 'The slope of ln(y) against t is 0.2. What is the growth factor per step?',
      options: ['0.2', 'e^0.2 ≈ 1.22, about 22% per step', '2'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Linear-fit residuals are positive at both ends and negative in the middle. What does that suggest?',
      options: ['The linear model is fine', 'The data curve upward, so a straight line is the wrong shape', 'The data are exponential for certain'],
      correct: 1,
    },
  ],
}
