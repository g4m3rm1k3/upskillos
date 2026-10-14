# Lesson 4.1's first prediction: the dot product of "the cat sat on the mat" and "the dog sat on the log".
vocab = ["cat", "dog", "log", "mat", "on", "sat", "the"]
cat = [1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 2.0]
dog = [0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 2.0]
print(sum(x * y for x, y in zip(cat, dog)))
