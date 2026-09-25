import { lazy } from 'react'
import { lessons, sources } from './lessons.js'
import python from './python.js'
import { blocks } from './blocks.js'
import { withBlocks } from '../../kit/blocks.js'

export default {
  number: 19,
  short: 'Time-dependent data',
  question: 'How do you predict the future without peeking at it?',
  intro: 'Forecast hourly resource usage: read autocorrelation, beat persistence and seasonal baselines with lag features, and evaluate walk-forward without temporal leakage.',
  lessons: withBlocks(lessons, blocks), sources, python, figures: () => import('./figures.jsx'),
  math: ['stat.correlation', 'calc.sequences', 'ai.stochastic', 'ai.fourier'],
  Playground: lazy(() => import('./Playground.jsx')),
  scope: 'Trend, seasonality and autocorrelation; forecast horizons; persistence and seasonal-naive baselines; lag, rolling and calendar features; direct forecasting; walk-forward evaluation; temporal leakage.',
}
