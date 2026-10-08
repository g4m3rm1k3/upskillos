import numpy as np

from line import make_points, mse, predict


def nudged_gradient(w, b, x, y, h=1e-6):
    loss = mse(predict(w, b, x), y)
    dw = (mse(predict(w + h, b, x), y) - loss) / h
    db = (mse(predict(w, b + h, x), y) - loss) / h
    return dw, db


def gradient(w, b, x, y):
    error = predict(w, b, x) - y
    return float(np.mean(2 * error * x)), float(np.mean(2 * error))

