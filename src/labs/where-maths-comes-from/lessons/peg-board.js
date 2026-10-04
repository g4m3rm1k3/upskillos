import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l7",
  title: "The peg board",
  chapter: "Chance",
  order: 80,
  prompt: "Where might a ball land, and does watching more balls change your expectation?",
  discovery: {"start": "An empty peg board is ready for a ball.", "notice": "A single landing and a pattern across many landings are different observations. Drop as few or as many as you like.", "question": "Where might a ball land, and does watching more balls change your expectation?", "transfer": "A path forks repeatedly. Is having several ways to reach a destination the same as favouring one particular path?", "views": []},
  panels: {
    explore: `<p>Each ball hits a peg and bounces left or right, a coin flip every time. Drop some and watch where they land. If you want to investigate why some slots get more balls, you can inspect the routes.</p>
<div class="row"><button id="g1">Drop 1 ball</button><button id="g50">Drop 50 balls</button><button class="alt" id="gt">Show the routes</button><button class="alt" id="gc">Clear</button></div>`,
    scene: `<div class="stage"><svg id="peg-board" viewBox="0 0 400 392" width="400" role="img" aria-label="Balls falling through pegs into slots"><g id="gs"></g><g id="gbl"></g></svg></div>`,
    connections: ``,
    explanation: `<p id="gm">Drop some balls.</p>
<div class="note name"><b>Why Pascal?</b> The number on a peg counts the different routes that reach it. A peg is reached from the peg up-left or the peg up-right, so its count is the sum of those two: the same rule as the triangle. After 8 rows there are 2×2×2×2×2×2×2×2 = 256 equally likely routes (the row total!). Slot <i>k</i> gets C(8, <i>k</i>) of them, so the middle slot gets 70 of 256 and each end slot gets 1. The bell shape is just Pascal's row, drawn as a bar chart.</div>`,
  },
  mount({ root, $, el, PC, Tn, say, on, requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval }) {
let cnt=Array(9).fill(0),balls=[],gshow=false,graf=0;
const gx=(r,c)=>200+(c-r/2)*40,gy=r=>30+r*30,bl=$("gbl");
function gdraw(){
 const s=$("gs");s.innerHTML="";const tot=cnt.reduce((a,b)=>a+b,0),ex=cnt.map((_,k)=>tot*PC(8,k)/256),mx=Math.max(10,...cnt,...ex);
 for(let r=0;r<8;r++)for(let c=0;c<=r;c++){const x=gx(r,c),y=gy(r);
  if(gshow){el("circle",{cx:x,cy:y,r:12,fill:"var(--card)",stroke:"var(--c)","stroke-width":1.5},s);const t=el("text",{x,y,"text-anchor":"middle","dominant-baseline":"central","font-size":10,"font-weight":700,fill:"var(--ink)"},s);t.textContent=PC(r,c)}
  else el("circle",{cx:x,cy:y,r:4.5,fill:"var(--mute)"},s)}
 for(let k=0;k<9;k++){const x=gx(8,k),h=cnt[k]/mx*90;
  el("rect",{x:x-15,y:350-h,width:30,height:h,fill:"var(--a)",opacity:.85},s);
  if(gshow){const ey=350-ex[k]/mx*90;el("line",{x1:x-18,x2:x+18,y1:ey,y2:ey,stroke:"var(--c)","stroke-width":3},s)}
  const t=el("text",{x,y:366,"text-anchor":"middle","font-size":12,fill:"var(--ink)"},s);t.textContent=cnt[k];
  if(gshow){const u=el("text",{x,y:382,"text-anchor":"middle","font-size":10,fill:"var(--c)"},s);u.textContent=PC(8,k)+"/256"}}
 $("gm").innerHTML=tot?`${tot} ball${tot>1?"s":""} dropped. Middle slot: <b>${Math.round(cnt[4]/tot*100)}%</b> so far. Pascal predicts 70/256 = 27%.`+(gshow?" The purple marks show how tall each bar should be.":""):"Drop some balls.";
}
function gdrop(n){const now=performance.now();
 for(let i=0;i<n;i++){const pts=[[200,6]];let c=0;
  for(let r=0;r<8;r++){pts.push([gx(r,c),gy(r)-13]);c+=Math.random()<.5?0:1}
  pts.push([gx(8,c),255]);
  const e=el("circle",{r:7,fill:"var(--b)",stroke:"var(--ink)","stroke-width":1.5,cx:-20,cy:-20},bl);balls.push({pts,k:c,t0:now+i*60,e})}
 cancelAnimationFrame(graf);graf=requestAnimationFrame(gstep)}
function gstep(){const now=performance.now();let land=false;
 balls=balls.filter(b=>{const u=(now-b.t0)/130;if(u<0)return true;const i=Math.floor(u);
  if(i>=b.pts.length-1){cnt[b.k]++;b.e.remove();land=true;return false}
  const f=u-i,a=b.pts[i],q=b.pts[i+1];b.e.setAttribute("cx",a[0]+(q[0]-a[0])*f);b.e.setAttribute("cy",a[1]+(q[1]-a[1])*f);return true});
 if(land)gdraw();
 if(balls.length)graf=requestAnimationFrame(gstep)}
$("g1").onclick=()=>gdrop(1);$("g50").onclick=()=>gdrop(50);
$("gc").onclick=()=>{balls.forEach(b=>b.e.remove());balls=[];cnt.fill(0);gdraw()};
$("gt").onclick=()=>{gshow=!gshow;$("gt").classList.toggle("sel",gshow);gdraw()};
gdraw();

function explain() {
 const total=cnt.reduce((a,b)=>a+b,0),pending=balls.length;
 say(total?`${total} balls have landed${pending?`; ${pending} are still travelling`:''}. ${cnt[4]} reached the middle slot.`:pending?`${pending} ball${pending===1?' is':'s are'} travelling through the board.`:'The board is waiting for its first ball.',
 gshow?`Each ball makes eight independent left-or-right choices in this ideal model. One route reaches an outer slot, while 70 reach the middle. The two parent counts at each peg account for its route count. Reference marks show expected heights for the number that have landed, not guaranteed heights for each batch.`:total?`Repeated landings build a record. A small batch can look uneven, and repeating it can give a different set of counts. Are some destinations appearing more often?`:'A ball can bounce either way at each peg. You can observe a landing before choosing to inspect all possible routes.',
 'Would repeating the batch change your expectation? You can compare more landings or inspect the routes. Real peg boards can depart from this ideal model.');
}
const originalDraw=gdraw;gdraw=(...args)=>{originalDraw(...args);explain()};
const originalDrop=gdrop;gdrop=(...args)=>{originalDrop(...args);explain()};

on(root,"input",explain);on(root,"change",explain);on(root,"click",explain);on(root,"keydown",event=>{if(event.key==="Enter"||event.key===" ")explain()});
explain();
return { pause(){balls.forEach(b=>b.e.remove());balls=[];explain()} };

  },
})
