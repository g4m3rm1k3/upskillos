import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewClient } from '../src/bridge.js';
function fakeTransport() {
  const listeners = new Set();
  return {
    sent: [], listeners,
    addEventListener(type, callback) { listeners.add(callback); },
    removeEventListener(type, callback) { listeners.delete(callback); },
    postMessage(value) { this.sent.push(value); },
    emit(data) { for (const callback of listeners) callback({ data }); },
  };
}
test('roundtrip correlates replies and sends numeric quantity', async () => {
  const transport = fakeTransport();
  const client = createPreviewClient(transport, 1000);
  const first = client.preview({ name: 'Ada', quantity: 2 });
  const second = client.preview({ name: 'Ben', quantity: 3 });
  const [a, b] = transport.sent;
  assert.equal(a.type, 'preview');
  assert.equal(typeof a.quantity, 'number');
  assert.notEqual(a.id, b.id);
  transport.emit({ type: 'previewResult', id: 'old', ok: true, message: 'Ignore' });
  transport.emit({ type: 'previewResult', id: a.id, ok: 'true', message: 'Ignore malformed' });
  transport.emit({ type: 'previewResult', id: b.id, ok: false, message: 'Use another value.' });
  transport.emit({ type: 'previewResult', id: a.id, ok: true, message: 'Ready: Ada × 2' });
  assert.equal((await first).message, 'Ready: Ada × 2');
  assert.equal((await second).ok, false);
  client.dispose();
  assert.equal(transport.listeners.size, 0);
});
test('timeout permits retry without a stale result', async () => {
  const transport = fakeTransport();
  const client = createPreviewClient(transport, 15);
  await assert.rejects(client.preview({ name: 'Ada', quantity: 2 }), /No reply/);
  const old = transport.sent[0];
  const retry = client.preview({ name: 'Ada', quantity: 2 });
  transport.emit({ type: 'previewResult', id: old.id, ok: true, message: 'Old' });
  transport.emit({ type: 'previewResult', id: transport.sent[1].id, ok: true, message: 'New' });
  assert.equal((await retry).message, 'New');
  client.dispose();
});
test('standalone browser and broken send report failure', async () => {
  const standalone = createPreviewClient(undefined);
  await assert.rejects(standalone.preview({ name: 'Ada', quantity: 2 }), /desktop host/);
  standalone.dispose();
  const transport = fakeTransport();
  transport.postMessage = () => { throw new Error('Disconnected'); };
  const client = createPreviewClient(transport, 15);
  await assert.rejects(client.preview({ name: 'Ada', quantity: 2 }), /Could not send/);
  client.dispose();
});
test('dispose cancels work and releases its listener once', async () => {
  const transport = fakeTransport();
  const client = createPreviewClient(transport);
  const pending = client.preview({ name: 'Ada', quantity: 2 });
  const rejection = assert.rejects(pending, /cancelled/);
  client.dispose(); client.dispose();
  await rejection;
  assert.equal(transport.listeners.size, 0);
  await assert.rejects(client.preview({ name: 'Ada', quantity: 2 }), /cancelled/);
});
