import { defineLesson } from '../schema.js'

export default defineLesson({
  id: "l9",
  title: "Making rectangles",
  chapter: "Arrangements",
  order: 30,
  prompt: "Could these tiles cover a rectangular tray without gaps or leftovers?",
  discovery: {"start": "A loose pile of tiles is waiting to be arranged.", "notice": "You choose whether to keep the pile loose or try a row size. A gap is information about that choice.", "question": "Could these tiles cover a rectangular tray without gaps or leftovers?", "transfer": "Would a different tray shape use the same tiles? What happens if you lose just one tile?", "views": []},
  panels: {
    explore: `<p>A tray needs covering with identical tiles. Keep them loose, or try placing them in rows.</p><label>Tiles <input type="range" id="pn" min="2" max="30" value="12"><b id="pnv"></b></label><div class="row"><button id="try-rows">Try rows</button><button id="loose-tiles" hidden>Keep them loose</button></div><label id="row-choice" hidden>Tiles per row <input type="range" id="row-width" min="1" max="15" value="4"><b id="width-value"></b></label>`,
    scene: `<div class="stage"><svg id="pr" viewBox="0 0 360 240" role="img" aria-label="Loose tiles"></svg></div>`,
    connections: `<details><summary>Compare all rectangles that fit</summary><div id="fits"></div></details>`,
    explanation: `<p id="pm"></p>`,
  },
  mount({$,el,say,on}) {
    let arranged=false;
    function draw(){
      const n=+$('pn').value,w=+$('row-width').value,full=Math.floor(n/w),left=n%w;
      $('pnv').textContent=n;$('width-value').textContent=w;
      const s=$('pr');s.innerHTML='';s.setAttribute('viewBox',arranged?`0 0 360 ${Math.max(100,Math.ceil(n/w)*24+24)}`:'0 0 360 240');
      for(let i=0;i<n;i++)el('rect',{x:arranged?12+(i%w)*22:16+(i*59)%316,y:arranged?12+Math.floor(i/w)*24:16+(i*43)%190,width:16,height:16,rx:2,fill:arranged&&i>=full*w?'var(--b)':'var(--a)'},s);
      const pairs=[];for(let a=1;a*a<=n;a++)if(n%a===0)pairs.push([a,n/a]);
      $('fits').textContent=pairs.map(([a,b])=>`${a} rows with ${b} tiles per row`).join('; ');
      $('pm').textContent=`The fitting side lengths are factors of ${n}. ${pairs.length===1?`${n} is prime: it has only two positive factors, 1 and itself.`:pairs.some(([a,b])=>a===b)?'Equal sides make a square.':'This collection has no square arrangement.'}`;
      say(arranged?`${full} complete rows of ${w}, with ${left} tiles in an unfinished row.`:`${n} tiles are loose. No row size has been chosen.`,
        arranged?left?`The last row has gaps. You used the same tiles, but this width does not make a full rectangle. Would another width fit?`:`Every row is full. The row size ${w} fits exactly into the pile, so it is a factor of ${n}. ${w===1||w===n?'A single row or column also counts as a rectangle.':''}`:'You can arrange them if a tray shape would make the task easier. A new arrangement does not create extra tiles.',
        arranged?'Keep the pile fixed and try another width. What changes if you add or remove just one tile?':'Would arranging them help you see whether the tray can be covered? Try rows or leave the tiles loose.');
    }
    on($('try-rows'),'click',()=>{arranged=true;$('row-choice').hidden=false;$('loose-tiles').hidden=false;$('try-rows').hidden=true;draw()});
    on($('loose-tiles'),'click',()=>{arranged=false;$('row-choice').hidden=true;$('loose-tiles').hidden=true;$('try-rows').hidden=false;draw()});
    on($('pn'),'input',draw);on($('row-width'),'input',draw);draw();
  },
})
