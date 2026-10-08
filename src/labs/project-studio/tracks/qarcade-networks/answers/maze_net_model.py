import os

os.environ.setdefault("KERAS_BACKEND", "torch")

import keras


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

