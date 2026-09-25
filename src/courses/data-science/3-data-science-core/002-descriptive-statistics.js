import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'c-02', slug: 'descriptive-statistics', track: 'C', order: 2,
  title: 'Descriptive Statistics', subtitle: 'Summarizing Distributions',
  tags: ['mean', 'median', 'variance', 'std', 'quartiles', 'IQR', 'outliers'],
  prereqs: ['c-01', 'b-03'], unlocks: ['c-03', 'd-01'],
  hook: {
    question: 'How do you summarise a column of numbers — and which summary answers your question?',
    realWorldContext: 'A mean, a median and a standard deviation each answer a different question. Choosing the wrong one — or computing the right one with a different convention than you thought — produces numbers that are correct arithmetic and misleading conclusions.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Compute a mean, median, variance, standard deviation and quartiles by hand for a small dataset. Predict how one extreme value changes each. Know which denominator and which quartile convention your tools use. Choose a summary that fits the question being asked.',
        '**One small dataset.** Delivery times, in minutes, for seven orders, already sorted: **22, 25, 25, 28, 30, 33, 47**.',
        '- **Mean** = total ÷ count = 210 ÷ 7 = **30.0** minutes. It answers "if the total time were shared equally, how long each?"\n- **Median** = the middle value of the sorted list = the 4th of 7 = **28** minutes. Half the orders took at most 28 minutes.',
      ),
      check(
        'The 47-minute order was actually 147 minutes. What happens to the mean and the median?',
        ['Both rise by about 14', 'The mean rises to about 44.3; the median stays 28', 'Only the median changes'],
        1,
        'The total rises by 100, so the mean rises by 100 ÷ 7 ≈ 14.3. The middle value is still the 4th order, 28 — the median does not care how far out the largest value is.',
      ),
      notebook('Centre', [
        demo(1, 'Stage 1 — Mean and median, and one extreme value', [
          'The same seven deliveries, then with the last one replaced by 147.',
        ], 'Run and compare with your answer above. Then replace 47 with 20 (so it is no longer the largest) and predict both again.', 'import numpy as np\ntimes = np.array([22, 25, 25, 28, 30, 33, 47])\nprint(times.mean(), np.median(times))\nextreme = np.array([22, 25, 25, 28, 30, 33, 147])\nprint(round(extreme.mean(), 2), np.median(extreme))', { expectOutput: ['30.0 28.0', '44.29 28.0'] }),
      ]),
      prose(
        '**Spread: variance and standard deviation.** How far do values typically sit from the mean? Work it out as a table:',
        '| time | deviation from 30 | squared |\n|---|---|---|\n| 22 | −8 | 64 |\n| 25 | −5 | 25 |\n| 25 | −5 | 25 |\n| 28 | −2 | 4 |\n| 30 | 0 | 0 |\n| 33 | 3 | 9 |\n| 47 | 17 | 289 |\n| **sum** | **0** | **416** |',
        'Deviations always add to zero, so we square them first. The **variance** is the average squared deviation, and the **standard deviation** (std) is its square root, back in minutes. But "average" has two conventions:',
        '| Convention | Divide 416 by | Variance | Std | Use when |\n|---|---|---|---|---|\n| population | n = 7 | 59.43 | 7.71 | the data are the whole group you care about |\n| sample | n − 1 = 6 | 69.33 | 8.33 | the data are a sample and you are estimating the spread of a larger population |',
        '**Your tools disagree by default.** `np.std(x)` uses n; pandas `Series.std()` uses n − 1. The argument `ddof` ("delta degrees of freedom") chooses: `np.std(x, ddof=1)` matches pandas. With large datasets the difference is small; with 7 values it is 8%.',
      ),
      check(
        'You compute a column\'s std with pandas and a colleague uses np.std on the same numbers. Why do the answers differ?',
        ['One of you has a bug', 'pandas divides by n − 1 by default, NumPy by n', 'pandas rounds the result'],
        1,
        'Both are correct for their convention. Say which one you used, or set ddof explicitly.',
      ),
      notebook('Spread', [
        demo(2, 'Stage 2 — Variance from the table, and the two conventions', [
          'The squared deviations are computed exactly as in the table, then divided by n and by n − 1.',
        ], 'Run and match every number with the tables. Then check that pd.Series(times).std() equals the sample std.', 'import numpy as np, pandas as pd\ntimes = np.array([22, 25, 25, 28, 30, 33, 47])\nsq = (times - times.mean()) ** 2\nprint(sq.tolist(), sq.sum())\nprint("population:", round(sq.sum() / 7, 2), round(np.std(times), 2))\nprint("sample:    ", round(sq.sum() / 6, 2), round(np.std(times, ddof=1), 2), round(pd.Series(times).std(), 2))', { expectOutput: ['[64.0, 25.0, 25.0, 4.0, 0.0, 9.0, 289.0] 416.0', 'population: 59.43 7.71', 'sample:     69.33 8.33 8.33'] }),
      ]),
      prose(
        '**Quartiles and the IQR.** The **quartiles** split sorted data into quarters: Q1 (25th percentile), the median (50th), Q3 (75th). The **interquartile range**, IQR = Q3 − Q1, is the spread of the middle half and ignores the extremes. A common rule flags values below Q1 − 1.5 × IQR or above Q3 + 1.5 × IQR as *possible outliers* — worth checking, not automatically wrong.',
        '**Conventions again.** With few values, a quartile usually falls between two data points, and there are several reasonable ways to choose it. NumPy and pandas interpolate linearly by default: for 7 values, Q3 sits at position 0.75 × 6 = 4.5, halfway between 30 and 33, giving 31.5. Other textbooks and tools give 30 or 33. Report the method when numbers are small.',
        '| For the 7 times | value |\n|---|---|\n| Q1 (linear) | 25 |\n| Q3 (linear) | 31.5 |\n| IQR | 6.5 |\n| fences | 15.25 and 41.25 |\n| flagged | 47 |',
      ),
      notebook('Quartiles', [
        demo(3, 'Stage 3 — Quartiles, fences, and the method matters', [
          'The quartiles and outlier fences from the table, then Q3 under three different conventions.',
        ], 'Run. Which order does the rule flag? Then look at the three Q3 values: which methods agree?', 'import numpy as np\ntimes = np.array([22, 25, 25, 28, 30, 33, 47])\nq1, q3 = np.percentile(times, [25, 75])\niqr = q3 - q1\nlow, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr\nprint(q1, q3, iqr, low, high)\nprint("flagged:", times[(times < low) | (times > high)])\nfor method in ["linear", "lower", "higher"]:\n    print(method, np.percentile(times, 75, method=method))', { expectOutput: ['25.0 31.5 6.5 15.25 41.25', 'flagged: [47]', 'linear 31.5', 'lower 30', 'higher 33'] }),
      ]),
      prose(
        '**Which summary?** Choose by the question, not by habit.',
        '| Question | Summary | Why |\n|---|---|---|\n| What is a typical delivery time? | median (with IQR) | not moved by one very slow order |\n| How many driver-minutes did the day\'s deliveries take? | mean × count (the total) | the total depends on every order, including the slow one |\n| How consistent are delivery times? | std or IQR | std uses every value; IQR ignores the extremes |',
        '**About skew.** When a long tail of large values pulls the mean above the median, the data are often called *right-skewed*. Mean > median is a useful hint of that, but not a guarantee — the two can differ for other reasons, such as two clusters of values — so look at a histogram before describing the shape.',
      ),
      notebook('Summaries in pandas', [
        demo(4, 'Stage 4 — describe(), decoded', [
          '`describe()` reports count, mean, std (sample, n − 1), min, the 25%, 50% and 75% quantiles (linear), and max.',
        ], 'Run and find each value from this lesson in the output. Which row uses the n − 1 convention?', 'import pandas as pd\ntimes = pd.Series([22, 25, 25, 28, 30, 33, 47], name="minutes")\nprint(times.describe().round(2))', { expectOutput: ['8.33', '31.50'] }),
      ]),
      prose('**Practice.** Challenge 1 builds a full profile. Challenge 2 is about conventions. Challenge 3 is a fresh problem: choose the summary that answers each question.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — A full profile', 'medium', {
          prompt: 'For the daily sales in data, compute mean_sales, median_sales, the population std std_sales, and outliers: the values outside the 1.5 × IQR fences (use np.percentile\'s default method).',
          instructions: 'Compute Q1 and Q3 with `np.percentile(data, [25, 75])`, then the fences, then a mask.',
          code: 'import numpy as np\ndata = np.array([100, 120, 115, 105, 130, 118, 500, 112, 108, 125, 98, 121, 119, 104, 127])\nmean_sales = None\nmedian_sales = None\nstd_sales = None\noutliers = None',
          testCode: `import numpy as np
assert np.isclose(mean_sales, data.mean()), f"mean_sales should be {data.mean():.2f}"
assert median_sales == 118, f"median_sales should be 118 (the 8th of 15 sorted values), got {median_sales}"
assert not np.isclose(std_sales, data.std(ddof=1)), "That is the sample std (n - 1). This challenge asks for the population std: np.std(data)"
assert np.isclose(std_sales, data.std()), "std_sales should be np.std(data)"
assert outliers is not None and list(outliers) == [500], f"Only 500 lies outside the fences; got {outliers}"
"SUCCESS: the one extreme day (500) pulls the mean to about 140 while the median stays at 118."`,
          hint: 'q1, q3 = np.percentile(data, [25, 75]); iqr = q3 - q1; outliers = data[(data < q1 - 1.5 * iqr) | (data > q3 + 1.5 * iqr)]',
          solution: 'import numpy as np\ndata = np.array([100, 120, 115, 105, 130, 118, 500, 112, 108, 125, 98, 121, 119, 104, 127])\nmean_sales = data.mean()\nmedian_sales = np.median(data)\nstd_sales = np.std(data)\nq1, q3 = np.percentile(data, [25, 75])\niqr = q3 - q1\noutliers = data[(data < q1 - 1.5 * iqr) | (data > q3 + 1.5 * iqr)]',
          misconceptions: [{ code: 'import numpy as np, pandas as pd\ndata = np.array([100, 120, 115, 105, 130, 118, 500, 112, 108, 125, 98, 121, 119, 104, 127])\nmean_sales = data.mean()\nmedian_sales = np.median(data)\nstd_sales = pd.Series(data).std()\noutliers = np.array([500])', feedback: 'That is the sample std (n - 1)' }],
        }),
        exercise(12, 2, 'Challenge 2 — Same numbers, different conventions', 'medium', {
          prompt: 'Five measurements were taken as a sample from a production line. Compute sample_std (for estimating the whole line\'s spread) and population_std (treating these five as the whole group), then their ratio, sample_std / population_std.',
          instructions: 'Use `ddof`. Before running, predict whether the ratio is above or below 1.',
          code: 'import numpy as np\nwidths = np.array([10.2, 9.8, 10.1, 10.4, 9.5])\nsample_std = np.std(widths)\npopulation_std = np.std(widths)\nratio = sample_std / population_std',
          testCode: `import numpy as np
assert np.isclose(population_std, np.std(widths)), "population_std divides by n: np.std(widths)"
assert not np.isclose(sample_std, population_std), "Both are the same: the sample std divides by n - 1, so use np.std(widths, ddof=1)"
assert np.isclose(sample_std, np.std(widths, ddof=1)), "sample_std should be np.std(widths, ddof=1)"
assert np.isclose(ratio, np.sqrt(5 / 4)), "The ratio should be sqrt(n / (n - 1)) = sqrt(5 / 4), about 1.118"
"SUCCESS: dividing by n - 1 makes the sample std about 11.8% larger here; the gap shrinks as n grows."`,
          hint: 'sample_std = np.std(widths, ddof=1)',
          solution: 'import numpy as np\nwidths = np.array([10.2, 9.8, 10.1, 10.4, 9.5])\nsample_std = np.std(widths, ddof=1)\npopulation_std = np.std(widths)\nratio = sample_std / population_std',
          misconceptions: [{ code: 'import numpy as np\nwidths = np.array([10.2, 9.8, 10.1, 10.4, 9.5])\nsample_std = np.std(widths)\npopulation_std = np.std(widths)\nratio = 1.0', feedback: 'the sample std divides by n - 1' }],
        }),
        exercise(13, 3, 'Challenge 3 — Choose the summary for the question', 'medium', {
          prompt: 'A town has repair costs for 9 streets. For each question store "mean", "median" or "total": q_typical (the cost of a typical street\'s repair), q_budget (the money needed to repair all 9). Then compute typical_cost and budget with your choices.',
          prose: ['Costs in thousands: [12, 15, 11, 14, 13, 16, 12, 14, 95]. One street needs a bridge rebuilt.'],
          instructions: 'Decide from the question, not from the shape alone. A budget must pay for every street, including the expensive one.',
          code: 'import numpy as np\ncosts = np.array([12, 15, 11, 14, 13, 16, 12, 14, 95])\nq_typical = None\nq_budget = None\ntypical_cost = None\nbudget = None',
          testCode: `import numpy as np
assert q_typical == "median", "A typical street is best described by the median: the bridge (95) would drag the mean to about 22, higher than 8 of the 9 streets"
assert q_budget == "total", "A budget must cover every street, including the bridge: that needs the total (mean × count), not the median"
assert typical_cost == 14, f"typical_cost should be the median, 14; got {typical_cost}"
assert budget == 202, f"budget should be the total, 202; got {budget}"
"SUCCESS: median 14 for 'typical', total 202 for 'budget' — the same data, two questions, two summaries."`,
          hint: 'typical_cost = np.median(costs); budget = costs.sum()',
          solution: 'import numpy as np\ncosts = np.array([12, 15, 11, 14, 13, 16, 12, 14, 95])\nq_typical = "median"\nq_budget = "total"\ntypical_cost = np.median(costs)\nbudget = costs.sum()',
          misconceptions: [
            { code: 'q_typical = "mean"\nq_budget = "total"\ntypical_cost = 22.4\nbudget = 202', feedback: 'best described by the median' },
            { code: 'q_typical = "median"\nq_budget = "median"\ntypical_cost = 14\nbudget = 126', feedback: 'A budget must cover every street' },
          ],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Mean = total ÷ count (moved by extremes); median = middle of the sorted values (robust).',
    'Variance = average squared deviation; std = its square root, in the data\'s units.',
    'Population convention divides by n, sample by n − 1: np.std uses n, pandas .std() uses n − 1 — set ddof.',
    'Quartiles depend on a convention with small data; IQR fences flag values to check, not values to delete.',
    'Choose the summary by the question: typical value, total, or consistency. Mean > median hints at a right tail — check a histogram.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'Dataset [10, 20, 30, 40, 1000]: mean 220, median 30. Which describes a typical value?',
      options: ['Mean', 'Median — the single extreme value drags the mean far from where most values lie', 'Either'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'pd.Series(x).std() and np.std(x) differ. Why?',
      options: ['A bug', 'pandas divides by n − 1 by default, NumPy by n', 'pandas ignores the largest value'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Why is the IQR less affected by extreme values than the std?',
      options: [
        'It is computed faster',
        'It uses only the middle half of the sorted data, while the std squares every deviation, so extremes count heavily',
        'It only works for integers',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'A value falls outside the 1.5 × IQR fences. What should you do?',
      options: [
        'Delete it',
        'Investigate it: it may be an error, or a real but unusual observation that matters',
        'Replace it with the mean',
      ],
      correct: 1,
    },
  ],
}
