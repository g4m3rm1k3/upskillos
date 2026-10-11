---
title: 8.1 — Tailwind CSS v4: utilities and a real build
track: Frontend Developer Bootcamp — Tailwind and a Component System
trackOrder: 50.08
runtime: none
---

Outcome: replace the React app’s borrowed CSS with a dedicated utility-based system. A utility typically expresses one declaration; responsive and state variants conditionally apply it. v4’s Vite integration and CSS-first theme configuration differ from older v3 tutorials. The two CSS approaches are alternatives to compare, not badges of seniority.

### The story so far

You have seen handmade CSS and Bootstrap’s component conventions. Tailwind offers a third way to express CSS decisions: compose utilities in markup while sharing tokens and reusable components.

This is not a new browser layout engine. Flexbox, Grid, spacing, contrast and the cascade still apply. The course uses v4’s CSS-first configuration and Vite plugin so the source and current installation method agree.

## Install the v4 integration

Before trying this step, make a prediction.

```predict
question: Will a dynamically constructed utility name always be found by the source scanner?
choice: No
choice: Yes
answer: No
explain: Use complete literal class names so the build can discover the required CSS.
```

Update the manifest and run npm install. Keep tailwindcss and @tailwindcss/vite on compatible v4 versions. Reference: https://tailwindcss.com/docs/installation/using-vite . Do not use the development CDN as a production installation.

```json file=package.json
{
  "name": "frontend-portfolio",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1"
  },
  "devDependencies": {
    "vite": "8.3.4",
    "tailwindcss": "4.3.3",
    "@tailwindcss/vite": "4.3.3"
  },
  "dependencies": {
    "bootstrap": "5.3.8",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  }
}
```

```check
contains package.json "\"@tailwindcss/vite\""
```

## Enable the Vite plugin

The config is at the portfolio root. Restart a manual Vite server after configuration changes. defineConfig supplies editor hints; the plugin processes imported Tailwind styles. This does not load Tailwind into every page: a page must import its CSS.

```javascript file=vite.config.js
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [tailwindcss()] });
```

### Configuration is code executed by the tool

Vite reads its configuration from the project root. The plugins array contains the result of calling tailwindcss(), which creates the integration. This differs from merely importing a CSS file containing unprocessed Tailwind directives.

When a development server started before you changed the configuration, restart it if the change is not picked up. Before investigating component styles, check that the correct project is serving the page and the plugin is actually active.

```check
contains vite.config.js "tailwindcss()"
```

## Define tokens and readable defaults

### Utilities are a vocabulary, not a design strategy

Think of utilities as labeled building blocks. `p-4` contributes padding; `rounded-xl` contributes corner radius; a responsive prefix adds a condition. You still decide which blocks serve the task, just as knowing words does not automatically produce a clear paragraph.

The analogy has a limit: generated CSS order and layers, not the order you happen to type class names in a string, determine many conflicts. Avoid assigning contradictory utilities and hoping the last word in className always wins.

### Follow one token to a visible result

```text
@theme --color-brand-700 = #176341
  → Tailwind can generate bg-brand-700
  → a component uses that literal class
  → generated CSS sets background-color
  → browser computes the painted result
```

The token defines the available decision; source usage determines needed utilities. A misspelled class can remain harmless-looking text in HTML while producing no CSS at all.

@theme makes named tokens available as utilities such as bg-brand-700. @custom-variant connects dark: to the same data-theme convention we used by hand. @layer base defines element defaults; @apply composes utilities here. Per-component utilities will follow. Keep names complete: dynamically constructing bg-${color}-700 hides class names from the source scanner.

```css file=react/styles.css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
@theme {
  --color-brand-700: #176341;
  --color-brand-200: #9ee5bc;
  --font-sans: system-ui, sans-serif;
}
@layer base {
  body { @apply m-0 bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100; }
  main { @apply mx-auto max-w-5xl p-4 sm:p-8; }
  h1 { @apply text-4xl font-bold tracking-tight; }
  h2 { @apply text-xl font-semibold; }
  p { @apply my-3 leading-relaxed; }
  form { @apply my-4 flex flex-wrap items-center gap-3; }
  input { @apply rounded-lg border border-slate-500 bg-transparent px-3 py-2; }
  button { @apply min-h-11 rounded-lg bg-brand-700 px-4 py-2 text-white dark:bg-brand-200 dark:text-slate-950; }
  :focus-visible { outline: 3px solid currentColor; outline-offset: 3px; }
  article { @apply my-4 rounded-xl border border-slate-400 p-4; }
}
```

### Read variants from condition to declaration

`sm:p-8` means “at the small breakpoint and above, use this padding utility.” It does not mean “apply only on a small phone.” `dark:text-slate-100` applies when our custom dark variant matches. `disabled:opacity-60` applies to a disabled control; it does not itself disable the control.

`@layer base` holds element defaults. Utilities on a component can then express a deliberate local decision. Use @apply sparingly for coherent shared rules, not to rebuild an enormous opaque stylesheet under different names.

A class such as `bg-${color}-700` may not appear as a complete string for the source scanner. A mapping like `{ success: 'bg-green-700', danger: 'bg-red-700' }` exposes the actual possibilities and constrains the API.

**Rule of thumb:** keep complete class names visible to the build and group repeated design choices behind a small component contract. Do not extract a component solely because a class string is long; extract when it has a coherent role, repeated behavior or a stable interface.

A utility framework can reduce naming effort, but it can also produce inconsistent one-off choices if everyone picks arbitrary values. Tokens and review still matter.

```check
contains react/styles.css "@theme"
```

## Load the app’s own stylesheet

Replace only the stylesheet import; keep the same React entry. The café and Bootstrap apps keep their own designs. Inspect the computed body color to confirm Tailwind compiled.

```jsx file=react/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles.css';
createRoot(document.querySelector('#root')).render(<App />);
```

```check
page react/index.html "getComputedStyle(document.querySelector('main')).maxWidth" "1024px" server=vite
```

## Your turn: give search its own visual grouping

Add className="my-8 rounded-xl border border-slate-400 p-4" to BookSearch’s section. Explain each class by finding its declaration in DevTools. Keep the semantic section and aria-labelledby.

```check
page react/index.html "getComputedStyle(document.querySelector('section')).paddingTop" "16px" server=vite
```

```hints
nudge: The section already owns this group of controls.
concept: JSX uses className, and Tailwind scans literal utility names.
shape: Add spacing, border and radius to that section without inserting a decorative wrapper.
```

## Diagnose, explain and review

Misspell bg-brand-700 in a temporary element and inspect the absent rule, then restore it. Compare bundle behavior with a CDN prototype. In v4, adding an old tailwind.config.js file does not automatically reproduce older configuration conventions. Use the referenced v4 guide rather than mixing tutorial versions.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Translate the search section’s utility classes back into ordinary CSS properties. Then explain why a class can be present in the DOM yet have no matching generated rule. Your debugging answer should include source discovery, plugin processing and the browser’s computed styles.
