import torch
from torch import nn

from data import make_curve
from tinynet import init_net, train_step


def make_model(hidden=8):
    """The same 1 -> hidden -> 1 network, in PyTorch."""
    return nn.Sequential(nn.Linear(1, hidden), nn.ReLU(), nn.Linear(hidden, 1))


def copy_weights(model, net):
    """Put the hand-made network's numbers into the PyTorch model, so the two start identical."""
    with torch.no_grad():
        model[0].weight.copy_(torch.tensor(net["w1"]).unsqueeze(1))
        model[0].bias.copy_(torch.tensor(net["b1"]))
        model[2].weight.copy_(torch.tensor([net["w2"]]))
        model[2].bias.copy_(torch.tensor([net["b2"]]))


def train_torch(hidden=8, steps=2000, rate=0.05, seed=0):
    """tinynet.train_net, in PyTorch: the same data, the same starting weights, the same steps."""
    xs, ys = make_curve(seed=seed)
    x = torch.tensor(xs).unsqueeze(1)
    y = torch.tensor(ys).unsqueeze(1)
    model = make_model(hidden)
    copy_weights(model, init_net(hidden, seed))
    optimizer = torch.optim.SGD(model.parameters(), lr=rate)
    history = []
    for step in range(steps):
        prediction = model(x)
        loss = ((prediction - y) ** 2).mean()
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        history.append(loss.item())
    return model, history


def compare(steps=200, hidden=8, seed=0):
    """Train both for the same steps: how far apart do their losses ever get?"""
    xs, ys = make_curve(seed=seed)
    net = init_net(hidden, seed)
    by_hand = [train_step(net, xs, ys, 0.05) for step in range(steps)]
    model, with_torch = train_torch(hidden, steps, 0.05, seed)
    gap = max(abs(a - b) for a, b in zip(by_hand, with_torch))
    print("loss after", steps, "steps: by hand", by_hand[-1], "PyTorch", with_torch[-1], "largest gap", gap)
    return gap
