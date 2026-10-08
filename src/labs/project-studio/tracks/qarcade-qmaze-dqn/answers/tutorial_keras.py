import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras
import numpy as np


class Experience:
    def __init__(self, model, max_memory=1000, discount=0.95):
        self.model = model
        self.max_memory = max_memory
        self.discount = discount
        self.memory = []

    def remember(self, episode):
        self.memory.append(episode)
        if len(self.memory) > self.max_memory:
            del self.memory[0]

    def predict(self, envstate):
        return keras.ops.convert_to_numpy(self.model(envstate.reshape(1, -1)))[0]

    def get_data(self, data_size=10):
        chosen = np.random.choice(len(self.memory), min(len(self.memory), data_size), replace=False)
        inputs = np.array([self.memory[j][0] for j in chosen])
        next_inputs = np.array([self.memory[j][3] for j in chosen])
        targets = keras.ops.convert_to_numpy(self.model(inputs))
        best_next = keras.ops.convert_to_numpy(self.model(next_inputs)).max(axis=1)
        for i, j in enumerate(chosen):
            _, action, reward, _, game_over = self.memory[j]
            targets[i, action] = reward if game_over else reward + self.discount * best_next[i]
        return inputs, targets

