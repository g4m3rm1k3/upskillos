# Lesson 2.2's prediction: can a list be a dictionary key?
try:
    counts = {["the", "cat"]: 1}
    print("it works")
except TypeError:
    print("TypeError")
