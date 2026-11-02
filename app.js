// SUBX: scroll scenes, ambient motion, and email contact.
(()=>{
  'use strict';
  document.documentElement.classList.add('js');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes=[...document.querySelectorAll('.scene')].map(el=>({
    el,canvas:el.querySelector('canvas'),ctx:el.querySelector('canvas').getContext('2d'),index:Number(el.dataset.scene)
  }
  ));
  let pointer={
    x:0,y:0
  }
  ,scheduled=false,clock=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function resize(){
    scenes.forEach(s=>{
      s.w=s.el.clientWidth;
      s.h=s.el.clientHeight;
      const d=Math.min(devicePixelRatio||1,2);
      s.canvas.width=s.w*d;
      s.canvas.height=s.h*d;
      s.ctx.setTransform(d,0,0,d,0,0)
    }
    );
    draw()
  }
  function draw(){
    scheduled=false;
    scenes.forEach(s=>{
      const rect=s.el.getBoundingClientRect();
      if(rect.bottom<0||rect.top>innerHeight)return;
      const t=clamp((innerHeight-rect.top)/(innerHeight+s.h),0,1),move=reduced?0:t-.45;
      const {
        ctx:c,w,h,index:k
      }
      =s;
      c.clearRect(0,0,w,h);
      const mobile=w<700,cx=w*(mobile?.5:.28)+Math.sin(move*4)*w*.06,cy=h*(mobile?.64:.49)-move*h*.16,scale=Math.min(w*(mobile?.31:.23),h*.28)*(1+move*.45),angle=reduced?.4:move*2.4+pointer.x*.15+Math.sin(clock*.3)*.08;
      s.el.style.setProperty('--copy-shift',move*-85+'px');
      s.el.style.setProperty('--copy-alpha',String(reduced?1:clamp((t-.03)*5,.15,1)));
      s.el.style.setProperty('--label-shift',move*-130+'px');
      s.el.style.setProperty('--logo-shift',move*-100+'px');
      s.el.style.setProperty('--logo-scale',String(1+move*.2));
      function project(x,y,z){
        const rx=x*Math.cos(angle)+z*Math.sin(angle),rz=-x*Math.sin(angle)+z*Math.cos(angle),tilt=.22+(reduced?0:pointer.y*.1),ry=y*Math.cos(tilt)-rz*Math.sin(tilt),depth=y*Math.sin(tilt)+rz*Math.cos(tilt),q=3.5/(3.5+depth);
        return[cx+rx*scale*q,cy+ry*scale*q,depth]
      }
      function line(a,b,color,width=1){
        c.strokeStyle=color;
        c.lineWidth=width;
        c.beginPath();
        c.moveTo(a[0],a[1]);
        c.lineTo(b[0],b[1]);
        c.stroke()
      }
      function cube(x,y,z,size){
        const pts=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(v=>project(x+v[0]*size,y+v[1]*size,z+v[2]*size));
        const faces=[[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]];
        faces.sort((a,b)=>b.reduce((sum,i)=>sum+pts[i][2],0)-a.reduce((sum,i)=>sum+pts[i][2],0)).forEach((f,i)=>{
          c.beginPath();
          f.forEach((n,j)=>j?c.lineTo(pts[n][0],pts[n][1]):c.moveTo(pts[n][0],pts[n][1]));
          c.closePath();
          c.fillStyle=['#47136e','#6924a0','#9b54dd','#c48aef','#351448','#7438b3'][i];
          c.fill();
          c.strokeStyle='#e5b8ff99';
          c.lineWidth=.8;
          c.stroke()
        }
        )
      }
      const glow=c.createRadialGradient(cx,cy,0,cx,cy,scale*1.7);
      glow.addColorStop(0,k===1?'#ad69db20':'#9f41ff26');
      glow.addColorStop(1,'#9f41ff00');
      c.fillStyle=glow;
      c.fillRect(0,0,w,h);
      for(let n=0;
      n<36;
      n++){
        const side=n%2?1:-1,layer=Math.floor(n/2),x=side*(1.1+layer*.075),y=((n*7)%19-9)*.13;
        const a=project(x,y,.7),b=project(x+side*.25,y,.7),d=project(x+side*.4,y+.14,.7),e=project(x+side*.8,y+.14,.7);
        const color=k===1?'#8135bb40':'#c289ff40';
        line(a,b,color);
        line(b,d,color);
        line(d,e,color);
        const travel=reduced?.5:(clock*.2+n*.17)%1,px=a[0]+(e[0]-a[0])*travel,py=a[1]+(e[1]-a[1])*travel;
        c.fillStyle=k===1?'#8b35c7':'#ddb4ff';
        c.beginPath();
        c.arc(px,py,1.8,0,Math.PI*2);
        c.fill();
      }
      for(let ring=0;
      ring<3;
      ring++){
        let previous;
        for(let j=0;
        j<=100;
        j++){
          const a=j/100*Math.PI*2,r=1.28+ring*.19,point=project(Math.cos(a)*r,Math.sin(a)*r*.72,Math.sin(a)*.7+ring*.12);
          if(previous)line(previous,point,k===1?'#7d28b529':'#be87ff33');
          previous=point;
        }
      }
      for(let n=0;
      n<65;
      n++){
        const a=n*2.399,r=1.5+(n%7)*.13,drift=reduced?0:Math.sin(clock*.5+n)*.06;
        const point=project(Math.cos(a)*r,Math.sin(a)*r+drift,Math.sin(n*3)*1.2);
        c.fillStyle=k===1?'#9b55c477':'#c388ff88';
        c.fillRect(point[0],point[1],n%3?1:2,n%3?1:2);
      }
      for(let j=0;
      j<13;
      j++){
        let prev;
        for(let i=0;
        i<=30;
        i++){
          const x=(i-15)*.18,z=j*.18-.8,y=.85+Math.sin(x*2+z*3+t*4)*.07;
          const pt=project(x,y,z);
          if(prev)line(prev,pt,k===1?'#7136a32a':'#b97cff24');
          prev=pt
        }
      }
      if(k===0){
        for(let row=0;
        row<22;
        row++){
          let prev;
          for(let col=0;
          col<=48;
          col++){
            const a=col/48*Math.PI*2,b=row/21*Math.PI,r=1+.08*Math.sin(a*4+b*3+move*6);
            const pt=project(Math.sin(b)*Math.cos(a)*r,Math.cos(b)*r,Math.sin(b)*Math.sin(a)*r);
            if(prev)line(prev,pt,'#bd7aff65',.8);
            if(col%4===0){
              c.fillStyle='#e0b7ff';
              c.fillRect(pt[0],pt[1],2,2)
            }
            prev=pt
          }
        }
      }
      if(k===1){
        for(let n=5;
        n>=0;
        n--){
          const depth=n*.25-.6,spread=1+move*.2;
          const pts=[[-.65,-1],[.65,-1],[.65,1],[-.65,1]].map(v=>project(v[0]*spread,v[1]*spread,depth));
          for(let i=0;
          i<4;
          i++)line(pts[i],pts[(i+1)%4],n===0?'#8525d1':'#a65bdf55',n===0?5:1.5)
        }
        const a=project(-.2,-.15,-.7),b=project(.12,0,-.7),d=project(-.2,.15,-.7);
        line(a,b,'#8721d1',5);
        line(b,d,'#8721d1',5);
        line(project(.18,.2,-.7),project(.4,.2,-.7),'#8721d1',5)
      }
      if(k===2){
        const scatter=clamp(1-t*1.6,0,1);
        for(let z=1;
        z>=-1;
        z--)for(let y=-1;
        y<=1;
        y++)for(let x=-1;
        x<=1;
        x++){
          const gap=.5+scatter*.4;
          cube(x*gap,y*gap+Math.sin(x+z+move*5)*scatter*.3,z*gap,.21)
        }
      }
      if(k===3){
        c.globalAlpha=.35;
        for(let i=0;
        i<60;
        i++){
          const a=i*2.4,r=1.25+(i%5)*.12;
          const pt=project(Math.cos(a)*r,Math.sin(a)*r,Math.sin(i)*.5);
          c.fillStyle='#bd7aff';
          c.beginPath();
          c.arc(pt[0],pt[1],1.5,0,7);
          c.fill()
        }
        c.globalAlpha=1
      }
    }
    );
    document.documentElement.style.setProperty('--reading',(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)*100)+'%');
    const light=document.querySelector('.scene-light').getBoundingClientRect();
    document.body.classList.toggle('light-header',light.top<60&&light.bottom>60)
  }
  function schedule(){
    if(!scheduled){
      scheduled=true;
      requestAnimationFrame(draw)
    }
  }
  addEventListener('scroll',schedule,{
    passive:true
  }
  );
  addEventListener('resize',resize);
  addEventListener('pointermove',e=>{
    pointer={
      x:e.clientX/innerWidth-.5,y:e.clientY/innerHeight-.5
    }
    ;
    if(!reduced)schedule()
  }
  );
  const obs=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('visible');
      obs.unobserve(e.target)
    }
  }
  ),{
    threshold:.08
  }
  );
  document.querySelectorAll('.reveal').forEach(e=>obs.observe(e));
  resize();
  let last=0;
  function animate(now){
    requestAnimationFrame(animate);
    if(reduced||document.hidden||now-last<33)return;
    last=now;
    const bounds=document.querySelector('.scroll-story').getBoundingClientRect();
    if(bounds.bottom<0||bounds.top>innerHeight)return;
    clock=now*.001;
    schedule()
  }
  requestAnimationFrame(animate);
  const form=document.querySelector('#contact-form');
  if(form)form.addEventListener('submit',event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const data=new FormData(form),name=String(data.get('name')).trim(),subject=String(data.get('subject')).trim(),message=String(data.get('message')).trim();
    if(!name||!subject||!message)return;
    location.href='mailto:maa321584@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent('الاسم: '+name+'\n\n'+message+'\n\n— موقع SUBX')
  }
  );
}
)();
