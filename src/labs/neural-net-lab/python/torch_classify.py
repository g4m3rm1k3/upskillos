import torch
from torch import nn

from logistic import bce, sigmoid
from points2d import make_moons


def check_loss():
    """PyTorch's BCEWithLogitsLoss beside the cross-entropy written by hand, on a few made-up scores."""
    logits = torch.tensor([[2.0], [-1.0], [0.5], [-3.0]])
    labels = torch.tensor([[1.0], [1.0], [0.0], [0.0]])
    with_torch = nn.BCEWithLogitsLoss()(logits, labels).item()
    by_hand = 0.0
    for z, label in zip(logits.squeeze(1).tolist(), labels.squeeze(1).tolist()):
        by_hand += bce(sigmoid(z), label) / 4
    print("PyTorch:", with_torch, "by hand:", by_hand)
    return with_torch, by_hand


def train_moons(hidden=16, steps=3000, rate=0.5, seed=0):
    """A network with one hidden layer learns to separate the two moons; hidden=0 is a single neuron."""
    torch.manual_seed(seed)
    points, labels = make_moons(seed=seed)
    x = torch.tensor(points)
    y = torch.tensor(labels, dtype=torch.float32).unsqueeze(1)
    if hidden:
        model = nn.Sequential(nn.Linear(2, hidden), nn.ReLU(), nn.Linear(hidden, 1))
    else:
        model = nn.Linear(2, 1)
    loss_fn = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.SGD(model.parameters(), lr=rate)
    history = []
    for step in range(steps):
        logits = model(x)
        loss = loss_fn(logits, y)
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        history.append(loss.item())
    with torch.no_grad():
        accuracy = ((model(x) > 0).float() == y).float().mean().item()
    print("hidden", hidden, "final loss", round(history[-1], 4), "accuracy", accuracy)
    return model, history, accuracy
