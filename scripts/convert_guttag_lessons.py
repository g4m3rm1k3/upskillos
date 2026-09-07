#!/usr/bin/env python3
"""Convert src/docs/tutorials/guttag-python/lesson-NN.md into interactive
course lessons at src/courses/guttag-python/<chapter>/<order>-<slug>.js.

Why a script instead of hand-authoring: every lesson in this series already
follows the same rigid "Concept Unit" template (Problem -> code example ->
CS lens -> SE lens -> connecting sentence). Lessons 00-05 were hand-written
to establish the target format; everything from lesson 06 on is a mechanical
reshaping of content that's already well-written in the markdown, not a
rewrite. Each concept unit becomes one `typeIt` notebook cell: the source's
example code becomes the read-only reference (`solution`), the editor starts
empty, and the source's own prose (Problem/explanation/CS lens/SE lens)
becomes the cell's prose. No testCode/challenges are auto-generated — the
source's expected-output style is too inconsistent across 48 files (inline
comments, "Output:" fences, "Predicted confidently: `x`") to safely turn into
grading logic; getting that wrong (telling a correct learner "ERROR") is
worse than not grading at all. Quiz questions ARE auto-generated, from the
lesson's own "Terms used in this lesson" list (definitions already written,
distractors pulled from other terms in the same lesson) — that's mechanical
and reliable because it reuses real text instead of inventing anything.

Run: python scripts/convert_guttag_lessons.py [--dry-run] [--only 12,13]
"""
import argparse
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "src" / "docs" / "tutorials" / "guttag-python"
OUT_DIR = ROOT / "src" / "courses" / "guttag-python"

# (first_lesson, last_lesson, chapter_number, chapter_slug, chapter_title)
MODULES = [
    (6, 14, 2, "core-data-structures", "Data: Python's Core Structures"),
    (15, 21, 3, "writing-good-programs", "Writing Good Programs"),
    (22, 28, 4, "classes-and-oop", "Classes and OOP"),
    (29, 36, 5, "algorithms-and-complexity", "Algorithms and Complexity"),
    (37, 42, 6, "stochastic-simulation", "Stochastic Thinking and Simulation"),
    (43, 47, 7, "machine-learning", "Machine Learning"),
]


def module_for(n):
    for lo, hi, chapter, slug, title in MODULES:
        if lo <= n <= hi:
            return chapter, slug, title
    raise ValueError(f"lesson {n} not in any module range")


def slugify(text):
    text = re.sub(r"[`*_]", "", text)
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text


def js_string(s):
    """Single-quoted JS string literal, safe for arbitrary source text."""
    s = s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    return f"'{s}'"


def extract_build_text(text):
    m = re.search(
        r"(?:\*\*What you will build\*\*\s*\n|What you will build:\s*)"
        r"(.+?)(?=\n\s*\n|\n\*\*What you need|\nWhat you need)",
        text,
        re.DOTALL,
    )
    if not m:
        return ""
    return re.sub(r"\s+", " ", m.group(1)).strip()


def _clean_heading(line):
    """Strip #/*/: markup from a line so header variants compare equal:
    '## Terms used in this lesson', '**Terms used in this lesson:**',
    'Terms used in this lesson', '**Terms used in this lesson**' all reduce
    to 'terms used in this lesson'."""
    return re.sub(r"[#*:]", "", line).strip().lower()


def extract_terms(text):
    lines = text.split("\n")
    start = end = None
    for i, line in enumerate(lines):
        cleaned = _clean_heading(line)
        if start is None and cleaned == "terms used in this lesson":
            start = i + 1
            continue
        if start is not None and end is None:
            if cleaned == "objects and methods used" or line.strip().startswith("##"):
                end = i
                break
    if start is None:
        return []
    if end is None:
        end = len(lines)

    terms = []
    # Bullet marker is optional — some lessons write bare "**Term** — def."
    # paragraphs instead of a "- **Term** — def." list.
    for i, line in enumerate(lines[start:end]):
        tm = re.match(r"^\s*(?:[-*]\s*)?\*\*(.+?)\*\*\s*[—-]\s*(.+?)\s*$", line)
        if tm:
            term, definition = tm.group(1).strip(), tm.group(2).strip()
        else:
            # A handful of lessons write terms in the same nested style as
            # "Objects and methods used": "- **Term**:" with the actual
            # definition one line down as "  - *What it is*: ...".
            tm2 = re.match(r"^\s*[-*]\s*\*\*(.+?)\*\*:\s*$", line)
            if not tm2:
                continue
            term = tm2.group(1).strip()
            next_line = lines[start:end][i + 1] if i + 1 < len(lines[start:end]) else ""
            wm = re.match(r"^\s*[-*]\s*\*[^*]+\*:\s*(.+?)\s*$", next_line)
            if not wm:
                continue
            definition = wm.group(1).strip()
        term = re.sub(r"[`*]", "", term)
        definition = re.sub(r"[`*]", "", definition)
        terms.append((term, definition))
    return terms


def extract_objects(text):
    """'Objects and methods used' lists built-ins/methods each with a nested
    What it is / Implementation / Its use / Type / ... breakdown. Reduced to
    one line each (the 'What it is' field, falling back to 'Its use') for a
    bundled glossary callout, same treatment as extract_terms."""
    lines = text.split("\n")
    start = end = None
    for i, line in enumerate(lines):
        cleaned = _clean_heading(line)
        if start is None and cleaned == "objects and methods used":
            start = i + 1
            continue
        if start is not None and end is None and line.strip().startswith("##"):
            end = i
            break
    if start is None:
        return []
    if end is None:
        end = len(lines)

    objects = []
    name = None
    definition = None
    for line in lines[start:end]:
        nm = re.match(r"^\s*(?:[-*]\s*)?\*\*`?([^`*]+?)`?\*\*:?\s*$", line)
        if nm:
            if name and definition:
                objects.append((name, definition))
            name, definition = nm.group(1).strip(), None
            continue
        if name and definition is None:
            fm = re.match(r"^\s*[-*]\s*\*([^*]+)\*:?\s*(.+?)\s*$", line)
            if fm:
                label = re.sub(r"[:]", "", fm.group(1)).strip().lower()
                if label in ("what it is", "its use"):
                    definition = fm.group(2).strip()
    if name and definition:
        objects.append((name, definition))
    return [(re.sub(r"[`*]", "", n), re.sub(r"[`*]", "", d)) for n, d in objects]


def _closing_fallback_from_last_unit(text):
    """A few lessons have no top-level Closing/Connect-the-pieces section at
    all — the synthesis, if any, is just the last concept unit's own closing
    sub-header under a different name (lesson 20: 'Connecting to the next
    step'; lesson 31: 'Connect the Pieces' as the unit's own last sub-header)."""
    units = split_concept_units(text)
    if not units:
        return ""
    last_subs = split_subsections(units[-1][1])
    content = find_sub(
        last_subs,
        "connect the pieces", "one sentence connecting",
        "connecting to the next step", "connecting to what", "connection",
    )
    return re.sub(r"\s+", " ", content).strip()


def extract_closing(text):
    """The lesson's wrap-up synthesis appears under wildly different headings
    across the series: '## Closing' (sometimes with a '### Connect the
    pieces' sub-header, sometimes with the content directly below it, no
    sub-header at all), '## Connect the pieces' used AS the top-level
    heading itself, or '## Series Retrospective' (the final, capstone
    lesson). Take whichever of these appears LAST in the document — some
    lessons also use one of these phrases earlier as a per-unit sub-header,
    which isn't the lesson-level closing."""
    heading_re = re.compile(
        r"^##\s*(?:Closing|Connect(?:ing)? the [Pp]ieces|Series Retrospective).*$",
        re.MULTILINE,
    )
    matches = list(heading_re.finditer(text))
    if not matches:
        return _closing_fallback_from_last_unit(text)

    section = text[matches[-1].end():]
    section = re.split(r"^##\s", section, flags=re.MULTILINE)[0]

    subs = split_subsections(section)
    content = find_sub(subs, "connect the pieces", "putting it", "wrapping up")
    if not content:
        # No ### sub-header inside this section — the section IS the content
        # (some lessons put the synthesis paragraph directly under '## Closing').
        content = section
    # Strip a leading "- **Connect the pieces** — " bullet marker some
    # lessons use instead of a proper ### sub-header.
    content = re.sub(r"^\s*-\s*\*\*[^*]+\*\*\s*[—-]\s*", "", content.strip())
    return re.sub(r"\s+", " ", content).strip()


def split_concept_units(text):
    parts = re.split(r"^##\s*Concept Unit:\s*(.+?)\s*$", text, flags=re.MULTILINE)
    # parts[0] is preamble; then alternating (name, body)
    units = []
    for i in range(1, len(parts), 2):
        name = re.sub(r"[`*]", "", parts[i]).strip()
        body = parts[i + 1] if i + 1 < len(parts) else ""
        # Trim off a trailing closing/wrap-up section if it leaked into the
        # last unit — it's used under several different headings (see
        # extract_closing's docstring for the full list).
        body = re.split(
            r"^##\s*(?:Closing|Connect(?:ing)? the [Pp]ieces|Series Retrospective)",
            body, flags=re.MULTILINE,
        )[0]
        units.append((name, body))
    return units


def split_subsections(unit_body):
    parts = re.split(r"^###\s*(.+?)\s*$", unit_body, flags=re.MULTILINE)
    subs = {}
    for i in range(1, len(parts), 2):
        key = parts[i].strip().lower().rstrip(".")
        val = parts[i + 1] if i + 1 < len(parts) else ""
        subs[key] = val.strip()
    return subs


def find_sub(subs, *prefixes):
    """A handful of lessons rename ### sub-headers (e.g. lesson 20 uses
    'Isolate the Concept' instead of 'Introduce the concept in isolation',
    and 'Connecting to the next step' instead of 'One sentence connecting...').
    Accept any of several known variants for the same slot."""
    for key, val in subs.items():
        for prefix in prefixes:
            if key.startswith(prefix):
                return val
    return ""


def extract_code_and_explanation(intro_section):
    m = re.search(r"```[a-zA-Z]*\n(.*?)\n```", intro_section, re.DOTALL)
    if not m:
        return None, "", None
    code = m.group(1).strip("\n")
    remainder = intro_section[m.end():]

    output_block = None
    om = re.search(r"\*\*Output:?\*\*\s*```[a-zA-Z]*\n(.*?)\n```", remainder, re.DOTALL)
    if om:
        output_block = om.group(1).strip("\n")
        remainder = remainder[:om.start()] + remainder[om.end():]

    explanation = re.sub(r"\s+", " ", remainder).strip()
    return code, explanation, output_block


def extract_walkthrough(subs):
    """'Mechanical walkthrough' explains the example line by line — it's the
    part that actually teaches the code, not just why it matters. Lessons
    write it as either a '- ' bullet list or a '1.'/'2.' numbered list
    (lesson 20 and a few others); normalize both to '- ' so the notebook's
    prose renderer (which only special-cases lines starting with '- ')
    reliably renders it as a list instead of one run-on paragraph."""
    raw = find_sub(subs, "mechanical walkthrough")
    if not raw:
        return ""
    lines = []
    for line in raw.split("\n"):
        line = line.strip()
        if not line:
            continue
        line = re.sub(r"^\d+\.\s+", "- ", line)
        line = re.sub(r"^[*]\s+", "- ", line)
        lines.append(line)
    return "\n".join(lines)


def first_question_sentence(text):
    for sentence in re.split(r"(?<=[.?!])\s+", text):
        sentence = sentence.strip()
        if sentence.endswith("?"):
            return re.sub(r"^\*Socratic prompt:\*\s*", "", sentence).strip()
    return None


def build_cells(units):
    cells = []
    cell_id = 0
    for name, body in units:
        subs = split_subsections(body)
        problem = re.sub(r"\s+", " ", find_sub(subs, "the problem")).strip()
        intro = find_sub(subs, "introduce the concept", "isolate the concept")
        code, explanation, output_block = extract_code_and_explanation(intro)
        cs_lens = re.sub(r"\s+", " ", find_sub(subs, "cs lens")).strip()
        se_lens = re.sub(r"\s+", " ", find_sub(subs, "se lens")).strip()
        walkthrough = extract_walkthrough(subs)
        run_it = re.sub(r"\s+", " ", find_sub(subs, "run it")).strip()

        # "Mechanical walkthrough" always narrates "The New Code" (the
        # function-wrapped, project-style version), NOT the throwaway
        # "Introduce the concept in isolation" example — confirmed across
        # every sampled lesson. It used to be shown as static, unrunnable
        # text; now it's a SECOND real typeIt cell so the walkthrough has
        # something the learner actually ran in front of it, not a quoted
        # snippet they can't execute.
        new_code_section = find_sub(subs, "the new code")
        ncm = re.search(r"```[a-zA-Z]*\n(.*?)\n```", new_code_section, re.DOTALL)
        new_code = ncm.group(1).strip("\n") if ncm else ""

        if not code:
            continue  # skip a unit with no isolated example — nothing to type

        has_second_cell = bool(new_code and new_code != code)

        first_prose = [problem]
        if explanation:
            first_prose.append(explanation)
        if output_block:
            first_prose.append("```text\n" + output_block + "\n```")
        if not has_second_cell:
            if walkthrough:
                first_prose.append("## How the Code Works")
                first_prose.append(walkthrough)
            if cs_lens:
                first_prose.append(f"**CS lens.** {cs_lens}")
            if se_lens:
                first_prose.append(f"**SE lens.** {se_lens}")

        cell_id += 1
        cells.append({
            "id": cell_id,
            "cellTitle": name,
            "prose": first_prose,
            "typeIt": True,
            "solution": code,
        })

        if has_second_cell:
            second_prose = []
            if walkthrough:
                second_prose.append("## How the Code Works")
                second_prose.append(walkthrough)
            if run_it:
                second_prose.append(f"**Expected behavior.** {run_it}")
            if cs_lens:
                second_prose.append(f"**CS lens.** {cs_lens}")
            if se_lens:
                second_prose.append(f"**SE lens.** {se_lens}")

            cell_id += 1
            cells.append({
                "id": cell_id,
                "cellTitle": f"{name} — applied in a real function",
                "prose": second_prose,
                "typeIt": True,
                "solution": new_code,
            })
    return cells


def gen_quiz(lesson_num, terms):
    if len(terms) < 3:
        return []
    rng = random.Random(1000 + lesson_num)
    picks = terms[:6]
    rng.shuffle(picks)
    quiz = []
    for i, (term, definition) in enumerate(picks[:4]):
        others = [d for t, d in terms if t != term]
        if len(others) < 2:
            continue
        distractors = rng.sample(others, 2)
        options = [definition] + distractors
        rng.shuffle(options)
        correct = options.index(definition)
        quiz.append({
            "id": f"q{len(quiz) + 1}",
            "text": f'Which of these best defines "{term}"?',
            "options": options,
            "correct": correct,
        })
    return quiz


def build_glossary_callout(title, pairs):
    if not pairs:
        return None
    # Callout bodies render through react-markdown (MarkdownProse), where a
    # single "\n" between plain lines is just a soft break — it collapses
    # into one run-on paragraph (confirmed live: this is what "melded"
    # looked like). Markdown list items ("- text"), by contrast, only need
    # a single "\n" between them to render as separate <li>s. No cap here —
    # every term/object the lesson defines shows up; some lessons (the
    # capstone) genuinely have 30+.
    body = "\n".join(f"- **{t}:** {d}" for t, d in pairs)
    return f"""      {{
        type: 'definition',
        title: {js_string(title)},
        body: {js_string(body)},
      }},"""


def build_insight_callout(title, body):
    if not body:
        return None
    return f"""      {{
        type: 'insight',
        title: {js_string(title)},
        body: {js_string(body)},
      }},"""


def emit_js(lesson_num, title, subtitle, chapter, order, slug, build_text,
            unit_names, cells, terms, objects, quiz, closing, next_title):
    tags = [slugify(t) for t, _ in terms[:6]] or [slugify(title)]

    callout_blocks = [
        build_glossary_callout("Key Terms", terms),
        build_glossary_callout("Built-ins & Methods Used", objects),
        build_insight_callout("Putting It Together", closing),
    ]
    callouts_js = "\n".join(b for b in callout_blocks if b)

    def cell_js(c):
        prose_items = ",\n                ".join(js_string(p) for p in c["prose"] if p)
        return f"""            {{
              id: {c['id']},
              cellTitle: {js_string(c['cellTitle'])},
              prose: [
                {prose_items}
              ],
              typeIt: true,
              solution: {js_string(c['solution'])},
              code: '',
              output: '', status: 'idle', figureJson: null,
            }},"""

    cells_js = "\n".join(cell_js(c) for c in cells)

    mental_model = ",\n    ".join(js_string(f"**{t}** — {d}") for t, d in terms[:8])
    if not mental_model:
        mental_model = js_string(f"Review the reference code in each cell of {title} before moving on.")

    def quiz_js(q):
        opts = ",\n        ".join(js_string(o) for o in q["options"])
        return f"""    {{
      id: '{q['id']}',
      type: 'choice',
      text: {js_string(q['text'])},
      options: [
        {opts}
      ],
      correct: {q['correct']},
    }},"""

    quiz_js_body = "\n".join(quiz_js(q) for q in quiz)

    roadmap = ", ".join(unit_names)
    future_link = (
        js_string(f"Next lesson: {next_title}.") if next_title
        else js_string("This is the final lesson of the course — nice work getting here.")
    )

    return f"""// Guttag — Lesson {lesson_num}: {title}
// Auto-converted from src/docs/tutorials/guttag-python/lesson-{lesson_num:02d}.md
// by scripts/convert_guttag_lessons.py — see that script for the mapping.

export default {{
  id: 'gp-{lesson_num:02d}-{slug}',
  slug: {js_string(slug)},
  chapter: {chapter},
  order: {order},
  title: {js_string(title)},
  subtitle: {js_string(subtitle)},
  tags: [{", ".join(js_string(t) for t in tags)}],

  hook: {{
    question: {js_string(first_question_sentence(build_text) or f'What is "{title}", and why does it matter?')},
    realWorldContext: {js_string(build_text)},
    previewVisualizationId: 'PythonNotebook',
  }},

  intuition: {{
    prose: [
      {js_string(f"This lesson covers {len(unit_names)} core ideas: {roadmap}.")},
    ],
    callouts: [
{callouts_js}
    ],
    visualizations: [
      {{
        id: 'PythonNotebook',
        title: {js_string(f"Lesson {lesson_num}: {title}")},
        mathBridge: 'The reference code for each idea is shown above the editor. Type it in yourself, run it, and read the output before moving to the next cell.',
        caption: {js_string(title)},
        props: {{
          initialCells: [
{cells_js}
          ],
        }},
      }},
    ],
  }},

  math: {{ prose: [], callouts: [], visualizations: [] }},

  rigor: {{ prose: [], callouts: [], visualizations: [] }},

  examples: [],
  challenges: [],
  semantics: {{ core: [] }},

  spiral: {{
    recoveryPoints: [
      'If a cell\\'s behavior surprises you, isolate the one line that surprised you in its own cell and experiment with small variations.',
      'Read the reference code above the editor line by line and predict what it does before you type it in — that catches most mistakes before you even run anything.',
    ],
    futureLinks: [
      {future_link},
    ],
  }},

  quiz: [
{quiz_js_body}
  ],

  mentalModel: [
    {mental_model},
  ],

  checkpoints: ['read-intuition'],
}}
"""


def process_lesson(path, lesson_num, next_title):
    text = path.read_text(encoding="utf-8")

    raw_title_m = re.search(r"^#\s*Lesson\s*\d+:\s*(.+?)\s*$", text, re.MULTILINE)
    raw_title = raw_title_m.group(1).strip() if raw_title_m else path.stem
    # Titles/subtitles render as plain text (no markdown parsing) wherever the
    # app shows lesson.title/lesson.subtitle — strip backticks/asterisks so a
    # source title like "Classes — `class`, `__init__`, and `self`" doesn't
    # show literal backtick characters in the header.
    raw_title = re.sub(r"[`*]", "", raw_title)

    chapter, chapter_slug, chapter_title = module_for(lesson_num)

    if " — " in raw_title:
        title, subtitle = [s.strip() for s in raw_title.split(" — ", 1)]
    elif " - " in raw_title:
        title, subtitle = [s.strip() for s in raw_title.split(" - ", 1)]
    else:
        title, subtitle = raw_title, chapter_title

    slug = slugify(title)
    build_text = extract_build_text(text)
    terms = extract_terms(text)
    objects = extract_objects(text)
    units = split_concept_units(text)
    cells = build_cells(units)
    # A concept unit can now produce two cells (isolated example + applied
    # function) — de-duplicate back to one roadmap entry per concept for the
    # "this lesson covers N core ideas" intro sentence.
    seen = set()
    unit_names = []
    for c in cells:
        base = c["cellTitle"].split(" — applied in a real function")[0]
        if base not in seen:
            seen.add(base)
            unit_names.append(base)
    closing = extract_closing(text)
    quiz = gen_quiz(lesson_num, terms)

    return {
        "lesson_num": lesson_num,
        "title": title,
        "subtitle": subtitle,
        "chapter": chapter,
        "chapter_slug": chapter_slug,
        "slug": slug,
        "build_text": build_text,
        "unit_names": unit_names,
        "cells": cells,
        "terms": terms,
        "objects": objects,
        "quiz": quiz,
        "closing": closing,
        "next_title": next_title,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only", type=str, default="", help="comma-separated lesson numbers")
    args = parser.parse_args()

    only = {int(x) for x in args.only.split(",") if x.strip()} if args.only else None

    lesson_nums = list(range(6, 48))
    paths = {n: SRC_DIR / f"lesson-{n:02d}.md" for n in lesson_nums}
    for n, p in paths.items():
        if not p.exists():
            print(f"MISSING: {p}", file=sys.stderr)

    # Pass 1: titles, for "next lesson" links
    titles = {}
    for n in lesson_nums:
        text = paths[n].read_text(encoding="utf-8")
        m = re.search(r"^#\s*Lesson\s*\d+:\s*(.+?)\s*$", text, re.MULTILINE)
        raw_title = m.group(1).strip() if m else paths[n].stem
        raw_title = re.sub(r"[`*]", "", raw_title)
        titles[n] = raw_title.split(" — ")[0].split(" - ")[0].strip()

    chapter_orders = {}  # chapter -> next order counter
    for n in lesson_nums:
        if only and n not in only:
            continue
        next_title = titles.get(n + 1)
        result = process_lesson(paths[n], n, next_title)
        chapter = result["chapter"]
        order = chapter_orders.get(chapter, 0) + 1
        chapter_orders[chapter] = order

        js = emit_js(
            result["lesson_num"], result["title"], result["subtitle"],
            result["chapter"], order, result["slug"], result["build_text"],
            result["unit_names"], result["cells"], result["terms"],
            result["objects"], result["quiz"], result["closing"], result["next_title"],
        )

        chapter_dir = OUT_DIR / f"{result['chapter']}-{result['chapter_slug']}"
        out_path = chapter_dir / f"{order:03d}-{result['slug']}.js"

        print(
            f"lesson {n:02d} -> {out_path.relative_to(ROOT)}  "
            f"({len(result['cells'])} cells, {len(result['quiz'])} quiz, "
            f"{len(result['terms'])} terms, {len(result['objects'])} objects, "
            f"closing={'y' if result['closing'] else 'n'})"
        )

        if not args.dry_run:
            chapter_dir.mkdir(parents=True, exist_ok=True)
            out_path.write_text(js, encoding="utf-8")


if __name__ == "__main__":
    main()
