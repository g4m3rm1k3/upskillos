// The Python source of opencalc.py, embedded as a string and written to
// Pyodide's virtual filesystem so lesson code can `from opencalc import Figure`.
// Single source of truth — previously duplicated verbatim into 13 separate
// src/courses/{course}/viz/PythonNotebook.jsx files, which is how the
// plot() parameter bug below went unnoticed in 11 of them simultaneously.
export const OPENCALC_LIB_SOURCE = `
import json
import math

BLUE='blue';AMBER='amber';GREEN='green';RED='red';PURPLE='purple';TEAL='teal';GRAY='gray'

class Figure:
    def __init__(self,width=None,height=None,square=False,xmin=-5,xmax=5,ymin=-5,ymax=5,title=None):
        self._elements=[];self._width=width;self._height=height;self._square=square
        self._xmin=xmin;self._xmax=xmax;self._ymin=ymin;self._ymax=ymax;self._title=title
        self._xlabel=None;self._ylabel=None
    def xlabel(self,label):self._xlabel=label;return self
    def ylabel(self,label):self._ylabel=label;return self
    def title(self,t):self._title=t;return self
    def grid(self,step=1,color='border'):
        self._elements.append({'type':'grid','step':step,'color':color});return self
    def axes(self,labels=True,ticks=True,xmin=None,xmax=None,ymin=None,ymax=None):
        if xmin is not None:self._xmin=xmin
        if xmax is not None:self._xmax=xmax
        if ymin is not None:self._ymin=ymin
        if ymax is not None:self._ymax=ymax
        self._elements.append({'type':'axes','labels':labels,'ticks':ticks});return self
    def arrow(self,start,end,color='blue',label=None,width=2.5,dashed=False,alpha=1.0):
        self._elements.append({'type':'arrow','start':list(start),'end':list(end),'color':color,'label':label,'width':width,'dashed':dashed,'alpha':alpha});return self
    def vector(self,v,color='blue',label=None,origin=None,width=2.5):
        ox,oy=(origin or [0,0]);self._elements.append({'type':'arrow','start':[ox,oy],'end':[ox+v[0],oy+v[1]],'color':color,'label':label or f'[{v[0]},{v[1]}]','width':width,'dashed':False,'alpha':1.0});return self
    def point(self,pos,color='amber',label=None,radius=6):
        self._elements.append({'type':'point','pos':list(pos),'color':color,'label':label,'radius':radius});return self
    def line(self,start,end,color='muted',width=1.5,dashed=False,alpha=1.0):
        self._elements.append({'type':'line','start':list(start),'end':list(end),'color':color,'width':width,'dashed':dashed,'alpha':alpha});return self
    def hline(self,y,color='muted',width=1,dashed=True):
        self._elements.append({'type':'line','start':[self._xmin,y],'end':[self._xmax,y],'color':color,'width':width,'dashed':dashed,'alpha':0.7});return self
    def vline(self,x,color='muted',width=1,dashed=True):
        self._elements.append({'type':'line','start':[x,self._ymin],'end':[x,self._ymax],'color':color,'width':width,'dashed':dashed,'alpha':0.7});return self
    def plot(self,fn_or_xs,xmin=None,xmax=None,steps=300,color='blue',width=2.5,label=None,fill=False,fill_alpha=0.15,dashed=False):
        if isinstance(fn_or_xs,(list,tuple)):
            self._elements.append({'type':'curve','xs':list(fn_or_xs),'ys':list(xmin),'color':color,'width':width,'label':label,'fill':fill,'fill_alpha':fill_alpha,'dashed':dashed});return self
        fn=fn_or_xs;x0=xmin if xmin is not None else self._xmin;x1=xmax if xmax is not None else self._xmax
        xs=[x0+(x1-x0)*i/steps for i in range(steps+1)];ys=[]
        for x in xs:
            try:
                y=fn(x);ys.append(float('inf') if y!=y else y)
            except:ys.append(None)
        self._elements.append({'type':'curve','xs':xs,'ys':ys,'color':color,'width':width,'label':label,'fill':fill,'fill_alpha':fill_alpha,'dashed':dashed});return self
    def scatter(self,xs,ys,color='blue',radius=4,labels=None,size=None):
        r=size if size is not None else radius
        self._elements.append({'type':'scatter','xs':list(xs),'ys':list(ys),'color':color,'radius':r,'labels':labels});return self
    def parametric(self,xfn,yfn,tmin=0,tmax=2*math.pi,steps=300,color='purple',width=2):
        ts=[tmin+(tmax-tmin)*i/steps for i in range(steps+1)];xs=[];ys=[]
        for t in ts:
            try:xs.append(xfn(t))
            except:xs.append(None)
            try:ys.append(yfn(t))
            except:ys.append(None)
        self._elements.append({'type':'curve','xs':xs,'ys':ys,'color':color,'width':width,'label':None,'fill':False,'fill_alpha':0});return self
    def fill_between(self,fn_top,fn_bottom=None,xmin=None,xmax=None,color='blue',alpha=0.2,steps=200):
        x0=xmin if xmin is not None else self._xmin;x1=xmax if xmax is not None else self._xmax
        xs=[x0+(x1-x0)*i/steps for i in range(steps+1)];tops=[];bottoms=[]
        for x in xs:
            try:tops.append(fn_top(x))
            except:tops.append(None)
            if fn_bottom:
                try:bottoms.append(fn_bottom(x))
                except:bottoms.append(None)
            else:bottoms.append(0)
        self._elements.append({'type':'region','xs':xs,'tops':tops,'bottoms':bottoms,'color':color,'alpha':alpha});return self
    def text(self,x_or_pos,y_or_content,content_or_color=None,color='text',size=13,align='center',bold=False):
        if isinstance(x_or_pos,(int,float)):
            pos=[x_or_pos,y_or_content];txt=content_or_color
        else:
            pos=list(x_or_pos);txt=y_or_content
            if content_or_color is not None and isinstance(content_or_color,str) and content_or_color not in ('text','blue','red','green','amber','purple','teal','gray','muted'):color=content_or_color
        self._elements.append({'type':'text','pos':pos,'content':str(txt),'color':color,'size':size,'align':align,'bold':bold});return self
    def polygon(self,points,color='blue',fill=True,alpha=0.2,stroke=True,stroke_width=1.5):
        self._elements.append({'type':'polygon','points':[list(p) for p in points],'color':color,'fill':fill,'alpha':alpha,'stroke':stroke,'stroke_width':stroke_width});return self
    def rect(self,x,y,w,h,color='blue',fill=True,alpha=0.2):
        return self.polygon([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],color=color,fill=fill,alpha=alpha)
    def circle(self,center,radius,color='blue',fill=False,alpha=0.2,steps=60):
        pts=[[center[0]+radius*math.cos(2*math.pi*i/steps),center[1]+radius*math.sin(2*math.pi*i/steps)] for i in range(steps+1)]
        self._elements.append({'type':'polygon','points':pts,'color':color,'fill':fill,'alpha':alpha,'stroke':True,'stroke_width':1.5});return self
    def transformed_grid(self,matrix,color_h='blue',color_v='green',range_=5,alpha=0.7):
        a,b=matrix[0];c,d=matrix[1]
        self._elements.append({'type':'transformed_grid','a':a,'b':b,'c':c,'d':d,'range':range_,'color_h':color_h,'color_v':color_v,'alpha':alpha});return self
    def riemann(self,fn,a,b,n=10,method='midpoint',color='blue',alpha=0.3):
        rects=[];width=(b-a)/n
        for i in range(n):
            x_left=a+i*width;x_eval=x_left+(width/2 if method=='midpoint' else width if method=='right' else 0)
            try:h=fn(x_eval);rects.append({'x':x_left,'w':width,'h':h})
            except:pass
        self._elements.append({'type':'riemann','rects':rects,'color':color,'alpha':alpha});return self
    def tangent(self,fn,x0,length=2,color='amber',width=2,label=None):
        dx=1e-5;slope=(fn(x0+dx)-fn(x0-dx))/(2*dx);y0=fn(x0)
        self._elements.append({'type':'tangent','x0':x0,'y0':y0,'slope':slope,'x1':x0-length/2,'x2':x0+length/2,'color':color,'width':width,'label':label or f'slope = {slope:.3f}'});return self
    def bars(self,labels,values,color='blue',alpha=0.8):
        self._elements.append({'type':'bars','labels':[str(l) for l in labels],'values':[float(v) for v in values],'color':color,'alpha':alpha});return self
    def histogram(self,data=None,bins=10,color='blue',alpha=0.7,density=False,values=None):
        data=data if data is not None else values
        if not data:return self
        mn,mx=min(data),max(data)
        if mn==mx:mn-=0.5;mx+=0.5
        bw=(mx-mn)/bins;counts=[0]*bins
        for v in data:
            idx=min(int((v-mn)/bw),bins-1);counts[idx]+=1
        if density:
            tot=sum(counts);counts=[c/(tot*bw) for c in counts]
        edges=[mn+i*bw for i in range(bins+1)]
        self._elements.append({'type':'histogram','edges':edges,'counts':counts,'color':color,'alpha':alpha,'density':density,'xmin':mn,'xmax':mx});return self
    def boxplot(self,data,x=0.5,width=0.35,color='blue',label=None):
        s=sorted(data);n=len(s)
        def pct(p):
            idx=p/100*(n-1);lo=int(idx);hi=min(lo+1,n-1)
            return s[lo]+(s[hi]-s[lo])*(idx-lo)
        q1,med,q3=pct(25),pct(50),pct(75);iqr=q3-q1
        lf,uf=q1-1.5*iqr,q3+1.5*iqr
        lw=min(v for v in s if v>=lf);uw=max(v for v in s if v<=uf)
        outliers=[v for v in s if v<lf or v>uf]
        self._elements.append({'type':'boxplot','x':x,'xmax':self._xmax,'width':width,'color':color,'q1':q1,'median':med,'q3':q3,'lower_whisker':lw,'upper_whisker':uw,'outliers':outliers,'label':label,'ymin':self._ymin,'ymax':self._ymax});return self
    def pie(self,labels,values,colors=None):
        self._elements.append({'type':'pie','labels':[str(l) for l in labels],'values':[float(v) for v in values],'colors':colors});return self
    def show(self):
        return json.dumps({'type':'opencalc_figure','width':self._width,'height':self._height,'square':self._square,'xmin':self._xmin,'xmax':self._xmax,'ymin':self._ymin,'ymax':self._ymax,'title':self._title,'xlabel':self._xlabel,'ylabel':self._ylabel,'elements':self._elements})

def quick_plot(fn,xmin=-5,xmax=5,color='blue',label=None,title=None):
    fig=Figure(xmin=xmin,xmax=xmax,ymin=-10,ymax=10,title=title)
    fig.grid().axes();fig.plot(fn,color=color,label=label);return fig.show()

def quick_vectors(*vectors,labels=None):
    colors=['blue','amber','green','red','purple','teal']
    fig=Figure(square=True,xmin=-6,xmax=6,ymin=-6,ymax=6)
    fig.grid().axes()
    for i,v in enumerate(vectors):
        lbl=labels[i] if labels and i<len(labels) else f'v{i+1}'
        fig.vector(v,color=colors[i%len(colors)],label=lbl)
    return fig.show()

def quick_transform(matrix,vector=None):
    fig=Figure(square=True,xmin=-5,xmax=5,ymin=-5,ymax=5)
    fig.grid();fig.transformed_grid(matrix)
    a,b=matrix[0];c,d=matrix[1]
    fig.vector([a,c],color='red',label='î→');fig.vector([b,d],color='green',label='ĵ→')
    if vector:
        vx,vy=vector;fig.vector([vx,vy],color='purple',label='v')
        fig.vector([a*vx+b*vy,c*vx+d*vy],color='purple',label='Tv')
    return fig.show()
`;
