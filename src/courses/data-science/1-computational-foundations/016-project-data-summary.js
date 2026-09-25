// Track A — Chapter project
// A small data-summary program, in three versions: worked, scaffolded, independent.
import { prose, callout, check, notebook, demo, exercise } from '../lessonKit.js'

export default {
  id: 'a-16', slug: 'project-data-summary', track: 'A', order: 16,
  title: 'Project: A Data-Summary Program', subtitle: 'Worked, scaffolded, then on your own',
  tags: ['project', 'functions', 'dictionaries', 'loops', 'testing', 'reproducibility'],
  prereqs: ['a-15'], unlocks: ['b-01'],
  hook: {
    question: 'Can you turn a list of records into a trustworthy summary — and prove it works on data you have not seen?',
    realWorldContext: 'Summarising records — totals, counts, averages, the biggest category — is the first job in almost every data project. This project combines everything from Track A into one small program, built from tested functions rather than a pile of cells.',
  },
  intuition: {
    blocks: [
      prose(
        '**What you will build.** A program that takes a list of records and returns a summary dictionary. You will see it done once in full (worked), complete a similar one with the structure given (scaffolded), then write one from a specification alone (independent). The checker tests your independent version on data you have not seen, so it has to be general.',
        '**The data.** Each record is a dictionary, and the whole dataset is a list of them — the most common shape for small data in plain Python:',
        '```python\norders = [\n    {"item": "latte",  "qty": 2, "price": 3.50},\n    {"item": "tea",    "qty": 1, "price": 2.00},\n    {"item": "latte",  "qty": 1, "price": 3.50},\n    {"item": "muffin", "qty": 4, "price": 2.50},\n    {"item": "tea",    "qty": 2, "price": 2.00},\n]\n```',
        '**The plan.** Decompose the summary into small functions, each doing one thing (Lesson A.15), and test each on a tiny input before combining them:',
        '| Function | Returns | For the data above |\n|---|---|---|\n| `order_value(order)` | qty × price for one record | 7.0 for the first order |\n| `total_revenue(orders)` | sum of all order values | 26.5 |\n| `revenue_by_item(orders)` | dict of item → revenue | latte 10.5, tea 6.0, muffin 10.0 |\n| `units_by_item(orders)` | dict of item → quantity | latte 3, tea 3, muffin 4 |\n| `summarize(orders)` | one dict combining the above | see Part 1 |',
      ),
      check(
        'Which item is the "best seller"?',
        ['latte — it earned the most revenue', 'muffin — it sold the most units', 'It depends on whether "best" means revenue or units'],
        2,
        'Latte leads on revenue (10.5) but muffin leads on units (4). Before summarising, decide — and say — which measure you mean. The worked program reports both.',
      ),
      prose('**Part 1 — Worked version.** Read each function, predict its result for the data, then run. The last lines test the functions with asserts, including an empty list.'),
      notebook('Part 1 — Worked: café orders', [
        demo(1, 'The functions', [
          'Each function does one job. `summarize` only combines the others, so a wrong number can be traced to the one function that produced it. `max(d, key=d.get)` returns the key with the largest value.',
        ], 'Predict the printed summary before running. Then add an order of 5 teas at 2.00 and predict which item now leads on units.', 'def order_value(order):\n    return order["qty"] * order["price"]\n\ndef total_revenue(orders):\n    total = 0.0\n    for order in orders:\n        total += order_value(order)\n    return total\n\ndef revenue_by_item(orders):\n    result = {}\n    for order in orders:\n        result[order["item"]] = result.get(order["item"], 0.0) + order_value(order)\n    return result\n\ndef units_by_item(orders):\n    result = {}\n    for order in orders:\n        result[order["item"]] = result.get(order["item"], 0) + order["qty"]\n    return result\n\ndef summarize(orders):\n    if not orders:\n        return {"orders": 0, "revenue": 0.0, "top_by_revenue": None, "top_by_units": None}\n    by_revenue = revenue_by_item(orders)\n    by_units = units_by_item(orders)\n    return {\n        "orders": len(orders),\n        "revenue": total_revenue(orders),\n        "top_by_revenue": max(by_revenue, key=by_revenue.get),\n        "top_by_units": max(by_units, key=by_units.get),\n    }\n\norders = [\n    {"item": "latte",  "qty": 2, "price": 3.50},\n    {"item": "tea",    "qty": 1, "price": 2.00},\n    {"item": "latte",  "qty": 1, "price": 3.50},\n    {"item": "muffin", "qty": 4, "price": 2.50},\n    {"item": "tea",    "qty": 2, "price": 2.00},\n]\nprint(revenue_by_item(orders))\nprint(summarize(orders))', { expectOutput: ["{'latte': 10.5, 'tea': 6.0, 'muffin': 10.0}", "{'orders': 5, 'revenue': 26.5, 'top_by_revenue': 'latte', 'top_by_units': 'muffin'}"] }),
        demo(2, 'The tests', [
          'Small hand-checked inputs, plus the empty list — the edge case most likely to crash (`max` of an empty dict raises ValueError, which is why `summarize` checks for it first).',
        ], 'Run: silence then the message means every test passed. Then delete the empty-list check in summarize, re-run both cells, and read which test fails.', 'one = [{"item": "tea", "qty": 3, "price": 2.0}]\nassert order_value(one[0]) == 6.0\nassert total_revenue(one) == 6.0\nassert revenue_by_item(one) == {"tea": 6.0}\nassert summarize(one)["top_by_units"] == "tea"\nassert summarize([]) == {"orders": 0, "revenue": 0.0, "top_by_revenue": None, "top_by_units": None}\nprint("all worked-example tests passed")', { expectOutput: ['all worked-example tests passed'] }),
      ]),
      callout('procedure', 'A reproducible program, not a pile of cells', '- Put the logic in functions that take the data as an argument; do not rely on names left over from other cells.\n- Keep the test data small enough to check by hand.\n- Test edge cases: an empty list, a single record, ties.\n- Before you call it done: **↺ Reset variables**, then run the cells top to bottom. If it only worked because of leftover state, this is where you find out.'),
      prose('**Part 2 — Scaffolded version.** Library loan records, with the same structure. The function names, arguments and return values are given; fill in the bodies. The checker tests each function separately, so its feedback tells you which one is wrong.'),
      notebook('Part 2 — Scaffolded: library loans', [
        exercise(11, 1, 'Library loans summary', 'medium', {
          prompt: 'Complete loans_by_genre, mean_days and late_share. Each loan has a genre, the number of days it was out, and whether it was returned late.',
          instructions: '1. loans_by_genre(loans): dict of genre to number of loans.\n2. mean_days(loans): mean of the days values, or 0.0 for an empty list.\n3. late_share(loans): fraction of loans that were late (between 0 and 1), or 0.0 for an empty list.',
          code: 'loans = [\n    {"genre": "fiction", "days": 14, "late": False},\n    {"genre": "science", "days": 21, "late": True},\n    {"genre": "fiction", "days": 7,  "late": False},\n    {"genre": "history", "days": 28, "late": True},\n    {"genre": "fiction", "days": 10, "late": False},\n]\n\ndef loans_by_genre(loans):\n    counts = {}\n    # TODO: count loans per genre\n    return counts\n\ndef mean_days(loans):\n    # TODO: return the mean of the "days" values (0.0 if there are no loans)\n    return None\n\ndef late_share(loans):\n    # TODO: return the fraction of loans with late == True (0.0 if there are no loans)\n    return None\n\nprint(loans_by_genre(loans), mean_days(loans), late_share(loans))',
          testCode: `assert loans_by_genre(loans) == {"fiction": 3, "science": 1, "history": 1}, f"loans_by_genre should count loans per genre, got {loans_by_genre(loans)}"
assert mean_days(loans) is not None, "mean_days returns None: compute and return the mean"
assert abs(mean_days(loans) - 16.0) < 1e-9, f"mean_days should be 80 / 5 = 16.0, got {mean_days(loans)}"
assert mean_days([]) == 0.0, "mean_days([]) should return 0.0 instead of dividing by zero"
assert late_share(loans) is not None and abs(late_share(loans) - 0.4) < 1e-9, "late_share should be 2 late loans / 5 loans = 0.4 (a fraction, not a percentage or a count)"
assert late_share([]) == 0.0, "late_share([]) should return 0.0"
new = [{"genre": "art", "days": 3, "late": True}]
assert loans_by_genre(new) == {"art": 1} and mean_days(new) == 3.0 and late_share(new) == 1.0, "Your functions must work on other data too, not just this list"
"SUCCESS: all three functions are correct, including empty input and new data."`,
          hint: 'loans_by_genre: counts[g] = counts.get(g, 0) + 1. mean_days: sum of days / len(loans). late_share: count the late ones, then divide by len(loans).',
          solution: 'loans = []\n\ndef loans_by_genre(loans):\n    counts = {}\n    for loan in loans:\n        counts[loan["genre"]] = counts.get(loan["genre"], 0) + 1\n    return counts\n\ndef mean_days(loans):\n    if not loans:\n        return 0.0\n    return sum(loan["days"] for loan in loans) / len(loans)\n\ndef late_share(loans):\n    if not loans:\n        return 0.0\n    late = 0\n    for loan in loans:\n        if loan["late"]:\n            late += 1\n    return late / len(loans)\n\nloans = [\n    {"genre": "fiction", "days": 14, "late": False},\n    {"genre": "science", "days": 21, "late": True},\n    {"genre": "fiction", "days": 7,  "late": False},\n    {"genre": "history", "days": 28, "late": True},\n    {"genre": "fiction", "days": 10, "late": False},\n]',
          misconceptions: [
            { code: 'loans = [{"genre": "fiction", "days": 14, "late": False}, {"genre": "science", "days": 21, "late": True}, {"genre": "fiction", "days": 7, "late": False}, {"genre": "history", "days": 28, "late": True}, {"genre": "fiction", "days": 10, "late": False}]\ndef loans_by_genre(loans):\n    return {"fiction": 3, "science": 1, "history": 1}\ndef mean_days(loans):\n    return sum(l["days"] for l in loans) / len(loans) if loans else 0.0\ndef late_share(loans):\n    return sum(1 for l in loans if l["late"]) / len(loans) if loans else 0.0', feedback: 'must work on other data too' },
            { code: 'loans = [{"genre": "fiction", "days": 14, "late": False}, {"genre": "science", "days": 21, "late": True}, {"genre": "fiction", "days": 7, "late": False}, {"genre": "history", "days": 28, "late": True}, {"genre": "fiction", "days": 10, "late": False}]\ndef loans_by_genre(loans):\n    c = {}\n    for l in loans:\n        c[l["genre"]] = c.get(l["genre"], 0) + 1\n    return c\ndef mean_days(loans):\n    return sum(l["days"] for l in loans) / len(loans) if loans else 0.0\ndef late_share(loans):\n    return sum(1 for l in loans if l["late"])', feedback: 'a fraction, not a percentage or a count' },
          ],
        }),
      ]),
      prose(
        '**Part 3 — Independent version.** Only the specification is given. Plan the functions first (a table like the one in the plan above is enough), write small tests of your own, then run the checker. It uses a second dataset you have not seen.',
        '**Specification.** `summarize_temps(readings)` takes a list of records like `{"city": "Oslo", "temp_c": 4.5}` and returns a dict with exactly these keys:',
        '| Key | Value |\n|---|---|\n| `"count"` | number of readings |\n| `"mean"` | mean temperature over all readings, rounded to 1 decimal place |\n| `"warmest_city"` | the city of the single highest reading |\n| `"mean_by_city"` | dict of city → that city\'s mean temperature, rounded to 1 decimal place |',
        'For an empty list, return `{"count": 0, "mean": None, "warmest_city": None, "mean_by_city": {}}`.',
      ),
      notebook('Part 3 — Independent: temperature readings', [
        exercise(12, 2, 'Temperature summary', 'hard', {
          prompt: 'Write summarize_temps(readings) to the specification above. Include at least one assert of your own under it.',
          instructions: 'Suggested functions: mean of a list of numbers; readings grouped by city; then summarize_temps combining them. Remember that a per-city mean needs both a total and a count for each city.',
          code: 'readings = [\n    {"city": "Oslo", "temp_c": 4.5},\n    {"city": "Lisbon", "temp_c": 18.0},\n    {"city": "Oslo", "temp_c": 6.5},\n    {"city": "Cairo", "temp_c": 25.5},\n    {"city": "Lisbon", "temp_c": 16.0},\n]\n\ndef summarize_temps(readings):\n    pass  # your program here\n\nprint(summarize_temps(readings))',
          testCode: `got = summarize_temps(readings)
assert isinstance(got, dict), "summarize_temps should return a dict"
assert set(got) == {"count", "mean", "warmest_city", "mean_by_city"}, f"Use exactly the four keys in the specification; got {sorted(got)}"
assert got["count"] == 5, f"count should be 5, got {got['count']}"
assert got["mean"] == 14.1, f"mean should be 70.5 / 5 = 14.1, got {got['mean']}"
assert got["warmest_city"] == "Cairo", f"warmest_city should be Cairo, got {got['warmest_city']}"
assert got["mean_by_city"].get("Oslo") != 11.0, "Oslo shows its TOTAL (11.0). A per-city mean divides each city's total by that city's count"
assert got["mean_by_city"] == {"Oslo": 5.5, "Lisbon": 17.0, "Cairo": 25.5}, f"mean_by_city is wrong: {got['mean_by_city']}"
unseen = [{"city": "Lima", "temp_c": 19.25}, {"city": "Quito", "temp_c": 14.0}, {"city": "Lima", "temp_c": 21.0}]
got2 = summarize_temps(unseen)
assert got2 == {"count": 3, "mean": 18.1, "warmest_city": "Lima", "mean_by_city": {"Lima": 20.1, "Quito": 14.0}}, f"On unseen data expected count 3, mean 18.1, Lima, Lima 20.1 / Quito 14.0; got {got2}"
assert summarize_temps([]) == {"count": 0, "mean": None, "warmest_city": None, "mean_by_city": {}}, "Handle the empty list as the specification says"
"SUCCESS: your program meets the specification on the given data, unseen data and empty input."`,
          hint: 'Group first: totals[city] += temp and counts[city] += 1 in one loop. Then mean_by_city = {c: round(totals[c] / counts[c], 1) for c in totals}. warmest: max(readings, key=lambda r: r["temp_c"])["city"].',
          solution: 'def mean(values):\n    return sum(values) / len(values)\n\ndef temps_by_city(readings):\n    groups = {}\n    for r in readings:\n        groups.setdefault(r["city"], []).append(r["temp_c"])\n    return groups\n\ndef summarize_temps(readings):\n    if not readings:\n        return {"count": 0, "mean": None, "warmest_city": None, "mean_by_city": {}}\n    warmest = readings[0]\n    for r in readings:\n        if r["temp_c"] > warmest["temp_c"]:\n            warmest = r\n    groups = temps_by_city(readings)\n    return {\n        "count": len(readings),\n        "mean": round(mean([r["temp_c"] for r in readings]), 1),\n        "warmest_city": warmest["city"],\n        "mean_by_city": {city: round(mean(ts), 1) for city, ts in groups.items()},\n    }\n\nassert summarize_temps([{"city": "A", "temp_c": 2.0}])["mean"] == 2.0\nreadings = [\n    {"city": "Oslo", "temp_c": 4.5},\n    {"city": "Lisbon", "temp_c": 18.0},\n    {"city": "Oslo", "temp_c": 6.5},\n    {"city": "Cairo", "temp_c": 25.5},\n    {"city": "Lisbon", "temp_c": 16.0},\n]',
          misconceptions: [
            { code: 'readings = [{"city": "Oslo", "temp_c": 4.5}, {"city": "Lisbon", "temp_c": 18.0}, {"city": "Oslo", "temp_c": 6.5}, {"city": "Cairo", "temp_c": 25.5}, {"city": "Lisbon", "temp_c": 16.0}]\ndef summarize_temps(readings):\n    if not readings:\n        return {"count": 0, "mean": None, "warmest_city": None, "mean_by_city": {}}\n    totals = {}\n    for r in readings:\n        totals[r["city"]] = totals.get(r["city"], 0) + r["temp_c"]\n    return {"count": len(readings), "mean": round(sum(r["temp_c"] for r in readings) / len(readings), 1), "warmest_city": max(readings, key=lambda r: r["temp_c"])["city"], "mean_by_city": totals}', feedback: "divides each city's total by that city's count" },
          ],
        }),
      ]),
      prose(
        '**Reflect.** Before moving on, check your program against the reproducibility callout: reset, run top to bottom, and confirm your own asserts pass. Then write one sentence each on: which edge case you nearly missed, and which function you would test first if the summary looked wrong.',
      ),
    ],
  },
  mentalModel: [
    'Decompose a summary into small functions; combine them in one summarize function.',
    'Say which measure "best" or "top" means — the answer can change with the measure.',
    'Test each function on tiny hand-checked data, plus empty input and ties.',
    'A program is general only if it works on data it has not seen.',
    'Done means: Reset variables, run top to bottom, all asserts pass.',
  ],
  quiz: [
    {
      id: 'q1', type: 'choice',
      text: 'Why split the summary into several small functions?',
      options: [
        'Python requires it',
        'Each function can be tested on its own, so a wrong result can be traced to the one function that produced it',
        'It makes the program run faster',
      ],
      correct: 1,
    },
    {
      id: 'q2', type: 'choice',
      text: 'Your summary works in your notebook but fails after Reset variables and running top to bottom. What does that suggest?',
      options: [
        'The notebook is broken',
        'The program depended on leftover state, such as a name defined in a cell you later changed or deleted',
        'Reset variables deletes functions permanently',
      ],
      correct: 1,
    },
    {
      id: 'q3', type: 'choice',
      text: 'To compute a mean per city, what do you need for each city?',
      options: ['Only the total', 'The total and the count of readings', 'Only the largest reading'],
      correct: 1,
    },
  ],
}
