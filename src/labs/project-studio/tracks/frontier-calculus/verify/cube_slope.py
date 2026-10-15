# Lesson 5.2's first prediction: the measured slope of x³ at x = 3, to 3 places.
def cube(x):
    return x ** 3


h = 1e-5
print(f"{(cube(3.0 + h) - cube(3.0 - h)) / (2 * h):.3f}")
