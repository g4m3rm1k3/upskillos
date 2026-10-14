# Lesson 4.3's first prediction: a matrix added up down its columns, with axis=0.
import numpy as np

m = np.array([[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]])
print(m.sum(axis=0))
