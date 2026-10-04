// What a learner does at each step of "Capstone — Your Own ML Product" (ml-capstone), for the
// walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js. The two writing steps use an example brief as the learner's answer.

const BRIEF = "# Project brief\n\n## The decision\n\nThe cell lead sets the cutting speed for each new turning job and plans insert changes so that no insert wears out mid-part.\n\n## The prediction\n\nMinutes of tool life for a planned cut, from speed, feed, depth of cut, workpiece hardness and coolant, and the speed that gives a wanted life. Needed when the job is set up.\n\n## The data\n\n240 turning tests on one carbide grade, recording conditions and minutes to the wear limit. Risks: typing errors in the log, and tests only covering part of the speed range.\n\n## The number to beat\n\nAlways predicting the average tool life: a typical error of 821 minutes.\n\n## When it's wrong\n\nPredicting too long a life means an insert fails mid-part: scrap and possibly a crash, so that is the worse error. Predicting too short wastes inserts. It must never present an untested speed as reliable.\n\n## Results\n\nTODO (lesson 16.4): what the finished model achieves, measured honestly, and its limits.\n";

const FINISHED_BRIEF = "# Project brief\n\n## The decision\n\nThe cell lead sets the cutting speed for each new turning job and plans insert changes so that no insert wears out mid-part.\n\n## The prediction\n\nMinutes of tool life for a planned cut, from speed, feed, depth of cut, workpiece hardness and coolant, and the speed that gives a wanted life. Needed when the job is set up.\n\n## The data\n\n240 turning tests on one carbide grade, recording conditions and minutes to the wear limit. Risks: typing errors in the log, and tests only covering part of the speed range.\n\n## The number to beat\n\nAlways predicting the average tool life: a typical error of 821 minutes.\n\n## When it's wrong\n\nPredicting too long a life means an insert fails mid-part: scrap and possibly a crash, so that is the worse error. Predicting too short wastes inserts. It must never present an untested speed as reliable.\n\n## Results\n\nTaylor's equation fitted in logs: typical error 189 minutes in 5-fold cross-validation, against 821 for the average, 525 for linear regression on raw settings and 369 for a random forest. Taylor exponent n = 0.31, within the published range for carbide. Valid for speeds 121-319 m/min and one insert grade; other answers are flagged.\n";

export const WALKTHROUGH = {
  // ── 16.1 ─────────────────────────────────────────────────────────────────
  '16-01-start-from-the-decision#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '16-01-start-from-the-decision#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1, 2] }],
  },
  '16-01-start-from-the-decision#The brief': {
    write: { 'PROJECT.md': BRIEF },
    wrong: [{ name: 'left the brief blank', write: {}, fails: [0, 1, 2, 3, 4] }],
  },
  '16-01-start-from-the-decision#Data you can trust': {
    wrong: [
      { name: 'marked coolant as 1 instead of dry', edit: [['row.append(1.0 if record["coolant"] == "no" else 0.0)', 'row.append(1.0 if record["coolant"] == "yes" else 0.0)']], fails: [0] },
      { name: 'lost the line number', edit: [['            raise DataError(f"line {number}: {error}") from None', '            raise']], fails: [0] },
    ],
  },
  '16-01-start-from-the-decision#The number to beat': {
    wrong: [{ name: 'measured the baseline on the data it averaged', edit: [['error = -cross_val_score(DummyRegressor(), X, life, cv=folds, scoring="neg_root_mean_squared_error").mean()', 'error = float(np.sqrt(np.mean((life - life.mean()) ** 2)))']], fails: [0] }],
  },

  // ── 16.2 ─────────────────────────────────────────────────────────────────
  '16-02-let-the-physics-choose#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '16-02-let-the-physics-choose#The model': {
    wrong: [
      { name: 'no log on speed', edit: [['np.column_stack([np.log(X[:, 0]),', 'np.column_stack([X[:, 0],']], fails: [0] },
      { name: 'fitted the raw tool life', edit: [['LinearRegression().fit(taylor_features(X), np.log(life))', 'LinearRegression().fit(taylor_features(X), life)'], ['return np.exp(self.regression_.predict(taylor_features(X)))', 'return self.regression_.predict(taylor_features(X))']], fails: [0] },
    ],
  },

  // ── 16.3 ─────────────────────────────────────────────────────────────────
  '16-03-the-advisor-as-a-service#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  "16-03-the-advisor-as-a-service#Knowing what it doesn't know": {
    wrong: [{ name: 'solved the equation the wrong way round', edit: [['return float(np.exp((np.log(life) - rest) / w[0]))', 'return float(np.exp((rest - np.log(life)) / w[0]))']], fails: [0] }],
  },
  "16-03-the-advisor-as-a-service#The advisor's API": {
    wrong: [{ name: 'never flags an untested speed', edit: [['"within_tested_range": model.tested([recommended, *row[1:4]])', '"within_tested_range": True']], fails: [0] }],
  },

  // ── 16.4 ─────────────────────────────────────────────────────────────────
  '16-04-ship-report-make-it-yours#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '16-04-ship-report-make-it-yours#Keeping things out of the image': {
    wrong: [
      { name: 'copied the virtual environment into the image', edit: [['.venv/\n', '']], fails: [0] },
      { name: 'ran as root', patch: { Dockerfile: [['USER advisor\n', '']] }, typeFile: true, fails: [0] },
    ],
  },
  '16-04-ship-report-make-it-yours#The honest report': {
    write: { 'PROJECT.md': FINISHED_BRIEF },
    wrong: [{ name: 'left Results as TODO', write: {}, fails: [0] }],
  },
};
