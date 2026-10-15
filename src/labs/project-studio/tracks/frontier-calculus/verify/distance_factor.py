# Lesson 5.5's first prediction: how one step at rate 0.1 changes the distance to 4 on the guessing loss.
def slope(w):
    return 2 * (w - 4.0)


w = 0.0
step = w - 0.1 * slope(w)
print(round((step - 4.0) / (w - 4.0), 6))
