import re,glob,os
import pathlib
track=str(pathlib.Path(__file__).resolve().parents[2]/'src/labs/project-studio/tracks/studio-build')
FENCE=re.compile(r"^```(\S*)([^\n]*)\n(.*?)\n```$",re.S|re.M)
KW=set('const let var function return if else for of while new class extends constructor this super import export from default async await try catch finally throw typeof instanceof in void null undefined true false readonly private public static get set interface type implements override as is unknown any never number string boolean'.split())
OPS=['===','!==','=>','...','?.','&&','||','++','+=','-=','>=','<=','!','?',' : ','<','>','%','!']
explained=''; prev={}; seen=set()
for f in sorted(glob.glob(track+'/*.md')):
    les=os.path.basename(f)[:5]; body=open(f).read().split('---',2)[2]
    for st in re.split(r"^## ",body,flags=re.M):
        title=st.split('\n',1)[0]
        prose=FENCE.sub('',st)
        explained+=' '.join(re.findall(r"`+([^`]+?)`+",prose))+' '+' '.join(re.findall(r"\*\*([^*]+)\*\*",prose))+'\n'
        for lang,info,code in FENCE.findall(st):
            m=re.search(r"file=(\S+)",info)
            if not m or m.group(1).endswith('.md') or lang in ('json','text','markdown'): continue
            path=m.group(1); old=set(prev.get(path,'').split('\n')); prev[path]=code
            for line in code.split('\n'):
                if line in old: continue
                bare=re.sub(r"'[^']*'|\"[^\"]*\"|`[^`]*`","''",line)
                toks=set(t for t in re.findall(r"[A-Za-z_]\w*",bare) if t in KW)
                toks|=set('.'+t for t in re.findall(r"\.([A-Za-z_]\w*)\(",bare))
                toks|=set(o.strip() for o in ['===','!==','=>','...','?.','&&','||','++','+=','-=','>=','<=','!',' ? ','%'] if o in bare)
                toks|=set(t for t in re.findall(r"\b(Math|JSON|Object|Array|Number|String|Map|Set|Error|Record|ReadonlyMap|Promise|window|document|console|process|path)\b",bare))
                for t in sorted(toks):
                    if t in seen: continue
                    seen.add(t)
                    hit = re.search(r"(?<!\w)"+re.escape(t.lstrip('.'))+r"(?![\w])", explained)
                    if not hit: print(f"{les} | {title[:36]:36} | {t:14} | {line.strip()[:80]}")
