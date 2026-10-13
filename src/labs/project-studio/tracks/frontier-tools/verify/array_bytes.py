# Lesson 3.4's prediction: the bytes a NumPy array of a million floats uses for its numbers.
import numpy as np

print(np.zeros(1000000).nbytes)
