import time

import gymnasium as gym
import numpy as np
import torch
from torch import nn

from actor_critic import ActorCritic, a2c_loss


def n_step_returns(rewards, ended, last_values, gamma):
    returns = np.zeros(np.shape(rewards))
    running = np.asarray(last_values, dtype=float)
    for t in reversed(range(len(rewards))):
        running = rewards[t] + gamma * (1 - ended[t]) * running
        returns[t] = running
    return returns
