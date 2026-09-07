#!/usr/bin/env python3
"""Convert src/docs/tutorials/css-masterclass/<module>/lesson-NN-*.md into
interactive course lessons at src/courses/css-masterclass/<chapter>/<order>-<slug>.js,
following src/docs/reference/CSS_LESSON_SCHEMA.md.

Unlike the Python/C++ series, these are NOT typeIt exercises — CSS demos are
about SEEING the render, not typing syntax from memory. So this reuses
JSNotebook (src/components/notebooks/JSNotebook.jsx), the same three-tab
HTML/CSS/JS + live-preview component already used ~113 times across other
courses (see src/courses/web/1-the-web-as-a-system/001-what-is-a-web-page.js
for the wiring: {id:'JSNotebook', props:{lesson:{title,subtitle,cells}}}).
Each cell's html/css/js is PRE-FILLED boilerplate the learner can edit and
re-run — never emptied out.

Two lesson "flavors" live side by side in this folder, both internally
100% consistent (confirmed by grepping every file, not just a sample):
  - SIMPLE (5 modules, 17 lessons): exactly 11 '## N. Title' sections.
  - CANONICAL (18 modules, 43 lessons): exactly 20 '# N. Title' sections
    plus a '## 0. PREAMBLE' — this is the flavor CSS_LESSON_SCHEMA.md
    actually documents section-by-section.
Both module-folder sets independently start numbering at "01-", so a
lesson's true position is its (module folder, lesson file) pair, not the
leading digits alone. Section extraction below keys off keyword matching
in the heading TEXT (ignoring the leading "N."), which works identically
for both flavors and both heading levels ('#' or '##') — including the
5 sections that only exist in the canonical 20-section schema (Preamble,
Complete Feature Surface, Visual Mental Models, Real Project Integration,
Mastery Challenge), which resolve to empty finds (and are filtered out of
the callouts list) on the simple track's lessons.

Run: python scripts/convert_css_lessons.py --module 01-the-box-model [--dry-run] [--only 1,2]
     python scripts/convert_css_lessons.py --list-modules
"""
import argparse
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def read_text_long(path):
    """Some canonical-track filenames (module dir + long descriptive
    lesson filename) push the absolute path past Windows' 260-char
    MAX_PATH, which plain Path.read_text() rejects with FileNotFoundError
    even though the file demonstrably exists. The '\\\\?\\' prefix opts
    into the Win32 long-path API and sidesteps the limit."""
    if os.name == "nt":
        long_path = "\\\\?\\" + os.path.abspath(str(path))
        return open(long_path, encoding="utf-8").read()
    return path.read_text(encoding="utf-8")
SRC_DIR = ROOT / "src" / "docs" / "tutorials" / "css-masterclass"
COURSES_DIR = ROOT / "src" / "courses"


def slugify(text):
    text = re.sub(r"[`*_]", "", text)
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text


def js_string(s):
    s = s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    return f"'{s}'"


def escape_angle_brackets(text):
    """Same rationale as convert_cpp_lessons.py: bare '<' outside a code
    span/fence gets misread as an HTML tag by the callout body's
    react-markdown pass. CSS content is FULL of this (<div>, <p>, generic
    selectors) so this matters even more here than in the C++ scripts.

    Only '<' needs escaping — a lone '>' is inert on its own (no tag was
    opened for it to close) and escaping it too was actively harmful: the
    canonical track's Decision Guide / Mastery Challenge sections use
    markdown blockquotes ('> **I want...**'), and blanket-escaping their
    leading '>' into '&gt;' turned real blockquotes into literal text."""
    fence_parts = re.split(r"(```[a-zA-Z]*\n.*?\n```)", text, flags=re.DOTALL)
    out = []
    for part in fence_parts:
        if part.startswith("```"):
            out.append(part)
            continue
        span_parts = re.split(r"(`[^`\n]*`)", part)
        escaped = [
            sp if sp.startswith("`") and sp.endswith("`") and len(sp) >= 2
            else sp.replace("<", "&lt;")
            for sp in span_parts
        ]
        out.append("".join(escaped))
    return "".join(out)


def normalize_preserving_blocks(text):
    """Collapse whitespace in plain prose but leave fenced code AND markdown
    tables completely untouched — both need their internal newlines to
    render as anything but a run-on paragraph (confirmed pattern from the
    C++ scripts' 'melded paragraph' bug: MarkdownProse needs the real
    structure preserved, not whitespace-collapsed)."""
    # Split out fenced blocks first.
    parts = re.split(r"(```[a-zA-Z]*\n.*?\n```)", text, flags=re.DOTALL)
    out = []
    for part in parts:
        if part.startswith("```"):
            out.append("\n\n" + part.strip() + "\n\n")
            continue
        # Within non-fenced text, keep "own-line" constructs intact —
        # table rows, headings, and bullet/numbered/checkbox list items all
        # need their own line to render as anything but running prose text
        # merged into whatever paragraph happened to precede them (this is
        # exactly what broke the "### `width` / `height`" sub-headers in
        # the Complete Grammar section: collapsed onto the same line as the
        # following bullet, so it stopped being a heading at all). Ordinary
        # paragraph text still gets collapsed and joined with spaces.
        lines = part.split("\n")
        buf = []
        para = []

        def flush():
            if para:
                buf.append(escape_angle_brackets(re.sub(r"\s+", " ", " ".join(para)).strip()))
                para.clear()

        for line in lines:
            stripped = line.strip()
            is_table_line = stripped.startswith("|") and stripped.endswith("|")
            is_heading = bool(re.match(r"^#{1,6}\s+\S", stripped))
            is_list_item = bool(re.match(r"^(?:[-*]\s+|\d+\.\s+)\S", stripped))
            is_blockquote = stripped.startswith(">")
            if is_table_line or is_heading:
                flush()
                buf.append(escape_angle_brackets(stripped))
            elif is_list_item or is_blockquote:
                # Preserve the line's original leading whitespace (not just
                # its stripped text) — nested bullets in the source (e.g. a
                # sub-list of "display: none" vs "visibility: hidden" under
                # a parent bullet) rely on that indentation to stay nested
                # instead of flattening to the parent's list level.
                flush()
                buf.append(escape_angle_brackets(line.rstrip()))
            elif stripped:
                para.append(stripped)
            else:
                flush()
        flush()
        out.append("\n".join(b for b in buf if b))
    joined = "\n\n".join(o for o in out if o.strip())
    return re.sub(r"\n{3,}", "\n\n", joined).strip()


def split_numbered_sections(text):
    """Split on '# N. Title' or '## N. Title' headings (either level) —
    the two lesson flavors use different levels AND different numbering
    for the same concept, so callers match by keyword in the title, not
    position. Returns {normalized_title: body}."""
    parts = re.split(r"^#{1,2}\s*(\d+)\.\s+(.+?)\s*$", text, flags=re.MULTILINE)
    sections = {}
    for i in range(1, len(parts), 3):
        if i + 2 >= len(parts):
            break
        title = parts[i + 1]
        body = parts[i + 2]
        key = re.sub(r"[:()]", "", title).strip().lower()
        sections[key] = body
    return sections


def find_section(sections, *keywords):
    for key, body in sections.items():
        for kw in keywords:
            if kw in key:
                # The canonical track separates every section with a
                # trailing '---' horizontal rule right before the next
                # heading; that rule ends up captured as part of THIS
                # section's body. Strip it so it doesn't render as a
                # dangling <hr> at the end of every callout.
                return re.sub(r"\n\s*-{3,}\s*$", "", body)
    return ""


def split_html_block(text):
    """Pull <style>/<script> content out of an ```html fenced example into
    separate css/js strings, and whatever's left (with doctype/html/head
    wrapper tags stripped if present) becomes the html — works whether the
    source is a full document or just a fragment with an inline <style>."""
    css_parts = re.findall(r"<style[^>]*>(.*?)</style>", text, re.DOTALL)
    js_parts = re.findall(r"<script[^>]*>(.*?)</script>", text, re.DOTALL)
    html = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL)
    body_m = re.search(r"<body[^>]*>(.*?)</body>", html, re.DOTALL)
    if body_m:
        html = body_m.group(1)
    html = re.sub(r"<!DOCTYPE[^>]*>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"</?(?:html|head|meta)[^>]*>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"<title>.*?</title>", "", html, flags=re.DOTALL)
    return html.strip("\n"), "\n".join(p.strip("\n") for p in css_parts), "\n".join(p.strip("\n") for p in js_parts)


def generate_fallback_html(css):
    """Some checkpoints show a bare <style> block with no markup at all —
    the reference element (usually a generic .box) was established earlier
    in the lesson and is just assumed. Synthesize a placeholder <div> per
    top-level class selector actually used in the CSS so the demo still
    renders something concrete rather than being dropped entirely."""
    classes, seen = [], set()
    for m in re.finditer(r"\.([a-zA-Z][\w-]*)\s*(?=[\s,{:.\[])", css):
        cls = m.group(1)
        if cls not in seen:
            seen.add(cls)
            classes.append(cls)
    if not classes:
        return '<div class="box">Box</div>'
    return "\n".join(f'<div class="{c}">{c}</div>' for c in classes[:6])


def extract_demo_cells(section_text, start_id):
    """'Prediction Checkpoints' and 'Interactive Experiments' both structure
    their content as '### Sub-title' blocks, each with an ```html fenced
    demo plus surrounding prose. Turn each into a JSNotebook cell — the
    demo pre-filled and editable (never emptied; these aren't typing
    exercises), the prose (question + explanation) as its instruction."""
    if not section_text.strip():
        return []
    parts = re.split(r"^###\s*(.+?)\s*$", section_text, flags=re.MULTILINE)
    cells = []
    cell_id = start_id
    for i in range(1, len(parts), 2):
        title = parts[i].strip()
        body = parts[i + 1] if i + 1 < len(parts) else ""
        m = re.search(r"```html\n(.*?)\n```", body, re.DOTALL)
        if m:
            html, css, js = split_html_block(m.group(1))
        else:
            # Some checkpoints show a bare ```css fence with no html/style
            # wrapper at all — the whole fence content IS the CSS.
            m = re.search(r"```css\n(.*?)\n```", body, re.DOTALL)
            if not m:
                continue
            html, css, js = "", m.group(1).strip("\n"), ""
        if not html.strip():
            if not css.strip():
                continue  # neither markup nor styles — nothing to demo
            html = generate_fallback_html(css)
        prose = (body[:m.start()] + body[m.end():]).strip()
        prose = normalize_preserving_blocks(prose)
        instruction = f"**{title}**\n\n{prose}" if prose else f"**{title}**"
        cell = {
            "id": cell_id,
            "type": "js",
            "instruction": instruction,
            "html": html,
            "css": css,
        }
        if js.strip():
            cell["startCode"] = js
        cells.append(cell)
        cell_id += 1
    return cells


def first_question_sentence(text):
    for sentence in re.split(r"(?<=[.?!])\s+", text):
        sentence = sentence.strip()
        if sentence.endswith("?"):
            return sentence
    return None


def extract_property_names(grammar_text):
    """Pull CSS property/selector names out of the Complete Grammar
    section's '### `name` / `name`' sub-headers for use as search tags."""
    names, seen = [], set()
    for m in re.finditer(r"^###\s*`([^`]+)`", grammar_text, re.MULTILINE):
        for part in re.split(r"\s*/\s*", m.group(1)):
            part = part.strip().strip("`").rstrip(":")
            if part and part not in seen:
                seen.add(part)
                names.append(part)
    return names


def build_callout(callout_type, title, body):
    body = body.strip()
    if not body:
        return None
    return f"""      {{
        type: {js_string(callout_type)},
        title: {js_string(title)},
        body: {js_string(normalize_preserving_blocks(body))},
      }},"""


def extract_checklist(text):
    if not text.strip():
        return []
    items = []
    for line in text.split("\n"):
        m = re.match(r"^\s*-\s*\[[ xX]\]\s*(.+?)\s*$", line)
        if m:
            items.append(escape_angle_brackets(m.group(1).strip()))
    return items


def js_cell(cell):
    lines = [f"              {{", f"                id: {cell['id']},"]
    if cell.get("type"):
        lines.append(f"                type: {js_string(cell['type'])},")
    if cell.get("instruction"):
        lines.append(f"                instruction: {js_string(cell['instruction'])},")
    if "html" in cell:
        lines.append(f"                html: {js_string(cell['html'])},")
    if cell.get("css"):
        lines.append(f"                css: {js_string(cell['css'])},")
    if cell.get("startCode"):
        lines.append(f"                startCode: {js_string(cell['startCode'])},")
    lines.append(f"                outputHeight: 180,")
    lines.append(f"              }},")
    return "\n".join(lines)


def process_lesson(path, module_title):
    text = read_text_long(path)

    title_m = re.search(r"^#\s*Lesson\s*\d+:\s*(.+?)\s*$", text, re.MULTILINE)
    title = re.sub(r"[`*]", "", title_m.group(1).strip()) if title_m else path.stem
    slug = slugify(title)

    sections = split_numbered_sections(text)

    mental_model = find_section(sections, "mental model")
    grammar = find_section(sections, "complete grammar", "complete language reference")
    evolution = find_section(sections, "syntax evolution", "evolution")
    error_recovery = find_section(sections, "error recovery", "invalid css", "invalid values")
    accessibility = find_section(sections, "accessibility")
    devtools_perf = find_section(sections, "devtools & performance")
    devtools_only = find_section(sections, "devtools investigation")
    performance_only = find_section(sections, "performance, runtime costs", "performance runtime costs")
    checkpoints = find_section(sections, "prediction checkpoints")
    experiments = find_section(sections, "interactive experiments")
    compare = find_section(sections, "compare similar features")
    decision_guide = find_section(sections, "decision guide")
    bugs = find_section(sections, "common bugs")
    browser_behavior = find_section(sections, "browser behavior")
    browser_algorithm = find_section(sections, "browser algorithm")
    interactions = find_section(sections, "interaction with other css")
    checklist_text = find_section(sections, "mastery checklist")
    # Canonical-track-only sections (absent — and harmlessly empty — on the
    # simple track's 11-section lessons): the 20-section schema in
    # CSS_LESSON_SCHEMA.md has real content here the keyword lookups above
    # never captured, which would otherwise silently drop it from output.
    preamble = find_section(sections, "preamble")
    feature_surface = find_section(sections, "complete feature surface")
    visual_models = find_section(sections, "visual mental models")
    real_project = find_section(sections, "real project integration")
    mastery_challenge = find_section(sections, "mastery challenge")

    # The canonical (dense) lessons' Mental Model sections run 2000+ chars —
    # too long for the hook/roadmap text. Truncate at the nearest sentence
    # boundary at-or-before the budget rather than mid-word/mid-sentence.
    collapsed = re.sub(r"\s+", " ", mental_model).strip()
    build_text = collapsed
    if len(collapsed) > 900:
        sentences = re.split(r"(?<=[.?!])\s+", collapsed)
        acc = ""
        for s in sentences:
            if acc and len(acc) + len(s) > 900:
                break
            acc = f"{acc} {s}".strip()
        build_text = acc or collapsed[:900]
    build_text = escape_angle_brackets(build_text)

    cells = []
    cells += extract_demo_cells(checkpoints, 1)
    cells += extract_demo_cells(experiments, len(cells) + 1)

    callouts = [c for c in [
        build_callout("tip", "Before You Start: Prerequisites & Dependencies", preamble),
        build_callout("definition", "Complete Grammar", grammar),
        build_callout("definition", "Complete Feature Surface", feature_surface),
        build_callout("warning", "CSS Parsing & Error Recovery", error_recovery),
        build_callout("real-world", "Accessibility (A11y)", accessibility),
        build_callout("procedure", "DevTools & Performance", devtools_perf),
        build_callout("procedure", "DevTools Investigation", devtools_only),
        build_callout("application", "Performance, Runtime Costs & Security", performance_only),
        build_callout("geometric", "Visual Mental Model", visual_models),
        build_callout("strategy", "Compare Similar Features", compare),
        build_callout("strategy", "Decision Guide", decision_guide),
        build_callout("misconception", "Common Bugs & Edge Cases", bugs),
        build_callout("application", "Real Project Integration", real_project),
        build_callout("insight", "Mastery Challenge", mastery_challenge),
    ] if c]

    rigor_prose = [
        escape_angle_brackets(normalize_preserving_blocks(p)) for p in
        [evolution, browser_behavior, browser_algorithm, interactions] if p.strip()
    ]

    checklist = extract_checklist(checklist_text)
    if not checklist:
        checklist = [escape_angle_brackets(f"Review the key ideas in {title} before moving on.")]

    properties = extract_property_names(grammar)

    return {
        "title": title, "slug": slug, "module_title": module_title,
        "build_text": build_text, "cells": cells, "callouts": callouts,
        "rigor_prose": rigor_prose, "checklist": checklist,
        "properties": properties,
    }


def emit_js(course_id, lesson_num, result, chapter, order, module_slug, next_title):
    title = result["title"]
    slug = result["slug"]

    def cell_js_join():
        # js_cell() already emits its own trailing comma per cell — joining
        # with ",\n" here too silently produced "},," (a valid-but-wrong
        # array elision inserting an undefined cell, not a syntax error, so
        # `node --check` never caught it — confirmed live, only found by
        # actually reading the generated output).
        return "\n".join(js_cell(c) for c in result["cells"])

    cells_js = cell_js_join()
    callouts_js = "\n".join(result["callouts"])
    rigor_js = ",\n      ".join(js_string(p) for p in result["rigor_prose"])
    checklist_js = ",\n    ".join(js_string(c) for c in result["checklist"])

    viz_block = ""
    if result["cells"]:
        viz_block = f"""      {{
        id: 'JSNotebook',
        title: {js_string(f"Hands-On: {title}")},
        caption: 'Edit any tab and click Run to see it render live.',
        props: {{
          lesson: {{
            title: {js_string(title)},
            subtitle: 'Pre-filled boilerplate — edit it and click Run.',
            cells: [
{cells_js}
            ],
          }},
        }},
      }},"""

    future_link = (
        js_string(f"Next lesson: {next_title}.") if next_title
        else js_string("This is the final lesson in this module — nice work.")
    )

    return f"""// {course_id} — {result['module_title']} — Lesson {lesson_num}: {title}
// Auto-converted from src/docs/tutorials/css-masterclass/{module_slug}/*.md
// by scripts/convert_css_lessons.py — see that script for the section mapping.
// Live demos render through JSNotebook (the same HTML/CSS/JS three-tab +
// preview component used across the web/canvas/design courses) — boilerplate
// is pre-filled and editable, never emptied out (these aren't typing drills).

export default {{
  id: '{course_id}-{lesson_num:03d}-{slug}',
  slug: {js_string(slug)},
  chapter: {chapter},
  order: {order},
  title: {js_string(title)},
  subtitle: {js_string(result['module_title'])},
  tags: [{", ".join(js_string(t) for t in ([slugify(title)] + [slugify(p) for p in result["properties"][:6]]))}],

  hook: {{
    question: {js_string(first_question_sentence(result['build_text']) or f'What is "{title}", and why does it matter?')},
    realWorldContext: {js_string(result['build_text'])},
    previewVisualizationId: 'JSNotebook',
  }},

  intuition: {{
    prose: [
      {js_string(result['build_text'])},
    ],
    callouts: [
{callouts_js}
    ],
    visualizations: [
{viz_block}
    ],
  }},

  math: {{ prose: [], callouts: [], visualizations: [] }},

  rigor: {{
    prose: [
      {rigor_js}
    ],
    callouts: [],
    visualizations: [],
  }},

  examples: [],
  challenges: [],
  semantics: {{ core: [] }},

  spiral: {{
    recoveryPoints: [
      'If the live preview doesn\\'t match what you expected, open the CSS tab and change one property at a time.',
      'Use your browser\\'s own DevTools (right-click -> Inspect) on the rendered preview to see the real computed values.',
    ],
    futureLinks: [
      {future_link},
    ],
  }},

  quiz: [],

  mentalModel: [
    {checklist_js}
  ],

  checkpoints: ['read-intuition'],
}}
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", help="module folder name, e.g. 01-the-box-model")
    parser.add_argument("--list-modules", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only", type=str, default="")
    parser.add_argument("--course", default="css-masterclass")
    parser.add_argument("--chapter", type=int, default=1)
    args = parser.parse_args()

    if args.list_modules:
        for d in sorted(SRC_DIR.iterdir()):
            if d.is_dir():
                print(d.name, "-", len(list(d.glob("*.md"))), "lessons")
        return

    if not args.module:
        print("Pass --module <folder-name> or --list-modules", file=sys.stderr)
        sys.exit(1)

    module_dir = SRC_DIR / args.module
    if not module_dir.exists():
        print(f"No such module folder: {module_dir}", file=sys.stderr)
        sys.exit(1)

    module_title = args.module.split("-", 1)[1].replace("-", " ").title() if "-" in args.module else args.module
    lesson_files = sorted(module_dir.glob("lesson-*.md"), key=lambda p: int(re.search(r"\d+", p.stem).group()))
    lesson_nums = [int(re.search(r"\d+", p.stem).group()) for p in lesson_files]
    paths = dict(zip(lesson_nums, lesson_files))

    only = {int(x) for x in args.only.split(",") if x.strip()} if args.only else None

    titles = {}
    for n, p in paths.items():
        text = read_text_long(p)
        m = re.search(r"^#\s*Lesson\s*\d+:\s*(.+?)\s*$", text, re.MULTILINE)
        titles[n] = re.sub(r"[`*]", "", m.group(1).strip()) if m else p.stem

    module_slug = slugify(module_title)
    out_dir = COURSES_DIR / args.course
    chapter_dir = out_dir / f"{args.chapter}-{module_slug}"

    for order, n in enumerate(lesson_nums, start=1):
        if only and n not in only:
            continue
        next_title = titles.get(n + 1)
        result = process_lesson(paths[n], module_title)
        js = emit_js(args.course, n, result, args.chapter, order, args.module, next_title)

        out_path = chapter_dir / f"{order:03d}-{result['slug']}.js"
        print(
            f"lesson {n:02d} -> {out_path.relative_to(ROOT)}  "
            f"({len(result['cells'])} cells, {len(result['callouts'])} callouts, "
            f"{len(result['rigor_prose'])} rigor, {len(result['checklist'])} checklist)"
        )
        if not args.dry_run:
            chapter_dir.mkdir(parents=True, exist_ok=True)
            out_path.write_text(js, encoding="utf-8")


if __name__ == "__main__":
    main()
