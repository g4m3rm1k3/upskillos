# Lesson 2.4's prediction: what happens to a function that always calls itself?


def countdown(n):
    return countdown(n - 1)


try:
    countdown(10)
except RecursionError:
    print("RecursionError")
