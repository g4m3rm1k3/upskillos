# Appends walkthrough entries from a file before the closing "};" of WALKTHROUGH, and adds a constant.
# Usage: append_walk.py <entries file> [<const line to add after the last const>]
import sys

path = r"C:\Users\g4m3r\Documents\testing tutorials\open-calc\src\labs\project-studio\tracks\qarcade.walkthrough.js"
s = open(path, encoding="utf8").read()
entries = open(sys.argv[1], encoding="utf8").read().strip("\n")
if len(sys.argv) > 2 and sys.argv[2] not in s:
    last = s.rindex("\nconst ", 0, s.index("export const WALKTHROUGH"))
    end = s.index("\n", last + 1)
    s = s[:end + 1] + sys.argv[2] + "\n" + s[end + 1:]
body = s.rstrip()
assert body.endswith("};"), body[-20:]
s = body[:-2].rstrip() + "\n\n" + entries + "\n};\n"
open(path, "w", encoding="utf8", newline="\n").write(s)
print("ok")
