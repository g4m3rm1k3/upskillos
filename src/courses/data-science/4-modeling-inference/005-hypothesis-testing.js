export default {
  id:'d-04',slug:'hypothesis-testing',track:'D',order:4,
  title:'Hypothesis Testing',subtitle:'Signal vs Noise',
  tags:['hypothesis','p-value','t-test','permutation','type-1-error','type-2-error'],
  prereqs:['d-02','d-03'],unlocks:['d-05'],
  hook:{question:'How do you tell a real effect from random chance?',realWorldContext:'Every A/B test, every clinical trial, every scientific claim relies on hypothesis testing. Misunderstanding p-values is one of the most widespread errors in science and industry. Getting this right matters.'},
  intuition:{
    prose:[
      'A hypothesis test asks: "If the null hypothesis is true (no effect, no difference), how likely is it to observe data at least as extreme as mine?" That probability is the **p-value**. A small p-value means the data would be surprising if there were no effect.',
      'p-value is NOT: "the probability the null is true," or "the probability my result is due to chance," or "the probability the effect is real." It is only: the probability of data this extreme or more extreme, IF the null were true.',
      'The **permutation test** builds the null distribution by randomly shuffling labels and recomputing the test statistic many times. It does not assume the data are normal, but it is not assumption-free. Its key assumption is **exchangeability under the null**: if there were no effect, the labels you shuffle could have been attached to any of the observations equally well. That is true when units were randomly assigned to independent groups. It is false for many real designs, so the shuffle must follow the design: in a **paired** design (the same person before and after) you shuffle within each pair, which amounts to flipping the sign of each difference; with **groups** or **clusters** (students in classrooms) you shuffle whole clusters; with **time series** neighbouring values are dependent, so naive shuffling destroys the structure and gives misleading p-values. Also, the p-value answers a question about the specific statistic you chose (for example, a difference in means).',
    ],
    callouts:[{type:'important',title:'What p-value Actually Means',body:`p = P(observing data this extreme | null hypothesis is true)

Small p (e.g. < 0.05): the data is surprising under the null.
We reject the null — not because we proved the alternative,
but because the null is implausible given the data.

Large p: data is unsurprising under the null.
We fail to reject — not because the null is true,
but because we have insufficient evidence to reject it.`}],
    visualizations:[{id:'PythonNotebook',title:'Hypothesis Testing',props:{initialCells:[
      {id:1,cellTitle:'Stage 1 — Building the Null Distribution',
       prose:'Setup: 60 people randomly assigned to control or treatment, so under the null (treatment does nothing) the group labels are exchangeable. Null hypothesis: no difference in the mean outcome. Statistic: treatment mean minus control mean. Two-sided test: we count shuffled differences at least as large in absolute value as the observed one. Each shuffle reassigns the 60 values to two groups of 30 and recomputes the statistic, building what "no effect" looks like.',
       instructions:'Run. The histogram is the null distribution; the red line is the observed difference (the dashed red line is its mirror image, because the test is two-sided). The p-value is the fraction of the histogram at or beyond the red lines.',
       code:`from opencalc import Figure
import numpy as np
np.random.seed(42)
control = np.random.normal(50,10,30)
treatment = np.random.normal(55,10,30)
obs_diff = treatment.mean() - control.mean()
all_data = np.concatenate([control,treatment])
null_diffs = []
for _ in range(5000):
    np.random.shuffle(all_data)
    null_diffs.append(all_data[:30].mean() - all_data[30:].mean())
null_diffs = np.array(null_diffs)
p_value = np.mean(np.abs(null_diffs) >= abs(obs_diff))
print(f"Observed difference: {obs_diff:.3f}")
print(f"p-value (two-sided): {p_value:.4f}")

fig = Figure(xmin=-10, xmax=10, ymin=0, ymax=0.2, title="Null distribution of the difference in means")
fig.grid(step=2).axes()
fig.histogram(null_diffs.tolist(), bins=40, color="blue", density=True)
fig.vline(obs_diff, color="red", dashed=False)
fig.vline(-obs_diff, color="red")
fig.show()`},
      {id:5,cellTitle:'Stage 1b — The Shuffle Must Match the Design',
       prose:'Here 12 people are each measured before and after a course. People differ a lot from each other, but each person improves a little. Under the null (the course does nothing), what could be swapped is the before/after label *within each person* — not scores between different people. So the valid permutation flips the sign of each person\'s difference at random. Shuffling all 24 scores as if they were two independent groups breaks the pairing, mixes in the large person-to-person spread, and gives a p-value for the wrong question.',
       instructions:'Predict which p-value will be smaller before running. Run and compare. Then explain in one sentence why shuffling scores between different people is not a valid "no effect" world for this design.',
       code:`import numpy as np
rng = np.random.default_rng(3)
before = rng.normal(60, 12, 12)            # large differences between people
after  = before + rng.normal(3, 3, 12)     # each person improves a little
diffs = after - before
obs = diffs.mean()

# WRONG for this design: treat the 24 scores as two independent groups
pooled = np.concatenate([before, after])
wrong = []
for _ in range(5000):
    rng.shuffle(pooled)
    wrong.append(pooled[12:].mean() - pooled[:12].mean())
p_wrong = np.mean(np.abs(wrong) >= abs(obs))

# RIGHT: within each person the labels are exchangeable → flip signs of differences
flips = rng.choice([-1, 1], size=(5000, 12))
right = (flips * diffs).mean(axis=1)
p_right = np.mean(np.abs(right) >= abs(obs))

print(f"mean improvement: {obs:.2f}")
print(f"p-value, unpaired shuffle (invalid here): {p_wrong:.4f}")
print(f"p-value, paired sign-flip (valid):        {p_right:.4f}")`},
      {id:2,cellTitle:'Stage 2 — The t-Test',
       prose:'The two-sample t-test is a parametric alternative. It assumes independent observations and that the difference in means is approximately normal (true when the data are near-normal, or often for large samples by the CLT); this default version also assumes equal variances (pass equal_var=False for Welch\'s test). It is fast because it uses a formula instead of simulation.',
       instructions:'Run. Compare the p-value to the permutation test.',
       code:`import numpy as np
from scipy import stats
np.random.seed(42)
control = np.random.normal(50,10,30)
treatment = np.random.normal(55,10,30)
t_stat, p_value = stats.ttest_ind(treatment, control)
print(f"t-statistic: {t_stat:.4f}")
print(f"p-value: {p_value:.4f}")
print(f"Conclusion: {'Reject null' if p_value<0.05 else 'Fail to reject null'}")`},
      {id:3,cellTitle:'Stage 3 — Type I and Type II Errors',
       prose:'False positives (Type I) and false negatives (Type II).',
       instructions:'Run. With α=0.05, we expect 5% false positives when there is truly no effect.',
       code:`import numpy as np
from scipy import stats
np.random.seed(42)
# Simulate Type I error rate
false_positives = 0
for _ in range(1000):
    a = np.random.normal(0,1,30)  # same distribution
    b = np.random.normal(0,1,30)  # no real difference
    _,p = stats.ttest_ind(a,b)
    if p < 0.05:
        false_positives += 1
print(f"False positive rate: {false_positives/1000:.3f} (expect ~0.05)")`},
      {id:4,cellTitle:'Stage 4 — Multiple Testing Problem',
       prose:'Testing 20 things at p<0.05 expects 1 false positive by chance.',
       instructions:'Run. Without correction, spurious findings accumulate.',
       code:`import numpy as np
from scipy import stats
np.random.seed(42)
# 20 tests, no real effects
pvalues = [stats.ttest_ind(np.random.normal(0,1,30),np.random.normal(0,1,30))[1]
           for _ in range(20)]
print(f"Significant (p<0.05): {sum(p<0.05 for p in pvalues)} out of 20")
print(f"Expected by chance: 1")
print("\\nBonferroni correction threshold:", 0.05/20)`},
      {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — A/B Test',
       difficulty:'hard',
       prompt:'Run an A/B test on conversion rates. Group A: 1000 visitors, 52 conversions. Group B: 1000 visitors, 68 conversions. Use a two-proportion z-test. Store p_value and is_significant (True if p<0.05).',
       instructions:`1. Compute proportions pA and pB. 2. Use stats.proportions_ztest or implement the z-test. 3. Store p_value and is_significant.`,
       code:`from scipy import stats
import numpy as np
nA, convA = 1000, 52
nB, convB = 1000, 68
p_value = 
is_significant = 
print(f"Conversion A: {convA/nA:.3f}, B: {convB/nB:.3f}")
print(f"p-value: {p_value:.4f}, significant: {is_significant}")
`,
       testCode:`
from scipy import stats
import numpy as np
count=np.array([68,52]);nobs=np.array([1000,1000])
_,ep=stats.proportions_ztest(count,nobs)
if abs(p_value-ep)>0.01: raise ValueError(f"p_value should be ~{ep:.4f}, got {p_value:.4f}")
if is_significant!=(p_value<0.05): raise ValueError(f"is_significant should be {p_value<0.05}")
res=f"SUCCESS: p={p_value:.4f}, significant={is_significant}. B's higher rate {'IS' if is_significant else 'is NOT'} statistically significant."
res
`,hint:`from scipy.stats import proportions_ztest
count=np.array([convB,convA]);nobs=np.array([nB,nA])
_,p_value=proportions_ztest(count,nobs)
is_significant=p_value<0.05`},
    ]}}],
  },
  mentalModel:[
    `p-value = P(data this extreme | null is true). Not P(null is true).`,
    `Small p → reject null. Large p → fail to reject null (not same as accepting it).`,
    `Permutation test: shuffle labels, compute statistic, repeat — builds null distribution. Valid only if labels are exchangeable under the null; match the shuffle to the design (pairs, clusters, time).`,
    `Type I error (false positive): rejecting null when it is true. Rate = α (usually 0.05).`,
    `Multiple testing: 20 tests at p<0.05 expects 1 false positive. Use Bonferroni correction.`,
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'A study reports p = 0.03. Which interpretation is correct?',
      options: [
        'There is a 3% chance the null hypothesis is true',
        'If the null hypothesis were true, there is a 3% probability of observing data this extreme or more extreme by chance — it does not tell you the probability the null is true, only how surprising your data would be if it were',
        'The effect has a 97% probability of being a real finding',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'A Type I error is a false positive (rejecting the null when it is true). If α = 0.05, what does this mean?',
      options: [
        'Only 5% of experiments will produce results',
        'When there is truly no effect, you will falsely conclude there is an effect 5% of the time — α is the false positive rate you accept; lower α means fewer false positives but also requires stronger evidence to detect real effects',
        'Your test is 95% accurate in all cases',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'A permutation test and a t-test both give the same conclusion. What advantage does the permutation test have?',
      options: [
        'Permutation tests are always more powerful (detect smaller effects)',
        'Permutation tests do not require normality — the t-test relies on the difference in means being approximately normal; the permutation test builds the null distribution from the data itself, so it can handle skewed data. It still assumes the shuffled labels are exchangeable under the null, so the shuffle must respect pairing, clustering or time order',
        'Permutation tests run faster because they avoid complex calculations',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'A researcher runs 100 independent hypothesis tests on random noise data with α = 0.05. How many false positives should they expect?',
      options: [
        'Zero — if all null hypotheses are true, no test should be significant',
        'About 5 — with α = 0.05, each test has a 5% chance of false positive; across 100 independent tests, the expected number of false positives is 100 × 0.05 = 5, which is why multiple testing correction (Bonferroni: α/n) is necessary',
        'About 50 — most results will be false positives without enough data',
      ],
      correct: 1,
    },
  ],
}
