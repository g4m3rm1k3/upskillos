import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'

export default {
  number: 61,
  short: 'Robustness & distribution shift',
  question: 'What happens when the data a model meets are not the data it learned from — by accident or by design?',
  intro: 'Adversarial examples with FGSM and PGD, adversarial training, covariate shift and importance weighting, label shift and prior correction, and domain adaptation by feature alignment.',
  lessons, sources, python,
  math: ['ai.norms', 'calc.linapprox', 'ai.sampling', 'la.special', 'la.eigen'],
  lessonAware: true,
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Adversarial examples and threat models, FGSM and the linear explanation, PGD and gradient masking, adversarial training as min–max optimization, robust margins, certified defences and randomized smoothing, covariate, label and concept shift, importance weighting and domain classifiers, effective sample size and weight flattening, shift detection, black-box shift estimation and prior correction, CORAL, domain-adversarial training, the Ben-David bound, spurious correlations and group DRO.',
}
