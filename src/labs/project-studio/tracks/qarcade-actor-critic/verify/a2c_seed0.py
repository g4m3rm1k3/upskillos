# Seed 0's greedy score over 20 new games after the default 200,000 steps of A2C.
import torch

from a2c import play_greedy, train_a2c

torch.set_num_threads(1)
net, _ = train_a2c(quiet=True)
print(play_greedy(net).mean())
