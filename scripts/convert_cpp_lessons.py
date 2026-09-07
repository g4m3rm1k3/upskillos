#!/usr/bin/env python3
"""Convert src/docs/projects/<cpp-series>/Lesson NN Title.md into interactive
course lessons at src/courses/<course-id>/<chapter>/<order>-<slug>.js.

Same "Concept Unit" template as scripts/convert_guttag_lessons.py, adapted
for two real differences in this material:

1. C++ can't run in the browser like Pyodide-backed Python. Compilation goes
   through CppNotebook (src/components/notebooks/CppNotebook.jsx), which
   calls the Wandbox API for a real g++ compile — the same service already
   used by src/tools/js-playground/FullPageIDE.jsx. Each concept unit
   becomes a typeIt cell: the source's own code is the reference (shown,
   not pre-filled), and its documented "Run It"/"Run It Yourself" expected
   output is carried along as `expectedOutput`, which CppNotebook falls
   back to (clearly labeled, and only when what was typed matches the
   reference) if Wandbox itself is unreachable — confirmed live that this
   matters: Wandbox's execution backend was down entirely while this was
   being built (a genuine third-party outage, not a CORS or request-shape
   problem — verified with a raw curl POST against its API independent of
   this app).

2. Every unit has exactly one example ("The New Code") in cpp-from-scratch
   and cpp-dsa, but cpp-patterns sometimes ALSO has a separate "Introduce
   the concept in isolation" throwaway first (matching guttag-python's
   fuller template). When both exist, the isolated one is shown as a
   read-only illustrative snippet in the cell's prose, ABOVE the reference
   solution for "The New Code" — only the latter is the thing actually
   typed and run.

Also captures three sections guttag-python's template doesn't have, all
real, all lesson-level (siblings of "Connect the Pieces", not per-unit):
"What Breaks Without This" (a deliberately-triggered compiler error, shown
as a callout), "Exercises" (kept as a callout list), "Definition of Done"
(kept as a callout checklist).

Run: python scripts/convert_cpp_lessons.py --course cpp-from-scratch [--dry-run] [--only 3,4]
"""
import argparse
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROJECTS_DIR = ROOT / "src" / "docs" / "projects"
OUT_DIR = ROOT / "src" / "courses"

# course_id -> (source_dir_name, [(first, last, chapter_num, chapter_slug, chapter_title), ...])
COURSES = {
    "cpp-from-scratch": ("cpp-from-scratch", [
        (1, 8, 1, "foundations", "Foundations"),
        (9, 14, 2, "oop-and-generics", "OOP and Generic Programming"),
        (15, 20, 3, "modern-idioms", "Modern C++ Idioms"),
        (21, 26, 4, "templates-and-compile-time", "Templates and Compile-Time Programming"),
        (27, 30, 5, "concurrency", "Concurrency"),
        (31, 35, 6, "systems-and-tooling", "Systems and Tooling"),
    ]),
    "cpp-dsa": ("cpp-dsa", [
        (1, 3, 1, "foundations", "Complexity and Recursion"),
        (4, 8, 2, "linear-structures", "Linear Data Structures"),
        (9, 13, 3, "trees-and-graphs", "Trees, Heaps, and Graphs"),
        (14, 15, 4, "graph-traversal", "Graph Traversal"),
        (16, 20, 5, "sorting-and-searching", "Sorting and Searching"),
        (21, 25, 6, "advanced-techniques", "Advanced Techniques"),
    ]),
    "cpp-patterns": ("cpp-patterns", [
        (1, 4, 1, "structural-patterns", "Structural and Generic Patterns"),
        (5, 7, 2, "behavioral-patterns", "Behavioral and Creational Patterns"),
        (8, 10, 3, "testing", "Testing"),
        (11, 12, 4, "error-handling", "Error Handling"),
        (13, 14, 5, "io", "I/O"),
        (15, 18, 6, "performance", "Performance"),
    ]),
}


def module_for(chapters, n):
    for lo, hi, chapter, slug, title in chapters:
        if lo <= n <= hi:
            return chapter, slug, title
    raise ValueError(f"lesson {n} not in any chapter range")


def slugify(text):
    text = re.sub(r"[`*_]", "", text)
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text


def js_string(s):
    s = s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
    return f"'{s}'"


def _clean_heading(line):
    return re.sub(r"[#*:]", "", line).strip().lower()


def extract_build_text(text):
    m = re.search(
        r"\*\*What you will build:?\*\*\s*(.+?)(?=\n\s*\n|\n\*\*What you need)",
        text, re.DOTALL,
    )
    if not m:
        return ""
    return re.sub(r"\s+", " ", m.group(1)).strip()


def extract_terms(text):
    lines = text.split("\n")
    start = end = None
    for i, line in enumerate(lines):
        cleaned = _clean_heading(line)
        if start is None and "terms" in cleaned and "lesson" in cleaned:
            start = i + 1
            continue
        if start is not None and end is None:
            if ("objects" in cleaned and "methods" in cleaned) or line.strip().startswith("##"):
                end = i
                break
    if start is None:
        return []
    if end is None:
        end = len(lines)

    terms = []
    for line in lines[start:end]:
        tm = re.match(r"^\s*(?:[-*]\s*)?\*\*(.+?)\*\*\s*[—-]\s*(.+?)\s*$", line)
        if not tm:
            continue
        term, definition = tm.group(1).strip(), tm.group(2).strip()
        # "*Why it exists:* ..." is appended inline after the main definition
        # in this series — keep it, it's real content, just fold it into a
        # single flowing sentence instead of a label.
        definition = re.sub(r"\s*\*Why it exists:?\*:?\s*", " It exists ", definition)
        term = re.sub(r"[`*]", "", term)
        definition = re.sub(r"[`*]", "", definition)
        terms.append((term, definition))
    return terms


def extract_objects(text):
    lines = text.split("\n")
    start = end = None
    for i, line in enumerate(lines):
        cleaned = _clean_heading(line)
        if start is None and "objects" in cleaned and "methods" in cleaned:
            start = i + 1
            continue
        if start is not None and end is None and line.strip().startswith("##"):
            end = i
            break
    if start is None:
        return []
    if end is None:
        end = len(lines)

    objects, name, definition = [], None, None
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


def split_concept_units(text):
    parts = re.split(r"^##\s*Concept Unit:\s*(.+?)\s*$", text, flags=re.MULTILINE)
    units = []
    for i in range(1, len(parts), 2):
        name = re.sub(r"[`*]", "", parts[i]).strip()
        body = parts[i + 1] if i + 1 < len(parts) else ""
        body = re.split(
            r"^##\s*(?:Closing|Connect(?:ing)? the [Pp]ieces|What Breaks|Exercises|Definition of Done)",
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
    for key, val in subs.items():
        for prefix in prefixes:
            if key.startswith(prefix):
                return val
    return ""


def extract_fenced(section, lang_hint=None):
    """First fenced code block in `section`. lang_hint (e.g. 'cpp') is tried
    first, then any fence, so a fence tagged ```text (an output block) right
    after a ```cpp block isn't picked up as the code by mistake."""
    if lang_hint:
        m = re.search(rf"```{lang_hint}\n(.*?)\n```", section, re.DOTALL)
        if m:
            return m.group(1).strip("\n")
    m = re.search(r"```[a-zA-Z]*\n(.*?)\n```", section, re.DOTALL)
    return m.group(1).strip("\n") if m else ""


def last_fenced(section):
    blocks = re.findall(r"```[a-zA-Z]*\n(.*?)\n```", section, re.DOTALL)
    return blocks[-1].strip("\n") if blocks else ""


def extract_walkthrough(subs):
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
            return sentence
    return None


def build_units(units):
    """Returns a list of CppNotebook cells — one typeIt cell per concept
    unit: reference solution shown above an empty editor, compiled and run
    for real via Wandbox (with a documented-expected-output fallback for
    when that service is down — see CppNotebook.jsx)."""
    out = []
    for i, (name, body) in enumerate(units, start=1):
        subs = split_subsections(body)
        problem = re.sub(r"\s+", " ", find_sub(subs, "the problem")).strip()

        isolated_section = find_sub(subs, "introduce the concept", "isolate the concept")
        isolated_code = extract_fenced(isolated_section, "cpp") if isolated_section else ""

        new_code_section = find_sub(subs, "the new code")
        code = extract_fenced(new_code_section, "cpp")
        if not code:
            continue  # nothing runnable in this unit

        walkthrough = extract_walkthrough(subs)
        cs_lens = re.sub(r"\s+", " ", find_sub(subs, "cs lens")).strip()
        se_lens = re.sub(r"\s+", " ", find_sub(subs, "se lens")).strip()
        # "Run It Yourself" is ~90% boilerplate manual compile/run steps
        # repeated near-verbatim in every unit of every lesson (irrelevant
        # now that CppNotebook compiles for real in place) — the only part
        # worth extracting is its trailing "Expected output:" fence, kept as
        # the fallback for when the live compiler is unreachable.
        run_it_section = find_sub(subs, "run it")
        expected_output = last_fenced(run_it_section)

        prose = [problem]
        if isolated_code and isolated_code != code:
            prose.append("## First, In Isolation")
            prose.append("```cpp\n" + isolated_code + "\n```")
        if walkthrough:
            prose.append("## How the Code Works")
            prose.append(walkthrough)
        if cs_lens:
            prose.append(f"**CS lens.** {cs_lens}")
        if se_lens:
            prose.append(f"**SE lens.** {se_lens}")

        out.append({
            "id": i,
            "cellTitle": name,
            "prose": prose,
            "typeIt": True,
            "solution": code,
            "expectedOutput": expected_output,
        })
    return out


def extract_trailing_callout(text, *heading_words):
    """'What Breaks Without This' / 'Exercises' / 'Definition of Done' are
    lesson-level '##' sections after the concept units, each appearing (or
    not — they're inconsistent lesson to lesson) exactly once."""
    pattern = r"^##\s*" + r"\s*".join(re.escape(w) for w in heading_words) + r".*$"
    m = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
    if m:
        section = text[m.end():]
        section = re.split(r"^##\s", section, flags=re.MULTILINE)[0]
        return section.strip()
    # cpp-patterns nests the whole closing block as top-level bullets under
    # ONE '## Closing' heading instead of separate '##' sections — fall back
    # to pulling this specific one out of that bullet structure.
    bullets = _closing_bullet_sections(text)
    key = " ".join(heading_words).lower()
    for k, v in bullets.items():
        if k.startswith(key) or key.startswith(k):
            return v
    return ""


def _closing_bullet_sections(text):
    """Parse '## Closing\\n- **Label** — text\\n- **Label**\\n  - sub-item'
    into {label: content} — cpp-patterns' alternative to separate '##'
    headings for Connect the Pieces / What Breaks / Exercises / Definition
    of Done. Indented sub-bullets (Exercises/DoD's own checklist items)
    stay attached to their parent label's content."""
    m = re.search(r"^##\s*Closing\s*$", text, re.MULTILINE)
    if not m:
        return {}
    section = text[m.end():]
    section = re.split(r"^##\s", section, flags=re.MULTILINE)[0]

    sections = {}
    current_key = None
    current_lines = []
    for line in section.split("\n"):
        top_bullet = re.match(r"^-\s*\*\*(.+?)\*\*\s*[—-]?\s*(.*)$", line)
        if top_bullet and not line.startswith((" ", "\t")):
            if current_key is not None:
                sections[current_key] = "\n".join(current_lines).strip()
            current_key = top_bullet.group(1).strip().lower().rstrip(".")
            current_lines = [top_bullet.group(2)] if top_bullet.group(2) else []
            continue
        if current_key is not None:
            current_lines.append(line)
    if current_key is not None:
        sections[current_key] = "\n".join(current_lines).strip()
    return sections


def extract_closing(text):
    heading_re = re.compile(
        r"^##\s*(?:Closing|Connect(?:ing)? the [Pp]ieces).*$", re.MULTILINE,
    )
    matches = list(heading_re.finditer(text))
    if not matches:
        return ""
    section = text[matches[-1].end():]
    section = re.split(r"^##\s", section, flags=re.MULTILINE)[0]

    subs = split_subsections(section)
    content = find_sub(subs, "connect the pieces", "putting it", "wrapping up")
    if not content:
        content = _closing_bullet_sections(text).get("connect the pieces", "")
    if not content:
        content = section
    content = re.sub(r"^\s*-\s*\*\*[^*]+\*\*\s*[—-]\s*", "", content.strip())
    return re.sub(r"\s+", " ", content).strip()


def gen_quiz(lesson_num, terms):
    if len(terms) < 3:
        return []
    rng = random.Random(2000 + lesson_num)
    picks = terms[:6]
    rng.shuffle(picks)
    quiz = []
    for term, definition in picks[:4]:
        others = [d for t, d in terms if t != term]
        if len(others) < 2:
            continue
        distractors = rng.sample(others, 2)
        options = [definition] + distractors
        rng.shuffle(options)
        correct = options.index(definition)
        quiz.append({
            "id": f"q{len(quiz) + 1}",
            "text": escape_angle_brackets(f'Which of these best defines "{term}"?'),
            "options": [escape_angle_brackets(o) for o in options],
            "correct": correct,
        })
    return quiz


def escape_angle_brackets(text):
    """C++ names like std::unique_ptr<T> or Base<Derived> hit react-markdown's
    raw-HTML pass (rehypeRaw, used by the Callout component for every
    callout body — Key Terms, Built-ins, What Breaks, Exercises, Definition
    of Done, Putting It Together) wherever they sit outside a backtick code
    span: <T> gets misread as an attempted custom element tag (confirmed
    live twice — once in a **bold** glossary name, once in a plain prose
    paragraph — 'The tag <%s> is unrecognized' console warning both times).
    Backtick spans and fenced code blocks are already safe (they parse as
    code nodes before the raw-HTML pass ever sees them), so this leaves
    those untouched and escapes angle brackets everywhere else."""
    fence_parts = re.split(r"(```[a-zA-Z]*\n.*?\n```)", text, flags=re.DOTALL)
    out = []
    for part in fence_parts:
        if part.startswith("```"):
            out.append(part)
            continue
        span_parts = re.split(r"(`[^`\n]*`)", part)
        escaped = [
            sp if sp.startswith("`") and sp.endswith("`") and len(sp) >= 2
            else sp.replace("<", "&lt;").replace(">", "&gt;")
            for sp in span_parts
        ]
        out.append("".join(escaped))
    return "".join(out)


def build_glossary_callout(title, pairs):
    if not pairs:
        return None
    body = "\n".join(
        f"- **{escape_angle_brackets(t)}:** {escape_angle_brackets(d)}"
        for t, d in pairs
    )
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
        body: {js_string(escape_angle_brackets(body))},
      }},"""


def normalize_preserving_fences(text):
    """Collapse whitespace in plain prose but leave fenced code blocks
    completely untouched — a blanket `re.sub(r"\\s+", " ", ...)` squashes a
    multi-line ```cpp example into one line with literal backtick markers
    jammed into running text (confirmed live: 'What Breaks Without This'
    turned unreadable this way, same root cause as the callout 'melded
    paragraph' bug — MarkdownProse needs blank lines around a fence to
    render it as a block)."""
    parts = re.split(r"(```[a-zA-Z]*\n.*?\n```)", text, flags=re.DOTALL)
    out = []
    for part in parts:
        if part.startswith("```"):
            out.append("\n\n" + part.strip() + "\n\n")
        else:
            collapsed = re.sub(r"\s+", " ", part).strip()
            if collapsed:
                out.append(escape_angle_brackets(collapsed) + " ")
    return re.sub(r"\n{3,}", "\n\n", "".join(out)).strip()


def extract_list_block(raw):
    """Preserve one list item per line — numbered, bulleted, or a GFM
    '- [ ]' task-list checkbox (remark-gfm renders those as real checkboxes,
    but only if each item keeps its own line; a blanket whitespace collapse
    melds them into plain '- [ ] one - [ ] two' running text). Numbered
    items are normalized to '- ' bullets, same treatment as
    extract_walkthrough."""
    if not raw:
        return ""
    lines = []
    for line in raw.split("\n"):
        line = line.strip()
        if not line:
            continue
        if re.match(r"^-\s*\[[ xX]\]", line):
            lines.append(line)
            continue
        line = re.sub(r"^\d+\.\s+", "- ", line)
        line = re.sub(r"^[*]\s+", "- ", line)
        if line.startswith("-"):
            lines.append(escape_angle_brackets(line))
    return "\n".join(lines)


def build_text_callout(callout_type, title, body):
    if not body:
        return None
    return f"""      {{
        type: {js_string(callout_type)},
        title: {js_string(title)},
        body: {js_string(body)},
      }},"""


def emit_js(lesson_num, title, subtitle, chapter, order, slug, build_text,
            unit_blocks, terms, objects, quiz, closing, breaks_without,
            exercises, definition_of_done, next_title, course_id):
    tags = [slugify(t) for t, _ in terms[:6]] or [slugify(title)]

    def cell_js(u):
        prose_items = ",\n                ".join(js_string(p) for p in u["prose"] if p)
        expected_output_field = (
            f"\n              expectedOutput: {js_string(u['expectedOutput'])},"
            if u["expectedOutput"] else ""
        )
        return f"""            {{
              id: {u['id']},
              cellTitle: {js_string(u['cellTitle'])},
              prose: [
                {prose_items}
              ],
              typeIt: true,
              solution: {js_string(u['solution'])},{expected_output_field}
              code: '',
            }},"""

    cells_js = "\n".join(cell_js(u) for u in unit_blocks)

    callout_blocks = [
        build_glossary_callout("Key Terms", terms),
        build_glossary_callout("Built-ins & Methods Used", objects),
        build_insight_callout("Putting It Together", closing),
        build_text_callout("warning", "What Breaks Without This", normalize_preserving_fences(breaks_without)),
        build_text_callout("procedure", "Exercises", extract_list_block(exercises)),
        build_text_callout("strategy", "Definition of Done", extract_list_block(definition_of_done)),
    ]
    callouts_js = "\n".join(b for b in callout_blocks if b)

    mental_model = ",\n    ".join(
        js_string(escape_angle_brackets(f"**{t}** — {d}")) for t, d in terms[:8]
    )
    if not mental_model:
        mental_model = js_string(f"Review the reference code in each part of {title} before moving on.")

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

    roadmap = escape_angle_brackets(", ".join(u["cellTitle"] for u in unit_blocks))
    future_link = (
        js_string(f"Next lesson: {next_title}.") if next_title
        else js_string("This is the final lesson of the course — nice work getting here.")
    )

    return f"""// {course_id} — Lesson {lesson_num}: {title}
// Auto-converted from src/docs/projects/{course_id}/Lesson {lesson_num:02d} *.md
// by scripts/convert_cpp_lessons.py — see that script for the mapping.
// Code compiles and runs for real via CppNotebook (Wandbox), with a
// documented-expected-output fallback for when that service is down —
// see src/components/notebooks/CppNotebook.jsx.

export default {{
  id: '{course_id}-{lesson_num:02d}-{slug}',
  slug: {js_string(slug)},
  chapter: {chapter},
  order: {order},
  title: {js_string(title)},
  subtitle: {js_string(subtitle)},
  tags: [{", ".join(js_string(t) for t in tags)}],

  hook: {{
    question: {js_string(escape_angle_brackets(first_question_sentence(build_text) or f'What is "{title}", and why does it matter?'))},
    realWorldContext: {js_string(escape_angle_brackets(build_text))},
    previewVisualizationId: 'CppNotebook',
  }},

  intuition: {{
    prose: [
      {js_string(f"This lesson covers {len(unit_blocks)} core ideas: {roadmap}.")},
    ],
    callouts: [
{callouts_js}
    ],
    visualizations: [
      {{
        id: 'CppNotebook',
        title: {js_string(f"Lesson {lesson_num}: {title}")},
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
      'If the simulated output doesn\\'t match what you expected, re-read the reference code line by line — the walkthrough above explains exactly what each line does.',
      'Compile errors in real C++ are informative — read the first error the compiler reports, not the last; later errors are often just fallout from the first one.',
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


def process_lesson(path, lesson_num, chapters, next_title):
    text = path.read_text(encoding="utf-8")

    raw_title_m = re.search(r"^#\s*Lesson\s*\d+:\s*(.+?)\s*$", text, re.MULTILINE)
    raw_title = raw_title_m.group(1).strip() if raw_title_m else path.stem
    raw_title = re.sub(r"[`*]", "", raw_title)

    chapter, chapter_slug, chapter_title = module_for(chapters, lesson_num)

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
    unit_blocks = build_units(units)
    closing = extract_closing(text)
    breaks_without = extract_trailing_callout(text, "What", "Breaks", "Without", "This")
    exercises = extract_trailing_callout(text, "Exercises")
    definition_of_done = extract_trailing_callout(text, "Definition", "of", "Done")
    quiz = gen_quiz(lesson_num, terms)

    return {
        "lesson_num": lesson_num, "title": title, "subtitle": subtitle,
        "chapter": chapter, "chapter_slug": chapter_slug, "slug": slug,
        "build_text": build_text, "unit_blocks": unit_blocks,
        "terms": terms, "objects": objects, "quiz": quiz, "closing": closing,
        "breaks_without": breaks_without, "exercises": exercises,
        "definition_of_done": definition_of_done, "next_title": next_title,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--course", required=True, choices=list(COURSES.keys()))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only", type=str, default="")
    args = parser.parse_args()

    source_dir_name, chapters = COURSES[args.course]
    src_dir = PROJECTS_DIR / source_dir_name
    out_dir = OUT_DIR / args.course

    lesson_files = sorted(src_dir.glob("Lesson *.md"), key=lambda p: int(re.search(r"\d+", p.name).group()))
    lesson_nums = [int(re.search(r"\d+", p.name).group()) for p in lesson_files]
    paths = dict(zip(lesson_nums, lesson_files))

    only = {int(x) for x in args.only.split(",") if x.strip()} if args.only else None

    titles = {}
    for n, p in paths.items():
        text = p.read_text(encoding="utf-8")
        m = re.search(r"^#\s*Lesson\s*\d+:\s*(.+?)\s*$", text, re.MULTILINE)
        raw_title = m.group(1).strip() if m else p.stem
        raw_title = re.sub(r"[`*]", "", raw_title)
        titles[n] = raw_title.split(" — ")[0].split(" - ")[0].strip()

    chapter_orders = {}
    for n in lesson_nums:
        if only and n not in only:
            continue
        next_title = titles.get(n + 1)
        result = process_lesson(paths[n], n, chapters, next_title)
        chapter = result["chapter"]
        order = chapter_orders.get(chapter, 0) + 1
        chapter_orders[chapter] = order

        js = emit_js(
            result["lesson_num"], result["title"], result["subtitle"],
            result["chapter"], order, result["slug"], result["build_text"],
            result["unit_blocks"], result["terms"], result["objects"],
            result["quiz"], result["closing"], result["breaks_without"],
            result["exercises"], result["definition_of_done"],
            result["next_title"], args.course,
        )

        chapter_dir = out_dir / f"{result['chapter']}-{result['chapter_slug']}"
        out_path = chapter_dir / f"{order:03d}-{result['slug']}.js"

        print(
            f"lesson {n:02d} -> {out_path.relative_to(ROOT)}  "
            f"({len(result['unit_blocks'])} units, {len(result['quiz'])} quiz, "
            f"{len(result['terms'])} terms, {len(result['objects'])} objects, "
            f"closing={'y' if result['closing'] else 'n'})"
        )

        if not args.dry_run:
            chapter_dir.mkdir(parents=True, exist_ok=True)
            out_path.write_text(js, encoding="utf-8")


if __name__ == "__main__":
    main()
