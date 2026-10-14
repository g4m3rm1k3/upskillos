// Author verification: reconstruct every learner file and run the desktop check protocol.
// HTML checks use Happy DOM + a VM for trusted authored classic scripts; visual/WebGL
// review still needs a real browser. ES modules are checked by real Node subprocesses.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Window } from 'happy-dom';
import { parseLesson } from '../src/labs/project-studio/parseTrack.js';
import { studioSeries } from '../src/labs/project-studio/series.js';
const require = createRequire(import.meta.url);
const { runChecks } = require('../desktop/app/project-checks.cjs');
const base = path.resolve('src/labs/project-studio');
const answers = JSON.parse(fs.readFileSync(path.join(base,'tabletopFixtures/exercises.json')));
const tracks = Object.fromEntries(fs.readdirSync(path.join(base,'tracks')).filter(x=>x.startsWith('tabletop-')).map(track=>[track,
  fs.readdirSync(path.join(base,'tracks',track)).filter(x=>x.endsWith('.md')).sort().map(file=>parseLesson(fs.readFileSync(path.join(base,'tracks',track,file),'utf8'),`${track}/${file.slice(0,-3)}`))]));
const series = studioSeries(tracks,Object.keys(tracks),x=>x).find(s=>s.key==='tabletop');
const root = fs.mkdtempSync(path.join(os.tmpdir(),'tabletop-walk-'));
fs.symlinkSync(path.resolve('node_modules'),path.join(root,'node_modules'),'dir');
function write(file,content) { const dest=path.join(root,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content); }
async function evalInPage(file,expr) {
 const window = new Window({settings:{disableJavaScriptEvaluation:true}});
 try {
  window.document.write(fs.readFileSync(file,'utf8'));
  const context=vm.createContext({document:window.document,window,console:{log(){}},Math,JSON});
  for(const script of window.document.querySelectorAll('script')) {
   assert(!script.src && script.type!=='module','DOM adapter only supports inline classic scripts');
   vm.runInContext(script.textContent,context,{timeout:2000});
  }
  return {ok:true,value:vm.runInContext(expr,context,{timeout:2000})};
 } catch(error) { return {ok:false,reason:error.message}; }
 finally { await window.happyDOM.close(); }
}
let lessons=0,checks=0,wrong=0,exercises=0;
try {
 for(const chapter of series.chapters) for(const lesson of tracks[chapter.key]) {
  for(const step of lesson.steps) {
   if(step.file) write(step.file,step.target);
   const key=`${lesson.id}#${step.title}`;
   const answer=answers[key];
   if(step.title.startsWith('Your turn')) {assert(answer,`Missing exercise fixture: ${key}`);assert(!step.file,`Exercise reveals answer: ${key}`);exercises++;}
   for(const candidate of answer?.wrong??[]) {
    const original=Object.fromEntries(Object.keys(candidate.files).map(file=>[file,fs.existsSync(path.join(root,file))?fs.readFileSync(path.join(root,file)):null]));
    for(const [file,content] of Object.entries(candidate.files))write(file,content);
    const result=await runChecks(root,step.checks,{env:process.env,evalInPage});
    assert(result.ok && result.results.some(r=>!r.pass),`Wrong answer accepted: ${key} ${candidate.name}`);
    for(const [file,content] of Object.entries(original))content===null?fs.rmSync(path.join(root,file)):write(file,content);
    wrong++;
   }
   for(const [file,content] of Object.entries(answer?.files??{}))write(file,content);
   if(step.checks.length) {
    const result=await runChecks(root,step.checks,{env:process.env,evalInPage});
    assert(result.ok && result.results.every(r=>r.pass),`${key}\n${JSON.stringify(result,null,2)}`);
    checks+=result.results.length;
   }
  }
  lessons++;console.log(`PASS ${lesson.id}`);
 }
 for(const file of fs.readdirSync(path.join(base,'tabletopFixtures/reference')).filter(f=>/\.(mjs|html|css|json)$/.test(f))) {
  assert.equal(fs.readFileSync(path.join(root,file),'utf8').trimEnd(),fs.readFileSync(path.join(base,'tabletopFixtures/reference',file),'utf8').trimEnd(),`Final ${file} differs from reference`);
 }
 assert.equal(exercises,Object.keys(answers).length,'Unused exercise fixtures');
 console.log(`PASS ${lessons} lessons, ${checks} checks, ${exercises} independent exercises, ${wrong} rejected wrong answers; final app matches reference.`);
} finally {fs.rmSync(root,{recursive:true,force:true});}
