import torch
from torch import nn


def same_start(hidden=4):
    """Every weight starting at the same number: do the hidden neurons ever become different?"""
    model = nn.Sequential(nn.Linear(1, hidden), nn.Tanh(), nn.Linear(hidden, 1))
    with torch.no_grad():
        for p in model.parameters():
            p.fill_(0.5)
    x = torch.linspace(-2, 2, 20).unsqueeze(1)
    y = torch.sin(x)
    optimizer = torch.optim.SGD(model.parameters(), lr=0.1)
    for step in range(200):
        loss = ((model(x) - y) ** 2).mean()
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
    weights = model[0].weight.squeeze(1).tolist()
    print("hidden weights after 200 steps:", weights)
    return weights


def signal_through_layers(scale=1.0, layers=8, width=64, seed=0):
    """A batch through a deep stack of tanh layers whose weights are drawn with a given size:
    the typical size of the numbers after each layer."""
    torch.manual_seed(seed)
    h = torch.randn(256, width)
    spreads = []
    for layer in range(layers):
        weights = torch.randn(width, width) * scale / width ** 0.5
        h = torch.tanh(h @ weights)
        spreads.append(h.std().item())
    print("scale", scale, "spread after each layer", [round(s, 3) for s in spreads])
    return spreads
