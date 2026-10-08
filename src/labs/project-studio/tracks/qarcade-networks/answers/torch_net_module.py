import torch
from torch import nn

from tiny_net import make_curve


def autograd_gradients(params, x, y):
    tensors = {name: torch.tensor(value, requires_grad=True) for name, value in params.items()}
    X = torch.tensor(x).reshape(-1, 1)
    h = torch.relu(X @ tensors["W1"] + tensors["b1"])
    out = (h @ tensors["W2"] + tensors["b2"])[:, 0]
    loss = torch.mean((out - torch.tensor(y)) ** 2)
    loss.backward()
    return {name: tensor.grad.numpy() for name, tensor in tensors.items()}


def make_net(hidden=16):
    return nn.Sequential(nn.Linear(1, hidden), nn.ReLU(), nn.Linear(hidden, 1))

