export default {
  id:'c-03',slug:'data-cleaning',track:'C',order:3,
  title:'Data Cleaning',subtitle:'Real Data Is Always Wrong',
  tags:['missing-values','type-conversion','duplicates','outliers','pipeline'],
  prereqs:['c-01','a-10'],unlocks:['c-04'],
  hook:{question:'What do you do when data is broken before you even start?',realWorldContext:'A model trained on dirty data learns the dirt. Missing values, wrong types, and duplicates silently corrupt every downstream statistic and prediction. Cleaning is not optional — it is the difference between a result you can trust and one that will embarrass you.'},
  intuition:{
    prose:[
      '**Missing values** (NaN) propagate silently: NaN + 5 = NaN. Find them with `df.isnull().sum()`. Handle them by dropping rows, filling with a statistic, or forward-filling. The right choice depends on the domain and the amount missing.',
      '**Type problems** are among the most common data quality issues. A column of prices stored as strings like "$1.20" looks right but behaves like text, and the failures are inconsistent: some operations raise an error (`.mean()` raises TypeError; adding 1 raises TypeError), while others *succeed with a wrong answer* — `.sum()` glues the strings together into "$1.20$0.50$2.99", `* 2` repeats each string, and `.max()` compares alphabetically, so "$9.00" beats "$10.00". The silent ones are the dangerous ones. Check `df.dtypes` before computing.',
      '**Duplicates** need a definition before they need removing. First decide what one row represents — the **observation identity**: one order, one patient visit, one sensor reading. Two identical-looking rows can be legitimate (two customers really did buy the same item at the same price on the same day) if there is no ID column to tell them apart. Repeated rows are an error only when they describe the *same* observation twice, for example the same `order_id` loaded twice. So: identify the key column(s), inspect the repeated rows with `df[df.duplicated(subset=key, keep=False)]`, decide why they repeat, and only then remove with `df.drop_duplicates(subset=key)`. Record how many rows you removed and why.',
    ],
    callouts:[{type:'important',title:'Missing Value Decision Framework',body:'Rough starting heuristics, not rules:\n< 5% missing:  dropping rows may be acceptable\n5-30% missing:  consider filling numeric with median, categorical with mode\n> 30% missing:  consider dropping the column or adding a "was_missing" indicator flag\n\nAlways ask first: WHY is it missing? Missingness is often informative, and dropping or filling can bias results if it is not random.'}],
    visualizations:[{id:'PythonNotebook',title:'Data Cleaning',props:{initialCells:[
      {id:1,cellTitle:'Stage 1 — Detecting Missing Values',
       prose:'isnull() returns a boolean DataFrame. Sum per column gives you counts.',
       instructions:'Run. The percentage row tells you how serious each column\'s missingness is.',
       code:'import pandas as pd, numpy as np\ndf = pd.DataFrame({"age":[25,np.nan,30,22,np.nan,35],"salary":[50000,75000,np.nan,45000,90000,80000],"name":["A","B","C","D","E","F"]})\nprint("Null counts:")\nprint(df.isnull().sum())\nprint("\\nPercentage missing:")\nprint((df.isnull().sum()/len(df)*100).round(1))',output:'',status:'idle'},
      {id:2,cellTitle:'Stage 2 — Handling Missing Values',
       prose:'Three strategies: drop, fill with statistic, forward fill.',
       instructions:'Run. Each strategy has tradeoffs. Dropping loses data. Filling introduces assumptions.',
       code:'import pandas as pd, numpy as np\ndf = pd.DataFrame({"score":[85,np.nan,92,np.nan,78,88],"prev":[80,85,90,70,np.nan,85]})\nprint("Drop rows with any null:")\nprint(df.dropna())\nprint("\\nFill with column median:")\ndf_filled = df.fillna(df.median())\nprint(df_filled)\nprint("\\nForward fill (carry last value forward):")\nprint(df.ffill())',output:'',status:'idle'},
      {id:3,cellTitle:'Stage 3 — The Type Conversion Problem',
       prose:'Numbers stored as strings look fine but behave as text. Some operations raise an error, which is annoying but safe. Others run and return a wrong answer, which is dangerous: sum() concatenates, max() compares alphabetically.',
       instructions:'Predict what each "before" line prints, then run. Notice which operations fail loudly and which give a plausible-looking wrong answer. The "$" prefix keeps price as a text column (dtype object or str, depending on your pandas version); strip it and convert.',
       code:'import pandas as pd\ndf = pd.DataFrame({"product":["Apple","Banana","Cherry"],"price":["$9.00","$0.50","$10.00"]})\nprint("Before:", df["price"].dtype)\nprint("sum():", df["price"].sum())    # $9.00$0.50$10.00 — silently wrong\nprint("max():", df["price"].max())    # $9.00 — alphabetical, silently wrong\ntry:\n    print(df["price"].mean())\nexcept TypeError as e:\n    print("mean() raises TypeError:", e)\n\ndf["price"] = df["price"].str.replace("$","",regex=False).astype(float)\nprint("After:", df["price"].dtype)\nprint("sum():", df["price"].sum())    # 19.5\nprint("max():", df["price"].max())    # 10.0\nprint("mean():", df["price"].mean())  # 6.5',output:'',status:'idle'},
      {id:4,cellTitle:'Stage 4 — Duplicates',
       prose:'Each row of this table is meant to be one order, identified by order_id. Orders 102 and 104 were loaded more than once — true duplicates. But orders 105 and 106 have identical item and amount: they are two different customers buying the same thing, and must be kept. Checking whole-row duplicates on the columns without the key would wrongly flag them.',
       instructions:'Run. Compare the two duplicate counts. Inspect the repeated rows before removing anything. Then explain in one sentence why 105 and 106 are not duplicates.',
       code:'import pandas as pd\ndf = pd.DataFrame({\n    "order_id":[101,102,102,103,104,104,105,106],\n    "item":    ["pen","ink","ink","pad","pen","pen","cup","cup"],\n    "amount":  [2, 8, 8, 5, 2, 2, 6, 6],\n})\n# Wrong identity: ignores order_id, so 105/106 look like duplicates\nprint("Duplicates by item+amount:", df.duplicated(subset=["item","amount"]).sum())  # 4\n# Right identity: one row per order_id\nkey = ["order_id"]\nprint("Duplicates by order_id:  ", df.duplicated(subset=key).sum())              # 2\n\n# Inspect ALL copies of repeated keys before removing\nprint(df[df.duplicated(subset=key, keep=False)])\n\ndf_clean = df.drop_duplicates(subset=key)\nprint(f"Rows: {len(df)} -> {len(df_clean)}; removed {len(df) - len(df_clean)} repeated orders")\nprint(f"Total amount: {df[\"amount\"].sum()} -> {df_clean[\"amount\"].sum()}")  # 39 -> 29',output:'',status:'idle'},
      {id:5,cellTitle:'Stage 5 — String Cleaning',
       prose:'Text data often has inconsistent formatting. Standardize before grouping.',
       instructions:'Run. Without cleaning, "eng" and "Eng" and "ENG" are three separate groups.',
       code:'import pandas as pd\ndf = pd.DataFrame({"dept":["eng","Eng","ENG","mkt","MKT","Mkt"],"salary":[80,90,85,65,70,68]})\nprint("Unclean groups:", df.groupby("dept")["salary"].mean())\ndf["dept"] = df["dept"].str.upper().str.strip()\nprint("Clean groups:", df.groupby("dept")["salary"].mean())',output:'',status:'idle'},
      {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — Full Cleaning Pipeline',
       difficulty:'hard',
       prompt:'Clean the dataset by: (1) dropping the "id" column, (2) filling missing age with median, (3) dropping rows where salary is NaN, (4) stripping "$" from price and converting to float. Store result in df_clean.',
       instructions:'Apply each step in order. Chain where possible.',
       code:'import pandas as pd, numpy as np\ndf = pd.DataFrame({"id":[1,2,3,4,5],"age":[25,np.nan,30,22,35],"salary":[50000,75000,np.nan,45000,90000],"price":["$10.00","$25.00","$15.00",np.nan,"$20.00"]})\ndf_clean = df.copy()\n# Your steps here\n',output:'',status:'idle',
       testCode:`
if 'id' in df_clean.columns: raise ValueError("Should have dropped 'id' column")
if df_clean['age'].isnull().any(): raise ValueError("Missing age values should be filled with median")
if df_clean['salary'].isnull().any(): raise ValueError("Rows with missing salary should be dropped")
if str(df_clean['price'].dtype) not in ['float64','float32']: raise ValueError(f"price should be float, got {df_clean['price'].dtype}")
if len(df_clean)!=4: raise ValueError(f"Expected 4 rows (1 salary row dropped), got {len(df_clean)}")
res="SUCCESS: All 4 cleaning steps applied correctly."
res
`,hint:'df_clean=df.drop(columns=["id"])\ndf_clean["age"]=df_clean["age"].fillna(df_clean["age"].median())\ndf_clean=df_clean.dropna(subset=["salary"])\ndf_clean["price"]=df_clean["price"].str.replace("$","",regex=False).astype(float)'},
    ]}}],
  },
  mentalModel:[
    'df.isnull().sum() — find missing values per column. Percentage = /len(df)*100.',
    'dropna() removes rows. fillna(median) fills them. ffill() carries last value forward.',
    'Type errors: .str.replace().astype(float) — strip non-numeric chars before converting.',
    'Duplicates: define what one row represents (the key), inspect repeats with duplicated(subset=key, keep=False), then drop_duplicates(subset=key). Identical rows are not automatically errors.',
    'Strings that look like numbers: some operations raise errors, others (sum, max) silently give wrong answers. Check dtypes first.',
    '.str.upper().str.strip() — standardize string categories before grouping.',
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'df.dropna() removes rows with any missing value. df.fillna(df.mean()) fills missing values. When is filling better than dropping?',
      options: [
        'Always fill — dropping data always reduces model accuracy',
        'When missing values are scattered randomly across many rows — dropping those rows would remove most of your dataset; filling with the mean preserves sample size while making a reasonable assumption (missing ≈ average). Drop when missingness is concentrated in a few rows or correlated with the target',
        'Always drop — imputed values introduce bias that corrupts the model',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'A column contains "Male", "male", "MALE", "M" as values for the same category. What causes this to be a problem?',
      options: [
        'Python cannot compare different-length strings correctly',
        'Pandas treats them as 4 distinct categories — groupby("gender") would produce 4 groups instead of 1, and value_counts() would undercount each variant. String standardization (.str.lower().str.strip()) collapses them to one consistent value',
        'The column must be boolean (True/False) for gender data to work correctly',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'df["age"].dtype is "object" but it should be numeric. What likely happened and how do you fix it?',
      options: [
        'The age column has too many digits — use pd.to_numeric(df["age"]) to convert',
        'The column contains some non-numeric entries (e.g., "N/A", "unknown", or spaces mixed in) — Pandas stored the whole column as object (string). Fix: pd.to_numeric(df["age"], errors="coerce") converts valid numbers and makes invalid entries NaN',
        'Integer columns always read as object — use df["age"].astype(int) to convert',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Why is detecting outliers an important part of data cleaning?',
      options: [
        'Outliers are always errors and must be removed before any analysis',
        'Outliers can be data entry errors (age=999), sensor failures, or legitimate extreme cases; they disproportionately affect mean and linear regression. Detecting them lets you decide: investigate further, correct, cap, or keep — not blindly remove',
        'Outlier removal is required by Pandas before calling groupby()',
      ],
      correct: 1,
    },
  ],
}
