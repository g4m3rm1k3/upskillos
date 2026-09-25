import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const CSV = `import pandas as pd, io
csv_text = """customer_id,postcode,signup,plan,monthly_fee
C01,02134,2024-01-15,basic,9.99
C02,10001,2024-02-03,pro,N/A
C03,00501,2024-02-20,basic,9.99
C04,94105,-,team,49.00
"""`

const TABLES = `import pandas as pd
customers = pd.DataFrame({
    "customer_id": ["C01", "C02", "C03", "C04"],
    "region":      ["North", "South", "North", "East"],
})
orders = pd.DataFrame({
    "order_id":    [1, 2, 3, 4, 5, 6],
    "customer_id": ["C01", "C01", "C02", "C03", "C09", "C03"],
    "amount":      [20, 35, 15, 50, 40, 10],
})`

export default {
  id: 'c-07', slug: 'reading-and-joining-data', track: 'C', order: 6,
  title: 'Reading and Joining Data', subtitle: 'Loading Files Faithfully and Combining Tables Safely',
  tags: ['read_csv', 'data-dictionary', 'merge', 'join', 'cardinality'],
  prereqs: ['c-03', 'c-05'], unlocks: ['c-06'],
  hook: {
    question: 'Your data arrives as a file and in several tables. How do you load it without changing it, and combine the tables without silently losing or duplicating rows?',
    realWorldContext: 'Real analyses start by reading files and joining tables. Both steps can change your data without any error: a reader can drop leading zeros or misread missing-value codes, and a join can drop unmatched rows or multiply rows when a key is repeated. Checking row counts and keys before and after is the habit that catches both.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will be able to do.** Read a CSV file with explicit column types and missing-value codes, and check it against a data dictionary. Join two tables, choose between inner and left joins, find rows that did not match, and detect when a repeated key multiplies rows.',
        '**The smallest example.** A CSV file is plain text: one line per row, values separated by commas, with a header line of column names.',
        '```text\ncustomer_id,postcode,signup,plan,monthly_fee\nC01,02134,2024-01-15,basic,9.99\nC02,10001,2024-02-03,pro,N/A\nC03,00501,2024-02-20,basic,9.99\nC04,94105,-,team,49.00\n```',
        '`pd.read_csv` guesses each column\'s type. The guesses are often wrong in quiet ways: postcodes look like numbers, so "02134" becomes 2134; "N/A" is recognised as missing but "-" is not, so `signup` stays text. Tell the reader what you know instead of letting it guess.',
      ),
      check(
        'Read with default settings, what does the postcode "00501" become?',
        ['"00501"', '501', 'NaN'],
        1,
        'The column looks numeric, so it is read as integers and the leading zeros disappear. Postcodes are labels: read them with dtype=str.',
      ),
      notebook('Reading a file faithfully', [
        demo(1, 'Stage 1 — Default guesses versus explicit settings', [
          '`io.StringIO` lets the text above be read as if it were a file. The first read uses pandas\' guesses; the second states the types, the missing-value codes and which column holds dates.',
        ], 'Run and compare the two dtype lists and postcode columns. Then remove "-" from na_values and see what happens to signup.', `${CSV}
guessed = pd.read_csv(io.StringIO(csv_text))
print(guessed.dtypes.to_dict())
print(guessed["postcode"].tolist())

df = pd.read_csv(io.StringIO(csv_text), dtype={"postcode": str}, na_values=["N/A", "-"], parse_dates=["signup"])
print(df.dtypes.to_dict())
print(df["postcode"].tolist(), df["monthly_fee"].isna().sum(), df["signup"].isna().sum())`, { expectOutput: ['[2134, 10001, 501, 94105]', "['02134', '10001', '00501', '94105'] 1 1"] }),
      ]),
      prose(
        '**A data dictionary.** Write down, for every column, what it means, its unit, its type and its allowed values — then check the file against it. The dictionary is the contract from Lesson C.03, applied at the moment data enters your analysis.',
        '| column | meaning | type | allowed values |\n|---|---|---|---|\n| customer_id | unique customer code | text | "C" + 2 digits, unique |\n| postcode | postal code | text | 5 digits, leading zeros kept |\n| signup | date of sign-up | date | not in the future |\n| plan | subscription plan | text | basic, pro, team |\n| monthly_fee | fee in currency units | number | 0 to 100, or missing |',
      ),
      notebook('Checking against the dictionary', [
        demo(2, 'Stage 2 — Each rule as a check', [
          'Every rule in the dictionary becomes one line that counts the rows breaking it. A report of zeros is evidence the file matches its description.',
        ], 'Run. Then change one postcode in csv_text to "2134" and re-run: which check catches it?', `${CSV}
df = pd.read_csv(io.StringIO(csv_text), dtype={"postcode": str}, na_values=["N/A", "-"], parse_dates=["signup"])
report = {
    "customer_id not unique": int(df["customer_id"].duplicated().sum()),
    "postcode not 5 digits": int((~df["postcode"].str.fullmatch(r"\\d{5}")).sum()),
    "plan not allowed": int((~df["plan"].isin(["basic", "pro", "team"])).sum()),
    "fee out of range": int((~df["monthly_fee"].between(0, 100) & df["monthly_fee"].notna()).sum()),
}
print(report)`, { expectOutput: ["{'customer_id not unique': 0, 'postcode not 5 digits': 0, 'plan not allowed': 0, 'fee out of range': 0}"] }),
      ]),
      prose(
        '**Joining tables.** Orders record a customer ID; customers record each customer\'s region. `pd.merge(orders, customers, on="customer_id", how=...)` combines them by matching the key. What happens to rows *without* a match depends on `how`:',
        '| how | keeps | here: 6 orders, one with unknown customer C09 |\n|---|---|---|\n| "inner" | only rows whose key is in both tables | 5 rows — the C09 order silently disappears |\n| "left" | every row of the left table; unmatched get NaN | 6 rows — C09\'s region is NaN |\n| "outer" | every row of both | also includes customers with no orders (C04) |',
        'A left join keeps the order count honest, and `indicator=True` adds a `_merge` column saying where each row came from, so unmatched rows can be counted and investigated rather than lost.',
      ),
      check(
        'You inner-join 6 orders to customers and get 5 rows. What happened?',
        ['A row was duplicated', 'One order\'s customer_id has no match in customers, and an inner join drops unmatched rows', 'pandas removed a duplicate'],
        1,
        'Always compare row counts before and after a join. A left join with indicator=True shows exactly which rows did not match.',
      ),
      notebook('Joins', [
        demo(3, 'Stage 3 — Inner, left, and the unmatched row', [
          'The same two tables joined two ways. The indicator column shows which order had no matching customer.',
        ], 'Predict each row count, then run. Then try how="outer": which extra row appears?', `${TABLES}
inner = pd.merge(orders, customers, on="customer_id", how="inner")
left = pd.merge(orders, customers, on="customer_id", how="left", indicator=True)
print(len(orders), len(inner), len(left))
print(left[left["_merge"] == "left_only"])`, { expectOutput: ['6 5 6', 'C09'] }),
      ]),
      prose(
        '**Cardinality: how many rows can match?** Each order belongs to one customer, and each customer appears once in `customers`: a **many-to-one** join. It cannot create rows. But if the lookup table accidentally contains a customer twice (say C03 with two regions after a data entry change), every C03 order matches *both* rows, and the join silently **multiplies** those orders. Totals computed afterwards are inflated.',
        '| lookup table | join type | row count after a left join from orders |\n|---|---|---|\n| each key once | many-to-one | = number of orders |\n| a key repeated | many-to-many | **more** than the number of orders |',
        'Two defences: check the lookup key is unique before joining, and pass `validate="many_to_one"` so pandas raises an error instead of multiplying rows.',
      ),
      notebook('Cardinality', [
        demo(4, 'Stage 4 — A repeated key multiplies rows', [
          'C03 now appears twice in the customer table. Its two orders each match twice, so 6 orders become 8 rows and the revenue total rises from 170 to 230.',
        ], 'Run and compare the counts and totals. Which rows were duplicated?', `${TABLES}
bad_customers = pd.concat([customers, pd.DataFrame({"customer_id": ["C03"], "region": ["South"]})])
joined = pd.merge(orders, bad_customers, on="customer_id", how="left")
print(len(orders), "->", len(joined))
print(orders["amount"].sum(), "->", joined["amount"].sum())`, { expectOutput: ['6 -> 8', '170 -> 230'] }),
        demo(5, 'Stage 5 — Let pandas check the cardinality', [
          '`validate="many_to_one"` checks that the right-hand key is unique before joining, and raises MergeError if it is not.',
        ], 'Run and read the error. Then fix bad_customers by removing the duplicate and run again.', `${TABLES}
bad_customers = pd.concat([customers, pd.DataFrame({"customer_id": ["C03"], "region": ["South"]})])
pd.merge(orders, bad_customers, on="customer_id", how="left", validate="many_to_one")`, { expectError: 'MergeError' }),
      ]),
      callout('procedure', 'Before and after every join', '1. Check the lookup key is unique: `lookup[key].duplicated().sum() == 0`.\n2. Note the row count of the table you are enriching.\n3. Join with `how="left"`, `validate="many_to_one"` and `indicator=True`.\n4. Confirm the row count did not change, and count the `left_only` rows.\n5. Investigate unmatched keys; do not just drop them.'),
      prose('**Practice.** Challenge 1 reads a file faithfully. Challenge 2 joins and reports unmatched rows. Challenge 3 is a fresh problem where a repeated key is hidden in the lookup table.'),
      notebook('Practice', [
        exercise(11, 1, 'Challenge 1 — Read it right', 'medium', {
          prompt: 'Read the product file into products so that sku keeps its leading zeros, "n/a" and "?" are treated as missing, and price is numeric. Store the number of missing prices in n_missing.',
          instructions: 'Use `dtype={"sku": str}` and `na_values=[...]` in `pd.read_csv(io.StringIO(text), ...)`.',
          code: 'import pandas as pd, io\ntext = """sku,name,price\n0012,pen,1.20\n0450,ink,n/a\n7001,pad,3.50\n0999,cup,?\n"""\nproducts = pd.read_csv(io.StringIO(text))\nn_missing = None',
          testCode: `import pandas as pd
assert products["sku"].tolist() == ["0012", "0450", "7001", "0999"], f"sku lost its leading zeros: {products['sku'].tolist()}. Read it with dtype={{'sku': str}}"
assert pd.api.types.is_numeric_dtype(products["price"]), "price is not numeric: '?' was read as text. Add it to na_values"
assert n_missing == 2, f"Two prices are missing ('n/a' and '?'); got {n_missing}"
"SUCCESS: labels kept as text, both missing codes recognised, prices numeric."`,
          hint: 'products = pd.read_csv(io.StringIO(text), dtype={"sku": str}, na_values=["n/a", "?"])\nn_missing = int(products["price"].isna().sum())',
          solution: 'import pandas as pd, io\ntext = """sku,name,price\n0012,pen,1.20\n0450,ink,n/a\n7001,pad,3.50\n0999,cup,?\n"""\nproducts = pd.read_csv(io.StringIO(text), dtype={"sku": str}, na_values=["n/a", "?"])\nn_missing = int(products["price"].isna().sum())',
          misconceptions: [{ code: 'import pandas as pd, io\ntext = """sku,name,price\n0012,pen,1.20\n0450,ink,n/a\n7001,pad,3.50\n0999,cup,?\n"""\nproducts = pd.read_csv(io.StringIO(text), na_values=["n/a", "?"])\nn_missing = 2', feedback: 'sku lost its leading zeros' }],
        }),
        exercise(12, 2, 'Challenge 2 — A join that loses nothing', 'medium', {
          prompt: 'Add each order\'s region with a join that keeps every order. Store the result in enriched and the number of orders with no matching customer in n_unmatched.',
          instructions: 'Use a left join with `indicator=True`, then count the "left_only" rows.',
          code: `${TABLES}
enriched = pd.merge(orders, customers, on="customer_id")
n_unmatched = 0`,
          testCode: `assert len(enriched) == 6, f"enriched has {len(enriched)} rows but there are 6 orders: the default inner join drops the order whose customer is unknown. Use how='left'"
assert n_unmatched == 1, f"One order (customer C09) has no match; got {n_unmatched}"
assert enriched["amount"].sum() == 170, "The revenue total must be unchanged by the join (170)"
"SUCCESS: all 6 orders kept, totals unchanged, and the one unmatched order counted for follow-up."`,
          hint: 'enriched = pd.merge(orders, customers, on="customer_id", how="left", indicator=True)\nn_unmatched = int((enriched["_merge"] == "left_only").sum())',
          solution: `${TABLES}
enriched = pd.merge(orders, customers, on="customer_id", how="left", indicator=True)
n_unmatched = int((enriched["_merge"] == "left_only").sum())`,
          misconceptions: [{ code: `${TABLES}
enriched = pd.merge(orders, customers, on="customer_id")
n_unmatched = 1`, feedback: 'the default inner join drops' }],
        }),
        exercise(13, 3, 'Challenge 3 — Revenue by region, without double counting', 'hard', {
          prompt: 'The region lookup was exported twice for one store. Find the repeated key(s) (store dup_keys as a sorted list), build a clean lookup with one row per store, then compute revenue_by_region as a dict of region → total sales. The grand total must equal the sales table\'s total.',
          prose: ['First join naively and compare the total with `sales["amount"].sum()`. Then find why it changed.'],
          instructions: 'Check `lookup["store"].duplicated(keep=False)`. The repeated rows here are identical, so keeping one is safe. Join with `validate="many_to_one"` so any remaining repeat raises an error.',
          code: 'import pandas as pd\nsales = pd.DataFrame({"store": ["S1", "S2", "S2", "S3", "S1", "S3"], "amount": [100, 60, 40, 80, 20, 30]})\nlookup = pd.DataFrame({"store": ["S1", "S2", "S3", "S2"], "region": ["North", "South", "North", "South"]})\njoined = pd.merge(sales, lookup, on="store", how="left")\nrevenue_by_region = joined.groupby("region")["amount"].sum().to_dict()\ndup_keys = None',
          testCode: `assert dup_keys == ["S2"], f"S2 appears twice in lookup; dup_keys should be ['S2'], got {dup_keys}"
assert sum(revenue_by_region.values()) == 330, f"The regional totals add up to {sum(revenue_by_region.values())}, but total sales are 330: the repeated S2 row doubled S2's sales. Deduplicate the lookup before joining"
assert revenue_by_region == {"North": 230, "South": 100}, f"Expected North 230 and South 100, got {revenue_by_region}"
"SUCCESS: the repeated lookup key was found and removed, so regional totals add up to the true total of 330."`,
          hint: 'dup_keys = sorted(lookup.loc[lookup["store"].duplicated(keep=False), "store"].unique())\nclean = lookup.drop_duplicates("store")\njoined = pd.merge(sales, clean, on="store", how="left", validate="many_to_one")',
          solution: 'import pandas as pd\nsales = pd.DataFrame({"store": ["S1", "S2", "S2", "S3", "S1", "S3"], "amount": [100, 60, 40, 80, 20, 30]})\nlookup = pd.DataFrame({"store": ["S1", "S2", "S3", "S2"], "region": ["North", "South", "North", "South"]})\ndup_keys = sorted(lookup.loc[lookup["store"].duplicated(keep=False), "store"].unique().tolist())\nclean = lookup.drop_duplicates("store")\njoined = pd.merge(sales, clean, on="store", how="left", validate="many_to_one")\nrevenue_by_region = {k: int(v) for k, v in joined.groupby("region")["amount"].sum().items()}',
          misconceptions: [{ code: 'import pandas as pd\nsales = pd.DataFrame({"store": ["S1", "S2", "S2", "S3", "S1", "S3"], "amount": [100, 60, 40, 80, 20, 30]})\nlookup = pd.DataFrame({"store": ["S1", "S2", "S3", "S2"], "region": ["North", "South", "North", "South"]})\njoined = pd.merge(sales, lookup, on="store", how="left")\nrevenue_by_region = joined.groupby("region")["amount"].sum().to_dict()\ndup_keys = ["S2"]', feedback: "doubled S2's sales" }],
        }),
      ]),
    ],
  },
  mentalModel: [
    'Tell read_csv what you know: dtype for labels, na_values for missing codes, parse_dates for dates.',
    'Check the loaded data against a data dictionary: meaning, unit, type and allowed values per column.',
    'Inner joins drop unmatched rows; left joins keep them as NaN — count them with indicator=True.',
    'A repeated key in a lookup table multiplies rows; check uniqueness and use validate="many_to_one".',
    'Compare row counts and totals before and after every join.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'Why read postcodes with dtype=str?',
      options: ['It is faster', 'They are labels; reading them as numbers drops leading zeros and invites meaningless arithmetic', 'pandas cannot read numbers'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'After a left join, the table has more rows than before. What is the most likely cause?',
      options: ['Unmatched keys', 'A key repeated in the right-hand table, so some rows matched more than once', 'The indicator column'],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'Which join keeps every order even when its customer is unknown?',
      options: ['inner', 'left, with orders as the left table', 'right, with orders as the left table'],
      correct: 1,
    },
  ],
}
