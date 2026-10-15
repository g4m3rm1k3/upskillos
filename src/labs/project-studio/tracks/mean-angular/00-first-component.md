---
title: Your First Angular Component — State Before Networking
track: MEAN — Angular
runtime: none
---

Outcome: make a button update visible state and explain the difference between a TypeScript value and a template binding.

### The story so far

The API works, but do not connect it to Angular yet. First build a small browser-only component in the same task-board folder. This reduces the number of moving parts when debugging.

## Generate the client once

At the project root run `npx @angular/cli@21 new client --standalone --routing=false --style=css --ssr=false --skip-git --defaults`. Node 22.22.3+ in the Node 22 line is compatible with this Angular version. Keep client/package-lock.json. The next lesson reuses this client; do not regenerate it.

Angular CLI creates the build configuration and entry files. A standalone component declares its own dependencies. The selector names the HTML element Angular attaches to: the generated index.html already contains app-root. Reference: [Angular compatibility](https://angular.dev/reference/versions).

## Make a small component

The decorator @Component supplies metadata, including the template. export makes the class importable from main.ts. signal(0) creates reactive state initialized to zero. Interpolation {{ count() }} reads it as text; (click) binds a DOM event to a method.

```predict
question: After two clicks, what should count() return and what should the page show?
explain: Both should be 2. Each call to increment updates the signal, and Angular refreshes the dependent template text.
```

```typescript file=client/src/app/counter.ts
import { Component, signal } from '@angular/core';
@Component({
  selector: 'app-root', standalone: true,
  template: `<h1>Task Board warm-up</h1>
    <p role="status">Tasks planned: {{ count() }}</p>
    <button (click)="increment()">Plan one task</button>`
})
export class Counter {
  count = signal(0);
  increment(): void { this.count.update(value => value + 1); }
}
```

## Bootstrap and observe

bootstrapApplication creates the root component. The : void annotation means increment returns no useful value; it does not stop the method from changing state. Run `npm --prefix client run build`. Then, in client, run `npx ng serve --host 127.0.0.1` and open http://127.0.0.1:4200. Click twice, reload, and observe that the counter resets: it is memory, not MongoDB. Stop with Ctrl+C before the next lesson.

```typescript file=client/src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { Counter } from './app/counter';
bootstrapApplication(Counter).catch(console.error);
```

```check
run "npm --prefix client run build"
```

## Your turn: a bounded counter

In your own component copy, add a decrease button that cannot take the count below zero. Disable it at zero and keep a guard in the method too. Test repeated clicks at the boundary and explain why a disabled button alone is not a complete state rule. Record observations in evidence/component.txt; the file check is a submission gate only.

```hints
nudge: Identify both the UI affordance and the state transition.
concept: A method can be called from somewhere other than its button.
shape: Bind disabled to count() === 0 and clamp the new value inside the method; test both entry paths.
```

```check
file evidence/component.txt
```

## Diagnose, explain and review

Replace count() in the template with count and inspect the build or browser output. You have referenced the signal function instead of reading its value. Restore the call. Build checks establish compilation, not correct interactions. Before continuing, explain why a reload resets the count and which boundary must be crossed to make a task durable.
