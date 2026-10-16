// Every figure a lesson can place with { figure: 'Name', props }.
import { TableView, CsvScanner, FloatExplorer, MissingDemo, QueryBuilder, SortRace, RowsVsColumns } from './part1.jsx'
import { TextCleaner, RuleChecker, DuplicateFinder, EditTable, FuzzyMatcher, MissingnessLab, JoinRace, Cardinality, WideLong, CleanReport } from './part3.jsx'
import { ScaleExplorer, JoinStepper, TickExplorer, BinExplorer, AreaLie, KdeExplorer, ColourScales, Misleading } from './part4.jsx'
import { BalancePoint, QuantileExplorer, QuickselectTrace, SpreadExplorer, BesselSimulator, CancellationDemo, OutlierFinder, GroupByView, PivotBuilder } from './part2.jsx'
import { Quadrants, CorrelationShapes, RankTies, LineFit, Anscombe, LogStraightens, Overplotting, Simpson, CausalSims } from './part5.jsx'
import { SampleDrawer, BinomialExplorer, SamplingDistribution, CltExplorer, HeavyTail, CoverageRuns, BootstrapView, ReservoirRun, StrataLab, ErrorBars } from './part6.jsx'

export const FIGURES = {
  Quadrants, CorrelationShapes, RankTies, LineFit, Anscombe, LogStraightens, Overplotting, Simpson, CausalSims,
  SampleDrawer, BinomialExplorer, SamplingDistribution, CltExplorer, HeavyTail, CoverageRuns, BootstrapView, ReservoirRun, StrataLab, ErrorBars,
  TableView, CsvScanner, FloatExplorer, MissingDemo, QueryBuilder, SortRace, RowsVsColumns,
  BalancePoint, QuantileExplorer, QuickselectTrace, SpreadExplorer, BesselSimulator, CancellationDemo, OutlierFinder, GroupByView, PivotBuilder,
  TextCleaner, RuleChecker, DuplicateFinder, EditTable, FuzzyMatcher, MissingnessLab, JoinRace, Cardinality, WideLong, CleanReport,
  ScaleExplorer, JoinStepper, TickExplorer, BinExplorer, AreaLie, KdeExplorer, ColourScales, Misleading,
}
