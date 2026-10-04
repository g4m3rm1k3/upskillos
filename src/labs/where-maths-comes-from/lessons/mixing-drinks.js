import { defineLesson } from '../schema.js'
import { drawing } from '../modelTools.js'
export default defineLesson({
  id:'mixing-drinks',title:'Another glass with the same taste',chapter:'Proportion',order:55,
  prompt:'Would a larger drink have to be stronger?',
  discovery:{start:'A drink has one scoop of juice concentrate and two scoops of water.',notice:'You can change either ingredient or make a larger batch. The shading is a visual proxy for concentration, not a measurement of taste.',question:'How could you make more drink while keeping its concentration the same?',transfer:'A paint colour uses two parts blue and one part white. How would you mix a larger batch that still matches?'},
  panels:{explore:`<div class="row"><button id="juice-add">Add concentrate</button><button id="water-add">Add water</button><button id="double-batch">Make twice as much</button><button id="drink-reset">Return to original recipe</button></div>`,scene:`<svg id="drink" viewBox="0 0 400 260" role="img" aria-label="Original recipe compared with a changing drink"></svg>`,connections:`<p id="drink-record"></p>`,explanation:`<p id="drink-language"></p>`},
  mount(ctx){const {$,on,say}=ctx,d=drawing(ctx,'drink');let juice=1,water=2;
    function draw(){d.clear();const share=juice/(juice+water),same=water===2*juice;
      [[40,1/3,3,'Original'],[220,share,juice+water,'Your batch']].forEach(([x,concentration,total,label])=>{const h=total*12;d.shape('path',{d:`M${x},30 V210 H${x+100} V30`,fill:'none',stroke:'var(--ink)','stroke-width':2});d.shape('rect',{x:x+2,y:210-h,width:96,height:h,fill:'var(--a)',opacity:.15+.85*concentration});d.text(x,238,label);});
      $('juice-add').disabled=juice+water>=12;$('water-add').disabled=juice+water>=12;$('double-batch').disabled=2*(juice+water)>12;
      $('drink-record').textContent=`${juice} scoops concentrate and ${water} scoops water. ${same?'Matches the original concentration.':share>1/3?'More concentrated than the original.':'Less concentrated than the original.'}`;
      $('drink-language').textContent=`The concentrate fraction is ${juice}/${juice+water}. The original ratio is 1 scoop concentrate to 2 scoops water. Scaling both ingredients by the same factor preserves that ratio; adding only one does not.`;
      say(same?'The batches have the same concentration.':share>1/3?'Your drink is more concentrated.':'Your drink is more diluted.',same?'The relative amounts match. A larger amount can keep the same concentration if both ingredients grow together.':'The ingredient balance changed. The drink’s total amount alone does not determine its concentration.', 'Would adding only water match the original? Compare that experiment with making twice as much of both ingredients.');
    }
    on($('juice-add'),'click',()=>{if(juice+water<12){juice++;draw()}});on($('water-add'),'click',()=>{if(juice+water<12){water++;draw()}});on($('double-batch'),'click',()=>{if(2*(juice+water)<=12){juice*=2;water*=2;draw()}});on($('drink-reset'),'click',()=>{juice=1;water=2;draw()});draw();
  },
})
