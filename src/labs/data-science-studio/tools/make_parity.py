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
import cleaning as c  # noqa: E402
import joins as j  # noqa: E402
import frames as f  # noqa: E402
import charts as ch  # noqa: E402

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
orders = d.make_orders()
truth_prices, truth_returns = {}, []
d.make_orders(truth=truth_prices)
catalogue = t.read_csv(d.to_csv(d.CATALOGUE_HEADER, d.make_catalogue()))
returns = t.read_csv(d.to_csv(d.RETURNS_HEADER, d.make_returns(orders, truth=truth_returns)))
list_prices = {r["item"]: t.to_pence(r["list_price"]) for r in catalogue}
clean = c.clean_orders(rows, list_prices)
clean_priced = [dict(r, price=r["price"] / 100) for r in clean if r["price"] is not None]
with_gaps = [dict(r, price=None if r["price"] is None else r["price"] / 100) for r in clean]
COMBINING_ACUTE, E_ACUTE, TAB = chr(0x301), chr(0xE9), chr(9)
texts = ["  leeds ", "York ", "harrogate", "WAKEFIELD", "Cafe" + COMBINING_ACUTE, "caf" + E_ACUTE, "new  york", "o'neil", "a" + TAB + "b", ""]
pairs = [["kitten", "sitting"], ["Helmit", "Helmet"], ["", "abc"], ["ab", "ba"], ["Lights, fron tand back", "Lights, front and back"], ["Cafe" + COMBINING_ACUTE, "caf" + E_ACUTE]]
items = [r["item"] for r in catalogue]
returned = [dict(r, order_id=c.normalise(r["order_id"]).upper()) for r in returns]
wide = [{"town": "Leeds", "web": 3, "shop": 5}, {"town": "York", "web": 1, "shop": None}]
part3 = {
    "catalogue_csv": d.to_csv(d.CATALOGUE_HEADER, d.make_catalogue()),
    "returns_csv": d.to_csv(d.RETURNS_HEADER, d.make_returns(orders)),
    "truth_prices": truth_prices, "truth_returns": truth_returns,
    "normalise": [c.normalise(x) for x in texts], "clean_town": [c.clean_town(x) for x in texts],
    "problems": c.check_rows(rows, c.RULES),
    "fix_pence": [c.fix_pence(x, 2500) for x in ["25.00", "2375", "", "24.5", "250.00", "251.00"]],
    "dedupe": [[r["order_id"] for r in c.dedupe(rows, "order_id")[0]], c.dedupe(rows, "order_id")[1]],
    "edit_distance": [c.edit_distance(a, b) for a, b in pairs],
    "closest": [c.closest(r["item"], items) for r in returns] + [c.closest(x, items) for x in ["Look", "Pmup", "", "bike"]],
    "fill_missing": c.fill_missing([1, None, 3], 2),
    "fill_by_group": [r["price"] for r in c.fill_by_group(with_gaps, "price", "item")],
    "clean": [[r["order_id"], r["town"], r["price"], r["quantity"]] for r in clean],
    "nested": [[r["order_id"], r["category"]] for r in j.nested_loop_join(clean_priced[:60], catalogue, "item")],
    "hash": [[r["order_id"], r["category"]] for r in j.hash_join(clean_priced, catalogue, "item")],
    "sort_merge": [[r["order_id"], r["category"]] for r in j.sort_merge_join(clean_priced, catalogue, "item")],
    "left": [[r["return_id"], r["order_id"], r.get("item"), r.get("date")] for r in j.left_join(returned, rows, "order_id")],
    "anti": [r["return_id"] for r in j.anti_join(returned, rows, "order_id")],
    "join_size": [j.join_size(returned, rows, "order_id"), j.join_size(rows, returned, "order_id"), j.join_size(clean_priced, catalogue, "item")],
    "to_long": j.to_long(wide, "town"),
    "town_counts": f.town_counts(rows),
    "filled_prices": f.filled_prices(with_gaps),
    "revenue": f.revenue_by_category(clean_priced, catalogue),
    "unmatched": f.unmatched(returned, rows, "order_id"),
    "melted": f.melted(wide, "town"),
}
pence = [r["price"] for r in clean if r["price"] is not None]
lights = [p / 100 for r, p in zip([r for r in clean if r["price"] is not None], pence) if r["item"] == "Lights, front and back"]
tick_cases = [[0, 114, 5], [0, 1, 10], [0.03, 0.97, 5], [6.37, 409.5, 8], [-3.2, 7.9, 6], [0, 0.002, 4], [1000, 98765, 7]]
part4 = {
    "scales": [ch.linear_scale(0, 120, 300, 20, 87), ch.invert(0, 120, 300, 20, 200), ch.log_scale(1, 1000, 0, 300, 45), ch.radius_for(87, 114, 40)],
    "ticks": [ch.nice_ticks(*c) for c in tick_cases],
    "steps": [list(ch.step_size(*c)) for c in tick_cases],
    "histogram": [ch.histogram(pence, 0, 2500, 20), ch.histogram([0, 5, 10], 0, 5, 2)],
    "widths": [ch.sturges(400), ch.sturges(1024), ch.scott_width(lights), ch.freedman_diaconis_width(lights)],
    "kde": [ch.kde(lights, 1.0, x) for x in [20, 22.5, 25, 27.5, 30]] + [ch.silverman(lights)],
    "mix": [ch.mix([255, 255, 255], [8, 48, 107], t) for t in [0, 0.25, 0.5, 1]],
    "lie": ch.lie_factor(87, 114, 7, 34),
}
path = os.path.join(HERE, "..", "engine", "parity.json")
with open(path, "w", encoding="utf-8", newline="\n") as handle:
    json.dump({"part1": part1, "part2": part2, "part3": part3, "part4": part4}, handle, ensure_ascii=False)
    handle.write("\n")
print(f"wrote {os.path.normpath(path)}")
