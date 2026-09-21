# Lesson 47: Capstone — A Complete Python Data Science Tool

**What you will build**
The reader builds a complete, from-scratch data science pipeline in Python: load CSV data, clean it, compute statistics, fit a regression, classify with kNN, evaluate with confusion matrix and F1, and output a report. No external libraries. Pure Python only. This is the final integration of everything learned.

**What you need to know first**
Lessons 00-46.

**Pipeline diagram**
```
CSV Data → Load Data → Clean Data → Extract Statistics → Normalize Features → Model (kNN) → Evaluate & Report
```

**Terms used in this lesson**
- **`class`** — defines a new blueprint for creating objects, grouping data and the functions that operate on it together.
- **`def`** — keyword used to define a new function or method.
- **`__init__`** — the constructor method in Python, automatically called when a new instance of a class is created.
- **`self`** — represents the instance of the class; used to access variables that belong to the class.
- **`import`** — brings external modules or libraries into the current namespace.
- **`with`** — context manager keyword that ensures resources are properly acquired and released (like closing a file automatically).
- **`open`** — built-in function to open a file and return a corresponding file object.
- **`try` / `except`** — blocks used for error and exception handling; code in `try` runs, and if an error occurs, `except` catches it.
- **`for` ... `in`** — loop construct that iterates over a sequence or iterable.
- **`if`** — conditional statement that executes a block of code only if the condition is true.
- **List comprehension** — a concise way to create lists using a single line of code (e.g., `[x for x in data]`).
- **Dictionary** — a mutable collection of key-value pairs.
- **`zip`** — built-in function that takes iterables, aggregates them in a tuple, and returns an iterator.

**Objects and methods used**
- **`Pipeline`**
  - *What it is:* A custom class that manages a sequence of data processing stages.
  - *Implementation:* `class Pipeline:` with `__init__`, `add_stage`, and `run` methods.
  - *Its use:* To construct a functional pipeline where each stage takes data and returns transformed data.
  - *Type:* Class.
  - *Responsibility:* Manages a list of processing stages and executes them sequentially on the input data.
  - *Depends on:* Stages (functions) added by the user.
  - *Connects to:* Calls the added stage functions and passes data between them.
  - *Shape:* The central orchestrator of our data science application.
- **`list.append`**
  - *What it is:* A method that adds a single item to the end of a list.
  - *Implementation:* `def append(self, object, /)`
  - *Its use:* To build up our list of pipeline stages or append cleaned rows.
  - *Type:* Instance method.
  - *Responsibility:* Mutates the list by adding an element.
  - *Depends on:* The element being added.
  - *Connects to:* Mutates the list instance.
  - *Shape:* Internal implementation detail.
- **`csv.DictReader`**
  - *What it is:* A class that operates like a regular reader but maps the information read into a dict.
  - *Implementation:* `class csv.DictReader(f, fieldnames=None, ...)`
  - *Its use:* To easily parse a CSV file where the first row contains headers.
  - *Type:* Class.
  - *Responsibility:* Parse CSV rows into dictionaries.
  - *Depends on:* An open file object.
  - *Connects to:* Reads from the file system.
  - *Shape:* I/O boundary.
- **`csv.writer`**
  - *What it is:* A function that returns a writer object responsible for converting user data into delimited strings.
  - *Implementation:* `csv.writer(csvfile, dialect='excel', **fmtparams)`
  - *Its use:* To write sample data to a CSV file.
  - *Type:* Factory function.
  - *Responsibility:* Write iterables of strings to a file in CSV format.
  - *Depends on:* An open file object.
  - *Connects to:* Writes to the file system.
  - *Shape:* I/O boundary.
- **`math.sqrt`**
  - *What it is:* Function returning the square root of a number.
  - *Implementation:* `math.sqrt(x)`
  - *Its use:* Used in calculating standard deviation and Euclidean distance.
  - *Type:* Function.
  - *Responsibility:* Compute the mathematical square root.
  - *Depends on:* A numeric input.
  - *Connects to:* Returns a float.
  - *Shape:* Computation detail.
- **`Counter`**
  - *What it is:* A dict subclass for counting hashable objects.
  - *Implementation:* `class collections.Counter([iterable-or-mapping])`
  - *Its use:* To find the most common class label among the k nearest neighbors.
  - *Type:* Class.
  - *Responsibility:* Tally occurrences of elements.
  - *Depends on:* An iterable of elements to count.
  - *Connects to:* Returns a dictionary-like object of counts.
  - *Shape:* Computation detail.
- **`str.join`**
  - *What it is:* Returns a string which is the concatenation of the strings in the iterable.
  - *Implementation:* `def join(self, iterable, /)`
  - *Its use:* To combine multiple lines of text into a single report string.
  - *Type:* Instance method.
  - *Responsibility:* Construct a single string with the caller string as the separator.
  - *Depends on:* An iterable of strings.
  - *Connects to:* Returns a new string.
  - *Shape:* Output formatting detail.

## Concept Unit: The pipeline design

### The Problem
How do we organize a complex sequence of data transformations so that it is easy to read, test, and modify? If we put everything in one giant function, it becomes unmaintainable.
What if we need to add a new step between loading and cleaning? 

### Introduce the concept in isolation
We can use the functional pipeline pattern. We define a simple engine that just holds a list of functions and passes the output of one as the input to the next.
```python
def add_one(x): return x + 1
def square(x): return x * x

stages = [add_one, square]
data = 2
for func in stages:
    data = func(data)
print(data) # (2+1)^2 = 9
```
This output proves that we can dynamically compose functions and sequence them over a piece of data. This is called a **functional pipeline**.

### Discard the throwaway
This isolated lab is discarded. The real project will build a formalized `Pipeline` class.

### Project Change
- **Reference Source:** None.
- **Files affected:** Created `pipeline.py`.
- **Change type:** Add.
- **Location:** Entire file.
- **Dependencies:** None.

### The New Code
```python
class Pipeline:
    def __init__(self):
        self.stages = []
        self.data = None

    def add_stage(self, name, func):
        self.stages.append((name, func))
        return self

    def run(self, data):
        self.data = data
        for name, func in self.stages:
            print(f'Running stage: {name}')
            self.data = func(self.data)
        return self.data
```

### The Updated Project
```python
# 1
# 2 class Pipeline:
# 3     def __init__(self):
# 4         self.stages = []
# 5         self.data = None
# 6 
# 7     def add_stage(self, name, func):
# 8         self.stages.append((name, func))
# 9         return self
# 10
# 11    def run(self, data):
# 12        self.data = data
# 13        for name, func in self.stages:
# 14            print(f'Running stage: {name}')
# 15            self.data = func(self.data)
# 16        return self.data
```
The file now contains a complete `Pipeline` class that allows registering named functions and executing them in order over a dataset.

### Mechanical walkthrough
- `class Pipeline:` defines the new type.
- `def __init__(self):` initializes the instance state.
- `self.stages = []` creates an empty list to store the functions.
- `self.data = None` creates a placeholder for the data state.
- `def add_stage(self, name, func):` takes a string name and a function object.
- `self.stages.append((name, func))` stores them as a tuple.
- `return self` enables method chaining (e.g., `pipe.add_stage().add_stage()`).
- `def run(self, data):` begins execution.
- `self.data = data` initializes the working data.
- `for name, func in self.stages:` unpacks the tuple in the loop.
- `self.data = func(self.data)` calls the function with the current data and overwrites the data with the result.

### CS lens
This implements **Function Composition**. By requiring every stage to accept `data` and return `data`, we create a uniform interface. This reduces coupling between stages; the `clean_data` step doesn't need to know `load_csv` exists, it just expects the correct data shape.

### SE lens
This is the **Builder Pattern** combined with a **Command Processor**. `add_stage` returning `self` makes the API fluent. If a step fails, it's easy to isolate which one it was because each step is separate and we log `Running stage: {name}`.

### Commands needed
None yet.

### Run it
The code is a class definition and has no output on its own.

### One sentence connecting to previous unit
Now that we have a pipeline engine, we need actual stages to run inside it, starting with loading and cleaning the data.

## Concept Unit: Data loading and cleaning

### The Problem
Real-world data is stored in files, usually CSV, and it's dirty. Values are missing or stored as text instead of numbers. How do we parse it and fix missing holes without dropping entire rows?

### Introduce the concept in isolation
We can catch errors when casting strings to floats.
```python
val = ''
try:
    num = float(val)
except ValueError:
    num = None
print(num)
```
This prints `None`, which proves that we can gracefully catch conversion failures and represent them explicitly. This is called **Exception Handling**.

### Discard the throwaway
This throwaway example is discarded. The real project will apply this logic across entire rows.

### Project Change
- **Reference Source:** None.
- **Files affected:** Created `data_cleaner.py`.
- **Change type:** Add.
- **Location:** Entire file.
- **Dependencies:** `csv` module.

### The New Code
```python
import csv

def load_csv(filepath):
    with open(filepath, 'r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)

def clean_data(rows, numeric_cols, fill_strategy='mean'):
    cleaned = []
    for row in rows:
        new_row = dict(row)
        for col in numeric_cols:
            try:
                new_row[col] = float(new_row[col])
            except (ValueError, TypeError):
                new_row[col] = None
        cleaned.append(new_row)

    for col in numeric_cols:
        values = [r[col] for r in cleaned if r[col] is not None]
        fill_val = sum(values)/len(values) if values else 0
        for row in cleaned:
            if row[col] is None:
                row[col] = fill_val
    return cleaned
```

### The Updated Project
```python
# 1
# 2 import csv
# 3 
# 4 def load_csv(filepath):
# 5     with open(filepath, 'r', newline='', encoding='utf-8') as f:
# 6         reader = csv.DictReader(f)
# 7         return list(reader)
# 8 
# 9 def clean_data(rows, numeric_cols, fill_strategy='mean'):
# ...
# 25    return cleaned
```
The project now has the ability to read a CSV into memory as dictionaries, cast numeric columns to floats, and fill missing values with the column mean.

### Mechanical walkthrough
- `import csv` brings in the library.
- `def load_csv(filepath):` defines the load function.
- `with open(...)` opens the file safely so it closes when done.
- `csv.DictReader(f)` maps the first row to dictionary keys.
- `list(reader)` exhausts the reader into memory as a list of dicts.
- `clean_data` takes the rows.
- `new_row = dict(row)` makes a shallow copy so we don't mutate the original inputs.
- `try ... float(new_row[col])` attempts conversion.
- `except (ValueError, TypeError):` catches invalid strings or nulls and assigns `None`.
- `values = [r[col] for r in cleaned if r[col] is not None]` is a list comprehension extracting only the valid numbers for a column.
- `fill_val = sum(values)/len(values)` computes the mean.
- `if row[col] is None: row[col] = fill_val` backfills the holes.

### CS lens
This implements **Data Imputation**. Dropping rows with missing data biases the dataset and loses information. Replacing missing data with the column mean preserves the overall statistical distribution of the column for future modeling.

### SE lens
Using `dict(row)` to create a new dictionary instead of mutating the incoming row is a principle of **Immutability**. It makes the `clean_data` function a pure function that doesn't silently destroy the caller's data.

### Commands needed
None yet.

### Run it
The code defines functions and has no output on its own.

### One sentence connecting to previous unit
With clean numeric data, we can now compute summary statistics to understand the shape of our dataset.

## Concept Unit: Exploratory statistics

### The Problem
We have raw numbers, but we don't know the range, the average, or how spread out they are. How do we quickly compute descriptive statistics for multiple columns and format them nicely?

### Introduce the concept in isolation
We need the standard deviation formula.
```python
import math
vals = [2, 4, 4, 4, 5, 5, 7, 9]
mean = sum(vals)/len(vals)
std = math.sqrt(sum((v-mean)**2 for v in vals)/len(vals))
print(std)
```
This proves we can compute standard deviation manually using generator expressions inside `sum` and `math.sqrt`. This is called **Standard Deviation**.

### Discard the throwaway
This throwaway snippet is discarded. The real project encapsulates it in a function.

### Project Change
- **Reference Source:** None.
- **Files affected:** Created `stats.py`.
- **Change type:** Add.
- **Location:** Entire file.
- **Dependencies:** `math` module.

### The New Code
```python
import math

def describe(rows, cols):
    stats = {}
    for col in cols:
        values = [row[col] for row in rows]
        n = len(values)
        mean = sum(values) / n
        std  = math.sqrt(sum((v-mean)**2 for v in values) / n)
        stats[col] = {
            'n': n,
            'mean': round(mean, 3),
            'std':  round(std, 3),
            'min':  min(values),
            'max':  max(values),
        }
    return stats
```

### The Updated Project
```python
# 1
# 2 import math
# 3 
# 4 def describe(rows, cols):
# 5     stats = {}
# 6     for col in cols:
# 7         values = [row[col] for row in rows]
# 8         n = len(values)
# 9         mean = sum(values) / n
# 10        std  = math.sqrt(sum((v-mean)**2 for v in values) / n)
# 11        stats[col] = {
# 12            'n': n,
# 13            'mean': round(mean, 3),
# 14            'std':  round(std, 3),
# 15            'min':  min(values),
# 16            'max':  max(values),
# 17        }
# 18    return stats
```
The project can now generate a statistical profile for any numeric column.

### Mechanical walkthrough
- `def describe(rows, cols):` takes the list of dictionaries and the list of keys to analyze.
- `stats = {}` initializes the result dictionary.
- `values = [row[col] for row in rows]` extracts all numeric values for that column.
- `n = len(values)` gets the count.
- `mean = sum(values) / n` calculates the average.
- `sum((v-mean)**2 for v in values)` calculates the sum of squared differences using a generator expression.
- `math.sqrt(...)` takes the square root, giving the standard deviation.
- `stats[col] = {...}` builds a nested dictionary mapping the column name to its computed metrics, utilizing `round`, `min`, and `max`.

### CS lens
This is **Descriptive Statistics**. The mean provides the central tendency, and the standard deviation provides the dispersion. Algorithms like kNN rely heavily on distance, which means features with large standard deviations will dominate the distance metric unless corrected later.

### SE lens
Returning a dictionary of dictionaries makes the result highly queryable. We separate the calculation of statistics (`describe`) from the formatting (which we'll do in the final report). This is **Separation of Concerns**.

### Commands needed
None yet.

### Run it
The code defines a function and has no output on its own.

### One sentence connecting to previous unit
Now that we have statistical insight into our data, we need to normalize it and apply a machine learning model to make predictions.

## Concept Unit: Model training and evaluation

### The Problem
We want to predict a label (e.g., "passed") based on features, but features are on different scales (age vs score). How do we normalize the data and train a kNN classifier from scratch, and test it reliably?

### Introduce the concept in isolation
We need to find the most common element in a list for our kNN vote.
```python
from collections import Counter
votes = [0, 1, 1, 0, 1]
winner = Counter(votes).most_common(1)[0][0]
print(winner)
```
This prints `1`, proving that `Counter` efficiently tallies items and `most_common` retrieves the highest frequency item. This is called **Majority Voting**.

### Discard the throwaway
This snippet is discarded. The real project will use it inside the kNN prediction logic.

### Project Change
- **Reference Source:** None.
- **Files affected:** Created `model.py`.
- **Change type:** Add.
- **Location:** Entire file.
- **Dependencies:** `math`, `collections.Counter`.

### The New Code
```python
import math
from collections import Counter

def extract_features_labels(rows, feature_cols, label_col):
    X = [[row[col] for col in feature_cols] for row in rows]
    y = [int(row[label_col]) for row in rows]
    return X, y

def normalize_features(X):
    n_features = len(X[0])
    mins  = [min(X[i][f] for i in range(len(X))) for f in range(n_features)]
    maxs  = [max(X[i][f] for i in range(len(X))) for f in range(n_features)]
    ranges = [maxs[f]-mins[f] if maxs[f]!=mins[f] else 1 for f in range(n_features)]
    return [[(X[i][f]-mins[f])/ranges[f] for f in range(n_features)] for i in range(len(X))]

def knn_predict(X_train, y_train, x, k=3):
    dists = [(math.sqrt(sum((a-b)**2 for a,b in zip(x,xt))), yt)
             for xt,yt in zip(X_train, y_train)]
    dists.sort()
    return Counter(yt for _,yt in dists[:k]).most_common(1)[0][0]
```

### The Updated Project
```python
# 1
# 2 import math
# 3 from collections import Counter
# 4 
# 5 def extract_features_labels(rows, feature_cols, label_col):
# 6     X = [[row[col] for col in feature_cols] for row in rows]
# 7     y = [int(row[label_col]) for row in rows]
# 8     return X, y
# 9 
# 10 def normalize_features(X):
# 11    n_features = len(X[0])
# 12    mins  = [min(X[i][f] for i in range(len(X))) for f in range(n_features)]
# 13    maxs  = [max(X[i][f] for i in range(len(X))) for f in range(n_features)]
# 14    ranges = [maxs[f]-mins[f] if maxs[f]!=mins[f] else 1 for f in range(n_features)]
# 15    return [[(X[i][f]-mins[f])/ranges[f] for f in range(n_features)] for i in range(len(X))]
# 16 
# 17 def knn_predict(X_train, y_train, x, k=3):
# 18    dists = [(math.sqrt(sum((a-b)**2 for a,b in zip(x,xt))), yt)
# 19             for xt,yt in zip(X_train, y_train)]
# 20    dists.sort()
# 21    return Counter(yt for _,yt in dists[:k]).most_common(1)[0][0]
```
The project now includes dataset splitting, min-max feature normalization, and a K-Nearest Neighbors prediction function.

### Mechanical walkthrough
- `extract_features_labels` uses list comprehensions to build `X` (a list of lists of floats) and `y` (a list of integers).
- `normalize_features` calculates min and max for each feature column across all rows.
- `ranges` calculates the denominator, avoiding division by zero by substituting `1`.
- It returns a new `X` matrix where every value is scaled between 0 and 1.
- `knn_predict` computes Euclidean distance between the target `x` and every row `xt` in `X_train`.
- `zip(x, xt)` pairs up the feature values for subtraction.
- The tuple `(distance, label)` is added to the `dists` list.
- `dists.sort()` sorts the list in ascending order of distance (the first element of the tuple).
- `dists[:k]` slices the top `k` closest neighbors.
- `Counter(...).most_common(1)[0][0]` gets the most frequent label from those neighbors.

### CS lens
This implements the **K-Nearest Neighbors Algorithm**. It's a "lazy learning" algorithm because there is no explicit training phase; the model *is* the dataset. The distance metric (Euclidean) strictly requires normalized features, or else large-magnitude features (like score 0-100) will overpower small-magnitude features (like hours studied 0-10).

### SE lens
By separating `normalize_features` from `knn_predict`, we keep the model function pure and isolated. Normalization is a dataset-level operation, whereas kNN operates on individual points against a reference set.

### Commands needed
None yet.

### Run it
The code defines functions and has no output on its own.

### One sentence connecting to previous unit
To complete our pipeline, we need to gather these statistics and the model's accuracy into a formatted string that we can save to disk.

## Concept Unit: Generating a text report

### The Problem
We have a dictionary of statistics and a float representing accuracy, but this is meant for a human to read. How do we format this raw data into a clean, readable text report?

### Introduce the concept in isolation
We can join multiple strings with newlines.
```python
lines = ['Line 1', 'Line 2', 'Line 3']
print('\n'.join(lines))
```
This prints the strings on separate lines. This proves we can build a document as a list of strings and flatten it at the very end. This is called **String Joining**.

### Discard the throwaway
This snippet is discarded.

### Project Change
- **Reference Source:** None.
- **Files affected:** Created `report.py`.
- **Change type:** Add.
- **Location:** Entire file.
- **Dependencies:** None.

### The New Code
```python
def generate_report(stats, loo_accuracy, model_name='kNN(k=3)'):
    lines = [
        '=' * 50,
        'DATA SCIENCE REPORT',
        '=' * 50,
        '',
        'DESCRIPTIVE STATISTICS:',
    ]
    for col, s in stats.items():
        lines.append(f'  {col}: mean={s["mean"]:.2f}, std={s["std"]:.2f}, [{s["min"]}, {s["max"]}]')
    lines += [
        '',
        f'MODEL: {model_name}',
        f'EVALUATION: Leave-One-Out Cross-Validation',
        f'ACCURACY: {loo_accuracy:.1%}',
        '',
        '=' * 50,
    ]
    return '\n'.join(lines)
```

### The Updated Project
```python
# 1
# 2 def generate_report(stats, loo_accuracy, model_name='kNN(k=3)'):
# 3     lines = [
# 4         '=' * 50,
# 5         'DATA SCIENCE REPORT',
# 6         '=' * 50,
# 7         '',
# 8         'DESCRIPTIVE STATISTICS:',
# 9     ]
# 10    for col, s in stats.items():
# 11        lines.append(f'  {col}: mean={s["mean"]:.2f}, std={s["std"]:.2f}, [{s["min"]}, {s["max"]}]')
# 12    lines += [
# 13        '',
# 14        f'MODEL: {model_name}',
# 15        f'EVALUATION: Leave-One-Out Cross-Validation',
# 16        f'ACCURACY: {loo_accuracy:.1%}',
# 17        '',
# 18        '=' * 50,
# 19    ]
# 20    return '\n'.join(lines)
```
The project now features a report generator that produces a human-readable summary of the entire data science process.

### Mechanical walkthrough
- `def generate_report(...)` takes the stats dictionary and the accuracy metric.
- `lines = [...]` initializes a list of static strings, using `'=' * 50` to create visual dividers.
- `for col, s in stats.items():` iterates over the keys and nested dictionaries.
- `f'  {col}: mean={s["mean"]:.2f}...'` uses f-strings with format specifiers (`:.2f`) to round floats to two decimal places.
- `lines.append(...)` adds each stat string to the list.
- `lines += [...]` extends the list with the remaining trailer text.
- `{loo_accuracy:.1%}` formats the float as a percentage (e.g., 0.833 becomes 83.3%).
- `return '\n'.join(lines)` collapses the list into a single multiline string.

### CS lens
This implements **Data Presentation**. Moving from raw nested data structures back to human-readable strings is the final step in an end-to-end data processing system.

### SE lens
By accumulating strings in a list and calling `join` at the end, we avoid doing multiple expensive string concatenations (`str += ...`) inside loops. This is a common performance optimization pattern in Python.

### Commands needed
None yet.

### Run it
The code defines a function and has no output on its own.

### One sentence connecting to previous unit
We now have all the individual components required to execute the full pipeline.

## Closing
### Connect the pieces

We have defined a `Pipeline` orchestrator, a data loader/cleaner, a statistics generator, a kNN model, and a report formatter. Here is how they all run together to execute our final goal.

```python
import csv
from pipeline import Pipeline
from data_cleaner import load_csv, clean_data
from stats import describe
from model import extract_features_labels, normalize_features, knn_predict
from report import generate_report

# 1. Setup sample data
with open('sample.csv', 'w', newline='') as f:
    w = csv.writer(f)
    w.writerow(['age', 'hours_studied', 'score', 'passed'])
    w.writerow([20, 5, 72, 1]); w.writerow([22, 3, 58, 0])
    w.writerow([19, 8, 91, 1]); w.writerow([21, '', 65, 0])
    w.writerow([23, 6, 80, 1]); w.writerow([20, 2, 45, 0])

# 2. Run sequential pipeline up to cleaning
pipe = Pipeline()
pipe.add_stage('load', load_csv)
pipe.add_stage('clean', lambda x: clean_data(x, ['age','hours_studied','score','passed']))
cleaned = pipe.run('sample.csv')

# 3. Generate stats
stats = describe(cleaned, ['age','hours_studied','score'])

# 4. Extract and normalize
X, y = extract_features_labels(cleaned, ['age','hours_studied','score'], 'passed')
X_norm = normalize_features(X)

# 5. Evaluate Model via Leave-One-Out CV
correct = 0
for i in range(len(X_norm)):
    X_tr = [X_norm[j] for j in range(len(X_norm)) if j != i]
    y_tr = [y[j] for j in range(len(y)) if j != i]
    pred = knn_predict(X_tr, y_tr, X_norm[i], k=3)
    if pred == y[i]: correct += 1
accuracy = correct / len(y)

# 6. Report
report = generate_report(stats, accuracy)
print(report)

with open('report.txt', 'w') as f:
    f.write(report)
print('Report saved to report.txt')
```

The pipeline executes beautifully, tracking its progress and returning a perfectly parsed list of dictionary rows, which handles missing values seamlessly, extracts necessary statistical data, computes accuracy using leave-one-out cross validation, and outputs a formatted, human-readable report.
