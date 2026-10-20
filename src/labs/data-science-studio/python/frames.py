"""The pandas lenses of Data Science Studio. Lesson 1.7: the same table in pandas, stored as
columns. A DataFrame keeps each column as one array of a single type, so a whole column is added,
compared or summed in one operation instead of one row at a time. Part 3: the same cleaning and
joins as the hand-written functions, one or two lines each.
"""
import pandas as pd


def big_orders(rows, threshold):
    """The order ids of the orders whose total (price times quantity) is at least threshold,
    in their original order: a boolean mask instead of a loop."""
    frame = pd.DataFrame(rows)
    total = frame["price"] * frame["quantity"]
    return list(frame.loc[total >= threshold, "order_id"])


def share_where(rows, name, value):
    """The fraction of rows whose column `name` holds `value`: the mean of a mask of True and False."""
    frame = pd.DataFrame(rows)
    return float((frame[name] == value).mean())


def town_counts(rows):
    """Orders per town once each name is cleaned: the .str methods work on a whole column of text."""
    frame = pd.DataFrame(rows)
    towns = frame["town"].str.strip().str.lower().str.title()
    return {town: int(n) for town, n in towns.value_counts().items()}


def filled_prices(rows):
    """Each missing price filled with the mean price of its own item: transform gives every row
    the mean of its group, and fillna uses it only where the price is missing."""
    frame = pd.DataFrame(rows)
    group_mean = frame.groupby("item")["price"].transform("mean")
    return [float(p) for p in frame["price"].fillna(group_mean)]


def revenue_by_category(orders, catalogue):
    """Takings per category: each order joined to its item in the catalogue, then grouped. The
    join is checked to be many orders to one item, so a doubled catalogue row raises an error."""
    merged = pd.merge(pd.DataFrame(orders), pd.DataFrame(catalogue), on="item", validate="many_to_one")
    merged["takings"] = merged["price"] * merged["quantity"]
    return {category: float(t) for category, t in merged.groupby("category")["takings"].sum().items()}


def unmatched(left, right, key):
    """The keys of the left rows with no partner on the right: a left join with indicator=True
    labels each row both or left_only."""
    merged = pd.merge(pd.DataFrame(left), pd.DataFrame(right)[[key]].drop_duplicates(), on=key, how="left", indicator=True)
    return merged.loc[merged["_merge"] == "left_only", key].tolist()


def melted(rows, id_column):
    """A wide table made long with melt: one row per value, with the column it came from. pandas
    marks a missing number NaN; where turns each one back into None, as the rows had it."""
    long = pd.melt(pd.DataFrame(rows), id_vars=[id_column], var_name="column", value_name="value")
    long = long.astype(object).where(long.notna(), None)
    return long.to_dict("records")


def bin_counts(values, edges):
    """How many values fall in each bin between the edges, with pandas: cut labels every value
    with its bin (right=False: a bin holds its left edge, not its right), and value_counts with
    sort=False counts them in the order of the bins."""
    bins = pd.cut(pd.Series(values), edges, right=False)
    return [int(n) for n in bins.value_counts(sort=False)]


def monthly_revenue_frame(rows, under=1000):
    """Lesson 10.10: revenue by month in pandas, the same question as the SQL GROUP BY. A mask
    keeps the prices that are known and under the limit; a new month column groups them."""
    frame = pd.DataFrame(rows)
    kept = frame[frame["price"].notna() & (frame["price"] < under)]
    revenue = (kept["price"] * kept["quantity"]).groupby(kept["date"].str[:7]).sum()
    return [[month, float(total)] for month, total in revenue.items()]
