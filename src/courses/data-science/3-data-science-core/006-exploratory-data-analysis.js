export default {
  id:'c-06',slug:'exploratory-data-analysis',track:'C',order:6,
  title:'Exploratory Data Analysis',subtitle:'Understanding Before Computing',
  tags:['EDA','correlation','anscombe','scatter','distribution','hypothesis'],
  prereqs:['c-02','c-05','b-02'],unlocks:['d-01','d-02'],
  hook:{question:'How do you understand a dataset you have never seen before?',realWorldContext:'EDA is not a step you do once. It is the mindset you bring to every dataset. The goal is not to answer a specific question — it is to discover what questions to ask. Every insight is a hypothesis. Every visualization is a test.'},
  intuition:{
    prose:[
      'EDA starts from a question and a checklist: shape and dtypes, missing values, distributions, correlations. Each step catches specific problems: dtypes reveals numbers stored as text, `describe()` reveals impossible values such as an age of -999 used as a "missing" code, `isnull()` shows gaps, and a key check reveals repeated IDs. The checklist cannot tell you everything. It will not reveal who was left out of the sample, a unit mistake that is applied consistently, labels that are wrong but plausible, or a column that secretly contains the answer you are trying to predict. So report what you checked, what you found, and what you could not check.',
      '**Correlation** measures linear association. r=1: perfect positive, r=-1: perfect negative, r=0: no linear relationship. Correlation does not imply causation. Always look at the scatter plot after computing correlations.',
      `**Anscombe's quartet**: four datasets with nearly identical means, variances, correlations and fitted lines (equal to two or three decimal places) — but completely different shapes. This is why you plot as well as compute. Statistics summarize; plots reveal.`,
    ],
    callouts:[{type:'important',title:'The EDA Checklist',body:`1. df.shape — rows and columns
2. df.dtypes — what type is each column
3. df.isnull().sum() — where are the nulls
4. df.describe() — distribution of numerics
5. df.corr() — linear associations
6. One histogram per numeric column
7. Scatter plot for each pair of interest
8. One finding per column — write it down`}],
    visualizations:[{id:'PythonNotebook',title:'Exploratory Data Analysis',props:{initialCells:[
      {id:1,cellTitle:'Stage 1 — EDA Checklist on a New Dataset',
       prose:'Run the full checklist systematically.',
       instructions:'Run. Read every output. What is the shape? Are there nulls? What is the range of each column?',
       code:`import pandas as pd, numpy as np
np.random.seed(42)
df = pd.DataFrame({"age":np.random.normal(35,10,100).clip(18,65).astype(int),"income":np.random.exponential(50000,100),"score":np.random.normal(70,15,100).clip(0,100),"dept":np.random.choice(["Eng","Mkt","Sales"],100)})
print("Shape:", df.shape)
print("\\nTypes:")
print(df.dtypes)
print("\\nNulls:")
print(df.isnull().sum())
print("\\nDescribe:")
print(df.describe().round(2))`},
      {id:6,cellTitle:'Stage 1b — What the Checklist Catches (and Misses)',
       prose:'This small table has four planted problems. The checklist catches three of them: a price column stored as text (dtypes), an age of -999 used as a missing-value code (describe shows an impossible minimum), and a repeated customer_id (key check). The fourth — every customer came from one city, so nothing can be said about other cities — is invisible to all of these commands. You only find it by asking how the data were collected.',
       instructions:'Before running, predict which output line reveals each problem. Run and match each problem to the line that exposed it. Then write one sentence naming a limitation this dataset has that no command can detect.',
       code:`import pandas as pd
df = pd.DataFrame({
    "customer_id": [1, 2, 3, 3, 4, 5],
    "age":         [34, 28, -999, -999, 45, 51],
    "price":       ["12.50", "8.00", "15.25", "15.25", "9.75", "11.00"],
    "city":        ["Leeds"] * 6,
})
print(df.dtypes)                          # price is text, not a number
print(df.describe())                      # age min = -999: impossible value
print("repeated ids:", df["customer_id"].duplicated().sum())   # 1
print("cities:", df["city"].unique())     # one city — a sampling limit, not an error`},
      {id:2,cellTitle:'Stage 2 — Correlation Matrix',
       prose:'df.corr() shows pairwise linear correlations for all numeric columns.',
       instructions:'Run. Strong positive: close to 1. Strong negative: close to -1. No relationship: close to 0.',
       code:`import pandas as pd, numpy as np
np.random.seed(42)
x = np.random.normal(0,1,100)
df = pd.DataFrame({"x":x,"y_positive":x*2+np.random.normal(0,0.5,100),"y_none":np.random.normal(0,1,100),"y_negative":-x+np.random.normal(0,0.5,100)})
print(df.corr().round(3))`},
      {id:3,cellTitle:"Stage 3 — Anscombe's Quartet Warning",
       prose:'Nearly identical summary statistics, completely different data. Plot as well as compute.',
       instructions:'Run. Same mean, std, correlation for both. But they look completely different.',
       code:`import numpy as np
I_x=[10,8,13,9,11,14,6,4,12,7,5]
I_y=[8.04,6.95,7.58,8.81,8.33,9.96,7.24,4.26,10.84,4.82,5.68]
II_x=[10,8,13,9,11,14,6,4,12,7,5]
II_y=[9.14,8.14,8.74,8.77,9.26,8.10,6.13,3.10,9.13,7.26,4.74]
for name,xs,ys in [("I",I_x,I_y),("II",II_x,II_y)]:
    print(f"Dataset {name}: mean_y={np.mean(ys):.2f}, std_y={np.std(ys):.2f}, corr={np.corrcoef(xs,ys)[0,1]:.3f}")`},
      {id:4,cellTitle:'Stage 4 — The Bivariate Drill',
       prose:'For any two variables of interest: scatter + correlation + linear fit.',
       instructions:'Run. The scatter shows the relationship. Correlation quantifies it. The line models it.',
       code:`from opencalc import Figure
import numpy as np
np.random.seed(42)
hours = np.random.uniform(1,10,50)
scores = hours*8 + np.random.normal(0,5,50)
r = np.corrcoef(hours,scores)[0,1]
m,b = np.polyfit(hours,scores,1)
fig = Figure(xmin=0,xmax=11,ymin=0,ymax=100,title=f"Study hours vs score (r={r:.3f})")
fig.grid().axes()
fig.scatter(hours.tolist(),scores.tolist(),color="blue",radius=3)
fig.plot(lambda x: m*x+b, color="amber", label=f"y={m:.1f}x+{b:.1f}")
fig.show()`},
      {id:5,cellTitle:'Stage 5 — Categorical Exploration',
       prose:'Explore how numeric variables differ across categories.',
       instructions:'Run. This pattern — groupby then compare distributions — is a core EDA move.',
       code:`import pandas as pd, numpy as np
np.random.seed(42)
df = pd.DataFrame({"dept":np.random.choice(["Eng","Mkt","Sales"],100),"salary":np.random.normal(70000,15000,100)})
print("Salary by department:")
print(df.groupby("dept")["salary"].agg(["mean","median","std"]).round(0))`},
      {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — EDA Report',
       difficulty:'hard',
       prompt:'Run a complete EDA on the dataset. Find: (1) top_corr_with_price — column name most correlated with price, (2) median_price, (3) outlier_count — number of price outliers by 1.5×IQR rule.',
       instructions:`1. Compute correlation matrix, find highest absolute correlation with price. 2. Compute median of price. 3. Apply IQR outlier rule, count outliers.`,
       code:`import pandas as pd, numpy as np
np.random.seed(42)
df = pd.DataFrame({"price":np.random.normal(300000,80000,200).clip(100000,700000),"sqft":np.random.normal(1800,400,200).clip(600,4000),"bedrooms":np.random.randint(1,6,200),"age":np.random.randint(1,50,200),"garage":np.random.randint(0,3,200)})
top_corr_with_price = 
median_price = 
outlier_count = 
`,
       testCode:`
import numpy as np
if not isinstance(top_corr_with_price, str): raise ValueError("top_corr_with_price should be a column name string")
if top_corr_with_price not in ['sqft','bedrooms','age','garage']: raise ValueError(f"top_corr_with_price should be a column name, got {top_corr_with_price!r}")
if abs(median_price - float(np.median(df['price']))) > 1000: raise ValueError(f"median_price wrong")
if not isinstance(outlier_count, (int, np.integer)): raise ValueError("outlier_count should be an integer")
res=f"SUCCESS: top_corr={top_corr_with_price}, median_price={median_price:,.0f}, outliers={outlier_count}."
res
`,hint:`corr=df.corr()["price"].drop("price").abs()
top_corr_with_price=corr.idxmax()
median_price=df["price"].median()
Q1=df["price"].quantile(0.25);Q3=df["price"].quantile(0.75);IQR=Q3-Q1
outlier_count=int(((df["price"]<Q1-1.5*IQR)|(df["price"]>Q3+1.5*IQR)).sum())`},
    ]}}],
  },
  mentalModel:[
    "EDA mindset: understand before computing. Plot before fitting. Always.",
    'Checklist: shape→types→nulls→describe→correlate→plot→find.',
    'df.corr(): pairwise linear correlations. Always verify with scatter plot.',
    "Anscombe's quartet: identical stats, different shapes. ALWAYS plot.",
    `Bivariate drill: scatter + correlation + linear fit for any pair of interest.`,
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Why must EDA happen BEFORE modeling?',
      options: [
        'Python requires data exploration before sklearn functions can be called',
        'EDA reveals data quality issues, unexpected distributions, outliers, and surprising patterns that should inform model choice, preprocessing, and feature engineering — modeling on unchecked data risks learning from noise, errors, or artifacts rather than true signal',
        'EDA is only needed for large datasets with over 10,000 rows',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'A histogram of "response time" shows a unimodal distribution with most values near 50ms, but a long right tail extending to 5000ms. What should you investigate?',
      options: [
        'Nothing — long tails are mathematically expected for all timing measurements',
        'The extreme values: are the 5000ms responses a system failure, a specific type of request, or a separate mode? Multimodal or heavy-tailed distributions often indicate separate subpopulations worth modeling separately or investigating as anomalies',
        'The mean — you should compute the mean and if it exceeds 100ms, flag the dataset',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'A scatter plot of features A vs B shows a strong nonlinear S-curve relationship. A Pearson correlation coefficient is r = 0.2. What does this tell you?',
      options: [
        'There is no meaningful relationship between A and B — r = 0.2 is near zero',
        'Pearson r measures LINEAR correlation only — a low r does not mean no relationship; the S-curve is a strong nonlinear relationship missed by r. Always plot: correlation statistics alone are insufficient',
        'The S-curve means B is the logarithm of A, so log-transforming B would give r = 1.0',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'df.corr() gives a correlation matrix. A correlation of 0.95 between two features. What should you consider?',
      options: [
        'High correlation means both features are very useful and should both be kept',
        'Multicollinearity — two features providing nearly the same information can cause numerical instability in linear models and make coefficients hard to interpret; consider dropping one or using PCA. High correlation also helps identify redundant features',
        'A correlation of 0.95 is impossible for real data — the data may have been duplicated',
      ],
      correct: 1,
    },
  ],
}
