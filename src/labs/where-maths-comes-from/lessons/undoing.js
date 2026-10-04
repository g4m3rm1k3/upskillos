import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l12",
  title: "Undoing a pattern",
  chapter: "Reversing",
  order: 110,
  prompt: "How could you find the length of one arm without counting every dot?",
  discovery: {"start": "Two equal arms meet at a shared corner.", "notice": "There is one corner dot, even though both arms use it. You can inspect separating or copying the corner, then reset.", "question": "How could you find the length of one arm without counting every dot?", "transfer": "Two equal fence runs share a corner post. What must you account for when working out posts in each run?", "views": []},
  panels: {
    explore: `<p>Two equally long arms meet at a shared corner. How could you recover the length of one arm from the joined strip? Inspect the corner, try separating the arms, or reset and explore another strip.</p>
<div class="row"><label>Dots in the layer <input type="range" id="at" min="3" max="41" step="2" value="21"> <b id="atv">23</b></label></div>
<div class="row"><button id="au1">Restore the corner</button><button id="au2">Separate the arms</button><button class="alt" id="au0">Reset</button></div>`,
    scene: `<div class="stage"><svg id="al" viewBox="0 0 340 320" width="340" role="img" aria-label="Dots showing the layer and its arms"></svg></div>`,
    connections: ``,
    explanation: `<p id="aeq" style="font-size:1.4rem;font-weight:800;margin:6px 0"><i>n</i> = 12</p>
<div class="note name" id="am2"><b>Separate the arms.</b> Split into two equal arms. One arm is <i>n</i> = 12. Check: 2 × 12 − 1 = 23. That is algebra: a letter for the unknown, and each step a move you can see, done to both sides.</div>`,
  },
  mount({ root, $, el, PC, Tn, say, on, requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval }) {
let ast=0,shared=false;
function l12(){const t=+$("at").value,n=(t+1)/2;$("atv").textContent=t;const s=$("al");s.innerHTML="";const z=14;
 const dot=(i,j,f,o)=>el("circle",{cx:10+i*z,cy:10+j*z,r:5,fill:f,opacity:o==null?1:o},s);
 if(ast==0){for(let i=0;i<n;i++)dot(i,n-1,"var(--b)");for(let j=0;j<n-1;j++)dot(n-1,j,"var(--b)")}
 else{for(let i=0;i<n;i++)dot(i,0,"var(--a)");for(let j=0;j<n;j++)dot(n+2,j,"var(--a)",ast==2?.2:1)}
 $("aeq").innerHTML=ast==0?`2<i>n</i> &minus; 1 = ${t}`:ast==1?`2<i>n</i> = ${t+1}`:`<i>n</i> = ${n}`;
 $("am2").innerHTML=ast==0?`<b>Start.</b> The layer has ${t} dots: two arms of <i>n</i> that share one corner dot, written 2<i>n</i> &minus; 1.`:ast==1?`<b>Undo the &minus;1.</b> Put the shared corner back: ${t} + 1 = ${t+1} on both sides. Now there are two full arms, 2<i>n</i> = ${t+1}.`:`<b>Undo the &times;2.</b> Split into two equal arms. One arm is <i>n</i> = ${n}. Check: 2 &times; ${n} &minus; 1 = ${t}. That is algebra: a letter for the unknown, and each step a move you can see, done to both sides.`}
$("au1").onclick=()=>{if(ast==0)ast=1;l12()};$("au2").onclick=()=>{if(ast==1)ast=2;else shared=true;l12()};$("au0").onclick=()=>{ast=0;shared=false;l12()};$("at").oninput=()=>{ast=0;shared=false;l12()};l12();

function explain() {
 const count=+$("at").value,length=(count+1)/2;
 if(shared&&ast===0){say('The arms still share a single corner dot.','Separating them without copying the corner leaves one arm a dot short. The corner belongs to both arms, but the strip contains it once.','Would copying the corner let both arms stay equally long? Try it or reset to inspect the original strip.');return}
 say(ast===0?`The bent strip contains ${count} dots. Both arms have the same length, but their corner is shared.`:ast===1?`You restored a second copy of the shared corner. There are now ${count+1} dots in two complete arms.`:`You isolated one of the two equal arms. It contains ${length} dots.`,
 ast===0?'If you count both arms separately, you would count the corner twice. The joined strip has one less dot than those two complete arms. To recover an arm length, first restore that missing copy.':ast===1?'Adding a corner copy changes the picture and its recorded total together. Now nothing is shared, so the total can be split evenly between two arms.':`Rejoin two arms of ${length} dots and merge their corner copies into one. You recover the original ${count}-dot strip. Reversing the construction is why these steps work.`,
 ast===0?'What happens if you try to separate the arms? Could a copy of the shared corner help?' :ast===1?'Split the two equal arms.': 'Change the strip size, then undo its construction again. The same moves work for every odd-sized strip.');
 $("au1").disabled=ast!==0;$("au2").disabled=ast===2;
}

on(root,"input",explain);on(root,"change",explain);on(root,"click",explain);on(root,"keydown",event=>{if(event.key==="Enter"||event.key===" ")explain()});
explain();

  },
})
