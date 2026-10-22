import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCount } from '../src/formatCount.js';
test('count labels', () => {
  assert.equal(formatCount(0), 'Previewed 0 requests');
  assert.equal(formatCount(1), 'Previewed 1 request');
  assert.equal(formatCount(2), 'Previewed 2 requests');
});
