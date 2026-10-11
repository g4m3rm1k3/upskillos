# Seed 0 of lesson 4.1's REINFORCE: does it stay at 500 once it first gets there?
import numpy as np
import torch

from policy import reinforce

torch.set_num_threads(1)
_, lengths = reinforce()
first = next(i for i, n in enumerate(lengths) if n >= 500)
print("No: it falls back" if np.mean(lengths[first:]) < 450 else "Yes: it stays")
