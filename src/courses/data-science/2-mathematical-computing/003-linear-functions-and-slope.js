export default {
  id:'b-03',slug:'linear-functions-and-slope',track:'B',order:3,
  title:'Linear Functions and Slope',subtitle:'The Simplest Relationship',
  tags:['linear','slope','intercept','residuals','least-squares'],
  prereqs:['b-02','a-08'],unlocks:['b-04','b-05','c-02'],
  hook:{question:'What does a rate of change look like — and how do you find it from data?',realWorldContext:'Linear relationships are the foundation of everything in data science. Linear regression, neural network layers, PCA — all are built from linear operations. Before you can understand any of them, you need an intuitive grasp of slope and intercept as physical concepts.'},
  intuition:{
    prose:['y = mx + b. **m** is slope: how much y changes per unit increase in x. **b** is intercept: the value of y when x is 0. These are not just formula elements — they have physical meaning in every application.',
      'A **residual** is actual minus predicted: positive when the point is above the line, negative when below. A fitted line describes the **mean relationship** — the average y you expect at each x. The residuals describe what the line leaves out: how far and in what pattern individual points scatter around that average. These are separate questions. If residuals show a curve or trend, a straight line is the wrong shape for the mean. If residuals only grow wider as x grows, the line may still describe the mean well while the scatter (the error distribution) changes with x.',
      'The **least squares** line minimizes the sum of squared residuals. When the x values are not all the same, there is exactly one such line. If every x is identical (say all x = 3), the slope is undefined: every line through the mean point (3, mean of y) has the same squared error, so there is no unique answer. Least squares minimizes squared error *on the data you fitted*; it does not promise the smallest error on new data. The formula comes from setting the derivative of total squared error to zero, which Lesson D03 derives step by step.'],
    callouts:[{type:'important',title:'Slope as Rate',body:`If x is time (hours) and y is distance (km):
  slope = km per hour = speed

If x is study hours and y is test score:
  slope = score points gained per hour of study

The slope always has units: y-units per x-unit.`}],
    visualizations:[{id:'PythonNotebook',title:'Linear Functions and Fitting',props:{initialCells:[
      {id:1,cellTitle:'Stage 1 — Slope and Intercept',prose:'Explore how m and b change the line.',instructions:'Run. Then change m and b and observe the effect.',code:`from opencalc import Figure

m, b = 2, 1
fig = Figure(xmin=-3, xmax=3, ymin=-5, ymax=8, title=f"y = {m}x + {b}")
fig.grid().axes()
fig.plot(lambda x: m*x + b, color="blue", label=f"m={m}, b={b}")
fig.hline(0, color="hint")
fig.show()`},
      {id:2,cellTitle:'Stage 2 — Slope from Two Points',prose:'Slope = (y2-y1)/(x2-x1). Rise over run.',instructions:'Run. Then change the two points and observe the slope change.',code:`from opencalc import Figure

x1, y1 = 1, 3
x2, y2 = 4, 9
m = (y2 - y1) / (x2 - x1)
b = y1 - m * x1
print(f"slope = {m:.2f}, intercept = {b:.2f}")

fig = Figure(xmin=-1, xmax=6, ymin=-1, ymax=12)
fig.grid().axes()
fig.plot(lambda x: m*x+b, color="blue")
fig.point([x1,y1], color="amber", label="P1")
fig.point([x2,y2], color="amber", label="P2")
fig.show()`},
      {id:3,cellTitle:'Stage 3 — Residuals',prose:'Residuals are the vertical gap between data points and the line.',instructions:'Run. The dashed lines are residuals. Large residuals = poor fit.',code:`from opencalc import Figure
import numpy as np

xs = np.array([1,2,3,4,5])
ys = np.array([2.1, 3.9, 6.2, 7.8, 10.1])
m, b = 2, 0  # try to fit by eye

fig = Figure(xmin=0, xmax=6, ymin=0, ymax=12)
fig.grid().axes()
fig.scatter(xs.tolist(), ys.tolist(), color="blue")
fig.plot(lambda x: m*x+b, color="amber")
for xi, yi in zip(xs, ys):
    predicted = m*xi + b
    fig.line([xi,yi],[xi,predicted],color="red",dashed=True)
fig.show()`},
      {id:4,cellTitle:'Stage 4 — Least Squares with NumPy',prose:'np.polyfit() finds the best-fit line by minimizing squared residuals.',instructions:'Run. Because the x values vary, there is exactly one line minimizing total squared error on these points, and polyfit finds it. Interpret the slope in words: y units per one-unit increase in x.',code:`import numpy as np
from opencalc import Figure

xs = np.array([1.0,2,3,4,5,6,7,8])
ys = np.array([2.1,3.8,5.9,8.2,9.8,12.1,14.3,16.0])

coeffs = np.polyfit(xs, ys, 1)  # degree 1 = linear
m, b = coeffs
print(f"Best fit: y = {m:.3f}x + {b:.3f}")

fig = Figure(xmin=0, xmax=9, ymin=0, ymax=18)
fig.grid().axes()
fig.scatter(xs.tolist(), ys.tolist(), color="blue")
fig.plot(lambda x: m*x+b, color="amber", label=f"y={m:.2f}x+{b:.2f}")
fig.show()`},
      {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — Manual Least Squares',difficulty:'hard',
        prompt:'Implement least squares WITHOUT using np.polyfit. Use the normal equations: m = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²), b = (Σy - m*Σx) / n. Store m and b.',
        instructions:`1. Compute the sums: sum_x, sum_y, sum_xy, sum_x2.
2. Apply the formulas.
3. Verify your m and b match np.polyfit.`,
        code:`import numpy as np

xs = np.array([1.0,2,3,4,5])
ys = np.array([2.0,4.1,5.9,8.2,10.0])
n = len(xs)
# Your code here
m = 
b = 
print(f"m={m:.4f}, b={b:.4f}")
print(f"polyfit: {np.polyfit(xs,ys,1)}")`,
        testCode:`
import numpy as np
xs=np.array([1.0,2,3,4,5])
ys=np.array([2.0,4.1,5.9,8.2,10.0])
expected_m,expected_b=np.polyfit(xs,ys,1)
if abs(m-expected_m)>0.01: raise ValueError(f"m should be {expected_m:.4f}, got {m}")
if abs(b-expected_b)>0.01: raise ValueError(f"b should be {expected_b:.4f}, got {b}")
res=f"SUCCESS: m={m:.4f}, b={b:.4f}. Normal equations implemented from scratch."
res
`,hint:`sum_x=np.sum(xs);sum_y=np.sum(ys);sum_xy=np.sum(xs*ys);sum_x2=np.sum(xs**2)
m=(n*sum_xy-sum_x*sum_y)/(n*sum_x2-sum_x**2)
b=(sum_y-m*sum_x)/n`},
    ]}}],
  },
  mentalModel:['y=mx+b: m=slope (rate of change), b=intercept (y when x=0).','Slope = (y2-y1)/(x2-x1). Units: y-units per x-unit.','Residual = actual - predicted (sign tells you above or below). A curved residual pattern means the line is the wrong shape; a changing spread is about the errors, not necessarily the mean.','Least squares: find m,b minimizing sum of squared residuals — unique only when the x values vary.','np.polyfit(xs,ys,1) gives [m,b] of best-fit line.'],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'A linear model for house prices: price = 200 × sqft + 50000. What does the slope 200 represent?',
      options: [
        'The average house price across all data points',
        'Each additional square foot of area is associated with $200 more in price — the slope is the rate of change: price increases by $200 for every 1 sqft increase in area',
        'The price of a house with 200 square feet',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'A residual is (actual − predicted). What do large residuals indicate?',
      options: [
        'The model makes large predictions for large inputs',
        'The model\'s predictions are far from the actual values for those data points — either the linear model is wrong (nonlinear relationship), there are outliers, or there is high variance unexplained by the predictor',
        'The slope is too large and needs to be reduced',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Why does least squares minimize the SUM OF SQUARED residuals rather than the sum of absolute residuals?',
      options: [
        'Squaring avoids negative signs which would make the minimization algorithm fail',
        'Squaring penalizes large errors disproportionately (a 2x error contributes 4x to the sum) and produces a smooth, differentiable objective — setting the derivative to zero gives a closed-form formula for m and b, which has a single answer whenever the x values are not all equal',
        'Absolute value minimization is NP-hard and cannot be solved efficiently',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'The slope formula is (y₂ − y₁)/(x₂ − x₁). What are the units of slope for a dataset where y is in $ and x is in years?',
      options: [
        '$ × years — slope multiplies the two units',
        '$/year — rise over run: the numerator is in $ and denominator is in years, so slope is in $/year (dollars per year)',
        'dimensionless — ratios always cancel units',
      ],
      correct: 1,
    },
  ],
}