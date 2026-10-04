import { defineLesson } from '../schema.js'
import { drawing } from '../modelTools.js'
export default defineLesson({
  id:'sharing-table', title:'Enough for everyone?', chapter:'Sharing', order:5,
  prompt:'What would convince everyone that the sharing was fair?',
  discovery:{start:'Cookies are on the table; three plates are empty.',notice:'Nobody has a share yet. You choose how to distribute the cookies, or leave them on the table.',question:'Can everyone receive the same share, and what could you do with anything left?',transfer:'If twelve friends share thirteen tickets, can one ticket be cut up like a cookie? Which parts of the sharing story change?'},
  panels:{
    explore:`<p>Give cookies to any plate, one at a time. You can try dealing around the table if that seems easier.</p><div class="row"><button id="give-a">Give to plate A</button><button id="give-b">Give to plate B</button><button id="give-c">Give to plate C</button><button id="deal">Deal one round</button></div><div class="row"><button id="extra">Add a cookie</button><button id="start-over">Put them back</button></div>`,
    scene:`<svg id="sharing" viewBox="0 0 420 260" role="img" aria-label="Cookies on a table and three plates"></svg>`,
    connections:`<p id="sharing-record"></p><p>Equal-looking plate sizes do not guarantee equal shares. Compare the cookies themselves.</p>`,
    explanation:`<p id="sharing-language"></p>`,
  },
  mount(ctx){const {$,say,on}=ctx,d=drawing(ctx,'sharing');let total=12,plates=[0,0,0];
    const remaining=()=>total-plates.reduce((a,b)=>a+b,0);
    function draw(){d.clear();const left=remaining();d.text(12,20,'On the table');for(let i=0;i<left;i++)d.shape('circle',{cx:20+(i%12)*30,cy:42+Math.floor(i/12)*28,r:10,fill:'var(--a)'});
      plates.forEach((n,j)=>{d.shape('ellipse',{cx:70+j*140,cy:172,rx:60,ry:68,fill:'var(--paper)',stroke:'var(--line)'});d.text(52+j*140,252,`Plate ${'ABC'[j]}`);for(let i=0;i<n;i++)d.shape('circle',{cx:36+j*140+(i%4)*22,cy:130+Math.floor(i/4)*18,r:7,fill:'var(--a)'});});
      ['give-a','give-b','give-c'].forEach(id=>$(id).disabled=left===0);$('deal').disabled=left<3;$('extra').disabled=total>=18;
      $('sharing-record').textContent=`On plates: ${plates.join(', ')} · still on the table: ${left}`;
      const equal=plates.every(n=>n===plates[0]);
      $('sharing-language').textContent=equal?`${plates[0]} each is an equal share. ${left} on the table is what remains after this distribution. Only when the share is as large as possible does that leftover become the remainder of division.`:'Equal sharing is division. Unequal distributions are possible too; they do not yet represent equal shares.';
      say(equal?`Each plate has ${plates[0]} cookies; ${left} remain on the table.`:`The plates contain ${plates.join(', ')} cookies; ${left} remain.`,equal&&left<3&&left>0?'There are too few whole cookies to give everyone another one. Splitting a cookie is another possible experiment, but giving it whole to one person changes equality.':equal?'The shares match. Could everyone have more without breaking that equality?':'The original cookies are all still present, but some plates have more. Equal sharing depends on the amounts, not the order in which you gave them.', 'Would another round preserve fairness? Add one cookie or put them back and try a different way of distributing.');
    }
    ['give-a','give-b','give-c'].forEach((id,j)=>on($(id),'click',()=>{if(remaining()){plates[j]++;draw()}}));on($('deal'),'click',()=>{if(remaining()>=3){plates=plates.map(n=>n+1);draw()}});on($('extra'),'click',()=>{if(total<18){total++;draw()}});on($('start-over'),'click',()=>{plates=[0,0,0];draw()});draw();
  },
})
