import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l8",
  title: "Switches and doubling",
  chapter: "Choices",
  order: 90,
  prompt: "Can a small row of on/off switches keep track of many different settings?",
  discovery: {"start": "All the lights are off. You can switch any of them on.", "notice": "You can explore the settings before choosing to inspect their values. A reset returns to the empty setting.", "question": "Can a small row of on/off switches keep track of many different settings?", "transfer": "How many different settings could three independent room lights have? Would another light add one setting or create many?", "views": []},
  panels: {
    explore: `<p>Try switching lights on and off. You can keep a record of their values, or watch what happens when the counter advances.</p>
<div class="row"><button id="b1">Add 1</button><button class="alt" id="b0">Reset</button><button id="show-values">Inspect values</button></div>`,
    scene: `<div class="stage"><svg id="bs" viewBox="0 0 500 90" role="group" aria-label="Eight binary switches"></svg></div>`,
    connections: ``,
    explanation: `<div class="note name" id="bm"><b>5</b> = 4 + 1. Eight switches have 2 × 2 × 2 × 2 × 2 × 2 × 2 × 2 = 256 settings, from 0 to 255. Every extra switch doubles the possibilities, the same doubling you saw in Pascal's row totals.</div>`,
  },
  mount({ root, $, el, PC, Tn, say, on, requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval }) {
let bv=0,showValues=false;
function l8(){const s=$("bs");s.innerHTML="";const on=[];
 for(let i=0;i<8;i++){const bit=7-i,v=2**bit,isOn=(bv>>bit)&1,x=10+i*60;
  if(isOn)on.push(v);
  el("rect",{x,y:28,width:50,height:50,rx:10,fill:isOn?"var(--a)":"var(--card)",stroke:"var(--line)","stroke-width":2,"data-b":bit,tabindex:0,role:"button","aria-label":showValues?`Switch worth ${v}, ${isOn?"on":"off"}`:`Light ${i+1}, ${isOn?"on":"off"}`,style:"cursor:pointer"},s);
  const t=el("text",{x:x+25,y:53,"text-anchor":"middle","dominant-baseline":"central","font-size":22,"font-weight":800,fill:isOn?"#0d1b26":"var(--mute)","pointer-events":"none"},s);t.textContent=isOn?1:0;
  const w=el("text",{x:x+25,y:18,"text-anchor":"middle","font-size":13,fill:"var(--ink)"},s);w.textContent=showValues?v:''}
 $("bm").innerHTML=`<b>${bv}</b> = ${on.length?on.join(" + "):"0"}. Eight switches have 2 &times; 2 &times; 2 &times; 2 &times; 2 &times; 2 &times; 2 &times; 2 = 256 settings, from 0 to 255. Every extra switch doubles the possibilities, the same doubling you saw in Pascal's row totals.`}
const bt=e=>{const t=e.target.closest("[data-b]");if(t){bv^=1<<+t.dataset.b;l8()}};
$("bs").onclick=bt;$("bs").onkeydown=e=>{if(e.key=="Enter"||e.key==" "){e.preventDefault();bt(e)}};
$("show-values").onclick=()=>{showValues=!showValues;$("show-values").textContent=showValues?"Hide values":"Inspect values";l8()};
$("b1").onclick=()=>{bv=(bv+1)%256;l8()};$("b0").onclick=()=>{bv=0;l8()};l8();

let previous=bv;
function explain() {
 if(!showValues){say('The lights show the setting you chose.',bv===0?'Every light is off. This is still one possible setting.':'Each light can be switched independently. Turning one on does not require turning a neighbour off.','How many different settings could you make? Try some, reset, or inspect the values if you want a numerical record.');previous=bv;return}
 const bits=Array.from({length:8},(_,i)=>7-i).filter(i=>(bv>>i)&1).map(i=>2**i);
 say(`${bv===previous?'The lit switches':`You changed the switch total from ${previous} to ${bv}`} represent ${bits.length?bits.join(' + '):'nothing switched on'}.`,
 bv===0?'Every switch is off. This is one complete setting, representing zero. Eight switches can have 256 different settings, but the largest value is 255 because the zero setting is included.':`Each place is worth twice the place to its right. Two units in one place can be exchanged for one in the next. ${bv===previous+1&&((previous&1)===1)?'Adding one switched lower places off and carried their value to a higher place. The value did not disappear when those lights went out.':'Turning one switch on includes its whole place value; turning it off removes that same value.'} Each additional switch gives every old setting an off version and an on version.`,
 'Keep adding one through a run of lit switches. Watch a carry travel left. At 255 this eight-switch counter wraps back to zero.');
 previous=bv;
}

on(root,"input",explain);on(root,"change",explain);on(root,"click",explain);on(root,"keydown",event=>{if(event.key==="Enter"||event.key===" ")explain()});
explain();

  },
})
