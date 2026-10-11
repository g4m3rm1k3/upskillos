import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras
import torch

from a2c import play_greedy, train_a2c
from actor_critic import a2c_loss


def make_keras_actor_critic(hidden=64):
    inputs = keras.Input((4,))
    body = keras.layers.Dense(hidden, activation="tanh")(inputs)
    logits = keras.layers.Dense(2)(body)
    value = keras.layers.Dense(1)(body)
    return keras.Model(inputs, [logits, value])


class KerasActorCritic:
    def __init__(self, model):
        self.model = model

    def __call__(self, obs):
        leading = obs.shape[:-1]
        logits, value = self.model(obs.reshape(-1, 4))
        return logits.reshape(*leading, 2), value.reshape(leading)

    def parameters(self):
        return self.model.parameters()


def keras_update(model, optimiser, obs, actions, returns):
    logits, value = model(obs)
    loss, parts = a2c_loss(logits, value[..., 0], actions, returns)
    model.zero_grad()
    loss.backward()
    optimiser.apply([w.value.grad for w in model.trainable_weights], model.trainable_weights)
    return float(loss)


if __name__ == "__main__":
    torch.set_num_threads(1)
    keras.utils.set_random_seed(0)
    net = KerasActorCritic(make_keras_actor_critic())
    _, curve = train_a2c(net=net)
    print("greedy, 20 new games:", play_greedy(net).mean())
