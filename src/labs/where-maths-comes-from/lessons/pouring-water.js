import { defineLesson } from '../schema.js'
import { drawing } from '../modelTools.js'
export default defineLesson({
  id:'pouring-water',title:'Same water, different height',chapter:'Space and amount',order:45,
  prompt:'Does a higher waterline always mean more water?',
  discovery:{start:'Water sits in a narrow container; a wider container is empty.',notice:'Both containers have the same depth. You can pour between them or change the width of the second container.',question:'When the same water moves into a wider container, what should happen to its height?',transfer:'Would two containers filled to the same height necessarily contain the same amount? What would you need to know?'},
  panels:{explore:`<div class="row"><button id="pour-wide">Pour a cup into the second container</button><button id="pour-back">Pour a cup back</button><button id="water-reset">Return all water</button></div><label>Second container width <input id="tank-width" type="range" min="80" max="180" value="160"></label><p>The containers are schematic, open, and equally deep. No water spills in this model.</p>`,scene:`<svg id="water" viewBox="0 0 440 250" role="img" aria-label="Two containers with conserved water"></svg>`,connections:`<details><summary>Inspect the amount record</summary><p id="water-record"></p></details>`,explanation:`<p id="water-language"></p>`},
  mount(ctx){const {$,on,say}=ctx,d=drawing(ctx,'water');let a=600,b=0;
    function draw(){d.clear();const width=+$('tank-width').value,ha=a/4,hb=b/(width/20);
      [[25,80,ha,'First'],[215,width,hb,'Second']].forEach(([x,w,h,label])=>{d.shape('path',{d:`M${x},30 V210 H${x+w} V30`,fill:'none',stroke:'var(--ink)','stroke-width':2});if(h)d.shape('rect',{x:x+2,y:210-h,width:w-4,height:h,fill:'var(--b)',opacity:.65});d.text(x,238,label);});
      $('pour-wide').disabled=a===0;$('pour-back').disabled=b===0;
      $('water-record').textContent=`First: ${a} mL · second: ${b} mL · total: ${a+b} mL`;
      $('water-language').textContent='For a straight-sided container, volume is base area × water height. With equal depth, increasing width increases base area, so the same volume needs less height. Shape alone cannot tell you the amount.';
      say(`The first container holds ${a} mL; the second holds ${b} mL.`,b===0?'Nothing has been poured into the second container yet. Its width alone does not create water.':`The total remains ${a+b} mL. The second waterline is ${Math.round(hb)} diagram units high. Widening its base spreads that water over more space, lowering the line without removing water.`, 'Could a lower waterline still represent the same amount? Pour, return water, or resize the second container while holding its amount fixed.');
    }
    on($('pour-wide'),'click',()=>{const cup=Math.min(100,a);a-=cup;b+=cup;draw()});on($('pour-back'),'click',()=>{const cup=Math.min(100,b);b-=cup;a+=cup;draw()});on($('water-reset'),'click',()=>{a=600;b=0;draw()});on($('tank-width'),'input',draw);draw();
  },
})
