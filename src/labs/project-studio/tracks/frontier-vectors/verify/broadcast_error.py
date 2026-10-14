# Lesson 4.4's first prediction: adding a vector of 2 to a (2, 3) matrix.
import numpy as np

m = np.array([[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]])
try:
    m + np.array([10.0, 20.0])
    print("adds 10 to row 0 and 20 to row 1")
except ValueError:
    print("raises ValueError")
