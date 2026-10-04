// What a learner does at each step of "Production ML — The Defect Studio" (ml-studio), for the
// walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 15.1 ─────────────────────────────────────────────────────────────────
  '15-01-layers#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '15-01-layers#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1, 2] }],
  },
  '15-01-layers#Checking every run': {
    wrong: [
      { name: 'no range check', edit: [['        if not low <= value <= high:\n            raise DataError(f"{name} {value:g} is outside {low}-{high}")\n', '']], fails: [0] },
      { name: 'accepted a file with only one kind of run', edit: [['    if len(set(labels)) < 2:\n        raise DataError("needs both good and defective runs to learn from")\n', '']], fails: [0] },
    ],
  },
  "15-01-layers#Training, with no idea there's a web app": {
    wrong: [{ name: 'accuracy on the training data', edit: [['    accuracy = cross_val_score(make_model(kind, seed), X, y, cv=folds).mean()\n    model = make_model(kind, seed).fit(X, y)\n', '    model = make_model(kind, seed).fit(X, y)\n    accuracy = model.score(X, y)\n']], fails: [0] }],
  },

  // ── 15.2 ─────────────────────────────────────────────────────────────────
  '15-02-artifacts#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '15-02-artifacts#A name that proves itself': {
    wrong: [
      { name: 'checked the fingerprint after loading', edit: [['    if fingerprint(path.read_bytes()) != artifact_id:\n        raise TamperedArtifact(artifact_id)\n    return joblib.load(path)', '    model = joblib.load(path)\n    if fingerprint(path.read_bytes()) != artifact_id:\n        raise TamperedArtifact(artifact_id)\n    return model']], fails: [0] },
      { name: 'a random name instead of the fingerprint', edit: [['    artifact_id = fingerprint(temporary.read_bytes())', '    artifact_id = uuid.uuid4().hex']], fails: [0] },
    ],
  },

  // ── 15.3 ─────────────────────────────────────────────────────────────────
  '15-03-background-jobs#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '15-03-background-jobs#Remembering experiments: the database layer': {
    wrong: [{ name: 'no allowlist of columns', edit: [['    unknown = set(fields) - UPDATABLE\n    if unknown:\n        raise ValueError(f"not an updatable column: {sorted(unknown)}")\n', '']], fails: [0] }],
  },
  '15-03-background-jobs#Jobs in the background': {
    wrong: [
      { name: 'trained inside the request', edit: [['        self.executor.submit(self.run, experiment_id)', '        self.run(experiment_id)']], fails: [0] },
      { name: 'let a failure escape the job', edit: [['            database.update_experiment(self.db, experiment_id, status="failed", error=str(error))\n            log.exception("experiment %s failed", experiment_id)', '            raise']], fails: [0] },
    ],
  },

  // ── 15.4 ─────────────────────────────────────────────────────────────────
  '15-04-api-and-model-tests#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '15-04-api-and-model-tests#And tests for the model': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '15-04-api-and-model-tests#The API layer': {
    wrong: [{ name: 'an unfinished model answered as a server error', edit: [['        except NotReady as error:\n            raise HTTPException(status_code=409, detail=str(error))\n        except data.DataError as error:\n            raise HTTPException(status_code=422, detail=str(error))\n\n    return app', '        except data.DataError as error:\n            raise HTTPException(status_code=422, detail=str(error))\n\n    return app']], fails: [0] }],
  },

  // ── 15.5 ─────────────────────────────────────────────────────────────────
  '15-05-watching-it-run#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '15-05-watching-it-run#A record, and a drift check': {
    wrong: [{ name: 'compared means in raw units', edit: [['        shift = (X_recent[:, i].mean() - training[name]["mean"]) / training[name]["std"]', '        shift = X_recent[:, i].mean() - training[name]["mean"]']], fails: [0] }],
  },
  "15-05-watching-it-run#Depending on someone else's service": {
    wrong: [
      { name: 'the same wait every time', edit: [['self.sleep(self.wait * 2 ** attempt)', 'self.sleep(self.wait)']], fails: [0] },
      { name: 'no cache', edit: [['        if self.cached and self.clock() - self.cached[0] < self.cache_seconds:', '        if False:']], fails: [0] },
    ],
  },
  '15-05-watching-it-run#Wiring it in: the service': {
    wrong: [{ name: 'did not log the predictions', edit: [['        for run, probability in zip(runs, probabilities):\n            self.predictions.write(experiment_id, run, probability)\n', '']], fails: [0] }],
  },

  // ── 15.6 ─────────────────────────────────────────────────────────────────
  '15-06-shipping-it#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '15-06-shipping-it#The start-up sweep': {
    wrong: [{ name: 'left queued jobs waiting', edit: [['    for experiment_id in waiting:\n        studio.executor.submit(studio.run, experiment_id)\n', '']], fails: [0] }],
  },
  '15-06-shipping-it#Keeping things out of the image': {
    wrong: [{ name: 'copied the virtual environment into the image', edit: [['.venv/\n', '']], fails: [0] }],
  },
};
