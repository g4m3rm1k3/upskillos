# Lesson 5.1's third prediction: the one-way slope error for x³ at 2, with h = 1e-15 against h = 1e-8.


def cube(x):
    return x * x * x


def error(h):
    return abs((cube(2.0 + h) - cube(2.0)) / h - 12.0)


print("bigger: rounding takes over" if error(1e-15) > error(1e-8) else "smaller: a smaller nudge is always closer")
