import { defineLesson } from '../schema.js'
import { drawing } from '../modelTools.js'
export default defineLesson({
  id:'sharing-loaf',title:'One loaf, different shares',chapter:'Parts and wholes',order:15,
  prompt:'Does cutting a loaf create more food?',
  discovery:{start:'One whole loaf is waiting on the board, with no cuts.',notice:'You can keep it whole, make equal pieces, or move a cut. The original loaf remains the reference.',question:'How could several people share one loaf, and how would you check their shares?',transfer:'A half of a small loaf and a half of a large loaf have the same name. Would they give you the same amount of food?'},
  panels:{explore:`<div class="row"><button id="cut-two">Cut into two</button><button id="cut-three">Cut into three</button><button id="cut-four">Cut into four</button><button id="whole-loaf">Keep it whole</button></div><label id="cut-position" hidden>Move the middle cut <input id="middle-cut" type="range" min="10" max="90" value="50"></label><p>Moving the cut is optional. See whether the two shares still match.</p>`,scene:`<svg id="loaf" viewBox="0 0 420 160" role="img" aria-label="A whole loaf and optional cuts"></svg>`,connections:`<p id="loaf-record"></p>`,explanation:`<p id="loaf-language"></p>`},
  mount(ctx){const {$,on,say}=ctx,d=drawing(ctx,'loaf');let parts=1;
    function draw(){d.clear();const mid=+$('middle-cut').value/100,bounds=parts===2?[0,mid,1]:Array.from({length:parts+1},(_,i)=>i/parts);
      for(let i=0;i<parts;i++)d.shape('rect',{x:20+380*bounds[i],y:35,width:380*(bounds[i+1]-bounds[i])-2,height:70,rx:4,fill:i%2?'var(--b)':'var(--a)'});
      $('cut-position').hidden=parts!==2;const equal=parts!==2||mid===.5;
      $('loaf-record').textContent=parts===1?'One uncut loaf.':equal?`${parts} equal pieces of the same whole loaf.`:`Two pieces: ${Math.round(mid*100)}% and ${Math.round((1-mid)*100)}% of the original loaf.`;
      $('loaf-language').textContent=parts===1?'The whole is the unit we compare shares with.':equal?`One equal piece is 1/${parts} of this loaf. ${parts} of these pieces reconstruct the whole. More pieces make each equal piece smaller.`:'Two pieces are not necessarily two halves. A half means one of two equal shares of the same whole.';
      say(parts===1?'The loaf is still whole. No division has been chosen.':equal?`You made ${parts} equal shares. No food was added.`:'The cut now gives one person more food than the other.',equal?'The board shows the original amount. Cutting changes the number and size of pieces, not the total amount of bread.':'Calling both pieces “one piece” hides their unequal sizes. Fairness requires comparing the amount in each piece.', 'Would more people mean more bread, or smaller shares? Try a different cut, move the middle cut, or keep the loaf whole.');
    }
    [['cut-two',2],['cut-three',3],['cut-four',4],['whole-loaf',1]].forEach(([id,n])=>on($(id),'click',()=>{parts=n;$('middle-cut').value=50;draw()}));on($('middle-cut'),'input',draw);draw();
  },
})
