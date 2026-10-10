---
title: 2.5 — Challenge: A Page from a Design
runtime: none
---

This is how front-end work usually arrives on a team. A designer hands over a **brief**: what the page is for, what's on it, how it should look and behave. A tester has turned the brief into **acceptance tests**. Your job is to build a page that meets the brief and passes the tests, choosing everything else yourself.

Everything you need is in the styling section. No code is shown here: this is your page. The next lesson builds the designer's own version, so you can compare once yours is done.

## The brief

> **Product:** Gridwise, an online spreadsheet for small teams. (It's made up.)
>
> **Page:** Pricing. Visitors compare three plans and pick one.
>
> **Structure**
>
> - A **header** with the product name, *Gridwise*, and a **nav** with three links: *Features*, *Pricing*, *Sign in*. (They can all go to `#` for now.)
> - A **main** area that opens with the page's only heading at the top level, *Simple, honest pricing*, and one sentence under it.
> - **Three plans**, each its own article: a name, a price, a list of at least three features, and a button.
> - The **middle plan is featured**: it says *Most popular*, and it must stand out.
> - A **footer** with a line of small print.
>
> **Content**
>
> | Plan | Price | Features | Button |
> |---|---|---|---|
> | Free | $0 per month | 3 workbooks · Formulas and charts · Export to CSV | Start free |
> | Team | $8 per person, per month | Unlimited workbooks · Live collaboration · Version history · Shared templates | Try Team free |
> | Business | $20 per person, per month | Everything in Team · Permissions by role · Audit log · Priority support | Contact sales |
>
> **Look and behaviour**
>
> - Colours and spacing come from a small set of **design tokens**.
> - **Readable for everyone:** all text at least 4.5 : 1 against its background, buttons included.
> - The featured plan has a **border in the accent colour**; the others don't.
> - **Wide screens** (1100px and up): the three plans **side by side**. **Phones** (400px): **stacked**.
> - The content sits in a **centred column**, never wider than 70rem.
> - Keyboard users can always **see where they are**: a focus style of your own.
> - **No sideways scrolling** at any width down to 320px.
>
> **For the tests:** they find the plans by the class `plan`, the featured one by `featured`, prices by `price` and buttons by `button`. Use those class names.
>
> **Delivery:** `playground/pricing/index.html` and `playground/pricing/style.css`, built on a branch called `pricing`, merged into `main`, the branch deleted, and pushed.

## How a professional would go about it

1. **Read the brief twice and list what it doesn't say.** Fonts? Exact colours? Where the breakpoint is? Those are your decisions. Write them down as you make them: on a team, you'd ask the designer, and they'd want to know what you chose.
2. **Branch first:** `git switch -c pricing`.
3. **HTML first, with no CSS at all.** Get the structure right, open it in the browser, and run the checks: the first three are about structure only.
4. **Tokens and base styles,** then the **phone layout**, then a `min-width` media query for wide screens: mobile first.
5. **Test like a user:** the device toolbar at 320, 400, 768 and 1100px; the colour picker on every colour pair; the Tab key through the whole page.
6. Commit as you go, on the branch. Merge, delete the branch and push when every check passes.

## Your turn: build it to the brief

The twelve numbered checks are the tester's acceptance tests. The rest check the delivery.

```check
page playground/pricing/index.html "document.querySelectorAll('body > header, header nav, body > main, body > footer').length === 4 && document.querySelectorAll('h1').length === 1" true label="1. a header with a nav, a main, a footer, and one h1" -- The brief's Structure section lists the landmarks.
page playground/pricing/index.html "(() => { const plans = [...document.querySelectorAll('main article.plan')]; return plans.length === 3 && plans.every((p) => p.querySelector('h2') && p.querySelector('.price') && p.querySelectorAll('ul > li').length >= 3 && p.querySelector('a.button')); })()" true label="2. three plans, each an article with an h2, a price, three or more features and a button"
page playground/pricing/index.html "(() => { const f = document.querySelectorAll('.plan.featured'); return f.length === 1 && f[0] === document.querySelectorAll('.plan')[1] && f[0].textContent.includes('Most popular'); })()" true label="3. the middle plan, and only it, is featured, and says Most popular"
page playground/pricing/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1100px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const r = [...d.querySelectorAll('.plan')].map((p) => p.getBoundingClientRect()); return Math.abs(r[0].top - r[1].top) < 2 && Math.abs(r[1].top - r[2].top) < 2 && r[0].right <= r[1].left && r[1].right <= r[2].left; })()" true server=static label="4. at 1100px the plans sit side by side"
page playground/pricing/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 400px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const r = [...d.querySelectorAll('.plan')].map((p) => p.getBoundingClientRect()); return r[1].top >= r[0].bottom - 1 && r[2].top >= r[1].bottom - 1; })()" true server=static label="5. at 400px they stack, one under another"
page playground/pricing/index.html "(async () => { const ok = []; for (const w of [320, 400, 768, 1100]) { const f = document.createElement('iframe'); f.style.cssText = `width: ${w}px; height: 800px; border: 0`; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); ok.push(f.contentDocument.documentElement.scrollWidth <= w); } return ok.every(Boolean); })()" true server=static label="6. nothing scrolls sideways at 320, 400, 768 or 1100px"
page playground/pricing/index.html "(async () => { const f = document.createElement('iframe'); f.style.cssText = 'width: 1400px; height: 800px; border: 0'; f.src = location.href; document.body.append(f); await new Promise((done) => (f.onload = done)); const d = f.contentDocument; const m = d.querySelector('main').getBoundingClientRect(); return m.width <= 1120 && Math.abs(m.left - (d.documentElement.clientWidth - m.right)) < 2; })()" true server=static label="7. at 1400px the content is a centred column no wider than 70rem"
page playground/pricing/index.html "(() => { const plans = document.querySelectorAll('.plan'); return getComputedStyle(plans[1]).borderTopColor !== getComputedStyle(plans[0]).borderTopColor; })()" true label="8. the featured plan's border is a different colour from the others"
page playground/pricing/index.html "(() => { const rgb = (s) => s.match(/[0-9.]+/g).slice(0, 3).map(Number); const lum = (c) => c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }; const bg = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; } return 'rgb(255, 255, 255)'; }; return [...document.querySelectorAll('main h1, main h2, main p, main li')].every((el) => ratio(getComputedStyle(el).color, bg(el)) >= 4.5); })()" true label="9. all text in main reaches 4.5 : 1 against its background" -- Check each colour pair with the DevTools colour picker.
page playground/pricing/index.html "(() => { const rgb = (s) => s.match(/[0-9.]+/g).slice(0, 3).map(Number); const lum = (c) => c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); const ratio = (a, b) => { const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }; const bg = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') return c; } return 'rgb(255, 255, 255)'; }; return [...document.querySelectorAll('.button')].every((b) => ratio(getComputedStyle(b).color, bg(b)) >= 4.5); })()" true label="10. every button's text reaches 4.5 : 1"
page playground/pricing/index.html "[...document.styleSheets].some((sheet) => [...sheet.cssRules].some((rule) => (rule.selectorText ?? '').includes(':focus-visible')))" true server=static label="11. the page styles keyboard focus with :focus-visible"
page playground/pricing/index.html "[...document.styleSheets].some((sheet) => [...sheet.cssRules].some((rule) => rule.selectorText === ':root' && [...rule.style].filter((name) => name.startsWith('--')).length >= 3))" true server=static label="12. at least three design tokens on :root"
git-branch main -- Finish on main, after merging: git switch main, git merge pricing
git-no-branch pricing -- Delete the branch once it's merged: git branch -d pricing
git-tracked playground/pricing/index.html -- Commit both files on the branch, then merge it.
git-tracked playground/pricing/style.css
git-pushed -- Push main.
git-clean
```

What the tests can't tell you is whether the page looks **good**: balanced, calm, obviously clickable where it should be. Look at it at every size, and ask whether you'd trust this company with your money. The next lesson's version is one answer, not the only one.

```hints
nudge: Start with the HTML only, and get checks 1 to 3 passing before writing a line of CSS. Then do one check at a time.
concept: Every requirement maps to something from the styling section: landmarks and headings (Styling 1), tokens (3 and 4), contrast (4), a grid of plans (6), a mobile-first media query (7), `max-width` with `margin: auto` (3), and a `:focus-visible` rule (4). A grid's `grid-template-columns` inside `@media (min-width: …)` gives one column on phones and three on wide screens.
shape: `index.html`: `header` with a link and a `nav` list; `main` with an intro `section` and a section of three `article class="plan"`, the middle one also `featured`; `footer`. `style.css`: tokens on `:root`; base styles; the header as a flex row that can wrap; `main` as a centred column; `.plans` as a grid with columns added in a media query; `.plan` as a card; `.featured` with an accent border; `.button`; `:focus-visible`.
```
