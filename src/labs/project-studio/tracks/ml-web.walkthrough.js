// What a learner does at each step of "Web + ML — The Prediction Web App" (ml-web), for the
// walkthrough test (mlProduction.desktop.test.js). The entry format is described in
// ml-software.walkthrough.js.

export const WALKTHROUGH = {
  // ── 4.1 ──────────────────────────────────────────────────────────────────
  '04-01-http-by-hand#A new project': {
    run: ['python -m venv .venv', '.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'did nothing', fails: [0] }],
  },
  '04-01-http-by-hand#Read the tests first': {
    wrong: [{ name: 'did not create the files', fails: [0, 1] }],
  },
  '04-01-http-by-hand#The model in one file': {
    wrong: [{ name: 'left out the age feature', edit: [['FEATURES = ["sqft", "bedrooms", "age"]', 'FEATURES = ["sqft", "bedrooms"]'], ['np.array([[sqft, bedrooms, age]])', 'np.array([[sqft, bedrooms]])']], fails: [0] }],
  },
  '04-01-http-by-hand#A server that says hello': {
    wrong: [{ name: 'answers 200 for every path', edit: [['self.reply(404, f"Nothing at {self.path}\\n")', 'self.reply(200, f"Nothing at {self.path}\\n")']], fails: [0] }],
  },
  '04-01-http-by-hand#What actually travels': {
    wrong: [{ name: 'printed the request instead of the response', edit: [['print(response.decode("utf-8"))', 'print(request)']], fails: [0, 1] }],
  },
  '04-01-http-by-hand#Predict over HTTP': {
    wrong: [
      { name: 'compared the whole path, query string included', edit: [['        elif url.path == "/predict":', '        elif self.path == "/predict":']], fails: [0] },
      { name: 'answers 200 for a missing value', edit: [['self.reply(400, f"missing: {', 'self.reply(200, f"missing: {']], fails: [0] },
    ],
  },

  // ── 4.2 ──────────────────────────────────────────────────────────────────
  '04-02-json-and-post#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '04-02-json-and-post#One place that checks a house': {
    wrong: [
      { name: 'only catches ValueError, so null crashes', edit: [['    except (TypeError, ValueError):', '    except ValueError:']], fails: [0] },
      { name: 'reports only the first missing field', edit: [['raise BadRequest(f"missing: {\', \'.join(missing)}")', 'raise BadRequest(f"missing: {missing[0]}")']], fails: [0] },
    ],
  },
  '04-02-json-and-post#Answers in JSON': {
    wrong: [{ name: 'labelled JSON as plain text', edit: [['self.send_header("Content-Type", "application/json")', 'self.send_header("Content-Type", "text/plain")']], fails: [0] }],
  },
  '04-02-json-and-post#POST: a house in the body': {
    wrong: [{ name: 'accepts any JSON value as a house', edit: [['        if not isinstance(body, dict):\n            self.send_json(400, {"error": "the body must be a JSON object"})\n            return\n', '']], fails: [0] }],
  },

  // ── 4.3 ──────────────────────────────────────────────────────────────────
  '04-03-fastapi#Install FastAPI': {
    run: ['.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'added FastAPI to requirements.txt but did not install it', fails: [0] }],
  },
  '04-03-fastapi#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '04-03-fastapi#A house, described once': {
    wrong: [{ name: 'no rule on the floor area', edit: [['sqft: float = Field(gt=0, description="floor area in square feet")', 'sqft: float = Field(description="floor area in square feet")']], fails: [0] }],
  },
  '04-03-fastapi#Query strings, and the documentation it wrote': {
    wrong: [{ name: 'forgot Query(), so GET expects a body', edit: [['def predict_from_query(house: Annotated[House, Query()]) -> Estimate:', 'def predict_from_query(house: House) -> Estimate:']], fails: [0] }],
  },
  '04-03-fastapi#Dependencies: let the caller hand it in': {
    wrong: [{ name: 'the GET route still calls the real model', edit: [['    return Estimate(price=round(predict(house.sqft, house.bedrooms, house.age), 2))\n\n\n@app.post', '    return Estimate(price=round(predictor.predict(house.sqft, house.bedrooms, house.age), 2))\n\n\n@app.post']], fails: [0] }],
  },

  // ── 4.4 ──────────────────────────────────────────────────────────────────
  '04-04-a-page-for-people#Install the page tools': {
    run: ['.venv\\Scripts\\python -m pip install -q -r requirements.txt'],
    wrong: [{ name: 'added them to requirements.txt but did not install them', fails: [0] }],
  },
  '04-04-a-page-for-people#Read the tests first': {
    wrong: [{ name: 'did not create the tests', fails: [0] }],
  },
  '04-04-a-page-for-people#A page is a document': {
    wrong: [{ name: 'named the bedrooms input differently from the House field', edit: [['<input name="bedrooms"', '<input name="beds"']], fails: [1] }],
  },
  '04-04-a-page-for-people#Serve the page': {
    wrong: [{ name: 'reads the form as JSON', edit: [['def estimate(request: Request, house: Annotated[House, Form()], predict: Model):', 'def estimate(request: Request, house: House, predict: Model):']], fails: [0] }],
  },
  '04-04-a-page-for-people#HTMX: the page asks for a fragment': {
    wrong: [{ name: 'aimed at an element that does not exist', edit: [['<div id="result">', '<div id="answer">']], fails: [0] }],
  },
  '04-04-a-page-for-people#The server sends a fragment': {
    wrong: [{ name: 'always sends the whole page', edit: [['    template = "result.html" if request.headers.get("HX-Request") == "true" else "page.html"\n', '    template = "page.html"\n']], fails: [0, 1] }],
  },
};
