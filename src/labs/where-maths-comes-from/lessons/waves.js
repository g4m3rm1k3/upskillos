import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l13",
  title: "A circle draws a wave",
  chapter: "Cycles",
  order: 120,
  prompt: "What changes about a mark’s height as a wheel turns, and what repeats?",
  discovery: {"start": "A mark sits on a wheel that you can turn.", "notice": "Its motion repeats. Recording the height is an optional experiment rather than the starting picture.", "question": "What changes about a mark’s height as a wheel turns, and what repeats?", "transfer": "Which parts of a Ferris wheel ride make your height change fastest? Where does it briefly change least?", "views": []},
  panels: {
    explore: `<p>Follow a mark on a turning wheel. Turn the wheel by hand or press Play. You can choose to record its height as a trail.</p>
<div class="row"><label>Angle <input type="range" id="ta" min="0" max="360" value="40"> <b id="tav">360°</b></label><button class="alt" id="tpl">Play</button><button id="trace-height">Trace the height</button></div>`,
    scene: `<div class="stage"><svg id="tg" viewBox="0 0 520 240" width="520" role="img" aria-label="A wheel mark and an optional height trail"></svg></div>`,
    connections: ``,
    explanation: `<p id="tr">Angle 360°. Height (sine) = <b style="color:var(--a)">-0.00</b>. Across (cosine) = <b style="color:var(--b)">1.00</b>. Squares: 0.00 + 1.00 = 1.00.</p>
<div class="note name"><b>Name it.</b> On a circle of radius 1, the height is <i>sin</i> and the horizontal coordinate is <i>cos</i>. Those two and the radius make a right triangle, so sin² + cos² = 1: squares again. Simple models of tides, sound and pendulums use these waves; real signals can combine waves or depart from this ideal shape.</div>`,
  },
  mount({ root, $, el, PC, Tn, say, on, requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval }) {
let tp=0,trace=false;
function l13(){const a=+$("ta").value,rd=a*Math.PI/180,c=Math.cos(rd),sn=Math.sin(rd),x=110+80*c,y=120-80*sn,wx=250+a/360*250;$("tav").textContent=a+"\u00B0";
 const s=$("tg");s.innerHTML="";s.setAttribute("viewBox",trace?"0 0 520 240":"0 0 220 240");
 const ln=(x1,y1,x2,y2,col,w,d)=>el("line",{x1,y1,x2,y2,stroke:col,"stroke-width":w,"stroke-dasharray":d||"none"},s);
 el("circle",{cx:110,cy:120,r:80,fill:"none",stroke:"var(--line)","stroke-width":2},s);
 ln(20,120,200,120,"var(--mute)",1);ln(110,30,110,210,"var(--mute)",1);ln(250,120,505,120,"var(--mute)",1);
 const all=[],part=[];for(let d=0;d<=360;d+=4){const q=`${250+d/360*250},${120-80*Math.sin(d*Math.PI/180)}`;all.push(q);if(d<=a)part.push(q)}
 el("polyline",{points:all.join(" "),fill:"none",stroke:"var(--line)","stroke-width":2},s);
 if(part.length>1)el("polyline",{points:part.join(" "),fill:"none",stroke:"var(--c)","stroke-width":3},s);
 ln(110,120,x,y,"var(--ink)",2);ln(x,120,x,y,"var(--a)",3.5);ln(110,120,x,120,"var(--b)",3.5);ln(x,y,wx,y,"var(--mute)",1.5,"4 4");
 el("circle",{cx:x,cy:y,r:6,fill:"var(--ink)"},s);el("circle",{cx:wx,cy:y,r:6,fill:"var(--a)"},s);
 $("tr").innerHTML=`Angle ${a}&deg;. Height (sine) = <b style="color:var(--a)">${sn.toFixed(2)}</b>. Across (cosine) = <b style="color:var(--b)">${c.toFixed(2)}</b>. Squares: ${(sn*sn).toFixed(2)} + ${(c*c).toFixed(2)} = ${(sn*sn+c*c).toFixed(2)}.`}
$("trace-height").onclick=()=>{trace=!trace;$("trace-height").textContent=trace?"Hide the trail":"Trace the height";l13()};
$("ta").oninput=l13;
$("tpl").onclick=()=>{if(tp){clearInterval(tp);tp=0;$("tpl").textContent="Play"}else{$("tpl").textContent="Pause";tp=setInterval(()=>{$("ta").value=(+$("ta").value+3)%361;l13()},40)}};
l13();



function explain() {
 if(!trace){const a=+$('ta').value;const height=Math.sin(a*Math.PI/180);say(`The wheel mark is ${Math.abs(height)<.001?'level with the centre':height>0?'above the centre':'below the centre'}.`,'Turning changes its height and its distance across the wheel, but the mark stays the same distance from the centre.','Where does the height change fastest? Explore the wheel, or trace its height if a record would help you compare a full turn.');return}

 const angle=+$("ta").value,rad=angle*Math.PI/180,height=Math.sin(rad),across=Math.cos(rad);
 const close=x=>Math.abs(x)<1e-8;
 say(close(height)?`At ${angle}°, the point is level with the centre. The wave crosses its middle line.`:Math.abs(height)>0.999?`At ${angle}°, the point is at the ${height>0?'top':'bottom'} of the circle. The wave reaches a turning point.`:`At ${angle}°, the point is ${height>0?'above':'below'} the centre. Its height is ${Math.abs(height).toFixed(2)} circle radii.`,
 'The dashed link transfers the rotating point’s height into the wave. The circle repeats a position after one full turn, so the wave repeats too. Height and horizontal position are signed coordinates: left and below are negative. Their squared lengths add to the fixed radius squared.',
 angle<90?'Move toward a quarter turn. Notice the height rises even while the across distance shrinks.':angle<180?'Move toward half a turn. The height returns to the middle, but the point is now on the left.':angle<270?'Move toward three quarters of a turn. The point is below the centre, so the wave is below its middle line.':'Complete the turn. The wave returns to its starting height. This circular model gives a sinusoidal cycle; real motions may only approximate it.');
}
const originalWave=l13;l13=(...args)=>{originalWave(...args);explain()};

on(root,"input",explain);on(root,"change",explain);on(root,"click",explain);on(root,"keydown",event=>{if(event.key==="Enter"||event.key===" ")explain()});
explain();
return { pause(){tp=0;$("tpl").textContent="Play"} };

  },
})
