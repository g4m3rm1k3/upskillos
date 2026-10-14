# Lesson 4.4's second prediction: the shape of a 3-row matrix's row lengths with keepdims=True.
import numpy as np

m = np.array([[3.0, 4.0, 0.0], [0.0, 6.0, 8.0], [0.0, 0.0, 2.0]])
print(np.linalg.norm(m, axis=1, keepdims=True).shape)
