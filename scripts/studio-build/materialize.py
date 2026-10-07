import re,sys,os,glob
import pathlib
track=str(pathlib.Path(__file__).resolve().parents[2]/'src/labs/project-studio/tracks/studio-build')
out=sys.argv[1]; upto=sys.argv[2]
for f in sorted(glob.glob(track+'/*.md')):
    if os.path.basename(f)[:5] > upto: break
    for path,body in re.findall(r"^```\w+ file=(\S+)\n(.*?)\n```$",open(f).read(),re.S|re.M):
        p=os.path.join(out,path); os.makedirs(os.path.dirname(p),exist_ok=True); open(p,'w').write(body+'\n')
