# Lesson 5.5's second prediction: what gradient descent on the guessing loss does at rate 1.0, from 0.
def slope(w):
    return 2 * (w - 4.0)


path = [0.0]
for _ in range(20):
    path.append(path[-1] - 1.0 * slope(path[-1]))
if all(w == (0.0 if i % 2 == 0 else 8.0) for i, w in enumerate(path)):
    print("it bounces between 0 and 8 forever")
else:
    print(path)
