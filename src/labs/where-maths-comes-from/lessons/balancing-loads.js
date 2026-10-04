import { defineLesson } from '../schema.js'
import { drawing } from '../modelTools.js'
export default defineLesson({
  id:'balancing-loads',title:'What keeps a balance level?',chapter:'Equality',order:35,
  prompt:'What could the balance tell you about a sealed parcel?',
  discovery:{start:'A sealed parcel weighs down one side of a balance.',notice:'The other side has no weights yet. The parcel stays sealed; you can use identical weights to investigate.',question:'Can you make the balance level without opening the parcel?',transfer:'Two equal shopping bags each get the same extra item. Would they still balance? What if the extra items differed?'},
  panels:{explore:`<div class="row"><button id="weight-add">Add a weight on the right</button><button id="weight-remove">Remove a weight on the right</button><button id="both-add">Add one to both sides</button><button id="balance-reset">Reset</button></div><p>Observe which side is lower. You may investigate before making any numerical claim.</p>`,scene:`<svg id="balance" viewBox="0 0 420 240" role="img" aria-label="A balance with a parcel and identical weights"></svg>`,connections:`<p id="balance-record"></p>`,explanation:`<p id="balance-language"></p>`},
  mount(ctx){const {$,on,say}=ctx,d=drawing(ctx,'balance');let left=0,right=0;
    function draw(){d.clear();const difference=3+left-right,tilt=Math.max(-30,Math.min(30,difference*10)),yl=115+tilt,yr=115-tilt;
      d.shape('polygon',{points:'210,125 180,215 240,215',fill:'var(--line)'});d.shape('line',{x1:70,y1:yl,x2:350,y2:yr,stroke:'var(--ink)','stroke-width':5});
      d.shape('rect',{x:35,y:yl-46,width:50,height:40,rx:4,fill:'var(--a)'});d.text(46,yl-20,'?');
      for(let i=0;i<left;i++)d.shape('rect',{x:90+(i%4)*18,y:yl-20-Math.floor(i/4)*20,width:15,height:15,fill:'var(--b)'});
      for(let i=0;i<right;i++)d.shape('rect',{x:290+(i%4)*18,y:yr-20-Math.floor(i/4)*20,width:15,height:15,fill:'var(--b)'});
      $('weight-remove').disabled=right===0;$('weight-add').disabled=right===8;$('both-add').disabled=left>=5||right>=8;
      $('balance-record').textContent=difference===0?`Level: parcel plus ${left} identical weights matches ${right} on the other side.`:`${difference>0?'Parcel side':'Right side'} is heavier.`;
      $('balance-language').textContent=difference===0?`Equality records the balance: parcel + ${left} = ${right} weight units. The parcel equals ${right-left} units. Adding the same weight to both sides preserves equality.`:'An inequality records unequal loads. A lower pan indicates the heavier side in this ideal equal-arm balance.';
      say(difference===0?'The two sides balance.':`${difference>0?'The parcel side':'The right side'} is lower.`,difference===0?'The loads match even though their contents look different. Identical additions to both sides keep that match.':'Adding a weight changes one load. Adding the same weight to both sides changes the total load but not the difference between them.', 'Can you find a level setting? Once level, compare adding to one side with adding to both.');
    }
    on($('weight-add'),'click',()=>{if(right<8){right++;draw()}});on($('weight-remove'),'click',()=>{if(right){right--;draw()}});on($('both-add'),'click',()=>{if(left<5&&right<8){left++;right++;draw()}});on($('balance-reset'),'click',()=>{left=right=0;draw()});draw();
  },
})
