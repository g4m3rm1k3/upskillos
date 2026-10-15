"""Write engine/parity.json: what the Python answers, for engine/parity.test.js to check the
JavaScript against. Run from the repository root:
    python src/labs/data-science-studio/tools/make_parity.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "python"))
import data as d  # noqa: E402
import tables as t  # noqa: E402
import summary as s  # noqa: E402

csv_text = d.to_csv(d.HEADER, d.make_orders())
rows = t.read_csv(csv_text)
numbered = t.with_numbers(rows, ["price", "quantity"])
priced = [r for r in numbered if r["price"] is not None]
prices = [r["price"] for r in priced]
lines = ['a,b,c', '"Lights, front and back",25.00', 'say ""hi""', '"say ""hi""",x', ',,', '', '"a,b', 'x,"y"z']
small = [{"k": v, "n": i} for i, v in enumerate([3, 1, 2, 1, 3, 2, 1])]
big = [1e9 + x for x in [4, 7, 13, 16]]

part1 = {
    "csv": csv_text,
    "rows_head": rows[:5],
    "count_items": t.count_values(t.column(rows, "item")),
    "count_towns": t.count_values(t.column(rows, "town")),
    "split": {line: t.split_csv_line(line) for line in lines},
    "to_pence": {x: t.to_pence(x) for x in ["45.99", "45", "45.5", "0.07", " 12.30 ", "", "2375"]},
    "to_number": {x: t.to_number(x) for x in ["45.99", " 7 ", "", "-3.5", "1e3"]},
    "mean_price": list(t.mean_of(t.column(numbered, "price"))),
    "leeds_web": [r["order_id"] for r in t.where_all(rows, {"town": "Leeds", "channel": "web"})],
    "bikes": [r["order_id"] for r in t.rows_where(rows, "item", "Bike")],
    "sort_small": t.sort_by(small, "k"),
    "merge_small": t.merge_sort(small, "k"),
    "sort_prices_text": [r["price"] for r in t.sort_by(rows[:12], "price")],
    "sort_prices": [r["order_id"] for r in t.merge_sort(priced[:40], "price")],
}
groups = s.group_by(priced, "item")
part2 = {
    "prices": prices,
    "total": s.total(prices), "mean": s.mean(prices), "running_mean": s.running_mean(prices[:10]),
    "median": s.median(prices), "median_even": s.median([4, 1, 3, 2]),
    "quantiles": [s.quantile(prices, q) for q in [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]],
    "quickselect": [s.quickselect(prices, k) for k in [0, 1, 100, 191, 383]],
    "variance": [s.variance(prices), s.variance(prices, False), s.std(prices)],
    "shortcut": [s.shortcut_variance(prices), s.shortcut_variance(big)],
    "welford": [list(s.welford(prices)), list(s.welford(big))],
    "errors": [s.squared_error(prices[:20], 30), s.absolute_error(prices[:20], 30)],
    "iqr_all": s.iqr_outliers(prices),
    "iqr_by_item": {k: s.iqr_outliers([r["price"] for r in v]) for k, v in groups.items()},
    "mad": s.mad(prices), "z_first": s.z_scores(prices)[:5],
    "group_sizes": {k: len(v) for k, v in groups.items()},
    "aggregate": {how: s.aggregate(groups, "price", how) for how in s.SUMMARIES},
    "pivot": s.pivot(priced, "town", "channel", "quantity"),
}
path = os.path.join(HERE, "..", "engine", "parity.json")
with open(path, "w", encoding="utf-8", newline="\n") as handle:
    json.dump({"part1": part1, "part2": part2}, handle, ensure_ascii=False)
    handle.write("\n")
print(f"wrote {os.path.normpath(path)}")
