// Every figure a lesson can place with { figure: 'Name', props }.
import Motion from './Motion.jsx'
import { PredictFig, FunctionMachine, IndexFig, SigmaFig, PowerFig, CompoundFig, LogFig, SigmoidBuilder, ArgminFig, SetsFig, LogicFig, PiecewiseFig, InequalityFig } from './part1.jsx'
import { SlopeFig, ZoomFig, DerivativeFig, RulesFig, ExpSlopeFig, ChainFig, MinimumFig, Descent1D, SurfaceFig, GradientFig, Descent2D, AreaFig } from './part2.jsx'
import { VectorFig, NormFig, DotFig, MatVecFig, TransformFig, MatMulFig, SystemFig, LeastSquaresFig, EigenFig } from './part3.jsx'
import { DiceGrid, DistributionFig, SpreadFig, BayesFig, DensityFig, NormalBuilder, SamplingFig, LikelihoodFig, ScatterFig, PCAFig } from './part4.jsx'
import { RegressionFig, RidgeFig, LogisticFig, SoftmaxFig, EntropyFig, NetworkFig, OptimiserFig, AttentionFig } from './part5.jsx'
import { EquationAnatomy } from './part6.jsx'
import { EpsilonDeltaFig, ProductAreaFig, InverseFig, CurvatureFig, AntiderivativeFig, SubstitutionFig, TaylorFig } from './change.jsx'
import { PathFig, JacobianFig, HessianFig, DoubleIntegralFig, GaussianFig } from './manyvars.jsx'
import { SpanFig, EliminationFig, RankFig, DeterminantFig, ProjectionFig, OrthogonalFig, SpectralFig, QuadraticFormFig, SVDFig, TraceFig, LowRankFig, MatrixGradientFig, TensorFig } from './matrices.jsx'
import { InclusionExclusionFig, IndependenceFig, DistributionGalleryFig, JointTableFig, ConvolutionFig, LargeNumbersFig, CLTFig, ChangeOfVariablesFig, MultivariateGaussianFig, BetaPosteriorFig, BiasVarianceFig, PermutationTestFig, MonteCarloFig, JensenFig, EntropyBitsFig, MarkovChainFig } from './chance.jsx'
import { ConvexityFig, DescentLemmaFig, NewtonFig, SGDFig, MomentumFig, LagrangeFig, KKTFig, DualityFig } from './optimise.jsx'
import { GrowthFig, LoopCostFig, RecursionTreeFig, BinarySearchFig, FloatLineFig, StabilityFig, PRNGFig, AutodiffFig, EditDistanceFig, GraphFig, HashingFig } from './algorithms.jsx'
import { BiasVarianceFitFig, NaiveBayesFig, TreeSplitFig, KMeansFig, GMMFig, SVMFig, InitFig, LayerNormFig, DropoutFig, ConvolutionSlideFig } from './ml2.jsx'
import { BPTTFig, TransformerBlockFig, ContrastiveFig, VAEFig, GANFig, DiffusionFig, ValueIterationFig, PolicyGradientFig, PPOFig } from './ml3.jsx'
import { GeneralisationFig, HoeffdingFig, UnionBoundFig, ShatterFig, DoubleDescentFig } from './theory.jsx'
import { DropoutRidgeFig, Word2VecFig, VAEEstimatorFig, AdamStepFig, BatchNormGradFig, ResNetGradFig, TransformerScheduleFig, GAEFig, DDPMWeightFig, LoRAFig } from './papers.jsx'
import { ProofFig, ContradictionFig, InductionFig, CountingFig, PascalFig, BinomialFig, BirthdayFig } from './proof.jsx'

export const FIGURES = {
  Motion,
  PredictFig, FunctionMachine, IndexFig, SigmaFig, PowerFig, CompoundFig, LogFig, SigmoidBuilder, ArgminFig, SetsFig, LogicFig, PiecewiseFig, InequalityFig,
  SlopeFig, ZoomFig, DerivativeFig, RulesFig, ExpSlopeFig, ChainFig, MinimumFig, Descent1D, SurfaceFig, GradientFig, Descent2D, AreaFig,
  VectorFig, NormFig, DotFig, MatVecFig, TransformFig, MatMulFig, SystemFig, LeastSquaresFig, EigenFig,
  DiceGrid, DistributionFig, SpreadFig, BayesFig, DensityFig, NormalBuilder, SamplingFig, LikelihoodFig, ScatterFig, PCAFig,
  RegressionFig, RidgeFig, LogisticFig, SoftmaxFig, EntropyFig, NetworkFig, OptimiserFig, AttentionFig,
  EquationAnatomy,
  EpsilonDeltaFig, ProductAreaFig, InverseFig, CurvatureFig, AntiderivativeFig, SubstitutionFig, TaylorFig,
  PathFig, JacobianFig, HessianFig, DoubleIntegralFig, GaussianFig,
  SpanFig, EliminationFig, RankFig, DeterminantFig, ProjectionFig, OrthogonalFig, SpectralFig, QuadraticFormFig, SVDFig, TraceFig, LowRankFig, MatrixGradientFig, TensorFig,
  InclusionExclusionFig, IndependenceFig, DistributionGalleryFig, JointTableFig, ConvolutionFig, LargeNumbersFig, CLTFig, ChangeOfVariablesFig, MultivariateGaussianFig, BetaPosteriorFig, BiasVarianceFig, PermutationTestFig, MonteCarloFig, JensenFig, EntropyBitsFig, MarkovChainFig,
  ConvexityFig, DescentLemmaFig, NewtonFig, SGDFig, MomentumFig, LagrangeFig, KKTFig, DualityFig,
  GrowthFig, LoopCostFig, RecursionTreeFig, BinarySearchFig, FloatLineFig, StabilityFig, PRNGFig, AutodiffFig, EditDistanceFig, GraphFig, HashingFig,
  BiasVarianceFitFig, NaiveBayesFig, TreeSplitFig, KMeansFig, GMMFig, SVMFig, InitFig, LayerNormFig, DropoutFig, ConvolutionSlideFig,
  BPTTFig, TransformerBlockFig, ContrastiveFig, VAEFig, GANFig, DiffusionFig, ValueIterationFig, PolicyGradientFig, PPOFig,
  GeneralisationFig, HoeffdingFig, UnionBoundFig, ShatterFig, DoubleDescentFig,
  DropoutRidgeFig, Word2VecFig, VAEEstimatorFig, AdamStepFig, BatchNormGradFig, ResNetGradFig, TransformerScheduleFig, GAEFig, DDPMWeightFig, LoRAFig,
  ProofFig, ContradictionFig, InductionFig, CountingFig, PascalFig, BinomialFig, BirthdayFig,
}
