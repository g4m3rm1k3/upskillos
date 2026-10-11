import numpy as np  # setup | NumPy lets one expression operate on a whole batch of numbers.
x = np.array([0., 1., 2., 3.])  # observe | Four training inputs. Each index identifies one example.
y = np.array([1., 3., 5., 7.])  # observe | Four correct outputs, paired with x by index. The hidden rule is y = 2x + 1.
w = 0.0  # setup | Start with a slope of zero. The model currently ignores its input.
b = 0.0  # setup | Start with an intercept of zero. These two numbers are the entire model.
learning_rate = 0.05  # learn | Move against each derivative by this fraction on every update.
losses = []  # store | Keep one mean squared error per update so we can see the trend.
for epoch in range(12):  # loop | Reuse this small batch for twelve gradient-descent updates.
    predictions = w * x + b  # choose | Predict all four outputs. Each input is multiplied by the same slope and shifted by the same intercept.
    residuals = predictions - y  # learn | One signed error per example: prediction minus the known correct output.
    loss = np.mean(residuals ** 2)  # learn | Square all four errors, then average them. This is mean squared error, a scalar.
    losses.append(float(loss))  # store | Save the error BEFORE this update. Lower is better on these training examples.
    dw = 2 * np.mean(residuals * x)  # learn | Derivative of mean squared error with respect to the slope. Multiply each error by its input, average, then double.
    db = 2 * np.mean(residuals)  # learn | Derivative with respect to the intercept. Every example changes by the same amount when b changes.
    w = w - learning_rate * dw  # learn | A positive derivative means increasing w raises loss, so subtract it.
    b = b - learning_rate * db  # learn | Update the intercept using its own derivative, calculated before either parameter changed.
predictions = w * x + b  # choose | Recompute predictions using the final learned parameters; compare with y.
