import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l10",
  title: "Coin possibilities",
  chapter: "Chance",
  order: 70,
  prompt: "Do all-heads and a mixture show up equally often? How could you investigate?",
  discovery: {"start": "Coins are ready to flip; no results have been sampled.", "notice": "Try one flip or a batch. The list of all possible stories is a view you can choose after observing results.", "question": "Do all-heads and a mixture show up equally often? How could you investigate?", "transfer": "Would one surprisingly lopsided batch prove that a coin is unfair? What other evidence would you collect?", "views": [{"target": "cc", "label": "Inspect possible stories"}]},
  panels: {
    explore: `<p>Flip coins and inspect what actually happens. You can try a batch, change how many coins you use, or choose to inspect every possible story.</p>
<div class="row"><label>Coins <input type="range" id="cs" min="1" max="5" value="3"> <b id="csv">3</b></label><button id="cf1">Flip once</button><button class="alt" id="cf100">Flip 100 times</button></div>`,
    scene: `<div id="coin-tray" class="stage"></div><div class="stage"><div id="cc" style="display:flex;gap:8px;align-items:flex-start"><div style="flex:1;min-width:64px;background:var(--paper);border-radius:8px;padding:6px;text-align:center"><div style="font-size:.8rem;color:var(--mute)">0 heads</div><div class="big" style="font-size:1.6rem">1</div><div class="chip" id="o0" style="font-family:monospace;margin:3px auto;width:fit-content;padding:1px 6px">TTT</div></div><div style="flex:1;min-width:64px;background:var(--paper);border-radius:8px;padding:6px;text-align:center"><div style="font-size:.8rem;color:var(--mute)">1 head</div><div class="big" style="font-size:1.6rem">3</div><div class="chip" id="o1" style="font-family:monospace;margin:3px auto;width:fit-content;padding:1px 6px">TTH</div><div class="chip" id="o2" style="font-family:monospace;margin:3px auto;width:fit-content;padding:1px 6px">THT</div><div class="chip" id="o4" style="font-family:monospace;margin:3px auto;width:fit-content;padding:1px 6px">HTT</div></div><div style="flex:1;min-width:64px;background:var(--paper);border-radius:8px;padding:6px;text-align:center"><div style="font-size:.8rem;color:var(--mute)">2 heads</div><div class="big" style="font-size:1.6rem">3</div><div class="chip" id="o3" style="font-family:monospace;margin:3px auto;width:fit-content;padding:1px 6px">THH</div><div class="chip" id="o5" style="font-family:monospace;margin:3px auto;width:fit-content;padding:1px 6px">HTH</div><div class="chip" id="o6" style="font-family:monospace;margin:3px auto;width:fit-content;padding:1px 6px">HHT</div></div><div style="flex:1;min-width:64px;background:var(--paper);border-radius:8px;padding:6px;text-align:center"><div style="font-size:.8rem;color:var(--mute)">3 heads</div><div class="big" style="font-size:1.6rem">1</div><div class="chip" id="o7" style="font-family:monospace;margin:3px auto;width:fit-content;padding:1px 6px">HHH</div></div></div></div>`,
    connections: ``,
    explanation: `<p id="cf"></p>
<div class="note name" id="cm">3 coins: 2 × 2 × 2 = <b>8</b> equally likely outcomes. The column sizes are <b>1, 3, 3, 1</b>: that is row 3 of Pascal's triangle. Each outcome is a route through the peg board, left or right at every step.</div>`,
  },
  mount({ root, $, el, PC, Tn, say, on, requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval }) {
let fl=[];
const pop=o=>(o.toString(2).match(/1/g)||[]).length;
function l10(){const n=+$("cs").value;$("csv").textContent=n;$("coin-tray").textContent=fl.length?`Latest trial: ${fl.at(-1)} heads and ${n-fl.at(-1)} tails.`:`${n} coins are ready. Flip them to see what happens.`;const cols=Array.from({length:n+1},()=>[]);
 for(let o=0;o<2**n;o++)cols[pop(o)].push(o);
 $("cc").innerHTML=cols.map((L,h)=>`<div style="flex:1;min-width:64px;background:var(--paper);border-radius:8px;padding:6px;text-align:center"><div style="font-size:.8rem;color:var(--mute)">${h} head${h==1?"":"s"}</div><div class="big" style="font-size:1.6rem">${L.length}</div>${L.map(o=>`<div class="chip" id="o${o}" style="font-family:monospace;margin:3px auto;width:fit-content;padding:1px 6px">${o.toString(2).padStart(n,"0").replace(/1/g,"H").replace(/0/g,"T")}</div>`).join("")}</div>`).join("");
 $("cm").innerHTML=`${n} coin${n>1?"s":""}: ${Array(n).fill(2).join(" &times; ")} = <b>${2**n}</b> equally likely outcomes. The column sizes are <b>${cols.map(c=>c.length).join(", ")}</b>: that is row ${n} of Pascal's triangle. Each outcome is a route through the peg board, left or right at every step.`}
function flips(m){const n=+$("cs").value;let o=0;for(let i=0;i<m;i++){o=Math.floor(Math.random()*2**n);fl.push(pop(o))}
 l10();const e=$("o"+o);e.style.background="var(--b)";e.style.color="#0d1b26";
 $("coin-tray").innerHTML=`<p>Latest trial</p><div class="row">${e.textContent.split('').map(face=>`<span class="wm-coin">${face==='H'?'Heads':'Tails'}</span>`).join('')}</div>`;
 const t=Array(n+1).fill(0);fl.forEach(x=>t[x]++);
 $("cf").innerHTML=`${fl.length} flip${fl.length>1?"s":""} so far. Last: <b>${e.textContent}</b>. Tally by heads: ${t.map((v,i)=>i+" heads: "+v).join(" &nbsp; ")}`}
$("cs").oninput=()=>{fl=[];$("cf").innerHTML="";l10()};
$("cf1").onclick=()=>flips(1);$("cf100").onclick=()=>flips(100);
l10();

function explain() {
 const n=+$("cs").value,counts=Array(n+1).fill(0);fl.forEach(k=>counts[k]++);
 const middle=Math.floor(n/2),ways=PC(n,middle);
 if($('cc').hidden){say(fl.length?`You tried ${fl.length} flips; the latest has ${fl.at(-1)} heads.`:`${n} coins are ready for an experiment.`,fl.length?`Your observed counts are ${counts.map((v,i)=>`${i} heads: ${v}`).join('; ')}. A repeat can differ. These are observations, not a guarantee about the next flip.`:'There are no observations yet. You can begin with one flip or choose a batch.', 'Do mixtures show up as often as all heads? Try more samples or inspect the possible stories if you want to account for the difference.');return}

 say(fl.length?`You have sampled ${fl.length} outcomes. The latest has ${fl.at(-1)} heads.`:`There are ${2**n} possible stories for ${n} fair coin${n===1?'':'s'}. Each row of Hs and Ts is one story.`,
 `All-heads and all-tails each have just one story. ${middle} heads has ${ways} because the heads can occupy different positions. The columns are not equally likely: the individual stories are. ${fl.length?`Your middle-column tally is ${counts[middle]}; its long-run share is about ${Math.round(100*ways/2**n)}%, but a small sample can look very different.`:'That explains why central columns have more ways to occur.'}`,
 'Add a coin. Each old story can end in heads or tails, producing two new stories. Then sample repeatedly and compare the noisy tallies with the fixed list of possibilities.');
}

on(root,"input",explain);on(root,"change",explain);on(root,"click",explain);on(root,"keydown",event=>{if(event.key==="Enter"||event.key===" ")explain()});
explain();

  },
})
