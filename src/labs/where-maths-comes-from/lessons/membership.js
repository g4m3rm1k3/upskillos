import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l2",
  title: "What belongs where?",
  chapter: "Collections",
  order: 10,
  prompt: "How would you find cards for two different people without making duplicate cards?",
  discovery: {"start": "The box holds twenty different numbered cards, with no sorting rules chosen.", "notice": "Cards can stay together. Choose rules only if sorting would help you find the cards you want.", "question": "How would you find cards for two different people without making duplicate cards?", "transfer": "One friend wants blue books and another wants short books. Where would a short blue book belong?", "views": []},
  panels: {
    explore: `<p>These cards can stay in one box. If sorting would help, choose a rule for either person, or clear both rules.</p>
<div class="row">
<label>Circle A <select id="ra"><option value="none">No sorting rule</option><option value="even">even</option><option value="divisible by 2">divisible by 2</option><option value="odd">odd</option><option value="a multiple of 3">a multiple of 3</option><option value="a multiple of 5">a multiple of 5</option><option value="a multiple of 6">a multiple of 6</option><option value="bigger than 10">bigger than 10</option><option value="a square number">a square number</option></select></label>
<label>Circle B <select id="rb"><option value="none">No sorting rule</option><option value="even">even</option><option value="divisible by 2">divisible by 2</option><option value="odd">odd</option><option value="a multiple of 3">a multiple of 3</option><option value="a multiple of 5">a multiple of 5</option><option value="a multiple of 6">a multiple of 6</option><option value="bigger than 10">bigger than 10</option><option value="a square number">a square number</option></select></label>
</div>`,
    scene: `<div class="stage"><svg id="venn" viewBox="0 0 520 320" width="520" role="img" aria-label="Venn diagram with numbers inside"></svg></div>`,
    connections: ``,
    explanation: `<p id="lg"><b style="color:var(--a)">A</b>: even (10 numbers) &nbsp; <b style="color:var(--b)">B</b>: a multiple of 3 (6 numbers) &nbsp; in neither: 7</p>
<div class="note name" id="l2msg"><b>Overlap.</b> 3 numbers are in both: the <i>intersection</i>. In the <i>union</i> there are 10 + 6 − 3 = 13, because the shared ones were counted twice. The 7 numbers in neither circle still belong to the universal box.</div>`,
  },
  mount({ root, $, el, PC, Tn, say, on, requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval }) {
const rules={"none":()=>false,"even":x=>x%2==0,"divisible by 2":x=>x%2==0,"odd":x=>x%2==1,"a multiple of 3":x=>x%3==0,"a multiple of 5":x=>x%5==0,"a multiple of 6":x=>x%6==0,"bigger than 10":x=>x>10,"a square number":x=>Number.isInteger(Math.sqrt(x))};
const ra=$("ra"),rb=$("rb");
ra.value=rb.value="none";
function l2(){
 if(ra.value==='none'&&rb.value==='none'){
  const v=$('venn');v.innerHTML='';
  for(let i=0;i<20;i++){
   const x=36+(i*73)%448,y=30+(i*47)%250;
   el('circle',{cx:x,cy:y,r:13,fill:'var(--card)',stroke:'var(--a)'},v);
   const t=el('text',{x,y:y+4,'text-anchor':'middle',fill:'var(--ink)','font-size':12},v);t.textContent=i+1;
  }
  $('lg').textContent='No sorting rules chosen.';$('l2msg').textContent='A collection can exist before it is sorted. Rules describe which existing cards belong together.';return;
 }

 const A=rules[ra.value],B=rules[rb.value],g={a:[],ab:[],b:[],u:[]};
 for(let x=1;x<=20;x++)g[A(x)&&B(x)?"ab":A(x)?"a":B(x)?"b":"u"].push(x);
 const ab=g.ab.length,nA=g.a.length+ab,nB=g.b.length+ab;
 const rA=nA?26+17*Math.sqrt(nA):22,rB=nB?26+17*Math.sqrt(nB):22;
 const same=!g.a.length&&!g.b.length,mn=Math.min(nA,nB),f=mn?ab/mn:0;
 const d=same?0:f==1?Math.abs(rA-rB)*.5:(rA+rB+16)*(1-f)+Math.abs(rA-rB)*f;
 const lo=Math.min(-rA,d-rB),hi=Math.max(rA,d+rB),xA=270-(lo+hi)/2,xB=xA+d,cy=170;
 let pts,sp,cr;
 for(const q of [24,20,17,14]){sp=q;cr=q*.42;const m=cr+3;pts={a:[],ab:[],b:[],u:[]};
  for(let x=12+m;x<=508-m;x+=sp)for(let y=38+m;y<=308-m;y+=sp){
   const dA=Math.hypot(x-xA,y-cy),dB=Math.hypot(x-xB,y-cy);
   const ai=dA<=rA-m,ao=dA>=rA+m,bi=dB<=rB-m,bo=dB>=rB+m;
   const k=ai&&bi?"ab":ai&&bo?"a":ao&&bi?"b":ao&&bo?"u":null;if(k)pts[k].push([x,y])}
  if(["a","ab","b","u"].every(k=>pts[k].length>=g[k].length))break}
 const v=$("venn");v.innerHTML="";
 el("rect",{x:4,y:4,width:512,height:312,rx:10,fill:"none",stroke:"var(--mute)","stroke-width":2},v);
 const ut=el("text",{x:16,y:26,"font-size":13,fill:"var(--mute)"},v);ut.textContent="Universal set: the numbers 1 to 20";
 el("circle",{cx:xA,cy,r:rA,fill:"var(--a)","fill-opacity":.18,stroke:"var(--a)","stroke-width":3},v);
 el("circle",{cx:xB,cy,r:rB,fill:"var(--b)","fill-opacity":.18,stroke:"var(--b)","stroke-width":3,"stroke-dasharray":same?"8 8":"none"},v);
 const col={a:"var(--a)",ab:"var(--ink)",b:"var(--b)",u:"var(--mute)"};
 for(const k in g){const P=pts[k];let c=[270,170];
  if(P.length)c=[P.reduce((t,p)=>t+p[0],0)/P.length,P.reduce((t,p)=>t+p[1],0)/P.length];
  P.sort((p,q)=>Math.hypot(p[0]-c[0],p[1]-c[1])-Math.hypot(q[0]-c[0],q[1]-c[1]));
  g[k].forEach((val,i)=>{const p=P[i]||c;
   el("circle",{cx:p[0],cy:p[1],r:cr,fill:"var(--card)",stroke:col[k],"stroke-width":1.5},v);
   const t=el("text",{x:p[0],y:p[1],"text-anchor":"middle","dominant-baseline":"central","font-size":sp*.5,fill:"var(--ink)"},v);t.textContent=val})}
 const lb=(x,y,t,c)=>{const e=el("text",{x,y,"text-anchor":"middle","font-size":16,"font-weight":800,fill:c,stroke:"var(--paper)","stroke-width":4,"paint-order":"stroke"},v);e.textContent=t};
 if(same)lb(xA,cy-rA-8,"A = B","var(--ink)");else{lb(xA-rA*.7,cy-rA*.8,"A","var(--a)");lb(xB+rB*.7,cy-rB*.8,"B","var(--b)")}
 $("lg").innerHTML=`<b style="color:var(--a)">A</b>: ${ra.value} (${nA} numbers) &nbsp; <b style="color:var(--b)">B</b>: ${rb.value} (${nB} numbers) &nbsp; in neither: ${g.u.length}`;
 const rel=same?"<b>Equal sets.</b> A and B have exactly the same members, so the two circles collapse into one. We write A = B.":!ab?"<b>Disjoint sets.</b> Nothing is in both, so the circles pull apart. The overlap is the empty set.":!g.a.length?"<b>A is a subset of B.</b> Every member of A is also in B, so A sits inside B.":!g.b.length?"<b>B is a subset of A.</b> Every member of B is also in A, so B sits inside A.":`<b>Overlap.</b> ${ab} numbers are in both: the <i>intersection</i>. In the <i>union</i> there are ${nA} + ${nB} &minus; ${ab} = ${nA+nB-ab}, because the shared ones were counted twice.`;
 $("l2msg").innerHTML=rel+` The ${g.u.length} numbers in neither circle still belong to the universal box.`;
}
ra.onchange=rb.onchange=l2;l2();

function explain() {
 if(ra.value==='none'&&rb.value==='none'){say('All twenty cards are still together in the box.','No cards have been copied or removed. Sorting is a way to find particular cards, not a requirement for having a collection.','Would a rule help someone find the cards they want? Choose one or keep the box unsorted.');return}

 const a=[],b=[],both=[],neither=[];
 for(let x=1;x<=20;x++){const aa=rules[ra.value](x),bb=rules[rb.value](x);if(aa)a.push(x);if(bb)b.push(x);if(aa&&bb)both.push(x);if(!aa&&!bb)neither.push(x)}
 const equal=a.length===b.length&&both.length===a.length;
 const contained=both.length===Math.min(a.length,b.length);
 say(`Your rules pick ${a.length} members for A and ${b.length} for B. ${both.length} belong to both.`,
 equal ? 'Different wording can describe the same collection. Every member accepted by one rule is accepted by the other, so neither circle has any members of its own.' : both.length===0 ? 'The two rules share no members in this box. Separating the circles makes that visible. “No shared members” is itself useful information; the overlap is an empty collection.' : contained ? `Every member of ${a.length<b.length?'A':'B'} also passes the other rule. That is why its circle sits inside the other. Belonging to the smaller collection guarantees belonging to the larger one.` : `The shared members (${both.join(', ')}) pass both rules. They are still single objects, not copies. Adding the two collection sizes would count each of them twice, so the combined collection contains ${a.length+b.length-both.length} different members.`,
 `There are ${neither.length} cards outside both circles. Could one card satisfy both people, neither person, or just one? Change or clear a rule to investigate.`);
}

on(root,"input",explain);on(root,"change",explain);on(root,"click",explain);on(root,"keydown",event=>{if(event.key==="Enter"||event.key===" ")explain()});
explain();

  },
})
