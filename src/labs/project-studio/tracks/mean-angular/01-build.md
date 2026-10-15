---
title: Angular Forms and HTTP State
track: MEAN — Angular
runtime: none
---

Outcome: connect an Angular form to the API and distinguish loading, failure, empty results and stale edits. A component combines state and a template. TypeScript annotates values for build-time checks; its types do not validate HTTP responses at runtime.

### The story so far

Continue after Express in the same folder. MongoDB and the API run locally. Now build a browser interface with its own package. Keep the API terminal running during browser checks.

## Reuse the browser package

The preceding component lesson created client. Reuse it; do not run the creation command again. If recovering from a missing client folder, the original command was:

```sh
npx @angular/cli@21 new client --standalone --routing=false --style=css --ssr=false --skip-git --defaults
```

Use Node 22.22.3+ in the Node 22 line, compatible with Angular 21. Keep client/package-lock.json as well as the root lockfile. This series targets Angular 21 instead of an unpinned latest major. Replace the files below. The generated app component becomes unused once main.ts changes; its scaffold unit test should be replaced when you add Board unit tests.

References: [version compatibility](https://angular.dev/reference/versions) and [local setup](https://angular.dev/tools/cli/setup-local).

## Proxy API requests

The browser requests /api from its own development origin. The CLI forwards these paths to Express. This avoids broad CORS settings. This proxy is a development setting, not a production reverse proxy.

```json file=client/proxy.conf.json
{
  "/api/**": { "target": "http://127.0.0.1:3000", "secure": false }
}
```

## Provide HTTP at bootstrap

Dependency injection supplies a shared HttpClient. Its requests return Observables, sources of future values; firstValueFrom converts the single HTTP result into a Promise for await. Our standalone component declares its own imports.

```typescript file=client/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { Board } from './app/board';
bootstrapApplication(Board, { providers: [provideHttpClient()] }).catch(console.error);
```

## Model visible states

```predict
question: If saving fails, should the input disappear as though creation succeeded?
explain: No. Clear the title after a successful POST and retain it when that request fails.
```

A signal stores reactive state; reading it with parentheses lets the template track changes. [(ngModel)] connects an input and a field in both directions. @for renders tasks and tracks stable ids, rather than positions that change when rows move.

busy disables overlapping button requests. try/finally always clears it. A successful edit reloads the list; a 409 asks the learner to reload rather than overwriting another edit. A write can succeed while a subsequent refresh fails, so the error message asks the user to verify state before retrying. The browser never receives database credentials.

```typescript file=client/src/app/board.ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
type Task = { _id: string; title: string; status: 'open' | 'done'; version: number };
type Page = { items: Task[]; next: string | null };
@Component({
  selector: 'app-root', standalone: true, imports: [FormsModule],
  template: `
    <main>
      <h1>Workshop task board</h1>
      <form (ngSubmit)="add()">
        <label for="title">Task title</label>
        <input id="title" name="title" [(ngModel)]="title" maxlength="100" required>
        <button [disabled]="busy() || !title.trim()">Add task</button>
      </form>
      <button type="button" [disabled]="busy()" (click)="load()">Reload first page</button>
      @if (busy()) { <p role="status">Working…</p> }
      @if (error()) { <p role="alert">{{ error() }}</p> }
      <ul>
        @for (task of items(); track task._id) {
          <li>{{ task.title }} — {{ task.status }}
            <button type="button" [disabled]="busy()" (click)="toggle(task)">
              Mark {{ task.title }} {{ task.status === 'open' ? 'done' : 'open' }}
            </button>
          </li>
        } @empty { @if (!busy() && !error()) { <li>No tasks on this page.</li> } }
      </ul>
      @if (next()) { <button [disabled]="busy()" (click)="load(next())">Next page</button> }
    </main>
  `
})
export class Board {
  private http = inject(HttpClient);
  private url = '/api/projects/000000000000000000000001/tasks';
  title = '';
  items = signal<Task[]>([]);
  next = signal<string | null>(null);
  busy = signal(false);
  error = signal('');
  constructor() { void this.load(); }
  private async refresh(after: string | null = null) {
    const page = await firstValueFrom(this.http.get<Page>(this.url, {
      params: after ? { after } : {}
    }));
    this.items.set(page.items); this.next.set(page.next);
  }
  private async request(work: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { await work(); }
    catch (error) {
      this.error.set(error instanceof HttpErrorResponse && error.status === 409
        ? 'Another edit won. Reload before trying again.'
        : 'Request failed. Check the API and reload; verify whether a write succeeded before retrying.');
    } finally { this.busy.set(false); }
  }
  load(after: string | null = null) { return this.request(() => this.refresh(after)); }
  add() {
    return this.request(async () => {
      await firstValueFrom(this.http.post<Task>(this.url, { title: this.title }));
      this.title = ''; await this.refresh();
    });
  }
  toggle(task: Task) {
    return this.request(async () => {
      await firstValueFrom(this.http.patch<Task>(this.url + '/' + task._id, {
        status: task.status === 'open' ? 'done' : 'open', version: task.version
      }));
      await this.refresh();
    });
  }
}
```

## Make the board readable

Use labeled inputs and visible keyboard focus. At the project root run `npm --prefix client run build`. In the client folder, run `npx ng serve --host 127.0.0.1 --proxy-config proxy.conf.json`, then open http://127.0.0.1:4200. Add a task, toggle it and reload. Stop both terminals with Ctrl+C when finished.

```css file=client/src/styles.css
body { margin: 0; background: #eef2f6; color: #172b43; font: 1rem/1.6 system-ui, sans-serif; }
main { max-width: 48rem; margin: 3rem auto; padding: 1.5rem; background: white; border-radius: 1rem; }
form { display: grid; gap: .6rem; margin-bottom: 1rem; }
input, button { font: inherit; padding: .65rem; border: 1px solid #63758a; border-radius: .4rem; }
button { background: #163e70; color: white; cursor: pointer; }
button:disabled { opacity: .6; cursor: wait; }
:focus-visible { outline: 3px solid #b05b00; outline-offset: 3px; }
li { padding: .6rem 0; }
li button { margin-left: .75rem; }
[role=alert] { color: #9c1c24; }
```

```check
run "npm --prefix client run build"
```

## Your turn: browser states

Add and complete a task with keyboard-only navigation. Open two tabs, edit a task in one, then attempt a stale edit in the other: expect a conflict message. Design a visible distinction between no tasks and an unavailable server. Record observations, reasoning and a new browser test in evidence/browser.txt; this file check is a submission gate only.

```hints
nudge: Keep the second tab open without reloading after the first tab saves.
concept: Each tab holds its own task version until it fetches new data.
shape: Compare both PATCH request bodies and statuses, reload the stale tab, and repeat with the new version.
```

```check
file evidence/browser.txt
```

## Diagnose, explain and review

Stop Express while Angular remains running. Reload: expect an error, not an empty-success message. Inspect /api in browser developer tools, restart Express and reload. Temporarily remove the proxy to compare a routing failure with a database failure, then restore it. Compilation checks template and type compatibility, not focus, screen readers or network behavior.
