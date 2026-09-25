import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const ORDERS = `import pandas as pd
orders = pd.DataFrame({
    "region": ["North", "South", "South", "East", "North", "South", "South", "South"],
    "amount": [100, 40, 50, 200, 120, 60, 50, 50],
})`

export default {
  id: 'c-05', slug: 'groupby-and-aggregation', track: 'C', order: 5,
  title: 'GroupBy and Aggregation', subtitle: 'Split-Apply-Combine',
  tags: ['groupby', 'aggregation', 'pivot', 'transform', 'split-apply-combine'],
  prereqs: ['c-04', 'a-11'], unlocks: ['c-06'],
  hook: {
    question: 'How do you compute statistics for each subgroup — and combine them without fooling yourself?',
    realWorldContext: 'Average order value by region, total sales by month, each customer\'s share of their segment: almost every business question is a group-by. The classic mistake is averaging group averages as if every group were the same size.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Carry out split-apply-combine by hand and with pandas. Tell apart an aggregate (one row per group) from a transform (one value per original row). Explain why the average of group means can differ from the overall mean, and compute the right combination.',
        '**The data.** Eight orders from three regions of very different sizes:',
        '| row | region | amount |\n|---|---|---|\n| 0 | North | 100 |\n| 1 | South | 40 |\n| 2 | South | 50 |\n| 3 | East | 200 |\n| 4 | North | 120 |\n| 5 | South | 60 |\n| 6 | South | 50 |\n| 7 | South | 50 |',
        '**Split, apply, combine.** `orders.groupby("region")["amount"].mean()` does three things:',
        '| Split (group the rows) | Apply (mean of each group) | Combine (one row per group) |\n|---|---|---|\n| East: 200 | 200 | East 200.0 |\n| North: 100, 120 | 110 | North 110.0 |\n| South: 40, 50, 60, 50, 50 | 50 | South 50.0 |',
      ),
      check(
        'The three regional means are 200, 110 and 50. Is the overall mean order amount (200 + 110 + 50) / 3 = 120?',
        ['Yes', 'No — the overall mean is 670 / 8 = 83.75, because South has 5 of the 8 orders and the plain average of means counts East\'s single order as much as South\'s five'],
        1,
        'Averaging group means gives every group equal weight regardless of size. The overall mean weights every order equally.',
      ),
      notebook('Split, apply, combine', [
        demo(1, 'Stage 1 — One aggregate, several aggregates', [
          'The first line reproduces the table. `.agg([...])` applies several functions at once; the `count` column shows how unequal the groups are.',
        ], 'Run and compare with the table. Which region has the highest total even though its mean is the lowest?', `${ORDERS}
print(orders.groupby("region")["amount"].mean())
print(orders.groupby("region")["amount"].agg(["count", "sum", "mean"]))`, { expectOutput: ['South     50.0', 'South       5  250   50.0'] }),
        demo(2, 'Stage 2 — Named aggregations', [
          '`.agg(name=(column, function))` gives each result column a clear name.',
        ], 'Run. Then add the largest order per region as a column called biggest.', `${ORDERS}
summary = orders.groupby("region").agg(orders_n=("amount", "size"), total=("amount", "sum"), average=("amount", "mean"))
print(summary)`, { expectOutput: ['orders_n  total  average', '200.0'] }),
      ]),
      prose(
        '**Aggregate versus transform.** An aggregate returns **one row per group** — here 3 rows. A transform returns **one value per original row**, with the group statistic repeated for every member of the group, lined up by the original index — here 8 values. Use a transform when you want to compare each row with its own group, for example each order\'s share of its region\'s total.',
        '| | `groupby(...)["amount"].sum()` | `groupby(...)["amount"].transform("sum")` |\n|---|---|---|\n| shape | 3 values, indexed by region | 8 values, indexed like `orders` |\n| row 0 (North, 100) | — | 220 |\n| can be added as a column of `orders`? | no — wrong length | yes |',
      ),
      notebook('Aggregate and transform', [
        demo(3, 'Stage 3 — One value per row', [
          'The transform puts each region\'s total on every order in that region, so each order\'s share can be computed row by row.',
        ], 'Run and compare the two lengths. Then check that the shares within each region add up to 1.', `${ORDERS}
agg = orders.groupby("region")["amount"].sum()
tr = orders.groupby("region")["amount"].transform("sum")
print(len(agg), len(tr))
orders["region_total"] = tr
orders["share"] = (orders["amount"] / orders["region_total"]).round(3)
print(orders)`, { expectOutput: ['3 8', '0  North     100           220  0.455'] }),
      ]),
      prose(
        '**Combining group means correctly.** To get the overall mean from group means, weight each group mean by its group size: (110 × 2 + 50 × 5 + 200 × 1) / 8 = 670 / 8 = 83.75. The unweighted average of means, 120, answers a different question — "what is a typical *region\'s* average?" — which is sometimes what you want, but never the same as "what is a typical *order*?".',
        'The same trap appears whenever group sizes differ: averaging per-school pass rates, per-country growth rates, per-day conversion rates. Always ask whether each group, or each underlying item, should count equally.',
      ),
      notebook('Weighting', [
        demo(4, 'Stage 4 — Mean of means versus overall mean', [
          'Three numbers from the same data. The weighted combination recovers the overall mean exactly.',
        ], 'Run. Then add ten more East orders of 200 and predict which of the three numbers change.', `${ORDERS}
g = orders.groupby("region")["amount"].agg(["mean", "size"])
print("overall mean:     ", orders["amount"].mean())
print("mean of means:    ", g["mean"].mean())
print("weighted by size: ", (g["mean"] * g["size"]).sum() / g["size"].sum())`, { expectOutput: ['overall mean:      83.75', 'mean of means:     120.0', 'weighted by size:  83.75'] }),
      ]),
      prose(
        '**Two keys, and time.** Grouping by two columns gives one result per *combination*; `pivot_table` lays it out as a grid, with one key down the side and the other across the top. Combinations with no rows appear as NaN unless you give `fill_value`. For dates, group by a period such as the month with `.dt.to_period("M")`.',
      ),
      notebook('Pivot tables and periods', [
        demo(5, 'Stage 5 — A two-key summary', [
          'Sales by region and product. There are no East sales of product B, so that cell is empty.',
        ], 'Run. Then add fill_value=0 and decide whether 0 or NaN is the more honest display.', `import pandas as pd
sales = pd.DataFrame({"region": ["N", "N", "S", "S", "E"], "product": ["A", "B", "A", "B", "A"], "units": [100, 150, 120, 90, 110]})
print(sales.pivot_table(values="units", index="region", columns="product", aggfunc="sum"))`, { expectOutput: ['E        110.0    NaN'] }),
        demo(6, 'Stage 6 — Monthly totals from daily data', [
          'Each date is mapped to its month, then grouped like any other key.',
        ], 'Run. Which month had the highest total?', `import pandas as pd
daily = pd.DataFrame({"date": pd.to_datetime(["2024-01-05", "2024-01-20", "2024-02-02", "2024-02-14", "2024-02-28", "2024-03-10"]),
                      "sales": [120, 80, 60, 90, 150, 200]})
print(daily.groupby(daily["date"].dt.to_period("M"))["sales"].sum())`, { expectOutput: ['2024-02    300'] }),
      ]),
      prose('**Practice.** Challenge 1 computes growth by group. Challenge 2 needs a transform. Challenge 3 is a fresh problem about combining group averages.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Year-on-year growth by region', 'hard', {
          prompt: 'Compute each region\'s sales growth from 2022 to 2023 as a percentage of 2022 sales. Store a DataFrame growth_df with columns region and growth_pct.',
          instructions: '1. Total sales per region and year: `groupby(["region", "year"])["sales"].sum()`.\n2. `.unstack()` puts the years in columns.\n3. growth = (2023 − 2022) / 2022 × 100.',
          code: 'import pandas as pd\ndf = pd.DataFrame({"region": ["N", "N", "S", "S", "E", "E", "W", "W"],\n                   "year": [2022, 2023, 2022, 2023, 2022, 2023, 2022, 2023],\n                   "sales": [1000, 1200, 800, 900, 1100, 1000, 600, 780]})\ngrowth_df = None',
          testCode: `assert growth_df is not None and {"region", "growth_pct"} <= set(growth_df.columns), "growth_df needs columns region and growth_pct"
g = dict(zip(growth_df["region"], growth_df["growth_pct"]))
assert abs(g["N"] - 16.67) > 0.1, "North: 16.7% divides by the 2023 value. Growth is measured relative to the EARLIER year, 2022"
assert abs(g["N"] - 20.0) < 0.01 and abs(g["S"] - 12.5) < 0.01, f"North should be +20% and South +12.5%, got {g}"
assert abs(g["E"] + 9.0909) < 0.01 and abs(g["W"] - 30.0) < 0.01, f"East should be about -9.1% and West +30%, got {g}"
"SUCCESS: North +20%, South +12.5%, East -9.1%, West +30%."`,
          hint: 't = df.groupby(["region", "year"])["sales"].sum().unstack()\nt["growth_pct"] = (t[2023] - t[2022]) / t[2022] * 100\ngrowth_df = t.reset_index()[["region", "growth_pct"]]',
          solution: 'import pandas as pd\ndf = pd.DataFrame({"region": ["N", "N", "S", "S", "E", "E", "W", "W"], "year": [2022, 2023, 2022, 2023, 2022, 2023, 2022, 2023], "sales": [1000, 1200, 800, 900, 1100, 1000, 600, 780]})\nt = df.groupby(["region", "year"])["sales"].sum().unstack()\nt["growth_pct"] = (t[2023] - t[2022]) / t[2022] * 100\ngrowth_df = t.reset_index()[["region", "growth_pct"]]',
          misconceptions: [{ code: 'import pandas as pd\ndf = pd.DataFrame({"region": ["N", "N", "S", "S", "E", "E", "W", "W"], "year": [2022, 2023, 2022, 2023, 2022, 2023, 2022, 2023], "sales": [1000, 1200, 800, 900, 1100, 1000, 600, 780]})\nt = df.groupby(["region", "year"])["sales"].sum().unstack()\nt["growth_pct"] = (t[2023] - t[2022]) / t[2023] * 100\ngrowth_df = t.reset_index()[["region", "growth_pct"]]', feedback: 'relative to the EARLIER year' }],
        }),
        exercise(12, 2, 'Challenge 2 — Compare each row with its group', 'medium', {
          prompt: 'Add a column dept_avg holding each employee\'s department average salary, and a column above_avg that is True when the employee earns more than that average.',
          instructions: 'You need one value per employee, so use a transform, not an aggregate.',
          code: 'import pandas as pd\ndf = pd.DataFrame({"name": ["A", "B", "C", "D", "E", "F"],\n                   "dept": ["Eng", "Mkt", "Eng", "Sales", "Mkt", "Eng"],\n                   "salary": [80000, 65000, 90000, 55000, 70000, 85000]})\ndf["dept_avg"] = df.groupby("dept")["salary"].mean()',
          testCode: `assert not df["dept_avg"].isna().any(), "dept_avg has NaN: an aggregate has one row per department (indexed by dept), so it does not line up with the employee rows. Use .transform('mean')"
assert df["dept_avg"].tolist() == [85000, 67500, 85000, 55000, 67500, 85000], f"dept_avg should repeat each department's mean for every member, got {df['dept_avg'].tolist()}"
assert "above_avg" in df and df["above_avg"].tolist() == [False, False, True, False, True, False], "above_avg should be salary > dept_avg"
"SUCCESS: transform gives one group value per row, so each employee can be compared with their own department."`,
          hint: 'df["dept_avg"] = df.groupby("dept")["salary"].transform("mean")\ndf["above_avg"] = df["salary"] > df["dept_avg"]',
          solution: 'import pandas as pd\ndf = pd.DataFrame({"name": ["A", "B", "C", "D", "E", "F"], "dept": ["Eng", "Mkt", "Eng", "Sales", "Mkt", "Eng"], "salary": [80000, 65000, 90000, 55000, 70000, 85000]})\ndf["dept_avg"] = df.groupby("dept")["salary"].transform("mean")\ndf["above_avg"] = df["salary"] > df["dept_avg"]',
          misconceptions: [{ code: 'import pandas as pd\ndf = pd.DataFrame({"name": ["A", "B", "C", "D", "E", "F"], "dept": ["Eng", "Mkt", "Eng", "Sales", "Mkt", "Eng"], "salary": [80000, 65000, 90000, 55000, 70000, 85000]})\ndf["dept_avg"] = df.groupby("dept")["salary"].mean()\ndf["above_avg"] = False', feedback: 'Use .transform' }],
        }),
        exercise(13, 3, 'Challenge 3 — Average of averages', 'medium', {
          prompt: 'Three classes took the same test. Compute overall_mean (average over all students), mean_of_means (average of the three class averages) and weighted (class averages weighted by class size). Then set reason to the letter of the explanation for why the first two differ.',
          prose: ['- A: the classes have different numbers of students, and averaging class averages counts each class equally\n- B: pandas rounds class averages\n- C: the overall mean ignores the smallest class'],
          instructions: 'Use `groupby("class")["score"].agg(["mean", "size"])`. The weighted value should equal overall_mean exactly.',
          code: 'import pandas as pd\nscores = pd.DataFrame({\n    "class": ["X"] * 2 + ["Y"] * 6 + ["Z"] * 2,\n    "score": [90, 94, 60, 64, 62, 58, 66, 62, 80, 84],\n})\noverall_mean = None\nmean_of_means = None\nweighted = None\nreason = None',
          testCode: `assert overall_mean == 72.0, f"overall_mean should be 720 / 10 = 72.0, got {overall_mean}"
assert mean_of_means is not None and abs(mean_of_means - 78.6667) < 0.001, f"mean_of_means should be the average of the class means 92, 62 and 82, which is 78.67; got {mean_of_means}"
assert abs(weighted - overall_mean) < 1e-9, "weighted should recover the overall mean: sum(mean × size) / sum(size)"
assert reason == "A", "The difference comes from unequal class sizes: class Y has 6 of the 10 students but only one third of the weight in the average of averages"
"SUCCESS: 72.0 overall, 78.67 as an average of class averages; weighting by size recovers 72.0."`,
          hint: 'g = scores.groupby("class")["score"].agg(["mean", "size"]); mean_of_means = g["mean"].mean(); weighted = (g["mean"] * g["size"]).sum() / g["size"].sum()',
          solution: 'import pandas as pd\nscores = pd.DataFrame({"class": ["X"] * 2 + ["Y"] * 6 + ["Z"] * 2, "score": [90, 94, 60, 64, 62, 58, 66, 62, 80, 84]})\noverall_mean = scores["score"].mean()\ng = scores.groupby("class")["score"].agg(["mean", "size"])\nmean_of_means = g["mean"].mean()\nweighted = (g["mean"] * g["size"]).sum() / g["size"].sum()\nreason = "A"',
          misconceptions: [{ code: 'overall_mean = 72.0\nmean_of_means = 72.0\nweighted = 72.0\nreason = "A"', feedback: 'mean_of_means should be' }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'groupby: split rows by key → apply a function to each group → combine into one result per group.',
    'An aggregate returns one row per group; a transform returns one value per original row.',
    'Averaging group means weights every group equally; weight by group size to get the overall mean.',
    'Two keys give one result per combination; empty combinations are NaN unless filled.',
    'Group dates by period (e.g. month) like any other key.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'df.groupby("department")["salary"].mean() computes what?',
      options: ['The company-wide mean salary', 'One mean salary per department', 'The department with the highest salary'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'You want a column showing each order\'s share of its region\'s total. Which do you need?',
      options: ['groupby(...).sum()', 'groupby(...).transform("sum") — one value per order, aligned with the original rows', 'pivot_table'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Region A has 1 store averaging 500 sales; region B has 9 stores averaging 100. What is the average sales per store?',
      options: ['300', '140 — (500 × 1 + 100 × 9) / 10', '100'],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'df.groupby(["region", "product"])["revenue"].sum() gives what?',
      options: ['One row per region', 'One row per (region, product) combination that appears in the data', 'One row per product'],
      correct: 1,
    },
  ],
}
