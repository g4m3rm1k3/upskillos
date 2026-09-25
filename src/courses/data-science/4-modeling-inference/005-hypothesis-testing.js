import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'd-04', slug: 'hypothesis-testing', track: 'D', order: 5,
  title: 'Hypothesis Testing', subtitle: 'Is the Difference Bigger Than Chance?',
  tags: ['hypothesis', 'p-value', 't-test', 'permutation', 'type-1-error', 'type-2-error'],
  prereqs: ['d-02', 'd-07', 'd-03'], unlocks: ['d-05'],
  hook: {
    question: 'How do you tell a real difference from random chance — and what can a test NOT tell you?',
    realWorldContext: 'A/B tests, clinical trials and scientific claims rely on hypothesis tests. The calculation is the easy part. The hard parts are stating exactly what is being tested, choosing a comparison that matches how the data were collected, and reporting the result without overclaiming — especially when it is "not significant".',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** State a test\'s null hypothesis, statistic and tail. Build the "no effect" distribution by shuffling labels — by hand, then by simulation — with a shuffle that matches the design. Report an effect size with an interval, and explain a non-significant result without claiming there is no effect.',
        '**The smallest example.** Six plants: three got fertiliser (heights 6, 8, 7) and three did not (3, 5, 4), assigned at random. The treated average is 7, the untreated 4: a difference of **3**. Could random assignment alone produce a gap that large?',
        '**Specify the test first.**',
        '| Part | Here |\n|---|---|\n| null hypothesis | fertiliser has no effect: each plant would have grown the same height either way |\n| statistic | treated mean − untreated mean |\n| tail | two-sided: a gap of 3 in either direction counts as "at least as extreme" |\n| valid shuffle | plants were randomly assigned, so under the null any 3 of the 6 could have been the treated ones |',
        '**One shuffle by hand.** Suppose the random assignment had made plants with heights 3, 8, 4 the "treated" group. Their mean is 5, the others\' (5, 6, 7) is 6, so the difference is −1. Under the null, that outcome was just as likely as the one we saw.',
        'There are only 20 ways to choose 3 of 6 plants. Listing all 20 differences gives the **exact null distribution**. Only 2 of the 20 are at least 3 away from 0 (the observed split, +3, and its mirror image, −3), so the **p-value** is 2 / 20 = **0.1**.',
      ),
      check(
        'What does p = 0.1 mean here?',
        ['There is a 10% chance fertiliser has no effect', 'If fertiliser had no effect, a gap at least this large would arise from random assignment 10% of the time', 'The effect is 10%'],
        1,
        'A p-value is computed assuming the null is true. It is not the probability that the null is true. And note: with only three plants per group, even perfect separation cannot give a p-value below 0.1.',
      ),
      notebook('A permutation test', [
        demo(1, 'Stage 1 — All 20 relabellings', [
          '`combinations` lists every way to choose which 3 of the 6 plants are "treated". Each gives one difference in means under the null.',
        ], 'Run and check the p-value. Then add a seventh plant to each group and see how many relabellings there are.', 'from itertools import combinations\nimport numpy as np\nheights = [6, 8, 7, 3, 5, 4]           # first three were treated\nobserved = np.mean(heights[:3]) - np.mean(heights[3:])\ndiffs = []\nfor treated in combinations(range(6), 3):\n    t = [heights[i] for i in treated]\n    c = [heights[i] for i in range(6) if i not in treated]\n    diffs.append(np.mean(t) - np.mean(c))\ndiffs = np.array(diffs)\nprint("observed:", observed, " relabellings:", len(diffs))\nprint("two-sided p:", np.mean(np.abs(diffs) >= abs(observed)))', { expectOutput: ['observed: 3.0  relabellings: 20', 'two-sided p: 0.1'] }),
        demo(2, 'Stage 2 — Too many relabellings to list: simulate', [
          'With 30 people per group there are far too many relabellings to list, so we take 5000 random ones. The histogram is the null distribution; the red lines mark the observed difference and its mirror image.',
        ], 'Run. What fraction of the histogram lies beyond the red lines? Then change the number of shuffles to 500 and run twice: how stable is the p-value?', 'from opencalc import Figure\nimport numpy as np\nrng = np.random.default_rng(42)\ncontrol = rng.normal(50, 10, 30)\ntreatment = rng.normal(55, 10, 30)\nobserved = treatment.mean() - control.mean()\npooled = np.concatenate([control, treatment])\nnull = []\nfor _ in range(5000):\n    rng.shuffle(pooled)\n    null.append(pooled[:30].mean() - pooled[30:].mean())\nnull = np.array(null)\np = np.mean(np.abs(null) >= abs(observed))\nprint(f"observed difference {observed:.2f}, two-sided p = {p:.4f}")\nfig = Figure(xmin=-10, xmax=10, ymin=0, ymax=0.2, title="Differences under the null")\nfig.grid(step=2).axes()\nfig.histogram(null.tolist(), bins=40, color="blue", density=True)\nfig.vline(observed, color="red", dashed=False)\nfig.vline(-observed, color="red")\nfig.show()', { expectOutput: ['two-sided p ='] }),
      ]),
      prose(
        '**The shuffle must match the design.** Shuffling is valid only if, under the null, the labels you shuffle really could have been swapped — *exchangeability*. That is true for random assignment to independent groups. For other designs:',
        '| Design | Valid shuffle |\n|---|---|\n| independent groups, randomly assigned | shuffle group labels among all units |\n| paired (same person before and after) | swap before/after *within* each person — flip the sign of each difference |\n| clustered (students in classes) | shuffle whole clusters, not individuals |\n| time series | naive shuffling destroys the time structure and is not valid |',
      ),
      notebook('Designs', [
        demo(3, 'Stage 3 — Paired data need a paired shuffle', [
          '12 people measured before and after a course. People differ a lot from each other, but each improves a little. Swapping scores between different people is not a valid "no effect" world here; flipping the sign of each person\'s difference is.',
        ], 'Predict which p-value is smaller, then run. Explain in one sentence why the unpaired shuffle is invalid for this design.', 'import numpy as np\nrng = np.random.default_rng(3)\nbefore = rng.normal(60, 12, 12)\nafter = before + rng.normal(3, 3, 12)\ndiffs = after - before\nobs = diffs.mean()\npooled = np.concatenate([before, after])\nwrong = []\nfor _ in range(5000):\n    rng.shuffle(pooled)\n    wrong.append(pooled[12:].mean() - pooled[:12].mean())\np_wrong = np.mean(np.abs(wrong) >= abs(obs))\nflips = rng.choice([-1, 1], size=(5000, 12))\np_right = np.mean(np.abs((flips * diffs).mean(axis=1)) >= abs(obs))\nprint(f"mean improvement {obs:.2f}")\nprint(f"unpaired shuffle (invalid here): p = {p_wrong:.4f}")\nprint(f"paired sign-flip (valid):        p = {p_right:.4f}")', { expectOutput: ['mean improvement 3.05', 'unpaired shuffle (invalid here): p = 0.7068', 'paired sign-flip (valid):        p = 0.0006'] }),
      ]),
      prose(
        '**Report the size of the effect, with its uncertainty.** A p-value answers only "is this surprising if there were no effect?". Readers also need *how big* the effect is and *how precisely* it is known. Report the difference with an interval — for example, a 95% interval of estimate ± 1.96 standard errors.',
        '**"Not significant" is not "no effect".** A large p-value means the data are compatible with no effect — and possibly also with a meaningful effect. In an A/B test with 52 of 1000 conversions in A and 68 of 1000 in B, p ≈ 0.13, but the 95% interval for B − A runs from about −0.5 to +3.7 percentage points. The data cannot rule out a gain of over 3 points, which might matter a great deal. To claim two versions are *equivalent*, you must show the whole interval lies inside a margin you decided in advance counts as negligible.',
        '**Errors and multiplicity.** With a threshold of 0.05, about 5% of tests of true nulls will still come out "significant" (a *false positive*, Type I error). Missing a real effect is a *false negative* (Type II); small samples miss real effects often — they have low *power*. Running many tests multiplies the chance of false positives: 20 tests of true nulls produce about one "significant" result on average. Adjust (for example Bonferroni: divide 0.05 by the number of tests) and report how many tests you ran.',
      ),
      check(
        'A test gives p = 0.3 and a 95% interval of [−2, +6] for the effect. What is the best conclusion?',
        ['There is no effect', 'The result is inconclusive: the data are compatible with no effect, a small negative one, or a sizeable positive one', 'The effect is 2'],
        1,
        'Absence of evidence is not evidence of absence. More data would narrow the interval.',
      ),
      notebook('Effect sizes, errors and multiplicity', [
        demo(4, 'Stage 4 — An A/B test reported properly', [
          'A two-proportion z-test for the p-value, and a 95% interval for the difference in conversion rates.',
        ], 'Run. Then multiply both groups\' visitors and conversions by 4 and see how the p-value and interval change.', 'import numpy as np\nfrom scipy import stats\nnA, cA, nB, cB = 1000, 52, 1000, 68\npA, pB = cA / nA, cB / nB\npooled = (cA + cB) / (nA + nB)\nz = (pB - pA) / np.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB))\np_value = 2 * (1 - stats.norm.cdf(abs(z)))\nse = np.sqrt(pA * (1 - pA) / nA + pB * (1 - pB) / nB)\nlow, high = (pB - pA) - 1.96 * se, (pB - pA) + 1.96 * se\nprint(f"difference {100 * (pB - pA):.1f} points, p = {p_value:.3f}")\nprint(f"95% interval: {100 * low:.1f} to {100 * high:.1f} points")', { expectOutput: ['difference 1.6 points, p = 0.132', '95% interval: -0.5 to 3.7 points'] }),
        demo(5, 'Stage 5 — False positives when nothing is going on', [
          '1000 experiments in which both groups come from the same distribution. About 5% are "significant" at 0.05 anyway. Then 20 tests at once: without adjustment, finding at least one "significant" result is likely.',
        ], 'Run. Then apply the Bonferroni threshold 0.05 / 20 to the 20 tests.', 'import numpy as np\nfrom scipy import stats\nrng = np.random.default_rng(42)\nfalse_pos = sum(stats.ttest_ind(rng.normal(0, 1, 30), rng.normal(0, 1, 30)).pvalue < 0.05 for _ in range(1000))\nprint("false positive rate:", false_pos / 1000)\np20 = [stats.ttest_ind(rng.normal(0, 1, 30), rng.normal(0, 1, 30)).pvalue for _ in range(20)]\nprint("significant out of 20 null tests:", sum(p < 0.05 for p in p20))\nprint("chance of at least one false positive in 20 tests:", round(1 - 0.95 ** 20, 2))', { expectOutput: ['chance of at least one false positive in 20 tests: 0.64'] }),
        demo(6, 'Stage 6 — The t-test, and what it assumes', [
          'The two-sample t-test is a formula-based alternative to the permutation test. It assumes independent observations and that the difference in means is approximately normal (true for near-normal data, and often for larger samples by the CLT); this default version also assumes equal spreads, and `equal_var=False` gives Welch\'s test.',
        ], 'Run. Compare the two p-values for the same data as Stage 2.', 'import numpy as np\nfrom scipy import stats\nrng = np.random.default_rng(42)\ncontrol = rng.normal(50, 10, 30)\ntreatment = rng.normal(55, 10, 30)\nprint("Student t-test p:", round(stats.ttest_ind(treatment, control).pvalue, 4))\nprint("Welch t-test p:  ", round(stats.ttest_ind(treatment, control, equal_var=False).pvalue, 4))', { expectOutput: ['Welch t-test p:'] }),
      ]),
      prose('**Practice.** Challenge 1 computes an exact permutation p-value. Challenge 2 matches the test to the design. Challenge 3 is a fresh problem: report a non-significant result honestly.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — An exact p-value', 'medium', {
          prompt: 'Four users tried a new checkout (times in seconds: 41, 38, 45, 40) and four the old one (52, 47, 49, 55), assigned at random. Compute observed (new mean − old mean) and p_exact, the two-sided permutation p-value over all C(8, 4) = 70 relabellings.',
          instructions: 'Loop over `combinations(range(8), 4)` to choose the "new" group each time.',
          code: 'from itertools import combinations\nimport numpy as np\ntimes = [41, 38, 45, 40, 52, 47, 49, 55]   # first four used the new checkout\nobserved = None\np_exact = None',
          testCode: `from itertools import combinations
import numpy as np
assert observed == -9.75, f"observed should be mean(41, 38, 45, 40) - mean(52, 47, 49, 55) = 41.0 - 50.75 = -9.75; got {observed}"
d = [np.mean([times[i] for i in c]) - np.mean([times[i] for i in range(8) if i not in c]) for c in combinations(range(8), 4)]
exact = np.mean(np.abs(d) >= abs(observed))
assert p_exact is not None and not np.isclose(p_exact, np.mean(np.array(d) <= observed)), "That is a one-sided p-value. Two-sided counts differences at least as large in EITHER direction: np.abs(d) >= abs(observed)"
assert np.isclose(p_exact, exact), f"p_exact should be {exact:.4f}"
"SUCCESS: only the observed split and its mirror are this extreme: p = 2/70 ≈ 0.029."`,
          hint: 'diffs = [np.mean([times[i] for i in c]) - np.mean([times[i] for i in range(8) if i not in c]) for c in combinations(range(8), 4)]; p_exact = np.mean(np.abs(diffs) >= abs(observed))',
          solution: 'from itertools import combinations\nimport numpy as np\ntimes = [41, 38, 45, 40, 52, 47, 49, 55]\nobserved = np.mean(times[:4]) - np.mean(times[4:])\ndiffs = np.array([np.mean([times[i] for i in c]) - np.mean([times[i] for i in range(8) if i not in c]) for c in combinations(range(8), 4)])\np_exact = np.mean(np.abs(diffs) >= abs(observed))',
          misconceptions: [{ code: 'from itertools import combinations\nimport numpy as np\ntimes = [41, 38, 45, 40, 52, 47, 49, 55]\nobserved = np.mean(times[:4]) - np.mean(times[4:])\ndiffs = np.array([np.mean([times[i] for i in c]) - np.mean([times[i] for i in range(8) if i not in c]) for c in combinations(range(8), 4)])\np_exact = np.mean(diffs <= observed)', feedback: 'That is a one-sided p-value' }],
        }),
        exercise(12, 2, 'Challenge 2 — Match the test to the design', 'medium', {
          prompt: 'For each study, store the valid shuffle in the dict shuffles, using "groups", "within_pairs" or "clusters": "diet" (20 people weighed before and after), "ads" (5000 visitors randomly shown ad A or B), "teaching" (10 schools each assigned a method; 30 pupils tested per school).',
          instructions: 'Ask what could have been swapped if there were no effect.',
          code: 'shuffles = {"diet": None, "ads": None, "teaching": None}',
          testCode: `assert shuffles["diet"] == "within_pairs", "Each person is measured twice: swap before/after within each person"
assert shuffles["ads"] == "groups", "Visitors were independently and randomly assigned: shuffle group labels"
assert shuffles["teaching"] == "clusters", "The method was assigned to whole schools, so under the null whole schools could swap labels — shuffle schools, not pupils"
"SUCCESS: the shuffle follows how the treatment was assigned."`,
          hint: 'Randomisation unit: person (paired), visitor (groups), school (clusters).',
          solution: 'shuffles = {"diet": "within_pairs", "ads": "groups", "teaching": "clusters"}',
          misconceptions: [{ code: 'shuffles = {"diet": "within_pairs", "ads": "groups", "teaching": "groups"}', feedback: 'shuffle schools, not pupils' }],
        }),
        exercise(13, 3, 'Challenge 3 — Report a non-significant result', 'hard', {
          prompt: 'A small pilot compared a new onboarding flow: 18 of 150 users converted with it and 12 of 150 without. Compute diff (new − old, as a proportion), p_value (two-proportion z-test, two-sided), the 95% interval low, high (unpooled standard error), and choose conclusion from "effect", "no_effect" and "inconclusive".',
          instructions: 'Follow Stage 4. The team decided beforehand that differences smaller than 1 percentage point (0.01) do not matter.',
          code: 'import numpy as np\nfrom scipy import stats\nn_new, c_new, n_old, c_old = 150, 18, 150, 12\ndiff = None\np_value = None\nlow, high = None, None\nconclusion = None',
          testCode: `import numpy as np
from scipy import stats
pn, po = 18 / 150, 12 / 150
pooled = 30 / 300
z = (pn - po) / np.sqrt(pooled * (1 - pooled) * (2 / 150))
assert diff is not None and np.isclose(diff, pn - po), "diff = 18/150 - 12/150 = 0.04"
assert np.isclose(p_value, 2 * (1 - stats.norm.cdf(abs(z)))), f"p_value should be about {2 * (1 - stats.norm.cdf(abs(z))):.3f}"
se = np.sqrt(pn * (1 - pn) / 150 + po * (1 - po) / 150)
assert np.isclose(low, diff - 1.96 * se) and np.isclose(high, diff + 1.96 * se), "low, high = diff ± 1.96 × unpooled SE"
assert conclusion != "no_effect", "p > 0.05 does not show there is no effect: the interval includes gains far larger than the 0.01 margin"
assert conclusion == "inconclusive", "The interval (about -0.03 to +0.11) includes zero AND differences far beyond the 0.01 margin: the pilot cannot tell"
"SUCCESS: a 4-point observed gain, p ≈ 0.25, interval roughly -2.8 to +10.8 points — inconclusive, and a larger study is needed."`,
          hint: 'pn, po = c_new / n_new, c_old / n_old; pooled = (c_new + c_old) / (n_new + n_old); z = diff / np.sqrt(pooled * (1 - pooled) * (1 / n_new + 1 / n_old))',
          solution: 'import numpy as np\nfrom scipy import stats\nn_new, c_new, n_old, c_old = 150, 18, 150, 12\npn, po = c_new / n_new, c_old / n_old\ndiff = pn - po\npooled = (c_new + c_old) / (n_new + n_old)\nz = diff / np.sqrt(pooled * (1 - pooled) * (1 / n_new + 1 / n_old))\np_value = 2 * (1 - stats.norm.cdf(abs(z)))\nse = np.sqrt(pn * (1 - pn) / n_new + po * (1 - po) / n_old)\nlow, high = diff - 1.96 * se, diff + 1.96 * se\nconclusion = "inconclusive"',
          misconceptions: [{ code: 'import numpy as np\nfrom scipy import stats\npn, po = 18 / 150, 12 / 150\ndiff = pn - po\npooled = 0.1\nz = diff / np.sqrt(pooled * (1 - pooled) * (2 / 150))\np_value = 2 * (1 - stats.norm.cdf(abs(z)))\nse = np.sqrt(pn * (1 - pn) / 150 + po * (1 - po) / 150)\nlow, high = diff - 1.96 * se, diff + 1.96 * se\nconclusion = "no_effect"', feedback: 'p > 0.05 does not show there is no effect' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Specify first: null hypothesis, statistic, tail, and a shuffle that matches how units were assigned.',
    'p-value = how often data at least this extreme would occur IF the null were true — not P(null is true).',
    'Shuffles need exchangeability: groups, within pairs, or whole clusters — never naive shuffles of time series.',
    'Report the effect size with an interval; "not significant" often means "inconclusive", not "no effect".',
    'About 5% of true-null tests are "significant" at 0.05; many tests need adjustment and honest counting.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'Which statement about p = 0.03 is correct?',
      options: [
        'There is a 3% chance the null hypothesis is true',
        'If the null were true, results at least this extreme would occur about 3% of the time',
        'The effect is 3% large',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'A before/after study of 20 people is analysed by shuffling all 40 scores between the two groups. What is wrong?',
      options: [
        'Nothing',
        'The unpaired shuffle swaps scores between different people, which is not a valid "no effect" world when each person is compared with themselves; use a within-pair shuffle',
        'Paired designs cannot be tested',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'A study finds p = 0.4. What can it conclude?',
      options: [
        'The treatment has no effect',
        'The data do not provide evidence of an effect; look at the interval to see which effect sizes remain plausible',
        'The treatment has a 40% effect',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'A team tests 40 metrics and reports the 2 with p < 0.05. What is the problem?',
      options: [
        'None',
        'About 2 false positives are expected by chance among 40 true-null tests; without adjustment and disclosure of all 40, the finding may be noise',
        'They should have used p < 0.1',
      ],
      correct: 1,
    },
  ],
}
