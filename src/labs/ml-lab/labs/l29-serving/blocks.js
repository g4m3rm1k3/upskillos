// Lesson order for Lab 29: each paragraph followed by what makes it concrete (see LessonFlow).
export const blocks = {
  'l29-modes': [
    { p: 0 }, { p: 1 }, { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'A nightly job scores 3.6 million records in one hour. How many records per second is that?', answer: 1000, explain: '3,600,000 / 3,600 s = 1,000 per second — and no single record has a latency budget.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l29-artifact': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { figure: 'ParityServers', caption: 'The playground’s four servers, all loading the same weights, against the offline pipeline.' },
    { cell: 1 },
    { predict: { prompt: 'A rewritten server standardizes each request with the statistics of the batch it arrived in. A batch holds a single request. What value does every standardized feature take?', answer: 0, explain: 'x minus the mean of a one-row batch is 0 in every column (and the standard deviation is 0 too, so real code may even divide by zero). Every such request gets the same prediction, the intercept b.' } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l29-api': [
    { p: 0 }, { p: 1 },
    { cell: 0 },
    { predict: { prompt: 'The request body is [1, 2] — valid JSON, but a list. Which status should the service return?', answer: 400, explain: 'The body is not the JSON object the contract describes, so it is a malformed request: 400. (A handler that assumes an object would crash on it — the cell guards against that.)', misconceptions: [{ answer: 422, feedback: '422 is for a well-formed request object that breaks the rules. A list is not a request object at all.' }, { answer: 200, feedback: 'There is nothing to predict from: no fields at all.' }] } },
    { p: 2 }, { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l29-latency': [
    { p: 0 }, { p: 1 },
    { figure: 'QueueLatency', caption: 'One model server: 8 ms per call plus 2 ms per request. Raise the traffic, with and without micro-batching.' },
    { p: 2 },
    { cell: 0 },
    { predict: { prompt: 'Per-call overhead 10 ms, per-request cost 1 ms. What is the capacity with batches of 10, in requests per second?', answer: 500, explain: '1000 × 10 / (10 + 1 × 10) = 10,000/20 = 500, against 1000/11 ≈ 91 one at a time.' } },
    { p: 3 }, { p: 4 },
    { math: true },
  ],
  'l29-test': [
    { p: 0 }, { p: 1 }, { p: 2 }, { p: 3 },
    { cell: 0 }, { cell: 1 },
    { bridge: { label: 'The real service, over HTTP (run on your own machine)', title: '', body: ['A browser page cannot open a network port, so the real service is `serve.py` in the Implement tab: the same model, features and handler behind Python’s standard HTTP server. `python serve.py --check` starts it, sends real HTTP requests, compares every answer with the offline model and checks the error statuses. Its output when it was run for this lesson (Python 3.12, NumPy 2):'], output: 'parity over HTTP for 20 requests: largest difference 0.00 s\nunknown language: status 422 (expected 422)\nbroken JSON: status 400 (expected 400)\nJSON that is not an object: status 400 (expected 400)\nPASS: the service answers over HTTP and matches the offline model' } },
    { predict: { prompt: 'A parity test over 200 logged requests finds a largest difference of 0.03 s; its tolerance is 1e-6 s. Does it pass? (1 = yes, 0 = no)', answer: 0, explain: 'No: 0.03 is far above 1e-6. Shared code gives differences at rounding level (about 1e-12); 0.03 s means something is computed differently — find it before shipping.' } },
    { p: 4 },
    { math: true },
    { ladder: 'serve' },
  ],
}
