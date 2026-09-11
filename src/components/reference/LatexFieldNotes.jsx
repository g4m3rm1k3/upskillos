"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import katex from "katex";
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
} from "ts-fsrs";

/**
 * LatexFieldNotes
 * ----------------------------------------------------------------
 * A self-contained LaTeX reference + copyable snippet library +
 * a real spaced-repetition practice mode, wired into open-calc.
 *
 * DEPENDENCIES
 *   katex     — already in package.json; used directly via
 *               katex.renderToString(), same pattern as
 *               LinearAlgebraReferencePage and RegexReferencePage.
 *   ts-fsrs   — Free Spaced Repetition Scheduler. Each quiz card
 *               gets a real due date based on a memory model
 *               (stability / difficulty). Cards you know well stop
 *               appearing for weeks; shaky ones resurface right
 *               before you'd likely forget them.
 *
 * PROPS
 *   isDark            bool     Wire from useGlobalTheme().isDarkGlobal
 *   vars              object   CSS variable overrides (optional)
 *   storage           object   { get, set } async storage adapter (optional)
 *   storageKeyPrefix  string   localStorage key prefix (default "oc-lfn")
 *   extraCategories   array    additional category objects to append (optional)
 *   className         string   extra class name(s) for the root element
 *   title             string   heading text (default "LaTeX Field Notes")
 *   subtitle          string   subheading text (optional)
 * ----------------------------------------------------------------
 */

// ===================================================================
// THEME
// All design tokens live here. Two complete sets — dark and light —
// mapped to the app's palette (same dark bg as LA / Regex reference
// pages; indigo/slate accent family; JetBrains Mono already loaded
// via @fontsource/jetbrains-mono).
// ===================================================================

const THEME = {
  dark: {
    "--lfn-paper":      "#07070f",
    "--lfn-paper-dim":  "#0e0e1a",
    "--lfn-surface":    "#12121f",
    "--lfn-ink":        "#e2e8f0",
    "--lfn-ink-soft":   "#94a3b8",
    "--lfn-rule":       "#1e1e2e",
    "--lfn-accent":     "#818cf8",   // indigo-400
    "--lfn-accent-soft":"#1e1b4b",
    "--lfn-blue":       "#38bdf8",   // sky-400
    "--lfn-blue-soft":  "#0c1e2e",
    "--lfn-green":      "#34d399",   // emerald-400
    "--lfn-amber":      "#fbbf24",   // amber-400
    "--lfn-code-bg":    "#0d0d1a",
    "--lfn-code-text":  "#a5f3fc",   // cyan-200
    "--lfn-font-serif": "system-ui, ui-sans-serif, sans-serif",
    "--lfn-font-mono":  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    "--lfn-radius":     "8px",
    "--lfn-sidebar-width": "220px",
  },
  light: {
    "--lfn-paper":      "#faf9f6",
    "--lfn-paper-dim":  "#f1efe9",
    "--lfn-surface":    "#ffffff",
    "--lfn-ink":        "#1c1b19",
    "--lfn-ink-soft":   "#55524a",
    "--lfn-rule":       "#ddd8cc",
    "--lfn-accent":     "#4f46e5",   // indigo-600
    "--lfn-accent-soft":"#eef2ff",
    "--lfn-blue":       "#0284c7",   // sky-600
    "--lfn-blue-soft":  "#e0f2fe",
    "--lfn-green":      "#059669",   // emerald-600
    "--lfn-amber":      "#d97706",   // amber-600
    "--lfn-code-bg":    "#1e1d1a",
    "--lfn-code-text":  "#e8e4d8",
    "--lfn-font-serif": "system-ui, ui-sans-serif, sans-serif",
    "--lfn-font-mono":  "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    "--lfn-radius":     "8px",
    "--lfn-sidebar-width": "220px",
  },
};

// ===================================================================
// Content
// (previewTex / previewMode are set only on snippets that are valid
// standalone TeX math KaTeX can render — document-structure snippets
// like \begin{itemize} intentionally have no preview.)
// ===================================================================

export const DEFAULT_CATEGORIES = [
  {
    id: "basics",
    label: "Document basics",
    intro:
      "Every LaTeX file starts the same way: declare a document class, load any packages you need, then write the content between \\begin{document} and \\end{document}. Nothing renders until it is inside that block.",
    rules: [
      "A file has two zones: the `preamble` (before `\\begin{document}`, for classes and packages) and the `body` (between `\\begin{document}` and `\\end{document}`).",
      "The document class comes first, always: `\\documentclass{article}` before anything else.",
      "Packages add features. Load them with `\\usepackage{name}` in the preamble, not the body.",
      "`\\maketitle` only renders a title if `\\title`, `\\author`, and (optionally) `\\date` were set beforehand.",
    ],
    snippets: [
      {
        title: "Minimal document",
        note: "The smallest complete file that compiles.",
        code: `\\documentclass{article}\n\n\\begin{document}\nHello, world.\n\\end{document}`,
      },
      {
        title: "Common preamble",
        note: "A practical starting point for most documents — math, images, links, and full UTF-8 text.",
        code: `\\documentclass[11pt]{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amsmath, amssymb}\n\\usepackage{graphicx}\n\\usepackage{hyperref}\n\\usepackage[margin=1in]{geometry}\n\n\\title{Document Title}\n\\author{Your Name}\n\\date{\\today}\n\n\\begin{document}\n\\maketitle\n\n\\end{document}`,
      },
      {
        title: "Sectioning",
        note: "Numbered headings, from chapter down to subsubsection (chapter only exists in report/book classes).",
        code: `\\section{First Section}\n\\subsection{A Subsection}\n\\subsubsection{A Sub-subsection}`,
      },
    ],
    quiz: [
      {
        q: "What are the two zones of a LaTeX file, and what goes in each?",
        a: "The preamble (before `\\begin{document}` — class and packages) and the body (between `\\begin{document}` and `\\end{document}` — the content).",
        hint: "One sets things up, one is what gets typeset.",
      },
      {
        q: "What must always be the very first command in a LaTeX file?",
        a: "`\\documentclass{...}`",
        hint: "It tells LaTeX what kind of document this is.",
      },
      {
        q: "Which package do you load to include images?",
        a: "`graphicx`",
        hint: 'Think "graphics" plus an x.',
      },
      {
        q: "What three commands, set in the preamble, does `\\maketitle` rely on?",
        a: "`\\title{}`, `\\author{}`, and `\\date{}`",
        hint: "They describe who wrote the document and when.",
      },
    ],
  },
  {
    id: "text",
    label: "Text formatting",
    intro:
      "Formatting commands wrap their argument in braces. Most can be nested, so \\textbf{\\textit{...}} gives bold italic.",
    rules: [
      "Formatting commands take their target in curly braces: `\\textbf{word}`, not `\\textbf word`.",
      "Nest commands to combine effects: `\\textbf{\\textit{text}}` is bold and italic.",
      "Size commands like `\\small` and `\\large` are switches, not wrappers — scope them with `{ }` so they don't leak into the rest of the paragraph.",
      "A blank line in the source starts a new paragraph; a single line break does not.",
    ],
    snippets: [
      {
        title: "Bold, italic, underline",
        code: `\\textbf{bold text}\n\\textit{italic text}\n\\underline{underlined text}\n\\texttt{monospace text}`,
      },
      {
        title: "Font size",
        code: `{\\small small text}\n{\\large large text}\n{\\Large larger text}\n{\\huge huge text}`,
      },
      {
        title: "Footnote",
        code: `This needs a citation.\\footnote{Here is the footnote text.}`,
      },
      {
        title: "Quote block",
        code: `\\begin{quote}\nA short quoted passage goes here.\n\\end{quote}`,
      },
    ],
    quiz: [
      {
        q: "How do you make text both bold and italic?",
        a: "`\\textbf{\\textit{text}}`",
        hint: "Nest one formatting command inside another.",
      },
      {
        q: "Why do size commands like `\\large` usually appear inside their own `{ }`?",
        a: "Because they're switches that affect everything after them until the current group ends — braces keep the effect from leaking into later text.",
        hint: "They don't take an argument like `\\textbf{}` does.",
      },
      {
        q: "What actually starts a new paragraph in LaTeX source?",
        a: "A blank line — a single line break in the source is ignored.",
        hint: "Not the Enter key by itself.",
      },
      {
        q: "Which command attaches a numbered footnote at the cursor?",
        a: "`\\footnote{...}`",
        hint: "It both marks the spot and holds the text.",
      },
    ],
  },
  {
    id: "math",
    label: "Math",
    intro:
      "Inline math sits between single dollar signs; display math gets its own line. The amsmath package (loaded in the preamble) unlocks aligned equations, matrices, and better spacing. Live previews below render exactly what each snippet's math will look like.",
    rules: [
      "Inline math: `$ ... $`. Display math (its own centered line): `\\[ ... \\]`.",
      "Letters in math mode render as italic variables by default — spaces and formatting are ignored inside `$...$`.",
      "Load `amsmath` for `align`, `cases`, `pmatrix`, and friends; plain LaTeX math alone doesn't have them.",
      "Inside `align`, `&` marks the alignment column and `\\\\` ends a line — both are required, not optional.",
    ],
    snippets: [
      {
        title: "Inline math",
        code: `The area is $A = \\pi r^2$.`,
        previewTex: "A = \\pi r^2",
        previewMode: "inline",
      },
      {
        title: "Display math",
        code: `\\[\n  E = mc^2\n\\]`,
        previewTex: "E = mc^2",
        previewMode: "block",
      },
      {
        title: "Fraction & roots",
        code: `\\frac{a}{b} \\qquad \\sqrt{x} \\qquad \\sqrt[n]{x}`,
        previewTex: "\\frac{a}{b} \\qquad \\sqrt{x} \\qquad \\sqrt[n]{x}",
        previewMode: "block",
      },
      {
        title: "Sum, product, integral",
        code: `\\sum_{i=1}^{n} i \\qquad \\prod_{i=1}^{n} i \\qquad \\int_{0}^{1} x^2 \\, dx`,
        previewTex:
          "\\sum_{i=1}^{n} i \\qquad \\prod_{i=1}^{n} i \\qquad \\int_{0}^{1} x^2 \\, dx",
        previewMode: "block",
      },
      {
        title: "Aligned equations",
        note: "Requires amsmath. The & marks the alignment point.",
        code: `\\begin{align}\n  f(x) &= (x+1)^2 \\\\\n       &= x^2 + 2x + 1\n\\end{align}`,
        previewTex:
          "\\begin{aligned} f(x) &= (x+1)^2 \\\\ &= x^2 + 2x + 1 \\end{aligned}",
        previewMode: "block",
      },
      {
        title: "Matrix",
        code: `\\begin{pmatrix}\n  a & b \\\\\n  c & d\n\\end{pmatrix}`,
        previewTex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
        previewMode: "block",
      },
      {
        title: "Cases",
        code: `f(x) =\n\\begin{cases}\n  1 & x \\geq 0 \\\\\n  -1 & x < 0\n\\end{cases}`,
        previewTex:
          "f(x) = \\begin{cases} 1 & x \\geq 0 \\\\ -1 & x < 0 \\end{cases}",
        previewMode: "block",
      },
    ],
    quiz: [
      {
        q: "What's the difference between `$ ... $` and `\\[ ... \\]`?",
        a: "`$...$` is inline math within a line of text; `\\[...\\]` is display math, set apart on its own centered line.",
        hint: "One stays in the sentence, one breaks out.",
      },
      {
        q: "What package do you need for the `align` environment?",
        a: "`amsmath`",
        hint: "It's the standard math extension package.",
      },
      {
        q: "Inside `align`, what do `&` and `\\\\` each do?",
        a: "`&` marks the point where lines should line up; `\\\\` ends the current line.",
        hint: "One is horizontal, one is vertical.",
      },
      {
        q: "Command for a fraction with numerator a and denominator b?",
        a: "`\\frac{a}{b}`",
        hint: "Two arguments, top and bottom.",
      },
      {
        q: "How do you write a summation from i=1 to n?",
        a: "`\\sum_{i=1}^{n}`",
        hint: "Underscore for the bottom limit, caret for the top.",
      },
    ],
  },
  {
    id: "lists",
    label: "Lists",
    intro:
      "Bulleted, numbered, and description lists all follow the same pattern: an environment containing \\item entries.",
    rules: [
      "Every list is `\\begin{env} \\item ... \\end{env}` — only the environment name changes.",
      "`itemize` = bullets, `enumerate` = numbers, `description` = labeled terms.",
      "Lists can nest: put a whole `itemize`/`enumerate` block inside another `\\item`.",
      "In `description`, the label goes in square brackets: `\\item[Term]`.",
    ],
    snippets: [
      {
        title: "Bulleted list",
        code: `\\begin{itemize}\n  \\item First point\n  \\item Second point\n\\end{itemize}`,
      },
      {
        title: "Numbered list",
        code: `\\begin{enumerate}\n  \\item First step\n  \\item Second step\n\\end{enumerate}`,
      },
      {
        title: "Description list",
        code: `\\begin{description}\n  \\item[Term] Definition of the term.\n  \\item[Another] Its definition.\n\\end{description}`,
      },
    ],
    quiz: [
      {
        q: "What single command starts every entry in any list environment?",
        a: "`\\item`",
        hint: "Same command whether the list is bulleted, numbered, or a description.",
      },
      {
        q: "Which environment gives you bullets, and which gives you numbers?",
        a: "`itemize` for bullets, `enumerate` for numbers.",
        hint: 'One name hints at "items", the other at "counting".',
      },
      {
        q: "How do you nest a numbered list inside a bulleted one?",
        a: "Put a full `\\begin{enumerate}...\\end{enumerate}` block right after an `\\item` in the `itemize` list.",
        hint: "Environments can contain other environments.",
      },
    ],
  },
  {
    id: "tables",
    label: "Tables",
    intro:
      "The tabular environment takes a column spec (l/c/r for left, center, right aligned, optionally with vertical bars |). Rows end with \\\\ and cells are separated by &.",
    rules: [
      "The column spec (like `{l c r}`) must have one letter per column, in order.",
      "`&` separates cells within a row; `\\\\` ends the row.",
      "`\\hline` draws a horizontal rule — put it wherever you want a line, including between rows.",
      "For a captioned, numbered table, wrap `tabular` inside a `table` float.",
    ],
    snippets: [
      {
        title: "Basic table",
        code: `\\begin{tabular}{l c r}\n  \\hline\n  Left & Center & Right \\\\\n  \\hline\n  A & B & C \\\\\n  D & E & F \\\\\n  \\hline\n\\end{tabular}`,
      },
      {
        title: "Floating table with caption",
        code: `\\begin{table}[h]\n  \\centering\n  \\begin{tabular}{l c}\n    Item & Price \\\\\n    Widget & \\$5 \\\\\n  \\end{tabular}\n  \\caption{Sample prices.}\n  \\label{tab:prices}\n\\end{table}`,
      },
    ],
    quiz: [
      {
        q: "In `{l c r}`, what does each letter control?",
        a: "The alignment of that column — left, center, or right — one letter per column.",
        hint: "Three columns, three letters.",
      },
      {
        q: "What separates cells, and what ends a row, in `tabular`?",
        a: "`&` separates cells; `\\\\` ends the row.",
        hint: "Same punctuation as in `align`.",
      },
      {
        q: "Why wrap a `tabular` in a `table` environment?",
        a: "To get a numbered caption, a label you can `\\ref{}`, and automatic float placement.",
        hint: "`tabular` alone has no caption or number.",
      },
    ],
  },
  {
    id: "figures",
    label: "Figures",
    intro:
      "Images need the graphicx package. Wrap \\includegraphics in a figure environment to get captions, labels, and automatic placement.",
    rules: [
      "Load `graphicx` in the preamble before using `\\includegraphics`.",
      "`\\includegraphics[width=...]{file}` — set a width so images don't overflow the page.",
      "`\\caption` and `\\label` go inside the `figure` environment, and `\\label` should come after `\\caption`.",
      "Reference a figure with `\\ref{label}` — LaTeX fills in the number automatically at compile time.",
    ],
    snippets: [
      {
        title: "Insert an image",
        code: `\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.7\\textwidth]{filename.png}\n  \\caption{A short caption.}\n  \\label{fig:my-figure}\n\\end{figure}`,
      },
      {
        title: "Reference a figure",
        note: "Requires the label to already exist elsewhere in the document.",
        code: `As shown in Figure~\\ref{fig:my-figure}, ...`,
      },
    ],
    quiz: [
      {
        q: "What package must be loaded before `\\includegraphics` works?",
        a: "`graphicx`",
        hint: "Same package used for any embedded image.",
      },
      {
        q: "Why should `\\label` come after `\\caption` inside a figure?",
        a: "Because the label captures the current figure number, which is only set once `\\caption` has run.",
        hint: "Order matters for numbering to work.",
      },
      {
        q: "How do you refer to a figure by its automatic number?",
        a: "`\\ref{label}`, using the same label given to that figure.",
        hint: "LaTeX fills in the number for you at compile time.",
      },
    ],
  },
  {
    id: "refs",
    label: "References & citations",
    intro:
      "Citations usually come from a .bib file managed with BibTeX or biblatex. \\cite pulls in the reference; the bibliography command renders the list at the end.",
    rules: [
      "`\\cite{key}` inserts an in-text citation; `key` must match an entry in your `.bib` file.",
      "`\\bibliographystyle{...}` sets the citation format; `\\bibliography{file}` (no `.bib` extension) renders the list.",
      "You need to compile with BibTeX/biblatex (not just LaTeX) for citations to resolve — a single compile pass isn't enough.",
      "`\\href{url}{text}` needs the `hyperref` package, usually loaded last in the preamble.",
    ],
    snippets: [
      {
        title: "Cite a source",
        code: `This was shown previously \\cite{smith2020}.`,
      },
      {
        title: "Bibliography (BibTeX)",
        code: `\\bibliographystyle{plain}\n\\bibliography{references}`,
      },
      {
        title: "Hyperlink",
        note: "Requires the hyperref package.",
        code: `\\href{https://example.com}{link text}`,
      },
    ],
    quiz: [
      {
        q: "What must the argument to `\\cite{}` match?",
        a: "A citation key defined in your `.bib` file.",
        hint: "It's a lookup, not free text.",
      },
      {
        q: 'Why might citations show up as "??" the first time you compile?',
        a: "Because resolving citations needs an extra BibTeX/biblatex pass (and often a second LaTeX pass) after the first compile.",
        hint: "One compile pass alone isn't enough.",
      },
      {
        q: "Which package do you need for `\\href{}{}`?",
        a: "`hyperref`",
        hint: "Same package that makes your table of contents clickable.",
      },
    ],
  },
  {
    id: "layout",
    label: "Page layout",
    intro:
      "Page geometry, spacing, and breaks are mostly handled by a handful of commands plus the geometry package. Small, deliberate spacing commands are better than fighting LaTeX's automatic layout.",
    rules: [
      "`\\usepackage[margin=1in]{geometry}` is the standard way to set margins — avoid manually resetting `\\textwidth` etc.",
      "`\\newpage` forces a page break; `\\clearpage` does the same but also flushes any pending floats (figures/tables).",
      "`\\noindent` suppresses the indent on the paragraph it starts; `\\parskip`/`\\parindent` control spacing and indent globally.",
      "`\\vspace{}` and `\\hspace{}` add manual vertical/horizontal space — use sparingly, LaTeX's defaults are usually better.",
    ],
    snippets: [
      { title: "Set margins", code: `\\usepackage[margin=1in]{geometry}` },
      {
        title: "Force a page break",
        note: "\\clearpage also flushes pending figures/tables before breaking.",
        code: `\\newpage\n% or\n\\clearpage`,
      },
      {
        title: "Paragraph spacing instead of indenting",
        note: "A common style swap: no first-line indent, a blank line of space between paragraphs instead.",
        code: `\\setlength{\\parindent}{0pt}\n\\setlength{\\parskip}{1em}`,
      },
      { title: "Two-column layout", code: `\\documentclass[twocolumn]{article}` },
      { title: "Manual spacing", code: `\\vspace{1cm}\n\\hspace{2em}` },
    ],
    quiz: [
      {
        q: "What's the standard package for setting page margins?",
        a: "`geometry`, e.g. `\\usepackage[margin=1in]{geometry}`",
        hint: "Not manual `\\textwidth` edits.",
      },
      {
        q: "What's the difference between `\\newpage` and `\\clearpage`?",
        a: "`\\clearpage` does everything `\\newpage` does, and also flushes any figures/tables waiting to be placed.",
        hint: "One is a superset of the other.",
      },
      {
        q: "Which command stops a single paragraph from being indented?",
        a: "`\\noindent`, placed right before the paragraph.",
        hint: "It only affects the paragraph it starts.",
      },
      {
        q: "Which two length commands control indentation and paragraph spacing globally?",
        a: "`\\parindent` (indent size) and `\\parskip` (space between paragraphs).",
        hint: "Set with `\\setlength{...}{...}`.",
      },
    ],
  },
  {
    id: "tikz",
    label: "TikZ basics",
    intro:
      "TikZ is LaTeX's drawing package. Everything happens inside a tikzpicture environment, using \\draw commands with coordinates in parentheses.",
    rules: [
      "Load `\\usepackage{tikz}` in the preamble before any `tikzpicture`.",
      "Coordinates are `(x,y)` pairs; `--` draws a straight line between two coordinates.",
      "`\\draw` outlines a shape, `\\fill` fills it, `\\filldraw` does both in one command.",
      "`node` attaches a label or shape at a coordinate: `\\node at (1,1) {label};`.",
    ],
    snippets: [
      {
        title: "A simple line",
        code: `\\begin{tikzpicture}\n  \\draw (0,0) -- (2,2);\n\\end{tikzpicture}`,
      },
      {
        title: "Rectangle and circle",
        code: `\\begin{tikzpicture}\n  \\draw (0,0) rectangle (2,1);\n  \\draw (3,0.5) circle (0.5);\n\\end{tikzpicture}`,
      },
      {
        title: "Arrow between labeled nodes",
        code: `\\begin{tikzpicture}\n  \\node (a) at (0,0) {A};\n  \\node (b) at (2,0) {B};\n  \\draw[->] (a) -- (b);\n\\end{tikzpicture}`,
      },
    ],
    quiz: [
      {
        q: "What environment does every TikZ drawing live inside?",
        a: "`tikzpicture`",
        hint: "It's the drawing canvas.",
      },
      {
        q: "What draws a straight line between two coordinates?",
        a: "`\\draw (x1,y1) -- (x2,y2);`",
        hint: "Two dashes connect the points.",
      },
      {
        q: "What's the difference between `\\draw` and `\\fill`?",
        a: "`\\draw` outlines a shape's path; `\\fill` fills the interior with color instead of (or as well as) outlining it.",
        hint: "Outline vs. solid.",
      },
      {
        q: "How do you place a labeled point that other commands can refer to by name?",
        a: "`\\node (name) at (x,y) {label};`",
        hint: "The parentheses give it a reusable name.",
      },
    ],
  },
  {
    id: "symbols",
    label: "Common symbols",
    intro:
      "A quick shelf of Greek letters and operators that come up constantly in math mode.",
    rules: [
      "Greek letters are just commands: `\\alpha`, `\\beta`, etc. — lowercase command gives the lowercase letter.",
      "Capitalize the command name for the capital Greek letter where one exists: `\\Gamma` vs `\\gamma`.",
      "These all only work inside math mode (`$...$` or `\\[...\\]`) — outside it, LaTeX will error or print nothing useful.",
      "Special characters `# $ % & _ { } ~ ^ \\` need escaping (e.g. `\\$`, `\\&`) to appear literally in text.",
    ],
    snippets: [
      {
        title: "Greek letters",
        code: `\\alpha \\beta \\gamma \\delta \\epsilon \\theta \\lambda \\mu \\pi \\sigma \\phi \\omega`,
        previewTex:
          "\\alpha \\beta \\gamma \\delta \\epsilon \\theta \\lambda \\mu \\pi \\sigma \\phi \\omega",
        previewMode: "block",
      },
      {
        title: "Capital Greek letters",
        code: `\\Gamma \\Delta \\Theta \\Lambda \\Pi \\Sigma \\Phi \\Omega`,
        previewTex: "\\Gamma \\Delta \\Theta \\Lambda \\Pi \\Sigma \\Phi \\Omega",
        previewMode: "block",
      },
      {
        title: "Relations & operators",
        code: `\\leq \\geq \\neq \\approx \\equiv \\times \\div \\cdot \\pm \\infty`,
        previewTex:
          "\\leq \\geq \\neq \\approx \\equiv \\times \\div \\cdot \\pm \\infty",
        previewMode: "block",
      },
      {
        title: "Arrows",
        code: `\\rightarrow \\Rightarrow \\leftarrow \\Leftarrow \\leftrightarrow \\Leftrightarrow`,
        previewTex:
          "\\rightarrow \\Rightarrow \\leftarrow \\Leftarrow \\leftrightarrow \\Leftrightarrow",
        previewMode: "block",
      },
      {
        title: "Sets",
        code: `\\in \\notin \\subset \\subseteq \\cup \\cap \\emptyset \\forall \\exists`,
        previewTex:
          "\\in \\notin \\subset \\subseteq \\cup \\cap \\emptyset \\forall \\exists",
        previewMode: "block",
      },
    ],
    quiz: [
      {
        q: "How do you get an uppercase Delta versus a lowercase delta?",
        a: "`\\Delta` for uppercase, `\\delta` for lowercase — capitalization of the command controls it.",
        hint: "The command name's case mirrors the letter's case.",
      },
      {
        q: "Why does `\\alpha` do nothing useful outside `$...$`?",
        a: "Because Greek-letter and symbol commands are math-mode commands — they need to be inside math mode to render as symbols.",
        hint: "Same rule as `\\frac` or `\\sum`.",
      },
      {
        q: 'Command for "not equal"? For "approximately equal"?',
        a: "`\\neq` and `\\approx`",
        hint: "Both are two-character-ish mnemonics.",
      },
      {
        q: "How do you print a literal dollar sign or ampersand in text?",
        a: "Escape it: `\\$` or `\\&`.",
        hint: "A backslash in front of the special character.",
      },
    ],
  },
  {
    id: "troubleshooting",
    label: "Common errors",
    intro:
      "Most LaTeX errors fall into a handful of repeat offenders. Learning to recognize the message is faster than memorizing every possible cause.",
    rules: [
      '"Undefined control sequence" — a command is misspelled, or its package was never loaded.',
      '"Missing $ inserted" — a math-only character (`^`, `_`, or a math command) was used outside math mode.',
      '"Runaway argument" or "Missing } inserted" — a brace was opened but never closed somewhere earlier in the file.',
      '"Undefined reference" (shows as `??` in the PDF) — a `\\ref`/`\\cite` label doesn\'t exist yet, or the file just needs another compile pass.',
    ],
    snippets: [
      {
        title: "Escaping special characters",
        note: "These 8 characters are reserved by LaTeX and must be escaped to print literally.",
        code: `\\# \\$ \\% \\& \\_ \\{ \\} \\~{} \\^{} \\textbackslash{}`,
      },
      {
        title: 'Fixing "Missing $ inserted"',
        note: "The subscript below needs math mode around it.",
        code: `% Wrong:\nx_1 is the first term.\n\n% Right:\n$x_1$ is the first term.`,
      },
    ],
    quiz: [
      {
        q: 'You see "Undefined control sequence" — what are the two most likely causes?',
        a: "Either the command name is misspelled, or the package that defines it was never loaded with `\\usepackage`.",
        hint: "Typo, or missing package — check both.",
      },
      {
        q: 'What usually triggers "Missing $ inserted"?',
        a: "Using a math-only character like `^` or `_`, or a math command, outside of math mode.",
        hint: "The fix is almost always wrapping something in `$...$`.",
      },
      {
        q: 'What causes "Runaway argument"?',
        a: "An opening brace `{` somewhere earlier in the document that was never matched with a closing `}`.",
        hint: "LaTeX kept reading, looking for a `}` that never came.",
      },
      {
        q: "Why might `\\ref{}` show up as `??` even though the label exists?",
        a: "Because reference numbers need an extra compile pass to resolve — recompiling usually fixes it.",
        hint: "Not always a real error — sometimes just needs another pass.",
      },
    ],
  },
];

export const CUSTOM_CATEGORY_ID = "custom";

// ===================================================================
// Storage
// ===================================================================

function createLocalStorageAdapter() {
  const hasWindow = typeof window !== "undefined";
  return {
    async get(key) {
      if (!hasWindow || !window.localStorage) return null;
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    async set(key, value) {
      if (!hasWindow || !window.localStorage) return false;
      try {
        window.localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    },
  };
}

function safeParseArray(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function safeParseObject(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch (e) {
    return {};
  }
}

function generateId() {
  return (
    "oc-lfn-" +
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}

// ===================================================================
// FSRS helpers
// A "card" here is a ts-fsrs Card object: { due, stability, difficulty,
// elapsed_days, scheduled_days, reps, lapses, state, last_review }.
// Persisted as plain JSON (Dates -> ISO strings), rehydrated on load.
// ===================================================================

function serializeCard(card) {
  return {
    ...card,
    due: card.due instanceof Date ? card.due.toISOString() : card.due,
    last_review:
      card.last_review instanceof Date
        ? card.last_review.toISOString()
        : card.last_review || null,
  };
}

function deserializeCard(raw) {
  if (!raw) return null;
  try {
    return {
      ...raw,
      due: new Date(raw.due),
      last_review: raw.last_review ? new Date(raw.last_review) : undefined,
    };
  } catch (e) {
    return null;
  }
}

function getCard(cardsMap, id) {
  return deserializeCard(cardsMap[id]) || createEmptyCard();
}

function isDue(card, now) {
  return card.due.getTime() <= now.getTime();
}

function flattenQuiz(categories) {
  const items = [];
  categories.forEach((cat) => {
    (cat.quiz || []).forEach((item, idx) => {
      items.push({
        id: cat.id + "-" + idx,
        categoryId: cat.id,
        categoryLabel: cat.label,
        prompt: item.q,
        answer: item.a,
        hint: item.hint,
      });
    });
  });
  return items;
}

function poolForScope(allItems, scope) {
  return scope === "all" ? allItems : allItems.filter((i) => i.categoryId === scope);
}

function pickDueItem(allItems, cardsMap, scope, excludeId, now) {
  const pool = poolForScope(allItems, scope);
  const due = pool.filter((i) => isDue(getCard(cardsMap, i.id), now));
  let candidates = due.filter((i) => !excludeId || i.id !== excludeId);
  if (candidates.length === 0) candidates = due;
  if (candidates.length === 0) return null;
  candidates.sort(
    (a, b) => getCard(cardsMap, a.id).due.getTime() - getCard(cardsMap, b.id).due.getTime()
  );
  return candidates[0];
}

function pickAnyItem(allItems, scope, excludeId) {
  const pool = poolForScope(allItems, scope);
  const candidates = pool.filter((i) => !excludeId || i.id !== excludeId);
  const finalPool = candidates.length > 0 ? candidates : pool;
  if (finalPool.length === 0) return null;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

function nextDueDate(allItems, cardsMap, scope) {
  const pool = poolForScope(allItems, scope);
  if (pool.length === 0) return null;
  const dueTimes = pool.map((i) => getCard(cardsMap, i.id).due.getTime());
  return new Date(Math.min(...dueTimes));
}

function masteryCounts(allItems, cardsMap, scope) {
  const pool = poolForScope(allItems, scope);
  const mastered = pool.filter((i) => getCard(cardsMap, i.id).state === State.Review)
    .length;
  return { mastered, total: pool.length };
}

function humanizeInterval(fromDate, toDate) {
  const ms = Math.max(0, toDate.getTime() - fromDate.getTime());
  const mins = ms / 60000;
  if (mins < 1) return "<1m";
  if (mins < 60) return Math.round(mins) + "m";
  const hours = mins / 60;
  if (hours < 24) return Math.round(hours) + "h";
  const days = hours / 24;
  if (days < 30) return Math.round(days) + "d";
  const months = days / 30;
  if (months < 12) return Math.round(months) + "mo";
  return Math.round(days / 365) + "y";
}

// ===================================================================
// Small presentational helpers
// ===================================================================

/** Renders `code`-backtick spans as <code>, everything else as text. */
function InlineText({ text }) {
  if (!text) return null;
  const parts = String(text).split(/`([^`]+)`/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code className="lfn-inline-code" key={i}>
            {part}
          </code>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/**
 * KaTeX preview using katex.renderToString() — same pattern as
 * LinearAlgebraReferencePage and RegexReferencePage. Defensive:
 * never throws into the parent render tree.
 */
function MathPreview({ tex, mode }) {
  const html = useMemo(() => {
    if (!tex) return null;
    try {
      return katex.renderToString(tex, {
        displayMode: mode === "block",
        throwOnError: false,
        strict: false,
      });
    } catch (e) {
      return null;
    }
  }, [tex, mode]);

  if (!html) return null;

  return (
    <div className="lfn-preview">
      <div className="lfn-preview-label">Preview</div>
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function CopyButton({ code }) {
  const [status, setStatus] = useState("idle"); // idle | copied | failed
  const timeoutRef = useRef(null);

  const handleCopy = useCallback(async () => {
    let ok = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        ok = true;
      }
    } catch (e) {
      ok = false;
    }
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (e) {
        ok = false;
      }
    }
    setStatus(ok ? "copied" : "failed");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus("idle"), 1300);
  }, [code]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      className={
        "lfn-copy-btn" +
        (status === "copied" ? " is-copied" : "") +
        (status === "failed" ? " is-failed" : "")
      }
      onClick={handleCopy}
      aria-live="polite"
    >
      {status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy"}
    </button>
  );
}

function SnippetCard({ snippet, onDelete }) {
  return (
    <div className="lfn-snippet">
      <div className="lfn-snippet-head">
        <div className="lfn-snippet-title">{snippet.title}</div>
        <CopyButton code={snippet.code} />
      </div>
      {snippet.note ? (
        <div className="lfn-snippet-note">{snippet.note}</div>
      ) : null}
      <pre className="lfn-pre">
        <code>{snippet.code}</code>
      </pre>
      {snippet.previewTex ? (
        <MathPreview tex={snippet.previewTex} mode={snippet.previewMode} />
      ) : null}
      {onDelete ? (
        <button type="button" className="lfn-del-btn" onClick={onDelete}>
          Remove
        </button>
      ) : null}
    </div>
  );
}

function RulesBox({ rules }) {
  if (!rules || rules.length === 0) return null;
  return (
    <div className="lfn-rules-box">
      <h3 className="lfn-rules-heading">Rules to remember</h3>
      <ul className="lfn-rules-list">
        {rules.map((r, i) => (
          <li key={i}>
            <InlineText text={r} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddSnippetForm({ categories, defaultCategoryId, onAdd, storageOk }) {
  const [categoryId, setCategoryId] = useState(defaultCategoryId);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [isMath, setIsMath] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [codeError, setCodeError] = useState(false);

  useEffect(() => {
    setCategoryId(defaultCategoryId);
  }, [defaultCategoryId]);

  const handleSave = () => {
    const cleanTitle = title.trim();
    const cleanCode = code;
    const hasTitle = cleanTitle.length > 0;
    const hasCode = cleanCode.trim().length > 0;
    setTitleError(!hasTitle);
    setCodeError(!hasCode);
    if (!hasTitle || !hasCode) return;

    const catObj = categories.find((c) => c.id === categoryId);
    onAdd({
      id: generateId(),
      categoryId,
      categoryLabel: catObj ? catObj.label : categoryId,
      title: cleanTitle,
      note: note.trim(),
      code: cleanCode,
      previewTex: isMath ? cleanCode : undefined,
      previewMode: isMath ? "block" : undefined,
    });
    setTitle("");
    setNote("");
    setCode("");
    setIsMath(false);
    setTitleError(false);
    setCodeError(false);
  };

  const selectableCategories = categories.filter(
    (c) => c.id !== CUSTOM_CATEGORY_ID
  );

  return (
    <div className="lfn-add-form">
      <h3>Add a snippet</h3>

      <label htmlFor="lfn-cat-select">Category</label>
      <select
        id="lfn-cat-select"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      >
        {selectableCategories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <label htmlFor="lfn-title-input">Title</label>
      <input
        id="lfn-title-input"
        type="text"
        value={title}
        placeholder="e.g. Two-column figure"
        onChange={(e) => setTitle(e.target.value)}
        style={titleError ? { borderColor: "var(--lfn-accent)" } : undefined}
      />

      <label htmlFor="lfn-note-input">Note (optional)</label>
      <input
        id="lfn-note-input"
        type="text"
        value={note}
        placeholder="A short reminder of what this does"
        onChange={(e) => setNote(e.target.value)}
      />

      <label htmlFor="lfn-code-input">LaTeX code</label>
      <textarea
        id="lfn-code-input"
        value={code}
        placeholder={"\\begin{...}\n  ...\n\\end{...}"}
        onChange={(e) => setCode(e.target.value)}
        style={codeError ? { borderColor: "var(--lfn-accent)" } : undefined}
      />

      <label className="lfn-checkbox-label">
        <input
          type="checkbox"
          checked={isMath}
          onChange={(e) => setIsMath(e.target.checked)}
        />
        This is standalone math — show a live KaTeX preview
      </label>

      <button type="button" className="lfn-save-btn" onClick={handleSave}>
        Save snippet
      </button>

      {!storageOk ? (
        <p className="lfn-snippet-note lfn-storage-warning">
          Heads up: saving isn't working right now, so new snippets may not
          persist after you leave this page.
        </p>
      ) : null}
    </div>
  );
}

function QuizCard({ item, card, scheduler, onResult }) {
  const [answerShown, setAnswerShown] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const now = useMemo(() => new Date(), [item && item.id]);

  useEffect(() => {
    setAnswerShown(false);
    setHintShown(false);
  }, [item && item.id]);

  const preview = useMemo(() => {
    if (!item || !card) return null;
    try {
      return scheduler.repeat(card, now);
    } catch (e) {
      return null;
    }
  }, [item, card, now, scheduler]);

  if (!item) {
    return <p className="lfn-practice-empty">No quiz cards in this set yet.</p>;
  }

  const ratingButtons = [
    { rating: Rating.Again, label: "Again", cls: "lfn-rate-again" },
    { rating: Rating.Hard,  label: "Hard",  cls: "lfn-rate-hard"  },
    { rating: Rating.Good,  label: "Good",  cls: "lfn-rate-good"  },
    { rating: Rating.Easy,  label: "Easy",  cls: "lfn-rate-easy"  },
  ];

  return (
    <div className="lfn-quiz-card">
      <div>
        <div className="lfn-quiz-topic-tag">{item.categoryLabel}</div>
        <div className="lfn-quiz-prompt">
          <InlineText text={item.prompt} />
        </div>

        {item.hint && !answerShown ? (
          <>
            <button
              type="button"
              className="lfn-hint-toggle"
              onClick={() => setHintShown((v) => !v)}
            >
              {hintShown ? "Hide hint" : "Show hint"}
            </button>
            {hintShown ? (
              <div className="lfn-hint-text">
                <InlineText text={item.hint} />
              </div>
            ) : null}
          </>
        ) : null}

        {answerShown ? (
          <div className="lfn-quiz-answer">
            <InlineText text={item.answer} />
          </div>
        ) : null}
      </div>

      <div className="lfn-quiz-controls">
        {!answerShown ? (
          <button
            type="button"
            className="lfn-show-btn"
            onClick={() => setAnswerShown(true)}
          >
            Show answer
          </button>
        ) : (
          ratingButtons.map(({ rating, label, cls }) => {
            const resultCard = preview ? preview[rating].card : null;
            const interval = resultCard ? humanizeInterval(now, resultCard.due) : "";
            return (
              <button
                key={label}
                type="button"
                className={cls}
                onClick={() => resultCard && onResult(rating, resultCard)}
                disabled={!resultCard}
              >
                {label}
                {interval ? <span className="lfn-rate-interval">{interval}</span> : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// ===================================================================
// Error boundary (keeps a host app safe from a render-time crash)
// ===================================================================

class LfnErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (typeof console !== "undefined" && console.error) {
      console.error("LatexFieldNotes crashed:", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "24px",
            fontFamily: "system-ui, sans-serif",
            color: "#94a3b8",
            border: "1px solid #1e1e2e",
          }}
        >
          Something went wrong rendering the LaTeX reference. Reloading the
          page usually fixes it; your saved snippets and practice progress
          are untouched.
        </div>
      );
    }
    return this.props.children;
  }
}

// ===================================================================
// Main component
// ===================================================================

function LatexFieldNotesInner({
  isDark = true,
  vars,
  storage,
  storageKeyPrefix,
  extraCategories,
  className,
  title,
  subtitle,
}) {
  const categories = useMemo(() => {
    const extra = Array.isArray(extraCategories) ? extraCategories : [];
    return [...DEFAULT_CATEGORIES, ...extra];
  }, [extraCategories]);

  const navCategories = useMemo(
    () => [
      ...categories.map((c) => ({ id: c.id, label: c.label })),
      { id: CUSTOM_CATEGORY_ID, label: "My snippets" },
    ],
    [categories]
  );

  const allQuizItems = useMemo(() => flattenQuiz(categories), [categories]);

  const scheduler = useMemo(
    () => fsrs(generatorParameters({ enable_fuzz: false })),
    []
  );

  const storageAdapter = useMemo(
    () => storage || createLocalStorageAdapter(),
    [storage]
  );
  const keyPrefix = storageKeyPrefix || "oc-lfn";
  const snippetsKey = `${keyPrefix}:user-snippets`;
  const cardsKey    = `${keyPrefix}:fsrs-cards`;

  const [ready, setReady] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [userSnippets, setUserSnippets] = useState([]);
  const [cardsMap, setCardsMap] = useState({});
  const [view, setView] = useState("lesson"); // 'lesson' | 'practice'
  const [activeCategory, setActiveCategory] = useState(
    categories[0] ? categories[0].id : CUSTOM_CATEGORY_ID
  );
  const [practiceScope, setPracticeScope] = useState("all");
  const [currentQuizItem, setCurrentQuizItem] = useState(null);
  const [reviewAhead, setReviewAhead] = useState(false);

  // ---- initial load ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rawSnippets, rawCards] = await Promise.all([
          storageAdapter.get(snippetsKey),
          storageAdapter.get(cardsKey),
        ]);
        if (cancelled) return;
        setUserSnippets(safeParseArray(rawSnippets));
        setCardsMap(safeParseObject(rawCards));
      } catch (e) {
        if (!cancelled) setStorageOk(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSnippets = useCallback(
    async (next) => {
      setUserSnippets(next);
      try {
        const ok = await storageAdapter.set(snippetsKey, JSON.stringify(next));
        if (ok === false) setStorageOk(false);
      } catch (e) {
        setStorageOk(false);
      }
    },
    [storageAdapter, snippetsKey]
  );

  const persistCards = useCallback(
    async (next) => {
      setCardsMap(next);
      try {
        await storageAdapter.set(cardsKey, JSON.stringify(next));
      } catch (e) {
        // Non-critical: practice mode still works for this session.
      }
    },
    [storageAdapter, cardsKey]
  );

  const handleAddSnippet = useCallback(
    (snippet) => { persistSnippets([...userSnippets, snippet]); },
    [userSnippets, persistSnippets]
  );

  const handleDeleteSnippet = useCallback(
    (id) => { persistSnippets(userSnippets.filter((s) => s.id !== id)); },
    [userSnippets, persistSnippets]
  );

  const chooseNext = useCallback(
    (scope, cards, excludeId, ahead) => {
      const now = new Date();
      const due = pickDueItem(allQuizItems, cards, scope, excludeId, now);
      if (due) return due;
      if (ahead) return pickAnyItem(allQuizItems, scope, excludeId);
      return null;
    },
    [allQuizItems]
  );

  const enterPractice = useCallback(
    (scope) => {
      setView("practice");
      setPracticeScope(scope);
      setReviewAhead(false);
      setCurrentQuizItem(chooseNext(scope, cardsMap, null, false));
    },
    [chooseNext, cardsMap]
  );

  const handleScopeChange = useCallback(
    (scope) => {
      setPracticeScope(scope);
      setReviewAhead(false);
      setCurrentQuizItem(chooseNext(scope, cardsMap, null, false));
    },
    [chooseNext, cardsMap]
  );

  const handleReviewAhead = useCallback(() => {
    setReviewAhead(true);
    setCurrentQuizItem(chooseNext(practiceScope, cardsMap, null, true));
  }, [chooseNext, practiceScope, cardsMap]);

  const handleQuizResult = useCallback(
    (rating, resultCard) => {
      if (!currentQuizItem) return;
      const nextCards = {
        ...cardsMap,
        [currentQuizItem.id]: serializeCard(resultCard),
      };
      persistCards(nextCards);
      setCurrentQuizItem(chooseNext(practiceScope, nextCards, currentQuizItem.id, reviewAhead));
    },
    [currentQuizItem, cardsMap, persistCards, chooseNext, practiceScope, reviewAhead]
  );

  // Merge theme tokens: base set (dark or light) → caller overrides
  const rootStyle = useMemo(
    () => ({ ...(isDark ? THEME.dark : THEME.light), ...(vars || {}) }),
    [isDark, vars]
  );

  const activeCat =
    activeCategory === CUSTOM_CATEGORY_ID
      ? null
      : categories.find((c) => c.id === activeCategory);

  const userSnippetsForCategory = (categoryId) =>
    userSnippets.filter((s) => s.categoryId === categoryId);

  const counts = masteryCounts(allQuizItems, cardsMap, practiceScope);
  const upcomingDue = !currentQuizItem
    ? nextDueDate(allQuizItems, cardsMap, practiceScope)
    : null;
  const currentCard = currentQuizItem ? getCard(cardsMap, currentQuizItem.id) : null;

  return (
    <div className={"lfn-root" + (className ? " " + className : "")} style={rootStyle}>
      <style>{CSS_TEXT}</style>

      <div className="lfn-app">
        <header className="lfn-masthead">
          <div>
            <h1>
              {title || "LaTeX Field Notes"}{" "}
              <span className="lfn-rubric">— a working reference</span>
            </h1>
            <p>
              {subtitle ||
                "A short course through LaTeX, a shelf of ready-to-paste snippets, live math previews, and a practice mode with real spaced repetition."}
            </p>
          </div>
        </header>

        <nav className="lfn-sidebar">
          <button
            type="button"
            className={"lfn-practice-btn" + (view === "practice" ? " active" : "")}
            onClick={() => enterPractice(practiceScope)}
          >
            Practice mode
          </button>

          <div className="lfn-sidebar-label">Learn</div>

          {navCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={
                "lfn-navlink" +
                (view === "lesson" && cat.id === activeCategory ? " active" : "")
              }
              onClick={() => {
                setView("lesson");
                setActiveCategory(cat.id);
              }}
            >
              {cat.label}
              {cat.id === CUSTOM_CATEGORY_ID ? (
                <span className="lfn-navcount">({userSnippets.length})</span>
              ) : null}
            </button>
          ))}
        </nav>

        <main className="lfn-main">
          {!ready ? (
            <p className="lfn-practice-empty">Loading…</p>
          ) : view === "practice" ? (
            <section className="lfn-category active">
              <h2>Practice mode</h2>
              <p className="lfn-intro">
                Rate yourself honestly after each card — Again, Hard, Good, or
                Easy. That rating schedules when the card comes back, from
                minutes away to months away, based on how well you actually
                know it.
              </p>

              <div className="lfn-practice-header">
                <select
                  className="lfn-scope-select"
                  value={practiceScope}
                  onChange={(e) => handleScopeChange(e.target.value)}
                >
                  <option value="all">All topics</option>
                  {categories
                    .filter((c) => c.quiz && c.quiz.length > 0)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                </select>
              </div>

              <div className="lfn-progress-line">
                {counts.mastered} / {counts.total} cards graduated to
                long-term review in this set
              </div>

              {currentQuizItem ? (
                <QuizCard
                  item={currentQuizItem}
                  card={currentCard}
                  scheduler={scheduler}
                  onResult={handleQuizResult}
                />
              ) : (
                <div className="lfn-quiz-card lfn-quiz-caughtup">
                  <div>
                    <div className="lfn-quiz-prompt">You're all caught up here.</div>
                    <p className="lfn-practice-empty">
                      {upcomingDue
                        ? `Next card is due in about ${humanizeInterval(new Date(), upcomingDue)}.`
                        : "No quiz cards in this set yet."}
                    </p>
                  </div>
                  {upcomingDue ? (
                    <div className="lfn-quiz-controls">
                      <button
                        type="button"
                        className="lfn-show-btn"
                        onClick={handleReviewAhead}
                      >
                        Review ahead anyway
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          ) : activeCategory === CUSTOM_CATEGORY_ID ? (
            <section className="lfn-category active">
              <h2>My snippets</h2>
              <p className="lfn-intro">
                Everything you save from any lesson lands here too, grouped by
                where it came from.
              </p>

              {userSnippets.length === 0 ? (
                <p className="lfn-empty-note">
                  Nothing saved yet. Add your first snippet below.
                </p>
              ) : (
                Object.entries(
                  userSnippets.reduce((acc, s) => {
                    (acc[s.categoryLabel] = acc[s.categoryLabel] || []).push(s);
                    return acc;
                  }, {})
                ).map(([label, snippets]) => (
                  <div key={label}>
                    <h3 className="lfn-subheading">{label}</h3>
                    {snippets.map((s) => (
                      <SnippetCard
                        key={s.id}
                        snippet={s}
                        onDelete={() => handleDeleteSnippet(s.id)}
                      />
                    ))}
                  </div>
                ))
              )}

              <AddSnippetForm
                categories={categories}
                defaultCategoryId={categories[0] ? categories[0].id : ""}
                onAdd={handleAddSnippet}
                storageOk={storageOk}
              />
            </section>
          ) : activeCat ? (
            <section className="lfn-category active">
              <h2>
                <span>{activeCat.label}</span>
                {activeCat.quiz && activeCat.quiz.length > 0 ? (
                  <button
                    type="button"
                    className="lfn-practice-topic-link"
                    onClick={() => enterPractice(activeCat.id)}
                  >
                    Practice this topic →
                  </button>
                ) : null}
              </h2>
              <p className="lfn-intro">{activeCat.intro}</p>

              <RulesBox rules={activeCat.rules} />

              {activeCat.snippets.map((s, i) => (
                <SnippetCard key={activeCat.id + "-" + i} snippet={s} />
              ))}

              {userSnippetsForCategory(activeCat.id).map((s) => (
                <SnippetCard
                  key={s.id}
                  snippet={s}
                  onDelete={() => handleDeleteSnippet(s.id)}
                />
              ))}

              <AddSnippetForm
                categories={categories}
                defaultCategoryId={activeCat.id}
                onAdd={handleAddSnippet}
                storageOk={storageOk}
              />
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default function LatexFieldNotes(props) {
  return (
    <LfnErrorBoundary>
      <LatexFieldNotesInner {...props} />
    </LfnErrorBoundary>
  );
}

// ===================================================================
// Scoped CSS
// All selectors nested under .lfn-root — no leaking into the host
// app. Tokens are CSS custom properties set on .lfn-root via the
// THEME object above, so dark/light switching is a single style swap.
// ===================================================================

const CSS_TEXT = `
.lfn-root { all: initial; }
.lfn-root, .lfn-root *, .lfn-root *::before, .lfn-root *::after { box-sizing: border-box; }
.lfn-root {
  display: block;
  background: var(--lfn-paper);
  color: var(--lfn-ink);
  font-family: var(--lfn-font-serif);
  line-height: 1.6;
  font-size: 16px;
}
.lfn-root code, .lfn-root pre, .lfn-root .lfn-inline-code,
.lfn-root select, .lfn-root input, .lfn-root textarea, .lfn-root button {
  font-family: var(--lfn-font-mono);
}
.lfn-root button { cursor: pointer; }
.lfn-root :focus-visible { outline: 2px solid var(--lfn-blue); outline-offset: 2px; }

.lfn-app { display: grid; grid-template-columns: var(--lfn-sidebar-width) 1fr; min-height: 100vh; }

.lfn-masthead {
  grid-column: 1 / -1;
  border-bottom: 2px solid var(--lfn-rule);
  padding: 24px 32px 18px;
  display: flex; align-items: baseline; justify-content: space-between;
  flex-wrap: wrap; gap: 10px;
  background: var(--lfn-paper-dim);
}
.lfn-masthead h1 { margin: 0; font-size: 1.7rem; font-weight: 700; letter-spacing: -0.01em; font-family: var(--lfn-font-serif); }
.lfn-masthead h1 .lfn-rubric { color: var(--lfn-accent); font-style: italic; font-weight: 400; font-size: 1.1rem; }
.lfn-masthead p { margin: 4px 0 0; color: var(--lfn-ink-soft); font-size: 0.92rem; max-width: 52ch; font-family: var(--lfn-font-serif); }

.lfn-sidebar {
  border-right: 1px solid var(--lfn-rule);
  padding: 16px 0;
  position: sticky; top: 0; align-self: start;
  height: 100vh; overflow-y: auto;
  background: var(--lfn-paper-dim);
}
.lfn-sidebar-label {
  font-family: var(--lfn-font-mono); font-size: 0.68rem; letter-spacing: 0.06em;
  color: var(--lfn-ink-soft); padding: 14px 20px 5px; text-transform: uppercase;
}
.lfn-practice-btn {
  display: block; width: calc(100% - 20px); margin: 0 10px 10px; text-align: left;
  background: var(--lfn-accent); color: #fff; border: none; border-radius: var(--lfn-radius);
  padding: 10px 14px; font-family: var(--lfn-font-mono); font-size: 0.82rem; font-weight: 700;
  letter-spacing: 0.02em; transition: opacity 0.15s;
}
.lfn-practice-btn:hover { opacity: 0.85; }
.lfn-practice-btn.active { outline: 2px solid var(--lfn-accent); outline-offset: 2px; }

.lfn-navlink {
  display: block; width: 100%; text-align: left; background: none; border: none;
  border-left: 3px solid transparent; padding: 8px 20px; font-family: var(--lfn-font-serif);
  font-size: 0.93rem; color: var(--lfn-ink-soft); transition: background 0.1s, color 0.1s;
}
.lfn-navlink:hover { color: var(--lfn-ink); background: rgba(128,128,128,0.08); }
.lfn-navlink.active {
  color: var(--lfn-ink); border-left-color: var(--lfn-accent);
  background: rgba(128,128,128,0.1); font-weight: 600;
}
.lfn-navcount { color: var(--lfn-ink-soft); font-size: 0.78rem; margin-left: 5px; }

.lfn-main { padding: 32px 44px 80px; max-width: 800px; }
.lfn-category h2 {
  font-size: 1.4rem; margin: 0 0 6px; border-bottom: 1px solid var(--lfn-rule);
  padding-bottom: 10px; display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
}
.lfn-category > .lfn-intro { color: var(--lfn-ink-soft); margin: 10px 0 20px; max-width: 62ch; font-size: 0.95rem; }
.lfn-subheading { font-size: 0.95rem; color: var(--lfn-ink-soft); margin: 20px 0 10px; }

.lfn-practice-topic-link {
  font-family: var(--lfn-font-mono); font-size: 0.72rem; background: none;
  border: 1px solid var(--lfn-rule); color: var(--lfn-ink-soft); padding: 4px 10px;
  white-space: nowrap; border-radius: var(--lfn-radius); transition: border-color 0.15s, color 0.15s;
}
.lfn-practice-topic-link:hover { border-color: var(--lfn-accent); color: var(--lfn-accent); }

.lfn-rules-box {
  border-left: 3px solid var(--lfn-blue); background: var(--lfn-blue-soft);
  padding: 12px 16px; margin-bottom: 24px; border-radius: var(--lfn-radius);
}
.lfn-rules-heading {
  margin: 0 0 8px; font-size: 0.82rem; color: var(--lfn-blue); font-weight: 700;
  font-family: var(--lfn-font-mono); letter-spacing: 0.04em; text-transform: uppercase;
}
.lfn-rules-list { margin: 0; padding-left: 18px; }
.lfn-rules-list li { margin-bottom: 6px; font-size: 0.91rem; }
.lfn-rules-list li:last-child { margin-bottom: 0; }
.lfn-inline-code { background: rgba(128,128,128,0.15); padding: 1px 5px; font-size: 0.84em; border-radius: 3px; }

.lfn-snippet { margin-bottom: 22px; border: 1px solid var(--lfn-rule); background: var(--lfn-surface); border-radius: var(--lfn-radius); overflow: hidden; }
.lfn-snippet-head {
  display: flex; align-items: center; justify-content: space-between; padding: 9px 13px;
  border-bottom: 1px solid var(--lfn-rule); background: var(--lfn-paper-dim);
}
.lfn-snippet-title { font-weight: 600; font-size: 0.92rem; font-family: var(--lfn-font-serif); }
.lfn-snippet-note { font-size: 0.83rem; color: var(--lfn-ink-soft); padding: 7px 13px 0; }
.lfn-copy-btn {
  font-family: var(--lfn-font-mono); font-size: 0.72rem; letter-spacing: 0.03em;
  border: 1px solid var(--lfn-rule); background: var(--lfn-surface); color: var(--lfn-ink-soft);
  padding: 4px 10px; border-radius: var(--lfn-radius); transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.lfn-copy-btn:hover { background: var(--lfn-accent); border-color: var(--lfn-accent); color: #fff; }
.lfn-copy-btn.is-copied { background: var(--lfn-green); border-color: var(--lfn-green); color: #fff; }
.lfn-copy-btn.is-failed { border-color: var(--lfn-accent); color: var(--lfn-accent); }
.lfn-pre {
  margin: 0; padding: 13px; background: var(--lfn-code-bg); color: var(--lfn-code-text);
  overflow-x: auto; font-size: 0.84rem; line-height: 1.55; white-space: pre;
}
.lfn-preview {
  border-top: 1px solid var(--lfn-rule); padding: 12px 14px; background: var(--lfn-surface);
  overflow-x: auto;
}
.lfn-preview-label {
  font-family: var(--lfn-font-mono); font-size: 0.65rem; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--lfn-ink-soft); margin-bottom: 8px;
}
.lfn-del-btn {
  font-size: 0.72rem; color: var(--lfn-accent); background: none; border: none;
  text-decoration: underline; padding: 7px 13px 10px; display: block;
  font-family: var(--lfn-font-mono);
}

.lfn-add-form { border: 1px dashed var(--lfn-rule); padding: 16px; margin-top: 8px; border-radius: var(--lfn-radius); }
.lfn-add-form h3 { margin-top: 0; font-size: 1rem; font-family: var(--lfn-font-serif); }
.lfn-add-form label { display: block; font-size: 0.78rem; color: var(--lfn-ink-soft); margin: 10px 0 3px; font-family: var(--lfn-font-mono); text-transform: uppercase; letter-spacing: 0.04em; }
.lfn-add-form input, .lfn-add-form textarea, .lfn-add-form select {
  width: 100%; padding: 7px 10px; border: 1px solid var(--lfn-rule); background: var(--lfn-paper);
  font-size: 0.87rem; color: var(--lfn-ink); border-radius: var(--lfn-radius);
}
.lfn-add-form textarea { min-height: 88px; resize: vertical; }
.lfn-checkbox-label { display: flex !important; align-items: center; gap: 8px; font-size: 0.82rem !important; text-transform: none !important; letter-spacing: 0 !important; }
.lfn-checkbox-label input { width: auto !important; }
.lfn-save-btn {
  margin-top: 14px; background: var(--lfn-accent); color: #fff; border: none;
  padding: 8px 18px; font-family: var(--lfn-font-mono); font-size: 0.8rem; border-radius: var(--lfn-radius);
  font-weight: 700; transition: opacity 0.15s;
}
.lfn-save-btn:hover { opacity: 0.85; }
.lfn-storage-warning { color: var(--lfn-amber); }
.lfn-empty-note { color: var(--lfn-ink-soft); font-style: italic; font-size: 0.9rem; }

.lfn-practice-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
.lfn-scope-select { font-family: var(--lfn-font-mono); font-size: 0.8rem; padding: 6px 10px; border: 1px solid var(--lfn-rule); background: var(--lfn-surface); color: var(--lfn-ink); border-radius: var(--lfn-radius); }
.lfn-progress-line { font-family: var(--lfn-font-mono); font-size: 0.75rem; color: var(--lfn-ink-soft); margin-bottom: 20px; }

.lfn-quiz-card {
  border: 1px solid var(--lfn-rule); background: var(--lfn-surface); padding: 24px 22px;
  min-height: 200px; display: flex; flex-direction: column; justify-content: space-between;
  border-radius: var(--lfn-radius);
}
.lfn-quiz-caughtup { justify-content: flex-start; gap: 16px; }
.lfn-quiz-topic-tag { font-family: var(--lfn-font-mono); font-size: 0.68rem; color: var(--lfn-accent); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
.lfn-quiz-prompt { font-size: 1.1rem; line-height: 1.55; margin-bottom: 12px; font-family: var(--lfn-font-serif); }
.lfn-hint-toggle { background: none; border: none; color: var(--lfn-blue); font-size: 0.8rem; text-decoration: underline; padding: 0; margin-bottom: 12px; display: block; font-family: var(--lfn-font-mono); }
.lfn-hint-text { font-size: 0.86rem; color: var(--lfn-ink-soft); margin: -4px 0 12px; font-style: italic; }
.lfn-quiz-answer { border-top: 1px dashed var(--lfn-rule); padding-top: 12px; margin-bottom: 12px; font-size: 1rem; }
.lfn-quiz-controls { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.lfn-quiz-controls button {
  font-family: var(--lfn-font-mono); font-size: 0.78rem; padding: 8px 14px; border: 1px solid var(--lfn-rule);
  background: var(--lfn-paper); color: var(--lfn-ink); border-radius: var(--lfn-radius);
  display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 60px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.lfn-quiz-controls button:disabled { opacity: 0.45; cursor: default; }
.lfn-rate-interval { font-size: 0.65rem; opacity: 0.7; }
.lfn-show-btn { border-color: var(--lfn-accent) !important; color: var(--lfn-accent) !important; }
.lfn-show-btn:hover { background: var(--lfn-accent) !important; color: #fff !important; }
.lfn-rate-again { border-color: var(--lfn-accent) !important; color: var(--lfn-accent) !important; }
.lfn-rate-again:hover { background: var(--lfn-accent) !important; color: #fff !important; }
.lfn-rate-hard { border-color: var(--lfn-amber) !important; color: var(--lfn-amber) !important; }
.lfn-rate-hard:hover { background: var(--lfn-amber) !important; color: #fff !important; }
.lfn-rate-good { border-color: var(--lfn-green) !important; color: var(--lfn-green) !important; }
.lfn-rate-good:hover { background: var(--lfn-green) !important; color: #fff !important; }
.lfn-rate-easy { border-color: var(--lfn-blue) !important; color: var(--lfn-blue) !important; }
.lfn-rate-easy:hover { background: var(--lfn-blue) !important; color: #fff !important; }
.lfn-practice-empty { color: var(--lfn-ink-soft); font-style: italic; font-size: 0.92rem; }

@media (max-width: 720px) {
  .lfn-app { grid-template-columns: 1fr; }
  .lfn-sidebar {
    position: static; height: auto; display: flex; flex-wrap: nowrap;
    overflow-x: auto; border-right: none; border-bottom: 1px solid var(--lfn-rule);
    padding: 8px 6px; background: var(--lfn-paper-dim);
  }
  .lfn-sidebar-label { display: none; }
  .lfn-practice-btn { width: auto; margin: 0 4px; white-space: nowrap; }
  .lfn-navlink { width: auto; white-space: nowrap; border-left: none; border-bottom: 3px solid transparent; padding: 8px 14px; }
  .lfn-navlink.active { border-bottom-color: var(--lfn-accent); border-left-color: transparent; }
  .lfn-main { padding: 20px 16px 60px; }
}

@media (prefers-reduced-motion: reduce) {
  .lfn-root * { transition: none !important; animation: none !important; }
}
`;
