# Lesson 5.5's third prediction: what y does when descending x² + 10y² from (-4, 1) at rate 0.09.
y = 1.0
ys = [y]
for _ in range(30):
    y = y - 0.09 * 20 * y
    ys.append(y)
flips = all(a * b < 0 for a, b in zip(ys, ys[1:]))
shrinks = all(abs(b) < abs(a) for a, b in zip(ys, ys[1:]))
if flips and shrinks:
    print("zigzags from one side of 0 to the other, shrinking")
elif shrinks:
    print("creeps down to 0 from above, like x")
else:
    print("grows further from 0 every step")
