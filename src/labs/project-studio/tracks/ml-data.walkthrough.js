// What a learner does at each step of "Data — Dataset Explorer" (ml-data), for the walkthrough
// test (mlProduction.desktop.test.js). The entry format is described in ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 1.1 ──────────────────────────────────────────────────────────────────
  '01-01-rows-and-columns#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0, 1] }],
  },
  '01-01-rows-and-columns#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '01-01-rows-and-columns#Read the rows': {
    wrong: [{ name: 'read lists instead of dictionaries', edit: [['csv.DictReader(f)', 'csv.reader(f)']], fails: [0] }],
  },
  '01-01-rows-and-columns#Everything is text': {
    wrong: [
      { name: 'converts empty cells instead of marking them missing', edit: [['        if text == "":\n            row[name] = None\n            continue\n', '']], fails: [0] },
      { name: "doesn't say which column held the bad value", edit: [['raise ValueError(f"column {name!r}: {text!r} is not a valid {convert.__name__}") from None', 'raise']], fails: [0] },
    ],
  },
  '01-01-rows-and-columns#The whole dataset, typed': {
    wrong: [{ name: 'counted empty strings as missing', edit: [['column(rows, name).count(None)', 'column(rows, name).count("")']], fails: [0] }],
  },
  '01-01-rows-and-columns#A first look from the command line': {
    wrong: [{ name: 'counted the header as a row', edit: [['{len(rows)} rows', '{len(rows) + 1} rows']], fails: [0] }],
  },
  '01-01-rows-and-columns#Run the explorer': {
    wrong: [{ name: 'imports main but never calls it', edit: [['raise SystemExit(main())', '']], fails: [0, 1, 2] }],
  },

  // ── 1.2 ──────────────────────────────────────────────────────────────────
  '01-02-questions-by-hand#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '01-02-questions-by-hand#What\'s typical: the mean': {
    wrong: [{ name: 'present keeps the missing values', edit: [['if value is not None]', 'if value is not None or True]']], fails: [0] }],
  },
  '01-02-questions-by-hand#The median': {
    wrong: [
      { name: 'took the upper middle for an even length', edit: [['    return (ordered[middle - 1] + ordered[middle]) / 2', '    return ordered[middle]']], fails: [0] },
      { name: 'sorted the caller\'s list', edit: [['    ordered = sorted(values)', '    values.sort()\n    ordered = values']], fails: [0] },
    ],
  },
  '01-02-questions-by-hand#How spread out: variance and standard deviation': {
    wrong: [
      { name: 'averaged distances without squaring', edit: [['sum((x - m) ** 2 for x in values)', 'sum((x - m) for x in values)']], fails: [0] },
      { name: 'forgot the square root', edit: [['return math.sqrt(variance(values))', 'return variance(values)']], fails: [0] },
    ],
  },
  '01-02-questions-by-hand#Describe a column': {
    wrong: [{ name: 'counted missing values as data', edit: [['    values = present(column(rows, name))', '    values = [v or 0 for v in column(rows, name)]']], fails: [0] }],
  },
  '01-02-questions-by-hand#Filter, count and group': {
    wrong: [
      { name: 'groups rows with a missing group under None', edit: [['        if row[by] is None or row[of] is None:', '        if row[of] is None:']], fails: [0] },
      { name: 'value counts not sorted', edit: [['return dict(sorted(counts.items(), key=lambda pair: -pair[1]))', 'return counts']], fails: [0] },
    ],
  },
  '01-02-questions-by-hand#Questions from the command line': {
    wrong: [{ name: 'describes categorical columns with numbers', edit: [['    if dataset.kind(name) == "categorical":', '    if False:']], fails: [1] }],
  },

  // ── 1.3 ──────────────────────────────────────────────────────────────────
  '01-03-pandas#Install pandas': {
    run: ['.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'added pandas to requirements.txt but did not install it', fails: [0] }],
  },
  '01-03-pandas#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '01-03-pandas#Describe, the pandas way': {
    wrong: [{ name: 'skipped ahead to ddof=0', edit: [['float(values.std())', 'float(values.std(ddof=0))']], fails: [0] }],
  },
  '01-03-pandas#Sample or population?': {
    wrong: [{ name: 'kept the sample standard deviation', edit: [['float(values.std(ddof=0))', 'float(values.std())']], fails: [0] }],
  },
  '01-03-pandas#Masks and groups': {
    wrong: [{ name: 'kept the rows that do not match', edit: [['return df[df[name] == value]', 'return df[df[name] != value]']], fails: [0] }],
  },
  '01-03-pandas#Your turn: the best value per square foot': {
    write: { 'value.py': "import pandas as pd\n\nfrom explorer.frame import load_frame\n\n\ndef median_price_per_sqft(df: pd.DataFrame) -> dict[str, float]:\n    per_sqft = df[\"price\"] / df[\"sqft\"]\n    return per_sqft.groupby(df[\"neighbourhood\"]).median().round(2).sort_values().to_dict()\n\n\nif __name__ == \"__main__\":\n    for name, value in median_price_per_sqft(load_frame(\"data/houses.csv\")).items():\n        print(f\"{name} {value:.2f}\")\n" },
    wrong: [
      { name: 'used the mean', write: { 'value.py': "import pandas as pd\n\nfrom explorer.frame import load_frame\n\n\ndef median_price_per_sqft(df: pd.DataFrame) -> dict[str, float]:\n    per_sqft = df[\"price\"] / df[\"sqft\"]\n    return per_sqft.groupby(df[\"neighbourhood\"]).mean().round(2).sort_values().to_dict()\n\n\nif __name__ == \"__main__\":\n    for name, value in median_price_per_sqft(load_frame(\"data/houses.csv\")).items():\n        print(f\"{name} {value:.2f}\")\n" }, fails: [0, 1] },
      { name: 'read the CSV instead of the table it was given', write: { 'value.py': "import pandas as pd\n\nfrom explorer.frame import load_frame\n\n\ndef median_price_per_sqft(df: pd.DataFrame) -> dict[str, float]:\n    df = load_frame(\"data/houses.csv\")\n    per_sqft = df[\"price\"] / df[\"sqft\"]\n    return per_sqft.groupby(df[\"neighbourhood\"]).median().round(2).sort_values().to_dict()\n\n\nif __name__ == \"__main__\":\n    for name, value in median_price_per_sqft(load_frame(\"data/houses.csv\")).items():\n        print(f\"{name} {value:.2f}\")\n" }, fails: [1] },
    ],
  },
};
