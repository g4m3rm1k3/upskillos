// What a learner does at each step of "Databases — The Experiment Database" (ml-database), for
// the walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 5.1 ──────────────────────────────────────────────────────────────────
  '05-01-data-that-survives#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '05-01-data-that-survives#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '05-01-data-that-survives#A table for predictions': {
    wrong: [{ name: 'creates the table without IF NOT EXISTS', edit: [['CREATE TABLE IF NOT EXISTS predictions', 'CREATE TABLE predictions']], fails: [0] }],
  },
  '05-01-data-that-survives#Record a prediction': {
    wrong: [{ name: 'never commits', edit: [['    connection.commit()\n', '']], fails: [0] }],
  },
  '05-01-data-that-survives#Ask for the recent ones': {
    wrong: [{ name: 'oldest first', edit: [['ORDER BY id DESC LIMIT ?', 'ORDER BY id LIMIT ?']], fails: [0] }],
  },

  // ── 5.2 ──────────────────────────────────────────────────────────────────
  '05-02-models-and-relationships#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '05-02-models-and-relationships#Two tables and a link': {
    wrong: [{ name: 'forgot to switch on foreign keys', edit: [['    connection.execute("PRAGMA foreign_keys = ON")\n', '']], fails: [0] }],
  },
  '05-02-models-and-relationships#Add models and predictions': {
    wrong: [{ name: 'model names not unique', edit: [['    name TEXT NOT NULL UNIQUE,', '    name TEXT NOT NULL,']], fails: [0] }],
  },
  '05-02-models-and-relationships#Questions across tables: JOIN': {
    wrong: [{ name: 'inner join drops models with no predictions', edit: [['        LEFT JOIN predictions ON predictions.model_id = models.id', '        JOIN predictions ON predictions.model_id = models.id']], fails: [0] }],
  },
  '05-02-models-and-relationships#Change, delete, and all or nothing': {
    wrong: [
      { name: 'one transaction per row', edit: [['    with connection:\n        for sqft, bedrooms, age, price in rows:\n            connection.execute(', '    for sqft, bedrooms, age, price in rows:\n        with connection:\n            connection.execute(']], fails: [0] },
      { name: 'no cascade on delete', edit: [['REFERENCES models (id) ON DELETE CASCADE', 'REFERENCES models (id)']], fails: [0] },
    ],
  },
  '05-02-models-and-relationships#Find it fast: an index': {
    wrong: [{ name: 'indexed the wrong column', edit: [['ON predictions (model_id);', 'ON predictions (price);']], fails: [0] }],
  },

  // ── 5.3 ──────────────────────────────────────────────────────────────────
  '05-03-a-repository-for-the-service#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '05-03-a-repository-for-the-service#The repository': {
    wrong: [
      { name: 'kept the same-thread check', edit: [['experiments.connect(path, check_same_thread=False)', 'experiments.connect(path)']], fails: [0] },
      { name: 'creates a new model every time', edit: [['        if row is not None:\n            return row["id"]\n', '']], fails: [0] },
    ],
  },
  '05-03-a-repository-for-the-service#The service remembers': {
    wrong: [{ name: 'ignores the PRICE_DB setting', edit: [['Repository.open(os.environ.get("PRICE_DB", "experiments.db"))', 'Repository.open(":memory:")']], fails: [0] }],
  },

  // ── 5.4 ──────────────────────────────────────────────────────────────────
  '05-04-sqlalchemy#Install SQLAlchemy': {
    run: ['.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'added it to requirements.txt but did not install it', fails: [0] }],
  },
  '05-04-sqlalchemy#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '05-04-sqlalchemy#Classes for tables': {
    wrong: [{ name: 'mapped to the wrong table name', edit: [['    __tablename__ = "predictions"', '    __tablename__ = "prediction"']], fails: [0] }],
  },
  '05-04-sqlalchemy#The summary, in SQLAlchemy': {
    wrong: [{ name: 'inner join drops models with no predictions', edit: [['.outerjoin(Model.predictions)', '.join(Model.predictions)']], fails: [0] }],
  },

  // ── 5.5 ──────────────────────────────────────────────────────────────────
  '05-05-migrations#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '05-05-migrations#Migrations by hand': {
    wrong: [
      { name: 'never records the version', edit: [['f"BEGIN; {script} PRAGMA user_version = {number}; COMMIT;"', 'f"BEGIN; {script} COMMIT;"']], fails: [0] },
      { name: 'no default for the new NOT NULL column', edit: [["ADD COLUMN source TEXT NOT NULL DEFAULT 'api';", 'ADD COLUMN source TEXT;']], fails: [0] },
    ],
  },
};
