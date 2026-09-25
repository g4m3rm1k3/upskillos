import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const RAW = `import pandas as pd, numpy as np
raw = pd.DataFrame({
    "visit_id":  [1, 2, 3, 3, 4, 5, 6, 7, 8],
    "age":       ["34", "N/A", "29", "29", "41", "-999", "38", " 52", "27"],
    "weight_kg": [70.5, 82.0, None, None, 65.2, 90.1, 1200.0, 77.3, None],
    "clinic":    ["North", "north ", "South", "South", "NORTH", "South", "East", "east", "South"],
})`

export default {
  id: 'c-03', slug: 'data-cleaning', track: 'C', order: 3,
  title: 'Data Cleaning', subtitle: 'Repairs You Can Justify',
  tags: ['missing-values', 'type-conversion', 'duplicates', 'outliers', 'pipeline'],
  prereqs: ['c-01', 'a-10'], unlocks: ['c-04'],
  hook: {
    question: 'What do you do when data is broken before you even start?',
    realWorldContext: 'Every real dataset has problems: numbers stored as text, codes like -999 that mean "missing", impossible values, inconsistent spellings, repeated records. Cleaning is not tidying up by taste. Each repair should follow a written rule, be counted, and be reversible — because every repair is an assumption someone may need to check.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Write a quality contract for a table and find the rows that break it. Repair each problem with a stated rule, keeping the raw data untouched and logging what changed. Decide what a duplicate is. Explain why data are missing, and fill missing values using only training rows so the same repair can be applied to new data.',
        '**The dirty data.** Nine rows from a clinic\'s visit log:',
        '| visit_id | age | weight_kg | clinic |\n|---|---|---|---|\n| 1 | "34" | 70.5 | North |\n| 2 | "N/A" | 82.0 | "north " |\n| 3 | "29" | *missing* | South |\n| 3 | "29" | *missing* | South |\n| 4 | "41" | 65.2 | NORTH |\n| 5 | "-999" | 90.1 | South |\n| 6 | "38" | 1200.0 | East |\n| 7 | " 52" | 77.3 | east |\n| 8 | "27" | *missing* | South |',
        '**A quality contract** states what a correct row looks like, before you touch anything:',
        '1. **One row per visit** — `visit_id` is the key.\n2. **age** is a whole number from 0 to 120; "N/A" and -999 are this system\'s codes for *unknown*.\n3. **weight_kg** is between 2 and 400; anything else is an entry error, recorded as unknown rather than guessed.\n4. **clinic** is one of North, South, East, ignoring case and surrounding spaces.',
        'Every repair below cites one of these rules. A repair you cannot justify with a rule is a guess.',
      ),
      check(
        'Visit 6 has weight 1200 kg. What does the contract say to do?',
        ['Divide by 10, since it was probably 120.0', 'Mark it unknown (NaN) and log it — rule 3 says out-of-range values are entry errors, not to be guessed', 'Delete the whole visit'],
        1,
        'It might be 120 kg, or 12.00, or a typo for 120.0 — we cannot know. Recording it as unknown and logging it keeps the rest of the visit and leaves the decision visible.',
      ),
      notebook('Look first, change nothing', [
        demo(1, 'Stage 1 — The raw table and its types', [
          'The age column is text (dtype object), because every age arrived as text — and some, like "N/A", are not numbers at all. Nothing is changed yet: the raw table is kept exactly as loaded.',
        ], 'Run. Which rules can you already see broken?', `${RAW}
print(raw)
print(raw.dtypes)`, { expectOutput: ['age           object', 'weight_kg    float64'] }),
      ]),
      prose(
        '**Repair on a copy, and log each change.** Work on `clean = raw.copy()` so the original stays available for checking. For each rule, find the rows that break it, repair them, and record how many were affected. A log of "rule → rows changed" lets anyone audit or undo a step.',
        '**Text to numbers.** `pd.to_numeric(x, errors="coerce")` converts what it can and turns the rest into NaN. That is only safe if you *look at what became NaN*: here "N/A" is a known missing code, and nothing valid should be lost. (`to_numeric` happens to tolerate the spaces in " 52", but category matching does not, so strip text anyway.) Then apply the range rule: -999 converts fine to a number, but it is still a missing code.',
      ),
      notebook('Repairs, one rule at a time', [
        demo(2, 'Stage 2 — Types and missing codes (rules 2 and 3)', [
          'Each repair counts the rows it changed. `clean` is a copy; `raw` is untouched, as the last line checks.',
        ], 'Run and read the log. Which visits lost their age, and which rule caused each? Then print raw.loc[bad_age, "age"] to see the original values behind each repair.', `${RAW}
clean = raw.copy()
log = {}

age = pd.to_numeric(clean["age"].str.strip(), errors="coerce")
bad_age = age.isna() | (age < 0) | (age > 120)
log["age: missing code or out of range"] = clean.loc[bad_age, "visit_id"].tolist()
clean["age"] = age.where(~bad_age)

bad_weight = (clean["weight_kg"] < 2) | (clean["weight_kg"] > 400)
log["weight_kg: out of range"] = clean.loc[bad_weight, "visit_id"].tolist()
clean.loc[bad_weight, "weight_kg"] = np.nan

for rule, visits in log.items():
    print(rule, "-> visits", visits)
print(clean[["visit_id", "age", "weight_kg"]].to_string(index=False))
print("raw unchanged:", raw.loc[5, "age"] == "-999")`, { expectOutput: ['age: missing code or out of range -> visits [2, 5]', 'weight_kg: out of range -> visits [6]', 'raw unchanged: True'] }),
        demo(3, 'Stage 3 — Categories (rule 4)', [
          'Before cleaning, pandas sees six different clinic spellings. After `.str.strip().str.title()` there are three, and every value is checked against the allowed set.',
        ], 'Run. Then add a row with clinic "West" and see the check catch it.', `${RAW}
print(sorted(raw["clinic"].unique()))
clinic = raw["clinic"].str.strip().str.title()
print(sorted(clinic.unique()))
allowed = {"North", "South", "East"}
print("not allowed:", clinic[~clinic.isin(allowed)].tolist())`, { expectOutput: ["['East', 'NORTH', 'North', 'South', 'east', 'north ']", "['East', 'North', 'South']", 'not allowed: []'] }),
      ]),
      prose(
        '**Duplicates need a definition.** Rule 1 says the key is `visit_id`, so two rows for visit 3 break the contract. Here they are identical, so dropping one loses nothing. If they *differed* (say, two different ages), dropping either would silently choose an answer; that is a conflict to report, not to hide. And two rows that happen to have the same age, weight and clinic but *different* visit IDs are two real visits, not duplicates — matching all columns except the key would wrongly merge them.',
      ),
      check(
        'Two rows share visit_id 12 but have ages 40 and 44. What should the cleaning step do?',
        ['Keep the first', 'Keep the larger age', 'Report the conflict and resolve it from the source; do not pick one silently'],
        2,
        'Both cannot be right, and nothing in the data says which is. Flag it so someone can check the original record.',
      ),
      notebook('Duplicates', [
        demo(4, 'Stage 4 — Duplicates by key, and conflicts', [
          'First find every visit_id that appears more than once. Then check whether its copies agree before removing any.',
        ], 'Run. Then change the second visit-3 age to "30" and run again: the conflict check should catch it.', `${RAW}
key_dupes = raw[raw.duplicated("visit_id", keep=False)]
print(key_dupes)
conflicts = key_dupes.groupby("visit_id").nunique().gt(1).any(axis=1)
print("conflicting keys:", conflicts[conflicts].index.tolist())
deduped = raw.drop_duplicates("visit_id")
print(len(raw), "->", len(deduped), "rows")`, { expectOutput: ['conflicting keys: []', '9 -> 8 rows'] }),
      ]),
      prose({ anchor: 'missing-values' },
        '**Why is it missing?** Before filling a gap, ask why it is there, because the answer decides whether filling is safe.',
        '| Reason | Example | Filling with a typical value |\n|---|---|---|\n| unrelated to anything (*missing completely at random*) | the scale was broken for a random hour | usually reasonable |\n| related to other recorded columns (*at random*) | the South clinic has no scale | reasonable within groups, e.g. per clinic |\n| related to the missing value itself (*not at random*) | heavier patients declined to be weighed | biased: filled values will be too low |',
        'The data cannot prove which case you are in, so record what you did: add a `was_missing` column next to every filled value. Analyses can then check whether the filled rows behave differently.',
        '**Fit on training rows, apply everywhere.** A fill value such as a median is *learned from data*. Learn it from the training rows only, store it, and apply the same stored value to new rows later. If you recompute it on new data, today\'s cleaned rows and tomorrow\'s would be filled differently, and when data are split for modelling, information from the test rows leaks into training (Lesson D.07).',
      ),
      notebook('Missing values', [
        demo(5, 'Stage 5 — Count, flag, then fill from training rows', [
          'The first six visits are the training rows. Their median age and weight are computed once and stored; the later visits are filled with those same stored values. `was_missing` columns record every fill.',
        ], 'Run. Then (wrongly) compute the medians from all rows and compare: which fill values change?', `${RAW}
clean = raw.drop_duplicates("visit_id").copy()
age = pd.to_numeric(clean["age"].str.strip(), errors="coerce")
clean["age"] = age.where((age >= 0) & (age <= 120))
clean.loc[(clean["weight_kg"] < 2) | (clean["weight_kg"] > 400), "weight_kg"] = np.nan
print(clean[["age", "weight_kg"]].isna().sum().to_dict())

train = clean.iloc[:6]
fill = {"age": train["age"].median(), "weight_kg": train["weight_kg"].median()}
print("fill values from training rows:", fill)

for col, value in fill.items():
    clean[col + "_was_missing"] = clean[col].isna()
    clean[col] = clean[col].fillna(value)
print(clean.to_string(index=False))`, { expectOutput: ["{'age': 2, 'weight_kg': 3}", "fill values from training rows: {'age': 36.0, 'weight_kg': 76.25}"] }),
      ]),
      prose('**Practice.** Challenge 1 turns a contract rule into a function. Challenge 2 checks key duplicates for conflicts. Challenge 3 is a fresh problem: a fit-then-apply cleaner that works on new rows and never changes its input.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Clean an age column', 'medium', {
          prompt: 'Write clean_age(values) that takes a Series of age text and returns a numeric Series: strip spaces, convert, and turn the missing codes "N/A" and -999 — and any age outside 0 to 120 — into NaN.',
          instructions: 'Use `pd.to_numeric(..., errors="coerce")` after `.str.strip()`, then `.where(...)` to keep only valid ages. Do not use `astype(int)`: it cannot hold NaN and crashes on "N/A".',
          code: 'import pandas as pd, numpy as np\n\ndef clean_age(values):\n    return values.astype(int)\n\nprint(clean_age(pd.Series(["34", " 52", "N/A", "-999", "130"])))',
          testCode: `import pandas as pd, numpy as np
got = clean_age(pd.Series(["34", " 52", "N/A", "-999", "130", "0"]))
assert got.iloc[1] == 52, "' 52' is a valid age and must become 52"
assert np.isnan(got.iloc[2]), "'N/A' is a missing code: it should become NaN"
assert np.isnan(got.iloc[3]), "-999 converts to a number but is a missing code; the 0–120 range rule should turn it into NaN"
assert np.isnan(got.iloc[4]), "130 is outside 0–120, so it should be NaN"
assert got.iloc[0] == 34 and got.iloc[5] == 0, "Valid ages (including 0) must be kept"
"SUCCESS: every value is either a valid age or NaN, and each NaN comes from a stated rule."`,
          hint: 'age = pd.to_numeric(values.str.strip(), errors="coerce")\nreturn age.where((age >= 0) & (age <= 120))',
          solution: 'import pandas as pd, numpy as np\n\ndef clean_age(values):\n    age = pd.to_numeric(values.str.strip(), errors="coerce")\n    return age.where((age >= 0) & (age <= 120))',
          misconceptions: [
            { code: 'import pandas as pd\ndef clean_age(values):\n    return pd.to_numeric(values.str.strip(), errors="coerce")', feedback: 'the 0–120 range rule should turn it into NaN' },
          ],
        }),
        exercise(12, 2, 'Challenge 2 — Duplicate keys and conflicts', 'medium', {
          prompt: 'In orders, order_id should be unique. Store in dup_keys the sorted list of order IDs that appear more than once, and in conflicts the sorted list of those whose copies disagree in any column. Then build deduped with one row per order_id, keeping only orders with no conflict.',
          instructions: 'Find repeated keys with `duplicated("order_id", keep=False)`. For each repeated key, its copies conflict if any column has more than one distinct value (`groupby(...).nunique()`).',
          code: 'import pandas as pd\norders = pd.DataFrame({\n    "order_id": [10, 11, 11, 12, 13, 13, 14],\n    "item":     ["pen", "ink", "ink", "pad", "cup", "mug", "pen"],\n    "qty":      [2, 1, 1, 5, 3, 3, 1],\n})\ndup_keys = None\nconflicts = None\ndeduped = orders.drop_duplicates()',
          testCode: `assert dup_keys == [11, 13], f"dup_keys should be [11, 13], got {dup_keys}"
assert conflicts == [13], f"Order 13's copies disagree (cup vs mug); order 11's copies are identical. conflicts should be [13], got {conflicts}"
assert 13 not in deduped["order_id"].tolist(), "A conflicting order should not be kept silently: drop_duplicates() kept both versions of order 13. Remove conflicting keys, then deduplicate"
assert deduped["order_id"].tolist() == [10, 11, 12, 14], f"deduped should hold orders [10, 11, 12, 14], got {deduped['order_id'].tolist()}"
"SUCCESS: identical copies removed; the conflicting order held back for checking instead of silently chosen."`,
          hint: 'rep = orders[orders.duplicated("order_id", keep=False)]\ndup_keys = sorted(rep["order_id"].unique())\nn = rep.groupby("order_id").nunique()\nconflicts = sorted(n[(n > 1).any(axis=1)].index)\ndeduped = orders[~orders["order_id"].isin(conflicts)].drop_duplicates("order_id")',
          solution: 'import pandas as pd\norders = pd.DataFrame({\n    "order_id": [10, 11, 11, 12, 13, 13, 14],\n    "item":     ["pen", "ink", "ink", "pad", "cup", "mug", "pen"],\n    "qty":      [2, 1, 1, 5, 3, 3, 1],\n})\nrep = orders[orders.duplicated("order_id", keep=False)]\ndup_keys = sorted(rep["order_id"].unique().tolist())\nn = rep.groupby("order_id").nunique()\nconflicts = sorted(n[(n > 1).any(axis=1)].index.tolist())\ndeduped = orders[~orders["order_id"].isin(conflicts)].drop_duplicates("order_id")',
          misconceptions: [{ code: 'import pandas as pd\norders = pd.DataFrame({"order_id": [10, 11, 11, 12, 13, 13, 14], "item": ["pen", "ink", "ink", "pad", "cup", "mug", "pen"], "qty": [2, 1, 1, 5, 3, 3, 1]})\ndup_keys = [11, 13]\nconflicts = [13]\ndeduped = orders.drop_duplicates()', feedback: 'A conflicting order should not be kept silently' }],
        }),
        exercise(13, 3, 'Challenge 3 — A fill step for new data', 'hard', {
          prompt: 'Write fit_fill(train) returning a dict of column → median for the numeric columns of train, and apply_fill(df, fill) returning a NEW DataFrame where each column in fill has its missing values filled from fill and a <column>_was_missing flag added. apply_fill must not change df.',
          prose: ['The checker fits on training rows, then applies to new rows it has never shown you — including new rows whose values would change the median if you (wrongly) recomputed it.'],
          instructions: '`train.select_dtypes("number")` picks numeric columns. In apply_fill, start with `out = df.copy()`, and for each column record `isna()` before filling.',
          code: 'import pandas as pd, numpy as np\n\ndef fit_fill(train):\n    pass  # return {column: median}\n\ndef apply_fill(df, fill):\n    for col, value in fill.items():\n        df[col] = df[col].fillna(df[col].median())\n    return df',
          testCode: `import pandas as pd, numpy as np
train = pd.DataFrame({"age": [30.0, np.nan, 40.0, 50.0], "weight": [60.0, 80.0, np.nan, 70.0], "clinic": ["N", "S", "N", "E"]})
fill = fit_fill(train)
assert fill == {"age": 40.0, "weight": 70.0}, f"fit_fill should return the training medians of the numeric columns only, {{'age': 40.0, 'weight': 70.0}}; got {fill}"
new = pd.DataFrame({"age": [np.nan, 90.0, 95.0], "weight": [np.nan, np.nan, 100.0], "clinic": ["S", "N", "E"]})
before = new.copy()
out = apply_fill(new, fill)
assert new.equals(before), "apply_fill changed its input. Work on out = df.copy() so the raw rows are preserved"
assert out.loc[0, "age"] == 40.0, "The missing age must be filled with the TRAINING median (40), not a median recomputed from the new rows (92.5)"
assert out.loc[1, "weight"] == 70.0, "The missing weight must be filled with the training median (70)"
assert "age_was_missing" in out and out["age_was_missing"].tolist() == [True, False, False], "Add age_was_missing marking which ages were filled"
assert out["weight_was_missing"].tolist() == [True, True, False], "Add weight_was_missing marking which weights were filled"
"SUCCESS: fill values are learned once from training rows, applied unchanged to new rows, flagged, and the input is left intact."`,
          hint: 'fit_fill: return {c: train[c].median() for c in train.select_dtypes("number")}\napply_fill: out = df.copy(); for c, v in fill.items(): out[c + "_was_missing"] = out[c].isna(); out[c] = out[c].fillna(v)',
          solution: 'import pandas as pd, numpy as np\n\ndef fit_fill(train):\n    return {c: float(train[c].median()) for c in train.select_dtypes("number").columns}\n\ndef apply_fill(df, fill):\n    out = df.copy()\n    for col, value in fill.items():\n        out[col + "_was_missing"] = out[col].isna()\n        out[col] = out[col].fillna(value)\n    return out',
          misconceptions: [
            { code: 'import pandas as pd\ndef fit_fill(train):\n    return {c: float(train[c].median()) for c in train.select_dtypes("number").columns}\ndef apply_fill(df, fill):\n    out = df.copy()\n    for col in fill:\n        out[col + "_was_missing"] = out[col].isna()\n        out[col] = out[col].fillna(out[col].median())\n    return out', feedback: 'not a median recomputed from the new rows' },
            { code: 'import pandas as pd\ndef fit_fill(train):\n    return {c: float(train[c].median()) for c in train.select_dtypes("number").columns}\ndef apply_fill(df, fill):\n    for col, value in fill.items():\n        df[col + "_was_missing"] = df[col].isna()\n        df[col] = df[col].fillna(value)\n    return df', feedback: 'apply_fill changed its input' },
          ],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Write the quality contract first; every repair cites a rule.',
    'Repair a copy, keep the raw data, and log which rows each rule changed.',
    'Check what errors="coerce" turned into NaN; missing codes like -999 need explicit rules.',
    'Duplicates are defined by the key; identical copies can go, conflicting copies must be reported.',
    'Ask why values are missing; flag every fill; learn fill values from training rows and reuse them on new data.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'Why keep the raw data untouched and clean a copy?',
      options: [
        'pandas requires it',
        'So every repair can be checked against the original and undone if a rule turns out to be wrong',
        'Copies are faster',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'pd.to_numeric(col, errors="coerce") turned 12 values into NaN. What should you do next?',
      options: [
        'Nothing — coercion handled it',
        'Look at the original values that became NaN, to check they were really missing codes and not valid numbers in an unexpected format',
        'Fill them with 0',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Heavier patients were more likely to refuse to be weighed. What does filling missing weights with the median do?',
      options: [
        'Nothing harmful',
        'It biases weights downward, because the missing values were probably higher than typical — flag the filled rows and treat results with caution',
        'It increases the average weight',
      ],
      correct: 1,
    },
    {
      id: 'q4', type: 'choice',
      text: 'Why compute the fill median from training rows only?',
      options: [
        'It is faster',
        'New rows must be cleaned with the same stored rule, and test rows must not influence training — otherwise information leaks from evaluation data',
        'Medians of small tables are more accurate',
      ],
      correct: 1,
    },
  ],
}
