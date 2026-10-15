# Lesson 5.1's second prediction: the guessing loss's slope at w = 1, measured by a one-way nudge.
data = [2.0, 3.0, 7.0]


def loss(w):
    return sum((w - d) ** 2 for d in data) / len(data)


h = 1e-6
print(f"{(loss(1.0 + h) - loss(1.0)) / h:.3f}")
