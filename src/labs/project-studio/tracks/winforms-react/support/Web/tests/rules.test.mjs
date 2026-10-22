import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDraft } from '../src/validateDraft.js';
test('basic fields', () => {
  assert.equal(validateDraft('Ada', '2'), '');
  assert.equal(validateDraft('   ', '2'), 'Enter a name.');
  assert.equal(validateDraft('x'.repeat(41), '2'), 'Use 40 characters or fewer.');
  for (const quantity of ['0', '101', 'oops']) assert.notEqual(validateDraft('Ada', quantity), '');
  for (const quantity of ['1', '100']) assert.equal(validateDraft('Ada', quantity), '');
});
test('integer and blank quantities', () => {
  for (const quantity of ['1.5', '', ' ']) assert.notEqual(validateDraft('Ada', quantity), '');
  assert.equal(validateDraft(' Ada ', '3'), '');
});
test('submission decision', async () => {
  const { previewDraft } = await import('../src/previewDraft.js');
  assert.deepEqual(previewDraft(' Ada ', '2'), { ok: true, message: 'Locally valid: Ada × 2' });
  assert.deepEqual(previewDraft('', '2'), { ok: false, message: 'Enter a name.' });
  assert.deepEqual(previewDraft('Ada', '1.5'), { ok: false, message: 'Use a quantity from 1 to 100.' });
  assert.deepEqual(previewDraft('x'.repeat(41), '2'), { ok: false, message: 'Use 40 characters or fewer.' });
});
