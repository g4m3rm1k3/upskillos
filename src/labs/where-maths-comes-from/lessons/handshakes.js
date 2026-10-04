import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l3",
  title: "Rows and handshakes",
  chapter: "Connections",
  order: 50,
  prompt: "How could everyone greet everyone else without missing or repeating a pair?",
  discovery: {"start": "Five people are in a room; nobody has greeted anyone yet.", "notice": "Tap two people to make a greeting. Connections can be made, removed, or inspected without first calculating their total.", "question": "How could everyone greet everyone else without missing or repeating a pair?", "transfer": "At a tournament, every team plays every other team once. How would you keep track of matches?", "views": [{"target": "triangle-view", "label": "Compare growing rows"}]},
  panels: {
    explore: `<p>Five people meet. Choose whom to greet, or add someone to the room. What helps you keep track of greetings?</p>
<details><summary>Choose a growing-row comparison</summary><div class="row"><label>Rows <input type="range" id="rows" min="1" max="10" value="5"> <b id="rv">5</b></label></div></details>`,
    scene: `<div class="stage"><svg id="hs" viewBox="0 0 260 260" width="260" role="group" aria-label="People to tap, a line for each handshake"></svg></div>`,
    connections: `<h3 style="margin:18px 0 4px;font-size:1.1rem">Keep track of greetings</h3>
<p>Suppose everyone wants to greet everyone else once. Tap one person, then another, to make them shake. The number inside each person counts their handshakes. Can you reach every pair without repeating?</p>
<div class="row"><button id="hadd">Add a person</button><button id="hrm" class="alt">Remove a person</button><button id="hall" class="alt">Show me every pair</button><button id="hclr" class="alt">Clear</button></div>
<div id="triangle-view"><div class="stage"><svg id="dots" viewBox="0 0 400 290" width="400" role="img" aria-label="Triangle of dots in a numbered grid with running totals"></svg></div></div>
<p id="hc">Handshakes: <b>0</b> of 10. Tap one person, then another.</p>`,
    explanation: `<p id="eq" style="font-size:1.05rem;font-weight:600">1 + 2 + 3 + 4 + 5 = <span style="color:var(--a)">15</span><br><span style="font-weight:400">The grid has 5 rows × 6 columns = 30 spots: <span style="color:var(--a)">15 filled</span> + <span style="color:var(--b)">15 empty</span></span></p>
<div class="stage"><table id="tb"><tbody><tr><th>Rows</th><th>New dots</th><th>Total so far</th><th>This total + the one before</th><th>As a square</th></tr><tr data-r="1" class=" "><td>1</td><td>+1</td><td>1</td><td>0 + 1 = 1</td><td>1 × 1</td></tr><tr data-r="2" class=" "><td>2</td><td>+2</td><td>3</td><td>1 + 3 = 4</td><td>2 × 2</td></tr><tr data-r="3" class=" "><td>3</td><td>+3</td><td>6</td><td>3 + 6 = 9</td><td>3 × 3</td></tr><tr data-r="4" class=" "><td>4</td><td>+4</td><td>10</td><td>6 + 10 = 16</td><td>4 × 4</td></tr><tr data-r="5" class=" cur"><td>5</td><td>+5</td><td>15</td><td>10 + 15 = 25</td><td>5 × 5</td></tr><tr data-r="6" class="off "><td>6</td><td>+6</td><td>21</td><td>15 + 21 = 36</td><td>6 × 6</td></tr><tr data-r="7" class="off "><td>7</td><td>+7</td><td>28</td><td>21 + 28 = 49</td><td>7 × 7</td></tr><tr data-r="8" class="off "><td>8</td><td>+8</td><td>36</td><td>28 + 36 = 64</td><td>8 × 8</td></tr><tr data-r="9" class="off "><td>9</td><td>+9</td><td>45</td><td>36 + 45 = 81</td><td>9 × 9</td></tr><tr data-r="10" class="off "><td>10</td><td>+10</td><td>55</td><td>45 + 55 = 100</td><td>10 × 10</td></tr></tbody></table></div>
<div class="note"><b>Predict.</b> Look at the totals. With 11 rows, how many dots?
<div class="row"><input type="number" id="g" aria-label="Your guess" style="width:90px"><button id="gb">Check</button><span id="gr"></span></div></div>
<div class="note name hide" id="nm"><b>What the triangle was hiding.</b>
<ul>
<li><b>Add the next row.</b> 55 is 45 + 10, and 45 is 36 + 9. Every total is the one before plus the new row.</li>
<li><b>Neighbours make squares.</b> 36 + 45 = 81 = 9 × 9, and 45 + 55 = 100 = 10 × 10.</li>
<li><b>Pairs.</b> In 1 + 2 + … + 10, pair the ends: 1 + 10, 2 + 9, 3 + 8, 4 + 7, 5 + 6. Five pairs of 11 is 55, which is half of the grid, 10 × 11.</li>
<li><b>Handshakes.</b> 11 people, 55 handshakes. Each new person adds as many as there were people already in the room.</li>
<li><b>Odd, odd, even, even.</b> The totals keep that rhythm: 1, 3, 6, 10, 15, 21, 28, 36, 45, 55.</li></ul>
As a rule:
<div style="font-size:1.3rem;margin-top:4px"><i>T</i>(<i>n</i>) = <i>n</i>(<i>n</i> + 1) / 2</div></div>`,
  },
  mount({ root, $, el, PC, Tn, say, on, requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval }) {
const S=26;
function l3(){
 const k=+$("rows").value;$("rv").textContent=k;
 const d=$("dots");d.innerHTML="";
 const tx=(x,y,v,a,c)=>{const t=el("text",{x,y,"text-anchor":a||"middle","font-size":11,fill:c||"var(--mute)"},d);t.textContent=v};
 for(let i=0;i<=k;i++)tx(30+i*S,14,i+1);
 tx(30+k*S+22,14,"adding up","start");
 for(let r=1;r<=k;r++){tx(8,36+(r-1)*S,r);
  for(let i=0;i<=k;i++){const on=i<r;el("circle",{cx:30+i*S,cy:32+(r-1)*S,r:10,fill:on?"var(--a)":"none",stroke:on?"none":"var(--b)","stroke-width":2,"stroke-opacity":.85},d)}
  tx(30+k*S+22,36+(r-1)*S,r==1?"1":`${Tn(r-1)} + ${r} = ${Tn(r)}`,"start","var(--ink)")}
 const T=Tn(k);
 $("eq").innerHTML=`${Array.from({length:k},(_,i)=>i+1).join(" + ")} = <span style="color:var(--a)">${T}</span><br><span style="font-weight:400">The grid has ${k} rows &times; ${k+1} columns = ${k*(k+1)} spots: <span style="color:var(--a)">${T} filled</span> + <span style="color:var(--b)">${T} empty</span></span>`;
 let h="<tr><th>Rows</th><th>New dots</th><th>Total so far</th><th>This total + the one before</th><th>As a square</th></tr>";
 for(let q=1;q<=10;q++)h+=`<tr data-r="${q}" class="${q>k?"off":""} ${q==k?"cur":""}"><td>${q}</td><td>+${q}</td><td>${Tn(q)}</td><td>${Tn(q-1)} + ${Tn(q)} = ${q*q}</td><td>${q} &times; ${q}</td></tr>`;
 $("tb").innerHTML=h;
 }
$("rows").oninput=l3;
let hp=5,hset=new Set(),hsel=-1;
const hk=(a,b)=>a<b?a+"-"+b:b+"-"+a;
function hs(){
 const s=$("hs");s.innerHTML="";const N=hp,P=i=>[130+100*Math.sin(2*Math.PI*i/N),130-100*Math.cos(2*Math.PI*i/N)];
 hset.forEach(k=>{const[a,b]=k.split("-").map(Number),[x1,y1]=P(a),[x2,y2]=P(b);el("line",{x1,y1,x2,y2,stroke:"var(--a)","stroke-width":2.5,opacity:.85},s)});
 const deg=i=>[...hset].filter(k=>k.split("-").includes(""+i)).length;
 for(let i=0;i<N;i++){const[x,y]=P(i);
  const c=el("circle",{cx:x,cy:y,r:15,fill:i==hsel?"var(--b)":"var(--ink)",tabindex:0,role:"button","aria-label":"Person "+(i+1),style:"cursor:pointer"},s);
  const t=el("text",{x,y,"text-anchor":"middle","dominant-baseline":"central","font-size":13,"font-weight":700,fill:i==hsel?"#0d1b26":"var(--paper)","pointer-events":"none"},s);t.textContent=deg(i);
  const pick=()=>{if(hsel<0)hsel=i;else if(hsel==i)hsel=-1;else{const q=hk(hsel,i);hset.has(q)?hset.delete(q):hset.add(q);hsel=-1}hs()};
  c.onclick=pick;c.onkeydown=e=>{if(e.key=="Enter"||e.key==" "){e.preventDefault();pick()}}}
 const T=Tn(N-1);
 $("hc").innerHTML=hset.size==T?`<b>Every pair has shaken: ${T} handshakes.</b> ${N} people each shook ${N-1} hands, so ${N} &times; ${N-1} = ${N*(N-1)}, but each handshake was counted twice. Half of ${N*(N-1)} is ${T}. It is the triangle again: ${Array.from({length:N-1},(_,i)=>N-1-i).join(" + ")} = ${T}.`:`Handshakes: <b>${hset.size}</b> of ${T}. ${hsel>=0?"Now tap who they shake hands with.":"Tap one person, then another."}`;
}
$("hadd").onclick=()=>{if(hp<10){hp++;hs()}};
$("hrm").onclick=()=>{if(hp>2){hp--;hset=new Set([...hset].filter(k=>k.split("-").every(v=>+v<hp)));hsel=-1;hs()}};
$("hall").onclick=()=>{for(let a=0;a<hp;a++)for(let b=a+1;b<hp;b++)hset.add(hk(a,b));hs()};
$("hclr").onclick=()=>{hset.clear();hsel=-1;hs()};
hs();
$("tb").onclick=e=>{const tr=e.target.closest("tr[data-r]");if(tr){$("rows").value=tr.dataset.r;l3()}};
$("gb").onclick=()=>{const v=+$("g").value,r=$("gr");
 if(v==66){r.innerHTML='<span class="ok">Yes, 66: the 55 from before plus a new row of 11.</span>';$("nm").classList.remove("hide");}
 else r.innerHTML='<span class="no">Not quite. Look at how each total grows from the one before.</span>'};
l3();

let lastPeople=hp,lastPairs=hset.size;
function explain() {
 const rows=+$("rows").value,total=Tn(hp-1),remaining=total-hset.size;
 say(hp!==lastPeople?`${hp>lastPeople?'A person joined':'A person left'} the room. There are now ${hp} people and ${total} possible pairs.`:hset.size!==lastPairs?`${hset.size>lastPairs?'You connected':'You disconnected'} a pair. ${hset.size} different pairs are now linked.`:`The room has ${hp} people. ${remaining} pairs are still unconnected.`,
 hsel>=0 ? `Person ${hsel+1} is selected. Pick another person to create one shared connection. A connection belongs to both people, but it is only one handshake.` : remaining===0 ? `Everyone is connected. Counting each person's ${hp-1} connections counts every line at both ends. Counting lines once gives ${total}. Another way is to add the newcomer connections: one person adds one, the next adds two, and so on.` : `A new person needs a connection to each person already present. That growth is the same as adding the next row to the dot triangle. The pictured ${rows} rows contain ${Tn(rows)} dots; ${rows+1} people would have that many pairs.`,
 'Connect a few pairs, then add someone. Which old lines stay, and which new lines are still missing?');
 lastPeople=hp;lastPairs=hset.size;
}

on(root,"input",explain);on(root,"change",explain);on(root,"click",explain);on(root,"keydown",event=>{if(event.key==="Enter"||event.key===" ")explain()});
explain();

  },
})
