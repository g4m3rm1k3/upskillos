---
title: 10.1 — Build and preview the whole portfolio
track: Frontend Developer Bootcamp — Portfolio, Deployment and Capstone
trackOrder: 50.1
runtime: none
---

Outcome: create a deployable folder containing every app, not only the default entry. A development server transforms on demand; a production build produces static assets. A working dev URL does not prove the built deployment works. These are separate HTML apps, so ordinary relative links are appropriate.

### The story so far

The development server can serve source files on demand, and all the apps appear to work there. A deployed static site needs a finite output folder with every required page and asset included.

We will create a portfolio entry page and explicitly build each app. This is where an assumption often breaks: a URL working during development does not mean the corresponding HTML was included in the production artifact.

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

### Relative paths carry context

From the root index.html, `./cafe/index.html` means a file below the current document directory. A leading `/cafe/index.html` instead starts at the host’s root. If your portfolio is deployed under `/my-portfolio/`, those destinations differ.

The hosting app for this course uses HashRouter, but these learner apps are separate HTML documents. They deliberately use ordinary relative links. Do not copy the host application’s routing conventions into a different architecture without understanding why they exist.

```check
page index.html "document.querySelectorAll('main a').length" "6" server=static
```

## Declare every production entry

### Recipe, workshop and packaged result

Your source and lockfile are the recipe. The development server is the workshop, able to transform files while you work. dist is the packaged result sent to a static host. Do not ship the workshop and assume every resource it can produce already exists in the package.

The analogy has a limit: a build can transform, combine and rename assets. You should therefore inspect and test the built output rather than expecting it to be a byte-for-byte copy of source.

```text
source HTML entries + module imports + CSS imports
  → Vite production build
  → dist HTML + hashed assets
  → preview or static host
  → browser requests only what was emitted
```

The entry map explicitly names the home page and each app. Missing one entry may leave a working development URL with no corresponding built HTML.

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

### Verify a release where it will actually run

`base: './'` asks for relative emitted asset references. The input paths use fileURLToPath because a module URL and an operating-system path are different representations, especially on Windows or paths with encoded characters.

After building, run preview and visit every app through that server. Reload each nested URL directly; clicking from the home page alone may miss a hosting or path issue. Inspect Network for missing CSS or JavaScript, and inspect the console for runtime errors.

**Rule of thumb:** test the artifact, not only the source. A successful compiler or bundler establishes that it produced output, not that every intended workflow is present in that output.

A client-rendered React entry begins with a mostly empty root before JavaScript runs. For some content-heavy products, static generation or server rendering improves initial content delivery and indexing. That is a product-driven next architectural choice, not a reason to pretend this client app already supplies those properties.

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

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Explain how an app can work in dev but be absent from dist. Then resolve `./cafe/index.html` and `/cafe/index.html` for a site hosted under a repository subdirectory. Describe the production check that would catch a missing stylesheet even if the build command exited successfully.
