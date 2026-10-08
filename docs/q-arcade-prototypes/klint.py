# Usage: klint.py file word [word...] : every test containing a word must start with test_<word>.
import re, sys, os
f, words = sys.argv[1], sys.argv[2:]
names = re.findall(r"^def (test_\w+)", open(f).read(), re.M)
ok = True
for w in words:
    sel = [n for n in names if w in n]
    bad = [n for n in sel if not n.startswith("test_" + w)]
    if w in os.path.basename(f) or not sel or bad:
        ok = False; print(f"{f} -k {w}: selected {len(sel)}, bad {bad}, in file name: {w in os.path.basename(f)}")
print("ok" if ok else "PROBLEMS")
