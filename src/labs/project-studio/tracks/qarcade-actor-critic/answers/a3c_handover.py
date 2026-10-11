import time

import gymnasium as gym
import numpy as np
import torch
import torch.multiprocessing as mp
from torch import nn

from a2c import n_step_returns, play_greedy
from actor_critic import ActorCritic, a2c_loss

MAX_WORKERS = 2


def hand_over(local, shared):
    for local_param, shared_param in zip(local.parameters(), shared.parameters()):
        shared_param.grad = local_param.grad.clone()
