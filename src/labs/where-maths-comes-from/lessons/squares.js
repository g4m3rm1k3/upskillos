import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l11",
  title: "Growing squares",
  chapter: "Growth",
  order: 40,
  prompt: "If the floor gets a little wider and longer, how much extra tiling will it need?",
  discovery: {"start": "A square floor is covered with identical tiles. Its tiles are not grouped into coloured layers.", "notice": "You can change the floor size, highlight its borders, or split it into pieces. None of those views is required.", "question": "If the floor gets a little wider and longer, how much extra tiling will it need?", "transfer": "Would doubling both sides of a garden require twice as much turf? Sketch the old garden inside the new one.", "views": []},
  panels: {
    explore: `<p>A tiled floor needs to become wider and longer. You can change its size, inspect the border, or compare how its pieces fit.</p>
<div class="row"><button class="alt sel" data-a="plain">Plain tiles</button><button class="alt" data-a="layers">Highlight borders</button><button class="alt" data-a="split">Split the side</button></div>
<div class="row"><label>Side <input type="range" id="an" min="2" max="12" value="5"> <b id="anv">5</b></label><label id="asw" class="hide">Split at <input type="range" id="as" min="1" max="11" value="2"> <b id="asv">2</b></label></div>`,
    scene: `<div class="stage"><svg id="ar" viewBox="0 0 300 300" width="300" role="img" aria-label="Square made of unit squares"></svg></div>`,
    connections: ``,
    explanation: `<div class="note name" id="am"><b>1 + 3 + 5 + 7 + 9 = 25 = 5 × 5.</b> Each new layer wraps around the square and is the next odd number. Double the side to 10 and the area becomes 100: four times as big, not twice.</div>`,
  },
  mount({ root, $, el, PC, Tn, say, on, requestAnimationFrame, cancelAnimationFrame, setInterval, clearInterval }) {
let am="plain";
function l11(){const n=+$("an").value,sp=Math.min(+$("as").value,n-1);$("anv").textContent=n;$("asv").textContent=sp;
 $("asw").classList.toggle("hide",am!="split");
 const s=$("ar");s.innerHTML="";const z=Math.min(24,264/n);
 for(let i=0;i<n;i++)for(let j=0;j<n;j++){const f=am=="plain"?"var(--a)":am=="layers"?(Math.max(i,j)%2?"var(--b)":"var(--a)"):(i<sp&&j<sp?"var(--a)":i>=sp&&j>=sp?"var(--b)":"var(--c)");
  el("rect",{x:18+i*z,y:18+j*z,width:z-2,height:z-2,rx:3,fill:f},s)}
 $("am").innerHTML=am=="plain"?`A ${n}-by-${n} tiled floor has ${n*n} unit tiles. Its area is written ${n}². Highlighting a border or splitting the side offers other ways to account for these same tiles.`:am=="layers"?`<b>${Array.from({length:n},(_,k)=>2*k+1).join(" + ")} = ${n*n} = ${n} &times; ${n}.</b> Each new layer wraps around the square and is the next odd number. Double the side to ${2*n} and the area becomes ${4*n*n}: four times as big, not twice.`:`<b>(${sp} + ${n-sp})&sup2; = ${sp}&sup2; + 2 &times; ${sp}&times;${n-sp} + ${n-sp}&sup2; = ${sp*sp} + ${2*sp*(n-sp)} + ${(n-sp)**2} = ${n*n}.</b> The two squares are the squares of each part. The two connecting rectangles complete the area.`}
$("an").oninput=$("as").oninput=l11;
root.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{am=b.dataset.a;root.querySelectorAll("[data-a]").forEach(x=>x.classList.toggle("sel",x==b));l11()});
l11();

let previous=+$("an").value;
function explain() {
 const n=+$("an").value,a=Math.min(+$("as").value,n-1),b=n-a;
 if(am==='plain'){say(`The floor now has ${n} tiles along each edge.`, `The whole floor contains ${n*n} tiles. ${n>previous?`Growing it added ${n*n-previous*previous} tiles.`:n<previous?`Shrinking it removed ${previous*previous-n*n} tiles.`:'Changing a side affects both an edge and the space inside.'} You can inspect the change with plain tiles or choose another view.`, 'Would one extra row be enough when both edges grow? Change the size or highlight a border to see where extra tiles go.');previous=n;return}
 say(am==='layers'?`The square has a side of ${n}. Its outermost border contains ${2*n-1} tiles.`:`The side is split into lengths ${a} and ${b}. The picture now has four pieces.`,
 am==='layers' ? `One arm of the border has ${n} tiles and the other has ${n}, but they share the corner. Count that tile only once. ${n>previous?`Growing from side ${previous} to ${n} adds ${n*n-previous*previous} tiles.`:n<previous?`Shrinking from side ${previous} to ${n} removes ${previous*previous-n*n} tiles.`:'As the square grows one step at a time, both arms lengthen. Each new border is two tiles larger than the last.'} This is why odd-sized borders build squares.` : `The two squares contain ${a*a} and ${b*b} tiles. They do not fill the whole picture: the remaining two rectangles each contain ${a*b} tiles. They are the connections between the two side lengths. Nothing was added or removed by moving the split.`,
 am==='layers' ? 'Grow the side by one, then switch to “Split the side”. Can you recognise a square, two strips, and their corner?' : 'Move the split while holding the whole side fixed. The four pieces change size, but their combined area stays the same.');
 previous=n;
}

on(root,"input",explain);on(root,"change",explain);on(root,"click",explain);on(root,"keydown",event=>{if(event.key==="Enter"||event.key===" ")explain()});
explain();

  },
})
