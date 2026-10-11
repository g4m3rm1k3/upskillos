import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras
import numpy as np

from new_maze import observe
from qmaze import MAZE, QMaze


def build_model(size=100, actions=4):
    model = keras.Sequential([
        keras.Input((size,)),
        keras.layers.Dense(size),
        keras.layers.PReLU(),
        keras.layers.Dense(size),
        keras.layers.PReLU(),
        keras.layers.Dense(actions),
    ])
    model.compile(optimizer="adam", loss="mse")
    return model


def table_examples(agent, maze=MAZE):
    env = QMaze(maze)
    inputs, targets = [], []
    for cell in env.free_cells:
        env.cell = cell
        inputs.append(observe(env))
        targets.append(agent.Q[env.state()])
    return np.array(inputs), np.array(targets)


class NetworkAgent:
    def __init__(self, model, maze=MAZE):
        self.model = model
        self.env = QMaze(maze)
        self.epsilon = 0.0

    def act(self, state):
        self.env.cell = divmod(state, self.env.cols)
        values = self.model(observe(self.env).reshape(1, -1))
        return int(np.argmax(keras.ops.convert_to_numpy(values)[0]))

