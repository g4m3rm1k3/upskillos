import { seeded } from './rng.mjs';
import { TARGET } from './pig.mjs';
import { episode, evaluate } from './learning.mjs';

self.onmessage = function (event) {
  const count = event.data?.episodes;
  if (!Number.isInteger(count) || count < 1000 || count > 200000) {
    self.postMessage({ type: 'error', message: 'Choose 1,000 to 200,000 episodes.' });
    return;
  }
  const table = Object.create(null);
  const random = seeded(7);
  let truncated = 0;
  for (let i = 0; i < count; i += 1) {
    if (episode(table, random, 0.2, i % 2) === null) truncated += 1;
    const completed = i + 1;
    if (completed % 1000 === 0) self.postMessage({ type: 'progress', completed, count });
  }
  const report = evaluate(table);
  const baseline = evaluate({});
  const model = { version: 1, game: 'pig', target: TARGET, episodes: count, seed: 7, truncated, table };
  self.postMessage({ type: 'done', model, report, baseline });
};
