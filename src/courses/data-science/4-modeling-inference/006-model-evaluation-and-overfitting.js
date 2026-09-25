export default {
  id:'d-06',slug:'model-evaluation-and-overfitting',track:'D',order:6,
  title:'Model Evaluation and Overfitting',subtitle:'Does Your Model Actually Generalise?',
  tags:['overfitting','train-test-split','cross-validation','bias-variance','sklearn'],
  prereqs:['d-05'],unlocks:[],
  hook:{question:'How do you know if your model is actually good — or just memorized the training data?',realWorldContext:'A model that memorizes training data is worthless. The test is always: does it generalize to data it has never seen? This distinction between training performance and generalization performance is the central question of all of machine learning.'},
  intuition:{
    prose:[
      'A model **overfits** when it learns the training data too well — including its noise. A very high-degree polynomial through a dozen points can pass through or near every point yet predict badly between and beyond them. A large gap between training error and held-out error is the usual warning sign, but it is evidence, not proof: with a small held-out set the gap is noisy, and a model can overfit without a dramatic gap. Start with a **baseline** (for example, always predicting the training mean) so you know what "no skill" scores.',
      'Use three roles for data. The **training set** fits each candidate model. The **validation set** (or cross-validation on the training data) compares candidates and picks one — degree, features, settings. The **test set** is held out and used **once**, for the final chosen model, to estimate how it will do on new data. If you compare candidates on the test set, choosing the winner uses up its honesty: the winning score is optimistically biased. How you split also matters: random splits suit independent rows; rows from the same person or group should stay together (grouped split); time series should train on the past and test on the future.',
      '**k-fold cross-validation**: split the (non-test) data into k folds. Train on k-1 folds, evaluate on the remaining fold. Rotate so every point is used for evaluation exactly once. Report the mean and the spread of the k scores. It is usually more reliable than a single validation split. Any preprocessing that learns from data (scaling, imputation) must be fitted inside each fold — a pipeline does this for you.',
    ],
    callouts:[{type:'important',title:'The Golden Rule',body:'NEVER use the test set during model development.\nNot for tuning. Not for feature selection. Not for comparison.\nOnly for the final evaluation.\n\nIf you peek at the test set during development, your evaluation\nis optimistically biased — you are fitting to the test set too.'}],
    visualizations:[{id:'PythonNotebook',title:'Model Evaluation',props:{initialCells:[
      {id:1,cellTitle:'Stage 1 — Overfitting Visualized',
       prose:'High-degree polynomials can chase every training point but generalize poorly. (numpy may print a warning that the degree-15 fit is poorly conditioned: 12 points cannot pin down 16 coefficients — itself a sign of overfitting.)',
       instructions:'Run. The degree-1 line misses the curve (underfits). The degree-15 curve swings wildly between points (overfits). Degree 3 looks reasonable on this picture, but a picture is suggestive, not a guarantee — the next stages choose using held-out data.',
       code:'from opencalc import Figure\nimport numpy as np\nnp.random.seed(42)\nxs_train=np.linspace(0,5,12)\nys_train=np.sin(xs_train)+np.random.normal(0,0.3,12)\nxs_test=np.linspace(0,5,100)\nfig=Figure(xmin=-0.5,xmax=5.5,ymin=-2,ymax=2,title="Overfitting: degree 1 vs 3 vs 15")\nfig.grid().axes()\nfig.scatter(xs_train.tolist(),ys_train.tolist(),color="blue",radius=4)\nfor deg,color,label in [(1,"green","degree 1"),(3,"amber","degree 3"),(15,"red","degree 15")]:\n    coeffs=np.polyfit(xs_train,ys_train,deg)\n    fig.plot(lambda x,c=coeffs: np.polyval(c,x),color=color,label=label)\nfig.show()',output:'',status:'idle'},
      {id:2,cellTitle:'Stage 2 — Train/Test Split',
       prose:'Split once into train (60%), validation (20%) and test (20%). Fit every candidate on train, compare on validation, pick one, then evaluate only that one on test. The test score is printed once, at the end, and is not used to choose anything. A baseline that always predicts the training mean shows what R² "no skill" gets.',
       instructions:'Run. Compare train and validation R² for each degree, and compare everything with the baseline. Note which degree validation picks. Then answer: why would it be wrong to loop over the degrees printing test R² and pick the best one?',
       code:'import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.preprocessing import PolynomialFeatures\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.dummy import DummyRegressor\nnp.random.seed(42)\nX=np.random.uniform(0,5,100).reshape(-1,1)\ny=np.sin(X.ravel())+np.random.normal(0,0.3,100)\n# 1. Hold out the test set first; do not look at it until the end\nX_dev,X_test,y_dev,y_test=train_test_split(X,y,test_size=0.2,random_state=42)\n# 2. Split the rest into train and validation (0.25 of 80% = 20% overall)\nX_train,X_val,y_train,y_val=train_test_split(X_dev,y_dev,test_size=0.25,random_state=42)\n\nbaseline=DummyRegressor(strategy="mean").fit(X_train,y_train)\nprint(f"Baseline (predict mean): val R²={baseline.score(X_val,y_val):.3f}")\n\nval_scores={}\nfor deg in [1,3,10]:\n    model=make_pipeline(PolynomialFeatures(deg),LinearRegression())\n    model.fit(X_train,y_train)\n    val_scores[deg]=model.score(X_val,y_val)\n    print(f"Degree {deg:>2}: train R²={model.score(X_train,y_train):.3f}, val R²={val_scores[deg]:.3f}")\n\n# 3. Choose using validation only\nbest=max(val_scores,key=val_scores.get)\n# 4. Refit the chosen model on train+validation, evaluate ONCE on test\nfinal=make_pipeline(PolynomialFeatures(best),LinearRegression()).fit(X_dev,y_dev)\nprint(f"Chosen by validation: degree {best}. Final test R² (reported once): {final.score(X_test,y_test):.3f}")',output:'',status:'idle'},
      {id:3,cellTitle:'Stage 3 — K-Fold Cross Validation',
       prose:'Every (non-test) data point gets evaluated exactly once. Usually more reliable than a single validation split. The pipeline refits PolynomialFeatures and the regression inside each fold, so nothing learned from the evaluation fold leaks into training.',
       instructions:'Run. The mean and std of scores tell you performance and consistency. If two degrees have means within about one std of each other, the data do not clearly prefer one; prefer the simpler model.',
       code:'import numpy as np\nfrom sklearn.model_selection import cross_val_score\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.preprocessing import PolynomialFeatures\nfrom sklearn.pipeline import make_pipeline\nnp.random.seed(42)\nX=np.random.uniform(0,5,100).reshape(-1,1)\ny=np.sin(X.ravel())+np.random.normal(0,0.3,100)\nfor deg in [1,3,10]:\n    model=make_pipeline(PolynomialFeatures(deg),LinearRegression())\n    scores=cross_val_score(model,X,y,cv=5,scoring="r2")\n    print(f"Degree {deg:>2}: CV R²={scores.mean():.3f} ± {scores.std():.3f}")',output:'',status:'idle'},
      {id:4,cellTitle:'Stage 4 — Bias-Variance Tradeoff',
       prose:'Underfitting = high bias. Overfitting = high variance. The best model balances both. Training error keeps falling as complexity grows; validation error typically falls and then rises.',
       instructions:'Run. Look for the rough U-shape in val_err. With noisy data the curve is bumpy and neighbouring degrees can be nearly tied, so the "best degree" is an estimate from this one split, not a guaranteed right answer. Change the random seed and see whether it moves.',
       code:'import numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.preprocessing import PolynomialFeatures\nfrom sklearn.pipeline import make_pipeline\nnp.random.seed(42)\nX=np.random.uniform(0,5,200).reshape(-1,1)\ny=np.sin(X.ravel())+np.random.normal(0,0.3,200)\nX_tr,X_val,y_tr,y_val=train_test_split(X,y,test_size=0.3)\ndegrees=range(1,12)\ntrain_err=[]\nval_err=[]\nfor d in degrees:\n    m=make_pipeline(PolynomialFeatures(d),LinearRegression())\n    m.fit(X_tr,y_tr)\n    train_err.append(1-m.score(X_tr,y_tr))\n    val_err.append(1-m.score(X_val,y_val))\nbest=degrees[val_err.index(min(val_err))]\nprint(f"Best degree: {best}")\nfor d,tr,va in zip(degrees,train_err,val_err):\n    print(f"  degree {d:>2}: train_err={tr:.3f}, val_err={va:.3f}")',output:'',status:'idle'},
      {id:11,challengeType:'write',challengeNumber:1,challengeTitle:'Challenge 1 — Full Evaluation Pipeline',
       difficulty:'hard',
       prompt:'Train three models of increasing complexity on housing data. Use 5-fold cross-validation to find the best. Store best_degree (int) and best_cv_score (float).',
       instructions:'1. Build pipelines for degree 1, 2, 3.\n2. cross_val_score for each.\n3. best_degree = degree with highest mean CV score.',
       code:'import numpy as np\nfrom sklearn.model_selection import cross_val_score\nfrom sklearn.linear_model import LinearRegression\nfrom sklearn.preprocessing import PolynomialFeatures\nfrom sklearn.pipeline import make_pipeline\nnp.random.seed(42)\nX=np.random.normal(1500,400,150).reshape(-1,1)\ny=X.ravel()*150+50000+np.random.normal(0,30000,150)\nbest_degree = \nbest_cv_score = \nprint(f"Best degree: {best_degree}, CV R²: {best_cv_score:.4f}")\n',output:'',status:'idle',
       testCode:`
import numpy as np
from sklearn.model_selection import cross_val_score
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline
np.random.seed(42)
X=np.random.normal(1500,400,150).reshape(-1,1)
y=X.ravel()*150+50000+np.random.normal(0,30000,150)
scores={}
for d in [1,2,3]:
    m=make_pipeline(PolynomialFeatures(d),LinearRegression())
    scores[d]=cross_val_score(m,X,y,cv=5,scoring="r2").mean()
exp_best=max(scores,key=scores.get)
if best_degree not in [1,2,3]: raise ValueError(f"best_degree should be 1, 2, or 3, got {best_degree}")
if abs(best_cv_score-scores[best_degree])>0.01: raise ValueError(f"best_cv_score wrong for degree {best_degree}")
res=f"SUCCESS: Best degree={best_degree}, CV R²={best_cv_score:.4f}. Full evaluation pipeline complete."
res
`,hint:'results={}\nfor d in [1,2,3]:\n    m=make_pipeline(PolynomialFeatures(d),LinearRegression())\n    results[d]=cross_val_score(m,X,y,cv=5,scoring="r2").mean()\nbest_degree=max(results,key=results.get)\nbest_cv_score=results[best_degree]'},
    ]}}],
  },
  mentalModel:[
    'Overfitting: model learns training noise. A large train-vs-held-out gap is the usual warning sign — evidence, not proof.',
    'Train fits, validation (or CV) chooses, test is used once for the chosen model. Always compare against a baseline.',
    'k-fold CV: every point is tested exactly once. More reliable than single split.',
    'Bias-variance tradeoff: too simple = underfits. Too complex = overfits.',
    'Choose model complexity by validation error, not training error.',
  ],
  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'A polynomial model has train R² = 0.99 and test R² = 0.42. What does this indicate?',
      options: [
        'The model is excellent — R² = 0.99 means it has learned the data very well',
        'The model is overfitting — it has memorized the training data including its noise, but fails to generalize. The large gap between train and test performance is the signature of overfitting; a simpler model with lower train R² but higher validation (or cross-validated) R² would likely be better',
        'The test set must have different characteristics than the training set — the split should be redone',
      ],
      correct: 1,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Why is the "golden rule" of machine learning to never use the test set during model development?',
      options: [
        'Test sets are small and running many evaluations on them wastes memory',
        'Every time you evaluate on the test set and make a model decision based on it, you are implicitly fitting the model to the test set — even if you never train on it. This makes your final test evaluation optimistically biased, destroying its value as an honest estimate of how the model performs on truly unseen data',
        'Modern sklearn pipelines automatically prevent test data from leaking into training',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: '5-fold cross-validation splits data into 5 folds, trains on 4, evaluates on 1, and rotates. What key advantage does this have over a single train/test split?',
      options: [
        'Cross-validation is faster because each fold uses less data',
        'Every data point is tested exactly once across the 5 rotations — you get 5 performance estimates instead of 1, giving a mean and standard deviation to assess consistency; a single split can be unlucky (easy test set or hard test set) giving a misleading one-off number',
        'Cross-validation prevents overfitting by training on smaller datasets',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'The bias-variance tradeoff: a degree-1 polynomial (straight line) fits a sinusoidal dataset. A degree-15 polynomial fits the same data. What is wrong with each?',
      options: [
        'Degree-1 has too many parameters; degree-15 has too few',
        'Degree-1 underfits (high bias) — its rigid form cannot capture the true curve and performs poorly on both training and test data. Degree-15 overfits (high variance) — it passes through every training point including noise and generalizes poorly; the best model captures the signal without memorizing the noise',
        'Both are equally bad — only degree-3 polynomials are valid for sinusoidal data',
      ],
      correct: 1,
    },
  ],
}
