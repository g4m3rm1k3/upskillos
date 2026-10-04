import { defineLesson } from '../schema.js'
import { drawing } from '../modelTools.js'
export default defineLesson({
  id:'almost-full-tray',title:'Almost a full tray',chapter:'Mental shortcuts',order:42,
  prompt:'Would counting what is missing be easier than counting what is there?',
  discovery:{start:'A tray holds rows of biscuits beside the outline of a full ten-by-ten tray.',notice:'You can change the occupied width and height. The full outline is only a comparison; inspecting missing strips is optional.',question:'Could a familiar full tray help you count a nearly full one?',transfer:'For a 97-by-98 tray, what changes if you compare it with a 100-by-100 tray? Which corner would be subtracted twice?'},
  panels:{explore:`<label>Biscuits across <input id="tray-width" type="range" min="7" max="10" value="9"></label><label>Biscuits down <input id="tray-height" type="range" min="7" max="10" value="8"></label><button id="inspect-missing">Inspect the missing strips</button><p>Use the full outline if it helps, or count the occupied rows directly.</p>`,scene:`<svg id="biscuit-tray" viewBox="0 0 340 330" role="img" aria-label="A partly filled ten-by-ten tray"></svg>`,connections:`<details><summary>Compare counting strategies</summary><p id="tray-record"></p></details>`,explanation:`<p id="tray-language"></p>`},
  mount(ctx){const {$,on,say}=ctx,d=drawing(ctx,'biscuit-tray');let inspect=false;
    function draw(){d.clear();const w=+$('tray-width').value,h=+$('tray-height').value,a=10-w,b=10-h;
      d.shape('rect',{x:20,y:20,width:280,height:280,fill:'none',stroke:'var(--line)','stroke-width':2});
      for(let row=0;row<10;row++)for(let col=0;col<10;col++){const occupied=col<w&&row<h,overlap=col>=w&&row>=h;d.shape('rect',{x:22+col*28,y:22+row*28,width:24,height:24,rx:3,fill:occupied?'var(--a)':inspect?overlap?'var(--ink)':col>=w?'var(--b)':'var(--c)':'none',stroke:occupied?'none':'var(--line)',opacity:occupied?1:inspect?.7:.3});}
      $('tray-record').textContent=`${h} rows of ${w}: ${w*h} biscuits. Full tray: 100. Missing strips: ${10*a} and ${10*b}, with a shared corner of ${a*b}.`;
      $('tray-language').textContent=`(${10}-${a}) × (${10}-${b}) = 100 - ${10*a} - ${10*b} + ${a*b} = ${w*h}. Add the corner back because the two full missing strips both included it. This works because multiplication distributes over addition and subtraction.`;
      say(inspect?`The missing strips share a corner of ${a*b} spaces.`:`The tray has ${h} occupied rows, each ${w} biscuits long.`, inspect?a*b?'Taking away both full strips counts their shared corner twice. Adding that corner back corrects the count.':'One missing strip has zero width, so there is no shared corner to correct.':'The full outline offers a familiar reference. You can count what is present or investigate what is missing; the biscuits do not change between those descriptions.', 'Which counting method feels easier here? Try changing the tray size and decide whether the full reference still helps.');
    }
    on($('tray-width'),'input',draw);on($('tray-height'),'input',draw);on($('inspect-missing'),'click',()=>{inspect=!inspect;$('inspect-missing').textContent=inspect?'Hide the strips':'Inspect the missing strips';draw()});draw();
  },
})
