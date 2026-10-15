# Lesson 5.4's first prediction: the slope of (a + b) * b along b, at a = 1, b = 2.
def e(a, b):
    return (a + b) * b


h = 1e-5
print(f"{(e(1.0, 2.0 + h) - e(1.0, 2.0 - h)) / (2 * h):.3f}")
