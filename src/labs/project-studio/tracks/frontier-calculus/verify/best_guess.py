# Lesson 5.1's first prediction: which of 81 guesses from 0 to 8 has the lowest loss for 2, 3 and 7.
import numpy as np

data = [2.0, 3.0, 7.0]
ws = np.linspace(0.0, 8.0, 81)
losses = [sum((w - d) ** 2 for d in data) / len(data) for w in ws]
print(f"{min(zip(losses, ws))[1]:.1f}")
