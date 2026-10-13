// Every figure a lesson can place with { figure: 'Name', props }.
import Motion from './Motion.jsx'
import { PredictFig, FunctionMachine, IndexFig, SigmaFig, PowerFig, CompoundFig, LogFig, SigmoidBuilder, ArgminFig } from './part1.jsx'
import { SlopeFig, ZoomFig, DerivativeFig, RulesFig, ExpSlopeFig, ChainFig, MinimumFig, Descent1D, SurfaceFig, GradientFig, Descent2D, AreaFig } from './part2.jsx'
import { VectorFig, NormFig, DotFig, MatVecFig, TransformFig, MatMulFig, SystemFig, LeastSquaresFig, EigenFig } from './part3.jsx'
import { DiceGrid, DistributionFig, SpreadFig, BayesFig, DensityFig, NormalBuilder, SamplingFig, LikelihoodFig, ScatterFig, PCAFig } from './part4.jsx'
import { RegressionFig, RidgeFig, LogisticFig, SoftmaxFig, EntropyFig, NetworkFig, OptimiserFig, AttentionFig } from './part5.jsx'
import { EquationAnatomy } from './part6.jsx'

export const FIGURES = {
  Motion,
  PredictFig, FunctionMachine, IndexFig, SigmaFig, PowerFig, CompoundFig, LogFig, SigmoidBuilder, ArgminFig,
  SlopeFig, ZoomFig, DerivativeFig, RulesFig, ExpSlopeFig, ChainFig, MinimumFig, Descent1D, SurfaceFig, GradientFig, Descent2D, AreaFig,
  VectorFig, NormFig, DotFig, MatVecFig, TransformFig, MatMulFig, SystemFig, LeastSquaresFig, EigenFig,
  DiceGrid, DistributionFig, SpreadFig, BayesFig, DensityFig, NormalBuilder, SamplingFig, LikelihoodFig, ScatterFig, PCAFig,
  RegressionFig, RidgeFig, LogisticFig, SoftmaxFig, EntropyFig, NetworkFig, OptimiserFig, AttentionFig,
  EquationAnatomy,
}
