---
title: Components — ownership, effects and failure states
track: Software Engineering with Java — Common Ground
trackOrder: 30
runtime: java
pedagogy: typed
console: true
---

A component is a function that describes UI from inputs and state. Props flow into it; state updates request another render. Effects synchronize with external systems. Avoid treating effects as a general place to put calculations that can happen during rendering.

## Define the data contract and request helper

### Decode TypeScript's extra syntax

`export type Task = { ... }` declares a compile-time object shape available for other modules to import. Each colon relates a property name to its type. Lowercase string and number are TypeScript types; they are not Java's String and long. The status union, separated by `|`, accepts only those three string literals when TypeScript can check a value.

`api<T>` declares a generic function. Calling `api<Task[]>` substitutes an array of Task as the expected result type. The return annotation `Promise<T>` says the asynchronous result will have that type. It does not create Task objects, validate enum strings, or repair missing fields in JSON. The fetch API's JSON return type allows this annotation to be asserted without runtime proof, which is an explicit trust boundary.

`options: RequestInit = {}` combines a parameter type with its default. RequestInit is the browser API's shape for method, headers, body, signal and other fetch options. Reusing that type lets the compiler catch misspelled known options without inventing a parallel request configuration language.

A union restricts the known status strings. The generic T describes what the caller expects back; it does not inspect the JSON at runtime. A server violating this contract can still return the wrong shape. We keep that limitation explicit and test the server contract; an independently evolving external API would justify runtime schema validation.

RequestInit is a browser type for fetch options. Error messages preserve the status so conflict, authorization and availability do not become indistinguishable.

Type this fragment yourself. Start an empty file at `frontend/src/api.ts`:

```typescript edit=frontend/src/api.ts mode=replace
export type Task = { id: string; title: string; status: 'TODO' | 'DOING' | 'DONE'; revision: number };
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(`Request failed (${response.status}); reload if your task changed.`);
  return response.json();
}
```

## Own state in the board component

### Trace one render and one later effect

Calling a React component returns a description of UI. React calls it again when state changes; a component function does not run only once like a script's top level. Hooks such as useState let React retain values across these calls. Call hooks in the same order on every render, not conditionally inside an event handler.

`const [tasks, setTasks] = useState<Task[]>([])` uses array destructuring: bind the returned pair's first item to tasks and second item to setTasks. The initial value is an empty array, typed as Task[]. Calling setTasks with a new array asks React to render again with that state. It does not change the tasks value already captured in the current callback. Title, message and busy each have independent state pairs.

`refresh` awaits the API, passes the returned array into setTasks, then sets the message to Ready. Clearing an earlier error only after a successful read keeps feedback aligned with the displayed data. The effect also performs an initial load. Effects run after React commits the UI, so network activity is separated from merely calculating a view. The empty dependency array says the effect does not depend on changing props or state. A future projectId used inside it must become a dependency rather than leaving stale data on screen.

AbortController creates a cancellation controller. Its signal is passed into fetch through our helper. `.then` registers what to do when the promise fulfills; `.catch` handles rejection. The effect returns a cleanup function, `() => controller.abort()`, rather than calling abort immediately. React calls cleanup when removing this effect, including unmounting. Cancellation rejection is recognized by its AbortError name and suppressed as an expected cleanup outcome.

| Moment | tasks | message | Work |
|---|---|---|---|
| First render | empty array | Loading… | Describe initial UI |
| Effect starts | unchanged | unchanged | Begin request |
| Request fulfills | setter supplies returned rows | setter supplies Ready | React schedules another render |
| New render | fetched rows | Ready | Describe rows as list items |

**Predict:** putting fetch directly in the component body can issue another request on every render. Setting state from each response then causes further renders and requests. The effect's lifecycle boundary prevents that particular feedback loop; it does not make every asynchronous race impossible.

useState returns a value and a setter; calling the setter schedules rendering rather than changing the value already captured by a callback. The effect loads data after mounting. Its cleanup aborts a request when the component unmounts; an aborted request should not become a user-facing failure.

The empty dependency array means this effect has no changing reactive inputs. Do not copy it blindly: an effect reading a changing project id would need to respond to that id. Our single-board product currently has no such input.

Type this fragment yourself. Start an empty file at `frontend/src/Board.tsx`:

```tsx edit=frontend/src/Board.tsx mode=replace
import { useEffect, useState } from 'react';
import { api, type Task } from './api';
export function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('Loading…');
  const [busy, setBusy] = useState(false);
  async function refresh() { setTasks(await api<Task[]>('/api/tasks')); setMessage('Ready'); }
  useEffect(() => {
    const controller = new AbortController();
    api<Task[]>('/api/tasks', { signal: controller.signal })
      .then(data => { setTasks(data); setMessage('Ready'); })
      .catch(error => { if (error.name !== 'AbortError') setMessage(error.message); });
    return () => controller.abort();
  }, []);
```

## Keep a mutation separate from refreshing

```predict
question: The POST is accepted, the draft is cleared, and the following refresh fails. Did that refresh failure undo the save?
choice: Yes, both requests form one transaction.
choice: No, acceptance and refresh are separate requests.
answer: No, acceptance and refresh are separate requests.
explain: The server already accepted the POST. A failed read does not roll it back. Keep this distinction visible when designing feedback and retry behavior.
```

### Read the error branch as a type refinement

The order is setBusy, await POST, clear draft, announce acceptance, await refresh, then restore busy in finally. The title used by this invocation comes from the render whose callback handled submission. Another state update does not rewrite that invocation's captured values.

JavaScript can throw values other than Error objects. TypeScript therefore treats a caught error cautiously. `error instanceof Error` asks whether the value is an Error instance. The ternary `condition ? valueIfTrue : valueIfFalse` selects its message only after that check; otherwise it selects the fallback string. This expression produces a string for setMessage.

**Break-it experiment:** move setTitle('') before the POST await and simulate rejection. The draft disappears even though no acceptance occurred. Restore the ordering. This is the behavior the upcoming component test will protect, not merely a preference about where lines look tidy.

Add waits for acceptance before clearing the draft, then refreshes server state. Finally restores controls even after an error. TypeScript narrows caught values with instanceof before reading their messages. A failed refresh after acceptance does not mean the mutation failed.

Type this fragment yourself. Append to `frontend/src/Board.tsx`:

```tsx edit=frontend/src/Board.tsx mode=append
  async function add() {
    setBusy(true);
    try {
      await api<Task>('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      setTitle(''); setMessage('Saved');
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unexpected failure'); }
    finally { setBusy(false); }
  }
```

## Submit the version the user actually saw

### Trace a stale screen through the command

The function parameter `task: Task` receives the task value represented by the clicked row. The template literal inserts its id into the URL. JSON.stringify sends its revision in the request body; it does not ask the server for a newer revision first.

Suppose tabs A and B both display TODO/0. A advances successfully to DOING/1. B still sends revision 0 and receives 409. The helper rejects that response; catch sets the message; finally restores busy. No refresh or silent retry runs on that error path, because the user must review changed state before issuing another command.

Use the explicit Refresh control to fetch DOING/1, then make a new deliberate action if appropriate. Busy prevents ordinary overlapping actions on this screen, but another browser tab has separate state. Only the server's version condition coordinates them.

Advance sends the displayed revision. A stale response is not retried automatically; users need to review changed state. TypeScript treats caught values cautiously, so instanceof narrows an unknown thrown value to Error before reading its message.

Busy serializes actions from this screen, but another tab or client can still act concurrently. UI disabling improves interaction; server-side revision checks establish correctness. Keeping these responsibilities distinct transfers to any frontend framework.

Type this fragment yourself. Append to `frontend/src/Board.tsx`:

```tsx edit=frontend/src/Board.tsx mode=append
  async function advance(task: Task) {
    setBusy(true);
    try {
      await api<Task>(`/api/tasks/${task.id}/advance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision: task.revision })
      });
      await refresh(); setMessage('Updated');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unexpected failure'); }
    finally { setBusy(false); }
  }
```

## Describe the accessible view

### Read JSX as JavaScript producing element descriptions

After return, `<main>...</main>` is a JSX expression. Ordinary text becomes text content. `{message}` evaluates a JavaScript expression and inserts its value. `maxLength={80}` supplies a numeric expression, while `id="title"` supplies a literal string. JSX uses htmlFor instead of HTML's for spelling because it follows the DOM/React property naming convention.

The input is **controlled**: value comes from title state, and onChange copies the event target's current value into that state. Without onChange updating state, rerendering would keep restoring the old title. A submit handler prevents native navigation, then invokes add. `void add()` explicitly discards the returned promise value; it does not catch rejection. Add's own try/catch handles the awaited operation.

`tasks.map(task => <li ...>)` calls the function for each task and returns an array of element descriptions. This is different from the earlier for-of loop that mutated the DOM directly. `key={task.id}` lets React match a task's previous and next list item across renders. A key identifies siblings for reconciliation; it is not displayed text or automatically an HTML id.

`disabled={busy || task.status === 'DONE'}` evaluates a boolean: disable while an operation is pending or when the task cannot advance. JavaScript's `===` is strict equality, without type coercion. `onClick={() => { void advance(task); }}` passes an action to run later. Writing a direct call there would run it during rendering instead of waiting for the click.

**Predict:** if two tasks swap order, stable id keys let their child component state follow the task. Index keys identify positions, potentially leaving one task with another task's discussion draft. Test with two tasks when discussion state is introduced; a single-item example cannot reveal this failure.

JSX expressions inside braces evaluate JavaScript. htmlFor maps to HTML's for attribute. A controlled input reads its displayed value from state and updates state on change. Stable keys identify list items across renders; an array index would confuse identity after reordering.

React escapes ordinary text expressions. Do not introduce raw HTML rendering for task titles. The explicit refresh button gives a recovery path after a conflict. Focus and status feedback still need browser inspection: a framework does not establish accessibility by itself.

Type this fragment yourself. Append to `frontend/src/Board.tsx`:

```tsx edit=frontend/src/Board.tsx mode=append
  return <main>
    <h1>Common Ground</h1>
    <form onSubmit={event => { event.preventDefault(); void add(); }}>
      <label htmlFor="title">Task title</label>
      <input id="title" value={title} maxLength={80} required
        onChange={event => setTitle(event.target.value)} />
      <button disabled={busy}>Add task</button>
    </form>
    <p role="status">{message}</p>
    <button disabled={busy} onClick={() => { void refresh().catch(error => setMessage(error.message)); }}>Refresh</button>
    <ul>{tasks.map(task => <li key={task.id}>
      <strong>{task.title}</strong> — {task.status}
      <button disabled={busy || task.status === 'DONE'} onClick={() => { void advance(task); }}>Advance {task.title}</button>
    </li>)}</ul>
  </main>;
}
```

## Mount and reuse the CSS you understand

### Distinguish module loading from component rendering

The named import createRoot comes from react-dom/client, the browser renderer entry. Board comes from our local module. The CSS import has no variable binding: it asks the bundler to include that stylesheet as a side effect. The relative path climbs out of frontend/src into the Java resources tree where we moved our original CSS.

getElementById returns an element or null. `if (!root) throw ...` stops execution with a specific diagnostic when the HTML container is absent. TypeScript also uses that check to narrow root to a non-null value on the remaining path. `createRoot(root)` creates React's root controller; `.render(<Board />)` supplies a component element to render. Board is a capitalized component reference, unlike lowercase built-in DOM elements.

**Prediction:** a successful typecheck cannot prove the HTML actually contains that id at runtime. Our explicit null check produces a useful failure at the boundary between two independently authored files.

The null check narrows root from a possibly absent element to a valid container. createRoot establishes React's ownership of that subtree. Importing CSS lets the bundler include the styles you already wrote rather than replacing them with an unexplained component library.

Run `npm install --prefix frontend`, then `npm run build --prefix frontend`. After completing the next step’s Java route, start Java and visit `/app/`. For development, run `npm run dev --prefix frontend` in a second terminal and visit its `/app/` URL. Stop both when done. Compare input preservation and conflict feedback with the earlier DOM implementation.

Type this fragment yourself. Start an empty file at `frontend/src/main.tsx`:

```tsx edit=frontend/src/main.tsx mode=replace
import { createRoot } from 'react-dom/client';
import { Board } from './Board';
import '../../src/main/resources/static/style.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');
createRoot(root).render(<Board />);
```

```check
run "npm run build --prefix frontend" timeout=180
```

## Serve the nested application entry

### Follow the internal forward and asset requests

@GetMapping matches /app/ exactly here and calls board. Returning `forward:/app/index.html` asks Spring's view machinery to dispatch internally to that resource. The browser's address stays /app/; it receives the HTML body, then requests the JavaScript and CSS referenced by the built page.

A redirect would instead tell the browser to perform another request at a new URL. A RestController would write the returned string as response text rather than interpret it as a view instruction. Those are three different meanings of a Java String return depending on the controller contract.

If /app/index.html itself is missing, this route cannot manufacture it. Build the frontend before packaging Java. Diagnose a missing mapping, a missing generated HTML file, and a missing hashed asset as separate failure points in the delivery chain.

Spring's root welcome-page handling does not automatically treat every nested directory as a second application entry. Our compiled HTML lives at `/app/index.html`, while people visit `/app/`. Make that mapping explicit rather than relying on development-server fallback behavior.

Type this small controller in `src/main/java/workspace/AppPage.java`. `@Controller` interprets the returned string as a view instruction, unlike `@RestController`, which would send the literal string as a response body. The `forward:` prefix internally dispatches to the static resource without asking the browser to make another request. The compiled HTML then loads assets using the `/app/` base configured in Vite.

```java edit=src/main/java/workspace/AppPage.java mode=replace
package workspace;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AppPage {
    @GetMapping("/app/")
    public String board() { return "forward:/app/index.html"; }
}
```

Run the packaged browser smoke test again after building. The Vite development server alone cannot detect a missing Spring mapping. This is a deployment-boundary failure, not a React rendering failure.

```check
run "mvn -q test" timeout=180
```
