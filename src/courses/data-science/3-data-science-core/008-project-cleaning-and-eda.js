// Track C — Chapter project
// Documented cleaning, a join and an EDA report, in three versions.
import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

const RENTALS = `import pandas as pd
rentals = pd.DataFrame({
    "date":    ["05-01", "05-01", "05-02", "05-02", "05-03", "05-03", "05-03", "05-04", "05-04", "05-04"],
    "station": ["S1", "S2", "S1", "S2", "S1", "S2", "S2", "S1", "S2", "S3"],
    "rides":   [120, 80, 130, -5, 125, 90, 90, 140, 85, 60],
})
stations = pd.DataFrame({"station": ["S1", "S2"], "district": ["Centre", "Harbour"]})`

export default {
  id: 'c-08', slug: 'project-cleaning-and-eda', track: 'C', order: 8,
  title: 'Project: A Documented Cleaning and EDA', subtitle: 'From raw tables to a reproducible report',
  tags: ['project', 'cleaning', 'join', 'groupby', 'eda', 'reproducibility'],
  prereqs: ['c-03', 'c-05', 'c-06', 'c-07'], unlocks: ['d-01'],
  hook: {
    question: 'Which district\'s bike stations are busiest — and can someone else reproduce exactly how you got the answer?',
    realWorldContext: 'A data analysis is only as trustworthy as its least-documented step. This project runs the whole Track C workflow — contract, cleaning log, safe join, grouped summary, report — as functions that can be rerun from raw data by anyone.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will produce.** A small pipeline — `clean`, `join`, `summarise` — and a report that states the question, the checks and exclusions, the finding and its limits. You will see it done once (worked), complete a similar one with the structure given (scaffolded), and write one from a specification checked on unseen data (independent).',
        '**Reproducibility, concretely.** Someone else must get the same answer from the same raw data. That means: the raw data are never edited by hand; every step is a function that takes data in and returns data out; exclusions are counted, not silent; and the whole notebook passes **↺ Reset variables** followed by running every cell in order. If your analysis used random numbers, you would also fix a seed; if it used a library feature that changed between versions, you would record the version.',
        '**The worked question.** *On days a station is recorded, which district averages more rides per station-day?* Contract: one row per (date, station); rides is a whole number ≥ 0; every station must appear in the stations table.',
      ),
      check(
        'A colleague reran your notebook top to bottom after Reset variables and got a different answer. What is the most likely cause?',
        ['Python is unreliable', 'Your result depended on state not created by the cells in order — an edited or deleted cell, or cells run out of order', 'The data changed by itself'],
        1,
        'Reset and run top to bottom before reporting: it is the only way to know the notebook, not your session history, produced the result.',
      ),
      notebook('Part 1 — Worked: bike rentals', [
        demo(1, '1 · Clean, with a log', [
          'Each rule removes rows and records how many. Nothing is changed in `rentals` itself.',
        ], 'Run and read the log. Which rule removed which row?', `${RENTALS}
def clean(rentals):
    log = {}
    out = rentals.drop_duplicates(["date", "station"])
    log["duplicate (date, station)"] = len(rentals) - len(out)
    before = len(out)
    out = out[out["rides"] >= 0]
    log["negative rides"] = before - len(out)
    return out, log

cleaned, log = clean(rentals)
print(log, len(rentals), "->", len(cleaned))`, { expectOutput: ["{'duplicate (date, station)': 1, 'negative rides': 1} 10 -> 8"] }),
        demo(2, '2 · Join safely, count what does not match', [
          'A left join with validate and indicator keeps every rental and reveals station S3, which is missing from the lookup table.',
        ], 'Run. How many rentals have no district? Should they count towards any district?', `${RENTALS}
cleaned = rentals.drop_duplicates(["date", "station"])
cleaned = cleaned[cleaned["rides"] >= 0]

def join(cleaned, stations):
    j = pd.merge(cleaned, stations, on="station", how="left", validate="many_to_one", indicator=True)
    unmatched = int((j["_merge"] == "left_only").sum())
    return j[j["_merge"] == "both"].drop(columns="_merge"), unmatched

joined, unmatched = join(cleaned, stations)
print(len(cleaned), "->", len(joined), "matched; unmatched:", unmatched)`, { expectOutput: ['8 -> 7 matched; unmatched: 1'] }),
        demo(3, '3 · Summarise and answer', [
          'The average rides per station-day for each district, with the number of station-days behind each average.',
        ], 'Run. Why is it important to show n next to each mean?', `${RENTALS}
cleaned = rentals.drop_duplicates(["date", "station"])
cleaned = cleaned[cleaned["rides"] >= 0]
joined = pd.merge(cleaned, stations, on="station", how="inner", validate="many_to_one")

def summarise(joined):
    return joined.groupby("district")["rides"].agg(n="size", mean="mean").round(2)

print(summarise(joined))`, { expectOutput: ['Centre    4  128.75', 'Harbour   3   85.00'] }),
      ]),
      callout('example', 'Worked report', '**Question:** which district averages more rides per station-day?\n\n**Checks and exclusions:** 10 raw rows. Removed 1 duplicate (05-03, S2) and 1 negative count (−5, a sensor error). 1 rental from station S3 has no district in the lookup table and is excluded from district averages; the station list needs updating.\n\n**Finding:** Centre averages 128.75 rides per station-day (4 station-days); Harbour 85.0 (3 station-days).\n\n**Limits:** four days in May, one station per district; averages over 3–4 values; the missing Harbour reading for 05-02 may bias Harbour\'s mean if that day was unusual.\n\n**Reproducibility:** raw tables untouched; clean → join → summarise are functions; notebook reruns identically after Reset variables.'),
      prose('**Part 2 — Scaffolded.** Café orders and a menu table. The three functions are named and described; complete their bodies. The checker tests each one separately, then the whole pipeline on a second dataset.'),
      notebook('Part 2 — Scaffolded: café orders', [
        exercise(11, 1, 'Café pipeline', 'medium', {
          prompt: 'Complete clean_orders (drop repeated order_id, then rows with qty < 1; return the cleaned table and a log dict), add_category (left join to the menu on item with validate="many_to_one"; return the joined table and the number of unmatched rows), and category_revenue (dict of category → total qty × price over matched rows).',
          instructions: 'Log keys: "duplicate_order" and "bad_qty". Keep rows whose item is missing from the menu out of category_revenue, but count them in add_category.',
          code: 'import pandas as pd\norders = pd.DataFrame({\n    "order_id": [1, 2, 2, 3, 4, 5, 6],\n    "item":     ["latte", "tea", "tea", "cake", "latte", "soup", "tea"],\n    "qty":      [2, 1, 1, 0, 1, 2, 3],\n    "price":    [3.5, 2.0, 2.0, 4.0, 3.5, 5.0, 2.0],\n})\nmenu = pd.DataFrame({"item": ["latte", "tea", "cake"], "category": ["drink", "drink", "food"]})\n\ndef clean_orders(orders):\n    log = {}\n    # TODO\n    return orders, log\n\ndef add_category(cleaned, menu):\n    # TODO\n    return cleaned, 0\n\ndef category_revenue(joined):\n    # TODO\n    return {}',
          testCode: `import pandas as pd
c, log = clean_orders(orders)
assert log == {"duplicate_order": 1, "bad_qty": 1}, f"The log should record 1 repeated order_id and 1 row with qty < 1; got {log}"
assert c["order_id"].tolist() == [1, 2, 4, 5, 6], f"Cleaned orders should be [1, 2, 4, 5, 6]; got {c['order_id'].tolist()}"
j, unmatched = add_category(c, menu)
assert unmatched == 1, f"soup is not on the menu: exactly 1 unmatched order; got {unmatched}"
rev = category_revenue(j)
assert rev == {"drink": 18.5}, f"drink revenue = 2*3.5 + 1*2.0 + 1*3.5 + 3*2.0 = 18.5, and no food rows remain after cleaning; got {rev}"
o2 = pd.DataFrame({"order_id": [9, 9, 10], "item": ["cake", "cake", "latte"], "qty": [2, 2, 1], "price": [4.0, 4.0, 3.5]})
c2, _ = clean_orders(o2)
j2, u2 = add_category(c2, menu)
assert category_revenue(j2) == {"food": 8.0, "drink": 3.5} and u2 == 0, "The pipeline must also work on new data"
"SUCCESS: clean, join and summarise work as reusable steps with an honest log."`,
          hint: 'clean: out = orders.drop_duplicates("order_id"); log["duplicate_order"] = len(orders) - len(out); then filter qty >= 1. join: merge(..., how="left", validate="many_to_one", indicator=True). revenue: (qty * price) grouped by category.',
          solution: 'import pandas as pd\norders = pd.DataFrame({"order_id": [1, 2, 2, 3, 4, 5, 6], "item": ["latte", "tea", "tea", "cake", "latte", "soup", "tea"], "qty": [2, 1, 1, 0, 1, 2, 3], "price": [3.5, 2.0, 2.0, 4.0, 3.5, 5.0, 2.0]})\nmenu = pd.DataFrame({"item": ["latte", "tea", "cake"], "category": ["drink", "drink", "food"]})\n\ndef clean_orders(orders):\n    log = {}\n    out = orders.drop_duplicates("order_id")\n    log["duplicate_order"] = len(orders) - len(out)\n    before = len(out)\n    out = out[out["qty"] >= 1]\n    log["bad_qty"] = before - len(out)\n    return out, log\n\ndef add_category(cleaned, menu):\n    j = pd.merge(cleaned, menu, on="item", how="left", validate="many_to_one", indicator=True)\n    return j, int((j["_merge"] == "left_only").sum())\n\ndef category_revenue(joined):\n    m = joined[joined["_merge"] == "both"]\n    return {k: float(v) for k, v in (m["qty"] * m["price"]).groupby(m["category"]).sum().items()}',
          misconceptions: [{ code: 'import pandas as pd\norders = pd.DataFrame({"order_id": [1, 2, 2, 3, 4, 5, 6], "item": ["latte", "tea", "tea", "cake", "latte", "soup", "tea"], "qty": [2, 1, 1, 0, 1, 2, 3], "price": [3.5, 2.0, 2.0, 4.0, 3.5, 5.0, 2.0]})\nmenu = pd.DataFrame({"item": ["latte", "tea", "cake"], "category": ["drink", "drink", "food"]})\ndef clean_orders(orders):\n    out = orders[orders["qty"] >= 1].drop_duplicates()\n    return out, {"duplicate_order": 1, "bad_qty": 1}\ndef add_category(c, menu):\n    return pd.merge(c, menu, on="item"), 1\ndef category_revenue(j):\n    return {"drink": 18.5}', feedback: 'must also work on new data' }],
        }),
      ]),
      prose(
        '**Part 3 — Independent.** Write `investigate(visits, clinics)` that returns a report dict. Plan the steps first; use the worked example as a model, not a template to copy.',
        '**Specification.** `visits` has columns visit_id, clinic_id, wait_min. `clinics` has clinic_id, town. Contract: visit_id unique; wait_min between 0 and 480; clinic_id must exist in `clinics`. The report dict has exactly these keys:',
        '| key | value |\n|---|---|\n| `"n_raw"` | rows in visits |\n| `"excluded"` | {"duplicate": n, "bad_wait": n} |\n| `"unmatched"` | cleaned visits whose clinic_id is not in clinics |\n| `"mean_wait_by_town"` | dict town → mean wait over matched, cleaned visits, rounded to 1 |\n| `"longest_town"` | the town with the highest mean wait |',
        'Your function must not modify its inputs. The checker runs it on unseen data.',
      ),
      notebook('Part 3 — Independent: clinic waiting times', [
        exercise(12, 2, 'investigate(visits, clinics)', 'hard', {
          prompt: 'Write investigate(visits, clinics) to the specification above.',
          instructions: 'Deduplicate by visit_id first, then apply the wait rule, then join with validate="many_to_one" and indicator=True. Test it on the example data before running the checker.',
          code: 'import pandas as pd\nvisits = pd.DataFrame({\n    "visit_id":  [1, 2, 3, 3, 4, 5, 6, 7],\n    "clinic_id": ["A", "A", "B", "B", "B", "C", "A", "Z"],\n    "wait_min":  [30, 45, 20, 20, 999, 60, 15, 25],\n})\nclinics = pd.DataFrame({"clinic_id": ["A", "B", "C"], "town": ["Ashby", "Burton", "Ashby"]})\n\ndef investigate(visits, clinics):\n    pass  # your pipeline here\n\nprint(investigate(visits, clinics))',
          testCode: `import pandas as pd
v0, c0 = visits.copy(), clinics.copy()
r = investigate(visits, clinics)
assert visits.equals(v0) and clinics.equals(c0), "investigate must not modify its inputs"
assert set(r) == {"n_raw", "excluded", "unmatched", "mean_wait_by_town", "longest_town"}, f"Use exactly the specified keys; got {sorted(r)}"
assert r["n_raw"] == 8 and r["excluded"] == {"duplicate": 1, "bad_wait": 1}, f"Expected 8 raw rows, 1 duplicate and 1 bad wait (999); got {r['n_raw']}, {r['excluded']}"
assert r["unmatched"] == 1, "Clinic Z is not in the clinics table: 1 unmatched visit"
assert r["mean_wait_by_town"] == {"Ashby": 37.5, "Burton": 20.0}, f"Ashby = (30 + 45 + 60 + 15) / 4 = 37.5, Burton = 20.0; got {r['mean_wait_by_town']}"
assert r["longest_town"] == "Ashby"
v2 = pd.DataFrame({"visit_id": [10, 11, 12], "clinic_id": ["X", "Y", "Y"], "wait_min": [50, 10, -3]})
c2 = pd.DataFrame({"clinic_id": ["X", "Y"], "town": ["Exton", "Yarm"]})
r2 = investigate(v2, c2)
assert r2["excluded"] == {"duplicate": 0, "bad_wait": 1} and r2["mean_wait_by_town"] == {"Exton": 50.0, "Yarm": 10.0} and r2["longest_town"] == "Exton", f"Unseen data gave {r2}"
"SUCCESS: a reproducible pipeline whose report says what was excluded, what did not match, and what was found."`,
          hint: 'd = visits.drop_duplicates("visit_id"); ok = d[d["wait_min"].between(0, 480)]; j = pd.merge(ok, clinics, on="clinic_id", how="left", validate="many_to_one", indicator=True); m = j[j["_merge"] == "both"]; means = m.groupby("town")["wait_min"].mean().round(1)',
          solution: 'import pandas as pd\nvisits = pd.DataFrame({"visit_id": [1, 2, 3, 3, 4, 5, 6, 7], "clinic_id": ["A", "A", "B", "B", "B", "C", "A", "Z"], "wait_min": [30, 45, 20, 20, 999, 60, 15, 25]})\nclinics = pd.DataFrame({"clinic_id": ["A", "B", "C"], "town": ["Ashby", "Burton", "Ashby"]})\n\ndef investigate(visits, clinics):\n    d = visits.drop_duplicates("visit_id")\n    ok = d[d["wait_min"].between(0, 480)]\n    j = pd.merge(ok, clinics, on="clinic_id", how="left", validate="many_to_one", indicator=True)\n    m = j[j["_merge"] == "both"]\n    means = {t: round(float(w), 1) for t, w in m.groupby("town")["wait_min"].mean().items()}\n    return {\n        "n_raw": len(visits),\n        "excluded": {"duplicate": len(visits) - len(d), "bad_wait": len(d) - len(ok)},\n        "unmatched": int((j["_merge"] == "left_only").sum()),\n        "mean_wait_by_town": means,\n        "longest_town": max(means, key=means.get),\n    }',
          misconceptions: [{ code: 'import pandas as pd\nvisits = pd.DataFrame({"visit_id": [1, 2, 3, 3, 4, 5, 6, 7], "clinic_id": ["A", "A", "B", "B", "B", "C", "A", "Z"], "wait_min": [30, 45, 20, 20, 999, 60, 15, 25]})\nclinics = pd.DataFrame({"clinic_id": ["A", "B", "C"], "town": ["Ashby", "Burton", "Ashby"]})\ndef investigate(visits, clinics):\n    j = pd.merge(visits, clinics, on="clinic_id")\n    means = {t: round(float(w), 1) for t, w in j.groupby("town")["wait_min"].mean().items()}\n    return {"n_raw": len(visits), "excluded": {"duplicate": 1, "bad_wait": 1}, "unmatched": 1, "mean_wait_by_town": means, "longest_town": max(means, key=means.get)}', feedback: 'Ashby = (30 + 45 + 60 + 15) / 4 = 37.5' }],
        }),
      ]),
      prose('**Write it up.** Using your `investigate` output for the example data, write a report in the worked format: question, checks and exclusions, finding (with the numbers and counts behind them), limits, and a one-line reproducibility statement.'),
    ],
  },
  mentalModel: [
    'Reproducible means: raw data untouched, every step a function, exclusions counted, reruns identically after a reset.',
    'Clean against a written contract and log each rule\'s effect.',
    'Join with how="left", validate and indicator; report unmatched rows instead of losing them.',
    'Show the count behind every mean.',
    'A report states question, checks, finding and limits — in that order.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'Why write clean, join and summarise as functions rather than a sequence of edits in cells?',
      options: ['Functions run faster', 'They can be rerun on the raw data — or on new data — and give the same result, so others can reproduce and check the analysis', 'pandas requires it'],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'Your summary shows district A mean 128 and district B mean 85. What else should the table show?',
      options: ['Nothing', 'How many values each mean is based on', 'The median only'],
      correct: 1,
    },
  ],
}
