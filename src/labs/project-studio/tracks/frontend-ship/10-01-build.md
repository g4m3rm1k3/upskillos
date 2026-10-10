---
title: 10.1 — Build and preview the whole portfolio
track: Frontend Developer Bootcamp — Portfolio, Deployment and Capstone
trackOrder: 50.1
runtime: none
reference: optional
---

Outcome: create a deployable folder containing every app, not only the default entry. A development server transforms on demand; a production build produces static assets. A working dev URL does not prove the built deployment works. These are separate HTML apps, so ordinary relative links are appropriate.

## Give the portfolio a front door

Before trying this step, make a prediction.

```predict
question: Does a working development URL prove that its page is included in dist?
choice: No
choice: Yes
answer: No
explain: Production entry configuration and output must be tested separately.
```

Create the root index.html with relative links. Unlike the host learning app’s HashRouter, these learner projects are separate HTML documents. Relative links preserve a hosting subdirectory. Do not use links starting with / for a repository-hosted portfolio unless you have accounted for its base path.

```html file=index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Frontend Portfolio</title>
  <link rel="stylesheet" href="./cafe/styles.css">
</head>
<body>
  <main>
    <h1>Frontend Portfolio</h1>
    <p>Apps built from semantic HTML through React. Each solves a specific user task.</p>
    <ul>
      <li><a href="./cafe/index.html">Juniper Café — plan a visit</a></li>
      <li><a href="./budget/index.html">Pocket Budget — understand a balance</a></li>
      <li><a href="./planner/index.html">Focus Planner — remember next actions</a></li>
      <li><a href="./books/index.html">Shelf Search — find books through an API</a></li>
      <li><a href="./dashboard/index.html">Service Desk — Bootstrap overview</a></li>
      <li><a href="./react/index.html">Reading Room — React and Tailwind</a></li>
    </ul>
  </main>
</body>
</html>
```

```check
page index.html "document.querySelectorAll('main a').length" "6" server=static
```

## Declare every production entry

Vite otherwise builds only root index.html. Each app needs an explicit entry. base: ./ emits relative asset references. fileURLToPath converts module URLs to filesystem paths on different platforms. Run npm run build, then npm run preview; open every link using the preview server and reload each page directly. Stop preview with Ctrl+C. The pinned Vite 8 toolchain uses rolldownOptions; older Vite tutorials may call this rollupOptions.

```javascript file=vite.config.js
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
const entry = path => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  build: {
    rolldownOptions: {
      input: {
        home: entry('./index.html'),
        cafe: entry('./cafe/index.html'),
        budget: entry('./budget/index.html'),
        planner: entry('./planner/index.html'),
        books: entry('./books/index.html'),
        dashboard: entry('./dashboard/index.html'),
        reading: entry('./react/index.html')
      }
    }
  }
});
```

```check
run "npm run build" timeout=120
file dist/react/index.html
```

## Your turn: make the portfolio discoverable

Add `<meta name="description" content="Practical frontend projects in design, JavaScript and React.">` inside the root page head. Write your own improved description after the check. Preview the tab title, content and links; metadata helps summarize a page but does not replace useful content.

```check
page index.html "document.querySelector('meta[name=description]').content.length > 20" "true" server=static
```

```hints
nudge: Metadata belongs in head, not the visible body.
concept: The description summarizes the page for external previews and indexing.
shape: Add a name/content meta element with a concrete description.
```

## Diagnose, explain and review

Temporarily omit the reading input from the build config: dev still works, but dist/react/index.html is absent after a clean build. Restore it and rebuild. Check all apps under a simulated subdirectory and with a direct reload. A client-only React page initially sends a mostly empty root; SSR/SSG can help content delivery and SEO when a product needs it.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. Automated checks cover the named cases, not visual quality or complete accessibility. Use the manual observations above before marking the lesson complete.
