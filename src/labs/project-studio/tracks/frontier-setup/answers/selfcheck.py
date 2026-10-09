"""Checks that the libraries this project relies on agree with each other."""
import numpy as np
import torch

from frontier.info import device


def matmul_difference(n, seed):
    rng = np.random.default_rng(seed)
    a = rng.standard_normal((n, n))
    b = rng.standard_normal((n, n))
    expected = a @ b
    where = device()
    got = (torch.from_numpy(a).to(where) @ torch.from_numpy(b).to(where)).cpu().numpy()
    return float(np.abs(expected - got).max())
