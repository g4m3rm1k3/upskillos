// Ordered curriculum, not a claim that planned lessons have been implemented.
// Each lab ends with observable evidence rather than a “read = mastered” badge.
export const phases = [
  { title: 'Start from first principles', goal: 'Connect measurements, mathematics, code, and honest evaluation.', labs: [
    ['Foundations & your first learning algorithm', 'Arrays, shapes, weights, dot products, derivatives, chain rule, regression and batch gradient descent.', 'Build a NumPy regression model and inspect every update.', 'Explain each parameter, derive the gradient, diagnose divergence, and compare against a mean baseline.'],
    ['Data handling & reproducible experiments', 'Python functions, NumPy indexing and broadcasting, pandas, missing values, plots, seeds and basic tests.', 'Turn a small CSV into a documented, repeatable experiment.', 'Reproduce a result from a clean run and explain every data-cleaning decision.'],
    ['Vectors, matrices & multiple inputs', 'Features versus observations, matrix multiplication, projections, rank, least squares and training-only scaling.', 'Extend regression to several features and compare gradient descent with a numerical least-squares solver.', 'Track every array shape and explain what correlated or constant inputs do to the solution.'],
  ]},
  { title: 'Learn to reason about evidence', goal: 'Understand uncertainty and decide whether a model is useful.', labs: [
    ['Probability through simulation', 'Random variables, distributions, expectation, variance, conditional probability, independence and Bayes’ rule.', 'Simulate a noisy sensor and update a probability after observing evidence.', 'Distinguish a conditional probability from its reverse and verify calculations by simulation.'],
    ['Statistics & estimation', 'Samples versus populations, estimators, sampling variation, bootstrap intervals, likelihood and correlation versus causation.', 'Repeat an experiment on resampled datasets and quantify uncertainty.', 'Explain what an interval means and why a single score is insufficient evidence.'],
    ['Evaluation without leakage', 'Train/validation/test roles, cross-validation, grouped and temporal splits, baselines, preprocessing pipelines and test-set discipline.', 'Audit a deliberately leaky experiment, then repair it.', 'Choose a split that matches future use and show why the original score was misleading.'],
    ['Overfitting, regularization & learning curves', 'Polynomial features, bias/variance, L1/L2 penalties, model complexity and sample size.', 'Fit increasingly flexible models and compare training and validation curves.', 'Diagnose underfitting versus overfitting and justify a model choice without tuning on the test set.'],
  ]},
  { title: 'Build classical machine learning', goal: 'Derive core methods and choose them based on evidence.', labs: [
    ['Logistic regression from scratch', 'Linear scores, sigmoid, log odds, Bernoulli likelihood, binary cross-entropy and gradients.', 'Implement a probabilistic classifier and draw its decision boundary.', 'Derive the objective, check gradients, and explain why a probability is not yet a decision.'],
    ['Classification decisions & metrics', 'Confusion matrices, precision/recall, ROC/PR curves, imbalance, thresholds, calibration and error costs.', 'Choose a threshold for a simulated alert system.', 'Defend a threshold using costs and explain when accuracy is misleading.'],
    ['Nearest neighbors & distance', 'Distances, feature scales, local decision rules and the curse of dimensionality.', 'Build k-NN and inspect which examples determine each prediction.', 'Explain how scaling and k alter predictions, runtime and generalization.'],
    ['Naive Bayes & text features', 'Conditional independence, class priors, counts, smoothing, log probabilities and bag-of-words representations.', 'Build a small text classifier using training-only vocabulary fitting.', 'Trace a prediction numerically and identify where the independence assumption fails.'],
    ['Decision trees', 'Recursive splitting, thresholds, impurity, information gain, depth and pruning.', 'Build and visualize a small tree from scratch.', 'Calculate a split score, explain a prediction path and diagnose an overfit tree.'],
    ['Bagging & random forests', 'Bootstrap samples, feature subsampling, ensemble variance and out-of-bag estimates.', 'Combine trees and compare their errors and correlations.', 'Explain why an ensemble may generalize better and where its evaluation can fail.'],
    ['Boosting', 'Sequential error correction, residual fitting, shrinkage, tree depth and early stopping.', 'Build a small gradient-boosting regressor before using a library.', 'Explain what each new learner fits and diagnose overfitting through validation.'],
    ['Margins & support vector machines', 'Hyperplanes, margins, hinge loss, regularization and the kernel idea.', 'Explore maximum-margin classification on small 2D datasets.', 'Explain support vectors and compare a linear margin model with logistic regression.'],
    ['Capstone: a useful tabular model', 'Feature engineering, systematic comparisons, bounded tuning, error analysis and reproducible reporting.', 'Predict processing time, output size or another measured project outcome.', 'Beat a justified baseline on an untouched test set—or document why the model should be rejected.'],
  ]},
  { title: 'Understand geometry and hidden structure', goal: 'Find structure without confusing it with ground truth.', labs: [
    ['Clustering & anomaly detection', 'k-means, initialization, centroid updates, density-based clustering and anomaly scores.', 'Cluster synthetic and real observations; inspect cases where distance-based methods fail.', 'Explain why a cluster is not automatically a real category and evaluate stability.'],
    ['Eigenvectors, SVD & PCA', 'Bases, projections, covariance, eigenvectors, singular values, explained variance and reconstruction error.', 'Implement PCA and compress a small dataset.', 'Derive the projection, explain centering and compare reconstruction against retained variance.'],
    ['Time-dependent data', 'Lags, rolling features, autocorrelation, forecasting horizons, walk-forward evaluation and temporal leakage.', 'Forecast a measured resource usage series with a simple baseline and lagged model.', 'Ensure every feature exists at prediction time and compare against a seasonal or persistence baseline.'],
  ]},
  { title: 'Derive and implement neural networks', goal: 'Understand the computation before relying on automatic differentiation.', labs: [
    ['Computation graphs & backpropagation', 'Local derivatives, chain rule through branches, gradient accumulation and numerical checking.', 'Build a tiny scalar automatic-differentiation engine.', 'Trace forward values and backward derivatives by hand, including shared inputs.'],
    ['A neural network in NumPy', 'Dense layers, nonlinear activations, matrix shapes, softmax, stable cross-entropy and training loops.', 'Train a small network on XOR and synthetic classification data.', 'Implement forward and backward passes and check every layer’s gradients.'],
    ['Optimization & training failures', 'Batch versus stochastic gradients, mini-batches, momentum, Adam, schedules, initialization and gradient scale.', 'Compare optimizers on controlled landscapes and neural networks.', 'Explain optimizer state and distinguish numerical bugs from optimization or generalization failures.'],
    ['PyTorch with understanding', 'Tensors, autograd, modules, data loaders, device placement, train/eval modes and checkpointing.', 'Reproduce the NumPy model in PyTorch.', 'Match a forward pass and gradients, resume training and explain what the framework handles.'],
    ['Convolution & computer vision', 'Kernels, stride, padding, feature maps, receptive fields, augmentation and transfer learning.', 'Implement a convolution, then train or adapt a small image classifier.', 'Trace which pixels affect an output and evaluate without image-source leakage.'],
    ['Embeddings & sequence models', 'Tokens, embedding tables, sequence order, recurrent state, padding and masking.', 'Build a small sequence classifier with a baseline.', 'Explain representation shapes and identify shortcut learning or split contamination.'],
    ['Attention & a tiny transformer', 'Queries, keys, values, scaled dot-product attention, masking, positional information, residuals and normalization.', 'Implement attention and assemble a small transformer.', 'Trace attention dimensions and explain what attention weights do and do not establish.'],
    ['Capstone: a deep-learning investigation', 'Dataset suitability, transfer learning, ablations, compute budgets and qualitative error analysis.', 'Solve a modest image or text problem and compare with a simpler model.', 'Show which changes help, report failures, and justify the computational cost.'],
  ]},
  { title: 'Engineer reliable ML systems', goal: 'Turn an experiment into maintainable software with measurable behavior.', labs: [
    ['Data contracts & reproducible training', 'Schema checks, data quality, versioned datasets, configurations, environments and experiment tracking.', 'Package a repeatable training pipeline with validated inputs.', 'Rebuild a model from recorded data/code/configuration versions and catch bad inputs early.'],
    ['Serving & integration', 'Batch versus online prediction, preprocessing parity, model serialization, APIs, latency and resource limits.', 'Integrate a trained model into an everyday application.', 'Test the full prediction contract and compare served predictions with offline results.'],
    ['Testing, monitoring & drift', 'Unit/integration tests, data and prediction monitoring, delayed labels, drift, alerts and rollback.', 'Introduce a controlled data shift into a deployed demo.', 'Detect a meaningful failure, separate drift from proven performance loss, and recover safely.'],
    ['Responsible decisions & communication', 'Privacy, dataset permissions, subgroup evaluation, explainability limits, human review and model documentation.', 'Write a model card and audit one model’s failure cases.', 'State intended use, limitations and who may be affected; avoid unsupported fairness or causal claims.'],
    ['Retraining & delivery', 'CI checks, release artifacts, promotion criteria, staged deployment, feedback loops and retraining triggers.', 'Ship a versioned update with a rollback path.', 'Demonstrate that an update improves the chosen criteria without silently changing the prediction contract.'],
    ['Final capstone: an end-to-end ML product', 'Problem framing, data collection, baselines, modeling, deployment, monitoring and maintenance.', 'Build one useful application using your own measured project data.', 'Deliver reproducible evidence, tested software, a working demo, a model card and an honest maintenance plan.'],
  ]},
  { title: 'Optional specializations after the core', goal: 'Choose a branch because your project needs it; these are not required for every ML engineer.', optional: true, labs: [
    ['Retrieval & language-model applications', 'Embeddings for retrieval, ranking, retrieval-augmented generation, evaluation sets, grounding and operational costs.', 'Build a small document-search assistant with a measured retrieval baseline.', 'Evaluate retrieval and answer quality separately, with failure cases and data permissions documented.'],
    ['Recommender systems', 'Implicit/explicit feedback, collaborative filtering, ranking and offline-versus-online evaluation.', 'Build a recommendation prototype.', 'Avoid user/time leakage and explain cold-start and feedback-loop limitations.'],
    ['Causal inference & experimentation', 'Confounding, interventions, randomized experiments and assumptions behind causal estimates.', 'Design an experiment for a product decision.', 'Distinguish predicting an outcome from estimating the effect of changing an input.'],
    ['Reinforcement learning', 'States, actions, rewards, policies, value functions and exploration.', 'Train a small agent in a controlled simulator.', 'Compare with a simple policy and diagnose reward misspecification without confusing it with supervised learning.'],
    ['Research replication & advanced modeling', 'Reading papers, reproducing baselines, ablations, uncertainty and choosing deeper work such as generative modeling.', 'Reproduce a small published result within a stated compute budget.', 'Separate replicated findings, deviations and unsupported conclusions.'],
  ]},
]

let sequence = 0
export const roadmap = phases.map(phase => ({
  ...phase,
  labs: phase.labs.map(([title, topics, build, evidence]) => ({
    number: ++sequence, title, topics, build, evidence, available: sequence === 1,
  })),
}))
