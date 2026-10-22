---
title: 4.4 — A Validated JSON Roundtrip
runtime: none
support: Web/tests/bridge.test.mjs, Web/tests/result.test.mjs
reference: optional
---

Outcome: submit a React draft to the existing C# rules, distinguish accepted and rejected replies, and explain how a bypassed browser validator is still rejected. Finish lesson 4.3. This is a local preview boundary: it does not execute application commands, accept file paths or call an external API.

## Create the bridge checks

Use **Create provided** to copy these executable examples and this lesson’s support files. Read the input/result pairs; they are test infrastructure rather than a function to type. The built-in Node test runner exits with a failure when an assertion disagrees.

```javascript file=Web/tests/bridge.test.mjs provided
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
```

## Define the message boundary in C#

JSON is text representing values: strings, numbers, booleans, objects, arrays or null. A JavaScript object resembles a Python dictionary; JSON property names are always quoted strings. Our sole request shape is `{ "type": "preview", "id": "preview-1", "name": "Ada", "quantity": 2 }`. Quantity is a number, so `"2"` is rejected. A reply has `type: "previewResult"`, the same `id`, a boolean `ok` and a string `message`. The id pairs a reply with one waiting request.

The host checks the sender before parsing, bounds message size, recognizes only `preview`, checks every JSON kind and calls the shared `RequestRules.Validate`. `using JsonDocument` disposes the parsed document when leaving the block. `string?` permits no-result/null for malformed data. `is null` and `is not null` test for an absent value; they do not convert JSON data. `new { ... }` creates an anonymous object with the named properties; `JsonSerializer` produces correctly escaped JSON. We never concatenate user text into executable code.

```csharp file=ReactHost/BridgeProtocol.cs
using System.Text.Json;
using FormDesk.Core;

namespace FormDesk.ReactHost;

public static class BridgeProtocol
{
    public static string? Handle(string source, string json)
    {
        if (!HostPolicy.IsAppPage(source) || json.Length > 8192) return null;
        try
        {
            using JsonDocument document = JsonDocument.Parse(json);
            JsonElement root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object) return null;
            string? id = Text(root, "id");
            if (string.IsNullOrWhiteSpace(id) || id.Length > 64) return null;
            if (Text(root, "type") != "preview") return Reply(id, false, "Unknown message type.");
            string? name = Text(root, "name");
            if (name is null) return Reply(id, false, "Name must be text.");
            if (!root.TryGetProperty("quantity", out JsonElement value)
                || value.ValueKind != JsonValueKind.Number || !value.TryGetInt32(out int quantity))
                return Reply(id, false, "Quantity must be a whole number.");
            string error = RequestRules.Validate(name, quantity);
            if (error != "") return Reply(id, false, error);
            return Reply(id, true, "Ready: " + name.Trim() + " × " + quantity);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static string? Text(JsonElement root, string key)
    {
        return root.TryGetProperty(key, out JsonElement value) && value.ValueKind == JsonValueKind.String
            ? value.GetString() : null;
    }

    private static string Reply(string id, bool ok, string message)
    {
        return JsonSerializer.Serialize(new { type = "previewResult", id, ok, message });
    }
}
```

## Connect the control to the boundary

Enable messaging, handle the control’s `WebMessageReceived` event, pass its sender URL and JSON to the pure protocol function, then post a reply only while the control still shows our page. Null replies are ignored; the browser timeout will explain missing responses. Compare the few changed lines with the prior full file.

```csharp file=ReactHost/ShellForm.cs
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace FormDesk.ReactHost;

public sealed class ShellForm : Form
{
    private readonly WebView2 web = new() { Dock = DockStyle.Fill };
    private readonly Label status = new() { Dock = DockStyle.Top, AutoSize = true, Text = "Loading local interface…" };

    public ShellForm()
    {
        Text = "FormDesk — React host";
        ClientSize = new Size(760, 640);
        Controls.Add(web);
        Controls.Add(status);
        Shown += OpenInterface;
    }

    private async void OpenInterface(object? sender, EventArgs e)
    {
        try
        {
            string folder = Path.Combine(AppContext.BaseDirectory, "Web");
            if (!File.Exists(Path.Combine(folder, "index.html")))
                throw new InvalidOperationException("Build Web first, then rebuild ReactHost.");
            string userData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FormDesk", "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(null, userData);
            if (IsDisposed) return;
            await web.EnsureCoreWebView2Async(environment);
            if (IsDisposed) return;
            var core = web.CoreWebView2;
            core.Settings.AreHostObjectsAllowed = false;
            core.Settings.AreDefaultScriptDialogsEnabled = false;
            core.Settings.IsWebMessageEnabled = true;
            core.WebMessageReceived += (_, args) =>
            {
                string? reply = BridgeProtocol.Handle(args.Source, args.WebMessageAsJson);
                if (reply is not null && HostPolicy.IsAppPage(core.Source)) core.PostWebMessageAsJson(reply);
            };
            core.SetVirtualHostNameToFolderMapping("formdesk.example", folder, CoreWebView2HostResourceAccessKind.Deny);
            core.NavigationStarting += (_, args) => args.Cancel = !HostPolicy.IsAppPage(args.Uri);
            core.FrameNavigationStarting += (_, args) => args.Cancel = true;
            core.NewWindowRequested += (_, args) => args.Handled = true;
            core.PermissionRequested += (_, args) => args.State = CoreWebView2PermissionState.Deny;
            core.DownloadStarting += (_, args) => args.Cancel = true;
            core.Navigate("https://formdesk.example/index.html");
            status.Text = "Local React interface · C# validates every preview";
        }
        catch (Exception error)
        {
            if (!IsDisposed) status.Text = "Could not open interface: " + error.Message;
        }
    }
}
```

## Wait for replies and release listeners

A Promise represents a future success or failure. `resolve(reply)` completes it successfully; `reject(new Error(...))` fails it. `Map` stores values by key, like a Python dictionary: set/get/delete. `setTimeout` schedules a callback; `clearTimeout` cancels it. A waiting map entry holds its callbacks and timer.

WebView2 supplies `transport.postMessage(object)` and message listeners. Each request gets a new id. Responses with an old id or invalid shape cannot complete current work. The five-second timeout removes the entry so Preview can be tried again; a send failure also removes it. `dispose` removes the listener, cancels timers and rejects outstanding requests. The client accepts a transport argument so Node tests can substitute a small fake; only the actual host can validate with C#.

```javascript file=Web/src/bridge.js
export function createPreviewClient(transport, timeoutMs = 5000) {
  const pending = new Map();
  let nextId = 1;
  let disposed = false;

  function receive(event) {
    const reply = event.data;
    if (!reply || reply.type !== 'previewResult' || typeof reply.id !== 'string'
        || typeof reply.ok !== 'boolean' || typeof reply.message !== 'string') return;
    const request = pending.get(reply.id);
    if (!request) return;
    clearTimeout(request.timer);
    pending.delete(reply.id);
    request.resolve(reply);
  }
  if (transport) transport.addEventListener('message', receive);

  function preview(draft) {
    if (disposed) return Promise.reject(new Error('Preview cancelled.'));
    if (!transport) return Promise.reject(new Error('Open in the desktop host to ask C#.'));
    const id = 'preview-' + nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('No reply from C#. Try Preview again.'));
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      try { transport.postMessage({ type: 'preview', id, name: draft.name, quantity: draft.quantity }); }
      catch {
        clearTimeout(timer);
        pending.delete(id);
        reject(new Error('Could not send to C#. Try Preview again.'));
      }
    });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (transport) transport.removeEventListener('message', receive);
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error('Preview cancelled.'));
    }
    pending.clear();
  }
  return { preview, dispose };
}
```

`typeof` checks JavaScript value kinds; `++` increments after producing the current counter value. `{ resolve, reject, timer }` abbreviates `{ resolve: resolve, reject: reject, timer: timer }`. `for (const request of pending.values())` loops over dictionary values. `return { preview, dispose }` exposes those two functions.

```check
run "node --test Web/tests/bridge.test.mjs" stdout="pass 4" timeout=60 label="Correlation, retry, failure and cleanup work" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```

## Keep result wording in one function

A small formatter gives the screen one place to describe a host reply. We will make its authority explicit in Your turn.

```javascript file=Web/src/resultMessage.js
export function resultMessage(result) {
  return result.message;
}
```

## Await the host from React

`useEffect` connects to something outside React after the component appears. Its empty dependency list means the connection does not depend on current form values; the returned function disconnects when React removes this component. This also supports React’s development setup/cleanup/setup checks. `window.chrome?.webview` uses optional chaining: if chrome is absent, the result is undefined rather than an error. A regular browser therefore reports that the desktop host is required; it never invents an accepted C# result.

`async` and `await` play the same role as in the C# initializer. `try/catch/finally` shows a reply or error and always releases the busy state. Inputs stay disabled while waiting so the displayed result describes the submitted values. `setCount((previous) => previous + 1)` derives the next state from React’s most recent value. A ternary expression chooses the busy button label.

```jsx file=Web/src/App.jsx
import React, { useEffect, useState } from 'react';
import { formatCount } from './formatCount.js';
import { validateDraft } from './validateDraft.js';
import { createPreviewClient } from './bridge.js';
import { resultMessage } from './resultMessage.js';

export default function App() {
  const [name, setName] = useState('');
  const [quantityText, setQuantityText] = useState('1');
  const [message, setMessage] = useState('Enter a request.');
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [client, setClient] = useState(null);

  useEffect(() => {
    const connection = createPreviewClient(window.chrome?.webview);
    setClient(connection);
    return () => connection.dispose();
  }, []);

  async function preview(event) {
    event.preventDefault();
    const error = validateDraft(name, quantityText);
    if (error !== '') { setMessage(error); return; }
    if (!client || busy) return;
    setBusy(true);
    setMessage('Waiting for C#…');
    try {
      const result = await client.preview({ name: name.trim(), quantity: Number(quantityText) });
      setMessage(resultMessage(result));
      if (result.ok) setCount((previous) => previous + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Preview failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>FormDesk</h1>
      <form onSubmit={preview} noValidate>
        <label>Name<input disabled={busy} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label>Quantity<input disabled={busy} type="number" value={quantityText} onChange={(event) => setQuantityText(event.target.value)} /></label>
        <button type="submit" disabled={!client || busy}>{busy ? 'Checking…' : 'Preview'}</button>
      </form>
      <p role="status">{message}</p>
      <small>{formatCount(count)}</small>
    </main>
  );
}
```

[React’s Effect and cleanup reference](https://react.dev/reference/react/useEffect) describes this external connection pattern.

```predict
question: In a regular browser, after a valid request is submitted, what appears?
choice: Open in the desktop host to ask C#.
choice: The previous result stays visible
answer: Open in the desktop host to ask C#.
explain: Only a WebView2-hosted page has the transport; the missing transport rejects the Promise and the catch displays its error.
```

```check
run "npm.cmd --prefix Web run build" stdout="built in" timeout=120 label="Async React form compiles" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```

## Prove the C# boundary rejects bypasses

Replace the earlier policy probe with direct calls to the actual boundary. C# raw string literals (`"""…"""`) let JSON quotes appear without backslashes. `const` fixes a value at compile time; our local helper methods are static because they use only their arguments and the origin constant. The `!` after text tells the compiler the earlier assertion established non-null; it does not alter the runtime value.

```csharp file=BoundaryProbe/Program.cs
using System.Text.Json;
using FormDesk.ReactHost;

const string origin = "https://formdesk.example/index.html";
static void Expect(bool condition, string label)
{
    if (!condition) throw new Exception("FAIL: " + label);
}
static void Reply(string json, bool ok, string message)
{
    string? text = BridgeProtocol.Handle(origin, json);
    Expect(text is not null, "reply exists");
    using var document = JsonDocument.Parse(text!);
    JsonElement value = document.RootElement;
    Expect(value.GetProperty("type").GetString() == "previewResult", "reply type");
    Expect(value.GetProperty("id").GetString() == "probe-1", "correlation id");
    Expect(value.GetProperty("ok").GetBoolean() == ok, message);
    Expect(value.GetProperty("message").GetString() == message, "exact message: " + message);
}
Expect(HostPolicy.IsAppPage(origin), "local page allowed");
Expect(!HostPolicy.IsAppPage("https://other.example/index.html"), "foreign page blocked");
Expect(!HostPolicy.IsAppPage(origin + "?other=1"), "query blocked");
Expect(!HostPolicy.IsAppPage(origin + "#other"), "fragment blocked");
Reply("""{"type":"preview","id":"probe-1","name":" Ada ","quantity":2}""", true, "Ready: Ada × 2");
Reply("""{"type":"preview","id":"probe-1","name":" ","quantity":2}""", false, "Enter a name.");
Reply("""{"type":"preview","id":"probe-1","name":"Ada","quantity":0}""", false, "Use a quantity from 1 to 100.");
Reply("""{"type":"preview","id":"probe-1","name":"Ada","quantity":101}""", false, "Use a quantity from 1 to 100.");
Reply("""{"type":"preview","id":"probe-1","name":"Ada","quantity":"2"}""", false, "Quantity must be a whole number.");
Reply("""{"type":"preview","id":"probe-1","name":"Ada","quantity":1.5}""", false, "Quantity must be a whole number.");
Reply("""{"type":"preview","id":"probe-1","name":4,"quantity":2}""", false, "Name must be text.");
Reply("""{"type":"run","id":"probe-1","name":"Ada","quantity":2}""", false, "Unknown message type.");
Expect(BridgeProtocol.Handle(origin, "{") is null, "malformed JSON ignored");
Expect(BridgeProtocol.Handle(origin, "[]") is null, "array ignored");
Expect(BridgeProtocol.Handle(origin, """{"type":"preview","name":"Ada","quantity":2}""") is null, "missing id ignored");
Expect(BridgeProtocol.Handle("https://other.example", """{"type":"preview","id":"probe-1","name":"Ada","quantity":2}""") is null, "foreign sender ignored");
Console.WriteLine("boundary protocol passed");
```

```powershell
dotnet run --project BoundaryProbe
npm.cmd --prefix Web run build
dotnet build ReactHost
dotnet run --project ReactHost
```

Observe a valid preview and a blank-name error, then close the host. Diagnostic experiment: in WebView2 developer tools (F12), execute `window.chrome.webview.postMessage({type:"preview",id:"manual-bypass",name:"Ada",quantity:0})`. Attach a temporary console listener first with `window.chrome.webview.addEventListener("message", event => console.log(event.data))`. C# replies `ok: false` with the range error even though React’s validator was bypassed. The form ignores this unrequested id; the console shows the host reply. Close and reopen to remove the temporary listener. Explain which layer prevented the invalid draft. For malformed JSON, the C# probe calls the parser directly because JavaScript postMessage automatically serializes its object.

The probe checks the real parser/rules; Node tests check a fake transport’s delivery. Neither establishes that WebView2 is installed or a message visibly completes in a real window. Repeat the real host preview after rebuilding, and manually close the window during a pending request.

```check
run "dotnet run --project BoundaryProbe" stdout="boundary protocol passed" timeout=120 label="C# rejects malformed and invalid drafts" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```

```check
run "dotnet build ReactHost" stdout="Build succeeded." timeout=180 label="Messaging host compiles" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```

## Your turn: say who accepted the request

Change `resultMessage` so accepted results read `Accepted by C#: ` followed by the host’s message, and rejected results read `Needs attention: ` followed by its message. Preserve the host wording exactly. Decide how to branch on the boolean `result.ok`; test more than the one happy path. Rebuild Web then ReactHost, run the host, and confirm the accepted prefix appears only after a successful host reply. Retain `evidence/react-4-4.md` with the observed result, your explanation of the bypass experiment, and one independently designed boundary case (include input, expected result and actual result). Keep the old native FormDesk available for comparison.

```hints
nudge: The server reply already contains the boolean decision and its message. Avoid re-running validation in this formatter.
concept: Use a conditional expression to select a prefix. A false ok value is a rejection even when its message looks positive.
shape: Compute a local prefix from result.ok, then return prefix + result.message.
```

```check
run "node --test Web/tests/result.test.mjs" stdout="pass 1" timeout=60 label="Accepted and rejected replies have distinct labels" -- Read the first failing assertion or compiler diagnostic, repair that cause, then rerun.
```
