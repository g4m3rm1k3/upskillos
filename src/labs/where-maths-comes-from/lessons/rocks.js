import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l1",
  title: "Rocks and marks",
  chapter: "Quantity",
  order: 0,
  assessment: { kind: 'counting', collections: [2, 0, 7, 3, 0, 6] },
  prompt: "How long does counting take, and could arranging the rocks make it easier?",
  discovery: {"start": "There are no rocks here yet. You can build your own collection.", "notice": "A counting record is optional. The rocks can remain loose, or you can choose an arrangement.", "question": "How long does counting take, and could arranging the rocks make it easier?", "transfer": "If you were counting a jar of buttons, would you arrange them the same way? How would you check that nothing was missed?", "views": []},
  panels: {
    explore: `<p>Add some loose rocks. How long does it take to count them without losing your place?</p>
<div class="row"><button id="rm">Remove a rock</button><button id="ad">Add a rock</button></div>
<div class="row"><button id="count-start">Try counting</button><button id="make-groups">Make groups</button><button id="ungroup" hidden>Ungroup</button></div>
<div id="group-controls" hidden><label>How many per group? <select id="group-size"><option value="">Choose a size</option><option value="2">2</option><option value="3">3</option><option value="5">5</option><option value="10">10</option></select></label><p>The app arranges the rocks for you. Compare counting effort; this does not measure how long you would take to make groups yourself.</p><div class="row"><button id="add-group" disabled>Add a full group</button><button id="remove-group" disabled>Remove a full group</button></div></div>
<p id="count-instruction"></p><p id="count-results" role="status"></p>`,
    scene: `<div class="stage"><svg id="rocks" viewBox="0 0 300 240" width="280" role="group" aria-label="Loose rocks"></svg><p id="group-summary"></p><p id="skip-count"></p></div>`,
    connections: `<button id="show-record">Show a counting record</button><div id="record" hidden><div class="row" style="gap:28px"><div><div>Tally</div><svg id="tally" viewBox="0 0 240 44" width="240" height="44" role="img" aria-label="Tally marks"></svg></div><div><div>Symbol</div><div class="big" id="num">0</div></div></div></div>`,
    explanation: `<div class="note" id="l1msg"><b>Nothing here.</b> You had rocks, took them all, and now need a way to say “none”. Zero names how many rocks remain. The collection with no members is an empty set.</div>`,
  },
  mount({ root, $, el, PC, Tn, say, on, requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval }) {
let n=0, size=null, counting=false, started=0, counted=new Set(), results=[];
const positions=Array.from({length:60},(_,i)=>({x:18+(i*73)%264,y:18+(i*47)%204}));
function finishUnit(key) {
 if(!counting || counted.has(key))return;
 counted.add(key);
 const units=size?Math.ceil(n/size):n;
 if(counted.size===units){
  counting=false;
  const seconds=Math.max(.1,(performance.now()-started)/1000);
  results.push({n,size,seconds});
  $("count-results").textContent=results.filter(x=>x.n===n).map(x=>`${x.size?`Groups of ${x.size}`:'Loose rocks'}: ${x.seconds.toFixed(1)} seconds`).join(' · ');
  $("count-instruction").textContent='You visited every rock or group once. Did this arrangement help you keep your place? These are your own trial times, not a score.';
 }
 draw();explain();
}
function accessible(node,key,label){
 node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',label);
 node.setAttribute('aria-pressed',String(counted.has(key)));
 node.onclick=()=>finishUnit(key);
 node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();finishUnit(key)}};
}
function draw(){
 const r=$("rocks");const focus=r.contains(document.activeElement)?document.activeElement.getAttribute('aria-label'):null;r.innerHTML='';
 const full=size?Math.floor(n/size):0,left=size?n%size:0,rows=size?Math.max(1,Math.ceil(n/size)):1;
 r.setAttribute('viewBox',size?`0 0 300 ${rows*42+12}`:'0 0 300 240');
 r.setAttribute('aria-label',size?'Rocks arranged into optional groups':'Loose rocks');
 if(size){
  for(let row=0;row<rows;row++){
   const group=el('g',{},r);
   if(row<full)el('rect',{x:4,y:row*42+4,width:292,height:38,rx:8,fill:counted.has(row)?'var(--line)':'transparent',stroke:'var(--a)'},group);
   for(let j=0;j<Math.min(size,n-row*size);j++)el('circle',{cx:18+j*(264/Math.max(size-1,1)),cy:24+row*42,r:size===10?10:12,fill:row<full?'var(--a)':'var(--b)',opacity:counted.has(row)?.4:1},group);
   if(n>0)accessible(group,row,row<full?`Count group ${row+1}`:'Count leftover rocks');
  }
 }else for(let i=0;i<n;i++){
  const rock=el('circle',{cx:positions[i].x,cy:positions[i].y,r:11,fill:'var(--a)',opacity:counted.has(i)?.4:1},r);
  accessible(rock,i,`Count rock ${i+1}`);
 }
 if(focus)Array.from(r.querySelectorAll('[aria-label]')).find(node=>node.getAttribute('aria-label')===focus)?.focus();
 $("group-summary").textContent=size?`${full} complete group${full===1?'':'s'} of ${size} · ${left} left over`:'Loose rocks. There does not have to be a group.';
 $("skip-count").textContent=size&&full?`Count the complete groups: ${Array.from({length:full},(_,i)=>(i+1)*size).join(' → ')}${left?`; then ${left} more makes ${n}.`:'.'}`:'';
 $("rm").disabled=n===0;$("ad").disabled=n===60;$("count-start").disabled=n===0;
 $("add-group").disabled=!size||n+size>60;$("remove-group").disabled=!size||n<size;
 const t=$("tally");t.innerHTML='';t.setAttribute('viewBox',`0 0 ${Math.max(240,Math.ceil(n/5)*44)} 44`);
 for(let i=0;i<n;i++){const q=Math.floor(i/5),k=i%5,x=q*44;
  el('line',k<4?{x1:x+k*9+4,y1:6,x2:x+k*9+4,y2:38,stroke:'var(--ink)','stroke-width':3}:{x1:x,y1:34,x2:x+38,y2:10,stroke:'var(--a)','stroke-width':3},t);
 }
 $("num").textContent=n;
 $("l1msg").textContent=size?`${full} × ${size} + ${left} = ${n}. The remainder is ${left}: ${n} mod ${size} = ${left}. Modulo names the leftover amount, not the number of full groups.`:'One mark can stand for each rock. Zero names the size of an empty collection. The conventional tally record bundles marks in fives; the rocks need not be grouped.';
}
let before=0;
function explain(){
 const change=n-before;
 if(size){const full=Math.floor(n/size),left=n%size;
 say(`${full} complete groups of ${size}, with ${left} left over. The same ${n} rocks are here.`,
 `Each outlined group contains ${size} rocks. ${left?'The loose rocks cannot fill another group. This leftover amount is called the remainder.':'There are no leftovers: the remainder is zero.'}${size===2?left?' One rock has no partner: this collection is odd.':' Every rock has a partner: this collection is even.':''}`,
 'Try counting this arrangement, then ungroup or choose another size. Does grouping make counting easier for you?');
 }else say(n===0?'The collection here is empty.':`${change===1?'One rock joined the collection. ':change===-1?'One rock left the collection. ':''}The rocks are loose.`,
 n===0?'There is still a collection to talk about, even though it has no members. Zero names that size.':'There is no prescribed arrangement. Count each rock once. Notice whether keeping your place takes effort.',
 n===0?'Add a rock to begin your collection.':'How long does it take to count? Try counting first. You can choose to make groups afterwards and compare.');
 before=n;
}
function changed(){counting=false;counted.clear();$("count-instruction").textContent='';$("count-results").textContent=results.filter(x=>x.n===n).map(x=>`${x.size?`Groups of ${x.size}`:'Loose rocks'}: ${x.seconds.toFixed(1)} seconds`).join(' · ');draw();explain()}
$("ad").onclick=()=>{if(n<60)n++;changed()};$("rm").onclick=()=>{if(n>0)n--;changed()};
$("make-groups").onclick=()=>{$("group-controls").hidden=false;$("ungroup").hidden=false;$("make-groups").hidden=true;$("count-instruction").textContent='Choose how many rocks you would like in each group. Until you choose, they remain loose.'};
$("group-size").onchange=()=>{size=Number($("group-size").value)||null;changed()};
$("ungroup").onclick=()=>{size=null;$("group-size").value='';$("group-controls").hidden=true;$("ungroup").hidden=true;$("make-groups").hidden=false;changed()};
$("add-group").onclick=()=>{if(size&&n+size<=60)n+=size;changed()};$("remove-group").onclick=()=>{if(size&&n>=size)n-=size;changed()};
$("count-start").onclick=()=>{counting=true;counted.clear();started=performance.now();$("record").hidden=true;$("show-record").textContent='Show a counting record';$("count-instruction").textContent=size?'Touch each group once, including any leftovers. Count on by the size of each group.':'Touch each rock once as you count. A touched rock fades so you can keep your place.';draw()};
$("show-record").onclick=()=>{$("record").hidden=!$("record").hidden;$("show-record").textContent=$("record").hidden?'Show a counting record':'Hide the counting record'};
draw();explain();
return {pause(){if(counting){counting=false;counted.clear();$('count-instruction').textContent='The counting trial paused. Start a fresh trial when you return.';draw()}}};
  },
})
