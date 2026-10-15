---
title: Follow One HTTP Request Before Building the API
track: MEAN — Express API
runtime: none
---

Outcome: explain a request's method, path, body and response by running a small Express experiment. No database query is involved yet.

### The story so far

Continue after MongoDB in the same folder. Express was installed in the opening chapter. Before combining routing, persistence and concurrency, examine one boundary by itself.

## Send a request to a temporary server

A port identifies a listening service on a machine. Port 0 asks the operating system to choose an available one. The test starts a server, makes one request and closes it, so there is no terminal left running. Middleware is a function that runs in the request pipeline; express.json() parses JSON before the route reads req.body.

```predict
question: What status and response title should POST /echo with title "Plan" return?
explain: The route returns status 201 and the object {received: "Plan"}. Nothing is stored; restarting or repeating this experiment does not retain a task.
```

```javascript file=test/http-basics.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
test('follow a JSON request through middleware and a route', async () => {
  const app = express();
  app.use(express.json());
  app.post('/echo', (req, res) => res.status(201).json({received: req.body.title}));
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/echo', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({title:'Plan'})
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {received:'Plan'});
  } finally { await new Promise(resolve => server.close(resolve)); }
});
```

```check
run "node --test test/http-basics.test.js"
```

## Trace the four boundaries

JSON.stringify serializes a JavaScript object into text. Content-Type tells the server how to interpret that text. express.json parses it into a new server-side object. res.json serializes the response; response.json parses it in the caller. The browser and server do not share an in-memory object.

The method is part of the route: GET /echo is not POST /echo. An HTTP response has a status even when its body is empty or not JSON. Check the status before assuming a successful response shape in your own clients.

## Your turn: a second contract

Write a separate test for POST /double accepting {value: 7} and returning {result: 14}. Add a malformed-input case that returns 400 for a string. Do not add database access. Save the results, request trace and explanation in evidence/first-http.txt. The file check is a submission gate only.

```hints
nudge: Decide which JavaScript types are valid before multiplying.
concept: HTTP payloads require runtime validation even when the client uses TypeScript.
shape: Check typeof and Number.isFinite, return early with 400, then compute and assert the numeric result.
```

```check
file evidence/first-http.txt
```

## Diagnose, explain and review

Change POST to GET in the fetch call and remove its body. Expect 404 because no GET handler exists. Restore both. Then remove express.json and inspect the failure caused by missing req.body; restore the middleware. The test checks this request only, not storage, security or the later API. Explain why parsing must precede validation.
