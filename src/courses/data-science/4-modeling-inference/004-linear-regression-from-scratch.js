export default {
  id:'d-03',slug:'linear-regression-from-scratch',track:'D',order:3,
  title:'Linear Regression from Scratch',subtitle:'Why That Line?',
  tags:['regression','least-squares','normal-equations','R-squared','residuals'],
  prereqs:['b-03','b-07','d-02'],unlocks:['d-04','d-05'],
  hook:{question:'How do you fit a line to data — and why is THAT the best line?',realWorldContext:'Linear regression is the foundation of all supervised ML. Neural networks are stacked linear regressions with nonlinearities. Understanding the math — why least squares, what R² means, what residuals tell you — makes every more complex model comprehensible.'},
  intuition:{
    prose:[
      'Linear regression finds the line y=mx+b that minimizes the **sum of squared residuals** (SSR). Squared residuals penalize large errors more than small ones. Put a column of ones and a column of x values into a **design matrix** X, and the coefficients into β = [b, m]. Setting the derivative of SSR with respect to β to zero gives the **normal equations**: (XᵀX)β = Xᵀy — a small linear system, which is where Track B\'s linear algebra pays off. You will often see the answer written β=(XᵀX)⁻¹Xᵀy. That is a correct *formula*, but not how to *compute* it: forming an explicit inverse is slower and loses accuracy when the columns of X are nearly redundant (**ill-conditioned**). In code, use `np.linalg.lstsq(X, y)`, which solves the least-squares problem directly and stably. There is a unique solution only when X has full column **rank** — for a line, when the x values are not all identical.',
      '**R²** (coefficient of determination) is the fraction of variance in y explained by the model. R²=1: perfect fit. R²=0: model is no better than predicting the mean. R² can be negative if the model is worse than the mean.',
      '**Residual analysis** checks the model\'s assumptions. Plot residuals vs predicted values and ask two separate questions. Is the **centre** of the residuals near zero everywhere? A curve means the straight line is the wrong shape for the mean, so the model is wrong. Is the **spread** constant? A funnel (spread growing with the prediction, called heteroscedasticity) does not by itself mean the fitted mean is wrong — the line can still track the average well — but the errors are larger in some regions, so uncertainty estimates that assume constant spread will be misleading.',
    ],
    callouts:[{type:'important',title:'R² Interpretation',body:'R² = 1 - SS_residual/SS_total\n    = fraction of variance explained\n\nR² = 0.85 means the model explains 85% of the variation in y.\nThe remaining 15% is unexplained — due to noise or missing features.\n\nHigh R² on training data does not mean good predictions.\nAlways evaluate on held-out test data.'}],
    visualizations:[{id:'PythonNotebook',title:'Linear Regression',props:{initialCells:[
      {id:1,cellTitle:'Stage 1 — What We Are Minimizing',
       prose:'The residual for each point is actual - predicted. We minimize the sum of squared residuals.',
       instructions:'Run. The red dashed lines are residuals. We want to find the line that makes these as small as possible.',
       code:'from opencalc import Figure\nimport numpy as np\nxs = np.array([1.0,2,3,4,5])\nys = np.array([2.1,3.9,6.2,7.8,10.1])\nm,b = 2, 0  # try adjusting these\nssr = sum((y-(m*x+b))**2 for x,y in zip(xs,ys))\nfig = Figure(xmin=0,xmax=6,ymin=0,ymax=12)\nfig.grid().axes()\nfig.scatter(xs.tolist(),ys.tolist(),color="blue")\nfig.plot(lambda x: m*x+b, color="amber", label=f"y={m}x+{b}")\nfor xi,yi in zip(xs,ys):\n    fig.line([xi,yi],[xi,m*xi+b],color="red",dashed=True)\nfig.text([3,1],f"SSR={ssr:.2f}",color="red")\nfig.show()',output:'',status:'idle'},
      {id:2,cellTitle:'Stage 2 — Normal Equations and a Stable Solver',
       prose:'The normal equations (XᵀX)β = Xᵀy are a 2×2 linear system here. np.linalg.solve solves that system without forming an inverse. np.linalg.lstsq goes further and works on X directly, which is the stable choice in practice; it also reports the rank of X. The last part shows the rank problem: if every x is 3, the column of x values is just 3 × the column of ones, X has rank 1 instead of 2, XᵀX is singular, and no unique line exists.',
       instructions:'Run. Verify that all three methods give the same m and b (polyfit returns [m, b]; the others return [b, m]). Then read the rank-1 case: what does the error say, and why is there no single best line through points that all have x = 3?',
       code:'import numpy as np\nxs = np.array([1.0,2,3,4,5,6,7,8])\nys = np.array([2.1,3.8,5.9,8.2,9.8,12.1,14.3,16.0])\n# Design matrix: column of ones + x values\nX = np.column_stack([np.ones(len(xs)), xs])\n\n# Normal equations (XᵀX) β = Xᵀy — solve the system, do not invert\nbeta_ne = np.linalg.solve(X.T @ X, X.T @ ys)\n# Preferred in practice: least squares on X directly\nbeta, ssr, rank, sv = np.linalg.lstsq(X, ys, rcond=None)\nb, m = beta\nprint(f"lstsq:            y = {m:.4f}x + {b:.4f}")\nprint(f"normal equations: {beta_ne.round(4)}  (b, m)")\nprint(f"polyfit:          {np.polyfit(xs, ys, 1).round(4)}  (m, b)")\nprint(f"rank of X = {rank}, condition number = {np.linalg.cond(X):.1f}")\n\n# Rank problem: every x identical → no unique line\nX_bad = np.column_stack([np.ones(4), np.full(4, 3.0)])\nprint("rank of X_bad:", np.linalg.matrix_rank(X_bad))   # 1, not 2\ntry:\n    np.linalg.solve(X_bad.T @ X_bad, X_bad.T @ np.array([1.0, 2, 3, 4]))\nexcept np.linalg.LinAlgError as e:\n    print("normal equations fail:", e)',output:'',status:'idle'},
      {id:3,cellTitle:'Stage 3 — R² Explained',
       prose:'R² = 1 - SS_residual/SS_total. Fraction of variance explained.',
       instructions:'Run. A perfect fit has R²=1. The mean-only model has R²=0.',
       code:'import numpy as np\nxs = np.array([1.0,2,3,4,5,6,7,8])\nys = np.array([2.1,3.8,5.9,8.2,9.8,12.1,14.3,16.0])\nm,b = np.polyfit(xs,ys,1)\ny_pred = m*xs + b\nss_residual = np.sum((ys - y_pred)**2)\nss_total = np.sum((ys - np.mean(ys))**2)\nr2 = 1 - ss_residual/ss_total\nprint(f"SS_residual = {ss_residual:.4f}")\nprint(f"SS_total    = {ss_total:.4f}")\nprint(f"R²          = {r2:.4f}")  # should be close to 1',output:'',status:'idle'},
      {id:4,cellTitle:'Stage 4 — Residual Plot',
       prose:'Plot residuals vs predicted. Random scatter = good. Patterns = wrong model.',
       instructions:'Run. A curved residual pattern suggests we need a nonlinear model.',
       code:'from opencalc import Figure\nimport numpy as np\nnp.random.seed(42)\nxs = np.linspace(0,5,30)\nys = xs**2 + np.random.normal(0,1,30)  # actually quadratic\nm,b = np.polyfit(xs,ys,1)\nresiduals = ys - (m*xs+b)\nfig = Figure(xmin=0,xmax=25,ymin=-8,ymax=8,title="Residual plot — curve = wrong model")\nfig.grid().axes()\nfig.scatter((m*xs+b).tolist(),residuals.tolist(),color="blue",radius=3)\nfig.hline(0,color="amber")\nfig.show()',output:'',status:'idle'},
      {id:6,cellTitle:'Stage 4b — A Funnel Is Not a Curve',
       prose:'Here the true mean really is a straight line, y = 2x + 1, but the noise grows with x. The fit recovers slope and intercept close to the truth, and the residuals are centred on zero in every region — so the mean is fine. What changes is the spread: residuals in the right half are several times wider than in the left half. That is heteroscedasticity. It matters for uncertainty and for which predictions you can trust, not for whether a line is the right shape.',
       instructions:'Run. Compare the fitted m and b with the true 2 and 1. Then compare the mean and the standard deviation of residuals in each half. Which one changes a lot?',
       code:'import numpy as np\nrng = np.random.default_rng(3)\nxs = np.linspace(1, 10, 200)\nys = 2*xs + 1 + rng.normal(0, 0.3*xs)   # noise sd grows with x\nX = np.column_stack([np.ones_like(xs), xs])\n(b, m), *_ = np.linalg.lstsq(X, ys, rcond=None)\nres = ys - (m*xs + b)\nprint(f"fit: y = {m:.3f}x + {b:.3f}   (truth: y = 2x + 1)")\nleft, right = xs < 5.5, xs >= 5.5\nprint(f"left half:  residual mean {res[left].mean():+.3f}, sd {res[left].std():.3f}")\nprint(f"right half: residual mean {res[right].mean():+.3f}, sd {res[right].std():.3f}")',output:'',status:'idle'},
      {id:5,cellTitle:'Stage 5 — Sklearn Linear Regression',
       prose:'sklearn\'s LinearRegression solves the same least-squares problem with a stable least-squares solver (not an explicit inverse) behind a clean fit/predict API.',
       instructions:'Run. This is the API you will use in practice.',
       code:'import numpy as np\nfrom sklearn.linear_model import LinearRegression\nxs = np.array([1.0,2,3,4,5,6,7,8]).reshape(-1,1)\nys = np.array([2.1,3.8,5.9,8.2,9.8,12.1,14.3,16.0])\nmodel = LinearRegression()\nmodel.fit(xs, ys)\nprint(f"Coefficient: {model.coef_[0]:.4f}")\nprint(f"Intercept:   {model.intercept_:.4f}")\nprint(f"R²:          {model.score(xs, ys):.4f}")',output:'',status:'idle'},
      {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — Manual Normal Equations',
       difficulty:'hard',
       prompt:'Implement least squares WITHOUT np.polyfit or sklearn. Solve the normal equations (XᵀX)β = Xᵀy with np.linalg.solve (or use np.linalg.lstsq on X). Store the slope in m and intercept in b. Compute R² and store in r2.',
       instructions:'1. Build design matrix X (ones column + x values).\n2. beta = np.linalg.solve(X.T @ X, X.T @ ys) — no explicit inverse.\n3. b=beta[0], m=beta[1].\n4. Compute R² from residuals.',
       code:'import numpy as np\nxs = np.array([1.0,2,3,4,5])\nys = np.array([2.0,4.1,5.9,8.2,10.0])\n# Your implementation here\nm = \nb = \nr2 = \nprint(f"y = {m:.4f}x + {b:.4f}, R² = {r2:.4f}")',output:'',status:'idle',
       testCode:`
import numpy as np
xs=np.array([1.0,2,3,4,5]);ys=np.array([2.0,4.1,5.9,8.2,10.0])
em,eb=np.polyfit(xs,ys,1)
ypred=m*xs+b
er2=1-np.sum((ys-ypred)**2)/np.sum((ys-ys.mean())**2)
if abs(m-em)>0.01: raise ValueError(f"m should be {em:.4f}, got {m:.4f}")
if abs(b-eb)>0.01: raise ValueError(f"b should be {eb:.4f}, got {b:.4f}")
if abs(r2-er2)>0.01: raise ValueError(f"r2 should be {er2:.4f}, got {r2:.4f}")
res=f"SUCCESS: y={m:.4f}x+{b:.4f}, R²={r2:.4f}. Normal equations work."
res
`,hint:'X=np.column_stack([np.ones(len(xs)),xs])\nbeta=np.linalg.solve(X.T@X,X.T@ys)\nb,m=beta\nypred=m*xs+b\nr2=1-np.sum((ys-ypred)**2)/np.sum((ys-ys.mean())**2)'},
    ]}}],
  },
  mentalModel:[
    'Linear regression minimizes sum of squared residuals (not absolute errors).',
    'Normal equations: (XᵀX)β = Xᵀy. Compute with np.linalg.lstsq (or solve), not an explicit inverse. Unique only when X has full column rank.',
    'R² = 1 - SS_residual/SS_total = fraction of variance explained.',
    'Residual plot: a curve means the mean is the wrong shape; a funnel means the spread changes, which affects uncertainty but not necessarily the fitted mean.',
    'sklearn.LinearRegression() solves the same least-squares problem with a stable solver. model.score() = R².',
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Linear regression minimizes the sum of SQUARED residuals, not the sum of absolute residuals. Why use squares?',
      options: [
        'Squares are easier to compute than absolute values in Python',
        'Squaring has two advantages: it penalizes large errors disproportionately more than small ones (a residual of 4 contributes 16 vs four residuals of 1 contributing 4 total), and the squared loss is differentiable everywhere — enabling a clean closed-form normal equation solution',
        'Absolute residuals would require solving a system of equations with no closed form',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'A regression model has R² = -0.2. What does this mean?',
      options: [
        'R² cannot be negative — this indicates a calculation error',
        'The model performs WORSE than simply predicting the mean for every point — R² = 1 - SS_residual/SS_total, so R² < 0 means SS_residual > SS_total; the model adds noise rather than explaining variance',
        'The model explains 20% of variance in the negative direction, equivalent to R² = 0.2',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'A residual plot shows residuals are higher at both small and large predicted values, forming a U-shape. What does this indicate?',
      options: [
        'The model is overfitting the training data',
        'The linear model is wrong for this data — the U-shape pattern means the true relationship is nonlinear (e.g., quadratic). Residuals should be random scatter with no pattern; any systematic shape reveals a misspecified model',
        'The residuals look fine — a U-shape is the expected shape for well-fitted residuals',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'The normal equations β = (XᵀX)⁻¹Xᵀy give the exact least-squares solution in one step. When might gradient descent be preferred over the normal equations?',
      options: [
        'Gradient descent is always preferred — it is more accurate than the normal equations',
        'When the dataset has millions of rows or thousands of features — computing (XᵀX)⁻¹ costs O(p³) where p is the number of features and O(np²) to form XᵀX; gradient descent can update incrementally on mini-batches and scales to large datasets',
        'Gradient descent should only be used when the normal equations give a negative R²',
      ],
      correct: 1,
    },
  ],
}
