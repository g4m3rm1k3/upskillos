export const starter = `import numpy as np

# x and y are 1D arrays of equal length; w and b are scalars.
# Implement each function. Run checks for feedback, or reveal a hint.
def predict(x, w, b):
    raise NotImplementedError("Implement prediction")

def mse(x, y, w, b):
    raise NotImplementedError("Implement mean squared error")

def gradients(x, y, w, b):
    # Return (dw, db), calculated at the SAME w and b.
    raise NotImplementedError("Implement the two derivatives")

def train(x, y, rate=0.05, steps=1000):
    w, b = 0.0, 0.0
    # Update both parameters using gradients from the old state.
    raise NotImplementedError("Implement batch gradient descent")
    return w, b
`
export const solution = `import numpy as np

def predict(x, w, b):
    return w * x + b

def mse(x, y, w, b):
    error = predict(x, w, b) - y
    return np.mean(error ** 2)

def gradients(x, y, w, b):
    error = predict(x, w, b) - y
    dw = 2 * np.mean(error * x)
    db = 2 * np.mean(error)
    return dw, db

def train(x, y, rate=0.05, steps=1000):
    w, b = 0.0, 0.0
    for _ in range(steps):
        dw, db = gradients(x, y, w, b)
        w = w - rate * dw
        b = b - rate * db
    return w, b
`
// Kept separate from student code. These checks exercise behavior, not source text.
export const checks = `
import numpy as np
_rng = np.random.default_rng(812)
for _n in [1, 7, 23]:
    _x = _rng.normal(size=_n)
    _y = _rng.normal(size=_n)
    _w, _b = 0.7, -0.3
    _expected = _w * _x + _b
    assert np.shape(predict(_x, _w, _b)) == (_n,), "Prediction must preserve the 1D shape"
    np.testing.assert_allclose(predict(_x, _w, _b), _expected, err_msg="Prediction mismatch")
    np.testing.assert_allclose(mse(_x, _y, _w, _b), np.mean((_expected-_y)**2), err_msg="MSE mismatch")
    _eps = 1e-5
    # Differentiate an independent reference loss, not the student's MSE.
    def _loss(a, c): return np.mean((a*_x+c-_y)**2)
    _numeric = [(_loss(_w+_eps,_b)-_loss(_w-_eps,_b))/(2*_eps),
                (_loss(_w,_b+_eps)-_loss(_w,_b-_eps))/(2*_eps)]
    np.testing.assert_allclose(gradients(_x,_y,_w,_b), _numeric, atol=1e-6, rtol=1e-5, err_msg="Gradient mismatch")
print("PASS: predictions, MSE, and numerical gradients on 3 datasets")
_x = np.linspace(-2,2,40)
_y = 1.7*_x + 0.8
_w, _b = train(_x,_y,rate=0.05,steps=1000)
np.testing.assert_allclose([_w,_b],[1.7,0.8],atol=1e-5,err_msg="Training did not converge")
_w1, _b1 = train(np.array([2.]),np.array([5.]),rate=0.1,steps=1)
np.testing.assert_allclose([_w1,_b1],[2.,1.],atol=1e-10,err_msg="One update from zero must use simultaneous gradients")
_w0, _b0 = train(_x,_y,steps=0)
np.testing.assert_allclose([_w0,_b0],[0.,0.],err_msg="Zero steps should leave initialization unchanged")
print("PASS: training convergence, simultaneous update, and zero steps")
`
export function experimentPython({ train, validation, rate }) {
  return `${solution}
# Exact data from your playground run. Validation does not participate in fit.
train_rows = np.array(${JSON.stringify(train.map(p => [p.x, p.y]))})
validation_rows = np.array(${JSON.stringify(validation.map(p => [p.x, p.y]))})
x, y = train_rows[:,0], train_rows[:,1]
xv, yv = validation_rows[:,0], validation_rows[:,1]
w, b = train(x, y, rate=${rate}, steps=1000)
print("Gradient descent:", w, b)
print("Train MSE:", mse(x,y,w,b))
print("Validation MSE:", mse(xv,yv,w,b))
print("Mean baseline validation MSE:", np.mean((np.mean(y)-yv)**2))
# A numerical least-squares solver avoids explicitly inverting X.T @ X.
reference = np.linalg.lstsq(np.column_stack([x, np.ones_like(x)]), y, rcond=None)[0]
print("NumPy least squares:", reference)
# Install scikit-learn in your local environment to compare:
# from sklearn.linear_model import LinearRegression
# model = LinearRegression().fit(x.reshape(-1,1),y)
# print("sklearn:", model.coef_[0], model.intercept_)
`
}
