// @vitest-environment happy-dom
//
// Tests for real incidents hit while importing external HTML into HTML Lab:
// a <table> lost its <thead>/<tr>/<th> children entirely (CONTAINER_TAGS gap,
// fixed in labReducer.ts), and a toast/dark-mode toggle stopped working because
// the import baked class-based rules into one-time inline styles (fixed in
// applyImportedCssToDoc). These guard against both regressing silently.

import { describe, it, expect } from "vitest";
import { parseHtmlDocument, elementsToCss, applyCssToElements, elementsToHtml, htmlToElements, generateExportHtml, generateLinkedHtml } from "./htmlSync";
import type { LabElement } from "./types";

describe("generateExportHtml / generateLinkedHtml — page title & favicon", () => {
  it("defaults to the historical hardcoded title and no favicon when omitted", () => {
    const html = generateExportHtml([], {}, "", "");
    expect(html).toContain("<title>My Page</title>");
    expect(html).not.toContain('rel="icon"');
  });

  it("emits a custom title and favicon link when provided", () => {
    const html = generateExportHtml([], {}, "", "", [], "My Cool Site", "https://example.com/favicon.ico");
    expect(html).toContain("<title>My Cool Site</title>");
    expect(html).toContain('<link rel="icon" href="https://example.com/favicon.ico" />');
  });

  it("falls back to the default title for an empty string, same as omitted", () => {
    const html = generateExportHtml([], {}, "", "", [], "");
    expect(html).toContain("<title>My Page</title>");
  });

  it("generateLinkedHtml also defaults to the historical title/no favicon", () => {
    const html = generateLinkedHtml([]);
    expect(html).toContain("<title>My Page</title>");
    expect(html).not.toContain('rel="icon"');
  });

  it("generateLinkedHtml emits a custom title and favicon too", () => {
    const html = generateLinkedHtml([], [], ["script.js"], "Linked Page", "icon.png");
    expect(html).toContain("<title>Linked Page</title>");
    expect(html).toContain('<link rel="icon" href="icon.png" />');
  });
});

describe("parseHtmlDocument — table structure", () => {
  it("preserves <thead>/<tr>/<th> children instead of dropping them", () => {
    const html = `<!DOCTYPE html><html><body>
      <table>
        <thead><tr><th>Name</th><th>Status</th></tr></thead>
        <tbody><tr><td>Item 1</td><td>Online</td></tr></tbody>
      </table>
    </body></html>`;

    const { elements } = parseHtmlDocument(html);
    const tags = elements.map((e) => e.tag);
    expect(tags).toEqual(expect.arrayContaining(["table", "thead", "tbody", "tr", "th", "td"]));

    const thElements = elements.filter((e) => e.tag === "th");
    expect(thElements.map((e) => e.content)).toEqual(["Name", "Status"]);
  });
});

describe("mixed content (leading text before a child element)", () => {
  const els = (): LabElement[] => [
    { id: "warning", tag: "p", parentId: null, order: 0, content: "Fair warning: ", attrs: { id: "", class: "" }, styles: {}, mediaQueries: [] },
    { id: "warning-strong", tag: "strong", parentId: "warning", order: 0, content: "spoilers ahead.", attrs: { id: "", class: "" }, styles: {}, mediaQueries: [] },
  ];

  it("elementsToHtml renders the leading text before the child, not just the child", () => {
    const html = elementsToHtml(els());
    expect(html).toContain("Fair warning:");
    expect(html).toContain("<strong");
  });

  it("htmlToElements round-trips the leading text instead of dropping it (real incident: lesson content lost its intro text on any edit that re-parsed the HTML tab)", () => {
    // A bare fragment, not the full elementsToHtml() document — a <link
    // rel="stylesheet"> in the parsed doc makes happy-dom attempt a real
    // network fetch, which is irrelevant noise for what this test checks.
    const fragment = `<p data-lab-id="warning">Fair warning: <strong data-lab-id="warning-strong">spoilers ahead.</strong></p>`;
    const parsed = htmlToElements(fragment, els());
    const warning = parsed?.find((e) => e.id === "warning");
    expect(warning?.content).toBe("Fair warning: ");
  });
});

describe("parseHtmlDocument — class-toggle interactivity survives import", () => {
  it("does not bake a stateful class's base rule into a static inline style", () => {
    const html = `<!DOCTYPE html><html><head><style>
      .toast { position: fixed; transform: translateY(120px); }
      .toast.show { transform: translateY(0); }
    </style></head><body>
      <div class="toast" id="toast">Hi</div>
    </body></html>`;

    const { elements, css } = parseHtmlDocument(html);
    const toast = elements.find((e) => e.attrs?.class === "toast");
    expect(toast).toBeDefined();
    // The base rule must NOT be frozen as an inline style — inline styles beat
    // stylesheet rules regardless of specificity, which would permanently block
    // any later classList.toggle("show") from ever having a visual effect.
    expect(toast!.styles.transform).toBeUndefined();
    // Both rules must survive as real, live CSS so the runtime class toggle works.
    expect(css).toContain(".toast");
    expect(css).toContain(".toast.show");
  });

  it("preserves a body.<modifier> rule instead of silently dropping it", () => {
    const html = `<!DOCTYPE html><html><head><style>
      body.dark { --bg: #0f172a; }
    </style></head><body></body></html>`;

    const { css } = parseHtmlDocument(html);
    expect(css).toContain("body.dark");
  });
});

describe("parseHtmlDocument — real incident: a page that rebuilds its own DOM via JS", () => {
  // A "stress test" dashboard whose script wipes and regenerates a nav list
  // on load: `nav.className = "navBtn"; left.appendChild(nav)`. `.navBtn` is
  // a plain single-class selector with no compound rule anywhere referencing
  // it, so the default "bake a simple selector into one-time per-element
  // styles" behavior stripped it out of the live stylesheet entirely — every
  // button the script (re)created after that had zero styling (no
  // data-lab-id attribute exists on an element the script just created),
  // rendering as native inline-block buttons wrapping 2-per-row instead of
  // the intended full-width stacked list. `.hidden`, toggled via
  // `classList.toggle("hidden")` and never appearing in a compound selector
  // either, hit the identical gap.
  const html = `<!DOCTYPE html><html><head><style>
    .navBtn { display: block; width: 100%; margin: 4px 0; }
    .hidden { display: none; }
  </style></head><body>
    <div id="left"></div>
    <script>
      const left = document.getElementById("left");
      function render() {
        const nav = document.createElement("button");
        nav.className = "navBtn";
        left.appendChild(nav);
      }
      function toggleGroup(g) {
        document.querySelectorAll(".group-" + g).forEach(el => el.classList.toggle("hidden"));
      }
      render();
    </script>
  </body></html>`;

  it("keeps a plain class assigned via el.className as live CSS, not baked per-element", () => {
    const { css } = parseHtmlDocument(html);
    expect(css).toContain(".navBtn");
  });

  it("keeps a plain class toggled via classList.toggle as live CSS, not baked per-element", () => {
    const { css } = parseHtmlDocument(html);
    expect(css).toContain(".hidden");
  });
});

describe("elementsToCss / applyCssToElements — real incident: CSS tab editing snowballed the reset block", () => {
  // The CSS tab's onChange handler round-trips the FULL displayed text (reset
  // + body{} + per-element rules + "/* Custom CSS */" + customCss) back
  // through applyCssToElements to re-extract customCss, then elementsToCss
  // re-injects a fresh copy of the reset on top. applyCssToElements stripped
  // the data-lab-id blocks, the body{} block, and the "/* Custom CSS */"
  // marker text — but never the reset block itself, so every edit captured
  // another copy of it into customCss, which then rendered as an *additional*
  // reset copy on the next render — an unbounded duplicate pileup on every
  // single keystroke, not just an occasional glitch.
  function elements(): LabElement[] {
    return [{ id: "e1", tag: "div", parentId: null, order: 0, content: "", attrs: { id: "", class: "" }, styles: { color: "#0f172a" }, mediaQueries: [] }];
  }

  it("re-parsing the generated CSS unchanged does not grow customCss", () => {
    const els = elements();
    const generated = elementsToCss(els, "", {});
    const { customCss } = applyCssToElements(generated, els);
    expect(customCss).toBe("");
  });

  it("stays stable across many edit round-trips instead of accumulating the reset", () => {
    const els = elements();
    let customCss = "";
    for (let i = 0; i < 10; i++) {
      const generated = elementsToCss(els, customCss, {});
      customCss = applyCssToElements(generated, els).customCss;
    }
    expect(customCss).toBe("");
    // Directly guard the actual symptom the user hit: repeated "/* Reset */"
    // headers piling up in the editor text after many rounds of editing.
    const finalGenerated = elementsToCss(els, customCss, {});
    expect(finalGenerated.match(/\/\*\s*Reset\s*\*\//g)?.length ?? 0).toBe(1);
  });

  it("preserves a genuine hand-written custom rule across a round-trip", () => {
    const els = elements();
    const generated = elementsToCss(els, ".my-rule { color: red; }", {});
    const { customCss } = applyCssToElements(generated, els);
    expect(customCss).toContain(".my-rule");
  });
});

describe("applyCssToElements — real incident: pasted class/id/tag CSS never reached the Properties Panel", () => {
  // User report: pasting a stylesheet with plain selectors like ".card { ... }"
  // or "#header { ... }" into the CSS tab had no effect on the canvas, and the
  // Properties Panel had nothing to show or let you change for it — the
  // matching elements were plainly named div class="card" in the markup, but
  // applyCssToElements only ever recognized its own [data-lab-id="..."] shape.
  // A hand-typed simple selector needs the same "bake into this element's
  // styles" treatment applyImportedCssToDoc already gives a freshly-imported
  // HTML document — just matched against LabElement[] instead of a real DOM.
  function elements(): LabElement[] {
    return [
      { id: "e1", tag: "div", parentId: null, order: 0, content: "", attrs: { id: "header", class: "card" }, styles: {}, mediaQueries: [] },
      { id: "e2", tag: "p", parentId: "e1", order: 0, content: "hi", attrs: { id: "", class: "" }, styles: {}, mediaQueries: [] },
    ];
  }

  it("preserves a plain class selector for future and runtime-created elements", () => {
    const { elements: updated, customCss } = applyCssToElements(".card { padding: 16px; }", elements());
    expect(customCss).toContain(".card { padding: 16px; }");
    expect(updated.find((e) => e.id === "e1")?.styles.padding).toBeUndefined();
  });

  it("preserves an ID selector in the stylesheet", () => {
    const { elements: updated } = applyCssToElements("#header { border: 1px solid black; }", elements());
    expect(updated.find((e) => e.id === "e1")?.styles.border).toBeUndefined();
  });

  it("preserves a tag selector in the stylesheet", () => {
    const { elements: updated } = applyCssToElements("p { margin: 0; }", elements());
    expect(updated.find((e) => e.id === "e2")?.styles.margin).toBeUndefined();
  });

  it("leaves a compound selector (.card.featured) as live customCss, not baked", () => {
    const { elements: updated, customCss } = applyCssToElements(".card.featured { color: red; }", elements());
    expect(updated.find((e) => e.id === "e1")?.styles.color).toBeUndefined();
    expect(customCss).toContain(".card.featured");
  });

  it("leaves a class referenced by this project's own JS (classList.toggle) as live customCss, not baked", () => {
    const javascript = `document.querySelector(".card").classList.toggle("card");`;
    const { elements: updated, customCss } = applyCssToElements(".card { padding: 16px; }", elements(), javascript);
    expect(updated.find((e) => e.id === "e1")?.styles.padding).toBeUndefined();
    expect(customCss).toContain(".card");
  });

  it("lets a [data-lab-id] block (a Properties Panel edit) win over a same-property class rule", () => {
    const withClassRule = ".card { padding: 16px; }\n\n[data-lab-id=\"e1\"] {\n  padding: 32px;\n}";
    const { elements: updated } = applyCssToElements(withClassRule, elements());
    expect(updated.find((e) => e.id === "e1")?.styles.padding).toBe("32px");
  });

  it("preserves one live class rule across repeated edits", () => {
    const els = elements();
    let customCss = ".card { padding: 16px; }";
    let currentElements = els;
    for (let i = 0; i < 5; i++) {
      const generated = elementsToCss(currentElements, customCss, {});
      const applied = applyCssToElements(generated, currentElements);
      customCss = applied.customCss;
      currentElements = applied.elements;
    }
    expect(customCss.match(/\.card/g)).toHaveLength(1);
    expect(currentElements.find((e) => e.id === "e1")?.styles.padding).toBeUndefined();
  });

  it("real incident: a .hidden class defined before any JS references it stays live, not baked, so a toggle added later still works", () => {
    const els = [
      { id: "panel", tag: "div", parentId: null, order: 0, content: "", attrs: { id: "panel", class: "hidden" }, styles: {}, mediaQueries: [] },
    ];
    // Written in the natural order: define the class first, wire up the
    // toggle afterward — no javascript exists yet at this exact point.
    const { elements: afterCssOnly, customCss } = applyCssToElements(".hidden { display: none; }", els, "");
    expect(afterCssOnly.find((e) => e.id === "panel")?.styles.display).toBeUndefined();
    expect(customCss).toContain(".hidden");

    // Now the JS is added, and the CSS is reprocessed (as the real app does
    // on every edit) — the class must still be live, not retroactively
    // baked just because it's now also mentioned by the JS.
    const javascript = `document.getElementById("btn").addEventListener("click", () => { document.getElementById("panel").classList.toggle("hidden"); });`;
    const { elements: afterBoth } = applyCssToElements(".hidden { display: none; }", els, javascript);
    expect(afterBoth.find((e) => e.id === "panel")?.styles.display).toBeUndefined();
  });

  it("keeps plain class rules live regardless of the current JavaScript", () => {
    const els = [
      { id: "e1", tag: "div", parentId: null, order: 0, content: "", attrs: { id: "", class: "card" }, styles: {}, mediaQueries: [] },
    ];
    const { elements: updated } = applyCssToElements(".card { padding: 16px; color: red; }", els);
    expect(updated.find((e) => e.id === "e1")?.styles.padding).toBeUndefined();
    expect(updated.find((e) => e.id === "e1")?.styles.color).toBeUndefined();
  });
});

describe("elementsToCss — real incident: a hand-typed :root block got silently relocated", () => {
  // User report: typing a CSS variable block above the reset comment, the
  // next render moved it below the reset and every generated rule instead —
  // elementsToCss always rebuilt custom CSS at the very end, with no regard
  // for where the user had actually placed it. Variables still resolve
  // correctly wherever they end up (CSS doesn't require "declare before use"
  // the way JS does) — this is about not surprising the user by moving code
  // they placed on purpose, not a functional break.
  function elements(): LabElement[] {
    return [{ id: "e1", tag: "div", parentId: null, order: 0, content: "", attrs: { id: "", class: "" }, styles: {}, mediaQueries: [] }];
  }

  it("places a :root block before the reset, not after", () => {
    const generated = elementsToCss(elements(), ":root {\n  --accent: #6366f1;\n}", {});
    const rootIndex = generated.indexOf(":root");
    const resetIndex = generated.indexOf("/* Reset */");
    expect(rootIndex).toBeGreaterThanOrEqual(0);
    expect(resetIndex).toBeGreaterThan(rootIndex);
  });

  it("keeps a non-:root custom rule at the end, acting as an override, unaffected by the hoist", () => {
    const generated = elementsToCss(elements(), ":root {\n  --accent: #6366f1;\n}\n\n.my-rule { color: red; }", {});
    const rootIndex = generated.indexOf(":root");
    const customRuleIndex = generated.indexOf(".my-rule");
    const lastElementRuleIndex = generated.lastIndexOf('[data-lab-id="e1"]');
    expect(customRuleIndex).toBeGreaterThan(lastElementRuleIndex);
    expect(rootIndex).toBeLessThan(customRuleIndex);
  });

  it("survives a full edit round-trip without duplicating or losing the :root block", () => {
    const els = elements();
    let customCss = ":root {\n  --accent: #6366f1;\n}";
    for (let i = 0; i < 5; i++) {
      const generated = elementsToCss(els, customCss, {});
      customCss = applyCssToElements(generated, els).customCss;
    }
    const finalGenerated = elementsToCss(els, customCss, {});
    expect(finalGenerated.match(/:root\s*\{/g)?.length ?? 0).toBe(1);
    expect(finalGenerated).toContain("--accent");
  });
});

describe('source fidelity', () => {
  it('preserves inline text, spaces, entities, and nested tails through repeated edits', () => {
    const original = '<p>Hello <strong>world <em>&amp; friends</em>!</strong> again. <code>&lt;div&gt;</code> done.</p>';
    let elements = htmlToElements(original)!;
    for (let i = 0; i < 3; i++) elements = htmlToElements(elementsToHtml(elements).replace(/<link[^>]*>/g, ""), elements)!;
    const output = generateExportHtml(elements, {}, '', '');
    const doc = new DOMParser().parseFromString(output, 'text/html');
    expect(doc.querySelector('p')?.textContent).toBe('Hello world & friends! again. <div> done.');
    expect(doc.querySelector('code div')).toBeNull();
  });
  it('removes attributes actually removed in source', () => {
    const elements = htmlToElements('<p data-lab-id="p" class="hidden">hello</p>')!;
    expect(htmlToElements('<p data-lab-id="p">hello</p>', elements)![0].attrs.class).toBeFalsy();
  });
  it('keeps conditional CSS, custom properties, and quoted semicolons intact', () => {
    const elements = htmlToElements('<div class="card">A</div>')!;
    const css = '@media (max-width: 600px) { .card { color: red; } } @supports (display:grid) { .card { display:grid; } } .card::after { content:"a;b"; }';
    const result = applyCssToElements(css, elements);
    expect(result.customCss).toBe(css);
    expect(result.elements[0].styles).toEqual({});
  });
  it('does not bake imported rules or change their order and specificity', () => {
    const css = '.card { color: red; } #card { color: blue; } @media (max-width:600px) { .card { padding:10px; } }';
    const result = parseHtmlDocument(`<style>${css}</style><div class="card" id="card">A</div>`);
    expect(result.css).toBe(css);
    expect(result.elements[0].styles).toEqual({});
  });
});

it('keeps the page body stable when the editor flushes unchanged source', () => {
  const imported = htmlToElements('<p>Hello <strong>world</strong> again.</p><button>Count</button>\n')!;
  const once = elementsToHtml(imported).replace(/<link[^>]*>/g, '');
  const twice = elementsToHtml(htmlToElements(once, imported)!).replace(/<link[^>]*>/g, '');
  expect(twice).toBe(once);
});

it('does not hoist a conditional :root rule out of its media query', () => {
  const css = '@media (max-width:600px) { :root { --accent:red; } }';
  expect(elementsToCss([], css, {})).toContain(css);
});

it('exports property overrides as inline styles so an ID rule cannot defeat a visual edit', () => {
  const elements = htmlToElements('<div id="card">A</div>')!;
  elements[0].styles.color = 'green';
  const doc = new DOMParser().parseFromString(generateExportHtml(elements, {}, '#card { color:red; }', ''), 'text/html');
  expect(doc.getElementById('card')?.getAttribute('style')).toContain('color: green');
});

it('round-trips managed responsive styles without duplicating or flattening them', () => {
  let elements = htmlToElements('<div>A</div>')!;
  elements[0].mediaQueries = [{breakpoint:'768px',prop:'display',value:'grid'}];
  let css = '';
  for (let i=0; i<5; i++) {
    const result = applyCssToElements(elementsToCss(elements, css, {}), elements);
    elements = result.elements; css = result.customCss;
  }
  expect(elements[0].styles.display).toBeUndefined();
  expect(elements[0].mediaQueries).toEqual([{breakpoint:'768px',prop:'display',value:'grid'}]);
  expect(elementsToCss(elements, css, {}).match(/@media/g)).toHaveLength(1);
});
