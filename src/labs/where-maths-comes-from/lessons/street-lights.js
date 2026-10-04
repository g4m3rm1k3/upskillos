import { defineLesson } from '../schema.js'
import { drawing } from '../modelTools.js'
export default defineLesson({
  id:'street-lights',title:'A pattern down the street',chapter:'Repeating patterns',order:27,
  prompt:'Could you know how many lamps will be lit without checking every house?',
  discovery:{start:'A numbered street has no lighting pattern chosen.',notice:'You can choose how often a lamp lights up and extend the street. House numbering begins at one.',question:'If you light every few houses, what repeats as the street gets longer?',transfer:'A bus leaves every seven minutes, starting at minute seven. How many departures occur by minute thirty? What changes if a bus also leaves at minute zero?'},
  panels:{explore:`<label>Houses <input id="houses" type="range" min="5" max="120" value="30"><b id="house-count"></b></label><label>Lighting pattern <select id="lamp-step"><option value="0">No pattern chosen</option><option value="2">Every second house</option><option value="3">Every third house</option><option value="5">Every fifth house</option><option value="7">Every seventh house</option><option value="10">Every tenth house</option></select></label><p>Choose a pattern or leave the street unlit. Keep the spacing fixed and extend the street to investigate.</p>`,scene:`<svg id="street" viewBox="0 0 420 260" role="img" aria-label="Numbered houses with an optional lamp pattern"></svg>`,connections:`<details><summary>Inspect the complete stretches</summary><p id="lamp-record"></p></details>`,explanation:`<p id="lamp-language"></p>`},
  mount(ctx){const {$,on,say}=ctx,d=drawing(ctx,'street');
    function draw(){d.clear();const n=+$('houses').value,k=+$('lamp-step').value,shown=Math.min(n,60);$('house-count').textContent=n;d.shape('rect',{x:0,y:0,width:420,height:260,fill:'var(--paper)'});
      for(let i=1;i<=shown;i++){const x=18+((i-1)%10)*40,y=26+Math.floor((i-1)/10)*36,lit=k>0&&i%k===0;d.shape('rect',{x:x-11,y:y-12,width:24,height:24,rx:3,fill:lit?'var(--a)':'var(--card)',stroke:'var(--line)'});d.text(x+1,y+4,i,{'text-anchor':'middle','font-size':10,fill:lit?'var(--paper)':'var(--ink)'});}
      if(n>shown)d.text(12,250,`First ${shown} shown; the same pattern continues to house ${n}.`);
      const count=k?Math.floor(n/k):0,left=k?n%k:0;
      $('lamp-record').textContent=k?`${count} complete stretches of ${k} houses, with ${left} houses beyond the last lit lamp.`:'No lamp spacing selected.';
      $('lamp-language').textContent=k?`From 1 through ${n}, there are floor(${n}/${k}) = ${count} positive integers divisible by ${k}. Floor keeps only complete stretches. Extending forever produces infinitely many multiples; their natural density is 1/${k}. Zero is divisible by ${k}, but is not included in this street.`:'A divisibility rule selects multiples of a chosen positive integer. This street begins at one, so it does not include zero.';
      say(k?`${count} lamps are lit along ${n} houses, spaced every ${k} houses.`:'The street has no chosen lighting rule.',k?`${left?`After the last lit lamp there are ${left} houses, too few to reach the next lamp.`:'The street ends at a lit lamp.'} Each complete stretch contains one lit lamp. Extending the street by one full stretch adds one lamp.`:'The numbered houses form a collection before you choose a rule. A rule can help you predict distant lamps without inspecting every house.', k?'Would adding one house always light another lamp? Keep the spacing fixed and watch when the next lamp appears. Could the repeating pattern continue without an end?':'Choose a spacing if you want to investigate a repeating pattern. How could complete stretches help you count the lit lamps?');
    }
    on($('houses'),'input',draw);on($('lamp-step'),'change',draw);draw();
  },
})
