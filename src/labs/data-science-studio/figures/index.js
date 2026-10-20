// Every figure a lesson can place with { figure: 'Name', props }.
import { TableView, CsvScanner, FloatExplorer, MissingDemo, QueryBuilder, SortRace, RowsVsColumns } from './part1.jsx'
import { TextCleaner, RuleChecker, DuplicateFinder, EditTable, FuzzyMatcher, MissingnessLab, JoinRace, Cardinality, WideLong, CleanReport } from './part3.jsx'
import { ScaleExplorer, JoinStepper, TickExplorer, BinExplorer, AreaLie, KdeExplorer, ColourScales, Misleading } from './part4.jsx'
import { BalancePoint, QuantileExplorer, QuickselectTrace, SpreadExplorer, BesselSimulator, CancellationDemo, OutlierFinder, GroupByView, PivotBuilder } from './part2.jsx'
import { Quadrants, CorrelationShapes, RankTies, LineFit, Anscombe, LogStraightens, Overplotting, Simpson, CausalSims } from './part5.jsx'
import { SampleDrawer, BinomialExplorer, SamplingDistribution, CltExplorer, HeavyTail, CoverageRuns, BootstrapView, ReservoirRun, StrataLab, ErrorBars } from './part6.jsx'
import { ShuffleTest, PValueRain, TvsNormal, PowerCurve, ManyTests, Peeking } from './part7.jsx'
import { ModelLoss, EliminationSteps, DescentPath, Overfit, RidgePath, FoldView, LogisticFit } from './part8.jsx'
import { TimeShuffle, WindowSlide, Decomposition, AcfBars, ForecastRace, SmoothingAlpha, HoltAhead, SeasonUpdates, WalkForwardView } from './part9.jsx'
import { NullLogic, JoinCross, IndexSearch, WindowFrame } from './part10.jsx'
import { DateCircle, EncodingLeak, HashBuckets, KnnScaling, ThresholdTradeoff, FoldBalance } from './part11.jsx'
import { FanChart, Dashboard } from './part12.jsx'

export const FIGURES = {
  ShuffleTest, PValueRain, TvsNormal, PowerCurve, ManyTests, Peeking,
  ModelLoss, EliminationSteps, DescentPath, Overfit, RidgePath, FoldView, LogisticFit,
  TimeShuffle, WindowSlide, Decomposition, AcfBars, ForecastRace, SmoothingAlpha, HoltAhead, SeasonUpdates, WalkForwardView,
  NullLogic, JoinCross, IndexSearch, WindowFrame,
  DateCircle, EncodingLeak, HashBuckets, KnnScaling, ThresholdTradeoff, FoldBalance,
  FanChart, Dashboard,
  Quadrants, CorrelationShapes, RankTies, LineFit, Anscombe, LogStraightens, Overplotting, Simpson, CausalSims,
  SampleDrawer, BinomialExplorer, SamplingDistribution, CltExplorer, HeavyTail, CoverageRuns, BootstrapView, ReservoirRun, StrataLab, ErrorBars,
  TableView, CsvScanner, FloatExplorer, MissingDemo, QueryBuilder, SortRace, RowsVsColumns,
  BalancePoint, QuantileExplorer, QuickselectTrace, SpreadExplorer, BesselSimulator, CancellationDemo, OutlierFinder, GroupByView, PivotBuilder,
  TextCleaner, RuleChecker, DuplicateFinder, EditTable, FuzzyMatcher, MissingnessLab, JoinRace, Cardinality, WideLong, CleanReport,
  ScaleExplorer, JoinStepper, TickExplorer, BinExplorer, AreaLie, KdeExplorer, ColourScales, Misleading,
}
