import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'b-04', slug: 'exponentials-and-logarithms', track: 'B', order: 4,
  title: 'Exponentials and Logarithms', subtitle: 'Growth, Decay, and Inverse Operations',
  tags: ['exponential', 'logarithm', 'growth', 'decay', 'numpy', 'log-scale'],
  prereqs: ['b-03'], unlocks: ['b-05', 'c-01'],
  hook: {
    question: 'What grows by multiplying instead of adding — and how do you undo it?',
    realWorldContext: 'Compound interest, population growth and the spread of an infection multiply by a factor each step. Logarithms answer the reverse question ("how many steps?") and turn products into sums — which is why they appear in probability models and machine-learning loss functions.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Tell exponential from linear growth. Use a logarithm to answer "how many multiplications?", and know which inputs a logarithm cannot take. Use log(a × b) = log a + log b to work with products of probabilities. Read semilog and log-log plots.',
        '**The smallest example.** A balance grows by 50% a year: each year it is *multiplied* by 1.5. A second balance grows by a fixed 50 a year: each year 50 is *added*.',
        '| Year | multiply by 1.5 | add 50 |\n|---|---|---|\n| 0 | 100 | 100 |\n| 1 | 150 | 150 |\n| 2 | 225 | 200 |\n| 3 | 337.5 | 250 |\n| 4 | 506.25 | 300 |',
        'Multiplying by the same **factor** every step is **exponential growth**: after t steps the value is start × factorᵗ, here 100 × 1.5ᵗ. Adding the same amount is linear growth. They start together, but exponential growth always wins in the end. A factor below 1 gives **exponential decay** (halving is a factor of 0.5).',
      ),
      check(
        'Something doubles every year, starting at 100. What is it after 5 years?',
        ['600', '1000', '3200'],
        2,
        '100 × 2⁵ = 100 × 32 = 3200. Adding 100 per year would give 600.',
      ),
      notebook('Multiplying versus adding', [
        demo(1, 'Stage 1 — The growth table', [
          'The table above, computed. The ratio column shows that exponential growth has a constant *ratio* between years, whereas linear growth has a constant *difference*.',
        ], 'Run. Then change the factor to 0.5 (decay) and describe what happens.', 'factor = 1.5\nfor t in range(5):\n    exp_val = 100 * factor ** t\n    lin_val = 100 + 50 * t\n    ratio = factor if t else None\n    print(t, round(exp_val, 2), lin_val, ratio)', { expectOutput: ['4 506.25 300 1.5'] }),
      ]),
      prose(
        '**The inverse question: how many steps?** Starting from 1 and doubling, how many doublings reach 1000? 2¹⁰ = 1024, so a little under 10. The exact answer is a **logarithm**: log₂(1000) ≈ 9.97. In general, **log_b(x) is the power you raise b to in order to get x** — it undoes raising b to a power.',
        '| Question | Logarithm | Answer |\n|---|---|---|\n| 2 to what power is 8? | log₂(8) | 3 |\n| 10 to what power is 1000? | log₁₀(1000) | 3 |\n| 10 to what power is 0.01? | log₁₀(0.01) | −2 |\n| any base to what power is 1? | log(1) | 0 |',
        '**The domain restriction.** A positive base raised to any power is always positive. So a logarithm is only defined for **positive** inputs: log(0) has no answer (NumPy returns −inf with a warning) and log of a negative number has no real answer (NumPy returns nan). Data containing zeros or negatives needs a decision before you take logs (Lesson C.04).',
      ),
      check(
        'What is log₁₀(0.001)?',
        ['-3', '3', 'undefined'],
        0,
        '10⁻³ = 0.001. Numbers between 0 and 1 have negative logarithms; that is fine. Only 0 and negative *inputs* are a problem.',
      ),
      notebook('Logarithms as inverses', [
        demo(2, 'Stage 2 — log undoes a power', [
          'Each log recovers the exponent. The last line shows the domain restriction: NumPy returns -inf for 0 and nan for a negative input (warnings are hidden here so the output stays readable).',
        ], 'Predict each value from the table, then run. How many doublings does it take to reach one million?', 'import numpy as np, warnings\nprint(np.log2(8), np.log10(1000), np.log10(0.01), np.log2(1000))\nprint(2 ** np.log2(1000))   # the inverse undoes it\nwith warnings.catch_warnings():\n    warnings.simplefilter("ignore")\n    print(np.log10(np.array([100.0, 1.0, 0.0, -5.0])))', { expectOutput: ['3.0 3.0 -2.0 9.965784284662087', '1000.0', '[  2.   0. -inf  nan]'] }),
      ]),
      prose(
        '**The number e and the natural log.** If 100% interest is split into n smaller payments through a year, each one compounding, the growth factor is (1 + 1/n)ⁿ. As n grows it approaches a limit, e ≈ 2.71828. That is why e appears whenever growth happens continuously. The logarithm with base e is the **natural log**, written ln, and in NumPy it is plain `np.log`. Any base can be converted: log_b(x) = ln(x) / ln(b).',
      ),
      notebook('e and ln', [
        demo(3, 'Stage 3 — Continuous compounding approaches e', [
          'The factor for 1, 12, 365 and a million compounding steps a year, then the change of base formula.',
        ], 'Run. Then check that np.log(1000) / np.log(2) equals np.log2(1000).', 'import numpy as np\nfor n in [1, 12, 365, 1_000_000]:\n    print(n, (1 + 1 / n) ** n)\nprint("e =", np.e, " ln(e) =", np.log(np.e))\nprint(np.log(1000) / np.log(2))', { expectOutput: ['1 2.0', '1000000 2.7182804690957534', 'e = 2.718281828459045  ln(e) = 1.0', '9.965784284662087'] }),
      ]),
      prose(
        '**Products become sums.** Because powers add when you multiply (bᵐ × bⁿ = bᵐ⁺ⁿ), logarithms turn multiplication into addition: **log(a × b) = log a + log b**, and log(aⁿ) = n × log a.',
        'This matters for probability. The probability that several independent events *all* happen is the product of their probabilities. With many events that product becomes so small that a computer rounds it to exactly 0 — **underflow** — and then every model looks equally impossible. Adding log-probabilities instead gives the same comparison without underflow: the larger **log-likelihood** is the more likely model.',
        '| Quantity | 1100 coin flips, each probability 0.5 |\n|---|---|\n| product 0.5¹¹⁰⁰ | about 10⁻³³¹ — stored as **0.0** |\n| sum of logs 1100 × ln 0.5 | **−762.46** — no problem |',
      ),
      check(
        'What is ln(0.5¹⁰)?',
        ['10 × ln(0.5), about −6.93', 'ln(0.5) + 10', '0.5 × ln(10)'],
        0,
        'log(aⁿ) = n × log(a), so ln(0.5¹⁰) = 10 × ln(0.5) = 10 × (−0.693).',
      ),
      notebook('Products and sums', [
        demo(4, 'Stage 4 — The identity, and underflow', [
          'First a check of log(a × b) = log a + log b. Then the probability of 1100 independent events each with probability 0.5, computed as a product (underflows to 0.0) and as a sum of logs.',
        ], 'Run. Then find the smallest number of flips for which the product first becomes exactly 0.0.', 'import numpy as np\na, b = 5.0, 3.0\nprint(np.isclose(np.log(a * b), np.log(a) + np.log(b)))\n\nprobs = np.full(1100, 0.5)\nprint("product:", np.prod(probs))\nprint("sum of logs:", np.log(probs).sum())', { expectOutput: ['True', 'product: 0.0', 'sum of logs: -762.46'] }),
      ]),
      prose(
        '**Seeing exponential and power-law data.** A straight line is easy to recognise by eye; curves are not. Taking logs can straighten them:',
        '| Plot | Straight when | Slope means |\n|---|---|---|\n| **semilog**: log(y) against x | y = c × factorˣ (exponential) | ln(factor) per unit of x |\n| **log-log**: log(y) against log(x) | y = c × xᵏ (power law) | the power k |',
        'The figures here have ordinary axes, so we plot log values directly; a plotting library\'s "log scale" option does the same thing and labels the axis with the original values.',
      ),
      notebook('Log axes', [
        demo(5, 'Stage 5 — Straightening exponential data', [
          'Data growing by a factor of 1.5 per step. Its ln values lie on a straight line whose slope is ln(1.5).',
        ], 'Run. Compare the fitted slope with ln(1.5). Then try a power law, y = 3 × x², and fit log(y) against log(x): what slope do you expect?', 'from opencalc import Figure\nimport numpy as np\nt = np.arange(0, 8)\ny = 100 * 1.5 ** t\nslope, intercept = np.polyfit(t, np.log(y), 1)\nprint(round(slope, 4), round(np.log(1.5), 4), round(np.exp(intercept), 2))\n\nfig = Figure(xmin=-0.5, xmax=7.5, ymin=4, ymax=8, title="Semilog view: ln(y) against t")\nfig.grid().axes()\nfig.xlabel("t (steps)").ylabel("ln(y)")\nfig.scatter(t.tolist(), np.log(y).tolist(), color="blue")\nfig.plot(lambda x: slope * x + intercept, color="amber")\nfig.show()', { expectOutput: ['0.4055 0.4055 100.0'] }),
      ]),
      prose('**Practice.** Challenge 1 answers a "how many steps" question exactly. Challenge 2 applies a log transformation to data containing values it cannot take. Challenge 3 is a fresh probability problem that needs logs.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Time to grow tenfold', 'medium', {
          prompt: 'A population doubles every 3 years. Write population(t, P0=1000) for its size after t years, and compute time_to_10x, the exact time for it to grow tenfold, using a logarithm (no loop).',
          instructions: 'After t years the number of doublings is t / 3. Tenfold growth needs log₂(10) doublings.',
          code: 'import numpy as np\ndef population(t, P0=1000):\n    pass  # replace\n\ntime_to_10x = None',
          testCode: `import numpy as np
assert population(3) is not None and abs(population(3) - 2000) < 1e-6, "population(3) should be 2000: one doubling"
assert abs(population(4.5) - 1000 * 2 ** 1.5) < 1e-6, "population works for any t: P0 * 2 ** (t / 3)"
assert abs(time_to_10x - 3 * np.log(10)) > 1e-6, "3 * ln(10) counts powers of e, not doublings. Use log base 2: 3 * np.log2(10)"
assert abs(time_to_10x - 3 * np.log2(10)) < 1e-9, f"time_to_10x should be 3 * log2(10), about 9.97 years; got {time_to_10x}"
assert abs(population(time_to_10x) - 10000) < 1e-6, "At time_to_10x the population should be exactly 10000"
"SUCCESS: about 9.97 years — log2(10) doublings of 3 years each."`,
          hint: 'return P0 * 2 ** (t / 3); time_to_10x = 3 * np.log2(10)',
          solution: 'import numpy as np\ndef population(t, P0=1000):\n    return P0 * 2 ** (t / 3)\n\ntime_to_10x = 3 * np.log2(10)',
          misconceptions: [{ code: 'import numpy as np\ndef population(t, P0=1000):\n    return P0 * 2 ** (t / 3)\ntime_to_10x = 3 * np.log(10)', feedback: 'Use log base 2' }],
        }),
        exercise(12, 2, 'Challenge 2 — A log transform with invalid values', 'medium', {
          prompt: 'Monthly sales figures include zeros (closed months) and one negative correction. Compute log_sales, the base-10 log of only the positive values, and n_excluded, how many values could not be logged.',
          instructions: 'Build a mask of positive values first. Taking the log of everything would give -inf and nan.',
          code: 'import numpy as np\nsales = np.array([1200.0, 0.0, 850.0, 10000.0, -40.0, 100.0, 0.0])\nlog_sales = np.log10(sales)\nn_excluded = 0',
          testCode: `import numpy as np
assert np.all(np.isfinite(log_sales)), "log_sales contains -inf or nan: log10 is only defined for positive values. Keep sales > 0 first"
assert np.allclose(log_sales, np.log10([1200.0, 850.0, 10000.0, 100.0])), f"log_sales should be the logs of the 4 positive values, got {log_sales}"
assert n_excluded == 3, f"Two zeros and one negative value cannot be logged: n_excluded should be 3, got {n_excluded}"
"SUCCESS: 4 values transformed (about 3.08, 2.93, 4.0, 2.0) and 3 reported as excluded — not silently turned into -inf or nan."`,
          hint: 'mask = sales > 0; log_sales = np.log10(sales[mask]); n_excluded = (~mask).sum()',
          solution: 'import numpy as np\nsales = np.array([1200.0, 0.0, 850.0, 10000.0, -40.0, 100.0, 0.0])\nmask = sales > 0\nlog_sales = np.log10(sales[mask])\nn_excluded = int((~mask).sum())',
          misconceptions: [{ code: 'import numpy as np, warnings\nwarnings.simplefilter("ignore")\nsales = np.array([1200.0, 0.0, 850.0, 10000.0, -40.0, 100.0, 0.0])\nlog_sales = np.log10(sales)\nn_excluded = 3', feedback: 'log10 is only defined for positive values' }],
        }),
        exercise(13, 3, 'Challenge 3 — Which coin model is more likely?', 'hard', {
          prompt: 'A coin landed heads 1400 times in 2000 flips. Model A says P(heads) = 0.5; model B says 0.7. Compute each model\'s log-likelihood (log_lik_A, log_lik_B) and store the more likely model\'s letter in better_model.',
          prose: [
            'The likelihood of the data under a model is p^heads × (1 − p)^tails. Try computing it directly first: both models give 0.0, so they cannot be compared. Then use logs: heads × ln(p) + tails × ln(1 − p).',
          ],
          instructions: 'Use `np.log`. The larger (less negative) log-likelihood is the more likely model.',
          code: 'import numpy as np\nheads, tails = 1400, 600\nlik_A = 0.5 ** heads * 0.5 ** tails\nlik_B = 0.7 ** heads * 0.3 ** tails\nprint(lik_A, lik_B)\nlog_lik_A = None\nlog_lik_B = None\nbetter_model = None',
          testCode: `import numpy as np
assert log_lik_A is not None and log_lik_A != 0.0, "Direct products underflow to 0.0 for 2000 flips. Use heads * np.log(p) + tails * np.log(1 - p)"
assert abs(log_lik_A - 2000 * np.log(0.5)) < 1e-6, f"log_lik_A should be 2000 * ln(0.5), about -1386.29; got {log_lik_A}"
assert abs(log_lik_B - (1400 * np.log(0.7) + 600 * np.log(0.3))) < 1e-6, f"log_lik_B should be 1400 ln(0.7) + 600 ln(0.3), about -1221.73; got {log_lik_B}"
assert better_model == "B", "The model with the LARGER (less negative) log-likelihood is more likely: B"
"SUCCESS: log-likelihoods -1386.29 (A) and -1221.73 (B) — B explains 70% heads far better, a comparison the raw products could not make."`,
          hint: 'log_lik_A = heads * np.log(0.5) + tails * np.log(0.5)',
          solution: 'import numpy as np\nheads, tails = 1400, 600\nlog_lik_A = heads * np.log(0.5) + tails * np.log(0.5)\nlog_lik_B = heads * np.log(0.7) + tails * np.log(0.3)\nbetter_model = "A" if log_lik_A > log_lik_B else "B"',
          misconceptions: [{ code: 'heads, tails = 1400, 600\nlog_lik_A = 0.5 ** heads * 0.5 ** tails\nlog_lik_B = 0.7 ** heads * 0.3 ** tails\nbetter_model = "A"', feedback: 'Direct products underflow to 0.0' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Exponential growth multiplies by a constant factor each step: start × factorᵗ. Linear growth adds a constant.',
    'log_b(x) is the power of b that gives x — it answers "how many multiplications?"',
    'Logs only accept positive inputs: log(0) is -inf and log(negative) is nan in NumPy.',
    'log(a·b) = log a + log b turns products of probabilities into sums, avoiding underflow.',
    'Semilog (log y vs x) straightens exponentials; log-log straightens power laws.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'A population doubles every hour, starting at 100. How many after 8 hours?',
      options: ['900', '25600 — 100 × 2⁸', '800'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'Why do probability models add log-probabilities instead of multiplying probabilities?',
      options: [
        'Logs are faster to type',
        'Products of many small probabilities underflow to 0; sums of logs keep the same ordering without underflow',
        'Probabilities cannot be multiplied',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'ln(y) plotted against x is a straight line. What kind of relationship is it?',
      options: ['A power law', 'Exponential: y = c × factorˣ', 'Linear'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'What does np.log(0.0) return?',
      options: ['0', '-inf (with a warning) — log is only defined for positive inputs', 'nan'],
      correct: 1,
    },
  ],
}
