import csv
from pathlib import Path

import numpy as np
from sklearn.linear_model import LinearRegression

FEATURES = ["sqft", "bedrooms", "age"]
DATA = Path(__file__).resolve().parent / "data" / "houses.csv"


def train(path: str | Path = DATA) -> LinearRegression:
    with open(path, newline="", encoding="utf-8") as f:
        rows = [row for row in csv.DictReader(f) if all(row[name] != "" for name in [*FEATURES, "price"])]
    X = np.array([[float(row[name]) for name in FEATURES] for row in rows])
    y = np.array([float(row["price"]) for row in rows])
    return LinearRegression().fit(X, y)


MODEL = train()


def predict(sqft: float, bedrooms: float, age: float) -> float:
    return float(MODEL.predict(np.array([[sqft, bedrooms, age]]))[0])
