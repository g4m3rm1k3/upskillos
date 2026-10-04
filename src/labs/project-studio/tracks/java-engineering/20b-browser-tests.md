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
