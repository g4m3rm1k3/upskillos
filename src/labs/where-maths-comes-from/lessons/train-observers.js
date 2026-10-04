import { defineLesson } from '../schema.js'
import { drawing } from '../modelTools.js'
export default defineLesson({
  id:'train-observers',title:'One journey, two observers',chapter:'Viewpoints',order:95,
  prompt:'Could two people describe the same ball’s path differently?',
  discovery:{start:'A train is ready to travel while a passenger tosses a ball straight up.',notice:'You can move time forward and choose a passenger or platform view. Changing the observer does not change the event.',question:'What path would the passenger see, and what path would someone on the platform see?',transfer:'If you walk towards the front of a moving train, how might your speed look to a passenger and to someone outside?'},
  panels:{explore:`<div class="row"><button id="next-moment">One moment later</button><button id="journey-reset">Start again</button></div><label>Watch from <select id="observer"><option value="platform">The platform</option><option value="train">The train</option></select></label><div class="row"><button id="show-path">Keep a path record</button></div><p>The train travels steadily on a straight track. The ball keeps the train’s horizontal motion in this ideal model.</p>`,scene:`<svg id="train" viewBox="0 0 560 300" role="img" aria-label="Ball and train from the chosen observer"></svg>`,connections:`<p id="journey-record"></p>`,explanation:`<p id="journey-language"></p>`},
  mount(ctx){const {$,on,say}=ctx,d=drawing(ctx,'train');let t=0,path=false;
    function point(time){const trainView=$('observer').value==='train';return [140+(trainView?0:time*36),224-10*(16-(time-4)**2)];}
    function draw(){d.clear();const trainView=$('observer').value==='train',x=60+(trainView?0:t*36),[bx,by]=point(t);
      d.shape('line',{x1:5,y1:264,x2:555,y2:264,stroke:'var(--line)','stroke-width':3});d.shape('rect',{x,y:215,width:160,height:42,rx:8,fill:'var(--card)',stroke:'var(--a)','stroke-width':2});d.text(x+10,248,'Passenger');
      const platformX=trainView?450-t*36:450;d.shape('line',{x1:platformX,y1:215,x2:platformX,y2:260,stroke:'var(--b)','stroke-width':4});d.text(platformX-20,286,'Platform');
      if(path)for(let i=0;i<=t;i++){const [px,py]=point(i);d.shape('circle',{cx:px,cy:py,r:4,fill:'var(--c)',opacity:.6});}
      d.shape('circle',{cx:bx,cy:by,r:9,fill:'var(--b)'});$('next-moment').disabled=t===8;
      $('journey-record').textContent=`Moment ${t} · ${trainView?'passenger':'platform'} view${path?' · path record shown':''}`;
      $('journey-language').textContent='A reference frame describes positions relative to an observer. Platform position equals train position plus position relative to the train. Changing coordinates does not change the physical journey.';
      say(trainView?'The ball stays above the same place in the train.':'The ball travels along the track as well as up and down.',trainView?'The passenger shares the train’s horizontal movement. Relative to that passenger, the ball’s path is vertical.':'The platform observer does not share the train’s motion. The ball keeps travelling horizontally while rising and falling.', 'Switch observer at the same moment. Did the ball change its journey, or did your description change? You can keep a path record if it helps.');
    }
    on($('next-moment'),'click',()=>{if(t<8){t++;draw()}});on($('journey-reset'),'click',()=>{t=0;draw()});on($('observer'),'change',draw);on($('show-path'),'click',()=>{path=!path;$('show-path').textContent=path?'Hide the path record':'Keep a path record';draw()});draw();
  },
})
