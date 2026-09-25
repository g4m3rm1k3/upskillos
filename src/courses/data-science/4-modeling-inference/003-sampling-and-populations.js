import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const POP = `import numpy as np
rng = np.random.default_rng(0)
N_POP = 10_000
online = rng.random(N_POP) < 0.3                      # 30% of customers shop online
spend = np.where(online, rng.gamma(4, 30, N_POP), rng.gamma(4, 15, N_POP))
true_mean = spend.mean()`

export default {
  id: 'd-07', slug: 'sampling-and-populations', track: 'D', order: 3,
  title: 'Samples, Populations and Bias', subtitle: 'What a Dataset Can Say About the World',
  tags: ['sampling', 'population', 'bias', 'standard-error', 'dependence', 'unit-of-analysis'],
  prereqs: ['d-02'], unlocks: ['d-03', 'd-04'],
  hook: {
    question: 'Your data describe some customers. What can they tell you about all of them?',
    realWorldContext: 'Every confidence claim, every hypothesis test and every train/test split quietly assumes something about how the data were collected. A huge dataset collected from the wrong people is precisely wrong; data with repeated measurements of the same people carry less information than their row count suggests.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Name the population, the sample and the unit of observation for a dataset. Explain why sample statistics vary and measure that variation. Recognise sampling bias and why more data do not remove it. Recognise dependent observations and why they make uncertainty look smaller than it is.',
        '**The vocabulary, on one example.** A shop wants the average annual spend of its customers.',
        '| Term | Meaning | Here |\n|---|---|---|\n| population | everyone the question is about | all 10,000 customers |\n| parameter | a number describing the population | their true average spend |\n| sample | the ones you actually measured | 50 customers |\n| statistic | the same number computed on the sample | the sample\'s average spend |\n| unit of observation | what one row describes | one customer |',
        'A statistic *estimates* a parameter. Two questions decide how good that estimate is: **how variable** is it from sample to sample, and **is it biased** — systematically off in one direction because of who ended up in the sample?',
      ),
      notebook('Sampling variability', [
        demo(1, 'Stage 1 — Different samples, different answers', [
          'We simulate a population of 10,000 customers, so the true mean is known. Five random samples of 50 give five different sample means. The spread of those means is the **standard error**, estimated from one sample as sd / √n.',
        ], 'Run. How far from the true mean is each sample mean? Then change n to 500 and predict how much the spread shrinks.', `${POP}
print("true mean:", round(true_mean, 1))
n = 50
for _ in range(5):
    sample = rng.choice(spend, size=n, replace=False)
    print(round(sample.mean(), 1), " SE estimate:", round(sample.std(ddof=1) / np.sqrt(n), 1))`, { expectOutput: ['true mean:'] }),
      ]),
      prose(
        '**Bias: who is missing?** Suppose the shop surveys only customers who visit its website. Online customers spend more, so every such sample overestimates the average for *all* customers. Taking a bigger sample from the same source makes the estimate more *precise* — closer to the online customers\' average — but not more *correct*.',
        '| | random sample of 50 | website-only sample of 50 | website-only sample of 2,000 |\n|---|---|---|---|\n| centred on | the true mean | the online mean | the online mean |\n| variability | largest | large | small |\n| error that more data fix | yes | partly | little left — **the bias remains** |',
        'Common sources of bias: *convenience* (whoever is easy to reach), *self-selection* (who chooses to respond), *survivorship* (only those still present, e.g. customers who did not leave), and *coverage* (a group the method cannot reach at all).',
      ),
      check(
        'A biased sample is made 100 times larger. What happens to the bias?',
        ['It disappears', 'It stays — a larger biased sample gives a more precise estimate of the wrong quantity', 'It gets 100 times smaller'],
        1,
        'Size reduces random variation, not systematic error. Fix bias by fixing how the data are collected (or by adjusting for it, which needs extra information).',
      ),
      notebook('Bias', [
        demo(2, 'Stage 2 — More data, same bias', [
          'Samples drawn only from online customers, at two sizes, compared with the true mean for everyone.',
        ], 'Run. Which estimate is most precise? Which is closest to the true mean?', `${POP}
online_spend = spend[online]
print("true mean (all):", round(true_mean, 1), " online mean:", round(online_spend.mean(), 1))
for n in [50, 2000]:
    means = [rng.choice(online_spend, size=n, replace=False).mean() for _ in range(200)]
    print(f"website-only n={n}: average estimate {np.mean(means):.1f}, spread {np.std(means):.1f}")
means = [rng.choice(spend, size=50, replace=False).mean() for _ in range(200)]
print(f"random n=50: average estimate {np.mean(means):.1f}, spread {np.std(means):.1f}")`, { expectOutput: ['website-only n=2000'] }),
      ]),
      prose(
        '**What is one observation?** A clinic dataset has one row per *visit*, but the question is about *patients*. Patients who visit often contribute many rows, so a per-row average over-represents them. Decide the unit your question is about, then aggregate to it — for example, one average per patient — before summarising.',
        '**Dependence.** Rows that come from the same person, class, shop or day tend to resemble each other. Ten measurements of one patient are not ten independent pieces of information about patients in general. Treating dependent rows as independent makes standard errors, and later p-values, look more certain than they are. It also matters for model evaluation: if one person\'s rows are in both the training and the test set, the test score measures memory of that person, not performance on new people (Lesson D.07 uses *grouped* splits for this).',
      ),
      check(
        '30 students were each measured 20 times. How many independent units does the study have for questions about students?',
        ['600', '30 — the 20 measurements of one student are not independent evidence about other students', '20'],
        1,
        'The row count (600) overstates the information about students in general. Analyse per student, or use methods that account for the grouping.',
      ),
      notebook('Units and dependence', [
        demo(3, 'Stage 3 — Per-row versus per-unit averages', [
          'Patient P1 visits six times; the others once or twice. The per-visit average is dominated by P1.',
        ], 'Run. Which number answers "what is the typical patient\'s waiting time"?', `import pandas as pd
visits = pd.DataFrame({
    "patient": ["P1"] * 6 + ["P2", "P2", "P3", "P4"],
    "wait":    [60, 55, 65, 70, 58, 62, 20, 25, 15, 30],
})
print("per visit:  ", visits["wait"].mean())
per_patient = visits.groupby("patient")["wait"].mean()
print(per_patient.to_dict())
print("per patient:", round(per_patient.mean(), 2), "from", len(per_patient), "patients")`, { expectOutput: ['per visit:   46.0', 'per patient: 32.29 from 4 patients'] }),
        demo(4, 'Stage 4 — Dependence makes uncertainty look too small', [
          'Scores for 20 classes of 25 students. Students in the same class share a class effect. The naive standard error treats all 500 students as independent; the per-class standard error uses the 20 class means as the independent units.',
        ], 'Run and compare the two standard errors. Then set the class effect spread to 0 and compare again.', `import numpy as np
rng = np.random.default_rng(5)
classes, per_class = 20, 25
class_effect = rng.normal(0, 8, classes)                     # shared within a class
scores = 60 + np.repeat(class_effect, per_class) + rng.normal(0, 5, classes * per_class)
naive_se = scores.std(ddof=1) / np.sqrt(len(scores))
class_means = scores.reshape(classes, per_class).mean(axis=1)
cluster_se = class_means.std(ddof=1) / np.sqrt(classes)
print("naive SE:", round(naive_se, 2), " per-class SE:", round(cluster_se, 2))`, { expectOutput: ['naive SE:'] }),
      ]),
      callout('procedure', 'Before any inference', '1. Name the population the question is about.\n2. Name the unit of observation, and aggregate rows to it if needed.\n3. Ask how the sample was chosen and who could not appear in it.\n4. Ask which rows depend on each other (same person, place, time).\n5. Only then compute estimates, intervals, tests or train/test splits — and state these answers alongside them.'),
      prose('**Practice.** Challenge 1 measures sampling variability. Challenge 2 separates precision from bias. Challenge 3 is a fresh problem about the unit of analysis.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — A standard error from one sample', 'medium', {
          prompt: 'From the given sample of 40 delivery times, compute sample_mean, the standard error se (sample std with ddof=1, divided by √n), and the interval low, high = mean ± 2 × se.',
          instructions: 'The standard error estimates how much the sample mean would vary across repeated samples of the same size.',
          code: 'import numpy as np\nrng = np.random.default_rng(11)\nsample = rng.gamma(3, 10, 40)\nsample_mean = None\nse = None\nlow, high = None, None',
          testCode: `import numpy as np
assert sample_mean is not None and np.isclose(sample_mean, sample.mean()), "sample_mean = sample.mean()"
assert not np.isclose(se, sample.std(ddof=1)), "That is the spread of individual deliveries. The standard error of the MEAN divides it by sqrt(n)"
assert np.isclose(se, sample.std(ddof=1) / np.sqrt(40)), "se = sample.std(ddof=1) / np.sqrt(len(sample))"
assert np.isclose(low, sample_mean - 2 * se) and np.isclose(high, sample_mean + 2 * se), "low and high should be mean ± 2 × se"
"SUCCESS: the interval describes uncertainty about the mean, not the spread of individual deliveries."`,
          hint: 'se = sample.std(ddof=1) / np.sqrt(len(sample)); low, high = sample_mean - 2 * se, sample_mean + 2 * se',
          solution: 'import numpy as np\nrng = np.random.default_rng(11)\nsample = rng.gamma(3, 10, 40)\nsample_mean = sample.mean()\nse = sample.std(ddof=1) / np.sqrt(len(sample))\nlow, high = sample_mean - 2 * se, sample_mean + 2 * se',
          misconceptions: [{ code: 'import numpy as np\nrng = np.random.default_rng(11)\nsample = rng.gamma(3, 10, 40)\nsample_mean = sample.mean()\nse = sample.std(ddof=1)\nlow, high = sample_mean - 2 * se, sample_mean + 2 * se', feedback: 'divides it by sqrt(n)' }],
        }),
        exercise(12, 2, 'Challenge 2 — Precise but wrong', 'medium', {
          prompt: 'A population of app users has 70% casual users (average 5 sessions a week) and 30% heavy users (average 30). A survey inside the app mostly reaches heavy users. Compute true_mean (the population average), biased_mean (the average if only heavy users respond), and set more_data_fixes_bias.',
          instructions: 'The population average is a weighted average of the two groups (Lesson C.05).',
          code: 'true_mean = None\nbiased_mean = None\nmore_data_fixes_bias = None',
          testCode: `assert true_mean is not None and abs(true_mean - 12.5) < 1e-9, f"true_mean = 0.7 * 5 + 0.3 * 30 = 12.5; got {true_mean}"
assert biased_mean == 30, "If only heavy users respond, the survey estimates the heavy users' average, 30"
assert more_data_fixes_bias is False, "More responses from the same source estimate 30 ever more precisely; they never move towards 12.5"
"SUCCESS: the survey is off by 17.5 sessions a week, and no amount of extra responses from inside the app can fix that."`,
          hint: 'true_mean = 0.7 * 5 + 0.3 * 30',
          solution: 'true_mean = 0.7 * 5 + 0.3 * 30\nbiased_mean = 30\nmore_data_fixes_bias = False',
          misconceptions: [{ code: 'true_mean = 12.5\nbiased_mean = 30\nmore_data_fixes_bias = True', feedback: 'More responses from the same source' }],
        }),
        exercise(13, 3, 'Challenge 3 — The right unit', 'medium', {
          prompt: 'A fitness app logged workouts. The question is "how long is a typical USER\'s workout?". Compute per_row_mean (mean over all logged workouts), per_user_mean (mean of each user\'s own average), n_units (the number of independent users) and store the one that answers the question in answer.',
          instructions: 'Group by user, average within each user, then average those.',
          code: 'import pandas as pd\nlog = pd.DataFrame({\n    "user":    ["u1"] * 8 + ["u2", "u3", "u3", "u4"],\n    "minutes": [90, 85, 95, 100, 88, 92, 96, 94, 30, 25, 35, 40],\n})\nper_row_mean = None\nper_user_mean = None\nn_units = None\nanswer = None',
          testCode: `assert per_row_mean is not None and abs(per_row_mean - log["minutes"].mean()) < 1e-9, "per_row_mean = log['minutes'].mean()"
assert per_user_mean is not None and abs(per_user_mean - 48.125) < 1e-9, f"The user averages are 92.5, 30, 30 and 40, so per_user_mean should be 48.125; got {per_user_mean}"
assert n_units == 4, "There are 4 users, the independent units for this question (12 rows)"
assert answer == per_user_mean, "The question is about a typical USER, so answer with the per-user mean; the per-row mean is dominated by u1's 8 workouts"
"SUCCESS: the per-row mean is pulled towards u1, who logged 8 of the 12 workouts; the per-user mean treats each user once."`,
          hint: 'per_user = log.groupby("user")["minutes"].mean(); per_user_mean = per_user.mean(); n_units = len(per_user)',
          solution: 'import pandas as pd\nlog = pd.DataFrame({"user": ["u1"] * 8 + ["u2", "u3", "u3", "u4"], "minutes": [90, 85, 95, 100, 88, 92, 96, 94, 30, 25, 35, 40]})\nper_row_mean = log["minutes"].mean()\nper_user = log.groupby("user")["minutes"].mean()\nper_user_mean = per_user.mean()\nn_units = len(per_user)\nanswer = per_user_mean',
          misconceptions: [{ code: 'import pandas as pd\nlog = pd.DataFrame({"user": ["u1"] * 8 + ["u2", "u3", "u3", "u4"], "minutes": [90, 85, 95, 100, 88, 92, 96, 94, 30, 25, 35, 40]})\nper_row_mean = log["minutes"].mean()\nper_user_mean = log.groupby("user")["minutes"].mean().mean()\nn_units = 12\nanswer = per_row_mean', feedback: 'There are 4 users' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'A statistic from a sample estimates a parameter of a population — name both before computing.',
    'Random samples vary: the standard error sd/√n measures how much a sample mean moves between samples.',
    'Bias comes from who is in the sample; more data make a biased estimate more precise, not more correct.',
    'Decide the unit of observation and aggregate to it before summarising.',
    'Dependent rows (same person, class, day) carry less information than their count suggests — and must not straddle a train/test split.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'An online poll of 1 million volunteers finds 70% support. Why might this be less informative than a random sample of 1,000?',
      options: ['It has too much data', 'Volunteers select themselves, so the sample may differ systematically from the population; size cannot fix that bias', 'Online data are always wrong'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'What does the standard error of a mean describe?',
      options: ['The spread of individual values', 'How much the sample mean would vary across repeated samples of the same size', 'The bias of the sample'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'A dataset has 5,000 rows from 50 hospitals. For a question about hospitals, what should you keep in mind?',
      options: ['There are 5,000 independent observations', 'Rows from the same hospital are related; there are 50 hospitals, so uncertainty about hospitals is larger than 5,000 rows suggest', 'Hospitals do not matter'],
      correct: 1,
    },
  ],
}
