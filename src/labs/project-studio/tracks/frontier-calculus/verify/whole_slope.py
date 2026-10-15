# Lesson 5.3's first prediction: the measured slope of (3x + 1)² at x = 1, to 3 places.
def f(x):
    return (3 * x + 1) ** 2


h = 1e-5
print(f"{(f(1.0 + h) - f(1.0 - h)) / (2 * h):.3f}")
