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
  async function refresh() { setTasks(await api<Task[]>('/api/tasks')); }
  useEffect(() => {
    const controller = new AbortController();
    api<Task[]>('/api/tasks', { signal: controller.signal })
      .then(data => { setTasks(data); setMessage('Ready'); })
      .catch(error => { if (error.name !== 'AbortError') setMessage(error.message); });
    return () => controller.abort();
  }, []);
```

## Keep a mutation separate from refreshing

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

The null check narrows root from a possibly absent element to a valid container. createRoot establishes React's ownership of that subtree. Importing CSS lets the bundler include the styles you already wrote rather than replacing them with an unexplained component library.

Run `npm install --prefix frontend`, then `npm run build --prefix frontend`. Start Java and visit `/app/`. For development, run `npm run dev --prefix frontend` in a second terminal and visit its `/app/` URL. Stop both when done. Compare input preservation and conflict feedback with the earlier DOM implementation.

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
