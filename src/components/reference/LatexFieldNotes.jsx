"use client";

import React, {
  useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense,
} from "react";
import katex from "katex";
import {
  createEmptyCard, fsrs, generatorParameters, Rating, State,
} from "ts-fsrs";

// Lazy-load Monaco so it never bloats the initial bundle
const MonacoEditor = lazy(() =>
  import("@monaco-editor/react").then((m) => ({ default: m.default }))
);

// ===================================================================
// THEME — all design tokens, dark and light, mapped to the app palette
// ===================================================================
const THEME = {
  dark: {
    "--lfn-paper":       "#07070f",
    "--lfn-paper-dim":   "#0e0e1a",
    "--lfn-surface":     "#12121f",
    "--lfn-surface-2":   "#1a1a2e",
    "--lfn-ink":         "#e2e8f0",
    "--lfn-ink-soft":    "#94a3b8",
    "--lfn-rule":        "#1e1e2e",
    "--lfn-accent":      "#818cf8",
    "--lfn-accent-soft": "#1e1b4b",
    "--lfn-blue":        "#38bdf8",
    "--lfn-blue-soft":   "#0c1e2e",
    "--lfn-green":       "#34d399",
    "--lfn-amber":       "#fbbf24",
    "--lfn-red":         "#f87171",
    "--lfn-code-bg":     "#0d0d1a",
    "--lfn-code-text":   "#a5f3fc",
    "--lfn-result-bg":   "#0a0a18",
    "--lfn-result-text": "#e2e8f0",
    "--lfn-font-serif":  "'Georgia', 'Times New Roman', serif",
    "--lfn-font-sans":   "system-ui, ui-sans-serif, sans-serif",
    "--lfn-font-mono":   "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    "--lfn-radius":      "8px",
    "--lfn-sidebar-width": "220px",
  },
  light: {
    "--lfn-paper":       "#faf9f6",
    "--lfn-paper-dim":   "#f1efe9",
    "--lfn-surface":     "#ffffff",
    "--lfn-surface-2":   "#f5f5f0",
    "--lfn-ink":         "#1c1b19",
    "--lfn-ink-soft":    "#55524a",
    "--lfn-rule":        "#ddd8cc",
    "--lfn-accent":      "#4f46e5",
    "--lfn-accent-soft": "#eef2ff",
    "--lfn-blue":        "#0284c7",
    "--lfn-blue-soft":   "#e0f2fe",
    "--lfn-green":       "#059669",
    "--lfn-amber":       "#d97706",
    "--lfn-red":         "#dc2626",
    "--lfn-code-bg":     "#1e1d1a",
    "--lfn-code-text":   "#e8e4d8",
    "--lfn-result-bg":   "#ffffff",
    "--lfn-result-text": "#1c1b19",
    "--lfn-font-serif":  "'Georgia', 'Times New Roman', serif",
    "--lfn-font-sans":   "system-ui, ui-sans-serif, sans-serif",
    "--lfn-font-mono":   "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    "--lfn-radius":      "8px",
    "--lfn-sidebar-width": "220px",
  },
};

// ===================================================================
// PREVIEW RENDERERS
// Each snippet declares a previewType. These components render the
// actual visual output — what the LaTeX would produce on paper.
// ===================================================================

/** KaTeX math — used for all math snippets */
function MathPreview({ tex, mode = "block" }) {
  const html = useMemo(() => {
    if (!tex) return null;
    try {
      return katex.renderToString(tex, {
        displayMode: mode === "block",
        throwOnError: false,
        strict: false,
      });
    } catch { return null; }
  }, [tex, mode]);
  if (!html) return null;
  return (
    <div className="lfn-result-math">
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/** Text formatting: bold, italic, underline, monospace, sizes */
function FormattingPreview({ items }) {
  return (
    <div className="lfn-result-formatting">
      {items.map((item, i) => {
        let style = {};
        let className = "lfn-fmt-item";
        if (item.bold)      style.fontWeight = "bold";
        if (item.italic)    style.fontStyle  = "italic";
        if (item.underline) style.textDecoration = "underline";
        if (item.mono)      style.fontFamily = "var(--lfn-font-mono)";
        if (item.size) {
          const sizeMap = {
            tiny: "0.6em", scriptsize: "0.7em", footnotesize: "0.8em",
            small: "0.9em", normalsize: "1em", large: "1.2em",
            Large: "1.44em", LARGE: "1.73em", huge: "2.07em", Huge: "2.49em",
          };
          style.fontSize = sizeMap[item.size] || "1em";
        }
        return (
          <div key={i} className={className} style={style}>
            {item.text}
          </div>
        );
      })}
    </div>
  );
}

/** Rendered HTML table — mirrors what LaTeX tabular produces */
function TablePreview({ columns, rows, caption }) {
  return (
    <div className="lfn-result-table-wrap">
      <table className="lfn-result-table">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={row.isHeader ? "lfn-tbl-header" : ""}>
              {row.cells.map((cell, ci) => {
                const align = columns[ci] === "c" ? "center"
                            : columns[ci] === "r" ? "right" : "left";
                return (
                  <td key={ci} style={{ textAlign: align }}>
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && (
        <div className="lfn-result-caption">
          <strong>Table 1:</strong> {caption}
        </div>
      )}
    </div>
  );
}

/** Bulleted, numbered, or description list */
function ListPreview({ variant, items }) {
  if (variant === "dl") {
    return (
      <dl className="lfn-result-dl">
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <dt>{item.term}</dt>
            <dd>{item.def}</dd>
          </React.Fragment>
        ))}
      </dl>
    );
  }
  const Tag = variant === "ol" ? "ol" : "ul";
  return (
    <Tag className={`lfn-result-list lfn-result-${variant}`}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </Tag>
  );
}

/** Section / heading hierarchy */
function SectionsPreview({ sections }) {
  return (
    <div className="lfn-result-sections">
      {sections.map((s, i) => {
        const Tag = s.level === 1 ? "h2" : s.level === 2 ? "h3" : "h4";
        return <Tag key={i} className={`lfn-result-heading lfn-h${s.level}`}>{s.text}</Tag>;
      })}
      <p className="lfn-result-body-text">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    </div>
  );
}

/** Figure placeholder showing what a float looks like */
function FigurePlaceholder({ caption, label }) {
  return (
    <div className="lfn-result-figure">
      <div className="lfn-result-figure-box">
        <div className="lfn-result-figure-icon">🖼</div>
        <div className="lfn-result-figure-filename">filename.png</div>
      </div>
      {caption && (
        <div className="lfn-result-caption">
          <strong>Figure 1:</strong> {caption}
        </div>
      )}
      {label && (
        <div className="lfn-result-label-tag">label: <code>{label}</code></div>
      )}
    </div>
  );
}

/** Cross-reference as it appears in rendered text */
function CrossRefPreview({ text }) {
  return (
    <div className="lfn-result-crossref">
      {text}
    </div>
  );
}

/** Bibliography / citation preview */
function BibPreview({ variant, items }) {
  if (variant === "cite") {
    return (
      <div className="lfn-result-cite">
        This was shown previously <span className="lfn-cite-bracket">[1]</span>.
      </div>
    );
  }
  if (variant === "biblist") {
    return (
      <div className="lfn-result-biblist">
        <div className="lfn-bib-heading">References</div>
        {items.map((item, i) => (
          <div key={i} className="lfn-bib-entry">
            <span className="lfn-bib-num">[{i + 1}]</span>
            <span className="lfn-bib-text">{item}</span>
          </div>
        ))}
      </div>
    );
  }
  if (variant === "link") {
    return (
      <div className="lfn-result-link">
        Visit <span className="lfn-link-text">link text</span> for more information.
      </div>
    );
  }
  return null;
}

/** Page layout annotated diagram */
function LayoutPreview({ variant, items }) {
  if (variant === "margins") {
    return (
      <div className="lfn-result-layout">
        <div className="lfn-layout-page">
          <div className="lfn-layout-margin lfn-layout-top">1 in</div>
          <div className="lfn-layout-middle">
            <div className="lfn-layout-margin lfn-layout-left">1 in</div>
            <div className="lfn-layout-content">Text area</div>
            <div className="lfn-layout-margin lfn-layout-right">1 in</div>
          </div>
          <div className="lfn-layout-margin lfn-layout-bottom">1 in</div>
        </div>
      </div>
    );
  }
  if (variant === "pagebreak") {
    return (
      <div className="lfn-result-pagebreak">
        <div className="lfn-pb-page">
          <div className="lfn-pb-text">... end of page 1</div>
        </div>
        <div className="lfn-pb-divider">— page break —</div>
        <div className="lfn-pb-page">
          <div className="lfn-pb-text">Start of page 2 ...</div>
        </div>
      </div>
    );
  }
  if (variant === "parspacing") {
    return (
      <div className="lfn-result-parspacing">
        <p style={{ margin: 0, paddingTop: "1em", textIndent: 0 }}>
          First paragraph with no indent and a blank line gap between paragraphs.
        </p>
        <p style={{ margin: 0, paddingTop: "1em", textIndent: 0 }}>
          Second paragraph — notice no first-line indent, just vertical space.
        </p>
      </div>
    );
  }
  return null;
}

/** SVG TikZ diagrams — hand-crafted SVGs matching what the LaTeX code draws */
function TikzPreview({ variant }) {
  if (variant === "line") {
    return (
      <div className="lfn-result-tikz">
        <svg viewBox="-10 -10 120 120" width="120" height="120">
          <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <div className="lfn-tikz-label">draw (0,0) -- (2,2)</div>
      </div>
    );
  }
  if (variant === "shapes") {
    return (
      <div className="lfn-result-tikz">
        <svg viewBox="-10 -10 200 80" width="200" height="80">
          <rect x="0" y="10" width="80" height="40" fill="none" stroke="currentColor" strokeWidth="2"/>
          <circle cx="150" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="2"/>
        </svg>
        <div className="lfn-tikz-label">rectangle + circle</div>
      </div>
    );
  }
  if (variant === "arrow-nodes") {
    return (
      <div className="lfn-result-tikz">
        <svg viewBox="-10 -20 180 60" width="180" height="60">
          <rect x="5" y="5" width="30" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <text x="20" y="21" textAnchor="middle" fontSize="14" fill="currentColor">A</text>
          <rect x="130" y="5" width="30" height="24" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <text x="145" y="21" textAnchor="middle" fontSize="14" fill="currentColor">B</text>
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="currentColor"/>
            </marker>
          </defs>
          <line x1="36" y1="17" x2="128" y2="17" stroke="currentColor" strokeWidth="1.5" markerEnd="url(#arr)"/>
        </svg>
        <div className="lfn-tikz-label">node A → node B</div>
      </div>
    );
  }
  return null;
}

/** Error/fix before-after diff */
function ErrorFixPreview({ wrong, correct, note }) {
  return (
    <div className="lfn-result-errorfix">
      <div className="lfn-ef-col lfn-ef-wrong">
        <div className="lfn-ef-label">✗ Wrong</div>
        <pre className="lfn-ef-code">{wrong}</pre>
      </div>
      <div className="lfn-ef-col lfn-ef-right">
        <div className="lfn-ef-label">✓ Correct</div>
        <pre className="lfn-ef-code">{correct}</pre>
      </div>
      {note && <div className="lfn-ef-note">{note}</div>}
    </div>
  );
}

/** Document preview — minimal LaTeX document rendered as styled HTML */
function DocumentPreview({ hasTitle }) {
  return (
    <div className="lfn-result-document">
      {hasTitle && (
        <div className="lfn-doc-title-block">
          <div className="lfn-doc-title">Document Title</div>
          <div className="lfn-doc-author">Your Name</div>
          <div className="lfn-doc-date">September 12, 2026</div>
        </div>
      )}
      <p className="lfn-doc-body">Hello, world.</p>
    </div>
  );
}

/** Escape special characters preview */
function EscapePreview() {
  return (
    <div className="lfn-result-escape">
      <div className="lfn-escape-row">
        {["#", "$", "%", "&", "_", "{", "}", "~", "^", "\\"].map((c, i) => (
          <span key={i} className="lfn-escape-char">{c}</span>
        ))}
      </div>
      <div className="lfn-escape-note">These characters appear literally in your document</div>
    </div>
  );
}

/** Dispatcher — picks the right renderer based on snippet.previewType */
function PreviewOutput({ snippet }) {
  const { previewType: t, previewData: d, previewTex, previewMode } = snippet;
  if (!t) return null;
  switch (t) {
    case "math":
      return <MathPreview tex={previewTex} mode={previewMode || "block"} />;
    case "math-inline":
      return <MathPreview tex={previewTex} mode="inline" />;
    case "formatting":
      return <FormattingPreview items={d.items} />;
    case "table":
      return <TablePreview columns={d.columns} rows={d.rows} caption={d.caption} />;
    case "ul":
      return <ListPreview variant="ul" items={d.items} />;
    case "ol":
      return <ListPreview variant="ol" items={d.items} />;
    case "dl":
      return <ListPreview variant="dl" items={d.items} />;
    case "sections":
      return <SectionsPreview sections={d.sections} />;
    case "figure":
      return <FigurePlaceholder caption={d.caption} label={d.label} />;
    case "crossref":
      return <CrossRefPreview text={d.text} />;
    case "cite":
      return <BibPreview variant="cite" />;
    case "biblist":
      return <BibPreview variant="biblist" items={d.items} />;
    case "link":
      return <BibPreview variant="link" />;
    case "layout-margins":
      return <LayoutPreview variant="margins" />;
    case "layout-pagebreak":
      return <LayoutPreview variant="pagebreak" />;
    case "layout-parspacing":
      return <LayoutPreview variant="parspacing" />;
    case "tikz-line":
      return <TikzPreview variant="line" />;
    case "tikz-shapes":
      return <TikzPreview variant="shapes" />;
    case "tikz-arrow":
      return <TikzPreview variant="arrow-nodes" />;
    case "error-fix":
      return <ErrorFixPreview wrong={d.wrong} correct={d.correct} note={d.note} />;
    case "document":
      return <DocumentPreview hasTitle={d && d.hasTitle} />;
    case "escape":
      return <EscapePreview />;
    default:
      return null;
  }
}

// ===================================================================
// CONTENT DATA — every snippet has a previewType so you always see
// what the LaTeX actually produces.
// ===================================================================

export const DEFAULT_CATEGORIES = [
  // ── DOCUMENT BASICS ─────────────────────────────────────────────
  {
    id: "basics",
    label: "Document basics",
    intro:
      "Every LaTeX file has two zones: the preamble (before \\begin{document}, for setup) and the body (between \\begin{document} and \\end{document}, for content). Nothing you write in the preamble appears on the page — it only configures the document.",
    rules: [
      "`\\documentclass{...}` must be the very first command — it tells LaTeX what kind of document this is.",
      "Packages add features. Load them with `\\usepackage{name}` in the preamble, never in the body.",
      "`\\maketitle` only renders if `\\title`, `\\author`, and `\\date` were set first.",
      "A blank line starts a new paragraph. A single line break does not.",
    ],
    snippets: [
      {
        title: "Minimal document",
        note: "The smallest complete file that compiles. Everything on the page comes from inside \\begin{document}.",
        code: `\\documentclass{article}\n\n\\begin{document}\nHello, world.\n\\end{document}`,
        previewType: "document",
        previewData: { hasTitle: false },
      },
      {
        title: "Common preamble",
        note: "A practical starting point: math, images, links, and full UTF-8 text.",
        code: `\\documentclass[11pt]{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amsmath, amssymb}\n\\usepackage{graphicx}\n\\usepackage{hyperref}\n\\usepackage[margin=1in]{geometry}\n\n\\title{Document Title}\n\\author{Your Name}\n\\date{\\today}\n\n\\begin{document}\n\\maketitle\n\\end{document}`,
        previewType: "document",
        previewData: { hasTitle: true },
      },
      {
        title: "Sectioning",
        note: "Numbered headings, from section down to subsubsection.",
        code: `\\section{First Section}\n\\subsection{A Subsection}\n\\subsubsection{A Sub-subsection}`,
        previewType: "sections",
        previewData: {
          sections: [
            { level: 1, text: "1   First Section" },
            { level: 2, text: "1.1   A Subsection" },
            { level: 3, text: "1.1.1   A Sub-subsection" },
          ],
        },
      },
    ],
    quiz: [
      { q: "What two zones does a LaTeX file have?", a: "The preamble (before `\\begin{document}`) and the body (between `\\begin{document}` and `\\end{document}`).", hint: "One sets things up, one is what gets typeset." },
      { q: "What must always be the very first command?", a: "`\\documentclass{...}`", hint: "It declares the document type." },
      { q: "What actually starts a new paragraph in LaTeX source?", a: "A blank line — a single line break is ignored.", hint: "Not the Enter key alone." },
    ],
  },

  // ── TEXT FORMATTING ──────────────────────────────────────────────
  {
    id: "text",
    label: "Text formatting",
    intro:
      "Formatting commands wrap their argument in curly braces. Most can be nested — \\textbf{\\textit{text}} gives bold italic. Size commands are switches, not wrappers, so scope them with { } to limit their reach.",
    rules: [
      "Formatting commands take their target in braces: `\\textbf{word}`, not `\\textbf word`.",
      "Nest commands to combine effects: `\\textbf{\\textit{text}}` = bold italic.",
      "Size commands like `\\small` are switches — scope them: `{\\large Big text}` keeps the rest of the doc normal.",
      "A blank line in the source = new paragraph. A single line break = nothing.",
    ],
    snippets: [
      {
        title: "Bold, italic, underline, monospace",
        note: "The four most common text styles.",
        code: `\\textbf{bold text}\n\\textit{italic text}\n\\underline{underlined text}\n\\texttt{monospace text}`,
        previewType: "formatting",
        previewData: {
          items: [
            { text: "bold text", bold: true },
            { text: "italic text", italic: true },
            { text: "underlined text", underline: true },
            { text: "monospace text", mono: true },
          ],
        },
      },
      {
        title: "Font sizes",
        note: "From tiny to Huge — each is a switch that affects all following text until the group closes.",
        code: `{\\small small}  {\\large large}  {\\Large larger}  {\\huge huge}`,
        previewType: "formatting",
        previewData: {
          items: [
            { text: "small", size: "small" },
            { text: "large", size: "large" },
            { text: "larger (Large)", size: "Large" },
            { text: "huge", size: "huge" },
          ],
        },
      },
      {
        title: "Footnote",
        note: "\\footnote{} marks the spot and holds the text. LaTeX handles the number and placement.",
        code: `This needs a note.\\footnote{Here is the footnote text.}`,
        previewType: "crossref",
        previewData: { text: "This needs a note.¹\n\n¹ Here is the footnote text." },
      },
      {
        title: "Block quote",
        code: `\\begin{quote}\nA short quoted passage goes here.\n\\end{quote}`,
        previewType: "formatting",
        previewData: { items: [{ text: '"A short quoted passage goes here."', italic: true, isQuote: true }] },
      },
    ],
    quiz: [
      { q: "How do you make text bold and italic at the same time?", a: "`\\textbf{\\textit{text}}`", hint: "Nest one inside the other." },
      { q: "Why do size commands like `\\large` go inside `{ }`?", a: "They're switches affecting everything after them — braces scope the effect.", hint: "They don't take an argument." },
    ],
  },

  // ── MATH ─────────────────────────────────────────────────────────
  {
    id: "math",
    label: "Math",
    intro:
      "Inline math sits between $ ... $. Display math gets its own centered line between \\[ ... \\]. Inside math mode, spaces are ignored and letters become italic variables automatically. Load amsmath for align, matrix, and cases environments.",
    rules: [
      "Inline: `$ ... $`. Display (its own line): `\\[ ... \\]`.",
      "Load `amsmath` for `align`, `pmatrix`, `cases`, and better spacing.",
      "In `align`, `&` is the alignment column and `\\\\` ends a line — both required.",
      "Subscript `_` and superscript `^` only work inside math mode.",
    ],
    snippets: [
      {
        title: "Inline math",
        note: "Math embedded in a sentence — stays on the same line as the surrounding text.",
        code: `The area of a circle is $A = \\pi r^2$.`,
        previewType: "math-inline",
        previewTex: "A = \\pi r^2",
      },
      {
        title: "Display math",
        note: "Math on its own centered line — for equations that deserve their own space.",
        code: `\\[\n  E = mc^2\n\\]`,
        previewType: "math",
        previewTex: "E = mc^2",
      },
      {
        title: "Fractions & roots",
        code: `\\frac{a}{b} \\qquad \\sqrt{x} \\qquad \\sqrt[n]{x}`,
        previewType: "math",
        previewTex: "\\frac{a}{b} \\qquad \\sqrt{x} \\qquad \\sqrt[n]{x}",
      },
      {
        title: "Sum, product, integral",
        code: `\\sum_{i=1}^{n} i \\qquad \\prod_{i=1}^{n} i \\qquad \\int_{0}^{1} x^2 \\, dx`,
        previewType: "math",
        previewTex: "\\sum_{i=1}^{n} i \\qquad \\prod_{i=1}^{n} i \\qquad \\int_{0}^{1} x^2 \\, dx",
      },
      {
        title: "Aligned equations",
        note: "Requires amsmath. & marks where lines align (usually at the = sign).",
        code: `\\begin{align}\n  f(x) &= (x+1)^2 \\\\\n       &= x^2 + 2x + 1\n\\end{align}`,
        previewType: "math",
        previewTex: "\\begin{aligned} f(x) &= (x+1)^2 \\\\ &= x^2 + 2x + 1 \\end{aligned}",
      },
      {
        title: "Matrix",
        code: `\\begin{pmatrix}\n  a & b \\\\\n  c & d\n\\end{pmatrix}`,
        previewType: "math",
        previewTex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
      },
      {
        title: "Piecewise function (cases)",
        code: `f(x) =\n\\begin{cases}\n  1 & x \\geq 0 \\\\\n  -1 & x < 0\n\\end{cases}`,
        previewType: "math",
        previewTex: "f(x) = \\begin{cases} 1 & x \\geq 0 \\\\ -1 & x < 0 \\end{cases}",
      },
      {
        title: "Limits, derivatives",
        code: `\\lim_{x \\to 0} \\frac{\\sin x}{x} \\qquad \\frac{d}{dx}\\left(x^n\\right) = nx^{n-1}`,
        previewType: "math",
        previewTex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} \\qquad \\frac{d}{dx}\\left(x^n\\right) = nx^{n-1}",
      },
    ],
    quiz: [
      { q: "What's the difference between `$ ... $` and `\\[ ... \\]`?", a: "`$...$` is inline math; `\\[...\\]` is display math on its own centered line.", hint: "One stays in the sentence, one breaks out." },
      { q: "What package unlocks `align`, `pmatrix`, and `cases`?", a: "`amsmath`", hint: "The standard math extension." },
      { q: "In `align`, what do `&` and `\\\\` do?", a: "`&` marks the alignment column; `\\\\` ends the current row.", hint: "One is horizontal, one vertical." },
    ],
  },

  // ── LISTS ────────────────────────────────────────────────────────
  {
    id: "lists",
    label: "Lists",
    intro:
      "Three list environments, one command: \\item starts every entry regardless of the list type. The environment name is what changes: itemize for bullets, enumerate for numbers, description for labeled terms.",
    rules: [
      "`\\item` starts every entry — the same command in every list type.",
      "`itemize` = bullets, `enumerate` = numbers, `description` = labeled terms.",
      "Nest any list inside another `\\item` — LaTeX adjusts the indent automatically.",
      "In `description`, the label goes in square brackets: `\\item[Term]`.",
    ],
    snippets: [
      {
        title: "Bulleted list",
        code: `\\begin{itemize}\n  \\item First point\n  \\item Second point\n  \\item Third point\n\\end{itemize}`,
        previewType: "ul",
        previewData: { items: ["First point", "Second point", "Third point"] },
      },
      {
        title: "Numbered list",
        code: `\\begin{enumerate}\n  \\item First step\n  \\item Second step\n  \\item Third step\n\\end{enumerate}`,
        previewType: "ol",
        previewData: { items: ["First step", "Second step", "Third step"] },
      },
      {
        title: "Description list",
        code: `\\begin{description}\n  \\item[Term] Definition of the term.\n  \\item[Another] Its definition.\n\\end{description}`,
        previewType: "dl",
        previewData: {
          items: [
            { term: "Term", def: "Definition of the term." },
            { term: "Another", def: "Its definition." },
          ],
        },
      },
    ],
    quiz: [
      { q: "What single command starts every list entry?", a: "`\\item`", hint: "Same in all three list types." },
      { q: "Which environment gives bullets? Which gives numbers?", a: "`itemize` for bullets, `enumerate` for numbers.", hint: "One implies items, the other counting." },
    ],
  },

  // ── TABLES ──────────────────────────────────────────────────────
  {
    id: "tables",
    label: "Tables",
    intro:
      "The tabular environment takes a column spec (l/c/r for left, center, right). Cells are separated by & and rows end with \\\\. \\hline draws a horizontal rule wherever you put it.",
    rules: [
      "Column spec letters match columns in order: `{l c r}` = left, center, right.",
      "`&` separates cells; `\\\\` ends the row — both required on every data row.",
      "`\\hline` draws a horizontal line — put it before the first row, after the header, after the last row.",
      "Wrap in a `table` float to get a numbered caption and a `\\label` you can `\\ref`.",
    ],
    snippets: [
      {
        title: "Basic table",
        note: "Three columns (left / center / right), ruled header and footer.",
        code: `\\begin{tabular}{l c r}\n  \\hline\n  Left & Center & Right \\\\\n  \\hline\n  A & B & C \\\\\n  D & E & F \\\\\n  \\hline\n\\end{tabular}`,
        previewType: "table",
        previewData: {
          columns: ["l", "c", "r"],
          rows: [
            { cells: ["Left", "Center", "Right"], isHeader: true },
            { cells: ["A", "B", "C"] },
            { cells: ["D", "E", "F"] },
          ],
        },
      },
      {
        title: "Floating table with caption",
        note: "Wrap in `table` to get a caption and label. The [h] placement hint asks LaTeX to put it 'here'.",
        code: `\\begin{table}[h]\n  \\centering\n  \\begin{tabular}{l c}\n    \\hline\n    Item & Price \\\\\n    \\hline\n    Widget & \\$5.00 \\\\\n    Gadget & \\$12.50 \\\\\n    \\hline\n  \\end{tabular}\n  \\caption{Sample price list.}\n  \\label{tab:prices}\n\\end{table}`,
        previewType: "table",
        previewData: {
          columns: ["l", "c"],
          rows: [
            { cells: ["Item", "Price"], isHeader: true },
            { cells: ["Widget", "$5.00"] },
            { cells: ["Gadget", "$12.50"] },
          ],
          caption: "Sample price list.",
        },
      },
    ],
    quiz: [
      { q: "In `{l c r}`, what does each letter control?", a: "The alignment of that column — left, center, or right.", hint: "Three columns, three letters." },
      { q: "What separates cells, and what ends a row?", a: "`&` separates cells; `\\\\` ends the row.", hint: "Same as in `align` for math." },
      { q: "Why wrap `tabular` in a `table` environment?", a: "To get a numbered caption, a label, and automatic float placement.", hint: "`tabular` alone has no caption or number." },
    ],
  },

  // ── FIGURES ─────────────────────────────────────────────────────
  {
    id: "figures",
    label: "Figures",
    intro:
      "Images need the graphicx package. \\includegraphics pulls in the file. Wrap it in a figure float to get a numbered caption and a label you can cross-reference anywhere in the document.",
    rules: [
      "Load `graphicx` in the preamble before using `\\includegraphics`.",
      "Always set a width: `\\includegraphics[width=0.7\\textwidth]{file}` — otherwise images overflow.",
      "`\\label` goes after `\\caption` — the label captures the figure number, which caption sets.",
      "Reference any figure with `\\ref{label}` — LaTeX fills in the correct number at compile time.",
    ],
    snippets: [
      {
        title: "Insert an image",
        note: "The figure float handles placement and numbering. 0.7\\textwidth keeps it proportional to the page.",
        code: `\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.7\\textwidth]{filename.png}\n  \\caption{A short caption.}\n  \\label{fig:my-figure}\n\\end{figure}`,
        previewType: "figure",
        previewData: { caption: "A short caption.", label: "fig:my-figure" },
      },
      {
        title: "Cross-reference a figure",
        note: "\\ref{} inserts the figure number. The ~ keeps the word and number on the same line.",
        code: `As shown in Figure~\\ref{fig:my-figure}, the result is clear.`,
        previewType: "crossref",
        previewData: { text: "As shown in Figure 1, the result is clear." },
      },
    ],
    quiz: [
      { q: "Which package must be loaded before `\\includegraphics` works?", a: "`graphicx`", hint: "Same package for any embedded image." },
      { q: "Why should `\\label` come after `\\caption`?", a: "The label captures the current figure number, which caption sets — order matters.", hint: "Label reads what caption wrote." },
    ],
  },

  // ── REFERENCES ──────────────────────────────────────────────────
  {
    id: "refs",
    label: "References & citations",
    intro:
      "Citations come from a .bib file. \\cite{key} inserts an in-text reference. \\bibliography{file} renders the full list. You need a BibTeX compile pass for citations to resolve — one LaTeX compile isn't enough.",
    rules: [
      "`\\cite{key}` inserts a citation — key must match an entry in your `.bib` file exactly.",
      "`\\bibliographystyle{plain}` sets the format; `\\bibliography{file}` renders the list (no `.bib` extension).",
      "Citations show as `??` until you run BibTeX and recompile — this is normal, not a bug.",
      "`\\href{url}{text}` needs the `hyperref` package, loaded last in the preamble.",
    ],
    snippets: [
      {
        title: "Cite a source",
        note: "The key inside \\cite{} must match a BibTeX entry key.",
        code: `This was shown previously \\cite{smith2020}.`,
        previewType: "cite",
      },
      {
        title: "Bibliography list",
        note: "Goes at the end of the document. BibTeX formats the entries according to the style.",
        code: `\\bibliographystyle{plain}\n\\bibliography{references}`,
        previewType: "biblist",
        previewData: {
          items: [
            "A. Smith. A famous paper. Journal of Things, 2020.",
            "B. Jones. Another result. Proceedings, 2021.",
          ],
        },
      },
      {
        title: "Hyperlink",
        note: "Requires hyperref package.",
        code: `\\href{https://example.com}{link text}`,
        previewType: "link",
      },
    ],
    quiz: [
      { q: "What must the argument to `\\cite{}` match?", a: "A citation key defined in your `.bib` file.", hint: "It's a lookup, not free text." },
      { q: "Why do citations show as `??` after first compile?", a: "BibTeX needs a separate pass to resolve them — recompile after running BibTeX.", hint: "One compile pass isn't enough." },
    ],
  },

  // ── PAGE LAYOUT ─────────────────────────────────────────────────
  {
    id: "layout",
    label: "Page layout",
    intro:
      "Margins, spacing, and breaks are controlled by a few focused commands. The geometry package handles margins cleanly. Manual spacing commands (\\vspace, \\hspace) should be used sparingly — LaTeX's automatic layout is usually better.",
    rules: [
      "`\\usepackage[margin=1in]{geometry}` is the right way to set margins — not manual `\\textwidth` edits.",
      "`\\clearpage` does everything `\\newpage` does, plus flushes all pending floats first.",
      "`\\noindent` removes the indent from one paragraph. `\\parindent` and `\\parskip` set it globally.",
      "`\\vspace{}` and `\\hspace{}` add manual space — use sparingly.",
    ],
    snippets: [
      {
        title: "Set margins",
        note: "The geometry package is the standard way. The margin option sets all four sides.",
        code: `\\usepackage[margin=1in]{geometry}`,
        previewType: "layout-margins",
      },
      {
        title: "Page break",
        note: "\\clearpage is usually better than \\newpage — it also places any waiting figures before breaking.",
        code: `\\newpage\n% or\n\\clearpage`,
        previewType: "layout-pagebreak",
      },
      {
        title: "Paragraph spacing instead of indents",
        note: "A common style: no first-line indent, blank space between paragraphs instead.",
        code: `\\setlength{\\parindent}{0pt}\n\\setlength{\\parskip}{1em}`,
        previewType: "layout-parspacing",
      },
    ],
    quiz: [
      { q: "What's the standard package for setting page margins?", a: "`geometry` — e.g., `\\usepackage[margin=1in]{geometry}`", hint: "Not manual `\\textwidth` edits." },
      { q: "What's the difference between `\\newpage` and `\\clearpage`?", a: "`\\clearpage` also flushes pending figures/tables before breaking.", hint: "One is a superset of the other." },
    ],
  },

  // ── TIKZ ────────────────────────────────────────────────────────
  {
    id: "tikz",
    label: "TikZ basics",
    intro:
      "TikZ is LaTeX's drawing language. Everything lives inside a tikzpicture environment. Coordinates are (x,y) pairs. -- draws a straight line segment between two points.",
    rules: [
      "Load `\\usepackage{tikz}` in the preamble before any `tikzpicture`.",
      "Coordinates are `(x,y)` — `(0,0)` is the origin, units default to centimeters.",
      "`\\draw` outlines; `\\fill` fills; `\\filldraw` does both.",
      "`\\node (name) at (x,y) {label}` places a labeled point other commands can reference by name.",
    ],
    snippets: [
      {
        title: "A straight line",
        note: "The simplest TikZ drawing. -- connects two coordinates with a straight line segment.",
        code: `\\begin{tikzpicture}\n  \\draw (0,0) -- (2,2);\n\\end{tikzpicture}`,
        previewType: "tikz-line",
      },
      {
        title: "Rectangle and circle",
        note: "rectangle takes two corner coordinates. circle takes a center and radius.",
        code: `\\begin{tikzpicture}\n  \\draw (0,0) rectangle (2,1);\n  \\draw (3,0.5) circle (0.5);\n\\end{tikzpicture}`,
        previewType: "tikz-shapes",
      },
      {
        title: "Arrow between named nodes",
        note: "Named nodes let you draw connections without calculating exact coordinates.",
        code: `\\begin{tikzpicture}\n  \\node (a) at (0,0) {A};\n  \\node (b) at (2,0) {B};\n  \\draw[->] (a) -- (b);\n\\end{tikzpicture}`,
        previewType: "tikz-arrow",
      },
    ],
    quiz: [
      { q: "What environment does every TikZ drawing live inside?", a: "`tikzpicture`", hint: "It's the drawing canvas." },
      { q: "What syntax draws a straight line between two points?", a: "`\\draw (x1,y1) -- (x2,y2);`", hint: "Two dashes connect the points." },
      { q: "What's the difference between `\\draw` and `\\fill`?", a: "`\\draw` outlines a path; `\\fill` fills the interior with color.", hint: "Outline vs. solid." },
    ],
  },

  // ── SYMBOLS ─────────────────────────────────────────────────────
  {
    id: "symbols",
    label: "Common symbols",
    intro:
      "Greek letters, relations, operators, and arrows — these only work inside math mode. The command's capitalisation matches the letter: \\alpha gives α, \\Alpha doesn't exist, \\Gamma gives Γ.",
    rules: [
      "Greek letters are commands in math mode: `\\alpha`, `\\beta`, `\\gamma` …",
      "Capitalise the command for the capital letter where one exists: `\\Gamma` vs `\\gamma`.",
      "These only work inside `$...$` or `\\[...\\]` — they do nothing in text mode.",
      "Special text characters `# $ % & _ { } ~ ^ \\` need escaping: `\\$`, `\\&`, etc.",
    ],
    snippets: [
      {
        title: "Lowercase Greek letters",
        code: `\\alpha \\beta \\gamma \\delta \\epsilon \\theta \\lambda \\mu \\pi \\sigma \\phi \\omega`,
        previewType: "math",
        previewTex: "\\alpha \\; \\beta \\; \\gamma \\; \\delta \\; \\epsilon \\; \\theta \\; \\lambda \\; \\mu \\; \\pi \\; \\sigma \\; \\phi \\; \\omega",
      },
      {
        title: "Uppercase Greek letters",
        code: `\\Gamma \\Delta \\Theta \\Lambda \\Pi \\Sigma \\Phi \\Omega`,
        previewType: "math",
        previewTex: "\\Gamma \\; \\Delta \\; \\Theta \\; \\Lambda \\; \\Pi \\; \\Sigma \\; \\Phi \\; \\Omega",
      },
      {
        title: "Relations & operators",
        code: `\\leq \\geq \\neq \\approx \\equiv \\times \\div \\cdot \\pm \\infty`,
        previewType: "math",
        previewTex: "\\leq \\; \\geq \\; \\neq \\; \\approx \\; \\equiv \\; \\times \\; \\div \\; \\cdot \\; \\pm \\; \\infty",
      },
      {
        title: "Arrows",
        code: `\\rightarrow \\Rightarrow \\leftarrow \\Leftarrow \\leftrightarrow \\Leftrightarrow`,
        previewType: "math",
        previewTex: "\\rightarrow \\; \\Rightarrow \\; \\leftarrow \\; \\Leftarrow \\; \\leftrightarrow \\; \\Leftrightarrow",
      },
      {
        title: "Set notation",
        code: `\\in \\notin \\subset \\subseteq \\cup \\cap \\emptyset \\forall \\exists`,
        previewType: "math",
        previewTex: "\\in \\; \\notin \\; \\subset \\; \\subseteq \\; \\cup \\; \\cap \\; \\emptyset \\; \\forall \\; \\exists",
      },
    ],
    quiz: [
      { q: "How do you get Δ (uppercase Delta) vs δ (lowercase)?", a: "`\\Delta` for uppercase, `\\delta` for lowercase.", hint: "The command's capitalisation matches the letter." },
      { q: "Why does `\\alpha` do nothing outside `$...$`?", a: "Symbol commands are math-mode only — they need to be inside math mode.", hint: "Same rule as `\\frac` or `\\sum`." },
    ],
  },

  // ── TROUBLESHOOTING ──────────────────────────────────────────────
  {
    id: "troubleshooting",
    label: "Common errors",
    intro:
      "Most LaTeX errors are one of four things: misspelled command, math character used outside math mode, unclosed brace, or a citation/reference that needs another compile pass.",
    rules: [
      '"Undefined control sequence" → misspelled command, or its package was never loaded.',
      '"Missing $ inserted" → a math character (`^`, `_`, or a math command) used outside math mode.',
      '"Runaway argument" → an opening `{` was never matched by a closing `}`.',
      '"??" in the PDF → `\\ref` or `\\cite` hasn\'t resolved yet — recompile.',
    ],
    snippets: [
      {
        title: "Escaping special characters",
        note: "These 10 characters are reserved. Prefix with \\ to print them literally.",
        code: `\\# \\$ \\% \\& \\_ \\{ \\} \\~{} \\^{} \\textbackslash{}`,
        previewType: "escape",
      },
      {
        title: 'Fixing "Missing $ inserted"',
        note: "The subscript x_1 is math — it needs to be inside $...$.",
        code: `% Wrong:\nx_1 is the first term.\n\n% Correct:\n$x_1$ is the first term.`,
        previewType: "error-fix",
        previewData: {
          wrong: "x_1 is the first term.",
          correct: "$x_1$ is the first term.",
          note: "Subscripts and superscripts only work inside math mode.",
        },
      },
    ],
    quiz: [
      { q: "You see \"Undefined control sequence\" — two most likely causes?", a: "Misspelled command name, or the package that defines it was never loaded.", hint: "Typo or missing package." },
      { q: "What triggers \"Missing $ inserted\"?", a: "A math-only character (`^`, `_`) or command used outside math mode.", hint: "Wrap it in `$...$`." },
      { q: "What causes \"Runaway argument\"?", a: "An opening `{` was never closed — LaTeX kept reading looking for the matching `}`.", hint: "Check for unmatched braces." },
    ],
  },
];

export const CUSTOM_CATEGORY_ID = "custom";
export const SANDBOX_ID = "sandbox";

// ===================================================================
// STORAGE
// ===================================================================
function createLocalStorageAdapter() {
  const ok = typeof window !== "undefined" && !!window.localStorage;
  return {
    async get(key) { try { return ok ? localStorage.getItem(key) : null; } catch { return null; } },
    async set(key, value) { try { if (ok) localStorage.setItem(key, value); return ok; } catch { return false; } },
  };
}
function safeParseArray(raw) { try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; } }
function safeParseObject(raw) { try { const p = JSON.parse(raw); return p && typeof p === "object" && !Array.isArray(p) ? p : {}; } catch { return {}; } }
function generateId() { return "oc-lfn-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }

// ===================================================================
// FSRS HELPERS
// ===================================================================
function serializeCard(card) {
  return { ...card, due: card.due instanceof Date ? card.due.toISOString() : card.due, last_review: card.last_review instanceof Date ? card.last_review.toISOString() : (card.last_review || null) };
}
function deserializeCard(raw) {
  if (!raw) return null;
  try { return { ...raw, due: new Date(raw.due), last_review: raw.last_review ? new Date(raw.last_review) : undefined }; }
  catch { return null; }
}
function getCard(cardsMap, id) { return deserializeCard(cardsMap[id]) || createEmptyCard(); }
function isDue(card, now) { return card.due.getTime() <= now.getTime(); }
function flattenQuiz(categories) {
  const items = [];
  categories.forEach((cat) => { (cat.quiz || []).forEach((item, idx) => { items.push({ id: cat.id + "-" + idx, categoryId: cat.id, categoryLabel: cat.label, prompt: item.q, answer: item.a, hint: item.hint }); }); });
  return items;
}
function poolForScope(all, scope) { return scope === "all" ? all : all.filter((i) => i.categoryId === scope); }
function pickDueItem(all, cards, scope, excludeId, now) {
  const due = poolForScope(all, scope).filter((i) => isDue(getCard(cards, i.id), now));
  let c = due.filter((i) => !excludeId || i.id !== excludeId);
  if (!c.length) c = due;
  if (!c.length) return null;
  c.sort((a, b) => getCard(cards, a.id).due - getCard(cards, b.id).due);
  return c[0];
}
function pickAnyItem(all, scope, excludeId) {
  const pool = poolForScope(all, scope).filter((i) => !excludeId || i.id !== excludeId);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
function nextDueDate(all, cards, scope) {
  const pool = poolForScope(all, scope);
  if (!pool.length) return null;
  return new Date(Math.min(...pool.map((i) => getCard(cards, i.id).due.getTime())));
}
function masteryCounts(all, cards, scope) {
  const pool = poolForScope(all, scope);
  return { mastered: pool.filter((i) => getCard(cards, i.id).state === State.Review).length, total: pool.length };
}
function humanizeInterval(from, to) {
  const ms = Math.max(0, to - from);
  const mins = ms / 60000;
  if (mins < 1) return "<1m";
  if (mins < 60) return Math.round(mins) + "m";
  const h = mins / 60;
  if (h < 24) return Math.round(h) + "h";
  const d = h / 24;
  if (d < 30) return Math.round(d) + "d";
  if (d < 365) return Math.round(d / 30) + "mo";
  return Math.round(d / 365) + "y";
}

// ===================================================================
// SMALL UI HELPERS
// ===================================================================
function InlineText({ text }) {
  if (!text) return null;
  const parts = String(text).split(/`([^`]+)`/g);
  return <>{parts.map((p, i) => i % 2 === 1 ? <code className="lfn-inline-code" key={i}>{p}</code> : <React.Fragment key={i}>{p}</React.Fragment>)}</>;
}

function CopyButton({ code }) {
  const [status, setStatus] = useState("idle");
  const t = useRef(null);
  const copy = useCallback(async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(code); ok = true; } catch {}
    if (!ok) { try { const ta = document.createElement("textarea"); ta.value = code; document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy"); document.body.removeChild(ta); } catch {} }
    setStatus(ok ? "copied" : "failed");
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setStatus("idle"), 1300);
  }, [code]);
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);
  return (
    <button type="button" className={"lfn-copy-btn" + (status === "copied" ? " is-copied" : status === "failed" ? " is-failed" : "")} onClick={copy}>
      {status === "copied" ? "Copied!" : status === "failed" ? "Failed" : "Copy"}
    </button>
  );
}

/** Split-pane snippet card: code left, rendered result right */
function SnippetCard({ snippet, onDelete }) {
  const hasPreview = !!snippet.previewType;
  return (
    <div className="lfn-snippet">
      <div className="lfn-snippet-head">
        <div className="lfn-snippet-title">{snippet.title}</div>
        <CopyButton code={snippet.code} />
      </div>
      {snippet.note && <div className="lfn-snippet-note">{snippet.note}</div>}
      <div className={hasPreview ? "lfn-snippet-body lfn-split" : "lfn-snippet-body"}>
        <div className="lfn-snippet-code-col">
          <div className="lfn-col-label">LaTeX source</div>
          <pre className="lfn-pre"><code>{snippet.code}</code></pre>
        </div>
        {hasPreview && (
          <div className="lfn-snippet-result-col">
            <div className="lfn-col-label">Result</div>
            <div className="lfn-result-pane">
              <PreviewOutput snippet={snippet} />
            </div>
          </div>
        )}
      </div>
      {onDelete && (
        <button type="button" className="lfn-del-btn" onClick={onDelete}>Remove</button>
      )}
    </div>
  );
}

function RulesBox({ rules }) {
  if (!rules || !rules.length) return null;
  return (
    <div className="lfn-rules-box">
      <h3 className="lfn-rules-heading">Rules to remember</h3>
      <ul className="lfn-rules-list">{rules.map((r, i) => <li key={i}><InlineText text={r} /></li>)}</ul>
    </div>
  );
}

function AddSnippetForm({ categories, defaultCategoryId, onAdd, storageOk }) {
  const [catId, setCatId] = useState(defaultCategoryId);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [isMath, setIsMath] = useState(false);
  const [errors, setErrors] = useState({});
  useEffect(() => setCatId(defaultCategoryId), [defaultCategoryId]);

  const save = () => {
    const e = {};
    if (!title.trim()) e.title = true;
    if (!code.trim()) e.code = true;
    setErrors(e);
    if (Object.keys(e).length) return;
    const cat = categories.find((c) => c.id === catId);
    onAdd({ id: generateId(), categoryId: catId, categoryLabel: cat?.label || catId, title: title.trim(), note: note.trim(), code, previewType: isMath ? "math" : undefined, previewTex: isMath ? code : undefined });
    setTitle(""); setNote(""); setCode(""); setIsMath(false); setErrors({});
  };

  return (
    <div className="lfn-add-form">
      <h3>Add a snippet</h3>
      <label>Category</label>
      <select value={catId} onChange={(e) => setCatId(e.target.value)}>
        {categories.filter((c) => c.id !== CUSTOM_CATEGORY_ID && c.id !== SANDBOX_ID).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
      <label>Title</label>
      <input type="text" value={title} placeholder="e.g. Two-column figure" onChange={(e) => setTitle(e.target.value)} style={errors.title ? { borderColor: "var(--lfn-accent)" } : undefined} />
      <label>Note (optional)</label>
      <input type="text" value={note} placeholder="A short reminder of what this does" onChange={(e) => setNote(e.target.value)} />
      <label>LaTeX code</label>
      <textarea value={code} placeholder={"\\begin{...}\n  ...\n\\end{...}"} onChange={(e) => setCode(e.target.value)} style={errors.code ? { borderColor: "var(--lfn-accent)" } : undefined} />
      <label className="lfn-checkbox-label">
        <input type="checkbox" checked={isMath} onChange={(e) => setIsMath(e.target.checked)} />
        This is standalone math — show a live KaTeX preview
      </label>
      <button type="button" className="lfn-save-btn" onClick={save}>Save snippet</button>
      {!storageOk && <p className="lfn-snippet-note" style={{ color: "var(--lfn-amber)" }}>Storage unavailable — snippets may not persist.</p>}
    </div>
  );
}

// ===================================================================
// QUIZ CARD (FSRS)
// ===================================================================
function QuizCard({ item, card, scheduler, onResult }) {
  const [shown, setShown] = useState(false);
  const [hint, setHint] = useState(false);
  const now = useMemo(() => new Date(), [item?.id]);
  useEffect(() => { setShown(false); setHint(false); }, [item?.id]);
  const preview = useMemo(() => { try { return item && card ? scheduler.repeat(card, now) : null; } catch { return null; } }, [item, card, now, scheduler]);

  if (!item) return <p className="lfn-practice-empty">No quiz cards in this set yet.</p>;

  const ratings = [
    { rating: Rating.Again, label: "Again", cls: "lfn-rate-again" },
    { rating: Rating.Hard,  label: "Hard",  cls: "lfn-rate-hard"  },
    { rating: Rating.Good,  label: "Good",  cls: "lfn-rate-good"  },
    { rating: Rating.Easy,  label: "Easy",  cls: "lfn-rate-easy"  },
  ];

  return (
    <div className="lfn-quiz-card">
      <div>
        <div className="lfn-quiz-topic-tag">{item.categoryLabel}</div>
        <div className="lfn-quiz-prompt"><InlineText text={item.prompt} /></div>
        {item.hint && !shown && (
          <>
            <button type="button" className="lfn-hint-toggle" onClick={() => setHint((v) => !v)}>{hint ? "Hide hint" : "Show hint"}</button>
            {hint && <div className="lfn-hint-text"><InlineText text={item.hint} /></div>}
          </>
        )}
        {shown && <div className="lfn-quiz-answer"><InlineText text={item.answer} /></div>}
      </div>
      <div className="lfn-quiz-controls">
        {!shown ? (
          <button type="button" className="lfn-show-btn" onClick={() => setShown(true)}>Show answer</button>
        ) : ratings.map(({ rating, label, cls }) => {
          const rc = preview?.[rating]?.card;
          const interval = rc ? humanizeInterval(now, rc.due) : "";
          return (
            <button key={label} type="button" className={cls} onClick={() => rc && onResult(rating, rc)} disabled={!rc}>
              {label}{interval && <span className="lfn-rate-interval">{interval}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ===================================================================
// LIVE MATH SANDBOX
// ===================================================================
const QUICK_INSERT = [
  { label: "\\frac", insert: "\\frac{a}{b}" },
  { label: "\\sqrt", insert: "\\sqrt{x}" },
  { label: "\\sum",  insert: "\\sum_{i=1}^{n} i" },
  { label: "\\int",  insert: "\\int_{0}^{1} x\\,dx" },
  { label: "\\lim",  insert: "\\lim_{x \\to 0} f(x)" },
  { label: "\\vec",  insert: "\\vec{v}" },
  { label: "\\hat",  insert: "\\hat{u}" },
  { label: "\\infty",insert: "\\infty" },
  { label: "\\alpha",insert: "\\alpha" },
  { label: "\\beta", insert: "\\beta" },
  { label: "\\pi",   insert: "\\pi" },
  { label: "\\in",   insert: "\\in" },
  { label: "matrix", insert: "\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}" },
  { label: "cases",  insert: "\\begin{cases}\n1 & x \\geq 0 \\\\\n-1 & x < 0\n\\end{cases}" },
  { label: "align",  insert: "f(x) &= (x+1)^2 \\\\\n     &= x^2 + 2x + 1" },
];

function Sandbox({ isDark }) {
  const [source, setSource] = useState("\\frac{d}{dx}\\left(x^n\\right) = nx^{n-1}");
  const [display, setDisplay] = useState(true);
  const editorRef = useRef(null);

  const rendered = useMemo(() => {
    if (!source.trim()) return null;
    try {
      return katex.renderToString(source, { displayMode: display, throwOnError: false, strict: false });
    } catch (e) {
      return null;
    }
  }, [source, display]);

  const insertSnippet = (text) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      editor.executeEdits("", [{ range: selection, text, forceMoveMarkers: true }]);
      editor.focus();
    } else {
      setSource((s) => s + (s.endsWith(" ") ? "" : " ") + text);
    }
  };

  return (
    <div className="lfn-sandbox">
      <div className="lfn-sandbox-header">
        <div className="lfn-sandbox-title">Live Math Sandbox</div>
        <div className="lfn-sandbox-desc">Type any LaTeX math expression and see it render instantly. Experiment freely — nothing is saved.</div>
        <div className="lfn-sandbox-mode">
          <label className="lfn-mode-btn">
            <input type="radio" name="sandbox-mode" checked={!display} onChange={() => setDisplay(false)} />
            Inline mode <code>$ ... $</code>
          </label>
          <label className="lfn-mode-btn">
            <input type="radio" name="sandbox-mode" checked={display} onChange={() => setDisplay(true)} />
            Display mode <code>\[ ... \]</code>
          </label>
        </div>
      </div>

      <div className="lfn-quickinsert">
        {QUICK_INSERT.map((q) => (
          <button key={q.label} type="button" className="lfn-qi-btn" onClick={() => insertSnippet(q.insert)}>
            {q.label}
          </button>
        ))}
      </div>

      <div className="lfn-sandbox-body">
        <div className="lfn-sandbox-editor-col">
          <div className="lfn-col-label">Type LaTeX math here</div>
          <Suspense fallback={<textarea className="lfn-sandbox-fallback" value={source} onChange={(e) => setSource(e.target.value)} spellCheck={false} />}>
            <MonacoEditor
              height="260px"
              defaultLanguage="latex"
              theme={isDark ? "vs-dark" : "light"}
              value={source}
              onChange={(v) => setSource(v || "")}
              onMount={(editor) => { editorRef.current = editor; }}
              options={{
                minimap: { enabled: false },
                fontSize: 15,
                lineNumbers: "off",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                overviewRulerLanes: 0,
                folding: false,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          </Suspense>
        </div>

        <div className="lfn-sandbox-preview-col">
          <div className="lfn-col-label">Rendered result</div>
          <div className="lfn-sandbox-output">
            {rendered ? (
              <span dangerouslySetInnerHTML={{ __html: rendered }} />
            ) : (
              <span className="lfn-sandbox-placeholder">Start typing to see the output…</span>
            )}
          </div>
          {display && (
            <div className="lfn-sandbox-mode-hint">
              Displayed as: <code>\[ {source} \]</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// ERROR BOUNDARY
// ===================================================================
class LfnErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e, info) { console.error("LatexFieldNotes:", e, info); }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 24, color: "#94a3b8", border: "1px solid #1e1e2e", fontFamily: "system-ui" }}>
        Something went wrong in the LaTeX reference. Reloading usually fixes it — your snippets and practice progress are safe.
      </div>
    );
    return this.props.children;
  }
}

// ===================================================================
// MAIN COMPONENT
// ===================================================================
function LatexFieldNotesInner({ isDark = true, vars, storage, storageKeyPrefix, extraCategories, className, title, subtitle }) {
  const categories = useMemo(() => [...DEFAULT_CATEGORIES, ...(Array.isArray(extraCategories) ? extraCategories : [])], [extraCategories]);
  const allQuizItems = useMemo(() => flattenQuiz(categories), [categories]);
  const scheduler   = useMemo(() => fsrs(generatorParameters({ enable_fuzz: false })), []);
  const store       = useMemo(() => storage || createLocalStorageAdapter(), [storage]);
  const keyPfx      = storageKeyPrefix || "oc-lfn";

  const [ready, setReady] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [userSnippets, setUserSnippets] = useState([]);
  const [cardsMap, setCardsMap] = useState({});
  const [view, setView] = useState("lesson");          // 'lesson' | 'practice' | 'sandbox'
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || CUSTOM_CATEGORY_ID);
  const [practiceScope, setPracticeScope] = useState("all");
  const [currentQuizItem, setCurrentQuizItem] = useState(null);
  const [reviewAhead, setReviewAhead] = useState(false);

  // Load persisted data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawS, rawC] = await Promise.all([store.get(keyPfx + ":user-snippets"), store.get(keyPfx + ":fsrs-cards")]);
        if (!cancelled) { setUserSnippets(safeParseArray(rawS)); setCardsMap(safeParseObject(rawC)); }
      } catch { if (!cancelled) setStorageOk(false); }
      finally { if (!cancelled) setReady(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  const persistSnippets = useCallback(async (next) => {
    setUserSnippets(next);
    try { const ok = await store.set(keyPfx + ":user-snippets", JSON.stringify(next)); if (ok === false) setStorageOk(false); } catch { setStorageOk(false); }
  }, [store, keyPfx]);

  const persistCards = useCallback(async (next) => {
    setCardsMap(next);
    try { await store.set(keyPfx + ":fsrs-cards", JSON.stringify(next)); } catch {}
  }, [store, keyPfx]);

  const chooseNext = useCallback((scope, cards, excludeId, ahead) => {
    const now = new Date();
    const due = pickDueItem(allQuizItems, cards, scope, excludeId, now);
    if (due) return due;
    if (ahead) return pickAnyItem(allQuizItems, scope, excludeId);
    return null;
  }, [allQuizItems]);

  const enterPractice = useCallback((scope) => {
    setView("practice"); setPracticeScope(scope); setReviewAhead(false);
    setCurrentQuizItem(chooseNext(scope, cardsMap, null, false));
  }, [chooseNext, cardsMap]);

  const handleScopeChange = useCallback((scope) => {
    setPracticeScope(scope); setReviewAhead(false);
    setCurrentQuizItem(chooseNext(scope, cardsMap, null, false));
  }, [chooseNext, cardsMap]);

  const handleQuizResult = useCallback((rating, resultCard) => {
    if (!currentQuizItem) return;
    const next = { ...cardsMap, [currentQuizItem.id]: serializeCard(resultCard) };
    persistCards(next);
    setCurrentQuizItem(chooseNext(practiceScope, next, currentQuizItem.id, reviewAhead));
  }, [currentQuizItem, cardsMap, persistCards, chooseNext, practiceScope, reviewAhead]);

  const rootStyle = useMemo(() => ({ ...(isDark ? THEME.dark : THEME.light), ...(vars || {}) }), [isDark, vars]);
  const activeCat = activeCategory === CUSTOM_CATEGORY_ID ? null : categories.find((c) => c.id === activeCategory);
  const counts    = masteryCounts(allQuizItems, cardsMap, practiceScope);
  const upcomingDue = !currentQuizItem ? nextDueDate(allQuizItems, cardsMap, practiceScope) : null;

  const navCategories = useMemo(() => [
    { id: SANDBOX_ID, label: "⚡ Live Sandbox", isSandbox: true },
    ...categories.map((c) => ({ id: c.id, label: c.label })),
    { id: CUSTOM_CATEGORY_ID, label: "My snippets" },
  ], [categories]);

  return (
    <div className={"lfn-root" + (className ? " " + className : "")} style={rootStyle}>
      <style>{CSS_TEXT}</style>
      <div className="lfn-app">
        <header className="lfn-masthead">
          <div>
            <h1>{title || "LaTeX Field Notes"} <span className="lfn-rubric">— learn by seeing</span></h1>
            <p>{subtitle || "Every concept shows you the code AND the result, side by side. Use the sandbox to experiment with any math expression live."}</p>
          </div>
        </header>

        <nav className="lfn-sidebar">
          <button type="button" className={"lfn-practice-btn" + (view === "practice" ? " active" : "")} onClick={() => enterPractice(practiceScope)}>
            🧠 Practice mode
          </button>
          <div className="lfn-sidebar-label">Learn</div>
          {navCategories.map((cat) => (
            <button key={cat.id} type="button"
              className={"lfn-navlink" + ((view === "lesson" || view === "sandbox") && cat.id === activeCategory ? " active" : "") + (cat.isSandbox ? " lfn-navlink-sandbox" : "")}
              onClick={() => { setActiveCategory(cat.id); setView(cat.isSandbox ? "sandbox" : "lesson"); }}>
              {cat.label}
              {cat.id === CUSTOM_CATEGORY_ID && <span className="lfn-navcount">({userSnippets.length})</span>}
            </button>
          ))}
        </nav>

        <main className="lfn-main">
          {!ready ? (
            <p className="lfn-practice-empty">Loading…</p>
          ) : view === "sandbox" ? (
            <section className="lfn-category active">
              <Sandbox isDark={isDark} />
            </section>
          ) : view === "practice" ? (
            <section className="lfn-category active">
              <h2>Practice mode</h2>
              <p className="lfn-intro">Rate yourself honestly after each card. That rating schedules when the card next appears — from minutes to months — based on how well you actually know it.</p>
              <div className="lfn-practice-header">
                <select className="lfn-scope-select" value={practiceScope} onChange={(e) => handleScopeChange(e.target.value)}>
                  <option value="all">All topics</option>
                  {categories.filter((c) => c.quiz?.length).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className="lfn-progress-line">{counts.mastered} / {counts.total} cards graduated to long-term review</div>
              {currentQuizItem ? (
                <QuizCard item={currentQuizItem} card={getCard(cardsMap, currentQuizItem.id)} scheduler={scheduler} onResult={handleQuizResult} />
              ) : (
                <div className="lfn-quiz-card lfn-quiz-caughtup">
                  <div>
                    <div className="lfn-quiz-prompt">You're all caught up here.</div>
                    <p className="lfn-practice-empty">{upcomingDue ? `Next card due in ${humanizeInterval(Date.now(), upcomingDue)}.` : "No cards in this set."}</p>
                  </div>
                  {upcomingDue && (
                    <div className="lfn-quiz-controls">
                      <button type="button" className="lfn-show-btn" onClick={() => { setReviewAhead(true); setCurrentQuizItem(chooseNext(practiceScope, cardsMap, null, true)); }}>Review ahead</button>
                    </div>
                  )}
                </div>
              )}
            </section>
          ) : activeCategory === CUSTOM_CATEGORY_ID ? (
            <section className="lfn-category active">
              <h2>My snippets</h2>
              <p className="lfn-intro">Your saved snippets, grouped by topic.</p>
              {!userSnippets.length && <p className="lfn-empty-note">Nothing saved yet. Add your first snippet below.</p>}
              {Object.entries(userSnippets.reduce((acc, s) => { (acc[s.categoryLabel] = acc[s.categoryLabel] || []).push(s); return acc; }, {})).map(([label, snips]) => (
                <div key={label}><h3 className="lfn-subheading">{label}</h3>{snips.map((s) => <SnippetCard key={s.id} snippet={s} onDelete={() => persistSnippets(userSnippets.filter((x) => x.id !== s.id))} />)}</div>
              ))}
              <AddSnippetForm categories={categories} defaultCategoryId={categories[0]?.id || ""} onAdd={(s) => persistSnippets([...userSnippets, s])} storageOk={storageOk} />
            </section>
          ) : activeCat ? (
            <section className="lfn-category active">
              <h2>
                <span>{activeCat.label}</span>
                {activeCat.quiz?.length > 0 && (
                  <button type="button" className="lfn-practice-topic-link" onClick={() => enterPractice(activeCat.id)}>Practice this topic →</button>
                )}
              </h2>
              <p className="lfn-intro">{activeCat.intro}</p>
              <RulesBox rules={activeCat.rules} />
              {activeCat.snippets.map((s, i) => <SnippetCard key={activeCat.id + "-" + i} snippet={s} />)}
              {userSnippets.filter((s) => s.categoryId === activeCat.id).map((s) => (
                <SnippetCard key={s.id} snippet={s} onDelete={() => persistSnippets(userSnippets.filter((x) => x.id !== s.id))} />
              ))}
              <AddSnippetForm categories={categories} defaultCategoryId={activeCat.id} onAdd={(s) => persistSnippets([...userSnippets, s])} storageOk={storageOk} />
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default function LatexFieldNotes(props) {
  return <LfnErrorBoundary><LatexFieldNotesInner {...props} /></LfnErrorBoundary>;
}

// ===================================================================
// SCOPED CSS — all under .lfn-root, no leaking into the host app
// ===================================================================
const CSS_TEXT = `
.lfn-root { all: initial; }
.lfn-root *, .lfn-root *::before, .lfn-root *::after { box-sizing: border-box; }
.lfn-root {
  display: block; background: var(--lfn-paper); color: var(--lfn-ink);
  font-family: var(--lfn-font-sans); line-height: 1.6; font-size: 16px;
}
.lfn-root code, .lfn-root pre, .lfn-root .lfn-inline-code { font-family: var(--lfn-font-mono); }
.lfn-root select, .lfn-root input, .lfn-root textarea, .lfn-root button { font-family: var(--lfn-font-sans); }
.lfn-root button { cursor: pointer; }
.lfn-root :focus-visible { outline: 2px solid var(--lfn-blue); outline-offset: 2px; }

/* Layout */
.lfn-app { display: grid; grid-template-columns: var(--lfn-sidebar-width) 1fr; min-height: 100vh; }

/* Masthead */
.lfn-masthead {
  grid-column: 1 / -1; border-bottom: 2px solid var(--lfn-rule);
  padding: 20px 32px 16px; background: var(--lfn-paper-dim);
}
.lfn-masthead h1 { margin: 0; font-size: 1.6rem; font-weight: 700; font-family: var(--lfn-font-sans); }
.lfn-masthead h1 .lfn-rubric { color: var(--lfn-accent); font-style: italic; font-weight: 400; font-size: 1rem; }
.lfn-masthead p { margin: 4px 0 0; color: var(--lfn-ink-soft); font-size: 0.9rem; }

/* Sidebar */
.lfn-sidebar {
  border-right: 1px solid var(--lfn-rule); padding: 14px 0;
  position: sticky; top: 0; align-self: start; height: 100vh; overflow-y: auto;
  background: var(--lfn-paper-dim);
}
.lfn-sidebar-label { font-size: 0.66rem; letter-spacing: 0.07em; color: var(--lfn-ink-soft); padding: 12px 18px 4px; text-transform: uppercase; font-family: var(--lfn-font-mono); }
.lfn-practice-btn {
  display: block; width: calc(100% - 20px); margin: 0 10px 10px; text-align: left;
  background: var(--lfn-accent); color: #fff; border: none; border-radius: var(--lfn-radius);
  padding: 9px 13px; font-size: 0.82rem; font-weight: 700; transition: opacity 0.15s;
}
.lfn-practice-btn:hover, .lfn-practice-btn.active { opacity: 0.85; }
.lfn-navlink {
  display: block; width: 100%; text-align: left; background: none; border: none;
  border-left: 3px solid transparent; padding: 7px 18px; font-size: 0.9rem; color: var(--lfn-ink-soft);
  transition: background 0.1s, color 0.1s;
}
.lfn-navlink:hover { color: var(--lfn-ink); background: rgba(128,128,128,0.08); }
.lfn-navlink.active { color: var(--lfn-ink); border-left-color: var(--lfn-accent); background: rgba(128,128,128,0.1); font-weight: 600; }
.lfn-navlink-sandbox { color: var(--lfn-green) !important; }
.lfn-navlink-sandbox.active { border-left-color: var(--lfn-green) !important; }
.lfn-navcount { color: var(--lfn-ink-soft); font-size: 0.76rem; margin-left: 4px; }

/* Main content */
.lfn-main { padding: 28px 36px 80px; }
.lfn-category h2 {
  font-size: 1.35rem; margin: 0 0 6px; border-bottom: 1px solid var(--lfn-rule);
  padding-bottom: 10px; display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
}
.lfn-intro { color: var(--lfn-ink-soft); margin: 10px 0 20px; font-size: 0.93rem; max-width: 70ch; }
.lfn-subheading { font-size: 0.9rem; color: var(--lfn-ink-soft); margin: 18px 0 8px; }
.lfn-practice-topic-link {
  font-size: 0.72rem; background: none; border: 1px solid var(--lfn-rule); color: var(--lfn-ink-soft);
  padding: 3px 9px; border-radius: var(--lfn-radius); white-space: nowrap; transition: border-color 0.15s, color 0.15s;
}
.lfn-practice-topic-link:hover { border-color: var(--lfn-accent); color: var(--lfn-accent); }

/* Rules box */
.lfn-rules-box {
  border-left: 3px solid var(--lfn-blue); background: var(--lfn-blue-soft);
  padding: 11px 14px; margin-bottom: 22px; border-radius: var(--lfn-radius);
}
.lfn-rules-heading { margin: 0 0 7px; font-size: 0.76rem; color: var(--lfn-blue); font-weight: 700; font-family: var(--lfn-font-mono); text-transform: uppercase; letter-spacing: 0.05em; }
.lfn-rules-list { margin: 0; padding-left: 16px; }
.lfn-rules-list li { margin-bottom: 5px; font-size: 0.89rem; }
.lfn-inline-code { background: rgba(128,128,128,0.15); padding: 1px 5px; font-size: 0.83em; border-radius: 3px; }

/* ─── SNIPPET CARD ─────────────────────────────────────────── */
.lfn-snippet { margin-bottom: 20px; border: 1px solid var(--lfn-rule); background: var(--lfn-surface); border-radius: var(--lfn-radius); overflow: hidden; }
.lfn-snippet-head {
  display: flex; align-items: center; justify-content: space-between; padding: 8px 12px;
  border-bottom: 1px solid var(--lfn-rule); background: var(--lfn-paper-dim);
}
.lfn-snippet-title { font-weight: 600; font-size: 0.9rem; }
.lfn-snippet-note { font-size: 0.81rem; color: var(--lfn-ink-soft); padding: 6px 12px 0; }

/* Split layout: code | result */
.lfn-snippet-body { display: block; }
.lfn-snippet-body.lfn-split { display: grid; grid-template-columns: 1fr 1fr; min-height: 120px; }
.lfn-snippet-code-col { display: flex; flex-direction: column; border-right: 1px solid var(--lfn-rule); }
.lfn-snippet-result-col { display: flex; flex-direction: column; background: var(--lfn-result-bg); }
.lfn-col-label {
  font-size: 0.63rem; text-transform: uppercase; letter-spacing: 0.07em; color: var(--lfn-ink-soft);
  padding: 5px 12px 4px; border-bottom: 1px solid var(--lfn-rule); font-family: var(--lfn-font-mono);
  background: rgba(0,0,0,0.15);
}
.lfn-pre { margin: 0; padding: 12px; background: var(--lfn-code-bg); color: var(--lfn-code-text); font-size: 0.82rem; line-height: 1.55; overflow-x: auto; flex: 1; white-space: pre; }
.lfn-result-pane { padding: 14px 16px; flex: 1; display: flex; align-items: center; justify-content: center; color: var(--lfn-result-text); font-family: var(--lfn-font-serif); }

.lfn-copy-btn {
  font-family: var(--lfn-font-mono); font-size: 0.7rem; border: 1px solid var(--lfn-rule);
  background: var(--lfn-surface); color: var(--lfn-ink-soft); padding: 3px 9px;
  border-radius: var(--lfn-radius); transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.lfn-copy-btn:hover { background: var(--lfn-accent); border-color: var(--lfn-accent); color: #fff; }
.lfn-copy-btn.is-copied { background: var(--lfn-green); border-color: var(--lfn-green); color: #fff; }
.lfn-copy-btn.is-failed { border-color: var(--lfn-red); color: var(--lfn-red); }
.lfn-del-btn { font-size: 0.7rem; color: var(--lfn-accent); background: none; border: none; text-decoration: underline; padding: 6px 12px 8px; display: block; }
.lfn-empty-note { color: var(--lfn-ink-soft); font-style: italic; font-size: 0.88rem; }

/* ─── PREVIEW RENDERERS ─────────────────────────────────────── */
.lfn-result-math { font-size: 1.05em; text-align: center; width: 100%; overflow-x: auto; }

.lfn-result-formatting { display: flex; flex-direction: column; gap: 6px; width: 100%; font-size: 0.95em; }
.lfn-fmt-item { padding: 2px 0; }

.lfn-result-table-wrap { width: 100%; overflow-x: auto; font-size: 0.88em; }
.lfn-result-table { border-collapse: collapse; width: auto; font-family: var(--lfn-font-serif); margin: 0 auto; }
.lfn-result-table td { padding: 4px 12px; border: 1px solid var(--lfn-rule); }
.lfn-tbl-header td { font-weight: bold; border-bottom: 2px solid var(--lfn-ink-soft); background: rgba(128,128,128,0.08); }
.lfn-result-caption { text-align: center; font-size: 0.8em; color: var(--lfn-ink-soft); margin-top: 8px; font-family: var(--lfn-font-serif); }
.lfn-result-label-tag { font-size: 0.72em; color: var(--lfn-ink-soft); margin-top: 4px; text-align: center; }

.lfn-result-list { margin: 0; padding-left: 20px; font-family: var(--lfn-font-serif); font-size: 0.93em; }
.lfn-result-list li { margin-bottom: 4px; }
.lfn-result-ul { list-style-type: disc; }
.lfn-result-ol { list-style-type: decimal; }
.lfn-result-dl { margin: 0; font-family: var(--lfn-font-serif); font-size: 0.93em; }
.lfn-result-dl dt { font-weight: bold; margin-top: 6px; }
.lfn-result-dl dd { margin-left: 16px; color: var(--lfn-ink-soft); }

.lfn-result-sections { width: 100%; font-family: var(--lfn-font-serif); }
.lfn-result-heading { margin: 0 0 4px; }
.lfn-h1 { font-size: 1.3em; border-bottom: 1px solid var(--lfn-rule); padding-bottom: 4px; }
.lfn-h2 { font-size: 1.1em; }
.lfn-h3 { font-size: 0.95em; font-style: italic; }
.lfn-result-body-text { font-size: 0.85em; color: var(--lfn-ink-soft); margin: 8px 0 0; }

.lfn-result-figure { display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%; }
.lfn-result-figure-box { width: 120px; height: 80px; border: 2px dashed var(--lfn-rule); border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: rgba(128,128,128,0.05); }
.lfn-result-figure-icon { font-size: 1.8em; opacity: 0.5; }
.lfn-result-figure-filename { font-size: 0.65em; color: var(--lfn-ink-soft); font-family: var(--lfn-font-mono); }

.lfn-result-crossref { font-family: var(--lfn-font-serif); font-size: 0.93em; white-space: pre-line; line-height: 1.7; }

.lfn-result-cite { font-family: var(--lfn-font-serif); font-size: 0.93em; }
.lfn-cite-bracket { color: var(--lfn-accent); font-weight: 600; }
.lfn-result-biblist { width: 100%; font-size: 0.82em; font-family: var(--lfn-font-serif); }
.lfn-bib-heading { font-weight: bold; margin-bottom: 8px; font-size: 1.05em; border-bottom: 1px solid var(--lfn-rule); padding-bottom: 4px; }
.lfn-bib-entry { display: flex; gap: 8px; margin-bottom: 6px; }
.lfn-bib-num { color: var(--lfn-accent); font-weight: 600; flex-shrink: 0; }
.lfn-result-link { font-family: var(--lfn-font-serif); font-size: 0.93em; }
.lfn-link-text { color: var(--lfn-blue); text-decoration: underline; }

.lfn-result-layout { display: flex; justify-content: center; width: 100%; }
.lfn-layout-page { width: 90px; height: 110px; border: 1px solid var(--lfn-rule); background: var(--lfn-surface-2); display: flex; flex-direction: column; font-size: 0.6em; }
.lfn-layout-margin { background: rgba(129,140,248,0.12); display: flex; align-items: center; justify-content: center; color: var(--lfn-accent); font-family: var(--lfn-font-mono); }
.lfn-layout-top, .lfn-layout-bottom { height: 16px; }
.lfn-layout-middle { display: flex; flex: 1; }
.lfn-layout-left, .lfn-layout-right { width: 16px; writing-mode: vertical-rl; text-orientation: mixed; }
.lfn-layout-content { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 0.9em; color: var(--lfn-ink-soft); background: rgba(128,128,128,0.04); border: 1px dashed var(--lfn-rule); margin: 2px; font-size: 1.1em; }

.lfn-result-pagebreak { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; font-size: 0.82em; }
.lfn-pb-page { width: 80px; height: 40px; border: 1px solid var(--lfn-rule); background: var(--lfn-surface-2); display: flex; align-items: center; justify-content: center; font-family: var(--lfn-font-serif); color: var(--lfn-ink-soft); font-size: 0.85em; padding: 4px; text-align: center; }
.lfn-pb-divider { font-family: var(--lfn-font-mono); color: var(--lfn-accent); font-size: 0.75em; letter-spacing: 0.05em; }

.lfn-result-parspacing { font-family: var(--lfn-font-serif); font-size: 0.88em; color: var(--lfn-ink); }

.lfn-result-tikz { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.lfn-result-tikz svg { color: var(--lfn-ink); max-width: 100%; }
.lfn-tikz-label { font-size: 0.7em; color: var(--lfn-ink-soft); font-family: var(--lfn-font-mono); }

.lfn-result-errorfix { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; }
.lfn-ef-col { display: flex; flex-direction: column; gap: 4px; }
.lfn-ef-label { font-size: 0.7em; font-weight: 700; font-family: var(--lfn-font-mono); }
.lfn-ef-wrong .lfn-ef-label { color: var(--lfn-red); }
.lfn-ef-right .lfn-ef-label { color: var(--lfn-green); }
.lfn-ef-code { margin: 0; padding: 6px 8px; font-size: 0.77em; background: var(--lfn-code-bg); color: var(--lfn-code-text); border-radius: 4px; flex: 1; white-space: pre-wrap; }
.lfn-ef-note { grid-column: 1/-1; font-size: 0.78em; color: var(--lfn-amber); }

.lfn-result-document { font-family: var(--lfn-font-serif); font-size: 0.88em; width: 100%; }
.lfn-doc-title-block { text-align: center; margin-bottom: 12px; border-bottom: 1px solid var(--lfn-rule); padding-bottom: 8px; }
.lfn-doc-title { font-size: 1.3em; font-weight: bold; }
.lfn-doc-author { margin-top: 4px; }
.lfn-doc-date { color: var(--lfn-ink-soft); font-size: 0.9em; }
.lfn-doc-body { margin: 0; text-indent: 1.5em; }

.lfn-result-escape { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.lfn-escape-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
.lfn-escape-char { font-family: var(--lfn-font-serif); font-size: 1.3em; background: rgba(128,128,128,0.08); padding: 4px 8px; border-radius: 4px; min-width: 2em; text-align: center; }
.lfn-escape-note { font-size: 0.75em; color: var(--lfn-ink-soft); }

/* ─── SANDBOX ────────────────────────────────────────────────── */
.lfn-sandbox { display: flex; flex-direction: column; gap: 16px; }
.lfn-sandbox-header {}
.lfn-sandbox-title { font-size: 1.35rem; font-weight: 700; margin-bottom: 4px; }
.lfn-sandbox-desc { color: var(--lfn-ink-soft); font-size: 0.9rem; margin-bottom: 10px; }
.lfn-sandbox-mode { display: flex; gap: 18px; font-size: 0.85rem; }
.lfn-mode-btn { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.lfn-mode-btn code { font-size: 0.85em; background: rgba(128,128,128,0.15); padding: 1px 5px; border-radius: 3px; }

.lfn-quickinsert { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 0; border-top: 1px solid var(--lfn-rule); border-bottom: 1px solid var(--lfn-rule); }
.lfn-qi-btn {
  font-family: var(--lfn-font-mono); font-size: 0.75rem; padding: 4px 10px;
  background: var(--lfn-surface); border: 1px solid var(--lfn-rule); color: var(--lfn-ink-soft);
  border-radius: var(--lfn-radius); transition: all 0.15s;
}
.lfn-qi-btn:hover { background: var(--lfn-accent-soft); border-color: var(--lfn-accent); color: var(--lfn-accent); }

.lfn-sandbox-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid var(--lfn-rule); border-radius: var(--lfn-radius); overflow: hidden; min-height: 300px; }
.lfn-sandbox-editor-col { display: flex; flex-direction: column; border-right: 1px solid var(--lfn-rule); }
.lfn-sandbox-preview-col { display: flex; flex-direction: column; background: var(--lfn-result-bg); }
.lfn-sandbox-output {
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 24px; font-size: 1.1em; overflow-x: auto; font-family: var(--lfn-font-serif);
  color: var(--lfn-result-text);
}
.lfn-sandbox-placeholder { color: var(--lfn-ink-soft); font-size: 0.88em; font-style: italic; font-family: var(--lfn-font-sans); }
.lfn-sandbox-mode-hint { font-size: 0.72em; color: var(--lfn-ink-soft); padding: 6px 14px 10px; font-family: var(--lfn-font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lfn-sandbox-fallback { width: 100%; flex: 1; background: var(--lfn-code-bg); color: var(--lfn-code-text); border: none; padding: 12px; font-family: var(--lfn-font-mono); font-size: 0.85rem; resize: none; outline: none; min-height: 260px; }

/* ─── PRACTICE ───────────────────────────────────────────────── */
.lfn-practice-header { display: flex; align-items: center; margin-bottom: 8px; }
.lfn-scope-select { font-size: 0.8rem; padding: 5px 9px; border: 1px solid var(--lfn-rule); background: var(--lfn-surface); color: var(--lfn-ink); border-radius: var(--lfn-radius); }
.lfn-progress-line { font-size: 0.74rem; color: var(--lfn-ink-soft); margin-bottom: 18px; font-family: var(--lfn-font-mono); }
.lfn-quiz-card { border: 1px solid var(--lfn-rule); background: var(--lfn-surface); padding: 22px 20px; min-height: 190px; display: flex; flex-direction: column; justify-content: space-between; border-radius: var(--lfn-radius); }
.lfn-quiz-caughtup { justify-content: flex-start; gap: 14px; }
.lfn-quiz-topic-tag { font-size: 0.67rem; color: var(--lfn-accent); margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.06em; font-family: var(--lfn-font-mono); }
.lfn-quiz-prompt { font-size: 1.05rem; line-height: 1.55; margin-bottom: 10px; }
.lfn-hint-toggle { background: none; border: none; color: var(--lfn-blue); font-size: 0.78rem; text-decoration: underline; padding: 0; margin-bottom: 10px; display: block; }
.lfn-hint-text { font-size: 0.84rem; color: var(--lfn-ink-soft); margin: -4px 0 10px; font-style: italic; }
.lfn-quiz-answer { border-top: 1px dashed var(--lfn-rule); padding-top: 10px; margin-bottom: 10px; font-size: 0.95rem; }
.lfn-quiz-controls { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 6px; }
.lfn-quiz-controls button { font-size: 0.77rem; padding: 7px 12px; border: 1px solid var(--lfn-rule); background: var(--lfn-paper); color: var(--lfn-ink); border-radius: var(--lfn-radius); display: flex; flex-direction: column; align-items: center; gap: 1px; min-width: 56px; transition: all 0.15s; }
.lfn-quiz-controls button:disabled { opacity: 0.4; cursor: default; }
.lfn-rate-interval { font-size: 0.62rem; opacity: 0.7; }
.lfn-show-btn   { border-color: var(--lfn-accent) !important; color: var(--lfn-accent) !important; }
.lfn-show-btn:hover   { background: var(--lfn-accent) !important; color: #fff !important; }
.lfn-rate-again { border-color: var(--lfn-red) !important; color: var(--lfn-red) !important; }
.lfn-rate-again:hover { background: var(--lfn-red) !important; color: #fff !important; }
.lfn-rate-hard  { border-color: var(--lfn-amber) !important; color: var(--lfn-amber) !important; }
.lfn-rate-hard:hover  { background: var(--lfn-amber) !important; color: #fff !important; }
.lfn-rate-good  { border-color: var(--lfn-green) !important; color: var(--lfn-green) !important; }
.lfn-rate-good:hover  { background: var(--lfn-green) !important; color: #fff !important; }
.lfn-rate-easy  { border-color: var(--lfn-blue) !important; color: var(--lfn-blue) !important; }
.lfn-rate-easy:hover  { background: var(--lfn-blue) !important; color: #fff !important; }
.lfn-practice-empty { color: var(--lfn-ink-soft); font-style: italic; font-size: 0.9rem; }

/* ─── ADD FORM ───────────────────────────────────────────────── */
.lfn-add-form { border: 1px dashed var(--lfn-rule); padding: 14px; margin-top: 10px; border-radius: var(--lfn-radius); }
.lfn-add-form h3 { margin-top: 0; font-size: 0.95rem; }
.lfn-add-form label { display: block; font-size: 0.74rem; color: var(--lfn-ink-soft); margin: 8px 0 3px; text-transform: uppercase; letter-spacing: 0.04em; }
.lfn-add-form input, .lfn-add-form textarea, .lfn-add-form select { width: 100%; padding: 6px 9px; border: 1px solid var(--lfn-rule); background: var(--lfn-paper); font-size: 0.85rem; color: var(--lfn-ink); border-radius: var(--lfn-radius); }
.lfn-add-form textarea { min-height: 80px; resize: vertical; font-family: var(--lfn-font-mono); }
.lfn-checkbox-label { display: flex !important; align-items: center; gap: 6px; font-size: 0.8rem !important; text-transform: none !important; letter-spacing: 0 !important; }
.lfn-checkbox-label input { width: auto !important; }
.lfn-save-btn { margin-top: 12px; background: var(--lfn-accent); color: #fff; border: none; padding: 7px 16px; font-size: 0.78rem; border-radius: var(--lfn-radius); font-weight: 700; transition: opacity 0.15s; }
.lfn-save-btn:hover { opacity: 0.85; }

/* ─── MOBILE ─────────────────────────────────────────────────── */
@media (max-width: 800px) {
  .lfn-app { grid-template-columns: 1fr; }
  .lfn-sidebar { position: static; height: auto; display: flex; flex-wrap: nowrap; overflow-x: auto; border-right: none; border-bottom: 1px solid var(--lfn-rule); padding: 8px 6px; }
  .lfn-sidebar-label { display: none; }
  .lfn-practice-btn { width: auto; margin: 0 4px; white-space: nowrap; }
  .lfn-navlink { width: auto; white-space: nowrap; border-left: none; border-bottom: 3px solid transparent; padding: 7px 12px; }
  .lfn-navlink.active { border-bottom-color: var(--lfn-accent); border-left-color: transparent; }
  .lfn-main { padding: 18px 14px 60px; }
  .lfn-snippet-body.lfn-split { grid-template-columns: 1fr; }
  .lfn-snippet-code-col { border-right: none; border-bottom: 1px solid var(--lfn-rule); }
  .lfn-sandbox-body { grid-template-columns: 1fr; }
  .lfn-sandbox-editor-col { border-right: none; border-bottom: 1px solid var(--lfn-rule); }
  .lfn-result-errorfix { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { .lfn-root * { transition: none !important; animation: none !important; } }
`;
