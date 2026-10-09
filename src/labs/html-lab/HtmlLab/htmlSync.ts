import { parse as parseCss } from "postcss";
import type { LabElement, BodyStyles } from "./types";
import type { CdnTag } from "./cdnLibraries";

// ─── elements → editable source parts ─────────────────────────────────────────
export function elementsToHtml(elements: LabElement[]): string {
  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <link rel="stylesheet" href="styles.css" />`,
    `  <script src="script.js" defer></script>`,
    `</head>`,
    `<body>`,
    ``,
    buildHtmlBody(elements),
    ``,
    `</body>`,
    `</html>`,
  ].join("\n");
}

const CSS_RESET = `/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

img, video, svg {
  display: block;
  max-width: 100%;
}

input, button, textarea, select {
  font: inherit;
}`;

// Custom properties (CSS variables) are conventionally declared at the very
// top of a stylesheet, before anything that might use them — the position a
// user typing `:root { --accent: ... }` above the reset comment clearly
// intended. elementsToCss otherwise always rebuilds custom CSS at the very
// end (see below), which silently relocated a hand-typed :root block behind
// the reset and every generated rule on the next round-trip. Variables still
// resolve correctly wherever the block ends up (the CSS cascade doesn't
// require "declare before use" the way JS does) — this is purely about not
// surprising a user by moving code they placed on purpose, not a functional
// fix. Only :root is hoisted; every other custom rule keeps acting as an
// override, applied after the generated rules it may be overriding.
function extractRootBlock(customCss: string): { rootBlock: string | null; rest: string } {
  const rootBlockPattern = /:root\s*\{[^}]*\}/i;
  const match = customCss.match(rootBlockPattern);
  if (!match) return { rootBlock: null, rest: customCss };
  return {
    rootBlock: match[0],
    rest: (customCss.slice(0, match.index) + customCss.slice((match.index ?? 0) + match[0].length)).trim(),
  };
}

export function elementsToCss(
  elements: LabElement[],
  customCss = "",
  bodyStyles: BodyStyles = {},
): string {
  const bodyRules = stylesToString(bodyStyles, "  ");
  const { rootBlock, rest: customCssWithoutRoot } = extractRootBlock(customCss.trim());
  const blocks: string[] = [
    ...(rootBlock ? [rootBlock, ``] : []),
    CSS_RESET,
    ``,
    `body {\n${bodyRules || "  margin: 0;\n  padding: 16px;\n  font-family: sans-serif;"}\n}`,
    ``,
    ...elements.map((el) => {
      const rules = stylesToString(el.styles, "  ");
      return `[data-lab-id="${el.id}"] {\n${rules ? `${rules}\n` : ""}}`;
    }),
  ];

  const mqByBreakpoint = new Map<string, { id: string; prop: string; value: string }[]>();
  for (const el of elements) {
    for (const mq of el.mediaQueries || []) {
      const bp = mq.breakpoint;
      if (!mqByBreakpoint.has(bp)) mqByBreakpoint.set(bp, []);
      mqByBreakpoint.get(bp)!.push({ id: el.id, prop: mq.prop, value: mq.value });
    }
  }
  if (mqByBreakpoint.size > 0) {
    blocks.push("");
    for (const [bp, rules] of mqByBreakpoint) {
      const grouped = new Map<string, { prop: string; value: string }[]>();
      for (const r of rules) {
        if (!grouped.has(r.id)) grouped.set(r.id, []);
        grouped.get(r.id)!.push({ prop: r.prop, value: r.value });
      }
      const inner = [...grouped.entries()]
        .map(([id, propRules]) => {
          const propLines = propRules
            .map(({ prop, value }) => `    ${prop.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${value};`)
            .join("\n");
          return `  [data-lab-id="${id}"] {\n${propLines}\n  }`;
        })
        .join("\n");
      blocks.push(`@media (min-width: ${bp}) {\n${inner}\n}`);
    }
  }

  const trimmedCustom = customCssWithoutRoot.trim();
  if (trimmedCustom) blocks.push("", "/* Custom CSS */", trimmedCustom);
  return blocks.join("\n");
}

// ─── HTML string → elements ───────────────────────────────────────────────────
export function htmlToElements(
  code: string,
  existingElements: LabElement[] = [],
  javascript = "",
): LabElement[] | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, "text/html");
    const body = doc.body;
    const SKIP = new Set(["script", "style", "meta", "link"]);
    const usedIds = new Set<string>();
    const existingById = new Map<string, LabElement>(existingElements.map((el) => [el.id, el]));
    const existingByHtmlId = new Map<string, LabElement>(
      existingElements
        .filter((el) => el.attrs?.id)
        .map((el) => [el.attrs.id, el]),
    );
    const existingByPath = new Map<string, LabElement>();
    const jsRefs = extractJavascriptRefs(javascript);

    function buildExistingPaths(parentId: string | null, prefix = ""): void {
      existingElements
        .filter((el) => (el.parentId ?? null) === parentId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .forEach((el, index) => {
          const path = prefix ? `${prefix}.${index}` : `${index}`;
          existingByPath.set(path, el);
          buildExistingPaths(el.id, path);
        });
    }
    buildExistingPaths(null);

    let counter = Date.now();
    function nextId(): string {
      let id = "el" + counter++;
      while (existingById.has(id) || usedIds.has(id)) id = "el" + counter++;
      return id;
    }

    function stableIdFor(node: Element, path: string): string {
      const explicitId = node.getAttribute("data-lab-id");
      if (explicitId && !usedIds.has(explicitId)) {
        usedIds.add(explicitId);
        return explicitId;
      }
      const htmlId = node.getAttribute("id");
      const idMatchedByJs = htmlId && jsRefs.htmlIds.has(htmlId);
      const priorByHtmlId = htmlId ? existingByHtmlId.get(htmlId) : null;
      if (idMatchedByJs && priorByHtmlId && !usedIds.has(priorByHtmlId.id)) {
        usedIds.add(priorByHtmlId.id);
        return priorByHtmlId.id;
      }
      const prior = existingByPath.get(path);
      if (prior && !usedIds.has(prior.id)) {
        usedIds.add(prior.id);
        return prior.id;
      }
      const id = nextId();
      usedIds.add(id);
      return id;
    }

    function parseNode(node: Element, parentId: string | null, order: number, path: string): LabElement[] {
      const tag = node.tagName.toLowerCase();
      if (SKIP.has(tag)) return [];

      const styleStr = node.getAttribute("style") || "";
      const labIdAttr = node.getAttribute("data-lab-id");
      const existing =
        (labIdAttr ? existingById.get(labIdAttr) : undefined) ??
        existingByPath.get(path);
      const inlineStyles = parseStyleString(styleStr);
      const styles = Object.keys(inlineStyles).length
        ? inlineStyles
        : { ...(existing?.styles || {}) };
      const attrs: Record<string, string> = {
        ...attrsFromNode(node),
      };

      const childEls = Array.from(node.children).filter(
        (c) => !SKIP.has(c.tagName.toLowerCase()),
      );
      // Text before and between child elements belongs to the document too.
      let content = "";
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE) break;
        if (child.nodeType === Node.TEXT_NODE) content += child.textContent || "";
      }
      let trailingText = "";
      for (let sibling = node.nextSibling; sibling && sibling.nodeType !== Node.ELEMENT_NODE; sibling = sibling.nextSibling) {
        if (sibling.nodeType === Node.TEXT_NODE) trailingText += sibling.textContent || "";
      }

      const el: LabElement = {
        id: stableIdFor(node, path),
        tag,
        attrs,
        styles,
        content,
        preserveText: true,
        trailingText,
        parentId: parentId || null,
        order,
        mediaQueries: existing?.mediaQueries || [],
      };

      const descendants: LabElement[] = [];
      childEls.forEach((child, i) => {
        descendants.push(...parseNode(child, el.id, i, `${path}.${i}`));
      });

      return [el, ...descendants];
    }

    const rootNodes = Array.from(body.children).filter(
      (c) => !SKIP.has(c.tagName.toLowerCase()),
    );
    if (rootNodes.length === 0) return null;

    const result: LabElement[] = [];
    rootNodes.forEach((node, i) => result.push(...parseNode(node, null, i, `${i}`)));
    return result;
  } catch (err) {
    console.warn("htmlToElements parse error:", err);
    return null;
  }
}

export function extractJavascriptRefs(javascript = ""): { labIds: Set<string>; htmlIds: Set<string> } {
  const labIds = new Set<string>();
  const htmlIds = new Set<string>();
  const labIdPattern = /data-lab-id\s*=\s*(?:"([^"]+)"|'([^']+)')/g;
  const getElementPattern = /getElementById\(\s*(?:"([^"]+)"|'([^']+)')\s*\)/g;
  const queryIdPattern = /querySelector(?:All)?\(\s*(?:"#([^"]+)"|'#([^']+)')\s*\)/g;

  for (const match of javascript.matchAll(labIdPattern)) labIds.add(match[1] || match[2]);
  for (const match of javascript.matchAll(getElementPattern)) htmlIds.add(match[1] || match[2]);
  for (const match of javascript.matchAll(queryIdPattern)) htmlIds.add(match[1] || match[2]);

  return { labIds, htmlIds };
}

// ─── Shared element renderer ──────────────────────────────────────────────────
export function buildHtmlBody(elements: LabElement[]): string {
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const text = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function render(el: LabElement): string {
    const attrs = `${renderAttrs(el.attrs)} data-lab-id="${escapeAttr(el.id)}"`;
    const tail = text(el.trailingText || "");
    if (voidTags.has(el.tag)) return `<${el.tag}${attrs} />${tail}`;
    const children = elements.filter(c => c.parentId === el.id).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const content = el.preserveText ? text(el.content || "") : el.content || "";
    return `<${el.tag}${attrs}>${content}${children.map(render).join("")}</${el.tag}>${tail}`;
  }
  return elements.filter(e => !e.parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(render).join("\n");
}

// ─── Export: standalone HTML ──────────────────────────────────────────────────
export function generateExportHtml(
  elements: LabElement[],
  bodyStyles: BodyStyles,
  customCss: string,
  javascript: string,
  cdnTags: CdnTag[] = [],
  pageTitle = "My Page",
  faviconUrl = "",
): string {
  const htmlBody = buildHtmlBody(elements);
  const css = elementsToCss(elements, customCss, bodyStyles);

  const cdnHeadTags = cdnTags.map(({ url, type }) =>
    type === "stylesheet"
      ? `  <link rel="stylesheet" href="${url}" />`
      : `  <script src="${url}"></script>`,
  ).join("\n");

  const lines: (string | null)[] = [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `  <title>${pageTitle || "My Page"}</title>`,
    faviconUrl ? `  <link rel="icon" href="${faviconUrl}" />` : null,
    cdnHeadTags || null,
    `  <style>`,
    css.split("\n").map(l => `    ${l}`).join("\n"),
    `  </style>`,
    `</head>`,
    `<body>`,
    ``,
    htmlBody,
    ``,
    javascript?.trim() ? `<script>\n${javascript}\n</script>` : "",
    `</body>`,
    `</html>`,
  ];
  return lines.filter((l): l is string => l !== null && l !== "").join("\n");
}

// ─── Export: linked to separate files ────────────────────────────────────────
// `jsFileNames` are written in order — one `<script>` per real file (each
// downloads as itself, real editable source, not a merged/transpiled bundle;
// see HtmlLab.tsx's exportSplit). Defaults to a single "script.js" for any
// caller that hasn't been updated to pass real names.
export function generateLinkedHtml(elements: LabElement[], cdnTags: CdnTag[] = [], jsFileNames: string[] = ["script.js"], pageTitle = "My Page", faviconUrl = ""): string {
  const htmlBody = buildHtmlBody(elements);
  const cdnHeadTags = cdnTags.map(({ url, type }) =>
    type === "stylesheet"
      ? `  <link rel="stylesheet" href="${url}" />`
      : `  <script src="${url}"></script>`,
  ).join("\n");
  const jsTags = jsFileNames.map((name) => `  <script src="${name}" defer></script>`).join("\n");

  const lines: (string | null)[] = [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `  <title>${pageTitle || "My Page"}</title>`,
    faviconUrl ? `  <link rel="icon" href="${faviconUrl}" />` : null,
    cdnHeadTags || null,
    `  <link rel="stylesheet" href="styles.css" />`,
    `</head>`,
    `<body>`,
    ``,
    htmlBody,
    ``,
    jsTags || null,
    `</body>`,
    `</html>`,
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

export function applyCssToElements(
  css: string,
  elements: LabElement[],
  javascript = "",
): { elements: LabElement[]; customCss: string; bodyStyles?: BodyStyles } {
  // Only the lab's own top-level rules are editable element styles. User
  // selectors, at-rules and their order remain CSS for the browser to apply.
  const styleById = new Map<string, Record<string, string>>();
  let bodyStyles: Record<string, string> | undefined;
  const resetBlock = /\/\*\s*Reset\s*\*\/\s*\*,\s*\*::before,\s*\*::after\s*\{[^}]*\}\s*img,\s*video,\s*svg\s*\{[^}]*\}\s*input,\s*button,\s*textarea,\s*select\s*\{[^}]*\}/gi;
  const cleaned = css.replace(resetBlock, "").replace(/\/\*\s*Custom CSS\s*\*\//gi, "");
  try {
    const root = parseCss(cleaned);
    for (const node of [...root.nodes]) {
      if (node.type !== "rule") continue;
      const managed = node.selector.match(/^\[data-lab-id=(?:"([^"]+)"|'([^']+)')\]$/);
      if (!managed && node.selector !== "body") continue;
      const values: Record<string, string> = {};
      node.nodes.forEach(decl => {
        if (decl.type === "decl") {
          const key = decl.prop.startsWith("--") ? decl.prop : decl.prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
          values[key] = decl.value + (decl.important ? " !important" : "");
        }
      });
      if (managed) styleById.set(managed[1] || managed[2], values);
      else bodyStyles = values;
      node.remove();
    }
    return {
      elements: elements.map(el => styleById.has(el.id) ? { ...el, styles: styleById.get(el.id)! } : el),
      customCss: root.toString().trim(),
      ...(bodyStyles !== undefined ? { bodyStyles } : {}),
    };
  } catch {
    // Incomplete CSS is normal while typing; never flatten a half-written rule.
    return { elements, customCss: cleaned };
  }
}


export function stylesToString(styles: Record<string, string>, linePrefix = ""): string {
  return Object.entries(styles)
    .map(([k, v]) => {
      const prop = k.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${linePrefix}${prop}: ${v};`;
    })
    .join("\n");
}

function renderAttrs(attrs: Record<string, string> = {}): string {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => ` ${key}="${escapeAttr(value)}"`)
    .join("");
}

function escapeAttr(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function attrsFromNode(node: Element): Record<string, string> {
  const attrs: Record<string, string> = {};
  Array.from(node.attributes).forEach((attr) => {
    if (attr.name === "data-lab-id" || attr.name === "style") return;
    attrs[attr.name] = attr.value;
  });
  if (!("id" in attrs)) attrs.id = "";
  if (!("class" in attrs)) attrs.class = "";
  return attrs;
}

// ─── Full HTML document → lab state ──────────────────────────────────────────
export function parseHtmlDocument(htmlString: string): {
  elements: LabElement[];
  bodyStyles: BodyStyles;
  javascript: string;
  css: string;
} {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    const styleEls = Array.from(doc.querySelectorAll("style"));
    const rawCss = styleEls.map((s) => s.textContent ?? "").join("\n\n");

    const scriptEls = Array.from(doc.querySelectorAll("script"));
    const javascript = scriptEls.map((s) => s.textContent).filter(Boolean).join("\n\n");

    const customCss = rawCss;

    const bodyStyleStr = doc.body?.getAttribute("style") || "";
    const bodyStyles: BodyStyles = parseStyleString(bodyStyleStr);

    const elements = htmlToElements(doc.body?.innerHTML || "", [], javascript) || [];

    return { elements, bodyStyles, javascript, css: customCss };
  } catch (err) {
    console.warn("parseHtmlDocument error:", err);
    return { elements: [], bodyStyles: {}, javascript: "", css: "" };
  }
}

export function parseStyleString(str: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!str) return result;
  try {
    const rule = parseCss(`a { ${str} }`).first;
    if (rule?.type !== 'rule') return result;
    rule.nodes.forEach(node => {
      if (node.type !== 'decl') return;
      const key = node.prop.startsWith('--') ? node.prop : node.prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      result[key] = node.value + (node.important ? ' !important' : '');
    });
  } catch { /* An incomplete declaration is retained in the source editor. */ }
  return result;
}
