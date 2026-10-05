---
title: Frontend tests — verify what the user can observe
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

A frontend build checks syntax, types and bundling; it does not prove that a failed request preserves a draft or that a successful save appears on screen. We add component tests at the network boundary, then keep browser checks for real layout, focus and integration.

## Choose testing tools and keep their boundary explicit

In frontend/package.json, add `"test": "vitest run --environment jsdom"` to scripts. Add `"vitest": "3.2.4"`, `"jsdom": "26.1.0"` and `"@testing-library/react": "16.3.0"` to devDependencies. Keep valid JSON commas between entries, then run `npm install --prefix frontend` and commit the updated lockfile.

Vitest executes assertions. jsdom implements a DOM in Node, but does not perform real visual layout. Testing Library encourages finding controls by the labels and roles users encounter. We replace fetch at the network boundary rather than mocking React state setters; the component's actual state and rendering should execute.

Before writing the test, predict the intended observations: a failed save retains the draft and re-enables Add task; a successful save clears the draft and displays the returned task. Those are product behaviors, not implementation details.

## Set up isolated test state

### Know when setup functions execute

`let rejectSave: boolean` declares a reassignable variable whose type is boolean. Unlike const, let permits the setup callback to assign a new value before each test. The rows variable is an array of Task values. Module-level declarations allow both setup and test callbacks to access the same bindings, so resetting them is essential for independence.

beforeEach registers a callback that Vitest invokes before each test. It does not run once at the point its body is written and then retain all later mutations. Resetting rows to a fresh array ensures one successful-save test cannot populate another test's initial board. The function remains open for the fake fetch installed by the next fragment.

Import type brings in a TypeScript type for checking without requesting a runtime value. By contrast, importing Board supplies executable component code. This distinction matters when a type name has no JavaScript object after compilation.

Each test gets fresh rows and a fresh failure switch. This prevents test order from determining the result. We import the actual Board and its data type. A typed variable declaration states the type before assignment; beforeEach assigns it before every test.

The next fragment replaces fetch for this test environment only. Production code remains unchanged.

Type this fragment yourself. Start an empty file at `frontend/src/Board.test.tsx`:

```tsx edit=frontend/src/Board.test.tsx mode=replace
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Board } from './Board';
import type { Task } from './api';
let rejectSave: boolean;
let rows: Task[];
beforeEach(() => {
  rejectSave = false;
  rows = [];
```

## Fake the external boundary, not the component

### Execute one fake request on paper

vi.fn wraps an async function so tests can observe calls if needed. vi.stubGlobal replaces the environment's fetch binding with that function. Its optional options parameter uses `?`; `options?.method` returns undefined when options is absent instead of throwing on property access.

First the fake recognizes /api/csrf and returns a Response containing a token-shaped JSON body. For POST, rejectSave chooses a 503 response or successful creation. `String(options.body)` converts the request body to text for JSON.parse, which decodes it back into an object. This fake assumes the current client sends a JSON string; it is not a complete fetch implementation.

Successful creation assigns rows to a one-task array and returns that task with status 201. Later GET returns rows. Failed creation returns 503 without changing rows. Real component state setters, request helper error handling, and rendering still execute around this simulated boundary.

After each test, cleanup unmounts rendered components and unstubAllGlobals restores global bindings. **Predict:** omitting the reset of rejectSave could make a success test fail only when run after the failure test. That is shared-test-state contamination, not a production network defect.

The fake models responses, including a CSRF token, because our real API helper performs that request. Optional chaining reads method only if options exists. A failed save does not mutate rows. A successful save gives subsequent reads server-like state, without reaching a live database.

Cleanup unmounts components, while unstubAllGlobals restores fetch. This isolation prevents the fake from leaking to other tests. Its limitations matter: it does not prove that Spring actually accepts this request. The Java integration suite and browser smoke test cover that boundary.

Type this fragment yourself. Append to `frontend/src/Board.test.tsx`:

```tsx edit=frontend/src/Board.test.tsx mode=append
  vi.stubGlobal('fetch', vi.fn(async (url: string, options?: RequestInit) => {
    if (url === '/api/csrf') return new Response(JSON.stringify({ headerName: 'X-CSRF-TOKEN', token: 'test' }));
    if (options?.method === 'POST') {
      if (rejectSave) return new Response('{}', { status: 503 });
      const body = JSON.parse(String(options.body));
      rows = [{ id: 'created', title: body.title, status: 'TODO', revision: 0 }];
      return new Response(JSON.stringify(rows[0]), { status: 201 });
    }
    return new Response(JSON.stringify(rows));
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
```

## Assert recovery after a failed save

### Await observations instead of elapsed time

render mounts the real Board. `findByText('Ready')` returns a promise that resolves when matching text appears or rejects after its wait limit. Awaiting it establishes completion of initial loading before we submit. `getByLabelText` is a synchronous query: it should find the already-present input through its associated label.

fireEvent.change supplies an event whose target has the typed value, driving the actual onChange handler. The role/name query finds the Add task button as an accessible control rather than relying on a CSS class. fireEvent.click invokes its interaction. These utilities simulate selected events, not every detail of a real person's typing or browser validation.

`/Request failed \(503\)/` is a JavaScript regular expression. Its slashes delimit the pattern, and escaped parentheses match literal parentheses instead of grouping syntax. The final toHaveProperty checks inspect the input's value and button's disabled property. An error message alone would not establish preservation or recovery.

Awaiting Ready establishes that the initial load completed. The query uses the input's accessible label. We wait for the observable failure message instead of sleeping a guessed number of milliseconds. The two final assertions establish recovery, not merely that an error appeared.

To see this test earn its value, temporarily clear the title before awaiting the save. Run it and observe red, then restore clearing only after acceptance. Run again to observe green. This is a characterization test for existing behavior; for the next UI feature, write its new behavior test before implementing it.

Type this fragment yourself. Append to `frontend/src/Board.test.tsx`:

```tsx edit=frontend/src/Board.test.tsx mode=append
it('retains the draft and restores controls when saving fails', async () => {
  rejectSave = true;
  render(<Board />);
  await screen.findByText('Ready');
  fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Draft task' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
  await screen.findByText(/Request failed \(503\)/);
  expect(screen.getByLabelText('Task title')).toHaveProperty('value', 'Draft task');
  expect(screen.getByRole('button', { name: 'Add task' })).toHaveProperty('disabled', false);
});
```

## Assert the successful path too

### Distinguish eventual UI evidence from immediate state

The success test leaves rejectSave false, renders the real component, waits for initial Ready, then types and submits a title. The fake POST stores a row; the component refreshes; the rendered strong element should display that title. The selector restriction avoids matching another control whose accessible name also contains the title.

waitFor invokes its callback repeatedly until it completes without throwing or times out. The callback contains an assertion, not another click or request. Repeating a side effect there could submit multiple tasks. The empty input assertion observes that the accepted draft was cleared after asynchronous updates reached the DOM.

**Compare boundaries:** this validates state/rendering with a controlled fetch substitute. Java tests validate server behavior. The packaged browser exercise must still verify those contracts meet, because a fake can accidentally model behavior the real server does not provide.

A component that always rejects a save could satisfy the failure test, so the success path is necessary. The strong selector distinguishes the rendered task title from an accessible button name that also includes it. waitFor retries the assertion until rendering reflects the state change or the timeout exposes a failure.

Run `npm test --prefix frontend`, then the build. Still inspect keyboard focus and narrow layouts in a real browser: jsdom is not a rendering engine. Add `npm test --prefix frontend` before the frontend build in the CI workflow when you reach the release lesson.

Type this fragment yourself. Append to `frontend/src/Board.test.tsx`:

```tsx edit=frontend/src/Board.test.tsx mode=append
it('shows a successful save and clears its draft', async () => {
  render(<Board />);
  await screen.findByText('Ready');
  fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Ship release' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add task' }));
  await screen.findByText('Ship release', { selector: 'strong' });
  await waitFor(() => expect(screen.getByLabelText('Task title')).toHaveProperty('value', ''));
});
```

```check
run "npm test --prefix frontend" timeout=180
run "npm run build --prefix frontend" timeout=180
```
