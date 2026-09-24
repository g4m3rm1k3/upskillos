import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 59,
  short: 'Interpretability',
  question: 'Which features does a model rely on, and why did it make this particular prediction?',
  intro: 'Permutation and gain importance, partial dependence and ICE curves, exact Shapley values, local surrogate models and counterfactual explanations — and what each one can and cannot tell you.',
  lessons, sources, python,
  math: ['dm.counting', 'stat.center', 'la.leastsq', 'stat.correlation'],
  lessonAware: true,
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Explaining a model versus the world, permutation importance on held-out data, gain-importance bias, correlated features and drop-column importance, partial dependence, ICE and centred ICE, extrapolation and ALE, cooperative games and Shapley values, value functions and background sets, the Shapley axioms, SHAP estimators, LIME-style local surrogates with kernel width, fidelity and effective sample size, global surrogates, counterfactual explanations with distance, sparsity, actionability and plausibility, recourse versus causation, and inherently interpretable models.',
}
