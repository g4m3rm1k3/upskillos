"""Part 8 of NLP Studio: the tiny GPT of tinygpt.py, in PyTorch. The same weights, the same
arithmetic (x times W, no hidden biases), so PyTorch's automatic gradients and Adam can be checked
against the ones you wrote by hand. Desktop only: PyTorch doesn't run in the page.
"""
import math

import torch

import tinygpt as tg
from vectors import Rng

torch.set_num_threads(1)   # one thread: a training run must never freeze the computer


def causal_mask(n):
    """True where position i would look at a later position j: the scores attention must ignore."""
    return [[j > i for j in range(n)] for i in range(n)]


class TinyGPT(torch.nn.Module):
    """One transformer block, exactly as tinygpt.forward computes it, with every weight a Parameter."""

    def __init__(self, weights):
        super().__init__()
        for name in tg.PARAMS:
            setattr(self, name, torch.nn.Parameter(torch.tensor(weights[name], dtype=torch.float64)))

    def forward(self, ids):
        n = len(ids)
        x = self.tok[ids] + self.pos[:n]
        q, k, v = x @ self.wq, x @ self.wk, x @ self.wv
        scores = q @ k.T / math.sqrt(self.wq.shape[0])
        weights = torch.softmax(scores.masked_fill(torch.tensor(causal_mask(n)), float("-inf")), dim=-1)
        x = x + (weights @ v) @ self.wo
        x = x + torch.relu(x @ self.w1) @ self.w2
        return x @ self.out

    def to_lists(self):
        """The weights back as plain lists, in tinygpt's format."""
        return {name: getattr(self, name).detach().tolist() for name in tg.PARAMS}


def compare_gradients(weights, ids, targets):
    """The largest difference between tinygpt's hand-written gradients and PyTorch's, for each weight."""
    logits, ours, _ = tg.forward(weights, ids)
    loss = tg.cross_entropy(logits, targets)
    loss.backward()
    net = TinyGPT(weights)
    torch_loss = torch.nn.functional.cross_entropy(net(torch.tensor(ids)), torch.tensor(targets))
    torch_loss.backward()
    out = {"loss": [loss.data[0][0], torch_loss.item()]}
    for name in tg.PARAMS:
        mine = torch.tensor(ours[name].grad, dtype=torch.float64)
        out[name] = (mine - getattr(net, name).grad).abs().max().item()
    return out


def train_net(net, vocab, text, steps, lr=0.01, seed=1):
    """tinygpt.train's loop in PyTorch: the same random windows, and PyTorch's Adam with the same
    settings. Characters the vocabulary doesn't have are skipped. Returns the losses."""
    index = {c: k for k, c in enumerate(vocab)}
    chars = [index[c] for c in text if c in index]
    context = net.pos.shape[0]
    optimiser = torch.optim.Adam(net.parameters(), lr=lr, betas=(0.9, 0.99), eps=1e-8)
    rng = Rng(seed + 1)
    losses = []
    for _ in range(steps):
        start = rng.below(len(chars) - context - 1)
        ids = torch.tensor(chars[start:start + context])
        targets = torch.tensor(chars[start + 1:start + context + 1])
        loss = torch.nn.functional.cross_entropy(net(ids), targets)
        optimiser.zero_grad()
        loss.backward()
        optimiser.step()
        losses.append(loss.item())
    return losses


def train_torch(text, steps, dim=16, context=16, hidden=64, lr=0.01, seed=1):
    """tinygpt.train, in PyTorch, from the same starting weights. Returns (vocab, weights as lists, losses)."""
    vocab = sorted(set(text))
    net = TinyGPT(tg.init_model(len(vocab), dim, context, hidden, seed))
    losses = train_net(net, vocab, text, steps, lr, seed)
    return vocab, net.to_lists(), losses


def continue_training(path, text, steps, out_path, lr=0.01):
    """Load a tiny GPT the page saved, train it further with PyTorch, and save it where the page's
    Upload button can read it. Returns the losses."""
    vocab, weights = tg.load_safetensors(path)
    net = TinyGPT(weights)
    losses = train_net(net, vocab, text, steps, lr)
    tg.save_safetensors(out_path, vocab, net.to_lists())
    return losses
