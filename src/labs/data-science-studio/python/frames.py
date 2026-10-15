"""Lesson 1.5 of Data Science Studio: the same table in pandas, stored as columns. A DataFrame
keeps each column as one array of numbers of a single type, so a whole column is added, compared
or summed in one operation instead of one row at a time.
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
