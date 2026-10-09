import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { getLatestWhatsNewId } from '../../../data/whatsNew.js';
const browser = await chromium.launch({ headless: true });
let page;
try {
 page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
 await page.addInitScript(id => { localStorage.setItem('oc-tour-seen','1'); localStorage.setItem('oc-whatsnew-last-seen',id); localStorage.setItem('htmllab_skip_import_html','true'); }, getLatestWhatsNewId());
 await page.routeWebSocket(/.*/, socket => socket.close());
 const pageErrors = [];
 page.on('pageerror', error => pageErrors.push(error.message));
 await page.goto('http://127.0.0.1:5188/#/lab/html-lab');
 await page.getByRole('button', { name: '↻ Run / Restart', exact: true }).waitFor({ timeout: 60000 });
 const maximize = page.getByRole('button',{name:'Maximize window'});
 if (await maximize.count()) await maximize.click();
 const fixture = `<!doctype html><html><head><style>
 body { margin:0; padding:20px; font-family:sans-serif; }
 main { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
 .card { background:rgb(210,230,250); padding:20px; }
 @media (max-width:600px) { main { grid-template-columns:1fr; } .card { background:rgb(255,220,180); } }
 </style></head><body><p>Hello <strong>world</strong> again.</p><main><div class="card">A</div><div class="card">B</div></main><button id="count">Count: 0</button><input id="draft" value="keep me"><script>
 let count=0; document.getElementById('count').onclick=()=>{document.getElementById('count').textContent='Count: '+(++count)}; console.log('ready');
 </script></body></html>`;
 await page.locator('input[type=file]').first().setInputFiles({name:'fixture.html',mimeType:'text/html',buffer:Buffer.from(fixture)});
 const frame=page.frameLocator('iframe[title="Live HTML preview"]');
 await frame.getByText('Hello world again.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'▶ Interact',exact:true}).click();
 await frame.locator('#count').click();
 assert.equal(await frame.locator('#count').innerText(),'Count: 1');
 await frame.locator('#draft').fill('still here');
 // Inspect/Interact changes input routing, not the document or its JS state.
 await page.getByRole('button',{name:'✎ Inspect',exact:true}).click();
 await frame.locator('.card').first().click();
 await page.getByRole('button',{name:'▶ Interact',exact:true}).click();
 assert.equal(await frame.locator('#count').innerText(),'Count: 1');
 await page.getByRole('button',{name:'CSS',exact:true}).click();
 const editor=page.locator('.monaco-editor textarea').first();
 await editor.waitFor({timeout:60000});
 async function replaceCode(code) {
   await page.evaluate(async value => {
     const source = await (await fetch('/src/utils/configureMonaco.js')).text();
     const url = source.match(/import \* as monaco from ["']([^"']+)/)?.[1];
     if (!url) throw new Error('Bundled Monaco import not found');
     const monaco = await import(url);
     const editor = monaco.editor.getEditors().find(editor => editor.getDomNode()?.isConnected);
     if (!editor) throw new Error('No mounted Monaco editor');
     editor.focus(); editor.setValue(value);
   }, code);
 }

 await replaceCode('body { margin: 0; padding: 20px; } main { display:grid; grid-template-columns:1fr 1fr; gap:12px; } .card { background: rgb(180,240,190); padding:20px; } @media (max-width:600px) { main { grid-template-columns:1fr; } }');
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('iframe[title="Live HTML preview"]').contentDocument.querySelector('.card')).backgroundColor==='rgb(180, 240, 190)');
 assert.equal(await frame.locator('#count').innerText(),'Count: 1');
 assert.equal(await frame.locator('#draft').inputValue(),'still here');
 await page.getByRole('button',{name:'✎ Inspect',exact:true}).click();
 await frame.locator('.card').first().click();
 const padding = page.getByLabel('padding',{exact:true});
 if (!(await padding.isVisible())) await page.getByRole('button',{name:/Spacing/}).click();
 await padding.fill('28px');
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('iframe[title="Live HTML preview"]').contentDocument.querySelector('.card')).padding==='28px');
 assert.equal(await frame.locator('#count').innerText(),'Count: 1');
 await page.getByRole('button',{name:'▶ Interact',exact:true}).click();
 await page.getByLabel('Preview width',{exact:true}).selectOption('390px');
 await page.waitForFunction(()=>document.querySelector('iframe[title="Live HTML preview"]').contentWindow.innerWidth===390);
 assert.equal(await frame.locator('main').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),1);
 await page.getByRole('button',{name:'JavaScript',exact:true}).click();
 await replaceCode('console.log("new run"); document.getElementById("count").textContent="Updated";');
 await page.getByText('JavaScript changed.',{exact:false}).waitFor();
 assert.equal(await frame.locator('#count').innerText(),'Count: 1');
 await page.getByRole('button',{name:'↻ Run / Restart',exact:true}).click();
 await frame.getByText('Updated',{exact:true}).waitFor();
 await replaceCode('const broken = ;');
 await page.getByText('Code error — keeping the last working page.',{exact:false}).waitFor();
 assert.equal(await frame.locator('#count').innerText(),'Updated');
 await replaceCode('throw new Error("visible failure");');
 await page.getByRole('button',{name:'↻ Run / Restart',exact:true}).waitFor({state:'visible'});
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Live page"] button').disabled);
 await page.getByRole('button',{name:'↻ Run / Restart',exact:true}).click();
 await page.getByLabel('Preview console').getByText(/visible failure/).waitFor();
 await replaceCode('console.log("final block");');
 await page.getByText('JavaScript changed.',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Visual JS',exact:true}).click();
 await page.locator('button[title="Delete"]').click();
 await page.getByText('See generated JavaScript',{exact:true}).click();
 await page.getByText('// No blocks in this file.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'↻ Run / Restart',exact:true}).click();
 await page.getByLabel('Preview console').getByText('No output yet.',{exact:false}).waitFor();
 await frame.getByText('Hello world again.',{exact:true}).waitFor();
 assert.equal(await frame.locator('#count').innerText(),'Count: 0');
 assert.deepEqual(pageErrors,['visible failure']);
 await page.screenshot({path:'/tmp/html-lab-live.png'});
 console.log('PASS: mixed text, real grid layout, inspect/interact state, live CSS preserving counter/input, property overrides, responsive viewport, manual JS run, syntax-error recovery, runtime console, Visual JS final-block deletion.');
} catch(error) { if(page) await page.screenshot({path:'/tmp/html-lab-failure.png',timeout:5000}).catch(()=>{}); throw error; } finally { await browser.close(); }
