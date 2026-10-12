import math
import random

import torch
from torch import nn


def noisy_points(n, seed, noise):
    """n points near y = sin(x), x from -3 to 3, each off the curve by up to `noise`."""
    rng = random.Random(seed)
    xs = [rng.uniform(-3, 3) for i in range(n)]
    ys = [math.sin(x) + rng.uniform(-noise, noise) for x in xs]
    return torch.tensor(xs).unsqueeze(1), torch.tensor(ys).unsqueeze(1)


def train_big(steps=3000, weight_decay=0.0, dropout=0.0, seed=0):
    """A large network (1 -> 64 -> 64 -> 1) on 30 noisy points; its error on them and on the true curve."""
    torch.manual_seed(seed)
    x, y = noisy_points(30, seed, 0.3)
    test_x, test_y = noisy_points(200, seed + 100, 0.0)
    model = nn.Sequential(nn.Linear(1, 64), nn.ReLU(), nn.Dropout(dropout),
                          nn.Linear(64, 64), nn.ReLU(), nn.Dropout(dropout), nn.Linear(64, 1))
    optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=weight_decay)
    train_history, test_history = [], []
    for step in range(steps):
        model.train()
        loss = ((model(x) - y) ** 2).mean()
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        model.eval()
        with torch.no_grad():
            train_history.append(((model(x) - y) ** 2).mean().item())
            test_history.append(((model(test_x) - test_y) ** 2).mean().item())
    best = min(range(steps), key=lambda i: test_history[i])
    print("final train", round(train_history[-1], 5), "final test", round(test_history[-1], 4),
          "best test", round(test_history[best], 4), "at step", best)
    return train_history, test_history, best
