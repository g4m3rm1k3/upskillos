// Every figure a lesson can place with { figure: 'Name', props }.
import { MapExplorer, MoveExplorer, LoopPlayer, ReturnPaths, GammaCurve } from './part1.jsx'
import { TransitionExplorer, HistoryMatters, PolicyEditor, Sweeps } from './part2.jsx'
import { RunningAverage, TDEvaluation, QTableView, EpsilonSchedule, CliffCompare } from './part3.jsx'
import { OneHotLinear, SoftmaxFigure, GradientStep, A2CTrainer, MethodsCompare } from './part4.jsx'
import { MapBuilder } from './part5.jsx'
import Trainer from './Trainer.jsx'

export const FIGURES = {
  MapExplorer, MoveExplorer, LoopPlayer, ReturnPaths, GammaCurve,
  TransitionExplorer, HistoryMatters, PolicyEditor, Sweeps,
  Trainer, RunningAverage, TDEvaluation, QTableView, EpsilonSchedule, CliffCompare,
  OneHotLinear, SoftmaxFigure, GradientStep, A2CTrainer, MethodsCompare,
  MapBuilder,
}
