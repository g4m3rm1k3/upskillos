export default {
  id:'d-02',slug:'distributions-and-the-normal',track:'D',order:2,
  title:'Distributions and the Normal',subtitle:'The Shape of Data',
  tags:['normal','CLT','z-score','68-95-997','scipy','distribution'],
  prereqs:['d-01','b-04','c-02'],unlocks:['d-03','d-04'],
  hook:{question:'Why does the bell curve appear everywhere?',realWorldContext:'The Central Limit Theorem is one of the most important facts in statistics: under conditions you will learn below, the average of many independent random draws is approximately normal even when the individual draws are not. It is why many methods built for averages work on non-normal data, and why quantities that are sums of many small independent effects often look bell-shaped. It does NOT make every dataset normal.'},
  intuition:{
    prose:[
      'The **normal distribution** is defined by mean μ (center) and standard deviation σ (spread). The shape is always the same bell curve — different μ and σ just shift and scale it. Notation: X ~ N(μ, σ²).',
      'The **68-95-99.7 rule**: 68% of data falls within 1σ of the mean, 95% within 2σ, 99.7% within 3σ. This rule applies to any normal distribution. A data point 3σ from the mean is genuinely unusual.',
      'The **Central Limit Theorem (CLT)** is about *sample means*, not individual observations. Take N draws that are **independent and identically distributed** (iid: each from the same distribution, none influencing another), where that distribution has a finite mean μ and a finite standard deviation σ. Compute their mean. Repeat with many fresh samples. The CLT says the distribution of those means gets closer to normal as N grows, centred on μ with standard deviation σ/√N; equivalently the **standardized mean** (mean − μ)/(σ/√N) approaches N(0,1). Three limits: (1) the observations themselves do not become normal — a large sample from a skewed distribution is still skewed; (2) how large N must be depends on the data — "N ≥ 30" is a rough rule of thumb that fails for strongly skewed data; (3) without the conditions it can fail entirely: for the Cauchy distribution (no finite mean or variance) the sample mean never settles down, and strongly dependent observations also break it.',
    ],
    callouts:[{type:'important',title:'The 68-95-99.7 Rule',body:'μ ± 1σ → 68.3% of data\nμ ± 2σ → 95.4% of data\nμ ± 3σ → 99.7% of data\n\nPractical meaning:\n  A value 2σ away happens ~5% of the time by chance\n  A value 3σ away happens ~0.3% of the time\n  "Statistically significant" often means > 2σ from expected'}],
    visualizations:[{id:'PythonNotebook',title:'Distributions and the Normal',props:{initialCells:[
      {id:1,cellTitle:'Stage 1 — The Normal Distribution',
       prose:'Shape, mean, and std. Varying μ shifts it; varying σ scales it.',
       instructions:'Run. Notice how σ controls the spread without changing the shape.',
       code:'from opencalc import Figure\nimport numpy as np\nfrom scipy import stats\nfig = Figure(xmin=-10,xmax=30,ymin=0,ymax=0.45,title="Normal distributions")\nfig.grid().axes()\nfor mu,sigma,color,label in [(0,1,"blue","N(0,1)"),(5,2,"amber","N(5,2)"),(10,3,"green","N(10,3)")]:\n    fig.plot(lambda x,m=mu,s=sigma: stats.norm.pdf(x,m,s), color=color, label=label)\nfig.show()',output:'',status:'idle'},
      {id:2,cellTitle:'Stage 2 — The 68-95-99.7 Rule',
       prose:'68%, 95%, 99.7% of data fall within 1, 2, 3 standard deviations.',
       instructions:'Run. Verify these percentages with the normal CDF.',
       code:'from scipy import stats\nfor n_sigma in [1,2,3]:\n    pct = stats.norm.cdf(n_sigma) - stats.norm.cdf(-n_sigma)\n    print(f"Within {n_sigma}σ: {pct*100:.1f}%")',output:'',status:'idle'},
      {id:3,cellTitle:'Stage 3 — Z-Score and Standardization',
       prose:'Z-score: how many standard deviations from the mean? Z=(x-μ)/σ.',
       instructions:'Run. All normal distributions become N(0,1) after z-scoring.',
       code:'import numpy as np\nfrom scipy import stats\nheights = np.array([160,165,170,175,180,185,190])\nmu, sigma = heights.mean(), heights.std()\nz_scores = (heights - mu) / sigma\nfor h,z in zip(heights,z_scores):\n    pct = stats.norm.cdf(z)*100\n    print(f"Height {h}cm: z={z:.2f}, taller than {pct:.1f}% of people")',output:'',status:'idle'},
      {id:4,cellTitle:'Stage 4 — Central Limit Theorem Demo',
       prose:'We draw from an exponential distribution, which is strongly right-skewed (skewness 2; a normal distribution has skewness 0). For each N we take 5000 separate samples of size N and compute each sample\'s mean. The table measures two different things: the skewness of the individual draws (stays near 2 — the data never become normal) and the skewness of the 5000 means (shrinks toward 0, roughly like 2/√N). It also checks the spread of the means against σ/√N. The histograms show the raw draws (N=1, red) and the means of samples of 30 (blue).',
       instructions:'Predict before running: will the skewness of the individual draws change as N grows? Run and compare the two skew columns. Notice that at N=30 the means are still measurably skewed (about 0.3) — the N≥30 rule of thumb is not a guarantee. Then change N_plot to 100 and compare the blue histogram.',
       code:'from opencalc import Figure\nimport numpy as np\nrng = np.random.default_rng(42)\n\ndef skew(a):\n    a = np.asarray(a)\n    return float(np.mean((a - a.mean())**3) / a.std()**3)\n\nprint("   N | skew of draws | skew of means | sd of means | sigma/sqrt(N)")\nfor N in [1, 2, 10, 30, 100]:\n    draws = rng.exponential(1.0, size=(5000, N))   # sigma = 1\n    means = draws.mean(axis=1)                      # one mean per sample\n    print(f"{N:4d} | {skew(draws.ravel()):13.2f} | {skew(means):13.2f} | {means.std():11.3f} | {1/np.sqrt(N):.3f}")\n\nN_plot = 30\nraw   = rng.exponential(1.0, 5000)\nmeans = rng.exponential(1.0, size=(5000, N_plot)).mean(axis=1)\nfig = Figure(xmin=0, xmax=5, ymin=0, ymax=2.6, title=f"Raw draws (red) vs means of {N_plot} draws (blue)")\nfig.grid(step=0.5).axes()\nfig.histogram(raw[raw < 5].tolist(), bins=25, color="red", density=True)\nfig.histogram(means.tolist(), bins=25, color="blue", density=True)\nfig.show()',output:'',status:'idle'},
      {id:6,cellTitle:'Stage 4b — When the CLT Does Not Apply',
       prose:'The Cauchy distribution looks like a bell curve with very heavy tails, so heavy that it has no finite mean or variance. The CLT conditions fail, and the sample mean does not settle down however large N gets: the mean of 100,000 Cauchy draws is just as spread out as a single draw. Compare with the normal draws, whose means shrink toward 0 as N grows.',
       instructions:'Run. For each N, look at how far the five sample means are from 0 for each distribution. Explain in one sentence which CLT condition the Cauchy distribution violates.',
       code:'import numpy as np\nrng = np.random.default_rng(1)\nfor N in [10, 1_000, 100_000]:\n    normal_means = [rng.standard_normal(N).mean() for _ in range(5)]\n    cauchy_means = [rng.standard_cauchy(N).mean() for _ in range(5)]\n    print(f"N={N:>7}: normal means {np.round(normal_means, 3)}")\n    print(f"           cauchy means {np.round(cauchy_means, 3)}")',output:'',status:'idle'},
      {id:5,cellTitle:'Stage 5 — Testing Normality',
       prose:'Check if data is approximately normal before using tests that assume it.',
       instructions:'Run. A small Shapiro-Wilk p-value is evidence against normality. A large p-value does NOT prove the data are normal — it only means this test did not detect a departure, and small samples rarely can. With very large samples, tiny harmless departures become "significant", so look at a plot too.',
       code:'import numpy as np\nfrom scipy import stats\nnp.random.seed(42)\nnormal_data = np.random.normal(50,10,100)\nskewed_data = np.random.exponential(10,100)\nfor name,data in [("Normal",normal_data),("Skewed",skewed_data)]:\n    stat,p = stats.shapiro(data)\n    result = "no evidence against normality" if p>0.05 else "evidence of non-normality"\n    print(f"{name}: W={stat:.4f}, p={p:.4f} → {result}")',output:'',status:'idle'},
      {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — Heights Analysis',
       difficulty:'medium',
       prompt:'Heights are normally distributed with μ=170cm, σ=10cm. Compute: (1) fraction_above_185 — fraction taller than 185cm, (2) height_95th — the 95th percentile height, (3) verify the 68-95-99.7 rule numerically.',
       instructions:'1. Use scipy.stats.norm.cdf() and .ppf().\n2. fraction_above_185 = 1 - cdf(185).\n3. height_95th = ppf(0.95).',
       code:'from scipy import stats\nmu, sigma = 170, 10\nfraction_above_185 = \nheight_95th = \nprint(f"P(height > 185) = {fraction_above_185:.4f}")\nprint(f"95th percentile = {height_95th:.2f} cm")\n',output:'',status:'idle',
       testCode:`
from scipy import stats
expected_fa=1-stats.norm.cdf(185,170,10)
expected_h95=stats.norm.ppf(0.95,170,10)
if abs(fraction_above_185-expected_fa)>0.001: raise ValueError(f"fraction_above_185 should be {expected_fa:.4f}, got {fraction_above_185}")
if abs(height_95th-expected_h95)>0.1: raise ValueError(f"height_95th should be {expected_h95:.2f}, got {height_95th}")
res=f"SUCCESS: P(>185cm)={fraction_above_185:.4f}, 95th pct={height_95th:.2f}cm."
res
`,hint:'fraction_above_185=1-stats.norm.cdf(185,mu,sigma)\nheight_95th=stats.norm.ppf(0.95,mu,sigma)'},
    ]}}],
  },
  mentalModel:[
    'Normal distribution: defined by μ (center) and σ (spread). Shape is always bell-curve.',
    '68-95-99.7: 1σ→68%, 2σ→95%, 3σ→99.7% of data.',
    'Z-score: (x-μ)/σ. Measures distance from mean in standard deviations.',
    'CLT: for iid draws with finite variance, the distribution of the sample mean approaches N(μ, σ²/N) as N grows. The data themselves do not become normal; N≥30 is only a rough rule; Cauchy and strongly dependent data are counterexamples.',
    'stats.norm.cdf(): P(X≤x). stats.norm.ppf(): inverse — find x given percentile.',
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'A normal distribution has mean 100 and std 15. By the 68-95-99.7 rule, roughly what fraction of values fall between 70 and 130?',
      options: [
        '68% — that is the 1σ range',
        '95.4% — 70 and 130 are each 2 standard deviations from the mean (100 ± 2×15), and 95% of data falls within 2σ',
        '99.7% — any symmetric range around the mean captures almost all data',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'The Central Limit Theorem (CLT) says sample means are approximately normal for large N. Why is this surprising?',
      options: [
        'It is not surprising — averages of normal distributions are always normal',
        'Because the original data can have many different shapes (uniform, exponential, bimodal) — yet, for independent draws with finite variance, the distribution of sample means becomes bell-shaped as N grows. This is why normal-based methods for means often work on non-normal data, although the individual observations stay non-normal',
        'It only applies to data that is already symmetric',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'A student scores 85 on an exam where μ = 70, σ = 10. Their z-score is 1.5. What does this mean?',
      options: [
        'They scored 1.5 times the average score',
        'Their score is 1.5 standard deviations above the mean — z-score measures how many σ units a value is from μ, enabling comparison across different distributions',
        'They are in the 1.5th percentile',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'stats.norm.cdf(1.96) ≈ 0.975. What does this compute?',
      options: [
        'The probability that a normal random variable is exactly 1.96',
        'P(X ≤ 1.96) for a standard normal — the CDF gives the probability of observing a value at or below x; 0.975 means 97.5% of values fall below z = 1.96 (hence ±1.96σ captures 95%)',
        'The 1.96th standard deviation of the distribution',
      ],
      correct: 1,
    },
  ],
}
