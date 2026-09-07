// Guttag — Lesson 46: Evaluating Models
// Auto-converted from src/docs/tutorials/guttag-python/lesson-46.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {
  id: 'gp-46-evaluating-models',
  slug: 'evaluating-models',
  chapter: 7,
  order: 4,
  title: 'Evaluating Models',
  subtitle: 'Confusion Matrices, ROC, and Cross-Validation',
  tags: ['confusion-matrix', 'accuracy', 'precision', 'recall-sensitivity', 'f1-score', 'roc-curve-receiver-operating-characteristic'],

  hook: {
    question: 'What is "Evaluating Models", and why does it matter?',
    realWorldContext: 'You will build a comprehensive model evaluation script that correctly diagnoses classifier performance. The transferable problems you will solve are: (1) accuracy is a MISLEADING metric on imbalanced datasets — a model that predicts the majority class always achieves high accuracy; (2) precision and recall are the right metrics for imbalanced problems; the F1 score balances them; (3) the ROC curve and AUC measure a model’s discriminative ability across ALL thresholds, not just the default 0.5.',
    previewVisualizationId: 'PythonNotebook',
  },

  intuition: {
    prose: [
      'This lesson covers 5 core ideas: The Confusion Matrix, The Imbalanced Problem, Precision, Recall, and F1, ROC Curve and AUC, Cross-Validation.',
    ],
    callouts: [
      {
        type: 'definition',
        title: 'Key Terms',
        body: '- **Confusion matrix:** A table used to describe the performance of a classification model. It exists to show exactly where a model is making errors (false positives vs false negatives), not just overall accuracy.\n- **Accuracy:** The fraction of predictions a model got right. It exists as a simple baseline metric, but fails on imbalanced datasets because predicting the majority class yields high accuracy without actually learning anything useful.\n- **Precision:** The fraction of positive predictions that were actually positive. It exists to measure a model\'s exactness and penalize false positives, which is critical when false alarms are costly (e.g., spam filtering).\n- **Recall (Sensitivity):** The fraction of actual positives that were correctly identified. It exists to measure a model\'s completeness and penalize false negatives, critical when missing a positive is dangerous (e.g., medical diagnosis).\n- **F1 Score:** The harmonic mean of precision and recall. It exists to provide a single metric that balances both exactness and completeness, especially when dealing with imbalanced datasets.\n- **ROC Curve (Receiver Operating Characteristic):** A plot of the true positive rate against the false positive rate at various classification thresholds. It exists to evaluate a model\'s performance across all possible thresholds.\n- **AUC (Area Under the Curve):** The integral of the ROC curve. It exists to summarize the ROC curve into a single number between 0.0 and 1.0, representing discriminative ability.\n- **Cross-validation:** A resampling procedure used to evaluate machine learning models on a limited data sample. It exists to ensure that performance metrics are not dependent on a single, lucky train-test split.\n- **Stratification:** The process of rearranging the data so as to ensure that each fold is a good representative of the whole. It exists to maintain the original class proportions in every data split.',
      },
      {
        type: 'definition',
        title: 'Built-ins & Methods Used',
        body: '- **sklearn.metrics.confusion_matrix:** A function that computes the confusion matrix to evaluate the accuracy of a classification.\n- **sklearn.metrics.accuracy_score:** A function that computes subset accuracy.\n- **sklearn.metrics.precision_score:** A function to compute the precision.\n- **sklearn.metrics.recall_score:** A function to compute the recall.\n- **sklearn.metrics.f1_score:** A function to compute the F1 score.\n- **sklearn.metrics.classification_report:** A function that builds a text report showing the main classification metrics.\n- **sklearn.metrics.roc_curve:** A function to compute Receiver operating characteristic (ROC) coordinates.\n- **sklearn.metrics.auc:** A function to compute Area Under the Curve (AUC) using the trapezoidal rule.\n- **sklearn.tree.DecisionTreeClassifier.predict_proba:** A method that predicts class probabilities for the input samples.\n- **sklearn.model_selection.KFold:** A cross-validation generator that splits datasets into k consecutive folds.\n- **sklearn.model_selection.StratifiedKFold:** A cross-validation generator that yields stratified folds.\n- **sklearn.model_selection.cross_val_score:** A function to evaluate a score by cross-validation.',
      },
    ],
    visualizations: [
      {
        id: 'PythonNotebook',
        title: 'Lesson 46: Evaluating Models',
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: 'Evaluating Models',
        props: {
          initialCells: [
            {
              id: 1,
              cellTitle: 'The Confusion Matrix',
              prose: [
                'If a model claims to be "95% accurate", what does that actually mean? Does it make mistakes evenly across all categories, or does it specifically fail on one crucial category? We need a way to look inside the aggregate "accuracy" number and see exactly *what kind* of mistakes the model is making. If you have three classes, and the model guesses wrong, you want to know: did it mistake class A for class B, or class A for class C?',
                'This output proves that out of 3 actual `0`s, all 3 were predicted as `0`. Out of 2 actual `1`s, 1 was predicted as `1`, but 1 was mistakenly predicted as `0`. The diagonal contains correct predictions.'
              ],
              typeIt: true,
              solution: 'from sklearn.metrics import confusion_matrix\n\n# True labels for 5 samples\ny_true_lab = [0, 1, 0, 1, 0]\n# The model\'s predictions\ny_pred_lab = [0, 0, 0, 1, 0]\n\ncm_lab = confusion_matrix(y_true_lab, y_pred_lab)\nprint(cm_lab)\n# Output:\n# [[3 0]\n#  [1 1]]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 2,
              cellTitle: 'The Confusion Matrix — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `cm = confusion_matrix(y_test, y_pred)`: Calls the `confusion_matrix` function, passing the ground truth labels `y_test` and the model\'s predictions `y_pred`. It returns a 2D numpy array where row `i` and column `j` denotes the number of true instances of class `i` predicted as class `j`.\n- `print(cm)`: Prints the matrix. For the Iris dataset (3 classes), this will be a 3x3 grid.\n- `np.trace(cm)`: Computes the sum of the diagonal elements of the matrix. The diagonal represents all instances where the true label equals the predicted label (correct predictions).\n- `cm.sum()`: Computes the sum of all elements in the matrix, which equals the total number of test samples.\n- `np.trace(cm)/cm.sum()`: Divides the correct predictions by the total predictions, which is the exact mathematical definition of overall accuracy.\n---'
              ],
              typeIt: true,
              solution: 'from sklearn.datasets import load_iris\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.metrics import confusion_matrix\nimport numpy as np\n\niris = load_iris()\nX_train, X_test, y_train, y_test = train_test_split(\n    iris.data, iris.target, test_size=0.2, random_state=42, stratify=iris.target\n)\n\nclf = DecisionTreeClassifier(max_depth=3, random_state=42)\nclf.fit(X_train, y_train)\ny_pred = clf.predict(X_test)\n\ncm = confusion_matrix(y_test, y_pred)\nprint(\'Confusion matrix:\')\nprint(cm)\nprint(f\'\\nAccuracy: {np.trace(cm)/cm.sum():.4f}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 3,
              cellTitle: 'The Imbalanced Problem',
              prose: [
                'What if a dataset has 99% legitimate transactions and 1% fraudulent ones? If a model simply hardcodes its prediction to *always* say "legitimate", what will its accuracy be? It will be 99% accurate, despite having learned absolutely nothing and being completely useless for fraud detection. Accuracy is a deeply misleading metric for imbalanced datasets.',
                'This output proves that a completely naive model achieves 99% accuracy while detecting exactly 0 fraud cases (represented by the `10` in the bottom-left, meaning 10 actual positive cases were incorrectly labeled as negative).'
              ],
              typeIt: true,
              solution: 'import numpy as np\nfrom sklearn.metrics import accuracy_score, confusion_matrix\n\nrng = np.random.RandomState(42)\ny_true_imb = rng.choice([0, 1], size=1000, p=[0.99, 0.01])\ny_naive = np.zeros(1000, dtype=int)\n\nprint(f\'Naive accuracy: {accuracy_score(y_true_imb, y_naive):.4f}\')\nprint(confusion_matrix(y_true_imb, y_naive))\n# Output:\n# Naive accuracy: 0.9900\n# [[990   0]\n#  [ 10   0]]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 4,
              cellTitle: 'The Imbalanced Problem — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `rng.choice([0, 1], size=1000, p=[0.99, 0.01])`: Generates an array of 1000 elements, randomly choosing `0` or `1`, with a 99% probability of `0` and a 1% probability of `1`. This simulates our imbalanced true labels.\n- `np.zeros(1000, dtype=int)`: Generates an array of 1000 zeros. This simulates a "naive" model that predicts the negative class unconditionally.\n- `accuracy_score(y_true_fraud, y_naive_fraud)`: Calculates the accuracy, which mathematically evaluates to 0.9900.\n- `confusion_matrix(y_true_fraud, y_naive_fraud)`: Calculates the confusion matrix, highlighting that all `1`s (frauds) were predicted as `0`s (false negatives).\n- `print(\'Naive recall for fraud: 0.0000\')`: Hardcoded string emphasizing that despite the high accuracy, the model caught exactly 0 out of the 10 fraud cases.\n---'
              ],
              typeIt: true,
              solution: 'rng = np.random.RandomState(42)\ny_true_fraud = rng.choice([0, 1], size=1000, p=[0.99, 0.01])\ny_naive_fraud = np.zeros(1000, dtype=int)\n\nprint(\'\\n--- Fraud Detection Simulation ---\')\nprint(f\'Naive accuracy: {accuracy_score(y_true_fraud, y_naive_fraud):.4f}\')\nprint(f\'Naive CM:\\n{confusion_matrix(y_true_fraud, y_naive_fraud)}\')\nprint(\'Naive recall for fraud: 0.0000\') ',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 5,
              cellTitle: 'Precision, Recall, and F1',
              prose: [
                'If accuracy doesn\'t work for imbalanced datasets, what do we use instead? We need metrics that explicitly penalize the model for missing the minority class (false negatives) and for crying wolf (false positives).',
                'This output proves the manual calculation of these metrics based on true positives (TP), false positives (FP), and false negatives (FN). The harmonic mean (F1) balances both.'
              ],
              typeIt: true,
              solution: 'def precision_recall_f1(y_true, y_pred, pos_label=1):\n    tp = sum(1 for t, p in zip(y_true, y_pred) if t == pos_label and p == pos_label)\n    fp = sum(1 for t, p in zip(y_true, y_pred) if t != pos_label and p == pos_label)\n    fn = sum(1 for t, p in zip(y_true, y_pred) if t == pos_label and p != pos_label)\n    precision = tp / (tp + fp) if (tp + fp) > 0 else 0\n    recall    = tp / (tp + fn) if (tp + fn) > 0 else 0\n    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0\n    return precision, recall, f1\n\ny_true_ex = [1, 1, 1, 0, 0, 0, 0, 0, 1, 0]\ny_pred_ex = [1, 1, 0, 0, 1, 0, 0, 0, 1, 0]\np, r, f = precision_recall_f1(y_true_ex, y_pred_ex)\nprint(f\'{p:.4f}, {r:.4f}, {f:.4f}\')\n# Output:\n# 0.7500, 0.7500, 0.7500',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 6,
              cellTitle: 'Precision, Recall, and F1 — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `precision_score(y_test_c, y_pred_c)`: Calculates precision. Out of all the tumors the model claimed were benign (class 1), what fraction actually were benign?\n- `recall_score(y_test_c, y_pred_c)`: Calculates recall. Out of all the truly benign tumors, what fraction did the model successfully find? (Note: in this dataset, 1 is benign, 0 is malignant. For cancer diagnosis, we often care more about the recall of the *malignant* class to avoid missing a diagnosis).\n- `f1_score(y_test_c, y_pred_c)`: Computes the harmonic mean of the two values above.\n- `classification_report(y_test_c, y_pred_c, target_names=...)`: Generates a string table that computes precision, recall, and f1 for *both* the malignant and benign classes independently, so you don\'t have to choose just one "positive" label.\n---'
              ],
              typeIt: true,
              solution: 'from sklearn.metrics import precision_score, recall_score, f1_score, classification_report\nfrom sklearn.datasets import load_breast_cancer\n\ncancer = load_breast_cancer()\nX_train_c, X_test_c, y_train_c, y_test_c = train_test_split(\n    cancer.data, cancer.target, test_size=0.2, random_state=42\n)\nclf_c = DecisionTreeClassifier(max_depth=5, random_state=42)\nclf_c.fit(X_train_c, y_train_c)\ny_pred_c = clf_c.predict(X_test_c)\n\nprint(\'\\n--- Breast Cancer Detection ---\')\nprint(f\'Precision: {precision_score(y_test_c, y_pred_c):.4f}\')\nprint(f\'Recall:    {recall_score(y_test_c, y_pred_c):.4f}\')\nprint(f\'F1:        {f1_score(y_test_c, y_pred_c):.4f}\')\nprint(\'\\nClassification Report:\')\nprint(classification_report(y_test_c, y_pred_c, target_names=[\'malignant\',\'benign\']))',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 7,
              cellTitle: 'ROC Curve and AUC',
              prose: [
                'A classifier typically outputs a probability (e.g., "70% chance this is malignant"). By default, `predict()` uses a threshold of 50%: anything > 50% is positive, anything < 50% is negative. But what if we change that threshold to 10% to be extra safe and catch more cases? How do we evaluate the model\'s ability to rank items *regardless* of the arbitrary 50% threshold?',
                'This output proves that given raw probability scores, the `roc_curve` function calculates the false positive rates and true positive rates across all thresholds, and `auc` calculates the area. 1.0 is perfect, 0.5 is random guessing.'
              ],
              typeIt: true,
              solution: 'from sklearn.metrics import roc_curve, auc\n\ny_true_roc = [0, 0, 1, 1]\ny_scores_roc = [0.1, 0.4, 0.35, 0.8]\n\nfpr_lab, tpr_lab, thresholds_lab = roc_curve(y_true_roc, y_scores_roc)\nprint(auc(fpr_lab, tpr_lab))\n# Output:\n# 0.75',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 8,
              cellTitle: 'ROC Curve and AUC — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `clf_c.predict_proba(X_test_c)`: Instead of `predict()`, which returns hard `0` or `1` classifications based on a 50% threshold, `predict_proba` returns an array of shape `(n_samples, n_classes)` containing the probabilities.\n- `[:, 1]`: Slices the numpy array to get only the probabilities for class `1` (the positive class).\n- `roc_curve(y_test_c, y_scores)`: Calculates the False Positive Rate (`fpr`), True Positive Rate (`tpr`), and the probability thresholds used to calculate those rates.\n- `auc(fpr, tpr)`: Integrates the area under the curve formed by the `fpr` and `tpr` points.\n- `plt.subplots(...)`, `ax.plot(...)`, `plt.savefig(...)`: Uses matplotlib to draw the ROC curve, plotting FPR on the X-axis and TPR on the Y-axis. The `k--` line represents a random classifier for baseline comparison.\n---'
              ],
              typeIt: true,
              solution: 'from sklearn.metrics import roc_curve, auc\nimport matplotlib.pyplot as plt\n\ny_scores = clf_c.predict_proba(X_test_c)[:, 1]\n\nfpr, tpr, thresholds = roc_curve(y_test_c, y_scores)\nroc_auc = auc(fpr, tpr)\n\nfig, ax = plt.subplots(figsize=(7, 6))\nax.plot(fpr, tpr, \'b-\', label=f\'ROC curve (AUC = {roc_auc:.3f})\')\nax.plot([0,1],[0,1],\'k--\', label=\'Random classifier (AUC=0.5)\')\nax.set_xlabel(\'False Positive Rate\')\nax.set_ylabel(\'True Positive Rate (Recall)\')\nax.set_title(\'ROC Curve — Breast Cancer\')\nax.legend()\nplt.tight_layout()\nplt.savefig(\'roc_curve.png\')\nplt.close()\nprint(f\'\\nAUC: {roc_auc:.4f}\')',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 9,
              cellTitle: 'Cross-Validation',
              prose: [
                'We\'ve been using a single train/test split. What if, by pure luck, the test set happens to contain only the easiest examples? Our metrics will look amazing, but the model will fail in production. How do we ensure our evaluation is stable and independent of a single lucky split?',
                'This output proves that KFold cross-validation splits the data into multiple different train/test sets, ensuring that every single sample gets to be in the test set exactly once.'
              ],
              typeIt: true,
              solution: 'from sklearn.model_selection import KFold\nimport numpy as np\n\nX_dummy = np.array([1, 2, 3, 4, 5, 6])\nkf = KFold(n_splits=3)\n\nfor train_index, test_index in kf.split(X_dummy):\n    print(f"TRAIN: {train_index} TEST: {test_index}")\n# Output:\n# TRAIN: [2 3 4 5] TEST: [0 1]\n# TRAIN: [0 1 4 5] TEST: [2 3]\n# TRAIN: [0 1 2 3] TEST: [4 5]',
              code: '',
              output: '', status: 'idle', figureJson: null,
            },
            {
              id: 10,
              cellTitle: 'Cross-Validation — applied in a real function',
              prose: [
                '## How the Code Works',
                '- `KFold(n_splits=5, shuffle=True, random_state=42)`: Creates a cross-validation strategy that will divide the dataset into 5 equal parts. `shuffle=True` ensures the data is randomized before splitting.\n- `StratifiedKFold(...)`: Creates a similar 5-split strategy, but ensures that the proportion of positive and negative classes is exactly preserved in every single fold. For classification, you should almost always use this over `KFold`.\n- `cross_val_score(clf_cv, X, y, cv=cv_strategy, scoring=\'f1\')`: Orchestrates the entire process. For the 5 folds provided by `cv_strategy`, it automatically takes 4 folds to train `clf_cv`, evaluates it on the remaining 1 test fold using the `f1` metric, and repeats this 5 times. It returns a numpy array of 5 scores.\n- `scores.mean()`: Calculates the average F1 score across all folds.\n- `scores.std()`: Calculates the standard deviation, showing how stable the model is. A high standard deviation means performance swings wildly depending on the split.\n---'
              ],
              typeIt: true,
              solution: 'from sklearn.model_selection import KFold, StratifiedKFold, cross_val_score\n\nX, y = cancer.data, cancer.target\nclf_cv = DecisionTreeClassifier(max_depth=5, random_state=42)\n\nprint(\'\\n--- Cross-Validation ---\')\nfor cv_name, cv_strategy in [\n    (\'5-Fold\',           KFold(n_splits=5, shuffle=True, random_state=42)),\n    (\'Stratified 5-Fold\', StratifiedKFold(n_splits=5, shuffle=True, random_state=42)),\n    (\'10-Fold\',          KFold(n_splits=10, shuffle=True, random_state=42)),\n]:\n    scores = cross_val_score(clf_cv, X, y, cv=cv_strategy, scoring=\'f1\')\n    print(f\'{cv_name}: mean F1={scores.mean():.4f} (+/- {scores.std():.4f})\')',
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
      'Next lesson: Capstone.',
    ],
  },

  quiz: [
    {
      id: 'q1',
      type: 'choice',
      text: 'Which of these best defines "Precision"?',
      options: [
        'The integral of the ROC curve. It exists to summarize the ROC curve into a single number between 0.0 and 1.0, representing discriminative ability.',
        'A resampling procedure used to evaluate machine learning models on a limited data sample. It exists to ensure that performance metrics are not dependent on a single, lucky train-test split.',
        'The fraction of positive predictions that were actually positive. It exists to measure a model\'s exactness and penalize false positives, which is critical when false alarms are costly (e.g., spam filtering).'
      ],
      correct: 2,
    },
    {
      id: 'q2',
      type: 'choice',
      text: 'Which of these best defines "Accuracy"?',
      options: [
        'A table used to describe the performance of a classification model. It exists to show exactly where a model is making errors (false positives vs false negatives), not just overall accuracy.',
        'The fraction of predictions a model got right. It exists as a simple baseline metric, but fails on imbalanced datasets because predicting the majority class yields high accuracy without actually learning anything useful.',
        'A resampling procedure used to evaluate machine learning models on a limited data sample. It exists to ensure that performance metrics are not dependent on a single, lucky train-test split.'
      ],
      correct: 1,
    },
    {
      id: 'q3',
      type: 'choice',
      text: 'Which of these best defines "Confusion matrix"?',
      options: [
        'The fraction of actual positives that were correctly identified. It exists to measure a model\'s completeness and penalize false negatives, critical when missing a positive is dangerous (e.g., medical diagnosis).',
        'A table used to describe the performance of a classification model. It exists to show exactly where a model is making errors (false positives vs false negatives), not just overall accuracy.',
        'The fraction of positive predictions that were actually positive. It exists to measure a model\'s exactness and penalize false positives, which is critical when false alarms are costly (e.g., spam filtering).'
      ],
      correct: 1,
    },
    {
      id: 'q4',
      type: 'choice',
      text: 'Which of these best defines "ROC Curve (Receiver Operating Characteristic)"?',
      options: [
        'The harmonic mean of precision and recall. It exists to provide a single metric that balances both exactness and completeness, especially when dealing with imbalanced datasets.',
        'A plot of the true positive rate against the false positive rate at various classification thresholds. It exists to evaluate a model\'s performance across all possible thresholds.',
        'A resampling procedure used to evaluate machine learning models on a limited data sample. It exists to ensure that performance metrics are not dependent on a single, lucky train-test split.'
      ],
      correct: 1,
    },
  ],

  mentalModel: [
    '**Confusion matrix** — A table used to describe the performance of a classification model. It exists to show exactly where a model is making errors (false positives vs false negatives), not just overall accuracy.',
    '**Accuracy** — The fraction of predictions a model got right. It exists as a simple baseline metric, but fails on imbalanced datasets because predicting the majority class yields high accuracy without actually learning anything useful.',
    '**Precision** — The fraction of positive predictions that were actually positive. It exists to measure a model\'s exactness and penalize false positives, which is critical when false alarms are costly (e.g., spam filtering).',
    '**Recall (Sensitivity)** — The fraction of actual positives that were correctly identified. It exists to measure a model\'s completeness and penalize false negatives, critical when missing a positive is dangerous (e.g., medical diagnosis).',
    '**F1 Score** — The harmonic mean of precision and recall. It exists to provide a single metric that balances both exactness and completeness, especially when dealing with imbalanced datasets.',
    '**ROC Curve (Receiver Operating Characteristic)** — A plot of the true positive rate against the false positive rate at various classification thresholds. It exists to evaluate a model\'s performance across all possible thresholds.',
    '**AUC (Area Under the Curve)** — The integral of the ROC curve. It exists to summarize the ROC curve into a single number between 0.0 and 1.0, representing discriminative ability.',
    '**Cross-validation** — A resampling procedure used to evaluate machine learning models on a limited data sample. It exists to ensure that performance metrics are not dependent on a single, lucky train-test split.',
  ],

  checkpoints: ['read-intuition'],
}
