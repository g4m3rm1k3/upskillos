# Fills a lesson draft's file blocks from a working prototype, so every block is code that really ran.
#   python3 scripts/studio-build/fill.py <prototype folder> <draft.md> <lesson.md>
# In the draft, a line "@@REF:PATH@@" becomes the file PATH at git ref REF in the prototype (tag each lesson's
# commit, e.g. l41), and "@@state/NAME:PATH@@" becomes <prototype>/../states/NAME/PATH (a half-way version of a file
# inside one lesson, such as a red test before more tests are added). A token on a line of its own, not already inside
# a fence, is wrapped in its ```lang file=PATH fence.
import os, re, subprocess, sys

proto, draft, out = sys.argv[1:4]
LANG = {'ts': 'ts', 'tsx': 'tsx', 'js': 'js', 'css': 'css', 'json': 'json', 'md': 'markdown', 'html': 'html'}
TOKEN = re.compile(r'^@@([^:@]+):([^@]+)@@$')

def get(ref, path):
    if ref.startswith('state/'):
        return open(os.path.join(proto, '..', 'states', ref[6:], path)).read().rstrip('\n')
    return subprocess.run(['git', 'show', f'{ref}:{path}'], cwd=proto, capture_output=True, text=True, check=True).stdout.rstrip('\n')

lines = []
for line in open(draft).read().split('\n'):
    m = TOKEN.match(line)
    if m and not (lines and lines[-1].startswith('```')):
        path = m.group(2)
        lines += [f"```{LANG[path.rsplit('.', 1)[1]]} file={path}", line, '```']
    else:
        lines.append(line)

text = '\n'.join(TOKEN.sub(lambda m: get(m.group(1), m.group(2)), line) for line in lines)
if '@@' in text: sys.exit(f'{draft}: an @@ token was not filled')
open(out, 'w').write(text)
