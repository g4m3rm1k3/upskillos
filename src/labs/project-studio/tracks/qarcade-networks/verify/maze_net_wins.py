# How many starts the table-trained network's own greedy policy solves (seed 0, 800 epochs).
import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras

from maze_net import NetworkAgent, build_model, table_examples
from maze_tools import completion
from rewards import train_maze

keras.utils.set_random_seed(0)
inputs, targets = table_examples(train_maze())
model = build_model()
model.fit(inputs, targets, epochs=800, batch_size=16, verbose=0)
wins = completion(NetworkAgent(model))[0]
print("All 74, or very nearly" if wins >= 72 else wins)
