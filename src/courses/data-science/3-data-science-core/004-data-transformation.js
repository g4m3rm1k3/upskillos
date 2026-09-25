export default {
  id:'c-04',slug:'data-transformation',track:'C',order:4,
  title:'Data Transformation and Feature Engineering',subtitle:'Preparing Data for Computation',
  tags:['log-transform','normalization','z-score','one-hot-encoding','feature-engineering'],
  prereqs:['c-03','b-04'],unlocks:['c-05'],
  hook:{question:'Why does transforming data before modeling matter?',realWorldContext:'Raw data is rarely in the right form for a model. Income data spans 5 orders of magnitude — a linear model will be dominated by the highest values. Log-transforming compresses the range. These transformations are not cosmetic — they change what the model learns.'},
  intuition:{
    prose:[
      '**Log transformation** often *reduces* right skew. Income, population counts and prices are frequently right-skewed, and `np.log(data)` compresses the range so extreme values are less dominant. It does not guarantee a symmetric result — check by comparing summaries (mean versus median, or a histogram) before and after. It also has a **domain restriction**: log is only defined for positive numbers. `np.log(0)` is -inf and a negative input gives nan, so data containing zeros needs a decision such as `np.log1p` (log of 1 + x) or a different transform.',
      '**Scaling** brings features to comparable ranges so no feature dominates just because of its units. Min-max maps to [0,1]; z-score shifts to mean 0 and standard deviation 1. Both divide by a spread, so a constant column (max = min, or std = 0) must be handled explicitly. Crucially, the min, max, mean and std are **learned from data**. Fit them on the **training rows only**, then apply those same numbers to validation, test and new rows. Computing them on all the data first lets information from the test rows leak into training.',
      '**One-hot encoding** converts a categorical column into binary indicator columns. It is one common option, not a universal requirement: whether and how to encode depends on the model and task. Linear models and distance-based methods need numbers, and one-hot is a good default for unordered categories. Ordered categories (small < medium < large) may suit an ordinal code; some tree-based libraries accept categories directly; and categories with thousands of levels may need a different approach. The set of categories is also learned from training data, so decide how to handle a category that first appears in new data.',
    ],
    callouts:[{type:'important',title:'Which Transform for Which Problem',body:'Log: positive, right-skewed data (income, prices) — zeros/negatives need log1p or another choice\nMin-max: need values in [0,1] — guard against max == min\nZ-score: features with different units — guard against std == 0\nOne-hot: unordered categories for models that need numbers — plan for unseen categories\n\nAlways: check the distribution BEFORE and AFTER the transform.\nAlways: fit learned parameters (min, max, mean, std, category list) on training rows only.'}],
    visualizations:[{id:'PythonNotebook',title:'Data Transformation',props:{initialCells:[
      {id:1,cellTitle:'Stage 1 — Log Transform on Skewed Data',
       prose:'Log compresses the right tail, making the distribution more symmetric.',
       instructions:'Run. Notice the range compression: 30k–1M becomes roughly 10–14 in log space, and the gap between mean and median shrinks. Then add a 0 to the income array and run again: np.log(0) gives -inf (with a warning), which breaks the mean. Try np.log1p instead.',
       code:'import numpy as np\nfrom opencalc import Figure\nincome = np.array([30000,35000,40000,45000,50000,75000,100000,250000,1000000])\nlog_income = np.log(income)\nprint(f"Income: min={income.min():,}, max={income.max():,}")\nprint(f"Log income: min={log_income.min():.2f}, max={log_income.max():.2f}")\nprint(f"\\nIncome: mean={np.mean(income):,.0f}, median={np.median(income):,.0f}")\nprint(f"Log income: mean={np.mean(log_income):.2f}, median={np.median(log_income):.2f}")',output:'',status:'idle'},
      {id:2,cellTitle:'Stage 2 — Min-Max Normalization',
       prose:'Scale all values to [0,1]. The minimum maps to 0, maximum to 1.',
       instructions:'Run. Verify: min of result is 0, max is 1.',
       code:'import numpy as np\ndata = np.array([10.0, 20.0, 30.0, 40.0, 50.0])\nnormalized = (data - data.min()) / (data.max() - data.min())\nprint("Original:", data)\nprint("Normalized:", normalized)\nprint(f"New range: [{normalized.min()}, {normalized.max()}]")',output:'',status:'idle'},
      {id:3,cellTitle:'Stage 3 — Z-Score Standardization',
       prose:'Shift to mean=0, scale to std=1. Values are now in units of "standard deviations from mean."',
       instructions:'Run. Verify mean≈0 and std≈1 after transform.',
       code:'import numpy as np\ndata = np.array([100.0, 200, 150, 250, 175, 225, 125, 175])\nz = (data - np.mean(data)) / np.std(data)\nprint("Z-scores:", z.round(3))\nprint(f"Mean: {np.mean(z):.10f} (essentially 0)")\nprint(f"Std: {np.std(z):.6f} (essentially 1)")',output:'',status:'idle'},
      {id:4,cellTitle:'Stage 4 — One-Hot Encoding',
       prose:'Convert categorical columns into binary indicator columns.',
       instructions:'Run. The "color" column with 3 categories becomes 3 binary columns.',
       code:'import pandas as pd\ndf = pd.DataFrame({"color":["red","blue","green","red","blue"],"value":[10,20,15,25,30]})\nprint("Before:")\nprint(df)\nprint("\\nAfter one-hot encoding:")\nencoded = pd.get_dummies(df, columns=["color"])\nprint(encoded)',output:'',status:'idle'},
      {id:6,cellTitle:'Stage 4b — Fit on Training Rows, Apply to New Rows',
       prose:'Scaling and encoding learn numbers from data: a mean and std, or a list of categories. Learn them from the training rows only, store them, and reuse them unchanged on test rows and future data. This cell fits on train, applies to test, handles a constant column without dividing by zero, and handles a category ("purple") that never appeared in training by giving it all-zero indicator columns.',
       instructions:'Run. Check that train_z has mean 0, and that test_z does NOT have mean 0 — that is expected, because test rows are scaled with the training mean and std. Then (wrongly) refit the mean on all rows and see how the test values change: that difference is leakage.',
       code:'import pandas as pd, numpy as np\ntrain = pd.DataFrame({"size":[10.0, 20, 30, 40], "const":[5.0]*4, "color":["red","blue","red","green"]})\ntest  = pd.DataFrame({"size":[25.0, 60],     "const":[5.0]*2, "color":["blue","purple"]})\n\n# 1. Fit: learn parameters from TRAIN only\nmean = train[["size","const"]].mean()\nstd  = train[["size","const"]].std(ddof=0)\nstd  = std.replace(0, 1.0)          # constant column: avoid dividing by zero\ncategories = sorted(train["color"].unique())   # ["blue","green","red"]\n\n# 2. Apply the SAME parameters to any rows\ndef transform(df):\n    out = (df[["size","const"]] - mean) / std\n    for c in categories:\n        out["color_" + c] = (df["color"] == c).astype(int)  # unseen -> all zeros\n    return out\n\ntrain_z, test_z = transform(train), transform(test)\nprint(train_z.round(3))\nprint(test_z.round(3))\nprint("train size mean:", round(train_z["size"].mean(), 6))   # 0.0\nprint("test  size mean:", round(test_z["size"].mean(), 6))    # not 0 — expected',output:'',status:'idle'},
      {id:5,cellTitle:'Stage 5 — Feature Engineering',
       prose:'Creating new features from existing ones can dramatically improve model performance.',
       instructions:'Run. area (derived feature) may be more predictive than length and width separately.',
       code:'import pandas as pd\ndf = pd.DataFrame({"length":[10.0,15,8,20,12],"width":[5.0,8,4,10,6],"price":[200,450,120,800,300]})\ndf["area"] = df["length"] * df["width"]          # derived feature\ndf["aspect_ratio"] = df["length"] / df["width"]  # shape feature\ndf["log_price"] = df["price"].apply(__import__("numpy").log)  # log of target\nprint(df.round(2))',output:'',status:'idle'},
      {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — Transform Pipeline',
       difficulty:'hard',
       prompt:'Transform the housing dataset: (1) log-transform price, store as log_price, (2) z-score standardize sqft, store as sqft_z, (3) one-hot encode neighborhood. Store everything in df_out.',
       instructions:'1. df["log_price"] = np.log(df["price"]).\n2. df["sqft_z"] = (x - mean)/std.\n3. pd.get_dummies() on neighborhood.\n4. Store full result in df_out.',
       code:'import pandas as pd, numpy as np\ndf = pd.DataFrame({"price":[200000,350000,500000,150000,800000],"sqft":[1200,1800,2200,900,3000],"neighborhood":["North","South","North","East","South"]})\n# Your transformations here\ndf_out = df.copy()\n',output:'',status:'idle',
       testCode:`
if 'log_price' not in df_out.columns: raise ValueError("Missing log_price column")
import numpy as np
expected_lp = np.log([200000,350000,500000,150000,800000])
if not all(abs(df_out['log_price'].values - expected_lp) < 0.001): raise ValueError("log_price values wrong")
if 'sqft_z' not in df_out.columns: raise ValueError("Missing sqft_z column")
if abs(df_out['sqft_z'].mean()) > 0.01: raise ValueError("sqft_z mean should be ~0")
if not any('neighborhood_' in c for c in df_out.columns): raise ValueError("neighborhood should be one-hot encoded")
res="SUCCESS: All three transformations applied correctly."
res
`,hint:'df_out["log_price"]=np.log(df_out["price"])\ndf_out["sqft_z"]=(df_out["sqft"]-df_out["sqft"].mean())/df_out["sqft"].std()\ndf_out=pd.get_dummies(df_out,columns=["neighborhood"])'},
    ]}}],
  },
  mentalModel:[
    'Log transform: np.log(data) — often reduces right skew; positive values only (log1p for zeros). Compare before and after.',
    'Min-max: (x-min)/(max-min) → [0,1]. Guard against max == min.',
    'Z-score: (x-mean)/std → mean=0, std=1. Guard against std == 0.',
    'One-hot: pd.get_dummies(df, columns=["cat"]) — a common choice for unordered categories; whether to encode depends on the model.',
    'Fit learned preprocessing (means, stds, category lists) on training rows only; apply the same values to test and new rows.',
    'Feature engineering: create derived columns (area, ratios, logs of targets).',
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Min-max normalization scales data to [0, 1]. Z-score standardization scales to mean=0, std=1. When is Z-score preferred?',
      options: [
        'Always — Z-score is always more accurate than min-max',
        'Often when outliers are present or the model is sensitive to feature scale around a center (e.g., regularized regression, SVM, gradient-based training) — one extreme outlier makes min-max squash most data near 0 while the outlier sits at 1; z-score measures distance from the mean in standard deviations and has no fixed bounds',
        'Min-max is preferred for neural networks; Z-score is only for statistics',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'pd.get_dummies(df["city"]) converts categorical "city" to one-hot encoding. Why not just map cities to integers (1, 2, 3)?',
      options: [
        'Integer encoding is invalid — Pandas cannot store integers and categories in the same column',
        'Integer codes imply ordering and distance (city 3 is "3x" city 1) which is meaningless for nominal categories; one-hot encoding treats each category as independent by creating a separate binary column, preventing the model from assuming spurious order',
        'One-hot encoding is only needed for linear models — tree models can use integer codes',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'A "price" column ranges from $1 to $1,000,000 with exponential distribution. Why apply log(price) before modeling?',
      options: [
        'Log reduces the number of decimal places, making computation faster',
        'Log compresses the wide range — values spanning 6 orders of magnitude become a more linear, Gaussian-like distribution; many models (linear regression, neural nets) work better when features are on similar scales and not heavily skewed',
        'Logarithms are required when any feature has values greater than 1000',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Feature engineering creates new columns from existing ones (e.g., area = length × width). Why can this improve model performance?',
      options: [
        'More features always improve model performance — adding any derived column helps',
        'Models learn from the features you give them; a linear model fitting area = f(length, width) cannot easily learn length×width is the key relationship. Providing area directly exposes the relevant signal without requiring the model to discover the multiplication — domain knowledge encoded as features beats raw data',
        'Feature engineering reduces overfitting by adding regularization through redundant columns',
      ],
      correct: 1,
    },
  ],
}
