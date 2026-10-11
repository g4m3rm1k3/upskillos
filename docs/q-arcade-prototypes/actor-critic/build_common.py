"""Helpers for building Chapter 4 lessons from the tested reference project."""
import os
import re

PROJ = r"C:\Users\g4m3r\AppData\Local\Temp\claude\c--Users-g4m3r-Documents-testing-tutorials-open-calc\ad83e4b4-622b-4bee-968c-3545072979cf\scratchpad\acproj"
TRACK = r"C:\Users\g4m3r\Documents\testing tutorials\open-calc\src\labs\project-studio\tracks\qarcade-actor-critic"


def read(name):
    return open(os.path.join(PROJ, name), encoding="utf8").read().rstrip("\n")


def blocks(source):
    """Split a module into its top-level blocks: the import header, then each def/class (with its decorators), then the main block."""
    lines = source.split("\n")
    starts = [i for i, l in enumerate(lines) if re.match(r"(def |class |if __name__|[A-Z_]+ = )", l)]
    header = "\n".join(lines[:starts[0]]).rstrip("\n")
    out = {"header": header}
    for n, s in enumerate(starts):
        e = starts[n + 1] if n + 1 < len(starts) else len(lines)
        text = "\n".join(lines[s:e]).rstrip("\n")
        m = re.match(r"(?:def|class) (\w+)|if __name__|([A-Z_]+) =", lines[s])
        key = m.group(1) or m.group(2) or "main"
        out[key] = text
    return out


def join(*parts):
    """Join module blocks: two blank lines between top-level definitions, one after the header if it ends in constants."""
    parts = [p for p in parts if p]
    out = parts[0]
    for i, p in enumerate(parts[1:], start=1):
        out += ("\n\n" if i == 1 and re.match(r"[A-Z_]+ =", p) else "\n\n\n") + p
    return out


def fence(path, code, provided=False):
    extra = " provided" if provided else ""
    lang = "python" if path.endswith(".py") else "text"
    return f"```{lang} file={path}{extra}\n{code}\n```"


def write_lesson(name, text):
    os.makedirs(TRACK, exist_ok=True)
    with open(os.path.join(TRACK, name), "w", encoding="utf8", newline="\n") as f:
        f.write(text.lstrip("\n"))


def write_answer(name, code):
    os.makedirs(os.path.join(TRACK, "answers"), exist_ok=True)
    with open(os.path.join(TRACK, "answers", name), "w", encoding="utf8", newline="\n") as f:
        f.write(code + "\n")


def write_verify(name, code):
    os.makedirs(os.path.join(TRACK, "verify"), exist_ok=True)
    with open(os.path.join(TRACK, "verify", name), "w", encoding="utf8", newline="\n") as f:
        f.write(code.lstrip("\n"))
