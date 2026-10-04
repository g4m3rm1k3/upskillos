import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l14",
  title: "Looking closely at motion",
  chapter: "Change",
  order: 130,
  prompt: "Can two photos tell you how fast something is moving right now?",
  discovery: {"start": "Two observations show a travelling object at nearby moments.", "notice": "You choose their spacing. A graph is an optional record of the same movement.", "question": "Can two photos tell you how fast something is moving right now?", "transfer": "Would measuring a car’s entire journey tell you its speed while passing your house?", "views": [{"target": "cg", "label": "Compare the graph"}]},
  panels: {
    explore: `<p>How fast is the falling ball going right now? Compare two observations. You choose how far apart they are; a graph is available if it helps you interpret them.</p>
<div class="row"><label>Moment <input type="range" id="ct" min="0.5" max="3" step="0.1" value="1.5"> <b id="ctv">2.9</b></label><label>Gap between points <input type="range" id="ch" min="0" max="4" value="0"> <b id="chv">0.01</b></label></div>`,
    scene: `<div class="stage"><svg id="motion-photo" viewBox="0 0 400 110" width="400" role="img" aria-label="Two observations of a moving object"></svg></div><div class="stage"><svg id="cg" viewBox="0 0 560 230" width="560" role="img" aria-label="Distance curve with a line through two points, and the speed graph with shaded area"></svg></div>`,
    connections: ``,
    explanation: `<p id="cr">Slope of the comparison line between <i>t</i> = 2.9 and <i>t</i> = 2.91: <b>5.81</b>. Squeeze the gap and it settles on 2<i>t</i> = <b>5.8</b>, the speed at that moment. The shaded triangle has area ½ × 2.9 × 5.8 = <b>8.41</b>, the distance fallen.</p>
<div class="note name"><b>Name it.</b> The slope of the line between two points squeezed together is the <i>derivative</i>: for <i>t</i>² it is 2<i>t</i>. Going the other way, the area under the speed line up to <i>t</i> is a triangle, ½ × <i>t</i> × 2<i>t</i> = <i>t</i>², the distance fallen. Slope turns distance into speed. Area turns speed back into distance. That pair is calculus.</div>`,
  },
  mount({ root, $, el, PC, Tn, say, on, requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval }) {
function l14(){const t=+$("ct").value,h=[1,.5,.25,.1,.01][+$("ch").value];$("ctv").textContent=t.toFixed(1);$("chv").textContent=h;
 const photo=$('motion-photo');photo.innerHTML='';
 el('line',{x1:15,y1:60,x2:385,y2:60,stroke:'var(--line)'},photo);
 el('circle',{cx:20+t*t*22,cy:60,r:10,fill:'var(--a)'},photo);
 el('circle',{cx:20+(t+h)*(t+h)*22,cy:60,r:10,fill:'var(--b)'},photo);
 const caption=el('text',{x:20,y:25,fill:'var(--ink)','font-size':12},photo);caption.textContent=`First observation; second observation ${h} time units later`;
 const s=$("cg");s.innerHTML="";const X=u=>30+u*55,Y=d=>200-d*11,X2=u=>320+u*55,Y2=v=>200-v*22;
 const ln=(x1,y1,x2,y2,c,w,d)=>el("line",{x1,y1,x2,y2,stroke:c,"stroke-width":w,"stroke-dasharray":d||"none"},s);
 const tx=(x,y,v)=>{const e=el("text",{x,y,"font-size":12,fill:"var(--ink)"},s);e.textContent=v};
 ln(30,200,250,200,"var(--mute)",1.5);ln(30,200,30,20,"var(--mute)",1.5);ln(320,200,540,200,"var(--mute)",1.5);ln(320,200,320,20,"var(--mute)",1.5);
 tx(30,14,"distance travelled");tx(320,14,"speed at each moment");tx(225,218,"time");tx(515,218,"time");
 const pts=[];for(let i=0;i<=40;i++){const u=i/10;pts.push(`${X(u)},${Y(u*u)}`)}
 el("polyline",{points:pts.join(" "),fill:"none",stroke:"var(--c)","stroke-width":2.5},s);
 const m=2*t+h,y0=t*t,a=Math.max(0,t-.8),b=Math.min(4,t+h+.8);
 ln(X(t),Y(y0),X(t),200,"var(--line)",1,"3 3");
 ln(X(a),Y(y0+m*(a-t)),X(b),Y(y0+m*(b-t)),"var(--b)",2.5);
 el("circle",{cx:X(t),cy:Y(y0),r:5,fill:"var(--ink)"},s);el("circle",{cx:X(t+h),cy:Y((t+h)**2),r:5,fill:"var(--b)",stroke:"var(--ink)"},s);
 ln(X2(0),Y2(0),X2(4),Y2(8),"var(--c)",2.5);
 el("polygon",{points:`${X2(0)},${Y2(0)} ${X2(t)},${Y2(0)} ${X2(t)},${Y2(2*t)}`,fill:"var(--a)","fill-opacity":.35,stroke:"var(--a)","stroke-width":1.5},s);
 el("circle",{cx:X2(t),cy:Y2(2*t),r:5,fill:"var(--ink)"},s);
 $("cr").innerHTML=`Slope of the comparison line between <i>t</i> = ${t.toFixed(1)} and <i>t</i> = ${(t+h).toFixed(2)}: <b>${m.toFixed(2)}</b>. Squeeze the gap and it settles on 2<i>t</i> = <b>${(2*t).toFixed(1)}</b>, the speed at that moment. The shaded triangle has area &frac12; &times; ${t.toFixed(1)} &times; ${(2*t).toFixed(1)} = <b>${(t*t).toFixed(2)}</b>, the distance fallen.`}
$("ct").oninput=$("ch").oninput=l14;l14();


function explain() {
 const t=+$("ct").value,h=[1,.5,.25,.1,.01][+$("ch").value],distance=(t+h)**2-t*t,average=distance/h,instant=2*t;
 say(`You are observing the fall at time ${t.toFixed(1)}, then again ${h} time units later. Between those observations it travels ${distance.toFixed(4)} distance units.`,
 `These two observations give an average speed over that gap: ${average.toFixed(2)}. The gap ${h<=.1?'is now small, so the line nearly matches the curve’s direction here':'still spans a noticeable part of the curve, while the ball is speeding up'}. In this model its average exceeds the speed at the starting instant (${instant.toFixed(1)}) by exactly ${h}. Squeezing the gap makes that excess approach zero; a small finite gap is an approximation, not the limit itself.`,
 $('cg').hidden ? 'Would a closer second observation better describe this moment? Change the gap, or choose a graph if that record helps.' : `The speed picture accumulates the whole journey up to ${t.toFixed(1)}. Its triangular area is ${t*t}: the distance travelled. Change the moment to change the speed; shrink the gap to sharpen your observation at that same moment.`);
}

on(root,"input",explain);on(root,"change",explain);on(root,"click",explain);on(root,"keydown",event=>{if(event.key==="Enter"||event.key===" ")explain()});
explain();

  },
})
