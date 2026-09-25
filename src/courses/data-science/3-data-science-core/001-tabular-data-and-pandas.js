import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const STAFF = `import pandas as pd
df = pd.DataFrame({
    "name":   ["Ana", "Ben", "Cleo", "Dev", "Eli", "Fay"],
    "dept":   ["Eng", "Mkt", "Eng", "Sales", "Eng", "Mkt"],
    "salary": [72000, 58000, 81000, 49000, 67000, 61000],
    "years":  [5, 3, 8, 1, 4, 6],
}, index=[101, 102, 103, 104, 105, 106])`

export default {
  id: 'c-01', slug: 'tabular-data-and-pandas', track: 'C', order: 1,
  title: 'Tabular Data and Pandas', subtitle: 'The DataFrame Model',
  tags: ['pandas', 'dataframe', 'series', 'filtering', 'boolean-indexing'],
  prereqs: ['a-14', 'b-02'], unlocks: ['c-02', 'c-03'],
  hook: {
    question: 'What is a DataFrame, and how do you get exactly the rows and columns you want?',
    realWorldContext: 'pandas is the everyday tool for tables in Python. Most pandas confusion comes from two things: the difference between a row\'s label and its position, and the fact that pandas lines data up by label before it does arithmetic. Get those right and the rest is vocabulary.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Name the parts of a DataFrame. Select rows and columns by label (`loc`) and by position (`iloc`) and predict the exact result. Filter rows with conditions. Read column types. Explain what happens when two Series with different labels are combined.',
        '**One table for the whole lesson.** Six employees, identified by employee ID:',
        '| (index) | name | dept | salary | years |\n|---|---|---|---|---|\n| **101** | Ana | Eng | 72000 | 5 |\n| **102** | Ben | Mkt | 58000 | 3 |\n| **103** | Cleo | Eng | 81000 | 8 |\n| **104** | Dev | Sales | 49000 | 1 |\n| **105** | Eli | Eng | 67000 | 4 |\n| **106** | Fay | Mkt | 61000 | 6 |',
        '**The anatomy.** A **DataFrame** is a table of named **columns** that share one **index** — the row labels, here the employee IDs 101–106. Each column on its own is a **Series**: one-dimensional values of a single type (its *dtype*), carrying the same index. So `df["salary"]` is a Series with labels 101–106 and values 72000, 58000, … . A useful mental model is "a dictionary of labelled arrays that share their labels".',
      ),
      check(
        'What does `df["salary"]` return?',
        ['A DataFrame with one column', 'A Series: the salary values, labelled by the index 101–106', 'A plain Python list'],
        1,
        'Selecting one column name gives a Series. Selecting a list of names, `df[["name", "salary"]]`, gives a DataFrame.',
      ),
      notebook('The DataFrame model', [
        demo(1, 'Stage 1 — Build the table and look at its parts', [
          'The dictionary keys become columns; the `index=` list becomes the row labels.',
        ], 'Run and compare with the table above. Which dtype does each column have, and why?', `${STAFF}
print(df)
print(df.shape)
print(df.index.tolist())
print(df.dtypes)`, { expectOutput: ['(6, 4)', '[101, 102, 103, 104, 105, 106]', 'salary     int64'] }),
        demo(2, 'Stage 2 — A column is a Series', [
          'One name in brackets gives a Series; a list of names gives a DataFrame. Arithmetic on a Series is element by element, like NumPy.',
        ], 'Run. Then select the name and years columns together.', `${STAFF}
s = df["salary"]
print(type(s).__name__, s.loc[103], s.mean())
print(type(df[["name", "salary"]]).__name__)
print((s * 1.05).head(2))`, { expectOutput: ['Series 81000 64666.666666666664', 'DataFrame', '101    75600.0'] }),
      ]),
      prose(
        '**Labels versus positions.** Rows have both a label (101, 102, …) and a position (0, 1, …). pandas gives you one tool for each:',
        '| Accessor | Uses | Example | Result |\n|---|---|---|---|\n| `df.loc[row_label, column_name]` | labels | `df.loc[103, "salary"]` | 81000 |\n| `df.iloc[row_pos, column_pos]` | positions | `df.iloc[2, 2]` | 81000 (third row, third column) |\n| `df.loc[101:103]` | labels, **end included** | | rows 101, 102, 103 |\n| `df.iloc[0:3]` | positions, end excluded | | the first three rows |',
        'Two traps. **Label slices include their end**, unlike every other slice in Python. And asking `loc` for a label that does not exist, such as `df.loc[0]`, raises KeyError — 0 is a position here, not a label.',
      ),
      check(
        'How many rows does `df.loc[102:104]` return?',
        ['2', '3', '4'],
        1,
        'Label slices include both ends: 102, 103 and 104. `df.iloc[1:3]` would return only 2 rows.',
      ),
      notebook('loc and iloc', [
        demo(3, 'Stage 3 — The same cells, two ways', [
          'Every line picks cells from the table; compare each with the loc/iloc table.',
        ], 'Predict each result, then run. Then use loc to get the names of employees 104 to 106.', `${STAFF}
print(df.loc[103, "salary"], df.iloc[2, 2])
print(df.loc[101:103, "name"].tolist())
print(df.iloc[0:3, 0].tolist())
print(df.loc[[106, 101], ["name", "dept"]])`, { expectOutput: ['81000 81000', "['Ana', 'Ben', 'Cleo']", "['Ana', 'Ben', 'Cleo']", 'Fay'] }),
        demo(4, 'Stage 4 — A position used as a label', [
          'There is no row labelled 0, so `loc` cannot find it.',
        ], 'Run and read the KeyError. Then get the first row correctly, with iloc.', `${STAFF}
df.loc[0]`, { expectError: 'KeyError' }),
      ]),
      prose(
        '**Filtering rows.** A comparison on a column, `df["salary"] > 65000`, gives a Series of True/False with the same index — a *mask*. `df[mask]` keeps the rows where it is True. Combine conditions with `&` (and), `|` (or) and `~` (not), wrapping each condition in parentheses; the Python words `and`/`or` raise ValueError on a Series, because a whole column is not a single True or False.',
        '**Look before you compute.** `df.head()` shows the first rows, `df.info()` the column names, dtypes and non-missing counts, and `df.describe()` summary statistics of the numeric columns. They catch specific problems — a numeric column read as text (dtype object), missing values, an impossible minimum — but not everything; later lessons cover what they miss.',
      ),
      notebook('Filtering and first look', [
        demo(5, 'Stage 5 — Masks and combined conditions', [
          'The mask is printed first so you can see which rows it keeps.',
        ], 'Predict which rows each filter keeps, then run. Then find engineers with fewer than 5 years.', `${STAFF}
mask = df["salary"] > 65000
print(mask.tolist())
print(df[mask]["name"].tolist())
print(df[(df["dept"] == "Eng") & (df["years"] >= 5)]["name"].tolist())`, { expectOutput: ['[True, False, True, False, True, False]', "['Ana', 'Cleo', 'Eli']", "['Ana', 'Cleo']"] }),
        demo(6, 'Stage 6 — and/or do not work on columns', [
          '`and` needs one True or False, but `df["dept"] == "Eng"` is six of them.',
        ], 'Run and read the ValueError. Fix it with & and parentheses.', `${STAFF}
df[df["dept"] == "Eng" and df["years"] >= 5]`, { expectError: 'ValueError' }),
        demo(7, 'Stage 7 — The first look', [
          '`info()` prints its report itself (and returns None), so it is not wrapped in print.',
        ], 'Run. What does each command tell you that the others do not?', `${STAFF}
print(df.head(3))
df.info()
print(df.describe().round(1))`, { expectOutput: ['Non-Null Count', '64666.7'] }),
      ]),
      prose(
        '**Alignment by label.** When two Series are combined, pandas matches values by **index label**, not by position. A label present in only one of them gets NaN ("not a number", pandas\' marker for missing). This protects you from silently adding the wrong rows together — and surprises you if you expected position-by-position arithmetic.',
        '| id | salary | bonus | salary + bonus |\n|---|---|---|---|\n| 101 | 72000 | 5000 | 77000 |\n| 102 | 58000 | — | NaN |\n| 103 | 81000 | 3000 | 84000 |\n| … | … | — | NaN |',
        'To treat a missing bonus as 0 instead, use `salary.add(bonus, fill_value=0)`.',
      ),
      check(
        '`a` has labels [1, 2] and values [10, 20]; `b` has labels [2, 3] and values [5, 7]. What is `(a + b)` at label 2?',
        ['15', '25', 'NaN'],
        1,
        'Label 2 is in both: 20 + 5 = 25. Labels 1 and 3 appear in only one Series, so they become NaN.',
      ),
      notebook('Alignment', [
        demo(8, 'Stage 8 — Adding Series with different labels', [
          'Only two employees have a bonus. The sum lines up by employee ID.',
        ], 'Predict each value, then run. Then change the first line to use .add with fill_value=0.', `${STAFF}
bonus = pd.Series({101: 5000, 103: 3000})
print((df["salary"] + bonus).tolist())
print(df["salary"].add(bonus, fill_value=0).tolist())`, { expectOutput: ['[77000.0, nan, 84000.0, nan, nan, nan]', '[77000.0, 58000.0, 84000.0, 49000.0, 67000.0, 61000.0]'] }),
      ]),
      prose('**Practice.** Challenge 1 filters and summarises. Challenge 2 selects by label and by position. Challenge 3 is a fresh alignment problem where you must verify the exact result.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Filter and compute', 'medium', {
          prompt: 'Store the engineers (dept "Eng") in eng and their average salary in eng_avg.',
          instructions: 'Build a mask with `df["dept"] == "Eng"`, then take the mean of the salary column of the filtered rows.',
          code: `${STAFF}
eng = None
eng_avg = None`,
          testCode: `assert eng is not None and len(eng) == 3, f"eng should hold the 3 Eng rows, got {None if eng is None else len(eng)}"
assert eng_avg != df["salary"].mean(), "That is the average over ALL employees. Filter first, then average"
assert abs(eng_avg - 73333.33) < 0.01, f"eng_avg should be (72000 + 81000 + 67000) / 3 = 73333.33, got {eng_avg}"
"SUCCESS: 3 engineers, average salary 73,333."`,
          hint: 'eng = df[df["dept"] == "Eng"]; eng_avg = eng["salary"].mean()',
          solution: `${STAFF}
eng = df[df["dept"] == "Eng"]
eng_avg = eng["salary"].mean()`,
          misconceptions: [{ code: `${STAFF}
eng = df[df["dept"] == "Eng"]
eng_avg = df["salary"].mean()`, feedback: 'That is the average over ALL employees' }],
        }),
        exercise(12, 2, 'Challenge 2 — Labels and positions', 'medium', {
          prompt: 'Store in by_label the names of employees 102 to 104 inclusive (a list), and in by_position the salaries of the last two rows (a list).',
          instructions: 'Use `.loc` with a label slice for the first and `.iloc` with a position slice for the second. Convert with `.tolist()`.',
          code: `${STAFF}
by_label = df.iloc[102:104]["name"].tolist()
by_position = None`,
          testCode: `assert by_label == ["Ben", "Cleo", "Dev"], f"by_label should be ['Ben', 'Cleo', 'Dev']: use df.loc[102:104, 'name'] — label slices include the end. Got {by_label}"
assert by_position == [67000, 61000], f"by_position should be the last two salaries [67000, 61000]: df.iloc[-2:]['salary']. Got {by_position}"
"SUCCESS: loc uses labels (end included), iloc uses positions (end excluded)."`,
          hint: 'by_label = df.loc[102:104, "name"].tolist(); by_position = df.iloc[-2:]["salary"].tolist()',
          solution: `${STAFF}
by_label = df.loc[102:104, "name"].tolist()
by_position = df.iloc[-2:]["salary"].tolist()`,
          misconceptions: [{ code: `${STAFF}
by_label = df.loc[102:103, "name"].tolist()
by_position = df.iloc[-2:]["salary"].tolist()`, feedback: 'label slices include the end' }],
        }),
        exercise(13, 3, 'Challenge 3 — Price updates, aligned', 'hard', {
          prompt: 'Some products have a price change, given by product code. Compute new_price for every product (old price plus change; products with no change keep their price), and n_changed, the number of products whose price changed.',
          prose: ['Check the exact result by hand for two products before you run the checker. Notice that the changes are listed in a different order from the products, and include a code (Z9) that is not in the catalogue.'],
          instructions: 'Series arithmetic aligns by label. `old.add(change, fill_value=0)` treats a missing change as 0, but a code only in `change` would then appear as a new row — select the catalogue\'s codes afterwards with `.loc[old.index]`.',
          code: 'import pandas as pd\nold = pd.Series({"A1": 4.00, "B2": 2.50, "C3": 7.25, "D4": 1.10})\nchange = pd.Series({"C3": 0.75, "A1": -0.50, "Z9": 9.99})\nnew_price = old + change\nn_changed = None',
          testCode: `import pandas as pd
assert new_price.notna().all(), "new_price has NaN: plain + gives NaN for products with no change. Use old.add(change, fill_value=0)"
assert list(new_price.index) == ["A1", "B2", "C3", "D4"], f"new_price should have exactly the catalogue's codes in its order; got {list(new_price.index)}. Select them with .loc[old.index]"
assert new_price.to_dict() == {"A1": 3.5, "B2": 2.5, "C3": 8.0, "D4": 1.1}, f"Check the aligned values: {new_price.to_dict()}"
assert n_changed == 2, "Two catalogue products (A1 and C3) have a change; Z9 is not in the catalogue"
"SUCCESS: values matched by product code, not by position; unknown codes ignored; unchanged prices kept."`,
          hint: 'new_price = old.add(change, fill_value=0).loc[old.index]; n_changed = int((new_price != old).sum())',
          solution: 'import pandas as pd\nold = pd.Series({"A1": 4.00, "B2": 2.50, "C3": 7.25, "D4": 1.10})\nchange = pd.Series({"C3": 0.75, "A1": -0.50, "Z9": 9.99})\nnew_price = old.add(change, fill_value=0).loc[old.index]\nn_changed = int((new_price != old).sum())',
          misconceptions: [
            { code: 'import pandas as pd\nold = pd.Series({"A1": 4.00, "B2": 2.50, "C3": 7.25, "D4": 1.10})\nchange = pd.Series({"C3": 0.75, "A1": -0.50, "Z9": 9.99})\nnew_price = old + change\nn_changed = 2', feedback: 'plain + gives NaN' },
            { code: 'import pandas as pd\nold = pd.Series({"A1": 4.00, "B2": 2.50, "C3": 7.25, "D4": 1.10})\nchange = pd.Series({"C3": 0.75, "A1": -0.50, "Z9": 9.99})\nnew_price = old.add(change, fill_value=0)\nn_changed = 2', feedback: "exactly the catalogue's codes" },
          ],
        }),
      ]),
    ],
  },
  mentalModel: [
    'A DataFrame is named columns sharing one index; each column is a Series of one dtype.',
    'df["col"] gives a Series; df[["a", "b"]] gives a DataFrame.',
    'loc uses labels (slices include the end); iloc uses positions (slices exclude the end).',
    'Filter with masks; combine conditions with &, |, ~ and parentheses — not and/or.',
    'Series arithmetic aligns by label; unmatched labels become NaN unless you give fill_value.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'df["age"] vs df[["age", "salary"]] — why the double brackets?',
      options: [
        'Just style',
        'The inner brackets make a list of column names; selecting a list returns a DataFrame, selecting one name returns a Series',
        'Needed when names have spaces',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'The index is [10, 20, 30]. What is df.loc[10:20]?',
      options: ['Only the row labelled 10', 'The rows labelled 10 and 20 — label slices include the end', 'An error'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Why does df[df["x"] > 1 and df["y"] < 5] raise ValueError?',
      options: [
        'Columns cannot be compared',
        '`and` needs a single True/False, but each comparison is a whole column of them; use & with parentheses',
        'The DataFrame is empty',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'Two Series with different index labels are added. What happens at a label found in only one of them?',
      options: ['The value from the Series that has it', 'NaN — pandas aligns by label and has nothing to add', 'An error'],
      correct: 1,
    },
  ],
}
