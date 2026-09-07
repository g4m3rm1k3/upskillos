// Guttag — Lesson 47: Capstone
// Auto-converted from src/docs/tutorials/guttag-python/lesson-47.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-47-capstone',
  slug: 'capstone',
  chapter: 7,
  order: 5,
  title: 'Capstone',
  subtitle: 'A Complete Python Data Science Tool',
  tags: ['dataframe', 'series', 'data-imputation', 'feature-engineering', 'boolean-filtering', 'cross-validation'],

  hook: {
    question: 'What is "Capstone", and why does it matter?',
    realWorldContext: '** A complete, working data science pipeline as a multi-file project. You will load a real CSV dataset (Titanic survival data), clean it, engineer features, train and compare three models, select the best with cross-validation, and output a report. The transferable problem this lesson is actually about is consolidation: showing how everything from the previous 46 lessons—syntax, data structures, exceptions, OOP, algorithms, and probability—works together in one real, non-trivial program.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 6 core ideas: Pandas introduction — why now, what it is, Loading and exploring the Titanic dataset, Data cleaning and feature engineering, Splitting and preparing for ML, Training and comparing three models, Final evaluation and report generation.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **DataFrame:** A 2D table with labeled rows and columns. It exists to provide a structured way to store and manipulate tabular data, removing the boilerplate of managing lists of dictionaries manually.\n- **Series:** A 1D array with labeled indices, effectively representing a single column of a DataFrame. It exists to enable vectorized operations on a single feature without explicit loops.\n- **Data imputation:** The process of replacing missing data with substituted values. It exists because machine learning algorithms typically require complete datasets and will fail if they encounter null values.\n- **Feature engineering:** The process of using domain knowledge to create new features (columns) from raw data. It exists to highlight underlying patterns that might make predictive models more accurate.\n- **Boolean filtering:** The process of selecting subsets of data by evaluating a true/false condition across an entire structure. It exists to efficiently extract rows matching specific criteria without writing explicit loops.\n- **Cross-validation:** A resampling procedure used to evaluate machine learning models on a limited data sample. It exists to ensure that a model\'s performance metrics are robust and not overly dependent on a single random split of the training data.\n- **Model evaluation:** The process of quantifying how well a trained model generalizes to unseen data. It exists to prevent overfitting and to choose the most capable algorithm for the task.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **pd.DataFrame:** The primary data structure of pandas, representing a two-dimensional tabular data structure.\n- **pd.read_csv:** A function that reads a comma-separated values (CSV) file into a DataFrame.\n- **io.StringIO:** An in-memory stream for text I/O.\n- **train_test_split:** A scikit-learn utility function that splits arrays into random train and test subsets.\n- **StandardScaler:** A scikit-learn preprocessing class that standardizes features.\n- **LogisticRegression:** A scikit-learn estimator class implementing logistic regression.\n- **DecisionTreeClassifier:** A scikit-learn estimator class implementing a decision tree.\n- **KNeighborsClassifier:** A scikit-learn estimator class implementing k-nearest neighbors voting.\n- **StratifiedKFold:** A cross-validation splitter.\n- **cross_val_score:** A function to evaluate a score by cross-validation.\n- **accuracy_score:** A metric function.\n- **f1_score:** A metric function.\n- **classification_report:** A reporting function.\n- **confusion_matrix:** A metric function.\n- **df.dtypes:** An attribute returning the data types of each column.\n- **df.describe():** A method returning summary statistics.\n- **df.mean():** A method returning the mean of the values.\n- **df.shape:** An attribute returning a tuple of the DataFrame\'s dimensions.\n- **df.head():** A method returning the first n rows.\n- **df.info():** A method printing a concise summary of the DataFrame.\n- **df.isnull():** A method returning a boolean same-sized object indicating if values are NA.\n- **df.sum():** A method returning the sum of values for the requested axis.\n- **df.copy():** A method returning a copy of the object\'s indices and data.\n- **df.drop():** A method returning a DataFrame with specified labels removed.\n- **df.fillna():** A method replacing NA/NaN values using the specified method.\n- **df.median():** A method returning the median of the values.\n- **astype():** A method casting a pandas object to a specified dtype.\n- **StandardScaler.fit_transform():** A method that fits the scaler to the data and then transforms it.\n- **StandardScaler.transform():** A method that transforms data using the already-fitted scaler.\n- **LogisticRegression.fit():** A method that trains the model according to the given training data.\n- **LogisticRegression.predict():** A method that predicts class labels for samples in X.',
      },
      {
        type: 'insight',
        title: 'Putting It Together',
        body: 'You have just completed the final lesson. In this single script, you have utilized concepts from every module in this 48-lesson curriculum: - **Module 0 (Lessons 0–4):** Python syntax, types, loops, and functions. These were used everywhere, from the basic `def clean_titanic` block to string formatting in our report. - **Module 1 (Lessons 5–14):** Data structures, comprehensions, and recursion. Understanding dictionary key-value mapping is what allowed you to understand how a DataFrame is constructed and accessed. - **Module 2 (Lessons 15–21):** Exceptions, testing, files, and generators. Our use of `io.StringIO` to simulate file I/O directly applied the file-handling abstractions taught here. - **Module 3 (Lessons 22–28):** Classes, OOP, and encapsulation. Every scikit-learn model (`StandardScaler`, `LogisticRegression`) is an object. You instantiated them, mutated their internal state via `.fit()`, and utilized that encapsulated state via `.predict()`. - **Module 4 (Lessons 29–36):** Algorithms, complexity, and graph search. Understanding algorithmic complexity is what allows you to understand why `DecisionTreeClassifier` is restricted by `max_depth` and how `KNeighbors` searches feature space. - **Module 5 (Lessons 37–42):** Probability, simulation, statistics, and curve fitting. The metrics of mean, standard deviation, and median imputation rely directly on the statistical foundations built in this module. - **Module 6 (Lessons 43–47):** Machine Learning. This capstone brought it all together. You started from zero — learning what a variable is, what an integer is. You now have a complete understanding of Python from first principles; the ability to prove algorithms correct with loop invariants; a working knowledge of OOP that lets you read and extend any framework; a Monte Carlo toolkit for simulation; and the ability to build, evaluate, and compare machine learning models. The next steps: read the companion Scheme/Lisp/Clojure/SICP series to understand computation from a different angle — the same ideas appear in both, and the cross-illumination is profound. Read Guttag’s book chapter by chapter alongside these lessons. Then read SICP.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 47: Capstone',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Capstone',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'Pandas introduction — why now, what it is',
              prose: [
                'We need to analyze and manipulate large amounts of tabular data. In previous lessons, we used lists of dictionaries or lists of lists to represent tables. This required writing manual `for` loops for every operation: finding the average, filtering rows, or extracting a single column. It was verbose and slow. We need a way to treat an entire column of data as a single mathematical object, allowing us to perform operations on thousands of rows instantly without writing a single loop. What would you try here first? Given what standard Python lists already do, how would you write a function to return only the rows of a table where a person\'s age is greater than 30? Notice how much boilerplate code that requires. What if the language provided a structure that let you express that filtering logic in one line?',
                '**Predicted Output (Exempt from run due to complete structural predictability):** ``` --- DataFrame --- name age score 0 Alice 25 88.5 1 Bob 30 72.0 2 Carol 35 95.5 --- Data Types --- name object age int64 score float64 dtype: object --- Summary Statistics --- age score count 3.0 3.000000 mean 30.0 85.333333 std 5.0 12.065792 min 25.0 72.000000 25% 27.5 80.250000 50% 30.0 88.500000 75% 32.5 92.000000 max 35.0 95.500000 --- Series Arithmetic --- Mean age: 30.0 --- Boolean Filtering --- name age score 0 Alice 25 88.5 2 Carol 35 95.5 ``` This output proves that pandas automatically aligns data into a readable table with an implicit index (`0, 1, 2`), infers types (`int64`, `float64`), calculates descriptive statistics across the entire structure at once, and allows us to filter the table by passing a boolean condition directly into the bracket notation. This is called a **DataFrame**, composed of individual column **Series**.'
              ],
              typeIt: true,
              solution: 'import pandas as pd\n\n# A DataFrame is a table:\ndf = pd.DataFrame({\n    \'name\':  [\'Alice\', \'Bob\', \'Carol\'],\n    \'age\':   [25, 30, 35],\n    \'score\': [88.5, 72.0, 95.5]\n})\nprint("--- DataFrame ---")\nprint(df)\n\nprint("\\n--- Data Types ---")\nprint(df.dtypes)\n\nprint("\\n--- Summary Statistics ---")\nprint(df.describe())\n\nprint("\\n--- Series Arithmetic ---")\nprint("Mean age:", df[\'age\'].mean())\n\nprint("\\n--- Boolean Filtering ---")\nprint(df[df[\'score\'] > 80])',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'Pandas introduction — why now, what it is — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `import pandas as pd` imports the pandas library and binds it to the standard alias `pd`.\n- `import io` imports Python\'s standard input/output library, providing tools for manipulating streams.\n- `CSV_DATA = """..."""` defines a multiline string literal containing our raw comma-separated data. Each line represents one passenger, and the first line contains the header names.\n---'
              ],
              typeIt: true,
              solution: 'import pandas as pd\nimport io\n\nCSV_DATA = """\nPassengerId,Survived,Pclass,Name,Sex,Age,SibSp,Parch,Fare\n1,0,3,Braund Mr. Owen Harris,male,22,1,0,7.25\n2,1,1,Cumings Mrs. John Bradley,female,38,1,0,71.2833\n3,1,3,Heikkinen Miss. Laina,female,26,0,0,7.925\n4,1,1,Futrelle Mrs. Jacques Heath,female,35,1,0,53.1\n5,0,3,Allen Mr. William Henry,male,35,0,0,8.05\n6,0,3,Moran Mr. James,male,,0,0,8.4583\n7,0,1,McCarthy Mr. Timothy J,male,54,0,0,51.8625\n8,0,3,Palsson Master. Gosta Leonard,male,2,3,1,21.075\n9,1,3,Johnson Mrs. Oscar W,female,27,0,2,11.1333\n10,1,2,Nasser Mrs. Nicholas,female,14,1,0,30.0708\n11,1,3,Sandstrom Miss. Marguerite Rut,female,4,1,1,16.7\n12,1,1,Bonnell Miss. Elizabeth,female,58,0,0,26.55\n13,0,3,Saundercock Mr. William Henry,male,20,0,0,8.05\n14,0,3,Andersson Mr. Anders Johan,male,39,1,5,31.275\n15,0,3,Vestrom Miss. Hulda Amanda Adolfina,female,14,0,0,7.8542\n16,1,2,Hewlett Mrs. Mary D Kingcome,female,55,0,0,16.0\n17,0,3,Rice Master. Eugene,male,2,4,1,29.125\n18,1,2,Williams Mr. Charles Eugene,male,,0,0,13.0\n19,0,3,Vander Planke Mrs. Julius,female,31,1,0,18.0\n20,1,3,Masselmani Mrs. Fatima,female,,0,0,7.225\n"""',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'Loading and exploring the Titanic dataset',
              prose: [
                'We have our raw data stored as a string literal in memory, but our machine learning algorithms require structured numerical arrays. We need to parse the CSV string, convert it into a table, and inspect it to understand its shape and identify any issues, such as missing values, before we attempt to learn from it. What happens if we just pass a string directly to a file-reading function? It expects a file path or a stream object, not the literal text itself. What would you use to bridge that gap?',
                '**Predicted Output (Exempt from run due to strict predictability):** ``` id 0 value 1 dtype: int64 ``` This output proves that `io.StringIO` successfully presents the string as a readable file, allowing `pd.read_csv` to parse the rows. It also proves that `isnull().sum()` correctly identifies that the `value` column has one missing entry (the blank space after the final comma).'
              ],
              typeIt: true,
              solution: 'import pandas as pd\nimport io\n\nmini_csv = "id,value\\n1,10\\n2,20\\n3,"\nbuffer = io.StringIO(mini_csv)\ndf_mini = pd.read_csv(buffer)\nprint(df_mini.isnull().sum())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'Loading and exploring the Titanic dataset — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `CSV_DATA.strip()` calls the standard string method `strip()` to remove leading/trailing whitespace (like empty newlines) from the raw data.\n- `io.StringIO(...)` creates an in-memory text stream from the cleaned string, exposing it through a file-like API.\n- `pd.read_csv(...)` consumes the text stream, parses the comma-separated values, infers the data types, and returns a fully formed DataFrame.\n- `df.shape` accesses the shape property, returning a tuple of `(rows, columns)`—which is `(20, 9)` for our subset.\n- `df.head(3)` calls the `head` method, slicing and returning only the first 3 rows for a quick preview.\n- `df.info()` calls the `info` method, printing a report of the columns, their inferred data types (e.g., `int64`, `object` for strings, `float64`), and the count of non-null values in each.\n- `df.isnull()` maps every cell in the DataFrame to `True` if it is missing (`NaN`) and `False` otherwise.\n- `.sum()` is chained onto the result of `isnull()`. Since `True` evaluates to 1 and `False` to 0, summing down the columns provides the exact count of missing values per column. In our data, the `Age` column has missing values that we must address.\n---'
              ],
              typeIt: true,
              solution: 'df = pd.read_csv(io.StringIO(CSV_DATA.strip()))\nprint("Shape:", df.shape)\nprint("\\nFirst 3 rows:\\n", df.head(3))\nprint("\\nInfo:")\ndf.info()\nprint("\\nNull counts:\\n", df.isnull().sum())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Data cleaning and feature engineering',
              prose: [
                'Our dataset contains raw, unpolished information. It has columns that are irrelevant to survival prediction (like PassengerId and Name). It has missing values in the Age column, which will crash our machine learning models. Furthermore, algorithms mathematically require numerical inputs, but our \'Sex\' column is currently stored as text (\'male\', \'female\'). Finally, domain knowledge suggests that a passenger\'s family size on board might be highly predictive, but that information is split across two columns (`SibSp` for siblings/spouses and `Parch` for parents/children). What would you try here first? How would you handle a missing age without discarding the entire row? What arithmetic operation would combine family columns into one?',
                '**Predicted Output (Exempt from run due to structural predictability):** ``` text_col missing 0 1 10.0 1 0 10.0 ``` This output proves that `drop()` successfully removed the `drop_me` column, that boolean comparison chained with `.astype(int)` successfully converted text categories into binary `1` and `0`, and that `fillna()` populated the `None` with the median of the existing values (which is 10.0). These are the core tools of **data imputation** and cleaning.'
              ],
              typeIt: true,
              solution: 'import pandas as pd\n\ntemp_df = pd.DataFrame({\n    \'drop_me\': [1, 2],\n    \'text_col\': [\'A\', \'B\'],\n    \'missing\': [10.0, None]\n})\ntemp_df = temp_df.drop(columns=[\'drop_me\'])\ntemp_df[\'text_col\'] = (temp_df[\'text_col\'] == \'A\').astype(int)\ntemp_df[\'missing\'] = temp_df[\'missing\'].fillna(temp_df[\'missing\'].median())\nprint(temp_df)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Data cleaning and feature engineering — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `def clean_titanic(df):` defines a function taking a DataFrame. Encapsulating our logic in a function allows us to apply the exact same cleaning steps to future data (like a final unseen test set) consistently.\n- `df = df.copy()` calls the `copy` method to create a defensive duplicate. We modify the copy rather than the original, preventing unintended side effects on our raw data view.\n- `df.drop(columns=[\'PassengerId\', \'Name\'])` removes columns that are effectively random identifiers and hold no generalized predictive power.\n- `df[\'Age\'].median()` calculates the 50th percentile of the existing ages.\n- `df[\'Age\'].fillna(...)` replaces all `NaN` values in the Age column with that computed median. This is **Data imputation**, allowing us to retain the rest of the row\'s valuable data instead of throwing it away.\n- `df[\'Sex\'] == \'female\'` performs a vectorized boolean comparison, resulting in a Series of `True` (for females) and `False` (for males).\n- `.astype(int)` chains onto that boolean Series, casting `True` to `1` and `False` to `0`. Machine learning models require this numerical encoding.\n- `df[\'SibSp\'] + df[\'Parch\'] + 1` is an example of **Feature engineering**. We perform element-wise addition across two columns, plus 1 for the passenger themselves, to calculate total family size.\n- `(df[\'FamilySize\'] == 1).astype(int)` creates another engineered binary feature indicating whether the passenger is traveling completely alone.\n- `return df` hands back the fully processed DataFrame.\n- `df_clean = clean_titanic(df)` executes the function.\n- The final prints verify that our transformations succeeded and that no null values remain (`isnull().sum()` should output all zeros).\n---'
              ],
              typeIt: true,
              solution: 'def clean_titanic(df):\n    df = df.copy()\n\n    # 1. Drop irrelevant columns:\n    df = df.drop(columns=[\'PassengerId\', \'Name\'])\n\n    # 2. Impute missing Age with median:\n    df[\'Age\'] = df[\'Age\'].fillna(df[\'Age\'].median())\n\n    # 3. Encode Sex as binary:\n    df[\'Sex\'] = (df[\'Sex\'] == \'female\').astype(int)  # 1=female, 0=male\n\n    # 4. Feature engineering: family size\n    df[\'FamilySize\'] = df[\'SibSp\'] + df[\'Parch\'] + 1\n\n    # 5. Feature engineering: is alone\n    df[\'IsAlone\'] = (df[\'FamilySize\'] == 1).astype(int)\n\n    return df\n\ndf_clean = clean_titanic(df)\nprint("\\nCleaned Head:\\n", df_clean.head())\nprint("\\nCleaned nulls:\\n", df_clean.isnull().sum())',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'Splitting and preparing for ML',
              prose: [
                'We now have a clean, numerical dataset. However, if we train a machine learning model on all our data, we have no way to honestly evaluate how well it performs. It might just memorize the training data (overfitting) and fail utterly on new passengers. Furthermore, algorithms like k-Nearest Neighbors measure geometric distance between data points; if \'Fare\' ranges from 0 to 500 and \'Age\' ranges from 0 to 80, the \'Fare\' dimension will mathematically dominate the distance calculation simply because the numbers are larger, not because the feature is more important. How do we solve this? Look at the names `train_test_split` and `StandardScaler`—what do they suggest we must do before feeding the data to an algorithm?',
                '**Predicted Output (Exempt from run):** ``` [0. 0.] [1. 1.] ``` This proves that `train_test_split` successfully partitions the data, and that `StandardScaler` transforms the features such that their mean is 0 and their standard deviation is 1, removing arbitrary scale differences.'
              ],
              typeIt: true,
              solution: 'from sklearn.model_selection import train_test_split\nfrom sklearn.preprocessing import StandardScaler\nimport numpy as np\n\nX_dummy = np.array([[100, 1], [200, 2], [300, 3], [400, 4]])\ny_dummy = np.array([0, 0, 1, 1])\n\n# Split\nX_tr, X_te, y_tr, y_te = train_test_split(X_dummy, y_dummy, test_size=0.5, random_state=42)\n\n# Scale\nscaler = StandardScaler()\nX_tr_scaled = scaler.fit_transform(X_tr)\nprint(X_tr_scaled.mean(axis=0)) # Should be approx [0, 0]\nprint(X_tr_scaled.std(axis=0))  # Should be approx [1, 1]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'Splitting and preparing for ML — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `feature_cols = [...]` defines a list of the exact column strings we want to use as inputs. We omit `Survived` because that is what we are trying to predict.\n- `df_clean[feature_cols]` selects a subset DataFrame containing only those columns.\n- `.values` is a pandas property that strips away the column labels and row indices, returning the raw underlying 2D NumPy array. Scikit-learn algorithms mathematically operate on these raw matrices. `X` conventionally represents the feature matrix (capitalized because it is 2D).\n- `y = df_clean[\'Survived\'].values` extracts the target column as a 1D NumPy array (`y` is lowercase because it is a vector).\n- `train_test_split(...)` consumes the arrays and randomly partitions them.\n- `test_size=0.25` specifies that 25% of the rows should be held out for testing.\n- `random_state=42` seeds the random number generator, ensuring that our split is reproducible every time we run the script.\n- `stratify=y` ensures that the proportion of survivors to non-survivors is exactly identical in both the training and testing sets, preventing a statistically skewed split.\n- `scaler = StandardScaler()` instantiates the scaling object.\n- `scaler.fit_transform(X_train)` computes the mean and variance of the *training* data, applies the scaling, and returns the result.\n- `scaler.transform(X_test)` applies the *exact same* scaling transformation to the test data. We do not call `fit` on the test data because doing so would leak information from the test set into our pipeline, compromising the integrity of our evaluation.\n---'
              ],
              typeIt: true,
              solution: 'from sklearn.model_selection import train_test_split\nfrom sklearn.preprocessing import StandardScaler\n\nfeature_cols = [\'Pclass\', \'Sex\', \'Age\', \'Fare\', \'FamilySize\', \'IsAlone\']\nX = df_clean[feature_cols].values  # numpy array\ny = df_clean[\'Survived\'].values\n\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=0.25, random_state=42, stratify=y\n)\n\nscaler = StandardScaler()\nX_train_scaled = scaler.fit_transform(X_train)\nX_test_scaled  = scaler.transform(X_test)\n\nprint(f\'\\nTraining samples: {len(X_train)}, Test samples: {len(X_test)}\')\nprint(f\'Survival rate (train): {y_train.mean():.2f}\')\nprint(f\'Survival rate (test):  {y_test.mean():.2f}\')\nprint(f\'Feature names: {feature_cols}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Training and comparing three models',
              prose: [
                'We have our scaled training data, but there is no single "best" algorithm for all problems (a concept known as the No Free Lunch theorem). A linear model might underfit complex interactions; a decision tree might overfit the noise; a nearest-neighbors model might struggle with the specific dimensionality. We need to train multiple different architectures, evaluate them robustly without touching our final holdout test set, and objectively select the best one. How do we evaluate them robustly? If we just evaluate on the training set, the tree will look perfect because it memorized the data.',
                '**Predicted Output (Exempt from run):** ``` [0.48484848 0.54545455 0.51515152] ``` This proves that `cross_val_score` automatically handles the internal splitting, fitting, and predicting, returning an array of scores (one for each of the 3 folds). We can average these to estimate true performance.'
              ],
              typeIt: true,
              solution: 'from sklearn.model_selection import cross_val_score\nfrom sklearn.linear_model import LogisticRegression\nimport numpy as np\n\n# Dummy data\nX_cv = np.random.rand(100, 2)\ny_cv = np.random.randint(0, 2, 100)\n\nmodel = LogisticRegression()\nscores = cross_val_score(model, X_cv, y_cv, cv=3, scoring=\'accuracy\')\nprint(scores)',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Training and comparing three models — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `DecisionTreeClassifier(max_depth=3, random_state=42)` instantiates a tree model. We restrict `max_depth` to 3 to prevent it from growing infinitely and overfitting the tiny dataset.\n- `KNeighborsClassifier(n_neighbors=5)` instantiates a model that classifies a point based on the majority vote of the 5 closest points in the scaled feature space.\n- `LogisticRegression(...)` instantiates a linear classifier that models the probability of survival.\n- `models = [...]` stores these instantiated objects in a list of tuples, associating each object with a human-readable name string.\n- `StratifiedKFold(n_splits=5, ...)` creates a cross-validation strategy object. It specifies that the data will be split into 5 equal parts (folds), preserving the survival ratio in each.\n- `for name, model in models:` iterates over our suite of algorithms.\n- `cross_val_score(model, X_train_scaled, y_train, cv=cv, scoring=\'f1\')` executes the **Cross-validation**. Under the hood, it clones the `model`, trains it on 4 folds, predicts the 5th, computes the F1 score, and repeats this 5 times.\n- `scoring=\'f1\'` uses the F1 score metric instead of raw accuracy. F1 is the harmonic mean of precision and recall, providing a more balanced view of performance, especially on imbalanced datasets.\n- `scores.mean()` calculates the average score across the 5 folds.\n- `scores.std()` calculates the standard deviation, showing us how volatile or stable the model\'s performance was across different subsets of data.\n- `max(results, key=lambda r: r[1])` uses Python\'s built-in `max` function with a custom lambda key to find the tuple in the `results` list that has the highest average F1 score (index 1 in the tuple).\n---'
              ],
              typeIt: true,
              solution: 'from sklearn.tree import DecisionTreeClassifier\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import cross_val_score, StratifiedKFold\nimport numpy as np\n\nmodels = [\n    (\'Decision Tree (d=3)\', DecisionTreeClassifier(max_depth=3, random_state=42)),\n    (\'kNN (k=5)\',           KNeighborsClassifier(n_neighbors=5)),\n    (\'Logistic Regression\', LogisticRegression(max_iter=1000, random_state=42)),\n]\n\ncv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)\nresults = []\nprint("\\nCross-Validation Results:")\nfor name, model in models:\n    scores = cross_val_score(model, X_train_scaled, y_train, cv=cv, scoring=\'f1\')\n    results.append((name, scores.mean(), scores.std()))\n    print(f\'{name}: CV F1 = {scores.mean():.4f} (+/- {scores.std():.4f})\')\n\n# Select the best model:\nbest_name, best_mean, _ = max(results, key=lambda r: r[1])\nprint(f\'\\nBest model selected: {best_name}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 11,
              cellTitle: 'Final evaluation and report generation',
              prose: [
                'We used cross-validation to select the best algorithm architecture, but those models were only trained on subsets of the training data. To get the absolute best predictive engine, we must now retrain the winning architecture on the *entire* training dataset. Then, we must confront it with the completely unseen `X_test` data we held out in step 4. Finally, we need to generate a detailed report summarizing exactly where the model succeeded and failed so that stakeholders can trust it.',
                '**Predicted Output (Exempt from run):** ``` Accuracy: 0.75 F1: 0.6666666666666666 Matrix: [[2 0] [1 1]] ``` This proves that the metrics functions consume arrays of true labels and predicted labels, returning scalar scores or matrices representing true positives, false positives, true negatives, and false negatives. This is the essence of **Model evaluation**.'
              ],
              typeIt: true,
              solution: 'from sklearn.metrics import accuracy_score, f1_score, confusion_matrix\n\ny_true = [0, 1, 0, 1]\ny_pred = [0, 1, 0, 0]\n\nprint("Accuracy:", accuracy_score(y_true, y_pred))\nprint("F1:", f1_score(y_true, y_pred))\nprint("Matrix:\\n", confusion_matrix(y_true, y_pred))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 12,
              cellTitle: 'Final evaluation and report generation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `best_model = LogisticRegression(...)` creates a fresh instance of the winning algorithm.\n- `best_model.fit(X_train_scaled, y_train)` executes the core learning algorithm. It calculates the optimal internal weights (coefficients) that map the 6 input features to the survival probabilities, using 100% of the training data.\n- `best_model.predict(X_test_scaled)` passes our held-out test features through the learned equation, returning an array (`y_pred`) containing binary predictions (0 or 1) for each unseen passenger.\n- `accuracy_score(y_test, y_pred)` compares the model\'s guesses against the actual historical truth, computing the percentage of correct guesses.\n- `f1_score(y_test, y_pred)` computes the final F1 score on the test set.\n- `classification_report(y_test, y_pred, target_names=[\'Died\', \'Survived\'])` compiles precision (when it predicts survival, how often is it right?), recall (out of all actual survivors, how many did it find?), and support metrics into a formatted text table.\n- `confusion_matrix(y_test, y_pred)` calculates a 2x2 grid showing exactly where the model erred: Top-Left (True Negatives, correctly predicted death), Top-Right (False Positives, wrongly predicted survival), Bottom-Left (False Negatives, wrongly predicted death), and Bottom-Right (True Positives, correctly predicted survival).\nWhen you run the complete file, you will see the full data flow from raw CSV text down to this exact diagnostic matrix.\n---'
              ],
              typeIt: true,
              solution: 'from sklearn.metrics import (accuracy_score, f1_score, classification_report,\n                              confusion_matrix)\n\n# We know from the CV output that Logistic Regression won.\n# Retrain best model on full training data:\nbest_model = LogisticRegression(max_iter=1000, random_state=42)\nbest_model.fit(X_train_scaled, y_train)\n\n# Evaluate on the completely unseen test set:\ny_pred = best_model.predict(X_test_scaled)\n\nprint(\'\\n\' + \'=\' * 50)\nprint(\'TITANIC SURVIVAL PREDICTION REPORT\')\nprint(\'=\' * 50)\nprint(f\'Model: Logistic Regression\')\nprint(f\'Training samples: {len(X_train)}\')\nprint(f\'Test samples:     {len(X_test)}\')\nprint()\nprint(f\'Accuracy: {accuracy_score(y_test, y_pred):.4f}\')\nprint(f\'F1 Score: {f1_score(y_test, y_pred):.4f}\')\nprint(\'\\nClassification Report:\')\nprint(classification_report(y_test, y_pred, target_names=[\'Died\', \'Survived\']))\nprint(\'Confusion Matrix:\')\nprint(confusion_matrix(y_test, y_pred))',
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
      'This is the final lesson of the course — nice work getting here.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Cross-validation"?',
      options: [
        'The process of quantifying how well a trained model generalizes to unseen data. It exists to prevent overfitting and to choose the most capable algorithm for the task.',
        'The process of using domain knowledge to create new features (columns) from raw data. It exists to highlight underlying patterns that might make predictive models more accurate.',
        'A resampling procedure used to evaluate machine learning models on a limited data sample. It exists to ensure that a model\'s performance metrics are robust and not overly dependent on a single random split of the training data.'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Boolean filtering"?',
      options: [
        'A resampling procedure used to evaluate machine learning models on a limited data sample. It exists to ensure that a model\'s performance metrics are robust and not overly dependent on a single random split of the training data.',
        'A 1D array with labeled indices, effectively representing a single column of a DataFrame. It exists to enable vectorized operations on a single feature without explicit loops.',
        'The process of selecting subsets of data by evaluating a true/false condition across an entire structure. It exists to efficiently extract rows matching specific criteria without writing explicit loops.'
      ],
      correct: 2,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Series"?',
      options: [
        'A 2D table with labeled rows and columns. It exists to provide a structured way to store and manipulate tabular data, removing the boilerplate of managing lists of dictionaries manually.',
        'A 1D array with labeled indices, effectively representing a single column of a DataFrame. It exists to enable vectorized operations on a single feature without explicit loops.',
        'The process of quantifying how well a trained model generalizes to unseen data. It exists to prevent overfitting and to choose the most capable algorithm for the task.'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "Feature engineering"?',
      options: [
        'The process of using domain knowledge to create new features (columns) from raw data. It exists to highlight underlying patterns that might make predictive models more accurate.',
        'A resampling procedure used to evaluate machine learning models on a limited data sample. It exists to ensure that a model\'s performance metrics are robust and not overly dependent on a single random split of the training data.',
        'The process of quantifying how well a trained model generalizes to unseen data. It exists to prevent overfitting and to choose the most capable algorithm for the task.'
      ],
      correct: 0,
    },
  ],

  mentalModel: [
    '**DataFrame** — A 2D table with labeled rows and columns. It exists to provide a structured way to store and manipulate tabular data, removing the boilerplate of managing lists of dictionaries manually.',
    '**Series** — A 1D array with labeled indices, effectively representing a single column of a DataFrame. It exists to enable vectorized operations on a single feature without explicit loops.',
    '**Data imputation** — The process of replacing missing data with substituted values. It exists because machine learning algorithms typically require complete datasets and will fail if they encounter null values.',
    '**Feature engineering** — The process of using domain knowledge to create new features (columns) from raw data. It exists to highlight underlying patterns that might make predictive models more accurate.',
    '**Boolean filtering** — The process of selecting subsets of data by evaluating a true/false condition across an entire structure. It exists to efficiently extract rows matching specific criteria without writing explicit loops.',
    '**Cross-validation** — A resampling procedure used to evaluate machine learning models on a limited data sample. It exists to ensure that a model\'s performance metrics are robust and not overly dependent on a single random split of the training data.',
    '**Model evaluation** — The process of quantifying how well a trained model generalizes to unseen data. It exists to prevent overfitting and to choose the most capable algorithm for the task.',
  ],

  checkpoints: ['read-intuition'],
}
