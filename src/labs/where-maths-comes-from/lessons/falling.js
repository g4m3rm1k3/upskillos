import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l4",
  title: "A falling ball",
  chapter: "Motion",
  order: 100,
  prompt: "During equal stretches of time, does a falling ball cover equal stretches of distance?",
  discovery: {"start": "A ball waits at the top, with no drop recorded.", "notice": "You can drop it immediately. A prediction and a graph are optional ways to compare what happens.", "question": "During equal stretches of time, does a falling ball cover equal stretches of distance?", "transfer": "Would a steadily cruising bicycle leave the same spacing between clock marks as a bicycle gaining speed?", "views": [{"target": "fall-guess", "label": "Make an optional prediction"}, {"target": "fg", "label": "Compare the motion record"}]},
  panels: {
    explore: `<p>Drop the ball and watch where it is at each tick. You may make a prediction, inspect its record, or repeat the drop.</p>
<div class="row">
<div id="fall-guess"><select id="pg" aria-label="Your prediction"><option value="">Choose a guess</option><option value="4">4 units</option><option value="8">8 units</option><option value="16">16 units</option></select></div>
<button id="drop">Drop the ball</button><button id="fold" class="alt" disabled="">Fold into a square</button><span id="fall-result"></span>
</div>`,
    scene: `<div class="stage"><svg id="fall" viewBox="0 0 520 330" width="520" role="img" aria-label="Falling ball with marks"></svg></div>`,
    connections: `<div class="stage"><svg id="fg" viewBox="0 0 520 210" width="520" role="img" aria-label="Graphs of distance and speed against time"></svg></div>`,
    explanation: `<div class="note name hide" id="n4t"><b>Name it.</b> Total distances: 1, 4, 9, 16. These are the square numbers from the last lesson. The gaps between marks hold 1, 3, 5, 7 dots, and stacked up they make a pyramid on the right. Press Fold into a square: the same 16 dots become a 4 × 4 square. Odd numbers build squares. The graph on the left curves (a parabola) while the bars on the right climb in a straight line: speed grows steadily, and the distance is the total area of the bars. If the distances covered during successive ticks were 1, 2, 3, 4, the accumulated distances would be 1, 3, 6, 10, the triangular numbers from Pascal’s triangle; the distances per tick are 1, 3, 5, 7. For this steadily accelerating fall, the average speed during a tick equals the speed at its midpoint. Galileo found this pattern; in symbols, <i>d</i> = ½<i>g</i><i>t</i>².</div>`,
  },
  mount({ root, $, el, PC, Tn, say, on, requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval }) {
const U=18,f=$("fall");let raf,pyr=[];
function fbase(){f.innerHTML="";el("line",{x1:60,y1:10,x2:60,y2:10+16*U,stroke:"var(--line)","stroke-width":2},f);
 for(let k=0;k<=4;k++){el("line",{x1:52,y1:10+k*k*U,x2:70,y2:10+k*k*U,stroke:"var(--mute)"},f);
  const t=el("text",{x:44,y:14+k*k*U,"text-anchor":"end","font-size":12,fill:"var(--mute)"},f);t.textContent=""}}
function fg(m,done){const g=$("fg");g.innerHTML="";
 const L=(x1,y1,x2,y2)=>el("line",{x1,y1,x2,y2,stroke:"var(--mute)","stroke-width":1.5},g);
 const T=(x,y,t,a,sz)=>{const e=el("text",{x,y,"text-anchor":a||"middle","font-size":sz||11,fill:"var(--ink)"},g);e.textContent=t};
 L(40,180,230,180);L(40,20,40,180);L(300,180,510,180);L(300,20,300,180);
 T(135,205,"time (ticks)");T(40,12,"distance fallen","start");T(405,205,"tick");T(300,12,"distance during that tick","start");
 for(let k=0;k<=4;k++)T(40+k*47.5,194,k);
 if(done){const pts=[];for(let i=0;i<=40;i++){const t=i/10;pts.push(`${40+t*47.5},${180-t*t*9.375}`)}el("polyline",{points:pts.join(" "),fill:"none",stroke:"var(--c)","stroke-width":2.5},g)}
 for(let k=1;k<=m;k++){el("circle",{cx:40+k*47.5,cy:180-k*k*9.375,r:4.5,fill:"var(--b)",stroke:"var(--ink)"},g);T(40+k*47.5+6,180-k*k*9.375-8,k*k,"start");
  el("rect",{x:305+(k-1)*50,y:180-(2*k-1)*18.75,width:40,height:(2*k-1)*18.75,fill:"var(--a)",opacity:.85},g);T(325+(k-1)*50,174-(2*k-1)*18.75,2*k-1);T(325+(k-1)*50,194,k)}
 if(done)el("polyline",{points:[1,2,3,4].map(k=>`${325+(k-1)*50},${180-(2*k-1)*18.75}`).join(" "),fill:"none",stroke:"var(--c)","stroke-width":2.5,"stroke-dasharray":"5 4"},g)}
fg(0,false);fbase();const ball=el("circle",{cx:60,cy:10,r:8,fill:"var(--c)"},f);
$("drop").onclick=()=>{cancelAnimationFrame(raf);fbase();fg(0,false);pyr=[];$("fold").disabled=true;f.appendChild(ball);
 const g=$("pg").value;
 const t0=performance.now(),marked=[];
 const step=now=>{const t=Math.min((now-t0)/900,4),y=10+t*t*U;ball.setAttribute("cy",y);
  for(let k=1;k<=4;k++)if(t>=k&&!marked.includes(k)){marked.push(k);
   fg(k,k==4);const col=["var(--a)","var(--b)","var(--c)","var(--ink)"][k-1];for(let j=(k-1)*(k-1)+1;j<=k*k;j++)el("circle",{cx:60,cy:10+j*U,r:j==k*k?6:3.5,fill:col},f);for(let j=0;j<2*k-1;j++){const c=el("circle",{cx:0,cy:0,r:10,fill:col},f);c.style.transform=`translate(${410+(j-(k-1))*24}px,${53+(k-1)*34}px)`;const q=j<k?[j,k-1]:[k-1,2*k-2-j];pyr.push([c,363+q[0]*34,53+q[1]*34])}f.appendChild(ball);
   const tx=el("text",{x:80,y:14+k*k*U,"font-size":13,fill:"var(--ink)"},f);tx.textContent=`tick ${k}: ${k*k} units total (+${2*k-1})`}
  if(t<4)raf=requestAnimationFrame(step);else{
   $("fall-result").innerHTML=!g?'The drop is recorded. You can repeat it or compare the observations.':g==16?'<span class="ok">16: you spotted it.</span>':'<span class="no">It was 16, not '+g+'. Look at the totals.</span>';
   $("fold").disabled=false;$("n4t").classList.remove("hide");}};
 raf=requestAnimationFrame(step)};
$("fold").onclick=()=>pyr.forEach(([c,x,y])=>{c.style.transition="transform .9s ease";c.style.transform=`translate(${x}px,${y}px)`});

let clock=0,folded=false;
function explain() {
 say(clock?`After ${clock} tick${clock===1?'':'s'}, the ball has travelled ${clock*clock} units. The most recent tick contributed ${2*clock-1}.`: 'The ball starts at rest. The first clock interval will cover one distance unit.',
 folded?'The pieces moved, but none were added or removed. The four interval distances form a square of sixteen dots. The square pattern records the accumulated motion.':clock?`Each tick has the same duration, but the ball covers more distance each time. The first ${clock} interval${clock===1?'':'s'} contribute ${Array.from({length:clock},(_,i)=>2*i+1).join(', ')}. These are distances during intervals, not instantaneous speed readings. In this ideal fall, constant acceleration makes each new interval contribute two more distance units.`:'This is an ideal model with constant acceleration and no air resistance. The clock and distance units are chosen so that the first tick contributes one unit. A still ball begins gaining speed as it falls.',
 clock===4?'Fold the collected pieces into a square. Look for the same odd borders that grew the tiled square.':'Drop or repeat the experiment. If you want, predict first or compare the gaps between equal-time marks.');
}
const originalGraph=fg;fg=(m,done)=>{clock=m;folded=false;originalGraph(m,done);explain()};
const originalFold=$("fold").onclick;$("fold").onclick=()=>{originalFold();folded=true;explain()};

on(root,"input",explain);on(root,"change",explain);on(root,"click",explain);on(root,"keydown",event=>{if(event.key==="Enter"||event.key===" ")explain()});
explain();

  },
})
