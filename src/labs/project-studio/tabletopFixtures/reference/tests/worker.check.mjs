import test from 'node:test';
import assert from 'node:assert/strict';

// Only the worker's message boundary is simulated, not browser scheduling.
test('worker rejects invalid requests and reports completed games', async () => {
  const messages = [];
  globalThis.self = {
    postMessage(message) { messages.push(structuredClone(message)); }
  };
  try {
    await import('../trainer.mjs');
    for (const data of [null, {}, { episodes: '2000' }, { episodes: 999 }, { episodes: 200001 }]) {
      messages.length = 0;
      self.onmessage({ data });
      assert.equal(messages.length, 1);
      assert.equal(messages[0].type, 'error');
    }
    messages.length = 0;
    self.onmessage({ data: { episodes: 2000 } });
    assert.deepEqual(messages.map(message => message.type), ['progress', 'progress', 'done']);
    assert.deepEqual(messages.slice(0, 2).map(message => message.completed), [1000, 2000]);
    assert.ok(messages.slice(0, 2).every(message => message.count === 2000));
    const result = messages[2];
    assert.equal(result.model.episodes, 2000);
    assert.ok(Object.keys(result.model.table).length > 0);
    assert.equal(result.report.wins + result.report.losses + result.report.truncated, 1000);
    assert.equal(result.baseline.wins + result.baseline.losses + result.baseline.truncated, 1000);
  } finally {
    delete globalThis.self;
  }
});
