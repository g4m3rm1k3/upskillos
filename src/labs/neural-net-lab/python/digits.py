import csv
import os
import random

import torch
from torch import nn

from torch_iris import confusion_matrix

HERE = os.path.dirname(os.path.abspath(__file__))


def load_digits():
    """1,797 handwritten digits, each an 8 x 8 picture of ink amounts 0 to 16, read row by row."""
    images, labels = [], []
    with open(os.path.join(HERE, "digits.csv"), encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            images.append([int(row[f"p{i}"]) / 16 for i in range(64)])
            labels.append(int(row["digit"]))
    return images, labels


def split(images, labels, test_fraction=0.2, seed=0):
    """Shuffle, and keep a fifth aside for testing."""
    order = list(range(len(images)))
    random.Random(seed).shuffle(order)
    n_test = int(len(order) * test_fraction)
    test, train = order[:n_test], order[n_test:]
    return ([images[i] for i in train], [labels[i] for i in train]), ([images[i] for i in test], [labels[i] for i in test])


def train_digits(hidden=32, steps=500, rate=0.5, seed=0):
    """64 pixels -> hidden -> 10 scores, one per digit; tested on digits it never saw."""
    torch.manual_seed(seed)
    images, labels = load_digits()
    (train_x, train_y), (test_x, test_y) = split(images, labels, seed=seed)
    x = torch.tensor(train_x)
    y = torch.tensor(train_y)
    if hidden:
        model = nn.Sequential(nn.Linear(64, hidden), nn.ReLU(), nn.Linear(hidden, 10))
    else:
        model = nn.Linear(64, 10)
    loss_fn = nn.CrossEntropyLoss()
    optimizer = torch.optim.SGD(model.parameters(), lr=rate)
    for step in range(steps):
        loss = loss_fn(model(x), y)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    with torch.no_grad():
        guesses = model(torch.tensor(test_x)).argmax(dim=1).tolist()
    table = confusion_matrix(guesses, test_y, 10)
    right = sum(table[d][d] for d in range(10))
    print("test digits:", len(test_y), "right:", right, "=", round(right / len(test_y), 3))
    return model, table


def predict_digit(model, pixels):
    """Your own 8 x 8 drawing (64 ink amounts, 0 to 16): the ten probabilities and the best guess."""
    with torch.no_grad():
        probs = torch.softmax(model(torch.tensor([[p / 16 for p in pixels]])), dim=1)[0]
    return int(probs.argmax()), probs.tolist()
