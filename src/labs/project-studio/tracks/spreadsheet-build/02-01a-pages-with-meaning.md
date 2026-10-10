---
title: Styling 1 — Pages with Meaning
runtime: none
---

The next seven lessons are a **styling section**: how to make any web page look good, not only a spreadsheet. Layout, spacing, type, colour, and pages that work on a phone as well as a monitor. You'll learn it all on a page of your own in the playground, a one-page **portfolio site** about you as a developer, and every step is an experiment you can push further. After the section, lessons 2.2 to 2.4 apply it to the spreadsheet, and the sprint ends with a challenge: build a page from a designer's spec.

Good styling starts with good HTML. Not much of it, but the right elements. This lesson builds the portfolio's HTML, with no styling at all.

## Elements that say what things are

HTML has elements that only say *what part of the page* something is. They don't look like anything special:

| Element | Means |
|---|---|
| `<header>` | the top of the page: the site's name, the navigation |
| `<nav>` | the main links around the site |
| `<main>` | the page's own content; one per page |
| `<section>` | a part of the content with its own heading |
| `<article>` | something that stands on its own: a project, a post, a product |
| `<footer>` | the bottom: who made it, contact links |

These are called **semantic** elements (*semantic* means "about meaning"). Before they existed, pages were built from `<div>`s, a box that means nothing at all, and every page invented its own names for its parts.

Meaning matters for three readers:

- **Screen readers**, which read pages aloud to blind and partially sighted people, let their users jump straight to the `<nav>` or the `<main>`. A page of `<div>`s offers nothing to jump to.
- **Search engines** use them to tell the content apart from the menus around it.
- **You**, writing CSS: `header nav a` is a far clearer selector than `.div3 .div7 a`.

Headings matter in the same way. There's one `<h1>`, the page's title. Each section starts with an `<h2>`, and things inside sections use `<h3>`. Never pick a heading level for its size: size is CSS's job. Screen-reader users move through a page by its headings, like a table of contents.

## The portfolio's HTML

This step opens a new file, `playground/site/index.html`. Type it, with your own name instead of *Sam Rivera* if you like:

```html file=playground/site/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sam Rivera — Software Developer</title>
  </head>
  <body>
    <header>
      <a class="name" href="#intro">Sam Rivera</a>
      <nav>
        <ul>
          <li><a href="#projects">Projects</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <section id="intro">
        <h1>I build software people enjoy using.</h1>
        <p>I'm a developer learning to build full-stack web applications, one real project at a time.</p>
        <p class="actions">
          <a class="button" href="#projects">See my projects</a>
          <a class="button secondary" href="#about">About me</a>
        </p>
      </section>
      <section id="projects">
        <h2>Projects</h2>
        <div class="cards">
          <article class="card">
            <h3>Spreadsheet</h3>
            <p>A spreadsheet in the browser, with a formula language I wrote myself.</p>
          </article>
          <article class="card">
            <h3>Command-line tools</h3>
            <p>Small scripts that save me time every day, now with tests.</p>
          </article>
          <article class="card">
            <h3>This site</h3>
            <p>Semantic HTML and hand-written CSS: no framework, no template.</p>
          </article>
        </div>
      </section>
      <section id="about">
        <h2>About</h2>
        <p>I started by hacking scripts together until they worked. Now I'm learning to build software that keeps working: tested, readable and easy to change.</p>
      </section>
    </main>
    <footer>
      <p>Made by Sam Rivera, 2026.</p>
    </footer>
  </body>
</html>
```

### What's new

- **`<meta name="viewport" …>`** tells phones to show the page at its real size instead of shrinking a desktop-sized page to fit. Every page you make should have it. Lesson Styling 7 shows what goes wrong without it.
- **The navigation is a list** (`<ul>`, *unordered list*, with an `<li>` per item), because it *is* a list of links. Screen readers announce "list, 3 items", which tells the listener what's coming.
- **`<a href="#projects">`** is a link to the element whose `id` is `projects` on the same page. Click it and the browser scrolls there.
- **`class="card"`** is a label you put on elements so CSS can pick them out (Styling 2 shows how). An element can have several, separated by spaces: `class="button secondary"`.
- **`<div class="cards">`** is the one meaningless box on the page. It's there purely to group the three projects for layout (Styling 6). That's what `<div>` is for: grouping when no meaningful element fits.

Open it in your browser: `start playground/site/index.html`. It's plain: black text on white, blue underlined links, bullet points. That's the browser's own built-in styling, the starting point for everything that follows.

```check
page playground/site/index.html "document.querySelectorAll('body > header, header nav, body > main, body > footer').length" 4 label="the page has a header with a nav, a main and a footer"
page playground/site/index.html "document.querySelectorAll('h1').length" 1 label="exactly one h1"
page playground/site/index.html "[...document.querySelectorAll('h1, h2, h3')].map((h) => h.tagName).join(',')" "H1,H2,H3,H3,H3,H2" label="the headings go h1, then an h2 per section, h3 inside"
page playground/site/index.html "document.querySelectorAll('main > section').length" 3 label="main has three sections"
page playground/site/index.html "document.querySelectorAll('article.card').length" 3 label="three project cards"
page playground/site/index.html "document.querySelectorAll('nav ul li a[href^=\"#\"]').length" 3 label="the nav is a list of three links to the page's sections"
```

## A section versus a div

Before you look closely, predict:

```predict
question: Without any CSS, does a `<section>` look any different from a `<div>`?
choice: Yes: sections get extra space around them
choice: No: they look exactly the same
choice: Yes: sections get a border
answer: No: they look exactly the same
explain: Semantic elements change what a page *means*, not how it looks. A `<section>` and a `<div>` are both plain blocks, one above the next. All the looks come from CSS: the browser's own small built-in stylesheet, and then yours.
verify: page playground/site/index.html "(() => { const d = document.createElement('div'); document.body.append(d); const a = getComputedStyle(d); const b = getComputedStyle(document.querySelector('section')); return ['display', 'margin', 'padding', 'border'].every((p) => a[p] === b[p]) ? 'No: they look exactly the same' : 'Yes'; })()"
```

Check in DevTools if you like (**F12**, the Elements tab; lesson 2.4 tours it properly). Click `<section id="projects">`: its Styles pane has no rules from the browser's built-in stylesheet that a `<div>` wouldn't get too.

## Commit

```powershell
git add playground/site
git commit -m "Add the portfolio page's HTML to the playground"
```

```check
git-tracked playground/site/index.html -- git add playground/site, then git commit.
git-clean
```

## Your turn: a contact section

The nav already links to `#contact`, but there's no such section, so the link goes nowhere. Add it, as the last section of `main`:

- a heading, **Contact**, at the right level;
- a list of at least two links: an email link, and a link to a profile (GitHub, or anywhere you like).

An email link is an `<a>` whose `href` starts with `mailto:`, like `mailto:sam@example.com`. Clicking it opens an email program.

Then click **Contact** in the page's nav to see the link work. Commit when you're done.

```check
page playground/site/index.html "document.querySelector('main > section#contact > h2')?.textContent" Contact label="main has a section with id contact, headed Contact by an h2" -- The section needs id="contact" and an <h2>Contact</h2>.
page playground/site/index.html "document.querySelectorAll('#contact ul > li > a').length >= 2" true label="it has a list of at least two links" -- Put the links in a <ul>, each in its own <li>.
page playground/site/index.html "document.querySelector('#contact a[href^=\"mailto:\"]') !== null" true label="one of them is an email link" -- An email link's href starts with mailto:
page playground/site/index.html "document.querySelectorAll('h1').length" 1 label="there's still exactly one h1"
git-clean -- Commit it: git commit -am "Add a contact section"
```

```hints
nudge: The About section is a section with an `id`, an `h2` and some content. The nav is a list of links.
concept: A section's heading is an `<h2>` because the page's only `<h1>` is the title. The `id` is what `href="#contact"` finds. A list is `<ul>` with one `<li>` per item, and each `<li>` holds an `<a>`.
shape: `<section id="contact">`, then `<h2>`, then `<ul>` with two `<li><a href="...">...</a></li>`, then `</section>`, placed just before `</main>`.
answer: ~~~html
      <section id="contact">
        <h2>Contact</h2>
        <ul>
          <li><a href="mailto:sam@example.com">sam@example.com</a></li>
          <li><a href="https://github.com/sam-rivera">GitHub</a></li>
        </ul>
      </section>
~~~
```
