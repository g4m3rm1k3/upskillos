import test from 'node:test';
import assert from 'node:assert/strict';
import { resultMessage } from '../src/resultMessage.js';
test('authority labels', () => {
  assert.equal(resultMessage({ ok: true, message: 'Ready: Ada × 2' }), 'Accepted by C#: Ready: Ada × 2');
  assert.equal(resultMessage({ ok: false, message: 'Enter a name.' }), 'Needs attention: Enter a name.');
  assert.equal(resultMessage({ ok: false, message: 'Other error' }), 'Needs attention: Other error');
});
