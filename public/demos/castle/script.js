(() => {
'use strict';
const cinema=document.querySelector('.cinema-scroll'),stage=document.querySelector('.stage');
const header=document.querySelector('.site-header'),intro=document.querySelector('.intro-copy'),bottom=document.querySelector('.hero-bottom');
const portal=document.querySelector('.portal-scroll'),portalStage=document.querySelector('.portal-stage'),afterword=document.querySelector('.portal-afterword');
const chapter=document.querySelector('.chapter-scroll'),chapterStage=document.querySelector('.chapter-stage');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(v,min=0,max=1)=>Math.min(max,Math.max(min,v)),ease=v=>v*v*(3-2*v);
let pending=false,smooth=scrollY,geometry={};
function makeGallery(container,scope,prefix,names){
 return {container,frames:[...container.querySelectorAll('.frame')],captions:[...container.querySelectorAll('.frame-caption')],backgrounds:[...scope.querySelectorAll('.gallery-back')],credits:[...container.querySelectorAll('.gallery-background-credit span')],dots:[...container.querySelectorAll('.gallery-dots button')],previous:document.getElementById(prefix==='chapter'?'chapter-previous':'previous'),next:document.getElementById(prefix==='chapter'?'chapter-next':'next'),counter:document.getElementById(prefix==='chapter'?'chapter-current':'current-frame'),live:document.getElementById(prefix==='chapter'?'chapter-live':'gallery-live'),names,active:-1,top:0,run:1};
}
const first=makeGallery(cinema.querySelector('.gallery-stage'),stage,'first',['Нойшванштайн','Эйлен-Донан','Шильон']);
const second=makeGallery(chapter.querySelector('.gallery-stage'),chapterStage,'chapter',['Гогенцоллерн','Мон-Сен-Мишель','Алькасар Сеговии']);
function measure(){
 const heroRun=parseFloat(getComputedStyle(cinema).getPropertyValue('--hero-run')),total=cinema.offsetHeight-stage.offsetHeight;
 geometry={top:cinema.offsetTop,heroRun,portalTop:portal.offsetTop,portalRun:Math.max(1,portal.offsetHeight-portalStage.offsetHeight),portalTravelRun:parseFloat(getComputedStyle(portal).getPropertyValue('--portal-travel-run'))};
 first.top=cinema.offsetTop+heroRun;first.run=total-heroRun;
 second.top=chapter.offsetTop;second.run=Math.max(1,chapter.offsetHeight-chapterStage.offsetHeight);
 requestTick();
}
function select(g,index){index=clamp(index,0,g.frames.length-1);scrollTo({top:g.top+g.run*index/(g.frames.length-1),behavior:reduced.matches?'instant':'smooth'});}
function paintGallery(g){
 const position=clamp((smooth-g.top)/g.run)*(g.frames.length-1),selected=Math.round(position),visual=reduced.matches?selected:position;
 g.frames.forEach((frame,i)=>{
  const incoming=clamp(visual-(i-1)),covered=clamp(visual-i),visible=i===0||visual>i-1,shift=i===0?-covered*7:(1-ease(incoming))*100-covered*7;
  frame.style.visibility=visible?'visible':'hidden';frame.style.zIndex=String(i+1);frame.style.transform=`translate3d(${shift}%,0,0)`;
  g.captions[i].style.transform=`translate3d(${-shift}%,0,0)`;frame.inert=i!==selected;frame.setAttribute('aria-hidden',i===selected?'false':'true');
  g.backgrounds[i].style.clipPath=`inset(0 0 0 ${i===0?0:(1-ease(incoming))*100}%)`;
 });
 if(g.active!==selected){
  g.active=selected;g.counter.textContent=String(selected+1);
  g.dots.forEach((dot,i)=>{dot.classList.toggle('is-active',i===selected);if(i===selected)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');});
  g.frames.forEach((frame,i)=>frame.classList.toggle('is-active',i===selected));g.credits.forEach((credit,i)=>credit.hidden=i!==selected);
  g.previous.disabled=selected===0;g.next.disabled=selected===g.frames.length-1;g.live.textContent=`${g.names[selected]}, ${selected+1} из ${g.frames.length}`;
 }
}
function update(){
 pending=false;const target=scrollY;smooth=reduced.matches?target:smooth+(target-smooth)*.15;
 const progress=clamp((smooth-geometry.top)/geometry.heroRun),exit=ease(clamp(progress/.48)),split=Math.pow(ease(clamp((progress-.2)/.76)),1.3),cutout=ease(clamp((progress-.12)/.13)),original=1-ease(clamp((progress-.2)/.23)),enter=ease(clamp((progress-.76)/.24));
 cinema.style.setProperty('--hero-exit',exit.toFixed(4));cinema.style.setProperty('--scene-scale',(1+progress*.22).toFixed(4));cinema.style.setProperty('--original-opacity',original.toFixed(4));cinema.style.setProperty('--cutout-opacity',(cutout*(1-ease(clamp((progress-.94)/.06)))).toFixed(4));cinema.style.setProperty('--split',split.toFixed(4));cinema.style.setProperty('--gallery-enter',enter.toFixed(4));
 const ready=progress>.76;first.container.classList.toggle('is-ready',ready);first.container.inert=!ready;intro.inert=exit>.98;bottom.inert=exit>.98;header.classList.toggle('is-gallery',progress>.7);
 paintGallery(first);paintGallery(second);
 // Keep an off-screen sticky chapter's links out of keyboard navigation.
 second.container.inert=smooth<second.top-innerHeight*.8||smooth>second.top+chapter.offsetHeight;
 const portalDistance=smooth-geometry.portalTop,passage=clamp(portalDistance/geometry.portalTravelRun),travel=ease(clamp((passage-.06)/.84));
 const reveal=reduced.matches?1:ease(clamp((portalDistance-geometry.portalTravelRun-80)/420));
 portal.style.setProperty('--afterword-opacity',reveal.toFixed(4));portal.style.setProperty('--afterword-y',`${(1-reveal)*20}px`);afterword.inert=reveal<.98;
 portal.style.setProperty('--portal-scale',(1+travel*4.2).toFixed(4));portal.style.setProperty('--landscape-scale',(1.12-travel*.12).toFixed(4));
 portal.classList.toggle('is-near',smooth>geometry.portalTop-innerHeight&&smooth<geometry.portalTop+portal.offsetHeight);
 if(Math.abs(target-smooth)>.12)requestTick();
}
function requestTick(){if(!pending){pending=true;requestAnimationFrame(update);}}
addEventListener('scroll',requestTick,{passive:true});addEventListener('resize',measure,{passive:true});reduced.addEventListener('change',measure);
cinema.querySelectorAll('[data-frame]').forEach(control=>control.addEventListener('click',e=>{e.preventDefault();select(first,Number(control.dataset.frame));}));
document.querySelectorAll('a[href="#gallery"]').forEach(link=>{if(!link.hasAttribute('data-frame'))link.addEventListener('click',e=>{e.preventDefault();select(first,0);});});
document.querySelector('.explore').addEventListener('click',()=>select(first,0));
second.container.querySelectorAll('[data-chapter-frame]').forEach(control=>control.addEventListener('click',()=>select(second,Number(control.dataset.chapterFrame))));
[first,second].forEach(g=>{
 g.previous.addEventListener('click',()=>select(g,g.active-1));g.next.addEventListener('click',()=>select(g,g.active+1));
 let start=null;g.container.addEventListener('touchstart',e=>{start={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
 g.container.addEventListener('touchend',e=>{if(!start)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)select(g,g.active+(dx<0?1:-1));start=null;},{passive:true});
});
addEventListener('keydown',e=>{
 if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.altKey||e.ctrlKey||e.metaKey)return;
 const g=[first,second].find(item=>scrollY>=item.top-40&&scrollY<=item.top+item.run+40);
 if(g&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();select(g,g.active+(e.key==='ArrowRight'?1:-1));}
});
measure();
})();
