import { train, evaluate } from './training.js';
self.onmessage = () => {
  try {
    const result = train(600, progress => self.postMessage({ type: 'progress', ...progress }));
    self.postMessage({ type: 'done', result: { ...result, evaluation: evaluate(result.policy) } });
  } catch (error) { self.postMessage({ type: 'error', message: error.message }); }
};
