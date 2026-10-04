// What a learner does at each step of "Time Series — Spindle Bearing Watch" (ml-timeseries), for
// the walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 17.1 ─────────────────────────────────────────────────────────────────
  '17-01-readings-in-time-order#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '17-01-readings-in-time-order#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '17-01-readings-in-time-order#Load the readings': {
    wrong: [{ name: 'did not check the order', edit: [['            if times and when <= times[-1]:\n                raise ReadingError(f"line {number}: {when} is not after {times[-1]}")\n', '']], fails: [0] }],
  },
  '17-01-readings-in-time-order#Finding the gaps': {
    wrong: [
      { name: 'counted the gap between readings, not the hours missing', edit: [['missing = round((after - before) / HOUR) - 1', 'missing = round((after - before) / HOUR)']], fails: [0] },
      { name: 'filled the gap with the reading before it', edit: [['np.interp(every, offsets, values)', 'np.array([values[sum(o <= h for o in offsets) - 1] for h in every])']], fails: [0] },
    ],
  },
  '17-01-readings-in-time-order#Smoothing without seeing the future': {
    wrong: [
      { name: 'centred the window on the reading', edit: [['means[i] = values[i - window + 1 : i + 1].mean()', 'means[i] = values[i - 1 : i + window - 1].mean()']], fails: [0] },
      { name: 'mixed weekdays and weekends', edit: [[' and (when.weekday() < 5) == weekdays]', ']']], fails: [0] },
    ],
  },
  '17-01-readings-in-time-order#The cycles in the numbers': {
    wrong: [{ name: 'averaged over a day, not a week', edit: [['cycles.trailing_mean(values, 168)', 'cycles.trailing_mean(values, 24)']], fails: [0] }],
  },

  // ── 17.2 ─────────────────────────────────────────────────────────────────
  '17-02-tomorrow-looks-like-today#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '17-02-tomorrow-looks-like-today#Forecasting by copying': {
    wrong: [
      { name: 'shifted the wrong way: copied the future', edit: [['forecasts[lag:] = values[:-lag]', 'forecasts[:-lag] = values[lag:]']], fails: [0] },
      { name: 'allowed a lag shorter than the horizon', edit: [['    if lag < horizon:\n        raise ValueError(f"lag {lag} is shorter than the horizon {horizon}: that reading isn\'t known yet")\n', '']], fails: [0] },
    ],
  },
  '17-02-tomorrow-looks-like-today#The number to beat': {
    wrong: [{ name: 'tested on every week, including the first', edit: [['test = slice(4 * WEEK, None)', 'test = slice(WEEK, None)']], fails: [0] }],
  },

  // ── 17.3 ─────────────────────────────────────────────────────────────────
  '17-03-learning-from-lags#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '17-03-learning-from-lags#The features': {
    wrong: [{ name: 'used the reading at the hour being forecast', edit: [['        known = i - horizon\n', '        known = i\n']], fails: [0] }],
  },
  '17-03-learning-from-lags#Shuffled folds lie about time': {
    wrong: [{ name: 'used unshuffled KFold instead of walk-forward folds', edit: [['cv=TimeSeriesSplit(5)', 'cv=KFold(5)']], fails: [0] }],
  },
  '17-03-learning-from-lags#Train once, and the bearing gets away': {
    wrong: [{ name: 'trained on the test weeks too', edit: [['forecasts = model.fit(X[:cut], y[:cut]).predict(X[cut:])', 'forecasts = model.fit(X, y).predict(X[cut:])']], fails: [0] }],
  },
  '17-03-learning-from-lags#Retrain every night': {
    wrong: [{ name: 'trained on the day being forecast', edit: [['known = hour < day * 24 ', 'known = hour < (day + 1) * 24 ']], fails: [0] }],
  },

  // ── 17.4 ─────────────────────────────────────────────────────────────────
  '17-04-warning-before-the-limit#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '17-04-warning-before-the-limit#One clean number per day': {
    wrong: [{ name: 'included the warm-up hours', edit: [['if running(when) and when.hour >= 10:', 'if running(when):']], fails: [0] }],
  },
  '17-04-warning-before-the-limit#How many days are left?': {
    wrong: [
      { name: 'counted readings, not calendar days', edit: [['x = np.array([(day - days[-1]).days for day in days[-window:]])', 'x = np.arange(len(days[-window:])) - (len(days[-window:]) - 1)']], fails: [0] },
      { name: 'treated any tiny rise as a rise', edit: [['    if slope < NO_RISE:\n', '    if slope <= 0:\n']], fails: [0] },
    ],
  },
  '17-04-warning-before-the-limit#Would it have warned in time?': {
    wrong: [{ name: 'estimated from the whole history, future included', edit: [['health.days_to_limit(days[: k + 1], means[: k + 1], LIMIT)', 'health.days_to_limit(days, means, LIMIT)']], fails: [0] }],
  },
};
