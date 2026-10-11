import csv
import os
import random

import torch
from torch import nn

HERE = os.path.dirname(os.path.abspath(__file__))


def load_cars():
    """Every car in cars.csv whose horsepower is known, as (name, weight, horsepower, mpg)."""
    cars = []
    with open(os.path.join(HERE, "cars.csv"), encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if row["horsepower"] == "?":
                continue
            cars.append((row["name"], float(row["weight"]), float(row["horsepower"]), float(row["mpg"])))
    return cars


def split(cars, test_fraction=0.2, seed=0):
    """Shuffle, then keep a fifth of the cars aside for testing: the model never trains on them."""
    shuffled = list(cars)
    random.Random(seed).shuffle(shuffled)
    n_test = int(len(shuffled) * test_fraction)
    return shuffled[n_test:], shuffled[:n_test]


def mean_and_spread(values):
    """The average, and the standard deviation: how far values typically are from the average."""
    mean = sum(values) / len(values)
    spread = (sum((v - mean) ** 2 for v in values) / len(values)) ** 0.5
    return mean, spread


def scale(cars, stats):
    """Weight and horsepower as 'how many spreads from the average', a tensor with one row per car."""
    (w_mean, w_spread), (h_mean, h_spread) = stats
    return torch.tensor([[(weight - w_mean) / w_spread, (hp - h_mean) / h_spread] for name, weight, hp, mpg in cars])


def train_cars(hidden=16, steps=3000, rate=0.01, seed=0):
    """Learn mpg from weight and horsepower; report the average miss on cars it never saw."""
    torch.manual_seed(seed)
    train, test = split(load_cars(), seed=seed)
    stats = (mean_and_spread([car[1] for car in train]), mean_and_spread([car[2] for car in train]))
    x = scale(train, stats)
    y = torch.tensor([[car[3]] for car in train])
    model = nn.Sequential(nn.Linear(2, hidden), nn.ReLU(), nn.Linear(hidden, 1))
    optimizer = torch.optim.SGD(model.parameters(), lr=rate)
    for step in range(steps):
        loss = ((model(x) - y) ** 2).mean()
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    with torch.no_grad():
        test_miss = (model(scale(test, stats)) - torch.tensor([[car[3]] for car in test])).abs().mean().item()
    print("trained on", len(train), "cars; on", len(test), "new cars it is off by", round(test_miss, 2), "mpg on average")
    return model, stats, test_miss


def predict_mpg(model, stats, weight, horsepower):
    """The trained model's guess for a car you describe."""
    with torch.no_grad():
        return model(scale([("yours", weight, horsepower, 0.0)], stats)).item()
