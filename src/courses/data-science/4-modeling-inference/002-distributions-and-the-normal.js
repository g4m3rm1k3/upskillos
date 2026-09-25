import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const CLT_CODE = `from opencalc import Figure
import numpy as np
rng = np.random.default_rng(42)

def skew(a):
    a = np.asarray(a)
    return float(np.mean((a - a.mean())**3) / a.std()**3)

print("   N | skew of draws | skew of means | sd of means | sigma/sqrt(N)")
for N in [1, 2, 10, 30, 100]:
    draws = rng.exponential(1.0, size=(5000, N))   # sigma = 1
    means = draws.mean(axis=1)                      # one mean per sample
    print(f"{N:4d} | {skew(draws.ravel()):13.2f} | {skew(means):13.2f} | {means.std():11.3f} | {1/np.sqrt(N):.3f}")

N_plot = 30
raw   = rng.exponential(1.0, 5000)
means = rng.exponential(1.0, size=(5000, N_plot)).mean(axis=1)
fig = Figure(xmin=0, xmax=5, ymin=0, ymax=2.6, title=f"Raw draws (red) vs means of {N_plot} draws (blue)")
fig.grid(step=0.5).axes()
fig.histogram(raw[raw < 5].tolist(), bins=25, color="red", density=True)
fig.histogram(means.tolist(), bins=25, color="blue", density=True)
fig.show()`

export default {
  id: 'd-02', slug: 'distributions-and-the-normal', track: 'D', order: 2,
  title: 'Distributions and the Normal', subtitle: 'The Shape of Data — and of Averages',
  tags: ['normal', 'CLT', 'z-score', '68-95-997', 'scipy', 'distribution'],
  prereqs: ['d-01', 'b-04', 'c-02'], unlocks: ['d-07', 'd-03', 'd-04'],
  hook: {
    question: 'Why does the bell curve appear everywhere — and when does it not?',
    realWorldContext: 'The normal distribution describes many measurements roughly, and — under conditions you will learn here — it describes averages of many independent draws well, even when the draws themselves are not normal. Knowing exactly what the central limit theorem promises, and what it does not, separates correct use of averages from wishful thinking.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Tell probability mass from probability density, and compute probabilities as areas. Use the normal distribution, z-scores and the 68–95–99.7 rule. Explain what the central limit theorem says about *averages*, what it does not say about individual observations, and when it fails.',
        '**Mass: countable outcomes.** A fair die has six outcomes, each with probability 1/6. Listing each outcome\'s probability gives a **probability mass function**; the probabilities are between 0 and 1 and add up to 1.',
        '**Density: measurements on a continuous scale.** A height can be 170, 170.3, 170.31… The probability of *exactly* 170.000… cm is 0. Instead, a **probability density** curve describes where values are concentrated, and **the probability of a range is the area under the curve** over that range. The total area is 1. A density value is *not* a probability: a very narrow bell curve can have a height above 1 while every area under it stays below 1.',
        '| | Mass (die) | Density (height) |\n|---|---|---|\n| outcomes | countable: 1…6 | any value in a range |\n| P(exactly one value) | the mass, e.g. 1/6 | 0 |\n| P(a range) | add the masses | area under the density curve |\n| can a single value exceed 1? | no | yes — it is a height, not a probability |',
      ),
      check(
        'A density curve has height 2.5 at x = 3. What is P(X = 3)?',
        ['2.5', '0 — for a continuous variable, single values have probability 0; only areas are probabilities', '1'],
        1,
        'A height above 1 just means values are packed tightly there. Probabilities come from areas, e.g. P(2.9 < X < 3.1).',
      ),
      notebook('Mass, density and area', [
        demo(1, 'Stage 1 — Masses add up; areas are probabilities', [
          'The die\'s masses sum to 1. For a narrow normal curve with standard deviation 0.1, the density at its centre is about 3.99 — yet the probability of the range 9.9 to 10.1 is an area, computed from the cumulative distribution function (cdf), and it is below 1.',
        ], 'Run. Then widen the curve to sigma = 1 and compare the peak density and the same range\'s probability.', 'from scipy import stats\nmasses = [1 / 6] * 6\nprint("die masses sum to", sum(masses))\ncurve = stats.norm(loc=10, scale=0.1)\nprint("density at 10:", round(curve.pdf(10), 2))\nprint("P(9.9 < X < 10.1) =", round(curve.cdf(10.1) - curve.cdf(9.9), 4))', { expectOutput: ['die masses sum to 1.0', 'density at 10: 3.99', 'P(9.9 < X < 10.1) = 0.6827'] }),
      ]),
      prose(
        '**The normal distribution** N(μ, σ) is a symmetric bell curve with centre μ (its mean) and spread σ (its standard deviation). Changing μ slides it; changing σ stretches it. Every normal curve has the same proportions, measured in standard deviations from the mean:',
        '| within | area |\n|---|---|\n| μ ± 1σ | 68.3% |\n| μ ± 2σ | 95.4% |\n| μ ± 3σ | 99.7% |',
        'A **z-score**, z = (x − μ) / σ, says how many standard deviations a value is from the mean. *If* a quantity really follows a normal distribution, z tells you how unusual a value is; the rule above gives the proportions. If the data are skewed or have heavy tails, the 68–95–99.7 numbers do not apply.',
      ),
      notebook('The normal distribution', [
        demo(2, 'Stage 2 — The 68–95–99.7 rule as areas', [
          'Each area is the cdf at +k minus the cdf at −k for the standard normal N(0, 1).',
        ], 'Run. Then compute the area more than 2 standard deviations above the mean (one tail only).', 'from scipy import stats\nfor k in [1, 2, 3]:\n    print(k, round((stats.norm.cdf(k) - stats.norm.cdf(-k)) * 100, 1))', { expectOutput: ['1 68.3', '2 95.4', '3 99.7'] }),
        demo(3, 'Stage 3 — z-scores under a stated assumption', [
          'Suppose adult heights in a population are approximately N(170, 10) cm. The z-score and the cdf then say what fraction of that population is shorter than each height. The answer is only as good as the assumption.',
        ], 'Run. Then change the assumed sigma to 7 and see how the percentages change.', 'from scipy import stats\nmu, sigma = 170, 10\nfor h in [150, 170, 185, 200]:\n    z = (h - mu) / sigma\n    print(h, "cm: z =", z, " shorter than this:", round(stats.norm.cdf(z) * 100, 1), "%")', { expectOutput: ['185 cm: z = 1.5  shorter than this: 93.3 %'] }),
      ]),
      prose(
        '**Individual values versus averages.** Here is the most important distinction in this lesson. The distribution of *individual* observations — each customer\'s spend, each delivery time — is one thing. The distribution of the *average of a sample* — the mean spend of 30 customers, recomputed for many different samples of 30 — is another. Averages vary less than individuals: the standard deviation of sample means is σ / √N, called the **standard error**.',
        '**The central limit theorem (CLT)** is about the second distribution. If the N observations are **independent and identically distributed** (each drawn from the same distribution, none affecting another), and that distribution has a finite mean μ and finite standard deviation σ, then the distribution of the sample mean gets closer to normal as N grows, centred on μ with spread σ/√N.',
        'Three limits. (1) The observations themselves do **not** become normal — a big sample from a skewed distribution is still skewed. (2) How large N must be depends on the data; "N ≥ 30" is a rough rule that fails for strongly skewed data. (3) Without the conditions it can fail entirely: for the Cauchy distribution (no finite mean or variance) the sample mean never settles down, and strongly dependent observations also break it.',
      ),
      check(
        'You collect 10,000 house prices, which are right-skewed. What does the CLT say about them?',
        ['The 10,000 prices are now normally distributed', 'Nothing about the prices themselves; it says the MEAN of such samples would have an approximately normal distribution across repeated samples', 'The median becomes normal'],
        1,
        'More data give a better picture of the skewed distribution; they do not change its shape.',
      ),
      notebook('The central limit theorem', [
        demo(4, 'Stage 4 — What converges, and what does not', [
          'Draws from an exponential distribution, which is strongly right-skewed (skewness 2; a normal distribution has skewness 0). For each N we take 5000 separate samples of size N and compute each sample\'s mean. The skewness of the individual draws stays near 2; the skewness of the means shrinks toward 0, roughly like 2/√N; and the spread of the means matches σ/√N. The histograms show raw draws (red) and means of 30 (blue).',
        ], 'Predict: will the skewness of the individual draws change as N grows? Run and compare the two skew columns. At N = 30 the means are still measurably skewed (about 0.3). Then change N_plot to 100.', CLT_CODE),
        demo(6, 'Stage 5 — When the CLT does not apply', [
          'The Cauchy distribution looks like a bell curve with very heavy tails — so heavy it has no finite mean or variance. Its sample mean does not settle down however large N gets, unlike the normal draws.',
        ], 'Run. For each N, compare how far the five sample means are from 0. Which CLT condition does the Cauchy distribution violate?', 'import numpy as np\nrng = np.random.default_rng(1)\nfor N in [10, 1_000, 100_000]:\n    normal_means = [rng.standard_normal(N).mean() for _ in range(5)]\n    cauchy_means = [rng.standard_cauchy(N).mean() for _ in range(5)]\n    print(f"N={N:>7}: normal means {np.round(normal_means, 3)}")\n    print(f"           cauchy means {np.round(cauchy_means, 3)}")'),
      ]),
      prose(
        '**Checking normality.** A test such as Shapiro–Wilk gives a p-value (Lesson D.05 explains p-values). A small p-value is evidence *against* normality. A large one does not prove normality — small samples can rarely detect a departure — and with very large samples tiny, harmless departures become "significant". Look at a histogram too.',
      ),
      notebook('Checking a distribution', [
        demo(5, 'Stage 6 — Shapiro–Wilk, with its limits', [
          'One normal sample and one skewed sample of 100.',
        ], 'Run. Then shrink both samples to 10 values and see how the conclusions change.', 'import numpy as np\nfrom scipy import stats\nrng = np.random.default_rng(42)\nfor name, data in [("normal", rng.normal(50, 10, 100)), ("skewed", rng.exponential(10, 100))]:\n    stat, p = stats.shapiro(data)\n    verdict = "no evidence against normality" if p > 0.05 else "evidence of non-normality"\n    print(f"{name}: p = {p:.4f} -> {verdict}")', { expectOutput: ['skewed: p = 0.0000 -> evidence of non-normality'] }),
      ]),
      prose('**Practice.** Challenge 1 uses areas under a normal curve. Challenge 2 separates density from probability. Challenge 3 is a fresh simulation: measure what converges.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Areas under a normal curve', 'medium', {
          prompt: 'Assume heights are N(170, 10) cm. Compute fraction_above_185 and height_95th (the height 95% of people are below).',
          instructions: '`stats.norm.cdf(x, mu, sigma)` gives the area to the left of x. `stats.norm.ppf(q, mu, sigma)` goes the other way: the value with area q to its left.',
          code: 'from scipy import stats\nmu, sigma = 170, 10\nfraction_above_185 = None\nheight_95th = None',
          testCode: `from scipy import stats
assert fraction_above_185 is not None and abs(fraction_above_185 - stats.norm.cdf(185, 170, 10)) > 0.01, "cdf(185) is the fraction BELOW 185. The fraction above is 1 - cdf(185)"
assert abs(fraction_above_185 - (1 - stats.norm.cdf(185, 170, 10))) < 1e-9, "fraction_above_185 should be about 0.0668"
assert abs(height_95th - stats.norm.ppf(0.95, 170, 10)) < 1e-6, "height_95th should be ppf(0.95), about 186.4 cm"
"SUCCESS: about 6.7% are above 185 cm, and 95% are below about 186.4 cm — if the normal assumption holds."`,
          hint: 'fraction_above_185 = 1 - stats.norm.cdf(185, mu, sigma); height_95th = stats.norm.ppf(0.95, mu, sigma)',
          solution: 'from scipy import stats\nmu, sigma = 170, 10\nfraction_above_185 = 1 - stats.norm.cdf(185, mu, sigma)\nheight_95th = stats.norm.ppf(0.95, mu, sigma)',
          misconceptions: [{ code: 'from scipy import stats\nfraction_above_185 = stats.norm.cdf(185, 170, 10)\nheight_95th = stats.norm.ppf(0.95, 170, 10)', feedback: 'The fraction above is 1 - cdf(185)' }],
        }),
        exercise(12, 2, 'Challenge 2 — Density is not probability', 'medium', {
          prompt: 'For a machined part whose length is N(10, 0.05) mm, compute peak_density (the density at 10) and p_in_spec, the probability the length is between 9.9 and 10.1 mm. Set density_is_probability to False or True.',
          instructions: 'Density: `stats.norm.pdf`. Probability of a range: difference of two `cdf` values.',
          code: 'from scipy import stats\npeak_density = None\np_in_spec = None\ndensity_is_probability = None',
          testCode: `from scipy import stats
assert peak_density is not None and abs(peak_density - stats.norm.pdf(10, 10, 0.05)) < 1e-9, "peak_density = stats.norm.pdf(10, 10, 0.05), about 7.98"
assert abs(p_in_spec - (stats.norm.cdf(10.1, 10, 0.05) - stats.norm.cdf(9.9, 10, 0.05))) < 1e-9, "p_in_spec is the AREA between 9.9 and 10.1: cdf(10.1) - cdf(9.9), about 0.954"
assert density_is_probability is False, "A density of 7.98 cannot be a probability (probabilities are at most 1); probabilities are areas"
"SUCCESS: the density peaks near 7.98, while the probability of being in spec is about 0.954."`,
          hint: 'p_in_spec = stats.norm.cdf(10.1, 10, 0.05) - stats.norm.cdf(9.9, 10, 0.05)',
          solution: 'from scipy import stats\npeak_density = stats.norm.pdf(10, 10, 0.05)\np_in_spec = stats.norm.cdf(10.1, 10, 0.05) - stats.norm.cdf(9.9, 10, 0.05)\ndensity_is_probability = False',
          misconceptions: [{ code: 'from scipy import stats\npeak_density = stats.norm.pdf(10, 10, 0.05)\np_in_spec = stats.norm.pdf(10.1, 10, 0.05) - stats.norm.pdf(9.9, 10, 0.05)\ndensity_is_probability = False', feedback: 'p_in_spec is the AREA' }],
        }),
        exercise(13, 3, 'Challenge 3 — What converges?', 'hard', {
          prompt: 'Using the generator given, draw 4000 samples of size N = 4 and 4000 of size N = 64 from a skewed (exponential, scale 1) distribution. Store sd_means_4 and sd_means_64 (the standard deviations of the sample means), ratio = sd_means_4 / sd_means_64, and skew_raw (the skewness of all the N = 64 draws pooled). Then set individuals_become_normal.',
          instructions: 'Use `rng.exponential(1.0, size=(4000, N)).mean(axis=1)` for the means. The CLT predicts the spread of means shrinks like 1/√N, so the ratio should be near √(64/4) = 4.',
          code: 'import numpy as np\nrng = np.random.default_rng(3)\n\ndef skew(a):\n    a = np.asarray(a)\n    return float(np.mean((a - a.mean())**3) / a.std()**3)\n\nsd_means_4 = None\nsd_means_64 = None\nratio = None\nskew_raw = None\nindividuals_become_normal = None',
          testCode: `assert sd_means_4 is not None and 0.45 < sd_means_4 < 0.55, f"The means of 4 draws should have sd near 1/sqrt(4) = 0.5; got {sd_means_4}"
assert 0.11 < sd_means_64 < 0.14, f"The means of 64 draws should have sd near 1/sqrt(64) = 0.125; got {sd_means_64}"
assert 3.5 < ratio < 4.5, f"ratio should be near sqrt(64 / 4) = 4; got {ratio}"
assert skew_raw > 1.5, f"The pooled raw draws are still strongly skewed (near 2); got {skew_raw}. Did you measure the draws, not the means?"
assert individuals_become_normal is False, "The draws stay skewed however many you take: the CLT is about the distribution of MEANS"
"SUCCESS: the spread of the means shrank by about 4 (the square root of 16) while the raw draws kept their skew."`,
          hint: 'draws64 = rng.exponential(1.0, size=(4000, 64)); sd_means_64 = draws64.mean(axis=1).std(); skew_raw = skew(draws64.ravel())',
          solution: 'import numpy as np\nrng = np.random.default_rng(3)\n\ndef skew(a):\n    a = np.asarray(a)\n    return float(np.mean((a - a.mean())**3) / a.std()**3)\n\nsd_means_4 = rng.exponential(1.0, size=(4000, 4)).mean(axis=1).std()\ndraws64 = rng.exponential(1.0, size=(4000, 64))\nsd_means_64 = draws64.mean(axis=1).std()\nratio = sd_means_4 / sd_means_64\nskew_raw = skew(draws64.ravel())\nindividuals_become_normal = False',
          misconceptions: [{ code: 'sd_means_4, sd_means_64, ratio, skew_raw = 0.5, 0.125, 4.0, 2.0\nindividuals_become_normal = True', feedback: 'the CLT is about the distribution of MEANS' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Mass: countable outcomes with probabilities that add to 1. Density: a curve whose AREAS are probabilities; its height can exceed 1.',
    'N(μ, σ): 68.3% / 95.4% / 99.7% within 1 / 2 / 3 σ — only if the data really are normal.',
    'z = (x − μ)/σ measures distance from the mean in standard deviations.',
    'Sample means vary less than individuals: standard error σ/√N.',
    'CLT: for iid draws with finite variance, the MEAN\'s distribution approaches normal; the draws stay as they are. It fails for Cauchy and strong dependence.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'What fraction of a normal distribution lies within 2 standard deviations of the mean?',
      options: ['About 68%', 'About 95%', 'About 99.7%'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'What does the CLT say?',
      options: [
        'Large datasets are normally distributed',
        'For independent draws with finite variance, the distribution of the sample mean approaches normal as the sample size grows',
        'All measurements follow a bell curve',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'How much does the standard error of a mean shrink when the sample size is multiplied by 4?',
      options: ['By a factor of 4', 'By a factor of 2 — it scales with 1/√N', 'It does not change'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'A density function has value 3 at some point. Is something wrong?',
      options: ['Yes, probabilities cannot exceed 1', 'No — densities are not probabilities; only areas under the curve are', 'Only if the variable is discrete'],
      correct: 1,
    },
  ],
}
