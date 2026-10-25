import fs from 'node:fs';
import path from 'node:path';
const dir = 'src/labs/project-studio/tracks/winforms-react';
const original = fs.readFileSync(path.join(dir, '04-04-csharp-is-the-authority.md'), 'utf8');
const blocks = [...original.matchAll(/```([^\n]+)\n([\s\S]*?)```/g)];
function oldFile(name) { return blocks.find(x => x[1].includes('file=' + name))[2].trim(); }
const files = {};
const fixtures = {};
function put(name, text) { files[name] = text.trim() + '\n'; }
function support(name, text) { put('support/' + name, text); }
function code(language, file, text, provided = false) { return '```' + language + ' file=' + file + (provided ? ' provided' : '') + '\n' + text.trim() + '\n```'; }
function check(command, stdout, label, timeout=60) { return '```check\nrun "' + command + '" stdout="' + stdout + '" timeout=' + timeout + ' label="' + label + '" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.\n```'; }
function predict(question, right, wrong, explain) { return '```predict\nquestion: ' + question + '\nchoice: ' + right + '\nchoice: ' + wrong + '\nanswer: ' + right + '\nexplain: ' + explain + '\n```'; }
function hints(nudge, concept, shape) { return '```hints\nnudge: ' + nudge + '\nconcept: ' + concept + '\nshape: ' + shape + '\n```'; }
function lesson(name, title, supportFiles, body) { put(name + '.md', '---\ntitle: ' + title + '\nruntime: none\n' + (supportFiles ? 'support: ' + supportFiles.join(', ') + '\n' : '') + 'reference: optional\n---\n\n' + body); }
function action(lessonId, title, value) { fixtures['winforms-react/' + lessonId + '#' + title] = value; }

const requestAnswer = `export function makePreviewRequest(draft, id) {
  return { type: 'preview', id: id, name: draft.name.trim(), quantity: Number(draft.quantityText) };
}`;
const exampleReceiver = `export function exampleHost(request) {
  if (request.quantity < 1) {
    return { type: 'previewResult', id: request.id, ok: false, message: 'Use a quantity from 1 to 100.' };
  }
  return { type: 'previewResult', id: request.id, ok: true, message: 'Ready: ' + request.name + ' × ' + request.quantity };
}`;
support('Web/tests/request.test.mjs', `import test from 'node:test';
import assert from 'node:assert/strict';
import { makePreviewRequest } from '../src/makePreviewRequest.js';
test('request is numeric, trimmed, correlated and leaves the draft alone', () => {
  const draft = { name: ' Ada ', quantityText: '2' };
  assert.deepEqual(makePreviewRequest(draft, 'first'), { type: 'preview', id: 'first', name: 'Ada', quantity: 2 });
  assert.deepEqual(makePreviewRequest({ name: 'Ben', quantityText: '9' }, 'retry'), { type: 'preview', id: 'retry', name: 'Ben', quantity: 9 });
  assert.equal(draft.name, ' Ada ');
  assert.equal(draft.quantityText, '2');
});`);
lesson('04-03a-one-request-and-one-reply', '4.3a — One Request, One Reply', ['Web/tests/request.test.mjs'], `Outcome: turn a validated text draft into a message with a numeric quantity. Finish 4.3. Work in the same project folder. Commands use Windows PowerShell.

## Watch a request return a reply

Ada enters quantity 2. The browser stores the input as the string \`'2'\`. C# needs the number \`2\`. We will first trace the exchange as ordinary JavaScript calls, where every step is visible. This example receiver is a teaching stand-in; it runs no C# and proves no host connection.

Use **Create provided** for the receiver. Its deliberate range-only rule keeps this first trace small. Real C# validation comes later.

${code('javascript', 'Web/src/exampleHost.js', exampleReceiver, true)}

${code('javascript', 'Web/src/traceExchange.mjs', `import { exampleHost } from './exampleHost.js';
const request = { type: 'preview', id: 'first', name: 'Ada', quantity: 2 };
console.log('send', request.name, request.quantity);
const reply = exampleHost(request);
console.log('reply', reply.id, reply.ok, reply.message);`)}

Run \`node Web/src/traceExchange.mjs\`. Read the two output lines in order. A request is an object describing the work being asked for. A reply is a new object describing the decision. Both carry \`id: 'first'\`, the label connecting this reply to this request.

${predict('In this direct function call, which line finishes first?', 'exampleHost returns its reply before the reply log runs', 'The reply log runs before exampleHost returns', 'An ordinary return gives the caller a value immediately. A real host message will arrive later, which is why a later lesson introduces waiting.')}

Procedure: write one request; pass it to the receiver; read the returned reply; match its id. The \`type\` word names the operation. It prevents confusing a preview request with a future different action. \`ok\` is a boolean decision, not a string containing the word true.

${check('node Web/src/traceExchange.mjs', 'reply first true Ready: Ada × 2', 'Trace one synchronous exchange')}

## Convert one field before building the packet

JavaScript's \`Number('2')\` produces 2. \`Number('')\` produces 0, so this conversion belongs **after** the browser validator has rejected empty input. Conversion is not validation. An object literal uses \`key: value\` pairs like a Python dictionary; property names may be unquoted identifiers in JavaScript.

${code('javascript', 'Web/src/conversionExample.mjs', `const quantityText = '2';
const quantity = Number(quantityText);
console.log(typeof quantityText, typeof quantity);
console.log(JSON.stringify({ quantity: quantity }));`)}

Run \`node Web/src/conversionExample.mjs\`. \`typeof\` reports the value kind. \`JSON.stringify\` turns an object into JSON text for storage or transmission. Notice that the printed 2 has no quotes. The next lesson reads that distinction from C#.

Diagnostic: change \`quantity: 2\` in the trace request to \`quantity: '2'\`. The permissive example still says Ready because JavaScript compares these values by converting the string. Restore the number. Explain why that apparent success must not establish the host contract.

${check('node Web/src/conversionExample.mjs', 'string number', 'Observe text and numeric values')}

## Your turn: assemble a request without changing the draft

Create \`Web/src/makePreviewRequest.js\`. Export \`makePreviewRequest(draft, id)\`. The input draft has \`name\` and \`quantityText\`; it has already passed \`validateDraft\`. Return a fresh object with exactly \`type: 'preview'\`, the supplied id, the trimmed name and a **numeric** quantity. Leave the caller's draft unchanged. Use **Create provided** on the earlier receiver step to install this lesson's tests.

Before coding, write the expected object for \`{name: ' Ben ', quantityText: '9'}\` with id \`retry\`. Then implement it from that expectation. Import your function into the trace yourself and replace its hard-coded request. Keep the receiver stand-in clearly named; this is still a local rehearsal.

${hints('Which two input fields need a different representation in the request?', 'Return a new object. String trim and numeric conversion each produce a value you can put in that object.', 'The output keys are type, id, name and quantity. The last key reads quantityText from the draft, then converts it.')}

${check('node --test Web/tests/request.test.mjs', 'pass 1', 'Request shape preserves numeric data and its id')}

Retain \`evidence/react-4-3a.md\`: your predicted packet, the actual trace, and why the stand-in accepting a string is insufficient evidence.`);
action('04-03a-one-request-and-one-reply', 'Your turn: assemble a request without changing the draft', { files: { 'Web/src/makePreviewRequest.js': requestAnswer }, wrong: [{ name: 'copy text quantity across the boundary', files: { 'Web/src/makePreviewRequest.js': requestAnswer.replace('Number(draft.quantityText)', 'draft.quantityText') }, fails: [0] }, { name: 'mutate the form draft while trimming', files: { 'Web/src/makePreviewRequest.js': requestAnswer.replace('  return {', "  draft.name = draft.name.trim();\n  return {") }, fails: [0] }] });

const fieldsStarter = `using System.Text.Json;
namespace FormDesk.ReactHost;

public static class ProtocolFields
{
    public static string? Text(JsonElement root, string key)
    {
        if (root.ValueKind != JsonValueKind.Object) return null;
        if (!root.TryGetProperty(key, out JsonElement value)) return null;
        if (value.ValueKind != JsonValueKind.String) return null;
        return value.GetString();
    }

    public static int? Quantity(JsonElement root)
    {
        // Your turn: accept only an actual JSON whole number.
        return null;
    }
}`;
const quantityBody = `        if (root.ValueKind != JsonValueKind.Object) return null;
        if (!root.TryGetProperty("quantity", out JsonElement value)) return null;
        if (value.ValueKind != JsonValueKind.Number) return null;
        if (!value.TryGetInt32(out int quantity)) return null;
        return quantity;`;
const fieldsAnswer = fieldsStarter.replace('        // Your turn: accept only an actual JSON whole number.\n        return null;', quantityBody);
const fieldProbe = `using System.Text.Json;
using FormDesk.ReactHost;
static void Expect(bool condition, string label) { if (!condition) throw new Exception("FAIL: " + label); }
static void Name(string json, string? expected)
{
    using JsonDocument document = JsonDocument.Parse(json);
    Expect(ProtocolFields.Text(document.RootElement, "name") == expected, "name " + json);
}
static void Quantity(string json, int? expected)
{
    using JsonDocument document = JsonDocument.Parse(json);
    Expect(ProtocolFields.Quantity(document.RootElement) == expected, "quantity " + json);
}
Name("""{"name":"Ada"}""", "Ada");
Name("""{"name":4}""", null);
Name("{}", null);
Name("[]", null);
if (args.Contains("quantity"))
{
    Quantity("""{"quantity":2}""", 2);
    Quantity("""{"quantity":100}""", 100);
    Quantity("""{"quantity":0}""", 0);
    Quantity("""{"quantity":"2"}""", null);
    Quantity("""{"quantity":1.5}""", null);
    Quantity("""{"quantity":true}""", null);
    Quantity("""{"quantity":null}""", null);
    Quantity("""{"quantity":99999999999}""", null);
    Quantity("{}", null);
    Quantity("[]", null);
}
Console.WriteLine(args.Contains("quantity") ? "quantity kinds passed" : "name kinds passed");`;
lesson('04-03b-check-json-kinds', '4.3b — JSON Numbers Are Not Text', [], `Outcome: read one field from JSON in C# without silently converting a wrong kind. Finish 4.3a. This helper will be used by the actual host in 4.4. All commands run from your project root in Windows PowerShell.

## Read the name before touching the quantity

Compare \`{"name":"Ada","quantity":2}\` and \`{"name":"Ada","quantity":"2"}\`. The first contains a number. The second contains text. The form may look identical, but a message boundary must decide which it accepts.

C#'s \`JsonDocument.Parse\` reads JSON text into a document. Its \`RootElement\` is the outermost value. That value might be an object, an array or something else. \`ValueKind\` tells us which kind we actually received.

${code('csharp', 'ReactHost/ProtocolFields.cs', fieldsStarter)}

Read \`Text\` from top to bottom. It first requires an object. \`TryGetProperty\` finds a key without throwing when it is missing. The \`out\` variable receives the value if found. Only after verifying a string do we call \`GetString\`. \`string?\` allows a missing result, represented by \`null\`. This is a boundary rejection, not the empty-string success convention used by RequestRules.

Procedure: check the container; find the property; check its kind; read its value. Return no value when any step fails. This prevents a missing key from crashing the host.

## Try the name reader without a window

Use **Create provided** for the probe. It links your actual helper source. The provided assertions make the command fail on a wrong decision; they do not implement the reader for you. \`using JsonDocument\` releases the document when the method exits. The triple quotes hold JSON text without escaping its quotes.

${code('xml', 'FieldProbe/FieldProbe.csproj', `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup>
  <ItemGroup><Compile Include="../ReactHost/ProtocolFields.cs" Link="ProtocolFields.cs" /></ItemGroup>
</Project>`, true)}

${code('csharp', 'FieldProbe/Program.cs', fieldProbe, true)}

${predict('Should the Text reader turn the JSON number 4 into the name "4"?', 'No, a name must already be JSON text', 'Yes, every value can become text', 'Boundary readers establish which kinds were sent. Converting a number into a string would hide the contract mistake.')}

${check('dotnet run --project FieldProbe', 'name kinds passed', 'Read only actual JSON string names', 120)}

Diagnostic: temporarily remove the string-kind guard from \`Text\` and run the probe. The numeric name now reaches \`GetString\` and throws. Restore the guard and rerun. Describe the difference between politely returning null and throwing while reading a wrong kind.

## Your turn: read only a whole numeric quantity

Implement \`ProtocolFields.Quantity\`. It returns \`int?\`: either a whole number or null. Follow the same four-step procedure. Require a JSON number, then use \`value.TryGetInt32(out int quantity)\` to check whether it fits an integer. Return null for text \`"2"\`, fractions, booleans, null, missing fields and non-object roots. Do not call \`int.Parse\` on a string.

The value 0 must return **0** here. Shape reading answers “was a whole number sent?” The already-taught \`RequestRules.Validate\` later answers “is that whole number allowed?” Keeping these separate lets the host return a useful range error instead of misreporting a type error.

${hints('Which operations from Text can be reused before any numeric read?', 'JsonValueKind.Number checks the JSON kind. TryGetInt32 then rejects fractions and values too large for int.', 'Use early returns for a non-object, missing property, wrong kind and failed integer read. Only the final return supplies the integer.')}

${check('dotnet run --project FieldProbe -- quantity', 'quantity kinds passed', 'Reject text and fractional quantities without coercion', 120)}

Retain \`evidence/react-4-3b.md\` with a table for number 2, text "2", fraction 1.5 and number 0. Give the returned value and the later business-rule decision. Add a JSON case of your own to the probe.`);
action('04-03b-check-json-kinds', 'Try the name reader without a window', { wrong: [{ name: 'accept numeric names as strings', editFiles: { 'ReactHost/ProtocolFields.cs': [['if (value.ValueKind != JsonValueKind.String) return null;', 'if (value.ValueKind != JsonValueKind.String) return value.ToString();']] }, fails: [0] }] });
action('04-03b-check-json-kinds', 'Your turn: read only a whole numeric quantity', { files: { 'ReactHost/ProtocolFields.cs': fieldsAnswer }, wrong: [{ name: 'turn JSON numeric strings into numbers', files: { 'ReactHost/ProtocolFields.cs': fieldsAnswer.replace('if (value.ValueKind != JsonValueKind.Number) return null;', 'if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out int parsed)) return parsed;\n        if (value.ValueKind != JsonValueKind.Number) return null;') }, fails: [0] }, { name: 'confuse shape with allowed range', files: { 'ReactHost/ProtocolFields.cs': fieldsAnswer.replace('        return quantity;', '        return quantity < 1 ? null : quantity;') }, fails: [0] }] });

const oneStarter = `export function createOnePreview(send) {
  let waiting = null;

  function preview(draft) {
    if (waiting !== null) return Promise.reject(new Error('Already waiting.'));
    return new Promise((resolve) => {
      waiting = resolve;
      send({ type: 'preview', id: 'one', name: draft.name, quantity: draft.quantity });
    });
  }

  function receive(reply) {
    if (waiting === null) return;
    const finish = waiting;
    waiting = null;
    finish(reply);
  }

  return { preview: preview, receive: receive };
}`;
const replyAnswer = `export function isPreviewReply(value) {
  return value !== null && typeof value === 'object'
    && value.type === 'previewResult' && typeof value.id === 'string'
    && typeof value.ok === 'boolean' && typeof value.message === 'string';
}`;
const oneAnswer = `import { isPreviewReply } from './isPreviewReply.js';\n` + oneStarter.replace('    if (waiting === null) return;', "    if (!isPreviewReply(reply) || reply.id !== 'one' || waiting === null) return;");
support('Web/tests/onePreview.test.mjs', `import test from 'node:test';
import assert from 'node:assert/strict';
import { createOnePreview } from '../src/onePreview.js';
test('one waiting request settles only for a valid matching reply', async () => {
  const sent = [];
  const client = createOnePreview(value => sent.push(value));
  let finished = false;
  const result = client.preview({ name: 'Ada', quantity: 2 }).then(value => { finished = true; return value; });
  assert.equal(sent[0].quantity, 2);
  await assert.rejects(client.preview({ name: 'Ben', quantity: 3 }), /Already waiting/);
  client.receive(null);
  client.receive({ type: 'previewResult', id: 'one', ok: 'true', message: 'Wrong kind' });
  client.receive({ type: 'other', id: 'one', ok: true, message: 'Wrong operation' });
  client.receive({ type: 'previewResult', id: 'someone-else', ok: true, message: 'Wrong request' });
  await Promise.resolve();
  assert.equal(finished, false);
  client.receive({ type: 'previewResult', id: 'one', ok: false, message: 'Enter a name.' });
  assert.equal((await result).message, 'Enter a name.');
  const next = client.preview({ name: 'Ben', quantity: 3 });
  client.receive({ type: 'previewResult', id: 'one', ok: true, message: 'Ready: Ben × 3' });
  assert.equal((await next).ok, true);
});`);
lesson('04-03c-wait-for-one-reply', '4.3c — Wait for One Reply', ['Web/tests/onePreview.test.mjs'], `Outcome: keep one request waiting until a matching, correctly shaped reply arrives. Finish 4.3b. Run commands from the project root in Windows PowerShell.

## See why a direct return is too early

The direct receiver in 4.3a returned Ready immediately. A desktop host runs the work elsewhere. Sending a message starts the exchange; it cannot return a C# reply on that same line. A Promise is a JavaScript object representing a result that will arrive later. Like a Python Future, it is not yet that result.

First use one known Promise. \`Promise.resolve\` creates an already successful Promise. \`await\` unwraps its eventual result. This tiny example requires no window or timer.

${code('javascript', 'Web/src/awaitExample.mjs', `const waiting = Promise.resolve({ ok: true, message: 'Ready: Ada × 2' });
console.log('before', waiting.message);
const reply = await waiting;
console.log('after', reply.message);`)}

${predict('What does waiting.message print before await?', 'undefined', 'Ready: Ada × 2', 'waiting is a Promise. The message belongs to the result that await obtains, not to that Promise object.')}

${check('node Web/src/awaitExample.mjs', 'before undefined', 'Distinguish a Promise from its result')}

## Hold one completion function

In \`new Promise((resolve) => { ... })\`, JavaScript supplies \`resolve\`, a function that finishes this Promise successfully. Save it in \`waiting\` so the later receiver can call it. Both nested functions access the same outer variable; this is a closure. It resembles a nested Python function reading its enclosing state.

${code('javascript', 'Web/src/onePreview.js', oneStarter)}

Trace Ada's request. \`preview\` saves resolve, calls send, then returns the unfinished Promise. Later \`receive\` copies that completion function, empties the slot, and finishes with the reply. A second preview during that wait rejects with an Error; it must not replace the first function. \`Promise.reject\` creates a failed Promise. A real interface will catch that failure.

Procedure: reserve the slot before sending; refuse another request while occupied; accept only the right reply; empty the slot before completing it. This client deliberately supports one waiting request. It has no timeout or safe retry yet.

## Drive the two calls separately

Use **Create provided** to install the tests and this driver. The send callback only logs; the driver explicitly delivers the reply. Nothing here claims C# ran.

${code('javascript', 'Web/src/oneTrace.mjs', `import { createOnePreview } from './onePreview.js';
const client = createOnePreview(request => console.log('sent', request.id));
const pending = client.preview({ name: 'Ada', quantity: 2 });
console.log('still here');
client.receive({ type: 'previewResult', id: 'one', ok: true, message: 'Ready: Ada × 2' });
console.log('finished', (await pending).message);`, true)}

${check('node Web/src/oneTrace.mjs', 'finished Ready: Ada × 2', 'Finish one Promise through a separate receive call')}

Diagnostic: put \`client.receive(...)\` before the preview call. No one is waiting, so that reply is discarded; Node reports an unsettled top-level await. Stop with Ctrl+C if needed. Restore the original order. Explain why sending first is insufficient unless the receiving slot was registered first.

## Your turn: refuse the wrong reply

Create \`Web/src/isPreviewReply.js\`, exporting \`isPreviewReply(value)\`. Return true only for a non-null object with type \`previewResult\`, string id, **boolean** ok and string message. A string \`'true'\` is not a boolean. Use \`typeof\` for value kinds. Check for null first because \`typeof null\` is \`'object'\` in JavaScript.

Import that helper in \`onePreview.js\`. Change receive to ignore invalid replies and any id other than \`one\`, without emptying the waiting slot. A correctly shaped \`ok: false\` reply must complete normally: a host rejection is a successful delivery of a negative decision.

${hints('Should a message with ok:false be discarded, or displayed as a rejection?', 'Validate the shape, not whether the business decision is positive. The matching id is a separate condition.', 'Put the guard before copying waiting or clearing it. Keep the existing successful completion path.')}

${check('node --test Web/tests/onePreview.test.mjs', 'pass 1', 'Wrong kinds and ids leave the real request waiting')}

Retain \`evidence/react-4-3c.md\` with the order of sent/still here/finished, a trace of a malformed reply, and why a rejected decision still resolves the Promise.`);
action('04-03c-wait-for-one-reply', 'Your turn: refuse the wrong reply', { files: { 'Web/src/isPreviewReply.js': replyAnswer, 'Web/src/onePreview.js': oneAnswer }, wrong: [{ name: 'truthy string counts as a boolean', files: { 'Web/src/isPreviewReply.js': replyAnswer.replace("typeof value.ok === 'boolean'", 'Boolean(value.ok)') }, fails: [0] }, { name: 'accept another request id', files: { 'Web/src/onePreview.js': oneAnswer.replace("reply.id !== 'one' || ", '') }, fails: [0] }] });

const deadlineStarter = `export function startDeadline(timeoutMs, onExpire) {
  const timer = setTimeout(onExpire, timeoutMs);
  return function cancel() {
    // Your turn: stop the scheduled callback.
  };
}`;
const deadlineAnswer = deadlineStarter.replace('    // Your turn: stop the scheduled callback.', '    clearTimeout(timer);');
const retryStarter = `import { isPreviewReply } from './isPreviewReply.js';
import { startDeadline } from './deadline.js';

export function createRetryPreview(send, timeoutMs = 5000) {
  let waiting = null;
  let sequence = 1;

  function preview(draft) {
    if (waiting !== null) return Promise.reject(new Error('Already waiting.'));
    const id = 'practice-' + sequence;
    sequence = sequence + 1;
    return new Promise((resolve, reject) => {
      const cancel = startDeadline(timeoutMs, () => {
        reject(new Error('No reply. Try again.'));
      });
      waiting = { id: id, finish: resolve, cancel: cancel };
      send({ type: 'preview', id: id, name: draft.name, quantity: draft.quantity });
    });
  }

  function receive(reply) {
    if (!isPreviewReply(reply) || waiting === null) return;
    const request = waiting;
    waiting = null;
    request.finish(reply);
  }

  return { preview: preview, receive: receive };
}`;
const retryAnswer = retryStarter.replace("        reject(new Error('No reply. Try again.'));", "        waiting = null;\n        reject(new Error('No reply. Try again.'));")
  .replace('if (!isPreviewReply(reply) || waiting === null) return;', 'if (!isPreviewReply(reply) || waiting === null || reply.id !== waiting.id) return;')
  .replace('    request.finish(reply);', '    request.cancel();\n    request.finish(reply);');
support('Web/tests/deadline.test.mjs', `import test from 'node:test';
import assert from 'node:assert/strict';
import { startDeadline } from '../src/deadline.js';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
test('deadline runs once unless cancelled, and cancellation can be repeated', async () => {
  let expired = 0;
  startDeadline(10, () => { expired += 1; });
  await wait(30);
  assert.equal(expired, 1);
  const cancel = startDeadline(10, () => { expired += 1; });
  cancel(); cancel();
  await wait(30);
  assert.equal(expired, 1);
});`);
support('Web/tests/retry.test.mjs', `import test from 'node:test';
import assert from 'node:assert/strict';
import { createRetryPreview } from '../src/retryPreview.js';
test('timeout frees the slot and an old reply cannot complete the retry', async () => {
  const sent = [];
  const client = createRetryPreview(request => sent.push(request), 40);
  await assert.rejects(client.preview({ name: 'Ada', quantity: 2 }), /No reply/);
  let complete = false;
  const retry = client.preview({ name: 'Ben', quantity: 3 }).then(reply => { complete = true; return reply; });
  assert.notEqual(sent[0].id, sent[1].id);
  client.receive({ type: 'previewResult', id: sent[0].id, ok: true, message: 'Old Ada result' });
  await Promise.resolve();
  assert.equal(complete, false);
  client.receive({ type: 'previewResult', id: sent[1].id, ok: false, message: 'Ben rejected' });
  assert.equal((await retry).message, 'Ben rejected');
});`);
lesson('04-03d-timeouts-and-retries', '4.3d — Stop Waiting, Then Retry', ['Web/tests/deadline.test.mjs', 'Web/tests/retry.test.mjs'], `Outcome: release a timed-out request and prevent its late reply from completing a newer request. Finish 4.3c. Run commands in Windows PowerShell from the same project root.

## Schedule a failure you can cancel

Ada presses Preview, but no host answers. A Promise can stay unfinished forever. We need a deadline: after a chosen delay, show a delivery failure and allow another attempt. This is different from C# answering \`ok: false\`.

\`setTimeout(callback, milliseconds)\` schedules a future callback and returns a timer handle. It does not stop the program while waiting. \`clearTimeout(handle)\` cancels that scheduled work. First watch one timer in isolation.

${code('javascript', 'Web/src/timerExample.mjs', `console.log('start');
setTimeout(() => console.log('expired'), 20);
console.log('still responsive');`)}

${predict('Which appears before expired?', 'still responsive', 'Nothing; setTimeout blocks until it expires', 'setTimeout schedules the callback and returns immediately. The current code continues before that callback runs.')}

${check('node Web/src/timerExample.mjs', 'still responsive', 'Observe a scheduled callback without blocking')}

## Your turn: build a cancellable deadline

Start with this small incomplete helper. Its returned function closes over the timer handle, just as the previous client's receiver closed over its waiting slot. Complete the function so calling cancel prevents expiry. Calling cancel twice must be harmless. Use **Create provided** for the test and retry scaffold in the next step.

${code('javascript', 'Web/src/deadline.js', deadlineStarter)}

This scaffold is an exercise start, not the answer. Procedure: schedule the expiry callback once; retain its handle; return a function that stops that same handle. Do not call onExpire while creating or cancelling the deadline.

${hints('Which function reverses setTimeout?', 'The handle identifies scheduled work. Cancelling that handle does not invoke the callback.', 'Use the timer variable captured by the returned function as the argument to the cancellation API.')}

${check('node --test Web/tests/deadline.test.mjs', 'pass 1', 'Cancellation prevents the scheduled failure')}

## Give every attempt a new identity

Use **Create provided** for this unfinished retry client. It retains the single waiting slot you built; it adds an increasing sequence. \`'practice-' + sequence\` builds a new label before the counter increases. No Map or simultaneous requests are needed yet.

${code('javascript', 'Web/src/retryPreview.js', retryStarter, true)}

Trace it before editing: the first deadline rejects but leaves waiting occupied. A second attempt is blocked. Its receiver also accepts any id and forgets to cancel the deadline. These are **three deliberately unfinished behaviours**, not examples to keep.

Diagnostic: run \`node --test Web/tests/retry.test.mjs\` now. Expect a failure mentioning Already waiting. Save this starter as \`evidence/retry-before.js\`; keep editing \`retryPreview.js\`. If you lose track, restore that saved starter and apply one repair at a time.

## Your turn: repair the retry lifecycle

Repair all three behaviours without changing the public API. On timeout, empty the slot before rejecting. On reply, require its id to equal the current waiting id. On successful delivery, cancel that request's deadline before resolving. Preserve valid negative decisions and the busy guard.

Predict this exact sequence before running: first request times out; second starts; the first request's reply arrives; the second request's reply arrives. Only the last reply may complete the second Promise. Add that trace and your actual result to \`evidence/react-4-3d.md\`.

${hints('An old reply can be correctly shaped. What makes it the wrong reply now?', 'The waiting entry carries the current id and cancellation function. Compare before clearing; cancel only the matching entry.', 'Timeout clears waiting, receive guards the id, and the matched request cancels its timer before finishing.')}

${check('node --test Web/tests/retry.test.mjs', 'pass 1', 'A late reply cannot complete a retry')}

This practice client assumes send itself works. It has no listener ownership or window-close cancellation. The final supplied transport adds those cases after the next lesson teaches connection cleanup.`);
// Your turn steps must not expose their target. Keep the scaffold in the preceding conceptual step.
files['04-03d-timeouts-and-retries.md'] = files['04-03d-timeouts-and-retries.md'].replace('## Your turn: build a cancellable deadline', '## Prepare a cancellable deadline').replace('## Give every attempt a new identity', `## Your turn: build a cancellable deadline

Complete the cancellation function from the preceding scaffold. Run this lesson's deadline test; observe that the same test fails if you remove cancellation again, then restore your repair.

${hints('Which function reverses setTimeout?', 'The handle identifies scheduled work. Cancelling that handle does not invoke the callback.', 'Use the timer variable captured by the returned function as the argument to the cancellation API.')}

${check('node --test Web/tests/deadline.test.mjs', 'pass 1', 'Cancellation prevents the scheduled failure')}

## Give every attempt a new identity`);
// Tests must be installed before the first exercise. The explicit provided probe is intentionally infrastructure.
files['04-03d-timeouts-and-retries.md'] = files['04-03d-timeouts-and-retries.md'].replace('## Prepare a cancellable deadline', `${code('javascript', 'Web/tests/deadline.test.mjs', files['support/Web/tests/deadline.test.mjs'], true)}

## Prepare a cancellable deadline`);
// A starter cannot pass its final check; keep the runnable check only on the independent task.
files['04-03d-timeouts-and-retries.md'] = files['04-03d-timeouts-and-retries.md'].replace(check('node --test Web/tests/deadline.test.mjs', 'pass 1', 'Cancellation prevents the scheduled failure'), 'Run the final deadline test after implementing cancellation in Your turn.');
action('04-03d-timeouts-and-retries', 'Your turn: build a cancellable deadline', { files: { 'Web/src/deadline.js': deadlineAnswer }, wrong: [{ name: 'leave deadline running after cancellation', files: { 'Web/src/deadline.js': deadlineStarter }, fails: [0] }] });
action('04-03d-timeouts-and-retries', 'Your turn: repair the retry lifecycle', { files: { 'Web/src/retryPreview.js': retryAnswer }, wrong: [{ name: 'retain occupied slot after timeout', files: { 'Web/src/retryPreview.js': retryAnswer.replace('        waiting = null;\n', '') }, fails: [0] }, { name: 'old reply satisfies new request', files: { 'Web/src/retryPreview.js': retryAnswer.replace(' || reply.id !== waiting.id', '') }, fails: [0] }] });

const connectionAnswer = `import { isPreviewReply } from './isPreviewReply.js';
export function connectReplies(transport, onReply) {
  let active = true;
  function receive(event) {
    if (active && isPreviewReply(event.data)) onReply(event.data);
  }
  transport.addEventListener('message', receive);
  return function disconnect() {
    if (!active) return;
    active = false;
    transport.removeEventListener('message', receive);
  };
}`;
support('Web/tests/connection.test.mjs', `import test from 'node:test';
import assert from 'node:assert/strict';
import { connectReplies } from '../src/connectReplies.js';
test('connection owns exactly one listener and disconnects the same callback', () => {
  const listeners = new Set();
  const removed = [];
  const transport = {
    addEventListener(type, callback) { assert.equal(type, 'message'); listeners.add(callback); },
    removeEventListener(type, callback) { assert.equal(type, 'message'); removed.push(callback); listeners.delete(callback); },
  };
  const replies = [];
  const disconnect = connectReplies(transport, reply => replies.push(reply));
  assert.equal(listeners.size, 1);
  const receive = [...listeners][0];
  receive({ data: { type: 'other', id: '1', ok: true, message: 'Ignore' } });
  receive({ data: { type: 'previewResult', id: '1', ok: false, message: 'Enter a name.' } });
  assert.equal(replies.length, 1);
  assert.equal(replies[0].ok, false);
  disconnect(); disconnect();
  assert.equal(listeners.size, 0);
  assert.equal(removed.length, 1);
  assert.equal(removed[0], receive);
  receive({ data: { type: 'previewResult', id: '1', ok: true, message: 'Late' } });
  assert.equal(replies.length, 1);
  const again = connectReplies(transport, reply => replies.push(reply));
  assert.equal(listeners.size, 1);
  again();
});`);
lesson('04-03e-own-the-listener', '4.3e — Connect Once, Disconnect Once', ['Web/tests/connection.test.mjs'], `Outcome: own a message listener and release the same function when the interface disconnects. Finish 4.3d. Work from the same project root in Windows PowerShell.

## Give a connection an owner

Your retry client has a receive function, but someone must call it when a message arrives. WebView2 delivers an event object. Its \`data\` property contains the reply object. \`addEventListener('message', receive)\` subscribes a function to future messages. Removing the component should end that subscription.

First use Node's built-in EventTarget to see the ownership rule without a window. It models subscription, not WebView2 delivery. \`new Event('message')\` creates a test event.

${code('javascript', 'Web/src/listenerExample.mjs', `const source = new EventTarget();
function receive() { console.log('heard'); }
source.addEventListener('message', receive);
source.dispatchEvent(new Event('message'));
source.removeEventListener('message', receive);
source.dispatchEvent(new Event('message'));
console.log('finished');`)}

${predict('How many heard lines appear?', 'One', 'Two', 'The second dispatch occurs after removal. Removal works because it receives the same receive function object that was registered.')}

${check('node Web/src/listenerExample.mjs', 'heard', 'Observe a listener before and after removal')}

Diagnostic: replace the removal argument with \`() => receive()\`. This creates a different function, so the original stays subscribed and heard appears twice. Restore the original receive reference. Rerun and count the lines yourself; the check alone only confirms that at least one line exists.

Procedure: define one callback; register that callback; retain the same reference; remove it during cleanup. An active flag can additionally prevent an already queued callback from calling into a closed interface.

## Install a connection probe

Use **Create provided** for the behavioural probe. It remembers callback identities in a Set, which is a collection that stores each value once. The probe sends a rejected reply too: connections deliver decisions, regardless of their ok value.

${code('javascript', 'Web/tests/connection.test.mjs', files['support/Web/tests/connection.test.mjs'], true)}

## Your turn: own and release a subscription

Create \`Web/src/connectReplies.js\`. Export \`connectReplies(transport, onReply)\`. Subscribe one named callback to \`message\`. Read \`event.data\`; call onReply only when your earlier \`isPreviewReply\` accepts it. Return a disconnect function. It must remove the exact registered callback, be harmless if called twice, and prevent later callback delivery after disconnect. Use a boolean active flag to remember whether this connection is still open.

Do not use a new arrow function when removing the callback. Do not reconnect inside a receive callback. An interface that sets up, cleans up, then sets up again should have exactly one current listener.

${hints('Which values must the returned disconnect function remember?', 'A closure retains the original receive function and the active flag. Check the flag both while delivering and while disconnecting.', 'Define receive once. Add it once. Disconnect flips active to false and removes that same receive function only on the first call.')}

${check('node --test Web/tests/connection.test.mjs', 'pass 1', 'One connection releases the listener it owns')}

## Recognize the React lifecycle

React's \`useEffect\` runs setup after a component appears. A function returned by setup is cleanup. The empty dependency array \`[]\` means this setup does not depend on current field values. React may repeat setup/cleanup/setup during development to detect missing cleanup.

Read this small pattern; do not paste it into the form yet. In the final lesson the supplied client owns its listener and exposes dispose, so the Effect calls that cleanup instead.


\`\`\`jsx
useEffect(() => {
  const disconnect = connectReplies(transport, reply => setMessage(reply.message));
  return disconnect;
}, []);
\`\`\`

The component declares what connection exists while it is present. A submit handler should send work through that connection; it should not create another listener on every click. See [React's Effect reference](https://react.dev/reference/react/useEffect) for this setup/cleanup contract.

Retain \`evidence/react-4-3e.md\`: why the wrong removal failed, the callback count after repeated connection/cleanup, and what would happen after three submits if each added a listener without removal.`);
action('04-03e-own-the-listener', 'Your turn: own and release a subscription', { files: { 'Web/src/connectReplies.js': connectionAnswer }, wrong: [{ name: 'remove a new callback instead of the original', files: { 'Web/src/connectReplies.js': connectionAnswer.replace("transport.removeEventListener('message', receive);", "transport.removeEventListener('message', event => receive(event));") }, fails: [0] }, { name: 'deliver an already queued callback after disconnect', files: { 'Web/src/connectReplies.js': connectionAnswer.replace('if (active && isPreviewReply(event.data))', 'if (isPreviewReply(event.data))') }, fails: [0] }] });

// Preserve published heading/progress identities while replacing their instructional content.
const protocol = oldFile('ReactHost/BridgeProtocol.cs')
  .replace('Text(root, "id")', 'ProtocolFields.Text(root, "id")')
  .replace('Text(root, "type")', 'ProtocolFields.Text(root, "type")')
  .replace('Text(root, "name")', 'ProtocolFields.Text(root, "name")')
  .replace(/            if \(!root.TryGetProperty\("quantity"[\s\S]*?return Reply\(id, false, "Quantity must be a whole number\."\);/, `            int? parsedQuantity = ProtocolFields.Quantity(root);
            if (parsedQuantity is null) return Reply(id, false, "Quantity must be a whole number.");
            int quantity = parsedQuantity.Value;`)
  .replace(/    private static string\? Text[\s\S]*?    private static string Reply/, '    private static string Reply');
let client = oldFile('Web/src/bridge.js');
let app = oldFile('Web/src/App.jsx');
// The learner implements orchestration later. The starter has a visible, truthful failure.
const resultStarter = `import { validateDraft } from './validateDraft.js';
export function resultMessage(result) {
  return result.message;
}

export async function submitToHost(client, name, quantityText) {
  return { ok: false, message: 'Host submission not implemented.' };
}`;
const resultAnswer = `import { validateDraft } from './validateDraft.js';
export function resultMessage(result) {
  const prefix = result.ok ? 'Accepted by C#: ' : 'Needs attention: ';
  return prefix + result.message;
}

export async function submitToHost(client, name, quantityText) {
  const error = validateDraft(name, quantityText);
  if (error !== '') return { ok: false, message: error };
  try {
    const result = await client.preview({ name: name.trim(), quantity: Number(quantityText) });
    return { ok: result.ok, message: resultMessage(result) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Preview failed. Try again.' };
  }
}`;
app = app.replace("import { resultMessage } from './resultMessage.js';", "import { submitToHost } from './resultMessage.js';")
  .replace("    const error = validateDraft(name, quantityText);\n    if (error !== '') { setMessage(error); return; }\n", '')
  .replace("      const result = await client.preview({ name: name.trim(), quantity: Number(quantityText) });\n      setMessage(resultMessage(result));", "      const result = await submitToHost(client, name, quantityText);\n      setMessage(result.message);")
  .replace("import { validateDraft } from './validateDraft.js';\n", '')
  .replace('  return (', `  function reset() {
    setName('');
    setQuantityText('1');
    setMessage('Enter a request.');
  }

  return (`)
  .replace("        <button type=\"submit\" disabled={!client || busy}>{busy ? 'Checking…' : 'Preview'}</button>", "        <button type=\"submit\" disabled={!client || busy}>{busy ? 'Checking…' : 'Preview'}</button>\n        <button type=\"button\" disabled={busy} onClick={reset}>Reset</button>");
const resultTest = `import test from 'node:test';
import assert from 'node:assert/strict';
import { resultMessage, submitToHost } from '../src/resultMessage.js';
test('submission awaits C#, converts data and reports validation and delivery failures', async () => {
  assert.equal(resultMessage({ ok: true, message: 'Ready: Ada × 2' }), 'Accepted by C#: Ready: Ada × 2');
  assert.equal(resultMessage({ ok: false, message: 'Ready is only a word' }), 'Needs attention: Ready is only a word');
  const sent = [];
  const accepted = { preview: async draft => { sent.push(draft); return { ok: true, message: 'Host accepted' }; } };
  assert.deepEqual(await submitToHost(accepted, ' Ada ', '2'), { ok: true, message: 'Accepted by C#: Host accepted' });
  assert.deepEqual(sent, [{ name: 'Ada', quantity: 2 }]);
  assert.equal((await submitToHost(accepted, ' ', '2')).ok, false);
  assert.equal((await submitToHost(accepted, 'Ada', '1.5')).ok, false);
  assert.equal(sent.length, 1, 'invalid browser draft is not sent');
  const rejected = { preview: async () => ({ ok: false, message: 'C# rejected it' }) };
  assert.deepEqual(await submitToHost(rejected, 'Ada', '2'), { ok: false, message: 'Needs attention: C# rejected it' });
  const failed = { preview: async () => { throw new Error('No reply. Try again.'); } };
  assert.deepEqual(await submitToHost(failed, 'Ada', '2'), { ok: false, message: 'No reply. Try again.' });
  const pending = { preview: async () => { await Promise.resolve(); return { ok: true, message: 'Later reply' }; } };
  assert.equal((await submitToHost(pending, 'Ada', '2')).message, 'Accepted by C#: Later reply');
});`;
support('Web/tests/result.test.mjs', resultTest);
const boundaryProject = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net10.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable></PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="../Core/Core.csproj" />
    <Compile Include="../ReactHost/HostPolicy.cs" Link="HostPolicy.cs" />
    <Compile Include="../ReactHost/ProtocolFields.cs" Link="ProtocolFields.cs" />
    <Compile Include="../ReactHost/BridgeProtocol.cs" Link="BridgeProtocol.cs" />
  </ItemGroup>
</Project>`;
lesson('04-04-csharp-is-the-authority', '4.4 — Assemble the Real Host Roundtrip', ['Web/tests/bridge.test.mjs', 'Web/tests/result.test.mjs'], `Outcome: independently orchestrate a form submission whose accepted decision comes from the real C# rules. Finish **4.3a through 4.3e** first. They teach message shape, one waiting Promise, safe retry and listener ownership separately. All commands run in Windows PowerShell at the project root.

This lesson assembles those pieces. The Windows adapter and full concurrent transport below are **provided infrastructure**. Reading their references is optional. You are not expected to reproduce them from memory. Your independent work is the submission function, with tests that distinguish local validation, host rejection and missing delivery. No Mastercam operation is performed.

## Create the bridge checks

Use **Create provided** for the existing transport tests. These check delivery with a fake transport, not whether C# executed. Read the first input/result pair before continuing: two pending requests can receive replies in reverse order. Your practice client supports one pending request; this supplied production client additionally supports several.

${code('javascript', 'Web/tests/bridge.test.mjs', oldFile('Web/tests/bridge.test.mjs'), true)}

## Define the message boundary in C#

The real request keeps the shape from 4.3a: \`{type:'preview',id:'preview-1',name:'Ada',quantity:2}\`. The helper **you built** in 4.3b reads the fields. The host then calls the same \`RequestRules.Validate\` used by the native form. Shape checks happen before business rules.

Trace quantity 0: your Quantity reader returns 0 because it is a whole JSON number; RequestRules rejects its range. Trace text "2": your reader returns null, so business validation never runs. Trace quantity 2 with Ada: validation returns the empty error string, and the host creates an accepted reply.

Use **Create provided** for this adapter. \`JsonSerializer.Serialize\` escapes text safely. It builds JSON data, never executable script. Sender policy, maximum size, missing ids and malformed JSON are infrastructure guards. A null reply means the host ignores a message it cannot safely answer.

${code('csharp', 'ReactHost/BridgeProtocol.cs', protocol, true)}

Procedure: authenticate the source; read typed fields; validate the domain values; return a typed decision with the original id. The caller must not equate “message arrived” with “request accepted.”

## Connect the control to the boundary

Use **Create provided** for the Windows event adapter. The change from 4.3 is small: enable messaging and subscribe to WebMessageReceived. Its callback passes both sender URL and JSON to BridgeProtocol, then posts a reply only while the control still shows our page. The optional reference includes the unchanged startup and navigation guards for comparison.

${code('csharp', 'ReactHost/ShellForm.cs', oldFile('ReactHost/ShellForm.cs'), true)}

## Wait for replies and release listeners

Use **Create provided** for this complete transport. It applies the lifecycle you practised: reserve before send, match a typed reply, cancel a completed deadline, release a timeout, reject send failures, and remove its listener on dispose. It also rejects any work still pending when the connection closes.

Its \`Map\` stores waiting entries by id, like a Python dictionary. \`pending.get(reply.id)\` selects that request rather than your single waiting slot. Multiple pending requests are an additional capability of this supplied infrastructure; the course does not assess implementing concurrency. You should be able to explain why using the first map entry instead would fail when replies arrive out of order.

${code('javascript', 'Web/src/bridge.js', client, true)}

${check('node --test Web/tests/bridge.test.mjs', 'pass 4', 'Supplied transport correlates, retries and disconnects')}

Diagnostic: temporarily replace \`pending.get(reply.id)\` with \`pending.values().next().value\`. Run the transport check and locate the reverse-order failure. Restore lookup by id and rerun. This experiment checks your explanation of correlation; the supplied file stays infrastructure.

## Keep result wording in one function

Create this **starter** module. The submission function intentionally refuses acceptance until you implement it in Your turn. It lets the screen compile without pretending that a host has answered. \`resultMessage\` will describe a host decision; it must preserve the host's actual message.

${code('javascript', 'Web/src/resultMessage.js', resultStarter)}

## Await the host from React

Use **Create provided** for the assembled screen, then compare three small regions with the previous App. First, the Effect creates one connection and returns dispose as cleanup. Second, the submit handler sets busy before awaiting your submission function. Third, finally always restores busy, so both rejection and delivery failure allow another try. Reset keeps the behaviour you built earlier and is disabled while a request is pending.

${code('jsx', 'Web/src/App.jsx', app, true)}

\`window.chrome?.webview\` uses optional chaining: a normal browser receives undefined when chrome or webview is absent. The transport reports that the desktop host is required. No local validator is permitted to manufacture a C# acceptance.

${predict('If C# sends ok:false with the message Ready is only a word, should the accepted counter increase?', 'No; only the boolean decision permits acceptance', 'Yes; Ready means the request was accepted', 'Human wording is display data. The ok boolean carries the host decision, and a negative decision is still a successfully delivered reply.')}

${check('npm.cmd --prefix Web run build', 'built in', 'Assembled screen compiles with truthful starter', 120)}

## Prove the C# boundary rejects bypasses

Use **Create provided** for the probe project and assertions. It links the actual helper, policy and protocol, so this checks the C# boundary rather than a JavaScript imitation. Its success says nothing about installed WebView2 or visible window behaviour.

${code('xml', 'BoundaryProbe/BoundaryProbe.csproj', boundaryProject, true)}

${code('csharp', 'BoundaryProbe/Program.cs', oldFile('BoundaryProbe/Program.cs'), true)}

${check('dotnet run --project BoundaryProbe', 'boundary protocol passed', 'C# rejects malformed and invalid drafts', 120)}

${check('dotnet build ReactHost', 'Build succeeded.', 'Messaging host compiles', 180)}

Diagnostic: temporarily replace the RequestRules call inside BridgeProtocol with an empty error string. The quantity-0 boundary assertion must fail. Restore the call and rerun. Explain why browser validation cannot substitute for this host check.

## Your turn: say who accepted the request

Implement **both** exports in \`Web/src/resultMessage.js\` from these requirements. Do not copy a full solution from another file. In resultMessage, prefix accepted replies with \`Accepted by C#: \` and rejected replies with \`Needs attention: \`, preserving the host wording exactly.

In \`async submitToHost(client, name, quantityText)\`, first run validateDraft. Return \`{ok:false,message:error}\` for invalid input without sending anything. Otherwise call \`client.preview\` with a trimmed name and numeric quantity, **await** its reply, and return that reply's boolean with resultMessage's wording. Catch a delivery Error and return a false decision with its message. A non-Error failure uses \`Preview failed. Try again.\`. Never turn a valid browser draft into an accepted decision before C# answers.

Work in three increments: invalid draft without a send; accepted/rejected host reply; caught delivery failure. Run the test after each increment and read the first unfinished behaviour. The screen already uses your function and increments its counter only when its returned ok is true.

${hints('There are three outcomes: local input error, delivered host decision, and failed delivery. Which one may say Accepted by C#?', 'Return early after local validation. Inside try, await the host reply before formatting it. Catch handles delivery failure; an ok:false reply belongs in the normal try path.', 'The only preview call receives name.trim() and Number(quantityText). Return {ok:result.ok,message:resultMessage(result)} after await, and a false decision from catch.')}

${check('node --test Web/tests/result.test.mjs', 'pass 1', 'Submission distinguishes local, host and delivery outcomes')}

Rebuild and run in this order:

\`\`\`powershell
npm.cmd --prefix Web run build
dotnet build ReactHost
dotnet run --project ReactHost
\`\`\`

Observe an accepted preview, a blank-name error, Reset, and another preview. Then use F12 in the actual host: attach a temporary listener with \`window.chrome.webview.addEventListener('message', event => console.log(event.data))\`; send \`window.chrome.webview.postMessage({type:'preview',id:'manual-bypass',name:'Ada',quantity:0})\`. The console must show the C# range rejection even though you bypassed the browser validator. The form ignores this unrequested id. Close and reopen to remove the temporary listener. Close the host after your observations.

Retain \`evidence/react-4-4.md\`: an accepted and rejected result, an independently chosen boundary input with expected/actual decision, the bypass observation, and why a timeout is different from a negative host reply. Repeat a valid preview in a regular browser and record the desktop-host instruction. Node fakes, a successful build and protocol probes cannot establish this actual window roundtrip; record it as unverified until you observe it.`);
action('04-04-csharp-is-the-authority', 'Wait for replies and release listeners', { wrong: [{ name: 'ignore correlation', edit: [['const request = pending.get(reply.id);', 'const request = pending.values().next().value;']], fails: [0] }] });
action('04-04-csharp-is-the-authority', 'Await the host from React', { wrong: [{ name: 'broken async handler', edit: [['async function preview(event)', 'function preview(event)']], fails: [0] }] });
action('04-04-csharp-is-the-authority', 'Prove the C# boundary rejects bypasses', { wrong: [{ name: 'omit C# domain validation', editFiles: { 'ReactHost/BridgeProtocol.cs': [['string error = RequestRules.Validate(name, quantity);', 'string error = "";']] }, fails: [0] }, { name: 'break WinForms event hook', editFiles: { 'ReactHost/ShellForm.cs': [['core.WebMessageReceived +=', 'core.NoSuchEvent +=']] }, fails: [1] }] });
action('04-04-csharp-is-the-authority', 'Your turn: say who accepted the request', { files: { 'Web/src/resultMessage.js': resultAnswer }, wrong: [{ name: 'no authority prefix', files: { 'Web/src/resultMessage.js': resultAnswer.replace("  const prefix = result.ok ? 'Accepted by C#: ' : 'Needs attention: ';", "  const prefix = '';") }, fails: [0] }, { name: 'browser validity fakes host acceptance', files: { 'Web/src/resultMessage.js': resultAnswer.replace('return { ok: result.ok, message: resultMessage(result) };', 'return { ok: true, message: resultMessage(result) };') }, fails: [0] }, { name: 'send the text quantity', files: { 'Web/src/resultMessage.js': resultAnswer.replace('quantity: Number(quantityText)', 'quantity: quantityText') }, fails: [0] }, { name: 'do not await the host reply', files: { 'Web/src/resultMessage.js': resultAnswer.replace('const result = await client.preview(', 'const result = client.preview(') }, fails: [0] }] });
put('walkthrough.js', `// Author-side answers and deliberately wrong implementations; never supplied as learner targets.
import { REACT_BASICS_WALKTHROUGH } from './basics.walkthrough.js';
export const REACT_WALKTHROUGH = {
  ...REACT_BASICS_WALKTHROUGH,
  ...${JSON.stringify(fixtures, null, 2)}
};`);
for (const [name, text] of Object.entries(files)) {
  const target = path.join(dir, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}
console.log('Wrote bridge teaching sequence, support checks and author-only fixtures.');
