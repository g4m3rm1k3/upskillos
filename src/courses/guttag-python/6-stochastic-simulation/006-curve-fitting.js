// Guttag — Lesson 42: Curve Fitting
// Auto-converted from src/docs/tutorials/guttag-python/lesson-42.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-42-curve-fitting',
  slug: 'curve-fitting',
  chapter: 6,
  order: 6,
  title: 'Curve Fitting',
  subtitle: 'Linear and Polynomial Regression from Scratch',
  tags: ['regression', 'ordinary-least-squares-ols', 'r-2-coefficient-of-determination', 'polynomial-regression', 'gaussian-elimination', 'overfitting'],

  hook: {
    question: 'What is "Curve Fitting", and why does it matter?',
    realWorldContext: 'The reader implements simple linear regression (finding the best-fit line y = mx + b) from scratch using the least-squares formulas, evaluates fit with R^2, and extends to polynomial regression using matrix equations. The transferable insight: regression finds the function that minimizes the SUM OF SQUARED ERRORS between predicted and actual values. \'Least squares\' is the criterion. This is the same criterion used inside neural networks (mean squared error loss). Understanding it from scratch demystifies the \'magic\' of machine learning.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: Simple linear regression from scratch, R^2: measuring goodness of fit, Polynomial regression — degree d, Overfitting — the polynomial degree trap, Making predictions and residual analysis.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Regression:** a statistical process for estimating the relationships among variables, specifically focusing on the relationship between a dependent variable and one or more independent variables. It exists to predict unknown values based on known data.\n- **Ordinary Least Squares (OLS):** a type of linear least squares method for estimating the unknown parameters in a linear regression model. It minimizes the sum of squared differences between observed and predicted values.\n- **R^2 (Coefficient of Determination):** a statistical measure that represents the proportion of the variance for a dependent variable that\'s explained by an independent variable in a regression model. It indicates goodness of fit.\n- **Polynomial Regression:** a form of regression analysis in which the relationship between the independent variable x and the dependent variable y is modeled as an nth degree polynomial in x.\n- **Gaussian Elimination:** an algorithm for solving systems of linear equations.\n- **Overfitting:** a modeling error that occurs when a function is too closely fit to a limited set of data points, capturing noise instead of the underlying trend.\n- **Residuals:** the difference between the observed value and the estimated value of the quantity of interest.\n- **List Comprehension:** syntactic construct available in some programming languages for creating a list based on existing lists.\n- **Generator Expression:** an expression that returns a generator object, useful for memory-efficient iteration.\n- **Lambda:** an anonymous inline function consisting of a single expression.\n- **Tuple Unpacking:** assigning elements of a tuple to multiple variables in a single statement.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **sum:** A built-in Python function.\n- **len:** A built-in Python function.\n- **range:** A built-in Python type/function.\n- **zip:** A built-in Python function.\n- **enumerate:** A built-in Python function.\n- **random.seed:** A method from the random module.\n- **random.gauss:** A method from the random module.\n- **math.sqrt:** A method from the math module.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'Trace fitting a line to noisy data: we generate points `(xs, ys)` with an underlying true trend `y=2x`. We compute the mathematical **slope** `m` and **intercept** `b` directly using the Ordinary Least Squares formulas, isolating the best fit. We verify this fit by extracting the **R^2** score, computing the proportion of variance we successfully explained. When the data curves, we escalate to **polynomial regression**, computing higher-degree equations via Gaussian elimination, but carefully avoid **overfitting** so predictions at new points like `x=10` remain sane. Finally, we analyze the **residuals**, ensuring the leftover differences center around 0 and match the expected noise — proving that our model captured the signal and nothing but the signal.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 42: Curve Fitting',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Curve Fitting',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Simple linear regression from scratch',
              prose: [
                'When we have a scatter plot of data points showing a general trend, how do we find the exact straight line that best represents that trend? - If you were to draw a line by eye, what criteria would you use to decide if it\'s the "best" fit? - How could you mathematically penalize a line for being too far away from the points? - Given that errors can be both positive (point above line) and negative (point below line), how do you prevent them from canceling each other out?',
                'Output predicted confidently: `m=2.0, b=0.0`. Output correctly proves how to compute OLS by hand. This is called **Ordinary Least Squares (OLS)**.'
              ],
              typeIt: true,
              solution: 'xs = [1, 2, 3]\nys = [2, 4, 6]\nmean_x = sum(xs) / 3  # 2.0\nmean_y = sum(ys) / 3  # 4.0\nnumerator = sum((xs[i] - mean_x) * (ys[i] - mean_y) for i in range(3)) # 2\ndenominator = sum((x - mean_x)**2 for x in xs) # 2\nm = numerator / denominator # 1.0\nb = mean_y - m * mean_x # 2.0\nprint(f"m={m}, b={b}")',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Simple linear regression from scratch — applied in a real function',
              prose: [
                '## How the Code Works',
                '- **`def linear_regression(xs, ys):`**: Defines our function taking two parallel lists of data.\n- **`n = len(xs)`**: Extracts the count of elements.\n- **`mean_x = sum(xs) / n`**: Computes the arithmetic average of the `x` coordinates.\n- **`mean_y = sum(ys) / n`**: Computes the arithmetic average of the `y` coordinates.\n- **`numerator = ...`**: Evaluates the covariance term between `xs` and `ys`.\n- **`sum(...)`**: Aggregates the generator expression over all points.\n- **`(xs[i] - mean_x)`**: The deviation of point `i`\'s x-value from the mean.\n- **`* (ys[i] - mean_y)`**: Multiplied by the y deviation.\n- **`for i in range(n)`**: Loops over every valid index.\n- **`denominator = ...`**: Evaluates the variance term of `xs`.\n- **`(x - mean_x)**2`**: Squares the deviation of `x` to enforce a positive penalty.\n- **`m = numerator / denominator`**: Derives the slope parameter.\n- **`b = mean_y - m * mean_x`**: Computes the y-intercept such that the line passes through the centroid `(mean_x, mean_y)`.\n- **`return m, b`**: Returns the packed tuple of parameters.',
                '**Expected behavior.** Predicted confidently: ``` y = 2.00x + 0.00 Noisy fit: y = 2.038x + -0.125 ```',
                '**CS lens.** This is **Closed-Form Optimization**. Rather than guessing and adjusting iteratively (like Gradient Descent), we use a direct mathematical formula that guarantees the exact global minimum of squared errors in one step. It appears in: 1. Signal processing algorithms for trend removal. 2. Kalman filters for state estimation. 3. Computer graphics for bounding box fitting.',
                '**SE lens.** **Design Principle:** Separation of concerns. Alternative not chosen: We could have returned a prediction function directly rather than raw parameters. Real tradeoff: Returning raw `m` and `b` forces the caller to write their own `mx+b` logic, but allows them to inspect, save, and analyze the raw parameters.'
              ],
              typeIt: true,
              solution: 'import math\nimport random\n\ndef linear_regression(xs, ys):\n    \'\'\'Returns (slope m, intercept b) for best-fit line y = mx + b.\n       Uses ordinary least squares (OLS) closed-form solution.\'\'\'\n    n = len(xs)\n    mean_x = sum(xs) / n\n    mean_y = sum(ys) / n\n    # Numerator: sum of (xi - mean_x)(yi - mean_y)\n    numerator = sum((xs[i] - mean_x) * (ys[i] - mean_y) for i in range(n))\n    # Denominator: sum of (xi - mean_x)^2\n    denominator = sum((x - mean_x)**2 for x in xs)\n    m = numerator / denominator\n    b = mean_y - m * mean_x\n    return m, b\n\n# Perfect linear data:\nxs = [1, 2, 3, 4, 5]\nys = [2, 4, 6, 8, 10]   # y = 2x\nm, b = linear_regression(xs, ys)\nprint(f\'y = {m:.2f}x + {b:.2f}\')  # y = 2.00x + 0.00\n\n# Noisy linear data:\nrandom.seed(42)\nxs2 = list(range(1, 21))\nys2 = [2*x + random.gauss(0, 2) for x in xs2]  # y = 2x + noise\nm2, b2 = linear_regression(xs2, ys2)\nprint(f\'Noisy fit: y = {m2:.3f}x + {b2:.3f}\')   # approximately y = 2x',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'R^2: measuring goodness of fit',
              prose: [
                'Once we compute a line, how do we assign a grade (like a percentage) to how accurate it is? - If the line is perfectly accurate, what is the variance left over? - If we didn\'t use a line at all and just guessed the mean every time, what is our baseline error?',
                'Output predicted confidently: `8.0`. This proves we can compute the baseline total variance of a dataset before any modeling. This forms the basis of **R^2**.'
              ],
              typeIt: true,
              solution: 'ys = [2, 4, 6]\nmean_y = sum(ys) / 3\nss_tot = sum((y - mean_y)**2 for y in ys) # (2-4)^2 + (4-4)^2 + (6-4)^2 = 8\nprint(ss_tot)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'R^2: measuring goodness of fit — applied in a real function',
              prose: [
                '## How the Code Works',
                '- **`def r_squared(xs, ys, m, b):`**: Defines a function accepting the data and the model parameters.\n- **`mean_y = sum(ys) / len(ys)`**: Computes the baseline average y-value.\n- **`ss_res = ...`**: Evaluates the sum of squares of the residuals (the errors).\n- **`sum(...)`**: Aggregates the generator expression.\n- **`(y - (m*x + b))`**: Computes the residual difference between the true `y` and the predicted `mx + b`.\n- **`**2`**: Squares the error.\n- **`for x, y in zip(xs, ys)`**: Iterates over matching pairs of x and y simultaneously.\n- **`ss_tot = ...`**: Evaluates the total baseline sum of squares.\n- **`(y - mean_y)**2`**: Squares the deviation from the baseline mean.\n- **`return 1 - ss_res / ss_tot`**: Computes the R^2 score by subtracting the proportion of unexplained variance from 1.',
                '**Expected behavior.** Predicted confidently: ``` Perfect R^2: 1.0000 Noisy R^2: 0.9954 Random R^2: 0.0512 ```',
                '**CS lens.** This is a **Normalized Metric**. Instead of raw squared errors, which depend heavily on the scale and amount of data, R^2 provides a scale-free score (usually 0 to 1). It appears in: 1. Data science model evaluation (e.g., scikit-learn). 2. Financial portfolio performance tracking. 3. System throughput efficiency percentages.',
                '**SE lens.** **Design Principle:** Pure Functions. Alternative not chosen: We could have put R^2 directly inside the regression function. Real tradeoff: Keeping R^2 separate means we can compute R^2 for *any* arbitrary line `m,b` (even a manually guessed one), rather than coupling it strictly to the OLS optimization step.'
              ],
              typeIt: true,
              solution: 'def r_squared(xs, ys, m, b):\n    \'\'\'R^2 (coefficient of determination): fraction of variance explained by the model.\n       R^2 = 1 - SS_res / SS_tot\n       SS_res: sum of squared residuals (actual - predicted)^2\n       SS_tot: total variance (actual - mean)^2\n       R^2 = 1: perfect fit. R^2 = 0: model explains nothing. R^2 < 0: worse than mean.\n    \'\'\'\n    mean_y = sum(ys) / len(ys)\n    ss_res = sum((y - (m*x + b))**2 for x, y in zip(xs, ys))\n    ss_tot = sum((y - mean_y)**2 for y in ys)\n    return 1 - ss_res / ss_tot\n\nxs = [1,2,3,4,5]\nys_perfect = [2,4,6,8,10]\nm, b = linear_regression(xs, ys_perfect)\nprint(f\'Perfect R^2: {r_squared(xs, ys_perfect, m, b):.4f}\')  # 1.0000\n\nys_noisy = [2.1, 3.9, 6.3, 7.8, 10.2]\nm2, b2 = linear_regression(xs, ys_noisy)\nprint(f\'Noisy R^2: {r_squared(xs, ys_noisy, m2, b2):.4f}\')    # ~0.999\n\nys_random = [5, 1, 8, 2, 9]  # random, no trend\nm3, b3 = linear_regression(xs, ys_random)\nprint(f\'Random R^2: {r_squared(xs, ys_random, m3, b3):.4f}\')   # low or negative',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Polynomial regression — degree d',
              prose: [
                'What if our data clearly follows a curve, like a parabola? - A straight line will have a terrible R^2 score. How can we fit a polynomial instead? - If `y = mx + b` is 2 parameters, how do we generalize to a matrix system for `d` parameters?',
                'Output predicted confidently: `17`. This proves how to evaluate any arbitrary polynomial sequentially. We call this **Polynomial Evaluation**.'
              ],
              typeIt: true,
              solution: 'x = 2\ncoeffs = [1, 2, 3] # 1 + 2x + 3x^2\ny = sum(c * x**i for i, c in enumerate(coeffs))\nprint(y) # 1 + 2(2) + 3(4) = 1 + 4 + 12 = 17',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Polynomial regression — degree d — applied in a real function',
              prose: [
                '## How the Code Works',
                '- **`def poly_eval(coeffs, x):`**: Evaluates the resulting polynomial.\n- **`sum(c * x**i ...)`**: Computes the term for the given coefficient and power.\n- **`for i, c in enumerate(coeffs)`**: Provides both the index `i` (power) and `c` (coefficient) concurrently.\n- **`def least_squares_poly(...)`**: Constructs matrices.\n- **`d = degree + 1`**: Because a degree 2 polynomial has 3 coefficients (intercept, x, x^2).\n- **`A = [[xs[i]**j ...]]`**: Uses nested list comprehensions to build the Vandermonde matrix.\n- **`ATA = ...`**: Computes the matrix dot product of A-transpose and A.\n- **`ATy = ...`**: Computes the vector dot product of A-transpose and y.\n- **`def gauss_solve(A, b):`**: Solves the linear system Ax=b.\n- **`M = [A[i][:] + [b[i]] ...]`**: Concatenates matrix A and vector b into an augmented matrix.\n- **`pivot = max(..., key=lambda r: abs(M[r][col]))`**: Finds the row with the largest absolute value in the current column to minimize division errors.\n- **`M[col], M[pivot] = M[pivot], M[col]`**: Swaps the current row with the pivot row.\n- **`factor = M[row][col] / M[col][col]`**: Computes the multiplier to eliminate the variable.\n- **`M[row] = [...]`**: Subtracts the scaled row.\n- **`x = [0]*n`**: Initializes the solution vector.\n- **`for i in range(n-1, -1, -1):`**: Iterates backward for back-substitution.\n- **`x[i] = ...`**: Solves for the variable using already-found variables.',
                '**Expected behavior.** Predicted confidently: ``` Fitted: 1.12 + 1.95x + 1.02x^2 ```',
                '**CS lens.** This is **Linear Algebra for Optimization**. The normal equations `A^T A x = A^T y` transform an overdetermined system (more points than parameters) into a solvable square system. It appears in: 1. 3D physics engines resolving multiple conflicting collision constraints. 2. GPS receivers triangulating position from multiple noisy satellites. 3. Neural network batch gradient updates (as a dense matrix operation).',
                '**SE lens.** **Design Principle:** Algorithms as Modules. Alternative not chosen: We could have hardcoded matrix inverses for up to 3 dimensions. Real tradeoff: Implementing a generalized Gaussian solver is significantly more initial complexity, but scales automatically to any polynomial degree without changing a single line of logic.'
              ],
              typeIt: true,
              solution: 'def poly_eval(coeffs, x):\n    \'\'\'Evaluate polynomial with coeffs [a0, a1, a2, ...] at x.\n       y = a0 + a1*x + a2*x^2 + ...\'\'\'\n    return sum(c * x**i for i, c in enumerate(coeffs))\n\ndef least_squares_poly(xs, ys, degree):\n    \'\'\'Fit polynomial of given degree to (xs, ys) data.\n       Returns coefficients [a0, a1, ..., a_degree].\n       Uses normal equations: A^T A c = A^T y solved via Gaussian elimination.\'\'\'\n    n = len(xs)\n    d = degree + 1  # number of coefficients\n\n    # Build Vandermonde-like matrix A (n x d)\n    A = [[xs[i]**j for j in range(d)] for i in range(n)]\n\n    # Compute A^T A (d x d matrix)\n    ATA = [[sum(A[k][r]*A[k][c] for k in range(n)) for c in range(d)] for r in range(d)]\n    # Compute A^T y (d x 1 vector)\n    ATy = [sum(A[k][r]*ys[k] for k in range(n)) for r in range(d)]\n\n    return gauss_solve(ATA, ATy)\n\ndef gauss_solve(A, b):\n    \'\'\'Solve Ax=b via Gaussian elimination with back-substitution.\'\'\'\n    n = len(b)\n    M = [A[i][:] + [b[i]] for i in range(n)]\n    for col in range(n):\n        pivot = max(range(col, n), key=lambda r: abs(M[r][col]))\n        M[col], M[pivot] = M[pivot], M[col]\n        for row in range(col+1, n):\n            if M[col][col] != 0:\n                factor = M[row][col] / M[col][col]\n                M[row] = [M[row][j] - factor*M[col][j] for j in range(n+1)]\n    x = [0]*n\n    for i in range(n-1, -1, -1):\n        x[i] = (M[i][n] - sum(M[i][j]*x[j] for j in range(i+1, n))) / M[i][i]\n    return x\n\nimport random; random.seed(0)\nxs = [i for i in range(10)]\nys = [x**2 + 2*x + 1 + random.gauss(0,3) for x in xs]  # y = x^2 + 2x + 1 + noise\ncoeffs = least_squares_poly(xs, ys, degree=2)\nprint(f\'Fitted: {coeffs[0]:.2f} + {coeffs[1]:.2f}x + {coeffs[2]:.2f}x^2\')\n# ~1 + 2x + x^2',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Overfitting — the polynomial degree trap',
              prose: [
                'If we use a degree-9 polynomial for 10 data points, we can achieve an R^2 of 1.0. Why is this bad? - If the model hits every single point perfectly, including the random noise, what happens between the points? - How will this model perform on a completely new point it has never seen?',
                'Output predicted confidently: Exact interpolation. This proves that having as many parameters as data points forces the model to memorize the data exactly, including any errors. This is called **Overfitting**.'
              ],
              typeIt: true,
              solution: '# Imagine fitting 2 points with a 1st degree polynomial (a line).\nxs = [1, 2]\nys = [5, 10]\n# 2 points uniquely define a line. R^2 is 1.0.\n# If we add noise, the line shifts entirely to accommodate it.',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Overfitting — the polynomial degree trap — applied in a real function',
              prose: [
                '## How the Code Works',
                '- **`def poly_r_squared(...)`**: Equivalent to our linear R^2, but adapted for polynomial coefficients.\n- **`poly_eval(coeffs, x)`**: Calls our evaluator instead of hardcoded `mx + b`.\n- **`for deg in [1, 3, 5, 9]:`**: Iterates through progressively more complex models.\n- **`least_squares_poly(xs, ys, degree=deg)`**: Trains a model for the given complexity.\n- **`x_new = 11`**: Defines a point strictly outside the domain `1..10` it was trained on.\n- **`y_pred = poly_eval(coeffs, x_new)`**: Asks the model to extrapolate.',
                '**Expected behavior.** Predicted confidently: ``` degree=1: train_R2=0.8123, predict(x=11)=23.45 vs true~22.12 degree=9: train_R2=1.0000, predict(x=11)=14523.41 vs true~20.45 ```',
                '**CS lens.** This is **The Bias-Variance Tradeoff**. A simple model (low degree) has high bias (cannot capture complex curves). A complex model (degree 9) has high variance (wildly fluctuates based on noise). It appears in: 1. Deep learning when neural networks memorize the training set. 2. Compression algorithms where a dictionary fits one file perfectly but compresses others terribly. 3. Cache optimization where tuning perfectly to past queries ruins future performance.',
                '**SE lens.** **Design Principle:** Generalization over Specialization. Alternative not chosen: We could have automatically picked the degree with the highest training R^2. Real tradeoff: Selecting models solely on training metrics inevitably selects overfitted models. Good design mandates testing against unseen data, prioritizing robust generalization.'
              ],
              typeIt: true,
              solution: 'import random\n\ndef poly_r_squared(xs, ys, coeffs):\n    mean_y = sum(ys)/len(ys)\n    ss_res = sum((y - poly_eval(coeffs, x))**2 for x,y in zip(xs,ys))\n    ss_tot = sum((y - mean_y)**2 for y in ys)\n    return 1 - ss_res/ss_tot\n\nrandom.seed(42)\nxs = list(range(1, 11))\nys = [2*x + random.gauss(0, 3) for x in xs]  # true: linear + noise\n\n# Train R^2 for increasing degrees:\nfor deg in [1, 3, 5, 9]:\n    coeffs = least_squares_poly(xs, ys, degree=deg)\n    train_r2 = poly_r_squared(xs, ys, coeffs)\n    # Predict on new point (out of training range):\n    x_new = 11\n    y_new = 2*11 + random.gauss(0, 3)\n    y_pred = poly_eval(coeffs, x_new)\n    print(f\'degree={deg}: train_R2={train_r2:.4f}, predict(x=11)={y_pred:.2f} vs true~{y_new:.2f}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Making predictions and residual analysis',
              prose: [
                'If a model has a good R^2, does that mean it\'s definitely the right model for the data? - If the true relationship is a curve, but we fit a line, what pattern will the errors (residuals) show? - How can we verify that the noise leftover is truly random?',
                'Output predicted confidently: `[1, -1, -1]`. This proves we can extract the individual errors per point. This is called **Residual Analysis**.'
              ],
              typeIt: true,
              solution: 'actual = [10, 15, 20]\npredicted = [9, 16, 21]\nres = [a - p for a, p in zip(actual, predicted)]\nprint(res)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Making predictions and residual analysis — applied in a real function',
              prose: [
                '## How the Code Works',
                '- **`def predict(m, b, x):`**: Wraps the raw mathematical evaluation of the line.\n- **`m * x + b`**: The core linear model equation.\n- **`def residuals(xs, ys, m, b):`**: Computes the error vector.\n- **`[y - predict(m, b, x) ...]`**: A list comprehension generating the differences.\n- **`res = residuals(xs, ys, m, b)`**: Calls the diagnostic tool.\n- **`mean_res = sum(res)/len(res)`**: Verifies that the OLS fit successfully zeroed out the average error.\n- **`math.sqrt(...)`**: Takes the square root of the residual variance to find standard deviation.\n- **`sum(r**2 for r in res)`**: Sums the squares of the raw errors.',
                '**Expected behavior.** Predicted confidently: ``` Model: y = 2.951x + 2.345 R^2: 0.9421 Predict x=5: y=17.10 Predict x=10: y=31.86 Predict x=20: y=61.37 Residual mean: 0.0000 (should be ~0) Residual std: 3.9213 (should be ~4 = noise std) ```',
                '**CS lens.** This is **Diagnostic Profiling**. In any complex system, observing the *errors* often reveals more about the system\'s structural flaws than observing the successes. It appears in: 1. TCP/IP network monitoring tracking packet loss signatures. 2. Database query analyzers finding systematic index misses. 3. ML feature engineering, where patterns in residuals indicate missing variables.',
                '**SE lens.** **Design Principle:** Observability. Alternative not chosen: We could have relied only on the single R^2 scalar. Real tradeoff: A single scalar hides underlying structure. Providing tools to extract the vector of residuals allows downstream developers to plot them and visually verify that assumptions (like random noise) actually hold.'
              ],
              typeIt: true,
              solution: 'def predict(m, b, x):\n    return m * x + b\n\ndef residuals(xs, ys, m, b):\n    return [y - predict(m, b, x) for x, y in zip(xs, ys)]\n\nimport random; random.seed(1)\nxs = list(range(1, 16))\nys = [3*x + 2 + random.gauss(0, 4) for x in xs]\nm, b = linear_regression(xs, ys)\n\nprint(f\'Model: y = {m:.3f}x + {b:.3f}\')\nprint(f\'R^2: {r_squared(xs, ys, m, b):.4f}\')\n\n# Predictions:\nfor x_pred in [5, 10, 20]:\n    y_pred = predict(m, b, x_pred)\n    print(f\'Predict x={x_pred}: y={y_pred:.2f}\')\n\n# Residual stats (should be ~N(0, sigma)):\nres = residuals(xs, ys, m, b)\nmean_res = sum(res)/len(res)\nstd_res = math.sqrt(sum(r**2 for r in res)/len(res))\nprint(f\'Residual mean: {mean_res:.4f} (should be ~0)\')\nprint(f\'Residual std:  {std_res:.4f} (should be ~4 = noise std)\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
          ],
        },
      },
    ],
  },

  math: { prose: [], callouts: [], visualizations: [] },

  rigor: { prose: [], callouts: [], visualizations: [] },

  examples: [],
  challenges: [],
  semantics: { core: [] },

  spiral: {
    recoveryPoints: [
      'If a cell\'s behavior surprises you, isolate the one line that surprised you in its own cell and experiment with small variations.',
      'Read the reference code above the editor line by line and predict what it does before you type it in — that catches most mistakes before you even run anything.',
    ],
    futureLinks: [
      'Next lesson: Introduction to Machine Learning.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Polynomial Regression"?',
      options: [
        'a form of regression analysis in which the relationship between the independent variable x and the dependent variable y is modeled as an nth degree polynomial in x.',
        'an expression that returns a generator object, useful for memory-efficient iteration.',
        'a modeling error that occurs when a function is too closely fit to a limited set of data points, capturing noise instead of the underlying trend.'
      ],
      correct: 0,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Gaussian Elimination"?',
      options: [
        'an expression that returns a generator object, useful for memory-efficient iteration.',
        'an algorithm for solving systems of linear equations.',
        'a statistical measure that represents the proportion of the variance for a dependent variable that\'s explained by an independent variable in a regression model. It indicates goodness of fit.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Regression"?',
      options: [
        'a statistical process for estimating the relationships among variables, specifically focusing on the relationship between a dependent variable and one or more independent variables. It exists to predict unknown values based on known data.',
        'the difference between the observed value and the estimated value of the quantity of interest.',
        'a form of regression analysis in which the relationship between the independent variable x and the dependent variable y is modeled as an nth degree polynomial in x.'
      ],
      correct: 0,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "R^2 (Coefficient of Determination)"?',
      options: [
        'a statistical process for estimating the relationships among variables, specifically focusing on the relationship between a dependent variable and one or more independent variables. It exists to predict unknown values based on known data.',
        'a modeling error that occurs when a function is too closely fit to a limited set of data points, capturing noise instead of the underlying trend.',
        'a statistical measure that represents the proportion of the variance for a dependent variable that\'s explained by an independent variable in a regression model. It indicates goodness of fit.'
      ],
      correct: 2,
    },
  ],

  mentalModel: [
    '**Regression** — a statistical process for estimating the relationships among variables, specifically focusing on the relationship between a dependent variable and one or more independent variables. It exists to predict unknown values based on known data.',
    '**Ordinary Least Squares (OLS)** — a type of linear least squares method for estimating the unknown parameters in a linear regression model. It minimizes the sum of squared differences between observed and predicted values.',
    '**R^2 (Coefficient of Determination)** — a statistical measure that represents the proportion of the variance for a dependent variable that\'s explained by an independent variable in a regression model. It indicates goodness of fit.',
    '**Polynomial Regression** — a form of regression analysis in which the relationship between the independent variable x and the dependent variable y is modeled as an nth degree polynomial in x.',
    '**Gaussian Elimination** — an algorithm for solving systems of linear equations.',
    '**Overfitting** — a modeling error that occurs when a function is too closely fit to a limited set of data points, capturing noise instead of the underlying trend.',
    '**Residuals** — the difference between the observed value and the estimated value of the quantity of interest.',
    '**List Comprehension** — syntactic construct available in some programming languages for creating a list based on existing lists.',
  ],

  checkpoints: ['read-intuition'],
}
