# The Keras-built A2C network's greedy score over 20 new games after 200,000 steps (seed 0).
import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras
import torch

from a2c import play_greedy, train_a2c
from keras_a2c import KerasActorCritic, make_keras_actor_critic

torch.set_num_threads(1)
keras.utils.set_random_seed(0)
net = KerasActorCritic(make_keras_actor_critic())
train_a2c(net=net, quiet=True)
print(play_greedy(net).mean())
