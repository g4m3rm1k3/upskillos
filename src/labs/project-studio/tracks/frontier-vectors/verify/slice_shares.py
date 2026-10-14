# Lesson 4.2's second prediction: v[3] after changing the first number of the slice v[3:6].
import numpy as np

v = np.array([1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 2.0])
part = v[3:6]
part[0] = 99.0
print(v[3])
