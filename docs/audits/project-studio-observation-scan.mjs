import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const root=resolve(process.argv[2] || '.');
const out=resolve(process.argv[3] || '.');
const require=createRequire(resolve(root,'package.json'));
const {parse:parseJs}=require('@babel/parser');
const text=p=>readFileSync(resolve(root,p),'utf8').replace(/\r\n/g,'\n');
const {parseLesson}=await import(pathToFileURL(resolve(root,'src/labs/project-studio/parseTrack.js')));
const {diffLines}=await import(pathToFileURL(resolve(root,'src/labs/project-studio/lineDiff.js')));
const {learningProfile}=await import(pathToFileURL(resolve(root,'src/labs/project-studio/learningProfile.js')));
const {studioSeries}=await import(pathToFileURL(resolve(root,'src/labs/project-studio/series.js')));
const {SERIES_MANIFEST}=await import(pathToFileURL(resolve(root,'src/tools/notebook-lab/series/manifest.js')));
const {parseLesson:parseNotebook}=await import(pathToFileURL(resolve(root,'src/tools/notebook-lab/lessonFormat.js')));
const base='src/labs/project-studio/tracks';
const walk=p=>readdirSync(resolve(root,p),{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(`${p}/${d.name}`):[`${p}/${d.name}`]);
const sourceFiles=[...walk('src/labs/project-studio'),...walk('src/tools/notebook-lab'),...walk('desktop/app'),...walk('scripts'),...walk('.github/workflows')];
const hashes=Object.fromEntries(sourceFiles.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')]));
const lessons=[], structural=[], links=[], figures=[], excerpts=[], targets=new Map(), parsedTracks={};
const taskHeading=/^(?:Step\s+\d+\s*[—:.-]\s*)?(?:Challenge\b|Your turn\b|Your own (?:tests|implementation)\b|Independent (?:task|work)\b)|on your own/i;
const taskProse=/\b(no (?:solution|code) is (?:shown|given)|without (?:looking|copying)|design (?:your|a)|implement.{0,35}(yourself|on your own)|write.{0,30}your own)\b/i;
const optionalProse=/(?:^|\n)\s*(?:\*\*)?(?:Optional\b|This (?:is|challenge is)\s+(?:\*\*)?optional)/i;
const signalPatterns={
  prediction:/\bpredict|before.{0,35}(run|execut|try)/i,
  diagnosis:/\b(debug|diagnos|traceback|deliberately|intentional.{0,20}(bug|error|fail)|smallest.{0,20}(example|reproduc))/i,
  explanation:/\b(explain|why|reason|because|trace)/i,
  recovery:/\b(restore|revert|recover|review|return to|go back|revisit|earlier lesson)/i,
  checkLimits:/checks?\s.{0,65}(prove|establish|verify|inspect|evidence)|untested|does not prove|do not prove/i,
  outcome:/\b(outcome|you will (?:learn|be able)|this lesson|by the end|goal|this step:)/i,
};
const skillPatterns={
  requirements:/\b(requirement|acceptance|specification|user stor|non-goal)/i,
  decomposition:/\b(function|module|package|separat.{0,20}(responsibil|concern))/i,
  testing:/\b(test|assert|pytest|junit|xunit|vitest)/i,
  debugging:/\b(debug|diagnos|traceback|breakpoint|reproduc)/i,
  versionControl:/\b(git|commit|branch|merge|pull request)/i,
  dependencies:/\b(dependenc|virtual environment|lockfile|pinned|requirements\.txt|pyproject|cmake|maven)/i,
  dataValidation:/\b(validat|malformed|invalid input|sanitis|sanitize|untrusted)/i,
  designTradeoffs:/\b(trade.?off|alternative|instead|choose|compare|cost|simpler)/i,
  persistence:/\b(persist|database|sqlite|transaction|schema migration)/i,
  interfaces:/\b(interface|contract|API|boundary|boundaries)/i,
  observability:/\b(logging|log message|metric|telemetry|monitoring|diagnostic)/i,
  concurrency:/\b(concurren|thread|async|race condition|deadlock|locking)/i,
  security:/\b(security|authentication|authorization|permission|password|secret|injection)/i,
  accessibility:/\b(accessibility|screen reader|keyboard navigation|contrast|aria-|focus order)/i,
  releaseMaintenance:/\b(release|deploy|rollback|changelog|maintain|versioning|migration)/i,
  collaboration:/\b(code review|reviewer|pull request|team|handoff|pair programming)/i,
};
const countBy=list=>list.reduce((a,k)=>(a[k]=(a[k]||0)+1,a),{});
const mdFiles=walk(base).filter(p=>p.endsWith('.md')&&!p.includes('/support/')).sort();
for(const path of mdFiles){
 const rel=path.slice(base.length+1),track=rel.split('/')[0],id=`${track}/${rel.split('/').at(-1).slice(0,-3)}`,raw=text(path);
 let lesson;try{lesson=parseLesson(raw,id);}catch(e){structural.push({path,issue:'parse error',detail:e.message});continue;}
 (parsedTracks[track] ||= []).push(lesson);
 let fence=false;
 raw.split('\n').forEach((line,i)=>{if(/^```/.test(line)){fence=!fence;return;}if(fence&&/^##\s/.test(line))structural.push({path,line:i+1,issue:'level-two heading inside fenced content',detail:line});});
 if(fence)structural.push({path,issue:'odd number of backtick fence delimiter lines'});
 const prose=[lesson.intro,...lesson.steps.flatMap(s=>[s.prose,s.explain])].join('\n').replace(/```[\s\S]*?```/g,' ');
 const record={id,path,title:lesson.title,runtime:lesson.runtime,meta:lesson.meta,profile:learningProfile(track),steps:[],signals:[],skills:Object.fromEntries(Object.entries(skillPatterns).map(([k,re])=>[k,re.test(prose)]))};
 for(const [k,re] of Object.entries(signalPatterns))if(!re.test(prose))record.signals.push(`${k}: text signal not detected`);
 for(const step of lesson.steps){
   const p=[step.prose,step.explain].join('\n').replace(/```[\s\S]*?```/g,' ');
   const task=taskHeading.test(step.title)||taskProse.test(p),named=taskHeading.test(step.title),proseOptional=optionalProse.test(p);
   const checks=step.checks||[],kinds=countBy(checks.map(c=>c.kind));
   const inputCases=[...new Set(checks.filter(c=>c.kind==='run'&&c.opts.stdin!=null).map(c=>c.opts.stdin))];
   const presenceOrSourceOnly=checks.length>0&&checks.every(c=>['file','dir','missing','contains','lacks','matches'].includes(c.kind));
   let changedLines=0,codeLines=0;
   if(step.target!=null){codeLines=step.target.split('\n').length;const key=`${track}:${step.file}`;const prev=targets.get(key)||'';changedLines=diffLines(prev,step.target).filter(op=>op.type!=='same'&&op.line.trim()).length;targets.set(key,step.target);}
   else if(step.edit){codeLines=step.edit.code.trim().split('\n').length;changedLines=codeLines;}
   const signal=[];
   if(task&&!step.hints?.length)signal.push('independent task candidate without parsed hint ladder');
   if(task&&step.target!=null&&lesson.meta.reference!=='optional')signal.push('task candidate has visible target (review whether independent)');
   if(proseOptional&&!step.optional)signal.push('prose optional but parser treats as teaching step');
   if(presenceOrSourceOnly)signal.push('checks inspect only presence/source');
   if(step.file&&!checks.length)signal.push('code step has no automatic check');
   if(!step.provided&&changedLines>40)signal.push('authored code change exceeds 40 nonblank lines');
   if((step.hints||[]).some(h=>h.length<3))signal.push('hint ladder has fewer than three rungs');
   if(checks.some(c=>c.kind==='run'&&c.opts.stdout!=null&&!c.opts.without))signal.push('positive stdout match uses substring only');
   if(step.extraTargets?.length)structural.push({path,step:step.title,issue:'multiple targets in one step',detail:step.extraTargets});
   const r={id:step.id,title:step.title,file:step.file,provided:!!step.provided,optionalInUi:!!step.optional,optionalInProse:proseOptional,taskCandidate:task,taskHeading:named,checks:checks.length,checkKinds:kinds,inputCases:inputCases.length,osFilters:checks.filter(c=>c.opts.os).map(c=>c.opts.os),predictions:step.predictions?.length||0,verifiedPredictions:step.predictions?.filter(p=>p.verify).length||0,hintLadders:step.hints?.map(h=>h.map(r=>r.key))||[],targetLines:codeLines,authoredChangedLines:changedLines,signals:signal};
   record.steps.push(r);
   for(const f of step.figures||[])figures.push({path,step:step.title,...f});
 }
 const tasks=record.steps.filter(s=>s.taskCandidate);
 if(!tasks.length)record.signals.push('independent task candidate not detected');
 if(!record.steps.some(s=>s.predictions))record.signals.push('no parsed prediction box (prose may still predict)');
 if(!record.steps.some(s=>s.checks))record.signals.push('no automatic checks');
 if(lesson.meta.support)for(const name of lesson.meta.support.split(',').map(s=>s.trim()).filter(Boolean))if(!existsSync(resolve(root,base,track,'support',name)))structural.push({path,issue:'missing support file',detail:name});
 const linkText=raw.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`/g,match=>match.replace(/[^\n]/g,' '));
 for(const match of linkText.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)){
   const target=match[1];if(/^(?:https?:|#|mailto:|data:)/.test(target))continue;
   const file=target.split('#')[0].split('?')[0];if(!file)continue;
   const ok=existsSync(resolve(root,dirname(path),decodeURIComponent(file)));
   if(!ok)links.push({path,line:raw.slice(0,match.index).split('\n').length,target,status:'unresolved local Markdown link'});
 }
 lessons.push(record);
 excerpts.push({id,intro:lesson.intro,firstStep:lesson.steps[0]?.title,firstProse:lesson.steps[0]?.prose.slice(0,1400),lastStep:lesson.steps.at(-1)?.title,lastProse:lesson.steps.at(-1)?.prose.slice(0,1100),tasks:lesson.steps.filter(s=>taskHeading.test(s.title)).map(s=>({title:s.title,prose:s.prose.slice(0,800)}))});
}
const keys=Object.keys(parsedTracks).sort((a,b)=>Number(parsedTracks[a].find(l=>l.meta.trackOrder)?.meta.trackOrder||Infinity)-Number(parsedTracks[b].find(l=>l.meta.trackOrder)?.meta.trackOrder||Infinity)||a.localeCompare(b));
const series=studioSeries(parsedTracks,keys,key=>parsedTracks[key].find(l=>l.meta.track)?.meta.track||key);
const tracks=Object.keys(parsedTracks).sort().map(key=>{
 const rows=lessons.filter(l=>l.id.startsWith(key+'/')),flat=rows.flatMap(l=>l.steps),first=rows[0],last=rows.at(-1),firstTask=rows.find(l=>l.steps.some(s=>s.taskCandidate));
 return {key,profile:learningProfile(key),lessons:rows.length,first:first.id,last:last.id,firstIndependentCandidate:firstTask?.id||null,firstIntro:parsedTracks[key][0].intro,firstPrerequisiteSignal:/prerequis|assum|you (?:already|should|must)|before (?:starting|this)|previous|earlier|completed?/i.test(parsedTracks[key][0].intro),checks:flat.reduce((n,s)=>n+s.checks,0),checkKinds:countBy(flat.flatMap(s=>Object.entries(s.checkKinds).flatMap(([k,n])=>Array(n).fill(k)))),parsedPredictions:flat.reduce((n,s)=>n+s.predictions,0),taskCandidates:flat.filter(s=>s.taskCandidate).length,taskCandidatesWithoutLadders:flat.filter(s=>s.taskCandidate&&!s.hintLadders.length).length,optionalUi:flat.filter(s=>s.optionalInUi).length,optionalMismatch:flat.filter(s=>s.optionalInProse&&!s.optionalInUi).length,largeChangeSteps:flat.filter(s=>!s.provided&&s.authoredChangedLines>40).length,walkthroughFiles:readdirSync(resolve(root,'src/labs/project-studio')).filter(name=>name.toLowerCase().replace(/[^a-z]/g,'').startsWith(key.replace(/[^a-z]/g,''))&&/test/.test(name)),skillSignals:Object.fromEntries(Object.keys(skillPatterns).map(k=>[k,rows.filter(l=>l.skills[k]).length]))};
});
const notebooks=[];
for(const s of SERIES_MANIFEST){const written=[];for(const l of s.lessons){const path=`src/tools/notebook-lab/series/${s.dir}/${l.slug}.md`;if(!existsSync(resolve(root,path)))continue;try{const p=parseNotebook(text(path));written.push({id:l.id,path,titleMatches:p.title===l.title,cells:p.cells.length,challenges:p.cells.filter(c=>c.challengeType).length});}catch(e){written.push({id:l.id,path,error:e.message});}}notebooks.push({id:s.id,planned:s.lessons.length,written:written.length,lessons:written});}
const stepRows=lessons.flatMap(l=>l.steps);
for(const figure of figures){
 const bits=figure.name.split('/');const module=bits[0]==='ml-lab'?`src/labs/ml-lab/labs/${bits[1]}/figures.jsx`:{aml:'src/labs/project-studio/figures/aml.jsx',dice:'src/labs/project-studio/figures/dice.jsx','dice-start':'src/labs/project-studio/figures/dicePreview.jsx'}[bits[0]];
 figure.module=module;figure.exportName=bits.at(-1);
 if(!module||!existsSync(resolve(root,module))){figure.resolves=false;continue;}
 const ast=parseJs(text(module),{sourceType:'module',plugins:['jsx']});const names=[];
 for(const statement of ast.program.body){if(statement.type!=='ExportNamedDeclaration')continue;for(const spec of statement.specifiers||[])names.push(spec.exported.name);const d=statement.declaration;if(d?.id)names.push(d.id.name);for(const v of d?.declarations||[])if(v.id?.name)names.push(v.id.name);}
 figure.resolves=names.includes(figure.exportName);
}
const notebookIds=new Map(notebooks.flatMap(s=>s.lessons.map(l=>[l.id,l])));
const companions=lessons.flatMap(l=>(l.meta.notebook||'').split(',').map(s=>s.trim()).filter(Boolean).map(id=>({lesson:l.id,notebook:id,written:notebookIds.has(id)})));
const report={date:'2026-10-06',method:'Read-only source census using shipped parsers; heuristic signals are candidates, not teaching-quality verdicts. Authored change size assumes preceding targets in the same track and ignores external edits/provided support. No learner command is executed by this scanner.',summary:{lessons:lessons.length,tracks:tracks.length,steps:stepRows.length,checks:stepRows.reduce((n,s)=>n+s.checks,0),structuralFindings:structural.length,unresolvedLocalLinks:links.length,figureReferences:figures.length,unresolvedFigureExports:figures.filter(f=>!f.resolves).length,unwrittenNotebookCompanions:companions.filter(c=>!c.written).length,taskCandidates:stepRows.filter(s=>s.taskCandidate).length,headingTasks:stepRows.filter(s=>s.taskHeading).length,headingTasksWithoutLadders:stepRows.filter(s=>s.taskHeading&&!s.hintLadders.length).length,headingTasksWithoutLaddersNonoptionalProse:stepRows.filter(s=>s.taskHeading&&!s.hintLadders.length&&!s.optionalInProse&&!s.optionalInUi).length,taskCandidatesWithoutLadders:stepRows.filter(s=>s.taskCandidate&&!s.hintLadders.length).length,optionalProseUiMismatches:stepRows.filter(s=>s.optionalInProse&&!s.optionalInUi).length,largeChangeSteps:stepRows.filter(s=>!s.provided&&s.authoredChangedLines>40).length,presenceSourceOnlySteps:stepRows.filter(s=>s.signals.includes('checks inspect only presence/source')).length},series:series.map(s=>({key:s.key,label:s.label,profile:learningProfile(s.key),chapters:s.chapters.map(c=>c.key)})),tracks,lessons,structural,localLinks:links,figures,companions,notebooks};
writeFileSync(resolve(out,'studio-source-baseline.json'),JSON.stringify(hashes,null,2));
writeFileSync(resolve(out,'studio-observations.json'),JSON.stringify(report,null,2));
writeFileSync(resolve(out,'studio-excerpts.json'),JSON.stringify(excerpts,null,2));
console.log(JSON.stringify(report.summary,null,2));
console.log('TRACKS '+tracks.map(t=>t.key).join(', '));
console.log('STRUCTURAL '+JSON.stringify(structural));
