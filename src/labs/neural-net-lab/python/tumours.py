import csv
import os
import random

import torch
from torch import nn

from metrics import confusion, scores

HERE = os.path.dirname(os.path.abspath(__file__))


def load_tumours(columns=None):
    """Each tumour's measurements (all 30, or the columns named) and its label: 1 malignant, 0 benign."""
    rows, labels = [], []
    with open(os.path.join(HERE, "tumours.csv"), encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        names = columns or reader.fieldnames[1:]
        for row in reader:
            rows.append([float(row[name]) for name in names])
            labels.append(1 if row["diagnosis"] == "M" else 0)
    return rows, labels, names


def split(rows, labels, test_fraction=0.2, seed=0):
    """Shuffle the tumours and keep a fifth aside for testing."""
    order = list(range(len(rows)))
    random.Random(seed).shuffle(order)
    n_test = int(len(order) * test_fraction)
    test, train = order[:n_test], order[n_test:]
    return ([rows[i] for i in train], [labels[i] for i in train]), ([rows[i] for i in test], [labels[i] for i in test])


def column_stats(rows):
    """Every column's average and spread, from these rows only."""
    stats = []
    for column in zip(*rows):
        mean = sum(column) / len(column)
        spread = (sum((v - mean) ** 2 for v in column) / len(column)) ** 0.5
        stats.append((mean, spread))
    return stats


def scale(rows, stats):
    """Every measurement as 'spreads from its column's average', a tensor with one row per tumour."""
    return torch.tensor([[(v - mean) / spread for v, (mean, spread) in zip(row, stats)] for row in rows])


def train_tumours(columns=None, hidden=0, steps=1000, rate=0.1, seed=0):
    """Learn malignant or benign from the measurements; judge on tumours the model never saw."""
    torch.manual_seed(seed)
    rows, labels, names = load_tumours(columns)
    (train_x, train_y), (test_x, test_y) = split(rows, labels, seed=seed)
    stats = column_stats(train_x)
    x = scale(train_x, stats)
    y = torch.tensor(train_y, dtype=torch.float32).unsqueeze(1)
    if hidden:
        model = nn.Sequential(nn.Linear(len(names), hidden), nn.ReLU(), nn.Linear(hidden, 1))
    else:
        model = nn.Linear(len(names), 1)
    loss_fn = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.SGD(model.parameters(), lr=rate)
    for step in range(steps):
        loss = loss_fn(model(x), y)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    with torch.no_grad():
        probs = torch.sigmoid(model(scale(test_x, stats))).squeeze(1).tolist()
    counts = confusion(probs, test_y)
    accuracy, precision, recall = scores(*counts)
    print("test tumours:", len(test_y), "tp fp tn fn:", counts, "accuracy", round(accuracy, 3), "precision", round(precision, 3), "recall", round(recall, 3))
    return model, stats, probs, test_y, counts
