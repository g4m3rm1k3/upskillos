// Every implemented lab registers here, in curriculum order. A lab module
// provides its lessons, sources, scope, Python challenge and Playground.
import lab01 from './l01-foundations/index.js'
import lab02 from './l02-data/index.js'
import lab03 from './l03-matrices/index.js'
import lab04 from './l04-probability/index.js'
import lab05 from './l05-statistics/index.js'
import lab06 from './l06-evaluation/index.js'
import lab07 from './l07-regularization/index.js'
import lab08 from './l08-logistic/index.js'
import lab09 from './l09-metrics/index.js'
import lab10 from './l10-knn/index.js'
import lab11 from './l11-naive-bayes/index.js'
import lab12 from './l12-trees/index.js'
import lab13 from './l13-forests/index.js'
import lab14 from './l14-boosting/index.js'
import lab15 from './l15-svm/index.js'
import lab16 from './l16-capstone/index.js'
import lab17 from './l17-clustering/index.js'
import lab18 from './l18-pca/index.js'
import lab19 from './l19-timeseries/index.js'
import lab20 from './l20-backprop/index.js'
import lab21 from './l21-mlp/index.js'
import lab22 from './l22-optimization/index.js'
import lab23 from './l23-pytorch/index.js'
import lab24 from './l24-convolution/index.js'
import lab25 from './l25-sequences/index.js'

export const labs = [lab01, lab02, lab03, lab04, lab05, lab06, lab07, lab08, lab09, lab10, lab11, lab12, lab13, lab14, lab15, lab16, lab17, lab18, lab19, lab20, lab21, lab22, lab23, lab24, lab25]
const byNumber = new Map(labs.map(lab => [lab.number, lab]))
export const labByNumber = number => byNumber.get(number) ?? labs[0]
export const isAvailable = number => byNumber.has(number)
export const labForLesson = id => labs.find(lab => lab.lessons.some(lesson => lesson.id === id))
