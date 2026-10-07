# Fills a lesson draft's file blocks from a working prototype, so every block is code that really ran.
#   python3 scripts/studio-build/fill.py <prototype folder> <draft.md> <lesson.md>
# In the draft, a line "@@REF:PATH@@" becomes the file PATH at git ref REF in the prototype (tag each lesson's
# commit, e.g. l41), and "@@state/NAME:PATH@@" becomes <prototype>/../states/NAME/PATH (a half-way version of a file
# inside one lesson, such as a red test before more tests are added).
import os, re, subprocess, sys

proto, draft, out = sys.argv[1:4]

def get(ref, path):
    if ref.startswith('state/'):
        return open(os.path.join(proto, '..', 'states', ref[6:], path)).read().rstrip('\n')
    return subprocess.run(['git', 'show', f'{ref}:{path}'], cwd=proto, capture_output=True, text=True, check=True).stdout.rstrip('\n')

text = re.sub(r'^@@([^:@]+):([^@]+)@@$', lambda m: get(m.group(1), m.group(2)), open(draft).read(), flags=re.M)
if '@@' in text: sys.exit(f'{draft}: an @@ token was not filled')
open(out, 'w').write(text)
