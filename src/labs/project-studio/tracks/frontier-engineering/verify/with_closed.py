# Lesson 1.4's prediction: is a file closed straight after its with block?
with open("data/sample.txt") as f:
    f.read()
print(f.closed)
