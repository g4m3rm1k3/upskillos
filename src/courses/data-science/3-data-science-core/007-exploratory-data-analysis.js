import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const SURVEY = `import pandas as pd, numpy as np
survey = pd.DataFrame({
    "customer_id":  list(range(1, 21)) + [5],
    "plan":         ["basic"] * 10 + ["pro"] * 10 + ["basic"],
    "calls":        [4, 5, 3, 6, 5, 4, 7, 5, 6, 4, 1, 2, 0, 1, 2, 1, 3, 0, 2, 1, 5],
    "satisfaction": [5, 4, 5, 5, 4, 6, 5, 4, 5, 5, 8, 8, 7, 9, 7, 8, 99, 8, 9, 7, 4],
    "tenure":       [12, 30, 8, None, 24, 15, 40, 9, 22, 18, 6, 14, 3, 20, 11, 7, 25, 2, 16, 10, 30],
})`

const CLEAN = `${SURVEY}
clean = survey.drop_duplicates("customer_id")
clean = clean[clean["satisfaction"].between(1, 10)]`

export default {
  id: 'c-06', slug: 'exploratory-data-analysis', track: 'C', order: 7,
  title: 'Exploratory Data Analysis', subtitle: 'From a Question to an Honest Report',
  tags: ['EDA', 'correlation', 'anscombe', 'scatter', 'distribution', 'hypothesis'],
  prereqs: ['c-02', 'c-05', 'c-07', 'b-02'], unlocks: ['c-08', 'd-01', 'd-02'],
  hook: {
    question: 'Do customers who call support more often report lower satisfaction?',
    realWorldContext: 'Exploratory data analysis (EDA) is how you find out what a dataset can and cannot tell you before anyone builds on it. Done well, it ends in a short report: the question, what you checked, what you found, and what the data cannot show. Done as a checklist of commands, it misses the one problem that matters.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Turn a question into an investigation: check the data against its description, summarise before plotting, follow up on surprises, read a correlation carefully, look for a third variable, and write a short report with a claim, its evidence and its limits.',
        '**The question.** A support team asks: *do customers who make more support calls report lower satisfaction?* Their survey has 21 rows.',
        '**The data dictionary.**',
        '| column | meaning | allowed values |\n|---|---|---|\n| customer_id | one survey response per customer | unique |\n| plan | subscription plan | basic, pro |\n| calls | support calls in the last 3 months | 0 or more |\n| satisfaction | self-reported satisfaction | 1 to 10 |\n| tenure | months as a customer | 0 or more; may be missing |',
      ),
      notebook('Step 1 — Check the data against its description', [
        demo(1, 'Does the data match the dictionary?', [
          'Before answering anything, count the rows that break each rule. Each problem found here would otherwise distort every later number.',
        ], 'Run and read the report. Which problems will affect the question, and which will not?', `${SURVEY}
print(survey.shape)
print("repeated customer_id:", survey["customer_id"].duplicated().sum())
print("satisfaction outside 1-10:", survey.loc[~survey["satisfaction"].between(1, 10), ["customer_id", "satisfaction"]].values.tolist())
print("missing tenure:", survey["tenure"].isna().sum())
print(survey[["calls", "satisfaction"]].describe().loc[["min", "max"]])`, { expectOutput: ['(21, 5)', 'repeated customer_id: 1', 'satisfaction outside 1-10: [[17, 99]]', 'missing tenure: 1'] }),
      ]),
      prose(
        '**What the checks found.** Customer 5 appears twice (identical answers, so one copy can go), customer 17 reported satisfaction 99 on a 1–10 scale (an entry error; we exclude it rather than guess), and one tenure is missing (tenure is not needed for this question, so we leave it). Writing these decisions down *is* part of the result.',
        '**Why step 1 matters so much here.** With the raw data, the correlation between calls and satisfaction is about −0.09 — almost nothing. After removing just the duplicate and the 99, it is about −0.82. A single impossible value was hiding the pattern.',
      ),
      check(
        'Why can one value of 99 change a correlation this much?',
        ['It cannot; the change must be a bug', 'Correlation is based on distances from the mean, and one point very far from the rest dominates those distances', 'Correlation ignores the largest value'],
        1,
        'With 21 points, one point 90 units away from the others has more influence than all the rest together. Check extreme values before trusting any summary.',
      ),
      notebook('Step 2 — Summaries first, then a plot', [
        demo(2, 'Summaries of the cleaned data', [
          'The correlation before and after cleaning, then satisfaction by number of calls.',
        ], 'Run. Does the grouped table agree with the correlation?', `${CLEAN}
print("raw r:", round(survey["calls"].corr(survey["satisfaction"]), 2))
print("clean r:", round(clean["calls"].corr(clean["satisfaction"]), 2), "on", len(clean), "customers")
print(clean.groupby("calls")["satisfaction"].agg(["count", "mean"]).round(1))`, { expectOutput: ['raw r: -0.09', 'clean r: -0.82 on 19 customers'] }),
        demo(3, 'A plot to check the summary', [
          'The scatter plot shows *how* the relationship looks. Blue points are basic-plan customers and amber points pro-plan customers.',
        ], 'Run. Look at each colour separately: within one plan, do more calls go with lower satisfaction?', `from opencalc import Figure
${CLEAN}
fig = Figure(xmin=-0.5, xmax=7.5, ymin=2, ymax=10, title="Support calls and satisfaction")
fig.grid().axes()
fig.xlabel("support calls (3 months)").ylabel("satisfaction (1-10)")
for plan, colour in [("basic", "blue"), ("pro", "amber")]:
    g = clean[clean["plan"] == plan]
    fig.scatter(g["calls"].tolist(), g["satisfaction"].tolist(), color=colour, radius=5)
fig.show()`),
      ]),
      prose(
        '**Reading a correlation.** Pearson\'s r measures how well a *straight line* describes the relationship, from −1 to 1. It can mislead in three ways:',
        '- **Extreme values** dominate it (the 99 above).\n- **Curved relationships** can have r near 0 even when the relationship is strong; and very different data can share the same r — Anscombe\'s quartet is four datasets with nearly identical means, variances and correlations but completely different shapes.\n- **A third variable** can create it. Here, basic-plan customers both call more *and* are less satisfied. Within each plan, the relationship is weak.',
        '| group | customers | r (calls, satisfaction) | mean calls | mean satisfaction |\n|---|---|---|---|---|\n| everyone (cleaned) | 19 | −0.82 | | |\n| basic plan | 10 | −0.18 | 4.9 | 4.8 |\n| pro plan | 9 | +0.23 | 1.1 | 7.9 |',
        'So most of the overall pattern is the difference *between plans*. The data cannot tell us whether calls reduce satisfaction, whether unhappy customers call more, or whether something about the basic plan causes both. Correlation is not causation, and even the correlation is mostly about plan here.',
      ),
      notebook('Step 3 — Look for a third variable', [
        demo(4, 'The relationship within each plan', [
          'The same correlation computed separately for each plan.',
        ], 'Run and compare with the table. Then compute mean calls and satisfaction per plan.', `${CLEAN}
for plan, g in clean.groupby("plan"):
    print(plan, len(g), round(g["calls"].corr(g["satisfaction"]), 2))`, { expectOutput: ['basic 10 -0.18', 'pro 9 0.23'] }),
        demo(5, 'Anscombe\'s warning', [
          'Two of Anscombe\'s four datasets: almost the same summary numbers, completely different shapes.',
        ], 'Run. Then plot both as scatter plots and describe the difference in one sentence each.', `import numpy as np
x = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5]
y1 = [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]
y2 = [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]
for name, y in [("I", y1), ("II", y2)]:
    print(name, round(np.mean(y), 2), round(np.std(y), 2), round(np.corrcoef(x, y)[0, 1], 3))`, { expectOutput: ['I 7.5 1.94 0.816', 'II 7.5 1.94 0.816'] }),
      ]),
      callout('example', 'The report', '**Question:** do customers who make more support calls report lower satisfaction?\n\n**Data and checks:** 21 survey rows; removed 1 duplicate response and 1 impossible satisfaction score (99); 19 customers analysed. One missing tenure value, not used.\n\n**Finding:** across all 19, more calls go with lower satisfaction (r = −0.82). But basic-plan customers both call far more (mean 4.9 vs 1.1) and are less satisfied (4.8 vs 7.9). Within each plan the relationship is weak (r = −0.18 and +0.23).\n\n**Limitations:** 19 customers from one survey; satisfaction is self-reported; the data cannot show cause and effect. Plan type explains most of the pattern, so "reduce calls" is not supported as a way to raise satisfaction.', { anchor: 'report' }),
      prose('**Practice.** Challenge 1 audits a dataset against its dictionary. Challenge 2 checks a relationship within groups. Challenge 3 is a fresh investigation that ends in a structured report.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Audit against the dictionary', 'medium', {
          prompt: 'For the delivery log, compute issues, a dict with the number of rows breaking each rule: "duplicate_id" (repeated delivery_id), "bad_minutes" (minutes not between 1 and 300) and "missing_driver" (missing driver). Then store clean with duplicates and bad minutes removed.',
          instructions: 'Count first, then clean. Missing drivers are kept: they do not affect delivery times.',
          code: 'import pandas as pd\nlog = pd.DataFrame({\n    "delivery_id": [1, 2, 3, 3, 4, 5, 6],\n    "minutes":     [34, 41, 0, 0, 28, 1200, 37],\n    "driver":      ["A", "B", None, None, "A", "C", None],\n})\nissues = {}\nclean = log',
          testCode: `assert issues == {"duplicate_id": 1, "bad_minutes": 3, "missing_driver": 3}, f"Expected duplicate_id 1, bad_minutes 3 (0, 0 and 1200), missing_driver 3; got {issues}"
assert clean["delivery_id"].tolist() == [1, 2, 4, 6], f"clean should keep deliveries 1, 2, 4 and 6 (a missing driver does not make a delivery time wrong, so do not drop those rows); got {clean['delivery_id'].tolist()}"
"SUCCESS: problems counted before anything was removed, so the report can say exactly what was excluded and why."`,
          hint: 'issues = {"duplicate_id": int(log["delivery_id"].duplicated().sum()), "bad_minutes": int((~log["minutes"].between(1, 300)).sum()), "missing_driver": int(log["driver"].isna().sum())}',
          solution: 'import pandas as pd\nlog = pd.DataFrame({"delivery_id": [1, 2, 3, 3, 4, 5, 6], "minutes": [34, 41, 0, 0, 28, 1200, 37], "driver": ["A", "B", None, None, "A", "C", None]})\nissues = {"duplicate_id": int(log["delivery_id"].duplicated().sum()), "bad_minutes": int((~log["minutes"].between(1, 300)).sum()), "missing_driver": int(log["driver"].isna().sum())}\nclean = log.drop_duplicates("delivery_id")\nclean = clean[clean["minutes"].between(1, 300)]',
          misconceptions: [{ code: 'import pandas as pd\nlog = pd.DataFrame({"delivery_id": [1, 2, 3, 3, 4, 5, 6], "minutes": [34, 41, 0, 0, 28, 1200, 37], "driver": ["A", "B", None, None, "A", "C", None]})\nclean = log.dropna().drop_duplicates("delivery_id")\nclean = clean[clean["minutes"].between(1, 300)]\nissues = {"duplicate_id": 1, "bad_minutes": 3, "missing_driver": 3}', feedback: 'clean should keep deliveries 1, 2, 4 and 6' }],
        }),
        exercise(12, 2, 'Challenge 2 — Overall versus within groups', 'medium', {
          prompt: 'Using the cleaned survey, compute r_overall (calls vs satisfaction for everyone) and r_by_plan (a dict of plan → r within that plan, rounded to 2 places). Then set explained_by_plan to True if the within-plan correlations are both much weaker (closer to 0) than the overall one.',
          instructions: 'Use `.corr()` on two Series. Group with `groupby("plan")` and compute r for each group.',
          code: `${CLEAN}
r_overall = None
r_by_plan = None
explained_by_plan = None`,
          testCode: `assert r_overall is not None and round(r_overall, 2) == -0.82, f"r_overall should be about -0.82, got {r_overall}"
assert r_by_plan == {"basic": -0.18, "pro": 0.23}, f"r_by_plan should be {{'basic': -0.18, 'pro': 0.23}}, got {r_by_plan}"
assert explained_by_plan is True, "Both within-plan correlations are close to 0 while the overall one is -0.82: most of the pattern is the difference between plans"
"SUCCESS: a strong overall correlation that almost disappears within each plan — a third variable at work."`,
          hint: 'r_by_plan = {p: round(g["calls"].corr(g["satisfaction"]), 2) for p, g in clean.groupby("plan")}',
          solution: `${CLEAN}
r_overall = clean["calls"].corr(clean["satisfaction"])
r_by_plan = {p: round(g["calls"].corr(g["satisfaction"]), 2) for p, g in clean.groupby("plan")}
explained_by_plan = all(abs(r) < abs(r_overall) / 2 for r in r_by_plan.values())`,
          misconceptions: [{ code: `${CLEAN}
r_overall = survey["calls"].corr(survey["satisfaction"])
r_by_plan = {"basic": -0.18, "pro": 0.23}
explained_by_plan = True`, feedback: 'r_overall should be about -0.82' }],
        }),
        exercise(13, 3, 'Challenge 3 — A short investigation report', 'hard', {
          prompt: 'Investigate: "Do longer study sessions go with higher quiz scores?" Check the data, then fill in the report dict: n_used (rows analysed), excluded (a dict of reason → count), r (the correlation you report, rounded to 2), and limitation (one sentence, at least 40 characters, about what the data cannot show).',
          prose: ['The dictionary: student_id unique; minutes studied 0 to 600; score 0 to 100. Check before computing.'],
          instructions: 'Use the reasons "duplicate" and "out_of_range" in excluded. Compute r only on the rows you keep.',
          code: 'import pandas as pd\nstudy = pd.DataFrame({\n    "student_id": [1, 2, 3, 4, 5, 6, 7, 7, 8, 9],\n    "minutes":    [30, 45, 60, 20, 90, 75, 50, 50, 5000, 40],\n    "score":      [55, 62, 70, 48, 85, 78, 66, 66, 90, 58],\n})\nreport = {"n_used": None, "excluded": {}, "r": None, "limitation": ""}',
          testCode: `import pandas as pd
assert report["excluded"] == {"duplicate": 1, "out_of_range": 1}, f"Exclude 1 duplicate (student 7) and 1 out-of-range row (5000 minutes); got {report['excluded']}"
assert report["n_used"] == 8, f"8 rows remain after the exclusions; got {report['n_used']}"
kept = study.drop_duplicates("student_id")
kept = kept[kept["minutes"].between(0, 600) & kept["score"].between(0, 100)]
assert report["r"] == round(kept["minutes"].corr(kept["score"]), 2), f"r should be computed on the 8 kept rows: {round(kept['minutes'].corr(kept['score']), 2)}; got {report['r']}"
assert isinstance(report["limitation"], str) and len(report["limitation"]) >= 40, "Write a limitation of at least 40 characters: what can this small observational dataset not show?"
"SUCCESS: a report that states exactly what was checked, what was excluded, the finding on the kept rows, and its limits."`,
          hint: 'kept = study.drop_duplicates("student_id"); kept = kept[kept["minutes"].between(0, 600)]; report = {"n_used": len(kept), "excluded": {"duplicate": 1, "out_of_range": 1}, "r": round(kept["minutes"].corr(kept["score"]), 2), "limitation": "..."}',
          solution: 'import pandas as pd\nstudy = pd.DataFrame({"student_id": [1, 2, 3, 4, 5, 6, 7, 7, 8, 9], "minutes": [30, 45, 60, 20, 90, 75, 50, 50, 5000, 40], "score": [55, 62, 70, 48, 85, 78, 66, 66, 90, 58]})\ndedup = study.drop_duplicates("student_id")\nkept = dedup[dedup["minutes"].between(0, 600) & dedup["score"].between(0, 100)]\nreport = {\n    "n_used": len(kept),\n    "excluded": {"duplicate": len(study) - len(dedup), "out_of_range": len(dedup) - len(kept)},\n    "r": round(kept["minutes"].corr(kept["score"]), 2),\n    "limitation": "Eight students observed once: this shows an association, not that studying longer causes higher scores.",\n}',
          misconceptions: [{ code: 'import pandas as pd\nstudy = pd.DataFrame({"student_id": [1, 2, 3, 4, 5, 6, 7, 7, 8, 9], "minutes": [30, 45, 60, 20, 90, 75, 50, 50, 5000, 40], "score": [55, 62, 70, 48, 85, 78, 66, 66, 90, 58]})\nreport = {"n_used": 10, "excluded": {}, "r": round(study["minutes"].corr(study["score"]), 2), "limitation": "none"}', feedback: 'Exclude 1 duplicate' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Start from a question and a data dictionary; check the data against it before computing anything.',
    'One impossible value can hide or create a pattern — record every exclusion and why.',
    'Summarise first, then plot to see the shape the summary cannot show.',
    'Correlation measures straight-line association; check extreme values, curves and third variables.',
    'End with a report: question, checks, finding with numbers, and what the data cannot show.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'A correlation changes from −0.09 to −0.82 after removing one impossible value. What should the report say?',
      options: [
        'Only the final correlation',
        'The exclusion and its reason, so readers know the result depends on that decision',
        'Nothing about the exclusion',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'Pearson r between two variables is 0.05. Can you conclude there is no relationship?',
      options: [
        'Yes',
        'No — r only measures straight-line association; a strong curved relationship can have r near 0, so plot the data',
        'Only if the sample is large',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Customers who call more are less satisfied overall, but not within each plan. What is the most likely explanation?',
      options: [
        'Calls cause dissatisfaction',
        'A third variable (plan) affects both calls and satisfaction; the overall pattern mostly reflects differences between plans',
        'The correlation was computed wrongly',
      ],
      correct: 1,
    },
  ],
}
