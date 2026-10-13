# Lesson 2.5's prediction: without a done set, how many times does "python" appear in order(COURSE)?
from frontier.graph import order

COURSE = {
    "tensors": ["python"],
    "autograd": ["tensors", "calculus"],
    "calculus": [],
    "python": [],
    "gpt": ["autograd", "tensors"],
}
print(order(COURSE).count("python"))
