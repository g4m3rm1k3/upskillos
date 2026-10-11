# Does centring and scaling raise the signal-to-noise ratio of REINFORCE's gradient, after 80 episodes of training?
import torch

from noise import gradient_spread
from policy import reinforce

torch.set_num_threads(1)
net, _ = reinforce(episodes=80)
print("Yes: higher" if gradient_spread(net, True) > gradient_spread(net, False) else "No: about the same or lower")
