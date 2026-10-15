# Lesson 5.2's second prediction: the largest gap between the wrong rule 3x and x³'s measured slope.
def cube(x):
    return x ** 3


h = 1e-5
xs = [-2.0, -1.0, 0.0, 0.5, 1.0, 2.0]
print(f"{max(abs(3 * x - (cube(x + h) - cube(x - h)) / (2 * h)) for x in xs):.1f}")
