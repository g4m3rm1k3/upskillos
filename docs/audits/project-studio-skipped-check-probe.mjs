import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const root=resolve(process.argv[2] || '.');
const require=createRequire(`${root}/package.json`);
const {runChecks}=require(`${root}/desktop/app/project-checks.cjs`);
const result=await runChecks(process.cwd(),[{kind:'file',args:['audit-file-that-does-not-exist'],opts:{os:process.platform==='win32'?'mac':'windows'}}]);
const savedPass=result.results.length===1&&result.results.every(r=>r.pass);
const panelPass=result.results.length===1&&result.results.every(r=>r.pass&&!r.skipped);
console.log(JSON.stringify({probe:'Skipped file check using shipped checker, no files created',result,savedProgressPredicate:savedPass,visiblePanelPredicate:panelPass},null,2));
