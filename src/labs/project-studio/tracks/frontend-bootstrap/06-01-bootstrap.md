---
title: 6.1 — Use Bootstrap after understanding the CSS
track: Frontend Developer Bootcamp — Bootstrap Service Dashboard
trackOrder: 50.06
runtime: none
---

Outcome: build a dashboard using an established component system and explain its tradeoffs. Bootstrap supplies components, layout classes and variables. Tailwind (later) supplies utilities from which you compose your own components. Neither library replaces semantic HTML, accessibility testing or design judgment.

### The story so far

You have already built layouts, tokens, forms and interactive states by hand. That experience gives you a way to judge what a CSS library does rather than treating its classes as magic words.

This dashboard is a separate app with a different approach. Bootstrap supplies established visual and interaction conventions. We will use those conventions intentionally, then compare their benefits and constraints with the handmade café design.

## Install a dependency deliberately

Before trying this step, make a prediction.

```predict
question: Does a Bootstrap heading-size class change the semantic heading level?
choice: No
choice: Yes
answer: No
explain: The HTML tag determines semantics; the class controls presentation.
```

Update package.json to add Bootstrap, then run npm install at the root. Keep package-lock.json. The repository hosting this course has its own dependencies: never install the learner app into that repository. The course uses Bootstrap 5.3’s color modes and component conventions; exact versions are recorded by the lockfile.

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
    "vite": "8.3.4"
  },
  "dependencies": {
    "bootstrap": "5.3.8"
  }
}
```

### Installation and use are different events

Adding a package to the manifest records that the app depends on it. npm install downloads and resolves it. Importing its CSS or JavaScript is what brings the relevant parts into a browser entry. Merely installing Bootstrap does not style every HTML file on your disk.

Pinning a direct version keeps the starting choice explicit. The lockfile captures the complete dependency resolution. Read release notes and retest before upgrading a teaching or production project; “newer” is not evidence that existing behavior stayed the same.

```check
contains package.json "\"bootstrap\": \"5.3.8\""
```

## Build the dashboard structure

### A library is a prepared set of decisions

Think of Bootstrap as a fitted kitchen system. Standard cabinet sizes and components make assembly faster and more consistent, but unusual requirements may need customization. Handwritten CSS is closer to building the cabinets yourself. Neither approach automatically produces a usable kitchen.

The analogy has a limit: you can inspect and override Bootstrap’s actual CSS. You are not surrendering the browser’s layout rules. Familiarity with those rules helps you choose whether to use a utility, a component variable or a small custom rule.

### Decode the classes instead of memorizing the whole vocabulary

| Class | Meaning in this layout | Earlier CSS concept |
|---|---|---|
| container | A responsive bounded content area | max-width and centered margins |
| row | A wrapping row for columns | Flexbox |
| col-12 | Full grid width | A single stacked item |
| col-md-6 | Half the grid width at md and above | A media-query change |
| g-3 | Consistent gutters | A shared spacing scale |
| card / card-body | A reusable content surface and its padding | A component with a spacing contract |

Read `col-md-6` as a conditional layout instruction, not as a description of a particular tablet model.

container constrains width; row and col-* implement a responsive grid; g-3 adds gutters. col-12 occupies the full row until col-md-6 switches to half. h4 changes appearance without changing the heading’s semantic level. py-4 is vertical padding. Each class maps to real CSS you can inspect.

```html file=dashboard/index.html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Service Desk</title>
</head>
<body>
  <main class="container py-4">
    <h1>Service Desk</h1>
    <p class="lead">A calm overview of this week's support work.</p>
    <div class="row g-3">
      <section class="col-12 col-md-6" aria-labelledby="open-title"><div class="card h-100"><div class="card-body"><h2 id="open-title" class="h4">Open tickets</h2><p class="display-6">12</p><p>Needs a response from our team.</p></div></div></section>
      <section class="col-12 col-md-6" aria-labelledby="closed-title"><div class="card h-100"><div class="card-body"><h2 id="closed-title" class="h4">Resolved tickets</h2><p class="display-6">28</p><p>Confirmed resolved by the customer.</p></div></div></section>
    </div>
  </main>
  <script type="module" src="app.js"></script>
</body>
</html>
```

### Semantics survive a change of styling system

The headings remain h1 and h2. The sections still have accessible names. The library can make an h2 look like a smaller heading without changing its place in the document outline. This is an advantage of learning HTML before a component catalog: you can tell which responsibilities the library does not take over.

`h-100` helps cards fill the available column height. It is useful when columns align but does not justify clipping long text. Test short and long card content rather than choosing heights from one screenshot.

**Rule of thumb:** adopt a library’s defaults where they support the task; customize named theme variables or a small coherent layer when they do not. Scattered !important overrides fighting dozens of defaults often indicate that the chosen component or design system is a poor fit.

For this dashboard, a familiar grid and card system saves repetitive styling. For an unusually expressive editorial site, custom CSS might offer clearer control. The choice should follow product needs, team familiarity and maintenance cost, not whichever tool has the most social-media attention.

```check
page dashboard/index.html "document.querySelectorAll('section h2').length" "2" server=static
```

## Load library CSS through the bundler

A bare import names an installed package rather than a relative file. Vite resolves it from node_modules and includes its CSS. Open /dashboard/index.html through npm run dev; file:// cannot resolve package imports. This check uses the learner’s Vite server.

```javascript file=dashboard/app.js
import 'bootstrap/dist/css/bootstrap.min.css';
```

### Why this app needs the local server

A browser understands URLs, not npm package names. `import 'bootstrap/dist/css/bootstrap.min.css'` is resolved by Vite while it processes the module. Opening the HTML through file:// skips that service and leaves the browser unable to interpret the package import as intended.

The import also makes the dependency visible to the build graph. When you later build the portfolio, Vite can include the used CSS in the output for this entry. Keep the café’s imports separate so its custom styling does not accidentally acquire a second global reset.

```check
page dashboard/index.html "getComputedStyle(document.querySelector('.row')).display" "flex" server=vite
```

## Your turn: use spacing consistently

Change row g-3 to row g-4. Compare the visual rhythm with the earlier handmade café page and explain the tradeoff between a fixed library scale and your own tokens.

```check
page dashboard/index.html "document.querySelector('.row').classList.contains('g-4')" "true" server=vite
```

```hints
nudge: Change the gutter on the grid, not margins on every card.
concept: The g-* utilities set both horizontal and vertical grid gutters.
shape: Replace the grid container’s spacing class and inspect the generated variable.
```

## Diagnose, explain and review

Temporarily remove the CSS import: semantic content remains, while layout and component styles disappear. Restore it. Resize across the md breakpoint and check reading order. Reference: https://getbootstrap.com/docs/5.3/ . Do not mix CDN and installed copies of the same library.

Write three lines in your learning journal: what you observed, why it happened, and a new case you designed. These checks establish the named cases only; visual quality and complete accessibility remain untested. Use the manual observations above before marking the lesson complete.

### Explain it without the reference

Explain how the same col-md-6 class behaves below and above its breakpoint. Then identify one decision Bootstrap made for you and one decision it did not make, such as whether the dashboard’s ticket labels accurately describe the business state.
