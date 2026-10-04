import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l5",
  title: "Having and owing",
  chapter: "Exchange",
  order: 20,
  prompt: "What changes for each person when a coin changes hands?",
  discovery: {"start": "Ana and Ben have a few coins and can trade in either direction.", "notice": "A trade moves value between people. You can reverse it or reset and try another story.", "question": "What changes for each person when a coin changes hands?", "transfer": "A borrowed lunch token is returned tomorrow. What should the record say before and after the return?", "views": []},
  panels: {
    explore: `<p>Ana has 3 coins and Ben has 2. Make them trade. A tally mark can only say “there is one”. What changes for each person when they trade, and what stays the same?</p>
<div class="row"><button id="ab">Ana pays Ben 1</button><button id="ba">Ben pays Ana 1</button><button class="alt" id="rs">Reset</button></div>`,
    scene: `<div class="stage"><svg id="ow" viewBox="0 0 500 130" role="img" aria-label="Coins and IOUs"></svg></div>`,
    connections: ``,
    explanation: `<div class="note name" id="l5msg"><b>Everyone has coins.</b> Keep paying until Ana runs out, then pay once more.</div>`,
  },
  mount({ root, $, el, PC, Tn, say, on, requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval }) {
let oa=3,ob=2;const sg=v=>v<0?"\u2212"+(-v):""+v;
function l5(){const s=$("ow");s.innerHTML="";
 [["Ana",oa,30],["Ben",ob,95]].forEach(([nm,v,y])=>{
  const t=el("text",{x:4,y:y-8,"font-size":14,"font-weight":700,fill:"var(--ink)"},s);t.textContent=nm+": "+sg(v)+(v<0?" (owes)":"");
  for(let i=0;i<Math.abs(v);i++)el("circle",{cx:16+i*30,cy:y+10,r:11,fill:v>0?"var(--a)":"none",stroke:"var(--c)","stroke-width":v<0?2.5:0,"stroke-dasharray":"4 3"},s)});
 const d=oa<0?["Ana","Ben",oa]:ob<0?["Ben","Ana",ob]:null;
 $("l5msg").innerHTML=d?`<b>${d[0]} owes ${d[1]} ${-d[2]}.</b> ${d[0]} has no coins, but is ${-d[2]} short. We need a new mark for &ldquo;missing&rdquo;: hollow dots, written <b>&minus;${-d[2]}</b>. The total never changes: ${sg(oa)} + ${sg(ob)} = 5.`:(oa==0||ob==0)?"<b>Exactly zero.</b> Nothing in hand, nothing owed. Zero sits between &ldquo;have&rdquo; and &ldquo;owe&rdquo;.":"<b>Everyone has coins.</b> Keep paying until Ana runs out, then pay once more.";
}
$("ab").onclick=()=>{if(ob<12){oa--;ob++;l5()}};$("ba").onclick=()=>{if(oa<12){ob--;oa++;l5()}};$("rs").onclick=()=>{oa=3;ob=2;l5()};l5();

let previousA=oa;
function explain() {
 const owing=oa<0?['Ana','Ben',-oa]:ob<0?['Ben','Ana',-ob]:null;
 const moved=oa<previousA?'Ana just paid Ben. ':oa>previousA?'Ben just paid Ana. ':'';
 say(moved+(owing?`${owing[0]} now owes ${owing[1]} ${owing[2]}.`:oa===0||ob===0?`${oa===0?'Ana':'Ben'} has exactly nothing in hand and nothing owed.`:'Both people have something in hand.'),
 owing ? 'A hollow mark records an obligation, not a coin that physically appeared. The balances show what each person is entitled to after settling the debt. Together they still total five: a payment reduces one balance and increases the other by the same amount.' : 'Watch both collections during a trade. One loses exactly what the other gains. Nothing is created by passing a coin from one person to the other.',
 owing ? `Pay back toward ${owing[0]}. Watch each payment cancel one hollow mark before coins begin accumulating again.` : 'What if someone wants to pay with an empty hand? You can explore an IOU, reverse a payment, or reset. The record must distinguish an obligation from a coin.');
 previousA=oa;
}

on(root,"input",explain);on(root,"change",explain);on(root,"click",explain);on(root,"keydown",event=>{if(event.key==="Enter"||event.key===" ")explain()});
explain();

  },
})
