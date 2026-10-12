import random

import torch
from torch import nn

from mnist import load_mnist


def batches(n, batch_size, rng):
    """One epoch: the positions 0 ... n-1, shuffled, cut into groups of batch_size."""
    order = list(range(n))
    rng.shuffle(order)
    return [order[i:i + batch_size] for i in range(0, n, batch_size)]


def train_mnist(hidden=128, epochs=2, batch_size=64, rate=0.1, seed=0, limit=None):
    """784 pixels -> hidden -> 10 scores, trained on mini-batches; tested on the 10,000 test digits."""
    torch.manual_seed(seed)
    rng = random.Random(seed)
    x, y = load_mnist("train", limit)
    test_x, test_y = load_mnist("test")
    model = nn.Sequential(nn.Linear(784, hidden), nn.ReLU(), nn.Linear(hidden, 10))
    loss_fn = nn.CrossEntropyLoss()
    optimizer = torch.optim.SGD(model.parameters(), lr=rate)
    history = []
    accuracy = 0.0
    for epoch in range(epochs):
        for batch in batches(len(x), batch_size, rng):
            index = torch.tensor(batch)
            loss = loss_fn(model(x[index]), y[index])
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            history.append(loss.item())
        with torch.no_grad():
            accuracy = (model(test_x).argmax(dim=1) == test_y).float().mean().item()
        print("epoch", epoch + 1, "steps", len(history), "test accuracy", round(accuracy, 4))
    return model, history, accuracy
